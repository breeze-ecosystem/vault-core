-- migrations/timescaledb/up/008_vehicle_events.sql
-- ANPR-04: Vehicle event log

CREATE TYPE vehicle_decision AS ENUM ('ALLOW', 'DENY', 'UNKNOWN');

CREATE TABLE vehicle_events (
    "time"       TIMESTAMPTZ NOT NULL,
    site_id      UUID NOT NULL,
    camera_id    UUID,
    plate        VARCHAR(20) NOT NULL,
    confidence   REAL,
    image_url    TEXT,
    decision     vehicle_decision NOT NULL,
    reason       VARCHAR(64),  -- 'allowlist', 'blocklist', 'unknown', 'schedule'
    metadata     JSONB
);

SELECT create_hypertable('vehicle_events', 'time',
    chunk_time_interval => INTERVAL '1 day'
);

ALTER TABLE vehicle_events SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('vehicle_events', INTERVAL '7 days');

-- ANPR-05: Search by plate or time range
CREATE INDEX idx_vehicle_events_plate ON vehicle_events (plate, "time" DESC);
CREATE INDEX idx_vehicle_events_site_time ON vehicle_events (site_id, "time" DESC);
