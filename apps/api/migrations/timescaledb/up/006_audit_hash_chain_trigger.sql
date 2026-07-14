-- 006_audit_hash_chain_trigger.sql
-- D-17: pgcrypto SHA-256 hash chain trigger for audit_log hypertable.
-- Canonical trigger definition (companion to 003_audit_log.sql which creates
-- the hypertable and initial trigger).
--
-- This migration is idempotent — safe to re-run to ensure the trigger is
-- registered. It replaces any existing trg_audit_hash_chain trigger and
-- function.
--
-- Prerequisites: 003_audit_log.sql (audit_log hypertable + pgcrypto extension)

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION audit_hash_chain_trigger()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash TEXT;
BEGIN
    -- Find the most recent hash for this entity (per-entity chain, NOT global)
    SELECT hash INTO prev_hash
    FROM audit_log
    WHERE entity = NEW.entity
      AND entity_id = NEW.entity_id
    ORDER BY time DESC, hash DESC
    LIMIT 1;

    -- Set previous_hash for verification
    NEW.previous_hash := prev_hash;

    -- Compute SHA-256: hash(previous_hash || content)
    -- content must be the canonical representation of the mutation
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

-- Apply trigger to audit_log table
DROP TRIGGER IF EXISTS trg_audit_hash_chain ON audit_log;
CREATE TRIGGER trg_audit_hash_chain
    BEFORE INSERT ON audit_log
    FOR EACH ROW
    EXECUTE FUNCTION audit_hash_chain_trigger();
