-- 014_analytics_aggregates.sql
-- Security Analytics Continuous Aggregates for Phase 3
-- Must run AFTER 001_access_events.sql, 002_door_state_log.sql, 007_incident_events.sql
-- Provides zone_analytics_hourly and site_analytics_daily for sub-second dashboard queries

-- 1. zone_analytics_hourly: Per-zone security metrics aggregated hourly
CREATE MATERIALIZED VIEW zone_analytics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', COALESCE(ae.time, dsl.time)) AS bucket,
    z.id AS zone_id,
    z.site_id,
    COUNT(*) FILTER (WHERE ae.decision = 'denied') AS denied_count,
    COUNT(*) FILTER (WHERE ae.decision = 'granted') AS granted_count,
    COUNT(*) FILTER (WHERE dsl.state IN ('forced', 'held-open')) AS door_anomaly_count,
    COUNT(*) FILTER (WHERE dsl.state = 'unsecured') AS unsecured_count,
    COUNT(DISTINCT ae.door_id) AS active_doors
FROM zones z
JOIN doors d ON d.zone_id = z.id
LEFT JOIN access_events ae ON ae.door_id = d.id AND ae.time >= NOW() - INTERVAL '48 hours'
LEFT JOIN door_state_log dsl ON dsl.door_id = d.id AND dsl.time >= NOW() - INTERVAL '48 hours'
GROUP BY bucket, z.id, z.site_id
WITH NO DATA;

SELECT add_continuous_aggregate_policy('zone_analytics_hourly',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);

-- 2. site_analytics_daily: Per-site daily analytics summary for executive dashboard
CREATE MATERIALIZED VIEW site_analytics_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', COALESCE(ae.time, dsl.time, ie.time)) AS bucket,
    COALESCE(ae.site_id, dsl.site_id, ie.site_id) AS site_id,
    COUNT(*) FILTER (WHERE ae.decision = 'denied') AS total_denied,
    COUNT(*) FILTER (WHERE ae.decision = 'granted') AS total_granted,
    COUNT(DISTINCT dsl.door_id) FILTER (WHERE dsl.state IN ('forced', 'held-open')) AS doors_with_anomalies,
    COUNT(DISTINCT dsl.door_id) FILTER (WHERE dsl.state = 'unsecured') AS doors_unsecured,
    COUNT(DISTINCT ie.incident_id) AS incidents_created
FROM access_events ae
FULL JOIN door_state_log dsl ON dsl.site_id = ae.site_id AND dsl.time = ae.time
FULL JOIN incident_events ie ON ie.site_id = COALESCE(ae.site_id, dsl.site_id) AND ie.time = COALESCE(ae.time, dsl.time)
GROUP BY bucket, COALESCE(ae.site_id, dsl.site_id, ie.site_id)
WITH NO DATA;

SELECT add_continuous_aggregate_policy('site_analytics_daily',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day'
);

-- 3. Indexes for efficient zone/site lookups on the materialized views
CREATE INDEX idx_zone_analytics_zone_bucket ON zone_analytics_hourly (zone_id, bucket DESC);
CREATE INDEX idx_zone_analytics_site_bucket ON zone_analytics_hourly (site_id, bucket DESC);
CREATE INDEX idx_site_analytics_site_bucket ON site_analytics_daily (site_id, bucket DESC);
