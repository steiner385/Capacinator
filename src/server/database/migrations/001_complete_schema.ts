import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Creating complete schema for Capacinator...');

  // 1. Create locations table
  await knex.schema.createTable('locations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.string('name').notNullable().unique();
    table.text('description');
    table.timestamps(true, true);
  });

  // 2. Create project_types table
  await knex.schema.createTable('project_types', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.string('name').notNullable().unique();
    table.text('description');
    table.string('color_code', 7).defaultTo('#000000');
    table.timestamps(true, true);
  });

  // 3. Create project_phases table
  await knex.schema.createTable('project_phases', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.string('name').notNullable().unique();
    table.text('description');
    table.integer('order_index').notNullable();
    table.timestamps(true, true);
  });

  // 4. Create roles table
  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.string('name').notNullable().unique();
    table.string('external_id').unique();
    table.text('description');
    table.timestamps(true, true);
  });

  // 5. Create people table (with supervisor hierarchy and availability)
  await knex.schema.createTable('people', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.string('name').notNullable();
    table.string('email').unique();
    table.uuid('primary_role_id').references('id').inTable('roles').onDelete('RESTRICT');
    table.enum('worker_type', ['FTE', 'Contractor', 'Consultant']).defaultTo('FTE');
    table.uuid('supervisor_id').references('id').inTable('people').onDelete('SET NULL');
    table.decimal('default_availability_percentage', 5, 2).defaultTo(100.00);
    table.decimal('default_hours_per_day', 4, 2).defaultTo(8.00);
    table.timestamps(true, true);
    
    table.index('primary_role_id');
    table.index('supervisor_id');
  });

  // 6. Create projects table (with owner)
  await knex.schema.createTable('projects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.string('name').notNullable();
    table.uuid('project_type_id').references('id').inTable('project_types').onDelete('RESTRICT');
    table.uuid('location_id').references('id').inTable('locations').onDelete('RESTRICT');
    table.integer('priority').notNullable().defaultTo(5);
    table.text('description');
    table.text('data_restrictions');
    table.boolean('include_in_demand').defaultTo(true);
    table.date('aspiration_start');
    table.date('aspiration_finish');
    table.string('external_id').unique();
    table.uuid('owner_id').references('id').inTable('people').onDelete('SET NULL');
    table.timestamps(true, true);
    
    table.index(['project_type_id', 'location_id']);
    table.index('priority');
    table.index('owner_id');
  });

  // 7. Create person_roles table (many-to-many)
  await knex.schema.createTable('person_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.uuid('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.integer('proficiency_level').notNullable().defaultTo(3);
    table.boolean('is_primary').defaultTo(false);
    
    table.unique(['person_id', 'role_id']);
    table.index(['person_id', 'role_id']);
  });

  // 8. Create role_planners table (multiple planners per role)
  await knex.schema.createTable('role_planners', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.boolean('is_primary').defaultTo(false);
    table.boolean('can_allocate_resources').defaultTo(true);
    table.boolean('can_approve_assignments').defaultTo(true);
    table.boolean('can_modify_standard_allocations').defaultTo(false);
    table.text('notes').nullable();
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.uuid('assigned_by').references('id').inTable('people').onDelete('SET NULL');
    table.timestamps(true, true);
    
    table.unique(['role_id', 'person_id']);
    table.index(['role_id', 'is_primary']);
    table.index('person_id');
  });

  // 9. Create project_planners table
  await knex.schema.createTable('project_planners', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.enum('permission_level', ['VIEWER', 'PLANNER', 'OWNER']).defaultTo('PLANNER');
    table.boolean('can_modify_type').defaultTo(true);
    table.boolean('can_modify_roadmap').defaultTo(true);
    table.boolean('can_add_overrides').defaultTo(true);
    table.boolean('can_assign_resources').defaultTo(false);
    table.boolean('is_primary_planner').defaultTo(false);
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.uuid('assigned_by').references('id').inTable('people').onDelete('SET NULL');
    table.timestamps(true, true);
    
    table.unique(['project_id', 'person_id']);
    table.index(['project_id', 'permission_level']);
    table.index('person_id');
  });

  // 10. Create standard_allocations table
  await knex.schema.createTable('standard_allocations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.uuid('project_type_id').references('id').inTable('project_types').onDelete('CASCADE');
    table.uuid('phase_id').references('id').inTable('project_phases').onDelete('CASCADE');
    table.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.decimal('allocation_percentage', 5, 2).notNullable();
    table.timestamps(true, true);
    
    table.unique(['project_type_id', 'phase_id', 'role_id']);
    table.index(['project_type_id', 'phase_id']);
  });

  // 11. Create project_phases_timeline table
  await knex.schema.createTable('project_phases_timeline', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('phase_id').references('id').inTable('project_phases').onDelete('RESTRICT');
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.timestamps(true, true);
    
    table.unique(['project_id', 'phase_id']);
    table.index(['project_id', 'start_date', 'end_date']);
  });

  // 12. Create demand_overrides table
  await knex.schema.createTable('demand_overrides', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('phase_id').references('id').inTable('project_phases').onDelete('RESTRICT').nullable();
    table.uuid('role_id').references('id').inTable('roles').onDelete('RESTRICT');
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.decimal('demand_hours', 10, 2).notNullable();
    table.string('reason').nullable();
    table.timestamps(true, true);
    
    table.index(['project_id', 'start_date', 'end_date']);
    table.index(['role_id', 'start_date', 'end_date']);
  });

  // 13. Create project_assignments table
  await knex.schema.createTable('project_assignments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.uuid('role_id').references('id').inTable('roles').onDelete('RESTRICT');
    table.uuid('phase_id').references('id').inTable('project_phases').onDelete('RESTRICT');
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.decimal('allocation_percentage', 5, 2).notNullable();
    table.timestamps(true, true);
    
    table.index(['project_id', 'person_id', 'start_date']);
    table.index(['person_id', 'start_date', 'end_date']);
  });

  // 14. Create person_availability_overrides table
  await knex.schema.createTable('person_availability_overrides', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.uuid('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.decimal('availability_percentage', 5, 2).notNullable();
    table.decimal('hours_per_day', 4, 2).nullable();
    table.enum('override_type', [
      'VACATION',
      'SICK_LEAVE', 
      'TRAINING',
      'PART_TIME_PERIOD',
      'BUBBLE_ASSIGNMENT',
      'PERSONAL_LEAVE',
      'REDUCED_HOURS',
      'INCREASED_HOURS',
      'OTHER'
    ]).notNullable();
    table.text('reason').nullable();
    table.boolean('is_approved').defaultTo(false);
    table.uuid('approved_by').references('id').inTable('people').onDelete('SET NULL');
    table.timestamp('approved_at').nullable();
    table.uuid('created_by').references('id').inTable('people').onDelete('SET NULL');
    table.timestamps(true, true);
    
    table.index(['person_id', 'start_date', 'end_date']);
    table.index(['start_date', 'end_date']);
    table.index('is_approved');
  });

  // 15. Create supervisor_delegations table
  await knex.schema.createTable('supervisor_delegations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.uuid('supervisor_id').references('id').inTable('people').onDelete('CASCADE');
    table.uuid('delegate_id').references('id').inTable('people').onDelete('CASCADE');
    table.uuid('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.boolean('can_approve_availability').defaultTo(true);
    table.boolean('can_view_availability').defaultTo(true);
    table.text('delegation_reason').nullable();
    table.timestamps(true, true);
    
    table.unique(['supervisor_id', 'delegate_id', 'person_id']);
    table.index(['delegate_id', 'person_id']);
  });

  // 16. Create audit tables
  await knex.schema.createTable('project_planning_audit', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('changed_by').references('id').inTable('people').onDelete('SET NULL');
    table.enum('change_type', [
      'PROJECT_TYPE_CHANGED',
      'PHASE_ADDED',
      'PHASE_MODIFIED',
      'PHASE_REMOVED',
      'OVERRIDE_ADDED',
      'OVERRIDE_MODIFIED',
      'OVERRIDE_REMOVED',
      'PLANNER_ADDED',
      'PLANNER_REMOVED',
      'PLANNER_PERMISSIONS_CHANGED'
    ]).notNullable();
    table.json('old_value').nullable();
    table.json('new_value').nullable();
    table.text('comment').nullable();
    table.timestamp('changed_at').defaultTo(knex.fn.now());
    
    table.index(['project_id', 'changed_at']);
    table.index('changed_by');
  });

  await knex.schema.createTable('role_planning_audit', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('changed_by').references('id').inTable('people').onDelete('SET NULL');
    table.enum('change_type', [
      'PLANNER_ADDED',
      'PLANNER_REMOVED',
      'PLANNER_PERMISSIONS_CHANGED',
      'STANDARD_ALLOCATION_ADDED',
      'STANDARD_ALLOCATION_MODIFIED',
      'STANDARD_ALLOCATION_REMOVED',
      'RESOURCE_ALLOCATED',
      'RESOURCE_DEALLOCATED'
    ]).notNullable();
    table.json('old_value').nullable();
    table.json('new_value').nullable();
    table.text('comment').nullable();
    table.timestamp('changed_at').defaultTo(knex.fn.now());
    
    table.index(['role_id', 'changed_at']);
    table.index('changed_by');
  });

  await knex.schema.createTable('availability_audit', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.uuid('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.uuid('changed_by').references('id').inTable('people').onDelete('SET NULL');
    table.enum('change_type', [
      'DEFAULT_AVAILABILITY_CHANGED',
      'OVERRIDE_ADDED',
      'OVERRIDE_MODIFIED',
      'OVERRIDE_REMOVED',
      'OVERRIDE_APPROVED',
      'OVERRIDE_REJECTED',
      'SUPERVISOR_CHANGED'
    ]).notNullable();
    table.json('old_value').nullable();
    table.json('new_value').nullable();
    table.text('comment').nullable();
    table.timestamp('changed_at').defaultTo(knex.fn.now());
    
    table.index(['person_id', 'changed_at']);
    table.index('changed_by');
  });

  console.log('✅ All tables created successfully');
}

export async function down(knex: Knex): Promise<void> {
  // Drop in reverse dependency order
  await knex.schema.dropTableIfExists('availability_audit');
  await knex.schema.dropTableIfExists('role_planning_audit');
  await knex.schema.dropTableIfExists('project_planning_audit');
  await knex.schema.dropTableIfExists('supervisor_delegations');
  await knex.schema.dropTableIfExists('person_availability_overrides');
  await knex.schema.dropTableIfExists('project_assignments');
  await knex.schema.dropTableIfExists('demand_overrides');
  await knex.schema.dropTableIfExists('project_phases_timeline');
  await knex.schema.dropTableIfExists('standard_allocations');
  await knex.schema.dropTableIfExists('project_planners');
  await knex.schema.dropTableIfExists('role_planners');
  await knex.schema.dropTableIfExists('person_roles');
  await knex.schema.dropTableIfExists('projects');
  await knex.schema.dropTableIfExists('people');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('project_phases');
  await knex.schema.dropTableIfExists('project_types');
  await knex.schema.dropTableIfExists('locations');
}