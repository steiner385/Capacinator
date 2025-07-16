import knex from 'knex';
import knexE2EConfig from './knexfile.e2e.js';
import path from 'path';
import fs from 'fs';

export let e2eDb: knex.Knex;

// Initialize E2E database
export async function initializeE2EDatabase(): Promise<knex.Knex> {
  try {
    console.log('🔧 Initializing E2E database...');
    
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Create database connection
    e2eDb = knex(knexE2EConfig);
    
    // Test connection
    await e2eDb.raw('SELECT 1');
    console.log('✅ E2E database connection successful');
    
    // Run migrations
    await e2eDb.migrate.latest();
    console.log('✅ E2E database migrations completed');
    
    // Check if we need to seed data
    if (process.env.E2E_SEED_DATA === 'true') {
      const hasData = await e2eDb('roles').count('* as count').first();
      if (!hasData?.count || hasData.count === 0) {
        await e2eDb.seed.run();
        console.log('✅ E2E database seeded with test data');
      }
    }
    
    return e2eDb;
  } catch (error) {
    console.error('❌ E2E database initialization failed:', error);
    throw error;
  }
}

// Reset E2E database
export async function resetE2EDatabase(): Promise<void> {
  if (!e2eDb) {
    e2eDb = knex(knexE2EConfig);
  }
  
  try {
    console.log('🔄 Resetting E2E database...');
    
    // Get all table names
    const tables = await e2eDb.raw(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%' 
      AND name != 'knex_migrations' 
      AND name != 'knex_migrations_lock'
    `);
    
    // Disable foreign key constraints temporarily
    await e2eDb.raw('PRAGMA foreign_keys = OFF');
    
    // Clear all data from tables
    for (const table of tables) {
      await e2eDb(table.name).del();
    }
    
    // Re-enable foreign key constraints
    await e2eDb.raw('PRAGMA foreign_keys = ON');
    
    // Re-seed if needed
    if (process.env.E2E_SEED_DATA === 'true') {
      await e2eDb.seed.run();
    }
    
    console.log('✅ E2E database reset completed');
  } catch (error) {
    console.error('❌ E2E database reset failed:', error);
    throw error;
  }
}

// Cleanup E2E database
export async function cleanupE2EDatabase(): Promise<void> {
  if (e2eDb) {
    await e2eDb.destroy();
    console.log('✅ E2E database connection closed');
  }
  
  // Optionally remove the database file
  if (process.env.E2E_RESET_DB === 'true') {
    const dbPath = path.join(process.cwd(), 'data', 'project-capacitizer-e2e.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('✅ E2E database file removed');
    }
  }
}

// Export for use in tests
