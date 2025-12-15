import { config } from 'dotenv';
import { createExpressApp } from './app.js';
import { initializeDatabase } from './database/index.js';
import { initializeE2EDatabase } from './database/init-e2e.js';
import { setupGlobalErrorHandlers } from './middleware/enhancedErrorHandler.js';
import { logger } from './services/logging/config.js';
import { env } from './config/index.js';

// Load environment variables based on NODE_ENV
// Note: NODE_ENV must be set before this point (e.g., via npm scripts)
const envFileMap: Record<string, string> = {
  development: '.env.development',
  test: '.env.test',
  e2e: '.env.e2e',
  production: '.env.production',
};
const envFile = envFileMap[process.env.NODE_ENV || ''] || '.env';
config({ path: envFile });

// Access config after dotenv has loaded
const { port, isDevelopment, isE2E, nodeEnv } = env.server;

// Setup global error handlers for enhanced logging
setupGlobalErrorHandlers();

// For notification system stability
if (isDevelopment) {
  logger.info('Notification scheduler initialized');
}

async function startServer() {
  try {
    logger.info('Starting Capacinator server', {
      port,
      environment: nodeEnv
    });

    // Initialize database
    logger.info('Initializing database', { environment: nodeEnv });
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
    const server = app.listen(port, () => {
      logger.info('Server running', {
        port,
        healthCheck: `http://localhost:${port}/api/health`,
        environment: nodeEnv
      });

      if (isDevelopment) {
        logger.info('Development mode', {
          frontendUrl: 'http://localhost:3120'
        });
      } else {
        logger.info('Production mode', {
          applicationUrl: `http://localhost:${port}`
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
    logger.error('Failed to start server', error, {
      port,
      environment: nodeEnv
    });
    process.exit(1);
  }
}

// Note: Global error handlers are now set up by setupGlobalErrorHandlers()
// These handlers provide structured logging and better error management

// Start the server
startServer();
