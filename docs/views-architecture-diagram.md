# Views Architecture Diagram

## Simplified Data Flow with Views

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   PROJECT_TYPES     │     │ PROJECT_PHASES   │     │     ROLES       │
└──────────┬──────────┘     └────────┬─────────┘     └────────┬────────┘
           │                         │                          │
           └─────────────────────────┼──────────────────────────┘
                                     │
                                     ▼
                        ┌──────────────────────────┐
                        │  STANDARD_ALLOCATIONS    │
                        │  (Template by Type/      │
                        │   Phase/Role)            │
                        └──────────┬───────────────┘
                                   │
┌─────────────────┐                │                   ┌──────────────────────┐
│    PROJECTS     │                │                   │ PROJECT_PHASES_      │
│                 │                ▼                   │ TIMELINE             │
│ • project_type  │─────► ╔═══════════════════╗       │                      │
│ • start_date    │       ║ PROJECT_DEMANDS_  ║ ◄─────│ • project_id         │
│ • end_date      │       ║ VIEW              ║       │ • phase_id           │
└─────────────────┘       ║                   ║       │ • start_date         │
                          ║ (Calculated from  ║       │ • end_date           │
                          ║  standards +      ║       └──────────────────────┘
                          ║  overrides)       ║
                          ╚════════▲══════════╝
                                   │
                          ┌────────┴───────────┐
                          │ DEMAND_OVERRIDES   │
                          │                    │
                          │ • project_id       │
                          │ • phase_id         │
                          │ • role_id          │
                          │ • start/end dates  │
                          │ • demand_hours     │
                          │ • reason           │
                          └────────────────────┘
```

## How Views Calculate Demands

```
Standard Allocation Logic:
━━━━━━━━━━━━━━━━━━━━━━━━━

Project Type: "Web App"
Phase: "Design" 
Role: "UX Designer"
Standard Allocation: 100%

                    ↓

Project: "Customer Portal" (Type: Web App)
Design Phase: Jan 1-15 (15 days)

                    ↓

Calculated Demand = 15 days × 8 hours × 100% = 120 hours

━━━━━━━━━━━━━━━━━━━━━━━━━

Override Logic:
━━━━━━━━━━━━━━━━━━━━━━━━━

IF exists in DEMAND_OVERRIDES for same:
  - project_id
  - role_id  
  - overlapping dates
  
THEN use override hours
ELSE use calculated standard hours
```

## View Dependencies

```
┌─────────────────────────────────────────────────┐
│            PROJECT_DEMANDS_VIEW                 │
├─────────────────────────────────────────────────┤
│ Combines:                                       │
│ • Standard demands (calculated)                 │
│ • Override demands (explicit)                   │
│ • Override takes precedence                     │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│         PROJECT_DEMANDS_SUMMARY                 │
├─────────────────────────────────────────────────┤
│ Aggregates by:                                  │
│ • Project + Role + Date                         │
│ • Shows total daily demands                     │
│ • Indicates if overrides present                │
└─────────────────────────────────────────────────┘
```

## Example Data Flow

```
1. Create Project
   ┌─────────────────────┐
   │ Project: CRM Update │
   │ Type: Software Dev  │
   │ Priority: High      │
   └──────────┬──────────┘
              │
2. Define Phase Timeline
              ▼
   ┌─────────────────────────┐
   │ Design: Jan 1-15        │
   │ Development: Jan 16-31  │
   │ Testing: Feb 1-7        │
   └──────────┬──────────────┘
              │
3. System Auto-Calculates (VIEW)
              ▼
   ┌─────────────────────────────────┐
   │ Design Phase Demands:           │
   │ • UX Designer: 120 hrs         │
   │ • Tech Lead: 60 hrs           │
   │                                │
   │ Development Phase Demands:      │
   │ • Sr Developer: 128 hrs        │
   │ • Jr Developer: 128 hrs        │
   │ • Tech Lead: 32 hrs           │
   └──────────┬─────────────────────┘
              │
4. Add Override (if needed)
              ▼
   ┌─────────────────────────────────┐
   │ Override: Jan 20-24             │
   │ Sr Developer: 20 hrs            │
   │ Reason: "Half-time due to       │
   │          training"              │
   └─────────────────────────────────┘
```

## Benefits of View-Based Architecture

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│ No Redundant     │     │ Always Current    │     │ Single Source    │
│ Data Storage     │     │ Calculations      │     │ of Truth         │
├──────────────────┤     ├───────────────────┤     ├──────────────────┤
│ Demands are      │     │ Changes to        │     │ Standard alloc.  │
│ calculated, not  │     │ templates auto-   │     │ define rules     │
│ stored           │     │ update all views  │     │ for all projects │
└──────────────────┘     └───────────────────┘     └──────────────────┘
```