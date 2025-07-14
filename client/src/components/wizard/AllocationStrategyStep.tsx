import React, { useEffect } from 'react';
import { useWizard } from '../../contexts/WizardContext';
import { useThemeColors } from '../../lib/theme-colors';
import { Zap, Settings, User, TrendingUp, Edit3 } from 'lucide-react';

export function AllocationStrategyStep() {
  const { state, dispatch, generateAllocationPlans } = useWizard();
  const colors = useThemeColors();

  useEffect(() => {
    if (state.resourceSuggestions.length > 0 && state.allocationPlans.length === 0) {
      generateAllocationPlans();
    }
  }, [state.resourceSuggestions, generateAllocationPlans]);

  const toggleAutoMode = () => {
    dispatch({ type: 'TOGGLE_AUTO_MODE' });
  };

  const updateAllocation = (index: number, field: string, value: any) => {
    dispatch({
      type: 'UPDATE_ALLOCATION_PLAN',
      payload: { index, plan: { [field]: value } }
    });
  };

  const regeneratePlans = () => {
    generateAllocationPlans();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return colors.status.complete;
    if (confidence >= 60) return colors.status.pending;
    return colors.status.overdue;
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <TrendingUp size={14} />;
    return <Settings size={14} />;
  };

  const getTotalPlannedHours = () => {
    return state.allocationPlans.reduce((total, plan) => total + plan.allocation, 0);
  };

  const getPlannedPeople = () => {
    const people = new Set(state.allocationPlans.map(p => p.personId));
    return people.size;
  };

  if (state.isProcessing) {
    return (
      <div className="wizard-step">
        <h2>Generating Allocation Strategy</h2>
        <p className="wizard-step-description">
          Creating optimal resource allocation plans...
        </p>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Zap size={48} style={{ marginBottom: '1rem', color: colors.primary }} />
          <p>Analyzing the best matches and creating allocation plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step">
      <h2>Allocation Strategy</h2>
      <p className="wizard-step-description">
        Here's our recommended resource allocation strategy. You can use automatic allocation 
        or customize assignments manually.
      </p>

      <div className="wizard-section">
        <div className="wizard-toggle">
          <div 
            className={`toggle-switch ${state.autoMode ? 'active' : ''}`}
            onClick={toggleAutoMode}
          >
            <div className="toggle-handle" />
          </div>
          <div>
            <strong>Automatic Allocation</strong>
            <div style={{ fontSize: '0.85rem', color: colors.utility.gray }}>
              {state.autoMode 
                ? 'AI will automatically assign the best matching resources' 
                : 'Manually customize each assignment'
              }
            </div>
          </div>
          {!state.autoMode && (
            <button
              className="wizard-btn secondary"
              onClick={regeneratePlans}
              style={{ marginLeft: 'auto' }}
            >
              <Zap size={16} />
              Regenerate
            </button>
          )}
        </div>
      </div>

      {state.allocationPlans.length > 0 && (
        <>
          <div className="wizard-stats">
            <div className="wizard-stat">
              <div className="wizard-stat-value">{state.allocationPlans.length}</div>
              <div className="wizard-stat-label">Planned Assignments</div>
            </div>
            <div className="wizard-stat">
              <div className="wizard-stat-value">{getPlannedPeople()}</div>
              <div className="wizard-stat-label">People Involved</div>
            </div>
            <div className="wizard-stat">
              <div className="wizard-stat-value">{getTotalPlannedHours()}</div>
              <div className="wizard-stat-label">Total Hours Allocated</div>
            </div>
            <div className="wizard-stat">
              <div className="wizard-stat-value">
                {Math.round(
                  state.allocationPlans.reduce((sum, p) => sum + p.confidence, 0) / 
                  state.allocationPlans.length
                )}%
              </div>
              <div className="wizard-stat-label">Avg Confidence</div>
            </div>
          </div>

          <div className="wizard-section">
            <h3>Allocation Plans</h3>
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
                        
                        {state.autoMode ? (
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <span>
                              <strong>{plan.allocation}</strong> hours allocated
                            </span>
                            <div style={{ fontSize: '0.8rem', color: colors.utility.gray }}>
                              {plan.reasoning}
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <label style={{ fontSize: '0.8rem' }}>Hours:</label>
                              <input
                                type="number"
                                value={plan.allocation}
                                onChange={(e) => updateAllocation(index, 'allocation', parseInt(e.target.value) || 0)}
                                style={{
                                  width: '80px',
                                  padding: '0.25rem',
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '4px',
                                  background: colors.bg.primary,
                                  color: colors.utility.blue
                                }}
                                min="0"
                                max="40"
                              />
                            </div>
                            <div style={{ fontSize: '0.8rem', color: colors.utility.gray }}>
                              {plan.reasoning}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="wizard-item-actions">
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        backgroundColor: `${getConfidenceColor(plan.confidence)}20`,
                        color: getConfidenceColor(plan.confidence),
                        fontSize: '0.75rem',
                        fontWeight: 500
                      }}>
                        {getConfidenceIcon(plan.confidence)}
                        {plan.confidence}% confidence
                      </div>
                      {!state.autoMode && (
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            color: colors.utility.gray,
                            cursor: 'pointer',
                            padding: '0.25rem'
                          }}
                          onClick={() => {
                            const newReason = prompt('Update reasoning:', plan.reasoning);
                            if (newReason) {
                              updateAllocation(index, 'reasoning', newReason);
                            }
                          }}
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="wizard-section">
            <h3>Allocation Summary</h3>
            <div style={{ marginBottom: '1rem' }}>
              {state.identifiedGaps.map((gap) => {
                const plans = state.allocationPlans.filter(p => p.gapId === `${gap.projectId}-${gap.roleId}`);
                const totalAllocated = plans.reduce((sum, p) => sum + p.allocation, 0);
                const hoursNeeded = gap.gap * 40;
                const coverage = Math.min(100, Math.round((totalAllocated / hoursNeeded) * 100));
                
                return (
                  <div key={`${gap.projectId}-${gap.roleId}`} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    backgroundColor: coverage >= 100 ? "var(--success-bg)" : 
                                     coverage >= 80 ? "var(--warning-bg)" : "var(--danger-bg)",
                    borderRadius: '6px',
                    marginBottom: '0.5rem',
                    border: `1px solid ${coverage >= 100 ? colors.status.complete : 
                                        coverage >= 80 ? colors.status.pending : colors.status.overdue}30`
                  }}>
                    <div>
                      <strong>{gap.roleName}</strong> for {gap.projectName}
                      <div style={{ fontSize: '0.8rem', color: colors.utility.gray }}>
                        Need: {hoursNeeded}h | Planned: {totalAllocated}h | 
                        {plans.length} {plans.length === 1 ? 'person' : 'people'} assigned
                      </div>
                    </div>
                    <div style={{
                      color: coverage >= 100 ? colors.status.complete : 
                             coverage >= 80 ? colors.status.pending : colors.status.overdue,
                      fontWeight: 600
                    }}>
                      {coverage}% allocated
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {state.allocationPlans.length === 0 && !state.isProcessing && (
        <div style={{ 
          textAlign: 'center', 
          color: colors.utility.gray, 
          padding: '2rem'
        }}>
          <button
            className="wizard-btn primary"
            onClick={generateAllocationPlans}
          >
            <Zap size={16} />
            Generate Allocation Plans
          </button>
        </div>
      )}
    </div>
  );
}