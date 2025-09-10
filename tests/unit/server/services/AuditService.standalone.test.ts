import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

import { AuditService, AuditConfig } from '../../../../src/server/services/audit/AuditService';
import knex, { Knex } from 'knex';

// No setup file interference here

describe('AuditService - Standalone Tests', () => {
  let db: Knex;
  let auditService: AuditService;
  let testConfig: AuditConfig;

  beforeEach(async () => {
    // Create in-memory database
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true
    });

    // Create audit_log table manually
    await db.schema.createTable('audit_log', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
      table.string('table_name').notNullable();
      table.string('record_id').notNullable();
      table.enum('action', ['CREATE', 'UPDATE', 'DELETE']).notNullable();
      table.string('changed_by').nullable();
      table.text('old_values').nullable();
      table.text('new_values').nullable();
      table.text('changed_fields').nullable();
      table.string('request_id').nullable();
      table.string('ip_address').nullable();
      table.string('user_agent').nullable();
      table.text('comment').nullable();
      table.timestamp('changed_at').defaultTo(db.fn.now());
      
      table.index(['table_name', 'record_id']);
      table.index('changed_at');
    });

    testConfig = {
      maxHistoryEntries: 10,
      retentionDays: 30,
      sensitiveFields: ['password', 'token'],
      enabledTables: ['people', 'projects', 'roles']
    };

    auditService = new AuditService(db, testConfig);
  });

  afterEach(async () => {
    if (db) {
      await db.destroy();
    }
  });

  test('should log a simple CREATE operation', async () => {
    const auditId = await auditService.logChange({
      tableName: 'people',
      recordId: 'user-123',
      action: 'CREATE',
      changedBy: 'admin',
      newValues: { name: 'John Doe', email: 'john@example.com' },
      comment: 'Created new user'
    });

    expect(auditId).toBeDefined();
    expect(typeof auditId).toBe('string');

    const auditEntry = await db('audit_log').where('id', auditId).first();
    expect(auditEntry).toBeDefined();
    expect(auditEntry.table_name).toBe('people');
    expect(auditEntry.record_id).toBe('user-123');
    expect(auditEntry.action).toBe('CREATE');
    expect(auditEntry.changed_by).toBe('admin');
    expect(auditEntry.comment).toBe('Created new user');
    
    const storedValues = JSON.parse(auditEntry.new_values);
    expect(storedValues.name).toBe('John Doe');
    expect(storedValues.email).toBe('john@example.com');
  });

  test('should log UPDATE operation with field detection', async () => {
    const oldValues = { name: 'John Doe', email: 'john@example.com', status: 'active' };
    const newValues = { name: 'Jane Doe', email: 'john@example.com', status: 'inactive' };

    const auditId = await auditService.logChange({
      tableName: 'people',
      recordId: 'user-123',
      action: 'UPDATE',
      changedBy: 'admin',
      oldValues,
      newValues
    });

    const auditEntry = await db('audit_log').where('id', auditId).first();
    expect(auditEntry.action).toBe('UPDATE');
    
    const changedFields = JSON.parse(auditEntry.changed_fields);
    expect(changedFields).toEqual(['name', 'status']);
    expect(changedFields).not.toContain('email');
  });

  test('should filter sensitive fields', async () => {
    const valuesWithSensitive = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'secret123',
      token: 'abc-token-xyz'
    };

    const auditId = await auditService.logChange({
      tableName: 'people',
      recordId: 'user-123',
      action: 'CREATE',
      newValues: valuesWithSensitive
    });

    const auditEntry = await db('audit_log').where('id', auditId).first();
    const storedValues = JSON.parse(auditEntry.new_values);
    
    expect(storedValues.name).toBe('John Doe');
    expect(storedValues.email).toBe('john@example.com');
    expect(storedValues.password).toBe('[REDACTED]');
    expect(storedValues.token).toBe('[REDACTED]');
  });

  test('should retrieve audit history', async () => {
    // Create multiple audit entries
    await auditService.logChange({
      tableName: 'people',
      recordId: 'user-123',
      action: 'CREATE',
      newValues: { name: 'John' }
    });
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));
    
    await auditService.logChange({
      tableName: 'people',
      recordId: 'user-123',
      action: 'UPDATE',
      oldValues: { name: 'John' },
      newValues: { name: 'Jane' }
    });

    const history = await auditService.getAuditHistory('people', 'user-123');
    
    expect(history.length).toBe(2);
    expect(history[0].action).toBe('UPDATE'); // Most recent first
    expect(history[1].action).toBe('CREATE');
  });

  test('should get recent changes', async () => {
    await auditService.logChange({
      tableName: 'people',
      recordId: 'user-1',
      action: 'CREATE',
      changedBy: 'admin'
    });
    
    await auditService.logChange({
      tableName: 'people',
      recordId: 'user-2',
      action: 'CREATE',
      changedBy: 'user'
    });

    const allChanges = await auditService.getRecentChanges();
    expect(allChanges.length).toBe(2);

    const adminChanges = await auditService.getRecentChanges('admin');
    expect(adminChanges.length).toBe(1);
    expect(adminChanges[0].changed_by).toBe('admin');
  });

  test('should search audit log with filters', async () => {
    await auditService.logChange({
      tableName: 'people',
      recordId: 'user-1',
      action: 'CREATE',
      changedBy: 'admin'
    });
    
    await auditService.logChange({
      tableName: 'projects',
      recordId: 'project-1',
      action: 'UPDATE',
      changedBy: 'user'
    });

    const result = await auditService.searchAuditLog({ tableName: 'people' });
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].table_name).toBe('people');

    const result2 = await auditService.searchAuditLog({ changedBy: 'admin' });
    expect(result2.entries.length).toBe(1);
    expect(result2.entries[0].changed_by).toBe('admin');
  });
});