import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, Calendar, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api-client';
import { DataTable, Column } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import AssignmentModal from '../components/modals/AssignmentModal';
import { useModal } from '../hooks/useModal';
import type { ProjectAssignment, Project, Person, Role } from '../types';
import './Assignments.css';

export default function Assignments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: '',
    project_id: '',
    person_id: '',
    role_id: '',
    date_range: ''
  });
  
  const addAssignmentModal = useModal();
  const editAssignmentModal = useModal();
  const [editingAssignment, setEditingAssignment] = useState<ProjectAssignment | null>(null);

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

  return (
    <div className="assignments-page">
      <div className="page-header">
        <div>
          <h1>Assignments</h1>
          <p className="text-muted">Manage project resource assignments</p>
          {contextMessage && (
            <div className="context-message">
              <AlertTriangle size={16} />
              {contextMessage}
            </div>
          )}
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={addAssignmentModal.open}
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
        </div>
      </div>

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

      {/* Add Assignment Modal */}
      <AssignmentModal
        isOpen={addAssignmentModal.isOpen}
        onClose={addAssignmentModal.close}
        onSuccess={handleAssignmentSuccess}
      />

      {/* Edit Assignment Modal */}
      <AssignmentModal
        isOpen={editAssignmentModal.isOpen}
        onClose={() => {
          editAssignmentModal.close();
          setEditingAssignment(null);
        }}
        onSuccess={handleAssignmentSuccess}
        editingAssignment={editingAssignment}
      />
    </div>
  );
}