import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Creating baseline database schema...');

  // 1. Locations table
  await knex.schema.createTable('locations', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('name', 255).notNullable().unique();
    table.text('description');
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. Project types table
  await knex.schema.createTable('project_types', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('name', 255).notNullable().unique();
    table.text('description');
    table.string('color_code', 7).defaultTo('#000000');
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    table.string('parent_id', 36);
    table.boolean('is_parent').defaultTo(false);
    table.integer('level').defaultTo(0);
    table.integer('sort_order').defaultTo(0);
    table.boolean('is_default').notNullable().defaultTo(false);
    
    table.index(['parent_id'], 'idx_project_types_parent_id');
    table.index(['level'], 'idx_project_types_level');
    table.index(['sort_order'], 'idx_project_types_sort_order');
  });

  // 3. Project sub types table  
  await knex.schema.createTable('project_sub_types', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('project_type_id', 36).notNullable();
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('color_code', 7);
    table.integer('sort_order').defaultTo(0);
    table.boolean('is_default').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());
    
    table.foreign('project_type_id').references('id').inTable('project_types').onDelete('CASCADE');
    table.unique(['project_type_id', 'name']);
    table.index(['project_type_id']);
    table.index(['project_type_id', 'is_active']);
  });

  // 4. Project phases table
  await knex.schema.createTable('project_phases', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('name', 255).notNullable().unique();
    table.text('description');
    table.integer('order_index').notNullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 5. Roles table
  await knex.schema.createTable('roles', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('name', 255).notNullable().unique();
    table.string('external_id', 255).unique();
    table.text('description');
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 6. User roles table
  await knex.schema.createTable('user_roles', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('name', 255).notNullable().unique();
    table.string('description', 255).notNullable();
    table.integer('priority').notNullable().defaultTo(100);
    table.boolean('is_system_admin').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    
    table.index(['priority']);
    table.index(['is_system_admin']);
  });

  // 7. People table
  await knex.schema.createTable('people', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('name', 255).notNullable();
    table.string('email', 255).unique();
    table.string('primary_role_id', 36);
    table.enu('worker_type', ['FTE', 'Contractor', 'Consultant']).defaultTo('FTE');
    table.string('supervisor_id', 36);
    table.float('default_availability_percentage').defaultTo(100);
    table.float('default_hours_per_day').defaultTo(8);
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    table.string('user_role_id', 36);
    table.boolean('is_system_admin').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.datetime('last_login');
    table.string('location_id', 36);
    
    table.foreign('primary_role_id').references('id').inTable('roles').onDelete('RESTRICT');
    table.foreign('supervisor_id').references('id').inTable('people').onDelete('SET NULL');
    table.foreign('user_role_id').references('id').inTable('user_roles').onDelete('SET NULL');
    table.foreign('location_id').references('id').inTable('locations').onDelete('RESTRICT');
    table.index(['primary_role_id']);
    table.index(['supervisor_id']);
    table.index(['user_role_id']);
    table.index(['is_system_admin']);
    table.index(['is_active']);
    table.index(['location_id']);
  });

  // 8. Projects table
  await knex.schema.createTable('projects', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('name', 255).notNullable();
    table.string('project_type_id', 36);
    table.string('location_id', 36);
    table.integer('priority').notNullable().defaultTo(5);
    table.text('description');
    table.text('data_restrictions');
    table.boolean('include_in_demand').defaultTo(true);
    table.date('aspiration_start');
    table.date('aspiration_finish');
    table.string('external_id', 255).unique();
    table.string('owner_id', 36);
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    table.string('project_sub_type_id', 36).notNullable();
    table.string('current_phase_id', 36);
    
    table.foreign('project_type_id').references('id').inTable('project_types').onDelete('RESTRICT');
    table.foreign('location_id').references('id').inTable('locations').onDelete('RESTRICT');
    table.foreign('owner_id').references('id').inTable('people').onDelete('SET NULL');
    table.foreign('project_sub_type_id').references('id').inTable('project_sub_types').onDelete('SET NULL');
    table.foreign('current_phase_id').references('id').inTable('project_phases').onDelete('SET NULL');
    table.index(['project_type_id', 'location_id']);
    table.index(['priority']);
    table.index(['owner_id']);
    table.index(['project_type_id']);
    table.index(['project_sub_type_id']);
    table.index(['current_phase_id']);
  });

  // 9. Person roles table
  await knex.schema.createTable('person_roles', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('person_id', 36);
    table.string('role_id', 36);
    table.integer('proficiency_level').notNullable().defaultTo(3);
    table.boolean('is_primary').defaultTo(false);
    
    table.foreign('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.unique(['person_id', 'role_id']);
    table.index(['person_id', 'role_id']);
  });

  // 10. Project type phases table
  await knex.schema.createTable('project_type_phases', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('project_type_id', 36).notNullable();
    table.string('phase_id', 36).notNullable();
    table.boolean('is_inherited').defaultTo(false);
    table.integer('order_index').notNullable();
    table.integer('duration_weeks');
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    table.string('project_sub_type_id', 36);
    
    table.foreign('project_type_id').references('id').inTable('project_types').onDelete('CASCADE');
    table.foreign('phase_id').references('id').inTable('project_phases').onDelete('CASCADE');
    table.foreign('project_sub_type_id').references('id').inTable('project_sub_types').onDelete('CASCADE');
    table.unique(['project_type_id', 'phase_id']);
    table.unique(['project_type_id', 'order_index']);
    table.index(['project_type_id']);
    table.index(['phase_id']);
    table.index(['is_inherited']);
    table.index(['project_sub_type_id']);
  });

  // 11. Resource templates table
  await knex.schema.createTable('resource_templates', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('project_type_id', 36);
    table.string('phase_id', 36);
    table.string('role_id', 36);
    table.float('allocation_percentage').notNullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    table.boolean('is_inherited').defaultTo(false);
    table.string('parent_template_id', 255);
    table.string('project_sub_type_id', 36);
    
    table.foreign('project_type_id').references('id').inTable('project_types').onDelete('CASCADE');
    table.foreign('phase_id').references('id').inTable('project_phases').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.foreign('project_sub_type_id').references('id').inTable('project_sub_types').onDelete('CASCADE');
    table.unique(['project_type_id', 'phase_id', 'role_id']);
    table.index(['project_type_id', 'phase_id']);
    table.index(['project_type_id', 'is_inherited']);
    table.index(['project_sub_type_id']);
  });

  // 12. Role planners table
  await knex.schema.createTable('role_planners', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('role_id', 36);
    table.string('person_id', 36);
    table.boolean('is_primary').defaultTo(false);
    table.boolean('can_allocate_resources').defaultTo(true);
    table.boolean('can_approve_assignments').defaultTo(true);
    table.boolean('can_modify_standard_allocations').defaultTo(false);
    table.text('notes');
    table.datetime('assigned_at').defaultTo(knex.fn.now());
    table.string('assigned_by', 36);
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.foreign('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.foreign('assigned_by').references('id').inTable('people').onDelete('SET NULL');
    table.unique(['role_id', 'person_id']);
    table.index(['role_id', 'is_primary']);
    table.index(['person_id']);
  });

  // 13. Project planners table
  await knex.schema.createTable('project_planners', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('project_id', 36);
    table.string('person_id', 36);
    table.enu('permission_level', ['VIEWER', 'PLANNER', 'OWNER']).defaultTo('PLANNER');
    table.boolean('can_modify_type').defaultTo(true);
    table.boolean('can_modify_roadmap').defaultTo(true);
    table.boolean('can_add_overrides').defaultTo(true);
    table.boolean('can_assign_resources').defaultTo(false);
    table.boolean('is_primary_planner').defaultTo(false);
    table.datetime('assigned_at').defaultTo(knex.fn.now());
    table.string('assigned_by', 36);
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    
    table.foreign('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.foreign('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.foreign('assigned_by').references('id').inTable('people').onDelete('SET NULL');
    table.unique(['project_id', 'person_id']);
    table.index(['project_id', 'permission_level']);
    table.index(['person_id']);
  });

  // 14. Project phases timeline table
  await knex.schema.createTable('project_phases_timeline', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('project_id', 36);
    table.string('phase_id', 36);
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    
    table.foreign('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.foreign('phase_id').references('id').inTable('project_phases').onDelete('RESTRICT');
    table.unique(['project_id', 'phase_id']);
    table.index(['project_id', 'start_date', 'end_date']);
  });

  // 15. Demand overrides table
  await knex.schema.createTable('demand_overrides', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('project_id', 36);
    table.string('phase_id', 36);
    table.string('role_id', 36);
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.float('demand_hours').notNullable();
    table.string('reason', 255);
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    
    table.foreign('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.foreign('phase_id').references('id').inTable('project_phases').onDelete('RESTRICT');
    table.foreign('role_id').references('id').inTable('roles').onDelete('RESTRICT');
    table.index(['project_id', 'start_date', 'end_date']);
    table.index(['role_id', 'start_date', 'end_date']);
  });

  // 16. Project assignments table
  await knex.schema.createTable('project_assignments', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('project_id', 36).notNullable();
    table.string('person_id', 36).notNullable();
    table.string('role_id', 36).notNullable();
    table.string('phase_id', 36);
    table.date('start_date');
    table.date('end_date');
    table.float('allocation_percentage').notNullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    table.enu('assignment_date_mode', ['fixed', 'phase', 'project']).defaultTo('fixed');
    table.date('computed_start_date');
    table.date('computed_end_date');
    table.text('notes');
    
    table.foreign('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.foreign('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.foreign('phase_id').references('id').inTable('project_phases').onDelete('SET NULL');
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

  // Create essential database views that are needed for the app to work
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
      COUNT(DISTINCT rt.project_sub_type_id) as projects_needing_role,
      COALESCE(AVG(rt.allocation_percentage), 0) as avg_allocation_needed,
      COALESCE(SUM(rt.allocation_percentage * 0.01 * 8 / 40), 0) as total_demand_fte
    FROM roles r
    LEFT JOIN people p ON r.id = p.primary_role_id
    LEFT JOIN resource_templates rt ON r.id = rt.role_id
    GROUP BY r.id, r.name
    ORDER BY r.name
  `);

  console.log('✅ Baseline database schema created successfully');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Dropping all database objects...');

  // Drop views first
  await knex.raw('DROP VIEW IF EXISTS capacity_gaps_view');

  // Drop tables in correct order
  const tables = [
    'resource_templates',
    'projects', 
    'people', 
    'roles', 
    'project_phases', 
    'project_sub_types', 
    'project_types', 
    'locations',
    'user_roles'
  ];

  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }

  console.log('✅ All database objects dropped');
}