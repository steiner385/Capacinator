import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';

interface PersonRoleFormData {
  role_id: string;
  proficiency_level: string;
  is_primary: boolean;
  start_date: string;
  end_date: string;
}

interface PersonRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (roleData: any) => void;
  personId: string;
  editingRole?: {
    id: string;
    role_id: string;
    proficiency_level: string;
    is_primary: boolean;
    start_date?: string;
    end_date?: string;
  } | null;
}

const PROFICIENCY_LEVELS = [
  { value: '1', label: '1 - Novice' },
  { value: '2', label: '2 - Beginner' },
  { value: '3', label: '3 - Competent' },
  { value: '4', label: '4 - Proficient' },
  { value: '5', label: '5 - Expert' }
];

const initialValues: PersonRoleFormData = {
  role_id: '',
  proficiency_level: '3',
  is_primary: false,
  start_date: '',
  end_date: ''
};

export default function PersonRoleModal({
  isOpen,
  onClose,
  onSuccess,
  personId,
  editingRole
}: PersonRoleModalProps) {
  const [formData, setFormData] = useState<PersonRoleFormData>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!editingRole;

  // Fetch available roles
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list();
      const rolesData = response.data?.data || response.data || [];
      return Array.isArray(rolesData) ? rolesData : [];
    }
  });

  // Reset form when modal opens/closes or when editing role changes
  useEffect(() => {
    if (isOpen) {
      if (editingRole) {
        setFormData({
          role_id: editingRole.role_id,
          proficiency_level: editingRole.proficiency_level,
          is_primary: editingRole.is_primary,
          start_date: editingRole.start_date || '',
          end_date: editingRole.end_date || ''
        });
      } else {
        setFormData(initialValues);
      }
    }
  }, [isOpen, editingRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = {
        role_id: formData.role_id,
        proficiency_level: parseInt(formData.proficiency_level),
        is_primary: formData.is_primary,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };

      if (editingRole) {
        await api.people.updateRole(personId, editingRole.role_id, submitData);
      } else {
        await api.people.addRole(personId, submitData);
      }

      onSuccess(submitData);
      onClose();
    } catch (error) {
      console.error('Error saving role:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = <K extends keyof PersonRoleFormData>(field: K, value: PersonRoleFormData[K]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClose = () => {
    setTimeout(() => onClose(), 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Role' : 'Add Role'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the role details for this person.'
              : 'Add a new role for this person.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">

          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="role_id">Role <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
            <Select
              value={formData.role_id}
              onValueChange={(value) => handleChange('role_id', value)}
              disabled={isSubmitting || rolesLoading}
            >
              <SelectTrigger id="role_id" aria-required="true">
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(roles) && roles.map((role: any) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proficiency_level">Proficiency Level <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
            <Select
              value={formData.proficiency_level}
              onValueChange={(value) => handleChange('proficiency_level', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="proficiency_level" aria-required="true">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROFICIENCY_LEVELS.map(level => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_primary"
                checked={formData.is_primary}
                onCheckedChange={(checked) => handleChange('is_primary', checked === true)}
                disabled={isSubmitting}
                aria-describedby="is_primary-description"
              />
              <Label htmlFor="is_primary" className="cursor-pointer">
                Set as Primary Role
              </Label>
            </div>
            <p id="is_primary-description" className="text-sm text-muted-foreground">
              If checked, this role will become the person's primary role.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                type="date"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                type="date"
                id="end_date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.role_id}>
                {isSubmitting && <Spinner className="mr-2" size="sm" />}
                {isEditing ? 'Update Role' : 'Add Role'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
