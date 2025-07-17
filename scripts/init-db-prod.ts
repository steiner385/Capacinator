import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/capacinator.db');
  console.log(`🔧 Initializing database at: ${dbPath}`);
  
  const db = knex({
    client: 'better-sqlite3',
    connection: {
      filename: dbPath
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, '../src/server/database/migrations')
    }
  });

  try {
    // Run migrations
    console.log('📊 Running migrations...');
    await db.migrate.latest();
    
    // Get migration status
    const [completed, pending] = await Promise.all([
      db.migrate.currentVersion(),
      db.migrate.list()
    ]);
    
    console.log(`✅ Current version: ${completed}`);
    console.log(`📋 Pending migrations: ${pending[1].length}`);
    
    // Verify tables exist
    const tables = await db.raw(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%' 
      AND name NOT LIKE 'knex_%'
      ORDER BY name
    `);
    
    console.log('\n📊 Database tables:');
    tables.forEach((table: any) => console.log(`  - ${table.name}`));
    
    console.log('\n✅ Database initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run initialization
initializeDatabase().catch(console.error);