# Role Planners Architecture Diagram

## Multiple Planners per Role

```
┌─────────────────┐         ┌─────────────────────┐         ┌─────────────────┐
│     PEOPLE      │         │   ROLE_PLANNERS     │         │     ROLES       │
├─────────────────┤         ├─────────────────────┤         ├─────────────────┤
│ • id (PK)       │◄────────│ • id (PK)           │────────►│ • id (PK)       │
│ • name          │         │ • role_id (FK)      │         │ • name          │
│ • email         │         │ • person_id (FK)    │         │ • external_id   │
│ • primary_role  │         │ • is_primary        │         │ • description   │
│ • worker_type   │         │ • can_allocate      │         └─────────────────┘
└─────────────────┘         │ • can_approve       │
                            │ • can_modify_std    │
                            │ • assigned_by (FK)  │
                            └─────────────────────┘
```

## Role Planning Hierarchy

```
Role: "Senior Developer"
│
├── PRIMARY PLANNER: John Smith (Tech Lead)
│   ├── can_allocate_resources: ✓
│   ├── can_approve_assignments: ✓
│   ├── can_modify_standard_allocations: ✓
│   └── Authority: Full planning control
│
├── SECONDARY PLANNER: Jane Doe (Engineering Manager)
│   ├── can_allocate_resources: ✓
│   ├── can_approve_assignments: ✓
│   ├── can_modify_standard_allocations: ✗
│   └── Authority: Day-to-day allocation
│
├── BACKUP PLANNER: Bob Johnson (Team Lead)
│   ├── can_allocate_resources: ✓
│   ├── can_approve_assignments: ✗
│   ├── can_modify_standard_allocations: ✗
│   └── Authority: Emergency coverage only
│
└── VIEWER: Sarah Wilson (HR Partner)
    ├── can_allocate_resources: ✗
    ├── can_approve_assignments: ✗
    ├── can_modify_standard_allocations: ✗
    └── Authority: Reporting and visibility
```

## Permission Flow

```
                    ┌────────────────────────────┐
                    │ User Attempts Role Action  │
                    │ (allocate, approve, etc.)  │
                    └─────────────┬──────────────┘
                                  ▼
                    ┌─────────────────────────────┐
                    │ Check ROLE_PLANNERS table   │
                    │ for user + role combination │
                    └─────────────┬───────────────┘
                                  ▼
                      ┌───────────┴────────────┐
                      │    Found as planner?   │
                      └────┬─────────────┬─────┘
                          YES            NO
                           ▼              ▼
               ┌────────────────────┐  ┌─────────┐
               │Check Specific      │  │  DENY   │
               │Permission Flag     │  └─────────┘
               └───────┬────────────┘
                       ▼
           ┌───────────┴────────────┐
           │   Permission Enabled?   │
           └────┬────────────┬──────┘
               YES           NO
                ▼             ▼
       ┌─────────────┐   ┌─────────┐
       │   ALLOW     │   │  DENY   │
       │   + LOG     │   └─────────┘
       └─────────────┘
```

## Multi-Planner Workflow

```
1. Resource Request Comes In
   ┌─────────────────────────────┐
   │ Project needs 2 Sr Devs     │
   │ for 3 months starting Feb 1 │
   └──────────────┬──────────────┘
                  ▼
2. Notification to All Role Planners
   ┌─────────────────────────────┐
   │ Primary: John (immediate)   │
   │ Secondary: Jane (backup)    │
   │ Backup: Bob (if urgent)     │
   └──────────────┬──────────────┘
                  ▼
3. First Available Planner Responds
   ┌─────────────────────────────┐
   │ Jane reviews capacity and   │
   │ allocates available devs    │
   └──────────────┬──────────────┘
                  ▼
4. System Prevents Conflicts
   ┌─────────────────────────────┐
   │ Other planners see request  │
   │ is now "In Progress"        │
   └──────────────┬──────────────┘
                  ▼
5. Allocation Complete
   ┌─────────────────────────────┐
   │ All planners notified       │
   │ Audit log created           │
   └─────────────────────────────┘
```

## Standard Allocation Management

```
Current Standard Allocation for "Web Developer" role:
┌────────────────────────────────────────────────┐
│ Project Type: "E-commerce"                     │
│ Phase: "Frontend Development"                  │
│ Allocation: 80% (32 hrs/week)                 │
│                                                │
│ Who can modify:                                │
│ ✓ Primary Planner: Alice (Frontend Lead)      │
│ ✗ Secondary Planner: Bob (Team Lead)          │
│ ✗ Backup Planner: Carol (Manager)             │
└────────────────────────────────────────────────┘

Change Request Flow:
Alice proposes: 80% → 90% (market research shows need)
                ↓
System validates: Alice has can_modify_standard_allocations
                ↓
Change applied to all future projects of this type
                ↓
Notification sent to all role planners
                ↓
Audit log: "Increased allocation due to complexity analysis"
```

## Capacity Views by Role Planner

```
Dashboard for "Senior Developer" Role Planners:

┌─────────────────────────────────────────────────────────┐
│                 CAPACITY OVERVIEW                       │
├─────────────────────────────────────────────────────────┤
│ Total Senior Developers: 12                            │
│ Currently Allocated: 10 (83%)                          │
│ Available This Week: 2                                 │
│ Available Next Month: 4                                │
│                                                         │
│ Upcoming Demand:                                        │
│ • Project Alpha: Need 2 devs (Feb 1-Apr 30)           │
│ • Project Beta: Need 1 dev (Mar 15-May 15)            │
│ • Project Gamma: Need 3 devs (Apr 1-Jun 30)           │
│                                                         │
│ Gap Analysis:                                           │
│ ⚠️  March: 1 developer over capacity                   │
│ ⚠️  April: 2 developers over capacity                  │
│ ✅ May: 1 developer available                          │
│                                                         │
│ Recommended Actions:                                    │
│ 1. Hire 1 additional Sr Developer by March             │
│ 2. Consider promoting Jr Developer                     │
│ 3. Negotiate flexible timeline for Project Gamma       │
└─────────────────────────────────────────────────────────┘
```

## Integration with Project Planning

```
Project Planner View:
┌─────────────────────────────────────────────┐
│ Project: "New Mobile App"                   │
│ Phase: "Backend Development"                │
│                                             │
│ Required Resources:                         │
│ • 2x Senior Developer (contact: John)      │
│ • 1x DevOps Engineer (contact: Maria)      │
│ • 1x QA Engineer (contact: Steve)          │
│                                             │
│ [Request Resources] [View Availability]     │
└─────────────────────────────────────────────┘

Role Planner Notification:
┌─────────────────────────────────────────────┐
│ 🔔 New Resource Request                     │
│                                             │
│ Project: "New Mobile App"                   │
│ Requested: 2x Senior Developer             │
│ Duration: 3 months (Feb-Apr)               │
│ Urgency: High                               │
│                                             │
│ Available Options:                          │
│ ✅ Alice Johnson (40% free)                │
│ ✅ Bob Smith (60% free)                    │
│ ❌ Carol Wilson (fully allocated)          │
│                                             │
│ [Allocate] [Decline] [Negotiate]            │
└─────────────────────────────────────────────┘
```