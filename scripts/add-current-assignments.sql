-- Add more scenario assignments with current dates to show proper utilization
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
-- Alice - 2 projects, 80% total utilization
('spa-alice-001', '42169f91-28cf-439b-9a07-0af0206b1b74', 
 (SELECT id FROM projects WHERE name = 'Mobile Banking App' LIMIT 1),
 '123e4567-e89b-12d3-a456-426614174000',
 (SELECT role_id FROM person_roles WHERE person_id = '123e4567-e89b-12d3-a456-426614174000' AND is_primary = 1),
 50, 'fixed', '2025-09-01', '2025-12-31', datetime('now'), datetime('now')),

('spa-alice-002', '42169f91-28cf-439b-9a07-0af0206b1b74', 
 (SELECT id FROM projects WHERE name = 'Customer Portal Redesign' LIMIT 1),
 '123e4567-e89b-12d3-a456-426614174000',
 (SELECT role_id FROM person_roles WHERE person_id = '123e4567-e89b-12d3-a456-426614174000' AND is_primary = 1),
 30, 'fixed', '2025-10-01', '2025-12-15', datetime('now'), datetime('now')),

-- Bob - 3 projects, 100% utilization
('spa-bob-001', '42169f91-28cf-439b-9a07-0af0206b1b74', 
 (SELECT id FROM projects WHERE name = 'AI Customer Support Chatbot' LIMIT 1),
 '123e4567-e89b-12d3-a456-426614174001',
 (SELECT role_id FROM person_roles WHERE person_id = '123e4567-e89b-12d3-a456-426614174001' AND is_primary = 1),
 40, 'fixed', '2025-09-15', '2025-11-30', datetime('now'), datetime('now')),

('spa-bob-002', '42169f91-28cf-439b-9a07-0af0206b1b74', 
 (SELECT id FROM projects WHERE name = 'Enterprise Data Analytics Platform' LIMIT 1),
 '123e4567-e89b-12d3-a456-426614174001',
 (SELECT role_id FROM person_roles WHERE person_id = '123e4567-e89b-12d3-a456-426614174001' AND is_primary = 1),
 40, 'fixed', '2025-08-01', '2025-12-31', datetime('now'), datetime('now')),

('spa-bob-003', '42169f91-28cf-439b-9a07-0af0206b1b74', 
 (SELECT id FROM projects WHERE name = 'Legacy System AWS Migration' LIMIT 1),
 '123e4567-e89b-12d3-a456-426614174001',
 (SELECT role_id FROM person_roles WHERE person_id = '123e4567-e89b-12d3-a456-426614174001' AND is_primary = 1),
 20, 'fixed', '2025-10-01', '2026-01-31', datetime('now'), datetime('now')),

-- Charlie - 1 project, 60% utilization
('spa-charlie-001', '42169f91-28cf-439b-9a07-0af0206b1b74', 
 (SELECT id FROM projects WHERE name = 'Security Penetration Testing' LIMIT 1),
 '123e4567-e89b-12d3-a456-426614174002',
 (SELECT role_id FROM person_roles WHERE person_id = '123e4567-e89b-12d3-a456-426614174002' AND is_primary = 1),
 60, 'fixed', '2025-09-01', '2025-10-31', datetime('now'), datetime('now')),

-- Diana - 2 projects, 90% utilization
('spa-diana-001', '42169f91-28cf-439b-9a07-0af0206b1b74', 
 (SELECT id FROM projects WHERE name = 'E-commerce Platform Modernization' LIMIT 1),
 '123e4567-e89b-12d3-a456-426614174003',
 (SELECT role_id FROM person_roles WHERE person_id = '123e4567-e89b-12d3-a456-426614174003' AND is_primary = 1),
 50, 'fixed', '2025-09-01', '2025-12-31', datetime('now'), datetime('now')),

('spa-diana-002', '42169f91-28cf-439b-9a07-0af0206b1b74', 
 (SELECT id FROM projects WHERE name = 'Fitness Tracking iOS App' LIMIT 1),
 '123e4567-e89b-12d3-a456-426614174003',
 (SELECT role_id FROM person_roles WHERE person_id = '123e4567-e89b-12d3-a456-426614174003' AND is_primary = 1),
 40, 'fixed', '2025-10-15', '2025-12-15', datetime('now'), datetime('now')),

-- Eve - Overallocated at 120%
('spa-eve-001', '42169f91-28cf-439b-9a07-0af0206b1b74', 
 (SELECT id FROM projects WHERE name = 'Computer Vision Platform' LIMIT 1),
 '123e4567-e89b-12d3-a456-426614174004',
 (SELECT role_id FROM person_roles WHERE person_id = '123e4567-e89b-12d3-a456-426614174004' AND is_primary = 1),
 80, 'fixed', '2025-08-01', '2025-11-30', datetime('now'), datetime('now')),

('spa-eve-002', '42169f91-28cf-439b-9a07-0af0206b1b74', 
 (SELECT id FROM projects WHERE name = 'SOX Compliance Automation' LIMIT 1),
 '123e4567-e89b-12d3-a456-426614174004',
 (SELECT role_id FROM person_roles WHERE person_id = '123e4567-e89b-12d3-a456-426614174004' AND is_primary = 1),
 40, 'fixed', '2025-10-01', '2025-12-31', datetime('now'), datetime('now')),

-- Frank - Underutilized at 20%
('spa-frank-001', '42169f91-28cf-439b-9a07-0af0206b1b74', 
 (SELECT id FROM projects WHERE name = 'Mobile Banking App' LIMIT 1),
 '123e4567-e89b-12d3-a456-426614174005',
 (SELECT role_id FROM person_roles WHERE person_id = '123e4567-e89b-12d3-a456-426614174005' AND is_primary = 1),
 20, 'fixed', '2025-11-01', '2025-12-31', datetime('now'), datetime('now'));

-- Delete the old test assignments that are causing the high percentages
DELETE FROM scenario_project_assignments 
WHERE id IN ('spa-001', 'spa-002', 'spa-003', 'spa-004', 'spa-005', 'spa-006', 'spa-007', 'spa-008', 'spa-009', 'spa-010');

-- Verify what we have
SELECT 
  p.name as person_name,
  COUNT(spa.id) as assignment_count,
  SUM(spa.allocation_percentage) as total_allocation,
  GROUP_CONCAT(proj.name || ' (' || spa.allocation_percentage || '%)') as projects
FROM scenario_project_assignments spa
JOIN people p ON spa.person_id = p.id
JOIN projects proj ON spa.project_id = proj.id
JOIN scenarios s ON spa.scenario_id = s.id
WHERE s.status = 'active'
  AND spa.start_date <= '2025-12-27'
  AND spa.end_date >= '2025-09-27'
GROUP BY p.id
ORDER BY total_allocation DESC;