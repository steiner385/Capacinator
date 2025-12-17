/**
 * Client Type Definitions
 *
 * This module re-exports shared types from @shared/types and adds any
 * client-specific type extensions if needed.
 *
 * Import types using: import type { Project, Person, Role } from '../types';
 */

// Re-export all shared types
// Using relative path since Vite handles the alias resolution at build time
// and we need this to work with both TypeScript compiler and Vite

// Base types
export type {
  BaseEntity,
  ApiError,
  ApiSuccessResponse,
  PaginationParams,
  PaginatedResponse,
} from '../../../shared/types/base';

// Entity types
export type {
  Location,
  ProjectType,
  ProjectSubType,
  ProjectPhase,
  Role,
  Project,
  Person,
  WorkerType,
  ProjectPhaseTimeline,
  DependencyType,
  ProjectPhaseDependency,
  AssignmentDateMode,
  ProjectAssignment,
  ProficiencyLevel,
  PersonRole,
  StandardAllocation,
  AvailabilityOverrideType,
  PersonAvailabilityOverride,
  DemandOverride,
  RolePlanner,
  ProjectPermissionLevel,
  ProjectPlanner,
} from '../../../shared/types/entities';

// View types
export type {
  ProjectDemand,
  AllocationStatus,
  PersonUtilization,
  CapacityGapStatus,
  CapacityGap,
  ProjectHealthStatus,
  ProjectHealth,
} from '../../../shared/types/views';

// API types
export type {
  DashboardSummary,
  CapacityReport,
  ImportResult,
  ExportOptions,
  TokenPayload,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  HealthCheckResponse,
} from '../../../shared/types/api';

// Scenario types
export type {
  ScenarioStatus,
  ScenarioType,
  Scenario,
  ScenarioChangeType,
  ScenarioAssignmentDateMode,
  ScenarioProjectAssignment,
  ScenarioProjectPhase,
  ScenarioProject,
  MergeConflictType,
  MergeResolution,
  ScenarioMergeConflict,
  ScenarioComparison,
  ScenarioAssignmentsView,
} from '../../../shared/types/scenarios';

// API request types
export type {
  // Project requests
  ProjectListParams,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  PhaseValidationRequest,
  CustomPhaseRequest,
  ProjectPhaseUpdateRequest,
  // People requests
  PersonListParams,
  PersonCreateRequest,
  PersonUpdateRequest,
  PersonRoleRequest,
  // Role requests
  RoleListParams,
  RoleCreateRequest,
  RoleUpdateRequest,
  RolePlannerRequest,
  // Assignment requests
  AssignmentListParams,
  AssignmentCreateRequest,
  AssignmentUpdateRequest,
  BulkAssignmentRequest,
  AssignmentConflictParams,
  AssignmentSuggestionParams,
  AssignmentTimelineParams,
  // Resource template requests
  ResourceTemplateListParams,
  ResourceTemplateCreateRequest,
  BulkResourceTemplateRequest,
  ResourceTemplateCopyRequest,
  // Availability requests
  AvailabilityListParams,
  AvailabilityCreateRequest,
  AvailabilityUpdateRequest,
  BulkAvailabilityRequest,
  AvailabilityApproveRequest,
  AvailabilityCalendarParams,
  AvailabilityForecastParams,
  // Demand requests
  DemandSummaryParams,
  DemandOverrideRequest,
  DemandForecastParams,
  ScenarioCalculateRequest,
  // Reporting requests
  ReportParams,
  ExportReportFilters,
  // Location requests
  LocationCreateRequest,
  LocationUpdateRequest,
  // Project type requests
  ProjectTypeCreateRequest,
  ProjectTypeUpdateRequest,
  ProjectSubTypeCreateRequest,
  ProjectTypeHierarchyUpdateRequest,
  // Phase requests
  PhaseCreateRequest,
  PhaseUpdateRequest,
  // Project phase requests
  ProjectPhaseListParams,
  ProjectPhaseCreateRequest,
  BulkProjectPhaseRequest,
  DuplicatePhaseRequest,
  CustomProjectPhaseRequest,
  BulkPhaseCorrectionsRequest,
  // Phase dependency requests
  PhaseDependencyListParams,
  PhaseDependencyCreateRequest,
  PhaseDependencyUpdateRequest,
  CascadeCalculateRequest,
  CascadeApplyRequest,
  // Project allocation requests
  AllocationOverrideRequest,
  // Scenario requests
  ScenarioCreateRequest,
  ScenarioUpdateRequest,
  ScenarioAssignmentRequest,
  ScenarioMergeRequest,
  // Audit requests
  AuditSearchParams,
  UndoRequest,
  // Settings requests
  SystemSettingsRequest,
  ImportSettingsRequest,
  // User permission requests
  UpdateRolePermissionsRequest,
  UpdateUserRoleRequest,
  UpdateUserPermissionRequest,
  // Notification requests
  SendNotificationRequest,
  NotificationPreferencesRequest,
  NotificationHistoryParams,
  NotificationStatsParams,
  // Recommendation requests
  RecommendationListParams,
  ExecuteRecommendationRequest,
} from '../../../shared/types/api-requests';
