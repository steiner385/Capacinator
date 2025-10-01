-- Create demand gaps for testing
-- This script adds scenario assignments that exceed capacity for certain roles

-- First, check current active scenario
SELECT 'Current Active Scenarios:' as info;
SELECT id, name, status FROM scenarios WHERE status = 'active';

-- Add high-demand assignments to create gaps
-- Backend Developer role (assuming it exists)
INSERT INTO scenario_project_assignments (
    id,
    scenario_id,
    project_id,
    person_id,
    role_id,
    allocation_percentage,
    start_date,
    end_date,
    created_at,
    updated_at
)
SELECT 
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))) as id,
    s.id as scenario_id,
    p.id as project_id,
    people.id as person_id,
    r.id as role_id,
    150 as allocation_percentage, -- High allocation to create gap
    date('now') as start_date,
    date('now', '+3 months') as end_date,
    datetime('now') as created_at,
    datetime('now') as updated_at
FROM scenarios s
CROSS JOIN projects p
CROSS JOIN roles r
CROSS JOIN people
WHERE s.status = 'active'
AND r.name = 'Backend Developer'
AND p.name LIKE '%Critical%' -- Assign to critical projects
AND people.name LIKE '%Developer%'
LIMIT 1;

-- Frontend Developer role
INSERT INTO scenario_project_assignments (
    id,
    scenario_id,
    project_id,
    person_id,
    role_id,
    allocation_percentage,
    start_date,
    end_date,
    created_at,
    updated_at
)
SELECT 
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))) as id,
    s.id as scenario_id,
    p.id as project_id,
    people.id as person_id,
    r.id as role_id,
    120 as allocation_percentage,
    date('now') as start_date,
    date('now', '+3 months') as end_date,
    datetime('now') as created_at,
    datetime('now') as updated_at
FROM scenarios s
CROSS JOIN projects p
CROSS JOIN roles r
CROSS JOIN people
WHERE s.status = 'active'
AND r.name = 'Frontend Developer'
AND p.name LIKE '%Platform%'
AND people.name LIKE '%Frontend%'
LIMIT 1;

-- Data Scientist role (create significant gap)
INSERT INTO scenario_project_assignments (
    id,
    scenario_id,
    project_id,
    person_id,
    role_id,
    allocation_percentage,
    start_date,
    end_date,
    created_at,
    updated_at
)
SELECT 
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))) as id,
    s.id as scenario_id,
    p.id as project_id,
    people.id as person_id,
    r.id as role_id,
    200 as allocation_percentage, -- Very high allocation
    date('now') as start_date,
    date('now', '+3 months') as end_date,
    datetime('now') as created_at,
    datetime('now') as updated_at
FROM scenarios s
CROSS JOIN projects p
CROSS JOIN roles r
CROSS JOIN people
WHERE s.status = 'active'
AND r.name = 'Data Scientist'
AND p.name LIKE '%AI%'
AND people.name IN (SELECT name FROM people WHERE is_active = 1 LIMIT 1)
LIMIT 1;

-- Show the resulting gaps
SELECT 'Updated Capacity Gaps:' as info;
SELECT 
    role_name,
    total_capacity_fte,
    total_demand_fte,
    capacity_gap_fte,
    CASE 
        WHEN capacity_gap_fte < 0 THEN 'SHORTAGE'
        WHEN capacity_gap_fte > 0 THEN 'EXCESS'
        ELSE 'BALANCED'
    END as gap_type,
    status
FROM capacity_gaps_view
WHERE total_demand_fte > 0 OR capacity_gap_fte != 0
ORDER BY capacity_gap_fte ASC;