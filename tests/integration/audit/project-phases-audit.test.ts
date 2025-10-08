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
    enabledTables: ['project_phases_timeline', 'projects']
  }),
  isTableAudited: (tableName: string) => {
    return ['project_phases_timeline', 'projects'].includes(tableName);
  }
}));

describe('ProjectPhasesController Audit Integration Tests', () => {
  let app: Express;
  let db: Knex;
  let testProjectId: string;
  let testPhaseId: string;

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
      table.timestamps(true, true);
    });

    await db.schema.createTable('project_phases_timeline', (table) => {
      table.uuid('id').primary();
      table.uuid('project_id').notNullable();
      table.string('phase_name').notNullable();
      table.date('start_date').nullable();
      table.date('end_date').nullable();
      table.integer('duration_days').nullable();
      table.text('description').nullable();
      table.timestamps(true, true);
    });

    // Create test data
    testProjectId = 'proj-' + Date.now();
    testPhaseId = 'phase-' + Date.now();

    await db('projects').insert({
      id: testProjectId,
      name: 'Test Project',
      description: 'Project for phase testing'
    });

    await db('project_phases_timeline').insert({
      id: testPhaseId,
      project_id: testProjectId,
      phase_name: 'Planning',
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      duration_days: 30,
      description: 'Initial planning phase'
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

  test('should audit phase UPDATE operations with date changes', async () => {
    // Simulate ProjectPhasesController.update behavior
    app.put('/phases/:id', async (req: any, res: Response) => {
      const { id } = req.params;

      try {
        // Get current phase (simulating the corrected controller logic)
        const currentPhase = await db('project_phases_timeline').where('id', id).first();
        if (!currentPhase) {
          return res.status(404).json({ error: 'Phase not found' });
        }


        // Update phase
        const timelineUpdateData = {
          ...req.body,
          updated_at: new Date()
        };

        await db('project_phases_timeline').where('id', id).update(timelineUpdateData);

        // Log audit event using the corrected pattern from the fix
        try {
          await req.logAuditEvent(
            'project_phases_timeline',
            id,
            'UPDATE',
            currentPhase,
            {
              ...currentPhase,
              ...timelineUpdateData,
              updated_at: new Date()
            }
          );
        } catch (auditError) {
          req.logger.error('Audit failed but continuing', auditError);
        }

        const updatedPhase = await db('project_phases_timeline').where('id', id).first();
        res.json({
          success: true,
          data: updatedPhase,
          message: 'Phase updated successfully'
        });
      } catch (error: any) {
        req.logger.error('Failed to update phase', error);
        res.status(500).json({ error: 'Failed to update phase' });
      }
    });

    // Test phase date update
    const updateData = {
      start_date: '2024-02-01',
      end_date: '2024-02-28',
      duration_days: 28
    };

    const response = await request(app)
      .put(`/phases/${testPhaseId}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Wait for async audit write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify audit log was created
    const auditEntry = await db('audit_log')
      .where('table_name', 'project_phases_timeline')
      .where('record_id', testPhaseId)
      .where('action', 'UPDATE')
      .orderBy('changed_at', 'desc')
      .first();

    expect(auditEntry).toBeTruthy();
    expect(auditEntry.changed_by).toBe('test-user-123');
    expect(auditEntry.request_id).toContain('test-request');

    const oldValues = JSON.parse(auditEntry.old_values);
    const newValues = JSON.parse(auditEntry.new_values);

    expect(oldValues.start_date).toBe('2024-01-01');
    expect(newValues.start_date).toBe('2024-02-01');
    expect(oldValues.end_date).toBe('2024-01-31');
    expect(newValues.end_date).toBe('2024-02-28');

    const changedFields = JSON.parse(auditEntry.changed_fields);
    expect(changedFields).toContain('start_date');
    expect(changedFields).toContain('end_date');
    expect(changedFields).toContain('duration_days');
  });

  test('should audit phase DELETE operations', async () => {
    // Create a phase to delete
    const phaseToDelete = {
      id: 'del-phase-' + Date.now(),
      project_id: testProjectId,
      phase_name: 'Testing',
      start_date: '2024-03-01',
      end_date: '2024-03-15',
      duration_days: 14
    };
    await db('project_phases_timeline').insert(phaseToDelete);

    // Simulate ProjectPhasesController.delete behavior
    app.delete('/phases/:id', async (req: any, res: Response) => {
      const { id } = req.params;

      try {
        // Get current phase before deletion
        const currentPhase = await db('project_phases_timeline').where('id', id).first();
        if (!currentPhase) {
          return res.status(404).json({ error: 'Phase not found' });
        }

        // Delete phase
        await db('project_phases_timeline').where('id', id).del();

        // Log audit event using the corrected pattern
        await req.logAuditEvent(
          'project_phases_timeline',
          id,
          'DELETE',
          currentPhase,
          null
        );

        res.json({
          success: true,
          message: 'Phase deleted successfully'
        });
      } catch (error: any) {
        req.logger.error('Failed to delete phase', error);
        res.status(500).json({ error: 'Failed to delete phase' });
      }
    });

    const response = await request(app)
      .delete(`/phases/${phaseToDelete.id}`)
      .expect(200);

    expect(response.body.success).toBe(true);

    // Wait for async audit write
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify audit log was created
    const auditEntry = await db('audit_log')
      .where('table_name', 'project_phases_timeline')
      .where('record_id', phaseToDelete.id)
      .where('action', 'DELETE')
      .first();

    expect(auditEntry).toBeTruthy();
    expect(auditEntry.changed_by).toBe('test-user-123');

    const oldValues = JSON.parse(auditEntry.old_values);
    expect(oldValues.phase_name).toBe('Testing');
    expect(oldValues.start_date).toBe('2024-03-01');
    expect(auditEntry.new_values).toBeNull();
  });

  test('should audit bulk phase updates', async () => {
    // Create multiple phases for bulk testing
    const bulkPhases = [
      {
        id: 'bulk-phase-1-' + Date.now(),
        project_id: testProjectId,
        phase_name: 'Design',
        start_date: '2024-04-01',
        end_date: '2024-04-15'
      },
      {
        id: 'bulk-phase-2-' + Date.now(),
        project_id: testProjectId,
        phase_name: 'Development',
        start_date: '2024-04-16',
        end_date: '2024-05-15'
      }
    ];

    for (const phase of bulkPhases) {
      await db('project_phases_timeline').insert(phase);
    }

    // Simulate ProjectPhasesController.bulkUpdate behavior
    app.put('/phases/bulk', async (req: any, res: Response) => {
      const { updates } = req.body;
      const results = [];

      try {
        for (const update of updates) {
          const { id, ...updateData } = update;

          // Get current phase
          const currentPhase = await db('project_phases_timeline').where('id', id).first();
          if (!currentPhase) continue;

          // Update phase
          const timelineUpdateData = {
            ...updateData,
            updated_at: new Date()
          };

          await db('project_phases_timeline').where('id', id).update(timelineUpdateData);

          // Log audit event
          await req.logAuditEvent(
            'project_phases_timeline',
            id,
            'UPDATE',
            currentPhase,
            {
              ...currentPhase,
              ...timelineUpdateData
            }
          );

          const updatedPhase = await db('project_phases_timeline').where('id', id).first();
          results.push(updatedPhase);
        }

        res.json({
          success: true,
          updated: results,
          message: 'Phases updated successfully'
        });
      } catch (error: any) {
        req.logger.error('Failed to bulk update phases', error);
        res.status(500).json({ error: 'Failed to bulk update phases' });
      }
    });

    const bulkUpdateData = {
      updates: [
        {
          id: bulkPhases[0].id,
          duration_days: 20
        },
        {
          id: bulkPhases[1].id,
          duration_days: 35
        }
      ]
    };

    const response = await request(app)
      .put('/phases/bulk')
      .send(bulkUpdateData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.updated).toHaveLength(2);

    // Wait for async audit writes
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify audit logs were created for both phases
    const auditEntries = await db('audit_log')
      .where('table_name', 'project_phases_timeline')
      .where('action', 'UPDATE')
      .whereIn('record_id', bulkPhases.map(p => p.id))
      .select('*');

    expect(auditEntries.length).toBe(2);

    // Verify all entries have the same request_id (grouped operation)
    const requestIds = auditEntries.map(entry => entry.request_id);
    expect(new Set(requestIds).size).toBe(1); // All should have same request_id
  });

  test('should handle audit failures gracefully during phase operations', async () => {
    // Simulate ProjectPhasesController with audit failure
    app.put('/phases/:id/fail-audit', async (req: any, res: Response) => {
      const { id } = req.params;

      try {
        // Get current phase
        const currentPhase = await db('project_phases_timeline').where('id', id).first();
        if (!currentPhase) {
          return res.status(404).json({ error: 'Phase not found' });
        }

        // Update phase successfully
        const updateData = { ...req.body, updated_at: new Date() };
        await db('project_phases_timeline').where('id', id).update(updateData);

        // Simulate audit failure
        try {
          throw new Error('Audit service unavailable');
        } catch (auditError) {
          req.logger.error('Audit failed but phase update succeeded', auditError);
        }

        const updatedPhase = await db('project_phases_timeline').where('id', id).first();
        res.json({
          success: true,
          data: updatedPhase,
          message: 'Phase updated successfully (audit failed)'
        });
      } catch (error: any) {
        req.logger.error('Failed to update phase', error);
        res.status(500).json({ error: 'Failed to update phase' });
      }
    });

    const response = await request(app)
      .put(`/phases/${testPhaseId}/fail-audit`)
      .send({ description: 'Updated with audit failure' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.description).toBe('Updated with audit failure');

    // Verify phase was actually updated despite audit failure
    const updatedPhase = await db('project_phases_timeline').where('id', testPhaseId).first();
    expect(updatedPhase.description).toBe('Updated with audit failure');
  });
});