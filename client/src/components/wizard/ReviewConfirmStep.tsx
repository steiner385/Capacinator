import React from 'react';
import { useWizard } from '../../contexts/WizardContext';
import { useThemeColors } from '../../lib/theme-colors';
import { CheckCircle, AlertTriangle, Calendar, User, Clock, TrendingUp } from 'lucide-react';

export function ReviewConfirmStep() {
  const { state, applyAllocations } = useWizard();
  const colors = useThemeColors();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTotalPlannedHours = () => {
    return state.allocationPlans.reduce((total, plan) => total + plan.allocation, 0);
  };

  const getPlannedPeople = () => {
    const people = new Set(state.allocationPlans.map(p => p.personId));
    return people.size;
  };

  const getProjectSummary = () => {
    const summary: { [key: string]: any } = {};
    
    state.selectedProjects.forEach(project => {
      const projectGaps = state.identifiedGaps.filter(g => g.projectId === project.id);
      const projectPlans = state.allocationPlans.filter(p => 
        projectGaps.some(g => `${g.projectId}-${g.roleId}` === p.gapId)
      );
      
      summary[project.id] = {
        project,
        gaps: projectGaps,
        plans: projectPlans,
        totalHours: projectPlans.reduce((sum, p) => sum + p.allocation, 0),
        people: new Set(projectPlans.map(p => p.personId)).size
      };
    });
    
    return summary;
  };

  const getImpactAnalysis = () => {
    const totalGapHours = state.identifiedGaps.reduce((sum, gap) => sum + (gap.gap * 40), 0);
    const totalPlannedHours = getTotalPlannedHours();
    const coverage = totalGapHours > 0 ? Math.round((totalPlannedHours / totalGapHours) * 100) : 0;
    
    return {
      totalGapHours,
      totalPlannedHours,
      coverage,
      status: coverage >= 90 ? 'excellent' : coverage >= 70 ? 'good' : coverage >= 50 ? 'partial' : 'insufficient'
    };
  };

  const projectSummary = getProjectSummary();
  const impact = getImpactAnalysis();

  const handleApplyAllocations = () => {
    if (window.confirm('Are you sure you want to apply these resource allocations? This will create new assignments and update project schedules.')) {
      applyAllocations();
    }
  };

  if (state.isProcessing) {
    return (
      <div className="wizard-step">
        <h2>Applying Allocations</h2>
        <p className="wizard-step-description">
          Creating assignments and updating project schedules...
        </p>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p>Please wait while we apply your resource allocations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step">
      <h2>Review & Confirm</h2>
      <p className="wizard-step-description">
        Review your resource allocation plan before applying the changes. Once confirmed, 
        these assignments will be created and added to your projects.
      </p>

      {/* Impact Analysis */}
      <div className="wizard-section">
        <h3>Impact Analysis</h3>
        <div className="wizard-stats">
          <div className="wizard-stat">
            <div className="wizard-stat-value" style={{ 
              color: impact.status === 'excellent' ? colors.status.complete :
                     impact.status === 'good' ? colors.primary :
                     impact.status === 'partial' ? colors.status.pending : colors.status.overdue
            }}>
              {impact.coverage}%
            </div>
            <div className="wizard-stat-label">Gap Coverage</div>
          </div>
          <div className="wizard-stat">
            <div className="wizard-stat-value">{state.allocationPlans.length}</div>
            <div className="wizard-stat-label">New Assignments</div>
          </div>
          <div className="wizard-stat">
            <div className="wizard-stat-value">{getPlannedPeople()}</div>
            <div className="wizard-stat-label">People Involved</div>
          </div>
          <div className="wizard-stat">
            <div className="wizard-stat-value">{getTotalPlannedHours()}</div>
            <div className="wizard-stat-label">Total Hours</div>
          </div>
        </div>

        <div style={{
          padding: '1rem',
          borderRadius: '6px',
          backgroundColor: impact.status === 'excellent' ? "var(--success-bg)" :
                           impact.status === 'good' ? "var(--primary-light)" :
                           impact.status === 'partial' ? "var(--warning-bg)" : "var(--danger-bg)",
          border: `1px solid ${impact.status === 'excellent' ? colors.status.complete :
                                impact.status === 'good' ? colors.utility.blue :
                                impact.status === 'partial' ? colors.status.pending : colors.status.overdue}30`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          {impact.status === 'excellent' ? (
            <CheckCircle color={colors.status.complete} size={20} />
          ) : impact.status === 'good' ? (
            <TrendingUp color={colors.primary} size={20} />
          ) : (
            <AlertTriangle color={impact.status === 'partial' ? colors.status.pending : colors.status.overdue} size={20} />
          )}
          <div>
            <strong>
              {impact.status === 'excellent' && 'Excellent Coverage'}
              {impact.status === 'good' && 'Good Coverage'}
              {impact.status === 'partial' && 'Partial Coverage'}
              {impact.status === 'insufficient' && 'Insufficient Coverage'}
            </strong>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
              {impact.status === 'excellent' && 'All resource gaps are well covered with this allocation plan.'}
              {impact.status === 'good' && 'Most resource gaps are covered. Some minor gaps may remain.'}
              {impact.status === 'partial' && 'Some resource gaps are covered, but significant gaps remain.'}
              {impact.status === 'insufficient' && 'Many resource gaps remain uncovered. Consider alternative strategies.'}
            </div>
          </div>
        </div>
      </div>

      {/* Project Summary */}
      <div className="wizard-section">
        <h3>Project Summary</h3>
        {Object.values(projectSummary).map((summary: any) => (
          <div key={summary.project.id} style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ 
              color: colors.utility.blue,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Calendar size={16} />
              {summary.project.name}
            </h4>
            
            <div style={{ 
              backgroundColor: 'var(--bg-secondary)',
              padding: '1rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem' }}>
                  <strong>{summary.gaps.length}</strong> gaps identified
                </span>
                <span style={{ fontSize: '0.85rem' }}>
                  <strong>{summary.plans.length}</strong> assignments planned
                </span>
                <span style={{ fontSize: '0.85rem' }}>
                  <strong>{summary.people}</strong> people involved
                </span>
                <span style={{ fontSize: '0.85rem' }}>
                  <strong>{summary.totalHours}</strong> hours allocated
                </span>
              </div>

              {summary.plans.length > 0 && (
                <div>
                  <strong style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
                    Planned Assignments:
                  </strong>
                  {summary.plans.map((plan: any, index: number) => (
                    <div key={index} style={{ 
                      fontSize: '0.8rem',
                      color: colors.utility.gray,
                      marginBottom: '0.25rem'
                    }}>
                      • {plan.personName} as {plan.roleName} ({plan.allocation}h)
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Allocations */}
      <div className="wizard-section">
        <h3>Detailed Allocations</h3>
        <div className="wizard-list">
          {state.allocationPlans.map((plan, index) => {
            const gap = state.identifiedGaps.find(g => 
              `${g.projectId}-${g.roleId}` === plan.gapId
            );
            
            return (
              <div key={index} className="wizard-item">
                <div className="wizard-item-content">
                  <div className="wizard-item-title">
                    <User size={16} style={{ marginRight: '0.5rem' }} />
                    {plan.personName} → {plan.roleName}
                  </div>
                  <div className="wizard-item-details">
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Project:</strong> {gap?.projectName}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} />
                        {plan.allocation} hours
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} />
                        {gap && `${formatDate(gap.timeline.start)} - ${formatDate(gap.timeline.end)}`}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: colors.utility.gray, marginTop: '0.25rem' }}>
                      {plan.reasoning}
                    </div>
                  </div>
                </div>
                <div className="wizard-item-actions">
                  <div style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    backgroundColor: plan.confidence >= 80 ? "var(--success-bg)" : 
                                     plan.confidence >= 60 ? "var(--warning-bg)" : "var(--danger-bg)",
                    color: plan.confidence >= 80 ? colors.status.complete : 
                           plan.confidence >= 60 ? colors.status.pending : colors.status.overdue,
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}>
                    {plan.confidence}% confidence
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="wizard-section">
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center',
          paddingTop: '1rem'
        }}>
          <button
            className="wizard-btn success"
            onClick={handleApplyAllocations}
            disabled={state.allocationPlans.length === 0}
            style={{ 
              fontSize: '1rem',
              padding: '1rem 2rem',
              minWidth: '200px'
            }}
          >
            <CheckCircle size={20} />
            Apply Allocations
          </button>
        </div>
        
        <div style={{
          textAlign: 'center',
          fontSize: '0.85rem',
          color: colors.utility.gray,
          marginTop: '1rem',
          fontStyle: 'italic'
        }}>
          This will create {state.allocationPlans.length} new assignments and update your project schedules.
        </div>
      </div>
    </div>
  );
}