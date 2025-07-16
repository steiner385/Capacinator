import React, { useState } from 'react';
import { ChevronDown, GitBranch, Star } from 'lucide-react';
import { useScenario } from '../contexts/ScenarioContext';
import './ScenarioSelector.css';

export function ScenarioSelector() {
  const { currentScenario, scenarios, setCurrentScenario, isLoading } = useScenario();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="scenario-selector">
        <div className="scenario-selector-trigger disabled">
          <div className="loading-placeholder">Loading scenarios...</div>
        </div>
      </div>
    );
  }

  const handleScenarioSelect = (scenario: typeof currentScenario) => {
    setCurrentScenario(scenario);
    setIsOpen(false);
  };

  return (
    <div className="scenario-selector">
      <button 
        className="scenario-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={scenarios.length === 0}
      >
        <div className="scenario-info">
          <GitBranch size={16} className="scenario-icon" />
          <div className="scenario-details">
            <div className="scenario-label">Current Scenario</div>
            <div className="scenario-name">
              {currentScenario ? currentScenario.name : 'No scenario selected'}
            </div>
          </div>
        </div>
        <ChevronDown 
          size={16} 
          className={`chevron ${isOpen ? 'open' : ''}`} 
        />
      </button>

      {isOpen && (
        <>
          <div className="scenario-selector-overlay" onClick={() => setIsOpen(false)} />
          <div className="scenario-selector-dropdown">
            <div className="scenario-dropdown-header">
              <h4>Select Scenario</h4>
            </div>
            
            <div className="scenario-list">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  className={`scenario-option ${currentScenario?.id === scenario.id ? 'selected' : ''}`}
                  onClick={() => handleScenarioSelect(scenario)}
                >
                  <div className="scenario-option-content">
                    <div className="scenario-option-header">
                      <div className="scenario-option-name">{scenario.name}</div>
                      <div className="scenario-badges">
                        {scenario.scenario_type === 'baseline' && (
                          <Star size={12} className="baseline-star" />
                        )}
                        <span className={`scenario-type-badge ${scenario.scenario_type}`}>
                          {scenario.scenario_type}
                        </span>
                        <span className={`scenario-status-badge ${scenario.status}`}>
                          {scenario.status}
                        </span>
                      </div>
                    </div>
                    {scenario.description && (
                      <div className="scenario-option-description">
                        {scenario.description}
                      </div>
                    )}
                    {scenario.parent_scenario_name && (
                      <div className="scenario-parent">
                        Branched from: {scenario.parent_scenario_name}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}