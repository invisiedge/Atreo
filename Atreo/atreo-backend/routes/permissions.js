const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Admin = require('../models/Admin');
const Permission = require('../models/Permission');
const { authenticateToken } = require('../middleware/auth');
const { canAssignPermissions } = require('../middleware/permissions');
const { logPermissionChange } = require('../middleware/auditLog');

// Get user permissions
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = await User.findById(req.user.userId);
    
    if (req.user.userId !== userId) {
      if (requestingUser.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      const admin = await Admin.findOne({ userId: requestingUser._id });
      if (!admin || admin.role !== 'super-admin') {
        return res.status(403).json({ message: 'Super Admin access required' });
      }
    }
    
    const permission = await Permission.findOne({ userId });
    
    if (!permission) {
      return res.json({
        userId,
        modules: [],
        pages: {},
        explicitPermissions: []
      });
    }
    
    res.json(permission);
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign/Update permissions (Super Admin only)
router.put('/:userId', authenticateToken, canAssignPermissions, async (req, res) => {
  try {
    const { userId } = req.params;
    const { modules, explicitPermissions } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let permission = await Permission.findOne({ userId });
    if (!permission) {
      permission = new Permission({
        userId,
        createdBy: req.user.userId
      });
    }
    
    if (modules) {
      const modulesMap = new Map();
      Object.entries(modules).forEach(([moduleName, moduleData]) => {
        const pagesMap = new Map();
        if (moduleData && moduleData.pages) {
          Object.entries(moduleData.pages).forEach(([pageName, pageData]) => {
            pagesMap.set(pageName, {
              read: pageData.read || false,
              write: pageData.write || false
            });
          });
        }
        modulesMap.set(moduleName, { pages: pagesMap });
      });
      permission.modules = modulesMap;
    }
    
    if (explicitPermissions) {
      permission.explicitPermissions = explicitPermissions;
    }
    
    permission.updatedBy = req.user.userId;
    await permission.save();
    
    await logPermissionChange(req, userId, {
      modules: permission.modules,
      explicitPermissions: permission.explicitPermissions
    });
    
    res.json(permission);
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
