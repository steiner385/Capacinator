import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import { queryKeys } from '../../lib/queryKeys';
import { useModalForm } from '../../hooks/useModalForm';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Spinner } from '../ui/spinner';
import { AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';

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

interface ProjectTypeData {
  id: string;
  name: string;
  parent_id?: string | null;
  [key: string]: unknown;
}

interface LocationData {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface PersonData {
  id: string;
  name: string;
  title?: string;
  location_id?: string;
  roles?: Array<{
    role_name?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

interface PhaseData {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface ProjectData {
  id?: string;
  name: string;
  project_type_id: string;
  location_id: string;
  priority: number;
  description?: string;
  data_restrictions?: string;
  include_in_demand: boolean;
  external_id?: string;
  owner_id: string;
  current_phase_id?: string;
  [key: string]: unknown;
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (project: ProjectData) => void;
  editingProject?: ProjectData;
}

const initialValues: ProjectFormData = {
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
};

const validateProject = (values: ProjectFormData): Partial<Record<keyof ProjectFormData, string>> => {
  const errors: Partial<Record<keyof ProjectFormData, string>> = {};

  if (!values.name.trim()) errors.name = 'Project name is required';
  if (!values.project_type_id) errors.project_type_id = 'Project type is required';
  if (!values.location_id) errors.location_id = 'Location is required';
  if (!values.owner_id) errors.owner_id = 'Project owner is required';

  return errors;
};

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingProject
}) => {
  const {
    values: formData,
    errors,
    hasErrors,
    isEditing,
    isSubmitting,
    handleChange,
    handleSubmit,
    handleClose,
    reset,
  } = useModalForm<ProjectFormData>({
    initialValues,
    validate: validateProject,
    onCreate: async (data) => {
      const response = await api.projects.create(data);
      return response.data;
    },
    onUpdate: async (id, data) => {
      const response = await api.projects.update(id, data);
      return response.data;
    },
    queryKeysToInvalidate: [queryKeys.projects.all],
    additionalUpdateQueryKeys: (item) => [queryKeys.projects.detail(item.id)],
    onSuccess: (data) => {
      if (onSuccess) onSuccess(data);
    },
    onClose,
    editingItem: editingProject,
    getValuesFromItem: (item) => ({
      name: item.name || '',
      project_type_id: item.project_type_id || '',
      location_id: item.location_id || '',
      priority: item.priority || 3,
      description: item.description || '',
      data_restrictions: item.data_restrictions || '',
      include_in_demand: item.include_in_demand ?? true,
      external_id: item.external_id || '',
      owner_id: item.owner_id || '',
      current_phase_id: item.current_phase_id || ''
    }),
  });

  // Fetch data for dropdowns
  const { data: projectTypes } = useQuery({
    queryKey: ['project-types'],
    queryFn: async () => {
      const response = await api.projectTypes.list();
      return response.data?.data || response.data || [];
    }
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.locations.list();
      return response.data?.data || response.data || [];
    }
  });

  const { data: people } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const response = await api.people.list();
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

  // Filter project types to only show project sub-types (not main project types)
  const filteredProjectTypes = useMemo(() => {
    if (!projectTypes || !Array.isArray(projectTypes)) return [];
    return projectTypes.filter((type: ProjectTypeData) => type.parent_id !== null);
  }, [projectTypes]);

  // Filter potential owners based on location
  const filteredOwners = useMemo(() => {
    if (!people || !Array.isArray(people)) return [];

    return people.filter((person: PersonData) => {
      if (formData.location_id) {
        return person.location_id === formData.location_id ||
               person.roles?.some((role: { role_name?: string }) => role.role_name?.toLowerCase().includes('manager')) ||
               person.roles?.some((role: { role_name?: string }) => role.role_name?.toLowerCase().includes('owner'));
      }

      return person.roles?.some((role: { role_name?: string }) =>
        role.role_name?.toLowerCase().includes('manager') ||
        role.role_name?.toLowerCase().includes('owner') ||
        role.role_name?.toLowerCase().includes('lead')
      );
    });
  }, [people, formData.location_id]);

  // Custom close handler that also resets form
  const onCloseWithReset = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCloseWithReset()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Project' : 'Add New Project'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the project details below.'
              : 'Fill in the information to create a new project.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">

          {hasErrors && (
            <Alert variant="destructive" className="mb-6" role="alert" aria-live="assertive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                Please fix the errors below before submitting.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter project name"
                className={errors.name ? 'border-destructive' : ''}
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && <p id="name-error" className="text-sm text-destructive" role="alert">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_type_id">Project Type <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
              <Select value={formData.project_type_id} onValueChange={(value) => handleChange('project_type_id', value)}>
                <SelectTrigger
                  id="project_type_id"
                  className={errors.project_type_id ? 'border-destructive' : ''}
                  aria-required="true"
                  aria-invalid={!!errors.project_type_id}
                  aria-describedby={errors.project_type_id ? 'project_type_id-error' : undefined}
                >
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjectTypes?.map((type: ProjectTypeData) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.project_type_id && <p id="project_type_id-error" className="text-sm text-destructive" role="alert">{errors.project_type_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_id">Location <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
              <Select value={formData.location_id} onValueChange={(value) => handleChange('location_id', value)}>
                <SelectTrigger
                  id="location_id"
                  className={errors.location_id ? 'border-destructive' : ''}
                  aria-required="true"
                  aria-invalid={!!errors.location_id}
                  aria-describedby={errors.location_id ? 'location_id-error' : undefined}
                >
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((location: LocationData) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location_id && <p id="location_id-error" className="text-sm text-destructive" role="alert">{errors.location_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_id">Project Owner <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
              <Select value={formData.owner_id} onValueChange={(value) => handleChange('owner_id', value)}>
                <SelectTrigger
                  id="owner_id"
                  className={errors.owner_id ? 'border-destructive' : ''}
                  aria-required="true"
                  aria-invalid={!!errors.owner_id}
                  aria-describedby={errors.owner_id ? 'owner_id-error' : undefined}
                >
                  <SelectValue placeholder="Select project owner" />
                </SelectTrigger>
                <SelectContent>
                  {filteredOwners?.map((person: PersonData) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name} ({person.title || 'No Title'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.owner_id && <p id="owner_id-error" className="text-sm text-destructive" role="alert">{errors.owner_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority.toString()} onValueChange={(value) => handleChange('priority', Number(value))}>
                <SelectTrigger id="priority">
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
                <SelectTrigger id="current_phase_id">
                  <SelectValue placeholder="Select current phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {phases?.data?.map((phase: PhaseData) => (
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
              aria-describedby="include_in_demand-description"
            />
            <Label htmlFor="include_in_demand" className="cursor-pointer">
              Include in demand planning
            </Label>
            <span id="include_in_demand-description" className="sr-only">Include this project in demand planning calculations</span>
          </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCloseWithReset}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="mr-2" size="sm" />}
                {isEditing ? 'Update Project' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectModal;
