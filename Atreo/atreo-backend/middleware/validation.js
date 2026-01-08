/**
 * Input Validation Middleware
 * Provides request validation for API endpoints
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid input data',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Auth validation rules
 */
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

const validateSignup = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin'),
  handleValidationErrors
];

/**
 * User validation rules
 */
const validateUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
    body('phone')
      .optional()
      .trim(),
    body('address')
      .optional()
      .trim(),
    body('bankName')
      .optional()
      .trim(),
    body('accountNumber')
      .optional()
      .trim(),
    body('swiftCode')
      .optional()
      .trim(),
    body('position')
      .optional()
      .trim(),
    handleValidationErrors
  ];

/**
 * Employee validation rules
 */
const validateEmployee = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('position')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Position must be between 2 and 100 characters'),
  body('department')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Department must be between 2 and 50 characters'),
  body('salary')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Salary must be a positive number'),
  body('hireDate')
    .isISO8601()
    .withMessage('Valid hire date is required'),
  handleValidationErrors
];

/**
 * Organization validation rules
 */
const validateOrganization = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name must be between 2 and 100 characters'),
  body('industry')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Industry must be less than 50 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Valid website URL is required'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  handleValidationErrors
];

/**
 * Invoice validation rules
 */
const validateInvoice = [
  body('invoiceNumber')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Invoice number is required and must be less than 50 characters'),
  body('amount')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('dueDate')
    .isISO8601()
    .withMessage('Valid due date is required'),
  body('status')
    .isIn(['pending', 'paid', 'overdue', 'cancelled'])
    .withMessage('Status must be pending, paid, overdue, or cancelled'),
  handleValidationErrors
];

/**
 * ID parameter validation
 */
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Valid ID is required'),
  handleValidationErrors
];

/**
 * Pagination validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

module.exports = {
  validateLogin,
  validateSignup,
  validateUserUpdate,
  validateEmployee,
  validateOrganization,
  validateInvoice,
  validateObjectId,
  validatePagination,
  handleValidationErrors
};