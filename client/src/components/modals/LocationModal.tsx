import React, { useState, useEffect } from 'react';
import { X, MapPin, Save } from 'lucide-react';
import { Location } from '../../types';
import { api } from '../../lib/api-client';

interface LocationModalProps {
  location?: Location | null;
  onSave: () => void;
  onCancel: () => void;
}

export function LocationModal({ location, onSave, onCancel }: LocationModalProps) {
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

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            <MapPin size={20} />
            <h2>{location ? 'Edit Location' : 'Add Location'}</h2>
          </div>
          <button className="modal-close" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., New York City, Remote, London"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Brief description of this location..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}