import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('project_allocation_overrides', (table) => {
    table.uuid('id').primary();
    table.uuid('project_id').notNullable();
    table.uuid('phase_id').notNullable();
    table.uuid('role_id').notNullable();
    table.decimal('allocation_percentage', 5, 2).notNullable();
    table.boolean('is_inherited').defaultTo(false).comment('Whether this allocation is inherited from project type');
    table.uuid('template_id').nullable().comment('ID of the resource template this overrides');
    table.text('notes').nullable().comment('Notes about why this allocation was overridden');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Foreign keys
    table.foreign('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.foreign('phase_id').references('id').inTable('project_phases').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.foreign('template_id').references('id').inTable('resource_templates').onDelete('SET NULL');
    
    // Ensure unique combination per project
    table.unique(['project_id', 'phase_id', 'role_id'], 'unique_project_phase_role');
    
    // Indexes for performance
    table.index(['project_id'], 'idx_project_allocations_project');
    table.index(['project_id', 'is_inherited'], 'idx_project_allocations_inheritance');
    table.index(['template_id'], 'idx_project_allocations_template');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('project_allocation_overrides');
}