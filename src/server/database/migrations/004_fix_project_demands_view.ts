import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Fixing project_demands_view with correct join conditions...');

  // Drop the existing broken view
  await knex.raw('DROP VIEW IF EXISTS project_demands_view');

  // Create the corrected project_demands_view with proper join logic
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
      CASE 
        WHEN pt.end_date < date('now') THEN 'PAST'
        WHEN pt.start_date > date('now') THEN 'FUTURE'
        ELSE 'CURRENT'
      END as time_status
    FROM projects p
    JOIN project_phases_timeline pt ON p.id = pt.project_id
    JOIN project_sub_types pst ON p.project_sub_type_id = pst.id
    JOIN resource_templates rt ON pst.project_type_id = rt.project_type_id AND pt.phase_id = rt.phase_id
    JOIN roles r ON rt.role_id = r.id
    WHERE p.include_in_demand = true
    ORDER BY pt.start_date, p.priority DESC
  `);

  console.log('✅ Fixed project_demands_view with correct join conditions');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Reverting project_demands_view fix...');
  
  // Drop the fixed view
  await knex.raw('DROP VIEW IF EXISTS project_demands_view');

  // Recreate the original broken view (for rollback purposes)
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
      1 as people_count,
      rt.allocation_percentage as total_demand_percentage,
      CASE 
        WHEN pt.end_date < date('now') THEN 'PAST'
        WHEN pt.start_date > date('now') THEN 'FUTURE'
        ELSE 'CURRENT'
      END as time_status
    FROM projects p
    JOIN project_phases pt ON p.id = pt.project_id
    JOIN resource_templates rt ON p.project_type_id = rt.project_type_id AND pt.phase_id = rt.phase_id
    JOIN roles r ON rt.role_id = r.id
    WHERE p.include_in_demand = true
    ORDER BY pt.start_date, p.priority DESC
  `);
  
  console.log('✅ Reverted to original project_demands_view');
}