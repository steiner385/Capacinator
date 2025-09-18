import knex from 'knex';
import path from 'path';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Create test database connection with proper paths
const testDb = knex({
  client: 'better-sqlite3',
  connection: {
    filename: ':memory:' // Use in-memory database for tests
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.resolve('src/server/database/migrations'),
    loadExtensions: ['.ts', '.js'] // Support both TS and JS files
  },
  seeds: {
    directory: path.resolve('src/server/database/seeds'),
    loadExtensions: ['.ts', '.js']
  }
});

// Run migrations before all integration tests
beforeAll(async () => {
  console.log('Setting up test database...');
  try {
    // Read and execute test schema SQL
    const fs = await import('fs/promises');
    const schemaPath = path.resolve('tests/integration/test-schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      await testDb.raw(statement);
    }
    
    console.log('Test database schema created');
    
    // Add some basic seed data if needed
    const hasRoles = await testDb('roles').count('* as count').first();
    if (!hasRoles || hasRoles.count === 0) {
      await testDb('roles').insert([
        { id: 'role-1', name: 'Developer', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'role-2', name: 'Designer', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'role-3', name: 'Project Manager', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      ]);
      console.log('Test database seeded with basic data');
    }
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(async () => {
  try {
    await testDb.destroy();
    console.log('Test database connection closed');
  } catch (error) {
    console.error('Failed to close database connection:', error);
  }
});

// Export test database for use in tests
export { testDb as db };