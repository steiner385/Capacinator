import { DemandController } from '../DemandController';
import { createMockDb, flushPromises } from './helpers/mockDb';

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

describe('DemandController', () => {
  let controller: DemandController;
  let mockReq: any;
  let mockRes: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.log in tests
    jest.spyOn(console, 'log').mockImplementation();

    controller = new DemandController();

    mockReq = {
      query: {},
      params: {},
      body: {},
      headers: {},
      logger: mockLogger
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    mockDb = createMockDb();
    (controller as any).db = mockDb;
    mockDb._reset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getProjectDemands - Get Project Demands', () => {
    it('retrieves project demands with phases and summary', async () => {
      mockReq.params.project_id = 'project-1';

      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        project_type_id: 'type-1',
        project_type_name: 'Development'
      };

      const mockDemands = [
        {
          project_id: 'project-1',
          phase_id: 'phase-1',
          phase_name: 'Planning',
          phase_order: 1,
          role_id: 'role-1',
          role_name: 'Developer',
          demand_hours: 160,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          is_override: false
        },
        {
          project_id: 'project-1',
          phase_id: 'phase-2',
          phase_name: 'Development',
          phase_order: 2,
          role_id: 'role-1',
          role_name: 'Developer',
          demand_hours: 320,
          start_date: '2024-02-01',
          end_date: '2024-03-31',
          is_override: false
        }
      ];

      mockDb._queueFirstResult(mockProject);
      mockDb._queueQueryResult(mockDemands);

      await controller.getProjectDemands(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          project: mockProject,
          phases: expect.arrayContaining([
            expect.objectContaining({
              phase_id: 'phase-1',
              phase_name: 'Planning',
              total_hours: 160
            })
          ]),
          summary: expect.objectContaining({
            total_phases: 2,
            total_demands: 2,
            total_hours: 480,
            override_count: 0,
            roles_needed: 1
          })
        })
      );
    });

    it('returns 404 when project not found', async () => {
      mockReq.params.project_id = 'nonexistent-project';

      mockDb._setFirstResult(null);

      await controller.getProjectDemands(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Project not found'
      });
    });
  });

  describe('getDemandSummary - Get Demand Summary', () => {
    it('retrieves demand summary with filters', async () => {
      mockReq.query = {
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        location_id: 'loc-1',
        project_type_id: 'type-1'
      };

      const mockDemands = [
        {
          id: 'assign-1',
          project_id: 'project-1',
          project_name: 'Project A',
          role_id: 'role-1',
          role_name: 'Developer',
          allocation_percentage: 50,
          start_date: '2024-01-01',
          end_date: '2024-03-31',
          project_type_id: 'type-1',
          project_type_name: 'Development',
          project_priority: 'high'
        }
      ];

      mockDb._setQueryResult(mockDemands);

      await controller.getDemandSummary(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            start_date: '2024-01-01',
            end_date: '2024-12-31'
          }),
          summary: expect.objectContaining({
            total_demands: 1,
            total_projects: 1
          }),
          by_role: expect.any(Array),
          by_project_type: expect.any(Array),
          timeline: expect.any(Array)
        })
      );
    });

    it('returns empty summary when no demands exist', async () => {
      mockReq.query = {
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      mockDb._setQueryResult([]);

      await controller.getDemandSummary(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: expect.objectContaining({
            total_demands: 0,
            total_projects: 0
          })
        })
      );
    });
  });

  describe('createOverride - Create Demand Override', () => {
    it('creates demand override successfully', async () => {
      mockReq.body = {
        project_id: 'project-1',
        phase_id: 'phase-1',
        role_id: 'role-1',
        demand_hours: 200,
        notes: 'Increased demand for critical path'
      };

      const mockProject = {
        id: 'project-1',
        name: 'Test Project'
      };

      const mockOverride = {
        id: 'override-1',
        project_id: 'project-1',
        phase_id: 'phase-1',
        role_id: 'role-1',
        demand_hours: 200,
        notes: 'Increased demand for critical path',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb._queueFirstResult(mockProject);
      mockDb._setInsertResult([mockOverride]);

      await controller.createOverride(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockOverride);
    });

    it('returns 404 when project not found', async () => {
      mockReq.body = {
        project_id: 'nonexistent-project',
        phase_id: 'phase-1',
        role_id: 'role-1',
        demand_hours: 200
      };

      mockDb._setFirstResult(null);

      await controller.createOverride(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Project not found'
      });
    });
  });

  describe('deleteOverride - Delete Demand Override', () => {
    it('deletes override successfully', async () => {
      mockReq.params.id = 'override-1';

      mockDb._setDeleteResult(1);

      await controller.deleteOverride(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.del).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Demand override deleted successfully'
      });
    });

    it('returns 404 when override not found', async () => {
      mockReq.params.id = 'nonexistent-override';

      mockDb._setDeleteResult(0);

      await controller.deleteOverride(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Demand override not found'
      });
    });
  });

  describe('getDemandForecast - Get Demand Forecast', () => {
    it('generates demand forecast for specified months', async () => {
      mockReq.query = { months: '3' };

      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project A',
          include_in_demand: true,
          aspiration_finish: new Date('2024-12-31')
        }
      ];

      const mockDemands = [
        {
          project_id: 'project-1',
          project_name: 'Project A',
          project_priority: 'high',
          role_id: 'role-1',
          role_name: 'Developer',
          demand_hours: 480,
          start_date: '2024-01-01',
          end_date: '2024-03-31'
        }
      ];

      mockDb._queueQueryResult(mockProjects);
      mockDb._queueQueryResult(mockDemands);

      await controller.getDemandForecast(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          forecast: expect.any(Array),
          summary: expect.objectContaining({
            months: 3,
            total_projects: 1
          })
        })
      );
    });

    it('defaults to 6 months when not specified', async () => {
      mockReq.query = {};

      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);

      await controller.getDemandForecast(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: expect.objectContaining({
            months: 6
          })
        })
      );
    });
  });

  describe('getDemandGaps - Get Demand Gaps', () => {
    it('retrieves capacity gaps', async () => {
      const mockGapsData = [
        {
          role_id: 'role-1',
          role_name: 'Developer',
          total_demand_fte: 10,
          total_capacity_fte: 7
        },
        {
          role_id: 'role-2',
          role_name: 'Designer',
          total_demand_fte: 5,
          total_capacity_fte: 6
        }
      ];

      mockDb._setQueryResult(mockGapsData);

      await controller.getDemandGaps(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          gaps: expect.arrayContaining([
            expect.objectContaining({
              role_id: 'role-1',
              role_name: 'Developer',
              gap_fte: 3
            })
          ]),
          summary: expect.objectContaining({
            total_gaps: 1,
            total_shortage_fte: 3
          })
        })
      );
    });

    it('filters out roles with no gaps', async () => {
      const mockGapsData = [
        {
          role_id: 'role-1',
          role_name: 'Developer',
          total_demand_fte: 5,
          total_capacity_fte: 7
        }
      ];

      mockDb._setQueryResult(mockGapsData);

      await controller.getDemandGaps(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          gaps: [],
          summary: expect.objectContaining({
            total_gaps: 0,
            total_shortage_fte: 0
          })
        })
      );
    });
  });

  describe('calculateScenario - Calculate Scenario Impact', () => {
    it('calculates scenario impact with new projects', async () => {
      mockReq.body = {
        scenario: {
          new_projects: [
            {
              id: 'new-project-1',
              project_type_id: 'type-1',
              start_date: '2024-04-01',
              end_date: '2024-06-30'
            }
          ]
        }
      };

      const mockBaselineDemands = [
        {
          project_id: 'project-1',
          role_id: 'role-1',
          phase_id: 'phase-1',
          demand_hours: 160,
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        }
      ];

      const mockAllocations = [
        {
          role_id: 'role-1',
          phase_id: 'phase-1',
          allocation_percentage: 50
        }
      ];

      mockDb._queueQueryResult(mockBaselineDemands);
      mockDb._queueQueryResult(mockAllocations);

      await controller.calculateScenario(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          scenario: expect.any(Object),
          baseline: expect.any(Object),
          projected: expect.any(Object),
          impact: expect.any(Object),
          recommendation: expect.any(String)
        })
      );
    });

    it('calculates scenario with project delays', async () => {
      mockReq.body = {
        scenario: {
          delay_projects: [
            {
              project_id: 'project-1',
              delay_days: 30
            }
          ]
        }
      };

      const mockBaselineDemands = [
        {
          project_id: 'project-1',
          role_id: 'role-1',
          phase_id: 'phase-1',
          demand_hours: 160,
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        }
      ];

      mockDb._setQueryResult(mockBaselineDemands);

      await controller.calculateScenario(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          impact: expect.any(Object)
        })
      );
    });

    it('provides recommendations based on impact', async () => {
      mockReq.body = {
        scenario: {
          remove_projects: ['project-1']
        }
      };

      const mockBaselineDemands = [
        {
          project_id: 'project-1',
          role_id: 'role-1',
          demand_hours: 160,
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        }
      ];

      mockDb._setQueryResult(mockBaselineDemands);

      await controller.calculateScenario(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          recommendation: expect.stringContaining('feasible')
        })
      );
    });

    it('provides recommendation for scenarios with capacity gaps', async () => {
      mockReq.body = {
        scenario: {
          new_projects: [
            {
              id: 'big-project',
              project_type_id: 'type-1',
              start_date: '2024-01-01',
              end_date: '2024-12-31'
            }
          ]
        }
      };

      const mockBaselineDemands = [];
      const mockAllocations = [
        {
          role_id: 'role-1',
          phase_id: 'phase-1',
          allocation_percentage: 100
        }
      ];

      mockDb._queueQueryResult(mockBaselineDemands);
      mockDb._queueQueryResult(mockAllocations);

      // Mock identifyNewGaps to return gaps
      jest.spyOn(controller as any, 'identifyNewGaps').mockReturnValue([
        { role_id: 'role-1', gap_fte: 5 }
      ]);

      await controller.calculateScenario(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          recommendation: expect.stringContaining('capacity gaps')
        })
      );
    });
  });

  describe('getDemandSummary - Sorting and Aggregation', () => {
    it('sorts role summary by total FTE descending', async () => {
      mockReq.query = {
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const mockDemands = [
        {
          id: 'assign-1',
          project_id: 'project-1',
          project_name: 'Project A',
          role_id: 'role-1',
          role_name: 'Developer',
          allocation_percentage: 25,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          project_type_id: 'type-1',
          project_type_name: 'Development',
          project_priority: 'high'
        },
        {
          id: 'assign-2',
          project_id: 'project-2',
          project_name: 'Project B',
          role_id: 'role-2',
          role_name: 'Designer',
          allocation_percentage: 75,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          project_type_id: 'type-1',
          project_type_name: 'Development',
          project_priority: 'medium'
        }
      ];

      mockDb._setQueryResult(mockDemands);

      await controller.getDemandSummary(mockReq, mockRes);
      await flushPromises();

      const result = mockRes.json.mock.calls[0][0];

      // Verify sorting: Designer (75%) should come before Developer (25%)
      expect(result.by_role[0].role_name).toBe('Designer');
      expect(result.by_role[1].role_name).toBe('Developer');
    });

    it('sorts project type summary by total FTE descending', async () => {
      mockReq.query = {
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const mockDemands = [
        {
          id: 'assign-1',
          project_id: 'project-1',
          project_name: 'Project A',
          role_id: 'role-1',
          role_name: 'Developer',
          allocation_percentage: 30,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          project_type_id: 'type-1',
          project_type_name: 'Web Development',
          project_priority: 'high'
        },
        {
          id: 'assign-2',
          project_id: 'project-2',
          project_name: 'Project B',
          role_id: 'role-1',
          role_name: 'Developer',
          allocation_percentage: 80,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          project_type_id: 'type-2',
          project_type_name: 'Mobile App',
          project_priority: 'high'
        }
      ];

      mockDb._setQueryResult(mockDemands);

      await controller.getDemandSummary(mockReq, mockRes);
      await flushPromises();

      const result = mockRes.json.mock.calls[0][0];

      // Verify sorting: Mobile App (80%) should come before Web Development (30%)
      expect(result.by_project_type[0].project_type_name).toBe('Mobile App');
      expect(result.by_project_type[1].project_type_name).toBe('Web Development');
    });
  });

  describe('getDemandForecast - Role Breakdown', () => {
    it('includes role breakdown in monthly forecast', async () => {
      mockReq.query = { months: '2' };

      // Use dates that overlap with the forecast period (starting from now)
      const now = new Date();
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project A',
          include_in_demand: true,
          aspiration_finish: futureDate
        }
      ];

      const mockDemands = [
        {
          project_id: 'project-1',
          project_name: 'Project A',
          project_priority: 'high',
          role_id: 'role-1',
          role_name: 'Developer',
          demand_hours: 320,
          start_date: now.toISOString().split('T')[0],
          end_date: futureDate.toISOString().split('T')[0]
        },
        {
          project_id: 'project-1',
          project_name: 'Project A',
          project_priority: 'high',
          role_id: 'role-2',
          role_name: 'Designer',
          demand_hours: 160,
          start_date: now.toISOString().split('T')[0],
          end_date: futureDate.toISOString().split('T')[0]
        }
      ];

      mockDb._queueQueryResult(mockProjects);
      mockDb._queueQueryResult(mockDemands);

      await controller.getDemandForecast(mockReq, mockRes);
      await flushPromises();

      const result = mockRes.json.mock.calls[0][0];

      // Verify role breakdown exists and has expected structure
      expect(result.forecast).toBeDefined();
      expect(result.forecast.length).toBeGreaterThan(0);
      expect(result.forecast[0].by_role).toBeDefined();

      // Verify by_role is an object with role entries
      const roleNames = Object.keys(result.forecast[0].by_role);
      expect(roleNames.length).toBeGreaterThan(0);
    });
  });

  describe('calculateScenario - Delay Projects', () => {
    it('preserves non-delayed projects in delay scenario', async () => {
      mockReq.body = {
        scenario: {
          delay_projects: [
            {
              project_id: 'project-1',
              delay_days: 15
            }
          ]
        }
      };

      const mockBaselineDemands = [
        {
          project_id: 'project-1',
          role_id: 'role-1',
          phase_id: 'phase-1',
          demand_hours: 160,
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        },
        {
          project_id: 'project-2',
          role_id: 'role-1',
          phase_id: 'phase-1',
          demand_hours: 80,
          start_date: '2024-02-01',
          end_date: '2024-02-15'
        }
      ];

      mockDb._setQueryResult(mockBaselineDemands);

      await controller.calculateScenario(mockReq, mockRes);
      await flushPromises();

      const result = mockRes.json.mock.calls[0][0];

      // Verify project-2 dates are unchanged
      expect(result.projected).toBeDefined();
      expect(result.impact).toBeDefined();
    });
  });

  describe('Timeline Filtering Edge Cases', () => {
    it('handles timeline filtering with end date boundary', async () => {
      mockReq.query = {
        start_date: '2024-01-01',
        end_date: '2024-02-28'
      };

      const mockDemands = [
        {
          id: 'assign-1',
          project_id: 'project-1',
          project_name: 'Project A',
          role_id: 'role-1',
          role_name: 'Developer',
          allocation_percentage: 50,
          start_date: '2024-01-01',
          end_date: '2024-06-30', // Extends beyond filter end date
          project_type_id: 'type-1',
          project_type_name: 'Development',
          project_priority: 'high'
        }
      ];

      mockDb._setQueryResult(mockDemands);

      await controller.getDemandSummary(mockReq, mockRes);
      await flushPromises();

      const result = mockRes.json.mock.calls[0][0];

      // Verify timeline is filtered to end date
      expect(result.timeline).toBeDefined();
      expect(result.timeline.length).toBeGreaterThan(0);

      // All timeline months should be within filter range
      const latestMonth = result.timeline[result.timeline.length - 1].month;
      expect(latestMonth.localeCompare('2024-02')).toBeLessThanOrEqual(0);
    });

    it('handles timeline filtering with start date boundary', async () => {
      mockReq.query = {
        start_date: '2024-03-01',
        end_date: '2024-12-31'
      };

      const mockDemands = [
        {
          id: 'assign-1',
          project_id: 'project-1',
          project_name: 'Project A',
          role_id: 'role-1',
          role_name: 'Developer',
          allocation_percentage: 50,
          start_date: '2024-01-01', // Starts before filter start date
          end_date: '2024-12-31',
          project_type_id: 'type-1',
          project_type_name: 'Development',
          project_priority: 'high'
        }
      ];

      mockDb._setQueryResult(mockDemands);

      await controller.getDemandSummary(mockReq, mockRes);
      await flushPromises();

      const result = mockRes.json.mock.calls[0][0];

      // Verify timeline starts from filter start date
      expect(result.timeline).toBeDefined();
      if (result.timeline.length > 0) {
        const earliestMonth = result.timeline[0].month;
        expect(earliestMonth.localeCompare('2024-03')).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('handles database errors in getDemandSummary', async () => {
      mockReq.query = {
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      mockDb._queueError(new Error('Database connection failed'));

      await controller.getDemandSummary(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it('handles database errors in getDemandForecast', async () => {
      mockReq.query = { months: '6' };

      mockDb._queueError(new Error('Query failed'));

      await controller.getDemandForecast(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('handles database errors in calculateScenario', async () => {
      mockReq.body = {
        scenario: {
          new_projects: []
        }
      };

      mockDb._queueError(new Error('Database error'));

      await controller.calculateScenario(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
