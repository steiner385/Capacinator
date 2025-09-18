import { Knex } from 'knex';
import knex from 'knex';
import path from 'path';
import fs from 'fs/promises';

let e2eDb: Knex | null = null;

/**
 * Initialize E2E test database
 * Creates a fresh SQLite database for E2E tests
 */
export async function initializeE2EDatabase(): Promise<Knex> {
  console.log('🧪 Initializing E2E test database...');
  
  // Close existing connection if any
  if (e2eDb) {
    await e2eDb.destroy();
  }

  // Create E2E database connection
  e2eDb = knex({
    client: 'better-sqlite3',
    connection: {
      filename: ':memory:' // Use in-memory database for E2E tests
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.resolve('src/server/database/migrations'),
      loadExtensions: ['.ts', '.js']
    },
    seeds: {
      directory: path.resolve('src/server/database/seeds'),
      loadExtensions: ['.ts', '.js']
    }
  });

  try {
    // Run migrations
    console.log('🔧 Running E2E database migrations...');
    await e2eDb.migrate.latest();
    
    // Run E2E specific seeds
    console.log('🌱 Seeding E2E test data...');
    await e2eDb.seed.run({ specific: 'e2e-test-data.ts' });
    
    console.log('✅ E2E database initialized successfully');
    return e2eDb;
  } catch (error) {
    console.error('❌ Failed to initialize E2E database:', error);
    throw error;
  }
}

/**
 * Get E2E database instance
 */
export function getE2EDatabase(): Knex {
  if (!e2eDb) {
    throw new Error('E2E database not initialized. Call initializeE2EDatabase() first.');
  }
  return e2eDb;
}

/**
 * Cleanup E2E database
 * Closes connections and cleans up resources
 */
export async function cleanupE2EDatabase(): Promise<void> {
  console.log('🧹 Cleaning up E2E database...');
  
  if (e2eDb) {
    try {
      await e2eDb.destroy();
      e2eDb = null;
      console.log('✅ E2E database cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up E2E database:', error);
    }
  }
}

/**
 * Reset E2E database to initial state
 * Useful between test suites
 */
export async function resetE2EDatabase(): Promise<void> {
  console.log('🔄 Resetting E2E database...');
  
  if (!e2eDb) {
    await initializeE2EDatabase();
    return;
  }

  try {
    // Rollback all migrations and re-run
    await e2eDb.migrate.rollback(undefined, true);
    await e2eDb.migrate.latest();
    
    // Re-seed data
    await e2eDb.seed.run({ specific: 'e2e-test-data.ts' });
    
    console.log('✅ E2E database reset complete');
  } catch (error) {
    console.error('❌ Error resetting E2E database:', error);
    throw error;
  }
}