import { config } from 'dotenv';
import { createExpressApp } from './app.js';
import { initializeDatabase } from './database/index.js';
import { initializeE2EDatabase } from './database/init-e2e.js';
import { setupGlobalErrorHandlers } from './middleware/enhancedErrorHandler.js';
import { logger } from './services/logging/config.js';

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

const PORT = process.env.PORT || 8081;
const isDev = process.env.NODE_ENV === 'development';
const isE2E = process.env.NODE_ENV === 'e2e';

// Setup global error handlers for enhanced logging
setupGlobalErrorHandlers();

// For notification system stability
if (isDev) {
  logger.info('Notification scheduler initialized');
}

async function startServer() {
  try {
    logger.info('Starting Capacinator server', { 
      port: PORT, 
      environment: process.env.NODE_ENV 
    });
    
    // Initialize database
    logger.info('Initializing database', { environment: process.env.NODE_ENV });
    if (isE2E) {
      const e2eDb = await initializeE2EDatabase();
      // Set global reference for E2E database
      global.__E2E_DB__ = e2eDb;
      logger.info('E2E database initialized');
    } else {
      await initializeDatabase();
    }
    logger.info('Database ready');
    
    // Create Express app
    const app = await createExpressApp();
    
    // Start the server
    const server = app.listen(PORT, () => {
      logger.info('Server running', { 
        port: PORT,
        healthCheck: `http://localhost:${PORT}/api/health`,
        environment: process.env.NODE_ENV
      });
      
      if (isDev) {
        logger.info('Development mode', {
          frontendUrl: 'http://localhost:3120'
        });
      } else {
        logger.info('Production mode', {
          applicationUrl: `http://localhost:${PORT}`
        });
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server', error instanceof Error ? error : undefined, {
      port: PORT,
      environment: process.env.NODE_ENV
    });
    process.exit(1);
  }
}

// Note: Global error handlers are now set up by setupGlobalErrorHandlers()
// These handlers provide structured logging and better error management

// Start the server
startServer();