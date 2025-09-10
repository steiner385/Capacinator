// Client test setup
// Setup for client-side tests

// Mock window and document if needed
if (typeof window !== 'undefined') {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}

// Setup testing library matchers
import '@testing-library/jest-dom';