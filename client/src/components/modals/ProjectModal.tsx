import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import FormModal from '../ui/FormModal';

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
  current_phase_id: string;
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (project: any) => void;
  editingProject?: any;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  editingProject 
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!editingProject;
  
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    project_type_id: '',
    location_id: '',
    priority: 3,
    description: '',
    data_restrictions: '',
    include_in_demand: true,
    external_id: '',
    owner_id: '',
    current_phase_id: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when editingProject changes
  useEffect(() => {
    if (editingProject) {
      setFormData({
        name: editingProject.name || '',
        project_type_id: editingProject.project_type_id || '',
        location_id: editingProject.location_id || '',
        priority: editingProject.priority || 3,
        description: editingProject.description || '',
        data_restrictions: editingProject.data_restrictions || '',
        include_in_demand: editingProject.include_in_demand ?? true,
        external_id: editingProject.external_id || '',
        owner_id: editingProject.owner_id || '',
        current_phase_id: editingProject.current_phase_id || ''
      });
    } else {
      setFormData({
        name: '',
        project_type_id: '',
        location_id: '',
        priority: 3,
        description: '',
        data_restrictions: '',
        include_in_demand: true,
        external_id: '',
        owner_id: '',
        current_phase_id: ''
      });
    }
    // Clear errors when switching between add/edit
    setErrors({});
  }, [editingProject]);

  // Fetch data for dropdowns
  const { data: projectTypes } = useQuery({
    queryKey: ['project-types'],
    queryFn: async () => {
      const response = await api.projectTypes.list();
      // Handle both wrapped {data: [...]} and direct array [...] responses
      return response.data?.data || response.data || [];
    }
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.locations.list();
      // Handle both wrapped {data: [...]} and direct array [...] responses
      return response.data?.data || response.data || [];
    }
  });

  const { data: people } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const response = await api.people.list();
      // Handle both wrapped {data: [...]} and direct array [...] responses
      return response.data?.data || response.data || [];
    }
  });

  const { data: phases } = useQuery({
    queryKey: ['phases'],
    queryFn: async () => {
      const response = await api.phases.list();
      return response.data;
    }
  });

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const response = await api.projects.create(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (onSuccess) {
        onSuccess(data);
      }
      onClose();
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const response = await api.projects.update(editingProject.id, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', editingProject.id] });
      if (onSuccess) {
        onSuccess(data);
      }
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Project name is required';
    if (!formData.project_type_id) newErrors.project_type_id = 'Project type is required';
    if (!formData.location_id) newErrors.location_id = 'Location is required';
    if (!formData.owner_id) newErrors.owner_id = 'Project owner is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    if (isEditing) {
      updateProjectMutation.mutate(formData);
    } else {
      createProjectMutation.mutate(formData);
    }
  };

  const handleChange = (field: keyof ProjectFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Filter project types to only show project sub-types (not main project types)
  const filteredProjectTypes = useMemo(() => {
    if (!projectTypes) return [];
    
    // Only show project sub-types (those with parent_id)
    // Projects should not be associated with main project types
    return projectTypes.filter((type: any) => type.parent_id !== null);
  }, [projectTypes]);

  // Filter potential owners based on location
  const filteredOwners = useMemo(() => {
    if (!people) return [];
    
    return people.filter((person: any) => {
      // If location is selected, prefer owners from same location
      if (formData.location_id) {
        return person.location_id === formData.location_id ||
               person.roles?.some((role: any) => role.role_name?.toLowerCase().includes('manager')) ||
               person.roles?.some((role: any) => role.role_name?.toLowerCase().includes('owner'));
      }
      
      // Default to people with management roles
      return person.roles?.some((role: any) => 
        role.role_name?.toLowerCase().includes('manager') ||
        role.role_name?.toLowerCase().includes('owner') ||
        role.role_name?.toLowerCase().includes('lead')
      );
    });
  }, [people, formData.location_id]);

  const isLoading = createProjectMutation.isPending || updateProjectMutation.isPending;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Project' : 'Create New Project'}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      size="lg"
      submitText={isEditing ? 'Update Project' : 'Create Project'}
    >
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="name">Project Name *</label>
          <input
            type="text"
            id="name"
            className={`form-input ${errors.name ? 'error' : ''}`}
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter project name"
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="project_type_id">Project Type *</label>
          <select
            id="project_type_id"
            className={`form-select ${errors.project_type_id ? 'error' : ''}`}
            value={formData.project_type_id}
            onChange={(e) => handleChange('project_type_id', e.target.value)}
          >
            <option value="">Select project type</option>
            {filteredProjectTypes?.map((type: any) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          {errors.project_type_id && <span className="error-message">{errors.project_type_id}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="location_id">Location *</label>
          <select
            id="location_id"
            className={`form-select ${errors.location_id ? 'error' : ''}`}
            value={formData.location_id}
            onChange={(e) => handleChange('location_id', e.target.value)}
          >
            <option value="">Select location</option>
            {locations?.map((location: any) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          {errors.location_id && <span className="error-message">{errors.location_id}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="owner_id">Project Owner *</label>
          <select
            id="owner_id"
            className={`form-select ${errors.owner_id ? 'error' : ''}`}
            value={formData.owner_id}
            onChange={(e) => handleChange('owner_id', e.target.value)}
          >
            <option value="">Select project owner</option>
            {filteredOwners?.map((person: any) => (
              <option key={person.id} value={person.id}>
                {person.name} ({person.title || 'No Title'})
              </option>
            ))}
          </select>
          {errors.owner_id && <span className="error-message">{errors.owner_id}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            className="form-select"
            value={formData.priority}
            onChange={(e) => handleChange('priority', Number(e.target.value))}
          >
            <option value={1}>1 - Highest</option>
            <option value={2}>2 - High</option>
            <option value={3}>3 - Medium</option>
            <option value={4}>4 - Low</option>
            <option value={5}>5 - Lowest</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="external_id">External ID</label>
          <input
            type="text"
            id="external_id"
            className="form-input"
            value={formData.external_id}
            onChange={(e) => handleChange('external_id', e.target.value)}
            placeholder="External system ID"
          />
        </div>

        <div className="form-group">
          <label htmlFor="current_phase_id">Current Phase</label>
          <select
            id="current_phase_id"
            className="form-select"
            value={formData.current_phase_id}
            onChange={(e) => handleChange('current_phase_id', e.target.value)}
          >
            <option value="">Select current phase</option>
            {phases?.data?.map((phase: any) => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group full-width">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            className="form-textarea"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Enter project description"
            rows={3}
          />
        </div>

        <div className="form-group full-width">
          <label htmlFor="data_restrictions">Data Restrictions</label>
          <textarea
            id="data_restrictions"
            className="form-textarea"
            value={formData.data_restrictions}
            onChange={(e) => handleChange('data_restrictions', e.target.value)}
            placeholder="Enter any data restrictions or security requirements"
            rows={2}
          />
        </div>

        <div className="form-group full-width">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.include_in_demand}
              onChange={(e) => handleChange('include_in_demand', e.target.checked)}
            />
            <span className="checkbox-text">Include in demand planning</span>
          </label>
        </div>
      </div>
    </FormModal>
  );
};

export default ProjectModal;