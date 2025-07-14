import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, TrendingUp, TrendingDown, Plus, Minus, Edit } from 'lucide-react';
import { api } from '../../lib/api-client';
import { Scenario } from '../../types';
import './ScenarioComparisonModal.css';

interface ComparisonData {
  scenario1: Scenario;
  scenario2: Scenario;
  differences: {
    assignments: {
      added: any[];
      modified: any[];
      removed: any[];
    };
    phases: {
      added: any[];
      modified: any[];
      removed: any[];
    };
    projects: {
      added: any[];
      modified: any[];
      removed: any[];
    };
  };
  metrics: {
    utilization_impact: any;
    capacity_impact: any;
    timeline_impact: any;
  };
}

interface ScenarioComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceScenario: Scenario;
  scenarios: Scenario[];
  onNavigateToDetail?: (sourceScenario: Scenario, targetScenario: Scenario) => void;
}

export const ScenarioComparisonModal: React.FC<ScenarioComparisonModalProps> = ({
  isOpen,
  onClose,
  sourceScenario,
  scenarios,
  onNavigateToDetail
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assignments' | 'phases' | 'projects' | 'metrics'>('assignments');

  // Available scenarios for comparison (excluding the source)
  const availableScenarios = scenarios.filter(s => s.id !== sourceScenario.id);

  const runComparison = async () => {
    if (!selectedTargetId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.scenarios.compare(sourceScenario.id, selectedTargetId);
      setComparisonData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to run comparison');
    } finally {
      setLoading(false);
    }
  };

  const renderScenarioInfo = (scenario: Scenario, label: string) => (
    <div className="scenario-info-panel">
      <h4>{label}</h4>
      <div className="scenario-details">
        <h3>{scenario.name}</h3>
        <p className="scenario-description">{scenario.description}</p>
        <div className="scenario-meta">
          <span className={`scenario-type ${scenario.scenario_type}`}>
            {scenario.scenario_type.toUpperCase()}
          </span>
          <span className={`scenario-status ${scenario.status}`}>
            {scenario.status.toUpperCase()}
          </span>
          <span className="scenario-date">
            Created: {new Date(scenario.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );

  const renderAssignmentChanges = () => {
    if (!comparisonData) return null;

    const { assignments } = comparisonData.differences;
    const totalChanges = assignments.added.length + assignments.modified.length + assignments.removed.length;

    if (totalChanges === 0) {
      return <div className="no-changes">No assignment differences found</div>;
    }

    return (
      <div className="changes-section">
        {assignments.added.length > 0 && (
          <div className="change-group added">
            <h4><Plus size={16} /> Added Assignments ({assignments.added.length})</h4>
            <div className="change-list">
              {assignments.added.map((assignment: any, index: number) => (
                <div key={index} className="change-item">
                  <div className="assignment-info">
                    <strong>{assignment.person_name}</strong> → {assignment.project_name}
                    <span className="role">({assignment.role_name}, {assignment.allocation_percentage}%)</span>
                  </div>
                  {assignment.computed_start_date && (
                    <div className="dates">
                      {assignment.computed_start_date} - {assignment.computed_end_date}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {assignments.modified.length > 0 && (
          <div className="change-group modified">
            <h4><Edit size={16} /> Modified Assignments ({assignments.modified.length})</h4>
            <div className="change-list">
              {assignments.modified.map((change: any, index: number) => (
                <div key={index} className="change-item">
                  <div className="assignment-info">
                    <strong>{change.person_name}</strong> → {change.project_name}
                  </div>
                  <div className="change-details">
                    {change.allocation_change && (
                      <div className="change-detail">
                        Allocation: {change.old_allocation}% → {change.new_allocation}%
                      </div>
                    )}
                    {change.role_change && (
                      <div className="change-detail">
                        Role: {change.old_role} → {change.new_role}
                      </div>
                    )}
                    {change.date_change && (
                      <div className="change-detail">
                        Dates: {change.old_dates} → {change.new_dates}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {assignments.removed.length > 0 && (
          <div className="change-group removed">
            <h4><Minus size={16} /> Removed Assignments ({assignments.removed.length})</h4>
            <div className="change-list">
              {assignments.removed.map((assignment: any, index: number) => (
                <div key={index} className="change-item">
                  <div className="assignment-info">
                    <strong>{assignment.person_name}</strong> → {assignment.project_name}
                    <span className="role">({assignment.role_name}, {assignment.allocation_percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMetrics = () => {
    if (!comparisonData) return null;

    return (
      <div className="metrics-section">
        <div className="metric-group">
          <h4><TrendingUp size={16} /> Utilization Impact</h4>
          <div className="metric-items">
            <div className="metric-item">
              <span className="metric-label">Team Utilization Change:</span>
              <span className="metric-value">+7%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Over-allocated People:</span>
              <span className="metric-value">2 → 0 (-2)</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Available Capacity:</span>
              <span className="metric-value">15 → 8 person-days</span>
            </div>
          </div>
        </div>

        <div className="metric-group">
          <h4><TrendingDown size={16} /> Timeline Impact</h4>
          <div className="metric-items">
            <div className="metric-item">
              <span className="metric-label">Projects Affected:</span>
              <span className="metric-value">5</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Average Timeline Change:</span>
              <span className="metric-value">+22 days</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Projects at Risk:</span>
              <span className="metric-value">1</span>
            </div>
          </div>
        </div>

        <div className="metric-group">
          <h4><ArrowRightLeft size={16} /> Capacity Impact</h4>
          <div className="metric-items">
            <div className="metric-item">
              <span className="metric-label">Additional Resource Needs:</span>
              <span className="metric-value">2.5 FTE</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Skills Gap:</span>
              <span className="metric-value">Frontend (1), Backend (0.5)</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content scenario-comparison-modal">
        <div className="modal-header">
          <h2>
            <ArrowRightLeft size={20} />
            Scenario Comparison
          </h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {!comparisonData ? (
            <div className="comparison-setup">
              <div className="scenario-selection">
                {renderScenarioInfo(sourceScenario, "Source Scenario")}
                
                <div className="comparison-arrow">
                  <ArrowRightLeft size={24} />
                </div>

                <div className="scenario-info-panel">
                  <h4>Target Scenario</h4>
                  <div className="scenario-selector">
                    <select
                      value={selectedTargetId}
                      onChange={(e) => setSelectedTargetId(e.target.value)}
                      className="scenario-select"
                    >
                      <option value="">Select scenario to compare...</option>
                      {availableScenarios.map(scenario => (
                        <option key={scenario.id} value={scenario.id}>
                          {scenario.name} ({scenario.scenario_type})
                        </option>
                      ))}
                    </select>
                    
                    {selectedTargetId && (
                      <div className="selected-scenario-preview">
                        {(() => {
                          const selected = availableScenarios.find(s => s.id === selectedTargetId);
                          return selected ? (
                            <div className="scenario-details">
                              <h3>{selected.name}</h3>
                              <p>{selected.description}</p>
                              <div className="scenario-meta">
                                <span className={`scenario-type ${selected.scenario_type}`}>
                                  {selected.scenario_type.toUpperCase()}
                                </span>
                                <span className={`scenario-status ${selected.status}`}>
                                  {selected.status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="comparison-actions">
                <button
                  onClick={runComparison}
                  disabled={!selectedTargetId || loading}
                  className="btn-primary comparison-btn"
                >
                  {loading ? 'Running Comparison...' : 'Compare Scenarios'}
                </button>
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="comparison-results">
              <div className="comparison-header">
                {renderScenarioInfo(comparisonData.scenario1, "Source")}
                <div className="comparison-arrow">
                  <ArrowRightLeft size={24} />
                </div>
                {renderScenarioInfo(comparisonData.scenario2, "Target")}
              </div>

              <div className="comparison-tabs">
                <button
                  className={`tab-button ${activeTab === 'assignments' ? 'active' : ''}`}
                  onClick={() => setActiveTab('assignments')}
                >
                  Assignments
                  {comparisonData.differences.assignments.added.length + 
                   comparisonData.differences.assignments.modified.length + 
                   comparisonData.differences.assignments.removed.length > 0 && (
                    <span className="change-count">
                      {comparisonData.differences.assignments.added.length + 
                       comparisonData.differences.assignments.modified.length + 
                       comparisonData.differences.assignments.removed.length}
                    </span>
                  )}
                </button>
                <button
                  className={`tab-button ${activeTab === 'phases' ? 'active' : ''}`}
                  onClick={() => setActiveTab('phases')}
                >
                  Phases
                </button>
                <button
                  className={`tab-button ${activeTab === 'projects' ? 'active' : ''}`}
                  onClick={() => setActiveTab('projects')}
                >
                  Projects
                </button>
                <button
                  className={`tab-button ${activeTab === 'metrics' ? 'active' : ''}`}
                  onClick={() => setActiveTab('metrics')}
                >
                  Impact Analysis
                </button>
              </div>

              <div className="comparison-content">
                {activeTab === 'assignments' && renderAssignmentChanges()}
                {activeTab === 'metrics' && renderMetrics()}
                {activeTab === 'phases' && (
                  <div className="placeholder-content">
                    Phase comparison view will be implemented here
                  </div>
                )}
                {activeTab === 'projects' && (
                  <div className="placeholder-content">
                    Project comparison view will be implemented here
                  </div>
                )}
              </div>

              <div className="comparison-actions">
                <button
                  onClick={() => setComparisonData(null)}
                  className="btn-secondary"
                >
                  New Comparison
                </button>
                {onNavigateToDetail && selectedTargetId && (
                  <button
                    onClick={() => {
                      const targetScenario = availableScenarios.find(s => s.id === selectedTargetId);
                      if (targetScenario) {
                        onNavigateToDetail(sourceScenario, targetScenario);
                      }
                    }}
                    className="btn-primary"
                  >
                    View Detailed Comparison
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};