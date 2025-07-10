import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import FormModal from '../ui/FormModal';

interface PersonFormData {
  name: string;
  email: string;
  phone: string;
  title: string;
  department: string;
  location_id: string;
  primary_role_id: string;
  supervisor_id: string;
  worker_type: string;
  default_availability_percentage: number;
  default_hours_per_day: number;
  start_date: string;
  end_date: string;
  status: string;
}

interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (person: any) => void;
  editingPerson?: any;
}

export const PersonModal: React.FC<PersonModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  editingPerson 
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!editingPerson;
  
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

  // Update form data when editingPerson changes
  useEffect(() => {
    if (editingPerson) {
      setFormData({
        name: editingPerson.name || '',
        email: editingPerson.email || '',
        phone: editingPerson.phone || '',
        title: editingPerson.title || '',
        department: editingPerson.department || '',
        location_id: editingPerson.location_id || '',
        primary_role_id: editingPerson.primary_role_id || '',
        supervisor_id: editingPerson.supervisor_id || '',
        worker_type: editingPerson.worker_type || 'FTE',
        default_availability_percentage: editingPerson.default_availability_percentage || 100,
        default_hours_per_day: editingPerson.default_hours_per_day || 8,
        start_date: editingPerson.start_date || '',
        end_date: editingPerson.end_date || '',
        status: editingPerson.status || 'active'
      });
    } else {
      setFormData({
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
    }
    // Clear errors when switching between add/edit
    setErrors({});
  }, [editingPerson]);

  // Fetch data for dropdowns
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list();
      return response.data.data;
    }
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.locations.list();
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

  // Mutations
  const createPersonMutation = useMutation({
    mutationFn: async (data: PersonFormData) => {
      const response = await api.people.create(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      if (onSuccess) {
        onSuccess(data);
      }
      onClose();
    }
  });

  const updatePersonMutation = useMutation({
    mutationFn: async (data: PersonFormData) => {
      const response = await api.people.update(editingPerson.id, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['person', editingPerson.id] });
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
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (formData.email && !formData.email.includes('@')) newErrors.email = 'Valid email is required';
    if (!formData.primary_role_id) newErrors.primary_role_id = 'Primary role is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    if (isEditing) {
      updatePersonMutation.mutate(formData);
    } else {
      createPersonMutation.mutate(formData);
    }
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
    
    return people.filter((person: any) => {
      // Don't allow a person to be their own supervisor
      if (person.id === formData.supervisor_id) return false;
      
      // If location is selected, prefer supervisors from same location
      if (formData.location_id) {
        return person.location_id === formData.location_id || 
               person.is_supervisor === true;
      }
      
      return person.is_supervisor === true || 
             person.roles?.some((role: any) => role.role_name?.toLowerCase().includes('manager'));
    });
  }, [people, formData.location_id, formData.supervisor_id]);

  const filteredRoles = useMemo(() => {
    if (!roles) return [];
    
    // If location is selected, prefer roles that are common in that location
    if (formData.location_id) {
      return roles.sort((a: any, b: any) => {
        // This is a simple example - in a real app you might have location-specific role preferences
        return a.name.localeCompare(b.name);
      });
    }
    
    return roles;
  }, [roles, formData.location_id]);

  const isLoading = createPersonMutation.isPending || updatePersonMutation.isPending;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Person' : 'Add New Person'}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      size="lg"
      submitText={isEditing ? 'Update Person' : 'Create Person'}
    >
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            type="text"
            id="name"
            className={`form-input ${errors.name ? 'error' : ''}`}
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter full name"
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input
            type="email"
            id="email"
            className={`form-input ${errors.email ? 'error' : ''}`}
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="Enter email address"
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input
            type="tel"
            id="phone"
            className="form-input"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="Enter phone number"
          />
        </div>

        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            className="form-input"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Enter job title"
          />
        </div>

        <div className="form-group">
          <label htmlFor="department">Department</label>
          <input
            type="text"
            id="department"
            className="form-input"
            value={formData.department}
            onChange={(e) => handleChange('department', e.target.value)}
            placeholder="Enter department"
          />
        </div>

        <div className="form-group">
          <label htmlFor="location_id">Location</label>
          <select
            id="location_id"
            className="form-select"
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
        </div>

        <div className="form-group">
          <label htmlFor="primary_role_id">Primary Role *</label>
          <select
            id="primary_role_id"
            className={`form-select ${errors.primary_role_id ? 'error' : ''}`}
            value={formData.primary_role_id}
            onChange={(e) => handleChange('primary_role_id', e.target.value)}
          >
            <option value="">Select primary role</option>
            {filteredRoles?.map((role: any) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          {errors.primary_role_id && <span className="error-message">{errors.primary_role_id}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="supervisor_id">Supervisor</label>
          <select
            id="supervisor_id"
            className="form-select"
            value={formData.supervisor_id}
            onChange={(e) => handleChange('supervisor_id', e.target.value)}
          >
            <option value="">Select supervisor</option>
            {filteredSupervisors?.map((person: any) => (
              <option key={person.id} value={person.id}>
                {person.name} ({person.title || 'No Title'})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="worker_type">Worker Type</label>
          <select
            id="worker_type"
            className="form-select"
            value={formData.worker_type}
            onChange={(e) => handleChange('worker_type', e.target.value)}
          >
            <option value="FTE">Full-time Employee</option>
            <option value="contractor">Contractor</option>
            <option value="intern">Intern</option>
            <option value="consultant">Consultant</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="default_availability_percentage">Default Availability (%)</label>
          <input
            type="number"
            id="default_availability_percentage"
            className="form-input"
            value={formData.default_availability_percentage}
            onChange={(e) => handleChange('default_availability_percentage', Number(e.target.value))}
            min="0"
            max="100"
            placeholder="100"
          />
        </div>

        <div className="form-group">
          <label htmlFor="default_hours_per_day">Default Hours per Day</label>
          <input
            type="number"
            id="default_hours_per_day"
            className="form-input"
            value={formData.default_hours_per_day}
            onChange={(e) => handleChange('default_hours_per_day', Number(e.target.value))}
            min="1"
            max="24"
            step="0.5"
            placeholder="8"
          />
        </div>

        <div className="form-group">
          <label htmlFor="start_date">Start Date</label>
          <input
            type="date"
            id="start_date"
            className="form-input"
            value={formData.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="end_date">End Date</label>
          <input
            type="date"
            id="end_date"
            className="form-input"
            value={formData.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            className="form-select"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>
    </FormModal>
  );
};

export default PersonModal;