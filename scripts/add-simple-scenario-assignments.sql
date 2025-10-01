-- Simple script to add scenario assignments
-- Get first few people, projects, and roles
INSERT INTO scenario_project_assignments (
  id,
  scenario_id,
  project_id,
  person_id,
  role_id,
  allocation_percentage,
  assignment_date_mode,
  start_date,
  end_date,
  created_at,
  updated_at
)
VALUES
-- Baseline scenario assignments
(lower(hex(randomblob(16))), '42169f91-28cf-439b-9a07-0af0206b1b74', 
 (SELECT id FROM projects WHERE name = 'Mobile Banking App' LIMIT 1),
 (SELECT id FROM people WHERE name LIKE '%John%' LIMIT 1),
 (SELECT id FROM roles WHERE name = 'Mobile Developer' LIMIT 1),
 80, 'fixed', date('now'), date('now', '+90 days'), datetime('now'), datetime('now')),

(lower(hex(randomblob(16))), '42169f91-28cf-439b-9a07-0af0206b1b74', 
 (SELECT id FROM projects WHERE name = 'Customer Portal Redesign' LIMIT 1),
 (SELECT id FROM people WHERE name LIKE '%Jane%' LIMIT 1),
 (SELECT id FROM roles WHERE name = 'Frontend Developer' LIMIT 1),
 60, 'fixed', date('now', '-15 days'), date('now', '+60 days'), datetime('now'), datetime('now')),

(lower(hex(randomblob(16))), '42169f91-28cf-439b-9a07-0af0206b1b74', 
 (SELECT id FROM projects WHERE name = 'AI Customer Support Chatbot' LIMIT 1),
 (SELECT id FROM people WHERE name LIKE '%Alice%' LIMIT 1),
 (SELECT id FROM roles WHERE name = 'Data Scientist' LIMIT 1),
 100, 'fixed', date('now', '-30 days'), date('now', '+45 days'), datetime('now'), datetime('now')),

(lower(hex(randomblob(16))), '42169f91-28cf-439b-9a07-0af0206b1b74', 
 (SELECT id FROM projects WHERE name = 'Legacy System AWS Migration' LIMIT 1),
 (SELECT id FROM people WHERE name LIKE '%Bob%' LIMIT 1),
 (SELECT id FROM roles WHERE name = 'Cloud Architect' LIMIT 1),
 50, 'fixed', date('now'), date('now', '+120 days'), datetime('now'), datetime('now')),

-- Additional Resources Branch assignments
(lower(hex(randomblob(16))), '947c1925-7885-4d3f-8b3a-80355098753a', 
 (SELECT id FROM projects WHERE name = 'Mobile Banking App' LIMIT 1),
 (SELECT id FROM people WHERE name LIKE '%John%' LIMIT 1),
 (SELECT id FROM roles WHERE name = 'Mobile Developer' LIMIT 1),
 100, 'fixed', date('now'), date('now', '+90 days'), datetime('now'), datetime('now')),

(lower(hex(randomblob(16))), '947c1925-7885-4d3f-8b3a-80355098753a', 
 (SELECT id FROM projects WHERE name = 'Mobile Banking App' LIMIT 1),
 (SELECT id FROM people WHERE name LIKE '%Charlie%' LIMIT 1),
 (SELECT id FROM roles WHERE name = 'Backend Developer' LIMIT 1),
 80, 'fixed', date('now'), date('now', '+90 days'), datetime('now'), datetime('now'));

-- Check what we created
SELECT COUNT(*) as scenario_assignments_count FROM scenario_project_assignments;