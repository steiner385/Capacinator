import knex from 'knex';
import config from './src/server/database/knexfile.js';
import { seed as seedComprehensivePortfolio } from './src/server/database/seeds/007_comprehensive_portfolio_2023_2027.js';

const db = knex(config);

async function run() {
  try {
    console.log('Running comprehensive portfolio seed...');
    await seedComprehensivePortfolio(db);
    console.log('✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.destroy();
  }
}

run();