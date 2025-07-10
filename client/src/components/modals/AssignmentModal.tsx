import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api-client';
import FormModal from '../ui/FormModal';

interface AssignmentFormData {
  project_id: string;
  person_id: string;
  role_id: string;
  phase_id: string;
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
      return response.data.data;
    }
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
    if (!formData.start_date) newErrors.start_date = 'Start date is required';
    if (!formData.end_date) newErrors.end_date = 'End date is required';
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

  // Filter phases based on selected project
  const filteredPhases = useMemo(() => {
    if (!phases || !formData.project_id) return [];
    
    return phases.filter((phase: any) => phase.project_id === formData.project_id);
  }, [phases, formData.project_id]);

  // Filter roles based on selected person
  const filteredRoles = useMemo(() => {
    if (!roles || !people || !formData.person_id) return roles || [];
    
    const selectedPerson = people.find((p: any) => p.id === formData.person_id);
    if (!selectedPerson) return roles || [];
    
    // You could filter roles based on person's capabilities here
    return roles;
  }, [roles, people, formData.person_id]);

  const isLoading = createAssignmentMutation.isPending || updateAssignmentMutation.isPending;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Assignment' : 'Create New Assignment'}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      size="lg"
      submitText={isEditing ? 'Update Assignment' : 'Create Assignment'}
    >
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="project_id">Project *</label>
          <select
            id="project_id"
            className={`form-select ${errors.project_id ? 'error' : ''}`}
            value={formData.project_id}
            onChange={(e) => handleChange('project_id', e.target.value)}
          >
            <option value="">Select project</option>
            {projects?.map((project: any) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {errors.project_id && <span className="error-message">{errors.project_id}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="person_id">Person *</label>
          <select
            id="person_id"
            className={`form-select ${errors.person_id ? 'error' : ''}`}
            value={formData.person_id}
            onChange={(e) => handleChange('person_id', e.target.value)}
          >
            <option value="">Select person</option>
            {people?.map((person: any) => (
              <option key={person.id} value={person.id}>
                {person.name} - {person.primary_role_name || 'No Role'}
              </option>
            ))}
          </select>
          {errors.person_id && <span className="error-message">{errors.person_id}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="role_id">Role *</label>
          <select
            id="role_id"
            className={`form-select ${errors.role_id ? 'error' : ''}`}
            value={formData.role_id}
            onChange={(e) => handleChange('role_id', e.target.value)}
          >
            <option value="">Select role</option>
            {filteredRoles?.map((role: any) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          {errors.role_id && <span className="error-message">{errors.role_id}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="phase_id">Phase</label>
          <select
            id="phase_id"
            className="form-select"
            value={formData.phase_id}
            onChange={(e) => handleChange('phase_id', e.target.value)}
          >
            <option value="">Select phase (optional)</option>
            {filteredPhases?.map((phase: any) => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="start_date">Start Date *</label>
          <input
            type="date"
            id="start_date"
            className={`form-input ${errors.start_date ? 'error' : ''}`}
            value={formData.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
          />
          {errors.start_date && <span className="error-message">{errors.start_date}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="end_date">End Date *</label>
          <input
            type="date"
            id="end_date"
            className={`form-input ${errors.end_date ? 'error' : ''}`}
            value={formData.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
          />
          {errors.end_date && <span className="error-message">{errors.end_date}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="allocation_percentage">Allocation Percentage *</label>
          <input
            type="number"
            id="allocation_percentage"
            className={`form-input ${errors.allocation_percentage ? 'error' : ''}`}
            value={formData.allocation_percentage}
            onChange={(e) => handleChange('allocation_percentage', Number(e.target.value))}
            min="1"
            max="100"
            placeholder="100"
          />
          {errors.allocation_percentage && <span className="error-message">{errors.allocation_percentage}</span>}
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.billable}
              onChange={(e) => handleChange('billable', e.target.checked)}
            />
            <span className="checkbox-text">Billable</span>
          </label>
        </div>

        <div className="form-group full-width">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            className="form-textarea"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Additional notes about this assignment"
            rows={3}
          />
        </div>
      </div>

      {/* Conflicts and warnings */}
      {conflicts.length > 0 && (
        <div className="form-group full-width">
          <div className="alert alert-warning">
            <AlertTriangle size={16} />
            <strong>Conflicts detected:</strong>
            <ul>
              {conflicts.map((conflict, index) => (
                <li key={index}>{conflict.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {availabilityWarning && (
        <div className="form-group full-width">
          <div className="alert alert-info">
            <AlertTriangle size={16} />
            {availabilityWarning}
          </div>
        </div>
      )}
    </FormModal>
  );
};

export default AssignmentModal;