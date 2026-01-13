// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Validate critical environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET is not set in environment variables');
  console.error('⚠️  Authentication will fail. Please set JWT_SECRET in your .env file');
}

const connectDB = require('./config/database');
const { authenticateToken } = require('./middleware/auth');
const { globalLimiter } = require('./middleware/rateLimiter');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - important for Railway/Vercel deployments behind proxies
app.set('trust proxy', 1);

// Connect to MongoDB (non-blocking)
connectDB().catch(err => {
  console.error('Failed to connect to database:', err.message);
});

// Middleware - Configure helmet to not interfere with CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, '');
    const normalizedAllowed = allowedOrigins.map(url => url.replace(/\/$/, ''));
    if (normalizedAllowed.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' })); // Limit payload size to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply global rate limiting to all requests
app.use(globalLimiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


// Mount route modules using central router
app.use('/api/auth', routes.auth);
app.use('/api/auth', routes.otp); // OTP routes share the /api/auth prefix
app.use('/api/users', authenticateToken, routes.users);
app.use('/api/employees', authenticateToken, routes.employees);
app.use('/api/admins', authenticateToken, routes.admins);
app.use('/api/submissions', authenticateToken, routes.submissions);
app.use('/api/dashboard', authenticateToken, routes.dashboard);
app.use('/api/tools', authenticateToken, routes.tools);
app.use('/api/invoices', authenticateToken, routes.invoices);
app.use('/api/organizations', authenticateToken, routes.organizations);
app.use('/api/assets', authenticateToken, routes.assets);
app.use('/api/ai', authenticateToken, routes.ai);
app.use('/api/permissions', authenticateToken, routes.permissions);
app.use('/api/credentials', authenticateToken, routes.credentials);
app.use('/api/logs', authenticateToken, routes.logs);
app.use('/api/messages', authenticateToken, routes.messages);
app.use('/api/customers', authenticateToken, routes.customers);
app.use('/api/payments', routes.payments);

// Error handling middleware
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err.message);
  }
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});
