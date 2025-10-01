import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop the existing view
  await knex.raw('DROP VIEW IF EXISTS assignments_view');

  // Recreate with scenario filtering support
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
      spa.computed_start_date,
      spa.computed_end_date,
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
      pa.computed_start_date,
      pa.computed_end_date,
      'direct' AS assignment_type,
      'baseline-0000-0000-0000-000000000000' AS scenario_id,
      'Baseline' AS scenario_name,
      'baseline' AS scenario_type
    FROM project_assignments pa
  `);

  // Create index for better performance
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_assignments_view_scenario 
    ON scenario_project_assignments(scenario_id, project_id, person_id);
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop the new index
  await knex.raw('DROP INDEX IF EXISTS idx_assignments_view_scenario');
  
  // Restore original view
  await knex.raw('DROP VIEW IF EXISTS assignments_view');
  
  await knex.raw(`
    CREATE VIEW IF NOT EXISTS assignments_view AS
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
      spa.computed_start_date,
      spa.computed_end_date,
      'scenario' AS assignment_type,
      spa.scenario_id,
      s.name AS scenario_name
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
      pa.computed_start_date,
      pa.computed_end_date,
      'direct' AS assignment_type,
      NULL AS scenario_id,
      NULL AS scenario_name
    FROM project_assignments pa
  `);
}