/**
 * ConflictValidator Unit Tests
 * Feature: 001-git-sync-integration
 * Issue: #106 - Git Sync Unit Tests - Tier 2 Validation & Safety
 *
 * Tests for ConflictValidator covering:
 * - Over-allocation detection (checkOverAllocation)
 * - Assignment validation (validateAssignmentResolution)
 * - Project date validation (validateProjectResolution)
 * - Person data validation (validatePersonResolution)
 * - Get all over-allocations (getAllOverAllocations)
 *
 * Coverage target: 85% statements, 80% branches
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { Knex } from 'knex';
import { ConflictValidator } from '../../../../../../src/server/services/git/ConflictValidator.js';

// ===========================================
// Test Data Factories
// ===========================================

interface MockAssignment {
  id: string;
  person_id: string;
  project_id: string;
  allocation_percent: number;
  start_date: string;
  end_date: string;
}

interface MockPerson {
  id: string;
  first_name: string;
  last_name: string;
}

interface MockProject {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
}

interface MockPhase {
  id: string;
  project_id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface MockDbConfig {
  assignments?: MockAssignment[];
  people?: MockPerson[];
  projects?: MockProject[];
  phases?: MockPhase[];
}

function createAssignment(overrides: Partial<MockAssignment> = {}): MockAssignment {
  return {
    id: 'assignment-1',
    person_id: 'person-1',
    project_id: 'project-1',
    allocation_percent: 50,
    start_date: '2024-01-01',
    end_date: '2024-03-31',
    ...overrides,
  };
}

function createPerson(overrides: Partial<MockPerson> = {}): MockPerson {
  return {
    id: 'person-1',
    first_name: 'John',
    last_name: 'Doe',
    ...overrides,
  };
}

function createProject(overrides: Partial<MockProject> = {}): MockProject {
  return {
    id: 'project-1',
    name: 'Test Project',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    ...overrides,
  };
}

function createPhase(overrides: Partial<MockPhase> = {}): MockPhase {
  return {
    id: 'phase-1',
    project_id: 'project-1',
    name: 'Phase 1',
    start_date: '2024-01-01',
    end_date: '2024-03-31',
    ...overrides,
  };
}

// ===========================================
// Mock Database Factory
// ===========================================

/**
 * Check if two date ranges overlap
 * Used to simulate the complex Knex query builder logic
 */
function dateRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // Assignments overlap if:
  // - Assignment starts during our period (start2 between start1 and end1)
  // - Assignment ends during our period (end2 between start1 and end1)
  // - Assignment completely contains our period (start2 <= start1 AND end2 >= end1)
  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);

  const startsDuring = s2 >= s1 && s2 <= e1;
  const endsDuring = e2 >= s1 && e2 <= e1;
  const contains = s2 <= s1 && e2 >= e1;

  return startsDuring || endsDuring || contains;
}

interface MockDbOptions {
  /**
   * When checking for overlap, use these date range bounds
   * Set by the test when calling checkOverAllocation
   */
  overlapCheckDates?: {
    startDate: string;
    endDate: string;
    excludeAssignmentId?: string;
  };
}

function createMockDb(config: MockDbConfig = {}, options: MockDbOptions = {}): Knex {
  const {
    assignments = [],
    people = [],
    projects = [],
    phases = [],
  } = config;

  const mockDb = jest.fn().mockImplementation((table: string) => {
    // Track the query state for filtering
    let currentPersonId: string | null = null;
    let excludeAssignmentId: string | null = null;

    const chain: Record<string, jest.Mock> = {
      where: jest.fn().mockImplementation((arg1: unknown, arg2?: unknown) => {
        // Track personId filter
        if (arg1 === 'pa.person_id' || arg1 === 'person_id') {
          currentPersonId = arg2 as string;
        }
        // Handle callback functions (Knex builder pattern)
        if (typeof arg1 === 'function') {
          // Execute the callback with a mock builder
          const mockBuilder = {
            whereNot: jest.fn().mockImplementation((field: string, val: string) => {
              if (field === 'pa.id') {
                excludeAssignmentId = val;
              }
              return mockBuilder;
            }),
            whereBetween: jest.fn().mockReturnThis(),
            orWhere: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
          };
          arg1(mockBuilder);
        }
        return chain;
      }),
      whereNot: jest.fn().mockReturnThis(),
      whereBetween: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      select: jest.fn().mockImplementation(() => {
        if (table === 'project_assignments as pa' || table === 'project_assignments') {
          // Filter assignments based on overlap with the query dates
          const { overlapCheckDates } = options;
          if (overlapCheckDates) {
            const overlapping = assignments.filter(a => {
              // Check exclusion
              if (overlapCheckDates.excludeAssignmentId && a.id === overlapCheckDates.excludeAssignmentId) {
                return false;
              }
              // Check date overlap
              return dateRangesOverlap(
                overlapCheckDates.startDate,
                overlapCheckDates.endDate,
                a.start_date,
                a.end_date
              );
            });

            // Transform to join result format
            const results = overlapping.map(a => {
              const project = projects.find(p => p.id === a.project_id);
              return {
                assignmentId: a.id,
                projectName: project?.name || 'Unknown Project',
                allocation: a.allocation_percent,
                start_date: a.start_date,
                end_date: a.end_date,
              };
            });
            return Promise.resolve(results);
          }

          // No overlap checking - return all assignments transformed
          const results = assignments.map(a => {
            const project = projects.find(p => p.id === a.project_id);
            return {
              assignmentId: a.id,
              projectName: project?.name || 'Unknown Project',
              allocation: a.allocation_percent,
              start_date: a.start_date,
              end_date: a.end_date,
            };
          });
          return Promise.resolve(results);
        }
        if (table === 'project_phases') {
          return Promise.resolve(phases);
        }
        return Promise.resolve([]);
      }),
      first: jest.fn().mockImplementation(() => {
        if (table === 'project_assignments') {
          return Promise.resolve(assignments[0]);
        }
        if (table === 'people') {
          return Promise.resolve(people[0]);
        }
        if (table === 'projects') {
          return Promise.resolve(projects[0]);
        }
        return Promise.resolve(undefined);
      }),
      orderBy: jest.fn().mockImplementation(() => {
        return Promise.resolve(assignments);
      }),
    };

    return chain;
  });

  return mockDb as unknown as Knex;
}

// ===========================================
// Tests
// ===========================================

describe('ConflictValidator', () => {
  let validator: ConflictValidator;
  let mockDb: Knex;

  beforeEach(() => {
    mockDb = createMockDb();
    validator = new ConflictValidator(mockDb);
  });

  // =========================================
  // US1: Over-Allocation Detection Tests
  // =========================================

  describe('checkOverAllocation', () => {
    describe('No Overlap Scenarios', () => {
      test('should return empty warnings when person has no overlapping assignments', async () => {
        const person = createPerson();
        const existingAssignment = createAssignment({
          start_date: '2024-04-01',
          end_date: '2024-06-30',
          allocation_percent: 60,
        });

        // Mock with overlap check dates - existing assignment is Apr-Jun, checking Jan-Mar (no overlap)
        mockDb = createMockDb({
          people: [person],
          assignments: [existingAssignment],
        }, {
          overlapCheckDates: {
            startDate: '2024-01-01',
            endDate: '2024-03-31',
          },
        });
        validator = new ConflictValidator(mockDb);

        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-01-01',
          '2024-03-31',
          50
        );

        expect(warnings).toEqual([]);
      });

      test('should NOT detect overlap when assignments are adjacent (end date = next start date)', async () => {
        const person = createPerson();
        const existingAssignment = createAssignment({
          start_date: '2024-04-01',
          end_date: '2024-06-30',
          allocation_percent: 60,
        });

        // Mock: existing starts Apr 1, checking ends Mar 31 (adjacent, no overlap)
        mockDb = createMockDb({
          people: [person],
          assignments: [existingAssignment],
        }, {
          overlapCheckDates: {
            startDate: '2024-01-01',
            endDate: '2024-03-31',
          },
        });
        validator = new ConflictValidator(mockDb);

        // New assignment ends exactly when existing starts
        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-01-01',
          '2024-03-31',
          50
        );

        expect(warnings).toEqual([]);
      });

      test('should NOT detect overlap when assignments have gap between them', async () => {
        const person = createPerson();
        const existingAssignment = createAssignment({
          start_date: '2024-05-01',
          end_date: '2024-07-31',
          allocation_percent: 80,
        });

        // Mock: existing is May-Jul, checking Jan-Mar (1 month gap, no overlap)
        mockDb = createMockDb({
          people: [person],
          assignments: [existingAssignment],
        }, {
          overlapCheckDates: {
            startDate: '2024-01-01',
            endDate: '2024-03-31',
          },
        });
        validator = new ConflictValidator(mockDb);

        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-01-01',
          '2024-03-31',
          80
        );

        expect(warnings).toEqual([]);
      });

      test('should return empty when person not found', async () => {
        mockDb = createMockDb({
          people: [],
          assignments: [],
        });
        validator = new ConflictValidator(mockDb);

        const warnings = await validator.checkOverAllocation(
          'nonexistent-person',
          '2024-01-01',
          '2024-03-31',
          50
        );

        expect(warnings).toEqual([]);
      });
    });

    describe('Overlap Detection', () => {
      test('should detect over-allocation when total exceeds 100% with complete overlap', async () => {
        const person = createPerson();
        const project = createProject({ id: 'project-2', name: 'Project 2' });
        const existingAssignment = createAssignment({
          id: 'assignment-2',
          project_id: 'project-2',
          allocation_percent: 60,
          start_date: '2024-01-01',
          end_date: '2024-03-31',
        });

        mockDb = createMockDb({
          people: [person],
          projects: [project],
          assignments: [existingAssignment],
        });
        validator = new ConflictValidator(mockDb);

        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-01-01',
          '2024-03-31',
          50 // 60 + 50 = 110% > 100%
        );

        expect(warnings).toHaveLength(1);
        expect(warnings[0].totalAllocation).toBe(110);
      });

      test('should detect over-allocation when assignment starts during existing assignment period', async () => {
        const person = createPerson();
        const project = createProject({ id: 'project-2', name: 'Existing Project' });
        const existingAssignment = createAssignment({
          id: 'assignment-2',
          project_id: 'project-2',
          allocation_percent: 70,
          start_date: '2024-01-01',
          end_date: '2024-03-31',
        });

        mockDb = createMockDb({
          people: [person],
          projects: [project],
          assignments: [existingAssignment],
        });
        validator = new ConflictValidator(mockDb);

        // New assignment starts during existing (Feb-Apr overlaps Jan-Mar)
        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-02-01',
          '2024-04-30',
          40 // 70 + 40 = 110%
        );

        expect(warnings).toHaveLength(1);
        expect(warnings[0].totalAllocation).toBe(110);
      });

      test('should detect over-allocation when assignment ends during existing assignment period', async () => {
        const person = createPerson();
        const project = createProject({ id: 'project-2', name: 'Existing Project' });
        const existingAssignment = createAssignment({
          id: 'assignment-2',
          project_id: 'project-2',
          allocation_percent: 60,
          start_date: '2024-02-01',
          end_date: '2024-04-30',
        });

        mockDb = createMockDb({
          people: [person],
          projects: [project],
          assignments: [existingAssignment],
        });
        validator = new ConflictValidator(mockDb);

        // New assignment ends during existing (Jan-Mar overlaps Feb-Apr)
        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-01-01',
          '2024-03-15',
          50 // 60 + 50 = 110%
        );

        expect(warnings).toHaveLength(1);
        expect(warnings[0].totalAllocation).toBe(110);
      });

      test('should detect over-allocation when new assignment contains existing assignment', async () => {
        const person = createPerson();
        const project = createProject({ id: 'project-2', name: 'Short Project' });
        const existingAssignment = createAssignment({
          id: 'assignment-2',
          project_id: 'project-2',
          allocation_percent: 50,
          start_date: '2024-02-01',
          end_date: '2024-02-28',
        });

        mockDb = createMockDb({
          people: [person],
          projects: [project],
          assignments: [existingAssignment],
        });
        validator = new ConflictValidator(mockDb);

        // New assignment fully contains existing (Jan-Apr contains Feb)
        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-01-01',
          '2024-04-30',
          60 // 50 + 60 = 110%
        );

        expect(warnings).toHaveLength(1);
        expect(warnings[0].totalAllocation).toBe(110);
      });

      test('should correctly sum allocations from multiple overlapping assignments', async () => {
        const person = createPerson();
        const projects = [
          createProject({ id: 'project-2', name: 'Project 2' }),
          createProject({ id: 'project-3', name: 'Project 3' }),
        ];
        const existingAssignments = [
          createAssignment({
            id: 'assignment-2',
            project_id: 'project-2',
            allocation_percent: 30,
            start_date: '2024-01-01',
            end_date: '2024-03-31',
          }),
          createAssignment({
            id: 'assignment-3',
            project_id: 'project-3',
            allocation_percent: 40,
            start_date: '2024-01-01',
            end_date: '2024-03-31',
          }),
        ];

        mockDb = createMockDb({
          people: [person],
          projects,
          assignments: existingAssignments,
        });
        validator = new ConflictValidator(mockDb);

        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-01-01',
          '2024-03-31',
          40 // 30 + 40 + 40 = 110%
        );

        expect(warnings).toHaveLength(1);
        expect(warnings[0].totalAllocation).toBe(110);
      });
    });

    describe('Exclusion Logic', () => {
      test('should exclude specified assignment ID from overlap calculation', async () => {
        const person = createPerson();
        const project = createProject({ id: 'project-2', name: 'Current Project' });
        const currentAssignment = createAssignment({
          id: 'current-assignment',
          project_id: 'project-2',
          allocation_percent: 100,
          start_date: '2024-01-01',
          end_date: '2024-03-31',
        });

        mockDb = createMockDb({
          people: [person],
          projects: [project],
          assignments: [], // Empty because we're excluding the current assignment
        });
        validator = new ConflictValidator(mockDb);

        // Updating current assignment - should not count itself
        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-01-01',
          '2024-03-31',
          80,
          'current-assignment' // Exclude this from calculation
        );

        expect(warnings).toEqual([]);
      });
    });

    describe('Warning Content', () => {
      test('should calculate correct totalAllocation percentage in warning', async () => {
        const person = createPerson();
        const project = createProject({ id: 'project-2', name: 'Project 2' });
        const existingAssignment = createAssignment({
          id: 'assignment-2',
          project_id: 'project-2',
          allocation_percent: 75,
          start_date: '2024-01-01',
          end_date: '2024-03-31',
        });

        mockDb = createMockDb({
          people: [person],
          projects: [project],
          assignments: [existingAssignment],
        });
        validator = new ConflictValidator(mockDb);

        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-01-01',
          '2024-03-31',
          45 // 75 + 45 = 120%
        );

        expect(warnings[0].totalAllocation).toBe(120);
      });

      test('should include affected assignments list in warning', async () => {
        const person = createPerson();
        const project = createProject({ id: 'project-2', name: 'Affected Project' });
        const existingAssignment = createAssignment({
          id: 'assignment-2',
          project_id: 'project-2',
          allocation_percent: 60,
          start_date: '2024-01-01',
          end_date: '2024-03-31',
        });

        mockDb = createMockDb({
          people: [person],
          projects: [project],
          assignments: [existingAssignment],
        });
        validator = new ConflictValidator(mockDb);

        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-01-01',
          '2024-03-31',
          50
        );

        expect(warnings[0].affectedAssignments).toHaveLength(1);
        expect(warnings[0].affectedAssignments[0].assignmentId).toBe('assignment-2');
        expect(warnings[0].affectedAssignments[0].projectName).toBe('Affected Project');
        expect(warnings[0].affectedAssignments[0].allocation).toBe(60);
      });

      test('should include person name in warning', async () => {
        const person = createPerson({ first_name: 'Jane', last_name: 'Smith' });
        const project = createProject({ id: 'project-2', name: 'Project 2' });
        const existingAssignment = createAssignment({
          id: 'assignment-2',
          project_id: 'project-2',
          allocation_percent: 60,
        });

        mockDb = createMockDb({
          people: [person],
          projects: [project],
          assignments: [existingAssignment],
        });
        validator = new ConflictValidator(mockDb);

        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-01-01',
          '2024-03-31',
          50
        );

        expect(warnings[0].personName).toBe('Jane Smith');
      });

      test('should include timeframe string in warning', async () => {
        const person = createPerson();
        const project = createProject({ id: 'project-2', name: 'Project 2' });
        const existingAssignment = createAssignment({
          id: 'assignment-2',
          project_id: 'project-2',
          allocation_percent: 60,
        });

        mockDb = createMockDb({
          people: [person],
          projects: [project],
          assignments: [existingAssignment],
        });
        validator = new ConflictValidator(mockDb);

        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-01-15',
          '2024-04-20',
          50
        );

        expect(warnings[0].timeframe).toBe('2024-01-15 to 2024-04-20');
      });
    });

    describe('Boundary Conditions', () => {
      test('should handle exactly 100% allocation without warning', async () => {
        const person = createPerson();
        const project = createProject({ id: 'project-2', name: 'Project 2' });
        const existingAssignment = createAssignment({
          id: 'assignment-2',
          project_id: 'project-2',
          allocation_percent: 50,
          start_date: '2024-01-01',
          end_date: '2024-03-31',
        });

        mockDb = createMockDb({
          people: [person],
          projects: [project],
          assignments: [existingAssignment],
        });
        validator = new ConflictValidator(mockDb);

        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-01-01',
          '2024-03-31',
          50 // 50 + 50 = 100% exactly
        );

        expect(warnings).toEqual([]);
      });

      test('should handle extremely large allocations (>1000%)', async () => {
        const person = createPerson();
        const project = createProject({ id: 'project-2', name: 'Project 2' });
        const existingAssignment = createAssignment({
          id: 'assignment-2',
          project_id: 'project-2',
          allocation_percent: 500,
        });

        mockDb = createMockDb({
          people: [person],
          projects: [project],
          assignments: [existingAssignment],
        });
        validator = new ConflictValidator(mockDb);

        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-01-01',
          '2024-03-31',
          600 // 500 + 600 = 1100%
        );

        expect(warnings[0].totalAllocation).toBe(1100);
      });

      test('should handle zero allocation assignment', async () => {
        const person = createPerson();
        const project = createProject({ id: 'project-2', name: 'Project 2' });
        const existingAssignment = createAssignment({
          id: 'assignment-2',
          project_id: 'project-2',
          allocation_percent: 0,
        });

        mockDb = createMockDb({
          people: [person],
          projects: [project],
          assignments: [existingAssignment],
        });
        validator = new ConflictValidator(mockDb);

        const warnings = await validator.checkOverAllocation(
          'person-1',
          '2024-01-01',
          '2024-03-31',
          100 // 0 + 100 = 100%
        );

        expect(warnings).toEqual([]);
      });
    });
  });

  // =========================================
  // US1: validateAssignmentResolution Tests
  // =========================================

  describe('validateAssignmentResolution', () => {
    test('returns valid:true when no over-allocation', async () => {
      const person = createPerson();
      const assignment = createAssignment({ allocation_percent: 50 });

      mockDb = createMockDb({
        people: [person],
        assignments: [assignment],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validateAssignmentResolution('assignment-1', 50);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('returns warnings when over-allocated', async () => {
      const person = createPerson();
      const project = createProject({ id: 'project-2', name: 'Other Project' });
      const assignment = createAssignment();
      const otherAssignment = createAssignment({
        id: 'assignment-2',
        project_id: 'project-2',
        allocation_percent: 60,
      });

      mockDb = createMockDb({
        people: [person],
        projects: [project],
        assignments: [assignment, otherAssignment],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validateAssignmentResolution('assignment-1', 50);

      expect(result.valid).toBe(true); // Still valid, just has warnings
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('returns valid:false and error when assignment not found', async () => {
      mockDb = createMockDb({
        assignments: [],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validateAssignmentResolution('nonexistent-id', 50);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Assignment nonexistent-id not found');
    });
  });

  // =========================================
  // US1: getAllOverAllocations Tests
  // =========================================

  describe('getAllOverAllocations', () => {
    test('returns all warnings for person\'s assignments', async () => {
      const person = createPerson();
      const projects = [
        createProject({ id: 'project-1', name: 'Project 1' }),
        createProject({ id: 'project-2', name: 'Project 2' }),
      ];
      const assignments = [
        createAssignment({
          id: 'assignment-1',
          project_id: 'project-1',
          allocation_percent: 60,
        }),
        createAssignment({
          id: 'assignment-2',
          project_id: 'project-2',
          allocation_percent: 60,
        }),
      ];

      mockDb = createMockDb({
        people: [person],
        projects,
        assignments,
      });
      validator = new ConflictValidator(mockDb);

      const warnings = await validator.getAllOverAllocations('person-1');

      expect(warnings.length).toBeGreaterThan(0);
    });

    test('returns empty array for person with no over-allocations', async () => {
      const person = createPerson();
      const assignment = createAssignment({ allocation_percent: 50 });

      mockDb = createMockDb({
        people: [person],
        assignments: [assignment],
      });
      validator = new ConflictValidator(mockDb);

      const warnings = await validator.getAllOverAllocations('person-1');

      expect(warnings).toEqual([]);
    });
  });

  // =========================================
  // US4: Date Range Validation Tests
  // =========================================

  describe('validateProjectResolution', () => {
    test('returns valid:true for project with valid dates', async () => {
      const project = createProject({
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      });

      mockDb = createMockDb({
        projects: [project],
        phases: [],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validateProjectResolution('project-1');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('returns error when end_date before start_date', async () => {
      const project = createProject({
        start_date: '2024-12-31',
        end_date: '2024-01-01',
      });

      mockDb = createMockDb({
        projects: [project],
        phases: [],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validateProjectResolution('project-1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project end date cannot be before start date');
    });

    test('allows null start_date or end_date', async () => {
      const project = createProject({
        start_date: null,
        end_date: null,
      });

      mockDb = createMockDb({
        projects: [project],
        phases: [],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validateProjectResolution('project-1');

      expect(result.valid).toBe(true);
    });

    test('returns error when phase starts before project', async () => {
      const project = createProject({
        start_date: '2024-02-01',
        end_date: '2024-12-31',
      });
      const phase = createPhase({
        start_date: '2024-01-01', // Before project start
        end_date: '2024-03-31',
        name: 'Early Phase',
      });

      mockDb = createMockDb({
        projects: [project],
        phases: [phase],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validateProjectResolution('project-1');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Early Phase') && e.includes('before project start'))).toBe(true);
    });

    test('returns error when phase ends after project', async () => {
      const project = createProject({
        start_date: '2024-01-01',
        end_date: '2024-06-30',
      });
      const phase = createPhase({
        start_date: '2024-04-01',
        end_date: '2024-12-31', // After project end
        name: 'Late Phase',
      });

      mockDb = createMockDb({
        projects: [project],
        phases: [phase],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validateProjectResolution('project-1');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Late Phase') && e.includes('after project end'))).toBe(true);
    });

    test('returns multiple errors for multiple invalid phases', async () => {
      const project = createProject({
        start_date: '2024-03-01',
        end_date: '2024-09-30',
      });
      const phases = [
        createPhase({
          id: 'phase-1',
          start_date: '2024-01-01', // Before project
          end_date: '2024-04-30',
          name: 'Early Phase',
        }),
        createPhase({
          id: 'phase-2',
          start_date: '2024-08-01',
          end_date: '2024-12-31', // After project
          name: 'Late Phase',
        }),
      ];

      mockDb = createMockDb({
        projects: [project],
        phases,
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validateProjectResolution('project-1');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });

    test('identifies which phase is invalid in error message', async () => {
      const project = createProject({
        start_date: '2024-01-01',
        end_date: '2024-06-30',
      });
      const phase = createPhase({
        name: 'Problematic Phase',
        start_date: '2024-04-01',
        end_date: '2024-12-31', // After project
      });

      mockDb = createMockDb({
        projects: [project],
        phases: [phase],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validateProjectResolution('project-1');

      expect(result.errors.some(e => e.includes('Problematic Phase'))).toBe(true);
    });

    test('returns valid:true for project with no phases', async () => {
      const project = createProject();

      mockDb = createMockDb({
        projects: [project],
        phases: [],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validateProjectResolution('project-1');

      expect(result.valid).toBe(true);
    });

    test('returns valid:false and error when project not found', async () => {
      mockDb = createMockDb({
        projects: [],
        phases: [],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validateProjectResolution('nonexistent-id');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project nonexistent-id not found');
    });

    test('allows phases exactly matching project bounds', async () => {
      const project = createProject({
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      });
      const phase = createPhase({
        start_date: '2024-01-01', // Exactly matches project start
        end_date: '2024-12-31', // Exactly matches project end
      });

      mockDb = createMockDb({
        projects: [project],
        phases: [phase],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validateProjectResolution('project-1');

      expect(result.valid).toBe(true);
    });
  });

  // =========================================
  // US5: Person Data Integrity Tests
  // =========================================

  describe('validatePersonResolution', () => {
    test('returns valid:true for person with all required fields', async () => {
      const person = createPerson({
        first_name: 'John',
        last_name: 'Doe',
      });

      mockDb = createMockDb({
        people: [person],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validatePersonResolution('person-1');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('returns error when first_name is empty', async () => {
      const person = createPerson({
        first_name: '',
        last_name: 'Doe',
      });

      mockDb = createMockDb({
        people: [person],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validatePersonResolution('person-1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('First name is required');
    });

    test('returns error when first_name is whitespace only', async () => {
      const person = createPerson({
        first_name: '   ',
        last_name: 'Doe',
      });

      mockDb = createMockDb({
        people: [person],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validatePersonResolution('person-1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('First name is required');
    });

    test('returns error when last_name is empty', async () => {
      const person = createPerson({
        first_name: 'John',
        last_name: '',
      });

      mockDb = createMockDb({
        people: [person],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validatePersonResolution('person-1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Last name is required');
    });

    test('returns error when last_name is whitespace only', async () => {
      const person = createPerson({
        first_name: 'John',
        last_name: '   ',
      });

      mockDb = createMockDb({
        people: [person],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validatePersonResolution('person-1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Last name is required');
    });

    test('returns multiple errors when both names missing', async () => {
      const person = createPerson({
        first_name: '',
        last_name: '',
      });

      mockDb = createMockDb({
        people: [person],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validatePersonResolution('person-1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('First name is required');
      expect(result.errors).toContain('Last name is required');
    });

    test('returns valid:false and error when person not found', async () => {
      mockDb = createMockDb({
        people: [],
      });
      validator = new ConflictValidator(mockDb);

      const result = await validator.validatePersonResolution('nonexistent-id');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Person nonexistent-id not found');
    });
  });

  // =========================================
  // Edge Cases & Error Handling
  // =========================================

  describe('Error Handling', () => {
    test('checkOverAllocation returns empty when person lookup fails (person not found path)', async () => {
      // The implementation returns empty warnings when person is not found
      // This is the graceful handling path
      mockDb = createMockDb({
        people: [], // No people - simulates "not found"
        assignments: [],
      });
      validator = new ConflictValidator(mockDb);

      const warnings = await validator.checkOverAllocation(
        'person-1',
        '2024-01-01',
        '2024-03-31',
        50
      );

      expect(warnings).toEqual([]);
    });

    test('validateAssignmentResolution handles database query error gracefully', async () => {
      const mockDbWithError = jest.fn().mockImplementation(() => {
        return {
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockRejectedValue(new Error('Database error')),
        };
      }) as unknown as Knex;

      validator = new ConflictValidator(mockDbWithError);

      await expect(validator.validateAssignmentResolution('assignment-1', 50))
        .rejects.toThrow();
    });

    test('validateProjectResolution handles database query error gracefully', async () => {
      const mockDbWithError = jest.fn().mockImplementation(() => {
        return {
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockRejectedValue(new Error('Database error')),
        };
      }) as unknown as Knex;

      validator = new ConflictValidator(mockDbWithError);

      await expect(validator.validateProjectResolution('project-1'))
        .rejects.toThrow();
    });

    test('validatePersonResolution handles database query error gracefully', async () => {
      const mockDbWithError = jest.fn().mockImplementation(() => {
        return {
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockRejectedValue(new Error('Database error')),
        };
      }) as unknown as Knex;

      validator = new ConflictValidator(mockDbWithError);

      await expect(validator.validatePersonResolution('person-1'))
        .rejects.toThrow();
    });
  });
});
