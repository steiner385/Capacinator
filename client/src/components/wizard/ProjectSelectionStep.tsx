import React, { useState, useEffect } from 'react';
import { useWizard, WizardProject } from '../../contexts/WizardContext';
import { useThemeColors } from '../../lib/theme-colors';
import { Calendar, Users, CheckCircle, Circle, CheckSquare, Square } from 'lucide-react';

export function ProjectSelectionStep() {
  const { state, setProjects } = useWizard();
  const colors = useThemeColors();
  const [availableProjects, setAvailableProjects] = useState<WizardProject[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Mock data - in reality this would come from an API
    const mockProjects: WizardProject[] = [
      {
        id: '1',
        name: 'Mobile App Redesign',
        timeline: { start: '2025-08-01', end: '2025-12-31' },
        requiredRoles: [
          { roleId: 'r1', roleName: 'UI/UX Designer', count: 2, priority: 'high' },
          { roleId: 'r2', roleName: 'Frontend Developer', count: 3, priority: 'high' },
          { roleId: 'r3', roleName: 'Mobile Developer', count: 2, priority: 'medium' },
        ],
        currentAllocations: [
          { personId: 'p1', personName: 'John Doe', roleId: 'r2', allocation: 40 },
        ]
      },
      {
        id: '2',
        name: 'E-commerce Platform',
        timeline: { start: '2025-09-01', end: '2026-03-31' },
        requiredRoles: [
          { roleId: 'r2', roleName: 'Frontend Developer', count: 4, priority: 'high' },
          { roleId: 'r4', roleName: 'Backend Developer', count: 3, priority: 'high' },
          { roleId: 'r5', roleName: 'DevOps Engineer', count: 1, priority: 'medium' },
        ],
        currentAllocations: [
          { personId: 'p2', personName: 'Jane Smith', roleId: 'r4', allocation: 40 },
          { personId: 'p3', personName: 'Mike Johnson', roleId: 'r4', allocation: 30 },
        ]
      },
      {
        id: '3',
        name: 'Data Analytics Dashboard',
        timeline: { start: '2025-08-15', end: '2025-11-30' },
        requiredRoles: [
          { roleId: 'r6', roleName: 'Data Analyst', count: 2, priority: 'high' },
          { roleId: 'r2', roleName: 'Frontend Developer', count: 2, priority: 'medium' },
          { roleId: 'r7', roleName: 'Data Engineer', count: 1, priority: 'medium' },
        ],
        currentAllocations: []
      },
      {
        id: '4',
        name: 'API Modernization',
        timeline: { start: '2025-10-01', end: '2026-02-28' },
        requiredRoles: [
          { roleId: 'r4', roleName: 'Backend Developer', count: 3, priority: 'high' },
          { roleId: 'r8', roleName: 'Solutions Architect', count: 1, priority: 'high' },
          { roleId: 'r5', roleName: 'DevOps Engineer', count: 1, priority: 'medium' },
        ],
        currentAllocations: [
          { personId: 'p4', personName: 'Sarah Wilson', roleId: 'r8', allocation: 20 },
        ]
      }
    ];

    setAvailableProjects(mockProjects);
    
    // Pre-select projects that were already selected
    const preSelected = new Set(state.selectedProjects.map(p => p.id));
    setSelectedProjectIds(preSelected);
  }, [state.selectedProjects]);

  const toggleProject = (project: WizardProject) => {
    const newSelection = new Set(selectedProjectIds);
    
    if (newSelection.has(project.id)) {
      newSelection.delete(project.id);
    } else {
      newSelection.add(project.id);
    }
    
    setSelectedProjectIds(newSelection);
    
    // Update wizard state
    const selectedProjects = availableProjects.filter(p => newSelection.has(p.id));
    setProjects(selectedProjects);
  };

  const isSelected = (projectId: string) => selectedProjectIds.has(projectId);

  const getProjectStats = (project: WizardProject) => {
    const totalRequired = project.requiredRoles.reduce((sum, role) => sum + role.count, 0);
    const totalAllocated = project.currentAllocations.length;
    const gap = totalRequired - totalAllocated;
    
    return { totalRequired, totalAllocated, gap };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return colors.status.overdue;
      case 'medium': return colors.status.pending;
      case 'low': return colors.status.complete;
      default: return colors.utility.gray;
    }
  };

  const getTotalGaps = () => {
    return availableProjects
      .filter(p => selectedProjectIds.has(p.id))
      .reduce((total, project) => {
        const stats = getProjectStats(project);
        return total + stats.gap;
      }, 0);
  };

  const selectAll = () => {
    const allProjectIds = new Set(availableProjects.map(p => p.id));
    setSelectedProjectIds(allProjectIds);
    setProjects(availableProjects);
  };

  const deselectAll = () => {
    setSelectedProjectIds(new Set());
    setProjects([]);
  };

  const isAllSelected = availableProjects.length > 0 && selectedProjectIds.size === availableProjects.length;
  const isPartiallySelected = selectedProjectIds.size > 0 && selectedProjectIds.size < availableProjects.length;

  return (
    <div className="wizard-step">
      <h2>Select Projects</h2>
      <p className="wizard-step-description">
        Choose the projects that need resource allocation. We'll analyze each project's 
        requirements and current staffing to identify gaps.
      </p>

      <div className="wizard-stats">
        <div className="wizard-stat">
          <div className="wizard-stat-value">{selectedProjectIds.size}</div>
          <div className="wizard-stat-label">Projects Selected</div>
        </div>
        <div className="wizard-stat">
          <div className="wizard-stat-value">{getTotalGaps()}</div>
          <div className="wizard-stat-label">Total Resource Gaps</div>
        </div>
      </div>

      <div className="wizard-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Available Projects</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={isAllSelected ? deselectAll : selectAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                border: `1px solid ${colors.utility.border}`,
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: colors.utility.text,
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.lightGray;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {isAllSelected ? (
                <CheckSquare size={16} color={colors.status.complete} />
              ) : isPartiallySelected ? (
                <Square size={16} color={colors.status.pending} style={{ opacity: 0.7 }} />
              ) : (
                <Square size={16} />
              )}
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </button>
            <span style={{ 
              fontSize: '0.875rem', 
              color: colors.utility.gray 
            }}>
              {selectedProjectIds.size} of {availableProjects.length} selected
            </span>
          </div>
        </div>
        <div className="wizard-list">
          {availableProjects.map((project) => {
            const stats = getProjectStats(project);
            const selected = isSelected(project.id);
            
            return (
              <div
                key={project.id}
                className={`wizard-item ${selected ? 'selected' : ''}`}
                onClick={() => toggleProject(project)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}
              >
                <div className="wizard-item-checkbox" style={{ paddingTop: '0.25rem' }}>
                  <div className={`wizard-checkbox ${selected ? 'checked' : ''}`}>
                    {selected ? <CheckCircle size={20} /> : <Circle size={20} />}
                  </div>
                </div>
                <div className="wizard-item-content" style={{ flex: 1 }}>
                  <div className="wizard-item-title">{project.name}</div>
                  <div className="wizard-item-details">
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={14} />
                        {formatDate(project.timeline.start)} - {formatDate(project.timeline.end)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Users size={14} />
                        {stats.totalAllocated}/{stats.totalRequired} people assigned
                      </span>
                      {stats.gap > 0 && (
                        <span style={{ 
                          color: colors.status.overdue, 
                          fontWeight: 500 
                        }}>
                          {stats.gap} gaps
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {project.requiredRoles.map((role, index) => {
                        const allocated = project.currentAllocations
                          .filter(a => a.roleId === role.roleId)
                          .reduce((sum, a) => sum + a.allocation, 0);
                        const roleGap = role.count - (allocated / 40); // assuming 40 hours = 1 person
                        
                        return (
                          <span
                            key={index}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                              backgroundColor: roleGap > 0 ? 'var(--danger-bg)' : 'var(--success-bg)',
                              color: roleGap > 0 ? colors.status.overdue : colors.status.complete,
                              borderRadius: '4px',
                              border: `1px solid ${roleGap > 0 ? colors.status.overdue : colors.status.complete}20`
                            }}
                          >
                            {role.roleName} ({Math.ceil(roleGap)} needed)
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedProjectIds.size === 0 && (
        <div style={{ 
          textAlign: 'center', 
          color: colors.utility.gray, 
          fontStyle: 'italic',
          padding: '2rem'
        }}>
          Select one or more projects to continue
        </div>
      )}
    </div>
  );
}