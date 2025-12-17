import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, MapPin, Building } from 'lucide-react';
import { Location } from '../types';
import { api } from '../lib/api-client';
import { queryKeys } from '../lib/queryKeys';
import { DataTable, Column } from '../components/ui/DataTable';
import { InlineEdit } from '../components/ui/InlineEdit';
import { LocationModal } from '../components/modals/LocationModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import './Locations.css';

export function Locations() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; location: Location | null }>({
    isOpen: false,
    location: null
  });

  // Fetch locations with React Query
  const { data: locations, isLoading, error } = useQuery({
    queryKey: queryKeys.locations.list(),
    queryFn: async () => {
      const response = await api.locations.list();
      const locationsData = response.data?.data || response.data || [];
      return Array.isArray(locationsData) ? locationsData : [];
    }
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Location> }) => {
      await api.locations.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
    },
    onError: (error) => {
      console.error('Failed to update location:', error);
      alert('Failed to update location. Please try again.');
    }
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (locationId: string) => {
      await api.locations.delete(locationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      setDeleteConfirm({ isOpen: false, location: null });
    },
    onError: (error) => {
      console.error('Failed to delete location:', error);
      alert('Failed to delete location. Please try again.');
    }
  });

  const handleCreate = () => {
    setIsModalOpen(true);
  };

  const handleDelete = (location: Location) => {
    setDeleteConfirm({ isOpen: true, location });
  };

  const confirmDelete = () => {
    if (deleteConfirm.location) {
      deleteLocationMutation.mutate(deleteConfirm.location.id);
    }
  };

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
    setIsModalOpen(false);
  };

  // Define columns for the DataTable
  const columns: Column<Location>[] = [
    {
      key: 'name',
      header: 'Location Name',
      sortable: true,
      render: (value, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building size={18} style={{ color: 'var(--primary)' }} />
          <InlineEdit
            value={row.name}
            onSave={(newValue) => {
              updateLocationMutation.mutate({
                id: row.id,
                data: { name: newValue as string }
              });
            }}
            type="text"
            placeholder="Location name"
          />
        </div>
      )
    },
    {
      key: 'description',
      header: 'Description',
      render: (value, row) => (
        <InlineEdit
          value={row.description || ''}
          onSave={(newValue) => {
            updateLocationMutation.mutate({
              id: row.id,
              data: { description: newValue as string }
            });
          }}
          type="textarea"
          placeholder="Add description..."
          rows={2}
        />
      )
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (value) => {
        if (!value) return '-';
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '100px',
      render: (_, row) => (
        <div className="table-actions">
          <button
            className="btn btn-icon btn-sm btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message="Failed to load locations" details={(error as Error).message} />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>
            <MapPin size={24} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Locations
          </h1>
          <p className="text-muted">Manage organizational locations where people and projects are based</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          <Plus size={16} />
          Add Location
        </button>
      </div>

      <DataTable
        data={locations || []}
        columns={columns}
        emptyMessage="No locations found. Start by creating your first location to organize people and projects."
        itemsPerPage={20}
      />

      {isModalOpen && (
        <LocationModal
          location={null}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
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