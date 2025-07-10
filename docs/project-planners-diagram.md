# Project Planners Authorization Diagram

## Entity Relationships with Planners

```
┌─────────────────┐         ┌─────────────────────┐         ┌─────────────────┐
│     PEOPLE      │         │  PROJECT_PLANNERS   │         │    PROJECTS     │
├─────────────────┤         ├─────────────────────┤         ├─────────────────┤
│ • id (PK)       │◄────────│ • id (PK)           │────────►│ • id (PK)       │
│ • name          │         │ • project_id (FK)   │         │ • name          │
│ • email         │         │ • person_id (FK)    │         │ • owner_id (FK) │◄─┐
│ • primary_role  │         │ • permission_level  │         │ • project_type  │  │
│ • worker_type   │         │ • can_modify_type   │         │ • location      │  │
└─────────────────┘         │ • can_modify_roadmap│         │ • priority      │  │
         ▲                  │ • can_add_overrides │         └─────────────────┘  │
         │                  │ • can_assign_resources         │                   │
         │                  │ • is_primary_planner│         │ Project Owner     │
         │                  │ • assigned_by (FK)  │◄────────┘                   │
         │                  └─────────────────────┘                              │
         │                                                                        │
         └────────────────────────────────────────────────────────────────────────┘
```

## Permission Flow

```
                           ┌──────────────────┐
                           │ User Attempts    │
                           │ Project Change   │
                           └────────┬─────────┘
                                    ▼
                        ┌───────────────────────┐
                        │ Check PROJECT_PLANNERS│
                        │ for user + project    │
                        └───────────┬───────────┘
                                    ▼
                    ┌───────────────┴────────────────┐
                    │          Found?                 │
                    └───────┬────────────┬───────────┘
                           YES           NO
                            ▼             ▼
                ┌────────────────┐   ┌─────────┐
                │Check Permission│   │  DENY   │
                │  for Action    │   └─────────┘
                └───────┬────────┘
                        ▼
            ┌───────────┴────────────┐
            │   Permission Granted?   │
            └────┬────────────┬──────┘
                YES           NO
                 ▼             ▼
        ┌─────────────┐   ┌─────────┐
        │   ALLOW     │   │  DENY   │
        │   + LOG     │   └─────────┘
        └─────────────┘
                 ▼
    ┌────────────────────────┐
    │ PROJECT_PLANNING_AUDIT │
    ├────────────────────────┤
    │ • project_id           │
    │ • changed_by           │
    │ • change_type          │
    │ • old_value            │
    │ • new_value            │
    │ • comment              │
    │ • changed_at           │
    └────────────────────────┘
```

## Planner Hierarchy

```
Project: "New CRM System"
│
├── OWNER: John Smith
│   └── All permissions
│
├── PRIMARY PLANNER: Jane Doe
│   ├── can_modify_type: ✓
│   ├── can_modify_roadmap: ✓
│   ├── can_add_overrides: ✓
│   └── can_assign_resources: ✓
│
├── PLANNER: Bob Johnson (Demand Specialist)
│   ├── can_modify_type: ✗
│   ├── can_modify_roadmap: ✗
│   ├── can_add_overrides: ✓
│   └── can_assign_resources: ✗
│
└── VIEWER: Sarah Lee (Stakeholder)
    └── Read-only access
```

## Change Types and Audit Trail

```
┌────────────────────────────────────────────────────────────┐
│                    CHANGE TYPES                            │
├────────────────────────────────────────────────────────────┤
│ PROJECT_TYPE_CHANGED      → Requires can_modify_type      │
│ PHASE_ADDED              → Requires can_modify_roadmap    │
│ PHASE_MODIFIED           → Requires can_modify_roadmap    │
│ PHASE_REMOVED            → Requires can_modify_roadmap    │
│ OVERRIDE_ADDED           → Requires can_add_overrides     │
│ OVERRIDE_MODIFIED        → Requires can_add_overrides     │
│ OVERRIDE_REMOVED         → Requires can_add_overrides     │
│ PLANNER_ADDED            → Requires OWNER permission      │
│ PLANNER_REMOVED          → Requires OWNER permission      │
│ PLANNER_PERMISSIONS_CHANGED → Requires OWNER permission   │
└────────────────────────────────────────────────────────────┘
```

## Data Flow Example

```
1. Jane (PRIMARY PLANNER) extends Design phase
   │
   ├── System checks: can_modify_roadmap = ✓
   │
   ├── Updates PROJECT_PHASES_TIMELINE
   │   └── Design phase: Jan 1-15 → Jan 1-20
   │
   └── Logs to PROJECT_PLANNING_AUDIT
       ├── changed_by: Jane's ID
       ├── change_type: PHASE_MODIFIED
       ├── old_value: {"end_date": "2024-01-15"}
       ├── new_value: {"end_date": "2024-01-20"}
       └── comment: "Client requested additional mockups"

2. Bob (DEMAND SPECIALIST) adds override
   │
   ├── System checks: can_add_overrides = ✓
   │
   ├── Inserts into DEMAND_OVERRIDES
   │   └── Sr Developer: 50% for Jan 15-20
   │
   └── Logs to PROJECT_PLANNING_AUDIT
       ├── changed_by: Bob's ID
       ├── change_type: OVERRIDE_ADDED
       └── new_value: {"role": "Sr Dev", "hours": 20}

3. Sarah (VIEWER) attempts to modify phase
   │
   ├── System checks: permission_level = VIEWER
   │
   └── DENIED - "Insufficient permissions"
```

## Security Model

```
┌─────────────────────────────────────────┐
│          Permission Check Logic         │
├─────────────────────────────────────────┤
│ 1. Is user the project owner?          │
│    YES → Allow all actions             │
│    NO → Continue to step 2             │
│                                         │
│ 2. Is user in project_planners?        │
│    NO → Deny all write actions         │
│    YES → Continue to step 3            │
│                                         │
│ 3. Check specific permission flag      │
│    Based on attempted action           │
│                                         │
│ 4. Log all changes to audit table      │
│    For compliance and tracking         │
└─────────────────────────────────────────┘
```