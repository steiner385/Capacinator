/**
 * ModalFormLayout Component
 *
 * A standardized modal layout for forms with header, content area,
 * validation display, and footer.
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { FormValidationErrors } from './FormValidationErrors';
import type { ModalFormLayoutProps } from './types';

/**
 * ModalFormLayout provides a consistent modal structure for forms.
 *
 * @example
 * ```tsx
 * <ModalFormLayout
 *   title="Add Person"
 *   description="Add a new team member to the system."
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   hasErrors={Object.keys(errors).length > 0}
 *   onSubmit={handleSubmit}
 *   footer={
 *     <FormActions
 *       isSubmitting={isSubmitting}
 *       isEditing={isEditing}
 *       onCancel={handleClose}
 *     />
 *   }
 * >
 *   <FormSection label="Name" required error={errors.name} htmlFor="name">
 *     <Input id="name" value={formData.name} onChange={...} />
 *   </FormSection>
 * </ModalFormLayout>
 * ```
 */
export const ModalFormLayout = React.forwardRef<
  HTMLDivElement,
  ModalFormLayoutProps
>(
  (
    {
      title,
      description,
      isOpen,
      onClose,
      hasErrors = false,
      onSubmit,
      maxWidth = 'max-w-2xl',
      children,
      footer,
    },
    ref
  ) => {
    const handleOpenChange = (open: boolean) => {
      if (!open) {
        onClose();
      }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit?.(e);
    };

    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          ref={ref}
          className={cn(maxWidth, 'max-h-[90vh] overflow-y-auto')}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <form onSubmit={handleFormSubmit}>
            <FormValidationErrors hasErrors={hasErrors} />

            <div className="py-4 space-y-6">{children}</div>

            {footer && <DialogFooter>{footer}</DialogFooter>}
          </form>
        </DialogContent>
      </Dialog>
    );
  }
);

ModalFormLayout.displayName = 'ModalFormLayout';
