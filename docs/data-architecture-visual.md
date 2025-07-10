# Visual Data Architecture

## Core Entity Relationships

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   LOCATIONS     │     │  PROJECT_TYPES   │     │ PROJECT_PHASES  │
├─────────────────┤     ├──────────────────┤     ├─────────────────┤
│ • id (PK)       │     │ • id (PK)        │     │ • id (PK)       │
│ • name          │     │ • name           │     │ • name          │
│ • description   │     │ • description    │     │ • description   │
└─────────────────┘     │ • color_code     │     │ • order_index   │
         │              └──────────────────┘     └─────────────────┘
         │                       │                         │
         │                       ├─────────────────────────┤
         │                       │                         │
         │                       ▼                         ▼
         │              ┌────────────────────────────────────┐
         │              │     STANDARD_ALLOCATIONS           │
         │              ├────────────────────────────────────┤
         │              │ • project_type_id (FK)             │
         │              │ • phase_id (FK)                    │
         │              │ • role_id (FK)                     │
         │              │ • allocation_percentage            │
         │              └────────────────────────────────────┘
         │                                │
         ▼                                ▼
┌─────────────────────────────────────────────────────┐     ┌─────────────────┐
│                    PROJECTS                          │     │     ROLES       │
├─────────────────────────────────────────────────────┤     ├─────────────────┤
│ • id (PK)                                           │     │ • id (PK)       │
│ • name                                              │     │ • name          │
│ • project_type_id (FK) ─────────────────────────┐   │     │ • external_id   │
│ • location_id (FK) ◄────────────────────────────┘   │     │ • description   │
│ • priority                                          │     └─────────────────┘
│ • include_in_demand                                 │              │
│ • aspiration_start/finish                           │              │
└─────────────────────────────────────────────────────┘              │
         │                                                            │
         ├──────────────────┬─────────────────────┐                  │
         ▼                  ▼                     ▼                  │
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐         │
│ PROJECT_DEMANDS │ │   PROJECT_      │ │     PEOPLE      │         │
├─────────────────┤ │   ASSIGNMENTS   │ ├─────────────────┤         │
│ • project_id    │ ├─────────────────┤ │ • id (PK)       │         │
│ • phase_id      │ │ • project_id    │ │ • name          │         │
│ • role_id       │ │ • person_id ◄───┼─┤ • email         │         │
│ • start_date    │ │ • role_id       │ │ • primary_role  │◄────────┘
│ • end_date      │ │ • phase_id      │ │ • worker_type   │
│ • demand_hours  │ │ • start_date    │ │ • is_plan_owner │
│ • is_override   │ │ • end_date      │ └─────────────────┘
└─────────────────┘ │ • allocation_%  │          │
                    └─────────────────┘          │
                                                 ├──────────┐
                              ┌──────────────────┴────┐     ▼
                              ▼                       │ ┌─────────────────┐
                    ┌─────────────────┐               │ │ PERSON_ROLES    │
                    │ PERSON_         │               │ ├─────────────────┤
                    │ AVAILABILITY    │               │ │ • person_id     │
                    ├─────────────────┤               │ │ • role_id       │
                    │ • person_id     │◄──────────────┘ │ • proficiency   │
                    │ • date          │                 │ • is_primary    │
                    │ • available_hrs │                 └─────────────────┘
                    └─────────────────┘
```

## Data Flow Process

```
1. SETUP PHASE
   ┌─────────┐     ┌──────────┐     ┌────────┐     ┌───────┐
   │Locations│ --> │Proj Types│ --> │ Phases │ --> │ Roles │
   └─────────┘     └──────────┘     └────────┘     └───────┘
                          │               │              │
                          └───────────────┴──────────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │Standard Alloc.  │
                                 │ (Templates)     │
                                 └─────────────────┘

2. RESOURCE SETUP
   ┌────────┐     ┌────────────┐     ┌──────────────┐
   │ People │ --> │Person-Roles│ --> │ Availability │
   └────────┘     └────────────┘     └──────────────┘

3. PROJECT PLANNING
   ┌─────────┐     ┌──────────────┐     ┌─────────────┐
   │Projects │ --> │Project Demand│ --> │ Assignments │
   └─────────┘     │ (from temps) │     └─────────────┘
                   └──────────────┘

4. ANALYSIS
   ┌──────────┐     ┌────────────┐     ┌───────────┐
   │ Capacity │ <-- │Assignments │ --> │   Gaps    │
   │ Analysis │     └────────────┘     │ Analysis  │
   └──────────┘                        └───────────┘
```

## Key Design Patterns

### 1. Template-Based Allocation
```
Project Type "Software Dev" + Phase "Design" + Role "UX Designer"
                            ↓
            Standard Allocation: 100% for 2 weeks
                            ↓
        Auto-generates demands when project created
```

### 2. Override Mechanism
```
Default Demand (from template): 100% UX Designer for Design Phase
                    ↓
        Override for specific date range
                    ↓
Custom Demand: 50% UX Designer from Jan 1-15 (vacation coverage)
```

### 3. Multi-Role Assignment
```
Person "Jane Doe"
    ├── Primary Role: Senior Developer (Proficiency: 5)
    ├── Secondary Role: Tech Lead (Proficiency: 4)
    └── Secondary Role: Scrum Master (Proficiency: 3)
    
Can be assigned to projects in any of these roles
```

### 4. Capacity Calculation
```
Person Available Hours (per day): 8
    ├── Project A Assignment: 50% (4 hours)
    ├── Project B Assignment: 25% (2 hours)
    └── Remaining Capacity: 25% (2 hours)
    
If total > 100% → Overallocation Warning
```

### 5. Role Plan Ownership
```
Role "Senior Developer"
    └── Plan Owner: "John Smith" (Tech Lead)
         └── Responsible for:
             • Capacity planning for all Senior Developers
             • Resource allocation decisions
             • Gap analysis and hiring recommendations
             • Monitoring team utilization
             • Approving role assignments
```