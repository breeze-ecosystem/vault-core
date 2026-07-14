-- Recurring pattern detection hypertable
-- Follows Pattern 3 from RESEARCH.md: TimescaleDB for time-series pattern data
-- Part of Phase 3: Intelligent Platform (RSK-02)

-- Create enum for pattern severity levels
CREATE TYPE pattern_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Create the hypertable for detected recurring patterns
CREATE TABLE detected_patterns (
    time TIMESTAMPTZ NOT NULL,
    site_id UUID NOT NULL,
    pattern_id VARCHAR(64) NOT NULL,
    pattern_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(32) NOT NULL,  -- 'door', 'reader', 'camera', 'controller'
    device_id UUID NOT NULL,
    occurrence_count INTEGER NOT NULL,
    severity pattern_severity NOT NULL,
    metadata JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ
);

-- Convert to hypertable with 7-day chunk interval
SELECT create_hypertable('detected_patterns', 'time',
    chunk_time_interval => INTERVAL '7 days'
);

-- Enable compression
ALTER TABLE detected_patterns SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id, pattern_id',
    timescaledb.compress_orderby = 'time DESC'
);

-- Automatically compress chunks older than 30 days
SELECT add_compression_policy('detected_patterns', INTERVAL '30 days');

-- Retain data for 365 days
SELECT add_retention_policy('detected_patterns', INTERVAL '365 days');

-- Index for site-scoped queries (dashboard filtering by site)
CREATE INDEX idx_patterns_site_time ON detected_patterns (site_id, time DESC);

-- Index for device-scoped queries (filter by specific door/reader/camera)
CREATE INDEX idx_patterns_device ON detected_patterns (device_type, device_id, time DESC);

-- Index for active unresolved patterns (dashboard default view)
CREATE INDEX idx_patterns_active ON detected_patterns (severity, time DESC) WHERE resolved = FALSE;
