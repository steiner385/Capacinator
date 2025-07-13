import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { Person } from '../types';
import { useUser } from '../contexts/UserContext';
import './Login.css';

interface LoginProps {
  onClose?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onClose }) => {
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const { setCurrentUser } = useUser();

  // Fetch all people for the dropdown
  const { data: people, isLoading, error } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const response = await api.people.list();
      return response.data.data as Person[];
    },
  });

  const handleLogin = () => {
    if (!selectedPersonId || !people) return;

    const selectedPerson = people.find(person => person.id === selectedPersonId);
    if (selectedPerson) {
      setCurrentUser(selectedPerson);
      if (onClose) {
        onClose();
      }
    }
  };

  const handlePersonSelect = (personId: string) => {
    setSelectedPersonId(personId);
  };

  if (isLoading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h2>Select Your Profile</h2>
            <p>Choose your profile to personalize your experience</p>
          </div>
          <div className="login-loading">Loading employees...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h2>Error</h2>
            <p>Failed to load employee list. Please try again.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Select Your Profile</h2>
          <p>Choose your profile to personalize your experience</p>
        </div>
        
        <div className="login-form">
          <div className="form-group">
            <label htmlFor="person-select">Who are you?</label>
            <select
              id="person-select"
              value={selectedPersonId}
              onChange={(e) => handlePersonSelect(e.target.value)}
              className="person-dropdown"
            >
              <option value="">Select your name...</option>
              {people?.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} {person.primary_role_name && `(${person.primary_role_name})`}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleLogin}
            disabled={!selectedPersonId}
            className="login-button"
          >
            Continue
          </button>
        </div>

        <div className="login-footer">
          <p>Your selection will be saved for future visits</p>
        </div>
      </div>
    </div>
  );
};