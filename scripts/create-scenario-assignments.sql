-- Create scenario assignments by selecting from existing data
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
  'spa-' || substr(lower(hex(randomblob(16))), 1, 8),
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
  date('now', '-' || (abs(random()) % 30) || ' days'),
  date('now', '+' || (60 + abs(random()) % 90) || ' days'),
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
  ORDER BY priority DESC, name 
  LIMIT 8
)
ORDER BY p.priority DESC, pe.name
LIMIT 15;

-- Add some assignments for the Additional Resources scenario
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
  'spa-ar-' || substr(lower(hex(randomblob(16))), 1, 6),
  '947c1925-7885-4d3f-8b3a-80355098753a', -- Additional Resources Branch
  p.id as project_id,
  pe.id as person_id,
  pr.role_id,
  100, -- Full allocation in additional resources scenario
  'fixed',
  date('now'),
  date('now', '+120 days'),
  datetime('now'),
  datetime('now')
FROM projects p
CROSS JOIN (
  SELECT pe.id, pe.name 
  FROM people pe 
  ORDER BY pe.id DESC
  LIMIT 3
) pe
JOIN person_roles pr ON pr.person_id = pe.id AND pr.is_primary = 1
WHERE p.priority = 'High'
ORDER BY p.name
LIMIT 6;

-- Show what we created
SELECT 
  s.name as scenario_name,
  COUNT(*) as assignment_count
FROM scenario_project_assignments spa
JOIN scenarios s ON spa.scenario_id = s.id
GROUP BY s.name;