# Capacinator Requirements

## Functional Requirements

### 1. Master Data Management

#### 1.1 Locations
- Create, read, update, delete locations
- Assign projects to locations
- Location-based filtering in reports

#### 1.2 Project Types
- Define custom project types with unique identifiers
- Associate default resource allocations per type
- Color coding for visual distinction

#### 1.3 Project Phases
- Create custom phases with ordering
- Define phase durations and dependencies
- Phase templates for common workflows

#### 1.4 Roles
- Define organizational roles
- Set role descriptions and required skills
- Role hierarchy for reporting

### 2. Resource Management

#### 2.1 Team Rosters
- Add team members with primary roles
- Assign multiple secondary roles with proficiency levels
- Track worker types (FTE, Contractor, Consultant)
- Identify plan owners

#### 2.2 Availability Management
- Set standard working hours per person
- Define vacation/leave schedules
- Override availability for specific dates

### 3. Project Planning

#### 3.1 Project Definition
- Create projects with type, location, priority
- Set aspiration start/end dates
- Define data restrictions and compliance needs

#### 3.2 Demand Planning
- Automatic demand calculation from standard allocations
- Override demands for specific phases/timeframes
- Visual demand timeline editor

#### 3.3 Resource Assignment
- Assign people to projects by role
- Set allocation percentages
- Validate against availability

### 4. Capacity Analysis

#### 4.1 Real-time Calculations
- Show current utilization by person/role
- Identify over/under allocated resources
- Project future capacity needs

#### 4.2 Gap Analysis
- Highlight unfilled demands
- Suggest available resources
- Priority-based allocation recommendations

### 5. Reporting & Visualization

#### 5.1 Standard Reports
- Resource utilization by time period
- Project timeline/roadmap view
- Capacity vs demand analysis
- Role-based availability

#### 5.2 Custom Reports
- Configurable report builder
- Export to Excel/PDF
- Scheduled report generation

### 6. Data Import/Export

#### 6.1 Excel Import
- Map Excel columns to database fields
- Validate data integrity
- Handle updates vs new records
- Error reporting with row/column details

#### 6.2 Data Export
- Export all data to Excel format
- Maintain original structure option
- Include calculated fields

## Non-Functional Requirements

### 1. Performance
- Page load time < 2 seconds
- Support 100+ concurrent users
- Handle 10,000+ projects
- Real-time updates < 500ms

### 2. Usability
- Intuitive navigation
- Keyboard shortcuts
- Responsive design (desktop priority)
- Contextual help

### 3. Security
- User authentication required
- Role-based permissions
- Audit trail for all changes
- Secure API endpoints

### 4. Reliability
- 99.9% uptime
- Automated backups
- Data recovery procedures
- Graceful error handling

### 5. Scalability
- Horizontal scaling capability
- Database partitioning ready
- Microservices architecture compatible

### 6. Compatibility
- Chrome, Firefox, Edge support
- Windows, Mac, Linux desktop app
- Excel 2016+ for imports/exports

## Business Rules

1. **Allocation Constraints**
   - No person can be allocated > 100% in any time period
   - Project demands must be met by qualified roles
   - Higher priority projects get preference

2. **Data Integrity**
   - Projects must have valid type and location
   - Dates must be within reasonable bounds (±5 years)
   - Deletion requires cascade handling

3. **Workflow Rules**
   - Changes to assignments notify affected parties
   - Capacity warnings at 80% threshold
   - Approval required for overallocation

## Success Criteria

1. **Migration Success**
   - All Excel data imported without loss
   - Historical data preserved
   - Calculations match Excel results

2. **User Adoption**
   - 90% user satisfaction
   - Reduced planning time by 50%
   - Increased accuracy in forecasting

3. **System Performance**
   - Support 3x current data volume
   - Real-time updates across all users
   - Zero data loss incidents