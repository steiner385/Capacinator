import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import knex, { Knex } from 'knex';
import { promises as fs } from 'fs';
import path from 'path';

// Test database configuration
const testDbConfig: Knex.Config = {
  client: 'better-sqlite3',
  connection: {
    filename: ':memory:', // Use in-memory database for tests
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(process.cwd(), 'src/server/database/migrations'),
    extension: 'ts',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: path.join(process.cwd(), 'src/server/database/seeds'),
    extension: 'ts'
  }
};

export let testDb: Knex;

beforeAll(async () => {
  // Create test database connection
  testDb = knex(testDbConfig);
  
  // Run migrations
  await testDb.migrate.latest();
  
  console.log('Test database setup completed');
});

afterAll(async () => {
  if (testDb) {
    await testDb.destroy();
  }
});

beforeEach(async () => {
  // Clean up audit log table before each test
  if (testDb && await testDb.schema.hasTable('audit_log')) {
    await testDb('audit_log').del();
  }
  
  // Clean up test data tables
  const tables = ['people', 'projects', 'roles', 'locations', 'project_types'];
  for (const table of tables) {
    if (await testDb.schema.hasTable(table)) {
      await testDb(table).del();
    }
  }
});

// Global test utilities
export const createTestUser = async (overrides: any = {}) => {
  const [user] = await testDb('people').insert({
    id: overrides.id || 'test-user-1',
    name: overrides.name || 'Test User',
    email: overrides.email || 'test@example.com',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  }).returning('*');
  return user;
};

export const createTestRole = async (overrides: any = {}) => {
  const [role] = await testDb('roles').insert({
    id: overrides.id || 'test-role-1',
    name: overrides.name || 'Test Role',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  }).returning('*');
  return role;
};

export const createTestProject = async (overrides: any = {}) => {
  const [project] = await testDb('projects').insert({
    id: overrides.id || 'test-project-1',
    name: overrides.name || 'Test Project',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  }).returning('*');
  return project;
};