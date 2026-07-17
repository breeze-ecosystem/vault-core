---
phase: 05-bug-fixing-cross-platform-polish
plan: 01
subsystem: mobile
tags: sentry, flashlist, parity-matrix, crash-reporting, i18n

# Dependency graph
requires:
  - phase: 04-marketing-site-redesign
    provides: French-first locale decision (D-27), UI-SPEC parity baseline
provides:
  - Parity matrix mapping all 28 Dashboard routes to Mobile screens
  - @sentry/react-native crash reporting integration in Mobile root layout and error boundary
  - @shopify/flash-list dependency for high-performance lists
  - expo-localization and i18n-js dependencies for Mobile i18n
  - EXPO_PUBLIC_SENTRY_DSN env var documentation

affects:
  - 05-02 Dashboard Audit
  - 05-03 Mobile Audit
  - 05-04 Mobile Performance
  - 05-05 Translation Audit
  - 05-07 Sentry Source Maps

# Tech tracking
tech-stack:
  added:
    - "@sentry/react-native@8.19.0 — Mobile crash reporting via Sentry"
    - "@shopify/flash-list@2.3.2 — High-performance virtualized list component"
    - "expo-localization@57.0.1 — Device locale detection"
    - "i18n-js@4.5.3 — Internationalization string management"
  patterns:
    - "Sentry.init() + Sentry.wrap() in root layout for crash/performance monitoring"
    - "Sentry.captureException() in ErrorBoundary componentDidCatch"
    - "Parity matrix as a reference document for cross-platform mapping"

key-files:
  created:
    - ".planning/phases/05-bug-fixing-cross-platform-polish/parity-matrix.md — Full 28-route Dashboard↔Mobile mapping"
    - "apps/mobile/.env.example — Sentry DSN env var template"
  modified:
    - "apps/mobile/package.json — Added 4 dependencies"
    - "pnpm-lock.yaml — Updated with new packages"
    - "apps/mobile/app/_layout.tsx — Sentry.init() + Sentry.wrap()"
    - "apps/mobile/components/error-boundary.tsx — Sentry.captureException()"

key-decisions:
  - "Parity matrix format: markdown table with 8 columns (route, lines, counterpart, status, data fields, actions, priority)"
  - "Sentry initialized before any navigation in root layout for full crash coverage"
  - "No TypeScript check pass due to 9 pre-existing errors in unrelated mobile screens — our changed files have zero new errors"
  - ".env.example force-added to git (ignored by .env.* gitignore pattern — consistent with apps/api/.env.example pattern)"

patterns-established:
  - "Sentery integration in Expo apps: init at root, wrap export, capture in error boundary"
  - "Parity matrix reference document for cross-platform consistency tracking"

requirements-completed:
  - POL-02
  - POL-03

# Metrics
duration: 18 min
completed: 2026-07-17
---

# Phase 05 Plan 01: Foundational Infrastructure Summary

**Parity matrix mapping 28 Dashboard routes to Mobile screens, Sentry crash reporting in Mobile root layout, and 4 new Mobile dependencies (Sentry, FlashList, expo-localization, i18n-js)**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-17T20:34:15Z
- **Completed:** 2026-07-17T20:52:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Built comprehensive parity matrix documenting all 28 Dashboard routes with parity status, data fields, actions, and build priority — 8 ✅ Existing, 3 🔲 Partial, 17 ⚠️ Missing
- Installed 4 Mobile dependencies (Sentry, FlashList, expo-localization, i18n-js) — pnpm install completed cleanly
- Configured Sentry crash reporting in Mobile root layout with `Sentry.init()` and `Sentry.wrap()` before navigation
- Updated ErrorBoundary to capture exceptions via `Sentry.captureException()` with component stack
- Documented EXPO_PUBLIC_SENTRY_DSN env var in .env.example for user setup

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the Full Parity Matrix (D-05)** — `a5641cd` (docs)
2. **Task 2: Install Mobile Dependencies** — `6aad194` (chore)
3. **Task 3: Configure Sentry Integration in Mobile (D-07)** — `59b759f` (feat)

**Plan metadata:** (committed with SUMMARY below)

## Files Created/Modified

- `.planning/phases/05-bug-fixing-cross-platform-polish/parity-matrix.md` — Full parity matrix with 28 Dashboard routes mapped to Mobile screens
- `apps/mobile/package.json` — Added 4 dependencies (@sentry/react-native, @shopify/flash-list, expo-localization, i18n-js)
- `pnpm-lock.yaml` — Automatically updated with new package resolutions
- `apps/mobile/app/_layout.tsx` — Added Sentry.init() + Sentry.wrap() on root export
- `apps/mobile/components/error-boundary.tsx` — Added Sentry.captureException() in componentDidCatch
- `apps/mobile/.env.example` — New file with EXPO_PUBLIC_SENTRY_DSN placeholder

## Decisions Made

- **Parity matrix format:** Markdown table with 8 columns. The 28 Dashboard routes break down as: 8 ✅ Existing screens, 3 🔲 Partial (command-center, notifications, visiteurs), 17 ⚠️ Missing. Build priority flags High routes (acces, utilisateurs) for operator workflow parity, Medium for 7 management screens, Low for 8 admin/utility screens.
- **Sentry integration pattern:** `Sentry.init()` called before navigation in root layout for complete crash coverage, root component wrapped with `Sentry.wrap()` for performance tracing, `Sentry.captureException()` in ErrorBoundary for structured error reporting.
- **TypeScript check:** 9 pre-existing TS errors exist in unrelated Mobile screens (cameras.tsx, sites.tsx, nfc-scanner.tsx, etc.). Zero errors introduced by our changes. TypeScript check noted as pre-existing condition, not a regression.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] .env.example force-added to git**
- **Found during:** Task 3 (Sentry Integration)
- **Issue:** The root `.gitignore` pattern `.env.*` ignores `.env.example`. The plan intends this file to be committed as a template (same pattern as `apps/api/.env.example` which is also tracked).
- **Fix:** Used `git add -f` to force-add the file, consistent with existing tracked .env.example in `apps/api/`. Documented the pattern in SUMMARY decisions.
- **Files modified:** `apps/mobile/.env.example`
- **Verification:** `git ls-files` shows the file is now tracked
- **Committed in:** `59b759f` (Task 3 commit)

**2. [Rule 1 — Pre-existing] TypeScript check failure on unrelated files**
- **Found during:** Verification step after Task 3
- **Issue:** `pnpm --filter @repo/mobile check-types` fails with 9 pre-existing TypeScript errors in unrelated screens (cameras, sites, nfc-scanner, photo-capture, qr-scanner, offline-storage). Zero errors in our changed files (_layout.tsx, error-boundary.tsx).
- **Fix:** None needed — pre-existing condition, out of scope per deviation rules. Documented for awareness.
- **Verification:** `grep -E "(layout|error-boundary)"` on tsc output returns no matches.
- **Committed in:** N/A (pre-existing)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 pre-existing issue)
**Impact on plan:** Both deviations documented with no impact on plan objective. All three tasks completed as specified.

## Issues Encountered

- `.env.example` was ignored by `.gitignore` (`.env.*` pattern). Resolved by force-adding, consistent with existing `apps/api/.env.example` tracking pattern.
- Pre-existing TypeScript errors in unrelated Mobile screens do not affect Sentry integration.

## User Setup Required

**Sentry requires manual configuration.** See plan frontmatter `user_setup` section for details:
1. Create a Sentry.io project
2. Copy the DSN to `apps/mobile/.env` as `EXPO_PUBLIC_SENTRY_DSN=`
3. (For source maps in EAS builds) Generate `SENTRY_AUTH_TOKEN` in Sentry settings

## Next Phase Readiness

- Parity matrix ready for Plans 05-02 through 05-08 to reference when building missing Mobile screens
- Sentry integration in place — will capture crash data once EXPO_PUBLIC_SENTRY_DSN is configured
- All four Mobile dependencies installed and usable by downstream plans (FlashList for list optimization, expo-localization + i18n-js for i18n work in 05-05)
- Ready for Plan 05-02: Dashboard Bug Audit

---

## Self-Check: PASSED

- Parity matrix file exists with 28 routes and correct headers
- All 4 packages confirmed in package.json
- All 4 commits exist in git history
- Sentry.init, Sentry.wrap present in _layout.tsx
- Sentry.captureException present in error-boundary.tsx
- EXPO_PUBLIC_SENTRY_DSN in .env.example

*Phase: 05-bug-fixing-cross-platform-polish*
*Completed: 2026-07-17*
