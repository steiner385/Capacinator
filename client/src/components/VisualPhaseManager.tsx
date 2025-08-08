import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import InteractiveTimeline, { TimelineItem, TimelineViewport } from './InteractiveTimeline';
import useInteractiveTimeline from '../hooks/useInteractiveTimeline';
import './InteractiveTimeline.css';
import { addDays, format, startOfMonth, endOfMonth } from 'date-fns';
import { X, Calendar, Type, Save } from 'lucide-react';

interface VisualPhaseManagerProps {
  projectId: string;
  projectName: string;
  onPhasesChange?: () => void;
  compact?: boolean; // For integration with other charts
  externalViewport?: TimelineViewport; // For shared viewport control
  onViewportChange?: (viewport: TimelineViewport) => void; // Notify parent of viewport changes
  alignmentDimensions?: { // For precise alignment with charts
    left: number;
    width: number;
  };
}

interface ProjectPhaseTimeline {
  id: string;
  project_id: string;
  phase_id: string;
  start_date: string;
  end_date: string;
  phase_name: string;
  phase_order: number;
  is_custom_phase?: number;
}

// Phase colors matching the existing system
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

export function VisualPhaseManager({ projectId, projectName, onPhasesChange, compact = false, externalViewport, onViewportChange, alignmentDimensions }: VisualPhaseManagerProps) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectPhaseTimeline | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; phaseId: string } | null>(null);
  const [isModalActive, setIsModalActive] = useState(false);
  const [addPhaseForm, setAddPhaseForm] = useState({
    phase_id: '',
    start_date: '',
    end_date: '',
    phase_order: 1
  });
  const [editPhaseForm, setEditPhaseForm] = useState({
    phase_name: '',
    start_date: '',
    end_date: '',
    phase_order: 1
  });

  // Fetch project phases
  const { data: phasesData, isLoading } = useQuery({
    queryKey: ['project-phases', projectId],
    queryFn: async () => {
      const response = await api.projectPhases.list({ project_id: projectId });
      return response.data;
    }
  });

  // Fetch available phase templates for adding new phases
  const { data: phaseTemplates } = useQuery({
    queryKey: ['phase-templates'],
    queryFn: async () => {
      const response = await api.phases.list();
      return response.data;
    }
  });

  // Convert phases to timeline items (filter out garbage/test phases)
  const timelineItems: TimelineItem[] = React.useMemo(() => {
    if (!phasesData?.data) return [];
    
    // Filter out test/garbage phases based on common patterns
    const cleanPhases = phasesData.data.filter((phase: ProjectPhaseTimeline) => {
      const phaseName = phase.phase_name.toLowerCase();
      
      // Filter out obvious test/garbage phases
      if (phaseName.includes('test phase') && (phaseName.includes('1753') || phaseName.includes('1754'))) return false;
      if (phaseName.includes('no adjust phase') && (phaseName.includes('1753') || phaseName.includes('1754'))) return false;
      if (phaseName.includes('duplicated phase') && (phaseName.includes('1753') || phaseName.includes('1754'))) return false;
      if (phaseName.includes('custom date phase') && (phaseName.includes('1753') || phaseName.includes('1754'))) return false;
      
      // Keep standard phases and clean custom phases
      return true;
    });
    
    // Sort by start date
    const sortedPhases = cleanPhases.sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
    
    return sortedPhases.map((phase: ProjectPhaseTimeline) => ({
      id: phase.id,
      name: phase.phase_name,
      startDate: new Date(phase.start_date),
      endDate: new Date(phase.end_date),
      color: getPhaseColor(phase.phase_name),
      data: phase
    }));
  }, [phasesData]);

  // Create timeline viewport - use external if provided, otherwise calculate from data
  const timelineViewport = React.useMemo((): TimelineViewport => {
    // Use external viewport if provided (for shared timeline control)
    if (externalViewport) {
      console.log('📈 VisualPhaseManager using external viewport:', externalViewport);
      return externalViewport;
    }
    
    // Calculate own viewport if no external control
    if (timelineItems.length === 0) {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), 0, 1); // Start of current year
      const endDate = new Date(today.getFullYear() + 1, 11, 31); // End of next year
      const viewport = {
        startDate,
        endDate,
        pixelsPerDay: 2
      };
      
      // Notify parent of our calculated viewport
      onViewportChange?.(viewport);
      return viewport;
    }
    
    // Calculate date range from actual phase data
    const allDates = timelineItems.flatMap(item => [item.startDate, item.endDate]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Add padding
    const paddingDays = Math.max(30, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) * 0.05));
    const startDate = addDays(minDate, -paddingDays);
    const endDate = addDays(maxDate, paddingDays);
    
    // Calculate appropriate zoom level for full page width
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    // Target wider viewport - use more pixels per day to utilize full width
    const pixelsPerDay = Math.max(2, Math.min(12, 1400 / totalDays)); // Target ~1400px width
    
    const viewport = {
      startDate,
      endDate,
      pixelsPerDay
    };
    
    // Notify parent of our calculated viewport
    if (onViewportChange) {
      console.log('📈 VisualPhaseManager notifying parent of viewport change:', viewport);
      onViewportChange(viewport);
    }
    return viewport;
  }, [timelineItems, externalViewport, onViewportChange]);

  // Update phase mutation
  const updatePhaseMutation = useMutation({
    mutationFn: async ({ phaseId, updates }: { phaseId: string; updates: Partial<ProjectPhaseTimeline> }) => {
      const response = await api.projectPhases.update(phaseId, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      onPhasesChange?.();
    }
  });

  // Delete phase mutation
  const deletePhaseMutation = useMutation({
    mutationFn: async (phaseId: string) => {
      await api.projectPhases.delete(phaseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      onPhasesChange?.();
    }
  });

  // Add phase mutation
  const addPhaseMutation = useMutation({
    mutationFn: async (phaseData: Omit<ProjectPhaseTimeline, 'id'>) => {
      const response = await api.projectPhases.create(phaseData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      onPhasesChange?.();
    }
  });

  // Handle phase movement/resizing
  const handlePhaseMove = useCallback((itemId: string, newStartDate: Date, newEndDate: Date) => {
    updatePhaseMutation.mutate({
      phaseId: itemId,
      updates: {
        start_date: format(newStartDate, 'yyyy-MM-dd'),
        end_date: format(newEndDate, 'yyyy-MM-dd')
      }
    });
  }, [updatePhaseMutation]);

  const handlePhaseResize = useCallback((itemId: string, newStartDate: Date, newEndDate: Date) => {
    updatePhaseMutation.mutate({
      phaseId: itemId,
      updates: {
        start_date: format(newStartDate, 'yyyy-MM-dd'),
        end_date: format(newEndDate, 'yyyy-MM-dd')
      }
    });
  }, [updatePhaseMutation]);

  // Handle phase editing
  const handlePhaseEdit = useCallback((itemId: string) => {
    const phase = phasesData?.data.find((p: ProjectPhaseTimeline) => p.id === itemId);
    if (phase) {
      setShowAddModal(false); // Ensure add modal is closed
      setIsModalActive(true);
      setEditingPhase(phase);
      setEditPhaseForm({
        phase_name: phase.phase_name,
        start_date: phase.start_date,
        end_date: phase.end_date,
        phase_order: phase.phase_order
      });
    }
  }, [phasesData]);

  // Handle phase deletion
  const handlePhaseDelete = useCallback((itemId: string) => {
    if (confirm('Are you sure you want to delete this phase? This action cannot be undone.')) {
      deletePhaseMutation.mutate(itemId);
    }
  }, [deletePhaseMutation]);

  // Handle adding new phase
  const handleAddPhase = useCallback((afterItemId?: string, position?: { x: number, date: Date }) => {
    // Don't open add modal if any modal is active
    if (isModalActive) return;
    
    // Pre-populate form with suggested dates if position is provided
    if (position?.date) {
      const startDate = format(position.date, 'yyyy-MM-dd');
      const endDate = format(addDays(position.date, 30), 'yyyy-MM-dd'); // Default 30-day duration
      setAddPhaseForm(prev => ({
        ...prev,
        start_date: startDate,
        end_date: endDate,
        phase_order: timelineItems.length + 1
      }));
    } else {
      // Auto-calculate next phase start date
      const lastPhase = timelineItems.sort((a, b) => (b.data as ProjectPhaseTimeline).phase_order - (a.data as ProjectPhaseTimeline).phase_order)[0];
      const suggestedStart = lastPhase ? addDays(lastPhase.endDate, 1) : new Date();
      setAddPhaseForm(prev => ({
        ...prev,
        start_date: format(suggestedStart, 'yyyy-MM-dd'),
        end_date: format(addDays(suggestedStart, 30), 'yyyy-MM-dd'),
        phase_order: timelineItems.length + 1
      }));
    }
    setIsModalActive(true);
    setShowAddModal(true);
  }, [timelineItems, isModalActive]);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, phaseId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, phaseId });
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Track modal state
  useEffect(() => {
    setIsModalActive(showAddModal || editingPhase !== null);
  }, [showAddModal, editingPhase]);

  if (isLoading) {
    return (
      <div className="visual-phase-manager">
        <div className="loading">Loading project phases...</div>
      </div>
    );
  }

  return (
    <div className="visual-phase-manager" style={compact ? {
      width: '100%',
      maxWidth: 'none'
    } : { 
      width: '100vw', 
      maxWidth: 'none',
      position: 'relative',
      left: '50%',
      transform: 'translateX(-50%)',
      paddingLeft: '2rem',
      paddingRight: '2rem'
    }}>
      {/* Header */}
      {!compact && (
        <div className="phase-manager-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '20px' 
        }}>
          <div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              <span>Drag phases to move them • Resize by dragging edges • Double-click to edit • Right-click for more options</span>
            </div>
          </div>
          
          {/* Timeline controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginRight: '8px' }}>
              {timelineItems.length} phases
            </div>
            {/* Zoom controls temporarily removed for simplicity */}
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '6px 16px',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                backgroundColor: '#3b82f6',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            >
              + Add Phase
            </button>
          </div>
        </div>
      )}

      {compact && (
        <div className="phase-manager-header-compact" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '12px' 
        }}>
          <h4 style={{ margin: '0', fontSize: '14px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} />
            Project Phases ({timelineItems.length})
          </h4>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '4px 12px',
              border: '1px solid #3b82f6',
              borderRadius: '4px',
              backgroundColor: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 500
            }}
          >
            + Add Phase
          </button>
        </div>
      )}

      {/* Interactive Timeline */}
      <div style={{ 
        marginBottom: compact ? '12px' : '24px', 
        minHeight: compact ? '160px' : '220px', 
        position: 'relative', 
        width: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        // Apply alignment if provided
        ...(alignmentDimensions && compact ? {
          marginLeft: `${alignmentDimensions.left}px`,
          width: `${alignmentDimensions.width}px`
        } : {})
      }}>
        {timelineItems.length > 0 ? (
          <div>
            {/* Phase Timeline */}
            <InteractiveTimeline
              items={timelineItems.map(item => ({
                ...item,
                color: getPhaseColor((item.data as ProjectPhaseTimeline)?.phase_name || '')
              }))}
              viewport={timelineViewport}
              mode="phase-manager"
              height={140}
              onItemAdd={handleAddPhase}
              onItemEdit={(itemId) => {
                handlePhaseEdit(itemId);
              }}
              onItemDelete={handlePhaseDelete}
              onItemMove={handlePhaseMove}
              onItemResize={handlePhaseResize}
              showGrid={true}
              showToday={true}
              allowOverlap={false}
              minItemDuration={1}
              className="project-phase-timeline"
              style={{ 
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px 8px 0 0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            />
            
            {/* Date Timeline Reference */}
            <div style={{
              height: '40px',
              position: 'relative',
              backgroundColor: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              overflow: 'hidden'
            }}>
              {/* Month markers */}
              {(() => {
                const markers = [];
                const startDate = new Date(timelineViewport.startDate);
                const endDate = new Date(timelineViewport.endDate);
                const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                
                while (current <= endDate) {
                  const monthStart = new Date(current);
                  const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
                  const actualStart = monthStart > startDate ? monthStart : startDate;
                  const actualEnd = monthEnd < endDate ? monthEnd : endDate;
                  
                  const leftPos = ((actualStart.getTime() - timelineViewport.startDate.getTime()) / (1000 * 60 * 60 * 24)) * timelineViewport.pixelsPerDay;
                  const width = ((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24)) * timelineViewport.pixelsPerDay;
                  
                  const monthName = current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                  const isCurrentMonth = new Date().getMonth() === current.getMonth() && new Date().getFullYear() === current.getFullYear();
                  
                  markers.push(
                    <div
                      key={current.getTime()}
                      style={{
                        position: 'absolute',
                        left: leftPos,
                        width: Math.max(width, 0),
                        height: '40px',
                        borderRight: '1px solid #d1d5db',
                        backgroundColor: isCurrentMonth ? '#eff6ff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: isCurrentMonth ? '600' : '400',
                        color: isCurrentMonth ? '#1d4ed8' : '#6b7280',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {width > 50 ? monthName : (width > 30 ? current.toLocaleDateString('en-US', { month: 'short' }) : '')}
                    </div>
                  );
                  
                  current.setMonth(current.getMonth() + 1);
                }
                
                return markers;
              })()}
              
              {/* Today indicator line */}
              {(() => {
                const today = new Date();
                const todayPos = ((today.getTime() - timelineViewport.startDate.getTime()) / (1000 * 60 * 60 * 24)) * timelineViewport.pixelsPerDay;
                
                if (todayPos >= 0 && todayPos <= ((timelineViewport.endDate.getTime() - timelineViewport.startDate.getTime()) / (1000 * 60 * 60 * 24)) * timelineViewport.pixelsPerDay) {
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: todayPos,
                        top: 0,
                        bottom: 0,
                        width: '2px',
                        backgroundColor: '#ef4444',
                        zIndex: 10,
                        opacity: 0.8
                      }}
                    />
                  );
                }
                return null;
              })()}
            </div>
          </div>
        ) : (
          <div style={{
            height: '180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            {isLoading ? 'Loading project phases...' : 'No project phases found. Click "Add Phase" to create the first phase.'}
          </div>
        )}
      </div>


      {/* Phase Statistics */}
      {!compact && (
        <div className="phase-statistics" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '16px',
          marginBottom: '20px'
        }}>
        <div style={{ 
          padding: '16px', 
          backgroundColor: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px' 
        }}>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#1f2937' }}>
            {timelineItems.length}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Total Phases
          </div>
        </div>
        
        <div style={{ 
          padding: '16px', 
          backgroundColor: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px' 
        }}>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#1f2937' }}>
            {timelineItems.length > 0 ? Math.ceil(
              (timelineItems[timelineItems.length - 1].endDate.getTime() - 
               timelineItems[0].startDate.getTime()) / (1000 * 60 * 60 * 24)
            ) : 0}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Project Duration (Days)
          </div>
        </div>
        
        <div style={{ 
          padding: '16px', 
          backgroundColor: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px' 
        }}>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#1f2937' }}>
            {timelineItems.length > 0 ? format(timelineItems[0].startDate, 'MMM yyyy') : '-'}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Project Start
          </div>
        </div>
        
        <div style={{ 
          padding: '16px', 
          backgroundColor: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px' 
        }}>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#1f2937' }}>
            {timelineItems.length > 0 ? format(timelineItems[timelineItems.length - 1].endDate, 'MMM yyyy') : '-'}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Project End
          </div>
        </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            padding: '4px 0',
            minWidth: '150px',
            zIndex: 1000
          }}
        >
          <button
            className="context-menu-item"
            onClick={() => {
              handlePhaseEdit(contextMenu.phaseId);
              setContextMenu(null);
            }}
          >
            Edit Phase
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              const phase = phasesData?.data.find((p: ProjectPhaseTimeline) => p.id === contextMenu.phaseId);
              if (phase) {
                const duplicateStartDate = addDays(new Date(phase.end_date), 1);
                const duplicateEndDate = addDays(duplicateStartDate, 
                  (new Date(phase.end_date).getTime() - new Date(phase.start_date).getTime()) / (1000 * 60 * 60 * 24)
                );
                setAddPhaseForm({
                  phase_id: phase.phase_id,
                  start_date: format(duplicateStartDate, 'yyyy-MM-dd'),
                  end_date: format(duplicateEndDate, 'yyyy-MM-dd'),
                  phase_order: phase.phase_order + 1
                });
                setShowAddModal(true);
              }
              setContextMenu(null);
            }}
          >
            Duplicate Phase
          </button>
          <button
            className="context-menu-item danger"
            onClick={() => {
              handlePhaseDelete(contextMenu.phaseId);
              setContextMenu(null);
            }}
          >
            Delete Phase
          </button>
        </div>
      )}

      {/* Add Phase Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                Add New Phase
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setIsModalActive(false);
                }}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>
            
            <form className="modal-form" onSubmit={(e) => {
              e.preventDefault();
              addPhaseMutation.mutate({
                project_id: projectId,
                phase_id: addPhaseForm.phase_id,
                start_date: addPhaseForm.start_date,
                end_date: addPhaseForm.end_date,
                phase_order: addPhaseForm.phase_order
              });
              setShowAddModal(false);
              setIsModalActive(false);
              setAddPhaseForm({ phase_id: '', start_date: '', end_date: '', phase_order: 1 });
            }}>
              <div className="form-group">
                <label className="form-label">
                  <Type size={16} />
                  Phase Type
                </label>
                <select
                  value={addPhaseForm.phase_id}
                  onChange={(e) => setAddPhaseForm(prev => ({ ...prev, phase_id: e.target.value }))}
                  required
                  className="form-select"
                >
                  <option value="">Select a phase type...</option>
                  {Array.isArray(phaseTemplates?.data) ? phaseTemplates.data.map((template: any) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  )) : Array.isArray(phaseTemplates) ? phaseTemplates.map((template: any) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  )) : null}
                </select>
              </div>
              
              <div className="form-group grid">
                <div>
                  <label className="form-label">
                    <Calendar size={16} />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={addPhaseForm.start_date}
                    onChange={(e) => setAddPhaseForm(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                    className="form-input"
                  />
                </div>
                
                <div>
                  <label className="form-label">
                    <Calendar size={16} />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={addPhaseForm.end_date}
                    onChange={(e) => setAddPhaseForm(prev => ({ ...prev, end_date: e.target.value }))}
                    required
                    min={addPhaseForm.start_date}
                    className="form-input"
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setIsModalActive(false);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!addPhaseForm.phase_id || !addPhaseForm.start_date || !addPhaseForm.end_date}
                  className="btn btn-primary"
                >
                  <Save size={16} />
                  Add Phase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Phase Modal */}
      {editingPhase && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                Edit Phase: {editingPhase.phase_name}
              </h3>
              <button
                onClick={() => {
                  setEditingPhase(null);
                  setIsModalActive(false);
                  setEditPhaseForm({ phase_name: '', start_date: '', end_date: '', phase_order: 1 });
                }}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>
            
            <form className="modal-form" onSubmit={(e) => {
              e.preventDefault();
              updatePhaseMutation.mutate({
                phaseId: editingPhase.id,
                updates: {
                  start_date: editPhaseForm.start_date,
                  end_date: editPhaseForm.end_date,
                  phase_order: editPhaseForm.phase_order
                }
              });
              setEditingPhase(null);
              setIsModalActive(false);
              setEditPhaseForm({ phase_name: '', start_date: '', end_date: '', phase_order: 1 });
            }}>
              <div className="form-group">
                <label className="form-label">
                  <Type size={16} />
                  Phase Type (read-only)
                </label>
                <input
                  type="text"
                  value={editPhaseForm.phase_name}
                  disabled
                  className="form-input"
                />
              </div>
              
              <div className="form-group grid">
                <div>
                  <label className="form-label">
                    <Calendar size={16} />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editPhaseForm.start_date}
                    onChange={(e) => setEditPhaseForm(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                    className="form-input"
                  />
                </div>
                
                <div>
                  <label className="form-label">
                    <Calendar size={16} />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editPhaseForm.end_date}
                    onChange={(e) => setEditPhaseForm(prev => ({ ...prev, end_date: e.target.value }))}
                    required
                    min={editPhaseForm.start_date}
                    className="form-input"
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPhase(null);
                    setIsModalActive(false);
                    setEditPhaseForm({ phase_name: '', start_date: '', end_date: '', phase_order: 1 });
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editPhaseForm.start_date || !editPhaseForm.end_date}
                  className="btn btn-primary"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default VisualPhaseManager;