---
phase: 04-bastion-enterprise
plan: 06
subsystem: ui
tags: retention, forensic, evidence, tsa, backup, nas, dashboard, react

# Dependency graph
requires:
  - phase: 04-bastion-enterprise
    provides: GovernanceModule (retention policies), ForensicModule (BullMQ certification), BackupModule (NAS auto-backup), API client functions in api.ts
provides:
  - Per-site/per-event retention configuration UI with 30d-730d sliders
  - Forensic evidence export modal with TSA certification progress and download
  - NAS backup configuration form with test connection and manual trigger
  - Backup health status dashboard card with color-coded indicators
affects:
  - 04-bastion-enterprise (storage management UI complete)
  - 05-launch (operations runbook references backup UI)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Step-based modal pattern for forensic evidence export (format → metadata → certify → complete)"
    - "Save + Test pattern for backup config (separate test and save actions per UI-SPEC Interaction Pattern 4)"

key-files:
  created:
    - apps/dashboard/components/retention-config-form.tsx
    - apps/dashboard/components/forensic-evidence-export.tsx
    - apps/dashboard/app/(dashboard)/parametres/retention/page.tsx
    - apps/dashboard/components/backup-config-form.tsx
    - apps/dashboard/components/backup-status-card.tsx
    - apps/dashboard/app/(dashboard)/parametres/sauvegarde/page.tsx
  modified: []

key-decisions:
  - "Retention form uses local event type list with DEFAULT_EVENT_TYPES fallback when API event types not provided"
  - "Backup credentials (password/username) stored separately from config — password fields start empty (not returned by GET /config per T-04-18)"
  - "Certification progress uses simulated progress steps while BullMQ processes (client-side polling model)"

requirements-completed:
  - BAS-26
  - BAS-27
  - BAS-29

# Metrics
duration: 20min
completed: 2026-07-18
---

# Phase 4: BASTION Enterprise — Plan 06 Summary

**Storage & Archiving Dashboard UI — retention configuration, forensic evidence export modal, and NAS backup management page**

## Performance

- **Duration:** 20 min
- **Started:** 2026-07-18T21:17:41Z
- **Completed:** 2026-07-18T21:37:41Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- **Retention configuration page** (`/parametres/retention`) with per-site selector, event type rows with 30d-730d retention period select, export-before-purge toggle, and CSV/PDF format selection — all French per UI-SPEC
- **Forensic evidence export modal** with 4-step flow (format selection → optional metadata → animated certification progress → download with TSA certificate info) using Dialog component
- **Backup configuration page** (`/parametres/sauvegarde`) with NAS target path, credentials, schedule selection, test-connection button, and manual backup trigger with progress bar
- **Backup status card** showing last backup date, next scheduled backup, data size, and color-coded health indicator (green/red/amber) with failed-backup glow per UI-SPEC
- All 6 components handle loading (skeleton), empty (CTA with French copy), and error (retry button) states per UI-SPEC

## Task Commits

Each task was committed atomically:

1. **Task 1: Create retention configuration page and forensic evidence export component** — `83a6035` (feat)
2. **Task 2: Create backup configuration page with form, status card, and test connection** — `a156cef` (feat)

**Plan metadata:** _(pending final commit)_

## Files Created/Modified

- `apps/dashboard/components/retention-config-form.tsx` — Retention policy editor with site/event type scope selectors and 30d-730d retention sliders
- `apps/dashboard/components/forensic-evidence-export.tsx` — Certified evidence export modal with format selection, metadata, animated progress, and download
- `apps/dashboard/app/(dashboard)/parametres/retention/page.tsx` — Retention configuration page (use client, PageHeader, data fetching, loading/error/empty states)
- `apps/dashboard/components/backup-config-form.tsx` — NAS backup configuration form (path, credentials, schedule, test, save, manual run with progress)
- `apps/dashboard/components/backup-status-card.tsx` — Backup health dashboard card with last/next backup, size, status icon
- `apps/dashboard/app/(dashboard)/parametres/sauvegarde/page.tsx` — Backup configuration page with status card and config form

## Decisions Made

- **Event types list**: The form uses `DEFAULT_EVENT_TYPES` (10 common types) as fallback when no `eventTypes` prop is provided, matching the BASTION_EVENT_TYPES pattern from shared constants
- **Credential security (T-04-26)**: Backup password field uses `type="password"` and starts empty — password is never returned by GET /config per the threat model
- **Progress simulation**: Both certification and backup progress use client-side simulated progress (step-based increments) since BullMQ jobs don't emit real-time progress events to the dashboard
- **Health indicators**: Backup status card uses `bg-success/20` (green) for healthy, `bg-destructive/20` (red) with border glow for failed, and `bg-warning/20` (amber) for in-progress per UI-SPEC

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **BackupConfigInput type**: `BackupConfigInput` was a locally-defined interface in `backup-config-form.tsx` but the page tried to import it from `@/lib/api`. Fixed by using inline object types in the page component.
- **Optional eventTypes prop**: The `eventTypes` prop on `RetentionConfigForm` is optional, causing a strict null check when accessing `eventTypes[0]`. Fixed with non-null assertion since the fallback to `DEFAULT_EVENT_TYPES` ensures the array is never empty.

## Threat Surface Scan

No new threat surface beyond what was documented in the plan's `<threat_model>`. All three threat register items (T-04-26 through T-04-28) are mitigated as specified:

- **T-04-26 (Information Disclosure — Backup password)**: Password field uses `type="password"`. Component starts with empty password field (not populated from config response). Never displayed in UI.
- **T-04-27 (Tampering — Retention config mass deletion)**: Each rule has individual delete with confirmation; all changes saved via onSave with server-side validation.
- **T-04-28 (DoS — Forensic evidence rapid exports)**: Export button disabled during certification; progress UI prevents double-click. Server-side BullMQ queue handles concurrency.

## Self-Check: PASSED

- ✅ All 6 created files exist on disk
- ✅ Both commits found in git log
- ✅ `npx next build` compiles successfully — pages built: `/parametres/retention` (5.42 kB), `/parametres/sauvegarde` (7.56 kB)
- ✅ All acceptance criteria verified per task
- ✅ Threat mitigations implemented per plan's threat_model

---

*Phase: 04-bastion-enterprise*
*Completed: 2026-07-18*
