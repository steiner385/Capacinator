# Supervisor Hierarchy and Availability Management Diagram

## Supervisor Hierarchy Structure

```
┌─────────────────┐         ┌─────────────────────────┐
│     PEOPLE      │         │ PERSON_AVAILABILITY_    │
├─────────────────┤         │ OVERRIDES               │
│ • id (PK)       │◄────────├─────────────────────────┤
│ • name          │         │ • person_id (FK)        │
│ • supervisor_id │◄─┐      │ • start_date            │
│ • default_avail │  │      │ • end_date              │
│ • default_hours │  │      │ • availability_%        │
└─────────────────┘  │      │ • override_type         │
         ▲            │      │ • is_approved           │
         │            │      │ • approved_by (FK)      │
         └────────────┘      └─────────────────────────┘
      Self-Reference
      (Supervisor)
```

## Availability Override Types Flow

```
                    ┌─────────────────────────┐
                    │    DEFAULT SCHEDULE     │
                    │  100% @ 8 hours/day    │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┴─────────────────┐
                │        Override Required?        │
                └────┬─────────────────────┬──────┘
                    YES                   NO
                     ▼                     ▼
        ┌─────────────────────────┐  ┌──────────────┐
        │    CREATE OVERRIDE      │  │ USE DEFAULT  │
        └────────────┬────────────┘  └──────────────┘
                     ▼
        ┌─────────────────────────┐
        │   OVERRIDE TYPES:       │
        │ • VACATION (0%)         │
        │ • TRAINING (100%)       │
        │ • PART_TIME (50%)       │
        │ • BUBBLE (150%)         │
        │ • SICK_LEAVE (0%)       │
        │ • REDUCED_HOURS (75%)   │
        └────────────┬────────────┘
                     ▼
        ┌─────────────────────────┐
        │   APPROVAL REQUIRED     │
        │ Supervisor or Delegate  │
        └────────────┬────────────┘
                     ▼
        ┌─────────────────────────┐
        │   AVAILABILITY VIEW     │
        │   Calculates Daily      │
        │   Available Hours       │
        └─────────────────────────┘
```

## Supervisor Permission Model

```
Person: "John Developer"
│
├── SELF: John Developer
│   ├── Can request overrides ✓
│   ├── Can approve overrides ✗
│   └── Can view own availability ✓
│
├── DIRECT SUPERVISOR: Jane Manager
│   ├── Can request overrides ✓
│   ├── Can approve overrides ✓
│   ├── Can modify default availability ✓
│   └── Can view team availability ✓
│
├── DELEGATED SUPERVISOR: Bob Team Lead
│   │   (While Jane is on vacation)
│   ├── Can request overrides ✓
│   ├── Can approve overrides ✓
│   ├── Can modify default availability ✗
│   └── Can view team availability ✓
│
└── HR BUSINESS PARTNER: Susan HR
    ├── Can request overrides ✓
    ├── Can approve overrides ✓
    ├── Can modify default availability ✓
    └── Can view all availability ✓
```

## Complex Availability Scenario

```
Manager: "Alice Engineering Manager" (Default: 50% availability)
│
Timeline View:
┌─────────────────────────────────────────────────────────────────┐
│ Week 1: Default 50% (20 hrs) - Normal management duties        │
│ Week 2: Override 25% (10 hrs) - Conference attendance          │
│ Week 3: Override 75% (30 hrs) - Critical project support       │
│ Week 4: Default 50% (20 hrs) - Back to normal                  │
│ Week 5: Override 0% (0 hrs)   - Vacation                       │
│ Week 6: Override 0% (0 hrs)   - Vacation                       │
│ Week 7: Default 50% (20 hrs) - Return from vacation            │
└─────────────────────────────────────────────────────────────────┘

Database Records:
┌─────────────────────────────────────────────────────────────────┐
│ Default: 50% availability, 4 hours/day                         │
│                                                                 │
│ Override 1: Week 2, 25%, TRAINING, "React Conference"          │
│ Override 2: Week 3, 75%, BUBBLE_ASSIGNMENT, "Critical launch"  │
│ Override 3: Week 5-6, 0%, VACATION, "Family trip"             │
└─────────────────────────────────────────────────────────────────┘
```

## Delegation Workflow

```
Scenario: Manager Alice goes on vacation, delegates to Team Lead Bob

┌─────────────────────────────────────────────────────────────────┐
│                        BEFORE VACATION                         │
├─────────────────────────────────────────────────────────────────┤
│ Alice (Manager)                                                 │
│ ├── Can approve: John, Jane, Mark, Lisa                        │
│ ├── Can modify defaults: All team members                      │
│ └── Can view: All team availability                            │
│                                                                 │
│ Bob (Team Lead)                                                 │
│ ├── Can approve: None                                           │
│ ├── Can modify defaults: None                                   │
│ └── Can view: Own availability only                             │
└─────────────────────────────────────────────────────────────────┘

                              ▼

┌─────────────────────────────────────────────────────────────────┐
│                    CREATE DELEGATION                            │
├─────────────────────────────────────────────────────────────────┤
│ INSERT INTO supervisor_delegations:                             │
│ • supervisor_id: Alice                                          │
│ • delegate_id: Bob                                              │
│ • person_id: [John, Jane, Mark, Lisa]                         │
│ • start_date: 2024-07-01                                       │
│ • end_date: 2024-07-14                                         │
│ • can_approve_availability: true                               │
└─────────────────────────────────────────────────────────────────┘

                              ▼

┌─────────────────────────────────────────────────────────────────┐
│                      DURING VACATION                           │
├─────────────────────────────────────────────────────────────────┤
│ Alice (Manager) - ON VACATION                                   │
│ ├── Can approve: None (unavailable)                            │
│ ├── Can modify defaults: None (unavailable)                    │
│ └── Can view: None (unavailable)                               │
│                                                                 │
│ Bob (Team Lead) - DELEGATED AUTHORITY                          │
│ ├── Can approve: John, Jane, Mark, Lisa ✓                      │
│ ├── Can modify defaults: None (not delegated)                  │
│ └── Can view: All team availability ✓                          │
└─────────────────────────────────────────────────────────────────┘
```

## Availability Calculation Engine

```
Daily Availability Calculation for Person X on Date Y:

1. Get Default Values
   ┌─────────────────────────────┐
   │ default_availability_%: 100 │
   │ default_hours_per_day: 8    │
   └─────────────┬───────────────┘
                 ▼
2. Check for Overrides
   ┌─────────────────────────────┐
   │ SELECT * FROM overrides     │
   │ WHERE person_id = X         │
   │   AND date Y BETWEEN        │
   │   start_date AND end_date   │
   │   AND is_approved = true    │
   │ ORDER BY created_at DESC    │
   │ LIMIT 1                     │
   └─────────────┬───────────────┘
                 ▼
3. Apply Override or Default
   ┌─────────────────────────────┐
   │ IF override_found:          │
   │   use override_%            │
   │   use override_hours OR     │
   │   calculate from %          │
   │ ELSE:                       │
   │   use default_%             │
   │   use default_hours         │
   └─────────────┬───────────────┘
                 ▼
4. Return Final Values
   ┌─────────────────────────────┐
   │ availability_%: 75          │
   │ available_hours: 6          │
   │ override_type: TRAINING     │
   │ status: PARTIAL             │
   └─────────────────────────────┘
```

## Integration with Capacity Planning

```
Capacity Planning View with Availability:

┌─────────────────────────────────────────────────────────────────┐
│               PROJECT RESOURCE REQUIREMENTS                     │
├─────────────────────────────────────────────────────────────────┤
│ Project: "Mobile App Redesign"                                 │
│ Duration: 8 weeks (Feb 1 - Mar 31)                            │
│                                                                 │
│ Required: 2x Senior Developers @ 100% (80 hrs/week each)       │
│                                                                 │
│ Available Senior Developers:                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Alice Johnson                                               │ │
│ │ ├── Default: 100% (40 hrs/week)                            │ │
│ │ ├── Feb 15-22: 0% (vacation)                               │ │
│ │ ├── Mar 1-7: 50% (training)                                │ │
│ │ └── Effective: 70% average (28 hrs/week) ❌ INSUFFICIENT   │ │
│ │                                                             │ │
│ │ Bob Smith                                                   │ │
│ │ ├── Default: 100% (40 hrs/week)                            │ │
│ │ ├── Mar 15-31: 150% (bubble assignment)                    │ │
│ │ └── Effective: 110% average (44 hrs/week) ✅ SUFFICIENT    │ │
│ │                                                             │ │
│ │ Carol Wilson                                                │ │
│ │ ├── Default: 80% (32 hrs/week) - Part time                 │ │
│ │ ├── No overrides planned                                    │ │
│ │ └── Effective: 80% (32 hrs/week) ❌ INSUFFICIENT           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ RECOMMENDATION: Need 1 additional Senior Developer             │
│ OR negotiate reduced scope/timeline for project                │
└─────────────────────────────────────────────────────────────────┘
```