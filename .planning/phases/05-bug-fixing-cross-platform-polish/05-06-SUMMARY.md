---
phase: 05-bug-fixing-cross-platform-polish
plan: 06
subsystem: mobile
tags: [mobile, api-client, parity, screen, expo-router, flash-list, i18n]
requires:
  - phase: 05-04
    provides: Design token reconciliation, Sentry config
  - phase: 05-05
    provides: Dashboard-side parity work
provides:
  - Complete Mobile API client with all parity functions (29 new exports)
  - 8 new Mobile screens for missing Dashboard parity routes
affects: [05-07 (navigation registration), 05-08 (final verification)]
tech-stack:
  added: []
  patterns:
    - "Mobile screen pattern: FlashList + useTranslation + @repo/design tokens"
    - "API client pattern: fetchWithAuth + French error messages + PaginatedResponse"
key-files:
  created:
    - apps/mobile/app/(tabs)/audit/index.tsx
    - apps/mobile/app/(tabs)/api-keys/index.tsx
    - apps/mobile/app/(tabs)/conformite/index.tsx
    - apps/mobile/app/(tabs)/webhooks/index.tsx
    - apps/mobile/app/(tabs)/schemas/index.tsx
    - apps/mobile/app/(tabs)/equipement/index.tsx
    - apps/mobile/app/(tabs)/maintenance/index.tsx
    - apps/mobile/app/(tabs)/patterns/index.tsx
  modified:
    - apps/mobile/lib/api.ts
    - apps/mobile/lib/i18n/locales/fr.ts
    - apps/mobile/lib/i18n/locales/en.ts
key-decisions:
  - "Created screens as sub-directories with index.tsx (Expo Router directory route pattern) instead of flat .tsx files for future extensibility"
  - "Status and severity colors defined inline vs. imported from constants, matching alerts.tsx pattern"
  - "All i18n keys added ahead of screen creation to ensure single-pass screen builds"
requirements-completed:
  - POL-02
duration: 3 min
completed: 2026-07-17
---

# Phase 05 Plan 06: Mobile Feature Parity — API Client + 8 Screens

**Complete Mobile API client (29 new exports) and 8 parity Mobile screens for audit, api-keys, compliance, webhooks, schemas, equipment, maintenance, and patterns**

## Performance

- **Duration:** 3 min 18 sec
- **Started:** 2026-07-17T21:37:31Z
- **Completed:** 2026-07-17T21:40:49Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Added 29 new API client exports (types + functions) to `apps/mobile/lib/api.ts` across 8 feature areas (audit, api-keys, compliance, webhooks, schemas, equipment, maintenance, patterns)
- Created 4 simple parity screens (audit, api-keys, conformite, webhooks) with read-only views, CRUD actions, pull-to-refresh, and i18n
- Created 4 medium parity screens (schemas, equipement, maintenance, patterns) with same data fields and actions as Dashboard counterparts
- All screens use FlashList, loading/error/empty states, `useTranslation()`, and `@repo/design` design tokens

## Task Commits

Each task was committed atomically:

1. **Task 1: Add All Missing API Client Functions** — `4d0e6eb` (feat)
2. **Task 2: Build 4 Simple Parity Screens (audit, api-keys, conformite, webhooks)** — `0fae343` (feat)
3. **Task 3: Build 4 Medium Parity Screens (schemas, equipement, maintenance, patterns)** — `6e61334` (feat)

## Files Created/Modified

- `apps/mobile/lib/api.ts` — Added 280 lines with 29 new exports (8 interfaces + 21 functions) for all 8 parity feature areas
- `apps/mobile/lib/i18n/locales/fr.ts` — Added 125 new i18n keys for all 8 screens
- `apps/mobile/lib/i18n/locales/en.ts` — Added 125 new i18n keys (English translations)
- `apps/mobile/app/(tabs)/audit/index.tsx` — Audit log viewer with severity-colored action indicators, pull-to-refresh, detail Alert
- `apps/mobile/app/(tabs)/api-keys/index.tsx` — API key management with create/revoke, Modal form, new-key banner
- `apps/mobile/app/(tabs)/conformite/index.tsx` — Compliance reports viewer with status badges, metrics, detail view
- `apps/mobile/app/(tabs)/webhooks/index.tsx` — Webhook subscriptions with create/delete/test actions, status badges
- `apps/mobile/app/(tabs)/schemas/index.tsx` — Schema definitions with version badge, active/inactive indicator
- `apps/mobile/app/(tabs)/equipement/index.tsx` — Equipment health monitoring with status-colored indicators and heartbeat
- `apps/mobile/app/(tabs)/maintenance/index.tsx` — Maintenance tickets with priority badges, status chips, create form
- `apps/mobile/app/(tabs)/patterns/index.tsx` — Security patterns with severity-colored left border cards

## Decisions Made

- Created screens as sub-directories with `index.tsx` (Expo Router directory route pattern) rather than flat `.tsx` files, allowing future route nesting
- Added all i18n keys in a single pass before creating screen files to ensure consistent single-build development
- Used inline severity/status color maps within each screen instead of a shared constants file, matching the existing `alerts.tsx` pattern

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

- Mobile API client is complete with all parity functions for 8 feature areas
- 8 new screen files exist but are not yet registered in the tab navigator or "More" menu — covered in Plan 07
- Ready for Plan 07 (navigation registration + tab navigator updates)

## Self-Check: PASSED

- All 11 files confirmed present on disk
- All 4 commits confirmed in git log (3 feature + 1 metadata)
- API client: 29 new exports across 8 feature areas
- 8 screen files created, each using FlashList + useTranslation + i18n + design tokens

---

*Phase: 05-bug-fixing-cross-platform-polish*
*Completed: 2026-07-17*
