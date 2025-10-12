import { getAuditedDb } from '../src/server/database/index.js';

const auditedDb = getAuditedDb();

async function addBaselineAssignments() {
  console.log('🎯 Adding assignments to baseline scenario...');
  
  const baselineScenarioId = '8444de2a-5344-4d2d-a0ec-154ceb8975ac';
  
  // Get some people and projects
  const people = await auditedDb('people').select('id', 'name').limit(5);
  const projects = await auditedDb('projects')
    .select('id', 'name')
    .limit(3);
  const roles = await auditedDb('roles').select('id', 'name').limit(5);
  
  if (people.length === 0 || projects.length === 0 || roles.length === 0) {
    console.log('❌ Not enough people, projects, or roles to create assignments');
    return;
  }
  
  console.log(`📊 Available: ${people.length} people, ${projects.length} projects, ${roles.length} roles`);
  
  const assignments = [];
  
  // Create some realistic assignments
  for (let i = 0; i < 8; i++) {
    const person = people[i % people.length];
    const project = projects[i % projects.length];
    const role = roles[i % roles.length];
    
    assignments.push({
      id: `baseline-${Math.random().toString(36).substr(2, 9)}`,
      project_id: project.id,
      person_id: person.id,
      role_id: role.id,
      scenario_id: baselineScenarioId,
      allocation_percentage: 40 + (i * 10), // 40%, 50%, 60%, etc.
      assignment_date_mode: 'project',
      start_date: null, // Will use project dates
      end_date: null,
      notes: `Baseline assignment for ${person.name} on ${project.name}`,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    });
  }
  
  // Insert assignments into scenario_project_assignments table
  await auditedDb('scenario_project_assignments').insert(assignments);
  
  console.log(`✅ Created ${assignments.length} baseline assignments`);
  
  // Verify the assignments were created
  const count = await auditedDb('scenario_project_assignments')
    .where('scenario_id', baselineScenarioId)
    .count('* as count')
    .first();
    
  console.log(`📊 Total baseline assignments: ${count?.count}`);
}

addBaselineAssignments()
  .then(() => {
    console.log('✅ Baseline assignments created successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error creating baseline assignments:', error);
    process.exit(1);
  });