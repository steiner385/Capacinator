# Views Architecture - Derived Data Strategy

## Overview
By using database views for derived data, we reduce redundancy and ensure consistency. Project demands are now calculated from standard allocations by default, with an override mechanism for exceptions.

## Core Tables vs Views

### Core Tables (Store Data)
1. **standard_allocations** - Template allocations by project type/phase/role
2. **project_phases_timeline** - When each phase occurs for a project
3. **demand_overrides** - Exceptions to standard allocations

### Views (Derive Data)
1. **project_demands_view** - Combines standard allocations with overrides
2. **project_demands_summary** - Aggregated demand by project/role/date

## How It Works

### 1. Project Creation Flow
```
Create Project (Type: "Software Dev")
           ↓
Add Phase Timeline:
  - Design: Jan 1-15
  - Development: Jan 16-Mar 31
  - Testing: Apr 1-15
           ↓
System automatically calculates demands
from standard allocations for "Software Dev"
```

### 2. Standard Demand Calculation
```sql
-- Example: Software Dev project, Design phase
Standard Allocation: UX Designer @ 100%
Phase Duration: Jan 1-15 (15 days)
Calculated Demand: 15 days × 8 hours × 100% = 120 hours
```

### 3. Override Mechanism
```sql
-- Override example: Reduced allocation due to holidays
INSERT INTO demand_overrides (
  project_id, phase_id, role_id, 
  start_date, end_date, demand_hours, reason
) VALUES (
  'project-123', 'design-phase', 'ux-designer-role',
  '2024-01-01', '2024-01-05', 16, 'Holiday week - reduced hours'
);
```

## View Definitions

### project_demands_view
Combines standard allocations with overrides:
- Calculates demands from standard allocations
- Applies overrides where they exist
- Override periods replace standard calculations
- Non-override periods use standard calculations

### project_demands_summary
Provides daily demand totals:
- Groups by project, role, and date
- Shows total hours needed per day
- Indicates if any overrides are applied

## Benefits

1. **Data Integrity**: No duplicate or conflicting demand data
2. **Automatic Updates**: Changes to standard allocations immediately reflect in all projects
3. **Flexibility**: Easy to override for specific situations
4. **Performance**: Views are optimized by SQLite's query planner
5. **Maintainability**: Single source of truth for allocation rules

## Example Scenarios

### Scenario 1: Standard Project
```
Project: "Customer Portal"
Type: "Web Application"
Phases:
  - Requirements: 2 weeks
  - Design: 3 weeks
  - Development: 8 weeks
  - Testing: 2 weeks

Demands are automatically calculated from
standard allocations for "Web Application" type
```

### Scenario 2: Project with Special Needs
```
Project: "Emergency Fix"
Type: "Maintenance"
Override: Need senior developer 200% (2 people) for first week

INSERT INTO demand_overrides:
  - Senior Developer: Jan 1-7, 80 hours (200% allocation)
  
Rest of project uses standard "Maintenance" allocations
```

### Scenario 3: Phased Reduction
```
Project: "Legacy Migration"
Override: Gradually reduce team as migration completes

Overrides:
  - Month 1-2: Standard allocations
  - Month 3: 75% of standard (override)
  - Month 4: 50% of standard (override)
  - Month 5: 25% of standard (override)
```

## Migration Strategy

For existing data:
1. Create project_phases_timeline from existing project dates
2. Import any non-standard demands as overrides
3. Let standard allocations handle the rest

## Future Enhancements

1. **Calculated Fields in Views**:
   - FTE equivalents (hours / 8 / days)
   - Cost projections (hours × role rates)
   - Utilization percentages

2. **Additional Views**:
   - Capacity vs demand comparison
   - Resource availability gaps
   - Project health indicators

3. **Materialized Views** (if performance needed):
   - Cache complex calculations
   - Refresh on data changes