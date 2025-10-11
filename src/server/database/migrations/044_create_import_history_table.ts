import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Creating import_history table...');
  
  await knex.schema.createTable('import_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('file_name', 255).notNullable();
    table.string('file_size', 50).nullable(); // Store as string for large files
    table.string('file_mime_type', 100).nullable();
    table.string('import_type', 50).notNullable(); // 'v1' or 'v2'
    table.boolean('clear_existing').defaultTo(false);
    table.boolean('validate_duplicates').defaultTo(false);
    table.boolean('auto_create_missing_roles').defaultTo(false);
    table.boolean('auto_create_missing_locations').defaultTo(false);
    table.integer('default_project_priority').nullable();
    table.string('date_format', 20).nullable();
    table.string('status', 50).notNullable(); // 'success', 'failed', 'cancelled'
    table.json('imported_counts').nullable(); // JSON object with counts of imported entities
    table.json('errors').nullable(); // Array of error messages
    table.json('warnings').nullable(); // Array of warning messages
    table.json('duplicates_found').nullable(); // JSON object with duplicate records
    table.integer('duration_ms').nullable(); // Import duration in milliseconds
    table.string('imported_by', 255).nullable(); // User who initiated the import
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    table.string('request_id', 255).nullable(); // For correlating with audit logs
    table.string('ip_address', 45).nullable(); // IPv6 max length
    table.text('notes').nullable(); // Additional notes or comments
    
    // Indexes for performance
    table.index(['status']);
    table.index(['import_type']);
    table.index(['imported_by']);
    table.index(['started_at']);
    table.index(['request_id']);
  });
  
  console.log('✅ Created import_history table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('import_history');
  console.log('✅ Dropped import_history table');
}