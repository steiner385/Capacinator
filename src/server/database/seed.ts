import knex from 'knex';
import config from './knexfile.js';
import { seed as seedComprehensiveData } from './seeds/002_comprehensive_data.js';
import { seed as seedScenariosData } from './seeds/003_scenarios_data.js';
import { seed as seedEnhancedDiversityData } from './seeds/004_enhanced_diversity_data.js';

const db = knex(config);

async function runSeed() {
  try {
    console.log('🌱 Running seed...');
    await seedComprehensiveData(db);
    // Skip scenarios and enhanced diversity for baseline - not essential for core functionality
    // await seedScenariosData(db);
    // await seedEnhancedDiversityData(db);
    console.log('✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

runSeed();