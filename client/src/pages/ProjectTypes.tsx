import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Palette } from 'lucide-react';
import { api } from '../lib/api-client';
import { DataTable, Column } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import ProjectTypeModal from '../components/modals/ProjectTypeModal';
import { useModal } from '../hooks/useModal';
import type { ProjectType } from '../types';

export default function ProjectTypes() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: ''
  });
  
  const addProjectTypeModal = useModal();
  const editProjectTypeModal = useModal();
  const [editingProjectType, setEditingProjectType] = useState<ProjectType | null>(null);

  // Fetch project types
  const { data: projectTypes, isLoading: projectTypesLoading, error: projectTypesError } = useQuery({
    queryKey: ['projectTypes', filters],
    queryFn: async () => {
      const params = Object.entries(filters)
        .filter(([_, value]) => value)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      const response = await api.projectTypes.list(params);
      return response.data as ProjectType[];
    }
  });

  // Delete project type mutation
  const deleteProjectTypeMutation = useMutation({
    mutationFn: async (projectTypeId: string) => {
      await api.projectTypes.delete(projectTypeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
      queryClient.invalidateQueries({ queryKey: ['project-types'] });
    }
  });

  const handleDeleteProjectType = (projectTypeId: string, projectTypeName: string) => {
    if (confirm(`Are you sure you want to delete "${projectTypeName}"? This action cannot be undone and may affect existing projects.`)) {
      deleteProjectTypeMutation.mutate(projectTypeId);
    }
  };

  const handleEditProjectType = (projectType: ProjectType) => {
    setEditingProjectType(projectType);
    editProjectTypeModal.open();
  };

  const handleProjectTypeSuccess = () => {
    setEditingProjectType(null);
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: ''
    });
  };

  const columns: Column<ProjectType>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (value, row) => (
        <div className="project-type-name">
          <div 
            className="project-type-color"
            style={{ backgroundColor: row.color_code || '#6b7280' }}
          />
          <span className="name">{value}</span>
        </div>
      )
    },
    {
      key: 'description',
      header: 'Description',
      render: (value) => (
        <span className="text-muted">
          {value || 'No description'}
        </span>
      )
    },
    {
      key: 'color_code',
      header: 'Color',
      render: (value) => (
        <div className="color-display">
          <div 
            className="color-box"
            style={{ backgroundColor: value || '#6b7280' }}
          />
          <span className="color-code">{value || '#6b7280'}</span>
        </div>
      )
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="actions">
          <button
            className="btn btn-icon btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditProjectType(row);
            }}
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            className="btn btn-icon btn-sm btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteProjectType(row.id, row.name);
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
      placeholder: 'Search project types...'
    }
  ];

  if (projectTypesLoading) {
    return <LoadingSpinner />;
  }

  if (projectTypesError) {
    return <ErrorMessage message="Failed to load project types" details={projectTypesError.message} />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h1>Project Types</h1>
          <p className="text-muted">Manage project type definitions and colors</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={addProjectTypeModal.open}
          >
            <Plus size={16} />
            Add Project Type
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
        data={projectTypes || []}
        columns={columns}
        itemsPerPage={20}
      />

      {/* Add Project Type Modal */}
      <ProjectTypeModal
        isOpen={addProjectTypeModal.isOpen}
        onClose={addProjectTypeModal.close}
        onSuccess={handleProjectTypeSuccess}
      />

      {/* Edit Project Type Modal */}
      <ProjectTypeModal
        isOpen={editProjectTypeModal.isOpen}
        onClose={() => {
          editProjectTypeModal.close();
          setEditingProjectType(null);
        }}
        onSuccess={handleProjectTypeSuccess}
        editingProjectType={editingProjectType}
      />
    </div>
  );
}