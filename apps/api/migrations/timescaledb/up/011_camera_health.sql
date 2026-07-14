-- EQPT-01: Camera health metrics
CREATE TABLE camera_health (
    time             TIMESTAMPTZ NOT NULL,
    camera_id        UUID NOT NULL,
    site_id          UUID NOT NULL,
    status           VARCHAR(16) NOT NULL,  -- 'online', 'offline', 'degraded'
    fps_actual       REAL,                  -- Actual frames per second
    fps_expected     REAL,                  -- Expected frames per second
    latency_ms       INT,                   -- Streaming latency
    last_heartbeat   TIMESTAMPTZ,
    metadata         JSONB
);

SELECT create_hypertable('camera_health', 'time',
    chunk_time_interval => INTERVAL '1 day'
);
SELECT add_retention_policy('camera_health', INTERVAL '90 days');

CREATE INDEX idx_camera_health_camera ON camera_health (camera_id, time DESC);
CREATE INDEX idx_camera_health_site ON camera_health (site_id, time DESC);
