/**
 * Shared Form Components Library
 *
 * This module exports reusable form components for use across modals
 * and other forms in the application.
 *
 * @example
 * ```tsx
 * import {
 *   FormSection,
 *   DateRangeInput,
 *   AllocationSlider,
 *   SearchableSelect,
 *   FormValidationErrors,
 *   ModalFormLayout,
 *   FormActions,
 * } from '@/components/forms';
 * ```
 */

// Components
export { FormSection } from './FormSection';
export { DateRangeInput } from './DateRangeInput';
export { AllocationSlider } from './AllocationSlider';
export { SearchableSelect } from './SearchableSelect';
export { FormValidationErrors } from './FormValidationErrors';
export { ModalFormLayout } from './ModalFormLayout';
export { FormActions } from './FormActions';

// Types
export type {
  FormFieldProps,
  ValidationState,
  FormSectionProps,
  DateRangeInputProps,
  AllocationSliderProps,
  SelectOption,
  SearchableSelectProps,
  FormValidationErrorsProps,
  ModalFormLayoutProps,
  FormActionsProps,
} from './types';
