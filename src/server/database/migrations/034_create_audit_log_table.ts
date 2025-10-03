import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Creating audit_log table...');
  
  await knex.schema.createTable('audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('table_name', 255).notNullable();
    table.string('record_id', 255).notNullable();
    table.string('action', 50).notNullable(); // CREATE, UPDATE, DELETE, UNDO, etc.
    table.json('old_values').nullable();
    table.json('new_values').nullable();
    table.json('changed_fields').nullable();
    table.string('changed_by', 255).nullable(); // Can be null for anonymous actions
    table.timestamp('changed_at').notNullable().defaultTo(knex.fn.now());
    table.string('request_id', 255).nullable();
    table.string('ip_address', 45).nullable(); // IPv6 max length
    table.string('user_agent', 500).nullable();
    table.text('comment').nullable();
    table.uuid('parent_id').nullable(); // For linking undo operations
    table.boolean('is_undo').defaultTo(false);
    
    // Indexes for performance
    table.index(['table_name', 'record_id']);
    table.index(['changed_by']);
    table.index(['changed_at']);
    table.index(['request_id']);
    table.index(['parent_id']);
  });
  
  console.log('✅ Created audit_log table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_log');
  console.log('✅ Dropped audit_log table');
}