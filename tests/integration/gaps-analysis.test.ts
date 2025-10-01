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

import { ReportingController } from '../../src/server/api/controllers/ReportingController';

describe('Gaps Analysis API Tests', () => {
  let reportingController: ReportingController;
  let testRoles: any[] = [];
  let testPeople: any[] = [];
  let testProjects: any[] = [];
  let testScenario: any;
  let testLocationId: string;
  let testProjectTypeId: string;

  beforeAll(async () => {
    reportingController = new ReportingController();
    // Mock the db property on controller to use test database
    (reportingController as any).db = db;
  });

  beforeEach(async () => {
    // Clean up test data
    await db('scenario_project_assignments').delete();
    await db('project_assignments').delete();
    await db('person_roles').delete();
    await db('people').delete();
    await db('projects').delete();
    await db('roles').delete();
    await db('scenarios').delete();
    await db('locations').delete();
    await db('project_types').delete();

    // Create test location
    testLocationId = uuidv4();
    await db('locations').insert({
      id: testLocationId,
      name: 'Test Location',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create test project type
    testProjectTypeId = uuidv4();
    await db('project_types').insert({
      id: testProjectTypeId,
      name: 'Test Type',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create test roles
    testRoles = [
      { id: uuidv4(), name: 'Data Scientist', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Frontend Developer', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Backend Developer', created_at: new Date(), updated_at: new Date() }
    ];
    await db('roles').insert(testRoles);

    // Create test people with roles
    testPeople = [
      {
        id: uuidv4(),
        name: 'Data Scientist 1',
        email: 'ds1@example.com',
        is_active: true,
        default_hours_per_day: 8,
        default_availability_percentage: 100,
        location_id: testLocationId,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Frontend Dev 1',
        email: 'fe1@example.com',
        is_active: true,
        default_hours_per_day: 8,
        default_availability_percentage: 100,
        location_id: testLocationId,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Backend Dev 1',
        email: 'be1@example.com',
        is_active: true,
        default_hours_per_day: 8,
        default_availability_percentage: 100,
        location_id: testLocationId,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Backend Dev 2',
        email: 'be2@example.com',
        is_active: true,
        default_hours_per_day: 8,
        default_availability_percentage: 100,
        location_id: testLocationId,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    await db('people').insert(testPeople);

    // Assign roles to people
    await db('person_roles').insert([
      {
        id: uuidv4(),
        person_id: testPeople[0].id,
        role_id: testRoles[0].id, // Data Scientist
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        person_id: testPeople[1].id,
        role_id: testRoles[1].id, // Frontend Developer
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        person_id: testPeople[2].id,
        role_id: testRoles[2].id, // Backend Developer
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        person_id: testPeople[3].id,
        role_id: testRoles[2].id, // Backend Developer
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Create test projects
    testProjects = [
      {
        id: uuidv4(),
        name: 'AI Project',
        project_type_id: testProjectTypeId,
        priority: 1,
        aspiration_start: new Date().toISOString().split('T')[0],
        aspiration_finish: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        include_in_demand: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Frontend Project',
        project_type_id: testProjectTypeId,
        priority: 1,
        aspiration_start: new Date().toISOString().split('T')[0],
        aspiration_finish: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        include_in_demand: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    await db('projects').insert(testProjects);

    // Create active scenario
    testScenario = {
      id: uuidv4(),
      name: 'Test Scenario',
      status: 'active',
      description: 'Test scenario for gaps analysis',
      created_at: new Date(),
      updated_at: new Date()
    };
    await db('scenarios').insert(testScenario);
  });

  afterEach(async () => {
    // Clean up in reverse order due to foreign keys
    await db('scenario_project_assignments').delete();
    await db('project_assignments').delete();
    await db('person_roles').delete();
    await db('people').delete();
    await db('projects').delete();
    await db('roles').delete();
    await db('scenarios').delete();
    await db('locations').delete();
    await db('project_types').delete();
  });

  describe('Capacity Gaps Calculation', () => {
    test('should show balanced capacity when no assignments exist', async () => {
      const req = { query: {} };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await reportingController.getGapsAnalysis(req as any, res as any);

      expect(res.json).toHaveBeenCalled();
      const response = (res.json as jest.Mock).mock.calls[0][0];
      
      expect(response.capacityGaps).toBeDefined();
      expect(response.capacityGaps.length).toBe(3); // Three roles
      
      // All roles should have 0 demand and positive capacity
      response.capacityGaps.forEach((gap: any) => {
        expect(gap.total_demand_fte).toBe(0);
        expect(gap.total_capacity_fte).toBeGreaterThan(0);
        expect(gap.capacity_gap_fte).toBeGreaterThan(0); // Positive means excess capacity
        expect(gap.status).toBe('OK');
      });
    });

    test('should detect shortage when demand exceeds capacity', async () => {
      // Create high-demand assignment for Data Scientist
      await db('scenario_project_assignments').insert({
        id: uuidv4(),
        scenario_id: testScenario.id,
        project_id: testProjects[0].id,
        person_id: testPeople[0].id,
        role_id: testRoles[0].id, // Data Scientist
        allocation_percentage: 150, // 1.5 FTE demand
        assignment_date_mode: 'fixed',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created_at: new Date(),
        updated_at: new Date()
      });

      const req = { query: {} };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await reportingController.getGapsAnalysis(req as any, res as any);

      const response = (res.json as jest.Mock).mock.calls[0][0];
      const dataScientistGap = response.capacityGaps.find((g: any) => g.role_name === 'Data Scientist');
      
      expect(dataScientistGap.total_capacity_fte).toBe(1); // 1 person
      expect(dataScientistGap.total_demand_fte).toBe(1.5); // 150% allocation
      expect(dataScientistGap.capacity_gap_fte).toBe(-0.5); // Negative means shortage
      expect(dataScientistGap.status).toBe('GAP'); // Should be marked as GAP
    });

    test('should aggregate demand across multiple assignments', async () => {
      // Create multiple assignments for Frontend Developer role
      await db('scenario_project_assignments').insert([
        {
          id: uuidv4(),
          scenario_id: testScenario.id,
          project_id: testProjects[0].id,
          person_id: testPeople[1].id,
          role_id: testRoles[1].id, // Frontend Developer
          allocation_percentage: 80,
          assignment_date_mode: 'fixed',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuidv4(),
          scenario_id: testScenario.id,
          project_id: testProjects[1].id,
          person_id: testPeople[0].id, // Different person but same role demand
          role_id: testRoles[1].id, // Frontend Developer
          allocation_percentage: 60,
          assignment_date_mode: 'fixed',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      const req = { query: {} };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await reportingController.getGapsAnalysis(req as any, res as any);

      const response = (res.json as jest.Mock).mock.calls[0][0];
      const frontendGap = response.capacityGaps.find((g: any) => g.role_name === 'Frontend Developer');
      
      expect(frontendGap.total_demand_fte).toBe(1.4); // 80% + 60% = 140%
      expect(frontendGap.capacity_gap_fte).toBe(-0.4); // 1 - 1.4 = -0.4
      expect(frontendGap.status).toBe('TIGHT'); // Between 0 and -0.5
    });

    test('should only include active scenario assignments', async () => {
      // Create inactive scenario
      const inactiveScenario = {
        id: uuidv4(),
        name: 'Inactive Scenario',
        status: 'archived',
          created_at: new Date(),
        updated_at: new Date()
      };
      await db('scenarios').insert(inactiveScenario);

      // Create assignment in inactive scenario
      await db('scenario_project_assignments').insert({
        id: uuidv4(),
        scenario_id: inactiveScenario.id,
        project_id: testProjects[0].id,
        person_id: testPeople[0].id,
        role_id: testRoles[0].id,
        allocation_percentage: 200,
        assignment_date_mode: 'fixed',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created_at: new Date(),
        updated_at: new Date()
      });

      const req = { query: {} };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await reportingController.getGapsAnalysis(req as any, res as any);

      const response = (res.json as jest.Mock).mock.calls[0][0];
      const dataScientistGap = response.capacityGaps.find((g: any) => g.role_name === 'Data Scientist');
      
      // Should not include demand from inactive scenario
      expect(dataScientistGap.total_demand_fte).toBe(0);
    });

    test('should calculate summary metrics correctly', async () => {
      // Create gaps in multiple roles
      await db('scenario_project_assignments').insert([
        {
          id: uuidv4(),
          scenario_id: testScenario.id,
          project_id: testProjects[0].id,
          person_id: testPeople[0].id,
          role_id: testRoles[0].id, // Data Scientist
          allocation_percentage: 200, // 2 FTE demand vs 1 capacity = -1 FTE gap
          assignment_date_mode: 'fixed',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuidv4(),
          scenario_id: testScenario.id,
          project_id: testProjects[1].id,
          person_id: testPeople[1].id,
          role_id: testRoles[1].id, // Frontend Developer
          allocation_percentage: 150, // 1.5 FTE demand vs 1 capacity = -0.5 FTE gap
          assignment_date_mode: 'fixed',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      const req = { query: {} };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await reportingController.getGapsAnalysis(req as any, res as any);

      const response = (res.json as jest.Mock).mock.calls[0][0];
      
      expect(response.summary).toBeDefined();
      // Total gap hours = (1 FTE + 0.5 FTE) * 8 hours * 5 days = 60 hours per week
      expect(response.summary.totalGapHours).toBe(60);
      expect(response.summary.rolesWithGaps).toBe(2); // Data Scientist and Frontend Developer
      
      // Critical gaps should include both roles with > 50% gap
      expect(response.criticalRoleGaps.length).toBe(2);
    });

    test('should handle roles with no people assigned', async () => {
      // Create a new role with no people
      const emptyRole = {
        id: uuidv4(),
        name: 'Machine Learning Engineer',
        created_at: new Date(),
        updated_at: new Date()
      };
      await db('roles').insert(emptyRole);

      // Create demand for this role
      await db('scenario_project_assignments').insert({
        id: uuidv4(),
        scenario_id: testScenario.id,
        project_id: testProjects[0].id,
        person_id: testPeople[0].id, // Person assigned to different role
        role_id: emptyRole.id,
        allocation_percentage: 100,
        assignment_date_mode: 'fixed',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created_at: new Date(),
        updated_at: new Date()
      });

      const req = { query: {} };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await reportingController.getGapsAnalysis(req as any, res as any);

      const response = (res.json as jest.Mock).mock.calls[0][0];
      const mlGap = response.capacityGaps.find((g: any) => g.role_name === 'Machine Learning Engineer');
      
      expect(mlGap.people_count).toBe(0);
      expect(mlGap.total_capacity_fte).toBe(0);
      expect(mlGap.total_demand_fte).toBe(1);
      expect(mlGap.capacity_gap_fte).toBe(-1);
      expect(mlGap.status).toBe('GAP'); // Should be marked as GAP when no capacity but demand exists
    });
  });

  describe('Date Range Filtering', () => {
    test('should only include assignments within current date', async () => {
      // Create past assignment
      await db('scenario_project_assignments').insert({
        id: uuidv4(),
        scenario_id: testScenario.id,
        project_id: testProjects[0].id,
        person_id: testPeople[0].id,
        role_id: testRoles[0].id,
        allocation_percentage: 100,
        assignment_date_mode: 'fixed',
        start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago
        end_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months ago
        created_at: new Date(),
        updated_at: new Date()
      });

      // Create future assignment
      await db('scenario_project_assignments').insert({
        id: uuidv4(),
        scenario_id: testScenario.id,
        project_id: testProjects[0].id,
        person_id: testPeople[0].id,
        role_id: testRoles[0].id,
        allocation_percentage: 100,
        assignment_date_mode: 'fixed',
        start_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
        end_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 years from now
        created_at: new Date(),
        updated_at: new Date()
      });

      const req = { query: {} };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await reportingController.getGapsAnalysis(req as any, res as any);

      const response = (res.json as jest.Mock).mock.calls[0][0];
      const dataScientistGap = response.capacityGaps.find((g: any) => g.role_name === 'Data Scientist');
      
      // Should not include past or future assignments
      expect(dataScientistGap.total_demand_fte).toBe(0);
    });
  });
});