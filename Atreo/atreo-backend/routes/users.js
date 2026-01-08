/**
 * User Routes
 * Handles user management operations
 */

const express = require('express');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { validateUserUpdate, validateObjectId, validatePagination, validateSignup } = require('../middleware/validation');
const { requireModuleAccess } = require('../middleware/permissions');
const { createAuditLog } = require('../middleware/auditLog');

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
 * Create a new user (admin only)
 */
router.post('/', validateSignup, requireModuleAccess('users'), async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const { name, password, role = 'user', employeeId, permissions = [], adminRole } = req.body;

    // Check if user already exists
    const [existingUser, existingAdmin] = await Promise.all([
      User.findOne({ email }),
      Admin.findOne({ email })
    ]);

    if (existingUser || existingAdmin) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Determine roles
    const finalRole = role === 'admin' ? 'admin' : 'user';
    const adminRoleValue = finalRole === 'admin' && adminRole === 'super-admin' ? 'super-admin' : 'admin';

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: finalRole,
      isActive: true,
      emailVerified: true,
      permissions: Array.isArray(permissions) ? permissions : [],
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
    await createAuditLog({
      userId: req.user.userId,
      action: 'user_created',
      resource: 'User',
      resourceId: user._id,
      details: { email: user.email, role: user.role }
    });

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
 * Clear all non-admin users
 */
router.delete('/clear-all', requireModuleAccess('users'), async (req, res) => {
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
 * Get current user's profile
 */
router.get('/profile/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

/**
 * PUT /api/users/profile/me
 * Update current user's profile
 */
router.put('/profile/me', validateUserUpdate, async (req, res) => {
  try {
    const { name, phone, address, bankName, accountNumber, swiftCode, position } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { 
        ...(name && { name }),
        ...(phone && { phone }),
        ...(address && { address }),
        ...(bankName && { bankName }),
        ...(accountNumber && { accountNumber }),
        ...(swiftCode && { swiftCode }),
        ...(position && { position })
      },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
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
 * Update user information
 */
router.put('/:id', validateObjectId, validateUserUpdate, requireModuleAccess('users'), async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const { name, phone, isActive } = req.body;
    
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
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(typeof isActive === 'boolean' && { isActive })
      },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Log the update
    await createAuditLog({
      userId: req.user.userId,
      action: 'user_updated',
      resource: 'User',
      resourceId: user._id,
      details: { updatedFields: Object.keys(req.body) }
    });
    
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
 * Delete user from database
 */
router.delete('/:id', validateObjectId, requireModuleAccess('users'), async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent deleting yourself
    if (userId === req.user.userId) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    
    // Find the user first
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete associated admin record if exists (for admin users)
    if (user.role === 'admin') {
      const admin = await Admin.findOne({ userId: user._id });
      if (admin) {
        await Admin.findByIdAndDelete(admin._id);
      }
    }
    
    // Delete the user
    await User.findByIdAndDelete(userId);
    
    // Log the deletion
    await createAuditLog({
      userId: req.user.userId,
      action: 'user_deleted',
      resource: 'User',
      resourceId: userId,
      details: { email: user.email, name: user.name }
    });
    
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
 * Update user role
 */
router.patch('/:id/role', validateObjectId, requireModuleAccess('users'), async (req, res) => {
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
 * Update admin role (for admin users only)
 */
router.patch('/:id/admin-role', validateObjectId, requireModuleAccess('users'), async (req, res) => {
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
 * Update user active status
 */
router.patch('/:id/status', validateObjectId, requireModuleAccess('users'), async (req, res) => {
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
 * Update user permissions
 */
router.patch('/:id/permissions', validateObjectId, requireModuleAccess('users'), async (req, res) => {
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
 * Reactivate a deactivated user
 */
router.post('/:id/activate', validateObjectId, requireModuleAccess('users'), async (req, res) => {
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

module.exports = router;