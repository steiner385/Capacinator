import { db } from './setup';
import { Request, Response } from 'express';

// Mock Express request/response for controller tests
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    user: { id: 'test-user' },
    ...overrides
  };
}

export function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis() as any,
    json: jest.fn().mockReturnThis() as any,
    send: jest.fn().mockReturnThis() as any,
    setHeader: jest.fn().mockReturnThis() as any,
  };
  return res;
}

// Helper to clean database before tests
export async function cleanDatabase() {
  const tables = [
    'scenario_merge_conflicts',
    'scenario_project_assignments', 
    'scenario_project_phases',
    'scenario_projects',
    'scenarios',
    'project_phase_dependencies',
    'project_phases_timeline',
    'project_assignments',
    'assignments',
    'person_availability_overrides',
    'audit_log',
    'project_phases',
    'projects',
    'people',
    'roles',
    'locations',
    'project_types',
    'project_sub_types',
    'notifications',
    'user_permissions',
    'user_permission_overrides'
  ];

  for (const table of tables) {
    try {
      if (await db.schema.hasTable(table)) {
        await db(table).del();
      }
    } catch (error) {
      // Ignore errors for non-existent tables
    }
  }
}

// Helper to create test data
export async function createTestData() {
  const testData = {
    roleId: 'role-test-1',
    personId: 'person-test-1',
    projectId: 'project-test-1',
    locationId: 'location-test-1',
    projectTypeId: 'type-test-1'
  };

  // Create location
  await db('locations').insert({
    id: testData.locationId,
    name: 'Test Location',
    created_at: new Date(),
    updated_at: new Date()
  });

  // Create project type
  await db('project_types').insert({
    id: testData.projectTypeId,
    name: 'Test Type',
    created_at: new Date(),
    updated_at: new Date()
  });

  // Create role
  await db('roles').insert({
    id: testData.roleId,
    name: 'Test Role',
    created_at: new Date(),
    updated_at: new Date()
  });

  // Create person
  await db('people').insert({
    id: testData.personId,
    name: 'Test Person',
    email: 'test@example.com',
    location_id: testData.locationId,
    default_availability_percentage: 100,
    created_at: new Date(),
    updated_at: new Date()
  });

  // Create project
  await db('projects').insert({
    id: testData.projectId,
    name: 'Test Project',
    project_type_id: testData.projectTypeId,
    location_id: testData.locationId,
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'test-user'
  });

  return testData;
}

export { db };