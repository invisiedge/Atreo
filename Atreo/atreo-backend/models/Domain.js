const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        // Basic domain validation
        return /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(v);
      },
      message: 'Invalid domain format'
    }
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active'
  },
  registrar: {
    type: String,
    trim: true
  },
  registrationDate: {
    type: Date
  },
  expirationDate: {
    type: Date
  },
  renewalDate: {
    type: Date
  },
  dnsProvider: {
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
domainSchema.index({ status: 1 });

// Standardize JSON output
domainSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
  }
});

module.exports = mongoose.model('Domain', domainSchema);

