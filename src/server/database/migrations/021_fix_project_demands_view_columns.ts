import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Fixing project_demands_view missing columns...');

  // Drop the existing view
  await knex.raw('DROP VIEW IF EXISTS project_demands_view');

  // Create the fixed project_demands_view with missing columns
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
      -- Calculate hours based on project duration and allocation
      ROUND(
        (rt.allocation_percentage / 100.0) * 
        (julianday(pt.end_date) - julianday(pt.start_date)) * 
        (5.0/7.0) * -- Working days ratio
        8.0 * -- Hours per day
        1
      ) as demand_hours,
      CASE 
        WHEN pt.end_date < date('now') THEN 'PAST'
        WHEN pt.start_date > date('now') THEN 'FUTURE'
        ELSE 'CURRENT'
      END as time_status,
      -- Add project type information
      pst.project_type_id,
      ptypes.name as project_type_name,
      -- Add is_override column (false for standard allocations from templates)
      false as is_override
    FROM projects p
    JOIN project_phases_timeline pt ON p.id = pt.project_id
    JOIN project_sub_types pst ON p.project_sub_type_id = pst.id
    JOIN project_types ptypes ON pst.project_type_id = ptypes.id
    JOIN resource_templates rt ON pst.project_type_id = rt.project_type_id AND pt.phase_id = rt.phase_id
    JOIN roles r ON rt.role_id = r.id
    WHERE p.include_in_demand = true
    ORDER BY pt.start_date, p.priority DESC
  `);

  console.log('✅ Fixed project_demands_view with missing phase_id and renamed estimated_hours to demand_hours');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Reverting project_demands_view column fix...');
  
  // Drop the fixed view
  await knex.raw('DROP VIEW IF EXISTS project_demands_view');

  // Recreate the previous version with estimated_hours
  await knex.raw(`
    CREATE VIEW project_demands_view AS
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
      1 as people_count,
      rt.allocation_percentage as total_demand_percentage,
      -- Calculate hours based on project duration and allocation
      ROUND(
        (rt.allocation_percentage / 100.0) * 
        (julianday(pt.end_date) - julianday(pt.start_date)) * 
        (5.0/7.0) * -- Working days ratio
        8.0 * -- Hours per day
        1
      ) as estimated_hours,
      CASE 
        WHEN pt.end_date < date('now') THEN 'PAST'
        WHEN pt.start_date > date('now') THEN 'FUTURE'
        ELSE 'CURRENT'
      END as time_status,
      -- Add project type information
      pst.project_type_id,
      ptypes.name as project_type_name
    FROM projects p
    JOIN project_phases_timeline pt ON p.id = pt.project_id
    JOIN project_sub_types pst ON p.project_sub_type_id = pst.id
    JOIN project_types ptypes ON pst.project_type_id = ptypes.id
    JOIN resource_templates rt ON pst.project_type_id = rt.project_type_id AND pt.phase_id = rt.phase_id
    JOIN roles r ON rt.role_id = r.id
    WHERE p.include_in_demand = true
    ORDER BY pt.start_date, p.priority DESC
  `);
  
  console.log('✅ Reverted to previous project_demands_view without phase_id');
}