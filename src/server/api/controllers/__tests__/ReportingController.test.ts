import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportingController } from '../../../src/server/api/controllers/ReportingController';
import type { Request, Response } from 'express';

describe('ReportingController', () => {
  let controller: ReportingController;
  let mockDb: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    // Create mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      join: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      first: vi.fn(),
      count: vi.fn().mockReturnThis(),
      sum: vi.fn().mockReturnThis(),
      avg: vi.fn().mockReturnThis(),
      raw: vi.fn()
    };

    // Mock response
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnThis();
    mockRes = {
      json: jsonMock,
      status: statusMock
    };

    // Mock request
    mockReq = {
      query: {}
    };

    // Create controller with mocked db
    controller = new ReportingController(mockDb);
  });

  describe('getCapacityReport', () => {
    it('should transform person utilization data correctly', async () => {
      // Mock capacity gaps view data
      const mockCapacityGaps = [
        {
          role_id: 'role1',
          role_name: 'Developer',
          people_count: 5,
          total_capacity_fte: 5,
          total_capacity_hours: 40,
          total_demand_fte: 3,
          total_demand_hours: 24
        }
      ];

      // Mock person utilization view data - this is what the view returns
      const mockPersonUtilization = [
        {
          person_id: 'person1',
          person_name: 'John Doe',
          person_email: 'john@example.com',
          worker_type: 'FTE',
          current_availability_percentage: 100, // Note: current_, not default_
          default_hours_per_day: 8,
          total_allocation_percentage: 50,
          utilization_status: 'Partially-allocated',
          primary_role_id: 'role1',
          primary_role_name: 'Developer'
        },
        {
          person_id: 'person2',
          person_name: 'Jane Smith',
          person_email: 'jane@example.com',
          worker_type: 'FTE',
          current_availability_percentage: 80, // Reduced availability
          default_hours_per_day: 8,
          total_allocation_percentage: 100,
          utilization_status: 'Fully-allocated',
          primary_role_id: 'role1',
          primary_role_name: 'Developer'
        }
      ];

      // Mock the database calls
      mockDb.mockImplementation((tableName: string) => {
        if (tableName === 'capacity_gaps_view') {
          return {
            select: vi.fn().mockResolvedValue(mockCapacityGaps)
          };
        }
        if (tableName === 'person_utilization_view') {
          return {
            select: vi.fn().mockResolvedValue(mockPersonUtilization)
          };
        }
        if (tableName === 'project_demands_view') {
          return {
            join: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockResolvedValue([])
          };
        }
        return mockDb;
      });

      // Mock calculateCapacityTimeline
      controller.calculateCapacityTimeline = vi.fn().mockResolvedValue([]);

      // Call the method
      await controller.getCapacityReport(mockReq as Request, mockRes as Response);

      // Verify the response
      expect(jsonMock).toHaveBeenCalled();
      const responseData = jsonMock.mock.calls[0][0];

      // Check that utilizationData has been transformed correctly
      expect(responseData.utilizationData).toBeDefined();
      expect(responseData.utilizationData.length).toBe(2);

      const firstPerson = responseData.utilizationData[0];
      
      // Verify the transformation added the expected fields
      expect(firstPerson.default_availability_percentage).toBe(100); // Mapped from current_
      expect(firstPerson.available_hours).toBe(8);
      expect(firstPerson.total_allocated_hours).toBe(4); // 50% of 8
      expect(firstPerson.allocation_status).toBe('PARTIALLY_ALLOCATED'); // Uppercase

      const secondPerson = responseData.utilizationData[1];
      expect(secondPerson.default_availability_percentage).toBe(80); // Reduced availability
      expect(secondPerson.available_hours).toBe(8);
      expect(secondPerson.total_allocated_hours).toBe(8); // 100% of 8
      expect(secondPerson.allocation_status).toBe('FULLY_ALLOCATED');

      // Verify byRole transformation
      expect(responseData.byRole).toBeDefined();
      expect(responseData.byRole[0]).toMatchObject({
        id: 'role1',
        role: 'Developer',
        capacity: 40,
        utilized: 24,
        available: 16,
        people_count: 5,
        status: 'OK'
      });
    });

    it('should handle empty utilization data', async () => {
      // Mock empty data
      mockDb.mockImplementation((tableName: string) => {
        if (tableName === 'capacity_gaps_view') {
          return { select: vi.fn().mockResolvedValue([]) };
        }
        if (tableName === 'person_utilization_view') {
          return { select: vi.fn().mockResolvedValue([]) };
        }
        if (tableName === 'project_demands_view') {
          return {
            join: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockResolvedValue([])
          };
        }
        return mockDb;
      });

      controller.calculateCapacityTimeline = vi.fn().mockResolvedValue([]);

      await controller.getCapacityReport(mockReq as Request, mockRes as Response);

      const responseData = jsonMock.mock.calls[0][0];
      
      expect(responseData.utilizationData).toEqual([]);
      expect(responseData.byRole).toEqual([]);
      expect(responseData.summary.overAllocated).toBe(0);
      expect(responseData.summary.underAllocated).toBe(0);
    });

    it('should handle various utilization statuses correctly', async () => {
      const mockPersonUtilization = [
        {
          person_id: 'p1',
          person_name: 'Available Person',
          current_availability_percentage: 100,
          default_hours_per_day: 8,
          total_allocation_percentage: 0,
          utilization_status: 'Available'
        },
        {
          person_id: 'p2', 
          person_name: 'Over Allocated',
          current_availability_percentage: 100,
          default_hours_per_day: 8,
          total_allocation_percentage: 120,
          utilization_status: 'Over-allocated'
        },
        {
          person_id: 'p3',
          person_name: 'Unavailable',
          current_availability_percentage: 0,
          default_hours_per_day: 8,
          total_allocation_percentage: 0,
          utilization_status: 'Unavailable'
        }
      ];

      mockDb.mockImplementation((tableName: string) => {
        if (tableName === 'capacity_gaps_view') {
          return { select: vi.fn().mockResolvedValue([]) };
        }
        if (tableName === 'person_utilization_view') {
          return { select: vi.fn().mockResolvedValue(mockPersonUtilization) };
        }
        if (tableName === 'project_demands_view') {
          return {
            join: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockResolvedValue([])
          };
        }
        return mockDb;
      });

      controller.calculateCapacityTimeline = vi.fn().mockResolvedValue([]);

      await controller.getCapacityReport(mockReq as Request, mockRes as Response);

      const responseData = jsonMock.mock.calls[0][0];
      const utilData = responseData.utilizationData;

      expect(utilData[0].allocation_status).toBe('AVAILABLE');
      expect(utilData[1].allocation_status).toBe('OVER_ALLOCATED');
      expect(utilData[2].allocation_status).toBe('UNAVAILABLE');
      
      // Check summary counts
      expect(responseData.summary.overAllocated).toBe(1);
      expect(responseData.summary.underAllocated).toBe(0); // Available and Unavailable don't count as under
    });
  });
});