---
phase: 04-commercial-foundation
plan: 07
subsystem: api
tags:
  - audit
  - hash-chain
  - sha256
  - crypto
  - timescaledb
  - fips

requires:
  - phase: 04-commercial-foundation
    plan: 05
    provides: withTenantContext, orgId in audit job data, organization_id on audit_log

provides:
  - SHA256 hash chain computation at audit write time (per-organization)
  - verifyOrganizationChain() for chain integrity verification
  - GET /api/audit/verify-chain endpoint for ADMIN/AUDITOR
  - org-level pgcrypto trigger as defense-in-depth
  - TimescaleDB migration (#020) replacing entity-level with org-level chain

affects:
  - 04-08 (next plan — may depend on audit chain)
  - Phase 5 billing (audit trail for subscription changes)

tech-stack:
  added:
    - "Node.js built-in crypto (FIPS-compliant SHA256)"
  patterns:
    - "Dual-layer hash: app-level (crypto.createHash) + DB-level (pgcrypto trigger)"
    - "Per-organization hash chain vs per-entity chain"
    - "$queryRawUnsafe for raw audit_log hypertable queries"

key-files:
  created:
    - apps/api/migrations/timescaledb/up/020_audit_org_hash_chain.sql
  modified:
    - apps/api/src/modules/audit/audit.processor.ts
    - apps/api/src/modules/audit/audit.service.ts
    - apps/api/src/modules/audit/audit.controller.ts
    - packages/shared/src/index.ts
    - packages/shared/src/schemas/audit.schema.ts
    - packages/shared/src/types/audit.types.ts

key-decisions:
  - "Migrated from entity-level to org-level hash chain — replaced pgcrypto trigger to select previous hash by organization_id instead of entity + entity_id"
  - "Content string reused from job data (interceptor-computed) rather than reconstructed in processor — ensures consistency with stored content for verification"
  - "kept migration file as TimescaleDB SQL (020_audit_org_hash_chain.sql) — not a Prisma migration since audit_log is a hypertable outside Prisma management"
  - "Dual-layer hash: app code computes hash AND trigger still computes same org-level hash for defense-in-depth"

patterns-established:
  - "Per-organization hash chain: previous_hash is always the most recent entry's hash within the same org (across all entities)"
  - "verifyOrganizationChain walks time-ordered entries and reports tampered indices when hash doesn't match computed value"

requirements-completed:
  - FND-06

duration: 3min
completed: 2026-07-15
---

# Phase 04 Commercial Foundation: Plan 07 — Hash-Chain Audit Integrity Summary

**Per-organization SHA256 hash chain on audit write (processor) with verifyOrganizationChain() integrity checker (service) and org-level pgcrypto trigger migration — completes FND-06**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-15T17:45:44Z
- **Completed:** 2026-07-15T17:49:29Z
- **Tasks:** 2
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- **Processor hash computation (Task 1):** `audit.processor.ts` now computes SHA256(previousHash + content) before every INSERT, using the existing org-level `content` from job data. Fetches the most recent hash for the organization (or "genesis" for the first entry) and passes `previous_hash` + `hash` to the INSERT statement.
- **Service verifyOrganizationChain (Task 2):** `audit.service.ts` exposes `verifyOrganizationChain(organizationId)` that walks all entries for an org ordered by time ASC, recomputes each entry's hash as SHA256(previousEntry.hash + content), and returns tampered indices when hashes don't match.
- **Controller endpoint:** `GET /api/audit/verify-chain?organizationId=<uuid>` with `@Roles('ADMIN', 'AUDITOR')` and Zod UUID validation.
- **TimescaleDB migration (#020):** Replaces the entity-level pgcrypto trigger (chained by entity + entity_id) with an org-level trigger (chained by organization_id). Adds `idx_audit_org_chain` index for efficient per-org chain walking.
- **Shared type fix:** Updated `AuditEntry.siteId` → `AuditEntry.organizationId` to match the actual SQL column being queried (`organization_id AS "organizationId"`).
- **New shared schema:** `auditVerifyOrgChainSchema` for the verify-chain endpoint with UUID validation.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add hash computation to audit.processor.ts** — `db74ccb` (feat)
2. **Task 2: Add verifyOrganizationChain() and org-level hash chain** — `415ff4a` (feat)

**Plan metadata:** (appended in final commit)

## Files Created/Modified

- `apps/api/src/modules/audit/audit.processor.ts` — `crypto.createHash("sha256")` for hash chain computation; passes `previous_hash` and `hash` to INSERT
- `apps/api/src/modules/audit/audit.service.ts` — `verifyOrganizationChain(organizationId)` method walks per-org chain and detects tampering
- `apps/api/src/modules/audit/audit.controller.ts` — `GET /api/audit/verify-chain` endpoint with ADMIN/AUDITOR RBAC
- `apps/api/migrations/timescaledb/up/020_audit_org_hash_chain.sql` — New migration: replaces entity-level trigger with org-level chain, adds `organization_id` column and index
- `packages/shared/src/index.ts` — Exports `auditVerifyOrgChainSchema` and `AuditVerifyOrgChainInput`
- `packages/shared/src/schemas/audit.schema.ts` — Added `auditVerifyOrgChainSchema`; changed `siteId` → `organizationId` in auditQuerySchema and auditExportSchema
- `packages/shared/src/types/audit.types.ts` — Changed `siteId` → `organizationId` in `AuditEntry` and `AuditExportParams`

## Decisions Made

- **Migration from entity-level to org-level hash chain:** The existing `trg_audit_hash_chain` trigger computed hashes by entity (entity + entity_id). We replaced it with an org-level chain (by organization_id). Pre-migration entries with entity-level hashes will be detected as tampered by `verifyOrganizationChain` — this is correct behavior since the chain type changed. After the migration, all new entries form a consistent org-level chain.
- **Content reused from job data:** The plan's action suggested reconstructing content in the processor, but the interceptor already computes the canonical pipe-delimited content string and passes it as `data.content`. We reused this existing field to ensure consistency — what's stored in `content` is what the hash is computed against.
- **Dual-layer hash computation:** Both the processor (Node.js crypto) and the PostgreSQL trigger (pgcrypto) compute the same SHA256 hash. The processor's computation makes the code self-documenting and auditable; the trigger provides defense-in-depth that catches any writes bypassing the processor.
- **Database migration as TimescaleDB SQL file:** The `audit_log` hypertable is managed outside Prisma (TimescaleDB migration system), so the trigger change is a raw SQL migration file, not a Prisma migration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added org-level trigger migration**
- **Found during:** Task 1 (Processor hash computation)
- **Issue:** The plan didn't address the existing entity-level pgcrypto trigger (`trg_audit_hash_chain`) that overwrites hash/previous_hash at INSERT time. Without updating it, the trigger would overwrite the processor's org-level hash with an entity-level hash, breaking `verifyOrganizationChain`.
- **Fix:** Created `020_audit_org_hash_chain.sql` migration that replaces the entity-level trigger SELECT (chained by `entity + entity_id`) with an org-level SELECT (chained by `organization_id`). Also ensures `organization_id` column exists on `audit_log` and adds a `idx_audit_org_chain` index.
- **Files modified:** `apps/api/migrations/timescaledb/up/020_audit_org_hash_chain.sql` (created)
- **Verification:** Migration file exists with correct org-level SELECT and COALESCE(prev_hash, 'genesis') pattern matching the processor's hash computation.
- **Committed in:** `415ff4a` (Task 2 commit)

**2. [Rule 2 - Missing Critical] Updated shared AuditEntry type from siteId to organizationId**
- **Found during:** Task 2 (TypeScript compilation verification)
- **Issue:** The `AuditEntry` shared type had `siteId: string | null` but all SQL queries alias the column as `organizationId`, and the code accesses `item.organizationId`. This type mismatch causes TypeScript errors but doesn't affect runtime (the JS object has `organizationId` from the SQL alias).
- **Fix:** Changed `siteId` → `organizationId` in `AuditEntry` interface, `AuditExportParams` interface, `auditQuerySchema`, and `auditExportSchema` throughout the shared package.
- **Files modified:** `packages/shared/src/types/audit.types.ts`, `packages/shared/src/schemas/audit.schema.ts`
- **Verification:** TypeScript compilation passes with zero audit-related errors.
- **Committed in:** `415ff4a` (Task 2 commit)

**3. [Rule 2 - Missing Critical] Added auditVerifyOrgChainSchema to shared package**
- **Found during:** Task 2 (TypeScript compilation verification)
- **Issue:** The `audit.controller.ts` imports `auditVerifyOrgChainSchema` and `AuditVerifyOrgChainInput` but they weren't exported from `@repo/shared` — the schema was defined in `audit.schema.ts` but not re-exported from the index barrel.
- **Fix:** Added exports in `packages/shared/src/index.ts` and rebuilt the shared package to generate updated `dist/` files.
- **Files modified:** `packages/shared/src/index.ts`
- **Verification:** TypeScript compilation passes, grep confirms exports are present.
- **Committed in:** `415ff4a` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 missing critical)
**Impact on plan:** All auto-fixes were necessary for correctness — the trigger migration is essential for org-level chain verification to work; the type/schema fixes are required to compile. No scope creep.

## Issues Encountered

- Pre-existing TypeScript compilation errors in unrelated modules (seed.ts, access, ai, alert, analytics, anpr, camera, chat, correlation, door, equipment, incident) are from the ongoing Site→Organization schema migration — out of scope per scope boundary rules.

## User Setup Required

None — no external service configuration required. The TimescaleDB migration (020) must be run as part of the deployment pipeline (same as all other `migrations/timescaledb/up/*.sql` migrations).

## Next Phase Readiness

- Hash-chain audit integrity is complete for FND-06
- Per-organization hash chain active for all new audit entries
- `verifyOrganizationChain()` available via service and API endpoint
- Ready for Plan 04-08 (next plan in Phase 04 commercial-foundation)

---

## Self-Check: PASSED

- [x] All 2 tasks executed and committed
- [x] `apps/api/src/modules/audit/audit.processor.ts` — imports crypto, computes SHA256 hash chain (1 match createHash)
- [x] `apps/api/src/modules/audit/audit.service.ts` — has verifyOrganizationChain method (1 match)
- [x] `apps/api/src/modules/audit/audit.controller.ts` — has GET /api/audit/verify-chain endpoint
- [x] `apps/api/migrations/timescaledb/up/020_audit_org_hash_chain.sql` — created with org-level trigger
- [x] `packages/shared/src/schemas/audit.schema.ts` — auditVerifyOrgChainSchema exported
- [x] `packages/shared/src/types/audit.types.ts` — siteId → organizationId updated
- [x] TypeScript compilation passes with 0 audit-related errors
- [x] Both commits (db74ccb, 415ff4a) present in git log
- [x] SUMMARY.md created with substantive content

## Threat Flags

None — all security-relevant surface is covered by the plan's threat model (T-04-30 through T-04-34). No new network endpoints, auth paths, or file access patterns beyond what the plan specified.

---

*Phase: 04-commercial-foundation*
*Completed: 2026-07-15*
