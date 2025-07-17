import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Save, X, Plus, GitBranch, Trash2 } from 'lucide-react';
import { api } from '../lib/api-client';
import type { ProjectType, Role, ProjectPhase } from '../types';
import './ProjectTypeDetails.css';

interface ResourceTemplate {
  id?: string;
  role_id: string;
  project_type_id: string;
  phase_id: string;
  allocation_percentage: number;
}

export default function ProjectTypeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProjectType>>({});
  const [localTemplates, setLocalTemplates] = useState<ResourceTemplate[]>([]);
  const [showAddChild, setShowAddChild] = useState(false);
  const [childForm, setChildForm] = useState({ name: '', description: '', color_code: '#6b7280' });

  // Fetch project type details
  const { data: projectType, isLoading: projectTypeLoading, error: projectTypeError } = useQuery({
    queryKey: ['projectType', id],
    queryFn: async () => {
      if (!id) throw new Error('Project Type ID is required');
      const response = await api.projectTypes.get(id);
      return response.data as ProjectType;
    },
    enabled: !!id,
    retry: false, // Don't retry on 404
    refetchOnWindowFocus: false // Don't refetch when window gains focus
  });

  // Fetch roles for resource templates
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list();
      return response.data as Role[];
    }
  });

  // Fetch phases for resource templates
  const { data: phases } = useQuery({
    queryKey: ['phases'],
    queryFn: async () => {
      const response = await api.phases.list();
      // Handle the case where the response might be wrapped in a data property
      const phasesArray = response.data?.data || response.data;
      
      if (!Array.isArray(phasesArray)) {
        console.error('Phases response is not an array:', phasesArray);
        return [];
      }
      
      const sortedPhases = (phasesArray as ProjectPhase[]).sort((a, b) => a.order_index - b.order_index);
      return sortedPhases;
    }
  });

  // Fetch resource templates for this project type
  const { data: resourceTemplates, isLoading: resourceTemplatesLoading } = useQuery({
    queryKey: ['resourceTemplates', 'byProjectType', id],
    queryFn: async () => {
      if (!id) return [];
      const response = await api.resourceTemplates.list({ project_type_id: id });
      return response.data as ResourceTemplate[];
    },
    enabled: !!id && !!projectType && !projectTypeError
  });

  // Fetch child project types
  const { data: childProjectTypes } = useQuery({
    queryKey: ['projectTypeChildren', id],
    queryFn: async () => {
      if (!id) return [];
      const response = await api.projectTypes.getHierarchy();
      const hierarchy = response.data.data as any[];
      
      // Find this project type in the hierarchy and return its children
      const findProjectType = (items: any[]): any => {
        for (const item of items) {
          if (item.id === id) {
            return item;
          }
          if (item.children && item.children.length > 0) {
            const found = findProjectType(item.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      const projectTypeInHierarchy = findProjectType(hierarchy);
      return projectTypeInHierarchy?.children || [];
    },
    enabled: !!id && !!projectType && !projectTypeError
  });

  // Fetch project type phases (including inherited)
  const { data: projectTypePhases } = useQuery({
    queryKey: ['projectTypePhases', id],
    queryFn: async () => {
      if (!id) return [];
      const response = await api.projectTypes.getPhases(id);
      return response.data.data as ProjectPhase[];
    },
    enabled: !!id && !!projectType && !projectTypeError
  });

  // Update local templates when resource templates data changes
  React.useEffect(() => {
    if (resourceTemplates) {
      setLocalTemplates(resourceTemplates);
    }
  }, [resourceTemplates]);

  // Update project type mutation
  const updateProjectTypeMutation = useMutation({
    mutationFn: async (data: Partial<ProjectType>) => {
      if (!id) throw new Error('Project Type ID is required');
      return api.projectTypes.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectType', id] });
      setIsEditing(false);
      setEditForm({});
    }
  });

  // Create child project type mutation
  const createChildMutation = useMutation({
    mutationFn: async (childData: { name: string; description: string; color_code: string }) => {
      if (!id) throw new Error('Parent ID is required');
      return api.projectTypes.createChild(id, childData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTypeChildren', id] });
      queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
      setShowAddChild(false);
      setChildForm({ name: '', description: '', color_code: '#6b7280' });
    }
  });

  // Delete child project type mutation
  const deleteChildMutation = useMutation({
    mutationFn: async (childId: string) => {
      return api.projectTypes.delete(childId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTypeChildren', id] });
      queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
    }
  });

  const handleEdit = () => {
    setIsEditing(true);
    setEditForm({
      name: projectType?.name || '',
      description: projectType?.description || '',
      color_code: projectType?.color_code || ''
    });
  };

  const handleSave = () => {
    updateProjectTypeMutation.mutate(editForm);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const handleAddChild = () => {
    setShowAddChild(true);
  };

  const handleCreateChild = () => {
    if (childForm.name.trim()) {
      createChildMutation.mutate(childForm);
    }
  };

  const handleCancelAddChild = () => {
    setShowAddChild(false);
    setChildForm({ name: '', description: '', color_code: '#6b7280' });
  };

  const handleDeleteChild = (childId: string, childName: string) => {
    if (confirm(`Are you sure you want to delete "${childName}"? This action cannot be undone.`)) {
      deleteChildMutation.mutate(childId);
    }
  };

  // Handler for allocation changes
  const handleAllocationChange = (roleId: string, phaseId: string, newValue: number) => {
    setLocalTemplates(prev => {
      const updated = [...prev];
      const existingIndex = updated.findIndex(
        t => t.role_id === String(roleId) && t.phase_id === String(phaseId)
      );
      
      if (existingIndex >= 0) {
        // Update existing template
        updated[existingIndex] = {
          ...updated[existingIndex],
          allocation_percentage: newValue
        };
      } else {
        // Create new template
        updated.push({
          role_id: roleId,
          project_type_id: id!,
          phase_id: phaseId,
          allocation_percentage: newValue
        });
      }
      
      return updated;
    });
  };

  if (projectTypeLoading) {
    return <div className="loading">Loading project type details...</div>;
  }

  if (projectTypeError || !projectType) {
    return (
      <div className="error-page">
        <h1>Project Type Not Found</h1>
        <p>The project type you're looking for doesn't exist or couldn't be loaded.</p>
        <button className="btn btn-primary" onClick={() => navigate('/project-types')}>
          Back to Project Types
        </button>
      </div>
    );
  }

  return (
    <div className="role-details-page">
      <div className="page-header">
        <div className="header-left">
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/project-types')}
          >
            <ArrowLeft size={16} />
            Back to Project Types
          </button>
          <div>
            <h1>{projectType.name}</h1>
            {projectType.description && <p className="text-muted">{projectType.description}</p>}
          </div>
        </div>
        <div className="header-actions">
          {isEditing ? (
            <>
              <button className="btn btn-secondary" onClick={handleCancel}>
                <X size={16} />
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSave}
                disabled={updateProjectTypeMutation.isPending}
              >
                <Save size={16} />
                Save Changes
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={handleEdit}>
              <Edit2 size={16} />
              Edit Project Type
            </button>
          )}
        </div>
      </div>

      <div className="role-content">
        {/* Project Type Information Section */}
        <section className="role-info-section">
          <h2>Project Type Information</h2>
          {isEditing ? (
            <div className="form-grid">
              <div className="form-group">
                <label>Project Type Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Project type name"
                />
              </div>
              <div className="form-group">
                <label>Color Code</label>
                <input
                  type="color"
                  className="form-input"
                  value={editForm.color_code || '#6b7280'}
                  onChange={(e) => setEditForm({ ...editForm, color_code: e.target.value })}
                />
              </div>
              <div className="form-group span-2">
                <label>Description</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Project type description"
                />
              </div>
            </div>
          ) : (
            <div className="info-grid">
              <div className="info-item">
                <label>Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div 
                    style={{ 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: projectType.color_code || '#6b7280',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb'
                    }}
                  />
                  <span>{projectType.color_code || '#6b7280'}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Project Phases Section (only for parent types) */}
        {!projectType.parent_id && (
          <section className="project-phases-section">
            <div className="section-header">
              <h2>Project Phases</h2>
              <p className="text-muted">
                Define the phases for this project type. These phases will be inherited by all child project types.
              </p>
            </div>
            {projectTypePhases && projectTypePhases.length > 0 ? (
              <div className="phases-grid">
                {projectTypePhases.map((phase: any) => (
                  <div key={phase.id} className="phase-card">
                    <h4>{phase.name}</h4>
                    <p>{phase.description}</p>
                    <div className="phase-meta">
                      <span className="duration">{phase.duration_weeks} weeks</span>
                      <span className="order">Order: {phase.order_index}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No phases defined for this project type</p>
                <p className="text-muted">Add phases to define the workflow structure</p>
              </div>
            )}
          </section>
        )}

        {/* Project Sub-Types Section (only for project types) */}
        {!projectType.parent_id && (
          <section className="project-sub-types-section">
            <div className="section-header">
              <h2>
                <GitBranch size={20} />
                Project Sub-Types
              </h2>
              <p className="text-muted">
                Manage sub-types of this project type. Sub-types inherit phases from their project type.
              </p>
            </div>

          {childProjectTypes && childProjectTypes.length > 0 ? (
            <div className="sub-types-grid">
              {childProjectTypes.map((child: any) => (
                <div key={child.id} className={`sub-type-card ${child.is_default ? 'default-sub-type' : ''}`}>
                  <div className="sub-type-header">
                    <div className="sub-type-info">
                      <div className="sub-type-name">
                        <div 
                          className="sub-type-color"
                          style={{ backgroundColor: child.color_code || '#6b7280' }}
                        />
                        <h4>
                          {child.name}
                          {child.is_default && (
                            <span className="default-badge">Default</span>
                          )}
                        </h4>
                      </div>
                      <p className="sub-type-description">
                        {child.description || 'No description'}
                        {child.is_default && (
                          <span className="read-only-note">
                            (Read-only - modify parent allocations to update)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="sub-type-actions">
                      {!child.is_default && (
                        <>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => navigate(`/project-types/${child.id}`)}
                          >
                            <Edit2 size={14} />
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteChild(child.id, child.name)}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </>
                      )}
                      {child.is_default && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => navigate(`/project-types/${child.id}`)}
                        >
                          <Edit2 size={14} />
                          View
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="sub-type-meta">
                    <span className="level-badge">Level {child.level}</span>
                    <span className="phases-count">
                      {child.phases?.length || 0} phases
                    </span>
                    {child.is_default && (
                      <span className="default-indicator">📌 Default Template</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No child project types defined</p>
            </div>
          )}

          {/* Add Child Form */}
          {showAddChild ? (
            <div className="add-child-form">
              <h3>Add Child Project Type</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={childForm.name}
                    onChange={(e) => setChildForm({ ...childForm, name: e.target.value })}
                    placeholder="Child project type name"
                  />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <input
                    type="color"
                    className="form-input"
                    value={childForm.color_code}
                    onChange={(e) => setChildForm({ ...childForm, color_code: e.target.value })}
                  />
                </div>
                <div className="form-group span-2">
                  <label>Description</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={childForm.description}
                    onChange={(e) => setChildForm({ ...childForm, description: e.target.value })}
                    placeholder="Child project type description"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelAddChild}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleCreateChild}
                  disabled={!childForm.name.trim() || createChildMutation.isPending}
                >
                  Create Child
                </button>
              </div>
            </div>
          ) : (
            <div className="add-child-button">
              <button
                className="btn btn-primary"
                onClick={handleAddChild}
              >
                <Plus size={16} />
                Add Child Project Type
              </button>
            </div>
          )}
          </section>
        )}

        {/* Parent Type Information Section */}
        {projectType.parent_id && (
          <section className="parent-info-section">
            <div className="section-header">
              <h2>Parent Project Type</h2>
              <p className="text-muted">
                This project type inherits phases from its parent. Role allocations are defined at this child level.
              </p>
            </div>
            <div className="parent-info-card">
              <p>Parent: <strong>{projectType.parent_name || 'Unknown'}</strong></p>
              <p>Inherited Phases: {projectTypePhases?.length || 0}</p>
              <p>Inheritance: This project type inherits default role allocations from its parent, which can be overridden as needed.</p>
            </div>
          </section>
        )}

        {/* Resource Templates Section - For both parent and child types */}
        <section className="resource-templates-section">
          <div className="section-header">
            <h2>Role Allocations</h2>
            <p className="text-muted">
              {projectType.parent_id 
                ? projectType.is_default
                  ? "This is a default project type template. Allocations are read-only and automatically sync with the parent project type. To modify allocations, edit the parent project type."
                  : "Define allocation percentages for each role across the inherited project phases. You can override inherited defaults or create new allocations."
                : "Define default allocation percentages for each role across project phases. These defaults will be inherited by child project types."
              }
            </p>
            {projectType.is_default && (
              <div className="read-only-warning">
                <strong>⚠️ Read-Only Template:</strong> This is an automatically managed default template. 
                Changes must be made to the parent project type and will be synchronized here automatically.
              </div>
            )}
          </div>

          {roles && phases && !resourceTemplatesLoading && resourceTemplates !== undefined ? (
            <div className="templates-grid">
              {projectType.parent_id && (
                <div className="inheritance-legend">
                  <span className="legend-item">
                    <span className="legend-color inherited"></span>
                    <span>Inherited from parent</span>
                  </span>
                  <span className="legend-item">
                    <span className="legend-color custom"></span>
                    <span>Custom allocation</span>
                  </span>
                </div>
              )}
              <table className="resource-templates-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '200px' }}>Role</th>
                    {phases?.map(phase => (
                      <th key={phase.id} style={{ minWidth: '120px', textAlign: 'center' }}>
                        {phase.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roles?.map(role => (
                    <tr key={role.id}>
                      <td style={{ verticalAlign: 'top', padding: '12px' }}>
                        <div>
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                            {role.name}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {role.description}
                          </div>
                        </div>
                      </td>
                      {phases?.map(phase => {
                        const template = localTemplates.find(
                          t => String(t.role_id) === String(role.id) && 
                               String(t.phase_id) === String(phase.id)
                        );
                        const allocation = template?.allocation_percentage || 0;
                        
                        return (
                          <td key={`${role.id}-${phase.id}`} style={{ textAlign: 'center', padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                  type="number"
                                  value={allocation}
                                  min="0"
                                  max="100"
                                  step="5"
                                  style={{
                                    width: '60px',
                                    padding: '6px 8px',
                                    border: template?.is_inherited ? '1px solid #93c5fd' : '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    textAlign: 'center',
                                    fontSize: '0.875rem',
                                    backgroundColor: template?.is_inherited ? '#dbeafe' : 'white'
                                  }}
                                  onChange={(e) => {
                                    const newValue = parseFloat(e.target.value) || 0;
                                    handleAllocationChange(
                                      String(role.id),
                                      String(phase.id),
                                      newValue
                                    );
                                  }}
                                />
                                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>%</span>
                              </div>
                              {template?.is_inherited && (
                                <span style={{ 
                                  fontSize: '0.75rem', 
                                  color: '#3b82f6', 
                                  fontWeight: '500',
                                  backgroundColor: '#dbeafe',
                                  padding: '2px 6px',
                                  borderRadius: '8px'
                                }}>
                                  Inherited
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>Loading role allocation configuration...</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}