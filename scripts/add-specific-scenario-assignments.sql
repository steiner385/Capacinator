-- Add specific scenario assignments using actual IDs
-- First, let's see what we're working with
SELECT 'Projects:' as label;
SELECT id, name FROM projects LIMIT 5;

SELECT 'People:' as label;
SELECT id, name FROM people LIMIT 5;

SELECT 'Roles:' as label;
SELECT id, name FROM roles WHERE name IN ('Mobile Developer', 'Frontend Developer', 'Backend Developer', 'Data Scientist', 'Cloud Architect') LIMIT 5;

SELECT 'Active Scenario:' as label;
SELECT id, name FROM scenarios WHERE status = 'active' AND scenario_type = 'baseline' LIMIT 1;

-- Now insert specific assignments
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
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || 
  substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || 
  substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
  '42169f91-28cf-439b-9a07-0af0206b1b74',
  p.id,
  pe.id,
  pr.role_id,
  CASE 
    WHEN ROW_NUMBER() OVER (PARTITION BY pe.id) = 1 THEN 80
    WHEN ROW_NUMBER() OVER (PARTITION BY pe.id) = 2 THEN 20
    ELSE 10
  END,
  'fixed',
  date('now', '-' || (abs(random()) % 30) || ' days'),
  date('now', '+' || (30 + abs(random()) % 60) || ' days'),
  datetime('now'),
  datetime('now')
FROM projects p
CROSS JOIN people pe
JOIN person_roles pr ON pr.person_id = pe.id AND pr.is_primary = 1
WHERE p.id IN (SELECT id FROM projects LIMIT 4)
  AND pe.id IN (SELECT id FROM people LIMIT 6)
  AND (
    -- Limit to reasonable combinations
    (pe.name LIKE '%Alice%' AND p.name LIKE '%AI%') OR
    (pe.name LIKE '%Bob%' AND p.name LIKE '%AWS%') OR
    (pe.name LIKE '%Charlie%' AND p.name LIKE '%Mobile%') OR
    (pe.name NOT LIKE '%Alice%' AND pe.name NOT LIKE '%Bob%' AND pe.name NOT LIKE '%Charlie%')
  )
LIMIT 12;

-- Verify what was created
SELECT 
  'Created ' || COUNT(*) || ' scenario assignments' as result
FROM scenario_project_assignments;