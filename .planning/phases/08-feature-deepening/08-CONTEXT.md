# Phase 8: Feature Deepening - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Every core security module is deepened from its v1.0 foundation to production-grade — configurable policies, real-world edge case handling, hardened error recovery, and full tenant awareness. All 7 modules (access control, door state machine, visitor management, incident management, ANPR/LPR, security analytics, equipment health) receive proportional depth. The existing code is already substantial — this phase adds configurability (per-org/per-door thresholds), missing workflow pieces (host approval, evidence auto-bundle), and operational hardening (job deduplication, credential lifecycle).

Covers FTR-01 through FTR-07 from REQUIREMENTS.md. Depends on Phase 5 (license device limits enforced at API+UI) and Phase 6 (premium 2026 design system with Radix Themes, motion animations, GlassCard/MetricHero/Sparkline components).
</domain>

<decisions>
## Implementation Decisions

### Deepening Strategy (FTR-01 through FTR-07)
- **D-01:** Spread depth evenly across all 7 modules. No module prioritized over others — each receives proportional effort. The existing codebase is more advanced than "prototype" (incident module already has SLA timers, PDF reports, auto-triage; door module has a formal state machine; ANPR and equipment have Controllers + Services). The deepening work is configurable policies, edge case hardening, and missing workflow pieces.

### Door State Machine (FTR-02)
- **D-02:** Per-door threshold columns on Door Prisma model (`heldOpenThresholdMs`, `settlingTimeoutMs`). Null values fall back to `DEFAULT_ALERT_CONFIG` constants. Existing state machine transitions (LOCKED ↔ UNLOCKED, HELD_OPEN, FORCED, UNSECURED, DESYNCHRONIZED) remain unchanged — they are correct.
- **D-03:** Duplicate event deduplication by sequence number per roadmap SC-2. No schedule-based policies (office-hours vs after-hours) — that is Phase 10 enterprise.

### Incident Management (FTR-04)
- **D-04:** Per-severity SLA profiles defined at organization level: Critical = 15min, High = 30min, Medium = 2hr, Low = 8hr. Each severity level has its own escalation chain configured in org settings. Incidents auto-configure SLA from severity on creation. No per-incident override — keeps UI simple.
- **D-05:** Evidence auto-bundling on closure: system searches for access events, alerts, and video clips within ±5 minutes of incident creation time and auto-attaches them. Operator can remove false matches. Time-window heuristic only — no ML/AI correlation (that is Phase 9).
- **D-06:** Queue resilience: Redis-backed job deduplication for SLA timers (prevents duplicate jobs if `onModuleInit` recovery races with manual assignment). Stalled job detection with retry + backoff. Failed escalation logged to incident timeline. Current `onModuleInit` restart recovery is preserved and enhanced.

### Visitor Management (FTR-03)
- **D-07:** Host approval workflow: pre-registration form with host selection from organization members, email-based approval via Resend, approved visitor receives time-window credential.
- **D-08:** Timed passes: guest credentials that auto-expire after a configurable duration. QR-based check-in at guard station.
- **D-09:** Skip kiosk mode and badge printing — hardware-dependent features deferred to a future phase.

### ANPR/LPR (FTR-05)
- **D-10:** Per-organization configurable confidence threshold (default 70%). Plates below threshold are logged but do not trigger vehicle-access alerts. Allowlist/blocklist checked on all recognized plates regardless of confidence score.
- **D-11:** Vehicle-event correlation: recognized plates linked to access events and video clips. Existing PaddleOCR integration preserved.

### Analytics Dashboard (FTR-06)
- **D-12:** No new charting library. Build visualizations with the existing Phase 6 design system: custom SVG/CSS sparklines, bar charts, donuts, heatmaps using Radix Themes + Tailwind + `motion` for animation. Reuses `cn()` utility, GlassCard, MetricHero, and Sparkline components.
- **D-13:** Real-time refresh for live metrics (zone status, alert counts), on-demand refresh for trend views (daily/weekly patterns). No WebSocket needed for analytics — polling sufficient.

### Equipment Health (FTR-07)
- **D-14:** Monitor camera health (frame drop rate, last heartbeat, connection uptime) and reader health (response time, auth failure rate). Configurable thresholds per organization trigger alerts.
- **D-15:** Per-site health score = weighted average across all equipment. Threshold-based alerting only — no predictive ML degradation alerts (that is Phase 9). Existing EquipmentPredictor class is enhanced, not replaced.

### Access Control (FTR-01)
- **D-16:** Full credential lifecycle management: issuance, temporary passes, permanent badges, revocation, reissuance audit trail, credential expiration notifications. Dashboard UI for credential lifecycle (forms, tables, status badges).

### Dashboard Pages (all modules)
- **D-17:** Enhance existing pages with configuration panels, deeper data, and Phase 6 design system components. Doors page gets per-door threshold UI. Incidents page gets SLA configuration UI. Visitors page gets host approval workflow UI. ANPR page gets confidence threshold settings. Credentials page gets lifecycle management UI.
- **D-18:** New dedicated pages for analytics dashboard (per-zone metrics, trend graphs, heatmaps) and equipment health (per-site scores, threshold configuration). Both use existing layout patterns and Phase 6 premium components.

### Mobile App (FTR-01, FTR-02, FTR-04)
- **D-19:** Mobile gets incident response flows (view assigned incidents, update status from phone) and door control flows (open/close/lock doors remotely). Follows Phase 6 guard-first design patterns (large touch targets, simplified navigation, quick actions). No new screens for visitor check-in, ANPR lookup, or equipment monitoring — those are future mobile phases.

### Agent Discretion
- Exact door threshold UI design (input fields, validation, fallback display) — follow Phase 6 design system patterns.
- Per-severity SLA configuration UI in org settings — follow existing settings page patterns with GlassCard and form components.
- PDF closure report template refinements — existing PDFKit + Handlebars approach is sound, enhance with SLA breach tracking and evidence summary.
- Door duplicate event deduplication implementation — sequence number approach per roadmap SC-2.
- Equipment health score algorithm weighting between camera and reader metrics.
- ANPR allowlist/blocklist UI design (table with confidence column, add/remove, import).
- Visitor host approval email template via Resend — follow existing email template patterns from invite module (Phase 4).
- Credential lifecycle dashboard UI — forms, tables, status badges, expiration countdown.
- Mobile incident response and door control UI — follow Phase 6 guard-first patterns with 4-tab navigation and quick actions.
- Analytics page component structure and data fetching setup — follow existing dashboard page patterns with `fetchWithAuth`.
- Evidence auto-bundling query implementation (time-window join across access events, alerts, video clips).
- Redis job deduplication implementation pattern for SLA timers — follow existing BullMQ + ioredis patterns.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Definition
- `.planning/ROADMAP.md` — Phase 8 definition, FTR-01 to FTR-07 requirements, success criteria, dependencies on Phase 5/6
- `.planning/REQUIREMENTS.md` — Full requirement text for FTR-01 through FTR-07
- `.planning/PROJECT.md` — Project constraints, key decisions, tech stack boundaries, v2.0 approach

### State & Prior Decisions
- `.planning/STATE.md` — Known blockers (door state machine race conditions under multi-tenant load, pgvector embedding pipeline)
- `.planning/phases/05-monetization/05-CONTEXT.md` — D-14/D-15: device limit enforcement at API + UI (camera/door creation checks — relevant to door config and credential issuance)
- `.planning/phases/06-premium-experience/06-CONTEXT.md` — D-01 to D-06: design system (Radix Themes + Tailwind, dark-first, motion animations, GlassCard, MetricHero, Sparkline components)

### Architecture & Code Patterns
- `.planning/codebase/ARCHITECTURE.md` — NestJS module pattern, guard system, tenant isolation, BullMQ queues, WebSocket gateway
- `.planning/codebase/STACK.md` — Prisma 5.22.0, NestJS 10.4.8, BullMQ 5.30.0, PDFKit, Handlebars, Socket.IO 4.8.3, PaddleOCR (ANPR)
- `.planning/codebase/CONVENTIONS.md` — Naming, React component style, Next.js patterns, Zod validation, Dual validation (Zod + class-validator), module structure
- `.planning/codebase/CONCERNS.md` — Known bugs (inference processor severity mapping, health check Redis leak), tech debt (notification module duplication, in-memory supervision), fragile areas (FFmpeg process management, in-memory alert dedup) — **relevant to hardening work**

### Source Code (Key Files)
- `apps/api/src/modules/door/door-state-machine.ts` — Existing state machine with VALID_TRANSITIONS, DEFAULT_ALERT_CONFIG, DoorAlertConfig interface (thresholds added here)
- `apps/api/src/modules/door/door.service.ts` — Door CRUD (threshold columns integration point)
- `apps/api/src/modules/door/door.processor.ts` — BullMQ event processor for door state changes (duplicate dedup integration point)
- `apps/api/src/modules/incident/incident-state-machine.ts` — Incident status transitions (OPEN→TRIAGE→INVESTIGATING→RESOLVED→CLOSED)
- `apps/api/src/modules/incident/incident.service.ts` — SLA timers (BullMQ), onModuleInit recovery, escalation chains, PDF reports (PDFKit+Handlebars), evidence CRUD, auto-triage event listener
- `apps/api/src/modules/incident/incident.processor.ts` — SLA escalation + auto-triage BullMQ workers
- `apps/api/src/modules/visitor/visitor.service.ts` — Visitor CRUD (host approval workflow integration point)
- `apps/api/src/modules/anpr/anpr.service.ts` — ANPR service (PaddleOCR integration, confidence threshold integration point)
- `apps/api/src/modules/analytics/analytics.service.ts` — Analytics service (per-zone metrics integration point)
- `apps/api/src/modules/equipment/equipment.service.ts` — Equipment health service
- `apps/api/src/modules/equipment/equipment.predictor.ts` — EquipmentPredictor class (enhanced for threshold alerts)
- `apps/api/prisma/schema.prisma` — Door, Incident, Visitor, VehicleList, Camera, Credential models — schema extensions for new columns
- `packages/shared/src/schemas/` — Existing Zod schemas (new schemas for SLA config, door thresholds, ANPR confidence, credential lifecycle)
- `apps/dashboard/app/(dashboard)/portes/page.tsx` — Existing doors page (per-door threshold UI integration point)
- `apps/dashboard/app/(dashboard)/` — Existing incident, visitor, ANPR, credentials pages (enhancement integration points)
- `apps/dashboard/components/ui/` — Phase 6 GlassCard, MetricHero, Sparkline, DonutChart, QuickActionBar, ActivityTimeline components (reuse for analytics and equipment health pages)
- `apps/dashboard/lib/api.ts` — fetchWithAuth, typed API functions (new endpoints for config, analytics, health)
- `apps/mobile/app/(tabs)/` — Phase 6 4-tab navigation (incident response + door control integration points)
- `apps/mobile/lib/api.ts` — Mobile API client (new endpoints for incident status update, door control)

### Dependencies to Add
None — all deepening work uses existing dependencies (BullMQ, PDFKit, Handlebars, PaddleOCR, Radix Themes, motion, ioredis). No new npm packages required.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **DoorStateMachine** (`apps/api/src/modules/door/door-state-machine.ts`): Formal state transition graph, alert config interfaces, shouldGenerateAlert() — extend with per-door config lookup, not replace
- **IncidentStateMachine** (`apps/api/src/modules/incident/incident-state-machine.ts`): Status transitions with ticket type awareness — extend with SLA severity mapping
- **IncidentService.onModuleInit()** (`apps/api/src/modules/incident/incident.service.ts:28-68`): Existing restart recovery for SLA timers — enhance with Redis dedup
- **IncidentService.generateClosureReport()** (`apps/api/src/modules/incident/incident.service.ts:413-661`): PDFKit + Handlebars HTML→PDF pipeline (French locale, A4 format) — enhance with SLA breach tracking and evidence summary
- **IncidentService.handleAlertCreated()** (`apps/api/src/modules/incident/incident.service.ts:665-699`): Auto-triage event listener with Redis dedup — pattern for evidence auto-bundling
- **EquipmentPredictor** (`apps/api/src/modules/equipment/equipment.predictor.ts`): Existing prediction class — enhance with configurable thresholds
- **Phase 6 premium components** (`apps/dashboard/components/ui/`): GlassCard, MetricHero, Sparkline, DonutChart, QuickActionBar, ActivityTimeline — reuse for analytics + equipment health pages
- **Resend SDK** (`apps/api/src/modules/notification/`): Email delivery — reuse for visitor host approval notifications
- **Zod schemas** (`packages/shared/src/schemas/`): Existing validation pattern — new schemas for SLA config, door thresholds, ANPR confidence, credential lifecycle

### Established Patterns
- **NestJS module pattern**: Each module = controller + service + module.ts. Existing modules (door, incident, visitor, ANPR, analytics, equipment) follow this — extend, don't rewrite
- **Zod + class-validator dual validation**: Shared schemas in `packages/shared/`, class-validator DTOs in `apps/api/src/common/dto/` for Swagger
- **BullMQ delayed jobs**: Used for SLA timers in incident module — pattern for any scheduled work
- **Prisma Client Extension auto-scoping**: All queries auto-filtered to `organizationId` — new config tables automatically tenant-scoped
- **ioredis for dedup**: Existing pattern in `handleAlertCreated()` — extend for SLA job dedup and door event dedup
- **fetchWithAuth()**: Dashboard API client with auto-refresh — new analytics/equipment/chart data endpoints use this
- **Named exports + interfaces**: Dashboard components follow `export function ComponentName({ ... }: Props)` pattern
- **PDFKit + Handlebars**: Closure report generation — reuse for any document generation needs

### Integration Points
- **Door model** (`apps/api/prisma/schema.prisma`): Add `heldOpenThresholdMs`, `settlingTimeoutMs` columns (nullable, fallback to defaults)
- **Incident model**: Add SLA profile reference (or use severity→SLA mapping in org settings)
- **Organization model**: Add SLA profiles JSON column, ANPR confidence threshold, equipment health thresholds
- **Visitor model**: Add host approval fields (hostId, approvalStatus, approvedAt, timeWindowStart, timeWindowEnd)
- **Credential model**: Enhance with lifecycle fields (issuedAt, expiresAt, revokedAt, revocationReason)
- **New dashboard pages**: `apps/dashboard/app/(dashboard)/analytics/` and `apps/dashboard/app/(dashboard)/equipment/` (or `equipements/`)
- **Enhanced dashboard pages**: Portes, Incidents, Visiteurs, ANPR, Identifiants — add configuration panels and deeper data displays
- **Mobile incident tab**: Add incident status update screen (list → detail → status transition)
- **Mobile door control**: Add door remote control (open/close/lock) from quick actions or dedicated screen
- **BullMQ queues**: Existing `incident-alerts` queue — add SLA dedup via Redis. Door `door-events` queue for state change processing
- **AppModule**: Register new endpoints, no new module registration needed (all existing)

### Creative Options
- Door threshold config can be a simple inline form on the door detail page (slider for heldOpenThresholdMs, toggle for forcedOpenImmediate)
- Per-severity SLA profiles can be a table in org settings with severity rows and editable SLA minutes + escalation chain
- Analytics dashboard can use a tabbed layout: Overview (health scores + recent alerts), Zones (per-zone metrics), Trends (time-series charts)
- Equipment health dashboard can use a card grid with per-device status (green/yellow/red) + detail expansion panels
- Evidence auto-bundling query can use raw SQL via `$queryRaw` to join across incident_events hypertable, access events, and alerts within the time window
- Visitor host approval can reuse the Phase 4 invite email pattern — Resend template with approval link + expiring token
- Mobile incident response can be a single new screen under the Incidents tab with status transition buttons
- Mobile door control can be a quick action or a new screen under Cameras tab (doors are spatially colocated with cameras)
</code_context>

<specifics>
## Specific Ideas

No external references or "make it like X" moments from discussion. All decisions are implementation-level convergences.

Key preferences evident: configurable per-org policies over hardcoded defaults, reuse existing design system over new libraries, pragmatic depth (not overengineered), even attention across all modules, mobile gets guard-operational workflows (not read-only views).
</specifics>

<deferred>
## Deferred Ideas

- **Door schedule-based policies** (office-hours vs after-hours thresholds) — Phase 10 enterprise feature
- **Visitor kiosk mode + badge printing** — hardware-dependent, requires physical printer integration — future phase
- **Predictive equipment degradation alerts** (ML-based "Camera 14 will fail in 3 days") — Phase 9 AI Intelligence
- **AI-based evidence correlation** (confidence-scored evidence linking) — Phase 9 AI Intelligence
- **Mobile visitor check-in screen** — future mobile-specific phase
- **Mobile ANPR plate lookup** — future mobile-specific phase
- **Mobile equipment health monitor** — future mobile-specific phase
- **BullMQ Dead Letter Queue for failed escalations** — overengineered for v2.0, operator needs notifications not a DLQ admin panel
- **Analytics WebSocket real-time push** — polling sufficient for analytics refresh; WebSocket reserved for alert streams
- **Full mobile rebuild for all 7 modules** — disproportionate effort for v2.0; incident response + door control covers 80% of guard workflows
</deferred>

---

*Phase: 8-Feature-Deepening*
*Context gathered: 2026-07-16*
