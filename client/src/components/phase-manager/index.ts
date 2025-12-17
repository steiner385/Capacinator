/**
 * Phase Manager Components
 *
 * This module exports reusable components for managing project phases,
 * extracted from VisualPhaseManager.tsx for better maintainability.
 */

// Components
export { PhaseAddModal } from './PhaseAddModal';
export { PhaseEditModal } from './PhaseEditModal';
export { DependencyModal } from './DependencyModal';
export { PhaseContextMenu } from './PhaseContextMenu';

// Types
export type {
  ProjectPhaseTimeline,
  PhaseTemplate,
  PhaseDependency,
  DependencyType,
  AddPhaseFormData,
  EditPhaseFormData,
  DependencyFormData,
  ContextMenuPosition
} from './types';

// Utilities
export { PHASE_COLORS, getPhaseColor } from './types';
