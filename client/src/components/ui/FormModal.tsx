import React from 'react';
import { PortalModal } from './PortalModal';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
  submitText?: string;
  cancelText?: string;
  showActions?: boolean;
  className?: string;
}


export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  isLoading = false,
  onSubmit,
  submitText = 'Save',
  cancelText = 'Cancel',
  showActions = true,
  className = ''
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <PortalModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <div className={cn("p-6", className)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            {children}
          </div>
          {showActions && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                {cancelText}
              </Button>
              <Button 
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : submitText}
              </Button>
            </div>
          )}
        </form>
      </div>
    </PortalModal>
  );
};

export default FormModal;