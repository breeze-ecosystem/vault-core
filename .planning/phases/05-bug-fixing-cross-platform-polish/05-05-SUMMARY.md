---
phase: 05-bug-fixing-cross-platform-polish
plan: 05
subsystem: i18n
tags: mobile, expo-localization, i18n-js, expo-router
requires:
  - phase: 05-bug-fixing-cross-platform-polish
    provides: Mobile parity audit, Dashboard i18n framework as structural model
provides:
  - Mobile i18n infrastructure with expo-localization + i18n-js
  - French and English locale dictionaries with full key parity
  - I18nProvider context wrapping the Expo Router app root
  - Migration of all hardcoded French strings from 14 screen files
  - Migration of all hardcoded French strings from 9 component files
affects:
  - All future Mobile feature work (new screens must use t())
tech-stack:
  added:
    - expo-localization 57.0.1 (already in dependencies)
    - i18n-js 4.5.3 (already in dependencies)
  patterns:
    - I18nProvider wraps root layout, provides t() via useTranslation() hook
    - Class components consume i18n via I18nContext.contextType
    - Hooks inside memo() components for card components
key-files:
  created:
    - apps/mobile/lib/i18n/index.ts
    - apps/mobile/lib/i18n/context.tsx
    - apps/mobile/lib/i18n/locales/fr.ts
    - apps/mobile/lib/i18n/locales/en.ts
  modified:
    - apps/mobile/app/_layout.tsx
    - apps/mobile/app/(tabs)/index.tsx
    - apps/mobile/app/(tabs)/alerts.tsx
    - apps/mobile/app/(tabs)/cameras.tsx
    - apps/mobile/app/(tabs)/incidents.tsx
    - apps/mobile/app/(tabs)/chat.tsx
    - apps/mobile/app/(tabs)/sites.tsx
    - apps/mobile/app/(tabs)/settings.tsx
    - apps/mobile/app/(tabs)/more.tsx
    - apps/mobile/app/(tabs)/guard/index.tsx
    - apps/mobile/app/(tabs)/guard/door-control.tsx
    - apps/mobile/app/(tabs)/guard/qr-checkin.tsx
    - apps/mobile/app/(tabs)/guard/nfc-scan.tsx
    - apps/mobile/app/notifications.tsx
    - apps/mobile/app/login.tsx
    - apps/mobile/components/error-boundary.tsx
    - apps/mobile/components/alert-card.tsx
    - apps/mobile/components/camera-card.tsx
    - apps/mobile/components/mobile-incident-card.tsx
    - apps/mobile/components/door-control-card.tsx
    - apps/mobile/components/org-switcher.tsx
    - apps/mobile/components/qr-scanner.tsx
    - apps/mobile/components/nfc-scanner.tsx
    - apps/mobile/components/photo-capture.tsx
key-decisions:
  - "expo-localization + i18n-js for Mobile i18n — both already in package.json dependencies"
  - "French is the default locale (D-06), English secondary via expo-localization auto-detection"
  - "ErrorBoundary class component uses contextType pattern with exported I18nContext"
  - "Card components use useTranslation() inside memo() wrappers"
  - "Locale file sections mirror Dashboard structure: common/auth/nav/cameras/alerts/incidents/chat/sites/settings/guard/notifications/scanner/nfc/photo/errors"
patterns-established:
  - "Screen components: import useTranslation from @/lib/i18n, const { t } = useTranslation()"
  - "Static label arrays: define labelKey outside component, map with t() inside component"
  - "Class components: static contextType = I18nContext, access via this.context?.t() with fallback"
  - "All user-facing strings originate in fr.ts, en.ts provides identical key coverage"
requirements-completed:
  - POL-04
duration: 15 min
completed: 2026-07-17
---

# Phase 05 Plan 05: Mobile i18n Framework Summary

**Complete Mobile i18n framework using expo-localization + i18n-js with French/English locale files, I18nProvider, and migration of all hardcoded French strings from 14 screens and 9 components**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-17T21:19:20Z
- **Completed:** 2026-07-17T21:34:46Z
- **Tasks:** 3
- **Files modified:** 28

## Accomplishments

1. **Created Mobile i18n infrastructure** — locale files (fr.ts, en.ts) with matching key coverage across 14 domain sections (common, auth, nav, home, cameras, alerts, incidents, chat, sites, settings, guard, notifications, scanner, nfc, photo, errors), I18nProvider context using expo-localization auto-detection with French fallback, and barrel export

2. **Migrated all 14 Mobile screens** to use `t()` calls — alerts, cameras, incidents, chat, sites, settings, more, guard index/door-control/qr-checkin/nfc-scan, notifications, login, and home screen. Every hardcoded French user-facing string replaced with `t('section.key')` calls

3. **Migrated all 9 components** — error-boundary (class component via contextType pattern), alert-card, camera-card, mobile-incident-card, door-control-card, org-switcher, qr-scanner, nfc-scanner, photo-capture. Components with no hardcoded strings (stats-card, quick-action-button) were verified and left as-is

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Mobile i18n Infrastructure** — `6d1db05` (feat)
2. **Task 2: Migrate Hardcoded Strings in Screens** — `c0d00d1` (feat)
3. **Task 3: Migrate Hardcoded Strings in Components** — `7e0abcb` (feat)

**Plan metadata:** (pending final summary commit)

_Note: No TDD tasks in this plan._

## Files Created/Modified

- `apps/mobile/lib/i18n/index.ts` - Barrel export for I18nProvider, useTranslation, I18nContext
- `apps/mobile/lib/i18n/context.tsx` - I18nProvider with expo-localization + i18n-js, exports I18nContext for class components
- `apps/mobile/lib/i18n/locales/fr.ts` - French locale dictionary (332 keys, source of truth per D-06)
- `apps/mobile/lib/i18n/locales/en.ts` - English locale dictionary (matching key coverage)
- `apps/mobile/app/_layout.tsx` - Wraps app with I18nProvider (inside ErrorBoundary, outside AuthProvider)
- 14 screen files — all now import and use useTranslation()
- 9 component files — using useTranslation() or contextType pattern

## Decisions Made

- **expo-localization + i18n-js** — Both packages already present in `apps/mobile/package.json`, no install needed. i18n-js provides `I18n` class with dot-notation key resolution, parameter interpolation, and fallback support.
- **French as default locale** — Device locale auto-detected via `ExpoLocalization.getLocales()`. Any non-English locale falls back to French (D-06).
- **ErrorBoundary class component pattern** — Exported `I18nContext` from context.tsx, consumed via `static contextType = I18nContext` with fallback strings in case context isn't available at error time.
- **Static label arrays** — Arrays of `{ labelKey, value }` defined outside components (avoids recreating), mapped inside component with `t(item.labelKey)`.
- **Stats-card and quick-action-button** — Verified to have no hardcoded French strings (all data passed as props). No i18n changes needed.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — all three tasks completed without issues. All existing packages (expo-localization, i18n-js) were already in dependencies.

## Stub Tracking

No stubs found — all locale files have complete key coverage. No placeholder or empty data patterns introduced.

## Threat Flags

None — i18n locale files contain only UI text with no executable code. Packages were already vetted in RESEARCH.md (T-05-09: accept disposition).

## Next Phase Readiness

- Mobile i18n framework complete and operational
- Ready for Plan 06 of Phase 05
- Future Mobile screens must use `const { t } = useTranslation()` pattern for all user-facing strings

---

*Phase: 05-bug-fixing-cross-platform-polish*
*Completed: 2026-07-17*
