import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // First, update people to have primary_person_role_id set based on their primary roles
  await knex.raw(`
    UPDATE people 
    SET primary_person_role_id = (
      SELECT pr.id 
      FROM person_roles pr 
      WHERE pr.person_id = people.id 
      AND pr.is_primary = 1
      LIMIT 1
    )
    WHERE primary_person_role_id IS NULL
    AND EXISTS (
      SELECT 1 FROM person_roles pr 
      WHERE pr.person_id = people.id 
      AND pr.is_primary = 1
    )
  `);

  // Drop the existing capacity_gaps_view
  await knex.raw('DROP VIEW IF EXISTS capacity_gaps_view');

  // Create an improved capacity_gaps_view that correctly counts people and calculates capacity
  await knex.raw(`
    CREATE VIEW capacity_gaps_view AS
    WITH role_capacity AS (
      -- Calculate capacity per role based on people assigned to that role
      SELECT 
        r.id as role_id,
        r.name as role_name,
        COUNT(DISTINCT p.id) as people_count,
        -- Calculate total capacity in FTE for this role
        COALESCE(SUM(
          CASE 
            -- Each person contributes capacity based on their availability and work type
            WHEN p.worker_type = 'FTE' THEN (p.default_availability_percentage / 100.0)
            WHEN p.worker_type IN ('Contractor', 'Consultant') THEN (p.default_availability_percentage / 100.0) * 0.8
            ELSE (p.default_availability_percentage / 100.0)
          END
        ), 0) as total_capacity_fte,
        -- Calculate total capacity in hours per day
        COALESCE(SUM(
          p.default_hours_per_day * (p.default_availability_percentage / 100.0)
        ), 0) as total_capacity_hours
      FROM roles r
      LEFT JOIN person_roles pr ON r.id = pr.role_id
      LEFT JOIN people p ON pr.person_id = p.id AND p.is_active = 1
      GROUP BY r.id, r.name
    ),
    role_demand AS (
      -- Calculate demand per role from scenario assignments
      SELECT 
        r.id as role_id,
        -- Calculate demand from actual assignments
        COALESCE(SUM(
          spa.allocation_percentage / 100.0
        ), 0) as total_demand_fte,
        -- Calculate demand in hours per day
        COALESCE(SUM(
          (spa.allocation_percentage / 100.0) * 8.0
        ), 0) as total_demand_hours
      FROM roles r
      LEFT JOIN scenario_project_assignments spa ON r.id = spa.role_id
      LEFT JOIN scenarios s ON spa.scenario_id = s.id
      WHERE s.status = 'active'
      AND spa.start_date <= date('now')
      AND spa.end_date >= date('now')
      GROUP BY r.id
    )
    SELECT 
      rc.role_id,
      rc.role_name,
      rc.people_count,
      rc.total_capacity_fte,
      rc.total_capacity_hours,
      COALESCE(rd.total_demand_fte, 0) as total_demand_fte,
      COALESCE(rd.total_demand_hours, 0) as total_demand_hours,
      -- Calculate the gap
      rc.total_capacity_fte - COALESCE(rd.total_demand_fte, 0) as capacity_gap_fte,
      rc.total_capacity_hours - COALESCE(rd.total_demand_hours, 0) as capacity_gap_hours,
      -- Determine status based on the gap
      CASE 
        WHEN rc.people_count = 0 AND COALESCE(rd.total_demand_fte, 0) > 0 THEN 'GAP'
        WHEN rc.total_capacity_fte - COALESCE(rd.total_demand_fte, 0) < -0.5 THEN 'GAP'
        WHEN rc.total_capacity_fte - COALESCE(rd.total_demand_fte, 0) < 0 THEN 'TIGHT'
        ELSE 'OK'
      END as status
    FROM role_capacity rc
    LEFT JOIN role_demand rd ON rc.role_id = rd.role_id
    ORDER BY rc.role_name
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Restore the previous view
  await knex.raw('DROP VIEW IF EXISTS capacity_gaps_view');

  await knex.raw(`
    CREATE VIEW capacity_gaps_view AS
    SELECT 
      r.id as role_id,
      r.name as role_name,
      COUNT(DISTINCT p.id) as people_count,
      COALESCE(SUM(p.default_availability_percentage * p.default_hours_per_day / 8.0 / 100.0), 0) as total_capacity_fte,
      COALESCE(AVG(rt.allocation_percentage), 0) as avg_allocation_needed,
      COALESCE(SUM(rt.allocation_percentage * 0.01 * 8 / 40), 0) as total_demand_fte
    FROM roles r
    LEFT JOIN person_roles pr ON r.id = pr.role_id
    LEFT JOIN people p ON pr.id = p.primary_person_role_id AND p.is_active = true
    LEFT JOIN resource_templates rt ON r.id = rt.role_id
    GROUP BY r.id, r.name
    ORDER BY r.name
  `);
}