import { describe, test, expect } from '@jest/globals';
import { db } from './setup';

describe('Test Database Connection', () => {
  test('should connect to test database', async () => {
    const result = await db.raw('SELECT 1 as test');
    expect(result).toBeDefined();
  });

  test('should have required tables', async () => {
    // Check if tables exist
    const tables = ['projects', 'people', 'roles', 'project_assignments'];
    
    for (const table of tables) {
      const exists = await db.schema.hasTable(table);
      expect(exists).toBe(true);
    }
  });

  test('should allow CRUD operations', async () => {
    // Test insert
    const testId = 'test-' + Date.now();
    await db('roles').insert({
      id: testId,
      name: 'Test Role',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Test select
    const role = await db('roles').where('id', testId).first();
    expect(role).toBeDefined();
    expect(role.name).toBe('Test Role');

    // Test update
    await db('roles').where('id', testId).update({ name: 'Updated Role' });
    const updatedRole = await db('roles').where('id', testId).first();
    expect(updatedRole.name).toBe('Updated Role');

    // Test delete
    await db('roles').where('id', testId).del();
    const deletedRole = await db('roles').where('id', testId).first();
    expect(deletedRole).toBeUndefined();
  });
});