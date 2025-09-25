import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { PeopleController } from '../../../../src/server/api/controllers/PeopleController';

// Mock the database module
jest.mock('../../../../src/server/database/index.js', () => ({
  db: jest.fn()
}));

const { db } = require('../../../../src/server/database/index.js');

describe('PeopleController.getPersonUtilizationTimeline', () => {
  let controller: PeopleController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockQuery: any;

  // Helper to create chainable mock
  const createChainableMock = (finalValue?: any) => {
    const mock: any = {
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(finalValue),
      then: finalValue !== undefined ? jest.fn((cb: any) => Promise.resolve(cb(finalValue))) : jest.fn()
    };
    return mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create controller instance
    controller = new PeopleController();
    
    // Mock the database on the controller
    const { db } = require('../../../../src/server/database/index.js');
    (controller as any).db = db;
    
    // Setup request and response mocks
    mockReq = {
      params: { id: 'test-person-id' },
      query: { 
        startDate: '2023-01-01', 
        endDate: '2023-12-31' 
      }
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    test('should calculate utilization timeline correctly', async () => {
      const mockPerson = {
        id: 'test-person-id',
        name: 'John Doe',
        default_availability_percentage: 100,
        default_hours_per_day: 8
      };

      const mockAssignments = [
        {
          id: 'assign-1',
          project_id: 'proj-1',
          project_name: 'Project A',
          allocation_percentage: 50,
          start_date: '2023-01-01',
          end_date: '2023-03-31'
        },
        {
          id: 'assign-2',
          project_id: 'proj-2',
          project_name: 'Project B',
          allocation_percentage: 30,
          start_date: '2023-02-01',
          end_date: '2023-04-30'
        }
      ];

      // Mock database calls
      const personQuery = createChainableMock(mockPerson);
      const assignmentsQuery = {
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockAssignments)
      };

      ((controller as any).db as jest.Mock)
        .mockReturnValueOnce(personQuery) // First call for people table
        .mockReturnValueOnce(assignmentsQuery); // Second call for project_assignments

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          personName: 'John Doe',
          defaultAvailability: 100,
          timeline: expect.arrayContaining([
            expect.objectContaining({
              month: '2023-01',
              utilization: 50,
              availability: 100,
              over_allocated: false
            }),
            expect.objectContaining({
              month: '2023-02',
              utilization: 80, // 50 + 30
              availability: 100,
              over_allocated: false
            }),
            expect.objectContaining({
              month: '2023-03',
              utilization: 80,
              availability: 100,
              over_allocated: false
            }),
            expect.objectContaining({
              month: '2023-04',
              utilization: 30,
              availability: 100,
              over_allocated: false
            })
          ])
        })
      );
    });

    test('should return 404 if person not found', async () => {
      const mockQuery = createChainableMock(null);
      ((controller as any).db as jest.Mock).mockReturnValue(mockQuery);

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Person not found' });
    });

    test('should handle missing date parameters with defaults', async () => {
      mockReq.query = {}; // No dates provided
      
      const mockPerson = {
        id: 'test-person-id',
        name: 'Jane Doe',
        default_availability_percentage: 100
      };

      const personQuery = createChainableMock(mockPerson);
      const assignmentsQuery = createChainableMock([]);
      assignmentsQuery.orderBy.mockResolvedValue([]);

      (controller as any).db = jest.fn()
        .mockReturnValueOnce(personQuery)
        .mockReturnValueOnce(assignmentsQuery);

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      // Should use default date range (e.g., current year)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          personName: 'Jane Doe',
          defaultAvailability: 100,
          timeline: expect.any(Array)
        })
      );
    });
  });

  describe('Edge cases', () => {
    test('should handle person with no assignments', async () => {
      const mockPerson = {
        id: 'test-person-id',
        name: 'Unassigned Person',
        default_availability_percentage: 100
      };

      const personQuery = createChainableMock(mockPerson);
      const assignmentsQuery = createChainableMock([]);
      assignmentsQuery.orderBy.mockResolvedValue([]);

      (controller as any).db = jest.fn()
        .mockReturnValueOnce(personQuery)
        .mockReturnValueOnce(assignmentsQuery);

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          personName: 'Unassigned Person',
          defaultAvailability: 100,
          timeline: [] // Empty timeline when no assignments
        })
      );
    });

    test('should handle overlapping assignments correctly', async () => {
      const mockPerson = {
        id: 'test-person-id',
        name: 'Busy Person',
        default_availability_percentage: 100
      };

      const mockAssignments = [
        {
          allocation_percentage: 60,
          start_date: '2023-01-01',
          end_date: '2023-02-28',
          project_name: 'Project A'
        },
        {
          allocation_percentage: 50,
          start_date: '2023-01-15',
          end_date: '2023-03-31',
          project_name: 'Project B'
        }
      ];

      const personQuery = createChainableMock(mockPerson);
      const assignmentsQuery = createChainableMock(mockAssignments);
      assignmentsQuery.orderBy.mockResolvedValue(mockAssignments);

      (controller as any).db = jest.fn()
        .mockReturnValueOnce(personQuery)
        .mockReturnValueOnce(assignmentsQuery);

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timeline: expect.arrayContaining([
            expect.objectContaining({
              month: '2023-01',
              utilization: 110, // 60 + 50 for overlapping period
              over_allocated: true
            }),
            expect.objectContaining({
              month: '2023-02',
              utilization: 110,
              over_allocated: true
            }),
            expect.objectContaining({
              month: '2023-03',
              utilization: 50,
              over_allocated: false
            })
          ])
        })
      );
    });

    test('should handle database errors', async () => {
      const mockPerson = {
        id: 'test-person-id',
        name: 'Test Person',
        default_availability_percentage: 100
      };
      
      const personQuery = createChainableMock(mockPerson);
      const failingQuery = {
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      
      ((controller as any).db as jest.Mock)
        .mockReturnValueOnce(personQuery)
        .mockReturnValueOnce(failingQuery);

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Failed to fetch person utilization timeline' 
      });
    });
  });

  describe('Complex scenarios', () => {
    test('should handle fractional allocations and part-time availability', async () => {
      const mockPerson = {
        id: 'part-time-person',
        name: 'Part Timer',
        default_availability_percentage: 50, // Part-time worker
        default_hours_per_day: 4
      };

      const mockAssignments = [
        {
          allocation_percentage: 75, // 75% of their 50% availability
          start_date: '2023-01-01',
          end_date: '2023-01-31',
          project_name: 'Part Time Project',
          project_id: 'proj-1'
        }
      ];

      const personQuery = createChainableMock(mockPerson);
      const assignmentsQuery = createChainableMock(mockAssignments);
      assignmentsQuery.orderBy.mockResolvedValue(mockAssignments);

      (controller as any).db = jest.fn()
        .mockReturnValueOnce(personQuery)
        .mockReturnValueOnce(assignmentsQuery);

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          personName: 'Part Timer',
          defaultAvailability: 50,
          timeline: expect.arrayContaining([
            expect.objectContaining({
              month: '2023-01',
              availability: 50,
              utilization: 75,
              over_allocated: true // 75% > 50% available
            })
          ])
        })
      );
    });

    test('should aggregate multiple assignments in same month', async () => {
      const mockPerson = {
        id: 'test-person-id',
        name: 'Multi Project Person',
        default_availability_percentage: 100
      };

      const mockAssignments = [
        {
          allocation_percentage: 25,
          start_date: '2023-01-01',
          end_date: '2023-01-31',
          project_name: 'Project A',
          project_id: 'proj-a'
        },
        {
          allocation_percentage: 25,
          start_date: '2023-01-01',
          end_date: '2023-01-31',
          project_name: 'Project B',
          project_id: 'proj-b'
        },
        {
          allocation_percentage: 25,
          start_date: '2023-01-01',
          end_date: '2023-01-31',
          project_name: 'Project C',
          project_id: 'proj-c'
        },
        {
          allocation_percentage: 30, // This puts them over 100%
          start_date: '2023-01-01',
          end_date: '2023-01-31',
          project_name: 'Project D',
          project_id: 'proj-d'
        }
      ];

      const personQuery = createChainableMock(mockPerson);
      const assignmentsQuery = createChainableMock(mockAssignments);
      assignmentsQuery.orderBy.mockResolvedValue(mockAssignments);

      (controller as any).db = jest.fn()
        .mockReturnValueOnce(personQuery)
        .mockReturnValueOnce(assignmentsQuery);

      await controller.getPersonUtilizationTimeline(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timeline: expect.arrayContaining([
            expect.objectContaining({
              month: '2023-01',
              utilization: 105, // 25 + 25 + 25 + 30
              over_allocated: true,
              over_allocated: true
            })
          ])
        })
      );
    });
  });
});