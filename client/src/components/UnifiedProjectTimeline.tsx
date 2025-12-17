import React, { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Lock,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  Info,
  Settings,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { api } from '../lib/api-client';
import { queryKeys } from '../lib/queryKeys';
import InteractiveTimeline, { TimelineItem, TimelineViewport } from './InteractiveTimeline';
import { parseDate, toISODateString } from '../utils/dateUtils';
import './EnhancedProjectTimeline.css';

interface ProjectPhaseTimeline {
  id: string;
  project_id: string;
  phase_id: string;
  start_date: number;
  end_date: number;
  duration_days: number;
  phase_source: 'template' | 'custom';
  template_phase_id?: string;
  is_deletable: boolean;
  original_duration_days?: number;
  template_min_duration_days?: number;
  template_max_duration_days?: number;
  is_duration_customized: boolean;
  is_name_customized: boolean;
  template_compliance_data?: string;
  phase_name?: string;
  phase_description?: string;
}

interface ValidationResult {
  isValid: boolean;
  violations: Array<{
    type: string;
    phaseId: string;
    phaseName: string;
    message: string;
  }>;
  warnings: string[];
}

interface UnifiedProjectTimelineProps {
  projectId: string;
  hideHeader?: boolean;
}

// Phase colors matching the system
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

const getPhaseColor = (phaseName: string, source: string): string => {
  if (source === 'custom') return PHASE_COLORS['custom'];
  const normalizedName = phaseName.toLowerCase();
  return PHASE_COLORS[normalizedName] || PHASE_COLORS['custom'];
};

export default function UnifiedProjectTimeline({ projectId, hideHeader = false }: UnifiedProjectTimelineProps) {
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [showAddCustomPhase, setShowAddCustomPhase] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [expandedControls, setExpandedControls] = useState(false);
  const queryClient = useQueryClient();

  // Timeline viewport state
  const calculateInitialViewport = useCallback(() => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 10, 0);
    
    return {
      startDate,
      endDate,
      pixelsPerDay: 3
    };
  }, []);

  const [viewport, setViewport] = useState<TimelineViewport>(calculateInitialViewport());

  // Fetch project timeline
  const { data: timeline, refetch: refetchTimeline } = useQuery({
    queryKey: queryKeys.projects.timeline(projectId),
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/timeline`);
      if (!response.ok) throw new Error('Failed to fetch timeline');
      const result = await response.json();
      const timelineData = result.data || result || [];
      
      if (!Array.isArray(timelineData)) {
        console.error('Timeline response is not an array:', timelineData);
        return [];
      }
      
      return timelineData as ProjectPhaseTimeline[];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Fetch template compliance
  const { data: compliance } = useQuery({
    queryKey: queryKeys.projects.templateCompliance(projectId),
    queryFn: async () => {
      const response = await api.projects.getTemplateCompliance(projectId);
      return response.data;
    },
    enabled: !!projectId
  });

  // Convert project phases to timeline items
  const convertPhasesToTimelineItems = useCallback((phases: ProjectPhaseTimeline[]): TimelineItem[] => {
    return phases.map(phase => ({
      id: phase.id,
      name: phase.phase_name || `Phase ${phase.phase_id}`,
      startDate: new Date(phase.start_date),
      endDate: new Date(phase.end_date),
      color: getPhaseColor(phase.phase_name || '', phase.phase_source),
      data: phase
    }));
  }, []);

  // Update phase mutation with optimistic updates
  const updatePhaseMutation = useMutation({
    mutationFn: async ({ phaseTimelineId, data }: { phaseTimelineId: string; data: any }) => {
      const response = await api.projects.updateProjectPhase(projectId, phaseTimelineId, data);
      return response.data;
    },
    onSuccess: () => {
      refetchTimeline();
      setEditingPhase(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.templateCompliance(projectId) });
    }
  });

  // Add custom phase mutation
  const addCustomPhaseMutation = useMutation({
    mutationFn: async (phaseData: any) => {
      const response = await api.projects.addCustomPhase(projectId, phaseData);
      return response.data;
    },
    onSuccess: () => {
      refetchTimeline();
      setShowAddCustomPhase(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.templateCompliance(projectId) });
    }
  });

  // Delete phase mutation
  const deletePhaseMutation = useMutation({
    mutationFn: async (phaseTimelineId: string) => {
      const response = await api.projects.deleteProjectPhase(projectId, phaseTimelineId);
      return response.data;
    },
    onSuccess: () => {
      refetchTimeline();
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.templateCompliance(projectId) });
    }
  });

  // Handle phase move/resize from InteractiveTimeline
  const handlePhaseMove = useCallback((itemId: string, newStartDate: Date, newEndDate: Date) => {
    const phase = timeline?.find(p => p.id === itemId);
    if (!phase) return;

    // Calculate new duration
    const newDurationDays = Math.round((newEndDate.getTime() - newStartDate.getTime()) / (24 * 60 * 60 * 1000));

    // Optimistic update
    queryClient.setQueryData(queryKeys.projects.timeline(projectId), (oldData: ProjectPhaseTimeline[] | undefined) => {
      if (!oldData) return oldData;
      
      return oldData.map(p => {
        if (p.id === itemId) {
          return {
            ...p,
            start_date: newStartDate.getTime(),
            end_date: newEndDate.getTime(),
            duration_days: newDurationDays
          };
        }
        return p;
      });
    });

    // Update in backend
    updatePhaseMutation.mutate({
      phaseTimelineId: itemId,
      data: {
        startDate: newStartDate,
        durationDays: newDurationDays
      }
    });
  }, [timeline, queryClient, projectId, updatePhaseMutation]);

  // Handle phase edit
  const handlePhaseEdit = useCallback((itemId: string) => {
    setEditingPhase(itemId);
  }, []);

  // Handle phase deletion
  const handlePhaseDelete = useCallback((itemId: string) => {
    const phase = timeline?.find(p => p.id === itemId);
    if (!phase) return;

    if (phase.is_deletable && confirm(`Are you sure you want to delete "${phase.phase_name}"?`)) {
      deletePhaseMutation.mutate(itemId);
    } else if (!phase.is_deletable) {
      alert('This phase cannot be deleted as it is required by the project template.');
    }
  }, [timeline, deletePhaseMutation]);

  // Handle zoom
  const handleZoom = (direction: 'in' | 'out') => {
    setViewport(prev => ({
      ...prev,
      pixelsPerDay: direction === 'in' 
        ? Math.min(prev.pixelsPerDay * 1.5, 10)
        : Math.max(prev.pixelsPerDay / 1.5, 0.5)
    }));
  };

  // Validate updates
  const validateUpdates = async (updates: any[]) => {
    try {
      const response = await api.projects.validatePhaseUpdates(projectId, { updates });
      setValidationResult(response.data);
      return response.data;
    } catch (error) {
      console.error('Validation failed:', error);
      return null;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getConstraintStatus = (phase: ProjectPhaseTimeline) => {
    if (phase.phase_source === 'custom') return 'custom';
    
    const duration = phase.duration_days;
    const minDuration = phase.template_min_duration_days;
    const maxDuration = phase.template_max_duration_days;
    
    if (minDuration && duration < minDuration) return 'violation-min';
    if (maxDuration && duration > maxDuration) return 'violation-max';
    if (phase.is_duration_customized) return 'customized';
    
    return 'compliant';
  };

  const getConstraintBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <span className="badge badge-success"><CheckCircle size={12} /> Template</span>;
      case 'customized':
        return <span className="badge badge-warning"><Edit2 size={12} /> Customized</span>;
      case 'custom':
        return <span className="badge badge-info"><Plus size={12} /> Custom</span>;
      case 'violation-min':
      case 'violation-max':
        return <span className="badge badge-danger"><AlertTriangle size={12} /> Constraint Violation</span>;
      default:
        return null;
    }
  };

  // Phase Editor Component
  const PhaseEditor = ({ phase }: { phase: ProjectPhaseTimeline }) => {
    const [editData, setEditData] = useState({
      start_date: formatDate(phase.start_date),
      duration_days: phase.duration_days,
      name: phase.phase_name || ''
    });

    const handleSave = async () => {
      const updates = [{
        phaseId: phase.phase_id,
        newDurationDays: editData.duration_days,
        newStartDate: new Date(editData.start_date).getTime(),
        newName: editData.name !== phase.phase_name ? editData.name : undefined
      }];

      const validation = await validateUpdates(updates);
      
      if (validation?.isValid) {
        updatePhaseMutation.mutate({
          phaseTimelineId: phase.id,
          data: {
            durationDays: editData.duration_days,
            startDate: new Date(editData.start_date),
            name: editData.name !== phase.phase_name ? editData.name : undefined
          }
        });
      }
    };

    return (
      <div className="phase-editor">
        <div className="editor-fields">
          <div className="field-group">
            <label>Start Date</label>
            <input
              type="date"
              value={editData.start_date}
              onChange={(e) => setEditData(prev => ({ ...prev, start_date: e.target.value }))}
              className="form-input"
            />
          </div>
          
          <div className="field-group">
            <label>Duration (days)</label>
            <input
              type="number"
              value={editData.duration_days}
              onChange={(e) => setEditData(prev => ({ ...prev, duration_days: Number(e.target.value) }))}
              min={phase.template_min_duration_days || 1}
              max={phase.template_max_duration_days || undefined}
              className="form-input"
            />
            {phase.template_min_duration_days && (
              <small>Min: {phase.template_min_duration_days} days</small>
            )}
            {phase.template_max_duration_days && (
              <small>Max: {phase.template_max_duration_days} days</small>
            )}
          </div>

          {phase.phase_source === 'custom' && (
            <div className="field-group">
              <label>Phase Name</label>
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                className="form-input"
              />
            </div>
          )}
        </div>

        <div className="editor-actions">
          <button onClick={handleSave} className="btn btn-primary">
            <Save size={16} />
            Save Changes
          </button>
          <button onClick={() => setEditingPhase(null)} className="btn btn-secondary">
            <X size={16} />
            Cancel
          </button>
        </div>

        {validationResult && !validationResult.isValid && (
          <div className="validation-errors">
            <h5>Validation Errors:</h5>
            {validationResult.violations.map((violation, index) => (
              <div key={index} className="error-item">
                <AlertTriangle size={14} />
                {violation.message}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Add Custom Phase Form
  const AddCustomPhaseForm = () => {
    const [newPhase, setNewPhase] = useState({
      name: '',
      description: '',
      durationDays: 30,
      insertIndex: 0
    });

    useEffect(() => {
      if (timeline && Array.isArray(timeline)) {
        setNewPhase(prev => ({ ...prev, insertIndex: timeline.length }));
      }
    }, [timeline]);

    const handleAdd = async () => {
      if (!newPhase.name.trim()) return;

      const response = await api.projects.validateCustomPhase(projectId, {
        phaseName: newPhase.name,
        insertIndex: newPhase.insertIndex
      });

      if (response.data.isValid) {
        addCustomPhaseMutation.mutate({
          name: newPhase.name,
          description: newPhase.description,
          durationDays: newPhase.durationDays,
          insertIndex: newPhase.insertIndex
        });
      }
    };

    return (
      <div className="add-phase-form">
        <h4>Add Custom Phase</h4>
        
        <div className="form-fields">
          <div className="field-group">
            <label>Phase Name *</label>
            <input
              type="text"
              value={newPhase.name}
              onChange={(e) => setNewPhase(prev => ({ ...prev, name: e.target.value }))}
              className="form-input"
              placeholder="Enter phase name"
            />
          </div>
          
          <div className="field-group">
            <label>Description</label>
            <textarea
              value={newPhase.description}
              onChange={(e) => setNewPhase(prev => ({ ...prev, description: e.target.value }))}
              className="form-textarea"
              placeholder="Describe this phase..."
            />
          </div>
          
          <div className="field-group">
            <label>Duration (days)</label>
            <input
              type="number"
              value={newPhase.durationDays}
              onChange={(e) => setNewPhase(prev => ({ ...prev, durationDays: Number(e.target.value) }))}
              min="1"
              className="form-input"
            />
          </div>
          
          <div className="field-group">
            <label>Insert Position</label>
            <select
              value={newPhase.insertIndex}
              onChange={(e) => setNewPhase(prev => ({ ...prev, insertIndex: Number(e.target.value) }))}
              className="form-input"
            >
              {(timeline && Array.isArray(timeline)) && timeline.map((phase, index) => (
                <option key={index} value={index}>
                  Before "{phase.phase_name}"
                </option>
              ))}
              <option value={(timeline && Array.isArray(timeline)) ? timeline.length : 0}>At the end</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button onClick={handleAdd} className="btn btn-primary">
            <Plus size={16} />
            Add Phase
          </button>
          <button onClick={() => setShowAddCustomPhase(false)} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const timelineItems = timeline ? convertPhasesToTimelineItems(timeline) : [];
  const editingPhaseData = editingPhase ? timeline?.find(p => p.id === editingPhase) : null;

  return (
    <div className="unified-project-timeline">
      {/* Timeline Header with Controls */}
      {!hideHeader && (
        <div className="timeline-header">
          <div className="header-main">
            <div className="header-info">
              <h3>
                <Calendar size={20} />
                Project Timeline
              </h3>
              <p>Interactive timeline with template compliance and drag-and-drop editing</p>
            </div>

            <div className="timeline-controls">
              <button
                onClick={() => setExpandedControls(!expandedControls)}
                className="btn btn-secondary"
                title="Toggle timeline controls"
              >
                <Settings size={16} />
              </button>

              <div className="zoom-controls">
                <button onClick={() => handleZoom('out')} className="btn btn-sm" title="Zoom out">
                  <ZoomOut size={16} />
                </button>
                <span className="zoom-level">{Math.round(viewport.pixelsPerDay * 33)}%</span>
                <button onClick={() => handleZoom('in')} className="btn btn-sm" title="Zoom in">
                  <ZoomIn size={16} />
                </button>
              </div>

              <button
                onClick={() => setShowAddCustomPhase(true)}
                className="btn btn-primary"
                title="Add custom phase"
              >
                <Plus size={16} />
                Add Phase
              </button>
            </div>
          </div>

          {/* Compliance Summary */}
          {compliance && (
            <div className="compliance-summary">
              <div className="compliance-stat">
                <label>Template Compliance</label>
                <span className={`compliance-percentage ${compliance.compliancePercentage >= 80 ? 'good' : 'warning'}`}>
                  {Math.round(compliance.compliancePercentage)}%
                </span>
              </div>
              <div className="compliance-details">
                <span className="compliant-count">{compliance.compliantPhases} compliant</span>
                <span className="violations-count">{compliance.violations} violations</span>
              </div>
            </div>
          )}

          {/* Expanded Controls */}
          {expandedControls && (
            <div className="expanded-controls">
              <div className="viewport-controls">
                <label>Timeline Range</label>
                <span>{viewport.startDate.toLocaleDateString()} - {viewport.endDate.toLocaleDateString()}</span>
              </div>
              <div className="phase-summary">
                <span>{timeline?.length || 0} phases</span>
                <span>{timeline?.filter(p => p.phase_source === 'custom').length || 0} custom</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Timeline */}
      <div className="timeline-container">
        <InteractiveTimeline
          items={timelineItems}
          viewport={viewport}
          mode="phase-manager"
          height={Math.max(200, (timelineItems.length * 60) + 100)}
          onItemMove={handlePhaseMove}
          onItemResize={handlePhaseMove}
          onItemEdit={handlePhaseEdit}
          onItemDelete={handlePhaseDelete}
          showGrid={true}
          showToday={true}
          allowOverlap={false}
          minItemDuration={1}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            backgroundColor: '#ffffff'
          }}
        />
      </div>

      {/* Phase Details Panel */}
      {timeline && timeline.length > 0 && (
        <div className="phase-details-panel">
          <h4>Phase Details</h4>
          <div className="phase-list">
            {timeline.map((phase, index) => (
              <div key={phase.id} className={`phase-item ${editingPhase === phase.id ? 'editing' : ''}`}>
                <div className="phase-header">
                  <div className="phase-info">
                    <div className="phase-name">
                      {phase.phase_name}
                      {getConstraintBadge(getConstraintStatus(phase))}
                    </div>
                    <div className="phase-meta">
                      {formatDate(phase.start_date)} - {formatDate(phase.end_date)} ({phase.duration_days} days)
                    </div>
                  </div>
                  <div className="phase-actions">
                    <button 
                      onClick={() => setEditingPhase(editingPhase === phase.id ? null : phase.id)}
                      className="btn btn-sm"
                      title="Edit phase"
                    >
                      <Edit2 size={14} />
                    </button>
                    {phase.is_deletable && (
                      <button 
                        onClick={() => handlePhaseDelete(phase.id)}
                        className="btn btn-sm btn-danger"
                        title="Delete phase"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                
                {editingPhase === phase.id && (
                  <PhaseEditor phase={phase} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Phase Modal */}
      {showAddCustomPhase && (
        <div className="modal-overlay">
          <div className="modal-content">
            <AddCustomPhaseForm />
          </div>
        </div>
      )}

      {/* Loading State */}
      {!timeline && (
        <div className="timeline-loading">
          <Clock size={24} />
          <p>Loading project timeline...</p>
        </div>
      )}
    </div>
  );
}