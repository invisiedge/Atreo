/**
 * User Routes
 * Handles user management operations
 */

const express = require('express');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const { validateUserUpdate, validateObjectId, validatePagination, validateSignup } = require('../middleware/validation');
const { requireModuleAccess } = require('../middleware/permissions');
const { createAuditLog, logDataChange } = require('../middleware/auditLog');
const storageService = require('../services/storageService');
const storageService = require('../services/storageService');
const multer = require('multer');

// Configure multer for file uploads
const memoryStorage = multer.memoryStorage();
const uploadDocument = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.toLowerCase().endsWith('.pdf') ||
        file.originalname.toLowerCase().endsWith('.doc') ||
        file.originalname.toLowerCase().endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPEG, PNG, and JPG files are allowed.'));
    }
  }
});

// Middleware to require super-admin access
const requireSuperAdmin = async (req, res, next) => {
  try {
    const admin = await Admin.findOne({ userId: req.user.userId });
    if (!admin || admin.role !== 'super-admin') {
      return res.status(403).json({ message: 'Super admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const router = express.Router();

/**
 * GET /api/users
 * Get all users with pagination and filtering
 */
router.get('/', validatePagination, requireModuleAccess('users'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; // Increased default limit for admin view
    const skip = (page - 1) * limit;
    const { status, role } = req.query;
    
    const query = {};
    
    // Status filtering
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    // If status is 'all' or not provided, show all users (both active and inactive)
    // This ensures all existing users are visible by default
    // Only filter when explicitly requested
    
    // Role filtering
    if (role) {
      query.role = role;
    }
    
    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

/**
 * POST /api/users
 * Create a new user (super-admin only)
 */
router.post('/', validateSignup, requireModuleAccess('users'), requireSuperAdmin, async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const { name, password, role = 'user', employeeId, adminRole } = req.body;

    // Check if user already exists
    const [existingUser, existingAdmin] = await Promise.all([
      User.findOne({ email }),
      Admin.findOne({ email })
    ]);

    if (existingUser || existingAdmin) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Determine roles - support accountant role
    let finalRole = 'user';
    if (role === 'admin') {
      finalRole = 'admin';
    } else if (role === 'accountant') {
      finalRole = 'accountant';
    } else if (role === 'employee') {
      finalRole = 'employee';
    }

    const adminRoleValue = finalRole === 'admin' && adminRole === 'super-admin' ? 'super-admin' : 'admin';

    // Create new user - removed legacy permissions field
    const user = new User({
      name,
      email,
      password,
      role: finalRole,
      isActive: true,
      emailVerified: true,
      permissions: [], // Empty array - use Permission model instead
      ...(employeeId && { employeeId })
    });

    await user.save();

    // If admin role, create admin record
    let finalAdminRole = null;
    if (finalRole === 'admin') {
      const admin = new Admin({
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
        notes: 'Created via admin panel'
      });
      await admin.save();
      finalAdminRole = admin.role;
    }

    // Log the creation
    await logDataChange(
      req,
      'user_created',
      'User',
      user._id,
      null,
      user.toObject(),
      { 
        email: user.email, 
        role: user.role,
        adminRole: finalAdminRole,
        employeeId: employeeId || null
      }
    );

    const userData = user.toJSON();
    if (finalAdminRole) {
      userData.adminRole = finalAdminRole;
    }

    res.status(201).json({
      message: 'User created successfully',
      user: userData
    });
  } catch (error) {
    console.error('Create user error:', error);

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

    res.status(500).json({ message: 'Server error creating user' });
  }
});

/**
 * DELETE /api/users/clear-all
 * Clear all non-admin users (super-admin only)
 */
router.delete('/clear-all', requireModuleAccess('users'), requireSuperAdmin, async (req, res) => {
  try {
    // We only delete users that are NOT admins and NOT the current user
    const result = await User.deleteMany({
      role: 'user',
      _id: { $ne: req.user.userId }
    });
    
    // Log the bulk deletion
    await createAuditLog({
      userId: req.user.userId,
      action: 'users_cleared',
      resource: 'User',
      details: { count: result.deletedCount }
    });
    
    res.json({
      message: `Successfully cleared ${result.deletedCount} users`,
      count: result.deletedCount
    });
  } catch (error) {
    console.error('Clear users error:', error);
    res.status(500).json({ message: 'Server error clearing users' });
  }
});

/**
 * GET /api/users/profile/me
 * Get current user's profile with employee data if exists
 */
router.get('/profile/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Fetch employee data if exists
    const employee = await Employee.findOne({ userId: req.user.userId });
    
    // Merge user and employee data
    const userData = user.toObject();
    if (employee) {
      // Merge employee fields into user object
      userData.employeeId = employee.employeeId;
      userData.department = employee.department;
      userData.employmentType = employee.employmentType;
      userData.workLocation = employee.workLocation;
      userData.personalEmail = employee.personalEmail;
      userData.workEmail = employee.workEmail;
      userData.personalPhone = employee.personalPhone;
      userData.whatsappNumber = employee.whatsappNumber;
      userData.emergencyContact = employee.emergencyContact;
      userData.salary = employee.salary;
      userData.salaryType = employee.salaryType;
      userData.paymentCurrency = employee.paymentCurrency;
      userData.payrollCycle = employee.payrollCycle;
      userData.routingNumber = employee.bankDetails?.routingNumber;
      userData.accountHolderName = employee.bankDetails?.accountHolderName;
      userData.bonus = employee.bonus;
      userData.incentives = employee.incentives;
      userData.deductions = employee.deductions;
      userData.roleDescription = employee.roleDescription;
      userData.coreResponsibilities = employee.coreResponsibilities;
      userData.keyKPIs = employee.keyKPIs;
      userData.weeklyDeliverables = employee.weeklyDeliverables;
      userData.monthlyGoals = employee.monthlyGoals;
      userData.clientAccountsAssigned = employee.clientAccountsAssigned;
      userData.toolsUsed = employee.toolsUsed;
      userData.aiToolsAuthorized = employee.aiToolsAuthorized;
      userData.dateOfJoined = employee.dateOfJoined;
      userData.employmentStatus = employee.employmentStatus;
      userData.confirmationDate = employee.confirmationDate;
      userData.lastWorkingDate = employee.lastWorkingDate;
      userData.lastSalaryPaidDate = employee.lastSalaryPaidDate;
      userData.documents = employee.documents || {};
      userData.profilePhoto = employee.profilePhoto;
      
      // Merge bank details
      if (employee.bankDetails) {
        if (!userData.bankName && employee.bankDetails.bankName) userData.bankName = employee.bankDetails.bankName;
        if (!userData.accountNumber && employee.bankDetails.accountNumber) userData.accountNumber = employee.bankDetails.accountNumber;
        if (!userData.swiftCode && employee.bankDetails.swiftCode) userData.swiftCode = employee.bankDetails.swiftCode;
      }
    } else {
      // Initialize empty documents object if no employee record
      userData.documents = {};
    }
    
    res.json({ user: userData });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

/**
 * PUT /api/users/profile/me
 * Update current user's profile and sync with employee record if exists
 */
router.put('/profile/me', validateUserUpdate, async (req, res) => {
  try {
    const { 
      name, phone, address, bankName, accountNumber, swiftCode, position,
      // Employee fields
      employeeId, department, employmentType, workLocation,
      personalEmail, workEmail, personalPhone, whatsappNumber,
      emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
      salary, salaryType, paymentCurrency, payrollCycle,
      routingNumber, accountHolderName, bonus, incentives, deductions,
      roleDescription, coreResponsibilities, keyKPIs,
      weeklyDeliverables, monthlyGoals, clientAccountsAssigned,
      toolsUsed, aiToolsAuthorized
    } = req.body;
    
    // Update User model
    const userUpdateData = {};
    if (name) userUpdateData.name = name;
    if (phone) userUpdateData.phone = phone;
    if (address) userUpdateData.address = address;
    if (bankName) userUpdateData.bankName = bankName;
    if (accountNumber) userUpdateData.accountNumber = accountNumber;
    if (swiftCode) userUpdateData.swiftCode = swiftCode;
    if (position) userUpdateData.position = position;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      userUpdateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Sync with Employee record if it exists
    const employee = await Employee.findOne({ userId: req.user.userId });
    if (employee) {
      const employeeUpdateData = {};
      
      // Basic info
      if (name) employeeUpdateData.name = name;
      if (employeeId) employeeUpdateData.employeeId = employeeId;
      if (position) employeeUpdateData.position = position;
      if (department) employeeUpdateData.department = department;
      if (employmentType) employeeUpdateData.employmentType = employmentType;
      if (workLocation) employeeUpdateData.workLocation = workLocation;
      
      // Contact info
      if (personalEmail) employeeUpdateData.personalEmail = personalEmail;
      if (workEmail) employeeUpdateData.workEmail = workEmail;
      if (personalPhone) employeeUpdateData.personalPhone = personalPhone;
      if (whatsappNumber) employeeUpdateData.whatsappNumber = whatsappNumber;
      
      // Emergency contact
      if (emergencyContactName || emergencyContactPhone || emergencyContactRelationship) {
        employeeUpdateData.emergencyContact = {
          ...(employee.emergencyContact || {}),
          ...(emergencyContactName && { name: emergencyContactName }),
          ...(emergencyContactPhone && { phone: emergencyContactPhone }),
          ...(emergencyContactRelationship && { relationship: emergencyContactRelationship })
        };
      }
      
      // Payroll & Finance
      if (salary !== undefined) employeeUpdateData.salary = parseFloat(salary);
      if (salaryType) employeeUpdateData.salaryType = salaryType;
      if (paymentCurrency) employeeUpdateData.paymentCurrency = paymentCurrency;
      if (payrollCycle) employeeUpdateData.payrollCycle = payrollCycle;
      if (bonus !== undefined) employeeUpdateData.bonus = parseFloat(bonus);
      if (incentives !== undefined) employeeUpdateData.incentives = parseFloat(incentives);
      if (deductions !== undefined) employeeUpdateData.deductions = parseFloat(deductions);
      
      // Banking details
      if (bankName || accountNumber || swiftCode || routingNumber || accountHolderName) {
        employeeUpdateData.bankDetails = {
          ...(employee.bankDetails || {}),
          ...(bankName && { bankName }),
          ...(accountNumber && { accountNumber }),
          ...(swiftCode && { swiftCode }),
          ...(routingNumber && { routingNumber }),
          ...(accountHolderName && { accountHolderName })
        };
      }
      
      // Role & Responsibilities
      if (roleDescription) employeeUpdateData.roleDescription = roleDescription;
      if (coreResponsibilities) {
        employeeUpdateData.coreResponsibilities = Array.isArray(coreResponsibilities) 
          ? coreResponsibilities 
          : coreResponsibilities.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (keyKPIs) {
        employeeUpdateData.keyKPIs = Array.isArray(keyKPIs) 
          ? keyKPIs 
          : keyKPIs.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (weeklyDeliverables) {
        employeeUpdateData.weeklyDeliverables = Array.isArray(weeklyDeliverables) 
          ? weeklyDeliverables 
          : weeklyDeliverables.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (monthlyGoals) {
        employeeUpdateData.monthlyGoals = Array.isArray(monthlyGoals) 
          ? monthlyGoals 
          : monthlyGoals.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (clientAccountsAssigned) {
        employeeUpdateData.clientAccountsAssigned = Array.isArray(clientAccountsAssigned) 
          ? clientAccountsAssigned 
          : clientAccountsAssigned.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (toolsUsed) {
        employeeUpdateData.toolsUsed = Array.isArray(toolsUsed) 
          ? toolsUsed 
          : toolsUsed.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (aiToolsAuthorized) {
        employeeUpdateData.aiToolsAuthorized = Array.isArray(aiToolsAuthorized) 
          ? aiToolsAuthorized 
          : aiToolsAuthorized.split(',').map(s => s.trim()).filter(Boolean);
      }
      
      Object.assign(employee, employeeUpdateData);
      await employee.save();
      
      // Log employee profile update with change tracking
      const newEmployee = employee.toObject();
      await logDataChange(
        req,
        'profile_updated',
        'Employee',
        employee._id,
        oldEmployee,
        newEmployee,
        {
          updatedBy: 'self',
          updatedFields: Object.keys(employeeUpdateData)
        }
      );
    }
    
    // Log user profile update with change tracking
    await logDataChange(
      req,
      'profile_updated',
      'User',
      user._id,
      oldUser,
      user,
      {
        updatedBy: 'self',
        updatedFields: Object.keys(userUpdateData)
      }
    );
    
    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', validateObjectId, requireModuleAccess('users'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error fetching user' });
  }
});

/**
 * PUT /api/users/:id
 * Update user information (super-admin only)
 */
router.put('/:id', validateObjectId, validateUserUpdate, requireModuleAccess('users'), requireSuperAdmin, async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const { name, phone, isActive } = req.body;
    
    // Get old user data before update
    const oldUser = await User.findById(req.params.id).select('-password').lean();
    if (!oldUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.params.id } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use by another user' });
      }
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password').lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Log the update with change tracking
    await logDataChange(
      req,
      'user_updated',
      'User',
      user._id,
      oldUser,
      user,
      { updatedFields: Object.keys(updateData) }
    );
    
    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error updating user' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user from database (super-admin only)
 */
router.delete('/:id', validateObjectId, requireModuleAccess('users'), requireSuperAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent deleting yourself
    if (userId === req.user.userId) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    
    // Find the user first
    const user = await User.findById(userId).lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Log the deletion before deleting
    await logDataChange(
      req,
      'user_deleted',
      'User',
      userId,
      user,
      null,
      { 
        email: user.email, 
        name: user.name,
        role: user.role
      }
    );
    
    // Delete associated admin record if exists (for admin users)
    if (user.role === 'admin') {
      const admin = await Admin.findOne({ userId: user._id });
      if (admin) {
        await Admin.findByIdAndDelete(admin._id);
      }
    }
    
    // Delete the user
    await User.findByIdAndDelete(userId);
    
    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

/**
 * PATCH /api/users/:id/role
 * Update user role (super-admin only)
 */
router.patch('/:id/role', validateObjectId, requireModuleAccess('users'), requireSuperAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Valid role (admin or user) is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await createAuditLog({
      userId: req.user.userId,
      action: 'user_role_updated',
      resource: 'User',
      resourceId: user._id,
      details: { newRole: role }
    });

    res.json({
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error updating user role' });
  }
});

/**
 * PATCH /api/users/:id/admin-role
 * Update admin role (super-admin only)
 */
router.patch('/:id/admin-role', validateObjectId, requireModuleAccess('users'), requireSuperAdmin, async (req, res) => {
  try {
    const { adminRole } = req.body;
    if (!adminRole || !['admin', 'super-admin'].includes(adminRole)) {
      return res.status(400).json({ message: 'Valid adminRole (admin or super-admin) is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(400).json({ message: 'User must be an admin to have an admin role' });
    }

    // Update admin record
    const admin = await Admin.findOneAndUpdate(
      { userId: user._id },
      { role: adminRole },
      { new: true }
    );

    if (!admin) {
      // Create admin record if it doesn't exist
      const newAdmin = new Admin({
        userId: user._id,
        adminId: `ADM${Date.now()}`,
        name: user.name,
        email: user.email,
        role: adminRole,
        department: 'Administration',
        permissions: {
          canManageUsers: true,
          canManageEmployees: true,
          canManageAdmins: adminRole === 'super-admin',
          canManagePayroll: true,
          canViewReports: true,
          canExportData: true
        },
        status: 'active',
        notes: 'Created via admin panel'
      });
      await newAdmin.save();
    }

    await createAuditLog({
      userId: req.user.userId,
      action: 'user_admin_role_updated',
      resource: 'User',
      resourceId: user._id,
      details: { newAdminRole: adminRole }
    });

    const userData = user.toJSON();
    userData.adminRole = adminRole;

    res.json({
      message: 'Admin role updated successfully',
      user: userData
    });
  } catch (error) {
    console.error('Update admin role error:', error);
    res.status(500).json({ message: 'Server error updating admin role' });
  }
});

/**
 * PATCH /api/users/:id/status
 * Update user active status (super-admin only)
 */
router.patch('/:id/status', validateObjectId, requireModuleAccess('users'), requireSuperAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean value' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await createAuditLog({
      userId: req.user.userId,
      action: isActive ? 'user_activated' : 'user_deactivated',
      resource: 'User',
      resourceId: user._id,
      details: { isActive }
    });

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error updating user status' });
  }
});

/**
 * PATCH /api/users/:id/permissions
 * Update user permissions (super-admin only)
 */
router.patch('/:id/permissions', validateObjectId, requireModuleAccess('users'), requireSuperAdmin, async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Permissions must be an array' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { permissions },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await createAuditLog({
      userId: req.user.userId,
      action: 'user_permissions_updated',
      resource: 'User',
      resourceId: user._id,
      details: { permissions }
    });

    res.json({
      message: 'User permissions updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user permissions error:', error);
    res.status(500).json({ message: 'Server error updating user permissions' });
  }
});

/**
 * POST /api/users/:id/activate
 * Reactivate a deactivated user (super-admin only)
 */
router.post('/:id/activate', validateObjectId, requireModuleAccess('users'), requireSuperAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Log the activation
    await createAuditLog({
      userId: req.user.userId,
      action: 'user_activated',
      resource: 'User',
      resourceId: user._id,
      details: { reason: 'Admin activation' }
    });
    
    res.json({
      message: 'User activated successfully',
      user
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ message: 'Server error activating user' });
  }
});

/**
 * POST /api/users/profile/me/documents/:documentType
 * Upload a document for the current user's profile (via employee record)
 * documentType: resume, offerLetter, employeeAgreement, nda, govtId, passport, addressProof, pan, taxId
 */
router.post('/profile/me/documents/:documentType', uploadDocument.single('file'), async (req, res) => {
  try {
    const { documentType } = req.params;
    const allowedTypes = ['resume', 'offerLetter', 'employeeAgreement', 'nda', 'govtId', 'passport', 'addressProof', 'pan', 'taxId'];
    
    if (!allowedTypes.includes(documentType)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Find employee record for this user
    const employee = await Employee.findOne({ userId: req.user.userId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee record not found. Please contact admin to create your employee profile.' });
    }

    // Upload file to GCP
    const gcsFileName = `employee-documents/${employee.employeeId}/${documentType}/${Date.now()}-${req.file.originalname}`;
    const fileUrl = await storageService.uploadFile(req.file, gcsFileName);

    // Update employee document
    if (!employee.documents) {
      employee.documents = {};
    }
    const oldDocumentUrl = employee.documents[documentType] || null;
    employee.documents[documentType] = fileUrl;
    await employee.save();

    // Log document upload
    await logDataChange(
      req,
      'document_uploaded',
      'Employee',
      employee._id,
      { documents: { [documentType]: oldDocumentUrl } },
      { documents: { [documentType]: fileUrl } },
      {
        employeeId: employee.employeeId,
        employeeName: employee.name,
        documentType,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileUrl,
        uploadedBy: 'self'
      }
    );

    res.json({
      message: 'Document uploaded successfully',
      documentType,
      fileUrl
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
});

/**
 * DELETE /api/users/profile/me/documents/:documentType
 * Delete a document from the current user's profile
 */
router.delete('/profile/me/documents/:documentType', async (req, res) => {
  try {
    const { documentType } = req.params;
    const allowedTypes = ['resume', 'offerLetter', 'employeeAgreement', 'nda', 'govtId', 'passport', 'addressProof', 'pan', 'taxId'];
    
    if (!allowedTypes.includes(documentType)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    // Find employee record for this user
    const employee = await Employee.findOne({ userId: req.user.userId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee record not found' });
    }

    // Get old document URL before deletion
    const oldDocumentUrl = employee.documents?.[documentType] || null;

    // Delete file from GCP if exists
    if (employee.documents && employee.documents[documentType]) {
      const fileUrl = employee.documents[documentType];
      // Extract filename from URL for deletion
      if (fileUrl.startsWith('https://storage.googleapis.com/')) {
        const parts = fileUrl.split('/');
        const fileName = parts.slice(4).join('/');
        await storageService.deleteFile(fileName);
      }
    }

    // Remove document reference
    if (employee.documents) {
      employee.documents[documentType] = undefined;
    }
    await employee.save();

    // Log document deletion
    await logDataChange(
      req,
      'document_deleted',
      'Employee',
      employee._id,
      { documents: { [documentType]: oldDocumentUrl } },
      { documents: { [documentType]: null } },
      {
        employeeId: employee.employeeId,
        employeeName: employee.name,
        documentType,
        deletedFileUrl: oldDocumentUrl,
        deletedBy: 'self'
      }
    );

    res.json({
      message: 'Document deleted successfully',
      documentType
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

module.exports = router;