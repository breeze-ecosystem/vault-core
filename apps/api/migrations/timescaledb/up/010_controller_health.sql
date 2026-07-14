-- EQPT-03: Door controller health metrics
CREATE TABLE controller_health (
    time                 TIMESTAMPTZ NOT NULL,
    controller_id        UUID NOT NULL,
    site_id              UUID NOT NULL,
    battery_level        REAL,            -- 0-100 percentage
    connection_stability VARCHAR(16),     -- 'stable', 'unstable', 'disconnected'
    firmware_version     VARCHAR(32),
    cpu_load             REAL,            -- 0-100 percentage
    memory_usage         REAL,            -- 0-100 percentage
    uptime_seconds       INT,
    metadata             JSONB
);

SELECT create_hypertable('controller_health', 'time',
    chunk_time_interval => INTERVAL '1 day'
);
SELECT add_retention_policy('controller_health', INTERVAL '90 days');

CREATE INDEX idx_controller_health_ctrl ON controller_health (controller_id, time DESC);
CREATE INDEX idx_controller_health_site ON controller_health (site_id, time DESC);
