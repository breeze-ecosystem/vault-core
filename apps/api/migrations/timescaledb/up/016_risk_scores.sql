-- Risk scores hypertable for dynamic risk scoring engine
-- Stores per-zone risk scores computed every 5 minutes
-- Part of Phase 3: Intelligent Platform — Risk Scoring (RSK-01)

-- Create enum for risk levels
CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'elevated', 'critical');

-- Create the hypertable for risk scores
CREATE TABLE risk_scores (
    time TIMESTAMPTZ NOT NULL,
    zone_id UUID NOT NULL,
    site_id UUID NOT NULL,
    score SMALLINT NOT NULL CHECK (score >= 0 AND score <= 100),
    risk_level risk_level NOT NULL,
    factors JSONB NOT NULL,
    smoothed_score SMALLINT NOT NULL CHECK (smoothed_score >= 0 AND smoothed_score <= 100)
);

-- Convert to hypertable with 7-day chunk interval
SELECT create_hypertable('risk_scores', 'time',
    chunk_time_interval => INTERVAL '7 days'
);

-- Enable compression
ALTER TABLE risk_scores SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id, zone_id',
    timescaledb.compress_orderby = 'time DESC'
);

-- Automatically compress chunks older than 14 days
SELECT add_compression_policy('risk_scores', INTERVAL '14 days');

-- Retain data for 90 days
SELECT add_retention_policy('risk_scores', INTERVAL '90 days');

-- Index for zone-scoped queries (trend history per zone)
CREATE INDEX idx_risk_scores_zone_time ON risk_scores (zone_id, time DESC);

-- Index for site-scoped queries (dashboard overview by site)
CREATE INDEX idx_risk_scores_site_time ON risk_scores (site_id, time DESC);

-- Partial index for critical/elevated scores (fast alert queries)
CREATE INDEX idx_risk_scores_level ON risk_scores (risk_level, time DESC) WHERE risk_level IN ('elevated', 'critical');
