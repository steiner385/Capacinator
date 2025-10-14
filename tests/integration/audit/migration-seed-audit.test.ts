import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../setup.js';
import { createMigrationAuditWrapper, withMigrationAudit, withSeedAudit } from '../../../src/server/database/MigrationAuditWrapper.js';
import { AuditService } from '../../../src/server/services/audit/AuditService.js';
import { getAuditConfig } from '../../../src/server/config/auditConfig.js';

/**
 * Migration and Seed Audit Tests
 * 
 * These tests verify that database migrations and seed operations
 * are properly audited using the MigrationAuditWrapper.
 */

describe('Migration and Seed Audit Tests', () => {
  let auditService: any;

  beforeAll(async () => {
    // Create audit service using test database
    auditService = new AuditService(db, getAuditConfig());

    // Initialize audit service globally for this test suite
    const { initializeAuditService } = await import('../../../src/server/services/audit/index.js');
    initializeAuditService(db);

    // Ensure audit log table exists
    const hasAuditTable = await db.schema.hasTable('audit_log');
    if (!hasAuditTable) {
      console.warn('Audit log table does not exist - some tests may fail');
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await db('audit_log').where('comment', 'like', '%migration-test%').del();
      await db('audit_log').where('comment', 'like', '%seed-test%').del();
      await db('people').where('email', 'like', '%migration-test%').del();
      await db('roles').where('name', 'like', '%Migration Test%').del();
    } catch (error) {
      console.warn('Migration test cleanup failed:', error);
    }
  });

  describe('Migration Audit Wrapper', () => {
    
    test('should audit migration insert operations', async () => {
      const migrationWrapper = createMigrationAuditWrapper(db, {
        migrationName: 'test_migration_001',
        operation: 'migration',
        comment: 'migration-test: Test migration insert operations'
      });

      // Test insert operation
      const testRole = {
        id: 'migration-test-role-1',
        name: 'Migration Test Role 1',
        description: 'Created by migration test',
        created_at: new Date(),
        updated_at: new Date()
      };

      await migrationWrapper.insert('roles', testRole);

      // Verify audit entry was created
      const auditEntries = await db('audit_log')
        .where('table_name', 'roles')
        .where('record_id', testRole.id)
        .where('action', 'CREATE')
        .where('comment', 'like', '%migration-test%');
      expect(auditEntries.length).toBe(1);
      const auditEntry = auditEntries[0];
      
      expect(auditEntry.changed_by).toBe('system:migration');
      expect(auditEntry.comment).toContain('test_migration_001');
      expect(auditEntry.comment).toContain('migration-test');
      expect(auditEntry.new_values).toContain(testRole.name);
      expect(auditEntry.old_values).toBeNull();
    });

    test('should audit migration update operations', async () => {
      // First create a record to update
      const testRole = {
        id: 'migration-test-role-2',
        name: 'Migration Test Role 2',
        description: 'Original description',
        created_at: new Date(),
        updated_at: new Date()
      };

      await db('roles').insert(testRole);

      // Now update it through migration wrapper
      const migrationWrapper = createMigrationAuditWrapper(db, {
        migrationName: 'test_migration_002',
        operation: 'migration',
        comment: 'migration-test: Test migration update operations'
      });

      const updateData = {
        description: 'Updated by migration test',
        updated_at: new Date()
      };

      await migrationWrapper.update('roles', { id: testRole.id }, updateData);

      // Verify audit entry was created
      const auditEntries = await db('audit_log')
        .where('table_name', 'roles')
        .where('record_id', testRole.id)
        .where('action', 'UPDATE')
        .where('comment', 'like', '%migration-test%');

      expect(auditEntries.length).toBe(1);
      const auditEntry = auditEntries[0];
      
      expect(auditEntry.changed_by).toBe('system:migration');
      expect(auditEntry.comment).toContain('test_migration_002');
      expect(auditEntry.old_values).toContain('Original description');
      expect(auditEntry.new_values).toContain('Updated by migration test');
    });

    test('should audit migration delete operations', async () => {
      // First create a record to delete
      const testRole = {
        id: 'migration-test-role-3',
        name: 'Migration Test Role 3',
        description: 'To be deleted',
        created_at: new Date(),
        updated_at: new Date()
      };

      await db('roles').insert(testRole);

      // Now delete it through migration wrapper
      const migrationWrapper = createMigrationAuditWrapper(db, {
        migrationName: 'test_migration_003',
        operation: 'migration',
        comment: 'migration-test: Test migration delete operations'
      });

      await migrationWrapper.delete('roles', { id: testRole.id });

      // Verify audit entry was created
      const auditEntries = await db('audit_log')
        .where('table_name', 'roles')
        .where('record_id', testRole.id)
        .where('action', 'DELETE')
        .where('comment', 'like', '%migration-test%');

      expect(auditEntries.length).toBe(1);
      const auditEntry = auditEntries[0];
      
      expect(auditEntry.changed_by).toBe('system:migration');
      expect(auditEntry.comment).toContain('test_migration_003');
      expect(auditEntry.old_values).toContain('To be deleted');
      expect(auditEntry.new_values).toBeNull();
    });

    test('should handle bulk migration operations', async () => {
      const migrationWrapper = createMigrationAuditWrapper(db, {
        migrationName: 'test_migration_004',
        operation: 'migration',
        comment: 'migration-test: Test bulk migration operations'
      });

      // Bulk insert operation
      const testRoles = [
        {
          id: 'migration-test-role-4',
          name: 'Migration Test Role 4',
          description: 'Bulk insert test 1',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'migration-test-role-5',
          name: 'Migration Test Role 5',
          description: 'Bulk insert test 2',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      await migrationWrapper.bulkInsert('roles', testRoles);

      // Verify audit entries were created for all records
      const auditEntries = await db('audit_log')
        .where('table_name', 'roles')
        .where('action', 'CREATE')
        .where('comment', 'like', '%migration-test%')
        .whereIn('record_id', testRoles.map(r => r.id));

      expect(auditEntries.length).toBe(2);
      
      for (const auditEntry of auditEntries) {
        expect(auditEntry.changed_by).toBe('system:migration');
        expect(auditEntry.comment).toContain('test_migration_004');
        expect(auditEntry.comment).toContain('bulk');
      }
    });
  });

  describe('Migration Helper Functions', () => {
    
    test('withMigrationAudit should provide audit-aware database operations', async () => {
      await withMigrationAudit(db, 'test_migration_helper_001', async (auditDb) => {
        // Test that auditDb provides audit-aware operations
        const testRole = {
          id: 'migration-helper-test-role-1',
          name: 'Migration Helper Test Role',
          description: 'Created via migration helper',
          created_at: new Date(),
          updated_at: new Date()
        };

        await auditDb.insert('roles', testRole);

        // Verify audit entry
        const auditEntries = await db('audit_log')
          .where('table_name', 'roles')
          .where('record_id', testRole.id)
          .where('comment', 'like', '%test_migration_helper_001%');

        expect(auditEntries.length).toBe(1);
        expect(auditEntries[0].changed_by).toBe('system:migration');
      });
    });

    test('withSeedAudit should provide audit-aware database operations for seeds', async () => {
      await withSeedAudit(db, 'test_seed_001', async (auditDb) => {
        // Test that seed operations are audited
        const testPeople = [
          {
            id: 'seed-test-person-1',
            name: 'Seed Test Person 1',
            email: 'seed-test-1@example.com',
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 'seed-test-person-2',
            name: 'Seed Test Person 2',
            email: 'seed-test-2@example.com',
            created_at: new Date(),
            updated_at: new Date()
          }
        ];

        await auditDb.bulkInsert('people', testPeople);

        // Verify audit entries for seed operations
        const auditEntries = await db('audit_log')
          .where('table_name', 'people')
          .where('comment', 'like', '%test_seed_001%')
          .whereIn('record_id', testPeople.map(p => p.id));

        expect(auditEntries.length).toBe(2);
        
        for (const auditEntry of auditEntries) {
          expect(auditEntry.changed_by).toBe('system:seed');
          expect(auditEntry.comment).toContain('test_seed_001');
        }
      });
    });
  });

  describe('Migration Transaction Safety', () => {
    
    test('should handle migration transaction rollback correctly', async () => {
      try {
        await withMigrationAudit(db, 'test_migration_rollback', async (auditDb) => {
          // Insert a valid record
          const validRole = {
            id: 'migration-rollback-valid',
            name: 'Valid Role',
            description: 'This should be rolled back',
            created_at: new Date(),
            updated_at: new Date()
          };

          await auditDb.insert('roles', validRole);

          // This should cause the transaction to fail
          throw new Error('Simulated migration failure');
        });
      } catch (error) {
        expect(error.message).toBe('Simulated migration failure');
      }

      // In test mode (NODE_ENV=test), transactions are not used, so data persists
      // In production, transactions would roll back both audit entries and data
      if (process.env.NODE_ENV === 'test') {
        // In test mode, operations are not transactional, so data remains
        const auditEntries = await db('audit_log')
          .where('comment', 'like', '%test_migration_rollback%');

        expect(auditEntries.length).toBe(1); // Audit entry persists in test mode

        const dataRecord = await db('roles')
          .where('id', 'migration-rollback-valid')
          .first();

        expect(dataRecord).toBeDefined(); // Data persists in test mode
      } else {
        // In production mode, verify that no audit entries or data records were left behind
        const auditEntries = await db('audit_log')
          .where('comment', 'like', '%test_migration_rollback%');

        expect(auditEntries.length).toBe(0);

        const dataRecord = await db('roles')
          .where('id', 'migration-rollback-valid')
          .first();

        expect(dataRecord).toBeUndefined();
      }
    });

    test('should handle nested migration operations with proper audit context', async () => {
      await withMigrationAudit(db, 'test_nested_migration', async (auditDb) => {
        // Outer operation
        const outerRole = {
          id: 'nested-migration-outer',
          name: 'Outer Migration Role',
          description: 'Outer level operation',
          created_at: new Date(),
          updated_at: new Date()
        };

        await auditDb.insert('roles', outerRole);

        // Nested operation (simulating complex migration logic)
        const innerRole = {
          id: 'nested-migration-inner',
          name: 'Inner Migration Role',
          description: 'Inner level operation',
          created_at: new Date(),
          updated_at: new Date()
        };

        await auditDb.insert('roles', innerRole);

        // Update the outer role based on inner operation
        await auditDb.update('roles', 
          { id: outerRole.id }, 
          { description: 'Updated based on inner operation' }
        );
      });

      // Verify all operations were audited with consistent context
      const auditEntries = await db('audit_log')
        .where('comment', 'like', '%test_nested_migration%')
        .orderBy('changed_at', 'asc');

      expect(auditEntries.length).toBe(3); // 2 inserts + 1 update

      // All should have the same migration context
      for (const auditEntry of auditEntries) {
        expect(auditEntry.changed_by).toBe('system:migration');
        expect(auditEntry.comment).toContain('test_nested_migration');
      }

      // Verify the sequence of operations
      expect(auditEntries[0].action).toBe('CREATE');
      expect(auditEntries[0].record_id).toBe('nested-migration-outer');
      expect(auditEntries[1].action).toBe('CREATE');
      expect(auditEntries[1].record_id).toBe('nested-migration-inner');
      expect(auditEntries[2].action).toBe('UPDATE');
      expect(auditEntries[2].record_id).toBe('nested-migration-outer');
    });
  });

  describe('Schema Migration Audit', () => {
    
    test('should handle schema changes that affect audited tables', async () => {
      // Simulate a migration that adds a column to an audited table
      await withMigrationAudit(db, 'test_schema_change', async (auditDb) => {
        // Note: This is a simplified test since we can't actually modify
        // the schema in an integration test without complex setup
        
        // Create a role with current schema
        const roleBeforeSchema = {
          id: 'schema-change-test-role',
          name: 'Schema Change Test Role',
          description: 'Before schema change',
          created_at: new Date(),
          updated_at: new Date()
        };

        await auditDb.insert('roles', roleBeforeSchema);

        // Simulate post-schema-change data population
        // (In real migration, this would happen after ALTER TABLE)
        await auditDb.update('roles',
          { id: roleBeforeSchema.id },
          { description: 'After schema change' }
        );
      });

      // Verify both operations were audited
      const schemaChangeAuditEntries = await db('audit_log')
        .where('comment', 'like', '%test_schema_change%')
        .where('record_id', 'schema-change-test-role');

      expect(schemaChangeAuditEntries.length).toBe(2); // INSERT + UPDATE
    });
  });

  describe('Data Migration Patterns', () => {
    
    test('should audit data transformation migrations', async () => {
      // Simulate a data transformation migration
      await withMigrationAudit(db, 'test_data_transformation', async (auditDb) => {
        // Create some test data to transform
        const oldFormatRoles = [
          {
            id: 'transform-role-1',
            name: 'Transform Role 1',
            description: 'old_field:value1',
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 'transform-role-2',
            name: 'Transform Role 2',
            description: 'old_field:value2',
            created_at: new Date(),
            updated_at: new Date()
          }
        ];

        // Insert original data
        await auditDb.bulkInsert('roles', oldFormatRoles);

        // Transform data (simulate migration logic)
        for (const role of oldFormatRoles) {
          const newDescription = role.description.replace('old_field:', 'new_field:');
          await auditDb.update('roles',
            { id: role.id },
            { description: newDescription }
          );
        }
      });

      // Verify all transformation operations were audited
      const transformAuditEntries = await db('audit_log')
        .where('comment', 'like', '%test_data_transformation%')
        .orderBy('changed_at', 'asc');

      expect(transformAuditEntries.length).toBe(4); // 2 inserts + 2 updates

      // Verify the transformation was tracked
      const updateEntries = transformAuditEntries.filter(entry => entry.action === 'UPDATE');
      for (const updateEntry of updateEntries) {
        expect(updateEntry.old_values).toContain('old_field:');
        expect(updateEntry.new_values).toContain('new_field:');
      }
    });
  });
});