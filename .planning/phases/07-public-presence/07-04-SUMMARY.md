---
phase: 07-public-presence
plan: 04
subsystem: marketing
tags:
  - nextjs
  - next-intl
  - i18n
  - tailwind
  - rtl
  - marketing-site

# Dependency graph
requires:
  - phase: 07-public-presence
    plan: 01
    provides: Phase research, library selection, next-intl patterns
provides:
  - apps/marketing/ scaffold with package.json, tsconfig, next.config, postcss
  - next-intl i18n routing infrastructure (defineRouting, getRequestConfig, createNavigation, createMiddleware)
  - Tailwind CSS config with marketing theme (light-first, IBM Plex Sans, display 40px, fade-up/slide-up/fade-in animations)
  - Global CSS with --marketing-* custom properties, bg-grid utility, reduced-motion support
  - Root and locale layouts with RTL support for Arabic and JSON-LD Organization schema
  - 404 page, robots.txt
  - 8 shared layout/navigation components (Container, Section, Header, Footer, MobileMenu, NavLink, LanguageSwitcher, PageHeader)
affects: [07-05, 07-06, 07-07]

# Tech tracking
tech-stack:
  added:
    - next-intl (i18n routing, translations, RTL)
    - velite (MDX content layer — config only)
    - satori, sharp (OG image generation — dependencies declared)
    - @tailwindcss/typography (blog prose styling)
  patterns:
    - next-intl v4 with prefix-based locale routing (/en/pricing, /fr/pricing)
    - Light-first marketing theme using --marketing-* CSS vars
    - Locale layout pattern with RTL support for Arabic via hasLocale + dir attribute
    - Client components with usePathname/useRouter from next-intl/navigation for active nav/locale switching
    - Sticky header with scroll-detection (transparent→bg-white/80 backdrop-blur)

key-files:
  created:
    - apps/marketing/package.json
    - apps/marketing/tsconfig.json
    - apps/marketing/next.config.ts
    - apps/marketing/postcss.config.js
    - apps/marketing/proxy.ts
    - apps/marketing/src/i18n/routing.ts
    - apps/marketing/src/i18n/request.ts
    - apps/marketing/src/i18n/navigation.ts
    - apps/marketing/src/lib/utils.ts
    - apps/marketing/tailwind.config.ts
    - apps/marketing/app/globals.css
    - apps/marketing/app/layout.tsx
    - apps/marketing/app/[locale]/layout.tsx
    - apps/marketing/app/[locale]/not-found.tsx
    - apps/marketing/app/robots.ts
    - apps/marketing/components/layout/container.tsx
    - apps/marketing/components/layout/section.tsx
    - apps/marketing/components/layout/header.tsx
    - apps/marketing/components/layout/footer.tsx
    - apps/marketing/components/layout/mobile-menu.tsx
    - apps/marketing/components/navigation/nav-link.tsx
    - apps/marketing/components/navigation/language-switcher.tsx
    - apps/marketing/components/ui/page-header.tsx
  modified: []

key-decisions:
  - "Used PATTERNS.md exact next.config.ts pattern with createNextIntlPlugin + velite build hook — velite runs before the dev/build server starts via VELITE_STARTED env var guard"
  - "Tailwind config omits darkMode entirely (darkMode: false) — marketing is light-first per D-07"
  - "CSS variable prefix --marketing-* distinguishes from dashboard's --shadcn-* vars, preventing token collision when both apps run in the monorepo"
  - "Locale layout uses async params pattern (params: Promise<{locale}>) — Next.js 14.2 recommended pattern for App Router"
  - "Header scroll detection uses passive scroll event listener with 100px threshold — matches UI-SPEC responsive navigation pattern"
  - "LanguageSwitcher uses a native <select> element (not a custom dropdown) — avoids needing Radix UI packages in marketing app per D-10"

patterns-established:
  - "Locale layout: hasLocale check → notFound || setRequestLocale → getMessages → dir computation → <html lang dir> → NextIntlClientProvider"
  - "Marketing component cn() utility: clsx + tailwind-merge (identical to dashboard pattern)"
  - "Sticky header: useEffect passive scroll listener → scrolled state → conditional bg-white/80 backdrop-blur-md"

requirements-completed: [WEB-04, WEB-08]

# Metrics
duration: 52min
completed: 2026-07-16
---

# Phase 07: Public Presence — Plan 04 Summary

**Next.js 14 marketing app scaffold with next-intl i18n routing (6 locales, prefix-based, RTL for Arabic), Tailwind light-first theme with marketing CSS variables, locale-aware layouts with JSON-LD, and 8 shared layout/navigation components**

## Performance

- **Duration:** 52 min
- **Started:** 2026-07-16
- **Completed:** 2026-07-16
- **Tasks:** 5
- **Files modified:** 23 (all created)

## Accomplishments

- Marketing app package manifest with all dependencies (next, next-intl, velite, satori, sharp, tailwind, @repo/design)
- next-intl v4 routing infrastructure: defineRouting (6 locales), getRequestConfig (dynamic message import), createNavigation (Link, redirect, usePathname, useRouter), createMiddleware (locale routing)
- Tailwind configuration with light-first theme, IBM Plex Sans / JetBrains Mono fonts, display 40px extension, fade-in/slide-up/fade-up animations, tailwindcss-animate and @tailwindcss/typography plugins
- Global CSS with all --marketing-* CSS custom properties (bg, foreground, muted, border, primary, ring, success, destructive, warning, radii, container), Google Fonts import, bg-grid utility, scrollbar-hide, and prefers-reduced-motion disable
- Root layout with metadata/icons/viewport and Organization JSON-LD structured data
- Locale layout with RTL support for Arabic (dir="rtl"), NextIntlClientProvider, generateStaticParams for SSG
- 404 page and robots.ts for SEO basics
- 8 shared components: Container (max-w-7xl wrapper), Section (3 bg variants), Header (sticky with scroll detection), Footer (4-column responsive grid), MobileMenu (slide-down panel), NavLink (active state + hover underline), LanguageSwitcher (next-intl select), PageHeader (heading + subheading)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create package.json, tsconfig.json, next.config.ts, postcss.config.js** — `68a3e02` (feat)
2. **Task 2: Create next-intl i18n routing infrastructure** — `ee1a89c` (feat)
3. **Task 3: Create globals.css, tailwind.config.ts, and cn() utility** — `4a06bb0` (feat)
4. **Task 4: Create layouts (root + locale) and skeleton pages** — `14f677e` (feat)
5. **Task 5: Create shared layout components and navigation** — `3c6f4d7` (feat)

**Plan metadata:** (pending self-check commit)

## Files Created

| File | Purpose |
|------|---------|
| `apps/marketing/package.json` | Package manifest with scripts and dependencies |
| `apps/marketing/tsconfig.json` | TypeScript config extending nextjs.json |
| `apps/marketing/next.config.ts` | Next.js config with next-intl + velite plugins |
| `apps/marketing/postcss.config.js` | PostCSS with Tailwind + Autoprefixer |
| `apps/marketing/proxy.ts` | next-intl middleware for locale routing |
| `apps/marketing/src/i18n/routing.ts` | Locale routing config (6 locales, prefix) |
| `apps/marketing/src/i18n/request.ts` | Request config with dynamic message loading |
| `apps/marketing/src/i18n/navigation.ts` | Navigation wrappers (Link, redirect, usePathname, useRouter) |
| `apps/marketing/src/lib/utils.ts` | cn() helper with clsx + tailwind-merge |
| `apps/marketing/tailwind.config.ts` | Tailwind with marketing theme, IBM Plex Sans, animations |
| `apps/marketing/app/globals.css` | Global CSS with --marketing-* vars, bg-grid, reduced motion |
| `apps/marketing/app/layout.tsx` | Root shell with metadata, viewport, JSON-LD |
| `apps/marketing/app/[locale]/layout.tsx` | Locale layout with RTL, NextIntlClientProvider |
| `apps/marketing/app/[locale]/not-found.tsx` | 404 page |
| `apps/marketing/app/robots.ts` | Robots config allowing all crawlers |
| `apps/marketing/components/layout/container.tsx` | Max-w-7xl centered wrapper |
| `apps/marketing/components/layout/section.tsx` | Section with default/alt/dark bg variants |
| `apps/marketing/components/layout/header.tsx` | Sticky header with scroll, nav, language, CTA |
| `apps/marketing/components/layout/footer.tsx` | 4-column footer with language-switcher, copyright |
| `apps/marketing/components/layout/mobile-menu.tsx` | Slide-down mobile nav panel |
| `apps/marketing/components/navigation/nav-link.tsx` | Active-aware nav link with hover underline |
| `apps/marketing/components/navigation/language-switcher.tsx` | Locale select using next-intl hooks |
| `apps/marketing/components/ui/page-header.tsx` | Reusable heading + subheading |

## Decisions Made

- **Used PATTERNS.md exact next.config.ts pattern** with createNextIntlPlugin + velite build hook (VELITE_STARTED env var guard prevents double execution)
- **Tailwind config omits darkMode entirely** (darkMode: false) — marketing site is light-first per D-07 and UI-SPEC
- **CSS variable prefix --marketing-*** distinguishes from dashboard's --shadcn-* vars, preventing token collision in the monorepo
- **Locale layout uses async params pattern** (params: Promise<{locale}>) — Next.js 14.2 recommended pattern for App Router
- **Header scroll detection** uses passive scroll event with 100px threshold matching UI-SPEC responsive navigation pattern
- **LanguageSwitcher uses native <select>** rather than custom dropdown — avoids needing Radix UI packages in marketing app per D-10
- **LanguageSwitcher uses next-intl hooks** (usePathname, useRouter, useLocale) for locale switching with route preservation — matches PATTERNS.md LocaleSwitcher pattern

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — all files created without issues.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Complete marketing app scaffold with package manifest, TypeScript, i18n routing, Tailwind theme, and global CSS
- Locale-aware layout infrastructure handles all 6 locales with RTL for Arabic
- 8 layout/navigation components ready to be consumed by landing page, pricing page, blog, and contact form
- Messages directory created at `apps/marketing/messages/` — needs locale JSON files for translations
- Ready for **Plan 07-05**: Landing page — hero section, feature showcase, trust bar, testimonials, CTA section

## Self-Check: PASSED

- [x] All 23 files exist on disk
- [x] All 5 commits present in git log
- [x] SUMMARY.md created with substantive content

---

*Phase: 07-public-presence*
*Completed: 2026-07-16*
