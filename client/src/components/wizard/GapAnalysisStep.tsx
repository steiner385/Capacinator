import React, { useEffect } from 'react';
import { useWizard } from '../../contexts/WizardContext';
import { useThemeColors } from '../../lib/theme-colors';
import { AlertTriangle, TrendingUp, Clock, Users } from 'lucide-react';

export function GapAnalysisStep() {
  const { state, analyzeGaps } = useWizard();
  const colors = useThemeColors();

  useEffect(() => {
    if (state.selectedProjects.length > 0 && state.identifiedGaps.length === 0) {
      analyzeGaps();
    }
  }, [state.selectedProjects, analyzeGaps]);

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return <AlertTriangle size={16} color={colors.status.overdue} />;
      case 'medium':
        return <TrendingUp size={16} color={colors.status.pending} />;
      case 'low':
        return <Clock size={16} color={colors.status.complete} />;
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return colors.status.overdue;
      case 'medium': return colors.status.pending;
      case 'low': return colors.status.complete;
      default: return colors.utility.gray;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getGapsByPriority = () => {
    const byPriority = {
      high: state.identifiedGaps.filter(g => g.priority === 'high'),
      medium: state.identifiedGaps.filter(g => g.priority === 'medium'),
      low: state.identifiedGaps.filter(g => g.priority === 'low'),
    };
    return byPriority;
  };

  const getTotalGapHours = () => {
    return state.identifiedGaps.reduce((total, gap) => total + (gap.gap * 40), 0); // 40 hours per person
  };

  const getUniqueRoles = () => {
    const roles = new Set(state.identifiedGaps.map(g => g.roleName));
    return Array.from(roles);
  };

  const gapsByPriority = getGapsByPriority();

  if (state.isProcessing) {
    return (
      <div className="wizard-step">
        <h2>Analyzing Gaps</h2>
        <p className="wizard-step-description">
          Analyzing your selected projects to identify resource gaps...
        </p>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p>Processing {state.selectedProjects.length} projects...</p>
        </div>
      </div>
    );
  }

  if (state.identifiedGaps.length === 0) {
    return (
      <div className="wizard-step">
        <h2>Gap Analysis</h2>
        <p className="wizard-step-description">
          No resource gaps found in your selected projects. All projects appear to be fully staffed!
        </p>
        <div style={{ 
          textAlign: 'center', 
          color: colors.status.complete, 
          padding: '2rem',
          background: "var(--success-bg)",
          borderRadius: '8px',
          border: `1px solid ${colors.status.complete}30`
        }}>
          <Users size={48} style={{ marginBottom: '1rem' }} />
          <h3>All Projects Fully Staffed</h3>
          <p>Your selected projects have adequate resource allocation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step">
      <h2>Gap Analysis Results</h2>
      <p className="wizard-step-description">
        We've analyzed your selected projects and identified {state.identifiedGaps.length} resource gaps 
        that need attention. Here's what we found:
      </p>

      <div className="wizard-stats">
        <div className="wizard-stat">
          <div className="wizard-stat-value" style={{ color: colors.status.overdue }}>
            {gapsByPriority.high.length}
          </div>
          <div className="wizard-stat-label">High Priority Gaps</div>
        </div>
        <div className="wizard-stat">
          <div className="wizard-stat-value" style={{ color: colors.status.pending }}>
            {gapsByPriority.medium.length}
          </div>
          <div className="wizard-stat-label">Medium Priority Gaps</div>
        </div>
        <div className="wizard-stat">
          <div className="wizard-stat-value" style={{ color: colors.status.complete }}>
            {gapsByPriority.low.length}
          </div>
          <div className="wizard-stat-label">Low Priority Gaps</div>
        </div>
        <div className="wizard-stat">
          <div className="wizard-stat-value">{getTotalGapHours()}</div>
          <div className="wizard-stat-label">Total Hours Needed</div>
        </div>
      </div>

      <div className="wizard-section">
        <h3>Resource Gaps by Priority</h3>
        
        {['high', 'medium', 'low'].map((priority) => {
          const gaps = gapsByPriority[priority as keyof typeof gapsByPriority];
          if (gaps.length === 0) return null;

          return (
            <div key={priority} style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                color: getPriorityColor(priority as any),
                marginBottom: '1rem',
                textTransform: 'capitalize'
              }}>
                {getPriorityIcon(priority as any)}
                {priority} Priority ({gaps.length} gaps)
              </h4>
              
              <div className="wizard-list">
                {gaps.map((gap, index) => (
                  <div key={`${gap.projectId}-${gap.roleId}-${index}`} className="wizard-item">
                    <div className="wizard-item-content">
                      <div className="wizard-item-title">
                        {gap.roleName} for {gap.projectName}
                      </div>
                      <div className="wizard-item-details">
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span>
                            <strong>{gap.gap}</strong> {gap.gap === 1 ? 'person' : 'people'} needed
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} />
                            {formatDate(gap.timeline.start)} - {formatDate(gap.timeline.end)}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: colors.utility.gray }}>
                          Required: {gap.required} | Currently allocated: {gap.allocated}
                        </div>
                      </div>
                    </div>
                    <div className="wizard-item-actions">
                      <div style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        backgroundColor: `${getPriorityColor(gap.priority)}20`,
                        color: getPriorityColor(gap.priority),
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textTransform: 'uppercase'
                      }}>
                        {gap.priority}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="wizard-section">
        <h3>Skills Summary</h3>
        <p style={{ color: colors.utility.gray, marginBottom: '1rem' }}>
          The following skills are most in demand across your projects:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {getUniqueRoles().map((role) => {
            const roleGaps = state.identifiedGaps.filter(g => g.roleName === role);
            const totalNeeded = roleGaps.reduce((sum, g) => sum + g.gap, 0);
            
            return (
              <span
                key={role}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: colors.primary + '20',
                  color: colors.primary,
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  border: `1px solid ${colors.primary}30`
                }}
              >
                {role} ({totalNeeded} needed)
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}