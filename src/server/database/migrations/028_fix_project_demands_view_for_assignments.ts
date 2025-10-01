import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Fixing project_demands_view to use actual assignments...');
  
  // Drop existing view
  await knex.raw('DROP VIEW IF EXISTS project_demands_view');
  
  // Create updated project_demands_view that uses scenario assignments
  await knex.raw(`
    CREATE VIEW project_demands_view AS
    SELECT 
      spa.project_id,
      p.name as project_name,
      p.description as project_description,
      p.priority,
      p.include_in_demand,
      spa.phase_id,
      -- Compute dates based on assignment mode
      CASE 
        WHEN spa.assignment_date_mode = 'fixed' THEN spa.start_date
        WHEN spa.assignment_date_mode = 'phase' AND ppt.start_date IS NOT NULL THEN ppt.start_date
        ELSE p.aspiration_start
      END as start_date,
      CASE 
        WHEN spa.assignment_date_mode = 'fixed' THEN spa.end_date
        WHEN spa.assignment_date_mode = 'phase' AND ppt.end_date IS NOT NULL THEN ppt.end_date
        ELSE p.aspiration_finish
      END as end_date,
      spa.role_id,
      r.name as role_name,
      spa.allocation_percentage,
      1 as people_count,
      spa.allocation_percentage as total_demand_percentage,
      -- Calculate hours based on assignment duration and allocation
      ROUND(
        (spa.allocation_percentage / 100.0) * 
        (
          julianday(
            CASE 
              WHEN spa.assignment_date_mode = 'fixed' THEN spa.end_date
              WHEN spa.assignment_date_mode = 'phase' AND ppt.end_date IS NOT NULL THEN ppt.end_date
              ELSE p.aspiration_finish
            END
          ) - julianday(
            CASE 
              WHEN spa.assignment_date_mode = 'fixed' THEN spa.start_date
              WHEN spa.assignment_date_mode = 'phase' AND ppt.start_date IS NOT NULL THEN ppt.start_date
              ELSE p.aspiration_start
            END
          )
        ) * 
        (5.0/7.0) * -- Working days ratio
        8.0 * -- Hours per day
        1
      ) as demand_hours,
      CASE 
        WHEN CASE 
          WHEN spa.assignment_date_mode = 'fixed' THEN spa.end_date
          WHEN spa.assignment_date_mode = 'phase' AND ppt.end_date IS NOT NULL THEN ppt.end_date
          ELSE p.aspiration_finish
        END < date('now') THEN 'PAST'
        WHEN CASE 
          WHEN spa.assignment_date_mode = 'fixed' THEN spa.start_date
          WHEN spa.assignment_date_mode = 'phase' AND ppt.start_date IS NOT NULL THEN ppt.start_date
          ELSE p.aspiration_start
        END > date('now') THEN 'FUTURE'
        ELSE 'CURRENT'
      END as time_status,
      -- Add project type information
      p.project_type_id,
      pt.name as project_type_name,
      spa.scenario_id,
      s.name as scenario_name,
      s.status as scenario_status
    FROM scenario_project_assignments spa
    JOIN scenarios s ON spa.scenario_id = s.id
    JOIN projects p ON spa.project_id = p.id
    JOIN project_types pt ON p.project_type_id = pt.id
    JOIN roles r ON spa.role_id = r.id
    LEFT JOIN project_phases_timeline ppt ON spa.phase_id = ppt.phase_id AND spa.project_id = ppt.project_id
    WHERE s.status = 'active'
      AND p.include_in_demand = 1
      AND spa.allocation_percentage > 0
  `);

  console.log('✅ Fixed project_demands_view to use scenario assignments');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Reverting project_demands_view...');
  
  // Drop the updated view
  await knex.raw('DROP VIEW IF EXISTS project_demands_view');
  
  // Recreate the original resource-template based view
  await knex.raw(`
    CREATE VIEW project_demands_view AS
    SELECT 
      p.id as project_id,
      p.name as project_name,
      p.description as project_description,
      p.priority,
      p.include_in_demand,
      pt.phase_id,
      pt.start_date,
      pt.end_date,
      rt.role_id,
      r.name as role_name,
      rt.allocation_percentage,
      1 as people_count,
      rt.allocation_percentage as total_demand_percentage,
      ROUND(
        (rt.allocation_percentage / 100.0) * 
        (julianday(pt.end_date) - julianday(pt.start_date)) * 
        (5.0/7.0) * 
        8.0 * 
        1
      ) as demand_hours,
      CASE 
        WHEN pt.end_date < date('now') THEN 'PAST'
        WHEN pt.start_date > date('now') THEN 'FUTURE'
        ELSE 'CURRENT'
      END as time_status,
      pst.project_type_id,
      ptype.name as project_type_name
    FROM projects p
    JOIN project_sub_types pst ON p.project_sub_type_id = pst.id
    JOIN project_types ptype ON pst.project_type_id = ptype.id
    LEFT JOIN project_type_phase_templates ptpt ON pst.project_type_id = ptpt.project_type_id
    LEFT JOIN phase_templates pht ON ptpt.phase_template_id = pht.id
    LEFT JOIN project_phases_timeline pt ON p.id = pt.project_id AND pt.phase_id = pht.id
    LEFT JOIN resource_templates rt ON pst.project_type_id = rt.project_type_id AND rt.phase_template_id = pht.id
    LEFT JOIN roles r ON rt.role_id = r.id
    WHERE p.include_in_demand = 1
      AND rt.allocation_percentage > 0
  `);
  
  console.log('✅ Reverted project_demands_view');
}