/**
 * Messages Routes
 * Handles internal messaging system
 */

const express = require('express');
const mongoose = require('mongoose');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { requireModuleAccess } = require('../middleware/permissions');
const { createAuditLog } = require('../middleware/auditLog');

const router = express.Router();

// Message Schema (inline for now, can be moved to models later)
const messageSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  category: {
    type: String,
    enum: ['general', 'payroll', 'hr', 'it', 'announcement'],
    default: 'general'
  },
  attachments: [{
    filename: String,
    path: String,
    size: Number
  }],
  readAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

/**
 * GET /api/messages
 * Get messages for current user (inbox)
 */
router.get('/', validatePagination, requireModuleAccess('messages'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = { to: req.user.userId };
    
    // Filter by read status
    if (req.query.unread === 'true') {
      filter.isRead = false;
    }
    
    // Filter by category
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    // Filter by priority
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }
    
    const messages = await Message.find(filter)
      .populate('from', 'name email')
      .populate('to', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Message.countDocuments(filter);
    const unreadCount = await Message.countDocuments({ 
      to: req.user.userId, 
      isRead: false 
    });
    
    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
});

/**
 * GET /api/messages/sent
 * Get sent messages for current user
 */
router.get('/sent', validatePagination, requireModuleAccess('messages'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const messages = await Message.find({ from: req.user.userId })
      .populate('from', 'name email')
      .populate('to', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Message.countDocuments({ from: req.user.userId });
    
    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get sent messages error:', error);
    res.status(500).json({ message: 'Server error fetching sent messages' });
  }
});

/**
 * GET /api/messages/:id
 * Get specific message and mark as read
 */
router.get('/:id', validateObjectId, requireModuleAccess('messages'), async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('from', 'name email')
      .populate('to', 'name email');
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user has access to this message
    if (message.to._id.toString() !== req.user.userId && 
        message.from._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Mark as read if user is recipient and message is unread
    if (message.to._id.toString() === req.user.userId && !message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
    }
    
    res.json({ message });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ message: 'Server error fetching message' });
  }
});

/**
 * POST /api/messages
 * Send new message
 */
router.post('/', requireModuleAccess('messages'), async (req, res) => {
  try {
    const { to, subject, content, priority = 'normal', category = 'general' } = req.body;
    
    // Validate required fields
    if (!to || !subject || !content) {
      return res.status(400).json({ 
        message: 'Recipient, subject, and content are required' 
      });
    }
    
    // Validate recipient exists
    const User = require('../models/User');
    const recipient = await User.findById(to);
    if (!recipient) {
      return res.status(400).json({ message: 'Recipient not found' });
    }
    
    const message = new Message({
      from: req.user.userId,
      to,
      subject,
      content,
      priority,
      category
    });
    
    await message.save();
    
    // Populate sender info for response
    await message.populate('from', 'name email');
    await message.populate('to', 'name email');
    
    // Log message sent
    await createAuditLog({
      userId: req.user.userId,
      action: 'message_sent',
      resource: 'Message',
      resourceId: message._id,
      details: { 
        recipient: recipient.email,
        subject: subject.substring(0, 50) + (subject.length > 50 ? '...' : '')
      }
    });
    
    res.status(201).json({
      message: 'Message sent successfully',
      messageData: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error sending message' });
  }
});

/**
 * PUT /api/messages/:id/read
 * Mark message as read
 */
router.put('/:id/read', validateObjectId, requireModuleAccess('messages'), async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user is the recipient
    if (message.to.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    message.isRead = true;
    message.readAt = new Date();
    await message.save();
    
    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Server error marking message as read' });
  }
});

/**
 * DELETE /api/messages/:id
 * Delete message (soft delete - just remove from user's view)
 */
router.delete('/:id', validateObjectId, requireModuleAccess('messages'), async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user has access to delete this message
    if (message.to.toString() !== req.user.userId && 
        message.from.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // For now, hard delete. In production, you might want soft delete
    await Message.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error deleting message' });
  }
});

/**
 * GET /api/messages/stats/summary
 * Get message statistics for current user
 */
router.get('/stats/summary', requireModuleAccess('messages'), async (req, res) => {
  try {
    const [
      totalReceived,
      unreadCount,
      totalSent,
      priorityStats
    ] = await Promise.all([
      Message.countDocuments({ to: req.user.userId }),
      Message.countDocuments({ to: req.user.userId, isRead: false }),
      Message.countDocuments({ from: req.user.userId }),
      Message.aggregate([
        { $match: { to: mongoose.Types.ObjectId(req.user.userId) } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    ]);
    
    res.json({
      totalReceived,
      unreadCount,
      totalSent,
      priorityBreakdown: priorityStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Get message stats error:', error);
    res.status(500).json({ message: 'Server error fetching message statistics' });
  }
});

module.exports = router;