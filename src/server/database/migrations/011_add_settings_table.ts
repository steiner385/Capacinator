import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Creating settings table...');
  
  // Create settings table if it doesn't exist
  const hasSettingsTable = await knex.schema.hasTable('settings');
  if (!hasSettingsTable) {
    await knex.schema.createTable('settings', (table) => {
      table.increments('id').primary();
      table.string('category', 50).notNullable();
      table.string('key', 100).notNullable();
      table.text('value');
      table.text('description');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Unique constraint on category + key
      table.unique(['category', 'key']);
      table.index('category');
    });
    
    // Insert default import settings
    await knex('settings').insert([
      {
        category: 'import',
        key: 'default_settings',
        value: JSON.stringify({
          dateFormat: 'MM/DD/YYYY',
          skipFirstRow: true,
          trimWhitespace: true
        }),
        description: 'Default import settings'
      }
    ]);
    
    console.log('✅ Created settings table with default import settings');
  }
}

export async function down(knex: Knex): Promise<void> {
  console.log('Dropping settings table...');
  await knex.schema.dropTableIfExists('settings');
  console.log('✅ Dropped settings table');
}