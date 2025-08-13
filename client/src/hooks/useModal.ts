import { useState, useCallback } from 'react';

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useModal = (initialState: boolean = false): UseModalReturn => {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => {
    console.log('useModal: open() called');
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    console.log('useModal: close() called');
    console.trace('Close called from:');
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle
  };
};

export default useModal;