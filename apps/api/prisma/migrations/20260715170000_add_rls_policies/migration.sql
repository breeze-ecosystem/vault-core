/*
  Migration: Add RLS policies for tenant isolation

  This migration adds PostgreSQL Row-Level Security (RLS) policies on all
  organization-scoped tables. It is the defense-in-depth layer of two-layer
  tenant isolation (D-09): the Prisma Client Extension handles model-level
  scoping; RLS catches raw SQL queries and direct database access.

  The migration:
  1. Creates a PL/pgSQL helper function `create_tenant_policy` to reduce repetition
  2. Enables RLS and creates `tenant_isolation` policy on each scoped table
  3. Drops the helper function after use

  Each policy checks `app.current_organization_id` session variable (set by
  TenantContextMiddleware) against the row's `organizationId` column.

  NOTE: Organization and User are excluded — Organization is the tenant root
  (no organizationId column) and User is scoped via OrganizationMember join table.
  This matches the SCOPED_MODELS list in tenant-extension.ts (12 models total).
*/

-- ─── HELPER FUNCTION ─────────────────────────────────────

CREATE OR REPLACE FUNCTION create_tenant_policy(table_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- Enable RLS on the table
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name);

  -- Create the tenant isolation policy
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %I
     FOR ALL
     USING ("organizationId" = current_setting(''app.current_organization_id'', true)::uuid)
     WITH CHECK ("organizationId" = current_setting(''app.current_organization_id'', true)::uuid);',
    table_name
  );
END;
$$ LANGUAGE plpgsql;

-- ─── APPLY POLICIES TO ALL 12 SCOPED TABLES ──────────────

SELECT create_tenant_policy('Camera');
SELECT create_tenant_policy('Door');
SELECT create_tenant_policy('Zone');
SELECT create_tenant_policy('Incident');
SELECT create_tenant_policy('VehicleList');
SELECT create_tenant_policy('AuditLog');
SELECT create_tenant_policy('OrganizationMember');
SELECT create_tenant_policy('Invite');
SELECT create_tenant_policy('FeatureFlag');
SELECT create_tenant_policy('Credential');
SELECT create_tenant_policy('Alert');
SELECT create_tenant_policy('CameraPrompt');

-- ─── CLEAN UP ─────────────────────────────────────────────

DROP FUNCTION create_tenant_policy(TEXT);

-- ─── VERIFICATION: Confirm policies exist ────────────────

-- SELECT tablename, policyname, permissive, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('Camera','Door','Zone','Incident','VehicleList',
--   'AuditLog','OrganizationMember','Invite','FeatureFlag','Credential',
--   'Alert','CameraPrompt')
-- ORDER BY tablename;
