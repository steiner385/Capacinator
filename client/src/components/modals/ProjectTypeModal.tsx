import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Spinner } from '../ui/spinner';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const hasErrors = Object.keys(errors).length > 0;

  const handleClose = () => {
    // Give time for animation before calling onClose
    setTimeout(() => onClose(), 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Project Type' : 'Create Project Type'}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {isEditing 
            ? 'Update the project type details below.' 
            : 'Fill in the information to create a new project type.'}
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
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter project type name"
              maxLength={100}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter project type description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color_code">Color</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  id="color_code"
                  value={formData.color_code}
                  onChange={(e) => handleChange('color_code', e.target.value)}
                  className="h-10 w-20 cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{formData.color_code}</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-md border-2 transition-all",
                      formData.color_code === color 
                        ? "border-primary scale-110" 
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => handleChange('color_code', color)}
                    title={`Select ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Spinner className="mr-2" size="sm" />}
                {isEditing ? 'Update Project Type' : 'Create Project Type'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectTypeModal;