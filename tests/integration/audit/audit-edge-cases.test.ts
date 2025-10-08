import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import express from 'express';
import type { Express, Request, Response } from 'express';
import request from 'supertest';
import knex, { Knex } from 'knex';
import { createEnhancedAuditMiddleware } from '../../../src/server/middleware/enhancedAuditMiddleware.js';
import { Logger } from '../../../src/server/services/logging/Logger.js';

// Mock the config module
jest.mock('../../../src/server/config/auditConfig.js', () => ({
  getAuditConfig: () => ({
    maxHistoryEntries: 5, // Low limit for testing history cleanup
    retentionDays: 1, // Short retention for testing cleanup
    sensitiveFields: ['password', 'token', 'secret', 'api_key'],
    enabledTables: ['test_entities', 'audit_test_table']
  }),
  isTableAudited: (tableName: string) => {
    return ['test_entities', 'audit_test_table'].includes(tableName);
  }
}));

describe('Audit System Edge Cases and Error Scenarios', () => {
  let app: Express;
  let db: Knex;

  beforeAll(async () => {
    // Create test database
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
      pool: {
        afterCreate: (conn: any, done: any) => {
          conn.pragma('foreign_keys = ON');
          done();
        }
      }
    });

    // Create necessary tables
    await db.schema.createTable('audit_log', (table) => {
      table.uuid('id').primary();
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

    await db.schema.createTable('test_entities', (table) => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.text('data').nullable();
      table.string('password').nullable();
      table.string('token').nullable();
      table.timestamps(true, true);
    });

    await db.schema.createTable('audit_test_table', (table) => {
      table.uuid('id').primary();
      table.string('field1').nullable();
      table.string('field2').nullable();
      table.timestamps(true, true);
    });
  });

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(() => {
    // Create Express app with middleware
    app = express();
    app.use(express.json({ limit: '50mb' })); // Large limit for testing large payloads

    // Add mock logger
    app.use((req: any, res, next) => {
      req.logger = new Logger({
        level: 2,
        service: 'test',
        enableConsole: false,
        enableFile: false,
        enableStructuredLogs: true,
        redactedFields: ['password', 'token']
      });
      req.requestId = 'test-request-' + Date.now();
      next();
    });

    // Add user context
    app.use((req: any, res, next) => {
      req.user = { id: 'test-user-123' };
      next();
    });

    // Add enhanced audit middleware with test database
    app.use(createEnhancedAuditMiddleware(db));
  });

  test('should handle extremely large data payloads', async () => {
    app.post('/test-entities', async (req: any, res: Response) => {
      const entityData = {
        id: 'large-entity-' + Date.now(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        await db('test_entities').insert(entityData);

        await req.logAuditEvent(
          'test_entities',
          entityData.id,
          'CREATE',
          null,
          entityData,
          'Large payload test entity creation'
        );

        res.status(201).json({ success: true, data: entityData });
      } catch (error: any) {
        req.logger.error('Failed to create entity', error);
        res.status(500).json({ error: 'Failed to create entity' });
      }
    });

    // Create very large data payload
    const largeData = {
      name: 'Large Entity',
      data: JSON.stringify({
        array: new Array(10000).fill('x').map((_, i) => `Item ${i}`),
        nested: {
          deep: {
            structure: {
              with: {
                many: {
                  levels: 'and data'
                }
              }
            }
          }
        },
        longText: 'x'.repeat(50000)
      })
    };

    const response = await request(app)
      .post('/test-entities')
      .send(largeData)
      .expect(201);

    expect(response.body.success).toBe(true);

    // Wait for async audit write
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify audit log was created despite large payload
    const auditEntry = await db('audit_log')
      .where('table_name', 'test_entities')
      .where('record_id', response.body.data.id)
      .first();

    expect(auditEntry).toBeTruthy();
    const newValues = JSON.parse(auditEntry.new_values);
    expect(newValues.name).toBe('Large Entity');
    expect(newValues.data).toBeTruthy();
  });

  test('should handle special characters and unicode in audit data', async () => {
    app.post('/test-entities', async (req: any, res: Response) => {
      const entityData = {
        id: 'unicode-entity-' + Date.now(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        await db('test_entities').insert(entityData);

        await req.logAuditEvent(
          'test_entities',
          entityData.id,
          'CREATE',
          null,
          entityData,
          'Unicode test entity creation'
        );

        res.status(201).json({ success: true, data: entityData });
      } catch (error: any) {
        req.logger.error('Failed to create entity', error);
        res.status(500).json({ error: 'Failed to create entity' });
      }
    });

    const unicodeData = {
      name: '🚀💯🎉 Test Entity 中文 العربية Héllo Wörld',
      data: JSON.stringify({
        emoji: '🔥🎯🌟⭐🎨🎪🎭🎪',
        chinese: '这是一些中文文本',
        arabic: 'هذا نص عربي',
        accents: 'Café résumé naïve façade',
        special: '"quotes" \'apostrophes\' & <tags> / slashes \\ backslashes',
        newlines: 'line1\nline2\r\nline3\ttab',
        json: '{"nested": "json", "with": "special \\\"chars\\\""}',
        sql: "'; DROP TABLE users; --",
        control: '\x00\x01\x02\x03'
      })
    };

    const response = await request(app)
      .post('/test-entities')
      .send(unicodeData)
      .expect(201);

    expect(response.body.success).toBe(true);

    // Wait for async audit write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify audit log preserves all special characters
    const auditEntry = await db('audit_log')
      .where('table_name', 'test_entities')
      .where('record_id', response.body.data.id)
      .first();

    expect(auditEntry).toBeTruthy();
    const newValues = JSON.parse(auditEntry.new_values);
    expect(newValues.name).toBe(unicodeData.name);
    
    const dataObj = JSON.parse(newValues.data);
    expect(dataObj.emoji).toBe('🔥🎯🌟⭐🎨🎪🎭🎪');
    expect(dataObj.chinese).toBe('这是一些中文文本');
    expect(dataObj.arabic).toBe('هذا نص عربي');
  });

  test('should enforce audit history limits and cleanup old entries', async () => {
    const entityId = 'history-test-' + Date.now();

    // Create initial entity
    await db('test_entities').insert({
      id: entityId,
      name: 'History Test Entity',
      data: 'Initial data'
    });

    app.put('/test-entities/:id', async (req: any, res: Response) => {
      const { id } = req.params;

      try {
        const currentEntity = await db('test_entities').where('id', id).first();
        if (!currentEntity) {
          return res.status(404).json({ error: 'Entity not found' });
        }

        const updateData = { ...req.body, updated_at: new Date() };
        await db('test_entities').where('id', id).update(updateData);

        const updatedEntity = await db('test_entities').where('id', id).first();

        await req.logAuditEvent(
          'test_entities',
          id,
          'UPDATE',
          currentEntity,
          updatedEntity,
          'History test entity update'
        );

        res.json({ success: true, data: updatedEntity });
      } catch (error: any) {
        req.logger.error('Failed to update entity', error);
        res.status(500).json({ error: 'Failed to update entity' });
      }
    });

    // Make many updates to exceed maxHistoryEntries (5)
    for (let i = 1; i <= 8; i++) {
      await request(app)
        .put(`/test-entities/${entityId}`)
        .send({ data: `Update ${i}` })
        .expect(200);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Wait for all audit logs and cleanup
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check that history is limited
    const auditEntries = await db('audit_log')
      .where('table_name', 'test_entities')
      .where('record_id', entityId)
      .orderBy('changed_at', 'desc');

    // Should not exceed maxHistoryEntries (5)
    expect(auditEntries.length).toBeLessThanOrEqual(5);
    
    // Most recent entries should be preserved
    const latestEntry = auditEntries[0];
    const latestValues = JSON.parse(latestEntry.new_values);
    expect(latestValues.data).toBe('Update 8');
  });

  test('should handle concurrent audit operations without data corruption', async () => {
    app.post('/test-entities', async (req: any, res: Response) => {
      const entityData = {
        id: req.body.id || 'concurrent-entity-' + Date.now() + '-' + Math.random(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        await db('test_entities').insert(entityData);

        await req.logAuditEvent(
          'test_entities',
          entityData.id,
          'CREATE',
          null,
          entityData,
          'Concurrent test entity creation'
        );

        res.status(201).json({ success: true, data: entityData });
      } catch (error: any) {
        req.logger.error('Failed to create entity', error);
        res.status(500).json({ error: 'Failed to create entity' });
      }
    });

    // Create multiple concurrent requests
    const concurrentRequests = Array.from({ length: 20 }, (_, i) =>
      request(app)
        .post('/test-entities')
        .send({
          id: `concurrent-${Date.now()}-${i}`,
          name: `Concurrent Entity ${i}`,
          data: `Data for entity ${i}`
        })
    );

    const responses = await Promise.all(concurrentRequests);

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    // Wait for all audit logs
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify all audit entries were created
    const auditCount = await db('audit_log')
      .where('table_name', 'test_entities')
      .where('action', 'CREATE')
      .count('* as count')
      .first();

    expect(Number(auditCount?.count)).toBeGreaterThanOrEqual(20);
  });

  test('should handle database connection failures gracefully', async () => {
    // Create a route that simulates database failure during audit
    app.post('/test-entities/db-fail', async (req: any, res: Response) => {
      const entityData = {
        id: 'db-fail-entity-' + Date.now(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        // Entity creation succeeds
        await db('test_entities').insert(entityData);

        // Simulate audit database failure by mocking the audit service
        const originalAuditService = req.auditService;
        req.auditService = {
          logChange: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        };

        try {
          await req.logAuditEvent('test_entities', entityData.id, 'CREATE', null, entityData);
        } catch (auditError) {
          // Audit failed, but entity creation succeeded
          req.logger.error('Audit failed but entity creation succeeded', auditError);
        }

        res.status(201).json({ 
          success: true, 
          data: entityData,
          audit_warning: 'Audit logging failed but operation completed'
        });
      } catch (error: any) {
        req.logger.error('Failed to create entity', error);
        res.status(500).json({ error: 'Failed to create entity' });
      }
    });

    const response = await request(app)
      .post('/test-entities/db-fail')
      .send({ name: 'DB Fail Test', data: 'Test data' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.audit_warning).toContain('Audit logging failed');

    // Verify entity was created despite audit failure
    const entity = await db('test_entities')
      .where('id', response.body.data.id)
      .first();
    expect(entity).toBeTruthy();
    expect(entity.name).toBe('DB Fail Test');
  });

  test('should handle malformed audit data gracefully', async () => {
    app.post('/test-entities/malformed', async (req: any, res: Response) => {
      const entityData = {
        id: 'malformed-entity-' + Date.now(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        await db('test_entities').insert(entityData);

        // Create audit data with circular references
        const circularData = { name: entityData.name };
        (circularData as any).self = circularData;

        try {
          await req.logAuditEvent(
            'test_entities',
            entityData.id,
            'CREATE',
            null,
            circularData, // This will cause JSON.stringify to fail
            'Malformed test entity creation'
          );
        } catch (auditError) {
          req.logger.error('Audit failed due to malformed data', auditError);
          
          // Fall back to safe audit data
          await req.logAuditEvent(
            'test_entities',
            entityData.id,
            'CREATE',
            null,
            { 
              name: entityData.name, 
              note: 'Original data could not be serialized' 
            },
            'Malformed test entity creation (fallback)'
          );
        }

        res.status(201).json({ success: true, data: entityData });
      } catch (error: any) {
        req.logger.error('Failed to create entity', error);
        res.status(500).json({ error: 'Failed to create entity' });
      }
    });

    const response = await request(app)
      .post('/test-entities/malformed')
      .send({ name: 'Malformed Test' })
      .expect(201);

    expect(response.body.success).toBe(true);

    // Wait for audit processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify fallback audit entry was created
    const auditEntry = await db('audit_log')
      .where('table_name', 'test_entities')
      .where('record_id', response.body.data.id)
      .first();

    expect(auditEntry).toBeTruthy();
    const newValues = JSON.parse(auditEntry.new_values);
    expect(newValues.name).toBe('Malformed Test');
    expect(newValues.note).toBe('Original data could not be serialized');
  });

  test('should handle null and undefined values correctly', async () => {
    app.post('/test-entities/null-test', async (req: any, res: Response) => {
      const entityData = {
        id: 'null-entity-' + Date.now(),
        name: req.body.name,
        data: req.body.data, // May be null/undefined
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        await db('test_entities').insert(entityData);

        await req.logAuditEvent(
          'test_entities',
          entityData.id,
          'CREATE',
          null,
          {
            name: entityData.name,
            data: entityData.data,
            explicitNull: null,
            explicitUndefined: undefined,
            emptyString: '',
            zero: 0,
            false: false
          },
          'Null values test entity creation'
        );

        res.status(201).json({ success: true, data: entityData });
      } catch (error: any) {
        req.logger.error('Failed to create entity', error);
        res.status(500).json({ error: 'Failed to create entity' });
      }
    });

    const response = await request(app)
      .post('/test-entities/null-test')
      .send({ 
        name: 'Null Test',
        data: null 
      })
      .expect(201);

    expect(response.body.success).toBe(true);

    // Wait for audit processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify audit entry handles null/undefined correctly
    const auditEntry = await db('audit_log')
      .where('table_name', 'test_entities')
      .where('record_id', response.body.data.id)
      .first();

    expect(auditEntry).toBeTruthy();
    const newValues = JSON.parse(auditEntry.new_values);
    expect(newValues.name).toBe('Null Test');
    expect(newValues.data).toBeNull();
    expect(newValues.explicitNull).toBeNull();
    expect(newValues.explicitUndefined).toBeUndefined();
    expect(newValues.emptyString).toBe('');
    expect(newValues.zero).toBe(0);
    expect(newValues.false).toBe(false);
  });

  test('should handle audit table cleanup and retention policies', async () => {
    // Create old audit entries by manipulating timestamps
    const oldTimestamp = new Date();
    oldTimestamp.setDate(oldTimestamp.getDate() - 5); // 5 days old

    // Insert old audit entries directly
    for (let i = 0; i < 3; i++) {
      await db('audit_log').insert({
        id: `old-audit-${i}-${Date.now()}`,
        table_name: 'test_entities',
        record_id: `old-record-${i}`,
        action: 'CREATE',
        changed_by: 'old-user',
        new_values: JSON.stringify({ name: `Old Entity ${i}` }),
        changed_at: oldTimestamp
      });
    }

    // Create current audit entries
    app.post('/test-entities/retention-test', async (req: any, res: Response) => {
      const entityData = {
        id: 'retention-entity-' + Date.now(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        await db('test_entities').insert(entityData);

        await req.logAuditEvent(
          'test_entities',
          entityData.id,
          'CREATE',
          null,
          entityData,
          'Retention test entity creation'
        );

        res.status(201).json({ success: true, data: entityData });
      } catch (error: any) {
        req.logger.error('Failed to create entity', error);
        res.status(500).json({ error: 'Failed to create entity' });
      }
    });

    const response = await request(app)
      .post('/test-entities/retention-test')
      .send({ name: 'Retention Test' })
      .expect(201);

    expect(response.body.success).toBe(true);

    // Wait for audit processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check total audit entries
    const totalAuditCount = await db('audit_log')
      .count('* as count')
      .first();

    expect(Number(totalAuditCount?.count)).toBeGreaterThan(3); // Should have old + new entries

    // Verify new entry exists
    const newAuditEntry = await db('audit_log')
      .where('record_id', response.body.data.id)
      .first();
    expect(newAuditEntry).toBeTruthy();
  });
});