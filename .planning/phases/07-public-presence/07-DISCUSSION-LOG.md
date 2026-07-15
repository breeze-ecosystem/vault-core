# Phase 7: Public Presence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-16
**Phase:** 7-Public-Presence
**Areas discussed:** Pricing Page Model, Website Architecture, Design System Reuse, Blog Content Approach, Multi-Language Architecture, Contact Form Delivery, SEO & Performance Strategy, Blog Content Localization

---

## Pricing Page Model

| Option | Description | Selected |
|--------|-------------|----------|
| License tiers with 'Contact Sales' | Show license tier cards with per-device pricing, 'Contact Sales' CTA. Payment via sales. | ✓ |
| License tiers with invoice link | Show tiers with pricing and 'Buy Now' → invoice/order form. | |
| Self-hosted + BYO License | 'Download Oversight Hub, purchase a license, activate in dashboard.' | |

**User's choice:** License tiers with 'Contact Sales'
**Notes:** Explicitly resolved conflict between WEB-02 ("Stripe checkout") and Phase 5's pure-licensing model. No Stripe on the pricing page.

### Tiers

| Option | Description | Selected |
|--------|-------------|----------|
| Three tiers | Starter, Professional, Enterprise — maps to license claim limits | ✓ |
| Two tiers | Professional + Enterprise only | |
| Single + Enterprise | One standard tier + Enterprise | |

**User's choice:** Three tiers

### Demo CTA

| Option | Description | Selected |
|--------|-------------|----------|
| Book Demo + Contact Sales | Two primary CTAs | ✓ |
| Unified 'Get Started' | Single CTA → combined form | |
| No demo CTA | Contact Sales only | |

**User's choice:** Book Demo + Contact Sales

---

## Website Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Separate Next.js app | `apps/marketing/` — independent deploy, SSG, separate Dockerfile | ✓ |
| Subdirectory of dashboard | Route group under `apps/dashboard/app/(marketing)/` | |
| Vite/static site | Lightweight, fastest build, cannot share React components | |

**User's choice:** Separate Next.js app in `apps/marketing/`

### Domain

| Option | Description | Selected |
|--------|-------------|----------|
| `oversighthub.com` | Separate domain, dashboard on `app.oversighthub.com` | ✓ |
| `oversighthub.com` with `/app` | Marketing at root, dashboard at `/app/*` | |
| `www.oversighthub.com` | Traditional www subdomain | |

**User's choice:** `oversighthub.com` (separate domain)

### Dockerfile

| Option | Description | Selected |
|--------|-------------|----------|
| New Dockerfile | `docker/website.Dockerfile` | ✓ |
| Same as Dashboard | Reuse `dashboard.Dockerfile` | |

**User's choice:** New `docker/website.Dockerfile`

---

## Design System Reuse

| Option | Description | Selected |
|--------|-------------|----------|
| Brand extension — lighter theme | Same brand DNA, lighter backgrounds, more whitespace | ✓ |
| Same dark theme | Exact same CSS vars as dashboard | |
| Fully independent brand | Separate color palette, typography | |

**User's choice:** Brand extension with lighter marketing theme

### Token Structure

| Option | Description | Selected |
|--------|-------------|----------|
| `@repo/design` package | New package exporting CSS/JS tokens | ✓ |
| Copy CSS vars | Manual copy from dashboard | |
| Import globals.css | Reference dashboard's globals.css | |

**User's choice:** New `@repo/design` package

### Animations

| Option | Description | Selected |
|--------|-------------|----------|
| CSS + minimal motion | Standard CSS for most interactions, motion for hero/transitions | ✓ |
| motion throughout | Consistent with Dashboard — heavier JS bundle | |

**User's choice:** CSS animations primarily, motion for hero/transitions

### Components

| Option | Description | Selected |
|--------|-------------|----------|
| Marketing-specific local components | Build local hero, showcase, testimonial, pricing, CTA sections | ✓ |
| Extend @repo/ui | Add marketing components to shared package | |
| Mix @repo/ui + local | Use @repo/ui Button/Card + local sections | |

**User's choice:** Build marketing-specific local components

### Typography

| Option | Description | Selected |
|--------|-------------|----------|
| Same Inter font | Consistent brand experience | ✓ |
| Distinct marketing font | Serif or display font for personality | |

**User's choice:** Same Inter font family

### AI Visual Theme

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle AI-first touches | Animated grid, gradient accents — not full dashboard aesthetic | ✓ |
| Full dashboard aesthetic | Glowing accents, CRT scan lines, glassmorphism everywhere | |
| Clean minimal | Standard SaaS landing page, no AI visual references | |

**User's choice:** Subtle AI-first touches

---

## Blog Content Approach

| Option | Description | Selected |
|--------|-------------|----------|
| MDX via velite | Developer-authored, version-controlled, SSG at build time | ✓ |
| Headless CMS | GUI-based editor for marketing team (Strapi/Contentful) | |
| Git-based MDX + CMS preview | MDX as source + lightweight CMS layer for non-developers | |

**User's choice:** MDX via velite (developer-authored)

---

## Multi-Language Architecture

### i18n Relationship

| Option | Description | Selected |
|--------|-------------|----------|
| Separate translation files | Dashboard keeps I18nProvider, marketing uses next-intl JSON files | ✓ |
| Shared i18n package | New packages/i18n/ with base translations + app-specific overrides | |
| Fully independent | Each app manages its own i18n independently | |

**User's choice:** Separate translation files per app

### Locale Routing

| Option | Description | Selected |
|--------|-------------|----------|
| `/{locale}/` prefix | `/fr/pricing`, `/es/pricing` — SEO-friendly with hreflang | ✓ |
| Subdomain per locale | `fr.oversighthub.com`, `es.oversighthub.com` | |
| No prefix | Browser-detect + cookie, single URL per page | |

**User's choice:** `next-intl` with `/{locale}/` prefix

### RTL for Arabic

| Option | Description | Selected |
|--------|-------------|----------|
| Full RTL layout | Mirror entire layout, flipped margins/grid, RTL-aware | ✓ |
| LTR with Arabic text | Content translated but layout stays LTR | |

**User's choice:** Full RTL layout

### Primary Locale

| Option | Description | Selected |
|--------|-------------|----------|
| English (recommended) | Global business language for marketing | ✓ |
| French (per WEB-04) | Matches requirements doc | |

**User's choice:** English primary, French secondary

### Translation Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| JSON files in messages/ | Standard next-intl pattern, version-controlled, PR-reviewed | ✓ |
| Spreadsheet-based | Google Sheets synced via build script | |
| Tolgee SDK | In-context real-time editing | |

**User's choice:** JSON files in `apps/marketing/messages/`

---

## Contact Form Delivery

| Option | Description | Selected |
|--------|-------------|----------|
| POST to NestJS API | Reuses existing Resend SDK, audit logging, rate limiting | ✓ |
| Next.js + Resend SDK | Direct from marketing site, simpler hop | |
| Third-party form service | Formspree/Web3Forms | |

**User's choice:** POST to NestJS API (`/api/contact`)

### Form Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal | Name, Email, Message + optional Company | ✓ |
| Full | Name, Email, Phone, Company, Job title, Message | |

**User's choice:** Minimal fields

### Spam Protection

| Option | Description | Selected |
|--------|-------------|----------|
| Cloudflare Turnstile | Privacy-friendly, invisible, GDPR-compliant | ✓ |
| Google reCAPTCHA v3 | Industry standard but Google dependency | |
| No protection | Rate limiting + honeypot only | |

**User's choice:** Cloudflare Turnstile

---

## SEO & Performance Strategy

### Rendering Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| SSG + ISR for blog | Landing/pricing static, blog ISR with ~10min revalidation | ✓ |
| Full SSG | Everything static, blog needs rebuild for updates | |
| Full ISR | All pages ISR with varying revalidation | |

**User's choice:** SSG for landing/pricing, ISR for blog

### OG Images

| Option | Description | Selected |
|--------|-------------|----------|
| Static per page type | One template per category (landing, pricing, blog) with title overlay | ✓ |
| Dynamic per blog post | Auto-generated per post × 6 locales | |
| Manual per page | Hand-crafted for key pages only | |

**User's choice:** Static OG images per page category

### Analytics

| Option | Description | Selected |
|--------|-------------|----------|
| Plausible/Umami | Privacy-focused, self-hosted, no cookie banner | ✓ |
| Google Analytics 4 | Industry standard, needs consent banner | |
| No analytics | No tracking at all | |

**User's choice:** Plausible or Umami (self-hosted, privacy-focused)

### JSON-LD

| Option | Description | Selected |
|--------|-------------|----------|
| Full structured data | Organization, SoftwareApplication, BlogPosting, FAQ schemas | ✓ |
| Basic only | Organization + breadcrumbs | |

**User's choice:** Full JSON-LD structured data

### Sitemap Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| One per locale + hreflang | Separate sitemap per locale with cross-locale annotations | ✓ |
| Single sitemap | All pages from all locales in one file | |

**User's choice:** One sitemap per locale with hreflang

### Blog in Sitemap

| Option | Description | Selected |
|--------|-------------|----------|
| All blog posts | Every post × each locale in sitemaps | ✓ |
| Landing + pricing only | Blog index only, posts excluded | |

**User's choice:** All blog posts in sitemap

---

## Blog Content Localization

| Option | Description | Selected |
|--------|-------------|----------|
| Canonical + professional translation | One canonical post per topic (English), professionally translated | ✓ |
| Per-locale independent content | Each locale blogs independently about relevant topics | |
| Canonical + AI translation | Machine-translated, faster but lower quality | |

**User's choice:** Canonical posts (English) + professional translation to 6 locales

---

## Agent's Discretion

- Landing page exact section layout and content (hero, features, trust, testimonials, CTA flow)
- Blog post categories (changelog, security insights, product updates per WEB-03)
- Contact form email template design (Resend template)
- JSON-LD exact schema markup details (standard Schema.org patterns)
- Sitemap generation implementation (next-sitemap or manual generation)
- Turnstile site key env var naming convention
- Blog MDX file structure and velite configuration
- Exact Tailwind theme values in @repo/design (colors, spacing, shadows)

## Deferred Ideas

None — discussion stayed within Phase 7 scope.
