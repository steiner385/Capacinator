import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  className = ''
}) => {
  const handleBackdropClick = React.useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleKeydown = React.useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  React.useEffect(() => {
    if (!isOpen) return;
    
    document.addEventListener('keydown', handleKeydown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeydown]);

  const getSizeClass = React.useMemo(() => {
    switch (size) {
      case 'sm': return 'modal-sm';
      case 'md': return 'modal-md';
      case 'lg': return 'modal-lg';
      case 'xl': return 'modal-xl';
      default: return 'modal-md';
    }
  }, [size]);

  if (!isOpen) return null;

  return (
    <div className="modal" onClick={handleBackdropClick}>
      <div className={`modal-content ${getSizeClass} ${className}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          {showCloseButton && (
            <button 
              className="btn-icon modal-close"
              onClick={onClose}
              type="button"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;