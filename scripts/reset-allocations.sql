-- Reset all allocations to reasonable values
-- This will ensure charts can display the data properly

-- First, update direct assignments
-- Set allocation to 30% for everyone to start
UPDATE project_assignments
SET allocation_percentage = 30;

-- For people with multiple assignments, reduce to ensure total is under 100%
UPDATE project_assignments
SET allocation_percentage = 
  CASE 
    WHEN person_id IN (
      SELECT person_id 
      FROM project_assignments 
      GROUP BY person_id 
      HAVING COUNT(*) >= 3
    ) THEN 25
    ELSE 40
  END;

-- Update scenario assignments similarly
UPDATE scenario_project_assignments
SET allocation_percentage = 20
WHERE scenario_id IN (SELECT id FROM scenarios WHERE status = 'active');

-- Create a few realistic allocations for specific people
-- Alice: 2 projects at 40% each = 80% total
UPDATE project_assignments
SET allocation_percentage = 40
WHERE person_id = '123e4567-e89b-12d3-a456-426614174000'
AND project_id IN (
  SELECT project_id FROM project_assignments 
  WHERE person_id = '123e4567-e89b-12d3-a456-426614174000' 
  LIMIT 2
);

-- Bob: 3 projects at 30% each = 90% total  
UPDATE project_assignments
SET allocation_percentage = 30
WHERE person_id = '123e4567-e89b-12d3-a456-426614174001'
AND project_id IN (
  SELECT project_id FROM project_assignments 
  WHERE person_id = '123e4567-e89b-12d3-a456-426614174001' 
  LIMIT 3
);

-- Charlie: 1 project at 60% = 60% total
UPDATE project_assignments
SET allocation_percentage = 60
WHERE person_id = '123e4567-e89b-12d3-a456-426614174002'
AND project_id IN (
  SELECT project_id FROM project_assignments 
  WHERE person_id = '123e4567-e89b-12d3-a456-426614174002' 
  LIMIT 1
);

-- Diana: 2 projects at 45% each = 90% total
UPDATE project_assignments
SET allocation_percentage = 45
WHERE person_id = '123e4567-e89b-12d3-a456-426614174003'
AND project_id IN (
  SELECT project_id FROM project_assignments 
  WHERE person_id = '123e4567-e89b-12d3-a456-426614174003' 
  LIMIT 2
);

-- Eve: Overallocated at 60% + 60% = 120% total
UPDATE project_assignments
SET allocation_percentage = 60
WHERE person_id = '123e4567-e89b-12d3-a456-426614174004'
AND project_id IN (
  SELECT project_id FROM project_assignments 
  WHERE person_id = '123e4567-e89b-12d3-a456-426614174004' 
  LIMIT 2
);

-- Verify the results
SELECT 
  p.name,
  COUNT(pa.id) as assignments,
  SUM(pa.allocation_percentage) as total_allocation
FROM project_assignments pa
JOIN people p ON pa.person_id = p.id
GROUP BY pa.person_id
ORDER BY total_allocation DESC
LIMIT 10;