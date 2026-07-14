---
phase: 03-intelligent-platform
plan: 04
subsystem: equipment, api, dashboard
tags: timescaledb, hypertable, linear-regression, predictive-maintenance, bullmq, camera-door-map

requires:
  - phase: 03-intelligent-platform
    provides: EquipmentService with health monitoring queries and Camera/Door/Controller Prisma models, shared types, TimescaleDB health hypertables

provides:
  - Predictions hypertable for trend analysis storage with compression and retention
  - EquipmentPredictor with linear regression trend analysis for battery, FPS, and failed-read metrics
  - Hourly cron for predictive health computation with minimum data point (10+) and trend duration (3+ day) guards
  - REST API endpoints for predictions, summary, camera-door-map, and manual trigger
  - Dashboard pages for predictive health and camera-to-door mapping

affects: Plan 05 (maintenance ticket auto-creation via prediction.triggered events)

tech-stack:
  added: []
  patterns:
    - Linear regression trend analysis via $queryRawUnsafe on TimescaleDB hypertables
    - Minimum data point and trend duration guards to prevent false positives
    - Debounce pattern reused from EquipmentService for prediction alert suppression

key-files:
  created:
    - apps/api/migrations/timescaledb/up/018_predictive_health.sql — predictions hypertable with compression, retention, 3 indexes
    - apps/api/src/modules/equipment/equipment.predictor.ts — predictive health trend analysis engine
    - apps/dashboard/app/(dashboard)/equipement/predictions/page.tsx — predictive health dashboard
    - apps/dashboard/app/(dashboard)/equipement/cartographie/page.tsx — camera-to-door mapping visualization
  modified:
    - apps/api/src/modules/queue/queue.module.ts — added predictive-health BullMQ queue
    - apps/api/src/modules/equipment/equipment.service.ts — added computePredictions, getPredictions, getCameraDoorAssociations, getPredictiveHealthSummary
    - apps/api/src/modules/equipment/equipment.module.ts — registered EquipmentPredictor and predictive-health queue
    - apps/api/src/modules/equipment/equipment.controller.ts — added 4 new endpoints
    - packages/shared/src/types/equipment.types.ts — added PredictionDto, CameraDoorAssociationDto, PredictiveQueryParams
    - packages/shared/src/index.ts — exported new types
    - apps/dashboard/lib/api.ts — added predictive health API client functions
    - apps/dashboard/lib/i18n/dictionaries/fr.ts — added predictiveHealth and cameraMapping sections
    - apps/dashboard/lib/i18n/dictionaries/en.ts — added English equivalents

key-decisions:
  - "Use linear regression (least squares) over simple threshold alerts: detects degradation trends before failure, not after"
  - "Minimum 10 data points + 3-day trend duration guards prevent false positives from insufficient data"
  - "Predictions store full trend metadata (slope, hours-to-failure, confidence) enabling dashboard to compute risk independently"
  - "Hourly cron via @Cron(\"0 * * * *\") bounded by device count for predictable resource usage"

patterns-established:
  - "Trend analysis: $queryRawUnsafe with linear regression formula on TimescaleDB hypertables"
  - "False positive prevention: MIN_DATA_POINTS (10) + MIN_TREND_DAYS (3) guards before emitting predictions"
  - "Prediction debounce: EquipmentService.setDebounce pattern reused for prediction.triggered events"

requirements-completed:
  - EQPT-04
  - EQPT-05

duration: 6min
completed: 2026-07-14
---

# Phase 3 Plan 4: Predictive Equipment Health Summary

**Linear regression trend analysis on TimescaleDB health time-series for predicting equipment degradation (battery drain, FPS drop, failed reads), plus camera-to-door mapping visualization detecting orphans and zone mismatches**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-14T20:01:48Z
- **Completed:** 2026-07-14T20:07:48Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Created `predictions` TimescaleDB hypertable with 7-day chunk intervals, compression, 365-day retention, and three indexes (device+time, site+time, pending alerts)
- Registered `predictive-health` BullMQ queue in QueueModule
- Built `EquipmentPredictor` with linear regression trend analysis supporting controller battery, camera FPS ratio, and reader failed-read predictions, with minimum 10 data points + 3-day trend guards
- Extended `EquipmentService` with hourly cron (`@Cron("0 * * * *")`), getPredictions, getCameraDoorAssociations, getPredictiveHealthSummary
- Added 4 role-protected REST endpoints: `GET /predictions`, `GET /predictions/summary`, `GET /camera-door-map`, `POST /predictions/run`
- Created predictive health dashboard at `/equipement/predictions` with summary cards, at-risk device cards, color-coded hours-to-failure badges, and manual trigger button
- Created camera-to-door mapping dashboard at `/equipement/cartographie` with association table, orphan cameras, orphan doors, zone mismatch detection, and all-OK state
- Added full i18n support (French primary, English fallback) for both new pages

## Task Commits

Each task was committed atomically:

1. **Task 1: TimescaleDB predictions Hypertable & Infrastructure** - `f899c35` (feat)
2. **Task 2: EquipmentPredictor & Extended EquipmentService** - `39d26b4` (feat)
3. **Task 3: Predictive Health & Camera-to-Door Dashboards** - `18f9040` (feat)

**Plan metadata (this summary):** `pending`

## Files Created/Modified

- `apps/api/migrations/timescaledb/up/018_predictive_health.sql` — Predictions hypertable with compression, retention, 3 indexes
- `apps/api/src/modules/equipment/equipment.predictor.ts` — Predictive health trend analysis engine
- `apps/api/src/modules/equipment/equipment.service.ts` — Extended with 4 predictive health methods + hourly cron
- `apps/api/src/modules/equipment/equipment.module.ts` — Registered EquipmentPredictor and predictive-health queue
- `apps/api/src/modules/equipment/equipment.controller.ts` — 4 new endpoints
- `apps/api/src/modules/queue/queue.module.ts` — Added predictive-health queue
- `packages/shared/src/types/equipment.types.ts` — Added PredictionDto, CameraDoorAssociationDto
- `packages/shared/src/index.ts` — Exported new types
- `apps/dashboard/lib/api.ts` — Added predictive health API client functions
- `apps/dashboard/app/(dashboard)/equipement/predictions/page.tsx` — Predictive health dashboard
- `apps/dashboard/app/(dashboard)/equipement/cartographie/page.tsx` — Camera-to-door mapping
- `apps/dashboard/lib/i18n/dictionaries/fr.ts` — predictiveHealth and cameraMapping i18n keys
- `apps/dashboard/lib/i18n/dictionaries/en.ts` — English equivalents

## Decisions Made

- **Linear regression over simple threshold alerts**: Least-squares slope computation detects degradation trends before failure. False positives mitigated by 10+ data point and 3+ day trend duration minimums.
- **Full trend metadata stored in predictions table**: Slope, hours-to-failure, confidence, and data points enable dashboard-level risk computation without recalculating.
- **Hourly cron bounded by device count**: `@Cron("0 * * * *")` iterates over all active devices from the last 7 days of health data — predictable, bounded resource usage.
- **Event emission for critical predictions**: `prediction.triggered` event fires when hours-to-failure <= 72, enabling Plan 05 to auto-create maintenance tickets.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Two TypeScript type-narrowing issues in `equipment.predictor.ts` (null-assertion guards for optional health columns) — fixed during type check verification (Rule 3 - Blocking: TS compilation failure). Both were minor type assertions that matched the SQL-level NOT NULL filters already in place.

## Next Phase Readiness

- Predictive health engine operational on hourly cron
- `prediction.triggered` events emitted for failures within 72h — ready for Plan 05 maintenance ticket auto-creation
- Camera-to-door mapping detects orphans and mismatches — ready for door management workflow integration
- All 3 requirements (EQPT-04, EQPT-05) completed

## Self-Check: PASSED

- [x] All 4 created files exist on disk
- [x] All 8 key files verified on disk
- [x] 3 task commits confirmed in git log
- [x] TypeScript compilation passes for @repo/shared and @repo/api
- [x] No errors from new files in dashboard TypeScript check

---

*Phase: 03-intelligent-platform*
*Completed: 2026-07-14*
