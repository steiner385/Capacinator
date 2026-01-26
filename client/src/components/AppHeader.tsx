import React, { useState, useEffect } from 'react';
import {
  User,
  GitBranch,
  Clock,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  ChevronDown,
  LogOut
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useScenario } from '../contexts/ScenarioContext';
import { useTheme } from '../contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../lib/queryKeys';
import { SyncStatusIndicator } from './sync/SyncStatusIndicator';
import './AppHeader.css';

export const AppHeader: React.FC = () => {
  const { currentUser, logout } = useUser();
  const { currentScenario, scenarios, setCurrentScenario, isLoading } = useScenario();
  const { theme, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isScenarioDropdownOpen, setIsScenarioDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  // Close dropdowns when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.scenario-selector')) {
        setIsScenarioDropdownOpen(false);
      }
      if (!target.closest('.profile-dropdown-container')) {
        setIsProfileDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsScenarioDropdownOpen(false);
        setIsProfileDropdownOpen(false);
      }
    };

    if (isScenarioDropdownOpen || isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isScenarioDropdownOpen, isProfileDropdownOpen]);

  // Get system health status
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: queryKeys.health.check(),
    queryFn: () => api.health(),
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1,
  });

  // Handle logout
  const handleLogout = () => {
    logout();
    setIsProfileDropdownOpen(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const isHealthy = healthData?.status === 200;

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="time-display">
          <Clock size={14} />
          <span>{formatTime(currentTime)}</span>
        </div>
      </div>

      <div className="header-center">
        <div className="scenario-selector">
          <GitBranch size={12} />
          <button
            className={`scenario-button ${isLoading ? 'disabled' : ''}`}
            onClick={() => !isLoading && setIsScenarioDropdownOpen(!isScenarioDropdownOpen)}
            disabled={isLoading}
            title={currentScenario ? `Current Scenario: ${currentScenario.name}` : 'Select scenario'}
          >
            <span className="scenario-name">
              {isLoading ? 'Loading...' : currentScenario?.name || 'Select scenario...'}
            </span>
            <ChevronDown size={12} className={`chevron ${isScenarioDropdownOpen ? 'open' : ''}`} />
          </button>
          
          {isScenarioDropdownOpen && !isLoading && (
            <div className="scenario-dropdown">
              {scenarios && scenarios.length > 0 ? (
                scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    className={`scenario-option ${currentScenario?.id === scenario.id ? 'selected' : ''}`}
                    onClick={() => {
                      setCurrentScenario(scenario);
                      setIsScenarioDropdownOpen(false);
                    }}
                  >
                    <div className="scenario-details">
                      <span className="scenario-option-name">{scenario.name}</span>
                      <div className="scenario-badges">
                        {scenario.scenario_type === 'baseline' && (
                          <span className="baseline-star">★</span>
                        )}
                        <span className={`scenario-type-badge ${scenario.scenario_type}`}>
                          {scenario.scenario_type}
                        </span>
                        <span className={`scenario-status-badge ${scenario.status}`}>
                          {scenario.status}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="scenario-option" style={{ padding: '0.75rem', opacity: 0.6 }}>
                  {scenarios === undefined ? 'Loading scenarios...' : 'No scenarios available'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        <div className="header-controls">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <div className="status-indicators">
            {/* Git Sync Status (Feature: 001-git-sync-integration) */}
            {process.env.ENABLE_GIT_SYNC === 'true' && <SyncStatusIndicator />}

            <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Online' : 'Offline'}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            </div>
            <div className={`status-indicator ${isHealthy ? 'healthy' : 'unhealthy'}`} title={isHealthy ? 'System Healthy' : 'System Issues'}>
              {healthLoading ? <RefreshCw size={12} className="spinning" /> : <Activity size={12} />}
            </div>
          </div>

          {currentUser && (
            <div className="profile-dropdown-container">
              <button
                className="profile-dropdown-trigger"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              >
                <User size={14} />
                <span className="profile-name">{currentUser.name?.split(' ')[0] || 'User'}</span>
                <ChevronDown size={12} className={`chevron ${isProfileDropdownOpen ? 'open' : ''}`} />
              </button>

              {isProfileDropdownOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <div className="profile-info">
                      <User size={16} className="profile-avatar" />
                      <div className="profile-details">
                        <div className="profile-full-name">
                          {currentUser.name}
                        </div>
                        <div className="profile-email">{currentUser.email}</div>
                      </div>
                    </div>
                  </div>
                  <div className="profile-dropdown-actions">
                    <button className="profile-action" onClick={handleLogout}>
                      <LogOut size={14} />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};