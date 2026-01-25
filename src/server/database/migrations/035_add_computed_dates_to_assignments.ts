import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Adding computed dates to assignment tables if missing...');
  
  // Check and add computed_start_date to scenario_project_assignments
  const hasComputedStartInScenario = await knex.schema.hasColumn('scenario_project_assignments', 'computed_start_date');
  if (!hasComputedStartInScenario) {
    await knex.schema.alterTable('scenario_project_assignments', (table) => {
      table.date('computed_start_date');
      table.date('computed_end_date');
    });
    console.log('✅ Added computed dates to scenario_project_assignments');
  }
  
  // Check and add computed_start_date to project_assignments  
  const hasComputedStartInProject = await knex.schema.hasColumn('project_assignments', 'computed_start_date');
  if (!hasComputedStartInProject) {
    await knex.schema.alterTable('project_assignments', (table) => {
      table.date('computed_start_date');
      table.date('computed_end_date');
    });
    console.log('✅ Added computed dates to project_assignments');
  }
  
  // Recreate the assignments_view to ensure it works properly
  await knex.raw('DROP VIEW IF EXISTS assignments_view');
  
  await knex.raw(`
    CREATE VIEW assignments_view AS
    SELECT 
      -- Use scenario assignment ID prefixed with 'spa-'
      'spa-' || spa.id AS id,
      spa.project_id,
      spa.person_id,
      spa.role_id,
      spa.phase_id,
      spa.allocation_percentage,
      spa.assignment_date_mode,
      spa.start_date,
      spa.end_date,
      spa.notes,
      spa.created_at,
      spa.updated_at,
      COALESCE(spa.computed_start_date, spa.start_date) AS computed_start_date,
      COALESCE(spa.computed_end_date, spa.end_date) AS computed_end_date,
      'scenario' AS assignment_type,
      spa.scenario_id,
      s.name AS scenario_name,
      s.scenario_type
    FROM scenario_project_assignments spa
    JOIN scenarios s ON spa.scenario_id = s.id
    WHERE s.status = 'active'
    
    UNION ALL
    
    SELECT 
      pa.id,
      pa.project_id,
      pa.person_id,
      pa.role_id,
      pa.phase_id,
      pa.allocation_percentage,
      pa.assignment_date_mode,
      pa.start_date,
      pa.end_date,
      pa.notes,
      pa.created_at,
      pa.updated_at,
      COALESCE(pa.computed_start_date, pa.start_date) AS computed_start_date,
      COALESCE(pa.computed_end_date, pa.end_date) AS computed_end_date,
      'direct' AS assignment_type,
      'baseline-0000-0000-0000-000000000000' AS scenario_id,
      'Baseline' AS scenario_name,
      'baseline' AS scenario_type
    FROM project_assignments pa
  `);
  
  console.log('✅ Updated assignments_view with computed dates');
}

export async function down(_knex: Knex): Promise<void> {
  // Note: We don't remove the columns in down migration as they may contain data
  console.log('Note: Computed date columns are not removed to preserve data');
}