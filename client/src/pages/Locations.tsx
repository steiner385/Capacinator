import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Users, Building } from 'lucide-react';
import { Location } from '../types';
import { api } from '../lib/api-client';
import { LocationModal } from '../components/modals/LocationModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import './Locations.css';

export function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; location: Location | null }>({
    isOpen: false,
    location: null
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const response = await api.locations.list();
      // Handle both wrapped {data: [...]} and direct array [...] responses
      const locationsData = response.data?.data || response.data || [];
      setLocations(Array.isArray(locationsData) ? locationsData : []);
    } catch (err) {
      setError('Failed to load locations');
      console.error('Error loading locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedLocation(null);
    setIsModalOpen(true);
  };

  const handleEdit = (location: Location) => {
    setSelectedLocation(location);
    setIsModalOpen(true);
  };

  const handleDelete = (location: Location) => {
    setDeleteConfirm({ isOpen: true, location });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.location) return;

    try {
      await api.locations.delete(deleteConfirm.location.id);
      await loadLocations();
      setDeleteConfirm({ isOpen: false, location: null });
    } catch (err) {
      setError('Failed to delete location');
      console.error('Error deleting location:', err);
    }
  };

  const handleSave = async () => {
    await loadLocations();
    setIsModalOpen(false);
    setSelectedLocation(null);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading locations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <MapPin size={24} />
          <h1>Locations</h1>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          <Plus size={16} />
          Add Location
        </button>
      </div>

      <div className="page-description">
        <p>Manage organizational locations where people and projects are based.</p>
      </div>

      <div className="locations-grid">
        {locations.map((location) => (
          <div key={location.id} className="location-card">
            <div className="location-header">
              <div className="location-title">
                <Building size={20} />
                <h3>{location.name}</h3>
              </div>
              <div className="location-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleEdit(location)}
                  title="Edit location"
                >
                  <Edit size={16} />
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-danger"
                  onClick={() => handleDelete(location)}
                  title="Delete location"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            {location.description && (
              <p className="location-description">{location.description}</p>
            )}

            <div className="location-stats">
              <div className="stat">
                <Users size={16} />
                <span>People & Projects</span>
              </div>
            </div>

            <div className="location-meta">
              <small className="text-muted">
                Created: {new Date(location.created_at!).toLocaleDateString()}
              </small>
            </div>
          </div>
        ))}
      </div>

      {locations.length === 0 && (
        <div className="empty-state">
          <MapPin size={48} />
          <h3>No locations found</h3>
          <p>Start by creating your first location to organize people and projects.</p>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={16} />
            Add First Location
          </button>
        </div>
      )}

      {isModalOpen && (
        <LocationModal
          location={selectedLocation}
          onSave={handleSave}
          onCancel={() => {
            setIsModalOpen(false);
            setSelectedLocation(null);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Location"
        message={`Are you sure you want to delete "${deleteConfirm.location?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, location: null })}
        variant="danger"
      />
    </div>
  );
}