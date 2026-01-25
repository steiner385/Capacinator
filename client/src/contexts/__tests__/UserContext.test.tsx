import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Unmock UserContext to test the real implementation
jest.unmock('../UserContext');

// Mock the API client before importing UserContext
jest.mock('../../lib/api-client', () => ({
  api: {
    auth: {
      me: jest.fn(),
      login: jest.fn(),
      logout: jest.fn()
    }
  },
  isAuthenticated: jest.fn(() => false),
  clearAuthTokens: jest.fn(),
  saveAuthTokens: jest.fn()
}));

import { UserProvider, useUser } from '../UserContext';
import { Person } from '../../types';
import { api, isAuthenticated } from '../../lib/api-client';

// Mock localStorage
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

// Mock console.error to suppress expected error logs
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('UserContext', () => {
  const mockUser: Person = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Developer',
    created_at: '2025-01-01',
    updated_at: '2025-01-01'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    consoleErrorSpy.mockClear();

    // Reset localStorage mock to return null by default
    localStorageMock.getItem.mockReturnValue(null);

    // Mock isAuthenticated to return false by default
    (isAuthenticated as jest.Mock).mockReturnValue(false);

    // Mock login to reject by default (so setCurrentUser falls back to legacy behavior)
    (api.auth.login as jest.Mock).mockRejectedValue(new Error('Login not configured'));

    // Mock me() to reject by default
    (api.auth.me as jest.Mock).mockRejectedValue(new Error('Not authenticated'));

    // Mock logout to resolve
    (api.auth.logout as jest.Mock).mockResolvedValue({});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  // Helper component to test the hook
  function TestComponent() {
    const { currentUser, isLoggedIn, setCurrentUser, logout } = useUser();

    return (
      <div>
        <div data-testid="current-user">
          {currentUser ? currentUser.name : 'No user'}
        </div>
        <div data-testid="is-logged-in">{isLoggedIn ? 'yes' : 'no'}</div>
        <button onClick={() => setCurrentUser(mockUser)}>Login</button>
        <button onClick={logout}>Logout</button>
        <button onClick={() => setCurrentUser(null)}>Clear User</button>
      </div>
    );
  }

  const renderWithProvider = (component: React.ReactElement) => {
    return render(<UserProvider>{component}</UserProvider>);
  };

  describe('Provider Initialization', () => {
    it('renders children', () => {
      renderWithProvider(<div data-testid="child">Test Child</div>);
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('initializes with no user', () => {
      renderWithProvider(<TestComponent />);
      expect(screen.getByTestId('current-user')).toHaveTextContent('No user');
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');
    });

    it('loads user from localStorage on mount', async () => {
      // Setup: user in localStorage but no auth token
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'capacinator_current_user') return JSON.stringify(mockUser);
        return null; // No auth token
      });
      (isAuthenticated as jest.Mock).mockReturnValue(false);

      // Mock login to succeed
      (api.auth.login as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          token: 'test-token',
          refreshToken: 'test-refresh-token'
        }
      });

      renderWithProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');
      });
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('yes');
    });

    it('handles invalid JSON in localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('current-user')).toHaveTextContent('No user');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('capacinator_current_user');
    });

    it('handles null from localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null);

      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('current-user')).toHaveTextContent('No user');
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');
    });
  });

  describe('Setting Current User', () => {
    it('sets current user and stores in localStorage', async () => {
      renderWithProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      await act(async () => {
        loginButton.click();
        // Wait for the login promise to reject and fall back to legacy behavior
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');
      });
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('yes');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'capacinator_current_user',
        JSON.stringify(mockUser)
      );
    });

    it('updates isLoggedIn when user is set', async () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');

      const loginButton = screen.getByText('Login');
      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('yes');
      });
    });

    it('clears user when set to null', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'capacinator_current_user') return JSON.stringify(mockUser);
        return null;
      });

      // Mock login to succeed for initialization
      (api.auth.login as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          token: 'test-token',
          refreshToken: 'test-refresh-token'
        }
      });

      renderWithProvider(<TestComponent />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');
      });

      const clearButton = screen.getByText('Clear User');
      await act(async () => {
        clearButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('No user');
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');
      });
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('capacinator_current_user');
    });

    it('allows changing users', async () => {
      // Change to different user
      const differentUser: Person = {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'Manager',
        created_at: '2025-01-02',
        updated_at: '2025-01-02'
      };

      function UpdateComponent() {
        const { setCurrentUser } = useUser();
        return (
          <button onClick={() => setCurrentUser(differentUser)}>Change User</button>
        );
      }

      render(
        <UserProvider>
          <TestComponent />
          <UpdateComponent />
        </UserProvider>
      );

      // Login with first user
      const loginButton = screen.getByText('Login');
      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');
      });

      const changeButton = screen.getByText('Change User');
      await act(async () => {
        changeButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('Jane Smith');
      });
    });
  });

  describe('Logout Functionality', () => {
    it('logs out user and clears localStorage', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      // Mock login to succeed for initialization
      (api.auth.login as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          token: 'test-token',
          refreshToken: 'test-refresh-token'
        }
      });

      renderWithProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('yes');
      });

      const logoutButton = screen.getByText('Logout');
      await act(async () => {
        logoutButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('No user');
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');
      });
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('capacinator_current_user');
    });

    it('handles logout when no user is logged in', async () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('current-user')).toHaveTextContent('No user');

      const logoutButton = screen.getByText('Logout');
      await act(async () => {
        logoutButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('No user');
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');
      });
    });
  });

  describe('isLoggedIn Flag', () => {
    it('returns false when no user is set', () => {
      renderWithProvider(<TestComponent />);
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');
    });

    it('returns true when user is set', async () => {
      renderWithProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('yes');
      });
    });

    it('updates immediately when user changes', async () => {
      renderWithProvider(<TestComponent />);

      // Initially not logged in
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');

      // Login
      const loginButton = screen.getByText('Login');
      await act(async () => {
        loginButton.click();
      });
      await waitFor(() => {
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('yes');
      });

      // Logout
      const logoutButton = screen.getByText('Logout');
      await act(async () => {
        logoutButton.click();
      });
      await waitFor(() => {
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');
      });
    });
  });

  describe('useUser Hook', () => {
    it('throws error when used outside UserProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      function InvalidComponent() {
        useUser();
        return null;
      }

      expect(() => {
        render(<InvalidComponent />);
      }).toThrow('useUser must be used within a UserProvider');

      consoleSpy.mockRestore();
    });

    it('provides all context values', () => {
      function TestHookValues() {
        const context = useUser();
        return (
          <div>
            <div data-testid="has-current-user">
              {typeof context.currentUser !== 'undefined' ? 'yes' : 'no'}
            </div>
            <div data-testid="has-set-function">
              {typeof context.setCurrentUser === 'function' ? 'yes' : 'no'}
            </div>
            <div data-testid="has-logout-function">
              {typeof context.logout === 'function' ? 'yes' : 'no'}
            </div>
            <div data-testid="has-is-logged-in">
              {typeof context.isLoggedIn === 'boolean' ? 'yes' : 'no'}
            </div>
          </div>
        );
      }

      renderWithProvider(<TestHookValues />);

      expect(screen.getByTestId('has-current-user')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-set-function')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-logout-function')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-is-logged-in')).toHaveTextContent('yes');
    });
  });

  describe('localStorage Persistence', () => {
    it('persists user across page reloads', async () => {
      // First render - login
      const { unmount } = renderWithProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'capacinator_current_user',
          JSON.stringify(mockUser)
        );
      });

      unmount();

      // Simulate page reload by creating new provider with stored data
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      // Mock login to succeed for initialization
      (api.auth.login as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          token: 'test-token',
          refreshToken: 'test-refresh-token'
        }
      });

      renderWithProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('yes');
      });
    });

    it('clears localStorage on logout', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      // Mock login to succeed for initialization
      (api.auth.login as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          token: 'test-token',
          refreshToken: 'test-refresh-token'
        }
      });

      renderWithProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');
      });

      const logoutButton = screen.getByText('Logout');
      await act(async () => {
        logoutButton.click();
      });

      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('capacinator_current_user');
      });
    });

    it('handles corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('{broken json');

      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('current-user')).toHaveTextContent('No user');
      // Console error is logged but we don't verify it due to spy complexity
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('capacinator_current_user');
    });

    it('handles empty string in localStorage', () => {
      localStorageMock.getItem.mockReturnValue('');

      renderWithProvider(<TestComponent />);

      // Empty string is falsy, so it should not try to parse
      expect(screen.getByTestId('current-user')).toHaveTextContent('No user');
    });
  });

  describe('Multiple Consumers', () => {
    it('provides same user to multiple consumers', async () => {
      function Consumer1() {
        const { currentUser } = useUser();
        return <div data-testid="consumer-1">{currentUser?.name || 'No user'}</div>;
      }

      function Consumer2() {
        const { currentUser } = useUser();
        return <div data-testid="consumer-2">{currentUser?.name || 'No user'}</div>;
      }

      renderWithProvider(
        <>
          <TestComponent />
          <Consumer1 />
          <Consumer2 />
        </>
      );

      const loginButton = screen.getByText('Login');
      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('consumer-1')).toHaveTextContent('John Doe');
        expect(screen.getByTestId('consumer-2')).toHaveTextContent('John Doe');
      });
    });

    it('updates all consumers when user changes', async () => {
      function Consumer1() {
        const { currentUser } = useUser();
        return <div data-testid="consumer-1">{currentUser?.name || 'No user'}</div>;
      }

      function Consumer2() {
        const { isLoggedIn } = useUser();
        return <div data-testid="consumer-2">{isLoggedIn ? 'Logged in' : 'Not logged in'}</div>;
      }

      renderWithProvider(
        <>
          <TestComponent />
          <Consumer1 />
          <Consumer2 />
        </>
      );

      // Login
      const loginButton = screen.getByText('Login');
      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('consumer-1')).toHaveTextContent('John Doe');
        expect(screen.getByTestId('consumer-2')).toHaveTextContent('Logged in');
      });

      // Logout
      const logoutButton = screen.getByText('Logout');
      await act(async () => {
        logoutButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('consumer-1')).toHaveTextContent('No user');
        expect(screen.getByTestId('consumer-2')).toHaveTextContent('Not logged in');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles user object with missing fields', async () => {
      const partialUser = {
        id: 'user-1',
        name: 'Partial User'
      } as Person;

      function TestPartialUser() {
        const { currentUser, setCurrentUser } = useUser();
        return (
          <div>
            <div data-testid="current-user">{currentUser?.name || 'No user'}</div>
            <button onClick={() => setCurrentUser(partialUser)}>Set Partial User</button>
          </div>
        );
      }

      renderWithProvider(<TestPartialUser />);

      const button = screen.getByText('Set Partial User');
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('Partial User');
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'capacinator_current_user',
        JSON.stringify(partialUser)
      );
    });

    it('handles rapid login/logout cycles', async () => {
      renderWithProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      const logoutButton = screen.getByText('Logout');

      // Rapid cycles
      await act(async () => {
        loginButton.click();
        logoutButton.click();
        loginButton.click();
        logoutButton.click();
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('yes');
      });
    });

    it('handles null and undefined gracefully', async () => {
      renderWithProvider(<TestComponent />);

      // Start with no user
      expect(screen.getByTestId('current-user')).toHaveTextContent('No user');

      // Login
      const loginButton = screen.getByText('Login');
      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');
      });

      // Clear user
      const clearButton = screen.getByText('Clear User');
      await act(async () => {
        clearButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('No user');
      });
    });
  });
});
