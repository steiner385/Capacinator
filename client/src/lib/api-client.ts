import axios from 'axios';
import type {
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
  // Notification requests
  SendNotificationRequest,
  NotificationPreferencesRequest,
  NotificationHistoryParams,
  NotificationStatsParams,
  // Recommendation requests
  RecommendationListParams,
  ExecuteRecommendationRequest,
} from '../types';

// Force use of proxy for E2E testing
const API_BASE_URL = '/api';

// Auth token storage keys
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

// Helper to add subscribers waiting for token refresh
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

// Helper to notify subscribers when token is refreshed
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token and scenario context
apiClient.interceptors.request.use((config) => {
  // Add auth token if available
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add scenario context from localStorage
  const scenarioContext = localStorage.getItem('currentScenario');
  if (scenarioContext) {
    try {
      const scenario = JSON.parse(scenarioContext) as { id?: string };
      if (scenario?.id) {
        config.headers['X-Scenario-Id'] = scenario.id;
      }
    } catch (error) {
      console.error('Failed to parse scenario context:', error);
    }
  }

  return config;
});

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      const errorCode = error.response?.data?.code;

      // If token expired, try to refresh
      if (errorCode === 'TOKEN_EXPIRED') {
        if (isRefreshing) {
          // Wait for the ongoing refresh to complete
          return new Promise((resolve) => {
            subscribeTokenRefresh((token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

        if (refreshToken) {
          try {
            // Use a new axios instance to avoid interceptor loop
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;

            // Save new tokens
            localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);

            // Notify waiting requests
            onTokenRefreshed(accessToken);
            isRefreshing = false;

            // Retry the original request
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return apiClient(originalRequest);
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            isRefreshing = false;
            clearAuthTokens();
            redirectToLogin();
            return Promise.reject(refreshError);
          }
        } else {
          // No refresh token, redirect to login
          clearAuthTokens();
          redirectToLogin();
        }
      } else {
        // Other 401 errors (invalid token, no token, etc.) - redirect to login
        clearAuthTokens();
        redirectToLogin();
      }
    }

    return Promise.reject(error);
  }
);

// Helper to clear auth tokens
export function clearAuthTokens() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Helper to save auth tokens
export function saveAuthTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

// Helper to get current access token
export function getAccessToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

// Helper to check if user is authenticated
export function isAuthenticated(): boolean {
  return !!localStorage.getItem(AUTH_TOKEN_KEY);
}

// Helper to redirect to login
function redirectToLogin() {
  // Dispatch a custom event that the app can listen to
  window.dispatchEvent(new CustomEvent('auth:logout'));
}

// Type-safe API endpoints
export const api = {
  // Projects
  projects: {
    list: (params?: ProjectListParams) => apiClient.get('/projects', { params }),
    get: (id: string) => apiClient.get(`/projects/${id}`),
    create: (data: ProjectCreateRequest) => apiClient.post('/projects', data),
    update: (id: string, data: ProjectUpdateRequest) => apiClient.put(`/projects/${id}`, data),
    delete: (id: string) => apiClient.delete(`/projects/${id}`),
    getDemands: (id: string) => apiClient.get(`/projects/${id}/demands`),
    // Phase management endpoints
    validatePhaseUpdates: (id: string, data: PhaseValidationRequest) => apiClient.post(`/projects/${id}/phases/validate-updates`, data),
    validateCustomPhase: (id: string, data: CustomPhaseRequest) => apiClient.post(`/projects/${id}/phases/validate-custom`, data),
    getTemplateCompliance: (id: string) => apiClient.get(`/projects/${id}/template-compliance`),
    addCustomPhase: (id: string, data: CustomPhaseRequest) => apiClient.post(`/projects/${id}/phases/custom`, data),
    updateProjectPhase: (id: string, phaseTimelineId: string, data: ProjectPhaseUpdateRequest) => apiClient.put(`/projects/${id}/phases/${phaseTimelineId}`, data),
    deleteProjectPhase: (id: string, phaseTimelineId: string) => apiClient.delete(`/projects/${id}/phases/${phaseTimelineId}`),
    getHealth: () => apiClient.get('/projects/dashboard/health'),
  },

  // People
  people: {
    list: (params?: PersonListParams) => apiClient.get('/people', { params }),
    get: (id: string) => apiClient.get(`/people/${id}`),
    create: (data: PersonCreateRequest) => apiClient.post('/people', data),
    update: (id: string, data: PersonUpdateRequest) => apiClient.put(`/people/${id}`, data),
    delete: (id: string) => apiClient.delete(`/people/${id}`),
    addRole: (id: string, data: PersonRoleRequest) => apiClient.post(`/people/${id}/roles`, data),
    updateRole: (id: string, roleId: string, data: Partial<PersonRoleRequest>) => apiClient.put(`/people/${id}/roles/${roleId}`, data),
    removeRole: (id: string, roleId: string) => apiClient.delete(`/people/${id}/roles/${roleId}`),
    getUtilization: () => apiClient.get('/people/dashboard/utilization'),
    getAvailability: () => apiClient.get('/people/dashboard/availability'),
  },

  // Roles
  roles: {
    list: (params?: RoleListParams) => apiClient.get('/roles', { params }),
    get: (id: string) => apiClient.get(`/roles/${id}`),
    create: (data: RoleCreateRequest) => apiClient.post('/roles', data),
    update: (id: string, data: RoleUpdateRequest) => apiClient.put(`/roles/${id}`, data),
    delete: (id: string) => apiClient.delete(`/roles/${id}`),
    addPlanner: (id: string, data: RolePlannerRequest) => apiClient.post(`/roles/${id}/planners`, data),
    removePlanner: (id: string, plannerId: string) => apiClient.delete(`/roles/${id}/planners/${plannerId}`),
    getCapacityGaps: () => apiClient.get('/roles/dashboard/capacity-gaps'),
  },

  // Assignments
  assignments: {
    list: (params?: AssignmentListParams) => apiClient.get('/assignments', { params }),
    create: (data: AssignmentCreateRequest) => apiClient.post('/assignments', data),
    update: (id: string, data: AssignmentUpdateRequest) => apiClient.put(`/assignments/${id}`, data),
    delete: (id: string) => apiClient.delete(`/assignments/${id}`),
    bulkCreate: (data: BulkAssignmentRequest) => apiClient.post('/assignments/bulk', data),
    getConflicts: (personId: string, params?: AssignmentConflictParams) => apiClient.get(`/assignments/conflicts/${personId}`, { params }),
    getSuggestions: (params: AssignmentSuggestionParams) => apiClient.get('/assignments/suggestions', { params }),
    getTimeline: (personId: string, params?: AssignmentTimelineParams) => apiClient.get(`/assignments/timeline/${personId}`, { params }),
  },

  // Resource Templates
  resourceTemplates: {
    list: (params?: ResourceTemplateListParams) => apiClient.get('/resource-templates', { params }),
    create: (data: ResourceTemplateCreateRequest) => apiClient.post('/resource-templates', data),
    bulkUpdate: (data: BulkResourceTemplateRequest) => apiClient.post('/resource-templates/bulk', data),
    copy: (data: ResourceTemplateCopyRequest) => apiClient.post('/resource-templates/copy', data),
    getTemplates: () => apiClient.get('/resource-templates/templates'),
    getSummary: () => apiClient.get('/resource-templates/summary'),
    getByProjectType: (projectTypeId: string) => apiClient.get(`/resource-templates/project-type/${projectTypeId}`),
  },

  // Availability
  availability: {
    list: (params?: AvailabilityListParams) => apiClient.get('/availability', { params }),
    create: (data: AvailabilityCreateRequest) => apiClient.post('/availability', data),
    update: (id: string, data: AvailabilityUpdateRequest) => apiClient.put(`/availability/${id}`, data),
    delete: (id: string) => apiClient.delete(`/availability/${id}`),
    bulkCreate: (data: BulkAvailabilityRequest) => apiClient.post('/availability/bulk', data),
    approve: (id: string, data: AvailabilityApproveRequest) => apiClient.post(`/availability/${id}/approve`, data),
    getCalendar: (params?: AvailabilityCalendarParams) => apiClient.get('/availability/calendar', { params }),
    getForecast: (params?: AvailabilityForecastParams) => apiClient.get('/availability/forecast', { params }),
  },

  // Demands
  demands: {
    getProjectDemands: (projectId: string) => apiClient.get(`/demands/project/${projectId}`),
    getSummary: (params?: DemandSummaryParams) => apiClient.get('/demands/summary', { params }),
    createOverride: (data: DemandOverrideRequest) => apiClient.post('/demands/override', data),
    deleteOverride: (id: string) => apiClient.delete(`/demands/override/${id}`),
    getForecast: (params?: DemandForecastParams) => apiClient.get('/demands/forecast', { params }),
    getGaps: () => apiClient.get('/demands/gaps'),
    calculateScenario: (data: ScenarioCalculateRequest) => apiClient.post('/demands/scenario', data),
  },

  // Reporting
  reporting: {
    getDashboard: () => apiClient.get('/reporting/dashboard'),
    getCapacity: (params?: ReportParams) => apiClient.get('/reporting/capacity', { params }),
    getDemand: (params?: ReportParams) => apiClient.get('/reporting/demand', { params }),
    getUtilization: (params?: ReportParams) => apiClient.get('/reporting/utilization', { params }),
    getGaps: (params?: ReportParams) => apiClient.get('/reporting/gaps', { params }),
    getProjects: (params?: ReportParams) => apiClient.get('/reporting/projects', { params }),
    getTimeline: (params?: ReportParams) => apiClient.get('/reporting/timeline', { params }),
  },

  // Import
  import: {
    uploadExcel: (file: File, options: {
      clearExisting?: boolean;
      useV2?: boolean;
      validateDuplicates?: boolean;
      autoCreateMissingRoles?: boolean;
      autoCreateMissingLocations?: boolean;
      defaultProjectPriority?: number;
      dateFormat?: string;
    } = {}) => {
      const formData = new FormData();
      formData.append('excelFile', file);
      formData.append('clearExisting', (options.clearExisting || false).toString());
      formData.append('useV2', (options.useV2 !== undefined ? options.useV2 : true).toString());
      if (options.validateDuplicates !== undefined) {
        formData.append('validateDuplicates', options.validateDuplicates.toString());
      }
      if (options.autoCreateMissingRoles !== undefined) {
        formData.append('autoCreateMissingRoles', options.autoCreateMissingRoles.toString());
      }
      if (options.autoCreateMissingLocations !== undefined) {
        formData.append('autoCreateMissingLocations', options.autoCreateMissingLocations.toString());
      }
      if (options.defaultProjectPriority !== undefined) {
        formData.append('defaultProjectPriority', options.defaultProjectPriority.toString());
      }
      if (options.dateFormat) {
        formData.append('dateFormat', options.dateFormat);
      }
      return apiClient.post('/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    validateFile: (file: File) => {
      const formData = new FormData();
      formData.append('excelFile', file);
      return apiClient.post('/import/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    getSettings: () => apiClient.get('/import/settings'),
    getTemplate: () => apiClient.get('/import/template', {
      responseType: 'blob',
    }),
    getHistory: () => apiClient.get('/import/history'),
    analyzeImport: (file: File, options: {
      clearExisting?: boolean;
      useV2?: boolean;
      validateDuplicates?: boolean;
      autoCreateMissingRoles?: boolean;
      autoCreateMissingLocations?: boolean;
      defaultProjectPriority?: number;
      dateFormat?: string;
    } = {}) => {
      const formData = new FormData();
      formData.append('excelFile', file);
      formData.append('clearExisting', (options.clearExisting || false).toString());
      formData.append('useV2', (options.useV2 !== undefined ? options.useV2 : true).toString());
      if (options.validateDuplicates !== undefined) {
        formData.append('validateDuplicates', options.validateDuplicates.toString());
      }
      if (options.autoCreateMissingRoles !== undefined) {
        formData.append('autoCreateMissingRoles', options.autoCreateMissingRoles.toString());
      }
      if (options.autoCreateMissingLocations !== undefined) {
        formData.append('autoCreateMissingLocations', options.autoCreateMissingLocations.toString());
      }
      if (options.defaultProjectPriority !== undefined) {
        formData.append('defaultProjectPriority', options.defaultProjectPriority.toString());
      }
      if (options.dateFormat) {
        formData.append('dateFormat', options.dateFormat);
      }
      return apiClient.post('/import/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    exportScenario: (scenarioId: string, options: {
      includeAssignments?: boolean;
      includePhases?: boolean;
    } = {}) => {
      const params = new URLSearchParams({
        scenarioId,
        includeAssignments: (options.includeAssignments !== false).toString(),
        includePhases: (options.includePhases !== false).toString(),
      });
      return apiClient.get(`/import/export/scenario?${params.toString()}`, {
        responseType: 'blob',
      });
    },
    exportTemplate: (options: {
      templateType?: string;
      includeAssignments?: boolean;
      includePhases?: boolean;
    } = {}) => {
      const params = new URLSearchParams({
        templateType: options.templateType || 'complete',
        includeAssignments: (options.includeAssignments !== false).toString(),
        includePhases: (options.includePhases !== false).toString(),
      });
      return apiClient.get(`/import/template?${params.toString()}`, {
        responseType: 'blob',
      });
    },
  },

  // Export
  export: {
    reportAsExcel: (reportType: string, filters?: ExportReportFilters) =>
      apiClient.post('/export/reports/excel', { reportType, filters }, {
        responseType: 'blob',
      }),
    reportAsCSV: (reportType: string, filters?: ExportReportFilters) =>
      apiClient.post('/export/reports/csv', { reportType, filters }, {
        responseType: 'blob',
      }),
    reportAsPDF: (reportType: string, filters?: ExportReportFilters) =>
      apiClient.post('/export/reports/pdf', { reportType, filters }, {
        responseType: 'blob',
      }),
  },

  // Simple endpoints
  locations: {
    list: () => apiClient.get('/locations'),
    get: (id: string) => apiClient.get(`/locations/${id}`),
    create: (data: LocationCreateRequest) => apiClient.post('/locations', data),
    update: (id: string, data: LocationUpdateRequest) => apiClient.put(`/locations/${id}`, data),
    delete: (id: string) => apiClient.delete(`/locations/${id}`),
  },

  projectTypes: {
    list: () => apiClient.get('/project-types'),
    get: (id: string) => apiClient.get(`/project-types/${id}`),
    create: (data: ProjectTypeCreateRequest) => apiClient.post('/project-types', data),
    update: (id: string, data: ProjectTypeUpdateRequest) => apiClient.put(`/project-types/${id}`, data),
    delete: (id: string) => apiClient.delete(`/project-types/${id}`),
    // Hierarchy methods
    getHierarchy: () => apiClient.get('/project-type-hierarchy/hierarchy'),
    getPhases: (id: string) => apiClient.get(`/project-type-hierarchy/${id}/phases`),
    createSubType: (parentId: string, data: ProjectSubTypeCreateRequest) => apiClient.post(`/project-type-hierarchy/${parentId}/children`, data),
    addPhase: (id: string, data: PhaseCreateRequest) => apiClient.post(`/project-type-hierarchy/${id}/phases`, data),
    updatePhase: (id: string, phaseId: string, data: PhaseUpdateRequest) => apiClient.put(`/project-type-hierarchy/${id}/phases/${phaseId}`, data),
    removePhase: (id: string, phaseId: string) => apiClient.delete(`/project-type-hierarchy/${id}/phases/${phaseId}`),
    updateHierarchy: (id: string, data: ProjectTypeHierarchyUpdateRequest) => apiClient.put(`/project-type-hierarchy/${id}/hierarchy`, data),
  },

  phases: {
    list: () => apiClient.get('/phases'),
    get: (id: string) => apiClient.get(`/phases/${id}`),
    create: (data: PhaseCreateRequest) => apiClient.post('/phases', data),
    update: (id: string, data: PhaseUpdateRequest) => apiClient.put(`/phases/${id}`, data),
    delete: (id: string) => apiClient.delete(`/phases/${id}`),
  },

  projectPhases: {
    list: (params?: ProjectPhaseListParams) => apiClient.get('/project-phases', { params }),
    get: (id: string) => apiClient.get(`/project-phases/${id}`),
    create: (data: ProjectPhaseCreateRequest) => apiClient.post('/project-phases', data),
    update: (id: string, data: Partial<ProjectPhaseCreateRequest>) => apiClient.put(`/project-phases/${id}`, data),
    delete: (id: string) => apiClient.delete(`/project-phases/${id}`),
    bulkUpdate: (data: BulkProjectPhaseRequest) => apiClient.post('/project-phases/bulk', data),
    duplicatePhase: (data: DuplicatePhaseRequest) => apiClient.post('/project-phases/duplicate', data),
    createCustomPhase: (data: CustomProjectPhaseRequest) => apiClient.post('/project-phases/create-custom', data),
    applyBulkCorrections: (data: BulkPhaseCorrectionsRequest) => apiClient.post('/project-phases/bulk-corrections', data),
  },

  // Project Phase Dependencies
  projectPhaseDependencies: {
    list: (params?: PhaseDependencyListParams) => apiClient.get('/project-phase-dependencies', { params }),
    get: (id: string) => apiClient.get(`/project-phase-dependencies/${id}`),
    create: (data: PhaseDependencyCreateRequest) => apiClient.post('/project-phase-dependencies', data),
    update: (id: string, data: PhaseDependencyUpdateRequest) => apiClient.put(`/project-phase-dependencies/${id}`, data),
    delete: (id: string) => apiClient.delete(`/project-phase-dependencies/${id}`),
    calculateCascade: (data: CascadeCalculateRequest) => apiClient.post('/project-phase-dependencies/calculate-cascade', data),
    applyCascade: (data: CascadeApplyRequest) => apiClient.post('/project-phase-dependencies/apply-cascade', data),
  },

  projectAllocations: {
    get: (projectId: string) => apiClient.get(`/project-allocations/${projectId}`),
    initialize: (projectId: string) => apiClient.post(`/project-allocations/${projectId}/initialize`),
    override: (projectId: string, data: AllocationOverrideRequest) => apiClient.post(`/project-allocations/${projectId}/override`, data),
    reset: (projectId: string, phaseId: string, roleId: string) => apiClient.post(`/project-allocations/${projectId}/reset/${phaseId}/${roleId}`),
    delete: (projectId: string, phaseId: string, roleId: string) => apiClient.delete(`/project-allocations/${projectId}/${phaseId}/${roleId}`),
  },

  // Scenarios
  scenarios: {
    list: () => apiClient.get('/scenarios'),
    get: (id: string) => apiClient.get(`/scenarios/${id}`),
    create: (data: ScenarioCreateRequest) => apiClient.post('/scenarios', data),
    update: (id: string, data: ScenarioUpdateRequest) => apiClient.put(`/scenarios/${id}`, data),
    delete: (id: string) => apiClient.delete(`/scenarios/${id}`),
    getAssignments: (id: string) => apiClient.get(`/scenarios/${id}/assignments`),
    upsertAssignment: (id: string, data: ScenarioAssignmentRequest) => apiClient.post(`/scenarios/${id}/assignments`, data),
    removeAssignment: (id: string, assignmentId: string) => apiClient.delete(`/scenarios/${id}/assignments/${assignmentId}`),
    compare: (id: string, compareToId: string) => apiClient.get(`/scenarios/${id}/compare?compare_to=${compareToId}`),
    merge: (id: string, data?: ScenarioMergeRequest) => apiClient.post(`/scenarios/${id}/merge`, data || {}),
  },

  // Audit
  audit: {
    getHistory: (tableName: string, recordId: string, limit?: number) =>
      apiClient.get(`/audit/history/${tableName}/${recordId}`, { params: { limit } }),
    getRecentChanges: (changedBy?: string, limit?: number, offset?: number) =>
      apiClient.get('/audit/recent', { params: { changedBy, limit, offset } }),
    searchAuditLog: (filters: AuditSearchParams) =>
      apiClient.get('/audit/search', { params: filters }),
    getStats: () => apiClient.get('/audit/stats'),
    undoLastChange: (tableName: string, recordId: string, comment?: string) =>
      apiClient.post(`/audit/undo/${tableName}/${recordId}`, { comment } satisfies UndoRequest),
    undoLastNChanges: (changedBy: string, count: number, comment?: string) =>
      apiClient.post(`/audit/undo-batch/${changedBy}/${count}`, { comment } satisfies UndoRequest),
    cleanupExpiredEntries: () => apiClient.post('/audit/cleanup'),
  },

  // Settings
  settings: {
    getSystemSettings: () => apiClient.get('/settings/system'),
    saveSystemSettings: (data: SystemSettingsRequest) => apiClient.post('/settings/system', data),
    updateSystemSettings: (data: SystemSettingsRequest) => apiClient.put('/settings/system', data),
    getImportSettings: () => apiClient.get('/settings/import'),
    saveImportSettings: (data: ImportSettingsRequest) => apiClient.post('/settings/import', data),
    updateImportSettings: (data: ImportSettingsRequest) => apiClient.put('/settings/import', data),
  },

  // User Permissions
  userPermissions: {
    getSystemPermissions: () => apiClient.get('/user-permissions/permissions'),
    getUserRoles: () => apiClient.get('/user-permissions/roles'),
    getRolePermissions: (roleId: string) => apiClient.get(`/user-permissions/roles/${roleId}/permissions`),
    updateRolePermissions: (roleId: string, permissionIds: string[]) => apiClient.put(`/user-permissions/roles/${roleId}/permissions`, { permissionIds }),
    getUsersList: () => apiClient.get('/user-permissions/users'),
    getUserPermissions: (userId: string) => apiClient.get(`/user-permissions/users/${userId}/permissions`),
    updateUserRole: (userId: string, roleId: string) => apiClient.put(`/user-permissions/users/${userId}/role`, { roleId }),
    updateUserPermission: (userId: string, permissionId: string, granted: boolean, reason?: string) =>
      apiClient.put(`/user-permissions/users/${userId}/permissions`, { permissionId, granted, reason }),
    removeUserPermissionOverride: (userId: string, permissionId: string) =>
      apiClient.delete(`/user-permissions/users/${userId}/permissions/${permissionId}`),
    checkUserPermission: (userId: string, permissionName: string) =>
      apiClient.get(`/user-permissions/users/${userId}/check/${permissionName}`),
  },

  // Notifications
  notifications: {
    sendNotification: (data: SendNotificationRequest) => apiClient.post('/notifications/send', data),
    getUserNotificationPreferences: (userId: string) => apiClient.get(`/notifications/preferences/${userId}`),
    updateUserNotificationPreferences: (userId: string, preferences: NotificationPreferencesRequest) => apiClient.put(`/notifications/preferences/${userId}`, { preferences }),
    getEmailTemplates: () => apiClient.get('/notifications/templates'),
    getNotificationHistory: (userId?: string, params?: NotificationHistoryParams) => apiClient.get(`/notifications/history/${userId || ''}`, { params }),
    sendTestEmail: (email: string) => apiClient.post('/notifications/test', { email }),
    checkEmailConfiguration: () => apiClient.get('/notifications/config'),
    getNotificationStats: (userId?: string, params?: NotificationStatsParams) => apiClient.get(`/notifications/stats/${userId || ''}`, { params }),
  },

  // Recommendations
  recommendations: {
    list: (params?: RecommendationListParams) => apiClient.get('/recommendations', { params }),
    execute: (recommendationId: string, actions: ExecuteRecommendationRequest) => apiClient.post(`/recommendations/${recommendationId}/execute`, actions),
  },

  // Health check
  health: () => apiClient.get('/health'),

  // Authentication
  auth: {
    login: (personId: string) => apiClient.post('/auth/login', { personId }),
    logout: () => apiClient.post('/auth/logout'),
    refresh: (refreshToken: string) => apiClient.post('/auth/refresh', { refreshToken }),
    me: () => apiClient.get('/auth/me'),
    verify: () => apiClient.get('/auth/verify'),
  },
};
