# Project Planners Authorization Design

## Overview
Each project has designated planners who are authorized to make planning decisions. This ensures accountability and prevents unauthorized changes to project plans.

## Core Concepts

### 1. Permission Levels
- **OWNER**: Full control over the project
- **PLANNER**: Can modify planning aspects
- **VIEWER**: Read-only access to project data

### 2. Granular Permissions
Each planner can have specific permissions:
- `can_modify_type`: Change project type
- `can_modify_roadmap`: Add/modify/remove phases
- `can_add_overrides`: Create demand overrides
- `can_assign_resources`: Assign people to the project
- `is_primary_planner`: Main point of contact

### 3. Audit Trail
All planning changes are logged for accountability:
- Who made the change
- What was changed
- When it was changed
- Old and new values
- Optional comment

## Database Schema

### project_planners Table
```sql
CREATE TABLE project_planners (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  person_id UUID REFERENCES people(id),
  permission_level ENUM('VIEWER', 'PLANNER', 'OWNER'),
  can_modify_type BOOLEAN DEFAULT true,
  can_modify_roadmap BOOLEAN DEFAULT true,
  can_add_overrides BOOLEAN DEFAULT true,
  can_assign_resources BOOLEAN DEFAULT false,
  is_primary_planner BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP,
  assigned_by UUID REFERENCES people(id),
  UNIQUE(project_id, person_id)
);
```

### project_planning_audit Table
```sql
CREATE TABLE project_planning_audit (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  changed_by UUID REFERENCES people(id),
  change_type ENUM(...),
  old_value JSON,
  new_value JSON,
  comment TEXT,
  changed_at TIMESTAMP
);
```

## Use Cases

### 1. Project Creation
```
User creates new project
    ↓
User automatically becomes OWNER
    ↓
Owner can add additional planners
```

### 2. Adding Planners
```
Project Owner wants to delegate planning
    ↓
Adds "Jane Doe" as PLANNER with:
  - can_modify_roadmap = true
  - can_add_overrides = true
  - can_assign_resources = false
    ↓
Jane can now modify phases and add overrides
but cannot assign people to the project
```

### 3. Permission Check Flow
```
User attempts to modify project roadmap
    ↓
System checks project_planners table
    ↓
IF user has can_modify_roadmap = true
  THEN allow change and log to audit
ELSE deny with "Insufficient permissions"
```

### 4. Audit Example
```json
{
  "project_id": "proj-123",
  "changed_by": "user-456",
  "change_type": "PHASE_MODIFIED",
  "old_value": {
    "phase_id": "design-phase",
    "start_date": "2024-01-01",
    "end_date": "2024-01-15"
  },
  "new_value": {
    "phase_id": "design-phase",
    "start_date": "2024-01-01",
    "end_date": "2024-01-20"
  },
  "comment": "Extended design phase due to additional requirements",
  "changed_at": "2024-01-05T10:30:00Z"
}
```

## Permission Matrix

| Action | OWNER | PLANNER | VIEWER |
|--------|-------|---------|---------|
| View project details | ✓ | ✓ | ✓ |
| Modify project type | ✓ | If enabled | ✗ |
| Add/modify phases | ✓ | If enabled | ✗ |
| Add demand overrides | ✓ | If enabled | ✗ |
| Assign resources | ✓ | If enabled | ✗ |
| Add/remove planners | ✓ | ✗ | ✗ |
| Delete project | ✓ | ✗ | ✗ |

## Security Considerations

1. **Default Deny**: Users have no access unless explicitly granted
2. **Cascade Delete**: Removing a project removes all planner assignments
3. **Audit Everything**: All changes are logged for compliance
4. **No Orphans**: Projects must have at least one owner

## API Endpoints

### Check Permissions
```
GET /api/projects/:id/permissions
Response: {
  "can_view": true,
  "can_modify_type": false,
  "can_modify_roadmap": true,
  "can_add_overrides": true,
  "can_assign_resources": false,
  "is_owner": false,
  "is_primary_planner": true
}
```

### Add Planner
```
POST /api/projects/:id/planners
Body: {
  "person_id": "user-789",
  "permission_level": "PLANNER",
  "permissions": {
    "can_modify_type": false,
    "can_modify_roadmap": true,
    "can_add_overrides": true,
    "can_assign_resources": false
  }
}
```

### Get Audit Log
```
GET /api/projects/:id/audit?from=2024-01-01&to=2024-01-31
Response: [
  {
    "change_type": "PHASE_ADDED",
    "changed_by": "Jane Doe",
    "changed_at": "2024-01-05T10:00:00Z",
    "new_value": { "phase": "Testing", "duration": "2 weeks" }
  }
]
```

## Benefits

1. **Accountability**: Know who changed what and when
2. **Flexibility**: Granular permissions for different roles
3. **Security**: Prevent unauthorized modifications
4. **Collaboration**: Multiple planners can work together
5. **Compliance**: Full audit trail for regulatory needs

## Future Enhancements

1. **Approval Workflows**: Require approval for certain changes
2. **Time-based Permissions**: Temporary planner access
3. **Template Permissions**: Standard permission sets
4. **Notification System**: Alert planners of changes
5. **Bulk Operations**: Assign multiple planners at once