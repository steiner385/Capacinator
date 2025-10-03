import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import express from 'express';
import type { Express, Request, Response } from 'express';
import request from 'supertest';
import knex, { Knex } from 'knex';
import { Logger } from '../../../src/server/services/logging/Logger.js';
import { AuditService } from '../../../src/server/services/AuditService.js';

// Create a test database instance
let testDb: Knex;

// Mock the database module
jest.mock('../../../src/server/database/index.js', () => ({
  get db() {
    return testDb;
  }
}));

// Mock the config module
jest.mock('../../../src/server/config/auditConfig.js', () => ({
  getAuditConfig: () => ({
    maxHistoryEntries: 1000,
    retentionDays: 365,
    sensitiveFields: ['password', 'token', 'secret'],
    enabledTables: ['projects', 'people', 'project_assignments']
  }),
  isTableAudited: (tableName: string) => {
    return ['projects', 'people', 'project_assignments'].includes(tableName);
  }
}));

// Import middleware after mocking
import { enhancedAuditMiddleware, autoAuditMiddleware } from '../../../src/server/middleware/enhancedAuditMiddleware.js';

describe('Enhanced Audit Middleware Integration Tests - Clean', () => {
  let app: Express;
  let testProjectId: string;
  let testPersonId: string;

  beforeAll(async () => {
    // Create test database
    testDb = knex({
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
    await testDb.schema.createTable('audit_log', (table) => {
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
      table.timestamp('changed_at').defaultTo(testDb.fn.now());
      
      table.index(['table_name', 'record_id']);
      table.index('changed_at');
    });

    await testDb.schema.createTable('projects', (table) => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.string('description').nullable();
      table.string('status').defaultTo('Active');
      table.timestamps(true, true);
    });

    await testDb.schema.createTable('people', (table) => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.string('email').nullable();
      table.string('password').nullable();
      table.string('role').nullable();
      table.timestamps(true, true);
    });

    await testDb.schema.createTable('project_assignments', (table) => {
      table.uuid('id').primary();
      table.uuid('project_id').notNullable();
      table.uuid('person_id').notNullable();
      table.string('role_id').notNullable();
      table.integer('allocation_percentage').defaultTo(100);
      table.date('start_date');
      table.date('end_date');
      table.timestamps(true, true);
    });

    // Create test data
    testProjectId = 'proj-' + Date.now();
    testPersonId = 'person-' + Date.now();

    await testDb('projects').insert({
      id: testProjectId,
      name: 'Test Project',
      description: 'Initial description',
      status: 'Active'
    });

    await testDb('people').insert({
      id: testPersonId,
      name: 'Test Person',
      email: 'test@example.com',
      password: 'hashed_password'
    });
  });

  afterAll(async () => {
    await testDb.destroy();
  });

  beforeEach(() => {
    // Create Express app with middleware
    app = express();
    app.use(express.json());

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

    // Add enhanced audit middleware
    app.use(enhancedAuditMiddleware);
  });

  afterEach(async () => {
    // Clean up audit logs after each test
    await testDb('audit_log').del();
  });

  test('should audit project creation through API', async () => {
    app.post('/projects', autoAuditMiddleware('projects'), async (req: any, res: Response) => {
      const projectData = {
        id: 'new-proj-' + Date.now(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      await testDb('projects').insert(projectData);
      res.status(201).json(projectData);
    });

    const newProjectData = {
      name: 'New Test Project',
      description: 'Created via API',
      status: 'Planning'
    };

    const response = await request(app)
      .post('/projects')
      .send(newProjectData)
      .expect(201);

    // Check that project was created
    expect(response.body.name).toBe(newProjectData.name);

    // Wait a moment for async audit log write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check audit log
    const auditEntries = await testDb('audit_log')
      .where('table_name', 'projects')
      .where('record_id', response.body.id)
      .select('*');

    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0].action).toBe('CREATE');
    expect(auditEntries[0].changed_by).toBe('test-user-123');
    expect(auditEntries[0].request_id).toContain('test-request');

    const newValues = JSON.parse(auditEntries[0].new_values);
    expect(newValues.name).toBe(newProjectData.name);
    expect(newValues.description).toBe(newProjectData.description);
  });

  test('should audit project updates with field tracking', async () => {
    app.put('/projects/:id', autoAuditMiddleware('projects'), async (req: any, res: Response) => {
      const { id } = req.params;

      // Get current values
      const current = await testDb('projects').where('id', id).first();
      req.trackEntityChange('projects', id, current, { ...current, ...req.body });

      // Update
      await testDb('projects')
        .where('id', id)
        .update({
          ...req.body,
          updated_at: new Date()
        });

      const updated = await testDb('projects').where('id', id).first();
      res.json(updated);
    });

    const updateData = {
      name: 'Updated Test Project',
      status: 'In Progress'
    };

    await request(app)
      .put(`/projects/${testProjectId}`)
      .send(updateData)
      .expect(200);

    // Wait for async audit log write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check audit log
    const auditEntries = await testDb('audit_log')
      .where('table_name', 'projects')
      .where('record_id', testProjectId)
      .where('action', 'UPDATE')
      .select('*');

    expect(auditEntries.length).toBeGreaterThan(0);
    
    const latestUpdate = auditEntries[auditEntries.length - 1];
    expect(latestUpdate.action).toBe('UPDATE');
    
    const oldValues = JSON.parse(latestUpdate.old_values);
    const newValues = JSON.parse(latestUpdate.new_values);
    
    expect(oldValues.name).toBe('Test Project');
    expect(newValues.name).toBe('Updated Test Project');
    expect(newValues.status).toBe('In Progress');

    const changedFields = JSON.parse(latestUpdate.changed_fields || '[]');
    expect(changedFields).toContain('name');
    expect(changedFields).toContain('status');
  });

  test('should redact sensitive fields', async () => {
    app.post('/people', autoAuditMiddleware('people'), async (req: any, res: Response) => {
      const personData = {
        id: 'person-' + Date.now(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      await testDb('people').insert(personData);
      res.status(201).json(personData);
    });

    const sensitiveData = {
      name: 'Sensitive Person',
      email: 'sensitive@example.com',
      password: 'super_secret_password',
      role: 'admin'
    };

    const response = await request(app)
      .post('/people')
      .send(sensitiveData)
      .expect(201);

    // Wait for async audit log write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check audit log
    const auditEntry = await testDb('audit_log')
      .where('table_name', 'people')
      .where('record_id', response.body.id)
      .first();

    const newValues = JSON.parse(auditEntry.new_values);
    
    // Password should be redacted
    expect(newValues.password).toBe('[REDACTED]');
    
    // Other fields should be present
    expect(newValues.name).toBe(sensitiveData.name);
    expect(newValues.email).toBe(sensitiveData.email);
    expect(newValues.role).toBe(sensitiveData.role);
  });

  test('should handle bulk operations', async () => {
    app.post('/assignments/bulk', async (req: any, res: Response) => {
      const { assignments } = req.body;
      const results = [];

      for (const assignment of assignments) {
        const assignmentData = {
          id: 'assign-' + Date.now() + '-' + Math.random(),
          ...assignment,
          created_at: new Date(),
          updated_at: new Date()
        };

        await testDb('project_assignments').insert(assignmentData);
        
        // Log audit event
        await req.logAuditEvent(
          'project_assignments',
          assignmentData.id,
          'CREATE',
          undefined,
          assignmentData
        );

        results.push(assignmentData);
      }

      res.json({ created: results });
    });

    const bulkAssignments = {
      assignments: [
        {
          project_id: testProjectId,
          person_id: testPersonId,
          role_id: 'developer',
          allocation_percentage: 50
        },
        {
          project_id: testProjectId,
          person_id: testPersonId,
          role_id: 'reviewer',
          allocation_percentage: 25
        }
      ]
    };

    const response = await request(app)
      .post('/assignments/bulk')
      .send(bulkAssignments)
      .expect(200);

    expect(response.body.created).toHaveLength(2);

    // Wait for async audit log writes
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check audit logs
    const auditEntries = await testDb('audit_log')
      .where('table_name', 'project_assignments')
      .where('action', 'CREATE')
      .select('*');

    expect(auditEntries.length).toBeGreaterThanOrEqual(2);
  });

  test('should track request metadata', async () => {
    app.post('/projects', autoAuditMiddleware('projects'), async (req: any, res: Response) => {
      const projectData = {
        id: 'meta-proj-' + Date.now(),
        ...req.body
      };

      await testDb('projects').insert(projectData);
      res.status(201).json(projectData);
    });

    const response = await request(app)
      .post('/projects')
      .set('User-Agent', 'Test Browser/1.0')
      .set('X-Real-IP', '10.0.0.1')
      .send({ name: 'Metadata Test Project' })
      .expect(201);

    // Wait for async audit log write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check audit log metadata
    const auditEntry = await testDb('audit_log')
      .where('table_name', 'projects')
      .where('record_id', response.body.id)
      .first();

    expect(auditEntry.request_id).toBeTruthy();
    expect(auditEntry.user_agent).toContain('Test Browser');
    expect(auditEntry.ip_address).toBeTruthy();
    expect(auditEntry.changed_by).toBe('test-user-123');
  });

  test('should support custom audit comments', async () => {
    app.post('/projects/:id/archive', async (req: any, res: Response) => {
      const { id } = req.params;

      const current = await testDb('projects').where('id', id).first();
      const updated = { ...current, status: 'Archived' };

      await testDb('projects').where('id', id).update(updated);

      // Log with custom comment
      await req.logAuditEvent(
        'projects',
        id,
        'UPDATE',
        current,
        updated,
        'Project archived by user request'
      );

      res.json(updated);
    });

    await request(app)
      .post(`/projects/${testProjectId}/archive`)
      .expect(200);

    // Wait for async audit log write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check audit log for custom comment
    const auditEntry = await testDb('audit_log')
      .where('table_name', 'projects')
      .where('record_id', testProjectId)
      .where('comment', 'like', '%archived%')
      .first();

    expect(auditEntry).toBeTruthy();
    expect(auditEntry.comment).toBe('Project archived by user request');
  });
});