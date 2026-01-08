const express = require('express');
const router = express.Router();
const Tool = require('../models/Tool');
const Submission = require('../models/Submission');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Asset = require('../models/Asset');
const Domain = require('../models/Domain');
const Organization = require('../models/Organization');

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const timeFrame = req.query.timeFrame || '6months';
    const now = new Date();
    let startDate = new Date();

    switch (timeFrame) {
      case '1month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 6);
    }

    // Ensure startDate is at the beginning of the month
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalEmployees,
      totalTools,
      activeTools,
      inactiveTools,
      totalInvoices,
      pendingSubmissions,
      approvedSubmissions,
      totalPaid,
      paidTools,
      categoryData,
      invoiceStatusData,
      monthlySpendDataRaw,
      monthlyToolsDataRaw,
      monthlyInvoiceTrendsRaw,
      employeeSpendingByMonthRaw,
      topToolsData,
      roleDistributionData,
      hoursUtilizationDataRaw,
      toolStatusData,
      billingPeriodData,
      totalAssets,
      activeAssets,
      assetsByType,
      totalDomains,
      activeDomains,
      domainsByStatus,
      spendByOrganization,
      monthlyPaymentsDataRaw
    ] = await Promise.all([
      User.countDocuments(),
      Employee.countDocuments({ status: 'active' }),
      Tool.countDocuments(),
      Tool.countDocuments({ status: 'active' }),
      Tool.countDocuments({ status: 'inactive' }),
      Invoice.countDocuments({ 
        $or: [
          { 'notes.type': { $ne: 'employee_contractor' } },
          { 'notes.type': { $exists: false } },
          { notes: null }
        ]
      }),
      Submission.countDocuments({ status: 'pending' }),
      Submission.countDocuments({ status: 'approved' }),
      Invoice.aggregate([
        { 
          $match: { 
            status: 'approved',
            $or: [
              { 'notes.type': { $ne: 'employee_contractor' } },
              { 'notes.type': { $exists: false } },
              { notes: null }
            ]
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Tool.countDocuments({ isPaid: true, status: 'active' }),
      // Category distribution
      Tool.aggregate([
        { $group: { _id: '$category', value: { $sum: 1 } } },
        { $project: { name: { $ifNull: ['$_id', 'Uncategorized'] }, value: 1, _id: 0 } }
      ]),
      // Invoice status distribution (exclude employee/contractor invoices)
      Invoice.aggregate([
        { 
          $match: { 
            $or: [
              { 'notes.type': { $ne: 'employee_contractor' } },
              { 'notes.type': { $exists: false } },
              { notes: null }
            ]
          } 
        },
        { $group: { _id: '$status', value: { $sum: 1 } } },
        { $project: { name: '$_id', value: 1, _id: 0 } }
      ]),
      // Monthly spend from approved invoices (exclude employee/contractor invoices)
      Invoice.aggregate([
        { 
          $match: { 
            status: 'approved',
            billingDate: { $gte: startDate },
            $or: [
              { 'notes.type': { $ne: 'employee_contractor' } },
              { 'notes.type': { $exists: false } },
              { notes: null }
            ]
          } 
        },
        {
          $group: {
            _id: {
              year: { $year: '$billingDate' },
              month: { $month: '$billingDate' }
            },
            spend: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      // Monthly tools added
      Tool.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            tools: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      // Monthly invoice trends (exclude employee/contractor invoices)
      Invoice.aggregate([
        { 
          $match: { 
            billingDate: { $gte: startDate },
            $or: [
              { 'notes.type': { $ne: 'employee_contractor' } },
              { 'notes.type': { $exists: false } },
              { notes: null }
            ]
          } 
        },
        {
          $group: {
            _id: {
              year: { $year: '$billingDate' },
              month: { $month: '$billingDate' }
            },
            invoices: { $sum: 1 },
            amount: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      // Current monthly payroll capacity
      Employee.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            totalSalary: { $sum: { $ifNull: ['$salary', 0] } }
          }
        }
      ]),
      // Top tools by spend
      Tool.find({ isPaid: true, status: 'active' })
        .sort({ price: -1 })
        .limit(10)
        .select('name price billingPeriod'),
        // Role distribution (Spend by Role from Invoices)
        Invoice.aggregate([
          { 
            $match: { 
              'notes.type': 'employee_contractor',
              billingDate: { $gte: startDate }
            } 
          },
          { $group: { _id: '$notes.role', value: { $sum: '$amount' } } },
          { $project: { name: { $ifNull: ['$_id', 'Other'] }, value: 1, _id: 0 } },
          { $sort: { value: -1 } }
        ]),
        // Hours utilization (Contract vs Fulfilled from Invoices)
        Invoice.aggregate([
          { 
            $match: { 
              'notes.type': 'employee_contractor',
              billingDate: { $gte: startDate }
            } 
          },
          {
            $group: {
              _id: '$notes.month',
              contractHours: { $avg: '$notes.contractHours' },
              fulfilledHours: { $avg: '$notes.fulfilledHours' },
              sortDate: { $first: '$billingDate' }
            }
          },
          { $sort: { sortDate: 1 } }
        ]),
        // Tool status distribution
        Tool.aggregate([
          { $group: { _id: '$status', value: { $sum: 1 } } },
          { $project: { name: '$_id', value: 1, _id: 0 } }
        ]),
        // Billing period distribution
        Tool.aggregate([
          { $match: { isPaid: true } },
          { $group: { _id: '$billingPeriod', value: { $sum: 1 } } },
          { $project: { name: '$_id', value: 1, _id: 0 } }
        ]),
        // Asset Stats
        Asset.countDocuments(),
        Asset.countDocuments({ isActive: true }),
        Asset.aggregate([
          { $group: { _id: '$type', value: { $sum: 1 } } },
          { $project: { name: '$_id', value: 1, _id: 0 } }
        ]),
        // Domain Stats
        Domain.countDocuments(),
        Domain.countDocuments({ status: 'active' }),
        Domain.aggregate([
          { $group: { _id: '$status', value: { $sum: 1 } } },
          { $project: { name: '$_id', value: 1, _id: 0 } }
        ]),
        // Spend by Organization (exclude employee/contractor invoices)
        Invoice.aggregate([
          { 
            $match: { 
              status: 'approved',
              billingDate: { $gte: startDate },
              $or: [
                { 'notes.type': { $ne: 'employee_contractor' } },
                { 'notes.type': { $exists: false } },
                { notes: null }
              ]
            } 
          },
          {
            $lookup: {
              from: 'organizations',
              localField: 'organizationId',
              foreignField: '_id',
              as: 'org'
            }
          },
          { $unwind: { path: '$org', preserveNullAndEmptyArrays: true } },
          { $group: { _id: '$org.name', value: { $sum: '$amount' } } },
          { $project: { name: { $ifNull: ['$_id', 'Internal'] }, value: 1, _id: 0 } },
          { $sort: { value: -1 } }
        ]),
        // Monthly Payments (Historical Payroll Spend from Invoices)
        Invoice.aggregate([
          { 
            $match: { 
              'notes.type': 'employee_contractor',
              billingDate: { $gte: startDate }
            } 
          },
          {
            $group: {
              _id: '$notes.month',
              amount: { $sum: '$amount' },
              sortDate: { $first: '$billingDate' }
            }
          },
          { $sort: { sortDate: 1 } }
        ])
      ]);


    // Helper to generate months array for the timeframe
    const generateMonthsArray = (start, end) => {
      const months = [];
      const current = new Date(start);
      while (current <= end) {
        months.push({
          year: current.getFullYear(),
          month: current.getMonth() + 1,
          label: current.toLocaleString('default', { month: 'short' }),
          fullLabel: current.toLocaleString('default', { month: 'long', year: 'numeric' })
        });
        current.setMonth(current.getMonth() + 1);
      }
      return months;
    };

    const months = generateMonthsArray(startDate, now);

    // Format monthly data
    const formatMonthlyData = (raw, months, key, defaultValue = 0) => {
      return months.map(m => {
        const found = raw.find(r => r._id.year === m.year && r._id.month === m.month);
        return {
          month: m.label,
          [key]: found ? found[key] : defaultValue
        };
      });
    };

    const monthlySpendData = formatMonthlyData(monthlySpendDataRaw, months, 'spend');
    const monthlyToolsData = formatMonthlyData(monthlyToolsDataRaw, months, 'tools');
    
    const monthlyInvoiceTrends = months.map(m => {
      const found = monthlyInvoiceTrendsRaw.find(r => r._id.year === m.year && r._id.month === m.month);
      return {
        month: m.label,
        invoices: found ? found.invoices : 0,
        amount: found ? found.amount : 0
      };
    });

    // Format hours utilization data
    const hoursUtilizationData = months.map(m => {
      const found = hoursUtilizationDataRaw.find(r => r._id === m.fullLabel);
      return {
        month: m.label,
        contractHours: found ? Math.round(found.contractHours) : 0,
        fulfilledHours: found ? Math.round(found.fulfilledHours) : 0
      };
    });

    // Employee spending - use actual historical payments where possible, fallback to current capacity
    const currentMonthlySalary = employeeSpendingByMonthRaw.length > 0 ? employeeSpendingByMonthRaw[0].totalSalary : 0;
    const employeeSpendingByMonth = months.map(m => {
      const foundPayment = monthlyPaymentsDataRaw.find(p => p._id === m.fullLabel);
      return {
        month: m.label,
        amount: foundPayment ? foundPayment.amount : (m.year === now.getFullYear() && m.month === now.getMonth() + 1 ? currentMonthlySalary : 0)
      };
    });

    // Calculate total monthly burn for tools
    const allPaidTools = await Tool.find({ isPaid: true, status: 'active' });
    let totalMonthlySpend = 0;
    allPaidTools.forEach(tool => {
      if (tool.billingPeriod === 'yearly') {
        totalMonthlySpend += tool.price / 12;
      } else {
        totalMonthlySpend += tool.price;
      }
    });

    const stats = {
      totalUsers,
      totalEmployees,
      totalTools,
      activeTools,
      inactiveTools,
      totalInvoices,
      paidTools,
      monthlyToolsSpend: totalMonthlySpend,
      pendingSubmissions,
      approvedSubmissions,
      totalPaid: totalPaid.length > 0 ? totalPaid[0].total : 0,
      totalPayments: monthlyPaymentsDataRaw.reduce((sum, p) => sum + p.amount, 0),
      monthlySpendData,
      categoryData,
      monthlyToolsData,
      topToolsData: topToolsData.map(t => ({
        name: t.name,
        monthlySpend: t.billingPeriod === 'yearly' ? t.price / 12 : t.price
      })),
      invoiceStatusData,
      monthlyInvoiceTrends,
      employeeSpendingByMonth,
      roleDistributionData,
      hoursUtilizationData,
      toolStatusData,
      billingPeriodData,
      totalAssets,
      activeAssets,
      assetsByType,
      totalDomains,
      activeDomains,
      domainsByStatus,
      spendByOrganization
    };

    res.json(stats);
  } catch (error) {
    console.error('Get admin dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user dashboard stats
router.get('/user-stats', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [
      totalEarnings,
      pendingRequests,
      approvedRequests
    ] = await Promise.all([
      Submission.aggregate([
        { $match: { userId: user._id, status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Submission.countDocuments({ userId: user._id, status: 'pending' }),
      Submission.countDocuments({ userId: user._id, status: 'approved' })
    ]);

    const stats = {
      totalEarnings: totalEarnings.length > 0 ? totalEarnings[0].total : 0,
      pendingRequests,
      approvedRequests
    };

    res.json(stats);
  } catch (error) {
    console.error('Get user dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
