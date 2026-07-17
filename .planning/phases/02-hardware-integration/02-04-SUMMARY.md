---
phase: 02-hardware-integration
plan: 04
subsystem: dashboard
tags: door-control, controller-enrollment, event-journal, osdp, react, nextjs
requires:
  - phase: 02-hardware-integration
    plan: 03
    provides: API endpoints for door commands, controller enrollment, event enrichment
provides:
  - Extracted DoorCard component with lock/unlock buttons, zone dropdown, command state feedback
  - New doors page with auto-retry (D-11) and bulk lock/unlock operations (D-12)
  - Controller enrollment UI with pending list and enroll modal (D-17)
  - Event detail component with OSDP hardware details (D-08) and inline camera thumbnail (D-09)
affects: dashboard, hardware-integration
tech-stack:
  added: []
  patterns:
    - DoorCard extracted as standalone component with lock/unlock callbacks
    - Auto-retry with state feedback (sending → sent → acknowledged → failed)
    - Command state tracking via Map<string, CommandState>
    - Controller enrollment modal following existing HistoryModal pattern
    - Event detail component with conditional OSDP section rendering
key-files:
  created:
    - apps/dashboard/components/doors/door-card.tsx
    - apps/dashboard/app/(dashboard)/doors/page.tsx
    - apps/dashboard/components/events/event-detail.tsx
  modified:
    - apps/dashboard/app/(dashboard)/equipement/controleurs/page.tsx
key-decisions:
  - "Door locks disabled on locked state buttons (desynchronized check only needed for non-locked buttons)"
  - "Event detail drawer follows Service pattern with OSDP section shown only when metadata present"
  - "Bulk operations use existing ConfirmationDialog with role-gated ADMIN check"
  - "Pending controller deduplication via id/serialNumber check in Socket.IO handler"
  - "Enroll modal extracts siteIds from zones data rather than requiring a separate sites endpoint"
requirements-completed: [HWR-02, HWR-03]
duration: 5 min
completed: 2026-07-17
---

# Phase 02: Hardware Integration — Plan 04 Summary

**Dashboard door controls (card + bulk + zone) + controller enrollment page + event journal enrichment with OSDP hardware details and inline camera thumbnail**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-17T22:26:50Z
- **Completed:** 2026-07-17T22:31:31Z
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files modified:** 4

## Accomplishments

- Extracted inline `DoorCard` from `portes/page.tsx` into standalone `components/doors/door-card.tsx` with lock/unlock buttons, command state indicator (`sending` → `sent` → `acknowledged` → `failed`), inline zone dropdown (admin-only), and manual retry callback
- Created new `doors/page.tsx` following consistent en-named route pattern with auto-retry logic (D-11: 2s timeout, one retry, 5s fallback), Socket.IO `door:command-state` handler, bulk lock/unlock per zone with `ConfirmationDialog`, and zone change via `PATCH /api/doors/:id`
- Enhanced `controleurs/page.tsx` with pending controllers section above health table, `EnrollModal` with name/site/zone fields, Socket.IO `controller:discovery` and `controller:status` handlers for real-time updates
- Created `components/events/event-detail.tsx` with OSDP hardware detail section (badge number, direction, tamper status, controller serial) and inline camera thumbnail (D-09)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract DoorCard Component + Doors Page** - `7d7aad4` (feat)
2. **Task 2: Controller Enrollment Page** - `2fd94b5` (feat)
3. **Task 3: Event Detail Component** - `fa43c5f` (feat)

## Files Created/Modified

- `apps/dashboard/components/doors/door-card.tsx` - Extracted DoorCard with lock/unlock buttons, zone dropdown, command state, retry callback
- `apps/dashboard/app/(dashboard)/doors/page.tsx` - New doors page with auto-retry, bulk ops, Socket.IO command state
- `apps/dashboard/app/(dashboard)/equipement/controleurs/page.tsx` - Added pending controllers, enroll modal, Socket.IO discovery/status
- `apps/dashboard/components/events/event-detail.tsx` - Event detail with OSDP hardware details and inline camera thumbnail

## Decisions Made

- Lock button on locked door doesn't need desync-disabled check (TypeScript narrowing — when `door.state === "locked"`, it can't be `"desynchronized"`)
- Event detail component renders OSDP section only when metadata contains OSDP-specific fields (badgeNumber, direction, controllerSerial); falls back to raw metadata JSON display otherwise
- Pending controller deduplication in Socket.IO handler avoids duplicates from reconnection bursts
- Enroll modal extracts site IDs from zones list (no separate sites endpoint required)

## Deviations from Plan

None - plan executed exactly as written.

### Auto-fixed Issues

**1. [Rule 3 - Blocking] API_URL constant missing from doors/page.tsx**
- **Found during:** Task 1 (build verification)
- **Issue:** `doors/page.tsx` referenced `API_URL` in `handleZoneChange` but the constant was only defined in `api.ts`, not in the page file
- **Fix:** Added `API_URL` constant definition alongside existing `WS_URL`, added `fetchWithAuth` import
- **Files modified:** `apps/dashboard/app/(dashboard)/doors/page.tsx`
- **Verification:** Build compiles successfully
- **Committed in:** `7d7aad4` (part of Task 1 commit)

**2. [Rule 3 - Blocking] TypeScript narrowing prevents `disabled={door.state === "desynchronized"}` when state is `"locked"`**
- **Found during:** Task 1 (build verification)
- **Issue:** When `door.state === "locked"`, TypeScript narrows to literal `"locked"`, making comparison with `"desynchronized"` a type error
- **Fix:** Removed redundant disabled check from the locked-branch button (a locked door cannot be desynchronized)
- **Files modified:** `apps/dashboard/components/doors/door-card.tsx`
- **Verification:** Build compiles successfully
- **Committed in:** `7d7aad4` (part of Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for compilation. No scope creep.

## Issues Encountered

None.

## Known Stubs

- `event-detail.tsx` OSDP section renders only when metadata contains OSDP-specific fields. Non-OSDP events continue to show raw metadata JSON. This is intentional — the component adapts to event type.

## Threat Flags

None found.

## Task 3 — Checkpoint: Human-Verify

**Status:** Awaiting verification

**Built:** Event detail drawer component with OSDP hardware details section and inline camera thumbnail.

The component is created at `apps/dashboard/components/events/event-detail.tsx` and ready to be integrated into the Chronologie page.

### OSDP Details Section (D-08):
- Badge number shown in monospace font (`#badgeNumber`)
- Direction indicator: "⬈ Entrée" for ingress, "⬉ Sortie" for egress
- Tamper badge: orange "Sabotage" when `tampered === true`
- Controller serial in monospace

### Inline Camera Thumbnail (D-09):
- 64×48px thumbnail from `metadata.lastSnapshotUrl`
- "Voir le clip" button linking to cameras page
- Shown in the "Détails matériel" section

## Next Phase Readiness

- Door card extracted and ready for reuse
- Doors page complete with auto-retry, zone dropdown, bulk operations
- Controller enrollment UI ready (backend API assumed from Plan 02-03)
- Event detail component ready for integration into Chronologie page
- Ready for next plan in Phase 02

---

*Phase: 02-hardware-integration*
*Completed: 2026-07-17*
