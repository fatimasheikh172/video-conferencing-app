require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
// const mongoSanitize = require('express-mongo-sanitize'); // Disabled - Express 5 compatibility issue
// const xss = require('xss-clean'); // Disabled - Express 5 compatibility issue
const morgan = require('morgan');
const connectDB = require('./src/config/database');
const { initializeSocket } = require('./src/config/socket');
const errorHandler = require('./src/middleware/errorHandler');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const logger = require('./src/config/logger');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const roomRoutes = require('./src/routes/roomRoutes');
const fileRoutes = require('./src/routes/fileRoutes');
const whiteboardRoutes = require('./src/routes/whiteboardRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const healthRoutes = require('./src/routes/healthRoutes');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Connect to database
connectDB();

// Initialize Socket.io
const io = initializeSocket(server);

// Make io accessible to routes
app.set('io', io);

// Initialize file cleanup cron jobs
const { scheduleFileCleanup, scheduleOrphanedFileCleanup } = require('./src/utils/fileCleanup');
scheduleFileCleanup(io);
scheduleOrphanedFileCleanup();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Sanitize data - prevent NoSQL injection
// TEMPORARILY DISABLED: Compatibility issue with Express/Node.js
// app.use(mongoSanitize());

// Prevent XSS attacks
// TEMPORARILY DISABLED: Compatibility issue with Express 5.x
// app.use(xss());

// HTTP request logging with Morgan and Winston
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/whiteboard', whiteboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', healthRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: 'OK',
    message: 'Backend is running'
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 VideoConnect Server Running                     ║
║                                                       ║
║   Port:        ${PORT}                                ║
║   Environment: ${process.env.NODE_ENV}                ║
║   Database:    ${process.env.MONGODB_URI ? 'Connected' : 'Not Connected'}                   ║
║                                                       ║
║   API:         http://localhost:${PORT}/api           ║
║   Health:      http://localhost:${PORT}/api/health    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  console.error('Error code:', error.code);
  console.error('Stack:', error.stack);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  console.error('Stack:', err.stack);
  // Don't exit immediately - log and continue
  // server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  // Don't exit immediately - log and continue
  // process.exit(1);
});

module.exports = server;


