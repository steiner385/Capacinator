-- Seed data for local development (matching current schema)
-- This creates a minimal but realistic dataset

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Clear existing data (in reverse dependency order)
DELETE FROM scenario_project_assignments;
DELETE FROM scenario_projects;
DELETE FROM project_assignments;
DELETE FROM project_phases;
DELETE FROM person_roles;
DELETE FROM projects WHERE id IN ('proj-mobile-app', 'proj-api-v2', 'proj-analytics');
DELETE FROM people WHERE id IN ('alice-pm', 'bob-dev', 'carol-qa', 'dave-dev', 'eve-design');
DELETE FROM scenarios WHERE id = 'baseline-2025';
DELETE FROM roles WHERE id IN ('dev-role', 'qa-role', 'pm-role', 'designer-role');

-- Ensure we have some basic roles
INSERT OR IGNORE INTO roles (id, name, created_at, updated_at) VALUES
('dev-role', 'Software Developer', datetime('now'), datetime('now')),
('qa-role', 'QA Engineer', datetime('now'), datetime('now')),
('pm-role', 'Project Manager', datetime('now'), datetime('now')),
('designer-role', 'UI/UX Designer', datetime('now'), datetime('now'));

-- Get first location ID
CREATE TEMP TABLE temp_location AS
SELECT id FROM locations LIMIT 1;

-- Get first project sub type ID
CREATE TEMP TABLE temp_sub_type AS
SELECT id FROM project_sub_types LIMIT 1;

-- Create some people (without location_id as it's not in the schema)
INSERT OR REPLACE INTO people (id, name, email, is_active, created_at, updated_at) VALUES
('alice-pm', 'Alice Johnson', 'alice@example.com', 1, datetime('now'), datetime('now')),
('bob-dev', 'Bob Smith', 'bob@example.com', 1, datetime('now'), datetime('now')),
('carol-qa', 'Carol Davis', 'carol@example.com', 1, datetime('now'), datetime('now')),
('dave-dev', 'David Wilson', 'david@example.com', 1, datetime('now'), datetime('now')),
('eve-design', 'Eve Martinez', 'eve@example.com', 1, datetime('now'), datetime('now'));

-- Assign roles to people (using correct columns)
INSERT OR REPLACE INTO person_roles (person_id, role_id, proficiency_level, is_primary) VALUES
('alice-pm', 'pm-role', 4, 1),
('bob-dev', 'dev-role', 5, 1),
('carol-qa', 'qa-role', 3, 1),
('dave-dev', 'dev-role', 3, 1),
('eve-design', 'designer-role', 4, 1);

-- Create a baseline scenario (using scenario_type instead of type)
INSERT OR REPLACE INTO scenarios (id, name, scenario_type, status, created_by, created_at, updated_at) VALUES
('baseline-2025', 'Q1 2025 Baseline', 'baseline', 'active', 'alice-pm', datetime('now'), datetime('now'));

-- Create some projects (with actual IDs from the database)
INSERT OR REPLACE INTO projects (id, name, project_type_id, location_id, priority, include_in_demand, owner_id, project_sub_type_id, created_at, updated_at) VALUES
('proj-mobile-app', 'Mobile App Redesign', 'a7e2e4f6-6a96-4422-bdc6-76831d38accd', (SELECT id FROM temp_location), 1, 1, 'alice-pm', (SELECT id FROM temp_sub_type), datetime('now'), datetime('now')),
('proj-api-v2', 'API v2 Development', '0fa42dcf-6408-48a4-ba86-733a1c48729a', (SELECT id FROM temp_location), 1, 1, 'alice-pm', (SELECT id FROM temp_sub_type), datetime('now'), datetime('now')),
('proj-analytics', 'Analytics Dashboard', '2c3d4e5f-6a7b-8c9d-0e1f-2a3b4c5d6e7f', (SELECT id FROM temp_location), 2, 1, 'alice-pm', (SELECT id FROM temp_sub_type), datetime('now'), datetime('now'));

-- Add projects to scenario
INSERT OR REPLACE INTO scenario_projects (scenario_id, project_id, created_at, updated_at) VALUES
('baseline-2025', 'proj-mobile-app', datetime('now'), datetime('now')),
('baseline-2025', 'proj-api-v2', datetime('now'), datetime('now')),
('baseline-2025', 'proj-analytics', datetime('now'), datetime('now'));

-- Create project phases
INSERT OR REPLACE INTO project_phases (id, name, description, order_index, created_at, updated_at) VALUES
('phase-design', 'Design Phase', 'UI/UX Design and Planning', 1, datetime('now'), datetime('now')),
('phase-dev', 'Development Phase', 'Implementation and Coding', 2, datetime('now'), datetime('now')),
('phase-qa', 'QA Phase', 'Testing and Quality Assurance', 3, datetime('now'), datetime('now'));

-- Create assignments (simplified without phase_id for now)
INSERT OR REPLACE INTO project_assignments (id, project_id, person_id, role_id, allocation_percentage, start_date, end_date, created_at, updated_at) VALUES
-- Mobile App assignments
('assign-1', 'proj-mobile-app', 'eve-design', 'designer-role', 80, date('now'), date('now', '+30 days'), datetime('now'), datetime('now')),
('assign-2', 'proj-mobile-app', 'bob-dev', 'dev-role', 60, date('now', '+31 days'), date('now', '+90 days'), datetime('now'), datetime('now')),
('assign-3', 'proj-mobile-app', 'carol-qa', 'qa-role', 40, date('now', '+60 days'), date('now', '+90 days'), datetime('now'), datetime('now')),
-- API v2 assignments
('assign-4', 'proj-api-v2', 'bob-dev', 'dev-role', 40, date('now'), date('now', '+21 days'), datetime('now'), datetime('now')),
('assign-5', 'proj-api-v2', 'dave-dev', 'dev-role', 100, date('now', '+22 days'), date('now', '+90 days'), datetime('now'), datetime('now')),
('assign-6', 'proj-api-v2', 'carol-qa', 'qa-role', 60, date('now', '+60 days'), date('now', '+90 days'), datetime('now'), datetime('now')),
-- Analytics Dashboard assignments
('assign-7', 'proj-analytics', 'alice-pm', 'pm-role', 20, date('now', '+14 days'), date('now', '+60 days'), datetime('now'), datetime('now')),
('assign-8', 'proj-analytics', 'dave-dev', 'dev-role', 80, date('now', '+29 days'), date('now', '+60 days'), datetime('now'), datetime('now')),
('assign-9', 'proj-analytics', 'eve-design', 'designer-role', 50, date('now', '+14 days'), date('now', '+28 days'), datetime('now'), datetime('now'));

-- Add assignments to scenario (copy assignment data)
INSERT OR REPLACE INTO scenario_project_assignments (scenario_id, project_id, person_id, role_id, allocation_percentage, start_date, end_date, assignment_date_mode, base_assignment_id, created_at, updated_at) 
SELECT 'baseline-2025', project_id, person_id, role_id, allocation_percentage, start_date, end_date, 'fixed', id, datetime('now'), datetime('now') 
FROM project_assignments WHERE id LIKE 'assign-%';

-- Clean up temp tables
DROP TABLE temp_location;
DROP TABLE temp_sub_type;

SELECT 'Seed data added successfully!';