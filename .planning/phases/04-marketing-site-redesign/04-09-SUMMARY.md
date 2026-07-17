---
phase: 04-marketing-site-redesign
plan: 09
subsystem: ui
tags: [case-studies, velite, mdx, nextjs, next-intl]

# Dependency graph
requires:
  - phase: 04-06
    provides: velite CaseStudy collection + sample MDX content
provides:
  - Case studies listing page at /etudes-de-cas with locale-filtered grid
  - Case study detail page at /etudes-de-cas/[slug] with prose MDX rendering
  - Reusable CaseStudyCard, CaseStudyGrid, CaseStudyLayout components
affects: [verification, v3-milestone]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server component page template (generateStaticParams + generateMetadata + async Server Component)
    - GlassPanel card with hover animations for case study cards
    - Staggered entrance via motion whileInView with index-based delays

key-files:
  created:
    - apps/marketing/components/case-studies/case-study-card.tsx
    - apps/marketing/components/case-studies/case-study-grid.tsx
    - apps/marketing/components/case-studies/case-study-layout.tsx
    - apps/marketing/app/[locale]/etudes-de-cas/page.tsx
    - apps/marketing/app/[locale]/etudes-de-cas/[slug]/page.tsx
  modified: []

key-decisions:
  - "Used velite caseStudy collection helpers (getCaseStudiesByLocale, getCaseStudyBySlug, getCaseStudySlugsByLocale) — same pattern as blog"
  - "MDX content rendered via existing MDXContent component for code splitting and client hydration"
  - "CaseStudyLayout uses 2-column grid (8+4) with GlassPanel sidebar for client info and results"

patterns-established:
  - "Staggered card entrance animation via motion whileInView with index * 0.1 delay"

requirements-completed: [MKT-02]

# Metrics
duration: 12 min
completed: 2026-07-17
---

# Phase 04 Plan 09: Case Studies Section Summary

**velite-powered case studies listing and MDX detail pages with GlassPanel cards, responsive grid, and results sidebar**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-17T19:18:00Z
- **Completed:** 2026-07-17T19:30:52Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created 3 reusable case study components (CaseStudyCard, CaseStudyGrid, CaseStudyLayout)
- Created listing page at `/etudes-de-cas` with locale-filtered velite grid
- Created detail page at `/etudes-de-cas/[slug]` with prose-styled MDX content
- Implemented empty state when no case studies available
- Full Next.js build passes without errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CaseStudyCard, CaseStudyGrid, CaseStudyLayout components** - `337d882` (feat)
2. **Task 2: Create case studies listing + detail pages** - `bfe005f` (feat)
3. **Type fix: explicit annotation for results map callback** - `09399ec` (fix)

**Plan metadata:** (no metadata commit — see CRITICAL note above)

## Files Created/Modified

- `apps/marketing/components/case-studies/case-study-card.tsx` - GlassPanel card with industry tag, title, client, excerpt, and readMore link
- `apps/marketing/components/case-studies/case-study-grid.tsx` - Responsive 3-column grid with empty state
- `apps/marketing/components/case-studies/case-study-layout.tsx` - Hero + 2-column layout with prose content and results sidebar
- `apps/marketing/app/[locale]/etudes-de-cas/page.tsx` - Case studies listing with locale-filtered velite grid
- `apps/marketing/app/[locale]/etudes-de-cas/[slug]/page.tsx` - Case study detail with MDXContent in CaseStudyLayout

## Decisions Made

- Used existing velite helper functions (`getCaseStudiesByLocale`, `getCaseStudyBySlug`, `getCaseStudySlugsByLocale`) — follows the same pattern as blog pages
- i18n messages already existed in all 6 locale files — no message file changes needed
- MDX rendering uses the existing `MDXContent` component (`'/use client'` that evaluates compiled MDX at runtime)

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed implicit 'any' type in results map**
- **Found during:** Task 2 (build verification)
- **Issue:** `study.results?.map((r) => ...)` caused TypeScript error because parameter 'r' had implicit 'any' type
- **Fix:** Added explicit type annotation `{ metric: string; value: string }` for the map callback parameter
- **Files modified:** `apps/marketing/app/[locale]/etudes-de-cas/[slug]/page.tsx`
- **Verification:** Build passes cleanly after fix
- **Committed in:** `09399ec`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type annotation needed for strict TypeScript compliance. No scope creep.

## Issues Encountered

- TypeScript strictly typed callback parameter in `results?.map()` required explicit annotation — velite-generated types for optional fields may produce `any`-inferred parameters. Fixed inline.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Case studies section complete — listing and detail pages render with velite-powered content
- Ready for final verification or next plan execution (plan 10 of phase 04)

---

*Phase: 04-marketing-site-redesign*
*Completed: 2026-07-17*
