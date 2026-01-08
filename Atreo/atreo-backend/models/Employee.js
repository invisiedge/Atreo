const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // 1. EMPLOYEE DASHBOARD
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  profilePhoto: {
    type: String, // URL to profile photo
    trim: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Intern', 'Freelancer', 'Consultant'],
    default: 'Full-time'
  },
  workLocation: {
    type: String,
    enum: ['Remote', 'Hybrid', 'Office'],
    default: 'Remote'
  },
  // 2. CONTACT & COMMUNICATION DETAILS
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  personalEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  workEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  personalPhone: {
    type: String,
    trim: true
  },
  whatsappNumber: {
    type: String,
    trim: true
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    }
  },
  // 3. DOCUMENTATION & COMPLIANCE
  documents: {
    resume: String, // URL to document
    offerLetter: String,
    employeeAgreement: String,
    nda: String,
    govtId: String,
    passport: String,
    addressProof: String,
    pan: String,
    taxId: String
  },
  // 4. EMPLOYMENT LIFECYCLE
  dateOfJoined: {
    type: Date,
    default: Date.now
  },
  hireDate: {
    type: Date,
    default: Date.now
  },
  employmentStatus: {
    type: String,
    enum: ['Active', 'On Notice', 'Exited'],
    default: 'Active'
  },
  confirmationDate: {
    type: Date
  },
  lastWorkingDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated', 'on-leave'],
    default: 'active'
  },
  // 5. PAYROLL & FINANCE DETAILS
  salary: {
    type: Number,
    min: 0
  },
  salaryType: {
    type: String,
    enum: ['Monthly', 'Hourly', 'Project-based'],
    default: 'Monthly'
  },
  paymentCurrency: {
    type: String,
    default: 'USD',
    trim: true
  },
  payrollCycle: {
    type: String,
    enum: ['Weekly', 'Monthly'],
    default: 'Monthly'
  },
  bankDetails: {
    bankName: String,
    accountNumber: String,
    swiftCode: String,
    routingNumber: String,
    accountHolderName: String
  },
  lastSalaryPaidDate: {
    type: Date
  },
  salaryRevisionHistory: [{
    date: Date,
    previousAmount: Number,
    newAmount: Number,
    reason: String
  }],
  bonus: {
    type: Number,
    min: 0,
    default: 0
  },
  incentives: {
    type: Number,
    min: 0,
    default: 0
  },
  deductions: {
    type: Number,
    min: 0,
    default: 0
  },
  // 6. ROLE, RESPONSIBILITIES & KPIs
  roleDescription: {
    type: String,
    trim: true
  },
  coreResponsibilities: [{
    type: String,
    trim: true
  }],
  keyKPIs: [{
    type: String,
    trim: true
  }],
  weeklyDeliverables: [{
    type: String,
    trim: true
  }],
  monthlyGoals: [{
    type: String,
    trim: true
  }],
  clientAccountsAssigned: [{
    type: String,
    trim: true
  }],
  toolsUsed: [{
    type: String,
    trim: true
  }],
  aiToolsAuthorized: [{
    type: String,
    trim: true
  }],
  // Legacy fields for backward compatibility
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
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
  }
}, {
  timestamps: true
});

// Index for better query performance
employeeSchema.index({ department: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ employmentStatus: 1 });

// Standardize JSON output
employeeSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
  }
});

module.exports = mongoose.model('Employee', employeeSchema);
