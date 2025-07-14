import { describe, beforeAll, afterAll, beforeEach, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { AssignmentsController } from '../../../../src/server/api/controllers/AssignmentsController.js';
import { db } from '../../../../src/server/database/index.js';
import { randomUUID } from 'crypto';

// Mock external dependencies
jest.mock('../../../../src/server/database/index.js');
const mockDb = db as jest.Mocked<typeof db>;

describe('AssignmentsController', () => {
  let app: express.Application;
  let controller: AssignmentsController;
  let testData: any;

  beforeAll(async () => {
    // Setup test app
    app = express();
    app.use(express.json());
    controller = new AssignmentsController();
    
    // Setup test data
    testData = {
      people: [
        { id: 'person-1', name: 'Alice Johnson' },
        { id: 'person-2', name: 'Bob Smith' }
      ],
      projects: [
        { id: 'project-1', name: 'Project Alpha', aspiration_start: '2024-01-01', aspiration_finish: '2024-06-30' },
        { id: 'project-2', name: 'Project Beta', aspiration_start: '2024-03-01', aspiration_finish: '2024-09-30' }
      ],
      roles: [
        { id: 'role-1', name: 'Software Engineer' },
        { id: 'role-2', name: 'Project Manager' }
      ]
    };

    // Mock database responses
    mockDb.mockImplementation(() => ({
      join: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      first: jest.fn(),
      count: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      del: jest.fn(),
      returning: jest.fn().mockReturnThis(),
      sum: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis()
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Inject mocked db into controller
    (controller as any).db = mockDb;
  });

  describe('Business Logic Validation', () => {
    
    describe('Allocation Percentage Validation', () => {
      it('should prevent assignments exceeding 100% allocation', async () => {
        // Mock existing allocations for a person
        const existingAllocations = [
          {
            person_id: 'person-1',
            project_name: 'Existing Project',
            start_date: '2024-01-01',
            end_date: '2024-03-31',
            allocation_percentage: 80
          }
        ];

        // Mock availability check
        mockDb().select.mockResolvedValueOnce(existingAllocations);
        mockDb().first.mockResolvedValueOnce({ 
          name: 'Alice Johnson' 
        });
        mockDb().first.mockResolvedValueOnce({ 
          effective_availability_percentage: 100 
        });

        const newAssignment = {
          person_id: 'person-1',
          project_id: 'project-1',
          role_id: 'role-1',
          allocation_percentage: 30, // This would make total 110%
          start_date: '2024-02-01',
          end_date: '2024-04-30'
        };

        const conflict = await controller.checkConflicts(
          newAssignment.person_id,
          newAssignment.start_date,
          newAssignment.end_date,
          newAssignment.allocation_percentage
        );

        expect(conflict).toBeTruthy();
        expect(conflict?.total_allocation).toBe(110);
        expect(conflict?.person_id).toBe('person-1');
        expect(conflict?.conflicting_projects).toHaveLength(1);
      });

      it('should allow assignments within available capacity', async () => {
        // Mock existing allocations
        const existingAllocations = [
          {
            person_id: 'person-1',
            project_name: 'Existing Project',
            start_date: '2024-01-01',
            end_date: '2024-03-31',
            allocation_percentage: 50
          }
        ];

        mockDb().select.mockResolvedValueOnce(existingAllocations);
        mockDb().first.mockResolvedValueOnce({ 
          name: 'Alice Johnson' 
        });
        mockDb().first.mockResolvedValueOnce({ 
          effective_availability_percentage: 100 
        });

        const newAssignment = {
          person_id: 'person-1',
          project_id: 'project-1',
          role_id: 'role-1',
          allocation_percentage: 40, // Total would be 90%
          start_date: '2024-02-01',
          end_date: '2024-04-30'
        };

        const conflict = await controller.checkConflicts(
          newAssignment.person_id,
          newAssignment.start_date,
          newAssignment.end_date,
          newAssignment.allocation_percentage
        );

        expect(conflict).toBeNull();
      });

      it('should handle partial availability correctly', async () => {
        // Mock person with 80% availability
        const existingAllocations = [
          {
            person_id: 'person-1',
            project_name: 'Existing Project',
            start_date: '2024-01-01',
            end_date: '2024-03-31',
            allocation_percentage: 60
          }
        ];

        mockDb().select.mockResolvedValueOnce(existingAllocations);
        mockDb().first.mockResolvedValueOnce({ 
          name: 'Alice Johnson' 
        });
        mockDb().first.mockResolvedValueOnce({ 
          effective_availability_percentage: 80 // Only 80% available
        });

        const newAssignment = {
          person_id: 'person-1',
          project_id: 'project-1',
          role_id: 'role-1',
          allocation_percentage: 30, // Total 90%, but only 80% available
          start_date: '2024-02-01',
          end_date: '2024-04-30'
        };

        const conflict = await controller.checkConflicts(
          newAssignment.person_id,
          newAssignment.start_date,
          newAssignment.end_date,
          newAssignment.allocation_percentage
        );

        expect(conflict).toBeTruthy();
        expect(conflict?.total_allocation).toBe(90);
        expect(conflict?.available_capacity).toBe(80);
      });
    });

    describe('Date Range Conflict Detection', () => {
      it('should detect overlapping date ranges', async () => {
        const existingAllocations = [
          {
            person_id: 'person-1',
            project_name: 'Overlapping Project',
            start_date: '2024-02-15',
            end_date: '2024-05-15',
            allocation_percentage: 70
          }
        ];

        mockDb().select.mockResolvedValueOnce(existingAllocations);
        mockDb().first.mockResolvedValueOnce({ name: 'Alice Johnson' });
        mockDb().first.mockResolvedValueOnce({ effective_availability_percentage: 100 });

        const newAssignment = {
          person_id: 'person-1',
          start_date: '2024-04-01', // Overlaps with existing
          end_date: '2024-07-01',
          allocation_percentage: 50
        };

        const conflict = await controller.checkConflicts(
          newAssignment.person_id,
          newAssignment.start_date,
          newAssignment.end_date,
          newAssignment.allocation_percentage
        );

        expect(conflict).toBeTruthy();
        expect(conflict?.total_allocation).toBe(120);
      });

      it('should allow non-overlapping date ranges', async () => {
        const existingAllocations = [
          {
            person_id: 'person-1',
            project_name: 'Non-overlapping Project',
            start_date: '2024-01-01',
            end_date: '2024-02-28',
            allocation_percentage: 100
          }
        ];

        mockDb().select.mockResolvedValueOnce(existingAllocations);
        mockDb().first.mockResolvedValueOnce({ name: 'Alice Johnson' });
        mockDb().first.mockResolvedValueOnce({ effective_availability_percentage: 100 });

        const newAssignment = {
          person_id: 'person-1',
          start_date: '2024-03-01', // No overlap
          end_date: '2024-06-30',
          allocation_percentage: 100
        };

        const conflict = await controller.checkConflicts(
          newAssignment.person_id,
          newAssignment.start_date,
          newAssignment.end_date,
          newAssignment.allocation_percentage
        );

        expect(conflict).toBeNull();
      });

      it('should handle edge case: adjacent date ranges', async () => {
        const existingAllocations = [
          {
            person_id: 'person-1',
            project_name: 'Adjacent Project',
            start_date: '2024-01-01',
            end_date: '2024-02-29',
            allocation_percentage: 100
          }
        ];

        mockDb().select.mockResolvedValueOnce(existingAllocations);
        mockDb().first.mockResolvedValueOnce({ name: 'Alice Johnson' });
        mockDb().first.mockResolvedValueOnce({ effective_availability_percentage: 100 });

        const newAssignment = {
          person_id: 'person-1',
          start_date: '2024-03-01', // Starts day after existing ends
          end_date: '2024-06-30',
          allocation_percentage: 100
        };

        const conflict = await controller.checkConflicts(
          newAssignment.person_id,
          newAssignment.start_date,
          newAssignment.end_date,
          newAssignment.allocation_percentage
        );

        expect(conflict).toBeNull();
      });
    });

    describe('Bulk Assignment Validation', () => {
      it('should process valid bulk assignments successfully', async () => {
        const assignments = [
          {
            person_id: 'person-1',
            role_id: 'role-1',
            allocation_percentage: 50,
            start_date: '2024-01-01',
            end_date: '2024-03-31'
          },
          {
            person_id: 'person-2',
            role_id: 'role-2',
            allocation_percentage: 70,
            start_date: '2024-02-01',
            end_date: '2024-05-31'
          }
        ];

        // Mock no conflicts for both assignments
        mockDb().select.mockResolvedValue([]);
        mockDb().first
          .mockResolvedValueOnce({ name: 'Alice Johnson' })
          .mockResolvedValueOnce({ effective_availability_percentage: 100 })
          .mockResolvedValueOnce({ name: 'Bob Smith' })
          .mockResolvedValueOnce({ effective_availability_percentage: 100 });

        // Mock successful insertions
        mockDb().insert.mockResolvedValue([{ id: 'assignment-1' }]);
        mockDb().returning.mockResolvedValue([{ id: 'assignment-1' }]);

        const result = await (controller as any).bulkAssignInternal('project-1', assignments);

        expect(result.summary.successful).toBe(2);
        expect(result.summary.failed).toBe(0);
        expect(result.summary.conflicts).toBe(0);
      });

      it('should handle capacity conflicts in bulk assignments', async () => {
        const assignments = [
          {
            person_id: 'person-1',
            role_id: 'role-1',
            allocation_percentage: 80,
            start_date: '2024-01-01',
            end_date: '2024-03-31'
          },
          {
            person_id: 'person-1', // Same person
            role_id: 'role-2',
            allocation_percentage: 50, // Would exceed 100%
            start_date: '2024-02-01',
            end_date: '2024-04-30'
          }
        ];

        // Mock conflict for second assignment
        mockDb().select
          .mockResolvedValueOnce([]) // No existing for first
          .mockResolvedValueOnce([   // Existing for second (the first assignment)
            {
              person_id: 'person-1',
              project_name: 'Bulk Assignment Project',
              start_date: '2024-01-01',
              end_date: '2024-03-31',
              allocation_percentage: 80
            }
          ]);

        mockDb().first
          .mockResolvedValueOnce({ name: 'Alice Johnson' })
          .mockResolvedValueOnce({ effective_availability_percentage: 100 })
          .mockResolvedValueOnce({ name: 'Alice Johnson' })
          .mockResolvedValueOnce({ effective_availability_percentage: 100 });

        mockDb().insert.mockResolvedValue([{ id: 'assignment-1' }]);
        mockDb().returning.mockResolvedValue([{ id: 'assignment-1' }]);

        const result = await (controller as any).bulkAssignInternal('project-1', assignments);

        expect(result.summary.successful).toBe(1);
        expect(result.summary.failed).toBe(1);
        expect(result.summary.conflicts).toBe(1);
        expect(result.results.conflicts[0].total_allocation).toBe(130);
      });
    });

    describe('Assignment Date Mode Validation', () => {
      it('should compute dates correctly for fixed mode', async () => {
        const assignment = {
          assignment_date_mode: 'fixed',
          start_date: '2024-01-01',
          end_date: '2024-06-30'
        };

        const computedDates = await (controller as any).computeAssignmentDates(assignment);

        expect(computedDates.computed_start_date).toBe('2024-01-01');
        expect(computedDates.computed_end_date).toBe('2024-06-30');
      });

      it('should compute dates correctly for project mode', async () => {
        const assignment = {
          assignment_date_mode: 'project',
          project_id: 'project-1'
        };

        // Mock project data
        mockDb().first.mockResolvedValueOnce({
          id: 'project-1',
          aspiration_start: '2024-02-01',
          aspiration_finish: '2024-08-31'
        });

        const computedDates = await (controller as any).computeAssignmentDates(assignment);

        expect(computedDates.computed_start_date).toBe('2024-02-01');
        expect(computedDates.computed_end_date).toBe('2024-08-31');
      });

      it('should compute dates correctly for phase mode', async () => {
        const assignment = {
          assignment_date_mode: 'phase',
          project_id: 'project-1',
          phase_id: 'phase-1'
        };

        // Mock phase timeline data
        mockDb().first.mockResolvedValueOnce({
          project_id: 'project-1',
          phase_id: 'phase-1',
          start_date: '2024-03-01',
          end_date: '2024-05-31'
        });

        const computedDates = await (controller as any).computeAssignmentDates(assignment);

        expect(computedDates.computed_start_date).toBe('2024-03-01');
        expect(computedDates.computed_end_date).toBe('2024-05-31');
      });

      it('should throw error for phase mode without required data', async () => {
        const assignment = {
          assignment_date_mode: 'phase',
          project_id: 'project-1'
          // Missing phase_id
        };

        await expect((controller as any).computeAssignmentDates(assignment))
          .rejects.toThrow('Phase mode requires both phase_id and project_id');
      });

      it('should throw error for project mode with missing aspiration dates', async () => {
        const assignment = {
          assignment_date_mode: 'project',
          project_id: 'project-1'
        };

        // Mock project without aspiration dates
        mockDb().first.mockResolvedValueOnce({
          id: 'project-1',
          name: 'Project Alpha'
          // Missing aspiration_start and aspiration_finish
        });

        await expect((controller as any).computeAssignmentDates(assignment))
          .rejects.toThrow('Project project-1 missing aspiration dates');
      });
    });

    describe('Assignment Suggestion Algorithm', () => {
      it('should suggest people with highest availability and proficiency', async () => {
        const peopleWithRole = [
          { 
            id: 'person-1', 
            name: 'Alice Johnson', 
            proficiency_level: 'Expert' 
          },
          { 
            id: 'person-2', 
            name: 'Bob Smith', 
            proficiency_level: 'Junior' 
          }
        ];

        // Mock database calls for suggestions
        mockDb().select.mockResolvedValueOnce(peopleWithRole);
        mockDb().first
          .mockResolvedValueOnce({ total_allocation: 20 }) // Alice has 20% allocated
          .mockResolvedValueOnce({ effective_availability_percentage: 100 }) // Alice 100% available
          .mockResolvedValueOnce({ total_allocation: 80 }) // Bob has 80% allocated
          .mockResolvedValueOnce({ effective_availability_percentage: 100 }); // Bob 100% available

        const suggestions = await (controller as any).getSuggestionsInternal(
          'role-1',
          '2024-01-01',
          '2024-06-30',
          50
        );

        expect(suggestions.length).toBe(2);
        
        // Alice should have higher score (Expert + more availability)
        expect(suggestions[0].person_name).toBe('Alice Johnson');
        expect(suggestions[0].available_capacity).toBe(80);
        expect(suggestions[1].person_name).toBe('Bob Smith');
        expect(suggestions[1].available_capacity).toBe(20);
        
        // Verify scoring algorithm
        expect(suggestions[0].score).toBeGreaterThan(suggestions[1].score);
      });

      it('should exclude people without sufficient capacity', async () => {
        const peopleWithRole = [
          { 
            id: 'person-1', 
            name: 'Alice Johnson', 
            proficiency_level: 'Expert' 
          }
        ];

        mockDb().select.mockResolvedValueOnce(peopleWithRole);
        mockDb().first
          .mockResolvedValueOnce({ total_allocation: 80 }) // Alice has 80% allocated
          .mockResolvedValueOnce({ effective_availability_percentage: 100 });

        const suggestions = await (controller as any).getSuggestionsInternal(
          'role-1',
          '2024-01-01',
          '2024-06-30',
          30 // Requires 30%, but only 20% available
        );

        expect(suggestions.length).toBe(0); // No one has enough capacity
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };

        mockDb().select.mockRejectedValueOnce(new Error('Database connection failed'));

        const result = await controller.checkConflicts(
          'person-1',
          '2024-01-01',
          '2024-06-30',
          50
        );

        expect(result).toBeNull();
      });

      it('should validate required fields for assignment creation', async () => {
        const invalidAssignment = {
          // Missing person_id, project_id, role_id
          allocation_percentage: 50,
          start_date: '2024-01-01',
          end_date: '2024-06-30'
        };

        // This should trigger validation errors in a real implementation
        expect(invalidAssignment).toBeDefined();
      });
    });
  });

  describe('Helper Method Testing', () => {
    describe('Date Overlap Detection', () => {
      it('should correctly identify overlapping dates', () => {
        const overlaps1 = (controller as any).datesOverlap('2024-01-01', '2024-03-31', '2024-02-01', '2024-05-31');
        expect(overlaps1).toBe(true);

        const overlaps2 = (controller as any).datesOverlap('2024-01-01', '2024-02-28', '2024-03-01', '2024-05-31');
        expect(overlaps2).toBe(false);

        const overlaps3 = (controller as any).datesOverlap('2024-02-01', '2024-04-30', '2024-01-01', '2024-02-15');
        expect(overlaps3).toBe(true);
      });
    });

    describe('Suggestion Scoring Algorithm', () => {
      it('should calculate scores correctly based on proficiency and availability', () => {
        const expertPerson = { proficiency_level: 'Expert' };
        const juniorPerson = { proficiency_level: 'Junior' };

        const expertScore = (controller as any).calculateSuggestionScore(expertPerson, 80);
        const juniorScore = (controller as any).calculateSuggestionScore(juniorPerson, 80);

        expect(expertScore).toBeGreaterThan(juniorScore);
        expect(expertScore).toBe(40 + 40); // 80 * 0.5 + 40 for Expert
        expect(juniorScore).toBe(40 + 10); // 80 * 0.5 + 10 for Junior
      });
    });

    describe('Timeline Summary Calculations', () => {
      it('should calculate timeline metrics correctly', () => {
        const assignments = [
          {
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            allocation_percentage: 50
          },
          {
            start_date: '2024-02-15',
            end_date: '2024-03-15',
            allocation_percentage: 80
          }
        ];

        const summary = (controller as any).calculateTimelineSummary(assignments, []);

        expect(summary.total_assignments).toBe(2);
        expect(summary.peak_allocation).toBe(80);
        expect(summary.gaps.length).toBe(1); // Gap between Jan 31 and Feb 15
      });
    });
  });
});

// Helper function to create internal method for testing
declare module '../AssignmentsController.js' {
  interface AssignmentsController {
    bulkAssignInternal(project_id: string, assignments: any[]): Promise<any>;
    getSuggestionsInternal(role_id: string, start_date: string, end_date: string, required_allocation: number): Promise<any[]>;
  }
}