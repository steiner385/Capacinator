import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  console.log('🌱 Seeding E2E test data...');
  
  // Clear existing data in reverse order of dependencies
  await knex.raw('PRAGMA foreign_keys = OFF');
  
  const tablesToClear = [
    'scenario_merge_conflicts',
    'scenario_project_assignments', 
    'scenario_project_phases',
    'scenario_projects',
    'scenarios',
    'project_assignments',
    'project_phases_timeline',
    'project_demands',
    'person_availability',
    'person_roles',
    'resource_templates',
    'projects',
    'people',
    'project_phases',
    'project_sub_types',
    'project_types',
    'roles',
    'locations'
  ];
  
  for (const table of tablesToClear) {
    try {
      await knex(table).del();
    } catch (error) {
      // Table might not exist, continue
    }
  }
  
  await knex.raw('PRAGMA foreign_keys = ON');
  
  // Seed locations
  await knex('locations').insert([
    {
      id: 'loc-e2e-001',
      name: 'E2E Test Office',
      description: 'Primary office for E2E testing',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'loc-e2e-002', 
      name: 'E2E Remote',
      description: 'Remote work location for E2E testing',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  
  // Seed roles
  await knex('roles').insert([
    {
      id: 'role-e2e-001',
      name: 'E2E Developer',
      description: 'Software developer for E2E tests',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'role-e2e-002',
      name: 'E2E Designer',
      description: 'UI/UX designer for E2E tests',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'role-e2e-003',
      name: 'E2E Manager',
      description: 'Project manager for E2E tests',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  
  // Seed project types
  await knex('project_types').insert([
    {
      id: 'ptype-e2e-001',
      name: 'E2E Web Development',
      description: 'Web development projects for E2E testing',
      color_code: '#3B82F6',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'ptype-e2e-002',
      name: 'E2E Mobile Development', 
      description: 'Mobile development projects for E2E testing',
      color_code: '#10B981',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  
  // Seed project sub types
  await knex('project_sub_types').insert([
    {
      id: 'psub-e2e-001',
      project_type_id: 'ptype-e2e-001',
      name: 'E2E Frontend',
      description: 'Frontend web development',
      color_code: '#60A5FA',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'psub-e2e-002',
      project_type_id: 'ptype-e2e-001',
      name: 'E2E Backend',
      description: 'Backend web development',
      color_code: '#3B82F6',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  
  // Seed project phases
  await knex('project_phases').insert([
    {
      id: 'phase-e2e-001',
      name: 'E2E Planning',
      description: 'Project planning phase',
      order_index: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'phase-e2e-002',
      name: 'E2E Development',
      description: 'Development phase',
      order_index: 2,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'phase-e2e-003',
      name: 'E2E Testing',
      description: 'Testing phase',
      order_index: 3,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  
  // Seed people
  await knex('people').insert([
    {
      id: 'person-e2e-001',
      name: 'E2E Test User 1',
      email: 'e2e-user1@example.com',
      primary_role_id: 'role-e2e-001',
      worker_type: 'FTE',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'person-e2e-002',
      name: 'E2E Test User 2',
      email: 'e2e-user2@example.com',
      primary_role_id: 'role-e2e-002',
      worker_type: 'FTE',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'person-e2e-003',
      name: 'E2E Test Manager',
      email: 'e2e-manager@example.com',
      primary_role_id: 'role-e2e-003',
      worker_type: 'FTE',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  
  // Seed projects
  await knex('projects').insert([
    {
      id: 'project-e2e-001',
      name: 'E2E Test Project 1',
      project_sub_type_id: 'psub-e2e-001',
      location_id: 'loc-e2e-001',
      priority: 1,
      description: 'First E2E test project',
      aspiration_start: '2024-01-01',
      aspiration_finish: '2024-03-31',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'project-e2e-002',
      name: 'E2E Test Project 2',
      project_sub_type_id: 'psub-e2e-002',
      location_id: 'loc-e2e-002',
      priority: 2,
      description: 'Second E2E test project',
      aspiration_start: '2024-02-01',
      aspiration_finish: '2024-05-31',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  
  // Seed baseline scenario
  await knex('scenarios').insert([
    {
      id: 'scenario-e2e-baseline',
      name: 'E2E Baseline Plan',
      description: 'Baseline scenario for E2E testing',
      parent_scenario_id: null,
      created_by: 'person-e2e-001',
      status: 'active',
      scenario_type: 'baseline',
      branch_point: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'scenario-e2e-branch1',
      name: 'E2E Branch Scenario 1',
      description: 'First branch scenario for E2E testing',
      parent_scenario_id: 'scenario-e2e-baseline',
      created_by: 'person-e2e-002',
      status: 'active',
      scenario_type: 'branch',
      branch_point: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  
  // Seed resource templates
  await knex('resource_templates').insert([
    {
      id: 'template-e2e-001',
      project_sub_type_id: 'psub-e2e-001',
      phase_id: 'phase-e2e-001',
      role_id: 'role-e2e-001',
      allocation_percentage: 80.0,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'template-e2e-002',
      project_sub_type_id: 'psub-e2e-001',
      phase_id: 'phase-e2e-002',
      role_id: 'role-e2e-001',
      allocation_percentage: 90.0,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  
  console.log('✅ E2E test data seeded successfully');
}