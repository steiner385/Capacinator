import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop the existing view that references the non-existent 'availability' table
  await knex.raw('DROP VIEW IF EXISTS person_utilization_view');
  
  // Recreate the view with the correct table name 'person_availability_overrides'
  await knex.raw(`
    CREATE VIEW person_utilization_view AS
    SELECT 
      p.id AS person_id,
      p.name AS person_name,
      p.email AS person_email,
      p.worker_type,
      -- Use current availability if exists, otherwise default
      COALESCE(pao.availability_percentage, p.default_availability_percentage) as current_availability_percentage,
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
        WHEN COALESCE(pao.availability_percentage, p.default_availability_percentage) = 0 THEN 'Unavailable'
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
      pao.reason as availability_reason,
      pao.start_date as availability_start,
      pao.end_date as availability_end
    FROM people p
    LEFT JOIN person_roles pr ON p.primary_person_role_id = pr.id
    LEFT JOIN roles r ON pr.role_id = r.id
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN scenario_project_assignments spa ON p.id = spa.person_id
    LEFT JOIN scenarios s ON spa.scenario_id = s.id
    -- Join with current availability from person_availability_overrides table
    LEFT JOIN person_availability_overrides pao ON p.id = pao.person_id 
      AND pao.start_date <= date('now') 
      AND pao.end_date >= date('now')
      AND pao.is_approved = true  -- Only consider approved overrides
    WHERE p.is_active = true
    GROUP BY p.id, p.name, p.email, p.worker_type, p.default_availability_percentage, 
             p.default_hours_per_day, r.id, r.name, pr.proficiency_level, l.name,
             pao.availability_percentage, pao.reason, pao.start_date, pao.end_date
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop the fixed view
  await knex.raw('DROP VIEW IF EXISTS person_utilization_view');
  
  // Recreate the original view (with the broken reference to 'availability' table)
  // This is included for completeness, but ideally this migration should not be rolled back
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
    LEFT JOIN availability av ON p.id = av.person_id 
      AND av.start_date <= date('now') 
      AND av.end_date >= date('now')
    WHERE p.is_active = true
    GROUP BY p.id, p.name, p.email, p.worker_type, p.default_availability_percentage, 
             p.default_hours_per_day, r.id, r.name, pr.proficiency_level, l.name,
             av.availability_percentage, av.reason, av.start_date, av.end_date
  `);
}