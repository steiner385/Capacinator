import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Edit2, Save, X, ZoomIn, ZoomOut, Filter, Search, ChevronDown, ChevronRight, ChevronLeft, SkipBack, SkipForward, Maximize2, Minimize2 } from 'lucide-react';
import { api } from '../lib/api-client';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import InteractiveTimeline, { TimelineItem, TimelineViewport } from '../components/InteractiveTimeline';
import type { Project, ProjectPhase } from '../types';
import './ProjectRoadmap.css';

interface ProjectWithPhases extends Project {
  phases: ProjectPhaseTimeline[];
}

interface ProjectPhaseTimeline {
  id: string;
  project_id: string;
  phase_id: string;
  phase_name: string;
  phase_order: number;
  start_date: string;
  end_date: string;
  color_code?: string;
  created_at: string;
  updated_at: string;
}


interface EditingPhase {
  projectId: string;
  phaseId: string;
  startDate: string;
  endDate: string;
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

export default function ProjectRoadmap() {
  const queryClient = useQueryClient();
  const timelineRef = useRef<HTMLDivElement>(null);
  // Calculate initial viewport with Today at 30% from left
  const calculateInitialViewport = () => {
    const today = new Date();
    const totalDaysToShow = 365 * 2; // Show 2 years total
    const daysBeforeToday = Math.floor(totalDaysToShow * 0.3); // 30% before today
    const daysAfterToday = totalDaysToShow - daysBeforeToday;
    
    const startDate = new Date(today.getTime() - (daysBeforeToday * 24 * 60 * 60 * 1000));
    const endDate = new Date(today.getTime() + (daysAfterToday * 24 * 60 * 60 * 1000));
    
    return {
      startDate,
      endDate,
      pixelsPerDay: 2 // Reduced zoom for wider date range visibility
    };
  };

  const [viewport, setViewport] = useState<TimelineViewport>(calculateInitialViewport());

  // Scroll timeline horizontally
  const scrollTimeline = (direction: 'left' | 'right') => {
    const monthsToShift = 3; // Scroll by 3 months at a time
    const currentSpan = viewport.endDate.getTime() - viewport.startDate.getTime();
    
    if (direction === 'right') {
      // Move forward in time
      const newStartDate = new Date(viewport.startDate);
      newStartDate.setMonth(newStartDate.getMonth() + monthsToShift);
      const newEndDate = new Date(newStartDate.getTime() + currentSpan);
      
      setViewport({
        ...viewport,
        startDate: newStartDate,
        endDate: newEndDate
      });
    } else {
      // Move backward in time
      const newStartDate = new Date(viewport.startDate);
      newStartDate.setMonth(newStartDate.getMonth() - monthsToShift);
      const newEndDate = new Date(newStartDate.getTime() + currentSpan);
      
      setViewport({
        ...viewport,
        startDate: newStartDate,
        endDate: newEndDate
      });
    }
  };

  // Go to today - position Today at 30% from left edge
  const goToToday = () => {
    const today = new Date();
    const currentSpanDays = Math.round((viewport.endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysBeforeToday = Math.floor(currentSpanDays * 0.3); // 30% before today
    const daysAfterToday = currentSpanDays - daysBeforeToday;
    
    const newStartDate = new Date(today.getTime() - (daysBeforeToday * 24 * 60 * 60 * 1000));
    const newEndDate = new Date(today.getTime() + (daysAfterToday * 24 * 60 * 60 * 1000));
    
    setViewport({
      ...viewport,
      startDate: newStartDate,
      endDate: newEndDate
    });
  };

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle navigation when timeline is focused or no input is focused
      if (event.target && (event.target as HTMLElement).tagName === 'INPUT') {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            scrollTimeline('left');
          }
          break;
        case 'ArrowRight':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            scrollTimeline('right');
          }
          break;
        case 'Home':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            goToToday();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const [editingPhase, setEditingPhase] = useState<EditingPhase | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectWithPhases | null>(null);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    projectType: '',
    owner: ''
  });

  // Convert project phases to timeline items for InteractiveTimeline
  const convertPhasesToTimelineItems = useCallback((project: ProjectWithPhases): TimelineItem[] => {
    return project.phases.map(phase => ({
      id: phase.id,
      name: phase.phase_name,
      startDate: new Date(phase.start_date),
      endDate: new Date(phase.end_date),
      color: getPhaseColor(phase.phase_name),
      data: { ...phase, projectId: project.id } // Include project context
    }));
  }, []);
  
  // Debounced filters to prevent excessive API calls
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  
  // Debounce filter changes to reduce API calls
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 500); // 500ms debounce delay
    
    return () => clearTimeout(timer);
  }, [filters]);
  
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [allCollapsed, setAllCollapsed] = useState(true);

  // Update phase dates mutation for drag operations
  const updatePhaseDragMutation = useMutation({
    mutationFn: async ({ projectId, phaseId, startDate, endDate }: {
      projectId: string;
      phaseId: string;
      startDate: string;
      endDate: string;
    }) => {
      return api.projectPhases.update(phaseId, {
        start_date: startDate,
        end_date: endDate
      });
    },
    onError: () => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['projectsRoadmap'] });
    }
  });

  // Update phase dates mutation for manual editing
  const updatePhaseManualMutation = useMutation({
    mutationFn: async ({ projectId, phaseId, startDate, endDate }: {
      projectId: string;
      phaseId: string;
      startDate: string;
      endDate: string;
    }) => {
      return api.projectPhases.update(phaseId, {
        start_date: startDate,
        end_date: endDate
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectsRoadmap'] });
      setEditingPhase(null);
    }
  });

  // Fetch projects with phases
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projectsRoadmap', debouncedFilters],
    queryFn: async () => {
      const params = Object.entries(debouncedFilters)
        .filter(([_, value]) => value)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      const response = await api.projects.list(params);
      const projectsData = response.data.data as Project[];
      
      // Fetch phases for each project
      const projectsWithPhases: ProjectWithPhases[] = await Promise.all(
        projectsData.map(async (project) => {
          const phasesResponse = await api.projectPhases.list({ project_id: project.id });
          const phases = (phasesResponse.data.data || []) as ProjectPhaseTimeline[];
          
          return {
            ...project,
            phases: phases.sort((a, b) => a.phase_order - b.phase_order)
          };
        })
      );
      
      return projectsWithPhases;
    }
  });

  // Handle phase move/resize from InteractiveTimeline
  const handlePhaseMove = useCallback((itemId: string, newStartDate: Date, newEndDate: Date) => {
    // Find which project this phase belongs to
    const projectWithPhase = projects?.find(p => p.phases.some(ph => ph.id === itemId));
    if (!projectWithPhase) return;

    // Update in-memory state optimistically
    queryClient.setQueryData(['projectsRoadmap', debouncedFilters], (oldData: ProjectWithPhases[] | undefined) => {
      if (!oldData) return oldData;
      
      return oldData.map(project => {
        if (project.id === projectWithPhase.id) {
          return {
            ...project,
            phases: project.phases.map(phase => {
              if (phase.id === itemId) {
                return {
                  ...phase,
                  start_date: newStartDate.toISOString().split('T')[0],
                  end_date: newEndDate.toISOString().split('T')[0]
                };
              }
              return phase;
            })
          };
        }
        return project;
      });
    });

    // Update in backend
    updatePhaseDragMutation.mutate({
      projectId: projectWithPhase.id,
      phaseId: itemId,
      startDate: newStartDate.toISOString().split('T')[0],
      endDate: newEndDate.toISOString().split('T')[0]
    });
  }, [projects, queryClient, debouncedFilters, updatePhaseDragMutation]);

  // Handle phase edit from InteractiveTimeline
  const handlePhaseEdit = useCallback((itemId: string) => {
    const projectWithPhase = projects?.find(p => p.phases.some(ph => ph.id === itemId));
    const phase = projectWithPhase?.phases.find(ph => ph.id === itemId);
    
    if (phase && projectWithPhase) {
      setEditingPhase({
        projectId: projectWithPhase.id,
        phaseId: phase.id,
        startDate: phase.start_date,
        endDate: phase.end_date
      });
    }
  }, [projects]);

  // Set all projects as collapsed by default when data loads
  React.useEffect(() => {
    if (projects && allCollapsed) {
      const allProjectIds = new Set(projects.map(p => p.id));
      setCollapsedProjects(allProjectIds);
    }
  }, [projects, allCollapsed]);

  // Calculate date position on timeline
  const getDatePosition = useCallback((date: Date) => {
    const diffInMs = date.getTime() - viewport.startDate.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    return Math.max(0, diffInDays * viewport.pixelsPerDay);
  }, [viewport]);

  // Calculate date from position
  const getDateFromPosition = useCallback((position: number) => {
    const daysFromStart = position / viewport.pixelsPerDay;
    return new Date(viewport.startDate.getTime() + daysFromStart * 24 * 60 * 60 * 1000);
  }, [viewport]);

  // Handle zoom
  const handleZoom = (direction: 'in' | 'out') => {
    setViewport(prev => ({
      ...prev,
      pixelsPerDay: direction === 'in' 
        ? Math.min(prev.pixelsPerDay * 1.5, 10)
        : Math.max(prev.pixelsPerDay / 1.5, 0.5)
    }));
  };



  // Save manual edit
  const savePhaseEdit = () => {
    if (editingPhase) {
      updatePhaseManualMutation.mutate(editingPhase);
    }
  };

  // Toggle project collapse
  const toggleProjectCollapse = (projectId: string) => {
    setCollapsedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      
      // Update allCollapsed state based on current state
      if (projects) {
        const allProjectIds = projects.map(p => p.id);
        const allCollapsedNow = allProjectIds.every(id => newSet.has(id));
        const noneCollapsedNow = allProjectIds.every(id => !newSet.has(id));
        
        if (allCollapsedNow) {
          setAllCollapsed(true);
        } else if (noneCollapsedNow) {
          setAllCollapsed(false);
        }
      }
      
      return newSet;
    });
  };

  // Toggle all projects expand/collapse
  const toggleAllProjects = () => {
    if (!projects) return;
    
    const allProjectIds = projects.map(p => p.id);
    const allCurrentlyCollapsed = allProjectIds.every(id => collapsedProjects.has(id));
    
    if (allCurrentlyCollapsed) {
      // Expand all
      setCollapsedProjects(new Set());
      setAllCollapsed(false);
    } else {
      // Collapse all
      const allProjectIdSet = new Set(allProjectIds);
      setCollapsedProjects(allProjectIdSet);
      setAllCollapsed(true);
    }
  };

  // Generate year headers
  const generateYearHeaders = () => {
    const yearHeaders = [];
    const startYear = viewport.startDate.getFullYear();
    const endYear = viewport.endDate.getFullYear();
    
    for (let year = startYear; year <= endYear; year++) {
      // Calculate the actual start and end dates for this year within our viewport
      const yearStart = new Date(year, year === startYear ? viewport.startDate.getMonth() : 0, 1);
      const yearEnd = new Date(year, year === endYear ? viewport.endDate.getMonth() + 1 : 12, 0); // Last day of month
      
      // Clamp to viewport bounds
      const actualStart = new Date(Math.max(yearStart.getTime(), viewport.startDate.getTime()));
      const actualEnd = new Date(Math.min(yearEnd.getTime(), viewport.endDate.getTime()));
      
      const startPosition = getDatePosition(actualStart);
      const endPosition = getDatePosition(actualEnd);
      const width = endPosition - startPosition;
      
      if (width > 0) {
        yearHeaders.push(
          <div 
            key={year} 
            className="timeline-header-year"
            style={{ 
              left: startPosition,
              width: width
            }}
          >
            <div className="year-label">{year}</div>
          </div>
        );
      }
    }
    
    return yearHeaders;
  };

  // Generate timeline header with dates
  const generateTimelineHeader = () => {
    const headers = [];
    const totalDays = (viewport.endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const monthsToShow = Math.ceil(totalDays / 30);
    
    for (let i = 0; i < monthsToShow; i++) {
      const date = new Date(viewport.startDate.getFullYear(), viewport.startDate.getMonth() + i, 1);
      const position = getDatePosition(date);
      const nextDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const width = getDatePosition(nextDate) - position;
      
      headers.push(
        <div 
          key={i} 
          className="timeline-header-month"
          style={{ 
            left: position,
            width: Math.max(width, 60) // Ensure minimum width
          }}
        >
          <div className="month-label">
            {date.toLocaleDateString('en-US', { month: 'short' })}
          </div>
        </div>
      );
    }
    
    // Add quarter markers for better navigation
    const quarterHeaders = [];
    const startYear = viewport.startDate.getFullYear();
    const endYear = viewport.endDate.getFullYear();
    
    for (let year = startYear; year <= endYear; year++) {
      for (let quarter = 0; quarter < 4; quarter++) {
        const quarterStart = new Date(year, quarter * 3, 1);
        if (quarterStart >= viewport.startDate && quarterStart <= viewport.endDate) {
          const position = getDatePosition(quarterStart);
          quarterHeaders.push(
            <div
              key={`q${year}-${quarter}`}
              className="quarter-marker"
              style={{ left: position }}
            >
              Q{quarter + 1}
            </div>
          );
        }
      }
    }
    
    return [...headers, ...quarterHeaders];
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load project roadmap" />;

  // Calculate total timeline width
  const totalDays = (viewport.endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24);
  const timelineWidth = totalDays * viewport.pixelsPerDay;

  return (
    <div 
      className="project-roadmap"
      style={{
        '--grid-spacing': `${30 * viewport.pixelsPerDay}px`,
        '--timeline-width': `${timelineWidth}px`
      } as React.CSSProperties}
    >
      <div className="roadmap-header">
        <div className="header-content">
          <h1>
            <Calendar size={24} />
            Project Roadmap
          </h1>
          <p className="subtitle">
            Visual timeline of all projects and their phases
          </p>
        </div>
        
        <div className="roadmap-controls">
          <div className="search-filters">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search projects..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="timeline-info">
            <span className="timeline-range">
              {viewport.startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {viewport.endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>

          <button 
            className="btn btn-sm today-btn" 
            onClick={goToToday}
            title="Go to today"
          >
            Today
          </button>

          <input
            type="date"
            className="header-date-picker"
            onChange={(e) => {
              if (e.target.value) {
                const selectedDate = new Date(e.target.value);
                const monthsToShow = Math.round((viewport.endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                const newStartDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - Math.floor(monthsToShow / 2), 1);
                const newEndDate = new Date(newStartDate);
                newEndDate.setMonth(newEndDate.getMonth() + monthsToShow);
                
                setViewport({
                  ...viewport,
                  startDate: newStartDate,
                  endDate: newEndDate
                });
              }
            }}
            title="Jump to specific date"
          />
          
          <button 
            onClick={toggleAllProjects}
            className="btn btn-sm"
            title={
              projects && projects.every(p => collapsedProjects.has(p.id)) 
                ? 'Expand all projects' 
                : 'Collapse all projects'
            }
          >
            {projects && projects.every(p => collapsedProjects.has(p.id)) 
              ? <Maximize2 size={16} /> 
              : <Minimize2 size={16} />
            }
            {projects && projects.every(p => collapsedProjects.has(p.id)) 
              ? 'Expand All' 
              : 'Collapse All'
            }
          </button>
          
          <div className="zoom-controls">
            <button onClick={() => handleZoom('out')} className="btn btn-sm">
              <ZoomOut size={16} />
            </button>
            <span className="zoom-level">{Math.round(viewport.pixelsPerDay * 50)}%</span>
            <button onClick={() => handleZoom('in')} className="btn btn-sm">
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="roadmap-content">
        {/* Left Navigation Bar */}
        <div className="timeline-nav-side left" onClick={() => scrollTimeline('left')}>
          <div className="nav-side-content">
            <ChevronLeft size={24} />
            <span className="nav-side-text">Previous</span>
          </div>
        </div>

        {/* Right Navigation Bar */}
        <div className="timeline-nav-side right" onClick={() => scrollTimeline('right')}>
          <div className="nav-side-content">
            <span className="nav-side-text">Next</span>
            <ChevronRight size={24} />
          </div>
        </div>

        <div className="timeline-container" ref={timelineRef}>
          {/* Timeline Header */}
          <div className="timeline-header">
            {/* Timeline Navigation Controls */}
            <div className="timeline-nav-controls">
              {/* Navigation controls moved to main header */}
            </div>
            
            <div className="timeline-years" style={{ width: timelineWidth }}>
              {generateYearHeaders()}
            </div>
            <div className="timeline-months" style={{ width: timelineWidth }}>
              {generateTimelineHeader()}
            </div>
          </div>
          
          {/* Today Line */}
          {(() => {
            const today = new Date();
            const todayPosition = getDatePosition(today);
            
            // Debug logging for today line positioning
            console.log('📅 Today line debug:', {
              today: today.toISOString().split('T')[0],
              viewportStart: viewport.startDate.toISOString().split('T')[0],
              viewportEnd: viewport.endDate.toISOString().split('T')[0],
              todayPosition,
              timelineWidth,
              pixelsPerDay: viewport.pixelsPerDay
            });
            
            // Only show today line if it's within the current viewport
            if (todayPosition >= 0 && todayPosition <= timelineWidth) {
              // Calculate proper offset based on actual project info panel
              const projectInfoPanelWidth = 320; // This should match the actual panel width
              const adjustedPosition = projectInfoPanelWidth + todayPosition;
              
              console.log('📅 Today line positioned at:', adjustedPosition, 'px');
              
              return (
                <div 
                  className="today-line"
                  style={{ 
                    left: adjustedPosition,
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    backgroundColor: '#ef4444',
                    position: 'absolute',
                    zIndex: 1000,
                    pointerEvents: 'none'
                  }}
                  title={`Today: ${today.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}`}
                >
                  <div className="today-line-indicator" style={{
                    position: 'absolute',
                    top: '10px',
                    left: '4px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    <span className="today-label">Today</span>
                  </div>
                </div>
              );
            }
            console.log('📅 Today line not shown - outside viewport range');
            return null;
          })()}
          
          {/* Project Rows */}
          <div className="projects-timeline">
            {projects?.map((project) => {
              const isCollapsed = collapsedProjects.has(project.id);
              return (
                <div key={project.id} className={`project-row ${isCollapsed ? 'collapsed' : ''}`}>
                  <div className="project-info">
                    <div className="project-header">
                      <div className="project-title-section">
                        <button
                          className="collapse-toggle"
                          onClick={() => toggleProjectCollapse(project.id)}
                          title={isCollapsed ? 'Expand project details' : 'Collapse project details'}
                        >
                          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <h3 className="project-name">
                          <button 
                            className="project-name-link"
                            onClick={() => setSelectedProject(project)}
                            title="View project details"
                          >
                            {project.name}
                          </button>
                        </h3>
                      </div>
                      <div className="project-priority">
                        <span className={`priority-badge priority-${project.priority <= 1 ? 'high' : project.priority <= 3 ? 'medium' : 'low'}`}>
                          {project.priority <= 1 ? 'High' : project.priority <= 3 ? 'Medium' : 'Low'}
                        </span>
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="project-details">
                        <p className="project-meta">
                          <span 
                            className="project-type" 
                            style={{ 
                              backgroundColor: project.project_type?.color_code ? `${project.project_type.color_code}20` : '#eff6ff',
                              color: project.project_type?.color_code || '#1d4ed8',
                              borderLeft: `3px solid ${project.project_type?.color_code || '#1d4ed8'}`
                            }}
                          >
                            {project.project_type?.name}
                          </span>
                          <span className={`project-status status-${(project.status || 'planned').toLowerCase()}`}>
                            {project.status || 'Planned'}
                          </span>
                        </p>
                        <p className="project-dates">
                          <span className="date-range">
                            {project.aspiration_start && new Date(project.aspiration_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                            {project.aspiration_finish && new Date(project.aspiration_finish).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </p>
                        <p className="project-owner">
                          <span className="owner-label">Owner:</span> {project.owner_name || 'Unassigned'}
                        </p>
                      </div>
                    )}
                  </div>
                
                <div className="project-timeline" style={{ width: timelineWidth }}>
                  {/* Use InteractiveTimeline in roadmap mode for consistent phase visualization */}
                  <InteractiveTimeline
                    items={convertPhasesToTimelineItems(project)}
                    viewport={viewport}
                    mode="roadmap"
                    height={60}
                    onItemMove={handlePhaseMove}
                    onItemResize={handlePhaseMove}
                    onItemEdit={handlePhaseEdit}
                    showGrid={false} // Grid is handled by the parent timeline
                    showToday={false} // Today line is handled by the parent
                    allowOverlap={false}
                    minItemDuration={1}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent'
                    }}
                  />
                </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Phase Modal */}
      {editingPhase && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Edit Phase Dates</h3>
              <button onClick={() => setEditingPhase(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={editingPhase.startDate}
                  onChange={(e) => setEditingPhase(prev => prev ? { ...prev, startDate: e.target.value } : null)}
                />
              </div>
              
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={editingPhase.endDate}
                  onChange={(e) => setEditingPhase(prev => prev ? { ...prev, endDate: e.target.value } : null)}
                />
              </div>
            </div>
            
            <div className="modal-actions">
              <button onClick={() => setEditingPhase(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={savePhaseEdit} className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
          <div className="modal-container project-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Project Details</h3>
              <button onClick={() => setSelectedProject(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-content">
              <div className="project-detail-section">
                <h4 className="project-detail-title">{selectedProject.name}</h4>
                <div className="project-detail-meta">
                  <span className={`priority-badge priority-${selectedProject.priority <= 1 ? 'high' : selectedProject.priority <= 3 ? 'medium' : 'low'}`}>
                    {selectedProject.priority <= 1 ? 'High' : selectedProject.priority <= 3 ? 'Medium' : 'Low'} Priority
                  </span>
                </div>
              </div>

              <div className="project-detail-grid">
                <div className="project-detail-item">
                  <label>Description</label>
                  <p>{selectedProject.description || 'No description provided'}</p>
                </div>
                
                <div className="project-detail-item">
                  <label>Project Type</label>
                  <p>{selectedProject.project_type_name || 'Unknown'}</p>
                </div>
                
                <div className="project-detail-item">
                  <label>Timeline</label>
                  <p>
                    {selectedProject.aspiration_start && new Date(selectedProject.aspiration_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {selectedProject.aspiration_start && selectedProject.aspiration_finish && ' - '}
                    {selectedProject.aspiration_finish && new Date(selectedProject.aspiration_finish).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                
                <div className="project-detail-item">
                  <label>Project Owner</label>
                  <p>{selectedProject.owner_name || 'Not assigned'}</p>
                </div>

                {selectedProject.phases && selectedProject.phases.length > 0 && (
                  <div className="project-detail-item full-width">
                    <label>Project Phases</label>
                    <div className="phases-list">
                      {selectedProject.phases.map((phase: any) => (
                        <div key={phase.id} className="phase-item">
                          <span className="phase-name">{phase.phase_name}</span>
                          <span className="phase-dates">
                            {new Date(phase.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                            {new Date(phase.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}