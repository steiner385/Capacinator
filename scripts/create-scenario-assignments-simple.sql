-- Delete existing test assignment
DELETE FROM scenario_project_assignments WHERE id = 'spa-test-001';

-- Create scenario assignments using simpler IDs
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
SELECT
  'spa-' || printf('%03d', ROW_NUMBER() OVER (ORDER BY p.priority DESC, pe.name)),
  '42169f91-28cf-439b-9a07-0af0206b1b74', -- Current State Baseline
  p.id as project_id,
  pe.id as person_id,
  pr.role_id,
  CASE 
    WHEN p.priority = 'High' THEN 80
    WHEN p.priority = 'Medium' THEN 60
    ELSE 40
  END as allocation_percentage,
  'fixed',
  date('now', '-15 days'),
  date('now', '+75 days'),
  datetime('now'),
  datetime('now')
FROM projects p
CROSS JOIN (
  SELECT pe.id, pe.name 
  FROM people pe 
  ORDER BY pe.id 
  LIMIT 6
) pe
JOIN person_roles pr ON pr.person_id = pe.id AND pr.is_primary = 1
WHERE p.id IN (
  SELECT id FROM projects 
  WHERE name IN ('Mobile Banking App', 'Customer Portal Redesign', 'AI Customer Support Chatbot', 'Legacy System AWS Migration')
)
ORDER BY p.priority DESC, pe.name;

-- Show what we created
SELECT COUNT(*) as total_scenario_assignments FROM scenario_project_assignments;

-- Show sample assignments
SELECT 
  substr(spa.id, 5) as id,
  substr(p.name, 1, 30) as project,
  substr(pe.name, 1, 20) as person,
  spa.allocation_percentage as alloc
FROM scenario_project_assignments spa
JOIN projects p ON spa.project_id = p.id
JOIN people pe ON spa.person_id = pe.id
WHERE spa.scenario_id = '42169f91-28cf-439b-9a07-0af0206b1b74'
ORDER BY spa.id
LIMIT 10;