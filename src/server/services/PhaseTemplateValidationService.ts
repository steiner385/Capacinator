import type { Knex } from 'knex';

export interface PhaseConstraintViolation {
  type: 'duration_min' | 'duration_max' | 'mandatory_deletion' | 'locked_order' | 'invalid_source';
  phaseId: string;
  phaseName: string;
  templatePhaseId?: string;
  constraint: string;
  currentValue: any;
  expectedValue?: any;
  message: string;
}

export interface PhaseValidationResult {
  isValid: boolean;
  violations: PhaseConstraintViolation[];
  warnings: string[];
}

export interface PhaseUpdateRequest {
  phaseId: string;
  newDurationDays?: number;
  newStartDate?: number;
  newEndDate?: number;
  newName?: string;
  toDelete?: boolean;
  newOrderIndex?: number;
}

export class PhaseTemplateValidationService {
  constructor(private db: Knex) {}

  /**
   * Validates phase updates against template constraints
   */
  async validatePhaseUpdates(
    projectId: string, 
    updates: PhaseUpdateRequest[]
  ): Promise<PhaseValidationResult> {
    const violations: PhaseConstraintViolation[] = [];
    const warnings: string[] = [];

    try {
      // Get all current project phases with template data
      const projectPhases = await this.db('project_phases_timeline')
        .select('*')
        .where('project_id', projectId);

      // Get project type phases for additional constraint checking
      const project = await this.db('projects')
        .select('project_type_id')
        .where('id', projectId)
        .first();

      if (!project) {
        violations.push({
          type: 'invalid_source',
          phaseId: 'unknown',
          phaseName: 'unknown',
          constraint: 'project_exists',
          currentValue: projectId,
          message: `Project ${projectId} not found`
        });
        return { isValid: false, violations, warnings };
      }

      // Create a map of current phases for easy lookup
      const phaseMap = new Map(projectPhases.map((p: any) => [p.phase_id, p]));

      // Validate each update request
      for (const update of updates) {
        const currentPhase = phaseMap.get(update.phaseId);
        if (!currentPhase) {
          violations.push({
            type: 'invalid_source',
            phaseId: update.phaseId,
            phaseName: 'unknown',
            constraint: 'phase_exists',
            currentValue: update.phaseId,
            message: `Phase ${update.phaseId} not found in project ${projectId}`
          });
          continue;
        }

        // Get phase name for better error messages
        const phaseInfo = await this.db('project_phases')
          .select('name')
          .where('id', update.phaseId)
          .first();
        const phaseName = phaseInfo?.name || 'Unknown Phase';

        await this.validateSinglePhaseUpdate(currentPhase, update, phaseName, violations, warnings);
      }

      return {
        isValid: violations.length === 0,
        violations,
        warnings
      };

    } catch (error) {
      violations.push({
        type: 'invalid_source',
        phaseId: 'system',
        phaseName: 'system',
        constraint: 'validation_error',
        currentValue: error,
        message: `Validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      return { isValid: false, violations, warnings };
    }
  }

  /**
   * Validates a single phase update against its template constraints
   */
  private async validateSinglePhaseUpdate(
    currentPhase: any,
    update: PhaseUpdateRequest,
    phaseName: string,
    violations: PhaseConstraintViolation[],
    warnings: string[]
  ): Promise<void> {
    // Check deletion constraints
    if (update.toDelete) {
      if (currentPhase.phase_source === 'template' && !currentPhase.is_deletable) {
        violations.push({
          type: 'mandatory_deletion',
          phaseId: update.phaseId,
          phaseName,
          templatePhaseId: currentPhase.template_phase_id,
          constraint: 'is_deletable',
          currentValue: false,
          message: `Cannot delete mandatory template phase: ${phaseName}`
        });
      }
    }

    // Check duration constraints for template phases
    if (update.newDurationDays !== undefined && currentPhase.phase_source === 'template') {
      // Check minimum duration
      if (currentPhase.template_min_duration_days && update.newDurationDays < currentPhase.template_min_duration_days) {
        violations.push({
          type: 'duration_min',
          phaseId: update.phaseId,
          phaseName,
          templatePhaseId: currentPhase.template_phase_id,
          constraint: 'min_duration_days',
          currentValue: update.newDurationDays,
          expectedValue: currentPhase.template_min_duration_days,
          message: `Phase ${phaseName} duration ${update.newDurationDays} days is below minimum of ${currentPhase.template_min_duration_days} days`
        });
      }

      // Check maximum duration
      if (currentPhase.template_max_duration_days && update.newDurationDays > currentPhase.template_max_duration_days) {
        violations.push({
          type: 'duration_max',
          phaseId: update.phaseId,
          phaseName,
          templatePhaseId: currentPhase.template_phase_id,
          constraint: 'max_duration_days',
          currentValue: update.newDurationDays,
          expectedValue: currentPhase.template_max_duration_days,
          message: `Phase ${phaseName} duration ${update.newDurationDays} days exceeds maximum of ${currentPhase.template_max_duration_days} days`
        });
      }

      // Add warning if significantly different from template default
      if (currentPhase.original_duration_days) {
        const percentageChange = Math.abs(update.newDurationDays - currentPhase.original_duration_days) / currentPhase.original_duration_days;
        if (percentageChange > 0.5) { // More than 50% change
          warnings.push(`Phase ${phaseName} duration changed by ${Math.round(percentageChange * 100)}% from template default`);
        }
      }
    }

    // Check order constraints for template phases with locked order
    if (update.newOrderIndex !== undefined && currentPhase.phase_source === 'template') {
      const templateCompliance = currentPhase.template_compliance_data ? 
        JSON.parse(currentPhase.template_compliance_data) : null;
      
      if (templateCompliance?.is_locked_order) {
        violations.push({
          type: 'locked_order',
          phaseId: update.phaseId,
          phaseName,
          templatePhaseId: currentPhase.template_phase_id,
          constraint: 'is_locked_order',
          currentValue: update.newOrderIndex,
          message: `Cannot change order of locked template phase: ${phaseName}`
        });
      }
    }

    // Validate name changes for template phases
    if (update.newName !== undefined && currentPhase.phase_source === 'template') {
      const originalPhaseName = await this.db('project_phases')
        .select('name')
        .where('id', update.phaseId)
        .first();
      
      if (update.newName !== originalPhaseName?.name) {
        warnings.push(`Renaming template phase ${phaseName} to ${update.newName} - this will mark the phase as customized`);
      }
    }
  }

  /**
   * Validates whether a custom phase can be added to a project
   */
  async validateCustomPhaseAddition(
    projectId: string,
    newPhaseName: string,
    insertIndex?: number
  ): Promise<PhaseValidationResult> {
    const violations: PhaseConstraintViolation[] = [];
    const warnings: string[] = [];

    try {
      // Check if phase name already exists in project
      const existingPhase = await this.db('project_phases_timeline')
        .leftJoin('project_phases', 'project_phases_timeline.phase_id', 'project_phases.id')
        .where('project_phases_timeline.project_id', projectId)
        .where('project_phases.name', newPhaseName)
        .first();

      if (existingPhase) {
        violations.push({
          type: 'invalid_source',
          phaseId: 'new',
          phaseName: newPhaseName,
          constraint: 'unique_name',
          currentValue: newPhaseName,
          message: `Phase name ${newPhaseName} already exists in this project`
        });
      }

      // Check insertion index constraints if specified
      if (insertIndex !== undefined) {
        const projectPhases = await this.db('project_phases_timeline')
          .select('*')
          .where('project_id', projectId)
          .orderBy('start_date');

        // Check if inserting between locked template phases
        if (insertIndex > 0 && insertIndex < projectPhases.length) {
          const prevPhase = projectPhases[insertIndex - 1];
          const nextPhase = projectPhases[insertIndex];

          if (prevPhase?.phase_source === 'template' && nextPhase?.phase_source === 'template') {
            const prevCompliance = prevPhase.template_compliance_data ? 
              JSON.parse(prevPhase.template_compliance_data) : null;
            const nextCompliance = nextPhase.template_compliance_data ? 
              JSON.parse(nextPhase.template_compliance_data) : null;

            if (prevCompliance?.is_locked_order || nextCompliance?.is_locked_order) {
              warnings.push(`Inserting custom phase between locked template phases may affect project compliance`);
            }
          }
        }
      }

      return {
        isValid: violations.length === 0,
        violations,
        warnings
      };

    } catch (error) {
      violations.push({
        type: 'invalid_source',
        phaseId: 'system',
        phaseName: 'system',
        constraint: 'validation_error',
        currentValue: error,
        message: `Custom phase validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      return { isValid: false, violations, warnings };
    }
  }

  /**
   * Gets template compliance summary for a project
   */
  async getProjectTemplateCompliance(projectId: string): Promise<{
    totalPhases: number;
    templatePhases: number;
    customPhases: number;
    mandatoryPhases: number;
    customizedPhases: number;
    compliancePercentage: number;
    violations: string[];
  }> {
    try {
      const phases = await this.db('project_phases_timeline')
        .select('*')
        .where('project_id', projectId);

      const totalPhases = phases.length;
      const templatePhases = phases.filter((p: any) => p.phase_source === 'template').length;
      const customPhases = phases.filter((p: any) => p.phase_source === 'custom').length;
      const mandatoryPhases = phases.filter((p: any) => {
        const compliance = p.template_compliance_data ? JSON.parse(p.template_compliance_data) : null;
        return compliance?.is_mandatory;
      }).length;
      const customizedPhases = phases.filter((p: any) => p.is_duration_customized || p.is_name_customized).length;

      // Simple compliance calculation: percentage of template phases that haven't been heavily customized
      const fullyCompliantPhases = phases.filter((p: any) => 
        p.phase_source === 'template' && !p.is_duration_customized && !p.is_name_customized
      ).length;
      const compliancePercentage = templatePhases > 0 ? (fullyCompliantPhases / templatePhases) * 100 : 100;

      const violations: string[] = [];
      // Check for missing mandatory phases, etc.

      return {
        totalPhases,
        templatePhases,
        customPhases,
        mandatoryPhases,
        customizedPhases,
        compliancePercentage,
        violations
      };

    } catch (error) {
      throw new Error(`Failed to get project template compliance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}