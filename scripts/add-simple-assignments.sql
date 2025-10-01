-- Simple script to add a few project assignments for UI visibility
-- This creates direct project assignments from the most recent scenario assignments

DELETE FROM project_assignments;

-- Insert simplified assignments
INSERT INTO project_assignments (
  id,
  project_id, 
  person_id, 
  role_id, 
  allocation_percentage, 
  assignment_date_mode, 
  start_date, 
  end_date,
  notes
)
SELECT 
  -- Simple ID generation
  'pa-' || substr(spa.id, 1, 8),
  spa.project_id,
  spa.person_id,
  spa.role_id,
  spa.allocation_percentage,
  'fixed',
  COALESCE(spa.start_date, date('now')),
  COALESCE(spa.end_date, date('now', '+90 days')),
  'Copied from scenario: ' || spa.scenario_id
FROM scenario_project_assignments spa
JOIN scenarios s ON spa.scenario_id = s.id
WHERE s.scenario_id = 'current-q1-2025'
LIMIT 10;

-- If no assignments from current-q1-2025, try any active scenario
INSERT INTO project_assignments (
  id,
  project_id, 
  person_id, 
  role_id, 
  allocation_percentage, 
  assignment_date_mode, 
  start_date, 
  end_date,
  notes
)
SELECT 
  'pa-' || substr(spa.id, 1, 8),
  spa.project_id,
  spa.person_id,
  spa.role_id,
  spa.allocation_percentage,
  'fixed',
  COALESCE(spa.start_date, date('now')),
  COALESCE(spa.end_date, date('now', '+90 days')),
  'Copied from scenario: ' || spa.scenario_id
FROM scenario_project_assignments spa
JOIN scenarios s ON spa.scenario_id = s.id
WHERE s.status = 'active'
AND NOT EXISTS (SELECT 1 FROM project_assignments)
LIMIT 10;

-- Show what we created
SELECT COUNT(*) as assignment_count FROM project_assignments;