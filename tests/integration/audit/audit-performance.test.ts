import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import express from 'express';
import type { Express, Request, Response } from 'express';
import request from 'supertest';
import knex, { Knex } from 'knex';
import { createEnhancedAuditMiddleware } from '../../../src/server/middleware/enhancedAuditMiddleware.js';
import { Logger } from '../../../src/server/services/logging/Logger.js';

// Mock the config module for performance testing
jest.mock('../../../src/server/config/auditConfig.js', () => ({
  getAuditConfig: () => ({
    maxHistoryEntries: 100, // Higher limit for performance testing
    retentionDays: 30,
    sensitiveFields: ['password', 'token'],
    enabledTables: ['performance_test_entities']
  }),
  isTableAudited: (tableName: string) => {
    return ['performance_test_entities'].includes(tableName);
  }
}));

// Detect CI environment for adjusted test configuration
const isCI = process.env.CI === 'true' || process.env.JENKINS_URL !== undefined;

describe('Audit System Performance and Load Tests', () => {
  let app: Express;
  let db: Knex;

  // Set timeout for performance tests (3 minutes to allow memory tests to complete)
  jest.setTimeout(180000);

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
      table.index('request_id');
    });

    await db.schema.createTable('performance_test_entities', (table) => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.text('data').nullable();
      table.integer('version').defaultTo(1);
      table.timestamps(true, true);
    });
  });

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(() => {
    // Create Express app with middleware
    app = express();
    app.use(express.json({ limit: '100mb' }));

    // Add mock logger
    app.use((req: any, res, next) => {
      req.logger = new Logger({
        level: 2,
        service: 'performance-test',
        enableConsole: false,
        enableFile: false,
        enableStructuredLogs: true,
        redactedFields: ['password', 'token']
      });
      req.requestId = 'perf-request-' + Date.now() + '-' + Math.random();
      next();
    });

    // Add user context
    app.use((req: any, res, next) => {
      req.user = { id: 'performance-user-123' };
      next();
    });

    // Add enhanced audit middleware with test database
    app.use(createEnhancedAuditMiddleware(db));
  });

  test('should handle high-frequency audit operations efficiently', async () => {
    app.post('/performance-entities', async (req: any, res: Response) => {
      const entityData = {
        id: req.body.id || 'perf-entity-' + Date.now() + '-' + Math.random(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        await db('performance_test_entities').insert(entityData);

        await req.logAuditEvent(
          'performance_test_entities',
          entityData.id,
          'CREATE',
          null,
          entityData,
          'High-frequency performance test entity creation'
        );

        res.status(201).json({ success: true, data: entityData });
      } catch (error: any) {
        req.logger.error('Failed to create entity', error);
        res.status(500).json({ error: 'Failed to create entity' });
      }
    });

    const startTime = Date.now();
    // Reduce request count in CI to account for slower runners
    const numberOfRequests = isCI ? 50 : 100;
    
    // Create many concurrent requests
    const requests = Array.from({ length: numberOfRequests }, (_, i) =>
      request(app)
        .post('/performance-entities')
        .send({
          id: `perf-${Date.now()}-${i}`,
          name: `Performance Entity ${i}`,
          data: JSON.stringify({ 
            iteration: i, 
            timestamp: Date.now(),
            payload: 'x'.repeat(1000) // 1KB payload per request
          })
        })
    );

    const responses = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // All requests should succeed
    responses.forEach((response, index) => {
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    // Performance requirements
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    const requestsPerSecond = numberOfRequests / (duration / 1000);
    console.log(`Performance: ${requestsPerSecond.toFixed(2)} requests/second, ${duration}ms total`);

    // Wait for all audit logs to be written
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify all audit entries were created
    const auditCount = await db('audit_log')
      .where('table_name', 'performance_test_entities')
      .where('action', 'CREATE')
      .count('* as count')
      .first();

    expect(Number(auditCount?.count)).toBe(numberOfRequests);
  });

  test('should handle large bulk operations with grouped audit logs', async () => {
    app.post('/performance-entities/bulk', async (req: any, res: Response) => {
      const { entities } = req.body;
      const results = [];
      const bulkRequestId = req.requestId;

      try {
        const startTime = Date.now();

        for (const entity of entities) {
          const entityData = {
            id: entity.id || 'bulk-entity-' + Date.now() + '-' + Math.random(),
            ...entity,
            created_at: new Date(),
            updated_at: new Date()
          };

          await db('performance_test_entities').insert(entityData);

          // All entities in this bulk operation share the same request ID
          await req.logAuditEvent(
            'performance_test_entities',
            entityData.id,
            'CREATE',
            null,
            entityData,
            'Bulk operation entity creation'
          );

          results.push(entityData);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        res.json({
          success: true,
          created: results,
          count: results.length,
          duration_ms: duration,
          bulk_request_id: bulkRequestId
        });
      } catch (error: any) {
        req.logger.error('Failed to create bulk entities', error);
        res.status(500).json({ error: 'Failed to create bulk entities' });
      }
    });

    // Reduce bulk size in CI to account for slower runners
    const bulkSize = isCI ? 200 : 500;
    const bulkEntities = Array.from({ length: bulkSize }, (_, i) => ({
      id: `bulk-${Date.now()}-${i}`,
      name: `Bulk Entity ${i}`,
      data: JSON.stringify({ 
        batch_number: i,
        created_in_bulk: true,
        metadata: 'x'.repeat(500) // 500 bytes per entity
      })
    }));

    const startTime = Date.now();
    const response = await request(app)
      .post('/performance-entities/bulk')
      .send({ entities: bulkEntities })
      .expect(200);

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    expect(response.body.success).toBe(true);
    expect(response.body.created).toHaveLength(bulkSize);
    expect(response.body.bulk_request_id).toBeTruthy();

    // Performance requirements for bulk operations
    expect(totalDuration).toBeLessThan(60000); // Should complete within 60 seconds
    const entitiesPerSecond = bulkSize / (totalDuration / 1000);
    console.log(`Bulk Performance: ${entitiesPerSecond.toFixed(2)} entities/second, ${totalDuration}ms total`);

    // Wait for all audit logs
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify all audit entries were created with the same request ID
    const auditEntries = await db('audit_log')
      .where('request_id', response.body.bulk_request_id)
      .select('*');

    expect(auditEntries.length).toBe(bulkSize);

    // All entries should have the same request ID (grouped operation)
    const uniqueRequestIds = new Set(auditEntries.map(entry => entry.request_id));
    expect(uniqueRequestIds.size).toBe(1);
  });

  // Skip memory pressure test in CI - it requires more resources than typical CI runners provide
  const testFn = isCI ? test.skip : test;
  testFn('should maintain performance under memory pressure', async () => {
    app.post('/performance-entities/memory-test', async (req: any, res: Response) => {
      const entityData = {
        id: 'memory-entity-' + Date.now() + '-' + Math.random(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        await db('performance_test_entities').insert(entityData);

        await req.logAuditEvent(
          'performance_test_entities',
          entityData.id,
          'CREATE',
          null,
          entityData,
          'High-frequency performance test entity creation'
        );

        res.status(201).json({ success: true, data: entityData });
      } catch (error: any) {
        req.logger.error('Failed to create entity', error);
        res.status(500).json({ error: 'Failed to create entity' });
      }
    });

    // Create entities with large payloads to test memory handling
    const largePayloadSize = 1024 * 1024; // 1MB per entity
    const numberOfEntities = 50; // 50MB total

    const startTime = Date.now();
    const results = [];

    for (let i = 0; i < numberOfEntities; i++) {
      const largeData = {
        name: `Memory Test Entity ${i}`,
        data: 'x'.repeat(largePayloadSize), // 1MB of data
        version: i
      };

      const response = await request(app)
        .post('/performance-entities/memory-test')
        .send(largeData);

      expect(response.status).toBe(201);
      results.push(response.body.data);

      // Check memory usage periodically
      if (i % 10 === 0) {
        const memoryUsage = process.memoryUsage();
        console.log(`Memory at entity ${i}: RSS=${Math.round(memoryUsage.rss / 1024 / 1024)}MB, Heap=${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Performance requirements under memory pressure
    expect(duration).toBeLessThan(120000); // Should complete within 2 minutes
    expect(results).toHaveLength(numberOfEntities);

    // Check final memory usage
    const finalMemoryUsage = process.memoryUsage();
    console.log(`Final memory: RSS=${Math.round(finalMemoryUsage.rss / 1024 / 1024)}MB, Heap=${Math.round(finalMemoryUsage.heapUsed / 1024 / 1024)}MB`);

    // Wait for audit processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify all audit entries were created
    const auditCount = await db('audit_log')
      .where('table_name', 'performance_test_entities')
      .where('action', 'CREATE')
      .count('* as count')
      .first();

    expect(Number(auditCount?.count)).toBeGreaterThanOrEqual(numberOfEntities);
  });

  test('should handle database query performance efficiently', async () => {
    // Pre-populate with many audit entries for query performance testing
    // Reduce in CI to account for slower runners
    const baselineEntries = isCI ? 400 : 1000;
    const entities = [];

    for (let i = 0; i < baselineEntries; i++) {
      const entityId = `baseline-entity-${i}`;
      entities.push({
        id: entityId,
        name: `Baseline Entity ${i}`,
        data: JSON.stringify({ index: i }),
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // Bulk insert entities in chunks to avoid SQLite query limits
    const chunkSize = 100;
    for (let i = 0; i < entities.length; i += chunkSize) {
      const chunk = entities.slice(i, i + chunkSize);
      await db('performance_test_entities').insert(chunk);
    }

    // Create audit entries for all entities in chunks
    const auditEntries = entities.map((entity, index) => ({
      id: `audit-${index}-${Date.now()}`,
      table_name: 'performance_test_entities',
      record_id: entity.id,
      action: 'CREATE',
      changed_by: 'baseline-user',
      new_values: JSON.stringify(entity),
      request_id: `baseline-request-${Math.floor(index / 100)}`, // Group every 100
      changed_at: new Date(Date.now() - (baselineEntries - index) * 1000) // Spread over time
    }));

    // Insert audit entries in chunks
    for (let i = 0; i < auditEntries.length; i += chunkSize) {
      const chunk = auditEntries.slice(i, i + chunkSize);
      await db('audit_log').insert(chunk);
    }

    // Now test query performance
    app.get('/audit-search/performance', async (req: any, res: Response) => {
      const { table_name, action, limit = 50, offset = 0 } = req.query;

      try {
        const startTime = Date.now();

        // Simulate common audit queries
        const query = db('audit_log')
          .select('*')
          .orderBy('changed_at', 'desc');

        if (table_name) {
          query.where('table_name', table_name as string);
        }
        if (action) {
          query.where('action', action as string);
        }

        query.limit(Number(limit)).offset(Number(offset));

        const results = await query;
        const queryTime = Date.now() - startTime;

        // Also test aggregation queries
        const aggregateStartTime = Date.now();
        const stats = await db('audit_log')
          .select('table_name', 'action')
          .count('* as count')
          .where('table_name', 'performance_test_entities')
          .groupBy('table_name', 'action');
        const aggregateTime = Date.now() - aggregateStartTime;

        res.json({
          success: true,
          results: results,
          count: results.length,
          query_time_ms: queryTime,
          aggregate_stats: stats,
          aggregate_time_ms: aggregateTime,
          performance_acceptable: queryTime < 1000 && aggregateTime < 500
        });
      } catch (error: any) {
        req.logger.error('Failed to search audit log', error);
        res.status(500).json({ error: 'Failed to search audit log' });
      }
    });

    // Test various query patterns
    const queryTests = [
      { table_name: 'performance_test_entities', action: 'CREATE' },
      { table_name: 'performance_test_entities' },
      { action: 'CREATE' },
      {} // No filters
    ];

    for (const queryParams of queryTests) {
      const response = await request(app)
        .get('/audit-search/performance')
        .query(queryParams)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.performance_acceptable).toBe(true);
      expect(response.body.query_time_ms).toBeLessThan(1000); // Query should complete within 1 second
      expect(response.body.aggregate_time_ms).toBeLessThan(500); // Aggregation should complete within 500ms

      console.log(`Query performance - Filters: ${JSON.stringify(queryParams)}, Query: ${response.body.query_time_ms}ms, Aggregate: ${response.body.aggregate_time_ms}ms`);
    }
  });

  test('should handle concurrent audit reads and writes efficiently', async () => {
    app.post('/performance-entities/concurrent', async (req: any, res: Response) => {
      const entityData = {
        id: 'concurrent-entity-' + Date.now() + '-' + Math.random(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        await db('performance_test_entities').insert(entityData);

        await req.logAuditEvent(
          'performance_test_entities',
          entityData.id,
          'CREATE',
          null,
          entityData,
          'High-frequency performance test entity creation'
        );

        res.status(201).json({ success: true, data: entityData });
      } catch (error: any) {
        req.logger.error('Failed to create entity', error);
        res.status(500).json({ error: 'Failed to create entity' });
      }
    });

    app.get('/audit-log/concurrent', async (req: any, res: Response) => {
      try {
        const startTime = Date.now();
        
        const auditEntries = await db('audit_log')
          .select('*')
          .where('table_name', 'performance_test_entities')
          .orderBy('changed_at', 'desc')
          .limit(100);
        
        const queryTime = Date.now() - startTime;

        res.json({
          success: true,
          entries: auditEntries,
          count: auditEntries.length,
          query_time_ms: queryTime
        });
      } catch (error: any) {
        req.logger.error('Failed to fetch audit log', error);
        res.status(500).json({ error: 'Failed to fetch audit log' });
      }
    });

    // Reduce concurrency in CI to account for slower runners
    const concurrentWrites = isCI ? 25 : 50;
    const concurrentReads = isCI ? 15 : 25;
    const totalOperations = concurrentWrites + concurrentReads;

    const startTime = Date.now();

    // Mix of write and read operations
    const operations = [
      // Write operations
      ...Array.from({ length: concurrentWrites }, (_, i) =>
        request(app)
          .post('/performance-entities/concurrent')
          .send({
            name: `Concurrent Entity ${i}`,
            data: JSON.stringify({ concurrent_test: true, index: i })
          })
      ),
      // Read operations
      ...Array.from({ length: concurrentReads }, () =>
        request(app)
          .get('/audit-log/concurrent')
      )
    ];

    // Shuffle operations to simulate real concurrent access
    operations.sort(() => Math.random() - 0.5);

    const responses = await Promise.all(operations);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // All operations should succeed
    responses.forEach(response => {
      expect([200, 201]).toContain(response.status);
    });

    // Performance requirements for concurrent operations
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    const operationsPerSecond = totalOperations / (duration / 1000);
    console.log(`Concurrent Performance: ${operationsPerSecond.toFixed(2)} operations/second, ${duration}ms total`);

    // Verify read operations completed quickly
    const readResponses = responses.slice(concurrentWrites);
    readResponses.forEach(response => {
      if (response.body.query_time_ms) {
        expect(response.body.query_time_ms).toBeLessThan(1000); // Individual reads should be fast
      }
    });

    // Wait for audit processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify audit entries were created for write operations
    const auditCount = await db('audit_log')
      .where('table_name', 'performance_test_entities')
      .where('action', 'CREATE')
      .count('* as count')
      .first();

    expect(Number(auditCount?.count)).toBeGreaterThanOrEqual(concurrentWrites);
  });
});