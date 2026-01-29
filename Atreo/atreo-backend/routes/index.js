/**
 * Central Router
 * Combines all route modules and exports them for use in server.js
 */

const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth');
const otpRoutes = require('./otp');
const userRoutes = require('./users');
const employeeRoutes = require('./employees');
const adminRoutes = require('./admin');
const submissionRoutes = require('./submissions');
const dashboardRoutes = require('./dashboard');
const toolRoutes = require('./tools');
const invoiceRoutes = require('./invoices');
const organizationRoutes = require('./organizations');
const assetRoutes = require('./assets');
const customerRoutes = require('./customers');
const emailRoutes = require('./emails');
const aiRoutes = require('./ai');
const permissionRoutes = require('./permissions');
const credentialRoutes = require('./credentials');
const logRoutes = require('./logs');
const messageRoutes = require('./messages');
const paymentRoutes = require('./payments');

module.exports = {
  auth: authRoutes,
  otp: otpRoutes,
  users: userRoutes,
  employees: employeeRoutes,
  admins: adminRoutes,
  submissions: submissionRoutes,
  dashboard: dashboardRoutes,
  tools: toolRoutes,
  invoices: invoiceRoutes,
  organizations: organizationRoutes,
  assets: assetRoutes,
  ai: aiRoutes,
  permissions: permissionRoutes,
  credentials: credentialRoutes,
  logs: logRoutes,
  messages: messageRoutes,
  customers: customerRoutes,
  payments: paymentRoutes,
  emails: emailRoutes
};
