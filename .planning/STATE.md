---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Commercial Platform — Summary
status: executing
stopped_at: Completed 04-03a-PLAN.md (Tenant isolation core)
last_updated: "2026-07-15T17:12:00.895Z"
last_activity: 2026-07-15
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 11
  completed_plans: 3
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-15)

**Core value:** Correlate every physical security event with video evidence and AI analysis in real time, so security operators know what happened, where, and what to do — without switching between disconnected systems.
**Current focus:** Phase 04 — commercial-foundation

## Current Position

Phase: 04 (commercial-foundation) — EXECUTING
Plan: 4 of 11
Status: Ready to execute
Last activity: 2026-07-15

Progress: [███░░░░░░░] 27%

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

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap v2.0]: Multi-tenancy is the critical path — Phase 4 (Commercial Foundation) must ship before any other v2.0 feature
- [Roadmap v2.0]: Research confirms Foundation → Monetization → Premium Experience → Public Presence → Feature Deepening → AI Intelligence → Enterprise Grade ordering
- [Roadmap v2.0]: 7 phases (4-10) at coarse granularity — 57 requirements mapped with 100% coverage
- [Roadmap v2.0]: Billing and licensing are tightly coupled — built together in Phase 5 to ensure subscription-to-license lifecycle is coherent
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
- [Phase 5]: PayPal subscription lifecycle edge cases — less documented than Stripe, needs spike
- [Phase 5]: Stripe webhook endpoint testing — self-hosted deployment behind Caddy needs documented local dev pattern
- [Phase 6]: Radix Themes + Tailwind coexistence — interaction between CSS variable systems needs spike
- [Phase 8]: Door state machine race conditions under multi-tenant load — needs spike on MQTT message ordering
- [Phase 9]: pgvector embedding model selection (nomic-embed-text vs mxbai-embed-large) — needs evaluation benchmark
- [Phase 9]: Ollama tool calling reliability — less mature than OpenAI; needs spike with real security scenarios

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-07-15T17:11:23.251Z
Stopped at: Completed 04-03a-PLAN.md (Tenant isolation core)
Resume file: None
