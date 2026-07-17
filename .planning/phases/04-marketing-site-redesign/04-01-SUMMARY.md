---
phase: 04-marketing-site-redesign
plan: 01
subsystem: ui
tags: css-variables, tailwind, fonts, design-tokens, dark-theme, inter, plus-jakarta-sans, jetbrains-mono

# Dependency graph
requires:
  - phase: 04-marketing-site-redesign
    provides: 04-CONTEXT.md, 04-RESEARCH.md, 04-UI-SPEC.md
provides:
  - Dark-only CSS variables with deep navy background (#070912)
  - Inter (body) + Plus Jakarta Sans (headings) + JetBrains Mono (code) font stack
  - Updated Tailwind config with new font families, display/heading sizes
  - Updated marketing design tokens for dark premium theme
  - Noise texture overlay on all pages
  - Section/Container/PageHeader components updated for dark theme
affects: 04-02, 04-03, 04-04, 04-05, 04-06, 04-07, 04-08, 04-09, 04-10

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Font loading via next/font/google with CSS variables
    - Dark-only CSS variable strategy (no light mode, no darkMode media query)
    - Noise texture via fixed body::after pseudo-element with SVG filter
    - Section component uses hardcoded bg-[#070912] for dominant background

key-files:
  created: []
  modified:
    - apps/marketing/app/globals.css
    - apps/marketing/tailwind.config.ts
    - packages/design/src/marketing.ts
    - apps/marketing/app/[locale]/layout.tsx
    - apps/marketing/components/layout/section.tsx
    - apps/marketing/components/ui/page-header.tsx

key-decisions:
  - "Dark-only theme: removed light-mode CSS variables entirely, removed darkMode config from tailwind"
  - "Font self-hosting: switched from Google Fonts @import to next/font/google for privacy and performance"
  - "Removed IBM Plex Sans completely in favor of Inter (body) + Plus Jakarta Sans (headings)"
  - "design/src/marketing.ts tokens updated to reflect the dark premium theme palette"
  - "Container component left unchanged (max-w-7xl = 1280px matches --marketing-container)"

patterns-established:
  - "CSS variables use HSL with dark-only values — no light mode variables"
  - "Fonts loaded via next/font/google with CSS variable injection on html element"
  - "Section component defaults to #070912 (dominant) background with py-24 vertical spacing"
  - "Noise overlay is a fixed position body::after pseudo-element, GPU-friendly"

requirements-completed: [MKT-01]

# Metrics
duration: 2min
completed: 2026-07-17
---

# Phase 04 Plan 01: Visual Foundation Summary

**Dark-only CSS variables, Inter/PJS/JB Mono font stack via next/font/google, updated Tailwind config and design tokens, Section/PageHeader dark theme components**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-17T18:50:35Z
- **Completed:** 2026-07-17T18:53:27Z
- **Tasks:** 2 (of 2)
- **Files modified:** 6

## Accomplishments
- Rewrote `globals.css` with dark-only HSL CSS variables, noise texture body::after, cyan grid background
- Updated `tailwind.config.ts`: removed darkMode, added Inter/PJS/JB Mono font families, 56px display + 32px heading sizes
- Updated `packages/design/src/marketing.ts` with dark premium theme colors (card #1a2332, text #f1f5f9, hero bg gradient)
- Added font loading via `next/font/google` in layout.tsx with CSS variable injection on `<html>` element
- Updated Section component variant styles to dark-only backgrounds (#070912 default, #0c1020 alt)
- Updated PageHeader to use `font-display` for headings and `text-foreground` for color
- Verified container.tsx — max-w-7xl (1280px) matches --marketing-container, no changes needed

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite globals.css + tailwind.config.ts + design tokens** - `1236db6` (feat)
2. **Task 2: Font loading in layout.tsx + Section/Container/PageHeader updates** - `1ce9aa8` (feat)

**Plan metadata:** (committed in next step)

## Files Created/Modified
- `apps/marketing/app/globals.css` - Dark-only CSS variables, noise texture, cyan grid, scrollbar, reduced-motion
- `apps/marketing/tailwind.config.ts` - New fonts (Inter/PJS/JB Mono), display/heading sizes, removed darkMode
- `packages/design/src/marketing.ts` - Dark premium theme colors, updated typography/spacing
- `apps/marketing/app/[locale]/layout.tsx` - Font loading via next/font/google with CSS variables
- `apps/marketing/components/layout/section.tsx` - Dark-only variant backgrounds
- `apps/marketing/components/ui/page-header.tsx` - font-display for headings, text-foreground color

## Decisions Made
- **Dark-only theme**: Removed light-mode CSS variables entirely. No `darkMode` config needed since all pages are always dark. Tailwind class-based dark mode not needed.
- **Font self-hosting**: Switched from Google Fonts `@import` to `next/font/google` for build-time self-hosting — better privacy (no CDN requests from clients), better performance (no render-blocking CSS).
- **IBM Plex Sans replaced**: Body text uses Inter (400/600), headings use Plus Jakarta Sans (400/600), code uses JetBrains Mono (400/500/600).
- **Container unchanged**: `max-w-7xl` = 1280px which matches `--marketing-container: 1280px`. No changes needed.
- **Section spacing kept**: `py-24 md:py-32` preserved from existing marketing.ts tokens.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all verifications passed, TypeScript check and Next.js build succeed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Visual foundation complete: CSS variables, font stack, Tailwind config, design tokens, section/page-header components are ready.
- Ready for Plan 02 (Header/Footer/Button/AnimatedSection component updates) and Plan 03 (homepage sections).
- All existing pages (blog, pricing, contact) continue to work — verified via successful build of all 29 static pages.

---

## Self-Check: PASSED

All 6 modified files confirmed on disk. Both commits verified in git log.

---

*Phase: 04-marketing-site-redesign*
*Completed: 2026-07-17*
