import { ReportingController } from '../ReportingController';
import { createMockDb, flushPromises } from './helpers/mockDb';

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  logPerformance: jest.fn(),
  logBusinessOperation: jest.fn()
};

describe('ReportingController', () => {
  let controller: ReportingController;
  let mockReq: any;
  let mockRes: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ReportingController();

    mockReq = {
      query: {},
      params: {},
      body: {},
      headers: {},
      requestId: 'test-request-id',
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        logPerformance: jest.fn(),
        logBusinessOperation: jest.fn()
      }
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    mockDb = createMockDb();
    // Add countDistinct method to mock (returns same chainable object)
    mockDb.countDistinct = jest.fn().mockReturnValue(mockDb);
    (controller as any).db = mockDb;
    mockDb._reset();
  });

  describe('getDashboard - Get Dashboard Data', () => {
    it('retrieves dashboard with all components', async () => {
      // Mock current date for consistent testing
      const currentDate = '2024-06-15';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(`${currentDate}T00:00:00.000Z`);

      // Mock project count query - note that count() returns array, then .first() gets single object
      mockDb._queueQueryResult([{ count: 5 }]);
      mockDb._queueFirstResult({ count: 5 });

      // Mock people count query
      mockDb._queueQueryResult([{ count: 20 }]);
      mockDb._queueFirstResult({ count: 20 });

      // Mock roles count query
      mockDb._queueQueryResult([{ count: 8 }]);
      mockDb._queueFirstResult({ count: 8 });

      // Mock current projects query
      mockDb._queueQueryResult([
        {
          id: 'project-1',
          name: 'Project A',
          phase_start: '2024-06-01',
          phase_end: '2024-06-30',
          phase_name: 'Development'
        },
        {
          id: 'project-2',
          name: 'Project B',
          phase_start: '2024-06-10',
          phase_end: '2024-06-20',
          phase_name: 'Testing'
        }
      ]);

      // Mock capacity gaps view
      mockDb._queueQueryResult([
        {
          role_id: 'role-1',
          role_name: 'Developer',
          total_demand_fte: 10,
          total_capacity_fte: 8
        },
        {
          role_id: 'role-2',
          role_name: 'Designer',
          total_demand_fte: 5,
          total_capacity_fte: 6
        }
      ]);

      // Mock person utilization view
      mockDb._queueQueryResult([
        {
          person_id: 'person-1',
          person_name: 'John Doe',
          utilization_status: 'Over-allocated',
          total_allocation_percentage: 120
        },
        {
          person_id: 'person-2',
          person_name: 'Jane Smith',
          utilization_status: 'Available',
          total_allocation_percentage: 0
        }
      ]);

      await controller.getDashboard(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            summary: expect.objectContaining({
              projects: 5,
              people: 20,
              roles: 8
            }),
            projectHealth: expect.any(Object),
            capacityGaps: expect.objectContaining({
              GAP: expect.any(Number),
              TIGHT: expect.any(Number),
              OK: expect.any(Number)
            }),
            utilization: expect.any(Object),
            availability: expect.objectContaining({
              AVAILABLE: expect.any(Number),
              ASSIGNED: expect.any(Number)
            })
          })
        })
      );
    });

    it('categorizes project health correctly', async () => {
      const currentDate = '2024-06-15';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(`${currentDate}T00:00:00.000Z`);

      mockDb._queueFirstResult({ count: 3 });
      mockDb._queueFirstResult({ count: 10 });
      mockDb._queueFirstResult({ count: 5 });

      // Mock projects with different health statuses
      mockDb._queueQueryResult([
        {
          id: 'project-1',
          name: 'On Track Project',
          phase_start: '2024-06-01',
          phase_end: '2024-06-30',
          phase_name: 'Development'
        },
        {
          id: 'project-2',
          name: 'Overdue Project',
          phase_start: '2024-05-01',
          phase_end: '2024-06-10', // Ended 5 days ago
          phase_name: 'Testing'
        }
      ]);

      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);

      await controller.getDashboard(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.projectHealth).toHaveProperty('ACTIVE');
      expect(response.data.projectHealth).toEqual(expect.any(Object));
    });

    it('calculates capacity gaps from capacity_gaps_view', async () => {
      const currentDate = '2024-06-15';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(`${currentDate}T00:00:00.000Z`);

      mockDb._queueFirstResult({ count: 1 });
      mockDb._queueFirstResult({ count: 5 });
      mockDb._queueFirstResult({ count: 3 });
      mockDb._queueQueryResult([]);

      // Mock capacity gaps with different statuses
      mockDb._queueQueryResult([
        {
          role_id: 'role-1',
          role_name: 'Developer',
          total_demand_fte: 10,
          total_capacity_fte: 7 // Gap of 3 FTE
        },
        {
          role_id: 'role-2',
          role_name: 'Designer',
          total_demand_fte: 5,
          total_capacity_fte: 4.8 // Tight (gap < 0.5)
        },
        {
          role_id: 'role-3',
          role_name: 'Manager',
          total_demand_fte: 2,
          total_capacity_fte: 3 // OK (negative gap)
        }
      ]);

      mockDb._queueQueryResult([]);

      await controller.getDashboard(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.capacityGaps).toEqual({
        GAP: 1,    // Developer
        TIGHT: 1,  // Designer
        OK: 1      // Manager
      });
    });

    it('handles empty database gracefully', async () => {
      const currentDate = '2024-06-15';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(`${currentDate}T00:00:00.000Z`);

      // Return zeros/empty arrays for all queries
      mockDb._queueFirstResult({ count: 0 });
      mockDb._queueFirstResult({ count: 0 });
      mockDb._queueFirstResult({ count: 0 });
      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);

      await controller.getDashboard(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            summary: {
              projects: 0,
              people: 0,
              roles: 0
            }
          })
        })
      );
    });
  });

  describe('getCapacityReport - Get Capacity Report', () => {
    it('retrieves capacity report with date range filtering', async () => {
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      // Mock capacity gaps view
      mockDb._queueQueryResult([
        {
          role_id: 'role-1',
          role_name: 'Developer',
          total_capacity_fte: 10,
          total_demand_fte: 12,
          total_capacity_hours: 1600,
          total_demand_hours: 1920,
          people_count: 5
        }
      ]);

      // Mock person utilization view (raw)
      mockDb._queueQueryResult([
        {
          person_id: 'person-1',
          person_name: 'John Doe',
          total_allocation_percentage: 85,
          default_hours_per_day: 8,
          current_availability_percentage: 100,
          utilization_status: 'Partially-allocated'
        }
      ]);

      // Mock project demands view with date filtering
      mockDb._queueQueryResult([
        {
          project_id: 'project-1',
          role_id: 'role-1',
          demand_hours: 320,
          start_date: '2024-03-01',
          end_date: '2024-03-31',
          project_name: 'Project A',
          role_name: 'Developer'
        }
      ]);

      // Mock calculateCapacityTimeline (mocked people query)
      mockDb._queueQueryResult([
        {
          id: 'person-1',
          name: 'John Doe',
          default_hours_per_day: 8,
          default_availability_percentage: 100
        }
      ]);

      await controller.getCapacityReport(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            capacityGaps: expect.any(Array),
            byRole: expect.any(Array),
            personUtilization: expect.any(Array),
            utilizationData: expect.any(Array),
            projectDemands: expect.any(Array),
            timeline: expect.any(Array),
            summary: expect.objectContaining({
              totalGaps: expect.any(Number),
              totalTight: expect.any(Number)
            })
          })
        })
      );
    });

    it('calculates capacity gaps with correct status', async () => {
      mockReq.query = {};

      mockDb._queueQueryResult([
        {
          role_id: 'role-1',
          role_name: 'Developer',
          total_capacity_fte: 10,
          total_demand_fte: 11, // Gap > 0.5
          total_capacity_hours: 1600,
          total_demand_hours: 1760,
          people_count: 5
        },
        {
          role_id: 'role-2',
          role_name: 'Designer',
          total_capacity_fte: 5,
          total_demand_fte: 5.3, // Tight (0 < gap <= 0.5)
          total_capacity_hours: 800,
          total_demand_hours: 848,
          people_count: 2
        },
        {
          role_id: 'role-3',
          role_name: 'Manager',
          total_capacity_fte: 3,
          total_demand_fte: 2, // OK (gap <= 0)
          total_capacity_hours: 480,
          total_demand_hours: 320,
          people_count: 1
        }
      ]);

      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);

      await controller.getCapacityReport(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      const capacityGaps = response.data.capacityGaps;

      expect(capacityGaps[0].status).toBe('GAP');
      expect(capacityGaps[1].status).toBe('TIGHT');
      expect(capacityGaps[2].status).toBe('OK');
    });

    it('transforms utilization data correctly', async () => {
      mockReq.query = {};

      mockDb._queueQueryResult([]);

      mockDb._queueQueryResult([
        {
          person_id: 'person-1',
          person_name: 'John Doe',
          total_allocation_percentage: 120,
          default_hours_per_day: 8,
          current_availability_percentage: 100,
          utilization_status: 'Over-allocated'
        }
      ]);

      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);

      await controller.getCapacityReport(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      const utilizationData = response.data.utilizationData;

      expect(utilizationData[0]).toMatchObject({
        person_id: 'person-1',
        person_name: 'John Doe',
        total_allocated_hours: 9.6, // 120% * 8 hours / 100
        available_hours: 8,
        allocation_status: 'OVER_ALLOCATED'
      });
    });

    it('includes project demands filtered by date range', async () => {
      mockReq.query = {
        startDate: '2024-06-01',
        endDate: '2024-06-30'
      };

      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);

      mockDb._queueQueryResult([
        {
          project_id: 'project-1',
          role_id: 'role-1',
          demand_hours: 160,
          start_date: '2024-06-01',
          end_date: '2024-06-15',
          project_name: 'Project A',
          role_name: 'Developer'
        },
        {
          project_id: 'project-1',
          role_id: 'role-2',
          demand_hours: 80,
          start_date: '2024-06-10',
          end_date: '2024-06-20',
          project_name: 'Project A',
          role_name: 'Designer'
        }
      ]);

      mockDb._queueQueryResult([]);

      await controller.getCapacityReport(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.projectDemands).toHaveLength(2);
      expect(response.data.projectDemands[0].project_name).toBe('Project A');
    });

    it('generates capacity timeline', async () => {
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-03-31'
      };

      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);

      // Mock people query for timeline calculation
      mockDb._queueQueryResult([
        {
          id: 'person-1',
          name: 'John Doe',
          default_hours_per_day: 8,
          default_availability_percentage: 100
        },
        {
          id: 'person-2',
          name: 'Jane Smith',
          default_hours_per_day: 8,
          default_availability_percentage: 80
        }
      ]);

      await controller.getCapacityReport(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.timeline).toEqual(expect.any(Array));
      expect(response.data.timeline.length).toBeGreaterThan(0);

      // Timeline should have period and capacity fields
      if (response.data.timeline.length > 0) {
        expect(response.data.timeline[0]).toMatchObject({
          period: expect.any(String),
          capacity: expect.any(Number)
        });
      }
    });
  });

  describe('getProjectReport - Get Project Report', () => {
    it('retrieves projects without filters', async () => {
      mockReq.query = {};

      // Mock project health view main query
      mockDb._setQueryResult([
        {
          project_id: 'project-1',
          project_name: 'Project A',
          health_status: 'ACTIVE',
          priority: 'high'
        },
        {
          project_id: 'project-2',
          project_name: 'Project B',
          health_status: 'PLANNING',
          priority: 'medium'
        }
      ]);

      await controller.getProjectReport(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            projects: expect.arrayContaining([
              expect.objectContaining({
                project_id: 'project-1',
                health_status: 'ACTIVE'
              })
            ]),
            summary: expect.objectContaining({
              byStatus: expect.any(Object),
              byPriority: expect.any(Object)
            })
          })
        })
      );
    });

    it('applies status and priority filtering', async () => {
      mockReq.query = {
        status: 'ACTIVE',
        priority: 'high'
      };

      mockDb._queueQueryResult([
        {
          project_id: 'project-1',
          project_name: 'High Priority Active Project',
          health_status: 'ACTIVE',
          priority: 'high'
        }
      ]);

      mockDb._queueQueryResult([{ health_status: 'ACTIVE', count: 1 }]);
      mockDb._queueQueryResult([{ priority: 'high', count: 1 }]);

      await controller.getProjectReport(mockReq, mockRes);
      await flushPromises();

      // Verify where clause was called with filters
      expect(mockDb.where).toHaveBeenCalledWith('health_status', 'ACTIVE');
      expect(mockDb.where).toHaveBeenCalledWith('priority', 'high');
    });

    it('applies projectType and location filtering', async () => {
      mockReq.query = {
        projectType: 'type-1',
        location: 'loc-1'
      };

      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);

      await controller.getProjectReport(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalledWith('project_type_id', 'type-1');
      expect(mockDb.where).toHaveBeenCalledWith('location_id', 'loc-1');
    });
  });

  describe('getTimelineReport - Get Timeline Report', () => {
    it('retrieves timeline with date range', async () => {
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      // Mock projects timeline query
      mockDb._queueQueryResult([
        {
          id: 'project-1',
          name: 'Project A',
          aspiration_start: '2024-03-01',
          aspiration_finish: '2024-09-30',
          priority: 'high',
          project_type: 'Development',
          owner_name: 'John Doe'
        }
      ]);

      // Mock phases timeline query
      mockDb._queueQueryResult([
        {
          id: 'phase-1',
          project_id: 'project-1',
          phase_id: 'phase-type-1',
          start_date: '2024-03-01',
          end_date: '2024-04-30',
          project_name: 'Project A',
          phase_name: 'Planning'
        },
        {
          id: 'phase-2',
          project_id: 'project-1',
          phase_id: 'phase-type-2',
          start_date: '2024-05-01',
          end_date: '2024-09-30',
          project_name: 'Project A',
          phase_name: 'Development'
        }
      ]);

      await controller.getTimelineReport(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            projects: expect.any(Array),
            phases: expect.any(Array)
          })
        })
      );

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.projects).toHaveLength(1);
      expect(response.data.phases).toHaveLength(2);
    });

    it('retrieves all timeline data without date filters', async () => {
      mockReq.query = {};

      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);

      await controller.getTimelineReport(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalled();
      expect(mockDb.whereNotNull).toHaveBeenCalledWith('projects.aspiration_start');
      expect(mockDb.whereNotNull).toHaveBeenCalledWith('projects.aspiration_finish');
    });
  });

  describe('getDemandReport - Get Demand Report', () => {
    it('retrieves demand data with baseline scenario filtering', async () => {
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };
      mockReq.headers['x-scenario-id'] = 'scenario-baseline';

      // Mock scenario lookup
      mockDb._queueFirstResult({
        id: 'scenario-baseline',
        scenario_type: 'baseline',
        status: 'active'
      });

      // Mock project_demands_view query
      mockDb._queueQueryResult([
        {
          project_id: 'project-1',
          project_name: 'Project A',
          role_id: 'role-1',
          role_name: 'Developer',
          demand_hours: 320,
          start_date: '2024-03-01',
          end_date: '2024-03-31',
          project_type_id: 'type-1',
          project_type_name: 'Development',
          scenario_id: null
        }
      ]);

      // Mock scenario lookup for aggregations
      mockDb._queueFirstResult({
        id: 'scenario-baseline',
        scenario_type: 'baseline'
      });

      // Mock project aggregation
      mockDb._queueQueryResult([
        {
          project_id: 'project-1',
          project_name: 'Project A',
          total_hours: 320
        }
      ]);

      // Mock scenario lookup for role aggregation
      mockDb._queueFirstResult({
        id: 'scenario-baseline',
        scenario_type: 'baseline'
      });

      // Mock role aggregation
      mockDb._queueQueryResult([
        {
          role_id: 'role-1',
          role_name: 'Developer',
          total_hours: 320
        }
      ]);

      // Mock scenario lookup for project type aggregation
      mockDb._queueFirstResult({
        id: 'scenario-baseline',
        scenario_type: 'baseline'
      });

      // Mock project type aggregation
      mockDb._queueQueryResult([
        {
          project_type_id: 'type-1',
          project_type_name: 'Development',
          total_hours: 320
        }
      ]);

      // Mock scenario lookup for count queries
      mockDb._queueFirstResult({
        id: 'scenario-baseline',
        scenario_type: 'baseline'
      });
      mockDb._queueFirstResult({
        id: 'scenario-baseline',
        scenario_type: 'baseline'
      });

      // Mock count queries
      mockDb._queueFirstResult({ count: 1 });
      mockDb._queueFirstResult({ count: 1 });

      await controller.getDemandReport(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            demandData: expect.any(Array),
            byProject: expect.any(Array),
            by_role: expect.any(Array),
            by_project_type: expect.any(Array),
            timeline: expect.any(Array),
            summary: expect.objectContaining({
              total_hours: expect.any(Number),
              total_projects: expect.any(Number),
              roles_with_demand: expect.any(Number)
            })
          })
        })
      );
    });

    it('aggregates demand by project, role, and project type', async () => {
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      mockDb._queueQueryResult([]);

      // Mock aggregations
      mockDb._queueQueryResult([
        { project_id: 'project-1', project_name: 'Project A', total_hours: 480 },
        { project_id: 'project-2', project_name: 'Project B', total_hours: 320 }
      ]);

      mockDb._queueQueryResult([
        { role_id: 'role-1', role_name: 'Developer', total_hours: 640 },
        { role_id: 'role-2', role_name: 'Designer', total_hours: 160 }
      ]);

      mockDb._queueQueryResult([
        { project_type_id: 'type-1', project_type_name: 'Development', total_hours: 800 }
      ]);

      mockDb._queueFirstResult({ count: 2 });
      mockDb._queueFirstResult({ count: 2 });

      await controller.getDemandReport(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];

      expect(response.data.byProject).toHaveLength(2);
      expect(response.data.byProject[0]).toMatchObject({
        id: 'project-1',
        name: 'Project A',
        demand: 480
      });

      expect(response.data.by_role).toHaveLength(2);
      expect(response.data.by_role[0]).toMatchObject({
        role_name: 'Developer',
        total_hours: 640
      });

      expect(response.data.by_project_type).toHaveLength(1);
      expect(response.data.by_project_type[0]).toMatchObject({
        project_type_name: 'Development',
        total_hours: 800
      });
    });

    it('generates monthly timeline correctly', async () => {
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-03-31'
      };

      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);

      // Mock monthly timeline queries (no scenario lookups since scenarioId is not set)
      mockDb._queueFirstResult({ total_hours: 320 });  // January
      mockDb._queueFirstResult({ total_hours: 400 });  // February
      mockDb._queueFirstResult({ total_hours: 280 });  // March

      // Mock count queries at the end
      mockDb._queueFirstResult({ count: 1 });
      mockDb._queueFirstResult({ count: 1 });

      await controller.getDemandReport(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.timeline).toHaveLength(3);
      expect(response.data.timeline[0]).toMatchObject({
        month: '2024-01',
        total_hours: 320
      });
    });

    it('handles scenario_id header and branch scenarios', async () => {
      mockReq.query = {};
      mockReq.headers['x-scenario-id'] = 'scenario-branch';

      // Mock branch scenario lookup
      mockDb._queueFirstResult({
        id: 'scenario-branch',
        scenario_type: 'branch',
        status: 'active'
      });

      mockDb._queueQueryResult([]);

      // Mock scenario lookups for aggregations
      mockDb._queueFirstResult({
        id: 'scenario-branch',
        scenario_type: 'branch'
      });
      mockDb._queueQueryResult([]);

      mockDb._queueFirstResult({
        id: 'scenario-branch',
        scenario_type: 'branch'
      });
      mockDb._queueQueryResult([]);

      mockDb._queueFirstResult({
        id: 'scenario-branch',
        scenario_type: 'branch'
      });
      mockDb._queueQueryResult([]);

      mockDb._queueFirstResult({
        id: 'scenario-branch',
        scenario_type: 'branch'
      });
      mockDb._queueFirstResult({
        id: 'scenario-branch',
        scenario_type: 'branch'
      });
      mockDb._queueFirstResult({ count: 0 });
      mockDb._queueFirstResult({ count: 0 });

      await controller.getDemandReport(mockReq, mockRes);
      await flushPromises();

      // Verify scenario filtering was applied
      expect(mockDb.where).toHaveBeenCalledWith('scenario_id', 'scenario-branch');
    });

    it('handles includeAllScenarios flag', async () => {
      mockReq.query = {
        includeAllScenarios: 'true'
      };

      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);
      mockDb._queueFirstResult({ count: 0 });
      mockDb._queueFirstResult({ count: 0 });

      await controller.getDemandReport(mockReq, mockRes);
      await flushPromises();

      // Verify no scenario filtering was applied
      expect(mockDb.where).not.toHaveBeenCalledWith('scenario_id', expect.anything());
    });
  });

  describe('getUtilizationReport - Get Utilization Report', () => {
    it('calculates utilization with date filtering', async () => {
      mockReq.query = {
        startDate: '2024-06-01',
        endDate: '2024-06-30'
      };

      // Mock raw query for date-filtered utilization
      mockDb.raw.mockResolvedValue([
        {
          person_id: 'person-1',
          person_name: 'John Doe',
          person_email: 'john@example.com',
          worker_type: 'employee',
          default_availability_percentage: 100,
          default_hours_per_day: 8,
          primary_role_id: 'role-1',
          primary_role_name: 'Developer',
          location_name: 'Office A',
          total_allocation_percentage: 85,
          project_count: 2,
          project_names: 'Project A,Project B'
        },
        {
          person_id: 'person-2',
          person_name: 'Jane Smith',
          person_email: 'jane@example.com',
          worker_type: 'contractor',
          default_availability_percentage: 80,
          default_hours_per_day: 8,
          primary_role_id: 'role-2',
          primary_role_name: 'Designer',
          location_name: 'Office B',
          total_allocation_percentage: 120,
          project_count: 3,
          project_names: 'Project A,Project C,Project D'
        }
      ]);

      await controller.getUtilizationReport(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            utilizationData: expect.any(Array),
            overutilized: expect.any(Array),
            underutilized: expect.any(Array),
            summary: expect.any(Object),
            healthSummary: expect.any(Object)
          })
        })
      );
    });

    it('categorizes allocation status correctly', async () => {
      mockReq.query = {};

      mockDb.raw.mockResolvedValue([
        {
          person_id: 'person-1',
          person_name: 'Over Allocated',
          default_hours_per_day: 8,
          total_allocation_percentage: 120
        },
        {
          person_id: 'person-2',
          person_name: 'Fully Allocated',
          default_hours_per_day: 8,
          total_allocation_percentage: 95
        },
        {
          person_id: 'person-3',
          person_name: 'Partially Allocated',
          default_hours_per_day: 8,
          total_allocation_percentage: 60
        },
        {
          person_id: 'person-4',
          person_name: 'Under Allocated',
          default_hours_per_day: 8,
          total_allocation_percentage: 30
        },
        {
          person_id: 'person-5',
          person_name: 'Available',
          default_hours_per_day: 8,
          total_allocation_percentage: 0
        }
      ]);

      await controller.getUtilizationReport(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      const utilizationData = response.data.utilizationData;

      expect(utilizationData[0].allocation_status).toBe('OVER_ALLOCATED');
      expect(utilizationData[1].allocation_status).toBe('FULLY_ALLOCATED');
      expect(utilizationData[2].allocation_status).toBe('PARTIALLY_ALLOCATED');
      expect(utilizationData[3].allocation_status).toBe('UNDER_ALLOCATED');
      expect(utilizationData[4].allocation_status).toBe('AVAILABLE');
    });

    it('identifies over-utilized and under-utilized people', async () => {
      mockReq.query = {};

      mockDb.raw.mockResolvedValue([
        {
          person_id: 'person-1',
          person_name: 'Over Allocated Person',
          default_hours_per_day: 8,
          total_allocation_percentage: 150
        },
        {
          person_id: 'person-2',
          person_name: 'Under Allocated Person',
          default_hours_per_day: 8,
          total_allocation_percentage: 40
        },
        {
          person_id: 'person-3',
          person_name: 'Available Person',
          default_hours_per_day: 8,
          total_allocation_percentage: 0
        }
      ]);

      await controller.getUtilizationReport(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];

      expect(response.data.overutilized).toHaveLength(1);
      expect(response.data.overutilized[0].person_name).toBe('Over Allocated Person');

      expect(response.data.underutilized).toHaveLength(2);
    });

    it('calculates health summary correctly', async () => {
      mockReq.query = {};

      mockDb.raw.mockResolvedValue([
        { person_id: '1', default_hours_per_day: 8, total_allocation_percentage: 75 },  // healthy
        { person_id: '2', default_hours_per_day: 8, total_allocation_percentage: 90 },  // healthy
        { person_id: '3', default_hours_per_day: 8, total_allocation_percentage: 110 }, // warning
        { person_id: '4', default_hours_per_day: 8, total_allocation_percentage: 130 }, // warning
        { person_id: '5', default_hours_per_day: 8, total_allocation_percentage: 40 },  // critical (under)
        { person_id: '6', default_hours_per_day: 8, total_allocation_percentage: 160 }  // critical (over)
      ]);

      await controller.getUtilizationReport(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.healthSummary).toEqual({
        healthy: 2,   // 50-100%
        warning: 2,   // 100-150%
        critical: 2   // <50% or >150%
      });
    });
  });

  describe('getGapsAnalysis - Get Gaps Analysis', () => {
    it('retrieves gaps from capacity_gaps_view', async () => {
      mockDb._queueQueryResult([
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
      ]);

      // Mock project health view
      mockDb._queueQueryResult([
        {
          project_id: 'project-1',
          project_name: 'Project A',
          total_allocation_percentage: 80,
          allocation_health: 'HEALTHY'
        }
      ]);

      // Mock project demands view
      mockDb._queueQueryResult([
        {
          project_id: 'project-1',
          project_name: 'Project A',
          role_id: 'role-1',
          allocation_percentage: 100,
          time_status: 'CURRENT'
        }
      ]);

      await controller.getGapsAnalysis(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            capacityGaps: expect.any(Array),
            projectHealth: expect.any(Array),
            criticalRoleGaps: expect.any(Array),
            criticalProjectGaps: expect.any(Array),
            summary: expect.objectContaining({
              totalGapHours: expect.any(Number),
              projectsWithGaps: expect.any(Number),
              rolesWithGaps: expect.any(Number),
              unutilizedHours: expect.any(Number)
            })
          })
        })
      );
    });

    it('calculates gap percentages and status correctly', async () => {
      mockDb._queueQueryResult([
        {
          role_id: 'role-1',
          role_name: 'Developer',
          total_demand_fte: 10,
          total_capacity_fte: 6  // 66.67% gap
        },
        {
          role_id: 'role-2',
          role_name: 'Designer',
          total_demand_fte: 5,
          total_capacity_fte: 4.8  // 4.17% gap (tight)
        },
        {
          role_id: 'role-3',
          role_name: 'Manager',
          total_demand_fte: 2,
          total_capacity_fte: 3  // -50% gap (OK)
        }
      ]);

      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);

      await controller.getGapsAnalysis(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      const capacityGaps = response.data.capacityGaps;

      // Should be sorted by gap_percentage descending
      expect(capacityGaps[0].role_name).toBe('Developer');
      expect(capacityGaps[0].status).toBe('GAP');
      expect(capacityGaps[0].gap_percentage).toBeGreaterThan(50);

      expect(capacityGaps[1].status).toBe('TIGHT');
      expect(capacityGaps[2].status).toBe('OK');
    });

    it('identifies critical role gaps', async () => {
      mockDb._queueQueryResult([
        {
          role_id: 'role-1',
          role_name: 'Critical Role',
          total_demand_fte: 10,
          total_capacity_fte: 4  // 150% gap - critical
        },
        {
          role_id: 'role-2',
          role_name: 'Minor Gap Role',
          total_demand_fte: 5,
          total_capacity_fte: 4.6  // 8.7% gap - not critical
        }
      ]);

      mockDb._queueQueryResult([]);
      mockDb._queueQueryResult([]);

      await controller.getGapsAnalysis(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];

      expect(response.data.criticalRoleGaps).toHaveLength(1);
      expect(response.data.criticalRoleGaps[0].role_name).toBe('Critical Role');
      expect(response.data.summary.rolesWithGaps).toBe(1);
    });

    it('calculates projects with unmet demands', async () => {
      mockDb._queueQueryResult([]);

      mockDb._queueQueryResult([
        {
          project_id: 'project-1',
          project_name: 'Fully Staffed Project',
          total_allocation_percentage: 100,
          allocation_health: 'HEALTHY'
        },
        {
          project_id: 'project-2',
          project_name: 'Under Staffed Project',
          total_allocation_percentage: 50,
          allocation_health: 'UNDERSTAFFED'
        }
      ]);

      // Mock project demands with unmet demands
      mockDb._queueQueryResult([
        {
          project_id: 'project-2',
          project_name: 'Under Staffed Project',
          role_id: 'role-1',
          allocation_percentage: 100,
          time_status: 'CURRENT'
        },
        {
          project_id: 'project-2',
          project_name: 'Under Staffed Project',
          role_id: 'role-2',
          allocation_percentage: 50,
          time_status: 'CURRENT'
        },
        {
          project_id: 'project-3',
          project_name: 'Unassigned Project',
          role_id: 'role-1',
          allocation_percentage: 100,
          time_status: 'FUTURE'
        }
      ]);

      await controller.getGapsAnalysis(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];

      // Should identify projects with coverage < 80% or unassigned
      expect(response.data.criticalProjectGaps.length).toBeGreaterThan(0);
      expect(response.data.summary.projectsWithGaps).toBeGreaterThan(0);
    });
  });
});
