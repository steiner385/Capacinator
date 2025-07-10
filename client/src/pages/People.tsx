import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, Users } from 'lucide-react';
import { api } from '../lib/api-client';
import { DataTable, Column } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import PersonModal from '../components/modals/PersonModal';
import { useModal } from '../hooks/useModal';
import type { Person, Role, Location } from '../types';
import './People.css';

export default function People() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: '',
    primary_role_id: '',
    worker_type: '',
    location: ''
  });
  
  const addPersonModal = useModal();
  const editPersonModal = useModal();
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

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

  // Fetch roles for filter
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list();
      return response.data as Role[];
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
      primary_role_id: '',
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
      key: 'supervisor_name',
      header: 'Supervisor',
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
      key: 'is_bubble',
      header: 'Bubble',
      render: (value) => value ? '🟡' : ''
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
              navigate(`/people/${row.id}`);
            }}
            title="View Details"
          >
            <Eye size={16} />
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
          <button
            className="btn btn-icon btn-sm btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDeletePerson(row.id, row.name);
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
    </div>
  );
}