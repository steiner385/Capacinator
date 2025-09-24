import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('🔧 Fixing assignments with null dates...');

  // First, let's identify phase-based assignments with null dates
  const phaseAssignments = await knex('project_assignments')
    .where('assignment_date_mode', 'phase')
    .whereNull('start_date')
    .whereNull('end_date')
    .select('id', 'project_id', 'phase_id');

  console.log(`Found ${phaseAssignments.length} phase-based assignments with null dates`);

  // Update phase-based assignments to use computed dates from their phase timelines
  for (const assignment of phaseAssignments) {
    if (assignment.phase_id) {
      const phaseTimeline = await knex('project_phases_timeline')
        .where('project_id', assignment.project_id)
        .where('phase_id', assignment.phase_id)
        .first();

      if (phaseTimeline) {
        await knex('project_assignments')
          .where('id', assignment.id)
          .update({
            computed_start_date: phaseTimeline.start_date,
            computed_end_date: phaseTimeline.end_date,
            updated_at: new Date()
          });
      }
    }
  }

  // Next, handle project-based assignments with null dates
  const projectAssignments = await knex('project_assignments')
    .where('assignment_date_mode', 'project')
    .whereNull('start_date')
    .whereNull('end_date')
    .select('id', 'project_id');

  console.log(`Found ${projectAssignments.length} project-based assignments with null dates`);

  // Update project-based assignments to use computed dates from their projects
  for (const assignment of projectAssignments) {
    const project = await knex('projects')
      .where('id', assignment.project_id)
      .first();

    if (project) {
      await knex('project_assignments')
        .where('id', assignment.id)
        .update({
          computed_start_date: project.aspiration_start,
          computed_end_date: project.aspiration_finish,
          updated_at: new Date()
        });
    }
  }

  // Finally, handle any remaining assignments with null dates (shouldn't be any with mode='fixed')
  const remainingNullAssignments = await knex('project_assignments')
    .whereNull('start_date')
    .whereNull('end_date')
    .whereNull('computed_start_date')
    .whereNull('computed_end_date')
    .select('id', 'project_id');

  console.log(`Found ${remainingNullAssignments.length} assignments still with null dates`);

  // For any remaining assignments, set them to use project dates as a fallback
  for (const assignment of remainingNullAssignments) {
    const project = await knex('projects')
      .where('id', assignment.project_id)
      .first();

    if (project && project.aspiration_start && project.aspiration_finish) {
      await knex('project_assignments')
        .where('id', assignment.id)
        .update({
          assignment_date_mode: 'project',
          computed_start_date: project.aspiration_start,
          computed_end_date: project.aspiration_finish,
          updated_at: new Date()
        });
    }
  }

  console.log('✅ Assignment dates fixed');
}

export async function down(knex: Knex): Promise<void> {
  // This migration doesn't need to be reversed as it's fixing data integrity
  console.log('This migration cannot be reversed as it fixes data integrity issues');
}