/**
 * Rate Limiting Middleware
 * Implements OWASP best practices for API rate limiting
 *
 * Protection against:
 * - Brute force attacks
 * - DoS/DDoS attacks
 * - API abuse
 */

const rateLimit = require('express-rate-limit');

// Check if running in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Global rate limiter for all API endpoints
 * Development: 1000 requests per 15 minutes
 * Production: 100 requests per 15 minutes per IP
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // More lenient in development
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  },
  // Skip successful requests that don't consume resources
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Strict rate limiter for authentication endpoints
 * Development: 100 requests per 15 minutes (for testing)
 * Production: 5 requests per 15 minutes per IP (strict security)
 * Applied to: /api/auth/login, /api/auth/signup
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 5, // Much more lenient in development for testing
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Too many authentication attempts from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Moderate rate limiter for data modification endpoints
 * Development: 300 requests per 15 minutes
 * Production: 30 requests per 15 minutes per IP
 * Applied to: POST, PUT, PATCH, DELETE endpoints
 */
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 300 : 30, // More lenient in development
  message: {
    error: 'Too many write requests',
    message: 'Too many modification requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many write requests',
      message: 'Too many modification requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Lenient rate limiter for read-only endpoints
 * Development: 2000 requests per 15 minutes
 * Production: 200 requests per 15 minutes per IP
 * Applied to: GET endpoints
 */
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 2000 : 200, // More lenient in development
  message: {
    error: 'Too many read requests',
    message: 'Too many read requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many read requests',
      message: 'Too many read requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  },
  skipSuccessfulRequests: true, // Don't count successful GET requests as heavily
  skipFailedRequests: false,
});

/**
 * File upload rate limiter
 * Development: 100 uploads per 15 minutes
 * Production: 10 uploads per 15 minutes per IP
 * Applied to: File upload endpoints
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 10, // More lenient in development
  message: {
    error: 'Too many upload requests',
    message: 'Too many file uploads from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many upload requests',
      message: 'Too many file uploads from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

module.exports = {
  globalLimiter,
  authLimiter,
  writeLimiter,
  readLimiter,
  uploadLimiter
};
