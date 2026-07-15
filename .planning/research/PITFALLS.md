# Pitfalls Research

**Domain:** Security SaaS Platform Transformation (Multi-tenancy + Billing + Premium UI)
**Researched:** 2026-07-15
**Confidence:** HIGH

## Critical Pitfalls

Mistakes that cause rewrites or major issues when retrofitting multi-tenancy, billing, and premium UI onto an existing self-hosted platform.

---

### Pitfall 1: Multi-Tenancy via siteId Ambiguity (The "Site != Tenant" Trap)

**What goes wrong:**
The current codebase uses `User.siteId` as the scoping mechanism (one user → one site). Teams retrofit multi-tenancy by renaming "site" to "tenant" or adding a `tenantId` alongside `siteId`, creating ambiguous ownership chains where it's unclear whether a camera belongs to a tenant or a site, whether users span multiple sites within a tenant, and which entity owns the billing relationship.

**Why it happens:**
v1.0 already has a `Site` model with users, cameras, doors, and zones attached. The natural (and wrong) instinct is to slap `tenantId` onto everything and call it done. But sites and tenants are different concepts: a tenant is a billing customer (a corporation), a site is a physical location (a building). One tenant can have multiple sites. Users work at sites but are provisioned at the tenant level. Billing happens at the tenant level, not the site level.

**How to avoid:**
- Introduce a `Tenant` model as a first-class entity **before** touching anything else. The Tenant is the billing and administrative boundary.
- **Site stays** as a physical-location concept under Tenant (`Tenant 1:N Site`).
- **User** belongs to a `Tenant` (not a `Site` directly), then has site-level assignments through a join table (`UserSite` with roles-per-site).
- All current `siteId` references must be reconciled: does this operation scope at the tenant level or the site level? Security events (cameras, doors, alerts) scope to sites. Billing and user management scope to tenants.
- Run a data migration: existing `Site` records become children of auto-created `Tenant` records. This migration must be **one-way, tested, and reversible**.

**Warning signs:**
- Any PR that adds `tenantId` to a model without also adding a `Tenant` model.
- Discussions about "can we just use siteId as tenantId?"
- Confusion about whether "site settings" or "tenant settings" own billing configuration.
- A service file that queries `where: { tenantId: ... }` in some places and `where: { siteId: ... }` in others without a clear rule.

**Phase to address:**
Architecture refactor phase (Phase 1). This is the foundational change. Everything else — billing, RBAC, data isolation — depends on getting this right.

---

### Pitfall 2: Billing Webhook Blindness (Assuming Stripe "Just Works")

**What goes wrong:**
The team implements Stripe Checkout, creates subscriptions, and sees money flowing in test mode. But in production, subscription status drifts from database state because webhook events (`invoice.payment_failed`, `customer.subscription.deleted`, `invoice.finalization_failed`) are not handled, not handled idempotently, or handled in the wrong order. Customers who canceled still have access. Customers who paid are locked out. The database says `active` but Stripe says `past_due`.

**Why it happens:**
Stripe is deceptively simple in test mode with happy-path credit cards. The real complexity lives in **webhook handling**: Stripe sends events asynchronously, can deliver them out of order, and may retry the same event multiple times. Teams often implement the checkout flow, test a single successful payment, and move on — never testing subscription cancellation, payment failure, trial expiration, proration edge cases, or webhook replay.

**How to avoid:**
- **Build the webhook handler FIRST**, before the checkout flow. Every subscription lifecycle event must be handled:
  - `customer.subscription.created` → provision access
  - `customer.subscription.updated` → sync plan changes (upgrade/downgrade)
  - `customer.subscription.deleted` → revoke access immediately
  - `invoice.paid` → confirm active subscription
  - `invoice.payment_failed` → notify user, eventually suspend
  - `invoice.finalization_failed` → alert operations, subscription is billing but not collecting
- **Idempotency is mandatory**: Store processed event IDs. Reject duplicates. Stripe retries events.
- **Use Stripe as the source of truth** for subscription state, not your database. Your database mirrors Stripe state but never leads it.
- **Test every failure mode**: expired card, insufficient funds, SCA/3DS authentication required, trial expiration without payment method, proration during mid-cycle upgrades, cancellation and immediate reactivation.

**Warning signs:**
- A webhook handler that only logs events instead of acting on them.
- No event deduplication table.
- Subscription status stored only in your database and synced from checkout success callback (not webhooks).
- Testing only with Stripe test card `4242 4242 4242 4242` and never testing declined cards.

**Phase to address:**
Subscription & billing phase. Must be the first thing built within that phase — webhooks before checkout UI.

---

### Pitfall 3: UI Redesign Without Feature Parity (The "Beautiful Empty Shell" Problem)

**What goes wrong:**
The team commits to a "page-by-page premium redesign" of the dashboard. The first redesigned page (say, the camera grid) looks stunning with 2026 design language. But the redesign effort takes 4x longer than estimated because every component needs to be rebuilt (not restyled). Meanwhile, 80% of existing functionality is still in the old UI. Users toggle between beautiful new pages and ugly old pages. The redesign never finishes because scope keeps expanding. The product ships with a beautiful but incomplete frontend.

**Why it happens:**
Redesigning "everything" is a seductive goal. But the existing dashboard has 15+ feature modules (cameras, alerts, access control, incidents, visitors, ANPR, equipment, analytics, patterns, risk, governance, maintenance). Each page has complex data tables, filters, modals, real-time updates, and role-conditional UI. Redesigning each page from scratch is a full rebuild, not a restyle. Teams underestimate the combinatorial explosion: each redesigned page also needs its mobile equivalent, and the design system itself needs to be built first.

**How to avoid:**
- **Phase the redesign into "visual foundation → high-traffic pages → long tail":**
  1. Build the design system first (colors, typography, spacing, component library). Apply it globally via CSS variables and shared Tailwind config. This gives **instant uplift** to EVERY existing page without rewriting any page logic.
  2. Identify the 3 most-used pages (Overview dashboard, Camera grid, Alert list). Redesign these end-to-end.
  3. The remaining pages get the design system's visual uplift without full rebuilds. They look "new" because the foundation changed.
  4. Deepen remaining pages over subsequent phases — not all at once.
- **Never block a feature on its UI redesign.** If the incident management feature needs deepening, deepen it with the new design system applied — don't wait for a "perfect redesign" phase.
- **Share components between Dashboard and Mobile** where possible (design tokens, color schemes, typography scales). Don't redesign them independently.

**Warning signs:**
- Phrases like "we'll redesign everything" or "every page gets a full rebuild."
- Design mockups that show radically different interaction patterns for existing features (e.g., completely new navigation model).
- No plan for how the old UI coexists with the new UI during the transition.
- Counting "pages" without counting sub-pages, modals, filter panels, detail views, settings screens, and role-conditional variants.

**Phase to address:**
Premium UI/UX redesign phase. Must start with the design system foundation, not individual page redesigns.

---

### Pitfall 4: The "Self-Hosted Security Product" Trust Paradox

**What goes wrong:**
The platform is deployed on the customer's own infrastructure (Docker Compose, self-hosted). But the SaaS billing model, the premium branding, and the AI-first positioning set expectations of a cloud-managed service. Customers expect: automatic updates, zero-downtime deployments, cloud-level reliability guarantees, instant support, and SOC 2 compliance. When they realize they're managing their own Docker containers and Ollama instances, trust erodes. Security buyers are the most skeptical audience — they will probe every claim.

**Why it happens:**
The product straddles two worlds: self-hosted deployment (Docker Compose + Caddy) with SaaS-style monetization (subscriptions + licensing). This is a legitimate model (many successful companies do it), but the messaging must be crystal clear. If the landing page says "AI-powered security platform" with slick animations but the deployment docs say "install Docker and download our Compose file," there's a perception gap that breeds distrust. Security teams are specifically trained to detect this kind of gap.

**How to avoid:**
- **Own the hybrid model explicitly in all messaging.** Position it as an advantage: "Deploy on your infrastructure. We handle the intelligence." This is actually a strong differentiator for security-conscious buyers who cannot send video to the cloud.
- **Invest heavily in deployment UX.** The Docker Compose experience should feel polished: one-command startup, clear health checks, automatic SSL via Caddy, and a setup wizard (not raw .env editing).
- **Separate the "platform" from the "service."** The platform runs on customer infra. The subscription pays for: AI model updates, threat intelligence feeds, software updates, support, and the dashboard/mobile apps. Make this explicit.
- **Never claim cloud-level SLAs** if you can't deliver them on self-hosted infra. Be honest about what the customer manages vs. what you manage.
- **Add a SaaS-hosted option eventually**, even if it's not in v2.0. Many buyers will want it, and having it on the roadmap builds credibility.

**Warning signs:**
- Landing page copy that implies the product is fully managed.
- No clear separation in UI between "platform features" and "subscription service features."
- Deployment docs that are an afterthought (a single README section).
- Support expectations not defined (response time, channels, SLAs).

**Phase to address:**
Public landing page + branding phase. Messaging must be fixed before any marketing launches.

---

### Pitfall 5: License Management as an Afterthought (The "Activation Key Bypass" Problem)

**What goes wrong:**
The team implements license key validation as a simple string comparison: user enters a key, server checks `license_keys` table, server returns `{ valid: true }`. An attacker decompiles the mobile app or inspects the dashboard's network tab, sees the validation endpoint, and writes a 10-line script to bypass it. Or the license check is only client-side (dashboard checks `localStorage`), and anyone can modify it. Within days of launch, cracked versions circulate.

**Why it happens:**
License management seems simple at first: generate keys, validate them, grant access. But real license enforcement requires: offline validation for on-premise deployments, key revocation, hardware fingerprint binding, anti-tampering for mobile apps, seat counting enforcement, and grace periods for expired licenses so critical security systems don't abruptly shut down during a payment dispute. Teams underestimate the cat-and-mouse game with bypass techniques and treat license checks as a feature flag rather than a security boundary.

**How to avoid:**
- **Server-side enforcement is mandatory.** The API must check the tenant's license validity on **every authenticated request** (or cache with a short TTL). Client-side checks are cosmetic only.
- **License validation must be a middleware/guard**, not scattered across controllers. A `LicenseGuard` checks: tenant's plan tier, seat count, expiry date, and feature flags. If the license is invalid, return 402 Payment Required.
- **For the mobile app**: use certificate pinning, obfuscate validation logic, and NEVER store the full license key on the device — store a short-lived session token instead.
- **For on-prem deployments**: the license check must work offline (no phoning home every minute). Use an offline license file signed with a private key. The server verifies the signature locally. Periodic online checks (daily/weekly) for revocation.
- **Plan for grace periods.** A security platform that hard-locks during a payment dispute is a liability. Gracefully degrade features: keep cameras streaming and doors working, but disable premium AI features until payment is resolved.
- **Test license bypass actively.** Assign someone to try to break it before launch.

**Warning signs:**
- License validation is a single `if (key === storedKey)` check.
- No offline validation mechanism for on-prem deployments.
- License checks only on login, not on subsequent API calls.
- The word "DRM" being used dismissively — license management for a security platform IS a security concern.

**Phase to address:**
Subscription & licensing phase. Must be architected alongside the billing system, not bolted on after.

---

### Pitfall 6: Proration, Upgrades, and Downgrades Without Preview (The "Surprise Bill" Problem)

**What goes wrong:**
A customer upgrades from Basic ($99/month) to Premium ($299/month) mid-cycle. The system charges them $299 immediately without showing what happens to the $99 they already paid. The customer sees a double charge, disputes it, and leaves a 1-star review. Or conversely, a customer downgrades expecting a credit, sees nothing, and feels cheated.

**Why it happens:**
Stripe handles proration automatically, but the UI often doesn't surface it. The proration calculation involves: remaining time in the billing period, the price difference between plans, whether to issue credits or just adjust the next invoice, and whether add-ons or per-seat changes are involved. Teams implement the upgrade API call but skip building the "preview your changes" UI because it seems optional.

**How to avoid:**
- **Always show a preview invoice before confirming any plan change.** Use Stripe's `Invoice.createPreview` API with `subscription_details` to calculate the exact proration.
- Surface three numbers in the preview UI:
  1. **Credits** from the current plan (unused portion)
  2. **Charges** for the new plan (remaining period)
  3. **Net change** (what actually hits their card today)
- For downgrades, be explicit: "Your plan will change to Basic at the end of your current billing period (June 15). You'll keep Premium features until then."
- Test every combination: Basic→Premium, Premium→Basic, adding seats, removing seats, mid-cycle cancellation, and trial→paid conversion.

**Warning signs:**
- The plan change UI has a single "Change Plan" button with no preview step.
- No mention of proration in the billing FAQ or terms.
- Testing plan changes only from the Stripe Dashboard, not from the app's own UI.

**Phase to address:**
Subscription & billing phase. Part of the plan management UI within the billing dashboard.

---

### Pitfall 7: The "Shared Database, No Guardrails" Multi-Tenancy Disaster

**What goes wrong:**
All tenants share a single PostgreSQL database with application-level filtering (`WHERE tenantId = ?`). A developer writes a new query in the camera service and forgets the `tenantId` filter. Suddenly, Tenant A can see Tenant B's cameras. Because this is a security platform (video feeds, access control events, door states), a data leak isn't just embarrassing — it's a physical security breach.

**Why it happens:**
Prisma doesn't enforce multi-tenancy at the ORM level. Every query must manually include the tenant filter. In a codebase with 29 modules, hundreds of queries, and multiple developers, a missing `where: { tenantId }` is inevitable. The existing `SiteContextMiddleware` sets a PostgreSQL session variable for RLS, but RLS policies aren't yet defined on all tables, and the middleware only handles `siteId` — not the new `tenantId`.

**How to avoid:**
- **Prisma Client Extensions for automatic tenant filtering**: Create a Prisma client extension that automatically injects `tenantId` into every query. This is a single point of enforcement:
  ```typescript
  const prismaWithTenant = prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          if (tenantId && operation !== 'create') {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
      },
    },
  });
  ```
- **Complement with PostgreSQL Row-Level Security (RLS)**: Enable RLS on every tenant-scoped table. The middleware already sets `app.current_site_id` — extend it to set `app.current_tenant_id`. RLS provides defense-in-depth: even if the application layer misses a filter, PostgreSQL blocks the query.
- **Integration test for cross-tenant access**: A dedicated test suite that creates two tenants, populates data, and asserts that Tenant A's queries never return Tenant B's data. Run this in CI.

**Warning signs:**
- Any raw SQL query (`$executeRaw`, `$queryRaw`) without a `tenantId` parameter.
- Service methods that fetch data without receiving the tenant context from the request.
- RLS policies defined on only some tables.
- No test that specifically verifies cross-tenant data isolation.

**Phase to address:**
Architecture refactor phase (Phase 1). Tenant isolation must be proven before any SaaS features ship.

---

### Pitfall 8: International Branding That Alienates Core Markets

**What goes wrong:**
The team repositions as "international, AI-first, modern" by adopting a generic tech-company aesthetic: abstract gradients, robotic AI imagery, English-only copy with tech jargon, and pricing in USD only. The core market (francophone West Africa, where the platform is already deployed with `country: "SN"` default) feels the product has abandoned them. Meanwhile, the new "global" positioning doesn't actually resonate with US or European buyers because it lacks local case studies, compliance certifications, or regional sales presence.

**Why it happens:**
"International" doesn't mean "generic and English." It means: multi-language support, local payment methods (Mobile Money in Africa, SEPA in Europe), region-specific compliance (GDPR for EU, data sovereignty for African markets), and culturally appropriate design that doesn't default to Silicon Valley aesthetics. The current codebase already has French-language i18n (`apps/dashboard/lib/i18n/fr.ts` as primary, `en.ts` as secondary) and defaults to Senegal in the country field — the platform has an existing user base with specific expectations.

**How to avoid:**
- **Localize before you globalize.** Strengthen the existing French/West African user experience first (complete French translations, CFA franc pricing, Mobile Money payment integration). This builds a loyal base that funds international expansion.
- **Add English as a secondary market**, not as a "rebranding." The platform remains true to its roots while adding English support.
- **Design system tokens for cultural adaptation**: RTL support in the design system, culturally neutral iconography (avoid hand gestures, religious symbols, or region-specific metaphors), date/number/currency formatting via `Intl` APIs.
- **Payment methods by region, not a single global default.** Stripe supports regional payment methods — implement Mobile Money, card, SEPA, etc. based on the tenant's country.
- **Never default to "global" in design decisions.** Pick a primary market, design for it, then extend. The current market is francophone Africa — design for it first and foremost.

**Warning signs:**
- Replacing French i18n with English as the primary language.
- Dropping CFA franc or regional payment support.
- Using AI imagery that feels like "generic Silicon Valley startup" rather than a security platform.
- No plan for RTL layout support in the design system.

**Phase to address:**
International branding + public landing page phase. Branding decisions cascade into every UI component.

---

### Pitfall 9: Deepening Features Without Understanding Current Limitations (The "Sunk Cost Rewrite")

**What goes wrong:**
The team decides to "deepen" the ANPR/LPR feature from v1.0. The current implementation stores plates in a `VehicleList` table with basic CRUD. The deepening plan calls for: real-time plate recognition, allowlist/blocklist matching, alert correlation, per-camera configuration, and confidence scoring. But when implementation starts, the existing code is too tightly coupled to the v1.0 patterns: the `AnprService` directly queries Prisma with no abstraction, the recognition pipeline is hardcoded to a specific Ollama model, and the alert correlation assumes a synchronous flow. The team spends 60% of the deepening phase rewriting v1.0 code instead of adding new capabilities.

**Why it happens:**
"Deepening" sounds like an additive process, but v1.0 code was built as a prototype. Many features work at a surface level but have no internal architecture to support deepening. The service methods are thin wrappers around Prisma queries with no business logic layer. Adding "deep" features to shallow code means rebuilding the foundation first. Teams underestimate how much of v1.0 must be rewritten to support v2.0 depth.

**How to avoid:**
- **Audit each module before deepening it.** Score it on: test coverage, abstraction layers (does the service have a `findByCameraAndPlate()` method, or does it inline raw Prisma queries?), coupling to v1.0 assumptions (hardcoded model names, synchronous-only flows), and data model adequacy for the deepened feature.
- **If a module scores below 50% on the audit, plan for a rewrite, not a deepening.** It's faster to rewrite cleanly with proper patterns than to patch brittle code.
- **Apply stratification**: Controllers (thin), Services (business logic), Repositories (data access). If v1.0 services mix business logic with Prisma queries, split them during deepening.
- **Deepen one module completely** before starting the next. A partially-deepened module is worse than an un-deepened one — it has two codebases (old + new) coexisting.

**Warning signs:**
- A deepening plan that estimates "2 days" for a module that currently has 500 lines of coupled code.
- Service files where every method directly calls `this.prisma.entity.findMany()` with no intermediate layer.
- No unit tests for the existing module (you can't deepen what you can't verify).
- "We'll clean it up later" — said during the deepening phase itself.

**Phase to address:**
Feature deepening phases. Each deepening phase should start with a module audit, not with implementation.

---

### Pitfall 10: Real-Time System Degradation Under Multi-Tenant Load

**What goes wrong:**
The current system processes video frames, generates alerts, and pushes them via Socket.IO in real time. This works with one tenant. With 50 tenants, each with 10 cameras streaming at 5 FPS, the system generates thousands of frame-analysis jobs per second. The BullMQ queue backs up. Socket.IO rooms multiply. The Redis pub/sub channel saturates. Sub-second alerting (a core v1.0 requirement) degrades to 10+ second delays. Tenants blame each other's load for the slowdown, destroying the multi-tenant value proposition.

**Why it happens:**
v1.0 was built for a single deployment (one organization, many sites). The queuing system, WebSocket architecture, and AI preprocessing pipeline don't enforce tenant-level resource isolation. A noisy neighbor (a tenant with 100 cameras) can starve a small tenant (3 cameras) of processing resources. The current architecture assumes all work is equally important, but in multi-tenant SaaS, resource fairness is critical.

**How to avoid:**
- **Per-tenant BullMQ queues or rate limits.** Each tenant gets a dedicated queue or a concurrency cap. A single tenant's spike cannot block others.
- **Socket.IO namespace per tenant**: `/tenant-{id}` instead of a global namespace. Reduces broadcast amplification.
- **Database connection pooling with tenant-aware limits.** Use PgBouncer or Prisma's connection limit with per-tenant accounting.
- **AI preprocessing isolation**: The Python FastAPI preprocessor should have per-tenant rate limits. A single tenant's high frame rate shouldn't monopolize the Ollama instance.
- **Monitor per-tenant latency**, not just global latency. A 50ms average that hides a 5-second P99 for one tenant is a failed SLA.

**Warning signs:**
- BullMQ queue names that are global (`frame-processing`) rather than tenant-scoped (`frame-processing:{tenantId}`).
- Socket.IO emitting to all connected clients regardless of tenant.
- No per-tenant metrics or dashboards.
- Load testing that only tests with a single tenant's data volume.

**Phase to address:**
Architecture refactor phase (Phase 1). Queue and real-time architecture must be redesigned for multi-tenancy before adding more tenants.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems when adding commercial SaaS features.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use `siteId` as `tenantId` without a Tenant model | No schema migration needed | Every future query has ambiguous scoping; billing has nowhere to attach | **Never.** This is the definition of technical debt that compounds. |
| Client-side license validation only | Fast to implement, no API changes | Cracked within hours of launch; no way to revoke; support nightmare | **Never.** This is a security vulnerability, not a shortcut. |
| Single Stripe webhook handler with no event deduplication | One endpoint, easy to deploy | Duplicate events cause double-charging, double-provisioning, or race conditions | **Only for initial dev testing.** Must be replaced before any real payments. |
| Hardcode plan names/features in frontend conditionals (`if (plan === 'premium')`) | Quick feature gating | Every plan change requires frontend redeploy; mobile app also has hardcoded checks | **Only during initial implementation.** Extract to feature flags from the backend within the same phase. |
| Full-page dashboard redesign without a design system | Beautiful first page, fast to show progress | Every subsequent page is inconsistent; design tokens diverge; redesign takes 4x longer | **Never.** Build the design system first, even if it delays the first demo. |
| Skip subscription lifecycle states beyond "active" and "canceled" | Simpler state machine | Past-due customers keep access; trial expiration doesn't pause; proration edge cases break billing | **Only if no real payments are being collected.** Must be complete before production launch. |

## Integration Gotchas

Common mistakes when connecting Stripe, PayPal, and other external services to a self-hosted platform.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Stripe Webhooks** | Trusting event order; not verifying signatures | Verify `stripe.webhooks.constructEvent()` signature on EVERY request. Process events idempotently (store event IDs). Never assume event A arrives before event B. |
| **Stripe Checkout** | Redirecting to success URL and marking subscription as active | Checkout success means the session completed — NOT that payment succeeded. Wait for `checkout.session.completed` webhook AND `invoice.paid` before provisioning. |
| **Stripe Customer Portal** | Letting Stripe's hosted portal handle everything without syncing state back | When a customer cancels via the portal, your app gets a `customer.subscription.deleted` webhook. If your webhook handler is down, the database is out of sync. Always add a "sync with Stripe" admin function. |
| **PayPal (parallel integration)** | Duplicating billing logic for each payment provider | Abstract the billing interface: `BillingProvider.createSubscription()`, `.cancelSubscription()`, `.getStatus()`. Stripe and PayPal implement the same interface. The rest of the app never knows which provider is active. |
| **Ollama (local LLM)** | Assuming Ollama is always available and responsive | Ollama is self-hosted by the customer. It may be on a separate machine, may go down, may be overloaded. All AI calls need timeouts, retries, circuit breakers, and graceful degradation (fall back to rule-based detection when AI is unavailable). |
| **PostgreSQL RLS** | Enabling RLS without testing application queries against it | RLS policies silently filter rows. A query that returns `[]` might mean "no data" or "RLS blocked it." Write integration tests that explicitly verify RLS behavior by querying as different tenants. |
| **go2rtc streaming** | Hardcoding stream URLs per camera without tenant scoping | Stream URLs must be tenant-isolated. A tenant guessing another tenant's camera ID should not get a video stream. Validate tenant ownership in the API that generates stream tokens. |

## Performance Traps

Patterns that work with a single tenant but fail catastrophically at multi-tenant SaaS scale.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| **Global BullMQ queue without per-tenant isolation** | One tenant's bulk camera onboarding blocks all other tenants' frame processing | Per-tenant queues or concurrency caps. Alternatively, priority queues where small tenants get proportionally more slots. | 5-10 tenants with 10+ cameras each |
| **Socket.IO broadcast to all rooms on every event** | Every connected client receives every tenant's events; WebSocket messages multiply by tenant count | Namespace or room per tenant. Only broadcast within the tenant's scope. | 3+ tenants with dashboard open |
| **`SELECT *` queries on tables that grow per-tenant** | Dashboard overview queries scanning millions of rows across all tenants | Always include `tenantId` in WHERE clause of every query. Add composite indexes `(tenantId, createdAt)`. | 100K+ rows in alerts/camera_events table |
| **Ollama vision model called synchronously in the request path** | AI analysis blocks HTTP responses; request timeouts cascade | AI analysis must always be async (BullMQ job). The API returns immediately with a `processing` status, results delivered via WebSocket. | 5+ concurrent requests during peak hours |
| **License validation on every API call without caching** | Database hammered by license checks; p99 latency spikes | Cache license validity in Redis with a 60-second TTL. Invalidate on license change events. | 100+ concurrent users across tenants |
| **Prisma `$transaction` wrapping multi-tenant queries** | Long-running transactions holding locks across tenant boundaries | Transactions must be per-tenant and short-lived. Never wrap operations on different tenants in the same transaction. | Any multi-tenant deployment |

## Security Mistakes

Domain-specific security issues for a multi-tenant physical security SaaS platform.

| Mistake | Risk | Prevention |
|---------|------|------------|
| **Cross-tenant camera stream access** | Attacker Tenant A views Tenant B's live security camera feeds | Stream URL tokens must be tenant-scoped and short-lived (JWT with `tenantId` claim). API validates `tenantId` before generating stream tokens. |
| **License key printed in debug logs** | License keys exposed in log aggregation, customer support tickets, or error reports | Mask license keys in logs (`****-XXXX-****`). Use a dedicated secrets manager for the signing key. |
| **Admin can impersonate any tenant without audit trail** | Support staff views customer data without the customer knowing; compliance violation | All admin cross-tenant access must: create an immutable audit log entry with reason, notify the tenant admin (configurable), and time out after the session. |
| **Stripe webhook endpoint is publicly accessible with no IP restriction** | Anyone can POST fake events if they discover the webhook secret | Verify Stripe signature on every request (this is cryptographically secure). Additionally, restrict webhook endpoint to Stripe's IP ranges if possible. |
| **Tenant A's BullMQ jobs visible in Tenant B's dashboard** | Queue inspection reveals another tenant's processing patterns, camera counts, alert volumes | Queue names must be tenant-scoped. Dashboard queue inspection must filter by tenant. Never expose global queue metrics to tenant users. |
| **Mobile app contains hardcoded API keys or secrets** | APK decompilation reveals credentials; attacker gains API access | Use `expo-secure-store` for tokens. Never hardcode secrets. License validation uses short-lived session tokens, not the license key itself. |

## UX Pitfalls

Common user experience mistakes when transforming a prototype into a premium SaaS product.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| **Billing dashboard hidden behind 3 levels of settings navigation** | Users can't find their invoices, plan details, or cancellation flow; they email support or initiate chargebacks | Billing is a top-level navigation item. "Account" or "Billing" in the main sidebar, visible to tenant admins. |
| **Plan upgrade button disabled during billing period** | User wants to upgrade but "change plan" is a modal that says "contact support" | Allow upgrades at any time with proration preview. Only restrict downgrades to end-of-period (standard SaaS pattern). |
| **French i18n is incomplete — 70% translated, 30% English fallback** | Mixed-language interface feels unprofessional; francophone users lose trust | Complete French translations to 100% before launch. Use i18n linting to catch missing keys. |
| **"AI-powered" features that show a loading spinner for 30 seconds** | User thinks the product is broken; "AI" becomes a negative signal | Show progressive results: an immediate low-confidence detection, refined over subsequent frames. Never make AI a blocking UX. |
| **License expiration is a hard lockout with no warning** | Critical security operations stop mid-shift because a payment failed | Grace period: warning banner at 7 days, degraded mode (no premium features) at 3 days past due, read-only mode at 14 days. Never hard-lock. |
| **Mobile app requires re-login after every app switch** | Guards can't quickly check alerts or doors during patrol | Long-lived refresh tokens (30 days). Biometric unlock (FaceID/TouchID) for quick re-auth. Persistent WebSocket connection in background. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces for a commercial SaaS launch.

- [ ] **Subscription checkout:** Often built but missing: proration preview, plan comparison table, tax calculation (Stripe Tax), invoice history, and payment method update UI. Verify the complete lifecycle: signup → trial → payment → renewal → upgrade → downgrade → cancel → reactivate.
- [ ] **Multi-tenant data isolation:** Often assumes "we added tenantId to queries" is sufficient. Verify with: penetration test attempting cross-tenant access, RLS enabled on ALL tables, audit log of any cross-tenant admin access.
- [ ] **License management:** Often missing: offline validation for air-gapped deployments, hardware fingerprint binding, grace period logic, revocation API, seat-count enforcement in the API (not just the dashboard).
- [ ] **Stripe webhooks:** Often built for happy path only. Verify: idempotency (replay protection), all 15+ subscription events handled, `invoice.finalization_failed` alerting, webhook signature verification, dead-letter queue for failed events.
- [ ] **International branding:** Often "English + a language switcher." Verify: complete French translations, RTL layout support in the design system, regional payment methods, `Intl` formatting for dates/numbers/currencies, culturally appropriate imagery.
- [ ] **Mobile app:** Often tested on a single device with good connectivity. Verify: offline functionality (cached data when network is down), background push notifications, biometric auth, low-bandwidth mode (guards on cellular in remote sites).
- [ ] **Deployment experience:** Often "here's the docker-compose.yml, figure it out." Verify: setup wizard (first-run configuration UI), health check dashboard, automatic SSL via Caddy, upgrade path from v1.0 to v2.0 documented and tested.
- [ ] **Admin cross-tenant access:** Often "SUPER_ADMIN role sees everything." Verify: audit log of every cross-tenant access, tenant admin notification (optional), session timeout on impersonation, RBAC that distinguishes "platform admin" from "tenant admin."

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| **Site != Tenant confusion** | HIGH | Data migration to backfill Tenant records, update all FK relationships, rewrite queries with tenant scoping. 2-4 weeks of dedicated effort if caught before billing launch; 2-3 months if caught after. |
| **Billing webhook blindness** | MEDIUM | Backfill subscription states by calling Stripe API for all customers. Replay missed webhooks from Stripe Dashboard. Build proper webhook handler. 1-2 weeks. |
| **Cross-tenant data leak** | CRITICAL | Requires immediate incident response: identify affected tenants, notify them (legal/compliance requirement in many jurisdictions), fix the query, audit all other queries for the same pattern. May require regulatory reporting. |
| **License bypass discovered post-launch** | HIGH | Revoke all keys, issue new keys with stronger validation, force tenant re-activation. Customer trust damage may be permanent if attackers gained access via cracked licenses. |
| **UI redesign scope creep** | MEDIUM | Freeze redesign, ship with the design system applied globally (instant uplift) and the 3 most-used pages redesigned. Defer remaining pages. Communicate transparently: "More pages getting the new design in the next update." |
| **Real-time degradation under load** | HIGH | Emergency queue partitioning, per-tenant rate limits, database connection pooling tuning. May require architecture changes if the queue system wasn't designed for multi-tenancy. 2-4 weeks. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Site != Tenant confusion (P1) | Phase 1: Architecture Refactor | Integration test: create two tenants with sites, verify complete data isolation |
| Shared database, no guardrails (P7) | Phase 1: Architecture Refactor | Penetration test: attempt cross-tenant access from authenticated tenant user |
| Real-time degradation (P10) | Phase 1: Architecture Refactor | Load test: 50 tenants × 10 cameras × 5 FPS, verify sub-second alert latency per tenant |
| Feature deepening without audit (P9) | Each deepening phase | Module audit scorecard before any implementation begins |
| Billing webhook blindness (P2) | Phase N: Subscription & Billing | Test ALL Stripe subscription events in sandbox, including failure modes |
| Proration/upgrade confusion (P6) | Phase N: Subscription & Billing | UI test: verify preview invoice shows correct proration for all plan transitions |
| License afterthought (P5) | Phase N: Subscription & Billing | Red team exercise: attempt to bypass license validation from mobile and dashboard |
| Self-hosted trust paradox (P4) | Phase N+1: Landing Page & Branding | Review all marketing copy for accuracy about deployment model |
| International branding alienation (P8) | Phase N+1: Landing Page & Branding | French i18n audit: 100% coverage, no English fallbacks on primary user paths |
| UI redesign without parity (P3) | Phase N+2: Premium Dashboard UI | Verify all existing features remain functional after design system application |

---

## Sources

- **Stripe official docs** — Subscription webhooks, proration, Checkout Sessions, Error Handling (docs.stripe.com) — HIGH confidence
- **Stripe Node.js SDK** — Error type classification, idempotency key handling, webhook signature verification (github.com/stripe/stripe-node via Context7) — HIGH confidence
- **Context7 / Prisma** — Interactive transactions, isolation levels, multi-schema patterns (github.com/prisma/prisma via Context7) — MEDIUM confidence
- **Codebase analysis** — 29 NestJS modules, single-tenant Site model, RLS middleware (site-context.middleware.ts), Prisma schema with 25+ models — HIGH confidence (primary source)
- **Existing i18n structure** — French (`fr.ts`) as primary, English (`en.ts`) as secondary in dashboard — HIGH confidence
- **Known SaaS pitfalls** — Industry pattern recognition from failed SaaS launches: Verkada security incident patterns, self-hosted vs. SaaS trust gap, subscription billing horror stories — MEDIUM confidence (synthesized from industry knowledge, not single-source)

---

*Pitfalls research for: Oversight Hub v2.0 — Commercial SaaS Platform Transformation*
*Researched: 2026-07-15*
