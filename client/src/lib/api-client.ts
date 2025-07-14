import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token (when implemented)
apiClient.interceptors.request.use((config) => {
  // TODO: Add auth token when authentication is implemented
  // const token = localStorage.getItem('auth_token');
  // if (token) {
  //   config.headers.Authorization = `Bearer ${token}`;
  // }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // TODO: Handle unauthorized
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Type-safe API endpoints
export const api = {
  // Projects
  projects: {
    list: (params?: any) => apiClient.get('/projects', { params }),
    get: (id: string) => apiClient.get(`/projects/${id}`),
    create: (data: any) => apiClient.post('/projects', data),
    update: (id: string, data: any) => apiClient.put(`/projects/${id}`, data),
    delete: (id: string) => apiClient.delete(`/projects/${id}`),
    getDemands: (id: string) => apiClient.get(`/projects/${id}/demands`),
    getHealth: () => apiClient.get('/projects/dashboard/health'),
  },

  // People
  people: {
    list: (params?: any) => apiClient.get('/people', { params }),
    get: (id: string) => apiClient.get(`/people/${id}`),
    create: (data: any) => apiClient.post('/people', data),
    update: (id: string, data: any) => apiClient.put(`/people/${id}`, data),
    delete: (id: string) => apiClient.delete(`/people/${id}`),
    addRole: (id: string, data: any) => apiClient.post(`/people/${id}/roles`, data),
    removeRole: (id: string, roleId: string) => apiClient.delete(`/people/${id}/roles/${roleId}`),
    getUtilization: () => apiClient.get('/people/dashboard/utilization'),
    getAvailability: () => apiClient.get('/people/dashboard/availability'),
  },

  // Roles
  roles: {
    list: (params?: any) => apiClient.get('/roles', { params }),
    get: (id: string) => apiClient.get(`/roles/${id}`),
    create: (data: any) => apiClient.post('/roles', data),
    update: (id: string, data: any) => apiClient.put(`/roles/${id}`, data),
    delete: (id: string) => apiClient.delete(`/roles/${id}`),
    addPlanner: (id: string, data: any) => apiClient.post(`/roles/${id}/planners`, data),
    removePlanner: (id: string, plannerId: string) => apiClient.delete(`/roles/${id}/planners/${plannerId}`),
    getCapacityGaps: () => apiClient.get('/roles/dashboard/capacity-gaps'),
  },

  // Assignments
  assignments: {
    list: (params?: any) => apiClient.get('/assignments', { params }),
    create: (data: any) => apiClient.post('/assignments', data),
    update: (id: string, data: any) => apiClient.put(`/assignments/${id}`, data),
    delete: (id: string) => apiClient.delete(`/assignments/${id}`),
    bulkCreate: (data: any) => apiClient.post('/assignments/bulk', data),
    getConflicts: (personId: string, params?: any) => apiClient.get(`/assignments/conflicts/${personId}`, { params }),
    getSuggestions: (params: any) => apiClient.get('/assignments/suggestions', { params }),
    getTimeline: (personId: string, params?: any) => apiClient.get(`/assignments/timeline/${personId}`, { params }),
  },

  // Resource Templates
  resourceTemplates: {
    list: (params?: any) => apiClient.get('/resource-templates', { params }),
    create: (data: any) => apiClient.post('/resource-templates', data),
    bulkUpdate: (data: any) => apiClient.post('/resource-templates/bulk', data),
    copy: (data: any) => apiClient.post('/resource-templates/copy', data),
    getTemplates: () => apiClient.get('/resource-templates/templates'),
    getSummary: () => apiClient.get('/resource-templates/summary'),
    getByProjectType: (projectTypeId: string) => apiClient.get(`/resource-templates/project-type/${projectTypeId}`),
  },

  // Availability
  availability: {
    list: (params?: any) => apiClient.get('/availability', { params }),
    create: (data: any) => apiClient.post('/availability', data),
    bulkCreate: (data: any) => apiClient.post('/availability/bulk', data),
    approve: (id: string, data: any) => apiClient.post(`/availability/${id}/approve`, data),
    getCalendar: (params?: any) => apiClient.get('/availability/calendar', { params }),
    getForecast: (params?: any) => apiClient.get('/availability/forecast', { params }),
  },

  // Demands
  demands: {
    getProjectDemands: (projectId: string) => apiClient.get(`/demands/project/${projectId}`),
    getSummary: (params?: any) => apiClient.get('/demands/summary', { params }),
    createOverride: (data: any) => apiClient.post('/demands/override', data),
    deleteOverride: (id: string) => apiClient.delete(`/demands/override/${id}`),
    getForecast: (params?: any) => apiClient.get('/demands/forecast', { params }),
    getGaps: () => apiClient.get('/demands/gaps'),
    calculateScenario: (data: any) => apiClient.post('/demands/scenario', data),
  },

  // Reporting
  reporting: {
    getDashboard: () => apiClient.get('/reporting/dashboard'),
    getCapacity: (params?: any) => apiClient.get('/reporting/capacity', { params }),
    getProjects: (params?: any) => apiClient.get('/reporting/projects', { params }),
    getTimeline: (params?: any) => apiClient.get('/reporting/timeline', { params }),
  },

  // Import
  import: {
    uploadExcel: (file: File, clearExisting: boolean = false, useV2: boolean = true) => {
      const formData = new FormData();
      formData.append('excelFile', file);
      formData.append('clearExisting', clearExisting.toString());
      formData.append('useV2', useV2.toString());
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
    getTemplate: () => apiClient.get('/import/template'),
    getHistory: () => apiClient.get('/import/history'),
  },

  // Simple endpoints
  locations: {
    list: () => apiClient.get('/locations'),
    get: (id: string) => apiClient.get(`/locations/${id}`),
    create: (data: any) => apiClient.post('/locations', data),
    update: (id: string, data: any) => apiClient.put(`/locations/${id}`, data),
    delete: (id: string) => apiClient.delete(`/locations/${id}`),
  },

  projectTypes: {
    list: () => apiClient.get('/project-types'),
    get: (id: string) => apiClient.get(`/project-types/${id}`),
    create: (data: any) => apiClient.post('/project-types', data),
    update: (id: string, data: any) => apiClient.put(`/project-types/${id}`, data),
    delete: (id: string) => apiClient.delete(`/project-types/${id}`),
    // Hierarchy methods
    getHierarchy: () => apiClient.get('/project-type-hierarchy/hierarchy'),
    getPhases: (id: string) => apiClient.get(`/project-type-hierarchy/${id}/phases`),
    createChild: (parentId: string, data: any) => apiClient.post(`/project-type-hierarchy/${parentId}/children`, data),
    addPhase: (id: string, data: any) => apiClient.post(`/project-type-hierarchy/${id}/phases`, data),
    removePhase: (id: string, phaseId: string) => apiClient.delete(`/project-type-hierarchy/${id}/phases/${phaseId}`),
    updateHierarchy: (id: string, data: any) => apiClient.put(`/project-type-hierarchy/${id}/hierarchy`, data),
  },

  phases: {
    list: () => apiClient.get('/phases'),
    get: (id: string) => apiClient.get(`/phases/${id}`),
    create: (data: any) => apiClient.post('/phases', data),
    update: (id: string, data: any) => apiClient.put(`/phases/${id}`, data),
    delete: (id: string) => apiClient.delete(`/phases/${id}`),
  },

  projectPhases: {
    list: (params?: any) => apiClient.get('/project-phases', { params }),
    get: (id: string) => apiClient.get(`/project-phases/${id}`),
    create: (data: any) => apiClient.post('/project-phases', data),
    update: (id: string, data: any) => apiClient.put(`/project-phases/${id}`, data),
    delete: (id: string) => apiClient.delete(`/project-phases/${id}`),
    bulkUpdate: (data: any) => apiClient.post('/project-phases/bulk', data),
    duplicatePhase: (data: any) => apiClient.post('/project-phases/duplicate', data),
    createCustomPhase: (data: any) => apiClient.post('/project-phases/create-custom', data),
  },

  projectAllocations: {
    get: (projectId: string) => apiClient.get(`/project-allocations/${projectId}`),
    initialize: (projectId: string) => apiClient.post(`/project-allocations/${projectId}/initialize`),
    override: (projectId: string, data: any) => apiClient.post(`/project-allocations/${projectId}/override`, data),
    reset: (projectId: string, phaseId: string, roleId: string) => apiClient.post(`/project-allocations/${projectId}/reset/${phaseId}/${roleId}`),
    delete: (projectId: string, phaseId: string, roleId: string) => apiClient.delete(`/project-allocations/${projectId}/${phaseId}/${roleId}`),
  },

  // Scenarios
  scenarios: {
    list: () => apiClient.get('/scenarios'),
    get: (id: string) => apiClient.get(`/scenarios/${id}`),
    create: (data: any) => apiClient.post('/scenarios', data),
    update: (id: string, data: any) => apiClient.put(`/scenarios/${id}`, data),
    delete: (id: string) => apiClient.delete(`/scenarios/${id}`),
    getAssignments: (id: string) => apiClient.get(`/scenarios/${id}/assignments`),
    upsertAssignment: (id: string, data: any) => apiClient.post(`/scenarios/${id}/assignments`, data),
    removeAssignment: (id: string, assignmentId: string) => apiClient.delete(`/scenarios/${id}/assignments/${assignmentId}`),
    compare: (id: string, compareToId: string) => apiClient.get(`/scenarios/${id}/compare?compare_to=${compareToId}`),
    merge: (id: string, data?: any) => apiClient.post(`/scenarios/${id}/merge`, data || {}),
  },

  // Health check
  health: () => apiClient.get('/health'),
};