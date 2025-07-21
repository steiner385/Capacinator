import { Request, Response } from 'express';
import { PeopleController } from '../../../../src/server/api/controllers/PeopleController';

// Mock the database function that returns query builder
const mockDb = jest.fn();

// Create chainable mock query
const createMockQuery = () => {
  const query = {
    raw: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis()
  };
  return query;
};

// Mock database function to return chainable queries
mockDb.mockImplementation((table: string) => createMockQuery());

describe('PeopleController.getPersonUtilizationTimeline', () => {
  let controller: PeopleController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  beforeEach(() => {
    controller = new PeopleController();
    
    // Mock the database property
    (controller as any).db = mockDb;
    
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    
    mockReq = {
      params: { id: 'test-person-id' },
      query: { 
        startDate: '2023-01-01', 
        endDate: '2023-12-31' 
      }
    };
    
    mockRes = {
      json: jsonSpy as any,
      status: statusSpy as any
    };

    jest.clearAllMocks();
  });

  describe('Successful Timeline Generation', () => {
    test('should generate utilization timeline for person with assignments', async () => {
      const mockPerson = {
        name: 'John Doe',
        default_availability_percentage: 100,
        default_hours_per_day: 8
      };

      const mockAssignments = [
        {
          allocation_percentage: 50,
          start_date: '2023-01-15',
          end_date: '2023-01-31',
          project_name: 'Project A'
        },
        {
          allocation_percentage: 30,
          start_date: '2023-02-01',
          end_date: '2023-02-28',
          project_name: 'Project B'
        },
        {
          allocation_percentage: 70,
          start_date: '2023-03-01',
          end_date: '2023-03-15',
          project_name: 'Project C'
        }
      ];

      // Mock database responses
      const mockPersonQuery = createMockQuery();
      mockPersonQuery.first.mockResolvedValue(mockPerson);
      
      const mockAssignmentsQuery = createMockQuery();
      mockAssignmentsQuery.orderBy.mockResolvedValue(mockAssignments);
      
      // Mock the database calls to return appropriate queries
      mockDb.mockImplementation((table: string) => {
        if (table === 'people') {
          return mockPersonQuery;
        }
        return mockAssignmentsQuery;
      });

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          personName: 'John Doe',
          defaultAvailability: 100,
          timeline: expect.arrayContaining([
            expect.objectContaining({
              month: '2023-01',
              availability: 100,
              utilization: 50,
              over_allocated: false
            }),
            expect.objectContaining({
              month: '2023-02',
              availability: 100,
              utilization: 30,
              over_allocated: false
            }),
            expect.objectContaining({
              month: '2023-03',
              availability: 100,
              utilization: 70,
              over_allocated: false
            })
          ])
        })
      );
    });

    test('should handle person with overlapping assignments in same month', async () => {
      const mockPerson = {
        name: 'Jane Smith',
        default_availability_percentage: 100,
        default_hours_per_day: 8
      };

      const mockAssignments = [
        {
          allocation_percentage: 60,
          start_date: '2023-01-01',
          end_date: '2023-01-31',
          project_name: 'Project A'
        },
        {
          allocation_percentage: 50,
          start_date: '2023-01-15',
          end_date: '2023-02-15',
          project_name: 'Project B'
        }
      ];

      const mockPersonQuery = createMockQuery();
      mockPersonQuery.first.mockResolvedValue(mockPerson);

      const mockAssignmentsQuery = createMockQuery();
      mockAssignmentsQuery.orderBy.mockResolvedValue(mockAssignments);

      mockDb.mockImplementation((table: string) => {
        if (table === 'people') {
          return mockPersonQuery;
        }
        return mockAssignmentsQuery;
      });

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          timeline: expect.arrayContaining([
            expect.objectContaining({
              month: '2023-01',
              utilization: 110, // 60 + 50 = overlapping assignments
              over_allocated: true
            }),
            expect.objectContaining({
              month: '2023-02',
              utilization: 50,
              over_allocated: false
            })
          ])
        })
      );
    });

    test('should filter timeline data to relevant months only', async () => {
      const mockPerson = {
        name: 'Filter Test',
        default_availability_percentage: 80,
        default_hours_per_day: 8
      };

      const mockAssignments = [
        {
          allocation_percentage: 40,
          start_date: '2023-06-01',
          end_date: '2023-06-30',
          project_name: 'Summer Project'
        }
      ];

      const mockPersonQuery = createMockQuery();
      mockPersonQuery.first.mockResolvedValue(mockPerson);

      const mockAssignmentsQuery = createMockQuery();
      mockAssignmentsQuery.orderBy.mockResolvedValue(mockAssignments);

      mockDb.mockImplementation((table: string) => {
        if (table === 'people') {
          return mockPersonQuery;
        }
        return mockAssignmentsQuery;
      });

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      const result = jsonSpy.mock.calls[0][0];
      
      // Should only include relevant months (around the assignment period)
      expect(result.timeline).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            month: '2023-06',
            utilization: 40
          })
        ])
      );

      // Should not include months with zero utilization far from assignments
      const hasIrrelevantMonths = result.timeline.some((month: any) => 
        month.month === '2023-01' || month.month === '2023-12'
      );
      expect(hasIrrelevantMonths).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    test('should return error when person not found', async () => {
      const mockPersonQuery = createMockQuery();
      mockPersonQuery.first.mockResolvedValue(null);
      
      mockDb.mockImplementation(() => mockPersonQuery);

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      // Should call status with error code
      expect(statusSpy).toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      const mockPersonQuery = createMockQuery();
      mockPersonQuery.first.mockRejectedValue(new Error('Database error'));
      
      mockDb.mockImplementation(() => mockPersonQuery);

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      // Should handle error appropriately
      expect(statusSpy).toHaveBeenCalled();
    });

    test('should handle missing person ID parameter', async () => {
      mockReq.params = {}; // Missing ID

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalled();
    });
  });

  describe('Date Range Handling', () => {
    test('should apply date filters to assignments query', async () => {
      const mockPerson = {
        name: 'Date Test',
        default_availability_percentage: 100,
        default_hours_per_day: 8
      };

      const mockPersonQuery = createMockQuery();
      mockPersonQuery.first.mockResolvedValue(mockPerson);

      const mockAssignmentsQuery = createMockQuery();
      mockAssignmentsQuery.orderBy.mockResolvedValue([]);

      mockDb.mockImplementation((table: string) => {
        if (table === 'people') {
          return mockPersonQuery;
        }
        return mockAssignmentsQuery;
      });

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      // Verify date filtering was applied
      expect(mockAssignmentsQuery.where).toHaveBeenCalledWith('project_assignments.end_date', '>=', '2023-01-01');
      expect(mockAssignmentsQuery.where).toHaveBeenCalledWith('project_assignments.start_date', '<=', '2023-12-31');
    });

    test('should work without date parameters', async () => {
      const mockPerson = {
        name: 'No Date Test',
        default_availability_percentage: 100,
        default_hours_per_day: 8
      };

      // Remove date parameters
      mockReq.query = {};

      const mockPersonQuery = createMockQuery();
      mockPersonQuery.first.mockResolvedValue(mockPerson);

      const mockAssignmentsQuery = createMockQuery();
      mockAssignmentsQuery.orderBy.mockResolvedValue([]);

      mockDb.mockImplementation((table: string) => {
        if (table === 'people') {
          return mockPersonQuery;
        }
        return mockAssignmentsQuery;
      });

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          personName: 'No Date Test',
          defaultAvailability: 100,
          timeline: expect.any(Array)
        })
      );
    });
  });

  describe('Timeline Data Structure', () => {
    test('should return correct data structure', async () => {
      const mockPerson = {
        name: 'Structure Test',
        default_availability_percentage: 90,
        default_hours_per_day: 8
      };

      const mockPersonQuery = createMockQuery();
      mockPersonQuery.first.mockResolvedValue(mockPerson);

      const mockAssignmentsQuery = createMockQuery();
      mockAssignmentsQuery.orderBy.mockResolvedValue([]);

      mockDb.mockImplementation((table: string) => {
        if (table === 'people') {
          return mockPersonQuery;
        }
        return mockAssignmentsQuery;
      });

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      expect(jsonSpy).toHaveBeenCalledWith({
        personName: 'Structure Test',
        defaultAvailability: 90,
        timeline: expect.any(Array)
      });
    });

    test('should mark over-allocated months correctly', async () => {
      const mockPerson = {
        name: 'Over Allocated Test',
        default_availability_percentage: 100,
        default_hours_per_day: 8
      };

      const mockAssignments = [
        {
          allocation_percentage: 120, // Over 100%
          start_date: '2023-01-01',
          end_date: '2023-01-31',
          project_name: 'Overload Project'
        }
      ];

      const mockPersonQuery = createMockQuery();
      mockPersonQuery.first.mockResolvedValue(mockPerson);

      const mockAssignmentsQuery = createMockQuery();
      mockAssignmentsQuery.orderBy.mockResolvedValue(mockAssignments);

      mockDb.mockImplementation((table: string) => {
        if (table === 'people') {
          return mockPersonQuery;
        }
        return mockAssignmentsQuery;
      });

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          timeline: expect.arrayContaining([
            expect.objectContaining({
              month: '2023-01',
              utilization: 120,
              over_allocated: true
            })
          ])
        })
      );
    });

    test('should handle person with different availability percentage', async () => {
      const mockPerson = {
        name: 'Part Time',
        default_availability_percentage: 50, // Part-time
        default_hours_per_day: 4
      };

      const mockAssignments = [
        {
          allocation_percentage: 75, // Over their 50% availability
          start_date: '2023-01-01',
          end_date: '2023-01-31',
          project_name: 'Part Time Project'
        }
      ];

      const mockPersonQuery = createMockQuery();
      mockPersonQuery.first.mockResolvedValue(mockPerson);

      const mockAssignmentsQuery = createMockQuery();
      mockAssignmentsQuery.orderBy.mockResolvedValue(mockAssignments);

      mockDb.mockImplementation((table: string) => {
        if (table === 'people') {
          return mockPersonQuery;
        }
        return mockAssignmentsQuery;
      });

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          personName: 'Part Time',
          defaultAvailability: 50,
          timeline: expect.arrayContaining([
            expect.objectContaining({
              month: '2023-01',
              availability: 50,
              utilization: 75,
              over_allocated: true // 75% > 50% availability
            })
          ])
        })
      );
    });
  });
});