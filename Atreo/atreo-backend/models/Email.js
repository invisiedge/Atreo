const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  password: {
    type: String,
    trim: true
  },
  domain: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },
  provider: {
    type: String,
    enum: ['gmail', 'outlook', 'custom', 'other'],
    default: 'custom'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  owner: {
    type: String,
    trim: true
  },
  purpose: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
emailSchema.index({ email: 1 });
emailSchema.index({ domain: 1 });
emailSchema.index({ organizationId: 1 });
emailSchema.index({ status: 1 });

module.exports = mongoose.model('Email', emailSchema);

