import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Fixing primary role foreign key constraint...');

  // SQLite doesn't support dropping columns or constraints directly
  // We need to recreate the table with the correct foreign key
  
  // 0. Drop views that depend on the people table
  await knex.raw('DROP VIEW IF EXISTS capacity_gaps_view');
  
  // 1. Create a temporary table with the correct structure
  await knex.schema.createTable('people_temp', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('name', 255).notNullable();
    table.string('email', 255).unique();
    table.string('primary_person_role_id', 36); // Changed: now references person_roles table
    table.enu('worker_type', ['FTE', 'Contractor', 'Consultant']).defaultTo('FTE');
    table.string('supervisor_id', 36);
    table.float('default_availability_percentage').defaultTo(100);
    table.float('default_hours_per_day').defaultTo(8);
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    table.string('user_role_id', 36);
    table.boolean('is_system_admin').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.datetime('last_login');
    table.string('location_id', 36);
    
    // Foreign keys - primary_person_role_id now references person_roles table
    table.foreign('primary_person_role_id').references('id').inTable('person_roles').onDelete('SET NULL');
    table.foreign('supervisor_id').references('id').inTable('people').onDelete('SET NULL');
    table.foreign('user_role_id').references('id').inTable('user_roles').onDelete('SET NULL');
    table.foreign('location_id').references('id').inTable('locations').onDelete('RESTRICT');
    
    table.index(['supervisor_id']);
    table.index(['user_role_id']);
    table.index(['location_id']);
    table.index(['primary_person_role_id']); // New index
  });

  // 2. Copy data from old table to new table
  // We need to find the person_role_id that corresponds to the current primary_role_id
  await knex.raw(`
    INSERT INTO people_temp (
      id, name, email, primary_person_role_id, worker_type, supervisor_id,
      default_availability_percentage, default_hours_per_day, created_at, updated_at,
      user_role_id, is_system_admin, is_active, last_login, location_id
    )
    SELECT 
      p.id, p.name, p.email,
      pr.id as primary_person_role_id, -- Get the person_role record ID
      p.worker_type, p.supervisor_id,
      p.default_availability_percentage, p.default_hours_per_day, p.created_at, p.updated_at,
      p.user_role_id, p.is_system_admin, p.is_active, p.last_login, p.location_id
    FROM people p
    LEFT JOIN person_roles pr ON p.id = pr.person_id AND p.primary_role_id = pr.role_id
  `);

  // 3. Drop the old table
  await knex.schema.dropTable('people');

  // 4. Rename the temp table to the original name
  await knex.schema.renameTable('people_temp', 'people');

  // 5. Recreate the capacity_gaps_view with the new schema
  await knex.raw(`
    CREATE VIEW capacity_gaps_view AS
    SELECT 
      r.id as role_id,
      r.name as role_name,
      COUNT(DISTINCT p.id) as people_count,
      COALESCE(SUM(
        CASE 
          WHEN p.worker_type = 'FTE' THEN p.default_availability_percentage / 100.0
          WHEN p.worker_type IN ('Contractor', 'Consultant') THEN p.default_availability_percentage / 100.0 * 0.8
          ELSE p.default_availability_percentage / 100.0
        END
      ), 0) as total_capacity_fte,
      COALESCE(AVG(rt.allocation_percentage), 0) as avg_allocation_needed,
      COALESCE(SUM(rt.allocation_percentage * 0.01 * 8 / 40), 0) as total_demand_fte
    FROM roles r
    LEFT JOIN people p ON r.id = (
      SELECT pr.role_id 
      FROM person_roles pr 
      WHERE pr.id = p.primary_person_role_id
    )
    LEFT JOIN resource_templates rt ON r.id = rt.role_id
    GROUP BY r.id, r.name
    ORDER BY r.name
  `);

  console.log('✅ Fixed primary role foreign key constraint');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Reverting primary role foreign key constraint...');

  // Drop the view first
  await knex.raw('DROP VIEW IF EXISTS capacity_gaps_view');

  // Create temp table with old structure
  await knex.schema.createTable('people_temp', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('name', 255).notNullable();
    table.string('email', 255).unique();
    table.string('primary_role_id', 36); // Back to referencing roles table
    table.enu('worker_type', ['FTE', 'Contractor', 'Consultant']).defaultTo('FTE');
    table.string('supervisor_id', 36);
    table.float('default_availability_percentage').defaultTo(100);
    table.float('default_hours_per_day').defaultTo(8);
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    table.string('user_role_id', 36);
    table.boolean('is_system_admin').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.datetime('last_login');
    table.string('location_id', 36);
    
    table.foreign('primary_role_id').references('id').inTable('roles').onDelete('RESTRICT');
    table.foreign('supervisor_id').references('id').inTable('people').onDelete('SET NULL');
    table.foreign('user_role_id').references('id').inTable('user_roles').onDelete('SET NULL');
    table.foreign('location_id').references('id').inTable('locations').onDelete('RESTRICT');
    
    table.index(['supervisor_id']);
    table.index(['user_role_id']);
    table.index(['location_id']);
  });

  // Copy data back, converting person_role_id back to role_id
  await knex.raw(`
    INSERT INTO people_temp (
      id, name, email, primary_role_id, worker_type, supervisor_id,
      default_availability_percentage, default_hours_per_day, created_at, updated_at,
      user_role_id, is_system_admin, is_active, last_login, location_id
    )
    SELECT 
      p.id, p.name, p.email,
      pr.role_id as primary_role_id, -- Get the role_id from person_roles
      p.worker_type, p.supervisor_id,
      p.default_availability_percentage, p.default_hours_per_day, p.created_at, p.updated_at,
      p.user_role_id, p.is_system_admin, p.is_active, p.last_login, p.location_id
    FROM people p
    LEFT JOIN person_roles pr ON p.primary_person_role_id = pr.id
  `);

  await knex.schema.dropTable('people');
  await knex.schema.renameTable('people_temp', 'people');

  // Recreate the original view
  await knex.raw(`
    CREATE VIEW capacity_gaps_view AS
    SELECT 
      r.id as role_id,
      r.name as role_name,
      COUNT(DISTINCT p.id) as people_count,
      COALESCE(SUM(
        CASE 
          WHEN p.worker_type = 'FTE' THEN p.default_availability_percentage / 100.0
          WHEN p.worker_type IN ('Contractor', 'Consultant') THEN p.default_availability_percentage / 100.0 * 0.8
          ELSE p.default_availability_percentage / 100.0
        END
      ), 0) as total_capacity_fte,
      COALESCE(AVG(rt.allocation_percentage), 0) as avg_allocation_needed,
      COALESCE(SUM(rt.allocation_percentage * 0.01 * 8 / 40), 0) as total_demand_fte
    FROM roles r
    LEFT JOIN people p ON r.id = p.primary_role_id
    LEFT JOIN resource_templates rt ON r.id = rt.role_id
    GROUP BY r.id, r.name
    ORDER BY r.name
  `);

  console.log('✅ Reverted primary role foreign key constraint');
}