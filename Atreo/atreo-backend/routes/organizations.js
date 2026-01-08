const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const User = require('../models/User');
const Tool = require('../models/Tool');
const Invoice = require('../models/Invoice');
const Submission = require('../models/Submission');
const { authenticateToken } = require('../middleware/auth');
const mongoose = require('mongoose');

// Get all organizations (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const organizations = await Organization.find().sort({ createdAt: -1 });
    
    // Get stats for each organization
    const orgsWithStats = await Promise.all(
      organizations.map(async (org) => {
        const [userCount, toolCount, invoiceCount] = await Promise.all([
          User.countDocuments({ organizationId: org._id }),
          Tool.countDocuments({ organizationId: org._id }),
          Invoice.countDocuments({ organizationId: org._id })
        ]);

        return {
          id: org._id.toString(),
          name: org.name,
          domain: org.domain,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
          userCount,
          toolCount,
          invoiceCount
        };
      })
    );

    res.json(orgsWithStats);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ message: 'Failed to fetch organizations' });
  }
});

// Get single organization (admin only)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json({
      id: org._id.toString(),
      name: org.name,
      domain: org.domain,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ message: 'Failed to fetch organization' });
  }
});

// Create organization (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { name, domain } = req.body;

    if (!name || !domain) {
      return res.status(400).json({ message: 'Name and domain are required' });
    }

    // Check if domain already exists
    const existing = await Organization.findOne({ domain: domain.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Organization with this domain already exists' });
    }

    const org = await Organization.create({
      name: name.trim(),
      domain: domain.toLowerCase().trim()
    });

    res.status(201).json({
      id: org._id.toString(),
      name: org.name,
      domain: org.domain,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Organization with this domain already exists' });
    }
    res.status(500).json({ message: 'Failed to create organization' });
  }
});

// Update organization (admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { name, domain } = req.body;

    if (!name || !domain) {
      return res.status(400).json({ message: 'Name and domain are required' });
    }

    // Check if domain is taken by another organization
    if (domain) {
      const existing = await Organization.findOne({ 
        domain: domain.toLowerCase().trim(),
        _id: { $ne: req.params.id }
      });
      if (existing) {
        return res.status(409).json({ message: 'Domain is already taken by another organization' });
      }
    }

    const org = await Organization.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        domain: domain.toLowerCase().trim()
      },
      { new: true }
    );

    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json({
      id: org._id.toString(),
      name: org.name,
      domain: org.domain,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Domain is already taken' });
    }
    res.status(500).json({ message: 'Failed to update organization' });
  }
});

// Delete organization (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Check if there are other organizations
    const otherOrgs = await Organization.find({ _id: { $ne: req.params.id } });
    
    if (otherOrgs.length === 0) {
      return res.status(400).json({ message: 'Cannot delete the last organization' });
    }

    // Move all users, tools, and submissions to another organization
    const defaultOrg = otherOrgs[0];
    
    await Promise.all([
      User.updateMany({ organizationId: org._id }, { organizationId: defaultOrg._id }),
      Tool.updateMany({ organizationId: org._id }, { organizationId: defaultOrg._id }),
      Submission.updateMany({ organizationId: org._id }, { organizationId: defaultOrg._id })
    ]);

    await Organization.findByIdAndDelete(req.params.id);

    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ message: 'Failed to delete organization' });
  }
});

// Add user to organization (admin only)
router.post('/:id/users/:userId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { organizationId: org._id },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      ...user.toObject()
    });
  } catch (error) {
    console.error('Error adding user to organization:', error);
    res.status(500).json({ message: 'Failed to add user to organization' });
  }
});

// Remove user from organization (admin only)
router.delete('/:id/users/:userId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.organizationId?.toString() !== req.params.id) {
      return res.status(400).json({ message: 'User does not belong to this organization' });
    }

    // Find another organization to move user to
    const otherOrg = await Organization.findOne({ _id: { $ne: req.params.id } });
    if (!otherOrg) {
      return res.status(400).json({ message: 'Cannot remove user from the last organization' });
    }

    await User.findByIdAndUpdate(req.params.userId, { organizationId: otherOrg._id });

    res.json({ message: 'User removed from organization successfully' });
  } catch (error) {
    console.error('Error removing user from organization:', error);
    res.status(500).json({ message: 'Failed to remove user from organization' });
  }
});

// Get organization details (users, tools, submissions) (admin only)
router.get('/:id/details', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const [users, tools, invoices] = await Promise.all([
      User.find({ organizationId: org._id }).select('-password'),
      Tool.find({ organizationId: org._id }),
      Invoice.find({ organizationId: org._id })
        .populate('uploadedBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('toolIds', 'name category')
        .sort({ billingDate: -1 })
    ]);

    res.json({
      organization: {
        id: org._id.toString(),
        name: org.name,
        domain: org.domain,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt
      },
      users: users.map(u => ({
        id: u._id.toString(),
        ...u.toObject()
      })),
      tools: tools.map(t => ({
        id: t._id.toString(),
        ...t.toObject()
      })),
      invoices: invoices.map(inv => ({
        id: inv._id.toString(),
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        currency: inv.currency,
        provider: inv.provider,
        billingDate: inv.billingDate,
        dueDate: inv.dueDate,
        category: inv.category,
        status: inv.status,
        fileUrl: inv.fileUrl,
        fileName: inv.fileName,
        fileSize: inv.fileSize,
        toolIds: inv.toolIds ? inv.toolIds.map((id) => (id.toString ? id.toString() : id)) : [],
        tools: inv.toolIds && Array.isArray(inv.toolIds) ? inv.toolIds.map((tool) => ({
          id: tool._id ? tool._id.toString() : tool.toString(),
          name: tool.name || 'Unknown Tool'
        })) : [],
        uploadedBy: inv.uploadedBy ? {
          id: inv.uploadedBy._id.toString(),
          name: inv.uploadedBy.name,
          email: inv.uploadedBy.email
        } : undefined,
        approvedBy: inv.approvedBy ? {
          id: inv.approvedBy._id.toString(),
          name: inv.approvedBy.name,
          email: inv.approvedBy.email
        } : undefined,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching organization details:', error);
    res.status(500).json({ message: 'Failed to fetch organization details' });
  }
});

module.exports = router;
