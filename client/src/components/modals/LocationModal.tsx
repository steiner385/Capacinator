import React, { useState, useEffect } from 'react';
import { MapPin, Save } from 'lucide-react';
import { Location } from '../../types';
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
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';

interface LocationModalProps {
  location?: Location | null;
  onSave: () => void;
  onCancel: () => void;
}

export function LocationModal({ location, onSave, onCancel }: LocationModalProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        description: location.description || ''
      });
    } else {
      setFormData({
        name: '',
        description: ''
      });
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (location) {
        // Update existing location
        await api.locations.update(location.id, formData);
      } else {
        // Create new location
        await api.locations.create(formData);
      }

      onSave();
    } catch (err) {
      setError('Failed to save location');
      console.error('Error saving location:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClose = () => {
    setIsOpen(false);
    // Give time for animation before calling onCancel
    setTimeout(() => onCancel(), 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{location ? 'Edit Location' : 'Add Location'}</DialogTitle>
          <DialogDescription>
            {location
              ? 'Update the location details below.'
              : 'Fill in the information to create a new location.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive" role="alert" aria-live="assertive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name <span aria-hidden="true">*</span><span className="sr-only">(required)</span></Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., New York City, Remote, London"
                  required
                  aria-required="true"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Brief description of this location..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Location'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}