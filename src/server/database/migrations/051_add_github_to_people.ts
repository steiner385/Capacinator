import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Adding GitHub fields to people table...');

  await knex.schema.alterTable('people', (table) => {
    // Add cached GitHub information for quick lookups
    // These are denormalized from github_account_associations for performance
    table.text('github_username').nullable();
    table.integer('github_user_id').nullable();
  });

  // Create indexes on the new fields (with WHERE clause for non-null values)
  await knex.raw(`
    CREATE INDEX idx_people_github_username
    ON people(github_username)
    WHERE github_username IS NOT NULL
  `);

  await knex.raw(`
    CREATE INDEX idx_people_github_user_id
    ON people(github_user_id)
    WHERE github_user_id IS NOT NULL
  `);

  console.log('✅ GitHub fields added to people table successfully');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Removing GitHub fields from people table...');

  // Drop indexes first (SQLite requires this)
  await knex.raw('DROP INDEX IF EXISTS idx_people_github_username');
  await knex.raw('DROP INDEX IF EXISTS idx_people_github_user_id');

  // Remove columns
  await knex.schema.alterTable('people', (table) => {
    table.dropColumn('github_username');
    table.dropColumn('github_user_id');
  });

  console.log('✅ GitHub fields removed from people table successfully');
}
