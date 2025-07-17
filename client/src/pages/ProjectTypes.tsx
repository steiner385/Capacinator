import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Palette, ChevronRight, ChevronDown, List, GitBranch, Eye } from 'lucide-react';
import { api } from '../lib/api-client';
import { DataTable, Column } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import ProjectTypeModal from '../components/modals/ProjectTypeModal';
import { useModal } from '../hooks/useModal';
import type { ProjectType } from '../types';
import './ProjectTypes.css';

export default function ProjectTypes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: ''
  });
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('list');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  const addProjectTypeModal = useModal();
  const editProjectTypeModal = useModal();
  const [editingProjectType, setEditingProjectType] = useState<ProjectType | null>(null);

  // Fetch project types - list or hierarchy based on view mode
  const { data: projectTypes, isLoading: projectTypesLoading, error: projectTypesError } = useQuery({
    queryKey: ['projectTypes', filters, viewMode],
    queryFn: async () => {
      if (viewMode === 'hierarchy') {
        const response = await api.projectTypes.getHierarchy();
        return response.data.data as ProjectType[];
      } else {
        const params = Object.entries(filters)
          .filter(([_, value]) => value)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
        const response = await api.projectTypes.list(params);
        return response.data.data as ProjectType[];
      }
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

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleCreateSubType = (parentId: string) => {
    // TODO: Implement sub-type creation modal
    console.log('Create sub-type for:', parentId);
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

  const ProjectTypeNode = ({ projectType, level = 0 }: { projectType: any; level?: number }) => {
    const hasChildren = projectType.children && projectType.children.length > 0;
    const isExpanded = expandedNodes.has(projectType.id);
    const indent = level * 20;
    const isParentType = level === 0;
    const isSubType = level > 0;

    return (
      <div className="project-type-node">
        <div 
          className={`project-type-row ${isParentType ? 'parent-type' : 'sub-type'}`}
          style={{ paddingLeft: `${indent}px` }}
        >
          <div className="project-type-content">
            {hasChildren && (
              <button
                className="btn btn-icon btn-sm expand-toggle"
                onClick={() => toggleNode(projectType.id)}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
            {!hasChildren && <div className="expand-spacer" />}
            
            <div className="project-type-info">
              <div className="project-type-name">
                <div 
                  className="project-type-color"
                  style={{ backgroundColor: projectType.color_code || '#6b7280' }}
                />
                <span className="name">{projectType.name}</span>
                {isParentType && <span className="parent-badge">Project Type</span>}
                {isSubType && <span className="sub-type-badge">Project Sub-Type</span>}
              </div>
              <div className="project-type-meta">
                <span className="description">{projectType.description || 'No description'}</span>
                {hasChildren && <span className="level-badge">{projectType.children.length} sub-types</span>}
              </div>
            </div>
          </div>
          
          <div className="project-type-actions">
            {projectType.is_parent && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => handleCreateSubType(projectType.id)}
                title="Add Project Sub-Type"
              >
                <Plus size={14} />
                Sub-Type
              </button>
            )}
            <button
              className="btn btn-icon btn-sm"
              onClick={() => navigate(`/project-types/${projectType.id}`)}
              title="View Details"
            >
              <Eye size={16} />
            </button>
            <button
              className="btn btn-icon btn-sm"
              onClick={() => handleEditProjectType(projectType)}
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button
              className="btn btn-icon btn-sm btn-danger"
              onClick={() => handleDeleteProjectType(projectType.id, projectType.name)}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="project-type-children">
            {projectType.children.map((child: any) => (
              <ProjectTypeNode
                key={child.id}
                projectType={child}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

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
          <div className="view-mode-toggle">
            <button
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
              List
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'hierarchy' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('hierarchy')}
            >
              <GitBranch size={16} />
              Hierarchy
            </button>
          </div>
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

      {viewMode === 'hierarchy' ? (
        <div className="hierarchy-view">
          {projectTypes && projectTypes.length > 0 ? (
            <div className="project-types-hierarchy">
              {projectTypes.map((projectType: any) => (
                <ProjectTypeNode key={projectType.id} projectType={projectType} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No project types found</p>
            </div>
          )}
        </div>
      ) : (
        <DataTable
          data={projectTypes || []}
          columns={columns}
          itemsPerPage={20}
          onRowClick={(projectType) => navigate(`/project-types/${projectType.id}`)}
        />
      )}

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