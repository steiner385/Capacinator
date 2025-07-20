import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Adding project_health_view for gaps analysis...');

  // Create project_health_view
  await knex.raw(`
    CREATE VIEW project_health_view AS
    SELECT 
      p.id as project_id,
      p.name as project_name,
      p.description as project_description,
      p.priority,
      p.aspiration_start,
      p.aspiration_finish,
      pt.name as project_type,
      pst.name as project_sub_type,
      l.name as location,
      CASE 
        WHEN p.aspiration_finish < date('now') THEN 'COMPLETED'
        WHEN p.aspiration_start > date('now') THEN 'PLANNED'
        WHEN p.aspiration_start <= date('now') AND p.aspiration_finish >= date('now') THEN 'ACTIVE'
        ELSE 'UNKNOWN'
      END as project_status,
      CASE 
        WHEN p.aspiration_finish < date('now') THEN 'COMPLETED'
        WHEN p.aspiration_start > date('now') THEN 'PLANNED'
        WHEN p.aspiration_start <= date('now') AND p.aspiration_finish >= date('now') THEN 'ACTIVE'
        ELSE 'UNKNOWN'
      END as health_status,
      CASE
        WHEN total_allocation.allocation_sum > 100 THEN 'OVER_ALLOCATED'
        WHEN total_allocation.allocation_sum >= 80 THEN 'FULLY_ALLOCATED'
        WHEN total_allocation.allocation_sum >= 40 THEN 'PARTIALLY_ALLOCATED'
        WHEN total_allocation.allocation_sum > 0 THEN 'UNDER_ALLOCATED'
        ELSE 'UNASSIGNED'
      END as allocation_health,
      COALESCE(total_allocation.allocation_sum, 0) as total_allocation_percentage,
      COALESCE(assignment_counts.assignment_count, 0) as assigned_people_count,
      COALESCE(assignment_counts.unique_roles, 0) as unique_roles_assigned
    FROM projects p
    LEFT JOIN project_types pt ON p.project_type_id = pt.id
    LEFT JOIN project_sub_types pst ON p.project_sub_type_id = pst.id
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN (
      SELECT 
        project_id,
        SUM(allocation_percentage) as allocation_sum
      FROM project_assignments
      GROUP BY project_id
    ) total_allocation ON p.id = total_allocation.project_id
    LEFT JOIN (
      SELECT 
        pa.project_id,
        COUNT(pa.id) as assignment_count,
        COUNT(DISTINCT pr.role_id) as unique_roles
      FROM project_assignments pa
      LEFT JOIN person_roles pr ON pa.person_id = pr.person_id
      GROUP BY pa.project_id
    ) assignment_counts ON p.id = assignment_counts.project_id
    WHERE p.is_active = true
    ORDER BY p.priority DESC, p.aspiration_start
  `);

  console.log('✅ Added project_health_view for gaps analysis');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Removing project_health_view...');
  
  await knex.raw('DROP VIEW IF EXISTS project_health_view');
  
  console.log('✅ Removed project_health_view');
}