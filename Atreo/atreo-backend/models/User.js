const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
    role: {
      type: String,
      enum: ['admin', 'user', 'employee', 'accountant'],
      default: 'user'
    },
  employeeId: {
    type: String,
    unique: true,
    sparse: true // Allows null values but ensures uniqueness when present
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },
  // Email verification status (will be enforced later)
  emailVerified: {
    type: Boolean,
    default: false
  },
    emailVerifiedAt: {
      type: Date
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    bankName: {
      type: String,
      trim: true
    },
    accountNumber: {
      type: String,
      trim: true
    },
    swiftCode: {
      type: String,
      trim: true
    },
    position: {
      type: String,
      trim: true
    },
    // Legacy permissions field (deprecated - use Permission model instead)
  // Kept for backward compatibility during migration
  permissions: {
    type: [String],
    default: [], // No defaults - explicit permissions only
    validate: {
      validator: function(v) {
        // Allow empty array - no implicit permissions
        if (!v || v.length === 0) return true;
        // Validate each permission value - updated to include all sidebar pages
        const validPermissions = [
          // General
          'dashboard', 'payments', 'customers', 'messages',
          // Management
          'organizations', 'employees', 'users', 'admins',
          // Tools
          'products', 'invoices', 'assets', 'credentials',
          // Intelligence
          'analytics', 'ai-features', 'automation',
          // System
          'settings', 'security', 'logs', 'help',
          // Legacy/User pages
          'tools', 'submission', 'profile'
        ];
        return v.every(perm => validPermissions.includes(perm));
      },
      message: 'Invalid permission value'
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Standardize JSON output
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.password;
  }
});

module.exports = mongoose.model('User', userSchema);
