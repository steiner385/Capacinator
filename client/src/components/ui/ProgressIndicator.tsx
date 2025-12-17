/**
 * ProgressIndicator Component
 *
 * A comprehensive progress indicator for long-running operations.
 * Displays progress bar, percentage, current/total counts, and estimated time remaining.
 */

import React from 'react';
import { Progress } from './progress';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

export interface ProgressState {
  /** Current count of processed items */
  current: number;
  /** Total count of items to process */
  total: number;
  /** Current stage description */
  stage?: string;
  /** Operation status */
  status: 'idle' | 'running' | 'completed' | 'error';
  /** Error message if status is 'error' */
  errorMessage?: string;
  /** Start time of the operation (timestamp) */
  startTime?: number;
}

export interface ProgressIndicatorProps {
  /** Progress state object */
  progress: ProgressState;
  /** Label for the operation */
  label?: string;
  /** Show detailed stats (current/total) */
  showDetails?: boolean;
  /** Show estimated time remaining */
  showEta?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Callback when cancel button is clicked */
  onCancel?: () => void;
  /** Whether the operation can be cancelled */
  canCancel?: boolean;
}

/**
 * Calculate estimated time remaining based on progress and elapsed time
 */
function calculateEta(current: number, total: number, startTime?: number): string | null {
  if (!startTime || current === 0 || total === 0) return null;

  const elapsed = Date.now() - startTime;
  const rate = current / elapsed; // items per millisecond
  const remaining = total - current;
  const etaMs = remaining / rate;

  if (etaMs < 1000) return 'Less than a second';
  if (etaMs < 60000) return `${Math.ceil(etaMs / 1000)} seconds`;
  if (etaMs < 3600000) return `${Math.ceil(etaMs / 60000)} minutes`;
  return `${Math.ceil(etaMs / 3600000)} hours`;
}

/**
 * Format elapsed time
 */
function formatElapsed(startTime?: number): string | null {
  if (!startTime) return null;

  const elapsed = Date.now() - startTime;

  if (elapsed < 1000) return 'Just started';
  if (elapsed < 60000) return `${Math.floor(elapsed / 1000)}s elapsed`;
  if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m ${Math.floor((elapsed % 60000) / 1000)}s elapsed`;
  return `${Math.floor(elapsed / 3600000)}h ${Math.floor((elapsed % 3600000) / 60000)}m elapsed`;
}

export function ProgressIndicator({
  progress,
  label,
  showDetails = true,
  showEta = true,
  className,
  onRetry,
  onCancel,
  canCancel = false,
}: ProgressIndicatorProps) {
  const { current, total, stage, status, errorMessage, startTime } = progress;
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const eta = calculateEta(current, total, startTime);
  const elapsed = formatElapsed(startTime);

  // Status-based styling
  const statusStyles = {
    idle: 'text-muted-foreground',
    running: 'text-primary',
    completed: 'text-green-600 dark:text-green-400',
    error: 'text-destructive',
  };

  // Status icons
  const statusIcons = {
    idle: null,
    running: <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />,
    completed: <CheckCircle className="h-4 w-4" aria-hidden="true" />,
    error: <XCircle className="h-4 w-4" aria-hidden="true" />,
  };

  return (
    <div
      className={cn('space-y-2', className)}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Operation progress'}
      aria-live="polite"
    >
      {/* Header with label and status icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('font-medium', statusStyles[status])}>
            {label || 'Processing'}
          </span>
          {statusIcons[status]}
        </div>
        <span className="text-sm font-medium">{percentage}%</span>
      </div>

      {/* Progress bar */}
      <Progress
        value={percentage}
        className={cn(
          'h-2',
          status === 'error' && '[&>[data-slot=progress-indicator]]:bg-destructive',
          status === 'completed' && '[&>[data-slot=progress-indicator]]:bg-green-600'
        )}
      />

      {/* Details section */}
      {showDetails && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            {/* Current stage */}
            {stage && status === 'running' && (
              <span>{stage}</span>
            )}

            {/* Count */}
            {total > 0 && (
              <span>
                {current.toLocaleString()} of {total.toLocaleString()} items
              </span>
            )}
          </div>

          {/* ETA or elapsed time */}
          {showEta && status === 'running' && eta && (
            <span className="text-xs">~{eta} remaining</span>
          )}
          {status === 'completed' && elapsed && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Completed in {elapsed.replace(' elapsed', '')}
            </span>
          )}
        </div>
      )}

      {/* Error message */}
      {status === 'error' && errorMessage && (
        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
          {errorMessage}
        </div>
      )}

      {/* Action buttons */}
      {(status === 'error' && onRetry) || (status === 'running' && canCancel && onCancel) ? (
        <div className="flex items-center gap-2 pt-1">
          {status === 'error' && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          )}
          {status === 'running' && canCancel && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function ProgressIndicatorCompact({
  progress,
  label,
  className,
}: Pick<ProgressIndicatorProps, 'progress' | 'label' | 'className'>) {
  const { current, total, status } = progress;
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {status === 'running' && (
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
      )}
      {status === 'completed' && (
        <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
      )}
      {status === 'error' && (
        <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="truncate">{label}</span>
          <span className="font-medium">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-1.5" />
      </div>
    </div>
  );
}

export default ProgressIndicator;
