import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';

interface ProjectTypeWithHierarchy {
  id: string;
  name: string;
  description: string;
  color_code: string;
  parent_id?: string;
  is_parent: boolean;
  level: number;
  sort_order: number;
  children?: ProjectTypeWithHierarchy[];
  phases?: any[];
}

export class ProjectTypeHierarchyController extends BaseController {

  // Get all project types with hierarchy structure
  getHierarchy = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get all project types (parents)
      const projectTypes = await this.db('project_types')
        .select('*')
        .orderBy('name');

      // Get all project sub-types (children)
      const projectSubTypes = await this.db('project_sub_types')
        .leftJoin('project_types', 'project_sub_types.project_type_id', 'project_types.id')
        .select(
          'project_sub_types.*',
          'project_types.name as project_type_name',
          'project_types.color_code as project_type_color'
        )
        .orderBy('project_types.name')
        .orderBy('project_sub_types.name');

      const hierarchy = this.buildNewHierarchy(projectTypes, projectSubTypes);
      
      res.json({ 
        success: true, 
        data: hierarchy
      });
    } catch (error) {
      console.error('Hierarchy error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get hierarchy',
        details: (error as Error).message 
      });
    }
  };

  // Get phases for a project type (including inherited)
  getProjectTypePhases = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const { projectTypeId } = req.params;
      const phases = await this.getInheritedPhases(projectTypeId);
      
      return res.json({ 
        success: true, 
        data: phases 
      });
    }, res);
  };

  // Create Project Sub-Type
  createChild = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const { parentId } = req.params;
      const { name, description, color_code } = req.body;
      
      const parent = await this.db('project_types').where('id', parentId).first();
      if (!parent) {
        return res.status(404).json({ error: 'Project Type not found' });
      }

      // Get max sort order for Project Sub-Types of this Project Type
      const maxSortOrder = await this.db('project_types')
        .where('parent_id', parentId)
        .max('sort_order as max')
        .first();

      const nextSortOrder = (maxSortOrder?.max || 0) + 1;

      const child = await this.db('project_types').insert({
        name,
        description,
        color_code,
        parent_id: parentId,
        is_parent: false,
        level: parent.level + 1,
        sort_order: nextSortOrder
      }).returning('*');

      // Update Project Type to mark as having Project Sub-Types
      await this.db('project_types')
        .where('id', parentId)
        .update({ is_parent: true });

      // Inherit phases from Project Type
      await this.inheritPhases(child[0].id, parentId);
      
      return res.json({ 
        success: true, 
        data: child[0] 
      });
    }, res);
  };

  // Add phase to project type (only allowed for Project Types)
  addPhase = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const { projectTypeId } = req.params;
      const { phaseId, orderIndex } = req.body;

      // Check if this is a Project Type (phases can only be added to Project Types)
      const projectType = await this.db('project_types').where('id', projectTypeId).first();
      if (!projectType) {
        return res.status(404).json({ error: 'Project type not found' });
      }

      // Only allow adding phases to Project Types or root-level types
      if (projectType.parent_id !== null) {
        return res.status(400).json({ 
          error: 'Phases can only be added to Project Types. Project Sub-Types inherit phases from their Project Type.' 
        });
      }

      // Check if already exists
      const existing = await this.db('project_type_phases')
        .where({ project_type_id: projectTypeId, phase_id: phaseId })
        .first();

      if (existing) {
        return res.status(400).json({ error: 'Phase already assigned to this project type' });
      }

      // Get the actual order index if not provided
      const actualOrderIndex = orderIndex || await this.getNextPhaseOrderIndex(projectTypeId);

      await this.db('project_type_phases').insert({
        project_type_id: projectTypeId,
        phase_id: phaseId,
        is_inherited: false,
        order_index: actualOrderIndex
      });

      // Propagate to Project Sub-Types
      await this.propagatePhaseToChildren(projectTypeId, phaseId, actualOrderIndex);

      return res.json({ success: true });
    }, res);
  };

  // Remove phase from project type (only allowed for Project Types)
  removePhase = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const { projectTypeId, phaseId } = req.params;

      // Check if this is a Project Type (phases can only be removed from Project Types)
      const projectType = await this.db('project_types').where('id', projectTypeId).first();
      if (!projectType) {
        return res.status(404).json({ error: 'Project type not found' });
      }

      // Only allow removing phases from Project Types or root-level types
      if (projectType.parent_id !== null) {
        return res.status(400).json({ 
          error: 'Phases can only be removed from Project Types. Project Sub-Types inherit phases from their Project Type.' 
        });
      }

      // Check if phase is inherited (can't remove inherited phases)
      const phaseAssignment = await this.db('project_type_phases')
        .where({ project_type_id: projectTypeId, phase_id: phaseId })
        .first();

      if (!phaseAssignment) {
        return res.status(404).json({ error: 'Phase not found for this project type' });
      }

      if (phaseAssignment.is_inherited) {
        return res.status(400).json({ error: 'Cannot remove inherited phases' });
      }

      // Remove the phase
      await this.db('project_type_phases')
        .where({ project_type_id: projectTypeId, phase_id: phaseId })
        .delete();

      // Remove from Project Sub-Types too
      await this.removePhaseFromChildren(projectTypeId, phaseId);

      return res.json({ success: true });
    }, res);
  };

  // Update project type hierarchy (move, reorder)
  updateHierarchy = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const { projectTypeId } = req.params;
      const { newParentId, newSortOrder } = req.body;

      const projectType = await this.db('project_types').where('id', projectTypeId).first();
      if (!projectType) {
        return res.status(404).json({ error: 'Project type not found' });
      }

      const updates: any = {};

      // Handle parent change
      if (newParentId !== undefined) {
        if (newParentId === null) {
          // Moving to root level
          updates.parent_id = null;
          updates.level = 0;
        } else {
          // Moving to new parent
          const newParent = await this.db('project_types').where('id', newParentId).first();
          if (!newParent) {
            return res.status(404).json({ error: 'New parent not found' });
          }
          updates.parent_id = newParentId;
          updates.level = newParent.level + 1;

          // Mark new Project Type as having Project Sub-Types
          await this.db('project_types')
            .where('id', newParentId)
            .update({ is_parent: true });
        }

        // Update all Project Sub-Types' levels
        await this.updateDescendantLevels(projectTypeId, updates.level);
      }

      // Handle sort order change
      if (newSortOrder !== undefined) {
        updates.sort_order = newSortOrder;
      }

      // Apply updates
      if (Object.keys(updates).length > 0) {
        await this.db('project_types')
          .where('id', projectTypeId)
          .update(updates);
      }

      return res.json({ success: true });
    }, res);
  };

  // Private helper methods
  private buildHierarchy(projectTypes: any[]): ProjectTypeWithHierarchy[] {
    const map = new Map<string, ProjectTypeWithHierarchy>();
    const roots: ProjectTypeWithHierarchy[] = [];

    // Create map of all project types
    projectTypes.forEach(pt => {
      map.set(pt.id, { ...pt, children: [] });
    });

    // Build hierarchy
    projectTypes.forEach(pt => {
      const item = map.get(pt.id)!;
      if (pt.parent_id) {
        const parent = map.get(pt.parent_id);
        if (parent) {
          parent.children!.push(item);
        }
      } else {
        roots.push(item);
      }
    });

    return roots;
  }

  private buildNewHierarchy(projectTypes: any[], projectSubTypes: any[]): ProjectTypeWithHierarchy[] {
    const hierarchy: ProjectTypeWithHierarchy[] = [];

    // Convert project types to hierarchy format
    projectTypes.forEach(pt => {
      const hierarchyItem: ProjectTypeWithHierarchy = {
        id: pt.id,
        name: pt.name,
        description: pt.description || '',
        color_code: pt.color_code || '#6b7280',
        parent_id: undefined,
        is_parent: true,
        level: 0,
        sort_order: 0,
        children: []
      };

      // Find Project Sub-Types for this Project Type
      const subTypes = projectSubTypes.filter(st => st.project_type_id === pt.id);
      
      subTypes.forEach(st => {
        const subTypeItem: ProjectTypeWithHierarchy = {
          id: st.id,
          name: st.name,
          description: st.description || '',
          color_code: st.color_code || pt.color_code || '#6b7280',
          parent_id: pt.id,
          is_parent: false,
          level: 1,
          sort_order: st.sort_order || 0,
          children: []
        };
        
        hierarchyItem.children!.push(subTypeItem);
      });

      // Sort Project Sub-Types by sort_order and name
      hierarchyItem.children!.sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return a.name.localeCompare(b.name);
      });

      hierarchy.push(hierarchyItem);
    });

    return hierarchy;
  }

  private async getInheritedPhases(projectTypeId: string): Promise<any[]> {
    // Get direct phases
    const directPhases = await this.db('project_type_phases')
      .join('project_phases', 'project_type_phases.phase_id', 'project_phases.id')
      .where('project_type_phases.project_type_id', projectTypeId)
      .select(
        'project_phases.*',
        'project_type_phases.is_inherited',
        'project_type_phases.order_index',
        'project_type_phases.duration_weeks as override_duration'
      )
      .orderBy('project_type_phases.order_index');

    // If no direct phases and has parent, get inherited phases
    if (directPhases.length === 0) {
      const projectType = await this.db('project_types').where('id', projectTypeId).first();
      if (projectType?.parent_id) {
        return this.getInheritedPhases(projectType.parent_id);
      }
    }

    return directPhases;
  }

  private async inheritPhases(childId: string, parentId: string): Promise<void> {
    const parentPhases = await this.getInheritedPhases(parentId);
    
    const inheritedPhases = parentPhases.map((phase, index) => ({
      project_type_id: childId,
      phase_id: phase.id,
      is_inherited: true,
      order_index: index + 1
    }));

    if (inheritedPhases.length > 0) {
      await this.db('project_type_phases').insert(inheritedPhases);
    }
  }

  private async propagatePhaseToChildren(parentId: string, phaseId: string, orderIndex: number): Promise<void> {
    const subTypes = await this.db('project_types').where('parent_id', parentId);
    
    for (const subType of subTypes) {
      // Add inherited phase to Project Sub-Type
      await this.db('project_type_phases')
        .insert({
          project_type_id: subType.id,
          phase_id: phaseId,
          is_inherited: true,
          order_index: orderIndex
        })
        .onConflict(['project_type_id', 'phase_id'])
        .ignore();

      // Recurse to nested Project Sub-Types
      await this.propagatePhaseToChildren(subType.id, phaseId, orderIndex);
    }
  }

  private async removePhaseFromChildren(parentId: string, phaseId: string): Promise<void> {
    const subTypes = await this.db('project_types').where('parent_id', parentId);
    
    for (const subType of subTypes) {
      // Remove only inherited phases (not direct assignments)
      await this.db('project_type_phases')
        .where({
          project_type_id: subType.id,
          phase_id: phaseId,
          is_inherited: true
        })
        .delete();

      // Recurse to nested Project Sub-Types
      await this.removePhaseFromChildren(subType.id, phaseId);
    }
  }

  private async getNextPhaseOrderIndex(projectTypeId: string): Promise<number> {
    const maxOrder = await this.db('project_type_phases')
      .where('project_type_id', projectTypeId)
      .max('order_index as max')
      .first();

    return (maxOrder?.max || 0) + 1;
  }

  private async updateDescendantLevels(projectTypeId: string, newLevel: number): Promise<void> {
    const subTypes = await this.db('project_types').where('parent_id', projectTypeId);
    
    for (const subType of subTypes) {
      const subTypeLevel = newLevel + 1;
      await this.db('project_types')
        .where('id', subType.id)
        .update({ level: subTypeLevel });

      // Recurse to update nested Project Sub-Types
      await this.updateDescendantLevels(subType.id, subTypeLevel);
    }
  }
}