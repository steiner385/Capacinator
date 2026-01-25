import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import { queryKeys } from '../../lib/queryKeys';
import { useModalForm } from '../../hooks/useModalForm';
import {
  validateEmail,
  validateDateRange,
  validateAvailabilityPercentage,
  validateHoursPerDay,
} from '../../lib/validation';
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
import { AlertCircle } from 'lucide-react';
import { Spinner } from '../ui/spinner';
import type { Location, Role } from '../../types';

// Person with roles for supervisor filtering
interface PersonWithRoles {
  id: string;
  name: string;
  title?: string;
  location_id?: string;
  is_supervisor?: boolean;
  roles?: Array<{ role_name?: string }>;
}

// Person type for editing
interface EditablePerson {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  location_id?: string;
  primary_person_role_id?: string;
  supervisor_id?: string;
  worker_type?: string;
  default_availability_percentage?: number;
  default_hours_per_day?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
}

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
  onSuccess?: (person: EditablePerson) => void;
  editingPerson?: EditablePerson;
}

const initialValues: PersonFormData = {
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
};

const validatePerson = (values: PersonFormData): Partial<Record<keyof PersonFormData, string>> => {
  const errors: Partial<Record<keyof PersonFormData, string>> = {};

  if (!values.name.trim()) errors.name = 'Name is required';

  // Email validation using utility
  const emailValidation = validateEmail(values.email);
  if (emailValidation !== true) errors.email = emailValidation;

  if (!values.primary_person_role_id) errors.primary_person_role_id = 'Primary role is required';

  // Availability percentage validation
  if (values.default_availability_percentage) {
    const availValidation = validateAvailabilityPercentage(values.default_availability_percentage);
    if (availValidation !== true) errors.default_availability_percentage = availValidation;
  }

  // Hours per day validation
  if (values.default_hours_per_day) {
    const hoursValidation = validateHoursPerDay(values.default_hours_per_day);
    if (hoursValidation !== true) errors.default_hours_per_day = hoursValidation;
  }

  // Date range validation (optional but must be consistent if provided)
  if (values.start_date || values.end_date) {
    const dateValidation = validateDateRange(values.start_date, values.end_date);
    if (dateValidation !== true) {
      errors.end_date = dateValidation;
    }
  }

  return errors;
};

export const PersonModal: React.FC<PersonModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingPerson
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
  } = useModalForm<PersonFormData>({
    initialValues,
    validate: validatePerson,
    onCreate: async (data) => {
      const response = await api.people.create(data);
      return response.data;
    },
    onUpdate: async (id, data) => {
      const response = await api.people.update(id, data);
      return response.data;
    },
    queryKeysToInvalidate: [queryKeys.people.all],
    additionalUpdateQueryKeys: (item) => [queryKeys.people.detail(item.id)],
    onSuccess: (data) => {
      if (onSuccess) onSuccess(data);
    },
    onClose,
    editingItem: editingPerson,
    getValuesFromItem: (item) => ({
      name: item.name || '',
      email: item.email || '',
      phone: item.phone || '',
      title: item.title || '',
      department: item.department || '',
      location_id: item.location_id || '',
      primary_person_role_id: item.primary_person_role_id || '',
      supervisor_id: item.supervisor_id || '',
      worker_type: item.worker_type || 'FTE',
      default_availability_percentage: item.default_availability_percentage || 100,
      default_hours_per_day: item.default_hours_per_day || 8,
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      status: item.status || 'active'
    }),
  });

  // Fetch data for dropdowns
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list();
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

  // Filtered data based on selections
  const filteredSupervisors = useMemo(() => {
    if (!people || !Array.isArray(people)) return [];

    return people.filter((person: PersonWithRoles) => {
      if (person.id === formData.supervisor_id) return false;

      if (formData.location_id) {
        return person.location_id === formData.location_id ||
               person.is_supervisor === true;
      }

      return person.is_supervisor === true ||
             person.roles?.some((role) => role.role_name?.toLowerCase().includes('manager'));
    });
  }, [people, formData.location_id, formData.supervisor_id]);

  const filteredRoles = useMemo(() => {
    if (!roles) return [];

    if (formData.location_id) {
      return (roles as Role[]).sort((a, b) => a.name.localeCompare(b.name));
    }

    return roles;
  }, [roles, formData.location_id]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Person' : 'Add New Person'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the person\'s information below.'
              : 'Fill in the information to create a new person.'}
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
              <Label htmlFor="name">Name <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter full name"
                className={errors.name ? 'border-destructive' : ''}
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && <p id="name-error" className="text-sm text-destructive" role="alert">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
              <Input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Enter email address"
                className={errors.email ? 'border-destructive' : ''}
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && <p id="email-error" className="text-sm text-destructive" role="alert">{errors.email}</p>}
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
                <SelectTrigger id="location_id">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(locations as Location[])?.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_person_role_id">Primary Role <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
              <Select
                value={formData.primary_person_role_id}
                onValueChange={(value) => handleChange('primary_person_role_id', value)}
              >
                <SelectTrigger
                  id="primary_person_role_id"
                  className={errors.primary_person_role_id ? 'border-destructive' : ''}
                  aria-required="true"
                  aria-invalid={!!errors.primary_person_role_id}
                  aria-describedby={errors.primary_person_role_id ? 'primary_person_role_id-error' : undefined}
                >
                  <SelectValue placeholder="Select primary role" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(filteredRoles) ? filteredRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  )) : []}
                </SelectContent>
              </Select>
              {errors.primary_person_role_id && <p id="primary_person_role_id-error" className="text-sm text-destructive" role="alert">{errors.primary_person_role_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="supervisor_id">Supervisor</Label>
              <Select value={formData.supervisor_id || 'none'} onValueChange={(value) => handleChange('supervisor_id', value === 'none' ? '' : value)}>
                <SelectTrigger id="supervisor_id">
                  <SelectValue placeholder="Select supervisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {filteredSupervisors?.map((person) => (
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
                <SelectTrigger id="worker_type">
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
                <SelectTrigger id="status">
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="mr-2" size="sm" />}
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
