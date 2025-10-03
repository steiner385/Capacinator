import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import express from 'express';
import type { Express, Request, Response } from 'express';
import request from 'supertest';
import knex, { Knex } from 'knex';
import { Logger } from '../../../src/server/services/logging/Logger.js';

// Store the test database globally
let testDb: Knex;

// Mock the database module before any imports
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
    sensitiveFields: ['password', 'token'],
    enabledTables: ['projects', 'project_assignments']
  }),
  isTableAudited: (tableName: string) => {
    return ['projects', 'project_assignments'].includes(tableName);
  }
}));

// Import middleware after mocking
import { enhancedAuditMiddleware, autoAuditMiddleware } from '../../../src/server/middleware/enhancedAuditMiddleware.js';

describe('Controller Audit Integration Tests - Final', () => {
  let app: Express;

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
      table.string('project_type_id').notNullable();
      table.string('project_sub_type_id').notNullable();
      table.string('location_id').nullable();
      table.string('owner_id').nullable();
      table.string('description').nullable();
      table.string('status').defaultTo('Active');
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
  });

  afterAll(async () => {
    await testDb.destroy();
  });

  beforeEach(async () => {
    // Clear audit logs before each test
    await testDb('audit_log').del();
    
    // Create Express app
    app = express();
    app.use(express.json());

    // Add mock logger middleware
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

  test('should audit project creation', async () => {
    // Create endpoint that mimics controller behavior
    app.post('/projects', async (req: any, res: Response) => {
      const projectData = {
        id: 'proj-' + Date.now(),
        name: req.body.name,
        project_type_id: req.body.project_type_id || 'type-1',
        project_sub_type_id: req.body.project_sub_type_id || 'subtype-1',
        description: req.body.description,
        status: req.body.status || 'Active',
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        // Insert project
        await testDb('projects').insert(projectData);

        // Log audit event
        await req.logAuditEvent('projects', projectData.id, 'CREATE', undefined, projectData);

        // Log business operation
        req.logger.info('Business operation', {
          operation: 'CREATE',
          entityType: 'project',
          entityId: projectData.id,
          userId: req.user?.id,
          metadata: {
            projectName: projectData.name,
            projectType: projectData.project_type_id
          }
        });

        res.status(201).json({
          success: true,
          data: projectData,
          message: 'Project created successfully'
        });
      } catch (error: any) {
        console.error('Route handler error:', error);
        req.logger.error('Failed to create project', error);
        res.status(500).json({ 
          error: 'Failed to create project',
          message: error.message
        });
      }
    });

    // Test the endpoint
    const response = await request(app)
      .post('/projects')
      .send({
        name: 'Test Project with Audit',
        description: 'Testing controller-like audit'
      });

    // Check response
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Test Project with Audit');

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify audit log was created
    const auditEntry = await testDb('audit_log')
      .where('table_name', 'projects')
      .where('action', 'CREATE')
      .orderBy('changed_at', 'desc')
      .first();

    expect(auditEntry).toBeTruthy();
    expect(auditEntry.changed_by).toBe('test-user-123');
    expect(auditEntry.request_id).toContain('test-request');

    const newValues = JSON.parse(auditEntry.new_values);
    expect(newValues.name).toBe('Test Project with Audit');
  });

  test('should audit assignment updates', async () => {
    // Create test data
    const projectId = 'proj-' + Date.now();
    const assignmentId = 'assign-' + Date.now();

    await testDb('projects').insert({
      id: projectId,
      name: 'Test Project',
      project_type_id: 'type-1',
      project_sub_type_id: 'subtype-1'
    });

    await testDb('project_assignments').insert({
      id: assignmentId,
      project_id: projectId,
      person_id: 'person-123',
      role_id: 'developer',
      allocation_percentage: 50
    });

    // Create update endpoint
    app.put('/assignments/:id', async (req: any, res: Response) => {
      const { id } = req.params;

      try {
        // Get current assignment
        const currentAssignment = await testDb('project_assignments').where('id', id).first();
        if (!currentAssignment) {
          return res.status(404).json({ error: 'Assignment not found' });
        }

        // Update assignment
        const updateData = {
          ...req.body,
          updated_at: new Date()
        };

        await testDb('project_assignments').where('id', id).update(updateData);

        // Get updated assignment
        const updatedAssignment = await testDb('project_assignments').where('id', id).first();

        // Log audit event
        await req.logAuditEvent(
          'project_assignments',
          id,
          'UPDATE',
          currentAssignment,
          updatedAssignment
        );

        res.json({
          success: true,
          data: updatedAssignment,
          message: 'Assignment updated successfully'
        });
      } catch (error: any) {
        console.error('Update error:', error);
        req.logger.error('Failed to update assignment', error);
        res.status(500).json({ 
          error: 'Failed to update assignment',
          message: error.message
        });
      }
    });

    // Test the update
    const response = await request(app)
      .put(`/assignments/${assignmentId}`)
      .send({
        allocation_percentage: 100
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify audit log
    const auditEntry = await testDb('audit_log')
      .where('table_name', 'project_assignments')
      .where('record_id', assignmentId)
      .where('action', 'UPDATE')
      .first();

    expect(auditEntry).toBeTruthy();

    const oldValues = JSON.parse(auditEntry.old_values);
    const newValues = JSON.parse(auditEntry.new_values);

    expect(oldValues.allocation_percentage).toBe(50);
    expect(newValues.allocation_percentage).toBe(100);
  });

  test('should handle bulk operations', async () => {
    const projectId = 'proj-bulk-' + Date.now();

    await testDb('projects').insert({
      id: projectId,
      name: 'Bulk Test Project',
      project_type_id: 'type-1',
      project_sub_type_id: 'subtype-1'
    });

    app.post('/assignments/bulk', async (req: any, res: Response) => {
      const { assignments } = req.body;
      const results = [];
      const errors = [];

      // Begin bulk operation
      if (req.beginBulkAudit) {
        req.beginBulkAudit();
      }

      for (const assignment of assignments) {
        try {
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
        } catch (error: any) {
          errors.push({ assignment, error: error.message });
        }
      }

      // End bulk operation
      if (req.endBulkAudit) {
        await req.endBulkAudit();
      }

      res.json({
        success: errors.length === 0,
        created: results,
        errors: errors.length > 0 ? errors : undefined
      });
    });

    const bulkData = {
      assignments: [
        {
          project_id: projectId,
          person_id: 'person-1',
          role_id: 'developer',
          allocation_percentage: 60
        },
        {
          project_id: projectId,
          person_id: 'person-2',
          role_id: 'tester',
          allocation_percentage: 40
        }
      ]
    };

    const response = await request(app)
      .post('/assignments/bulk')
      .send(bulkData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.created).toHaveLength(2);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check audit logs
    const auditEntries = await testDb('audit_log')
      .where('table_name', 'project_assignments')
      .where('action', 'CREATE')
      .select('*');

    expect(auditEntries.length).toBeGreaterThanOrEqual(2);
  });
});