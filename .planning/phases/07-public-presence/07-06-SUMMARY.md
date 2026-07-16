---
phase: 07-public-presence
plan: 06
subsystem: ui
tags: [pricing, nextjs, marketing, ssg, json-ld, seo]
requires:
  - phase: 07-public-presence
    plan: 04
    provides: Marketing site layout components (Header, Footer, Section, Container, AnimatedSection, PageHeader)
  - phase: 07-public-presence
    plan: 05
    provides: UI primitives (Button, Badge), landing components (CTASection)
provides:
  - Pricing page at /[locale]/pricing with SSG for 6 locales
  - 3-tier pricing card layout (Starter, Professional, Enterprise)
  - Feature comparison table with sticky header and grouped rows
  - Accordion FAQ with native HTML details/summary elements
  - FAQPage JSON-LD structured data for SEO
affects:
  - 07-08 (Contact page — pricing CTAs link to contact)
  - 07-09 (SEO verification — structured data audit)
tech-stack:
  added: []
  patterns:
    - Native HTML details/summary for accordion FAQ with CSS group-open modifier
    - Lucide Check icon for feature availability indicators
    - Sticky table header using Tailwind sticky utility
key-files:
  created:
    - apps/marketing/components/pricing/pricing-tier-data.ts
    - apps/marketing/components/pricing/pricing-card.tsx
    - apps/marketing/components/pricing/feature-comparison-table.tsx
    - apps/marketing/components/pricing/faq-section.tsx
    - apps/marketing/app/[locale]/pricing/page.tsx
  modified: []
key-decisions:
  - "Used license tier limits matching Phase 5 license claim structure (cameras, doors, users)"
  - "All three tiers include 'Contact us for pricing' (no Stripe checkout per D-01)"
  - "Professional card gets ring-cyan glow and translateY elevation as visual highlight"
  - "Feature comparison rows grouped into 5 categories: Platform Limits, AI & Analytics, Integrations, Security & Compliance, Support"
requirements-completed: [WEB-02, WEB-08]
duration: 2min
completed: 2026-07-16
---

# Phase 7: Public Presence — Plan 06 Summary

**3-tier pricing cards (Starter, Professional, Enterprise) with "Most Popular" badge, feature comparison table, and accordion FAQ — statically generated for 6 locales**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-16T00:57:04Z
- **Completed:** 2026-07-16T00:59:24Z
- **Tasks:** 3
- **Files modified:** 5 (all created)

## Accomplishments

- **Pricing tier data** — `TierData` interface and `tiers` array with Starter, Professional (Most Popular), and Enterprise tiers, each with device limits, feature lists, and CTA labels
- **PricingCard component** — White card with feature checkmarks (Lucide Check), CTA button, and AnimatedSection entrance stagger; Professional card highlighted with ring-cyan border and shadow-glow
- **Feature comparison table** — 5 grouped categories (Platform Limits, AI & Analytics, Integrations, Security & Compliance, Support) with ✓/— indicators and sticky header on scroll
- **FAQ accordion** — 7 questions using native HTML `<details>/<summary>` elements with CSS group-open chevron rotation, covering pricing, trial, deployment, support, customization, compliance, and migration
- **Pricing page composition** — SSG via generateStaticParams for 6 locales, composing Header, PageHeader, 3 PricingCards in responsive grid, FeatureComparisonTable, FAQSection, CTASection, and Footer
- **FAQPage JSON-LD** — Structured data with all 7 Q&A pairs for SEO

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pricing tier data and card component** — `35bbae4` (feat)
2. **Task 2: Create feature comparison table and FAQ section** — `058a312` (feat)
3. **Task 3: Compose the pricing page** — `739cc0b` (feat)

## Files Created/Modified

- `apps/marketing/components/pricing/pricing-tier-data.ts` — TierData interface and 3-tier data array with limits, features, badge, CTAs
- `apps/marketing/components/pricing/pricing-card.tsx` — Single tier card with check icon feature list, CTA button, hover elevation, highlighted variant
- `apps/marketing/components/pricing/feature-comparison-table.tsx` — Feature comparison table with 5 grouped categories, sticky header, responsive horizontal scroll
- `apps/marketing/components/pricing/faq-section.tsx` — Accordion FAQ with 7 native details/summary items, chevron rotation animation
- `apps/marketing/app/[locale]/pricing/page.tsx` — Pricing page SSG with all sections composed, FAQPage JSON-LD, metadata

## Decisions Made

- **License tier limits match Phase 5 claim structure** — cameras, doors, and user limits align with the license claim model (maxCameras, maxDoors) established in Phase 5 monetization
- **"Contact us for pricing" on all tiers** — Per D-01, no Stripe checkout is involved. All CTAs route to sales contact flow
- **Professional highlighted with ring-cyan + shadow-glow** — The prominent tier uses ring-2 ring-cyan-500/40 with cyan-tinted box-shadow and -translateY-1 elevation
- **Feature groups organized into 5 categories** — Platform Limits (limits row first), AI & Analytics, Integrations, Security & Compliance, Support — logical progression from what you get to how you're supported

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Pricing page complete with tier cards, comparison table, and FAQ — ready for 07-07 (Blog MDX setup)
- All CTAs point to contact flow — ensure 07-08 Contact page is ready
- FAQPage JSON-LD in place — verify with SEO audit in 07-09

---

## Self-Check: PASSED

- [x] All 3 tasks executed and committed
- [x] All 5 created files exist on disk (`pricing-tier-data.ts`, `pricing-card.tsx`, `feature-comparison-table.tsx`, `faq-section.tsx`, `pricing/page.tsx`)
- [x] All 4 commits present in git log (3 feat + 1 docs)
- [x] `tiers` array exported with 3 tier objects
- [x] Professional card has highlighted styling (ring-2 ring-cyan)
- [x] FAQ uses native HTML `<details>/<summary>` elements
- [x] Pricing page imports and composes PricingCard + FeatureComparisonTable + FAQSection
- [x] FAQPage JSON-LD structured data included in page markup
- [x] SUMMARY.md exists with substantive content

---

*Phase: 07-public-presence*
*Completed: 2026-07-16*
