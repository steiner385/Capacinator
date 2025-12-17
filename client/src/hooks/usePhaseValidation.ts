import { useMemo, useCallback } from 'react';
import {
  parseDateSafe,
  addDaysSafe,
  isSameDateSafe,
  isBeforeSafe,
  isAfterSafe,
  isBeforeOrEqualSafe,
  formatDateDisplaySafe
} from '../utils/date';
import type { Phase, Dependency } from './usePhaseTimelineData';

interface UsePhaseValidationProps {
  phases: Phase[];
  dependencies: Dependency[];
}

interface CorrectedDates {
  startDate: string;
  endDate: string;
  isValid: boolean;
}

export function usePhaseValidation({ phases, dependencies }: UsePhaseValidationProps) {
  // Validate phase dates against dependency constraints
  const validatePhaseDate = useCallback((
    phaseId: string,
    newStartDate: string,
    newEndDate: string
  ): string[] => {
    const errors: string[] = [];
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return errors;

    // Basic validation using timezone-safe comparison
    if (isBeforeOrEqualSafe(newEndDate, newStartDate)) {
      errors.push('End date must be after start date');
    }

    // Check dependencies this phase has (predecessor constraints)
    const phaseDependencies = dependencies.filter(
      (dep: Dependency) => dep.successor_phase_timeline_id === phaseId
    );

    for (const dep of phaseDependencies) {
      const predecessor = phases.find(p => p.id === dep.predecessor_phase_timeline_id);
      if (!predecessor) continue;

      const predEnd = predecessor.end_date;
      const predStart = predecessor.start_date;
      // Enforce minimum 1 day gap for FS dependencies
      const lagDays = dep.dependency_type === 'FS'
        ? Math.max(1, dep.lag_days || 1)
        : (dep.lag_days || 0);

      switch (dep.dependency_type) {
        case 'FS': {
          const earliestStartFS = addDaysSafe(predEnd, lagDays);
          if (isBeforeSafe(newStartDate, earliestStartFS)) {
            errors.push(
              `Phase "${phase.phase_name}" cannot start before "${predecessor.phase_name}" finishes. Required start date: ${formatDateDisplaySafe(earliestStartFS)} or later.`
            );
          }
          break;
        }
        case 'SS': {
          const requiredStartSS = addDaysSafe(predStart, lagDays);
          if (isBeforeSafe(newStartDate, requiredStartSS)) {
            errors.push(
              `Cannot start before ${formatDateDisplaySafe(requiredStartSS)} (${predecessor.phase_name} start + ${lagDays} lag days)`
            );
          }
          break;
        }
        case 'FF': {
          const requiredEndFF = addDaysSafe(predEnd, lagDays);
          if (isBeforeSafe(newEndDate, requiredEndFF)) {
            errors.push(
              `Cannot finish before ${formatDateDisplaySafe(requiredEndFF)} (${predecessor.phase_name} finish + ${lagDays} lag days)`
            );
          }
          break;
        }
        case 'SF': {
          const requiredEndSF = addDaysSafe(predStart, lagDays);
          if (isBeforeSafe(newEndDate, requiredEndSF)) {
            errors.push(
              `Cannot finish before ${formatDateDisplaySafe(requiredEndSF)} (${predecessor.phase_name} start + ${lagDays} lag days)`
            );
          }
          break;
        }
      }
    }

    // Check phases that depend on this one (successor constraints)
    const dependentPhases = dependencies.filter(
      (dep: Dependency) => dep.predecessor_phase_timeline_id === phaseId
    );

    for (const dep of dependentPhases) {
      const successor = phases.find(p => p.id === dep.successor_phase_timeline_id);
      if (!successor) continue;

      const succStart = successor.start_date;
      const succEnd = successor.end_date;
      const lagDays = dep.lag_days || 0;

      switch (dep.dependency_type) {
        case 'FS': {
          const latestEndFS = addDaysSafe(succStart, -lagDays);
          if (isAfterSafe(newEndDate, latestEndFS)) {
            errors.push(
              `Cannot finish after ${formatDateDisplaySafe(latestEndFS)} (${successor.phase_name} starts on ${formatDateDisplaySafe(succStart)} with ${lagDays} lag days)`
            );
          }
          break;
        }
        case 'SS': {
          const maxStartSS = addDaysSafe(succStart, -lagDays);
          if (isAfterSafe(newStartDate, maxStartSS)) {
            errors.push(
              `Cannot start after ${formatDateDisplaySafe(maxStartSS)} (${successor.phase_name} start - ${lagDays} lag days)`
            );
          }
          break;
        }
        case 'FF': {
          const maxEndFF = addDaysSafe(succEnd, -lagDays);
          if (isAfterSafe(newEndDate, maxEndFF)) {
            errors.push(
              `Cannot finish after ${formatDateDisplaySafe(maxEndFF)} (${successor.phase_name} finish - ${lagDays} lag days)`
            );
          }
          break;
        }
        case 'SF': {
          const maxStartSF = addDaysSafe(succEnd, -lagDays);
          if (isAfterSafe(newStartDate, maxStartSF)) {
            errors.push(
              `Cannot start after ${formatDateDisplaySafe(maxStartSF)} (${successor.phase_name} finish - ${lagDays} lag days)`
            );
          }
          break;
        }
      }
    }

    return errors;
  }, [phases, dependencies]);

  // Calculate corrected dates to resolve dependency violations
  const calculateCorrectedDates = useCallback((
    phaseId: string,
    newStartDate: string,
    newEndDate: string
  ): CorrectedDates => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return { startDate: newStartDate, endDate: newEndDate, isValid: true };

    let correctedStart = newStartDate;
    let correctedEnd = newEndDate;

    // Calculate phase duration in days (timezone-safe)
    const phaseDurationDays = Math.max(
      1,
      Math.round(
        (parseDateSafe(newEndDate).getTime() - parseDateSafe(newStartDate).getTime()) /
        (1000 * 60 * 60 * 24)
      )
    );

    // Check predecessor constraints and adjust dates if needed
    const phaseDependencies = dependencies.filter(
      (dep: Dependency) => dep.successor_phase_timeline_id === phaseId
    );

    for (const dep of phaseDependencies) {
      const predecessor = phases.find(p => p.id === dep.predecessor_phase_timeline_id);
      if (!predecessor) continue;

      const predEnd = predecessor.end_date;
      const predStart = predecessor.start_date;
      const lagDays = dep.lag_days || 0;

      switch (dep.dependency_type) {
        case 'FS': {
          const earliestStartFS = addDaysSafe(predEnd, lagDays);
          if (isBeforeSafe(correctedStart, earliestStartFS)) {
            correctedStart = earliestStartFS;
            correctedEnd = addDaysSafe(correctedStart, phaseDurationDays);
          }
          break;
        }
        case 'SS': {
          const requiredStartSS = addDaysSafe(predStart, lagDays);
          if (isBeforeSafe(correctedStart, requiredStartSS)) {
            correctedStart = requiredStartSS;
            correctedEnd = addDaysSafe(correctedStart, phaseDurationDays);
          }
          break;
        }
        case 'FF': {
          const requiredEndFF = addDaysSafe(predEnd, lagDays);
          if (isBeforeSafe(correctedEnd, requiredEndFF)) {
            correctedEnd = requiredEndFF;
            correctedStart = addDaysSafe(correctedEnd, -phaseDurationDays);
          }
          break;
        }
        case 'SF': {
          const requiredEndSF = addDaysSafe(predStart, lagDays);
          if (isBeforeSafe(correctedEnd, requiredEndSF)) {
            correctedEnd = requiredEndSF;
            correctedStart = addDaysSafe(correctedEnd, -phaseDurationDays);
          }
          break;
        }
      }
    }

    // Check if correction was needed (timezone-safe comparison)
    const isValid = isSameDateSafe(correctedStart, newStartDate) &&
                    isSameDateSafe(correctedEnd, newEndDate);

    return {
      startDate: correctedStart,
      endDate: correctedEnd,
      isValid
    };
  }, [phases, dependencies]);

  // Calculate bulk corrections for all invalid phases
  const calculateBulkCorrections = useCallback((
    validationErrors: Record<string, string[]>
  ) => {
    const corrections: Array<{ id: string; start_date: string; end_date: string }> = [];
    const phaseCorrections = new Map<string, { start: string; end: string }>();

    // Sort phases by start date to process them in chronological order
    const sortedPhases = [...phases].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    for (const phase of sortedPhases) {
      const phaseErrors = validationErrors[phase.id];
      const currentStart = phaseCorrections.get(phase.id)?.start || phase.start_date;
      const currentEnd = phaseCorrections.get(phase.id)?.end || phase.end_date;

      if (phaseErrors && phaseErrors.length > 0) {
        const duration = Math.ceil(
          (new Date(phase.end_date).getTime() - new Date(phase.start_date).getTime()) /
          (1000 * 60 * 60 * 24)
        );

        let correctedStart = currentStart;
        let correctedEnd = currentEnd;

        // Find the predecessor phase
        const predecessorDep = dependencies.find(
          d => d.successor_phase_timeline_id === phase.id
        );

        if (predecessorDep) {
          const predecessor = sortedPhases.find(
            p => p.id === predecessorDep.predecessor_phase_timeline_id
          );

          if (predecessor) {
            const predEnd = phaseCorrections.get(predecessor.id)?.end || predecessor.end_date;
            const predEndDate = new Date(predEnd);
            const requiredStart = new Date(predEndDate);
            const lagDays = Math.max(1, predecessorDep.lag_days || 1);
            requiredStart.setDate(requiredStart.getDate() + lagDays);

            if (new Date(correctedStart) < requiredStart) {
              correctedStart = requiredStart.toISOString().split('T')[0];
              const newEnd = new Date(correctedStart);
              newEnd.setDate(newEnd.getDate() + duration);
              correctedEnd = newEnd.toISOString().split('T')[0];
            }
          }
        }

        phaseCorrections.set(phase.id, { start: correctedStart, end: correctedEnd });

        // Update successors that need to cascade
        const successorDeps = dependencies.filter(
          d => d.predecessor_phase_timeline_id === phase.id
        );

        for (const sucDep of successorDeps) {
          const successor = sortedPhases.find(p => p.id === sucDep.successor_phase_timeline_id);
          if (successor) {
            const sucStart = phaseCorrections.get(successor.id)?.start || successor.start_date;
            const requiredSuccessorStart = new Date(correctedEnd);
            const sucLagDays = Math.max(1, sucDep.lag_days || 1);
            requiredSuccessorStart.setDate(requiredSuccessorStart.getDate() + sucLagDays);

            if (new Date(sucStart) < requiredSuccessorStart) {
              const sucDuration = Math.ceil(
                (new Date(successor.end_date).getTime() - new Date(successor.start_date).getTime()) /
                (1000 * 60 * 60 * 24)
              );
              const newSuccessorEnd = new Date(requiredSuccessorStart);
              newSuccessorEnd.setDate(newSuccessorEnd.getDate() + sucDuration);

              phaseCorrections.set(successor.id, {
                start: requiredSuccessorStart.toISOString().split('T')[0],
                end: newSuccessorEnd.toISOString().split('T')[0]
              });
            }
          }
        }
      }
    }

    // Build final corrections array
    for (const phase of sortedPhases) {
      const correction = phaseCorrections.get(phase.id);
      if (correction && (correction.start !== phase.start_date || correction.end !== phase.end_date)) {
        corrections.push({
          id: phase.id,
          start_date: correction.start,
          end_date: correction.end
        });
      }
    }

    return corrections;
  }, [phases, dependencies]);

  return {
    validatePhaseDate,
    calculateCorrectedDates,
    calculateBulkCorrections
  };
}
