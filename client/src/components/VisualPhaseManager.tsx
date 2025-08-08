import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import InteractiveTimeline, { TimelineItem, TimelineViewport } from './InteractiveTimeline';
import useInteractiveTimeline from '../hooks/useInteractiveTimeline';
import './InteractiveTimeline.css';
import { addDays, format, startOfMonth, endOfMonth } from 'date-fns';

interface VisualPhaseManagerProps {
  projectId: string;
  projectName: string;
  onPhasesChange?: () => void;
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

export function VisualPhaseManager({ projectId, projectName, onPhasesChange }: VisualPhaseManagerProps) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectPhaseTimeline | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; phaseId: string } | null>(null);

  // Fetch project phases
  const { data: phasesData, isLoading } = useQuery({
    queryKey: ['project-phases', projectId],
    queryFn: async () => {
      const response = await api.projects.getPhases(projectId);
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

  // Convert phases to timeline items
  const timelineItems: TimelineItem[] = React.useMemo(() => {
    if (!phasesData?.phases) return [];
    
    return phasesData.phases.map((phase: ProjectPhaseTimeline) => ({
      id: phase.id,
      name: phase.phase_name,
      startDate: new Date(phase.start_date),
      endDate: new Date(phase.end_date),
      color: getPhaseColor(phase.phase_name),
      data: phase
    }));
  }, [phasesData]);

  // Initialize timeline with auto-fit viewport
  const timeline = useInteractiveTimeline({
    items: timelineItems,
    autoFitViewport: true,
    minPixelsPerDay: 1,
    maxPixelsPerDay: 10,
    onItemsChange: (items) => {
      // This will be handled by the individual mutation callbacks
    }
  });

  // Update phase mutation
  const updatePhaseMutation = useMutation({
    mutationFn: async ({ phaseId, updates }: { phaseId: string; updates: Partial<ProjectPhaseTimeline> }) => {
      const response = await api.projects.updatePhase(projectId, phaseId, updates);
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
      await api.projects.deletePhase(projectId, phaseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      onPhasesChange?.();
    }
  });

  // Add phase mutation
  const addPhaseMutation = useMutation({
    mutationFn: async (phaseData: Omit<ProjectPhaseTimeline, 'id'>) => {
      const response = await api.projects.addPhase(projectId, phaseData);
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
    const phase = phasesData?.phases.find((p: ProjectPhaseTimeline) => p.id === itemId);
    if (phase) {
      setEditingPhase(phase);
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
    // TODO: Implement add phase modal/dialog
    setShowAddModal(true);
  }, []);

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

  if (isLoading) {
    return (
      <div className="visual-phase-manager">
        <div className="loading">Loading project phases...</div>
      </div>
    );
  }

  return (
    <div className="visual-phase-manager" style={{ width: '100%' }}>
      {/* Header */}
      <div className="phase-manager-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px' 
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1f2937' }}>
            Project Phase Timeline
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            Drag to move phases, resize by dragging edges, double-click to edit, right-click for options
          </p>
        </div>
        
        {/* Timeline controls */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={timeline.zoomOut}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Zoom Out"
          >
            -
          </button>
          <button
            onClick={timeline.zoomIn}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={timeline.zoomToFit}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Fit to Window"
          >
            Fit
          </button>
          <button
            onClick={timeline.jumpToToday}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Jump to Today"
          >
            Today
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '6px 12px',
              border: '1px solid #3b82f6',
              borderRadius: '6px',
              backgroundColor: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            Add Phase
          </button>
        </div>
      </div>

      {/* Interactive Timeline */}
      <div style={{ marginBottom: '20px' }}>
        <InteractiveTimeline
          items={timeline.items}
          viewport={timeline.viewport}
          mode="phase-manager"
          height={120}
          onItemAdd={handleAddPhase}
          onItemEdit={handlePhaseEdit}
          onItemDelete={handlePhaseDelete}
          onItemMove={handlePhaseMove}
          onItemResize={handlePhaseResize}
          showGrid={true}
          showToday={true}
          allowOverlap={false}
          minItemDuration={1}
          style={{ 
            backgroundColor: '#f9fafb',
            border: '2px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
      </div>

      {/* Phase Statistics */}
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
            {timeline.items.length}
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
            {timeline.items.length > 0 ? Math.ceil(
              (timeline.items[timeline.items.length - 1].endDate.getTime() - 
               timeline.items[0].startDate.getTime()) / (1000 * 60 * 60 * 24)
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
            {timeline.items.length > 0 ? format(timeline.items[0].startDate, 'MMM yyyy') : '-'}
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
            {timeline.items.length > 0 ? format(timeline.items[timeline.items.length - 1].endDate, 'MMM yyyy') : '-'}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Project End
          </div>
        </div>
      </div>

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
              // TODO: Implement duplicate functionality
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

      {/* Modals would go here - Add Phase Modal, Edit Phase Modal, etc. */}
      {/* These would use the existing modal components from the current system */}
    </div>
  );
}

export default VisualPhaseManager;