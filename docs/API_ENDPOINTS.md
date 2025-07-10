# Capacinator API Endpoints

## Base URL
- Development: `http://localhost:3456/api`
- Production: Configure in environment

## Authentication
- Currently no authentication implemented
- TODO: Add JWT authentication

## Core Endpoints

### Projects
- `GET /api/projects` - List all projects with pagination
- `GET /api/projects/:id` - Get project details with phases, assignments, planners
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/demands` - Get project demand calculations
- `GET /api/projects/dashboard/health` - Get project health dashboard

### People
- `GET /api/people` - List all people with roles and supervisors
- `GET /api/people/:id` - Get person details with roles, assignments, availability
- `POST /api/people` - Create new person
- `PUT /api/people/:id` - Update person
- `DELETE /api/people/:id` - Delete person
- `POST /api/people/:id/roles` - Add role to person
- `DELETE /api/people/:id/roles/:roleId` - Remove role from person
- `GET /api/people/dashboard/utilization` - Get utilization dashboard
- `GET /api/people/dashboard/availability` - Get availability dashboard

### Roles
- `GET /api/roles` - List all roles
- `GET /api/roles/:id` - Get role details with people, planners, allocations
- `POST /api/roles` - Create new role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role
- `POST /api/roles/:id/planners` - Add role planner
- `DELETE /api/roles/:id/planners/:plannerId` - Remove role planner
- `GET /api/roles/dashboard/capacity-gaps` - Get capacity gaps analysis

### Standard Allocations
- `GET /api/allocations` - List all standard allocations
- `POST /api/allocations` - Create new allocation
- `POST /api/allocations/bulk` - Bulk update allocations
- `POST /api/allocations/copy` - Copy allocations between project types
- `GET /api/allocations/templates` - Get allocation templates
- `GET /api/allocations/summary` - Get allocation summary statistics
- `GET /api/allocations/project-type/:id` - Get allocations by project type

### Project Assignments
- `GET /api/assignments` - List all assignments with filters
- `POST /api/assignments` - Create assignment (with conflict checking)
- `POST /api/assignments/bulk` - Bulk assign resources
- `GET /api/assignments/conflicts/:person_id` - Check person's conflicts
- `GET /api/assignments/suggestions` - Get assignment suggestions for a role
- `GET /api/assignments/timeline/:person_id` - Get person's assignment timeline

### Availability Management
- `GET /api/availability` - List availability overrides
- `POST /api/availability` - Create availability override
- `POST /api/availability/bulk` - Bulk create overrides (e.g., holidays)
- `POST /api/availability/:id/approve` - Approve/reject availability override
- `GET /api/availability/calendar` - Get team availability calendar
- `GET /api/availability/forecast` - Get availability forecast

### Demand Planning
- `GET /api/demands/project/:id` - Get project demands
- `GET /api/demands/summary` - Get demand summary by filters
- `POST /api/demands/override` - Create demand override
- `DELETE /api/demands/override/:id` - Delete demand override
- `GET /api/demands/forecast` - Get demand forecast
- `GET /api/demands/gaps` - Get demand vs capacity gaps
- `POST /api/demands/scenario` - Calculate what-if scenario

### Reporting
- `GET /api/reporting/dashboard` - Main dashboard metrics
- `GET /api/reporting/capacity` - Capacity analysis report
- `GET /api/reporting/projects` - Project status report
- `GET /api/reporting/timeline` - Project timeline report

### Import/Export
- `POST /api/import/excel` - Import data from Excel
- `POST /api/import/validate` - Validate Excel file
- `GET /api/import/template` - Get import template format
- `GET /api/import/history` - Get import history

### Simple CRUD Endpoints
- **Locations**: `/api/locations` - Basic CRUD
- **Project Types**: `/api/project-types` - Basic CRUD
- **Phases**: `/api/phases` - Basic CRUD

## Query Parameters

### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)

### Common Filters
- `start_date` - Filter by date range start
- `end_date` - Filter by date range end
- `location_id` - Filter by location
- `project_type_id` - Filter by project type

## Response Format

### Success Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Additional error details (dev mode only)"
}
```

## Bulk Operations

### Assignments
```json
POST /api/assignments/bulk
{
  "project_id": "uuid",
  "assignments": [
    {
      "person_id": "uuid",
      "role_id": "uuid",
      "allocation_percentage": 50,
      "start_date": "2024-01-01",
      "end_date": "2024-03-31"
    }
  ]
}
```

### Availability
```json
POST /api/availability/bulk
{
  "apply_to_all": true,
  "overrides": [
    {
      "start_date": "2024-12-25",
      "end_date": "2024-12-26",
      "availability_percentage": 0,
      "override_type": "holiday",
      "reason": "Christmas Holiday"
    }
  ]
}
```

## What-If Scenarios
```json
POST /api/demands/scenario
{
  "scenario": {
    "new_projects": [...],
    "remove_projects": ["uuid1", "uuid2"],
    "delay_projects": [
      {
        "project_id": "uuid",
        "delay_days": 30
      }
    ]
  }
}
```

## Health Check
- `GET /api/health` - Server health status

## Status
- `GET /api/status` - API status and version