import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, Calendar, AlertTriangle, Lightbulb, CheckCircle, Play, Users, User, TrendingUp } from 'lucide-react';
import { api } from '../lib/api-client';
import { DataTable, Column } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { AssignmentModalNew } from '../components/modals/AssignmentModalNew';
import { TestModal } from '../components/modals/TestModal';
import { useModal } from '../hooks/useModal';
import type { ProjectAssignment, Project, Person, Role } from '../types';
import './Assignments.css';

// RecommendationCard Component
const RecommendationCard = ({ recommendation, onExecute }: { 
  recommendation: any; 
  onExecute: (actions: any) => void; 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'var(--danger)';
      case 'medium': return 'var(--warning)';
      case 'low': return 'var(--success)';
      default: return 'var(--text-tertiary)';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'complex' ? <Users size={16} /> : <User size={16} />;
  };

  const handleExecute = async () => {
    if (isExecuting) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to execute "${recommendation.title}"?\n\n` +
      `This will make ${recommendation.actions.length} changes to assignments. This action cannot be undone.`
    );
    
    if (confirmed) {
      setIsExecuting(true);
      try {
        await onExecute(recommendation.actions);
      } finally {
        setIsExecuting(false);
      }
    }
  };

  return (
    <div className="recommendation-card" style={{
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      backgroundColor: 'var(--bg-primary)',
      marginBottom: '1rem',
      overflow: 'hidden'
    }}>
      {/* Card Header */}
      <div className="recommendation-header" style={{
        padding: '1rem',
        borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
        cursor: 'pointer'
      }} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {getTypeIcon(recommendation.type)}
              <span style={{
                backgroundColor: getPriorityColor(recommendation.priority),
                color: 'white',
                padding: '0.125rem 0.5rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '500',
                textTransform: 'uppercase'
              }}>
                {recommendation.priority}
              </span>
              <span style={{
                backgroundColor: recommendation.type === 'complex' ? 'var(--primary)' : 'var(--success)',
                color: 'white',
                padding: '0.125rem 0.5rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '500',
                textTransform: 'uppercase'
              }}>
                {recommendation.type}
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {recommendation.confidence_score}% confidence
              </span>
            </div>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              {recommendation.title}
            </h4>
            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {recommendation.description}
            </p>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: '500' }}>
              {recommendation.impact_summary}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExecute();
              }}
              disabled={isExecuting}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isExecuting ? 'not-allowed' : 'pointer',
                opacity: isExecuting ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem'
              }}
            >
              {isExecuting ? (
                <>
                  <div className="spinner" style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid transparent',
                    borderTop: '2px solid currentColor',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Executing...
                </>
              ) : (
                <>
                  <Play size={14} />
                  Execute
                </>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              style={{
                padding: '0.5rem',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Eye size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="recommendation-details" style={{ padding: '1rem' }}>
          {/* Actions */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h5 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>Actions ({recommendation.actions.length})</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recommendation.actions.map((action: any, index: number) => (
                <div key={index} style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{
                      backgroundColor: action.type === 'add' ? 'var(--success)' : action.type === 'remove' ? 'var(--danger)' : 'var(--warning)',
                      color: 'white',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.625rem',
                      fontWeight: '500',
                      textTransform: 'uppercase'
                    }}>
                      {action.type}
                    </span>
                    <strong>{action.person_name}</strong>
                    <span>→</span>
                    <span>{action.project_name}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>({action.role_name})</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {action.type === 'modify' ? (
                      <span>{action.current_allocation}% → {action.new_allocation}%</span>
                    ) : action.type === 'add' ? (
                      <span>Add {action.new_allocation}% allocation</span>
                    ) : (
                      <span>Remove {action.current_allocation}% allocation</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                    {action.rationale}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Impact Analysis */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h6 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Current State</h6>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <div>• Overallocated: {recommendation.current_state.overallocated_people}</div>
                <div>• Underutilized: {recommendation.current_state.underutilized_people}</div>
                <div>• Capacity gaps: {recommendation.current_state.capacity_gaps}</div>
              </div>
            </div>
            <div>
              <h6 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Projected State</h6>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <div>• Overallocated: {recommendation.projected_state.overallocated_people}</div>
                <div>• Underutilized: {recommendation.projected_state.underutilized_people}</div>
                <div>• Capacity gaps: {recommendation.projected_state.capacity_gaps}</div>
              </div>
            </div>
          </div>

          {/* Benefits and Risks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <h6 style={{ margin: '0 0 0.5rem 0', color: 'var(--success)' }}>Benefits</h6>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {recommendation.benefits.map((benefit: string, index: number) => (
                  <li key={index}>{benefit}</li>
                ))}
              </ul>
            </div>
            <div>
              <h6 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger)' }}>Risks</h6>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {recommendation.risks.map((risk: string, index: number) => (
                  <li key={index}>{risk}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Effort and Timeline */}
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Effort:</strong> <span style={{ textTransform: 'capitalize' }}>{recommendation.effort_estimate}</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {recommendation.timeline_impact}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Assignments() {
  console.log('Assignments component rendering');
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [contextMessage, setContextMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assignments' | 'recommendations'>('assignments');
  const [filters, setFilters] = useState({
    search: '',
    project_id: '',
    person_id: '',
    role_id: '',
    date_range: ''
  });
  
  // Use state directly instead of useModal hook to avoid re-render issues
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ProjectAssignment | null>(null);

  // Handle contextual messages from URL parameters
  useEffect(() => {
    const action = searchParams.get('action');
    const from = searchParams.get('from');
    const personName = searchParams.get('personName');
    const roleName = searchParams.get('roleName');
    const status = searchParams.get('status');

    if (action && from) {
      let message = '';
      
      if (action === 'assign' && personName) {
        message = `Assign work to ${personName} (${status || 'underutilized'})`;
      } else if (action === 'reduce-load' && personName) {
        message = `Reduce workload for ${personName} (${status || 'overutilized'})`;
      } else if (action === 'hire' && roleName) {
        message = `Consider hiring for ${roleName} role`;
      } else if (action === 'add-resources') {
        message = 'Add resources to address capacity gaps';
      }
      
      if (message) {
        setContextMessage(message);
        // Auto-clear the message after 5 seconds
        setTimeout(() => setContextMessage(null), 5000);
      }
    }
  }, [searchParams]);

  // Fetch assignments
  const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useQuery({
    queryKey: ['assignments', filters],
    queryFn: async () => {
      const params = Object.entries(filters)
        .filter(([_, value]) => value)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      const response = await api.assignments.list(params);
      return response.data.data as ProjectAssignment[];
    }
  });

  // Fetch projects for filter
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.projects.list();
      return response.data.data as Project[];
    }
  });

  // Fetch people for filter
  const { data: people } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const response = await api.people.list();
      return response.data.data as Person[];
    }
  });

  // Fetch roles for filter
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list();
      return response.data as Role[];
    }
  });

  // Fetch recommendations
  const { data: recommendationsData, isLoading: recommendationsLoading, refetch: refetchRecommendations } = useQuery({
    queryKey: ['recommendations', filters],
    queryFn: async () => {
      const params = {
        startDate: filters.date_range ? filters.date_range.split('_')[0] : undefined,
        endDate: filters.date_range ? filters.date_range.split('_')[1] : undefined,
        maxRecommendations: 15
      };
      const response = await api.recommendations.list(params);
      return response.data;
    },
    enabled: activeTab === 'recommendations'
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      await api.assignments.delete(assignmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    }
  });

  const handleDeleteAssignment = (assignmentId: string, assignmentInfo: string) => {
    if (confirm(`Are you sure you want to delete the assignment "${assignmentInfo}"? This action cannot be undone.`)) {
      deleteAssignmentMutation.mutate(assignmentId);
    }
  };

  const handleEditAssignment = (assignment: ProjectAssignment) => {
    setEditingAssignment(assignment);
    editAssignmentModal.open();
  };

  const handleAssignmentSuccess = () => {
    // Both modals will close automatically via onClose
    setEditingAssignment(null);
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      project_id: '',
      person_id: '',
      role_id: '',
      date_range: ''
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage > 100) return 'text-danger';
    if (percentage >= 80) return 'text-warning';
    return 'text-success';
  };

  const getUtilizationIcon = (percentage: number) => {
    if (percentage > 100) return <AlertTriangle size={14} className="text-danger" />;
    return null;
  };

  const columns: Column<ProjectAssignment>[] = [
    {
      key: 'project_name',
      header: 'Project',
      sortable: true,
      render: (value, row) => {
        const startDate = row.computed_start_date || row.start_date;
        const endDate = row.computed_end_date || row.end_date;
        const modeLabel = row.assignment_date_mode === 'phase' ? 'Phase' : 
                         row.assignment_date_mode === 'project' ? 'Project' : 'Fixed';
        
        return (
          <div className="project-info">
            <span className="project-name">{value}</span>
            <span className="text-xs text-muted">
              {formatDate(startDate)} - {formatDate(endDate)}
              <span className="assignment-mode-badge">{modeLabel}</span>
            </span>
          </div>
        );
      }
    },
    {
      key: 'person_name',
      header: 'Person',
      sortable: true
    },
    {
      key: 'role_name',
      header: 'Role',
      sortable: true
    },
    {
      key: 'allocation_percentage',
      header: 'Allocation',
      sortable: true,
      render: (value) => (
        <div className="allocation-cell">
          {getUtilizationIcon(value)}
          <span className={getUtilizationColor(value)}>
            {value}%
          </span>
        </div>
      )
    },
    {
      key: 'start_date',
      header: 'Start Date',
      sortable: true,
      render: (value, row) => formatDate(row.computed_start_date || value)
    },
    {
      key: 'end_date',
      header: 'End Date',
      sortable: true,
      render: (value, row) => formatDate(row.computed_end_date || value)
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (_, row) => {
        const startDate = row.computed_start_date || row.start_date;
        const endDate = row.computed_end_date || row.end_date;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const weeks = Math.round(days / 7);
        return weeks > 0 ? `${weeks}w` : `${days}d`;
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '120px',
      render: (_, row) => (
        <div className="table-actions">
          <button
            className="btn btn-icon btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/assignments/${row.id}`);
            }}
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button
            className="btn btn-icon btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditAssignment(row);
            }}
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            className="btn btn-icon btn-sm btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteAssignment(row.id, `${row.person_name} - ${row.project_name}`);
            }}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const filterConfig = [
    {
      name: 'search',
      label: 'Search',
      type: 'search' as const,
      placeholder: 'Search assignments...'
    },
    {
      name: 'project_id',
      label: 'Project',
      type: 'select' as const,
      options: projects?.map(project => ({ value: project.id, label: project.name })) || []
    },
    {
      name: 'person_id',
      label: 'Person',
      type: 'select' as const,
      options: people?.map(person => ({ value: person.id, label: person.name })) || []
    },
    {
      name: 'role_id',
      label: 'Role',
      type: 'select' as const,
      options: roles?.map(role => ({ value: role.id, label: role.name })) || []
    },
    {
      name: 'date_range',
      label: 'Date Range',
      type: 'select' as const,
      options: [
        { value: 'current', label: 'Current' },
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'past', label: 'Past' },
        { value: 'this_month', label: 'This Month' },
        { value: 'next_month', label: 'Next Month' }
      ]
    }
  ];

  if (assignmentsLoading) {
    return <LoadingSpinner />;
  }

  if (assignmentsError) {
    return <ErrorMessage message="Failed to load assignments" details={assignmentsError.message} />;
  }

  const renderAssignmentsTab = () => (
    <>
      <FilterBar
        filters={filterConfig}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      <DataTable
        data={assignments || []}
        columns={columns}
        onRowClick={(row) => navigate(`/assignments/${row.id}`)}
        itemsPerPage={20}
      />
    </>
  );

  const renderRecommendationsTab = () => {
    if (recommendationsLoading) {
      return <LoadingSpinner />;
    }

    const recommendations = recommendationsData?.recommendations || [];
    const currentState = recommendationsData?.current_state;

    return (
      <div className="recommendations-container">
        {/* Current State Summary */}
        {currentState && (
          <div className="current-state-summary" style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
              <TrendingUp size={20} style={{ marginRight: '0.5rem' }} />
              Current System State
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="state-metric">
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: currentState.summary?.overallocated_people > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {currentState.summary?.overallocated_people || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Overallocated People</div>
              </div>
              <div className="state-metric">
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: currentState.summary?.underutilized_people > 0 ? 'var(--warning)' : 'var(--success)' }}>
                  {currentState.summary?.underutilized_people || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Underutilized People</div>
              </div>
              <div className="state-metric">
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: currentState.summary?.capacity_gaps > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {currentState.summary?.capacity_gaps || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Capacity Gaps</div>
              </div>
              <div className="state-metric">
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  {currentState.summary?.unassigned_projects || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Unassigned Projects</div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations List */}
        {recommendations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Lightbulb size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3>No recommendations available</h3>
            <p>Your team allocation is already optimized, or there are no actionable recommendations at this time.</p>
          </div>
        ) : (
          <div className="recommendations-list">
            {recommendations.map((rec, index) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onExecute={async (actions) => {
                  try {
                    await api.recommendations.execute(rec.id, actions);
                    queryClient.invalidateQueries({ queryKey: ['assignments'] });
                    refetchRecommendations();
                  } catch (error) {
                    console.error('Failed to execute recommendation:', error);
                    alert('Failed to execute recommendation. Please try again.');
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="assignments-page">
      <div className="page-header">
        <div>
          <h1>Assignments</h1>
          <p className="text-muted">Manage project resource assignments and optimization recommendations</p>
          {contextMessage && (
            <div className="context-message">
              <AlertTriangle size={16} />
              {contextMessage}
            </div>
          )}
        </div>
        <div className="header-actions">
          {activeTab === 'assignments' && (
            <>
              <button
                className="btn btn-primary"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus size={16} />
                New Assignment
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/assignments/calendar')}
              >
                <Calendar size={16} />
                Calendar View
              </button>
            </>
          )}
          {activeTab === 'recommendations' && (
            <button
              className="btn btn-secondary"
              onClick={refetchRecommendations}
            >
              <Lightbulb size={16} />
              Refresh Recommendations
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation" style={{
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`tab-button ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'transparent',
              borderBottom: `2px solid ${activeTab === 'assignments' ? 'var(--primary-color)' : 'transparent'}`,
              color: activeTab === 'assignments' ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'assignments' ? '600' : '400',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Users size={16} />
            Assignments ({assignments?.length || 0})
          </button>
          <button
            className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'transparent',
              borderBottom: `2px solid ${activeTab === 'recommendations' ? 'var(--primary-color)' : 'transparent'}`,
              color: activeTab === 'recommendations' ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'recommendations' ? '600' : '400',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Lightbulb size={16} />
            Recommendations {recommendationsData?.recommendations?.length > 0 ? `(${recommendationsData.recommendations.length})` : ''}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'assignments' ? renderAssignmentsTab() : renderRecommendationsTab()}

      {/* Add Assignment Modal */}
      <AssignmentModalNew
        isOpen={isAddModalOpen}
        onClose={() => {
          console.log('Modal close called');
          setIsAddModalOpen(false);
        }}
        onSuccess={handleAssignmentSuccess}
      />

      {/* Edit Assignment Modal */}
      <AssignmentModalNew
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAssignment(null);
        }}
        onSuccess={handleAssignmentSuccess}
        editingAssignment={editingAssignment}
      />
      
      {/* Add spinner animation styles */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}