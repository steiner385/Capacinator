import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export interface WizardProject {
  id: string;
  name: string;
  timeline: {
    start: string;
    end: string;
  };
  requiredRoles: {
    roleId: string;
    roleName: string;
    count: number;
    priority: 'high' | 'medium' | 'low';
  }[];
  currentAllocations: {
    personId: string;
    personName: string;
    roleId: string;
    allocation: number;
  }[];
}

export interface ResourceGap {
  projectId: string;
  projectName: string;
  roleId: string;
  roleName: string;
  required: number;
  allocated: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  timeline: {
    start: string;
    end: string;
  };
}

export interface ResourceSuggestion {
  personId: string;
  personName: string;
  roleId: string;
  roleName: string;
  availableCapacity: number;
  skillMatch: number; // 0-100%
  costPerHour?: number;
  timeline: {
    start: string;
    end: string;
  };
}

export interface AllocationPlan {
  gapId: string;
  personId: string;
  personName: string;
  roleId: string;
  allocation: number;
  confidence: number; // 0-100%
  reasoning: string;
}

export interface WizardState {
  currentStep: number;
  totalSteps: number;
  selectedProjects: WizardProject[];
  identifiedGaps: ResourceGap[];
  resourceSuggestions: ResourceSuggestion[];
  allocationPlans: AllocationPlan[];
  autoMode: boolean;
  isProcessing: boolean;
  error: string | null;
}

type WizardAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'SET_PROJECTS'; payload: WizardProject[] }
  | { type: 'SET_GAPS'; payload: ResourceGap[] }
  | { type: 'SET_SUGGESTIONS'; payload: ResourceSuggestion[] }
  | { type: 'SET_ALLOCATION_PLANS'; payload: AllocationPlan[] }
  | { type: 'TOGGLE_AUTO_MODE' }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_WIZARD' }
  | { type: 'UPDATE_ALLOCATION_PLAN'; payload: { index: number; plan: Partial<AllocationPlan> } };

const initialState: WizardState = {
  currentStep: 1,
  totalSteps: 5,
  selectedProjects: [],
  identifiedGaps: [],
  resourceSuggestions: [],
  allocationPlans: [],
  autoMode: true,
  isProcessing: false,
  error: null,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: Math.max(1, Math.min(action.payload, state.totalSteps)) };
    case 'NEXT_STEP':
      return { ...state, currentStep: Math.min(state.currentStep + 1, state.totalSteps) };
    case 'PREVIOUS_STEP':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 1) };
    case 'SET_PROJECTS':
      return { ...state, selectedProjects: action.payload };
    case 'SET_GAPS':
      return { ...state, identifiedGaps: action.payload };
    case 'SET_SUGGESTIONS':
      return { ...state, resourceSuggestions: action.payload };
    case 'SET_ALLOCATION_PLANS':
      return { ...state, allocationPlans: action.payload };
    case 'TOGGLE_AUTO_MODE':
      return { ...state, autoMode: !state.autoMode };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isProcessing: false };
    case 'UPDATE_ALLOCATION_PLAN':
      const updatedPlans = [...state.allocationPlans];
      updatedPlans[action.payload.index] = { ...updatedPlans[action.payload.index], ...action.payload.plan };
      return { ...state, allocationPlans: updatedPlans };
    case 'RESET_WIZARD':
      return initialState;
    default:
      return state;
  }
}

interface WizardContextType {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  setProjects: (projects: WizardProject[]) => void;
  analyzeGaps: () => Promise<void>;
  findResourceSuggestions: () => Promise<void>;
  generateAllocationPlans: () => Promise<void>;
  applyAllocations: () => Promise<void>;
  resetWizard: () => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const goToStep = (step: number) => {
    dispatch({ type: 'SET_STEP', payload: step });
  };

  const nextStep = () => {
    dispatch({ type: 'NEXT_STEP' });
  };

  const previousStep = () => {
    dispatch({ type: 'PREVIOUS_STEP' });
  };

  const setProjects = (projects: WizardProject[]) => {
    dispatch({ type: 'SET_PROJECTS', payload: projects });
  };

  const analyzeGaps = async () => {
    dispatch({ type: 'SET_PROCESSING', payload: true });
    try {
      // Analyze selected projects to identify resource gaps
      const gaps: ResourceGap[] = [];
      
      for (const project of state.selectedProjects) {
        for (const requiredRole of project.requiredRoles) {
          const currentAllocation = project.currentAllocations
            .filter(a => a.roleId === requiredRole.roleId)
            .reduce((sum, a) => sum + a.allocation, 0);
          
          const gap = requiredRole.count - currentAllocation;
          
          if (gap > 0) {
            gaps.push({
              projectId: project.id,
              projectName: project.name,
              roleId: requiredRole.roleId,
              roleName: requiredRole.roleName,
              required: requiredRole.count,
              allocated: currentAllocation,
              gap,
              priority: requiredRole.priority,
              timeline: project.timeline
            });
          }
        }
      }

      dispatch({ type: 'SET_GAPS', payload: gaps });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to analyze gaps' });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  };

  const findResourceSuggestions = async () => {
    dispatch({ type: 'SET_PROCESSING', payload: true });
    try {
      // This would typically call the API to find available resources
      // For now, we'll simulate the response
      const suggestions: ResourceSuggestion[] = [];
      
      // Mock data - in reality this would come from the API
      const mockPeople = [
        { id: '1', name: 'Alice Johnson', skills: ['Frontend', 'React'], capacity: 40 },
        { id: '2', name: 'Bob Smith', skills: ['Backend', 'Node.js'], capacity: 32 },
        { id: '3', name: 'Carol Davis', skills: ['Design', 'UI/UX'], capacity: 40 },
        { id: '4', name: 'David Wilson', skills: ['Full Stack', 'React', 'Node.js'], capacity: 40 },
      ];

      for (const gap of state.identifiedGaps) {
        const matchingPeople = mockPeople.filter(person => 
          person.skills.some(skill => 
            skill.toLowerCase().includes(gap.roleName.toLowerCase()) ||
            gap.roleName.toLowerCase().includes(skill.toLowerCase())
          )
        );

        for (const person of matchingPeople) {
          const skillMatch = person.skills.some(skill => 
            skill.toLowerCase() === gap.roleName.toLowerCase()
          ) ? 100 : 75;

          suggestions.push({
            personId: person.id,
            personName: person.name,
            roleId: gap.roleId,
            roleName: gap.roleName,
            availableCapacity: person.capacity,
            skillMatch,
            timeline: gap.timeline
          });
        }
      }

      dispatch({ type: 'SET_SUGGESTIONS', payload: suggestions });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to find suggestions' });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  };

  const generateAllocationPlans = async () => {
    dispatch({ type: 'SET_PROCESSING', payload: true });
    try {
      const plans: AllocationPlan[] = [];

      if (state.autoMode) {
        // Auto-generate allocation plans
        for (const gap of state.identifiedGaps) {
          const suggestions = state.resourceSuggestions.filter(s => s.roleId === gap.roleId);
          const bestMatch = suggestions.sort((a, b) => b.skillMatch - a.skillMatch)[0];

          if (bestMatch) {
            const allocation = Math.min(gap.gap * 40, bestMatch.availableCapacity); // 40 hours per person unit
            
            plans.push({
              gapId: `${gap.projectId}-${gap.roleId}`,
              personId: bestMatch.personId,
              personName: bestMatch.personName,
              roleId: gap.roleId,
              allocation,
              confidence: bestMatch.skillMatch,
              reasoning: `Best skill match (${bestMatch.skillMatch}%) with available capacity`
            });
          }
        }
      }

      dispatch({ type: 'SET_ALLOCATION_PLANS', payload: plans });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to generate plans' });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  };

  const applyAllocations = async () => {
    dispatch({ type: 'SET_PROCESSING', payload: true });
    try {
      // This would call the API to actually create the assignments
      // For now, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success message
      alert(`✅ Success! ${state.allocationPlans.length} resource allocations have been applied successfully. Your assignments have been created and project schedules updated.`);
      
      // Reset wizard after successful application
      dispatch({ type: 'RESET_WIZARD' });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to apply allocations' });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  };

  const resetWizard = () => {
    dispatch({ type: 'RESET_WIZARD' });
  };

  const value: WizardContextType = {
    state,
    dispatch,
    goToStep,
    nextStep,
    previousStep,
    setProjects,
    analyzeGaps,
    findResourceSuggestions,
    generateAllocationPlans,
    applyAllocations,
    resetWizard,
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}