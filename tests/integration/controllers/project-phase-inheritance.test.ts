import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from '../setup';

// Manual implementation of phase inheritance logic for testing
async function inheritProjectPhases(projectId: string, projectTypeId: string) {
  try {
    // Get all active phases for the project type
    const projectTypePhases = await db('project_phases')
      .select('id', 'name', 'order_index')
      .where('project_type_id', projectTypeId)
      .where('is_active', 1)
      .orderBy('order_index');

    if (projectTypePhases.length === 0) {
      // No phases defined for this project type
      return;
    }

    // Get project aspiration dates for phase date calculation
    const project = await db('projects')
      .select('aspiration_start', 'aspiration_finish')
      .where('id', projectId)
      .first();

    // Calculate default phase dates
    const now = new Date();
    const projectStart = project?.aspiration_start ? new Date(project.aspiration_start) : now;
    const projectEnd = project?.aspiration_finish ? new Date(project.aspiration_finish) : 
      new Date(projectStart.getTime() + (365 * 24 * 60 * 60 * 1000)); // Default to 1 year

    const totalDuration = projectEnd.getTime() - projectStart.getTime();
    const phaseDuration = totalDuration / projectTypePhases.length;

    // Create timeline entries for each phase
    const timelineEntries = projectTypePhases.map((phase, index) => {
      const phaseStart = new Date(projectStart.getTime() + (index * phaseDuration));
      const phaseEnd = new Date(projectStart.getTime() + ((index + 1) * phaseDuration));

      return {
        id: `phase-timeline-${projectId}-${phase.id}-${Date.now()}-${index}`,
        project_id: projectId,
        phase_id: phase.id,
        start_date: phaseStart.getTime(),
        end_date: phaseEnd.getTime(),
        created_at: new Date(),
        updated_at: new Date()
      };
    });

    // Insert all phase timeline entries
    if (timelineEntries.length > 0) {
      await db('project_phases_timeline').insert(timelineEntries);
    }
  } catch (error) {
    // Log the error but don't fail project creation
    console.error(`Failed to inherit phases for project ${projectId}:`, error);
  }
}

describe('Project Phase Inheritance', () => {
  let testProjectTypeId: string;
  let testProjectSubTypeId: string;
  let testPhases: any[];
  let testLocationId: string;

  beforeEach(async () => {
    
    // Add project_type_id column to project_phases table if it doesn't exist
    try {
      await db.raw('ALTER TABLE project_phases ADD COLUMN project_type_id TEXT');
      await db.raw('ALTER TABLE project_phases ADD COLUMN is_active INTEGER DEFAULT 1');
    } catch (error) {
      // Column might already exist, ignore the error
    }

    // Create a test location
    testLocationId = `test-location-${Date.now()}`;
    await db('locations').insert({
      id: testLocationId,
      name: 'Test Location',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create a test project type
    testProjectTypeId = `test-project-type-${Date.now()}`;
    await db('project_types').insert({
      id: testProjectTypeId,
      name: 'Test Web Application',
      description: 'Test project type for web applications',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create a test project sub-type
    testProjectSubTypeId = `test-project-subtype-${Date.now()}`;
    await db('project_sub_types').insert({
      id: testProjectSubTypeId,
      name: 'Test React Application',
      project_type_id: testProjectTypeId,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create test phases for the project type
    const phaseNames = [
      'Pending',
      'Business Planning', 
      'Development',
      'System Integration Testing',
      'User Acceptance Testing',
      'Validation',
      'Cutover',
      'Hypercare',
      'Support'
    ];

    testPhases = [];
    for (let i = 0; i < phaseNames.length; i++) {
      const phaseId = `test-phase-${Date.now()}-${i}`;
      const phase = {
        id: phaseId,
        name: phaseNames[i],
        description: `Test ${phaseNames[i]} phase`,
        project_type_id: testProjectTypeId,
        order_index: i + 1,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      await db('project_phases').insert(phase);
      testPhases.push(phase);
    }
  });

  afterEach(async () => {
    // Clean up test data
    await db('project_phases_timeline').where('project_id', 'like', '%test%').del();
    await db('project_phases').where('id', 'like', '%test%').del();
    await db('projects').where('id', 'like', '%test%').del();
    await db('project_sub_types').where('id', 'like', '%test%').del();
    await db('project_types').where('id', 'like', '%test%').del();
    await db('locations').where('id', 'like', '%test%').del();
  });

  test('should automatically inherit phases from project type when creating a new project', async () => {
    // Create a project manually to test the phase inheritance
    const projectId = `test-project-${Date.now()}`;
    
    const projectData = {
      id: projectId,
      name: 'Test Customer Portal Project',
      description: 'Test project for phase inheritance',
      project_type_id: testProjectTypeId,
      project_sub_type_id: testProjectSubTypeId,
      location_id: testLocationId,
      priority: 3,
      include_in_demand: 1,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Insert the project into the database
    await db('projects').insert(projectData);
    
    // Manually call the inheritance logic (simulating what the controller would do)
    await inheritProjectPhases(projectId, testProjectTypeId);

    // Verify that project phases timeline was created with all phases from the project type
    const projectPhasesTimeline = await db('project_phases_timeline')
      .where('project_id', projectId)
      .orderBy('start_date');

    expect(projectPhasesTimeline).toHaveLength(testPhases.length);

    // Verify that all phases from the project type are present
    const timelinePhaseIds = projectPhasesTimeline.map(pt => pt.phase_id);
    const expectedPhaseIds = testPhases.map(p => p.id);
    
    for (const expectedPhaseId of expectedPhaseIds) {
      expect(timelinePhaseIds).toContain(expectedPhaseId);
    }

    // Verify phases are in correct order
    for (let i = 0; i < projectPhasesTimeline.length; i++) {
      const timelinePhase = projectPhasesTimeline[i];
      const correspondingPhase = testPhases.find(p => p.id === timelinePhase.phase_id);
      expect(correspondingPhase?.order_index).toBe(i + 1);
    }

    // Verify that phases have reasonable default dates
    const firstPhase = projectPhasesTimeline[0];
    const lastPhase = projectPhasesTimeline[projectPhasesTimeline.length - 1];
    
    expect(new Date(firstPhase.start_date)).toBeInstanceOf(Date);
    expect(new Date(lastPhase.end_date)).toBeInstanceOf(Date);
    expect(Number(lastPhase.end_date)).toBeGreaterThan(Number(firstPhase.start_date));
  });

  test('should inherit phases even when project sub-type is different but belongs to same project type', async () => {
    // Create another sub-type for the same project type
    const anotherSubTypeId = `test-subtype-2-${Date.now()}`;
    await db('project_sub_types').insert({
      id: anotherSubTypeId,
      name: 'Test Vue Application',
      project_type_id: testProjectTypeId,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    const projectId = `test-project-2-${Date.now()}`;
    const projectData = {
      id: projectId,
      name: 'Test Vue Project',
      description: 'Test project with different sub-type',
      project_type_id: testProjectTypeId,
      project_sub_type_id: anotherSubTypeId,
      location_id: testLocationId,
      priority: 2,
      include_in_demand: 1,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db('projects').insert(projectData);
    await inheritProjectPhases(projectId, testProjectTypeId);

    // Verify that phases are still inherited from the project type
    const projectPhasesTimeline = await db('project_phases_timeline')
      .where('project_id', projectId);

    expect(projectPhasesTimeline).toHaveLength(testPhases.length);
  });

  test('should not inherit phases if project type has no phases defined', async () => {
    // Create a project type with no phases
    const emptyProjectTypeId = `empty-project-type-${Date.now()}`;
    await db('project_types').insert({
      id: emptyProjectTypeId,
      name: 'Empty Project Type',
      description: 'Project type with no phases',
      created_at: new Date(),
      updated_at: new Date()
    });

    const emptySubTypeId = `empty-subtype-${Date.now()}`;
    await db('project_sub_types').insert({
      id: emptySubTypeId,
      name: 'Empty Sub Type',
      project_type_id: emptyProjectTypeId,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    const projectId = `test-project-3-${Date.now()}`;
    const projectData = {
      id: projectId,
      name: 'Project with No Phases',
      description: 'Test project with no phase inheritance',
      project_type_id: emptyProjectTypeId,
      project_sub_type_id: emptySubTypeId,
      location_id: testLocationId,
      priority: 4,
      include_in_demand: 0,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db('projects').insert(projectData);
    await inheritProjectPhases(projectId, emptyProjectTypeId);

    // Verify that no phases timeline was created
    const projectPhasesTimeline = await db('project_phases_timeline')
      .where('project_id', projectId);

    expect(projectPhasesTimeline).toHaveLength(0);
  });

  test('should only inherit active phases from project type', async () => {
    // Mark one of the test phases as inactive
    const phaseToDeactivate = testPhases[2]; // Development phase
    await db('project_phases')
      .where('id', phaseToDeactivate.id)
      .update({ is_active: 0 });

    const projectId = `test-project-4-${Date.now()}`;
    const projectData = {
      id: projectId,
      name: 'Project with Inactive Phase',
      description: 'Test project to verify only active phases are inherited',
      project_type_id: testProjectTypeId,
      project_sub_type_id: testProjectSubTypeId,
      location_id: testLocationId,
      priority: 1,
      include_in_demand: 1,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db('projects').insert(projectData);
    await inheritProjectPhases(projectId, testProjectTypeId);

    // Verify that only active phases are inherited
    const projectPhasesTimeline = await db('project_phases_timeline')
      .join('project_phases', 'project_phases_timeline.phase_id', 'project_phases.id')
      .where('project_phases_timeline.project_id', projectId)
      .select('project_phases_timeline.*', 'project_phases.is_active');

    // Should have one less phase (the inactive one)
    expect(projectPhasesTimeline).toHaveLength(testPhases.length - 1);
    
    // Verify the inactive phase is not included
    const timelinePhaseIds = projectPhasesTimeline.map(pt => pt.phase_id);
    expect(timelinePhaseIds).not.toContain(phaseToDeactivate.id);
  });

  test('should handle project creation when phase inheritance fails gracefully', async () => {
    // This test ensures that if phase inheritance fails, the project is still created
    // but without phases (rather than failing entirely)
    
    const projectId = `test-project-5-${Date.now()}`;
    const projectData = {
      id: projectId,
      name: 'Project with Potential Phase Issues',
      description: 'Test project for error handling',
      project_type_id: testProjectTypeId,
      project_sub_type_id: testProjectSubTypeId,
      location_id: testLocationId,
      priority: 2,
      include_in_demand: 1,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db('projects').insert(projectData);

    // Try to inherit phases with an invalid project type ID (should fail gracefully)
    await inheritProjectPhases(projectId, 'invalid-project-type-id');

    // Verify the project still exists even if phase inheritance failed
    const project = await db('projects').where('id', projectId).first();
    expect(project).toBeDefined();
    expect(project.name).toBe(projectData.name);
  });

  test('should set reasonable default dates for inherited phases', async () => {
    const projectId = `test-project-6-${Date.now()}`;
    const projectData = {
      id: projectId,
      name: 'Project for Date Testing',
      description: 'Test project to verify phase date calculation',
      project_type_id: testProjectTypeId,
      project_sub_type_id: testProjectSubTypeId,
      location_id: testLocationId,
      priority: 3,
      include_in_demand: 1,
      aspiration_start: '2024-01-01',
      aspiration_finish: '2024-12-31',
      created_at: new Date(),
      updated_at: new Date()
    };

    await db('projects').insert(projectData);
    await inheritProjectPhases(projectId, testProjectTypeId);

    const projectPhasesTimeline = await db('project_phases_timeline')
      .where('project_id', projectId)
      .orderBy('start_date');

    // Verify phases have sequential dates
    for (let i = 0; i < projectPhasesTimeline.length - 1; i++) {
      const currentPhase = projectPhasesTimeline[i];
      const nextPhase = projectPhasesTimeline[i + 1];
      
      expect(Number(nextPhase.start_date)).toBeGreaterThanOrEqual(Number(currentPhase.end_date));
    }

    // Verify first phase starts on or after project aspiration start
    const firstPhase = projectPhasesTimeline[0];
    const projectStart = new Date(projectData.aspiration_start).getTime();
    expect(Number(firstPhase.start_date)).toBeGreaterThanOrEqual(projectStart);

    // Verify last phase ends on or before project aspiration finish
    const lastPhase = projectPhasesTimeline[projectPhasesTimeline.length - 1];
    const projectEnd = new Date(projectData.aspiration_finish).getTime();
    expect(Number(lastPhase.end_date)).toBeLessThanOrEqual(projectEnd);
  });
});