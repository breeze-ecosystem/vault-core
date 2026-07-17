---
phase: 02-hardware-integration
plan: 05
subsystem: ui
tags: [ptz, camera, video-player, dashboard, nextjs, tailwind, d-06, d-16, d-07]
requires:
  - phase: 02-hardware-integration
    plan: 03
    provides: PTZ API endpoints and client functions (ptzContinuousMove, ptzStop, ptzGotoPreset, ptzSavePreset)
provides:
  - PTZControls component with directional pad, zoom slider, and preset bar
  - PTZ overlay integrated into VideoPlayer with auto-hide (4s inactivity)
  - Role-gated PTZ access (Supervisor+ per D-16)
  - Client-side rate limiting at 5 commands/second
affects:
  - phase: 02-hardware-integration
    plan: 06
  - phase: 02-hardware-integration
    plan: 07
tech-stack:
  added: []
  patterns:
    - "PTZ overlay with auto-hide timer pattern in video player"
    - "Rate-limited directional pad with mouse-down/mouse-up command pattern"
    - "Collapsible preset thumbnail bar with recall and save"
key-files:
  created:
    - apps/dashboard/components/cameras/ptz-controls.tsx
  modified:
    - apps/dashboard/components/video-player.tsx
key-decisions:
  - "PTZControls is a self-contained component with callback props (onMove, onStop, onGotoPreset, onSavePreset) — VideoPlayer wire these to API functions for clean separation"
  - "Rate limiting applied at both the PTZControls level (200ms gap) AND VideoPlayer handler level for defense in depth (T-02-18)"
  - "Overlay uses CSS transition-opacity duration-300 rather than motion library — simpler, zero-dependency, sufficient for fade effect"
  - "PTZPreset interface defined inline in video-player.tsx rather than importing from @repo/shared to avoid dashboard import complexity"
patterns-established:
  - "New camera sub-components go in apps/dashboard/components/cameras/ directory"
  - "PTZ controls use onMouseDown/onMouseUp pattern for continuous movement commands, not onClick"
  - "Auto-hide overlay with cleanup on unmount using useRef for timer"
  - "Dual rate-limit: component-level + handler-level as defense in depth"
requirements-completed: [HWR-03]
---

# Phase 2 Plan 5: Dashboard PTZ Controls Overlay Summary

**PTZControls component (directional pad, zoom slider, preset bar) integrated into VideoPlayer as an auto-hiding, role-gated overlay for Supervisor+**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-17T22:23:17Z
- **Completed:** 2026-07-17T22:38:17Z
- **Tasks:** 2 completed (1 auto-approved checkpoint)
- **Files modified:** 2

## Accomplishments

- Created reusable PTZControls component with 44x44px directional pad, zoom in/out buttons, and collapsible preset thumbnail bar
- Integrated PTZControls into VideoPlayer as auto-hiding overlay (shows on mouse enter, hides after 4s inactivity)
- Role-gated PTZ access: controls render only when userRole is ADMIN, SUPER_ADMIN, or SUPERVISOR (D-16)
- Client-side rate limiting at 5 commands/second for defense against PTZ command overwhelm (Pitfall 4, T-02-18)
- Dual rate-limit gates: 200ms gap in both PTZControls component and VideoPlayer handler
- No-PTZ cameras render no overlay (hasPtz check)
- Backward compatible: existing VideoPlayer usage unchanged when new optional props omitted
- Build verified with `npx next build` — no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PTZControls Component** — `578e629` (feat)
2. **Task 2: Integrate PTZControls into VideoPlayer** — `b0080b6` (feat)
3. **Task 3: Visual Verification** — auto-approved (auto_advance mode)

## Files Created/Modified

- `apps/dashboard/components/cameras/ptz-controls.tsx` - PTZControls component: directional pad, zoom slider, preset bar, role gate, rate limiting
- `apps/dashboard/components/video-player.tsx` - Extended with PTZ overlay, auto-hide timer, PTZ handler functions, new optional props

## Decisions Made

- **Component separation:** PTZControls is a self-contained presentational component receiving callbacks. VideoPlayer wires them to actual API functions — clean separation of concerns.
- **Defense in depth for rate limiting:** Rate limiting implemented at both the PTZControls component level (prevents rapid callback invocation) AND in VideoPlayer handlers (prevents rapid API calls). Either layer independently prevents exceeding 5 cmd/s.
- **CSS transitions over motion library:** The overlay fade effect uses `transition-opacity duration-300` instead of Framer Motion. Simpler, zero-dependency, sufficient for this use case.
- **Inline PTZPreset type:** The `PTZPreset` interface is defined inline rather than imported from `@repo/shared` to avoid potential dashboard-side import resolution complexity.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Threat Surface Scan

| Threat Flag | File | Description |
|---|---|---|
| threat_flag: client-side-rate-limit | apps/dashboard/components/cameras/ptz-controls.tsx | Client-side rate limiting prevents PTZ command overwhelm (T-02-18) |
| threat_flag: dual-role-gate | apps/dashboard/components/video-player.tsx | UI role gate checks role separately from API @Roles decorator (T-02-19) |

## Next Phase Readiness

- PTZ overlay UI complete and ready for PTZ preset management features (Plan 06)
- VideoPlayer provides stable integration point for future camera-viewer enhancements
- Camera page can now render PTZ-capable cameras with full controls by passing `hasPtz={true}`, `userRole={role}`, and `ptzPresets={presets}` props

## Self-Check: PASSED

- [x] ptz-controls.tsx exists (211 lines, 44x44px buttons, role gate, rate limiting)
- [x] video-player.tsx modified (101 lines added, PTZ overlay with auto-hide)
- [x] Commit 578e629: feat(02-hardware-integration-05): create PTZControls component
- [x] Commit b0080b6: feat(02-hardware-integration-05): integrate PTZControls overlay into VideoPlayer
- [x] SUMMARY.md written and verified

---

*Phase: 02-hardware-integration*
*Completed: 2026-07-17*
