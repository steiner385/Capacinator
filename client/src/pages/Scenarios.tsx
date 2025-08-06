import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  List,
  Search,
  Filter,
  X,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { api } from '../lib/api-client';
import { Scenario } from '../types';
import { useUser } from '../contexts/UserContext';
import './Scenarios.css';

// Tree node type for hierarchical display
interface ScenarioTreeNode extends Scenario {
  children: ScenarioTreeNode[];
}

interface ScenarioCardProps {
  scenario: Scenario;
  onEdit: (scenario: Scenario) => void;
  onDelete: (scenario: Scenario) => void;
  onBranch: (scenario: Scenario) => void;
  onMerge: (scenario: Scenario) => void;
  onCompare: (scenario: Scenario) => void;
}

// Enhanced timeline utility functions
const getTimelineDetails = (createdAt: string) => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  let timeAgo = '';
  let urgencyLevel = 'fresh';
  
  if (diffMinutes < 60) {
    timeAgo = diffMinutes <= 1 ? 'Just now' : `${diffMinutes}m ago`;
    urgencyLevel = 'fresh';
  } else if (diffHours < 24) {
    timeAgo = `${diffHours}h ago`;
    urgencyLevel = 'recent';
  } else if (diffDays < 7) {
    timeAgo = diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`;
    urgencyLevel = 'recent';
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    timeAgo = weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    urgencyLevel = 'aging';
  } else if (diffDays < 90) {
    const months = Math.floor(diffDays / 30);
    timeAgo = months === 1 ? '1 month ago' : `${months} months ago`;
    urgencyLevel = 'aging';
  } else {
    const months = Math.floor(diffDays / 30);
    timeAgo = `${months} months ago`;
    urgencyLevel = 'old';
  }
  
  return {
    timeAgo,
    urgencyLevel,
    daysSinceCreated: diffDays,
    absoluteDate: created.toLocaleDateString(),
    relativeDate: created.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: diffDays > 365 ? 'numeric' : undefined
    })
  };
};

const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  onEdit,
  onDelete,
  onBranch,
  onMerge,
  onCompare
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const isBaseline = scenario.scenario_type === 'baseline';
  const canMerge = scenario.parent_scenario_id && scenario.status === 'active';
  const timelineInfo = getTimelineDetails(scenario.created_at);

  return (
    <div className={`scenario-card ${scenario.scenario_type} ${isExpanded ? 'expanded' : ''}`}>
      <div className="scenario-header" onClick={() => setIsExpanded(!isExpanded)}>
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
            <span className={`timeline-age ${timelineInfo.urgencyLevel}`}>
              {timelineInfo.timeAgo}
            </span>
          </div>
        </div>
        <div className="expand-toggle">
          {isExpanded ? <ChevronDown size={20} /> : <ArrowRight size={20} />}
        </div>
      </div>

      {isExpanded && (
        <div className="scenario-expandable-content">
          {scenario.description && (
            <p className="scenario-description">{scenario.description}</p>
          )}

          <div className="scenario-details">
            <div className="scenario-detail">
              <Users size={14} />
              <span>Created by {scenario.created_by_name}</span>
            </div>
            <div className="scenario-detail timeline-info">
              <Calendar size={14} />
              <span className="timeline-date">{timelineInfo.relativeDate}</span>
            </div>
            {scenario.branch_point && (
              <div className="scenario-detail">
                <GitBranch size={14} />
                <span>Branched {new Date(scenario.branch_point).toLocaleDateString()}</span>
              </div>
            )}
            {scenario.parent_scenario_name && (
              <div className="scenario-detail parent-connection">
                <div className="parent-indicator">
                  <GitBranch size={14} />
                  <span className="connection-label">Branched from</span>
                </div>
                <div className="parent-name">
                  <span className="parent-scenario-name">{scenario.parent_scenario_name}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="scenario-actions" 
           onMouseEnter={() => setShowActions(true)}
           onMouseLeave={() => setShowActions(false)}>
        <div className={`actions-content ${showActions || isExpanded ? 'visible' : ''}`}>
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
    </div>
  );
};

interface CreateScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentScenario?: Scenario;
}

interface EditScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: Scenario;
}

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: Scenario;
}

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: Scenario;
}

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: Scenario;
  scenarios: Scenario[];
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

const EditScenarioModal: React.FC<EditScenarioModalProps> = ({
  isOpen,
  onClose,
  scenario
}) => {
  const [name, setName] = useState(scenario.name);
  const [description, setDescription] = useState(scenario.description || '');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.scenarios.update(scenario.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateMutation.mutate({
      name: name.trim(),
      description: description.trim(),
    });
  };

  // Reset form when scenario changes
  React.useEffect(() => {
    setName(scenario.name);
    setDescription(scenario.description || '');
  }, [scenario]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Edit Scenario</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="scenario-type-info">
            <span className={`scenario-type ${scenario.scenario_type}`}>
              {scenario.scenario_type}
            </span>
            <span className={`scenario-status ${scenario.status}`}>
              {scenario.status}
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="edit-scenario-name">Scenario Name *</label>
            <input
              id="edit-scenario-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter scenario name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-scenario-description">Description</label>
            <textarea
              id="edit-scenario-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this scenario"
              rows={3}
            />
          </div>

          {scenario.parent_scenario_name && (
            <div className="parent-info">
              <GitBranch size={16} />
              <span>Branched from: <strong>{scenario.parent_scenario_name}</strong></span>
            </div>
          )}
        </form>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            className="btn-primary"
            disabled={!name.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  scenario
}) => {
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const expectedText = scenario.name;

  const deleteMutation = useMutation({
    mutationFn: () => api.scenarios.delete(scenario.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      onClose();
      setConfirmText('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText === expectedText) {
      deleteMutation.mutate();
    }
  };

  const isConfirmed = confirmText === expectedText;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Delete Scenario</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>
        
        <div className="modal-body">
          <div className="delete-warning">
            <AlertTriangle size={48} className="warning-icon" />
            <div className="warning-content">
              <h3>Are you sure?</h3>
              <p>
                This action cannot be undone. This will permanently delete the scenario
                <strong> "{scenario.name}"</strong> and all its associated data.
              </p>
              {scenario.children_count && scenario.children_count > 0 && (
                <p className="child-warning">
                  <strong>Warning:</strong> This scenario has {scenario.children_count} child scenarios
                  that will also be affected.
                </p>
              )}
            </div>
          </div>

          <div className="confirmation-input">
            <label htmlFor="delete-confirm">
              To confirm, type <strong>{expectedText}</strong> below:
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Enter scenario name to confirm"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            className="btn-danger"
            disabled={!isConfirmed || deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Scenario'}
          </button>
        </div>
      </div>
    </div>
  );
};

const MergeModal: React.FC<MergeModalProps> = ({
  isOpen,
  onClose,
  scenario
}) => {
  const queryClient = useQueryClient();
  const [mergeStrategy, setMergeStrategy] = useState<'favor_source' | 'favor_target' | 'manual'>('favor_source');
  const [confirmMerge, setConfirmMerge] = useState(false);

  const mergeMutation = useMutation({
    mutationFn: (data: any) => api.scenarios.merge(scenario.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      onClose();
      setConfirmMerge(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmMerge) return;

    mergeMutation.mutate({
      merge_strategy: mergeStrategy,
      resolve_conflicts_as: mergeStrategy
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Merge Scenario</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>
        
        <div className="modal-body">
          <div className="merge-info">
            <div className="merge-flow">
              <div className="merge-source">
                <h4>Source Scenario</h4>
                <div className="scenario-card-mini">
                  <div className="scenario-name">{scenario.name}</div>
                  <div className="scenario-meta">
                    <span className={`scenario-type ${scenario.scenario_type}`}>
                      {scenario.scenario_type}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="merge-arrow">
                <ArrowRightLeft size={24} />
              </div>
              
              <div className="merge-target">
                <h4>Target Scenario</h4>
                <div className="scenario-card-mini">
                  <div className="scenario-name">{scenario.parent_scenario_name}</div>
                  <div className="scenario-meta">
                    <span className="scenario-type baseline">
                      {scenario.parent_scenario_id ? 'parent' : 'baseline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="merge-options">
            <h4>Conflict Resolution Strategy</h4>
            <div className="strategy-options">
              <label className="strategy-option">
                <input
                  type="radio"
                  name="merge-strategy"
                  value="favor_source"
                  checked={mergeStrategy === 'favor_source'}
                  onChange={(e) => setMergeStrategy(e.target.value as any)}
                />
                <div className="strategy-content">
                  <div className="strategy-title">Favor Source (Recommended)</div>
                  <div className="strategy-description">
                    When conflicts occur, use changes from "{scenario.name}"
                  </div>
                </div>
              </label>
              
              <label className="strategy-option">
                <input
                  type="radio"
                  name="merge-strategy"
                  value="favor_target"
                  checked={mergeStrategy === 'favor_target'}
                  onChange={(e) => setMergeStrategy(e.target.value as any)}
                />
                <div className="strategy-content">
                  <div className="strategy-title">Favor Target</div>
                  <div className="strategy-description">
                    When conflicts occur, keep existing changes in target scenario
                  </div>
                </div>
              </label>
              
              <label className="strategy-option">
                <input
                  type="radio"
                  name="merge-strategy"
                  value="manual"
                  checked={mergeStrategy === 'manual'}
                  onChange={(e) => setMergeStrategy(e.target.value as any)}
                />
                <div className="strategy-content">
                  <div className="strategy-title">Manual Resolution</div>
                  <div className="strategy-description">
                    Review and resolve each conflict manually (Advanced)
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="merge-confirmation">
            <label className="confirm-checkbox">
              <input
                type="checkbox"
                checked={confirmMerge}
                onChange={(e) => setConfirmMerge(e.target.checked)}
              />
              <span>I understand this will merge "{scenario.name}" into "{scenario.parent_scenario_name}"</span>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            className="btn-warning"
            disabled={!confirmMerge || mergeMutation.isPending}
          >
            {mergeMutation.isPending ? 'Merging...' : 'Merge Scenario'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  scenario,
  scenarios
}) => {
  const [compareToScenario, setCompareToScenario] = useState<string>('');
  const [comparisonResults, setComparisonResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const availableScenarios = scenarios.filter(s => s.id !== scenario.id);
  const selectedScenario = availableScenarios.find(s => s.id === compareToScenario);


  const handleCompare = async () => {
    if (!compareToScenario) return;
    
    setIsLoading(true);
    try {
      const response = await api.scenarios.compare(scenario.id, compareToScenario);
      setComparisonResults(response.data);
    } catch (error) {
      console.error('Comparison failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setComparisonResults(null);
    setCompareToScenario('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-large">
        <div className="modal-header">
          <h2>Compare Scenarios</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>
        
        <div className="modal-body">
          {!comparisonResults ? (
            <div className="comparison-setup">
              <div className="comparison-scenarios">
                <div className="scenario-selector">
                  <h4>Source Scenario</h4>
                  <div className="scenario-card-mini selected">
                    <div className="scenario-name">{scenario.name}</div>
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
                
                <div className="comparison-arrow">
                  <ArrowRightLeft size={24} />
                </div>
                
                <div className="scenario-selector">
                  <h4>Compare To</h4>
                  <select
                    value={compareToScenario}
                    onChange={(e) => setCompareToScenario(e.target.value)}
                    className="scenario-select"
                  >
                    <option value="">Select a scenario to compare</option>
                    {availableScenarios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.scenario_type})
                      </option>
                    ))}
                  </select>
                  
                  {selectedScenario && (
                    <div className="scenario-card-mini">
                      <div className="scenario-name">{selectedScenario.name}</div>
                      <div className="scenario-meta">
                        <span className={`scenario-type ${selectedScenario.scenario_type}`}>
                          {selectedScenario.scenario_type}
                        </span>
                        <span className={`scenario-status ${selectedScenario.status}`}>
                          {selectedScenario.status}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="comparison-actions">
                <button 
                  onClick={handleCompare}
                  className="btn-primary"
                  disabled={!compareToScenario || isLoading}
                >
                  {isLoading ? 'Comparing...' : 'Run Comparison'}
                </button>
              </div>
            </div>
          ) : (
            <div className="comparison-results">
              <div className="results-header">
                <h4>Comparison Results</h4>
                <button onClick={handleReset} className="btn-secondary btn-sm">
                  New Comparison
                </button>
              </div>
              
              <div className="comparison-summary">
                <div className="summary-item">
                  <div className="summary-label">Assignment Changes</div>
                  <div className="summary-value">{comparisonResults.assignment_changes || 0}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Resource Differences</div>
                  <div className="summary-value">{comparisonResults.resource_differences || 0}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Timeline Variations</div>
                  <div className="summary-value">{comparisonResults.timeline_variations || 0}</div>
                </div>
              </div>
              
              <div className="comparison-details">
                <div className="details-section">
                  <h5>Key Differences</h5>
                  <div className="differences-list">
                    {Array.isArray(comparisonResults.differences) && comparisonResults.differences.length > 0 ? (
                      comparisonResults.differences.map((diff: any, index: number) => (
                        <div key={index} className="difference-item">
                          <div className="difference-type">{diff.type}</div>
                          <div className="difference-description">{diff.description}</div>
                        </div>
                      ))
                    ) : (
                      <div className="no-differences">No significant differences found</div>
                    )}
                  </div>
                </div>
                
                <div className="details-section">
                  <h5>Impact Analysis</h5>
                  <div className="impact-metrics">
                    <div className="metric">
                      <span className="metric-label">Utilization Impact:</span>
                      <span className="metric-value">{comparisonResults.utilization_impact || 'Minimal'}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Resource Efficiency:</span>
                      <span className="metric-value">{comparisonResults.efficiency_score || 'Similar'}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Timeline Risk:</span>
                      <span className="metric-value">{comparisonResults.timeline_risk || 'Low'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">
            {comparisonResults ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const Scenarios: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedParentScenario, setSelectedParentScenario] = useState<Scenario | undefined>();
  // Removed view mode selection - now only using list view
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingScenario, setDeletingScenario] = useState<Scenario | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergingScenario, setMergingScenario] = useState<Scenario | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [comparingScenario, setComparingScenario] = useState<Scenario | null>(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{
    types: string[];
    statuses: string[];
    creators: string[];
  }>({
    types: [],
    statuses: [],
    creators: []
  });
  
  // List view state
  const [showAllScenarios, setShowAllScenarios] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [hideMergedScenarios, setHideMergedScenarios] = useState(false);
  
  // Removed toggleSection function - no longer needed
  
  // Removed renderGroupedScenarios function - no longer needed
  

  const { data: scenarios, isLoading, error } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const response = await api.scenarios.list();
      return response.data as Scenario[];
    },
  });

  // Filter and search logic
  const filteredScenarios = React.useMemo(() => {
    if (!scenarios) return [];
    
    let filtered = scenarios.filter(scenario => {
      // Search filter
      const searchMatch = !searchTerm || 
        scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scenario.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scenario.created_by_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Type filter
      const typeMatch = activeFilters.types.length === 0 || 
        activeFilters.types.includes(scenario.scenario_type);
      
      // Status filter
      const statusMatch = activeFilters.statuses.length === 0 || 
        activeFilters.statuses.includes(scenario.status);
      
      // Creator filter
      const creatorMatch = activeFilters.creators.length === 0 || 
        activeFilters.creators.includes(scenario.created_by_name || '');
      
      // Merged scenarios filter
      const mergedMatch = !hideMergedScenarios || scenario.status !== 'merged';
      
      return searchMatch && typeMatch && statusMatch && creatorMatch && mergedMatch;
    });

    // Sort by creation date (most recent first) for better organization
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return filtered;
  }, [scenarios, searchTerm, activeFilters, hideMergedScenarios]);

  // Get unique values for filter options
  const filterOptions = React.useMemo(() => {
    if (!scenarios) return { types: [], statuses: [], creators: [] };
    
    return {
      types: [...new Set(scenarios.map(s => s.scenario_type))],
      statuses: [...new Set(scenarios.map(s => s.status))],
      creators: [...new Set(scenarios.map(s => s.created_by_name).filter((name): name is string => Boolean(name)))]
    };
  }, [scenarios]);

  // Filter management functions
  const toggleFilter = (category: 'types' | 'statuses' | 'creators', value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }));
  };

  const removeFilter = (category: 'types' | 'statuses' | 'creators', value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [category]: prev[category].filter(v => v !== value)
    }));
  };

  const clearAllFilters = () => {
    setActiveFilters({ types: [], statuses: [], creators: [] });
    setSearchTerm('');
  };


  const hasActiveFilters = searchTerm || 
    activeFilters.types.length > 0 || 
    activeFilters.statuses.length > 0 || 
    activeFilters.creators.length > 0;
    
  const totalScenariosCount = scenarios?.length || 0;
  
  // Apply display limit based on view mode and filters
  const displayedScenarios = React.useMemo(() => {
    if (!filteredScenarios) return [];
    
    // Apply display limit unless showing all scenarios or there are active filters
    if (!showAllScenarios && !hasActiveFilters) {
      return filteredScenarios.slice(0, displayLimit);
    }
    
    return filteredScenarios;
  }, [filteredScenarios, showAllScenarios, hasActiveFilters, displayLimit]);
  
  const isLimitedView = !showAllScenarios && !hasActiveFilters && displayedScenarios.length < totalScenariosCount;

  // Click outside handler for filter dropdown
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleBranch = (scenario: Scenario) => {
    setSelectedParentScenario(scenario);
    setShowCreateModal(true);
  };

  const handleEdit = (scenario: Scenario) => {
    setEditingScenario(scenario);
    setShowEditModal(true);
  };

  const handleDelete = (scenario: Scenario) => {
    setDeletingScenario(scenario);
    setShowDeleteModal(true);
  };

  const handleMerge = (scenario: Scenario) => {
    setMergingScenario(scenario);
    setShowMergeModal(true);
  };

  const handleCompare = (scenario: Scenario) => {
    setComparingScenario(scenario);
    setShowCompareModal(true);
  };

  const handleCreateNew = () => {
    setSelectedParentScenario(undefined);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setSelectedParentScenario(undefined);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingScenario(null);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingScenario(null);
  };

  const handleCloseMergeModal = () => {
    setShowMergeModal(false);
    setMergingScenario(null);
  };

  const handleCloseCompareModal = () => {
    setShowCompareModal(false);
    setComparingScenario(null);
  };

  const renderListView = () => {
    if (!displayedScenarios || displayedScenarios.length === 0) {
      return <div className="no-scenarios">
        {hasActiveFilters ? 'No scenarios match your filters' : 'No scenarios found'}
      </div>;
    }

    // Build hierarchical tree structure
    const buildScenarioTree = () => {
      const scenarioMap = new Map<string, ScenarioTreeNode>(
        displayedScenarios.map(s => [s.id, { ...s, children: [] as ScenarioTreeNode[] }])
      );
      const roots: ScenarioTreeNode[] = [];

      displayedScenarios.forEach(scenario => {
        const scenarioNode = scenarioMap.get(scenario.id)!;
        if (scenario.parent_scenario_id && scenarioMap.has(scenario.parent_scenario_id)) {
          const parent = scenarioMap.get(scenario.parent_scenario_id)!;
          parent.children.push(scenarioNode);
        } else {
          roots.push(scenarioNode);
        }
      });

      return roots;
    };

    const renderScenarioNode = (scenario: any, level: number = 0, isLast: boolean = true, parentLines: boolean[] = []) => {
      const indent = level * 24;
      const hasChildren = scenario.children && scenario.children.length > 0;
      
      return (
        <div key={scenario.id}>
          <div className={`hierarchy-row ${scenario.scenario_type}`}>
            {/* Name Column with Tree Structure */}
            <div className="hierarchy-cell name-column">
              <div className="hierarchy-indent" style={{ paddingLeft: `${indent}px` }}>
                <div className="hierarchy-lines">
                  {/* Draw parent connection lines */}
                  {parentLines.map((showLine, index) => (
                    <div
                      key={index}
                      className={`parent-line ${showLine ? 'visible' : ''}`}
                      style={{ left: `${index * 24 + 12}px` }}
                    />
                  ))}
                  
                  {/* Current level connector */}
                  {level > 0 && (
                    <>
                      <div 
                        className="branch-line horizontal" 
                        style={{ left: `${(level - 1) * 24 + 12}px` }}
                      />
                      <div 
                        className={`branch-line vertical ${isLast ? 'last' : ''}`}
                        style={{ left: `${(level - 1) * 24 + 12}px` }}
                      />
                    </>
                  )}
                  
                  {/* Node connector */}
                  <div className="node-connector" style={{ left: `${level * 24 + 12}px` }}>
                    <div className={`connector-dot ${scenario.scenario_type}`}></div>
                  </div>
                </div>
                
                <div className="hierarchy-content">
                  <div className="scenario-name-cell">
                    <GitBranch size={16} />
                    <div className="scenario-info">
                      <div className="name">{scenario.name}</div>
                      {scenario.description && (
                        <div className="description">{scenario.description}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Type Column */}
            <div className="hierarchy-cell type-column">
              <span className={`scenario-type ${scenario.scenario_type}`}>
                {scenario.scenario_type}
              </span>
            </div>
            
            {/* Status Column */}
            <div className="hierarchy-cell status-column">
              <span className={`scenario-status ${scenario.status}`}>
                {scenario.status}
                {scenario.status === 'merged' && (
                  <span className="merge-indicator" title="This scenario has been merged back to its parent">
                    ✅
                  </span>
                )}
                {scenario.status === 'active' && !scenario.parent_scenario_id && scenario.scenario_type === 'branch' && (
                  <span className="orphan-indicator" title="This branch scenario has no parent and cannot be merged">
                    🔗❌
                  </span>
                )}
              </span>
            </div>
            
            {/* Created By Column */}
            <div className="hierarchy-cell created-by-column">
              <span className="created-by">{scenario.created_by_name}</span>
            </div>
            
            {/* Created Date Column */}
            <div className="hierarchy-cell created-date-column">
              <span className="created-date">{new Date(scenario.created_at).toLocaleDateString()}</span>
            </div>
            
            {/* Actions Column */}
            <div className="hierarchy-cell actions-column">
              <div className="hierarchy-actions">
                <button
                  onClick={() => handleBranch(scenario)}
                  className="action-button branch"
                  title="Create Branch"
                >
                  <GitBranch size={14} />
                </button>
                <button
                  onClick={() => handleCompare(scenario)}
                  className="action-button compare"
                  title="Compare Scenarios"
                >
                  <ArrowRightLeft size={14} />
                </button>
                {scenario.parent_scenario_id && scenario.status === 'active' ? (
                  <button
                    onClick={() => handleMerge(scenario)}
                    className="action-button merge"
                    title={`Merge to ${scenario.parent_scenario_name}`}
                  >
                    <Merge size={14} />
                  </button>
                ) : (
                  <div 
                    className="action-button merge disabled"
                    title={
                      scenario.status === 'merged' 
                        ? 'Already merged to parent scenario'
                        : scenario.status === 'archived'
                        ? 'Cannot merge archived scenario'
                        : !scenario.parent_scenario_id && scenario.scenario_type === 'branch'
                        ? 'Cannot merge: This branch has no parent scenario'
                        : scenario.scenario_type === 'baseline'
                        ? 'Cannot merge: Baseline scenarios cannot be merged'
                        : 'Cannot merge this scenario'
                    }
                  >
                    <Merge size={14} />
                  </div>
                )}
                <button
                  onClick={() => handleEdit(scenario)}
                  className="action-button edit"
                  title="Edit Scenario"
                >
                  <Edit3 size={14} />
                </button>
                {scenario.scenario_type !== 'baseline' && (
                  <button
                    onClick={() => handleDelete(scenario)}
                    className="action-button delete"
                    title="Delete Scenario"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Render children */}
          {hasChildren && scenario.children.map((child: any, index: number) => {
            const isLastChild = index === scenario.children.length - 1;
            const newParentLines = [...parentLines, !isLastChild];
            return renderScenarioNode(child, level + 1, isLastChild, newParentLines);
          })}
        </div>
      );
    };

    const scenarioTree = buildScenarioTree();

    return (
      <div className="scenarios-hierarchy">
        <div className="hierarchy-header">
          <div className="hierarchy-title">Scenario Hierarchy</div>
          <div className="hierarchy-legend">
            <div className="legend-item">
              <div className="legend-dot baseline"></div>
              <span>Baseline</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot branch"></div>
              <span>Branch</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot sandbox"></div>
              <span>Sandbox</span>
            </div>
          </div>
        </div>
        
        {/* Column Headers */}
        <div className="hierarchy-column-headers">
          <div className="column-header name-column">Name</div>
          <div className="column-header type-column">Type</div>
          <div className="column-header status-column">Status</div>
          <div className="column-header created-by-column">Created By</div>
          <div className="column-header created-date-column">Created</div>
          <div className="column-header actions-column">Actions</div>
        </div>
        
        <div className="hierarchy-content">
          {scenarioTree.map((rootScenario, index) => 
            renderScenarioNode(rootScenario, 0, index === scenarioTree.length - 1, [])
          )}
        </div>
      </div>
    );
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

      <div className="view-controls">
        <div className="search-and-filters">
          <div className="search-input">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-dropdown" ref={filterDropdownRef}>
            <button
              className={`filter-button ${hasActiveFilters ? 'active' : ''}`}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter size={16} />
              Filters
              <ChevronDown size={14} />
            </button>
            
            {showFilterDropdown && (
              <div className="filter-dropdown-content">
                <div className="filter-section">
                  <div className="filter-section-title">Type</div>
                  {filterOptions.types.map(type => (
                    <div key={type} className="filter-option">
                      <input
                        type="checkbox"
                        checked={activeFilters.types.includes(type)}
                        onChange={() => toggleFilter('types', type)}
                      />
                      <span style={{ textTransform: 'capitalize' }}>{type}</span>
                    </div>
                  ))}
                </div>
                
                <div className="filter-section">
                  <div className="filter-section-title">Status</div>
                  {filterOptions.statuses.map(status => (
                    <div key={status} className="filter-option">
                      <input
                        type="checkbox"
                        checked={activeFilters.statuses.includes(status)}
                        onChange={() => toggleFilter('statuses', status)}
                      />
                      <span style={{ textTransform: 'capitalize' }}>{status}</span>
                    </div>
                  ))}
                </div>
                
                <div className="filter-section">
                  <div className="filter-section-title">Creator</div>
                  {filterOptions.creators.map(creator => (
                    <div key={creator} className="filter-option">
                      <input
                        type="checkbox"
                        checked={activeFilters.creators.includes(creator)}
                        onChange={() => toggleFilter('creators', creator)}
                      />
                      <span>{creator}</span>
                    </div>
                  ))}
                </div>
                
                {hasActiveFilters && (
                  <div className="filter-actions">
                    <button 
                      onClick={clearAllFilters}
                      className="btn btn-sm btn-secondary"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {hasActiveFilters && (
            <div className="active-filters">
              {activeFilters.types.map(type => (
                <div key={`type-${type}`} className="filter-tag">
                  <span>Type: {type}</span>
                  <button onClick={() => removeFilter('types', type)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
              {activeFilters.statuses.map(status => (
                <div key={`status-${status}`} className="filter-tag">
                  <span>Status: {status}</span>
                  <button onClick={() => removeFilter('statuses', status)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
              {activeFilters.creators.map(creator => (
                <div key={`creator-${creator}`} className="filter-tag">
                  <span>By: {creator}</span>
                  <button onClick={() => removeFilter('creators', creator)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="view-controls">
          <div className="quick-filters">
            <button
              className={`quick-filter-btn ${hideMergedScenarios ? 'active' : ''}`}
              onClick={() => setHideMergedScenarios(!hideMergedScenarios)}
              title={hideMergedScenarios ? 'Show merged scenarios' : 'Hide merged scenarios'}
            >
              {hideMergedScenarios ? '👁️ Show Merged' : '🚫 Hide Merged'}
            </button>
          </div>
          
          <div className="view-info">
            <span className="view-label">
              <List size={14} />
              List View
            </span>
          </div>
        </div>
      </div>

      <div className="scenarios-content">
        {renderListView()}
      </div>

      <CreateScenarioModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        parentScenario={selectedParentScenario}
      />
      
      {editingScenario && (
        <EditScenarioModal
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          scenario={editingScenario}
        />
      )}
      
      {deletingScenario && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={handleCloseDeleteModal}
          scenario={deletingScenario}
        />
      )}
      
      {mergingScenario && (
        <MergeModal
          isOpen={showMergeModal}
          onClose={handleCloseMergeModal}
          scenario={mergingScenario}
        />
      )}
      
      {comparingScenario && scenarios && (
        <CompareModal
          isOpen={showCompareModal}
          onClose={handleCloseCompareModal}
          scenario={comparingScenario}
          scenarios={scenarios}
        />
      )}
    </div>
  );
};