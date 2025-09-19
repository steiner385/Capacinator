import { Request, Response } from 'express';
import { getDb } from '../../database/index.js';
import { getAuditService } from '../../services/audit/index.js';

// Get all project sub-types (optionally filtered by project type)
export const getProjectSubTypes = async (req: Request, res: Response) => {
  try {
    const { project_type_id, include_inactive } = req.query;

    let query = getDb()('project_sub_types')
      .leftJoin('project_types', 'project_sub_types.project_type_id', 'project_types.id')
      .select(
        'project_sub_types.*',
        'project_types.name as project_type_name',
        'project_types.color_code as project_type_color'
      )
      .orderBy('project_types.sort_order')
      .orderBy('project_sub_types.sort_order')
      .orderBy('project_sub_types.name');

    if (project_type_id) {
      query = query.where('project_sub_types.project_type_id', project_type_id);
    }

    if (!include_inactive || include_inactive === 'false') {
      query = query.where('project_sub_types.is_active', true);
    }

    const projectSubTypes = await query;

    // Group by project type if no specific type is requested
    if (!project_type_id) {
      const grouped = projectSubTypes.reduce((acc: any, subType: any) => {
        const typeId = subType.project_type_id;
        if (!acc[typeId]) {
          acc[typeId] = {
            project_type_id: typeId,
            project_type_name: subType.project_type_name,
            project_type_color: subType.project_type_color,
            sub_types: []
          };
        }
        acc[typeId].sub_types.push(subType);
        return acc;
      }, {});

      return res.json({
        success: true,
        data: Object.values(grouped)
      });
    }

    res.json({
      success: true,
      data: projectSubTypes
    });
  } catch (error) {
    console.error('Error fetching project sub-types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project sub-types'
    });
  }
};

// Get a specific project sub-type by ID
export const getProjectSubType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const projectSubType = await getDb()('project_sub_types')
      .leftJoin('project_types', 'project_sub_types.project_type_id', 'project_types.id')
      .select(
        'project_sub_types.*',
        'project_types.name as project_type_name',
        'project_types.color_code as project_type_color'
      )
      .where('project_sub_types.id', id)
      .first();

    if (!projectSubType) {
      return res.status(404).json({
        success: false,
        error: 'Project sub-type not found'
      });
    }

    // Get associated phases
    const phases = await getDb()('project_type_phases')
      .join('project_phases', 'project_type_phases.phase_id', 'project_phases.id')
      .where('project_type_phases.project_sub_type_id', id)
      .orWhere('project_type_phases.project_type_id', projectSubType.project_type_id)
      .select(
        'project_phases.*',
        'project_type_phases.order_index',
        'project_type_phases.duration_weeks',
        'project_type_phases.is_inherited'
      )
      .orderBy('project_type_phases.order_index');

    // Get resource templates
    const resourceTemplates = await getDb()('resource_templates')
      .join('roles', 'resource_templates.role_id', 'roles.id')
      .join('project_phases', 'resource_templates.phase_id', 'project_phases.id')
      .where('resource_templates.project_sub_type_id', id)
      .orWhere('resource_templates.project_type_id', projectSubType.project_type_id)
      .select(
        'resource_templates.*',
        'roles.name as role_name',
        'project_phases.name as phase_name',
        'resource_templates.is_inherited'
      )
      .orderBy('project_phases.order_index')
      .orderBy('roles.name');

    res.json({
      success: true,
      data: {
        ...projectSubType,
        phases,
        resource_templates: resourceTemplates
      }
    });
  } catch (error) {
    console.error('Error fetching project sub-type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project sub-type'
    });
  }
};

// Create a new project sub-type
export const createProjectSubType = async (req: Request, res: Response) => {
  try {
    const { project_type_id, name, description, color_code, sort_order, is_default } = req.body;

    // Validate required fields
    if (!project_type_id || !name) {
      return res.status(400).json({
        success: false,
        error: 'Project type ID and name are required'
      });
    }

    // Check if project type exists
    const projectType = await getDb()('project_types').where('id', project_type_id).first();
    if (!projectType) {
      return res.status(404).json({
        success: false,
        error: 'Project type not found'
      });
    }

    // Check for duplicate name within the same project type
    const existingSubType = await getDb()('project_sub_types')
      .where('project_type_id', project_type_id)
      .where('name', name)
      .first();

    if (existingSubType) {
      return res.status(409).json({
        success: false,
        error: 'A sub-type with this name already exists for this project type'
      });
    }

    const newProjectSubType = {
      project_type_id,
      name,
      description: description || null,
      color_code: color_code || null,
      sort_order: sort_order || 0,
      is_default: is_default || false,
      is_active: true
    };

    const [created] = await getDb()('project_sub_types')
      .insert(newProjectSubType)
      .returning('*');

    // Inherit phases and resource templates from parent project type
    await inheritFromProjectType(created.id, project_type_id);

    // Audit log
    const auditService = getAuditService();
    await auditService.logChange({
      tableName: 'project_sub_types',
      recordId: created.id,
      action: 'CREATE',
      oldValues: null,
      newValues: created,
      changedBy: req.user?.id || 'system'
    });

    res.status(201).json({
      success: true,
      data: created
    });
  } catch (error) {
    console.error('Error creating project sub-type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project sub-type'
    });
  }
};

// Update a project sub-type
export const updateProjectSubType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, color_code, sort_order, is_active } = req.body;

    // Get existing record for audit
    const existingSubType = await getDb()('project_sub_types').where('id', id).first();
    if (!existingSubType) {
      return res.status(404).json({
        success: false,
        error: 'Project sub-type not found'
      });
    }

    // Check for duplicate name (if name is being changed)
    if (name && name !== existingSubType.name) {
      const duplicateSubType = await getDb()('project_sub_types')
        .where('project_type_id', existingSubType.project_type_id)
        .where('name', name)
        .where('id', '!=', id)
        .first();

      if (duplicateSubType) {
        return res.status(409).json({
          success: false,
          error: 'A sub-type with this name already exists for this project type'
        });
      }
    }

    const updates: any = {
      updated_at: new Date()
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color_code !== undefined) updates.color_code = color_code;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (is_active !== undefined) updates.is_active = is_active;

    const [updated] = await getDb()('project_sub_types')
      .where('id', id)
      .update(updates)
      .returning('*');

    // Audit log
    const auditService = getAuditService();
    await auditService.logChange({
      tableName: 'project_sub_types',
      recordId: id,
      action: 'UPDATE',
      oldValues: existingSubType,
      newValues: updated,
      changedBy: req.user?.id || 'system'
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating project sub-type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project sub-type'
    });
  }
};

// Delete a project sub-type
export const deleteProjectSubType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get existing record for audit
    const existingSubType = await getDb()('project_sub_types').where('id', id).first();
    if (!existingSubType) {
      return res.status(404).json({
        success: false,
        error: 'Project sub-type not found'
      });
    }

    // Check if sub-type is being used by any projects
    const projectCount = await getDb()('projects')
      .where('project_sub_type_id', id)
      .count('* as count')
      .first();

    if (projectCount && parseInt(projectCount.count as string) > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete project sub-type that is being used by projects'
      });
    }

    // Delete associated records first
    await getDb().transaction(async (trx) => {
      // Delete resource templates
      await trx('resource_templates')
        .where('project_sub_type_id', id)
        .del();

      // Delete phase relationships
      await trx('project_type_phases')
        .where('project_sub_type_id', id)
        .del();

      // Delete the sub-type
      await trx('project_sub_types')
        .where('id', id)
        .del();
    });

    // Audit log
    const auditService = getAuditService();
    await auditService.logChange({
      tableName: 'project_sub_types',
      recordId: id,
      action: 'DELETE',
      oldValues: existingSubType,
      newValues: null,
      changedBy: req.user?.id || 'system'
    });

    res.json({
      success: true,
      message: 'Project sub-type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project sub-type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project sub-type'
    });
  }
};

// Helper function to inherit phases and resource templates from parent project type
async function inheritFromProjectType(subTypeId: string, projectTypeId: string) {
  try {
    // Inherit phases
    const parentPhases = await getDb()('project_type_phases')
      .where('project_type_id', projectTypeId)
      .whereNull('project_sub_type_id');

    for (const phase of parentPhases) {
      await getDb()('project_type_phases').insert({
        project_sub_type_id: subTypeId,
        project_type_id: projectTypeId,
        phase_id: phase.phase_id,
        order_index: phase.order_index,
        duration_weeks: phase.duration_weeks,
        is_inherited: true
      });
    }

    // Inherit resource templates
    const parentTemplates = await getDb()('resource_templates')
      .where('project_type_id', projectTypeId)
      .whereNull('project_sub_type_id');

    for (const template of parentTemplates) {
      await getDb()('resource_templates').insert({
        project_sub_type_id: subTypeId,
        project_type_id: projectTypeId,
        phase_id: template.phase_id,
        role_id: template.role_id,
        allocation_percentage: template.allocation_percentage,
        is_inherited: true,
        parent_template_id: template.id
      });
    }
  } catch (error) {
    console.error('Error inheriting from project type:', error);
    throw error;
  }
}