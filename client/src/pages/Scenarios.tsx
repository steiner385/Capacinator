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
  AlertTriangle,
  LayoutGrid,
  List,
  Network
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
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'graphical'>('cards');

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

  const renderListView = () => {
    if (!scenarios || scenarios.length === 0) {
      return <div className="no-scenarios">No scenarios found</div>;
    }

    // Build hierarchical tree structure
    const buildScenarioTree = () => {
      const scenarioMap = new Map(scenarios.map(s => [s.id, { ...s, children: [] }]));
      const roots: any[] = [];

      scenarios.forEach(scenario => {
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
            
            <div className="hierarchy-meta">
              <span className={`scenario-type ${scenario.scenario_type}`}>
                {scenario.scenario_type}
              </span>
              <span className={`scenario-status ${scenario.status}`}>
                {scenario.status}
              </span>
              <span className="created-by">{scenario.created_by_name}</span>
              <span className="created-date">{new Date(scenario.created_at).toLocaleDateString()}</span>
            </div>
            
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
              {scenario.parent_scenario_id && scenario.status === 'active' && (
                <button
                  onClick={() => handleMerge(scenario)}
                  className="action-button merge"
                  title="Merge to Parent"
                >
                  <Merge size={14} />
                </button>
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
        
        <div className="hierarchy-content">
          {scenarioTree.map((rootScenario, index) => 
            renderScenarioNode(rootScenario, 0, index === scenarioTree.length - 1, [])
          )}
        </div>
      </div>
    );
  };

  const renderGraphicalView = () => {
    if (!scenarios || scenarios.length === 0) {
      return <div className="no-scenarios">No scenarios found</div>;
    }

    // Sort scenarios by creation date for vertical timeline (newest at top)
    const sortedScenarios = [...scenarios].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Build commit graph structure like Git
    const buildCommitGraph = () => {
      const commits: any[] = [];
      const branchLanes: Map<string, { color: string; scenarios: string[] }> = new Map();
      const scenarioLanes: Map<string, number> = new Map();
      
      // Color palette for different branches
      const branchColors = [
        '#22c55e', // green - baseline
        '#3b82f6', // blue - primary branch
        '#f59e0b', // amber - sandbox
        '#ef4444', // red
        '#8b5cf6', // violet 
        '#06b6d4', // cyan
        '#f97316', // orange
        '#84cc16', // lime
      ];
      
      let nextLaneIndex = 0;
      let colorIndex = 0;

      sortedScenarios.forEach((scenario) => {
        let laneIndex = 0;
        let branchKey = scenario.parent_scenario_id || 'root';
        
        if (scenario.scenario_type === 'baseline') {
          branchKey = 'baseline';
        } else if (scenario.scenario_type === 'sandbox') {
          branchKey = `sandbox-${scenario.id}`;
        }

        // Find or create lane for this branch
        if (branchLanes.has(branchKey)) {
          const existingBranch = branchLanes.get(branchKey)!;
          // Find the lane index for this branch
          laneIndex = Array.from(branchLanes.entries())
            .findIndex(([key]) => key === branchKey);
        } else {
          // New branch - assign next available lane
          laneIndex = nextLaneIndex++;
          branchLanes.set(branchKey, {
            color: branchColors[colorIndex % branchColors.length],
            scenarios: []
          });
          colorIndex++;
        }

        branchLanes.get(branchKey)!.scenarios.push(scenario.id);
        scenarioLanes.set(scenario.id, laneIndex);

        commits.push({
          ...scenario,
          laneIndex,
          branchKey,
          color: branchLanes.get(branchKey)!.color
        });
      });

      return { commits, branchLanes, scenarioLanes, maxLanes: nextLaneIndex };
    };

    const { commits, branchLanes, scenarioLanes, maxLanes } = buildCommitGraph();

    return (
      <div className="commit-graph">
        <div className="graph-header">
          <div className="graph-title">Scenario Commit Graph</div>
          <div className="graph-legend">
            <div className="legend-item">
              <div className="commit-dot baseline"></div>
              <span>Baseline</span>
            </div>
            <div className="legend-item">
              <div className="commit-dot branch"></div>
              <span>Branch</span>
            </div>
            <div className="legend-item">
              <div className="commit-dot sandbox"></div>
              <span>Sandbox</span>
            </div>
          </div>
        </div>

        <div className="graph-container">
          <div className="graph-lanes" style={{ width: `${maxLanes * 30 + 20}px` }}>
            {/* Vertical branch lines */}
            {Array.from(branchLanes.entries()).map(([branchKey, branch], index) => (
              <div
                key={branchKey}
                className="branch-line"
                style={{
                  left: `${index * 30 + 15}px`,
                  backgroundColor: branch.color,
                }}
              />
            ))}
            
            {/* Commit dots and connections */}
            {commits.map((commit, commitIndex) => {
              const parentCommit = commits.find(c => c.id === commit.parent_scenario_id);
              const parentLane = parentCommit ? scenarioLanes.get(parentCommit.id) : null;
              const hasParentConnection = parentLane !== null && parentLane !== commit.laneIndex;
              
              return (
                <div key={commit.id} className="commit-row" style={{ top: `${commitIndex * 60}px` }}>
                  {/* Branch connection lines for merges/branches */}
                  {hasParentConnection && (
                    <svg
                      className="branch-connection"
                      style={{
                        left: `${Math.min(commit.laneIndex, parentLane!) * 30}px`,
                        width: `${Math.abs(commit.laneIndex - parentLane!) * 30 + 30}px`,
                      }}
                    >
                      <path
                        d={`M ${commit.laneIndex > parentLane! ? (parentLane! - Math.min(commit.laneIndex, parentLane!)) * 30 + 15 : 15} 30 
                            Q ${commit.laneIndex > parentLane! ? (parentLane! - Math.min(commit.laneIndex, parentLane!)) * 30 + 15 : 15} 15 
                              ${commit.laneIndex > parentLane! ? Math.abs(commit.laneIndex - parentLane!) * 30 + 15 : (commit.laneIndex - Math.min(commit.laneIndex, parentLane!)) * 30 + 15} 0`}
                        stroke={commit.color}
                        strokeWidth="2"
                        fill="none"
                      />
                    </svg>
                  )}
                  
                  {/* Commit dot */}
                  <div
                    className={`commit-dot ${commit.scenario_type}`}
                    style={{
                      left: `${commit.laneIndex * 30 + 10}px`,
                      backgroundColor: commit.color,
                    }}
                    onClick={() => handleEdit(commit)}
                  />
                  
                  {/* Commit info panel */}
                  <div className="commit-info-panel" style={{ left: `${maxLanes * 30 + 40}px` }}>
                    <div className="commit-summary">
                      <div className="commit-title">{commit.name}</div>
                      {commit.description && (
                        <div className="commit-description">{commit.description}</div>
                      )}
                    </div>
                    <div className="commit-metadata">
                      <span className="commit-author">{commit.created_by_name}</span>
                      <span className="commit-date">
                        {new Date(commit.created_at).toLocaleDateString()}
                      </span>
                      <span className={`commit-status ${commit.status}`}>
                        {commit.status}
                      </span>
                    </div>
                    <div className="commit-actions">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBranch(commit); }}
                        className="action-btn branch"
                        title="Create Branch"
                      >
                        <GitBranch size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCompare(commit); }}
                        className="action-btn compare"
                        title="Compare"
                      >
                        <ArrowRightLeft size={14} />
                      </button>
                      {commit.parent_scenario_id && commit.status === 'active' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMerge(commit); }}
                          className="action-btn merge"
                          title="Merge"
                        >
                          <Merge size={14} />
                        </button>
                      )}
                      {commit.scenario_type !== 'baseline' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(commit); }}
                          className="action-btn delete"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
        <div className="view-mode-toggle">
          <button
            className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid size={14} />
            Cards
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('list')}
          >
            <List size={14} />
            List
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'graphical' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('graphical')}
          >
            <Network size={14} />
            Graphical
          </button>
        </div>
      </div>

      <div className="scenarios-content">
        {viewMode === 'cards' && (
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
        )}
        {viewMode === 'list' && renderListView()}
        {viewMode === 'graphical' && renderGraphicalView()}
      </div>

      <CreateScenarioModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        parentScenario={selectedParentScenario}
      />
    </div>
  );
};