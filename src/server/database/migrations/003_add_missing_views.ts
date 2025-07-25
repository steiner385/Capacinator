import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Creating missing database views...');
  
  // Create person_utilization_view
  await knex.raw(`
    CREATE VIEW IF NOT EXISTS person_utilization_view AS
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

  // Create project_demands_view based on resource templates
  // Since we don't have a project_demands table, we'll create a view based on resource_templates
  await knex.raw(`
    CREATE VIEW IF NOT EXISTS project_demands_view AS
    SELECT 
      rt.id,
      rt.project_id,
      rt.role_id,
      1 as quantity,
      p.aspiration_start as start_date,
      p.aspiration_finish as end_date,
      rt.notes,
      rt.created_at,
      rt.updated_at
    FROM resource_templates rt
    JOIN projects p ON rt.project_id = p.id
    WHERE rt.project_id IS NOT NULL
  `);

  // Update capacity_gaps_view to include status column
  await knex.raw('DROP VIEW IF EXISTS capacity_gaps_view');
  
  await knex.raw(`
    CREATE VIEW capacity_gaps_view AS
    SELECT 
      r.id as role_id,
      r.name as role_name,
      COUNT(DISTINCT p.id) as people_count,
      COALESCE(SUM(
        CASE 
          WHEN p.worker_type = 'FTE' THEN p.default_availability_percentage / 100.0
          WHEN p.worker_type IN ('Contractor', 'Consultant') THEN p.default_availability_percentage / 100.0 * 0.8
          ELSE p.default_availability_percentage / 100.0
        END
      ), 0) as total_capacity_fte,
      COALESCE(AVG(rt.allocation_percentage), 0) as avg_allocation_needed,
      COALESCE(SUM(rt.allocation_percentage * 0.01 * 8 / 40), 0) as total_demand_fte,
      CASE 
        WHEN COUNT(DISTINCT p.id) = 0 AND COALESCE(SUM(rt.allocation_percentage * 0.01), 0) > 0 THEN 'GAP'
        WHEN COALESCE(SUM(
          CASE 
            WHEN p.worker_type = 'FTE' THEN p.default_availability_percentage / 100.0
            WHEN p.worker_type IN ('Contractor', 'Consultant') THEN p.default_availability_percentage / 100.0 * 0.8
            ELSE p.default_availability_percentage / 100.0
          END
        ), 0) < COALESCE(SUM(rt.allocation_percentage * 0.01), 0) THEN 'GAP'
        ELSE 'OK'
      END as status
    FROM roles r
    LEFT JOIN person_roles pr ON r.id = pr.role_id
    LEFT JOIN people p ON pr.id = p.primary_person_role_id
    LEFT JOIN resource_templates rt ON r.id = rt.role_id
    GROUP BY r.id, r.name
    ORDER BY r.name
  `);

  console.log('✅ Created missing database views');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Dropping added views...');
  
  await knex.raw('DROP VIEW IF EXISTS person_utilization_view');
  await knex.raw('DROP VIEW IF EXISTS project_demands_view');
  
  // Restore original capacity_gaps_view without status column
  await knex.raw('DROP VIEW IF EXISTS capacity_gaps_view');
  
  await knex.raw(`
    CREATE VIEW capacity_gaps_view AS
    SELECT 
      r.id as role_id,
      r.name as role_name,
      COUNT(DISTINCT p.id) as people_count,
      COALESCE(SUM(
        CASE 
          WHEN p.worker_type = 'FTE' THEN p.default_availability_percentage / 100.0
          WHEN p.worker_type IN ('Contractor', 'Consultant') THEN p.default_availability_percentage / 100.0 * 0.8
          ELSE p.default_availability_percentage / 100.0
        END
      ), 0) as total_capacity_fte,
      COALESCE(AVG(rt.allocation_percentage), 0) as avg_allocation_needed,
      COALESCE(SUM(rt.allocation_percentage * 0.01 * 8 / 40), 0) as total_demand_fte
    FROM roles r
    LEFT JOIN person_roles pr ON r.id = pr.role_id
    LEFT JOIN people p ON pr.id = p.primary_person_role_id
    LEFT JOIN resource_templates rt ON r.id = rt.role_id
    GROUP BY r.id, r.name
    ORDER BY r.name
  `);
  
  console.log('✅ Dropped added views');
}