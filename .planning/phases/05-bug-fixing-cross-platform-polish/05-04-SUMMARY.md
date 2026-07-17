---
phase: 05-bug-fixing-cross-platform-polish
plan: 04
subsystem: mobile
tags: [design-tokens, flash-list, react-memo, sentry, reconciliation, performance]

# Dependency graph
requires:
  - phase: 05-bug-fixing-cross-platform-polish
    provides: Reconciled design tokens via @repo/design from earlier phases
provides:
  - Mobile theme.ts reconciled with @repo/design canonical tokens (colors, typography, spacing)
  - 5 list screens converted to FlashList for 60fps scrolling performance
  - 5 card components wrapped with React.memo for render optimization
  - Sentry crash reporting finalized with safe DSN fallback
affects: [05-bug-fixing-cross-platform-polish (verification phase)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - FlashList for all paginated list screens (replaces ScrollView/FlatList)
    - React.memo on list-rendered card components
    - Design token import from @repo/design with flattened backward compat
    - Safe Sentry init with DSN-conditional enabled flag

key-files:
  created: []
  modified:
    - apps/mobile/lib/theme.ts (reconciled with @repo/design)
    - apps/mobile/app/_layout.tsx (migrated to @repo/design, Sentry enabled flag)
    - apps/mobile/app/(tabs)/alerts.tsx (FlashList conversion)
    - apps/mobile/app/(tabs)/cameras.tsx (FlashList conversion)
    - apps/mobile/app/(tabs)/incidents.tsx (FlashList conversion)
    - apps/mobile/app/(tabs)/sites.tsx (FlashList conversion)
    - apps/mobile/app/(tabs)/guard/door-control.tsx (FlashList conversion)
    - apps/mobile/components/alert-card.tsx (React.memo)
    - apps/mobile/components/camera-card.tsx (React.memo)
    - apps/mobile/components/mobile-incident-card.tsx (React.memo)
    - apps/mobile/components/door-control-card.tsx (React.memo)
    - apps/mobile/components/stats-card.tsx (React.memo)

key-decisions:
  - "theme.ts maintains flattened backward-compatible color export from @repo/design to avoid rewriting all flat-access screens"
  - "Transitional typography aliases (h1/h2/h3/caption/small) kept for backward compat while base values come from @repo/design"
  - "Sentry init uses enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN to prevent crash in dev without DSN configured"

patterns-established:
  - "Mobile screens import canonical design tokens from @repo/design (nested access) OR from @/lib/theme (flat compat)"
  - "FlashList replaces ScrollView/FlatList for all list screens with estimatedItemSize per screen type"
  - "Card components in lists are wrapped with React.memo to prevent unnecessary re-renders"
  - "Sentry init guarded with enabled flag for safe development without DSN"

requirements-completed: [POL-03]

# Metrics
duration: 8 min
completed: 2026-07-17
---

# Phase 5 Plan 4: Mobile Design Tokens, FlashList, Sentry Summary

**Reconciled Mobile theme.ts with @repo/design canonical tokens, converted 5 list screens to FlashList, wrapped 5 card components with React.memo, and finalized Sentry crash reporting with safe DSN fallback**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-17T21:09:00Z
- **Completed:** 2026-07-17T21:16:44Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- Reconciled `apps/mobile/lib/theme.ts` — colors, typography, spacing now sourced from `@repo/design` (canonical). Diverged values eliminated (bg: `#0a0e17` → `#070912`, surface: `#111827` → `#0c1020`, spacing.xl: `20` → `32`, spacing.xxl: `24` → `48`)
- Migrated `_layout.tsx` from `@/lib/theme` to `@repo/design` with correct nested color access pattern
- Converted 5 list screens from ScrollView/FlatList to FlashList for 60fps scrolling performance
- Wrapped 5 card components (AlertCard, CameraCard, MobileIncidentCard, DoorControlCard, StatsCard) with React.memo
- Added safe `enabled` flag to Sentry.init to prevent crash when EXPO_PUBLIC_SENTRY_DSN is not configured

## Task Commits

Each task was committed atomically:

1. **Task 1: Reconcile theme.ts with @repo/design** - `c1ddbb8` (feat)
2. **Task 2: Convert list screens to FlashList + React.memo** - `7f90c13` (perf)
3. **Task 3: Complete Sentry integration** - `cf8e2b8` (feat)

**Plan metadata:** `pending`

## Files Created/Modified

- `apps/mobile/lib/theme.ts` — Re-imports colors/typography/spacing from @repo/design, provides flattened backward-compatible exports, keeps mobile-specific (borderRadius, createStyles)
- `apps/mobile/app/_layout.tsx` — Import source changed to @repo/design, color references updated to nested pattern, Sentry.init gets `enabled` flag
- `apps/mobile/app/(tabs)/alerts.tsx` — ScrollView → FlashList with ListHeaderComponent, estimatedItemSize=120
- `apps/mobile/app/(tabs)/cameras.tsx` — ScrollView → FlashList, estimatedItemSize=140
- `apps/mobile/app/(tabs)/incidents.tsx` — FlatList → FlashList, estimatedItemSize=120
- `apps/mobile/app/(tabs)/sites.tsx` — ScrollView → FlashList with renderItem function, estimatedItemSize=120
- `apps/mobile/app/(tabs)/guard/door-control.tsx` — FlatList → FlashList, estimatedItemSize=160
- `apps/mobile/components/alert-card.tsx` — `export function` → `export const ... = memo(function ...)`
- `apps/mobile/components/camera-card.tsx` — Same React.memo wrapper
- `apps/mobile/components/mobile-incident-card.tsx` — Same React.memo wrapper
- `apps/mobile/components/door-control-card.tsx` — Same React.memo wrapper
- `apps/mobile/components/stats-card.tsx` — Same React.memo wrapper

## Decisions Made

- **Flattened backward compat for theme.ts:** Instead of force-migrating 14 screens to `@repo/design`'s nested color access pattern (`colors.dark.bg`, `colors.shared.primary`), theme.ts provides flat re-exports from the canonical source. This resolves divergence while preventing hundreds of individual color reference edits. Screens that already use `@repo/design` (index.tsx, more.tsx, quick-action-button.tsx, mobile-incident-card.tsx) continue with the nested pattern.
- **Transitional typography aliases:** The extra keys (h1/h2/h3/caption/small) are kept as computed aliases from the canonical 4-size scale. This maintains backward compat while ensuring base values match @repo/design.
- **Sentry safe init:** `enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN` pattern prevents runtime crashes during development when the DSN env var is not set.

## Deviations from Plan

None - plan executed as written.

### Deviations Details

- **Note on import migration:** Plan suggested migrating all `@/lib/theme` imports to `@repo/design` for screens using flat color access. This was determined to be unsafe without also rewriting all color references (dozens per file × 14 files). Per plan guidance: "Do NOT force-migrate ALL files to @repo/design imports in this task if it causes import errors." Only `_layout.tsx` was migrated (its flat color references were converted to nested access).

## Issues Encountered

None — all planned work completed successfully without issues.

## User Setup Required

None — no external service configuration required. Sentry DSN configuration is optional for development (Sentry no-ops when DSN is absent).

## Next Phase Readiness

Ready for Phase 5 Plan 5 execution. Mobile design tokens are now reconciled with @repo/design, list performance is optimized, and Sentry crash reporting is finalized.

## Self-Check: PASSED

All 7 key files confirmed on disk. All 3 task commits confirmed in git log.

---

*Phase: 05-bug-fixing-cross-platform-polish*
*Completed: 2026-07-17*
