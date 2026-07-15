# Feature Research: Commercial SaaS Physical Security Platform

**Domain:** Physical security intelligence — unified access control, video surveillance, AI analysis, incident management
**Researched:** 2026-07-15
**Confidence:** HIGH

## Executive Summary

The v2.0 milestone transforms a v1.0 technical prototype into a premium commercial SaaS platform. This requires adding two layers on top of existing functionality: (1) a **commercial SaaS layer** (multi-tenant architecture, subscription billing, license management, public marketing website, international branding) and (2) a **production-depth layer** (every existing feature rebuilt from prototype quality to production-grade — proper error states, loading states, edge cases, UX polish, performance, and accessibility).

Competitive analysis across Verkada, Brivo, Genetec, Suprema, Eagle Eye Networks, and the broader physical security SaaS market reveals clear patterns: the market splits into cloud-native unified platforms (Verkada, Brivo — 10-15 years old) and legacy on-premise systems migrating to cloud (Genetec, Suprema — 20+ years). Oversight Hub competes in the unified platform space, differentiating through AI depth, self-hosted deployment (competitors are cloud-only), and modern 2026 visual design.

**Key competitive insight:** Brivo's 2026 Security Suite demonstrates the market direction — tiered editions (Standard/Professional/Enterprise), add-on feature packs, AI assistant (Brivo Genius), global multi-site management, anomaly detection, and a reseller/partner ecosystem. Verkada's model is hardware-first (hardware + annual license per device). Oversight Hub's differentiator is being **software-only, AI-first, and self-hostable** — filling a gap for organizations that need deep AI correlation but can't or won't send security video to the cloud.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that a commercial security SaaS platform *must* have. Missing any of these = product feels incomplete to buyers evaluating against Verkada/Brivo.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Multi-tenant architecture** | Every commercial SaaS has tenant isolation. Buyers expect their data is segregated. Without it, can't sell to enterprises. | HIGH | Requires `tenant_id` on every table, row-level security, Prisma client middleware for tenant scoping, separate DB schemas or partition-level isolation |
| **Tiered subscription plans (Stripe)** | Standard SaaS pricing model. Brivo has 4 editions; Verkada has per-device licensing. Users expect plan selection at signup. | HIGH | Stripe Products/Prices + webhook handling (checkout.session.completed, customer.subscription.updated, invoice.payment_succeeded). Must handle proration, downgrades, cancellations |
| **License management** | Enterprise buyers expect license keys that activate features, not just raw access. Per-device/per-door counting is industry standard. | MEDIUM | License provisioning (generate key), activation (tenant binds key), revocation, seat/device counting, expiry enforcement. Must be crypto-signed (JWT) to prevent tampering |
| **Role-Based Access Control (RBAC) per tenant** | v1.0 has RBAC but only global roles. Multi-tenant requires per-tenant role assignments. Admin at Org A ≠ Admin at Org B. | MEDIUM | Refactor existing RBAC to `tenant_id + role` compound scope. User can have different roles in different tenants |
| **Invite-based onboarding** | Physical security isn't self-serve signup. Admin invites operators, supervisors, viewers. Industry standard. | MEDIUM | Email invite → accept → set password → join tenant flow. Invite tokens must expire (72h default) |
| **Immutable audit logs (per tenant)** | v1.0 has hash-chain audit logs. Must extend to per-tenant scoping. SOC 2 requires 1+ year retention, immutable. | MEDIUM | Refactor existing audit interceptor to include `tenant_id`. Hash chain must be per-tenant (not global) for isolation |
| **Real-time alerting (sub-second)** | Already in v1.0. Must maintain sub-second pipeline when adding multi-tenant filter. Non-negotiable for security operations. | MEDIUM | Socket.IO room per tenant. BullMQ jobs must carry `tenant_id` for scoped notification delivery |
| **Video evidence correlation** | v1.0 already has this. Must work across tenants. Every access event, alert, and incident must have linked video timestamp. | MEDIUM | Video clips must be tenant-isolated at storage layer. Correlation engine must scope by tenant |
| **Mobile credential support** | v1.0 has QR/badge/mobile. Industry requires NFC, BLE, PIN, face unlock. Brivo supports Mobile Pass, Wallet Pass, HID Mobile Pass. | MEDIUM | Expiring TOTP codes (otplib), QR passes (qrcode), NFC badge reads (react-native-nfc-manager). Already partially in v1.0 |
| **Door state monitoring with alerts** | Every ACS competitor has this. Forced-open, held-open, unsecured, desynchronized. v1.0 has basic version — must be production-grade. | MEDIUM | Door state machine with MQTT sequence ordering. Prevent false alerts from out-of-order messages. Timeout-based escalation |
| **Zone-based access rules** | Standard ACS feature. Who can enter which zone, during which schedule. v1.0 has basic rules — need schedule-based, per-user exceptions. | MEDIUM | Zone rules engine with schedule support, holiday calendars, temporary overrides, and per-user exceptions |
| **Visitor management** | Brivo has it as a core feature. Pre-registration, host assignment, check-in/out, badge printing. v1.0 has basics. | MEDIUM | Host approval workflow, timed passes, QR/badge credential generation, check-in kiosk mode on mobile, expiration |
| **Incident management workflow** | Brivo Enterprise has it. Triage, assignment, escalation, evidence bundling, closure report. v1.0 needs full rebuild. | HIGH | BullMQ SLA timers, multi-step escalation chains, evidence auto-bundle (video + access events + door states), closure report PDF |
| **Security analytics dashboards** | Brivo Data Explorer, Verkada analytics. Occupancy trends, event frequency, per-zone risk. Users expect visual dashboards. | HIGH | ECharts heatmaps, scatter plots, calendar heatmaps. TimescaleDB continuous aggregates for pre-computation. Per-tenant data scope |
| **Compliance reporting (SOC 2, ISO 27001)** | Enterprise buyers demand it. Brivo advertises SOC 2 Type II + ISO 27001:2022 certification. Platform must support generating evidence. | MEDIUM | PDF report templates (pdfmake), exportable audit trails, retention policy automation, access review reports |
| **SSO / SAML / OIDC (Enterprise tier)** | Brivo Professional+ has SSO. Enterprise buyers require it. Table stakes for deals >$50K ARR. | HIGH | SAML 2.0 via passport-saml or OIDC via openid-client. Must integrate with NestJS JWT auth flow. Tenant-level IdP configuration |
| **API + webhooks** | Brivo has open API + integration marketplace. Verkada has API docs. Platform must be extensible. | MEDIUM | REST API with tenant-scoped API keys, webhook delivery for events, OpenAPI/Swagger docs. Rate limiting per tenant |
| **Multi-language / i18n** | Brivo website is in 6 languages. International buyers expect platform in their language. | MEDIUM | Next.js i18n (already have fr.ts/en.ts structure), NestJS backend i18n (nestjs-i18n), mobile i18n. Minimum: EN, FR, ES, DE, JP |
| **Device health monitoring** | Verkada shows camera status. Brivo Global View monitors device health. v1.0 edge agent exists — must surface health in dashboard. | MEDIUM | Equipment health hypertable (TimescaleDB), threshold-based alerts, predictive warnings (camera going offline soon), per-site health score |
| **24/7 alert delivery** | Security is 24/7. Alert delivery must work across timezones. Push notifications, email, SMS, in-app. | MEDIUM | Existing notification system + SMS gateway, on-call schedules, escalation policies per tenant |
| **Self-hosted deployment option** | Unique differentiator vs Verkada/Brivo (they're cloud-only). Must maintain Docker Compose + Caddy deployment. | MEDIUM | Docker Compose production config, automated DB migrations, backup scripts, health check endpoints. No mandatory cloud dependency |

### Differentiators (Competitive Advantage)

Features that set Oversight Hub apart from Verkada, Brivo, Genetec, Suprema. These compete on AI depth, modern UX, and deployment flexibility.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI-correlated event timeline** | Every access event, door state change, and alert automatically correlated with video clips and AI analysis — operators see *what happened* without manual investigation. Brivo has basic video-event linking but not deep AI correlation at scale. | HIGH | Event correlation engine linking MQTT events → AI frame analysis → video timestamps → incident context. Must work across tenants without cross-contamination |
| **Natural language event search** | "Who accessed the data center last weekend after 11pm?" → returns events + video clips. Brivo Genius offers AI search; we compete by doing it deeper with pgvector semantic search, not just keyword matching. | HIGH | Ollama embeddings → pgvector HNSW index. Event text representation: structured data → natural language description. Hybrid search: vector similarity + structured filters (time range, zone, user) |
| **AI incident auto-summary** | When an incident is created, AI auto-generates a narrative summary from correlated events: "At 23:14, badge #4421 (J. Smith) was used at Data Center Door 3. Door was held open for 47 seconds. Camera DC-03 captured one person entering, two exiting. No tailgating detected." Competitors require manual incident documentation. | MEDIUM | Ollama chat model with structured prompt template. Input: incident metadata + correlated events + video frame descriptions. Output: narrative summary, severity assessment, recommended actions |
| **AI security assistant** | Conversational interface for operators: "Show me all doors currently forced open" / "What's the risk level in Zone B right now?" / "Lock down all exterior doors in Building 3". Brivo Genius is a similar concept but our assistant has direct platform control (not just search/FAQ). | HIGH | Ollama chat + tool calling (function calling). Tools: query door states, list active alerts, get zone risk score, execute lockdown. Multi-turn conversations with context. pgvector for knowledge retrieval |
| **Per-zone dynamic risk scoring** | Each zone has a real-time risk score (0-100) computed from: recent events, anomaly frequency, incident density, time of day, door state abnormalities. No competitor offers this natively — risk is assessed manually by operators. | HIGH | TimescaleDB continuous aggregates for zone event counts. Scoring algorithm: weighted factors (door events + incidents + anomalies + time). Recalculate on event ingestion. ECharts gauge visualization |
| **Recurring situation detection** | AI identifies patterns: "Door 7 held open 3 times this week at 2:15 PM — likely a shift change schedule mismatch" / "Badge #3321 used at two different sites within 5 minutes — impossible travel". Pattern detection vs. single-event alerting. | HIGH | pgvector similarity search on event embeddings. Cluster analysis on time-series patterns. Alert on recurring anomalies, not just individual events |
| **Anti-passback + tailgating detection** | v1.0 has tailgating detection. Must be production-grade with configurable sensitivity, per-zone rules, video evidence attachment, and automatic incident generation. Competitors charge extra for this (Brivo Enhanced Access Pack). | MEDIUM | Existing AI pipeline (Ollama vision) extended with configurable sensitivity. Anti-passback: track credential location state, detect out-of-sequence badge reads. BullMQ alert generation |
| **ANPR/LPR with vehicle correlation** | License plate recognition correlated with access events. Employee parks → plate recognized → badge read at door → both events linked. Allowlist/blocklist with automatic gate control. Few competitors offer this in a single pane of glass. | HIGH | Plate Recognizer SDK (Docker). Camera frame → API → plate data. Merge with access events by timestamp proximity. Allowlist/blocklist with pattern matching. Vehicle access event generation |
| **Self-hosted + air-gapped deployment** | Most competitors are cloud-only (Verkada, Brivo) or hybrid (Genetec). Oversight Hub can run fully on-premise with Docker Compose — no internet required beyond initial license activation. Critical for government, defense, and financial sectors. | MEDIUM | Docker Compose with all services containerized. Offline license activation via license file import. Local Ollama for AI (no cloud API calls). go2rtc for local streaming |
| **2026 premium visual design** | Both Dashboard and Mobile designed with modern 2026 design language — not the dated, utilitarian look of Genetec/Suprema or the corporate-generic look of Verkada. Dark-first, glassmorphism accents, fluid animations, custom illustrations. | HIGH | Complete UI redesign: design system (tokens, components, patterns), dark/light mode, fluid micro-interactions, animated data visualizations, custom iconography. Tailwind CSS + Radix UI primitives |
| **Guard-first mobile experience** | Mobile app purpose-built for security guards on patrol — not a shrunken web dashboard. NFC badge validation, QR check-in, incident photo/video capture, door remote control, push-to-talk, offline queue. Competitors' mobile apps are afterthoughts. | MEDIUM | Expo with native modules (NFC, camera, biometrics). Offline-first with local queue. Push notifications with deep linking. Simplified guard-specific navigation (not admin complexity) |
| **Unified command center** | Single dashboard showing: live camera grid, active door states, recent access events, open incidents, zone risk heatmap, equipment health — all real-time. Operators don't switch views. Competitors have separate screens for each. | HIGH | Dashboard layout with persistent real-time panels (Socket.IO subscriptions per tenant). Drag-to-rearrange grid. State persists across sessions. Web workers for data polling |
| **International SaaS — not US-only** | Platform with multi-language, multi-currency billing, regional data residency options, and culturally adapted UX. Most physical security vendors are US-centric (Verkada, Brivo are US companies). Target: global from day 1. | MEDIUM | i18n (EN, FR, ES, DE, JP, AR), Stripe multi-currency, timezone-aware scheduling, RTL support for Arabic, metric/imperial units. Localized marketing site |

### Anti-Features (Deliberately NOT Building in v2.0)

Features that seem valuable but would dilute focus, create unbounded complexity, or conflict with core positioning.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Facial recognition for surveillance** | "AI should identify everyone on camera." | Privacy regulations (GDPR, BIPA, CCPA) make this legally risky. Erosion of trust. Requires biometric data storage. Competitors are backing away from this. | Face unlock for access control only (consent-based, local to reader). AI object detection (person, vehicle) without identification |
| **Cloud-hosted video storage** | "Let us host customers' video." | Massive infrastructure cost. Video bandwidth/storage dominates costs. Competitors charge per-camera per-retention-day. Oversight Hub's differentiator is self-hosted. Hosting video would require $10K+/mo infrastructure minimum. | Self-hosted video storage (customer's infrastructure). Offer optional S3-compatible backup configuration. Not a managed service |
| **Custom hardware (readers, controllers, cameras)** | "Sell the full stack like Verkada." | Hardware manufacturing requires supply chain, certification (FCC, CE, UL), warranty, RMA, inventory. This is a different business. v1.0 is software-only for a reason. | ONVIF camera support, MQTT for any ACS panel, generic badge reader support via standard protocols. Integration marketplace for hardware partners |
| **AI model marketplace / custom model training** | "Let customers train their own detection models." | Unbounded support burden. Most security teams don't have ML expertise. Custom models need per-customer training data, evaluation, and maintenance. | Curated set of high-quality detection models (person, vehicle, loitering, tailgating, zone intrusion) with configurable sensitivity. Add models based on broad customer demand, not one-offs |
| **Multi-region cloud deployment (AWS/GCP/Azure)** | "Deploy in 10 regions for latency." | Oversight Hub's core differentiator is self-hosted deployment. Adding cloud regions creates operational complexity (DB replication, cross-region sync) and cloud vendor lock-in. | Docker Compose self-hosted + optional Coolify orchestration. Partners can deploy in their own cloud. Not a managed SaaS |
| **SOC-as-a-service (managed security operations center)** | "Offer 24/7 human monitoring like Brivo." | Requires hiring and training security operators, shift scheduling, liability insurance. This is an operational business, not a software business. | Integrate with third-party monitoring services via webhooks/API. Platform enables SOC workflows but doesn't *be* the SOC |
| **Integrations marketplace (like Brivo's)** | "Build a marketplace of 100+ integrations." | v2.0 needs to ship core platform depth. A marketplace requires developer portal, sandbox environments, partner onboarding, certification program. Distracts from core product. | REST API + webhooks + OpenAPI docs enable integrations. Build 3-5 key integrations manually (Slack, Teams, PagerDuty, ServiceNow). Marketplace is v3.0 |
| **Real-time vehicle tracking / GPS** | "Track guard vehicles on a map." | GPS tracking is a commodity feature (Google Maps API). Adds latency concerns, mobile battery drain, and privacy implications without meaningful security value. | Not building. Guard check-in with location snapshot at check-in time is sufficient. Live GPS is a different product category |
| **Blockchain-based audit verification** | "Put audit logs on a blockchain for public verifiability." | Marketing gimmick. Hash-chain audit logs (already in v1.0 via pgcrypto) provide the same tamper evidence without blockchain overhead, gas fees, or complexity. | pgcrypto SHA-256 hash chains with per-tenant chain integrity verification. Cryptographically equivalent to blockchain without the hype |
| **End-to-end encrypted video streaming** | "Encrypt video so nobody can view it except authorized viewers." | E2EE video adds 300-500ms latency (key exchange, per-frame decrypt). Violates sub-second alerting constraint. Standard TLS + access control is sufficient for physical security use case. | TLS 1.3 in transit, AES-256 at rest. RBAC-enforced video access (per-tenant, per-role). Audit log on every video view |
| **Chat messaging between operators** | "Security teams need in-app chat like Slack." | Rebuilds Slack/Teams. Feature creep. Operators already have communication tools. Adding chat creates notification duplication and context-switching. | Webhook integrations to Slack/Teams for alerts. Incident comments/notes for context. Not a messaging platform |

---

## Feature Dependencies

```
Multi-Tenant Architecture
    ├──requires──> Subscription & Billing (plans require tenant context)
    ├──requires──> License Management (licenses bind to tenants)
    ├──requires──> RBAC per Tenant (roles scoped to tenant)
    ├──requires──> Tenant-scoped Audit Logs
    ├──requires──> Tenant-scoped Video Storage
    └──required_by──> ALL other features (every feature needs tenant_id)

Premium Dashboard UI/UX
    └──requires──> Multi-Tenant Architecture (tenant switching in UI)

Premium Mobile UI/UX
    └──requires──> Multi-Tenant Architecture (tenant selection on mobile)

Public Marketing Website
    └──requires──> Subscription & Billing (pricing page references plans)
    └──enhances──> International Branding (branding lives on public site)

Subscription & Billing (Stripe)
    ├──requires──> Multi-Tenant Architecture (tenant owns subscription)
    ├──requires──> License Management (license count drives billing)
    └──enhances──> Public Marketing Website (pricing → checkout flow)

License Management
    ├──requires──> Multi-Tenant Architecture (licenses bind to tenant)
    └──required_by──> Feature Gates (license tier gates features)

Feature Gates (tiered access)
    ├──requires──> License Management (license determines tier)
    └──enhances──> ALL features (every feature checks license tier)

Incident Management (deepened)
    ├──requires──> Multi-Tenant Architecture
    ├──requires──> AI Incident Auto-Summary (differentiator)
    └──requires──> Video Evidence Correlation (already in v1.0)

Security Analytics Dashboards
    ├──requires──> Multi-Tenant Architecture
    ├──requires──> Accumulated Data (from access events, incidents, door states)
    ├──requires──> TimescaleDB continuous aggregates
    └──enhances──> Per-Zone Risk Scoring (feeds risk visualization)

AI Security Assistant
    ├──requires──> pgvector Embeddings Pipeline (Ollama → pgvector)
    ├──requires──> Natural Language Event Search (shared embeddings infra)
    └──requires──> Accumulated Data (needs historical events for context)

ANPR/LPR Pipeline
    ├──requires──> Plate Recognizer SDK (Docker) + commercial license
    ├──requires──> Camera Frame Access (existing FFmpeg pipeline)
    └──enhances──> Visitor Management (vehicle-based visitor check-in)

SSO / SAML / OIDC
    ├──requires──> Multi-Tenant Architecture (per-tenant IdP config)
    └──gated_by──> Enterprise License Tier

24/7 Alert Delivery
    ├──requires──> Real-time Alerting (existing Socket.IO + BullMQ)
    ├──requires──> Notification System (existing email + push)
    └──enhances──> Escalation Policies (on-call schedules)

Self-Hosted Deployment
    └──enhances──> International SaaS (data residency via self-hosting)
    └──conflicts──> Nothing (self-hosting is additive, not competitive)
```

### Dependency Notes

- **Multi-tenant architecture is the critical path.** Every other v2.0 feature requires `tenant_id` scoping. Must be built first. Retrofitting multi-tenancy after features are rebuilt is a near-rewrite.
- **Subscription & Billing is independent of feature deepening.** Can be built in parallel with feature work as long as tenant architecture exists. Stripe handles billing infrastructure; the integration is straightforward.
- **Public Marketing Website is independent of the platform.** Can be built as a standalone Next.js site with its own deployment. Only depends on pricing/plan definitions (which are in Stripe, not in platform code).
- **AI features (assistant, summaries, natural language search) share infrastructure.** The embeddings pipeline (Ollama → pgvector) is shared. Building one AI feature makes the others easier.
- **Feature deepening is parallelizable.** Each feature module (access control, incident management, analytics, etc.) can be rebuilt independently once multi-tenant architecture exists. This enables parallel team work.
- **License management gates feature access.** The feature gate system (checking license tier before allowing access to Enterprise features) must be built before any tier-gated features (SSO, anomaly detection, advanced analytics).

---

## Feature Prioritization

### Priority Key

- **P1 (Launch-blocking):** v2.0 cannot ship without this. Missing it = product is not commercially viable.
- **P2 (Phase 1-2):** Essential for premium positioning. Ship in first two phases after foundation.
- **P3 (Phase 3-4):** Differentiators that cement competitive advantage. Ship after core is solid.
- **P4 (v2.1+):** Nice to have. Defer to avoid scope creep in v2.0.

### Priority Matrix

| Feature | User Value | Implementation Cost | Priority | Target Phase |
|---------|------------|---------------------|----------|-------------|
| Multi-tenant architecture | HIGH | HIGH | P1 | Foundation |
| Tiered subscription plans (Stripe) | HIGH | HIGH | P1 | Foundation |
| License management | HIGH | MEDIUM | P1 | Foundation |
| RBAC per tenant | HIGH | MEDIUM | P1 | Foundation |
| Invite-based onboarding | HIGH | MEDIUM | P1 | Foundation |
| Immutable audit logs (per tenant) | HIGH | MEDIUM | P1 | Foundation |
| Self-hosted deployment | HIGH | MEDIUM | P1 | Foundation |
| **Premium Dashboard UI/UX redesign** | HIGH | HIGH | P1 | Foundation+ |
| **Public marketing website** | HIGH | MEDIUM | P1 | Foundation+ |
| **International branding** | MEDIUM | MEDIUM | P1 | Foundation+ |
| Feature gates (tiered access) | HIGH | MEDIUM | P1 | Phase 1 |
| Real-time alerting (multi-tenant) | HIGH | MEDIUM | P2 | Phase 1 |
| Video evidence correlation (multi-tenant) | HIGH | MEDIUM | P2 | Phase 1 |
| Door state monitoring (production-grade) | HIGH | MEDIUM | P2 | Phase 1 |
| Zone-based access rules (deepened) | MEDIUM | MEDIUM | P2 | Phase 1 |
| AI-correlated event timeline | HIGH | HIGH | P2 | Phase 2 |
| Incident management (deepened) | HIGH | HIGH | P2 | Phase 2 |
| AI incident auto-summary | HIGH | MEDIUM | P2 | Phase 2 |
| Mobile credential support (deepened) | MEDIUM | MEDIUM | P2 | Phase 2 |
| Visitor management (deepened) | MEDIUM | MEDIUM | P2 | Phase 2 |
| **Premium Mobile UI/UX redesign** | HIGH | HIGH | P2 | Phase 2 |
| Multi-language / i18n | MEDIUM | MEDIUM | P2 | Phase 2 |
| Device health monitoring (deepened) | MEDIUM | MEDIUM | P2 | Phase 2 |
| API + webhooks | MEDIUM | MEDIUM | P3 | Phase 3 |
| SSO / SAML / OIDC | HIGH | HIGH | P3 | Phase 3 |
| Security analytics dashboards | HIGH | HIGH | P3 | Phase 3 |
| Per-zone dynamic risk scoring | HIGH | HIGH | P3 | Phase 3 |
| Natural language event search | HIGH | HIGH | P3 | Phase 3 |
| AI security assistant | HIGH | HIGH | P3 | Phase 4 |
| Recurring situation detection | HIGH | HIGH | P3 | Phase 4 |
| ANPR/LPR pipeline | MEDIUM | HIGH | P3 | Phase 4 |
| Anti-passback + tailgating (deepened) | MEDIUM | MEDIUM | P3 | Phase 4 |
| Compliance reporting | MEDIUM | MEDIUM | P3 | Phase 4 |
| 24/7 alert delivery (deepened) | MEDIUM | MEDIUM | P3 | Phase 3 |
| Unified command center | MEDIUM | HIGH | P4 | v2.1 |
| Guard-first mobile workflows | MEDIUM | MEDIUM | P4 | v2.1 |

---

## SaaS-Specific Features Breakdown

### Subscription & Billing

These are the Stripe-integration features that make the platform commercially viable.

| Sub-Feature | Description | Priority | Notes |
|-------------|-------------|----------|-------|
| **Product/Price configuration in Stripe** | Plans defined in Stripe Dashboard (not hardcoded). Monthly/annual billing periods. Per-unit pricing (per door, per camera, per user). | P1 | Stripe Products + Prices API. Plan metadata carries feature flags |
| **Checkout flow** | Stripe-hosted Checkout page for payment collection. Redirect to tenant dashboard on success. | P1 | Stripe Checkout Sessions. No custom payment form needed |
| **Customer Portal** | Stripe-hosted billing portal for customers to manage payment methods, view invoices, upgrade/downgrade/cancel. | P1 | Stripe Billing Portal Sessions. Deep-link to specific flows |
| **Webhook handling** | Handle Stripe webhook events: `checkout.session.completed` (provision tenant), `customer.subscription.updated` (update license), `invoice.payment_succeeded` (record payment), `customer.subscription.deleted` (suspend tenant) | P1 | NestJS controller for Stripe webhooks. Verify signature. Idempotency keys |
| **Usage metering** | Report per-door, per-camera, per-user counts to Stripe for usage-based billing. | P2 | Stripe Meter Events API or custom reporting via `customer.subscription.updated` |
| **Invoice PDF generation** | Platform-hosted invoice view (not just Stripe portal). Downloadable PDF invoices with company branding. | P2 | Stripe Invoice API + pdfmake for custom formatting |
| **Proration handling** | When upgrading mid-cycle, charge prorated amount. Stripe handles this automatically. | P2 | Stripe `proration_behavior: 'create_prorations'` |
| **Trial management** | 14-day free trial with full feature access. Auto-convert to paid after trial. | P2 | Stripe trial period on Subscription. Grace period before suspension |
| **Dunning / failed payment handling** | Retry failed payments, send reminder emails, eventually suspend access. | P3 | Stripe Smart Retries + custom webhook handling for `invoice.payment_failed` |
| **Multi-currency support** | Accept payments in USD, EUR, GBP, JPY, CAD, AUD. | P3 | Stripe presentment currencies. Prices per currency |

### License Management

| Sub-Feature | Description | Priority | Notes |
|-------------|-------------|----------|-------|
| **License generation** | Admin generates license keys tied to a subscription. Crypto-signed JWT with tenant_id, tier, seat count, expiry. | P1 | Sign with platform private key. Verify on each API request |
| **License activation** | Tenant activates license by entering key in dashboard or via API. Validates signature, expiry, and prevents reuse. | P1 | Activation records in `licenses` table. One activation per key |
| **License revocation** | Admin revokes license (stolen, breached, non-payment). Immediate effect on next API request. | P1 | Revocation list cached in Redis. Check on JWT verification |
| **Seat/device counting** | Track active users (per tenant) and device counts (cameras, doors, readers). Enforce license limits. | P1 | Count queries at activation and periodically. Graceful degradation (warning, not hard block) |
| **License expiry enforcement** | When license expires, transition tenant to read-only mode. Allow 7-day grace period for renewal. | P2 | Cron job checking `expires_at`. Grace period flag on tenant |
| **Offline license activation** | For air-gapped deployments, support license file import (signed JSON file) instead of online activation. | P3 | License file with embedded signature. Manual import in dashboard |
| **License transfer** | Transfer license to a different tenant (ownership change, acquisition). | P4 | Rare operation. Defer to v2.1 |

### Onboarding & User Management

| Sub-Feature | Description | Priority | Notes |
|-------------|-------------|----------|-------|
| **Tenant creation flow** | Post-checkout: create tenant, provision admin user, send welcome email. | P1 | Automated from Stripe webhook. No manual provisioning |
| **Email invite system** | Admin invites team members by email. Invite contains role assignment, optional site scoping. | P1 | Invite token with 72h expiry. One-time use. Audit log on accept |
| **Welcome wizard** | First-run wizard for new tenants: add first site, add first camera, configure alert preferences. | P2 | Step-by-step UI with progress indicator. Skip option |
| **Team directory** | View all users in tenant, their roles, last active time, associated sites. | P2 | Filterable, searchable table. Bulk role changes |
| **User deactivation** | Deactivate (don't delete) users. Preserves audit trail. Reactivate if needed. | P2 | Soft delete on user. Audit log on deactivation |
| **Profile management** | Users manage their own: name, email, password, notification preferences, 2FA setup. | P2 | Self-service profile page in dashboard |
| **Two-factor authentication** | TOTP-based 2FA. Required for admin role. Optional for others. | P3 | otplib for TOTP. QR enrollment flow. Backup codes |

### Internationalization & Branding

| Sub-Feature | Description | Priority | Notes |
|-------------|-------------|----------|-------|
| **UI translations** | Dashboard + Mobile translated into EN, FR, ES, DE, JP, AR. | P2 | next-intl for dashboard, expo-localization for mobile, nestjs-i18n for API error messages |
| **RTL layout support** | Arabic requires right-to-left layout. Dashboard must support RTL without breaking. | P2 | Tailwind RTL support, Radix RTL direction |
| **Multi-currency billing** | Stripe handles currency conversion. Display prices in user's local currency. | P3 | Stripe presentment currencies |
| **Timezone-aware scheduling** | Access schedules, reports, and audit timestamps respect site timezone. | P2 | Store UTC, display in site-local time. Per-site timezone setting |
| **Localized marketing site** | Public website translated per language. Localized pricing, case studies, and blog content. | P2 | Next.js i18n routing. Content per locale |
| **Design system** | Cohesive visual language: colors, typography, spacing, shadows, animations, iconography. Consistent across Dashboard + Mobile + Marketing. | P1 | Design tokens (Tailwind config), component library (shadcn/ui + custom), animation system (Framer Motion / CSS transitions) |

---

## Competitor Feature Analysis

| Feature | Verkada | Brivo | Genetec | Oversight Hub v2.0 Approach |
|---------|---------|-------|---------|----------------------------|
| **Deployment** | Cloud-only | Cloud-native | On-prem → Hybrid | **Self-hosted (Docker)** + optional Coolify |
| **Pricing model** | Hardware + annual license | Monthly/annual subscription (tiered) | Perpetual license + maintenance | **Subscription tiers + per-device/seat** |
| **AI capabilities** | AI analytics (included) | Brivo AI + Brivo Genius (AI assistant) | Basic analytics | **Deep AI: auto-summaries, NL search, risk scoring, pattern detection, assistant** |
| **Unified platform** | Command (camera + access) | Security Suite (access + video + intrusion + visitor) | Security Center (separate modules) | **Full unified: access + video + incidents + analytics + AI** |
| **Multi-tenant** | Organizations (org_id) | Yes (multi-location) | Partitions | **Tenant-first architecture, full isolation** |
| **Mobile app** | Verkada Pass (basic) | Brivo Mobile Pass / Agent | Genetec Mobile | **Guard-first: NFC, QR, incident capture, door control, offline** |
| **Visitor management** | ✗ | ✓ (Visitor + kiosks) | ✗ | **Deep: host approval, timed passes, mobile check-in, vehicle matching** |
| **Incident management** | Basic event log | Enterprise tier | Separate module | **Built-in: triage, escalation, AI summary, evidence bundle** |
| **SSO** | ✓ | Professional+ | ✓ | **Enterprise tier (SAML/OIDC)** |
| **API** | REST API | Open API + marketplace | SDK + REST | **REST + webhooks + OpenAPI docs** |
| **Compliance** | SOC 2 | SOC 2 Type II + ISO 27001 | Various | **Compliance report templates + immutable audit** |
| **Hardware** | Proprietary cameras + access | Integrates with ONVIF/Mercury | Proprietary + standards | **Software-only — ONVIF cameras, MQTT ACS** |
| **UI design** | Clean, corporate | Clean, modern | Dated, complex | **Premium 2026 design: dark-first, fluid, visual-first** |

---

## Sources

### Primary (HIGH confidence)

- [Brivo Security Suite Editions](https://www.brivo.com/platform/security-suite-editions/) — Competitive benchmark for tiered pricing model, feature gates, add-on packs. Verified feature comparison grid (Standard/Professional/Enterprise/Multifamily). June 2026 data.
- [Brivo Security Suite Overview](https://www.brivo.com/platform/security-suite/) — Platform capabilities: Brivo AI, Brivo Genius (AI assistant), Global View (device health), multi-location management, intrusion integration, 24/7 monitoring. June 2026 data.
- [Verkada Pricing Page](https://www.verkada.com/pricing/) — Hardware + license model, Command platform, "Every purchase includes" (AI analytics, unlimited users, auto updates, 24/7 support). July 2026 pricing update.
- [Stripe Billing docs](https://docs.stripe.com/billing) — Context7 verified: subscription lifecycle, Customer Portal, Checkout Sessions, webhook events, proration, dunning.
- [Stripe Node SDK](https://github.com/stripe/stripe-node) — Context7 verified: `stripe.subscriptions.create()`, `stripe.billingPortal.sessions.create()`, `stripe.checkout.sessions.create()`, `stripe.webhooks.constructEvent()`.
- Oversight Hub PROJECT.md — v1.0 validated features inventory, v2.0 active targets, out-of-scope decisions, constraints.
- Oversight Hub STACK.md / ARCHITECTURE.md / CONVENTIONS.md — Existing stack decisions, architecture patterns, code conventions.

### Secondary (MEDIUM confidence)

- Verkada Command API docs — `org_id` parameter confirms multi-tenant via organization hierarchy. Occupancy trends, access groups pattern. Used to infer platform structure.
- Brivo product navigation — Confirmed feature categories: Access Control, Video Surveillance, Operations & Administration, Identity Management, Visitor Management, Intrusion Detection, Remote Monitoring, POS integration.
- Industry observation — Brivo advertises SOC 2 Type II + ISO 27001:2022. This sets the compliance bar for enterprise sales.

### Tertiary (LOW confidence — pattern inference)

- Brivo AI naming ("Brivo AI", "Brivo Genius") — Indicates AI is now table-stakes branding for physical security platforms. Both Verkada and Brivo mention AI prominently on their main product pages.
- Verkada "government-grade" tier — Suggests federal/defense market segment with specific requirements (FedRAMP, on-premise). Supports Oversight Hub's self-hosted strategy.

---

*Feature research for: Oversight Hub v2.0 Commercial SaaS Platform*
*Researched: 2026-07-15*
