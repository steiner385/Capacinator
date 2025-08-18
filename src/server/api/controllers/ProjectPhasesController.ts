import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { AssignmentRecalculationService } from '../../services/AssignmentRecalculationService.js';
import { ProjectPhaseCascadeService } from '../../services/ProjectPhaseCascadeService.js';

export class ProjectPhasesController extends BaseController {
  async getAll(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await this.executeQuery(async () => {
      let query = this.db('project_phases_timeline')
        .join('projects', 'project_phases_timeline.project_id', 'projects.id')
        .join('project_phases', 'project_phases_timeline.phase_id', 'project_phases.id')
        .select(
          'project_phases_timeline.*',
          'projects.name as project_name',
          'project_phases.name as phase_name',
          'project_phases.order_index as phase_order',
          this.db.raw('CASE WHEN project_phases.name LIKE \'%Project:%\' THEN 1 ELSE 0 END as is_custom_phase')
        );

      // Apply filters with proper table references
      if (req.query.project_id) {
        query = query.where('project_phases_timeline.project_id', req.query.project_id);
      }
      if (req.query.phase_id) {
        query = query.where('project_phases_timeline.phase_id', req.query.phase_id);
      }
      
      if (req.query.page || req.query.limit) {
        query = this.paginate(query, page, limit);
      } else {
        query = query.orderBy('projects.name', 'project_phases.order_index');
      }

      const projectPhases = await query;

      // Get total count if paginated
      let total = projectPhases.length;
      if (req.query.page || req.query.limit) {
        let countQuery = this.db('project_phases_timeline').count('* as count');
        
        // Apply the same filters to count query
        if (req.query.project_id) {
          countQuery = countQuery.where('project_id', req.query.project_id);
        }
        if (req.query.phase_id) {
          countQuery = countQuery.where('phase_id', req.query.phase_id);
        }
        
        const totalResult = await countQuery.first();
        total = Number(totalResult?.count) || 0;
      }

      if (req.query.page || req.query.limit) {
        return {
          data: projectPhases,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        };
      } else {
        return { data: projectPhases };
      }
    }, res, 'Failed to fetch project phases');

    if (result) {
      res.json(result);
    }
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const projectPhase = await this.db('project_phases_timeline')
        .join('projects', 'project_phases_timeline.project_id', 'projects.id')
        .join('project_phases', 'project_phases_timeline.phase_id', 'project_phases.id')
        .select(
          'project_phases_timeline.*',
          'projects.name as project_name',
          'project_phases.name as phase_name',
          'project_phases.order_index as phase_order'
        )
        .where('project_phases_timeline.id', id)
        .first();

      if (!projectPhase) {
        this.handleNotFound(res, 'Project phase');
        return null;
      }

      return { data: projectPhase };
    }, res, 'Failed to fetch project phase');

    if (result) {
      res.json(result);
    }
  }

  async create(req: Request, res: Response) {
    const phaseData = req.body;

    const result = await this.executeQuery(async () => {
      // Validate that project exists
      const project = await this.db('projects')
        .where('id', phaseData.project_id)
        .first();

      if (!project) {
        res.status(404).json({
          error: 'Project not found'
        });
        return null;
      }

      // Validate that phase exists
      const phase = await this.db('project_phases')
        .where('id', phaseData.phase_id)
        .first();

      if (!phase) {
        res.status(404).json({
          error: 'Phase not found'
        });
        return null;
      }

      // Check for duplicate
      const existing = await this.db('project_phases_timeline')
        .where({
          project_id: phaseData.project_id,
          phase_id: phaseData.phase_id
        })
        .first();

      if (existing) {
        res.status(409).json({
          error: 'Phase already exists for this project',
          existing
        });
        return null;
      }

      const [projectPhase] = await this.db('project_phases_timeline')
        .insert({
          ...phaseData,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      // Auto-create FS dependency for serial phase enforcement
      // Every phase (except the first) must have exactly one FS dependency
      const existingPhases = await this.db('project_phases_timeline')
        .where('project_id', phaseData.project_id)
        .whereNot('id', projectPhase.id) // Exclude the phase we just created
        .orderBy('start_date', 'desc'); // Get phases in reverse chronological order

      if (existingPhases.length > 0) {
        // This is not the first phase, so create an FS dependency to the previous phase
        const previousPhase = existingPhases[0]; // Latest phase by start_date
        
        // Create the FS dependency
        await this.db('project_phase_dependencies').insert({
          project_id: phaseData.project_id,
          predecessor_phase_timeline_id: previousPhase.id,
          successor_phase_timeline_id: projectPhase.id,
          dependency_type: 'FS',
          lag_days: 0,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      return { data: projectPhase };
    }, res, 'Failed to create project phase');

    if (result) {
      res.status(201).json(result);
    }
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const updateData = req.body;

    const result = await this.executeQuery(async () => {
      // Validate dates
      if (updateData.start_date && updateData.end_date) {
        const startDate = new Date(updateData.start_date);
        const endDate = new Date(updateData.end_date);
        
        if (startDate >= endDate) {
          res.status(400).json({
            error: 'Start date must be before end date'
          });
          return null;
        }
      }

      // Get the current phase info to determine if it's custom
      const currentPhase = await this.db('project_phases_timeline')
        .leftJoin('project_phases', 'project_phases_timeline.phase_id', 'project_phases.id')
        .select(
          'project_phases_timeline.*',
          'project_phases.name as phase_name',
          this.db.raw('CASE WHEN project_phases.name LIKE \'%Project:%\' THEN 1 ELSE 0 END as is_custom_phase')
        )
        .where('project_phases_timeline.id', id)
        .first();

      if (!currentPhase) {
        this.handleNotFound(res, 'Project phase');
        return null;
      }

      // Check if this is a custom phase (has the is_custom_phase flag)
      const isCustomPhase = currentPhase.is_custom_phase === 1;
      
      // Filter allowed fields based on phase type
      let allowedFields = ['start_date', 'end_date'];
      if (isCustomPhase) {
        allowedFields.push('phase_name');
      }
      
      const timelineUpdateData = Object.keys(updateData)
        .filter(key => ['start_date', 'end_date'].includes(key))
        .reduce((obj, key) => {
          obj[key] = updateData[key];
          return obj;
        }, {} as any);

      const phaseUpdateData = isCustomPhase && updateData.phase_name ? 
        { name: updateData.phase_name } : null;

      if (Object.keys(timelineUpdateData).length === 0 && !phaseUpdateData) {
        res.status(400).json({
          error: `No valid fields to update. Allowed fields: ${allowedFields.join(', ')}`
        });
        return null;
      }

      // Check for dependency conflicts and calculate cascade if dates are changing
      let cascadeResult = null;
      if (timelineUpdateData.start_date || timelineUpdateData.end_date) {
        const cascadeService = new ProjectPhaseCascadeService(this.db);
        
        // Get the new dates (use current if not provided)
        const newStartDate = timelineUpdateData.start_date ? 
          new Date(timelineUpdateData.start_date) : 
          new Date(currentPhase.start_date);
        const newEndDate = timelineUpdateData.end_date ? 
          new Date(timelineUpdateData.end_date) : 
          new Date(currentPhase.end_date);
        
        // Calculate cascade effects
        cascadeResult = await cascadeService.calculateCascade(
          currentPhase.project_id,
          id,
          newStartDate,
          newEndDate
        );
        
        // Check if there are validation errors
        if (cascadeResult.validation_errors && cascadeResult.validation_errors.length > 0) {
          res.status(400).json({
            error: 'Dependency validation failed',
            validation_errors: cascadeResult.validation_errors
          });
          return null;
        }
        
        // Check if there are circular dependencies
        if (cascadeResult.circular_dependencies.length > 0) {
          res.status(400).json({
            error: 'Circular dependencies detected',
            circular_dependencies: cascadeResult.circular_dependencies
          });
          return null;
        }
      }

      // Update timeline data
      if (Object.keys(timelineUpdateData).length > 0) {
        await this.db('project_phases_timeline')
          .where('id', id)
          .update({
            ...timelineUpdateData,
            updated_at: new Date()
          });
        
        // Apply cascade changes if any
        if (cascadeResult && cascadeResult.affected_phases.length > 0) {
          const cascadeService = new ProjectPhaseCascadeService(this.db);
          await cascadeService.applyCascade(currentPhase.project_id, cascadeResult);
        }
      }

      // Update phase name if it's a custom phase
      if (phaseUpdateData && currentPhase.phase_id) {
        await this.db('project_phases')
          .where('id', currentPhase.phase_id)
          .update({
            ...phaseUpdateData,
            updated_at: new Date()
          });
      }

      // Recalculate assignments if phase dates changed
      let assignmentResult = { updated_assignments: [], conflicts: [] };
      if (Object.keys(timelineUpdateData).length > 0 && (timelineUpdateData.start_date || timelineUpdateData.end_date)) {
        const assignmentService = new AssignmentRecalculationService(this.db);
        assignmentResult = await assignmentService.recalculateAssignmentsForPhaseChanges(
          currentPhase.project_id,
          [currentPhase.phase_id]
        );
      }

      // Get the updated phase data
      const projectPhase = await this.db('project_phases_timeline')
        .leftJoin('project_phases', 'project_phases_timeline.phase_id', 'project_phases.id')
        .select(
          'project_phases_timeline.*',
          'project_phases.name as phase_name',
          this.db.raw('CASE WHEN project_phases.name LIKE \'%Project:%\' THEN 1 ELSE 0 END as is_custom_phase')
        )
        .where('project_phases_timeline.id', id)
        .first();

      if (!projectPhase) {
        this.handleNotFound(res, 'Project phase');
        return null;
      }

      return { 
        data: projectPhase,
        assignment_updates: {
          updated_count: assignmentResult.updated_assignments.length,
          conflicts_count: assignmentResult.conflicts.length,
          updated_assignments: assignmentResult.updated_assignments,
          conflicts: assignmentResult.conflicts
        },
        cascade_updates: cascadeResult ? {
          affected_phases_count: cascadeResult.affected_phases.length,
          affected_phases: cascadeResult.affected_phases
        } : null
      };
    }, res, 'Failed to update project phase');

    if (result) {
      res.json(result);
    }
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const deletedCount = await this.db('project_phases_timeline')
        .where('id', id)
        .del();

      if (deletedCount === 0) {
        this.handleNotFound(res, 'Project phase');
        return null;
      }

      return { message: 'Project phase deleted successfully' };
    }, res, 'Failed to delete project phase');

    if (result) {
      res.json(result);
    }
  }

  async bulkUpdate(req: Request, res: Response) {
    const { updates } = req.body;

    const result = await this.executeQuery(async () => {
      const results = {
        updated: [] as any[],
        failed: [] as any[]
      };

      await this.db.transaction(async (trx) => {
        for (const update of updates) {
          try {
            // Validate dates
            if (update.start_date && update.end_date) {
              const startDate = new Date(update.start_date);
              const endDate = new Date(update.end_date);
              
              if (startDate >= endDate) {
                results.failed.push({
                  id: update.id,
                  error: 'Start date must be before end date'
                });
                continue;
              }
            }

            const [updated] = await trx('project_phases_timeline')
              .where('id', update.id)
              .update({
                start_date: update.start_date,
                end_date: update.end_date,
                updated_at: new Date()
              })
              .returning('*');
            
            if (updated) {
              results.updated.push(updated);
            } else {
              results.failed.push({
                id: update.id,
                error: 'Project phase not found'
              });
            }
          } catch (error) {
            results.failed.push({
              id: update.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      });

      return results;
    }, res, 'Failed to bulk update project phases');

    if (result) {
      res.json(result);
    }
  }

  /**
   * Duplicate an existing phase for a project, including its resource allocations
   */
  async duplicatePhase(req: Request, res: Response) {
    const { project_id, source_phase_id, target_phase_id, start_date, end_date, custom_name } = req.body;

    const result = await this.executeQuery(async () => {
      // Validate required fields
      if (!project_id || !source_phase_id || !target_phase_id || !start_date || !end_date) {
        res.status(400).json({
          error: 'Missing required fields: project_id, source_phase_id, target_phase_id, start_date, end_date'
        });
        return null;
      }

      // Validate dates
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      if (startDate >= endDate) {
        res.status(400).json({
          error: 'Start date must be before end date'
        });
        return null;
      }

      return await this.db.transaction(async (trx) => {
        // Validate that source project phase exists
        const sourcePhase = await trx('project_phases_timeline')
          .where({
            project_id,
            phase_id: source_phase_id
          })
          .first();

        if (!sourcePhase) {
          res.status(404).json({
            error: 'Source phase not found for this project'
          });
          return null;
        }

        // Check if target phase already exists for this project
        const existingTarget = await trx('project_phases_timeline')
          .where({
            project_id,
            phase_id: target_phase_id
          })
          .first();

        if (existingTarget) {
          res.status(409).json({
            error: 'Target phase already exists for this project',
            existing: existingTarget
          });
          return null;
        }

        // Create the new project phase timeline entry
        const [newPhaseTimeline] = await trx('project_phases_timeline')
          .insert({
            project_id,
            phase_id: target_phase_id,
            start_date,
            end_date,
            created_at: new Date(),
            updated_at: new Date()
          })
          .returning('*');

        // Auto-create FS dependency for serial phase enforcement
        // Every phase (except the first) must have exactly one FS dependency
        const existingPhases = await trx('project_phases_timeline')
          .where('project_id', project_id)
          .whereNot('id', newPhaseTimeline.id) // Exclude the phase we just created
          .orderBy('start_date', 'desc'); // Get phases in reverse chronological order

        if (existingPhases.length > 0) {
          // This is not the first phase, so create an FS dependency to the previous phase
          const previousPhase = existingPhases[0]; // Latest phase by start_date
          
          // Create the FS dependency
          await trx('project_phase_dependencies').insert({
            project_id: project_id,
            predecessor_phase_timeline_id: previousPhase.id,
            successor_phase_timeline_id: newPhaseTimeline.id,
            dependency_type: 'FS',
            lag_days: 0,
            created_at: new Date(),
            updated_at: new Date()
          });
        }

        // Copy resource allocations from source phase
        const sourceAllocations = await trx('project_allocation_overrides')
          .where({
            project_id,
            phase_id: source_phase_id
          });

        const copiedAllocations = [];
        for (const allocation of sourceAllocations) {
          const [newAllocation] = await trx('project_allocation_overrides')
            .insert({
              project_id,
              project_sub_type_id: allocation.project_sub_type_id,
              phase_id: target_phase_id,
              role_id: allocation.role_id,
              allocation_percentage: allocation.allocation_percentage,
              template_id: allocation.template_id,
              is_inherited: allocation.is_inherited,
              created_at: new Date(),
              updated_at: new Date()
            })
            .returning('*');
          copiedAllocations.push(newAllocation);
        }

        // Copy demand overrides from source phase
        const sourceDemandOverrides = await trx('demand_overrides')
          .where({
            project_id,
            phase_id: source_phase_id
          });

        const copiedDemandOverrides = [];
        for (const demandOverride of sourceDemandOverrides) {
          const [newDemandOverride] = await trx('demand_overrides')
            .insert({
              project_id,
              phase_id: target_phase_id,
              role_id: demandOverride.role_id,
              start_date,
              end_date,
              demand_hours: demandOverride.demand_hours,
              reason: `Duplicated from phase: ${custom_name || 'Unknown'} (${demandOverride.reason || 'No reason'})`,
              created_at: new Date(),
              updated_at: new Date()
            })
            .returning('*');
          copiedDemandOverrides.push(newDemandOverride);
        }

        // Get phase details for response
        const phaseDetails = await trx('project_phases')
          .where('id', target_phase_id)
          .first();

        return {
          timeline: newPhaseTimeline,
          phase_details: phaseDetails,
          allocations_copied: copiedAllocations.length,
          demand_overrides_copied: copiedDemandOverrides.length,
          copied_allocations: copiedAllocations,
          copied_demand_overrides: copiedDemandOverrides
        };
      });
    }, res, 'Failed to duplicate phase');

    if (result) {
      res.status(201).json({ data: result });
    }
  }

  /**
   * Apply bulk corrections to fix validation issues across all phases
   * This method validates all changes together to handle cascading dependencies
   */
  async applyBulkCorrections(req: Request, res: Response) {
    const { projectId, corrections } = req.body;

    const result = await this.executeQuery(async () => {
      // Sort corrections by start date to apply them in chronological order
      const sortedCorrections = corrections.sort((a: any, b: any) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );

      // Validate that all corrections maintain dependency constraints
      const cascadeService = new ProjectPhaseCascadeService(this.db);
      
      // Build a temporary state with all proposed changes
      const proposedPhases = new Map<string, { start_date: string; end_date: string }>();
      for (const correction of sortedCorrections) {
        proposedPhases.set(correction.id, {
          start_date: correction.start_date,
          end_date: correction.end_date
        });
      }

      // Get all dependencies for the project
      const dependencies = await this.db('project_phase_dependencies')
        .where('project_id', projectId);

      // Validate all proposed changes together
      const validationErrors: string[] = [];
      for (const correction of sortedCorrections) {
        // Check dependencies with other corrections in mind
        for (const dep of dependencies) {
          if (dep.successor_phase_timeline_id === correction.id) {
            // This phase depends on another
            const predStart = proposedPhases.get(dep.predecessor_phase_timeline_id)?.start_date;
            const predEnd = proposedPhases.get(dep.predecessor_phase_timeline_id)?.end_date;
            
            if (predEnd && dep.dependency_type === 'FS') {
              const requiredStart = new Date(predEnd);
              requiredStart.setDate(requiredStart.getDate() + (dep.lag_days || 0));
              
              if (new Date(correction.start_date) < requiredStart) {
                validationErrors.push(
                  `Phase ${correction.id} cannot start before its predecessor ends`
                );
              }
            }
          }
        }
      }

      if (validationErrors.length > 0) {
        res.status(400).json({
          error: 'Bulk correction validation failed',
          validation_errors: validationErrors
        });
        return null;
      }

      // Apply all corrections in a transaction
      const results = {
        updated: [] as any[],
        failed: [] as any[]
      };

      await this.db.transaction(async (trx) => {
        for (const correction of sortedCorrections) {
          try {
            const [updated] = await trx('project_phases_timeline')
              .where('id', correction.id)
              .update({
                start_date: correction.start_date,
                end_date: correction.end_date,
                updated_at: new Date()
              })
              .returning('*');
            
            if (updated) {
              results.updated.push(updated);
            } else {
              results.failed.push({
                id: correction.id,
                error: 'Phase not found'
              });
            }
          } catch (error) {
            results.failed.push({
              id: correction.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      });

      return results;
    }, res, 'Failed to apply bulk corrections');

    if (result) {
      res.json(result);
    }
  }

  /**
   * Create a new custom phase that doesn't exist in the master phases list
   */
  async createCustomPhase(req: Request, res: Response) {
    const { project_id, phase_name, description, start_date, end_date, order_index } = req.body;

    const result = await this.executeQuery(async () => {
      // Validate required fields
      if (!project_id || !phase_name || !start_date || !end_date) {
        res.status(400).json({
          error: 'Missing required fields: project_id, phase_name, start_date, end_date'
        });
        return null;
      }

      // Validate dates
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      if (startDate >= endDate) {
        res.status(400).json({
          error: 'Start date must be before end date'
        });
        return null;
      }

      return await this.db.transaction(async (trx) => {
        // Check if project exists
        const project = await trx('projects')
          .where('id', project_id)
          .first();

        if (!project) {
          res.status(404).json({
            error: 'Project not found'
          });
          return null;
        }

        // Create the new phase in the master phases table
        // Use a unique name that includes project identifier to avoid conflicts
        const uniquePhaseName = `${phase_name} (Project: ${project.name})`;
        
        const [newPhase] = await trx('project_phases')
          .insert({
            name: uniquePhaseName,
            description: description || `Custom phase for project: ${project.name}`,
            order_index: order_index || 99, // Default to end
            created_at: new Date(),
            updated_at: new Date()
          })
          .returning('*');

        // Create the project phase timeline entry
        const [newPhaseTimeline] = await trx('project_phases_timeline')
          .insert({
            project_id,
            phase_id: newPhase.id,
            start_date,
            end_date,
            created_at: new Date(),
            updated_at: new Date()
          })
          .returning('*');

        // Auto-create FS dependency for serial phase enforcement
        // Every phase (except the first) must have exactly one FS dependency
        const existingPhases = await trx('project_phases_timeline')
          .where('project_id', project_id)
          .whereNot('id', newPhaseTimeline.id) // Exclude the phase we just created
          .orderBy('start_date', 'desc'); // Get phases in reverse chronological order

        if (existingPhases.length > 0) {
          // This is not the first phase, so create an FS dependency to the previous phase
          const previousPhase = existingPhases[0]; // Latest phase by start_date
          
          // Create the FS dependency
          await trx('project_phase_dependencies').insert({
            project_id: project_id,
            predecessor_phase_timeline_id: previousPhase.id,
            successor_phase_timeline_id: newPhaseTimeline.id,
            dependency_type: 'FS',
            lag_days: 0,
            created_at: new Date(),
            updated_at: new Date()
          });
        }

        return {
          phase: newPhase,
          timeline: newPhaseTimeline,
          message: 'Custom phase created successfully. Resource allocations are empty and can be configured separately.'
        };
      });
    }, res, 'Failed to create custom phase');

    if (result) {
      res.status(201).json({ data: result });
    }
  }
}