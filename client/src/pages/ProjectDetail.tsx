import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Edit2, Save, X, Calendar, Users, Briefcase, Clock, 
  MapPin, Target, ChevronDown, ChevronUp, Plus, Trash2
} from 'lucide-react';
import { api } from '../lib/api-client';
import { formatDate } from '../utils/date';
import { ProjectDemandChart } from '../components/ProjectDemandChart';
import { getProjectTypeIndicatorStyle } from '../lib/project-colors';
import PhaseTimeline from '../components/PhaseTimeline';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import type { Project } from '../types';
import './PersonDetails.css'; // Reuse existing styles
import '../components/Charts.css';

interface ProjectDetail {
  id: string;
  name: string;
  project_type_id?: string;
  project_type_name?: string;
  project_type?: {
    id: string;
    name: string;
    color_code?: string;
  };
  location_id?: string;
  location_name?: string;
  priority: number;
  description?: string | null;
  data_restrictions?: string | null;
  include_in_demand: number;
  aspiration_start?: string | null;
  aspiration_finish?: string | null;
  external_id?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  created_at: number;
  updated_at: number;
  phases: Array<{
    id: string;
    project_id: string;
    phase_id: string;
    phase_name: string;
    phase_description: string;
    start_date: number;
    end_date: number;
    created_at: number;
    updated_at: number;
  }>;
  assignments: Array<{
    id: string;
    project_id: string;
    person_id: string;
    person_name: string;
    role_id: string;
    role_name: string;
    phase_id?: string | null;
    start_date: number;
    end_date: number;
    allocation_percentage: number;
    created_at: number;
    updated_at: number;
  }>;
  planners: Array<any>;
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    phases: true,
    demand: true,
    assignments: true,
    history: false
  });

  // Assignment modal state
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isEditingAssignment, setIsEditingAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    allocation_percentage: 0,
    start_date: '',
    end_date: ''
  });

  // Check user permissions
  const canEdit = localStorage.getItem('userRole') !== 'viewer';
  const canDelete = localStorage.getItem('userRole') === 'admin';

  // Fetch project details
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const response = await api.projects.get(id!);
      return response.data as ProjectDetail;
    },
    enabled: !!id
  });

  // Fetch project types for dropdown
  const { data: projectTypes } = useQuery({
    queryKey: ['project-types'],
    queryFn: async () => {
      const response = await api.projectTypes.list();
      return response.data.data || response.data;
    }
  });

  // Fetch locations for dropdown
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.locations.list();
      return response.data.data;
    }
  });

  // Individual field update mutations
  const updateProjectFieldMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const response = await api.projects.update(id!, { [field]: value });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    }
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      await api.assignments.delete(assignmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    }
  });

  // Update assignment mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ assignmentId, updates }: { assignmentId: string; updates: any }) => {
      const response = await api.assignments.update(assignmentId, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setSelectedAssignment(null);
      setIsEditingAssignment(false);
    }
  });

  // Handle individual field updates
  const handleFieldUpdate = (field: string, value: any) => {
    updateProjectFieldMutation.mutate({ field, value });
  };

  // Handle assignment card click
  const handleAssignmentClick = (assignment: any) => {
    setSelectedAssignment(assignment);
    setAssignmentForm({
      allocation_percentage: assignment.allocation_percentage,
      start_date: new Date(assignment.start_date).toISOString().split('T')[0],
      end_date: new Date(assignment.end_date).toISOString().split('T')[0]
    });
  };

  // Handle assignment form submission
  const handleAssignmentSubmit = () => {
    if (!selectedAssignment) return;
    
    updateAssignmentMutation.mutate({
      assignmentId: selectedAssignment.id,
      updates: {
        allocation_percentage: parseInt(assignmentForm.allocation_percentage.toString()),
        start_date: new Date(assignmentForm.start_date).getTime(),
        end_date: new Date(assignmentForm.end_date).getTime()
      }
    });
  };

  // Handle assignment deletion
  const handleAssignmentDelete = () => {
    if (!selectedAssignment) return;
    
    if (confirm('Are you sure you want to delete this assignment?')) {
      deleteAssignmentMutation.mutate(selectedAssignment.id);
      setSelectedAssignment(null);
    }
  };

  // Inline editing component
  const InlineEdit = ({ 
    field, 
    value, 
    type = 'text', 
    options = [], 
    placeholder = '',
    icon = null
  }: {
    field: string;
    value: any;
    type?: 'text' | 'email' | 'tel' | 'number' | 'select' | 'checkbox' | 'textarea';
    options?: Array<{ value: any; label: string }>;
    placeholder?: string;
    icon?: any;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);

    const handleSave = () => {
      if (editValue !== value) {
        if (type === 'number') {
          handleFieldUpdate(field, parseInt(editValue));
        } else if (type === 'checkbox') {
          handleFieldUpdate(field, editValue ? 1 : 0);
        } else {
          handleFieldUpdate(field, editValue);
        }
      }
      setIsEditing(false);
    };

    const handleCancel = () => {
      setEditValue(value);
      setIsEditing(false);
    };

    if (isEditing) {
      return (
        <div className="inline-edit-container">
          {type === 'select' ? (
            <select
              value={editValue || ''}
              onChange={(e) => setEditValue(e.target.value)}
              className="form-select"
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
              autoFocus
            >
              <option value="">{placeholder || 'Select...'}</option>
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : type === 'checkbox' ? (
            <input
              type="checkbox"
              checked={editValue}
              onChange={(e) => setEditValue(e.target.checked)}
              className="form-checkbox"
              onBlur={handleSave}
              autoFocus
            />
          ) : type === 'textarea' ? (
            <textarea
              value={editValue || ''}
              onChange={(e) => setEditValue(e.target.value)}
              className="form-textarea"
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
              placeholder={placeholder}
              rows={3}
              autoFocus
            />
          ) : (
            <input
              type={type}
              value={editValue || ''}
              onChange={(e) => setEditValue(e.target.value)}
              className="form-input"
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
              placeholder={placeholder}
              autoFocus
            />
          )}
        </div>
      );
    }

    // For display, show the label if it's a select, otherwise show the value
    let displayValue;
    if (type === 'select') {
      displayValue = options.find(opt => opt.value === value)?.label || placeholder || 'Not specified';
    } else if (type === 'checkbox') {
      displayValue = (
        <span className={`badge ${value ? 'badge-success' : 'badge-gray'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    } else {
      displayValue = value || placeholder || 'Not specified';
    }

    return (
      <div className="info-value inline-editable" onClick={() => canEdit && setIsEditing(true)}>
        {icon && React.createElement(icon, { size: 16 })}
        <span>{displayValue}</span>
        {canEdit && <Edit2 size={14} className="edit-icon" />}
      </div>
    );
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'red';
      case 2: return 'orange';
      case 3: return 'yellow';
      case 4: return 'green';
      default: return 'gray';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Critical';
      case 2: return 'High';
      case 3: return 'Medium';
      case 4: return 'Low';
      default: return 'Unknown';
    }
  };

  if (isLoading) return <div className="loading">Loading project details...</div>;
  if (error || !project) return <div className="error">Failed to load project details</div>;

  return (
    <div className="page-container person-details">
      <div className="page-header">
        <div className="header-left">
          <button className="btn btn-icon" onClick={() => navigate('/projects')}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              backgroundColor: project.project_type?.color_code || '#6b7280',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              marginRight: '12px',
              flexShrink: 0
            }} />
            {project.name}
          </h1>
          <span className={`badge badge-${getPriorityColor(project.priority)}`}>
            {getPriorityLabel(project.priority)}
          </span>
        </div>
      </div>

      <div className="person-details-content">
        {/* Basic Information Section */}
        <div className="detail-section">
          <div className="section-header" onClick={() => toggleSection('basic')}>
            <h2>
              <Target size={20} />
              Project Information
            </h2>
            {expandedSections.basic ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          
          {expandedSections.basic && (
            <div className="section-content">
              <div className="info-grid">
                <div className="info-item">
                  <label>Project Type</label>
                  <InlineEdit
                    field="project_type_id"
                    value={project.project_type_id}
                    type="select"
                    options={Array.isArray(projectTypes) ? projectTypes.map((type: any) => ({
                      value: type.id,
                      label: type.name
                    })) : []}
                    placeholder="Select project type"
                  />
                </div>

                <div className="info-item">
                  <label>Location</label>
                  <InlineEdit
                    field="location_id"
                    value={project.location_id}
                    type="select"
                    options={Array.isArray(locations) ? locations.map((loc: any) => ({
                      value: loc.id,
                      label: loc.name
                    })) : []}
                    placeholder="Select location"
                    icon={MapPin}
                  />
                </div>

                <div className="info-item">
                  <label>Priority</label>
                  <InlineEdit
                    field="priority"
                    value={project.priority}
                    type="select"
                    options={[
                      { value: 1, label: 'Critical' },
                      { value: 2, label: 'High' },
                      { value: 3, label: 'Medium' },
                      { value: 4, label: 'Low' }
                    ]}
                    placeholder="Select priority"
                  />
                </div>

                <div className="info-item">
                  <label>Owner</label>
                  <div className="info-value">{project.owner_name || 'Not assigned'}</div>
                </div>

                <div className="info-item">
                  <label>External ID</label>
                  <InlineEdit
                    field="external_id"
                    value={project.external_id}
                    placeholder="Enter external ID"
                  />
                </div>

                <div className="info-item">
                  <label>Include in Demand</label>
                  <InlineEdit
                    field="include_in_demand"
                    value={project.include_in_demand === 1}
                    type="checkbox"
                  />
                </div>

                <div className="info-item info-item-full">
                  <label>Description</label>
                  <InlineEdit
                    field="description"
                    value={project.description}
                    type="textarea"
                    placeholder="Enter project description"
                  />
                </div>

                <div className="info-item info-item-full">
                  <label>Data Restrictions</label>
                  <InlineEdit
                    field="data_restrictions"
                    value={project.data_restrictions}
                    type="textarea"
                    placeholder="Enter data restrictions"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Project Phases Section */}
        <div className="detail-section">
          <div className="section-header" onClick={() => toggleSection('phases')}>
            <h2>
              <Calendar size={20} />
              Project Timeline
            </h2>
            {expandedSections.phases ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          
          {expandedSections.phases && (
            <div className="section-content">
              <PhaseTimeline projectId={project.id} projectName={project.name} />
            </div>
          )}
        </div>

        {/* Resource Demand Section */}
        <div className="detail-section">
          <div className="section-header" onClick={() => toggleSection('demand')}>
            <h2>
              <Briefcase size={20} />
              Resource Demand
            </h2>
            {expandedSections.demand ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          
          {expandedSections.demand && (
            <div className="section-content">
              <ProjectDemandChart projectId={project.id} projectName={project.name} />
            </div>
          )}
        </div>

        {/* Current Assignments Section */}
        <div className="detail-section">
          <div className="section-header" onClick={() => toggleSection('assignments')}>
            <h2>
              <Users size={20} />
              Team Assignments
            </h2>
            {expandedSections.assignments ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          
          {expandedSections.assignments && (
            <div className="section-content">
              {project.assignments && project.assignments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Allocation</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      {canEdit && <TableHead className="text-right text-muted-foreground">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.assignments.map((assignment) => (
                      <TableRow
                        key={assignment.id}
                        onClick={() => handleAssignmentClick(assignment)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <TableCell>
                          <Link 
                            to={`/people/${assignment.person_id}`} 
                            className="text-primary hover:text-primary/80"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {assignment.person_name}
                          </Link>
                        </TableCell>
                        <TableCell>{assignment.role_name}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">{assignment.allocation_percentage}%</span>
                        </TableCell>
                        <TableCell>{formatDate(new Date(assignment.start_date).toISOString())}</TableCell>
                        <TableCell>{formatDate(new Date(assignment.end_date).toISOString())}</TableCell>
                        {canEdit && (
                          <TableCell className="text-right text-muted-foreground">
                            <button
                              className="inline-flex items-center justify-center rounded-md p-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAssignmentMutation.mutate(assignment.id);
                              }}
                              title="Delete assignment"
                            >
                              <Trash2 size={16} />
                            </button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="empty-state">
                  <Users size={48} />
                  <p>No team assignments</p>
                  <Link to="/assignments" className="btn btn-primary">
                    <Plus size={16} />
                    Add Assignment
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* History Section */}
        <div className="detail-section">
          <div className="section-header" onClick={() => toggleSection('history')}>
            <h2>
              <Clock size={20} />
              History
            </h2>
            {expandedSections.history ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          
          {expandedSections.history && (
            <div className="section-content">
              <div className="history-timeline">
                <div className="timeline-item">
                  <div className="timeline-date">{formatDate(new Date(project.created_at).toISOString())}</div>
                  <div className="timeline-content">
                    <strong>Project created</strong>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-date">{formatDate(new Date(project.updated_at).toISOString())}</div>
                  <div className="timeline-content">
                    <strong>Last updated</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Assignment Modal */}
        {selectedAssignment && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">
                  {isEditingAssignment ? 'Edit Assignment' : 'Assignment Details'}
                </h3>
                <button
                  onClick={() => {
                    setSelectedAssignment(null);
                    setIsEditingAssignment(false);
                  }}
                  className="modal-close"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="modal-body">
                <div className="assignment-modal-info">
                  <div className="info-item">
                    <label>Person</label>
                    <div className="info-value">{selectedAssignment.person_name}</div>
                  </div>
                  <div className="info-item">
                    <label>Role</label>
                    <div className="info-value">{selectedAssignment.role_name}</div>
                  </div>
                </div>

                {isEditingAssignment ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleAssignmentSubmit(); }}>
                    <div className="form-group">
                      <label className="form-label">Allocation Percentage</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={assignmentForm.allocation_percentage}
                        onChange={(e) => setAssignmentForm(prev => ({
                          ...prev,
                          allocation_percentage: parseInt(e.target.value) || 0
                        }))}
                        className="form-input"
                        required
                      />
                    </div>
                    
                    <div className="form-group grid">
                      <div>
                        <label className="form-label">Start Date</label>
                        <input
                          type="date"
                          value={assignmentForm.start_date}
                          onChange={(e) => setAssignmentForm(prev => ({
                            ...prev,
                            start_date: e.target.value
                          }))}
                          className="form-input"
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label">End Date</label>
                        <input
                          type="date"
                          value={assignmentForm.end_date}
                          onChange={(e) => setAssignmentForm(prev => ({
                            ...prev,
                            end_date: e.target.value
                          }))}
                          className="form-input"
                          min={assignmentForm.start_date}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="modal-actions">
                      <button
                        type="button"
                        onClick={() => setIsEditingAssignment(false)}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={updateAssignmentMutation.isPending}
                      >
                        <Save size={16} />
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div className="assignment-modal-details">
                      <div className="info-item">
                        <label>Allocation</label>
                        <div className="info-value">{selectedAssignment.allocation_percentage}%</div>
                      </div>
                      <div className="info-item">
                        <label>Start Date</label>
                        <div className="info-value">
                          {formatDate(new Date(selectedAssignment.start_date).toISOString())}
                        </div>
                      </div>
                      <div className="info-item">
                        <label>End Date</label>
                        <div className="info-value">
                          {formatDate(new Date(selectedAssignment.end_date).toISOString())}
                        </div>
                      </div>
                    </div>
                    
                    <div className="modal-actions">
                      <button
                        onClick={() => setSelectedAssignment(null)}
                        className="btn btn-secondary"
                      >
                        Close
                      </button>
                      {canEdit && (
                        <>
                          <button
                            onClick={() => setIsEditingAssignment(true)}
                            className="btn btn-primary"
                          >
                            <Edit2 size={16} />
                            Edit
                          </button>
                          <button
                            onClick={handleAssignmentDelete}
                            className="btn btn-danger"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}