const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Admin = require('../models/Admin');

/**
 * Audit Logging Middleware
 * 
 * Always log:
 * - Login attempts
 * - OTP verification
 * - Permission changes
 * - Tool credential access
 * - File uploads/downloads
 * - Data create/update/delete
 * - AI queries
 */

/**
 * Get user details for audit logging
 */
async function getUserDetails(userId) {
  try {
    if (!userId) return { name: null, email: null, role: null };
    
    const user = await User.findById(userId).select('name email role');
    if (!user) return { name: null, email: null, role: null };
    
    let userRole = user.role;
    // If admin, get admin role (super-admin or admin)
    if (user.role === 'admin') {
      const admin = await Admin.findOne({ userId }).select('role');
      if (admin) {
        userRole = admin.role === 'super-admin' ? 'super-admin' : 'admin';
      }
    }
    
    return {
      name: user.name,
      email: user.email,
      role: userRole
    };
  } catch (error) {
    console.error('Error fetching user details for audit log:', error);
    return { name: null, email: null, role: null };
  }
}

/**
 * Create an audit log entry with automatic user details
 */
async function createAuditLog(data) {
  try {
    // Fetch user details if userId is provided
    let userDetails = { name: null, email: null, role: null };
    if (data.userId) {
      userDetails = await getUserDetails(data.userId);
    } else if (data.userEmail) {
      // Try to find user by email if userId not provided
      const user = await User.findOne({ email: data.userEmail }).select('_id name email role');
      if (user) {
        userDetails = await getUserDetails(user._id);
      }
    }
    
    // Use provided values or fetched values
    const userName = data.userName || userDetails.name;
    const userEmail = data.userEmail || userDetails.email;
    const userRole = data.userRole || userDetails.role;
    
    const log = new AuditLog({
      userId: data.userId || null,
      userEmail: userEmail,
      userName: userName,
      userRole: userRole,
      action: data.action,
      resource: data.resource || null,
      resourceId: data.resourceId || null,
      details: data.details || {},
      changes: data.changes || null,
      oldValues: data.oldValues || null,
      newValues: data.newValues || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      status: data.status || 'success',
      errorMessage: data.errorMessage || null
    });
    
    await log.save();
    return log;
  } catch (error) {
    // Don't throw - logging should never break the application
    console.error('Failed to create audit log:', error);
    return null;
  }
}

/**
 * Middleware to log requests
 */
function auditLogMiddleware(action, resource = null) {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // Log after response is sent
      setImmediate(async () => {
        await createAuditLog({
          userId: req.user?.userId || null,
          userEmail: req.user?.email || null,
          action,
          resource: resource || req.path.split('/')[2] || 'unknown',
          resourceId: req.params?.id || req.body?.id || null,
          details: {
            method: req.method,
            path: req.path,
            body: sanitizeBody(req.body),
            params: req.params,
            query: req.query
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          status: res.statusCode >= 400 ? 'failure' : 'success',
          errorMessage: data?.message || null
        });
      });
      
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'hashedOTP', 'otp', 'token', 'secret', 'apiKey'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Track field-level changes for updates
 */
function trackChanges(oldData, newData, excludeFields = ['_id', '__v', 'updatedAt', 'createdAt']) {
  if (!oldData || !newData) return null;
  
  const changes = {};
  const oldValues = {};
  const newValues = {};
  
  // Compare all fields in newData
  Object.keys(newData).forEach(key => {
    if (excludeFields.includes(key)) return;
    
    const oldVal = oldData[key];
    const newVal = newData[key];
    
    // Handle nested objects
    if (typeof oldVal === 'object' && typeof newVal === 'object' && 
        oldVal !== null && newVal !== null && 
        !Array.isArray(oldVal) && !Array.isArray(newVal)) {
      const nestedChanges = trackChanges(oldVal, newVal, excludeFields);
      if (nestedChanges && Object.keys(nestedChanges).length > 0) {
        changes[key] = nestedChanges;
        oldValues[key] = oldVal;
        newValues[key] = newVal;
      }
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { from: oldVal, to: newVal };
      oldValues[key] = oldVal;
      newValues[key] = newVal;
    }
  });
  
  // Check for deleted fields
  Object.keys(oldData).forEach(key => {
    if (excludeFields.includes(key)) return;
    if (!(key in newData) && oldData[key] !== undefined) {
      changes[key] = { from: oldData[key], to: null };
      oldValues[key] = oldData[key];
      newValues[key] = null;
    }
  });
  
  return Object.keys(changes).length > 0 ? { changes, oldValues, newValues } : null;
}

/**
 * Helper functions for specific actions
 */
const auditHelpers = {
  logLoginAttempt: async (req, user, success, errorMessage = null) => {
    const userDetails = user ? await getUserDetails(user._id) : { name: null, email: null, role: null };
    return createAuditLog({
      userId: user?._id || null,
      userEmail: user?.email || req.body?.email || null,
      userName: userDetails.name,
      userRole: userDetails.role,
      action: success ? 'login_success' : 'login_failure',
      details: {
        loginMethod: 'email',
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: success ? 'success' : 'failure',
      errorMessage
    });
  },
  
  logLogout: async (req, user) => {
    const userDetails = user ? await getUserDetails(user._id) : { name: null, email: null, role: null };
    return createAuditLog({
      userId: user?._id || req.user?.userId || null,
      userEmail: user?.email || req.user?.email || null,
      userName: userDetails.name,
      userRole: userDetails.role,
      action: 'logout',
      details: {
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'success'
    });
  },
  
  logOTPVerification: async (req, email, success, errorMessage = null) => {
    const user = await User.findOne({ email }).select('_id');
    const userDetails = user ? await getUserDetails(user._id) : { name: null, email: null, role: null };
    return createAuditLog({
      userId: user?._id || null,
      userEmail: email,
      userName: userDetails.name,
      userRole: userDetails.role,
      action: success ? 'otp_verified' : 'otp_failed',
      details: {
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: success ? 'success' : 'failure',
      errorMessage
    });
  },
  
  logCredentialAccess: async (req, credentialId, action = 'credential_viewed', details = {}) => {
    const userDetails = req.user?.userId ? await getUserDetails(req.user.userId) : { name: null, email: null, role: null };
    return createAuditLog({
      userId: req.user?.userId || null,
      userEmail: req.user?.email || null,
      userName: userDetails.name,
      userRole: userDetails.role,
      action,
      resource: 'credential',
      resourceId: credentialId,
      details: {
        ...details,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'success'
    });
  },
  
  logPermissionChange: async (req, targetUserId, changes) => {
    const userDetails = req.user?.userId ? await getUserDetails(req.user.userId) : { name: null, email: null, role: null };
    return createAuditLog({
      userId: req.user?.userId || null,
      userEmail: req.user?.email || null,
      userName: userDetails.name,
      userRole: userDetails.role,
      action: 'permission_changed',
      resource: 'permission',
      resourceId: targetUserId,
      details: { 
        changes,
        timestamp: new Date().toISOString()
      },
      changes: changes,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'success'
    });
  },
  
  logAIQuery: async (req, query, responseLength) => {
    const userDetails = req.user?.userId ? await getUserDetails(req.user.userId) : { name: null, email: null, role: null };
    return createAuditLog({
      userId: req.user?.userId || null,
      userEmail: req.user?.email || null,
      userName: userDetails.name,
      userRole: userDetails.role,
      action: 'ai_query',
      resource: 'ai',
      details: {
        queryLength: query.length,
        responseLength,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'success'
    });
  },
  
  logDataChange: async (req, action, resource, resourceId, oldData = null, newData = null, additionalDetails = {}) => {
    const userDetails = req.user?.userId ? await getUserDetails(req.user.userId) : { name: null, email: null, role: null };
    const changeTracking = oldData && newData ? trackChanges(oldData, newData) : null;
    
    return createAuditLog({
      userId: req.user?.userId || null,
      userEmail: req.user?.email || null,
      userName: userDetails.name,
      userRole: userDetails.role,
      action,
      resource,
      resourceId,
      details: {
        ...additionalDetails,
        timestamp: new Date().toISOString()
      },
      changes: changeTracking?.changes || null,
      oldValues: changeTracking?.oldValues || null,
      newValues: changeTracking?.newValues || null,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'success'
    });
  }
};

module.exports = {
  createAuditLog,
  auditLogMiddleware,
  sanitizeBody,
  getUserDetails,
  trackChanges,
  ...auditHelpers
};

module.exports = {
  createAuditLog,
  auditLogMiddleware,
  sanitizeBody,
  ...auditHelpers
};

