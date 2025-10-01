import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  console.log('🌱 Creating scenarios with noticeable differences (simplified)...');
  
  // Clear existing scenario-specific data
  await knex('scenario_project_assignments').del();
  await knex('scenario_projects').del();
  await knex('scenarios').del();
  
  // Get reference data
  const people = await knex('people').select('*').orderBy('name');
  const projects = await knex('projects').select('*').orderBy('name');
  const roles = await knex('roles').select('*').orderBy('name');
  
  if (people.length === 0 || projects.length === 0) {
    throw new Error('No people or projects found. Please run comprehensive seed first.');
  }
  
  // Create THE baseline scenario
  const baselineScenario = {
    id: uuidv4(),
    name: 'Current State Baseline',
    description: 'Current state with all active projects and standard allocations (10 projects, 15 project_assignments)',
    parent_scenario_id: null,
    created_by: people[0].id,
    status: 'active',
    scenario_type: 'baseline',
    branch_point: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  await knex('scenarios').insert(baselineScenario);
  
  // Create scenarios with distinct differences
  const scenarios = [
    {
      id: uuidv4(),
      name: 'High Velocity Branch',
      description: '50% MORE resources on critical projects (15 additional project_assignments)',
      parent_scenario_id: baselineScenario.id,
      created_by: people[1].id,
      status: 'active',
      scenario_type: 'branch',
      branch_point: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'Cost Reduction Branch',
      description: '30% FEWER resources, only 3 projects active (5 project_assignments removed)',
      parent_scenario_id: baselineScenario.id,
      created_by: people[2].id,
      status: 'active',
      scenario_type: 'branch',
      branch_point: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: 'Innovation Focus Sandbox',
      description: 'R&D focus - 5 projects paused, 5 new people added to innovation',
      parent_scenario_id: null,
      created_by: people[3].id,
      status: 'active',
      scenario_type: 'sandbox',
      branch_point: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
  
  await knex('scenarios').insert(scenarios);
  
  // 1. High Velocity Branch - Add more people to high priority projects
  const highVelocityBranch = scenarios[0];
  const highPriorityProjects = projects.filter(p => p.priority >= 3).slice(0, 5);
  
  if (highPriorityProjects.length > 0) {
    const extraAssignments = [];
    
    // Add 3 more people to each high priority project
    for (let i = 0; i < highPriorityProjects.length; i++) {
      const project = highPriorityProjects[i];
      for (let j = 0; j < 3; j++) {
        const person = people[(i * 3 + j) % people.length];
        const role = roles[(i + j) % roles.length];
        
        extraAssignments.push({
          id: uuidv4(),
          scenario_id: highVelocityBranch.id,
          project_id: project.id,
          person_id: person.id,
          role_id: role.id,
          allocation_percentage: 60 + (j * 10), // 60%, 70%, 80%
          assignment_date_mode: 'project',
          change_type: 'added',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
    
    if (extraAssignments.length > 0) {
      await knex('scenario_project_assignments').insert(extraAssignments);
      console.log(`✅ Added ${extraAssignments.length} extra assignments to High Velocity Branch`);
    }
  }
  
  // 2. Cost Reduction Branch - Remove assignments from low priority projects
  const costReductionBranch = scenarios[1];
  const lowPriorityProjects = projects.filter(p => p.priority <= 2).slice(0, 5);
  
  // Get existing project_assignments for these projects and mark them as removed
  const removedAssignments = [];
  for (const project of lowPriorityProjects) {
    const projectAssignments = await knex('project_assignments')
      .where('project_id', project.id)
      .select('*')
      .limit(1); // Remove one person per low priority project
    
    for (const assignment of projectAssignments) {
      removedAssignments.push({
        id: uuidv4(),
        scenario_id: costReductionBranch.id,
        project_id: assignment.project_id,
        person_id: assignment.person_id,
        role_id: assignment.role_id,
        allocation_percentage: 0, // Removed
        assignment_date_mode: 'project',
        change_type: 'removed',
        base_assignment_id: assignment.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }
  
  if (removedAssignments.length > 0) {
    await knex('scenario_project_assignments').insert(removedAssignments);
    console.log(`✅ Removed ${removedAssignments.length} project_assignments in Cost Reduction Branch`);
  }
  
  // 3. Innovation Focus Sandbox - Pause some projects and reassign people
  const innovationSandbox = scenarios[2];
  
  // Mark 5 projects as removed (paused)
  const projectsToPause = projects.slice(5, 10);
  const pausedProjects = projectsToPause.map(p => ({
    id: uuidv4(),
    scenario_id: innovationSandbox.id,
    project_id: p.id,
    change_type: 'removed',
    notes: 'Paused to focus on innovation',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  if (pausedProjects.length > 0) {
    await knex('scenario_projects').insert(pausedProjects);
    console.log(`✅ Paused ${pausedProjects.length} projects in Innovation Sandbox`);
  }
  
  // Reassign people from paused projects to innovation projects
  const innovationProjects = projects.filter(p => 
    p.name.toLowerCase().includes('ai') || 
    p.name.toLowerCase().includes('innovation') ||
    p.name.toLowerCase().includes('research')
  ).slice(0, 3);
  
  if (innovationProjects.length > 0) {
    const innovationAssignments = [];
    
    for (let i = 0; i < 5; i++) {
      const person = people[i % people.length];
      const project = innovationProjects[i % innovationProjects.length];
      const role = roles.find(r => r.name.includes('Developer')) || roles[0];
      
      innovationAssignments.push({
        id: uuidv4(),
        scenario_id: innovationSandbox.id,
        project_id: project.id,
        person_id: person.id,
        role_id: role.id,
        allocation_percentage: 80,
        assignment_date_mode: 'project',
        change_type: 'added',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    await knex('scenario_project_assignments').insert(innovationAssignments);
    console.log(`✅ Added ${innovationAssignments.length} people to innovation projects`);
  }
  
  // Summary
  console.log('\n✅ Scenario seeding completed!');
  console.log('\n📊 Scenarios created:');
  console.log('   1. Current State Baseline - Standard setup');
  console.log('   2. High Velocity Branch - 15 extra project_assignments');
  console.log('   3. Cost Reduction Branch - 5 project_assignments removed');
  console.log('   4. Innovation Focus Sandbox - 5 projects paused, 5 people reassigned');
  console.log('\n🎯 Key visual differences in UI:');
  console.log('   - Dashboard: Project count and utilization metrics will change');
  console.log('   - Assignments: Different number of project_assignments per scenario');
  console.log('   - Reports: Capacity and demand charts will show different patterns');
}