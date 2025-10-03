import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import type { Request, Response } from 'express';
import knex, { Knex } from 'knex';
import { RequestWithLogging } from '../../../src/server/middleware/requestLogger.js';

describe('Enhanced Controller Audit Integration Tests', () => {
  let db: Knex;
  let projectsController: ProjectsController;
  let assignmentsController: AssignmentsController;
  let mockReq: any;
  let mockRes: any;

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
      table.date('aspiration_start').nullable();
      table.date('aspiration_finish').nullable();
      table.boolean('include_in_demand').defaultTo(true);
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

    await db.schema.createTable('scenario_project_assignments', (table) => {
      table.uuid('id').primary();
      table.uuid('project_id').notNullable();
      table.uuid('person_id').notNullable();
      table.string('scenario_id').notNullable();
      table.string('role_id').notNullable();
      table.integer('allocation_percentage').defaultTo(100);
      table.date('start_date');
      table.date('end_date');
      table.timestamps(true, true);
    });

    // Initialize controllers
    projectsController = new ProjectsController();
    assignmentsController = new AssignmentsController();

    // Override db in controllers
    (projectsController as any).db = db;
    (assignmentsController as any).db = db;
  });

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(() => {
    // Create mock logger
    const mockLogger = new Logger({
      level: 2,
      service: 'test',
      enableConsole: false,
      enableFile: false,
      enableStructuredLogs: true,
      redactedFields: ['password', 'token']
    });

    // Create mock request
    mockReq = {
      logger: mockLogger,
      requestId: 'test-request-' + Date.now(),
      ip: '127.0.0.1',
      get: () => 'Test User Agent',
      user: { id: 'test-user-123' },
      params: {},
      query: {},
      body: {},
      headers: {},
      logAuditEvent: async (
        tableName: string,
        recordId: string,
        action: 'CREATE' | 'UPDATE' | 'DELETE',
        oldValues?: any,
        newValues?: any,
        comment?: string
      ) => {
        await db('audit_log').insert({
          id: db.raw('lower(hex(randomblob(16)))'),
          table_name: tableName,
          record_id: recordId,
          action,
          changed_by: mockReq.user?.id,
          old_values: oldValues ? JSON.stringify(oldValues) : null,
          new_values: newValues ? JSON.stringify(newValues) : null,
          changed_fields: oldValues && newValues 
            ? JSON.stringify(Object.keys(newValues).filter(key => oldValues[key] !== newValues[key]))
            : null,
          request_id: mockReq.requestId,
          ip_address: mockReq.ip,
          user_agent: mockReq.get('User-Agent'),
          comment,
          changed_at: new Date()
        });
      }
    } as RequestWithLogging;

    // Create mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    } as unknown as Response;
  });

  describe('ProjectsController Audit', () => {
    test('should audit project creation with business operation logging', async () => {
      mockReq.body = {
        name: 'Test Project with Audit',
        project_type_id: 'type-1',
        project_sub_type_id: 'subtype-1',
        location_id: 'loc-1',
        description: 'Testing audit functionality',
        status: 'Planning'
      };

      await projectsController.create(mockReq, mockRes);

      // Check response
      expect(mockRes.json).toHaveBeenCalled();
      const responseData = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.name).toBe(mockReq.body.name);

      // Check audit log
      const auditEntries = await db('audit_log')
        .where('table_name', 'projects')
        .where('action', 'CREATE')
        .orderBy('changed_at', 'desc')
        .first();

      expect(auditEntries).toBeTruthy();
      expect(auditEntries.changed_by).toBe('test-user-123');
      expect(auditEntries.request_id).toBe(mockReq.requestId);

      const newValues = JSON.parse(auditEntries.new_values);
      expect(newValues.name).toBe(mockReq.body.name);
      expect(newValues.project_type_id).toBe(mockReq.body.project_type_id);
    });

    test('should audit project updates with field tracking', async () => {
      // First create a project
      const projectId = db.raw('lower(hex(randomblob(16)))');
      await db('projects').insert({
        id: projectId,
        name: 'Original Project',
        project_type_id: 'type-1',
        project_sub_type_id: 'subtype-1',
        status: 'Active',
        description: 'Original description'
      });

      mockReq.params = { id: projectId };
      mockReq.body = {
        name: 'Updated Project',
        status: 'On Hold',
        description: 'Updated description'
      };

      await projectsController.update(mockReq, mockRes);

      // Check audit log
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
      expect(oldValues.status).toBe('Active');
      expect(newValues.status).toBe('On Hold');

      const changedFields = JSON.parse(auditEntry.changed_fields || '[]');
      expect(changedFields).toContain('name');
      expect(changedFields).toContain('status');
      expect(changedFields).toContain('description');
    });

    test('should audit project deletion with preserved data', async () => {
      // Create a project to delete
      const projectId = db.raw('lower(hex(randomblob(16)))');
      const projectData = {
        id: projectId,
        name: 'Project to Delete',
        project_type_id: 'type-1',
        project_sub_type_id: 'subtype-1',
        status: 'Active',
        description: 'Will be deleted'
      };
      await db('projects').insert(projectData);

      mockReq.params = { id: projectId };

      await projectsController.delete(mockReq, mockRes);

      // Check audit log
      const auditEntry = await db('audit_log')
        .where('table_name', 'projects')
        .where('record_id', projectId)
        .where('action', 'DELETE')
        .first();

      expect(auditEntry).toBeTruthy();

      const oldValues = JSON.parse(auditEntry.old_values);
      expect(oldValues.name).toBe(projectData.name);
      expect(oldValues.status).toBe(projectData.status);
      expect(auditEntry.new_values).toBeNull();
    });
  });

  describe('AssignmentsController Audit', () => {
    let testProjectId: string;
    let testPersonId: string;

    beforeEach(async () => {
      // Create test data
      testProjectId = 'proj-' + Date.now();
      testPersonId = 'person-' + Date.now();

      await db('projects').insert({
        id: testProjectId,
        name: 'Test Project',
        project_type_id: 'type-1',
        project_sub_type_id: 'subtype-1'
      });
    });

    test('should audit assignment creation', async () => {
      mockReq.body = {
        project_id: testProjectId,
        person_id: testPersonId,
        role_id: 'developer',
        allocation_percentage: 80,
        start_date: '2025-01-01',
        end_date: '2025-06-30'
      };

      await assignmentsController.create(mockReq, mockRes);

      // Check response
      expect(mockRes.json).toHaveBeenCalled();
      const responseData = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);

      // Check audit log
      const auditEntry = await db('audit_log')
        .where('table_name', 'project_assignments')
        .where('action', 'CREATE')
        .orderBy('changed_at', 'desc')
        .first();

      expect(auditEntry).toBeTruthy();
      expect(auditEntry.changed_by).toBe('test-user-123');

      const newValues = JSON.parse(auditEntry.new_values);
      expect(newValues.project_id).toBe(testProjectId);
      expect(newValues.person_id).toBe(testPersonId);
      expect(newValues.allocation_percentage).toBe(80);
    });

    test('should audit assignment updates', async () => {
      // Create an assignment
      const assignmentId = 'assign-' + Date.now();
      await db('project_assignments').insert({
        id: assignmentId,
        project_id: testProjectId,
        person_id: testPersonId,
        role_id: 'developer',
        allocation_percentage: 50
      });

      mockReq.params = { id: assignmentId };
      mockReq.body = {
        allocation_percentage: 100
      };

      await assignmentsController.update(mockReq, mockRes);

      // Check audit log
      const auditEntry = await db('audit_log')
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

    test('should audit scenario assignment deletion', async () => {
      // Create a scenario assignment
      const scenarioAssignmentId = 'scenario-assign-' + Date.now();
      await db('scenario_project_assignments').insert({
        id: scenarioAssignmentId,
        project_id: testProjectId,
        person_id: testPersonId,
        scenario_id: 'scenario-1',
        role_id: 'reviewer',
        allocation_percentage: 25
      });

      mockReq.params = { id: 'spa-' + scenarioAssignmentId };

      await assignmentsController.delete(mockReq, mockRes);

      // Check audit log
      const auditEntry = await db('audit_log')
        .where('table_name', 'scenario_project_assignments')
        .where('record_id', scenarioAssignmentId)
        .where('action', 'DELETE')
        .first();

      expect(auditEntry).toBeTruthy();

      const oldValues = JSON.parse(auditEntry.old_values);
      expect(oldValues.scenario_id).toBe('scenario-1');
      expect(oldValues.role_id).toBe('reviewer');
    });
  });

  describe('Business Operation Logging', () => {
    test('should log business operations with metadata', async () => {
      const loggedOperations: any[] = [];

      // Override logBusinessOperation to capture calls
      const originalLogBusinessOperation = (projectsController as any).logBusinessOperation;
      (projectsController as any).logBusinessOperation = jest.fn((req, operation, entityType, entityId, metadata) => {
        loggedOperations.push({ operation, entityType, entityId, metadata });
        return originalLogBusinessOperation.call(projectsController, req, operation, entityType, entityId, metadata);
      });

      mockReq.body = {
        name: 'Business Operation Test',
        project_type_id: 'type-1',
        project_sub_type_id: 'subtype-1'
      };

      await projectsController.create(mockReq, mockRes);

      // Check business operation was logged
      expect(loggedOperations).toHaveLength(1);
      expect(loggedOperations[0].operation).toBe('CREATE');
      expect(loggedOperations[0].entityType).toBe('project');
      expect(loggedOperations[0].metadata.projectName).toBe('Business Operation Test');
      expect(loggedOperations[0].metadata.projectType).toBe('type-1');
    });
  });

  describe('Error Handling', () => {
    test('should handle audit failures gracefully', async () => {
      // Mock audit failure
      mockReq.logAuditEvent = jest.fn().mockRejectedValue(new Error('Audit service unavailable'));

      mockReq.body = {
        name: 'Test with Audit Failure',
        project_type_id: 'type-1',
        project_sub_type_id: 'subtype-1'
      };

      // Should not throw error even if audit fails
      await expect(projectsController.create(mockReq, mockRes)).resolves.not.toThrow();

      // Project should still be created
      expect(mockRes.json).toHaveBeenCalled();
      const responseData = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(responseData.success).toBe(true);
    });
  });
});