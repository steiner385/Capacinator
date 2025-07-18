import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create scenarios table - represents different planning scenarios
  await knex.schema.createTable('scenarios', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.uuid('parent_scenario_id').nullable(); // null for baseline, references scenarios.id for branches
    table.uuid('created_by').notNullable(); // references people.id
    table.enum('status', ['active', 'archived', 'merged']).defaultTo('active');
    table.enum('scenario_type', ['baseline', 'branch', 'sandbox']).defaultTo('branch');
    table.timestamp('branch_point').nullable(); // when this scenario was branched from parent
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['parent_scenario_id']);
    table.index(['created_by']);
    table.index(['status']);
    table.index(['scenario_type']);
    
    // Foreign keys
    table.foreign('parent_scenario_id').references('id').inTable('scenarios').onDelete('SET NULL');
    table.foreign('created_by').references('id').inTable('people').onDelete('CASCADE');
  });

  // Create scenario_project_assignments - scenario-specific assignments
  await knex.schema.createTable('scenario_project_assignments', (table) => {
    table.uuid('id').primary();
    table.uuid('scenario_id').notNullable();
    table.uuid('project_id').notNullable();
    table.uuid('person_id').notNullable();
    table.uuid('role_id').notNullable();
    table.uuid('phase_id').nullable();
    table.decimal('allocation_percentage', 5, 2).notNullable();
    
    // Assignment date mode determines how dates are calculated
    table.enum('assignment_date_mode', ['fixed', 'phase', 'project']).defaultTo('project');
    
    // For fixed mode: explicit dates
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    
    table.text('notes').nullable();
    table.enum('change_type', ['added', 'modified', 'removed']).defaultTo('added');
    table.uuid('base_assignment_id').nullable(); // references project_assignments.id if this is a modification
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['scenario_id']);
    table.index(['project_id']);
    table.index(['person_id']);
    table.index(['role_id']);
    table.index(['change_type']);
    table.unique(['scenario_id', 'project_id', 'person_id', 'role_id', 'phase_id'], 'unique_scenario_assignment');
    
    // Foreign keys
    table.foreign('scenario_id').references('id').inTable('scenarios').onDelete('CASCADE');
    table.foreign('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.foreign('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.foreign('phase_id').references('id').inTable('project_phases').onDelete('SET NULL');
    table.foreign('base_assignment_id').references('id').inTable('project_assignments').onDelete('SET NULL');
  });

  // Create scenario_project_phases - scenario-specific phase timelines
  await knex.schema.createTable('scenario_project_phases', (table) => {
    table.uuid('id').primary();
    table.uuid('scenario_id').notNullable();
    table.uuid('project_id').notNullable();
    table.uuid('phase_id').notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.text('notes').nullable();
    table.enum('change_type', ['added', 'modified', 'removed']).defaultTo('added');
    table.uuid('base_phase_timeline_id').nullable(); // references project_phases_timeline.id
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['scenario_id']);
    table.index(['project_id']);
    table.index(['phase_id']);
    table.index(['change_type']);
    table.unique(['scenario_id', 'project_id', 'phase_id'], 'unique_scenario_phase');
    
    // Foreign keys
    table.foreign('scenario_id').references('id').inTable('scenarios').onDelete('CASCADE');
    table.foreign('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.foreign('phase_id').references('id').inTable('project_phases').onDelete('CASCADE');
    table.foreign('base_phase_timeline_id').references('id').inTable('project_phases_timeline').onDelete('SET NULL');
  });

  // Create scenario_projects - scenario-specific project modifications
  await knex.schema.createTable('scenario_projects', (table) => {
    table.uuid('id').primary();
    table.uuid('scenario_id').notNullable();
    table.uuid('project_id').notNullable();
    table.string('name').nullable(); // override project name
    table.integer('priority').nullable(); // override project priority
    table.date('aspiration_start').nullable(); // override start date
    table.date('aspiration_finish').nullable(); // override end date
    table.enum('change_type', ['added', 'modified', 'removed']).defaultTo('modified');
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['scenario_id']);
    table.index(['project_id']);
    table.index(['change_type']);
    table.unique(['scenario_id', 'project_id'], 'unique_scenario_project');
    
    // Foreign keys
    table.foreign('scenario_id').references('id').inTable('scenarios').onDelete('CASCADE');
    table.foreign('project_id').references('id').inTable('projects').onDelete('CASCADE');
  });

  // Create scenario_merge_conflicts - tracks conflicts during merge operations
  await knex.schema.createTable('scenario_merge_conflicts', (table) => {
    table.uuid('id').primary();
    table.uuid('source_scenario_id').notNullable(); // scenario being merged
    table.uuid('target_scenario_id').notNullable(); // scenario being merged into
    table.enum('conflict_type', ['assignment', 'phase_timeline', 'project_details']).notNullable();
    table.uuid('entity_id').notNullable(); // ID of the conflicting entity
    table.json('source_data').notNullable(); // data from source scenario
    table.json('target_data').notNullable(); // data from target scenario
    table.enum('resolution', ['use_source', 'use_target', 'manual', 'pending']).defaultTo('pending');
    table.json('resolved_data').nullable(); // final resolution data
    table.uuid('resolved_by').nullable(); // person who resolved the conflict
    table.timestamp('resolved_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['source_scenario_id']);
    table.index(['target_scenario_id']);
    table.index(['conflict_type']);
    table.index(['resolution']);
    
    // Foreign keys
    table.foreign('source_scenario_id').references('id').inTable('scenarios').onDelete('CASCADE');
    table.foreign('target_scenario_id').references('id').inTable('scenarios').onDelete('CASCADE');
    table.foreign('resolved_by').references('id').inTable('people').onDelete('SET NULL');
  });

  // Create a baseline scenario automatically
  // Only create baseline scenario if there are people in the database
  const firstPerson = await knex('people').select('id').first();
  if (firstPerson) {
    await knex('scenarios').insert({
      id: 'baseline-0000-0000-0000-000000000000',
      name: 'Baseline Plan',
      description: 'The current baseline plan that all scenarios branch from',
      parent_scenario_id: null,
      created_by: firstPerson.id,
      status: 'active',
      scenario_type: 'baseline',
      branch_point: null
    });
  }

  // Create views for scenario-aware data
  await knex.raw(`
    CREATE VIEW scenario_assignments_view AS
    SELECT 
      sa.scenario_id,
      sa.id as assignment_id,
      sa.project_id,
      sa.person_id,
      sa.role_id,
      sa.phase_id,
      sa.allocation_percentage,
      sa.assignment_date_mode,
      sa.start_date,
      sa.end_date,
      sa.notes,
      sa.change_type,
      sa.base_assignment_id,
      sa.created_at,
      sa.updated_at,
      -- Computed dates based on assignment mode
      CASE 
        WHEN sa.assignment_date_mode = 'fixed' THEN sa.start_date
        WHEN sa.assignment_date_mode = 'phase' THEN (
          SELECT spt.start_date 
          FROM scenario_project_phases spt 
          WHERE spt.scenario_id = sa.scenario_id 
            AND spt.project_id = sa.project_id 
            AND spt.phase_id = sa.phase_id
        )
        WHEN sa.assignment_date_mode = 'project' THEN (
          SELECT sp.aspiration_start 
          FROM scenario_projects sp 
          WHERE sp.scenario_id = sa.scenario_id 
            AND sp.project_id = sa.project_id
          UNION
          SELECT p.aspiration_start 
          FROM projects p 
          WHERE p.id = sa.project_id
          LIMIT 1
        )
      END as computed_start_date,
      CASE 
        WHEN sa.assignment_date_mode = 'fixed' THEN sa.end_date
        WHEN sa.assignment_date_mode = 'phase' THEN (
          SELECT spt.end_date 
          FROM scenario_project_phases spt 
          WHERE spt.scenario_id = sa.scenario_id 
            AND spt.project_id = sa.project_id 
            AND spt.phase_id = sa.phase_id
        )
        WHEN sa.assignment_date_mode = 'project' THEN (
          SELECT sp.aspiration_finish 
          FROM scenario_projects sp 
          WHERE sp.scenario_id = sa.scenario_id 
            AND sp.project_id = sa.project_id
          UNION
          SELECT p.aspiration_finish 
          FROM projects p 
          WHERE p.id = sa.project_id
          LIMIT 1
        )
      END as computed_end_date,
      -- Relations
      p.name as project_name,
      pe.name as person_name,
      r.name as role_name,
      ph.name as phase_name
    FROM scenario_project_assignments sa
    JOIN projects p ON sa.project_id = p.id
    JOIN people pe ON sa.person_id = pe.id
    JOIN roles r ON sa.role_id = r.id
    LEFT JOIN project_phases ph ON sa.phase_id = ph.id
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP VIEW IF EXISTS scenario_assignments_view');
  await knex.schema.dropTableIfExists('scenario_merge_conflicts');
  await knex.schema.dropTableIfExists('scenario_projects');
  await knex.schema.dropTableIfExists('scenario_project_phases');
  await knex.schema.dropTableIfExists('scenario_project_assignments');
  await knex.schema.dropTableIfExists('scenarios');
}