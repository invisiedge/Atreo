const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  employeeName: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bankDetails: {
    bankName: {
      type: String,
      required: true,
      trim: true
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true
    },
    fullAccountNumber: {
      type: String,
      required: true,
      trim: true
    },
    swiftCode: {
      type: String,
      required: true,
      trim: true
    }
  },
  workPeriod: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewerName: {
    type: String,
    trim: true
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  paymentDate: {
    type: Date
  },
  paymentReference: {
    type: String,
    trim: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
submissionSchema.index({ employeeId: 1, status: 1 });
submissionSchema.index({ status: 1, submittedAt: -1 });
submissionSchema.index({ userId: 1 });

// Virtual for formatted submission date
submissionSchema.virtual('formattedSubmittedAt').get(function() {
  return this.submittedAt.toLocaleDateString();
});

// Virtual for formatted amount
submissionSchema.virtual('formattedAmount').get(function() {
  return `$${this.totalAmount.toFixed(2)}`;
});

// Standardize JSON output
submissionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
  }
});

module.exports = mongoose.model('Submission', submissionSchema);
