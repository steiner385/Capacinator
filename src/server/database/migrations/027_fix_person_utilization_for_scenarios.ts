import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Fixing person_utilization_view to use scenario assignments...');
  
  // Drop existing view
  await knex.raw('DROP VIEW IF EXISTS person_utilization_view');
  
  // Create updated person_utilization_view that looks at scenario assignments
  await knex.raw(`
    CREATE VIEW person_utilization_view AS
    SELECT 
      p.id AS person_id,
      p.name AS person_name,
      p.location_id,
      l.name AS location_name,
      r.name AS role_name,
      p.default_availability_percentage,
      p.default_hours_per_day,
      p.worker_type,
      COALESCE(
        SUM(
          CASE 
            -- Only count assignments from active scenarios
            WHEN s.status = 'active' AND spa.start_date <= date('now') AND spa.end_date >= date('now') 
            THEN spa.allocation_percentage 
            ELSE 0 
          END
        ) / 100.0, 
        0
      ) AS utilization_percentage,
      CASE 
        WHEN COALESCE(SUM(
          CASE 
            WHEN s.status = 'active' AND spa.start_date <= date('now') AND spa.end_date >= date('now') 
            THEN spa.allocation_percentage 
            ELSE 0 
          END
        ), 0) = 0 THEN 'Available'
        WHEN COALESCE(SUM(
          CASE 
            WHEN s.status = 'active' AND spa.start_date <= date('now') AND spa.end_date >= date('now') 
            THEN spa.allocation_percentage 
            ELSE 0 
          END
        ), 0) < 100 THEN 'Partially Allocated'
        WHEN COALESCE(SUM(
          CASE 
            WHEN s.status = 'active' AND spa.start_date <= date('now') AND spa.end_date >= date('now') 
            THEN spa.allocation_percentage 
            ELSE 0 
          END
        ), 0) = 100 THEN 'Fully Allocated'
        ELSE 'Over Allocated'
      END AS utilization_status
    FROM people p
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN person_roles pr ON p.primary_person_role_id = pr.id
    LEFT JOIN roles r ON pr.role_id = r.id
    LEFT JOIN scenario_project_assignments spa ON p.id = spa.person_id
    LEFT JOIN scenarios s ON spa.scenario_id = s.id
    GROUP BY p.id, p.name, p.location_id, l.name, r.name, 
             p.default_availability_percentage, p.default_hours_per_day, p.worker_type
  `);

  console.log('✅ Fixed person_utilization_view to use scenario assignments');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Reverting person_utilization_view...');
  
  // Drop the updated view
  await knex.raw('DROP VIEW IF EXISTS person_utilization_view');
  
  // Recreate the original view
  await knex.raw(`
    CREATE VIEW person_utilization_view AS
    SELECT 
      p.id AS person_id,
      p.name AS person_name,
      p.location_id,
      l.name AS location_name,
      r.name AS role_name,
      p.default_availability_percentage,
      p.default_hours_per_day,
      p.worker_type,
      COALESCE(
        SUM(pa.allocation_percentage) / 100.0, 
        0
      ) AS utilization_percentage,
      CASE 
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) = 0 THEN 'Available'
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) < 100 THEN 'Partially Allocated'
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) = 100 THEN 'Fully Allocated'
        ELSE 'Over Allocated'
      END AS utilization_status
    FROM people p
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN person_roles pr ON p.primary_person_role_id = pr.id
    LEFT JOIN roles r ON pr.role_id = r.id
    LEFT JOIN project_assignments pa ON p.id = pa.person_id
      AND pa.start_date <= date('now')
      AND pa.end_date >= date('now')
    GROUP BY p.id, p.name, p.location_id, l.name, r.name, 
             p.default_availability_percentage, p.default_hours_per_day, p.worker_type
  `);
  
  console.log('✅ Reverted person_utilization_view');
}