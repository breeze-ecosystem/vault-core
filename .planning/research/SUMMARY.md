# Project Research Summary

**Project:** Oversight Hub — Commercial SaaS Physical Security Platform
**Domain:** Multi-tenant SaaS — subscription billing, license management, premium UI, public marketing website
**Researched:** 2026-07-15
**Confidence:** HIGH

## Executive Summary

Oversight Hub v2.0 transforms a v1.0 single-tenant physical security prototype into a production-grade, multi-tenant, premium SaaS platform. The research across four dimensions (stack, features, architecture, pitfalls) converges on a clear finding: **multi-tenancy is the critical path.** Every other v2.0 capability — subscription billing, license management, per-tenant RBAC, AI feature deepening, analytics — depends on a clean, database-enforced tenant isolation layer. The recommended approach is foundation-first: introduce an `Organization` (tenant) model with Prisma Client Extensions for automatic query scoping and PostgreSQL Row-Level Security for defense-in-depth, before building anything else.

The recommended technology stack extends the existing NestJS + Next.js + Expo + Prisma + Redis + BullMQ foundation with lightweight, purpose-built additions: `nestjs-cls` for request-scoped tenant context, raw `stripe` SDK (v22) in a custom NestJS module (no community wrappers), `jose` for cryptographically-signed license tokens, Radix Themes + `motion` for the premium 2026 UI design system, and `next-intl` + `velite` + `next-seo` for the public marketing website. No framework rewrites. No new databases. Everything runs on the existing PostgreSQL 16, Redis 7, and Docker Compose deployment with Caddy reverse proxy.

The key risks are: (1) confusing v1.0 `Site` (physical location) with v2.0 `Tenant` (billing entity) — they are different concepts and must be modeled as separate Prisma models with a clear 1:N relationship; (2) treating Stripe integration as just a checkout flow rather than a webhooks-first architecture where Stripe is the source of truth for subscription state; (3) attempting a page-by-page premium UI redesign without building the design system first, creating a "beautiful empty shell" where most of the product still has the old UI; and (4) the "self-hosted security product" trust paradox — the messaging must explicitly own the hybrid model rather than implying a fully managed cloud service. Each of these risks has a well-defined prevention strategy mapped to a specific roadmap phase.

## Key Findings

### Recommended Stack

The v2.0 stack adds 10 new packages to the existing 70+ package monorepo — all verified for version compatibility with NestJS 10.x, Next.js 14.x, React 18.x, and Node.js 18+. The strategy is **extend, don't replace**: every addition layers onto existing infrastructure without introducing new databases, external services, or breaking changes.

**Core technologies:**

- **Multi-Tenancy** — `nestjs-cls` 5.5.1 (request-scoped tenant context via AsyncLocalStorage) + Prisma Client Extensions (auto-inject `organizationId` into every query) + PostgreSQL RLS (database-level defense-in-depth). No separate databases, no schema-per-tenant, no connection pooling per tenant.
- **Billing** — `stripe` 22.3.1 (primary: subscriptions, checkout, customer portal, webhooks) + `@paypal/paypal-server-sdk` 2.4.0 (secondary: international markets). No billing abstraction layer (no Paddle/Chargebee). Custom `StripeModule` (~20 lines) wraps the raw SDK.
- **Licensing** — `jose` 5.10.0 (RS256-signed JWT license tokens, offline verification, self-validating). `uuid` 10.0.0 (already in stack, used for human-readable license key identifiers).
- **Design System** — `@radix-ui/themes` 3.2.1 (pre-styled design system on existing Radix primitives) + `motion` 12.7.4 (framer-motion successor for page transitions, micro-interactions, scroll reveals) + Tailwind CSS 3.4.17 (layout, responsive design, custom utilities). Radix Themes replaces shadcn/ui as the component library while preserving accessibility.
- **Marketing Website** — `next-intl` 4.2.1 (App Router-native i18n, locale routing, ICU messages) + `velite` 0.3.1 (type-safe MDX content layer for blog/changelog) + `next-seo` 6.12.0 (meta tags, OG, JSON-LD) + `next-sitemap` 4.2.3 (dynamic sitemap generation). The marketing site shares the same Next.js deployment via route groups (`app/(marketing)/` and `app/(dashboard)/`).

### Expected Features

The feature landscape is organized into three tiers based on competitive analysis against Verkada, Brivo, Genetec, and Suprema.

**Must have (P1 — Launch-Blocking — Phase 1-2):**

- Multi-tenant architecture with PostgreSQL RLS enforcement — users expect data segregation
- Tiered subscription plans (Stripe) with Checkout, Customer Portal, and webhook lifecycle management — standard SaaS pricing model
- License management with JWT-based crypto-signed keys, activation, expiry, and grace periods — enterprise buyers expect feature gating
- RBAC per tenant (refactored from global roles to `organizationId + role` compound scope) — admin at Org A ≠ admin at Org B
- Invite-based onboarding with expiring tokens — physical security isn't self-serve signup
- Immutable audit logs per tenant (hash-chained, per-tenant chain integrity) — SOC 2 requires 1+ year retention
- Self-hosted Docker Compose deployment with setup wizard — unique differentiator vs cloud-only competitors
- Premium Dashboard UI redesign (design system first, then high-traffic pages) — competitive visual differentiation
- Public marketing website (SSG/ISR, pricing, blog, SEO) — commercial presence required for SaaS credibility
- International branding with French-first i18n (English, Spanish, German, Arabic) — existing francophone user base
- Feature gates per license tier — all premium features gated behind Enterprise tier

**Should have (P2 — Competitive Differentiators — Phase 3-4):**

- AI-correlated event timeline linking access, video, and AI analysis — operators see what happened without manual investigation
- AI incident auto-summary generating narrative reports from correlated events — competitors require manual documentation
- Natural language event search via pgvector semantic search ("Who accessed the data center last weekend?") — competes with Brivo Genius
- AI security assistant with tool calling (query door states, execute lockdown, assess zone risk) — conversational interface for operators
- Per-zone dynamic risk scoring computed from event patterns, anomalies, and incident density — no competitor offers this natively
- Recurring situation detection identifying patterns across events ("door held open 3x this week at same time")
- Anti-passback and tailgating detection (production-grade with video evidence attachment)
- ANPR/LPR pipeline with vehicle correlation (Plate Recognizer SDK) — linked vehicle + access events
- SSO/SAML/OIDC (Enterprise tier) — required for deals >$50K ARR
- Security analytics dashboards (ECharts heatmaps, scatter plots, occupancy trends) — per-tenant scoping
- Compliance reporting templates (SOC 2, ISO 27001) with automated retention policies

**Defer to v2.1+ (P4):**

- Unified command center (single dashboard with all real-time panels)
- Guard-first mobile workflows (patrol-specific UX with offline queue)
- Two-factor authentication (TOTP)
- Dunning / failed payment handling (Stripe Smart Retries + custom logic)
- Offline license activation for air-gapped deployments
- Integrations marketplace (REST API + webhooks enable it, marketplace is v3.0)

### Architecture Approach

The architecture layers v2.0 commercial capabilities **on top of** the existing 29 NestJS modules without modifying their internal logic. Three new NestJS modules (`TenantModule`, `BillingModule`, `LicenseModule`) provide cross-cutting infrastructure that is transparent to existing modules via Prisma Client Extensions.

The tenant isolation pattern is defense-in-depth: (1) `TenantContextMiddleware` extracts `organizationId` from the JWT and sets it in a request-scoped `TenantService` + PostgreSQL session variable; (2) a Prisma Client Extension automatically injects `WHERE organizationId = $currentOrgId` into all queries; (3) PostgreSQL RLS policies enforce isolation at the database level — even a raw SQL query cannot cross tenant boundaries. Existing modules need zero code changes to become tenant-aware.

The billing architecture is **webhooks-first**: Stripe is the source of truth for subscription state. The platform never polls Stripe — it reacts to webhook events processed asynchronously via BullMQ (acknowledge immediately, process in background). All webhook events are deduplicated by stored `stripeEventId`. The license system uses RS256-signed JWTs that are self-validating (offline verification possible) with a BullMQ repeatable job checking expiry every 6 hours.

**Major components:**

1. **TenantModule** — Organization CRUD, request-scoped tenant context (`TenantService`), PostgreSQL RLS session variable (`SET config`), Prisma Client Extension for automatic query scoping
2. **BillingModule** — Stripe Checkout sessions, Customer Portal sessions, webhook signature verification, async event processing via BullMQ (`billing` queue), subscription status sync, plan-to-feature mapping
3. **LicenseModule** — JWT-based license key generation/validation (`jose` RS256), activation flow, domain binding, expiry monitoring, grace period enforcement (7-day warning → degraded mode → read-only)
4. **Tenant-Aware Auth** — Extended JWT payload (`organizationId`, `permissions[]`, `role`), `OrganizationGuard` for resource ownership, `SUPER_ADMIN` platform-level role for cross-tenant management
5. **Design System (`@repo/ui` expanded)** — Design tokens as TypeScript constants (colors, typography, spacing, shadows — consumed by both web and mobile), Radix Themes component library, shared Tailwind preset, `motion` animation patterns
6. **Marketing Website (`apps/marketing/`)** — Separate Next.js app (not merged with Dashboard), SSG/ISR pages, Stripe Checkout integration on pricing page, `next-intl` i18n routing, `velite` content layer, SEO metadata

### Critical Pitfalls

1. **"Site != Tenant" Confusion (Pitfall #1):** v1.0 uses `User.siteId` as the scoping mechanism (one user → one site). Retrofitting multi-tenancy by renaming "site" to "tenant" or adding `tenantId` alongside `siteId` creates ambiguous ownership chains. **Prevention:** Introduce a first-class `Organization` (Tenant) model. Site stays as a physical-location concept under Tenant (`Tenant 1:N Site`). User belongs to Tenant, with site-level assignments through a join table. All current `siteId` references must be reconciled before adding `organizationId`.

2. **Billing Webhook Blindness (Pitfall #2):** Assuming Stripe "just works" after implementing checkout leads to subscription state drift — canceled customers keep access, paid customers get locked out, events are processed without idempotency. **Prevention:** Build the webhook handler FIRST, before the checkout flow. Handle all 15+ subscription lifecycle events. Store processed event IDs for deduplication. Use Stripe as the source of truth — the database mirrors, never leads.

3. **UI Redesign Without Design System (Pitfall #3):** A page-by-page premium redesign takes 4x longer than estimated, creates a half-beautiful/half-ugly product, and never finishes because scope keeps expanding. **Prevention:** Build the design system first (tokens, Radix Themes, Tailwind preset) — this gives instant uplift to every existing page without rewriting page logic. Then redesign the 3 most-used pages end-to-end. The remaining pages get visual uplift from the design system alone, with full redesigns deferred.

4. **Self-Hosted Trust Paradox (Pitfall #4):** The platform deploys on customer infrastructure (Docker Compose) but the SaaS billing model and premium branding set cloud-managed expectations. Security buyers detect this gap and distrust the product. **Prevention:** Explicitly own the hybrid model in all messaging: "Deploy on your infrastructure. We handle the intelligence." Invest heavily in deployment UX (one-command startup, health checks, automatic SSL, setup wizard). Separate "platform" (runs on customer infra) from "service" (AI models, updates, support).

5. **License Management as Afterthought (Pitfall #5):** Implementing license validation as a simple string comparison or client-side check leads to bypasses within days of launch. **Prevention:** Server-side enforcement on every authenticated request (or Redis-cached with 60-second TTL). License validation as a middleware/guard (`LicenseGuard`), not scattered across controllers. On-prem deployments use offline-verifiable JWT signatures. Always include grace periods — a security platform that hard-locks during a payment dispute is a liability.

## Implications for Roadmap

Based on combined research, the suggested phase structure follows the hard dependency graph: tenant foundation → monetization → premium experience → public presence → feature deepening → AI layer → enterprise features. Phases are ordered to minimize risk, maximize parallelization, and deliver market-ready increments.

### Phase 1: Commercial Foundation (Multi-Tenant Architecture)
**Rationale:** Every v2.0 feature requires `organizationId` scoping. This is the critical path — retrofitting multi-tenancy after features are rebuilt is a near-rewrite (per PITFALLS #1 and #7).

**Delivers:** Organization model + migration, `TenantContextMiddleware` (replaces `SiteContextMiddleware`), Prisma Client Extension for automatic tenant filtering, PostgreSQL RLS policies on all tenant-scoped tables, extended JWT payload (`organizationId`, `permissions[]`), `OrganizationGuard`, tenant-aware `RolesGuard`, `SUPER_ADMIN` role, self-hosted deployment polish (setup wizard, health checks, upgrade path from v1.0).

**Addresses:** Multi-tenant architecture, RBAC per tenant, immutable audit logs per tenant, feature gates infrastructure.

**Avoids:** Pitfall #1 (Site vs Tenant confusion), Pitfall #7 (shared database without guardrails), Pitfall #10 (real-time system degradation — establishes per-tenant isolation patterns).

**Research flags:** Prisma Client Extension performance with tenant filtering (~1-5% overhead, needs benchmark). Existing `SiteContextMiddleware` → `TenantContextMiddleware` migration path (needs spike on backward compatibility). Need `--research-phase` for the middleware and RLS integration.

### Phase 2: Monetization (Billing + Licensing)
**Rationale:** Billing and licensing are tightly coupled — subscription state drives license generation. Both require the Organization model from Phase 1. Building them together ensures the subscription-to-license lifecycle is coherent.

**Delivers:** Stripe SDK integration (custom `StripeModule`), Checkout flow (plan selection → Stripe-hosted payment), Customer Portal (self-service plan management), webhook endpoint + processor (BullMQ `billing` queue, all 15+ event types handled, idempotency), PayPal secondary integration, license key JWT generation, activation flow, expiry monitoring (BullMQ repeatable job), grace period enforcement, plan-to-feature mapping, feature gates (per-tenant plan limits enforced on create), invite-based onboarding with expiring tokens.

**Addresses:** Tiered subscription plans, license management, invite-based onboarding, feature gates per tier.

**Avoids:** Pitfall #2 (billing webhook blindness — webhooks built first), Pitfall #5 (license afterthought — middleware-based enforcement from day one), Pitfall #6 (proration/upgrade confusion — preview invoice UI required before enabling plan changes).

**Research flags:** Stripe webhook integration patterns are well-documented (HIGH confidence from Context7). PayPal Server SDK integration for subscriptions is less documented — needs spike. `--research-phase` recommended for PayPal subscription lifecycle edge cases.

### Phase 3: Premium Experience (Design System + Dashboard + Mobile UI)
**Rationale:** The design system must be built before any page-level redesigns (PITFALLS #3). Applying it globally gives instant uplift to all existing pages with zero page rewrites. This phase is independent of billing/licensing (can partially overlap with Phase 2) but requires the tenant context from Phase 1 for proper org-switching UI.

**Delivers:** Design tokens in `@repo/ui/tokens/` (TypeScript constants for web + mobile consumption), Radix Themes integration (replacing shadcn/ui incrementally), `motion` animation patterns (page transitions, staggered lists, scroll reveals), Tailwind preset shared across Dashboard + Marketing, 3 redesigned high-traffic pages (Overview dashboard, Camera grid, Alert list), remaining pages uplifted via design system alone, Mobile app redesign with shared tokens, `next-intl` replacing custom i18n provider, RTL layout support for Arabic.

**Addresses:** Premium Dashboard UI redesign, Premium Mobile UI redesign, multi-language/i18n infrastructure.

**Avoids:** Pitfall #3 (UI redesign without design system — design system foundation built before any page redesign), Pitfall #8 (international branding alienation — French-first i18n, existing user base respected).

**Research flags:** `--research-phase` needed for Radix Themes + Tailwind coexistence patterns (how they interact, where one handles what). Motion animation performance on low-end devices (security dashboard might run on thin clients).

### Phase 4: Public Presence (Marketing Website + International Branding)
**Rationale:** The marketing site depends on Phase 2 (Stripe plan definitions for the pricing page) and Phase 3 (design system for brand consistency). It is otherwise independent of the platform — can be built as a standalone Next.js app that shares `@repo/ui` and Stripe configuration. This phase can be run in parallel with Phase 5 if team capacity allows.

**Delivers:** `apps/marketing/` Next.js app with route groups, SSG/ISR pages (Home, Features, Pricing, Blog, About, Contact), Stripe Checkout integration on pricing page, `velite` content layer (blog posts, changelog, case studies), `next-seo` metadata (OG, Twitter Cards, JSON-LD), `next-sitemap` dynamic sitemap, locale-specific routes (`/en/pricing`, `/fr/pricing`), Arabic RTL marketing pages, Caddy routing update (subdomain routing: `app.domain.com` → Dashboard, `domain.com` → Marketing).

**Addresses:** Public marketing website, international branding, multi-language content.

**Avoids:** Pitfall #4 (self-hosted trust paradox — messaging explicitly owns the hybrid model on the landing page), Pitfall #8 (branding alienation — French-first content, CFA franc pricing, Mobile Money integration).

**Research flags:** Standard patterns — Next.js SSG/ISR, next-intl routing, velite collections are all well-documented. Skip research-phase.

### Phase 5: Feature Deepening (Core Security Modules)
**Rationale:** With multi-tenant foundation, billing, and premium UI in place, deepen the core security features that were built as v1.0 prototypes. Each module must pass an audit before any implementation begins (PITFALLS #9). Feature work is parallelizable since each module is independently scoped.

**Delivers:** Incident management workflow rebuild (triage, SLA timers via BullMQ, escalation chains, evidence auto-bundle, closure report PDF), door state monitoring production-grade (state machine with MQTT sequence ordering, false alert prevention, timeout-based escalation), zone-based access rules deepened (schedule-based, holiday calendars, temporary overrides, per-user exceptions), visitor management deepened (host approval workflow, timed passes, QR/badge generation, check-in kiosk mode, expiration), mobile credential support (NFC, BLE, TOTP, QR passes), device health monitoring (equipment health hypertable, threshold-based alerts, predictive warnings, per-site health score), video evidence correlation hardened (tenant-isolated storage, correlation engine scoping), 24/7 alert delivery (SMS gateway, on-call schedules, escalation policies per tenant).

**Addresses:** Incident management (deepened), door state monitoring (production-grade), zone-based access rules (deepened), visitor management (deepened), mobile credentials, device health monitoring, real-time alerting (multi-tenant), video evidence correlation (multi-tenant).

**Avoids:** Pitfall #9 (feature deepening without audit — each module scored before implementation starts; modules below 50% get rewritten, not deepened).

**Research flags:** Each module needs its own spike during planning. Door state machine race condition prevention is critical (PITFALLS #2 equivalent for multi-tenant). `--research-phase` recommended for incident management workflow (complex BullMQ SLA timer chains). Standard patterns for visitor management, credentials.

### Phase 6: AI Intelligence Layer
**Rationale:** AI features depend on accumulated event data from Phase 5 and share a common embeddings infrastructure (Ollama → pgvector). Building the embeddings pipeline first makes every subsequent AI feature faster. The shared infrastructure (pgvector HNSW indexes, text-to-embedding pipeline, structured-to-natural-language event representation) is built once and consumed by all AI features.

**Delivers:** pgvector embeddings pipeline (Ollama embedding API → pgvector HNSW indexes), structured event → natural language description conversion, AI-correlated event timeline (event linking engine + AI context enrichment), AI incident auto-summary (Ollama chat model + structured prompt templates), natural language event search (hybrid search: vector similarity + structured filters), AI security assistant (Ollama chat + tool calling: query door states, list alerts, get zone risk, execute lockdown), per-zone dynamic risk scoring (TimescaleDB continuous aggregates + weighted factor algorithm + ECharts gauge visualization), recurring situation detection (pgvector similarity search on event embeddings + cluster analysis on time-series patterns), anti-passback + tailgating detection hardened (configurable sensitivity, per-zone rules, automatic incident generation).

**Addresses:** AI-correlated event timeline, AI incident auto-summary, natural language event search, AI security assistant, per-zone risk scoring, recurring situation detection, anti-passback + tailgating deepened.

**Avoids:** Pitfall #5 equivalent for AI (Ollama model keep_alive settings to prevent loading latency on idle — embedding model set to `keep_alive: -1`, chat model set to `keep_alive: 30m`).

**Research flags:** Every sub-phase in this phase is complex and under-documented. `--research-phase` strongly recommended for: pgvector embedding quality evaluation (which model, what event representation yields best search recall), AI assistant tool calling with Ollama (multi-turn conversation design, tool selection accuracy), risk scoring algorithm design (no off-the-shelf solution). Use `gsd-ai-integration-phase` for generating AI-SPEC.md for the assistant, summarizer, and search features.

### Phase 7: Enterprise Grade (SSO, Analytics, Compliance, API)
**Rationale:** Enterprise features are gated behind the license tier system from Phase 2 and require stable, accumulated data from Phases 5 and 6. SSO is the highest-value enterprise feature (required for deals >$50K ARR). Analytics dashboards need data to be meaningful. API versioning and webhooks enable third-party integrations.

**Delivers:** SSO/SAML/OIDC integration (per-tenant IdP configuration, gated behind Enterprise tier), security analytics dashboards (ECharts: occupancy trends, event frequency, per-zone risk, calendar heatmaps — all per-tenant scoped), compliance reporting (SOC 2, ISO 27001 templates via pdfmake, exportable audit trails, retention policy automation, access review reports), API versioning (`/api/v1/` public endpoints vs VERSION_NEUTRAL internal endpoints), REST API with tenant-scoped API keys, webhook delivery for events, OpenAPI/Swagger docs per version, ANPR/LPR pipeline (Plate Recognizer Docker SDK, allowlist/blocklist, vehicle access event correlation).

**Addresses:** SSO/SAML/OIDC, security analytics dashboards, compliance reporting, API + webhooks, ANPR/LPR pipeline.

**Research flags:** `--research-phase` needed for SAML 2.0 library selection (`passport-saml` vs `openid-client` for OIDC). ANPR SDK throughput benchmark with expected camera counts. Compliance report templates follow regulatory standards — well-documented, skip research-phase for that sub-feature.

### Phase Ordering Rationale

- **Phase 1 must come first.** The dependency graph confirms multi-tenancy is required by every other feature. Building any feature without tenant scoping means rewriting it when Phase 1 lands. The Prisma Client Extension pattern means existing modules become tenant-aware without code changes — but the extension must exist first.

- **Phase 2 depends on Phase 1.** Stripe subscriptions and license keys bind to Organizations. Checkout/Portal sessions require authenticated users with organization context. Phase 2 can start as soon as the Organization model and tenant-aware auth are stable.

- **Phase 3 is partially parallelizable with Phase 2.** The design system has no backend dependencies. It can be built concurrently once design tokens are defined. However, the dashboard needs multi-tenant context (org-switching in UI) from Phase 1.

- **Phase 4 depends on Phase 2 (Stripe plans) and Phase 3 (design system).** The marketing site's pricing page references Stripe Product/Price IDs. Brand consistency requires the shared design system. Otherwise fully independent — no API dependency.

- **Phase 5 depends on Phase 1 (tenant scoping) and Phase 2 (feature gates).** Each deepened module must respect license tier limits (how many doors/cameras/sites per plan). Modules can be built in parallel since they operate on independent domain models. **Phase 5 and Phase 6 can overlap** — AI features can start building on the event data as soon as a module ships event data.

- **Phase 6 depends on Phase 5 (accumulated event data).** AI features need historical data for embeddings, pattern detection, and risk scoring. The pgvector infrastructure can be built in parallel with Phase 5's later stages.

- **Phase 7 depends on Phase 2 (Enterprise tier gating) and Phase 5/6 (data for analytics, stable APIs for integrations).** SSO can be built independently of analytics. Compliance reporting depends on audit log stability from Phase 1.

### Research Flags

Phases likely needing deeper research during planning (`/gsd-plan-phase --research-phase`):
- **Phase 1:** Prisma Client Extension + PostgreSQL RLS coexistence pattern — needs spike on migration ordering and performance overhead. TenantContextMiddleware migration from SiteContextMiddleware — backward compatibility spike. **Confidence: MEDIUM for migration path.**
- **Phase 2:** PayPal subscription lifecycle — less documented than Stripe, needs spike on edge cases. License grace period state machine — complex state transitions. **Confidence: MEDIUM for PayPal edge cases.**
- **Phase 5:** Door state machine race conditions under multi-tenant load — needs spike on message ordering with MQTT. Incident SLA escalation chains in BullMQ — needs spike on job dependency patterns. **Confidence: MEDIUM for concurrent state machine behavior.**
- **Phase 6:** Every AI sub-feature needs research-phase — pgvector embedding quality, Ollama tool calling, risk scoring algorithm design. Use `gsd-ai-integration-phase` for AI-SPEC.md generation. **Confidence: MEDIUM (AI features are novel, under-documented).**
- **Phase 7:** SAML 2.0 library selection and per-tenant IdP configuration — needs spike comparing `passport-saml` vs `openid-client`. ANPR SDK throughput benchmark. **Confidence: HIGH for SSO patterns, MEDIUM for ANPR performance.**

Phases with standard patterns (skip or light research-phase):
- **Phase 3 (partial):** Radix Themes, motion animations, Tailwind preset — well-documented. Coexistence patterns need a spike but patterns are known.
- **Phase 4:** Next.js SSG/ISR, next-intl routing, velite collections, next-seo — all well-documented. Skip research-phase entirely.
- **Phase 2 (partial):** Stripe Checkout/Customer Portal/Webhooks — Stripe docs are excellent (HIGH confidence from Context7). Skip research-phase for Stripe integration.
- **Phase 7 (partial):** ECharts analytics dashboards, compliance report templates — established patterns. Skip research-phase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All 10 new packages verified for version compatibility with existing stack. Stripe SDK v22, jose v5, nestjs-cls v5, motion v12, Radix Themes v3, next-intl v4 all verified via Context7 (official docs with high snippet counts). Existing stack (NestJS, Next.js, Prisma, Redis, BullMQ, PostgreSQL 16, Docker Compose, Caddy) unchanged. |
| Features | HIGH | Competitive analysis against Verkada, Brivo (Brivo Security Suite 2026 editions), Genetec, Suprema. Brivo feature comparison grid provides direct competitive benchmark. Stripe Billing docs (Context7 verified) cover subscription lifecycle. Feature prioritization mapped to competitor offerings and market expectations. |
| Architecture | HIGH | All major patterns sourced from official documentation: Prisma Client Extensions (official blog), Stripe webhooks (official docs), PostgreSQL RLS (official PG docs), NestJS versioning (official docs). Architecture integrates with existing 29-module NestJS application without requiring module rewrites. Scalability projections validated against PostgreSQL/TimescaleDB benchmarks. |
| Pitfalls | HIGH | Pitfalls sourced from known SaaS failure patterns, Stripe integration gotchas (verified against Stripe docs), multi-tenant security patterns (community consensus), and analysis of the existing codebase (29 NestJS modules, SiteContextMiddleware, Prisma schema). All 10 pitfalls have verified prevention strategies mapped to specific phases. |

**Overall confidence:** HIGH — all stack decisions verified against official package docs (Context7), all architectural patterns backed by official documentation or established community practice, all feature decisions benchmarked against competitor analysis. The only medium-confidence areas are explicitly flagged: PayPal subscription edge cases, pgvector embedding quality for security events, and the migration path from SiteContextMiddleware to TenantContextMiddleware.

### Gaps to Address

- **Stripe Webhook Endpoint Testing:** Stripe webhook testing requires either the Stripe CLI (`stripe listen --forward-to`) or a publicly accessible endpoint. For a self-hosted Docker deployment behind Caddy, the local development webhook testing flow needs a documented pattern. **Handle during:** Phase 2 plan-phase — spike `stripe listen` with Docker network configuration.

- **PayPal Subscription Edge Cases:** The PayPal Server SDK v2 supports subscriptions, but the documentation coverage is thinner than Stripe's. Specific edge cases around PayPal subscription lifecycle (buyer disputes, funding source failures, recurring payment declines) need validation against PayPal's sandbox. **Handle during:** Phase 2 plan-phase research spike.

- **pgvector Embedding Model Selection:** The choice between `nomic-embed-text` and `mxbai-embed-large` for security event embeddings significantly impacts search quality for natural language queries. An evaluation set of security-specific queries ("Who accessed the server room after hours?") needs to be built and tested against both models. **Handle during:** Phase 6 plan-phase — build evaluation benchmark before model commitment.

- **Ollama Tool Calling Reliability:** Ollama's tool calling support is functional but less mature than OpenAI's. The AI security assistant requires reliable tool selection (querying door states, listing alerts, executing lockdowns). Multi-turn conversation context management with tools needs spike validation. **Handle during:** Phase 6 plan-phase — spike tool calling with real security scenarios, evaluate error rate.

- **Site-to-Tenant Migration Path:** The existing codebase has `Site` as a first-class model with `siteId` on User, Camera, Door, Zone, etc. The migration to `Organization` (tenant) model with Site as a child entity needs a concrete migration script that (a) auto-creates `Organization` records for existing Sites during v1→v2 upgrade, and (b) maps all existing relationships correctly. **Handle during:** Phase 1 plan-phase — spike the migration script with a copy of production data.

- **Radix Themes + Tailwind Coexistence:** Radix Themes uses its own CSS variable system, while Tailwind handles layout. The interaction between the two (how Tailwind classes affect Radix Themes components, how to theme Radix Themes via Tailwind CSS variables) needs a practical spike to validate the recommended approach. **Handle during:** Phase 3 plan-phase — build a component showcase page using both systems.

## Sources

### Primary (HIGH confidence)
- [Prisma Client Extensions — RLS Multi-Tenancy](https://github.com/prisma/web/blob/main/apps/blog/content/blog/client-extensions-preview-8t3w27xkrxxn/index.mdx) — official Prisma blog: recommended pattern for multi-tenant SaaS with Prisma Client Extensions + PostgreSQL RLS
- [nestjs-cls Context7 docs](/papooch/nestjs-cls) — 430 snippets: AsyncLocalStorage, request-scoped providers, multi-tenancy patterns
- [Stripe Node SDK Context7 docs](/stripe/stripe-node) — 213 snippets: subscription lifecycle, webhook verification, Checkout Sessions, Customer Portal
- [PayPal Server SDK Context7 docs](/paypal/paypal-typescript-server-sdk) — 1,228 snippets: order creation, subscription management, webhook verification
- [Motion (framer-motion successor) docs](https://motion.dev/docs/react-animation) — official docs: AnimatePresence, layout animations, variants, useAnimate
- [Radix Themes Context7 docs](/websites/radix-ui_themes) — 981 snippets: pre-styled components, dark mode, CSS variable theming
- [next-intl Context7 docs](/amannn/next-intl) — 942 snippets: defineRouting, middleware, ICU messages, App Router integration
- [next-seo Context7 docs](/garmeeh/next-seo) — 618 snippets: DefaultSeo, JSON-LD, Open Graph, Twitter Cards
- [Velite Context7 docs](/zce/velite) — 358 snippets: defineConfig with Zod, MDX support, type-safe output
- [NestJS Guards & Interceptors Context7 docs](/nestjs/nest) — guard execution order, VersioningType.URI, VERSION_NEUTRAL
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/16/ddl-rowsecurity.html) — official PG docs: CREATE POLICY, session variables, USING expressions
- Existing codebase analysis: Prisma schema (546 lines, 29 models), 29 NestJS modules, SiteContextMiddleware, JWT strategy, RolesGuard, Caddy routing, pnpm workspace structure

### Secondary (MEDIUM confidence)
- [Brivo Security Suite Editions](https://www.brivo.com/platform/security-suite-editions/) — competitive benchmark: Standard/Professional/Enterprise tiers, feature comparison grid
- [Brivo Security Suite Overview](https://www.brivo.com/platform/security-suite/) — platform capabilities: Brivo AI, Brivo Genius, Global View
- [Verkada Pricing Page](https://www.verkada.com/pricing/) — hardware + license model, per-device licensing
- Prisma Client Extension performance overhead (~1-5% per query) — estimated from community discussions; actual overhead depends on query complexity
- RLS policy evaluation overhead on indexed columns — PostgreSQL official benchmarks show negligible overhead
- Stripe webhook delivery latency (~300ms typical) — from Stripe documentation

### Tertiary (LOW confidence — pattern inference)
- Brivo AI naming ("Brivo AI", "Brivo Genius") — indicates AI is now table-stakes branding for physical security platforms
- Verkada "government-grade" tier — suggests federal/defense market, supports self-hosted strategy
- pgvector HNSW index incremental staleness — community consensus, conservative prevention strategies applied

---
*Research completed: 2026-07-15*
*Ready for roadmap: yes*
