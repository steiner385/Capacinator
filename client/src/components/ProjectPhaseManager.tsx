import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, Calendar, Trash2, GripVertical, ArrowUp, ArrowDown, Edit2, Save, X } from 'lucide-react';
import { api } from '../lib/api-client';
import type { ProjectPhaseTimeline, ProjectPhase } from '../types';
import './ProjectPhaseManager.css';

interface ProjectPhaseManagerProps {
  projectId: string;
  projectName: string;
}

interface PhaseFormData {
  phase_id: string;
  start_date: string;
  end_date: string;
}

interface CustomPhaseFormData {
  phase_name: string;
  description: string;
  start_date: string;
  end_date: string;
  order_index: number;
}

interface DuplicatePhaseFormData {
  source_phase_id: string;
  target_phase_id: string;
  start_date: string;
  end_date: string;
  custom_name: string;
}

export const ProjectPhaseManager: React.FC<ProjectPhaseManagerProps> = ({
  projectId,
  projectName
}) => {
  const queryClient = useQueryClient();
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [showCustomPhase, setShowCustomPhase] = useState(false);
  const [showDuplicatePhase, setShowDuplicatePhase] = useState(false);
  const [selectedSourcePhase, setSelectedSourcePhase] = useState<string>('');
  const [editingPhases, setEditingPhases] = useState<Record<string, boolean>>({});
  const [editedPhaseData, setEditedPhaseData] = useState<Record<string, { phase_name?: string; start_date: string; end_date: string }>>({});

  // Fetch project phases
  const { data: projectPhases, isLoading: phasesLoading } = useQuery({
    queryKey: ['project-phases', projectId],
    queryFn: async () => {
      const response = await api.projectPhases.list({ project_id: projectId });
      return response.data.data as ProjectPhaseTimeline[];
    }
  });

  // Fetch available phases
  const { data: availablePhases } = useQuery({
    queryKey: ['phases'],
    queryFn: async () => {
      const response = await api.phases.list();
      return response.data.data as ProjectPhase[];
    }
  });

  // Mutations
  const addPhaseMutation = useMutation({
    mutationFn: async (data: PhaseFormData) => {
      return await api.projectPhases.create({
        project_id: projectId,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['demands'] });
      setShowAddPhase(false);
    }
  });

  const createCustomPhaseMutation = useMutation({
    mutationFn: async (data: CustomPhaseFormData) => {
      return await api.projectPhases.createCustomPhase({
        project_id: projectId,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['phases'] });
      queryClient.invalidateQueries({ queryKey: ['demands'] });
      setShowCustomPhase(false);
    }
  });

  const duplicatePhaseMutation = useMutation({
    mutationFn: async (data: DuplicatePhaseFormData) => {
      return await api.projectPhases.duplicatePhase({
        project_id: projectId,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['demands'] });
      setShowDuplicatePhase(false);
    }
  });

  const deletePhaseMutation = useMutation({
    mutationFn: async (phaseTimelineId: string) => {
      return await api.projectPhases.delete(phaseTimelineId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: Array<{id: string, start_date: string, end_date: string}>) => {
      return await api.projectPhases.bulkUpdate({ updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });

  const updatePhaseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { phase_name?: string; start_date?: string; end_date?: string } }) => {
      return await api.projectPhases.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['demands'] });
    }
  });

  const handleAddPhase = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addPhaseMutation.mutate({
      phase_id: formData.get('phase_id') as string,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string,
    });
  };

  const handleCreateCustomPhase = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createCustomPhaseMutation.mutate({
      phase_name: formData.get('phase_name') as string,
      description: formData.get('description') as string,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string,
      order_index: parseInt(formData.get('order_index') as string) || 99,
    });
  };

  const handleDuplicatePhase = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    duplicatePhaseMutation.mutate({
      source_phase_id: selectedSourcePhase,
      target_phase_id: formData.get('target_phase_id') as string,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string,
      custom_name: formData.get('custom_name') as string,
    });
  };

  const handleDeletePhase = (phaseTimelineId: string, phaseName: string) => {
    if (confirm(`Are you sure you want to remove the "${phaseName}" phase from this project? This will also remove any associated resource allocations.`)) {
      deletePhaseMutation.mutate(phaseTimelineId);
    }
  };

  const handleEditPhase = (phaseId: string, phase: any) => {
    setEditingPhases(prev => ({ ...prev, [phaseId]: true }));
    
    // Check if this is a custom phase (has is_custom_phase flag)
    const isCustomPhase = phase.is_custom_phase === 1;
    
    setEditedPhaseData(prev => ({
      ...prev,
      [phaseId]: {
        ...(isCustomPhase ? { phase_name: phase.phase_name } : {}),
        start_date: phase.start_date,
        end_date: phase.end_date
      }
    }));
  };

  const handleSavePhase = (phaseId: string) => {
    const editedData = editedPhaseData[phaseId];
    if (!editedData) return;

    updatePhaseMutation.mutate(
      { id: phaseId, data: editedData },
      {
        onSuccess: () => {
          setEditingPhases(prev => ({ ...prev, [phaseId]: false }));
          setEditedPhaseData(prev => {
            const newData = { ...prev };
            delete newData[phaseId];
            return newData;
          });
        }
      }
    );
  };

  const handleCancelEdit = (phaseId: string) => {
    setEditingPhases(prev => ({ ...prev, [phaseId]: false }));
    setEditedPhaseData(prev => {
      const newData = { ...prev };
      delete newData[phaseId];
      return newData;
    });
  };

  const handlePhaseFieldChange = (phaseId: string, field: string, value: string) => {
    setEditedPhaseData(prev => ({
      ...prev,
      [phaseId]: {
        ...prev[phaseId],
        [field]: value
      }
    }));
  };

  const movePhase = (fromIndex: number, toIndex: number) => {
    if (!projectPhases || fromIndex === toIndex) return;
    
    const sortedPhases = [...projectPhases].sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
    
    const fromPhase = sortedPhases[fromIndex];
    const toPhase = sortedPhases[toIndex];
    
    if (!fromPhase || !toPhase) return;
    
    // Calculate new dates for the moved phase
    const fromDuration = new Date(fromPhase.end_date).getTime() - new Date(fromPhase.start_date).getTime();
    
    let newStartDate: Date;
    let newEndDate: Date;
    
    if (toIndex === 0) {
      // Moving to beginning - start before first phase
      const firstPhaseStart = new Date(toPhase.start_date);
      newEndDate = new Date(firstPhaseStart.getTime() - 24 * 60 * 60 * 1000); // Day before
      newStartDate = new Date(newEndDate.getTime() - fromDuration);
    } else if (toIndex === sortedPhases.length - 1) {
      // Moving to end - start after last phase
      const lastPhaseEnd = new Date(toPhase.end_date);
      newStartDate = new Date(lastPhaseEnd.getTime() + 24 * 60 * 60 * 1000); // Day after
      newEndDate = new Date(newStartDate.getTime() + fromDuration);
    } else {
      // Moving to middle - calculate position between phases
      const prevPhase = sortedPhases[toIndex - 1];
      const nextPhase = sortedPhases[toIndex + 1];
      const prevEnd = new Date(prevPhase.end_date).getTime();
      const nextStart = new Date(nextPhase.start_date).getTime();
      const midPoint = prevEnd + (nextStart - prevEnd) / 2;
      
      newStartDate = new Date(midPoint - fromDuration / 2);
      newEndDate = new Date(midPoint + fromDuration / 2);
    }
    
    // Update the phase with new dates
    bulkUpdateMutation.mutate([{
      id: fromPhase.id,
      start_date: newStartDate.toISOString().split('T')[0],
      end_date: newEndDate.toISOString().split('T')[0]
    }]);
  };

  const getAvailablePhases = () => {
    if (!availablePhases || !projectPhases) return [];
    const usedPhaseIds = projectPhases.map(pp => pp.phase_id);
    return availablePhases.filter(phase => !usedPhaseIds.includes(phase.id));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (phasesLoading) {
    return <div className="loading">Loading project phases...</div>;
  }

  return (
    <div className="project-phase-manager">
      <div className="section-header">
        <h3>Project Phases</h3>
        <div className="header-actions">
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setShowAddPhase(true)}
          >
            <Plus size={16} />
            Add Existing Phase
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setShowCustomPhase(true)}
          >
            <Plus size={16} />
            Create Custom Phase
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setShowDuplicatePhase(true)}
            disabled={!projectPhases || projectPhases.length === 0}
          >
            <Copy size={16} />
            Duplicate Phase
          </button>
        </div>
      </div>

      {/* Current Phases */}
      <div className="phases-list">
        {projectPhases && projectPhases.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Order</th>
                  <th>Phase</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Duration (Days)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projectPhases
                  .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                  .map((phase, index, sortedArray) => {
                    const duration = Math.ceil(
                      (new Date(phase.end_date).getTime() - new Date(phase.start_date).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const isEditing = editingPhases[phase.id];
                    const editedData = editedPhaseData[phase.id];
                    
                    return (
                      <tr key={phase.id}>
                        <td>
                          <div className="reorder-controls">
                            <button
                              className="btn btn-icon btn-sm"
                              onClick={() => movePhase(index, index - 1)}
                              disabled={index === 0 || bulkUpdateMutation.isPending || isEditing}
                              title="Move phase earlier"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              className="btn btn-icon btn-sm"
                              onClick={() => movePhase(index, index + 1)}
                              disabled={index === sortedArray.length - 1 || bulkUpdateMutation.isPending || isEditing}
                              title="Move phase later"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>
                        </td>
                        <td>
                          {isEditing && phase.is_custom_phase === 1 ? (
                            <input
                              type="text"
                              value={editedData?.phase_name || phase.phase_name}
                              onChange={(e) => handlePhaseFieldChange(phase.id, 'phase_name', e.target.value)}
                              className="form-input"
                              style={{ minWidth: '200px' }}
                              placeholder="Custom phase name"
                            />
                          ) : (
                            <div>
                              <strong>{phase.phase_name}</strong>
                              {phase.is_custom_phase === 1 && (
                                <small className="text-muted"> (Custom)</small>
                              )}
                            </div>
                          )}
                          {(bulkUpdateMutation.isPending || updatePhaseMutation.isPending) && (
                            <small className="text-muted"> (Updating...)</small>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="date"
                              value={editedData?.start_date || phase.start_date}
                              onChange={(e) => handlePhaseFieldChange(phase.id, 'start_date', e.target.value)}
                              className="form-input"
                            />
                          ) : (
                            formatDate(phase.start_date)
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="date"
                              value={editedData?.end_date || phase.end_date}
                              onChange={(e) => handlePhaseFieldChange(phase.id, 'end_date', e.target.value)}
                              className="form-input"
                            />
                          ) : (
                            formatDate(phase.end_date)
                          )}
                        </td>
                        <td>{duration} days</td>
                        <td>
                          <div className="phase-actions">
                            {isEditing ? (
                              <>
                                <button
                                  className="btn btn-icon btn-sm btn-primary"
                                  onClick={() => handleSavePhase(phase.id)}
                                  title="Save changes"
                                  disabled={updatePhaseMutation.isPending}
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  className="btn btn-icon btn-sm btn-secondary"
                                  onClick={() => handleCancelEdit(phase.id)}
                                  title="Cancel editing"
                                  disabled={updatePhaseMutation.isPending}
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn btn-icon btn-sm"
                                  onClick={() => handleEditPhase(phase.id, phase)}
                                  title="Edit phase"
                                  disabled={bulkUpdateMutation.isPending || updatePhaseMutation.isPending}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  className="btn btn-icon btn-sm btn-danger"
                                  onClick={() => handleDeletePhase(phase.id, phase.phase_name || 'Unknown')}
                                  title="Remove phase from project"
                                  disabled={bulkUpdateMutation.isPending || updatePhaseMutation.isPending}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Calendar size={48} className="text-muted" />
            <p>No phases configured for this project.</p>
            <p className="text-muted">Add phases to define the project timeline and resource requirements.</p>
          </div>
        )}
      </div>

      {/* Add Existing Phase Modal */}
      {showAddPhase && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h4>Add Existing Phase</h4>
              <button
                className="btn btn-icon"
                onClick={() => setShowAddPhase(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddPhase}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="phase_id">Phase *</label>
                  <select
                    name="phase_id"
                    id="phase_id"
                    className="form-select"
                    required
                  >
                    <option value="">Select a phase</option>
                    {getAvailablePhases().map((phase) => (
                      <option key={phase.id} value={phase.id}>
                        {phase.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="start_date">Start Date *</label>
                  <input
                    type="date"
                    name="start_date"
                    id="start_date"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="end_date">End Date *</label>
                  <input
                    type="date"
                    name="end_date"
                    id="end_date"
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddPhase(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={addPhaseMutation.isPending}
                >
                  {addPhaseMutation.isPending ? 'Adding...' : 'Add Phase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Custom Phase Modal */}
      {showCustomPhase && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h4>Create Custom Phase</h4>
              <button
                className="btn btn-icon"
                onClick={() => setShowCustomPhase(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateCustomPhase}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="phase_name">Phase Name *</label>
                  <input
                    type="text"
                    name="phase_name"
                    id="phase_name"
                    className="form-input"
                    placeholder="e.g., Additional Testing Round"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    name="description"
                    id="description"
                    className="form-textarea"
                    placeholder="Describe the purpose of this custom phase"
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="order_index">Order Index</label>
                  <input
                    type="number"
                    name="order_index"
                    id="order_index"
                    className="form-input"
                    placeholder="99"
                    min="1"
                    max="100"
                  />
                  <small className="text-muted">Lower numbers appear first in lists</small>
                </div>
                <div className="form-group">
                  <label htmlFor="start_date">Start Date *</label>
                  <input
                    type="date"
                    name="start_date"
                    id="start_date"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="end_date">End Date *</label>
                  <input
                    type="date"
                    name="end_date"
                    id="end_date"
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCustomPhase(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createCustomPhaseMutation.isPending}
                >
                  {createCustomPhaseMutation.isPending ? 'Creating...' : 'Create Phase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Phase Modal */}
      {showDuplicatePhase && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h4>Duplicate Phase</h4>
              <button
                className="btn btn-icon"
                onClick={() => setShowDuplicatePhase(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleDuplicatePhase}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="source_phase">Source Phase *</label>
                  <select
                    value={selectedSourcePhase}
                    onChange={(e) => setSelectedSourcePhase(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">Select phase to duplicate</option>
                    {projectPhases?.map((phase) => (
                      <option key={phase.phase_id} value={phase.phase_id}>
                        {phase.phase_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="target_phase_id">Target Phase *</label>
                  <select
                    name="target_phase_id"
                    id="target_phase_id"
                    className="form-select"
                    required
                  >
                    <option value="">Select target phase</option>
                    {getAvailablePhases().map((phase) => (
                      <option key={phase.id} value={phase.id}>
                        {phase.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="custom_name">Custom Name</label>
                  <input
                    type="text"
                    name="custom_name"
                    id="custom_name"
                    className="form-input"
                    placeholder="e.g., Development Round 2"
                  />
                  <small className="text-muted">Optional name for tracking the duplicated phase</small>
                </div>
                <div className="form-group">
                  <label htmlFor="start_date">Start Date *</label>
                  <input
                    type="date"
                    name="start_date"
                    id="start_date"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="end_date">End Date *</label>
                  <input
                    type="date"
                    name="end_date"
                    id="end_date"
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDuplicatePhase(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={duplicatePhaseMutation.isPending}
                >
                  {duplicatePhaseMutation.isPending ? 'Duplicating...' : 'Duplicate Phase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectPhaseManager;