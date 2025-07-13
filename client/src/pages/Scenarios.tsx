import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  GitBranch, 
  Plus, 
  Edit3, 
  Trash2, 
  Merge, 
  ArrowRightLeft,
  Users,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { api } from '../lib/api-client';
import { Scenario } from '../types';
import { useUser } from '../contexts/UserContext';
import './Scenarios.css';

interface ScenarioCardProps {
  scenario: Scenario;
  onEdit: (scenario: Scenario) => void;
  onDelete: (scenario: Scenario) => void;
  onBranch: (scenario: Scenario) => void;
  onMerge: (scenario: Scenario) => void;
  onCompare: (scenario: Scenario) => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  onEdit,
  onDelete,
  onBranch,
  onMerge,
  onCompare
}) => {
  const isBaseline = scenario.scenario_type === 'baseline';
  const canMerge = scenario.parent_scenario_id && scenario.status === 'active';

  return (
    <div className={`scenario-card ${scenario.scenario_type}`}>
      <div className="scenario-header">
        <div className="scenario-icon">
          <GitBranch size={20} />
        </div>
        <div className="scenario-info">
          <h3 className="scenario-name">{scenario.name}</h3>
          <div className="scenario-meta">
            <span className={`scenario-type ${scenario.scenario_type}`}>
              {scenario.scenario_type}
            </span>
            <span className={`scenario-status ${scenario.status}`}>
              {scenario.status}
            </span>
          </div>
        </div>
      </div>

      {scenario.description && (
        <p className="scenario-description">{scenario.description}</p>
      )}

      <div className="scenario-details">
        <div className="scenario-detail">
          <Users size={14} />
          <span>Created by {scenario.created_by_name}</span>
        </div>
        {scenario.branch_point && (
          <div className="scenario-detail">
            <Calendar size={14} />
            <span>Branched {new Date(scenario.branch_point).toLocaleDateString()}</span>
          </div>
        )}
        {scenario.parent_scenario_name && (
          <div className="scenario-detail">
            <GitBranch size={14} />
            <span>From {scenario.parent_scenario_name}</span>
          </div>
        )}
      </div>

      <div className="scenario-actions">
        <button
          onClick={() => onBranch(scenario)}
          className="action-button branch"
          title="Create Branch"
        >
          <GitBranch size={16} />
          Branch
        </button>
        
        <button
          onClick={() => onCompare(scenario)}
          className="action-button compare"
          title="Compare Scenarios"
        >
          <ArrowRightLeft size={16} />
          Compare
        </button>

        {canMerge && (
          <button
            onClick={() => onMerge(scenario)}
            className="action-button merge"
            title="Merge to Parent"
          >
            <Merge size={16} />
            Merge
          </button>
        )}

        <button
          onClick={() => onEdit(scenario)}
          className="action-button edit"
          title="Edit Scenario"
        >
          <Edit3 size={16} />
        </button>

        {!isBaseline && (
          <button
            onClick={() => onDelete(scenario)}
            className="action-button delete"
            title="Delete Scenario"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

interface CreateScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentScenario?: Scenario;
}

const CreateScenarioModal: React.FC<CreateScenarioModalProps> = ({
  isOpen,
  onClose,
  parentScenario
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scenarioType, setScenarioType] = useState<'branch' | 'sandbox'>('branch');
  const { currentUser } = useUser();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => api.scenarios.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      onClose();
      setName('');
      setDescription('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentUser) return;

    createMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      parent_scenario_id: parentScenario?.id,
      created_by: currentUser.id,
      scenario_type: scenarioType
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Scenario</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          {parentScenario && (
            <div className="parent-info">
              <GitBranch size={16} />
              <span>Branching from: <strong>{parentScenario.name}</strong></span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="scenario-name">Scenario Name *</label>
            <input
              id="scenario-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter scenario name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="scenario-description">Description</label>
            <textarea
              id="scenario-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this scenario"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="scenario-type">Scenario Type</label>
            <select
              id="scenario-type"
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value as 'branch' | 'sandbox')}
            >
              <option value="branch">Branch - Copy from parent scenario</option>
              <option value="sandbox">Sandbox - Start fresh</option>
            </select>
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            className="btn-primary"
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Scenario'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const Scenarios: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedParentScenario, setSelectedParentScenario] = useState<Scenario | undefined>();

  const { data: scenarios, isLoading, error } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const response = await api.scenarios.list();
      return response.data as Scenario[];
    },
  });

  const handleBranch = (scenario: Scenario) => {
    setSelectedParentScenario(scenario);
    setShowCreateModal(true);
  };

  const handleEdit = (scenario: Scenario) => {
    // TODO: Implement edit modal
    console.log('Edit scenario:', scenario);
  };

  const handleDelete = (scenario: Scenario) => {
    // TODO: Implement delete confirmation
    console.log('Delete scenario:', scenario);
  };

  const handleMerge = (scenario: Scenario) => {
    // TODO: Implement merge modal with conflict resolution
    console.log('Merge scenario:', scenario);
  };

  const handleCompare = (scenario: Scenario) => {
    // TODO: Implement comparison view
    console.log('Compare scenario:', scenario);
  };

  const handleCreateNew = () => {
    setSelectedParentScenario(undefined);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setSelectedParentScenario(undefined);
  };

  if (isLoading) {
    return (
      <div className="scenarios-page">
        <div className="page-loading">Loading scenarios...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scenarios-page">
        <div className="page-error">
          <AlertTriangle size={24} />
          <h3>Failed to load scenarios</h3>
          <p>Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scenarios-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Scenario Planning</h1>
          <p>Create and manage resource planning scenarios to explore different allocation strategies</p>
        </div>
        <button onClick={handleCreateNew} className="btn-primary">
          <Plus size={16} />
          New Scenario
        </button>
      </div>

      <div className="scenarios-grid">
        {scenarios?.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBranch={handleBranch}
            onMerge={handleMerge}
            onCompare={handleCompare}
          />
        ))}
      </div>

      <CreateScenarioModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        parentScenario={selectedParentScenario}
      />
    </div>
  );
};