# Test Patterns Quick Reference

**Purpose**: One-page reference for common testing patterns in Capacinator
**Updated**: 2025-10-17

---

## Controller Test Patterns

### Basic Setup

```typescript
import { createMockDb } from './helpers/mockDb';

describe('MyController', () => {
  let controller: MyController;
  let mockDb: any;
  let mockReq: any;
  let mockRes: any;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new MyController();

    // Create mock database
    mockDb = createMockDb();
    (controller as any).db = mockDb;

    // Mock request
    mockReq = {
      query: {},
      params: {},
      body: {},
      headers: {},
      logger: mockLogger
    };

    // Mock response
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Mock logger
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
  });
});
```

### Test a GET All (List) Endpoint

```typescript
it('returns paginated list of items', async () => {
  const mockData = [
    { id: '1', name: 'Item 1', created_at: '2025-01-01' },
    { id: '2', name: 'Item 2', created_at: '2025-01-02' }
  ];

  // Configure mock to return data
  mockDb._setQueryResult(mockData);
  mockDb._setCountResult(2);

  await controller.getAll(mockReq, mockRes);

  expect(mockRes.json).toHaveBeenCalledWith({
    data: mockData,
    pagination: expect.objectContaining({
      total: 2
    })
  });
});
```

### Test a GET by ID Endpoint

```typescript
it('returns single item by id', async () => {
  const mockItem = { id: '1', name: 'Item 1' };

  mockReq.params.id = '1';
  mockDb._setFirstResult(mockItem);

  await controller.getById(mockReq, mockRes);

  expect(mockRes.json).toHaveBeenCalledWith(mockItem);
});
```

### Test a CREATE (POST) Endpoint

```typescript
it('creates a new item', async () => {
  const newItem = { name: 'New Item', description: 'Test' };
  const createdItem = { id: '1', ...newItem, created_at: '2025-01-01' };

  mockReq.body = newItem;
  mockDb._setInsertResult([createdItem]);

  await controller.create(mockReq, mockRes);

  expect(mockDb.insert).toHaveBeenCalledWith(expect.objectContaining(newItem));
  expect(mockRes.json).toHaveBeenCalledWith(createdItem);
});
```

### Test an UPDATE (PUT/PATCH) Endpoint

```typescript
it('updates an existing item', async () => {
  const updates = { name: 'Updated Name' };
  const updatedItem = { id: '1', ...updates, updated_at: '2025-01-02' };

  mockReq.params.id = '1';
  mockReq.body = updates;
  mockDb._setUpdateResult([updatedItem]);

  await controller.update(mockReq, mockRes);

  expect(mockDb.update).toHaveBeenCalledWith(expect.objectContaining(updates));
  expect(mockRes.json).toHaveBeenCalledWith(updatedItem);
});
```

### Test a DELETE Endpoint

```typescript
it('deletes an item', async () => {
  mockReq.params.id = '1';
  mockDb._setDeleteResult(1);

  await controller.delete(mockReq, mockRes);

  expect(mockDb.del).toHaveBeenCalled();
  expect(mockRes.json).toHaveBeenCalledWith({ message: 'Deleted successfully' });
});
```

### Test Error Handling

```typescript
it('handles not found error', async () => {
  mockReq.params.id = 'nonexistent';
  mockDb._setFirstResult(null);

  await controller.getById(mockReq, mockRes);

  expect(mockRes.status).toHaveBeenCalledWith(404);
  expect(mockRes.json).toHaveBeenCalledWith({
    error: 'Not found'
  });
});

it('handles database error', async () => {
  mockDb.then = jest.fn((resolve, reject) => {
    return Promise.reject(new Error('Database error'));
  });

  await controller.getAll(mockReq, mockRes);

  expect(mockRes.status).toHaveBeenCalledWith(500);
  expect(mockLogger.error).toHaveBeenCalled();
});
```

### ⚠️ CRITICAL: Sequential Queries with Queue Pattern

When testing controllers that make **multiple sequential database queries** (e.g., checking multiple tables, retrying lookups), you must:

1. **Use queue methods** instead of set methods
2. **Add `await flushPromises()`** after the controller call

```typescript
import { createMockDb, flushPromises } from './helpers/mockDb';

// ❌ WRONG: Using _setFirstResult for sequential queries
it('falls back to secondary table', async () => {
  mockReq.params.id = 'item-1';
  mockDb._setFirstResult(null); // Only works for ONE query!

  await controller.getById(mockReq, mockRes);

  // FAILS: Second .first() call returns same null value
  expect(mockRes.status).toHaveBeenCalledWith(404);
});

// ✅ CORRECT: Using _queueFirstResult + flushPromises
it('falls back to secondary table', async () => {
  mockReq.params.id = 'item-1';

  // Queue values in order they'll be consumed
  mockDb._queueFirstResult(null);           // 1st query: primary table (not found)
  mockDb._queueFirstResult({ id: 'item-1' }); // 2nd query: secondary table (found!)

  await controller.getById(mockReq, mockRes);
  await flushPromises(); // 🔥 CRITICAL: Wait for async operations

  expect(mockRes.json).toHaveBeenCalledWith({ id: 'item-1' });
});
```

**Why `flushPromises()` is required:**
- Our mock's thenable Promises resolve asynchronously on the microtask queue
- Without it, assertions run before all queries complete
- Results in flaky tests that check incomplete state

**Queue Methods Available:**
```typescript
mockDb._queueFirstResult(data);     // For .first() calls
mockDb._queueQueryResult([data]);   // For SELECT queries
mockDb._queueInsertResult([data]);  // For .insert() calls
mockDb._queueUpdateResult([data]);  // For .update() calls
```

**Real-world example** (from AssignmentsController):
```typescript
it('updates direct assignment without prefix', async () => {
  mockReq.params = { id: 'assign-456' };
  mockReq.body = { notes: 'Updated notes' };

  const existingAssignment = {
    id: 'assign-456',
    allocation_percentage: 50,
    assignment_date_mode: 'fixed',
    start_date: '2025-01-01',
    end_date: '2025-12-31'
  };

  // Controller logic:
  // 1. Check scenario_project_assignments table
  // 2. If not found, check project_assignments table
  // 3. Update the found record

  mockDb._queueFirstResult(null);              // 1. scenario table (not found)
  mockDb._queueFirstResult(existingAssignment); // 2. project_assignments (found!)
  mockDb._queueUpdateResult([existingAssignment]); // 3. update result

  await controller.update(mockReq, mockRes);
  await flushPromises(); // 🔥 CRITICAL

  expect(mockDb).toHaveBeenCalledWith('project_assignments');
  expect(mockDb.update).toHaveBeenCalled();
});
```

---

## React Component Test Patterns

### Basic Setup

```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  const defaultProps = {
    data: [],
    onAction: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders component', () => {
    render(<MyComponent {...defaultProps} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Test User Interactions

```typescript
it('calls handler when button clicked', () => {
  const handleClick = jest.fn();
  render(<MyComponent onAction={handleClick} />);

  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

  expect(handleClick).toHaveBeenCalledTimes(1);
});

it('updates input value on change', () => {
  render(<MyComponent />);

  const input = screen.getByLabelText('Name');
  fireEvent.change(input, { target: { value: 'New Value' } });

  expect(input).toHaveValue('New Value');
});
```

### Test Async Behavior

```typescript
it('loads data asynchronously', async () => {
  render(<MyComponent />);

  // Initially shows loading
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });

  // Loading indicator removed
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
});
```

### Specific Selectors (Fix Ambiguity)

```typescript
// ❌ Ambiguous - fails if multiple "Delete" buttons exist
fireEvent.click(screen.getByText('Delete'));

// ✅ Specific by role and name
fireEvent.click(screen.getByRole('button', { name: 'Delete Item X' }));

// ✅ Specific by test ID
fireEvent.click(screen.getByTestId('delete-item-x'));

// ✅ Query within container
const card = screen.getByText('Item X').closest('.item-card');
const deleteBtn = within(card).getByText('Delete');
fireEvent.click(deleteBtn);

// ✅ Get all and select by index
const deleteButtons = screen.getAllByText('Delete');
fireEvent.click(deleteButtons[0]); // First one
```

### Test with Context Providers

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from '../contexts/UserContext';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        {component}
      </UserProvider>
    </QueryClientProvider>
  );
};

it('uses context values', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText('User: John')).toBeInTheDocument();
});
```

---

## Common Mock Patterns

### Mock API Client

```typescript
import { api } from '../lib/api-client';

jest.mock('../lib/api-client', () => ({
  api: {
    items: {
      list: jest.fn(),
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}));

// In test:
(api.items.list as jest.Mock).mockResolvedValue({
  data: { data: [{ id: 1, name: 'Item' }] }
});
```

### Mock React Router

```typescript
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '123' })
}));

// In test:
fireEvent.click(screen.getByText('Go Back'));
expect(mockNavigate).toHaveBeenCalledWith('/home');
```

### Mock Icons

```typescript
jest.mock('lucide-react', () => ({
  AlertTriangle: ({ className }: any) => (
    <svg className={className} data-testid="alert-icon" />
  ),
  Check: ({ className }: any) => (
    <svg className={className} data-testid="check-icon" />
  )
}));
```

### Mock localStorage

```typescript
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// In test:
expect(localStorageMock.setItem).toHaveBeenCalledWith('key', 'value');
```

---

## Assertion Patterns

### DOM Assertions

```typescript
// Element exists
expect(screen.getByText('Hello')).toBeInTheDocument();

// Element doesn't exist
expect(screen.queryByText('Goodbye')).not.toBeInTheDocument();

// Multiple elements
expect(screen.getAllByRole('listitem')).toHaveLength(3);

// Attribute checks
expect(screen.getByRole('button')).toHaveAttribute('disabled');
expect(screen.getByRole('link')).toHaveAttribute('href', '/home');

// Class checks
expect(screen.getByTestId('alert')).toHaveClass('alert-error');

// Text content
expect(screen.getByTestId('message')).toHaveTextContent('Success');

// Form values
expect(screen.getByLabelText('Email')).toHaveValue('test@example.com');
```

### Function Call Assertions

```typescript
// Called once
expect(mockFn).toHaveBeenCalledTimes(1);

// Called with specific args
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');

// Called with partial match
expect(mockFn).toHaveBeenCalledWith(
  expect.objectContaining({ id: '1' })
);

// Not called
expect(mockFn).not.toHaveBeenCalled();
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific file
npm test -- MyComponent.test.tsx

# Run in watch mode
npm test -- --watch

# Run with coverage
npm run test:coverage

# Run only changed files
npm test -- --onlyChanged

# Update snapshots
npm test -- -u
```

---

## Troubleshooting

### "Unable to find element with text"
- Use `screen.debug()` to see rendered output
- Check for case sensitivity (use regex with `i` flag)
- Element might be hidden (use `queryBy` instead of `getBy`)

### "Multiple elements found"
- Use more specific selector (role + name)
- Use test IDs for unique identification
- Query within a specific container with `within()`

### "Test timeout"
- Missing `await` on async operations
- Mock not resolving (check `.then()` implementation)
- Infinite loop in component logic

### "Mock not working"
- Check mock is defined before import
- Verify jest.mock() path is correct
- Reset mocks in `beforeEach` with `jest.clearAllMocks()`

---

**See also**:
- TEST_STABILIZATION_GUIDE.md - Detailed guide for fixing failing tests
- TEST_COVERAGE_PLAN.md - Overall strategy for reaching 80% coverage
