# Implementation Plan for Enabling Skipped Tests

## Executive Summary

This document outlines a comprehensive plan to enable the remaining 40 skipped tests across the Capacinator codebase. The plan is organized by priority and includes specific implementation steps, estimated timelines, and success criteria.

## Current State Analysis

### Skipped Test Summary
- **Total Skipped Tests**: 40
- **Test Files Affected**: 12
- **Categories**: 5 main issue types

### Breakdown by Category

1. **Cascade Logic Implementation** (7 tests)
   - assignment-phase-alignment.test.ts: 2 tests
   - phase-dependencies-performance.test.ts: 2 tests
   - phase-dependencies-api.test.ts: 1 test
   - scenario-operations.test.ts: 2 tests (computed dates)

2. **Missing Database Views** (3 tests)
   - scenario-operations.test.ts: scenario_assignments_view required

3. **Test Data Requirements** (12 tests)
   - utilization-modals tests: Need over-utilized people
   - assignment tests: Need conflict scenarios
   - scenario tests: Need draft scenarios

4. **UI Implementation Gaps** (11 tests)
   - Inline editing features not implemented
   - Missing location filters
   - Phase duplication UI incomplete

5. **Architecture/Design Issues** (7 tests)
   - ProjectsController: Too tightly coupled to database
   - PersonDetails: Client-side test setup issues

## Implementation Plan

### Phase 1: Database Infrastructure (Week 1)
**Priority: HIGH**
**Effort: 3-5 days**

#### 1.1 Create scenario_assignments_view

```sql
CREATE VIEW scenario_assignments_view AS
SELECT 
  spa.*,
  sp.name as project_name,
  sp.aspiration_start as project_start,
  sp.aspiration_finish as project_finish,
  p.name as person_name,
  r.name as role_name,
  ph.name as phase_name,
  -- Computed dates based on assignment_date_mode
  CASE 
    WHEN spa.assignment_date_mode = 'fixed' THEN spa.start_date
    WHEN spa.assignment_date_mode = 'project' THEN sp.aspiration_start
    WHEN spa.assignment_date_mode = 'phase' THEN ppt.start_date
  END as computed_start_date,
  CASE 
    WHEN spa.assignment_date_mode = 'fixed' THEN spa.end_date
    WHEN spa.assignment_date_mode = 'project' THEN sp.aspiration_finish
    WHEN spa.assignment_date_mode = 'phase' THEN ppt.end_date
  END as computed_end_date
FROM scenario_project_assignments spa
JOIN scenario_projects sp ON spa.project_id = sp.id
JOIN people p ON spa.person_id = p.id
JOIN roles r ON spa.role_id = r.id
LEFT JOIN project_phases ph ON spa.phase_id = ph.id
LEFT JOIN project_phases_timeline ppt ON spa.phase_id = ppt.phase_id 
  AND ppt.project_id = spa.project_id;
```

**Tasks:**
- [ ] Create migration for the view
- [ ] Add view to test schema
- [ ] Update TypeScript types
- [ ] Test view performance

#### 1.2 Add Missing Constraints

```sql
-- Add unique constraint for scenario assignments
ALTER TABLE scenario_project_assignments
ADD CONSTRAINT uk_scenario_assignment 
UNIQUE (scenario_id, project_id, person_id, role_id, phase_id);
```

**Tasks:**
- [ ] Create migration for constraints
- [ ] Update test schema
- [ ] Verify constraint behavior

### Phase 2: Cascade Service Implementation (Week 2-3)
**Priority: HIGH**
**Effort: 5-7 days**

#### 2.1 Complete ProjectPhaseCascadeService

The cascade service needs to properly handle:
1. Dependency graph traversal
2. Date calculations with lag days
3. Circular dependency detection
4. Conflict resolution

**Implementation Steps:**

```typescript
// src/server/services/ProjectPhaseCascadeService.ts
private async findAffectedPhases(
  dependencyGraph: Map<string, ProjectPhaseDependency[]>,
  changedPhaseId: string,
  newStartDate: Date,
  newEndDate: Date
): Promise<CascadeCalculation[]> {
  const affected: CascadeCalculation[] = [];
  const visited = new Set<string>();
  const queue: Array<{phaseId: string, dates: {start: Date, end: Date}}> = [];
  
  // Start with direct dependents
  const directDependents = dependencyGraph.get(changedPhaseId) || [];
  for (const dep of directDependents) {
    queue.push({
      phaseId: dep.successor_phase_timeline_id,
      dates: this.calculateDependentDates(dep, newStartDate, newEndDate)
    });
  }
  
  // Process queue (breadth-first)
  while (queue.length > 0) {
    const {phaseId, dates} = queue.shift()!;
    
    if (visited.has(phaseId)) continue;
    visited.add(phaseId);
    
    // Get phase details
    const phase = await this.getPhaseDetails(phaseId);
    
    // Add to affected list
    affected.push({
      phase_timeline_id: phaseId,
      phase_name: phase.name,
      current_start_date: phase.start_date,
      current_end_date: phase.end_date,
      new_start_date: this.formatDateSafe(dates.start),
      new_end_date: this.formatDateSafe(dates.end),
      dependency_type: 'FS', // Get from dependency
      lag_days: 0, // Get from dependency
      affects_count: 0 // Will calculate later
    });
    
    // Add dependents to queue
    const dependents = dependencyGraph.get(phaseId) || [];
    for (const dep of dependents) {
      queue.push({
        phaseId: dep.successor_phase_timeline_id,
        dates: this.calculateDependentDates(dep, dates.start, dates.end)
      });
    }
  }
  
  return affected;
}

private calculateDependentDates(
  dependency: ProjectPhaseDependency,
  predStart: Date,
  predEnd: Date
): {start: Date, end: Date} {
  const lagDays = dependency.lag_days || 0;
  
  switch (dependency.dependency_type) {
    case 'FS': // Finish-to-Start
      const newStart = new Date(predEnd);
      newStart.setDate(newStart.getDate() + lagDays + 1);
      const duration = this.calculateDuration(/* original phase dates */);
      const newEnd = new Date(newStart);
      newEnd.setDate(newEnd.getDate() + duration);
      return {start: newStart, end: newEnd};
      
    case 'FF': // Finish-to-Finish
      // Implementation for FF
      break;
      
    case 'SS': // Start-to-Start
      // Implementation for SS
      break;
      
    case 'SF': // Start-to-Finish
      // Implementation for SF
      break;
  }
}
```

**Tasks:**
- [ ] Implement dependency graph building
- [ ] Implement date calculation for all dependency types
- [ ] Add circular dependency detection
- [ ] Update AssignmentRecalculationService integration
- [ ] Add comprehensive unit tests

### Phase 3: Test Data Factory Enhancement (Week 4)
**Priority: MEDIUM**
**Effort: 3-4 days**

#### 3.1 Create Comprehensive Test Data Builder

```typescript
// tests/helpers/test-data-builder.ts
export class TestDataBuilder {
  private db: Knex;
  
  async createOverUtilizedPerson(options?: {
    utilizationPercentage?: number;
    projectCount?: number;
  }): Promise<Person> {
    const person = await this.createPerson();
    const projects = await this.createProjects(options?.projectCount || 3);
    
    // Create assignments that exceed 100% utilization
    for (const project of projects) {
      await this.createAssignment({
        person_id: person.id,
        project_id: project.id,
        allocation_percentage: options?.utilizationPercentage || 50
      });
    }
    
    return person;
  }
  
  async createConflictingAssignments(personId: string): Promise<Assignment[]> {
    // Create overlapping assignments
    const baseDate = new Date('2024-01-01');
    
    return Promise.all([
      this.createAssignment({
        person_id: personId,
        start_date: baseDate,
        end_date: new Date('2024-03-31'),
        allocation_percentage: 60
      }),
      this.createAssignment({
        person_id: personId,
        start_date: new Date('2024-02-01'),
        end_date: new Date('2024-04-30'),
        allocation_percentage: 50
      })
    ]);
  }
  
  async createScenarioWithDrafts(): Promise<Scenario> {
    const scenario = await this.createScenario({status: 'draft'});
    
    // Add test projects and assignments
    await this.createScenarioProject({
      scenario_id: scenario.id,
      change_type: 'modified'
    });
    
    return scenario;
  }
}
```

**Tasks:**
- [ ] Implement test data builder class
- [ ] Add methods for all test scenarios
- [ ] Update existing tests to use builder
- [ ] Document test data patterns

### Phase 4: UI Component Implementation (Week 5)
**Priority: MEDIUM**
**Effort: 5-7 days**

#### 4.1 Implement Inline Editing for Tables

```typescript
// client/src/components/tables/EditableCell.tsx
export function EditableCell({
  value,
  row,
  column,
  updateData
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  
  const handleSave = async () => {
    try {
      await updateData(row.original.id, column.id, editValue);
      setIsEditing(false);
    } catch (error) {
      // Handle error
    }
  };
  
  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') setIsEditing(false);
        }}
        autoFocus
      />
    );
  }
  
  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="cursor-pointer hover:bg-gray-100"
    >
      {value}
    </div>
  );
}
```

**Tasks:**
- [ ] Create EditableCell component
- [ ] Implement for allocation percentage
- [ ] Implement for notes field
- [ ] Add keyboard navigation
- [ ] Add validation
- [ ] Update table configurations

#### 4.2 Add Missing UI Controls

```typescript
// Location filter component
export function LocationFilter({
  locations,
  selectedLocation,
  onLocationChange
}: LocationFilterProps) {
  return (
    <Select
      value={selectedLocation}
      onValueChange={onLocationChange}
    >
      <SelectTrigger>
        <SelectValue placeholder="Filter by location" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Locations</SelectItem>
        {locations.map(location => (
          <SelectItem key={location.id} value={location.id}>
            {location.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

**Tasks:**
- [ ] Implement location filter
- [ ] Add to relevant pages
- [ ] Implement filter logic
- [ ] Update tests

### Phase 5: Architecture Improvements (Week 6)
**Priority: LOW**
**Effort: 3-5 days**

#### 5.1 Refactor ProjectsController for Testability

```typescript
// Extract query building logic
export class ProjectQueryBuilder {
  constructor(private db: Knex) {}
  
  buildProjectsQuery(filters: ProjectFilters) {
    return this.db('projects')
      .leftJoin('locations', 'projects.location_id', 'locations.id')
      // ... other joins
      .select(this.getSelectColumns());
  }
  
  private getSelectColumns() {
    return [
      'projects.*',
      'locations.name as location_name',
      // ... other columns
    ];
  }
}

// Simplified controller
export class ProjectsController extends BaseController {
  private queryBuilder: ProjectQueryBuilder;
  
  constructor() {
    super();
    this.queryBuilder = new ProjectQueryBuilder(this.db);
  }
  
  async getAll(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      return this.queryBuilder.buildProjectsQuery(req.query);
    });
    
    res.json(result);
  }
}
```

**Tasks:**
- [ ] Extract query builder
- [ ] Create repository pattern
- [ ] Update controller
- [ ] Create unit tests
- [ ] Update integration tests

## Success Metrics

1. **Test Coverage**
   - Reduce skipped tests from 40 to < 5
   - Achieve > 95% test pass rate
   - Maintain < 2s average test execution time

2. **Code Quality**
   - All new code has > 80% test coverage
   - No new technical debt introduced
   - All implementations follow established patterns

3. **Timeline Adherence**
   - Complete Phase 1-2 within 3 weeks
   - Complete all phases within 6 weeks
   - Weekly progress updates

## Risk Mitigation

1. **Cascade Logic Complexity**
   - Risk: Complex edge cases in dependency calculations
   - Mitigation: Incremental implementation with extensive testing

2. **Database Performance**
   - Risk: Views may impact query performance
   - Mitigation: Add proper indexes, monitor query execution

3. **UI Regressions**
   - Risk: New features may break existing functionality
   - Mitigation: Comprehensive E2E tests, feature flags

## Next Steps

1. **Week 1**: Start with database infrastructure (Phase 1)
2. **Week 2-3**: Implement cascade service (Phase 2)
3. **Week 4**: Enhance test data factory (Phase 3)
4. **Week 5**: Complete UI implementations (Phase 4)
5. **Week 6**: Architecture improvements and cleanup (Phase 5)

## Conclusion

This plan provides a systematic approach to enabling all skipped tests. By addressing the root causes rather than just the symptoms, we'll improve the overall quality and maintainability of the codebase.