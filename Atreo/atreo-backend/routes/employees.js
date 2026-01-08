const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { authenticateToken } = require('../middleware/auth');

// Get all employees
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const employees = await Employee.find({ status: 'active' })
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });

    res.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new employee
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const {
      name, email, password, position, department, employeeId, dateOfJoined,
      profilePhoto, employmentType, workLocation,
      personalEmail, workEmail, personalPhone, whatsappNumber,
      emergencyContact, documents,
      employmentStatus, confirmationDate, lastWorkingDate,
      salary, salaryType, paymentCurrency, payrollCycle, bankDetails,
      lastSalaryPaidDate, bonus, incentives, deductions,
      roleDescription, coreResponsibilities, keyKPIs, weeklyDeliverables,
      monthlyGoals, clientAccountsAssigned, toolsUsed, aiToolsAuthorized
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !position || !department || !employeeId) {
      return res.status(400).json({
        message: 'Missing required fields. Please provide: name, email, password, position, department, and employeeId.'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Check if employee ID already exists
    const existingEmployee = await Employee.findOne({ employeeId });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Employee ID already exists' });
    }

    // Create user
    const newUser = new User({
      email,
      password,
      name,
      role: 'user',
      employeeId
    });

    await newUser.save();

    // Create employee record with all fields
    const joinDate = dateOfJoined ? new Date(dateOfJoined) : new Date();
    const confirmDate = confirmationDate ? new Date(confirmationDate) : null;
    const lastWorkDate = lastWorkingDate ? new Date(lastWorkingDate) : null;
    const lastSalaryDate = lastSalaryPaidDate ? new Date(lastSalaryPaidDate) : null;

    const newEmployee = new Employee({
      userId: newUser._id,
      employeeId,
      name,
      email,
      position,
      department,
      dateOfJoined: joinDate,
      hireDate: joinDate,
      profilePhoto,
      employmentType,
      workLocation,
      personalEmail,
      workEmail,
      personalPhone,
      whatsappNumber,
      emergencyContact: emergencyContact || {},
      documents: documents || {},
      employmentStatus,
      confirmationDate: confirmDate,
      lastWorkingDate: lastWorkDate,
      salary,
      salaryType,
      paymentCurrency,
      payrollCycle,
      bankDetails: bankDetails || {},
      lastSalaryPaidDate: lastSalaryDate,
      bonus,
      incentives,
      deductions,
      roleDescription,
      coreResponsibilities: Array.isArray(coreResponsibilities) ? coreResponsibilities : [],
      keyKPIs: Array.isArray(keyKPIs) ? keyKPIs : [],
      weeklyDeliverables: Array.isArray(weeklyDeliverables) ? weeklyDeliverables : [],
      monthlyGoals: Array.isArray(monthlyGoals) ? monthlyGoals : [],
      clientAccountsAssigned: Array.isArray(clientAccountsAssigned) ? clientAccountsAssigned : [],
      toolsUsed: Array.isArray(toolsUsed) ? toolsUsed : [],
      aiToolsAuthorized: Array.isArray(aiToolsAuthorized) ? aiToolsAuthorized : []
    });

    await newEmployee.save();
    await newEmployee.populate('userId', 'name email role');

    res.status(201).json(newEmployee);
  } catch (error) {
    console.error('Create employee error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Update employee
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    // Check if password reset is requested - only super-admin can do this
    let passwordToUpdate = null;
    if (updateData.password) {
      const admin = await Admin.findOne({ userId: req.user.userId });
      if (!admin || admin.role !== 'super-admin') {
        delete updateData.password;
      } else {
        passwordToUpdate = updateData.password;
        delete updateData.password;
      }
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Handle date fields
    if (updateData.dateOfJoined) {
      updateData.hireDate = new Date(updateData.dateOfJoined);
    }
    if (updateData.confirmationDate) {
      updateData.confirmationDate = new Date(updateData.confirmationDate);
    }
    if (updateData.lastWorkingDate) {
      updateData.lastWorkingDate = new Date(updateData.lastWorkingDate);
    }
    if (updateData.lastSalaryPaidDate) {
      updateData.lastSalaryPaidDate = new Date(updateData.lastSalaryPaidDate);
    }

    // Handle array fields
    const arrayFields = ['coreResponsibilities', 'keyKPIs', 'weeklyDeliverables', 'monthlyGoals', 'clientAccountsAssigned', 'toolsUsed', 'aiToolsAuthorized'];
    arrayFields.forEach(field => {
      if (updateData[field] && typeof updateData[field] === 'string') {
        updateData[field] = updateData[field].split('\n').filter(s => s.trim());
      }
    });

    Object.assign(employee, updateData);
    await employee.save();

    // Update user record if needed
    if (updateData.name || updateData.email || passwordToUpdate) {
      const user = await User.findById(employee.userId);
      if (user) {
        if (updateData.name) user.name = updateData.name;
        if (updateData.email) user.email = updateData.email;
        if (passwordToUpdate) {
          user.password = passwordToUpdate;
          user.markModified('password');
        }
        await user.save();
      }
    }

    await employee.populate('userId', 'name email role');
    res.json(employee);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete employee
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await Employee.findByIdAndDelete(id);
    await User.findByIdAndDelete(employee.userId);

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear all employees (admin utility)
router.delete('/clear-all', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const employees = await Employee.find({});
    const userIds = employees.map(emp => emp.userId);

    await Employee.deleteMany({});
    await User.deleteMany({ _id: { $in: userIds } });

    res.json({ message: 'All employees cleared successfully' });
  } catch (error) {
    console.error('Clear all employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Migrate dates (utility route)
router.post('/migrate-dates', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const employees = await Employee.find({ hireDate: { $exists: false } });
    let updatedCount = 0;

    for (const employee of employees) {
      if (employee.dateOfJoined && !employee.hireDate) {
        employee.hireDate = employee.dateOfJoined;
        await employee.save();
        updatedCount++;
      }
    }

    res.json({
      message: `Migration completed. Updated ${updatedCount} employees with dateOfJoined field.`,
      updatedCount
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
