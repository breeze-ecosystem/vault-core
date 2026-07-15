# Phase 7: Public Presence - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

<domain>
## Phase Boundary

A public-facing marketing website that presents Oversight Hub as an international, AI-first, premium security platform with clear pricing, compelling content, and global reach. Includes landing page, pricing page, MDX blog, multi-language (6 locales), SEO, and contact form.

Covers WEB-01 through WEB-08 from REQUIREMENTS.md. The website is a separate Next.js app (`apps/marketing/`) deployed on `oversighthub.com`, visually consistent with the dashboard via a shared `@repo/design` token package but using a lighter marketing-appropriate theme.

**Key constraint:** Phase 5 settled on pure licensing (no Stripe/PayPal). WEB-02 and SC-2's "Stripe checkout links" are superseded — pricing page uses "Contact Sales" CTAs instead.
</domain>

<decisions>
## Implementation Decisions

### Pricing Page Model (WEB-02)
- **D-01:** License tiers with "Contact Sales" CTAs — no Stripe checkout, no invoice link. Purchase happens outside the app (sales conversation, wire, etc.).
- **D-02:** Three tiers: Starter (device-limited), Professional (higher limits), Enterprise (unlimited + priority).
- **D-03:** Two primary CTAs: "Book a Demo" + "Contact Sales" — both on the pricing page and hero section.

### Website Architecture (WEB-07, WEB-08)
- **D-04:** Separate Next.js 14 app at `apps/marketing/` — not a subdirectory or subdomain of the Dashboard.
- **D-05:** Marketing site lives on `oversighthub.com` (separate domain). Dashboard remains accessible at a subdomain (e.g., `app.oversighthub.com`) or subdirectory.
- **D-06:** New Dockerfile at `docker/website.Dockerfile` — multi-stage build with standalone Next.js output, independent from Dashboard's Dockerfile.

### Design System Reuse (WEB-07)
- **D-07:** Marketing site is a **brand extension** — same brand DNA, typography (Inter), and color palette but adapted for marketing: lighter backgrounds, larger hero imagery, more whitespace. Not the dark-first dashbpard aesthetic.
- **D-08:** Shared design tokens extracted to a new `@repo/design` package (CSS custom properties + JS constants). Consumed by both Dashboard and marketing site.
- **D-09:** CSS animations for most interactions (hovers, scroll reveals, micro-interactions). `motion` (from Phase 6) used only for hero section page transitions and showcase carousels — lighter JS bundle.
- **D-10:** Build marketing-specific local components (hero, feature showcase, testimonial, pricing card, CTA sections). Do NOT extend `@repo/ui` — it contains Button/Card/Code which serve a different purpose.
- **D-11:** Subtle AI-first visual touches (animated grid background, gradient accents) — not the full dashboard aesthetic (no CRT scan lines, no heavy glassmorphism).

### Blog Content (WEB-03)
- **D-12:** MDX via velite — developer-authored, version-controlled. No headless CMS. Content is statically generated at build time.
- **D-13:** Blog content localization: canonical posts authored in English, professionally translated to all 6 locales. Each locale gets its own `/{locale}/blog/{slug}` URL.

### Multi-Language (WEB-04)
- **D-14:** `next-intl` for marketing site i18n. Separate translation files from Dashboard's custom I18nProvider — marketing copy and admin UI terms have no overlap.
- **D-15:** Locale routing via `next-intl` `/fr/pricing`, `/es/pricing` prefix pattern. SEO-friendly with hreflang annotations.
- **D-16:** Full RTL layout support for Arabic via `next-intl` direction API. Essential for a premium international brand.
- **D-17:** English is the primary locale for marketing content (authored first). French is secondary per WEB-04's "French (primary)" note but English is the global business language for a marketing site.
- **D-18:** Translation workflow: JSON files in `apps/marketing/messages/{locale}.json` — standard next-intl pattern. Version-controlled, managed via PRs.

### Contact Form (WEB-06)
- **D-19:** Form POSTs to a NestJS API endpoint (`POST /api/contact`) — reuses existing Resend SDK integration, audit logging, and rate limiting.
- **D-20:** Minimal form fields: Name, Email, Message, optional Company. Low friction for leads.
- **D-21:** Cloudflare Turnstile for spam protection — privacy-friendly, invisible, GDPR-compliant. Not reCAPTCHA (Google dependency).

### SEO & Performance (WEB-05)
- **D-22:** Rendering strategy: SSG for landing and pricing pages (static generation at build time), ISR for blog (revalidation ~10 minutes for content freshness).
- **D-23:** Static OG images per page category (landing, pricing, blog) with page title overlay. Generated at build time.
- **D-24:** Privacy-focused analytics — Plausible or Umami (self-hosted). No Google Analytics, no cookie consent banner needed.
- **D-25:** Full JSON-LD structured data: Organization schema, SoftwareApplication schema, BlogPosting schema for posts, FAQ schema for pricing page.
- **D-26:** One sitemap per locale (`sitemap-en.xml`, `sitemap-fr.xml`, etc.) with cross-locale hreflang annotations and `x-default`. All blog posts × all locales included.

### Agent Discretion
- Exact landing page sections and layout (hero, features, trust, testimonials, CTA flow) — standard marketing/saas patterns, fit to Oversight Hub's brand.
- Blog post categories (changelog, security insights, product updates per WEB-03).
- Contact form email template design (Resend template).
- JSON-LD exact schema markup details (standard Schema.org patterns).
- Sitemap generation implementation (next-sitemap or manual generation).
- Turnstile site key env var naming convention.
- Blog MDX file structure and velite configuration.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Definition
- `.planning/ROADMAP.md` — Phase 7 definition, WEB-01 to WEB-08, success criteria, dependencies on Phase 5/6
- `.planning/REQUIREMENTS.md` — Full requirement text for WEB-01 through WEB-08
- `.planning/PROJECT.md` — Project constraints, key decisions, tech stack boundaries

### State & Prior Decisions
- `.planning/STATE.md` — Current phase status, accumulated decisions from prior phases
- `.planning/phases/05-monetization/05-CONTEXT.md` — D-01 (pure licensing = no Stripe), D-06 to D-08 (license claim structure: maxCameras, maxDoors — referenced by pricing page)
- `.planning/phases/06-premium-experience/06-CONTEXT.md` — D-01 to D-04 (design system: Radix Themes + Tailwind + CSS vars), D-05 to D-06 (motion for animations)

### Architecture & Code Patterns
- `.planning/codebase/STRUCTURE.md` — Dashboard app structure, component locations, Docker setup, Caddy routing
- `.planning/codebase/CONVENTIONS.md` — Naming, React component style, Next.js patterns, import organization
- `.planning/codebase/STACK.md` — Technology stack: Next.js 14, Tailwind CSS 3, pnpm monorepo, Turborepo

### Source Code (Key Files)
- `apps/dashboard/app/globals.css` — CSS custom properties, animated grid background, glass effects (reference for @repo/design tokens)
- `apps/dashboard/lib/utils.ts` — `cn()` utility pattern (clsx + tailwind-merge)
- `apps/dashboard/lib/i18n/` — Existing I18nProvider pattern (reference, not shared with marketing site)
- `apps/dashboard/tailwind.config.ts` — Tailwind configuration pattern (extend, colors, animations)
- `apps/dashboard/app/layout.tsx` — Root layout pattern (HTML shell, dark theme)
- `docker/dashboard.Dockerfile` — Reference pattern for marketing site Dockerfile
- `Caddyfile` — Current routing rules (will add oversighthub.com routing)
- `docker-compose.yml` — Current service definitions (will add marketing service)
- `turbo.json` — Task pipeline (will add marketing build/lint/dev tasks)
- `apps/api/src/modules/notification/` — Resend SDK integration (contact form delivery channel)
- `apps/api/src/modules/health/` — Pattern for lightweight module (contact module follows same pattern)
- `pnpm-workspace.yaml` — Will add `apps/marketing` package

### Dependencies to Add
- `next-intl` — Internationalization (new dependency for marketing app)
- `velite` — MDX content layer (new dependency for blog)
- `@radix-ui/themes` — Only if integrating Radix Themes from Phase 6; otherwise CSS-only tokens via @repo/design
- `@vercel/og` or `satori` — OG image generation (static template approach)
- `@cloudflare/turnstile` — Contact form spam protection
- `@repo/design` — New shared design token package (to be created)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Dashboard globals.css** (`apps/dashboard/app/globals.css`): Animated grid background (`bg-grid`), glass utilities — visual patterns to adapt for marketing site's subtle AI-first touches
- **Resend SDK integration** (`apps/api/src/modules/notification/`): Existing email delivery — contact form reuses this via new `/api/contact` endpoint
- **LanguageSwitcher component** (`apps/dashboard/components/language-switcher.tsx`): Reference pattern for locale switcher on marketing site (will rebuild with next-intl)
- **I18nProvider** (`apps/dashboard/lib/i18n/`): Reference pattern — marketing uses next-intl instead but structure informs translation key organization
- **Tailwind config** (`apps/dashboard/tailwind.config.ts`): `tailwindcss-animate` plugin, custom animations — marketing site's Tailwind config extends similarly

### Established Patterns
- **Next.js App Router**: Pages and layouts in `app/` directories — marketing site follows same convention
- **Tailwind + cn()**: Utility-first styling with clsx + tailwind-merge — marketing site uses the same approach
- **Monorepo with Turborepo**: New `apps/marketing/` gets a `turbo.json` pipeline entry for build/lint/dev/check-types
- **Docker multi-stage builds**: `docker/*.Dockerfile` pattern with deps → build → production runner stages
- **Caddy reverse proxy**: Single Caddyfile routes based on hostname — add oversighthub.com block alongside existing routing

### Integration Points
- **Caddyfile**: Add `oversighthub.com` host block routing to marketing service
- **docker-compose.yml**: Add `marketing` service (build from `docker/website.Dockerfile`, port mapping, env vars)
- **turbo.json**: Add `marketing#build`, `marketing#dev`, `marketing#lint`, `marketing#check-types` pipeline entries
- **pnpm-workspace.yaml**: Add `apps/marketing` to workspace packages
- **New NestJS module**: `apps/api/src/modules/contact/` — lightweight module handling form submission → Resend email
- **New API DTO**: `packages/shared/src/schemas/contact.schema.ts` — Zod schema for contact form validation
- **Env vars**: `CONTACT_API_URL` (marketing → API endpoint), `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_CONTACT_FROM` or similar
- **Docker networking**: Marketing container needs network access to API container for contact form POST

### Creative Options
- Marketing site can use `next-intl` middleware for locale detection/redirect — standard approach
- Blog MDX directory can be `apps/marketing/content/blog/{locale}/` with velite processing into type-safe content
- Contact form can use Resend's React Email templates for branded email rendering
- OG images can use `satori` (JSX→SVG→PNG) for typed component-based templates
- Analytics self-hosting options: Umami (simpler, single binary) vs Plausible (requires Postgres/Clickhouse)
</code_context>

<specifics>
## Specific Ideas

Key preferences from discussion:
- Premium, international brand feel — not just a basic landing page
- Separate marketing identity from dashboard while sharing brand DNA (lighter, more approachable)
- Developer-friendly with version-controlled content (no CMS, no external services for core content)
- Self-hosted ethos extends to analytics choice (Plausible/Umami over GA4)
- Professional translation approach — quality matters for technical security content
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 7 scope.
</deferred>

---

*Phase: 7-Public-Presence*
*Context gathered: 2026-07-16*
