---
phase: 04-marketing-site-redesign
plan: 10
subsystem: ui
tags: demo, interactive-tour, next-intl, motion, glassmorphism

requires:
  - phase: 04-03
    provides: shared components (GlassPanel, Button with glass variant)
  - phase: 04-06
    provides: i18n demo keys across all 6 locales

provides:
  - Interactive demo tour on /demo with 5-step clickable narrative

affects: []

tech-stack:
  added: []
  patterns:
    - Client-side state-based tour with AnimatePresence step transitions
    - Polished mockup placeholders (JSX divs styled as Dashboard UI) instead of static images per D-11
    - Step-specific mockup content reflecting narrative progression

key-files:
  created:
    - apps/marketing/components/demo/demo-step.tsx
    - apps/marketing/components/demo/demo-tour.tsx
    - apps/marketing/app/[locale]/demo/page.tsx
  modified: []

key-decisions:
  - Mockup placeholders rendered as styled JSX divs (not external images) for easy maintenance and no asset dependencies
  - Step tooltips positioned per step config (top-right, bottom-left, top-left, bottom-right) to avoid overlap with mockup focal areas
  - Decorative start screen preview mockup with GlassPanel wrapper to show non-interactive glimpse of what the tour looks like

patterns-established:
  - "Demo tour pattern: DemoTour state container → DemoStep per step → mockup placeholders with GlassPanel tooltip overlays"
  - "Step navigation: Previous/Next buttons + clickable indicator dots + step counter label"

requirements-completed: [MKT-04]

duration: 18 min
completed: 2026-07-17
---

# Phase 04 Plan 10: Interactive Demo Tour Summary

**Clickable screenshot tour on `/demo` with a 5-step end-to-end security narrative — access event → video correlation → AI analysis → alert dispatch → resolution**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-17T19:09:00Z
- **Completed:** 2026-07-17T19:27:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- **DemoStep component** — reusable step renderer with step-specific mockup placeholders (styled JSX representations of Dashboard UI), overlay tooltip positioned per step configuration, and AnimatePresence-driven smooth transitions between steps
- **DemoTour component** — stateful tour container with start screen (heading, subheading, "Lancer la visite" CTA with Play icon, decorative preview mockup), 5-step navigation (Previous/Next/step indicator dots/step counter), automatic restart on last step, all labels driven by i18n
- **Demo page** — server component at `/[locale]/demo/page.tsx` with proper `generateStaticParams`, `generateMetadata` (French titles/descriptions), and Header + DemoTour + Footer composition
- **Mockup content** — each of the 5 narrative steps has unique visual content inside the mockup placeholder reflecting the story progression (badge scan interface, video feed with correlation panel, AI bounding box overlay, alert dispatch list, resolution timeline with report summary)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DemoStep component** - `0e0c453` (feat)
2. **Task 2: Create DemoTour component + Demo page** - `53e45d9` (feat)

**Plan metadata:** `pending (metadata commit after SUMMARY verification)`

## Files Created

- `apps/marketing/components/demo/demo-step.tsx` — Individual tour step with mockup placeholder and tooltip overlay (376 lines)
- `apps/marketing/components/demo/demo-tour.tsx` — Stateful tour container with start screen, 5-step navigation, and i18n labels (192 lines)
- `apps/marketing/app/[locale]/demo/page.tsx` — Demo page with metadata, Header, DemoTour, and Footer (75 lines)

## Deviations from Plan

None — plan executed exactly as written.

## Verified

- ✅ `demo-step.tsx` exists with GlassPanel, AnimatePresence, and tooltipPosition usage
- ✅ `demo-tour.tsx` exists with DemoStep, DEMO_STEPS array (5 steps), currentStep state
- ✅ `page.tsx` exists with generateStaticParams and generateMetadata
- ✅ All 5 narrative steps present (access-event through resolution)
- ✅ TypeScript `check-types` passes cleanly
- ✅ `next build` compiles successfully — 65 static pages generated

## Self-Check: PASSED

- All 3 created files confirmed on disk
- Both commit hashes verified in git log
- Build compiles successfully (65 static pages)
- TypeScript check passes cleanly

---

*Phase: 04-marketing-site-redesign*
*Completed: 2026-07-17*
