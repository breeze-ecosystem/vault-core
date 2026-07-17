---
phase: 04-marketing-site-redesign
plan: 06
subsystem: i18n, content, seo
tags: next-intl, velite, mdx, sitemap, seo, translation, case-studies

requires:
  - phase: 04-marketing-site-redesign
    plan: 01
    provides: visual foundation and CSS variables
  - phase: 04-marketing-site-redesign
    plan: 03
    provides: header navigation components consuming i18n keys
provides:
  - Complete i18n message keys for produits, solutions, case studies, demo across all 6 locales
  - velite caseStudies collection with full schema
  - 4 sample case study MDX files (2 FR, 2 EN)
  - Updated sitemap with all new routes and per-locale hreflang alternates
affects:
  - Plan 04-07 (product page components)
  - Plan 04-08 (case study + demo pages)

tech-stack:
  added: []
  patterns:
    - velite collection extension (caseStudies mirroring posts pattern)
    - MDX frontmatter with results arrays for structured metrics
    - Sitemap dynamic sub-page generation via arrays and loops

key-files:
  created:
    - apps/marketing/content/case-studies/fr/campus-entreprise.mdx
    - apps/marketing/content/case-studies/fr/infrastructure-critique.mdx
    - apps/marketing/content/case-studies/en/enterprise-campus.mdx
    - apps/marketing/content/case-studies/en/critical-infrastructure.mdx
  modified:
    - apps/marketing/messages/fr.json
    - apps/marketing/messages/en.json
    - apps/marketing/messages/es.json
    - apps/marketing/messages/de.json
    - apps/marketing/messages/ja.json
    - apps/marketing/messages/ar.json
    - apps/marketing/velite.config.ts
    - apps/marketing/src/lib/velite.ts
    - apps/marketing/app/sitemap.ts

key-decisions:
  - "Route names use French identifiers (produits, solutions, etudes-de-cas, demo) consistently across all locales — French-first per D-18, matches next-intl route segment pattern"
  - "velite caseStudies schema reuses pattern from posts collection — same MDX pipeline, locale filtering, metadata generation"
  - "Sitemap sub-pages generated dynamically via arrays (produitSubs, solutionSubs) rather than hardcoded per-entry to reduce duplication"

patterns-established:
  - "velite collection extension: mirror existing posts schema pattern with collection-specific fields"
  - "Sitemap loop generation: for sub-pages, use const arrays + for-of loops with template URL construction"
  - "French-first MDX: write FR content first, then translate to EN with matching frontmatter structure"

requirements-completed: [MKT-03]

duration: 7min
completed: 2026-07-17
---

# Phase 04 Plan 06: i18n Keys, velite Case Studies, and Sitemap — Summary

**Complete i18n message keys across 6 locales (FR, EN, ES, DE, JA, AR), velite caseStudies collection with 4 sample MDX files, and updated sitemap with 10 new route entries per locale including hreflang alternates**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-17T18:59:22Z
- **Completed:** 2026-07-17T19:07:13Z
- **Tasks:** 3
- **Files modified/created:** 15

## Accomplishments

- All 6 locale JSON files updated with nav.produits, nav.solutions, nav.etudesDeCas, nav.demo and top-level sections (produits, solutions, caseStudies, demo) — French content written first (D-18), Arabic uses RTL-appropriate text (D-19)
- velite.config.ts extended with caseStudies collection — schema includes title, slug, date, locale, industry, client, excerpt, results (array of metric/value pairs), content, metadata
- 4 sample case study MDX files created: 2 French (campus-entreprise, infrastructure-critique) + 2 English (enterprise-campus, critical-infrastructure) with realistic placeholder content and structured results frontmatter
- `src/lib/velite.ts` extended with CaseStudy type and helper functions (getCaseStudiesByLocale, getCaseStudyBySlug, getCaseStudySlugsByLocale)
- Sitemap updated with 10 new routes per locale (produits overview + 4 sub-pages, solutions overview + 2 sub-pages, etudes-de-cas listing + detail slugs via velite, demo) — all with hreflang alternates for 6 locales and x-default
- velite output regenerated to include caseStudies type declarations and JSON data
- `pnpm --filter @repo/marketing check-types` passes

## File Changes

- `apps/marketing/messages/*.json` — Extended nav section and added 4 new top-level sections (produits, solutions, caseStudies, demo) in all 6 locales
- `apps/marketing/velite.config.ts` — Added caseStudies collection with full schema alongside existing posts
- `apps/marketing/src/lib/velite.ts` — Added CaseStudy type and lookup helpers
- `apps/marketing/content/case-studies/fr/campus-entreprise.mdx` — French: multi-building campus security case study
- `apps/marketing/content/case-studies/fr/infrastructure-critique.mdx` — French: critical infrastructure protection case study
- `apps/marketing/content/case-studies/en/enterprise-campus.mdx` — English translation of campus-entreprise
- `apps/marketing/content/case-studies/en/critical-infrastructure.mdx` — English translation of infrastructure-critique
- `apps/marketing/app/sitemap.ts` — Added 10 new routes per locale with hreflang alternates

## Task Commits

Each task was committed atomically:

1. **Task 1: Update all 6 locale JSON files with new message keys** — Message keys already present in HEAD from prior wave; validated all 6 files have correct content across all locales.
2. **Task 2: Extend velite config + create case study MDX content** — `dfa156e` (feat) + `e115938` (chore: regenerate velite output)
3. **Task 3: Update sitemap with new routes** — `578932a` (feat) + `ca80710` (fix: use velite helper for case study slugs)

**Plan metadata (fix-up commits):** `ca80710`, `e115938`

## Decisions Made

- **French route identifiers across all locales**: Route segments use French names (produits, solutions, etudes-de-cas) consistently regardless of locale. This matches D-12/D-18 French-first design and keeps URL structure uniform.
- **velite caseStudies schema mirrors posts pattern**: Reuses same MDX pipeline, locale filtering, and metadata generation approach. Schema extends base pattern with industry, client, and results fields.
- **Sitemap sub-page generation via loops**: Sub-pages use `const produitSubs/solutionSubs` arrays with `for...of` loops to reduce code duplication, rather than hardcoding each entry.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **velite `.velite/index.d.ts` needed regeneration**: After adding the caseStudies collection, the generated type declarations and JS output didn't include caseStudies until velite build was re-run. Fixed by running `npx velite --clean` to regenerate.
- **Direct `.velite` import caused TypeScript error**: Initial sitemap implementation imported from `../../.velite` which failed type-check. Switched to importing from `@/src/lib/velite` (consistent with blog pattern) and added required helper functions there.
- **Sitemap sub-page verification produces false negatives**: Grep-based check for literal strings like `/produits/video` fails because URLs are constructed via template literals (`${BASE_URL}/${locale}/produits/${sub}`). Verified correct by checking array values and loop structure.

## Known Stubs

- Case study MDX content in all 4 files is representative placeholder content intended to be refined later. The stories, statistics, and quotes are narrative examples for layout development, not actual client data. This is per the plan spec (Section B: "use realistic placeholder content").
- ES, DE, JA, AR locale files still have English placeholder content for the pre-existing keys (the `__note` field documents this). The new keys added by this plan have proper translations.

## Self-Check: PASSED

- [x] All 6 locale files parse as valid JSON
- [x] All required message keys present in fr.json
- [x] velite.config.ts has caseStudies collection with full schema
- [x] 4 MDX case study files exist with proper frontmatter
- [x] Sitemap includes all new routes with hreflang alternates
- [x] `pnpm --filter @repo/marketing check-types` passes

## Next Phase Readiness

Ready for Plan 04-07 (product page components) which will consume the i18n keys and case study data created in this plan.

---

*Phase: 04-marketing-site-redesign*
*Completed: 2026-07-17*
