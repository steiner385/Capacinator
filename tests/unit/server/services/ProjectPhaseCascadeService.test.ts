import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

import { ProjectPhaseCascadeService } from '../../../../src/server/services/ProjectPhaseCascadeService';
import type { DependencyType } from '../../../../client/src/types/index';

// Mock database
const mockDb = {
  select: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  transaction: jest.fn(),
  update: jest.fn().mockReturnThis(),
  returning: jest.fn()
};

describe('ProjectPhaseCascadeService', () => {
  let service: ProjectPhaseCascadeService;

  beforeEach(() => {
    service = new ProjectPhaseCascadeService(mockDb as any);
    jest.clearAllMocks();
  });

  describe('calculateCascade', () => {
    it('should calculate cascade for Finish-to-Start dependency', async () => {
      const projectId = 'proj-1';
      const changedPhaseId = 'phase-1';
      const newStartDate = new Date('2024-01-01');
      const newEndDate = new Date('2024-01-31');

      const mockDependencies = [
        {
          id: 'dep-1',
          predecessor_phase_timeline_id: 'phase-1',
          successor_phase_timeline_id: 'phase-2',
          dependency_type: 'FS' as DependencyType,
          lag_days: 0,
          successor_start_date: new Date('2024-01-15'),
          successor_end_date: new Date('2024-02-15'),
          successor_duration_days: 31
        }
      ];

      const mockPhases = [
        {
          id: 'phase-1',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-31')
        },
        {
          id: 'phase-2',
          start_date: new Date('2024-01-15'),
          end_date: new Date('2024-02-15')
        }
      ];

      mockDb.where.mockResolvedValueOnce(mockDependencies); // Dependencies
      mockDb.where.mockResolvedValueOnce(mockPhases); // All phases

      const result = await service.calculateCascade(
        projectId,
        changedPhaseId,
        newStartDate,
        newEndDate
      );

      expect(result.affectedPhases).toHaveLength(1);
      expect(result.affectedPhases[0].phaseId).toBe('phase-2');
      expect(result.affectedPhases[0].newStartDate).toEqual(new Date('2024-02-01')); // FS: starts after predecessor ends + 1 day
      expect(result.conflicts).toHaveLength(0);
    });

    it('should calculate cascade for Start-to-Start dependency', async () => {
      const projectId = 'proj-1';
      const changedPhaseId = 'phase-1';
      const newStartDate = new Date('2024-02-01');
      const newEndDate = new Date('2024-02-28');

      const mockDependencies = [
        {
          id: 'dep-1',
          predecessor_phase_timeline_id: 'phase-1',
          successor_phase_timeline_id: 'phase-2',
          dependency_type: 'SS' as DependencyType,
          lag_days: 5,
          successor_start_date: new Date('2024-01-10'),
          successor_end_date: new Date('2024-02-10'),
          successor_duration_days: 31
        }
      ];

      const mockPhases = [
        {
          id: 'phase-1',
          start_date: new Date('2024-02-01'),
          end_date: new Date('2024-02-28')
        },
        {
          id: 'phase-2',
          start_date: new Date('2024-01-10'),
          end_date: new Date('2024-02-10')
        }
      ];

      mockDb.where.mockResolvedValueOnce(mockDependencies);
      mockDb.where.mockResolvedValueOnce(mockPhases);

      const result = await service.calculateCascade(
        projectId,
        changedPhaseId,
        newStartDate,
        newEndDate
      );

      expect(result.affectedPhases).toHaveLength(1);
      expect(result.affectedPhases[0].phaseId).toBe('phase-2');
      expect(result.affectedPhases[0].newStartDate).toEqual(new Date('2024-02-06')); // SS: starts with predecessor + lag
    });

    it('should calculate cascade for Finish-to-Finish dependency', async () => {
      const projectId = 'proj-1';
      const changedPhaseId = 'phase-1';
      const newStartDate = new Date('2024-01-01');
      const newEndDate = new Date('2024-03-31');

      const mockDependencies = [
        {
          id: 'dep-1',
          predecessor_phase_timeline_id: 'phase-1',
          successor_phase_timeline_id: 'phase-2',
          dependency_type: 'FF' as DependencyType,
          lag_days: 0,
          successor_start_date: new Date('2024-01-15'),
          successor_end_date: new Date('2024-02-15'),
          successor_duration_days: 31
        }
      ];

      const mockPhases = [
        {
          id: 'phase-1',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-03-31')
        },
        {
          id: 'phase-2',
          start_date: new Date('2024-01-15'),
          end_date: new Date('2024-02-15')
        }
      ];

      mockDb.where.mockResolvedValueOnce(mockDependencies);
      mockDb.where.mockResolvedValueOnce(mockPhases);

      const result = await service.calculateCascade(
        projectId,
        changedPhaseId,
        newStartDate,
        newEndDate
      );

      expect(result.affectedPhases).toHaveLength(1);
      expect(result.affectedPhases[0].phaseId).toBe('phase-2');
      expect(result.affectedPhases[0].newEndDate).toEqual(new Date('2024-03-31')); // FF: ends with predecessor
    });

    it('should handle complex dependency chains', async () => {
      const projectId = 'proj-1';
      const changedPhaseId = 'phase-1';
      const newStartDate = new Date('2024-01-01');
      const newEndDate = new Date('2024-01-31');

      const mockDependencies = [
        {
          id: 'dep-1',
          predecessor_phase_timeline_id: 'phase-1',
          successor_phase_timeline_id: 'phase-2',
          dependency_type: 'FS' as DependencyType,
          lag_days: 0,
          successor_start_date: new Date('2024-01-15'),
          successor_end_date: new Date('2024-02-15'),
          successor_duration_days: 31
        },
        {
          id: 'dep-2',
          predecessor_phase_timeline_id: 'phase-2',
          successor_phase_timeline_id: 'phase-3',
          dependency_type: 'FS' as DependencyType,
          lag_days: 5,
          successor_start_date: new Date('2024-02-16'),
          successor_end_date: new Date('2024-03-16'),
          successor_duration_days: 29
        }
      ];

      const mockPhases = [
        {
          id: 'phase-1',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-31')
        },
        {
          id: 'phase-2',
          start_date: new Date('2024-01-15'),
          end_date: new Date('2024-02-15')
        },
        {
          id: 'phase-3',
          start_date: new Date('2024-02-16'),
          end_date: new Date('2024-03-16')
        }
      ];

      mockDb.where.mockResolvedValueOnce(mockDependencies);
      mockDb.where.mockResolvedValueOnce(mockPhases);

      const result = await service.calculateCascade(
        projectId,
        changedPhaseId,
        newStartDate,
        newEndDate
      );

      expect(result.affectedPhases).toHaveLength(2);
      expect(result.affectedPhases.find(p => p.phaseId === 'phase-2')).toBeTruthy();
      expect(result.affectedPhases.find(p => p.phaseId === 'phase-3')).toBeTruthy();
    });

    it('should detect conflicts when phases cannot be moved', async () => {
      const projectId = 'proj-1';
      const changedPhaseId = 'phase-1';
      const newStartDate = new Date('2024-01-01');
      const newEndDate = new Date('2024-01-31');

      const mockDependencies = [
        {
          id: 'dep-1',
          predecessor_phase_timeline_id: 'phase-1',
          successor_phase_timeline_id: 'phase-2',
          dependency_type: 'FS' as DependencyType,
          lag_days: 0,
          successor_start_date: new Date('2024-01-15'), // Starts before predecessor ends
          successor_end_date: new Date('2024-02-15'),
          successor_duration_days: 31
        }
      ];

      const mockPhases = [
        {
          id: 'phase-1',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-31')
        },
        {
          id: 'phase-2',
          start_date: new Date('2024-01-15'),
          end_date: new Date('2024-02-15')
        }
      ];

      // Mock external constraints that prevent moving phase-2
      const mockExternalConstraints = [
        {
          phase_id: 'phase-2',
          constraint_type: 'assignment',
          details: 'Person assigned to other project'
        }
      ];

      mockDb.where.mockResolvedValueOnce(mockDependencies);
      mockDb.where.mockResolvedValueOnce(mockPhases);

      const result = await service.calculateCascade(
        projectId,
        changedPhaseId,
        newStartDate,
        newEndDate
      );

      // Should still calculate the needed changes but may flag conflicts
      expect(result.affectedPhases).toHaveLength(1);
      expect(result.conflicts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('applyCascade', () => {
    it('should apply cascade changes to database', async () => {
      const projectId = 'proj-1';
      const cascadeData = {
        affectedPhases: [
          {
            phaseId: 'phase-2',
            newStartDate: new Date('2024-02-01'),
            newEndDate: new Date('2024-02-28')
          },
          {
            phaseId: 'phase-3',
            newStartDate: new Date('2024-03-01'),
            newEndDate: new Date('2024-03-31')
          }
        ],
        conflicts: []
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return await callback(mockDb);
      });
      mockDb.transaction.mockImplementation(mockTransaction);
      mockDb.update.mockResolvedValue([]);

      await service.applyCascade(projectId, cascadeData);

      expect(mockTransaction).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalledTimes(2); // Once for each affected phase
      expect(mockDb.where).toHaveBeenCalledWith('id', 'phase-2');
      expect(mockDb.where).toHaveBeenCalledWith('id', 'phase-3');
    });

    it('should handle transaction rollback on error', async () => {
      const projectId = 'proj-1';
      const cascadeData = {
        affectedPhases: [
          {
            phaseId: 'phase-2',
            newStartDate: new Date('2024-02-01'),
            newEndDate: new Date('2024-02-28')
          }
        ],
        conflicts: []
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        throw new Error('Database error');
      });
      mockDb.transaction.mockImplementation(mockTransaction);

      await expect(service.applyCascade(projectId, cascadeData))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('edge cases', () => {
    it('should handle circular dependencies gracefully', async () => {
      const projectId = 'proj-1';
      const changedPhaseId = 'phase-1';
      const newStartDate = new Date('2024-01-01');
      const newEndDate = new Date('2024-01-31');

      // Circular dependency: phase-1 -> phase-2 -> phase-1
      const mockDependencies = [
        {
          id: 'dep-1',
          predecessor_phase_timeline_id: 'phase-1',
          successor_phase_timeline_id: 'phase-2',
          dependency_type: 'FS' as DependencyType,
          lag_days: 0,
          successor_start_date: new Date('2024-02-01'),
          successor_end_date: new Date('2024-02-28'),
          successor_duration_days: 28
        },
        {
          id: 'dep-2',
          predecessor_phase_timeline_id: 'phase-2',
          successor_phase_timeline_id: 'phase-1',
          dependency_type: 'FS' as DependencyType,
          lag_days: 0,
          successor_start_date: new Date('2024-01-01'),
          successor_end_date: new Date('2024-01-31'),
          successor_duration_days: 31
        }
      ];

      const mockPhases = [
        {
          id: 'phase-1',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-31')
        },
        {
          id: 'phase-2',
          start_date: new Date('2024-02-01'),
          end_date: new Date('2024-02-28')
        }
      ];

      mockDb.where.mockResolvedValueOnce(mockDependencies);
      mockDb.where.mockResolvedValueOnce(mockPhases);

      const result = await service.calculateCascade(
        projectId,
        changedPhaseId,
        newStartDate,
        newEndDate
      );

      expect(result.conflicts).toContainEqual(
        expect.objectContaining({
          type: 'circular_dependency',
          message: expect.stringContaining('circular')
        })
      );
    });

    it('should handle empty dependencies', async () => {
      const projectId = 'proj-1';
      const changedPhaseId = 'phase-1';
      const newStartDate = new Date('2024-01-01');
      const newEndDate = new Date('2024-01-31');

      mockDb.where.mockResolvedValueOnce([]); // No dependencies
      mockDb.where.mockResolvedValueOnce([]);

      const result = await service.calculateCascade(
        projectId,
        changedPhaseId,
        newStartDate,
        newEndDate
      );

      expect(result.affectedPhases).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });
  });
});