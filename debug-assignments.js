import { getDb } from './src/server/database/index.js';

const db = getDb();

async function debugAssignments() {
  console.log('🔍 Debugging assignments...');
  
  // Check what tables exist
  const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%assignment%';");
  console.log('📊 Assignment-related tables:', tables.map(t => t.name));
  
  // Check assignments_view if it exists
  try {
    const viewData = await db('assignments_view').limit(3);
    console.log(`📊 assignments_view has ${viewData.length} records`);
    if (viewData.length > 0) {
      console.log('Sample record:', viewData[0]);
    }
  } catch (error) {
    console.log('❌ assignments_view error:', error.message);
  }
  
  // Check scenario_project_assignments
  try {
    const scenarioAssignments = await db('scenario_project_assignments').limit(3);
    console.log(`📊 scenario_project_assignments has ${scenarioAssignments.length} records`);
    if (scenarioAssignments.length > 0) {
      console.log('Sample record:', scenarioAssignments[0]);
    }
  } catch (error) {
    console.log('❌ scenario_project_assignments error:', error.message);
  }
  
  // Check project_assignments
  try {
    const projectAssignments = await db('project_assignments').limit(3);
    console.log(`📊 project_assignments has ${projectAssignments.length} records`);
    if (projectAssignments.length > 0) {
      console.log('Sample record:', projectAssignments[0]);
    }
  } catch (error) {
    console.log('❌ project_assignments error:', error.message);
  }
}

debugAssignments()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });