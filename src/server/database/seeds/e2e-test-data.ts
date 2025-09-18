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
    'person_availability_overrides',
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
  
  // Seed people (without primary_person_role_id first)
  await knex('people').insert([
    {
      id: 'person-e2e-001',
      name: 'E2E Test User 1',
      email: 'e2e-user1@example.com',
      worker_type: 'FTE',
      location_id: 'loc-e2e-001',
      default_availability_percentage: 100,
      default_hours_per_day: 8,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'person-e2e-002',
      name: 'E2E Test User 2',
      email: 'e2e-user2@example.com',
      worker_type: 'FTE',
      location_id: 'loc-e2e-001',
      default_availability_percentage: 100,
      default_hours_per_day: 8,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'person-e2e-003',
      name: 'E2E Test Manager',
      email: 'e2e-manager@example.com',
      worker_type: 'FTE',
      location_id: 'loc-e2e-001',
      default_availability_percentage: 100,
      default_hours_per_day: 8,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  
  // Seed person_roles
  await knex('person_roles').insert([
    {
      id: 'person-role-e2e-001',
      person_id: 'person-e2e-001',
      role_id: 'role-e2e-001',
      proficiency_level: 3,
      is_primary: true
    },
    {
      id: 'person-role-e2e-002',
      person_id: 'person-e2e-002',
      role_id: 'role-e2e-002',
      proficiency_level: 3,
      is_primary: true
    },
    {
      id: 'person-role-e2e-003',
      person_id: 'person-e2e-003',
      role_id: 'role-e2e-003',
      proficiency_level: 3,
      is_primary: true
    }
  ]);
  
  // Update people with primary_person_role_id
  await knex('people').where('id', 'person-e2e-001').update({ primary_person_role_id: 'person-role-e2e-001' });
  await knex('people').where('id', 'person-e2e-002').update({ primary_person_role_id: 'person-role-e2e-002' });
  await knex('people').where('id', 'person-e2e-003').update({ primary_person_role_id: 'person-role-e2e-003' });
  
  // Seed projects
  await knex('projects').insert([
    {
      id: 'project-e2e-001',
      name: 'E2E Test Project 1',
      project_sub_type_id: 'psub-e2e-001',
      location_id: 'loc-e2e-001',
      priority: 1,
      description: 'First E2E test project',
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
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  
  // Set up dates for timeline
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextTwoWeeks = new Date(today);
  nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  
  // Seed project phases timeline
  await knex('project_phases_timeline').insert([
    {
      id: 'timeline-e2e-001',
      project_id: 'project-e2e-001',
      phase_id: 'phase-e2e-001',
      start_date: today,
      end_date: nextWeek,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'timeline-e2e-002',
      project_id: 'project-e2e-001',
      phase_id: 'phase-e2e-002',
      start_date: nextWeek,
      end_date: nextTwoWeeks,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'timeline-e2e-003',
      project_id: 'project-e2e-002',
      phase_id: 'phase-e2e-001',
      start_date: today,
      end_date: nextMonth,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  
  // Seed person availability overrides
  
  await knex('person_availability_overrides').insert([
    {
      id: 'avail-e2e-001',
      person_id: 'person-e2e-001',
      start_date: today,
      end_date: nextMonth,
      availability_percentage: 100,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'avail-e2e-002',
      person_id: 'person-e2e-002',
      start_date: today,
      end_date: nextMonth,
      availability_percentage: 100,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'avail-e2e-003',
      person_id: 'person-e2e-003',
      start_date: today,
      end_date: nextMonth,
      availability_percentage: 100,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  
  // Seed project assignments
  await knex('project_assignments').insert([
    {
      id: 'assign-e2e-001',
      project_id: 'project-e2e-001',
      person_id: 'person-e2e-001',
      role_id: 'role-e2e-001',
      start_date: today,
      end_date: nextMonth,
      allocation_percentage: 80,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'assign-e2e-002',
      project_id: 'project-e2e-002',
      person_id: 'person-e2e-002',
      role_id: 'role-e2e-002',
      start_date: today,
      end_date: nextMonth,
      allocation_percentage: 60,
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