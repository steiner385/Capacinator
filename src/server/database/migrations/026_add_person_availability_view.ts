import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Creating person_availability_view...');

  // Create person_availability_view that combines default availability with overrides
  await knex.raw(`
    CREATE VIEW IF NOT EXISTS person_availability_view AS
    SELECT 
      p.id as person_id,
      p.name as person_name,
      p.default_availability_percentage,
      p.default_hours_per_day,
      -- For now, just use the default availability percentage
      -- In the future, this could be enhanced to consider date-specific overrides
      p.default_availability_percentage as effective_availability_percentage,
      p.default_hours_per_day as effective_hours_per_day
    FROM people p
    WHERE p.is_active = true
  `);

  console.log('✅ Created person_availability_view');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Dropping person_availability_view...');
  
  await knex.raw('DROP VIEW IF EXISTS person_availability_view');
  
  console.log('✅ Dropped person_availability_view');
}