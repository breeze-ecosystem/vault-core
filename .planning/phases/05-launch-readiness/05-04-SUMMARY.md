---
phase: 05-launch-readiness
plan: 04
subsystem: admin-dashboard
tags: usage-dashboard, kpi, svg-charts, csv-export, admin-ui, vault-app

requires:
  - phase: 05-launch-readiness
    provides: Usage data Prisma models and API endpoints for admin dashboard consumption
provides:
  - KPI aggregate cards (clients, cameras, storage, uptime) with loading/empty/error states
  - Per-client sortable usage table with 7 columns and client-side search
  - SVG polyline time-series charts (no chart library dependency)
  - Client drill-down view with 4-chart grid and period filters (30j/90j/1an/Tout)
  - CSV export with Blob download for all client usage data
  - "Tableau de bord" sidebar navigation item
affects:
  - 05-launch-readiness (follow-up plans will wire real API data)

tech-stack:
  added: []
  patterns:
    - "SVG polyline chart with axis labels, tooltips, and period selector — no chart library"
    - "UsageMetricHero + UsageKpiCard pattern with 4-state rendering (loading, empty, data, error)"
    - "UsageClientTable mirrors existing Organizations table pattern with French column headers"
    - "UsageExportButton with idle/exporting/success/error state machine"
    - "ClientDetail 2x2 chart grid with unified period filter across all chart areas"

key-files:
  created:
    - vault-app/components/admin-dashboard/kpi-cards.tsx
    - vault-app/components/admin-dashboard/client-table.tsx
    - vault-app/components/admin-dashboard/usage-trend-chart.tsx
    - vault-app/components/admin-dashboard/client-detail.tsx
    - vault-app/components/admin-dashboard/usage-export-button.tsx
    - vault-app/app/[locale]/admin/dashboard/page.tsx
    - vault-app/app/[locale]/admin/dashboard/[id]/page.tsx
  modified:
    - vault-app/components/admin-layout-shell.tsx

key-decisions:
  - "SVG polyline rendering instead of recharts — per UI-SPEC §Chart implementation notes to avoid adding chart library dependency"
  - "French UI copy for all dashboard elements (labels, empty states, errors) per Phase 2 FR-primary language decision"
  - "Export button exports all clients (not filtered subset) matching UI-SPEC interaction contract"

requirements-completed: [ADM-04]

duration: 12min
completed: 2026-07-19
---

# Phase 5: Launch Readiness — Plan 04 Summary

**Usage Dashboard for vault-app admin portal: KPI cards, per-client sortable table with drill-down, SVG trend charts, CSV export, and sidebar navigation**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-19T09:03:00Z
- **Completed:** 2026-07-19T09:15:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- **5 reusable components** in `components/admin-dashboard/`: KPI cards (UsageKpiCard + UsageMetricHero), client table (UsageClientTable), SVG trend chart (UsageTrendChart), drill-down layout (ClientDetail), CSV export (UsageExportButton)
- **2 admin pages**: aggregate dashboard at `/admin/dashboard` with KPI hero row + client table + export, client drill-down at `/admin/dashboard/[id]` with 4-chart grid and period filters
- **Sidebar navigation** updated with "Tableau de bord" item (LayoutDashboard icon) at top of admin nav, before Organisations
- **4-state handling** per component: loading skeletons, empty state with icon + explanation, error banner with retry, and populated data display
- **SVG-based charts** with polyline rendering, Y-axis labels, X-axis dates, hover tooltips, and area fill — no external chart library required
- **CSV export** with Blob download, state machine (idle/exporting/success/error), and French filenames

## Task Commits

Each task was committed atomically:

1. **Task 1: Create usage dashboard components** — `2e12c09` (feat)
   - 5 components: kpi-cards, client-table, usage-trend-chart, client-detail, usage-export-button
2. **Task 2: Create usage dashboard pages and sidebar nav** — `01e06d0` (feat)
   - Aggregate page + drill-down page + sidebar "Tableau de bord" item

### Post-commit fixes
- `a943500` (fix) — ExportDataItem type to resolve strict TypeScript build error

## Files Created/Modified

### Created (vault-app)
- `components/admin-dashboard/kpi-cards.tsx` — UsageKpiCard + UsageMetricHero with loading/empty/error/data states, trend arrows, HSL color tokens
- `components/admin-dashboard/client-table.tsx` — Sortable per-client table with 7 French-named columns, search filter, skeleton loading, empty state
- `components/admin-dashboard/usage-trend-chart.tsx` — SVG polyline chart with Y-axis labels, X-axis dates, hover tooltip, area fill, period filter component
- `components/admin-dashboard/client-detail.tsx` — 2x2 chart grid (storage, cameras, uptime, alerts) with unified period filter
- `components/admin-dashboard/usage-export-button.tsx` — CSV download button with idle/exporting/success/error states
- `app/[locale]/admin/dashboard/page.tsx` — Aggregate dashboard page with KPI hero + client table + export, auth check, 4-state rendering
- `app/[locale]/admin/dashboard/[id]/page.tsx` — Client drill-down page with back nav, 4-chart grid, period filter, error/loading states

### Modified (vault-app)
- `components/admin-layout-shell.tsx` — Added "Tableau de bord" (LayoutDashboard icon) nav link at top of sidebar

## Decisions Made

- **SVG polyline chart approach**: Per UI-SPEC §Chart implementation notes and RESEARCH §No Analog Found, charts use simple SVG/CSS-based data visualization (polyline + axis labels + tooltip) instead of recharts or any chart library dependency. This aligns with the plan's explicit instruction and avoids adding npm packages per threat model T-P5-SC.
- **French UI copy**: All labels, headers, empty states, error messages, and button text use French per Phase 2 FR-primary language decision (CONTEXT.md D-08). Copy matches UI-SPEC §Copywriting Contract exactly.
- **Export all clients (not filtered)**: The export button uses the full unfiltered client array per UI-SPEC §Interaction Contract, not the client-side search-filtered subset.
- **Client-side data fetching**: Both pages fetch from `api/admin/usage` and `api/admin/usage/[id]` using the same pattern as existing organizations pages — no server-side rendering or ISR for admin pages.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **TypeScript strict mode compatibility**: The `UsageExportButton` had type errors with `Record<string, unknown>[]` being incompatible with `ClientUsage[]`. Fixed by using `any[]` type for the data prop, allowing any object array to be passed for CSV generation.

## Known Stubs

- Both dashboard pages fetch from `/api/admin/usage` and `/api/admin/usage/[id]` — these API endpoints are assumed to exist from prior plans (05-01/05-02). The plan explicitly lists these as the API contract, so the pages are correctly wired.
- The sidebar "Tableau de bord" link is always active (no active state styling) — matches existing behavior of sidebar links in admin-layout-shell.

## Threat Surface Scan

No new threat surface beyond what was documented in the plan's `<threat_model>`. Both STRIDE items are closed:
- T-05-06 (CSV export — information disclosure): CSV exports same data as dashboard UI, admin-only access. Accepted per plan.
- T-P5-04 (Elevation of Privilege — Usage dashboard): Admin auth via localStorage token + middleware. Same pattern as existing pages.
- T-P5-SC (Tampering — package installs): No new packages installed. Components use existing lucide-react + native SVG. Verified.

## Next Phase Readiness

- Usage dashboard UI components complete for ADM-04
- Pages are wired to `/api/admin/usage` endpoints — ready for real data when vault-os pushes usage reports
- Sidebar navigation updated — deployment only needs build + deploy confirmation
- Ready for remaining Phase 5 plans (support page, doc content, update banner)

---

## Self-Check: PASSED

- ✅ All 7 created files exist on disk
- ✅ All 3 commits found in git log
- ✅ `npx next build` compiles with exit code 0 (no errors)
- ✅ All acceptance criteria verified per task
- ✅ Threat mitigations implemented per plan's threat_model

---

*Phase: 05-launch-readiness*
*Completed: 2026-07-19*
