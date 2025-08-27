import knex from 'knex';
import config from './knexfile.js';
import { seed as seedComprehensiveData } from './seeds/002_comprehensive_data.js';
import { seed as seedScenariosData } from './seeds/003_scenarios_data.js';
import { seed as seedEnhancedDiversityData } from './seeds/004_enhanced_diversity_data.js';
import { seed as seedExpandedPortfolioData } from './seeds/006_expanded_portfolio_data.js';
import { seed as seedComprehensivePortfolio2023_2027 } from './seeds/007_comprehensive_portfolio_2023_2027.js';

const db = knex(config);

async function runSeed() {
  try {
    console.log('🌱 Running seed...');
    await seedComprehensiveData(db);
    // await seedExpandedPortfolioData(db);
    await seedComprehensivePortfolio2023_2027(db);
    // Seed scenarios - needed for assignments
    await seedScenariosData(db);
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