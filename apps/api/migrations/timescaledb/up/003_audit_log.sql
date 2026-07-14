-- 003_audit_log.sql
-- D-17: Audit log hypertable with hash-chain support
-- Must run BEFORE Prisma migrations in production deployments (see run.sh)

CREATE TABLE audit_log (
    time          TIMESTAMPTZ NOT NULL,
    entity        VARCHAR(64) NOT NULL,
    entity_id     UUID NOT NULL,
    action        VARCHAR(32) NOT NULL,
    user_id       UUID,
    site_id       UUID,
    changes       JSONB,
    ip_address    VARCHAR(45),
    previous_hash TEXT,
    hash          TEXT NOT NULL,
    content       TEXT NOT NULL
);

SELECT create_hypertable('audit_log', 'time',
    chunk_time_interval => INTERVAL '7 days'
);

-- Per-entity index for chain walking
CREATE INDEX idx_audit_entity_chain ON audit_log (entity, entity_id, time);

-- Compression for audit chunks > 14 days
ALTER TABLE audit_log SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'entity, entity_id',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('audit_log', INTERVAL '14 days');

-- pgcrypto hash chain trigger (D-17)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION audit_hash_chain_trigger()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash TEXT;
BEGIN
    -- Find the most recent hash for this entity (per-entity chain)
    SELECT hash INTO prev_hash
    FROM audit_log
    WHERE entity = NEW.entity
      AND entity_id = NEW.entity_id
    ORDER BY time DESC, hash DESC
    LIMIT 1;

    -- Set previous_hash for verification
    NEW.previous_hash := prev_hash;

    -- Compute SHA-256: hash(previous_hash || content)
    NEW.hash := encode(
        digest(
            COALESCE(prev_hash, 'genesis') || NEW.content,
            'sha256'
        ),
        'hex'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_hash_chain
    BEFORE INSERT ON audit_log
    FOR EACH ROW
    EXECUTE FUNCTION audit_hash_chain_trigger();
