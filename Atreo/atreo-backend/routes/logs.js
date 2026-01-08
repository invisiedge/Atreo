/**
 * Audit Logs Routes
 * Handles audit log viewing and management
 */

const express = require('express');
const AuditLog = require('../models/AuditLog');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { requireModuleAccess } = require('../middleware/permissions');

const router = express.Router();

/**
 * GET /api/logs
 * Get audit logs with pagination and filtering
 */
router.get('/', validatePagination, requireModuleAccess('logs'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build filter query
    const filter = {};
    
    // Filter by action type
    if (req.query.action) {
      filter.action = { $regex: req.query.action, $options: 'i' };
    }
    
    // Filter by user
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    
    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }
    
    // Filter by resource type (model uses 'resource' not 'resourceType')
    if (req.query.resourceType) {
      filter.resource = req.query.resourceType;
    }
    
    // Filter by status (for level filtering)
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Search filter (search in action, details, userEmail)
    if (req.query.search) {
      filter.$or = [
        { action: { $regex: req.query.search, $options: 'i' } },
        { userEmail: { $regex: req.query.search, $options: 'i' } },
        { 'details.message': { $regex: req.query.search, $options: 'i' } },
        { resource: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    const logs = await AuditLog.find(filter)
      .populate('userId', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await AuditLog.countDocuments(filter);
    
    // Transform logs for frontend
    const transformedLogs = logs.map(log => ({
      id: log._id,
      action: log.action,
      user: log.userId ? {
        id: log.userId._id,
        name: log.userId.name,
        email: log.userId.email
      } : null,
      resourceType: log.resource || 'general',
      resourceId: log.resourceId,
      details: log.details || {},
      ipAddress: log.ipAddress || null,
      userAgent: log.userAgent || null,
      status: log.status || 'success',
      errorMessage: log.errorMessage || null,
      timestamp: log.createdAt || new Date()
    }));
    
    res.json({
      logs: transformedLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Server error fetching logs' });
  }
});

/**
 * GET /api/logs/:id
 * Get specific audit log details
 */
router.get('/:id', validateObjectId, requireModuleAccess('logs'), async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate('userId', 'name email role');
    
    if (!log) {
      return res.status(404).json({ message: 'Log entry not found' });
    }
    
    const transformedLog = {
      id: log._id,
      action: log.action,
      user: log.userId ? {
        id: log.userId._id,
        name: log.userId.name,
        email: log.userId.email,
        role: log.userId.role
      } : null,
      resourceType: log.resource || 'general',
      resourceId: log.resourceId,
      details: log.details || {},
      ipAddress: log.ipAddress || null,
      userAgent: log.userAgent || null,
      status: log.status || 'success',
      errorMessage: log.errorMessage || null,
      timestamp: log.createdAt || new Date()
    };
    
    res.json({ log: transformedLog });
  } catch (error) {
    console.error('Get log error:', error);
    res.status(500).json({ message: 'Server error fetching log' });
  }
});

/**
 * GET /api/logs/stats/summary
 * Get audit log statistics
 */
router.get('/stats/summary', requireModuleAccess('logs'), async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get counts for different time periods
    const [
      totalLogs,
      logsLast24Hours,
      logsLast7Days,
      logsLast30Days,
      actionStats,
      userStats
    ] = await Promise.all([
      AuditLog.countDocuments({}),
      AuditLog.countDocuments({ createdAt: { $gte: last24Hours } }),
      AuditLog.countDocuments({ createdAt: { $gte: last7Days } }),
      AuditLog.countDocuments({ createdAt: { $gte: last30Days } }),
      AuditLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      AuditLog.aggregate([
        { $match: { userId: { $ne: null } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            count: 1,
            'user.name': 1,
            'user.email': 1
          }
        }
      ])
    ]);
    
    res.json({
      summary: {
        totalLogs,
        logsLast24Hours,
        logsLast7Days,
        logsLast30Days
      },
      topActions: actionStats.map(stat => ({
        action: stat._id,
        count: stat.count
      })),
      topUsers: userStats.map(stat => ({
        user: {
          name: stat.user.name,
          email: stat.user.email
        },
        count: stat.count
      }))
    });
  } catch (error) {
    console.error('Get log stats error:', error);
    res.status(500).json({ message: 'Server error fetching log statistics' });
  }
});

/**
 * DELETE /api/logs/cleanup
 * Clean up old audit logs (older than specified days)
 */
router.delete('/cleanup', requireModuleAccess('logs'), async (req, res) => {
  try {
    const daysToKeep = parseInt(req.query.days) || 90; // Default 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // Note: Audit logs are immutable, but cleanup is allowed for old logs
    const result = await AuditLog.deleteMany({
      createdAt: { $lt: cutoffDate }
    });
    
    res.json({
      message: `Cleaned up ${result.deletedCount} log entries older than ${daysToKeep} days`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Log cleanup error:', error);
    res.status(500).json({ message: 'Server error during log cleanup' });
  }
});

module.exports = router;