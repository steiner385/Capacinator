# Excel Template Analysis and Comparison

## Overview
This document analyzes the new Excel template structure and compares it with the current database schema and import implementation.

## Excel Template Structure

### 1. Projects Sheet
**Columns:**
- Projects (name)
- Inc. in Demand (boolean flag)
- Priority
- ProjType
- Location
- Data Restrictions
- Description
- In Demand (calculated/status)
- In Gaps (calculated/status)
- In Assignments (calculated/status)
- Asp. Start (Aspiration Start Date)
- Asp. Finish (Aspiration Finish Date)

### 2. Project Roadmap Sheet
**Columns:**
- Project/Site
- Fiscal weeks from 24FW36 through 25FW11 (28 weeks total)

**Purpose:** Shows project timeline across fiscal weeks with phases

### 3. Project Demand Sheet
**Columns:**
- Project/Site
- Priority
- ProjType
- Role
- Plan Owner
- Has Demand (flag)
- Fiscal weeks 24FW36 through 25FW11 (demand values per week)

**Purpose:** Tracks role-based demand by project across fiscal weeks

### 4. Project Capacity Gaps Sheet
**Columns:**
- Project/Site
- Priority
- ProjType
- Role
- Plan Owner
- Over Capacity (calculated)
- Under Capacity (calculated)
- Fiscal weeks 24FW36 through 25FW11 (gap values per week)

**Purpose:** Shows capacity gaps (over/under) by role and project

### 5. Project Assignments Sheet
**Columns:**
- Project/Site
- Priority
- Person
- Role
- Plan Owner
- Fiscal weeks 24FW36 through 25FW11 (assignment percentages)

**Purpose:** Tracks person assignments to projects by role over time

### 6. Standard Allocations Sheet
**Columns:**
- Role
- ProjType
- Plan Owner
- Missing Dmd Rows
- Missing Cpcty Rows
- Phase columns: PEND, BP, DEV, SIT, VAL, UAT, CUT, HC, SUP, IDLE, BLKOUT, GL

**Purpose:** Defines standard allocation percentages by role, project type, and phase

### 7. Roles Sheet
**Columns:**
- Role
- Plan Owner
- Description
- CW Option (Contingent Worker option)
- Req. Data Access (Required Data Access)
- Current Primary Count
- Current Gap
- Min Demand
- Max Demand
- Avg Demand
- Fiscal weeks 24FW36 through 25FW11 (role metrics)

### 8. Roster Sheet
**Columns:**
- Person
- Primary Role
- Plan Owner
- Worker Type
- Fiscal weeks 24FW36 through 25FW11 (availability percentages)

### 9. Project Types Sheet
**Columns:**
- Type
- Description

### 10. Project Phases Sheet
**Columns:**
- Phase
- Description

## Key Differences from Current Implementation

### 1. New Concepts Not in Current Schema:
- **Plan Owner**: Appears in multiple sheets (Roles, Roster, Project Demand, etc.)
  - Current schema has role_planners and project_planners tables but no direct "Plan Owner" field
- **Fiscal Week Columns**: Time-series data stored as columns (24FW36-25FW11)
  - Current schema uses date ranges instead of fiscal week columns
- **Phase Abbreviations**: PEND, BP, DEV, SIT, VAL, UAT, CUT, HC, SUP, IDLE, BLKOUT, GL
  - Current schema has generic project_phases table
- **CW Option** and **Req. Data Access** fields for roles
- **Missing Dmd Rows** and **Missing Cpcty Rows** indicators

### 2. Current Schema Elements Not in Excel:
- Supervisor hierarchy (supervisor_id in people table)
- Person availability overrides
- Supervisor delegations
- Audit tables
- Email addresses for people
- Location and project type color codes
- Proficiency levels for person-role relationships

### 3. Data Structure Differences:
- Excel uses wide format with fiscal week columns
- Database uses normalized structure with date ranges
- Excel combines project + site in "Project/Site" column
- Database has separate project and location entities

## Required Updates

### 1. Schema Updates Needed:
- Add `plan_owner_id` field to roles table (already exists in schema docs but not consistently used)
- Add `cw_option` boolean field to roles table
- Add `requires_data_access` boolean field to roles table
- Consider adding fiscal week calculation utilities

### 2. Import Logic Updates:
- Parse "Project/Site" to extract project name and location
- Handle fiscal week columns and convert to date ranges
- Map phase abbreviations to full phase names
- Process Plan Owner relationships
- Handle time-series data from fiscal week columns
- Import role-specific fields (CW Option, Data Access)

### 3. New Import Functions Needed:
- `parseProjectSite()`: Split combined project/site values
- `convertFiscalWeekToDate()`: Convert fiscal week notation to dates
- `mapPhaseAbbreviation()`: Map short codes to full phase names
- `processFiscalWeekData()`: Extract time-series data from columns
- `findOrCreatePlanOwner()`: Handle Plan Owner references

### 4. Enhanced Error Handling:
- Validate fiscal week format (e.g., "24FW36")
- Handle missing Plan Owner references
- Validate phase abbreviations
- Check for data consistency across related sheets