import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, Users, UserPlus, Search, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../lib/api-client';
import { DataTable, Column } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import PersonModal from '../components/modals/PersonModal';
import { SmartAssignmentModal } from '../components/modals/SmartAssignmentModal';
import { useModal } from '../hooks/useModal';
import type { Person, Role, Location } from '../types';
import './People.css';

export default function People() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: '',
    primary_role_id: '', // API filter name still uses this for backwards compatibility
    worker_type: '',
    location: ''
  });
  
  const addPersonModal = useModal();
  const editPersonModal = useModal();
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  
  // Smart assignment modal state
  const [smartAssignmentModalOpen, setSmartAssignmentModalOpen] = useState(false);
  const [assignmentPersonId, setAssignmentPersonId] = useState<string | undefined>();
  const [assignmentTriggerContext, setAssignmentTriggerContext] = useState<'workload_action' | 'manual_add' | 'quick_assign'>('quick_assign');
  const [assignmentActionType, setAssignmentActionType] = useState('');

  // Fetch people
  const { data: people, isLoading: peopleLoading, error: peopleError } = useQuery({
    queryKey: ['people', filters],
    queryFn: async () => {
      const params = Object.entries(filters)
        .filter(([_, value]) => value)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      const response = await api.people.list(params);
      return response.data.data as Person[];
    }
  });

  // Fetch utilization data for actionable insights
  const { data: utilizationData } = useQuery({
    queryKey: ['people-utilization'],
    queryFn: async () => {
      const response = await api.people.getUtilization();
      return response.data;
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

  // Fetch locations for filter
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.locations.list();
      return response.data.data as Location[];
    }
  });

  // Delete person mutation
  const deletePersonMutation = useMutation({
    mutationFn: async (personId: string) => {
      await api.people.delete(personId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    }
  });

  const handleDeletePerson = (personId: string, personName: string) => {
    if (confirm(`Are you sure you want to delete "${personName}"? This action cannot be undone.`)) {
      deletePersonMutation.mutate(personId);
    }
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
    editPersonModal.open();
  };

  const handlePersonSuccess = () => {
    // Both modals will close automatically via onClose
    setEditingPerson(null);
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      primary_role_id: '', // API filter name still uses this for backwards compatibility
      worker_type: '',
      location: ''
    });
  };

  const getWorkerTypeBadgeClass = (workerType: string) => {
    switch (workerType) {
      case 'FTE': return 'badge badge-success';
      case 'Contractor': return 'badge badge-warning';
      case 'Consultant': return 'badge badge-primary';
      default: return 'badge';
    }
  };

  const getAvailabilityColor = (availability: number) => {
    if (availability >= 90) return 'text-success';
    if (availability >= 70) return 'text-warning';
    return 'text-danger';
  };

  // Enhanced logic for actionable insights
  const getPersonInsights = (personId: string) => {
    const utilization = utilizationData?.personUtilization?.find(
      (u: any) => u.person_id === personId
    );
    
    if (!utilization) {
      return {
        status: 'unknown',
        color: 'gray',
        icon: Eye,
        action: 'View Details',
        actionType: 'view'
      };
    }
    
    const allocation = utilization.total_allocation;
    const availability = utilization.current_availability_percentage;
    const utilizationPercentage = availability > 0 ? (allocation / availability) * 100 : 0;
    
    if (utilizationPercentage > 100) {
      return {
        status: 'over_allocated',
        color: 'danger',
        icon: AlertTriangle,
        action: 'Reduce Load',
        actionType: 'reduce_workload',
        percentage: utilizationPercentage
      };
    } else if (utilizationPercentage >= 80) {
      return {
        status: 'fully_allocated',
        color: 'warning',
        icon: TrendingUp,
        action: 'Monitor',
        actionType: 'monitor',
        percentage: utilizationPercentage
      };
    } else if (utilizationPercentage >= 40) {
      return {
        status: 'under_allocated',
        color: 'info',
        icon: UserPlus,
        action: 'Assign More',
        actionType: 'assign_more',
        percentage: utilizationPercentage
      };
    } else {
      return {
        status: 'available',
        color: 'success',
        icon: CheckCircle,
        action: 'Assign Project',
        actionType: 'assign_project',
        percentage: utilizationPercentage
      };
    }
  };

  const handleQuickAction = (actionType: string, personId: string) => {
    switch (actionType) {
      case 'reduce_workload':
        navigate(`/assignments?person=${personId}&action=reduce`);
        break;
      case 'assign_more':
      case 'assign_project':
        setAssignmentPersonId(personId);
        setAssignmentTriggerContext('quick_assign');
        setAssignmentActionType(actionType);
        setSmartAssignmentModalOpen(true);
        break;
      case 'monitor':
        navigate(`/reports?type=utilization&person=${personId}`);
        break;
      case 'view':
      default:
        navigate(`/people/${personId}`);
        break;
    }
  };

  // Summary insights for the page header
  const teamInsights = useMemo(() => {
    if (!utilizationData?.personUtilization || !people) {
      return { overAllocated: 0, available: 0, total: people?.length || 0 };
    }
    
    const overAllocated = utilizationData.personUtilization.filter(
      (u: any) => u.allocation_status === 'OVER_ALLOCATED'
    ).length;
    
    const available = utilizationData.personUtilization.filter(
      (u: any) => u.allocation_status === 'UNDER_ALLOCATED' || u.total_allocation < 40
    ).length;
    
    return {
      overAllocated,
      available,
      total: people.length
    };
  }, [utilizationData, people]);

  const columns: Column<Person>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (value, row) => (
        <div className="person-name">
          <Link to={`/people/${row.id}`} className="name">
            {value}
          </Link>
          {row.email && <span className="email text-muted">{row.email}</span>}
        </div>
      )
    },
    {
      key: 'primary_role_name',
      header: 'Primary Role',
      sortable: true
    },
    {
      key: 'worker_type',
      header: 'Type',
      sortable: true,
      render: (value) => (
        <span className={getWorkerTypeBadgeClass(value)}>
          {value}
        </span>
      )
    },
    {
      key: 'location_name',
      header: 'Location',
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'default_availability_percentage',
      header: 'Availability',
      sortable: true,
      render: (value) => (
        <span className={getAvailabilityColor(value)}>
          {value}%
        </span>
      )
    },
    {
      key: 'default_hours_per_day',
      header: 'Hours/Day',
      sortable: true,
      render: (value) => `${value}h`
    },
    {
      key: 'utilization',
      header: 'Workload',
      width: '140px',
      render: (_, row) => {
        const insights = getPersonInsights(row.id);
        const IconComponent = insights.icon;
        
        return (
          <div className="workload-status">
            <div className={`status-indicator status-${insights.color}`}>
              <IconComponent size={14} />
              {insights.percentage !== undefined && (
                <span className="status-percentage">
                  {Math.round(insights.percentage)}%
                </span>
              )}
            </div>
            <span className={`status-label text-${insights.color}`}>
              {insights.status.replace('_', ' ')}
            </span>
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: 'Quick Actions',
      width: '180px',
      render: (_, row) => {
        const insights = getPersonInsights(row.id);
        const ActionIcon = insights.icon;
        
        return (
          <div className="table-actions">
            <button
              className={`btn btn-sm btn-${insights.color} quick-action-btn`}
              onClick={(e) => {
                e.stopPropagation();
                handleQuickAction(insights.actionType, row.id);
              }}
              title={insights.action}
            >
              <ActionIcon size={14} />
              {insights.action}
            </button>
            <button
              className="btn btn-icon btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEditPerson(row);
              }}
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
          </div>
        );
      }
    }
  ];

  const filterConfig = [
    {
      name: 'search',
      label: 'Search',
      type: 'search' as const,
      placeholder: 'Search people...'
    },
    {
      name: 'primary_role_id',
      label: 'Primary Role',
      type: 'select' as const,
      options: roles?.map(role => ({ value: role.id, label: role.name })) || []
    },
    {
      name: 'worker_type',
      label: 'Worker Type',
      type: 'select' as const,
      options: [
        { value: 'FTE', label: 'Full-time Employee' },
        { value: 'Contractor', label: 'Contractor' },
        { value: 'Consultant', label: 'Consultant' }
      ]
    },
    {
      name: 'location',
      label: 'Location',
      type: 'select' as const,
      options: locations?.map(location => ({ value: location.id, label: location.name })) || []
    }
  ];

  if (peopleLoading) {
    return <LoadingSpinner />;
  }

  if (peopleError) {
    return <ErrorMessage message="Failed to load people" details={peopleError.message} />;
  }

  return (
    <div className="people-page">
      <div className="page-header">
        <div>
          <h1>People</h1>
          <p className="text-muted">Manage team members and their roles</p>
          {teamInsights.total > 0 && (
            <div className="team-insights">
              <div className="insight-summary">
                <span className="insight-item text-danger">
                  <AlertTriangle size={16} />
                  {teamInsights.overAllocated} over-allocated
                </span>
                <span className="insight-item text-success">
                  <CheckCircle size={16} />
                  {teamInsights.available} available
                </span>
                <span className="insight-item text-muted">
                  {teamInsights.total} total people
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={addPersonModal.open}
          >
            <Plus size={16} />
            Add Person
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/assignments')}
          >
            <Users size={16} />
            View Assignments
          </button>
        </div>
      </div>

      <FilterBar
        filters={filterConfig}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      <DataTable
        data={people || []}
        columns={columns}
        onRowClick={(row) => navigate(`/people/${row.id}`)}
        itemsPerPage={20}
      />

      {/* Add Person Modal */}
      <PersonModal
        isOpen={addPersonModal.isOpen}
        onClose={addPersonModal.close}
        onSuccess={handlePersonSuccess}
      />

      {/* Edit Person Modal */}
      <PersonModal
        isOpen={editPersonModal.isOpen}
        onClose={() => {
          editPersonModal.close();
          setEditingPerson(null);
        }}
        onSuccess={handlePersonSuccess}
        editingPerson={editingPerson}
      />

      {/* Smart Assignment Modal */}
      <SmartAssignmentModal
        isOpen={smartAssignmentModalOpen}
        onClose={() => {
          setSmartAssignmentModalOpen(false);
          setAssignmentPersonId(undefined);
        }}
        personId={assignmentPersonId || ''}
        triggerContext={assignmentTriggerContext}
        actionType={assignmentActionType}
      />
    </div>
  );
}