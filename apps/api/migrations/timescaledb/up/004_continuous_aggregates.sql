-- 004_continuous_aggregates.sql
-- Pre-computed materialized views for dashboard queries
-- Must run AFTER 001_access_events.sql and 002_door_state_log.sql

-- Hourly access event counts per door
CREATE MATERIALIZED VIEW door_access_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    door_id,
    site_id,
    decision,
    COUNT(*) AS event_count
FROM access_events
GROUP BY bucket, door_id, site_id, decision;

-- Daily door state change summary for alerts dashboard
CREATE MATERIALIZED VIEW door_alert_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    door_id,
    site_id,
    state,
    COUNT(*) AS occurrence_count
FROM door_state_log
WHERE state IN ('held-open', 'forced', 'unsecured', 'desynchronized')
GROUP BY bucket, door_id, site_id, state;

-- Refresh policies
SELECT add_continuous_aggregate_policy('door_access_hourly',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);

SELECT add_continuous_aggregate_policy('door_alert_daily',
    start_offset => INTERVAL '2 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day'
);
