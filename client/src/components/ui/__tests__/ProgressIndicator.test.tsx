import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the Radix UI Progress component
jest.mock('@radix-ui/react-progress', () => ({
  Root: React.forwardRef(({ children, className, ...props }: any, ref: any) => (
    <div ref={ref} className={className} role="progressbar" {...props}>
      {children}
    </div>
  )),
  Indicator: React.forwardRef(({ className, style, ...props }: any, ref: any) => (
    <div ref={ref} className={className} style={style} data-slot="progress-indicator" {...props} />
  )),
}));

import { ProgressIndicator, ProgressIndicatorCompact, ProgressState } from '../ProgressIndicator';

describe('ProgressIndicator', () => {
  const defaultProgress: ProgressState = {
    current: 50,
    total: 100,
    status: 'running',
    stage: 'Processing...',
  };

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<ProgressIndicator progress={defaultProgress} />);

      // There are multiple progressbar elements (wrapper and inner), get all
      expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<ProgressIndicator progress={defaultProgress} label="Importing Data" />);

      expect(screen.getByText('Importing Data')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ProgressIndicator progress={defaultProgress} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('displays correct percentage', () => {
      const progress: ProgressState = { current: 75, total: 100, status: 'running' };
      render(<ProgressIndicator progress={progress} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('handles zero total gracefully', () => {
      const progress: ProgressState = { current: 0, total: 0, status: 'idle' };
      render(<ProgressIndicator progress={progress} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Status States', () => {
    it('shows idle status correctly', () => {
      const progress: ProgressState = { current: 0, total: 100, status: 'idle' };
      render(<ProgressIndicator progress={progress} />);

      expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
    });

    it('shows running status with spinner', () => {
      render(<ProgressIndicator progress={defaultProgress} />);

      // The spinner has animate-spin class
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows completed status with check icon', () => {
      const progress: ProgressState = { current: 100, total: 100, status: 'completed' };
      render(<ProgressIndicator progress={progress} />);

      // Look for the completed styling
      const label = screen.getByText('Processing');
      expect(label).toHaveClass('text-green-600', { exact: false });
    });

    it('shows error status with error icon', () => {
      const progress: ProgressState = {
        current: 50,
        total: 100,
        status: 'error',
        errorMessage: 'Something went wrong',
      };
      render(<ProgressIndicator progress={progress} />);

      // Look for the error styling
      const label = screen.getByText('Processing');
      expect(label).toHaveClass('text-destructive');
    });
  });

  describe('Details Section', () => {
    it('shows item count when showDetails is true', () => {
      render(<ProgressIndicator progress={defaultProgress} showDetails={true} />);

      expect(screen.getByText('50 of 100 items')).toBeInTheDocument();
    });

    it('hides item count when showDetails is false', () => {
      render(<ProgressIndicator progress={defaultProgress} showDetails={false} />);

      expect(screen.queryByText('50 of 100 items')).not.toBeInTheDocument();
    });

    it('shows stage description when running', () => {
      render(<ProgressIndicator progress={defaultProgress} showDetails={true} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('does not show stage when not running', () => {
      const progress: ProgressState = {
        current: 100,
        total: 100,
        status: 'completed',
        stage: 'Processing...',
      };
      render(<ProgressIndicator progress={progress} showDetails={true} />);

      // Stage should not be shown in completed state
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
    });
  });

  describe('Error Message', () => {
    it('shows error message when status is error', () => {
      const progress: ProgressState = {
        current: 50,
        total: 100,
        status: 'error',
        errorMessage: 'Upload failed due to network error',
      };
      render(<ProgressIndicator progress={progress} />);

      expect(screen.getByText('Upload failed due to network error')).toBeInTheDocument();
    });

    it('does not show error message when status is not error', () => {
      const progress: ProgressState = {
        current: 50,
        total: 100,
        status: 'running',
        errorMessage: 'This should not show',
      };
      render(<ProgressIndicator progress={progress} />);

      expect(screen.queryByText('This should not show')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('shows retry button on error when onRetry is provided', () => {
      const progress: ProgressState = {
        current: 50,
        total: 100,
        status: 'error',
        errorMessage: 'Failed',
      };
      const onRetry = jest.fn();
      render(<ProgressIndicator progress={progress} onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const progress: ProgressState = {
        current: 50,
        total: 100,
        status: 'error',
        errorMessage: 'Failed',
      };
      const onRetry = jest.fn();
      render(<ProgressIndicator progress={progress} onRetry={onRetry} />);

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('shows cancel button when running and canCancel is true', () => {
      const onCancel = jest.fn();
      render(
        <ProgressIndicator
          progress={defaultProgress}
          canCancel={true}
          onCancel={onCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = jest.fn();
      render(
        <ProgressIndicator
          progress={defaultProgress}
          canCancel={true}
          onCancel={onCancel}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not show cancel button when canCancel is false', () => {
      const onCancel = jest.fn();
      render(
        <ProgressIndicator
          progress={defaultProgress}
          canCancel={false}
          onCancel={onCancel}
        />
      );

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('does not show cancel button when not running', () => {
      const progress: ProgressState = { current: 100, total: 100, status: 'completed' };
      const onCancel = jest.fn();
      render(
        <ProgressIndicator
          progress={progress}
          canCancel={true}
          onCancel={onCancel}
        />
      );

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<ProgressIndicator progress={defaultProgress} label="Upload Progress" />);

      // The outer container has the aria-label, not the inner Progress component
      const progressbars = screen.getAllByRole('progressbar');
      // Find the one with aria-label
      const labeledProgressbar = progressbars.find(pb => pb.getAttribute('aria-label'));
      expect(labeledProgressbar).toHaveAttribute('aria-valuenow', '50');
      expect(labeledProgressbar).toHaveAttribute('aria-valuemin', '0');
      expect(labeledProgressbar).toHaveAttribute('aria-valuemax', '100');
      expect(labeledProgressbar).toHaveAttribute('aria-label', 'Upload Progress');
    });

    it('has aria-live for status updates', () => {
      const { container } = render(<ProgressIndicator progress={defaultProgress} />);

      const progressbar = container.querySelector('[aria-live]');
      expect(progressbar).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('ETA Display', () => {
    it('does not show ETA when showEta is false', () => {
      const progress: ProgressState = {
        current: 50,
        total: 100,
        status: 'running',
        startTime: Date.now() - 10000, // Started 10 seconds ago
      };
      render(<ProgressIndicator progress={progress} showEta={false} />);

      expect(screen.queryByText(/remaining/i)).not.toBeInTheDocument();
    });

    it('shows completion time on completed status', () => {
      const progress: ProgressState = {
        current: 100,
        total: 100,
        status: 'completed',
        startTime: Date.now() - 5000, // Completed 5 seconds ago
      };
      render(<ProgressIndicator progress={progress} showDetails={true} />);

      expect(screen.getByText(/completed in/i)).toBeInTheDocument();
    });
  });
});

describe('ProgressIndicatorCompact', () => {
  const defaultProgress: ProgressState = {
    current: 50,
    total: 100,
    status: 'running',
  };

  it('renders compact version correctly', () => {
    render(<ProgressIndicatorCompact progress={defaultProgress} label="Uploading" />);

    expect(screen.getByText('Uploading')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows spinner when running', () => {
    render(<ProgressIndicatorCompact progress={defaultProgress} />);

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows check icon when completed', () => {
    const progress: ProgressState = { current: 100, total: 100, status: 'completed' };
    render(<ProgressIndicatorCompact progress={progress} />);

    // Should not have spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).not.toBeInTheDocument();
  });

  it('shows error icon when errored', () => {
    const progress: ProgressState = {
      current: 50,
      total: 100,
      status: 'error',
      errorMessage: 'Failed',
    };
    render(<ProgressIndicatorCompact progress={progress} />);

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ProgressIndicatorCompact progress={defaultProgress} className="custom-compact" />
    );

    expect(container.querySelector('.custom-compact')).toBeInTheDocument();
  });

  it('handles zero progress', () => {
    const progress: ProgressState = { current: 0, total: 100, status: 'running' };
    render(<ProgressIndicatorCompact progress={progress} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
