const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { authenticateToken } = require('../middleware/auth');
const storageService = require('../services/storageService');
const { logDataChange } = require('../middleware/auditLog');
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

    // Log employee creation
    await logDataChange(
      req,
      'employee_created',
      'Employee',
      newEmployee._id,
      null,
      newEmployee.toObject(),
      {
        employeeId: newEmployee.employeeId,
        name: newEmployee.name,
        email: newEmployee.email,
        position: newEmployee.position,
        department: newEmployee.department
      }
    );

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

    // Get old employee data for change tracking
    const oldEmployee = employee.toObject();

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
    
    // Log employee update with change tracking
    const newEmployee = employee.toObject();
    await logDataChange(
      req,
      'employee_updated',
      'Employee',
      employee._id,
      oldEmployee,
      newEmployee,
      {
        employeeId: employee.employeeId,
        updatedFields: Object.keys(updateData),
        passwordChanged: !!passwordToUpdate
      }
    );
    
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
    const employee = await Employee.findById(id).lean();

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Log deletion before deleting
    await logDataChange(
      req,
      'employee_deleted',
      'Employee',
      employee._id,
      employee,
      null,
      {
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email
      }
    );

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

/**
 * POST /api/employees/:id/documents/:documentType
 * Upload a document for an employee
 * documentType: resume, offerLetter, employeeAgreement, nda, govtId, passport, addressProof, pan, taxId
 * Both admin and the employee themselves can upload documents
 */
router.post('/:id/documents/:documentType', authenticateToken, uploadDocument.single('file'), async (req, res) => {
  try {
    const { id, documentType } = req.params;
    const allowedTypes = ['resume', 'offerLetter', 'employeeAgreement', 'nda', 'govtId', 'passport', 'addressProof', 'pan', 'taxId'];
    
    if (!allowedTypes.includes(documentType)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check permissions: admin can upload for any employee, users can only upload for themselves
    if (req.user.role !== 'admin' && employee.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You can only upload documents for your own profile' });
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
        fileUrl
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
 * DELETE /api/employees/:id/documents/:documentType
 * Delete a document for an employee
 */
router.delete('/:id/documents/:documentType', authenticateToken, async (req, res) => {
  try {
    const { id, documentType } = req.params;
    const allowedTypes = ['resume', 'offerLetter', 'employeeAgreement', 'nda', 'govtId', 'passport', 'addressProof', 'pan', 'taxId'];
    
    if (!allowedTypes.includes(documentType)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check permissions: admin can delete for any employee, users can only delete for themselves
    if (req.user.role !== 'admin' && employee.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You can only delete documents from your own profile' });
    }

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

    // Log document deletion before deleting
    const oldDocumentUrl = employee.documents?.[documentType] || null;
    
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
        deletedFileUrl: oldDocumentUrl
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
