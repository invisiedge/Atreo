/**
 * Customers Routes
 * Handles customer management operations
 */

const express = require('express');
const mongoose = require('mongoose');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { requireModuleAccess } = require('../middleware/permissions');
const { createAuditLog } = require('../middleware/auditLog');

const router = express.Router();

// Customer Schema (inline for now, can be moved to models later)
const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    maxlength: 20
  },
  company: {
    type: String,
    maxlength: 100
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'prospect', 'churned'],
    default: 'active'
  },
  customerType: {
    type: String,
    enum: ['individual', 'business', 'enterprise'],
    default: 'individual'
  },
  tags: [String],
  notes: String,
  totalRevenue: {
    type: Number,
    default: 0
  },
  lastContactDate: Date,
  acquisitionDate: {
    type: Date,
    default: Date.now
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

customerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

/**
 * GET /api/customers
 * Get all customers with pagination and filtering
 */
router.get('/', validatePagination, requireModuleAccess('customers'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    
    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Filter by customer type
    if (req.query.customerType) {
      filter.customerType = req.query.customerType;
    }
    
    // Search by name or email
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { company: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Filter by assigned user
    if (req.query.assignedTo) {
      filter.assignedTo = req.query.assignedTo;
    }
    
    const customers = await Customer.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Customer.countDocuments(filter);
    
    res.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Server error fetching customers' });
  }
});

/**
 * GET /api/customers/:id
 * Get specific customer
 */
router.get('/:id', validateObjectId, requireModuleAccess('customers'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    res.json({ customer });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ message: 'Server error fetching customer' });
  }
});

/**
 * POST /api/customers
 * Create new customer
 */
router.post('/', requireModuleAccess('customers'), async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const {
      name,
      phone,
      company,
      address,
      status = 'active',
      customerType = 'individual',
      tags,
      notes,
      assignedTo
    } = req.body;
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ 
        message: 'Name and email are required' 
      });
    }
    
    // Check if customer with email already exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ 
        message: 'Customer with this email already exists' 
      });
    }
    
    // Validate assigned user if provided
    if (assignedTo) {
      const User = require('../models/User');
      const assignedUser = await User.findById(assignedTo);
      if (!assignedUser) {
        return res.status(400).json({ message: 'Assigned user not found' });
      }
    }
    
    const customer = new Customer({
      name,
      email,
      phone,
      company,
      address,
      status,
      customerType,
      tags: tags || [],
      notes,
      assignedTo,
      createdBy: req.user.userId
    });
    
    await customer.save();
    
    // Populate for response
    await customer.populate('assignedTo', 'name email');
    await customer.populate('createdBy', 'name email');
    
    // Log customer creation
    await createAuditLog({
      userId: req.user.userId,
      action: 'customer_created',
      resource: 'Customer',
      resourceId: customer._id,
      details: { name, email, company }
    });
    
    res.status(201).json({
      message: 'Customer created successfully',
      customer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ message: 'Server error creating customer' });
  }
});

/**
 * PUT /api/customers/:id
 * Update customer
 */
router.put('/:id', validateObjectId, requireModuleAccess('customers'), async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      address,
      status,
      customerType,
      tags,
      notes,
      assignedTo,
      totalRevenue,
      lastContactDate
    } = req.body;
    
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    // Check if email is being changed and if it's already taken
    if (email && email !== customer.email) {
      const existingCustomer = await Customer.findOne({ 
        email, 
        _id: { $ne: req.params.id } 
      });
      if (existingCustomer) {
        return res.status(400).json({ 
          message: 'Email already in use by another customer' 
        });
      }
    }
    
    // Validate assigned user if provided
    if (assignedTo) {
      const User = require('../models/User');
      const assignedUser = await User.findById(assignedTo);
      if (!assignedUser) {
        return res.status(400).json({ message: 'Assigned user not found' });
      }
    }
    
    // Update customer
    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(company !== undefined && { company }),
        ...(address && { address }),
        ...(status && { status }),
        ...(customerType && { customerType }),
        ...(tags && { tags }),
        ...(notes !== undefined && { notes }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(totalRevenue !== undefined && { totalRevenue }),
        ...(lastContactDate && { lastContactDate })
      },
      { new: true, runValidators: true }
    )
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');
    
    // Log customer update
    await createAuditLog({
      userId: req.user.userId,
      action: 'customer_updated',
      resource: 'Customer',
      resourceId: customer._id,
      details: { 
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        updatedFields: Object.keys(req.body)
      }
    });
    
    res.json({
      message: 'Customer updated successfully',
      customer: updatedCustomer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ message: 'Server error updating customer' });
  }
});

/**
 * DELETE /api/customers/:id
 * Delete customer
 */
router.delete('/:id', validateObjectId, requireModuleAccess('customers'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    await Customer.findByIdAndDelete(req.params.id);
    
    // Log customer deletion
    await createAuditLog({
      userId: req.user.userId,
      action: 'customer_deleted',
      resource: 'Customer',
      resourceId: customer._id,
      details: { 
        name: customer.name,
        email: customer.email
      }
    });
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: 'Server error deleting customer' });
  }
});

/**
 * GET /api/customers/stats/summary
 * Get customer statistics
 */
router.get('/stats/summary', requireModuleAccess('customers'), async (req, res) => {
  try {
    const [
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      prospects,
      churned,
      statusStats,
      typeStats,
      revenueStats
    ] = await Promise.all([
      Customer.countDocuments({}),
      Customer.countDocuments({ status: 'active' }),
      Customer.countDocuments({ status: 'inactive' }),
      Customer.countDocuments({ status: 'prospect' }),
      Customer.countDocuments({ status: 'churned' }),
      Customer.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Customer.aggregate([
        { $group: { _id: '$customerType', count: { $sum: 1 } } }
      ]),
      Customer.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalRevenue' },
            averageRevenue: { $avg: '$totalRevenue' }
          }
        }
      ])
    ]);
    
    res.json({
      summary: {
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        prospects,
        churned
      },
      statusBreakdown: statusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      typeBreakdown: typeStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      revenue: {
        total: revenueStats[0]?.totalRevenue || 0,
        average: revenueStats[0]?.averageRevenue || 0
      }
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({ message: 'Server error fetching customer statistics' });
  }
});

module.exports = router;