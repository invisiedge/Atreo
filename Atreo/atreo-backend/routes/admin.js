const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const User = require('../models/User');

// Middleware function (will be imported properly)
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

// Get all admins
router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const admins = await Admin.find({ status: 'active' })
      .populate('userId', 'name email role lastLogin')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(admins);
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create admin
router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const newUser = new User({
      email,
      password,
      name,
      role: 'admin'
    });

    await newUser.save();

    const newAdmin = new Admin({
      userId: newUser._id,
      role: role || 'admin',
      createdBy: req.user.userId,
      status: 'active'
    });

    await newAdmin.save();
    await newAdmin.populate('userId', 'name email role lastLogin');
    await newAdmin.populate('createdBy', 'name email');

    res.status(201).json(newAdmin);
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update admin
router.patch('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (role) {
      admin.role = role;
      await admin.save();
    }

    if (name || email) {
      const user = await User.findById(admin.userId);
      if (user) {
        if (name) user.name = name;
        if (email) user.email = email;
        await user.save();
      }
    }

    await admin.populate('userId', 'name email role lastLogin');
    await admin.populate('createdBy', 'name email');

    res.json(admin);
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete admin
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    await Admin.findByIdAndDelete(id);
    await User.findByIdAndDelete(admin.userId);

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update admin status
router.patch('/:id/status', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    admin.status = status;
    await admin.save();

    await admin.populate('userId', 'name email role lastLogin');
    await admin.populate('createdBy', 'name email');

    res.json(admin);
  } catch (error) {
    console.error('Update admin status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear all admins (utility)
router.delete('/clear-all', requireSuperAdmin, async (req, res) => {
  try {
    const admins = await Admin.find({});
    const userIds = admins.map(admin => admin.userId);

    await Admin.deleteMany({});
    await User.deleteMany({ _id: { $in: userIds }, role: 'admin' });

    res.json({ message: 'All admins cleared successfully' });
  } catch (error) {
    console.error('Clear all admins error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
