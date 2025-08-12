import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { format, addDays, differenceInDays } from 'date-fns';
import { 
  parseDateSafe, 
  formatDateSafe, 
  addDaysSafe, 
  isSameDateSafe, 
  isBeforeSafe, 
  isAfterSafe,
  isBeforeOrEqualSafe,
  formatDateDisplaySafe,
  toDateInputValue
} from '../utils/date';
import { Calendar, Plus, Trash2, Edit2, Save, X, ArrowRight, AlertTriangle } from 'lucide-react';

interface PhaseTimelineProps {
  projectId: string;
  projectName: string;
}

interface Phase {
  id: string;
  project_id: string;
  phase_id: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  phase_order: number;
  phase_description?: string;
}

interface Dependency {
  id: string;
  project_id: string;
  predecessor_phase_timeline_id: string;
  successor_phase_timeline_id: string;
  dependency_type: 'FS' | 'SS' | 'FF' | 'SF';
  lag_days?: number;
  predecessor_phase?: Phase;
  successor_phase?: Phase;
}

const DEPENDENCY_TYPE_LABELS = {
  'FS': 'Finish-to-Start',
  'SS': 'Start-to-Start', 
  'FF': 'Finish-to-Finish',
  'SF': 'Start-to-Finish'
};

const PHASE_COLORS: Record<string, string> = {
  'business planning': '#3b82f6',
  'development': '#10b981',
  'system integration testing': '#f59e0b',
  'user acceptance testing': '#8b5cf6',
  'validation': '#ec4899',
  'cutover': '#ef4444',
  'hypercare': '#06b6d4',
  'support': '#84cc16',
  'custom': '#6b7280'
};

const getPhaseColor = (phaseName: string): string => {
  const normalizedName = phaseName.toLowerCase();
  return PHASE_COLORS[normalizedName] || PHASE_COLORS['custom'];
};

export function PhaseTimeline({ projectId, projectName }: PhaseTimelineProps) {
  const queryClient = useQueryClient();
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editingDependency, setEditingDependency] = useState<string | null>(null);
  const [showAddPhaseModal, setShowAddPhaseModal] = useState(false);
  const [showAddDependencyModal, setShowAddDependencyModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [cascadePreview, setCascadePreview] = useState<any>(null);
  const [showCascadeModal, setShowCascadeModal] = useState(false);

  // Form states
  const [phaseForm, setPhaseForm] = useState({
    phase_name: '',
    start_date: '',
    end_date: ''
  });

  const [dependencyForm, setDependencyForm] = useState({
    predecessor_phase_timeline_id: '',
    successor_phase_timeline_id: '',
    dependency_type: 'FS' as 'FS' | 'SS' | 'FF' | 'SF',
    lag_days: 0
  });

  // Fetch project phases
  const { data: phasesData, isLoading: phasesLoading } = useQuery({
    queryKey: ['project-phases', projectId],
    queryFn: async () => {
      const response = await api.projectPhases.list({ project_id: projectId });
      return response.data;
    }
  });

  // Fetch dependencies
  const { data: dependenciesData, isLoading: dependenciesLoading } = useQuery({
    queryKey: ['project-phase-dependencies', projectId],
    queryFn: async () => {
      const response = await api.projectPhaseDependencies.list({ project_id: projectId });
      return response.data;
    }
  });

  // Fetch available phase templates
  const { data: phaseTemplates } = useQuery({
    queryKey: ['phase-templates'],
    queryFn: async () => {
      const response = await api.phases.list();
      return response.data;
    }
  });

  // Phase mutations
  const updatePhaseMutation = useMutation({
    mutationFn: async ({ phaseId, updates }: { phaseId: string; updates: Partial<Phase> }) => {
      const response = await api.projectPhases.update(phaseId, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      setEditingPhase(null);
    }
  });

  const createPhaseMutation = useMutation({
    mutationFn: async (phaseData: any) => {
      const response = await api.projectPhases.create({
        ...phaseData,
        project_id: projectId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      setShowAddPhaseModal(false);
      setPhaseForm({ phase_name: '', start_date: '', end_date: '' });
    }
  });

  const deletePhaseMutation = useMutation({
    mutationFn: async (phaseId: string) => {
      await api.projectPhases.delete(phaseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
    }
  });

  // Dependency mutations
  const createDependencyMutation = useMutation({
    mutationFn: async (dependencyData: any) => {
      const response = await api.projectPhaseDependencies.create({
        ...dependencyData,
        project_id: projectId
      });
      return response.data;
    },
    onSuccess: async (newDependency) => {
      // Refresh dependencies first
      await queryClient.invalidateQueries({ queryKey: ['project-phase-dependencies', projectId] });
      
      // Check if the new dependency creates date conflicts and auto-correct if needed
      setTimeout(async () => {
        const successorPhase = phases.find(p => p.id === newDependency.successor_phase_timeline_id);
        if (successorPhase) {
          const validation = validatePhaseDate(successorPhase.id, successorPhase.start_date, successorPhase.end_date);
          if (validation.length > 0) {
            const correction = calculateCorrectedDates(successorPhase.id, successorPhase.start_date, successorPhase.end_date);
            if (!correction.isValid) {
              // Auto-apply correction for dependencies
              await updatePhaseMutation.mutateAsync({
                phaseId: successorPhase.id,
                updates: {
                  start_date: correction.startDate,
                  end_date: correction.endDate
                }
              });
            }
          }
        }
      }, 100); // Small delay to ensure dependencies are refreshed
      
      setShowAddDependencyModal(false);
      setDependencyForm({
        predecessor_phase_timeline_id: '',
        successor_phase_timeline_id: '',
        dependency_type: 'FS',
        lag_days: 0
      });
    }
  });

  const deleteDependencyMutation = useMutation({
    mutationFn: async (dependencyId: string) => {
      await api.projectPhaseDependencies.delete(dependencyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phase-dependencies', projectId] });
    }
  });

  // Get clean phases (filtered)
  const phases = React.useMemo(() => {
    if (!phasesData?.data) return [];
    
    return phasesData.data
      .filter((phase: Phase) => {
        const phaseName = phase.phase_name.toLowerCase();
        // Filter out test/garbage phases
        if (phaseName.includes('test phase') && (phaseName.includes('1753') || phaseName.includes('1754'))) return false;
        if (phaseName.includes('no adjust phase') && (phaseName.includes('1753') || phaseName.includes('1754'))) return false;
        if (phaseName.includes('duplicated phase') && (phaseName.includes('1753') || phaseName.includes('1754'))) return false;
        if (phaseName.includes('custom date phase') && (phaseName.includes('1753') || phaseName.includes('1754'))) return false;
        return true;
      })
      .sort((a: Phase, b: Phase) => {
        // Timezone-safe sorting by start date
        if (isBeforeSafe(a.start_date, b.start_date)) return -1;
        if (isAfterSafe(a.start_date, b.start_date)) return 1;
        return 0;
      });
  }, [phasesData]);

  const dependencies = dependenciesData?.data || [];

  // Validate all phases on load and when dependencies change
  React.useEffect(() => {
    if (phases.length > 0 && dependencies.length > 0) {
      const newValidationErrors: Record<string, string[]> = {};
      
      for (const phase of phases) {
        const errors = validatePhaseDate(phase.id, phase.start_date, phase.end_date);
        if (errors.length > 0) {
          newValidationErrors[phase.id] = errors;
        }
      }
      
      setValidationErrors(newValidationErrors);
      console.log('🔍 Validation check completed:', newValidationErrors);
    }
  }, [phases, dependencies]);

  // Validation and cascade functions (timezone-safe)
  const validatePhaseDate = (phaseId: string, newStartDate: string, newEndDate: string): string[] => {
    const errors: string[] = [];
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return errors;

    console.log(`🔍 Validating ${phase.phase_name}:`, {
      newStartDate,
      newEndDate
    });

    // Basic validation using timezone-safe comparison
    if (isBeforeOrEqualSafe(newEndDate, newStartDate)) {
      errors.push('End date must be after start date');
    }

    // Check dependencies this phase has (predecessor constraints)
    const phaseDependencies = dependencies.filter((dep: Dependency) => dep.successor_phase_timeline_id === phaseId);
    
    console.log(`📋 Dependencies for ${phase.phase_name}:`, phaseDependencies.map(dep => ({
      predecessor: phases.find(p => p.id === dep.predecessor_phase_timeline_id)?.phase_name,
      type: dep.dependency_type,
      lagDays: dep.lag_days
    })));
    
    for (const dep of phaseDependencies) {
      const predecessor = phases.find(p => p.id === dep.predecessor_phase_timeline_id);
      if (!predecessor) continue;

      const predEnd = predecessor.end_date;
      const predStart = predecessor.start_date;
      const lagDays = dep.lag_days || 0;

      switch (dep.dependency_type) {
        case 'FS': // Finish-to-Start (allow same-day transitions)
          const earliestStartFS = addDaysSafe(predEnd, lagDays);
          console.log(`🔗 FS Check: ${phase.phase_name} depends on ${predecessor.phase_name}`, {
            predecessorEnds: predEnd,
            successorStarts: newStartDate,
            earliestAllowedStart: earliestStartFS,
            lagDays,
            startsTooEarly: isBeforeSafe(newStartDate, predEnd),
            needsDelay: isBeforeSafe(newStartDate, earliestStartFS)
          });
          
          if (isBeforeSafe(newStartDate, predEnd)) {
            errors.push(`Cannot start before ${formatDateDisplaySafe(predEnd)} - ${predecessor.phase_name} must finish first (FS dependency)`);
          } else if (lagDays > 0 && isBeforeSafe(newStartDate, earliestStartFS)) {
            errors.push(`Cannot start before ${formatDateDisplaySafe(earliestStartFS)} (${predecessor.phase_name} finishes ${formatDateDisplaySafe(predEnd)} + ${lagDays} lag days)`);
          }
          break;
        case 'SS': // Start-to-Start
          const requiredStartSS = addDaysSafe(predStart, lagDays);
          if (isBeforeSafe(newStartDate, requiredStartSS)) {
            errors.push(`Cannot start before ${formatDateDisplaySafe(requiredStartSS)} (${predecessor.phase_name} start + ${lagDays} lag days)`);
          }
          break;
        case 'FF': // Finish-to-Finish
          const requiredEndFF = addDaysSafe(predEnd, lagDays);
          if (isBeforeSafe(newEndDate, requiredEndFF)) {
            errors.push(`Cannot finish before ${formatDateDisplaySafe(requiredEndFF)} (${predecessor.phase_name} finish + ${lagDays} lag days)`);
          }
          break;
        case 'SF': // Start-to-Finish
          const requiredEndSF = addDaysSafe(predStart, lagDays);
          if (isBeforeSafe(newEndDate, requiredEndSF)) {
            errors.push(`Cannot finish before ${formatDateDisplaySafe(requiredEndSF)} (${predecessor.phase_name} start + ${lagDays} lag days)`);
          }
          break;
      }
    }

    // Check phases that depend on this one (successor constraints)
    const dependentPhases = dependencies.filter((dep: Dependency) => dep.predecessor_phase_timeline_id === phaseId);
    
    for (const dep of dependentPhases) {
      const successor = phases.find(p => p.id === dep.successor_phase_timeline_id);
      if (!successor) continue;

      const succStart = successor.start_date;
      const succEnd = successor.end_date;
      const lagDays = dep.lag_days || 0;

      switch (dep.dependency_type) {
        case 'FS': // Finish-to-Start (allow same-day transitions)
          const latestEndFS = addDaysSafe(succStart, -lagDays);
          if (isAfterSafe(newEndDate, latestEndFS)) {
            errors.push(`Cannot finish after ${formatDateDisplaySafe(latestEndFS)} (${successor.phase_name} starts on ${formatDateDisplaySafe(succStart)} with ${lagDays} lag days)`);
          }
          break;
        case 'SS': // Start-to-Start
          const maxStartSS = addDaysSafe(succStart, -lagDays);
          if (isAfterSafe(newStartDate, maxStartSS)) {
            errors.push(`Cannot start after ${formatDateDisplaySafe(maxStartSS)} (${successor.phase_name} start - ${lagDays} lag days)`);
          }
          break;
        case 'FF': // Finish-to-Finish
          const maxEndFF = addDaysSafe(succEnd, -lagDays);
          if (isAfterSafe(newEndDate, maxEndFF)) {
            errors.push(`Cannot finish after ${formatDateDisplaySafe(maxEndFF)} (${successor.phase_name} finish - ${lagDays} lag days)`);
          }
          break;
        case 'SF': // Start-to-Finish
          const maxStartSF = addDaysSafe(succEnd, -lagDays);
          if (isAfterSafe(newStartDate, maxStartSF)) {
            errors.push(`Cannot start after ${formatDateDisplaySafe(maxStartSF)} (${successor.phase_name} finish - ${lagDays} lag days)`);
          }
          break;
      }
    }

    return errors;
  };

  const calculateCorrectedDates = (phaseId: string, newStartDate: string, newEndDate: string) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return { startDate: newStartDate, endDate: newEndDate, isValid: true };

    let correctedStart = newStartDate;
    let correctedEnd = newEndDate;
    
    // Calculate phase duration in days (timezone-safe)
    const phaseDurationDays = Math.max(1, Math.round((parseDateSafe(newEndDate).getTime() - parseDateSafe(newStartDate).getTime()) / (1000 * 60 * 60 * 24)));

    console.log(`📐 Calculating correction for ${phase.phase_name}:`, {
      currentStart: newStartDate,
      currentEnd: newEndDate,
      duration: phaseDurationDays
    });

    // Check predecessor constraints and adjust dates if needed
    const phaseDependencies = dependencies.filter((dep: Dependency) => dep.successor_phase_timeline_id === phaseId);
    
    console.log(`📋 Found ${phaseDependencies.length} dependencies for ${phase.phase_name}`);
    
    for (const dep of phaseDependencies) {
      const predecessor = phases.find(p => p.id === dep.predecessor_phase_timeline_id);
      if (!predecessor) continue;

      const predEnd = predecessor.end_date;
      const predStart = predecessor.start_date;
      const lagDays = dep.lag_days || 0;

      switch (dep.dependency_type) {
        case 'FS': // Finish-to-Start (allow same-day transitions)
          const earliestStartFS = addDaysSafe(predEnd, lagDays);
          console.log(`🔗 FS Correction: ${phase.phase_name} depends on ${predecessor.phase_name}`, {
            predecessorEnds: predEnd,
            currentStart: correctedStart,
            earliestAllowedStart: earliestStartFS,
            lagDays,
            needsCorrection: isBeforeSafe(correctedStart, earliestStartFS)
          });
          
          if (isBeforeSafe(correctedStart, earliestStartFS)) {
            correctedStart = earliestStartFS;
            correctedEnd = addDaysSafe(correctedStart, phaseDurationDays);
            console.log(`✅ Applied FS correction:`, {
              newStart: correctedStart,
              newEnd: correctedEnd
            });
          }
          break;
        case 'SS': // Start-to-Start
          const requiredStartSS = addDaysSafe(predStart, lagDays);
          if (isBeforeSafe(correctedStart, requiredStartSS)) {
            correctedStart = requiredStartSS;
            correctedEnd = addDaysSafe(correctedStart, phaseDurationDays);
          }
          break;
        case 'FF': // Finish-to-Finish
          const requiredEndFF = addDaysSafe(predEnd, lagDays);
          if (isBeforeSafe(correctedEnd, requiredEndFF)) {
            correctedEnd = requiredEndFF;
            correctedStart = addDaysSafe(correctedEnd, -phaseDurationDays);
          }
          break;
        case 'SF': // Start-to-Finish
          const requiredEndSF = addDaysSafe(predStart, lagDays);
          if (isBeforeSafe(correctedEnd, requiredEndSF)) {
            correctedEnd = requiredEndSF;
            correctedStart = addDaysSafe(correctedEnd, -phaseDurationDays);
          }
          break;
      }
    }

    // Check if correction was needed (timezone-safe comparison)
    const isValid = isSameDateSafe(correctedStart, newStartDate) && isSameDateSafe(correctedEnd, newEndDate);

    console.log(`📊 Correction result for ${phase.phase_name}:`, {
      originalStart: newStartDate,
      originalEnd: newEndDate,
      correctedStart: correctedStart,
      correctedEnd: correctedEnd,
      isValid,
      changed: !isValid
    });

    return {
      startDate: correctedStart,
      endDate: correctedEnd,
      isValid
    };
  };

  const calculateCascadeEffects = async (phaseId: string, newStartDate: string, newEndDate: string) => {
    try {
      const response = await api.get(`/api/projects/${projectId}/phases/${phaseId}/cascade-preview`, {
        params: {
          new_start_date: newStartDate,
          new_end_date: newEndDate
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to calculate cascade effects:', error);
      return null;
    }
  };

  // Helper functions (timezone-safe)
  const formatDateForInput = (dateString: string) => {
    return dateString; // Already in YYYY-MM-DD format from database
  };

  const formatDateForDisplay = (dateString: string) => {
    return formatDateDisplaySafe(dateString);
  };

  const getDependenciesForPhase = (phaseId: string) => {
    return dependencies.filter((dep: Dependency) => dep.successor_phase_timeline_id === phaseId);
  };

  const InlineEdit = ({ 
    value, 
    onSave, 
    type = 'text',
    className = '',
    placeholder = '',
    phaseId,
    dateType
  }: {
    value: string;
    onSave: (value: string) => void;
    type?: 'text' | 'date';
    className?: string;
    placeholder?: string;
    phaseId?: string;
    dateType?: 'start' | 'end';
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [showValidation, setShowValidation] = useState(false);
    const [correctionSuggestion, setCorrectionSuggestion] = useState<{startDate: string, endDate: string, isValid: boolean} | null>(null);

    const handleSave = () => {
      if (editValue !== value) {
        // For date fields, validate and potentially auto-correct
        if (type === 'date' && phaseId && dateType) {
          const phase = phases.find(p => p.id === phaseId);
          if (phase) {
            const newStartDate = dateType === 'start' ? editValue : phase.start_date;
            const newEndDate = dateType === 'end' ? editValue : phase.end_date;
            
            const validation = validatePhaseDate(phaseId, newStartDate, newEndDate);
            setValidationErrors(prev => ({
              ...prev,
              [phaseId]: validation
            }));

            if (validation.length > 0) {
              // Calculate corrected dates
              const correction = calculateCorrectedDates(phaseId, newStartDate, newEndDate);
              if (!correction.isValid) {
                setCorrectionSuggestion(correction);
                setShowValidation(true);
                return;
              }
            }
            
            // Clear any previous errors for this phase
            setValidationErrors(prev => {
              const updated = { ...prev };
              delete updated[phaseId];
              return updated;
            });
          }
        }
        
        onSave(editValue);
      }
      setIsEditing(false);
      setShowValidation(false);
      setCorrectionSuggestion(null);
    };

    const handleAutoCorrect = () => {
      if (correctionSuggestion && phaseId) {
        const phase = phases.find(p => p.id === phaseId);
        if (phase) {
          // Update both dates with corrected values
          updatePhaseMutation.mutate({
            phaseId,
            updates: {
              start_date: correctionSuggestion.startDate,
              end_date: correctionSuggestion.endDate
            }
          });
          setIsEditing(false);
          setShowValidation(false);
          setCorrectionSuggestion(null);
        }
      }
    };

    const handleCancel = () => {
      setEditValue(value);
      setIsEditing(false);
      setShowValidation(false);
      setCorrectionSuggestion(null);
    };

    if (isEditing) {
      return (
        <div className="inline-edit-container">
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
            className={`form-input ${className}`}
            placeholder={placeholder}
            autoFocus
          />
          
          {/* Validation popup */}
          {showValidation && correctionSuggestion && (
            <div className="validation-popup">
              <div className="validation-header">
                <AlertTriangle size={16} />
                <span>Date Conflict Detected</span>
              </div>
              <p>The date you entered conflicts with phase dependencies.</p>
              <div className="correction-suggestion">
                <p><strong>Suggested correction:</strong></p>
                <p>Start: {formatDateForDisplay(correctionSuggestion.startDate)}</p>
                <p>End: {formatDateForDisplay(correctionSuggestion.endDate)}</p>
              </div>
              <div className="validation-actions">
                <button className="btn btn-primary btn-sm" onClick={handleAutoCorrect}>
                  Apply Correction
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    const displayValue = type === 'date' ? formatDateForDisplay(value) : value;

    return (
      <div 
        className={`inline-editable ${className}`}
        onClick={() => setIsEditing(true)}
        style={{ cursor: 'pointer' }}
      >
        {displayValue}
        <Edit2 size={14} className="edit-icon" style={{ marginLeft: '8px', opacity: 0.5 }} />
      </div>
    );
  };

  if (phasesLoading) return <div>Loading phases...</div>;

  return (
    <div className="phase-timeline">
      <div className="phase-timeline-header">
        <h3>Project Timeline</h3>
        <div className="header-actions">
          {Object.keys(validationErrors).length > 0 && (
            <button 
              className="btn btn-warning btn-sm"
              onClick={async () => {
                console.log('🔧 Fix All button clicked!', { validationErrors, phases: phases.length });
                
                try {
                  for (const [phaseId, errors] of Object.entries(validationErrors)) {
                    if (errors.length > 0) {
                      const phase = phases.find(p => p.id === phaseId);
                      if (phase) {
                        console.log(`🔧 Fixing phase ${phase.phase_name}:`, {
                          currentStart: phase.start_date,
                          currentEnd: phase.end_date,
                          errors
                        });
                        
                        const correction = calculateCorrectedDates(phaseId, phase.start_date, phase.end_date);
                        console.log('💡 Correction calculated:', correction);
                        console.log('🔍 Detailed correction analysis:', {
                          phaseId,
                          phaseName: phase.phase_name,
                          originalDates: { start: phase.start_date, end: phase.end_date },
                          correctedDates: { start: correction.startDate, end: correction.endDate },
                          isValid: correction.isValid,
                          needsCorrection: !correction.isValid
                        });
                        
                        if (correction.isValid) {
                          console.log(`✅ ${phase.phase_name} is already valid`);
                        } else {
                          console.log(`🚀 Applying correction for ${phase.phase_name}`, {
                            from: { start: phase.start_date, end: phase.end_date },
                            to: { start: correction.startDate, end: correction.endDate }
                          });
                          await updatePhaseMutation.mutateAsync({
                            phaseId,
                            updates: {
                              start_date: correction.startDate,
                              end_date: correction.endDate
                            }
                          });
                        }
                      }
                    }
                  }
                  
                  // Force re-validation and refresh after all corrections are applied
                  queryClient.invalidateQueries({ queryKey: ['project-phases'] });
                  queryClient.invalidateQueries({ queryKey: ['project-phase-dependencies'] });
                  console.log('🎉 Fix All completed! Refreshing data...');
                } catch (error) {
                  console.error('❌ Fix All failed:', error);
                }
              }}
              disabled={updatePhaseMutation.isPending}
            >
              <AlertTriangle size={16} />
              Fix All ({Object.keys(validationErrors).length})
            </button>
          )}
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddPhaseModal(true)}
          >
            <Plus size={16} />
            Add Phase
          </button>
        </div>
      </div>

      {/* Phases Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Phase</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Dependencies</th>
              <th width="100">Actions</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((phase: Phase) => {
              const phaseDependencies = getDependenciesForPhase(phase.id);
              const phaseColor = getPhaseColor(phase.phase_name);

              return (
                <tr key={phase.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div 
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: phaseColor,
                          flexShrink: 0
                        }}
                      />
                      <InlineEdit
                        value={phase.phase_name}
                        onSave={(value) => updatePhaseMutation.mutate({ 
                          phaseId: phase.id, 
                          updates: { phase_name: value } 
                        })}
                        className="font-medium"
                      />
                    </div>
                  </td>
                  <td>
                    <div className="date-field-container">
                      <InlineEdit
                        value={phase.start_date}
                        type="date"
                        phaseId={phase.id}
                        dateType="start"
                        onSave={(value) => updatePhaseMutation.mutate({ 
                          phaseId: phase.id, 
                          updates: { start_date: value } 
                        })}
                      />
                      {validationErrors[phase.id] && (
                        <div className="validation-error">
                          <AlertTriangle size={12} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="date-field-container">
                      <InlineEdit
                        value={phase.end_date}
                        type="date"
                        phaseId={phase.id}
                        dateType="end"
                        onSave={(value) => updatePhaseMutation.mutate({ 
                          phaseId: phase.id, 
                          updates: { end_date: value } 
                        })}
                      />
                      {validationErrors[phase.id] && (
                        <div className="validation-error">
                          <AlertTriangle size={12} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div 
                      className="dependencies-cell clickable-dependencies"
                      onClick={() => {
                        setDependencyForm(prev => ({
                          ...prev,
                          successor_phase_timeline_id: phase.id
                        }));
                        setShowAddDependencyModal(true);
                      }}
                      title="Click to add dependency"
                    >
                      {phaseDependencies.length > 0 ? (
                        <div className="dependencies-list">
                          {phaseDependencies.map((dep: Dependency) => {
                            const predecessorPhase = phases.find((p: Phase) => p.id === dep.predecessor_phase_timeline_id);
                            return (
                              <div key={dep.id} className="dependency-item">
                                <span className="dependency-phase">{predecessorPhase?.phase_name}</span>
                                <ArrowRight size={12} />
                                <span className="dependency-type">{dep.dependency_type}</span>
                                {dep.lag_days ? <span className="dependency-lag">+{dep.lag_days}d</span> : null}
                                <button 
                                  className="btn-icon btn-danger btn-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDependencyMutation.mutate(dep.id);
                                  }}
                                  title="Remove dependency"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            );
                          })}
                          <div className="add-dependency-hint">
                            <Plus size={12} />
                            <span>Add dependency</span>
                          </div>
                        </div>
                      ) : (
                        <div className="empty-dependencies">
                          <Plus size={14} />
                          <span>Add dependency</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button 
                        className="btn-icon btn-danger btn-sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this phase?')) {
                            deletePhaseMutation.mutate(phase.id);
                          }
                        }}
                        title="Delete phase"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


      {/* Add Phase Modal */}
      {showAddPhaseModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Phase</h3>
              <button onClick={() => setShowAddPhaseModal(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                createPhaseMutation.mutate(phaseForm);
              }}>
                <div className="form-group">
                  <label className="form-label">Phase Name</label>
                  <input
                    type="text"
                    value={phaseForm.phase_name}
                    onChange={(e) => setPhaseForm(prev => ({ ...prev, phase_name: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      value={phaseForm.start_date}
                      onChange={(e) => setPhaseForm(prev => ({ ...prev, start_date: e.target.value }))}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      value={phaseForm.end_date}
                      onChange={(e) => setPhaseForm(prev => ({ ...prev, end_date: e.target.value }))}
                      className="form-input"
                      min={phaseForm.start_date}
                      required
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowAddPhaseModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={createPhaseMutation.isPending}>
                    Create Phase
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Dependency Modal */}
      {showAddDependencyModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Dependency</h3>
              <button onClick={() => setShowAddDependencyModal(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                createDependencyMutation.mutate(dependencyForm);
              }}>
                <div className="form-group">
                  <label className="form-label">Predecessor Phase</label>
                  <select
                    value={dependencyForm.predecessor_phase_timeline_id}
                    onChange={(e) => setDependencyForm(prev => ({ 
                      ...prev, 
                      predecessor_phase_timeline_id: e.target.value 
                    }))}
                    className="form-select"
                    required
                  >
                    <option value="">Select predecessor phase</option>
                    {phases.map((phase: Phase) => (
                      <option key={phase.id} value={phase.id}>
                        {phase.phase_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Successor Phase</label>
                  <select
                    value={dependencyForm.successor_phase_timeline_id}
                    onChange={(e) => setDependencyForm(prev => ({ 
                      ...prev, 
                      successor_phase_timeline_id: e.target.value 
                    }))}
                    className="form-select"
                    required
                  >
                    <option value="">Select successor phase</option>
                    {phases
                      .filter((phase: Phase) => phase.id !== dependencyForm.predecessor_phase_timeline_id)
                      .map((phase: Phase) => (
                        <option key={phase.id} value={phase.id}>
                          {phase.phase_name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Dependency Type</label>
                    <select
                      value={dependencyForm.dependency_type}
                      onChange={(e) => setDependencyForm(prev => ({ 
                        ...prev, 
                        dependency_type: e.target.value as 'FS' | 'SS' | 'FF' | 'SF'
                      }))}
                      className="form-select"
                    >
                      {Object.entries(DEPENDENCY_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lag Days</label>
                    <input
                      type="number"
                      value={dependencyForm.lag_days}
                      onChange={(e) => setDependencyForm(prev => ({ 
                        ...prev, 
                        lag_days: parseInt(e.target.value) || 0
                      }))}
                      className="form-input"
                      min="0"
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowAddDependencyModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={createDependencyMutation.isPending}>
                    Create Dependency
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .phase-timeline {
          background: #fff;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .phase-timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .phase-timeline-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn-warning {
          background-color: #f59e0b;
          color: white;
          border: 1px solid #d97706;
        }

        .btn-warning:hover {
          background-color: #d97706;
          border-color: #b45309;
        }


        .table-container {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          background: #f9fafb;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }

        .data-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: top;
        }

        .data-table tr:hover {
          background: #f9fafb;
        }

        .inline-editable {
          padding: 4px 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
          display: inline-flex;
          align-items: center;
          min-height: 20px;
        }

        .inline-editable:hover {
          background: #f3f4f6;
        }

        .inline-editable .edit-icon {
          opacity: 0;
          transition: opacity 0.2s;
        }

        .inline-editable:hover .edit-icon {
          opacity: 0.5;
        }

        .dependencies-cell {
          max-width: 300px;
        }

        .clickable-dependencies {
          cursor: pointer;
          padding: 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
          min-height: 40px;
          display: flex;
          align-items: center;
        }

        .clickable-dependencies:hover {
          background-color: #f3f4f6;
        }

        .dependencies-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
        }

        .empty-dependencies {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #9ca3af;
          font-style: italic;
          padding: 4px 0;
        }

        .add-dependency-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #6b7280;
          font-size: 12px;
          margin-top: 4px;
          padding: 2px 4px;
          border-radius: 3px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .clickable-dependencies:hover .add-dependency-hint {
          opacity: 1;
        }

        .dependency-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          padding: 2px 6px;
          background: #f3f4f6;
          border-radius: 4px;
        }

        .dependency-phase {
          color: #374151;
          font-weight: 500;
        }

        .dependency-type {
          color: #6b7280;
          font-size: 11px;
          font-weight: 600;
        }

        .dependency-lag {
          color: #9ca3af;
          font-size: 11px;
        }

        .table-actions {
          display: flex;
          gap: 4px;
        }

        .btn-xs {
          padding: 2px 4px;
          font-size: 10px;
        }

        .text-gray {
          color: #9ca3af;
          font-style: italic;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .font-medium {
          font-weight: 500;
        }

        .date-field-container {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .validation-error {
          color: #dc2626;
          display: flex;
          align-items: center;
        }

        .validation-popup {
          position: absolute;
          top: 100%;
          left: 0;
          z-index: 1000;
          background: white;
          border: 1px solid #dc2626;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 16px;
          min-width: 300px;
          margin-top: 4px;
        }

        .validation-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #dc2626;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .correction-suggestion {
          background: #f9fafb;
          padding: 12px;
          border-radius: 4px;
          margin: 12px 0;
          border-left: 3px solid #3b82f6;
        }

        .correction-suggestion p {
          margin: 4px 0;
          font-size: 13px;
        }

        .validation-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 12px;
        }

        .inline-edit-container {
          position: relative;
        }
      `}</style>
    </div>
  );
}

export default PhaseTimeline;