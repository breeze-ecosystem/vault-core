---
phase: 05-launch-readiness
plan: 05
subsystem: docs
tags: velite, mdx, docs, i18n, crisp, support, chat, sla

requires:
  - phase: 05-launch-readiness (Plan 03)
    provides: Velite docs collection with category enum, docs route group at /[locale]/docs/ with index and [slug] pages

provides:
  - 10 technical documentation MDX files (5 EN + 5 FR) via Velite docs collection
  - Support page at /[locale]/support with contact cards and SLA commitments
  - Crisp chat widget embed component with locale auto-detection

affects:
  - 05-launch-readiness (Plan 06 — training slides reference support channels)

tech-stack:
  added: []
  patterns:
    - "Crisp script-based chat widget embed for Next.js App Router"
    - "Support page with contact cards, SLA terms, and escalation path in French"

key-files:
  created:
    - content/docs/en/installation-guide.mdx
    - content/docs/en/configuration-reference.mdx
    - content/docs/en/user-manual.mdx
    - content/docs/en/troubleshooting.mdx
    - content/docs/en/sla-support.mdx
    - content/docs/fr/guide-installation.mdx
    - content/docs/fr/reference-configuration.mdx
    - content/docs/fr/manuel-utilisateur.mdx
    - content/docs/fr/depannage.mdx
    - content/docs/fr/sla-support.mdx
    - app/[locale]/support/page.tsx
    - components/support/chat-widget.tsx
  modified: []

key-decisions:
  - "Use script-based Crisp embed (no npm package) per RESEARCH recommendation — simpler for Next.js App Router"
  - "Crisp widget loads conditionally only when NEXT_PUBLIC_CRISP_WEBSITE_ID is set — graceful degradation"
  - "Support page copy entirely in French per Phase 2 FR-primary language decision and UI-SPEC"
  - "SLA documentation includes specific commitments: 4h Niamey intervention, 24/7 coverage, priority email"

requirements-completed: [BAS-36, BAS-37, BAS-38]

duration: 12 min
completed: 2026-07-19
---

# Phase 5: Launch Readiness — Plan 05 Summary

**5 technical documentation articles (EN + FR), Crisp chat widget, and support page with SLA commitments on vault-app**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-19T09:15:42Z
- **Completed:** 2026-07-19T09:27:50Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- **10 documentation MDX files** created across 5 categories (installation-guide, configuration-reference, user-manual, troubleshooting, sla-support) in both English and French, sourced from existing vault-os materials (DEPLOY.md, install.sh, update.sh, backup.sh, .env.example, docker-compose.prod.yml, Caddyfile)
- **Configuration Reference** documents all ~50 env vars from .env.example in categorized Markdown tables with Required/Optional/Default/Description columns
- **Support page** at `/support` route with contact cards (chat widget, email with mailto:, hotline with tel:), SLA commitments section, escalation path, and cross-reference to docs
- **Crisp chat widget** component with script-based embed, graceful null fallback when Website ID is not configured, and locale auto-detection via `useLocale()` from next-intl
- All content verified with `npx velite build` and `npx next build` (both pass with exit code 0)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 10 technical documentation MDX files (5 EN + 5 FR)** — `1e91e04` (feat)
2. **Task 2: Create support page and Crisp chat widget component** — `6778d34` (feat)

## Files Created/Modified

- `content/docs/en/installation-guide.mdx` — EN deployment guide (prerequisites, Docker setup, production hardening)
- `content/docs/en/configuration-reference.mdx` — EN env var reference table (all .env.example variables)
- `content/docs/en/user-manual.mdx` — EN operator guide (dashboard, alerts, timeline, mobile app, user management)
- `content/docs/en/troubleshooting.mdx` — EN troubleshooting & FAQ (common issues, solutions, Q&A)
- `content/docs/en/sla-support.mdx` — EN SLA page (24/7 coverage, 4h Niamey, escalation, response times)
- `content/docs/fr/guide-installation.mdx` — FR deployment guide
- `content/docs/fr/reference-configuration.mdx` — FR configuration reference
- `content/docs/fr/manuel-utilisateur.mdx` — FR user manual
- `content/docs/fr/depannage.mdx` — FR troubleshooting & FAQ
- `content/docs/fr/sla-support.mdx` — FR SLA & support
- `components/support/chat-widget.tsx` — Crisp embed client component with locale detection
- `app/[locale]/support/page.tsx` — Support page server component with all content

## Decisions Made

- **Script-based Crisp embed** over npm package (`crisp-sdk-web`) — simpler for Next.js App Router, avoids dependency management, per RESEARCH recommendation
- **Conditional widget loading** — The CrispWidget component returns null when `NEXT_PUBLIC_CRISP_WEBSITE_ID` is not configured, enabling local dev without a Crisp account
- **French-only copy** — All support page labels and SLA terms use French per the Phase 2 decision (FR primary language for v1.0) and UI-SPEC copywriting contract
- **SLA specifics published** — The SLA page documents concrete commitments (4h on-site Niamey, 24/7 coverage, priority email) per PRICING-SPEC.md §4.7
- **Category-per-file naming** — Each category gets its own MDX file per the canonical ordering (installation → configuration → manual → troubleshooting → support)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Threat Surface Scan

No new threat surface beyond what was documented in the plan's `<threat_model>`. All threat register items are accepted/mitigated as specified:
- T-05-03 (Crisp widget): Widget shows only public contact info — accepted
- T-05-05 (Docs content): Docs are intentionally public — accepted
- T-P5-01 (MDX content): Content is version-controlled in git — mitigated
- T-P5-02 (Crisp CSP): Crisp loaded via client-side script — documented for CSP configuration
- T-P5-SC (Package installs): No new npm packages installed — mitigated

## Next Phase Readiness

- All 5 documentation categories now have content in both EN and FR
- Support page with Crisp widget and SLA terms is live
- Ready for **Plan 06** (training materials and update distribution)
- Crisp account still needs to be created and `NEXT_PUBLIC_CRISP_WEBSITE_ID` set before the widget will load in production (see user setup section)

## User Setup Required

**External services require manual configuration.** See [05-05-USER-SETUP.md](./05-05-USER-SETUP.md) for:
- Create Crisp account at crisp.chat
- Get Website ID from Crisp dashboard settings
- Set `NEXT_PUBLIC_CRISP_WEBSITE_ID` in vault-app .env

## Self-Check: PASSED

- ✅ All 12 created files exist on disk
- ✅ Both commits found in git log: `1e91e04`, `6778d34`
- ✅ `npx velite build` compiles all 10 docs with exit code 0 (no errors)
- ✅ `npx next build` compiles full project with exit code 0 (no errors)
- ✅ All acceptance criteria verified per task
- ✅ No threat surface beyond what's documented in plan's `<threat_model>`

---

*Phase: 05-launch-readiness*
*Completed: 2026-07-19*
