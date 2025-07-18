import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Creating audit_log table...');

  await knex.schema.createTable('audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    
    table.string('table_name').notNullable();
    table.string('record_id').notNullable();
    table.enum('action', ['CREATE', 'UPDATE', 'DELETE']).notNullable();
    table.uuid('changed_by').nullable();
    table.json('old_values').nullable();
    table.json('new_values').nullable();
    table.json('changed_fields').nullable();
    table.string('request_id').nullable();
    table.string('ip_address').nullable();
    table.text('user_agent').nullable();
    table.text('comment').nullable();
    table.timestamp('changed_at').defaultTo(knex.fn.now()).notNullable();
    
    // Indexes for efficient querying
    table.index(['table_name', 'record_id', 'changed_at']);
    table.index(['changed_by', 'changed_at']);
    table.index('request_id');
    table.index('changed_at');
    table.index(['table_name', 'action']);
  });

  console.log('Audit log table created successfully');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_log');
}