-- 001_access_events.sql
-- D-16: Hypertable for access events with 1-day chunks
-- Must run BEFORE Prisma migrations in production deployments (see run.sh)

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TYPE event_decision AS ENUM ('granted', 'denied', 'tailgate', 'error');

CREATE TABLE access_events (
    time          TIMESTAMPTZ NOT NULL,
    site_id       UUID NOT NULL,
    zone_id       UUID,
    door_id       UUID NOT NULL,
    credential_id UUID,
    user_id       UUID,
    decision      event_decision NOT NULL,
    reason        VARCHAR(64),
    metadata      JSONB,
    sequence      BIGINT
);

-- Convert to hypertable with 1-day chunks
SELECT create_hypertable('access_events', 'time',
    chunk_time_interval => INTERVAL '1 day'
);

-- Enable compression for chunks older than 7 days
ALTER TABLE access_events SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id, door_id',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('access_events', INTERVAL '7 days');

-- Indexes for common query patterns (VEC-05)
CREATE INDEX idx_access_events_site_time ON access_events (site_id, time DESC);
CREATE INDEX idx_access_events_door_time ON access_events (door_id, time DESC);
CREATE INDEX idx_access_events_user_time ON access_events (user_id, time DESC);
CREATE INDEX idx_access_events_credential ON access_events (credential_id, time DESC);
