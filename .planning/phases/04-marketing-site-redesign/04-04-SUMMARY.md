---
phase: 04-marketing-site-redesign
plan: 04
subsystem: ui
tags: [marketing, landing, hero, glassmorphism, motion, motion, next-intl]
requires:
  - phase: 04-marketing-site-redesign
    plan: 01
    provides: layout components (Section, Container), shared primitives
  - phase: 04-marketing-site-redesign
    plan: 02
    provides: GlassPanel, StatsCounter, AnimatedSection, GradientBorder, Button
provides:
  - 11 landing section components with premium dark aesthetic
  - Animated hero with staggered entrance, grid background, gradient orbs
  - Feature cards in GlassPanel with hover scale effect
  - Animated stats counter section
  - Testimonial cards in glass styling
  - CTA section with GradientBorder accent wrapper
  - i18n-wired components (useTranslations, useLocale)
affects:
  - 04-05 homepage rewrite (consumes these components)
  - UI-SPEC updates (animation and copy verification)
tech-stack:
  added: []
  patterns:
    - Staggered motion entrance with cubic-bezier(0.16,1,0.3,1) easing
    - GlassPanel + GradientBorder for consistent glassmorphism
    - AnimatedSection wrapper for scroll-triggered fade-up (once: true)
    - useTranslations + useLocale for locale-aware CTA links
key-files:
  created: []
  modified:
    - apps/marketing/components/landing/hero-section.tsx
    - apps/marketing/components/landing/ai-grid-background.tsx
    - apps/marketing/components/landing/scroll-indicator.tsx
    - apps/marketing/components/landing/feature-showcase.tsx
    - apps/marketing/components/landing/feature-card.tsx
    - apps/marketing/components/landing/stats-section.tsx
    - apps/marketing/components/landing/ai-highlight-section.tsx
    - apps/marketing/components/landing/testimonial-carousel.tsx
    - apps/marketing/components/landing/testimonial-card.tsx
    - apps/marketing/components/landing/cta-section.tsx
    - apps/marketing/components/landing/trust-bar.tsx
key-decisions:
  - "Used bg-grid CSS class from globals.css for AIGridBackground grid pattern"
  - "AIHighlightSection uses inline gradient border (not GradientBorder component) to avoid bg-[#070912] override in inner div"
  - "TrustBar implemented as async server component using getTranslations from next-intl/server"
  - "FeatureCard and TestimonialCard do not self-animate — they rely on parent AnimatedSection wrappers"
  - "French first text for hardcoded content (testimonials, EyebrowTag, feature list)"
patterns-established:
  - "All landing sections: 'use client' with i18n + locale-based routing"
  - "Server components (AIGridBackground, TrustBar) for non-interactive presentational content"
  - "Stagger delays via index * 0.1 for grid children in AnimatedSection"
requirements-completed: [MKT-01]
duration: 5 min
completed: 2026-07-17
---

# Phase 04 Plan 04: Landing Section Components Rewrite Summary

**Premium dark-theme rewrite of all 11 landing section components with motion stagger animations, glassmorphism panels, animated stats counters, and i18n wiring**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-17T18:59:07Z
- **Completed:** 2026-07-17T19:04:20Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- HeroSection with staggered entrance, EyebrowTag accent pill, locale-aware CTA links, animated AIGridBackground with gradient orbs, and bouncing ScrollIndicator
- FeatureShowcase grid (3-column responsive) with 6 FeatureCards in GlassPanel with hover scale effect
- StatsSection with animated StatsCounter (99.9%, 150+, 100%) and static "24/7" label
- AIHighlightSection with 2-column layout, gradient-bordered platform mockup, and cyan check feature list
- TestimonialCarousel as 3-column grid of glass-styled TestimonialCards with French testimonials
- CTASection with GradientBorder wrapper and dual CTA buttons
- TrustBar as lightweight server component with i18n trust text
- All interactive sections wrapped in AnimatedSection for scroll-triggered fade-up animations
- TypeScript compilation passing with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite HeroSection + AIGridBackground + ScrollIndicator** - `0095f07` (feat)
2. **Task 2: Rewrite FeatureShowcase + FeatureCard + StatsSection** - `5091302` (feat)
3. **Task 3: Rewrite AIHighlight + TestimonialCarousel + TestimonialCard + CTASection + TrustBar** - `7cbbeff` (feat)
4. **TypeScript fix: FeatureShowcase LucideIcon array typing** - `700d899` (fix)

## Files Modified
- `apps/marketing/components/landing/hero-section.tsx` - Premium hero with EyebrowTag, staggered motion, dual CTAs, AIGridBackground, ScrollIndicator
- `apps/marketing/components/landing/ai-grid-background.tsx` - Server component with bg-grid, gradient fade, cyan/blue orbs
- `apps/marketing/components/landing/scroll-indicator.tsx` - Client component with looping bounce animation
- `apps/marketing/components/landing/feature-showcase.tsx` - 3-column responsive grid with i18n FeatureCards
- `apps/marketing/components/landing/feature-card.tsx` - GlassPanel wrapper with cyan icon container
- `apps/marketing/components/landing/stats-section.tsx` - Animated StatsCounter grid with gradient background
- `apps/marketing/components/landing/ai-highlight-section.tsx` - 2-column layout with gradient-bordered mockup
- `apps/marketing/components/landing/testimonial-carousel.tsx` - 3-column grid of glass testimonial cards
- `apps/marketing/components/landing/testimonial-card.tsx` - GlassPanel with quote, author avatar, metadata
- `apps/marketing/components/landing/cta-section.tsx` - GradientBorder wrapper with dual action buttons
- `apps/marketing/components/landing/trust-bar.tsx` - Server component trust text

## Decisions Made
- **bg-grid CSS class**: Used existing globals.css utility for grid pattern instead of inline styles
- **GradientBorder component**: AIHighlight uses inline gradient border (same visual) to avoid bg color mismatch from GradientBorder's hardcoded `bg-[#070912]` inner div
- **Server vs client**: AIGridBackground and TrustBar implemented as server components (no interactivity); HeroSection, FeatureShowcase, FeatureCard, StatsSection, AIHighlightSection, TestimonialCarousel, TestimonialCard, CTASection, ScrollIndicator are client components (motion animations + i18n hooks)
- **French-first content**: Hardcoded strings (EyebrowTag, testimonials, AI feature list) written in French per D-18

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- **TypeScript error** in feature-showcase.tsx: `LucideIcon | undefined` not assignable to `LucideIcon` prop — fixed by adding explicit `as LucideIcon` cast and proper type imports
- **AIGridBackground verification**: Initial inline grid style didn't match plan's `bg-grid` grep pattern — switched to using existing globals.css `bg-grid` class

## Self-Check: PASSED
- `pnpm --filter @repo/marketing check-types` passes (zero errors)
- All 11 landing section files exist and are modified
- Each section uses AnimatedSection or motion animations
- FeatureCard wraps content in GlassPanel with hover effect
- StatsSection uses StatsCounter for animated numbers
- CTASection uses GradientBorder wrapper
- Hero has staggered entrance with motion animations (delays 0s, 0.15s, 0.3s, 0.5s)
- All commits present in git log

## Next Phase Readiness
- All 11 landing section components ready for Plan 04-05 (homepage rewrite)
- Components are self-contained with i18n props — homepage can compose them immediately
- No blockers — type checking passes, all acceptance criteria met
