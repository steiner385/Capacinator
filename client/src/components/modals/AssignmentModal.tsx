import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
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

export const AssignmentModal: React.FC<AssignmentModalProps> = ({ 
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [availabilityWarning, setAvailabilityWarning] = useState<string>('');

  // Update form data when editingAssignment changes
  useEffect(() => {
    if (editingAssignment) {
      setFormData({
        project_id: editingAssignment.project_id || '',
        person_id: editingAssignment.person_id || '',
        role_id: editingAssignment.role_id || '',
        phase_id: editingAssignment.phase_id || '',
        assignment_date_mode: editingAssignment.assignment_date_mode || 'fixed',
        start_date: editingAssignment.start_date || '',
        end_date: editingAssignment.end_date || '',
        allocation_percentage: editingAssignment.allocation_percentage || 100,
        billable: editingAssignment.billable ?? true,
        notes: editingAssignment.notes || ''
      });
    } else {
      setFormData({
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
    }
    // Clear errors when switching between add/edit
    setErrors({});
    setConflicts([]);
    setAvailabilityWarning('');
  }, [editingAssignment]);

  // Fetch data for dropdowns
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
      return response.data;
    }
  });

  // Get project phase timeline for selected project
  const { data: projectPhases } = useQuery({
    queryKey: ['project-phases', formData.project_id],
    queryFn: async () => {
      if (!formData.project_id) return [];
      const response = await api.projectPhases.list({ project_id: formData.project_id });
      return response.data;
    },
    enabled: !!formData.project_id
  });

  // Mutations
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const response = await api.assignments.create(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      if (onSuccess) {
        onSuccess(data);
      }
      onClose();
    }
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const response = await api.assignments.update(editingAssignment.id, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignment', editingAssignment.id] });
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
    if (!formData.project_id) newErrors.project_id = 'Project is required';
    if (!formData.person_id) newErrors.person_id = 'Person is required';
    if (!formData.role_id) newErrors.role_id = 'Role is required';
    
    // Date validation based on assignment mode
    if (formData.assignment_date_mode === 'fixed') {
      if (!formData.start_date) newErrors.start_date = 'Start date is required for fixed mode';
      if (!formData.end_date) newErrors.end_date = 'End date is required for fixed mode';
    } else if (formData.assignment_date_mode === 'phase') {
      if (!formData.phase_id) newErrors.phase_id = 'Phase is required for phase mode';
    }
    
    if (formData.allocation_percentage <= 0 || formData.allocation_percentage > 100) {
      newErrors.allocation_percentage = 'Allocation must be between 1% and 100%';
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

  // Get phases for the selected project from project timeline
  const availablePhases = useMemo(() => {
    if (!projectPhases || !phases) return [];
    
    // Map project phases timeline to phase details
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

  // Filter roles based on selected person
  const filteredRoles = useMemo(() => {
    if (!roles || !people || !formData.person_id) return roles || [];
    
    const selectedPerson = people.find((p: any) => p.id === formData.person_id);
    if (!selectedPerson) return roles || [];
    
    // You could filter roles based on person's capabilities here
    return roles;
  }, [roles, people, formData.person_id]);

  const isLoading = createAssignmentMutation.isPending || updateAssignmentMutation.isPending;

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Assignment' : 'Create New Assignment'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the assignment details below.' 
              : 'Fill in the information to create a new assignment.'}
          </DialogDescription>
        </DialogHeader>

        {hasErrors && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please fix the errors below before submitting.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">Project *</Label>
              <Select value={formData.project_id} onValueChange={(value) => handleChange('project_id', value)}>
                <SelectTrigger className={errors.project_id ? 'border-destructive' : ''}>
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
              {errors.project_id && <p className="text-sm text-destructive">{errors.project_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="person_id">Person *</Label>
              <Select value={formData.person_id} onValueChange={(value) => handleChange('person_id', value)}>
                <SelectTrigger className={errors.person_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {people?.map((person: any) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name} - {person.primary_role_name || 'No Role'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.person_id && <p className="text-sm text-destructive">{errors.person_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role_id">Role *</Label>
              <Select value={formData.role_id} onValueChange={(value) => handleChange('role_id', value)}>
                <SelectTrigger className={errors.role_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {filteredRoles?.map((role: any) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role_id && <p className="text-sm text-destructive">{errors.role_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment_date_mode">Date Mode *</Label>
              <Select 
                value={formData.assignment_date_mode} 
                onValueChange={(value) => handleChange('assignment_date_mode', value as 'fixed' | 'phase' | 'project')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Dates</SelectItem>
                  <SelectItem value="phase">Based on Project Phase</SelectItem>
                  <SelectItem value="project">Based on Entire Project</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Fixed: Use specific dates | Phase: Follow selected phase timeline | Project: Follow project aspiration dates
              </p>
            </div>

            {formData.assignment_date_mode === 'phase' && (
              <div className="space-y-2">
                <Label htmlFor="phase_id">Phase *</Label>
                <Select value={formData.phase_id} onValueChange={(value) => handleChange('phase_id', value)}>
                  <SelectTrigger className={errors.phase_id ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select phase" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePhases?.map((phase: any) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.name} ({phase.start_date} - {phase.end_date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.phase_id && <p className="text-sm text-destructive">{errors.phase_id}</p>}
              </div>
            )}

            {formData.assignment_date_mode === 'fixed' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    type="date"
                    id="start_date"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    className={errors.start_date ? 'border-destructive' : ''}
                  />
                  {errors.start_date && <p className="text-sm text-destructive">{errors.start_date}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    type="date"
                    id="end_date"
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    className={errors.end_date ? 'border-destructive' : ''}
                  />
                  {errors.end_date && <p className="text-sm text-destructive">{errors.end_date}</p>}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="allocation_percentage">Allocation Percentage *</Label>
              <Input
                type="number"
                id="allocation_percentage"
                value={formData.allocation_percentage}
                onChange={(e) => handleChange('allocation_percentage', Number(e.target.value))}
                min="1"
                max="100"
                placeholder="100"
                className={errors.allocation_percentage ? 'border-destructive' : ''}
              />
              {errors.allocation_percentage && <p className="text-sm text-destructive">{errors.allocation_percentage}</p>}
            </div>

            <div className="flex items-center space-x-2 mt-8">
              <Checkbox
                id="billable"
                checked={formData.billable}
                onCheckedChange={(checked) => handleChange('billable', checked)}
              />
              <Label htmlFor="billable" className="cursor-pointer">
                Billable
              </Label>
            </div>
          </div>

          {formData.assignment_date_mode !== 'fixed' && (
            <Alert>
              <AlertDescription>
                <strong>Automatic Dates:</strong> 
                {formData.assignment_date_mode === 'phase' 
                  ? ' Assignment dates will be calculated from the selected project phase timeline.'
                  : ' Assignment dates will be calculated from the project aspiration dates.'
                }
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes about this assignment"
              rows={3}
            />
          </div>

          {/* Conflicts and warnings */}
          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Conflicts detected:</strong>
                <ul className="mt-2 list-disc list-inside">
                  {conflicts.map((conflict, index) => (
                    <li key={index}>{conflict.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {availabilityWarning && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{availabilityWarning}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Spinner className="mr-2" size="sm" />}
              {isEditing ? 'Update Assignment' : 'Create Assignment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentModal;