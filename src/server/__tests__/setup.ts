/**
 * Test Setup Utilities
 * 
 * This module provides utilities for setting up and managing test databases,
 * creating test data, and handling test-specific database operations.
 */

import knex, { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

// Create test database instance
export const testDb: Knex = knex({
  client: 'better-sqlite3',
  connection: {
    filename: ':memory:'
  },
  useNullAsDefault: true,
  migrations: {
    directory: './src/server/database/migrations'
  }
});

/**
 * Initialize test database with tables
 */
export async function setupTestDatabase(): Promise<void> {
  // Run migrations to create tables
  await testDb.migrate.latest();
}

/**
 * Clean up test database
 */
export async function teardownTestDatabase(): Promise<void> {
  await testDb.destroy();
}

/**
 * Clear all data from test tables
 */
export async function clearTestData(): Promise<void> {
  await testDb('audit_log').del();
  await testDb('project_assignments').del();
  await testDb('person_availability_overrides').del();
  await testDb('projects').del();
  await testDb('roles').del();
  await testDb('people').del();
}

/**
 * Create a test user
 */
export async function createTestUser(overrides: Partial<any> = {}): Promise<any> {
  const user = {
    id: uuidv4(),
    name: 'Test User',
    email: 'test@example.com',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };

  await testDb('people').insert(user);
  return user;
}

/**
 * Create a test role
 */
export async function createTestRole(overrides: Partial<any> = {}): Promise<any> {
  const role = {
    id: uuidv4(),
    name: 'Test Role',
    description: 'A test role',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };

  await testDb('roles').insert(role);
  return role;
}

/**
 * Create a test project
 */
export async function createTestProject(overrides: Partial<any> = {}): Promise<any> {
  const project = {
    id: uuidv4(),
    name: 'Test Project',
    description: 'A test project',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };

  await testDb('projects').insert(project);
  return project;
}

/**
 * Setup hook for Jest
 */
beforeAll(async () => {
  await setupTestDatabase();
});

/**
 * Cleanup hook for Jest
 */
afterAll(async () => {
  await teardownTestDatabase();
});

/**
 * Clear data before each test
 */
beforeEach(async () => {
  await clearTestData();
});