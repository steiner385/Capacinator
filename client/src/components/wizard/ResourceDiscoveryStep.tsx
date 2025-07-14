import React, { useEffect } from 'react';
import { useWizard } from '../../contexts/WizardContext';
import { useThemeColors } from '../../lib/theme-colors';
import { Search, User, Clock, TrendingUp, AlertCircle } from 'lucide-react';

export function ResourceDiscoveryStep() {
  const { state, findResourceSuggestions } = useWizard();
  const colors = useThemeColors();

  useEffect(() => {
    if (state.identifiedGaps.length > 0 && state.resourceSuggestions.length === 0) {
      findResourceSuggestions();
    }
  }, [state.identifiedGaps, findResourceSuggestions]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSkillMatchColor = (skillMatch: number) => {
    if (skillMatch >= 90) return colors.status.complete;
    if (skillMatch >= 70) return colors.status.pending;
    return colors.status.overdue;
  };

  const getSkillMatchIcon = (skillMatch: number) => {
    if (skillMatch >= 90) return <TrendingUp size={14} />;
    if (skillMatch >= 70) return <Clock size={14} />;
    return <AlertCircle size={14} />;
  };

  const getSuggestionsByRole = () => {
    const byRole: { [key: string]: any[] } = {};
    
    state.resourceSuggestions.forEach(suggestion => {
      const key = suggestion.roleName;
      if (!byRole[key]) {
        byRole[key] = [];
      }
      byRole[key].push(suggestion);
    });

    // Sort within each role by skill match
    Object.keys(byRole).forEach(role => {
      byRole[role].sort((a, b) => b.skillMatch - a.skillMatch);
    });

    return byRole;
  };

  const getTotalAvailableHours = () => {
    return state.resourceSuggestions.reduce((total, suggestion) => 
      total + suggestion.availableCapacity, 0
    );
  };

  const getUniqueAvailablePeople = () => {
    const people = new Set(state.resourceSuggestions.map(s => s.personId));
    return people.size;
  };

  const suggestionsByRole = getSuggestionsByRole();

  if (state.isProcessing) {
    return (
      <div className="wizard-step">
        <h2>Finding Available Resources</h2>
        <p className="wizard-step-description">
          Searching for team members who can fill your identified gaps...
        </p>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Search size={48} style={{ marginBottom: '1rem', color: colors.primary }} />
          <p>Analyzing team availability and skills...</p>
        </div>
      </div>
    );
  }

  if (state.resourceSuggestions.length === 0) {
    return (
      <div className="wizard-step">
        <h2>Resource Discovery</h2>
        <p className="wizard-step-description">
          No available resources found for your identified gaps.
        </p>
        <div style={{ 
          textAlign: 'center', 
          color: colors.status.pending, 
          padding: '2rem',
          background: "var(--warning-bg)",
          borderRadius: '8px',
          border: `1px solid ${colors.status.pending}30`
        }}>
          <AlertCircle size={48} style={{ marginBottom: '1rem' }} />
          <h3>No Available Resources</h3>
          <p>You may need to consider hiring, contracting, or adjusting project timelines.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step">
      <h2>Available Resources Found</h2>
      <p className="wizard-step-description">
        Great! We found {getUniqueAvailablePeople()} team members with {getTotalAvailableHours()} 
        total available hours who can help fill your resource gaps.
      </p>

      <div className="wizard-stats">
        <div className="wizard-stat">
          <div className="wizard-stat-value">{getUniqueAvailablePeople()}</div>
          <div className="wizard-stat-label">Available People</div>
        </div>
        <div className="wizard-stat">
          <div className="wizard-stat-value">{getTotalAvailableHours()}</div>
          <div className="wizard-stat-label">Total Available Hours</div>
        </div>
        <div className="wizard-stat">
          <div className="wizard-stat-value">{Object.keys(suggestionsByRole).length}</div>
          <div className="wizard-stat-label">Roles Covered</div>
        </div>
        <div className="wizard-stat">
          <div className="wizard-stat-value">
            {Math.round(
              state.resourceSuggestions.reduce((sum, s) => sum + s.skillMatch, 0) / 
              state.resourceSuggestions.length
            )}%
          </div>
          <div className="wizard-stat-label">Avg Skill Match</div>
        </div>
      </div>

      <div className="wizard-section">
        <h3>Available Resources by Role</h3>
        
        {Object.entries(suggestionsByRole).map(([roleName, suggestions]) => (
          <div key={roleName} style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ 
              color: colors.utility.blue,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <User size={16} />
              {roleName} ({suggestions.length} available)
            </h4>
            
            <div className="wizard-list">
              {suggestions.map((suggestion, index) => (
                <div key={`${suggestion.personId}-${suggestion.roleId}-${index}`} className="wizard-item">
                  <div className="wizard-item-content">
                    <div className="wizard-item-title">
                      {suggestion.personName}
                    </div>
                    <div className="wizard-item-details">
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span>
                          <strong>{suggestion.availableCapacity}</strong> hours available
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={12} />
                          {formatDate(suggestion.timeline.start)} - {formatDate(suggestion.timeline.end)}
                        </span>
                        {suggestion.costPerHour && (
                          <span style={{ color: colors.utility.gray }}>
                            ${suggestion.costPerHour}/hr
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="wizard-item-actions">
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      backgroundColor: `${getSkillMatchColor(suggestion.skillMatch)}20`,
                      color: getSkillMatchColor(suggestion.skillMatch),
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}>
                      {getSkillMatchIcon(suggestion.skillMatch)}
                      {suggestion.skillMatch}% match
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="wizard-section">
        <h3>Resource Coverage Analysis</h3>
        <div style={{ marginBottom: '1rem' }}>
          {state.identifiedGaps.map((gap) => {
            const rolesuggestions = state.resourceSuggestions.filter(s => s.roleId === gap.roleId);
            const totalAvailableForRole = rolesuggestions.reduce((sum, s) => sum + s.availableCapacity, 0);
            const hoursNeeded = gap.gap * 40; // 40 hours per person
            const coverage = Math.min(100, Math.round((totalAvailableForRole / hoursNeeded) * 100));
            
            return (
              <div key={`${gap.projectId}-${gap.roleId}`} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '0.75rem',
                backgroundColor: coverage >= 100 ? "var(--success-bg)" : 
                                 coverage >= 50 ? "var(--warning-bg)" : "var(--danger-bg)",
                borderRadius: '6px',
                marginBottom: '0.5rem',
                border: `1px solid ${coverage >= 100 ? colors.status.complete : 
                                    coverage >= 50 ? colors.status.pending : colors.status.overdue}30`
              }}>
                <div>
                  <strong>{gap.roleName}</strong> for {gap.projectName}
                  <div style={{ fontSize: '0.8rem', color: colors.utility.gray }}>
                    Need: {hoursNeeded}h | Available: {totalAvailableForRole}h
                  </div>
                </div>
                <div style={{
                  color: coverage >= 100 ? colors.status.complete : 
                         coverage >= 50 ? colors.status.pending : colors.status.overdue,
                  fontWeight: 600
                }}>
                  {coverage}% covered
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}