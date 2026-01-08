const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  month: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  role: {
    type: String,
    required: true,
    trim: true
  },
  contractHours: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  fulfilledHours: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'SGD', 'HKD', 'CHF', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'ZAR', 'BRL', 'MXN', 'AED', 'SAR', 'THB', 'MYR', 'IDR', 'PHP', 'KRW', 'VND', 'ILS', 'TRY', 'RUB', 'PKR', 'BDT', 'LKR', 'NPR'],
    uppercase: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
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
paymentSchema.index({ organizationId: 1, month: 1 });
paymentSchema.index({ name: 1, month: 1 });
paymentSchema.index({ role: 1 });
paymentSchema.index({ month: 1, role: 1 });

// Compound index to prevent duplicates
paymentSchema.index({ name: 1, month: 1, organizationId: 1 }, { unique: true });

module.exports = mongoose.model('Payment', paymentSchema);

