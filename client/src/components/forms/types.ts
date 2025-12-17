/**
 * Shared Form Component Types
 *
 * Type definitions for reusable form components used across modals.
 */

import { ReactNode } from 'react';

/**
 * Common props for form field components
 */
export interface FormFieldProps {
  /** Unique identifier for the field */
  id: string;
  /** Field label text */
  label: string;
  /** Whether the field is required */
  required?: boolean;
  /** Error message for the field */
  error?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Description text (for screen readers) */
  description?: string;
}

/**
 * Validation state for a form
 */
export interface ValidationState<T> {
  /** Map of field names to error messages */
  errors: Partial<Record<keyof T, string>>;
  /** Whether the form has any validation errors */
  hasErrors: boolean;
}

/**
 * Props for FormSection component
 */
export interface FormSectionProps {
  /** Section title/label */
  label: string;
  /** Whether the field is required */
  required?: boolean;
  /** Error message for the field */
  error?: string;
  /** Field input ID for label association */
  htmlFor?: string;
  /** Description text (for screen readers) */
  description?: string;
  /** Additional CSS classes */
  className?: string;
  /** Child components (the input element) */
  children: ReactNode;
}

/**
 * Props for DateRangeInput component
 */
export interface DateRangeInputProps {
  /** Start date value (ISO format: YYYY-MM-DD) */
  startDate: string;
  /** End date value (ISO format: YYYY-MM-DD) */
  endDate: string;
  /** Callback when start date changes */
  onStartDateChange: (date: string) => void;
  /** Callback when end date changes */
  onEndDateChange: (date: string) => void;
  /** Label for start date field */
  startLabel?: string;
  /** Label for end date field */
  endLabel?: string;
  /** Error for start date */
  startError?: string;
  /** Error for end date */
  endError?: string;
  /** Whether both fields are required */
  required?: boolean;
  /** Whether the inputs are disabled */
  disabled?: boolean;
  /** Minimum selectable date */
  minDate?: string;
  /** Maximum selectable date */
  maxDate?: string;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Props for AllocationSlider component
 */
export interface AllocationSliderProps {
  /** Current allocation percentage (0-100) */
  value: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Label text */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Whether the slider is disabled */
  disabled?: boolean;
  /** Minimum value (default: 0) */
  min?: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Step increment (default: 5) */
  step?: number;
  /** Show available capacity indicator */
  availableCapacity?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Option type for select components
 */
export interface SelectOption {
  /** Option value */
  value: string;
  /** Display label */
  label: string;
  /** Whether option is disabled */
  disabled?: boolean;
}

/**
 * Props for SearchableSelect component
 */
export interface SearchableSelectProps extends Omit<FormFieldProps, 'id'> {
  /** Unique identifier */
  id: string;
  /** Current selected value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Available options */
  options: SelectOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show a "None" option */
  showNone?: boolean;
  /** Label for the "None" option */
  noneLabel?: string;
}

/**
 * Props for FormValidationErrors component
 */
export interface FormValidationErrorsProps {
  /** Whether there are any errors to display */
  hasErrors: boolean;
  /** Custom error message */
  message?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for ModalFormLayout component
 */
export interface ModalFormLayoutProps {
  /** Modal title */
  title: string;
  /** Modal description */
  description?: string;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal close is requested */
  onClose: () => void;
  /** Whether there are validation errors */
  hasErrors?: boolean;
  /** Form submission handler */
  onSubmit?: (e: React.FormEvent) => void;
  /** Maximum width class (default: max-w-2xl) */
  maxWidth?: string;
  /** Child components */
  children: ReactNode;
  /** Footer content (usually FormActions) */
  footer?: ReactNode;
}

/**
 * Props for FormActions component
 */
export interface FormActionsProps {
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Whether editing an existing item */
  isEditing: boolean;
  /** Cancel button click handler */
  onCancel: () => void;
  /** Submit button text when creating */
  createText?: string;
  /** Submit button text when updating */
  updateText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Additional CSS classes */
  className?: string;
}
