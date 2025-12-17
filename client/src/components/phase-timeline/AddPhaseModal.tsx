import React from 'react';
import { X } from 'lucide-react';

interface PhaseFormData {
  phase_name: string;
  start_date: string;
  end_date: string;
}

interface AddPhaseModalProps {
  isOpen: boolean;
  formData: PhaseFormData;
  onFormChange: (data: Partial<PhaseFormData>) => void;
  onSubmit: () => void;
  onClose: () => void;
  isPending?: boolean;
}

export function AddPhaseModal({
  isOpen,
  formData,
  onFormChange,
  onSubmit,
  onClose,
  isPending = false
}: AddPhaseModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add New Phase</h3>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Phase Name</label>
              <input
                type="text"
                value={formData.phase_name}
                onChange={(e) => onFormChange({ phase_name: e.target.value })}
                className="form-input"
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => onFormChange({ start_date: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => onFormChange({ end_date: e.target.value })}
                  className="form-input"
                  min={formData.start_date}
                  required
                />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                Create Phase
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddPhaseModal;
