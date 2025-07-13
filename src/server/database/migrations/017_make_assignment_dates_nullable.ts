import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Making assignment dates nullable for phase/project modes...');
  
  // First, drop views that reference project_assignments table
  const viewsToDropForward = [
    'person_utilization_view',
    'project_health_view'
  ];
  
  for (const viewName of viewsToDropForward) {
    await knex.raw(`DROP VIEW IF EXISTS ${viewName}`);
  }
  
  // Check if the database supports ALTER COLUMN (SQLite doesn't)
  // We need to recreate the table for SQLite
  
  // First, create the new table structure
  await knex.schema.createTable('project_assignments_new', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(hex(randomblob(16)))'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('person_id').notNullable().references('id').inTable('people').onDelete('CASCADE');
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('phase_id').nullable().references('id').inTable('project_phases').onDelete('SET NULL');
    table.date('start_date').nullable(); // Changed to nullable
    table.date('end_date').nullable();   // Changed to nullable
    table.decimal('allocation_percentage', 5, 2).notNullable();
    table.timestamps(true, true);
    
    // New columns for flexible dating
    table.enum('assignment_date_mode', ['fixed', 'phase', 'project']).defaultTo('fixed');
    table.date('computed_start_date').nullable();
    table.date('computed_end_date').nullable();
    table.text('notes').nullable();
    
    // Indexes
    table.index(['project_id']);
    table.index(['person_id']);
    table.index(['role_id']);
    table.index(['phase_id']);
    table.index(['assignment_date_mode']);
    table.index(['start_date']);
    table.index(['end_date']);
    table.index(['computed_start_date']);
    table.index(['computed_end_date']);
  });
  
  // Copy data from old table to new table
  await knex.raw(`
    INSERT INTO project_assignments_new (
      id, project_id, person_id, role_id, phase_id, start_date, end_date, 
      allocation_percentage, created_at, updated_at, assignment_date_mode, 
      computed_start_date, computed_end_date, notes
    )
    SELECT 
      id, project_id, person_id, role_id, phase_id, start_date, end_date,
      allocation_percentage, created_at, updated_at, 
      COALESCE(assignment_date_mode, 'fixed') as assignment_date_mode,
      computed_start_date, computed_end_date, notes
    FROM project_assignments
  `);
  
  // Drop the old table
  await knex.schema.dropTable('project_assignments');
  
  // Rename the new table
  await knex.schema.renameTable('project_assignments_new', 'project_assignments');
  
  // Recreate the views that we dropped
  await knex.raw(`
    CREATE VIEW person_utilization_view AS
    SELECT 
      p.id as person_id,
      p.name as person_name,
      p.supervisor_id,
      sup.name as supervisor_name,
      COALESCE(SUM(pa.allocation_percentage), 0) as total_allocation,
      COUNT(DISTINCT pa.project_id) as project_count,
      GROUP_CONCAT(DISTINCT pr.name) as projects,
      p.default_availability_percentage,
      p.default_hours_per_day,
      -- Current availability considering overrides
      COALESCE(
        (SELECT pao.availability_percentage 
         FROM person_availability_overrides pao 
         WHERE pao.person_id = p.id 
           AND DATE('now') BETWEEN pao.start_date AND pao.end_date 
           AND pao.is_approved = 1 
         LIMIT 1),
        p.default_availability_percentage
      ) as current_availability_percentage,
      CASE 
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) > 100 THEN 'OVER_ALLOCATED'
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) >= 90 THEN 'FULLY_ALLOCATED'
        WHEN COALESCE(SUM(pa.allocation_percentage), 0) >= 50 THEN 'PARTIALLY_ALLOCATED'
        ELSE 'UNDER_ALLOCATED'
      END as allocation_status
    FROM people p
    LEFT JOIN people sup ON p.supervisor_id = sup.id
    LEFT JOIN project_assignments pa ON p.id = pa.person_id 
      AND pa.computed_start_date <= DATE('now', '+30 days')
      AND pa.computed_end_date >= DATE('now')
    LEFT JOIN projects pr ON pa.project_id = pr.id
    GROUP BY p.id, p.name, p.supervisor_id, sup.name, p.default_availability_percentage, p.default_hours_per_day
  `);

  await knex.raw(`
    CREATE VIEW project_health_view AS
    SELECT 
      p.id as project_id,
      p.name as project_name,
      p.project_type_id,
      pt.name as project_type,
      p.project_sub_type_id,
      pst.name as project_sub_type,
      p.location_id,
      l.name as location,
      p.priority,
      p.aspiration_start,
      p.aspiration_finish,
      p.owner_id,
      owner.name as owner_name,
      -- Count phases
      (SELECT COUNT(*) FROM project_phases_timeline WHERE project_id = p.id) as phase_count,
      -- Count assignments
      (SELECT COUNT(DISTINCT person_id) FROM project_assignments WHERE project_id = p.id) as people_assigned,
      -- Count planners
      (SELECT COUNT(*) FROM project_planners WHERE project_id = p.id) as planner_count,
      -- Primary planner
      (SELECT pp_person.name 
       FROM project_planners pp 
       INNER JOIN people pp_person ON pp.person_id = pp_person.id
       WHERE pp.project_id = p.id AND pp.is_primary_planner = 1 
       LIMIT 1) as primary_planner_name,
      -- Calculate health status
      CASE 
        WHEN p.aspiration_start IS NULL OR p.aspiration_finish IS NULL THEN 'PLANNING'
        WHEN DATE('now') < p.aspiration_start THEN 'NOT_STARTED'
        WHEN DATE('now') > p.aspiration_finish THEN 'OVERDUE'
        WHEN (SELECT COUNT(*) FROM project_assignments WHERE project_id = p.id) = 0 THEN 'NO_RESOURCES'
        WHEN (SELECT COUNT(*) FROM project_phases_timeline WHERE project_id = p.id) = 0 THEN 'NO_TIMELINE'
        ELSE 'ACTIVE'
      END as health_status
    FROM projects p
    LEFT JOIN project_types pt ON p.project_type_id = pt.id
    LEFT JOIN project_sub_types pst ON p.project_sub_type_id = pst.id
    LEFT JOIN locations l ON p.location_id = l.id
    LEFT JOIN people owner ON p.owner_id = owner.id
  `);
  
  console.log('✅ Made assignment dates nullable for flexible dating modes');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Reverting assignment dates to NOT NULL...');
  
  // Create the old table structure
  await knex.schema.createTable('project_assignments_old', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(hex(randomblob(16)))'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('person_id').notNullable().references('id').inTable('people').onDelete('CASCADE');
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('phase_id').nullable().references('id').inTable('project_phases').onDelete('SET NULL');
    table.date('start_date').notNullable(); // Back to NOT NULL
    table.date('end_date').notNullable();   // Back to NOT NULL
    table.decimal('allocation_percentage', 5, 2).notNullable();
    table.timestamps(true, true);
    
    // Indexes
    table.index(['project_id']);
    table.index(['person_id']);
    table.index(['role_id']);
    table.index(['phase_id']);
    table.index(['start_date']);
    table.index(['end_date']);
  });
  
  // Copy data back (only assignments with non-null dates)
  await knex.raw(`
    INSERT INTO project_assignments_old (
      id, project_id, person_id, role_id, phase_id, start_date, end_date, 
      allocation_percentage, created_at, updated_at
    )
    SELECT 
      id, project_id, person_id, role_id, phase_id, start_date, end_date,
      allocation_percentage, created_at, updated_at
    FROM project_assignments
    WHERE start_date IS NOT NULL AND end_date IS NOT NULL
  `);
  
  // Drop the new table and rename old table back
  await knex.schema.dropTable('project_assignments');
  await knex.schema.renameTable('project_assignments_old', 'project_assignments');
  
  console.log('✅ Reverted assignment dates to NOT NULL constraints');
}