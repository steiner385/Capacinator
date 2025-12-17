/**
 * API request types shared between frontend and backend
 * These define the request payloads for API endpoints
 */

import type { PaginationParams } from './base.js';
import type {
  AssignmentDateMode,
  AvailabilityOverrideType,
  DependencyType,
  ProficiencyLevel,
  ProjectPermissionLevel,
  WorkerType,
} from './entities.js';

// ============================================================================
// Project Requests
// ============================================================================

export interface ProjectListParams extends PaginationParams {
  location_id?: string;
  project_type_id?: string;
  status?: string;
  include_in_demand?: boolean;
  search?: string;
}

export interface ProjectCreateRequest {
  name: string;
  project_type_id: string;
  project_sub_type_id: string;
  location_id: string;
  priority?: number;
  description?: string;
  data_restrictions?: string;
  include_in_demand?: boolean;
  external_id?: string;
  owner_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  aspiration_start?: string;
  aspiration_finish?: string;
}

export interface ProjectUpdateRequest extends Partial<ProjectCreateRequest> {
  current_phase_id?: string;
}

export interface PhaseValidationRequest {
  phases: Array<{
    id?: string;
    phase_id: string;
    start_date: string;
    end_date: string;
  }>;
}

export interface CustomPhaseRequest {
  phase_id: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

export interface ProjectPhaseUpdateRequest {
  start_date?: string;
  end_date?: string;
  notes?: string;
}

// ============================================================================
// People Requests
// ============================================================================

export interface PersonListParams extends PaginationParams {
  role_id?: string;
  location_id?: string;
  worker_type?: WorkerType;
  search?: string;
}

export interface PersonCreateRequest {
  name: string;
  email?: string;
  worker_type?: WorkerType;
  supervisor_id?: string;
  location_id?: string;
  default_availability_percentage?: number;
  default_hours_per_day?: number;
  is_bubble?: boolean;
}

export interface PersonUpdateRequest extends Partial<PersonCreateRequest> {
  primary_person_role_id?: string;
}

export interface PersonRoleRequest {
  role_id: string;
  proficiency_level?: ProficiencyLevel;
  years_experience?: number;
  notes?: string;
}

// ============================================================================
// Role Requests
// ============================================================================

export interface RoleListParams extends PaginationParams {
  search?: string;
}

export interface RoleCreateRequest {
  name: string;
  external_id?: string;
  description?: string;
}

export interface RoleUpdateRequest extends Partial<RoleCreateRequest> {}

export interface RolePlannerRequest {
  person_id: string;
  is_primary?: boolean;
  can_allocate_resources?: boolean;
  can_approve_assignments?: boolean;
  can_modify_standard_allocations?: boolean;
  notes?: string;
}

// ============================================================================
// Assignment Requests
// ============================================================================

export interface AssignmentListParams extends PaginationParams {
  project_id?: string;
  person_id?: string;
  role_id?: string;
  phase_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface AssignmentCreateRequest {
  project_id: string;
  person_id: string;
  role_id: string;
  phase_id?: string;
  allocation_percentage: number;
  assignment_date_mode?: AssignmentDateMode;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface AssignmentUpdateRequest extends Partial<AssignmentCreateRequest> {}

export interface BulkAssignmentRequest {
  assignments: AssignmentCreateRequest[];
}

export interface AssignmentConflictParams {
  start_date?: string;
  end_date?: string;
  exclude_assignment_id?: string;
}

export interface AssignmentSuggestionParams {
  project_id: string;
  role_id: string;
  phase_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface AssignmentTimelineParams {
  start_date?: string;
  end_date?: string;
}

// ============================================================================
// Resource Template Requests
// ============================================================================

export interface ResourceTemplateListParams extends PaginationParams {
  project_type_id?: string;
  project_sub_type_id?: string;
}

export interface ResourceTemplateCreateRequest {
  project_type_id?: string;
  project_sub_type_id?: string;
  phase_id: string;
  role_id: string;
  allocation_percentage: number;
}

export interface BulkResourceTemplateRequest {
  templates: ResourceTemplateCreateRequest[];
}

export interface ResourceTemplateCopyRequest {
  source_project_type_id: string;
  target_project_type_id: string;
  overwrite_existing?: boolean;
}

// ============================================================================
// Availability Requests
// ============================================================================

export interface AvailabilityListParams extends PaginationParams {
  person_id?: string;
  start_date?: string;
  end_date?: string;
  override_type?: AvailabilityOverrideType;
  is_approved?: boolean;
}

export interface AvailabilityCreateRequest {
  person_id: string;
  start_date: string;
  end_date: string;
  availability_percentage: number;
  override_type: AvailabilityOverrideType;
  reason?: string;
  hours_per_day?: number;
}

export interface AvailabilityUpdateRequest extends Partial<AvailabilityCreateRequest> {}

export interface BulkAvailabilityRequest {
  overrides: AvailabilityCreateRequest[];
}

export interface AvailabilityApproveRequest {
  is_approved: boolean;
  approver_notes?: string;
}

export interface AvailabilityCalendarParams {
  person_id?: string;
  start_date: string;
  end_date: string;
}

export interface AvailabilityForecastParams {
  person_id?: string;
  start_date?: string;
  end_date?: string;
}

// ============================================================================
// Demand Requests
// ============================================================================

export interface DemandSummaryParams {
  start_date?: string;
  end_date?: string;
  role_id?: string;
  project_id?: string;
}

export interface DemandOverrideRequest {
  project_id: string;
  phase_id?: string;
  role_id: string;
  start_date: string;
  end_date: string;
  demand_hours: number;
  reason?: string;
}

export interface DemandForecastParams {
  start_date?: string;
  end_date?: string;
  role_id?: string;
  granularity?: 'day' | 'week' | 'month';
}

export interface ScenarioCalculateRequest {
  scenario_id?: string;
  start_date?: string;
  end_date?: string;
}

// ============================================================================
// Reporting Requests
// ============================================================================

export interface ReportParams {
  start_date?: string;
  end_date?: string;
  role_id?: string;
  project_id?: string;
  location_id?: string;
  granularity?: 'day' | 'week' | 'month';
}

export interface ExportReportFilters {
  start_date?: string;
  end_date?: string;
  role_id?: string;
  project_id?: string;
  location_id?: string;
  person_id?: string;
  include_inactive?: boolean;
}

// ============================================================================
// Location Requests
// ============================================================================

export interface LocationCreateRequest {
  name: string;
  description?: string;
}

export interface LocationUpdateRequest extends Partial<LocationCreateRequest> {}

// ============================================================================
// Project Type Requests
// ============================================================================

export interface ProjectTypeCreateRequest {
  name: string;
  description?: string;
  color_code?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ProjectTypeUpdateRequest extends Partial<ProjectTypeCreateRequest> {}

export interface ProjectSubTypeCreateRequest {
  name: string;
  description?: string;
  color_code?: string;
  sort_order?: number;
  is_default?: boolean;
  is_active?: boolean;
}

export interface ProjectTypeHierarchyUpdateRequest {
  parent_id?: string | null;
  sort_order?: number;
}

// ============================================================================
// Phase Requests
// ============================================================================

export interface PhaseCreateRequest {
  name: string;
  description?: string;
  order_index: number;
}

export interface PhaseUpdateRequest extends Partial<PhaseCreateRequest> {}

// ============================================================================
// Project Phase Requests
// ============================================================================

export interface ProjectPhaseListParams extends PaginationParams {
  project_id?: string;
  phase_id?: string;
}

export interface ProjectPhaseCreateRequest {
  project_id: string;
  phase_id: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

export interface BulkProjectPhaseRequest {
  phases: Array<{
    id?: string;
    project_id: string;
    phase_id: string;
    start_date: string;
    end_date: string;
    notes?: string;
  }>;
}

export interface DuplicatePhaseRequest {
  source_phase_timeline_id: string;
  target_project_id: string;
  offset_days?: number;
}

export interface CustomProjectPhaseRequest {
  project_id: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

export interface BulkPhaseCorrectionsRequest {
  corrections: Array<{
    id: string;
    start_date?: string;
    end_date?: string;
  }>;
}

// ============================================================================
// Project Phase Dependency Requests
// ============================================================================

export interface PhaseDependencyListParams extends PaginationParams {
  project_id?: string;
}

export interface PhaseDependencyCreateRequest {
  project_id: string;
  predecessor_phase_timeline_id: string;
  successor_phase_timeline_id: string;
  dependency_type: DependencyType;
  lag_days?: number;
}

export interface PhaseDependencyUpdateRequest extends Partial<Omit<PhaseDependencyCreateRequest, 'project_id'>> {}

export interface CascadeCalculateRequest {
  phase_timeline_id: string;
  new_end_date: string;
}

export interface CascadeApplyRequest {
  changes: Array<{
    phase_timeline_id: string;
    new_start_date: string;
    new_end_date: string;
  }>;
}

// ============================================================================
// Project Allocation Requests
// ============================================================================

export interface AllocationOverrideRequest {
  phase_id: string;
  role_id: string;
  allocation_percentage: number;
}

// ============================================================================
// Scenario Requests
// ============================================================================

export interface ScenarioCreateRequest {
  name: string;
  description?: string;
  base_scenario_id?: string;
}

export interface ScenarioUpdateRequest extends Partial<ScenarioCreateRequest> {
  status?: string;
}

export interface ScenarioAssignmentRequest {
  project_id: string;
  person_id: string;
  role_id: string;
  phase_id?: string;
  allocation_percentage: number;
  assignment_date_mode?: AssignmentDateMode;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface ScenarioMergeRequest {
  resolve_conflicts?: boolean;
  conflict_resolutions?: Record<string, 'keep_base' | 'keep_scenario'>;
}

// ============================================================================
// Audit Requests
// ============================================================================

export interface AuditSearchParams {
  table_name?: string;
  record_id?: string;
  changed_by?: string;
  action_type?: 'INSERT' | 'UPDATE' | 'DELETE';
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface UndoRequest {
  comment?: string;
}

// ============================================================================
// Settings Requests
// ============================================================================

export interface SystemSettingsRequest {
  fiscal_year_start_month?: number;
  default_hours_per_day?: number;
  default_availability_percentage?: number;
  enable_notifications?: boolean;
  notification_email_from?: string;
  backup_enabled?: boolean;
  backup_frequency?: string;
}

export interface ImportSettingsRequest {
  date_format?: string;
  auto_create_missing_roles?: boolean;
  auto_create_missing_locations?: boolean;
  validate_duplicates?: boolean;
  default_project_priority?: number;
}

// ============================================================================
// User Permission Requests
// ============================================================================

export interface UpdateRolePermissionsRequest {
  permissionIds: string[];
}

export interface UpdateUserRoleRequest {
  roleId: string;
}

export interface UpdateUserPermissionRequest {
  permissionId: string;
  granted: boolean;
  reason?: string;
}

// ============================================================================
// Notification Requests
// ============================================================================

export interface SendNotificationRequest {
  user_id: string;
  type: string;
  subject: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationPreferencesRequest {
  email_enabled?: boolean;
  assignment_notifications?: boolean;
  project_notifications?: boolean;
  capacity_alerts?: boolean;
}

export interface NotificationHistoryParams {
  type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationStatsParams {
  start_date?: string;
  end_date?: string;
}

// ============================================================================
// Recommendation Requests
// ============================================================================

export interface RecommendationListParams extends PaginationParams {
  type?: string;
  status?: string;
  project_id?: string;
}

export interface ExecuteRecommendationRequest {
  actions: Record<string, unknown>;
}
