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
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  old_values TEXT,
  new_values TEXT,
  changed_fields TEXT,
  request_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  comment TEXT
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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (person_id) REFERENCES people(id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (phase_id) REFERENCES project_phases(id),
  FOREIGN KEY (base_assignment_id) REFERENCES project_assignments(id)
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