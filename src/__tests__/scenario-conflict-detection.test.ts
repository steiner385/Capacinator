import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import { setupTestDatabase, cleanupTestDatabase, getTestDb } from '../test-helpers/database.js';
import { createTestData } from '../test-helpers/data.js';
import { ScenariosController } from '../server/api/controllers/ScenariosController.js';
import { randomUUID } from 'crypto';

describe('Scenario Conflict Detection and Merge Operations', () => {
  let db: any;
  let testData: any;
  let controller: ScenariosController;

  beforeAll(async () => {
    await setupTestDatabase();
    db = getTestDb();
    testData = await createTestData();
    controller = new ScenariosController();
    // Mock the db property
    (controller as any).db = db;
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

  describe('Conflict Detection', () => {
    let scenario1Id: string;
    let scenario2Id: string;

    beforeEach(async () => {
      // Create two test scenarios
      scenario1Id = randomUUID();
      scenario2Id = randomUUID();

      await db('scenarios').insert([
        {
          id: scenario1Id,
          name: 'Scenario 1',
          created_by: testData.people[0].id,
          scenario_type: 'branch',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: scenario2Id,
          name: 'Scenario 2',
          created_by: testData.people[0].id,
          scenario_type: 'branch',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    });

    it('should detect assignment conflicts', async () => {
      // Create conflicting assignments in both scenarios
      const baseAssignment = {
        project_id: testData.projects[0].id,
        person_id: testData.people[0].id,
        role_id: testData.roles[0].id,
        assignment_date_mode: 'project',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      };

      // Scenario 1: 50% allocation
      await db('scenario_project_assignments').insert({
        ...baseAssignment,
        id: randomUUID(),
        scenario_id: scenario1Id,
        allocation_percentage: 50
      });

      // Scenario 2: 75% allocation (conflict!)
      await db('scenario_project_assignments').insert({
        ...baseAssignment,
        id: randomUUID(),
        scenario_id: scenario2Id,
        allocation_percentage: 75
      });

      // Test conflict detection
      const conflicts = await (controller as any).detectMergeConflicts(scenario1Id, scenario2Id);
      
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('assignment');
      expect(conflicts[0].source_data.allocation_percentage).toBe(50);
      expect(conflicts[0].target_data.allocation_percentage).toBe(75);
    });

    it('should detect phase timeline conflicts', async () => {
      // Create conflicting phase timelines
      const basePhase = {
        project_id: testData.projects[0].id,
        phase_id: testData.phases[0].id,
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      };

      // Scenario 1: Jan-Feb timeline
      await db('scenario_project_phases').insert({
        ...basePhase,
        id: randomUUID(),
        scenario_id: scenario1Id,
        start_date: '2025-01-01',
        end_date: '2025-02-01'
      });

      // Scenario 2: Feb-Mar timeline (conflict!)
      await db('scenario_project_phases').insert({
        ...basePhase,
        id: randomUUID(),
        scenario_id: scenario2Id,
        start_date: '2025-02-01',
        end_date: '2025-03-01'
      });

      const conflicts = await (controller as any).detectMergeConflicts(scenario1Id, scenario2Id);
      
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('phase_timeline');
      expect(conflicts[0].source_data.start_date).toBe('2025-01-01');
      expect(conflicts[0].target_data.start_date).toBe('2025-02-01');
    });

    it('should detect project detail conflicts', async () => {
      // Create conflicting project modifications
      const baseProject = {
        project_id: testData.projects[0].id,
        change_type: 'modified',
        created_at: new Date(),
        updated_at: new Date()
      };

      // Scenario 1: Priority 1
      await db('scenario_projects').insert({
        ...baseProject,
        id: randomUUID(),
        scenario_id: scenario1Id,
        priority: 1,
        aspiration_start: '2025-01-01'
      });

      // Scenario 2: Priority 5 (conflict!)
      await db('scenario_projects').insert({
        ...baseProject,
        id: randomUUID(),
        scenario_id: scenario2Id,
        priority: 5,
        aspiration_start: '2025-01-01'
      });

      const conflicts = await (controller as any).detectMergeConflicts(scenario1Id, scenario2Id);
      
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('project_details');
      expect(conflicts[0].source_data.priority).toBe(1);
      expect(conflicts[0].target_data.priority).toBe(5);
    });

    it('should not detect conflicts for identical data', async () => {
      // Create identical assignments in both scenarios
      const identicalAssignment = {
        project_id: testData.projects[0].id,
        person_id: testData.people[0].id,
        role_id: testData.roles[0].id,
        allocation_percentage: 50,
        assignment_date_mode: 'project',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      };

      await db('scenario_project_assignments').insert([
        { ...identicalAssignment, id: randomUUID(), scenario_id: scenario1Id },
        { ...identicalAssignment, id: randomUUID(), scenario_id: scenario2Id }
      ]);

      const conflicts = await (controller as any).detectMergeConflicts(scenario1Id, scenario2Id);
      expect(conflicts.length).toBe(0);
    });

    it('should handle multiple conflicts across different types', async () => {
      // Create assignment conflict
      await db('scenario_project_assignments').insert([
        {
          id: randomUUID(),
          scenario_id: scenario1Id,
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 50,
          assignment_date_mode: 'project',
          change_type: 'added',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: randomUUID(),
          scenario_id: scenario2Id,
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 75,
          assignment_date_mode: 'project',
          change_type: 'added',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      // Create phase conflict
      await db('scenario_project_phases').insert([
        {
          id: randomUUID(),
          scenario_id: scenario1Id,
          project_id: testData.projects[0].id,
          phase_id: testData.phases[0].id,
          start_date: '2025-01-01',
          end_date: '2025-02-01',
          change_type: 'added',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: randomUUID(),
          scenario_id: scenario2Id,
          project_id: testData.projects[0].id,
          phase_id: testData.phases[0].id,
          start_date: '2025-02-01',
          end_date: '2025-03-01',
          change_type: 'added',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      const conflicts = await (controller as any).detectMergeConflicts(scenario1Id, scenario2Id);
      
      expect(conflicts.length).toBe(2);
      expect(conflicts.find((c: any) => c.type === 'assignment')).toBeDefined();
      expect(conflicts.find((c: any) => c.type === 'phase_timeline')).toBeDefined();
    });
  });

  describe('Merge Operations - Database Integrity', () => {
    let sourceScenarioId: string;
    let targetScenarioId: string;

    beforeEach(async () => {
      sourceScenarioId = randomUUID();
      targetScenarioId = randomUUID();

      await db('scenarios').insert([
        {
          id: sourceScenarioId,
          name: 'Source Scenario',
          created_by: testData.people[0].id,
          scenario_type: 'branch',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: targetScenarioId,
          name: 'Target Scenario',
          created_by: testData.people[0].id,
          scenario_type: 'branch',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    });

    it('should maintain data integrity during successful merge', async () => {
      // Create non-conflicting data in source scenario
      await db('scenario_project_assignments').insert({
        id: randomUUID(),
        scenario_id: sourceScenarioId,
        project_id: testData.projects[0].id,
        person_id: testData.people[0].id,
        role_id: testData.roles[0].id,
        allocation_percentage: 50,
        assignment_date_mode: 'project',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Count data before merge
      const sourceAssignmentsBefore = await db('scenario_project_assignments')
        .where('scenario_id', sourceScenarioId);
      const targetAssignmentsBefore = await db('scenario_project_assignments')
        .where('scenario_id', targetScenarioId);

      // Perform merge
      await (controller as any).performMerge(sourceScenarioId, targetScenarioId);

      // Verify data integrity
      const sourceAssignmentsAfter = await db('scenario_project_assignments')
        .where('scenario_id', sourceScenarioId);
      const targetAssignmentsAfter = await db('scenario_project_assignments')
        .where('scenario_id', targetScenarioId);

      // Source data should remain unchanged
      expect(sourceAssignmentsAfter.length).toBe(sourceAssignmentsBefore.length);
      
      // Target should have new data
      expect(targetAssignmentsAfter.length).toBe(targetAssignmentsBefore.length + 1);
    });

    it('should rollback completely on merge failure', async () => {
      // Create data that will cause a constraint violation during merge
      await db('scenario_project_assignments').insert({
        id: randomUUID(),
        scenario_id: sourceScenarioId,
        project_id: testData.projects[0].id,
        person_id: 'invalid-person-id', // This will cause foreign key constraint violation
        role_id: testData.roles[0].id,
        allocation_percentage: 50,
        assignment_date_mode: 'project',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Count target data before attempted merge
      const targetAssignmentsBefore = await db('scenario_project_assignments')
        .where('scenario_id', targetScenarioId);

      // Attempt merge - should fail and rollback
      await expect(
        (controller as any).performMerge(sourceScenarioId, targetScenarioId)
      ).rejects.toThrow();

      // Verify no partial changes were applied
      const targetAssignmentsAfter = await db('scenario_project_assignments')
        .where('scenario_id', targetScenarioId);
      
      expect(targetAssignmentsAfter.length).toBe(targetAssignmentsBefore.length);
    });

    it('should handle concurrent modifications safely', async () => {
      // This test simulates concurrent modifications to the same scenario
      // Create initial assignment
      const assignmentId = randomUUID();
      await db('scenario_project_assignments').insert({
        id: assignmentId,
        scenario_id: targetScenarioId,
        project_id: testData.projects[0].id,
        person_id: testData.people[0].id,
        role_id: testData.roles[0].id,
        allocation_percentage: 50,
        assignment_date_mode: 'project',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Simulate concurrent merge operations
      const merge1Promise = (controller as any).performMerge(sourceScenarioId, targetScenarioId);
      const merge2Promise = (controller as any).performMerge(sourceScenarioId, targetScenarioId);

      // One should succeed, one should either succeed or fail gracefully
      const results = await Promise.allSettled([merge1Promise, merge2Promise]);
      
      // At least one should succeed
      const successes = results.filter(r => r.status === 'fulfilled');
      expect(successes.length).toBeGreaterThanOrEqual(1);

      // Database should be in consistent state
      const finalAssignments = await db('scenario_project_assignments')
        .where('scenario_id', targetScenarioId);
      
      // Should have exactly one assignment (no duplicates)
      expect(finalAssignments.length).toBe(1);
    });

    it('should preserve foreign key relationships during merge', async () => {
      // Create assignment in source scenario
      await db('scenario_project_assignments').insert({
        id: randomUUID(),
        scenario_id: sourceScenarioId,
        project_id: testData.projects[0].id,
        person_id: testData.people[0].id,
        role_id: testData.roles[0].id,
        allocation_percentage: 50,
        assignment_date_mode: 'project',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Perform merge
      await (controller as any).performMerge(sourceScenarioId, targetScenarioId);

      // Verify foreign key relationships are intact
      const mergedAssignments = await db('scenario_project_assignments')
        .join('projects', 'scenario_project_assignments.project_id', 'projects.id')
        .join('people', 'scenario_project_assignments.person_id', 'people.id')
        .join('roles', 'scenario_project_assignments.role_id', 'roles.id')
        .where('scenario_project_assignments.scenario_id', targetScenarioId)
        .select('scenario_project_assignments.*', 'projects.name as project_name', 'people.name as person_name', 'roles.name as role_name');

      expect(mergedAssignments.length).toBe(1);
      expect(mergedAssignments[0].project_name).toBeDefined();
      expect(mergedAssignments[0].person_name).toBeDefined();
      expect(mergedAssignments[0].role_name).toBeDefined();
    });

    it('should handle complex assignment date mode scenarios', async () => {
      // Create phase for phase-mode assignment
      await db('scenario_project_phases').insert({
        id: randomUUID(),
        scenario_id: sourceScenarioId,
        project_id: testData.projects[0].id,
        phase_id: testData.phases[0].id,
        start_date: '2025-01-01',
        end_date: '2025-02-01',
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Create project modification for project-mode assignment
      await db('scenario_projects').insert({
        id: randomUUID(),
        scenario_id: sourceScenarioId,
        project_id: testData.projects[0].id,
        aspiration_start: '2025-01-15',
        aspiration_finish: '2025-03-15',
        change_type: 'modified',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Create assignments with different date modes
      await db('scenario_project_assignments').insert([
        {
          id: randomUUID(),
          scenario_id: sourceScenarioId,
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
        },
        {
          id: randomUUID(),
          scenario_id: sourceScenarioId,
          project_id: testData.projects[0].id,
          person_id: testData.people[1].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 75,
          assignment_date_mode: 'project',
          change_type: 'added',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: randomUUID(),
          scenario_id: sourceScenarioId,
          project_id: testData.projects[0].id,
          person_id: testData.people[2].id,
          role_id: testData.roles[0].id,
          phase_id: testData.phases[0].id,
          allocation_percentage: 100,
          assignment_date_mode: 'phase',
          change_type: 'added',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      // Perform merge
      await (controller as any).performMerge(sourceScenarioId, targetScenarioId);

      // Verify all assignment modes were handled correctly
      const mergedAssignments = await db('scenario_assignments_view')
        .where('scenario_id', targetScenarioId);

      expect(mergedAssignments.length).toBe(3);
      
      const fixedAssignment = mergedAssignments.find((a: any) => a.assignment_date_mode === 'fixed');
      const projectAssignment = mergedAssignments.find((a: any) => a.assignment_date_mode === 'project');
      const phaseAssignment = mergedAssignments.find((a: any) => a.assignment_date_mode === 'phase');

      expect(fixedAssignment.computed_start_date).toBe('2025-01-10');
      expect(projectAssignment.computed_start_date).toBe('2025-01-15');
      expect(phaseAssignment.computed_start_date).toBe('2025-01-01');
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle empty scenarios gracefully', async () => {
      const emptyScenario1 = randomUUID();
      const emptyScenario2 = randomUUID();

      await db('scenarios').insert([
        {
          id: emptyScenario1,
          name: 'Empty 1',
          created_by: testData.people[0].id,
          scenario_type: 'branch',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: emptyScenario2,
          name: 'Empty 2',
          created_by: testData.people[0].id,
          scenario_type: 'branch',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      const conflicts = await (controller as any).detectMergeConflicts(emptyScenario1, emptyScenario2);
      expect(conflicts.length).toBe(0);

      // Merge should succeed with no data
      await expect(
        (controller as any).performMerge(emptyScenario1, emptyScenario2)
      ).resolves.not.toThrow();
    });

    it('should handle null and undefined values in conflict detection', async () => {
      const scenario1Id = randomUUID();
      const scenario2Id = randomUUID();

      await db('scenarios').insert([
        {
          id: scenario1Id,
          name: 'Scenario 1',
          created_by: testData.people[0].id,
          scenario_type: 'branch',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: scenario2Id,
          name: 'Scenario 2',
          created_by: testData.people[0].id,
          scenario_type: 'branch',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      // Create assignments with null values
      await db('scenario_project_assignments').insert([
        {
          id: randomUUID(),
          scenario_id: scenario1Id,
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 50,
          assignment_date_mode: 'project',
          start_date: null,
          end_date: null,
          phase_id: null,
          notes: null,
          change_type: 'added',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: randomUUID(),
          scenario_id: scenario2Id,
          project_id: testData.projects[0].id,
          person_id: testData.people[0].id,
          role_id: testData.roles[0].id,
          allocation_percentage: 75, // Different allocation
          assignment_date_mode: 'project',
          start_date: null,
          end_date: null,
          phase_id: null,
          notes: null,
          change_type: 'added',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      const conflicts = await (controller as any).detectMergeConflicts(scenario1Id, scenario2Id);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('assignment');
    });

    it('should validate scenario state before merge', async () => {
      const validScenarioId = randomUUID();
      const invalidScenarioId = 'non-existent-scenario';

      await db('scenarios').insert({
        id: validScenarioId,
        name: 'Valid Scenario',
        created_by: testData.people[0].id,
        scenario_type: 'branch',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Should handle non-existent scenarios gracefully
      await expect(
        (controller as any).detectMergeConflicts(invalidScenarioId, validScenarioId)
      ).resolves.toEqual([]);
    });
  });
});