import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, X } from 'lucide-react';
import { api } from '../lib/api-client';
import { queryKeys } from '../lib/queryKeys';
import './PersonDetails.css'; // Reuse existing styles

interface ProjectFormData {
  name: string;
  project_type_id: string;
  location_id: string;
  priority: number;
  description: string;
  data_restrictions: string;
  include_in_demand: boolean;
  external_id: string;
  owner_id: string;
}

interface ProjectType {
  id: string;
  name: string;
  available_locations?: string[];
}

interface Location {
  id: string;
  name: string;
}

interface PersonRole {
  role_name?: string;
  suitable_project_types?: string[];
}

interface Person {
  id: string;
  name: string;
  location_id?: string;
  can_own_projects?: boolean;
  roles?: PersonRole[];
}

interface ApiError {
  response?: {
    data?: {
      errors?: Record<string, string>;
    };
  };
}

export function ProjectNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    project_type_id: '',
    location_id: '',
    priority: 3,
    description: '',
    data_restrictions: '',
    include_in_demand: true,
    external_id: '',
    owner_id: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch project types for dropdown
  const { data: projectTypes } = useQuery({
    queryKey: queryKeys.projectTypes.list(),
    queryFn: async () => {
      const response = await api.projectTypes.list();
      return response.data;
    }
  });

  // Fetch locations for dropdown
  const { data: locations } = useQuery({
    queryKey: queryKeys.locations.list(),
    queryFn: async () => {
      const response = await api.locations.list();
      return response.data;
    }
  });

  // Fetch people for owner dropdown
  const { data: people } = useQuery({
    queryKey: queryKeys.people.list(),
    queryFn: async () => {
      const response = await api.people.list();
      return response.data.data;
    }
  });


  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const response = await api.projects.create({
        ...data,
        include_in_demand: data.include_in_demand ? 1 : 0,
        owner_id: data.owner_id || null,
        external_id: data.external_id || null,
        description: data.description || null,
        data_restrictions: data.data_restrictions || null
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      navigate(`/projects/${data.id}`);
    },
    onError: (error: ApiError) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Project name is required';
    if (!formData.project_type_id) newErrors.project_type_id = 'Project type is required';
    if (!formData.location_id) newErrors.location_id = 'Location is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    createProjectMutation.mutate(formData);
  };

  const handleCancel = () => {
    navigate('/projects');
  };

  const handleChange = (field: keyof ProjectFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };


  // Filtered data based on selections
  const filteredProjectTypes = useMemo(() => {
    if (!projectTypes) return [];
    
    // Filter project types based on selected location
    if (formData.location_id) {
      return projectTypes.filter((type: ProjectType) => {
        // Check if this project type is available at the selected location
        return type.available_locations?.includes(formData.location_id) ||
               !type.available_locations; // Include types with no location restrictions
      });
    }
    
    return projectTypes;
  }, [projectTypes, formData.location_id]);

  const filteredOwners = useMemo(() => {
    if (!people) return [];

    let filtered: Person[] = people;

    // Filter owners based on selected location (prefer same location)
    if (formData.location_id) {
      const sameLocationOwners = people.filter((person: Person) =>
        person.location_id === formData.location_id
      );

      // If we have people in the same location, prefer them
      if (sameLocationOwners.length > 0) {
        filtered = sameLocationOwners;
      }
    }

    // Further filter by project type expertise if project type is selected
    if (formData.project_type_id) {
      filtered = filtered.filter((person: Person) => {
        // Check if person has roles suitable for this project type
        return person.roles?.some((role: PersonRole) =>
          role.suitable_project_types?.includes(formData.project_type_id) ||
          role.role_name?.toLowerCase().includes('manager') ||
          role.role_name?.toLowerCase().includes('lead')
        ) || !person.roles; // Include people with no specific role restrictions
      });
    }

    // Only show people who can be project owners (managers, leads, seniors)
    return filtered.filter((person: Person) =>
      person.can_own_projects === true ||
      person.roles?.some((role: PersonRole) =>
        role.role_name?.toLowerCase().includes('manager') ||
        role.role_name?.toLowerCase().includes('lead') ||
        role.role_name?.toLowerCase().includes('senior')
      )
    );
  }, [people, formData.location_id, formData.project_type_id]);

  return (
    <div className="page-container person-details">
      <div className="page-header">
        <div className="header-left">
          <button className="btn btn-icon" onClick={handleCancel}>
            <ArrowLeft size={20} />
          </button>
          <h1>New Project</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleCancel}>
            <X size={20} />
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={createProjectMutation.isPending}
          >
            <Save size={20} />
            {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>

      <div className="person-details-content">
        <form onSubmit={handleSubmit}>
          {/* Basic Information Section */}
          <div className="detail-section">
            <div className="section-header">
              <h2>Project Information</h2>
            </div>
            
            <div className="section-content">
              <div className="info-grid">
                <div className="info-item">
                  <label>Project Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="Enter project name"
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                <div className="info-item">
                  <label>Project Type *</label>
                  <select
                    name="project_type_id"
                    value={formData.project_type_id}
                    onChange={(e) => handleChange('project_type_id', e.target.value)}
                    className={`form-select ${errors.project_type_id ? 'error' : ''}`}
                  >
                    <option value="">Select project type</option>
                    {filteredProjectTypes?.map((type: ProjectType) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                  {errors.project_type_id && <span className="error-text">{errors.project_type_id}</span>}
                  {formData.location_id && filteredProjectTypes.length === 0 && (
                    <span className="warning-text">No project types available for selected location</span>
                  )}
                </div>

                <div className="info-item">
                  <label>Location *</label>
                  <select
                    name="location_id"
                    value={formData.location_id}
                    onChange={(e) => handleChange('location_id', e.target.value)}
                    className={`form-select ${errors.location_id ? 'error' : ''}`}
                  >
                    <option value="">Select location</option>
                    {locations?.map((loc: Location) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                  {errors.location_id && <span className="error-text">{errors.location_id}</span>}
                </div>

                <div className="info-item">
                  <label>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleChange('priority', parseInt(e.target.value, 10))}
                    className="form-select"
                  >
                    <option value={1}>Critical</option>
                    <option value={2}>High</option>
                    <option value={3}>Medium</option>
                    <option value={4}>Low</option>
                  </select>
                </div>

                <div className="info-item">
                  <label>Owner</label>
                  <select
                    name="owner_id"
                    value={formData.owner_id}
                    onChange={(e) => handleChange('owner_id', e.target.value)}
                    className="form-select"
                  >
                    <option value="">No owner</option>
                    {filteredOwners?.map((person: Person) => (
                      <option key={person.id} value={person.id}>
                        {person.name} {person.location_id === formData.location_id ? '(Same Location)' : ''}
                      </option>
                    ))}
                  </select>
                  {(formData.location_id || formData.project_type_id) && filteredOwners.length === 0 && (
                    <span className="info-text">No suitable owners found for selected criteria</span>
                  )}
                </div>

                <div className="info-item">
                  <label>External ID</label>
                  <input
                    type="text"
                    value={formData.external_id}
                    onChange={(e) => handleChange('external_id', e.target.value)}
                    className="form-input"
                    placeholder="External reference ID"
                  />
                </div>

                <div className="info-item">
                  <label>Include in Demand</label>
                  <input
                    type="checkbox"
                    checked={formData.include_in_demand}
                    onChange={(e) => handleChange('include_in_demand', e.target.checked)}
                    className="form-checkbox"
                  />
                </div>

                <div className="info-item info-item-full">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="form-textarea"
                    rows={3}
                    placeholder="Project description"
                  />
                </div>

                <div className="info-item info-item-full">
                  <label>Data Restrictions</label>
                  <textarea
                    value={formData.data_restrictions}
                    onChange={(e) => handleChange('data_restrictions', e.target.value)}
                    className="form-textarea"
                    rows={2}
                    placeholder="Any data handling restrictions"
                  />
                </div>
              </div>

              {/* Project Preview */}
              {formData.name && formData.location_id && formData.project_type_id && (
                <div className="project-preview">
                  <h4>Project Preview</h4>
                  <p>
                    <strong>{formData.name}</strong> will be created as a{' '}
                    <strong>{projectTypes?.find((t: ProjectType) => t.id === formData.project_type_id)?.name}</strong> project
                    at <strong>{locations?.find((l: Location) => l.id === formData.location_id)?.name}</strong>
                    {formData.owner_id && (
                      <span> with <strong>{people?.find((p: Person) => p.id === formData.owner_id)?.name}</strong> as owner</span>
                    )}
                  </p>
                </div>
              )}

              {/* Filtering Information */}
              {(formData.location_id || formData.project_type_id) && (
                <div className="filtering-info">
                  <h4>Active Filters</h4>
                  <ul>
                    {formData.location_id && (
                      <li>Project types filtered by location: <strong>{locations?.find((l: Location) => l.id === formData.location_id)?.name}</strong></li>
                    )}
                    {formData.location_id && (
                      <li>Owners prioritized from location: <strong>{locations?.find((l: Location) => l.id === formData.location_id)?.name}</strong></li>
                    )}
                    {formData.project_type_id && (
                      <li>Owners filtered by expertise in: <strong>{projectTypes?.find((t: ProjectType) => t.id === formData.project_type_id)?.name}</strong></li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Error display */}
          {createProjectMutation.isError && (
            <div className="error-message">
              Failed to create project. Please check your inputs and try again.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}