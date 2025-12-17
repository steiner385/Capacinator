/**
 * FormActions Component
 *
 * Save/Cancel button group for modal forms with loading state support.
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { FormActionsProps } from './types';

/**
 * FormActions provides consistent save/cancel buttons for forms.
 *
 * @example
 * ```tsx
 * <FormActions
 *   isSubmitting={isSubmitting}
 *   isEditing={!!editingPerson}
 *   onCancel={handleClose}
 *   createText="Add Person"
 *   updateText="Save Changes"
 * />
 * ```
 */
export const FormActions = React.forwardRef<HTMLDivElement, FormActionsProps>(
  (
    {
      isSubmitting,
      isEditing,
      onCancel,
      createText = 'Create',
      updateText = 'Update',
      cancelText = 'Cancel',
      className,
    },
    ref
  ) => {
    const submitText = isEditing ? updateText : createText;
    const loadingText = isEditing ? 'Updating...' : 'Creating...';

    return (
      <div ref={ref} className={cn('flex justify-end gap-2', className)}>
        <Button type="button" variant="outline" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="mr-2" />
              {loadingText}
            </>
          ) : (
            submitText
          )}
        </Button>
      </div>
    );
  }
);

FormActions.displayName = 'FormActions';
