import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // First update any existing 'project' assignments to 'phase' mode
  // We'll use the first phase of the project if available
  await knex.transaction(async (trx) => {
    // Find all project-mode assignments
    const projectAssignments = await trx('project_assignments')
      .where('assignment_date_mode', 'project')
      .select('id', 'project_id');

    // For each assignment, try to assign it to the first phase
    for (const assignment of projectAssignments) {
      // Get the first phase for this project
      const firstPhase = await trx('project_phases_timeline')
        .where('project_id', assignment.project_id)
        .join('project_phases', 'project_phases_timeline.phase_id', 'project_phases.id')
        .orderBy('project_phases.order_index', 'asc')
        .first('project_phases_timeline.phase_id');

      if (firstPhase) {
        // Update to phase mode with the first phase
        await trx('project_assignments')
          .where('id', assignment.id)
          .update({
            assignment_date_mode: 'phase',
            phase_id: firstPhase.phase_id,
            updated_at: new Date()
          });
      } else {
        // If no phases, convert to fixed mode
        await trx('project_assignments')
          .where('id', assignment.id)
          .update({
            assignment_date_mode: 'fixed',
            start_date: knex.raw('computed_start_date'),
            end_date: knex.raw('computed_end_date'),
            updated_at: new Date()
          });
      }
    }
  });

  // Store view definitions before dropping them
  const viewDefinitions: Record<string, any> = {
    person_utilization_view: await knex.raw(`
      SELECT sql FROM sqlite_master 
      WHERE type='view' AND name='person_utilization_view'
    `).then(result => result[0]?.sql || null),
    capacity_gaps_view: await knex.raw(`
      SELECT sql FROM sqlite_master 
      WHERE type='view' AND name='capacity_gaps_view'
    `).then(result => result[0]?.sql || null),
    project_demands_view: await knex.raw(`
      SELECT sql FROM sqlite_master 
      WHERE type='view' AND name='project_demands_view'
    `).then(result => result[0]?.sql || null),
    project_health_view: await knex.raw(`
      SELECT sql FROM sqlite_master 
      WHERE type='view' AND name='project_health_view'
    `).then(result => result[0]?.sql || null),
    scenario_assignments_view: await knex.raw(`
      SELECT sql FROM sqlite_master 
      WHERE type='view' AND name='scenario_assignments_view'
    `).then(result => result[0]?.sql || null)
  };

  // Drop views that depend on project_assignments table
  for (const viewName of Object.keys(viewDefinitions)) {
    if (viewDefinitions[viewName]) {
      await knex.raw(`DROP VIEW IF EXISTS ${viewName}`);
    }
  }

  // Now we need to recreate the enum constraint without 'project' option
  // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
  // or use a workaround
  
  // For SQLite, we'll create a new table with the correct constraint
  await knex.schema.createTable('project_assignments_new', (table) => {
    table.string('id').primary();
    table.string('project_id').notNullable();
    table.string('person_id').notNullable();
    table.string('role_id').notNullable();
    table.string('phase_id');
    table.date('start_date');
    table.date('end_date');
    table.float('allocation_percentage').notNullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    // Updated enum without 'project'
    table.enu('assignment_date_mode', ['fixed', 'phase']).defaultTo('fixed');
    table.date('computed_start_date');
    table.date('computed_end_date');
    table.text('notes');

    // Foreign keys
    table.foreign('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.foreign('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.foreign('phase_id').references('id').inTable('project_phases').onDelete('SET NULL');

    // Indexes
    table.index(['project_id']);
    table.index(['person_id']);
    table.index(['role_id']);
    table.index(['phase_id']);
    table.index(['assignment_date_mode']);
    table.index(['start_date']);
    table.index(['end_date']);
    table.index(['computed_start_date']);
    table.index(['computed_end_date']);
  });

  // Copy data from old table to new table
  // Use explicit column list to handle cases where computed_start_date, computed_end_date, or notes
  // might not exist in the old table
  const oldColumns = await knex('project_assignments').columnInfo();
  const hasComputedStart = 'computed_start_date' in oldColumns;
  const hasComputedEnd = 'computed_end_date' in oldColumns;
  const hasNotes = 'notes' in oldColumns;

  await knex.raw(`
    INSERT INTO project_assignments_new
    (id, project_id, person_id, role_id, phase_id, start_date, end_date,
     allocation_percentage, created_at, updated_at, assignment_date_mode,
     computed_start_date, computed_end_date, notes)
    SELECT
      id, project_id, person_id, role_id, phase_id, start_date, end_date,
      allocation_percentage, created_at, updated_at, assignment_date_mode,
      ${hasComputedStart ? 'computed_start_date' : 'NULL'},
      ${hasComputedEnd ? 'computed_end_date' : 'NULL'},
      ${hasNotes ? 'notes' : 'NULL'}
    FROM project_assignments
  `);

  // Drop the old table
  await knex.schema.dropTable('project_assignments');

  // Rename the new table
  await knex.schema.renameTable('project_assignments_new', 'project_assignments');

  // Recreate views
  for (const [viewName, viewSql] of Object.entries(viewDefinitions)) {
    if (viewSql) {
      await knex.raw(viewSql);
    }
  }

  // Also update the resource_templates table which has the same enum
  const hasResourceTemplates = await knex.schema.hasTable('resource_templates');
  if (hasResourceTemplates) {
    // Check if resource_templates has assignment_date_mode column
    const hasColumn = await knex.schema.hasColumn('resource_templates', 'assignment_date_mode');
    if (hasColumn) {
      // Update any project mode templates to phase mode
      await knex('resource_templates')
        .where('assignment_date_mode', 'project')
        .update({ assignment_date_mode: 'phase' });

      // Recreate resource_templates table with updated enum
      await knex.schema.createTable('resource_templates_new', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.boolean('is_active').defaultTo(true);
        table.json('phases_config');
        table.json('roles_allocation');
        table.enu('assignment_date_mode', ['fixed', 'phase']).defaultTo('phase');
        table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
        table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());

        table.index(['is_active']);
        table.index(['name']);
      });

      // Copy data with explicit column list
      await knex.raw(`
        INSERT INTO resource_templates_new
        (id, name, description, is_active, phases_config, roles_allocation,
         assignment_date_mode, created_at, updated_at)
        SELECT
          id, name, description, is_active, phases_config, roles_allocation,
          assignment_date_mode, created_at, updated_at
        FROM resource_templates
      `);

      await knex.schema.dropTable('resource_templates');
      await knex.schema.renameTable('resource_templates_new', 'resource_templates');
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Store view definitions before dropping them
  const viewDefinitions: Record<string, any> = {
    person_utilization_view: await knex.raw(`
      SELECT sql FROM sqlite_master 
      WHERE type='view' AND name='person_utilization_view'
    `).then(result => result[0]?.sql || null),
    capacity_gaps_view: await knex.raw(`
      SELECT sql FROM sqlite_master 
      WHERE type='view' AND name='capacity_gaps_view'
    `).then(result => result[0]?.sql || null),
    project_demands_view: await knex.raw(`
      SELECT sql FROM sqlite_master 
      WHERE type='view' AND name='project_demands_view'
    `).then(result => result[0]?.sql || null),
    project_health_view: await knex.raw(`
      SELECT sql FROM sqlite_master 
      WHERE type='view' AND name='project_health_view'
    `).then(result => result[0]?.sql || null),
    scenario_assignments_view: await knex.raw(`
      SELECT sql FROM sqlite_master 
      WHERE type='view' AND name='scenario_assignments_view'
    `).then(result => result[0]?.sql || null)
  };

  // Drop views that depend on project_assignments table
  for (const viewName of Object.keys(viewDefinitions)) {
    if (viewDefinitions[viewName]) {
      await knex.raw(`DROP VIEW IF EXISTS ${viewName}`);
    }
  }

  // Recreate tables with the original enum including 'project'
  
  // Recreate project_assignments with 'project' option
  await knex.schema.createTable('project_assignments_old', (table) => {
    table.string('id').primary();
    table.string('project_id').notNullable();
    table.string('person_id').notNullable();
    table.string('role_id').notNullable();
    table.string('phase_id');
    table.date('start_date');
    table.date('end_date');
    table.float('allocation_percentage').notNullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    table.enu('assignment_date_mode', ['fixed', 'phase', 'project']).defaultTo('fixed');
    table.date('computed_start_date');
    table.date('computed_end_date');
    table.text('notes');

    // Foreign keys
    table.foreign('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.foreign('person_id').references('id').inTable('people').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.foreign('phase_id').references('id').inTable('project_phases').onDelete('SET NULL');

    // Indexes
    table.index(['project_id']);
    table.index(['person_id']);
    table.index(['role_id']);
    table.index(['phase_id']);
    table.index(['assignment_date_mode']);
    table.index(['start_date']);
    table.index(['end_date']);
    table.index(['computed_start_date']);
    table.index(['computed_end_date']);
  });

  // Copy data back with explicit column list
  await knex.raw(`
    INSERT INTO project_assignments_old
    (id, project_id, person_id, role_id, phase_id, start_date, end_date,
     allocation_percentage, created_at, updated_at, assignment_date_mode,
     computed_start_date, computed_end_date, notes)
    SELECT
      id, project_id, person_id, role_id, phase_id, start_date, end_date,
      allocation_percentage, created_at, updated_at, assignment_date_mode,
      computed_start_date, computed_end_date, notes
    FROM project_assignments
  `);

  await knex.schema.dropTable('project_assignments');
  await knex.schema.renameTable('project_assignments_old', 'project_assignments');

  // Recreate views
  for (const [viewName, viewSql] of Object.entries(viewDefinitions)) {
    if (viewSql) {
      await knex.raw(viewSql);
    }
  }

  // Same for resource_templates if it exists
  const hasResourceTemplates = await knex.schema.hasTable('resource_templates');
  if (hasResourceTemplates) {
    const hasColumn = await knex.schema.hasColumn('resource_templates', 'assignment_date_mode');
    if (hasColumn) {
      await knex.schema.createTable('resource_templates_old', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.boolean('is_active').defaultTo(true);
        table.json('phases_config');
        table.json('roles_allocation');
        table.enu('assignment_date_mode', ['fixed', 'phase', 'project']).defaultTo('project');
        table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
        table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());

        table.index(['is_active']);
        table.index(['name']);
      });

      await knex.raw(`
        INSERT INTO resource_templates_old
        (id, name, description, is_active, phases_config, roles_allocation,
         assignment_date_mode, created_at, updated_at)
        SELECT
          id, name, description, is_active, phases_config, roles_allocation,
          assignment_date_mode, created_at, updated_at
        FROM resource_templates
      `);

      await knex.schema.dropTable('resource_templates');
      await knex.schema.renameTable('resource_templates_old', 'resource_templates');
    }
  }
}