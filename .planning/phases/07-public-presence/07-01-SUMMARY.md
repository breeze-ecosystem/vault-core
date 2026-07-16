---
phase: 07-public-presence
plan: 01
subsystem: design
tags: [marketing, design-tokens, turbo, env, monorepo]

requires: []
provides:
  - Marketing-specific design tokens (@repo/design marketing extension)
  - 4xl (96px) spacing token for generous marketing whitespace
  - Turborepo pipeline tasks for apps/marketing
  - Turnstile + contact form environment variables in .env.example
affects: [07-02, 07-03, 07-04]

tech-stack:
  added: []
  patterns:
    - marketingTheme const object extending @repo/design with lighter surface colors, marketing typography (display 40px, body 16px), and Tailwind utility spacing strings
    - Turborepo .velite/** output in marketing#build for velite-generated content

key-files:
  created:
    - packages/design/src/marketing.ts
  modified:
    - packages/design/src/spacing.ts
    - packages/design/src/index.ts
    - turbo.json
    - .env.example

key-decisions:
  - "marketingTheme uses hex color values matching @repo/design brand (primary #06b6d4, success #10b981, warning #f59e0b, destructive #ef4444)"
  - "marketing#build outputs include .velite/** alongside .next/** for velite-based content generation"
  - "Both Turnstile keys default to Cloudflare test keys for local development — no Cloudflare account needed to run marketing site"
  - "CONTACT_NOTIFICATION_EMAIL is [REQUIS] to ensure contact form submissions reach a real inbox"

requirements-completed: [WEB-07, WEB-04]

duration: 1min
completed: 2026-07-16
---

# Phase 7 Plan 1: Marketing Design Tokens & Monorepo Pipeline Summary

**Marketing-specific design token extension (@repo/design) with lighter brand colors, 4xl spacing scale, marketing typography, Turborepo pipeline tasks, and Turnstile/contact form environment variables**

## Performance

- **Duration:** 1 min
- **Started:** 2026-07-16T00:42:15Z
- **Completed:** 2026-07-16T00:42:58Z
- **Tasks:** 3
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- **Marketing design tokens** — Created `packages/design/src/marketing.ts` with `marketingTheme` const object containing `colors` (hero, surface, text, accent groups), `spacing` (section/container Tailwind utilities), and `typography` (display: 40px, heading: 24px, body: 16px, small: 14px)
- **Spacing scale extension** — Added `xxxxl: 96` to the `@repo/design` spacing scale for 4xl marketing whitespace between major page sections
- **Barrel export** — Added `export * from "./marketing"` to `packages/design/src/index.ts` so consumers can import `marketingTheme` from `@repo/design`
- **Turborepo pipeline** — Added `marketing#build` (with `.velite/**` outputs for velite content), `marketing#dev`, `marketing#lint`, and `marketing#check-types` to `turbo.json`
- **Environment variables** — Added MARKETING SITE section to `.env.example` with `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (both defaulting to Cloudflare test keys), and `CONTACT_NOTIFICATION_EMAIL` (marked REQUIS)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create marketing design tokens + update spacing scale** — `e1c1e21` (feat)
2. **Task 2: Add marketing build pipeline to turbo.json** — `f7c9db1` (feat)
3. **Task 3: Add marketing site and contact form env vars to .env.example** — `fd4b28f` (feat)

## Files Created/Modified

- `packages/design/src/marketing.ts` — Created: `marketingTheme` const with colors (hero, surface, text, accent), spacing (section/container Tailwind classes), typography (display/heading/body/small)
- `packages/design/src/spacing.ts` — Modified: Added `xxxxl: 96` for 4xl marketing whitespace
- `packages/design/src/index.ts` — Modified: Added `export * from "./marketing"` barrel export
- `turbo.json` — Modified: Added `marketing#build`, `marketing#dev`, `marketing#lint`, `marketing#check-types` to tasks pipeline
- `.env.example` — Modified: Added MARKETING SITE section with Turnstile keys and contact notification email

## Decisions Made

- **Turnstile test keys as defaults:** Both `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` default to Cloudflare's well-known test keys (`1x00000000000000000000AA` and `1x0000000000000000000000000000000AA`), which always pass verification. This lets developers run the marketing site locally without a Cloudflare account.
- **CONTACT_NOTIFICATION_EMAIL marked REQUIS:** Unlike the Turnstile keys (which work in test mode by default), the contact notification email must be configured for contact form submissions to reach anyone.
- **.velite/** in build outputs:** The `marketing#build` outputs include `.velite/**` alongside `.next/**` so Turborepo correctly caches velite-generated content from the marketing site's content layer.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None — no external service configuration required for this plan. The Turnstile keys default to test keys.

## Next Phase Readiness

- Marketing design token foundation complete — `marketingTheme` is importable from `@repo/design`
- Monorepo pipeline ready for `apps/marketing` package - `marketing#build/dev/lint/check-types` defined
- Environment variable template ready for marketing site and contact form
- Ready for **Plan 07-02**: Marketing site project scaffolding (apps/marketing, Next.js config, layout, routing, i18n)

---

*Phase: 07-public-presence*
*Completed: 2026-07-16*

## Self-Check: PASSED

- [x] All 3 tasks executed and committed
- [x] `packages/design/src/marketing.ts` — exists with `export const marketingTheme` (1 match)
- [x] `packages/design/src/spacing.ts` — contains `xxxxl: 96`
- [x] `packages/design/src/index.ts` — contains `export * from "./marketing"`
- [x] `turbo.json` — contains `marketing#build`, `marketing#dev`, `marketing#lint`, `marketing#check-types`, valid JSON
- [x] `.env.example` — contains `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `CONTACT_NOTIFICATION_EMAIL`
- [x] All 3 commits present in git log
- [x] SUMMARY.md created with substantive content
