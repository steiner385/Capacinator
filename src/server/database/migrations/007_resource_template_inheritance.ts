import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('resource_templates', (table) => {
    table.boolean('is_inherited').defaultTo(false).comment('Whether this allocation is inherited from parent');
    table.string('parent_template_id').nullable().comment('ID of the parent template if inherited');
    table.index(['project_type_id', 'is_inherited'], 'idx_resource_templates_inheritance');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('resource_templates', (table) => {
    table.dropIndex(['project_type_id', 'is_inherited'], 'idx_resource_templates_inheritance');
    table.dropColumn('parent_template_id');
    table.dropColumn('is_inherited');
  });
}