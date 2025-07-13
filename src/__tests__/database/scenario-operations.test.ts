import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import { setupTestDatabase, cleanupTestDatabase, getTestDb } from '../../test-helpers/database.js';
import { createTestData } from '../../test-helpers/data.js';
import { randomUUID } from 'crypto';

describe('Scenario Database Operations', () => {
  let db: any;
  let testData: any;

  beforeAll(async () => {
    await setupTestDatabase();
    db = getTestDb();
    testData = await createTestData();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clean scenario-specific test data between tests
    await db('scenario_merge_conflicts').del();
    await db('scenario_project_assignments').del();
    await db('scenario_project_phases').del();
    await db('scenario_projects').del();
    await db('scenarios').where('scenario_type', '!=', 'baseline').del();
  });

  describe('Scenario CRUD Operations', () => {
    it('should create scenario with proper constraints', async () => {
      const scenarioId = randomUUID();
      const scenarioData = {
        id: scenarioId,
        name: 'Test Scenario',
        description: 'Test description',
        parent_scenario_id: 'baseline-0000-0000-0000-000000000000',
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
          id: randomUUID() // Different ID but same combination
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

      // Create multiple assignments
      const assignments = [];
      for (let i = 0; i < 100; i++) {
        assignments.push({
          id: randomUUID(),
          scenario_id: scenarioId,
          project_id: testData.projects[i % testData.projects.length].id,
          person_id: testData.people[i % testData.people.length].id,
          role_id: testData.roles[i % testData.roles.length].id,
          allocation_percentage: 50 + (i % 50),
          assignment_date_mode: 'project',
          change_type: 'added',
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      await db('scenario_project_assignments').insert(assignments);

      // Query should be fast with proper indexing
      const startTime = Date.now();
      const results = await db('scenario_assignments_view').where('scenario_id', scenarioId);
      const queryTime = Date.now() - startTime;

      expect(results.length).toBe(100);
      expect(queryTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});