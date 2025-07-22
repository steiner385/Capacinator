import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop the existing capacity_gaps_view that uses incorrect column reference
  await knex.raw('DROP VIEW IF EXISTS capacity_gaps_view');
  
  // Recreate the view with correct column references using the person_roles table
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

export async function down(knex: Knex): Promise<void> {
  // Drop the corrected view
  await knex.raw('DROP VIEW IF EXISTS capacity_gaps_view');
  
  // Recreate the old view with the problematic column reference (for rollback)
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
    LEFT JOIN people p ON r.id = p.primary_role_id
    LEFT JOIN resource_templates rt ON r.id = rt.role_id
    GROUP BY r.id, r.name
    ORDER BY r.name
  `);
}