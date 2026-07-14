# Oversight Hub

## What This Is

Oversight Hub is a physical security intelligence platform that unifies video surveillance, access control, and operational security into a single AI-powered system. It serves security teams, IT, facilities, and operations — correlating real-world events (badges, doors, vehicles, incidents, anomalies) with video evidence and automated decision workflows. It replaces fragmented point solutions (separate VMS, ACS, visitor management, incident tracking) with an integrated platform that reduces manual work and accelerates response.

## Core Value

Correlate every physical security event with video evidence and AI analysis in real time, so security operators know what happened, where, and what to do — without switching between disconnected systems.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- Video ingestion pipeline (RTSP → FFmpeg frames → AI analysis) — existing
- Camera management and site organization — existing
- Real-time alert system with video clip correlation — existing
- AI-powered frame analysis (object detection, zone intrusion) — existing
- JWT-based authentication with roles (admin, supervisor, viewer) — existing
- Notification system (email + push + in-app) — existing
- Multi-app delivery (NestJS API, Next.js Dashboard, Expo Mobile) — existing
- Edge agent health monitoring — existing
- Multi-site site management — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Intelligent access control (badges, QR, mobile credentials, anti-passback, zone rules)
- [ ] Access event journal correlated with video clips
- [ ] Door management (forced, held open, unsecured, desynchronized)
- [ ] Tailgating and piggybacking detection via AI
- [ ] Visitor management (pre-registration, host assignment, check-in/out, limited validity)
- [ ] ANPR/LPR vehicle license plate recognition with allowlist/blocklist
- [ ] Incident management (triage, escalation, assignment, evidence, closure)
- [ ] Security analytics (loitering, intrusion, unusual activity, per-site metrics)
- [ ] Equipment health monitoring (cameras, readers, doors, batteries, latency)
- [ ] Compliance and audit mode (immutable logs, fine-grained roles, encryption, retention)
- [ ] AI security assistant (natural language event search)
- [ ] Automatic incident summaries (time, location, people, video, recommended action)
- [ ] Risk scoring per zone based on recent events and anomalies
- [ ] Recurring situation detection (false positives, misconfigured readers)
- [ ] Maintenance + security workflow integration (auto-create tickets)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Physical hardware manufacturing (readers, controllers, cameras) — software platform only
- OT/SCADA industrial control integration — out of scope for security operations focus
- Cybersecurity/SIEM integration — physical security focus; cyber is a separate product
- Facial recognition as primary auth — biometrics for access control only, not surveillance identification

## Context

**Starting point:** The existing codebase already provides video ingestion, camera management, AI frame analysis (Ollama/moondream), real-time alerts (BullMQ + Socket.IO), JWT authentication with roles, multi-site management, an edge agent for health monitoring, and a dual frontend (Next.js Dashboard + Expo Mobile). The architecture is a monorepo (Turborepo) with NestJS API, shared packages (Zod schemas, shared UI), PostgreSQL (Prisma), Redis (BullMQ queues + session cache), and FFmpeg for frame extraction.

**What exists:** cameras are managed, AI analyzes frames, alerts fire. What's missing is the access control dimension — the platform doesn't yet connect cameras to doors, badges, visitors, vehicles, or incidents. It sees what happens but doesn't control who enters or manage the operational response.

**The market:** The physical security industry is consolidating from standalone VMS/ACS into unified platforms (Verkada, Suprema, Genetec, Eagle Eye). The user's positioning as "intelligent physical security platform" rather than "AI camera system" addresses a broader buyer pool — security, IT, facilities, and operations — and aligns with the convergence trend of access control + video + analytics.

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
| Build on existing NestJS monorepo | Significant video + alert infrastructure already exists | — Pending |
| Phase 1: Unified Security first | User's recommended starting point — access control + video correlation + door management = highest value/feasibility ratio | — Pending |
| Coarse granularity (3-5 phases) | Platform is large but should ship in coherent vertical slices | — Pending |
| No hardware manufacturing | Software platform only; integrate with standard protocols (Wiegand, OSDP, ONVIF) | — Pending |

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
*Last updated: 2026-07-14 after initialization*
