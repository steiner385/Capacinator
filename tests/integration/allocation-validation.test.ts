import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll, jest, it } from '@jest/globals';
import { db } from './setup';
import { v4 as uuidv4 } from 'uuid';

// Mock the database module to use test database
jest.mock('../../src/server/database/index.js', () => ({
  db: require('./setup').db
}));

// Mock the notification scheduler to prevent cron jobs
jest.mock('../../src/server/services/NotificationScheduler.js', () => ({
  notificationScheduler: {
    scheduleAssignmentNotification: jest.fn(),
    sendAssignmentNotification: jest.fn(),
    start: jest.fn(),
    stop: jest.fn()
  }
}));

import { AssignmentsController } from '../../src/server/api/controllers/AssignmentsController';

describe.skip('Allocation Validation Tests', () => {
  let assignmentsController: AssignmentsController;
  let testPersonId: string;
  let testProjectId: string;
  let testRoleId: string;
  let testLocationId: string;
  let testProjectTypeId: string;

  beforeAll(async () => {
    assignmentsController = new AssignmentsController();
    // Mock the db property on controller to use test database
    (assignmentsController as any).db = db;
  });

  beforeEach(async () => {
    // Create test data
    testLocationId = uuidv4();
    await db('locations').insert({
      id: testLocationId,
      name: 'Test Location',
      created_at: new Date(),
      updated_at: new Date()
    });

    testProjectTypeId = uuidv4();
    await db('project_types').insert({
      id: testProjectTypeId,
      name: 'Test Type',
      created_at: new Date(),
      updated_at: new Date()
    });

    testRoleId = uuidv4();
    await db('roles').insert({
      id: testRoleId,
      name: 'Developer',
      created_at: new Date(),
      updated_at: new Date()
    });

    testPersonId = uuidv4();
    await db('people').insert({
      id: testPersonId,
      name: 'Test Person',
      email: 'test@example.com',
      is_active: true,
      default_hours_per_day: 8,
      default_availability_percentage: 100,
      location_id: testLocationId,
      created_at: new Date(),
      updated_at: new Date()
    });

    testProjectId = uuidv4();
    await db('projects').insert({
      id: testProjectId,
      name: 'Test Project',
      project_type_id: testProjectTypeId,
      priority: 1,
      aspiration_start: '2025-01-01',
      aspiration_finish: '2025-12-31',
      include_in_demand: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create baseline scenario
    await db('scenarios').insert({
      id: 'baseline-0000-0000-0000-000000000000',
      name: 'Baseline',
      status: 'active',
      scenario_type: 'baseline',
      created_by: testPersonId,
      created_at: new Date(),
      updated_at: new Date()
    });
  });

  afterEach(async () => {
    // Clean up in reverse order due to foreign keys
    await db('scenario_project_assignments').delete();
    await db('project_assignments').delete();
    await db('person_roles').delete();
    await db('scenarios').delete();
    if (testPersonId) await db('people').where('id', testPersonId).delete();
    if (testProjectId) await db('projects').where('id', testProjectId).delete();
    if (testRoleId) await db('roles').where('id', testRoleId).delete();
    if (testProjectTypeId) await db('project_types').where('id', testProjectTypeId).delete();
    if (testLocationId) await db('locations').where('id', testLocationId).delete();
  });

  describe('Assignment Creation Validation', () => {
    test('should reject assignments with allocation_percentage <= 0', async () => {
      const req = {
        body: {
          project_id: testProjectId,
          person_id: testPersonId,
          role_id: testRoleId,
          allocation_percentage: 0,
          start_date: '2025-01-01',
          end_date: '2025-06-30',
          assignment_date_mode: 'fixed'
        },
        params: { id: uuidv4() }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await assignmentsController.create(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Allocation percentage must be positive'
      });
    });

    test('should reject assignments with allocation_percentage > 200', async () => {
      const req = {
        body: {
          project_id: testProjectId,
          person_id: testPersonId,
          role_id: testRoleId,
          allocation_percentage: 250,
          start_date: '2025-01-01',
          end_date: '2025-06-30',
          assignment_date_mode: 'fixed'
        },
        params: { id: uuidv4() }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await assignmentsController.create(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Allocation percentage cannot exceed 200%'
      });
    });

    test('should accept valid allocation percentages', async () => {
      const req = {
        body: {
          project_id: testProjectId,
          person_id: testPersonId,
          role_id: testRoleId,
          allocation_percentage: 50,
          start_date: '2025-01-01',
          end_date: '2025-06-30',
          assignment_date_mode: 'fixed'
        },
        params: { id: uuidv4() },
        headers: { 'x-scenario-id': 'baseline-0000-0000-0000-000000000000' }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await assignmentsController.create(req as any, res as any);

      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const response = (res.json as jest.Mock).mock.calls[0][0];
      expect(response.id).toBeDefined();
      expect(response.allocation_percentage).toBe(50);
    });

    test('should warn about overallocation but still create assignment', async () => {
      // First assignment - 80%
      const assignment1Id = uuidv4();
      await db('scenario_project_assignments').insert({
        id: assignment1Id,
        scenario_id: 'baseline-0000-0000-0000-000000000000',
        project_id: testProjectId,
        person_id: testPersonId,
        role_id: testRoleId,
        allocation_percentage: 80,
        assignment_date_mode: 'fixed',
        start_date: '2025-01-01',
        end_date: '2025-06-30',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Try to create second assignment that would make total 130%
      const req = {
        body: {
          project_id: testProjectId,
          person_id: testPersonId,
          role_id: testRoleId,
          allocation_percentage: 50,
          start_date: '2025-03-01',
          end_date: '2025-05-31',
          assignment_date_mode: 'fixed'
        },
        params: { id: uuidv4() },
        headers: { 'x-scenario-id': 'baseline-0000-0000-0000-000000000000' }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await assignmentsController.create(req as any, res as any);

      // Should create assignment despite overallocation
      expect(res.json).toHaveBeenCalled();
      const response = (res.json as jest.Mock).mock.calls[0][0];
      expect(response.id).toBeDefined();
      expect(response.allocation_percentage).toBe(50);
      
      // Verify total allocation is now 130%
      const totalAllocation = await db('scenario_project_assignments')
        .where('person_id', testPersonId)
        .where('scenario_id', 'baseline-0000-0000-0000-000000000000')
        .where(function() {
          this.where('start_date', '<=', '2025-05-31')
            .andWhere('end_date', '>=', '2025-03-01');
        })
        .sum('allocation_percentage as total')
        .first();
      
      expect(totalAllocation.total).toBe(130);
    });
  });

  describe('Assignment Update Validation', () => {
    let existingAssignmentId: string;

    beforeEach(async () => {
      // Create an existing assignment
      existingAssignmentId = uuidv4();
      await db('scenario_project_assignments').insert({
        id: existingAssignmentId,
        scenario_id: 'baseline-0000-0000-0000-000000000000',
        project_id: testProjectId,
        person_id: testPersonId,
        role_id: testRoleId,
        allocation_percentage: 40,
        assignment_date_mode: 'fixed',
        start_date: '2025-01-01',
        end_date: '2025-06-30',
        created_at: new Date(),
        updated_at: new Date()
      });
    });

    test('should reject updates with allocation_percentage <= 0', async () => {
      const req = {
        params: { id: existingAssignmentId },
        body: {
          allocation_percentage: -10
        }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await assignmentsController.update(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Allocation percentage must be positive'
      });
    });

    test('should reject updates with allocation_percentage > 200', async () => {
      const req = {
        params: { id: existingAssignmentId },
        body: {
          allocation_percentage: 300
        }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await assignmentsController.update(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Allocation percentage cannot exceed 200%'
      });
    });

    test('should accept valid allocation percentage updates', async () => {
      const req = {
        params: { id: existingAssignmentId },
        body: {
          allocation_percentage: 75
        },
        headers: { 'x-scenario-id': 'baseline-0000-0000-0000-000000000000' }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await assignmentsController.update(req as any, res as any);

      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const response = (res.json as jest.Mock).mock.calls[0][0];
      expect(response.allocation_percentage).toBe(75);
    });
  });

  describe('Allocation Edge Cases', () => {
    test('should handle exactly 200% allocation', async () => {
      const req = {
        body: {
          project_id: testProjectId,
          person_id: testPersonId,
          role_id: testRoleId,
          allocation_percentage: 200,
          start_date: '2025-01-01',
          end_date: '2025-06-30',
          assignment_date_mode: 'fixed'
        },
        params: { id: uuidv4() },
        headers: { 'x-scenario-id': 'baseline-0000-0000-0000-000000000000' }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await assignmentsController.create(req as any, res as any);

      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const response = (res.json as jest.Mock).mock.calls[0][0];
      expect(response.allocation_percentage).toBe(200);
    });

    test('should handle missing allocation percentage as 0', async () => {
      const req = {
        body: {
          project_id: testProjectId,
          person_id: testPersonId,
          role_id: testRoleId,
          start_date: '2025-01-01',
          end_date: '2025-06-30',
          assignment_date_mode: 'fixed'
          // allocation_percentage not provided
        },
        params: { id: uuidv4() }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await assignmentsController.create(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Allocation percentage must be positive'
      });
    });
  });
});