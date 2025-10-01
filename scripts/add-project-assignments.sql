-- This script copies active scenario assignments to project_assignments table
-- This is a temporary workaround to make assignments visible in the UI
-- The proper fix would be to update the UI to work with scenario-based assignments

-- First, clear any existing project assignments to avoid duplicates
DELETE FROM project_assignments;

-- Copy active scenario assignments to project_assignments
INSERT INTO project_assignments (
  id,
  project_id, 
  person_id, 
  role_id, 
  phase_id,
  allocation_percentage, 
  assignment_date_mode, 
  start_date, 
  end_date,
  notes,
  created_at,
  updated_at,
  computed_start_date,
  computed_end_date
)
SELECT 
  -- Generate new ID for project_assignments
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || 
  substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || 
  substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
  spa.project_id,
  spa.person_id,
  spa.role_id,
  spa.phase_id,
  spa.allocation_percentage,
  spa.assignment_date_mode,
  spa.start_date,
  spa.end_date,
  spa.notes,
  spa.created_at,
  spa.updated_at,
  -- For computed dates, use actual dates if fixed mode, otherwise calculate from phase
  CASE 
    WHEN spa.assignment_date_mode = 'fixed' THEN spa.start_date
    WHEN spa.assignment_date_mode = 'phase' AND spa.phase_id IS NOT NULL THEN 
      (SELECT ppt.start_date FROM project_phases_timeline ppt 
       WHERE ppt.project_id = spa.project_id AND ppt.phase_id = spa.phase_id)
    ELSE spa.start_date
  END as computed_start_date,
  CASE 
    WHEN spa.assignment_date_mode = 'fixed' THEN spa.end_date
    WHEN spa.assignment_date_mode = 'phase' AND spa.phase_id IS NOT NULL THEN 
      (SELECT ppt.end_date FROM project_phases_timeline ppt 
       WHERE ppt.project_id = spa.project_id AND ppt.phase_id = spa.phase_id)
    ELSE spa.end_date
  END as computed_end_date
FROM scenario_project_assignments spa
JOIN scenarios s ON spa.scenario_id = s.id
WHERE s.status = 'active'
AND s.scenario_type = 'baseline';

-- Verify the copy
SELECT 
  pa.id,
  p.name as project_name,
  pe.name as person_name,
  r.name as role_name,
  pa.allocation_percentage,
  pa.assignment_date_mode,
  pa.computed_start_date,
  pa.computed_end_date
FROM project_assignments pa
JOIN projects p ON pa.project_id = p.id
JOIN people pe ON pa.person_id = pe.id
JOIN roles r ON pa.role_id = r.id
ORDER BY p.name, pe.name;