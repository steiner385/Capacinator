-- Additional tables needed for integration tests

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Project types table
CREATE TABLE IF NOT EXISTS project_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Project subtypes table
CREATE TABLE IF NOT EXISTS project_sub_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  project_type_id TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_type_id) REFERENCES project_types(id)
);

-- User permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id TEXT NOT NULL,
  project_id TEXT,
  permission_type TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  PRIMARY KEY (user_id, project_id, permission_type)
);

-- User permission overrides table
CREATE TABLE IF NOT EXISTS user_permission_overrides (
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  override_type TEXT NOT NULL,
  override_value TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, project_id, override_type)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  created_at TEXT NOT NULL,
  read_at TEXT
);

-- Add missing columns to existing tables
-- Update projects table
ALTER TABLE projects ADD COLUMN project_type_id TEXT;
ALTER TABLE projects ADD COLUMN project_sub_type_id TEXT;
ALTER TABLE projects ADD COLUMN location_id TEXT;
ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'planning';
ALTER TABLE projects ADD COLUMN budget REAL;
ALTER TABLE projects ADD COLUMN created_by TEXT;
ALTER TABLE projects ADD COLUMN aspiration_start TEXT;
ALTER TABLE projects ADD COLUMN aspiration_finish TEXT;

-- Update project_assignments table  
ALTER TABLE project_assignments ADD COLUMN assignment_date_mode TEXT DEFAULT 'fixed';
ALTER TABLE project_assignments ADD COLUMN scenario_id TEXT;

-- Make start_date and end_date nullable for phase/project based assignments
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
CREATE TABLE project_assignments_new (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  phase_id TEXT,
  allocation_percentage INTEGER NOT NULL DEFAULT 100,
  start_date TEXT,
  end_date TEXT,
  computed_start_date TEXT,
  computed_end_date TEXT,
  assignment_date_mode TEXT DEFAULT 'fixed',
  scenario_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (person_id) REFERENCES people(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (phase_id) REFERENCES project_phases(id)
);

-- Copy data from old table
INSERT INTO project_assignments_new SELECT * FROM project_assignments;

-- Drop old table and rename new one
DROP TABLE project_assignments;
ALTER TABLE project_assignments_new RENAME TO project_assignments;

-- Update people table
ALTER TABLE people ADD COLUMN default_hours_per_day REAL DEFAULT 8;
ALTER TABLE people ADD COLUMN worker_type TEXT DEFAULT 'employee';

-- Person roles table
CREATE TABLE IF NOT EXISTS person_roles (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  proficiency_level TEXT DEFAULT 'Intermediate',
  is_primary INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (person_id) REFERENCES people(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Add is_active column to people table
ALTER TABLE people ADD COLUMN is_active INTEGER DEFAULT 1;

-- Create person_availability_view
CREATE VIEW IF NOT EXISTS person_availability_view AS
SELECT 
  p.id as person_id,
  p.name as person_name,
  p.default_availability_percentage,
  p.default_hours_per_day,
  -- For now, just use the default availability percentage
  -- In the future, this could be enhanced to consider date-specific overrides
  p.default_availability_percentage as effective_availability_percentage,
  p.default_hours_per_day as effective_hours_per_day
FROM people p
WHERE p.is_active = 1;

-- Scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  description TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Scenario project assignments table
CREATE TABLE IF NOT EXISTS scenario_project_assignments (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  phase_id TEXT,
  allocation_percentage INTEGER NOT NULL DEFAULT 100,
  assignment_date_mode TEXT DEFAULT 'fixed',
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id),
  FOREIGN KEY (person_id) REFERENCES people(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (phase_id) REFERENCES project_phases(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type_id);
CREATE INDEX IF NOT EXISTS idx_projects_location ON projects(location_id);
CREATE INDEX IF NOT EXISTS idx_assignments_person ON project_assignments(person_id);
CREATE INDEX IF NOT EXISTS idx_assignments_project ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_scenario ON project_assignments(scenario_id);

-- Add scenario_type column to scenarios table
ALTER TABLE scenarios ADD COLUMN scenario_type TEXT DEFAULT 'what-if';

-- Add resource_templates table needed for views
CREATE TABLE IF NOT EXISTS resource_templates (
  id TEXT PRIMARY KEY,
  project_sub_type_id TEXT,
  phase_id TEXT,
  role_id TEXT NOT NULL,
  allocation_percentage REAL NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_sub_type_id) REFERENCES project_sub_types(id),
  FOREIGN KEY (phase_id) REFERENCES project_phases(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Add person_availability_overrides table
CREATE TABLE IF NOT EXISTS person_availability_overrides (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  availability_percentage INTEGER NOT NULL DEFAULT 100,
  reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (person_id) REFERENCES people(id)
);

-- Add capacity_gaps_view for ReportingController tests
CREATE VIEW IF NOT EXISTS capacity_gaps_view AS
WITH role_capacity AS (
  SELECT 
    r.id as role_id,
    r.name as role_name,
    COUNT(DISTINCT p.id) as people_count,
    COALESCE(SUM(
      CASE 
        WHEN p.worker_type = 'FTE' THEN 1.0
        WHEN p.worker_type IN ('Contractor', 'Consultant') THEN 0.8
        ELSE 1.0
      END
    ), 0) as total_capacity_fte,
    COALESCE(SUM(p.default_hours_per_day), 0) as total_capacity_hours,
    0 as people_with_reduced_availability
  FROM roles r
  LEFT JOIN person_roles pr ON r.id = pr.role_id
  LEFT JOIN people p ON pr.person_id = p.id
  GROUP BY r.id, r.name
),
role_demand AS (
  SELECT 
    r.id as role_id,
    COALESCE(SUM(spa.allocation_percentage / 100.0), 0) as total_demand_fte,
    COALESCE(SUM((spa.allocation_percentage / 100.0) * 8.0), 0) as total_demand_hours
  FROM roles r
  LEFT JOIN scenario_project_assignments spa ON r.id = spa.role_id
  LEFT JOIN scenarios s ON spa.scenario_id = s.id
  WHERE s.status = 'active'
  AND spa.start_date <= date('now')
  AND spa.end_date >= date('now')
  GROUP BY r.id
)
SELECT 
  rc.role_id,
  rc.role_name,
  rc.people_count,
  rc.total_capacity_fte,
  rc.total_capacity_hours,
  rd.total_demand_fte,
  rd.total_demand_hours,
  (rc.total_capacity_fte - rd.total_demand_fte) as capacity_gap_fte,
  (rc.total_capacity_hours - rd.total_demand_hours) as capacity_gap_hours,
  rc.people_with_reduced_availability,
  CASE 
    WHEN rc.total_capacity_fte = 0 THEN 
      CASE WHEN rd.total_demand_fte > 0 THEN 999 ELSE 0 END
    ELSE (rd.total_demand_fte / rc.total_capacity_fte) * 100
  END as utilization_percentage
FROM role_capacity rc
LEFT JOIN role_demand rd ON rc.role_id = rd.role_id
ORDER BY rc.role_name;

-- Add project_health_view for ReportingController tests
CREATE VIEW IF NOT EXISTS project_health_view AS
SELECT 
  p.id,
  p.name,
  p.priority,
  p.aspiration_start,
  p.aspiration_finish,
  CASE 
    WHEN p.aspiration_finish < date('now') THEN 'overdue'
    WHEN p.aspiration_finish < date('now', '+30 days') THEN 'at_risk'
    ELSE 'on_track'
  END as health_status,
  0 as missing_roles,
  -- Add allocation percentage fields
  COALESCE((
    SELECT SUM(spa.allocation_percentage / 100.0)
    FROM scenario_project_assignments spa
    JOIN scenarios s ON spa.scenario_id = s.id
    WHERE spa.project_id = p.id
    AND s.status = 'active'
    AND spa.start_date <= date('now')
    AND spa.end_date >= date('now')
  ), 0) as total_allocation_percentage,
  -- Determine allocation health
  CASE 
    WHEN COALESCE((
      SELECT SUM(spa.allocation_percentage / 100.0)
      FROM scenario_project_assignments spa
      JOIN scenarios s ON spa.scenario_id = s.id
      WHERE spa.project_id = p.id
      AND s.status = 'active'
      AND spa.start_date <= date('now')
      AND spa.end_date >= date('now')
    ), 0) = 0 THEN 'UNDER_ALLOCATED'
    WHEN COALESCE((
      SELECT SUM(spa.allocation_percentage / 100.0)
      FROM scenario_project_assignments spa
      JOIN scenarios s ON spa.scenario_id = s.id
      WHERE spa.project_id = p.id
      AND s.status = 'active'
      AND spa.start_date <= date('now')
      AND spa.end_date >= date('now')
    ), 0) < 0.8 THEN 'UNDER_ALLOCATED'
    ELSE 'OK'
  END as allocation_health
FROM projects p;

-- Add assignments_view for AssignmentsController conflict checking
CREATE VIEW IF NOT EXISTS assignments_view AS
SELECT 
  spa.id,
  spa.scenario_id,
  spa.project_id,
  spa.person_id,
  spa.role_id,
  spa.phase_id,
  spa.allocation_percentage,
  spa.assignment_date_mode,
  spa.start_date,
  spa.end_date,
  -- Compute dates based on project/phase if needed
  COALESCE(spa.start_date, p.aspiration_start) as computed_start_date,
  COALESCE(spa.end_date, p.aspiration_finish) as computed_end_date,
  spa.created_at,
  spa.updated_at
FROM scenario_project_assignments spa
INNER JOIN projects p ON spa.project_id = p.id;