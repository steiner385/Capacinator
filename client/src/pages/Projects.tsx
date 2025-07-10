import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, Calendar } from 'lucide-react';
import { api } from '../lib/api-client';
import { DataTable, Column } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import ProjectModal from '../components/modals/ProjectModal';
import { useModal } from '../hooks/useModal';
import type { Project, Location, ProjectType } from '../types';
import './Projects.css';

export function Projects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: '',
    location_id: '',
    project_type_id: '',
    status: ''
  });
  
  const addProjectModal = useModal();
  const editProjectModal = useModal();
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Fetch projects
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const params = Object.entries(filters)
        .filter(([_, value]) => value)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      const response = await api.projects.list(params);
      return response.data.data as Project[];
    }
  });

  // Fetch locations for filter
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.locations.list();
      return response.data as Location[];
    }
  });

  // Fetch project types for filter
  const { data: projectTypes } = useQuery({
    queryKey: ['projectTypes'],
    queryFn: async () => {
      const response = await api.projectTypes.list();
      return response.data as ProjectType[];
    }
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await api.projects.delete(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    editProjectModal.open();
  };

  const handleProjectSuccess = () => {
    // Both modals will close automatically via onClose
    setEditingProject(null);
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      location_id: '',
      project_type_id: '',
      status: ''
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'planned': return 'badge badge-primary';
      case 'active': return 'badge badge-success';
      case 'on_hold': return 'badge badge-warning';
      case 'completed': return 'badge badge-secondary';
      case 'cancelled': return 'badge badge-danger';
      default: return 'badge';
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const columns: Column<Project>[] = [
    {
      key: 'name',
      header: 'Project Name',
      sortable: true,
      render: (value, row) => (
        <div className="project-name">
          <span>{value}</span>
          <span className="text-xs text-muted">{row.project_type?.name}</span>
        </div>
      )
    },
    {
      key: 'location.name',
      header: 'Location',
      sortable: true
    },
    {
      key: 'start_date',
      header: 'Start Date',
      sortable: true,
      render: formatDate
    },
    {
      key: 'end_date',
      header: 'End Date',
      sortable: true,
      render: formatDate
    },
    {
      key: 'current_phase',
      header: 'Current Phase',
      render: (value) => value || '-'
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
              navigate(`/projects/${row.id}`);
            }}
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button
            className="btn btn-icon btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditProject(row);
            }}
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            className="btn btn-icon btn-sm btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteProject(row.id, row.name);
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
      placeholder: 'Search projects...'
    },
    {
      name: 'location_id',
      label: 'Location',
      type: 'select' as const,
      options: locations?.map(loc => ({ value: loc.id, label: loc.name })) || []
    },
    {
      name: 'project_type_id',
      label: 'Project Type',
      type: 'select' as const,
      options: projectTypes?.map(type => ({ value: type.id, label: type.name })) || []
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'planned', label: 'Planned' },
        { value: 'active', label: 'Active' },
        { value: 'on_hold', label: 'On Hold' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    }
  ];

  if (projectsLoading) {
    return <LoadingSpinner />;
  }

  if (projectsError) {
    return <ErrorMessage message="Failed to load projects" details={projectsError.message} />;
  }

  return (
    <div className="projects-page">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="text-muted">Manage project timelines and resource allocation</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={addProjectModal.open}
          >
            <Plus size={16} />
            New Project
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/projects/demands')}
          >
            <Calendar size={16} />
            View Demands
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
        data={projects || []}
        columns={columns}
        onRowClick={(row) => navigate(`/projects/${row.id}`)}
        itemsPerPage={20}
      />

      {/* Add Project Modal */}
      <ProjectModal
        isOpen={addProjectModal.isOpen}
        onClose={addProjectModal.close}
        onSuccess={handleProjectSuccess}
      />

      {/* Edit Project Modal */}
      <ProjectModal
        isOpen={editProjectModal.isOpen}
        onClose={() => {
          editProjectModal.close();
          setEditingProject(null);
        }}
        onSuccess={handleProjectSuccess}
        editingProject={editingProject}
      />
    </div>
  );
}