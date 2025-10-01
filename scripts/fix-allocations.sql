-- Fix allocation percentages to be more realistic
-- First, let's see what we have
SELECT 'Current allocations:';
SELECT 
  p.name as person,
  COUNT(pa.id) as assignments,
  SUM(pa.allocation_percentage) as total_allocation
FROM project_assignments pa
JOIN people p ON pa.person_id = p.id
GROUP BY pa.person_id
ORDER BY total_allocation DESC;

-- Update all allocations to be more reasonable
-- Divide by the number of assignments to get average allocation
UPDATE project_assignments
SET allocation_percentage = 
  CASE 
    WHEN person_id IN (
      SELECT person_id 
      FROM project_assignments 
      GROUP BY person_id 
      HAVING COUNT(*) > 3
    ) THEN ROUND(80.0 / (
      SELECT COUNT(*) 
      FROM project_assignments pa2 
      WHERE pa2.person_id = project_assignments.person_id
    ))
    ELSE ROUND(100.0 / (
      SELECT COUNT(*) 
      FROM project_assignments pa2 
      WHERE pa2.person_id = project_assignments.person_id
    ))
  END
WHERE allocation_percentage > 100;

-- For scenario assignments too if they exist
UPDATE scenario_project_assignments
SET allocation_percentage = 
  CASE 
    WHEN allocation_percentage > 80 THEN 40
    WHEN allocation_percentage > 60 THEN 30
    ELSE allocation_percentage
  END
WHERE allocation_percentage > 40;

-- Verify the results
SELECT 'After update:';
SELECT 
  p.name as person,
  COUNT(pa.id) as assignments,
  SUM(pa.allocation_percentage) as total_allocation
FROM project_assignments pa
JOIN people p ON pa.person_id = p.id
GROUP BY pa.person_id
ORDER BY total_allocation DESC;