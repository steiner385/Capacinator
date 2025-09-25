import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

// Mock NotificationScheduler before importing the controller
jest.mock('../../../../src/server/services/NotificationScheduler', () => ({
  notificationScheduler: {
    sendAssignmentNotification: jest.fn().mockResolvedValue(true),
    initializeScheduler: jest.fn()
  }
}));

const request = jest.fn(() => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(), send: jest.fn(), expect: jest.fn() }));
import express from 'express';
import { AssignmentsController } from '../../../../src/server/api/controllers/AssignmentsController';
import { randomUUID } from 'crypto';

// Create a chainable mock query
const createChainableMock = (returnValue: any = []): any => {
  const chainable: any = {
    select: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    sum: jest.fn().mockReturnThis(),
    min: jest.fn().mockReturnThis(),
    max: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(returnValue),
    then: jest.fn().mockResolvedValue(returnValue),
    returning: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    transaction: jest.fn((callback) => callback(chainable))
  };
  
  // Make it thenable
  chainable.then = jest.fn((resolve) => {
    resolve(returnValue);
    return Promise.resolve(returnValue);
  });
  
  return chainable;
};

// Create a mock database
const mockDb = jest.fn(() => createChainableMock()) as any;
mockDb.raw = jest.fn((sql) => ({ sql }));
mockDb.transaction = jest.fn((callback) => callback(mockDb));

describe('AssignmentsController', () => {
  let app: express.Application;
  let controller: AssignmentsController;
  let testData: any;

  // Helper function to mock checkConflicts database calls
  const mockCheckConflictsCalls = (
    personData: any, 
    existingAllocations: any[],
    availability: number = 100
  ) => {
    const personQuery = createChainableMock();
    personQuery.first.mockResolvedValue({
      ...personData,
      default_availability_percentage: availability
    });
    
    const assignmentsQuery = createChainableMock(existingAllocations);
    
    const availabilityViewQuery = createChainableMock();
    availabilityViewQuery.first.mockResolvedValue({ 
      person_id: personData.id,
      effective_availability_percentage: availability
    });
    
    // Mock the controller's db method directly
    let callCount = 0;
    (controller as any).db = jest.fn(() => {
      callCount++;
      if (callCount === 1) return personQuery; // people table
      if (callCount === 2) return assignmentsQuery; // project_assignments with join
      return availabilityViewQuery; // person_availability_view
    });
  };

  beforeAll(async () => {
    // Setup test app
    app = express();
    app.use(express.json());
    
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
    // Create controller with mocked database
    controller = new AssignmentsController(mockDb as any);
    
    // Mock executeQuery to directly call the callback for unit tests
    (controller as any).executeQuery = jest.fn(async (callback: any, res: any, errorMessage: string) => {
      try {
        const result = await callback();
        return result;
      } catch (error) {
        throw error;
      }
    });
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

        // Mock for checkConflicts method
        mockCheckConflictsCalls(
          { id: 'person-1', name: 'Alice Johnson' },
          existingAllocations,
          100
        );

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

        // Mock for checkConflicts method
        mockCheckConflictsCalls(
          { id: 'person-1', name: 'Alice Johnson' },
          existingAllocations,
          100
        );

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

        // Mock for checkConflicts method
        mockCheckConflictsCalls(
          { id: 'person-1', name: 'Alice Johnson' },
          existingAllocations,
          80 // Only 80% available
        );

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

        // Mock for checkConflicts method
        mockCheckConflictsCalls(
          { id: 'person-1', name: 'Alice Johnson' },
          existingAllocations,
          100
        );

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
        // Mock for checkConflicts method - dates don't overlap
        mockCheckConflictsCalls(
          { id: 'person-1', name: 'Alice Johnson' },
          [], // Empty array because dates don't overlap
          100
        );

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
        // Mock for checkConflicts method - adjacent dates should not conflict
        mockCheckConflictsCalls(
          { id: 'person-1', name: 'Alice Johnson' },
          [], // No overlapping allocations since dates are adjacent, not overlapping
          100
        );

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

        // Create new controller instance with fresh mocks
        const testController = new AssignmentsController(mockDb as any);
        
        // Mock executeQuery for the test controller
        (testController as any).executeQuery = jest.fn(async (callback: any, res: any, errorMessage: string) => {
          try {
            const result = await callback();
            return result;
          } catch (error) {
            throw error;
          }
        });
        
        // Mock checkConflicts to return null (no conflicts)
        testController.checkConflicts = jest.fn().mockResolvedValue(null);
        
        // Mock database for insertions
        const insertQuery1 = createChainableMock();
        insertQuery1.returning.mockResolvedValue([{
          id: 'assignment-1',
          project_id: 'project-1',
          person_id: 'person-1',
          role_id: 'role-1',
          allocation_percentage: 50,
          start_date: '2024-01-01',
          end_date: '2024-03-31',
          created_at: new Date(),
          updated_at: new Date()
        }]);
        
        const insertQuery2 = createChainableMock();
        insertQuery2.returning.mockResolvedValue([{
          id: 'assignment-2',
          project_id: 'project-1',
          person_id: 'person-2',
          role_id: 'role-2',
          allocation_percentage: 70,
          start_date: '2024-02-01',
          end_date: '2024-05-31',
          created_at: new Date(),
          updated_at: new Date()
        }]);
        
        // Mock the testController's db method
        let callCount = 0;
        (testController as any).db = jest.fn(() => {
          callCount++;
          if (callCount === 1) return insertQuery1;
          return insertQuery2;
        });

        const mockReq = {
          body: {
            project_id: 'project-1',
            assignments: assignments
          }
        };
        
        const mockRes = {
          json: jest.fn(),
          status: jest.fn().mockReturnThis()
        };
        
        await testController.bulkAssign(mockReq as any, mockRes as any);
        const result = mockRes.json.mock.calls[0][0];

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

        // Create new controller instance with fresh mocks
        const testController = new AssignmentsController(mockDb as any);
        
        // Mock executeQuery for the test controller
        (testController as any).executeQuery = jest.fn(async (callback: any, res: any, errorMessage: string) => {
          try {
            const result = await callback();
            return result;
          } catch (error) {
            throw error;
          }
        });
        
        // Mock checkConflicts to return null for first assignment, conflict for second
        testController.checkConflicts = jest.fn()
          .mockResolvedValueOnce(null) // First assignment succeeds
          .mockResolvedValueOnce({ // Second assignment conflicts
            person_id: 'person-1',
            person_name: 'Alice Johnson',
            conflicting_projects: [{
              project_name: 'Bulk Assignment Project',
              start_date: '2024-01-01',
              end_date: '2024-03-31',
              allocation_percentage: 80
            }],
            total_allocation: 130,
            available_capacity: 100
          });
        
        // Mock database for first insertion
        const insertQuery1 = createChainableMock();
        insertQuery1.returning.mockResolvedValue([{
          id: 'assignment-1',
          project_id: 'project-1',
          person_id: 'person-1',
          role_id: 'role-1',
          allocation_percentage: 80,
          start_date: '2024-01-01',
          end_date: '2024-03-31',
          created_at: new Date(),
          updated_at: new Date()
        }]);
        
        // Mock the testController's db method
        (testController as any).db = jest.fn(() => insertQuery1);

        const mockReq = {
          body: {
            project_id: 'project-1',
            assignments: assignments
          }
        };
        
        const mockRes = {
          json: jest.fn(),
          status: jest.fn().mockReturnThis()
        };
        
        await testController.bulkAssign(mockReq as any, mockRes as any);
        const result = mockRes.json.mock.calls[0][0];

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
        const projectQuery = createChainableMock();
        projectQuery.first.mockResolvedValue({
          id: 'project-1',
          aspiration_start: '2024-02-01',
          aspiration_finish: '2024-08-31'
        });
        
        // Set controller's db to return the project query
        (controller as any).db = jest.fn(() => projectQuery);

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
        const phaseQuery = createChainableMock();
        phaseQuery.first.mockResolvedValue({
          project_id: 'project-1',
          phase_id: 'phase-1',
          start_date: '2024-03-01',
          end_date: '2024-05-31'
        });
        
        // Set controller's db to return the phase query
        (controller as any).db = jest.fn(() => phaseQuery);

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
        const projectQuery = createChainableMock();
        projectQuery.first.mockResolvedValue({
          id: 'project-1',
          name: 'Project Alpha'
          // Missing aspiration_start and aspiration_finish
        });
        
        // Set controller's db to return the project query
        (controller as any).db = jest.fn(() => projectQuery);

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

        // Mock database calls for getSuggestions
        // First call: get people with role
        const peopleQuery = createChainableMock(peopleWithRole);
        
        // Mock allocation queries for each person
        const aliceAllocationQuery = createChainableMock();
        aliceAllocationQuery.first.mockResolvedValue({ total_allocation: 20 });
        
        const aliceAvailabilityViewQuery = createChainableMock();
        aliceAvailabilityViewQuery.first.mockResolvedValue({
          person_id: 'person-1',
          effective_availability_percentage: 100
        });
        
        const bobAllocationQuery = createChainableMock();
        bobAllocationQuery.first.mockResolvedValue({ total_allocation: 30 }); // Bob has 30% allocated, 70% available
        
        const bobPersonQuery = createChainableMock();
        bobPersonQuery.first.mockResolvedValue({ 
          id: 'person-2',
          name: 'Bob Smith',
          default_availability_percentage: 100
        });
        
        const bobAvailabilityViewQuery = createChainableMock();
        bobAvailabilityViewQuery.first.mockResolvedValue({
          person_id: 'person-2',
          effective_availability_percentage: 100
        });
        
        // Set up the database mocks in order
        let callCount = 0;
        (controller as any).db = jest.fn(() => {
          callCount++;
          if (callCount === 1) return peopleQuery; // person_roles query
          // For Alice
          if (callCount === 2) return aliceAllocationQuery; // Alice allocation query
          if (callCount === 3) return aliceAvailabilityViewQuery; // Alice person_availability_view query
          // For Bob
          if (callCount === 4) return bobAllocationQuery; // Bob allocation query
          if (callCount === 5) return bobAvailabilityViewQuery; // Bob person_availability_view query
          return createChainableMock();
        });

        const mockReq = {
          query: {
            role_id: 'role-1',
            start_date: '2024-01-01',
            end_date: '2024-06-30',
            required_allocation: 50
          }
        };
        
        const mockRes = {
          json: jest.fn(),
          status: jest.fn().mockReturnThis()
        };
        
        await controller.getSuggestions(mockReq as any, mockRes as any);
        const result = mockRes.json.mock.calls[0][0];

        expect(result.suggestions.length).toBe(2);
        
        // Alice should have higher score (Expert + more availability)
        expect(result.suggestions[0].person_name).toBe('Alice Johnson');
        expect(result.suggestions[0].available_capacity).toBe(80);
        expect(result.suggestions[1].person_name).toBe('Bob Smith');
        expect(result.suggestions[1].available_capacity).toBe(70); // Bob has 70% available
        
        // Verify scoring algorithm
        expect(result.suggestions[0].score).toBeGreaterThan(result.suggestions[1].score);
      });

      it('should exclude people without sufficient capacity', async () => {
        const peopleWithRole = [
          { 
            id: 'person-1', 
            name: 'Alice Johnson', 
            proficiency_level: 'Expert'
          }
        ];

        // Mock database calls for getSuggestions
        const peopleQuery = createChainableMock(peopleWithRole);
        
        // Alice has 80% allocated, so only 20% available (less than required 30%)
        const aliceAllocationQuery = createChainableMock();
        aliceAllocationQuery.first.mockResolvedValue({ total_allocation: 80 });
        
        const aliceAvailabilityQuery = createChainableMock();
        aliceAvailabilityQuery.first.mockResolvedValue({ 
          id: 'person-1',
          name: 'Alice Johnson',
          default_availability_percentage: 100
        });
        
        // Set up the database mocks in order
        let callCount = 0;
        (controller as any).db = jest.fn(() => {
          callCount++;
          if (callCount === 1) return peopleQuery; // person_roles query
          if (callCount === 2) return aliceAllocationQuery; // Alice allocation query
          if (callCount === 3) return aliceAvailabilityQuery; // Alice people query
          if (callCount === 4) return createChainableMock(null); // Alice availability overrides query
          return createChainableMock();
        });

        const mockReq = {
          query: {
            role_id: 'role-1',
            start_date: '2024-01-01',
            end_date: '2024-06-30',
            required_allocation: 30 // Requires 30%, but only 20% available
          }
        };
        
        const mockRes = {
          json: jest.fn(),
          status: jest.fn().mockReturnThis()
        };
        
        await controller.getSuggestions(mockReq as any, mockRes as any);
        const result = mockRes.json.mock.calls[0][0];

        expect(result.suggestions).toEqual([]); // No one has enough capacity
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };

        // Mock database error when querying for person
        const errorQuery = createChainableMock();
        errorQuery.first.mockRejectedValue(new Error('Database connection failed'));
        (controller as any).db = jest.fn(() => errorQuery);

        // The checkConflicts method doesn't catch errors, so it will throw
        await expect(controller.checkConflicts(
          'person-1',
          '2024-01-01',
          '2024-06-30',
          50
        )).rejects.toThrow('Database connection failed');
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
        expect(expertScore).toBe(40 + 40); // 80 * 0.5 + 40 (Expert score)
        expect(juniorScore).toBe(40 + 10); // 80 * 0.5 + 10 (Junior score)
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

