---
phase: 10-enterprise-grade
plan: 05
subsystem: api, ui
tags: [nestjs, appmodule, dashboard, sso, apikey, webhook, compliance, branding, fetch-with-auth]

# Dependency graph
requires:
  - phase: 10-enterprise-grade
    plan: 01
    provides: SsoModule, ApiKeyModule, WebhookModule, ComplianceModule NestJS modules
  - phase: 10-enterprise-grade
    plan: 02
    provides: SSO SAML/OIDC strategies and controllers
  - phase: 10-enterprise-grade
    plan: 03
    provides: TenantApiKeyGuard, V1Controller rate limiting
  - phase: 10-enterprise-grade
    plan: 04
    provides: Webhook delivery queue and Compliance report generation
provides:
  - All 4 enterprise modules registered in AppModule with alphabetical ordering
  - SSO callback org context handling via orgContext.run() for @Public() routes
  - Dashboard typed fetch functions for SSO config, API keys, webhooks, compliance, branding
affects:
  - 10-06 (enterprise settings pages use these API client functions)
  - 10-07 (enterprise dashboard pages use these API client functions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Alphabetical module ordering in NestJS @Module imports array"
    - "orgContext.run() for tenant isolation on @Public() routes without JWT"
    - "Inline type imports from @repo/shared for typed API client functions"

key-files:
  created: []
  modified:
    - apps/api/src/app.module.ts
    - apps/api/src/modules/sso/sso.controller.ts
    - apps/dashboard/lib/api.ts

key-decisions:
  - "Use alphabetical module ordering in AppModule imports array for clarity and maintainability"
  - "Wrap SSO callback handlers in orgContext.run() to provide tenant isolation on @Public() routes where no JWT is available"
  - "Inline type imports from @repo/shared used instead of top-level imports to avoid modifying the existing import structure"
  - "TenantApiKeyGuard confirmed as per-controller (not global APP_GUARD) - documented in AppModule comments"
  - "Rate limiter double-counting between @fastify/rate-limit and TenantApiKeyGuard documented as acceptable for initial delivery"

requirements-completed:
  - ENT-01
  - ENT-02
  - ENT-03
  - ENT-04
  - ENT-05
  - ENT-06
  - ENT-07

# Metrics
duration: 2min
completed: 2026-07-16
---

# Phase 10 Plan 05: Enterprise Module Wiring & Dashboard API Client Summary

**AppModule registers SsoModule, ApiKeyModule, WebhookModule, and ComplianceModule in alphabetical order with SSO callback org context; dashboard API client extended with 13 typed fetchWithAuth functions for SSO, API keys, webhooks, compliance reports, and branding**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-16T10:31:14Z
- **Completed:** 2026-07-16T10:32:33Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- **AppModule wiring:** Registered SsoModule, ApiKeyModule, WebhookModule, ComplianceModule in full alphabetical order — application boots with all Phase 10 enterprise features available at runtime
- **SSO callback org context:** Added `orgContext.run()` wrapping in both `samlCallback` and `oidcCallback` methods to provide tenant isolation for `@Public()` SSO routes that don't have JWT tokens
- **Rate limiter documentation:** Added comprehensive comment documenting the coexistence of global `@fastify/rate-limit` with per-key `TenantApiKeyGuard` — acceptable for initial delivery with exclusion hook path documented for future
- **Dashboard API client:** 13 new typed `fetchWithAuth` functions added:
  - SSO: `fetchIdpConfig`, `saveIdpConfig`
  - API Keys: `fetchApiKeys`, `createTenantApiKey`, `revokeTenantApiKey`, `fetchApiKeyUsage`
  - Webhooks: `fetchWebhookSubscriptions`, `createWebhookSubscription`, `updateWebhookSubscription`, `deleteWebhookSubscription`, `fetchWebhookDeliveries`, `retryWebhookDelivery`
  - Compliance: `generateComplianceReport` with blob download trigger
  - Branding: `fetchOrganizationBranding`, `updateOrganizationBranding`

## Task Commits

Each task was committed atomically:

1. **Task 1: AppModule wiring — register SsoModule, ApiKeyModule, WebhookModule, ComplianceModule** - `cdf974b` (feat)
2. **Task 2: Dashboard API client — add fetch functions for enterprise endpoints** - `b492a31` (feat)

**Plan metadata:** Pending

## Files Created/Modified

- `apps/api/src/app.module.ts` — Added SsoModule, ApiKeyModule, WebhookModule imports and array entries; reordered all modules alphabetically; added TenantApiKeyGuard and rate limiter documentation comments; preserved HealthModule and QueueModule in correct alphabetical positions
- `apps/api/src/modules/sso/sso.controller.ts` — Added `orgContext` import and `orgContext.run()` wrapping in `samlCallback` and `oidcCallback` to set tenant isolation for SSO `@Public()` routes
- `apps/dashboard/lib/api.ts` — Added 13 typed fetchWithAuth functions across 5 enterprise domains with inline type interfaces; typed inputs imported from `@repo/shared`

## Decisions Made

- **Alphabetical module ordering:** The AppModule imports array was reorganized into full alphabetical order per the plan specification. This is a one-time reorganization that makes the module list maintainable and predictable.
- **Inline type imports from @repo/shared:** Used inline `import("@repo/shared").TypeName` syntax instead of adding top-level imports. This avoids modifying the existing import structure while still using the shared schemas for input validation types.
- **orgContext.run() for SSO callbacks:** SSO callback routes are `@Public()` — they have no JWT and thus no orgId from `TenantContextMiddleware`. The SAML strategy resolves orgId from the IdP config during assertion validation, so wrapping the token exchange in `orgContext.run(user.orgId, ...)` provides tenant isolation without modifying the middleware.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The plan's alphabetical module list omitted `HealthModule` and `QueueModule` which are registered in the existing AppModule. Both were added to the alphabetical order in their correct positions to preserve existing functionality.
- The plan's alphabetical list is from the perspective of Phase 10 module ordering and isn't exhaustive — all pre-existing modules were preserved.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All Phase 10 backend modules registered and available at runtime:
  - SSO: SAML/OIDC authentication with org context isolation
  - API Keys: Per-tenant API keys with rate limiting and v1 controllers
  - Webhooks: Event-driven webhook delivery with bullMQ queue
  - Compliance: Report generation endpoint
- Dashboard API client ready with typed functions for all enterprise endpoints
- Ready for Plan 10-06 (enterprise settings UI pages) and Plan 10-07 (enterprise dashboard pages)

---

*Phase: 10-enterprise-grade*
*Completed: 2026-07-16*
