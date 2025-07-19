import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api-client';

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

export default function PersonRoleModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  personId, 
  editingRole 
}: PersonRoleModalProps) {
  const [formData, setFormData] = useState({
    role_id: '',
    proficiency_level: '3',
    is_primary: false,
    start_date: '',
    end_date: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available roles
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list();
      return response.data;
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
        setFormData({
          role_id: '',
          proficiency_level: '3',
          is_primary: false,
          start_date: '',
          end_date: ''
        });
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
        // Update existing role
        await api.people.updateRole(personId, editingRole.role_id, submitData);
      } else {
        // Add new role
        await api.people.addRole(personId, submitData);
      }

      onSuccess(submitData);
      onClose();
    } catch (error) {
      console.error('Error saving role:', error);
      // Handle error (could show a toast or set error state)
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{editingRole ? 'Edit Role' : 'Add Role'}</h2>
          <button 
            className="btn btn-icon"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="role_id">Role *</label>
            <select
              id="role_id"
              value={formData.role_id}
              onChange={(e) => handleInputChange('role_id', e.target.value)}
              className="form-select"
              required
              disabled={isSubmitting || rolesLoading}
            >
              <option value="">Select a role...</option>
              {roles?.map((role: any) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="proficiency_level">Proficiency Level *</label>
            <select
              id="proficiency_level"
              value={formData.proficiency_level}
              onChange={(e) => handleInputChange('proficiency_level', e.target.value)}
              className="form-select"
              required
              disabled={isSubmitting}
            >
              {PROFICIENCY_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_primary}
                onChange={(e) => handleInputChange('is_primary', e.target.checked)}
                disabled={isSubmitting}
              />
              <span className="checkbox-text">Set as Primary Role</span>
            </label>
            <div className="form-help">
              If checked, this role will become the person's primary role.
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">Start Date</label>
              <input
                type="date"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className="form-input"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="end_date">End Date</label>
              <input
                type="date"
                id="end_date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                className="form-input"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !formData.role_id}
            >
              {isSubmitting ? 'Saving...' : (editingRole ? 'Update Role' : 'Add Role')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}