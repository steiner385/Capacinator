// Base types
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// Core entities
export interface Project extends BaseEntity {
  name: string;
  project_type_id: string;
  location_id: string;
  priority: number;
  description?: string;
  data_restrictions?: string;
  include_in_demand: boolean;
  aspiration_start?: string;
  aspiration_finish?: string;
  external_id?: string;
  owner_id?: string;
  status?: 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  current_phase?: string;
  // Relations
  project_type?: ProjectType;
  location?: Location;
  project_type_name?: string;
  location_name?: string;
  owner_name?: string;
  phases?: ProjectPhaseTimeline[];
  assignments?: ProjectAssignment[];
  planners?: ProjectPlanner[];
}

export interface Person extends BaseEntity {
  name: string;
  email?: string;
  primary_role_id?: string;
  worker_type: 'FTE' | 'Contractor' | 'Consultant';
  supervisor_id?: string;
  default_availability_percentage: number;
  default_hours_per_day: number;
  is_bubble?: boolean;
  // Relations
  primary_role_name?: string;
  supervisor_name?: string;
  roles?: PersonRole[];
  assignments?: ProjectAssignment[];
  availabilityOverrides?: PersonAvailabilityOverride[];
}

export interface Role extends BaseEntity {
  name: string;
  external_id?: string;
  description?: string;
  // Relations
  people?: PersonRole[];
  planners?: RolePlanner[];
  standardAllocations?: StandardAllocation[];
}

export interface Location extends BaseEntity {
  name: string;
  description?: string;
}

export interface ProjectType extends BaseEntity {
  name: string;
  description?: string;
  color_code?: string;
}

export interface ProjectPhase extends BaseEntity {
  name: string;
  description?: string;
  order_index: number;
}

// Relationship entities
export interface ProjectPhaseTimeline extends BaseEntity {
  project_id: string;
  phase_id: string;
  start_date: string;
  end_date: string;
  notes?: string;
  // Relations
  phase_name?: string;
  phase_description?: string;
}

export interface ProjectAssignment extends BaseEntity {
  project_id: string;
  person_id: string;
  role_id: string;
  allocation_percentage: number;
  start_date: string;
  end_date: string;
  notes?: string;
  // Relations
  project_name?: string;
  person_name?: string;
  role_name?: string;
}

export interface PersonRole {
  person_id: string;
  role_id: string;
  proficiency_level: 'Junior' | 'Intermediate' | 'Senior' | 'Expert';
  years_experience?: number;
  notes?: string;
  assigned_at: string;
  // Relations
  role_name?: string;
  role_description?: string;
}

export interface StandardAllocation extends BaseEntity {
  project_type_id: string;
  phase_id: string;
  role_id: string;
  allocation_percentage: number;
  // Relations
  project_type_name?: string;
  phase_name?: string;
  role_name?: string;
}

export interface PersonAvailabilityOverride extends BaseEntity {
  person_id: string;
  start_date: string;
  end_date: string;
  availability_percentage: number;
  override_type: 'vacation' | 'training' | 'partial' | 'medical' | 'other';
  reason?: string;
  hours_per_day?: number;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  approver_notes?: string;
  // Relations
  person_name?: string;
  approver_name?: string;
}

export interface DemandOverride extends BaseEntity {
  project_id: string;
  phase_id?: string;
  role_id: string;
  start_date: string;
  end_date: string;
  demand_hours: number;
  reason?: string;
}

export interface RolePlanner {
  role_id: string;
  person_id: string;
  is_primary: boolean;
  can_allocate_resources: boolean;
  can_approve_assignments: boolean;
  can_modify_standard_allocations: boolean;
  notes?: string;
  assigned_at: string;
  assigned_by?: string;
  // Relations
  person_name?: string;
  assigned_by_name?: string;
}

export interface ProjectPlanner {
  project_id: string;
  person_id: string;
  permission_level: 'view' | 'edit' | 'admin';
  can_modify_type: boolean;
  can_modify_roadmap: boolean;
  can_add_overrides: boolean;
  can_assign_resources: boolean;
  is_primary_planner: boolean;
  assigned_at: string;
  assigned_by?: string;
  // Relations
  person_name?: string;
  assigned_by_name?: string;
}

// View types
export interface ProjectDemand {
  project_id: string;
  phase_id?: string;
  role_id: string;
  start_date: string;
  end_date: string;
  demand_hours: number;
  is_override: boolean;
  // Calculated
  demand_fte?: number;
  // Relations
  project_name?: string;
  phase_name?: string;
  role_name?: string;
}

export interface PersonUtilization {
  person_id: string;
  person_name: string;
  supervisor_id?: string;
  supervisor_name?: string;
  total_allocation: number;
  project_count: number;
  projects?: string;
  default_availability_percentage: number;
  default_hours_per_day: number;
  current_availability_percentage: number;
  allocation_status: 'OVER_ALLOCATED' | 'FULLY_ALLOCATED' | 'PARTIALLY_ALLOCATED' | 'UNDER_ALLOCATED';
}

export interface CapacityGap {
  role_id: string;
  role_name: string;
  role_planners?: string;
  people_count: number;
  total_capacity_fte: number;
  projects_needing_role: number;
  avg_allocation_needed: number;
  total_demand_fte: number;
  gap_fte: number;
  status: 'GAP' | 'TIGHT' | 'OK';
}

export interface ProjectHealth {
  project_id: string;
  project_name: string;
  project_type_id: string;
  project_type: string;
  location_id: string;
  location: string;
  priority: number;
  aspiration_start?: string;
  aspiration_finish?: string;
  owner_id?: string;
  owner_name?: string;
  phase_count: number;
  people_assigned: number;
  planner_count: number;
  primary_planner_name?: string;
  health_status: 'PLANNING' | 'NOT_STARTED' | 'OVERDUE' | 'NO_RESOURCES' | 'NO_TIMELINE' | 'ACTIVE';
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardSummary {
  summary: {
    projects: number;
    people: number;
    roles: number;
  };
  projectHealth: Record<string, number>;
  capacityGaps: Record<string, number>;
  utilization: Record<string, number>;
  availability: Record<string, number>;
}

export interface CapacityReport {
  capacityGaps: CapacityGap[];
  personUtilization: PersonUtilization[];
  projectDemands: ProjectDemand[];
  summary: {
    totalGaps: number;
    totalTight: number;
    overAllocated: number;
    underAllocated: number;
  };
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported?: {
    locations: number;
    projectTypes: number;
    phases: number;
    roles: number;
    people: number;
    projects: number;
    standardAllocations: number;
    assignments: number;
  };
  errors?: string[];
  warnings?: string[];
}