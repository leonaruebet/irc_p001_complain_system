/**
 * Express Application Setup
 * Main application file for the IRC Complaint System backend
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');

// Initialize Express app
const app = express();

console.log('🚀 Initializing IRC Complaint System Backend');

// Validate configuration on startup
if (!config.validateConfig()) {
  console.error('❌ Configuration validation failed. Exiting...');
  process.exit(1);
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));

// Logging middleware
app.use(morgan('combined'));

// Raw body middleware for LINE webhook signature validation (must be before express.json)
app.use('/api/line/webhook', express.raw({ type: 'application/json' }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
const lineRoutes = require('./routes/line_routes');

// API Routes
app.use('/api/line', lineRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'IRC Complaint System Backend',
    timestamp: new Date().toISOString(),
    environment: config.app.nodeEnv,
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'IRC Complaint System Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      line_webhook: '/api/line/webhook',
      line_push: '/api/line/push',
      line_profile: '/api/line/profile/:userId',
      line_health: '/api/line/health'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: config.app.nodeEnv === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;