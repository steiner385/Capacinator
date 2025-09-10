import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

import { Request, Response } from 'express';
import { ProjectPhaseDependenciesController } from '../../../../src/server/api/controllers/ProjectPhaseDependenciesController';

// Mock dependencies - Create a proper Knex-like mock
const createQueryMock = () => {
  const mockQuery = {
    select: (jest.fn() as any),
    join: (jest.fn() as any),
    where: (jest.fn() as any),
    whereIn: (jest.fn() as any),
    first: (jest.fn() as any),
    insert: (jest.fn() as any),
    update: (jest.fn() as any),
    delete: (jest.fn() as any),
    returning: (jest.fn() as any),
    count: (jest.fn() as any),
    orderBy: (jest.fn() as any),
    limit: (jest.fn() as any),
    offset: (jest.fn() as any)
  };

  // Configure all methods to return the same mock query for chaining, except terminal methods
  mockQuery.select.mockReturnValue(mockQuery);
  mockQuery.join.mockReturnValue(mockQuery);
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.whereIn.mockReturnValue(mockQuery);
  mockQuery.insert.mockReturnValue(mockQuery);
  mockQuery.update.mockReturnValue(mockQuery);
  mockQuery.returning.mockReturnValue(mockQuery);
  mockQuery.count.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);

  // Terminal methods that resolve with values
  mockQuery.first.mockResolvedValue(null);
  mockQuery.delete.mockResolvedValue(0);
  mockQuery.orderBy.mockResolvedValue([]);
  mockQuery.offset.mockResolvedValue([]);

  return mockQuery;
};

const mockQuery = createQueryMock();

// Mock the main db function that returns the query builder
const mockDb = jest.fn().mockImplementation(() => createQueryMock()) as any;

// Mock ProjectPhaseCascadeService
jest.mock('../../../../src/server/services/ProjectPhaseCascadeService.js', () => ({
  ProjectPhaseCascadeService: jest.fn().mockImplementation(() => ({
    calculateCascade: jest.fn(),
    applyCascade: jest.fn()
  }))
}));

describe('ProjectPhaseDependenciesController', () => {
  let controller: ProjectPhaseDependenciesController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    controller = new ProjectPhaseDependenciesController(mockDb as any);
    mockReq = {
      query: {},
      params: {},
      body: {}
    };
    mockRes = {
      json: jest.fn() as any,
      status: jest.fn().mockReturnThis() as any
    };
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all dependencies with project filter', async () => {
      const mockDependencies = [
        {
          id: 'dep-1',
          project_id: 'proj-1',
          predecessor_phase_timeline_id: 'phase-1',
          successor_phase_timeline_id: 'phase-2',
          dependency_type: 'FS',
          lag_days: 0
        }
      ];

      mockReq.query = { project_id: 'proj-1' };
      mockQuery.orderBy.mockResolvedValue(mockDependencies);

      await controller.getAll(mockReq as Request, mockRes as Response);

      expect(mockQuery.join).toHaveBeenCalledTimes(4);
      expect(mockQuery.where).toHaveBeenCalledWith('ppd.project_id', 'proj-1');
      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockDependencies,
        pagination: expect.any(Object)
      });
    });

    it('should handle pagination', async () => {
      const mockDependencies: any[] = [];
      mockReq.query = { page: '2', limit: '10' };
      
      mockQuery.limit.mockReturnThis();
      mockQuery.offset.mockResolvedValue(mockDependencies);
      mockQuery.first.mockResolvedValue({ count: 25 });

      await controller.getAll(mockReq as Request, mockRes as Response);

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.offset).toHaveBeenCalledWith(10);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockDependencies,
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3
        }
      });
    });
  });

  describe('create', () => {
    it('should create a new dependency successfully', async () => {
      const dependencyData = {
        project_id: 'proj-1',
        predecessor_phase_timeline_id: 'phase-1',
        successor_phase_timeline_id: 'phase-2',
        dependency_type: 'FS',
        lag_days: 0
      };

      const mockPhases = [
        { id: 'phase-1', project_id: 'proj-1' },
        { id: 'phase-2', project_id: 'proj-1' }
      ];

      const mockCreatedDependency = {
        ...dependencyData,
        id: 'dep-1',
        predecessor_phase_name: 'Phase 1',
        successor_phase_name: 'Phase 2'
      };

      mockReq.body = dependencyData;
      mockQuery.where.mockResolvedValueOnce(mockPhases); // Phase validation
      mockQuery.where.mockResolvedValueOnce(null); // Circular dependency check
      mockQuery.insert.mockResolvedValue([]);
      mockQuery.first.mockResolvedValue(mockCreatedDependency);

      await controller.create(mockReq as Request, mockRes as Response);

      expect(mockQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
        project_id: 'proj-1',
        predecessor_phase_timeline_id: 'phase-1',
        successor_phase_timeline_id: 'phase-2',
        dependency_type: 'FS',
        lag_days: 0,
        id: expect.any(String)
      }));
      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockCreatedDependency
      });
    });

    it('should prevent self-dependencies', async () => {
      mockReq.body = {
        project_id: 'proj-1',
        predecessor_phase_timeline_id: 'phase-1',
        successor_phase_timeline_id: 'phase-1' // Same phase!
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await controller.create(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      consoleSpy.mockRestore();
    });

    it('should prevent circular dependencies', async () => {
      const dependencyData = {
        project_id: 'proj-1',
        predecessor_phase_timeline_id: 'phase-1',
        successor_phase_timeline_id: 'phase-2'
      };

      const mockPhases = [
        { id: 'phase-1', project_id: 'proj-1' },
        { id: 'phase-2', project_id: 'proj-1' }
      ];

      const existingDependency = { id: 'existing-dep' };

      mockReq.body = dependencyData;
      mockQuery.where.mockResolvedValueOnce(mockPhases); // Phase validation
      mockQuery.first.mockResolvedValueOnce(existingDependency); // Circular dependency exists

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await controller.create(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      consoleSpy.mockRestore();
    });
  });

  describe('calculateCascade', () => {
    it('should calculate cascade effects', async () => {
      const cascadeData = {
        project_id: 'proj-1',
        phase_timeline_id: 'phase-1',
        new_start_date: '2024-01-01',
        new_end_date: '2024-01-31'
      };

      const mockCascadeResult = {
        affectedPhases: [
          {
            phaseId: 'phase-2',
            newStartDate: '2024-02-01',
            newEndDate: '2024-02-28'
          }
        ],
        conflicts: []
      };

      mockReq.body = cascadeData;

      // Mock the cascade service
      const { ProjectPhaseCascadeService } = await import('../../../../src/server/services/ProjectPhaseCascadeService.js');
      const mockCascadeService = new (ProjectPhaseCascadeService as any)(mockDb);
      mockCascadeService.calculateCascade.mockResolvedValue(mockCascadeResult);

      await controller.calculateCascade(mockReq as Request, mockRes as Response);

      expect(mockCascadeService.calculateCascade).toHaveBeenCalledWith(
        'proj-1',
        'phase-1',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockCascadeResult
      });
    });
  });

  describe('update', () => {
    it('should update dependency successfully', async () => {
      const updateData = {
        dependency_type: 'SS',
        lag_days: 5
      };

      const existingDependency = {
        id: 'dep-1',
        dependency_type: 'FS',
        lag_days: 0
      };

      const updatedDependency = {
        ...existingDependency,
        ...updateData
      };

      mockReq.params = { id: 'dep-1' };
      mockReq.body = updateData;
      mockQuery.first.mockResolvedValueOnce(existingDependency);
      mockQuery.update.mockResolvedValue([]);
      mockQuery.first.mockResolvedValueOnce(updatedDependency);

      await controller.update(mockReq as Request, mockRes as Response);

      expect(mockQuery.update).toHaveBeenCalledWith(expect.objectContaining({
        dependency_type: 'SS',
        lag_days: 5,
        updated_at: expect.any(String)
      }));
      expect(mockRes.json).toHaveBeenCalledWith({
        data: updatedDependency
      });
    });
  });

  describe('delete', () => {
    it('should delete dependency successfully', async () => {
      mockReq.params = { id: 'dep-1' };
      mockQuery.delete.mockResolvedValue(1);

      await controller.delete(mockReq as Request, mockRes as Response);

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Dependency deleted successfully'
      });
    });

    it('should handle dependency not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockQuery.delete.mockResolvedValue(0);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await controller.delete(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      consoleSpy.mockRestore();
    });
  });
});