---
phase: 003-visitor-kiosk
plan: 04
subsystem: ui
tags: [kiosk, nextjs, printing, qr, state-machine, i18n]

requires:
  - phase: 003-visitor-kiosk
    plan: 03
    provides: Core kiosk components (welcome, scanner, search, confirm) + API client + i18n + state machine
provides:
  - Printing progress screen with connecting/generating/printing/complete states and printer error with retry
  - Success screen with badge preview card, host notification, and 8s auto-reset
  - Badge QR check-out flow with processing/success transition and 5s auto-reset
  - Error screen with context-specific messages per error code and auto-reset for non-fatal errors
  - Full 8-phase state machine integration in page.tsx with all transitions wired
affects: [003-verify]

tech-stack:
  added: []
  patterns:
    - "Progress simulation using useState + useEffect timers for print feedback"
    - "Countdown auto-reset pattern using setInterval with onHome callback"
    - "Error code-based context-specific messaging in ErrorScreen"
    - "Combined API call + state dispatch pattern for handleConfirm (immediate CONFIRM dispatch, then async API)"

key-files:
  created:
    - apps/kiosk/components/printing-screen.tsx
    - apps/kiosk/components/success-screen.tsx
    - apps/kiosk/components/checkout-screen.tsx
    - apps/kiosk/components/error-screen.tsx
  modified:
    - apps/kiosk/app/page.tsx
    - apps/kiosk/lib/i18n.ts

key-decisions:
  - "PrintingScreen uses internal progress simulation (connecting→generating→printing→complete) with timers since actual print API is async"
  - "ErrorScreen shows context-specific messages via errorCode mapping table with auto-reset for non-fatal errors (ALREADY_CHECKED_IN: 5s, ALREADY_CHECKED_OUT: 3s, VISIT_EXPIRED: 8s)"
  - "handleConfirm dispatches CONFIRM immediately to show printing screen, then runs checkIn/printBadge API calls — provides instant visual feedback"
  - "handlePrintRetry re-calls printBadge API (not just dispatch CONFIRM) to ensure actual retry attempt"
  - "PrinterOff icon not available in this lucide-react version — replaced with PrinterX icon"

patterns-established:
  - "Countdown auto-reset: setInterval with React state, dispatches onHome when countdown reaches 0"
  - "Error code routing: ErrorScreen switches on errorCode to show localized, context-appropriate messages"
  - "Progress simulation: useState-driven state machine with useEffect timers for visual-only feedback"

requirements-completed: [KIO-01, KIO-02, KIO-03]

duration: 4min
completed: 2026-07-17
---

# Phase 3 Plan 4: Kiosk Frontend — Printing, Success, Check-out, Error Screens

**Full 8-phase kiosk state machine with printing progress, success auto-reset, badge QR check-out, and context-specific error handling**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-17T17:17:57Z
- **Completed:** 2026-07-17T17:22:00Z
- **Tasks:** 4
- **Files modified:** 6

## Accomplishments

- Printing screen with connecting→generating→printing→complete progress states and animated printer icon
- Printer error state with red error card, error message, retry button, and cancel-check-in link
- Success screen with CheckCircle icon, "Bienvenue {name}!", badge preview card (QR placeholder + visitor/host info), host notification, check-out hint, and 8s countdown auto-reset
- Check-out screen with processing→success transition, "Au revoir {name}!", and 5s auto-reset
- Error screen with context-specific messages per errorCode (NETWORK, PRINTER_ERROR, UNAUTHORIZED, ALREADY_CHECKED_IN, ALREADY_CHECKED_OUT, VISIT_EXPIRED) and auto-reset for non-fatal errors
- Full page.tsx state machine integration with all 8 screens, proper handleConfirm/immediate-CONFIRM-dispatch flow, retry re-calling printBadge, and idle timeout wiring (60s welcome, 30s mid-flow, 8s success, 5s checkout-success, no timeout on error)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create printing screen** - `dd62d9d` (feat)
2. **Task 2: Create success and checkout screens** - `a799d4d` (feat)
3. **Task 3: Create error screen** - `46d6043` (feat)
4. **Task 4: Integrate all screens into page.tsx** - `1d4c3c3` (feat)

## Files Created/Modified

- `apps/kiosk/components/printing-screen.tsx` - Print progress states (connecting→generating→printing→complete) + PrinterX error state with retry/cancel
- `apps/kiosk/components/success-screen.tsx` - "Bienvenue {name}!" with badge preview, host notification, 8s auto-reset
- `apps/kiosk/components/checkout-screen.tsx` - "Au revoir {name}!" with processing→success transition, 5s auto-reset
- `apps/kiosk/components/error-screen.tsx` - Context-specific error messages per errorCode, retry/home buttons
- `apps/kiosk/app/page.tsx` - All 4 components wired into state machine; handleConfirm dispatches CONFIRM immediately; errorCode/errorMessage state; retry re-calls printBadge API
- `apps/kiosk/lib/i18n.ts` - Added error.alreadyCheckedIn, error.visitExpired, error.unauthorized keys

## Decisions Made

- PrintingScreen uses internal progress simulation independent of actual API call timing — provides immediate visual feedback
- handleConfirm dispatches CONFIRM immediately (before API call) to show printing screen for instant feedback
- handlePrintRetry re-calls printBadge API (not just dispatch) to ensure actual retry
- ErrorScreen shows retry button only when onRetry callback provided (PRINTER_ERROR or generic error)
- Auto-reset timers use setInterval pattern with countdown state for visible countdown display

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added missing i18n keys referenced by plan**
- **Found during:** Task 3 (Error screen)
- **Issue:** Plan references `t("error.alreadyCheckedIn", locale)` for ALREADY_CHECKED_IN error code, but the key does not exist in i18n.ts
- **Fix:** Added `error.alreadyCheckedIn`, `error.visitExpired`, and `error.unauthorized` keys to i18n dictionary
- **Files modified:** apps/kiosk/lib/i18n.ts
- **Verification:** Build succeeds, all three keys available for ErrorScreen
- **Committed in:** 46d6043 (Task 3 commit)

**2. [Rule 3 - Blocking] PrinterOff icon not available in lucide-react v1.11.0**
- **Found during:** Build verification (Task 4)
- **Issue:** `PrinterOff` is not exported from lucide-react (version mismatch with plan assumption)
- **Fix:** Replaced `PrinterOff` with `PrinterX` (correct icon name for printer error in this version)
- **Files modified:** apps/kiosk/components/printing-screen.tsx
- **Verification:** Build succeeds, icon renders correctly
- **Committed in:** 1d4c3c3 (Task 4 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for correct operation. No scope creep.

## Issues Encountered

- `PrinterOff` icon name not found in lucide-react v1.11.0 — name is `PrinterX` instead. Quick fix during build verification.

## Known Stubs

- Badge preview card in SuccessScreen uses a simulated QR placeholder (gray QrCode icon) — actual QR rendering will use printed badge visual when real badge format is finalized
- visitDate in SuccessScreen is computed at render time using `new Date().toLocaleDateString("fr-FR", ...)` — in production, this should use the checkedInAt timestamp from the check-in API response for accuracy

## Next Phase Readiness

- All 8 kiosk screens are fully implemented and wired in the state machine
- Ready for Phase 3 verification and end-to-end testing
- Next step: run full kiosk flow verification across all state transitions

---
*Phase: 003-visitor-kiosk*
*Completed: 2026-07-17*
