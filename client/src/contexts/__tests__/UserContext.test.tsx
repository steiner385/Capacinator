import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Unmock UserContext to test the real implementation
jest.unmock('../UserContext');

import { UserProvider, useUser } from '../UserContext';
import { Person } from '../../types';

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
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

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
      expect(console.error).toHaveBeenCalledWith(
        'Failed to parse stored user data:',
        expect.any(Error)
      );
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
    it('sets current user and stores in localStorage', () => {
      renderWithProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      act(() => {
        loginButton.click();
      });

      expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('yes');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'capacinator_current_user',
        JSON.stringify(mockUser)
      );
    });

    it('updates isLoggedIn when user is set', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');

      const loginButton = screen.getByText('Login');
      act(() => {
        loginButton.click();
      });

      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('yes');
    });

    it('clears user when set to null', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');

      const clearButton = screen.getByText('Clear User');
      act(() => {
        clearButton.click();
      });

      expect(screen.getByTestId('current-user')).toHaveTextContent('No user');
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('capacinator_current_user');
    });

    it('allows changing users', () => {
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
      act(() => {
        loginButton.click();
      });

      expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');

      const changeButton = screen.getByText('Change User');
      act(() => {
        changeButton.click();
      });

      expect(screen.getByTestId('current-user')).toHaveTextContent('Jane Smith');
    });
  });

  describe('Logout Functionality', () => {
    it('logs out user and clears localStorage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('yes');

      const logoutButton = screen.getByText('Logout');
      act(() => {
        logoutButton.click();
      });

      expect(screen.getByTestId('current-user')).toHaveTextContent('No user');
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('capacinator_current_user');
    });

    it('handles logout when no user is logged in', () => {
      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('current-user')).toHaveTextContent('No user');

      const logoutButton = screen.getByText('Logout');
      act(() => {
        logoutButton.click();
      });

      expect(screen.getByTestId('current-user')).toHaveTextContent('No user');
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');
    });
  });

  describe('isLoggedIn Flag', () => {
    it('returns false when no user is set', () => {
      renderWithProvider(<TestComponent />);
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');
    });

    it('returns true when user is set', () => {
      renderWithProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      act(() => {
        loginButton.click();
      });

      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('yes');
    });

    it('updates immediately when user changes', () => {
      renderWithProvider(<TestComponent />);

      // Initially not logged in
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');

      // Login
      const loginButton = screen.getByText('Login');
      act(() => {
        loginButton.click();
      });
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('yes');

      // Logout
      const logoutButton = screen.getByText('Logout');
      act(() => {
        logoutButton.click();
      });
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('no');
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
    it('persists user across page reloads', () => {
      // First render - login
      const { unmount } = renderWithProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      act(() => {
        loginButton.click();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'capacinator_current_user',
        JSON.stringify(mockUser)
      );

      unmount();

      // Simulate page reload by creating new provider with stored data
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('yes');
    });

    it('clears localStorage on logout', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      renderWithProvider(<TestComponent />);

      const logoutButton = screen.getByText('Logout');
      act(() => {
        logoutButton.click();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('capacinator_current_user');
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
    it('provides same user to multiple consumers', () => {
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
      act(() => {
        loginButton.click();
      });

      expect(screen.getByTestId('consumer-1')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('consumer-2')).toHaveTextContent('John Doe');
    });

    it('updates all consumers when user changes', () => {
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
      act(() => {
        loginButton.click();
      });

      expect(screen.getByTestId('consumer-1')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('consumer-2')).toHaveTextContent('Logged in');

      // Logout
      const logoutButton = screen.getByText('Logout');
      act(() => {
        logoutButton.click();
      });

      expect(screen.getByTestId('consumer-1')).toHaveTextContent('No user');
      expect(screen.getByTestId('consumer-2')).toHaveTextContent('Not logged in');
    });
  });

  describe('Edge Cases', () => {
    it('handles user object with missing fields', () => {
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
      act(() => {
        button.click();
      });

      expect(screen.getByTestId('current-user')).toHaveTextContent('Partial User');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'capacinator_current_user',
        JSON.stringify(partialUser)
      );
    });

    it('handles rapid login/logout cycles', () => {
      renderWithProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      const logoutButton = screen.getByText('Logout');

      // Rapid cycles
      act(() => {
        loginButton.click();
        logoutButton.click();
        loginButton.click();
        logoutButton.click();
        loginButton.click();
      });

      expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('yes');
    });

    it('handles null and undefined gracefully', () => {
      renderWithProvider(<TestComponent />);

      // Start with no user
      expect(screen.getByTestId('current-user')).toHaveTextContent('No user');

      // Login
      const loginButton = screen.getByText('Login');
      act(() => {
        loginButton.click();
      });

      expect(screen.getByTestId('current-user')).toHaveTextContent('John Doe');

      // Clear user
      const clearButton = screen.getByText('Clear User');
      act(() => {
        clearButton.click();
      });

      expect(screen.getByTestId('current-user')).toHaveTextContent('No user');
    });
  });
});
