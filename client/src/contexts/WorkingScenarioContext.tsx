import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Scenario } from '../types';

interface WorkingScenarioContextType {
  workingScenario: Scenario | null;
  setWorkingScenario: (scenario: Scenario | null) => void;
  isWorkingScenario: (scenarioId: string) => boolean;
}

const WorkingScenarioContext = createContext<WorkingScenarioContextType | undefined>(undefined);

interface WorkingScenarioProviderProps {
  children: ReactNode;
}

export const WorkingScenarioProvider: React.FC<WorkingScenarioProviderProps> = ({ children }) => {
  const [workingScenario, setWorkingScenarioState] = useState<Scenario | null>(null);

  // Load working scenario from localStorage on mount
  useEffect(() => {
    const savedScenarioId = localStorage.getItem('workingScenarioId');
    if (savedScenarioId) {
      // We'll need to fetch the scenario details from the API
      // For now, we'll just store the ID and let the app handle fetching
      const savedScenario = localStorage.getItem('workingScenario');
      if (savedScenario) {
        try {
          const scenario = JSON.parse(savedScenario);
          setWorkingScenarioState(scenario);
        } catch (error) {
          console.error('Error parsing saved working scenario:', error);
          localStorage.removeItem('workingScenario');
          localStorage.removeItem('workingScenarioId');
        }
      }
    }
  }, []);

  const setWorkingScenario = (scenario: Scenario | null) => {
    setWorkingScenarioState(scenario);
    
    // Persist to localStorage
    if (scenario) {
      localStorage.setItem('workingScenarioId', scenario.id);
      localStorage.setItem('workingScenario', JSON.stringify(scenario));
    } else {
      localStorage.removeItem('workingScenarioId');
      localStorage.removeItem('workingScenario');
    }
  };

  const isWorkingScenario = (scenarioId: string) => {
    return workingScenario?.id === scenarioId;
  };

  return (
    <WorkingScenarioContext.Provider value={{
      workingScenario,
      setWorkingScenario,
      isWorkingScenario
    }}>
      {children}
    </WorkingScenarioContext.Provider>
  );
};

export const useWorkingScenario = () => {
  const context = useContext(WorkingScenarioContext);
  if (context === undefined) {
    throw new Error('useWorkingScenario must be used within a WorkingScenarioProvider');
  }
  return context;
};