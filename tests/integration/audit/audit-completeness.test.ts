import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../setup.js';
import { createAuditedDatabase } from '../../../src/server/database/AuditedDatabase.js';
import { AuditService } from '../../../src/server/services/audit/AuditService.js';
import { getAuditConfig } from '../../../src/server/config/auditConfig.js';

describe('Audit Completeness Tests', () => {
  let auditedDb: any;
  let auditService: any;

  beforeAll(async () => {
    // Create audit service using test database
    auditService = new AuditService(db, getAuditConfig());
    
    // Create audited database wrapper using test database
    auditedDb = createAuditedDatabase(db, auditService);

    // Ensure audit log table exists
    const hasAuditTable = await db.schema.hasTable('audit_log');
    if (!hasAuditTable) {
      console.warn('Audit log table does not exist - some tests may fail');
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await db('audit_log').where('changed_by', 'test-user').del();
      await db('people').where('email', 'like', '%audit-test%').del();
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  test('AuditedDatabase should automatically log INSERT operations', async () => {
    // Create a test record
    const testPerson = {
      id: 'audit-test-person-1',
      name: 'Audit Test User',
      email: 'audit-test@example.com',
      created_at: new Date(),
      updated_at: new Date()
    };

    // Set audit context
    auditedDb.setDefaultContext({
      userId: 'test-user',
      requestId: 'test-request-1',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent'
    });

    // Insert using audited database
    await auditedDb('people').insert(testPerson);

    // Verify audit log entry was created
    const auditEntries = await db('audit_log')
      .where('table_name', 'people')
      .where('record_id', testPerson.id)
      .where('action', 'CREATE');

    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0].changed_by).toBe('test-user');
    expect(auditEntries[0].request_id).toBe('test-request-1');
    
    const newValues = JSON.parse(auditEntries[0].new_values);
    expect(newValues.name).toBe(testPerson.name);
    expect(newValues.email).toBe(testPerson.email);
  });

  test('AuditedDatabase should automatically log UPDATE operations', async () => {
    // Create a test record first
    const testPerson = {
      id: 'audit-test-person-2',
      name: 'Audit Test User 2',
      email: 'audit-test-2@example.com',
      created_at: new Date(),
      updated_at: new Date()
    };

    await auditedDb('people').insert(testPerson);

    // Update the record
    const updateData = {
      name: 'Updated Audit Test User 2',
      updated_at: new Date()
    };

    await auditedDb('people')
      .where('id', testPerson.id)
      .update(updateData);

    // Verify audit log entry for update
    const auditEntries = await db('audit_log')
      .where('table_name', 'people')
      .where('record_id', testPerson.id)
      .where('action', 'UPDATE');

    expect(auditEntries).toHaveLength(1);
    
    const oldValues = JSON.parse(auditEntries[0].old_values);
    const newValues = JSON.parse(auditEntries[0].new_values);
    
    expect(oldValues.name).toBe('Audit Test User 2');
    expect(newValues.name).toBe('Updated Audit Test User 2');
  });

  test('AuditedDatabase should automatically log DELETE operations', async () => {
    // Create a test record first
    const testPerson = {
      id: 'audit-test-person-3',
      name: 'Audit Test User 3',
      email: 'audit-test-3@example.com',
      created_at: new Date(),
      updated_at: new Date()
    };

    await auditedDb('people').insert(testPerson);

    // Delete the record
    await auditedDb('people')
      .where('id', testPerson.id)
      .delete();

    // Verify audit log entry for delete
    const auditEntries = await db('audit_log')
      .where('table_name', 'people')
      .where('record_id', testPerson.id)
      .where('action', 'DELETE');

    expect(auditEntries).toHaveLength(1);
    
    const oldValues = JSON.parse(auditEntries[0].old_values);
    expect(oldValues.name).toBe('Audit Test User 3');
    expect(oldValues.email).toBe('audit-test-3@example.com');
    expect(auditEntries[0].new_values).toBeNull();
  });

  test('AuditedDatabase should respect skipAudit flag', async () => {
    const testPerson = {
      id: 'audit-test-person-4',
      name: 'Skip Audit Test User',
      email: 'audit-test-skip@example.com',
      created_at: new Date(),
      updated_at: new Date()
    };

    // Insert with skipAudit flag
    await auditedDb('people').skipAudit().insert(testPerson);

    // Verify no audit log entry was created
    const auditEntries = await db('audit_log')
      .where('table_name', 'people')
      .where('record_id', testPerson.id);

    expect(auditEntries).toHaveLength(0);
  });

  test('AuditedDatabase should handle non-audited tables correctly', async () => {
    // Try to insert into a table that's not in the audit configuration
    // This should work but not create audit entries
    
    // First check if we have a non-audited table to test with
    const hasTestTable = await db.schema.hasTable('locations');
    
    if (hasTestTable) {
      const testLocation = {
        id: 'audit-test-location-1',
        name: 'Test Location',
        created_at: new Date(),
        updated_at: new Date()
      };

      await auditedDb('locations').insert(testLocation);

      // Verify no audit log entry for non-audited table
      const auditEntries = await db('audit_log')
        .where('table_name', 'locations')
        .where('record_id', testLocation.id);

      expect(auditEntries).toHaveLength(0);

      // Clean up
      await db('locations').where('id', testLocation.id).del();
    }
  });

  test('Audit service should be accessible through AuditedDatabase', async () => {
    expect(auditService).toBeDefined();
    expect(typeof auditService.logChange).toBe('function');
    
    // Test direct audit logging
    const auditId = await auditService.logChange({
      tableName: 'test_table',
      recordId: 'test-record-1',
      action: 'CREATE',
      changedBy: 'test-user',
      newValues: { test: 'value' },
      comment: 'Direct audit test'
    });

    expect(auditId).toBeDefined();
    expect(typeof auditId).toBe('string');
  });
});