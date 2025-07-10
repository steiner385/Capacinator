# Excel Import Updates Required

Based on the analysis of the new Excel template structure compared to the current implementation, here are the specific updates needed:

## 1. Database Schema Updates

### Add Missing Fields to Roles Table
```sql
ALTER TABLE roles ADD COLUMN cw_option BOOLEAN DEFAULT FALSE;
ALTER TABLE roles ADD COLUMN requires_data_access BOOLEAN DEFAULT FALSE;
```

### Add Plan Owner Support
The schema already has role_planners table, but we need to ensure proper mapping during import.

## 2. Excel Import Logic Updates

### A. Update Sheet Name Recognition
Current implementation looks for specific sheet names. Need to handle variations:
- "Roster" vs "Rosters" 
- Exact match for new sheets like "Project Roadmap", "Project Demand", etc.

### B. New Import Methods Needed

#### 1. Import Project Roadmap
```typescript
private async importProjectRoadmap(worksheet: ExcelJS.Worksheet): Promise<{ count: number; errors: string[] }>
```
- Parse Project/Site column
- Convert fiscal week columns to date ranges
- Create project_phases_timeline entries

#### 2. Import Project Demand
```typescript
private async importProjectDemand(worksheet: ExcelJS.Worksheet): Promise<{ count: number; errors: string[] }>
```
- Parse Project/Site, Role, Plan Owner
- Convert fiscal week demand values to demand_overrides entries
- Handle "Has Demand" flag

#### 3. Import Project Capacity Gaps
```typescript
private async importProjectCapacityGaps(worksheet: ExcelJS.Worksheet): Promise<{ count: number; errors: string[] }>
```
- This is calculated data - may just validate/log rather than import

#### 4. Import Project Assignments with Fiscal Weeks
```typescript
private async importProjectAssignments(worksheet: ExcelJS.Worksheet): Promise<{ count: number; errors: string[] }>
```
- Parse Person, Role, Project/Site
- Convert fiscal week allocation percentages to project_assignments entries

### C. Utility Functions Needed

#### 1. Parse Project/Site Column
```typescript
private parseProjectSite(value: string): { projectName: string; locationName: string }
```

#### 2. Convert Fiscal Week to Date
```typescript
private fiscalWeekToDate(fiscalWeek: string): Date
// Example: "24FW36" -> Date for week 36 of fiscal year 2024
```

#### 3. Map Phase Abbreviations
```typescript
private mapPhaseAbbreviation(abbr: string): string
const phaseMap = {
  'PEND': 'Pending',
  'BP': 'Business Planning',
  'DEV': 'Development',
  'SIT': 'System Integration Testing',
  'VAL': 'Validation',
  'UAT': 'User Acceptance Testing',
  'CUT': 'Cutover',
  'HC': 'Hypercare',
  'SUP': 'Support',
  'IDLE': 'Idle',
  'BLKOUT': 'Blackout',
  'GL': 'Go Live'
}
```

#### 4. Extract Fiscal Week Data
```typescript
private extractFiscalWeekData(row: ExcelJS.Row, startCol: number): Map<string, number>
```

### D. Update Existing Import Methods

#### 1. Update importProjects()
- Handle "Inc. in Demand" flag properly
- Parse Project/Site if needed
- Handle additional status flags

#### 2. Update importPeople() 
- Add Plan Owner handling for Roster sheet
- Process fiscal week availability data

#### 3. Update importStandardAllocations()
- Handle phase columns (PEND, BP, DEV, etc.)
- Map Plan Owner references
- Process Missing Dmd/Cpcty Rows flags

#### 4. Update importRoles()
- Import new fields: CW Option, Req. Data Access
- Handle Plan Owner reference
- Process role metrics (Current Primary Count, Current Gap, etc.)

## 3. Import Process Flow Updates

### Current Flow:
1. Clear existing data (optional)
2. Import People
3. Import Projects  
4. Import Standard Allocations
5. Update supervisor relationships

### New Flow:
1. Clear existing data (optional)
2. Import Project Types
3. Import Project Phases (with abbreviation mapping)
4. Import Roles (with new fields)
5. Import People (from Roster)
6. Import Projects
7. Import Standard Allocations
8. Import Project Roadmap (timeline data)
9. Import Project Demand
10. Import Project Assignments
11. Update Plan Owner relationships
12. Process supervisor relationships

## 4. Error Handling Enhancements

### Add Validation For:
- Fiscal week format (YYFWnn)
- Plan Owner references exist
- Phase abbreviations are valid
- Project/Site parsing succeeds
- Allocation percentages are valid (0-100)
- Date range consistency

### Add Warnings For:
- Unknown phase abbreviations
- Missing Plan Owner references
- Fiscal weeks outside expected range
- Duplicate assignments in same period

## 5. Testing Requirements

### Test Cases to Add:
1. Import with fiscal week data
2. Project/Site parsing edge cases
3. Phase abbreviation mapping
4. Plan Owner relationship creation
5. Multiple assignments per person/project/week
6. Invalid fiscal week formats
7. Missing or unknown Plan Owners

## Implementation Priority

1. **High Priority:**
   - Parse Project/Site column
   - Fiscal week to date conversion
   - Basic import of new sheets
   - Phase abbreviation mapping

2. **Medium Priority:**
   - Plan Owner relationship handling
   - Role field updates (CW Option, Data Access)
   - Fiscal week data extraction

3. **Low Priority:**
   - Capacity gap validation
   - Advanced error reporting
   - Performance optimizations