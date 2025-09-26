export interface ScenarioAssignmentsView {
  // From scenario_project_assignments
  id: string;
  scenario_id: string;
  project_id: string;
  person_id: string;
  role_id: string;
  phase_id: string | null;
  allocation_percentage: number;
  assignment_date_mode: 'fixed' | 'project' | 'phase';
  start_date: Date | null;
  end_date: Date | null;
  is_billable: boolean;
  is_aspirational: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  
  // Joined fields
  project_name: string;
  project_start: Date;
  project_finish: Date;
  person_name: string;
  role_name: string;
  phase_name: string | null;
  
  // Computed fields
  computed_start_date: Date;
  computed_end_date: Date;
}