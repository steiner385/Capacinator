import { getDb } from './src/server/database/index.js';

const db = getDb();

async function checkSchema() {
  const result = await db.raw("PRAGMA table_info(projects)");
  console.log('Projects table columns:');
  result.forEach(col => console.log('-', col.name, ':', col.type));
  process.exit(0);
}

checkSchema().catch(console.error);