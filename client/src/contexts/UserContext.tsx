import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Person } from '../types';

interface UserContextType {
  currentUser: Person | null;
  setCurrentUser: (user: Person | null) => void;
  isLoggedIn: boolean;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<Person | null>(null);

  // Load user from localStorage on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('capacinator_current_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUserState(user);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('capacinator_current_user');
      }
    }
  }, []);

  const setCurrentUser = (user: Person | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('capacinator_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('capacinator_current_user');
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const isLoggedIn = currentUser !== null;

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isLoggedIn,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};