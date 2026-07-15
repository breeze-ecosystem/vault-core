-- 020_audit_org_hash_chain.sql
-- D-11: Per-organization SHA-256 hash chain for audit_log hypertable.
-- Replaces entity-level chain (entity + entity_id) with organization-level
-- chain (organization_id) so verifyOrganizationChain() walks a correct
-- sequential chain per organization.
--
-- Prerequisites: 003_audit_log.sql (audit_log hypertable + pgcrypto extension)

-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop the entity-level trigger (chained by entity + entity_id)
DROP TRIGGER IF EXISTS trg_audit_hash_chain ON audit_log;

-- Replace with org-level hash chain function
CREATE OR REPLACE FUNCTION audit_hash_chain_trigger()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash TEXT;
BEGIN
    -- Find the most recent hash for this organization (per-org chain)
    SELECT hash INTO prev_hash
    FROM audit_log
    WHERE organization_id = NEW.organization_id
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

-- Apply org-level trigger to audit_log table
CREATE TRIGGER trg_audit_hash_chain
    BEFORE INSERT ON audit_log
    FOR EACH ROW
    EXECUTE FUNCTION audit_hash_chain_trigger();

-- Ensure organization_id column exists (may have been added earlier)
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Index for per-org chain walking
CREATE INDEX IF NOT EXISTS idx_audit_org_chain ON audit_log (organization_id, time);

-- Drop the entity-level index (no longer needed for primary chain)
-- Keep it for backward compatibility with existing entity-level queries
