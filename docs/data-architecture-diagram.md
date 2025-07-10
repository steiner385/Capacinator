# Data Architecture Diagram

## Entity Relationship Diagram

```mermaid
erDiagram
    LOCATIONS {
        uuid id PK
        string name UK
        text description
        timestamp created_at
        timestamp updated_at
    }
    
    PROJECT_TYPES {
        uuid id PK
        string name UK
        text description
        string color_code
        timestamp created_at
        timestamp updated_at
    }
    
    PROJECT_PHASES {
        uuid id PK
        string name UK
        text description
        integer order_index
        timestamp created_at
        timestamp updated_at
    }
    
    ROLES {
        uuid id PK
        string name UK
        string external_id UK
        text description
        uuid plan_owner_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    PROJECTS {
        uuid id PK
        string name
        uuid project_type_id FK
        uuid location_id FK
        integer priority
        text description
        text data_restrictions
        boolean include_in_demand
        date aspiration_start
        date aspiration_finish
        string external_id UK
        timestamp created_at
        timestamp updated_at
    }
    
    PEOPLE {
        uuid id PK
        string name
        string email UK
        uuid primary_role_id FK
        enum worker_type
        timestamp created_at
        timestamp updated_at
    }
    
    PERSON_ROLES {
        uuid id PK
        uuid person_id FK
        uuid role_id FK
        integer proficiency_level
        boolean is_primary
    }
    
    STANDARD_ALLOCATIONS {
        uuid id PK
        uuid project_type_id FK
        uuid phase_id FK
        uuid role_id FK
        decimal allocation_percentage
        timestamp created_at
        timestamp updated_at
    }
    
    PROJECT_DEMANDS {
        uuid id PK
        uuid project_id FK
        uuid phase_id FK
        uuid role_id FK
        date start_date
        date end_date
        decimal demand_hours
        boolean is_override
        timestamp created_at
        timestamp updated_at
    }
    
    PROJECT_ASSIGNMENTS {
        uuid id PK
        uuid project_id FK
        uuid person_id FK
        uuid role_id FK
        uuid phase_id FK
        date start_date
        date end_date
        decimal allocation_percentage
        timestamp created_at
        timestamp updated_at
    }
    
    PERSON_AVAILABILITY {
        uuid id PK
        uuid person_id FK
        date date
        decimal available_hours
        timestamp created_at
        timestamp updated_at
    }

    %% Relationships
    PROJECTS ||--o{ PROJECT_TYPES : "has type"
    PROJECTS ||--o{ LOCATIONS : "at location"
    PEOPLE ||--o{ ROLES : "has primary role"
    PEOPLE ||--o{ ROLES : "plan owner for"
    PEOPLE ||--o{ PERSON_ROLES : "has roles"
    ROLES ||--o{ PERSON_ROLES : "assigned to"
    PROJECT_TYPES ||--o{ STANDARD_ALLOCATIONS : "has allocations"
    PROJECT_PHASES ||--o{ STANDARD_ALLOCATIONS : "for phase"
    ROLES ||--o{ STANDARD_ALLOCATIONS : "for role"
    PROJECTS ||--o{ PROJECT_DEMANDS : "has demands"
    PROJECT_PHASES ||--o{ PROJECT_DEMANDS : "for phase"
    ROLES ||--o{ PROJECT_DEMANDS : "for role"
    PROJECTS ||--o{ PROJECT_ASSIGNMENTS : "has assignments"
    PEOPLE ||--o{ PROJECT_ASSIGNMENTS : "assigned to"
    ROLES ||--o{ PROJECT_ASSIGNMENTS : "in role"
    PROJECT_PHASES ||--o{ PROJECT_ASSIGNMENTS : "for phase"
    PEOPLE ||--o{ PERSON_AVAILABILITY : "has availability"
```

## Data Flow Diagram

```mermaid
flowchart TB
    subgraph "Master Data"
        L[Locations]
        PT[Project Types]
        PP[Project Phases]
        R[Roles]
    end
    
    subgraph "Resource Management"
        P[People]
        PR[Person Roles]
        PA[Person Availability]
    end
    
    subgraph "Project Planning"
        PRJ[Projects]
        SA[Standard Allocations]
        PD[Project Demands]
        PAS[Project Assignments]
    end
    
    subgraph "Data Sources"
        EX[Excel Import]
        UI[User Interface]
    end
    
    subgraph "Outputs"
        CAP[Capacity Analysis]
        GAP[Gap Reports]
        UTIL[Utilization Reports]
        TL[Timeline Views]
    end
    
    %% Data flow
    EX --> L
    EX --> PT
    EX --> PP
    EX --> R
    EX --> P
    EX --> PRJ
    
    UI --> L
    UI --> PT
    UI --> PP
    UI --> R
    UI --> P
    UI --> PRJ
    
    PT --> SA
    PP --> SA
    R --> SA
    
    SA --> PD
    PRJ --> PD
    
    P --> PR
    R --> PR
    
    PRJ --> PAS
    P --> PAS
    R --> PAS
    PP --> PAS
    
    P --> PA
    
    PD --> CAP
    PAS --> CAP
    PA --> CAP
    
    CAP --> GAP
    CAP --> UTIL
    
    PRJ --> TL
    PAS --> TL
    PD --> TL
```

## Data Hierarchy

```mermaid
graph TD
    subgraph "Configuration Layer"
        A[Locations]
        B[Project Types]
        C[Project Phases]
        D[Roles]
    end
    
    subgraph "Template Layer"
        E[Standard Allocations<br/>per Project Type/Phase/Role]
    end
    
    subgraph "Resource Layer"
        F[People]
        G[Person-Role Mappings]
        H[Availability Calendar]
    end
    
    subgraph "Project Layer"
        I[Projects]
        J[Project Demands<br/>Default or Override]
        K[Project Assignments]
    end
    
    subgraph "Analysis Layer"
        L[Capacity Calculations]
        M[Gap Analysis]
        N[Utilization Metrics]
    end
    
    B --> E
    C --> E
    D --> E
    
    E --> J
    I --> J
    
    F --> G
    D --> G
    
    F --> H
    
    I --> K
    F --> K
    G --> K
    
    J --> L
    K --> L
    H --> L
    
    L --> M
    L --> N
```

## Key Relationships Explained

### 1. **Standard Allocations → Project Demands**
- When a project is created with a specific type, standard allocations automatically generate default demands
- These can be overridden for specific date ranges

### 2. **People → Roles (Many-to-Many)**
- Each person has one primary role
- Can have multiple secondary roles with proficiency levels
- This enables flexible resource assignment

### 3. **Projects → Assignments → People**
- Projects have demands (what's needed)
- Assignments link people to projects (who's doing it)
- Assignments must respect person's available roles

### 4. **Availability → Capacity**
- Person availability sets working hours per day
- Assignments consume available capacity
- System calculates utilization and gaps

## Data Integrity Rules

1. **Cascading Deletes**:
   - Deleting a person removes their assignments and availability
   - Deleting a project removes its demands and assignments
   - Cannot delete roles/phases/types with active projects

2. **Unique Constraints**:
   - One standard allocation per project type/phase/role combination
   - One availability entry per person/date
   - Unique person-role combinations

3. **Business Rules**:
   - Assignment dates must fall within project dates
   - Allocation percentages cannot exceed 100% per person/day
   - Demands must have valid start/end dates