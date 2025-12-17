/**
 * FormValidationErrors Component
 *
 * Displays a validation error alert at the top of a form when there are errors.
 */

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { FormValidationErrorsProps } from './types';

/**
 * FormValidationErrors shows a prominent alert when form validation fails.
 *
 * @example
 * ```tsx
 * <FormValidationErrors
 *   hasErrors={Object.keys(errors).length > 0}
 *   message="Please fix the errors below before submitting."
 * />
 * ```
 */
export const FormValidationErrors = React.forwardRef<
  HTMLDivElement,
  FormValidationErrorsProps
>(({ hasErrors, message, className }, ref) => {
  if (!hasErrors) {
    return null;
  }

  return (
    <Alert
      ref={ref}
      variant="destructive"
      className={cn('mb-4', className)}
      role="alert"
      aria-live="assertive"
    >
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <AlertDescription>
        {message || 'Please fix the errors below before submitting.'}
      </AlertDescription>
    </Alert>
  );
});

FormValidationErrors.displayName = 'FormValidationErrors';
