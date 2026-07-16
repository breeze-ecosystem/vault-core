# Roadmap: Oversight Hub

## Overview

v1.0 delivered the unified physical security intelligence platform — access control, door management, video-event correlation, AI analysis, and operational workflows across three phases. v2.0 transforms that technical prototype into a production-grade, multi-tenant, premium SaaS platform ready for international sale — with subscription/license monetization, a 2026 design system, a public marketing website, deepened features, AI intelligence, and enterprise integrations.

## Milestones

- ✅ **v1.0 Core Platform** — Phases 1-3 (shipped 2026-07-14)
- 📋 **v2.0 Commercial Platform** — Phases 4-10 (planned)

## Phases

**Phase Numbering:**

- Integer phases (4, 5, 6, ...): Planned milestone work
- Decimal phases (4.1, 4.2): Urgent insertions (marked with INSERTED)

<details>
<summary>✅ v1.0 Core Platform (Phases 1-3) — SHIPPED 2026-07-14</summary>

### Phase 1: Unified Security

**Goal**: Security operators can manage access credentials, monitor door states in real time, correlate every access event with video evidence, and verify platform integrity through immutable audit trails
**Mode**: mvp
**Requirements**: ACC-01 through ACC-07, DOOR-01 through DOOR-06, VEC-01 through VEC-05, AUDT-01 through AUDT-03, AI-04
**Plans**: 4 plans
**UI hint**: yes

### Phase 2: Operational AI

**Goal**: Security teams can manage incidents from triage to closure, process visitors with time-limited credentials, recognize and log vehicles, query events using natural language, receive AI-generated incident summaries, monitor equipment health, and enforce data encryption with configurable retention
**Mode**: mvp
**Requirements**: INC-01 through INC-06, VIST-01 through VIST-05, ANPR-01 through ANPR-05, AI-01 through AI-03, EQPT-01 through EQPT-03, AUDT-04, AUDT-05
**Plans**: 6 plans
**UI hint**: yes

### Phase 3: Intelligent Platform

**Goal**: Security leaders can view analytics dashboards with intrusion and behavior detection, monitor per-zone risk scores, detect recurring patterns, predict equipment failures, enforce multi-site data isolation, and automate maintenance workflows with unified ticket tracking
**Mode**: mvp
**Requirements**: ANLY-01 through ANLY-05, RSK-01 through RSK-03, EQPT-04, EQPT-05, AUDT-06, WFL-01 through WFL-03
**Plans**: 5 plans
**UI hint**: yes

</details>

### v2.0 Commercial Platform — Summary

- [x] **Phase 4: Commercial Foundation** — Multi-tenant architecture, organization isolation, invite-based onboarding, per-tenant audit logs, feature gate infrastructure (completed 2026-07-15)
- [x] **Phase 5: Monetization** — RSA-signed JWT license keys with offline verification, device-limit enforcement, API key auth, admin dashboard, customer activation UI (completed 2026-07-15)
- [x] **Phase 6: Premium Experience** — 2026 design system, Dashboard redesign (3 key pages + global uplift), Mobile guard-first design, dark/light mode (completed 2026-07-15)
- [x] **Phase 7: Public Presence** — Marketing landing page, pricing page, MDX blog, multi-language (6 locales), SEO, contact form (completed 2026-07-16)
- [ ] **Phase 8: Feature Deepening** — Access control, door state machine, visitor management, incident management, ANPR/LPR, analytics dashboards, equipment health
- [x] **Phase 9: AI Intelligence** — Natural language event search, AI incident auto-summaries, per-zone risk scoring, recurring pattern detection, AI security assistant (completed 2026-07-16)
- [ ] **Phase 10: Enterprise Grade** — SSO/SAML, compliance reporting, public REST API, webhooks, multi-currency, unified command center, guard mobile workflows (planned)

## Phase Details

### Phase 4: Commercial Foundation

**Goal**: Platform operates as a secure, isolated multi-tenant SaaS where organizations, their users, and their data are strictly separated
**Depends on**: v1.0 Core Platform (Phases 1-3)
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, FND-07
**Success Criteria** (what must be TRUE):

  1. Admin registers an organization, invites users via email with expiring tokens, and invited users join with assigned roles — each user sees only their organization's data
  2. A user belonging to two organizations sees different data and has different roles when switching between them via an organization switcher
  3. A direct database query — even a raw SQL statement — cannot access data belonging to a different organization (PostgreSQL RLS enforced at database level)
  4. JWT tokens carry `organizationId` + scoped `permissions[]` so every API request is automatically tenant-scoped without per-endpoint changes
  5. Per-organization audit logs are independently hash-chained with cryptographic integrity verification — an auditor can verify that Organization A's log has not been tampered with

**Plans**: 11 plans (6 waves)

Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Prisma Schema Migration + Push + Seed (FND-01)
- [x] 04-02-PLAN.md — Shared Zod Schemas + Env Vars (FND-01, FND-05)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-03a-PLAN.md — Tenant Isolation Core: Extension + Middleware + Worker Helper (FND-01, FND-02)
- [x] 04-04a-PLAN.md — Auth + Organization API Modules (FND-03, FND-04)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04-03b-PLAN.md — Tenant Isolation Integration: Guard + Decorator + RLS Migration + AppModule Wiring (FND-01, FND-02)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 04-04b-PLAN.md — Invite Module: JWT Tokens + Resend Email + Accept Flow (FND-05)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 04-05-PLAN.md — Codebase Rename: 52-file siteId→organizationId (FND-01, FND-02)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 04-06-PLAN.md — Feature Gates Infrastructure (FND-07)
- [x] 04-07-PLAN.md — Hash-Chain Audit Integrity (FND-06)
- [x] 04-08-PLAN.md — Dashboard Frontend: Org Switcher + Invites (FND-03, FND-04, FND-05)

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 04-09-PLAN.md — Mobile Frontend: Org Switcher (FND-03, FND-05)

### Phase 5: Monetization

**Goal**: Organization administrators can generate crypto-signed JWT license keys (RS256), customers activate them in their self-hosted instance, and the platform enforces device limits with offline validation — pure licensing model, no subscription billing
**Depends on**: Phase 4
**Requirements**: LIC-01, LIC-02, LIC-03, LIC-04, LIC-05, LIC-06, LIC-07
**Success Criteria** (what must be TRUE):

  1. Admin generates a crypto-signed JWT license via dashboard or API, bound to an organization with device limits (cameras, doors), issue/expiry dates, and grace period
  2. Customer activates the license JWT in their self-hosted dashboard — signature verified offline against a bundled RSA public key
  3. System enforces device limits at both API and UI levels — cannot create cameras or doors beyond license maxCameras/maxDoors
  4. Expired licenses enter a 7-day grace period with full functionality, then read-only mode — API blocks all mutations, dashboard shows warning banners
  5. New organizations get a 7-day trial with unlimited devices; thereafter a valid license is required
  6. Admin manages API keys for programmatic license generation and can revoke them individually

**Plans**: 3 plans (2 waves)

Plans:
**Wave 1**

- [x] 05-01-PLAN.md — Foundation: Prisma schema + shared package + infrastructure config (LIC-01, LIC-02)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-02-PLAN.md — API LicenseModule: signing/verification, REST endpoints, enforcement guards, camera/door limit hooks, AppModule registration (LIC-01, LIC-02, LIC-03, LIC-04, LIC-07)
- [x] 05-03-PLAN.md — Dashboard UI: admin license management, client activation, settings integration, shared components (LIC-05, LIC-06)

### Phase 6: Premium Experience

**Goal**: The platform looks and feels like a premium 2026 SaaS product — visually stunning, fluid, and intuitive — across both Dashboard and Mobile, powered by a shared design system
**Depends on**: Phase 4
**Requirements**: UIX-01, UIX-02, UIX-03, UIX-04, UIX-05, UIX-06, UIX-07
**Success Criteria** (what must be TRUE):

  1. Dashboard renders with a premium dark-first visual design — glassmorphism panels, fluid page transitions (`motion` AnimatePresence), animated micro-interactions, and staggered list reveals
  2. User toggles between dark and light mode via a system-respecting toggle; all components, charts, and surfaces adapt seamlessly
  3. The Overview, Cameras, and Alerts pages each have a distinctive premium layout with data visualization, quick-action shortcuts, and real-time status indicators
  4. All other existing pages receive the design system uplift — consistent typography scale, spacing rhythm, color tokens, and component styles — without rewriting page logic
  5. Mobile app renders with guard-first design — large touch targets, simplified bottom-navigation, quick-action shortcuts for guard workflows (check-in, incident capture, door control)

**Plans**: 6 plans (3 waves)

Plans:
**Wave 1**

- [x] 06-01-PLAN.md — Design System Foundation: CSS namespace migration, Radix Themes, next-themes, ThemeProvider, ThemeToggle, light mode (UIX-01, UIX-05)
- [x] 06-02-PLAN.md — Shared Design Tokens + Animation: @repo/design package, motion install, PageTransition, AnimatePresence in dashboard layout (UIX-01, UIX-03)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-03-PLAN.md — Premium Components + Global Uplift: GlassCard, MetricHero, Sparkline, DonutChart, QuickActionBar, ActivityTimeline, enhanced StatsCard/PageHeader/Header/Sidebar (UIX-02, UIX-06)
- [x] 06-04-PLAN.md — Mobile Guard-First Redesign: 4-tab navigation, quick-action home screen, offline mode, incidents/more tabs, @repo/design integration (UIX-04)

**Wave 3** *(blocked on Wave 2 Plan 06-03 completion)*

- [x] 06-05-PLAN.md — Overview + Cameras Full Redesign: premium layouts with MetricHero grid, donut chart, timeline, camera grid, search/filter (UIX-07)
- [x] 06-06-PLAN.md — Alerts Full Redesign: real-time feed, severity bars, side panel, bulk actions, WebSocket preservation (UIX-07)

**UI hint**: yes

### Phase 7: Public Presence

**Goal**: A public-facing marketing website presents Oversight Hub as an international, AI-first, premium security platform with clear pricing, compelling content, and global reach
**Depends on**: Phase 5 (Stripe plan definitions), Phase 6 (shared design system)
**Requirements**: WEB-01, WEB-02, WEB-03, WEB-04, WEB-05, WEB-06, WEB-07, WEB-08
**Success Criteria** (what must be TRUE):

  1. Visitor lands on the marketing site and sees a compelling hero section, feature showcase, trust indicators, and clear calls to action — the brand feels premium and AI-first
  2. Visitor browses the pricing page with plan comparison and feature matrix; clicking a plan CTA leads to "Book a Demo" or "Contact Sales" pipeline (pure licensing model, no Stripe)
  3. Visitor switches language among French (primary), English, Spanish, German, Japanese, and Arabic — all content, navigation, and SEO metadata update without a page reload
  4. Visitor reads blog posts rendered from MDX (changelog, security insights, product updates) with code highlighting and rich media
  5. Visitor submits a contact/demo request form and receives an email confirmation; the marketing team receives the lead notification

**Plans**: 9 plans (4 waves)

Plans:
**Wave 1** (Foundation)
- [x] 07-01-PLAN.md — Design tokens + monorepo config + .env.example (WEB-07)
- [x] 07-02-PLAN.md — Docker infrastructure + Caddy routing (WEB-08)
- [x] 07-03-PLAN.md — Contact API module + shared schema (WEB-06)

**Wave 2** (Core App)
- [x] 07-04-PLAN.md — App scaffold + i18n routing + layout (WEB-04, WEB-08)

**Wave 3** (Pages)
- [x] 07-05-PLAN.md — Shared UI components + landing page (WEB-01, WEB-08)
- [x] 07-06-PLAN.md — Pricing page + feature comparison + FAQ (WEB-02, WEB-08)
- [x] 07-07-PLAN.md — MDX blog with velite + blog pages (WEB-03, WEB-08)
- [x] 07-08-PLAN.md — Contact form page + Turnstile (WEB-06, WEB-08)

**Wave 4** (Content & SEO)
- [x] 07-09-PLAN.md — Translations + JSON-LD + OG images + sitemaps (WEB-04, WEB-05)

**UI hint**: yes

### Phase 8: Feature Deepening

**Goal**: Every core security module is rebuilt from prototype-level to production-grade — handling real-world complexity, edge cases, duration-based SLAs, and operator workflows with full tenant awareness
**Depends on**: Phase 5 (feature gates + license device limits), Phase 6 (refreshed UI component library)
**Requirements**: FTR-01, FTR-02, FTR-03, FTR-04, FTR-05, FTR-06, FTR-07
**Success Criteria** (what must be TRUE):

  1. Operator processes an incident from triage to closure with SLA timers (BullMQ), escalation chains, evidence auto-bundling (video + access events), and a downloadable PDF closure report
  2. Door state machine validates all transitions against a defined state graph; duplicate events are deduplicated by sequence number; false alarms are suppressed via configurable settle timers per door
  3. Host pre-registers a visitor with time-limited credentials and zone restrictions; security guard processes check-in via kiosk mode with badge/QR printing; visitor checks out with full activity log
  4. System recognizes vehicle plates with confidence scoring (PaddleOCR), checks against per-tenant allowlist/blocklist, and generates vehicle-access event correlations linked to video clips
  5. Admin views an equipment health dashboard showing per-site health scores, degradation trend graphs, and predictive alerts — "Camera 14 has 87% frame drop rate, recommend inspection"

**Plans**: 8 plans (2 waves)

Plans:
**Wave 1**
- [ ] 08-01-PLAN.md — Foundation: Schema extensions, shared schemas, org config endpoints, API client (FTR-01, FTR-02, FTR-03, FTR-04, FTR-05, FTR-06, FTR-07)

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 08-02-PLAN.md — Door Hardening: Per-door thresholds, Redis sequence dedup, door config UI, mobile door control (FTR-02)
- [ ] 08-03-PLAN.md — Incident Deepening: SLA profiles, evidence auto-bundle, Redis dedup, SLA/evidence UI (FTR-04)
- [ ] 08-04-PLAN.md — Visitor + ANPR: Host approval workflow, timed passes, confidence thresholds, vehicle-event correlation (FTR-03, FTR-05)
- [ ] 08-05-PLAN.md — Access Control: Credential lifecycle management (revoke/reissue/expiry), lifecycle UI (FTR-01)
- [ ] 08-06-PLAN.md — Analytics Dashboard: Zone metrics, trend charts, heatmaps, custom SVG/CSS dashboard (FTR-06)
- [ ] 08-07-PLAN.md — Equipment Health: Per-site health scores, frame drop monitoring, health dashboard UI (FTR-07)
- [ ] 08-08-PLAN.md — Mobile Incident: Incident list + detail + status transitions (FTR-02, FTR-04)

**UI hint**: yes

### Phase 9: AI Intelligence

**Goal**: The platform reasons about security events — answering natural language questions, auto-generating incident summaries, dynamically scoring risk per zone, detecting recurring patterns, and providing a conversational AI assistant for operators
**Depends on**: Phase 8 (accumulated event data for embeddings and pattern analysis)
**Requirements**: FTR-08, FTR-09, FTR-10, FTR-11
**Success Criteria** (what must be TRUE):

  1. Operator types "show intrusions on Site A after 8pm" and receives a relevance-ranked list of events with linked video clips — hybrid search combining vector similarity and structured field filters
  2. System auto-generates an incident summary with time, location, persons involved, video evidence, and AI-recommended actions — saving operators 5+ minutes of manual documentation per incident
  3. Admin views a per-zone risk score (0-100) on the dashboard that dynamically updates based on recent events, denied access attempts, open doors, and detected anomalies — color-coded gauge with drill-down
  4. System surfaces recurring situations — e.g., "Door 3 held open 4 times this week at the same time" or "Camera 7 false intrusion alerts 12x daily" — with trend visualization
   5. Operator asks the AI assistant "assess the current risk level on Zone B" or "lock down Zone C" and receives a contextual analysis with supporting evidence and action confirmation

**Plans**: 8 plans (4 waves)

Plans:
**Wave 1** (Foundation — parallel)

- [x] 09-01-PLAN.md — Infrastructure: Prisma schema + config + Docker + packages + DB push (FTR-08, FTR-09, FTR-10, FTR-11)
- [x] 09-02-PLAN.md — AiAgentModule Foundation: Types + schemas + Skill registry + prompts (FTR-08, FTR-09, FTR-10, FTR-11)

**Wave 2** (Core — parallel)

- [x] 09-03-PLAN.md — Python AI Preprocessor: YOLOv12 + ByteTrack + YAMNet + Whisper (FTR-08, FTR-11)
- [x] 09-04-PLAN.md — NestJS Agent Core: LLM provider + Orchestrator + 6 agents + SSE (FTR-08, FTR-09, FTR-10, FTR-11)

**Wave 3** (Services + Integration — parallel)

- [x] 09-05-PLAN.md — Agent Services: Memory + Tracing + Guardrails + MCP (FTR-08, FTR-09, FTR-10, FTR-11)
- [x] 09-06-PLAN.md — Backend Integration: Qdrant + Patterns + AppModule + API client (FTR-08, FTR-09, FTR-10, FTR-11)

**Wave 4** (Frontend — parallel)

- [x] 09-07-PLAN.md — Dashboard UI: Command Center + Patterns + Risk enhancement (FTR-08, FTR-10, FTR-11)
- [x] 09-08-PLAN.md — Mobile Chat + API client (FTR-08, FTR-09)

**UI hint**: yes

### Phase 10: Enterprise Grade

**Goal**: Large organizations can integrate Oversight Hub into their infrastructure — single sign-on, compliance reporting, public APIs, webhooks, unified command center, multi-currency billing, and guard-first mobile workflows
**Depends on**: Phase 5 (Enterprise tier gating), Phase 8 (stabilized modules for API surface), Phase 9 (AI features for command center)
**Requirements**: ENT-01, ENT-02, ENT-03, ENT-04, ENT-05, ENT-06, ENT-07, ENT-08, ENT-09
**Success Criteria** (what must be TRUE):

  1. Enterprise admin configures SAML/OIDC identity provider per organization; users log in via company SSO with just-in-time account provisioning and role mapping
  2. Auditor generates SOC 2 and ISO 27001 compliance reports as downloadable PDFs with tamper-evident audit trail exports, access review summaries, and retention policy evidence
  3. Developer authenticates with a tenant-scoped API key, queries public REST endpoints (`/api/v1/`) with rate-limited access, and references interactive OpenAPI/Swagger documentation
  4. External system receives webhook deliveries for configured event types (alert created, incident escalated, door forced) with automatic retry logic and delivery logs visible in the dashboard
  5. Operator views the unified command center — a single full-screen view with a live camera grid, real-time door state map, alert stream, and incident queue — and responds without switching between pages

**Plans**: 6 plans (3 waves)

Plans:
**Wave 1** (Foundation)
- [ ] 10-01-PLAN.md — Prisma schema + shared schemas + config + DB push (ENT-01, ENT-02, ENT-03, ENT-04, ENT-05, ENT-06, ENT-07)

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 10-02-PLAN.md — SSO/SAML/OIDC: SsoModule, Passport strategies, JIT provisioning, auth integration (ENT-01)
- [ ] 10-03-PLAN.md — API Keys + Webhooks: TenantApiKey CRUD + guard, webhook subscriptions + BullMQ processor + HMAC signing, Swagger v1 docs (ENT-04, ENT-05, ENT-06)
- [ ] 10-04-PLAN.md — Compliance + Extensions: PDF reports (SOC2/ISO/Access Review), data classification, multi-currency, white-labeling (ENT-02, ENT-03, ENT-07)

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 10-05-PLAN.md — AppModule Wiring + Dashboard UI: module registration, SSO/API keys/webhooks/compliance/branding pages, login SSO button, nav + i18n (ENT-01 through ENT-07)
- [ ] 10-06-PLAN.md — Command Center + Guard Mobile: real-time WebSocket feed, NFC badge scan, QR check-in, photo capture, door control (ENT-08, ENT-09)

**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Unified Security | 4/4 | Complete | 2026-07-14 |
| 2. Operational AI | 6/6 | Complete | 2026-07-14 |
| 3. Intelligent Platform | 5/5 | Complete | 2026-07-14 |
| 4. Commercial Foundation | 11/11 | Complete   | 2026-07-15 |
| 5. Monetization | 0/TBD | Not started | - |
| 6. Premium Experience | 6/6 | Complete   | 2026-07-15 |
| 7. Public Presence | 9/9 | Complete   | 2026-07-16 |
| 8. Feature Deepening | 0/8 | Planned | - |
| 9. AI Intelligence | 8/8 | Complete   | 2026-07-16 |
| 10. Enterprise Grade | 0/6 | Planned | - |
