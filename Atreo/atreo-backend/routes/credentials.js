/**
 * Credentials Routes
 * Handles secure credential management with encryption
 */

const express = require('express');
const crypto = require('crypto');
const Tool = require('../models/Tool');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { requireModuleAccess } = require('../middleware/permissions');
const { createAuditLog, logCredentialAccess } = require('../middleware/auditLog');

const router = express.Router();

// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypt sensitive data
 */
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 */
function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * GET /api/credentials
 * Get all credentials (passwords encrypted) with optional filters
 * Query params: page, limit, isPaid (true|false), status (active|inactive), category, paymentMethod, billingPeriod, search
 */
router.get('/', validatePagination, requireModuleAccess('credentials'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter query
    const query = {};

    // Paid / Unpaid filter
    if (req.query.isPaid !== undefined && req.query.isPaid !== '') {
      const isPaid = req.query.isPaid === 'true' || req.query.isPaid === true;
      query.isPaid = isPaid;
    }

    // Status filter (active / inactive)
    if (req.query.status && ['active', 'inactive'].includes(req.query.status)) {
      query.status = req.query.status;
    }

    // Category filter (exact match)
    if (req.query.category && req.query.category.trim()) {
      query.category = new RegExp('^' + req.query.category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
    }

    // Payment method filter
    if (req.query.paymentMethod && ['card', 'bank', 'paypal', 'other'].includes(req.query.paymentMethod)) {
      query.paymentMethod = req.query.paymentMethod;
    }

    // Billing period filter
    if (req.query.billingPeriod && ['monthly', 'yearly'].includes(req.query.billingPeriod)) {
      query.billingPeriod = req.query.billingPeriod;
    }

    // Search (name or notes)
    if (req.query.search && req.query.search.trim()) {
      const searchTerm = req.query.search.trim();
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { notes: { $regex: searchTerm, $options: 'i' } },
        { category: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const tools = await Tool.find(query)
      .select('name category username credentials notes tags isPaid status paymentMethod billingPeriod price')
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 });

    // Transform tools to credentials format (support both nested credentials and top-level fields)
    const credentials = tools.map(tool => ({
      id: tool._id,
      name: tool.name,
      service: tool.category,
      username: tool.credentials?.username || tool.username || '',
      apiKey: (tool.credentials?.apiKey || tool.apiKey) ? '••••••••••••' : '', // Masked
      notes: tool.notes || '',
      tags: tool.tags || [],
      isPaid: tool.isPaid,
      status: tool.status,
      paymentMethod: tool.paymentMethod,
      billingPeriod: tool.billingPeriod,
      price: tool.price
    }));

    const total = await Tool.countDocuments(query);

    res.json({
      credentials,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get credentials error:', error);
    res.status(500).json({ message: 'Server error fetching credentials' });
  }
});

/**
 * GET /api/credentials/:id
 * Get specific credential with decrypted password (logged access)
 */
router.get('/:id', validateObjectId, requireModuleAccess('credentials'), async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    
    if (!tool) {
      return res.status(404).json({ message: 'Credential not found' });
    }
    
    // Log credential access
    await logCredentialAccess(req, tool._id);
    
    // Decrypt password if it exists
    let decryptedPassword = '';
    if (tool.credentials?.password) {
      try {
        decryptedPassword = decrypt(tool.credentials.password);
      } catch (decryptError) {
        console.error('Decryption error:', decryptError);
        decryptedPassword = '[Decryption Failed]';
      }
    }
    
    const credential = {
      id: tool._id,
      name: tool.name,
      service: tool.category,
      username: tool.credentials?.username || '',
      password: decryptedPassword,
      apiKey: tool.credentials?.apiKey || '',
      notes: tool.notes || '',
      tags: tool.tags || []
    };
    
    res.json({ credential });
  } catch (error) {
    console.error('Get credential error:', error);
    res.status(500).json({ message: 'Server error fetching credential' });
  }
});

/**
 * POST /api/credentials
 * Create new credential with encryption
 */
router.post('/', requireModuleAccess('credentials'), async (req, res) => {
  try {
    const { name, service, username, password, apiKey, notes, tags } = req.body;
    
    // Validate required fields
    if (!name || !service) {
      return res.status(400).json({ message: 'Name and service are required' });
    }
    
    // Encrypt password if provided
    let encryptedPassword = '';
    if (password) {
      encryptedPassword = encrypt(password);
    }
    
    const tool = new Tool({
      name,
      category: service,
      credentials: {
        username: username || '',
        password: encryptedPassword,
        apiKey: apiKey || ''
      },
      notes: notes || '',
      tags: tags || [],
      isShared: false,
      addedBy: req.user.userId
    });
    
    await tool.save();
    
    // Log credential creation
    await createAuditLog({
      userId: req.user.userId,
      action: 'credential_created',
      resource: 'Tool',
      resourceId: tool._id,
      details: { name, service }
    });
    
    res.status(201).json({
      message: 'Credential created successfully',
      credential: {
        id: tool._id,
        name: tool.name,
        service: tool.category
      }
    });
  } catch (error) {
    console.error('Create credential error:', error);
    res.status(500).json({ message: 'Server error creating credential' });
  }
});

/**
 * PUT /api/credentials/:id
 * Update credential with encryption
 */
router.put('/:id', validateObjectId, requireModuleAccess('credentials'), async (req, res) => {
  try {
    const { name, service, username, password, apiKey, notes, tags } = req.body;
    
    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      return res.status(404).json({ message: 'Credential not found' });
    }
    
    // Encrypt password if provided
    let encryptedPassword = tool.credentials?.password || '';
    if (password && password !== '••••••••••••') {
      encryptedPassword = encrypt(password);
    }
    
    // Update tool
    tool.name = name || tool.name;
    tool.category = service || tool.category;
    tool.credentials = {
      username: username || tool.credentials?.username || '',
      password: encryptedPassword,
      apiKey: apiKey || tool.credentials?.apiKey || ''
    };
    tool.notes = notes || tool.notes;
    tool.tags = tags || tool.tags;
    
    await tool.save();
    
    // Log credential update
    await createAuditLog({
      userId: req.user.userId,
      action: 'credential_updated',
      resource: 'Tool',
      resourceId: tool._id,
      details: { name: tool.name, service: tool.category }
    });
    
    res.json({
      message: 'Credential updated successfully',
      credential: {
        id: tool._id,
        name: tool.name,
        service: tool.category
      }
    });
  } catch (error) {
    console.error('Update credential error:', error);
    res.status(500).json({ message: 'Server error updating credential' });
  }
});

/**
 * DELETE /api/credentials/:id
 * Delete credential
 */
router.delete('/:id', validateObjectId, requireModuleAccess('credentials'), async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      return res.status(404).json({ message: 'Credential not found' });
    }
    
    await Tool.findByIdAndDelete(req.params.id);
    
    // Log credential deletion
    await createAuditLog({
      userId: req.user.userId,
      action: 'credential_deleted',
      resource: 'Tool',
      resourceId: tool._id,
      details: { name: tool.name, service: tool.category }
    });
    
    res.json({ message: 'Credential deleted successfully' });
  } catch (error) {
    console.error('Delete credential error:', error);
    res.status(500).json({ message: 'Server error deleting credential' });
  }
});

module.exports = router;