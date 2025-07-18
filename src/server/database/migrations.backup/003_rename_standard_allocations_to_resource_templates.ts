import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Rename the table from standard_allocations to resource_templates
  await knex.schema.renameTable('standard_allocations', 'resource_templates');
  
  // Update the column name in roles table if it exists
  const hasColumn = await knex.schema.hasColumn('roles', 'can_modify_standard_allocations');
  if (hasColumn) {
    await knex.schema.alterTable('roles', (table) => {
      table.renameColumn('can_modify_standard_allocations', 'can_modify_resource_templates');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Rename the table back to standard_allocations
  await knex.schema.renameTable('resource_templates', 'standard_allocations');
  
  // Update the column name in roles table back
  const hasColumn = await knex.schema.hasColumn('roles', 'can_modify_resource_templates');
  if (hasColumn) {
    await knex.schema.alterTable('roles', (table) => {
      table.renameColumn('can_modify_resource_templates', 'can_modify_standard_allocations');
    });
  }
}