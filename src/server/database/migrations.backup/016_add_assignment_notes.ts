import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Adding notes column to project_assignments table...');
  
  await knex.schema.alterTable('project_assignments', (table) => {
    table.text('notes').nullable();
  });
  
  console.log('✅ Added notes column to project_assignments table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('project_assignments', (table) => {
    table.dropColumn('notes');
  });
  
  console.log('✅ Removed notes column from project_assignments table');
}