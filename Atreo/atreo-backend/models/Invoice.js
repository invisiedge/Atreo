const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'SGD', 'HKD', 'CHF', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'ZAR', 'BRL', 'MXN', 'AED', 'SAR', 'THB', 'MYR', 'IDR', 'PHP', 'KRW', 'VND', 'ILS', 'TRY', 'RUB', 'PKR', 'BDT', 'LKR', 'NPR'],
    uppercase: true
  },
  provider: {
    type: String,
    required: true,
    trim: true
  },
  billingDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date
  },
  category: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
    toolIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tool',
      index: true
    }],
    notes: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  }, {
    timestamps: true
  });

// Indexes for better query performance
invoiceSchema.index({ organizationId: 1, status: 1 });
invoiceSchema.index({ organizationId: 1, provider: 1 });
invoiceSchema.index({ organizationId: 1, billingDate: 1 });
invoiceSchema.index({ uploadedBy: 1 });

// Standardize JSON output
invoiceSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
  }
});

module.exports = mongoose.model('Invoice', invoiceSchema);

