import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, X } from 'lucide-react';
import { api } from '../lib/api-client';
import './PersonDetails.css'; // Reuse existing styles

interface PersonFormData {
  name: string;
  email: string;
  phone: string;
  title: string;
  department: string;
  location_id: string;
  primary_role_id: string; // Keep for form UI, will be handled specially in submission
  supervisor_id: string;
  worker_type: string;
  default_availability_percentage: number;
  default_hours_per_day: number;
  start_date: string;
  end_date: string;
  status: string;
}

export function PersonNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<PersonFormData>({
    name: '',
    email: '',
    phone: '',
    title: '',
    department: '',
    location_id: '',
    primary_role_id: '',
    supervisor_id: '',
    worker_type: 'FTE',
    default_availability_percentage: 100,
    default_hours_per_day: 8,
    start_date: '',
    end_date: '',
    status: 'active'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch roles for dropdown
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list();
      return response.data;
    }
  });

  // Fetch locations for dropdown
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.locations.list();
      return response.data;
    }
  });

  // Fetch people for supervisor dropdown
  const { data: people } = useQuery({
    queryKey: ['people-list'],
    queryFn: async () => {
      const response = await api.people.list();
      return response.data.data;
    }
  });

  // Create person mutation
  const createPersonMutation = useMutation({
    mutationFn: async (data: PersonFormData) => {
      // First create the person without primary role
      const personData = {
        ...data,
        phone: data.phone || null,
        title: data.title || null,
        department: data.department || null,
        location_id: data.location_id || null,
        supervisor_id: data.supervisor_id || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null
      };
      // Remove primary_role_id as it's not a valid field in the new schema
      delete (personData as any).primary_role_id;
      
      const response = await api.people.create(personData);
      const createdPerson = response.data;
      
      // If a primary role was selected, add it as a person role
      if (data.primary_role_id) {
        await api.people.addRole(createdPerson.id, {
          role_id: data.primary_role_id,
          proficiency_level: 3, // Default intermediate level
          is_primary: true
        });
      }
      
      return createdPerson;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      navigate(`/people/${data.id}`);
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (formData.email && !formData.email.includes('@')) newErrors.email = 'Valid email is required';
    if (!formData.primary_role_id) newErrors.primary_role_id = 'Primary role is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    createPersonMutation.mutate(formData);
  };

  const handleCancel = () => {
    navigate('/people');
  };

  const handleChange = (field: keyof PersonFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Filtered data based on selections
  const filteredSupervisors = useMemo(() => {
    if (!people) return [];
    
    // Filter supervisors based on selected location
    return people.filter((person: any) => {
      // Don't allow a person to be their own supervisor
      if (person.id === formData.supervisor_id) return false;
      
      // If location is selected, prefer supervisors from same location
      if (formData.location_id) {
        return person.location_id === formData.location_id || 
               person.is_supervisor === true; // Keep all supervisors but prefer same location
      }
      
      return person.is_supervisor === true || 
             person.roles?.some((role: any) => role.role_name?.toLowerCase().includes('manager'));
    });
  }, [people, formData.location_id, formData.supervisor_id]);

  const filteredRoles = useMemo(() => {
    if (!roles) return [];
    
    // Filter roles based on selected location and department
    return roles.filter((role: any) => {
      // If location is selected, filter roles available in that location
      if (formData.location_id && role.available_locations) {
        return role.available_locations.includes(formData.location_id);
      }
      
      // If department is selected, filter roles suitable for that department
      if (formData.department && role.suitable_departments) {
        return role.suitable_departments.includes(formData.department);
      }
      
      return true; // Show all roles if no filters
    });
  }, [roles, formData.location_id, formData.department]);

  return (
    <div className="page-container person-details">
      <div className="page-header">
        <div className="header-left">
          <button className="btn btn-icon" onClick={handleCancel}>
            <ArrowLeft size={20} />
          </button>
          <h1>New Person</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleCancel}>
            <X size={20} />
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={createPersonMutation.isPending}
          >
            <Save size={20} />
            {createPersonMutation.isPending ? 'Creating...' : 'Create Person'}
          </button>
        </div>
      </div>

      <div className="person-details-content">
        <form onSubmit={handleSubmit}>
          {/* Basic Information Section */}
          <div className="detail-section">
            <div className="section-header">
              <h2>Basic Information</h2>
            </div>
            
            <div className="section-content">
              <div className="info-grid">
                <div className="info-item">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="Enter full name"
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                <div className="info-item">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    placeholder="email@example.com"
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>

                <div className="info-item">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="form-input"
                    placeholder="Phone number"
                  />
                </div>

                <div className="info-item">
                  <label>Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="form-input"
                    placeholder="Job title"
                  />
                </div>

                <div className="info-item">
                  <label>Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    className="form-input"
                    placeholder="Department"
                  />
                </div>

                <div className="info-item">
                  <label>Location</label>
                  <select
                    value={formData.location_id}
                    onChange={(e) => handleChange('location_id', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select location</option>
                    {locations?.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <div className="info-item">
                  <label>Primary Role *</label>
                  <select
                    value={formData.primary_role_id}
                    onChange={(e) => handleChange('primary_role_id', e.target.value)}
                    className={`form-select ${errors.primary_role_id ? 'error' : ''}`}
                  >
                    <option value="">Select primary role</option>
                    {filteredRoles?.map((role: any) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  {errors.primary_role_id && <span className="error-text">{errors.primary_role_id}</span>}
                  {(formData.location_id || formData.department) && filteredRoles.length === 0 && (
                    <span className="warning-text">No roles available for selected location/department</span>
                  )}
                </div>

                <div className="info-item">
                  <label>Supervisor</label>
                  <select
                    value={formData.supervisor_id}
                    onChange={(e) => handleChange('supervisor_id', e.target.value)}
                    className="form-select"
                  >
                    <option value="">No supervisor</option>
                    {filteredSupervisors?.map((person: any) => (
                      <option key={person.id} value={person.id}>
                        {person.name} {person.location_id === formData.location_id ? '(Same Location)' : ''}
                      </option>
                    ))}
                  </select>
                  {formData.location_id && filteredSupervisors.length === 0 && (
                    <span className="info-text">No supervisors available for selected location</span>
                  )}
                </div>

                <div className="info-item">
                  <label>Worker Type</label>
                  <select
                    value={formData.worker_type}
                    onChange={(e) => handleChange('worker_type', e.target.value)}
                    className="form-select"
                  >
                    <option value="FTE">Full-Time Employee</option>
                    <option value="CONTRACT">Contractor</option>
                    <option value="INTERN">Intern</option>
                  </select>
                </div>

                <div className="info-item">
                  <label>Default Availability (%)</label>
                  <input
                    type="number"
                    value={formData.default_availability_percentage}
                    onChange={(e) => handleChange('default_availability_percentage', parseInt(e.target.value))}
                    className="form-input"
                    min="0"
                    max="100"
                  />
                </div>

                <div className="info-item">
                  <label>Default Hours per Day</label>
                  <input
                    type="number"
                    value={formData.default_hours_per_day}
                    onChange={(e) => handleChange('default_hours_per_day', parseInt(e.target.value))}
                    className="form-input"
                    min="0"
                    max="12"
                  />
                </div>

                <div className="info-item">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="info-item">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="info-item">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="form-select"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Error display */}
          {createPersonMutation.isError && (
            <div className="error-message">
              Failed to create person. Please check your inputs and try again.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}