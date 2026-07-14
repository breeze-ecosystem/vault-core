-- 019_rls_policies.sql
-- AUDT-06: Multi-site isolation via PostgreSQL Row-Level Security
-- Enables RLS on all site-scoped hypertables and the Prisma Incident reference table.
-- Site context is provided per-request by SiteContextMiddleware via set_config('app.current_site_id').

-- Function to retrieve the current site_id from session variable.
CREATE OR REPLACE FUNCTION public.get_current_site_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_site_id', TRUE), '')::UUID;
$$;

-- ── TimescaleDB hypertables ──

-- Access Events
ALTER TABLE access_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON access_events
  FOR ALL USING (site_id = get_current_site_id());

-- Door State Log
ALTER TABLE door_state_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON door_state_log
  FOR ALL USING (site_id = get_current_site_id());

-- Incident Events
ALTER TABLE incident_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON incident_events
  FOR ALL USING (site_id = get_current_site_id());

-- Vehicle Events
ALTER TABLE vehicle_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON vehicle_events
  FOR ALL USING (site_id = get_current_site_id());

-- Reader Health
ALTER TABLE reader_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON reader_health
  FOR ALL USING (site_id = get_current_site_id());

-- Controller Health
ALTER TABLE controller_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON controller_health
  FOR ALL USING (site_id = get_current_site_id());

-- Camera Health
ALTER TABLE camera_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON camera_health
  FOR ALL USING (site_id = get_current_site_id());

-- Event Embeddings
ALTER TABLE event_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON event_embeddings
  FOR ALL USING (site_id = get_current_site_id());

-- Risk Scores (Phase 3)
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON risk_scores
  FOR ALL USING (site_id = get_current_site_id());

-- Detected Patterns (Phase 3)
ALTER TABLE detected_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON detected_patterns
  FOR ALL USING (site_id = get_current_site_id());

-- Predictions (Phase 3)
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON predictions
  FOR ALL USING (site_id = get_current_site_id());

-- ── Prisma reference table ──
-- Note: "Incident" is double-quoted because Prisma uses mixed-case identifiers.

ALTER TABLE "Incident" ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON "Incident"
  FOR ALL USING (site_id = get_current_site_id()::text);
