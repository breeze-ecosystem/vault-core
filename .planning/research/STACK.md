# Stack Research: v2.0 Commercial SaaS Platform

**Domain:** Physical security SaaS — multi-tenancy, subscription billing, premium UI, public website
**Researched:** 2026-07-15
**Confidence:** HIGH

## Scope

The v1.0 platform delivers NestJS API, Next.js Dashboard, Expo Mobile, PostgreSQL (Prisma), Redis (BullMQ), Ollama AI, JWT auth with RBAC, camera management, access control, and edge agents — all at single-tenant prototype quality. **This research covers only new technologies and stack changes needed to transform into a production-grade, multi-tenant, premium SaaS platform** with subscription billing, license management, a modern 2026 design system, and a public marketing website.

## Recommended Stack

### Multi-Tenancy Infrastructure

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `nestjs-cls` | 5.5.1 | Request-scoped continuation-local storage for tenant context propagation | The NestJS community standard for multi-tenant request scoping. Uses Node.js `AsyncLocalStorage` under the hood. Stores `tenantId` on every request without passing it through every service method signature. Integrates with Prisma via `ClsModule.forFeatureAsync` for tenant-aware database connections. Cleaner than middleware-only approaches because it survives across async boundaries (Promise chains, BullMQ workers, event emitters). |
| Prisma Client Extensions | 5.22.0 (existing) | Tenant-aware query filtering via `forCompany(tenantId)` extension | Uses PostgreSQL `SET config` session variables with Row-Level Security (RLS) policies. Each Prisma query automatically scoped to the current tenant via `app.current_company_id`. The Prisma blog and docs specifically recommend this pattern for multi-tenant SaaS — it's the officially blessed approach over separate schemas or connection pooling per tenant. Requires zero Prisma version upgrade. |
| PostgreSQL RLS | 16 (existing) | Database-level tenant isolation enforcement | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY; CREATE POLICY tenant_isolation ON ... USING (tenant_id = current_setting('app.current_company_id')::uuid);` — This is the defense-in-depth layer. Even if application code accidentally leaks a query without tenant scoping, PostgreSQL rejects it. Same PG instance, zero new infrastructure. |

**Why not separate databases per tenant?** Adds operational burden (N databases to migrate, back up, monitor). The platform targets medium-scale security teams (tens to hundreds of tenants, not millions). PostgreSQL RLS + Prisma extensions provide sufficient isolation for this scale. If a premium tier demands dedicated DB, that's a future decision — not needed for launch.

**Why not schema-per-tenant?** Prisma doesn't support dynamic schema switching at query time without hacks. The RLS + `app.current_company_id` pattern is the only Prisma-native approach for multi-tenancy.

### Subscription Billing

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `stripe` | 22.3.1 | Stripe payment processing — subscriptions, invoices, customer portal, webhooks | The gold standard for SaaS billing. v22 is the current stable (July 2026) with pinned API versioning — your TypeScript types always match the API version you're using. Features needed: Checkout Sessions for initial signup, Customer Portal for self-service plan management, webhooks for subscription lifecycle events (`customer.subscription.updated`, `invoice.paid`, `customer.subscription.deleted`), and `lookup_key` on Prices for stable plan references across environments. |
| `@paypal/paypal-server-sdk` | 2.4.0 | PayPal payment processing — orders, captures, subscription management | Official PayPal TypeScript SDK. Handles one-time purchases and subscription creation for customers who prefer PayPal over credit cards. Provides order creation, capture, and webhook verification. Used as secondary payment method — Stripe is primary (better subscription management), but PayPal captures international markets where PayPal dominates (Europe, Asia). |
| Raw `crypto` (Node.js built-in) | — | Webhook signature verification for both Stripe and PayPal | Both SDKs include verification functions (`stripe.webhooks.constructEvent`, SDK client verifier). No extra library needed. **Critical:** Must use raw request body (not parsed JSON) — Fastify raw body config required: `fastify.addContentTypeParser('application/json', { parseAs: 'string' }, ...)` for Stripe webhook routes. |

**Why not a NestJS Stripe wrapper module (e.g., `@golevelup/nestjs-stripe`)?** These community wrappers add abstraction without value for Stripe's already-clean SDK. They lag behind Stripe SDK releases (sometimes by months) and obscure type safety. Wrapping Stripe in a custom NestJS `StripeModule` (a `@Global()` module that configures and exports the Stripe client) is 20 lines of code and gives full control. Same strategy as the existing `PrismaModule`.

**Why not Chargebee/Recurly/Paddle?** These are billing abstraction layers that add another vendor dependency. For a self-hosted platform integrating directly with payment processors, direct Stripe + PayPal gives more control over the subscription lifecycle in the database and avoids vendor lock-in. Paddle is appealing for EU VAT handling but adds 5%+ transaction fee overhead and requires Paddle-hosted checkout (less control over UX).

### License Management

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `jose` | 5.10.0 | JWT-based license token generation, signing, and verification | Modern, lightweight JWT library (successor to `jsonwebtoken`). Used to create cryptographically signed license tokens that contain: `tenantId`, `planTier`, `maxCameras`, `maxSites`, `expiresAt`, `featureFlags`. Signed with RS256 (asymmetric — private key signs on license server, public key validates in deployed instance). No dependency on the `jsonwebtoken` auth system — separate key pair for licenses. |
| `uuid` | 10.0.0 (existing) | Unique license key identifiers | Already in stack. License keys are UUIDs (human-readable) mapping to signed JWT tokens in the database. |

**License architecture:** Licenses are JWTs signed by a central license server (or manually via CLI for air-gapped deployments). The deployed instance validates the license on startup and periodically (every 6 hours via BullMQ repeatable job). License expiration triggers grace period (7 days with dashboard warnings) then feature degradation (new cameras/events rejected, existing data read-only). This avoids a hard cutoff that locks customers out of their security system.

**Why not a hardware dongle / HASP approach?** The constraint says self-hosted Docker — hardware dongles are incompatible with containerized deployment. JWT-based licenses provide cryptographic certainty (tamper-proof) while being deployment-agnostic.

**Why not a SaaS-only license server with internet check-in?** The platform must work air-gapped (self-hosted constraint). The JWT approach works offline — the token is self-validating. Optional online license validation can be layered on (check for revocation, newer license), but offline fallback is mandatory.

### Premium UI Design System

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `motion` | 12.7.4 | Declarative animations for React — page transitions, micro-interactions, scroll effects, layout animations | The successor to `framer-motion` (now published as `motion` from `motion/react`). Industry standard for premium web animation. Key capabilities: `AnimatePresence` for enter/exit animations, `layout` animations for smooth reordering, `whileInView` for scroll-triggered reveals, and variants for orchestrated parent-child animations. Used to differentiate premium SaaS from "basic internal tool" feel. Zero-config — works with React 18 + Next.js 14. |
| `@radix-ui/themes` | 3.2.1 | Pre-styled design system on top of existing Radix primitives | The project already uses `@radix-ui/*` primitives. Radix Themes adds a cohesive design token system (colors, typography, spacing, shadows, radii) with dark mode built in. It provides opinionated styled components (`Button`, `Card`, `Dialog`, `Table`, `Tabs`) that can be themed via CSS variables. This is the fastest path to a premium look — replace shadcn/ui components with Radix Themes equivalents while preserving accessibility. Compatible with Tailwind CSS v3 (they don't conflict — Radix Themes uses its own CSS, Tailwind handles layout). |
| `lucide-react` | 1.11.0 (existing) | Icon library | Already in stack. Upgrading to latest adds 200+ new icons (v0.500+). Consistent stroke-width, pixel-perfect at all sizes. |
| `tailwindcss` | 3.4.17 (existing, minor upgrade) | Utility CSS for layout, responsive design, custom component styling | Existing Tailwind v3 is sufficient. v4 is available but requires migration effort — defer to a later phase. Tailwind works alongside Radix Themes: Tailwind handles layout (grid, flex, spacing, responsive), Radix Themes handles component styling (colors, typography, component variants). |

**Design system strategy:** Radix Themes provides the component-level design tokens and pre-styled primitives. Custom CSS variables (`--brand-primary`, `--brand-accent`, etc.) overlay Radix Themes' default color scale. Tailwind utilities handle layout and one-off custom styling. Motion provides animation polish — page transitions, hover states, loading skeletons, scroll reveals. The goal is visual-first, not data-table-heavy.

**Why not shadcn/ui for premium redesign?** shadcn/ui is excellent for data-dense internal tools (which is exactly what v1.0 is). But for a premium 2026 SaaS product, Radix Themes provides a more cohesive visual language out of the box — consistent spacing scale, typography hierarchy, color system, and component variants that look designer-crafted. Copy-pasting shadcn components and restyling each one is slower than adopting a pre-styled system. The existing shadcn/ui components can be incrementally replaced.

**Why not Tailwind v4 now?** v4 changes the configuration model significantly (CSS-based config instead of `tailwind.config.ts`). Migration is non-trivial and doesn't add features critical for this phase. Defer to a post-launch phase.

### Public Marketing Website

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js 14 App Router (same app) | 14.2.15 (existing) | Hosts both dashboard and marketing site via route groups | **Use the same Next.js app** — not a separate deployment. Route groups (`app/(marketing)/` and `app/(dashboard)/`) cleanly separate the public site from the authenticated dashboard. Benefits: shared UI primitives, shared API client for waitlist/demo signup, single deployment, shared Tailwind config, shared i18n infrastructure. The Caddy reverse proxy already routes `/*` to the dashboard; no routing changes needed. |
| `next-intl` | 4.2.1 | Internationalized routing, translated content, ICU message formatting | The standard for Next.js i18n. Supports App Router natively, with `defineRouting()` for locale prefixes (`/en/about`, `/fr/about`), middleware-based locale detection, and type-safe `useTranslations()` hook. ICU message syntax handles pluralization, gender, and complex interpolation. Already exists in v1.0 as a simple i18n provider — `next-intl` replaces the custom solution with a production-grade one. |
| `next-seo` | 6.12.0 | Meta tags, Open Graph, Twitter Cards, JSON-LD structured data | The standard for SEO in Next.js. `DefaultSeo` for site-wide defaults, per-page `NextSeo` overrides for blog posts, product pages, pricing. JSON-LD for Organization, SoftwareApplication, and FAQ schema types. Essential for organic traffic acquisition. |
| `velite` | 0.3.1 | Type-safe content layer — MDX blog posts, changelog, documentation pages | TypeScript-first content management. Define collections (blog posts, case studies, changelog entries) with Zod schemas. Generates type-safe data that can be imported directly into Next.js pages. Much more actively maintained than Contentlayer (which had a period of stalled development). Outputs are importable as typed arrays in server components. |
| `next-sitemap` | 4.2.3 | Dynamic sitemap.xml and robots.txt generation | Auto-generates sitemap from Next.js pages with locale variants, `changefreq`, `priority`. Essential for SEO. |

**Why not a separate marketing site (Astro, Hugo, etc.)?** A separate site means: separate deployment, separate CI/CD, separate styling, no shared components, no shared i18n, extra Caddy config, extra DNS. Keeping it in the same Next.js app via route groups means: zero new infrastructure, shared API client for demo/waitlist signups that POST to the NestJS API, same design tokens, same deployment artifact. The tradeoff is that the marketing site shares the dashboard's JS bundle — but the marketing pages are mostly static (SSG/ISR) and the dashboard is code-split. `next/dynamic` with `ssr: false` ensures dashboard components never load on marketing pages.

**Architecture note:** `app/(marketing)/layout.tsx` uses a different root layout than `app/(dashboard)/layout.tsx`. The marketing layout: no auth provider, different font loading (display fonts for headlines), no sidebar, no Socket.IO connection. The dashboard layout: auth guard, sidebar nav, WebSocket connection, i18n set to app locale.

### International Branding & i18n

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `next-intl` | 4.2.1 | Same as above — powers both marketing site and dashboard i18n | Single i18n system for the entire platform. Locale-specific routes for marketing (`/en/pricing`, `/fr/pricing`) and dashboard (`/en/dashboard`, `/fr/dashboard`). Note: the dashboard currently has French-first i18n with a custom provider — `next-intl` replaces it and adds proper locale routing. |
| `@formatjs/intl-localematcher` | 0.6.0 | Browser locale negotiation | Used by `next-intl` middleware to detect `Accept-Language` header and redirect to best-match locale. |

**Supported locales for launch:** English (en-US — default), French (fr-FR), Spanish (es-ES), German (de-DE), Arabic (ar-SA — RTL support via Tailwind RTL variants). Additional locales added via translation file contributions.

## Installation

```bash
# === Multi-Tenancy ===
pnpm add nestjs-cls@5.5.1 --filter @repo/api

# === Subscription Billing ===
pnpm add stripe@22.3.1 @paypal/paypal-server-sdk@2.4.0 --filter @repo/api

# === License Management ===
pnpm add jose@5.10.0 --filter @repo/api

# === Premium UI (Dashboard) ===
pnpm add motion@12.7.4 @radix-ui/themes@3.2.1 --filter @repo/dashboard

# === Marketing Website + i18n (Dashboard) ===
pnpm add next-intl@4.2.1 next-seo@6.12.0 velite@0.3.1 next-sitemap@4.2.3 --filter @repo/dashboard

# === Dev Dependencies ===
pnpm add -D @types/node --filter @repo/api  # For crypto/webhook types
```

### Environment Variables (add to `.env.example`)

```bash
# === Stripe ===
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# === PayPal ===
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
PAYPAL_ENVIRONMENT=sandbox  # sandbox | live

# === License Management ===
LICENSE_PRIVATE_KEY_PATH=/app/secrets/license-private.pem  # RS256 private key for signing
LICENSE_PUBLIC_KEY_PATH=/app/secrets/license-public.pem    # RS256 public key for verification

# === Marketing Site ===
NEXT_PUBLIC_SITE_URL=https://oversighthub.com
NEXT_PUBLIC_SITE_NAME="Oversight Hub"
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Multi-tenancy | Prisma Client Extensions + PostgreSQL RLS | Separate database per tenant | Operational burden: N databases to migrate, back up, monitor. PG RLS is sufficient for the target scale. |
| Multi-tenancy | Prisma Client Extensions + PostgreSQL RLS | Discriminator column (`WHERE tenant_id = ?`) | No defense-in-depth — a missing WHERE clause leaks data. RLS enforces at DB level, not app level. |
| Stripe Integration | Raw `stripe` SDK in custom NestJS module | `@golevelup/nestjs-stripe` | Community wrapper lags behind SDK releases. Custom module is ~20 lines and gives full control. |
| Stripe Integration | Raw `stripe` SDK | Stripe Checkout only (no Customer Portal) | Checkout handles initial signup but customers need self-service for plan changes, invoice history, payment method updates. |
| Billing Abstraction | Direct Stripe + PayPal | Paddle / Chargebee / Recurly | Adds vendor lock-in and transaction fee overhead (Paddle is 5%+). Direct integration gives full control. |
| License Management | JWT (RS256-signed) | UUID + DB lookup only | DB-only licenses are trivially bypassed by DB manipulation. JWT signatures provide cryptographic tamper-proofing. |
| License Management | JWT (RS256-signed) | Hardware dongle / HASP | Incompatible with Docker deployment. |
| Animation Library | `motion` (framer-motion successor) | CSS animations only | CSS can't handle enter/exit animations, layout animations, or gesture-based interactions with the polish level expected for premium SaaS. |
| Animation Library | `motion` (framer-motion successor) | GSAP | GSAP is powerful but imperative (not React-declarative) and requires more code for common UI animations. Motion's declarative API maps directly to React rendering. |
| Design System | Radix Themes + Tailwind | Building custom design system from scratch | Months of work for tokens, components, documentation. Radix Themes provides a production-ready foundation that can be themed. |
| Design System | Radix Themes + Tailwind | Material UI / Ant Design | Too opinionated — they look like "Material Design app" not a distinct brand. Hard to achieve a unique 2026 visual identity. |
| Marketing Site | Same Next.js app (route groups) | Separate Astro/Hugo site | Adds deployment, CI/CD, styling, i18n, and DNS overhead for marginal benefit. Route groups provide clean separation without the operational cost. |
| Content Management | Velite | Contentlayer | Contentlayer had a period of stalled maintenance (2023-2024). Velite is actively maintained, TypeScript-first, and uses Zod schemas natively. |
| Content Management | Velite | Headless CMS (Strapi, Sanity) | Adds another service to deploy and manage. Velite is Git-based — content lives in the repo, reviewed via PR, versioned with the app. |
| i18n | next-intl | next-i18next | next-i18next is the older i18next bridge. next-intl is App Router-native, type-safe, and integrates with Next.js middleware for locale routing. |
| SEO | next-seo | Manual `<Head>` tags | next-seo provides structured defaults (DefaultSeo), JSON-LD helpers, and per-page overrides with type checking. Manual tags are error-prone. |
| Sitemap | next-sitemap | Manual sitemap.xml | Auto-generates from pages with locale variants and priority/changefreq config. Manual sitemaps rot as pages are added. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Separate database per tenant | Operational overhead for medium-scale SaaS. PG RLS + Prisma extensions handle isolation. | Single PostgreSQL with RLS policies |
| `@golevelup/nestjs-stripe` or any NestJS Stripe wrapper | Lags behind Stripe SDK releases. Obscures type safety. | Custom `StripeModule` wrapping raw `stripe` SDK (~20 lines) |
| `jsonwebtoken` for license tokens | Designed for auth JWTs with expiration and issuer claims. `jose` is modern, smaller, and supports the algorithms needed for licenses. | `jose` v5 |
| Paddle / Chargebee / Recurly | Another vendor in the billing chain. Adds 5%+ transaction fees. Less control over checkout UX. | Direct Stripe + PayPal integration |
| `framer-motion` (old name) | The package was renamed to `motion`. Old `framer-motion` package gets no new features. | `motion` (import from `motion/react`) |
| GSAP for UI animations | Imperative API doesn't fit React's declarative model. More code for common patterns. | `motion` for UI, CSS `@keyframes` for simple loops |
| Material UI / Ant Design | Distinctive third-party look — can't achieve unique brand identity. Heavy bundle (MUI is ~200KB gzipped). | Radix Themes (themed via CSS variables) + Tailwind |
| Separate marketing site (Astro, Hugo) | Adds deployment, CI/CD, and DNS overhead. Marketing pages share i18n, API client, and design tokens with dashboard. | Route groups in same Next.js app (`app/(marketing)/`) |
| Contentlayer | Had stalled maintenance for extended period (2023-2024). Velite is the actively maintained successor. | Velite |
| Custom i18n provider (current v1.0 approach) | Works for one language + fallback but doesn't support locale routing, ICU messages, or type safety. | `next-intl` |
| ApexCharts / Recharts / Chart.js for the marketing site | No charts needed on the marketing site. Defer chart library decisions to the analytics dashboard phase. | ECharts (already researched in prior phase) — but only for the dashboard |

## Stack Patterns by Capability

### Multi-Tenant Request Flow

```
1. JWT auth guard validates token → extracts userId + tenantId from JWT payload
2. TenantGuard (custom) reads tenantId from JWT, stores in ClsService
3. ClsModule middleware sets `app.current_company_id` in PostgreSQL session
4. Prisma Client Extension wraps every query in `forCompany(tenantId)` 
5. PostgreSQL RLS policy enforces tenant isolation at database level
6. Every table gets `tenant_id UUID NOT NULL` column
7. Site-level scoping: sites belong to tenants; cameras/doors/events belong to sites
```

### Billing Flow

```
1. User selects plan on pricing page (marketing site) → POST /api/billing/checkout
2. API creates Stripe Checkout Session with plan's Price ID
3. User completes payment on Stripe-hosted checkout page
4. Stripe webhook → POST /api/billing/webhook/stripe (raw body, signature verified)
5. Webhook handler processes checkout.session.completed:
   - Creates/updates Tenant record with stripeCustomerId, stripeSubscriptionId
   - Generates license JWT for the tenant
   - Sends welcome email via Resend (already integrated)
6. Customer self-service: POST /api/billing/portal → returns Stripe Customer Portal URL
7. Subscription changes (upgrade/downgrade/cancel) handled via webhooks
8. PayPal follows same pattern with PayPal Server SDK + webhooks
```

### License Validation Flow

```
1. On API startup: LicenseService reads license JWT from DB (or env var for initial setup)
2. Validates signature against LICENSE_PUBLIC_KEY
3. Checks expiration, feature flags, camera/site limits
4. BullMQ repeatable job (every 6 hours): re-validates license
5. If expired: grace period starts (7 days with dashboard warnings)
6. If grace period expires: feature degradation (read-only, no new cameras)
7. License renewal: admin uploads new license JWT via dashboard → replaces in DB
```

### Premium UI Patterns

```
// Page transitions (layout.tsx)
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
</AnimatePresence>

// Staggered list items (camera grid, alert list)
<motion.ul initial="hidden" animate="visible" variants={staggerContainer}>
  {items.map((item, i) => (
    <motion.li key={item.id} variants={staggerItem} custom={i}>
      <CameraCard camera={item} />
    </motion.li>
  ))}
</motion.ul>

// Scroll-triggered reveals (marketing site)
<motion.div
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.6 }}
>
  <FeatureSection />
</motion.div>
```

### Marketing Site Route Structure

```
app/
├── (marketing)/
│   ├── layout.tsx          # Marketing root layout (no auth, different fonts)
│   ├── page.tsx            # Homepage — hero, features, social proof, CTA
│   ├── pricing/
│   │   └── page.tsx        # Pricing page with Stripe Checkout integration
│   ├── blog/
│   │   ├── page.tsx        # Blog index (SSG from Velite collections)
│   │   └── [slug]/
│   │       └── page.tsx    # Individual blog post (SSG)
│   ├── about/
│   │   └── page.tsx        # About / team
│   └── contact/
│       └── page.tsx        # Contact form → POST /api/contact
├── (dashboard)/
│   ├── layout.tsx          # Dashboard root layout (auth guard, sidebar)
│   └── (authenticated)/
│       ├── overview/
│       ├── cameras/
│       ├── access/
│       ├── incidents/
│       ├── analytics/
│       ├── settings/
│       │   └── billing/    # NEW: billing management page
│       └── admin/
│           └── license/    # NEW: license management page
└── layout.tsx              # Root layout (minimal — html, body, i18n provider)
```

## Version Compatibility

| Package | Required By | Compatible With | Notes |
|---------|-------------|-----------------|-------|
| `nestjs-cls` 5.x | NestJS API | NestJS 10.x (existing), Prisma 5.x | Uses `AsyncLocalStorage` (Node.js 16+), already available in Node.js 18+ |
| `stripe` 22.x | NestJS API | Node.js 18+ | Pins API version 2026-06-24.dahlia. TypeScript types match the pinned version. |
| `@paypal/paypal-server-sdk` 2.x | NestJS API | Node.js 18+ | Official PayPal SDK. Uses OAuth2 client credentials. |
| `motion` 12.x | Next.js Dashboard | React 18.x, Next.js 14.x | Replaces `framer-motion`. Import from `motion/react`. |
| `@radix-ui/themes` 3.x | Next.js Dashboard | React 18.x, Tailwind CSS 3.x | Works alongside existing `@radix-ui/*` primitives and Tailwind. |
| `next-intl` 4.x | Next.js Dashboard | Next.js 14.x App Router | Requires middleware.ts for locale detection. Drop-in replacement for custom i18n provider. |
| `velite` 0.x | Next.js Dashboard | Node.js 18+, Next.js 14.x | Content pipeline runs at build time. Output is plain TypeScript — no runtime dependency. |

## Sources

- [Prisma Client Extensions — RLS Multi-Tenancy](https://github.com/prisma/web/blob/main/apps/blog/content/blog/client-extensions-preview-8t3w27xkrxxn/index.mdx) — HIGH confidence (official Prisma blog, recommended pattern for multi-tenant SaaS, includes complete schema + extension code)
- [nestjs-cls Context7 docs](/papooch/nestjs-cls) — HIGH confidence (430 snippets, 87.46 benchmark, documented multi-tenant patterns with Prisma proxy providers)
- [Stripe Node SDK Context7 docs](/stripe/stripe-node) — HIGH confidence (213 snippets, v19.1.0 indexed but v22.3.1 confirmed as latest stable via GitHub releases, July 9 2026)
- [Stripe API Versioning](https://docs.stripe.com/api/versioning) — HIGH confidence (official docs, current version 2026-06-24.dahlia, stripe-node v12+ pins API versions)
- [Stripe Billing Portal](https://github.com/stripe/stripe-node/blob/master/src/resources/BillingPortal/Sessions.ts) — HIGH confidence (confirmed API: `billingPortal.sessions.create`, `configurations`, subscription update with product listing)
- [PayPal Server SDK Context7 docs](/paypal/paypal-typescript-server-sdk) — HIGH confidence (1,228 snippets, v2.4.0 confirmed, supports orders, payments, and subscriptions)
- [Motion (framer-motion successor) docs](https://motion.dev/docs/react-animation) — HIGH confidence (official docs, confirmed `motion/react` import path, AnimatePresence, layout animations, variants, useAnimate hook)
- [Radix Themes Context7 docs](/websites/radix-ui_themes) — HIGH confidence (981 snippets, pre-styled component library, dark mode, CSS variable theming)
- [next-intl Context7 docs](/amannn/next-intl) — HIGH confidence (942 snippets, 91.32 benchmark, App Router-native, defineRouting, middleware, ICU message format)
- [next-seo Context7 docs](/garmeeh/next-seo) — HIGH confidence (618 snippets, DefaultSeo, JSON-LD, Open Graph, Twitter Cards)
- [Velite Context7 docs](/zce/velite) — HIGH confidence (358 snippets, 89.49 benchmark, defineConfig with Zod schemas, MDX support, type-safe output)
- [NestJS Guards & Interceptors Context7 docs](/nestjs/nest) — HIGH confidence (confirmed guard execution order: global → class → method, sequential canActivate)

---

*Stack research for: Oversight Hub v2.0 — Commercial SaaS Platform*
*Researched: 2026-07-15*
