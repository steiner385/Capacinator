import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { AuditRouteHandler } from './utils/AuditRouteHandler.js';
import apiRoutes from './api/routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeNotificationScheduler } from './services/notifications/scheduler.js';
import { initializeAutomaticBackups } from './services/backup/scheduler.js';
import { config } from './config/index.js';

export async function createExpressApp() {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
      },
    },
  }));

  // CORS configuration
  const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
      ? false // In production, frontend is served from same origin
      : ['http://localhost:3120', 'http://localhost:3121', 'http://localhost:5173'],
    credentials: true,
  };
  app.use(cors(corsOptions));

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Compression
  app.use(compression());

  // Logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Audit routes if enabled
  if (config.features.audit) {
    const { getAuditService } = await import('./services/audit/index.js');
    console.log('🔍 Getting audit service...');
    
    const auditService = getAuditService();
    if (auditService) {
      const auditHandler = new AuditRouteHandler(auditService);
      auditHandler.register(app);
      console.log('✅ Audit service and routes enabled');
    }
  }

  // API routes
  console.log('🔗 Mounting API routes...');
  app.use('/api', apiRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV 
    });
  });

  // Error handling
  app.use(errorHandler);

  // Initialize background services
  if (process.env.NODE_ENV !== 'test') {
    console.log('📧 Initializing notification scheduler...');
    initializeNotificationScheduler();
    console.log('✅ Notification scheduler started');
    
    initializeAutomaticBackups();
    console.log('⏰ Automatic backups scheduled (daily)');
  }

  return app;
}