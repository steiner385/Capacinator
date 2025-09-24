import React, { useState, useEffect } from 'react';
import { X, GitMerge, AlertTriangle, CheckCircle, ArrowRight, RefreshCw, Eye } from 'lucide-react';
import { api } from '../../lib/api-client';
import { Scenario } from '../../types';
import './ScenarioMergeModal.css';

interface MergeConflict {
  type: string;
  entity_id: string;
  conflict_description: string;
  source_data: any;
  target_data: any;
}

interface MergeResponse {
  success: boolean;
  message: string;
  conflicts?: number;
  conflict_details?: MergeConflict[];
}

interface ScenarioMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: Scenario;
  onMergeComplete: () => void;
}

export const ScenarioMergeModal: React.FC<ScenarioMergeModalProps> = ({
  isOpen,
  onClose,
  scenario,
  onMergeComplete
}) => {
  const [mergeStrategy, setMergeStrategy] = useState<'manual' | 'use_source' | 'use_target'>('manual');
  const [conflicts, setConflicts] = useState<MergeConflict[]>([]);
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, any>>({});
  const [currentStep, setCurrentStep] = useState<'setup' | 'conflicts' | 'preview' | 'executing' | 'complete'>('setup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergeResult, setMergeResult] = useState<any>(null);
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMergeStrategy('manual');
      setConflicts([]);
      setConflictResolutions({});
      setCurrentStep('setup');
      setLoading(false);
      setError(null);
      setMergeResult(null);
      setCurrentConflictIndex(0);
    }
  }, [isOpen]);

  const initiateMerge = async () => {
    if (!scenario.parent_scenario_id) {
      setError('Cannot merge scenario without parent');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post(`/scenarios/${scenario.id}/merge`, {
        resolve_conflicts_as: mergeStrategy
      });

      const mergeResponse: MergeResponse = response.data;

      if (!mergeResponse.success && mergeResponse.conflict_details) {
        // Conflicts detected, need manual resolution
        setConflicts(mergeResponse.conflict_details);
        setCurrentStep('conflicts');
      } else if (mergeResponse.success) {
        // Merge completed successfully
        setMergeResult(mergeResponse);
        setCurrentStep('complete');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate merge');
    } finally {
      setLoading(false);
    }
  };

  const resolveConflict = (conflictId: string, resolution: 'source' | 'target' | 'custom', customData?: any) => {
    const conflict = conflicts.find(c => c.entity_id === conflictId);
    if (!conflict) return;

    let resolvedData;
    if (resolution === 'source') {
      resolvedData = conflict.source_data;
    } else if (resolution === 'target') {
      resolvedData = conflict.target_data;
    } else {
      resolvedData = customData;
    }

    setConflictResolutions({
      ...conflictResolutions,
      [conflictId]: {
        resolution,
        data: resolvedData
      }
    });
  };

  const proceedToPreview = () => {
    setCurrentStep('preview');
  };

  const executeMerge = async () => {
    setCurrentStep('executing');
    setLoading(true);

    try {
      // Submit conflict resolutions and execute merge
      const response = await api.post(`/scenarios/${scenario.id}/merge`, {
        resolve_conflicts_as: 'resolved',
        conflict_resolutions: conflictResolutions
      });

      setMergeResult(response.data);
      setCurrentStep('complete');
      
      // Notify parent component
      onMergeComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to execute merge');
      setCurrentStep('conflicts');
    } finally {
      setLoading(false);
    }
  };

  const renderSetupStep = () => (
    <div className="merge-setup">
      <div className="merge-info">
        <h3>
          <GitMerge size={20} />
          Merge Scenario: {scenario.name}
        </h3>
        <p className="merge-description">
          This will merge changes from "{scenario.name}" back to its parent scenario. 
          All modifications, assignments, and project changes will be applied to the parent.
        </p>
      </div>

      <div className="merge-strategy-selection">
        <h4>Merge Strategy</h4>
        <div className="strategy-options">
          <label className={`strategy-option ${mergeStrategy === 'manual' ? 'selected' : ''}`}>
            <input
              type="radio"
              value="manual"
              checked={mergeStrategy === 'manual'}
              onChange={(e) => setMergeStrategy(e.target.value as any)}
            />
            <div className="option-content">
              <strong>Manual Resolution</strong>
              <span>Review each conflict individually (Recommended)</span>
            </div>
          </label>

          <label className={`strategy-option ${mergeStrategy === 'use_source' ? 'selected' : ''}`}>
            <input
              type="radio"
              value="use_source"
              checked={mergeStrategy === 'use_source'}
              onChange={(e) => setMergeStrategy(e.target.value as any)}
            />
            <div className="option-content">
              <strong>Source Priority</strong>
              <span>This scenario takes precedence over parent</span>
            </div>
          </label>

          <label className={`strategy-option ${mergeStrategy === 'use_target' ? 'selected' : ''}`}>
            <input
              type="radio"
              value="use_target"
              checked={mergeStrategy === 'use_target'}
              onChange={(e) => setMergeStrategy(e.target.value as any)}
            />
            <div className="option-content">
              <strong>Target Priority</strong>
              <span>Parent scenario takes precedence</span>
            </div>
          </label>
        </div>
      </div>

      <div className="merge-actions">
        <button onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button 
          onClick={initiateMerge} 
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Analyzing...' : 'Analyze Conflicts'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );

  const renderConflictsStep = () => {
    const currentConflict = conflicts[currentConflictIndex];
    const resolvedCount = Object.keys(conflictResolutions).length;
    const canProceed = resolvedCount === conflicts.length;

    return (
      <div className="conflict-resolution">
        <div className="conflict-header">
          <h3>
            <AlertTriangle size={20} />
            Resolve Merge Conflicts ({resolvedCount}/{conflicts.length})
          </h3>
          <div className="conflict-navigation">
            <button 
              onClick={() => setCurrentConflictIndex(Math.max(0, currentConflictIndex - 1))}
              disabled={currentConflictIndex === 0}
              className="btn-secondary btn-sm"
            >
              Previous
            </button>
            <span className="conflict-counter">
              {currentConflictIndex + 1} of {conflicts.length}
            </span>
            <button 
              onClick={() => setCurrentConflictIndex(Math.min(conflicts.length - 1, currentConflictIndex + 1))}
              disabled={currentConflictIndex === conflicts.length - 1}
              className="btn-secondary btn-sm"
            >
              Next
            </button>
          </div>
        </div>

        {currentConflict && (
          <div className="conflict-detail">
            <div className="conflict-info">
              <h4>Conflict: {currentConflict.type.replace('_', ' ').toUpperCase()}</h4>
              <p>{currentConflict.conflict_description}</p>
              <div className="conflict-id">Entity ID: {currentConflict.entity_id}</div>
            </div>

            <div className="conflict-comparison">
              <div className="conflict-side">
                <h5>Source (This Scenario)</h5>
                <div className="conflict-data">
                  {renderConflictData(currentConflict.source_data)}
                </div>
                <button 
                  onClick={() => resolveConflict(currentConflict.entity_id, 'source')}
                  className={`resolution-btn ${
                    conflictResolutions[currentConflict.entity_id]?.resolution === 'source' ? 'selected' : ''
                  }`}
                >
                  Use Source
                </button>
              </div>

              <div className="conflict-divider">
                <ArrowRight size={20} />
              </div>

              <div className="conflict-side">
                <h5>Target (Parent Scenario)</h5>
                <div className="conflict-data">
                  {renderConflictData(currentConflict.target_data)}
                </div>
                <button 
                  onClick={() => resolveConflict(currentConflict.entity_id, 'target')}
                  className={`resolution-btn ${
                    conflictResolutions[currentConflict.entity_id]?.resolution === 'target' ? 'selected' : ''
                  }`}
                >
                  Use Target
                </button>
              </div>
            </div>

            {conflictResolutions[currentConflict.entity_id] && (
              <div className="resolution-status">
                <CheckCircle size={16} />
                Resolved: Using {conflictResolutions[currentConflict.entity_id].resolution} data
              </div>
            )}
          </div>
        )}

        <div className="conflict-actions">
          <button onClick={() => setCurrentStep('setup')} className="btn-secondary">
            Back to Setup
          </button>
          <button 
            onClick={proceedToPreview}
            disabled={!canProceed}
            className="btn-primary"
          >
            {canProceed ? 'Preview Merge' : `Resolve ${conflicts.length - resolvedCount} more conflicts`}
          </button>
        </div>
      </div>
    );
  };

  const renderPreviewStep = () => (
    <div className="merge-preview">
      <div className="preview-header">
        <h3>
          <Eye size={20} />
          Merge Preview
        </h3>
        <p>Review the changes that will be applied during the merge</p>
      </div>

      <div className="preview-content">
        <div className="preview-section">
          <h4>Conflict Resolutions ({Object.keys(conflictResolutions).length})</h4>
          <div className="resolution-list">
            {Object.entries(conflictResolutions).map(([entityId, resolution]) => (
              <div key={entityId} className="resolution-item">
                <div className="resolution-entity">{entityId}</div>
                <div className="resolution-choice">
                  Using {resolution.resolution} data
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="preview-section">
          <h4>Impact Summary</h4>
          <div className="impact-list">
            <div className="impact-item">
              <span className="impact-label">Assignments affected:</span>
              <span className="impact-value">{conflicts.filter(c => c.type === 'assignment').length}</span>
            </div>
            <div className="impact-item">
              <span className="impact-label">Phase timelines affected:</span>
              <span className="impact-value">{conflicts.filter(c => c.type === 'phase_timeline').length}</span>
            </div>
            <div className="impact-item">
              <span className="impact-label">Project details affected:</span>
              <span className="impact-value">{conflicts.filter(c => c.type === 'project_details').length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="preview-actions">
        <button onClick={() => setCurrentStep('conflicts')} className="btn-secondary">
          Back to Conflicts
        </button>
        <button 
          onClick={executeMerge}
          disabled={loading}
          className="btn-primary btn-danger"
        >
          {loading ? 'Executing...' : 'Execute Merge'}
        </button>
      </div>
    </div>
  );

  const renderExecutingStep = () => (
    <div className="merge-executing">
      <div className="executing-animation">
        <RefreshCw size={48} className="spinning" />
        <h3>Executing Merge...</h3>
        <p>Applying changes to parent scenario. Please wait...</p>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="merge-complete">
      <div className="completion-status">
        <CheckCircle size={48} className="success-icon" />
        <h3>Merge Completed Successfully</h3>
        <p>All changes have been applied to the parent scenario.</p>
      </div>

      {mergeResult && (
        <div className="merge-summary">
          <h4>Merge Summary</h4>
          <div className="summary-details">
            <div className="summary-item">
              <span>Source Scenario:</span>
              <span>{scenario.name}</span>
            </div>
            <div className="summary-item">
              <span>Conflicts Resolved:</span>
              <span>{Object.keys(conflictResolutions).length}</span>
            </div>
            <div className="summary-item">
              <span>Status:</span>
              <span className="success">Merged Successfully</span>
            </div>
          </div>
        </div>
      )}

      <div className="complete-actions">
        <button onClick={onClose} className="btn-primary">
          Close
        </button>
      </div>
    </div>
  );

  const renderConflictData = (data: any) => {
    if (!data) return <div className="no-data">No data</div>;

    return (
      <div className="data-display">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="data-field">
            <span className="field-name">{key}:</span>
            <span className="field-value">{String(value)}</span>
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content scenario-merge-modal">
        <div className="modal-header">
          <h2>
            <GitMerge size={20} />
            Scenario Merge
          </h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {currentStep === 'setup' && renderSetupStep()}
          {currentStep === 'conflicts' && renderConflictsStep()}
          {currentStep === 'preview' && renderPreviewStep()}
          {currentStep === 'executing' && renderExecutingStep()}
          {currentStep === 'complete' && renderCompleteStep()}
        </div>
      </div>
    </div>
  );
};

export { ScenarioMergeModal };