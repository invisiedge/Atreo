const mongoose = require('mongoose');

/**
 * Audit Log Model
 * 
 * Logs are immutable and read-only.
 * Always log:
 * - Login attempts
 * - OTP verification
 * - Permission changes
 * - Tool credential access
 * - File uploads/downloads
 * - Data create/update/delete
 * - AI queries
 */
const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userEmail: {
    type: String
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login_attempt',
      'login_success',
      'login_failure',
      'otp_sent',
      'otp_verified',
      'otp_failed',
      'permission_changed',
      'credential_accessed',
      'credential_viewed',
      'file_uploaded',
      'file_downloaded',
      'data_created',
      'data_updated',
      'data_deleted',
      'ai_query',
      'password_changed',
      'user_created',
      'user_updated',
      'user_deleted'
    ]
  },
  resource: {
    type: String // e.g., 'tool', 'invoice', 'credential', 'user'
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed // Flexible structure for different action types
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'error'],
    default: 'success'
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

// Prevent updates and deletes (immutable)
auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'findByIdAndUpdate'], function() {
  throw new Error('Audit logs are immutable and cannot be updated');
});

auditLogSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete', 'findByIdAndDelete', 'remove'], function() {
  throw new Error('Audit logs are immutable and cannot be deleted');
});

// Standardize JSON output
auditLogSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);

