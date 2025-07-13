import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { AuditService, AuditConfig } from '../AuditService.js';
import { testDb, createTestUser } from '../../../__tests__/setup.js';

describe('AuditService', () => {
  let auditService: AuditService;
  let testConfig: AuditConfig;

  beforeEach(() => {
    testConfig = {
      maxHistoryEntries: 5,
      retentionDays: 30,
      sensitiveFields: ['password', 'token', 'secret'],
      enabledTables: ['people', 'projects', 'roles']
    };
    auditService = new AuditService(testDb, testConfig);
  });

  describe('logChange', () => {
    test('should log CREATE operation successfully', async () => {
      const testUser = await createTestUser();
      
      const auditId = await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'CREATE',
        changedBy: 'user-123',
        newValues: { name: 'John Doe', email: 'john@example.com' },
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        comment: 'Created new user'
      });

      expect(auditId).toBeDefined();
      expect(typeof auditId).toBe('string');

      const auditEntry = await testDb('audit_log').where('id', auditId).first();
      expect(auditEntry).toBeDefined();
      expect(auditEntry.table_name).toBe('people');
      expect(auditEntry.record_id).toBe(testUser.id);
      expect(auditEntry.action).toBe('CREATE');
      expect(auditEntry.changed_by).toBe('user-123');
      expect(JSON.parse(auditEntry.new_values)).toEqual({ name: 'John Doe', email: 'john@example.com' });
      expect(auditEntry.old_values).toBeNull();
      expect(auditEntry.changed_fields).toBeNull();
      expect(auditEntry.request_id).toBe('req-123');
      expect(auditEntry.ip_address).toBe('192.168.1.1');
      expect(auditEntry.user_agent).toBe('Test Browser');
      expect(auditEntry.comment).toBe('Created new user');
    });

    test('should log UPDATE operation with changed fields detection', async () => {
      const testUser = await createTestUser();
      const oldValues = { name: 'John Doe', email: 'john@example.com', status: 'active' };
      const newValues = { name: 'Jane Doe', email: 'john@example.com', status: 'inactive' };

      const auditId = await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        changedBy: 'user-123',
        oldValues,
        newValues,
        comment: 'Updated user information'
      });

      const auditEntry = await testDb('audit_log').where('id', auditId).first();
      expect(auditEntry.action).toBe('UPDATE');
      expect(JSON.parse(auditEntry.old_values)).toEqual(oldValues);
      expect(JSON.parse(auditEntry.new_values)).toEqual(newValues);
      
      const changedFields = JSON.parse(auditEntry.changed_fields);
      expect(changedFields).toEqual(['name', 'status']);
      expect(changedFields).not.toContain('email'); // email didn't change
    });

    test('should log DELETE operation', async () => {
      const testUser = await createTestUser();
      const oldValues = { name: 'John Doe', email: 'john@example.com' };

      const auditId = await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'DELETE',
        changedBy: 'user-123',
        oldValues,
        comment: 'Deleted user'
      });

      const auditEntry = await testDb('audit_log').where('id', auditId).first();
      expect(auditEntry.action).toBe('DELETE');
      expect(JSON.parse(auditEntry.old_values)).toEqual(oldValues);
      expect(auditEntry.new_values).toBeNull();
      expect(auditEntry.changed_fields).toBeNull();
    });

    test('should filter sensitive fields', async () => {
      const testUser = await createTestUser();
      const valuesWithSensitiveData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
        token: 'abc-token-xyz',
        status: 'active'
      };

      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'CREATE',
        newValues: valuesWithSensitiveData
      });

      const auditEntry = await testDb('audit_log').where('record_id', testUser.id).first();
      const storedValues = JSON.parse(auditEntry.new_values);
      
      expect(storedValues.name).toBe('John Doe');
      expect(storedValues.email).toBe('john@example.com');
      expect(storedValues.status).toBe('active');
      expect(storedValues.password).toBe('[REDACTED]');
      expect(storedValues.token).toBe('[REDACTED]');
    });

    test('should handle null/undefined values gracefully', async () => {
      const testUser = await createTestUser();

      const auditId = await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'CREATE',
        changedBy: undefined,
        newValues: undefined,
        oldValues: undefined
      });

      const auditEntry = await testDb('audit_log').where('id', auditId).first();
      expect(auditEntry.changed_by).toBeNull();
      expect(auditEntry.new_values).toBeNull();
      expect(auditEntry.old_values).toBeNull();
    });

    test('should auto-cleanup old entries when max history exceeded', async () => {
      const testUser = await createTestUser();
      
      // Create more entries than maxHistoryEntries (5)
      for (let i = 1; i <= 8; i++) {
        await auditService.logChange({
          tableName: 'people',
          recordId: testUser.id,
          action: 'UPDATE',
          newValues: { iteration: i },
          comment: `Update ${i}`
        });
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const entries = await testDb('audit_log')
        .where('table_name', 'people')
        .where('record_id', testUser.id)
        .orderBy('changed_at', 'asc');

      expect(entries.length).toBe(testConfig.maxHistoryEntries); // Should be limited to 5
      
      // Should keep the most recent entries
      const storedValues = entries.map((e: any) => JSON.parse(e.new_values).iteration);
      expect(storedValues).toEqual([4, 5, 6, 7, 8]); // Oldest 3 should be deleted
    });
  });

  describe('getAuditHistory', () => {
    test('should retrieve audit history for a record', async () => {
      const testUser = await createTestUser();
      
      // Create multiple audit entries
      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'CREATE',
        newValues: { name: 'John' }
      });
      
      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        oldValues: { name: 'John' },
        newValues: { name: 'Jane' }
      });

      const history = await auditService.getAuditHistory('people', testUser.id);
      
      expect(history.length).toBe(2);
      expect(history[0].action).toBe('UPDATE'); // Most recent first
      expect(history[1].action).toBe('CREATE');
    });

    test('should limit results when limit specified', async () => {
      const testUser = await createTestUser();
      
      // Create 5 audit entries
      for (let i = 1; i <= 5; i++) {
        await auditService.logChange({
          tableName: 'people',
          recordId: testUser.id,
          action: 'UPDATE',
          newValues: { iteration: i }
        });
      }

      const history = await auditService.getAuditHistory('people', testUser.id, 3);
      expect(history.length).toBe(3);
    });

    test('should return empty array for non-existent record', async () => {
      const history = await auditService.getAuditHistory('people', 'non-existent-id');
      expect(history).toEqual([]);
    });
  });

  describe('getRecentChanges', () => {
    test('should retrieve recent changes across all tables', async () => {
      const user1 = await createTestUser({ id: 'user-1' });
      const user2 = await createTestUser({ id: 'user-2' });
      
      await auditService.logChange({
        tableName: 'people',
        recordId: user1.id,
        action: 'CREATE',
        changedBy: 'admin'
      });
      
      await auditService.logChange({
        tableName: 'people',
        recordId: user2.id,
        action: 'CREATE',
        changedBy: 'admin'
      });

      const changes = await auditService.getRecentChanges();
      expect(changes.length).toBe(2);
    });

    test('should filter by changedBy when specified', async () => {
      const user1 = await createTestUser({ id: 'user-1' });
      const user2 = await createTestUser({ id: 'user-2' });
      
      await auditService.logChange({
        tableName: 'people',
        recordId: user1.id,
        action: 'CREATE',
        changedBy: 'admin'
      });
      
      await auditService.logChange({
        tableName: 'people',
        recordId: user2.id,
        action: 'CREATE',
        changedBy: 'user'
      });

      const adminChanges = await auditService.getRecentChanges('admin');
      expect(adminChanges.length).toBe(1);
      expect(adminChanges[0].changed_by).toBe('admin');
    });

    test('should respect limit and offset parameters', async () => {
      const testUser = await createTestUser();
      
      // Create 10 audit entries
      for (let i = 1; i <= 10; i++) {
        await auditService.logChange({
          tableName: 'people',
          recordId: testUser.id,
          action: 'UPDATE',
          newValues: { iteration: i }
        });
      }

      const firstPage = await auditService.getRecentChanges(undefined, 5, 0);
      const secondPage = await auditService.getRecentChanges(undefined, 5, 5);
      
      expect(firstPage.length).toBe(5);
      expect(secondPage.length).toBe(5);
      
      // Should not overlap
      const firstPageIds = firstPage.map(e => e.id);
      const secondPageIds = secondPage.map(e => e.id);
      expect(firstPageIds.some(id => secondPageIds.includes(id))).toBe(false);
    });
  });

  describe('searchAuditLog', () => {
    beforeEach(async () => {
      // Setup test data
      const user1 = await createTestUser({ id: 'user-1' });
      const user2 = await createTestUser({ id: 'user-2' });
      
      await auditService.logChange({
        tableName: 'people',
        recordId: user1.id,
        action: 'CREATE',
        changedBy: 'admin',
        requestId: 'req-1'
      });
      
      await auditService.logChange({
        tableName: 'people',
        recordId: user2.id,
        action: 'UPDATE',
        changedBy: 'user',
        requestId: 'req-2'
      });
      
      await auditService.logChange({
        tableName: 'projects',
        recordId: 'project-1',
        action: 'DELETE',
        changedBy: 'admin',
        requestId: 'req-3'
      });
    });

    test('should filter by table name', async () => {
      const result = await auditService.searchAuditLog({ tableName: 'people' });
      expect(result.entries.length).toBe(2);
      expect(result.entries.every(e => e.table_name === 'people')).toBe(true);
    });

    test('should filter by action', async () => {
      const result = await auditService.searchAuditLog({ action: 'CREATE' });
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].action).toBe('CREATE');
    });

    test('should filter by changedBy', async () => {
      const result = await auditService.searchAuditLog({ changedBy: 'admin' });
      expect(result.entries.length).toBe(2);
      expect(result.entries.every(e => e.changed_by === 'admin')).toBe(true);
    });

    test('should filter by request ID', async () => {
      const result = await auditService.searchAuditLog({ requestId: 'req-1' });
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].request_id).toBe('req-1');
    });

    test('should combine multiple filters', async () => {
      const result = await auditService.searchAuditLog({
        tableName: 'people',
        changedBy: 'admin'
      });
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].table_name).toBe('people');
      expect(result.entries[0].changed_by).toBe('admin');
    });

    test('should filter by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const result = await auditService.searchAuditLog({
        fromDate: oneHourAgo,
        toDate: oneHourFromNow
      });
      
      expect(result.entries.length).toBe(3); // All entries should be within this range
    });

    test('should return total count', async () => {
      const result = await auditService.searchAuditLog({});
      expect(result.total).toBe(3);
      expect(result.entries.length).toBe(3);
    });

    test('should handle pagination', async () => {
      const result = await auditService.searchAuditLog({
        limit: 2,
        offset: 1
      });
      
      expect(result.entries.length).toBe(2);
      expect(result.total).toBe(3);
    });
  });

  describe('Edge Cases and Corner Cases', () => {
    test('should handle extremely large JSON values', async () => {
      const testUser = await createTestUser();
      const largeObject = {
        data: 'x'.repeat(10000), // 10KB string
        nested: {
          deep: {
            array: new Array(1000).fill('test')
          }
        }
      };

      const auditId = await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        newValues: largeObject
      });

      const auditEntry = await testDb('audit_log').where('id', auditId).first();
      const storedData = JSON.parse(auditEntry.new_values);
      expect(storedData.data.length).toBe(10000);
      expect(storedData.nested.deep.array.length).toBe(1000);
    });

    test('should handle special characters and unicode in values', async () => {
      const testUser = await createTestUser();
      const specialValues = {
        emoji: '🚀💯🎉',
        unicode: 'Héllo Wörld 中文 العربية',
        special: '"quotes" \'apostrophes\' & <tags> / slashes \\ backslashes',
        newlines: 'line1\nline2\r\nline3',
        json: '{"nested": "json"}',
        sql: "'; DROP TABLE users; --"
      };

      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        newValues: specialValues
      });

      const auditEntry = await testDb('audit_log').where('record_id', testUser.id).first();
      const storedValues = JSON.parse(auditEntry.new_values);
      
      expect(storedValues.emoji).toBe('🚀💯🎉');
      expect(storedValues.unicode).toBe('Héllo Wörld 中文 العربية');
      expect(storedValues.special).toBe('"quotes" \'apostrophes\' & <tags> / slashes \\ backslashes');
      expect(storedValues.newlines).toBe('line1\nline2\r\nline3');
      expect(storedValues.json).toBe('{"nested": "json"}');
      expect(storedValues.sql).toBe("'; DROP TABLE users; --");
    });

    test('should handle circular references in objects', async () => {
      const testUser = await createTestUser();
      
      // Create object with circular reference
      const obj: any = { name: 'test' };
      obj.self = obj;

      // Should not crash, but the circular reference handling depends on JSON.stringify behavior
      await expect(auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        newValues: obj
      })).rejects.toThrow(); // JSON.stringify will throw on circular references
    });

    test('should handle concurrent audit log creation', async () => {
      const testUser = await createTestUser();
      
      // Create multiple audit entries concurrently
      const promises = Array.from({ length: 10 }, (_, i) => 
        auditService.logChange({
          tableName: 'people',
          recordId: testUser.id,
          action: 'UPDATE',
          newValues: { iteration: i },
          comment: `Concurrent update ${i}`
        })
      );

      const auditIds = await Promise.all(promises);
      expect(auditIds.length).toBe(10);
      expect(new Set(auditIds).size).toBe(10); // All IDs should be unique

      const entries = await testDb('audit_log')
        .where('table_name', 'people')
        .where('record_id', testUser.id);
      
      expect(entries.length).toBe(testConfig.maxHistoryEntries); // Should respect max history
    });

    test('should handle empty and null object values', async () => {
      const testUser = await createTestUser();

      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        oldValues: {},
        newValues: undefined
      });

      const auditEntry = await testDb('audit_log').where('record_id', testUser.id).first();
      expect(auditEntry.old_values).toBe('{}');
      expect(auditEntry.new_values).toBeNull();
      expect(auditEntry.changed_fields).toBeNull();
    });

    test('should handle very long table and record names', async () => {
      const longTableName = 'very_long_table_name_that_exceeds_normal_limits_' + 'x'.repeat(200);
      const longRecordId = 'very-long-record-id-' + 'y'.repeat(200);

      await auditService.logChange({
        tableName: longTableName,
        recordId: longRecordId,
        action: 'CREATE',
        newValues: { test: 'value' }
      });

      const auditEntry = await testDb('audit_log')
        .where('table_name', longTableName)
        .where('record_id', longRecordId)
        .first();
      
      expect(auditEntry).toBeDefined();
      expect(auditEntry.table_name).toBe(longTableName);
      expect(auditEntry.record_id).toBe(longRecordId);
    });

    test('should detect changes in nested objects', async () => {
      const testUser = await createTestUser();
      const oldValues = {
        profile: { name: 'John', settings: { theme: 'dark', notifications: true } },
        metadata: { created: '2023-01-01' }
      };
      const newValues = {
        profile: { name: 'John', settings: { theme: 'light', notifications: true } },
        metadata: { created: '2023-01-01', modified: '2023-01-02' }
      };

      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        oldValues,
        newValues
      });

      const auditEntry = await testDb('audit_log').where('record_id', testUser.id).first();
      const changedFields = JSON.parse(auditEntry.changed_fields);
      
      expect(changedFields).toContain('profile');
      expect(changedFields).toContain('metadata');
    });

    test('should handle database connection errors gracefully', async () => {
      // Create a new audit service with an invalid database
      const invalidDb = {
        insert: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        count: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        where: jest.fn().mockReturnThis(),
        del: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      } as any;

      const faultyAuditService = new AuditService(invalidDb, testConfig);

      await expect(faultyAuditService.logChange({
        tableName: 'people',
        recordId: 'test-id',
        action: 'CREATE'
      })).rejects.toThrow('Database connection failed');
    });
  });
});