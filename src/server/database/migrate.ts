import { db } from './index.js';

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Run migrations
    await db.migrate.latest();
    
    console.log('✅ Database migrations completed successfully!');
    
    // Close the database connection
    await db.destroy();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();