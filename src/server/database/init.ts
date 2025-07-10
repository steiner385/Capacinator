import { db, initializeDatabase, testConnection } from './index.js';
import fs from 'fs';
import path from 'path';

async function initDb() {
  try {
    console.log('🔧 Initializing Capacinator database...');
    
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Could not connect to database');
    }
    
    // Initialize database (run migrations and seeds)
    await initializeDatabase();
    
    console.log('✅ Database initialization complete!');
    console.log('\n📊 Database status:');
    
    // Show some basic stats
    const tables = [
      'locations', 'project_types', 'project_phases', 'roles', 
      'people', 'projects', 'resource_templates'
    ];
    
    for (const table of tables) {
      try {
        const count = await db(table).count('* as count').first();
        console.log(`   ${table}: ${count?.count || 0} records`);
      } catch (error) {
        console.log(`   ${table}: table not found`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initDb();
}

export { initDb };