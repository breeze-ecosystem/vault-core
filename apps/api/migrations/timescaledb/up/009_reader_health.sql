-- EQPT-02: Reader health metrics
CREATE TABLE reader_health (
    time             TIMESTAMPTZ NOT NULL,
    reader_id        UUID NOT NULL,
    site_id          UUID NOT NULL,
    status           VARCHAR(16) NOT NULL,  -- 'online', 'offline', 'degraded'
    failed_reads     INT DEFAULT 0,
    response_time_ms INT,
    last_connected   TIMESTAMPTZ,
    firmware_version VARCHAR(32),
    metadata         JSONB
);

SELECT create_hypertable('reader_health', 'time',
    chunk_time_interval => INTERVAL '1 day'
);
SELECT add_retention_policy('reader_health', INTERVAL '90 days');

CREATE INDEX idx_reader_health_reader ON reader_health (reader_id, time DESC);
CREATE INDEX idx_reader_health_site ON reader_health (site_id, time DESC);
