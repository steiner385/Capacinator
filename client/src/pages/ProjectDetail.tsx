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
import ProjectPhaseManager from '../components/ProjectPhaseManager';
import VisualPhaseManager from '../components/VisualPhaseManager';
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

  const [useVisualPhaseManager, setUseVisualPhaseManager] = useState(false);

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

  // Handle individual field updates
  const handleFieldUpdate = (field: string, value: any) => {
    updateProjectFieldMutation.mutate({ field, value });
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
              Project Phases & Timeline
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Toggle between table and visual phase managers */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                <span>Table</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUseVisualPhaseManager(!useVisualPhaseManager);
                  }}
                  style={{
                    position: 'relative',
                    width: '44px',
                    height: '24px',
                    backgroundColor: useVisualPhaseManager ? '#3b82f6' : '#d1d5db',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: useVisualPhaseManager ? '22px' : '2px',
                      width: '20px',
                      height: '20px',
                      backgroundColor: 'white',
                      borderRadius: '10px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                    }}
                  />
                </button>
                <span>Visual</span>
              </div>
              {expandedSections.phases ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
          
          {expandedSections.phases && (
            <div className="section-content">
              {useVisualPhaseManager ? (
                <VisualPhaseManager 
                  projectId={project.id} 
                  projectName={project.name}
                  onPhasesChange={() => {
                    // Refresh project data when phases change
                    queryClient.invalidateQueries({ queryKey: ['project', id] });
                  }}
                />
              ) : (
                <ProjectPhaseManager 
                  projectId={project.id} 
                  projectName={project.name}
                />
              )}
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
              {project.assignments.length > 0 ? (
                <div className="assignments-grid">
                  {project.assignments.map((assignment) => (
                    <div key={assignment.id} className="assignment-card">
                      <div className="assignment-header">
                        <Link to={`/people/${assignment.person_id}`} className="assignment-person">
                          {assignment.person_name}
                        </Link>
                        {canEdit && (
                          <button
                            className="btn btn-icon btn-danger"
                            onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="assignment-details">
                        <span className="assignment-role">{assignment.role_name}</span>
                        <span className="assignment-allocation">{assignment.allocation_percentage}%</span>
                      </div>
                      <div className="assignment-period">
                        {formatDate(new Date(assignment.start_date).toISOString())} - {formatDate(new Date(assignment.end_date).toISOString())}
                      </div>
                    </div>
                  ))}
                </div>
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
      </div>
    </div>
  );
}