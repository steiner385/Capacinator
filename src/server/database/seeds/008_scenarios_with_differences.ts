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
  const locations = await knex('locations').select('id', 'name').orderBy('name');
  const projectTypes = await knex('project_types').select('id', 'name').orderBy('name');
  const projectSubTypes = await knex('project_sub_types').select('id', 'name', 'project_type_id').orderBy('name');
  
  if (people.length === 0 || projects.length === 0) {
    throw new Error('No people or projects found. Please run comprehensive seed first.');
  }
  
  const [alice, bob, charlie, diana, eve, frank, grace, henry] = people;
  
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
    description: 'New market expansion with 5 additional projects and 10 new hires',
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
    description: 'Reduced budget with 30% fewer projects and minimal staffing',
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
    description: 'Experimental R&D focus with new tech stack projects',
    parent_scenario_id: null,
    created_by: frank.id,
    status: 'active', // Fixed: changed from 'draft' to 'active' to match CHECK constraint
    scenario_type: 'sandbox',
    branch_point: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  await knex('scenarios').insert([aggressiveBranch, expansionBranch, costCuttingBranch, innovationSandbox]);
  console.log(`✅ Created 4 distinct scenarios`);
  
  // Now create scenario-specific projects and assignments
  
  // 1. Aggressive Timeline Branch - Add more assignments to existing projects
  console.log('\n📊 Setting up Aggressive Timeline Branch...');
  const criticalProjects = projects.filter(p => p.priority >= 3).slice(0, 5); // High priority projects
  
  for (const project of criticalProjects) {
    // Double the assignments for each critical project
    const projectAssignments = await knex('assignments')
      .where('project_id', project.id)
      .select('*');
    
    for (const assignment of projectAssignments) {
      await knex('scenario_project_assignments').insert({
        id: uuidv4(),
        scenario_id: aggressiveBranch.id,
        person_id: assignment.person_id,
        project_id: assignment.project_id,
        role_id: assignment.role_id,
        allocation_percentage: Math.min(assignment.allocation_percentage * 1.5, 100), // 50% increase
        assignment_date_mode: 'project',
        change_type: 'modified',
        base_assignment_id: assignment.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }
  
  // Add extra people to critical projects
  const extraPeople = [frank, grace, henry];
  for (let i = 0; i < criticalProjects.length && i < extraPeople.length; i++) {
    await knex('scenario_project_assignments').insert({
      id: uuidv4(),
      scenario_id: aggressiveBranch.id,
      person_id: extraPeople[i].id,
      project_id: criticalProjects[i].id,
      role_id: roles[i % roles.length].id,
      allocation_percentage: 80,
      assignment_date_mode: 'fixed',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days
      change_type: 'added',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  // 2. Market Expansion Branch - Add new projects
  console.log('\n📊 Setting up Market Expansion Branch...');
  
  // First, we need to add the new projects to the projects table
  const expansionProjects = [
    {
      id: uuidv4(),
      name: 'APAC Market Entry',
      description: 'Expansion into Asia-Pacific markets',
      status: 'active',
      priority: 3, // High priority
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      scenario_id: expansionBranch.id,
      name: 'European Distribution Hub',
      description: 'Establish European distribution network',
      status: 'planning',
      priority: 3, // High priority,
      start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      scenario_id: expansionBranch.id,
      name: 'Latin America Partnership',
      description: 'Strategic partnerships in LATAM',
      status: 'active',
      priority: 2, // Medium priority
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      scenario_id: expansionBranch.id,
      name: 'Global Marketing Campaign',
      description: 'Worldwide brand awareness campaign',
      status: 'active',
      priority: 3, // High priority
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      scenario_id: expansionBranch.id,
      name: 'Multi-language Support',
      description: 'Localization for 15 languages',
      status: 'planning',
      priority: 2, // Medium priority
      start_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
  
  // Insert expansion projects into the projects table
  await knex('projects').insert(expansionProjects);
  
  // Link these projects to the expansion branch scenario
  for (const project of expansionProjects) {
    await knex('scenario_projects').insert({
      id: uuidv4(),
      scenario_id: expansionBranch.id,
      project_id: project.id,
      change_type: 'added',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  // Add assignments for expansion projects
  let personIndex = 0;
  for (const project of expansionProjects) {
    // Assign 2-3 people per expansion project
    for (let j = 0; j < 3; j++) {
      await knex('scenario_project_assignments').insert({
        id: uuidv4(),
        scenario_id: expansionBranch.id,
        person_id: people[personIndex % people.length].id,
        project_id: project.id,
        role_id: roles[j % roles.length].id,
        allocation_percentage: 40 + (j * 10), // 40%, 50%, 60%
        assignment_date_mode: 'project',
        change_type: 'added',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      personIndex++;
    }
  }
  
  // 3. Cost Cutting Branch - Remove some projects and reduce allocations
  console.log('\n📊 Setting up Cost Reduction Branch...');
  // Only keep high-priority projects
  const keptProjects = projects.slice(0, 3); // Keep only first 3 projects
  
  for (const project of keptProjects) {
    const projectAssignments = await knex('assignments')
      .where('project_id', project.id)
      .select('*')
      .limit(2); // Keep only 2 people per project
    
    for (const assignment of projectAssignments) {
      await knex('scenario_project_assignments').insert({
        id: uuidv4(),
        scenario_id: costCuttingBranch.id,
        person_id: assignment.person_id,
        project_id: assignment.project_id,
        role_id: assignment.role_id,
        allocation_percentage: Math.max(assignment.allocation_percentage * 0.7, 20), // 30% reduction
        assignment_date_mode: 'project',
        change_type: 'modified',
        base_assignment_id: assignment.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }
  
  // 4. Innovation Sandbox - Completely different set of R&D projects
  console.log('\n📊 Setting up Innovation Lab Sandbox...');
  const innovationProjects = [
    {
      id: uuidv4(),
      name: 'AI-Powered Analytics',
      description: 'Machine learning for predictive analytics',
      status: 'active',
      priority: 3, // High priority
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      scenario_id: innovationSandbox.id,
      name: 'Blockchain Integration',
      description: 'Distributed ledger for supply chain',
      status: 'planning', // Use valid status
      priority: 2, // Medium priority
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      scenario_id: innovationSandbox.id,
      name: 'Quantum Computing Research',
      description: 'Exploring quantum algorithms',
      status: 'planning', // Use valid status
      priority: 1, // Low priority
      start_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 years
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      scenario_id: innovationSandbox.id,
      name: 'AR/VR Customer Experience',
      description: 'Augmented reality for customer engagement',
      status: 'active',
      priority: 3, // High priority
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
  
  // Insert innovation projects into the projects table
  await knex('projects').insert(innovationProjects);
  
  // Link these projects to the innovation sandbox scenario
  for (const project of innovationProjects) {
    await knex('scenario_projects').insert({
      id: uuidv4(),
      scenario_id: innovationSandbox.id,
      project_id: project.id,
      change_type: 'added',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  // Assign tech-savvy people to innovation projects
  const techPeople = [bob, charlie, frank, henry]; // Assuming these are developers/engineers
  for (let i = 0; i < innovationProjects.length; i++) {
    const project = innovationProjects[i];
    const person = techPeople[i % techPeople.length];
    
    await knex('scenario_project_assignments').insert({
      id: uuidv4(),
      scenario_id: innovationSandbox.id,
      person_id: person.id,
      project_id: project.id,
      role_id: roles.find(r => r.name.toLowerCase().includes('developer') || r.name.toLowerCase().includes('engineer'))?.id || roles[0].id,
      allocation_percentage: 60,
      assignment_date_mode: 'project',
      change_type: 'added',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  // Summary statistics
  const scenarioStats = await knex('scenarios')
    .select('scenarios.id', 'scenarios.name')
    .orderBy('scenarios.scenario_type', 'asc')
    .orderBy('scenarios.name', 'asc');
  
  console.log('\n✅ Scenario seeding completed with noticeable differences!');
  console.log('\n📊 Scenarios created:');
  for (const scenario of scenarioStats) {
    // Count projects and assignments for each scenario
    const projectCount = await knex('scenario_projects')
      .where('scenario_id', scenario.id)
      .where('change_type', 'added')
      .count('* as count')
      .first();
      
    const assignmentCount = await knex('scenario_project_assignments')
      .where('scenario_id', scenario.id)
      .count('* as count')
      .first();
      
    console.log(`   ${scenario.name}:`);
    console.log(`     - New projects: ${projectCount?.count || 0}`);
    console.log(`     - Assignments: ${assignmentCount?.count || 0}`);
  }
  
  console.log('\n🎯 Key Differences:');
  console.log('   - Baseline: Standard allocations, all current projects');
  console.log('   - Aggressive Timeline: 50% more resources, compressed timelines');
  console.log('   - Market Expansion: 5 new international projects, more staff');
  console.log('   - Cost Reduction: Only 3 projects, reduced allocations');
  console.log('   - Innovation Sandbox: 4 R&D projects with tech focus');
}