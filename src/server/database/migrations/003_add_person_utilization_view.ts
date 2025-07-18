import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Adding person_utilization_view and project_demands_view...');

  // Create person_utilization_view
  await knex.raw(`
    CREATE VIEW IF NOT EXISTS person_utilization_view AS
    SELECT 
      p.id as person_id,
      p.name as person_name,
      p.email as person_email,
      p.worker_type,
      p.default_availability_percentage,
      p.default_hours_per_day,
      pr.role_id as primary_role_id,
      r.name as primary_role_name,
      pr.proficiency_level as primary_role_proficiency,
      l.name as location_name,
      COALESCE(SUM(pa.allocation_percentage), 0) as total_allocation_percentage,
      COALESCE(SUM(pa.allocation_percentage * p.default_hours_per_day / 100.0), 0) as total_allocated_hours,
      p.default_hours_per_day as available_hours,
      CASE 
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) > 100 THEN 'OVER_ALLOCATED'
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) >= 90 THEN 'FULLY_ALLOCATED'
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) >= 50 THEN 'PARTIALLY_ALLOCATED'
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) > 0 THEN 'UNDER_ALLOCATED'
        ELSE 'AVAILABLE'
      END as allocation_status,
      COUNT(DISTINCT pa.project_id) as project_count,
      GROUP_CONCAT(DISTINCT proj.name) as project_names
    FROM people p
    LEFT JOIN person_roles pr ON p.primary_person_role_id = pr.id
    LEFT JOIN roles r ON pr.role_id = r.id
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN project_assignments pa ON p.id = pa.person_id
    LEFT JOIN projects proj ON pa.project_id = proj.id
    WHERE p.is_active = true
    GROUP BY p.id, p.name, p.email, p.worker_type, p.default_availability_percentage, 
             p.default_hours_per_day, pr.role_id, r.name, pr.proficiency_level, l.name
    ORDER BY p.name
  `);

  // Create project_demands_view
  await knex.raw(`
    CREATE VIEW IF NOT EXISTS project_demands_view AS
    SELECT 
      p.id as project_id,
      p.name as project_name,
      p.description as project_description,
      p.priority,
      p.include_in_demand,
      pt.start_date,
      pt.end_date,
      rt.role_id,
      r.name as role_name,
      rt.allocation_percentage,
      rt.people_count,
      rt.allocation_percentage * rt.people_count as total_demand_percentage,
      CASE 
        WHEN pt.end_date < date('now') THEN 'PAST'
        WHEN pt.start_date > date('now') THEN 'FUTURE'
        ELSE 'CURRENT'
      END as time_status
    FROM projects p
    JOIN project_phases_timeline pt ON p.id = pt.project_id
    JOIN project_sub_types pst ON p.project_sub_type_id = pst.id
    JOIN resource_templates rt ON pst.id = rt.project_sub_type_id
    JOIN roles r ON rt.role_id = r.id
    WHERE p.include_in_demand = true
    ORDER BY pt.start_date, p.priority DESC
  `);

  console.log('✅ Added person_utilization_view and project_demands_view');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Removing person_utilization_view and project_demands_view...');
  
  await knex.raw('DROP VIEW IF EXISTS project_demands_view');
  await knex.raw('DROP VIEW IF EXISTS person_utilization_view');
  
  console.log('✅ Removed person_utilization_view and project_demands_view');
}