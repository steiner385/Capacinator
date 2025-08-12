import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, testConnection, backupDatabase } from './database/index.js';
import { initializeE2EDatabase } from './database/init-e2e.js';
import cron from 'node-cron';
import apiRoutes from './api/routes/index.js';
import { notificationScheduler } from './services/NotificationScheduler.js';

// Load environment variables
let envFile = '.env';
if (process.env.NODE_ENV === 'development') {
  envFile = '.env.development';
} else if (process.env.NODE_ENV === 'test') {
  envFile = '.env.test';
} else if (process.env.NODE_ENV === 'e2e') {
  envFile = '.env.e2e';
}
config({ path: envFile });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8081;
const isDev = process.env.NODE_ENV === 'development';
const isE2E = process.env.NODE_ENV === 'e2e';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// CORS configuration
// Force HMR reload for notifications
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3120',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

if (isDev) {
  // Allow hot reloading in development
  corsOptions.origin = ['http://localhost:3120', 'http://localhost:3110', 'http://localhost:8090', 'http://localhost:8091', 'http://localhost:8092'];
} else if (isE2E) {
  // Allow E2E test origins
  corsOptions.origin = ['http://localhost:3121', 'http://localhost:3111'];
}

app.use(cors(corsOptions));

// Compression and logging
app.use(compression());
app.use(morgan(isDev ? 'dev' : 'combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Audit middleware
import { initializeAuditService, getAuditService, createAuditMiddleware } from './services/audit/index.js';
let auditService: any = null;

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test route before API routes
app.get('/api/debug', (req, res) => {
  console.log('🐛 Debug endpoint hit');
  res.json({ message: 'Debug endpoint working' });
});

// Mock dashboard endpoint removed - using real ReportingController instead


// API routes will be mounted after services are initialized

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Capacinator API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Static file serving will be mounted AFTER API routes to avoid conflicts

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: isDev ? error.message : 'Something went wrong'
  });
});

// 404 handler will be set up after all routes are mounted

// Initialize and start server
async function startServer() {
  try {
    console.log('🚀 Starting Capacinator server...');
    
    // Initialize database
    console.log('📊 Initializing database...');
    if (isE2E) {
      await initializeE2EDatabase();
      console.log('✅ E2E Database ready');
    } else {
      await initializeDatabase();
      console.log('✅ Database ready');
    }
    
    // Get audit service (initialized by database init)
    console.log('🔍 Getting audit service...');
    auditService = getAuditService();
    if (auditService) {
      app.use(createAuditMiddleware(auditService));
      
      // Mount audit routes now that service is available
      const { createAuditRoutes } = await import('./api/routes/audit.js');
      app.use('/api/audit', createAuditRoutes(auditService));
      console.log('✅ Audit service and routes enabled');
    } else {
      console.log('⚠️ Audit service disabled');
    }
    
    // Mount main API routes
    console.log('🔗 Mounting API routes...');
    app.use('/api', (req, res, next) => {
      console.log(`🔗 API Request: ${req.method} ${req.path}`);
      next();
    }, apiRoutes);
    
    // Initialize notification scheduler
    console.log('📧 Initializing notification scheduler...');
    notificationScheduler.start();
    console.log('✅ Notification scheduler started');
    
    // 404 handler for API routes (must be after all routes)
    app.use('/api/*', (req, res) => {
      res.status(404).json({
        error: 'API endpoint not found',
        path: req.path
      });
    });
    
    // Serve static files in production (after API routes)
    if (!isDev) {
      const clientBuildPath = path.join(__dirname, '../../client/dist');
      app.use(express.static(clientBuildPath));
      
      // Handle React Router (return `index.html` for non-API routes)
      app.get('*', (req, res) => {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
      });
    }
    
    // Schedule automatic backups if enabled
    if (process.env.DB_BACKUP_ENABLED === 'true') {
      const interval = process.env.DB_BACKUP_INTERVAL || 'daily';
      let cronPattern = '0 2 * * *'; // Daily at 2 AM by default
      
      if (interval === 'hourly') cronPattern = '0 * * * *';
      else if (interval === 'weekly') cronPattern = '0 2 * * 0';
      
      cron.schedule(cronPattern, async () => {
        try {
          console.log('🔄 Creating scheduled database backup...');
          const backupFile = await backupDatabase();
          console.log(`✅ Backup created: ${backupFile}`);
        } catch (error) {
          console.error('❌ Backup failed:', error);
        }
      });
      
      console.log(`⏰ Automatic backups scheduled (${interval})`);
    }
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🎉 Server running on port ${PORT}`);
      console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
      if (isDev) {
        console.log(`🔗 Frontend dev server should be running on http://localhost:3120`);
      } else {
        console.log(`🌐 Application: http://localhost:${PORT}`);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('📴 SIGTERM received, shutting down gracefully...');
      notificationScheduler.stop();
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('📴 SIGINT received, shutting down gracefully...');
      notificationScheduler.stop();
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production to keep the server running
  if (isDev) {
    console.log('⚠️  Development mode: continuing despite unhandled rejection');
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Log but don't exit immediately
  console.log('⚠️  Attempting to continue...');
});

// Export app for testing
export { app };

// Start the server
if (process.env.NODE_ENV !== 'test') {
  startServer();
}