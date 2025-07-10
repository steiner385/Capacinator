# Capacinator Test Cases

## 1. Master Data Management Tests

### 1.1 Location Management
- **TC-LOC-001**: Create new location with valid data
- **TC-LOC-002**: Prevent duplicate location names
- **TC-LOC-003**: Update location name and verify project associations
- **TC-LOC-004**: Delete location with no associated projects
- **TC-LOC-005**: Prevent deletion of location with active projects

### 1.2 Project Type Management
- **TC-PT-001**: Create project type with standard allocations
- **TC-PT-002**: Modify project type and verify allocation updates
- **TC-PT-003**: Clone project type with allocations
- **TC-PT-004**: Delete project type cascades to allocations

### 1.3 Phase Management
- **TC-PH-001**: Create phases with correct ordering
- **TC-PH-002**: Reorder phases via drag-and-drop
- **TC-PH-003**: Validate phase date ranges
- **TC-PH-004**: Prevent circular phase dependencies

## 2. Resource Management Tests

### 2.1 Team Roster
- **TC-TM-001**: Add person with primary role
- **TC-TM-002**: Assign multiple secondary roles
- **TC-TM-003**: Update proficiency levels
- **TC-TM-004**: Change worker type and verify calculations
- **TC-TM-005**: Set person as plan owner

### 2.2 Availability
- **TC-AV-001**: Set standard working hours
- **TC-AV-002**: Add vacation dates
- **TC-AV-003**: Override specific date availability
- **TC-AV-004**: Calculate net available hours

## 3. Project Planning Tests

### 3.1 Project Creation
- **TC-PR-001**: Create project with all required fields
- **TC-PR-002**: Validate aspiration dates logic
- **TC-PR-003**: Set project priority and verify sorting
- **TC-PR-004**: Apply data restrictions

### 3.2 Demand Calculation
- **TC-DM-001**: Auto-calculate demand from standard allocations
- **TC-DM-002**: Override demand for specific phase
- **TC-DM-003**: Override demand for date range
- **TC-DM-004**: Verify demand totals by role

### 3.3 Resource Assignment
- **TC-AS-001**: Assign qualified person to project
- **TC-AS-002**: Prevent overallocation (>100%)
- **TC-AS-003**: Assign person in secondary role
- **TC-AS-004**: Bulk assign team to project

## 4. Capacity Analysis Tests

### 4.1 Utilization Calculations
- **TC-UT-001**: Calculate person utilization by week
- **TC-UT-002**: Calculate role utilization across org
- **TC-UT-003**: Show under-allocated resources
- **TC-UT-004**: Identify capacity bottlenecks

### 4.2 Gap Analysis
- **TC-GA-001**: Identify unfilled demands
- **TC-GA-002**: Match available resources to gaps
- **TC-GA-003**: Priority-based gap filling
- **TC-GA-004**: Generate gap reports

## 5. Import/Export Tests

### 5.1 Excel Import
- **TC-IM-001**: Import valid Excel file
- **TC-IM-002**: Handle missing required columns
- **TC-IM-003**: Validate data types and formats
- **TC-IM-004**: Report import errors with details
- **TC-IM-005**: Update existing records
- **TC-IM-006**: Import with foreign key relationships

### 5.2 Excel Export
- **TC-EX-001**: Export all projects to Excel
- **TC-EX-002**: Export filtered data set
- **TC-EX-003**: Include calculated fields
- **TC-EX-004**: Maintain Excel formatting

## 6. Integration Tests

### 6.1 End-to-End Workflows
- **TC-E2E-001**: Complete project lifecycle
- **TC-E2E-002**: Resource reallocation workflow
- **TC-E2E-003**: Capacity planning for new project
- **TC-E2E-004**: Bulk import and verify calculations

### 6.2 Real-time Updates
- **TC-RT-001**: Update propagates to all users
- **TC-RT-002**: Concurrent edit handling
- **TC-RT-003**: Offline/online synchronization
- **TC-RT-004**: WebSocket connection recovery

## 7. Performance Tests

### 7.1 Load Testing
- **TC-PERF-001**: Load 10,000 projects
- **TC-PERF-002**: Calculate capacity for 1,000 resources
- **TC-PERF-003**: Generate report for 1-year timeline
- **TC-PERF-004**: Handle 100 concurrent users

### 7.2 Response Time
- **TC-RESP-001**: Page load < 2 seconds
- **TC-RESP-002**: Search results < 500ms
- **TC-RESP-003**: Report generation < 5 seconds
- **TC-RESP-004**: Excel import < 30 seconds for 5MB file

## 8. Security Tests

### 8.1 Authentication
- **TC-SEC-001**: Valid login credentials
- **TC-SEC-002**: Invalid login attempts
- **TC-SEC-003**: Password reset flow
- **TC-SEC-004**: Session timeout

### 8.2 Authorization
- **TC-AUTH-001**: Role-based access control
- **TC-AUTH-002**: API endpoint protection
- **TC-AUTH-003**: Data visibility rules
- **TC-AUTH-004**: Audit trail generation

## Test Data Requirements

1. **Locations**: 10 test locations
2. **Project Types**: 5 types with different allocations
3. **Phases**: 8 standard phases
4. **Roles**: 15 different roles
5. **People**: 50 test users with various roles
6. **Projects**: 100 test projects across 2 years
7. **Excel Files**: Sample files with valid/invalid data

## Acceptance Criteria

- All test cases must pass for release
- Performance tests meet defined thresholds
- Security tests show no vulnerabilities
- Import/Export maintains data integrity
- Real-time features work across browsers