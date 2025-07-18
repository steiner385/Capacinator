import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import knex, { Knex } from 'knex';
import { promises as fs } from 'fs';
import path from 'path';

// Test database configuration
const testDbConfig: Knex.Config = {
  client: 'better-sqlite3',
  connection: {
    filename: ':memory:', // Use in-memory database for tests
  },
  useNullAsDefault: true,
  pool: {
    afterCreate: (conn: any, cb: any) => {
      conn.prepare('PRAGMA foreign_keys = ON').run();
      conn.prepare('PRAGMA defer_foreign_keys = OFF').run();
      cb();
    }
  },
  migrations: {
    directory: path.join(process.cwd(), 'src/server/database/migrations'),
    extension: 'ts',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: path.join(process.cwd(), 'src/server/database/seeds'),
    extension: 'ts'
  }
};

export let testDb: Knex;

beforeAll(async () => {
  // Create test database connection
  testDb = knex(testDbConfig);
  
  // Create basic tables needed for tests
  await createTestTables();
  
  console.log('Test database setup completed');
});

async function createTestTables() {
  // Create roles table first
  await testDb.schema.createTable('roles', table => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.timestamp('created_at').defaultTo(testDb.fn.now());
    table.timestamp('updated_at').defaultTo(testDb.fn.now());
  });

  // Create people table (without foreign key references first)
  await testDb.schema.createTable('people', table => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('email').notNullable();
    table.string('supervisor_id');
    table.string('primary_person_role_id');
    table.string('location');
    table.timestamp('created_at').defaultTo(testDb.fn.now());
    table.timestamp('updated_at').defaultTo(testDb.fn.now());
  });

  // Create person_roles table
  await testDb.schema.createTable('person_roles', table => {
    table.string('id').primary();
    table.string('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.string('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.integer('expertise_level').notNullable().defaultTo(1);
    table.timestamp('created_at').defaultTo(testDb.fn.now());
    table.timestamp('updated_at').defaultTo(testDb.fn.now());
    table.unique(['person_id', 'role_id']);
  });

  // Add foreign key constraints to people table
  await testDb.schema.alterTable('people', table => {
    table.foreign('supervisor_id').references('id').inTable('people').onDelete('SET NULL');
    table.foreign('primary_person_role_id').references('id').inTable('person_roles').onDelete('SET NULL');
  });

  // Create projects table
  await testDb.schema.createTable('projects', table => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('description'); // Add description field to match schema
    table.timestamp('created_at').defaultTo(testDb.fn.now());
    table.timestamp('updated_at').defaultTo(testDb.fn.now());
  });

  // Create project_assignments table
  await testDb.schema.createTable('project_assignments', table => {
    table.string('id').primary();
    table.string('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.string('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.string('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.integer('allocation_percentage');
    table.date('start_date');
    table.date('end_date');
    table.timestamp('created_at').defaultTo(testDb.fn.now());
    table.timestamp('updated_at').defaultTo(testDb.fn.now());
  });

  // Create scenarios table
  await testDb.schema.createTable('scenarios', table => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('description');
    table.string('created_by').references('id').inTable('people').notNullable().onDelete('RESTRICT');
    table.string('scenario_type').notNullable();
    table.string('status').defaultTo('active');
    table.string('parent_scenario_id').references('id').inTable('scenarios').onDelete('SET NULL');
    table.timestamp('branch_point');
    table.timestamp('created_at').defaultTo(testDb.fn.now());
    table.timestamp('updated_at').defaultTo(testDb.fn.now());
  });

  // Create scenario_project_assignments table
  await testDb.schema.createTable('scenario_project_assignments', table => {
    table.string('id').primary();
    table.string('scenario_id').references('id').inTable('scenarios').onDelete('CASCADE');
    table.string('project_id').references('id').inTable('projects').onDelete('RESTRICT');
    table.string('person_id').references('id').inTable('people').onDelete('RESTRICT');
    table.string('role_id').references('id').inTable('roles').onDelete('RESTRICT');
    table.integer('allocation_percentage');
    table.string('assignment_date_mode');
    table.date('start_date');
    table.date('end_date');
    table.string('phase_id');
    table.string('change_type');
    table.text('notes');
    table.string('base_assignment_id'); // Add missing column
    table.timestamp('created_at').defaultTo(testDb.fn.now());
    table.timestamp('updated_at').defaultTo(testDb.fn.now());
    
    // Add unique constraint on scenario_id + project_id + person_id + role_id + phase_id
    // Note: SQLite treats NULL values as distinct, so we need a custom constraint
    table.unique(['scenario_id', 'project_id', 'person_id', 'role_id', 'phase_id']);
  });
  
  // Add custom unique constraint that handles NULL values properly
  await testDb.raw(`
    CREATE UNIQUE INDEX idx_scenario_assignments_unique 
    ON scenario_project_assignments (scenario_id, project_id, person_id, role_id, COALESCE(phase_id, ''))
  `);

  // Create scenario_project_phases table
  await testDb.schema.createTable('scenario_project_phases', table => {
    table.string('id').primary();
    table.string('scenario_id').references('id').inTable('scenarios').onDelete('CASCADE');
    table.string('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.string('phase_id').notNullable();
    table.date('start_date');
    table.date('end_date');
    table.string('change_type');
    table.text('notes'); // Add missing column
    table.string('base_phase_timeline_id'); // Add missing column
    table.timestamp('created_at').defaultTo(testDb.fn.now());
    table.timestamp('updated_at').defaultTo(testDb.fn.now());
  });

  // Create scenario_projects table
  await testDb.schema.createTable('scenario_projects', table => {
    table.string('id').primary();
    table.string('scenario_id').references('id').inTable('scenarios').onDelete('CASCADE');
    table.string('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.string('name'); // Add missing column
    table.integer('priority');
    table.date('aspiration_start');
    table.date('aspiration_finish');
    table.string('change_type');
    table.text('notes'); // Add missing column
    table.timestamp('created_at').defaultTo(testDb.fn.now());
    table.timestamp('updated_at').defaultTo(testDb.fn.now());
  });

  // Create scenario_merge_conflicts table
  await testDb.schema.createTable('scenario_merge_conflicts', table => {
    table.string('id').primary();
    table.string('source_scenario_id').references('id').inTable('scenarios').onDelete('CASCADE');
    table.string('target_scenario_id').references('id').inTable('scenarios').onDelete('CASCADE');
    table.string('conflict_type');
    table.string('entity_id'); // Add missing column
    table.json('source_data');
    table.json('target_data');
    table.json('resolved_data'); // Add missing column
    table.string('resolution').defaultTo('pending');
    table.timestamp('created_at').defaultTo(testDb.fn.now());
  });

  // Create scenario_assignments_view (mock view as table for testing)
  await testDb.schema.createTable('scenario_assignments_view', table => {
    table.string('id').primary();
    table.string('scenario_id');
    table.string('project_id');
    table.string('person_id');
    table.string('role_id');
    table.integer('allocation_percentage');
    table.string('assignment_date_mode');
    table.date('computed_start_date');
    table.date('computed_end_date');
    table.string('phase_id');
  });

  // Create a trigger to populate the view when assignments are inserted
  await testDb.raw(`
    CREATE TRIGGER populate_scenario_assignments_view
    AFTER INSERT ON scenario_project_assignments
    FOR EACH ROW
    BEGIN
      INSERT INTO scenario_assignments_view (
        id, scenario_id, project_id, person_id, role_id, 
        allocation_percentage, assignment_date_mode, 
        computed_start_date, computed_end_date, phase_id
      ) VALUES (
        NEW.id, NEW.scenario_id, NEW.project_id, NEW.person_id, NEW.role_id,
        NEW.allocation_percentage, NEW.assignment_date_mode,
        CASE 
          WHEN NEW.assignment_date_mode = 'fixed' THEN NEW.start_date
          WHEN NEW.assignment_date_mode = 'project' THEN 
            COALESCE(
              (SELECT aspiration_start FROM scenario_projects WHERE scenario_id = NEW.scenario_id AND project_id = NEW.project_id LIMIT 1),
              NEW.start_date
            )
          WHEN NEW.assignment_date_mode = 'phase' THEN 
            COALESCE(
              (SELECT start_date FROM scenario_project_phases WHERE scenario_id = NEW.scenario_id AND project_id = NEW.project_id AND phase_id = NEW.phase_id LIMIT 1),
              NEW.start_date
            )
          ELSE NEW.start_date
        END,
        CASE 
          WHEN NEW.assignment_date_mode = 'fixed' THEN NEW.end_date
          WHEN NEW.assignment_date_mode = 'project' THEN 
            COALESCE(
              (SELECT aspiration_finish FROM scenario_projects WHERE scenario_id = NEW.scenario_id AND project_id = NEW.project_id LIMIT 1),
              NEW.end_date
            )
          WHEN NEW.assignment_date_mode = 'phase' THEN 
            COALESCE(
              (SELECT end_date FROM scenario_project_phases WHERE scenario_id = NEW.scenario_id AND project_id = NEW.project_id AND phase_id = NEW.phase_id LIMIT 1),
              NEW.end_date
            )
          ELSE NEW.end_date
        END,
        NEW.phase_id
      );
    END;
  `);

  // Create a trigger to update the view when assignments are updated
  await testDb.raw(`
    CREATE TRIGGER update_scenario_assignments_view
    AFTER UPDATE ON scenario_project_assignments
    FOR EACH ROW
    BEGIN
      UPDATE scenario_assignments_view 
      SET 
        allocation_percentage = NEW.allocation_percentage,
        assignment_date_mode = NEW.assignment_date_mode,
        computed_start_date = CASE 
          WHEN NEW.assignment_date_mode = 'fixed' THEN NEW.start_date
          WHEN NEW.assignment_date_mode = 'project' THEN 
            COALESCE(
              (SELECT aspiration_start FROM scenario_projects WHERE scenario_id = NEW.scenario_id AND project_id = NEW.project_id LIMIT 1),
              NEW.start_date
            )
          WHEN NEW.assignment_date_mode = 'phase' THEN 
            COALESCE(
              (SELECT start_date FROM scenario_project_phases WHERE scenario_id = NEW.scenario_id AND project_id = NEW.project_id AND phase_id = NEW.phase_id LIMIT 1),
              NEW.start_date
            )
          ELSE NEW.start_date
        END,
        computed_end_date = CASE 
          WHEN NEW.assignment_date_mode = 'fixed' THEN NEW.end_date
          WHEN NEW.assignment_date_mode = 'project' THEN 
            COALESCE(
              (SELECT aspiration_finish FROM scenario_projects WHERE scenario_id = NEW.scenario_id AND project_id = NEW.project_id LIMIT 1),
              NEW.end_date
            )
          WHEN NEW.assignment_date_mode = 'phase' THEN 
            COALESCE(
              (SELECT end_date FROM scenario_project_phases WHERE scenario_id = NEW.scenario_id AND project_id = NEW.project_id AND phase_id = NEW.phase_id LIMIT 1),
              NEW.end_date
            )
          ELSE NEW.end_date
        END,
        phase_id = NEW.phase_id
      WHERE id = NEW.id;
    END;
  `);

  // Create a trigger to delete from the view when assignments are deleted
  await testDb.raw(`
    CREATE TRIGGER delete_scenario_assignments_view
    AFTER DELETE ON scenario_project_assignments
    FOR EACH ROW
    BEGIN
      DELETE FROM scenario_assignments_view WHERE id = OLD.id;
    END;
  `);

  // Create trigger to update view when scenario_projects is inserted/updated
  await testDb.raw(`
    CREATE TRIGGER update_view_on_projects_change
    AFTER INSERT ON scenario_projects
    FOR EACH ROW
    BEGIN
      UPDATE scenario_assignments_view
      SET 
        computed_start_date = CASE 
          WHEN assignment_date_mode = 'project' THEN NEW.aspiration_start
          ELSE computed_start_date
        END,
        computed_end_date = CASE 
          WHEN assignment_date_mode = 'project' THEN NEW.aspiration_finish
          ELSE computed_end_date
        END
      WHERE scenario_id = NEW.scenario_id AND project_id = NEW.project_id;
    END;
  `);

  // Create trigger to update view when scenario_project_phases is inserted/updated
  await testDb.raw(`
    CREATE TRIGGER update_view_on_phases_change
    AFTER INSERT ON scenario_project_phases
    FOR EACH ROW
    BEGIN
      UPDATE scenario_assignments_view
      SET 
        computed_start_date = CASE 
          WHEN assignment_date_mode = 'phase' AND phase_id = NEW.phase_id THEN NEW.start_date
          ELSE computed_start_date
        END,
        computed_end_date = CASE 
          WHEN assignment_date_mode = 'phase' AND phase_id = NEW.phase_id THEN NEW.end_date
          ELSE computed_end_date
        END
      WHERE scenario_id = NEW.scenario_id AND project_id = NEW.project_id AND phase_id = NEW.phase_id;
    END;
  `);

  // Create email_templates table
  await testDb.schema.createTable('email_templates', table => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('type').notNullable();
    table.string('subject').notNullable();
    table.text('body_text');
    table.text('body_html');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(testDb.fn.now());
    table.timestamp('updated_at').defaultTo(testDb.fn.now());
  });

  // Create notification_preferences table
  await testDb.schema.createTable('notification_preferences', table => {
    table.string('id').primary();
    table.string('user_id').references('id').inTable('people').onDelete('CASCADE');
    table.string('type').notNullable();
    table.boolean('enabled').defaultTo(true);
    table.boolean('email_enabled').defaultTo(true);
    table.timestamp('created_at').defaultTo(testDb.fn.now());
    table.timestamp('updated_at').defaultTo(testDb.fn.now());
  });

  // Create notification_history table
  await testDb.schema.createTable('notification_history', table => {
    table.string('id').primary();
    table.string('user_id').references('id').inTable('people').onDelete('CASCADE');
    table.string('type').notNullable();
    table.string('method').notNullable();
    table.string('status').notNullable();
    table.text('details');
    table.timestamp('created_at').defaultTo(testDb.fn.now());
  });
}

afterAll(async () => {
  if (testDb) {
    await testDb.destroy();
  }
});

beforeEach(async () => {
  // Clean up scenario test data tables (in proper order due to foreign keys)
  const tables = [
    'scenario_merge_conflicts',
    'scenario_assignments_view',
    'scenario_project_assignments',
    'scenario_project_phases',
    'scenario_projects',
    'scenarios',
    'project_assignments',
    'notification_history',
    'notification_preferences',
    'email_templates',
    'person_roles',
    'people',
    'projects',
    'roles'
  ];
  
  for (const table of tables) {
    if (await testDb.schema.hasTable(table)) {
      await testDb(table).del();
    }
  }
});

// Global test utilities
export const createTestUser = async (overrides: any = {}) => {
  const [user] = await testDb('people').insert({
    id: overrides.id || 'test-user-1',
    name: overrides.name || 'Test User',
    email: overrides.email || 'test@example.com',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  }).returning('*');
  return user;
};

export const createTestRole = async (overrides: any = {}) => {
  const [role] = await testDb('roles').insert({
    id: overrides.id || 'test-role-1',
    name: overrides.name || 'Test Role',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  }).returning('*');
  return role;
};

export const createTestProject = async (overrides: any = {}) => {
  const [project] = await testDb('projects').insert({
    id: overrides.id || 'test-project-1',
    name: overrides.name || 'Test Project',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  }).returning('*');
  return project;
};

export const createTestPersonRole = async (overrides: any = {}) => {
  const [personRole] = await testDb('person_roles').insert({
    id: overrides.id || 'test-person-role-1',
    person_id: overrides.person_id || 'test-user-1',
    role_id: overrides.role_id || 'test-role-1',
    expertise_level: overrides.expertise_level || 1,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  }).returning('*');
  return personRole;
};