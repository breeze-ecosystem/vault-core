---
phase: 03-intelligent-platform
plan: 01
subsystem: api, ui, database
tags: timescaledb, analytics, recharts, nestjs, socketio, continuous-aggregates

requires:
  - phase: 01-foundation
    provides: TimescaleDB hypertables (access_events, door_state_log), continuous aggregates pattern
  - phase: 02-operational-ai
    provides: Alert model with intrusion metadata, Prisma services, NestJS module pattern

provides:
  - TimescaleDB continuous aggregates: zone_analytics_hourly, site_analytics_daily
  - Analytics NestJS module with 7 REST endpoints and Socket.IO gateway
  - Security analytics dashboard with recharts charts at /analytique
  - Shared analytics types and Zod validation schemas in @repo/shared

affects:
  - 03-intelligent-platform: Plan 02 (Risk Scoring) uses AnalyticsService exports
  - Dashboard navigation: "Analytique" link added for SUPERVISOR+

tech-stack:
  added:
    - recharts@2.15.1: React charting library for dashboard trend graphs
    - @types/recharts@2.0.1: TypeScript type definitions
  patterns:
    - Analytics queries via $queryRawUnsafe on TimescaleDB continuous aggregates
    - Zone/site analytics with hourly and daily granularity
    - Abnormal activity detection using z-score computation against 7-day baseline

key-files:
  created:
    - apps/api/migrations/timescaledb/up/014_analytics_aggregates.sql: zone_analytics_hourly and site_analytics_daily continuous aggregates
    - apps/api/migrations/timescaledb/up/015_retention_policies_p3.sql: 90-day/365-day retention for new aggregates
    - apps/api/src/modules/analytics/analytics.module.ts: Analytics feature module
    - apps/api/src/modules/analytics/analytics.service.ts: 7 analytics query methods
    - apps/api/src/modules/analytics/analytics.controller.ts: 7 REST endpoints under /api/analytics/*
    - apps/api/src/modules/analytics/analytics.gateway.ts: Socket.IO /ws/analytics namespace
    - packages/shared/src/types/analytics.types.ts: 6 analytics DTO types
    - packages/shared/src/schemas/analytics.schema.ts: Zod validation schemas
    - apps/dashboard/app/(dashboard)/analytique/page.tsx: Analytics dashboard page with recharts
  modified:
    - apps/api/src/app.module.ts: Registered AnalyticsModule
    - packages/shared/src/index.ts: Barrel exports for analytics types/schemas
    - apps/dashboard/lib/api.ts: 7 analytics API functions + client types
    - apps/dashboard/lib/nav-config.ts: Added "Analytique" nav item
    - apps/dashboard/lib/i18n/dictionaries/fr.ts: Analytics French translations
    - apps/dashboard/lib/i18n/dictionaries/en.ts: Analytics English translations
    - apps/dashboard/package.json: recharts + @types/recharts dependencies

key-decisions:
  - "@types/recharts installed at 2.0.1 (not 2.15.0) — version 2.15.0 does not exist on npm registry; 2.0.1 is the latest available"
  - "Analytics are query-only — no BullMQ queues needed (no job-driven processing)"
  - "Intrusion events queried from existing Alert records with metadata->'type' = 'intrusion'"
  - "Loitering detection uses door_state_log 'held-open' state with 5-minute threshold (heuristic, not AI)"
  - "Abnormal activity uses z-score (threshold 2.0) against 7-day same-day-of-week, same-hour baseline"
  - "Socket.IO gateway created infrastructure-ready but no periodic push implemented for MVP"

requirements-completed:
  - ANLY-01
  - ANLY-02
  - ANLY-03
  - ANLY-04
  - ANLY-05

duration: 11min
completed: 2026-07-14
---

# Phase 3 Plan 1: Security Analytics Vertical Slice — TimescaleDB Continuous Aggregates, NestJS Analytics Service, and recharts Dashboard

**TimescaleDB continuous aggregates for zone/site analytics, NestJS analytics module with 7 REST endpoints, and recharts-powered security analytics dashboard at /analytique with 4 tabbed sections (zone activity, trends, anomalies, intrusions/loitering)**

## Performance

- **Duration:** 11 min
- **Started:** 2026-07-14T19:28:59Z
- **Completed:** 2026-07-14T19:39:50Z
- **Tasks:** 3
- **Files modified:** 17

## Accomplishments

- TimescaleDB continuous aggregates (zone_analytics_hourly, site_analytics_daily) with refresh policies and indexes for sub-second dashboard queries
- Analytics NestJS module with 7 service methods and 7 role-protected REST endpoints (/api/analytics/zones, /sites, /intrusions, /loitering, /absence, /abnormal, /trends)
- Intrusion detection: queries existing Alert records with metadata type=intrusion for intrusion events (ANLY-01)
- Loitering detection: heuristic using door_state_log held-open state with 5-minute threshold (ANLY-02)
- Unusual absence detection: zones with zero granted events in last 2 hours during active schedules (ANLY-03)
- Abnormal activity detection: z-score computation against 7-day same-day-of-week/hour historical baseline (ANLY-04)
- Security analytics dashboard with site selector, summary cards, and 4 tabbed chart/table views using recharts (ANLY-05)
- i18n support: French primary, English fallback for all analytics UI text

## Task Commits

Each task was committed atomically:

1. **Task 1: TimescaleDB Analytics Aggregates & Infrastructure** - `d62fd83` (feat)
   - Continuous aggregates, retention policies, recharts install, module registration
2. **Task 2: Analytics Module — Service, Controller, Gateway & Shared Types** - `7d870c8` (feat)
   - Full analytics service with 7 methods, controller with 7 endpoints, gateway, shared types
3. **Task 3: Security Analytics Dashboard with recharts** - `3b416b1` (feat)
   - Dashboard page, API client functions, nav config, i18n translations

## Files Created/Modified

- `apps/api/migrations/timescaledb/up/014_analytics_aggregates.sql` - zone_analytics_hourly and site_analytics_daily continuous aggregates with indexes
- `apps/api/migrations/timescaledb/up/015_retention_policies_p3.sql` - 90-day (hourly) and 365-day (daily) retention policies
- `apps/api/src/app.module.ts` - AnalyticsModule registration
- `apps/api/src/modules/analytics/analytics.module.ts` - Feature module with controller, service, gateway
- `apps/api/src/modules/analytics/analytics.service.ts` - 7 analytics query methods with TimescaleDB continuous aggregate queries and raw event fallback
- `apps/api/src/modules/analytics/analytics.controller.ts` - 7 role-protected REST endpoints (@Roles ADMIN, SUPERVISOR)
- `apps/api/src/modules/analytics/analytics.gateway.ts` - Socket.IO /ws/analytics namespace with site subscription
- `packages/shared/src/types/analytics.types.ts` - 6 DTO interfaces (ZoneAnalytics, SiteAnalytics, Intrusion, Loitering, Abnormal, Trend)
- `packages/shared/src/schemas/analytics.schema.ts` - analyticsQuerySchema Zod validation
- `packages/shared/src/index.ts` - Barrel exports for analytics schemas/types
- `apps/dashboard/lib/api.ts` - 7 analytics API functions + TypeScript client interfaces
- `apps/dashboard/app/(dashboard)/analytique/page.tsx` - Full analytics dashboard with recharts charts
- `apps/dashboard/lib/nav-config.ts` - "Analytique" nav item (SUPERVISOR+)
- `apps/dashboard/lib/i18n/dictionaries/fr.ts` - French analytics translations
- `apps/dashboard/lib/i18n/dictionaries/en.ts` - English analytics translations
- `apps/dashboard/package.json` - recharts@2.15.1, @types/recharts@2.0.1

## Decisions Made

- **@types/recharts at 2.0.1:** Plan specified 2.15.0 but that version doesn't exist on npm; installed latest available (2.0.1) which provides full type support for recharts 2.x
- **Query-only analytics:** No BullMQ queues needed — analytics are purely read-only queries against continuous aggregates
- **Intrusion from alerts:** Reuses existing Alert records with metadata->'type'='intrusion' — no separate intrusion detection pipeline
- **Loitering heuristic:** door_state_log 'held-open' exceeding 300 seconds — simple but functional for MVP
- **Abnormal z-score threshold:** 2.0 (approximately 95th percentile) with 7-day same-day-of-week/hour baseline
- **Gateway infrastructure-ready:** Created Socket.IO gateway with room support but no periodic push — wire up when real-time updates are needed

## Deviations from Plan

**1. [Rule 2 - Missing Critical] @types/recharts version mismatch**
- **Found during:** Task 1 (recharts installation)
- **Issue:** Plan specified @types/recharts@2.15.0 but this version doesn't exist on npm registry (latest is 2.0.1)
- **Fix:** Installed @types/recharts@2.0.1 instead — fully compatible with recharts 2.x
- **Files modified:** apps/dashboard/package.json, pnpm-lock.yaml
- **Verification:** TypeScript compilation passes with no type errors
- **Committed in:** d62fd83 (Task 1 commit)

**2. [Rule 2 - Missing Critical] LoiteringEventDto missing doorId field**
- **Found during:** Task 3 (Dashboard TypeScript compilation)
- **Issue:** Dashboard page referenced item.doorId but LoiteringEventDto type didn't include doorId
- **Fix:** Added optional doorId field to LoiteringEventDto in both shared types and dashboard api.ts
- **Files modified:** packages/shared/src/types/analytics.types.ts, apps/dashboard/lib/api.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** 3b416b1 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both deviations were necessary for correctness and had no scope creep.

## Issues Encountered

None - all tasks executed as planned with minor version adjustments.

## User Setup Required

None - no external service configuration required. TimescaleDB migrations need to be applied via existing migration pipeline before continuous aggregates are available.

## Authentication Gates

None encountered.

## Known Stubs

- **Analytics Socket.IO gateway** (analytics.gateway.ts): Gateway infrastructure is created with room subscription support but no real-time data push is implemented for MVP. Future plans can wire periodic event emission.
- **Site selector default** (analytique/page.tsx): Defaults to first site from API response. No user site preference persistence.

## Self-Check: PASSED

- ✅ `apps/api/migrations/timescaledb/up/014_analytics_aggregates.sql` exists
- ✅ `apps/api/migrations/timescaledb/up/015_retention_policies_p3.sql` exists
- ✅ `apps/api/src/modules/analytics/` has module, service, controller, gateway
- ✅ `packages/shared/src/types/analytics.types.ts` exists
- ✅ `packages/shared/src/schemas/analytics.schema.ts` exists
- ✅ `apps/dashboard/app/(dashboard)/analytique/page.tsx` exists
- ✅ `pnpm --filter @repo/api exec tsc --noEmit` — 0 errors
- ✅ `pnpm --filter @repo/dashboard exec tsc --noEmit` — 0 new errors (pre-existing errors in other files unaffected)
- ✅ `pnpm --filter @repo/shared build` passes
- ✅ Git log shows 3 commits for this plan

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new_endpoint | analytics.controller.ts | 7 new REST endpoints under /api/analytics/* — mitigated by @Roles(ADMIN, SUPERVISOR) on all endpoints |
| threat_flag: new_websocket_namespace | analytics.gateway.ts | New Socket.IO namespace /ws/analytics — infrastructure only, no data push in MVP |
| threat_flag: npm_dependency | package.json | recharts@2.15.1 added — verified via checkpoint (T-03-SC), version confirmed legitimate |

## Next Phase Readiness

Ready for **Plan 02: Risk Scoring Engine** — AnalyticsService is exported from AnalyticsModule and can be injected by the Risk module for baseline data. Continuous aggregates are in place for risk score computation.

---

*Phase: 03-intelligent-platform*
*Completed: 2026-07-14*
