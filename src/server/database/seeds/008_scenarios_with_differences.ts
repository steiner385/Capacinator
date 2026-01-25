import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  console.log('🌱 Creating scenarios with noticeable differences...');

  // Clear existing scenario-specific data
  await knex('scenario_project_assignments').del();
  await knex('scenario_projects').del();
  await knex('scenarios').del();

  // Get required reference data
  const people = await knex('people').select('id', 'name').orderBy('name');
  const projects = await knex('projects').select('id', 'name', 'priority').orderBy('name');
  const roles = await knex('roles').select('id', 'name').orderBy('name');

  if (people.length === 0 || projects.length === 0) {
    throw new Error('No people or projects found. Please run comprehensive seed first.');
  }

  const [alice, bob, charlie, diana, eve, frank, , henry] = people;

  // Create THE baseline scenario
  const baselineScenario = {
    id: uuidv4(),
    name: 'Current State Baseline',
    description: 'Current state with all active projects and standard allocations',
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

  // Create branch scenarios with distinct characteristics
  const aggressiveBranch = {
    id: uuidv4(),
    name: 'Aggressive Timeline Branch',
    description: 'Compressed timelines with 50% more resources allocated to critical projects',
    parent_scenario_id: baselineScenario.id,
    created_by: charlie.id,
    status: 'active',
    scenario_type: 'branch',
    branch_point: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const expansionBranch = {
    id: uuidv4(),
    name: 'Market Expansion Branch',
    description: 'New market expansion with increased resources on international projects',
    parent_scenario_id: baselineScenario.id,
    created_by: diana.id,
    status: 'active',
    scenario_type: 'branch',
    branch_point: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const costCuttingBranch = {
    id: uuidv4(),
    name: 'Cost Reduction Branch',
    description: 'Reduced budget with fewer projects and minimal staffing',
    parent_scenario_id: baselineScenario.id,
    created_by: eve.id,
    status: 'active',
    scenario_type: 'branch',
    branch_point: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const innovationSandbox = {
    id: uuidv4(),
    name: 'Innovation Lab Sandbox',
    description: 'Experimental R&D focus with tech innovation projects',
    parent_scenario_id: null,
    created_by: frank.id,
    status: 'active',
    scenario_type: 'sandbox',
    branch_point: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await knex('scenarios').insert([aggressiveBranch, expansionBranch, costCuttingBranch, innovationSandbox]);
  console.log(`✅ Created 4 distinct scenarios`);

  // 1. Aggressive Timeline Branch - Add more assignments to high priority projects
  console.log('\n📊 Setting up Aggressive Timeline Branch...');
  const criticalProjects = projects.filter(p => p.priority >= 3).slice(0, 5);

  for (const project of criticalProjects) {
    // Get existing project assignments
    const projectAssignments = await knex('project_assignments')
      .where('project_id', project.id)
      .select('*');

    for (const assignment of projectAssignments) {
      await knex('scenario_project_assignments').insert({
        id: uuidv4(),
        scenario_id: aggressiveBranch.id,
        person_id: assignment.person_id,
        project_id: assignment.project_id,
        role_id: assignment.role_id,
        allocation_percentage: Math.min(assignment.allocation_percentage * 1.5, 100),
        assignment_date_mode: 'project',
        change_type: 'modified',
        base_assignment_id: assignment.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  // Add extra people to critical projects
  const extraPeople = people.slice(5, 8); // frank, grace, henry
  for (let i = 0; i < Math.min(criticalProjects.length, extraPeople.length); i++) {
    await knex('scenario_project_assignments').insert({
      id: uuidv4(),
      scenario_id: aggressiveBranch.id,
      person_id: extraPeople[i].id,
      project_id: criticalProjects[i].id,
      role_id: roles[i % roles.length].id,
      allocation_percentage: 80,
      assignment_date_mode: 'fixed',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      change_type: 'added',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  console.log(`✅ Added enhanced assignments to ${criticalProjects.length} critical projects`);

  // 2. Market Expansion Branch - Add assignments to existing projects
  console.log('\n📊 Setting up Market Expansion Branch...');

  // Use existing projects for expansion branch - add more people to them
  const expansionProjects = projects.slice(5, 10);
  let personIndex = 0;
  for (const project of expansionProjects) {
    // Assign 2-3 people per project
    for (let j = 0; j < 3; j++) {
      await knex('scenario_project_assignments').insert({
        id: uuidv4(),
        scenario_id: expansionBranch.id,
        person_id: people[personIndex % people.length].id,
        project_id: project.id,
        role_id: roles[j % roles.length].id,
        allocation_percentage: 40 + (j * 10),
        assignment_date_mode: 'project',
        change_type: 'added',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      personIndex++;
    }
  }
  console.log(`✅ Added expansion assignments to ${expansionProjects.length} projects`);

  // 3. Cost Cutting Branch - Reduce allocations on projects
  console.log('\n📊 Setting up Cost Reduction Branch...');
  const keptProjects = projects.slice(0, 3);

  for (const project of keptProjects) {
    const projectAssignments = await knex('project_assignments')
      .where('project_id', project.id)
      .select('*')
      .limit(2);

    for (const assignment of projectAssignments) {
      await knex('scenario_project_assignments').insert({
        id: uuidv4(),
        scenario_id: costCuttingBranch.id,
        person_id: assignment.person_id,
        project_id: assignment.project_id,
        role_id: assignment.role_id,
        allocation_percentage: Math.max(assignment.allocation_percentage * 0.7, 20),
        assignment_date_mode: 'project',
        change_type: 'modified',
        base_assignment_id: assignment.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }
  console.log(`✅ Added reduced allocations to ${keptProjects.length} projects`);

  // 4. Innovation Sandbox - Focus on R&D and tech projects
  console.log('\n📊 Setting up Innovation Lab Sandbox...');

  // Use existing AI/ML and tech projects for innovation sandbox
  const innovationProjects = projects.filter(p =>
    p.name.toLowerCase().includes('ai') ||
    p.name.toLowerCase().includes('ml') ||
    p.name.toLowerCase().includes('research') ||
    p.name.toLowerCase().includes('analytics')
  ).slice(0, 4);

  // If no AI/ML projects found, use first 4 projects
  const targetProjects = innovationProjects.length > 0 ? innovationProjects : projects.slice(0, 4);

  const techPeople = [bob, charlie, frank, henry].filter(p => p); // Filter out undefined
  for (let i = 0; i < Math.min(targetProjects.length, techPeople.length); i++) {
    const project = targetProjects[i];
    const person = techPeople[i];

    // Find a developer or engineer role
    const developerRole = roles.find(r =>
      r.name.toLowerCase().includes('developer') ||
      r.name.toLowerCase().includes('engineer')
    ) || roles[0];

    await knex('scenario_project_assignments').insert({
      id: uuidv4(),
      scenario_id: innovationSandbox.id,
      person_id: person.id,
      project_id: project.id,
      role_id: developerRole.id,
      allocation_percentage: 60,
      assignment_date_mode: 'project',
      change_type: 'added',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  console.log(`✅ Added innovation assignments to ${Math.min(targetProjects.length, techPeople.length)} projects`);

  // Summary statistics
  const scenarioStats = await knex('scenarios')
    .select('scenarios.id', 'scenarios.name')
    .orderBy('scenarios.scenario_type', 'asc')
    .orderBy('scenarios.name', 'asc');

  console.log('\n✅ Scenario seeding completed with noticeable differences!');
  console.log('\n📊 Scenarios created:');
  for (const scenario of scenarioStats) {
    const assignmentCount = await knex('scenario_project_assignments')
      .where('scenario_id', scenario.id)
      .count('* as count')
      .first();

    console.log(`   ${scenario.name}: ${assignmentCount?.count || 0} assignments`);
  }

  console.log('\n🎯 Key Differences:');
  console.log('   - Baseline: Standard allocations, all current projects');
  console.log('   - Aggressive Timeline: 50% more resources, extra staff on critical projects');
  console.log('   - Market Expansion: More people assigned to expansion projects');
  console.log('   - Cost Reduction: Reduced allocations on kept projects');
  console.log('   - Innovation Sandbox: Tech-focused assignments on R&D projects');
}
