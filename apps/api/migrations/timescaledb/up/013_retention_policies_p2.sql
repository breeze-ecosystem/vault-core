-- AUDT-05: Configurable retention policies for Phase 2 hypertables
-- Note: Base retention is set per-hypertable above.
-- This file manages dynamic retention changes based on RetentionPolicy Prisma model.
-- For reference, the cron-driven pruning handles non-hypertable data.
-- This migration ensures all P2 hypertables have compression enabled:

ALTER TABLE reader_health SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id, reader_id',
    timescaledb.compress_orderby = 'time DESC'
);
SELECT add_compression_policy('reader_health', INTERVAL '7 days');

ALTER TABLE controller_health SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id, controller_id',
    timescaledb.compress_orderby = 'time DESC'
);
SELECT add_compression_policy('controller_health', INTERVAL '7 days');

ALTER TABLE camera_health SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id, camera_id',
    timescaledb.compress_orderby = 'time DESC'
);
SELECT add_compression_policy('camera_health', INTERVAL '7 days');
