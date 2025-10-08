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
    enabledTables: ['scenarios', 'scenario_project_assignments', 'scenario_merge_conflicts']
  }),
  isTableAudited: (tableName: string) => {
    return ['scenarios', 'scenario_project_assignments', 'scenario_merge_conflicts'].includes(tableName);
  }
}));

describe('ScenariosController Audit Integration Tests', () => {
  let app: Express;
  let db: Knex;
  let testScenarioId: string;
  let parentScenarioId: string;

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

    await db.schema.createTable('scenarios', (table) => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.text('description').nullable();
      table.uuid('parent_scenario_id').nullable();
      table.string('scenario_type').defaultTo('baseline');
      table.string('status').defaultTo('active');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
      table.string('created_by').nullable();
    });

    await db.schema.createTable('scenario_project_assignments', (table) => {
      table.uuid('id').primary();
      table.uuid('scenario_id').notNullable();
      table.uuid('project_id').notNullable();
      table.uuid('person_id').notNullable();
      table.string('role_id').notNullable();
      table.integer('allocation_percentage').defaultTo(100);
      table.date('start_date').nullable();
      table.date('end_date').nullable();
      table.timestamps(true, true);
    });

    await db.schema.createTable('scenario_merge_conflicts', (table) => {
      table.uuid('id').primary();
      table.uuid('scenario_id').notNullable();
      table.uuid('target_scenario_id').notNullable();
      table.string('conflict_type').notNullable();
      table.text('conflict_data').nullable();
      table.string('resolution_strategy').nullable();
      table.timestamps(true, true);
    });

    // Create test data
    testScenarioId = 'scenario-' + Date.now();
    parentScenarioId = 'parent-scenario-' + Date.now();

    await db('scenarios').insert({
      id: parentScenarioId,
      name: 'Parent Scenario',
      description: 'Main scenario for testing',
      scenario_type: 'baseline',
      status: 'active'
    });

    await db('scenarios').insert({
      id: testScenarioId,
      name: 'Test Scenario',
      description: 'Test scenario for audit',
      parent_scenario_id: parentScenarioId,
      scenario_type: 'variant',
      status: 'draft'
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

  test('should audit scenario creation', async () => {
    app.post('/scenarios', async (req: any, res: Response) => {
      const scenarioData = {
        id: 'new-scenario-' + Date.now(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        await db('scenarios').insert(scenarioData);

        // Log audit event using the enhanced middleware pattern
        await req.logAuditEvent(
          'scenarios',
          scenarioData.id,
          'CREATE',
          null,
          scenarioData
        );

        res.status(201).json({
          success: true,
          data: scenarioData,
          message: 'Scenario created successfully'
        });
      } catch (error: any) {
        req.logger.error('Failed to create scenario', error);
        res.status(500).json({ error: 'Failed to create scenario' });
      }
    });

    const newScenarioData = {
      name: 'New Test Scenario',
      description: 'Created for audit testing',
      status: 'draft'
    };

    const response = await request(app)
      .post('/scenarios')
      .send(newScenarioData)
      .expect(201);

    expect(response.body.success).toBe(true);

    // Wait for async audit write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify audit log was created
    const auditEntry = await db('audit_log')
      .where('table_name', 'scenarios')
      .where('record_id', response.body.data.id)
      .where('action', 'CREATE')
      .first();

    expect(auditEntry).toBeTruthy();
    expect(auditEntry.changed_by).toBe('test-user-123');
    expect(auditEntry.request_id).toContain('test-request');

    const newValues = JSON.parse(auditEntry.new_values);
    expect(newValues.name).toBe(newScenarioData.name);
    expect(newValues.description).toBe(newScenarioData.description);
    expect(auditEntry.old_values).toBeNull();
  });

  test('should audit scenario updates', async () => {
    app.put('/scenarios/:id', async (req: any, res: Response) => {
      const { id } = req.params;

      try {
        // Get current scenario
        const currentScenario = await db('scenarios').where('id', id).first();
        if (!currentScenario) {
          return res.status(404).json({ error: 'Scenario not found' });
        }

        // Update scenario
        const updateData = {
          ...req.body,
          updated_at: new Date()
        };

        await db('scenarios').where('id', id).update(updateData);

        const updatedScenario = await db('scenarios').where('id', id).first();

        // Log audit event
        await req.logAuditEvent(
          'scenarios',
          id,
          'UPDATE',
          currentScenario,
          updatedScenario
        );

        res.json({
          success: true,
          data: updatedScenario,
          message: 'Scenario updated successfully'
        });
      } catch (error: any) {
        req.logger.error('Failed to update scenario', error);
        res.status(500).json({ error: 'Failed to update scenario' });
      }
    });

    const updateData = {
      name: 'Updated Test Scenario',
      status: 'active'
    };

    const response = await request(app)
      .put(`/scenarios/${testScenarioId}`)
      .send(updateData)
      .expect(200);

    expect(response.body.success).toBe(true);

    // Wait for async audit write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify audit log was created
    const auditEntry = await db('audit_log')
      .where('table_name', 'scenarios')
      .where('record_id', testScenarioId)
      .where('action', 'UPDATE')
      .orderBy('changed_at', 'desc')
      .first();

    expect(auditEntry).toBeTruthy();

    const oldValues = JSON.parse(auditEntry.old_values);
    const newValues = JSON.parse(auditEntry.new_values);

    expect(oldValues.name).toBe('Test Scenario');
    expect(newValues.name).toBe('Updated Test Scenario');
    expect(oldValues.status).toBe('draft');
    expect(newValues.status).toBe('active');

    const changedFields = JSON.parse(auditEntry.changed_fields);
    expect(changedFields).toContain('name');
    expect(changedFields).toContain('status');
  });

  test('should audit scenario merge operations with grouped request ID', async () => {
    // Create merge conflicts for testing
    const conflictId = 'conflict-' + Date.now();
    await db('scenario_merge_conflicts').insert({
      id: conflictId,
      scenario_id: testScenarioId,
      target_scenario_id: parentScenarioId,
      conflict_type: 'assignment_overlap',
      conflict_data: JSON.stringify({ person_id: 'person-123', overlapping_dates: true })
    });

    app.post('/scenarios/:id/merge', async (req: any, res: Response) => {
      const { id } = req.params;
      const { resolve_conflicts_as } = req.body;
      
      // Use a fixed request ID for this test to ensure grouping
      req.requestId = 'test-request-merge-grouped';

      try {
        // Get current scenario
        const scenario = await db('scenarios').where('id', id).first();
        if (!scenario) {
          return res.status(404).json({ error: 'Scenario not found' });
        }

        // Audit log - merge initiation (using the pattern from ScenariosController)
        await req.logAuditEvent(
          'scenarios',
          id,
          'UPDATE',
          scenario,
          { ...scenario, status: 'merging' },
          `Merge initiated from ${scenario.name} to parent scenario ${scenario.parent_scenario_id} with conflict resolution: ${resolve_conflicts_as}`
        );

        // Update scenario status
        await db('scenarios').where('id', id).update({ 
          status: 'merging',
          updated_at: new Date()
        });

        // Simulate resolving conflicts
        const conflicts = await db('scenario_merge_conflicts')
          .where('scenario_id', id);

        for (const conflict of conflicts) {
          // Log conflict resolution
          await req.logAuditEvent(
            'scenario_merge_conflicts',
            conflict.id,
            'UPDATE',
            conflict,
            { 
              ...conflict, 
              resolution_strategy: resolve_conflicts_as,
              updated_at: new Date()
            },
            `Conflict resolved using strategy: ${resolve_conflicts_as}`
          );

          // Update conflict
          await db('scenario_merge_conflicts')
            .where('id', conflict.id)
            .update({ 
              resolution_strategy: resolve_conflicts_as,
              updated_at: new Date()
            });
        }

        // Complete merge - update final status
        const finalScenario = { ...scenario, status: 'merged', updated_at: new Date() };
        await db('scenarios').where('id', id).update(finalScenario);

        // Audit log - merge completion
        await req.logAuditEvent(
          'scenarios',
          id,
          'UPDATE',
          { ...scenario, status: 'merging' },
          finalScenario,
          `Merge completed successfully to parent scenario ${scenario.parent_scenario_id}`
        );

        res.json({
          success: true,
          data: finalScenario,
          conflicts_resolved: conflicts.length,
          message: 'Scenario merge completed successfully'
        });
      } catch (error: any) {
        req.logger.error('Failed to merge scenario', error);
        res.status(500).json({ error: 'Failed to merge scenario' });
      }
    });

    const response = await request(app)
      .post(`/scenarios/${testScenarioId}/merge`)
      .send({ resolve_conflicts_as: 'use_parent' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('merged');

    // Wait for async audit writes
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify multiple audit entries were created with the same request_id
    const auditEntries = await db('audit_log')
      .where('request_id', 'test-request-merge-grouped')
      .orderBy('changed_at', 'asc');

    // Should have entries for:
    // 1. Merge initiation (scenario status -> merging)
    // 2. Conflict resolution (scenario_merge_conflicts)
    // 3. Merge completion (scenario status -> merged)
    expect(auditEntries.length).toBeGreaterThanOrEqual(3);

    // All entries should have the same request_id (grouped operation)
    const requestIds = auditEntries.map(entry => entry.request_id);
    expect(new Set(requestIds).size).toBe(1);

    // Verify scenario merge audit entries
    const scenarioEntries = auditEntries.filter(entry => entry.table_name === 'scenarios');
    expect(scenarioEntries.length).toBe(2); // initiation and completion

    const initiationEntry = scenarioEntries[0];
    expect(initiationEntry.comment).toContain('Merge initiated');
    expect(initiationEntry.comment).toContain('use_parent');

    const completionEntry = scenarioEntries[1];
    expect(completionEntry.comment).toContain('Merge completed successfully');

    // Verify conflict resolution audit entry
    const conflictEntries = auditEntries.filter(entry => entry.table_name === 'scenario_merge_conflicts');
    expect(conflictEntries.length).toBe(1);
    expect(conflictEntries[0].comment).toContain('Conflict resolved using strategy: use_parent');
  });

  test('should audit scenario deletion', async () => {
    // Create a scenario to delete
    const scenarioToDelete = {
      id: 'del-scenario-' + Date.now(),
      name: 'Scenario to Delete',
      description: 'Will be deleted',
      status: 'draft'
    };
    await db('scenarios').insert(scenarioToDelete);

    app.delete('/scenarios/:id', async (req: any, res: Response) => {
      const { id } = req.params;

      try {
        // Get current scenario before deletion
        const currentScenario = await db('scenarios').where('id', id).first();
        if (!currentScenario) {
          return res.status(404).json({ error: 'Scenario not found' });
        }

        // Delete scenario
        await db('scenarios').where('id', id).del();

        // Log audit event
        await req.logAuditEvent(
          'scenarios',
          id,
          'DELETE',
          currentScenario,
          null
        );

        res.json({
          success: true,
          message: 'Scenario deleted successfully'
        });
      } catch (error: any) {
        req.logger.error('Failed to delete scenario', error);
        res.status(500).json({ error: 'Failed to delete scenario' });
      }
    });

    const response = await request(app)
      .delete(`/scenarios/${scenarioToDelete.id}`)
      .expect(200);

    expect(response.body.success).toBe(true);

    // Wait for async audit write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify audit log was created
    const auditEntry = await db('audit_log')
      .where('table_name', 'scenarios')
      .where('record_id', scenarioToDelete.id)
      .where('action', 'DELETE')
      .first();

    expect(auditEntry).toBeTruthy();

    const oldValues = JSON.parse(auditEntry.old_values);
    expect(oldValues.name).toBe('Scenario to Delete');
    expect(oldValues.description).toBe('Will be deleted');
    expect(auditEntry.new_values).toBeNull();
  });

  test('should audit scenario assignment operations', async () => {
    // Create a scenario assignment
    app.post('/scenarios/:scenarioId/assignments', async (req: any, res: Response) => {
      const { scenarioId } = req.params;

      try {
        const assignmentData = {
          id: 'scenario-assign-' + Date.now(),
          scenario_id: scenarioId,
          ...req.body,
          created_at: new Date(),
          updated_at: new Date()
        };

        await db('scenario_project_assignments').insert(assignmentData);

        // Log audit event
        await req.logAuditEvent(
          'scenario_project_assignments',
          assignmentData.id,
          'CREATE',
          null,
          assignmentData
        );

        res.status(201).json({
          success: true,
          data: assignmentData,
          message: 'Scenario assignment created successfully'
        });
      } catch (error: any) {
        req.logger.error('Failed to create scenario assignment', error);
        res.status(500).json({ error: 'Failed to create scenario assignment' });
      }
    });

    const assignmentData = {
      project_id: 'project-123',
      person_id: 'person-456',
      role_id: 'developer',
      allocation_percentage: 75,
      start_date: '2024-01-01',
      end_date: '2024-03-31'
    };

    const response = await request(app)
      .post(`/scenarios/${testScenarioId}/assignments`)
      .send(assignmentData)
      .expect(201);

    expect(response.body.success).toBe(true);

    // Wait for async audit write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify audit log was created
    const auditEntry = await db('audit_log')
      .where('table_name', 'scenario_project_assignments')
      .where('record_id', response.body.data.id)
      .where('action', 'CREATE')
      .first();

    expect(auditEntry).toBeTruthy();

    const newValues = JSON.parse(auditEntry.new_values);
    expect(newValues.scenario_id).toBe(testScenarioId);
    expect(newValues.project_id).toBe('project-123');
    expect(newValues.allocation_percentage).toBe(75);
  });

  test('should handle scenario audit failures gracefully', async () => {
    app.put('/scenarios/:id/fail-audit', async (req: any, res: Response) => {
      const { id } = req.params;

      try {
        // Get current scenario
        const currentScenario = await db('scenarios').where('id', id).first();
        if (!currentScenario) {
          return res.status(404).json({ error: 'Scenario not found' });
        }

        // Update scenario successfully
        const updateData = { ...req.body, updated_at: new Date() };
        await db('scenarios').where('id', id).update(updateData);

        // Simulate audit failure
        try {
          throw new Error('Audit service unavailable');
        } catch (auditError) {
          req.logger.error('Audit failed but scenario update succeeded', auditError);
        }

        const updatedScenario = await db('scenarios').where('id', id).first();
        res.json({
          success: true,
          data: updatedScenario,
          message: 'Scenario updated successfully (audit failed)'
        });
      } catch (error: any) {
        req.logger.error('Failed to update scenario', error);
        res.status(500).json({ error: 'Failed to update scenario' });
      }
    });

    const response = await request(app)
      .put(`/scenarios/${testScenarioId}/fail-audit`)
      .send({ description: 'Updated with audit failure' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.description).toBe('Updated with audit failure');

    // Verify scenario was actually updated despite audit failure
    const updatedScenario = await db('scenarios').where('id', testScenarioId).first();
    expect(updatedScenario.description).toBe('Updated with audit failure');
  });
});