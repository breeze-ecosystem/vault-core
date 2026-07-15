---
phase: 04-commercial-foundation
plan: 03b
subsystem: api
tags: [nestjs, multitenant, rls, postgresql, prisma, guards, decorators]

# Dependency graph
requires:
  - phase: 04-commercial-foundation
    plan: 03a
    provides: TenantContextMiddleware, Prisma tenant-extension, withTenantContext helper
provides:
  - "@CurrentOrg() parameter decorator for controller orgId extraction"
  - "TenantIsolationGuard (global APP_GUARD) — rejects requests without orgId"
  - "PostgreSQL RLS policies on all 12 organization-scoped tables (defense-in-depth)"
  - "AppModule wiring: TenantContextMiddleware replaces SiteContextMiddleware, TenantIsolationGuard registered as APP_GUARD between JwtAuthGuard and RolesGuard"
affects:
  - 04-04 (organization management module)
  - 04-05 (invite module / auth refinements)
  - All future API modules (tenant isolation active app-wide)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Global APP_GUARD with @Public() bypass for public endpoints"
    - "createParamDecorator for extracting orgId from request.user"
    - "PostgreSQL dynamic RLS policy creation via PL/pgSQL helper function"

key-files:
  created:
    - apps/api/src/common/decorators/current-org.decorator.ts
    - apps/api/src/common/guards/tenant-isolation.guard.ts
    - apps/api/prisma/migrations/20260715170000_add_rls_policies/migration.sql
  modified:
    - apps/api/src/app.module.ts

key-decisions:
  - "TenantIsolationGuard skips @Public() routes per T-04-14 threat model — public endpoints (register, login) have no JWT and thus no orgId"
  - "12 scoped tables for RLS (not 14) — Organization (tenant root) and User (scoped via OrganizationMember join table) have no organizationId column, matching SCOPED_MODELS in tenant-extension.ts"
  - "Dynamic PL/pgSQL helper function for RLS policy creation — reduces repetition across 12 tables while keeping SQL maintainable"

patterns-established:
  - "Guard order: JwtAuthGuard (auth) → TenantIsolationGuard (tenant) → RolesGuard (role)"
  - "Middleware chain: TenantContextMiddleware sets PostgreSQL session var + wraps request in orgContext.run()"

requirements-completed:
  - FND-01
  - FND-02

# Metrics
duration: 2min
completed: 2026-07-15
---

# Phase 04 Plan 03b: Tenant Isolation Integration Layer Summary

**CurrentOrg decorator, TenantIsolationGuard (with @Public() bypass), RLS policies migration for 12 scoped tables, and AppModule wiring replacing SiteContextMiddleware with TenantContextMiddleware**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-15T17:15:16Z
- **Completed:** 2026-07-15T17:17:38Z
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- **@CurrentOrg() decorator** — createParamDecorator extracting `request.user?.orgId` for convenient controller access
- **TenantIsolationGuard** — global APP_GUARD rejecting requests without orgId; skips @Public() routes per T-04-14 threat model
- **RLS policies migration** — PostgreSQL RLS on all 12 organization-scoped tables using `app.current_organization_id` session variable; defense-in-depth layer that catches raw SQL queries bypassing the Prisma extension
- **AppModule wiring** — TenantContextMiddleware replaces SiteContextMiddleware; TenantIsolationGuard registered between JwtAuthGuard and RolesGuard (correct execution order: auth → tenant → role)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create decorator and guard** — `d28a6ed` (feat)
2. **Task 2: Create RLS policies migration SQL** — `7cd1064` (feat)
3. **Task 3: Wire up AppModule** — `b25585a` (feat)

## Files Created/Modified

- `apps/api/src/common/decorators/current-org.decorator.ts` — `@CurrentOrg()` parameter decorator extracting `request.user?.orgId`
- `apps/api/src/common/guards/tenant-isolation.guard.ts` — Global guard with Reflector-based @Public() bypass; throws ForbiddenException if no orgId
- `apps/api/prisma/migrations/20260715170000_add_rls_policies/migration.sql` — RLS migration: dynamic PL/pgSQL helper creates `tenant_isolation` policies on 12 scoped tables using `app.current_organization_id` session variable
- `apps/api/src/app.module.ts` — Replaced SiteContextMiddleware with TenantContextMiddleware import/registration; added TenantIsolationGuard as APP_GUARD between JwtAuthGuard and RolesGuard

## Decisions Made

- **@Public() bypass in TenantIsolationGuard (T-04-14):** The guard skips @Public() routes because public endpoints (register, login) have no JWT — `request.user` would be undefined, causing the orgId check to fail. This was a necessary addition the plan's guard code didn't include, added per the threat model's explicit requirement.
- **12 tables for RLS (not 14):** The plan's task description listed 14 tables including Organization and User, but neither has an `organizationId` column in the current schema. We used the 12-table SCOPED_MODELS list from tenant-extension.ts, which was already validated in Plan 03a. Organization is the tenant root (its `id` IS the orgId); User is scoped via OrganizationMember join table.
- **Dynamic PL/pgSQL helper:** Used `CREATE OR REPLACE FUNCTION create_tenant_policy(TEXT)` to avoid repeating the same policy definition 12 times. The helper is dropped after use.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added @Public() bypass to TenantIsolationGuard**
- **Found during:** Task 1 (Creating guard)
- **Issue:** The plan's guard code (from PATTERNS.md lines 307-317) only checked `user?.orgId` without considering @Public() routes. Per the threat model (T-04-14), TenantIsolationGuard "should NOT apply to @Public() routes" — but JwtAuthGuard is skipped for public routes, meaning `request.user` is undefined, which would cause the guard to reject register/login endpoints.
- **Fix:** Added Reflector injection and IS_PUBLIC_KEY check — if the route is marked @Public(), the guard returns true immediately (mirrors JwtAuthGuard's pattern).
- **Files modified:** `apps/api/src/common/guards/tenant-isolation.guard.ts`
- **Verification:** Guard file imports IS_PUBLIC_KEY and Reflector, checks isPublic before orgId check.
- **Committed in:** `d28a6ed` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Corrected RLS scope to 12 tables (not 14)**
- **Found during:** Task 2 (Creating RLS migration)
- **Issue:** The plan's task action listed 14 tables (including Organization and User), but neither table has an `organizationId` column. Including them would cause SQL errors at migration time. This was already corrected in Plan 03a's SCOPED_MODELS list.
- **Fix:** Generated RLS policies for the 12 tables that actually have `organizationId`: Camera, Door, Zone, Incident, VehicleList, AuditLog, OrganizationMember, Invite, FeatureFlag, Credential, Alert, CameraPrompt.
- **Files modified:** `apps/api/prisma/migrations/20260715170000_add_rls_policies/migration.sql`
- **Verification:** 12 `SELECT create_tenant_policy(...)` calls present; verified schema.prisma confirms only these 12 tables have `organizationId` column.
- **Committed in:** `7cd1064` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both fixes are necessary for correctness — the @Public() bypass prevents a complete break of public auth endpoints; the 12-table correction prevents SQL errors at migration time. No scope creep.

## Issues Encountered

- `prisma migrate dev --create-only` failed due to missing shadow database (the `rename_site_to_organization` migration hasn't been applied). Workaround: created the migration directory manually with the correct timestamp prefix and wrote the SQL file directly — Prisma supports this pattern for SQL-only custom migrations.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Tenant isolation integration layer complete: @CurrentOrg() decorator, TenantIsolationGuard, RLS policies, AppModule wiring
- Guard order established: JwtAuthGuard → TenantIsolationGuard → RolesGuard
- Ready for Plan 04-04 (invite module / organization management refinements)
- Note: 12 RLS policies are defined but not yet applied to the database — the migration will run as part of the next `prisma migrate deploy` cycle

---

## Self-Check: PASSED

- [x] All 3 tasks executed and committed
- [x] `apps/api/src/common/decorators/current-org.decorator.ts` — exists with `CurrentOrg` export (1 match)
- [x] `apps/api/src/common/guards/tenant-isolation.guard.ts` — exists with `TenantIsolationGuard` (1 match)
- [x] `apps/api/prisma/migrations/20260715170000_add_rls_policies/migration.sql` — exists with `CREATE POLICY tenant_isolation` (generated by dynamic PL/pgSQL)
- [x] `apps/api/src/app.module.ts` — `TenantIsolationGuard` registered as APP_GUARD between JwtAuthGuard and RolesGuard
- [x] `apps/api/src/app.module.ts` — `TenantContextMiddleware` imported and applied; `SiteContextMiddleware` completely removed (0 matches)
- [x] All 3 commits present in git log
- [x] SUMMARY.md created with substantive content

---

*Phase: 04-commercial-foundation*
*Completed: 2026-07-15*
