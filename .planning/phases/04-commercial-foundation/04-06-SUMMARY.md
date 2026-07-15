---
phase: 04-commercial-foundation
plan: 06
subsystem: api
tags: [nestjs, feature-gate, redis, rbac, decorators, guards]

requires:
  - phase: 04-commercial-foundation
    plan: 03a
    provides: Prisma tenant extension (FeatureFlag in SCOPED_MODELS)
  - phase: 04-commercial-foundation
    plan: 03b
    provides: TenantIsolationGuard, AppModule wiring pattern
  - phase: 04-commercial-foundation
    plan: 05
    provides: Organization model with planTier field

provides:
  - @RequiresFeature() decorator for endpoint-level feature gating
  - FeatureGateGuard with Redis caching and FeatureFlag DB fallback
  - FeatureGateModule with Redis provider and seeding service
  - Idempotent feature flag seeding per organization tier

affects:
  - 05-01 (billing — seed flags on subscription change)
  - 05-02 (license provisioning — flag-based feature access)

tech-stack:
  added: []
  patterns:
    - "@RequiresFeature() metadata decorator matching existing @Roles() pattern"
    - "FeatureGateGuard as APP_GUARD with Redis-first cache check, DB fallback"
    - "Tier-based feature flag mapping with idempotent upsert seeding"

key-files:
  created:
    - apps/api/src/common/decorators/feature-gate.decorator.ts
    - apps/api/src/common/guards/feature-gate.guard.ts
    - apps/api/src/modules/feature-gate/feature-gate.module.ts
    - apps/api/src/modules/feature-gate/feature-gate.service.ts
  modified:
    - apps/api/src/app.module.ts

key-decisions:
  - "FeatureGateGuard checks Redis before DB (key: feature:{orgId}:{feature}) with 5-min TTL — matches RESEARCH.md Pattern 8"
  - "Guard gracefully handles Redis errors as cache misses (no crash on Redis unavailability)"
  - "Redis provider defined in FeatureGateModule (exported for APP_GUARD resolution) following existing DoorModule pattern"
  - "6 default features mapped to 3 tiers: FREE (basic_monitoring), PROFESSIONAL (advanced_analytics, export_csv), ENTERPRISE (api_access, custom_branding, sso)"

patterns-established:
  - "Guard order: JwtAuthGuard → TenantIsolationGuard → RolesGuard → FeatureGateGuard (feature gates are additive on top of role checks)"

requirements-completed:
  - FND-07

duration: 2min
completed: 2026-07-15
---

# Phase 04 Plan 06: Feature Gate Infrastructure Summary

**@RequiresFeature() decorator + FeatureGateGuard with Redis caching and FeatureFlag DB fallback, FeatureGateService with tier-based seeding, and AppModule registration**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-15T17:38:38Z
- **Completed:** 2026-07-15T17:41:06Z
- **Tasks:** 2
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments

- **@RequiresFeature() decorator** — SetMetadata decorator (FEATURE_KEY constant + RequiresFeature(feature)) following exact roles.decorator.ts pattern
- **FeatureGateGuard** — CanActivate guard with Reflector, PrismaService, and Redis(@Inject("REDIS")) injection; checks Redis cache first, falls back to FeatureFlag table, caches result for 5-min TTL; throws ForbiddenException when feature disabled or orgId missing; pass-through for non-gated endpoints
- **FeatureGateModule** — Module with Redis provider (following DoorModule pattern) and FeatureGateService export
- **FeatureGateService.seedDefaultFlags()** — Idempotent upsert-based seeding of 6 default feature flags mapped to 3 plan tiers (FREE, PROFESSIONAL, ENTERPRISE)
- **AppModule wiring** — FeatureGateModule imported and FeatureGateGuard registered as APP_GUARD after RolesGuard (guard order: JwtAuthGuard → TenantIsolationGuard → RolesGuard → FeatureGateGuard)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create @RequiresFeature decorator and FeatureGateGuard** — `ff94da9` (feat)
2. **Task 2: Create FeatureGateModule, FeatureGateService, register in AppModule** — `6779390` (feat)

## Files Created/Modified

- `apps/api/src/common/decorators/feature-gate.decorator.ts` — `@RequiresFeature('feature_key')` decorator with FEATURE_KEY metadata constant
- `apps/api/src/common/guards/feature-gate.guard.ts` — CanActivate guard with Redis-first cache check and FeatureFlag DB fallback; throws ForbiddenException when disabled
- `apps/api/src/modules/feature-gate/feature-gate.module.ts` — NestJS module with Redis provider (ioredis) and FeatureGateService exports
- `apps/api/src/modules/feature-gate/feature-gate.service.ts` — seedDefaultFlags() with tier-based feature mapping and idempotent upsert
- `apps/api/src/app.module.ts` — Imported FeatureGateModule, registered FeatureGateGuard as APP_GUARD after RolesGuard

## Decisions Made

- **Redis-first cache check with DB fallback:** The guard checks Redis cache key `feature:{orgId}:{feature}` first. On cache hit "1" → allow, "0" → deny. On cache miss, queries FeatureFlag table, writes result to Redis with 5-min TTL. Redis errors are handled as cache misses (graceful degradation — does not crash the guard).
- **Threat model consistency:** Guard follows the plan's threat register: cache key includes orgId (T-04-27 mitigation — cross-org cache poisoning requires knowing org UUID), DB query is auto-scoped by Prisma extension (T-04-29 — FeatureFlag in SCOPED_MODELS), unavailability falls back to DB (T-04-28 — accept disposition).
- **Tier mapping in service code:** The feature-to-minimum-tier mapping is defined as code constants in FeatureGateService rather than in the database. This ensures the mapping is version-controlled and deployable via code changes, matching the plan's intent that tier mapping is a developer configuration.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript compilation errors (25+ across seed.ts, access.service.ts, ai.service.ts, etc.) from the Site→Organization schema migration in prior plans — out of scope for this plan per scope boundary rules. No new errors introduced by feature gate files.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Feature gate infrastructure complete: @RequiresFeature() decorator, FeatureGateGuard with Redis + DB, seedable feature flags per tier
- Ready for Phase 05 (billing and subscription) — FeatureGateService.seedDefaultFlags() should be wired into AuthService.register() and triggered on subscription tier changes
- FeatureGateGuard registered globally — endpoints can start using @RequiresFeature('feature_key') decorators

---

## Self-Check: PASSED

- [x] All 2 tasks executed and committed
- [x] `apps/api/src/common/decorators/feature-gate.decorator.ts` — exists with `RequiresFeature` export (1 match)
- [x] `apps/api/src/common/guards/feature-gate.guard.ts` — exists with `FeatureGateGuard` export (1 match)
- [x] `apps/api/src/modules/feature-gate/feature-gate.module.ts` — exists with `FeatureGateModule`
- [x] `apps/api/src/modules/feature-gate/feature-gate.service.ts` — exists with `seedDefaultFlags` method (1 match)
- [x] `apps/api/src/app.module.ts` — `FeatureGateGuard` registered as APP_GUARD after `RolesGuard`
- [x] `apps/api/src/app.module.ts` — `FeatureGateModule` imported in imports array
- [x] Both task commits present in git log (ff94da9, 6779390)
- [x] SUMMARY.md created with 122 lines of substantive content

---

*Phase: 04-commercial-foundation*
*Completed: 2026-07-15*
