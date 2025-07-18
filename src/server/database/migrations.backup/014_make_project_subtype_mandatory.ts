import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Making project_sub_type_id mandatory for all projects...');
  
  // Step 1: First, ensure all existing projects have a project_sub_type_id
  // Find projects without a subtype
  const projectsWithoutSubtype = await knex('projects')
    .whereNull('project_sub_type_id')
    .select('id', 'name', 'project_type_id');

  console.log(`Found ${projectsWithoutSubtype.length} projects without subtypes`);

  // Step 2: For each project without a subtype, assign the default subtype for its parent type
  for (const project of projectsWithoutSubtype) {
    if (project.project_type_id) {
      // Find the default subtype for this parent type
      const defaultSubtype = await knex('project_sub_types')
        .where('project_type_id', project.project_type_id)
        .where('is_default', true)
        .first();

      if (defaultSubtype) {
        await knex('projects')
          .where('id', project.id)
          .update({ project_sub_type_id: defaultSubtype.id });
        
        console.log(`Updated project "${project.name}" to use default subtype "${defaultSubtype.name}"`);
      } else {
        // If no default subtype exists, use the first available subtype
        const firstSubtype = await knex('project_sub_types')
          .where('project_type_id', project.project_type_id)
          .first();

        if (firstSubtype) {
          await knex('projects')
            .where('id', project.id)
            .update({ project_sub_type_id: firstSubtype.id });
          
          console.log(`Updated project "${project.name}" to use subtype "${firstSubtype.name}" (no default found)`);
        } else {
          console.warn(`Warning: No subtypes found for project type ${project.project_type_id} for project "${project.name}"`);
        }
      }
    }
  }

  // Step 3: Verify all projects now have subtypes
  const remainingProjectsWithoutSubtype = await knex('projects')
    .whereNull('project_sub_type_id')
    .count('* as count')
    .first();

  if (remainingProjectsWithoutSubtype?.count > 0) {
    throw new Error(`Migration failed: ${remainingProjectsWithoutSubtype.count} projects still don't have subtypes`);
  }

  // Step 4: Drop any dependent views that might reference the projects table
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

  // Step 5: Make project_sub_type_id NOT NULL
  await knex.schema.alterTable('projects', (table) => {
    table.uuid('project_sub_type_id').notNullable().alter();
  });

  console.log('Successfully made project_sub_type_id mandatory for all projects');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Reverting project_sub_type_id mandatory constraint...');
  
  // Drop dependent views first
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

  // Make project_sub_type_id nullable again
  await knex.schema.alterTable('projects', (table) => {
    table.uuid('project_sub_type_id').nullable().alter();
  });

  console.log('Successfully reverted project_sub_type_id mandatory constraint');
}