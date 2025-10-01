import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add computed date columns to scenario_project_assignments
  await knex.schema.alterTable('scenario_project_assignments', (table) => {
    table.string('computed_start_date');
    table.string('computed_end_date');
  });
  
  // Drop and recreate the assignments_view with the correct columns
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
      COALESCE(pa.computed_start_date, pa.start_date) AS computed_start_date,
      COALESCE(pa.computed_end_date, pa.end_date) AS computed_end_date,
      'direct' AS assignment_type,
      NULL AS scenario_id,
      NULL AS scenario_name
    FROM project_assignments pa
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP VIEW IF EXISTS assignments_view');
  
  await knex.schema.alterTable('scenario_project_assignments', (table) => {
    table.dropColumn('computed_start_date');
    table.dropColumn('computed_end_date');
  });
}