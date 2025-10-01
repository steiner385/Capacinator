import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create a view that provides utilization data with proper date filtering support
  await knex.raw(`
    CREATE VIEW IF NOT EXISTS utilization_report_view AS
    WITH date_filtered_assignments AS (
      SELECT 
        person_id,
        project_id,
        allocation_percentage,
        computed_start_date,
        computed_end_date
      FROM assignments_view
      WHERE computed_start_date IS NOT NULL 
        AND computed_end_date IS NOT NULL
    )
    SELECT 
      p.id as person_id,
      p.name as person_name,
      p.email as person_email,
      p.worker_type,
      p.default_availability_percentage,
      p.default_hours_per_day,
      p.is_active,
      pr.role_id as primary_role_id,
      r.name as primary_role_name,
      pr.proficiency_level as primary_role_proficiency,
      l.name as location_name,
      dfa.allocation_percentage,
      dfa.computed_start_date as assignment_start,
      dfa.computed_end_date as assignment_end,
      proj.name as project_name,
      proj.id as project_id
    FROM people p
    LEFT JOIN person_roles pr ON p.primary_person_role_id = pr.id
    LEFT JOIN roles r ON pr.role_id = r.id
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN date_filtered_assignments dfa ON p.id = dfa.person_id
    LEFT JOIN projects proj ON dfa.project_id = proj.id
    WHERE p.is_active = 1;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP VIEW IF EXISTS utilization_report_view');
}