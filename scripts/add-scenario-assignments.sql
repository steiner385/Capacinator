-- Add scenario-based assignments for the baseline scenario
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
  phase_id,
  notes,
  created_at,
  updated_at
)
SELECT 
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || 
  substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || 
  substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
  '42169f91-28cf-439b-9a07-0af0206b1b74', -- Current State Baseline
  p.id as project_id,
  pe.id as person_id,
  r.id as role_id,
  CASE 
    WHEN ROW_NUMBER() OVER (PARTITION BY pe.id ORDER BY p.name) = 1 THEN 60
    WHEN ROW_NUMBER() OVER (PARTITION BY pe.id ORDER BY p.name) = 2 THEN 40
    ELSE 20
  END as allocation_percentage,
  'fixed',
  date('now', '-' || (abs(random()) % 30) || ' days'),
  date('now', '+' || (60 + abs(random()) % 90) || ' days'),
  NULL,
  'Baseline scenario assignment',
  datetime('now'),
  datetime('now')
FROM projects p
CROSS JOIN people pe
JOIN person_roles pr ON pr.person_id = pe.id
JOIN roles r ON r.id = pr.role_id
WHERE 
  -- Match people to appropriate projects based on skills
  (
    (p.name LIKE '%Mobile%' AND r.name IN ('Mobile Developer', 'UI/UX Designer', 'QA Engineer')) OR
    (p.name LIKE '%Cloud%' AND r.name IN ('Cloud Architect', 'DevOps Engineer', 'Backend Developer')) OR
    (p.name LIKE '%Data%' AND r.name IN ('Data Scientist', 'Data Engineer', 'Backend Developer')) OR
    (p.name LIKE '%Web%' AND r.name IN ('Full Stack Developer', 'Frontend Developer', 'Backend Developer')) OR
    (p.name LIKE '%Security%' AND r.name IN ('Security Engineer', 'DevOps Engineer', 'Backend Developer')) OR
    (r.name = 'Project Manager' AND pe.name LIKE '%Manager%')
  )
  AND pr.is_primary = 1
  AND p.id IN (SELECT id FROM projects LIMIT 6)
LIMIT 20;

-- Add some assignments for the "Additional Resources Branch" scenario
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
  phase_id,
  notes,
  created_at,
  updated_at
)
SELECT 
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || 
  substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || 
  substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
  '947c1925-7885-4d3f-8b3a-80355098753a', -- Additional Resources Branch
  p.id as project_id,
  pe.id as person_id,
  r.id as role_id,
  80, -- Higher allocation in this scenario
  'fixed',
  date('now'),
  date('now', '+120 days'),
  NULL,
  'Additional resources scenario - higher allocation',
  datetime('now'),
  datetime('now')
FROM projects p
CROSS JOIN people pe
JOIN person_roles pr ON pr.person_id = pe.id
JOIN roles r ON r.id = pr.role_id
WHERE pr.is_primary = 1
  AND p.id IN (SELECT id FROM projects WHERE priority = 'High' LIMIT 3)
  AND pe.id IN (SELECT id FROM people LIMIT 5)
LIMIT 10;

-- Verify the assignments were created
SELECT 
  'Scenario assignments created: ' || COUNT(*) as result
FROM scenario_project_assignments;

-- Show sample assignments
SELECT 
  s.name as scenario_name,
  p.name as project_name,
  pe.name as person_name,
  r.name as role_name,
  spa.allocation_percentage,
  spa.start_date,
  spa.end_date
FROM scenario_project_assignments spa
JOIN scenarios s ON spa.scenario_id = s.id
JOIN projects p ON spa.project_id = p.id
JOIN people pe ON spa.person_id = pe.id
JOIN roles r ON spa.role_id = r.id
LIMIT 10;