import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  console.log('🧪 Seeding E2E test data...');
  
  // Only seed E2E data in E2E environment
  if (process.env.NODE_ENV !== 'e2e') {
    console.log('⏭️  Skipping E2E test data (not in E2E environment)');
    return;
  }
  
  // Get existing locations for foreign key references
  const existingLocations = await knex('locations').select('*');
  const existingRoles = await knex('roles').select('*');
  
  if (existingLocations.length === 0) {
    throw new Error('Please run location seeds first');
  }

  // Create E2E-specific roles
  const e2eRoleIds = {
    e2eTestRole1: 'e2e-role-0000-0000-000000000001',
    e2eTestRole2: 'e2e-role-0000-0000-000000000002',
    e2eAutomationRole: 'e2e-role-0000-0000-000000000003'
  };

  await knex('roles').insert([
    {
      id: e2eRoleIds.e2eTestRole1,
      name: 'E2E Test Developer',
      description: 'E2E test role for automated testing',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: e2eRoleIds.e2eTestRole2,
      name: 'E2E QA Engineer',
      description: 'E2E quality assurance engineer role',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: e2eRoleIds.e2eAutomationRole,
      name: 'E2E Automation Specialist',
      description: 'E2E automation specialist for test infrastructure',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // Create E2E-specific people
  const e2ePeopleIds = {
    e2eTestUser1: 'e2e-user-0000-0000-000000000001',
    e2eTestUser2: 'e2e-user-0000-0000-000000000002',
    e2eAutomationUser: 'e2e-user-0000-0000-000000000003'
  };

  // First insert the primary person_roles for E2E users
  const e2ePersonRoleIds = {
    e2eTestUser1Role: uuidv4(),
    e2eTestUser2Role: uuidv4(),
    e2eAutomationUserRole: uuidv4()
  };

  await knex('person_roles').insert([
    {
      id: e2ePersonRoleIds.e2eTestUser1Role,
      person_id: e2ePeopleIds.e2eTestUser1,
      role_id: e2eRoleIds.e2eTestRole1,
      proficiency_level: 5
    },
    {
      id: e2ePersonRoleIds.e2eTestUser2Role,
      person_id: e2ePeopleIds.e2eTestUser2,
      role_id: e2eRoleIds.e2eTestRole2,
      proficiency_level: 4
    },
    {
      id: e2ePersonRoleIds.e2eAutomationUserRole,
      person_id: e2ePeopleIds.e2eAutomationUser,
      role_id: e2eRoleIds.e2eAutomationRole,
      proficiency_level: 5
    }
  ]);

  // Now insert the people with references to their primary person_roles
  await knex('people').insert([
    {
      id: e2ePeopleIds.e2eTestUser1,
      name: 'E2E Test User Alpha',
      email: 'e2e.test.alpha@test.com',
      primary_person_role_id: e2ePersonRoleIds.e2eTestUser1Role,
      location_id: existingLocations.find(l => l.name === 'Remote')?.id || existingLocations[0].id,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: e2ePeopleIds.e2eTestUser2,
      name: 'E2E Test User Beta',
      email: 'e2e.test.beta@test.com',
      primary_person_role_id: e2ePersonRoleIds.e2eTestUser2Role,
      location_id: existingLocations.find(l => l.name === 'San Francisco')?.id || existingLocations[0].id,
      worker_type: 'Contractor',
      default_availability_percentage: 80,
      default_hours_per_day: 6,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: e2ePeopleIds.e2eAutomationUser,
      name: 'E2E Automation Tester',
      email: 'e2e.automation@test.com',
      primary_person_role_id: e2ePersonRoleIds.e2eAutomationUserRole,
      location_id: existingLocations.find(l => l.name === 'New York City')?.id || existingLocations[0].id,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // Add additional roles for E2E users to test multiple role functionality
  await knex('person_roles').insert([
    {
      id: uuidv4(),
      person_id: e2ePeopleIds.e2eTestUser1,
      role_id: existingRoles.find(r => r.name === 'Frontend Developer')?.id || existingRoles[0].id,
      proficiency_level: 3
    },
    {
      id: uuidv4(),
      person_id: e2ePeopleIds.e2eTestUser2,
      role_id: existingRoles.find(r => r.name === 'Backend Developer')?.id || existingRoles[0].id,
      proficiency_level: 4
    },
    {
      id: uuidv4(),
      person_id: e2ePeopleIds.e2eAutomationUser,
      role_id: existingRoles.find(r => r.name === 'DevOps Engineer')?.id || existingRoles[0].id,
      proficiency_level: 5
    }
  ]);

  console.log('✅ E2E test data seeding completed!');
  console.log(`   👥 E2E People: 3 (Alpha, Beta, Automation Tester)`);
  console.log(`   🎭 E2E Roles: 3 (Test Developer, QA Engineer, Automation Specialist)`);
  console.log(`   🔗 Additional role assignments: 3`);
  console.log(`   🧪 Ready for comprehensive E2E testing!`);
}