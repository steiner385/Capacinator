import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { queryKeys } from '../lib/queryKeys';
import { Scenario } from '../types';
import { useUser } from '../contexts/UserContext';
import { CreateScenarioModal, EditScenarioModal, DeleteConfirmationModal } from '../components/modals/ScenarioModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
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

// CreateScenarioModal, EditScenarioModal, and DeleteConfirmationModal have been moved to ScenarioModal.tsx

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
      queryClient.invalidateQueries({ queryKey: queryKeys.scenarios.all });
      handleClose();
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

  const handleClose = () => {
    // Reset form state
    setConfirmMerge(false);
    setMergeStrategy('favor_source');
    // Give time for animation before calling onClose
    setTimeout(() => onClose(), 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Merge Scenario</DialogTitle>
          <DialogDescription>
            Merge {scenario.name} back into {scenario.parent_scenario_name || 'the parent scenario'}. This will combine all changes from this scenario.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          {/* Screen reader status announcements */}
          <div 
            aria-live="polite" 
            aria-atomic="true" 
            className="sr-only"
            id="merge-status"
          >
            {mergeMutation.isPending 
              ? 'Merge in progress. Please wait.' 
              : confirmMerge 
                ? 'Ready to merge scenario. Click Merge Scenario button to proceed.'
                : 'Complete the form to enable scenario merge.'
            }
          </div>
          
          <div className="space-y-6 py-4">
            {/* Merge flow visualization */}
            <div className="merge-info" role="region" aria-labelledby="merge-flow-heading">
              <h3 id="merge-flow-heading" className="text-lg font-medium mb-4">Merge Overview</h3>
              <div className="merge-flow">
                <div className="merge-source">
                  <h4 className="text-sm font-medium mb-2">Source Scenario</h4>
                  <div className="scenario-card-mini">
                    <div className="scenario-name">{scenario.name}</div>
                    <div className="scenario-meta">
                      <span className={`scenario-type ${scenario.scenario_type}`}>
                        {scenario.scenario_type}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="merge-arrow" aria-hidden="true">
                  <ArrowRightLeft size={24} />
                </div>
                
                <div className="merge-target">
                  <h4 className="text-sm font-medium mb-2">Target Scenario</h4>
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

            {/* Conflict resolution strategy */}
            <div className="merge-options" role="region" aria-labelledby="strategy-heading">
              <Label id="strategy-heading" className="text-sm font-medium mb-3 block">
                Conflict Resolution Strategy
              </Label>
              <fieldset 
                className="space-y-3"
                aria-describedby="strategy-help"
              >
                <legend className="sr-only">Choose conflict resolution strategy</legend>
                
                <div className="strategy-option">
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="favor_source"
                      name="merge-strategy"
                      value="favor_source"
                      checked={mergeStrategy === 'favor_source'}
                      onChange={(e) => setMergeStrategy(e.target.value as 'favor_source' | 'favor_target' | 'manual')}
                      className="mt-1"
                    />
                    <Label htmlFor="favor_source" className="flex-1 cursor-pointer">
                      <div className="strategy-content">
                        <div className="strategy-title font-medium">Favor Source (Recommended)</div>
                        <div className="strategy-description text-sm text-muted-foreground">
                          When conflicts occur, use changes from "{scenario.name}"
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
                
                <div className="strategy-option">
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="favor_target"
                      name="merge-strategy"
                      value="favor_target"
                      checked={mergeStrategy === 'favor_target'}
                      onChange={(e) => setMergeStrategy(e.target.value as 'favor_source' | 'favor_target' | 'manual')}
                      className="mt-1"
                    />
                    <Label htmlFor="favor_target" className="flex-1 cursor-pointer">
                      <div className="strategy-content">
                        <div className="strategy-title font-medium">Favor Target</div>
                        <div className="strategy-description text-sm text-muted-foreground">
                          When conflicts occur, keep existing changes in target scenario
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
                
                <div className="strategy-option">
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="manual"
                      name="merge-strategy"
                      value="manual"
                      checked={mergeStrategy === 'manual'}
                      onChange={(e) => setMergeStrategy(e.target.value as 'favor_source' | 'favor_target' | 'manual')}
                      className="mt-1"
                    />
                    <Label htmlFor="manual" className="flex-1 cursor-pointer">
                      <div className="strategy-content">
                        <div className="strategy-title font-medium">Manual Resolution</div>
                        <div className="strategy-description text-sm text-muted-foreground">
                          Review and resolve each conflict manually (Advanced)
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
              </fieldset>
              <p id="strategy-help" className="text-xs text-muted-foreground mt-2">
                Choose how to handle conflicting changes between scenarios during merge.
              </p>
            </div>

            {/* Confirmation checkbox */}
            <div className="merge-confirmation" role="region" aria-labelledby="confirmation-heading">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="confirm-merge"
                  checked={confirmMerge}
                  onCheckedChange={setConfirmMerge}
                  aria-describedby="confirm-help"
                />
                <div className="flex-1">
                  <Label htmlFor="confirm-merge" className="text-sm font-medium cursor-pointer">
                    I understand this will merge "{scenario.name}" into "{scenario.parent_scenario_name}"
                  </Label>
                  <p id="confirm-help" className="text-xs text-muted-foreground mt-1">
                    This action cannot be undone. The source scenario will be marked as merged.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              disabled={!confirmMerge || mergeMutation.isPending}
            >
              {mergeMutation.isPending ? 'Merging...' : 'Merge Scenario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

  const handleClose = () => {
    // Reset state
    setComparisonResults(null);
    setCompareToScenario('');
    setIsLoading(false);
    // Give time for animation before calling onClose
    setTimeout(() => onClose(), 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {comparisonResults 
              ? `Comparing: ${scenario.name} vs ${selectedScenario?.name || ''}`
              : 'Compare Scenarios'
            }
          </DialogTitle>
          <DialogDescription>
            {comparisonResults 
              ? 'View the differences between the selected scenarios'
              : 'Select two scenarios to analyze their differences'
            }
          </DialogDescription>
        </DialogHeader>
        
        {/* Screen reader status announcements for comparison */}
        <div 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
          id="comparison-announcements"
        >
          {isLoading 
            ? 'Comparing scenarios. Please wait.' 
            : comparisonResults 
              ? `Comparison completed. Found ${(comparisonResults?.differences?.assignments?.added?.length || 0) + (comparisonResults?.differences?.assignments?.modified?.length || 0) + (comparisonResults?.differences?.assignments?.removed?.length || 0)} total differences.`
              : compareToScenario 
                ? 'Scenarios selected. Ready to compare.'
                : 'Select a scenario to compare against.'
          }
        </div>
        
        <div className="scenarios-comparison-content" style={{ paddingTop: '1rem' }}>
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
                  <Label htmlFor="compare-scenario-select">Compare To</Label>
                  <select
                    id="compare-scenario-select"
                    value={compareToScenario}
                    onChange={(e) => setCompareToScenario(e.target.value)}
                    className="scenario-select"
                    aria-describedby="compare-scenario-help"
                    aria-required="true"
                  >
                    <option value="">Select a scenario to compare</option>
                    {availableScenarios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.scenario_type})
                      </option>
                    ))}
                  </select>
                  <div id="compare-scenario-help" className="help-text" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Choose a scenario to compare against {scenario.name}
                  </div>
                  
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
                <Button 
                  onClick={handleCompare}
                  disabled={!compareToScenario || isLoading}
                  aria-describedby="comparison-status"
                >
                  {isLoading ? 'Comparing...' : 'Run Comparison'}
                </Button>
                <div id="comparison-status" className="sr-only" aria-live="polite">
                  {isLoading ? 'Comparison in progress' : !compareToScenario ? 'Select a scenario to enable comparison' : 'Ready to compare scenarios'}
                </div>
              </div>
            </div>
          ) : (
            <div className="comparison-results" role="region" aria-labelledby="results-heading">
              <div className="results-header">
                <h4 id="results-heading">Comparison Results</h4>
                <Button onClick={handleReset} variant="outline" size="sm">
                  New Comparison
                </Button>
              </div>
              
              <div className="comparison-summary" role="group" aria-labelledby="summary-heading">
                <h5 id="summary-heading" className="sr-only">Summary of Changes</h5>
                <div className="summary-item">
                  <div className="summary-label">Assignments Added</div>
                  <div className="summary-value" aria-label={`${comparisonResults?.differences?.assignments?.added?.length || 0} assignments added`}>
                    {comparisonResults?.differences?.assignments?.added?.length || 0}
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Assignments Modified</div>
                  <div className="summary-value" aria-label={`${comparisonResults?.differences?.assignments?.modified?.length || 0} assignments modified`}>
                    {comparisonResults?.differences?.assignments?.modified?.length || 0}
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Assignments Removed</div>
                  <div className="summary-value" aria-label={`${comparisonResults?.differences?.assignments?.removed?.length || 0} assignments removed`}>
                    {comparisonResults?.differences?.assignments?.removed?.length || 0}
                  </div>
                </div>
              </div>
              
              <div className="comparison-details">
                <div className="details-section" role="region" aria-labelledby="differences-heading">
                  <h5 id="differences-heading">Assignment Differences</h5>
                  <div className="differences-list">
                    {comparisonResults?.differences?.assignments?.added?.length > 0 && (
                      <div className="difference-group">
                        <h6 style={{color: '#10b981'}}>+ Added ({comparisonResults.differences.assignments.added.length})</h6>
                        {comparisonResults.differences.assignments.added.slice(0, 5).map((item: any, index: number) => (
                          <div key={`added-${index}`} className="difference-item">
                            <div className="difference-description">{item.details || `${item.person_name} → ${item.project_name}`}</div>
                          </div>
                        ))}
                        {comparisonResults.differences.assignments.added.length > 5 && (
                          <div className="difference-item">
                            <div className="difference-description">...and {comparisonResults.differences.assignments.added.length - 5} more</div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {comparisonResults?.differences?.assignments?.modified?.length > 0 && (
                      <div className="difference-group">
                        <h6 style={{color: '#3b82f6'}}>≈ Modified ({comparisonResults.differences.assignments.modified.length})</h6>
                        {comparisonResults.differences.assignments.modified.slice(0, 5).map((item: any, index: number) => (
                          <div key={`modified-${index}`} className="difference-item">
                            <div className="difference-description">{item.details}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {comparisonResults?.differences?.assignments?.removed?.length > 0 && (
                      <div className="difference-group">
                        <h6 style={{color: '#ef4444'}}>- Removed ({comparisonResults.differences.assignments.removed.length})</h6>
                        {comparisonResults.differences.assignments.removed.slice(0, 5).map((item: any, index: number) => (
                          <div key={`removed-${index}`} className="difference-item">
                            <div className="difference-description">{item.details || `${item.person_name} → ${item.project_name}`}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {(!comparisonResults?.differences?.assignments?.added?.length && 
                      !comparisonResults?.differences?.assignments?.modified?.length && 
                      !comparisonResults?.differences?.assignments?.removed?.length) && (
                      <div className="no-differences">No assignment differences found</div>
                    )}
                  </div>
                </div>
                
                <div className="details-section" role="region" aria-labelledby="impact-heading">
                  <h5 id="impact-heading">Impact Analysis</h5>
                  <div className="impact-metrics" role="group" aria-labelledby="impact-heading">
                    <div className="metric">
                      <span className="metric-label">Total Allocation Change:</span>
                      <span className="metric-value">
                        {comparisonResults?.metrics?.utilization_impact?.total_allocation_change > 0 ? '+' : ''}
                        {comparisonResults?.metrics?.utilization_impact?.total_allocation_change || 0}%
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Net Assignment Change:</span>
                      <span className="metric-value">
                        {comparisonResults?.metrics?.capacity_impact?.net_change > 0 ? '+' : ''}
                        {comparisonResults?.metrics?.capacity_impact?.net_change || 0}
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Projects Affected:</span>
                      <span className="metric-value">
                        {comparisonResults?.metrics?.timeline_impact?.projects_affected || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {comparisonResults ? 'Close' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  
  // Accessibility and keyboard navigation state
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [treeNodes, setTreeNodes] = useState<ScenarioTreeNode[]>([]);
  const treeRef = useRef<HTMLDivElement>(null);
  
  // Focus restoration system for modals
  const focusReturnRef = useRef<HTMLElement | null>(null);
  
  // Removed toggleSection function - no longer needed
  
  // Removed renderGroupedScenarios function - no longer needed
  
  const queryClient = useQueryClient();

  // Keyboard navigation helper functions
  const getAllVisibleNodes = useCallback((nodes: ScenarioTreeNode[]): ScenarioTreeNode[] => {
    const visibleNodes: ScenarioTreeNode[] = [];
    
    const traverse = (nodeList: ScenarioTreeNode[]) => {
      nodeList.forEach(node => {
        visibleNodes.push(node);
        if (expandedNodes.has(node.id) && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    
    traverse(nodes);
    return visibleNodes;
  }, [expandedNodes]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!focusedNodeId || treeNodes.length === 0) return;

    const visibleNodes = getAllVisibleNodes(treeNodes);
    const currentIndex = visibleNodes.findIndex(node => node.id === focusedNodeId);
    const currentNode = visibleNodes[currentIndex];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < visibleNodes.length - 1) {
          setFocusedNodeId(visibleNodes[currentIndex + 1].id);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          setFocusedNodeId(visibleNodes[currentIndex - 1].id);
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (currentNode?.children.length > 0) {
          if (!expandedNodes.has(currentNode.id)) {
            setExpandedNodes(prev => new Set([...prev, currentNode.id]));
          } else {
            // Move to first child if expanded
            setFocusedNodeId(currentNode.children[0].id);
          }
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (expandedNodes.has(currentNode.id) && currentNode.children.length > 0) {
          // Collapse if expanded
          setExpandedNodes(prev => {
            const newSet = new Set(prev);
            newSet.delete(currentNode.id);
            return newSet;
          });
        } else {
          // Move to parent
          const parent = findParentNode(currentNode.id, treeNodes);
          if (parent) {
            setFocusedNodeId(parent.id);
          }
        }
        break;

      case 'Home':
        e.preventDefault();
        if (visibleNodes.length > 0) {
          setFocusedNodeId(visibleNodes[0].id);
        }
        break;

      case 'End':
        e.preventDefault();
        if (visibleNodes.length > 0) {
          setFocusedNodeId(visibleNodes[visibleNodes.length - 1].id);
        }
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        // Toggle expansion or trigger action
        if (currentNode?.children.length > 0) {
          setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(currentNode.id)) {
              newSet.delete(currentNode.id);
            } else {
              newSet.add(currentNode.id);
            }
            return newSet;
          });
        }
        break;
    }
  }, [focusedNodeId, treeNodes, expandedNodes, getAllVisibleNodes]);

  const findParentNode = useCallback((nodeId: string, nodes: ScenarioTreeNode[]): ScenarioTreeNode | null => {
    for (const node of nodes) {
      if (node.children.some(child => child.id === nodeId)) {
        return node;
      }
      const found = findParentNode(nodeId, node.children);
      if (found) return found;
    }
    return null;
  }, []);

  const deleteMutation = useMutation({
    mutationFn: (scenarioId: string) => api.scenarios.delete(scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scenarios.all });
      handleCloseDeleteModal();
    },
  });

  const { data: scenarios, isLoading, error } = useQuery({
    queryKey: queryKeys.scenarios.list(),
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

  // Update tree nodes when filtered scenarios change
  useEffect(() => {
    if (filteredScenarios.length > 0) {
      const displayedScenarios = showAllScenarios ? filteredScenarios : filteredScenarios.slice(0, displayLimit);
      
      // Build hierarchical tree structure
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

      setTreeNodes(roots);
      
      // Set initial focus if no node is focused
      if (!focusedNodeId && roots.length > 0) {
        setFocusedNodeId(roots[0].id);
      }
      
      // Expand nodes that have children by default
      const newExpandedNodes = new Set<string>();
      roots.forEach(node => {
        if (node.children.length > 0) {
          newExpandedNodes.add(node.id);
        }
      });
      setExpandedNodes(newExpandedNodes);
    }
  }, [filteredScenarios, showAllScenarios, displayLimit, focusedNodeId]);

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

  const handleEdit = (scenario: Scenario, event?: React.MouseEvent) => {
    focusReturnRef.current = event?.currentTarget as HTMLElement || document.activeElement as HTMLElement;
    setEditingScenario(scenario);
    setShowEditModal(true);
  };

  const handleDelete = (scenario: Scenario, event?: React.MouseEvent) => {
    focusReturnRef.current = event?.currentTarget as HTMLElement || document.activeElement as HTMLElement;
    setDeletingScenario(scenario);
    setShowDeleteModal(true);
  };

  const handleMerge = (scenario: Scenario, event?: React.MouseEvent) => {
    focusReturnRef.current = event?.currentTarget as HTMLElement || document.activeElement as HTMLElement;
    setMergingScenario(scenario);
    setShowMergeModal(true);
  };

  const handleCompare = (scenario: Scenario, event?: React.MouseEvent) => {
    focusReturnRef.current = event?.currentTarget as HTMLElement || document.activeElement as HTMLElement;
    setComparingScenario(scenario);
    setShowCompareModal(true);
  };

  const handleCreateNew = (event?: React.MouseEvent) => {
    focusReturnRef.current = event?.currentTarget as HTMLElement || document.activeElement as HTMLElement;
    setSelectedParentScenario(undefined);
    setShowCreateModal(true);
  };

  const restoreFocus = useCallback(() => {
    if (focusReturnRef.current && focusReturnRef.current.isConnected) {
      // Use setTimeout to ensure the modal has fully closed before restoring focus
      setTimeout(() => {
        focusReturnRef.current?.focus();
        focusReturnRef.current = null;
      }, 100);
    }
  }, []);

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setSelectedParentScenario(undefined);
    restoreFocus();
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingScenario(null);
    restoreFocus();
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingScenario(null);
    restoreFocus();
  };

  const handleCloseMergeModal = () => {
    setShowMergeModal(false);
    setMergingScenario(null);
    restoreFocus();
  };

  const handleCloseCompareModal = () => {
    setShowCompareModal(false);
    setComparingScenario(null);
    restoreFocus();
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

    const renderScenarioNode = (scenario: ScenarioTreeNode, level: number = 0, isLast: boolean = true, parentLines: boolean[] = []): React.ReactNode => {
      const indent = level * 24;
      const hasChildren = scenario.children && scenario.children.length > 0;
      const isExpanded = expandedNodes.has(scenario.id);
      const isFocused = focusedNodeId === scenario.id;
      const isBaseline = scenario.scenario_type === 'baseline';
      
      return (
        <div key={scenario.id}>
          <div 
            className={`hierarchy-row ${scenario.scenario_type} ${isFocused ? 'focused' : ''}`}
            role="treeitem"
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-level={level + 1}
            aria-selected={isFocused}
            aria-label={`${scenario.name}, ${scenario.scenario_type} scenario, ${scenario.status} status${hasChildren ? `, ${scenario.children.length} child scenarios` : ''}`}
            tabIndex={isFocused ? 0 : -1}
            onFocus={() => setFocusedNodeId(scenario.id)}
            onClick={() => setFocusedNodeId(scenario.id)}
            onKeyDown={handleKeyDown}
          >
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
                      aria-hidden="true"
                    />
                  ))}
                  
                  {/* Current level connector */}
                  {level > 0 && (
                    <>
                      <div 
                        className="branch-line horizontal" 
                        style={{ left: `${(level - 1) * 24 + 12}px` }}
                        aria-hidden="true"
                      />
                      <div 
                        className={`branch-line vertical ${isLast ? 'last' : ''}`}
                        style={{ left: `${(level - 1) * 24 + 12}px` }}
                        aria-hidden="true"
                      />
                    </>
                  )}
                  
                  {/* Node connector with expand/collapse button for nodes with children */}
                  <div className="node-connector" style={{ left: `${level * 24 + 12}px` }}>
                    {hasChildren ? (
                      <button
                        className={`connector-expand-button ${scenario.scenario_type}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedNodes(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(scenario.id)) {
                              newSet.delete(scenario.id);
                            } else {
                              newSet.add(scenario.id);
                            }
                            return newSet;
                          });
                        }}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${scenario.name} scenarios`}
                        tabIndex={-1}
                      >
                        <ChevronDown 
                          size={12} 
                          className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      <div className={`connector-dot ${scenario.scenario_type}`} aria-hidden="true"></div>
                    )}
                  </div>
                </div>
                
                <div className="hierarchy-content">
                  <div className="scenario-name-cell">
                    <GitBranch size={16} aria-hidden="true" />
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
                  onClick={(e) => handleCompare(scenario, e)}
                  className="action-button compare"
                  title="Compare Scenarios"
                >
                  <ArrowRightLeft size={14} />
                </button>
                {scenario.parent_scenario_id && scenario.status === 'active' ? (
                  <button
                    onClick={(e) => handleMerge(scenario, e)}
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
                  onClick={(e) => handleEdit(scenario, e)}
                  className="action-button edit"
                  title="Edit Scenario"
                >
                  <Edit3 size={14} />
                </button>
                {scenario.scenario_type !== 'baseline' && (
                  <button
                    onClick={(e) => handleDelete(scenario, e)}
                    className="action-button delete"
                    title="Delete Scenario"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Render children with proper accessibility */}
          {hasChildren && isExpanded && (
            <div role="group" aria-label={`Child scenarios of ${scenario.name}`}>
              {scenario.children.map((child: ScenarioTreeNode, index: number) => {
                const isLastChild = index === scenario.children.length - 1;
                const newParentLines = [...parentLines, !isLastChild];
                return renderScenarioNode(child, level + 1, isLastChild, newParentLines);
              })}
            </div>
          )}
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
        
        <div 
          className="hierarchy-content"
          role="tree"
          aria-label="Scenario hierarchy tree"
          aria-describedby="tree-instructions"
          ref={treeRef}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div id="tree-instructions" className="sr-only">
            Use arrow keys to navigate, Enter or Space to expand/collapse, Home/End to go to first/last item.
          </div>
          {treeNodes.map((rootScenario, index) => 
            renderScenarioNode(rootScenario, 0, index === treeNodes.length - 1, [])
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
        <button onClick={(e) => handleCreateNew(e)} className="btn-primary">
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
          onConfirm={() => {
            deleteMutation.mutate(deletingScenario.id);
          }}
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