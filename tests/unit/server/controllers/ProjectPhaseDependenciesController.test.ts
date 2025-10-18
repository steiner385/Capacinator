import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

import type { Request, Response } from 'express';
import { ProjectPhaseDependenciesController } from '../../../../src/server/api/controllers/ProjectPhaseDependenciesController';

// Mock the database module
jest.mock('../../../../src/server/database/index.js', () => ({
  db: jest.fn()
}));

import { db } from '../../../../src/server/database/index.js';

// Mock ProjectPhaseCascadeService
jest.mock('../../../../src/server/services/ProjectPhaseCascadeService', () => ({
  ProjectPhaseCascadeService: jest.fn().mockImplementation(() => ({
    calculateCascade: jest.fn().mockResolvedValue({
      affected: [],
      conflicts: []
    }),
    applyCascade: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('ProjectPhaseDependenciesController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockQuery: any;

  beforeEach(() => {
    // Create a mock query builder
    mockQuery = {
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      first: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn(),
      returning: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis()
    };

    // Mock db to return our query builder by default
    (db as jest.Mock).mockImplementation(() => mockQuery);

    mockReq = {
      query: {},
      params: {},
      body: {}
    };
    mockRes = {
      json: jest.fn() as any,
      status: jest.fn().mockReturnThis() as any,
      send: jest.fn() as any
    };
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it.skip('should fetch all dependencies with pagination', async () => {
      const mockDependencies = [
        {
          id: 'dep-1',
          project_id: 'proj-1',
          predecessor_phase_timeline_id: 'phase-1',
          successor_phase_timeline_id: 'phase-2',
          dependency_type: 'FS',
          lag_days: 0,
          predecessor_phase_name: 'Phase 1',
          successor_phase_name: 'Phase 2'
        }
      ];

      const mockCount = [{ total: '1' }];  // Note: array destructuring expected

      // Mock for the count query
      const countMockQuery = {
        where: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue(mockCount)  // count returns the array directly
      };

      // Mock for the main data query
      const dataMockQuery = {
        join: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockDependencies)  // offset is the last call, resolves to data
      };

      // Return different query objects for different calls
      (db as jest.Mock)
        .mockReturnValueOnce(countMockQuery)  // First call is for count
        .mockReturnValueOnce(dataMockQuery);  // Second call is for data

      await ProjectPhaseDependenciesController.getAll(mockReq as Request, mockRes as Response);

      expect(db).toHaveBeenNthCalledWith(1, 'project_phase_dependencies');  // count query
      expect(db).toHaveBeenNthCalledWith(2, 'project_phase_dependencies as pd');  // data query
      expect(dataMockQuery.join).toHaveBeenCalledTimes(4); // 4 joins for phase names
      expect(dataMockQuery.select).toHaveBeenCalled();
      expect(dataMockQuery.orderBy).toHaveBeenCalledWith('pd.created_at', 'desc');
      expect(dataMockQuery.limit).toHaveBeenCalledWith(10); // default limit
      expect(dataMockQuery.offset).toHaveBeenCalledWith(0); // page 1
      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockDependencies,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      mockQuery.orderBy.mockRejectedValue(error);

      await ProjectPhaseDependenciesController.getAll(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to fetch dependencies' });
    });
  });

  describe('getById', () => {
    it('should fetch dependency by id with phase names', async () => {
      const mockDependency = {
        id: 'dep-1',
        project_id: 'proj-1',
        dependency_type: 'FS',
        predecessor_phase_name: 'Phase 1',
        successor_phase_name: 'Phase 2'
      };

      mockReq.params = { id: 'dep-1' };
      mockQuery.first.mockResolvedValue(mockDependency);

      await ProjectPhaseDependenciesController.getById(mockReq as Request, mockRes as Response);

      expect(db).toHaveBeenCalledWith('project_phase_dependencies as pd');
      expect(mockQuery.join).toHaveBeenCalledTimes(4); // 4 joins for phase names
      expect(mockQuery.where).toHaveBeenCalledWith('pd.id', 'dep-1');
      expect(mockQuery.select).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockDependency);
    });

    it('should return 404 if dependency not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockQuery.first.mockResolvedValue(null);

      await ProjectPhaseDependenciesController.getById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Dependency not found' });
    });

    it('should handle errors in getById', async () => {
      mockReq.params = { id: 'dep-1' };
      mockQuery.first.mockRejectedValue(new Error('Database error'));

      await ProjectPhaseDependenciesController.getById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to fetch dependency' });
    });
  });

  describe('create', () => {
    it('should create a new dependency', async () => {
      const newDependency = {
        project_id: 'proj-1',
        predecessor_phase_timeline_id: 'phase-1',
        successor_phase_timeline_id: 'phase-2',
        dependency_type: 'FS',
        lag_days: 0
      };

      const createdDependency = { id: 'dep-1', ...newDependency };
      const dependencyWithPhaseNames = {
        ...createdDependency,
        predecessor_phase_name: 'Phase 1',
        successor_phase_name: 'Phase 2'
      };
      
      mockReq.body = newDependency;
      
      // First call for insert
      mockQuery.returning.mockResolvedValueOnce([createdDependency]);
      
      // Second call for fetching with phase names
      const secondMockQuery = {
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(dependencyWithPhaseNames)
      };
      
      (db as jest.Mock).mockReturnValueOnce(mockQuery).mockReturnValueOnce(secondMockQuery);

      await ProjectPhaseDependenciesController.create(mockReq as Request, mockRes as Response);

      expect(db).toHaveBeenCalledWith('project_phase_dependencies');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        ...newDependency,
        id: expect.stringMatching(/^dep-/),
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
      expect(mockQuery.returning).toHaveBeenCalledWith('*');
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ data: dependencyWithPhaseNames });
    });

    it('should prevent self-dependencies', async () => {
      mockReq.body = {
        project_id: 'proj-1',
        predecessor_phase_timeline_id: 'phase-1',
        successor_phase_timeline_id: 'phase-1', // Same as predecessor
        dependency_type: 'FS',
        lag_days: 0
      };

      await ProjectPhaseDependenciesController.create(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'A phase cannot depend on itself' });
      expect(db).not.toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      mockReq.body = {
        project_id: 'proj-1',
        predecessor_phase_timeline_id: 'phase-1',
        successor_phase_timeline_id: 'phase-2',
        dependency_type: 'FS',
        lag_days: 0
      };
      mockQuery.returning.mockRejectedValue(new Error('Insert failed'));

      await ProjectPhaseDependenciesController.create(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to create dependency' });
    });
  });

  describe('update', () => {
    it('should update an existing dependency', async () => {
      const updateData = { lag_days: 5 };
      const updatedDependency = {
        id: 'dep-1',
        project_id: 'proj-1',
        lag_days: 5
      };

      mockReq.params = { id: 'dep-1' };
      mockReq.body = updateData;
      mockQuery.returning.mockResolvedValue([updatedDependency]);

      await ProjectPhaseDependenciesController.update(mockReq as Request, mockRes as Response);

      expect(db).toHaveBeenCalledWith('project_phase_dependencies');
      expect(mockQuery.where).toHaveBeenCalledWith({ id: 'dep-1' });
      expect(mockQuery.update).toHaveBeenCalledWith({ ...updateData, updated_at: expect.any(Date) });
      expect(mockRes.json).toHaveBeenCalledWith(updatedDependency);
    });

    it('should return 404 if dependency to update not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockReq.body = { lag_days: 5 };
      mockQuery.returning.mockResolvedValue([]);

      await ProjectPhaseDependenciesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Dependency not found' });
    });

    it('should handle errors in update', async () => {
      mockReq.params = { id: 'dep-1' };
      mockReq.body = { lag_days: 5 };
      mockQuery.returning.mockRejectedValue(new Error('Update failed'));

      await ProjectPhaseDependenciesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to update dependency' });
    });
  });

  describe('delete', () => {
    it('should delete a dependency', async () => {
      mockReq.params = { id: 'dep-1' };
      mockQuery.delete.mockResolvedValue(1);

      await ProjectPhaseDependenciesController.delete(mockReq as Request, mockRes as Response);

      expect(db).toHaveBeenCalledWith('project_phase_dependencies');
      expect(mockQuery.where).toHaveBeenCalledWith({ id: 'dep-1' });
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should return 404 if dependency to delete not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockQuery.delete.mockResolvedValue(0);

      await ProjectPhaseDependenciesController.delete(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Dependency not found' });
    });

    it('should handle errors in delete', async () => {
      mockReq.params = { id: 'dep-1' };
      mockQuery.delete.mockRejectedValue(new Error('Delete failed'));

      await ProjectPhaseDependenciesController.delete(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to delete dependency' });
    });
  });

  describe('calculateCascade', () => {
    it('should calculate cascade effects', async () => {
      mockReq.body = {
        project_id: 'proj-1',
        phase_timeline_id: 'timeline-1',
        new_start_date: '2024-01-01',
        new_end_date: '2024-01-31'
      };

      const mockCascadeResult = {
        affected_phases: ['timeline-2', 'timeline-3'],
        cascade_count: 2
      };

      // The ProjectPhaseCascadeService is mocked at the top of the file
      await ProjectPhaseDependenciesController.calculateCascade(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        affected: [],
        conflicts: []
      });
    });
  });

  describe('applyCascade', () => {
    it('should apply cascade changes', async () => {
      mockReq.body = {
        project_id: 'proj-1',
        cascade_data: {
          'timeline-2': { start_date: '2024-02-01', end_date: '2024-02-28' },
          'timeline-3': { start_date: '2024-03-01', end_date: '2024-03-31' }
        }
      };

      await ProjectPhaseDependenciesController.applyCascade(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Cascade changes applied successfully'
      });
    });
  });
});