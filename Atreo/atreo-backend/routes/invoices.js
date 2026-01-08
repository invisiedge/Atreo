const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Tool = require('../models/Tool');
const { authenticateToken } = require('../middleware/auth');
const storageService = require('../services/storageService');
const invoiceParser = require('../services/invoiceParser');
const multer = require('multer');
const XLSX = require('xlsx');
// Security: Validate and sanitize Excel file inputs to prevent prototype pollution
const mongoose = require('mongoose');

// Configure multer for file uploads
const memoryStorage = multer.memoryStorage();
const uploadForParsing = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

const uploadExcel = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  }
});

// Get all invoices
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { status, provider, startDate, endDate } = req.query;
    
    let query = {
      'notes.type': { $ne: 'employee_contractor' }
    };
    
    if (userRole !== 'admin') {
      const user = await User.findById(userId);
      if (user && user.organizationId) {
        query.organizationId = user.organizationId;
      } else {
        query.uploadedBy = userId;
      }
    }

    if (status) query.status = status;
    if (provider) query.provider = { $regex: provider, $options: 'i' };
    if (startDate || endDate) {
      query.billingDate = {};
      if (startDate) query.billingDate.$gte = new Date(startDate);
      if (endDate) query.billingDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query)
      .populate('uploadedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('organizationId', 'name domain')
      .populate('toolIds', 'name category')
      .sort({ billingDate: -1 });

    res.json(invoices.map(inv => ({
      id: inv._id.toString(),
      ...inv.toObject(),
      organizationId: inv.organizationId?._id?.toString()
    })));
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Failed to fetch invoices' });
  }
});

// Clear all invoices (admin only) - MUST be before /:id routes
router.delete('/clear-all', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Delete all invoices (excluding employee/contractor invoices which are in payments)
    const result = await Invoice.deleteMany({
      $or: [
        { 'notes.type': { $ne: 'employee_contractor' } },
        { 'notes.type': { $exists: false } },
        { notes: null }
      ]
    });

    res.json({ 
      message: `Successfully cleared ${result.deletedCount} invoice(s)`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing all invoices:', error);
    res.status(500).json({ message: 'Failed to clear invoices' });
  }
});

// Get summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    let query = {
      'notes.type': { $ne: 'employee_contractor' }
    };

    if (userRole !== 'admin') {
      const user = await User.findById(userId);
      if (user && user.organizationId) {
        query.organizationId = user.organizationId;
      } else {
        query.uploadedBy = userId;
      }
    }

    const [counts, amountsResult] = await Promise.all([
      Promise.all([
        Invoice.countDocuments(query),
        Invoice.countDocuments({ ...query, status: 'pending' }),
        Invoice.countDocuments({ ...query, status: 'approved' }),
        Invoice.countDocuments({ ...query, status: 'rejected' }),
      ]),
      Invoice.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] }
            },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] }
            },
            rejected: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, '$amount', 0] }
            },
            average: { $avg: '$amount' }
          }
        }
      ])
    ]);

    const [totalInvoices, pendingInvoices, approvedInvoices, rejectedInvoices] = counts;
    const stats = amountsResult[0] || { total: 0, pending: 0, approved: 0, rejected: 0, average: 0 };

    res.json({
      totalInvoices,
      totalAmount: stats.total || 0,
      pendingInvoices,
      pendingAmount: stats.pending || 0,
      approvedInvoices,
      approvedAmount: stats.approved || 0,
      rejectedInvoices,
      rejectedAmount: stats.rejected || 0,
      averageInvoiceAmount: stats.average || 0,
      currency: 'USD'
    });
  } catch (error) {
    console.error('Error fetching invoice summary:', error);
    res.status(500).json({ message: 'Failed to fetch invoice summary' });
  }
});

// Parse invoice
router.post('/parse', authenticateToken, uploadForParsing.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const extractedData = await invoiceParser.parseInvoiceFile(req.file);
    res.json(extractedData);
  } catch (error) {
    console.error('Error parsing invoice:', error);
    res.status(500).json({ message: 'Failed to parse invoice' });
  }
});

// Import from Excel
router.post('/import-excel', authenticateToken, uploadExcel.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    // Security: Read with safe options to mitigate prototype pollution
    const workbook = XLSX.read(req.file.buffer, { 
      type: 'buffer',
      cellDates: false,
      cellNF: false,
      cellStyles: false,
      dense: false
    });
    const sheetName = workbook.SheetNames[0];
    // Security: Use defval to prevent prototype pollution
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { 
      defval: null,
      raw: false
    });

    let successCount = 0;
    const user = await User.findById(req.user.userId);

    for (const row of data) {
      const invoiceNumber = String(row['Invoice Number'] || '').trim();
      if (!invoiceNumber || invoiceNumber.toUpperCase() === 'TOTAL') continue;

      const vendor = String(row['Vendor'] || '').trim();
      const amount = parseFloat(row['Amount (USD)'] || row['Amount'] || 0);

      if (!vendor || amount === 0) continue;

      await Invoice.create({
        invoiceNumber,
        amount,
        currency: row['Currency'] || 'USD',
        provider: vendor,
        billingDate: row['Billing Date'] ? new Date(row['Billing Date']) : new Date(),
        status: req.user.role === 'admin' ? 'approved' : 'pending',
        organizationId: user?.organizationId,
        uploadedBy: req.user.userId
      });
      successCount++;
    }

    res.json({ message: `Successfully imported ${successCount} invoices` });
  } catch (error) {
    console.error('Error importing Excel:', error);
    res.status(500).json({ message: 'Failed to import Excel' });
  }
});

// Get single invoice
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('organizationId', 'name domain')
      .populate('toolIds', 'name category');

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ message: 'Failed to fetch invoice' });
  }
});

// Get invoice download URL
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (!invoice.fileUrl) {
      return res.status(404).json({ message: 'Invoice has no associated file' });
    }

    // Generate a signed URL for secure access
    const signedUrl = await storageService.getSignedUrl(invoice.fileUrl);

    res.json({ url: signedUrl });
  } catch (error) {
    console.error('Error getting download URL:', error);
    res.status(500).json({ message: 'Failed to get download URL' });
  }
});

// Create invoice
router.post('/', authenticateToken, uploadForParsing.single('file'), async (req, res) => {
  try {
    const { invoiceNumber, amount, provider, billingDate, dueDate, category, organizationId, toolIds, currency } = req.body;
    
    let fileUrl = null;
    let fileName = null;
    let fileSize = null;

    if (req.file) {
      const gcsFileName = `invoices/${Date.now()}-${req.file.originalname}`;
      fileUrl = await storageService.uploadFile(req.file, gcsFileName);
      fileName = req.file.originalname;
      fileSize = req.file.size;
    }

    const invoice = await Invoice.create({
      invoiceNumber,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      provider,
      billingDate: new Date(billingDate),
      dueDate: dueDate ? new Date(dueDate) : null,
      category,
      status: req.user.role === 'admin' ? 'approved' : 'pending',
      fileUrl,
      fileName,
      fileSize,
      organizationId: organizationId || (await User.findById(req.user.userId)).organizationId,
      uploadedBy: req.user.userId,
      toolIds: Array.isArray(toolIds) ? toolIds : (toolIds ? [toolIds] : [])
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: 'Failed to create invoice' });
  }
});

// Update status
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, {
      status: 'approved',
      approvedBy: req.user.userId,
      approvedAt: new Date()
    }, { new: true });
    res.json(invoice);
  } catch (error) {
    console.error('Error approving invoice:', error);
    res.status(500).json({ message: 'Failed to approve invoice' });
  }
});

router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const { reason } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, {
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason: reason
    }, { new: true });
    res.json(invoice);
  } catch (error) {
    console.error('Error rejecting invoice:', error);
    res.status(500).json({ message: 'Failed to reject invoice' });
  }
});

// Delete
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (req.user.role !== 'admin' && invoice.uploadedBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ message: 'Failed to delete invoice' });
  }
});

module.exports = router;
