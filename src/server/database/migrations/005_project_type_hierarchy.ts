import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Adding hierarchy support to project_types table...');

  // Check if columns already exist
  const tableInfo = await knex.raw("PRAGMA table_info(project_types)");
  const columnNames = tableInfo.map((col: any) => col.name);
  
  if (!columnNames.includes('parent_id')) {
    await knex.schema.alterTable('project_types', (table) => {
      table.uuid('parent_id').nullable();
      table.boolean('is_parent').defaultTo(false);
      table.integer('level').defaultTo(0);
      table.integer('sort_order').defaultTo(0);
    });

    // Add foreign key constraint separately for SQLite compatibility
    await knex.raw('CREATE INDEX idx_project_types_parent_id ON project_types(parent_id)');
    await knex.raw('CREATE INDEX idx_project_types_level ON project_types(level)');
    await knex.raw('CREATE INDEX idx_project_types_sort_order ON project_types(sort_order)');

    console.log('Project type hierarchy columns added successfully');
  } else {
    console.log('Hierarchy columns already exist, skipping...');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('project_types', (table) => {
    table.dropIndex(['parent_id'], 'idx_project_types_parent_id');
    table.dropIndex(['level'], 'idx_project_types_level');
    table.dropIndex(['sort_order'], 'idx_project_types_sort_order');
    table.dropColumn('parent_id');
    table.dropColumn('is_parent');
    table.dropColumn('level');
    table.dropColumn('sort_order');
  });
}