-- Comprehensive seed data for local development
-- This creates a realistic project portfolio with proper phases and assignments

PRAGMA foreign_keys = ON;

-- Clear existing test data (preserve base data)
DELETE FROM scenario_project_assignments WHERE scenario_id IN ('current-q1-2025', 'planning-q2-2025');
DELETE FROM project_phases_timeline WHERE project_id LIKE 'seed-%';
DELETE FROM scenario_projects WHERE scenario_id IN ('current-q1-2025', 'planning-q2-2025');
DELETE FROM project_assignments WHERE project_id LIKE 'seed-%';
DELETE FROM project_phases WHERE id LIKE 'seed-%';
DELETE FROM projects WHERE id LIKE 'seed-%';
DELETE FROM person_roles WHERE person_id LIKE 'seed-%';
DELETE FROM people WHERE id LIKE 'seed-%';
DELETE FROM scenarios WHERE id IN ('current-q1-2025', 'planning-q2-2025');

-- Create more diverse people with different roles and availability
INSERT INTO people (id, name, email, is_active, default_availability_percentage, worker_type) VALUES
-- Project Managers
('seed-pm-sarah', 'Sarah Chen', 'sarah.chen@example.com', 1, 100, 'FTE'),
('seed-pm-mike', 'Michael Rodriguez', 'michael.rodriguez@example.com', 1, 100, 'FTE'),
-- Software Engineers
('seed-dev-john', 'John Smith', 'john.smith@example.com', 1, 100, 'FTE'),
('seed-dev-emily', 'Emily Johnson', 'emily.johnson@example.com', 1, 100, 'FTE'),
('seed-dev-raj', 'Raj Patel', 'raj.patel@example.com', 1, 100, 'FTE'),
('seed-dev-lisa', 'Lisa Wang', 'lisa.wang@example.com', 1, 80, 'FTE'), -- Part time
-- QA Engineers
('seed-qa-alex', 'Alex Thompson', 'alex.thompson@example.com', 1, 100, 'FTE'),
('seed-qa-maria', 'Maria Garcia', 'maria.garcia@example.com', 1, 100, 'FTE'),
-- UI/UX Designers
('seed-ux-david', 'David Lee', 'david.lee@example.com', 1, 100, 'FTE'),
('seed-ux-anna', 'Anna Kowalski', 'anna.kowalski@example.com', 1, 100, 'FTE'),
-- DevOps Engineers
('seed-devops-tom', 'Tom Anderson', 'tom.anderson@example.com', 1, 100, 'FTE'),
('seed-devops-nina', 'Nina Petrov', 'nina.petrov@example.com', 1, 100, 'Contractor'),
-- Data Scientists
('seed-data-james', 'James Wilson', 'james.wilson@example.com', 1, 100, 'FTE'),
('seed-data-sophie', 'Sophie Martin', 'sophie.martin@example.com', 1, 100, 'FTE');

-- Assign roles to people
INSERT INTO person_roles (person_id, role_id, proficiency_level, is_primary)
SELECT 
  p.person_id,
  r.id,
  p.proficiency,
  1
FROM (
  VALUES 
  ('seed-pm-sarah', 'Project Manager', 5),
  ('seed-pm-mike', 'Project Manager', 4),
  ('seed-dev-john', 'Software Developer', 5),
  ('seed-dev-emily', 'Software Developer', 4),
  ('seed-dev-raj', 'Software Developer', 3),
  ('seed-dev-lisa', 'Software Developer', 4),
  ('seed-qa-alex', 'QA Engineer', 4),
  ('seed-qa-maria', 'QA Engineer', 5),
  ('seed-ux-david', 'UI/UX Designer', 5),
  ('seed-ux-anna', 'UI/UX Designer', 3),
  ('seed-devops-tom', 'DevOps Engineer', 5),
  ('seed-devops-nina', 'DevOps Engineer', 4),
  ('seed-data-james', 'Data Scientist', 4),
  ('seed-data-sophie', 'Data Scientist', 3)
) AS p(person_id, role_name, proficiency)
JOIN roles r ON r.name = p.role_name;

-- Add secondary roles for some people
INSERT INTO person_roles (person_id, role_id, proficiency_level, is_primary)
SELECT 
  p.person_id,
  r.id,
  p.proficiency,
  0
FROM (
  VALUES 
  ('seed-dev-john', 'Tech Lead', 3),
  ('seed-dev-emily', 'Scrum Master', 3),
  ('seed-devops-tom', 'Site Reliability Engineer', 4)
) AS p(person_id, role_name, proficiency)
JOIN roles r ON r.name = p.role_name;

-- Create realistic scenarios
INSERT INTO scenarios (id, name, scenario_type, status, created_by, description) VALUES
('current-q1-2025', 'Q1 2025 Current State', 'baseline', 'active', 'seed-pm-sarah', 'Current quarter baseline with all active projects'),
('planning-q2-2025', 'Q2 2025 Planning', 'branch', 'active', 'seed-pm-mike', 'Planning scenario for next quarter initiatives');

-- Create diverse projects with realistic details
INSERT INTO projects (id, name, project_type_id, location_id, project_sub_type_id, owner_id, priority, description, aspiration_start, aspiration_finish)
SELECT 
  p.id,
  p.name,
  pt.id,
  (SELECT id FROM locations LIMIT 1),
  (SELECT id FROM project_sub_types WHERE project_type_id = pt.id LIMIT 1),
  p.owner_id,
  p.priority,
  p.description,
  p.start_date,
  p.end_date
FROM (
  VALUES
  -- Mobile Application Project
  ('seed-mobile-banking', 'Mobile Banking App 2.0', 'Mobile Application', 'seed-pm-sarah', 1, 
   'Complete redesign and rebuild of our mobile banking application with enhanced security features and modern UX',
   date('now', '-30 days'), date('now', '+150 days')),
  
  -- AI/ML Platform Project  
  ('seed-ml-fraud', 'Fraud Detection ML Platform', 'AI/ML Platform', 'seed-pm-mike', 1,
   'Build machine learning platform for real-time fraud detection across all transaction types',
   date('now', '-45 days'), date('now', '+180 days')),
  
  -- Web Application Project
  ('seed-customer-portal', 'Customer Portal Refresh', 'Web Application', 'seed-pm-sarah', 2,
   'Modernize customer self-service portal with React and improved accessibility',
   date('now', '+14 days'), date('now', '+120 days')),
  
  -- Cloud Migration Project
  ('seed-cloud-migration', 'Legacy System Cloud Migration', 'Cloud Migration', 'seed-pm-mike', 1,
   'Migrate core banking systems from on-premise to AWS cloud infrastructure',
   date('now', '-60 days'), date('now', '+210 days')),
  
  -- Data Analytics Project
  ('seed-analytics-platform', 'Business Analytics Platform', 'Data Analytics', 'seed-pm-sarah', 2,
   'Build comprehensive analytics platform for business intelligence and reporting',
   date('now'), date('now', '+90 days')),
  
  -- Security Project
  ('seed-security-audit', 'Annual Security Audit & Remediation', 'Security', 'seed-pm-mike', 1,
   'Comprehensive security audit and implementation of remediation measures',
   date('now', '-14 days'), date('now', '+60 days'))
) AS p(id, name, type_name, owner_id, priority, description, start_date, end_date)
JOIN project_types pt ON pt.name = p.type_name;

-- Add all projects to current scenario
INSERT INTO scenario_projects (scenario_id, project_id)
SELECT 'current-q1-2025', id FROM projects WHERE id LIKE 'seed-%';

-- Add subset to planning scenario
INSERT INTO scenario_projects (scenario_id, project_id)
SELECT 'planning-q2-2025', id FROM projects WHERE id LIKE 'seed-%' AND id NOT IN ('seed-security-audit');

-- Create standard phases 
INSERT INTO project_phases (id, name, description, order_index) VALUES
('seed-phase-discovery', 'Discovery & Planning', 'Requirements gathering, technical design, and project planning', 1),
('seed-phase-design', 'Design & Architecture', 'UI/UX design and system architecture', 2),
('seed-phase-development', 'Development', 'Core development and implementation', 3),
('seed-phase-testing', 'Testing & QA', 'Quality assurance and testing', 4),
('seed-phase-deployment', 'Deployment & Launch', 'Production deployment and go-live', 5),
('seed-phase-stabilization', 'Stabilization', 'Post-launch support and optimization', 6);

-- Create project-specific phase timelines
-- Mobile Banking App phases
INSERT INTO project_phases_timeline (project_id, phase_id, start_date, end_date)
VALUES
('seed-mobile-banking', 'seed-phase-discovery', date('now', '-30 days'), date('now', '-15 days')),
('seed-mobile-banking', 'seed-phase-design', date('now', '-14 days'), date('now', '+14 days')),
('seed-mobile-banking', 'seed-phase-development', date('now', '+15 days'), date('now', '+90 days')),
('seed-mobile-banking', 'seed-phase-testing', date('now', '+75 days'), date('now', '+120 days')),
('seed-mobile-banking', 'seed-phase-deployment', date('now', '+121 days'), date('now', '+135 days')),
('seed-mobile-banking', 'seed-phase-stabilization', date('now', '+136 days'), date('now', '+150 days'));

-- ML Fraud Detection phases
INSERT INTO project_phases_timeline (project_id, phase_id, start_date, end_date)
VALUES
('seed-ml-fraud', 'seed-phase-discovery', date('now', '-45 days'), date('now', '-30 days')),
('seed-ml-fraud', 'seed-phase-design', date('now', '-29 days'), date('now', '-10 days')),
('seed-ml-fraud', 'seed-phase-development', date('now', '-9 days'), date('now', '+120 days')),
('seed-ml-fraud', 'seed-phase-testing', date('now', '+90 days'), date('now', '+150 days')),
('seed-ml-fraud', 'seed-phase-deployment', date('now', '+151 days'), date('now', '+165 days')),
('seed-ml-fraud', 'seed-phase-stabilization', date('now', '+166 days'), date('now', '+180 days'));

-- Customer Portal phases (future project)
INSERT INTO project_phases_timeline (project_id, phase_id, start_date, end_date)
VALUES
('seed-customer-portal', 'seed-phase-discovery', date('now', '+14 days'), date('now', '+28 days')),
('seed-customer-portal', 'seed-phase-design', date('now', '+29 days'), date('now', '+45 days')),
('seed-customer-portal', 'seed-phase-development', date('now', '+46 days'), date('now', '+90 days')),
('seed-customer-portal', 'seed-phase-testing', date('now', '+80 days'), date('now', '+105 days')),
('seed-customer-portal', 'seed-phase-deployment', date('now', '+106 days'), date('now', '+115 days')),
('seed-customer-portal', 'seed-phase-stabilization', date('now', '+116 days'), date('now', '+120 days'));

-- Cloud Migration phases
INSERT INTO project_phases_timeline (project_id, phase_id, start_date, end_date)
VALUES
('seed-cloud-migration', 'seed-phase-discovery', date('now', '-60 days'), date('now', '-40 days')),
('seed-cloud-migration', 'seed-phase-design', date('now', '-39 days'), date('now', '-20 days')),
('seed-cloud-migration', 'seed-phase-development', date('now', '-19 days'), date('now', '+120 days')),
('seed-cloud-migration', 'seed-phase-testing', date('now', '+100 days'), date('now', '+160 days')),
('seed-cloud-migration', 'seed-phase-deployment', date('now', '+161 days'), date('now', '+190 days')),
('seed-cloud-migration', 'seed-phase-stabilization', date('now', '+191 days'), date('now', '+210 days'));

-- Analytics Platform phases
INSERT INTO project_phases_timeline (project_id, phase_id, start_date, end_date)
VALUES
('seed-analytics-platform', 'seed-phase-discovery', date('now'), date('now', '+14 days')),
('seed-analytics-platform', 'seed-phase-design', date('now', '+15 days'), date('now', '+28 days')),
('seed-analytics-platform', 'seed-phase-development', date('now', '+29 days'), date('now', '+70 days')),
('seed-analytics-platform', 'seed-phase-testing', date('now', '+60 days'), date('now', '+80 days')),
('seed-analytics-platform', 'seed-phase-deployment', date('now', '+81 days'), date('now', '+85 days')),
('seed-analytics-platform', 'seed-phase-stabilization', date('now', '+86 days'), date('now', '+90 days'));

-- Security Audit phases (shorter project)
INSERT INTO project_phases_timeline (project_id, phase_id, start_date, end_date)
VALUES
('seed-security-audit', 'seed-phase-discovery', date('now', '-14 days'), date('now', '-7 days')),
('seed-security-audit', 'seed-phase-testing', date('now', '-6 days'), date('now', '+21 days')),
('seed-security-audit', 'seed-phase-development', date('now', '+22 days'), date('now', '+50 days')),
('seed-security-audit', 'seed-phase-deployment', date('now', '+51 days'), date('now', '+60 days'));

-- Create realistic assignments in the current scenario
-- Mobile Banking App assignments
INSERT INTO scenario_project_assignments (
  scenario_id, project_id, person_id, role_id, phase_id,
  allocation_percentage, assignment_date_mode, start_date, end_date
)
VALUES
-- PM throughout project
('current-q1-2025', 'seed-mobile-banking', 'seed-pm-sarah', (SELECT id FROM roles WHERE name = 'Project Manager'), 
 NULL, 20, 'fixed', date('now', '-30 days'), date('now', '+150 days')),
-- UX designers in early phases
('current-q1-2025', 'seed-mobile-banking', 'seed-ux-david', (SELECT id FROM roles WHERE name = 'UI/UX Designer'), 
 'seed-phase-design', 100, 'phase', NULL, NULL),
('current-q1-2025', 'seed-mobile-banking', 'seed-ux-anna', (SELECT id FROM roles WHERE name = 'UI/UX Designer'), 
 'seed-phase-design', 80, 'phase', NULL, NULL),
-- Developers in development phase
('current-q1-2025', 'seed-mobile-banking', 'seed-dev-john', (SELECT id FROM roles WHERE name = 'Software Developer'), 
 'seed-phase-development', 80, 'phase', NULL, NULL),
('current-q1-2025', 'seed-mobile-banking', 'seed-dev-emily', (SELECT id FROM roles WHERE name = 'Software Developer'), 
 'seed-phase-development', 60, 'phase', NULL, NULL),
-- QA in testing phase
('current-q1-2025', 'seed-mobile-banking', 'seed-qa-alex', (SELECT id FROM roles WHERE name = 'QA Engineer'), 
 'seed-phase-testing', 100, 'phase', NULL, NULL);

-- ML Fraud Detection assignments
INSERT INTO scenario_project_assignments (
  scenario_id, project_id, person_id, role_id, phase_id,
  allocation_percentage, assignment_date_mode, start_date, end_date
)
VALUES
-- PM and data scientists
('current-q1-2025', 'seed-ml-fraud', 'seed-pm-mike', (SELECT id FROM roles WHERE name = 'Project Manager'), 
 NULL, 25, 'fixed', date('now', '-45 days'), date('now', '+180 days')),
('current-q1-2025', 'seed-ml-fraud', 'seed-data-james', (SELECT id FROM roles WHERE name = 'Data Scientist'), 
 NULL, 100, 'fixed', date('now', '-30 days'), date('now', '+150 days')),
('current-q1-2025', 'seed-ml-fraud', 'seed-data-sophie', (SELECT id FROM roles WHERE name = 'Data Scientist'), 
 NULL, 80, 'fixed', date('now', '-20 days'), date('now', '+120 days')),
-- Developers for platform work
('current-q1-2025', 'seed-ml-fraud', 'seed-dev-raj', (SELECT id FROM roles WHERE name = 'Software Developer'), 
 'seed-phase-development', 60, 'phase', NULL, NULL);

-- Cloud Migration assignments
INSERT INTO scenario_project_assignments (
  scenario_id, project_id, person_id, role_id, phase_id,
  allocation_percentage, assignment_date_mode, start_date, end_date
)
VALUES
-- DevOps heavy project
('current-q1-2025', 'seed-cloud-migration', 'seed-devops-tom', (SELECT id FROM roles WHERE name = 'DevOps Engineer'), 
 NULL, 80, 'fixed', date('now', '-40 days'), date('now', '+190 days')),
('current-q1-2025', 'seed-cloud-migration', 'seed-devops-nina', (SELECT id FROM roles WHERE name = 'DevOps Engineer'), 
 NULL, 100, 'fixed', date('now', '-20 days'), date('now', '+160 days')),
('current-q1-2025', 'seed-cloud-migration', 'seed-dev-lisa', (SELECT id FROM roles WHERE name = 'Software Developer'), 
 'seed-phase-development', 80, 'phase', NULL, NULL);

-- Analytics Platform assignments
INSERT INTO scenario_project_assignments (
  scenario_id, project_id, person_id, role_id, phase_id,
  allocation_percentage, assignment_date_mode, start_date, end_date
)
VALUES
('current-q1-2025', 'seed-analytics-platform', 'seed-pm-sarah', (SELECT id FROM roles WHERE name = 'Project Manager'), 
 NULL, 15, 'fixed', date('now'), date('now', '+90 days')),
('current-q1-2025', 'seed-analytics-platform', 'seed-ux-david', (SELECT id FROM roles WHERE name = 'UI/UX Designer'), 
 'seed-phase-design', 60, 'phase', NULL, NULL),
('current-q1-2025', 'seed-analytics-platform', 'seed-data-james', (SELECT id FROM roles WHERE name = 'Data Scientist'), 
 'seed-phase-discovery', 50, 'phase', NULL, NULL);

-- Security Audit assignments
INSERT INTO scenario_project_assignments (
  scenario_id, project_id, person_id, role_id, phase_id,
  allocation_percentage, assignment_date_mode, start_date, end_date
)
VALUES
('current-q1-2025', 'seed-security-audit', 'seed-pm-mike', (SELECT id FROM roles WHERE name = 'Project Manager'), 
 NULL, 10, 'fixed', date('now', '-14 days'), date('now', '+60 days')),
('current-q1-2025', 'seed-security-audit', 'seed-devops-tom', (SELECT id FROM roles WHERE name = 'DevOps Engineer'), 
 'seed-phase-testing', 40, 'phase', NULL, NULL),
('current-q1-2025', 'seed-security-audit', 'seed-qa-maria', (SELECT id FROM roles WHERE name = 'QA Engineer'), 
 'seed-phase-testing', 80, 'phase', NULL, NULL);

-- Add some planning scenario specific assignments (Q2 planning)
INSERT INTO scenario_project_assignments (
  scenario_id, project_id, person_id, role_id, phase_id,
  allocation_percentage, assignment_date_mode, start_date, end_date, change_type
)
VALUES
-- Additional developer for customer portal
('planning-q2-2025', 'seed-customer-portal', 'seed-dev-john', (SELECT id FROM roles WHERE name = 'Software Developer'), 
 'seed-phase-development', 100, 'phase', NULL, NULL, 'added'),
('planning-q2-2025', 'seed-customer-portal', 'seed-qa-alex', (SELECT id FROM roles WHERE name = 'QA Engineer'), 
 'seed-phase-testing', 80, 'phase', NULL, NULL, 'added'),
-- Reduce ML project allocation
('planning-q2-2025', 'seed-ml-fraud', 'seed-data-sophie', (SELECT id FROM roles WHERE name = 'Data Scientist'), 
 NULL, 40, 'fixed', date('now', '-20 days'), date('now', '+120 days'), 'modified');

-- Update knex_migrations to record this as run
INSERT OR REPLACE INTO knex_migrations (name, batch, migration_time) 
VALUES ('999_seed_local_comprehensive', 999, datetime('now'));

-- Summary
SELECT 'Seed data created successfully!' as message;
SELECT '';
SELECT 'Summary:' as '';
SELECT '- ' || COUNT(DISTINCT id) || ' people created' as summary FROM people WHERE id LIKE 'seed-%'
UNION ALL
SELECT '- ' || COUNT(DISTINCT id) || ' projects created' FROM projects WHERE id LIKE 'seed-%'
UNION ALL
SELECT '- ' || COUNT(DISTINCT id) || ' project phases created' FROM project_phases WHERE id LIKE 'seed-%'
UNION ALL
SELECT '- ' || COUNT(DISTINCT project_id) || ' projects with phase timelines' FROM project_phases_timeline WHERE project_id LIKE 'seed-%'
UNION ALL
SELECT '- ' || COUNT(*) || ' assignments in current scenario' FROM scenario_project_assignments WHERE scenario_id = 'current-q1-2025'
UNION ALL
SELECT '- ' || COUNT(*) || ' assignments in planning scenario' FROM scenario_project_assignments WHERE scenario_id = 'planning-q2-2025';