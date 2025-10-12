import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle } from 'lucide-react';
import { Spinner } from '../ui/spinner';

interface PersonFormData {
  name: string;
  email: string;
  phone: string;
  title: string;
  department: string;
  location_id: string;
  primary_person_role_id: string;
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
    primary_person_role_id: '',
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
        primary_person_role_id: editingPerson.primary_person_role_id || '',
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
        primary_person_role_id: '',
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
    if (!formData.primary_person_role_id) newErrors.primary_person_role_id = 'Primary role is required';

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
    if (!people || !Array.isArray(people)) return [];
    
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

  const hasErrors = Object.keys(errors).length > 0;

  const handleClose = () => {
    // Give time for animation before calling onClose
    setTimeout(() => onClose(), 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Person' : 'Add New Person'}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {isEditing 
              ? 'Update the person\'s information below.' 
              : 'Fill in the information to create a new person.'}
          </p>

          {hasErrors && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please fix the errors below before submitting.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter full name"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Enter email address"
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Enter job title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                placeholder="Enter department"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_id">Location</Label>
              <Select value={formData.location_id || 'none'} onValueChange={(value) => handleChange('location_id', value === 'none' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {locations?.map((location: any) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_person_role_id">Primary Role *</Label>
              <Select 
                value={formData.primary_person_role_id} 
                onValueChange={(value) => handleChange('primary_person_role_id', value)}
              >
                <SelectTrigger className={errors.primary_person_role_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select primary role" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(filteredRoles) ? filteredRoles.map((role: any) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  )) : []}
                </SelectContent>
              </Select>
              {errors.primary_person_role_id && <p className="text-sm text-destructive">{errors.primary_person_role_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="supervisor_id">Supervisor</Label>
              <Select value={formData.supervisor_id || 'none'} onValueChange={(value) => handleChange('supervisor_id', value === 'none' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supervisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {filteredSupervisors?.map((person: any) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name} ({person.title || 'No Title'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="worker_type">Worker Type</Label>
              <Select value={formData.worker_type} onValueChange={(value) => handleChange('worker_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FTE">Full-time Employee</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_availability_percentage">Default Availability (%)</Label>
              <Input
                type="number"
                id="default_availability_percentage"
                value={formData.default_availability_percentage}
                onChange={(e) => handleChange('default_availability_percentage', Number(e.target.value))}
                min="0"
                max="100"
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_hours_per_day">Default Hours per Day</Label>
              <Input
                type="number"
                id="default_hours_per_day"
                value={formData.default_hours_per_day}
                onChange={(e) => handleChange('default_hours_per_day', Number(e.target.value))}
                min="1"
                max="24"
                step="0.5"
                placeholder="8"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                type="date"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                type="date"
                id="end_date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Spinner className="mr-2" size="sm" />}
                {isEditing ? 'Update Person' : 'Create Person'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonModal;