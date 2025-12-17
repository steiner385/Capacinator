import React from 'react';
import { ContextMenuPosition, ProjectPhaseTimeline } from './types';

interface PhaseContextMenuProps {
  contextMenu: ContextMenuPosition;
  phases: ProjectPhaseTimeline[];
  onEdit: (phaseId: string) => void;
  onDuplicate: (phase: ProjectPhaseTimeline) => void;
  onDelete: (phaseId: string) => void;
  onClose: () => void;
}

export function PhaseContextMenu({
  contextMenu,
  phases,
  onEdit,
  onDuplicate,
  onDelete,
  onClose
}: PhaseContextMenuProps) {
  const phase = phases.find((p) => p.id === contextMenu.phaseId);

  const handleEdit = () => {
    onEdit(contextMenu.phaseId);
    onClose();
  };

  const handleDuplicate = () => {
    if (phase) {
      onDuplicate(phase);
    }
    onClose();
  };

  const handleDelete = () => {
    onDelete(contextMenu.phaseId);
    onClose();
  };

  return (
    <div
      className="context-menu"
      style={{
        position: 'fixed',
        top: contextMenu.y,
        left: contextMenu.x,
        background: 'hsl(var(--popover))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '6px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
        padding: '4px 0',
        minWidth: '150px',
        zIndex: 1000
      }}
    >
      <button
        className="context-menu-item"
        onClick={handleEdit}
      >
        Edit Phase
      </button>
      <button
        className="context-menu-item"
        onClick={handleDuplicate}
      >
        Duplicate Phase
      </button>
      <button
        className="context-menu-item danger"
        onClick={handleDelete}
      >
        Delete Phase
      </button>
    </div>
  );
}

export default PhaseContextMenu;
