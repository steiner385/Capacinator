/**
 * useProgressOperation Hook
 *
 * Manages progress state for long-running operations with support for:
 * - Progress tracking (current/total)
 * - Stage descriptions
 * - Error handling with retry
 * - Cancellation
 * - Estimated time remaining
 */

import { useState, useCallback, useRef } from 'react';
import type { ProgressState } from '../components/ui/ProgressIndicator';

export interface UseProgressOperationOptions {
  /** Initial stage description */
  initialStage?: string;
  /** Callback when operation completes successfully */
  onComplete?: () => void;
  /** Callback when operation fails */
  onError?: (error: Error) => void;
}

export interface UseProgressOperationReturn {
  /** Current progress state */
  progress: ProgressState;
  /** Start the operation */
  start: (total: number, stage?: string) => void;
  /** Update progress */
  update: (current: number, stage?: string) => void;
  /** Increment progress by one */
  increment: (stage?: string) => void;
  /** Mark operation as complete */
  complete: () => void;
  /** Mark operation as failed */
  fail: (errorMessage: string) => void;
  /** Reset to idle state */
  reset: () => void;
  /** Whether the operation is currently running */
  isRunning: boolean;
  /** Whether the operation completed successfully */
  isComplete: boolean;
  /** Whether the operation failed */
  hasError: boolean;
  /** Abort controller for cancellation */
  abortController: AbortController | null;
  /** Create a new abort controller for the operation */
  createAbortController: () => AbortController;
  /** Cancel the current operation */
  cancel: () => void;
}

const initialProgressState: ProgressState = {
  current: 0,
  total: 0,
  status: 'idle',
};

/**
 * Hook for managing progress state of long-running operations
 */
export function useProgressOperation(
  options: UseProgressOperationOptions = {}
): UseProgressOperationReturn {
  const { initialStage, onComplete, onError } = options;

  const [progress, setProgress] = useState<ProgressState>({
    ...initialProgressState,
    stage: initialStage,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Start a new operation
   */
  const start = useCallback((total: number, stage?: string) => {
    setProgress({
      current: 0,
      total,
      stage: stage || initialStage,
      status: 'running',
      startTime: Date.now(),
    });
  }, [initialStage]);

  /**
   * Update progress
   */
  const update = useCallback((current: number, stage?: string) => {
    setProgress((prev) => ({
      ...prev,
      current: Math.min(current, prev.total),
      ...(stage !== undefined && { stage }),
    }));
  }, []);

  /**
   * Increment progress by one
   */
  const increment = useCallback((stage?: string) => {
    setProgress((prev) => ({
      ...prev,
      current: Math.min(prev.current + 1, prev.total),
      ...(stage !== undefined && { stage }),
    }));
  }, []);

  /**
   * Mark operation as complete
   */
  const complete = useCallback(() => {
    setProgress((prev) => ({
      ...prev,
      current: prev.total,
      status: 'completed',
      stage: 'Complete',
    }));
    onComplete?.();
  }, [onComplete]);

  /**
   * Mark operation as failed
   */
  const fail = useCallback((errorMessage: string) => {
    setProgress((prev) => ({
      ...prev,
      status: 'error',
      errorMessage,
    }));
    onError?.(new Error(errorMessage));
  }, [onError]);

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    setProgress({
      ...initialProgressState,
      stage: initialStage,
    });
    abortControllerRef.current = null;
  }, [initialStage]);

  /**
   * Create a new abort controller for the operation
   */
  const createAbortController = useCallback(() => {
    // Cancel any existing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller;
  }, []);

  /**
   * Cancel the current operation
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setProgress((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Operation cancelled',
      }));
    }
  }, []);

  return {
    progress,
    start,
    update,
    increment,
    complete,
    fail,
    reset,
    isRunning: progress.status === 'running',
    isComplete: progress.status === 'completed',
    hasError: progress.status === 'error',
    abortController: abortControllerRef.current,
    createAbortController,
    cancel,
  };
}

/**
 * Hook for tracking multiple operations
 */
export interface MultiOperationProgress {
  [key: string]: ProgressState;
}

export function useMultiProgressOperation() {
  const [operations, setOperations] = useState<MultiOperationProgress>({});

  const startOperation = useCallback((id: string, total: number, stage?: string) => {
    setOperations((prev) => ({
      ...prev,
      [id]: {
        current: 0,
        total,
        stage,
        status: 'running',
        startTime: Date.now(),
      },
    }));
  }, []);

  const updateOperation = useCallback((id: string, current: number, stage?: string) => {
    setOperations((prev) => {
      const op = prev[id];
      if (!op) return prev;
      return {
        ...prev,
        [id]: {
          ...op,
          current: Math.min(current, op.total),
          ...(stage !== undefined && { stage }),
        },
      };
    });
  }, []);

  const completeOperation = useCallback((id: string) => {
    setOperations((prev) => {
      const op = prev[id];
      if (!op) return prev;
      return {
        ...prev,
        [id]: {
          ...op,
          current: op.total,
          status: 'completed',
          stage: 'Complete',
        },
      };
    });
  }, []);

  const failOperation = useCallback((id: string, errorMessage: string) => {
    setOperations((prev) => {
      const op = prev[id];
      if (!op) return prev;
      return {
        ...prev,
        [id]: {
          ...op,
          status: 'error',
          errorMessage,
        },
      };
    });
  }, []);

  const removeOperation = useCallback((id: string) => {
    setOperations((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const resetAll = useCallback(() => {
    setOperations({});
  }, []);

  return {
    operations,
    startOperation,
    updateOperation,
    completeOperation,
    failOperation,
    removeOperation,
    resetAll,
    hasRunningOperations: Object.values(operations).some((op) => op.status === 'running'),
    hasErrors: Object.values(operations).some((op) => op.status === 'error'),
    allComplete: Object.values(operations).length > 0 &&
      Object.values(operations).every((op) => op.status === 'completed'),
  };
}

export default useProgressOperation;
