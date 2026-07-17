# Phase 4: Marketing Site Redesign - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Marketing site transformed into a premium visual showcase that tells a coherent product story — video surveillance, access control, AI analytics — with complete content (product pages, industry solutions, case studies), an interactive demo, and full 6-language consistency. Independent frontend work — no backend or infrastructure dependencies.

Requirements: MKT-01, MKT-02, MKT-03, MKT-04 from REQUIREMENTS.md.

**In scope:** Premium dark-theme redesign with glassmorphism accents, interactive feature tour on dedicated `/demo` page, new route segments for products/solutions/case studies, French-first translations with RTL support for Arabic.
**Out of scope:** Live sandbox environment (MKT-05, deferred to v3.1), documentation section (MKT-06, deferred to v3.1), Dashboard or Mobile app redesigns (separate phases).

</domain>

<decisions>
## Implementation Decisions

### Design Identity
- **D-01:** Marketing site has a **distinct visual identity** from the Dashboard — own brand language, colors, fonts, animations. Not reusing shadcn/ui or Dashboard design tokens.
- **D-02:** **Dark tech premium** direction — deep navy/cyber backgrounds, cyan/teal accent, glassmorphism panels, fluid scroll animations. Linear/Vercel/Stripe quality bar.
- **D-03:** **Full glassmorphism suite** — backdrop blur panels, gradient borders, animated grid/particle backgrounds, subtle noise textures.
- **D-04:** **Dark-only** theme. No light mode toggle.
- **D-05:** Update and wire `packages/design/src/marketing.ts` tokens to the new dark premium direction instead of deleting them.

### Hero & Visual Moments
- **D-06:** **Mixed hero approach** — the hero section has a WOW animated/interactive focal point (animated product mockup or interactive background). The rest of the narrative sections remain predominantly clean and polished, with **1-2 strategic WOW moments** (e.g., an animated stats counter, a platform-in-action section). Every section gets at least one subtle micro-animation.

### Typography
- **D-07:** Replace existing IBM Plex Sans with **Inter** (body) + **geometric display** (headings — Plus Jakarta Sans or Satoshi). Keep JetBrains Mono for code/data.

### Interactive Demo (MKT-04)
- **D-08:** **Clickable screenshot tour** — polished custom mockups of the Dashboard overlaid with step-by-step tooltip narration. Not a live sandbox.
- **D-09:** **Single end-to-end narrative** — start with an access event, follow through video evidence, AI analysis, alert dispatch, and resolution.
- **D-10:** **Dedicated `/demo` page** accessible from hero CTA and navigation.
- **D-11:** **Custom polished mockups** (not real Dashboard screenshots) — designer-crafted to highlight the best product moments.

### Content Architecture (MKT-02)
- **D-12:** **Separate route segments** — Products (`/produits`), Solutions (`/solutions`), Case studies (`/etudes-de-cas`). Not single-page sections.
- **D-13:** **Full scope** for Phase 4 shipment:
  - Products overview page + 4 capability sub-pages (Video, Access Control, AI, Analytics)
  - Solutions overview page + **Enterprise Campuses & Critical Infrastructure** industry page
  - Case studies listing page + 2 sample case studies
- **D-14:** Existing pages preserved: Blog, Contact, Pricing.

### Animation Depth
- **D-15:** **Subtle micro-animations** (Linear-style) — fade-up on scroll, hover scale on cards, smooth section transitions. Not a narrative scroll-journey.
- **D-16:** Animated elements: **major section pieces only** — hero entrance, section titles/subtitles, feature cards, stats counters, CTA sections.

### Rebuild Strategy
- **D-17:** **In-place refactor** — evolve the existing `apps/marketing/` app. Replace components, update Tailwind config, add new pages directly. No parallel build.

### Internationalization (MKT-03)
- **D-18:** **French-first** workflow — all new content written in French first, then translated to the other 5 locales (EN, ES, DE, JA, AR). Professional translation service for non-FR locales.
- **D-19:** **Full RTL support** for Arabic (ar) — mirrored layout, right-aligned text, flipped animations and icons.

### Agent's Discretion
- Exact font files and integration (Inter via next/font + geometric display)
- Glassmorphism implementation details (CSS vs Tailwind utilities)
- Scroll animation timing and easing curves
- Feature tour step count and content flow
- Mockup tooling and format (Figma exports, static screens)
- ZPL template design for badge layout (kiosk carry-over if needed)
- RTL implementation approach (CSS logical properties vs manual mirroring)
- Blog/posts MDX content for velite
- SEO metadata strategy per page
- OG image generation (satori is already in the stack)
- Contact form and pricing page polish (existing pages)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` — Phase 4 definition, success criteria, MKT requirement mapping
- `.planning/REQUIREMENTS.md` — MKT-01 through MKT-04 requirement descriptions

### Marketing Site (existing codebase — read before modifying)
- `apps/marketing/` — Full marketing site app
- `apps/marketing/app/[locale]/page.tsx` — Current homepage structure (Header, Hero, FeatureShowcase, AIHighlightSection, TestimonialCarousel, StatsSection, CTA, Footer)
- `apps/marketing/app/[locale]/layout.tsx` — Locale layout with next-intl provider
- `apps/marketing/app/[locale]/blog/` — Blog using velite MDX
- `apps/marketing/app/[locale]/pricing/` — Pricing page
- `apps/marketing/app/[locale]/contact/` — Contact form
- `apps/marketing/components/landing/` — Landing page components (hero-section, feature-showcase, ai-highlight-section, testimonial-carousel, stats-section, cta-section, trust-bar, feature-card, etc.)
- `apps/marketing/components/layout/` — Header and Footer
- `apps/marketing/messages/` — 6 locale JSON files (ar.json, de.json, en.json, es.json, fr.json, ja.json)
- `apps/marketing/tailwind.config.ts` — Current Tailwind config with HSL CSS variables, IBM Plex Sans font, custom animations
- `apps/marketing/velite.config.ts` — Velite content collection config
- `apps/marketing/next.config.mjs` — Next.js config

### Design Tokens
- `packages/design/src/marketing.ts` — Existing marketing theme tokens (to be updated and wired)

### Codebase Architecture
- `.planning/codebase/CONVENTIONS.md` — File naming, component patterns, import organization
- `.planning/codebase/STACK.md` — Language/runtime versions, dependencies (next-intl, motion, velite, next/font, tailwind)
- `.planning/codebase/STRUCTURE.md` — Directory structure, where to add new pages

### Prior Phase Context
- `.planning/phases/003-visitor-kiosk/003-CONTEXT.md` — D-27: French (fr) is default locale
- `.planning/phases/02-hardware-integration/02-CONTEXT.md` — Reference for hardware content (video, access control, AI analytics)
- `.planning/phases/01-infrastructure-foundation/01-CONTEXT.md` — Reference for infrastructure content

No external specs — requirements fully captured in REQUIREMENTS.md and decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`motion` (framer-motion)** — Already at `apps/marketing/` dependency. Use for scroll-triggered micro-animations (D-15, D-16).
- **`next-intl`** — i18n already set up with 6 locale JSON files and routing. New messages add to existing structure.
- **`velite` + MDX** — Blog content pipeline exists. Can extend for case studies if needed.
- **`@tailwindcss/typography`** — Already configured for prose content styling.
- **`satori`** — OG image generation already available.
- **Existing layout system** — Header, Footer, locale layout, CSS variables structure.

### Established Patterns
- **Dark theme via CSS variables** — Marketing already uses HSL CSS variables for full theme control. D-04 (dark-only) simplifies by removing `darkMode: 'media'`.
- **next-intl routing** — `[locale]` route segment with `setRequestLocale`, `generateStaticParams`. New pages follow the same pattern.
- **Component-per-section** — Each landing section is a separate component in `components/landing/`. Easy to replace incrementally (D-17).

### Integration Points
- **New pages** — Add route directories under `apps/marketing/app/[locale]/produits/`, `/solutions/`, `/etudes-de-cas/`, `/demo/`.
- **Navigation** — Update Header and footer nav links for new routes.
- **Messages** — Add new translation keys to all 6 locale JSON files in `messages/`.
- **Sitemap** — Update `apps/marketing/app/sitemap.ts`.
- **Caddy** — No changes needed (marketing domain routing unchanged).
- **Docker** — No changes needed (existing `docker/website.Dockerfile` stays).

### Creative Opportunities
- Premium dark design with glassmorphism could become the new brand standard — Dashboard could borrow the color palette in a future phase.
- RTL infrastructure added for Arabic could be reused if other RTL languages are added later.
- The interactive tour format could become reusable — create a `<FeatureTour>` component once, reuse for product sub-pages.

</code_context>

<specifics>
## Specific Ideas

- **"Every section must have at least one WOW effect"** — not every section is animated, but each should have a memorable visual moment (could be a transform, an animation, a gradient treatment, a stats counter, etc.)
- **Linear/Vercel quality bar** — subtle animations that make the page feel alive without being distracting

</specifics>

<deferred>
## Deferred Ideas

- **Live demo sandbox (MKT-05)** — Deferred to v3.1. Phase 4 ships a clickable screenshot tour instead.
- **Documentation section (MKT-06)** — Deferred to v3.1. API docs, admin guides, installation manuals.
- **Healthcare & Logistics industry pages** — More industry solutions can be added in future phases.
- **Event badge creation at kiosk** — Already deferred in Phase 3 context.

</deferred>

---

*Phase: 4-Marketing Site Redesign*
*Context gathered: 2026-07-17*
