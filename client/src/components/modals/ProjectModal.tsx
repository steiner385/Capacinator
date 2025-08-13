import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import { PortalModal } from '../ui/PortalModal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Spinner } from '../ui/spinner';
import { AlertCircle } from 'lucide-react';

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

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <PortalModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Project' : 'Create New Project'}
    >
      <div className="p-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {isEditing 
            ? 'Update the project details below.' 
            : 'Fill in the information to create a new project.'}
        </p>

        {hasErrors && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the errors below before submitting.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter project name"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_type_id">Project Type *</Label>
              <Select value={formData.project_type_id} onValueChange={(value) => handleChange('project_type_id', value)}>
                <SelectTrigger className={errors.project_type_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjectTypes?.map((type: any) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.project_type_id && <p className="text-sm text-destructive">{errors.project_type_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_id">Location *</Label>
              <Select value={formData.location_id} onValueChange={(value) => handleChange('location_id', value)}>
                <SelectTrigger className={errors.location_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((location: any) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location_id && <p className="text-sm text-destructive">{errors.location_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_id">Project Owner *</Label>
              <Select value={formData.owner_id} onValueChange={(value) => handleChange('owner_id', value)}>
                <SelectTrigger className={errors.owner_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select project owner" />
                </SelectTrigger>
                <SelectContent>
                  {filteredOwners?.map((person: any) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name} ({person.title || 'No Title'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.owner_id && <p className="text-sm text-destructive">{errors.owner_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority.toString()} onValueChange={(value) => handleChange('priority', Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Highest</SelectItem>
                  <SelectItem value="2">2 - High</SelectItem>
                  <SelectItem value="3">3 - Medium</SelectItem>
                  <SelectItem value="4">4 - Low</SelectItem>
                  <SelectItem value="5">5 - Lowest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="external_id">External ID</Label>
              <Input
                id="external_id"
                value={formData.external_id}
                onChange={(e) => handleChange('external_id', e.target.value)}
                placeholder="External system ID"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="current_phase_id">Current Phase</Label>
              <Select value={formData.current_phase_id || 'none'} onValueChange={(value) => handleChange('current_phase_id', value === 'none' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select current phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {phases?.data?.map((phase: any) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter project description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_restrictions">Data Restrictions</Label>
            <Textarea
              id="data_restrictions"
              value={formData.data_restrictions}
              onChange={(e) => handleChange('data_restrictions', e.target.value)}
              placeholder="Enter any data restrictions or security requirements"
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include_in_demand"
              checked={formData.include_in_demand}
              onCheckedChange={(checked) => handleChange('include_in_demand', checked)}
            />
            <Label htmlFor="include_in_demand" className="cursor-pointer">
              Include in demand planning
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Spinner className="mr-2" size="sm" />}
              {isEditing ? 'Update Project' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </PortalModal>
  );
};

export default ProjectModal;