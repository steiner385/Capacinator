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
  // Create tables directly instead of running migrations to avoid ES module issues
  await createTestTables();
}

/**
 * Create test database tables directly
 */
async function createTestTables(): Promise<void> {
  // Create roles table
  await testDb.schema.createTable('roles', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Create people table
  await testDb.schema.createTable('people', (table) => {
    table.uuid('id').primary();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('email').notNullable();
    table.uuid('primary_role_id').references('id').inTable('roles');
    table.string('worker_type').defaultTo('employee');
    table.uuid('supervisor_id').references('id').inTable('people');
    table.string('status').defaultTo('active');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['email']); // Make email indexed but not unique for test flexibility
  });

  // Create project_types table
  await testDb.schema.createTable('project_types', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.uuid('parent_id').references('id').inTable('project_types');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Create projects table
  await testDb.schema.createTable('projects', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.uuid('project_type_id').references('id').inTable('project_types');
    table.string('status').defaultTo('active');
    table.date('start_date');
    table.date('end_date');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Create project_assignments table
  await testDb.schema.createTable('project_assignments', (table) => {
    table.uuid('id').primary();
    table.uuid('person_id').references('id').inTable('people');
    table.uuid('project_id').references('id').inTable('projects');
    table.uuid('role_id').references('id').inTable('roles');
    table.decimal('allocation_percentage', 5, 2).defaultTo(100);
    table.date('start_date');
    table.date('end_date');
    table.text('notes');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Create person_availability_overrides table
  await testDb.schema.createTable('person_availability_overrides', (table) => {
    table.uuid('id').primary();
    table.uuid('person_id').references('id').inTable('people');
    table.date('date').notNullable();
    table.decimal('availability_percentage', 5, 2).defaultTo(100);
    table.text('reason');
    table.timestamps(true, true);
  });

  // Create audit_log table
  await testDb.schema.createTable('audit_log', (table) => {
    table.uuid('id').primary();
    table.string('table_name').notNullable();
    table.uuid('record_id').notNullable();
    table.string('action').notNullable();
    table.string('changed_by');
    table.text('old_values');
    table.text('new_values');
    table.text('changed_fields');
    table.string('request_id');
    table.string('ip_address');
    table.text('user_agent');
    table.text('comment');
    table.timestamp('changed_at').defaultTo(testDb.fn.now());
  });
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
  // Clear in order to respect foreign key constraints
  await testDb('audit_log').del();
  await testDb('project_assignments').del();
  await testDb('person_availability_overrides').del();
  await testDb('projects').del();
  await testDb('project_types').del();
  await testDb('people').del();
  await testDb('roles').del();
}

/**
 * Create a test user
 */
export async function createTestUser(overrides: Partial<any> = {}): Promise<any> {
  // Handle legacy 'name' field for backward compatibility with audit tests
  const processedOverrides = { ...overrides };
  if (processedOverrides.name && !processedOverrides.first_name && !processedOverrides.last_name) {
    const nameParts = processedOverrides.name.split(' ');
    processedOverrides.first_name = nameParts[0] || 'Test';
    processedOverrides.last_name = nameParts.slice(1).join(' ') || 'User';
    delete processedOverrides.name;
  }

  const user = {
    id: uuidv4(),
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    worker_type: 'employee',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...processedOverrides
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