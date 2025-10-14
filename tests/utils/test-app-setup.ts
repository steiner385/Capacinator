import { createExpressApp } from '../../src/server/app.js';
import { db } from '../integration/setup.js';

/**
 * Set up a test Express app for integration testing
 * This creates a full Express app instance with all middleware
 * but uses the test database configuration
 */
export async function setupTestApp() {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Create the Express app
  const app = await createExpressApp();
  
  return app;
}

/**
 * Test utility to get the test database instance
 */
export function getTestDb() {
  return db;
}