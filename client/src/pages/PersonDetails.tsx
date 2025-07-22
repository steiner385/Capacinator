import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Edit2, Save, X, Calendar, Briefcase, Users, Clock, 
  Shield, Mail, Phone, MapPin, Award, AlertCircle, History,
  Plus, Trash2, ChevronDown, ChevronUp, UserPlus, UserMinus,
  Search, TrendingUp, TrendingDown, Target, Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { api } from '../lib/api-client';
import { formatDate } from '../utils/date';
import { PersonAllocationChart } from '../components/PersonAllocationChart';
import PersonRoleModal from '../components/modals/PersonRoleModal';
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
  primary_person_role_id?: string;
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
  
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    roles: true,
    assignments: true,
    allocation: true,
    availability: true,
    history: false
  });
  
  // Role management modal state
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);

  // Time off editing state
  const [editingTimeOff, setEditingTimeOff] = useState<string | null>(null);
  const [editingTimeOffData, setEditingTimeOffData] = useState<any>(null);
  
  // New time off creation state
  const [isCreatingTimeOff, setIsCreatingTimeOff] = useState<boolean>(false);
  const [newTimeOffData, setNewTimeOffData] = useState<any>(null);

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

  // Utilization timeline query
  const { data: utilizationTimeline } = useQuery({
    queryKey: ['person-utilization-timeline', id],
    queryFn: async () => {
      const response = await fetch(`/api/people/${id}/utilization-timeline?startDate=2023-01-01&endDate=2026-12-31`);
      if (!response.ok) {
        throw new Error('Failed to fetch utilization timeline');
      }
      return response.json();
    },
    enabled: !!id
  });

  // Individual field update mutations
  const updatePersonFieldMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const response = await api.people.update(id!, { [field]: value });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', id] });
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

  // Availability override mutations
  const updateOverrideMutation = useMutation({
    mutationFn: async (override: any) => {
      const response = await fetch(`/api/availability/${override.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(override)
      });
      if (!response.ok) throw new Error('Failed to update availability override');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', id] });
      setEditingTimeOff(null);
      setEditingTimeOffData(null);
    }
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: async (overrideId: string) => {
      const response = await fetch(`/api/availability/${overrideId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete availability override');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', id] });
    }
  });

  const createOverrideMutation = useMutation({
    mutationFn: async (overrideData: any) => {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrideData)
      });
      if (!response.ok) throw new Error('Failed to create availability override');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', id] });
      setIsCreatingTimeOff(false);
      setNewTimeOffData(null);
    }
  });

  // Handle individual field updates
  const handleFieldUpdate = (field: string, value: any) => {
    updatePersonFieldMutation.mutate({ field, value });
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
    type?: 'text' | 'email' | 'tel' | 'number' | 'select';
    options?: Array<{ value: any; label: string }>;
    placeholder?: string;
    icon?: any;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);

    const handleSave = () => {
      if (editValue !== value) {
        handleFieldUpdate(field, type === 'number' ? parseInt(editValue) : editValue);
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
    const displayValue = type === 'select' 
      ? options.find(opt => opt.value === value)?.label || placeholder || 'Not provided'
      : value || placeholder || 'Not provided';

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

  // Role management handlers
  const handleAddRole = () => {
    setEditingRole(null);
    setRoleModalOpen(true);
  };

  const handleEditRole = (role: any) => {
    setEditingRole(role);
    setRoleModalOpen(true);
  };

  const handleRoleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['person', id] });
    setRoleModalOpen(false);
    setEditingRole(null);
  };

  const handleRoleModalClose = () => {
    setRoleModalOpen(false);
    setEditingRole(null);
  };

  // Time off management handlers
  const handleEditTimeOff = (override: any) => {
    setEditingTimeOff(override.id);
    setEditingTimeOffData({
      ...override,
      start_date: new Date(override.start_date).toISOString().split('T')[0],
      end_date: new Date(override.end_date).toISOString().split('T')[0]
    });
  };

  const handleSaveTimeOff = () => {
    if (editingTimeOffData) {
      updateOverrideMutation.mutate({
        ...editingTimeOffData,
        start_date: new Date(editingTimeOffData.start_date).getTime(),
        end_date: new Date(editingTimeOffData.end_date).getTime()
      });
    }
  };

  const handleCancelTimeOffEdit = () => {
    setEditingTimeOff(null);
    setEditingTimeOffData(null);
  };

  const handleDeleteTimeOff = (overrideId: string) => {
    if (confirm('Are you sure you want to delete this time off entry?')) {
      deleteOverrideMutation.mutate(overrideId);
    }
  };

  // New time off creation handlers
  const handleAddTimeOff = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setNewTimeOffData({
      person_id: person?.id,
      start_date: today.toISOString().split('T')[0],
      end_date: tomorrow.toISOString().split('T')[0],
      override_type: 'vacation',
      availability_percentage: 0,
      reason: '',
      created_by: 'current-user' // TODO: Replace with actual user ID when auth is implemented
    });
    setIsCreatingTimeOff(true);
  };

  const handleSaveNewTimeOff = () => {
    if (newTimeOffData) {
      createOverrideMutation.mutate({
        ...newTimeOffData,
        start_date: new Date(newTimeOffData.start_date).toISOString().split('T')[0],
        end_date: new Date(newTimeOffData.end_date).toISOString().split('T')[0]
      });
    }
  };

  const handleCancelNewTimeOff = () => {
    setIsCreatingTimeOff(false);
    setNewTimeOffData(null);
  };

  // Calculate allocation insights (moved before conditional returns to fix React hooks order)
  const allocationInsights = useMemo(() => {
    if (!person) return null;
    
    // Only include assignments that are currently active (overlapping with today)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const activeAssignments = person.assignments.filter(assignment => {
      return assignment.start_date <= today && assignment.end_date >= today;
    });
    
    const totalAllocation = activeAssignments.reduce((sum, assignment) => {
      return sum + assignment.allocation_percentage;
    }, 0);
    
    const availability = person.default_availability_percentage;
    const utilizationPercentage = availability > 0 ? (totalAllocation / availability) * 100 : 0;
    
    let status: 'over_allocated' | 'fully_allocated' | 'under_allocated' | 'available';
    let statusColor: string;
    let actions: Array<{ label: string; action: string; icon: any; variant: string }> = [];
    
    if (utilizationPercentage > 100) {
      status = 'over_allocated';
      statusColor = 'danger';
      actions = [
        { label: 'Reduce Workload', action: 'reduce_workload', icon: UserMinus, variant: 'danger' },
        { label: 'Find Coverage', action: 'find_coverage', icon: Search, variant: 'warning' },
        { label: 'Extend Timeline', action: 'extend_timeline', icon: Calendar, variant: 'secondary' }
      ];
    } else if (utilizationPercentage >= 80) {
      status = 'fully_allocated';
      statusColor = 'warning';
      actions = [
        { label: 'Monitor Load', action: 'monitor_load', icon: TrendingUp, variant: 'warning' },
        { label: 'Plan Ahead', action: 'plan_ahead', icon: Target, variant: 'secondary' }
      ];
    } else if (utilizationPercentage >= 40) {
      status = 'under_allocated';
      statusColor = 'info';
      actions = [
        { label: 'Assign More Work', action: 'assign_more', icon: UserPlus, variant: 'primary' },
        { label: 'Find Projects', action: 'find_projects', icon: Search, variant: 'info' }
      ];
    } else {
      status = 'available';
      statusColor = 'success';
      actions = [
        { label: 'Assign to Project', action: 'assign_project', icon: Plus, variant: 'success' },
        { label: 'View Opportunities', action: 'view_opportunities', icon: Zap, variant: 'primary' }
      ];
    }
    
    return {
      totalAllocation,
      availability,
      utilizationPercentage,
      status,
      statusColor,
      actions,
      hasUpcomingTimeOff: person.availabilityOverrides.some(override => 
        new Date(override.start_date) > new Date()
      ),
      currentProjects: activeAssignments.length,
      skillsCount: person.roles.length
    };
  }, [person]);

  if (isLoading) return <div className="loading">Loading person details...</div>;
  if (error || !person) return <div className="error">Failed to load person details</div>;


  const handleActionClick = (action: string) => {
    switch (action) {
      case 'reduce_workload':
        navigate(`/assignments?person=${person.id}&action=reduce`);
        break;
      case 'find_coverage':
        navigate(`/people?skills=${person.roles.map(r => r.role_id).join(',')}&available=true`);
        break;
      case 'extend_timeline':
        navigate(`/projects?assignee=${person.id}`);
        break;
      case 'assign_more':
      case 'assign_project':
        navigate(`/assignments/new?person=${person.id}`);
        break;
      case 'find_projects':
      case 'view_opportunities':
        navigate(`/projects?needs_role=${person.primary_person_role_id}&status=active`);
        break;
      case 'monitor_load':
        navigate(`/reports?type=utilization&person=${person.id}`);
        break;
      case 'plan_ahead':
        navigate(`/assignments?person=${person.id}&view=timeline`);
        break;
      default:
        console.log('Action not implemented:', action);
    }
  };

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
      </div>

      <div className="person-details-content">
        {/* Allocation Insights & Quick Actions */}
        <div className="detail-section insights-section">
          <div className="section-header">
            <h2>
              <TrendingUp size={20} />
              Workload Insights & Actions
            </h2>
          </div>
          
          <div className="section-content">
            <div className="insights-grid">
              <div className="insight-card">
                <div className="insight-header">
                  <div className="insight-value">
                    {allocationInsights?.totalAllocation.toFixed(0) ?? 0}%
                  </div>
                  <div className="insight-label">Total Allocation</div>
                </div>
                <div className="insight-comparison">
                  vs {allocationInsights?.availability ?? 0}% available
                </div>
              </div>
              
              <div className="insight-card">
                <div className="insight-header">
                  <div className={`insight-value text-${allocationInsights?.statusColor ?? 'gray'}`}>
                    {allocationInsights?.utilizationPercentage.toFixed(0) ?? 0}%
                  </div>
                  <div className="insight-label">Utilization</div>
                </div>
                <div className={`insight-status badge badge-${allocationInsights?.statusColor ?? 'gray'}`}>
                  {allocationInsights?.status.replace('_', ' ').toUpperCase() ?? 'UNKNOWN'}
                </div>
              </div>
              
              <div className="insight-card">
                <div className="insight-header">
                  <div className="insight-value">
                    {allocationInsights?.currentProjects ?? 0}
                  </div>
                  <div className="insight-label">Active Projects</div>
                </div>
                <div className="insight-comparison">
                  {allocationInsights?.skillsCount ?? 0} skill{(allocationInsights?.skillsCount ?? 0) !== 1 ? 's' : ''}
                </div>
              </div>
              
              {allocationInsights?.hasUpcomingTimeOff && (
                <div className="insight-card alert-card">
                  <div className="insight-header">
                    <AlertCircle size={16} className="text-warning" />
                    <div className="insight-label">Upcoming Time Off</div>
                  </div>
                  <div className="insight-comparison text-warning">
                    Plan coverage needed
                  </div>
                </div>
              )}
            </div>
            
            <div className="quick-actions">
              <h4>Recommended Actions</h4>
              <div className="actions-grid">
                {allocationInsights?.actions?.map((action, index) => {
                  const IconComponent = action.icon;
                  return (
                    <button
                      key={index}
                      className={`btn btn-${action.variant} action-btn`}
                      onClick={() => handleActionClick(action.action)}
                    >
                      <IconComponent size={16} />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

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
                  <InlineEdit
                    field="email"
                    value={person.email}
                    type="email"
                    placeholder="Enter email"
                    icon={Mail}
                  />
                </div>

                <div className="info-item">
                  <label>Phone</label>
                  <InlineEdit
                    field="phone"
                    value={person.phone}
                    type="tel"
                    placeholder="Enter phone number"
                    icon={Phone}
                  />
                </div>

                <div className="info-item">
                  <label>Title</label>
                  <InlineEdit
                    field="title"
                    value={person.title}
                    placeholder="Enter job title"
                  />
                </div>

                <div className="info-item">
                  <label>Department</label>
                  <InlineEdit
                    field="department"
                    value={person.department}
                    placeholder="Enter department"
                  />
                </div>

                <div className="info-item">
                  <label>Location</label>
                  <InlineEdit
                    field="location_id"
                    value={person.location_id}
                    type="select"
                    options={Array.isArray(locations) ? locations.map((location: any) => ({
                      value: location.id,
                      label: location.name
                    })) : []}
                    placeholder="Select location"
                    icon={MapPin}
                  />
                </div>

                <div className="info-item">
                  <label>Primary Role</label>
                  <InlineEdit
                    field="primary_person_role_id"
                    value={person.roles.find((role: any) => role.is_primary)?.role_id}
                    type="select"
                    options={Array.isArray(roles) ? roles.map((role: any) => ({
                      value: role.id,
                      label: role.name
                    })) : []}
                    placeholder="Select primary role"
                    icon={Shield}
                  />
                </div>

                <div className="info-item">
                  <label>Supervisor</label>
                  <InlineEdit
                    field="supervisor_id"
                    value={person.supervisor_id}
                    type="select"
                    options={Array.isArray(allPeople) ? allPeople.filter((p: any) => p.id !== id).map((supervisor: any) => ({
                      value: supervisor.id,
                      label: supervisor.name
                    })) : []}
                    placeholder="No supervisor"
                    icon={Users}
                  />
                </div>

                <div className="info-item">
                  <label>Worker Type</label>
                  <InlineEdit
                    field="worker_type"
                    value={person.worker_type}
                    type="select"
                    options={[
                      { value: 'FTE', label: 'Full-Time Employee' },
                      { value: 'CONTRACT', label: 'Contractor' },
                      { value: 'INTERN', label: 'Intern' }
                    ]}
                    placeholder="Full-Time Employee"
                  />
                </div>

                <div className="info-item">
                  <label>Hours per Day</label>
                  <InlineEdit
                    field="default_hours_per_day"
                    value={person.default_hours_per_day}
                    type="number"
                    placeholder="8"
                  />
                </div>

                <div className="info-item">
                  <label>Default Availability</label>
                  <InlineEdit
                    field="default_availability_percentage"
                    value={person.default_availability_percentage}
                    type="number"
                    placeholder="100"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Availability & Time Off Section */}
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
                      {editingTimeOff === override.id ? (
                        // Edit mode
                        <div className="override-edit-form">
                          <div className="form-row">
                            <div className="form-group">
                              <label>Start Date</label>
                              <input
                                type="date"
                                value={editingTimeOffData?.start_date || ''}
                                onChange={(e) => setEditingTimeOffData({ ...editingTimeOffData, start_date: e.target.value })}
                                className="form-input"
                              />
                            </div>
                            <div className="form-group">
                              <label>End Date</label>
                              <input
                                type="date"
                                value={editingTimeOffData?.end_date || ''}
                                onChange={(e) => setEditingTimeOffData({ ...editingTimeOffData, end_date: e.target.value })}
                                className="form-input"
                              />
                            </div>
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label>Type</label>
                              <select
                                value={editingTimeOffData?.override_type || ''}
                                onChange={(e) => setEditingTimeOffData({ ...editingTimeOffData, override_type: e.target.value })}
                                className="form-select"
                              >
                                <option value="vacation">Vacation</option>
                                <option value="sick">Sick Leave</option>
                                <option value="training">Training</option>
                                <option value="conference">Conference</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Availability %</label>
                              <input
                                type="number"
                                value={editingTimeOffData?.availability_percentage || ''}
                                onChange={(e) => setEditingTimeOffData({ ...editingTimeOffData, availability_percentage: parseInt(e.target.value) })}
                                className="form-input"
                                min="0"
                                max="100"
                              />
                            </div>
                          </div>
                          <div className="form-group">
                            <label>Reason (Optional)</label>
                            <input
                              type="text"
                              value={editingTimeOffData?.reason || ''}
                              onChange={(e) => setEditingTimeOffData({ ...editingTimeOffData, reason: e.target.value })}
                              className="form-input"
                              placeholder="Optional reason for time off"
                            />
                          </div>
                          <div className="form-actions">
                            <button
                              className="btn btn-primary"
                              onClick={handleSaveTimeOff}
                              disabled={updateOverrideMutation.isPending}
                            >
                              <Save size={16} />
                              {updateOverrideMutation.isPending ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={handleCancelTimeOffEdit}
                            >
                              <X size={16} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <>
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
                            {canEdit && (
                              <div className="override-actions">
                                <button
                                  className="btn btn-icon btn-sm"
                                  onClick={() => handleEditTimeOff(override)}
                                  title="Edit Time Off"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  className="btn btn-icon btn-sm btn-danger"
                                  onClick={() => handleDeleteTimeOff(override.id)}
                                  title="Delete Time Off"
                                  disabled={deleteOverrideMutation.isPending}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No scheduled time off</p>
              )}
              
              {canEdit && (
                <button 
                  className="btn btn-outline mt-3"
                  onClick={handleAddTimeOff}
                  disabled={isCreatingTimeOff}
                >
                  <Plus size={16} />
                  Add Time Off
                </button>
              )}

              {/* New time off creation form */}
              {isCreatingTimeOff && (
                <div className="override-item mt-3">
                  <div className="override-edit-form">
                    <h5>New Time Off Entry</h5>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Start Date</label>
                        <input
                          type="date"
                          value={newTimeOffData?.start_date || ''}
                          onChange={(e) => setNewTimeOffData({ ...newTimeOffData, start_date: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>End Date</label>
                        <input
                          type="date"
                          value={newTimeOffData?.end_date || ''}
                          onChange={(e) => setNewTimeOffData({ ...newTimeOffData, end_date: e.target.value })}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Type</label>
                        <select
                          value={newTimeOffData?.override_type || ''}
                          onChange={(e) => setNewTimeOffData({ ...newTimeOffData, override_type: e.target.value })}
                          className="form-select"
                        >
                          <option value="vacation">Vacation</option>
                          <option value="sick">Sick Leave</option>
                          <option value="training">Training</option>
                          <option value="conference">Conference</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Availability %</label>
                        <input
                          type="number"
                          value={newTimeOffData?.availability_percentage || ''}
                          onChange={(e) => setNewTimeOffData({ ...newTimeOffData, availability_percentage: parseInt(e.target.value) })}
                          className="form-input"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Reason (Optional)</label>
                      <input
                        type="text"
                        value={newTimeOffData?.reason || ''}
                        onChange={(e) => setNewTimeOffData({ ...newTimeOffData, reason: e.target.value })}
                        className="form-input"
                        placeholder="Optional reason for time off"
                      />
                    </div>
                    <div className="form-actions">
                      <button
                        className="btn btn-primary"
                        onClick={handleSaveNewTimeOff}
                        disabled={createOverrideMutation.isPending}
                      >
                        <Save size={16} />
                        {createOverrideMutation.isPending ? 'Creating...' : 'Create'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={handleCancelNewTimeOff}
                      >
                        <X size={16} />
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                        <span className="badge badge-primary">Level {role.proficiency_level}</span>
                        {role.is_primary ? <span className="badge badge-success">Primary</span> : null}
                        {role.start_date && <span className="text-muted">Since {formatDate(role.start_date)}</span>}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="role-actions">
                        <button
                          className="btn btn-icon btn-sm"
                          onClick={() => handleEditRole(role)}
                          title="Edit Role"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn btn-icon btn-sm btn-danger"
                          onClick={() => removeRoleMutation.mutate(role.role_id)}
                          title="Remove Role"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <button 
                    className="btn btn-outline"
                    onClick={handleAddRole}
                  >
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
              {allocationInsights && allocationInsights.currentProjects > 0 ? (
                <div className="assignments-grid">
                  {person.assignments.filter(assignment => {
                    const today = new Date().toISOString().split('T')[0];
                    return assignment.start_date <= today && assignment.end_date >= today;
                  }).map((assignment) => (
                    <div key={assignment.id} className="assignment-card">
                      <div className="assignment-header">
                        <Link to={`/projects/${assignment.project_id}`} className="assignment-project">
                          {assignment.project_name}
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
              
              {/* Utilization Timeline Chart */}
              <div className="chart-container" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} />
                  Utilization Timeline
                </h3>
                {utilizationTimeline && utilizationTimeline.timeline ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={utilizationTimeline.timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          const date = new Date(value + '-01');
                          return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                        }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip 
                        formatter={(value, name) => [`${value}%`, name === 'utilization' ? 'Utilization' : 'Availability']}
                        labelFormatter={(label) => {
                          const date = new Date(label + '-01');
                          return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                        }}
                      />
                      <ReferenceLine 
                        y={utilizationTimeline.defaultAvailability} 
                        stroke="var(--success-color)" 
                        strokeDasharray="8 8"
                        label={{ value: "Available Capacity", position: "top" }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="utilization" 
                        stroke="var(--primary-color)" 
                        strokeWidth={3}
                        dot={{ fill: 'var(--primary-color)', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: 'var(--primary-color)', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-loading" style={{ 
                    height: '300px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '14px'
                  }}>
                    {utilizationTimeline === undefined ? 'Loading timeline data...' : 'No utilization data available'}
                  </div>
                )}
              </div>
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
      
      {/* Role Management Modal */}
      <PersonRoleModal
        isOpen={roleModalOpen}
        onClose={handleRoleModalClose}
        onSuccess={handleRoleModalSuccess}
        personId={id!}
        editingRole={editingRole}
      />
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