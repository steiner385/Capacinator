import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { AssignmentRecalculationService } from '../../services/AssignmentRecalculationService.js';
import { ProjectPhaseCascadeService } from '../../services/ProjectPhaseCascadeService.js';
import { v4 as uuidv4 } from 'uuid';

export class ProjectPhasesController extends BaseController {
  async getAll(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    // Generate a UUID for the project phases timeline

    const resultId = uuidv4();


    // Insert with generated ID

    await this.db('project_phases_timeline')

      .insert({

        id: resultId,

        ...{
          ...phaseData,
          created_at: new Date(

      });


    // Fetch the created record

    const [result] = await this.db('project_phases_timeline')

      .where({ id: resultId })

      .select('*');

      // Auto-create FS dependency for serial phase enforcement
      // Every phase (except the first) must have exactly one FS dependency
      // Generate a UUID for the project phases timeline

      const existingPhasesId = uuidv4();


      // Insert with generated ID

      await this.db('project_phases_timeline')

        .insert({

          id: existingPhasesId,

          ...{
          project_id: phaseData.project_id,
          predecessor_phase_timeline_id: previousPhase.id,
          successor_phase_timeline_id: projectPhase.id,
          dependency_type: 'FS',
          lag_days: 0,
          created_at: new Date(

        });


      // Fetch the created record

      const [existingPhases] = await this.db('project_phases_timeline')

        .where({ id: existingPhasesId })

        .select('*');
            
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

    // Generate a UUID for the project phases timeline


    const resultId = uuidv4();



    // Insert with generated ID


    await this.db('project_phases_timeline')


      .insert({


        id: resultId,


        ...{
            project_id,
            phase_id: target_phase_id,
            start_date,
            end_date,
            created_at: new Date(


      });



    // Fetch the created record


    const [result] = await this.db('project_phases_timeline')


      .where({ id: resultId })


      .select('*');

        // Auto-create FS dependency for serial phase enforcement
        // Every phase (except the first) must have exactly one FS dependency
        // Generate a UUID for the project phases timeline

        const existingPhasesId = uuidv4();


        // Insert with generated ID

        await this.db('project_phases_timeline')

          .insert({

            id: existingPhasesId,

            ...{
            project_id: project_id,
            predecessor_phase_timeline_id: previousPhase.id,
            successor_phase_timeline_id: newPhaseTimeline.id,
            dependency_type: 'FS',
            lag_days: 0,
            created_at: new Date(

          });


        // Fetch the created record

        const [existingPhases] = await this.db('project_phases_timeline')

          .where({ id: existingPhasesId })

          .select('*');
          copiedAllocations.push(newAllocation);
        }

        // Copy demand overrides from source phase
        // Generate a UUID for the demand overrides

        const sourceDemandOverridesId = uuidv4();


        // Insert with generated ID

        await this.db('demand_overrides')

          .insert({

            id: sourceDemandOverridesId,

            ...{
              project_id,
              phase_id: target_phase_id,
              role_id: demandOverride.role_id,
              start_date,
              end_date,
              demand_hours: demandOverride.demand_hours,
              reason: `Duplicated from phase: ${custom_name || 'Unknown'} (${demandOverride.reason || 'No reason'}

          });


        // Fetch the created record

        const [sourceDemandOverrides] = await this.db('demand_overrides')

          .where({ id: sourceDemandOverridesId })

          .select('*');
          copiedDemandOverrides.push(newDemandOverride);
        }

        // Get phase details for response
        // Generate a UUID for the project phases

        const phaseDetailsId = uuidv4();


        // Insert with generated ID

        await this.db('project_phases')

          .insert({

            id: phaseDetailsId,

            ...{


        id: resultId,


        ...{
            name: uniquePhaseName,
            description: description || `Custom phase for project: ${project.name}`,
            order_index: order_index || 99, // Default to end
            created_at: new Date(


      }

          });


        // Fetch the created record

        const [phaseDetails] = await this.db('project_phases')

          .where({ id: phaseDetailsId })

          .select('*');

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