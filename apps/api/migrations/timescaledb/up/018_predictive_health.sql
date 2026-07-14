-- EQPT-04: Predictive health predictions hypertable
CREATE TABLE predictions (
    time TIMESTAMPTZ NOT NULL,
    site_id UUID NOT NULL,
    device_type VARCHAR(32) NOT NULL,  -- 'camera', 'reader', 'controller'
    device_id UUID NOT NULL,
    metric VARCHAR(64) NOT NULL,        -- 'battery_level', 'fps_ratio', 'latency_ms', 'failed_reads'
    current_value DOUBLE PRECISION NOT NULL,
    failure_threshold DOUBLE PRECISION NOT NULL,
    slope DOUBLE PRECISION NOT NULL,     -- Rate of change per hour
    hours_to_failure INTEGER,            -- Estimated hours until threshold crossed (NULL if not degrading)
    confidence VARCHAR(16) NOT NULL,      -- 'high', 'medium', 'low'
    data_points INTEGER NOT NULL,         -- Number of data points used in trend
    triggered_alert BOOLEAN DEFAULT FALSE
);

SELECT create_hypertable('predictions', 'time',
    chunk_time_interval => INTERVAL '7 days'
);

ALTER TABLE predictions SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id, device_type',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('predictions', INTERVAL '30 days');

SELECT add_retention_policy('predictions', INTERVAL '365 days');

CREATE INDEX idx_predictions_device_time ON predictions (device_type, device_id, time DESC);
CREATE INDEX idx_predictions_site_time ON predictions (site_id, time DESC);
CREATE INDEX idx_predictions_pending ON predictions (triggered_alert, time DESC) WHERE hours_to_failure IS NOT NULL;
