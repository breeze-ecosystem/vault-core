-- 002_door_state_log.sql
-- D-16: Hypertable for door state changes with 1-day chunks
-- Must run BEFORE Prisma migrations in production deployments (see run.sh)

CREATE TYPE door_state AS ENUM ('locked', 'unlocked', 'held-open', 'forced', 'unsecured', 'desynchronized');

CREATE TABLE door_state_log (
    time           TIMESTAMPTZ NOT NULL,
    door_id        UUID NOT NULL,
    site_id        UUID NOT NULL,
    state          door_state NOT NULL,
    previous_state door_state,
    sequence       BIGINT NOT NULL,
    triggered_by   VARCHAR(64),
    metadata       JSONB
);

SELECT create_hypertable('door_state_log', 'time',
    chunk_time_interval => INTERVAL '1 day'
);

ALTER TABLE door_state_log SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id, door_id',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('door_state_log', INTERVAL '7 days');

-- DOOR-06: Fast lookup of current door state
CREATE INDEX idx_door_state_current ON door_state_log (door_id, time DESC);

-- DOOR-02, DOOR-03: Find abnormal states
CREATE INDEX idx_door_state_type ON door_state_log (state, time DESC)
    WHERE state IN ('held-open', 'forced', 'unsecured', 'desynchronized');
