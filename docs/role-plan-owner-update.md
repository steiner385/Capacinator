# Role Plan Owner Update

## Updated Entity Relationship

```
                    ┌─────────────────┐
                    │     PEOPLE      │
                    ├─────────────────┤
                    │ • id (PK)       │
                    │ • name          │
                    │ • email         │
                    │ • primary_role  │
                    │ • worker_type   │
                    └─────────────────┘
                       ▲         ▲
                       │         │
        Plan Owner for │         │ Has Primary Role
                       │         │
                    ┌──┴─────────┴───┐
                    │     ROLES      │
                    ├─────────────────┤
                    │ • id (PK)       │
                    │ • name          │
                    │ • external_id   │
                    │ • description   │
                    │ • plan_owner_id │──── References People
                    └─────────────────┘
```

## Benefits of Role Plan Owners

1. **Clear Accountability**: Each role has a designated person responsible for capacity planning
2. **Expertise-Based Planning**: Plan owners understand the specific needs and skills of their role
3. **Proactive Management**: Plan owners can identify gaps before they become critical
4. **Better Communication**: Single point of contact for role-specific resource questions

## Use Cases

### 1. Resource Request Flow
```
Project Manager needs 2 Senior Developers
           ↓
Contacts Senior Developer Plan Owner (John Smith)
           ↓
John reviews current capacity and availability
           ↓
John assigns available developers or identifies gap
```

### 2. Capacity Planning Meeting
```
All Role Plan Owners meet monthly to:
• Review upcoming demand
• Identify resource gaps
• Plan hiring/contracting needs
• Optimize cross-role assignments
```

### 3. Role-Based Reporting
```
Senior Developer Plan Owner Dashboard:
• Total Senior Developers: 15
• Current Utilization: 87%
• Upcoming Availability: 2 FTEs in 2 weeks
• Projected Gap: 3 FTEs needed in Q2
• Skill Matrix: 10 React, 8 Node.js, 5 Python
```

## Implementation Notes

- Plan owners should have visibility into all resources with their role
- System should notify plan owners of:
  - New demand requests for their role
  - Resources becoming available
  - Overallocation situations
  - Upcoming project ends that will free resources
- Plan owners can delegate or share responsibilities
- Historical data helps plan owners make better decisions