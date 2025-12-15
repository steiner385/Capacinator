/**
 * Server Type Definitions
 *
 * This module re-exports shared types from shared/types and provides
 * any server-specific type extensions.
 *
 * Import types using: import type { Project, Person, Role } from '../types/index.js';
 * Or: import type { Project } from '../../../shared/types/entities.js';
 */

// Re-export all shared types for convenience
export type {
  // Base types
  BaseEntity,
  ApiError,
  ApiSuccessResponse,
  PaginationParams,
  PaginatedResponse,
  // Entity types
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
  // View types
  ProjectDemand,
  AllocationStatus,
  PersonUtilization,
  CapacityGapStatus,
  CapacityGap,
  ProjectHealthStatus,
  ProjectHealth,
  // API types
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
  // Scenario types
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
} from '../../../shared/types/index.js';
