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
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<ProjectDetail> | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    phases: true,
    demand: true,
    assignments: true,
    history: false
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
      return response.data;
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

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (data: Partial<ProjectDetail>) => {
      const response = await api.projects.update(id!, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setIsEditing(false);
      setEditedProject(null);
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

  const handleEdit = () => {
    setEditedProject(project || null);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editedProject) {
      updateProjectMutation.mutate(editedProject);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProject(null);
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

  const displayProject = isEditing ? editedProject! : project;

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
        <div className="header-actions">
          {!isEditing ? (
            canEdit && (
              <button className="btn btn-primary" onClick={handleEdit}>
                <Edit2 size={20} />
                Edit
              </button>
            )
          ) : (
            <>
              <button className="btn btn-secondary" onClick={handleCancel}>
                <X size={20} />
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={20} />
                Save
              </button>
            </>
          )}
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
                  {isEditing ? (
                    <select
                      value={editedProject?.project_type_id || ''}
                      onChange={(e) => setEditedProject({ ...editedProject!, project_type_id: e.target.value })}
                      className="form-select"
                    >
                      <option value="">Select project type</option>
                      {projectTypes?.map((type: any) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="info-value">{project.project_type_name || 'Not specified'}</div>
                  )}
                </div>

                <div className="info-item">
                  <label>Location</label>
                  {isEditing ? (
                    <select
                      value={editedProject?.location_id || ''}
                      onChange={(e) => setEditedProject({ ...editedProject!, location_id: e.target.value })}
                      className="form-select"
                    >
                      <option value="">Select location</option>
                      {locations?.map((loc: any) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="info-value">
                      <MapPin size={16} />
                      {project.location_name || 'Not specified'}
                    </div>
                  )}
                </div>

                <div className="info-item">
                  <label>Priority</label>
                  {isEditing ? (
                    <select
                      value={editedProject?.priority || ''}
                      onChange={(e) => setEditedProject({ ...editedProject!, priority: parseInt(e.target.value) })}
                      className="form-select"
                    >
                      <option value={1}>Critical</option>
                      <option value={2}>High</option>
                      <option value={3}>Medium</option>
                      <option value={4}>Low</option>
                    </select>
                  ) : (
                    <div className="info-value">
                      <span className={`badge badge-${getPriorityColor(project.priority)}`}>
                        {getPriorityLabel(project.priority)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="info-item">
                  <label>Owner</label>
                  <div className="info-value">{project.owner_name || 'Not assigned'}</div>
                </div>

                <div className="info-item">
                  <label>External ID</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProject?.external_id || ''}
                      onChange={(e) => setEditedProject({ ...editedProject!, external_id: e.target.value })}
                      className="form-input"
                    />
                  ) : (
                    <div className="info-value">{project.external_id || 'Not specified'}</div>
                  )}
                </div>

                <div className="info-item">
                  <label>Include in Demand</label>
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={editedProject?.include_in_demand === 1}
                      onChange={(e) => setEditedProject({ ...editedProject!, include_in_demand: e.target.checked ? 1 : 0 })}
                      className="form-checkbox"
                    />
                  ) : (
                    <div className="info-value">
                      <span className={`badge ${project.include_in_demand ? 'badge-success' : 'badge-gray'}`}>
                        {project.include_in_demand ? 'Yes' : 'No'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="info-item info-item-full">
                  <label>Description</label>
                  {isEditing ? (
                    <textarea
                      value={editedProject?.description || ''}
                      onChange={(e) => setEditedProject({ ...editedProject!, description: e.target.value })}
                      className="form-textarea"
                      rows={3}
                    />
                  ) : (
                    <div className="info-value">{project.description || 'No description provided'}</div>
                  )}
                </div>

                <div className="info-item info-item-full">
                  <label>Data Restrictions</label>
                  {isEditing ? (
                    <textarea
                      value={editedProject?.data_restrictions || ''}
                      onChange={(e) => setEditedProject({ ...editedProject!, data_restrictions: e.target.value })}
                      className="form-textarea"
                      rows={2}
                    />
                  ) : (
                    <div className="info-value">{project.data_restrictions || 'No restrictions specified'}</div>
                  )}
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
            {expandedSections.phases ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          
          {expandedSections.phases && (
            <div className="section-content">
              <ProjectPhaseManager 
                projectId={project.id} 
                projectName={project.name}
              />
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
                        {isEditing && canEdit && (
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