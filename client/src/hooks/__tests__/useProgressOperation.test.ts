import { renderHook, act } from '@testing-library/react';
import { useProgressOperation, useMultiProgressOperation } from '../useProgressOperation';

describe('useProgressOperation', () => {
  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useProgressOperation());

    expect(result.current.progress.status).toBe('idle');
    expect(result.current.progress.current).toBe(0);
    expect(result.current.progress.total).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('should initialize with custom initial stage', () => {
    const { result } = renderHook(() =>
      useProgressOperation({ initialStage: 'Getting ready...' })
    );

    expect(result.current.progress.stage).toBe('Getting ready...');
  });

  it('should start operation correctly', () => {
    const { result } = renderHook(() => useProgressOperation());

    act(() => {
      result.current.start(100, 'Processing...');
    });

    expect(result.current.progress.status).toBe('running');
    expect(result.current.progress.current).toBe(0);
    expect(result.current.progress.total).toBe(100);
    expect(result.current.progress.stage).toBe('Processing...');
    expect(result.current.progress.startTime).toBeDefined();
    expect(result.current.isRunning).toBe(true);
  });

  it('should update progress correctly', () => {
    const { result } = renderHook(() => useProgressOperation());

    act(() => {
      result.current.start(100);
    });

    act(() => {
      result.current.update(50, 'Halfway there');
    });

    expect(result.current.progress.current).toBe(50);
    expect(result.current.progress.stage).toBe('Halfway there');
  });

  it('should not exceed total when updating', () => {
    const { result } = renderHook(() => useProgressOperation());

    act(() => {
      result.current.start(100);
    });

    act(() => {
      result.current.update(150);
    });

    expect(result.current.progress.current).toBe(100);
  });

  it('should increment progress correctly', () => {
    const { result } = renderHook(() => useProgressOperation());

    act(() => {
      result.current.start(10);
    });

    act(() => {
      result.current.increment();
    });

    expect(result.current.progress.current).toBe(1);

    act(() => {
      result.current.increment('Processing item 2');
    });

    expect(result.current.progress.current).toBe(2);
    expect(result.current.progress.stage).toBe('Processing item 2');
  });

  it('should not exceed total when incrementing', () => {
    const { result } = renderHook(() => useProgressOperation());

    act(() => {
      result.current.start(2);
    });

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.increment();
    });

    expect(result.current.progress.current).toBe(2);
  });

  it('should complete operation correctly', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() =>
      useProgressOperation({ onComplete })
    );

    act(() => {
      result.current.start(100);
    });

    act(() => {
      result.current.complete();
    });

    expect(result.current.progress.status).toBe('completed');
    expect(result.current.progress.current).toBe(100);
    expect(result.current.progress.stage).toBe('Complete');
    expect(result.current.isComplete).toBe(true);
    expect(result.current.isRunning).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should fail operation correctly', () => {
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useProgressOperation({ onError })
    );

    act(() => {
      result.current.start(100);
    });

    act(() => {
      result.current.fail('Something went wrong');
    });

    expect(result.current.progress.status).toBe('error');
    expect(result.current.progress.errorMessage).toBe('Something went wrong');
    expect(result.current.hasError).toBe(true);
    expect(result.current.isRunning).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Something went wrong' })
    );
  });

  it('should reset to idle state', () => {
    const { result } = renderHook(() =>
      useProgressOperation({ initialStage: 'Ready' })
    );

    act(() => {
      result.current.start(100);
      result.current.update(50);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.progress.status).toBe('idle');
    expect(result.current.progress.current).toBe(0);
    expect(result.current.progress.total).toBe(0);
    expect(result.current.progress.stage).toBe('Ready');
  });

  it('should create abort controller', () => {
    const { result } = renderHook(() => useProgressOperation());

    let controller: AbortController;
    act(() => {
      controller = result.current.createAbortController();
    });

    expect(controller!).toBeInstanceOf(AbortController);
    // Note: abortController is a ref, so it may not update immediately in the test
    // The important thing is that createAbortController returns a valid AbortController
  });

  it('should abort previous controller when creating new one', () => {
    const { result } = renderHook(() => useProgressOperation());

    let firstController: AbortController;
    let secondController: AbortController;

    act(() => {
      firstController = result.current.createAbortController();
    });

    const abortSpy = jest.spyOn(firstController!, 'abort');

    act(() => {
      secondController = result.current.createAbortController();
    });

    expect(abortSpy).toHaveBeenCalled();
    expect(secondController!).toBeInstanceOf(AbortController);
    expect(secondController!).not.toBe(firstController!);
  });

  it('should cancel operation correctly', () => {
    const { result } = renderHook(() => useProgressOperation());

    act(() => {
      result.current.createAbortController();
      result.current.start(100);
    });

    act(() => {
      result.current.cancel();
    });

    expect(result.current.progress.status).toBe('error');
    expect(result.current.progress.errorMessage).toBe('Operation cancelled');
  });

  it('should maintain stable function references', () => {
    const { result, rerender } = renderHook(() => useProgressOperation());

    const initialStart = result.current.start;
    const initialUpdate = result.current.update;
    const initialIncrement = result.current.increment;
    const initialComplete = result.current.complete;
    const initialFail = result.current.fail;
    const initialReset = result.current.reset;
    const initialCancel = result.current.cancel;
    const initialCreateAbortController = result.current.createAbortController;

    rerender();

    expect(result.current.start).toBe(initialStart);
    expect(result.current.update).toBe(initialUpdate);
    expect(result.current.increment).toBe(initialIncrement);
    expect(result.current.complete).toBe(initialComplete);
    expect(result.current.fail).toBe(initialFail);
    expect(result.current.reset).toBe(initialReset);
    expect(result.current.cancel).toBe(initialCancel);
    expect(result.current.createAbortController).toBe(initialCreateAbortController);
  });
});

describe('useMultiProgressOperation', () => {
  it('should initialize with empty operations', () => {
    const { result } = renderHook(() => useMultiProgressOperation());

    expect(result.current.operations).toEqual({});
    expect(result.current.hasRunningOperations).toBe(false);
    expect(result.current.hasErrors).toBe(false);
    expect(result.current.allComplete).toBe(false);
  });

  it('should start multiple operations', () => {
    const { result } = renderHook(() => useMultiProgressOperation());

    act(() => {
      result.current.startOperation('op1', 100, 'Operation 1');
      result.current.startOperation('op2', 50, 'Operation 2');
    });

    expect(Object.keys(result.current.operations)).toHaveLength(2);
    expect(result.current.operations['op1'].status).toBe('running');
    expect(result.current.operations['op1'].total).toBe(100);
    expect(result.current.operations['op2'].status).toBe('running');
    expect(result.current.operations['op2'].total).toBe(50);
    expect(result.current.hasRunningOperations).toBe(true);
  });

  it('should update operation progress', () => {
    const { result } = renderHook(() => useMultiProgressOperation());

    act(() => {
      result.current.startOperation('op1', 100);
    });

    act(() => {
      result.current.updateOperation('op1', 50, 'Halfway');
    });

    expect(result.current.operations['op1'].current).toBe(50);
    expect(result.current.operations['op1'].stage).toBe('Halfway');
  });

  it('should complete operation', () => {
    const { result } = renderHook(() => useMultiProgressOperation());

    act(() => {
      result.current.startOperation('op1', 100);
    });

    act(() => {
      result.current.completeOperation('op1');
    });

    expect(result.current.operations['op1'].status).toBe('completed');
    expect(result.current.operations['op1'].current).toBe(100);
    expect(result.current.allComplete).toBe(true);
  });

  it('should fail operation', () => {
    const { result } = renderHook(() => useMultiProgressOperation());

    act(() => {
      result.current.startOperation('op1', 100);
    });

    act(() => {
      result.current.failOperation('op1', 'Error occurred');
    });

    expect(result.current.operations['op1'].status).toBe('error');
    expect(result.current.operations['op1'].errorMessage).toBe('Error occurred');
    expect(result.current.hasErrors).toBe(true);
  });

  it('should remove operation', () => {
    const { result } = renderHook(() => useMultiProgressOperation());

    act(() => {
      result.current.startOperation('op1', 100);
      result.current.startOperation('op2', 50);
    });

    act(() => {
      result.current.removeOperation('op1');
    });

    expect(result.current.operations['op1']).toBeUndefined();
    expect(result.current.operations['op2']).toBeDefined();
  });

  it('should reset all operations', () => {
    const { result } = renderHook(() => useMultiProgressOperation());

    act(() => {
      result.current.startOperation('op1', 100);
      result.current.startOperation('op2', 50);
    });

    act(() => {
      result.current.resetAll();
    });

    expect(result.current.operations).toEqual({});
  });

  it('should track hasRunningOperations correctly', () => {
    const { result } = renderHook(() => useMultiProgressOperation());

    expect(result.current.hasRunningOperations).toBe(false);

    act(() => {
      result.current.startOperation('op1', 100);
    });

    expect(result.current.hasRunningOperations).toBe(true);

    act(() => {
      result.current.completeOperation('op1');
    });

    expect(result.current.hasRunningOperations).toBe(false);
  });

  it('should track allComplete correctly with multiple operations', () => {
    const { result } = renderHook(() => useMultiProgressOperation());

    act(() => {
      result.current.startOperation('op1', 100);
      result.current.startOperation('op2', 50);
    });

    expect(result.current.allComplete).toBe(false);

    act(() => {
      result.current.completeOperation('op1');
    });

    expect(result.current.allComplete).toBe(false);

    act(() => {
      result.current.completeOperation('op2');
    });

    expect(result.current.allComplete).toBe(true);
  });

  it('should handle non-existent operation updates gracefully', () => {
    const { result } = renderHook(() => useMultiProgressOperation());

    act(() => {
      result.current.updateOperation('nonexistent', 50);
      result.current.completeOperation('nonexistent');
      result.current.failOperation('nonexistent', 'error');
    });

    expect(result.current.operations['nonexistent']).toBeUndefined();
  });
});
