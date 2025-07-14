import React, { useEffect } from 'react';
import { useWizard } from '../contexts/WizardContext';
import { useThemeColors } from '../lib/theme-colors';
import { ArrowLeft, ArrowRight, CheckCircle, Circle, Loader } from 'lucide-react';
import './AllocationWizard.css';

// Step components
import { ProjectSelectionStep } from '../components/wizard/ProjectSelectionStep';
import { GapAnalysisStep } from '../components/wizard/GapAnalysisStep';
import { ResourceDiscoveryStep } from '../components/wizard/ResourceDiscoveryStep';
import { AllocationStrategyStep } from '../components/wizard/AllocationStrategyStep';
import { ReviewConfirmStep } from '../components/wizard/ReviewConfirmStep';

export function AllocationWizard() {
  const { state, nextStep, previousStep, resetWizard, applyAllocations } = useWizard();
  const colors = useThemeColors();

  const steps = [
    { number: 1, title: 'Select Projects', component: ProjectSelectionStep },
    { number: 2, title: 'Analyze Gaps', component: GapAnalysisStep },
    { number: 3, title: 'Find Resources', component: ResourceDiscoveryStep },
    { number: 4, title: 'Allocation Strategy', component: AllocationStrategyStep },
    { number: 5, title: 'Review & Confirm', component: ReviewConfirmStep },
  ];

  const currentStepData = steps[state.currentStep - 1];
  const CurrentStepComponent = currentStepData.component;

  const canGoNext = () => {
    switch (state.currentStep) {
      case 1:
        return state.selectedProjects.length > 0;
      case 2:
        return state.identifiedGaps.length > 0;
      case 3:
        return state.resourceSuggestions.length > 0;
      case 4:
        return state.allocationPlans.length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const canGoPrevious = () => {
    return state.currentStep > 1;
  };

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber < state.currentStep) return 'completed';
    if (stepNumber === state.currentStep) return 'current';
    return 'pending';
  };

  return (
    <div className="allocation-wizard">
      <div className="wizard-header">
        <h1>Resource Allocation Wizard</h1>
        <p>Guided resource allocation for your projects</p>
        
        {/* Progress indicator */}
        <div className="wizard-progress">
          {steps.map((step) => {
            const status = getStepStatus(step.number);
            return (
              <div key={step.number} className={`progress-step ${status}`}>
                <div className="step-indicator">
                  {status === 'completed' ? (
                    <CheckCircle size={20} color={colors.status.complete} />
                  ) : status === 'current' ? (
                    <div className="step-number current">{step.number}</div>
                  ) : (
                    <Circle size={20} color={colors.utility.gray} />
                  )}
                </div>
                <div className="step-info">
                  <div className="step-title">{step.title}</div>
                  <div className="step-description">
                    {step.number === 1 && 'Choose projects that need resources'}
                    {step.number === 2 && 'Identify skill and role gaps'}
                    {step.number === 3 && 'Find available team members'}
                    {step.number === 4 && 'Plan resource assignments'}
                    {step.number === 5 && 'Review and apply changes'}
                  </div>
                </div>
                {step.number < steps.length && <div className="step-connector" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="wizard-content">
        {state.error && (
          <div className="wizard-error">
            <p>Error: {state.error}</p>
          </div>
        )}

        <div className="wizard-step-content">
          <CurrentStepComponent />
        </div>

        {state.isProcessing && (
          <div className="wizard-processing">
            <Loader className="spinner" size={24} />
            <span>Processing...</span>
          </div>
        )}
      </div>

      <div className="wizard-footer">
        <div className="wizard-actions">
          <button
            className="wizard-btn secondary"
            onClick={resetWizard}
            disabled={state.isProcessing}
          >
            Start Over
          </button>

          <div className="navigation-buttons">
            <button
              className="wizard-btn secondary"
              onClick={previousStep}
              disabled={!canGoPrevious() || state.isProcessing}
            >
              <ArrowLeft size={16} />
              Previous
            </button>

            {state.currentStep < state.totalSteps ? (
              <button
                className="wizard-btn primary"
                onClick={nextStep}
                disabled={!canGoNext() || state.isProcessing}
              >
                Next
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="wizard-btn success"
                onClick={() => {
                  if (window.confirm('Are you sure you want to apply these resource allocations? This will create new assignments and update project schedules.')) {
                    applyAllocations();
                  }
                }}
                disabled={state.isProcessing || state.allocationPlans.length === 0}
              >
                Complete Wizard
              </button>
            )}
          </div>
        </div>

        <div className="wizard-progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${(state.currentStep / state.totalSteps) * 100}%`,
              backgroundColor: colors.primary
            }}
          />
        </div>
      </div>
    </div>
  );
}