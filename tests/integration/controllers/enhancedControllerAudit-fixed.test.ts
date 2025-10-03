import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import express from 'express';
import type { Express, Request, Response } from 'express';
import request from 'supertest';
import knex, { Knex } from 'knex';
import { enhancedAuditMiddleware } from '../../../src/server/middleware/enhancedAuditMiddleware.js';
import { Logger } from '../../../src/server/services/logging/Logger.js';

describe('Enhanced Controller Audit Integration Tests - Fixed', () => {
  let app: Express;
  let db: Knex;
  let mockLogger: any;

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

    await db.schema.createTable('projects', (table) => {
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

    await db.schema.createTable('project_assignments', (table) => {
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
    await db.destroy();
  });

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Create mock logger
    mockLogger = new Logger({
      level: 2,
      service: 'test',
      enableConsole: false,
      enableFile: false,
      enableStructuredLogs: true,
      redactedFields: ['password', 'token']
    });

    // Add middleware to inject logger and user
    app.use((req: any, res, next) => {
      req.logger = mockLogger;
      req.requestId = 'test-request-' + Date.now();
      req.user = { id: 'test-user-123' };
      next();
    });

    // Add audit middleware
    app.use(enhancedAuditMiddleware);

    // Mock the config functions
    (global as any).getAuditConfig = () => ({
      maxHistoryEntries: 1000,
      retentionDays: 365,
      sensitiveFields: ['password', 'token'],
      enabledTables: ['projects', 'project_assignments']
    });

    (global as any).isTableAudited = (tableName: string) => {
      return ['projects', 'project_assignments'].includes(tableName);
    };

    // Override db in audit service
    app.use((req: any, res, next) => {
      if (req.auditService) {
        (req.auditService as any).db = db;
      }
      next();
    });
  });

  describe('Controller Audit Operations', () => {
    test('should audit project creation with enhanced logging', async () => {
      // Create a simple project endpoint
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
          await db('projects').insert(projectData);

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
        } catch (error) {
          req.logger.error('Failed to create project', error);
          res.status(500).json({ error: 'Failed to create project' });
        }
      });

      // Test the endpoint
      const response = await request(app)
        .post('/projects')
        .send({
          name: 'Test Project with Enhanced Logging',
          description: 'Testing enhanced audit functionality'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Project with Enhanced Logging');

      // Verify audit log was created
      const auditEntry = await db('audit_log')
        .where('table_name', 'projects')
        .where('action', 'CREATE')
        .orderBy('changed_at', 'desc')
        .first();

      expect(auditEntry).toBeTruthy();
      expect(auditEntry.changed_by).toBe('test-user-123');
      expect(auditEntry.request_id).toContain('test-request');

      const newValues = JSON.parse(auditEntry.new_values);
      expect(newValues.name).toBe('Test Project with Enhanced Logging');
    });

    test('should audit updates with field tracking', async () => {
      // Create a project first
      const projectId = 'proj-' + Date.now();
      await db('projects').insert({
        id: projectId,
        name: 'Original Project',
        project_type_id: 'type-1',
        project_sub_type_id: 'subtype-1',
        description: 'Original description',
        status: 'Active'
      });

      // Create update endpoint
      app.put('/projects/:id', async (req: any, res: Response) => {
        const { id } = req.params;

        try {
          // Get current project
          const currentProject = await db('projects').where('id', id).first();
          if (!currentProject) {
            return res.status(404).json({ error: 'Project not found' });
          }

          // Update project
          const updateData = {
            ...req.body,
            updated_at: new Date()
          };

          await db('projects').where('id', id).update(updateData);

          // Get updated project
          const updatedProject = await db('projects').where('id', id).first();

          // Log audit event
          await req.logAuditEvent('projects', id, 'UPDATE', currentProject, updatedProject);

          res.json({
            success: true,
            data: updatedProject,
            message: 'Project updated successfully'
          });
        } catch (error) {
          req.logger.error('Failed to update project', error);
          res.status(500).json({ error: 'Failed to update project' });
        }
      });

      // Test the update
      const response = await request(app)
        .put(`/projects/${projectId}`)
        .send({
          name: 'Updated Project',
          description: 'Updated description',
          status: 'On Hold'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify audit log
      const auditEntry = await db('audit_log')
        .where('table_name', 'projects')
        .where('record_id', projectId)
        .where('action', 'UPDATE')
        .first();

      expect(auditEntry).toBeTruthy();

      const oldValues = JSON.parse(auditEntry.old_values);
      const newValues = JSON.parse(auditEntry.new_values);

      expect(oldValues.name).toBe('Original Project');
      expect(newValues.name).toBe('Updated Project');
      expect(newValues.status).toBe('On Hold');
    });

    test('should audit deletion with data preservation', async () => {
      // Create a project to delete
      const projectId = 'proj-del-' + Date.now();
      const projectData = {
        id: projectId,
        name: 'Project to Delete',
        project_type_id: 'type-1',
        project_sub_type_id: 'subtype-1',
        description: 'Will be deleted',
        status: 'Active'
      };
      await db('projects').insert(projectData);

      // Create delete endpoint
      app.delete('/projects/:id', async (req: any, res: Response) => {
        const { id } = req.params;

        try {
          // Get project before deletion
          const project = await db('projects').where('id', id).first();
          if (!project) {
            return res.status(404).json({ error: 'Project not found' });
          }

          // Delete project
          await db('projects').where('id', id).del();

          // Log audit event
          await req.logAuditEvent('projects', id, 'DELETE', project, undefined);

          res.json({
            success: true,
            message: 'Project deleted successfully'
          });
        } catch (error) {
          req.logger.error('Failed to delete project', error);
          res.status(500).json({ error: 'Failed to delete project' });
        }
      });

      // Test deletion
      const response = await request(app)
        .delete(`/projects/${projectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify audit log
      const auditEntry = await db('audit_log')
        .where('table_name', 'projects')
        .where('record_id', projectId)
        .where('action', 'DELETE')
        .first();

      expect(auditEntry).toBeTruthy();

      const oldValues = JSON.parse(auditEntry.old_values);
      expect(oldValues.name).toBe('Project to Delete');
      expect(oldValues.status).toBe('Active');
      expect(auditEntry.new_values).toBeNull();
    });

    test('should handle audit failures gracefully', async () => {
      // Create endpoint with failing audit
      app.post('/projects-fail', async (req: any, res: Response) => {
        const projectData = {
          id: 'proj-fail-' + Date.now(),
          name: req.body.name,
          project_type_id: 'type-1',
          project_sub_type_id: 'subtype-1'
        };

        // Mock audit failure
        req.logAuditEvent = jest.fn().mockRejectedValue(new Error('Audit service unavailable'));

        try {
          await db('projects').insert(projectData);

          // Try to log audit (will fail)
          try {
            await req.logAuditEvent('projects', projectData.id, 'CREATE', undefined, projectData);
          } catch (auditError) {
            req.logger.error('Audit failed but continuing', auditError);
          }

          res.status(201).json({
            success: true,
            data: projectData
          });
        } catch (error) {
          res.status(500).json({ error: 'Failed to create project' });
        }
      });

      // Test that project creation succeeds even when audit fails
      const response = await request(app)
        .post('/projects-fail')
        .send({ name: 'Test with Audit Failure' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test with Audit Failure');

      // Verify project was created
      const project = await db('projects')
        .where('id', response.body.data.id)
        .first();
      expect(project).toBeTruthy();
    });
  });
});