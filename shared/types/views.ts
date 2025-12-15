/**
 * View types shared between frontend and backend
 * These represent computed/aggregated data views
 */

/**
 * Project demand calculation view
 */
export interface ProjectDemand {
  project_id: string;
  phase_id?: string;
  role_id: string;
  start_date: string;
  end_date: string;
  demand_hours: number;
  is_override: boolean;

  // Calculated fields
  demand_fte?: number;

  // Relations (populated when joined)
  project_name?: string;
  phase_name?: string;
  role_name?: string;
}

/**
 * Allocation status classifications
 */
export type AllocationStatus =
  | 'OVER_ALLOCATED'
  | 'FULLY_ALLOCATED'
  | 'PARTIALLY_ALLOCATED'
  | 'UNDER_ALLOCATED';

/**
 * Person utilization view - shows current allocation status
 */
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
  allocation_status: AllocationStatus;
}

/**
 * Capacity gap status classifications
 */
export type CapacityGapStatus = 'GAP' | 'TIGHT' | 'OK';

/**
 * Capacity gap view - shows role-level supply/demand gaps
 */
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
  status: CapacityGapStatus;
}

/**
 * Project health status classifications
 */
export type ProjectHealthStatus =
  | 'PLANNING'
  | 'NOT_STARTED'
  | 'OVERDUE'
  | 'NO_RESOURCES'
  | 'NO_TIMELINE'
  | 'ACTIVE';

/**
 * Project health view - shows project readiness status
 */
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
  health_status: ProjectHealthStatus;
}
