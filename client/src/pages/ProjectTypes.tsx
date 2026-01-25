import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, List, GitBranch, Eye } from 'lucide-react';
import { api } from '../lib/api-client';
import { queryKeys } from '../lib/queryKeys';
import { DataTable, Column } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import ProjectTypeModal from '../components/modals/ProjectTypeModal';
import { useModal } from '../hooks/useModal';
import { useBookmarkableTabs } from '../hooks/useBookmarkableTabs';
import type { ProjectType } from '../types';
import './ProjectTypes.css';

// Define project types view tabs configuration
const projectTypesViewTabs = [
  { id: 'list', label: 'List' },
  { id: 'hierarchy', label: 'Hierarchy' }
];

export default function ProjectTypes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: ''
  });
  
  // Use bookmarkable tabs for view mode selection
  const { activeTab, setActiveTab, isActiveTab } = useBookmarkableTabs({
    tabs: projectTypesViewTabs,
    defaultTab: 'list',
    paramName: 'view'
  });
  const viewMode = activeTab as 'list' | 'hierarchy';
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  const addProjectTypeModal = useModal();
  const editProjectTypeModal = useModal();
  const [editingProjectType, setEditingProjectType] = useState<ProjectType | null>(null);

  // Fetch project types - list or hierarchy based on view mode
  const { data: projectTypes, isLoading: projectTypesLoading, error: projectTypesError } = useQuery({
    queryKey: queryKeys.projectTypes.list(filters, viewMode),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.projectTypes.all });
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
      header: 'Project Type',
      sortable: true,
      render: (value, row) => (
        <div className="project-type-name">
          <div 
            className="project-type-color"
            style={{ backgroundColor: row.color_code || '#6b7280' }}
          />
          <div>
            <span className="name">{value}</span>
            {row.description && (
              <span className="description text-muted">{row.description}</span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'projects_count',
      header: 'Projects',
      sortable: true,
      render: (value) => (
        <span className="count-badge">
          {value || 0} project{(value || 0) !== 1 ? 's' : ''}
        </span>
      )
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '140px',
      render: (_, row) => (
        <div className="table-actions">
          <button
            className="btn btn-icon btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/project-types/${row.id}`);
            }}
            title="View Details"
          >
            <Eye size={16} />
          </button>
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

  const ProjectTypeNode = ({ projectType, level = 0 }: { projectType: ProjectType & { children?: ProjectType[]; is_parent?: boolean }; level?: number }) => {
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
            {projectType.children.map((child: ProjectType & { children?: ProjectType[]; is_parent?: boolean }) => (
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
            {projectTypesViewTabs.map((tab) => (
              <button
                key={tab.id}
                className={`btn btn-sm ${isActiveTab(tab.id) ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.id === 'list' && <List size={16} />}
                {tab.id === 'hierarchy' && <GitBranch size={16} />}
                {tab.label}
              </button>
            ))}
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
              {projectTypes.map((projectType: ProjectType & { children?: ProjectType[]; is_parent?: boolean }) => (
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