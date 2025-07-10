# Role Planners Design

## Overview
Each role can have multiple authorized planners who are responsible for capacity planning and resource allocation for that specific role. This distributes the planning responsibility and provides backup coverage.

## Key Concepts

### 1. Multiple Planners per Role
- Each role can have several planners
- One planner can be designated as primary
- Planners can have different permission levels

### 2. Role Planner Permissions
- `is_primary`: Main point of contact for the role
- `can_allocate_resources`: Assign people with this role to projects
- `can_approve_assignments`: Approve/reject assignment requests
- `can_modify_standard_allocations`: Change template allocations

### 3. Collaboration Model
```
Role: "Senior Developer"
├── Primary Planner: John Smith (Tech Lead)
│   └── All permissions
├── Secondary Planner: Jane Doe (Senior Manager)
│   └── Can allocate and approve
└── Backup Planner: Bob Johnson (Team Lead)
    └── Can allocate only
```

## Database Schema

### role_planners Table
```sql
CREATE TABLE role_planners (
  id UUID PRIMARY KEY,
  role_id UUID REFERENCES roles(id),
  person_id UUID REFERENCES people(id),
  is_primary BOOLEAN DEFAULT false,
  can_allocate_resources BOOLEAN DEFAULT true,
  can_approve_assignments BOOLEAN DEFAULT true,
  can_modify_standard_allocations BOOLEAN DEFAULT false,
  notes TEXT,
  assigned_at TIMESTAMP,
  assigned_by UUID REFERENCES people(id),
  UNIQUE(role_id, person_id)
);
```

## Use Cases

### 1. Primary and Backup Planners
```
Tech Lead (Primary) goes on vacation
    ↓
Senior Manager (Secondary) handles urgent requests
    ↓
All capacity planning continues smoothly
```

### 2. Specialized Permissions
```
Role: "Data Scientist"

Primary Planner (Head of Data):
- Can modify standard allocations
- Strategic planning

Secondary Planner (Team Lead):
- Can allocate resources
- Day-to-day management

HR Partner:
- Can view capacity
- Cannot make changes
```

### 3. Cross-Team Collaboration
```
Role: "Full Stack Developer"

Frontend Team Lead:
- Planner for frontend projects

Backend Team Lead:
- Planner for backend projects

Both can allocate the same pool of full stack developers
```

## Permission Matrix for Role Planners

| Action | Primary Planner | Secondary Planner | Viewer |
|--------|----------------|-------------------|---------|
| View role capacity | ✓ | ✓ | ✓ |
| Allocate resources | ✓ | If enabled | ✗ |
| Approve assignments | ✓ | If enabled | ✗ |
| Modify standard allocations | If enabled | If enabled | ✗ |
| Add/remove other planners | ✓ | ✗ | ✗ |
| View all people with role | ✓ | ✓ | ✓ |

## Workflow Examples

### Resource Allocation Flow
```
1. Project needs 2 Senior Developers
   ↓
2. Project planner requests from role planners
   ↓
3. Any role planner with can_allocate_resources can:
   - Review available capacity
   - Select best-fit developers
   - Create assignments
   ↓
4. Change logged to role_planning_audit
```

### Standard Allocation Update
```
1. Technology shift requires more testing time
   ↓
2. Primary planner with can_modify_standard_allocations:
   - Updates standard allocation for QA Engineer
   - From 20% to 30% during testing phase
   ↓
3. All future projects automatically get new allocation
   ↓
4. Existing projects can optionally update
```

## Benefits of Multiple Planners

1. **Redundancy**: No single point of failure
2. **Scalability**: Distribute workload across planners
3. **Expertise**: Different planners for different contexts
4. **Timezone Coverage**: Global teams have local planners
5. **Succession Planning**: Easy handover process

## Integration with Project Planning

```
Project Planner wants to add developers
           ↓
    Sees available roles
           ↓
Requests from Role Planners
           ↓
Role Planner allocates resources
           ↓
Project Planner assigns to tasks
```

## Audit Trail

All role planning actions are logged:
```json
{
  "role_id": "senior-dev-role",
  "changed_by": "planner-123",
  "change_type": "RESOURCE_ALLOCATED",
  "new_value": {
    "person": "John Doe",
    "project": "CRM Update",
    "allocation": "75%",
    "duration": "3 months"
  },
  "comment": "Best React expertise for this project",
  "changed_at": "2024-01-15T10:30:00Z"
}
```

## Reports for Role Planners

1. **Capacity Dashboard**
   - Current utilization by person
   - Upcoming availability
   - Overallocation warnings

2. **Demand Forecast**
   - Upcoming project needs
   - Gap analysis
   - Hiring recommendations

3. **Assignment History**
   - Who allocated whom
   - Success metrics
   - Lessons learned