const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  username: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    trim: true
  },
  apiKey: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  tags: {
    type: [String],
    default: []
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  hasAutopay: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    default: 0
  },
  billingPeriod: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  has2FA: {
    type: Boolean,
    default: false
  },
  twoFactorMethod: {
    type: String,
    enum: ['mobile', 'email', null],
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank', 'paypal', 'other', null],
    default: null
  },
  cardLast4Digits: {
    type: String,
    trim: true,
    maxlength: 4
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  }
}, {
  timestamps: true
});

// Index for better query performance
toolSchema.index({ createdBy: 1 });
toolSchema.index({ category: 1 });
toolSchema.index({ tags: 1 });

// Standardize JSON output
toolSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
  }
});

module.exports = mongoose.model('Tool', toolSchema);

