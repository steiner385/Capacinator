import knex from 'knex';
import config from './knexfile.js';
import { seed as seedComprehensiveData } from './seeds/002_comprehensive_data.js';
import { seed as seedScenariosData } from './seeds/003_scenarios_data.js';

const db = knex(config);

async function runSeed() {
  try {
    console.log('🌱 Running seed...');
    await seedComprehensiveData(db);
    await seedScenariosData(db);
    console.log('✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

runSeed();