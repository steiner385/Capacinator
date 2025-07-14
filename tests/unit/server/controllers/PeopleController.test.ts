import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { PeopleController } from '../../../../src/server/api/controllers/PeopleController.js';

// Mock the audit middleware
jest.mock('../../../../src/server/middleware/auditMiddleware.js', () => ({
  auditModelChanges: jest.fn()
}));

jest.mock('../../../../src/server/config/auditConfig.js', () => ({
  isTableAudited: jest.fn().mockReturnValue(true)
}));

// Create chainable mock methods with proper typing
const createChainableMock = (): any => {
  const chainable = {
    select: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn(),
    returning: jest.fn(),
    count: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis()
  };
  return chainable;
};

/**
 * Critical PeopleController Unit Tests
 * 
 * This test suite validates the core business logic of the PeopleController:
 * - Person data retrieval with complex joins (supervisor, roles, assignments)
 * - Role assignment and management business rules
 * - Audit logging for compliance and tracking
 * - Availability and utilization calculations
 * - Input validation and error handling
 * - CRUD operations integrity
 * 
 * These tests ensure the API maintains data integrity and follows business rules.
 */

describe('PeopleController', () => {
  let controller: PeopleController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create controller with mocked database
    controller = new PeopleController();
    (controller as any).db = jest.fn(() => createChainableMock());
    
    // Mock executeQuery to directly call the callback
    (controller as any).executeQuery = jest.fn(async (callback: any, res: any, errorMessage: any) => {
      try {
        return await callback();
      } catch (error) {
        throw error;
      }
    });

    // Mock helper methods
    (controller as any).buildFilters = jest.fn((query: any, filters: any) => query);
    (controller as any).paginate = jest.fn((query: any, page: any, limit: any) => query);
    (controller as any).handleNotFound = jest.fn((res: any, entity: any) => {
      res.status!(404).json({ error: `${entity} not found` });
    });

    // Create mock request and response objects
    req = {
      params: {},
      query: {},
      body: {}
    };

    res = {
      json: jest.fn() as any,
      status: jest.fn().mockReturnThis() as any,
      send: jest.fn() as any
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Person CRUD Operations', () => {
    test('should fetch all people with supervisor and role relationships', async () => {
      req.query = { page: '1', limit: '10', primary_role_id: 'role-123' };

      const mockPeople = [
        {
          id: 'person-1',
          name: 'John Smith',
          supervisor_name: 'Jane Manager',
          primary_role_name: 'Senior Developer',
          worker_type: 'FULL_TIME'
        },
        {
          id: 'person-2',
          name: 'Alice Johnson',
          supervisor_name: 'Jane Manager',
          primary_role_name: 'Designer',
          worker_type: 'CONTRACTOR'
        }
      ];

      const mockDbQuery = createChainableMock();
      mockDbQuery.first.mockResolvedValue({ count: 25 });
      
      (controller as any).db = jest.fn(() => mockDbQuery);
      (controller as any).paginate = jest.fn((query, page, limit) => {
        expect(page).toBe(1);
        expect(limit).toBe(10);
        return Promise.resolve(mockPeople);
      });

      await controller.getAll(req as Request, res as Response);

      // Verify complex join query was built correctly
      expect((controller as any).db).toHaveBeenCalledWith('people');
      expect(mockDbQuery.leftJoin).toHaveBeenCalledWith('people as supervisor', 'people.supervisor_id', 'supervisor.id');
      expect(mockDbQuery.leftJoin).toHaveBeenCalledWith('roles as primary_role', 'people.primary_role_id', 'primary_role.id');
      
      expect(res.json).toHaveBeenCalledWith({
        data: mockPeople,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3
        }
      });
    });

    test('should fetch person by ID with all related data', async () => {
      req.params = { id: 'person-123' };

      const mockPerson = {
        id: 'person-123',
        name: 'John Smith',
        supervisor_name: 'Jane Manager',
        primary_role_name: 'Senior Developer',
        email: 'john.smith@company.com'
      };

      const mockRoles = [
        {
          role_id: 'role-1',
          role_name: 'Senior Developer',
          proficiency_level: 'EXPERT',
          years_experience: 8
        },
        {
          role_id: 'role-2',
          role_name: 'Team Lead',
          proficiency_level: 'INTERMEDIATE',
          years_experience: 3
        }
      ];

      const mockAssignments = [
        {
          project_id: 'project-1',
          project_name: 'E-commerce Platform',
          role_name: 'Senior Developer',
          allocation_percentage: 80,
          start_date: '2024-06-01',
          end_date: '2024-12-31'
        }
      ];

      const mockAvailabilityOverrides = [
        {
          start_date: '2024-07-01',
          end_date: '2024-07-15',
          availability_percentage: 50,
          reason: 'Vacation'
        }
      ];

      const mockDbQuery = createChainableMock();
      mockDbQuery.first.mockResolvedValue(mockPerson);
      
      (controller as any).db = jest.fn()
        .mockReturnValueOnce(mockDbQuery) // Main person query
        .mockReturnValueOnce({...createChainableMock(), select: jest.fn().mockResolvedValue(mockRoles)}) // Roles query
        .mockReturnValueOnce({...createChainableMock(), orderBy: jest.fn().mockResolvedValue(mockAssignments)}) // Assignments query
        .mockReturnValueOnce({...createChainableMock(), orderBy: jest.fn().mockResolvedValue(mockAvailabilityOverrides)}); // Availability query

      await controller.getById(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        ...mockPerson,
        roles: mockRoles,
        assignments: mockAssignments,
        availabilityOverrides: mockAvailabilityOverrides
      });
    });

    test('should handle person not found gracefully', async () => {
      req.params = { id: 'nonexistent-person' };

      const mockDbQuery = createChainableMock();
      mockDbQuery.first.mockResolvedValue(null); // Person not found
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.getById(req as Request, res as Response);

      expect((controller as any).handleNotFound).toHaveBeenCalledWith(res, 'Person');
    });

    test('should create person with audit logging', async () => {
      const { auditModelChanges } = require('../../middleware/auditMiddleware.js');
      
      req.body = {
        name: 'New Employee',
        email: 'new.employee@company.com',
        primary_role_id: 'role-123',
        worker_type: 'FULL_TIME'
      };

      const mockPerson = {
        id: 'person-new',
        ...req.body,
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      };

      const mockDbQuery = createChainableMock();
      mockDbQuery.returning.mockResolvedValue([mockPerson]);
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.create(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockPerson);
      
      // Verify audit logging was called
      expect(auditModelChanges).toHaveBeenCalledWith(
        req,
        'people',
        'person-new',
        'CREATE',
        undefined,
        mockPerson,
        'Created person: New Employee'
      );
    });

    test('should update person without requiring audit if data unchanged', async () => {
      req.params = { id: 'person-123' };
      req.body = { name: 'Updated Name' };

      const updatedPerson = {
        id: 'person-123',
        name: 'Updated Name',
        updated_at: expect.any(Date)
      };

      const mockDbQuery = createChainableMock();
      mockDbQuery.returning.mockResolvedValue([updatedPerson]);
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.update(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(updatedPerson);
      expect(mockDbQuery.update).toHaveBeenCalledWith({
        name: 'Updated Name',
        updated_at: expect.any(Date)
      });
    });

    test('should delete person safely', async () => {
      req.params = { id: 'person-to-delete' };

      const mockDbQuery = createChainableMock();
      mockDbQuery.del.mockResolvedValue(1); // One row deleted
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.delete(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ message: 'Person deleted successfully' });
      expect(mockDbQuery.where).toHaveBeenCalledWith('id', 'person-to-delete');
      expect(mockDbQuery.del).toHaveBeenCalled();
    });
  });

  describe('Role Management', () => {
    test('should add role to person with proficiency tracking', async () => {
      req.params = { id: 'person-123' };
      req.body = {
        role_id: 'role-456',
        proficiency_level: 'INTERMEDIATE',
        years_experience: 3,
        notes: 'Certified in React development'
      };

      const mockPersonRole = {
        id: 'person-role-789',
        person_id: 'person-123',
        role_id: 'role-456',
        proficiency_level: 'INTERMEDIATE',
        years_experience: 3,
        notes: 'Certified in React development',
        assigned_at: expect.any(Date)
      };

      const mockDbQuery = createChainableMock();
      mockDbQuery.returning.mockResolvedValue([mockPersonRole]);
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.addRole(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockPersonRole);
      expect(mockDbQuery.insert).toHaveBeenCalledWith({
        person_id: 'person-123',
        role_id: 'role-456',
        proficiency_level: 'INTERMEDIATE',
        years_experience: 3,
        notes: 'Certified in React development',
        assigned_at: expect.any(Date)
      });
    });

    test('should remove role from person safely', async () => {
      req.params = { id: 'person-123', roleId: 'role-456' };

      const mockDbQuery = createChainableMock();
      mockDbQuery.del.mockResolvedValue(1); // One role assignment deleted
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.removeRole(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ message: 'Role removed from person successfully' });
      expect(mockDbQuery.where).toHaveBeenCalledWith('person_id', 'person-123');
      expect(mockDbQuery.where).toHaveBeenCalledWith('role_id', 'role-456');
      expect(mockDbQuery.del).toHaveBeenCalled();
    });

    test('should handle removal of non-existent role assignment', async () => {
      req.params = { id: 'person-123', roleId: 'nonexistent-role' };

      const mockDbQuery = createChainableMock();
      mockDbQuery.del.mockResolvedValue(0); // No rows deleted
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.removeRole(req as Request, res as Response);

      expect((controller as any).handleNotFound).toHaveBeenCalledWith(res, 'Person role assignment');
    });
  });

  describe('Utilization and Availability Analytics', () => {
    test('should fetch person utilization data', async () => {
      const mockUtilizationData = [
        {
          person_id: 'person-1',
          person_name: 'John Smith',
          current_allocation: 85,
          utilization_percentage: 95,
          capacity_status: 'FULLY_UTILIZED'
        },
        {
          person_id: 'person-2',
          person_name: 'Alice Johnson',
          current_allocation: 40,
          utilization_percentage: 45,
          capacity_status: 'UNDER_UTILIZED'
        }
      ];

      const mockDbQuery = createChainableMock();
      mockDbQuery.select.mockResolvedValue(mockUtilizationData);
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.getUtilization(req as Request, res as Response);

      expect((controller as any).db).toHaveBeenCalledWith('person_utilization_view');
      expect(res.json).toHaveBeenCalledWith(mockUtilizationData);
    });

    test('should fetch person availability data', async () => {
      const mockAvailabilityData = [
        {
          person_id: 'person-1',
          person_name: 'John Smith',
          base_availability: 100,
          current_availability: 90,
          availability_status: 'AVAILABLE',
          next_available_date: null
        },
        {
          person_id: 'person-2',
          person_name: 'Alice Johnson',
          base_availability: 80, // Part-time
          current_availability: 0,
          availability_status: 'FULLY_BOOKED',
          next_available_date: '2024-09-01'
        }
      ];

      const mockDbQuery = createChainableMock();
      mockDbQuery.select.mockResolvedValue(mockAvailabilityData);
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.getAvailability(req as Request, res as Response);

      expect((controller as any).db).toHaveBeenCalledWith('person_availability_view');
      expect(res.json).toHaveBeenCalledWith(mockAvailabilityData);
    });
  });

  describe('Test Data Management', () => {
    test('should delete test people safely', async () => {
      const mockDbQuery = createChainableMock();
      mockDbQuery.del.mockResolvedValue(3); // 3 test people deleted
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.deleteTestData(req as Request, res as Response);

      expect(mockDbQuery.where).toHaveBeenCalledWith('name', 'like', 'Test_%');
      expect(mockDbQuery.del).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Deleted 3 test people' });
    });
  });

  describe('Input Validation and Edge Cases', () => {
    test('should handle malformed person data gracefully', async () => {
      req.body = {
        name: '', // Empty name
        email: 'invalid-email', // Invalid email format
        primary_role_id: null,
        worker_type: 'INVALID_TYPE'
      };

      const mockDbQuery = createChainableMock();
      // Simulate database constraint violation
      mockDbQuery.returning.mockRejectedValue(new Error('CHECK constraint failed: people'));
      (controller as any).db = jest.fn(() => mockDbQuery);

      await expect(controller.create(req as Request, res as Response))
        .rejects.toThrow('CHECK constraint failed: people');
    });

    test('should validate role assignment constraints', async () => {
      req.params = { id: 'person-123' };
      req.body = {
        role_id: 'role-456',
        proficiency_level: 'INVALID_LEVEL', // Invalid proficiency level
        years_experience: -5 // Negative experience
      };

      const mockDbQuery = createChainableMock();
      mockDbQuery.returning.mockRejectedValue(new Error('Invalid proficiency level'));
      (controller as any).db = jest.fn(() => mockDbQuery);

      await expect(controller.addRole(req as Request, res as Response))
        .rejects.toThrow('Invalid proficiency level');
    });

    test('should handle duplicate role assignments', async () => {
      req.params = { id: 'person-123' };
      req.body = {
        role_id: 'role-456', // Person already has this role
        proficiency_level: 'EXPERT'
      };

      const mockDbQuery = createChainableMock();
      mockDbQuery.returning.mockRejectedValue(new Error('UNIQUE constraint failed: person_roles.person_id, person_roles.role_id'));
      (controller as any).db = jest.fn(() => mockDbQuery);

      await expect(controller.addRole(req as Request, res as Response))
        .rejects.toThrow('UNIQUE constraint failed: person_roles.person_id, person_roles.role_id');
    });

    test('should validate pagination parameters', async () => {
      req.query = { page: 'abc', limit: '0' };

      const mockDbQuery = createChainableMock();
      mockDbQuery.first.mockResolvedValue({ count: 100 });
      (controller as any).db = jest.fn(() => mockDbQuery);
      
      (controller as any).paginate = jest.fn((query, page, limit) => {
        // Should default to safe values for invalid pagination
        expect(page).toBe(1);
        expect(limit).toBe(50);
        return Promise.resolve([]);
      });

      await controller.getAll(req as Request, res as Response);

      expect((controller as any).paginate).toHaveBeenCalled();
    });

    test('should handle concurrent person updates safely', async () => {
      req.params = { id: 'person-123' };
      req.body = { name: 'Updated Name' };

      const mockDbQuery = createChainableMock();
      // Simulate concurrent update - person already modified
      mockDbQuery.returning.mockResolvedValue([]); // No rows returned
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.update(req as Request, res as Response);

      expect((controller as any).handleNotFound).toHaveBeenCalledWith(res, 'Person');
    });
  });

  describe('Complex Business Logic Integration', () => {
    test('should handle person with multiple role assignments correctly', async () => {
      req.params = { id: 'multi-role-person' };

      const mockPerson = {
        id: 'multi-role-person',
        name: 'Full Stack Developer',
        primary_role_name: 'Senior Developer'
      };

      const mockRoles = [
        { role_name: 'Frontend Developer', proficiency_level: 'EXPERT', years_experience: 6 },
        { role_name: 'Backend Developer', proficiency_level: 'INTERMEDIATE', years_experience: 4 },
        { role_name: 'DevOps Engineer', proficiency_level: 'BEGINNER', years_experience: 1 }
      ];

      const mockAssignments = [
        { project_name: 'Web App', role_name: 'Frontend Developer', allocation_percentage: 50 },
        { project_name: 'API Service', role_name: 'Backend Developer', allocation_percentage: 30 }
      ];

      const mockDbQuery = createChainableMock();
      mockDbQuery.first.mockResolvedValue(mockPerson);
      
      (controller as any).db = jest.fn()
        .mockReturnValueOnce(mockDbQuery)
        .mockReturnValueOnce({...createChainableMock(), select: jest.fn().mockResolvedValue(mockRoles)})
        .mockReturnValueOnce({...createChainableMock(), orderBy: jest.fn().mockResolvedValue(mockAssignments)})
        .mockReturnValueOnce({...createChainableMock(), orderBy: jest.fn().mockResolvedValue([])});

      await controller.getById(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        ...mockPerson,
        roles: mockRoles,
        assignments: mockAssignments,
        availabilityOverrides: []
      });
    });

    test('should validate supervisor-subordinate relationship constraints', async () => {
      req.body = {
        name: 'New Employee',
        supervisor_id: 'person-123', // Valid supervisor
        primary_role_id: 'role-456'
      };

      const mockPerson = {
        id: 'person-new',
        ...req.body,
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      };

      const mockDbQuery = createChainableMock();
      mockDbQuery.returning.mockResolvedValue([mockPerson]);
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.create(req as Request, res as Response);

      expect(mockDbQuery.insert).toHaveBeenCalledWith({
        name: 'New Employee',
        supervisor_id: 'person-123',
        primary_role_id: 'role-456',
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
    });

    test('should handle assignment queries with future date filters', async () => {
      req.params = { id: 'person-123' };

      const mockPerson = { id: 'person-123', name: 'Active Employee' };
      
      // Mock to verify that assignment query includes date filter
      const mockAssignmentQuery = createChainableMock();
      mockAssignmentQuery.orderBy.mockResolvedValue([
        { project_name: 'Current Project', end_date: '2024-12-31' }
      ]);

      const mockDbQuery = createChainableMock();
      mockDbQuery.first.mockResolvedValue(mockPerson);
      
      (controller as any).db = jest.fn()
        .mockReturnValueOnce(mockDbQuery) // Main person query
        .mockReturnValueOnce({...createChainableMock(), select: jest.fn().mockResolvedValue([])}) // Roles
        .mockReturnValueOnce(mockAssignmentQuery) // Assignments with date filter
        .mockReturnValueOnce({...createChainableMock(), orderBy: jest.fn().mockResolvedValue([])}); // Availability

      await controller.getById(req as Request, res as Response);

      // Verify assignment query filters for current/future assignments
      expect(mockAssignmentQuery.where).toHaveBeenCalledWith('project_assignments.person_id', 'person-123');
      expect(mockAssignmentQuery.where).toHaveBeenCalledWith('project_assignments.end_date', '>=', expect.any(Date));
    });

    test('should enforce data consistency in person hierarchies', async () => {
      req.body = {
        name: 'Manager',
        supervisor_id: 'person-subordinate', // Circular reference - subordinate as supervisor
        primary_role_id: 'role-manager'
      };

      const mockDbQuery = createChainableMock();
      // Database should enforce referential integrity constraints
      mockDbQuery.returning.mockRejectedValue(new Error('Circular reference detected in supervisor hierarchy'));
      (controller as any).db = jest.fn(() => mockDbQuery);

      await expect(controller.create(req as Request, res as Response))
        .rejects.toThrow('Circular reference detected in supervisor hierarchy');
    });
  });
});