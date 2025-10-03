import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop the existing capacity_gaps_view
  await knex.raw('DROP VIEW IF EXISTS capacity_gaps_view');

  // Create an improved capacity_gaps_view that accounts for availability/vacation
  await knex.raw(`
    CREATE VIEW capacity_gaps_view AS
    WITH role_capacity AS (
      -- Calculate capacity per role based on people assigned to that role
      -- This now takes into account current availability entries
      SELECT 
        r.id as role_id,
        r.name as role_name,
        COUNT(DISTINCT p.id) as people_count,
        -- Calculate total capacity in FTE for this role, considering current availability
        COALESCE(SUM(
          CASE 
            -- Check if person has a current availability entry (vacation, training, etc.)
            WHEN av.availability_percentage IS NOT NULL THEN
              -- Use the availability entry percentage
              CASE 
                WHEN p.worker_type = 'FTE' THEN (av.availability_percentage / 100.0)
                WHEN p.worker_type IN ('Contractor', 'Consultant') THEN (av.availability_percentage / 100.0) * 0.8
                ELSE (av.availability_percentage / 100.0)
              END
            -- Otherwise use their default availability
            ELSE
              CASE 
                WHEN p.worker_type = 'FTE' THEN (p.default_availability_percentage / 100.0)
                WHEN p.worker_type IN ('Contractor', 'Consultant') THEN (p.default_availability_percentage / 100.0) * 0.8
                ELSE (p.default_availability_percentage / 100.0)
              END
          END
        ), 0) as total_capacity_fte,
        -- Calculate total capacity in hours per day
        COALESCE(SUM(
          p.default_hours_per_day * 
          CASE 
            WHEN av.availability_percentage IS NOT NULL THEN (av.availability_percentage / 100.0)
            ELSE (p.default_availability_percentage / 100.0)
          END
        ), 0) as total_capacity_hours,
        -- Count people currently on vacation or reduced availability
        COUNT(DISTINCT CASE WHEN av.availability_percentage < 100 THEN p.id END) as people_with_reduced_availability
      FROM roles r
      LEFT JOIN person_roles pr ON r.id = pr.role_id
      LEFT JOIN people p ON pr.person_id = p.id AND p.is_active = 1
      -- Join with current availability entries
      LEFT JOIN person_availability_overrides av ON p.id = av.person_id 
        AND av.start_date <= date('now') 
        AND av.end_date >= date('now')
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
      -- Additional fields for availability tracking
      rc.people_with_reduced_availability,
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

  // Also update the person_utilization_view to include current availability
  await knex.raw('DROP VIEW IF EXISTS person_utilization_view');

  await knex.raw(`
    CREATE VIEW person_utilization_view AS
    SELECT 
      p.id AS person_id,
      p.name AS person_name,
      p.email AS person_email,
      p.worker_type,
      -- Use current availability if exists, otherwise default
      COALESCE(av.availability_percentage, p.default_availability_percentage) as current_availability_percentage,
      p.default_hours_per_day,
      r.id AS primary_role_id,
      r.name AS primary_role_name,
      pr.proficiency_level AS primary_role_proficiency,
      l.name AS location_name,
      -- Calculate total allocation from active scenario assignments
      COALESCE(SUM(
        CASE 
          WHEN s.status = 'active' AND spa.start_date <= date('now') AND spa.end_date >= date('now') 
          THEN spa.allocation_percentage 
          ELSE 0 
        END
      ), 0) AS total_allocation_percentage,
      -- Count active projects
      COUNT(DISTINCT CASE 
        WHEN s.status = 'active' AND spa.start_date <= date('now') AND spa.end_date >= date('now') 
        THEN spa.project_id 
      END) AS project_count,
      -- Determine utilization status
      CASE 
        WHEN COALESCE(av.availability_percentage, p.default_availability_percentage) = 0 THEN 'Unavailable'
        WHEN COALESCE(SUM(
          CASE 
            WHEN s.status = 'active' AND spa.start_date <= date('now') AND spa.end_date >= date('now') 
            THEN spa.allocation_percentage 
            ELSE 0 
          END
        ), 0) >= 100 THEN 'Over-allocated'
        WHEN COALESCE(SUM(
          CASE 
            WHEN s.status = 'active' AND spa.start_date <= date('now') AND spa.end_date >= date('now') 
            THEN spa.allocation_percentage 
            ELSE 0 
          END
        ), 0) >= 80 THEN 'Fully-allocated'
        WHEN COALESCE(SUM(
          CASE 
            WHEN s.status = 'active' AND spa.start_date <= date('now') AND spa.end_date >= date('now') 
            THEN spa.allocation_percentage 
            ELSE 0 
          END
        ), 0) > 0 THEN 'Partially-allocated'
        ELSE 'Available'
      END AS utilization_status,
      -- Include vacation/availability info
      av.reason as availability_reason,
      av.start_date as availability_start,
      av.end_date as availability_end
    FROM people p
    LEFT JOIN person_roles pr ON p.primary_person_role_id = pr.id
    LEFT JOIN roles r ON pr.role_id = r.id
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN scenario_project_assignments spa ON p.id = spa.person_id
    LEFT JOIN scenarios s ON spa.scenario_id = s.id
    -- Join with current availability
    LEFT JOIN person_availability_overrides av ON p.id = av.person_id 
      AND av.start_date <= date('now') 
      AND av.end_date >= date('now')
    WHERE p.is_active = true
    GROUP BY p.id, p.name, p.email, p.worker_type, p.default_availability_percentage, 
             p.default_hours_per_day, r.id, r.name, pr.proficiency_level, l.name,
             av.availability_percentage, av.reason, av.start_date, av.end_date
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Restore previous views without availability support
  await knex.raw('DROP VIEW IF EXISTS person_utilization_view');
  await knex.raw('DROP VIEW IF EXISTS capacity_gaps_view');

  // Restore capacity_gaps_view from migration 029
  await knex.raw(`
    CREATE VIEW capacity_gaps_view AS
    WITH role_capacity AS (
      SELECT 
        r.id as role_id,
        r.name as role_name,
        COUNT(DISTINCT p.id) as people_count,
        COALESCE(SUM(
          CASE 
            WHEN p.worker_type = 'FTE' THEN (p.default_availability_percentage / 100.0)
            WHEN p.worker_type IN ('Contractor', 'Consultant') THEN (p.default_availability_percentage / 100.0) * 0.8
            ELSE (p.default_availability_percentage / 100.0)
          END
        ), 0) as total_capacity_fte,
        COALESCE(SUM(
          p.default_hours_per_day * (p.default_availability_percentage / 100.0)
        ), 0) as total_capacity_hours
      FROM roles r
      LEFT JOIN person_roles pr ON r.id = pr.role_id
      LEFT JOIN people p ON pr.person_id = p.id AND p.is_active = 1
      GROUP BY r.id, r.name
    ),
    role_demand AS (
      SELECT 
        r.id as role_id,
        COALESCE(SUM(
          spa.allocation_percentage / 100.0
        ), 0) as total_demand_fte,
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
      rc.total_capacity_fte - COALESCE(rd.total_demand_fte, 0) as capacity_gap_fte,
      rc.total_capacity_hours - COALESCE(rd.total_demand_hours, 0) as capacity_gap_hours,
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

  // Restore person_utilization_view from migration 027
  await knex.raw(`
    CREATE VIEW person_utilization_view AS
    SELECT 
      p.id AS person_id,
      p.name AS person_name,
      p.email AS person_email,
      p.worker_type,
      p.default_availability_percentage,
      p.default_hours_per_day,
      r.id AS primary_role_id,
      r.name AS primary_role_name,
      pr.proficiency_level AS primary_role_proficiency,
      l.name AS location_name,
      COALESCE(SUM(
        CASE 
          WHEN s.status = 'active' AND spa.start_date <= date('now') AND spa.end_date >= date('now') 
          THEN spa.allocation_percentage 
          ELSE 0 
        END
      ), 0) AS total_allocation_percentage,
      COUNT(DISTINCT CASE 
        WHEN s.status = 'active' AND spa.start_date <= date('now') AND spa.end_date >= date('now') 
        THEN spa.project_id 
      END) AS project_count,
      CASE 
        WHEN COALESCE(SUM(
          CASE 
            WHEN s.status = 'active' AND spa.start_date <= date('now') AND spa.end_date >= date('now') 
            THEN spa.allocation_percentage 
            ELSE 0 
          END
        ), 0) >= 100 THEN 'Over-allocated'
        WHEN COALESCE(SUM(
          CASE 
            WHEN s.status = 'active' AND spa.start_date <= date('now') AND spa.end_date >= date('now') 
            THEN spa.allocation_percentage 
            ELSE 0 
          END
        ), 0) >= 80 THEN 'Fully-allocated'
        WHEN COALESCE(SUM(
          CASE 
            WHEN s.status = 'active' AND spa.start_date <= date('now') AND spa.end_date >= date('now') 
            THEN spa.allocation_percentage 
            ELSE 0 
          END
        ), 0) > 0 THEN 'Partially-allocated'
        ELSE 'Available'
      END AS utilization_status
    FROM people p
    LEFT JOIN person_roles pr ON p.primary_person_role_id = pr.id
    LEFT JOIN roles r ON pr.role_id = r.id
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN scenario_project_assignments spa ON p.id = spa.person_id
    LEFT JOIN scenarios s ON spa.scenario_id = s.id
    WHERE p.is_active = true
    GROUP BY p.id, p.name, p.email, p.worker_type, p.default_availability_percentage, 
             p.default_hours_per_day, r.id, r.name, pr.proficiency_level, l.name
  `);
}