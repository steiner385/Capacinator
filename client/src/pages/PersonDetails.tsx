import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Edit2, Save, X, Calendar, Briefcase, Users, Clock, 
  Shield, Mail, Phone, MapPin, Award, AlertCircle, History,
  Plus, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../lib/api-client';
import { formatDate } from '../utils/date';
import { PersonAllocationChart } from '../components/PersonAllocationChart';
import './PersonDetails.css';
import '../components/Charts.css';

interface PersonDetails {
  id: string;
  name: string;
  email: string | null;
  phone?: string;
  title?: string;
  department?: string;
  location_id?: string;
  location_name?: string;
  primary_role_id?: string;
  primary_role_name?: string;
  supervisor_id?: string | null;
  supervisor_name?: string | null;
  worker_type: string;
  default_availability_percentage: number;
  default_hours_per_day: number;
  start_date?: string;
  end_date?: string;
  status?: string;
  working_hours?: number;
  vacation_days?: number;
  utilization_target?: number;
  created_at: number;
  updated_at: number;
  roles: Array<{
    id: string;
    person_id: string;
    role_id: string;
    role_name: string;
    role_description?: string;
    start_date?: string;
    end_date?: string;
    proficiency_level: string;
    is_primary: number;
  }>;
  assignments: Array<{
    id: string;
    project_id: string;
    project_name: string;
    role_id: string;
    role_name: string;
    start_date: string;
    end_date: string;
    allocation_percentage: number;
    billable: boolean;
  }>;
  availabilityOverrides: Array<{
    id: string;
    person_id: string;
    start_date: number;
    end_date: number;
    availability_percentage: number;
    hours_per_day: number | null;
    reason?: string;
    override_type: string;
    is_approved: number;
    approved_by?: string | null;
    approved_at: number;
    created_by?: string | null;
    created_at: number;
    updated_at: number;
  }>;
}

export default function PersonDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedPerson, setEditedPerson] = useState<Partial<PersonDetails> | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    roles: true,
    assignments: true,
    allocation: true,
    availability: true,
    history: false
  });

  // TODO: Replace with proper auth context when authentication is implemented
  // For now, check localStorage or default to allowing edits
  const canEdit = localStorage.getItem('userRole') !== 'viewer';
  const canDelete = localStorage.getItem('userRole') === 'admin';

  // Fetch person details
  const { data: person, isLoading, error } = useQuery({
    queryKey: ['person', id],
    queryFn: async () => {
      const response = await api.people.get(id!);
      return response.data as PersonDetails;
    },
    enabled: !!id
  });

  // Fetch locations for dropdown
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.locations.list();
      return response.data.data;
    }
  });

  // Fetch roles for dropdown
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list();
      return response.data;
    }
  });

  // Fetch all people for supervisor dropdown
  const { data: allPeople } = useQuery({
    queryKey: ['people-list'],
    queryFn: async () => {
      const response = await api.people.list();
      return response.data.data;
    }
  });

  // Update person mutation
  const updatePersonMutation = useMutation({
    mutationFn: async (data: Partial<PersonDetails>) => {
      const response = await api.people.update(id!, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', id] });
      setIsEditing(false);
      setEditedPerson(null);
    }
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      await api.assignments.delete(assignmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', id] });
    }
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      await api.people.removeRole(id!, roleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', id] });
    }
  });

  const handleEdit = () => {
    setEditedPerson(person || null);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editedPerson) {
      updatePersonMutation.mutate(editedPerson);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedPerson(null);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (isLoading) return <div className="loading">Loading person details...</div>;
  if (error || !person) return <div className="error">Failed to load person details</div>;

  const displayPerson = isEditing ? editedPerson! : person;

  return (
    <div className="page-container person-details">
      <div className="page-header">
        <div className="header-left">
          <button className="btn btn-icon" onClick={() => navigate('/people')}>
            <ArrowLeft size={20} />
          </button>
          <h1>{person.name}</h1>
          <span className={`badge badge-${person.status === 'active' ? 'success' : 'gray'}`}>
            {person.status || 'Active'}
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
              <Users size={20} />
              Basic Information
            </h2>
            {expandedSections.basic ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          
          {expandedSections.basic && (
            <div className="section-content">
              <div className="info-grid">
                <div className="info-item">
                  <label>Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editedPerson?.email || ''}
                      onChange={(e) => setEditedPerson({ ...editedPerson!, email: e.target.value })}
                      className="form-input"
                    />
                  ) : (
                    <div className="info-value">
                      <Mail size={16} />
                      <a href={`mailto:${person.email}`}>{person.email || 'Not provided'}</a>
                    </div>
                  )}
                </div>

                <div className="info-item">
                  <label>Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editedPerson?.phone || ''}
                      onChange={(e) => setEditedPerson({ ...editedPerson!, phone: e.target.value })}
                      className="form-input"
                    />
                  ) : (
                    <div className="info-value">
                      <Phone size={16} />
                      {person.phone || 'Not provided'}
                    </div>
                  )}
                </div>

                <div className="info-item">
                  <label>Title</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedPerson?.title || ''}
                      onChange={(e) => setEditedPerson({ ...editedPerson!, title: e.target.value })}
                      className="form-input"
                    />
                  ) : (
                    <div className="info-value">{person.title || 'Not specified'}</div>
                  )}
                </div>

                <div className="info-item">
                  <label>Department</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedPerson?.department || ''}
                      onChange={(e) => setEditedPerson({ ...editedPerson!, department: e.target.value })}
                      className="form-input"
                    />
                  ) : (
                    <div className="info-value">{person.department || 'Not specified'}</div>
                  )}
                </div>

                <div className="info-item">
                  <label>Location</label>
                  {isEditing ? (
                    <select
                      value={editedPerson?.location_id || ''}
                      onChange={(e) => setEditedPerson({ ...editedPerson!, location_id: e.target.value })}
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
                      {person.location_name || 'Not specified'}
                    </div>
                  )}
                </div>

                <div className="info-item">
                  <label>Primary Role</label>
                  {isEditing ? (
                    <select
                      value={editedPerson?.primary_role_id || ''}
                      onChange={(e) => setEditedPerson({ ...editedPerson!, primary_role_id: e.target.value })}
                      className="form-select"
                    >
                      <option value="">Select primary role</option>
                      {roles?.map((role: any) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="info-value">
                      <Shield size={16} />
                      {person.primary_role_name || 'Not specified'}
                    </div>
                  )}
                </div>

                <div className="info-item">
                  <label>Supervisor</label>
                  {isEditing ? (
                    <select
                      value={editedPerson?.supervisor_id || ''}
                      onChange={(e) => setEditedPerson({ ...editedPerson!, supervisor_id: e.target.value })}
                      className="form-select"
                    >
                      <option value="">No supervisor</option>
                      {allPeople?.filter((p: any) => p.id !== id).map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="info-value">
                      {person.supervisor_name ? (
                        <Link to={`/people/${person.supervisor_id}`}>{person.supervisor_name}</Link>
                      ) : (
                        'No supervisor'
                      )}
                    </div>
                  )}
                </div>

                <div className="info-item">
                  <label>Worker Type</label>
                  {isEditing ? (
                    <select
                      value={editedPerson?.worker_type || ''}
                      onChange={(e) => setEditedPerson({ ...editedPerson!, worker_type: e.target.value })}
                      className="form-select"
                    >
                      <option value="FTE">Full-Time Employee</option>
                      <option value="CONTRACT">Contractor</option>
                      <option value="INTERN">Intern</option>
                    </select>
                  ) : (
                    <div className="info-value">{person.worker_type}</div>
                  )}
                </div>

                <div className="info-item">
                  <label>Hours per Day</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedPerson?.default_hours_per_day || ''}
                      onChange={(e) => setEditedPerson({ ...editedPerson!, default_hours_per_day: parseInt(e.target.value) })}
                      className="form-input"
                      min="0"
                      max="12"
                    />
                  ) : (
                    <div className="info-value">{person.default_hours_per_day} hours/day</div>
                  )}
                </div>

                <div className="info-item">
                  <label>Default Availability</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedPerson?.default_availability_percentage || ''}
                      onChange={(e) => setEditedPerson({ ...editedPerson!, default_availability_percentage: parseInt(e.target.value) })}
                      className="form-input"
                      min="0"
                      max="100"
                    />
                  ) : (
                    <div className="info-value">{person.default_availability_percentage}%</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Roles & Skills Section */}
        <div className="detail-section">
          <div className="section-header" onClick={() => toggleSection('roles')}>
            <h2>
              <Award size={20} />
              Roles & Skills
            </h2>
            {expandedSections.roles ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          
          {expandedSections.roles && (
            <div className="section-content">
              <div className="roles-list">
                {person.roles.map((role) => (
                  <div key={role.id} className="role-item">
                    <div className="role-info">
                      <h4>{role.role_name}</h4>
                      <p>{role.role_description}</p>
                      <div className="role-meta">
                        <span className="badge badge-primary">{role.proficiency_level}</span>
                        {role.start_date && <span className="text-muted">Since {formatDate(role.start_date)}</span>}
                      </div>
                    </div>
                    {isEditing && canEdit && (
                      <button
                        className="btn btn-icon btn-danger"
                        onClick={() => removeRoleMutation.mutate(role.role_id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <button className="btn btn-outline">
                    <Plus size={16} />
                    Add Role
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Current Assignments Section */}
        <div className="detail-section">
          <div className="section-header" onClick={() => toggleSection('assignments')}>
            <h2>
              <Briefcase size={20} />
              Current Assignments
            </h2>
            {expandedSections.assignments ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          
          {expandedSections.assignments && (
            <div className="section-content">
              {person.assignments.length > 0 ? (
                <div className="assignments-grid">
                  {person.assignments.map((assignment) => (
                    <div key={assignment.id} className="assignment-card">
                      <div className="assignment-header">
                        <Link to={`/projects/${assignment.project_id}`} className="assignment-project">
                          {assignment.project_name}
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
                        <span className={`badge ${assignment.billable ? 'badge-success' : 'badge-gray'}`}>
                          {assignment.billable ? 'Billable' : 'Non-billable'}
                        </span>
                      </div>
                      <div className="assignment-period">
                        {formatDate(assignment.start_date)} - {formatDate(assignment.end_date)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <AlertCircle size={48} />
                  <p>No current assignments</p>
                  <Link to="/assignments" className="btn btn-primary">
                    <Plus size={16} />
                    Assign to Project
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Allocation vs Availability Section */}
        <div className="detail-section">
          <div className="section-header" onClick={() => toggleSection('allocation')}>
            <h2>
              <Clock size={20} />
              Allocation vs Availability
            </h2>
            {expandedSections.allocation ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          
          {expandedSections.allocation && (
            <div className="section-content">
              <PersonAllocationChart personId={person.id} personName={person.name} />
            </div>
          )}
        </div>

        {/* Availability Section */}
        <div className="detail-section">
          <div className="section-header" onClick={() => toggleSection('availability')}>
            <h2>
              <Calendar size={20} />
              Availability & Time Off
            </h2>
            {expandedSections.availability ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          
          {expandedSections.availability && (
            <div className="section-content">
              <div className="availability-summary">
                <div className="summary-item">
                  <label>Default Availability</label>
                  <div className="summary-value">{person.default_availability_percentage}%</div>
                </div>
                <div className="summary-item">
                  <label>Default Hours per Day</label>
                  <div className="summary-value">{person.default_hours_per_day} hours</div>
                </div>
              </div>
              
              {person.availabilityOverrides.length > 0 ? (
                <div className="overrides-list">
                  <h4>Scheduled Time Off</h4>
                  {person.availabilityOverrides.map((override) => (
                    <div key={override.id} className="override-item">
                      <div className="override-dates">
                        {formatDate(new Date(override.start_date).toISOString())} - {formatDate(new Date(override.end_date).toISOString())}
                      </div>
                      <div className="override-details">
                        <span className={`badge badge-${getOverrideTypeColor(override.override_type)}`}>
                          {override.override_type}
                        </span>
                        {override.reason && <span className="override-reason">{override.reason}</span>}
                        <span className="override-hours">{override.availability_percentage}%</span>
                        {override.hours_per_day && <span className="override-hours">{override.hours_per_day} hrs/day</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No scheduled time off</p>
              )}
              
              {isEditing && (
                <button className="btn btn-outline mt-3">
                  <Plus size={16} />
                  Add Time Off
                </button>
              )}
            </div>
          )}
        </div>

        {/* History Section */}
        <div className="detail-section">
          <div className="section-header" onClick={() => toggleSection('history')}>
            <h2>
              <History size={20} />
              History
            </h2>
            {expandedSections.history ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          
          {expandedSections.history && (
            <div className="section-content">
              <div className="history-timeline">
                <div className="timeline-item">
                  <div className="timeline-date">{formatDate(new Date(person.created_at).toISOString())}</div>
                  <div className="timeline-content">
                    <strong>Profile created</strong>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-date">{formatDate(new Date(person.updated_at).toISOString())}</div>
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

function getOverrideTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'vacation': return 'blue';
    case 'sick': return 'orange';
    case 'training': return 'purple';
    case 'conference': return 'green';
    default: return 'gray';
  }
}