-- Step 1: Create people and assign roles
PRAGMA foreign_keys = ON;

-- Clear existing seed data
DELETE FROM person_roles WHERE person_id LIKE 'seed-%';
DELETE FROM people WHERE id LIKE 'seed-%';

-- Create people
INSERT INTO people (id, name, email, is_active, default_availability_percentage, worker_type) VALUES
-- Project Managers
('seed-pm-sarah', 'Sarah Chen', 'sarah.chen@example.com', 1, 100, 'FTE'),
('seed-pm-mike', 'Michael Rodriguez', 'michael.rodriguez@example.com', 1, 100, 'FTE'),
-- Software Engineers
('seed-dev-john', 'John Smith', 'john.smith@example.com', 1, 100, 'FTE'),
('seed-dev-emily', 'Emily Johnson', 'emily.johnson@example.com', 1, 100, 'FTE'),
('seed-dev-raj', 'Raj Patel', 'raj.patel@example.com', 1, 100, 'FTE'),
('seed-dev-lisa', 'Lisa Wang', 'lisa.wang@example.com', 1, 80, 'FTE'),
-- QA Engineers
('seed-qa-alex', 'Alex Thompson', 'alex.thompson@example.com', 1, 100, 'FTE'),
('seed-qa-maria', 'Maria Garcia', 'maria.garcia@example.com', 1, 100, 'FTE'),
-- UI/UX Designers
('seed-ux-david', 'David Lee', 'david.lee@example.com', 1, 100, 'FTE'),
('seed-ux-anna', 'Anna Kowalski', 'anna.kowalski@example.com', 1, 100, 'FTE'),
-- DevOps Engineers
('seed-devops-tom', 'Tom Anderson', 'tom.anderson@example.com', 1, 100, 'FTE'),
('seed-devops-nina', 'Nina Petrov', 'nina.petrov@example.com', 1, 100, 'Contractor'),
-- Data Scientists
('seed-data-james', 'James Wilson', 'james.wilson@example.com', 1, 100, 'FTE'),
('seed-data-sophie', 'Sophie Martin', 'sophie.martin@example.com', 1, 100, 'FTE');

SELECT COUNT(*) || ' people created' FROM people WHERE id LIKE 'seed-%';