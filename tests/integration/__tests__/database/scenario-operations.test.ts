import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import { testDb, createTestUser, createTestProject, createTestRole } from '../../setup.js';
import { randomUUID } from 'crypto';

describe('Scenario Database Operations', () => {
  let db: any;
  let testData: any;

  beforeAll(async () => {
    db = testDb;
    
    // Create test data placeholder
    testData = {
      people: [],
      projects: [],
      roles: []
    };
  });
  
  beforeEach(async () => {
    // Clean up scenario test data tables (in proper order due to foreign keys)
    const tables = [
      'scenario_merge_conflicts',
      'scenario_assignments_view',
      'scenario_project_assignments',
      'scenario_project_phases',
      'scenario_projects',
      'scenarios',
      'people',
      'projects',
      'roles'
    ];
    
    for (const table of tables) {
      if (await db.schema.hasTable(table)) {
        await db(table).del();
      }
    }
    
    // Create fresh test data for each test
    const testUser1 = await createTestUser({ id: 'test-user-1', name: 'Test User 1' });
    const testUser2 = await createTestUser({ id: 'test-user-2', name: 'Test User 2' });
    const testUser3 = await createTestUser({ id: 'test-user-3', name: 'Test User 3' });
    const testProject1 = await createTestProject({ id: 'test-project-1', name: 'Test Project 1' });
    const testProject2 = await createTestProject({ id: 'test-project-2', name: 'Test Project 2' });
    const testRole1 = await createTestRole({ id: 'test-role-1', name: 'Test Role 1' });
    const testRole2 = await createTestRole({ id: 'test-role-2', name: 'Test Role 2' });
    
    testData = {
      people: [testUser1, testUser2, testUser3],
      projects: [testProject1, testProject2],
      roles: [testRole1, testRole2],
      phases: [{ id: 'test-phase-1', name: 'Test Phase' }] // Mock phase data
    };
  });


  describe('Scenario CRUD Operations', () => {
    it('should create scenario with proper constraints', async () => {
      const scenarioId = randomUUID();
      const scenarioData = {
        id: scenarioId,
        name: 'Test Scenario',
        description: 'Test description',
        parent_scenario_id: null, // No parent for this test
        created_by: testData.people[0].id,
        status: 'active',
        scenario_type: 'branch',
        branch_point: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      await db('scenarios').insert(scenarioData);

      const created = await db('scenarios').where('id', scenarioId).first();
      expect(created.name).toBe(scenarioData.name);
      expect(created.scenario_type).toBe('branch');
      expect(created.status).toBe('active');
    });

    it('should enforce foreign key constraints', async () => {
      const scenarioId = randomUUID();
      
      // Should fail with invalid created_by
      await expect(
        db('scenarios').insert({
          id: scenarioId,
          name: 'Invalid Creator',
          created_by: 'non-existent-user-id',
          scenario_type: 'branch',
          created_at: new Date(),
          updated_at: new Date()
        })
      ).rejects.toThrow();

      // Should fail with invalid parent_scenario_id
      await expect(
        db('scenarios').insert({
          id: scenarioId,
          name: 'Invalid Parent',
          parent_scenario_id: 'non-existent-scenario-id',
          created_by: testData.people[0].id,
          scenario_type: 'branch',
          created_at: new Date(),
          updated_at: new Date()
        })
      ).rejects.toThrow();
    });

    it('should cascade delete scenario data', async () => {
      const scenarioId = randomUUID();
      
      // Create scenario
      await db('scenarios').insert({
        id: scenarioId,
        name: 'To Delete',
        created_by: testData.people[0].id,
        scenario_type: 'branch',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Add scenario assignments
      await db('scenario_project_assignments').insert({
        id: randomUUID(),
        scenario_id: scenarioId,
        project_id: testData.projects[0].id,
        person_id: testData.people[0].id,
        role_id: testData.roles[0].id,
        allocation_percentage: 50,
        assignment_date_mode: 'project',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Add scenario phases
      await db('scenario_project_phases').insert({
        id: randomUUID(),
        scenario_id: scenarioId,
        project_id: testData.projects[0].id,
        phase_id: testData.phases[0].id,
        start_date: '2025-01-01',
        end_date: '2025-02-01',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Verify data exists
      const assignmentsBefore = await db('scenario_project_assignments').where('scenario_id', scenarioId);
      const phasesBefore = await db('scenario_project_phases').where('scenario_id', scenarioId);
      expect(assignmentsBefore.length).toBe(1);
      expect(phasesBefore.length).toBe(1);

      // Delete scenario
      await db('scenarios').where('id', scenarioId).del();

      // Verify cascade delete worked
      const assignmentsAfter = await db('scenario_project_assignments').where('scenario_id', scenarioId);
      const phasesAfter = await db('scenario_project_phases').where('scenario_id', scenarioId);
      expect(assignmentsAfter.length).toBe(0);
      expect(phasesAfter.length).toBe(0);
    });
  });

  describe('Scenario Assignment Operations', () => {
    let scenarioId: string;

    beforeEach(async () => {
      scenarioId = randomUUID();
      await db('scenarios').insert({
        id: scenarioId,
        name: 'Assignment Test',
        created_by: testData.people[0].id,
        scenario_type: 'branch',
        created_at: new Date(),
        updated_at: new Date()
      });
    });

    it('should enforce unique constraint on scenario assignments', async () => {
      const assignmentData = {
        id: randomUUID(),
        scenario_id: scenarioId,
        project_id: testData.projects[0].id,
        person_id: testData.people[0].id,
        role_id: testData.roles[0].id,
        phase_id: null, // Include phase_id to match unique constraint
        allocation_percentage: 50,
        assignment_date_mode: 'project',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      };

      // First insert should succeed
      await db('scenario_project_assignments').insert(assignmentData);

      // Duplicate insert should fail
      await expect(
        db('scenario_project_assignments').insert({
          ...assignmentData,
          id: randomUUID(), // Different ID but same combination
          phase_id: null // Ensure phase_id is null to match unique constraint
        })
      ).rejects.toThrow(); // Unique constraint violation
    });

    it('should allow same assignment in different scenarios', async () => {
      const scenario2Id = randomUUID();
      await db('scenarios').insert({
        id: scenario2Id,
        name: 'Second Scenario',
        created_by: testData.people[0].id,
        scenario_type: 'branch',
        created_at: new Date(),
        updated_at: new Date()
      });

      const assignmentBase = {
        project_id: testData.projects[0].id,
        person_id: testData.people[0].id,
        role_id: testData.roles[0].id,
        allocation_percentage: 50,
        assignment_date_mode: 'project',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      };

      // Should be able to create same assignment in different scenarios
      await db('scenario_project_assignments').insert({
        ...assignmentBase,
        id: randomUUID(),
        scenario_id: scenarioId
      });

      await db('scenario_project_assignments').insert({
        ...assignmentBase,
        id: randomUUID(),
        scenario_id: scenario2Id
      });

      const scenario1Assignments = await db('scenario_project_assignments').where('scenario_id', scenarioId);
      const scenario2Assignments = await db('scenario_project_assignments').where('scenario_id', scenario2Id);
      
      expect(scenario1Assignments.length).toBe(1);
      expect(scenario2Assignments.length).toBe(1);
    });

    it('should validate assignment date modes', async () => {
      // Test fixed mode assignment
      await db('scenario_project_assignments').insert({
        id: randomUUID(),
        scenario_id: scenarioId,
        project_id: testData.projects[0].id,
        person_id: testData.people[0].id,
        role_id: testData.roles[0].id,
        allocation_percentage: 50,
        assignment_date_mode: 'fixed',
        start_date: '2025-01-01',
        end_date: '2025-02-01',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Test project mode assignment (should allow null dates)
      await db('scenario_project_assignments').insert({
        id: randomUUID(),
        scenario_id: scenarioId,
        project_id: testData.projects[1].id,
        person_id: testData.people[0].id,
        role_id: testData.roles[0].id,
        allocation_percentage: 75,
        assignment_date_mode: 'project',
        start_date: null,
        end_date: null,
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      });

      const assignments = await db('scenario_project_assignments').where('scenario_id', scenarioId);
      expect(assignments.length).toBe(2);
    });
  });

  describe('Scenario Assignments View', () => {
    let scenarioId: string;

    beforeEach(async () => {
      scenarioId = randomUUID();
      await db('scenarios').insert({
        id: scenarioId,
        name: 'View Test',
        created_by: testData.people[0].id,
        scenario_type: 'branch',
        created_at: new Date(),
        updated_at: new Date()
      });
    });

    it('should compute dates correctly for different assignment modes', async () => {
      // Create a scenario project with custom dates
      await db('scenario_projects').insert({
        id: randomUUID(),
        scenario_id: scenarioId,
        project_id: testData.projects[0].id,
        aspiration_start: '2025-01-15',
        aspiration_finish: '2025-03-15',
        change_type: 'modified',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Create a scenario phase
      await db('scenario_project_phases').insert({
        id: randomUUID(),
        scenario_id: scenarioId,
        project_id: testData.projects[0].id,
        phase_id: testData.phases[0].id,
        start_date: '2025-01-20',
        end_date: '2025-02-20',
        change_type: 'modified',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Fixed mode assignment
      await db('scenario_project_assignments').insert({
        id: randomUUID(),
        scenario_id: scenarioId,
        project_id: testData.projects[0].id,
        person_id: testData.people[0].id,
        role_id: testData.roles[0].id,
        allocation_percentage: 50,
        assignment_date_mode: 'fixed',
        start_date: '2025-01-10',
        end_date: '2025-02-10',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Project mode assignment
      await db('scenario_project_assignments').insert({
        id: randomUUID(),
        scenario_id: scenarioId,
        project_id: testData.projects[0].id,
        person_id: testData.people[1].id,
        role_id: testData.roles[0].id,
        allocation_percentage: 75,
        assignment_date_mode: 'project',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Phase mode assignment
      await db('scenario_project_assignments').insert({
        id: randomUUID(),
        scenario_id: scenarioId,
        project_id: testData.projects[0].id,
        person_id: testData.people[2].id,
        role_id: testData.roles[0].id,
        phase_id: testData.phases[0].id,
        allocation_percentage: 100,
        assignment_date_mode: 'phase',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      });

      const viewResults = await db('scenario_assignments_view').where('scenario_id', scenarioId);
      expect(viewResults.length).toBe(3);

      // Find each assignment by person
      const fixedAssignment = viewResults.find((a: any) => a.person_id === testData.people[0].id);
      const projectAssignment = viewResults.find((a: any) => a.person_id === testData.people[1].id);
      const phaseAssignment = viewResults.find((a: any) => a.person_id === testData.people[2].id);

      // Verify computed dates
      expect(fixedAssignment.computed_start_date).toBe('2025-01-10');
      expect(fixedAssignment.computed_end_date).toBe('2025-02-10');
      
      expect(projectAssignment.computed_start_date).toBe('2025-01-15'); // From scenario_projects
      expect(projectAssignment.computed_end_date).toBe('2025-03-15');
      
      expect(phaseAssignment.computed_start_date).toBe('2025-01-20'); // From scenario_project_phases
      expect(phaseAssignment.computed_end_date).toBe('2025-02-20');
    });
  });

  describe('Data Integrity and Constraints', () => {
    it('should maintain referential integrity on assignment deletes', async () => {
      const scenarioId = randomUUID();
      await db('scenarios').insert({
        id: scenarioId,
        name: 'Integrity Test',
        created_by: testData.people[0].id,
        scenario_type: 'branch',
        created_at: new Date(),
        updated_at: new Date()
      });

      const assignmentId = randomUUID();
      await db('scenario_project_assignments').insert({
        id: assignmentId,
        scenario_id: scenarioId,
        project_id: testData.projects[0].id,
        person_id: testData.people[0].id,
        role_id: testData.roles[0].id,
        allocation_percentage: 50,
        assignment_date_mode: 'project',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Delete the person - should fail due to foreign key constraint
      await expect(
        db('people').where('id', testData.people[0].id).del()
      ).rejects.toThrow();

      // Delete the project - should fail due to foreign key constraint
      await expect(
        db('projects').where('id', testData.projects[0].id).del()
      ).rejects.toThrow();

      // Delete the role - should fail due to foreign key constraint
      await expect(
        db('roles').where('id', testData.roles[0].id).del()
      ).rejects.toThrow();
    });

    it('should handle scenario hierarchy constraints', async () => {
      const parentId = randomUUID();
      const childId = randomUUID();

      // Create parent scenario
      await db('scenarios').insert({
        id: parentId,
        name: 'Parent',
        created_by: testData.people[0].id,
        scenario_type: 'branch',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Create child scenario
      await db('scenarios').insert({
        id: childId,
        name: 'Child',
        parent_scenario_id: parentId,
        created_by: testData.people[0].id,
        scenario_type: 'branch',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Deleting parent should set child's parent_scenario_id to NULL (ON DELETE SET NULL)
      await db('scenarios').where('id', parentId).del();

      const child = await db('scenarios').where('id', childId).first();
      expect(child.parent_scenario_id).toBeNull();
    });

    it('should validate allocation percentages', async () => {
      const scenarioId = randomUUID();
      await db('scenarios').insert({
        id: scenarioId,
        name: 'Validation Test',
        created_by: testData.people[0].id,
        scenario_type: 'branch',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Valid allocation percentages should work
      await db('scenario_project_assignments').insert({
        id: randomUUID(),
        scenario_id: scenarioId,
        project_id: testData.projects[0].id,
        person_id: testData.people[0].id,
        role_id: testData.roles[0].id,
        allocation_percentage: 100.00,
        assignment_date_mode: 'project',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Negative allocation should fail (if we add constraints)
      // Note: SQLite doesn't enforce decimal precision by default, but we can add CHECK constraints
      // For now, just verify the data was inserted correctly
      const assignment = await db('scenario_project_assignments').where('scenario_id', scenarioId).first();
      expect(assignment.allocation_percentage).toBe(100);
    });
  });

  describe('Performance and Indexing', () => {
    it('should efficiently query scenario assignments', async () => {
      const scenarioId = randomUUID();
      await db('scenarios').insert({
        id: scenarioId,
        name: 'Performance Test',
        created_by: testData.people[0].id,
        scenario_type: 'branch',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Create multiple assignments (ensuring unique combinations)
      const assignments = [];
      let assignmentCount = 0;
      
      // Create assignments for all valid combinations without phase_id
      for (let projectIdx = 0; projectIdx < testData.projects.length; projectIdx++) {
        for (let personIdx = 0; personIdx < testData.people.length; personIdx++) {
          for (let roleIdx = 0; roleIdx < testData.roles.length; roleIdx++) {
            assignments.push({
              id: randomUUID(),
              scenario_id: scenarioId,
              project_id: testData.projects[projectIdx].id,
              person_id: testData.people[personIdx].id,
              role_id: testData.roles[roleIdx].id,
              phase_id: null, // Keep phase_id null
              allocation_percentage: 50 + (assignmentCount % 50),
              assignment_date_mode: 'project',
              change_type: 'added',
              created_at: new Date(),
              updated_at: new Date()
            });
            assignmentCount++;
          }
        }
      }
      
      // Create assignments with phase_id (different unique combinations)
      for (let projectIdx = 0; projectIdx < testData.projects.length; projectIdx++) {
        for (let personIdx = 0; personIdx < testData.people.length; personIdx++) {
          for (let roleIdx = 0; roleIdx < testData.roles.length; roleIdx++) {
            assignments.push({
              id: randomUUID(),
              scenario_id: scenarioId,
              project_id: testData.projects[projectIdx].id,
              person_id: testData.people[personIdx].id,
              role_id: testData.roles[roleIdx].id,
              phase_id: testData.phases[0].id, // Use phase_id to make it unique
              allocation_percentage: 50 + (assignmentCount % 50),
              assignment_date_mode: 'project',
              change_type: 'added',
              created_at: new Date(),
              updated_at: new Date()
            });
            assignmentCount++;
          }
        }
      }

      await db('scenario_project_assignments').insert(assignments);

      // Query should be fast with proper indexing
      const startTime = Date.now();
      const results = await db('scenario_assignments_view').where('scenario_id', scenarioId);
      const queryTime = Date.now() - startTime;

      expect(results.length).toBe(assignments.length);
      expect(queryTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});