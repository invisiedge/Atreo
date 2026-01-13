const Permission = require('../models/Permission');
const User = require('../models/User');
const Admin = require('../models/Admin');

/**
 * Permission Middleware - 3-Layer Permission System
 * 
 * IMPORTANT: Sidebar Categories vs Backend Permissions
 * ====================================================
 * 
 * Sidebar categories exist only for navigation clarity. They do NOT define security.
 * 
 * Key Rule: Sidebar controls visibility, backend controls access.
 * 
 * This middleware is the SOURCE OF TRUTH for security. It MUST be applied to all
 * API endpoints that require permissions, regardless of what appears in the sidebar.
 * 
 * Layer 1: Module Access - Decides if a section exists for the user
 * Layer 2: Page Access - Decides which pages inside that module are visible
 * Layer 3: Access Type - Decides if user can only read or also write
 */

/**
 * Check if user has module access
 */
async function hasModuleAccess(userId, module) {
  const user = await User.findById(userId);
  if (!user) return false;

  // Super Admin has access to all modules
  if (user.role === 'admin') {
    const admin = await Admin.findOne({ userId });
    if (admin && admin.role === 'super-admin') {
      return true;
    }
  }

  // Accountants have read-only access to specific modules
  if (user.role === 'accountant') {
    const accountantModules = ['invoices', 'dashboard', 'users', 'settings', 'credentials'];
    return accountantModules.includes(module);
  }

  // Check explicit permissions
  const permission = await Permission.findOne({ userId });
  if (!permission) return false;

  return permission.hasModuleAccess(module);
}

/**
 * Check if user has page access
 */
async function hasPageAccess(userId, module, page, accessType = 'read') {
  const user = await User.findById(userId);
  if (!user) return false;

  // Super Admin has access to all pages
  if (user.role === 'admin') {
    const admin = await Admin.findOne({ userId });
    if (admin && admin.role === 'super-admin') {
      return true;
    }
  }

  // Accountants have read-only access to specific modules
  if (user.role === 'accountant') {
    const accountantModules = ['invoices', 'dashboard', 'users', 'settings', 'credentials'];
    // Only allow read access, deny write access
    if (accountantModules.includes(module) && accessType === 'read') {
      return true;
    }
    return false;
  }

  // Check explicit permissions
  const permission = await Permission.findOne({ userId });
  if (!permission) return false;

  return permission.hasPageAccess(module, page, accessType);
}

/**
 * Middleware to check module access
 */
function requireModuleAccess(module) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const hasAccess = await hasModuleAccess(req.user.userId, module);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: `Access denied: Module '${module}' is not accessible` 
        });
      }
      
      next();
    } catch (error) {
      console.error('Module access check error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
}

/**
 * Middleware to check page access
 */
function requirePageAccess(module, page, accessType = 'read') {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const hasAccess = await hasPageAccess(req.user.userId, module, page, accessType);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: `Access denied: ${accessType} access to '${module}:${page}' is not allowed` 
        });
      }
      
      next();
    } catch (error) {
      console.error('Page access check error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
}

/**
 * Middleware to check if user is Super Admin
 */
async function requireSuperAdmin(req, res, next) {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const admin = await Admin.findOne({ userId: user._id });
    if (!admin || admin.role !== 'super-admin') {
      return res.status(403).json({ message: 'Super-admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Super-admin check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Middleware to check if user can assign permissions
 * Only Super Admin can assign permissions
 */
async function canAssignPermissions(req, res, next) {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const admin = await Admin.findOne({ userId: user._id });
    if (!admin || admin.role !== 'super-admin') {
      return res.status(403).json({ message: 'Only Super Admin can assign permissions' });
    }
    
    next();
  } catch (error) {
    console.error('Permission assignment check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  hasModuleAccess,
  hasPageAccess,
  requireModuleAccess,
  requirePageAccess,
  requireSuperAdmin,
  canAssignPermissions
};

