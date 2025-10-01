-- Add some test availability entries to demonstrate vacation/reduced availability
-- This will affect capacity calculations

-- Sarah Chen is on vacation for a week
INSERT INTO person_availability_overrides (person_id, start_date, end_date, availability_percentage, hours_per_day, override_type, reason, is_approved)
VALUES ('seed-pm-sarah', date('now'), date('now', '+7 days'), 0, 0, 'VACATION', 'Annual leave', 1);

-- Lisa Wang is on partial leave (50% availability)  
INSERT INTO person_availability_overrides (person_id, start_date, end_date, availability_percentage, hours_per_day, override_type, reason, is_approved)
VALUES ('seed-dev-lisa', date('now'), date('now', '+14 days'), 50, 4, 'REDUCED_HOURS', 'Part-time arrangement', 1);

-- Tom Anderson is in training (20% availability)
INSERT INTO person_availability_overrides (person_id, start_date, end_date, availability_percentage, hours_per_day, override_type, reason, is_approved)
VALUES ('seed-devops-tom', date('now'), date('now', '+3 days'), 20, 1.6, 'TRAINING', 'Cloud certification course', 1);