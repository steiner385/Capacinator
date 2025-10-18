import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

import { AuditService, AuditConfig } from '../../../../src/server/services/audit/AuditService';
import knex, { Knex } from 'knex';

describe('AuditService - Simple Tests', () => {
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

    // Create audit_log table
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
    await db.destroy();
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

  test('should cleanup expired entries', async () => {
    // Create an old entry (35 days ago, beyond retention)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 35);

    await db('audit_log').insert({
      id: 'old-entry',
      table_name: 'people',
      record_id: 'user-1',
      action: 'CREATE',
      changed_at: oldDate
    });

    // Create a recent entry (10 days ago, within retention)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 10);

    await db('audit_log').insert({
      id: 'recent-entry',
      table_name: 'people',
      record_id: 'user-2',
      action: 'CREATE',
      changed_at: recentDate
    });

    const deletedCount = await auditService.cleanupExpiredEntries();

    expect(deletedCount).toBe(1);

    const remaining = await db('audit_log').select('*');
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe('recent-entry');
  });

  test('should get audit statistics', async () => {
    await auditService.logChange({
      tableName: 'people',
      recordId: 'user-1',
      action: 'CREATE',
      changedBy: 'admin'
    });

    await auditService.logChange({
      tableName: 'people',
      recordId: 'user-1',
      action: 'UPDATE',
      changedBy: 'admin'
    });

    await auditService.logChange({
      tableName: 'projects',
      recordId: 'project-1',
      action: 'CREATE',
      changedBy: 'user'
    });

    const stats = await auditService.getAuditStats();

    expect(stats.totalEntries).toBe(3);
    expect(stats.entriesByAction.CREATE).toBe(2);
    expect(stats.entriesByAction.UPDATE).toBe(1);
    expect(stats.entriesByTable.people).toBe(2);
    expect(stats.entriesByTable.projects).toBe(1);
    expect(stats.oldestEntry).toBeDefined();
    expect(stats.newestEntry).toBeDefined();
  });

  test('should get audit entry by ID', async () => {
    const auditId = await auditService.logChange({
      tableName: 'people',
      recordId: 'user-123',
      action: 'CREATE',
      changedBy: 'admin',
      newValues: { name: 'John Doe' }
    });

    const entry = await auditService.getAuditEntryById(auditId);

    expect(entry).toBeDefined();
    expect(entry?.id).toBe(auditId);
    expect(entry?.table_name).toBe('people');
    expect(entry?.record_id).toBe('user-123');
    expect(entry?.action).toBe('CREATE');

    const nonExistent = await auditService.getAuditEntryById('non-existent-id');
    expect(nonExistent).toBeNull();
  });

  test('should get audit summary by table', async () => {
    await auditService.logChange({
      tableName: 'people',
      recordId: 'user-1',
      action: 'CREATE'
    });

    await auditService.logChange({
      tableName: 'people',
      recordId: 'user-2',
      action: 'UPDATE'
    });

    await auditService.logChange({
      tableName: 'projects',
      recordId: 'project-1',
      action: 'CREATE'
    });

    const summary = await auditService.getAuditSummaryByTable();

    expect(summary.people).toBeDefined();
    expect(summary.people.CREATE).toBe(1);
    expect(summary.people.UPDATE).toBe(1);
    expect(summary.people.DELETE).toBe(0);

    expect(summary.projects).toBeDefined();
    expect(summary.projects.CREATE).toBe(1);

    expect(summary.roles).toBeDefined();
    expect(summary.roles.CREATE).toBe(0);
  });

  test('should get audit timeline by hour', async () => {
    const start = new Date();
    start.setHours(start.getHours() - 2);

    await auditService.logChange({
      tableName: 'people',
      recordId: 'user-1',
      action: 'CREATE'
    });

    await auditService.logChange({
      tableName: 'people',
      recordId: 'user-2',
      action: 'CREATE'
    });

    const end = new Date();
    const timeline = await auditService.getAuditTimeline(start, end, 'hour');

    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline[0]).toHaveProperty('timestamp');
    expect(timeline[0]).toHaveProperty('action_count');
  });

  test('should get audit timeline by day', async () => {
    const start = new Date();
    start.setDate(start.getDate() - 7);

    await auditService.logChange({
      tableName: 'people',
      recordId: 'user-1',
      action: 'CREATE'
    });

    const end = new Date();
    const timeline = await auditService.getAuditTimeline(start, end, 'day');

    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline[0].timestamp).toBeDefined();
    expect(timeline[0].action_count).toBeGreaterThan(0);
  });

  test('should get user activity', async () => {
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
      changedBy: 'admin'
    });

    await auditService.logChange({
      tableName: 'projects',
      recordId: 'project-1',
      action: 'CREATE',
      changedBy: 'user1'
    });

    const activity = await auditService.getUserActivity();

    expect(activity.admin).toBeDefined();
    expect(activity.admin.total_actions).toBe(2);
    expect(activity.admin.last_activity).toBeDefined();

    expect(activity.user1).toBeDefined();
    expect(activity.user1.total_actions).toBe(1);
  });

  test('should get actual change history excluding undo operations', async () => {
    await auditService.logChange({
      tableName: 'people',
      recordId: 'user-1',
      action: 'CREATE',
      newValues: { name: 'John' }
    });

    await new Promise(resolve => setTimeout(resolve, 5));

    await auditService.logChange({
      tableName: 'people',
      recordId: 'user-1',
      action: 'DELETE',
      oldValues: { name: 'John' },
      comment: 'Undo CREATE operation (audit_id: test)'
    });

    await new Promise(resolve => setTimeout(resolve, 5));

    await auditService.logChange({
      tableName: 'people',
      recordId: 'user-1',
      action: 'UPDATE',
      oldValues: { name: 'John' },
      newValues: { name: 'Jane' }
    });

    const actualHistory = await auditService.getActualChangeHistory('people', 'user-1');

    expect(actualHistory.length).toBe(2);
    expect(actualHistory[0].action).toBe('UPDATE');
    expect(actualHistory[1].action).toBe('CREATE');
    expect(actualHistory.every(entry => !entry.comment || !entry.comment.includes('Undo'))).toBe(true);
  });
});