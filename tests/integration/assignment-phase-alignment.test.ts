import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import knex from 'knex';
import { setupTestDatabase, cleanupTestDatabase } from '../setup/database-setup';
import { AssignmentRecalculationService } from '../../src/server/services/AssignmentRecalculationService';
import { ProjectPhaseCascadeService } from '../../src/server/services/ProjectPhaseCascadeService';

describe('Assignment Phase Alignment Integration Tests', () => {
  let db: any;
  let assignmentService: AssignmentRecalculationService;
  let cascadeService: ProjectPhaseCascadeService;
  let testProjectId: string;
  let testPersonId: string;
  let testRoleId: string;
  let analysisPhaseId: string;
  let developmentPhaseId: string;

  beforeAll(async () => {
    db = await setupTestDatabase();
    assignmentService = new AssignmentRecalculationService(db);
    cascadeService = new ProjectPhaseCascadeService(db);
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  beforeEach(async () => {
    // Clean up existing test data
    await db('project_assignments').del();
    await db('project_phase_dependencies').del();
    await db('project_phases_timeline').del();
    await db('projects').del();
    await db('people').del();
    await db('roles').del();
    await db('project_phases').del();

    // Set up test data
    testProjectId = '11111111-2222-3333-4444-555555555555';
    testPersonId = '22222222-3333-4444-5555-666666666666';
    testRoleId = '33333333-4444-5555-6666-777777777777';
    analysisPhaseId = '44444444-5555-6666-7777-888888888888';
    developmentPhaseId = '55555555-6666-7777-8888-999999999999';

    // Create test project
    await db('projects').insert({
      id: testProjectId,
      name: 'Test Phase Alignment Project',
      status: 'active',
      aspiration_start: '2024-01-01',
      aspiration_finish: '2024-12-31',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create test person
    await db('people').insert({
      id: testPersonId,
      name: 'John Developer',
      email: 'john@example.com',
      default_availability_percentage: 100,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create test role
    await db('roles').insert({
      id: testRoleId,
      name: 'Senior Developer',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create test phases
    await db('project_phases').insert([
      {
        id: analysisPhaseId,
        name: 'Analysis',
        order_index: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: developmentPhaseId,
        name: 'Development',
        order_index: 2,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Create test phase timelines
    await db('project_phases_timeline').insert([
      {
        id: 'timeline-analysis',
        project_id: testProjectId,
        phase_id: analysisPhaseId,
        start_date: '2024-02-01',
        end_date: '2024-02-29',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'timeline-development',
        project_id: testProjectId,
        phase_id: developmentPhaseId,
        start_date: '2024-03-01',
        end_date: '2024-04-30',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Create FS dependency: Development depends on Analysis finishing
    await db('project_phase_dependencies').insert({
      id: 'dep-analysis-to-dev',
      project_id: testProjectId,
      predecessor_phase_timeline_id: 'timeline-analysis',
      successor_phase_timeline_id: 'timeline-development',
      dependency_type: 'FS',
      lag_days: 0,
      created_at: new Date(),
      updated_at: new Date()
    });
  });

  describe('Phase-Aligned Assignment Creation', () => {
    it('should create assignment with computed dates from phase timeline', async () => {
      // Create phase-aligned assignment
      const [assignment] = await db('project_assignments').insert({
        id: 'assignment-phase-aligned',
        project_id: testProjectId,
        person_id: testPersonId,
        role_id: testRoleId,
        phase_id: analysisPhaseId,
        assignment_date_mode: 'phase',
        allocation_percentage: 50,
        computed_start_date: '2024-02-01',
        computed_end_date: '2024-02-29',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');

      expect(assignment.assignment_date_mode).toBe('phase');
      expect(assignment.computed_start_date).toBe('2024-02-01');
      expect(assignment.computed_end_date).toBe('2024-02-29');
      expect(assignment.start_date).toBeNull();
      expect(assignment.end_date).toBeNull();
    });

    it('should create project-aligned assignment with computed dates from project aspiration', async () => {
      // Create project-aligned assignment
      const [assignment] = await db('project_assignments').insert({
        id: 'assignment-project-aligned',
        project_id: testProjectId,
        person_id: testPersonId,
        role_id: testRoleId,
        assignment_date_mode: 'project',
        allocation_percentage: 25,
        computed_start_date: '2024-01-01',
        computed_end_date: '2024-12-31',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');

      expect(assignment.assignment_date_mode).toBe('project');
      expect(assignment.computed_start_date).toBe('2024-01-01');
      expect(assignment.computed_end_date).toBe('2024-12-31');
    });
  });

  describe('Assignment Recalculation on Phase Changes', () => {
    beforeEach(async () => {
      // Create test assignments
      await db('project_assignments').insert([
        {
          id: 'assignment-analysis-phase',
          project_id: testProjectId,
          person_id: testPersonId,
          role_id: testRoleId,
          phase_id: analysisPhaseId,
          assignment_date_mode: 'phase',
          allocation_percentage: 100,
          computed_start_date: '2024-02-01',
          computed_end_date: '2024-02-29',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'assignment-development-phase',
          project_id: testProjectId,
          person_id: testPersonId,
          role_id: testRoleId,
          phase_id: developmentPhaseId,
          assignment_date_mode: 'phase',
          allocation_percentage: 75,
          computed_start_date: '2024-03-01',
          computed_end_date: '2024-04-30',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'assignment-fixed-dates',
          project_id: testProjectId,
          person_id: testPersonId,
          role_id: testRoleId,
          assignment_date_mode: 'fixed',
          start_date: '2024-05-01',
          end_date: '2024-05-31',
          allocation_percentage: 50,
          computed_start_date: '2024-05-01',
          computed_end_date: '2024-05-31',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    });

    it('should recalculate phase-aligned assignments when phase dates change', async () => {
      // Change Analysis phase dates
      await db('project_phases_timeline')
        .where('id', 'timeline-analysis')
        .update({
          start_date: '2024-01-15',
          end_date: '2024-02-15',
          updated_at: new Date()
        });

      // Recalculate assignments
      const result = await assignmentService.recalculateAssignmentsForPhaseChanges(
        testProjectId,
        [analysisPhaseId]
      );

      expect(result.updated_assignments).toHaveLength(1);
      
      const updatedAssignment = result.updated_assignments[0];
      expect(updatedAssignment.assignment_id).toBe('assignment-analysis-phase');
      expect(updatedAssignment.old_computed_start_date).toBe('2024-02-01');
      expect(updatedAssignment.old_computed_end_date).toBe('2024-02-29');
      expect(updatedAssignment.new_computed_start_date).toBe('2024-01-15');
      expect(updatedAssignment.new_computed_end_date).toBe('2024-02-15');

      // Verify database was updated
      const assignment = await db('project_assignments')
        .where('id', 'assignment-analysis-phase')
        .first();
      
      expect(assignment.computed_start_date).toBe('2024-01-15');
      expect(assignment.computed_end_date).toBe('2024-02-15');
    });

    it('should not affect fixed-date assignments when phases change', async () => {
      // Change Development phase dates
      await db('project_phases_timeline')
        .where('id', 'timeline-development')
        .update({
          start_date: '2024-04-01',
          end_date: '2024-05-31',
          updated_at: new Date()
        });

      // Recalculate assignments
      const result = await assignmentService.recalculateAssignmentsForPhaseChanges(
        testProjectId,
        [developmentPhaseId]
      );

      // Should only update the phase-aligned assignment, not the fixed-date one
      expect(result.updated_assignments).toHaveLength(1);
      expect(result.updated_assignments[0].assignment_id).toBe('assignment-development-phase');

      // Verify fixed-date assignment unchanged
      const fixedAssignment = await db('project_assignments')
        .where('id', 'assignment-fixed-dates')
        .first();
      
      expect(fixedAssignment.computed_start_date).toBe('2024-05-01');
      expect(fixedAssignment.computed_end_date).toBe('2024-05-31');
    });
  });

  describe('Assignment Recalculation with Phase Cascading', () => {
    beforeEach(async () => {
      // Create phase-aligned assignments for both phases
      await db('project_assignments').insert([
        {
          id: 'assignment-analysis-cascade',
          project_id: testProjectId,
          person_id: testPersonId,
          role_id: testRoleId,
          phase_id: analysisPhaseId,
          assignment_date_mode: 'phase',
          allocation_percentage: 100,
          computed_start_date: '2024-02-01',
          computed_end_date: '2024-02-29',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'assignment-development-cascade',
          project_id: testProjectId,
          person_id: testPersonId,
          role_id: testRoleId,
          phase_id: developmentPhaseId,
          assignment_date_mode: 'phase',
          allocation_percentage: 50,
          computed_start_date: '2024-03-01',
          computed_end_date: '2024-04-30',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    });

    it('should recalculate assignments when phase dependencies cause cascading changes', async () => {
      // Extend Analysis phase, which should cascade to Development phase due to FS dependency
      await db('project_phases_timeline')
        .where('id', 'timeline-analysis')
        .update({
          end_date: '2024-03-15', // Extended by 2 weeks
          updated_at: new Date()
        });

      // Calculate cascade effects
      const cascadeResult = await cascadeService.calculateCascade(
        testProjectId,
        'timeline-analysis',
        new Date('2024-02-01'),
        new Date('2024-03-15')
      );

      // Apply cascade changes and recalculate assignments
      await cascadeService.applyCascade(testProjectId, cascadeResult);

      // Recalculate assignments for all affected phases
      const affectedPhaseIds = [analysisPhaseId, developmentPhaseId];
      const assignmentResult = await assignmentService.recalculateAssignmentsForPhaseChanges(
        testProjectId,
        affectedPhaseIds
      );

      // Should update assignments for both phases
      expect(assignmentResult.updated_assignments.length).toBeGreaterThanOrEqual(1);

      // Verify Analysis assignment updated
      const analysisAssignment = assignmentResult.updated_assignments.find(
        a => a.assignment_id === 'assignment-analysis-cascade'
      );
      expect(analysisAssignment?.new_computed_end_date).toBe('2024-03-15');

      // Verify Development assignment updated if cascade affected it
      const developmentAssignment = await db('project_assignments')
        .where('id', 'assignment-development-cascade')
        .first();
      
      // Development should start after Analysis ends due to FS dependency
      expect(new Date(developmentAssignment.computed_start_date)).toBeGreaterThan(new Date('2024-03-15'));
    });
  });

  describe('Conflict Detection with Dynamic Assignments', () => {
    it('should detect conflicts when phase changes cause assignment overlaps', async () => {
      // Create two overlapping phase-aligned assignments for the same person
      await db('project_assignments').insert([
        {
          id: 'assignment-conflict-1',
          project_id: testProjectId,
          person_id: testPersonId,
          role_id: testRoleId,
          phase_id: analysisPhaseId,
          assignment_date_mode: 'phase',
          allocation_percentage: 75,
          computed_start_date: '2024-02-01',
          computed_end_date: '2024-02-29',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'assignment-conflict-2',
          project_id: testProjectId,
          person_id: testPersonId,
          role_id: testRoleId,
          phase_id: developmentPhaseId,
          assignment_date_mode: 'phase',
          allocation_percentage: 50,
          computed_start_date: '2024-03-01',
          computed_end_date: '2024-04-30',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      // Change Development phase to overlap with Analysis
      await db('project_phases_timeline')
        .where('id', 'timeline-development')
        .update({
          start_date: '2024-02-15', // Now overlaps with Analysis
          end_date: '2024-03-31',
          updated_at: new Date()
        });

      // Recalculate assignments and check for conflicts
      const result = await assignmentService.recalculateAssignmentsForPhaseChanges(
        testProjectId,
        [developmentPhaseId]
      );

      // Should detect over-allocation conflict (75% + 50% = 125%)
      expect(result.conflicts.length).toBeGreaterThan(0);
      
      const conflict = result.conflicts.find(c => c.conflict_type === 'over_allocation');
      expect(conflict).toBeTruthy();
      expect(conflict?.person_id).toBe(testPersonId);
    });
  });

  describe('Project-Aligned Assignment Recalculation', () => {
    beforeEach(async () => {
      await db('project_assignments').insert({
        id: 'assignment-project-aligned',
        project_id: testProjectId,
        person_id: testPersonId,
        role_id: testRoleId,
        assignment_date_mode: 'project',
        allocation_percentage: 25,
        computed_start_date: '2024-01-01',
        computed_end_date: '2024-12-31',
        created_at: new Date(),
        updated_at: new Date()
      });
    });

    it('should recalculate project-aligned assignments when project aspiration dates change', async () => {
      // Change project aspiration dates
      await db('projects')
        .where('id', testProjectId)
        .update({
          aspiration_start: '2024-02-01',
          aspiration_finish: '2024-11-30',
          updated_at: new Date()
        });

      // Recalculate project-aligned assignments
      const result = await assignmentService.recalculateAssignmentsForProjectChanges(testProjectId);

      expect(result.updated_assignments).toHaveLength(1);
      
      const updatedAssignment = result.updated_assignments[0];
      expect(updatedAssignment.assignment_id).toBe('assignment-project-aligned');
      expect(updatedAssignment.new_computed_start_date).toBe('2024-02-01');
      expect(updatedAssignment.new_computed_end_date).toBe('2024-11-30');
    });
  });
});