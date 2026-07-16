---
phase: 07-public-presence
plan: 07
subsystem: content
tags: [velite, mdx, blog, nextjs, isr]

requires:
  - phase: 07-public-presence
    plan: 04
    provides: Marketing app scaffolding with next.config.ts velite build hook, next-intl i18n, component framework

provides:
  - Velite MDX content collection configuration for blog posts
  - Typed helper functions (getPostsByLocale, getPostBySlug, getAllSlugsByLocale, getCategoriesByLocale)
  - MDX runtime renderer (useMDXComponent pattern) for compiled velite content
  - 8 blog components (card, grid, category filter, post layout, author, share links, related posts, pagination)
  - Blog index page with ISR (10 min revalidation), category filtering, pagination, and empty state
  - Blog post page with static params generation, generateMetadata, notFound handling, and ISR

affects: [07-public-presence-08, 07-public-presence-09]

tech-stack:
  added: []
  patterns:
    - Velite MDX content collection with Zod schema validation
    - useMDXComponent runtime pattern (new Function + react/jsx-runtime)
    - Client-side category filtering with pagination via useMemo
    - Per-locale content filtering in velite helper functions
    - ISR at 10-minute revalidation for blog content freshness

key-files:
  created:
    - apps/marketing/velite.config.ts — Velite collection configuration with Post schema
    - apps/marketing/src/lib/velite.ts — Typed content helpers for locale-filtered queries
    - apps/marketing/components/mdx-content.tsx — MDX runtime renderer
    - apps/marketing/components/blog/blog-card.tsx — Blog post preview card
    - apps/marketing/components/blog/blog-grid.tsx — Responsive 3/2/1 column grid
    - apps/marketing/components/blog/blog-category-filter.tsx — Pill category filter
    - apps/marketing/components/blog/blog-post-layout.tsx — Full article layout
    - apps/marketing/components/blog/blog-author.tsx — Author avatar + name/role
    - apps/marketing/components/blog/blog-share-links.tsx — Copy link, LinkedIn, Twitter/X
    - apps/marketing/components/blog/blog-related-posts.tsx — Up to 3 related blog cards
    - apps/marketing/components/blog/blog-pagination.tsx — Previous/next with page numbers
    - apps/marketing/content/blog/en/hello-world.mdx — Sample blog post
    - apps/marketing/app/[locale]/blog/page.tsx — Blog index page (ISR)
    - apps/marketing/app/[locale]/blog/[slug]/page.tsx — Blog post page (ISR)
    - apps/marketing/app/[locale]/blog/blog-index-client.tsx — Client wrapper for filter/grid/pagination
  modified: []

key-decisions:
  - "Client-side category filtering + pagination via BlogIndexClient wrapper for instant UX (velite data is build-time static)"
  - "Same author (Oversight AI Team) for all posts — simplifies author management for launch"
  - "9 posts per page for pagination — good balance between scroll depth and page count"
  - "Empty state has dedicated illustration icon + copy matching UI-SPEC copy contract"
  - "Related posts excludes current post slug, shows up to 3 in a 3-column grid"

requirements-completed: [WEB-03, WEB-08]

duration: 2min
completed: 2026-07-16
---

# Phase 07 Plan 07: MDX Blog with Velite Content Layer Summary

**Velite MDX blog content pipeline: collection config, typed helpers, MDX renderer, 8 blog components, index+post pages with ISR at 10-minute revalidation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-16T01:01:32Z
- **Completed:** 2026-07-16T01:04:08Z
- **Tasks:** 3
- **Files modified:** 15 (15 created, 0 modified)

## Accomplishments

- **Velite configuration** — Collection config with Post schema (title, slug, date, locale, category, excerpt, cover, tags, MDX content, metadata) at `apps/marketing/velite.config.ts`
- **Content helpers** — `getPostsByLocale`, `getPostBySlug`, `getAllSlugsByLocale`, `getCategoriesByLocale` functions with locale filtering and date-desc sorting
- **MDX Runtime Renderer** — `MDXContent` component using velite's compiled code string + `useMDXComponent` (new Function + react/jsx-runtime)
- **8 Blog Components** — BlogCard (thumbnail, badge, title, excerpt, date), BlogGrid (responsive 3/2/1 grid with staggered entrance), BlogCategoryFilter (pill buttons), BlogPostLayout (full article with header, prose body, share links, related posts), BlogAuthor (avatar initials), BlogShareLinks (copy link, LinkedIn, Twitter/X), BlogRelatedPosts (up to 3), BlogPagination (previous/next with page numbers)
- **Blog Index Page** — ISR (10 min), category filtering via client-side state, pagination (9 per page), empty state with illustration and copy
- **Blog Post Page** — `generateStaticParams` for all locale+slug combinations, `generateMetadata` with OG article data, `notFound()` for missing posts, ISR (10 min)
- **Sample Post** — Hello World MDX post in English with frontmatter, headings, prose, and TypeScript code block for syntax highlighting verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Create velite configuration and content helpers** — `5ed5a18` (feat)
2. **Task 2: Create blog components and MDX renderer** — `6b3c2ed` (feat)
3. **Task 3: Create blog pages (index + post)** — `b65e4dc` (feat)

## Files Created

- `apps/marketing/velite.config.ts` — Velite collection config with `defineConfig`, `s.object`, MDX schema
- `apps/marketing/src/lib/velite.ts` — Content helper functions for locale-filtered queries
- `apps/marketing/components/mdx-content.tsx` — MDX runtime renderer (`'use client'`)
- `apps/marketing/components/blog/blog-card.tsx` — Blog post preview card
- `apps/marketing/components/blog/blog-grid.tsx` — Responsive grid with `AnimatedSection`
- `apps/marketing/components/blog/blog-category-filter.tsx` — Pill filter buttons (`'use client'`)
- `apps/marketing/components/blog/blog-post-layout.tsx` — Full article layout
- `apps/marketing/components/blog/blog-author.tsx` — Author display
- `apps/marketing/components/blog/blog-share-links.tsx` — Share buttons (`'use client'`)
- `apps/marketing/components/blog/blog-related-posts.tsx` — Related posts grid
- `apps/marketing/components/blog/blog-pagination.tsx` — Pagination (`'use client'`)
- `apps/marketing/content/blog/en/hello-world.mdx` — Sample blog post
- `apps/marketing/app/[locale]/blog/page.tsx` — Blog index with ISR
- `apps/marketing/app/[locale]/blog/[slug]/page.tsx` — Blog post with ISR
- `apps/marketing/app/[locale]/blog/blog-index-client.tsx` — Client wrapper (`'use client'`)

## Decisions Made

- **Client-side filtering over URL searchParams:** BlogIndexClient handles category filter state in React state + useMemo for instant UX. Since velite data is build-time static, there's no server round-trip needed for filtering — client-side filtering is faster and smoother.
- **Single author for all posts:** Using "Oversight AI Team" as the author for the sample post. The `BlogAuthor` component supports `name`, `role`, and `avatar` props for extensibility when multi-author support is needed.
- **9 posts per page pagination:** Aligns with the 3-column grid — users see exactly 3 rows of posts per page. Pagination hidden when `totalPages <= 1`.
- **Empty state placement:** The empty state ("No posts yet") shows in both scenarios: when no posts exist at all for a locale, and when no posts match a filtered category (handled by both server and client).
- **Related posts exclusion:** The current post is excluded from related posts via `currentSlug` prop — prevents self-referencing.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Blog content pipeline complete: MDX → velite → typed helpers → rendered blog pages
- Ready for remaining Phase 7 plans (08: SEO, sitemaps, OG images; 09: contact form, analytics, Docker/Caddy integration)
- Next: `07-08-PLAN.md`

---

## Self-Check: PASSED

- [x] All 3 tasks executed and committed
- [x] All 15 files exist on disk
- [x] All 3 commits present in git history (`5ed5a18`, `6b3c2ed`, `b65e4dc`)
- [x] velite.config.ts has `defineConfig` with posts collection and `s.object` schema
- [x] src/lib/velite.ts exports `getPostsByLocale`, `getPostBySlug`, `getAllSlugsByLocale`, `getCategoriesByLocale`
- [x] mdx-content.tsx uses `useMDXComponent` pattern for compiled velite MDX rendering
- [x] All 9 blog component files exist with correct structure
- [x] Blog index page has `getPostsByLocale`, category filter, empty state, and `revalidate: 600`
- [x] Blog post page has `generateStaticParams`, `getPostBySlug`, `notFound()`, and `revalidate: 600`

---

*Phase: 07-public-presence*
*Completed: 2026-07-16*
