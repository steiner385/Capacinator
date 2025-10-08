import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  console.log('🌱 Seeding scenario data...');
  
  // Clear existing scenarios data
  await knex('scenarios').del();
  
  // Get some people IDs for scenario creation
  const people = await knex('people').select('id', 'name').limit(5);
  if (people.length === 0) {
    throw new Error('No people found in database. Please run the main seed first.');
  }
  
  const [alice, bob, charlie, diana, eve] = people;
  
  // Create THE baseline scenario (there should only be one)
  const baselineScenario = {
    id: uuidv4(),
    name: 'Current State Baseline',
    description: 'Current state of all projects and resource allocations',
    parent_scenario_id: null,
    created_by: alice.id,
    status: 'active',
    scenario_type: 'baseline',
    branch_point: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  await knex('scenarios').insert([baselineScenario]);
  console.log(`✅ Created baseline scenario: ${baselineScenario.name}`);
  
  // Create valid branch scenarios (with proper parent references)
  const validBranches = [
    {
      id: uuidv4(),
      name: 'Aggressive Timeline Branch',
      description: 'Branch exploring aggressive timeline compression',
      parent_scenario_id: baselineScenario.id,
      created_by: charlie.id,
      status: 'active',
      scenario_type: 'branch',
      branch_point: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'Additional Resources Branch',
      description: 'Branch with additional contractor resources',
      parent_scenario_id: baselineScenario.id,
      created_by: diana.id,
      status: 'active',
      scenario_type: 'branch',
      branch_point: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'Budget Constrained Branch',
      description: 'Branch with reduced budget constraints',
      parent_scenario_id: baselineScenario.id,
      created_by: eve.id,
      status: 'active',
      scenario_type: 'branch',
      branch_point: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'Merged Feature Branch',
      description: 'A branch that has been merged back',
      parent_scenario_id: baselineScenario.id,
      created_by: alice.id,
      status: 'merged',
      scenario_type: 'branch',
      branch_point: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
  
  await knex('scenarios').insert(validBranches);
  console.log(`✅ Created ${validBranches.length} valid branch scenarios`);
  
  // Summary
  const totalScenarios = 1 + validBranches.length;
  console.log(`\n✅ Scenario seeding completed!`);
  console.log(`   📊 Total scenarios: ${totalScenarios}`);
  console.log(`   📈 Baseline scenario: 1 (${baselineScenario.name})`);
  console.log(`   🌿 Branch scenarios: ${validBranches.length}`);
  console.log(`\n🧹 Database seeded with clean scenario data - single baseline, no orphaned branches!`);
}