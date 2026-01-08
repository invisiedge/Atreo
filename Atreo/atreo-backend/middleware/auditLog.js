const AuditLog = require('../models/AuditLog');

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
 * Create an audit log entry
 */
async function createAuditLog(data) {
  try {
    const log = new AuditLog({
      userId: data.userId || null,
      userEmail: data.userEmail || null,
      action: data.action,
      resource: data.resource || null,
      resourceId: data.resourceId || null,
      details: data.details || {},
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
 * Helper functions for specific actions
 */
const auditHelpers = {
  logLoginAttempt: (req, success, errorMessage = null) => {
    return createAuditLog({
      userId: req.user?.userId || null,
      userEmail: req.body?.email || null,
      action: success ? 'login_success' : 'login_failure',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: success ? 'success' : 'failure',
      errorMessage
    });
  },
  
  logOTPVerification: (req, email, success, errorMessage = null) => {
    return createAuditLog({
      userEmail: email,
      action: success ? 'otp_verified' : 'otp_failed',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: success ? 'success' : 'failure',
      errorMessage
    });
  },
  
  logCredentialAccess: (req, credentialId, action = 'credential_viewed') => {
    return createAuditLog({
      userId: req.user?.userId || null,
      userEmail: req.user?.email || null,
      action,
      resource: 'credential',
      resourceId: credentialId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'success'
    });
  },
  
  logPermissionChange: (req, targetUserId, changes) => {
    return createAuditLog({
      userId: req.user?.userId || null,
      userEmail: req.user?.email || null,
      action: 'permission_changed',
      resource: 'permission',
      resourceId: targetUserId,
      details: { changes },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'success'
    });
  },
  
  logAIQuery: (req, query, responseLength) => {
    return createAuditLog({
      userId: req.user?.userId || null,
      userEmail: req.user?.email || null,
      action: 'ai_query',
      resource: 'ai',
      details: {
        queryLength: query.length,
        responseLength,
        timestamp: new Date()
      },
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
  ...auditHelpers
};

