import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Creating standard_allocations table...');

  // Create standard_allocations table
  await knex.schema.createTable('standard_allocations', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('project_type_id', 36).notNullable();
    table.string('project_sub_type_id', 36).nullable();
    table.string('phase_id', 36).notNullable();
    table.string('role_id', 36).notNullable();
    table.float('allocation_percentage').nullable(); // Percentage-based allocation (0-100)
    table.float('allocation_hours').nullable(); // Hour-based allocation
    table.text('notes').nullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    
    // Foreign key constraints
    table.foreign('project_type_id').references('id').inTable('project_types').onDelete('CASCADE');
    table.foreign('project_sub_type_id').references('id').inTable('project_sub_types').onDelete('CASCADE');
    table.foreign('phase_id').references('id').inTable('project_phases').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    
    // Unique constraint to prevent duplicate allocations
    table.unique(['project_type_id', 'project_sub_type_id', 'phase_id', 'role_id'], 'unique_standard_allocation');
    
    // Indexes for performance
    table.index(['project_type_id'], 'idx_standard_allocations_project_type');
    table.index(['phase_id'], 'idx_standard_allocations_phase');
    table.index(['role_id'], 'idx_standard_allocations_role');
    table.index(['project_type_id', 'phase_id'], 'idx_standard_allocations_type_phase');
  });

  console.log('standard_allocations table created successfully');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Dropping standard_allocations table...');
  await knex.schema.dropTableIfExists('standard_allocations');
  console.log('standard_allocations table dropped successfully');
}