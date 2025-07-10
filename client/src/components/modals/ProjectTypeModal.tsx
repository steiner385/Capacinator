import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import FormModal from '../ui/FormModal';

interface ProjectTypeFormData {
  name: string;
  description: string;
  color_code: string;
}

interface ProjectTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (projectType: any) => void;
  editingProjectType?: any;
}

const DEFAULT_COLORS = [
  '#4f46e5', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#ec4899', // pink
  '#6b7280', // gray
];

export const ProjectTypeModal: React.FC<ProjectTypeModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  editingProjectType 
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!editingProjectType;
  
  const [formData, setFormData] = useState<ProjectTypeFormData>({
    name: '',
    description: '',
    color_code: DEFAULT_COLORS[0]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when editingProjectType changes
  useEffect(() => {
    if (editingProjectType) {
      setFormData({
        name: editingProjectType.name || '',
        description: editingProjectType.description || '',
        color_code: editingProjectType.color_code || DEFAULT_COLORS[0]
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color_code: DEFAULT_COLORS[0]
      });
    }
    // Clear errors when switching between add/edit
    setErrors({});
  }, [editingProjectType]);

  // Mutations
  const createProjectTypeMutation = useMutation({
    mutationFn: async (data: ProjectTypeFormData) => {
      const response = await api.projectTypes.create(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
      queryClient.invalidateQueries({ queryKey: ['project-types'] });
      if (onSuccess) {
        onSuccess(data);
      }
      onClose();
    }
  });

  const updateProjectTypeMutation = useMutation({
    mutationFn: async (data: ProjectTypeFormData) => {
      const response = await api.projectTypes.update(editingProjectType.id, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
      queryClient.invalidateQueries({ queryKey: ['project-types'] });
      queryClient.invalidateQueries({ queryKey: ['projectType', editingProjectType.id] });
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
    if (!formData.name.trim()) newErrors.name = 'Project type name is required';
    if (formData.name.length > 100) newErrors.name = 'Project type name must be less than 100 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    if (isEditing) {
      updateProjectTypeMutation.mutate(formData);
    } else {
      createProjectTypeMutation.mutate(formData);
    }
  };

  const handleChange = (field: keyof ProjectTypeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isLoading = createProjectTypeMutation.isPending || updateProjectTypeMutation.isPending;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Project Type' : 'Create Project Type'}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      size="md"
      submitText={isEditing ? 'Update Project Type' : 'Create Project Type'}
    >
      <div className="form-grid">
        <div className="form-group full-width">
          <label htmlFor="name">Name *</label>
          <input
            type="text"
            id="name"
            className={`form-input ${errors.name ? 'error' : ''}`}
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter project type name"
            maxLength={100}
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>

        <div className="form-group full-width">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            className="form-textarea"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Enter project type description (optional)"
            rows={3}
          />
        </div>

        <div className="form-group full-width">
          <label htmlFor="color_code">Color</label>
          <div className="color-picker-container">
            <input
              type="color"
              id="color_code"
              className="form-color-input"
              value={formData.color_code}
              onChange={(e) => handleChange('color_code', e.target.value)}
            />
            <div className="color-preview-container">
              <div className="color-swatches">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-swatch ${formData.color_code === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleChange('color_code', color)}
                    title={`Select ${color}`}
                  />
                ))}
              </div>
              <div className="color-preview">
                <div 
                  className="color-preview-box"
                  style={{ backgroundColor: formData.color_code }}
                />
                <span className="color-code-text">{formData.color_code}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FormModal>
  );
};

export default ProjectTypeModal;