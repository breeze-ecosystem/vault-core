---
phase: 04-marketing-site-redesign
plan: 03
subsystem: ui
tags: [header, footer, navigation, mobile-menu, i18n, glassmorphism, dark-theme, nav-link, language-switcher]

requires:
  - phase: 04-marketing-site-redesign
    plan: 01
    provides: Dark-only CSS variables, new font stack, Tailwind config, design tokens
provides:
  - Glass sticky header with i18n-driven nav links and scroll-based backdrop-blur transition
  - Dark footer with 4-column link structure (Produit, Ressources, Entreprise, Légal) and glass gradient divider
  - Full-screen mobile menu with staggered motion animations
  - Active-aware NavLink with cyan-400 underline indicator and isExternal support
  - Dark-themed LanguageSwitcher with glass-appropriate backgrounds
affects: [04-04, 04-05, 04-06, 04-07, 04-08, 04-09, 04-10]

tech-stack:
  added: []
  patterns:
    - i18n-driven nav links via useTranslations('nav') instead of hardcoded NAV_LINKS
    - Glass sticky nav with scroll detection (100px threshold)
    - Full-screen overlay mobile menu with AnimatePresence + staggered motion
    - After pseudo-element underline animation for active nav indicator

key-files:
  created: []
  modified:
    - apps/marketing/components/layout/header.tsx
    - apps/marketing/components/layout/footer.tsx
    - apps/marketing/components/layout/mobile-menu.tsx
    - apps/marketing/components/navigation/nav-link.tsx
    - apps/marketing/components/navigation/language-switcher.tsx
    - apps/marketing/messages/ar.json
    - apps/marketing/messages/de.json
    - apps/marketing/messages/en.json
    - apps/marketing/messages/es.json
    - apps/marketing/messages/fr.json
    - apps/marketing/messages/ja.json

key-decisions:
  - "Nav keys follow French-first naming (tarifs, etudesDeCas) even in English locale — keys reference the French breadcrumb, values provide localized labels"
  - "MobileMenu uses same NAV_ITEMS structure as Header (DRY via component-level const array)"
  - "Button component reused via buttonVariants utility (Link + className) instead of nesting Link inside Button for clean HTML semantics"
  - "Nav message keys added to all 6 locales ahead of Plan 04-06 to support header/footer operation"

patterns-established:
  - "i18n nav: define message keys in nav.* namespace, consume via useTranslations('nav')"
  - "Sticky glass: fixed positioning + scroll event (passive) + class toggle for backdrop-blur-2xl"
  - "Mobile overlay: AnimatePresence wrapping full-screen backdrop-blur-3xl with staggered link entrance"

requirements-completed: [MKT-01]

duration: 4 min
completed: 2026-07-17
---

# Phase 04: Marketing Site Redesign — Plan 03 Summary

**Glass sticky header with i18n-driven nav links, dark footer with 4-column layout, full-screen mobile overlay with staggered motion, and restyled NavLink/LanguageSwitcher**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-17T18:59:04Z
- **Completed:** 2026-07-17T19:03:11Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Header rewritten: fixed glass sticky nav with `bg-black/60 backdrop-blur-2xl` on scroll, i18n-driven nav links (Produits, Solutions, Études de cas, Démo, Blog, Tarifs), "Réserver une démo" CTA via Button component, white hamburger lines for dark theme
- Footer rewritten: dark `bg-[#070912]` with subtle glass border, 4-column grid (Produit, Ressources, Entreprise, Légal) with French labels, gradient glass divider, LanguageSwitcher in bottom bar
- MobileMenu rewritten: full-screen overlay with `AnimatePresence` and staggered `motion.div` entrance animations, i18n-driven nav items, CTA button, and LanguageSwitcher
- NavLink updated: cyan-400 active text with after:underline animation, white/70 inactive text with hover state, added `isExternal` prop
- LanguageSwitcher restyled: glass-appropriate backgrounds (`bg-white/5`, `border-white/10`), cyan focus ring, dark option backgrounds
- Nav i18n keys added to all 6 locale files for consistent multilingual navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite Header component** - `cca4972` (feat)
2. **Task 2: Rewrite Footer component** - `d96ec71` (feat)
3. **Task 3: Rewrite MobileMenu + update NavLink + restyle LanguageSwitcher** - `16d607a` (feat)

**Plan metadata:** (no separate metadata commit — tasks cover all changes)

## Files Created/Modified

- `apps/marketing/components/layout/header.tsx` - Glass sticky nav with i18n-driven links, scroll detection, CTA button
- `apps/marketing/components/layout/footer.tsx` - Dark footer with 4-column layout, glass divider, LanguageSwitcher
- `apps/marketing/components/layout/mobile-menu.tsx` - Full-screen overlay with AnimatePresence, staggered motion animations
- `apps/marketing/components/navigation/nav-link.tsx` - Active underline indicator, dark theme colors, isExternal prop
- `apps/marketing/components/navigation/language-switcher.tsx` - Dark theme styling with glass background and cyan focus
- `apps/marketing/messages/ar.json` - Added nav keys (produits, solutions, etudesDeCas, demo, blog, tarifs)
- `apps/marketing/messages/de.json` - Added nav keys (produits, solutions, etudesDeCas, demo, blog, tarifs)
- `apps/marketing/messages/en.json` - Added nav keys (produits, solutions, etudesDeCas, demo, blog, tarifs)
- `apps/marketing/messages/es.json` - Added nav keys (produits, solutions, etudesDeCas, demo, blog, tarifs)
- `apps/marketing/messages/fr.json` - Added nav keys (produits, solutions, etudesDeCas, demo, blog, tarifs)
- `apps/marketing/messages/ja.json` - Added nav keys (produits, solutions, etudesDeCas, demo, blog, tarifs)

## Decisions Made

- **French-first nav key naming**: Keys follow French breadcrumb (tarifs, etudesDeCas) even though values are locale-appropriate. This keeps key names stable across all locales while values differ.
- **buttonVariants pattern**: Used `Link` with `buttonVariants({ variant, size })` className instead of wrapping Link around Button component — avoids invalid `<a><button>` HTML nesting.
- **Nav keys added early**: Nav i18n keys added to all 6 locales ahead of Plan 04-06 (which adds general content keys) to support header/footer operation. These are the minimum keys needed for navigation chrome.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **Pre-existing TypeScript errors**: `pnpm --filter @repo/marketing check-types` reports two pre-existing errors in files from Plan 04-04 (`ai-highlight-section.tsx` — unused GradientBorder import; `feature-showcase.tsx` — LucideIcon type mismatch). These are not caused by this plan's changes. The errors existed before this plan's work began.

## Known Stubs

None — all navigation chrome components are fully implemented with real i18n data sources.

## Threat Flags

None — presentational components only. No new network endpoints, auth paths, or data access patterns introduced.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Navigation chrome (header, footer, mobile menu) is complete and ready for all page plans (04-04 through 04-10) to compose without further modification.
- Nav link i18n keys defined and populated across all 6 locales.
- Ready for Plan 04-04 (homepage hero and feature sections).

---

*Phase: 04-marketing-site-redesign*
*Completed: 2026-07-17*
