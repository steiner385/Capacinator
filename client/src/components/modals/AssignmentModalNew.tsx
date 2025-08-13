import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
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
  onSuccess?: (assignment: any) => void;
  editingAssignment?: any;
}

export const AssignmentModalNew: React.FC<AssignmentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  editingAssignment 
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!editingAssignment;
  
  const [formData, setFormData] = useState<AssignmentFormData>({
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
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof AssignmentFormData, string>>>({});

  // Fetch data
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.projects.list();
      return response.data.data;
    }
  });

  const { data: people } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const response = await api.people.list();
      return response.data.data;
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
      return response.data.data.phases || [];
    },
    enabled: !!formData.project_id
  });

  // Initialize form data when editing
  useEffect(() => {
    if (editingAssignment) {
      setFormData({
        project_id: editingAssignment.project_id || '',
        person_id: editingAssignment.person_id || '',
        role_id: editingAssignment.role_id || '',
        phase_id: editingAssignment.phase_id || '',
        assignment_date_mode: editingAssignment.assignment_date_mode || 'fixed',
        start_date: editingAssignment.start_date?.split('T')[0] || '',
        end_date: editingAssignment.end_date?.split('T')[0] || '',
        allocation_percentage: editingAssignment.allocation_percentage || 100,
        billable: editingAssignment.billable ?? true,
        notes: editingAssignment.notes || ''
      });
    }
  }, [editingAssignment]);

  // Mutations
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const response = await api.assignments.create(data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      if (onSuccess) onSuccess(data);
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to create assignment:', error);
    }
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const response = await api.assignments.update(editingAssignment.id, data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      if (onSuccess) onSuccess(data);
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to update assignment:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const newErrors: Partial<Record<keyof AssignmentFormData, string>> = {};
    
    if (!formData.project_id) newErrors.project_id = 'Project is required';
    if (!formData.person_id) newErrors.person_id = 'Person is required';
    if (!formData.role_id) newErrors.role_id = 'Role is required';
    if (!formData.start_date) newErrors.start_date = 'Start date is required';
    if (!formData.end_date) newErrors.end_date = 'End date is required';
    if (formData.allocation_percentage <= 0 || formData.allocation_percentage > 100) {
      newErrors.allocation_percentage = 'Allocation must be between 1 and 100';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    if (isEditing) {
      updateAssignmentMutation.mutate(formData);
    } else {
      createAssignmentMutation.mutate(formData);
    }
  };

  const handleChange = (field: keyof AssignmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Get phases for the selected project
  const availablePhases = useMemo(() => {
    if (!projectPhases || !phases) return [];
    
    return projectPhases.map((pp: any) => {
      const phaseDetail = phases.find((p: any) => p.id === pp.phase_id);
      return {
        id: pp.phase_id,
        name: phaseDetail?.name || 'Unknown Phase',
        start_date: pp.start_date,
        end_date: pp.end_date
      };
    });
  }, [projectPhases, phases]);

  const isLoading = createAssignmentMutation.isPending || updateAssignmentMutation.isPending;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <PortalModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Assignment' : 'Create New Assignment'}
    >
      <div className="p-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {isEditing 
            ? 'Update the assignment details below.' 
            : 'Fill in the information to create a new assignment.'}
        </p>

        {hasErrors && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please fix the errors below before submitting.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="project_id">Project *</Label>
              <Select value={formData.project_id} onValueChange={(value) => handleChange('project_id', value)}>
                <SelectTrigger className={errors.project_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.project_id && <span className="text-sm text-red-500">{errors.project_id}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="person_id">Person *</Label>
              <Select value={formData.person_id} onValueChange={(value) => handleChange('person_id', value)}>
                <SelectTrigger className={errors.person_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {people?.map((person: any) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.person_id && <span className="text-sm text-red-500">{errors.person_id}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role_id">Role *</Label>
              <Select value={formData.role_id} onValueChange={(value) => handleChange('role_id', value)}>
                <SelectTrigger className={errors.role_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role: any) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role_id && <span className="text-sm text-red-500">{errors.role_id}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phase_id">Phase</Label>
              <Select value={formData.phase_id} onValueChange={(value) => handleChange('phase_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select phase (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {availablePhases?.map((phase: any) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                type="date"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className={errors.start_date ? 'border-red-500' : ''}
              />
              {errors.start_date && <span className="text-sm text-red-500">{errors.start_date}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                type="date"
                id="end_date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                className={errors.end_date ? 'border-red-500' : ''}
              />
              {errors.end_date && <span className="text-sm text-red-500">{errors.end_date}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="allocation_percentage">Allocation % *</Label>
              <Input
                type="number"
                id="allocation_percentage"
                value={formData.allocation_percentage}
                onChange={(e) => handleChange('allocation_percentage', parseInt(e.target.value) || 0)}
                min="1"
                max="100"
                className={errors.allocation_percentage ? 'border-red-500' : ''}
              />
              {errors.allocation_percentage && <span className="text-sm text-red-500">{errors.allocation_percentage}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment_date_mode">Date Mode</Label>
              <Select value={formData.assignment_date_mode} onValueChange={(value: any) => handleChange('assignment_date_mode', value)}>
                <SelectTrigger>
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
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="billable"
              checked={formData.billable}
              onCheckedChange={(checked) => handleChange('billable', checked === true)}
            />
            <Label htmlFor="billable">Billable assignment</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update Assignment' : 'Create Assignment'
              )}
            </Button>
          </div>
        </form>
      </div>
    </PortalModal>
  );
};