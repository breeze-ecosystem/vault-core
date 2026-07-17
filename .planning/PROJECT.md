# Oversight Hub

## What This Is

Oversight Hub is a commercial SaaS platform that delivers AI-powered physical security intelligence — unifying video surveillance, access control, and operational security into a single, premium experience. Sold via subscription and license to security teams, IT, facilities, and operations worldwide, it correlates real-world events (badges, doors, vehicles, incidents, anomalies) with video evidence and automated decision workflows. It replaces fragmented point solutions with an integrated platform that is visually stunning, intuitive, and AI-first.

## Current Milestone: v3.0 Production Readiness & Hardware Integration

**Goal:** Transformer le prototype en un outil 100% fonctionnel et production-ready — zéro bug, hardware connecté, site marketing premium, et expérience cross-platform stable.

**Target features:**
- 🔧 Bug fixing général — tous les bugs, incohérences, comportements incomplets corrigés
- 🎨 Refonte site marketing — design moderne Linear/Vercel-style, contenu enrichi, storytelling produit
- 🌐 Traduction complète — finaliser toutes les locales du site marketing
- 🚪 Intégration hardware — portes, contrôleurs d'accès, caméras, badges, scanners
- 🏭 Production readiness — protocoles standards (OSDP/Wiegand/ONVIF), Edge Agent robuste, validation terrain
- 📱 Polish cross-platform — Dashboard + Mobile stables, cohérents, sans régression

## Core Value

Correlate every physical security event with video evidence and AI analysis in real time, so security operators know what happened, where, and what to do — without switching between disconnected systems.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. v1.0 delivered the technical foundation. -->

- Video ingestion pipeline (RTSP → FFmpeg frames → AI analysis) — v1.0
- Camera management and site organization — v1.0
- Real-time alert system with video clip correlation — v1.0
- AI-powered frame analysis (object detection, zone intrusion) — v1.0
- JWT-based authentication with roles (admin, supervisor, viewer) — v1.0
- Notification system (email + push + in-app) — v1.0
- Multi-app delivery (NestJS API, Next.js Dashboard, Expo Mobile) — v1.0
- Edge agent health monitoring — v1.0
- Multi-site site management — v1.0
- Access control (badges, QR, mobile credentials, anti-passback, zone rules) — v1.0
- Door management (forced, held open, unsecured, desynchronized) — v1.0
- Access event journal correlated with video clips — v1.0
- Tailgating/piggybacking detection via AI — v1.0
- Immutable audit logs with hash-chain integrity — v1.0
- Fine-grained roles (admin, supervisor, operator, viewer, auditor) — v1.0

### Active

<!-- v2.0 scope — rebuild with depth, premium quality, and commercial readiness. -->

- [ ] Architecture refactor — scalable, multi-tenant, clean module boundaries, proper patterns
- [ ] Backend feature deepening — every existing feature made production-grade (not just "it works")
- [ ] Premium Dashboard UI/UX — complete redesign, visual-first, modern 2026 design language
- [ ] Premium Mobile UI/UX — complete redesign for guard/operator workflows
- [ ] Public landing page — marketing website with product presentation, pricing, blog, SEO
- [ ] International branding — AI-first positioning, modern design system, global appeal
- [ ] Subscription & billing system — Stripe/PayPal, plans, invoices, payment management
- [ ] License management — provisioning, activation, revocation, tenant association
- [ ] Visitor management (pre-registration, host assignment, check-in/out) — deepened
- [ ] ANPR/LPR vehicle license plate recognition with allowlist/blocklist — deepened
- [ ] Incident management (triage, escalation, assignment, evidence, closure) — deepened
- [ ] Security analytics (loitering, intrusion, unusual activity, per-site metrics) — deepened
- [ ] Equipment health monitoring (cameras, readers, doors, predictive alerts) — deepened
- [ ] AI security assistant (natural language queries, auto-summaries) — deepened
- [ ] Risk scoring per zone and recurring situation detection — deepened
- [ ] Multi-tenant data isolation and site-level permission scoping

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Physical hardware manufacturing (readers, controllers, cameras) — software platform only
- OT/SCADA industrial control integration — out of scope for security operations focus
- Cybersecurity/SIEM integration — physical security focus; cyber is a separate product
- Facial recognition as primary auth — biometrics for access control only, not surveillance identification

## Context

**v1.0 delivered:** The complete technical foundation is in place — video ingestion, camera management, AI frame analysis (Ollama/moondream), access control (badges, QR, mobile, doors, zones), real-time alerts (BullMQ + Socket.IO), JWT authentication with full RBAC, immutable audit logs, visitor management basics, multi-site management, an edge agent, and dual frontends (Next.js Dashboard + Expo Mobile). Deployed on Coolify via Docker Compose with Caddy reverse proxy.

**v1.0 shortcomings:** Features work at a basic/prototype level — they check boxes but lack production depth. The architecture needs better module boundaries and multi-tenant patterns. The UI is functional but looks like a basic internal tool, not a premium SaaS product. No public website, no monetization, no international branding. The code needs restructuring for maintainability and scale.

**v2.0 approach:** Rebuild systematically — page by page, feature by feature. Each feature is redesigned in depth (backend patterns, business logic completeness, UI polish) before moving to the next. Add the commercial layer (subscriptions, licensing, landing page, branding) as a first-class concern. Position as an international, AI-first, premium platform.

**The market:** Physical security industry consolidating from standalone VMS/ACS into unified platforms (Verkada, Suprema, Genetec, Eagle Eye). Positioned as "intelligent physical security platform" addresses security, IT, facilities, and operations buyers. Multiple revenue streams via subscription tiers, per-site licensing, and premium AI features. Target: global, not restricted to any single geography.

## Constraints

- **Tech stack**: Must build on existing NestJS + Next.js + Expo + Prisma + Redis + BullMQ stack. No framework rewrites.
- **AI**: Continue using Ollama/vision models for AI analysis; integrate with access control events.
- **Deployment**: Self-hosted via Docker Compose with Caddy reverse proxy. No mandatory cloud dependency.
- **Performance**: Real-time alerting must stay sub-second. Video correlation must not block the event pipeline.
- **Security**: Role-based access control must extend to new modules. Audit logs must be immutable. JWT auth must cover all new endpoints.
- **Mobile**: Expo mobile app must support new guard/operator workflows (check-in, incident response, door control).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build on existing NestJS monorepo | Significant video + alert infrastructure already exists from v1.0 | ✓ Good |
| Coarse granularity (5-8 phases) | Platform is large but ships in coherent vertical slices | — Pending |
| No hardware manufacturing | Software platform only; integrate with standard protocols | ✓ Good |
| v2.0: Page-by-page + feature-by-feature rebuild | Isolated rebuild ensures each piece is production-grade | — Pending |
| v2.0: Premium commercial SaaS positioning | AI-first, international branding, subscription/license monetization | — Pending |
| v2.0: Multi-tenant from day one | Avoids retrofitting tenant isolation later; essential for SaaS billing | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
---
*Last updated: 2026-07-17 — start of milestone v3.0*
