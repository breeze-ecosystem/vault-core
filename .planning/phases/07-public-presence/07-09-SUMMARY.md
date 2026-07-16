---
phase: 07-public-presence
plan: 09
subsystem: seo-infrastructure
tags: [json-ld, sitemap, og-images, analytics, i18n, next-intl]

# Dependency graph
requires:
  - phase: 07-01
    provides: Marketing app scaffold (Next.js, Tailwind, routing, layout)
  - phase: 07-05
    provides: Navigation components (header, footer, containers)
  - phase: 07-06
    provides: Landing page sections (hero, features, testimonials, CTA)
  - phase: 07-07
    provides: Pricing page (tiers, feature comparison, FAQ)
  - phase: 07-08
    provides: Blog components (post layout, grid, pagination, category filter)
provides:
  - Translation JSON files for all 6 locales (en, fr, es, de, ja, ar)
  - JSON-LD structured data helpers integrated into layout and pages
  - Build-time OG image generation pipeline (satori + sharp)
  - Per-locale sitemap generation with hreflang annotations
  - Plausible-compatible analytics component (async, silent-fail)
affects:
  - 07-10 (if any remaining i18n/SEO polish)
  - Phase 8 (analytics env vars must be configured in deployment)

# Tech tracking
tech-stack:
  added:
    - satori (OG image JSX→SVG→PNG at build time)
    - sharp (SVG→PNG conversion in OG pipeline)
  patterns:
    - JSON-LD structured data as React components with dangerouslySetInnerHTML
    - Per-locale sitemap entries with hreflang alternates via MetadataRoute.Sitemap
    - Build-time OG image generation with `npx tsx src/og/generate.ts`

key-files:
  created:
    - apps/marketing/messages/en.json
    - apps/marketing/messages/fr.json
    - apps/marketing/messages/es.json
    - apps/marketing/messages/de.json
    - apps/marketing/messages/ja.json
    - apps/marketing/messages/ar.json
    - apps/marketing/src/lib/seo.ts
    - apps/marketing/src/og/template.tsx
    - apps/marketing/src/og/generate.ts
    - apps/marketing/app/sitemap.ts
    - apps/marketing/components/ui/analytics.tsx
  modified:
    - apps/marketing/app/[locale]/layout.tsx
    - apps/marketing/app/[locale]/pricing/page.tsx
    - apps/marketing/app/[locale]/blog/[slug]/page.tsx

key-decisions:
  - "Placeholder translations for es/de/ja/ar using English — professional translation per D-13"
  - "Shared FAQPageJsonLd helper in seo.ts replaces inline FAQ script in pricing page"
  - "Sitemap uses dynamic import of velite content for blog post entries (graceful fallback if .velite not generated)"
  - "OG image generation kept as manual build script (npx tsx src/og/generate.ts) not auto-integrated into Next.js build pipeline"

patterns-established:
  - "JSON-LD structured data: dedicated seo.ts library exporting typed React-element helpers, imported in layouts/pages"
  - "Sitemap: single app/sitemap.ts per Next.js 14 convention, returning MetadataRoute.Sitemap with per-locale alternates"
  - "Analytics: client component with useEffect-based script injection, configured via env var, fails silently"

requirements-completed: [WEB-04, WEB-05]

# Metrics
duration: 3min
completed: 2026-07-16
---

# Phase 07: Public Presence — Plan 09 Summary

**Translation files for 6 locales, JSON-LD structured data helpers, OG image generation pipeline, per-locale sitemap with hreflang, and Plausible-compatible analytics component**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-16T01:07:58Z
- **Completed:** 2026-07-16T01:11:27Z
- **Tasks:** 3
- **Files modified:** 14 (11 created, 3 modified)

## Accomplishments

- **6 translation JSON files** — `en.json` (authoritative English with all key namespaces), `fr.json` (full French translation), and 4 placeholder locale files (es, de, ja, ar) awaiting professional translation per D-13
- **7 JSON-LD structured data helpers** in `src/lib/seo.ts` — Organization, SoftwareApplication, WebSite, WebPage, BlogPosting, FAQPage, and BreadcrumbList schemas, each returning `<script type="application/ld+json">` elements
- **Layout integration** — `OrganizationJsonLd` and `WebSiteJsonLd` render in the root layout for full-site coverage
- **Pricing page JSON-LD** — refactored inline `FAQPageJsonLd` to use shared helper, added `SoftwareApplicationJsonLd` and `BreadcrumbListJsonLd`
- **Blog post JSON-LD** — `BlogPostingJsonLd` (headline, date, author) and `BreadcrumbListJsonLd` rendered on each post page
- **OG image pipeline** — `src/og/template.tsx` (satori-based JSX→SVG→PNG) and `src/og/generate.ts` (build-time script creating landing-og.png, pricing-og.png, blog-og.png)
- **Per-locale sitemap** — `app/sitemap.ts` generates entries for landing, pricing, blog index, and blog posts with hreflang alternates across all 6 locales plus x-default
- **Analytics component** — Plausible-compatible `use client` component injecting async script from `NEXT_PUBLIC_ANALYTICS_URL`, fails silently when unconfigured

## Task Commits

Each task was committed atomically:

1. **Task 1: Create next-intl translation message files for all 6 locales** — `46bd066` (feat)
2. **Task 2: Create JSON-LD structured data and SEO helpers** — `f31a46c` (feat)
3. **Task 3: Create OG image templates, sitemap generator, and analytics component** — `22e665d` (feat)

## Files Created/Modified

- `apps/marketing/messages/en.json` — Authoritative English locale with all 14 key namespaces (nav, cta, hero, features, ai, testimonials, stats, finalCta, pricing, blog, contact, errors, notFound, footer)
- `apps/marketing/messages/fr.json` — Full French translation of all message keys
- `apps/marketing/messages/es.json` — English placeholder (Spanish translation pending D-13)
- `apps/marketing/messages/de.json` — English placeholder (German translation pending D-13)
- `apps/marketing/messages/ja.json` — English placeholder (Japanese translation pending D-13)
- `apps/marketing/messages/ar.json` — English placeholder (Arabic translation pending; RTL handled by next-intl dir attribute)
- `apps/marketing/src/lib/seo.ts` — 7 JSON-LD helper functions for structured data
- `apps/marketing/src/og/template.tsx` — Satori-based OG image template (Inter font, gradient background, category label, title)
- `apps/marketing/src/og/generate.ts` — Build-time script generating 3 OG PNGs to `public/og/`
- `apps/marketing/app/sitemap.ts` — Next.js MetadataRoute sitemap with per-locale hreflang annotations
- `apps/marketing/components/ui/analytics.tsx` — Client component for Plausible-compatible analytics
- `apps/marketing/app/[locale]/layout.tsx` — Added OrganizationJsonLd + WebSiteJsonLd rendering
- `apps/marketing/app/[locale]/pricing/page.tsx` — Refactored to use shared FAQPageJsonLd, added SoftwareApplicationJsonLd + BreadcrumbListJsonLd
- `apps/marketing/app/[locale]/blog/[slug]/page.tsx` — Added BlogPostingJsonLd + BreadcrumbListJsonLd

## Decisions Made

- **Placeholder translations for es/de/ja/ar:** English content used as placeholder with `__locale` and `__note` metadata fields — professional translation will be done as a separate effort per D-13
- **Shared FAQPageJsonLd helper:** The inline FAQPageJsonLd function in the pricing page was refactored to use the shared helper from seo.ts, with FAQ data extracted to a constant array for cleaner separation
- **Sitemap dynamic import:** Blog post entries in the sitemap use dynamic import of velite content with a try/catch fallback — this handles the case where `.velite` hasn't been generated yet (e.g., during dev)
- **OG generation as manual build script:** Not auto-integrated into `next build` — intended to be run explicitly via `npx tsx src/og/generate.ts` or as a prebuild step in CI

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Translation infrastructure complete — ready for UI components to consume via `useTranslations()` / `getTranslations()`
- JSON-LD structured data active on all pages — improves SEO for search engines
- OG image pipeline ready for build-time generation
- Sitemap ready for search engine crawling
- Analytics component ready for deployment with `NEXT_PUBLIC_ANALYTICS_URL` env var

## Self-Check: PASSED

- [x] All 6 translation JSON files exist in messages/ directory
- [x] en.json has all 14 required key namespaces
- [x] fr.json has French translations (nav.home = "Accueil")
- [x] seo.ts exports all 7 JSON-LD helper functions
- [x] Layout integrates OrganizationJsonLd and WebSiteJsonLd
- [x] Pricing page integrates SoftwareApplicationJsonLd and BreadcrumbListJsonLd
- [x] Blog post page integrates BlogPostingJsonLd and BreadcrumbListJsonLd
- [x] OG template and generate script exist
- [x] Sitemap.ts exports default function for Next.js MetadataRoute.Sitemap
- [x] Analytics component created with 'use client' directive
- [x] All 3 commits present in git log

---

*Phase: 07-public-presence*
*Completed: 2026-07-16*
