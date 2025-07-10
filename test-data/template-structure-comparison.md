# Excel Template Structure Comparison

## Critical Differences Found

### 1. Sheet Order
**ORIGINAL-TEMPLATE.XLSX:**
1. Projects
2. Project Roadmap
3. Project Demand
4. Project Capacity Gaps
5. Project Assignments
6. Standard Allocations
7. Roles
8. Roster
9. Project Types
10. Project Phases

**SAMPLE-DATA-TEMPLATE.XLSX:**
1. Project Types
2. Project Phases
3. Roles
4. Roster
5. Projects
6. Project Roadmap
7. Standard Allocations
8. Project Demand
9. Project Capacity Gaps
10. Project Assignments

**Issue:** Sheet order is completely different. This could affect imports if the system relies on sheet order.

### 2. Missing Columns

#### Projects Sheet
**Original has 12 columns:**
- Projects, Inc. in Demand, Priority, ProjType, Location, Data Restrictions, Description, In Demand, In Gaps, In Assignments, Asp. Start, Asp. Finish

**Sample only has 4 columns:**
- Project/Site, Project Type, Inc. in Demand, Priority

**Missing columns:** Location, Data Restrictions, Description, In Demand, In Gaps, In Assignments, Asp. Start, Asp. Finish

#### Project Roadmap Sheet
**Original:** Has 29 columns (Project/Site + 28 week columns from 24FW36 to 25FW11)
**Sample:** Only has 8 columns (Project/Site + 7 week columns from 24FW36 to 24FW42)

#### Project Demand Sheet
**Original:** Has 34 columns including Priority, ProjType, Role, Plan Owner, Has Demand + 28 week columns
**Sample:** Only has 10 columns, missing Priority, ProjType, Has Demand

#### Project Capacity Gaps Sheet
**Original:** Has 35 columns including Priority, ProjType, Role, Plan Owner, Over Capacity, Under Capacity + 28 weeks
**Sample:** Only has 9 columns, missing many fields

#### Project Assignments Sheet
**Original:** Has 33 columns including Priority, Person, Role, Plan Owner + 28 weeks
**Sample:** Only has 10 columns, missing Priority, Plan Owner

#### Standard Allocations Sheet
**Original:** Has 17 columns with phases: PEND, BP, DEV, SIT, VAL, UAT, CUT, HC, SUP, IDLE, BLKOUT, GL
**Sample:** Only has 9 columns with phases: PEND, BP, REQ, DEV, SIT, UAT, PROD

**Missing phases:** VAL, CUT, HC, SUP, IDLE, BLKOUT, GL
**Wrong phase:** REQ instead of proper phase, PROD instead of proper phase

#### Roles Sheet
**Original:** Has 38 columns including Description, CW Option, Req. Data Access, Current Primary Count, Current Gap, Min/Max/Avg Demand + 28 weeks
**Sample:** Only has 4 columns: Role, Plan Owner, CW Option, Required Data Access

#### Roster Sheet
**Original:** Has 32 columns including Primary Role, Plan Owner, Worker Type + 28 weeks
**Sample:** Only has 9 columns, missing Worker Type, using "Role" instead of "Primary Role"

#### Project Types Sheet
**Original:** Has 2 columns: Type, Description
**Sample:** Only has 1 column: Project Type (wrong header name)

#### Project Phases Sheet
**Original:** Has 2 columns: Phase, Description
**Sample:** Only has 1 column: Phase

### 3. Column Name Mismatches

1. **Projects sheet:** "Projects" → "Project/Site", "ProjType" → "Project Type"
2. **Roster sheet:** "Primary Role" → "Role"
3. **Project Types sheet:** "Type" → "Project Type"
4. **Roles sheet:** "Req. Data Access" → "Required Data Access"

### 4. Data Type/Format Issues

1. **Week columns:** Original uses format like "24FW36" consistently across all sheets
2. **Boolean fields:** Original likely expects Y/N for fields like "Inc. in Demand", "CW Option"
3. **Numeric fields:** Priority, allocations, capacity values need proper numeric formatting

### 5. Summary of Critical Issues

1. **Sheet order must match exactly**
2. **All columns must be present, even if empty**
3. **Column headers must match exactly (case-sensitive)**
4. **All 28 week columns (24FW36 to 25FW11) must be present**
5. **All project phases must be included in Standard Allocations**
6. **Proper data types must be used (numeric vs text)**

## Recommendations

To fix the sample-data-template.xlsx:
1. Reorder sheets to match original
2. Add all missing columns with exact header names
3. Extend week columns to full 28-week range
4. Add all missing project phases
5. Ensure proper data types for all cells
6. Include Description columns where missing