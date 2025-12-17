import React from 'react';
import { X, Save } from 'lucide-react';
import { DependencyFormData, DependencyType, PhaseDependency } from './types';
import { TimelineItem } from '../InteractiveTimeline';

interface DependencyModalProps {
  isOpen: boolean;
  editingDependency: PhaseDependency | null;
  formData: DependencyFormData;
  timelineItems: TimelineItem[];
  onFormChange: (updates: Partial<DependencyFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function DependencyModal({
  isOpen,
  editingDependency,
  formData,
  timelineItems,
  onFormChange,
  onSubmit,
  onClose
}: DependencyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">
            {editingDependency ? 'Edit' : 'Add'} Phase Dependency
          </h3>
          <button
            onClick={onClose}
            className="modal-close"
          >
            <X size={20} />
          </button>
        </div>

        <form className="modal-form" onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">
              Predecessor Phase (must complete first)
            </label>
            <select
              value={formData.predecessor_phase_timeline_id}
              onChange={(e) => onFormChange({ predecessor_phase_timeline_id: e.target.value })}
              required
              className="form-select"
            >
              <option value="">Select predecessor phase...</option>
              {timelineItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Successor Phase (depends on predecessor)
            </label>
            <select
              value={formData.successor_phase_timeline_id}
              onChange={(e) => onFormChange({ successor_phase_timeline_id: e.target.value })}
              required
              className="form-select"
            >
              <option value="">Select successor phase...</option>
              {timelineItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Dependency Type
            </label>
            <select
              value={formData.dependency_type}
              onChange={(e) => onFormChange({ dependency_type: e.target.value as DependencyType })}
              className="form-select"
              disabled
            >
              <option value="FS">Finish-to-Start (FS)</option>
            </select>
            <div style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>
              Successor phase starts after predecessor phase finishes
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Lag Days (optional delay)
            </label>
            <input
              type="number"
              value={formData.lag_days}
              onChange={(e) => onFormChange({ lag_days: parseInt(e.target.value, 10) || 0 })}
              min="-365"
              max="365"
              className="form-input"
            />
            <div style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>
              Positive values add delay, negative values create overlap
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.predecessor_phase_timeline_id || !formData.successor_phase_timeline_id}
              className="btn btn-primary"
            >
              <Save size={16} />
              {editingDependency ? 'Update' : 'Create'} Dependency
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DependencyModal;
