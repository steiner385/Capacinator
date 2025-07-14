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
  Sun,
  Moon
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useWorkingScenario } from '../contexts/WorkingScenarioContext';
import { useTheme } from '../contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { Scenario } from '../types';
import './AppHeader.css';

export const AppHeader: React.FC = () => {
  const { currentUser } = useUser();
  const { workingScenario, setWorkingScenario } = useWorkingScenario();
  const { theme, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isScenarioDropdownOpen, setIsScenarioDropdownOpen] = useState(false);

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

  // Close dropdown when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.scenario-selector')) {
        setIsScenarioDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsScenarioDropdownOpen(false);
      }
    };

    if (isScenarioDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isScenarioDropdownOpen]);

  // Get system health status
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.health(),
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1,
  });

  // Get scenarios for dropdown
  const { data: scenarios } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const response = await api.scenarios.list();
      return response.data as Scenario[];
    },
  });

  // Auto-select baseline scenario if no working scenario is selected
  React.useEffect(() => {
    if (scenarios && !workingScenario) {
      const baseline = scenarios.find(s => s.scenario_type === 'baseline');
      if (baseline) {
        setWorkingScenario(baseline);
      }
    }
  }, [scenarios, workingScenario, setWorkingScenario]);

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
            className="scenario-button"
            onClick={() => setIsScenarioDropdownOpen(!isScenarioDropdownOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsScenarioDropdownOpen(!isScenarioDropdownOpen);
              } else if (e.key === 'Escape') {
                setIsScenarioDropdownOpen(false);
              }
            }}
            title={workingScenario ? `Working Scenario: ${workingScenario.name}` : 'Select working scenario'}
          >
            <span className="scenario-name">
              {workingScenario?.name || 'Select scenario...'}
            </span>
            <ChevronDown size={12} className={`chevron ${isScenarioDropdownOpen ? 'open' : ''}`} />
          </button>
          
          {isScenarioDropdownOpen && (
            <div className="scenario-dropdown">
              {scenarios && scenarios.length > 0 ? (
                scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    className={`scenario-option ${workingScenario?.id === scenario.id ? 'selected' : ''}`}
                    onClick={() => {
                      setWorkingScenario(scenario);
                      setIsScenarioDropdownOpen(false);
                    }}
                  >
                    <div className="scenario-details">
                      <span className="scenario-option-name">{scenario.name}</span>
                      <span className="scenario-type">{scenario.scenario_type}</span>
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
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          <div className="status-indicators">
            <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Online' : 'Offline'}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            </div>
            <div className={`status-indicator ${isHealthy ? 'healthy' : 'unhealthy'}`} title={isHealthy ? 'System Healthy' : 'System Issues'}>
              {healthLoading ? <RefreshCw size={12} className="spinning" /> : <Activity size={12} />}
            </div>
          </div>

          {currentUser && (
            <div className="user-display">
              <User size={14} />
              <span>{currentUser.name}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};