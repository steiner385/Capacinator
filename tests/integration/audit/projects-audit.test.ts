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
    maxHistoryEntries: 1000,
    retentionDays: 365,
    sensitiveFields: ['password', 'token'],
    enabledTables: ['projects']
  }),
  isTableAudited: (tableName: string) => {
    return ['projects'].includes(tableName);
  }
}));

describe('ProjectsController Audit Integration Tests', () => {
  let app: Express;
  let db: Knex;
  let testProjectId: string;

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
      table.string('description').nullable();
      table.string('status').defaultTo('Active');
      table.date('aspiration_start').nullable();
      table.date('aspiration_finish').nullable();
      table.timestamps(true, true);
    });

    // Create test project
    testProjectId = 'test-project-' + Date.now();
    await db('projects').insert({
      id: testProjectId,
      name: 'Test Project for Audit',
      description: 'Initial description',
      status: 'Active',
      aspiration_start: '2024-01-01',
      aspiration_finish: '2024-12-31'
    });
  });

  afterAll(async () => {
    await db.destroy();
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

    // Add enhanced audit middleware with test database
    app.use(createEnhancedAuditMiddleware(db));
  });

  test('should audit project creation', async () => {
    app.post('/projects', async (req: any, res: Response) => {
      const projectData = {
        id: 'new-project-' + Date.now(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        await db('projects').insert(projectData);

        // Log audit event using the enhanced middleware pattern
        await req.logAuditEvent(
          'projects',
          projectData.id,
          'CREATE',
          null,
          projectData
        );

        res.status(201).json({
          success: true,
          data: projectData,
          message: 'Project created successfully'
        });
      } catch (error: any) {
        req.logger.error('Failed to create project', error);
        res.status(500).json({ error: 'Failed to create project' });
      }
    });

    const newProjectData = {
      name: 'New Audit Test Project',
      description: 'Created for audit testing',
      status: 'Planning'
    };

    const response = await request(app)
      .post('/projects')
      .send(newProjectData)
      .expect(201);

    expect(response.body.success).toBe(true);

    // Wait for async audit write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify audit log was created
    const auditEntry = await db('audit_log')
      .where('table_name', 'projects')
      .where('record_id', response.body.data.id)
      .where('action', 'CREATE')
      .first();

    expect(auditEntry).toBeTruthy();
    expect(auditEntry.changed_by).toBe('test-user-123');
    expect(auditEntry.request_id).toContain('test-request');

    const newValues = JSON.parse(auditEntry.new_values);
    expect(newValues.name).toBe(newProjectData.name);
    expect(newValues.description).toBe(newProjectData.description);
    expect(auditEntry.old_values).toBeNull();
  });

  test('should audit project updates - including date changes', async () => {
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

        const updatedProject = await db('projects').where('id', id).first();

        // Log audit event using the enhanced middleware pattern
        await req.logAuditEvent(
          'projects',
          id,
          'UPDATE',
          currentProject,
          updatedProject
        );

        res.json({
          success: true,
          data: updatedProject,
          message: 'Project updated successfully'
        });
      } catch (error: any) {
        req.logger.error('Failed to update project', error);
        res.status(500).json({ error: 'Failed to update project' });
      }
    });

    const updateData = {
      name: 'Updated Project Name',
      description: 'Updated description',
      aspiration_finish: '2025-06-30' // Change end date
    };

    const response = await request(app)
      .put(`/projects/${testProjectId}`)
      .send(updateData)
      .expect(200);

    expect(response.body.success).toBe(true);

    // Wait for async audit write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify audit log was created
    const auditEntry = await db('audit_log')
      .where('table_name', 'projects')
      .where('record_id', testProjectId)
      .where('action', 'UPDATE')
      .orderBy('changed_at', 'desc')
      .first();

    expect(auditEntry).toBeTruthy();

    const oldValues = JSON.parse(auditEntry.old_values);
    const newValues = JSON.parse(auditEntry.new_values);

    expect(oldValues.name).toBe('Test Project for Audit');
    expect(newValues.name).toBe('Updated Project Name');
    expect(oldValues.aspiration_finish).toBe('2024-12-31');
    expect(newValues.aspiration_finish).toBe('2025-06-30');

    const changedFields = JSON.parse(auditEntry.changed_fields);
    expect(changedFields).toContain('name');
    expect(changedFields).toContain('description');
    expect(changedFields).toContain('aspiration_finish');
  });

  test('should audit project deletion', async () => {
    // Create a project to delete
    const projectToDelete = {
      id: 'del-project-' + Date.now(),
      name: 'Project to Delete',
      description: 'Will be deleted',
      status: 'Active'
    };
    await db('projects').insert(projectToDelete);

    app.delete('/projects/:id', async (req: any, res: Response) => {
      const { id } = req.params;

      try {
        // Get current project before deletion
        const currentProject = await db('projects').where('id', id).first();
        if (!currentProject) {
          return res.status(404).json({ error: 'Project not found' });
        }

        // Delete project
        await db('projects').where('id', id).del();

        // Log audit event
        await req.logAuditEvent(
          'projects',
          id,
          'DELETE',
          currentProject,
          null
        );

        res.json({
          success: true,
          message: 'Project deleted successfully'
        });
      } catch (error: any) {
        req.logger.error('Failed to delete project', error);
        res.status(500).json({ error: 'Failed to delete project' });
      }
    });

    const response = await request(app)
      .delete(`/projects/${projectToDelete.id}`)
      .expect(200);

    expect(response.body.success).toBe(true);

    // Wait for async audit write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify audit log was created
    const auditEntry = await db('audit_log')
      .where('table_name', 'projects')
      .where('record_id', projectToDelete.id)
      .where('action', 'DELETE')
      .first();

    expect(auditEntry).toBeTruthy();

    const oldValues = JSON.parse(auditEntry.old_values);
    expect(oldValues.name).toBe('Project to Delete');
    expect(oldValues.description).toBe('Will be deleted');
    expect(auditEntry.new_values).toBeNull();
  });

  test('should handle audit failures gracefully', async () => {
    app.put('/projects/:id/fail-audit', async (req: any, res: Response) => {
      const { id } = req.params;

      try {
        // Get current project
        const currentProject = await db('projects').where('id', id).first();
        if (!currentProject) {
          return res.status(404).json({ error: 'Project not found' });
        }

        // Update project successfully
        const updateData = { ...req.body, updated_at: new Date() };
        await db('projects').where('id', id).update(updateData);

        // Simulate audit failure
        try {
          throw new Error('Audit service unavailable');
        } catch (auditError) {
          req.logger.error('Audit failed but project update succeeded', auditError);
        }

        const updatedProject = await db('projects').where('id', id).first();
        res.json({
          success: true,
          data: updatedProject,
          message: 'Project updated successfully (audit failed)'
        });
      } catch (error: any) {
        req.logger.error('Failed to update project', error);
        res.status(500).json({ error: 'Failed to update project' });
      }
    });

    const response = await request(app)
      .put(`/projects/${testProjectId}/fail-audit`)
      .send({ description: 'Updated with audit failure' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.description).toBe('Updated with audit failure');

    // Verify project was actually updated despite audit failure
    const updatedProject = await db('projects').where('id', testProjectId).first();
    expect(updatedProject.description).toBe('Updated with audit failure');
  });
});