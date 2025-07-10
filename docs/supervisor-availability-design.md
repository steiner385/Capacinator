# Supervisor Hierarchy and Availability Management

## Overview
The system tracks supervisor relationships and allows both supervisors and individuals to manage availability schedules. This supports realistic workforce planning with vacation, part-time schedules, and special assignments.

## Core Concepts

### 1. Supervisor Hierarchy
- Each person can have one direct supervisor
- Supervisors can delegate authority to others
- Both supervisors and individuals can modify availability
- Self-service availability management is encouraged

### 2. Default Availability
- **default_availability_percentage**: Base capacity (e.g., 50% for managers)
- **default_hours_per_day**: Standard working hours (e.g., 8 hours)
- Assumes 100% availability unless overridden

### 3. Availability Overrides
- Time-bound exceptions to default availability
- Support various override types (vacation, training, etc.)
- Require approval from supervisor or delegate
- Full audit trail for all changes

## Database Schema

### Enhanced People Table
```sql
ALTER TABLE people ADD (
  supervisor_id UUID REFERENCES people(id),
  default_availability_percentage DECIMAL(5,2) DEFAULT 100.00,
  default_hours_per_day DECIMAL(4,2) DEFAULT 8.00
);
```

### Availability Overrides
```sql
CREATE TABLE person_availability_overrides (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES people(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  availability_percentage DECIMAL(5,2) NOT NULL,
  hours_per_day DECIMAL(4,2), -- Optional explicit hours
  override_type ENUM(...) NOT NULL,
  reason TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES people(id),
  created_by UUID REFERENCES people(id)
);
```

## Override Types

1. **VACATION**: Planned time off
2. **SICK_LEAVE**: Unplanned absence
3. **TRAINING**: Learning and development
4. **PART_TIME_PERIOD**: Temporary reduced schedule
5. **BUBBLE_ASSIGNMENT**: Temporary increased commitment
6. **PERSONAL_LEAVE**: Family or personal matters
7. **REDUCED_HOURS**: Ongoing schedule change
8. **INCREASED_HOURS**: Temporary overtime period
9. **OTHER**: Custom situations

## Use Cases

### 1. Manager with Default 50% Availability
```sql
-- Set manager's default availability
UPDATE people 
SET default_availability_percentage = 50.0,
    default_hours_per_day = 4.0
WHERE id = 'manager-123';

-- System automatically calculates 4 hours/day availability
-- Unless overridden for specific periods
```

### 2. Developer Taking Vacation
```sql
-- Developer or supervisor creates vacation override
INSERT INTO person_availability_overrides (
  person_id, start_date, end_date, 
  availability_percentage, override_type, reason
) VALUES (
  'dev-456', '2024-07-01', '2024-07-14',
  0, 'VACATION', 'Summer vacation'
);
```

### 3. Bubble Assignment (Increased Availability)
```sql
-- Critical project needs extra hours
INSERT INTO person_availability_overrides (
  person_id, start_date, end_date,
  availability_percentage, override_type, reason
) VALUES (
  'senior-dev-789', '2024-03-01', '2024-03-31',
  150, 'BUBBLE_ASSIGNMENT', 'Critical security patch project'
);
```

### 4. Part-Time Schedule
```sql
-- Employee switches to part-time for 6 months
INSERT INTO person_availability_overrides (
  person_id, start_date, end_date,
  availability_percentage, override_type, reason
) VALUES (
  'designer-321', '2024-01-01', '2024-06-30',
  60, 'PART_TIME_PERIOD', 'Childcare responsibilities'
);
```

## Permission Matrix

| Action | Self | Direct Supervisor | Delegated Supervisor | HR |
|--------|------|------------------|---------------------|-----|
| View own availability | ✓ | ✓ | ✓ | ✓ |
| Request override | ✓ | ✓ | ✓ | ✓ |
| Approve override | ✗ | ✓ | If delegated | ✓ |
| Modify default availability | ✗ | ✓ | If delegated | ✓ |
| View team availability | ✗ | ✓ | If delegated | ✓ |

## Supervisor Delegation

### Use Cases for Delegation
1. **Vacation Coverage**: Manager delegates to team lead while away
2. **Matrix Management**: Project manager gets temporary authority
3. **HR Partnership**: HR business partner manages availability
4. **Cross-Team Support**: Shared resources managed by multiple supervisors

### Example Delegation
```sql
-- Manager going on vacation delegates to team lead
INSERT INTO supervisor_delegations (
  supervisor_id, delegate_id, person_id,
  start_date, end_date, delegation_reason
) VALUES (
  'manager-123', 'team-lead-456', 'developer-789',
  '2024-06-01', '2024-06-15', 
  'Manager vacation coverage'
);
```

## Availability Calculation Logic

```sql
-- The person_availability_view automatically calculates:
FOR each_date IN next_2_years:
  1. Start with person's default_availability_percentage
  2. Check for approved overrides on this date
  3. If override exists, use override percentage
  4. Calculate available_hours based on percentage
  5. Mark override_type and reason if applicable
```

## Workflow Examples

### 1. Vacation Request Flow
```
1. Employee requests vacation
   ↓
2. System creates override with is_approved = false
   ↓
3. Notification sent to supervisor
   ↓
4. Supervisor reviews and approves/rejects
   ↓
5. If approved, availability view reflects changes
   ↓
6. Project planners see reduced capacity
```

### 2. Emergency Availability Change
```
1. Critical project needs extra resources
   ↓
2. Supervisor temporarily increases someone's availability
   ↓
3. System immediately reflects change
   ↓
4. Audit log records emergency override
   ↓
5. Follow-up review to formalize arrangement
```

### 3. Manager Sets Team Member to Part-Time
```
1. Manager updates default availability: 100% → 60%
   ↓
2. System recalculates all future availability
   ↓
3. Capacity planning automatically adjusts
   ↓
4. Project planners notified of reduced capacity
```

## Reporting Views

### Weekly Availability Summary
```sql
SELECT 
  person_name,
  week_start,
  avg_availability_percentage,
  total_available_hours_week,
  override_types
FROM availability_summary_view
WHERE week_start BETWEEN '2024-01-01' AND '2024-03-31';
```

### Team Capacity Overview
```sql
SELECT 
  supervisor_name,
  COUNT(*) as team_size,
  AVG(avg_availability_percentage) as team_avg_availability,
  SUM(total_available_hours_week) as team_total_hours
FROM availability_summary_view
GROUP BY supervisor_name;
```

## Benefits

1. **Realistic Planning**: Accounts for actual availability, not just headcount
2. **Self-Service**: Employees can manage their own schedules
3. **Flexibility**: Supports various work arrangements
4. **Approval Workflow**: Maintains management oversight
5. **Audit Trail**: Complete history for compliance
6. **Automated Calculation**: No manual tracking required

## Integration with Capacity Planning

The availability system integrates with capacity planning by:
- Reducing available hours for project assignments
- Showing realistic resource pools
- Alerting to upcoming availability changes
- Supporting "what-if" scenarios with different availability assumptions