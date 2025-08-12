// Server-side types for project phase dependencies

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface ProjectPhaseTimeline {
  id: string;
  project_id: string;
  phase_id: string;
  start_date: string;
  end_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  project_name?: string;
  phase_name?: string;
  phase_description?: string;
  phase_order?: number;
  // Dependencies
  dependencies?: ProjectPhaseDependency[];
  dependents?: ProjectPhaseDependency[]; // Phases that depend on this one
}

export interface ProjectPhaseDependency {
  id: string;
  project_id: string;
  predecessor_phase_timeline_id: string; // The phase that must complete first
  successor_phase_timeline_id: string;   // The phase that depends on the predecessor
  dependency_type: DependencyType;
  lag_days?: number; // Optional delay between phases (e.g., +2 days after predecessor finishes)
  created_at: string;
  updated_at: string;
  // Relations
  predecessor_phase?: ProjectPhaseTimeline;
  successor_phase?: ProjectPhaseTimeline;
}