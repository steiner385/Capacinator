import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the database module
jest.mock('../../../database/index.js', () => ({
  getAuditedDb: jest.fn()
}));

import { DemandCalculationService } from '../DemandCalculationService.js';

describe('DemandCalculationService', () => {
  let service: DemandCalculationService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new DemandCalculationService(mockDb);
  });

  describe('calculateWorkDays', () => {
    it('should calculate working days between two dates', () => {
      const result = service.calculateWorkDays('2024-01-01', '2024-01-05');
      expect(result).toBeGreaterThan(0);
    });

    it('should handle same date', () => {
      const result = service.calculateWorkDays('2024-01-01', '2024-01-01');
      expect(result).toBe(0);
    });

    it('should calculate work days for a week', () => {
      const result = service.calculateWorkDays('2024-01-01', '2024-01-08');
      expect(result).toBe(5);
    });
  });

  describe('calculateFte', () => {
    it('should calculate FTE from hours and date range', () => {
      const result = service.calculateFte(160, '2024-01-01', '2024-01-31');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should return higher FTE for more hours', () => {
      const lowHours = service.calculateFte(80, '2024-01-01', '2024-01-31');
      const highHours = service.calculateFte(160, '2024-01-01', '2024-01-31');
      expect(highHours).toBeGreaterThan(lowHours);
    });
  });

  describe('getProjectDemands', () => {
    it('should return null for non-existent project', async () => {
      setupProjectDemandsMocks(mockDb, null);

      const result = await service.getProjectDemands('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return project demands data', async () => {
      setupProjectDemandsMocks(mockDb, {
        id: '1',
        name: 'Test Project',
        project_type_name: 'Development'
      });

      const result = await service.getProjectDemands('1');

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('project');
      expect(result).toHaveProperty('phases');
      expect(result).toHaveProperty('demands');
      expect(result).toHaveProperty('summary');
    });
  });

  describe('getDemandSummary', () => {
    it('should return demand summary with filters', async () => {
      setupDemandSummaryMocks(mockDb);

      const result = await service.getDemandSummary({
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      });

      expect(result).toHaveProperty('filters');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('by_role');
      expect(result).toHaveProperty('by_project_type');
      expect(result).toHaveProperty('timeline');
    });

    it('should aggregate by role', async () => {
      setupDemandSummaryMocks(mockDb);

      const result = await service.getDemandSummary({});

      expect(result.by_role).toBeInstanceOf(Array);
    });
  });

  describe('getDemandForecast', () => {
    it('should generate monthly forecast', async () => {
      setupDemandForecastMocks(mockDb);

      const result = await service.getDemandForecast(6);

      expect(result).toHaveProperty('forecast');
      expect(result).toHaveProperty('summary');
      expect(result.summary.months).toBe(6);
      expect(result.forecast).toHaveLength(6);
    });

    it('should default to 6 months', async () => {
      setupDemandForecastMocks(mockDb);

      const result = await service.getDemandForecast();

      expect(result.summary.months).toBe(6);
    });
  });

  describe('getDemandGaps', () => {
    it('should return demand gaps analysis', async () => {
      setupDemandGapsMocks(mockDb);

      const result = await service.getDemandGaps();

      expect(result).toHaveProperty('gaps');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('total_gaps');
      expect(result.summary).toHaveProperty('total_shortage_fte');
      expect(result.summary).toHaveProperty('critical_gaps');
    });

    it('should only include roles with positive gaps', async () => {
      setupDemandGapsMocks(mockDb);

      const result = await service.getDemandGaps();

      result.gaps.forEach((gap: any) => {
        expect(gap.gap_fte).toBeGreaterThan(0);
      });
    });
  });

  describe('calculateScenario', () => {
    it('should calculate what-if scenario', async () => {
      setupScenarioMocks(mockDb);

      const result = await service.calculateScenario({
        new_projects: [],
        remove_projects: [],
        delay_projects: []
      });

      expect(result).toHaveProperty('scenario');
      expect(result).toHaveProperty('baseline');
      expect(result).toHaveProperty('projected');
      expect(result).toHaveProperty('impact');
      expect(result).toHaveProperty('recommendation');
    });

    it('should provide recommendation based on impact', async () => {
      setupScenarioMocks(mockDb);

      const result = await service.calculateScenario({});

      expect(typeof result.recommendation).toBe('string');
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
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    countDistinct: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(resolvedValue),
    then: jest.fn((callback: any) => Promise.resolve(resolvedValue).then(callback))
  };

  mock[Symbol.toStringTag] = 'Promise';

  return mock;
}

function createMockDb(): any {
  const mockDbFn: any = jest.fn(() => createChainableMock());
  mockDbFn.raw = jest.fn().mockResolvedValue([]);
  return mockDbFn;
}

function setupProjectDemandsMocks(mockDb: any, project: any) {
  // Project query
  const projectQuery = createChainableMock();
  projectQuery.first.mockResolvedValue(project);

  // Demands query
  const demandsQuery = createChainableMock([
    {
      phase_id: '1',
      phase_name: 'Development',
      phase_order: 1,
      role_id: '1',
      role_name: 'Developer',
      demand_hours: 160,
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      is_override: false
    }
  ]);

  mockDb
    .mockReturnValueOnce(projectQuery)
    .mockReturnValueOnce(demandsQuery);
}

function setupDemandSummaryMocks(mockDb: any) {
  const assignmentsQuery = createChainableMock([
    {
      id: '1',
      project_id: '1',
      role_id: '1',
      allocation_percentage: 50,
      start_date: '2024-01-01',
      end_date: '2024-06-30',
      project_name: 'Project 1',
      project_priority: 'HIGH',
      project_type_id: '1',
      project_type_name: 'Development',
      role_name: 'Developer'
    }
  ]);

  mockDb.mockReturnValue(assignmentsQuery);
}

function setupDemandForecastMocks(mockDb: any) {
  // Projects query
  const projectsQuery = createChainableMock([
    { id: '1', name: 'Project 1', aspiration_finish: '2025-12-31' }
  ]);

  // Demands query
  const demandsQuery = createChainableMock([
    {
      project_id: '1',
      project_name: 'Project 1',
      role_name: 'Developer',
      demand_hours: 160,
      start_date: '2024-01-01',
      end_date: '2024-12-31'
    }
  ]);

  mockDb
    .mockReturnValueOnce(projectsQuery)
    .mockReturnValue(demandsQuery);
}

function setupDemandGapsMocks(mockDb: any) {
  const gapsQuery = createChainableMock([
    {
      role_id: '1',
      role_name: 'Developer',
      total_demand_fte: 3,
      total_capacity_fte: 2
    },
    {
      role_id: '2',
      role_name: 'Designer',
      total_demand_fte: 1,
      total_capacity_fte: 2
    }
  ]);

  mockDb.mockReturnValue(gapsQuery);
}

function setupScenarioMocks(mockDb: any) {
  // Baseline demands
  const baselineQuery = createChainableMock([
    {
      project_id: '1',
      role_id: '1',
      demand_hours: 160,
      start_date: '2024-01-01',
      end_date: '2024-06-30'
    }
  ]);

  // Standard allocations
  const allocationsQuery = createChainableMock([]);

  mockDb
    .mockReturnValueOnce(baselineQuery)
    .mockReturnValue(allocationsQuery);
}
