import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create scenarios table
  const hasScenarios = await knex.schema.hasTable('scenarios');
  if (!hasScenarios) {
    await knex.schema.createTable('scenarios', (table) => {
      table.text('id').primary();
      table.text('name').notNullable();
      table.text('description');
      table.text('parent_scenario_id').references('id').inTable('scenarios');
      table.text('created_by').notNullable().references('id').inTable('people');
      table.text('status').defaultTo('active');
      table.text('scenario_type').defaultTo('branch');
      table.timestamp('branch_point');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.index(['parent_scenario_id']);
      table.index(['status']);
      table.index(['scenario_type']);
    });
  }

  // Create scenario_project_assignments table
  const hasScenarioAssignments = await knex.schema.hasTable('scenario_project_assignments');
  if (!hasScenarioAssignments) {
    await knex.schema.createTable('scenario_project_assignments', (table) => {
      table.text('id').primary();
      table.text('scenario_id').notNullable().references('id').inTable('scenarios').onDelete('CASCADE');
      table.text('project_id').notNullable().references('id').inTable('projects');
      table.text('person_id').notNullable().references('id').inTable('people');
      table.text('role_id').notNullable().references('id').inTable('roles');
      table.text('phase_id').references('id').inTable('phases');
      table.integer('allocation_percentage').notNullable();
      table.text('assignment_date_mode').defaultTo('project');
      table.date('start_date');
      table.date('end_date');
      table.date('computed_start_date');
      table.date('computed_end_date');
      table.text('notes');
      table.text('change_type').defaultTo('added');
      table.text('base_assignment_id');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.unique(['scenario_id', 'project_id', 'person_id', 'role_id', 'phase_id']);
      table.index(['scenario_id']);
      table.index(['project_id']);
      table.index(['person_id']);
      table.index(['change_type']);
    });
  }

  // Create scenario_project_phases table
  const hasScenarioPhases = await knex.schema.hasTable('scenario_project_phases');
  if (!hasScenarioPhases) {
    await knex.schema.createTable('scenario_project_phases', (table) => {
      table.text('id').primary();
      table.text('scenario_id').notNullable().references('id').inTable('scenarios').onDelete('CASCADE');
      table.text('project_id').notNullable().references('id').inTable('projects');
      table.text('phase_id').notNullable().references('id').inTable('phases');
      table.date('start_date');
      table.date('end_date');
      table.text('notes');
      table.text('change_type').defaultTo('added');
      table.text('base_phase_timeline_id');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.unique(['scenario_id', 'project_id', 'phase_id']);
      table.index(['scenario_id']);
      table.index(['project_id']);
    });
  }

  // Create scenario_projects table
  const hasScenarioProjects = await knex.schema.hasTable('scenario_projects');
  if (!hasScenarioProjects) {
    await knex.schema.createTable('scenario_projects', (table) => {
      table.text('id').primary();
      table.text('scenario_id').notNullable().references('id').inTable('scenarios').onDelete('CASCADE');
      table.text('project_id').notNullable().references('id').inTable('projects');
      table.text('name');
      table.text('priority');
      table.date('aspiration_start');
      table.date('aspiration_finish');
      table.text('notes');
      table.text('change_type').defaultTo('added');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.unique(['scenario_id', 'project_id']);
      table.index(['scenario_id']);
      table.index(['project_id']);
    });
  }

  // Create scenario_merge_conflicts table
  const hasScenarioConflicts = await knex.schema.hasTable('scenario_merge_conflicts');
  if (!hasScenarioConflicts) {
    await knex.schema.createTable('scenario_merge_conflicts', (table) => {
      table.text('id').primary();
      table.text('source_scenario_id').notNullable().references('id').inTable('scenarios');
      table.text('target_scenario_id').notNullable().references('id').inTable('scenarios');
      table.text('conflict_type').notNullable();
      table.text('entity_id').notNullable();
      table.text('source_data');
      table.text('target_data');
      table.text('resolution').defaultTo('pending');
      table.text('resolved_data');
      table.text('resolved_by').references('id').inTable('people');
      table.timestamp('resolved_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['source_scenario_id']);
      table.index(['target_scenario_id']);
      table.index(['resolution']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('scenario_merge_conflicts');
  await knex.schema.dropTableIfExists('scenario_projects');
  await knex.schema.dropTableIfExists('scenario_project_phases');
  await knex.schema.dropTableIfExists('scenario_project_assignments');
  await knex.schema.dropTableIfExists('scenarios');
}