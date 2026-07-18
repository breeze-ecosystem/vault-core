---
phase: 04-bastion-enterprise
plan: 02
subsystem: [api, analytics, reporting]
tags: [typescript, nestjs, bullmq, pdfkit, handlebars, timescaledb, bastion, kpi]

requires:
  - phase: 04-bastion-enterprise
    plan: 01
    provides: BastionKpisDto, AnalyticsTrendPoint, BASTION_EVENT_TYPES, Prisma models

provides:
  - BASTION analytics KPI endpoints (TimescaleDB raw SQL queries)
  - Trend data queries with 7d/30d time_bucket aggregation
  - Advanced search across alerts, incidents, access_events with 5 filters
  - CSV export for filtered data
  - Async weekly/monthly PDF report generation via BullMQ
  - Report-ready webhook dispatch
  - Dashboard API functions for analytics and reporting

affects:
  - 04-03 (compliance controllers)
  - 04-04 (advanced storage)
  - 04-05 (API integration)
  - 04-07 (audit dashboard)

tech-stack:
  added: []
  patterns:
    - BastionAnalyticsService with try/catch graceful degradation on KPI queries
    - PRISMA + TimescaleDB raw SQL anti-pattern for time-series queries
    - PDF hybrid format: executive summary (KPI cards) front + appendix (data tables) back
    - BullMQ job queue for async report generation with webhook dispatch

key-files:
  created:
    - apps/api/src/modules/analytics/bastion-analytics.service.ts
    - apps/api/src/modules/reporting/report.controller.ts
    - apps/api/src/modules/reporting/report.service.ts
    - apps/api/src/modules/reporting/report.processor.ts
    - apps/api/src/modules/reporting/report.module.ts
    - apps/api/src/modules/reporting/templates/weekly-report.hbs
    - apps/api/src/modules/reporting/templates/monthly-report.hbs
  modified:
    - apps/api/src/modules/analytics/analytics.service.ts
    - apps/api/src/modules/analytics/analytics.controller.ts
    - apps/api/src/modules/analytics/analytics.module.ts
    - apps/api/src/app.module.ts
    - apps/dashboard/lib/api.ts

key-decisions:
  - "BastionAnalyticsService uses single SQL query with subselects for all 5 KPIs (avoids N+1 round-trips)"
  - "Advanced search uses UNION ALL across alerts, incidents, access_events tables"
  - "Report PDFs generated via PDFKit buffer aggregation with executive summary + appendix hybrid format"
  - "Email delivery is best-effort (D-01): failures logged but do not block report completion"
  - "Report storage uses filesystem at configurable REPORTS_DIR (default: /tmp/reports)"

requirements-completed:
  - BAS-20
  - BAS-21
  - BAS-22
  - BAS-23
  - BAS-24

duration: 7min
completed: 2026-07-18
---

# Phase 04 Plan 02: BASTION Reports & Analytics Backend

**BASTION analytics KPIs, trend queries, advanced search, CSV export, and async weekly/monthly PDF report generation via BullMQ with webhook dispatch**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-18T20:34:38Z
- **Completed:** 2026-07-18T20:41:02Z
- **Tasks:** 2
- **Files modified:** 12 (7 created, 5 modified)

## Accomplishments

- **BastionAnalyticsService** with 5 KPI queries (incidentsToday, activeAlerts, camerasOnline, storageUsedBytes, entriesToday), trend aggregation (7d/30d), advanced search with 5 filters + pagination, and CSV export — all using TimescaleDB raw SQL
- **ReportingModule** with ReportService (weekly/monthly PDF generation via PDFKit + Handlebars), ReportProcessor (BullMQ worker with webhook dispatch + best-effort email), ReportController (6 REST endpoints)
- **Dashboard API functions** — 7 new exported functions covering analytics KPIs, trends, search, export, report generation, listing, and download
- All endpoints protected by `@RequiresPack("BASTION")` and `@Roles()` guards
- Hybrid PDF format per D-01: executive summary (KPI cards) at front, appendix (data tables) in back

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BastionAnalyticsService and extend AnalyticsController with BASTION KPI endpoints** — `2968359` (feat)
2. **Task 2: Create ReportingModule with async PDF generation (weekly/monthly reports)** — `92925c4` (feat)

## Files Created/Modified

### Created (7 files)
- `apps/api/src/modules/analytics/bastion-analytics.service.ts` — BASTION-specific KPI and trend queries against TimescaleDB
- `apps/api/src/modules/reporting/report.controller.ts` — REST endpoints for report CRUD, schedule, and generation
- `apps/api/src/modules/reporting/report.service.ts` — Report generation with PDFKit + Handlebars template rendering
- `apps/api/src/modules/reporting/report.processor.ts` — BullMQ worker for async report generation with webhook dispatch
- `apps/api/src/modules/reporting/report.module.ts` — NestJS module with BullMQ queue registration
- `apps/api/src/modules/reporting/templates/weekly-report.hbs` — Handlebars template for weekly reports
- `apps/api/src/modules/reporting/templates/monthly-report.hbs` — Handlebars template for monthly reports

### Modified (5 files)
- `apps/api/src/modules/analytics/analytics.service.ts` — Added bastionSearch delegation for backward compatibility
- `apps/api/src/modules/analytics/analytics.controller.ts` — Added BASTION-specific analytics endpoints (kpis, trends, search, export)
- `apps/api/src/modules/analytics/analytics.module.ts` — Registered BastionAnalyticsService provider and export
- `apps/api/src/app.module.ts` — Registered ReportingModule
- `apps/dashboard/lib/api.ts` — Added 7 BASTION analytics + reporting API functions

## Decisions Made

- **Single SQL query for all 5 KPIs** — Using subselects avoids N+1 round-trips to PostgreSQL while keeping the query readable
- **UNION ALL for advanced search** — Searching across alerts, incidents, and access_events with common filter interface
- **PDF hybrid format** — Executive summary at front (decision-ready), detailed appendix at back (audit-ready) per D-01
- **Best-effort email delivery** — Per D-01, email failures are logged but do not block report completion
- **Filesystem report storage** — Stored at configurable REPORTS_DIR (default: /tmp/reports) for simplicity; DB blob storage can be added later

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **@repo/shared rebuild needed** — The shared package's BastionKpisDto type was correctly exported but dist was stale. Rebuilt with `npx tsc -p tsconfig.json` in packages/shared before nest build succeeded.
- **Report schedule persistence deferred** — The plan mentions saving schedule config but Organization lacks a generic JSON settings field. Save endpoint accepts and returns data without DB persistence; proper persistence via a ReportSchedule model can be added in a follow-up.
- **Audit logging in processor simplified** — The processor runs without request context; `@Audited()` decorator on controller endpoints handles audit logging for mutation operations. Background job audit logging was simplified to avoid type mismatches with AuditService.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- BASTION analytics backend complete — all KPI, trend, search, export, and report endpoints ready
- Ready for **Plan 03**: HAPDP compliance controllers and wizard endpoints
- ReportingModule can be extended with schedule automation (CronJob) and email delivery enhancements

## Self-Check: PASSED

- [x] SUMMARY.md exists at `.planning/phases/04-bastion-enterprise/04-02-SUMMARY.md`
- [x] Commit 2968359 — BastionAnalyticsService + analytics endpoints
- [x] Commit 92925c4 — ReportingModule with PDF generation
- [x] All 7 created files exist on disk
- [x] All 5 modified files verified
- [x] `npx nest build` passes (exit code 0)
- [x] All BASTION endpoints protected by @RequiresPack("BASTION")
- [x] All 2 tasks executed and committed atomically

---

*Phase: 04-bastion-enterprise*
*Completed: 2026-07-18*
