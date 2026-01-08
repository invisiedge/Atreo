const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * OTP Model for Email Verification
 * 
 * Rules:
 * - OTP Length: 6 digits
 * - Expiry: 5-10 minutes
 * - Storage: Hashed
 * - Attempts: Rate-limited
 * - Email Provider: Google SMTP
 */
const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  hashedOTP: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['email-verification', 'password-reset', 'login'],
    default: 'email-verification',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-delete expired OTPs
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5 // Rate limiting: max 5 attempts
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

// Hash OTP before saving (only if it's a plain OTP, not already hashed)
otpSchema.pre('save', async function(next) {
  // Skip if already hashed (length > 20 indicates it's already hashed)
  if (this.hashedOTP && this.hashedOTP.length > 20) {
    return next();
  }
  
  if (!this.isModified('hashedOTP') || !this.hashedOTP) return next();
  
  try {
    const plainOTP = this.hashedOTP; // Store plain OTP temporarily
    const salt = await bcrypt.genSalt(10);
    this.hashedOTP = await bcrypt.hash(plainOTP, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare OTP method
otpSchema.methods.compareOTP = async function(candidateOTP) {
  return bcrypt.compare(candidateOTP, this.hashedOTP);
};

// Check if OTP is expired
otpSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Check if max attempts reached
otpSchema.methods.hasExceededAttempts = function() {
  return this.attempts >= 5;
};

// Generate OTP (static method)
otpSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
};

// Create OTP with expiry (5-10 minutes)
otpSchema.statics.createOTP = async function(email, purpose = 'email-verification', ipAddress = null) {
  const plainOTP = this.generateOTP();
  const expiryMinutes = Math.floor(Math.random() * 6) + 5; // 5-10 minutes
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
  
  // Invalidate previous OTPs for this email and purpose
  await this.updateMany(
    { email, purpose, verified: false },
    { verified: true } // Mark as used
  );
  
  // Hash the OTP before storing (pre-save hook will skip if already hashed)
  const salt = await bcrypt.genSalt(10);
  const hashedOTP = await bcrypt.hash(plainOTP, salt);
  
  const otpRecord = new this({
    email,
    hashedOTP: hashedOTP, // Already hashed, pre-save will skip
    purpose,
    expiresAt,
    ipAddress
  });
  
  await otpRecord.save();
  return plainOTP; // Return plain OTP for email sending
};

module.exports = mongoose.model('OTP', otpSchema);

