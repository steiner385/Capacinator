import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create project_allocation_overrides table
  await knex.schema.createTable('project_allocation_overrides', (table) => {
    table.string('id').primary();
    table.string('project_id').notNullable();
    table.string('phase_id').notNullable();
    table.string('role_id').notNullable();
    table.decimal('allocation_percentage', 5, 2).notNullable();
    table.boolean('is_inherited').notNullable().defaultTo(false);
    table.string('template_id');
    table.text('notes');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.foreign('phase_id').references('id').inTable('project_phases').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.foreign('template_id').references('id').inTable('resource_templates').onDelete('SET NULL');

    // Indexes
    table.index(['project_id', 'phase_id', 'role_id'], 'idx_project_phase_role');
    table.index('project_id');
    table.index('is_inherited');

    // Unique constraint to prevent duplicate allocations
    table.unique(['project_id', 'phase_id', 'role_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_allocation_overrides');
}