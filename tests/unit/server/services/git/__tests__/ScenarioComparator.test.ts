/**
 * ScenarioComparator Unit Tests
 * Feature: 001-git-sync-integration
 * Issue: #107 - Git Sync Unit Tests - Tier 3 Supporting Services
 *
 * Tests for ScenarioComparator covering:
 * - Scenario diff detection
 * - Change comparison logic
 * - Summary calculation
 *
 * Coverage target: 85% statements, 80% branches
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { ScenarioComparator } from '../../../../../../src/server/services/git/ScenarioComparator.js';

// ===========================================
// Mock fs/promises
// ===========================================

interface MockFileSystem {
  files: Map<string, string>;
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
}));

// ===========================================
// Test Helpers
// ===========================================

function createTestProject(overrides: Partial<any> = {}): any {
  return {
    id: '1',
    name: 'Test Project',
    status: 'active',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    ...overrides,
  };
}

function createTestPerson(overrides: Partial<any> = {}): any {
  return {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    ...overrides,
  };
}

function createTestAssignment(overrides: Partial<any> = {}): any {
  return {
    id: '1',
    project_id: 'proj-1',
    person_id: 'person-1',
    allocation_percentage: 100,
    ...overrides,
  };
}

function createTestPhase(overrides: Partial<any> = {}): any {
  return {
    id: '1',
    project_id: 'proj-1',
    name: 'Phase 1',
    start_date: '2024-01-01',
    end_date: '2024-03-31',
    ...overrides,
  };
}

function setupScenarioFiles(
  repoPath: string,
  baseBranch: string,
  targetBranch: string,
  baseData: { projects?: any[]; people?: any[]; assignments?: any[]; phases?: any[] },
  targetData: { projects?: any[]; people?: any[]; assignments?: any[]; phases?: any[] }
) {
  const baseDir = `${repoPath}/scenarios/${baseBranch === 'main' ? 'working' : baseBranch}`;
  const targetDir = `${repoPath}/scenarios/${targetBranch === 'main' ? 'working' : targetBranch}`;

  // Setup base files
  mockFs.files.set(`${baseDir}/projects.json`, JSON.stringify({ data: baseData.projects || [] }));
  mockFs.files.set(`${baseDir}/people.json`, JSON.stringify({ data: baseData.people || [] }));
  mockFs.files.set(`${baseDir}/assignments.json`, JSON.stringify({ data: baseData.assignments || [] }));
  mockFs.files.set(`${baseDir}/project_phases.json`, JSON.stringify({ data: baseData.phases || [] }));

  // Setup target files
  mockFs.files.set(`${targetDir}/projects.json`, JSON.stringify({ data: targetData.projects || [] }));
  mockFs.files.set(`${targetDir}/people.json`, JSON.stringify({ data: targetData.people || [] }));
  mockFs.files.set(`${targetDir}/assignments.json`, JSON.stringify({ data: targetData.assignments || [] }));
  mockFs.files.set(`${targetDir}/project_phases.json`, JSON.stringify({ data: targetData.phases || [] }));
}

// ===========================================
// Tests
// ===========================================

describe('ScenarioComparator', () => {
  const repoPath = '/test/repo';
  let comparator: ScenarioComparator;

  beforeEach(() => {
    resetMockFs();
    comparator = new ScenarioComparator(repoPath);
  });

  describe('compareBranches', () => {
    describe('No Differences', () => {
      test('should return empty differences when branches are identical', async () => {
        const projects = [createTestProject()];
        setupScenarioFiles(repoPath, 'main', 'feature', { projects }, { projects });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences).toEqual([]);
        expect(result.summary.added).toBe(0);
        expect(result.summary.removed).toBe(0);
        expect(result.summary.modified).toBe(0);
      });

      test('should return empty differences when both branches have no data', async () => {
        setupScenarioFiles(repoPath, 'main', 'feature', {}, {});

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences).toEqual([]);
      });

      test('should identify base and target branches in result', async () => {
        setupScenarioFiles(repoPath, 'main', 'feature', {}, {});

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.baseBranch).toBe('main');
        expect(result.targetBranch).toBe('feature');
      });
    });

    describe('Added Entities', () => {
      test('should detect added project in target', async () => {
        const baseProjects = [createTestProject({ id: '1' })];
        const targetProjects = [createTestProject({ id: '1' }), createTestProject({ id: '2', name: 'New Project' })];
        setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences).toHaveLength(1);
        expect(result.differences[0].differenceType).toBe('added');
        expect(result.differences[0].entityId).toBe('2');
        expect(result.summary.added).toBe(1);
      });

      test('should detect multiple added entities', async () => {
        const baseProjects: any[] = [];
        const targetProjects = [createTestProject({ id: '1' }), createTestProject({ id: '2' })];
        setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences.filter(d => d.differenceType === 'added')).toHaveLength(2);
        expect(result.summary.added).toBe(2);
      });

      test('should detect added person in target', async () => {
        const basePeople: any[] = [];
        const targetPeople = [createTestPerson({ id: '1' })];
        setupScenarioFiles(repoPath, 'main', 'feature', { people: basePeople }, { people: targetPeople });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences).toHaveLength(1);
        expect(result.differences[0].entityType).toBe('person');
        expect(result.differences[0].differenceType).toBe('added');
      });

      test('should detect added assignment in target', async () => {
        const baseAssignments: any[] = [];
        const targetAssignments = [createTestAssignment({ id: '1' })];
        setupScenarioFiles(repoPath, 'main', 'feature', { assignments: baseAssignments }, { assignments: targetAssignments });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences).toHaveLength(1);
        expect(result.differences[0].entityType).toBe('assignment');
      });

      test('should detect added phase in target', async () => {
        const basePhases: any[] = [];
        const targetPhases = [createTestPhase({ id: '1' })];
        setupScenarioFiles(repoPath, 'main', 'feature', { phases: basePhases }, { phases: targetPhases });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences).toHaveLength(1);
        expect(result.differences[0].entityType).toBe('project_phase');
      });
    });

    describe('Removed Entities', () => {
      test('should detect removed project from target', async () => {
        const baseProjects = [createTestProject({ id: '1' }), createTestProject({ id: '2' })];
        const targetProjects = [createTestProject({ id: '1' })];
        setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences).toHaveLength(1);
        expect(result.differences[0].differenceType).toBe('removed');
        expect(result.differences[0].entityId).toBe('2');
        expect(result.summary.removed).toBe(1);
      });

      test('should detect all removed when target is empty', async () => {
        const baseProjects = [createTestProject({ id: '1' }), createTestProject({ id: '2' })];
        const targetProjects: any[] = [];
        setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences.filter(d => d.differenceType === 'removed')).toHaveLength(2);
        expect(result.summary.removed).toBe(2);
      });

      test('should detect removed person', async () => {
        const basePeople = [createTestPerson({ id: '1' })];
        const targetPeople: any[] = [];
        setupScenarioFiles(repoPath, 'main', 'feature', { people: basePeople }, { people: targetPeople });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences[0].entityType).toBe('person');
        expect(result.differences[0].differenceType).toBe('removed');
      });
    });

    describe('Modified Entities', () => {
      test('should detect modified project name', async () => {
        const baseProjects = [createTestProject({ id: '1', name: 'Original' })];
        const targetProjects = [createTestProject({ id: '1', name: 'Updated' })];
        setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences).toHaveLength(1);
        expect(result.differences[0].differenceType).toBe('modified');
        expect(result.differences[0].modifiedFields).toContain('name');
        expect(result.summary.modified).toBe(1);
      });

      test('should detect multiple modified fields', async () => {
        const baseProjects = [createTestProject({ id: '1', name: 'Original', status: 'active' })];
        const targetProjects = [createTestProject({ id: '1', name: 'Updated', status: 'complete' })];
        setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences[0].modifiedFields).toContain('name');
        expect(result.differences[0].modifiedFields).toContain('status');
      });

      test('should not report id field as modified', async () => {
        const baseProjects = [createTestProject({ id: '1', name: 'Original' })];
        const targetProjects = [createTestProject({ id: '1', name: 'Updated' })];
        setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences[0].modifiedFields).not.toContain('id');
      });

      test('should not report createdAt as modified', async () => {
        const baseProjects = [createTestProject({ id: '1', createdAt: '2024-01-01' })];
        const targetProjects = [createTestProject({ id: '1', createdAt: '2024-02-01' })];
        setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences).toHaveLength(0);
      });

      test('should not report updatedAt as modified', async () => {
        const baseProjects = [createTestProject({ id: '1', updatedAt: '2024-01-01' })];
        const targetProjects = [createTestProject({ id: '1', updatedAt: '2024-02-01' })];
        setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences).toHaveLength(0);
      });

      test('should detect modified person', async () => {
        const basePeople = [createTestPerson({ id: '1', first_name: 'John' })];
        const targetPeople = [createTestPerson({ id: '1', first_name: 'Jane' })];
        setupScenarioFiles(repoPath, 'main', 'feature', { people: basePeople }, { people: targetPeople });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences[0].entityType).toBe('person');
        expect(result.differences[0].differenceType).toBe('modified');
      });

      test('should include base and target values for modified entities', async () => {
        const baseProjects = [createTestProject({ id: '1', name: 'Original' })];
        const targetProjects = [createTestProject({ id: '1', name: 'Updated' })];
        setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences[0].baseValue).toBeDefined();
        expect(result.differences[0].targetValue).toBeDefined();
        expect(result.differences[0].baseValue.name).toBe('Original');
        expect(result.differences[0].targetValue.name).toBe('Updated');
      });
    });

    describe('Mixed Changes', () => {
      test('should detect added, removed, and modified in same comparison', async () => {
        const baseProjects = [
          createTestProject({ id: '1', name: 'Original' }),
          createTestProject({ id: '2', name: 'To Remove' }),
        ];
        const targetProjects = [
          createTestProject({ id: '1', name: 'Modified' }),
          createTestProject({ id: '3', name: 'New Project' }),
        ];
        setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.summary.added).toBe(1);
        expect(result.summary.removed).toBe(1);
        expect(result.summary.modified).toBe(1);
      });

      test('should detect changes across all entity types', async () => {
        setupScenarioFiles(
          repoPath,
          'main',
          'feature',
          { projects: [createTestProject({ id: '1' })] },
          {
            projects: [createTestProject({ id: '1', name: 'Changed' })],
            people: [createTestPerson({ id: '1' })],
            assignments: [createTestAssignment({ id: '1' })],
            phases: [createTestPhase({ id: '1' })],
          }
        );

        const result = await comparator.compareBranches('main', 'feature');

        const entityTypes = new Set(result.differences.map(d => d.entityType));
        expect(entityTypes.has('project')).toBe(true);
        expect(entityTypes.has('person')).toBe(true);
        expect(entityTypes.has('assignment')).toBe(true);
        expect(entityTypes.has('project_phase')).toBe(true);
      });
    });

    describe('Summary Calculation', () => {
      test('should calculate byType summary correctly', async () => {
        setupScenarioFiles(
          repoPath,
          'main',
          'feature',
          {},
          {
            projects: [createTestProject({ id: '1' }), createTestProject({ id: '2' })],
            people: [createTestPerson({ id: '1' })],
          }
        );

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.summary.byType.project.added).toBe(2);
        expect(result.summary.byType.person.added).toBe(1);
      });

      test('should handle empty byType gracefully', async () => {
        setupScenarioFiles(repoPath, 'main', 'feature', {}, {});

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.summary.byType).toEqual({});
      });
    });

    describe('Branch Name Handling', () => {
      test('should use "working" directory for main branch', async () => {
        setupScenarioFiles(repoPath, 'main', 'feature', { projects: [] }, { projects: [] });

        // The mock setup uses 'working' for main branch
        const result = await comparator.compareBranches('main', 'feature');

        expect(result).toBeDefined();
      });

      test('should use branch name as directory for non-main branches', async () => {
        setupScenarioFiles(repoPath, 'develop', 'feature', { projects: [] }, { projects: [] });

        const result = await comparator.compareBranches('develop', 'feature');

        expect(result).toBeDefined();
      });
    });

    describe('Error Handling', () => {
      test('should return empty differences when base files missing', async () => {
        // Only setup target files
        mockFs.files.set(`${repoPath}/scenarios/feature/projects.json`, JSON.stringify({ data: [createTestProject()] }));
        mockFs.files.set(`${repoPath}/scenarios/feature/people.json`, JSON.stringify({ data: [] }));
        mockFs.files.set(`${repoPath}/scenarios/feature/assignments.json`, JSON.stringify({ data: [] }));
        mockFs.files.set(`${repoPath}/scenarios/feature/project_phases.json`, JSON.stringify({ data: [] }));

        const result = await comparator.compareBranches('main', 'feature');

        // Should still work, treating base as empty
        expect(result.differences).toBeDefined();
      });

      test('should return empty differences when target files missing', async () => {
        // Only setup base files
        mockFs.files.set(`${repoPath}/scenarios/working/projects.json`, JSON.stringify({ data: [createTestProject()] }));
        mockFs.files.set(`${repoPath}/scenarios/working/people.json`, JSON.stringify({ data: [] }));
        mockFs.files.set(`${repoPath}/scenarios/working/assignments.json`, JSON.stringify({ data: [] }));
        mockFs.files.set(`${repoPath}/scenarios/working/project_phases.json`, JSON.stringify({ data: [] }));

        const result = await comparator.compareBranches('main', 'feature');

        expect(result.differences).toBeDefined();
      });
    });
  });

  describe('describeDifference', () => {
    test('should describe added entity', () => {
      const diff = {
        entityType: 'project' as const,
        entityId: '1',
        entityName: 'New Project',
        differenceType: 'added' as const,
      };

      const description = comparator.describeDifference(diff);

      expect(description).toBe('Added: New Project');
    });

    test('should describe removed entity', () => {
      const diff = {
        entityType: 'project' as const,
        entityId: '1',
        entityName: 'Old Project',
        differenceType: 'removed' as const,
      };

      const description = comparator.describeDifference(diff);

      expect(description).toBe('Removed: Old Project');
    });

    test('should describe modified entity with fields', () => {
      const diff = {
        entityType: 'project' as const,
        entityId: '1',
        entityName: 'Test Project',
        differenceType: 'modified' as const,
        modifiedFields: ['name', 'status'],
      };

      const description = comparator.describeDifference(diff);

      expect(description).toBe('Modified: Test Project (name, status)');
    });

    test('should handle unknown difference type', () => {
      const diff = {
        entityType: 'project' as const,
        entityId: '1',
        entityName: 'Test Project',
        differenceType: 'unknown' as any,
      };

      const description = comparator.describeDifference(diff);

      expect(description).toBe('Changed: Test Project');
    });
  });

  describe('Entity Name Extraction', () => {
    test('should extract project name', async () => {
      const baseProjects: any[] = [];
      const targetProjects = [createTestProject({ id: '1', name: 'My Project' })];
      setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

      const result = await comparator.compareBranches('main', 'feature');

      expect(result.differences[0].entityName).toBe('My Project');
    });

    test('should extract person full name', async () => {
      const basePeople: any[] = [];
      const targetPeople = [createTestPerson({ id: '1', first_name: 'John', last_name: 'Doe' })];
      setupScenarioFiles(repoPath, 'main', 'feature', { people: basePeople }, { people: targetPeople });

      const result = await comparator.compareBranches('main', 'feature');

      expect(result.differences[0].entityName).toBe('John Doe');
    });

    test('should handle person with missing name parts', async () => {
      const basePeople: any[] = [];
      const targetPeople = [{ id: '1' }];
      setupScenarioFiles(repoPath, 'main', 'feature', { people: basePeople }, { people: targetPeople });

      const result = await comparator.compareBranches('main', 'feature');

      expect(result.differences[0].entityName).toBe('Unknown Person');
    });

    test('should use Assignment ID for assignment name', async () => {
      const baseAssignments: any[] = [];
      const targetAssignments = [createTestAssignment({ id: 'assign-123' })];
      setupScenarioFiles(repoPath, 'main', 'feature', { assignments: baseAssignments }, { assignments: targetAssignments });

      const result = await comparator.compareBranches('main', 'feature');

      expect(result.differences[0].entityName).toBe('Assignment assign-123');
    });

    test('should extract phase name', async () => {
      const basePhases: any[] = [];
      const targetPhases = [createTestPhase({ id: '1', name: 'Development Phase' })];
      setupScenarioFiles(repoPath, 'main', 'feature', { phases: basePhases }, { phases: targetPhases });

      const result = await comparator.compareBranches('main', 'feature');

      expect(result.differences[0].entityName).toBe('Development Phase');
    });

    test('should handle phase with missing name', async () => {
      const basePhases: any[] = [];
      const targetPhases = [{ id: '1' }];
      setupScenarioFiles(repoPath, 'main', 'feature', { phases: basePhases }, { phases: targetPhases });

      const result = await comparator.compareBranches('main', 'feature');

      expect(result.differences[0].entityName).toBe('Unknown Phase');
    });

    test('should handle project with missing name', async () => {
      const baseProjects: any[] = [];
      const targetProjects = [{ id: '1' }];
      setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

      const result = await comparator.compareBranches('main', 'feature');

      expect(result.differences[0].entityName).toBe('Unknown Project');
    });
  });

  describe('Deep Field Comparison', () => {
    test('should detect nested object changes', async () => {
      const baseProjects = [createTestProject({ id: '1', metadata: { key: 'value1' } })];
      const targetProjects = [createTestProject({ id: '1', metadata: { key: 'value2' } })];
      setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

      const result = await comparator.compareBranches('main', 'feature');

      expect(result.differences[0].modifiedFields).toContain('metadata');
    });

    test('should detect array changes', async () => {
      const baseProjects = [createTestProject({ id: '1', tags: ['a', 'b'] })];
      const targetProjects = [createTestProject({ id: '1', tags: ['a', 'c'] })];
      setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

      const result = await comparator.compareBranches('main', 'feature');

      expect(result.differences[0].modifiedFields).toContain('tags');
    });

    test('should not detect changes when values are equal', async () => {
      const baseProjects = [createTestProject({ id: '1', tags: ['a', 'b'] })];
      const targetProjects = [createTestProject({ id: '1', tags: ['a', 'b'] })];
      setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

      const result = await comparator.compareBranches('main', 'feature');

      expect(result.differences).toHaveLength(0);
    });

    test('should detect new field added', async () => {
      const baseProjects = [createTestProject({ id: '1' })];
      const targetProjects = [createTestProject({ id: '1', newField: 'newValue' })];
      setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

      const result = await comparator.compareBranches('main', 'feature');

      expect(result.differences[0].modifiedFields).toContain('newField');
    });

    test('should detect field removed', async () => {
      const baseProjects = [{ id: '1', name: 'Test', extra: 'field' }];
      const targetProjects = [{ id: '1', name: 'Test' }];
      setupScenarioFiles(repoPath, 'main', 'feature', { projects: baseProjects }, { projects: targetProjects });

      const result = await comparator.compareBranches('main', 'feature');

      expect(result.differences[0].modifiedFields).toContain('extra');
    });
  });
});
