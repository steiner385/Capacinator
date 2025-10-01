import knex, { Knex } from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration for local development
const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: path.join(__dirname, '../data/capacinator.db')
  },
  useNullAsDefault: true
});

async function reseedLocal() {
  try {
    console.log('🔄 Starting local database reseed...');
    
    // Run migrations
    console.log('📊 Running migrations...');
    await db.migrate.latest({
      directory: path.join(__dirname, '../src/server/database/migrations')
    });
    
    // Run seeds
    console.log('🌱 Running seeds...');
    await db.seed.run({
      directory: path.join(__dirname, '../src/server/database/seeds')
    });
    
    // Verify data
    console.log('\n✅ Database reseeded successfully!');
    console.log('\n📊 Database contents:');
    
    const tables = [
      'locations', 'project_types', 'roles', 
      'people', 'projects', 'scenarios'
    ];
    
    for (const table of tables) {
      try {
        const count = await db(table).count('* as count').first();
        console.log(`   ${table}: ${count?.count || 0} records`);
      } catch (error) {
        console.log(`   ${table}: error reading table`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Reseed failed:', error);
    process.exit(1);
  }
}

reseedLocal();