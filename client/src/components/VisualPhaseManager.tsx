import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import InteractiveTimeline, { TimelineItem, TimelineViewport } from './InteractiveTimeline';
import useInteractiveTimeline from '../hooks/useInteractiveTimeline';
import './InteractiveTimeline.css';
import { addDays, format, startOfMonth, endOfMonth } from 'date-fns';
import { X, Calendar, Type, Save, Plus } from 'lucide-react';

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
  chartTimeData?: Array<{ date: string; [key: string]: any }>; // Chart data for time axis alignment
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
// NOTE: Using hex values instead of CSS variables because these colors
// are passed to InteractiveTimeline which may use canvas rendering
// where CSS variables cannot be resolved
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

export function VisualPhaseManager({ projectId, projectName, onPhasesChange, compact = false, externalViewport, onViewportChange, alignmentDimensions, chartTimeData }: VisualPhaseManagerProps) {
  // Debug alignment dimensions
  React.useEffect(() => {
    if (alignmentDimensions) {
      console.log('📈 VisualPhaseManager received alignment dimensions:', alignmentDimensions);
    } else {
      console.log('⚠️ VisualPhaseManager: No alignment dimensions provided');
    }
  }, [alignmentDimensions]);
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

  // Dependency-related state
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [editingDependency, setEditingDependency] = useState<any>(null);
  const [dependencyForm, setDependencyForm] = useState({
    predecessor_phase_timeline_id: '',
    successor_phase_timeline_id: '',
    dependency_type: 'FS' as 'FS' | 'SS' | 'FF' | 'SF',
    lag_days: 0
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

  // Fetch project phase dependencies
  const { data: dependenciesData, refetch: refetchDependencies } = useQuery({
    queryKey: ['project-phase-dependencies', projectId],
    queryFn: async () => {
      const response = await api.projectPhaseDependencies.list({ project_id: projectId });
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
    const sortedPhases = cleanPhases.sort((a: any, b: any) => 
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
    // If we have external viewport AND alignment constraints, adjust pixelsPerDay to fit
    if (externalViewport && alignmentDimensions && compact) {
      const totalDays = (externalViewport.endDate.getTime() - externalViewport.startDate.getTime()) / (1000 * 60 * 60 * 24);
      const availableWidth = alignmentDimensions.width;
      const fittedPixelsPerDay = Math.max(0.5, availableWidth / totalDays); // Ensure it fits exactly
      
      const adjustedViewport = {
        ...externalViewport,
        pixelsPerDay: fittedPixelsPerDay
      };
      
      console.log('📈 VisualPhaseManager adjusted viewport for alignment:', {
        original: externalViewport,
        adjusted: adjustedViewport,
        totalDays,
        availableWidth,
        fittedPixelsPerDay
      });
      
      return adjustedViewport;
    }
    
    // ALWAYS use external viewport if provided (for shared timeline control)
    if (externalViewport) {
      console.log('📈 VisualPhaseManager using external viewport:', externalViewport);
      return externalViewport;
    }
    
    // Only calculate own viewport if no external control AND not in compact mode
    // In compact mode (integrated with resource chart), we should wait for external viewport
    if (compact) {
      // Return a default viewport while waiting for external control
      const today = new Date();
      return {
        startDate: new Date(today.getFullYear(), 0, 1),
        endDate: new Date(today.getFullYear() + 1, 11, 31),
        pixelsPerDay: 2
      };
    }
    
    // Calculate own viewport only for standalone mode
    if (timelineItems.length === 0) {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), 0, 1); // Start of current year
      const endDate = new Date(today.getFullYear() + 1, 11, 31); // End of next year
      const viewport = {
        startDate,
        endDate,
        pixelsPerDay: 2
      };
      
      // Only notify parent in standalone mode
      if (!compact) {
        onViewportChange?.(viewport);
      }
      return viewport;
    }
    
    // Calculate date range from actual phase data - only in standalone mode
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
    
    // Only notify parent in standalone mode
    if (!compact) {
      onViewportChange?.(viewport);
    }
    
    return viewport;
  }, [timelineItems, externalViewport, onViewportChange, compact]);

  // Remove the separate effect since we handle notification in the useMemo above

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

  // Dependency handlers
  const handleEditDependency = useCallback((dependency: any) => {
    setEditingDependency(dependency);
    setDependencyForm({
      predecessor_phase_timeline_id: dependency.predecessor_phase_timeline_id,
      successor_phase_timeline_id: dependency.successor_phase_timeline_id,
      dependency_type: dependency.dependency_type,
      lag_days: dependency.lag_days || 0
    });
    setShowDependencyModal(true);
  }, []);

  const handleDeleteDependency = useCallback(async (dependencyId: string) => {
    if (window.confirm('Are you sure you want to delete this dependency?')) {
      try {
        await api.projectPhaseDependencies.delete(dependencyId);
        refetchDependencies();
      } catch (error) {
        console.error('Failed to delete dependency:', error);
      }
    }
  }, [refetchDependencies]);

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
    setIsModalActive(showAddModal || editingPhase !== null || showDependencyModal);
  }, [showAddModal, editingPhase, showDependencyModal]);

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
            <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
              <span>Drag phases to move them • Resize by dragging edges • Double-click to edit • Right-click for more options</span>
            </div>
          </div>
          
          {/* Timeline controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginRight: '8px' }}>
              {timelineItems.length} phases
            </div>
            {/* Zoom controls temporarily removed for simplicity */}
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '6px 16px',
                border: '1px solid var(--primary)',
                borderRadius: '6px',
                backgroundColor: 'var(--primary)',
                color: 'var(--bg-primary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                boxShadow: '0 1px 2px var(--shadow-sm)'
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
          <h4 style={{ margin: '0', fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} />
            Project Phases ({timelineItems.length})
          </h4>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '4px 12px',
              border: '1px solid var(--primary)',
              borderRadius: '4px',
              backgroundColor: 'var(--primary)',
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
        overflowX: compact ? 'hidden' : 'auto', // Hidden in compact mode for alignment
        overflowY: 'visible' // Allow handles to show above phases
      }}>
        {/* Timeline container with precise alignment */}
        <div style={{
          position: 'relative',
          width: '100%',
          // Apply exact chart alignment when in compact mode
          ...(alignmentDimensions && compact ? {
            marginLeft: `${alignmentDimensions.left}px`,
            width: `${alignmentDimensions.width}px`,
            maxWidth: `${alignmentDimensions.width}px`
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
              height={170}
              dependencies={dependenciesData?.data?.map((dep: any) => ({
                id: dep.id,
                predecessorId: dep.predecessor_phase_timeline_id,
                successorId: dep.successor_phase_timeline_id,
                dependencyType: dep.dependency_type,
                lagDays: dep.lag_days
              })) || []}
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
              chartTimeData={chartTimeData} // Pass chart data for exact time axis alignment
              style={{ 
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px 8px 0 0',
                boxShadow: '0 1px 3px var(--shadow-sm)'
              }}
            />
            
            {/* Date Timeline Reference */}
            <div style={{
              height: '40px',
              position: 'relative',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
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
                        borderRight: '1px solid var(--border-color-hover)',
                        backgroundColor: isCurrentMonth ? 'var(--badge-primary-bg)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: isCurrentMonth ? '600' : '400',
                        color: isCurrentMonth ? 'var(--project-selected)' : 'var(--text-tertiary)',
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
                        backgroundColor: 'var(--danger)',
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
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: 'var(--text-tertiary)',
            fontSize: '14px'
          }}>
            {isLoading ? 'Loading project phases...' : 'No project phases found. Click "Add Phase" to create the first phase.'}
          </div>
        )}
        
        {/* Phase Dependencies Section */}
        {!compact && timelineItems.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              padding: '0 4px'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                Phase Dependencies
              </h3>
              <button
                onClick={() => setShowDependencyModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  backgroundColor: 'var(--primary)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} />
                Add Dependency
              </button>
            </div>
            
            {/* Dependencies List */}
            <div style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {dependenciesData?.data?.length > 0 ? (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {dependenciesData.data.map((dep: any) => (
                    <div
                      key={dep.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--bg-tertiary)'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {dep.predecessor_phase_name} → {dep.successor_phase_name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                          {dep.dependency_type} {dep.lag_days > 0 && `(+${dep.lag_days} days)`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEditDependency(dep)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--border-color-hover)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDependency(dep.id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'var(--danger)',
                            color: 'var(--bg-primary)',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: '14px'
                }}>
                  No dependencies defined. Click "Add Dependency" to create phase dependencies.
                </div>
              )}
            </div>
          </div>
        )}
        </div>
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
          <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {timelineItems.length}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
            Total Phases
          </div>
        </div>
        
        <div style={{ 
          padding: '16px', 
          backgroundColor: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px' 
        }}>
          <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {timelineItems.length > 0 ? Math.ceil(
              (timelineItems[timelineItems.length - 1].endDate.getTime() - 
               timelineItems[0].startDate.getTime()) / (1000 * 60 * 60 * 24)
            ) : 0}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
            Project Duration (Days)
          </div>
        </div>
        
        <div style={{ 
          padding: '16px', 
          backgroundColor: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px' 
        }}>
          <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {timelineItems.length > 0 ? format(timelineItems[0].startDate, 'MMM yyyy') : '-'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
            Project Start
          </div>
        </div>
        
        <div style={{ 
          padding: '16px', 
          backgroundColor: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px' 
        }}>
          <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {timelineItems.length > 0 ? format(timelineItems[timelineItems.length - 1].endDate, 'MMM yyyy') : '-'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
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
            background: 'var(--bg-primary)',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            boxShadow: '0 10px 25px var(--shadow-lg)',
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
              const selectedPhase = phaseTemplates?.data?.find((p: any) => p.id === addPhaseForm.phase_id);
              addPhaseMutation.mutate({
                project_id: projectId,
                phase_id: addPhaseForm.phase_id,
                phase_name: selectedPhase?.name || 'Unknown Phase',
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

      {/* Add/Edit Dependency Modal */}
      {showDependencyModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingDependency ? 'Edit' : 'Add'} Phase Dependency
              </h3>
              <button
                onClick={() => {
                  setShowDependencyModal(false);
                  setEditingDependency(null);
                  setDependencyForm({
                    predecessor_phase_timeline_id: '',
                    successor_phase_timeline_id: '',
                    dependency_type: 'FS',
                    lag_days: 0
                  });
                }}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>
            
            <form className="modal-form" onSubmit={async (e) => {
              e.preventDefault();
              try {
                const data = {
                  project_id: projectId,
                  ...dependencyForm
                };
                
                if (editingDependency) {
                  await api.projectPhaseDependencies.update(editingDependency.id, data);
                } else {
                  await api.projectPhaseDependencies.create(data);
                }
                
                refetchDependencies();
                setShowDependencyModal(false);
                setEditingDependency(null);
                setDependencyForm({
                  predecessor_phase_timeline_id: '',
                  successor_phase_timeline_id: '',
                  dependency_type: 'FS',
                  lag_days: 0
                });
              } catch (error) {
                console.error('Failed to save dependency:', error);
              }
            }}>
              <div className="form-group">
                <label className="form-label">
                  Predecessor Phase (must complete first)
                </label>
                <select
                  value={dependencyForm.predecessor_phase_timeline_id}
                  onChange={(e) => setDependencyForm(prev => ({ ...prev, predecessor_phase_timeline_id: e.target.value }))}
                  required
                  className="form-select"
                >
                  <option value="">Select predecessor phase...</option>
                  {timelineItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Successor Phase (depends on predecessor)
                </label>
                <select
                  value={dependencyForm.successor_phase_timeline_id}
                  onChange={(e) => setDependencyForm(prev => ({ ...prev, successor_phase_timeline_id: e.target.value }))}
                  required
                  className="form-select"
                >
                  <option value="">Select successor phase...</option>
                  {timelineItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Dependency Type
                </label>
                <select
                  value={dependencyForm.dependency_type}
                  onChange={(e) => setDependencyForm(prev => ({ ...prev, dependency_type: e.target.value as 'FS' | 'SS' | 'FF' | 'SF' }))}
                  className="form-select"
                >
                  <option value="FS">Finish-to-Start (FS)</option>
                  <option value="SS">Start-to-Start (SS)</option>
                  <option value="FF">Finish-to-Finish (FF)</option>
                  <option value="SF">Start-to-Finish (SF)</option>
                </select>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  {dependencyForm.dependency_type === 'FS' && 'Successor starts after predecessor finishes'}
                  {dependencyForm.dependency_type === 'SS' && 'Successor starts when predecessor starts'}
                  {dependencyForm.dependency_type === 'FF' && 'Successor finishes when predecessor finishes'}
                  {dependencyForm.dependency_type === 'SF' && 'Successor finishes before predecessor starts'}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Lag Days (optional delay)
                </label>
                <input
                  type="number"
                  value={dependencyForm.lag_days}
                  onChange={(e) => setDependencyForm(prev => ({ ...prev, lag_days: parseInt(e.target.value) || 0 }))}
                  min="-365"
                  max="365"
                  className="form-input"
                />
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  Positive values add delay, negative values create overlap
                </div>
              </div>
              
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowDependencyModal(false);
                    setEditingDependency(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!dependencyForm.predecessor_phase_timeline_id || !dependencyForm.successor_phase_timeline_id}
                  className="btn btn-primary"
                >
                  <Save size={16} />
                  {editingDependency ? 'Update' : 'Create'} Dependency
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