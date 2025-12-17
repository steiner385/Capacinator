import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api-client';
import { useModalForm } from '../../hooks/useModalForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Spinner } from '../ui/spinner';
import type { Project, Person, Role, ProjectPhase, AssignmentDateMode } from '../../types';

// Project phase link (from project.phases array)
interface ProjectPhaseLink {
  phase_id: string;
  start_date: string;
  end_date: string;
}

// Available phase for selection
interface AvailablePhase {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

// Assignment type for editing
interface EditableAssignment {
  id: string;
  project_id?: string;
  person_id?: string;
  role_id?: string;
  phase_id?: string;
  assignment_date_mode?: AssignmentDateMode;
  start_date?: string;
  end_date?: string;
  allocation_percentage?: number;
  billable?: boolean;
  notes?: string;
}

interface AssignmentFormData {
  project_id: string;
  person_id: string;
  role_id: string;
  phase_id: string;
  assignment_date_mode: 'fixed' | 'phase' | 'project';
  start_date: string;
  end_date: string;
  allocation_percentage: number;
  billable: boolean;
  notes: string;
}

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (assignment: EditableAssignment) => void;
  editingAssignment?: EditableAssignment;
}

const initialValues: AssignmentFormData = {
  project_id: '',
  person_id: '',
  role_id: '',
  phase_id: '',
  assignment_date_mode: 'fixed',
  start_date: '',
  end_date: '',
  allocation_percentage: 100,
  billable: true,
  notes: ''
};

const validateAssignment = (values: AssignmentFormData): Partial<Record<keyof AssignmentFormData, string>> => {
  const errors: Partial<Record<keyof AssignmentFormData, string>> = {};

  if (!values.project_id) errors.project_id = 'Project is required';
  if (!values.person_id) errors.person_id = 'Person is required';
  if (!values.role_id) errors.role_id = 'Role is required';
  if (!values.start_date) errors.start_date = 'Start date is required';
  if (!values.end_date) errors.end_date = 'End date is required';
  if (values.allocation_percentage <= 0 || values.allocation_percentage > 100) {
    errors.allocation_percentage = 'Allocation must be between 1 and 100';
  }

  return errors;
};

export const AssignmentModalNew: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingAssignment
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
  } = useModalForm<AssignmentFormData>({
    initialValues,
    validate: validateAssignment,
    onCreate: async (data) => {
      const response = await api.assignments.create(data);
      return response.data.data;
    },
    onUpdate: async (id, data) => {
      const response = await api.assignments.update(id, data);
      return response.data.data;
    },
    queryKeysToInvalidate: [['assignments']],
    onSuccess: (data) => {
      if (onSuccess) onSuccess(data);
    },
    onClose,
    editingItem: editingAssignment,
    getValuesFromItem: (item) => ({
      project_id: item.project_id || '',
      person_id: item.person_id || '',
      role_id: item.role_id || '',
      phase_id: item.phase_id || '',
      assignment_date_mode: item.assignment_date_mode || 'fixed',
      start_date: item.start_date?.split('T')[0] || '',
      end_date: item.end_date?.split('T')[0] || '',
      allocation_percentage: item.allocation_percentage || 100,
      billable: item.billable ?? true,
      notes: item.notes || ''
    }),
  });

  // Fetch data
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.projects.list();
      return response.data;
    }
  });

  const { data: people } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const response = await api.people.list();
      return response.data;
    }
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list();
      return response.data.data;
    }
  });

  const { data: phases } = useQuery({
    queryKey: ['phases'],
    queryFn: async () => {
      const response = await api.phases.list();
      return response.data.data;
    }
  });

  const { data: projectPhases } = useQuery({
    queryKey: ['project-phases', formData.project_id],
    queryFn: async () => {
      if (!formData.project_id) return [];
      const response = await api.projects.get(formData.project_id);
      return response.data.phases || [];
    },
    enabled: !!formData.project_id
  });

  // Get phases for the selected project
  const availablePhases = useMemo(() => {
    if (!projectPhases || !phases || !Array.isArray(projectPhases)) return [];

    return projectPhases.map((pp: ProjectPhaseLink) => {
      const phaseDetail = (phases as ProjectPhase[]).find((p) => p.id === pp.phase_id);
      return {
        id: pp.phase_id,
        name: phaseDetail?.name || 'Unknown Phase',
        start_date: pp.start_date,
        end_date: pp.end_date
      };
    });
  }, [projectPhases, phases]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Assignment' : 'Create New Assignment'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the assignment details below.'
              : 'Fill in the information to create a new assignment.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">

          {hasErrors && (
            <Alert variant="destructive" className="mb-4" role="alert" aria-live="assertive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                Please fix the errors below before submitting.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="project_id">Project <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
              <Select value={formData.project_id} onValueChange={(value) => handleChange('project_id', value)}>
                <SelectTrigger
                  id="project_id"
                  className={errors.project_id ? 'border-red-500' : ''}
                  aria-required="true"
                  aria-invalid={!!errors.project_id}
                  aria-describedby={errors.project_id ? 'project_id-error' : undefined}
                >
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {(projects?.data as Project[])?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.project_id && <span id="project_id-error" className="text-sm text-red-500" role="alert">{errors.project_id}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="person_id">Person <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
              <Select value={formData.person_id} onValueChange={(value) => handleChange('person_id', value)}>
                <SelectTrigger
                  id="person_id"
                  className={errors.person_id ? 'border-red-500' : ''}
                  aria-required="true"
                  aria-invalid={!!errors.person_id}
                  aria-describedby={errors.person_id ? 'person_id-error' : undefined}
                >
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {(people?.data as Person[])?.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.person_id && <span id="person_id-error" className="text-sm text-red-500" role="alert">{errors.person_id}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role_id">Role <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
              <Select value={formData.role_id} onValueChange={(value) => handleChange('role_id', value)}>
                <SelectTrigger
                  id="role_id"
                  className={errors.role_id ? 'border-red-500' : ''}
                  aria-required="true"
                  aria-invalid={!!errors.role_id}
                  aria-describedby={errors.role_id ? 'role_id-error' : undefined}
                >
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(roles) && (roles as Role[]).map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role_id && <span id="role_id-error" className="text-sm text-red-500" role="alert">{errors.role_id}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phase_id">Phase</Label>
              <Select value={formData.phase_id} onValueChange={(value) => handleChange('phase_id', value)}>
                <SelectTrigger id="phase_id">
                  <SelectValue placeholder="Select phase (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {availablePhases?.map((phase: AvailablePhase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
              <Input
                type="date"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className={errors.start_date ? 'border-red-500' : ''}
                aria-required="true"
                aria-invalid={!!errors.start_date}
                aria-describedby={errors.start_date ? 'start_date-error' : undefined}
              />
              {errors.start_date && <span id="start_date-error" className="text-sm text-red-500" role="alert">{errors.start_date}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
              <Input
                type="date"
                id="end_date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                className={errors.end_date ? 'border-red-500' : ''}
                aria-required="true"
                aria-invalid={!!errors.end_date}
                aria-describedby={errors.end_date ? 'end_date-error' : undefined}
              />
              {errors.end_date && <span id="end_date-error" className="text-sm text-red-500" role="alert">{errors.end_date}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="allocation_percentage">Allocation % <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
              <Input
                type="number"
                id="allocation_percentage"
                value={formData.allocation_percentage}
                onChange={(e) => handleChange('allocation_percentage', parseInt(e.target.value, 10) || 0)}
                min="1"
                max="100"
                className={errors.allocation_percentage ? 'border-red-500' : ''}
                aria-required="true"
                aria-invalid={!!errors.allocation_percentage}
                aria-describedby={errors.allocation_percentage ? 'allocation_percentage-error' : undefined}
              />
              {errors.allocation_percentage && <span id="allocation_percentage-error" className="text-sm text-red-500" role="alert">{errors.allocation_percentage}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment_date_mode">Date Mode</Label>
              <Select value={formData.assignment_date_mode} onValueChange={(value: AssignmentDateMode) => handleChange('assignment_date_mode', value)}>
                <SelectTrigger id="assignment_date_mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Dates</SelectItem>
                  <SelectItem value="phase">Phase-aligned</SelectItem>
                  <SelectItem value="project">Project-aligned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              placeholder="Additional notes about this assignment..."
              aria-describedby="notes-description"
            />
            <span id="notes-description" className="sr-only">Optional additional notes about this assignment</span>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="billable"
              checked={formData.billable}
              onCheckedChange={(checked) => handleChange('billable', checked === true)}
              aria-describedby="billable-description"
            />
            <Label htmlFor="billable">Billable assignment</Label>
            <span id="billable-description" className="sr-only">Mark this assignment as billable to client</span>
          </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditing ? 'Update Assignment' : 'Create Assignment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
