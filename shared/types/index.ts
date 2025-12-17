/**
 * Shared Type Definitions
 *
 * This module provides type definitions shared between frontend and backend.
 * All types are defined once here and imported by both client and server.
 *
 * Organization:
 * - base.ts: Base interfaces (BaseEntity, PaginatedResponse, etc.)
 * - entities.ts: Core business entities (Project, Person, Role, etc.)
 * - views.ts: Computed/aggregated views (ProjectDemand, PersonUtilization, etc.)
 * - api.ts: API-specific types (DashboardSummary, ImportResult, etc.)
 * - scenarios.ts: Scenario planning types (Scenario, ScenarioComparison, etc.)
 */

// Base types
export type {
  BaseEntity,
  ApiError,
  ApiSuccessResponse,
  PaginationParams,
  PaginatedResponse,
} from './base.js';

// Entity types
export type {
  // Reference/Lookup entities
  Location,
  ProjectType,
  ProjectSubType,
  ProjectPhase,
  Role,
  // Core entities
  Project,
  Person,
  WorkerType,
  // Relationship entities
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
} from './entities.js';

// View types
export type {
  ProjectDemand,
  AllocationStatus,
  PersonUtilization,
  CapacityGapStatus,
  CapacityGap,
  ProjectHealthStatus,
  ProjectHealth,
} from './views.js';

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
} from './api.js';

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
} from './scenarios.js';

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
} from './api-requests.js';
