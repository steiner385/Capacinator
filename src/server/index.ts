import { config } from 'dotenv';
import { createExpressApp } from './app.js';
import { initializeDatabase } from './database/index.js';
// import { initializeE2EDatabase } from './database/init-e2e.js';

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

// For notification system stability
if (isDev) {
  console.log('📧 Notification scheduler initialized');
}

async function startServer() {
  try {
    console.log('🚀 Starting Capacinator server...');
    
    // Initialize database
    console.log('📊 Initializing database...');
    // if (isE2E) {
    //   await initializeE2EDatabase();
    // } else {
      await initializeDatabase();
    // }
    console.log('✅ Database ready');
    
    // Create Express app
    const app = await createExpressApp();
    
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
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('📴 SIGINT received, shutting down gracefully...');
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
  // Keep the process alive in production unless it's critical
  if (isDev) {
    console.log('⚠️  Attempting to continue...');
  }
});

// Start the server
startServer();