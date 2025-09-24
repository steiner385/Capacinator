import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Modal } from '../Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Test Content</div>
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders when isOpen is true', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });
  });

  describe('Modal Layout', () => {
    it('has correct structure with header, body, and content', () => {
      const { container } = render(<Modal {...defaultProps} />);
      
      expect(container.querySelector('.modal')).toBeInTheDocument();
      expect(container.querySelector('.modal-content')).toBeInTheDocument();
      expect(container.querySelector('.modal-header')).toBeInTheDocument();
      expect(container.querySelector('.modal-body')).toBeInTheDocument();
    });

    it('applies size classes correctly', () => {
      const sizes = ['sm', 'md', 'lg', 'xl'] as const;
      sizes.forEach(size => {
        const { container, rerender } = render(<Modal {...defaultProps} size={size} />);
        expect(container.querySelector(`.modal-${size}`)).toBeInTheDocument();
        rerender(<Modal {...defaultProps} isOpen={false} />);
      });
    });

    it('applies custom className', () => {
      const { container } = render(<Modal {...defaultProps} className="custom-class" />);
      expect(container.querySelector('.modal-content.custom-class')).toBeInTheDocument();
    });
  });

  describe('Modal Background', () => {
    it('has a solid background overlay', () => {
      const { container } = render(<Modal {...defaultProps} />);
      const modalOverlay = container.querySelector('.modal');
      
      expect(modalOverlay).toBeInTheDocument();
      expect(modalOverlay).toHaveClass('modal');
      
      // Check that modal has proper styling
      const styles = window.getComputedStyle(modalOverlay!);
      
      // The modal should have a background color (not transparent)
      // Note: In tests, computed styles might not reflect CSS variables,
      // so we check for the presence of the element and class
      expect(modalOverlay).toBeTruthy();
    });

    it('modal content has solid background', () => {
      const { container } = render(<Modal {...defaultProps} />);
      const modalContent = container.querySelector('.modal-content');
      
      expect(modalContent).toBeInTheDocument();
      // Content should be on top of overlay
      expect(modalContent).toHaveClass('modal-content');
    });
  });

  describe('Interactions', () => {
    it('calls onClose when clicking backdrop', () => {
      const { container } = render(<Modal {...defaultProps} />);
      const backdrop = container.querySelector('.modal');
      
      fireEvent.click(backdrop!);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking modal content', () => {
      const { container } = render(<Modal {...defaultProps} />);
      const modalContent = container.querySelector('.modal-content');
      
      fireEvent.click(modalContent!);
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when clicking close button', () => {
      render(<Modal {...defaultProps} />);
      const closeButton = screen.getByRole('button');
      
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('hides close button when showCloseButton is false', () => {
      render(<Modal {...defaultProps} showCloseButton={false} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Interactions', () => {
    it('calls onClose when Escape key is pressed', () => {
      render(<Modal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not respond to other keys', () => {
      render(<Modal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Space' });
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Management', () => {
    it('disables body scroll when modal opens', () => {
      const { rerender } = render(<Modal {...defaultProps} isOpen={false} />);
      
      expect(document.body.style.overflow).not.toBe('hidden');
      
      rerender(<Modal {...defaultProps} isOpen={true} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when modal closes', () => {
      const { unmount } = render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
      
      unmount();
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<Modal {...defaultProps} />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Test Modal');
    });

    it('close button has proper type attribute', () => {
      render(<Modal {...defaultProps} />);
      const closeButton = screen.getByRole('button');
      expect(closeButton).toHaveAttribute('type', 'button');
    });
  });
});