# Capacinator Database Schema

## Core Entities

### Locations
- id (UUID, PK)
- name (String, unique)
- description (Text)
- created_at (Timestamp)
- updated_at (Timestamp)

### Project Types
- id (UUID, PK)
- name (String, unique)
- description (Text)
- color_code (String) // for UI visualization
- created_at (Timestamp)
- updated_at (Timestamp)

### Project Phases
- id (UUID, PK)
- name (String, unique)
- description (Text)
- order_index (Integer) // for sequencing
- created_at (Timestamp)
- updated_at (Timestamp)

### Roles
- id (UUID, PK)
- name (String, unique)
- description (Text)
- plan_owner_id (FK -> People) // Person responsible for capacity planning
- created_at (Timestamp)
- updated_at (Timestamp)

### Projects
- id (UUID, PK)
- name (String)
- project_type_id (FK -> Project Types)
- location_id (FK -> Locations)
- priority (Integer)
- description (Text)
- data_restrictions (Text)
- include_in_demand (Boolean)
- aspiration_start (Date)
- aspiration_finish (Date)
- created_at (Timestamp)
- updated_at (Timestamp)

### People
- id (UUID, PK)
- name (String)
- email (String, unique)
- primary_role_id (FK -> Roles)
- worker_type (Enum: 'FTE', 'Contractor', 'Consultant')
- created_at (Timestamp)
- updated_at (Timestamp)

## Relationship Tables

### Person Roles (Many-to-Many)
- id (UUID, PK)
- person_id (FK -> People)
- role_id (FK -> Roles)
- proficiency_level (Integer 1-5)
- is_primary (Boolean)

### Standard Allocations
- id (UUID, PK)
- project_type_id (FK -> Project Types)
- phase_id (FK -> Project Phases)
- role_id (FK -> Roles)
- allocation_percentage (Decimal)
- created_at (Timestamp)
- updated_at (Timestamp)
- UNIQUE(project_type_id, phase_id, role_id)

### Project Demands
- id (UUID, PK)
- project_id (FK -> Projects)
- phase_id (FK -> Project Phases)
- role_id (FK -> Roles)
- start_date (Date)
- end_date (Date)
- demand_hours (Decimal)
- is_override (Boolean) // true if manually overridden
- created_at (Timestamp)
- updated_at (Timestamp)

### Project Assignments
- id (UUID, PK)
- project_id (FK -> Projects)
- person_id (FK -> People)
- role_id (FK -> Roles)
- phase_id (FK -> Project Phases)
- start_date (Date)
- end_date (Date)
- allocation_percentage (Decimal)
- created_at (Timestamp)
- updated_at (Timestamp)

### Person Availability
- id (UUID, PK)
- person_id (FK -> People)
- date (Date)
- available_hours (Decimal)
- created_at (Timestamp)
- updated_at (Timestamp)
- UNIQUE(person_id, date)

## Views/Calculated Tables

### Capacity Analysis View
- Aggregates assignments vs availability by person/role/time period
- Calculates over/under capacity
- Identifies resource gaps

### Project Roadmap View
- Timeline visualization of all projects with phases
- Shows resource allocation over time

### Resource Utilization View
- Person-by-person utilization rates
- Role-based capacity analysis