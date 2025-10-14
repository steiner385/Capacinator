// Client test setup
// Setup for client-side tests

// Import React for JSX transform
const React = require('react');
global.React = React;

// Add TextEncoder/TextDecoder polyfills
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock @/lib/utils (commonly used by UI components)
jest.mock('@/lib/utils', () => ({
  cn: (...args) => args.filter(Boolean).join(' '),
}));

// Mock common contexts to avoid undefined provider errors
jest.mock('../client/src/contexts/UserContext', () => ({
  useUser: () => ({
    currentUser: { id: 'user-1', name: 'Test User' },
    isLoggedIn: true,
    setCurrentUser: jest.fn(),
    logout: jest.fn(),
  }),
  UserProvider: ({ children }) => children,
}));

jest.mock('../client/src/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }) => children,
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));

jest.mock('../client/src/contexts/ScenarioContext', () => ({
  ScenarioProvider: ({ children }) => children,
  useScenario: () => ({ 
    activeScenarioId: null, 
    setActiveScenarioId: jest.fn(),
    currentScenario: { id: 'test-scenario', name: 'Test Scenario', scenario_type: 'baseline' },
    scenarios: [
      { id: 'baseline-1', name: 'Baseline Scenario', scenario_type: 'baseline' },
      { id: 'branch-1', name: 'Test Branch', scenario_type: 'branch' }
    ]
  }),
}));

// Mock PortalThemeProvider
jest.mock('../client/src/components/PortalThemeProvider', () => ({
  PortalThemeProvider: ({ children }) => children,
}));

// Mock window and document if needed
if (typeof window !== 'undefined') {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
  
  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
  
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}