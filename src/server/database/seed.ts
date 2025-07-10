import knex from 'knex';
import config from './knexfile.js';
import { seed } from './seeds/002_comprehensive_data.js';

const db = knex(config);

async function runSeed() {
  try {
    console.log('🌱 Running seed...');
    await seed(db);
    console.log('✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

runSeed();