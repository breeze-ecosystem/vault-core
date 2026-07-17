---
phase: 04-marketing-site-redesign
plan: 02
subsystem: ui
tags: glassmorphism, shared-components, motion, cva, animated-section, stats-counter

# Dependency graph
requires:
  - phase: 04-marketing-site-redesign
    provides: 04-01 (CSS variables, fonts, noise texture body::after)
provides:
  - GlassPanel reusable glassmorphism card component
  - GradientBorder animated gradient border wrapper
  - EyebrowTag pill badge with default/accent variants
  - NoiseOverlay fixed-position grain texture component
  - StatsCounter animated counter using motion animate
  - Button glass variant for dark-on-dark CTA usage
  - AnimatedSection motion whileInView rewrite with premium easing
affects: 04-03, 04-04, 04-05, 04-06, 04-07, 04-08, 04-09, 04-10

# Tech tracking
tech-stack:
  added: []
  patterns:
    - GlassPanel component uses backdrop-blur-xl with semi-transparent white bg
    - GradientBorder uses p-px bounding box with inner solid fill
    - StatsCounter uses motion animate() with cubic-bezier(0.16, 1, 0.3, 1)
    - AnimatedSection uses <motion.div> whileInView with viewport once:true

key-files:
  created:
    - apps/marketing/components/shared/glass-panel.tsx
    - apps/marketing/components/shared/gradient-border.tsx
    - apps/marketing/components/shared/eyebrow-tag.tsx
    - apps/marketing/components/shared/noise-overlay.tsx
    - apps/marketing/components/shared/stats-counter.tsx
  modified:
    - apps/marketing/components/ui/button.tsx
    - apps/marketing/components/ui/animated-section.tsx
    - apps/marketing/app/globals.css

key-decisions:
  - "NoiseOverlay uses a CSS utility class (.noise-overlay::before) added to globals.css since Plan 04-01 used body::after instead of the expected class"
  - "AnimatedSection uses motion[Tag] dynamic component mapping for 'as' prop support"
  - "StatsCounter uses motion animate(0, value) for GPU-accelerated count-up animation"
  - "Button glass variant matches GlassPanel aesthetic: backdrop-blur-xl, border-white/10, hover intensifies"

patterns-established:
  - "Shared components in apps/marketing/components/shared/ follow 'use client' pattern for interactive, server for static"
  - "All shared components use named exports (not default)"
  - "Glass aesthetic tokens are centralized: backdrop-blur-xl, border-white/[0.06], bg-white/[0.03]"

requirements-completed: [MKT-01]

# Metrics
duration: 2min
completed: 2026-07-17
---

# Phase 04 Plan 02: Shared Design Component Library Summary

**GlassPanel, GradientBorder, EyebrowTag, NoiseOverlay, StatsCounter shared components + Button glass variant + AnimatedSection motion rewrite**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-17T18:54:00Z
- **Completed:** 2026-07-17T18:56:20Z
- **Tasks:** 2 (of 2)
- **Files modified:** 8

## Accomplishments
- Created 5 reusable shared components: GlassPanel (glassmorphism card), GradientBorder (gradient border wrapper), EyebrowTag (pill badge), NoiseOverlay (grain texture), StatsCounter (animated count-up)
- Added `glass` variant to Button component with backdrop-blur-2xl semi-transparent styling
- Rewrote AnimatedSection from CSS-transition approach to `<motion.div>` `whileInView` with premium `cubic-bezier(0.16, 1, 0.3, 1)` easing and configurable delay
- All components pass TypeScript type checking with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: GlassPanel, GradientBorder, EyebrowTag, NoiseOverlay** - `0b25fe7` (feat)
2. **Task 2: StatsCounter + Button glass variant + AnimatedSection rewrite** - `9f633ec` (feat)

**Plan metadata:** (committed in next step)

## Files Created/Modified
- `apps/marketing/components/shared/glass-panel.tsx` - Reusable glassmorphism card with backdrop-blur-xl, hover scale effect, optional `as` tag
- `apps/marketing/components/shared/gradient-border.tsx` - Wrapper with cyan gradient border via p-px technique
- `apps/marketing/components/shared/eyebrow-tag.tsx` - Pill-shaped badge with `default` (white/5 bg) and `accent` (cyan-500/10 bg) variants
- `apps/marketing/components/shared/noise-overlay.tsx` - Fixed grain texture overlay using `.noise-overlay` CSS class
- `apps/marketing/components/shared/stats-counter.tsx` - Animated counter using `motion.animate()` from 0 to target value on scroll

### Modified
- `apps/marketing/components/ui/button.tsx` - Added `glass` variant with backdrop-blur-xl, border-white/[0.10], hover intensification
- `apps/marketing/components/ui/animated-section.tsx` - Rewritten to use `<motion.div>` `whileInView`, dropped CSS transition approach, added `delay` prop
- `apps/marketing/app/globals.css` - Added `.noise-overlay::before` utility class for NoiseOverlay component

## Decisions Made
- **NoiseOverlay CSS approach**: Added `.noise-overlay::before` pseudo-element CSS class to globals.css since Plan 04-01 implemented the noise as `body::after` rather than the anticipated class. The `::before` pattern matches the existing `body::after` approach.
- **AnimatedSection dynamic motion tag**: Uses `motion[Tag as keyof typeof motion]` to support the `as` prop (`'section' | 'div'`) while leveraging motion's whileInView API.
- **StatsCounter animation pattern**: Uses `motion`'s `animate()` function (not `useAnimate`) for imperative number animation from 0 to value, with `useInView` as the trigger and `once: true` to prevent re-animation.
- **Button glass variant tokens**: Kept consistent with GlassPanel aesthetic tokens (`backdrop-blur-xl`, `border-white/[0.10]`, `bg-white/[0.05]`) for visual consistency across the premium design system.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added .noise-overlay CSS class to globals.css**
- **Found during:** Task 1 (Creating NoiseOverlay component)
- **Issue:** Plan 04-01 implemented the site noise texture as `body::after` pseudo-element in globals.css. Plan 04-02's NoiseOverlay component references a `.noise-overlay` CSS class that does not exist, making the component non-functional.
- **Fix:** Added `.noise-overlay::before` utility class to globals.css with the same SVG noise texture (opacity 0.03) used by the `body::after` approach.
- **Files modified:** `apps/marketing/app/globals.css`
- **Verification:** NoiseOverlay component renders with `noise-overlay` class, CSS class exists and applies noise texture.
- **Committed in:** `0b25fe7` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Minor — one-line CSS class addition. Required for NoiseOverlay component to render visible grain texture. No scope creep.

## Issues Encountered

None - all verifications passed, TypeScript check clean.

## Next Phase Readiness

- Shared design component library complete. All 5 components (GlassPanel, GradientBorder, EyebrowTag, NoiseOverlay, StatsCounter) ready for use by landing sections, product pages, solutions pages, case studies, and demo tour.
- Button updated with glass variant for dark-on-dark CTA usage.
- AnimatedSection now uses motion whileInView with premium easing — all landing sections will benefit from the scroll-triggered fade-up effect.
- Ready for Plan 03 (homepage landing sections consuming these shared components).

---

## Self-Check: PASSED

All 8 files confirmed on disk. Both commits verified in git log. TypeScript type check passes with zero errors.

---

*Phase: 04-marketing-site-redesign*
*Completed: 2026-07-17*
