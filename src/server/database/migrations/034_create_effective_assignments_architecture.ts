import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Creating effective assignments architecture for unified scenario handling...');

  // 1. Create effective_project_assignments view that combines base and scenario assignments
  await knex.raw(`
    CREATE VIEW effective_project_assignments AS
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
      pa.computed_start_date,
      pa.computed_end_date,
      pa.notes,
      'base' as source_type,
      null as scenario_id,
      'added' as change_type,
      null as base_assignment_id,
      pa.created_at,
      pa.updated_at
    FROM project_assignments pa
    
    UNION ALL
    
    SELECT 
      spa.id,
      spa.project_id,
      spa.person_id,
      spa.role_id, 
      spa.phase_id,
      spa.allocation_percentage,
      spa.assignment_date_mode,
      spa.start_date,
      spa.end_date,
      spa.computed_start_date,
      spa.computed_end_date,
      spa.notes,
      'scenario' as source_type,
      spa.scenario_id,
      spa.change_type,
      spa.base_assignment_id,
      spa.created_at,
      spa.updated_at
    FROM scenario_project_assignments spa
  `);

  console.log('✅ Created effective_project_assignments view');

  // 2. Update project_demands_view to use effective assignments with proper scenario filtering
  await knex.raw('DROP VIEW IF EXISTS project_demands_view');
  
  await knex.raw(`
    CREATE VIEW project_demands_view AS
    SELECT 
      epa.project_id,
      p.name as project_name,
      p.description as project_description,
      p.priority,
      p.include_in_demand,
      epa.phase_id,
      -- Compute dates based on assignment mode
      CASE 
        WHEN epa.assignment_date_mode = 'fixed' THEN epa.start_date
        WHEN epa.assignment_date_mode = 'phase' AND ppt.start_date IS NOT NULL THEN ppt.start_date
        ELSE p.aspiration_start
      END as start_date,
      CASE 
        WHEN epa.assignment_date_mode = 'fixed' THEN epa.end_date
        WHEN epa.assignment_date_mode = 'phase' AND ppt.end_date IS NOT NULL THEN ppt.end_date
        ELSE p.aspiration_finish
      END as end_date,
      epa.role_id,
      r.name as role_name,
      epa.allocation_percentage,
      1 as people_count,
      epa.allocation_percentage as total_demand_percentage,
      -- Calculate hours based on assignment duration and allocation
      ROUND(
        (epa.allocation_percentage / 100.0) * 
        (
          julianday(
            CASE 
              WHEN epa.assignment_date_mode = 'fixed' THEN epa.end_date
              WHEN epa.assignment_date_mode = 'phase' AND ppt.end_date IS NOT NULL THEN ppt.end_date
              ELSE p.aspiration_finish
            END
          ) - julianday(
            CASE 
              WHEN epa.assignment_date_mode = 'fixed' THEN epa.start_date
              WHEN epa.assignment_date_mode = 'phase' AND ppt.start_date IS NOT NULL THEN ppt.start_date
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
          WHEN epa.assignment_date_mode = 'fixed' THEN epa.end_date
          WHEN epa.assignment_date_mode = 'phase' AND ppt.end_date IS NOT NULL THEN ppt.end_date
          ELSE p.aspiration_finish
        END < date('now') THEN 'PAST'
        WHEN CASE 
          WHEN epa.assignment_date_mode = 'fixed' THEN epa.start_date
          WHEN epa.assignment_date_mode = 'phase' AND ppt.start_date IS NOT NULL THEN ppt.start_date
          ELSE p.aspiration_start
        END > date('now') THEN 'FUTURE'
        ELSE 'CURRENT'
      END as time_status,
      -- Add project type information
      p.project_type_id,
      pt.name as project_type_name,
      -- Scenario information (null for base assignments, populated for scenario assignments)
      epa.scenario_id,
      s.name as scenario_name,
      s.status as scenario_status,
      s.scenario_type,
      -- Assignment source information
      epa.source_type,
      epa.change_type
    FROM effective_project_assignments epa
    JOIN projects p ON epa.project_id = p.id
    JOIN project_types pt ON p.project_type_id = pt.id
    JOIN roles r ON epa.role_id = r.id
    LEFT JOIN scenarios s ON epa.scenario_id = s.id
    LEFT JOIN project_phases_timeline ppt ON epa.phase_id = ppt.phase_id AND epa.project_id = ppt.project_id
    WHERE p.include_in_demand = 1
      AND epa.allocation_percentage > 0
      AND (s.status = 'active' OR s.status IS NULL) -- Include base assignments (null scenario) and active scenarios
  `);

  console.log('✅ Updated project_demands_view to use effective assignments');

  // 3. Create a helper view for scenario-filtered assignments
  await knex.raw(`
    CREATE VIEW scenario_filtered_assignments AS
    SELECT 
      epa.*,
      s.scenario_type,
      s.parent_scenario_id
    FROM effective_project_assignments epa
    LEFT JOIN scenarios s ON epa.scenario_id = s.id
  `);

  console.log('✅ Created scenario_filtered_assignments helper view');

  console.log('✅ Effective assignments architecture created successfully');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Reverting effective assignments architecture...');

  // Drop the new views
  await knex.raw('DROP VIEW IF EXISTS scenario_filtered_assignments');
  await knex.raw('DROP VIEW IF EXISTS project_demands_view');
  await knex.raw('DROP VIEW IF EXISTS effective_project_assignments');

  // Recreate the previous project_demands_view from migration 028
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

  console.log('✅ Reverted to previous project_demands_view');
}