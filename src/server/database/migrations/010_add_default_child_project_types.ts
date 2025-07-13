import type { Knex } from 'knex';
import { randomUUID } from 'crypto';

export async function up(knex: Knex): Promise<void> {
  // Add is_default column to project_types table
  await knex.schema.alterTable('project_types', (table) => {
    table.boolean('is_default').defaultTo(false).notNullable();
  });
  
  // Create default child project types for each existing parent project type
  const parentProjectTypes = await knex('project_types')
    .where('parent_id', null)
    .select('*');
  
  for (const parent of parentProjectTypes) {
    // Check if a default child already exists
    const existingDefault = await knex('project_types')
      .where('parent_id', parent.id)
      .where('is_default', true)
      .first();
    
    if (!existingDefault) {
      // Create default child project type
      const defaultChildId = randomUUID();
      await knex('project_types').insert({
        id: defaultChildId,
        name: `${parent.name} (Default)`,
        description: `Default configuration for ${parent.name} projects`,
        parent_id: parent.id,
        is_default: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // Copy all resource templates from parent to default child
      const parentTemplates = await knex('resource_templates')
        .where('project_type_id', parent.id)
        .select('*');
      
      for (const template of parentTemplates) {
        await knex('resource_templates').insert({
          id: randomUUID(),
          project_type_id: defaultChildId,
          phase_id: template.phase_id,
          role_id: template.role_id,
          allocation_percentage: template.allocation_percentage,
          is_inherited: true,
          parent_template_id: template.id,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove default child project types
  const defaultChildren = await knex('project_types')
    .where('is_default', true)
    .select('id');
  
  for (const child of defaultChildren) {
    // Remove associated resource templates
    await knex('resource_templates')
      .where('project_type_id', child.id)
      .del();
  }
  
  // Remove default child project types
  await knex('project_types')
    .where('is_default', true)
    .del();
  
  // Remove is_default column
  await knex.schema.alterTable('project_types', (table) => {
    table.dropColumn('is_default');
  });
}