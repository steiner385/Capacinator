#!/usr/bin/env node

// Test E2E database initialization
process.env.NODE_ENV = 'e2e';
process.env.DATABASE_URL = ':memory:';
process.env.DB_FILENAME = ':memory:';

import { initializeE2EDatabase } from './src/server/database/init-e2e.js';
import { getDb } from './src/server/database/index.js';

console.log('Testing E2E Database Initialization...');

try {
  // Initialize E2E database
  console.log('1. Initializing E2E database...');
  const e2eDb = await initializeE2EDatabase();
  
  // Test if global is set
  console.log('2. Checking global E2E DB:', !!global.__E2E_DB__);
  
  // Test getDb function
  console.log('3. Testing getDb() function...');
  const db = getDb();
  console.log('   - getDb returned:', typeof db);
  
  // Test database query
  console.log('4. Testing database query...');
  const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('   - Tables found:', tables.length);
  console.log('   - Table names:', tables.map(t => t.name).join(', '));
  
  // Test if people table exists
  console.log('5. Testing people table...');
  const peopleCount = await db('people').count('* as count');
  console.log('   - People count:', peopleCount[0].count);
  
  console.log('\n✅ E2E Database initialization successful!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ E2E Database initialization failed:', error);
  process.exit(1);
}