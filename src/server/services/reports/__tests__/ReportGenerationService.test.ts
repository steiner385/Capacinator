import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Knex } from 'knex';

// Mock the database module
jest.mock('../../../database/index.js', () => ({
  getAuditedDb: jest.fn()
}));

import { ReportGenerationService } from '../ReportGenerationService.js';

describe('ReportGenerationService', () => {
  let service: ReportGenerationService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new ReportGenerationService(mockDb);
  });

  describe('getDashboardData', () => {
    it('should return dashboard summary data', async () => {
      setupDashboardMocks(mockDb);

      const result = await service.getDashboardData();

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('projectHealth');
      expect(result).toHaveProperty('capacityGaps');
      expect(result).toHaveProperty('utilization');
      expect(result).toHaveProperty('availability');

      expect(result.summary).toEqual({
        projects: 5,
        people: 10,
        roles: 3
      });
    });
  });

  describe('getCapacityReport', () => {
    it('should return capacity report data', async () => {
      setupCapacityReportMocks(mockDb);

      const result = await service.getCapacityReport();

      expect(result).toHaveProperty('capacityGaps');
      expect(result).toHaveProperty('byRole');
      expect(result).toHaveProperty('personUtilization');
      expect(result).toHaveProperty('utilizationData');
      expect(result).toHaveProperty('timeline');
      expect(result).toHaveProperty('summary');
    });
  });

  describe('getProjectReport', () => {
    it('should return project report with filters', async () => {
      setupProjectReportMocks(mockDb);

      const result = await service.getProjectReport({
        status: 'ACTIVE',
        priority: 'HIGH'
      });

      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('byStatus');
      expect(result.summary).toHaveProperty('byPriority');
    });
  });

  describe('getTimelineReport', () => {
    it('should return timeline data', async () => {
      setupTimelineReportMocks(mockDb);

      const result = await service.getTimelineReport('2024-01-01', '2024-12-31');

      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('phases');
    });
  });

  describe('getUtilizationReport', () => {
    it('should return utilization data with date filtering', async () => {
      setupUtilizationReportMocks(mockDb);

      const result = await service.getUtilizationReport('2024-01-01', '2024-06-30');

      expect(result).toHaveProperty('utilizationData');
      expect(result).toHaveProperty('overutilized');
      expect(result).toHaveProperty('underutilized');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('healthSummary');
    });
  });

  describe('getGapsAnalysis', () => {
    it('should return gaps analysis data', async () => {
      setupGapsAnalysisMocks(mockDb);

      const result = await service.getGapsAnalysis();

      expect(result).toHaveProperty('capacityGaps');
      expect(result).toHaveProperty('projectHealth');
      expect(result).toHaveProperty('criticalRoleGaps');
      expect(result).toHaveProperty('criticalProjectGaps');
      expect(result).toHaveProperty('summary');
    });
  });
});

// ============================================
// Helper Functions
// ============================================

function createChainableMock(resolvedValue: any = []) {
  const mock: any = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    countDistinct: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(resolvedValue),
    andWhere: jest.fn().mockReturnThis(),
    then: jest.fn((callback: any) => Promise.resolve(resolvedValue).then(callback))
  };

  // Make it thenable for async/await
  mock[Symbol.toStringTag] = 'Promise';

  return mock;
}

function createMockDb(): any {
  const mockDbFn: any = jest.fn(() => createChainableMock());
  mockDbFn.raw = jest.fn().mockResolvedValue([]);
  return mockDbFn;
}

function setupDashboardMocks(mockDb: any) {
  // First call: projects count query
  const projectCountQuery = createChainableMock();
  projectCountQuery.first.mockResolvedValue({ count: 5 });

  // Second call: people count query
  const peopleCountQuery = createChainableMock();
  peopleCountQuery.first.mockResolvedValue({ count: 10 });

  // Third call: roles count query
  const rolesCountQuery = createChainableMock();
  rolesCountQuery.first.mockResolvedValue({ count: 3 });

  // Fourth call: current projects
  const currentProjectsQuery = createChainableMock([
    { id: '1', name: 'Project 1', phase_start: '2024-01-01', phase_end: '2024-12-31', phase_name: 'Development' }
  ]);

  // Fifth call: capacity gaps view
  const capacityGapsQuery = createChainableMock([
    { role_id: '1', role_name: 'Developer', total_demand_fte: 2, total_capacity_fte: 1 },
    { role_id: '2', role_name: 'Designer', total_demand_fte: 1, total_capacity_fte: 0.9 },
    { role_id: '3', role_name: 'Manager', total_demand_fte: 0.5, total_capacity_fte: 1 }
  ]);

  // Sixth call: person utilization view
  const utilizationQuery = createChainableMock([
    { person_id: '1', utilization_status: 'Available' },
    { person_id: '2', utilization_status: 'Fully-allocated' }
  ]);

  mockDb
    .mockReturnValueOnce(projectCountQuery)
    .mockReturnValueOnce(peopleCountQuery)
    .mockReturnValueOnce(rolesCountQuery)
    .mockReturnValueOnce(currentProjectsQuery)
    .mockReturnValueOnce(capacityGapsQuery)
    .mockReturnValueOnce(utilizationQuery);
}

function setupCapacityReportMocks(mockDb: any) {
  // Capacity gaps view
  const capacityGapsQuery = createChainableMock([
    {
      role_id: '1',
      role_name: 'Developer',
      total_demand_fte: 2,
      total_capacity_fte: 3,
      total_capacity_hours: 480,
      total_demand_hours: 320,
      people_count: 3
    }
  ]);

  // Person utilization view
  const utilizationQuery = createChainableMock([
    {
      person_id: '1',
      person_name: 'John Doe',
      total_allocation_percentage: 80,
      default_hours_per_day: 8,
      utilization_status: 'Partially-allocated',
      current_availability_percentage: 100
    }
  ]);

  // Project demands
  const demandsQuery = createChainableMock([]);

  // People for timeline
  const peopleQuery = createChainableMock([
    { id: '1', default_hours_per_day: 8, default_availability_percentage: 100 }
  ]);

  mockDb
    .mockReturnValueOnce(capacityGapsQuery)
    .mockReturnValueOnce(utilizationQuery)
    .mockReturnValueOnce(demandsQuery)
    .mockReturnValueOnce(peopleQuery);
}

function setupProjectReportMocks(mockDb: any) {
  // Projects query
  const projectsQuery = createChainableMock([
    { project_id: '1', project_name: 'Project 1', health_status: 'ACTIVE', priority: 'HIGH' }
  ]);

  // Status summary
  const statusQuery = createChainableMock([
    { health_status: 'ACTIVE', count: 3 },
    { health_status: 'COMPLETED', count: 2 }
  ]);

  // Priority summary
  const priorityQuery = createChainableMock([
    { priority: 'HIGH', count: 2 },
    { priority: 'MEDIUM', count: 3 }
  ]);

  mockDb
    .mockReturnValueOnce(projectsQuery)
    .mockReturnValueOnce(statusQuery)
    .mockReturnValueOnce(priorityQuery);
}

function setupTimelineReportMocks(mockDb: any) {
  // Projects query
  const projectsQuery = createChainableMock([
    { id: '1', name: 'Project 1', aspiration_start: '2024-01-01', aspiration_finish: '2024-12-31' }
  ]);

  // Phases query
  const phasesQuery = createChainableMock([
    { project_id: '1', phase_name: 'Design', start_date: '2024-01-01', end_date: '2024-03-31' }
  ]);

  mockDb
    .mockReturnValueOnce(projectsQuery)
    .mockReturnValueOnce(phasesQuery);
}

function setupUtilizationReportMocks(mockDb: any) {
  // Raw SQL query result
  mockDb.raw = jest.fn().mockResolvedValue([
    {
      person_id: '1',
      person_name: 'John Doe',
      person_email: 'john@example.com',
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8,
      primary_role_id: '1',
      primary_role_name: 'Developer',
      location_name: 'Office',
      total_allocation_percentage: 80,
      project_count: 2,
      project_names: 'Project 1, Project 2'
    }
  ]);
}

function setupGapsAnalysisMocks(mockDb: any) {
  // Capacity gaps view
  const capacityGapsQuery = createChainableMock([
    {
      role_id: '1',
      role_name: 'Developer',
      total_demand_fte: 2,
      total_capacity_fte: 1.5
    }
  ]);

  // Project health view
  const projectHealthQuery = createChainableMock([
    { project_id: '1', allocation_health: 'HEALTHY', total_allocation_percentage: 80 }
  ]);

  // Project demands view
  const projectDemandsQuery = createChainableMock([
    { project_id: '1', project_name: 'Project 1', allocation_percentage: 50 }
  ]);

  mockDb
    .mockReturnValueOnce(capacityGapsQuery)
    .mockReturnValueOnce(projectHealthQuery)
    .mockReturnValueOnce(projectDemandsQuery);
}
