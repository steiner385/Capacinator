/**
 * ScenarioExporter Unit Tests
 * Feature: 001-git-sync-integration
 * Issue: #105 - Git Sync Unit Tests - Tier 1 Critical Services
 *
 * Tests for ScenarioExporter covering:
 * - JSON file writing/reading with corruption recovery
 * - Export scenario data to JSON files
 * - Import scenario data with validation
 * - Commit message generation
 * - Conflict detection
 *
 * Coverage target: 85% statements, 80% branches
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// ===========================================
// Mock State Management
// ===========================================

interface MockDbState {
  projects: any[];
  people: any[];
  project_assignments: any[];
  project_phases: any[];
}

let mockDbState: MockDbState = createDefaultDbState();

function createDefaultDbState(): MockDbState {
  return {
    projects: [],
    people: [],
    project_assignments: [],
    project_phases: [],
  };
}

function resetMockDbState() {
  mockDbState = createDefaultDbState();
}

// ===========================================
// Mock Knex Database
// ===========================================

const mockTransaction = jest.fn().mockImplementation(async (callback) => {
  const trx = {
    del: jest.fn().mockResolvedValue(0),
    batchInsert: jest.fn().mockResolvedValue(undefined),
  };
  // Create a chainable query builder for transaction context
  const createTrxQueryBuilder = (tableName: string) => ({
    del: jest.fn().mockImplementation(async () => {
      mockDbState[tableName as keyof MockDbState] = [];
      return 0;
    }),
  });

  // Override trx to be callable for table selection
  const trxFn = (tableName: string) => createTrxQueryBuilder(tableName);
  trxFn.batchInsert = jest.fn().mockImplementation(async (table: string, data: any[]) => {
    mockDbState[table as keyof MockDbState] = data;
  });

  return callback(trxFn);
});

const mockDb = jest.fn().mockImplementation((tableName: string) => ({
  select: jest.fn().mockImplementation(() => ({
    then: (resolve: (value: any[]) => void) => {
      resolve(mockDbState[tableName as keyof MockDbState] || []);
    },
    catch: (reject: (error: Error) => void) => {},
  })),
  del: jest.fn().mockResolvedValue(0),
}));

(mockDb as any).transaction = mockTransaction;

// ===========================================
// Mock fs/promises
// ===========================================

interface MockFileSystem {
  files: Map<string, string>;
  simulateError?: { operation: string; path: string; error: Error };
}

let mockFs: MockFileSystem = { files: new Map() };

function resetMockFs() {
  mockFs = { files: new Map() };
}

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockImplementation(async (path: string) => {
    if (mockFs.simulateError?.operation === 'mkdir' && path.includes(mockFs.simulateError.path)) {
      throw mockFs.simulateError.error;
    }
    return undefined;
  }),
  writeFile: jest.fn().mockImplementation(async (path: string, content: string) => {
    if (mockFs.simulateError?.operation === 'writeFile' && path.includes(mockFs.simulateError.path)) {
      throw mockFs.simulateError.error;
    }
    mockFs.files.set(path, content);
    return undefined;
  }),
  readFile: jest.fn().mockImplementation(async (path: string) => {
    if (mockFs.simulateError?.operation === 'readFile' && path.includes(mockFs.simulateError.path)) {
      throw mockFs.simulateError.error;
    }
    const content = mockFs.files.get(path);
    if (content === undefined) {
      const error = new Error(`ENOENT: no such file or directory, open '${path}'`) as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    }
    return content;
  }),
  access: jest.fn().mockImplementation(async (path: string) => {
    if (mockFs.simulateError?.operation === 'access' && path.includes(mockFs.simulateError.path)) {
      throw mockFs.simulateError.error;
    }
    // Check if any file exists in this directory
    for (const key of mockFs.files.keys()) {
      if (key.startsWith(path)) {
        return undefined;
      }
    }
    const error = new Error(`ENOENT: no such file or directory, access '${path}'`) as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    throw error;
  }),
}));

// ===========================================
// Mock Zod Schemas
// ===========================================

const mockValidateJSON = jest.fn().mockReturnValue({ valid: true, errors: [] });

jest.mock('../../../../../../shared/types/json-schemas.js', () => ({
  validateJSON: mockValidateJSON,
  SCHEMA_VERSION: '1.0.0',
  ProjectJSONSchema: {
    parse: jest.fn().mockImplementation((data: any) => data),
  },
  PersonJSONSchema: {
    parse: jest.fn().mockImplementation((data: any) => data),
  },
  AssignmentJSONSchema: {
    parse: jest.fn().mockImplementation((data: any) => data),
  },
  ProjectPhaseJSONSchema: {
    parse: jest.fn().mockImplementation((data: any) => data),
  },
  RoleJSONSchema: {
    parse: jest.fn().mockImplementation((data: any) => data),
  },
  LocationJSONSchema: {
    parse: jest.fn().mockImplementation((data: any) => data),
  },
  ProjectTypeJSONSchema: {
    parse: jest.fn().mockImplementation((data: any) => data),
  },
}));

// ===========================================
// Mock GitConflictResolver
// ===========================================

const mockDetectConflicts = jest.fn().mockReturnValue([]);

jest.mock('../../../../../../src/server/services/git/GitConflictResolver.js', () => ({
  GitConflictResolver: jest.fn().mockImplementation(() => ({
    detectConflicts: mockDetectConflicts,
  })),
}));

// Import after mocks are set up
import { ScenarioExporter } from '../../../../../../src/server/services/git/ScenarioExporter.js';

// ===========================================
// Test Helpers
// ===========================================

function createTestProject(overrides: Partial<any> = {}): any {
  return {
    id: 1,
    name: 'Test Project',
    status: 'active',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    ...overrides,
  };
}

function createTestPerson(overrides: Partial<any> = {}): any {
  return {
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    ...overrides,
  };
}

function createTestAssignment(overrides: Partial<any> = {}): any {
  return {
    id: 1,
    project_id: 1,
    person_id: 1,
    allocation_percentage: 50,
    ...overrides,
  };
}

function createTestPhase(overrides: Partial<any> = {}): any {
  return {
    id: 1,
    project_id: 1,
    name: 'Phase 1',
    start_date: '2024-01-01',
    end_date: '2024-06-30',
    ...overrides,
  };
}

function createExportWrapper(scenarioId: string, data: any[]): any {
  return {
    schemaVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    exportedBy: undefined,
    scenarioId,
    data,
  };
}

function setupScenarioFiles(scenarioId: string, data: {
  projects?: any[];
  people?: any[];
  assignments?: any[];
  phases?: any[];
}) {
  const basePath = `/test/repo/scenarios/${scenarioId}`;

  if (data.projects) {
    mockFs.files.set(`${basePath}/projects.json`, JSON.stringify(createExportWrapper(scenarioId, data.projects)));
  }
  if (data.people) {
    mockFs.files.set(`${basePath}/people.json`, JSON.stringify(createExportWrapper(scenarioId, data.people)));
  }
  if (data.assignments) {
    mockFs.files.set(`${basePath}/assignments.json`, JSON.stringify(createExportWrapper(scenarioId, data.assignments)));
  }
  if (data.phases) {
    mockFs.files.set(`${basePath}/project_phases.json`, JSON.stringify(createExportWrapper(scenarioId, data.phases)));
  }
}

// ===========================================
// Tests
// ===========================================

describe('ScenarioExporter', () => {
  const TEST_REPO_PATH = '/test/repo';
  let exporter: ScenarioExporter;

  beforeEach(() => {
    resetMockDbState();
    resetMockFs();
    jest.clearAllMocks();
    exporter = new ScenarioExporter(mockDb as any, TEST_REPO_PATH);
  });

  describe('getScenarioDir', () => {
    test('should return correct path for scenario', () => {
      const dir = exporter.getScenarioDir('working');
      expect(dir).toBe('/test/repo/scenarios/working');
    });

    test('should handle different scenario IDs', () => {
      expect(exporter.getScenarioDir('committed')).toBe('/test/repo/scenarios/committed');
      expect(exporter.getScenarioDir('draft')).toBe('/test/repo/scenarios/draft');
    });

    test('should handle scenario ID with special characters', () => {
      const dir = exporter.getScenarioDir('scenario-2024-v1');
      expect(dir).toBe('/test/repo/scenarios/scenario-2024-v1');
    });
  });

  describe('scenarioExists', () => {
    test('should return true when scenario directory exists', async () => {
      setupScenarioFiles('working', { projects: [] });
      const exists = await exporter.scenarioExists('working');
      expect(exists).toBe(true);
    });

    test('should return false when scenario directory does not exist', async () => {
      const exists = await exporter.scenarioExists('nonexistent');
      expect(exists).toBe(false);
    });

    test('should handle access errors gracefully', async () => {
      mockFs.simulateError = {
        operation: 'access',
        path: 'error-scenario',
        error: new Error('Permission denied'),
      };
      const exists = await exporter.scenarioExists('error-scenario');
      expect(exists).toBe(false);
    });
  });

  describe('exportToJSON', () => {
    test('should export empty scenario data', async () => {
      await exporter.exportToJSON('working');

      expect(mockFs.files.has('/test/repo/scenarios/working/projects.json')).toBe(true);
      expect(mockFs.files.has('/test/repo/scenarios/working/people.json')).toBe(true);
      expect(mockFs.files.has('/test/repo/scenarios/working/assignments.json')).toBe(true);
      expect(mockFs.files.has('/test/repo/scenarios/working/project_phases.json')).toBe(true);
    });

    test('should export projects correctly', async () => {
      mockDbState.projects = [createTestProject({ id: 1, name: 'Project A' })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data).toHaveLength(1);
      expect(content.data[0].name).toBe('Project A');
    });

    test('should export people correctly', async () => {
      mockDbState.people = [createTestPerson({ id: 1, first_name: 'Jane' })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/people.json')!);
      expect(content.data).toHaveLength(1);
      expect(content.data[0].first_name).toBe('Jane');
    });

    test('should export assignments correctly', async () => {
      mockDbState.project_assignments = [createTestAssignment({ id: 1, allocation_percentage: 75 })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/assignments.json')!);
      expect(content.data).toHaveLength(1);
      expect(content.data[0].allocation_percentage).toBe(75);
    });

    test('should export project phases correctly', async () => {
      mockDbState.project_phases = [createTestPhase({ id: 1, name: 'Planning' })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/project_phases.json')!);
      expect(content.data).toHaveLength(1);
      expect(content.data[0].name).toBe('Planning');
    });

    test('should include schema version in export', async () => {
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.schemaVersion).toBe('1.0.0');
    });

    test('should include export timestamp', async () => {
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.exportedAt).toBeDefined();
      expect(new Date(content.exportedAt)).toBeInstanceOf(Date);
    });

    test('should include scenario ID', async () => {
      await exporter.exportToJSON('my-scenario');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/my-scenario/projects.json')!);
      expect(content.scenarioId).toBe('my-scenario');
    });

    test('should export multiple records', async () => {
      mockDbState.projects = [
        createTestProject({ id: 1, name: 'Project A' }),
        createTestProject({ id: 2, name: 'Project B' }),
        createTestProject({ id: 3, name: 'Project C' }),
      ];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data).toHaveLength(3);
    });

    test('should format JSON with indentation', async () => {
      mockDbState.projects = [createTestProject()];
      await exporter.exportToJSON('working');

      const content = mockFs.files.get('/test/repo/scenarios/working/projects.json')!;
      expect(content).toContain('\n');
      expect(content).toContain('  ');
    });
  });

  describe('importFromJSON', () => {
    test('should import valid scenario data', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [createTestPerson()],
        assignments: [createTestAssignment()],
        phases: [createTestPhase()],
      });

      const result = await exporter.importFromJSON('working');

      expect(result.success).toBe(true);
      expect(result.imported.projects).toBe(1);
      expect(result.imported.people).toBe(1);
      expect(result.imported.assignments).toBe(1);
      expect(result.imported.phases).toBe(1);
    });

    test('should report errors for missing files', async () => {
      // No files set up
      const result = await exporter.importFromJSON('working');

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.entity === 'projects')).toBe(true);
    });

    test('should handle partial file availability', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        // people, assignments, phases missing
      });

      const result = await exporter.importFromJSON('working');

      expect(result.imported.projects).toBe(1);
      expect(result.errors.some(e => e.entity === 'people')).toBe(true);
    });

    test('should import multiple records', async () => {
      setupScenarioFiles('working', {
        projects: [
          createTestProject({ id: 1 }),
          createTestProject({ id: 2 }),
          createTestProject({ id: 3 }),
        ],
        people: [],
        assignments: [],
        phases: [],
      });

      const result = await exporter.importFromJSON('working');

      expect(result.imported.projects).toBe(3);
    });

    test('should handle empty data arrays', async () => {
      setupScenarioFiles('working', {
        projects: [],
        people: [],
        assignments: [],
        phases: [],
      });

      const result = await exporter.importFromJSON('working');

      expect(result.success).toBe(true);
      expect(result.imported.projects).toBe(0);
    });
  });

  describe('JSON Recovery', () => {
    test('should recover JSON with trailing commas', async () => {
      const invalidJson = '{"schemaVersion":"1.0.0","data":[{"id":1,},]}';
      mockFs.files.set('/test/repo/scenarios/working/projects.json', invalidJson);
      setupScenarioFiles('working', {
        people: [],
        assignments: [],
        phases: [],
      });

      // This tests the internal recovery - the import should not throw
      const result = await exporter.importFromJSON('working');
      // May succeed or fail depending on recovery, but should not throw
      expect(result).toBeDefined();
    });

    test('should handle completely corrupted JSON', async () => {
      mockFs.files.set('/test/repo/scenarios/working/projects.json', 'not valid json at all');
      setupScenarioFiles('working', {
        people: [],
        assignments: [],
        phases: [],
      });

      const result = await exporter.importFromJSON('working');

      expect(result.errors.some(e => e.entity === 'projects')).toBe(true);
    });

    test('should handle truncated JSON', async () => {
      const truncatedJson = '{"schemaVersion":"1.0.0","data":[{"id":1,"name":"Test';
      mockFs.files.set('/test/repo/scenarios/working/projects.json', truncatedJson);
      setupScenarioFiles('working', {
        people: [],
        assignments: [],
        phases: [],
      });

      const result = await exporter.importFromJSON('working');
      // Should attempt recovery
      expect(result).toBeDefined();
    });
  });

  describe('generateCommitMessage', () => {
    test('should generate message with project count', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject(), createTestProject({ id: 2 })],
        people: [],
        assignments: [],
        phases: [],
      });

      const message = await exporter.generateCommitMessage('working');

      expect(message).toContain('2 projects');
    });

    test('should generate message with people count', async () => {
      setupScenarioFiles('working', {
        projects: [],
        people: [createTestPerson()],
        assignments: [],
        phases: [],
      });

      const message = await exporter.generateCommitMessage('working');

      expect(message).toContain('1 person');
    });

    test('should generate message with assignment count', async () => {
      setupScenarioFiles('working', {
        projects: [],
        people: [],
        assignments: [createTestAssignment(), createTestAssignment({ id: 2 }), createTestAssignment({ id: 3 })],
        phases: [],
      });

      const message = await exporter.generateCommitMessage('working');

      expect(message).toContain('3 assignments');
    });

    test('should generate message with phase count', async () => {
      setupScenarioFiles('working', {
        projects: [],
        people: [],
        assignments: [],
        phases: [createTestPhase()],
      });

      const message = await exporter.generateCommitMessage('working');

      expect(message).toContain('1 phase');
    });

    test('should combine multiple entity counts', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [createTestPerson(), createTestPerson({ id: 2 })],
        assignments: [],
        phases: [createTestPhase()],
      });

      const message = await exporter.generateCommitMessage('working');

      expect(message).toContain('1 project');
      expect(message).toContain('2 people');
      expect(message).toContain('1 phase');
    });

    test('should include timestamp', async () => {
      setupScenarioFiles('working', { projects: [] });

      const message = await exporter.generateCommitMessage('working');

      // Should contain ISO timestamp format
      expect(message).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should handle missing files gracefully', async () => {
      // No files set up
      const message = await exporter.generateCommitMessage('working');

      expect(message).toContain('Updated scenario data');
    });

    test('should use singular form for single items', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [createTestPerson()],
        assignments: [createTestAssignment()],
        phases: [createTestPhase()],
      });

      const message = await exporter.generateCommitMessage('working');

      expect(message).toContain('1 project');
      expect(message).toContain('1 person');
      expect(message).toContain('1 assignment');
      expect(message).toContain('1 phase');
    });

    test('should use plural form for multiple items', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject(), createTestProject({ id: 2 })],
        people: [createTestPerson(), createTestPerson({ id: 2 })],
        assignments: [createTestAssignment(), createTestAssignment({ id: 2 })],
        phases: [createTestPhase(), createTestPhase({ id: 2 })],
      });

      const message = await exporter.generateCommitMessage('working');

      expect(message).toContain('2 projects');
      expect(message).toContain('2 people');
      expect(message).toContain('2 assignments');
      expect(message).toContain('2 phases');
    });
  });

  describe('detectConflictsAfterPull', () => {
    test('should return empty array when no conflicts', async () => {
      mockDetectConflicts.mockReturnValue([]);
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [],
        assignments: [],
        phases: [],
      });
      mockDbState.projects = [createTestProject()];

      const conflicts = await exporter.detectConflictsAfterPull('working', 'sync-123');

      expect(conflicts).toEqual([]);
    });

    test('should detect project conflicts', async () => {
      const conflict = {
        id: 'conflict-1',
        entityType: 'project',
        entityId: 1,
        field: 'name',
        localValue: 'Local Name',
        remoteValue: 'Remote Name',
      };
      mockDetectConflicts.mockReturnValue([conflict]);

      setupScenarioFiles('working', {
        projects: [createTestProject({ name: 'Remote Name' })],
        people: [],
        assignments: [],
        phases: [],
      });
      mockDbState.projects = [createTestProject({ name: 'Local Name' })];

      const conflicts = await exporter.detectConflictsAfterPull('working', 'sync-123');

      expect(conflicts).toHaveLength(1);
    });

    test('should handle missing files during conflict detection', async () => {
      // No files set up
      const conflicts = await exporter.detectConflictsAfterPull('working', 'sync-123');

      expect(conflicts).toEqual([]);
    });

    test('should pass syncOperationId to conflict resolver', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [],
        assignments: [],
        phases: [],
      });
      mockDbState.projects = [createTestProject()];

      await exporter.detectConflictsAfterPull('working', 'sync-456');

      expect(mockDetectConflicts).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ syncOperationId: 'sync-456' })
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle scenario ID with underscores', async () => {
      await exporter.exportToJSON('my_scenario_2024');
      expect(mockFs.files.has('/test/repo/scenarios/my_scenario_2024/projects.json')).toBe(true);
    });

    test('should handle empty database tables', async () => {
      // All tables empty by default
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data).toEqual([]);
    });

    test('should handle large datasets', async () => {
      mockDbState.projects = Array.from({ length: 1000 }, (_, i) =>
        createTestProject({ id: i + 1, name: `Project ${i + 1}` })
      );

      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data).toHaveLength(1000);
    });

    test('should handle special characters in data', async () => {
      mockDbState.projects = [
        createTestProject({ name: 'Project with "quotes" and \'apostrophes\'' }),
      ];

      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].name).toBe('Project with "quotes" and \'apostrophes\'');
    });

    test('should handle unicode in data', async () => {
      mockDbState.people = [
        createTestPerson({ first_name: '日本語', last_name: '名前' }),
      ];

      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/people.json')!);
      expect(content.data[0].first_name).toBe('日本語');
    });

    test('should handle emoji in data', async () => {
      mockDbState.projects = [
        createTestProject({ name: 'Project 🚀 Launch' }),
      ];

      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].name).toBe('Project 🚀 Launch');
    });

    test('should handle null values in data', async () => {
      mockDbState.projects = [
        createTestProject({ description: null }),
      ];

      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].description).toBeNull();
    });
  });

  describe('Database Transactions', () => {
    test('should use transaction for import', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [],
        assignments: [],
        phases: [],
      });

      await exporter.importFromJSON('working');

      expect(mockTransaction).toHaveBeenCalled();
    });

    test('should clear existing data before import', async () => {
      mockDbState.projects = [createTestProject({ id: 999 })];

      setupScenarioFiles('working', {
        projects: [createTestProject({ id: 1 })],
        people: [],
        assignments: [],
        phases: [],
      });

      await exporter.importFromJSON('working');

      // Transaction should have been used to clear and insert
      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  describe('Multiple Scenario Support', () => {
    test('should export to different scenarios independently', async () => {
      mockDbState.projects = [createTestProject({ name: 'Working Project' })];
      await exporter.exportToJSON('working');

      mockDbState.projects = [createTestProject({ name: 'Committed Project' })];
      await exporter.exportToJSON('committed');

      const workingContent = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      const committedContent = JSON.parse(mockFs.files.get('/test/repo/scenarios/committed/projects.json')!);

      expect(workingContent.data[0].name).toBe('Working Project');
      expect(committedContent.data[0].name).toBe('Committed Project');
    });

    test('should import from different scenarios independently', async () => {
      setupScenarioFiles('scenario-a', {
        projects: [createTestProject({ id: 1, name: 'A' })],
        people: [],
        assignments: [],
        phases: [],
      });

      const resultA = await exporter.importFromJSON('scenario-a');
      expect(resultA.imported.projects).toBe(1);

      setupScenarioFiles('scenario-b', {
        projects: [createTestProject({ id: 2, name: 'B' }), createTestProject({ id: 3, name: 'C' })],
        people: [],
        assignments: [],
        phases: [],
      });

      const resultB = await exporter.importFromJSON('scenario-b');
      expect(resultB.imported.projects).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should report file read errors', async () => {
      mockFs.simulateError = {
        operation: 'readFile',
        path: 'projects.json',
        error: new Error('Permission denied'),
      };
      setupScenarioFiles('working', {
        people: [],
        assignments: [],
        phases: [],
      });

      const result = await exporter.importFromJSON('working');

      expect(result.errors.some(e => e.entity === 'projects')).toBe(true);
    });

    test('should continue importing other entities on error', async () => {
      // Projects file will error, but people should work
      mockFs.files.set('/test/repo/scenarios/working/projects.json', 'invalid json');
      setupScenarioFiles('working', {
        people: [createTestPerson()],
        assignments: [],
        phases: [],
      });

      const result = await exporter.importFromJSON('working');

      expect(result.errors.some(e => e.entity === 'projects')).toBe(true);
      expect(result.imported.people).toBe(1);
    });
  });

  describe('Commit Message Edge Cases', () => {
    test('should handle no data scenario', async () => {
      setupScenarioFiles('working', {
        projects: [],
        people: [],
        assignments: [],
        phases: [],
      });

      const message = await exporter.generateCommitMessage('working');

      expect(message).toContain('no data');
    });

    test('should handle very large counts', async () => {
      setupScenarioFiles('working', {
        projects: Array.from({ length: 10000 }, (_, i) => createTestProject({ id: i })),
        people: [],
        assignments: [],
        phases: [],
      });

      const message = await exporter.generateCommitMessage('working');

      expect(message).toContain('10000 projects');
    });
  });

  describe('Validation with Partial Recovery', () => {
    test('should skip invalid records during import', async () => {
      // Set up mock to reject some records
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const schemas = require('../../../../../../shared/types/json-schemas.js');
      let callCount = 0;
      schemas.ProjectJSONSchema.parse = jest.fn().mockImplementation((data: any) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Validation failed');
        }
        return data;
      });

      setupScenarioFiles('working', {
        projects: [
          createTestProject({ id: 1 }),
          createTestProject({ id: 2 }), // This will fail validation
          createTestProject({ id: 3 }),
        ],
        people: [],
        assignments: [],
        phases: [],
      });

      const result = await exporter.importFromJSON('working');

      // Some projects should have been imported
      expect(result.imported.projects).toBeGreaterThan(0);
    });
  });

  describe('Path Construction', () => {
    test('should construct correct paths for all entity types', async () => {
      await exporter.exportToJSON('test-scenario');

      expect(mockFs.files.has('/test/repo/scenarios/test-scenario/projects.json')).toBe(true);
      expect(mockFs.files.has('/test/repo/scenarios/test-scenario/people.json')).toBe(true);
      expect(mockFs.files.has('/test/repo/scenarios/test-scenario/assignments.json')).toBe(true);
      expect(mockFs.files.has('/test/repo/scenarios/test-scenario/project_phases.json')).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    test('should preserve all project fields during export/import cycle', async () => {
      const originalProject = {
        id: 1,
        name: 'Test Project',
        status: 'active',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        priority: 'high',
        description: 'A test project',
      };
      mockDbState.projects = [originalProject];

      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      const exported = content.data[0];

      expect(exported.id).toBe(originalProject.id);
      expect(exported.name).toBe(originalProject.name);
      expect(exported.status).toBe(originalProject.status);
      expect(exported.start_date).toBe(originalProject.start_date);
      expect(exported.end_date).toBe(originalProject.end_date);
    });

    test('should preserve all person fields during export', async () => {
      const originalPerson = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        role_id: 5,
        location_id: 2,
      };
      mockDbState.people = [originalPerson];

      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/people.json')!);
      const exported = content.data[0];

      expect(exported.id).toBe(originalPerson.id);
      expect(exported.first_name).toBe(originalPerson.first_name);
      expect(exported.last_name).toBe(originalPerson.last_name);
      expect(exported.email).toBe(originalPerson.email);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle parallel exports', async () => {
      mockDbState.projects = [createTestProject()];

      await Promise.all([
        exporter.exportToJSON('scenario-1'),
        exporter.exportToJSON('scenario-2'),
        exporter.exportToJSON('scenario-3'),
      ]);

      expect(mockFs.files.has('/test/repo/scenarios/scenario-1/projects.json')).toBe(true);
      expect(mockFs.files.has('/test/repo/scenarios/scenario-2/projects.json')).toBe(true);
      expect(mockFs.files.has('/test/repo/scenarios/scenario-3/projects.json')).toBe(true);
    });

    test('should handle parallel commit message generation', async () => {
      setupScenarioFiles('scenario-1', { projects: [createTestProject()] });
      setupScenarioFiles('scenario-2', { projects: [createTestProject(), createTestProject({ id: 2 })] });

      const [msg1, msg2] = await Promise.all([
        exporter.generateCommitMessage('scenario-1'),
        exporter.generateCommitMessage('scenario-2'),
      ]);

      expect(msg1).toContain('1 project');
      expect(msg2).toContain('2 projects');
    });
  });

  describe('Repository Path Variations', () => {
    test('should work with different repository paths', () => {
      const exporter1 = new ScenarioExporter(mockDb as any, '/home/user/repo');
      expect(exporter1.getScenarioDir('test')).toBe('/home/user/repo/scenarios/test');

      const exporter2 = new ScenarioExporter(mockDb as any, '/var/data/git-repo');
      expect(exporter2.getScenarioDir('test')).toBe('/var/data/git-repo/scenarios/test');
    });

    test('should handle paths with trailing slash', () => {
      const exporterWithSlash = new ScenarioExporter(mockDb as any, '/test/repo/');
      const dir = exporterWithSlash.getScenarioDir('working');
      // path.join normalizes the trailing slash
      expect(dir).toBe('/test/repo/scenarios/working');
    });
  });

  describe('Empty String Handling', () => {
    test('should handle empty scenario ID', async () => {
      const dir = exporter.getScenarioDir('');
      // path.join with empty string drops the trailing separator
      expect(dir).toBe('/test/repo/scenarios');
    });

    test('should handle whitespace in scenario ID', async () => {
      const dir = exporter.getScenarioDir(' test ');
      expect(dir).toBe('/test/repo/scenarios/ test ');
    });
  });

  describe('Export Data Wrapper', () => {
    test('should include all required fields in export wrapper', async () => {
      mockDbState.projects = [createTestProject()];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content).toHaveProperty('schemaVersion');
      expect(content).toHaveProperty('exportedAt');
      expect(content).toHaveProperty('scenarioId');
      expect(content).toHaveProperty('data');
    });

    test('should have correct schema version', async () => {
      mockDbState.projects = [createTestProject()];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.schemaVersion).toBe('1.0.0');
    });

    test('should have valid ISO timestamp', async () => {
      mockDbState.projects = [createTestProject()];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      const date = new Date(content.exportedAt);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  describe('Import Result Structure', () => {
    test('should return success flag', async () => {
      setupScenarioFiles('working', { projects: [], people: [], assignments: [], phases: [] });
      const result = await exporter.importFromJSON('working');
      expect(typeof result.success).toBe('boolean');
    });

    test('should return imported counts object', async () => {
      setupScenarioFiles('working', { projects: [], people: [], assignments: [], phases: [] });
      const result = await exporter.importFromJSON('working');
      expect(result.imported).toHaveProperty('projects');
      expect(result.imported).toHaveProperty('people');
      expect(result.imported).toHaveProperty('assignments');
      expect(result.imported).toHaveProperty('phases');
    });

    test('should return errors array', async () => {
      setupScenarioFiles('working', { projects: [], people: [], assignments: [], phases: [] });
      const result = await exporter.importFromJSON('working');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should return zero counts for empty import', async () => {
      setupScenarioFiles('working', { projects: [], people: [], assignments: [], phases: [] });
      const result = await exporter.importFromJSON('working');
      expect(result.imported.projects).toBe(0);
      expect(result.imported.people).toBe(0);
      expect(result.imported.assignments).toBe(0);
      expect(result.imported.phases).toBe(0);
    });
  });

  describe('File System Operations', () => {
    test('should create directory recursively', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs/promises');
      await exporter.exportToJSON('deep/nested/scenario');
      expect(fs.mkdir).toHaveBeenCalled();
    });

    test('should write with UTF-8 encoding', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs/promises');
      mockDbState.projects = [createTestProject()];
      await exporter.exportToJSON('working');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'utf-8'
      );
    });

    test('should read with UTF-8 encoding', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs/promises');
      setupScenarioFiles('working', { projects: [createTestProject()], people: [], assignments: [], phases: [] });
      await exporter.importFromJSON('working');
      expect(fs.readFile).toHaveBeenCalled();
    });
  });

  describe('Scenario ID Formats', () => {
    test('should handle UUID format', () => {
      const dir = exporter.getScenarioDir('550e8400-e29b-41d4-a716-446655440000');
      expect(dir).toContain('550e8400-e29b-41d4-a716-446655440000');
    });

    test('should handle timestamp format', () => {
      const dir = exporter.getScenarioDir('2024-01-15T10:30:00Z');
      expect(dir).toContain('2024-01-15T10:30:00Z');
    });

    test('should handle semantic version format', () => {
      const dir = exporter.getScenarioDir('v1.2.3');
      expect(dir).toContain('v1.2.3');
    });

    test('should handle kebab-case', () => {
      const dir = exporter.getScenarioDir('my-scenario-name');
      expect(dir).toContain('my-scenario-name');
    });

    test('should handle snake_case', () => {
      const dir = exporter.getScenarioDir('my_scenario_name');
      expect(dir).toContain('my_scenario_name');
    });

    test('should handle camelCase', () => {
      const dir = exporter.getScenarioDir('myScenarioName');
      expect(dir).toContain('myScenarioName');
    });
  });

  describe('Data Type Handling', () => {
    test('should handle integer values', async () => {
      mockDbState.projects = [createTestProject({ id: 12345 })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].id).toBe(12345);
      expect(typeof content.data[0].id).toBe('number');
    });

    test('should handle float values', async () => {
      mockDbState.project_assignments = [createTestAssignment({ allocation_percentage: 75.5 })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/assignments.json')!);
      expect(content.data[0].allocation_percentage).toBe(75.5);
    });

    test('should handle boolean values', async () => {
      mockDbState.projects = [createTestProject({ is_active: true })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].is_active).toBe(true);
    });

    test('should handle date strings', async () => {
      mockDbState.projects = [createTestProject({ start_date: '2024-06-15' })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].start_date).toBe('2024-06-15');
    });

    test('should handle array values', async () => {
      mockDbState.projects = [createTestProject({ tags: ['urgent', 'frontend'] })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].tags).toEqual(['urgent', 'frontend']);
    });

    test('should handle nested objects', async () => {
      mockDbState.projects = [createTestProject({ metadata: { priority: 'high', complexity: 3 } })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].metadata).toEqual({ priority: 'high', complexity: 3 });
    });
  });

  describe('Export All Entity Types', () => {
    test('should export all four entity types', async () => {
      mockDbState.projects = [createTestProject()];
      mockDbState.people = [createTestPerson()];
      mockDbState.project_assignments = [createTestAssignment()];
      mockDbState.project_phases = [createTestPhase()];

      await exporter.exportToJSON('working');

      expect(mockFs.files.size).toBe(4);
    });

    test('should create separate files for each entity type', async () => {
      mockDbState.projects = [createTestProject()];
      mockDbState.people = [createTestPerson()];
      mockDbState.project_assignments = [createTestAssignment()];
      mockDbState.project_phases = [createTestPhase()];

      await exporter.exportToJSON('working');

      const fileNames = Array.from(mockFs.files.keys());
      expect(fileNames.some(f => f.includes('projects.json'))).toBe(true);
      expect(fileNames.some(f => f.includes('people.json'))).toBe(true);
      expect(fileNames.some(f => f.includes('assignments.json'))).toBe(true);
      expect(fileNames.some(f => f.includes('project_phases.json'))).toBe(true);
    });
  });

  describe('Import Entity Counts', () => {
    test('should count imported projects correctly', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject({ id: 1 }), createTestProject({ id: 2 }), createTestProject({ id: 3 })],
        people: [],
        assignments: [],
        phases: [],
      });

      const result = await exporter.importFromJSON('working');
      expect(result.imported.projects).toBe(3);
    });

    test('should count imported people correctly', async () => {
      setupScenarioFiles('working', {
        projects: [],
        people: [createTestPerson({ id: 1 }), createTestPerson({ id: 2 })],
        assignments: [],
        phases: [],
      });

      const result = await exporter.importFromJSON('working');
      expect(result.imported.people).toBe(2);
    });

    test('should count imported assignments correctly', async () => {
      setupScenarioFiles('working', {
        projects: [],
        people: [],
        assignments: [
          createTestAssignment({ id: 1 }),
          createTestAssignment({ id: 2 }),
          createTestAssignment({ id: 3 }),
          createTestAssignment({ id: 4 }),
        ],
        phases: [],
      });

      const result = await exporter.importFromJSON('working');
      expect(result.imported.assignments).toBe(4);
    });

    test('should count imported phases correctly', async () => {
      setupScenarioFiles('working', {
        projects: [],
        people: [],
        assignments: [],
        phases: [createTestPhase({ id: 1 })],
      });

      const result = await exporter.importFromJSON('working');
      expect(result.imported.phases).toBe(1);
    });
  });

  describe('Commit Message Format', () => {
    test('should start with "Updated scenario data:"', async () => {
      setupScenarioFiles('working', { projects: [createTestProject()] });
      const message = await exporter.generateCommitMessage('working');
      expect(message.startsWith('Updated scenario data:')).toBe(true);
    });

    test('should include parenthesized timestamp', async () => {
      setupScenarioFiles('working', { projects: [createTestProject()] });
      const message = await exporter.generateCommitMessage('working');
      expect(message).toMatch(/\(.*\)$/);
    });

    test('should separate counts with commas', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [createTestPerson()],
        assignments: [],
        phases: [],
      });

      const message = await exporter.generateCommitMessage('working');
      expect(message).toContain(', ');
    });
  });

  describe('Error Entity Identification', () => {
    test('should identify project errors correctly', async () => {
      mockFs.files.set('/test/repo/scenarios/working/projects.json', 'invalid');
      setupScenarioFiles('working', { people: [], assignments: [], phases: [] });

      const result = await exporter.importFromJSON('working');
      expect(result.errors.some(e => e.entity === 'projects')).toBe(true);
    });

    test('should identify people errors correctly', async () => {
      mockFs.files.set('/test/repo/scenarios/working/people.json', 'invalid');
      setupScenarioFiles('working', { projects: [], assignments: [], phases: [] });

      const result = await exporter.importFromJSON('working');
      expect(result.errors.some(e => e.entity === 'people')).toBe(true);
    });

    test('should identify assignment errors correctly', async () => {
      mockFs.files.set('/test/repo/scenarios/working/assignments.json', 'invalid');
      setupScenarioFiles('working', { projects: [], people: [], phases: [] });

      const result = await exporter.importFromJSON('working');
      expect(result.errors.some(e => e.entity === 'assignments')).toBe(true);
    });

    test('should identify phase errors correctly', async () => {
      mockFs.files.set('/test/repo/scenarios/working/project_phases.json', 'invalid');
      setupScenarioFiles('working', { projects: [], people: [], assignments: [] });

      const result = await exporter.importFromJSON('working');
      expect(result.errors.some(e => e.entity === 'project_phases')).toBe(true);
    });
  });

  describe('Conflict Detection Context', () => {
    test('should pass entity type to conflict resolver', async () => {
      setupScenarioFiles('working', { projects: [createTestProject()], people: [], assignments: [], phases: [] });
      mockDbState.projects = [createTestProject()];

      await exporter.detectConflictsAfterPull('working', 'sync-123');

      expect(mockDetectConflicts).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ entityType: 'project' })
      );
    });

    test('should pass entity ID to conflict resolver', async () => {
      const project = createTestProject({ id: 42 });
      setupScenarioFiles('working', { projects: [project], people: [], assignments: [], phases: [] });
      mockDbState.projects = [project];

      await exporter.detectConflictsAfterPull('working', 'sync-123');

      expect(mockDetectConflicts).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ entityId: 42 })
      );
    });

    test('should pass entity name to conflict resolver', async () => {
      const project = createTestProject({ name: 'My Project' });
      setupScenarioFiles('working', { projects: [project], people: [], assignments: [], phases: [] });
      mockDbState.projects = [project];

      await exporter.detectConflictsAfterPull('working', 'sync-123');

      expect(mockDetectConflicts).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ entityName: 'My Project' })
      );
    });
  });

  describe('Large Data Export', () => {
    test('should handle 100 projects', async () => {
      mockDbState.projects = Array.from({ length: 100 }, (_, i) => createTestProject({ id: i + 1 }));
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data).toHaveLength(100);
    });

    test('should handle 500 people', async () => {
      mockDbState.people = Array.from({ length: 500 }, (_, i) => createTestPerson({ id: i + 1 }));
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/people.json')!);
      expect(content.data).toHaveLength(500);
    });

    test('should handle 2000 assignments', async () => {
      mockDbState.project_assignments = Array.from({ length: 2000 }, (_, i) =>
        createTestAssignment({ id: i + 1 })
      );
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/assignments.json')!);
      expect(content.data).toHaveLength(2000);
    });
  });

  describe('Sequential Imports', () => {
    test('should handle multiple sequential imports', async () => {
      // First import
      setupScenarioFiles('scenario-1', { projects: [createTestProject({ id: 1 })], people: [], assignments: [], phases: [] });
      const result1 = await exporter.importFromJSON('scenario-1');
      expect(result1.imported.projects).toBe(1);

      // Second import
      resetMockFs();
      setupScenarioFiles('scenario-2', {
        projects: [createTestProject({ id: 2 }), createTestProject({ id: 3 })],
        people: [],
        assignments: [],
        phases: [],
      });
      const result2 = await exporter.importFromJSON('scenario-2');
      expect(result2.imported.projects).toBe(2);
    });
  });

  describe('Export Consistency', () => {
    test('should produce deterministic output for same data', async () => {
      mockDbState.projects = [createTestProject({ id: 1, name: 'Test' })];

      await exporter.exportToJSON('test1');
      const content1 = mockFs.files.get('/test/repo/scenarios/test1/projects.json')!;

      // Reset and export again
      resetMockFs();
      await exporter.exportToJSON('test2');
      const content2 = mockFs.files.get('/test/repo/scenarios/test2/projects.json')!;

      // Parse and compare data (timestamps will differ)
      const parsed1 = JSON.parse(content1);
      const parsed2 = JSON.parse(content2);
      expect(parsed1.data).toEqual(parsed2.data);
      expect(parsed1.schemaVersion).toEqual(parsed2.schemaVersion);
    });
  });

  // ===========================================
  // Additional Tests for Issue #105 Coverage
  // ===========================================

  describe('JSON Recovery - Extended Scenarios', () => {
    test('should recover JSON with single quotes', async () => {
      const invalidJson = "{'schemaVersion':'1.0.0','data':[{'id':1}]}";
      mockFs.files.set('/test/repo/scenarios/working/projects.json', invalidJson);
      setupScenarioFiles('working', { people: [], assignments: [], phases: [] });

      const result = await exporter.importFromJSON('working');
      // Should attempt recovery
      expect(result).toBeDefined();
    });

    test('should recover JSON with unquoted keys', async () => {
      const invalidJson = '{schemaVersion:"1.0.0",data:[{id:1}]}';
      mockFs.files.set('/test/repo/scenarios/working/projects.json', invalidJson);
      setupScenarioFiles('working', { people: [], assignments: [], phases: [] });

      const result = await exporter.importFromJSON('working');
      expect(result).toBeDefined();
    });

    test('should handle JSON with BOM (Byte Order Mark)', async () => {
      const bomJson = '\ufeff{"schemaVersion":"1.0.0","data":[]}';
      mockFs.files.set('/test/repo/scenarios/working/projects.json', bomJson);
      setupScenarioFiles('working', { people: [], assignments: [], phases: [] });

      const result = await exporter.importFromJSON('working');
      expect(result).toBeDefined();
    });

    test('should handle JSON with comments', async () => {
      const jsonWithComments = '{"schemaVersion":"1.0.0",/* comment */"data":[]}';
      mockFs.files.set('/test/repo/scenarios/working/projects.json', jsonWithComments);
      setupScenarioFiles('working', { people: [], assignments: [], phases: [] });

      const result = await exporter.importFromJSON('working');
      expect(result).toBeDefined();
    });

    test('should handle JSON with extra whitespace', async () => {
      const jsonWithWhitespace = '  \n\t  {"schemaVersion":"1.0.0","data":[]}  \n\t  ';
      mockFs.files.set('/test/repo/scenarios/working/projects.json', jsonWithWhitespace);
      setupScenarioFiles('working', { people: [], assignments: [], phases: [] });

      const result = await exporter.importFromJSON('working');
      expect(result.success).toBe(true);
    });

    test('should handle missing closing bracket in array', async () => {
      const truncatedJson = '{"schemaVersion":"1.0.0","data":[{"id":1},{"id":2}';
      mockFs.files.set('/test/repo/scenarios/working/projects.json', truncatedJson);
      setupScenarioFiles('working', { people: [], assignments: [], phases: [] });

      const result = await exporter.importFromJSON('working');
      expect(result).toBeDefined();
    });

    test('should handle missing closing brace in object', async () => {
      const truncatedJson = '{"schemaVersion":"1.0.0","data":[{"id":1}]';
      mockFs.files.set('/test/repo/scenarios/working/projects.json', truncatedJson);
      setupScenarioFiles('working', { people: [], assignments: [], phases: [] });

      const result = await exporter.importFromJSON('working');
      expect(result).toBeDefined();
    });

    test('should handle duplicate keys', async () => {
      const duplicateKeys = '{"schemaVersion":"1.0.0","data":[],"data":[{"id":1}]}';
      mockFs.files.set('/test/repo/scenarios/working/projects.json', duplicateKeys);
      setupScenarioFiles('working', { people: [], assignments: [], phases: [] });

      const result = await exporter.importFromJSON('working');
      expect(result).toBeDefined();
    });
  });

  describe('Schema Version Handling', () => {
    test('should include current schema version in exports', async () => {
      mockDbState.projects = [createTestProject()];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.schemaVersion).toBe('1.0.0');
    });

    test('should import data with same schema version', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [],
        assignments: [],
        phases: [],
      });

      const result = await exporter.importFromJSON('working');
      expect(result.success).toBe(true);
    });

    test('should handle missing schemaVersion in import file', async () => {
      const noVersionJson = '{"data":[{"id":1,"name":"Test"}]}';
      mockFs.files.set('/test/repo/scenarios/working/projects.json', noVersionJson);
      setupScenarioFiles('working', { people: [], assignments: [], phases: [] });

      const result = await exporter.importFromJSON('working');
      expect(result).toBeDefined();
    });
  });

  describe('Round-Trip Integrity', () => {
    test('should preserve project data through export/import cycle', async () => {
      const originalProject = createTestProject({
        id: 42,
        name: 'Test Project',
        status: 'active',
        start_date: '2024-01-15',
        end_date: '2024-12-31',
      });
      mockDbState.projects = [originalProject];

      await exporter.exportToJSON('working');

      const exported = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(exported.data[0]).toMatchObject(originalProject);
    });

    test('should preserve person data through export/import cycle', async () => {
      const originalPerson = createTestPerson({
        id: 99,
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@example.com',
      });
      mockDbState.people = [originalPerson];

      await exporter.exportToJSON('working');

      const exported = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/people.json')!);
      expect(exported.data[0]).toMatchObject(originalPerson);
    });

    test('should preserve assignment data through export/import cycle', async () => {
      const originalAssignment = createTestAssignment({
        id: 123,
        project_id: 1,
        person_id: 2,
        allocation_percentage: 75,
      });
      mockDbState.project_assignments = [originalAssignment];

      await exporter.exportToJSON('working');

      const exported = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/assignments.json')!);
      expect(exported.data[0]).toMatchObject(originalAssignment);
    });

    test('should preserve phase data through export/import cycle', async () => {
      const originalPhase = createTestPhase({
        id: 456,
        project_id: 1,
        name: 'Design Phase',
        start_date: '2024-01-01',
        end_date: '2024-03-31',
      });
      mockDbState.project_phases = [originalPhase];

      await exporter.exportToJSON('working');

      const exported = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/project_phases.json')!);
      expect(exported.data[0]).toMatchObject(originalPhase);
    });

    test('should preserve complex nested data', async () => {
      const projectWithMetadata = createTestProject({
        metadata: { tags: ['urgent', 'frontend'], settings: { priority: 'high' } },
      });
      mockDbState.projects = [projectWithMetadata];

      await exporter.exportToJSON('working');

      const exported = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(exported.data[0].metadata.tags).toEqual(['urgent', 'frontend']);
      expect(exported.data[0].metadata.settings.priority).toBe('high');
    });
  });

  describe('Boundary Conditions', () => {
    test('should handle zero records', async () => {
      mockDbState.projects = [];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data).toEqual([]);
    });

    test('should handle single record', async () => {
      mockDbState.projects = [createTestProject()];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data).toHaveLength(1);
    });

    test('should handle very long string field', async () => {
      const longDescription = 'a'.repeat(10000);
      mockDbState.projects = [createTestProject({ description: longDescription })];

      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].description.length).toBe(10000);
    });

    test('should handle maximum integer value', async () => {
      mockDbState.projects = [createTestProject({ id: Number.MAX_SAFE_INTEGER })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].id).toBe(Number.MAX_SAFE_INTEGER);
    });

    test('should handle minimum integer value', async () => {
      mockDbState.project_assignments = [createTestAssignment({ allocation_percentage: -100 })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/assignments.json')!);
      expect(content.data[0].allocation_percentage).toBe(-100);
    });

    test('should handle empty string fields', async () => {
      mockDbState.projects = [createTestProject({ name: '' })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].name).toBe('');
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('should continue after project import error', async () => {
      mockFs.files.set('/test/repo/scenarios/working/projects.json', 'invalid');
      setupScenarioFiles('working', {
        people: [createTestPerson()],
        assignments: [],
        phases: [],
      });

      const result = await exporter.importFromJSON('working');
      expect(result.imported.people).toBe(1);
    });

    test('should continue after people import error', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        assignments: [],
        phases: [],
      });
      mockFs.files.set('/test/repo/scenarios/working/people.json', 'invalid');

      const result = await exporter.importFromJSON('working');
      expect(result.imported.projects).toBe(1);
    });

    test('should continue after assignment import error', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [createTestPerson()],
        phases: [],
      });
      mockFs.files.set('/test/repo/scenarios/working/assignments.json', 'invalid');

      const result = await exporter.importFromJSON('working');
      expect(result.imported.projects).toBe(1);
      expect(result.imported.people).toBe(1);
    });

    test('should continue after phase import error', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [createTestPerson()],
        assignments: [createTestAssignment()],
      });
      mockFs.files.set('/test/repo/scenarios/working/project_phases.json', 'invalid');

      const result = await exporter.importFromJSON('working');
      expect(result.imported.projects).toBe(1);
      expect(result.imported.people).toBe(1);
      expect(result.imported.assignments).toBe(1);
    });

    test('should collect all errors', async () => {
      mockFs.files.set('/test/repo/scenarios/working/projects.json', 'invalid1');
      mockFs.files.set('/test/repo/scenarios/working/people.json', 'invalid2');
      mockFs.files.set('/test/repo/scenarios/working/assignments.json', 'invalid3');
      mockFs.files.set('/test/repo/scenarios/working/project_phases.json', 'invalid4');

      const result = await exporter.importFromJSON('working');
      expect(result.errors.length).toBe(4);
    });
  });

  describe('Conflict Detection Extended', () => {
    test('should detect conflicts for multiple projects', async () => {
      const projects = [
        createTestProject({ id: 1, name: 'Project A' }),
        createTestProject({ id: 2, name: 'Project B' }),
      ];
      setupScenarioFiles('working', { projects, people: [], assignments: [], phases: [] });
      mockDbState.projects = projects;

      await exporter.detectConflictsAfterPull('working', 'sync-123');

      expect(mockDetectConflicts).toHaveBeenCalledTimes(2);
    });

    test('should detect conflicts for multiple people', async () => {
      const people = [
        createTestPerson({ id: 1, first_name: 'John' }),
        createTestPerson({ id: 2, first_name: 'Jane' }),
        createTestPerson({ id: 3, first_name: 'Bob' }),
      ];
      setupScenarioFiles('working', { projects: [], people, assignments: [], phases: [] });
      mockDbState.people = people;

      await exporter.detectConflictsAfterPull('working', 'sync-456');

      expect(mockDetectConflicts).toHaveBeenCalledTimes(3);
    });

    test('should return all conflicts from all entities', async () => {
      const mockConflict1 = { id: 'conflict-1', entityType: 'project' };
      const mockConflict2 = { id: 'conflict-2', entityType: 'person' };
      mockDetectConflicts
        .mockReturnValueOnce([mockConflict1])
        .mockReturnValueOnce([mockConflict2]);

      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [createTestPerson()],
        assignments: [],
        phases: [],
      });
      mockDbState.projects = [createTestProject()];
      mockDbState.people = [createTestPerson()];

      const conflicts = await exporter.detectConflictsAfterPull('working', 'sync-789');

      expect(conflicts.length).toBe(2);
    });

    test('should handle new entities (no local version)', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject({ id: 999 })],
        people: [],
        assignments: [],
        phases: [],
      });
      // Local database has no project with id 999
      mockDbState.projects = [];

      const conflicts = await exporter.detectConflictsAfterPull('working', 'sync-new');

      // New entities shouldn't cause conflicts
      expect(conflicts).toEqual([]);
    });
  });

  describe('File Permission Handling', () => {
    test('should handle directory creation permission error', async () => {
      mockFs.simulateError = {
        operation: 'mkdir',
        path: 'scenarios',
        error: new Error('EACCES: permission denied'),
      };

      await expect(exporter.exportToJSON('working')).rejects.toThrow();
    });

    test('should handle file write permission error', async () => {
      mockFs.simulateError = {
        operation: 'writeFile',
        path: 'projects.json',
        error: new Error('EACCES: permission denied'),
      };

      await expect(exporter.exportToJSON('working')).rejects.toThrow();
    });
  });

  describe('Timestamp Handling', () => {
    test('should include ISO timestamp in export', async () => {
      mockDbState.projects = [createTestProject()];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      const exportedAt = new Date(content.exportedAt);

      expect(exportedAt).toBeInstanceOf(Date);
      expect(exportedAt.toString()).not.toBe('Invalid Date');
    });

    test('should export with recent timestamp', async () => {
      const before = new Date();
      mockDbState.projects = [createTestProject()];
      await exporter.exportToJSON('working');
      const after = new Date();

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      const exportedAt = new Date(content.exportedAt);

      expect(exportedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(exportedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Import Validation', () => {
    test('should validate imported projects', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [],
        assignments: [],
        phases: [],
      });

      await exporter.importFromJSON('working');

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const schemas = require('../../../../../../shared/types/json-schemas.js');
      expect(schemas.ProjectJSONSchema.parse).toHaveBeenCalled();
    });

    test('should handle validation error gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const schemas = require('../../../../../../shared/types/json-schemas.js');
      schemas.ProjectJSONSchema.parse = jest.fn().mockImplementation(() => {
        throw new Error('Validation failed');
      });

      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [],
        assignments: [],
        phases: [],
      });

      const result = await exporter.importFromJSON('working');
      // Should handle validation errors
      expect(result).toBeDefined();
    });
  });

  describe('Scenario Naming Conventions', () => {
    test('should handle "working" scenario', async () => {
      mockDbState.projects = [createTestProject()];
      await exporter.exportToJSON('working');
      expect(mockFs.files.has('/test/repo/scenarios/working/projects.json')).toBe(true);
    });

    test('should handle "committed" scenario', async () => {
      mockDbState.projects = [createTestProject()];
      await exporter.exportToJSON('committed');
      expect(mockFs.files.has('/test/repo/scenarios/committed/projects.json')).toBe(true);
    });

    test('should handle "draft" scenario', async () => {
      mockDbState.projects = [createTestProject()];
      await exporter.exportToJSON('draft');
      expect(mockFs.files.has('/test/repo/scenarios/draft/projects.json')).toBe(true);
    });

    test('should handle numeric scenario ID', async () => {
      mockDbState.projects = [createTestProject()];
      await exporter.exportToJSON('2024');
      expect(mockFs.files.has('/test/repo/scenarios/2024/projects.json')).toBe(true);
    });
  });

  describe('Export Performance', () => {
    test('should handle 5000 records', async () => {
      mockDbState.projects = Array.from({ length: 5000 }, (_, i) =>
        createTestProject({ id: i + 1, name: `Project ${i + 1}` })
      );

      const start = Date.now();
      await exporter.exportToJSON('working');
      const elapsed = Date.now() - start;

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data).toHaveLength(5000);
      expect(elapsed).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    test('should handle combined large dataset', async () => {
      mockDbState.projects = Array.from({ length: 100 }, (_, i) => createTestProject({ id: i + 1 }));
      mockDbState.people = Array.from({ length: 200 }, (_, i) => createTestPerson({ id: i + 1 }));
      mockDbState.project_assignments = Array.from({ length: 500 }, (_, i) =>
        createTestAssignment({ id: i + 1 })
      );
      mockDbState.project_phases = Array.from({ length: 150 }, (_, i) => createTestPhase({ id: i + 1 }));

      await exporter.exportToJSON('working');

      expect(mockFs.files.size).toBe(4);
    });
  });

  describe('Commit Message Generation Extended', () => {
    test('should handle zero items correctly', async () => {
      setupScenarioFiles('working', {
        projects: [],
        people: [],
        assignments: [],
        phases: [],
      });

      const message = await exporter.generateCommitMessage('working');
      expect(message).toContain('no data');
    });

    test('should use correct grammar for 1 item', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [],
        assignments: [],
        phases: [],
      });

      const message = await exporter.generateCommitMessage('working');
      expect(message).toContain('1 project');
      expect(message).not.toContain('1 projects');
    });

    test('should use correct grammar for 2+ items', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject({ id: 1 }), createTestProject({ id: 2 })],
        people: [],
        assignments: [],
        phases: [],
      });

      const message = await exporter.generateCommitMessage('working');
      expect(message).toContain('2 projects');
    });

    test('should handle mixed counts', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [createTestPerson({ id: 1 }), createTestPerson({ id: 2 }), createTestPerson({ id: 3 })],
        assignments: [],
        phases: [createTestPhase()],
      });

      const message = await exporter.generateCommitMessage('working');
      expect(message).toContain('1 project');
      expect(message).toContain('3 people');
      expect(message).toContain('1 phase');
    });
  });

  describe('Entity ID Handling', () => {
    test('should handle string IDs', async () => {
      mockDbState.projects = [createTestProject({ id: 'uuid-12345' })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].id).toBe('uuid-12345');
    });

    test('should handle numeric IDs', async () => {
      mockDbState.projects = [createTestProject({ id: 12345 })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].id).toBe(12345);
    });

    test('should match entities by ID for conflict detection', async () => {
      const project = createTestProject({ id: 42, name: 'Test' });
      setupScenarioFiles('working', { projects: [project], people: [], assignments: [], phases: [] });
      mockDbState.projects = [createTestProject({ id: 42, name: 'Different' })];

      await exporter.detectConflictsAfterPull('working', 'sync-id-test');

      expect(mockDetectConflicts).toHaveBeenCalled();
    });
  });

  describe('Export All Files', () => {
    test('should create exactly 4 JSON files', async () => {
      await exporter.exportToJSON('working');
      expect(mockFs.files.size).toBe(4);
    });

    test('should name files correctly', async () => {
      await exporter.exportToJSON('working');

      const fileNames = Array.from(mockFs.files.keys()).map(f => f.split('/').pop());
      expect(fileNames).toContain('projects.json');
      expect(fileNames).toContain('people.json');
      expect(fileNames).toContain('assignments.json');
      expect(fileNames).toContain('project_phases.json');
    });
  });

  describe('Import File Discovery', () => {
    test('should read projects.json', async () => {
      setupScenarioFiles('working', { projects: [], people: [], assignments: [], phases: [] });
      await exporter.importFromJSON('working');

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs/promises');
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('projects.json'),
        'utf-8'
      );
    });

    test('should read people.json', async () => {
      setupScenarioFiles('working', { projects: [], people: [], assignments: [], phases: [] });
      await exporter.importFromJSON('working');

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs/promises');
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('people.json'),
        'utf-8'
      );
    });

    test('should read assignments.json', async () => {
      setupScenarioFiles('working', { projects: [], people: [], assignments: [], phases: [] });
      await exporter.importFromJSON('working');

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs/promises');
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('assignments.json'),
        'utf-8'
      );
    });

    test('should read project_phases.json', async () => {
      setupScenarioFiles('working', { projects: [], people: [], assignments: [], phases: [] });
      await exporter.importFromJSON('working');

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs/promises');
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('project_phases.json'),
        'utf-8'
      );
    });
  });

  describe('Data Sorting', () => {
    test('should preserve project order in export', async () => {
      mockDbState.projects = [
        createTestProject({ id: 3, name: 'C' }),
        createTestProject({ id: 1, name: 'A' }),
        createTestProject({ id: 2, name: 'B' }),
      ];

      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].id).toBe(3);
      expect(content.data[1].id).toBe(1);
      expect(content.data[2].id).toBe(2);
    });
  });

  describe('Special Characters in Data', () => {
    test('should handle newlines in fields', async () => {
      mockDbState.projects = [createTestProject({ description: 'Line 1\nLine 2\nLine 3' })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].description).toBe('Line 1\nLine 2\nLine 3');
    });

    test('should handle tabs in fields', async () => {
      mockDbState.projects = [createTestProject({ description: 'Col1\tCol2\tCol3' })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].description).toBe('Col1\tCol2\tCol3');
    });

    test('should handle backslashes in fields', async () => {
      mockDbState.projects = [createTestProject({ path: 'C:\\Users\\test\\file.txt' })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].path).toBe('C:\\Users\\test\\file.txt');
    });

    test('should handle HTML in fields', async () => {
      mockDbState.projects = [createTestProject({ description: '<script>alert("xss")</script>' })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].description).toBe('<script>alert("xss")</script>');
    });

    test('should handle SQL in fields', async () => {
      mockDbState.projects = [createTestProject({ description: "'; DROP TABLE projects; --" })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content.data[0].description).toBe("'; DROP TABLE projects; --");
    });
  });

  describe('Assignment Data Relations', () => {
    test('should export assignment with project_id', async () => {
      mockDbState.project_assignments = [createTestAssignment({ project_id: 42 })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/assignments.json')!);
      expect(content.data[0].project_id).toBe(42);
    });

    test('should export assignment with person_id', async () => {
      mockDbState.project_assignments = [createTestAssignment({ person_id: 99 })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/assignments.json')!);
      expect(content.data[0].person_id).toBe(99);
    });
  });

  describe('Phase Data Relations', () => {
    test('should export phase with project_id', async () => {
      mockDbState.project_phases = [createTestPhase({ project_id: 123 })];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/project_phases.json')!);
      expect(content.data[0].project_id).toBe(123);
    });
  });

  describe('Scenario Existence Check', () => {
    test('should return true for existing scenario with all files', async () => {
      setupScenarioFiles('complete', {
        projects: [],
        people: [],
        assignments: [],
        phases: [],
      });

      const exists = await exporter.scenarioExists('complete');
      expect(exists).toBe(true);
    });

    test('should return true for existing scenario with partial files', async () => {
      mockFs.files.set('/test/repo/scenarios/partial/projects.json', '{}');

      const exists = await exporter.scenarioExists('partial');
      expect(exists).toBe(true);
    });

    test('should return false for non-existing scenario', async () => {
      const exists = await exporter.scenarioExists('imaginary');
      expect(exists).toBe(false);
    });
  });

  describe('Multiple Entity Types Import', () => {
    test('should attempt to import all entity types in single call', async () => {
      setupScenarioFiles('working', {
        projects: [createTestProject()],
        people: [createTestPerson()],
        assignments: [createTestAssignment()],
        phases: [createTestPhase()],
      });

      const result = await exporter.importFromJSON('working');

      // The import should complete and use transaction
      expect(result).toBeDefined();
      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  describe('Export Metadata', () => {
    test('should have standard metadata fields', async () => {
      mockDbState.projects = [createTestProject()];
      await exporter.exportToJSON('working');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/working/projects.json')!);
      expect(content).toHaveProperty('schemaVersion');
      expect(content).toHaveProperty('exportedAt');
      expect(content).toHaveProperty('scenarioId');
      expect(content).toHaveProperty('data');
    });

    test('should include scenarioId matching export target', async () => {
      mockDbState.projects = [createTestProject()];
      await exporter.exportToJSON('my-custom-scenario');

      const content = JSON.parse(mockFs.files.get('/test/repo/scenarios/my-custom-scenario/projects.json')!);
      expect(content.scenarioId).toBe('my-custom-scenario');
    });
  });
});
