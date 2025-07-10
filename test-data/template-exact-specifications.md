# Excel Template Exact Specifications

## Critical Requirements for Import Compatibility

### 1. Sheet Order (MUST match exactly)
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

### 2. Column Headers by Sheet (MUST match exactly, case-sensitive)

#### Projects Sheet (12 columns)
1. Projects
2. Inc. in Demand
3. Priority
4. ProjType
5. Location
6. Data Restrictions
7. Description
8. In Demand
9. In Gaps
10. In Assignments
11. Asp. Start
12. Asp. Finish

#### Project Roadmap Sheet (29 columns)
1. Project/Site
2. 24FW36 through 25FW11 (28 fiscal week columns)

#### Project Demand Sheet (34 columns)
1. Project/Site
2. Priority
3. ProjType
4. Role
5. Plan Owner
6. Has Demand
7. 24FW36 through 25FW11 (28 fiscal week columns)

#### Project Capacity Gaps Sheet (35 columns)
1. Project/Site
2. Priority
3. ProjType
4. Role
5. Plan Owner
6. Over Capacity
7. Under Capacity
8. 24FW36 through 25FW11 (28 fiscal week columns)

#### Project Assignments Sheet (33 columns)
1. Project/Site
2. Priority
3. Person
4. Role
5. Plan Owner
6. 24FW36 through 25FW11 (28 fiscal week columns)

#### Standard Allocations Sheet (17 columns)
1. Role
2. ProjType
3. Plan Owner
4. Missing Dmd Rows
5. Missing Cpcty Rows
6. PEND
7. BP
8. DEV
9. SIT
10. VAL
11. UAT
12. CUT
13. HC
14. SUP
15. IDLE
16. BLKOUT
17. GL

#### Roles Sheet (38 columns)
1. Role
2. Plan Owner
3. Description
4. CW Option
5. Req. Data Access
6. Current Primary Count
7. Current Gap
8. Min Demand
9. Max Demand
10. Avg Demand
11. 24FW36 through 25FW11 (28 fiscal week columns)

#### Roster Sheet (32 columns)
1. Person
2. Primary Role
3. Plan Owner
4. Worker Type
5. 24FW36 through 25FW11 (28 fiscal week columns)

#### Project Types Sheet (2 columns)
1. Type
2. Description

#### Project Phases Sheet (2 columns)
1. Phase
2. Description

### 3. Column Widths
- Projects sheet: 20 units per column
- Other sheets: 15 units per column

### 4. Fiscal Week Format
- Pattern: `YYFWWW` where YY is 2-digit year, FW is literal "FW", WW is 2-digit week
- Range: 24FW36 to 25FW11 (28 weeks total)
- Must appear in exact order across all relevant sheets

### 5. Project Phases (Standard Allocations)
All 12 phases must be present in this exact order:
1. PEND - Pending
2. BP - Business Planning
3. DEV - Development
4. SIT - System Integration Testing
5. VAL - Validation
6. UAT - User Acceptance Testing
7. CUT - Cutover
8. HC - Hypercare
9. SUP - Support
10. IDLE - Idle time
11. BLKOUT - Blackout period
12. GL - Go Live

### 6. Data Types and Formats
- **Boolean fields** (Inc. in Demand, CW Option): Use "Y" or "N"
- **Priority**: Numeric (1, 2, 3, etc.)
- **Dates** (Asp. Start, Asp. Finish): Excel date format
- **Percentages/Allocations**: Decimal values (0.1 = 10%, 1.0 = 100%)
- **Project/Site**: Format as "Project Name / Location"

### 7. Critical Naming Differences
Be careful with these exact field names:
- "Projects" NOT "Project/Site" (in Projects sheet header)
- "ProjType" NOT "Project Type"
- "Primary Role" NOT "Role" (in Roster sheet)
- "Type" NOT "Project Type" (in Project Types sheet)
- "Req. Data Access" NOT "Required Data Access"

### 8. Empty Cells
- Leave cells empty rather than using 0 for no allocation
- All header columns must be present even if data columns are empty

### 9. No Special Features
- No formulas
- No data validation
- No merged cells
- No conditional formatting

## Sample Data Guidelines

When creating sample data:
1. Use realistic project names with location suffix (e.g., "Mobile Banking App / New York")
2. Include variety in project types, phases, and priorities
3. Allocations should be realistic (0.1 to 1.0 for partial/full allocation)
4. Ensure referential integrity (roles, people, projects must exist before being referenced)
5. Include some gaps and over-capacity scenarios for testing
6. Use all 12 project phases across different projects
7. Include both "Y" and "N" values for boolean fields