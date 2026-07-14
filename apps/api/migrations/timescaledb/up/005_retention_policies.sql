-- 005_retention_policies.sql
-- D-16: Retention policies for time-series hypertables
-- Must run AFTER 001_access_events.sql, 002_door_state_log.sql, 003_audit_log.sql

-- 90-day retention for audit_log
SELECT add_retention_policy('audit_log', INTERVAL '90 days',
    if_not_exists => true
);

-- 365-day retention for access events and door state log
SELECT add_retention_policy('access_events', INTERVAL '365 days',
    if_not_exists => true
);

SELECT add_retention_policy('door_state_log', INTERVAL '365 days',
    if_not_exists => true
);
