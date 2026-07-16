# Phase 8: Feature Deepening - Research

**Researched:** 2026-07-16
**Domain:** Production-grade feature hardening — access control, door state machine, visitor management, incident management, ANPR/LPR, security analytics, equipment health monitoring
**Confidence:** HIGH

## Summary

Phase 8 deepens 7 core security modules from their v1.0 foundations to production-grade — adding configurable policies, missing workflow pieces, per-tenant thresholds, Redis-backed job deduplication, and credential lifecycle management. The existing codebase is already substantial (door state machine with formal transition graph, incident SLA timers with BullMQ, ANPR with PaddleOCR, equipment health with predictive trends). The deepening work adds configurability (per-door/per-org thresholds), missing operational workflows (host approval, evidence auto-bundle, credential lifecycle), and hardening (job deduplication, SLA profiles, health scores).

**Primary recommendation:** Spread effort evenly across all 7 modules (D-01). No new npm packages needed — all work uses existing dependencies. Follow established NestJS module patterns (controller + service + module.ts), Phase 6 design system components, and existing BullMQ/ioredis patterns. The analytics dashboard rebuild from recharts to custom SVG/CSS charts is the riskiest visual component — prototype TrendChart and HeatmapGrid early.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Spread depth evenly across all 7 modules. No module prioritized over others — each receives proportional effort.
- **D-02:** Per-door threshold columns on Door Prisma model (`heldOpenThresholdMs`, `settlingTimeoutMs`). Null falls back to DEFAULT_ALERT_CONFIG constants.
- **D-03:** Duplicate dedup by sequence number per roadmap SC-2. No schedule-based policies.
- **D-04:** Per-severity SLA profiles at org level (Critical=15min, High=30min, Medium=2hr, Low=8hr)
- **D-05:** Evidence auto-bundling on closure: ±5min time window across access events, alerts, video clips
- **D-06:** Queue resilience: Redis-backed dedup for SLA timers, stalled job detection with retry+backoff
- **D-07:** Host approval workflow with email-based approval via Resend
- **D-08:** Timed passes with QR check-in
- **D-09:** Skip kiosk mode and badge printing (deferred)
- **D-10:** Per-org configurable confidence threshold (default 70%) for ANPR
- **D-11:** Vehicle-event correlation: plates linked to access events and video clips
- **D-12:** No new charting library. Build with existing Phase 6 design system (custom SVG/CSS, Radix Themes, motion)
- **D-13:** Real-time refresh for live metrics, on-demand for trends. Polling for analytics.
- **D-14:** Monitor camera health (frame drop, heartbeat, uptime) and reader health (response time, auth failure rate)
- **D-15:** Per-site health score = weighted average. Threshold-based alerting only (no ML predictive)
- **D-16:** Full credential lifecycle: issuance, temporary passes, permanent badges, revocation, reissuance
- **D-17:** Enhance existing pages with config panels, deeper data, Phase 6 design system
- **D-18:** New dedicated pages for analytics dashboard and equipment health
- **D-19:** Mobile gets incident response flows and door control flows (guard-first design)

### the agent's Discretion
- Exact door threshold UI design, SLA config UI in org settings, PDF report refinements, door dedup implementation, health score weighting, ANPR list UI, visitor approval email template, credential lifecycle UI, mobile incident response/door control UI, analytics page structure, evidence auto-bundling query, Redis dedup pattern

### Deferred Ideas (OUT OF SCOPE)
- Door schedule-based policies (office-hours vs after-hours) — Phase 10
- Visitor kiosk mode + badge printing — future phase
- Predictive ML equipment degradation alerts — Phase 9
- AI-based evidence correlation — Phase 9
- Mobile visitor check-in, ANPR lookup, equipment health — future phases
- BullMQ Dead Letter Queue — overengineered for v2.0
- Analytics WebSocket — polling sufficient
- Full mobile rebuild for all 7 modules — disproportionate effort

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FTR-01 | Access control module refactored with production-grade error handling, loading states, and edge cases | Credential lifecycle management adds issue/expire/revoke/reissue. Existing AccessService has create/deactivate/evaluate. New: expiration notifications, credential audit trail, UI for lifecycle forms. [VERIFIED: codebase audit] |
| FTR-02 | Door state machine hardened — sequence validation, deduplication, configurable thresholds per door | DoorStateMachine already has VALID_TRANSITIONS, ALERT_TRIGGER_STATES, sequence dedup, settling timers. Add per-door columns (D-02) replacing JSON alertConfig. Existing `updateAlertConfig()` uses JSON blob — migrate to dedicated columns. [VERIFIED: codebase audit] |
| FTR-03 | Visitor management deepened — host approval workflow, timed passes, check-in, badge printing | VisitorService has prereg/check-in/out. Visit model has hostUserId but no approval workflow. Add host approval fields, email flow via Resend, timed pass with QR. [VERIFIED: codebase audit] |
| FTR-04 | Incident management rebuilt — triage, SLA timers, escalation chains, evidence auto-bundle, closure reports | IncidentService already has SLA timers (BullMQ), PDF reports (PDFKit+Handlebars), evidence CRUD, auto-triage, assignment. Add per-severity SLA profiles (D-04), evidence auto-bundling (D-05), Redis dedup for SLA jobs (D-06). [VERIFIED: codebase audit] |
| FTR-05 | ANPR/LPR deepened — plate recognition with confidence scoring, allowlist/blocklist, vehicle-event correlation | AnprService already has PaddleOCR, allowlist/blocklist with Redis cache, event recording. Add per-org confidence threshold (D-10), vehicle-event correlation linking plates to access events and video clips (D-11). [VERIFIED: codebase audit] |
| FTR-06 | Security analytics dashboard with per-zone metrics, trend graphs, heatmaps, anomaly visualization | Existing analytics page uses recharts. D-12: build custom SVG/CSS charts — no new charting library. Reuse Phase 6 Sparkline, extend to TrendChart, HeatmapGrid. New tabbed page with overview/zones/trends/heatmap. [VERIFIED: codebase audit] |
| FTR-07 | Equipment health monitoring with predictive degradation alerts and per-site health scores | EquipmentService has camera/reader/controller health checks (30s cron), EquipmentPredictor with linear regression. D-14 adds frame drop rate, response time monitoring. D-15 adds per-site weighted health score. No ML — threshold-based only. [VERIFIED: codebase audit] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 10.4.8 | Backend framework | Already used across all API modules |
| Prisma | 5.22.0 | ORM + migrations | Database layer for all modules |
| BullMQ | 5.30.0 | Job queues | SLA timers, dedup, async processing |
| Redis (ioredis) | 5.4.1 | Cache + dedup + state | Door states, SLA job dedup, ANPR cache |
| Socket.IO | 4.8.3 | Real-time | Door state updates, incident updates |
| Zod | 3.23.8 | Validation | Shared schemas for all new endpoints |
| PDFKit + Handlebars | — | PDF generation | Closure reports (existing pattern) |
| motion | — | Animations | Phase 6 design system |
| Radix Themes | — | UI components | Phase 6 design system |
| Tailwind CSS | 3 | Styling | Phase 6 design system |
| Resend | 6.12.3 | Email delivery | Visitor approval emails (Phase 4 pattern) |

### Supporting Infrastructure
| Component | Purpose | Existing Location |
|-----------|---------|------------------|
| DoorStateMachine | Door transition validation | `apps/api/src/modules/door/door-state-machine.ts` |
| IncidentStateMachine | Incident status transitions | `apps/api/src/modules/incident/incident-state-machine.ts` |
| EquipmentPredictor | Linear regression trend analysis | `apps/api/src/modules/equipment/equipment.predictor.ts` |
| AccessService | Credential CRUD, access evaluation | `apps/api/src/modules/access/access.service.ts` |
| AnprService | PaddleOCR integration, allowlist/blocklist | `apps/api/src/modules/anpr/anpr.service.ts` |
| AnalyticsService | Zone analytics queries from TimescaleDB | `apps/api/src/modules/analytics/analytics.service.ts` |
| GlassCard | Premium card component (Phase 6) | `apps/dashboard/components/glass-card.tsx` |
| MetricHero | Premium metric display (Phase 6) | `apps/dashboard/components/metric-hero.tsx` |
| Sparkline | SVG sparkline chart (Phase 6) | `apps/dashboard/components/sparkline.tsx` |
| DonutChart | Donut chart (Phase 6) | `apps/dashboard/components/donut-chart.tsx` |
| QuickActionBar | Quick action row (Phase 6) | `apps/dashboard/components/quick-action-bar.tsx` |
| ActivityTimeline | Timeline component (Phase 6) | `apps/dashboard/components/activity-timeline.tsx` |
| PageTransition | Route animation (Phase 6) | `apps/dashboard/components/page-transition.tsx` |
| PageHeader | Page heading (Phase 6) | `apps/dashboard/components/page-header.tsx` |
| StatsCard | Stats display (Phase 6) | `apps/dashboard/components/stats-card.tsx` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom SVG/CSS charts | recharts (exists but deprecated) | D-12 explicitly forbids new charting libs. Existing recharts imports stay for untouched page sections |
| Polling for analytics | WebSocket real-time | D-13: polling sufficient, WebSocket reserved for alert streams |
| JSON `alertConfig` | Dedicated threshold columns | D-02: dedicated columns on Door model |
| JSON `slaProfiles` on org | Separate SLA table | D-04: store as JSON column on Organization model (simpler) |
| Sequence number dedup | Timestamp-based dedup | D-03: sequence number per SC-2 |
| 60s cooldown (existing) | Redis dedup with job ID | D-06: extends existing Redis dedup pattern in `handleAlertCreated()` |
| Threshold-based alerts | ML predictive | D-15: threshold only. ML is Phase 9 |

**Installation:**
```bash
# No new npm packages required — all dependencies already installed
```

**Version verification:** No new packages to verify. All dependencies are already in the codebase and confirmed via AGENTS.md/STACK.md and codebase audit.

## Package Legitimacy Audit

> No new external packages required. All deepening work uses existing dependencies (BullMQ, PDFKit, Handlebars, PaddleOCR, Radix Themes, motion, ioredis, Socket.IO, Resend). CONTEXT.md Dependencies to Add section confirms: "None — all deepening work uses existing dependencies."

| Package | Registry | Status | Reason |
|---------|----------|--------|--------|
| (none) | — | — | No new packages required |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Door threshold config | API (DoorService) | Dashboard (DoorThresholdConfig) | Thresholds stored in DB, API enforces validation, Dashboard provides UI |
| Door event dedup | API (DoorService) | — | In-memory + Redis dedup in service layer (existing pattern) |
| SLA profiles | API (Organization settings) | Dashboard (SLAProfileGrid) | Per-org config stored in Organization model, API serves, Dashboard configures |
| SLA timer management | API (IncidentService + BullMQ) | — | BullMQ delayed jobs for SLA countdowns (existing pattern) |
| Evidence auto-bundling | API (IncidentService) | Dashboard (EvidenceBundleList) | API queries time-window join, Dashboard displays results |
| Host approval flow | API (VisitorService + Resend) | Dashboard (VisitorApprovalPanel) | API sends email via Resend, host clicks link, API processes approval |
| Timed pass QR | API (AccessService) | Dashboard (prereg form) | QR generation already in AccessService, visit creation in VisitorService |
| ANPR confidence threshold | API (Organization settings) | Dashboard (ANPRConfidenceSlider) | Per-org config stored in Organization, ANPR service reads on plate eval |
| Vehicle-event correlation | API (AnprService + TimescaleDB) | — | Cross-table query joining vehicle_events with access_events and video clips |
| Analytics charts | Dashboard (custom SVG) | API (AnalyticsService) | Custom SVG/CSS charts in Dashboard, API provides data endpoints |
| Analytics data | API (AnalyticsService) | — | Queries zone_analytics_hourly and site_analytics_daily from TimescaleDB |
| Health monitoring | API (EquipmentService) | — | Cron-based (30s) health checks, writes to camera_health/reader_health |
| Health scores | API (EquipmentService) | Dashboard (HealthScoreGauge) | Weighted average computed server-side per site |
| Credential lifecycle | API (AccessService) | Dashboard (CredentialLifecycleForm) | AccessService CRUD extended with issue/expire/revoke/reissue |
| Mobile incident response | Mobile (React Native) | API (IncidentService) | Mobile screen calls API for status transitions |
| Mobile door control | Mobile (React Native) | API (DoorService + Socket.IO) | Mobile sends commands via API, receives updates via Socket.IO |

## Architecture Patterns

### System Architecture Diagram

```
                           ┌──────────────────────┐
                           │    Next.js Dashboard  │
                           │  (Phase 6 components) │
                           └──┬───────┬──────┬─────┘
                              │       │      │
                   fetchWithAuth()    │    Socket.IO
                              │       │      │
                              v       v      v
                     ┌──────────────────────────┐
                     │     NestJS API (Fastify)  │
                     │                          │
                     │  ┌─── Service Layer ───┐ │
                     │  │ DoorService          │ │
                     │  │ IncidentService      │ │
                     │  │ VisitorService       │ │
                     │  │ AnprService          │ │
                     │  │ AnalyticsService     │ │
                     │  │ EquipmentService     │ │
                     │  │ AccessService        │ │
                     │  └─────────┬────────────┘ │
                     │            │              │
                     │  ┌─────────v──────────┐  │
                     │  │     BullMQ Queues   │  │
                     │  │ door-alerts        │  │
                     │  │ incident-alerts    │  │
                     │  │ (SLA / dedup)      │  │
                     │  └─────────┬──────────┘  │
                     │            │              │
                     │  ┌─────────v──────────┐  │
                     │  │     Redis           │  │
                     │  │ (state, dedup,      │  │
                     │  │  cache, cooldown)   │  │
                     │  └────────────────────┘  │
                     │                          │
                     │  ┌────────────────────┐  │
                     │  │   PostgreSQL +      │  │
                     │  │   TimescaleDB       │  │
                     │  │ (Prisma models +    │  │
                     │  │  hypertables)       │  │
                     │  └────────────────────┘  │
                     │                          │
                     │  ┌────────────────────┐  │
                     │  │   Resend (Email)    │  │
                     │  └────────────────────┘  │
                     └──────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    v                       v
             ┌────────────┐        ┌──────────────┐
             │ Expo Mobile│        │ MQTT Devices │
             │ (incident  │        │ (doors,      │
             │  response, │        │  controllers,│
             │  door      │        │  readers)    │
             │  control)  │        │              │
             └────────────┘        └──────────────┘
```

### Recommended Project Structure (new/modified files)

```
apps/api/src/modules/
├── door/
│   ├── door.service.ts         ← MODIFY: read per-door threshold columns instead of JSON alertConfig
│   ├── door-state-machine.ts   ← MODIFY: enhanced threshold handling with per-config lookup
│   ├── door.controller.ts      ← MODIFY: new threshold endpoint
│   └── door.processor.ts       ← MODIFY: sequence dedup enhancement
├── incident/
│   ├── incident.service.ts     ← MODIFY: SLA profiles, evidence auto-bundle, Redis dedup
│   ├── incident.controller.ts  ← MODIFY: new endpoints for SLA config, evidence auto-bundle
│   ├── incident.processor.ts   ← MODIFY: Redis dedup for SLA jobs
│   └── incident-state-machine.ts ← MODIFY: SLA severity awareness
├── visitor/
│   ├── visitor.service.ts      ← MODIFY: host approval workflow, timed pass support
│   ├── visitor.controller.ts   ← MODIFY: host approval endpoints
│   └── visitor.module.ts       ← MODIFY: inject Resend/notifications
├── anpr/
│   ├── anpr.service.ts         ← MODIFY: confidence threshold, vehicle-event correlation
│   ├── anpr.controller.ts      ← MODIFY: threshold config endpoint
│   └── anpr.processor.ts       ← MODIFY: confidence filtering
├── access/
│   ├── access.service.ts       ← MODIFY: full credential lifecycle (issue/expire/revoke/reissue)
│   └── access.controller.ts    ← MODIFY: lifecycle endpoints
├── analytics/
│   ├── analytics.service.ts    ← MODIFY: enhanced query endpoints for new dashboard
│   └── analytics.controller.ts ← MODIFY: new endpoints for zone metrics, trends, heatmap data
├── equipment/
│   ├── equipment.service.ts    ← MODIFY: frame drop monitoring, health score aggregation
│   ├── equipment.controller.ts ← MODIFY: health score endpoint
│   └── equipment.predictor.ts  ← MODIFY: configurable thresholds
└── organization/
    └── organization.service.ts ← MODIFY: SLA profiles config, ANPR threshold config, health threshold config

apps/api/prisma/
└── schema.prisma               ← MODIFY: Door (heldOpenThresholdMs, settlingTimeoutMs), Organization (slaProfiles, anprConfidenceThreshold, healthThresholds), Visit (approvalStatus, hostApprovedAt), Credential (revokedAt, revocationReason, issuedAt)

packages/shared/src/
├── schemas/
│   ├── door.schema.ts          ← MODIFY: threshold schemas
│   ├── incident.schema.ts      ← MODIFY: SLA profile schemas, evidence auto-bundle schemas
│   ├── visitor.schema.ts       ← MODIFY: host approval, timed pass schemas
│   ├── anpr.schema.ts          ← MODIFY: confidence threshold schema
│   ├── credential.schema.ts    ← MODIFY: lifecycle schemas
│   ├── analytics.schema.ts     ← MODIFY: dashboard query schemas
│   └── equipment.schema.ts     ← MODIFY: health config schemas
└── constants/
    └── index.ts                ← MODIFY: new constants (SLA severity defaults, health score weights)

apps/dashboard/
├── app/(dashboard)/
│   ├── portes/page.tsx         ← MODIFY: add DoorThresholdConfig panel
│   ├── incidents/page.tsx      ← MODIFY: add SLAStatusBadge, evidence bundle
│   ├── incidents/[id]/page.tsx ← MODIFY: SLA detail, evidence bundle display
│   ├── visiteurs/page.tsx      ← MODIFY: approval status column, host approval panel
│   ├── vehicules/page.tsx      ← MODIFY: ANPRConfidenceSlider, enhance allowlist/blocklist table
│   ├── acces/page.tsx          ← MODIFY: full credential lifecycle UI
│   ├── analytique/page.tsx     ← REWRITE: tabbed dashboard with custom SVG charts
│   └── equipement/page.tsx     ← MODIFY: per-site health scores, threshold config
├── components/
│   ├── door-threshold-config.tsx     ← NEW: slider for heldOpenThresholdMs, settlingTimeoutMs
│   ├── sla-profile-grid.tsx          ← NEW: per-severity SLA table in org settings
│   ├── sla-status-badge.tsx          ← NEW: SLA countdown badge for incident rows
│   ├── sla-severity-badge.tsx        ← NEW: severity badge with SLA timer display
│   ├── evidence-bundle-list.tsx      ← NEW: auto-bundled evidence display with remove
│   ├── escalation-chain-editor.tsx   ← NEW: add/remove users to escalation chain per severity
│   ├── visitor-approval-panel.tsx    ← NEW: host selection, approval status, approve/deny
│   ├── anpr-confidence-slider.tsx    ← NEW: confidence threshold slider
│   ├── allowlist-blocklist-table.tsx ← NEW: enhanced plate list with confidence column
│   ├── credential-lifecycle-form.tsx ← NEW: create/edit credential with lifecycle fields
│   ├── credential-status-badge.tsx   ← NEW: status badge with colors and expiry countdown
│   ├── health-score-gauge.tsx        ← NEW: CSS conic-gradient gauge 0-100
│   ├── device-health-card.tsx        ← NEW: per-device health with metrics
│   ├── site-health-card.tsx          ← NEW: per-site aggregate health
│   ├── health-threshold-config.tsx   ← NEW: per-org health thresholds
│   ├── zone-metrics-grid.tsx         ← NEW: per-zone event metrics
│   ├── trend-chart.tsx               ← NEW: custom SVG line chart (extends Sparkline pattern)
│   └── heatmap-grid.tsx              ← NEW: CSS grid 24h×7d heatmap
├── lib/
│   └── api.ts                  ← MODIFY: new API functions for all new endpoints

apps/mobile/
├── app/(tabs)/
│   ├── _layout.tsx               ← MODIFY: incidents tab now renders real content
│   └── incidents.tsx             ← REWRITE: incident list + detail + status transitions
├── app/
│   ├── incident/[id].tsx         ← NEW: incident detail screen with status buttons
│   └── portes.tsx                ← NEW: door control list + detail + action buttons
└── components/
    ├── mobile-incident-card.tsx  ← NEW: incident card for mobile list
    └── mobile-door-card.tsx      ← NEW: door card with control buttons
```

### Pattern 1: Per-Org Configurable Policies
**What:** Store per-organization configuration as JSON fields on the Organization model or as dedicated per-entity columns on entity models. All configs have fallback defaults.
**When to use:** All configurable thresholds and profiles (SLA, door thresholds, ANPR confidence, health thresholds).
**Example:**
```typescript
// Organization model gets SLA profiles (JSON), ANPR confidence threshold, health thresholds
// Door model gets dedicated nullable columns with DEFAULT_ALERT_CONFIG fallback

// In door-state-machine.ts:
const config: DoorAlertConfig = door.heldOpenThresholdMs 
  ? { heldOpenThresholdMs: door.heldOpenThresholdMs, settlingTimeoutMs: door.settlingTimeoutMs ?? DEFAULT_ALERT_CONFIG.settlingTimeoutMs, ...DEFAULT_ALERT_CONFIG }
  : { ...DEFAULT_ALERT_CONFIG };
```

### Pattern 2: Redis-Backed Job Deduplication (D-06)
**What:** Use Redis SET with TTL to prevent duplicate BullMQ jobs — especially critical for SLA timer recovery where `onModuleInit` recovery can race with manual assignment.
**When to use:** SLA timer scheduling, auto-triage, any event→job path that could produce duplicates.
**Example:**
```typescript
// In IncidentService.handleAlertCreated() — existing pattern to extend:
const dedupKey = `incident:sla:dedup:${incidentId}:${level}`;
const alreadyScheduled = await this.redis.get(dedupKey);
if (alreadyScheduled) {
  this.logger.debug(`SLA timer already scheduled for incident ${incidentId}`);
  return;
}
await this.redis.setex(dedupKey, 3600, '1');
// Then add the BullMQ job
```

### Pattern 3: Evidence Auto-Bundling (D-05)
**What:** On incident closure, query a ±5min time window across access_events, alerts, and video clips hypertables, then auto-attach via IncidentEvidence model.
**When to use:** Inside `incident.service.ts` as a new method called during closure transition.
**Example:**
```typescript
// Raw SQL query joining across hypertables within ±5min window
const accessEvents = await this.prisma.$queryRaw`
  SELECT id, time, door_id, decision 
  FROM access_events 
  WHERE time >= ${startWindow}::timestamptz 
    AND time <= ${endWindow}::timestamptz
    AND organization_id = ${orgId}::uuid
  LIMIT 50
`;
// Similar queries for alerts and video clips
// Then create IncidentEvidence records for each match
```

### Pattern 4: Per-Site Health Score (D-15)
**What:** Weighted average across all camera and reader metrics at a site. Configurable weights. Threshold-based alerting only.
**When to use:** New method in EquipmentService computing aggregate health per site.
**Example:**
```typescript
// Health score = weighted average of device scores
// Camera: frame_drop_rate, last_heartbeat_age, connection_uptime
// Reader: response_time, auth_failure_rate
// Each device gets 0-100, weight can be equal or configurable per org

async getSiteHealthScore(orgId: string): Promise<number> {
  const cameras = await this.getCameraHealthForSite(orgId);
  const readers = await this.getReaderHealthForSite(orgId);
  const allDevices = [...cameras, ...readers];
  if (allDevices.length === 0) return 100;
  const totalScore = allDevices.reduce((sum, d) => sum + d.score, 0);
  return Math.round(totalScore / allDevices.length);
}
```

### Anti-Patterns to Avoid
- **Storing thresholds in-memory only** — Causes timer loss on restart (Pitfall 1 from incident module). Always persist to DB + Redis.
- **Single JSON config blob for thresholds** — Current `alertConfig` JSON on Door model is fragile. D-02 moves to dedicated columns, which enables Prisma type safety and indexed queries.
- **Sequential hypertable queries** — Evidence auto-bundling queries 3 separate tables. Use Promise.all for parallel queries.
- **Inline state transitions in mobile apps** — Always validate through API (DoorStateMachine/IncidentStateMachine). Mobile sends commands, API validates.
- **Chart-in-a-canvas approach** — D-12: custom SVG/CSS only. No canvas, no canvas-based charts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job scheduling/timing | Custom setTimeout for SLA timers | BullMQ delayed jobs | Persistence across restarts, retry/backoff, stalled job detection |
| Email delivery | Custom SMTP server integration | Resend SDK | Already in codebase (Phase 4 invite pattern). Simple API, deliverability |
| PDF generation | Custom PDF renderer | PDFKit + Handlebars | Already in codebase for closure reports. Supports A4, French locale |
| QR code generation | Custom QR library | QRCode library in AccessService | Already in codebase. Simple `qrcode.toDataURL()` |
| State machine validation | Custom if/else chains | DoorStateMachine / IncidentStateMachine | Formal transition graph, testable, existing implementation |
| Real-time updates | Polling for door states | Socket.IO | Already in codebase for door and incident gateways |
| Time-series analytics queries | Prisma models for hypertables | Raw SQL via `$queryRaw` | TimescaleDB hypertables are not Prisma models. Existing pattern |
| CSS conic-gradient health gauge | Canvas-based gauge | CSS conic-gradient | Composited, no JS dependencies, existing pattern in Phase 6 |

**Key insight:** Every library and pattern needed for Phase 8 already exists in the codebase. No new dependencies. The risk is not in technology but in coordination — 7 modules being deepened simultaneously must not create merge conflicts on shared files (schema.prisma, api.ts, auth-context).

## Common Pitfalls

### Pitfall 1: SLA Timer Loss on Server Restart
**What goes wrong:** BullMQ delayed jobs are Redis-backed but if the server restarts with active incidents, the SLA countdown timers are lost. The existing `onModuleInit()` recovery handles this but doesn't deduplicate against freshly-scheduled jobs.
**Why it happens:** `onModuleInit` runs on every startup and schedules SLA jobs for all active incidents, potentially duplicating jobs that were already queued by manual assignment.
**How to avoid:** Use Redis dedup keys (D-06) — check if a job was already scheduled before adding it. Also deduplicate SLA escalation jobs by incidentId + escalation level using Redis SET with TTL.
**Warning signs:** Duplicate escalation notifications, SLA timers firing twice.

### Pitfall 2: Alert Config Schema Migration Conflict
**What goes wrong:** The current `Door.alertConfig` is a JSON column storing alert thresholds. D-02 adds dedicated columns (`heldOpenThresholdMs`, `settlingTimeoutMs`). Existing code reads `door.alertConfig as any` in multiple places.
**Why it happens:** Both the old JSON path and new column path must coexist during migration. Code that reads `door.alertConfig` must prefer the new columns and fall back to JSON.
**How to avoid:** Create a Prisma migration that adds nullable columns. Update `getOrCreateMachine()` to read from columns (preferring them over JSON). Keep JSON column for backward compat during migration but write to both.
**Warning signs:** Door alert configs silently returning wrong defaults after migration.

### Pitfall 3: Evidence Auto-Bundling Performance
**What goes wrong:** The ±5 minute evidence auto-bundling query joins across 3 TimescaleDB hypertables (access_events, alerts, video clips). On a system with millions of events, this can be slow.
**Why it happens:** Time-window queries on large hypertables without appropriate indexes.
**How to avoid:** Ensure indexes exist on `time` columns of all 3 hypertables. Limit results (e.g., 50 per type). Run queries in parallel via Promise.all. Consider a materialized continuous aggregate if performance is an issue.
**Warning signs:** Incident closure takes >2 seconds, timeout errors during evidence bundling.

### Pitfall 4: Credential Lifecycle Race Conditions
**What goes wrong:** A credential can be revoked by admin at the same time as a door access evaluation runs. The old `evaluateAccess()` path could use stale Redis cache.
**Why it happens:** No distributed lock around credential state changes.
**How to avoid:** Use Redis cache invalidation on credential revoke (set a `credential:revoked:{id}` key checked by `evaluateAccess()`). The existing pattern in visitor check-out already does this.
**Warning signs:** Revoked credentials still granting access briefly.

### Pitfall 5: Mixed Phase 6/Phase 8 Component Versions
**What goes wrong:** Phase 6 premium components (GlassCard, MetricHero, Sparkline) are in `apps/dashboard/components/`. New Phase 8 components are added in same directory. Both teams editing in parallel could create import path confusion.
**Why it happens:** No separation between Phase 6 and Phase 8 components.
**How to avoid:** Phase 8 components go in same directory but use consistent naming (`door-threshold-config.tsx`, not `DoorThresholdConfig.tsx`). Use `@/components/` imports consistently.
**Warning signs:** Import path errors, duplicate component patterns.

### Pitfall 6: Door Dedup Sequence Numbers Across Service Restarts
**What goes wrong:** The `lastSequence` map is in-memory (`private lastSequence = new Map<string, number>()`). After restart, sequence tracking resets, allowing duplicate events to be processed.
**Why it happens:** In-memory state doesn't survive restart.
**How to avoid:** Persist last sequence number to Redis on each transition (e.g., `door:seq:{doorId}` with SETEX). On startup, restore from Redis. The existing sequence check in `handleDoorStateEvent()` is in-memory only.
**Warning signs:** Duplicate door alerts after server restart.

## Code Examples

### Evidence Auto-Bundling on Incident Closure (D-05)
```typescript
// Source: CONTEXT.md code_context — pattern from IncidentService.handleAlertCreated()
// New method in IncidentService:

async autoBundleEvidence(incidentId: string, orgId: string): Promise<number> {
  const incident = await this.prisma.incident.findUnique({
    where: { id: incidentId },
    select: { createdAt: true, organizationId: true }
  });
  if (!incident) return 0;

  const startWindow = new Date(incident.createdAt.getTime() - 5 * 60 * 1000);
  const endWindow = new Date(incident.createdAt.getTime() + 5 * 60 * 1000);

  // Parallel queries across hypertables
  const [accessEvents, alerts, videoClips] = await Promise.all([
    this.prisma.$queryRaw<Array<{ id: string; time: Date; door_id: string; decision: string }>>`
      SELECT id, time, door_id, decision 
      FROM access_events 
      WHERE time >= ${startWindow}::timestamptz 
        AND time <= ${endWindow}::timestamptz
        AND organization_id = ${incident.organizationId}::uuid
      LIMIT 50
    `,
    this.prisma.alert.findMany({
      where: {
        createdAt: { gte: startWindow, lte: endWindow },
        organizationId: incident.organizationId
      },
      take: 50
    }),
    this.prisma.$queryRaw<Array<{ id: string; camera_id: string; time: Date }>>`
      SELECT id, camera_id, time 
      FROM video_clips 
      WHERE time >= ${startWindow}::timestamptz 
        AND time <= ${endWindow}::timestamptz
        AND organization_id = ${incident.organizationId}::uuid
      LIMIT 50
    `
  ]);

  let attached = 0;
  // Create IncidentEvidence for each match
  for (const event of accessEvents as any[]) {
    await this.addEvidence(incidentId, {
      type: 'access_event',
      eventType: event.decision,
      eventId: event.id,
      description: `Access event ${event.decision} at door ${event.door_id}`
    }, 'system');
    attached++;
  }
  // Similar for alerts and video clips
  return attached;
}
```

### SLA Profile Configuration (D-04)
```typescript
// Source: CONTEXT.md decision D-04
// Organization model adds slaProfiles JSON column

// Schema for org SLA config:
const slaProfileSchema = z.object({
  slaProfiles: z.object({
    CRITICAL: z.object({ targetMinutes: z.literal(15), escalationUserIds: z.array(z.string().uuid()) }),
    HIGH: z.object({ targetMinutes: z.literal(30), escalationUserIds: z.array(z.string().uuid()) }),
    MEDIUM: z.object({ targetMinutes: z.literal(120), escalationUserIds: z.array(z.string().uuid()) }),
    LOW: z.object({ targetMinutes: z.literal(480), escalationUserIds: z.array(z.string().uuid()) }),
  })
});

// In incident creation, lookup SLA from org settings:
async getSlaConfig(orgId: string, severity: string) {
  const org = await this.prisma.organization.findUnique({
    where: { id: orgId },
    select: { slaProfiles: true }
  });
  const profiles = (org?.slaProfiles as any) ?? {};
  return profiles[severity] ?? { targetMinutes: 30, escalationUserIds: [] };
}
```

### SVG TrendChart (extends Sparkline pattern, D-12)
```typescript
// Source: CONTEXT.md D-12 + existing Phase 6 Sparkline component pattern

export function TrendChart({
  data,
  width = 400,
  height = 200,
  dateRange,
}: {
  data: { date: string; value: number }[];
  width?: number;
  height?: number;
  dateRange?: '7d' | '30d' | '90d';
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (d.value / max) * height,
  }));
  const pathD = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <line key={i}
          x1={0} y1={height * (1 - f)} x2={width} y2={height * (1 - f)}
          className="stroke-border/30" strokeWidth={1}
        />
      ))}
      {/* Area fill */}
      <path
        d={`${pathD} L ${width} ${height} L 0 ${height} Z`}
        fill="url(#trend-gradient)" opacity={0.1}
      />
      {/* Line */}
      <motion.path
        d={pathD}
        fill="none"
        className="stroke-primary"
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      <defs>
        <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Door alertConfig as JSON blob | Dedicated columns heldOpenThresholdMs, settlingTimeoutMs | Phase 8 | Type-safe Prisma queries, indexed thresholds |
| Hardcoded SLA (30min for all) | Per-severity SLA profiles (15min/30min/2hr/8hr) | Phase 8 | Configurable per org, drives escalation chains |
| In-memory only sequence dedup | Redis-persisted sequence tracking | Phase 8 | Survives restarts, prevents duplicate alerts |
| Manual evidence attachment | Auto-bundling on closure (±5min window) | Phase 8 | Saves operator time, reduces missed evidence |
| recharts charting library | Custom SVG/CSS charts (TrendChart, HeatmapGrid) | Phase 8 | Zero external dep, smaller bundle, consistent styling |
| Simple credential activate/deactivate | Full lifecycle: issue, expire, revoke, reissue | Phase 8 | Audit trail for all credential changes |
| Equipment threshold hardcoded | Per-org configurable thresholds (frame drop %, response time ms) | Phase 8 | Adaptable to different site requirements |
| No visitor host approval | Host selection → email approval → credential issuance | Phase 8 | Operational approval workflow for visitor access |
| ANPR confidence hardcoded | Per-org configurable confidence threshold (default 70%) | Phase 8 | Reduces false positives for low-confidence plates |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Evidence auto-bundling can use `$queryRaw` across 3 hypertables within ±5min window without performance issues | Don't Hand-Roll | If query is slow (>2s), need materialized aggregates or denormalized event store |
| A2 | Door `lastSequence` map can be migrated from in-memory to Redis without breaking existing dedup | Pitfalls | If Redis persistence introduces latency, MQTT message processing could be affected |
| A3 | Organization `slaProfiles` JSON column is simpler than a separate SLAProfile table | Patterns | If orgs need very complex per-severity escalation chains, JSON becomes unwieldy — but D-04 explicitly keeps it simple |
| A4 | Custom SVG charts perform adequately for 90 data points and 168 heatmap cells | State of the Art | At 10x scale (900 points, 1680 cells) SVG rendering may degrade — but D-13 limits data scope |
| A5 | Door threshold migration from JSON to columns can be done as additive migration (roll forward, no rollback) | Pitfalls | If the migration needs to backfill existing alertConfig JSON data, transformation logic is needed |

## Open Questions

1. **How to handle existing `alertConfig` JSON data in Door model during column migration?**
   - What we know: D-02 adds columns, existing Door rows have JSON in `alertConfig`
   - What's unclear: Should we backfill `heldOpenThresholdMs` from existing JSON, or only use columns for new doors?
   - Recommendation: Additive migration — columns are nullable NULL. Backfill in application code: on first read, if columns are NULL but JSON has values, read from JSON and write to columns. After a grace period, drop JSON column.

2. **Recharts removal strategy for analytics page?**
   - What we know: D-12 says no new charting library. Current page imports recharts. Some sections may not be touched.
   - What's unclear: Should we remove recharts entirely or leave untouched sections using it?
   - Recommendation: Only replace recharts usage in sections being reworked. If entire page is replaced, remove recharts import. Leave existing anomaly/intrusion tables as-is.

3. **Evidence auto-bundling — what table stores video clips?**
   - What we know: `IncidentEvidence` tracks evidence links. Video clips are stored in a hypertable (likely `video_clips`).
   - What's unclear: Exact name/schema of the video clips hypertable.
   - Recommendation: Search for video_clips table or similar during implementation. Fallback: query `camera_prompts` or `alert` tables for clip references.

4. **Mobile door control — should it use existing Socket.IO gateway or REST endpoints?**
   - What we know: DoorGateway exists for real-time updates. Mobile app uses REST for API calls.
   - What's unclear: Door control commands (open/close/lock) should be REST for reliability, but status updates should be Socket.IO for real-time.
   - Recommendation: REST for sending commands (POST /api/doors/:id/command), Socket.IO for receiving status updates. Same pattern as Phase 6 mobile.

## Validation Architecture

> nyquist_validation is set to `false` in .planning/config.json — this section is SKIPPED.
> Manual validation via `/gsd-verify-work` at phase gate.

## Security Domain

> Required when `security_enforcement` is enabled. Config.json does not explicitly disable it (`security_enforcement` key absent), so treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | JWT auth on all new API endpoints (existing @Roles guards) |
| V3 Session Management | Yes | Existing JWT + refresh token pattern applies to credential management |
| V4 Access Control | Yes | @Roles guards on all new endpoints. Credential lifecycle restricted to ADMIN |
| V5 Input Validation | Yes | Zod schemas for all new DTOs + class-validator for Swagger (dual validation pattern) |
| V6 Cryptography | Partial | Resend API key protected via env vars. QR seeds use `crypto.randomUUID()` |

### Known Threat Patterns for Phase 8 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SLA timer manipulation | Tampering | SLA config stored in DB, validated via Zod, @Roles(ADMIN) on writes |
| Credential revocation bypass | Elevation of Privilege | Redis cache check in evaluateAccess() before grant decision. Cache invalidated on revoke |
| ANPR confidence threshold bypass | Spoofing | Threshold applied server-side in AnprService.processFrame(), not client-side |
| Visitor approval email token theft | Information Disclosure | JWT-based approval tokens with expiry (same pattern as invite tokens) |
| Door duplicate event exploit | Repudiation | Sequence number dedup prevents replay attacks. Events logged to TimescaleDB |
| Evidence bundle removing without audit | Tampering | @Audited decorator on evidence mutation endpoints. Audit log captures remove operations |
| Mobile door control from unauthorized operator | Elevation of Privilege | Server-side state machine validation. Mobile sends command, API validates transition. Socket.IO auth check |

### Security Notes Specific to Phase 8
- **No new security surface introduced** — all existing auth guards (JwtAuthGuard → TenantIsolationGuard → RolesGuard) apply to new endpoints
- Credential lifecycle endpoints use existing @Audited decorator pattern for audit trail
- Mobile API calls use existing JWT flow — no new mobile auth flow needed
- Host approval email follows invite email pattern (JWT-signed token, not plain URL)
- Door remote control validated server-side by DoorStateMachine — mobile cannot bypass state graph

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase audit] Door module — `apps/api/src/modules/door/door-state-machine.ts`, `door.service.ts`, `door.processor.ts`, `door.controller.ts`, `door.module.ts`
- [VERIFIED: codebase audit] Incident module — `apps/api/src/modules/incident/incident.service.ts`, `incident.processor.ts`, `incident-state-machine.ts`, `incident.controller.ts`, `incident.module.ts`
- [VERIFIED: codebase audit] Visitor module — `apps/api/src/modules/visitor/visitor.service.ts`, `visitor.controller.ts`
- [VERIFIED: codebase audit] ANPR module — `apps/api/src/modules/anpr/anpr.service.ts`, `anpr.processor.ts`
- [VERIFIED: codebase audit] Equipment module — `apps/api/src/modules/equipment/equipment.service.ts`, `equipment.predictor.ts`
- [VERIFIED: codebase audit] Analytics module — `apps/api/src/modules/analytics/analytics.service.ts`, `analytics.controller.ts`
- [VERIFIED: codebase audit] Access module — `apps/api/src/modules/access/access.service.ts`, `access.controller.ts`
- [VERIFIED: codebase audit] Notification service (Resend) — `apps/api/src/modules/notifications/notifications.service.ts`
- [VERIFIED: codebase audit] Invite service (Resend email pattern) — `apps/api/src/modules/organization/invite/invite.service.ts`
- [VERIFIED: codebase audit] Phase 6 dashboard components — `apps/dashboard/components/glass-card.tsx`, `metric-hero.tsx`, `sparkline.tsx`, `donut-chart.tsx`, `quick-action-bar.tsx`, `activity-timeline.tsx`
- [VERIFIED: codebase audit] Prisma schema — `apps/api/prisma/schema.prisma`
- [VERIFIED: codebase audit] CONTEXT.md — `.planning/phases/08-feature-deepening/08-CONTEXT.md`
- [VERIFIED: codebase audit] UI-SPEC.md — `.planning/phases/08-feature-deepening/08-UI-SPEC.md`
- [VERIFIED: codebase audit] Dashboard doors page — `apps/dashboard/app/(dashboard)/portes/page.tsx`
- [VERIFIED: codebase audit] Dashboard analytics page — `apps/dashboard/app/(dashboard)/analytique/page.tsx`
- [VERIFIED: codebase audit] Mobile incidents placeholder — `apps/mobile/app/(tabs)/incidents.tsx`
- [VERIFIED: codebase audit] Mobile tab layout — `apps/mobile/app/(tabs)/_layout.tsx`
- [VERIFIED: codebase audit] API client — `apps/dashboard/lib/api.ts`
- [VERIFIED: codebase audit] Shared schemas — `packages/shared/src/schemas/`

### Secondary (MEDIUM confidence)
- [ASSUMED] Resend email template pattern from invite module — follows same JWT-signed approval link pattern for visitor host approval
- [ASSUMED] Video clips hypertable exists (referenced in CONTEXT.md code_context as "video clips") — exact table name to verify during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages and versions verified via codebase audit
- Architecture: HIGH - All patterns exist in current codebase
- Pitfalls: HIGH - Based on existing codebase patterns and known failure modes

**Research date:** 2026-07-16
**Valid until:** 2026-08-15 (30 days — codebase is actively developed)
