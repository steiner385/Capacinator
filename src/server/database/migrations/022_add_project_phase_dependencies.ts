import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Creating project_phase_dependencies table...');

  // Create the project_phase_dependencies table
  await knex.schema.createTable('project_phase_dependencies', (table) => {
    table.string('id', 36).primary();
    table.string('project_id', 36).notNullable();
    table.string('predecessor_phase_timeline_id', 36).notNullable();
    table.string('successor_phase_timeline_id', 36).notNullable();
    table.enum('dependency_type', ['FS', 'SS', 'FF', 'SF']).notNullable().defaultTo('FS');
    table.integer('lag_days').nullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.foreign('predecessor_phase_timeline_id').references('id').inTable('project_phases_timeline').onDelete('CASCADE');
    table.foreign('successor_phase_timeline_id').references('id').inTable('project_phases_timeline').onDelete('CASCADE');

    // Ensure a predecessor cannot depend on its successor (prevent circular dependencies at DB level)
    table.unique(['predecessor_phase_timeline_id', 'successor_phase_timeline_id'], 'unique_dependency_pair');
    
    // Index for performance
    table.index('project_id', 'idx_phase_dependencies_project');
    table.index('predecessor_phase_timeline_id', 'idx_phase_dependencies_predecessor');
    table.index('successor_phase_timeline_id', 'idx_phase_dependencies_successor');
  });

  console.log('✅ Created project_phase_dependencies table with constraints and indexes');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Dropping project_phase_dependencies table...');
  
  await knex.schema.dropTableIfExists('project_phase_dependencies');
  
  console.log('✅ Dropped project_phase_dependencies table');
}