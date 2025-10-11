import path from 'path';
import { fileURLToPath } from 'url';
import { getAuditedDb } from '../src/server/database/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the audited database connection
const auditedDb = getAuditedDb();

async function reseedLocal() {
  try {
    console.log('🔄 Starting local database reseed...');
    
    // Run migrations
    console.log('📊 Running migrations...');
    await auditedDb.migrate.latest({
      directory: path.join(__dirname, '../src/server/database/migrations')
    });
    
    // Run seeds
    console.log('🌱 Running seeds...');
    await auditedDb.seed.run({
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
        const count = await auditedDb(table).count('* as count').first();
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