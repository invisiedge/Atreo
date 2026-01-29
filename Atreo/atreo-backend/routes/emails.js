/**
 * Email Routes
 * Handles email management for organizations
 */

const express = require('express');
const router = express.Router();
const Email = require('../models/Email');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { requireModuleAccess } = require('../middleware/permissions');
const { createAuditLog } = require('../middleware/auditLog');
const { validateObjectId, validatePagination } = require('../middleware/validation');

/**
 * GET /api/emails
 * Get all emails with optional filtering
 */
router.get('/', authenticateToken, validatePagination, requireModuleAccess('emails'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Build query filters
    const query = {};
    
    if (req.query.domain) {
      query.domain = req.query.domain.toLowerCase().trim();
    }
    
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.provider) {
      query.provider = req.query.provider;
    }
    
    if (req.query.organizationId) {
      query.organizationId = req.query.organizationId;
    }
    
    if (req.query.search) {
      query.$or = [
        { email: { $regex: req.query.search, $options: 'i' } },
        { domain: { $regex: req.query.search, $options: 'i' } },
        { owner: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Get total count
    const total = await Email.countDocuments(query);
    
    // Get emails
    const emails = await Email.find(query)
      .populate('organizationId', 'name domain')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    res.json({
      emails,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get emails error:', error);
    res.status(500).json({ message: 'Server error fetching emails' });
  }
});

/**
 * GET /api/emails/:id
 * Get single email by ID
 */
router.get('/:id', authenticateToken, validateObjectId, requireModuleAccess('emails'), async (req, res) => {
  try {
    const email = await Email.findById(req.params.id)
      .populate('organizationId', 'name domain')
      .populate('createdBy', 'name email');
    
    if (!email) {
      return res.status(404).json({ message: 'Email not found' });
    }
    
    res.json(email);
  } catch (error) {
    console.error('Get email error:', error);
    res.status(500).json({ message: 'Server error fetching email' });
  }
});

/**
 * POST /api/emails
 * Create new email
 */
router.post('/', authenticateToken, requireModuleAccess('emails'), async (req, res) => {
  try {
    const {
      email: emailAddress,
      password,
      domain,
      organizationId,
      provider = 'custom',
      status = 'active',
      isPrimary = false,
      owner,
      purpose,
      notes
    } = req.body;
    
    // Validate required fields
    if (!emailAddress || !domain) {
      return res.status(400).json({ 
        message: 'Email and domain are required' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Check if email already exists
    const existingEmail = await Email.findOne({ 
      email: emailAddress.toLowerCase().trim() 
    });
    
    if (existingEmail) {
      return res.status(400).json({ 
        message: 'Email already exists' 
      });
    }
    
    // Validate provider
    if (!['gmail', 'outlook', 'custom', 'other'].includes(provider)) {
      return res.status(400).json({ message: 'Invalid provider' });
    }
    
    // Validate status
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Create email record
    const email = new Email({
      email: emailAddress.toLowerCase().trim(),
      password: password || undefined,
      domain: domain.toLowerCase().trim(),
      organizationId: organizationId || undefined,
      provider,
      status,
      isPrimary,
      owner: owner || undefined,
      purpose: purpose || undefined,
      notes: notes || undefined,
      createdBy: req.user.userId
    });
    
    await email.save();
    
    // Populate for response
    await email.populate('organizationId', 'name domain');
    await email.populate('createdBy', 'name email');
    
    // Log email creation
    await createAuditLog({
      userId: req.user.userId,
      action: 'email_created',
      resource: 'Email',
      resourceId: email._id,
      details: { email: emailAddress, domain }
    });
    
    res.status(201).json({
      message: 'Email created successfully',
      email
    });
  } catch (error) {
    console.error('Create email error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Server error creating email' });
  }
});

/**
 * PUT /api/emails/:id
 * Update email
 */
router.put('/:id', authenticateToken, validateObjectId, requireModuleAccess('emails'), async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    
    if (!email) {
      return res.status(404).json({ message: 'Email not found' });
    }
    
    const {
      password,
      domain,
      organizationId,
      provider,
      status,
      isPrimary,
      owner,
      purpose,
      notes
    } = req.body;
    
    // Update fields if provided
    if (password !== undefined) email.password = password;
    if (domain !== undefined) email.domain = domain.toLowerCase().trim();
    if (organizationId !== undefined) email.organizationId = organizationId;
    if (provider !== undefined) {
      if (!['gmail', 'outlook', 'custom', 'other'].includes(provider)) {
        return res.status(400).json({ message: 'Invalid provider' });
      }
      email.provider = provider;
    }
    if (status !== undefined) {
      if (!['active', 'inactive', 'suspended'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      email.status = status;
    }
    if (isPrimary !== undefined) email.isPrimary = isPrimary;
    if (owner !== undefined) email.owner = owner;
    if (purpose !== undefined) email.purpose = purpose;
    if (notes !== undefined) email.notes = notes;
    
    await email.save();
    
    // Populate for response
    await email.populate('organizationId', 'name domain');
    await email.populate('createdBy', 'name email');
    
    // Log email update
    await createAuditLog({
      userId: req.user.userId,
      action: 'email_updated',
      resource: 'Email',
      resourceId: email._id,
      details: { email: email.email }
    });
    
    res.json({
      message: 'Email updated successfully',
      email
    });
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({ message: 'Server error updating email' });
  }
});

/**
 * DELETE /api/emails/:id
 * Delete email
 */
router.delete('/:id', authenticateToken, validateObjectId, requireModuleAccess('emails'), async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    
    if (!email) {
      return res.status(404).json({ message: 'Email not found' });
    }
    
    await Email.findByIdAndDelete(req.params.id);
    
    // Log email deletion
    await createAuditLog({
      userId: req.user.userId,
      action: 'email_deleted',
      resource: 'Email',
      resourceId: email._id,
      details: { email: email.email }
    });
    
    res.json({ message: 'Email deleted successfully' });
  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({ message: 'Server error deleting email' });
  }
});

module.exports = router;
