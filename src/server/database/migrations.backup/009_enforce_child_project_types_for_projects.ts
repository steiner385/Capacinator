import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // First, create a trigger function to validate project_type_id
  // Since we're using SQLite, we'll use a CHECK constraint instead of triggers
  // We'll add this validation at the application level in the controller
  
  // For now, let's just add an index to help with the validation queries
  await knex.schema.alterTable('projects', (table) => {
    table.index('project_type_id', 'idx_projects_project_type_id');
  });
  
  // The constraint will be enforced at the application level in the ProjectController
  // This is documented here for reference
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('projects', (table) => {
    table.dropIndex('project_type_id', 'idx_projects_project_type_id');
  });
}