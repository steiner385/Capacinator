import React from 'react';
import { PortalModal } from '../ui/PortalModal';

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestModal: React.FC<TestModalProps> = ({ isOpen, onClose }) => {
  console.log('TestModal render - isOpen:', isOpen);
  
  return (
    <PortalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Test Modal - Portal Version"
    >
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
          Modal is Working!
        </h2>
        <p style={{ marginBottom: '20px' }}>
          If you can see this with a dark backdrop behind it, the modal system is working correctly.
        </p>
        <button 
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Close Modal
        </button>
      </div>
    </PortalModal>
  );
};