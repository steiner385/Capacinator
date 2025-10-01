-- Minimal seed data for local development
-- This creates just enough data to test the application

PRAGMA foreign_keys = ON;

-- Clear test data
DELETE FROM scenario_project_assignments WHERE scenario_id = 'test-scenario-2025';
DELETE FROM scenario_projects WHERE scenario_id = 'test-scenario-2025';
DELETE FROM project_assignments WHERE project_id IN ('test-project-1', 'test-project-2');
DELETE FROM projects WHERE id IN ('test-project-1', 'test-project-2');
DELETE FROM person_roles WHERE person_id IN ('test-dev', 'test-pm');
DELETE FROM people WHERE id IN ('test-dev', 'test-pm');
DELETE FROM scenarios WHERE id = 'test-scenario-2025';

-- Create test people
INSERT INTO people (id, name, email, is_active) VALUES
('test-dev', 'Test Developer', 'test-dev@example.com', 1),
('test-pm', 'Test PM', 'test-pm@example.com', 1);

-- Assign roles
INSERT INTO person_roles (person_id, role_id) 
SELECT 'test-dev', id FROM roles WHERE name LIKE '%Developer%' LIMIT 1;

INSERT INTO person_roles (person_id, role_id)
SELECT 'test-pm', id FROM roles WHERE name LIKE '%Manager%' LIMIT 1;

-- Create test scenario
INSERT INTO scenarios (id, name, scenario_type, status, created_by) VALUES
('test-scenario-2025', 'Test Scenario 2025', 'baseline', 'active', 'test-pm');

-- Create test projects
INSERT INTO projects (id, name, project_type_id, location_id, project_sub_type_id, owner_id, priority)
SELECT 
    'test-project-1',
    'Test Web Project',
    (SELECT id FROM project_types WHERE name LIKE '%Web%' LIMIT 1),
    (SELECT id FROM locations LIMIT 1),
    (SELECT id FROM project_sub_types LIMIT 1),
    'test-pm',
    1;

INSERT INTO projects (id, name, project_type_id, location_id, project_sub_type_id, owner_id, priority)
SELECT 
    'test-project-2',
    'Test Mobile Project',
    (SELECT id FROM project_types WHERE name LIKE '%Mobile%' LIMIT 1),
    (SELECT id FROM locations LIMIT 1),
    (SELECT id FROM project_sub_types LIMIT 1),
    'test-pm',
    2;

-- Add projects to scenario
INSERT INTO scenario_projects (scenario_id, project_id) VALUES
('test-scenario-2025', 'test-project-1'),
('test-scenario-2025', 'test-project-2');

-- Create simple assignments directly in scenario
INSERT INTO scenario_project_assignments (
    scenario_id, project_id, person_id, role_id, 
    allocation_percentage, assignment_date_mode, 
    start_date, end_date
)
SELECT 
    'test-scenario-2025',
    'test-project-1',
    'test-dev',
    (SELECT id FROM roles WHERE name LIKE '%Developer%' LIMIT 1),
    80,
    'fixed',
    date('now'),
    date('now', '+90 days');

INSERT INTO scenario_project_assignments (
    scenario_id, project_id, person_id, role_id, 
    allocation_percentage, assignment_date_mode, 
    start_date, end_date
)
SELECT 
    'test-scenario-2025',
    'test-project-2',
    'test-dev',
    (SELECT id FROM roles WHERE name LIKE '%Developer%' LIMIT 1),
    20,
    'fixed',
    date('now', '+30 days'),
    date('now', '+120 days');

-- Summary
SELECT 'Test data seeded successfully!';