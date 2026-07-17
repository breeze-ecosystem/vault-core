---
phase: 003-visitor-kiosk
plan: 03
subsystem: kiosk-frontend
tags: react, nextjs, typescript, i18n, instascan, webrtc, qr-scanner, tailwindcss

requires:
  - phase: 003-visitor-kiosk
    provides: kiosk app scaffold (next.config.js, tailwind.config.ts, layout.tsx, globals.css)
  - phase: 003-visitor-kiosk
    provides: KioskController API endpoints for check-in/out/search/print
  - phase: 003-visitor-kiosk
    provides: KioskAuthGuard and API key auth
provides:
  - Welcome screen with brand header, FR/EN language toggle, scan and search CTAs
  - QR scanner with instascan WebRTC camera integration and error handling
  - Debounced name search with API-backed results list
  - Confirmation screen with visitor photo, details card, confirm/cancel actions
  - Root state machine (useReducer) driving all 8 kiosk phases with idle timers
  - Typed API client (kiosk-api.ts) with X-API-Key + X-Kiosk-Id headers
  - FR/EN i18n dictionary (50+ keys) with variable interpolation
affects: 03-04 (printing/success/checkout/error screen components), 03-05 (Docker + CUPS)

tech-stack:
  added:
    - instascan ^1.0.0 (browser QR scanning via WebRTC)
  patterns:
    - useReducer state machine with discriminated union action types
    - Flat i18n dictionary with pure t() function (no React Context)
    - Typed API client class with custom error codes
    - Debounced search with loading skeleton states

key-files:
  created:
    - apps/kiosk/lib/i18n.ts
    - apps/kiosk/lib/kiosk-api.ts
    - apps/kiosk/components/welcome-screen.tsx
    - apps/kiosk/components/qr-scanner.tsx
    - apps/kiosk/components/search-screen.tsx
    - apps/kiosk/components/confirm-checkin.tsx
    - apps/kiosk/types/instascan.d.ts
  modified:
    - apps/kiosk/app/page.tsx
    - apps/kiosk/next.config.js

key-decisions:
  - API client routes through KioskController endpoints (/kiosk/...), not direct @Roles-guarded visitor endpoints
  - API_URL defaults to "/api" (relative to same origin), kioskFetch constructs "/kiosk/..." paths
  - instascan used via dynamic import + webpack fs fallback (instascan's ZXing bundle references Node 'fs')
  - QR scanner differentiates check-in vs check-out paths by visit status (scheduled → check-in, checked-in/active → check-out)
  - French (fr) is default locale per D-27
  - Placeholder screens for printing/success/checkout-success/error — replaced by Plan 03-04 components
  - instascan type declarations added manually (package has no @types)

requirements-completed: [KIO-01, KIO-03]

duration: 7 min
completed: 2026-07-17
---

# Phase 3 Plan 3: Core Kiosk Frontend Summary

**State-machine-driven kiosk SPA with instascan QR scanning, debounced name search, FR/EN i18n, and typed API client**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-17T17:06:00Z
- **Completed:** 2026-07-17T17:13:00Z
- **Tasks:** 4
- **Files modified:** 9 (7 created, 2 modified)

## Accomplishments

- **i18n dictionary** (`lib/i18n.ts`) with 50+ FR/EN keys and `t()` variable interpolation — covers welcome, scanner, search, confirm, printing, success, checkout, and error screens
- **Typed API client** (`lib/kiosk-api.ts`) with `X-API-Key` + `X-Kiosk-Id` headers, `KioskApiError` class with 8 typed error codes, and 5 API functions (`searchVisits`, `getVisit`, `checkIn`, `checkOut`, `printBadge`)
- **Welcome screen** (`components/welcome-screen.tsx`) with brand header, language toggle, scan/Search CTAs — 56px touch targets, responsive layout
- **QR scanner** (`components/qr-scanner.tsx`) with instascan WebRTC integration, back camera preference, and error states (no-camera, permission-denied)
- **Search screen** (`components/search-screen.tsx`) with 300ms debounced input, loading skeletons, results list with left-border highlight, no-results hint, and error retry
- **Confirmation screen** (`components/confirm-checkin.tsx`) with visitor photo/initials, details card (host, company, date, purpose), confirm with verifying spinner, and inline error handling
- **Root state machine** (`app/page.tsx`) with `useReducer` implementing all 8 phases (welcome → scanning/search → confirm → printing → success/checkout-success/error), all transitions from UI-SPEC diagram, and idle timers (60s welcome, 30s mid-flow, 8s success, 5s checkout-success)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create i18n dictionary and kiosk API client** - `5c1d896` (feat)
2. **Task 2: Create welcome screen and QR scanner components** - `6adf849` (feat)
3. **Task 3: Create search screen and confirm check-in component** - `36c6010` (feat)
4. **Task 4: Create root state machine in page.tsx** - `4a6b25e` (feat)

**Plan metadata:** Pending (this commit)

## Files Created/Modified

- `apps/kiosk/lib/i18n.ts` — 50+ key FR/EN dictionary with `t(key, locale, vars?)` function
- `apps/kiosk/lib/kiosk-api.ts` — Typed API client with API key auth, 5 endpoint functions, KioskApiError class
- `apps/kiosk/components/welcome-screen.tsx` — Welcome screen with brand, CTAs, language toggle
- `apps/kiosk/components/qr-scanner.tsx` — instascan WebRTC QR scanner with camera error states
- `apps/kiosk/components/search-screen.tsx` — Debounced name search with results list
- `apps/kiosk/components/confirm-checkin.tsx` — Visitor details + confirm/cancel with loading state
- `apps/kiosk/app/page.tsx` — Root state machine integrating all components
- `apps/kiosk/next.config.js` — Added webpack `fs: false` fallback for instascan
- `apps/kiosk/types/instascan.d.ts` — TypeScript declarations for instascan library

## Decisions Made

- **KioskController routes:** API client routes through `KioskController` endpoints (`/kiosk/...`) instead of `@Roles`-guarded visitor endpoints, matching the plan's correction from the original UI-SPEC
- **instascan webpack config:** Required `fallback: { fs: false }` in Next.js webpack config because instascan's ZXing Emscripten bundle references Node's `fs` module (not used at runtime in browser)
- **Check-in vs check-out routing:** QR decode handler fetches visit status first — `scheduled` visits go to check-in confirm, `checked-in`/`active` visits auto-trigger check-out flow
- **French as default:** Locale defaults to `"fr"` per D-27, toggled via welcome screen buttons

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added instascan TypeScript declarations**
- **Found during:** Task 2 (QR scanner component)
- **Issue:** `instascan` package has no TypeScript declarations — build failed with "Could not find a declaration file for module 'instascan'"
- **Fix:** Created `apps/kiosk/types/instascan.d.ts` with Scanner, Camera, and module declarations
- **Files modified:** `apps/kiosk/types/instascan.d.ts`
- **Verification:** Build passes with type checking
- **Committed in:** `6adf849` (Task 2 commit)

**2. [Rule 3 - Blocking] Added webpack fallback for instascan's fs module**
- **Found during:** Task 4 (root state machine build)
- **Issue:** `instascan` source references `require('fs')` in its ZXing Emscripten build — webpack fails to compile for browser bundle
- **Fix:** Added `webpack.config.resolve.fallback: { fs: false }` in `apps/kiosk/next.config.js`
- **Files modified:** `apps/kiosk/next.config.js`
- **Verification:** Build succeeds with webpack compilation
- **Committed in:** `4a6b25e` (Task 4 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for successful build. No scope creep — instascan is a pre-2017 library requiring these workarounds on modern bundlers.

## Issues Encountered

- instascan library (last published 2017) requires webpack `fs` fallback and manual type declarations due to its Emscripten-compiled ZXing dependency. These are known compatibility issues documented in the plan's RESEARCH.md as Assumption A1 ("instascan works on Chromium") — the build-time issues are separate from runtime concerns.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- Core kiosk SPA is fully wired with state machine, i18n, API client, and 4 operational screens
- **Ready for Plan 03-04:** Real printing/success/checkout-success/error components (currently placeholder screens)
- After 03-04: Docker + CUPS deployment in Plan 03-05
- The `handleConfirm` and `handleQRDecoded` handler functions contain the print flow that will connect to 03-04's printing screen component

---

*Phase: 003-visitor-kiosk*
*Completed: 2026-07-17*
