/**
 * BranchMetadataService Unit Tests
 * Feature: 001-git-sync-integration
 * Issue: #107 - Git Sync Unit Tests - Tier 3 Supporting Services
 *
 * Tests for BranchMetadataService covering:
 * - Branch metadata CRUD operations
 * - Metadata persistence and retrieval
 *
 * Coverage target: 85% statements, 80% branches
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { BranchMetadataService, BranchMetadata } from '../../../../../../src/server/services/git/BranchMetadataService.js';

// ===========================================
// Mock fs/promises
// ===========================================

interface MockFileSystem {
  files: Map<string, string>;
  writeError?: Error;
}

let mockFs: MockFileSystem = { files: new Map() };

function resetMockFs() {
  mockFs = { files: new Map() };
}

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockImplementation(async (path: string) => {
    const content = mockFs.files.get(path);
    if (!content) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return content;
  }),
  writeFile: jest.fn().mockImplementation(async (path: string, content: string) => {
    if (mockFs.writeError) {
      throw mockFs.writeError;
    }
    mockFs.files.set(path, content);
  }),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

// ===========================================
// Test Helpers
// ===========================================

function createTestBranch(overrides: Partial<BranchMetadata> = {}): BranchMetadata {
  return {
    name: 'feature-branch',
    description: 'Test feature branch',
    createdAt: '2024-01-15T10:00:00.000Z',
    createdBy: 'user-123',
    baseBranch: 'main',
    isActive: true,
    ...overrides,
  };
}

function setupBranchesFile(repoPath: string, branches: BranchMetadata[]) {
  const filePath = `${repoPath}/scenarios/branches.json`;
  mockFs.files.set(filePath, JSON.stringify({ version: '1.0.0', branches }));
}

// ===========================================
// Tests
// ===========================================

describe('BranchMetadataService', () => {
  const repoPath = '/test/repo';
  let service: BranchMetadataService;

  beforeEach(() => {
    resetMockFs();
    service = new BranchMetadataService(repoPath);
  });

  describe('getAllBranches', () => {
    test('should return all branches from file', async () => {
      const branches = [createTestBranch({ name: 'branch-1' }), createTestBranch({ name: 'branch-2' })];
      setupBranchesFile(repoPath, branches);

      const result = await service.getAllBranches();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('branch-1');
      expect(result[1].name).toBe('branch-2');
    });

    test('should return empty array when file does not exist', async () => {
      // No file setup - simulates new repo

      const result = await service.getAllBranches();

      expect(result).toEqual([]);
    });

    test('should return empty array when file is empty', async () => {
      setupBranchesFile(repoPath, []);

      const result = await service.getAllBranches();

      expect(result).toEqual([]);
    });

    test('should preserve all branch metadata fields', async () => {
      const branch = createTestBranch({
        name: 'test',
        description: 'Test desc',
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'user-1',
        baseBranch: 'develop',
        isActive: false,
      });
      setupBranchesFile(repoPath, [branch]);

      const result = await service.getAllBranches();

      expect(result[0]).toEqual(branch);
    });
  });

  describe('getBranch', () => {
    test('should return specific branch by name', async () => {
      const branches = [createTestBranch({ name: 'feature-a' }), createTestBranch({ name: 'feature-b' })];
      setupBranchesFile(repoPath, branches);

      const result = await service.getBranch('feature-a');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('feature-a');
    });

    test('should return null when branch not found', async () => {
      const branches = [createTestBranch({ name: 'feature-a' })];
      setupBranchesFile(repoPath, branches);

      const result = await service.getBranch('nonexistent');

      expect(result).toBeNull();
    });

    test('should return null when file does not exist', async () => {
      const result = await service.getBranch('any-branch');

      expect(result).toBeNull();
    });

    test('should be case-sensitive in branch name matching', async () => {
      const branches = [createTestBranch({ name: 'Feature-A' })];
      setupBranchesFile(repoPath, branches);

      const result = await service.getBranch('feature-a');

      expect(result).toBeNull();
    });
  });

  describe('saveBranch', () => {
    test('should add new branch to empty file', async () => {
      const branch = createTestBranch({ name: 'new-branch' });

      await service.saveBranch(branch);

      const result = await service.getAllBranches();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('new-branch');
    });

    test('should add new branch to existing branches', async () => {
      const existingBranch = createTestBranch({ name: 'existing' });
      setupBranchesFile(repoPath, [existingBranch]);

      const newBranch = createTestBranch({ name: 'new-branch' });
      await service.saveBranch(newBranch);

      const result = await service.getAllBranches();
      expect(result).toHaveLength(2);
    });

    test('should update existing branch with same name', async () => {
      const branch = createTestBranch({ name: 'feature', description: 'Original' });
      setupBranchesFile(repoPath, [branch]);

      const updatedBranch = createTestBranch({ name: 'feature', description: 'Updated' });
      await service.saveBranch(updatedBranch);

      const result = await service.getBranch('feature');
      expect(result?.description).toBe('Updated');
    });

    test('should not create duplicate branches', async () => {
      const branch = createTestBranch({ name: 'feature' });
      setupBranchesFile(repoPath, [branch]);

      await service.saveBranch(branch);

      const result = await service.getAllBranches();
      expect(result).toHaveLength(1);
    });

    test('should persist branch to file system', async () => {
      const branch = createTestBranch({ name: 'test-branch' });

      await service.saveBranch(branch);

      const fileContent = mockFs.files.get(`${repoPath}/scenarios/branches.json`);
      expect(fileContent).toBeDefined();
      const parsed = JSON.parse(fileContent!);
      expect(parsed.branches[0].name).toBe('test-branch');
    });

    test('should maintain file version', async () => {
      const branch = createTestBranch();

      await service.saveBranch(branch);

      const fileContent = mockFs.files.get(`${repoPath}/scenarios/branches.json`);
      const parsed = JSON.parse(fileContent!);
      expect(parsed.version).toBe('1.0.0');
    });
  });

  describe('deleteBranch', () => {
    test('should remove branch by name', async () => {
      const branches = [createTestBranch({ name: 'to-delete' }), createTestBranch({ name: 'to-keep' })];
      setupBranchesFile(repoPath, branches);

      await service.deleteBranch('to-delete');

      const result = await service.getAllBranches();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('to-keep');
    });

    test('should handle deleting non-existent branch gracefully', async () => {
      const branches = [createTestBranch({ name: 'existing' })];
      setupBranchesFile(repoPath, branches);

      await service.deleteBranch('nonexistent');

      const result = await service.getAllBranches();
      expect(result).toHaveLength(1);
    });

    test('should handle deleting from empty file', async () => {
      setupBranchesFile(repoPath, []);

      await service.deleteBranch('any');

      const result = await service.getAllBranches();
      expect(result).toEqual([]);
    });

    test('should delete all branches when all are removed', async () => {
      const branches = [createTestBranch({ name: 'only-branch' })];
      setupBranchesFile(repoPath, branches);

      await service.deleteBranch('only-branch');

      const result = await service.getAllBranches();
      expect(result).toEqual([]);
    });
  });

  describe('createBranchMetadata', () => {
    test('should create branch with default base branch', async () => {
      const result = await service.createBranchMetadata('new-feature', 'A new feature', 'user-1');

      expect(result.name).toBe('new-feature');
      expect(result.description).toBe('A new feature');
      expect(result.createdBy).toBe('user-1');
      expect(result.baseBranch).toBe('main');
      expect(result.isActive).toBe(true);
    });

    test('should create branch with custom base branch', async () => {
      const result = await service.createBranchMetadata('new-feature', 'A new feature', 'user-1', 'develop');

      expect(result.baseBranch).toBe('develop');
    });

    test('should set createdAt to current time', async () => {
      const beforeCreate = new Date().toISOString();
      const result = await service.createBranchMetadata('new-feature', 'A new feature', 'user-1');
      const afterCreate = new Date().toISOString();

      expect(result.createdAt >= beforeCreate).toBe(true);
      expect(result.createdAt <= afterCreate).toBe(true);
    });

    test('should persist newly created branch', async () => {
      await service.createBranchMetadata('new-feature', 'A new feature', 'user-1');

      const result = await service.getBranch('new-feature');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('new-feature');
    });

    test('should return the created branch metadata', async () => {
      const result = await service.createBranchMetadata('test', 'Test branch', 'user-123');

      expect(result).toMatchObject({
        name: 'test',
        description: 'Test branch',
        createdBy: 'user-123',
        isActive: true,
      });
    });
  });

  describe('deactivateBranch', () => {
    test('should set isActive to false', async () => {
      const branch = createTestBranch({ name: 'active-branch', isActive: true });
      setupBranchesFile(repoPath, [branch]);

      await service.deactivateBranch('active-branch');

      const result = await service.getBranch('active-branch');
      expect(result?.isActive).toBe(false);
    });

    test('should not affect other branch properties', async () => {
      const branch = createTestBranch({
        name: 'my-branch',
        description: 'My description',
        createdBy: 'user-1',
        isActive: true,
      });
      setupBranchesFile(repoPath, [branch]);

      await service.deactivateBranch('my-branch');

      const result = await service.getBranch('my-branch');
      expect(result?.description).toBe('My description');
      expect(result?.createdBy).toBe('user-1');
    });

    test('should handle deactivating non-existent branch gracefully', async () => {
      setupBranchesFile(repoPath, []);

      // Should not throw
      await service.deactivateBranch('nonexistent');

      const result = await service.getAllBranches();
      expect(result).toEqual([]);
    });

    test('should handle deactivating already inactive branch', async () => {
      const branch = createTestBranch({ name: 'inactive', isActive: false });
      setupBranchesFile(repoPath, [branch]);

      await service.deactivateBranch('inactive');

      const result = await service.getBranch('inactive');
      expect(result?.isActive).toBe(false);
    });
  });

  describe('getActiveBranches', () => {
    test('should return only active branches', async () => {
      const branches = [
        createTestBranch({ name: 'active-1', isActive: true }),
        createTestBranch({ name: 'inactive-1', isActive: false }),
        createTestBranch({ name: 'active-2', isActive: true }),
      ];
      setupBranchesFile(repoPath, branches);

      const result = await service.getActiveBranches();

      expect(result).toHaveLength(2);
      expect(result.every(b => b.isActive)).toBe(true);
    });

    test('should return empty array when no active branches', async () => {
      const branches = [
        createTestBranch({ name: 'inactive-1', isActive: false }),
        createTestBranch({ name: 'inactive-2', isActive: false }),
      ];
      setupBranchesFile(repoPath, branches);

      const result = await service.getActiveBranches();

      expect(result).toEqual([]);
    });

    test('should return empty array when file does not exist', async () => {
      const result = await service.getActiveBranches();

      expect(result).toEqual([]);
    });

    test('should return all branches when all are active', async () => {
      const branches = [
        createTestBranch({ name: 'active-1', isActive: true }),
        createTestBranch({ name: 'active-2', isActive: true }),
      ];
      setupBranchesFile(repoPath, branches);

      const result = await service.getActiveBranches();

      expect(result).toHaveLength(2);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle create, update, deactivate, delete workflow', async () => {
      // Create
      const branch = await service.createBranchMetadata('feature-x', 'Feature X', 'user-1');
      expect(branch.isActive).toBe(true);

      // Update
      const updated = { ...branch, description: 'Updated Feature X' };
      await service.saveBranch(updated);
      const afterUpdate = await service.getBranch('feature-x');
      expect(afterUpdate?.description).toBe('Updated Feature X');

      // Deactivate
      await service.deactivateBranch('feature-x');
      const afterDeactivate = await service.getBranch('feature-x');
      expect(afterDeactivate?.isActive).toBe(false);

      // Delete
      await service.deleteBranch('feature-x');
      const afterDelete = await service.getBranch('feature-x');
      expect(afterDelete).toBeNull();
    });

    test('should handle multiple branches correctly', async () => {
      await service.createBranchMetadata('branch-1', 'Branch 1', 'user-1');
      await service.createBranchMetadata('branch-2', 'Branch 2', 'user-2');
      await service.createBranchMetadata('branch-3', 'Branch 3', 'user-3');

      const all = await service.getAllBranches();
      expect(all).toHaveLength(3);

      await service.deactivateBranch('branch-2');
      const active = await service.getActiveBranches();
      expect(active).toHaveLength(2);

      await service.deleteBranch('branch-1');
      const remaining = await service.getAllBranches();
      expect(remaining).toHaveLength(2);
    });
  });

  describe('File Path Handling', () => {
    test('should use correct file path', async () => {
      const customService = new BranchMetadataService('/custom/path');
      setupBranchesFile('/custom/path', [createTestBranch()]);

      // Set up the file at the expected path
      mockFs.files.set('/custom/path/scenarios/branches.json', JSON.stringify({
        version: '1.0.0',
        branches: [createTestBranch()],
      }));

      const result = await customService.getAllBranches();
      expect(result).toHaveLength(1);
    });
  });
});
