---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Commercial Platform — Summary
status: executing
stopped_at: Completed 09-05-PLAN.md
last_updated: "2026-07-16T08:26:14.405Z"
last_activity: 2026-07-16
progress:
  total_phases: 7
  completed_phases: 5
  total_plans: 45
  completed_plans: 44
  percent: 71
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-15)

**Core value:** Correlate every physical security event with video evidence and AI analysis in real time, so security operators know what happened, where, and what to do — without switching between disconnected systems.
**Current focus:** Phase 09 — ai-intelligence

## Current Position

Phase: 09 (ai-intelligence) — EXECUTING
Plan: 7 of 8
Status: Ready to execute
Last activity: 2026-07-16

Progress: [██████████] 98%
Last activity: 2026-07-15 -- Phase 05 execution started

Progress: [██████████] 100%

## Performance Metrics

**Velocity (v1.0):**

- Total plans completed: 15
- Average duration: ~8min
- Total execution time: ~39min

**By Phase (v1.0):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Unified Security | 4 | ~31min | ~8min |
| 2. Operational AI | 6 | ~TBD | ~TBD |
| 3. Intelligent Platform | 5 | ~TBD | ~TBD |

*Updated after each plan completion*
| Phase 04-commercial-foundation P01 | 13min | 4 tasks | 3 files |
| Phase 04-commercial-foundation P02 | 2min | 4 tasks | 5 files |
| Phase 04-commercial-foundation P03a | 2min | 4 tasks | 4 files |
| Phase 04-commercial-foundation P04a | 3min | 4 tasks | 8 files |
| Phase 04-commercial-foundation P03b | 2min | 3 tasks | 4 files |
| Phase 04-commercial-foundation P04b | 3min | 3 tasks | 7 files |
| Phase 04-commercial-foundation P05 | 12min | 4 tasks | 72 files |
| Phase 04-commercial-foundation P06 | 2min | 2 tasks | 5 files |
| Phase 04-commercial-foundation P07 | 3min | - tasks | - files |
| Phase 04-commercial-foundation P08 | 6min | 4 tasks | 6 files |
| Phase 04-commercial-foundation P09 | 2min | 3 tasks | 6 files |
| Phase 05-monetization P01 | 2min | 3 tasks | 10 files |
| Phase 05-monetization P02 | 8min | 3 tasks | 14 files |
| Phase 05-monetization P03 | 31min | 3 tasks | 12 files |
| Phase 09-ai-intelligence P02 | 3min | 2 tasks | 13 files |
| Phase 09-ai-intelligence P03 | 5min | 3 tasks | 10 files |
| Phase 09-ai-intelligence P04 | 8min | 3 tasks | 15 files |
| Phase 09-ai-intelligence P05 | 7min | 3 tasks | 14 files |
| Phase 09-ai-intelligence P06 | 14min | 3 tasks | 10 files |
| Phase 09-ai-intelligence P07 | 12min | 4 tasks | 18 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap v2.0]: Multi-tenancy is the critical path — Phase 4 (Commercial Foundation) must ship before any other v2.0 feature
- [Roadmap v2.0]: Research confirms Foundation → Monetization → Premium Experience → Public Presence → Feature Deepening → AI Intelligence → Enterprise Grade ordering
- [Roadmap v2.0]: 7 phases (4-10) at coarse granularity — 57 requirements mapped with 100% coverage
- [Roadmap v2.0]: Billing and licensing built together in Phase 5 — RSA-signed JWT license keys with offline verification, pure licensing model (no Stripe/PayPal)
- [Roadmap v2.0]: Design system (Phase 6) must exist before any page-level premium redesigns — prevents half-beautiful/half-ugly product
- [Roadmap v2.0]: Phase 9 AI Intelligence depends on Phase 8 event data — pgvector embeddings pipeline requires accumulated events for quality
- [Phase 04-commercial-foundation]: Site → Organization: data-preserving ALTER TABLE RENAME, no backward compat layer — Migration approach chosen to preserve existing data during column renames. Manual SQL rewrite avoids Prisma's default DROP+CREATE which would lose all Site data.
- [Phase 04-commercial-foundation]: Organization schema mirrors existing Site schema (name, address, city, country, lat/lng, isActive) plus billing fields (billingEmail, planTier) — Forward-compatible with Phase 5 billing while reusing proven schema pattern
- [Phase 04-commercial-foundation]: Register schema drops siteId and role — replaced by organizationName for auto-org creation on registration — Registration creates a new org (D-08), role assigned via OrganizationMember, not in registration payload
- [Phase 04-commercial-foundation]: Switch-org schema validates organizationId as UUID — membership check deferred to AuthService — Schema handles input validation; business logic (membership check) belongs in service layer per D-07
- [Phase 04-commercial-foundation]: Invite schema carries role at creation time, NOT at invite link generation — role is baked into the invite — Role assignment at invite creation (D-15) simplifies accept flow — no role selection step for new users
- [Phase 04-commercial-foundation]: ---

phase: 04-commercial-foundation
plan: 03a
subsystem: api
tags:

  - prisma
  - nestjs
  - postgresql
  - rls
  - multitenant

requires:

  - phase: 04-commercial-foundation
    plan: 02
    provides: Organization model, organizationId on all scoped tables

provides:

  - Prisma Client Extension with AsyncLocalStorage-based tenant isolation
  - TenantContextMiddleware for PostgreSQL RLS + org context
  - withTenantContext() helper for BullMQ workers
  - Org-scoped query auto-injection via extension wired in PrismaService

affects:

  - 04-03b (decorator, guard, RLS migration, AppModule wiring)
  - 04-04 (organization management)
  - 04-05 (auth with switch-org)
  - 05-01 (BullMQ workers using withTenantContext)

tech-stack:
  added:

    - "Node.js built-in AsyncLocalStorage (no new packages)"
  patterns:

    - Prisma Client Extension with $allModels.$allOperations
    - AsyncLocalStorage for request-scoped orgId
    - Two-layer isolation: extension (primary) + RLS (defense-in-depth)

key-files:
  created:

    - apps/api/src/modules/prisma/tenant-extension.ts
    - apps/api/src/common/middleware/tenant-context.middleware.ts
    - apps/api/src/common/helpers/tenant-worker.ts
  modified:

    - apps/api/src/modules/prisma/prisma.service.ts

key-decisions:

  - "Used AsyncLocalStorage pattern (not per-request $extends) to avoid creating PrismaClient per request — extends global singleton"
  - "Excluded Organization and User from SCOPED_MODELS — Organization is the tenant root (has no organizationId field) and User has no organisationId (scoped via OrganizationMember join table)"
  - "Extension attaches BEFORE $connect in onModuleInit() so retry logic works"

requirements-completed:

  - FND-01
  - FND-02

duration: 2min
completed: 2026-07-15
---

# Phase 4: Commercial Foundation — Plan 03a Summary

**Tenant isolation core: Prisma extension auto-scopes all queries via AsyncLocalStorage, TenantContextMiddleware sets PostgreSQL RLS session var, withTenantContext() helper for BullMQ workers**

- [Phase ?]: ---

phase: 04-commercial-foundation
plan: 04a
subsystem: auth
tags: [multi-tenant, jwt, organization, org-switcher, rbac, nestjs]

requires:

  - phase: 04-02
    provides: Organization schemas, OrganizationMember, switchOrg schema

  - phase: 04-03
    provides: Schema migration (Site→Organization)
provides:

  - JWT strategy with orgId payload and server-side membership verification
  - Multi-tenant auth service (register with org creation, login with org resolution, switchOrg)
  - Organization CRUD module following SiteModule patterns

affects: [04-04b, 04-05, 04-06, 04-07, 04-08]

tech-stack:
  added: []
  patterns:

    - Transactional org+user+member creation via prisma.$transaction
    - Server-side role resolution (membership.role from DB, not JWT claim)
    - Full refresh token revocation on org switch (Pitfall 5 mitigation)

key-files:
  created:

    - apps/api/src/modules/organization/organization.module.ts
    - apps/api/src/modules/organization/organization.controller.ts
    - apps/api/src/modules/organization/organization.service.ts
  modified:

    - apps/api/src/modules/auth/strategies/jwt.strategy.ts
    - apps/api/src/modules/auth/auth.service.ts
    - apps/api/src/modules/auth/auth.controller.ts
    - apps/api/src/modules/auth/auth.service.spec.ts
    - apps/api/src/app.module.ts

key-decisions:

  - "Server-side role resolution: role from db (membership.role), not from JWT claim — prevents stale-JWT attacks after membership change (D-06)"
  - "Full refresh token revocation on switch-org prevents old refresh tokens from re-issuing tokens for wrong org (Pitfall 5)"
  - "Organization CRUD follows exact SiteModule pattern — controller, service, module with audits and RBAC"
  - "GET /api/organizations/me returns current user's org using orgId from JWT"
  - "Register response includes organization object for immediate UI routing"

requirements-completed:

  - FND-03
  - FND-04

duration: 3min
completed: 2026-07-15
---

# Phase 04 Plan 04a: Multi-Tenant Auth + Organization CRUD Summary

**JWT tokens carry orgId+role with server-side membership verification; register creates Org+User+Member in one transaction; login resolves org context from OrganizationMember; switch-org re-issues tokens; full Organization CRUD at /api/organizations**

- [Phase ?]: ---

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

- [Phase 04-commercial-foundation]: Used orgId for BullMQ job data and gateway events (shorthand), organizationId for Prisma queries (exact field name) — Matches existing convention where Prisma fields use full camelCase names while internal data transfer uses abbreviations
- [Phase 04]: test
- [Phase 04-commercial-foundation]: Migrated entity-level hash chain trigger to per-organization chain — replaces entity+entity_id chaining with organization_id chaining per D-11
- [Phase 04-commercial-foundation]: Dual-layer hash computation: app code (Node.js crypto) + DB trigger (pgcrypto) both compute the same org-level SHA256 hash for defense-in-depth
- [Phase 04-commercial-foundation]: Used native HTML select for role dropdown instead of Radix Select (not installed) — avoids adding new npm dependency
- [Phase 04-commercial-foundation]: Created Dialog component using already-installed @radix-ui/react-dialog following same pattern as existing DropdownMenu
- [Phase 04-commercial-foundation]: Invite accept page decodes JWT locally to show org name/role before API call — avoids adding a dedicated validate endpoint
- [Phase 04-commercial-foundation]: Registration page created from scratch (no existing register page) — follows login page visual pattern
- [Phase ?]: @Skill() uses SetMetadata pattern matching @Roles() decorator — Consistent with existing codebase patterns, zero learning curve
- [Phase ?]: SkillRegistry uses NestJS DiscoveryService for auto-registration — Zero-config auto-discovery on module init — no manual skill registration required
- [Phase ?]: AiAgentModule coexists alongside AiModule as separate sibling module — Separate BullMQ queues (ai-agent vs ai-summaries) per D-09 coexistence requirement
- [Phase ?]: All 6 system prompts are French-first with XML injection protection — <user_query> boundary tags prevent prompt injection per threat model T-09-03
- [Phase ?]: Used supervision.ByteTrack (NOT bytetrack PyPI package) per RESEARCH.md Pitfall 2 to implement cross-frame tracking integrated with ultralytics detection format
- [Phase ?]: YAMNet WHITELIST of 16 security-relevant audio classes with alert severity mapping (CRITICAL/HIGH/MEDIUM/INFO) — covers gunshot, explosion, alarm, siren, glass breaking, shout, scream, dog bark, etc. at confidence threshold 0.3
- [Phase ?]: Faster-Whisper defaults to language=fr per D-37 (Oversight Hub primary deployment language is French) — language parameter configurable per request
- [Phase 09-ai-intelligence]: Fastify SSE fallback: @Get() + FastifyReply.raw.writeHead() with SSE framing — @Sse() decorator not compatible with Fastify adapter — Fastify SSE fallback: @Get() + FastifyReply.raw.writeHead() with SSE framing — @Sse() decorator not compatible with Fastify adapter
- [Phase 09-ai-intelligence]: Used Redis key pattern agent:conv:{orgId}:{sessionId} with 90-day TTL for tenant-isolated conversation storage — Organization-scoped by construction — the key includes orgId, so tenant isolation is enforced at the storage layer without requiring cross-org validation on every read

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

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-15T17:08:34Z
- **Completed:** 2026-07-15T17:11:51Z
- **Tasks:** 4
- **Files modified:** 8

## Accomplishments

- JwtStrategy validates org membership on every request — role from DB, not JWT claim
- Register creates Organization + User + OrganizationMember(ADMIN) in single Prisma transaction
- Login resolves org context from OrganizationMember, returns organizations list for org switcher
- Switch-org (POST /api/auth/switch-org) validates membership, revokes old refresh tokens, re-issues scoped tokens
- GET /api/auth/organizations returns user's org list for switcher UI
- OrganizationModule with full CRUD (findAll, findById, create, update, soft-delete) following SiteModule patterns
- Organization routes registered at /api/organizations with Zod validation and RBAC guards

## Task Commits

Each task was committed atomically:

1. **Task 1: Update JwtStrategy with orgId payload and OrganizationMember verification** - `742e780` (feat)
2. **Task 2: Rewrite AuthService for multi-tenant org model** - `6df2d99` (feat)
3. **Task 3: Add switch-org and organizations endpoints to AuthController** - `5736db5` (feat)
4. **Task 4: Create OrganizationModule with CRUD following SiteModule patterns** - `faff8c5` (feat)

**Deviation fix:** `25650eb` (test: fix auth service tests for new register/login signatures)

**Plan metadata:** (appended in final commit)

## Files Created/Modified

- `apps/api/src/modules/auth/strategies/jwt.strategy.ts` - Added PrismaService injection, orgId in payload, OrganizationMember lookup, DB-sourced role
- `apps/api/src/modules/auth/auth.service.ts` - Rewrote register/login/refresh/createTokens; added switchOrg(), getUserOrganizations()
- `apps/api/src/modules/auth/auth.controller.ts` - Added switch-org and organizations endpoints; updated register response
- `apps/api/src/modules/auth/auth.service.spec.ts` - Updated tests for new multi-tenant service signatures
- `apps/api/src/modules/organization/organization.module.ts` - New NestJS module (controller + service + exports)
- `apps/api/src/modules/organization/organization.controller.ts` - New CRUD controller with queries, me, create, update, delete
- `apps/api/src/modules/organization/organization.service.ts` - New service with findAll, findById, create, update, soft-delete
- `apps/api/src/app.module.ts` - Registered OrganizationModule in imports

## Decisions Made

- **Server-side role resolution (D-06):** Role is always resolved from `OrganizationMember.role` in DB, not from JWT claims — prevents stale-JWT attacks after membership changes
- **Full refresh token revocation on switch (Pitfall 5):** All existing refresh tokens are revoked before issuing new ones, preventing old tokens from re-issuing tokens for the wrong org
- **$transaction for registration:** Org + User + Member created atomically — no partial registration state
- **Soft-delete for Organization:** Follows Site module pattern — uses `isActive: false` instead of actual deletion

## Deviations from Plan

**1. [Rule 3 - Blocking] Fixed auth.service.spec.ts tests for new register/login/refresh signatures**

- **Found during:** Verification (Task completion check)
- **Issue:** Existing test file used old register signature (no organizationName) and old user.create mock; login/refresh tests didn't mock organizationMember.findFirst
- **Fix:** Added organizationName to test data, mocked $transaction instead of user.create, added organizationMember mocks for login/refresh, updated assertions for new response shapes
- **Files modified:** `apps/api/src/modules/auth/auth.service.spec.ts`
- **Verification:** No compilation errors in auth/organization files
- **Committed in:** `25650eb` (test commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix — test file must compile for CI to pass. No scope creep.

## Issues Encountered

- Pre-existing TypeScript compilation errors in unrelated modules (site.service.ts, user.service.ts, visitor.service.ts, etc.) from the Site→Organization schema migration in prior plans — these are not caused by this plan and are out of scope per scope boundary rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Multi-tenant auth core complete: org-scoped JWT, register-with-org, login-with-context, switch-org, Organization CRUD
- Ready for Plan 04-04b (Invite module — invite CRUD, token-based accept flow, Resend email integration)
- OrganizationModule registered in AppModule and ready for dependency injection

## Self-Check: PASSED

- ✅ All 4 tasks executed and committed
- ✅ Organization module files exist (3 created)
- ✅ All 5 commits present in git history
- ✅ SUMMARY.md created with substantive content

---

*Phase: 04-commercial-foundation*
*Completed: 2026-07-15*

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-15T17:08:34Z
- **Completed:** 2026-07-15T17:10:30Z
- **Tasks:** 4
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- **Prisma Client Extension** (`tenant-extension.ts`) — intercepts `$allModels.$allOperations` to auto-inject `WHERE organizationId = $orgId` on read queries and auto-set `organizationId` on create/upsert operations for all 12 scoped models
- **AsyncLocalStorage-based context** — `orgContext` exported for middleware and workers to populate; extension reads it via `orgContext.getStore()` for zero-coupling no-extension-per-request pattern
- **TenantContextMiddleware** — extends existing `SiteContextMiddleware` pattern; sets PostgreSQL RLS session variable `app.current_organization_id` AND wraps the request in `orgContext.run()` for two-layer isolation (D-09)
- **withTenantContext() helper** — for BullMQ processors that run outside the HTTP lifecycle; sets both RLS session var and AsyncLocalStorage context before executing the callback
- **PrismaService wiring** — `this.$extends(tenantExtension)` called in `onModuleInit()` BEFORE `$connect()` so the extension survives connection retries

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Prisma Client Extension** — `dcac355` (feat)
2. **Task 2: Attach extension in PrismaService** — `6111542` (feat)
3. **Task 3: Create TenantContextMiddleware** — `c27528d` (feat)
4. **Task 4: Create worker helper** — `6be18fe` (feat)

**Plan metadata:** Pending

## Files Created/Modified

- `apps/api/src/modules/prisma/tenant-extension.ts` — Prisma Client Extension with `orgContext` (AsyncLocalStorage) and `tenantExtension` (Prisma.defineExtension) — auto-scopes all queries on 12 scoped models
- `apps/api/src/modules/prisma/prisma.service.ts` — Modified: attaches `tenantExtension` in `onModuleInit()` before `$connect()`
- `apps/api/src/common/middleware/tenant-context.middleware.ts` — Extends SiteContextMiddleware: sets `app.current_organization_id` RLS session var and wraps `next()` in `orgContext.run()`
- `apps/api/src/common/helpers/tenant-worker.ts` — `withTenantContext()` helper for BullMQ processors

## Decisions Made

- **Used AsyncLocalStorage pattern** instead of per-request `$extends()` — avoids creating a new extended client per request while keeping the global `PrismaService` singleton
- **SCOPED_MODETS excludes Organization and User** — Organization is the tenant root (no `organizationId` field), User has no org field (scoped via `OrganizationMember` join table)
- **Extension attaches before `$connect()`** — ensures the extension survives connection retries and is available even if DB is temporarily unavailable
- **Two-layer isolation** — Prisma extension handles model-level queries (primary); RLS (via PostgreSQL session var) catches raw SQL escapes (defense-in-depth per D-09)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Corrected SCOPED_MODELS to match actual schema**

- **Found during:** Task 1 (Prisma extension creation)
- **Issue:** Plan's action listed "User" (14 models including Organization and User) and acceptance criteria listed "Organization" (13 models). However, neither Organization nor User have an `organizationId` field in the actual Prisma schema — including them would cause runtime errors when the extension tries to inject `where: { organizationId }` on models without that field.
- **Fix:** Restricted SCOPED_MODELS to the 12 models that genuinely have `organizationId` in the schema: Camera, Door, Zone, Incident, VehicleList, AuditLog, OrganizationMember, Invite, FeatureFlag, Credential, Alert, CameraPrompt.
- **Files modified:** `apps/api/src/modules/prisma/tenant-extension.ts`
- **Verification:** `grep -c "defineExtension"` passes, schema check confirms only models with `organizationId` field are included.
- **Committed in:** `dcac355` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Correction prevents runtime errors (Prisma would throw "Unknown arg `organizationId`" on Organization/User models). No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors exist in files not touched by this plan (`seed.ts`, `access.service.ts`, `ai.service.ts`, `alert.service.ts`, `camera.service.ts`, `anpr.service.ts`, etc.) — all related to the ongoing `siteId` → `organizationId` schema migration from Plan 01/02. These will be resolved in subsequent plans as each module is updated.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Tenant isolation core (extension + middleware + worker helper) is complete
- Ready for **Plan 03b**: TenantIsolationGuard, @CurrentOrg() decorator, RolesGuard update, PostgreSQL RLS migration script, AppModule wiring for TenantContextMiddleware

---
*Phase: 04-commercial-foundation*
*Completed: 2026-07-15*

## Self-Check: PASSED

- [x] All 4 files exist on disk
- [x] All 4 commits present in git log
- [x] SUMMARY.md exists and is substantive

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4]: Prisma Client Extension + PostgreSQL RLS coexistence pattern — needs spike on migration ordering and performance overhead
- [Phase 4]: SiteContextMiddleware → TenantContextMiddleware migration — backward compatibility with v1.0 Site model
- [Phase 4]: v1.0 `siteId` references across 29+ models must be reconciled before adding `organizationId`
- [Phase 5]: PayPal subscription lifecycle edge cases — moot (pure licensing model, no payment gateway)
- [Phase 5]: Stripe webhook endpoint testing — moot (pure licensing model, no payment gateway)
- [Phase 6]: Radix Themes + Tailwind coexistence — interaction between CSS variable systems needs spike
- [Phase 8]: Door state machine race conditions under multi-tenant load — needs spike on MQTT message ordering
- [Phase 9]: pgvector embedding model selection (nomic-embed-text vs mxbai-embed-large) — needs evaluation benchmark
- [Phase 9]: Ollama tool calling reliability — less mature than OpenAI; needs spike with real security scenarios

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-07-16T08:26:09.113Z
Stopped at: Completed 09-05-PLAN.md
Resume file: None
