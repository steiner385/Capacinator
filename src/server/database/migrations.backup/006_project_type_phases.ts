import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Creating project_type_phases junction table...');

  // Create project_type_phases table to explicitly manage phase assignments
  await knex.schema.createTable('project_type_phases', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    
    table.uuid('project_type_id').notNullable().references('id').inTable('project_types').onDelete('CASCADE');
    table.uuid('phase_id').notNullable().references('id').inTable('project_phases').onDelete('CASCADE');
    
    table.boolean('is_inherited').defaultTo(false);
    table.integer('order_index').notNullable();
    table.integer('duration_weeks').nullable(); // Override phase duration for this project type
    
    table.timestamps(true, true);
    
    // Constraints
    table.unique(['project_type_id', 'phase_id'], 'unique_project_type_phase');
    table.unique(['project_type_id', 'order_index'], 'unique_project_type_order');
  });

  // Add indexes for performance
  await knex.raw('CREATE INDEX idx_project_type_phases_project_type ON project_type_phases(project_type_id)');
  await knex.raw('CREATE INDEX idx_project_type_phases_phase ON project_type_phases(phase_id)');
  await knex.raw('CREATE INDEX idx_project_type_phases_inherited ON project_type_phases(is_inherited)');

  console.log('Project type phases table created successfully');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_type_phases');
}