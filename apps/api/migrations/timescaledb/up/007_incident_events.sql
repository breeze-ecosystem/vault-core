-- Incident events hypertable for state change tracking
-- Follows Pattern 3 from RESEARCH.md: TimescaleDB for time-series event data
-- Part of Phase 2: Incident Management (INC-05)

-- Create enum for incident lifecycle states
CREATE TYPE incident_status AS ENUM ('open', 'triage', 'investigating', 'resolved', 'closed');

-- Create the hypertable for incident state transitions
CREATE TABLE incident_events (
    time TIMESTAMPTZ NOT NULL,
    incident_id UUID NOT NULL,
    site_id UUID NOT NULL,
    status incident_status NOT NULL,
    previous_status incident_status,
    assigned_to_id UUID,
    triggered_by VARCHAR(64),
    metadata JSONB
);

-- Convert to hypertable with 7-day chunk interval
SELECT create_hypertable('incident_events', 'time', chunk_time_interval => INTERVAL '7 days');

-- Enable compression
ALTER TABLE incident_events SET (
    timescaledb.compress,
    compress_segmentby = 'site_id, incident_id',
    compress_orderby = 'time DESC'
);

-- Automatically compress chunks older than 30 days
SELECT add_compression_policy('incident_events', INTERVAL '30 days');

-- Retain data for 365 days per compliance requirements
SELECT add_retention_policy('incident_events', INTERVAL '365 days');

-- Index for incident-scoped queries (status history per incident)
CREATE INDEX idx_incident_events_incident ON incident_events (incident_id, time DESC);

-- Index for site-scoped queries (dashboard timeline by site)
CREATE INDEX idx_incident_events_site ON incident_events (site_id, time DESC);
