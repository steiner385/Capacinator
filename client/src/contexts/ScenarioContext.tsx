import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { Scenario } from '../types';

interface ScenarioContextType {
  currentScenario: Scenario | null;
  scenarios: Scenario[];
  setCurrentScenario: (scenario: Scenario | null) => void;
  isLoading: boolean;
  error: any;
}

const ScenarioContext = createContext<ScenarioContextType | undefined>(undefined);

interface ScenarioProviderProps {
  children: ReactNode;
}

export function ScenarioProvider({ children }: ScenarioProviderProps) {
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);

  // Fetch all scenarios
  const { data: scenarios = [], isLoading, error } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const response = await api.scenarios.list();
      return response.data;
    },
  });

  // Auto-select baseline scenario as default if no scenario is selected
  useEffect(() => {
    if (!currentScenario && scenarios.length > 0) {
      const baseline = scenarios.find(s => s.scenario_type === 'baseline');
      if (baseline) {
        setCurrentScenario(baseline);
      }
    }
  }, [scenarios, currentScenario]);

  // Store current scenario in localStorage for persistence
  useEffect(() => {
    if (currentScenario) {
      // Store the full scenario object for the API client to use
      localStorage.setItem('currentScenario', JSON.stringify(currentScenario));
      // Also store just the ID for backward compatibility
      localStorage.setItem('capacinator-current-scenario', currentScenario.id);
    }
  }, [currentScenario]);

  // Load current scenario from localStorage on mount
  useEffect(() => {
    const savedScenarioId = localStorage.getItem('capacinator-current-scenario');
    if (savedScenarioId && scenarios.length > 0) {
      const savedScenario = scenarios.find(s => s.id === savedScenarioId);
      if (savedScenario) {
        setCurrentScenario(savedScenario);
      }
    }
  }, [scenarios]);

  const value: ScenarioContextType = {
    currentScenario,
    scenarios,
    setCurrentScenario,
    isLoading,
    error,
  };

  return (
    <ScenarioContext.Provider value={value}>
      {children}
    </ScenarioContext.Provider>
  );
}

export function useScenario() {
  const context = useContext(ScenarioContext);
  if (context === undefined) {
    throw new Error('useScenario must be used within a ScenarioProvider');
  }
  return context;
}