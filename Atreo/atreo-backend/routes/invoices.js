const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Tool = require('../models/Tool');
const { authenticateToken } = require('../middleware/auth');
const storageService = require('../services/storageService');
const invoiceParser = require('../services/invoiceParser');
const { logDataChange } = require('../middleware/auditLog');
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
    
    // Accountants and admins can see all invoices
    if (userRole !== 'admin' && userRole !== 'accountant') {
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

    // Accountants and admins can see all invoices
    if (userRole !== 'admin' && userRole !== 'accountant') {
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
    // Only admin can import invoices
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required to import invoices' });
    }
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

// Get invoice download URL - MUST be before /:id route
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

// Create invoice
router.post('/', authenticateToken, uploadForParsing.single('file'), async (req, res) => {
  try {
    // Users can create invoices for their own tools/credentials, admins can create for anyone
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

    // Log invoice creation
    await logDataChange(
      req,
      'invoice_created',
      'Invoice',
      invoice._id,
      null,
      invoice.toObject(),
      {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        provider: invoice.provider,
        status: invoice.status
      }
    );

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: 'Failed to create invoice' });
  }
});

// Update invoice - MUST be before GET /:id routes to ensure proper route matching
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { invoiceNumber, amount, provider, billingDate, dueDate, category, organizationId, toolIds, currency, status } = req.body;
    
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Get old invoice data for change tracking
    const oldInvoice = invoice.toObject();

    // Check permissions - only admin can update invoices, accountants have read-only access
    if (req.user.role === 'accountant') {
      return res.status(403).json({ message: 'Accountants have read-only access to invoices' });
    }
    if (req.user.role !== 'admin' && invoice.uploadedBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Build update object
    const updateData = {};
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (currency !== undefined) updateData.currency = currency;
    if (provider !== undefined) updateData.provider = provider;
    if (billingDate !== undefined) updateData.billingDate = new Date(billingDate);
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (category !== undefined) updateData.category = category;
    if (organizationId !== undefined) updateData.organizationId = organizationId;
    if (toolIds !== undefined) {
      updateData.toolIds = Array.isArray(toolIds) ? toolIds : (toolIds ? [toolIds] : []);
    }
    
    // Only admins can update status
    if (status !== undefined && req.user.role === 'admin') {
      updateData.status = status;
      if (status === 'approved') {
        updateData.approvedBy = req.user.userId;
        updateData.approvedAt = new Date();
      }
      if (status === 'rejected') {
        updateData.rejectedAt = new Date();
      }
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('uploadedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('organizationId', 'name domain')
      .populate('toolIds', 'name category')
      .lean();

    // Determine action type based on status change
    let actionType = 'invoice_updated';
    if (status === 'approved' && oldInvoice.status !== 'approved') {
      actionType = 'invoice_approved';
    } else if (status === 'rejected' && oldInvoice.status !== 'rejected') {
      actionType = 'invoice_rejected';
    }

    // Log invoice update with change tracking
    await logDataChange(
      req,
      actionType,
      'Invoice',
      updatedInvoice._id,
      oldInvoice,
      updatedInvoice,
      {
        invoiceNumber: updatedInvoice.invoiceNumber,
        amount: updatedInvoice.amount,
        status: updatedInvoice.status,
        updatedFields: Object.keys(updateData)
      }
    );

    res.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ message: 'Failed to update invoice' });
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
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    // Accountants cannot delete invoices
    if (req.user.role === 'accountant') {
      return res.status(403).json({ message: 'Accountants have read-only access to invoices' });
    }
    if (req.user.role !== 'admin' && invoice.uploadedBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Log deletion before deleting
    await logDataChange(
      req,
      'invoice_deleted',
      'Invoice',
      invoice._id,
      invoice,
      null,
      {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        provider: invoice.provider,
        status: invoice.status
      }
    );
    
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ message: 'Failed to delete invoice' });
  }
});

module.exports = router;
