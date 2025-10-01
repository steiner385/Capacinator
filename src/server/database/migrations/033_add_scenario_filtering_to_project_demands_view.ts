import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop the existing view
  await knex.raw('DROP VIEW IF EXISTS project_demands_view');

  // Recreate with scenario filtering support
  await knex.raw(`
    CREATE VIEW project_demands_view AS
    SELECT 
      spa.id as assignment_id,
      spa.project_id,
      p.name as project_name,
      p.priority as project_priority,
      p.project_type_id,
      pt.name as project_type_name,
      spa.phase_id,
      ph.name as phase_name,
      spa.person_id,
      pe.name as person_name,
      spa.role_id,
      r.name as role_name,
      spa.allocation_percentage,
      spa.assignment_date_mode,
      spa.start_date,
      spa.end_date,
      spa.computed_start_date,
      spa.computed_end_date,
      -- Use computed dates if available, otherwise fall back to regular dates
      COALESCE(spa.computed_start_date, spa.start_date) as effective_start_date,
      COALESCE(spa.computed_end_date, spa.end_date) as effective_end_date,
      -- Calculate demand hours based on allocation and working days
      ROUND(
        (spa.allocation_percentage / 100.0) * 
        pe.default_hours_per_day * 
        (
          JULIANDAY(COALESCE(spa.computed_end_date, spa.end_date)) - 
          JULIANDAY(COALESCE(spa.computed_start_date, spa.start_date)) + 1
        ) * 5.0 / 7.0
      , 2) as demand_hours,
      spa.scenario_id,
      s.name as scenario_name,
      s.scenario_type
    FROM scenario_project_assignments spa
    JOIN scenarios s ON spa.scenario_id = s.id
    JOIN projects p ON spa.project_id = p.id
    JOIN people pe ON spa.person_id = pe.id
    JOIN roles r ON spa.role_id = r.id
    LEFT JOIN project_types pt ON p.project_type_id = pt.id
    LEFT JOIN project_phases ph ON spa.phase_id = ph.id
    WHERE s.status = 'active'
      AND spa.start_date IS NOT NULL 
      AND spa.end_date IS NOT NULL
      
    UNION ALL
    
    -- Include direct assignments when viewing baseline scenario
    SELECT 
      pa.id as assignment_id,
      pa.project_id,
      p.name as project_name,
      p.priority as project_priority,
      p.project_type_id,
      pt.name as project_type_name,
      pa.phase_id,
      ph.name as phase_name,
      pa.person_id,
      pe.name as person_name,
      pa.role_id,
      r.name as role_name,
      pa.allocation_percentage,
      pa.assignment_date_mode,
      pa.start_date,
      pa.end_date,
      pa.computed_start_date,
      pa.computed_end_date,
      -- Use computed dates if available, otherwise fall back to regular dates
      COALESCE(pa.computed_start_date, pa.start_date) as effective_start_date,
      COALESCE(pa.computed_end_date, pa.end_date) as effective_end_date,
      -- Calculate demand hours based on allocation and working days
      ROUND(
        (pa.allocation_percentage / 100.0) * 
        pe.default_hours_per_day * 
        (
          JULIANDAY(COALESCE(pa.computed_end_date, pa.end_date)) - 
          JULIANDAY(COALESCE(pa.computed_start_date, pa.start_date)) + 1
        ) * 5.0 / 7.0
      , 2) as demand_hours,
      'baseline-0000-0000-0000-000000000000' as scenario_id,
      'Baseline' as scenario_name,
      'baseline' as scenario_type
    FROM project_assignments pa
    JOIN projects p ON pa.project_id = p.id
    JOIN people pe ON pa.person_id = pe.id
    JOIN roles r ON pa.role_id = r.id
    LEFT JOIN project_types pt ON p.project_type_id = pt.id
    LEFT JOIN project_phases ph ON pa.phase_id = ph.id
    WHERE pa.start_date IS NOT NULL 
      AND pa.end_date IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop the updated view
  await knex.raw('DROP VIEW IF EXISTS project_demands_view');
  
  // Restore the previous version (from migration 028)
  await knex.raw(`
    CREATE VIEW project_demands_view AS
    SELECT 
      spa.id as assignment_id,
      spa.project_id,
      p.name as project_name,
      p.priority as project_priority,
      p.project_type_id,
      pt.name as project_type_name,
      spa.phase_id,
      ph.name as phase_name,
      spa.person_id,
      pe.name as person_name,
      spa.role_id,
      r.name as role_name,
      spa.allocation_percentage,
      spa.assignment_date_mode,
      spa.start_date,
      spa.end_date,
      spa.computed_start_date,
      spa.computed_end_date,
      -- Use computed dates if available, otherwise fall back to regular dates
      COALESCE(spa.computed_start_date, spa.start_date) as effective_start_date,
      COALESCE(spa.computed_end_date, spa.end_date) as effective_end_date,
      -- Calculate demand hours based on allocation and working days
      ROUND(
        (spa.allocation_percentage / 100.0) * 
        pe.default_hours_per_day * 
        (
          JULIANDAY(COALESCE(spa.computed_end_date, spa.end_date)) - 
          JULIANDAY(COALESCE(spa.computed_start_date, spa.start_date)) + 1
        ) * 5.0 / 7.0
      , 2) as demand_hours
    FROM scenario_project_assignments spa
    JOIN scenarios s ON spa.scenario_id = s.id
    JOIN projects p ON spa.project_id = p.id
    JOIN people pe ON spa.person_id = pe.id
    JOIN roles r ON spa.role_id = r.id
    LEFT JOIN project_types pt ON p.project_type_id = pt.id
    LEFT JOIN project_phases ph ON spa.phase_id = ph.id
    WHERE s.status = 'active'
      AND spa.start_date IS NOT NULL 
      AND spa.end_date IS NOT NULL
  `);
}