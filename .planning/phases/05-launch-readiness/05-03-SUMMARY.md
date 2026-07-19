---
phase: 05-launch-readiness
plan: 03
subsystem: docs
tags: velite, mdx, docs, i18n, nextjs, documentation

requires:
  - phase: 01-architecture-license-foundation
    provides: vault-app project structure, i18n with next-intl, Velite MDX infrastructure
provides:
  - New Velite `docs` collection with categorized MDX schema
  - Data accessor functions (getDocsByLocale, getDocBySlug, getDocCategoriesByLocale)
  - Documentation route group at /[locale]/docs/ with index and [slug] pages
  - DocsLayout component with sidebar TOC and mobile hamburger menu
affects:
  - 05-launch-readiness (Plan 05 — content will populate the docs infrastructure)

tech-stack:
  added: []
  patterns:
    - "Velite docs collection with category enum and canonical ordering"
    - "Server-side docs index page with category grid and card layout"
    - "Client-side DocsLayout with responsive sidebar TOC (sticky desktop, off-canvas mobile)"
    - "MDX content rendering with prose styling, category badges, and locale-aware dates"

key-files:
  created:
    - components/docs/docs-layout.tsx
    - app/[locale]/docs/layout.tsx
    - app/[locale]/docs/page.tsx
    - app/[locale]/docs/[slug]/page.tsx
  modified:
    - velite.config.ts
    - src/lib/velite.ts

key-decisions:
  - "DocsLayout wraps only [slug] pages (sidebar + content); index page uses full-width category grid"
  - "Canonical category ordering: installation, configuration, manual, troubleshooting, support"
  - "French UI copy for docs pages (empty state, labels) per Phase 2 decision (FR primary language)"
  - "revalidate = 600 (same as blog) for ISR-based regeneration"

requirements-completed: [BAS-38]

# Phase 5: Launch Readiness — Plan 03 Summary

**Velite docs collection, data accessor functions, documentation route pages with MDX rendering, sidebar TOC, and mobile-responsive doc layout**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-19T08:59:26Z
- **Completed:** 2026-07-19T09:06:06Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- **Velite docs collection** added with category enum (installation, configuration, manual, troubleshooting, support), order, localization, and full MDX content schema
- **Data accessor functions** (`getDocsByLocale`, `getDocBySlug`, `getDocCategoriesByLocale`) exported from `src/lib/velite.ts` following the exact blog/case-study pattern
- **Docs index page** at `/[locale]/docs/` with category grid layout, article cards with excerpt and date, and empty state in French ("Aucun article de documentation disponible")
- **Individual article page** at `/[locale]/docs/[slug]/` with `DocsLayout` sidebar TOC, category badge, MDX prose rendering (BlogPostLayout-style), back navigation, and "last updated" footer
- **Responsive `DocsLayout` component** with sticky sidebar on desktop, hamburger-triggered off-canvas overlay on mobile, category-grouped article navigation, active-article highlighting
- **All routes are i18n-ready** with `setRequestLocale`, locale-prefixed navigation, locale-aware date formatting, and 6-locale static generation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add docs collection to Velite config and docs data accessors to velite.ts** — `8b7821a` (feat)
2. **Task 2: Create documentation route pages (layout, index, [slug]) and docs-layout component** — `ec437a4` (feat)

## Files Created/Modified

### Created
- `components/docs/docs-layout.tsx` — Client component with responsive sidebar TOC, category-grouped article navigation, mobile hamburger with off-canvas overlay, active-article highlighting with accent color
- `app/[locale]/docs/layout.tsx` — Server component layout wrapping docs pages with Header and Footer
- `app/[locale]/docs/page.tsx` — Server component docs index with `generateStaticParams`, `generateMetadata`, `revalidate = 600`, category grid with article cards, empty state
- `app/[locale]/docs/[slug]/page.tsx` — Server component article page with `generateStaticParams`, `generateMetadata`, `notFound()` handling, `DocsLayout` sidebar, MDX prose rendering, category badge, locale-aware dates

### Modified
- `velite.config.ts` — Added `docs` collection with `s.enum()` category, `s.slug('docs')`, order, locale, excerpt, MDX content, and metadata fields
- `src/lib/velite.ts` — Added `docs as allDocs` import, `Doc` type, `getDocsByLocale` (order + date sort), `getDocBySlug`, `getDocCategoriesByLocale` (canonical category ordering)

## Decisions Made

- **DocsLayout wraps [slug] pages only** — The index page uses a full-width category grid layout (no sidebar) for browsing content, while article pages use the responsive sidebar TOC for navigation between docs. This matches the blog pattern where index and detail pages have distinct layouts.
- **Canonical category ordering** — Categories appear in a fixed order (installation → configuration → manual → troubleshooting → support) regardless of alphabetical sort. This ensures consistent navigation across all locales.
- **French empty state copy** — Per the Phase 2 decision (FR primary language) and UI-SPEC copywriting contract, all UI text in docs pages is in French. Content itself is locale-aware via MDX.
- **revalidate = 600 (10 minutes)** — Same ISR interval as the blog pages. Docs content changes infrequently but benefits from on-demand regeneration when Plan 05 content is published.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## Threat Surface Scan

No new threat surface introduced. The `<threat_model>` in the plan accepts docs as intentionally public (T-05-05, T-P5-01, T-P5-02), and no new network endpoints, auth paths, or schema changes at trust boundaries were added.

## Next Phase Readiness

- Documentation infrastructure complete and building successfully
- Docs index and article pages render for all 6 locales (en, fr, es, de, ja, ar)
- DocsLayout sidebar TOC ready for content navigation
- Ready for **Plan 05** (content production — fill the Velite docs collection with actual MDX documentation)

## Self-Check: PASSED

- ✅ `velite.config.ts` has docs collection with all schema fields
- ✅ `src/lib/velite.ts` exports `getDocsByLocale`, `getDocBySlug`, `getDocCategoriesByLibrary`
- ✅ `npx velite build` succeeds
- ✅ All 4 created files exist on disk
- ✅ `npx next build` compiles with exit code 0
- ✅ Docs routes render: `/[locale]/docs` (SSG, 6 locales), `/[locale]/docs/[slug]` (SSG)
- ✅ Empty state renders when no docs content exists
- ✅ `notFound()` 404 called for non-existent doc slugs
- ✅ Navigation links use locale prefix
- ✅ Prose styling applied via prose classes
- ✅ Both commits found in git log

---
*Phase: 05-launch-readiness*
*Completed: 2026-07-19*
