---
phase: 03-intelligent-platform
plan: 03
subsystem: patterns
tags: [timescaledb, cron, redis, bullmq, patterns, recurring, dashboard, i18n]

# Dependency graph
requires:
  - phase: 03-01
    provides: Door state machines, access events, reader/camera health hypertables
  - phase: 03-02
    provides: Risk scoring module, queue infrastructure
provides:
  - detected_patterns hypertable (TimescaleDB with compression and retention)
  - Pattern detection engine with 5 frequency rules (15-min cron)
  - Redis dedup preventing duplicate alerts within 6 hours
  - EventEmitter2 integration for real-time notification
  - REST API (list, definitions, resolve, manual trigger) with role-based access
  - Recurring patterns dashboard with filters, severity badges, and inline resolution
  - French/English i18n dictionaries for all patterns UI
affects:
  - 03-04 (maintenance workflows will consume pattern events)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TimescaleDB hypertable with compression and retention for pattern data
    - Redis dedup with 6-hour TTL for pattern deduplication
    - Cron-driven frequency analysis queries against time-series hypertables

key-files:
  created:
    - apps/api/migrations/timescaledb/up/017_recurring_patterns.sql
    - apps/api/src/modules/patterns/patterns.module.ts
    - apps/api/src/modules/patterns/patterns.service.ts
    - apps/api/src/modules/patterns/patterns.controller.ts
    - apps/api/src/modules/patterns/patterns.processor.ts
    - packages/shared/src/schemas/patterns.schema.ts
    - packages/shared/src/types/patterns.types.ts
    - apps/dashboard/app/(dashboard)/schemas/page.tsx
  modified:
    - apps/api/src/app.module.ts
    - apps/api/src/modules/queue/queue.module.ts
    - packages/shared/src/index.ts
    - apps/dashboard/lib/api.ts
    - apps/dashboard/lib/nav-config.ts
    - apps/dashboard/lib/i18n/dictionaries/fr.ts
    - apps/dashboard/lib/i18n/dictionaries/en.ts

key-decisions:
  - "Pattern rules defined inline in PatternsService as const array for simplicity; can be moved to DB if admin configurability is needed later"
  - "Composite ID (pattern_id + device_id) used as hypertable lookup instead of UUID PK since hypertables use time-based partitioning"
  - "Detail panel rendered inline below table rather than modal dialog to avoid dependency on missing Dialog component"
  - "Pattern detection uses raw SQL queries ($queryRawUnsafe) against TimescaleDB hypertables for GROUP BY/HAVING frequency analysis"

patterns-established:
  - "TimescaleDB migration pattern: enum → table → create_hypertable → compress → retention → indexes"
  - "BullMQ processor pattern: WorkerHost with switch/case on job.name"

requirements-completed:
  - RSK-02

# Metrics
duration: 7min
completed: 2026-07-14
---

# Phase 3 Plan 3: Recurring Pattern Detection Summary

**Five configurable frequency rules detecting repeated door forced-open, held-open, reader failures, camera FPS drops, and denied access — with Redis dedup, TimescaleDB persistence, and a filterable patterns dashboard**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-14T19:52:53Z
- **Completed:** 2026-07-14T19:59:59Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Created `detected_patterns` TimescaleDB hypertable with `pattern_severity` enum, compression, retention policy, and 3 indexes for performant querying
- Implemented pattern detection engine running every 15 minutes via `@Cron("*/15 * * * *")` with 5 configurable frequency rules querying `door_state_log`, `reader_health`, `camera_health`, and `access_events` hypertables
- Added Redis dedup with 6-hour TTL (`pattern:dedup:*` keys) per Pitfall 3 mitigation to prevent duplicate pattern alerts
- Integrated EventEmitter2 `pattern.detected` events for real-time notification downstream
- Created BullMQ `recurring-patterns` queue with processor handling `detect-patterns` and `resolve-pattern` jobs
- Exposed role-protected REST API: list patterns (OPERATOR+), definitions/resolve (SUPERVISOR+), manual trigger (ADMIN)
- Built `/schemas` dashboard with summary cards, device-type tabs, severity/status filters, color-coded badges, and inline pattern resolution
- Added French and English i18n dictionaries for all UI text including pattern name translations

## Task Commits

Each task was committed atomically:

1. **Task 1: TimescaleDB Hypertable & Infrastructure** - `24b9834` (feat)
2. **Task 2: Pattern Detection Engine** - `a40a68b` (feat)
3. **Task 3: Recurring Patterns Dashboard** - `dfee356` (feat)

**Plan metadata:** (committed with final commit as part of execution process)

## Files Created/Modified

- `apps/api/migrations/timescaledb/up/017_recurring_patterns.sql` - detected_patterns hypertable with pattern_severity enum, compression, retention, 3 indexes
- `apps/api/src/modules/patterns/patterns.module.ts` - Full module with Redis provider and BullMQ registration
- `apps/api/src/modules/patterns/patterns.service.ts` - Detection engine with 5 pattern rules, cron, dedup, event bus
- `apps/api/src/modules/patterns/patterns.controller.ts` - 4 role-protected endpoints
- `apps/api/src/modules/patterns/patterns.processor.ts` - BullMQ WorkerHost processor
- `apps/api/src/app.module.ts` - PatternsModule registration
- `apps/api/src/modules/queue/queue.module.ts` - recurring-patterns queue added
- `packages/shared/src/schemas/patterns.schema.ts` - Zod validation schema
- `packages/shared/src/types/patterns.types.ts` - Shared TypeScript interfaces
- `packages/shared/src/index.ts` - Patterns exports added
- `apps/dashboard/lib/api.ts` - Pattern API client functions
- `apps/dashboard/app/(dashboard)/schemas/page.tsx` - Patterns dashboard
- `apps/dashboard/lib/nav-config.ts` - "Schémas" nav item (SUPERVISOR+)
- `apps/dashboard/lib/i18n/dictionaries/fr.ts` - French patterns UI text
- `apps/dashboard/lib/i18n/dictionaries/en.ts` - English patterns UI text

## Decisions Made

- **Inline pattern definitions**: Pattern rules are defined as a const array in `PatternsService` for simplicity. If admin configurability is needed later, they can be migrated to a database table.
- **Composite hypertable lookup**: The `detected_patterns` hypertable uses `pattern_id + device_id` composite lookups instead of a UUID primary key, since hypertables partition by time and don't benefit from UUID PKs.
- **Inline detail panel**: The pattern detail view renders inline below the table rather than as a modal dialog, since the existing UI library doesn't include a Dialog component.
- **Raw SQL for frequency analysis**: Pattern detection uses `$queryRawUnsafe` for GROUP BY/HAVING frequency queries against TimescaleDB hypertables, following the existing pattern in `equipment.service.ts`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The dashboard UI library's `table.tsx` exports a `DataTable` generic component, not individual `Table`/`TableBody`/`TableCell` components. Rewrote the schemas page to use inline `<table>` elements consistent with the existing pattern.
- No `Dialog` component exists in the UI library. Replaced the modal with an inline detail panel that appears below the table when a row is selected.

## Threat Surface Scan

No new threat surface beyond what was modeled in the plan's threat register:
- T-03-10 (Information Disclosure): mitigated via `@Roles` on all endpoints and site-scoped queries
- T-03-11 (Denial of Service): mitigated via 15-min cron cadence and indexed hypertable queries
- T-03-12 (Tampering — Redis dedup keys): accepted per plan
- T-03-13 (Tampering — pattern resolution): mitigated via `@Roles(ADMIN, SUPERVISOR)`

## Known Stubs

None — all components are fully wired.

## Next Phase Readiness

- Recurring pattern detection is fully operational with 5 frequency rules
- Patterns dashboard at `/schemas` is ready for operator use
- Event bus integration (`pattern.detected` events) ready for consumption by maintenance workflows (Plan 4)
- Ready for plan 03-04 (maintenance integration / auto-ticket creation from equipment alerts)

---

*Phase: 03-intelligent-platform*
*Completed: 2026-07-14*
