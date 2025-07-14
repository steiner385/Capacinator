import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client';
import './ScenarioComparison.css';

interface Scenario {
  id: string;
  name: string;
  description: string;
  scenario_type: string;
  status: string;
  created_at: string;
  parent_scenario_name?: string;
}

interface Assignment {
  person_name: string;
  project_name: string;
  role_name?: string;
  allocation_percentage?: number;
  computed_start_date?: string;
  computed_end_date?: string;
  old_allocation?: number;
  new_allocation?: number;
  old_role?: string;
  new_role?: string;
  old_dates?: string;
  new_dates?: string;
  allocation_change?: boolean;
  role_change?: boolean;
  date_change?: boolean;
}

interface ComparisonData {
  scenario1: Scenario;
  scenario2: Scenario;
  differences: {
    assignments: {
      added: Assignment[];
      modified: Assignment[];
      removed: Assignment[];
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
    utilization_impact: {
      team_utilization_change?: string;
      over_allocated_people?: string;
      available_capacity?: string;
    };
    capacity_impact: {
      additional_resource_needs?: string;
      skills_gap?: string;
    };
    timeline_impact: {
      projects_affected?: number;
      average_timeline_change?: string;
      projects_at_risk?: number;
    };
  };
}

export const ScenarioComparison: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assignments' | 'phases' | 'projects' | 'metrics' | 'summary'>('summary');

  const sourceId = searchParams.get('source');
  const targetId = searchParams.get('target');

  useEffect(() => {
    if (sourceId && targetId) {
      loadComparison();
    }
  }, [sourceId, targetId]);

  const loadComparison = async () => {
    if (!sourceId || !targetId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.scenarios.compare(sourceId, targetId);
      setComparisonData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load comparison');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    navigate('/scenarios');
  };

  const getTotalChanges = () => {
    if (!comparisonData) return 0;
    const { assignments, phases, projects } = comparisonData.differences;
    return (
      assignments.added.length + assignments.modified.length + assignments.removed.length +
      phases.added.length + phases.modified.length + phases.removed.length +
      projects.added.length + projects.modified.length + projects.removed.length
    );
  };

  const renderScenarioHeader = (scenario: Scenario, label: string) => (
    <div className="scenario-header">
      <div className="scenario-label">{label}</div>
      <h2 className="scenario-name">{scenario.name}</h2>
      <p className="scenario-description">{scenario.description}</p>
      <div className="scenario-badges">
        <span className={`badge scenario-type ${scenario.scenario_type}`}>
          {scenario.scenario_type.toUpperCase()}
        </span>
        <span className={`badge scenario-status ${scenario.status}`}>
          {scenario.status.toUpperCase()}
        </span>
        <span className="badge scenario-date">
          {new Date(scenario.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );

  const renderSummaryTab = () => {
    if (!comparisonData) return null;

    const totalChanges = getTotalChanges();
    const { assignments, phases, projects } = comparisonData.differences;

    return (
      <div className="summary-tab">
        <div className="summary-cards">
          <div className="summary-card">
            <h3>Total Changes</h3>
            <div className="summary-number">{totalChanges}</div>
            <div className="summary-breakdown">
              <div>Assignments: {assignments.added.length + assignments.modified.length + assignments.removed.length}</div>
              <div>Phases: {phases.added.length + phases.modified.length + phases.removed.length}</div>
              <div>Projects: {projects.added.length + projects.modified.length + projects.removed.length}</div>
            </div>
          </div>

          <div className="summary-card">
            <h3>Assignment Changes</h3>
            <div className="change-breakdown">
              <div className="change-item added">
                <span className="change-count">{assignments.added.length}</span>
                <span className="change-label">Added</span>
              </div>
              <div className="change-item modified">
                <span className="change-count">{assignments.modified.length}</span>
                <span className="change-label">Modified</span>
              </div>
              <div className="change-item removed">
                <span className="change-count">{assignments.removed.length}</span>
                <span className="change-label">Removed</span>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <h3>Impact Metrics</h3>
            <div className="metrics-preview">
              {comparisonData.metrics.utilization_impact.team_utilization_change && (
                <div>Utilization: {comparisonData.metrics.utilization_impact.team_utilization_change}</div>
              )}
              {comparisonData.metrics.timeline_impact.projects_affected !== undefined && (
                <div>Projects Affected: {comparisonData.metrics.timeline_impact.projects_affected}</div>
              )}
              {comparisonData.metrics.timeline_impact.projects_at_risk !== undefined && (
                <div>Projects at Risk: {comparisonData.metrics.timeline_impact.projects_at_risk}</div>
              )}
            </div>
          </div>
        </div>

        {totalChanges === 0 && (
          <div className="no-changes-message">
            <h3>No Differences Found</h3>
            <p>These two scenarios are identical in terms of assignments, phases, and project details.</p>
          </div>
        )}
      </div>
    );
  };

  const renderAssignmentChanges = () => {
    if (!comparisonData) return null;

    const { assignments } = comparisonData.differences;
    const totalChanges = assignments.added.length + assignments.modified.length + assignments.removed.length;

    if (totalChanges === 0) {
      return <div className="no-changes">No assignment differences found</div>;
    }

    return (
      <div className="assignment-changes">
        {assignments.added.length > 0 && (
          <div className="change-section added">
            <h3 className="change-header">
              <span className="change-icon">+</span>
              Added Assignments ({assignments.added.length})
            </h3>
            <div className="assignment-list">
              {assignments.added.map((assignment, index) => (
                <div key={index} className="assignment-item added">
                  <div className="assignment-main">
                    <strong>{assignment.person_name}</strong> → <strong>{assignment.project_name}</strong>
                  </div>
                  <div className="assignment-details">
                    <span className="role">{assignment.role_name}</span>
                    <span className="allocation">{assignment.allocation_percentage}%</span>
                    {assignment.computed_start_date && assignment.computed_end_date && (
                      <span className="dates">
                        {assignment.computed_start_date} to {assignment.computed_end_date}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {assignments.modified.length > 0 && (
          <div className="change-section modified">
            <h3 className="change-header">
              <span className="change-icon">~</span>
              Modified Assignments ({assignments.modified.length})
            </h3>
            <div className="assignment-list">
              {assignments.modified.map((assignment, index) => (
                <div key={index} className="assignment-item modified">
                  <div className="assignment-main">
                    <strong>{assignment.person_name}</strong> → <strong>{assignment.project_name}</strong>
                  </div>
                  <div className="assignment-changes">
                    {assignment.allocation_change && (
                      <div className="change-detail">
                        <span className="change-type">Allocation:</span>
                        <span className="old-value">{assignment.old_allocation}%</span>
                        <span className="arrow">→</span>
                        <span className="new-value">{assignment.new_allocation}%</span>
                      </div>
                    )}
                    {assignment.role_change && (
                      <div className="change-detail">
                        <span className="change-type">Role:</span>
                        <span className="old-value">{assignment.old_role}</span>
                        <span className="arrow">→</span>
                        <span className="new-value">{assignment.new_role}</span>
                      </div>
                    )}
                    {assignment.date_change && (
                      <div className="change-detail">
                        <span className="change-type">Dates:</span>
                        <span className="old-value">{assignment.old_dates}</span>
                        <span className="arrow">→</span>
                        <span className="new-value">{assignment.new_dates}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {assignments.removed.length > 0 && (
          <div className="change-section removed">
            <h3 className="change-header">
              <span className="change-icon">-</span>
              Removed Assignments ({assignments.removed.length})
            </h3>
            <div className="assignment-list">
              {assignments.removed.map((assignment, index) => (
                <div key={index} className="assignment-item removed">
                  <div className="assignment-main">
                    <strong>{assignment.person_name}</strong> → <strong>{assignment.project_name}</strong>
                  </div>
                  <div className="assignment-details">
                    <span className="role">{assignment.role_name}</span>
                    <span className="allocation">{assignment.allocation_percentage}%</span>
                    {assignment.computed_start_date && assignment.computed_end_date && (
                      <span className="dates">
                        {assignment.computed_start_date} to {assignment.computed_end_date}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMetricsTab = () => {
    if (!comparisonData) return null;

    const { metrics } = comparisonData;

    return (
      <div className="metrics-tab">
        <div className="metrics-grid">
          <div className="metric-section">
            <h3>Utilization Impact</h3>
            <div className="metric-items">
              {metrics.utilization_impact.team_utilization_change && (
                <div className="metric-item">
                  <span className="metric-label">Team Utilization Change:</span>
                  <span className="metric-value">{metrics.utilization_impact.team_utilization_change}</span>
                </div>
              )}
              {metrics.utilization_impact.over_allocated_people && (
                <div className="metric-item">
                  <span className="metric-label">Over-allocated People:</span>
                  <span className="metric-value">{metrics.utilization_impact.over_allocated_people}</span>
                </div>
              )}
              {metrics.utilization_impact.available_capacity && (
                <div className="metric-item">
                  <span className="metric-label">Available Capacity:</span>
                  <span className="metric-value">{metrics.utilization_impact.available_capacity}</span>
                </div>
              )}
            </div>
          </div>

          <div className="metric-section">
            <h3>Capacity Impact</h3>
            <div className="metric-items">
              {metrics.capacity_impact.additional_resource_needs && (
                <div className="metric-item">
                  <span className="metric-label">Additional Resource Needs:</span>
                  <span className="metric-value">{metrics.capacity_impact.additional_resource_needs}</span>
                </div>
              )}
              {metrics.capacity_impact.skills_gap && (
                <div className="metric-item">
                  <span className="metric-label">Skills Gap:</span>
                  <span className="metric-value">{metrics.capacity_impact.skills_gap}</span>
                </div>
              )}
            </div>
          </div>

          <div className="metric-section">
            <h3>Timeline Impact</h3>
            <div className="metric-items">
              {metrics.timeline_impact.projects_affected !== undefined && (
                <div className="metric-item">
                  <span className="metric-label">Projects Affected:</span>
                  <span className="metric-value">{metrics.timeline_impact.projects_affected}</span>
                </div>
              )}
              {metrics.timeline_impact.average_timeline_change && (
                <div className="metric-item">
                  <span className="metric-label">Average Timeline Change:</span>
                  <span className="metric-value">{metrics.timeline_impact.average_timeline_change}</span>
                </div>
              )}
              {metrics.timeline_impact.projects_at_risk !== undefined && (
                <div className="metric-item">
                  <span className="metric-label">Projects at Risk:</span>
                  <span className="metric-value">{metrics.timeline_impact.projects_at_risk}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading">Loading comparison...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!comparisonData) return <div className="error">No comparison data available</div>;

  return (
    <div className="scenario-comparison">
      <div className="comparison-header">
        <button className="back-button" onClick={goBack}>
          ← Back to Scenarios
        </button>
        <h1>Scenario Comparison</h1>
      </div>

      <div className="scenario-headers">
        {renderScenarioHeader(comparisonData.scenario1, 'Source Scenario')}
        <div className="vs-divider">VS</div>
        {renderScenarioHeader(comparisonData.scenario2, 'Target Scenario')}
      </div>

      <div className="comparison-tabs">
        <button 
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button 
          className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments ({comparisonData.differences.assignments.added.length + comparisonData.differences.assignments.modified.length + comparisonData.differences.assignments.removed.length})
        </button>
        <button 
          className={`tab ${activeTab === 'phases' ? 'active' : ''}`}
          onClick={() => setActiveTab('phases')}
        >
          Phases ({comparisonData.differences.phases.added.length + comparisonData.differences.phases.modified.length + comparisonData.differences.phases.removed.length})
        </button>
        <button 
          className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          Projects ({comparisonData.differences.projects.added.length + comparisonData.differences.projects.modified.length + comparisonData.differences.projects.removed.length})
        </button>
        <button 
          className={`tab ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          Impact Metrics
        </button>
      </div>

      <div className="comparison-content">
        {activeTab === 'summary' && renderSummaryTab()}
        {activeTab === 'assignments' && renderAssignmentChanges()}
        {activeTab === 'phases' && <div className="coming-soon">Phase comparison visualization coming soon</div>}
        {activeTab === 'projects' && <div className="coming-soon">Project comparison visualization coming soon</div>}
        {activeTab === 'metrics' && renderMetricsTab()}
      </div>
    </div>
  );
};