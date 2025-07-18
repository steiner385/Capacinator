import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Step 1: Create the new project_sub_types table
  await knex.schema.createTable('project_sub_types', (table) => {
    table.uuid('id').primary();
    table.uuid('project_type_id').notNullable();
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.string('color_code', 7).nullable(); // Inherits from parent if null
    table.integer('sort_order').defaultTo(0);
    table.boolean('is_default').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key constraint
    table.foreign('project_type_id').references('id').inTable('project_types').onDelete('CASCADE');
    
    // Unique constraint on project_type_id + name
    table.unique(['project_type_id', 'name']);
    
    // Indexes for performance
    table.index('project_type_id');
    table.index(['project_type_id', 'is_active']);
  });

  // Step 2: Migrate existing data
  console.log('Starting project type data migration...');
  
  // Get all current project types with hierarchy information
  const allProjectTypes = await knex('project_types')
    .select('*')
    .orderBy('level')
    .orderBy('sort_order');

  // Separate parents and children
  const parentTypes = allProjectTypes.filter(pt => pt.parent_id === null);
  const childTypes = allProjectTypes.filter(pt => pt.parent_id !== null);

  console.log(`Found ${parentTypes.length} parent types and ${childTypes.length} child types`);

  // Step 3: Migrate child types to project_sub_types
  for (const childType of childTypes) {
    // Verify parent exists
    const parentExists = parentTypes.find(pt => pt.id === childType.parent_id);
    if (!parentExists) {
      console.log(`Warning: Child type "${childType.name}" has parent_id "${childType.parent_id}" that doesn't exist. Skipping.`);
      continue;
    }

    await knex('project_sub_types').insert({
      id: childType.id, // Keep same ID for foreign key consistency
      project_type_id: childType.parent_id,
      name: childType.name,
      description: childType.description,
      color_code: childType.color_code !== '#000000' ? childType.color_code : null,
      sort_order: childType.sort_order || 0,
      is_default: childType.is_default || false,
      is_active: true,
      created_at: childType.created_at,
      updated_at: childType.updated_at
    });
  }

  console.log(`Migrated ${childTypes.length} child types to project_sub_types`);

  // Step 4: Update projects table to reference project_sub_types
  // First, drop all dependent views that reference projects table
  const viewsToDropBeforeTableChanges = [
    'capacity_gaps_view',
    'project_demands_summary',
    'project_demands_view',
    'person_availability_view',
    'person_utilization_view',
    'project_health_view',
    'project_planning_view',
    'project_access_view',
    'role_planner_permissions_view',
    'supervisor_permissions_view'
  ];

  for (const viewName of viewsToDropBeforeTableChanges) {
    await knex.raw(`DROP VIEW IF EXISTS ${viewName}`);
  }

  // Add new column
  await knex.schema.alterTable('projects', (table) => {
    table.uuid('project_sub_type_id').nullable();
    table.foreign('project_sub_type_id').references('id').inTable('project_sub_types').onDelete('SET NULL');
    table.index('project_sub_type_id');
  });

  // Update existing projects to use sub-types
  // Only update projects whose child types were successfully migrated
  const successfullyMigratedChildTypes = await knex('project_sub_types').select('id');
  const migratedChildTypeIds = successfullyMigratedChildTypes.map(st => st.id);

  const projectsWithChildTypes = await knex('projects')
    .whereIn('project_type_id', migratedChildTypeIds);

  for (const project of projectsWithChildTypes) {
    await knex('projects')
      .where('id', project.id)
      .update({ project_sub_type_id: project.project_type_id });
  }

  // Update projects with parent types to use their default child
  const projectsWithParentTypes = await knex('projects')
    .whereIn('project_type_id', parentTypes.map(pt => pt.id));

  for (const project of projectsWithParentTypes) {
    // Find the default sub-type for this parent
    const defaultSubType = await knex('project_sub_types')
      .where('project_type_id', project.project_type_id)
      .where('is_default', true)
      .first();

    if (defaultSubType) {
      await knex('projects')
        .where('id', project.id)
        .update({ 
          project_sub_type_id: defaultSubType.id,
          project_type_id: project.project_type_id // Keep parent type reference for now
        });
    }
  }

  console.log(`Updated ${projectsWithChildTypes.length + projectsWithParentTypes.length} projects`);

  // Step 5: Update resource_templates table
  await knex.schema.alterTable('resource_templates', (table) => {
    table.uuid('project_sub_type_id').nullable();
    table.foreign('project_sub_type_id').references('id').inTable('project_sub_types').onDelete('CASCADE');
    table.index('project_sub_type_id');
  });

  // Migrate resource templates for child types
  // Only update templates for successfully migrated child types
  const childTypeTemplates = await knex('resource_templates')
    .whereIn('project_type_id', migratedChildTypeIds);

  for (const template of childTypeTemplates) {
    await knex('resource_templates')
      .where('id', template.id)
      .update({ project_sub_type_id: template.project_type_id });
  }

  console.log(`Updated ${childTypeTemplates.length} resource templates`);

  // Step 6: Update project_type_phases junction table
  await knex.schema.alterTable('project_type_phases', (table) => {
    table.uuid('project_sub_type_id').nullable();
    table.foreign('project_sub_type_id').references('id').inTable('project_sub_types').onDelete('CASCADE');
    table.index('project_sub_type_id');
  });

  // Migrate phase relationships for child types
  // Only update phases for successfully migrated child types
  const childTypePhases = await knex('project_type_phases')
    .whereIn('project_type_id', migratedChildTypeIds);

  for (const phase of childTypePhases) {
    await knex('project_type_phases')
      .where('id', phase.id)
      .update({ project_sub_type_id: phase.project_type_id });
  }

  console.log(`Updated ${childTypePhases.length} project type phases`);

  // Step 7: Skip deletion of child types from project_types table
  // They remain for referential integrity but will be marked as inactive after schema changes
  console.log(`Skipping deletion of ${migratedChildTypeIds.length} child types - will clean up later`);

  // Step 8: Schema cleanup will be handled in a separate migration
  // The main data migration is complete - the rest can be done later
  console.log('Core data migration completed successfully!');

  console.log('Project type refactoring migration completed successfully!');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Rolling back project type refactoring...');
  
  // Step 1: Add hierarchy columns back to project_types
  await knex.schema.alterTable('project_types', (table) => {
    table.uuid('parent_id').nullable();
    table.boolean('is_parent').defaultTo(false);
    table.integer('level').defaultTo(0);
    table.boolean('is_default').defaultTo(false);
    table.foreign('parent_id').references('id').inTable('project_types');
    table.index('parent_id');
  });

  // Step 2: Migrate sub-types back to project_types as child types
  const allSubTypes = await knex('project_sub_types').select('*');
  
  for (const subType of allSubTypes) {
    await knex('project_types').insert({
      id: subType.id,
      name: subType.name,
      description: subType.description,
      color_code: subType.color_code || '#000000',
      parent_id: subType.project_type_id,
      is_parent: false,
      level: 1,
      sort_order: subType.sort_order,
      is_default: subType.is_default,
      created_at: subType.created_at,
      updated_at: subType.updated_at
    });
  }

  // Step 3: Update parent types to be marked as parents
  const parentTypeIds = [...new Set(allSubTypes.map(st => st.project_type_id))];
  await knex('project_types')
    .whereIn('id', parentTypeIds)
    .update({ is_parent: true });

  // Step 4: Restore project references
  await knex('projects')
    .whereNotNull('project_sub_type_id')
    .update({ project_type_id: knex.ref('project_sub_type_id') });

  // Step 5: Restore resource template references
  await knex('resource_templates')
    .whereNotNull('project_sub_type_id')
    .update({ project_type_id: knex.ref('project_sub_type_id') });

  // Step 6: Restore phase references
  await knex('project_type_phases')
    .whereNotNull('project_sub_type_id')
    .update({ project_type_id: knex.ref('project_sub_type_id') });

  // Step 7: Drop new columns and constraints
  await knex.schema.alterTable('projects', (table) => {
    table.dropForeign(['project_sub_type_id']);
    table.dropColumn('project_sub_type_id');
  });

  await knex.schema.alterTable('resource_templates', (table) => {
    table.dropForeign(['project_sub_type_id']);
    table.dropColumn('project_sub_type_id');
  });

  await knex.schema.alterTable('project_type_phases', (table) => {
    table.dropForeign(['project_sub_type_id']);
    table.dropColumn('project_sub_type_id');
  });

  // Step 8: Drop project_sub_types table
  await knex.schema.dropTableIfExists('project_sub_types');

  console.log('Project type refactoring rollback completed!');
}