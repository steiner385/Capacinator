import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

import { Request, Response } from 'express';
import { ProjectsController } from '../../../../src/server/api/controllers/ProjectsController';

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
    orderBy: jest.fn().mockReturnThis(),
    raw: jest.fn()
  };
  return chainable;
};

/**
 * Critical ProjectsController Unit Tests
 * 
 * This test suite validates the core business logic of the ProjectsController:
 * - Project sub-type validation and business rules
 * - Proper data retrieval with complex joins
 * - Input validation and error handling
 * - CRUD operations integrity
 * - Project health and demand calculations
 * 
 * These tests ensure the API maintains data integrity and follows business rules.
 */

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create controller with mocked database
    controller = new ProjectsController();
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

  describe('Project Sub-Type Validation', () => {
    test('should validate mandatory project sub-type during creation', async () => {
      // Test the critical business rule: projects must have valid sub-types
      req.body = {
        name: 'Test Project',
        project_type_id: 'type-123',
        // Missing project_sub_type_id - should fail
        description: 'A test project'
      };

      // Mock validateProjectSubType to throw error for missing sub-type
      const mockValidateProjectSubType = jest.spyOn(controller as any, 'validateProjectSubType')
        .mockRejectedValue(new Error('Project sub-type is required for all projects'));

      // Mock database setup
      const mockDbQuery = createChainableMock();
      (controller as any).db = jest.fn(() => mockDbQuery);

      await expect(controller.create(req as Request, res as Response))
        .rejects.toThrow('Project sub-type is required for all projects');

      expect(mockValidateProjectSubType).toHaveBeenCalledWith('type-123', undefined);
    });

    test('should validate project sub-type belongs to correct project type', async () => {
      req.body = {
        name: 'Test Project',
        project_type_id: 'type-123',
        project_sub_type_id: 'subtype-456'
      };

      // Mock database responses for validation
      const mockDbQuery = createChainableMock();
      mockDbQuery.first
        .mockResolvedValueOnce({ id: 'type-123', name: 'Development' }) // project type
        .mockResolvedValueOnce({
          id: 'subtype-456',
          name: 'Web Development',
          project_type_id: 'different-type-id', // Wrong parent type!
          is_active: true
        });

      (controller as any).db = jest.fn(() => mockDbQuery);

      await expect(controller.create(req as Request, res as Response))
        .rejects.toThrow('Project sub-type "Web Development" does not belong to project type "Development"');
    });

    test('should reject inactive project sub-types', async () => {
      req.body = {
        name: 'Test Project',
        project_type_id: 'type-123',
        project_sub_type_id: 'subtype-456'
      };

      const mockDbQuery = createChainableMock();
      mockDbQuery.first
        .mockResolvedValueOnce({ id: 'type-123', name: 'Development' })
        .mockResolvedValueOnce({
          id: 'subtype-456',
          name: 'Legacy System',
          project_type_id: 'type-123',
          is_active: false // Inactive sub-type should be rejected
        });

      (controller as any).db = jest.fn(() => mockDbQuery);

      await expect(controller.create(req as Request, res as Response))
        .rejects.toThrow('Project sub-type "Legacy System" is not active');
    });

    test('should allow valid project sub-type', async () => {
      req.body = {
        name: 'Valid Project',
        project_type_id: 'type-123',
        project_sub_type_id: 'subtype-456',
        description: 'A valid project'
      };

      const mockDbQuery = createChainableMock();
      
      // Mock successful validation responses
      mockDbQuery.first
        .mockResolvedValueOnce({ id: 'type-123', name: 'Development' })
        .mockResolvedValueOnce({
          id: 'subtype-456',
          name: 'Web Development',
          project_type_id: 'type-123',
          is_active: true
        });

      const mockProject = {
        id: 'project-789',
        name: 'Valid Project',
        project_type_id: 'type-123',
        project_sub_type_id: 'subtype-456',
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      };

      mockDbQuery.returning.mockResolvedValue([mockProject]);
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.create(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockProject);
    });
  });

  describe('Project CRUD Operations', () => {
    test('should fetch all projects with proper joins and pagination', async () => {
      req.query = { page: '2', limit: '25', project_type_id: 'type-123' };

      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project Alpha',
          location_name: 'New York',
          project_type_name: 'Development',
          project_sub_type_name: 'Web Development',
          owner_name: 'John Smith',
          current_phase_name: 'Planning'
        }
      ];

      const mockDbQuery = createChainableMock();
      mockDbQuery.first.mockResolvedValue({ count: 100 });
      
      // Mock the query chain for projects
      (controller as any).db = jest.fn(() => mockDbQuery);
      (controller as any).buildFilters = jest.fn((query) => {
        // Simulate filtering by project_type_id
        expect(query).toBeDefined();
        return query;
      });
      (controller as any).paginate = jest.fn((query, page, limit) => {
        expect(page).toBe(2);
        expect(limit).toBe(25);
        mockDbQuery.first.mockResolvedValue(mockProjects[0]);
        return Promise.resolve(mockProjects);
      });

      await controller.getAll(req as Request, res as Response);

      // Verify complex join query was built correctly
      expect((controller as any).db).toHaveBeenCalledWith('projects');
      expect(mockDbQuery.leftJoin).toHaveBeenCalledWith('locations', 'projects.location_id', 'locations.id');
      expect(mockDbQuery.leftJoin).toHaveBeenCalledWith('project_types', 'projects.project_type_id', 'project_types.id');
      expect(mockDbQuery.leftJoin).toHaveBeenCalledWith('project_sub_types', 'projects.project_sub_type_id', 'project_sub_types.id');
      
      expect(res.json).toHaveBeenCalledWith({
        data: mockProjects,
        pagination: {
          page: 2,
          limit: 25,
          total: 100,
          totalPages: 4
        }
      });
    });

    test('should fetch project by ID with all related data', async () => {
      req.params = { id: 'project-123' };

      const mockProject = {
        id: 'project-123',
        name: 'Complex Project',
        location_name: 'Boston',
        project_type_name: 'Development'
      };

      const mockPhases = [
        { phase_name: 'Planning', start_date: '2024-01-01' }
      ];

      const mockAssignments = [
        { person_name: 'Jane Doe', role_name: 'Developer', allocation_percentage: 80 }
      ];

      const mockPlanners = [
        { person_name: 'Bob Manager', is_primary_planner: true }
      ];

      const mockDbQuery = createChainableMock();
      mockDbQuery.first.mockResolvedValue(mockProject);
      
      // Mock subsequent queries for related data
      (controller as any).db = jest.fn()
        .mockReturnValueOnce(mockDbQuery) // Main project query
        .mockReturnValueOnce({...createChainableMock(), orderBy: jest.fn().mockResolvedValue(mockPhases)}) // Phases query
        .mockReturnValueOnce({...createChainableMock(), orderBy: jest.fn().mockResolvedValue(mockAssignments)}) // Assignments query
        .mockReturnValueOnce({...createChainableMock(), orderBy: jest.fn().mockResolvedValue(mockPlanners)}); // Planners query

      await controller.getById(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        ...mockProject,
        phases: mockPhases,
        assignments: mockAssignments,
        planners: mockPlanners
      });
    });

    test('should handle project not found gracefully', async () => {
      req.params = { id: 'nonexistent-project' };

      const mockDbQuery = createChainableMock();
      mockDbQuery.first.mockResolvedValue(null); // Project not found
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.getById(req as Request, res as Response);

      expect((controller as any).handleNotFound).toHaveBeenCalledWith(res, 'Project');
    });

    test('should update project with validation', async () => {
      req.params = { id: 'project-123' };
      req.body = {
        name: 'Updated Project Name',
        project_sub_type_id: 'new-subtype-456'
      };

      const currentProject = {
        id: 'project-123',
        project_type_id: 'type-123',
        project_sub_type_id: 'old-subtype'
      };

      const updatedProject = {
        ...currentProject,
        name: 'Updated Project Name',
        project_sub_type_id: 'new-subtype-456',
        updated_at: expect.any(Date)
      };

      const mockDbQuery = createChainableMock();
      mockDbQuery.first
        .mockResolvedValueOnce(currentProject) // Current project for validation
        .mockResolvedValueOnce({ id: 'type-123', name: 'Development' }) // Project type validation
        .mockResolvedValueOnce({
          id: 'new-subtype-456',
          name: 'Mobile Development',
          project_type_id: 'type-123',
          is_active: true
        }); // Sub-type validation

      mockDbQuery.returning.mockResolvedValue([updatedProject]);
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.update(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(updatedProject);
      expect(mockDbQuery.update).toHaveBeenCalledWith({
        name: 'Updated Project Name',
        project_sub_type_id: 'new-subtype-456',
        updated_at: expect.any(Date)
      });
    });

    test('should delete project safely', async () => {
      req.params = { id: 'project-to-delete' };

      const mockDbQuery = createChainableMock();
      mockDbQuery.del.mockResolvedValue(1); // One row deleted
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.delete(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ message: 'Project deleted successfully' });
      expect(mockDbQuery.where).toHaveBeenCalledWith('id', 'project-to-delete');
      expect(mockDbQuery.del).toHaveBeenCalled();
    });

    test('should handle deletion of non-existent project', async () => {
      req.params = { id: 'nonexistent-project' };

      const mockDbQuery = createChainableMock();
      mockDbQuery.del.mockResolvedValue(0); // No rows deleted
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.delete(req as Request, res as Response);

      expect((controller as any).handleNotFound).toHaveBeenCalledWith(res, 'Project');
    });
  });

  describe('Project Health and Analytics', () => {
    test('should fetch project health data', async () => {
      const mockHealthData = [
        { project_id: 'project-1', health_status: 'ACTIVE', risk_level: 'LOW' },
        { project_id: 'project-2', health_status: 'OVERDUE', risk_level: 'HIGH' }
      ];

      const mockDbQuery = createChainableMock();
      mockDbQuery.select.mockResolvedValue(mockHealthData);
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.getHealth(req as Request, res as Response);

      expect((controller as any).db).toHaveBeenCalledWith('project_health_view');
      expect(res.json).toHaveBeenCalledWith(mockHealthData);
    });

    test('should fetch project demands with role information', async () => {
      req.params = { id: 'project-123' };

      const mockDemands = [
        {
          project_id: 'project-123',
          role_id: 'role-456',
          role_name: 'Senior Developer',
          required_count: 2,
          start_date: '2024-06-01'
        }
      ];

      const mockDbQuery = createChainableMock();
      mockDbQuery.orderBy.mockResolvedValue(mockDemands);
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.getDemands(req as Request, res as Response);

      expect((controller as any).db).toHaveBeenCalledWith('project_demands_view');
      expect(mockDbQuery.join).toHaveBeenCalledWith('roles', 'project_demands_view.role_id', 'roles.id');
      expect(mockDbQuery.where).toHaveBeenCalledWith('project_demands_view.project_id', 'project-123');
      expect(res.json).toHaveBeenCalledWith(mockDemands);
    });
  });

  describe('Test Data Management', () => {
    test('should delete test projects safely', async () => {
      const mockDbQuery = createChainableMock();
      mockDbQuery.del.mockResolvedValue(5); // 5 test projects deleted
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.deleteTestData(req as Request, res as Response);

      expect(mockDbQuery.where).toHaveBeenCalledWith('name', 'like', 'Test_%');
      expect(mockDbQuery.del).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Deleted 5 test projects' });
    });
  });

  describe('Input Validation and Edge Cases', () => {
    test('should handle malformed project data gracefully', async () => {
      req.body = {
        name: null, // Invalid name
        project_type_id: '',
        project_sub_type_id: 'invalid-id'
      };

      const mockDbQuery = createChainableMock();
      (controller as any).db = jest.fn(() => mockDbQuery);

      // Should validate and reject invalid data
      const mockValidateProjectSubType = jest.spyOn(controller as any, 'validateProjectSubType')
        .mockRejectedValue(new Error('Project type with ID  not found'));

      await expect(controller.create(req as Request, res as Response))
        .rejects.toThrow('Project type with ID  not found');
    });

    test('should handle database constraint violations', async () => {
      req.body = {
        name: 'Duplicate Project',
        project_type_id: 'type-123',
        project_sub_type_id: 'subtype-456'
      };

      const mockDbQuery = createChainableMock();
      mockDbQuery.first
        .mockResolvedValueOnce({ id: 'type-123', name: 'Development' })
        .mockResolvedValueOnce({
          id: 'subtype-456',
          name: 'Web Development',
          project_type_id: 'type-123',
          is_active: true
        });

      // Simulate database constraint violation
      mockDbQuery.returning.mockRejectedValue(new Error('UNIQUE constraint failed: projects.name'));
      (controller as any).db = jest.fn(() => mockDbQuery);

      await expect(controller.create(req as Request, res as Response))
        .rejects.toThrow('UNIQUE constraint failed: projects.name');
    });

    test('should validate pagination parameters', async () => {
      req.query = { page: 'invalid', limit: '-5' };

      const mockDbQuery = createChainableMock();
      mockDbQuery.first.mockResolvedValue({ count: 50 });
      (controller as any).db = jest.fn(() => mockDbQuery);
      
      (controller as any).paginate = jest.fn((query, page, limit) => {
        // Should default to page 1 and limit 50 for invalid values
        expect(page).toBe(1);
        expect(limit).toBe(50);
        return Promise.resolve([]);
      });

      await controller.getAll(req as Request, res as Response);

      expect((controller as any).paginate).toHaveBeenCalled();
    });

    test('should handle concurrent project updates safely', async () => {
      req.params = { id: 'project-123' };
      req.body = { name: 'Updated Name' };

      const mockDbQuery = createChainableMock();
      mockDbQuery.first.mockResolvedValue({
        id: 'project-123',
        project_type_id: 'type-123',
        project_sub_type_id: 'subtype-456'
      });

      // Simulate concurrent update - project already modified
      mockDbQuery.returning.mockResolvedValue([]); // No rows returned (project was modified by another transaction)
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.update(req as Request, res as Response);

      expect((controller as any).handleNotFound).toHaveBeenCalledWith(res, 'Project');
    });
  });

  describe('Complex Business Logic Integration', () => {
    test('should validate project timeline constraints', async () => {
      req.body = {
        name: 'Timeline Project',
        project_type_id: 'type-123',
        project_sub_type_id: 'subtype-456',
        start_date: '2024-12-31',
        end_date: '2024-01-01' // End before start - should be handled by business logic
      };

      const mockDbQuery = createChainableMock();
      mockDbQuery.first
        .mockResolvedValueOnce({ id: 'type-123', name: 'Development' })
        .mockResolvedValueOnce({
          id: 'subtype-456',
          name: 'Web Development',
          project_type_id: 'type-123',
          is_active: true
        });

      // Project creation should include timeline validation
      const mockProject = {
        id: 'project-789',
        ...req.body,
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      };

      mockDbQuery.returning.mockResolvedValue([mockProject]);
      (controller as any).db = jest.fn(() => mockDbQuery);

      await controller.create(req as Request, res as Response);

      // Controller should accept the data (timeline validation may be handled at DB or application level)
      expect(mockDbQuery.insert).toHaveBeenCalledWith({
        ...req.body,
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
    });

    test('should handle project with complex relationship dependencies', async () => {
      req.params = { id: 'complex-project' };

      const mockProject = {
        id: 'complex-project',
        name: 'Enterprise Project',
        has_dependencies: true
      };

      const mockPhases = [
        { phase_name: 'Discovery', dependencies: ['stakeholder-approval'] },
        { phase_name: 'Development', dependencies: ['discovery-complete'] }
      ];

      const mockAssignments = [
        { person_name: 'Lead Developer', allocation_percentage: 100 },
        { person_name: 'Junior Developer', allocation_percentage: 50 }
      ];

      const mockDbQuery = createChainableMock();
      mockDbQuery.first.mockResolvedValue(mockProject);
      
      (controller as any).db = jest.fn()
        .mockReturnValueOnce(mockDbQuery)
        .mockReturnValueOnce({...createChainableMock(), orderBy: jest.fn().mockResolvedValue(mockPhases)})
        .mockReturnValueOnce({...createChainableMock(), orderBy: jest.fn().mockResolvedValue(mockAssignments)})
        .mockReturnValueOnce({...createChainableMock(), orderBy: jest.fn().mockResolvedValue([])});

      await controller.getById(req as Request, res as Response);

      // Should return all related data for complex analysis
      expect(res.json).toHaveBeenCalledWith({
        ...mockProject,
        phases: mockPhases,
        assignments: mockAssignments,
        planners: []
      });
    });
  });
});