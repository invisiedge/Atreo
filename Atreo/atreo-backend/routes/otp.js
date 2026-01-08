const express = require('express');
const router = express.Router();
const User = require('../models/User');
const OTP = require('../models/OTP');
const emailService = require('../services/emailService');
const { createAuditLog, logOTPVerification } = require('../middleware/auditLog');

// Send OTP for email verification
router.post('/send-otp', async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const { purpose = 'email-verification' } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    if (purpose === 'email-verification') {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (user.emailVerified) return res.status(400).json({ message: 'Email already verified' });
    }
    
    const recentOTP = await OTP.findOne({
      email,
      purpose,
      createdAt: { $gte: new Date(Date.now() - 60000) }
    });
    
    if (recentOTP) return res.status(429).json({ message: 'Please wait before requesting another OTP' });
    
    const otp = await OTP.createOTP(email, purpose, req.ip);
    
    try {
      await emailService.sendOTPEmail(email, otp);
      await createAuditLog({
        userEmail: email,
        action: 'otp_sent',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'success'
      });
      res.json({ message: 'OTP sent successfully', expiresIn: '5-10 minutes' });
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      res.status(500).json({ message: 'Failed to send OTP email' });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const { otp, purpose = 'email-verification' } = req.body;
    
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });
    
    const otpRecord = await OTP.findOne({ email, purpose, verified: false }).sort({ createdAt: -1 });
    
    if (!otpRecord) {
      await logOTPVerification(req, email, false, 'OTP not found');
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    if (otpRecord.isExpired()) {
      await logOTPVerification(req, email, false, 'OTP expired');
      return res.status(400).json({ message: 'OTP has expired' });
    }
    
    if (otpRecord.hasExceededAttempts()) {
      await logOTPVerification(req, email, false, 'Max attempts exceeded');
      return res.status(429).json({ message: 'Too many attempts' });
    }
    
    const isValid = await otpRecord.compareOTP(otp);
    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      await logOTPVerification(req, email, false, 'Invalid OTP');
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    otpRecord.verified = true;
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();
    
    if (purpose === 'email-verification') {
      const user = await User.findOne({ email });
      if (user) {
        user.emailVerified = true;
        user.emailVerifiedAt = new Date();
        await user.save();
      }
    }
    
    await logOTPVerification(req, email, true);
    res.json({ message: 'OTP verified successfully', verified: true });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
