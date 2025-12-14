import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useModalForm, UseModalFormConfig } from '../useModalForm';

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

interface TestFormData {
  name: string;
  email: string;
  age: number;
}

describe('useModalForm', () => {
  const defaultInitialValues: TestFormData = {
    name: '',
    email: '',
    age: 0,
  };

  const createMockConfig = (
    overrides: Partial<UseModalFormConfig<TestFormData>> = {}
  ): UseModalFormConfig<TestFormData> => ({
    initialValues: defaultInitialValues,
    onCreate: jest.fn().mockResolvedValue({ id: '1', ...defaultInitialValues }),
    onUpdate: jest.fn().mockResolvedValue({ id: '1', ...defaultInitialValues }),
    queryKeysToInvalidate: [['users']],
    onClose: jest.fn(),
    ...overrides,
  });

  describe('initialization', () => {
    it('should initialize with initial values', () => {
      const config = createMockConfig();
      const { result } = renderHook(() => useModalForm(config), {
        wrapper: createWrapper(),
      });

      expect(result.current.values).toEqual(defaultInitialValues);
      expect(result.current.errors).toEqual({});
      expect(result.current.isEditing).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.hasErrors).toBe(false);
    });

    it('should initialize with editing item values', () => {
      const editingItem = { id: '1', name: 'John', email: 'john@example.com', age: 30 };
      const config = createMockConfig({ editingItem });
      const { result } = renderHook(() => useModalForm(config), {
        wrapper: createWrapper(),
      });

      expect(result.current.values.name).toBe('John');
      expect(result.current.values.email).toBe('john@example.com');
      expect(result.current.values.age).toBe(30);
      expect(result.current.isEditing).toBe(true);
    });

    it('should use custom getValuesFromItem when provided', () => {
      const editingItem = { id: '1', full_name: 'John Doe', contact_email: 'john@example.com' };
      const getValuesFromItem = (item: any): TestFormData => ({
        name: item.full_name,
        email: item.contact_email,
        age: 0,
      });
      const config = createMockConfig({ editingItem, getValuesFromItem });
      const { result } = renderHook(() => useModalForm(config), {
        wrapper: createWrapper(),
      });

      expect(result.current.values.name).toBe('John Doe');
      expect(result.current.values.email).toBe('john@example.com');
    });
  });

  describe('handleChange', () => {
    it('should update a single field value', () => {
      const config = createMockConfig();
      const { result } = renderHook(() => useModalForm(config), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleChange('name', 'Jane');
      });

      expect(result.current.values.name).toBe('Jane');
    });

    it('should clear error for field when value changes', () => {
      const config = createMockConfig();
      const { result } = renderHook(() => useModalForm(config), {
        wrapper: createWrapper(),
      });

      // Set an error manually
      act(() => {
        result.current.setErrors({ name: 'Name is required' });
      });
      expect(result.current.errors.name).toBe('Name is required');

      // Change the field value
      act(() => {
        result.current.handleChange('name', 'Jane');
      });

      expect(result.current.errors.name).toBe('');
    });
  });

  describe('validation', () => {
    it('should run validation on submit', async () => {
      const validate = jest.fn().mockReturnValue({ name: 'Name is required' });
      const config = createMockConfig({ validate });
      const { result } = renderHook(() => useModalForm(config), {
        wrapper: createWrapper(),
      });

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
      act(() => {
        result.current.handleSubmit(mockEvent);
      });

      expect(validate).toHaveBeenCalledWith(defaultInitialValues);
      expect(result.current.errors.name).toBe('Name is required');
      expect(result.current.hasErrors).toBe(true);
      expect(config.onCreate).not.toHaveBeenCalled();
    });

    it('should not submit if validation fails', async () => {
      const validate = () => ({ email: 'Invalid email' });
      const config = createMockConfig({ validate });
      const { result } = renderHook(() => useModalForm(config), {
        wrapper: createWrapper(),
      });

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
      act(() => {
        result.current.handleSubmit(mockEvent);
      });

      expect(config.onCreate).not.toHaveBeenCalled();
      expect(config.onUpdate).not.toHaveBeenCalled();
    });

    it('should submit if validation passes', async () => {
      const validate = () => ({}); // No errors
      const config = createMockConfig({ validate });
      const { result } = renderHook(() => useModalForm(config), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleChange('name', 'Jane');
        result.current.handleChange('email', 'jane@example.com');
      });

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
      act(() => {
        result.current.handleSubmit(mockEvent);
      });

      await waitFor(() => {
        expect(config.onCreate).toHaveBeenCalled();
      });
    });
  });

  describe('submission', () => {
    it('should call onCreate for new items', async () => {
      const onCreate = jest.fn().mockResolvedValue({ id: '1', name: 'Jane' });
      const config = createMockConfig({ onCreate });
      const { result } = renderHook(() => useModalForm(config), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleChange('name', 'Jane');
      });

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
      act(() => {
        result.current.handleSubmit(mockEvent);
      });

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Jane' }));
      });
    });

    it('should call onUpdate for editing items', async () => {
      const editingItem = { id: '1', name: 'John', email: '', age: 0 };
      const onUpdate = jest.fn().mockResolvedValue({ id: '1', name: 'Jane' });
      const config = createMockConfig({ editingItem, onUpdate });
      const { result } = renderHook(() => useModalForm(config), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleChange('name', 'Jane');
      });

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
      act(() => {
        result.current.handleSubmit(mockEvent);
      });

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith('1', expect.objectContaining({ name: 'Jane' }));
      });
    });

    it('should call onSuccess callback after successful create', async () => {
      const onSuccess = jest.fn();
      const onCreate = jest.fn().mockResolvedValue({ id: '1', name: 'Jane' });
      const config = createMockConfig({ onCreate, onSuccess });
      const { result } = renderHook(() => useModalForm(config), {
        wrapper: createWrapper(),
      });

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
      act(() => {
        result.current.handleSubmit(mockEvent);
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({ id: '1', name: 'Jane' }, false);
      });
    });

    it('should call onClose after successful submission', async () => {
      const onClose = jest.fn();
      const config = createMockConfig({ onClose });
      const { result } = renderHook(() => useModalForm(config), {
        wrapper: createWrapper(),
      });

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;
      act(() => {
        result.current.handleSubmit(mockEvent);
      });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('reset', () => {
    it('should reset form to initial values', () => {
      const config = createMockConfig();
      const { result } = renderHook(() => useModalForm(config), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleChange('name', 'Jane');
        result.current.handleChange('email', 'jane@example.com');
        result.current.setErrors({ name: 'Error' });
      });

      expect(result.current.values.name).toBe('Jane');
      expect(result.current.errors.name).toBe('Error');

      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toEqual(defaultInitialValues);
      expect(result.current.errors).toEqual({});
    });
  });

  describe('handleClose', () => {
    it('should call onClose after delay', () => {
      jest.useFakeTimers();
      const onClose = jest.fn();
      const config = createMockConfig({ onClose });
      const { result } = renderHook(() => useModalForm(config), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleClose();
      });

      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(onClose).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('editingItem changes', () => {
    it('should update values when editingItem changes', () => {
      const config = createMockConfig();
      const { result, rerender } = renderHook(
        ({ editingItem }) => useModalForm({ ...config, editingItem }),
        {
          wrapper: createWrapper(),
          initialProps: { editingItem: undefined as any },
        }
      );

      expect(result.current.values).toEqual(defaultInitialValues);

      // Simulate switching to edit mode
      rerender({ editingItem: { id: '1', name: 'John', email: 'john@example.com', age: 25 } });

      expect(result.current.values.name).toBe('John');
      expect(result.current.values.email).toBe('john@example.com');
      expect(result.current.values.age).toBe(25);
      expect(result.current.isEditing).toBe(true);
    });

    it('should reset to initial values when editingItem becomes undefined', () => {
      const editingItem = { id: '1', name: 'John', email: 'john@example.com', age: 25 };
      const config = createMockConfig({ editingItem });
      const { result, rerender } = renderHook(
        ({ editingItem }) => useModalForm({ ...config, editingItem }),
        {
          wrapper: createWrapper(),
          initialProps: { editingItem: editingItem as any },
        }
      );

      expect(result.current.values.name).toBe('John');

      // Simulate switching back to create mode
      rerender({ editingItem: undefined });

      expect(result.current.values).toEqual(defaultInitialValues);
      expect(result.current.isEditing).toBe(false);
    });

    it('should clear errors when editingItem changes', () => {
      const config = createMockConfig();
      const { result, rerender } = renderHook(
        ({ editingItem }) => useModalForm({ ...config, editingItem }),
        {
          wrapper: createWrapper(),
          initialProps: { editingItem: undefined as any },
        }
      );

      // Set some errors
      act(() => {
        result.current.setErrors({ name: 'Error', email: 'Error' });
      });
      expect(result.current.hasErrors).toBe(true);

      // Switch to edit mode
      rerender({ editingItem: { id: '1', name: 'John', email: '', age: 0 } });

      expect(result.current.errors).toEqual({});
      expect(result.current.hasErrors).toBe(false);
    });
  });
});
