const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const Tool = require('../models/Tool');
const ToolShare = require('../models/ToolShare');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { authenticateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');
const multer = require('multer');

// Memory storage for parsing (needs buffer access)
const memoryStorage = multer.memoryStorage();
const uploadExcel = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = require('path').extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  }
});

// Get all tools (including shared ones)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Get tools created by user
    const ownedTools = await Tool.find({ createdBy: userId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Get tools shared with user
    const sharedShares = await ToolShare.find({
      sharedWith: userId,
      revokedAt: null
    }).populate('sharedBy', 'name email').lean();

    // Extract tool IDs from shares
    const sharedToolIds = sharedShares.map(share => {
      return share.toolId ? share.toolId.toString() : null;
    }).filter(Boolean);

    let sharedTools = [];
    if (sharedToolIds.length > 0) {
      try {
        const validObjectIds = sharedToolIds.filter(id => {
          try {
            new mongoose.Types.ObjectId(id);
            return true;
          } catch (e) {
            return false;
          }
        });

        if (validObjectIds.length > 0) {
          sharedTools = await Tool.find({ _id: { $in: validObjectIds } })
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .lean();
        }
      } catch (error) {
        console.error('Error fetching shared tools:', error);
      }
    }

    const shareInfoMap = new Map();
    sharedShares.forEach(share => {
      if (share.toolId) {
        const toolId = share.toolId.toString();
        shareInfoMap.set(toolId, {
          sharedBy: share.sharedBy,
          permission: share.permission || 'view'
        });
      }
    });

    const sharedToolsWithInfo = sharedTools.map(tool => {
      const toolId = tool._id.toString();
      const shareInfo = shareInfoMap.get(toolId);
      return {
        ...tool,
        isShared: true,
        sharedBy: shareInfo?.sharedBy,
        permission: shareInfo?.permission || 'view'
      };
    });

    let allTools = [];
    if (userRole === 'admin') {
      const adminTools = await Tool.find({})
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();
      
      allTools = adminTools.map(tool => {
        const toolId = tool._id.toString();
        const shareInfo = shareInfoMap.get(toolId);
        if (shareInfo) {
          return {
            ...tool,
            isShared: true,
            sharedBy: shareInfo.sharedBy,
            permission: shareInfo.permission
          };
        }
        return tool;
      });
    } else {
      const combined = [...ownedTools, ...sharedToolsWithInfo];
      const uniqueMap = new Map();
      combined.forEach(tool => {
        const id = tool._id.toString();
        if (!uniqueMap.has(id)) {
          uniqueMap.set(id, tool);
        }
      });
      allTools = Array.from(uniqueMap.values());
    }

    const formattedTools = allTools.map(tool => ({
      ...tool,
      id: tool._id.toString()
    }));

    res.json(formattedTools);
  } catch (error) {
    console.error('Error fetching tools:', error);
    res.status(500).json({ message: 'Failed to fetch tools' });
  }
});

// Import tools from Excel
router.post('/import-excel', authenticateToken, uploadExcel.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Security: Read with safe options to mitigate prototype pollution
    const workbook = XLSX.read(req.file.buffer, { 
      type: 'buffer',
      cellDates: false,
      cellNF: false,
      cellStyles: false,
      dense: false
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Security: Use defval to prevent prototype pollution
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      defval: null,
      raw: false
    });

    const importedTools = [];
    const errors = [];
    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const toolName = String(row['Tool Name'] || '').trim();
      if (!toolName || toolName === 'NaN' || toolName === '') {
        skipCount++;
        continue;
      }

      try {
        const organizationName = String(row['Organization Name'] || '').trim();
        const category = String(row['Category'] || '').trim();
        const description = String(row['Description'] || '').trim();
        const username = String(row['Username'] || '').trim();
        const password = String(row['Password'] || '').trim();
        const twoFAEnabled = String(row['2FA Enabled'] || '').trim().toLowerCase();
        const twoFAMethod = String(row['2FA Method'] || '').trim();
        const paymentInfo = String(row['Payment Method / Pricing'] || '').trim();
        const comments = String(row['Comments'] || '').trim();

        let organizationId = null;
        if (organizationName) {
          let organization = await Organization.findOne({ name: organizationName });
          if (!organization) {
            let domain = organizationName.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            if (!domain || domain.length < 3) domain = `org-${Date.now()}`;
            if (!domain.includes('.')) domain = `${domain}.com`;
            
            let finalDomain = domain;
            let domainCounter = 1;
            while (await Organization.findOne({ domain: finalDomain })) {
              const domainParts = domain.split('.');
              finalDomain = `${domainParts[0]}-${domainCounter}.${domainParts.slice(1).join('.')}`;
              domainCounter++;
            }
            
            organization = new Organization({ name: organizationName, domain: finalDomain });
            await organization.save();
          }
          organizationId = organization._id;
        } else {
          organizationId = user.organizationId;
        }

        const existingTool = await Tool.findOne({ name: toolName, organizationId });
        if (existingTool) {
          skipCount++;
          continue;
        }

        const has2FA = twoFAEnabled === 'yes' || twoFAEnabled === 'true' || twoFAEnabled === '1';
        let twoFactorMethod = null;
        if (has2FA && twoFAMethod) {
          const methodLower = twoFAMethod.toLowerCase();
          if (methodLower.includes('mobile') || methodLower.includes('phone') || methodLower.includes('sms')) twoFactorMethod = 'mobile';
          else if (methodLower.includes('email') || methodLower.includes('mail')) twoFactorMethod = 'email';
        }

        let isPaid = false, price = 0, paymentMethod = null, billingPeriod = 'monthly';
        if (paymentInfo && paymentInfo !== 'NaN' && paymentInfo !== '') {
          isPaid = true;
          const priceMatch = paymentInfo.match(/\$?(\d+\.?\d*)/);
          if (priceMatch) price = parseFloat(priceMatch[1]);
          const paymentLower = paymentInfo.toLowerCase();
          if (paymentLower.includes('card') || paymentLower.includes('credit') || paymentLower.includes('debit')) paymentMethod = 'card';
          else if (paymentLower.includes('bank') || paymentLower.includes('transfer')) paymentMethod = 'bank';
          else if (paymentLower.includes('paypal')) paymentMethod = 'paypal';
          else paymentMethod = 'other';
          if (paymentLower.includes('year') || paymentLower.includes('annual')) billingPeriod = 'yearly';
        }

        const tool = new Tool({
          name: toolName,
          description: description || undefined,
          category: category || undefined,
          username: username || undefined,
          password: password || undefined,
          has2FA,
          twoFactorMethod,
          isPaid,
          price,
          billingPeriod,
          paymentMethod,
          notes: comments || undefined,
          createdBy: userId,
          organizationId,
          status: 'active'
        });

        await tool.save();
        importedTools.push({ id: tool._id.toString(), name: tool.name, category: tool.category });
        successCount++;
      } catch (error) {
        errors.push({ row: i + 2, toolName, error: error.message || 'Unknown error' });
      }
    }

    res.json({
      success: true,
      message: `Imported ${successCount} tool(s), skipped ${skipCount} duplicate(s)${errors.length > 0 ? `, ${errors.length} error(s)` : ''}`,
      imported: successCount,
      skipped: skipCount,
      errors: errors.length,
      errorDetails: errors,
      tools: importedTools
    });
  } catch (error) {
    console.error('Import tools Excel error:', error);
    res.status(500).json({ success: false, message: 'Failed to import tools from Excel', error: error.message });
  }
});

// Get single tool
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id).populate('createdBy', 'name email');
    if (!tool) return res.status(404).json({ message: 'Tool not found' });
    res.json(tool);
  } catch (error) {
    console.error('Error fetching tool:', error);
    res.status(500).json({ message: 'Failed to fetch tool' });
  }
});

// Create tool
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, category, username, password, apiKey, notes, tags, isPaid, hasAutopay, price, billingPeriod, has2FA, twoFactorMethod, status } = req.body;
    if (!name) return res.status(400).json({ message: 'Tool name is required' });
    
    const tool = new Tool({
      name, description, category, username, password, apiKey, notes,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      isPaid: isPaid || false,
      hasAutopay: hasAutopay || false,
      price: isPaid ? (price || 0) : 0,
      billingPeriod: isPaid ? (billingPeriod || 'monthly') : 'monthly',
      has2FA: has2FA || false,
      twoFactorMethod: has2FA ? (twoFactorMethod || null) : null,
      status: status || 'active',
      createdBy: req.user.userId
    });
    
    await tool.save();
    await tool.populate('createdBy', 'name email');
    res.status(201).json(tool);
  } catch (error) {
    console.error('Error creating tool:', error);
    res.status(500).json({ message: 'Failed to create tool' });
  }
});

// Update tool
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) return res.status(404).json({ message: 'Tool not found' });
    if (tool.createdBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this tool' });
    }
    
    const { name, description, category, username, password, apiKey, notes, tags, isPaid, hasAutopay, price, billingPeriod, has2FA, twoFactorMethod, status } = req.body;
    if (name) tool.name = name;
    if (description !== undefined) tool.description = description;
    if (category !== undefined) tool.category = category;
    if (username !== undefined) tool.username = username;
    if (password !== undefined) tool.password = password;
    if (apiKey !== undefined) tool.apiKey = apiKey;
    if (notes !== undefined) tool.notes = notes;
    if (tags !== undefined) tool.tags = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []);
    if (isPaid !== undefined) {
      tool.isPaid = isPaid;
      if (!isPaid) { tool.price = 0; tool.billingPeriod = 'monthly'; }
    }
    if (hasAutopay !== undefined) tool.hasAutopay = hasAutopay;
    if (price !== undefined) tool.price = tool.isPaid ? price : 0;
    if (billingPeriod !== undefined) tool.billingPeriod = tool.isPaid ? billingPeriod : 'monthly';
    if (has2FA !== undefined) {
      tool.has2FA = has2FA;
      if (!has2FA) tool.twoFactorMethod = null;
    }
    if (twoFactorMethod !== undefined) tool.twoFactorMethod = tool.has2FA ? twoFactorMethod : null;
    if (status !== undefined) tool.status = status;
    
    await tool.save();
    await tool.populate('createdBy', 'name email');
    res.json(tool);
  } catch (error) {
    console.error('Error updating tool:', error);
    res.status(500).json({ message: 'Failed to update tool' });
  }
});

// Delete all tools (admin only)
router.delete('/delete-all', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    await ToolShare.deleteMany({});
    const result = await Tool.deleteMany({});
    res.json({ message: `Successfully deleted ${result.deletedCount} credential(s)`, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error deleting all tools:', error);
    res.status(500).json({ message: 'Failed to delete all tools' });
  }
});

// Delete tool
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) return res.status(404).json({ message: 'Tool not found' });
    if (tool.createdBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this tool' });
    }
    await ToolShare.deleteMany({ toolId: req.params.id });
    await Tool.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tool deleted successfully' });
  } catch (error) {
    console.error('Error deleting tool:', error);
    res.status(500).json({ message: 'Failed to delete tool' });
  }
});

// Share tool
router.post('/:id/share', authenticateToken, async (req, res) => {
  try {
    const { userId, permission } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });
    if (permission && !['view', 'edit'].includes(permission)) return res.status(400).json({ message: 'Permission must be "view" or "edit"' });

    const tool = await Tool.findById(req.params.id);
    if (!tool) return res.status(404).json({ message: 'Tool not found' });
    if (tool.createdBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the owner or admin can share credentials' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (userId === req.user.userId) return res.status(400).json({ message: 'Cannot share credential with yourself' });

    const sharer = await User.findById(req.user.userId);
    const share = await ToolShare.findOneAndUpdate(
      { toolId: req.params.id, sharedWith: userId },
      { toolId: req.params.id, sharedWith: userId, sharedBy: req.user.userId, permission: permission || 'view', revokedAt: null },
      { upsert: true, new: true }
    ).populate('sharedBy', 'name email').populate('sharedWith', 'name email');

    if (sharer && targetUser) {
      emailService.sendCredentialSharedNotification(targetUser.email, targetUser.name, tool.name, sharer.name, permission || 'view').catch(err => console.error(err));
    }

    res.json({ message: 'Credential shared successfully', share });
  } catch (error) {
    console.error('Error sharing tool:', error);
    res.status(500).json({ message: 'Failed to share credential' });
  }
});

// Revoke access
router.delete('/:id/share/:userId', authenticateToken, async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) return res.status(404).json({ message: 'Tool not found' });
    if (tool.createdBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the owner or admin can revoke access' });
    }
    const share = await ToolShare.findOneAndUpdate({ toolId: req.params.id, sharedWith: req.params.userId }, { revokedAt: new Date() }, { new: true });
    if (!share) return res.status(404).json({ message: 'Share not found' });
    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    console.error('Error revoking access:', error);
    res.status(500).json({ message: 'Failed to revoke access' });
  }
});

// Get users for sharing
router.get('/share/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const users = await User.find({ role: 'user' }).select('name email').sort({ name: 1 }).lean();
    res.json(users.map(u => ({ id: u._id.toString(), name: u.name, email: u.email })));
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

module.exports = router;
