-- Minimal test schema for integration tests
-- This creates only the tables needed for testing without running full migrations

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  include_in_demand INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Project phases master table
CREATE TABLE IF NOT EXISTS project_phases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Project phases timeline table
CREATE TABLE IF NOT EXISTS project_phases_timeline (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  phase_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (phase_id) REFERENCES project_phases(id)
);

-- Project phase dependencies table
CREATE TABLE IF NOT EXISTS project_phase_dependencies (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  predecessor_phase_timeline_id TEXT NOT NULL,
  successor_phase_timeline_id TEXT NOT NULL,
  dependency_type TEXT NOT NULL DEFAULT 'FS',
  lag_days INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (predecessor_phase_timeline_id) REFERENCES project_phases_timeline(id),
  FOREIGN KEY (successor_phase_timeline_id) REFERENCES project_phases_timeline(id)
);

-- Roles table (needed for seeds)
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  external_id TEXT,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- People table
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  location_id TEXT,
  default_availability_percentage REAL DEFAULT 100,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  phase_id TEXT,
  allocation_percentage INTEGER NOT NULL DEFAULT 100,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  computed_start_date TEXT,
  computed_end_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (person_id) REFERENCES people(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (phase_id) REFERENCES project_phases(id)
);

-- Project assignments table (alias for compatibility)
CREATE TABLE IF NOT EXISTS project_assignments (
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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (person_id) REFERENCES people(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (phase_id) REFERENCES project_phases(id)
);

-- Person availability overrides table
CREATE TABLE IF NOT EXISTS person_availability_overrides (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  availability_percentage REAL NOT NULL,
  override_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (person_id) REFERENCES people(id)
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_values TEXT,
  new_values TEXT,
  changed_fields TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  request_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  comment TEXT,
  parent_id TEXT,
  is_undo INTEGER DEFAULT 0
);

-- Scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_scenario_id TEXT,
  created_by TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  scenario_type TEXT DEFAULT 'branch',
  branch_point TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_scenario_id) REFERENCES scenarios(id),
  FOREIGN KEY (created_by) REFERENCES people(id)
);

-- Scenario project assignments table
CREATE TABLE IF NOT EXISTS scenario_project_assignments (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  phase_id TEXT,
  allocation_percentage REAL NOT NULL,
  assignment_date_mode TEXT DEFAULT 'project',
  start_date TEXT,
  end_date TEXT,
  computed_start_date TEXT,
  computed_end_date TEXT,
  base_assignment_id TEXT,
  change_type TEXT DEFAULT 'added',
  is_billable INTEGER DEFAULT 1,
  is_aspirational INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (person_id) REFERENCES people(id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (phase_id) REFERENCES project_phases(id),
  FOREIGN KEY (base_assignment_id) REFERENCES project_assignments(id),
  UNIQUE (scenario_id, project_id, person_id, role_id, phase_id)
);

-- Scenario project phases table
CREATE TABLE IF NOT EXISTS scenario_project_phases (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  phase_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  notes TEXT,
  change_type TEXT DEFAULT 'added',
  base_phase_timeline_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (phase_id) REFERENCES project_phases(id),
  FOREIGN KEY (base_phase_timeline_id) REFERENCES project_phases_timeline(id)
);

-- Scenario projects table
CREATE TABLE IF NOT EXISTS scenario_projects (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  name TEXT,
  priority INTEGER,
  aspiration_start TEXT,
  aspiration_finish TEXT,
  change_type TEXT DEFAULT 'modified',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Scenario merge conflicts table
CREATE TABLE IF NOT EXISTS scenario_merge_conflicts (
  id TEXT PRIMARY KEY,
  source_scenario_id TEXT NOT NULL,
  target_scenario_id TEXT NOT NULL,
  conflict_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  source_data TEXT NOT NULL,
  target_data TEXT NOT NULL,
  resolution TEXT DEFAULT 'pending',
  resolved_data TEXT,
  resolved_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (source_scenario_id) REFERENCES scenarios(id),
  FOREIGN KEY (target_scenario_id) REFERENCES scenarios(id),
  FOREIGN KEY (resolved_by) REFERENCES people(id)
);

-- Scenario assignments view
CREATE VIEW IF NOT EXISTS scenario_assignments_view AS
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
  spa.base_assignment_id,
  spa.change_type,
  spa.is_billable,
  spa.is_aspirational,
  spa.notes,
  spa.created_at,
  spa.updated_at,
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
    WHEN spa.assignment_date_mode = 'phase' THEN spp.start_date
  END as computed_start_date,
  CASE 
    WHEN spa.assignment_date_mode = 'fixed' THEN spa.end_date
    WHEN spa.assignment_date_mode = 'project' THEN sp.aspiration_finish
    WHEN spa.assignment_date_mode = 'phase' THEN spp.end_date
  END as computed_end_date
FROM scenario_project_assignments spa
JOIN scenario_projects sp ON spa.project_id = sp.project_id AND spa.scenario_id = sp.scenario_id
JOIN people p ON spa.person_id = p.id
JOIN roles r ON spa.role_id = r.id
LEFT JOIN project_phases ph ON spa.phase_id = ph.id
LEFT JOIN scenario_project_phases spp ON spa.phase_id = spp.phase_id 
  AND spp.project_id = spa.project_id 
  AND spp.scenario_id = spa.scenario_id;
