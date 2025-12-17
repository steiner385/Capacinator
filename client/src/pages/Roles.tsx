import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, Users, Settings } from 'lucide-react';
import { api } from '../lib/api-client';
import { queryKeys } from '../lib/queryKeys';
import { DataTable, Column } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import type { Role } from '../types';
import './Roles.css';

export default function Roles() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: '',
    has_planners: '',
    has_people: ''
  });

  // Fetch roles
  const { data: roles, isLoading: rolesLoading, error: rolesError } = useQuery({
    queryKey: queryKeys.roles.list(filters),
    queryFn: async () => {
      const params = Object.entries(filters)
        .filter(([_, value]) => value)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      const response = await api.roles.list(params);
      // Handle nested response structure: response.data.data
      const rolesData = response.data?.data || response.data || [];
      return Array.isArray(rolesData) ? rolesData : [];
    }
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      await api.roles.delete(roleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    }
  });

  const handleDeleteRole = (roleId: string, roleName: string) => {
    if (confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      has_planners: '',
      has_people: ''
    });
  };

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: 'Role Name',
      sortable: true,
      render: (value, row) => (
        <div className="role-name">
          <span className="name">{value}</span>
          {row.description && <span className="description text-muted">{row.description}</span>}
        </div>
      )
    },
    {
      key: 'external_id',
      header: 'External ID',
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'people_count',
      header: 'People',
      sortable: true,
      render: (value) => (
        <div className="count-badge">
          <Users size={14} />
          <span>{value || 0}</span>
        </div>
      )
    },
    {
      key: 'planners_count',
      header: 'Planners',
      sortable: true,
      render: (value) => (
        <div className="count-badge">
          <Settings size={14} />
          <span>{value || 0}</span>
        </div>
      )
    },
    {
      key: 'standard_allocations_count',
      header: 'Allocations',
      sortable: true,
      render: (value) => value || 0
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
              navigate(`/roles/${row.id}`);
            }}
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button
            className="btn btn-icon btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/roles/${row.id}/edit`);
            }}
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            className="btn btn-icon btn-sm btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteRole(row.id, row.name);
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
      placeholder: 'Search roles...'
    },
    {
      name: 'has_planners',
      label: 'Has Planners',
      type: 'select' as const,
      options: [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' }
      ]
    },
    {
      name: 'has_people',
      label: 'Has People',
      type: 'select' as const,
      options: [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' }
      ]
    }
  ];

  if (rolesLoading) {
    return <LoadingSpinner />;
  }

  if (rolesError) {
    return <ErrorMessage message="Failed to load roles" details={rolesError.message} />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Roles</h1>
          <p className="text-muted">Manage roles and their configurations</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => navigate('/roles/new')}
          >
            <Plus size={16} />
            Add Role
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
        data={roles || []}
        columns={columns}
        onRowClick={(row) => navigate(`/roles/${row.id}`)}
        itemsPerPage={20}
      />
    </div>
  );
}