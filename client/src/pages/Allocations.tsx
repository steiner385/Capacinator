import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, Trash2, Edit2, Save, X } from 'lucide-react';
import { api } from '../lib/api-client';
import type { StandardAllocation, ProjectType, ProjectPhase, Role } from '../types';

interface AllocationForm {
  project_type_id: string;
  phase_id: string;
  role_id: string;
  allocation_percentage: number;
}

export default function Allocations() {
  const queryClient = useQueryClient();
  const [selectedProjectType, setSelectedProjectType] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AllocationForm | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAllocation, setNewAllocation] = useState<AllocationForm>({
    project_type_id: '',
    phase_id: '',
    role_id: '',
    allocation_percentage: 0
  });

  // Fetch data
  const { data: allocations, isLoading: allocationsLoading } = useQuery({
    queryKey: ['allocations', selectedProjectType],
    queryFn: async () => {
      try {
        const response = await api.resourceTemplates.list({ 
          project_type_id: selectedProjectType || undefined 
        });
        console.log('Allocations response:', response.data);
        return response.data as StandardAllocation[];
      } catch (error) {
        console.error('Allocations error:', error);
        return [];
      }
    }
  });

  const { data: projectTypes } = useQuery({
    queryKey: ['projectTypes'],
    queryFn: async () => {
      try {
        const response = await api.projectTypes.list();
        return response.data as ProjectType[];
      } catch (error) {
        console.error('Project types error:', error);
        return [];
      }
    }
  });

  const { data: phases } = useQuery({
    queryKey: ['phases'],
    queryFn: async () => {
      try {
        const response = await api.phases.list();
        console.log('Phases response:', response.data);
        // Sort phases by order_index
        const sortedPhases = (response.data as ProjectPhase[]).sort((a, b) => a.order_index - b.order_index);
        return sortedPhases;
      } catch (error) {
        console.error('Phases error:', error);
        return [];
      }
    }
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      try {
        const response = await api.roles.list();
        console.log('Roles response:', response.data);
        return response.data as Role[];
      } catch (error) {
        console.error('Roles error:', error);
        return [];
      }
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: AllocationForm) => api.resourceTemplates.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      setShowAddForm(false);
      setNewAllocation({
        project_type_id: '',
        phase_id: '',
        role_id: '',
        allocation_percentage: 0
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AllocationForm> }) => {
      // For now, we'll use delete and create as a workaround
      return api.resourceTemplates.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      setEditingId(null);
      setEditForm(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      // Delete functionality would need to be implemented in the API
      console.warn('Delete allocation not yet implemented');
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
    }
  });

  const copyMutation = useMutation({
    mutationFn: ({ sourceProjectTypeId, targetProjectTypeId }: { 
      sourceProjectTypeId: string; 
      targetProjectTypeId: string 
    }) => api.resourceTemplates.copy({ sourceProjectTypeId, targetProjectTypeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
    }
  });

  // Group allocations by project type and role for grid display
  const gridData = React.useMemo(() => {
    if (!allocations || !phases || !projectTypes || !roles) return [];
    if (!Array.isArray(allocations)) {
      console.warn('Allocations is not an array:', allocations);
      return [];
    }
    
    // Filter allocations based on selected project type
    const filteredAllocations = selectedProjectType 
      ? allocations.filter(a => a.project_type_id === selectedProjectType)
      : allocations;
    
    // Create a map of unique project type + role combinations
    const combinations = new Map<string, {
      project_type_id: string;
      project_type_name: string;
      role_id: string;
      role_name: string;
      allocations: Record<string, number>; // phase_id -> allocation_percentage
    }>();
    
    // Process all allocations
    filteredAllocations.forEach(allocation => {
      const key = `${allocation.project_type_id}-${allocation.role_id}`;
      
      if (!combinations.has(key)) {
        const projectType = projectTypes.find(pt => pt.id === allocation.project_type_id);
        const role = roles.find(r => r.id === allocation.role_id);
        
        combinations.set(key, {
          project_type_id: allocation.project_type_id,
          project_type_name: projectType?.name || 'Unknown',
          role_id: allocation.role_id,
          role_name: role?.name || 'Unknown',
          allocations: {}
        });
      }
      
      const combo = combinations.get(key)!;
      // Ensure we don't overwrite existing allocations - this might be causing duplicates
      if (!combo.allocations[allocation.phase_id]) {
        combo.allocations[allocation.phase_id] = allocation.allocation_percentage;
      }
    });
    
    // Convert map to array and sort
    const result = Array.from(combinations.values()).sort((a, b) => {
      if (a.project_type_name !== b.project_type_name) {
        return a.project_type_name.localeCompare(b.project_type_name);
      }
      return a.role_name.localeCompare(b.role_name);
    });
    
    return result;
  }, [allocations, phases, projectTypes, roles, selectedProjectType]);

  const handleEdit = (allocation: StandardAllocation) => {
    setEditingId(allocation.id);
    setEditForm({
      project_type_id: allocation.project_type_id,
      phase_id: allocation.phase_id,
      role_id: allocation.role_id,
      allocation_percentage: allocation.allocation_percentage
    });
  };

  const handleSave = () => {
    if (editingId && editForm) {
      updateMutation.mutate({ id: editingId, data: editForm });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleAdd = () => {
    createMutation.mutate(newAllocation);
  };

  const handleCopyAllocations = () => {
    const sourceType = prompt('Copy from project type ID:');
    const targetType = prompt('Copy to project type ID:');
    
    if (sourceType && targetType) {
      copyMutation.mutate({ 
        sourceProjectTypeId: sourceType, 
        targetProjectTypeId: targetType 
      });
    }
  };

  if (allocationsLoading) {
    return <div className="loading">Loading resource templates...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Resource Templates</h1>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleCopyAllocations}
          >
            <Copy size={20} />
            Copy Templates
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={20} />
            Add Template
          </button>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-group">
          <label>Project Type</label>
          <select 
            value={selectedProjectType} 
            onChange={(e) => setSelectedProjectType(e.target.value)}
            className="form-select"
          >
            <option value="">All Project Types</option>
            {projectTypes?.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>
      </div>

      {showAddForm && (
        <div className="add-form-section">
          <h3>Add New Allocation</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Project Type</label>
              <select
                value={newAllocation.project_type_id}
                onChange={(e) => setNewAllocation({...newAllocation, project_type_id: e.target.value})}
                className="form-select"
              >
                <option value="">Select Project Type</option>
                {projectTypes?.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Phase</label>
              <select
                value={newAllocation.phase_id}
                onChange={(e) => setNewAllocation({...newAllocation, phase_id: e.target.value})}
                className="form-select"
              >
                <option value="">Select Phase</option>
                {phases?.map(phase => (
                  <option key={phase.id} value={phase.id}>{phase.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                value={newAllocation.role_id}
                onChange={(e) => setNewAllocation({...newAllocation, role_id: e.target.value})}
                className="form-select"
              >
                <option value="">Select Role</option>
                {roles?.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Allocation %</label>
              <input
                type="number"
                value={newAllocation.allocation_percentage}
                onChange={(e) => setNewAllocation({...newAllocation, allocation_percentage: parseInt(e.target.value) || 0})}
                className="form-input"
                min="0"
                max="40"
              />
            </div>
          </div>
          <div className="form-actions">
            <button 
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={!newAllocation.project_type_id || !newAllocation.phase_id || !newAllocation.role_id}
            >
              Save
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="allocations-grid">
        {!allocations || !phases || !projectTypes || !roles ? (
          <div className="loading">Loading grid data...</div>
        ) : gridData.length === 0 ? (
          <div className="text-muted">No data available</div>
        ) : (
          <>
            <div className="grid-container">
              <table className="allocation-matrix-table">
              <thead>
                <tr>
                  <th className="sticky-col">Project Type</th>
                  <th className="sticky-col">Role</th>
                  {phases.map(phase => (
                    <th key={phase.id} className="phase-col" title={phase.name}>{phase.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gridData.map((row, index) => (
                  <tr key={`${row.project_type_id}-${row.role_id}`}>
                    <td className="sticky-col project-type-col">{row.project_type_name}</td>
                    <td className="sticky-col role-col">{row.role_name}</td>
                    {phases.map(phase => {
                      const allocationValue = row.allocations[phase.id];
                      return (
                        <td key={`${row.project_type_id}-${row.role_id}-${phase.id}`} className="allocation-cell">
                          {allocationValue ? (
                            <span className="allocation-value">{allocationValue}%</span>
                          ) : (
                            <span className="allocation-empty">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}