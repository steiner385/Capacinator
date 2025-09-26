import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create the scenario_assignments_view
  await knex.raw(`
    CREATE VIEW scenario_assignments_view AS
    SELECT 
      spa.id,
      spa.scenario_id,
      spa.project_id,
      spa.person_id,
      spa.role_id,
      spa.phase_id,
      spa.allocation_percentage,
      spa.assignment_date_mode,
      spa.start_date,
      spa.end_date,
      spa.base_assignment_id,
      spa.change_type,
      spa.is_billable,
      spa.is_aspirational,
      spa.notes,
      spa.created_at,
      spa.updated_at,
      sp.name as project_name,
      sp.aspiration_start as project_start,
      sp.aspiration_finish as project_finish,
      p.name as person_name,
      r.name as role_name,
      ph.name as phase_name,
      -- Computed dates based on assignment_date_mode
      CASE 
        WHEN spa.assignment_date_mode = 'fixed' THEN spa.start_date
        WHEN spa.assignment_date_mode = 'project' THEN sp.aspiration_start
        WHEN spa.assignment_date_mode = 'phase' THEN spp.start_date
      END as computed_start_date,
      CASE 
        WHEN spa.assignment_date_mode = 'fixed' THEN spa.end_date
        WHEN spa.assignment_date_mode = 'project' THEN sp.aspiration_finish
        WHEN spa.assignment_date_mode = 'phase' THEN spp.end_date
      END as computed_end_date
    FROM scenario_project_assignments spa
    JOIN scenario_projects sp ON spa.project_id = sp.project_id AND spa.scenario_id = sp.scenario_id
    JOIN people p ON spa.person_id = p.id
    JOIN roles r ON spa.role_id = r.id
    LEFT JOIN project_phases ph ON spa.phase_id = ph.id
    LEFT JOIN scenario_project_phases spp ON spa.phase_id = spp.phase_id 
      AND spp.project_id = spa.project_id 
      AND spp.scenario_id = spa.scenario_id
  `);

  // Add unique constraint for scenario assignments
  await knex.schema.alterTable('scenario_project_assignments', (table) => {
    table.unique(
      ['scenario_id', 'project_id', 'person_id', 'role_id', 'phase_id'],
      'uk_scenario_assignment'
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop the view
  await knex.raw('DROP VIEW IF EXISTS scenario_assignments_view');
  
  // Drop the unique constraint
  await knex.schema.alterTable('scenario_project_assignments', (table) => {
    table.dropUnique(
      ['scenario_id', 'project_id', 'person_id', 'role_id', 'phase_id'],
      'uk_scenario_assignment'
    );
  });
}