const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  adminId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'super-admin'],
    default: 'admin'
  },
  permissions: {
    canManageUsers: {
      type: Boolean,
      default: true
    },
    canManageEmployees: {
      type: Boolean,
      default: true
    },
    canManageAdmins: {
      type: Boolean,
      default: false
    },
    canManagePayroll: {
      type: Boolean,
      default: true
    },
    canViewReports: {
      type: Boolean,
      default: true
    },
    canExportData: {
      type: Boolean,
      default: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  department: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
adminSchema.index({ role: 1 });
adminSchema.index({ status: 1 });

// Virtual for formatted creation date
adminSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Virtual for formatted last login
adminSchema.virtual('formattedLastLogin').get(function() {
  return this.lastLogin ? this.lastLogin.toLocaleDateString() : 'Never';
});

// Standardize JSON output
adminSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
  }
});

module.exports = mongoose.model('Admin', adminSchema);
