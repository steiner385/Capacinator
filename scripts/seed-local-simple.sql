-- Simple seed data for local development
-- This creates a minimal but realistic dataset

-- Ensure we have some basic roles if they don't exist
INSERT OR IGNORE INTO roles (id, name, created_at, updated_at) VALUES
('dev-role', 'Software Developer', datetime('now'), datetime('now')),
('qa-role', 'QA Engineer', datetime('now'), datetime('now')),
('pm-role', 'Project Manager', datetime('now'), datetime('now')),
('designer-role', 'UI/UX Designer', datetime('now'), datetime('now'));

-- Create some people
INSERT INTO people (id, name, email, location_id, is_active, created_at, updated_at) VALUES
('alice-pm', 'Alice Johnson', 'alice@example.com', (SELECT id FROM locations LIMIT 1), 1, datetime('now'), datetime('now')),
('bob-dev', 'Bob Smith', 'bob@example.com', (SELECT id FROM locations LIMIT 1), 1, datetime('now'), datetime('now')),
('carol-qa', 'Carol Davis', 'carol@example.com', (SELECT id FROM locations LIMIT 1), 1, datetime('now'), datetime('now')),
('dave-dev', 'David Wilson', 'david@example.com', (SELECT id FROM locations LIMIT 1), 1, datetime('now'), datetime('now')),
('eve-design', 'Eve Martinez', 'eve@example.com', (SELECT id FROM locations LIMIT 1), 1, datetime('now'), datetime('now'));

-- Assign roles to people
INSERT INTO person_roles (person_id, role_id, years_experience, created_at, updated_at) VALUES
('alice-pm', 'pm-role', 5, datetime('now'), datetime('now')),
('bob-dev', 'dev-role', 7, datetime('now'), datetime('now')),
('carol-qa', 'qa-role', 4, datetime('now'), datetime('now')),
('dave-dev', 'dev-role', 3, datetime('now'), datetime('now')),
('eve-design', 'designer-role', 6, datetime('now'), datetime('now'));

-- Create a baseline scenario
INSERT INTO scenarios (id, name, type, status, created_by, created_at, updated_at) VALUES
('baseline-2025', 'Q1 2025 Baseline', 'baseline', 'active', 'alice-pm', datetime('now'), datetime('now'));

-- Create some active projects
INSERT INTO projects (id, name, project_type_id, location_id, priority, include_in_demand, owner_id, created_at, updated_at) VALUES
('proj-mobile-app', 'Mobile App Redesign', (SELECT id FROM project_types WHERE name LIKE '%Mobile%' LIMIT 1), (SELECT id FROM locations LIMIT 1), 1, 1, 'alice-pm', datetime('now'), datetime('now')),
('proj-api-v2', 'API v2 Development', (SELECT id FROM project_types WHERE name LIKE '%Platform%' OR name LIKE '%API%' LIMIT 1), (SELECT id FROM locations LIMIT 1), 1, 1, 'alice-pm', datetime('now'), datetime('now')),
('proj-analytics', 'Analytics Dashboard', (SELECT id FROM project_types WHERE name LIKE '%Dashboard%' OR name LIKE '%Analytics%' LIMIT 1), (SELECT id FROM locations LIMIT 1), 2, 1, 'alice-pm', datetime('now'), datetime('now'));

-- Add projects to scenario
INSERT INTO scenario_projects (scenario_id, project_id, created_at, updated_at) VALUES
('baseline-2025', 'proj-mobile-app', datetime('now'), datetime('now')),
('baseline-2025', 'proj-api-v2', datetime('now'), datetime('now')),
('baseline-2025', 'proj-analytics', datetime('now'), datetime('now'));

-- Create project phases (simple phases)
INSERT INTO project_phases (id, project_id, phase_name, start_date, end_date, order_index, created_at, updated_at) VALUES
('phase-mobile-1', 'proj-mobile-app', 'Design Phase', date('now'), date('now', '+30 days'), 1, datetime('now'), datetime('now')),
('phase-mobile-2', 'proj-mobile-app', 'Development Phase', date('now', '+31 days'), date('now', '+90 days'), 2, datetime('now'), datetime('now')),
('phase-api-1', 'proj-api-v2', 'Architecture Phase', date('now'), date('now', '+21 days'), 1, datetime('now'), datetime('now')),
('phase-api-2', 'proj-api-v2', 'Implementation Phase', date('now', '+22 days'), date('now', '+90 days'), 2, datetime('now'), datetime('now')),
('phase-analytics-1', 'proj-analytics', 'Requirements Phase', date('now', '+14 days'), date('now', '+28 days'), 1, datetime('now'), datetime('now')),
('phase-analytics-2', 'proj-analytics', 'Development Phase', date('now', '+29 days'), date('now', '+60 days'), 2, datetime('now'), datetime('now'));

-- Create assignments
INSERT INTO project_assignments (id, project_id, person_id, role_id, allocation_percentage, start_date, end_date, created_at, updated_at) VALUES
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

-- Add assignments to scenario
INSERT INTO scenario_project_assignments (scenario_id, assignment_id, created_at, updated_at) 
SELECT 'baseline-2025', id, datetime('now'), datetime('now') FROM project_assignments;

SELECT 'Seed data added successfully!';