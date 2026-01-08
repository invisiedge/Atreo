/**
 * Authentication Routes
 * Handles user login, signup, and authentication
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Admin = require('../models/Admin');
const OTP = require('../models/OTP');
const Permission = require('../models/Permission');
const { validateLogin, validateSignup } = require('../middleware/validation');
const { logLoginAttempt, logOTPVerification } = require('../middleware/auditLog');

const router = express.Router();

// Rate limiting for login attempts
const loginRateLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5, // Limit each IP to 5 login attempts
  message: {
    error: 'Too many login attempts',
    message: 'Too many login attempts from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000 / 60) + ' minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Too many login attempts from this IP, please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000 / 60) + ' minutes'
    });
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * POST /api/auth/login
 * User login with rate limiting and validation
 */
router.post('/login', loginRateLimiter, validateLogin, async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const { password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    // Compare password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      await logLoginAttempt(req, false, 'Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Log successful login
    await logLoginAttempt(req, true);
    
    // Fetch permissions from Permission model (3-layer structure)
    const permission = await Permission.findOne({ userId: user._id });
    
    const userData = user.toJSON();
    if (permission && permission.modules) {
      const permissionsObj = { modules: {} };
      
      if (permission.modules instanceof Map) {
        permission.modules.forEach((moduleData, moduleName) => {
          permissionsObj.modules[moduleName] = {};
          if (moduleData.pages instanceof Map) {
            permissionsObj.modules[moduleName].pages = {};
            moduleData.pages.forEach((pageData, pageName) => {
              permissionsObj.modules[moduleName].pages[pageName] = {
                read: pageData.read || false,
                write: pageData.write || false
              };
            });
          }
        });
      } else {
        // Fallback for plain object if not Map
        Object.entries(permission.modules).forEach(([moduleName, moduleData]) => {
          permissionsObj.modules[moduleName] = { pages: {} };
          if (moduleData.pages) {
            Object.entries(moduleData.pages).forEach(([pageName, pageData]) => {
              permissionsObj.modules[moduleName].pages[pageName] = {
                read: pageData.read || false,
                write: pageData.write || false
              };
            });
          }
        });
      }
      
      userData.permissions = permissionsObj;
    } else {
      // No Permission model found - use User model's permissions array for backward compatibility
      if (!userData.permissions || !Array.isArray(userData.permissions)) {
        userData.permissions = [];
      }
    }
    
    // If user is an admin, also get their admin role
    let adminRole = null;
    if (user.role === 'admin') {
      let admin = await Admin.findOne({ userId: user._id });
      
      // If admin record doesn't exist but user matches configured admin email, create it as super-admin
      const adminEmail = process.env.ADMIN_EMAIL;
      if (!admin && user.email === adminEmail) {
        // Check if ADM0001 already exists to avoid duplicate key error
        const existingAdmin = await Admin.findOne({ adminId: 'ADM0001' });
        
        if (existingAdmin) {
          existingAdmin.userId = user._id;
          await existingAdmin.save();
          admin = existingAdmin;
        } else {
          admin = new Admin({
            userId: user._id,
            adminId: 'ADM0001',
            name: user.name,
            email: user.email,
            role: 'super-admin',
            department: 'IT Administration',
            phone: '+1 (555) 000-0001',
            permissions: {
              canManageUsers: true,
              canManageEmployees: true,
              canManageAdmins: true,
              canManagePayroll: true,
              canViewReports: true,
              canExportData: true
            },
            status: 'active',
            notes: 'Primary system administrator'
          });
          await admin.save();
        }
      }
      
      if (admin) {
        adminRole = admin.role;
        userData.adminRole = admin.role;
      }
    }
    
    // Generate JWT token with role information
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        adminRole: adminRole
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

/**
 * POST /api/auth/signup
 * User registration with validation
 */
router.post('/signup', validateSignup, async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const { name, password, role: requestedRole = 'user', adminRole: requestedAdminRole } = req.body;
    
    // Check if user already exists in User or Admin collection
    const [existingUser, existingAdmin] = await Promise.all([
      User.findOne({ email }),
      Admin.findOne({ email })
    ]);

    if (existingUser || existingAdmin) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Determine roles
    const role = requestedRole === 'admin' ? 'admin' : 'user';
    const adminRoleValue = role === 'admin' && requestedAdminRole === 'super-admin' ? 'super-admin' : 'admin';

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role,
      isActive: true,
      emailVerified: true,
      permissions: []
    });
    
    await user.save();
    
    // If admin role, create admin record
    let finalAdminRole = null;
    if (role === 'admin') {
      let admin = await Admin.findOne({ userId: user._id });
      if (!admin) {
        admin = new Admin({
          userId: user._id,
          adminId: `ADM${Date.now()}`,
          name: user.name,
          email: user.email,
          role: adminRoleValue,
          department: 'Administration',
          permissions: {
            canManageUsers: true,
            canManageEmployees: true,
            canManageAdmins: adminRoleValue === 'super-admin',
            canManagePayroll: true,
            canViewReports: true,
            canExportData: true
          },
          status: 'active',
          notes: 'Created via signup'
        });
        await admin.save();
      }
      finalAdminRole = admin.role;
    }
    
    // Generate JWT token with role information
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        adminRole: finalAdminRole
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const userData = user.toJSON();
    if (finalAdminRole) {
      userData.adminRole = finalAdminRole;
    }

    res.status(201).json({
      message: 'User created successfully',
      user: userData,
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle specific Mongoose errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: Object.values(error.errors).map(err => err.message) 
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `A user already exists with this ${field}` 
      });
    }

    res.status(500).json({ message: 'Server error during signup' });
  }
});

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token or user not found' });
    }
    
    const userData = user.toJSON();
    
    // Fetch permissions from Permission model (3-layer structure)
    const permission = await Permission.findOne({ userId: user._id });
    
    if (permission && permission.modules) {
      const permissionsObj = { modules: {} };
      if (permission.modules instanceof Map) {
        permission.modules.forEach((moduleData, moduleName) => {
          permissionsObj.modules[moduleName] = {};
          if (moduleData.pages instanceof Map) {
            permissionsObj.modules[moduleName].pages = {};
            moduleData.pages.forEach((pageData, pageName) => {
              permissionsObj.modules[moduleName].pages[pageName] = {
                read: pageData.read || false,
                write: pageData.write || false
              };
            });
          }
        });
      }
      userData.permissions = permissionsObj;
    } else if (!userData.permissions || !Array.isArray(userData.permissions)) {
      userData.permissions = [];
    }
    
    if (user.role === 'admin') {
      const admin = await Admin.findOne({ userId: user._id });
      if (admin) userData.adminRole = admin.role;
    }
    
    res.json({ user: userData });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
