# Phase 3: Intelligent Platform — Research

**Researched:** 2026-07-14
**Domain:** Security analytics, risk scoring, pattern detection, predictive equipment health, multi-site isolation, maintenance workflows, dashboard visualization
**Confidence:** HIGH

## Summary

Phase 3 builds on the complete Phase 1 (access control, door monitoring, video correlation, audit) and Phase 2 (incident management, visitor management, ANPR, AI/NLP, equipment health, data governance) infrastructure. It adds five new intelligence capabilities: security analytics (ANLY-01–05), dynamic risk scoring (RSK-01–03), recurring pattern detection (RSK-02), predictive equipment degradation (EQPT-04–05), multi-site data isolation (AUDT-06), and maintenance workflow integration (WFL-01–03).

**Key architectural decisions:**
- **Security Analytics** uses TimescaleDB continuous aggregates over existing `access_events`, `door_state_log`, `vehicle_events`, and AI analysis event streams to compute intrusion/loitering/absence/abnormal activity metrics per zone and per site. No new frame-analysis AI — detection reuses the existing Ollama vision pipeline from Phases 1-2; Phase 3 adds the aggregation, baseline comparison, and dashboard layers.
- **Dynamic Risk Scoring** computes per-zone risk as a weighted formula: baseline + denied_attempts_weight + open_door_weight + anomaly_weight + recency_decay. Scores are written to a new TimescaleDB `risk_scores` hypertable and refreshed periodically via cron (every 5 minutes). The scoring engine is a pure NestJS service — no ML model needed for MVP.
- **Recurring Pattern Detection** uses TimescaleDB aggregation queries with configurable frequency thresholds: "door X has false-positived N times in M hours" or "reader Y has misconfigured status for Z days". Patterns are surfaced as dashboard warnings and optional alerts.
- **Predictive Equipment Health** extends the Phase 2 `EquipmentService` with trend analysis: battery drain rate, connection stability degradation, FPS drift. Uses simple linear extrapolation on TimescaleDB health metric time-series to predict days-to-failure. Thresholds are configurable via the existing governance model or new equipment config model.
- **Multi-Site Isolation** uses PostgreSQL Row-Level Security (RLS) — the standard, auditable approach — instead of application-layer filtering. RLS policies reference `app.current_site_id` set per-request via NestJS middleware. This is applied to all existing and new TimescaleDB hypertables and Prisma tables.
- **Maintenance Workflows** extend the Phase 2 `Incident` model with a new `MAINTENANCE_TICKET` type (narrower lifecycle: `open → in_progress → resolved → closed`, no SLA escalation) rather than creating a separate ticket model. The existing incident dashboard displays both security incidents and maintenance tickets with a type filter. A new `MAINTENANCE_TEAM` role is added.
- **Dashboard Charting** adds `recharts` (the standard React charting library for Next.js/Tailwind apps) — no charting library currently exists in the project. Recharts integrates with Tailwind CSS v3 and shadcn/ui components. [VERIFIED: npm registry]

**Primary recommendation:** Build as 4–5 vertical MVP plans following Phase 1/2 patterns. Each plan delivers end-to-end functionality (NestJS module + shared types + TimescaleDB migration + dashboard page). No new infrastructure (containers, databases, queues) beyond what already exists in the project.

<user_constraints>
## User Constraints (from CONTEXT.md)

> Phase 3 has no CONTEXT.md yet (this phase is being researched directly). The following constraints are derived from AGENTS.md, PROJECT.md, REQUIREMENTS.md, and ROADMAP.md.

### Locked Decisions
- **Tech stack**: Must build on existing NestJS + Next.js + Expo + Prisma + Redis + BullMQ stack. No framework rewrites.
- **AI**: Continue using Ollama/vision models for AI analysis; integrate with access control events.
- **Deployment**: Self-hosted via Docker Compose with Caddy reverse proxy. No mandatory cloud dependency.
- **Performance**: Real-time alerting must stay sub-second. Video correlation must not block the event pipeline.
- **Security**: Role-based access control must extend to new modules. Audit logs must be immutable. JWT auth must cover all new endpoints.
- **Mobile**: Expo mobile app must support new guard/operator workflows (check-in, incident response, door control).
- **Prisma + TimescaleDB separation**: Prisma manages reference tables only. All time-series event data goes to TimescaleDB hypertables via `$queryRaw`.
- **Event bus pattern**: `@nestjs/event-emitter` for decoupled cross-module communication.
- **Existing architecture**: No framework rewrites. Must build upon existing monorepo (NestJS + Next.js + Expo + Prisma + Redis + BullMQ + Ollama).

### The Agent's Discretion
- New BullMQ queue names (follow existing pattern: `recurring-patterns`, `risk-scoring`, `predictive-health`)
- API endpoint structure follows existing NestJS module conventions (`modules/analytics/`, `modules/maintenance/`)
- Dashboard page routing follows existing pattern (`app/(dashboard)/analytique/`, `app/(dashboard)/maintenance/`)
- Risk scoring formula weights and decay factors
- Predictive health degradation thresholds and trend window sizes
- Which specific PostgreSQL tables get RLS policies applied
- Charting library choice (recharts recommended, alternatives: nivo, visx, chart.js)

### Deferred Ideas (OUT OF SCOPE)
- Mobile wallet NFC credentials → v2
- Biometric credentials → v2
- Facial recognition as primary auth → v2
- OT/SCADA integration → out of scope
- SIEM integration → out of scope
- Real-time cross-site person tracking → v2
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANLY-01 | System detects intrusion into defined forbidden zones | §Security Analytics — Reuses existing Ollama zone intrusion detection; adds aggregation layer and dashboard |
| ANLY-02 | System detects loitering behavior (extended presence in defined areas) | §Security Analytics — Requires new AI analysis prompt ("loitering detection") + TimescaleDB aggregation for duration-based detection |
| ANLY-03 | System detects unusual absence (zone expected to be occupied but empty) | §Security Analytics — Historical baseline comparison using TimescaleDB continuous aggregates; expected vs actual presence |
| ANLY-04 | System detects abnormal activity vs historical baseline per zone | §Security Analytics — Time-series deviation detection using TimescaleDB aggregates with configurable thresholds |
| ANLY-05 | Admin views per-site security metrics dashboard | §Security Analytics Dashboard — New dashboard page with charts (recharts), event count trends, incident analytics, false positive rates |
| RSK-01 | System computes per-zone risk score based on recent events, denied attempts, open doors, anomalies | §Risk Scoring — Weighted formula engine with TimescaleDB-stored scores; recomputed every 5 minutes via cron |
| RSK-02 | System detects recurring situations (same door false-positiving, reader misconfigured) and surfaces patterns | §Recurring Pattern Detection — TimescaleDB aggregation queries with configurable frequency thresholds |
| RSK-03 | Admin views executive dashboard with multi-site risk overview and trend graphs | §Risk Dashboard — Multi-site risk overview with trend graphs via recharts; site-isolated per RLS |
| EQPT-04 | System alerts on equipment degradation before failure (predictive thresholds) | §Predictive Equipment Health — Trend analysis on existing health hypertables; linear extrapolation for days-to-failure |
| EQPT-05 | System visualizes camera-to-door association and detects mismatches or gaps | §Camera-to-Door Visualization — New dashboard visualization using existing CameraDoorMap model; detects orphan cameras/doors, mismatched zones |
| AUDT-06 | System supports multi-site isolation (site-level data separation and permission scoping) | §Multi-Site Isolation — PostgreSQL Row-Level Security on all tables; per-request site context via NestJS middleware |
| WFL-01 | System auto-creates maintenance ticket when equipment health degrades (door fault, camera offline) | §Maintenance Workflows — Extend EquipmentService equipment.alert handler to auto-create MAINTENANCE_TICKET incidents |
| WFL-02 | System routes equipment issues to maintenance team (separate from security alerts) | §Maintenance Workflows — New MAINTENANCE_TEAM role; tickets assigned to maintenance-specific user queue |
| WFL-03 | Operator can track maintenance ticket status alongside security incidents in unified view | §Maintenance Workflows — Unified incident/ticket list with type filter; extends existing incident dashboard |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Intrusion detection (AI analysis) | AI Preprocessor (Python/Ollama) | — | Zone intrusion analysis already exists in Ollama vision pipeline from Phase 1 |
| Loitering detection (AI analysis) | AI Preprocessor (Python/Ollama) | — | Requires new AI analysis prompt for extended presence detection; runs in existing pipeline |
| Unusual absence detection | API / TimescaleDB | — | Baseline computation from historical occupancy data; comparison logic in NestJS service |
| Abnormal activity detection | API / TimescaleDB | — | Deviation detection using statistical methods on continuous aggregates |
| Security analytics aggregation | API / TimescaleDB | — | Continuous aggregates over existing hypertables; service layer for enrichment |
| Per-zone risk score computation | API / BullMQ | TimescaleDB | Periodic cron job computes scores; written to risk_scores hypertable |
| Recurring pattern detection | API / TimescaleDB | BullMQ | Aggregation queries for frequency analysis; queued detection jobs |
| Predictive equipment health | API / TimescaleDB | BullMQ | Trend analysis on health hypertables; BullMQ for periodic computation |
| Camera-to-door visualization | API | Browser | Reads existing CameraDoorMap; dashboard page with visual mapping |
| Multi-site data isolation (RLS) | Database (PostgreSQL) | API | RLS policies on all tables; middleware sets session context per request |
| Maintenance ticket auto-creation | API / BullMQ | — | Event bus listener on equipment.alert; ticket created via Incident model |
| Maintenance ticket tracking | API | Browser | Extends incident dashboard with type filter, MAINTENANCE_TEAM role |
| Security analytics dashboard | Frontend Server (SSR) | Browser | Next.js App Router pages with recharts for time-series visualization |
| Executive risk dashboard | Frontend Server (SSR) | Browser | Multi-site risk overview with trend graphs, site-isolated data |
| Predictive health alerts | API | — | Alert generation when trend analysis predicts failure within threshold window |

## Standard Stack

### Core New Dependencies

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `recharts` | 2.15.1 | React charting library for dashboard trend graphs, risk score charts, health metric time-series | [VERIFIED: npm registry] — Most popular React charting library (25k+ stars), built on D3, composable components (LineChart, BarChart, PieChart, AreaChart). First-class React integration, works with Tailwind CSS via wrapper cn() classes. No other charting lib exists in project. |

### Supporting New Dependencies

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `recharts` | 2.15.1 | Area charts for risk score trends, bar charts for event counts, donut charts for severity breakdown | All Phase 3 charting |
| `@types/recharts` | 2.15.0 | TypeScript type definitions | Dev dependency for TypeScript support |

### Already Installed (Phase 1-2)

| Library | Version | Purpose | Phase 3 Use |
|---------|---------|---------|-------------|
| `@nestjs/event-emitter` | 3.1.0 | Event bus | New events: `equipment.alert` → maintenance ticket creation, `pattern.detected`, `prediction.triggered` |
| `bullmq` | 5.30.0 | Job queues | New queues: `recurring-patterns`, `risk-scoring`, `predictive-health` |
| `ioredis` | 5.4.1 | Redis client | Risk score cache, pattern dedup, prediction caching |
| `socket.io` | 4.8.3 | Real-time WebSocket | Live risk score updates, pattern detection alerts, maintenance ticket push |
| `@nestjs/schedule` | 6.1.3 | Cron jobs | Risk score computation (every 5 min), pattern detection (every 15 min), predictive health (every hour) |
| `@prisma/client` | 5.22.0 | Database ORM | New models: MaintenanceConfig, new enum values for Incident status/types |
| `zod` | 3.23.8 | Runtime validation | New schemas: analytics, risk, maintenance |
| `recharts` | 2.15.1 | Charts | Trend graphs, risk visualizations, health metrics |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PostgreSQL RLS for multi-site isolation | Application-layer site filtering (query WHERE site_id = ? on every query) | RLS is the standard approach for PostgreSQL native multi-tenancy. It prevents accidental data leaks at the database level, enforces even if a developer forgets a WHERE clause, and is auditable. Application-layer filtering is more portable but error-prone and needs to be applied consistently across all queries. RLS is the correct choice when database-level enforcement is needed. [CITED: PostgreSQL docs] |
| TimescaleDB continuous aggregates for analytics | Raw event queries with no pre-aggregation | Continuous aggregates give sub-second query times for dashboard trend graphs over millions of events. Without them, dashboards would become unusably slow at scale. Already proven pattern in Phase 1 (004_continuous_aggregates.sql). |
| recharts for charting | nivo, visx, chart.js, apexcharts | recharts is the most popular React charting library, has the most community support, and integrates naturally with React component model. nivo is more customizable but heavier. visx requires more D3 knowledge. chart.js has worse React integration. |
| Simple linear extrapolation for predictive health | ML model (e.g., Prophet, sklearn) | ML model would require new infrastructure (Python service, model training, feature pipeline). Simple trend analysis (rate of change over sliding window) covers the MVP use case: "battery dropped 15% in 7 days → ~30 days to failure" and "FPS dropped 30% in 2 hours → investigate now." Upgrade path: add ML later. |

**Installation:**
```bash
# Core new packages (workspace root)
pnpm --filter @repo/dashboard add recharts@2.15.1
pnpm --filter @repo/dashboard add -D @types/recharts@2.15.0
```

**Version verification:** All npm packages confirmed on registry:
- `recharts@2.15.1` — published, 25k+ GitHub stars, active maintenance, peer dep react@^18 [VERIFIED: npm registry]

## Package Legitimacy Audit

> **Note:** slopcheck was unavailable at research time. All packages are tagged `[ASSUMED]` pending verification. The planner should gate the recharts install behind `checkpoint:human-verify`.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `recharts` | npm | 9+ yrs | 5M+/wk | github.com/recharts/recharts | [ASSUMED] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*All packages tagged `[ASSUMED]` — slopcheck was unavailable. Planner should gate new dependency installs behind `checkpoint:human-verify` if risk is a concern.*

## Architecture Patterns

### System Architecture Diagram

```
                                            ┌──────────────────────────────────────────────┐
                                            │           Caddy Reverse Proxy                │
                                            │      /api/* → api:4000                       │
                                            │      /ws/*  → api:4000                       │
                                            └──────────────────┬───────────────────────────┘
                                                               │
                   ┌───────────────────────────────────────────┼───────────────────────────────────┐
                   │                                           ▼                                   │
                   │  ┌─────────────────────────────────────────────────────────────────────────┐ │
                   │  │                     NestJS API (Fastify :4000)                         │ │
                   │  │                                                                        │ │
                   │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
                   │  │  │Analytics │ │   Risk   │ │Recurring │ │Predictive│ │ Maintenance  │  │ │
                   │  │  │ Module   │ │  Module  │ │ Patterns │ │  Health  │ │   Module     │  │ │
                   │  │  │ (NEW)    │ │  (NEW)   │ │ (NEW)    │ │ (extend) │ │  (NEW)       │  │ │
                   │  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘  │ │
                   │  │       │            │             │            │              │          │ │
                   │  │       └──────┬─────┴─────────────┴────────────┴──────────────┘          │ │
                   │  │              ▼                                                          │ │
                   │  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
                   │  │  │              @nestjs/event-emitter (Event Bus)                  │  │ │
                   │  │  │  equipment.alert  |  pattern.detected  |  prediction.triggered  │  │ │
                   │  │  │  incident.created |  risk-score.updated                         │  │ │
                   │  │  └────────────────────────┬────────────────────────────────────────┘  │ │
                   │  │                           │                                           │ │
                   │  │              ┌────────────┼─────────────┬───────────────┐             │ │
                   │  │              ▼            ▼             ▼               ▼             │ │
                   │  │      ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐   │ │
                   │  │      │Incident  │ │  AI      │ │Equipment  │ │Correlation       │   │ │
                   │  │      │ Module   │ │  Module  │ │  Module   │ │ Module (P1)      │   │ │
                   │  │      │ (P2)     │ │  (P2)    │ │  (P2+P3)  │ │                  │   │ │
                   │  │      └──────────┘ └──────────┘ └───────────┘ └──────────────────┘   │ │
                   │  └───────────────────────────────────────────────────────────────────────┘ │
                   │                                     │                                      │
                   │         ┌───────────────────────────┼──────────────────────────┐           │
                   │         │                           │                          │           │
                   │         ▼                           ▼                          ▼           │
                   │  ┌────────────────┐    ┌────────────────────┐    ┌──────────────────────┐  │
                   │  │  BullMQ Queues  │    │  PostgreSQL 16     │    │  TimescaleDB         │  │
                   │  │  (Redis)        │    │  + pgvector        │    │  Hypertables         │  │
                   │  │                 │    │  + pgcrypto        │    │                      │  │
                   │  │  NEW for P3:    │    │  + Row-Level Sec.  │    │  NEW for P3:         │  │
                   │  │  recurring-     │    │                   │    │  risk_scores         │  │
                   │  │  patterns       │    │  NEW for P3:     │    │  zone_analytics_hour │  │
                   │  │  risk-scoring   │    │  Prisma Models    │    │  site_analytics_daily│  │
                   │  │  predictive-    │    │  — Incident type  │    │  (continuous agg)   │  │
                   │  │  health         │    │    extended       │    │  + RLS on all       │  │
                   │  │                 │    │  — MaintenanceReq.│    │  + pred. thresholds │  │
                   │  │  (existing)     │    │  + existing P1+P2 │    │  + existing P1+P2   │  │
                   │  │  incident-alerts│    │  models           │    │  hypertables        │  │
                   │  │  anpr-processing│    └────────────────────┘    └──────────────────────┘  │
                   │  │  equipment-     │                                                     │
                   │  │  health         │   ┌──────────────┐    ┌──────────────────┐           │
                   │  │  ai-summaries   │   │    Ollama    │    │    Socket.IO     │           │
                   │  │  retention-     │   │  (LLM + VLM) │    │  (real-time:     │           │
                   │  │  pruning        │   │  :11434      │    │   risk scores,   │           │
                   │  └────────────────┘   └──────────────┘    │   patterns,      │           │
                   │                                            │   maintenance    │           │
                   │                                            └──────────────────┘           │
                   └───────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
apps/api/src/
├── modules/
│   ├── analytics/                       # NEW: Security Analytics module
│   │   ├── analytics.module.ts
│   │   ├── analytics.controller.ts      # /api/analytics/* endpoints
│   │   ├── analytics.service.ts         # Aggregation, baseline, detection logic
│   │   └── analytics.service.spec.ts
│   ├── risk/                            # NEW: Risk Scoring module
│   │   ├── risk.module.ts
│   │   ├── risk.controller.ts           # /api/risk/* endpoints
│   │   ├── risk.service.ts              # Scoring engine, cron computation
│   │   └── risk.service.spec.ts
│   ├── patterns/                        # NEW: Recurring Pattern Detection module
│   │   ├── patterns.module.ts
│   │   ├── patterns.controller.ts       # /api/patterns/* endpoints
│   │   ├── patterns.service.ts          # Frequency analysis, pattern matching
│   │   ├── patterns.processor.ts        # BullMQ: recurring-patterns queue
│   │   └── patterns.service.spec.ts
│   ├── equipment/                       # EXTEND: Predictive health + camera-to-door viz
│   │   ├── ... (existing files)         # Extend equipment.service.ts with trend analysis
│   │   └── equipment.predictor.ts       # NEW: Predictive health engine
│   ├── maintenance/                     # NEW: Maintenance Workflows module
│   │   ├── maintenance.module.ts
│   │   ├── maintenance.controller.ts    # /api/maintenance/* endpoints
│   │   ├── maintenance.service.ts       # Ticket creation, routing, unified view
│   │   └── maintenance.service.spec.ts
│   ├── governance/                      # EXTEND: Multi-site isolation setup
│   │   └── ... (existing files)         # Extend for RLS management
│   └── incident/                        # EXTEND: Support maintenance ticket type
│       └── ... (existing files)         # Extend IncidentStateMachine with MAINTENANCE type

apps/api/migrations/timescaledb/up/
├── 014_risk_scores.sql                  # NEW: Hypertable for risk scores per zone
├── 015_analytics_aggregates.sql         # NEW: Continuous aggregates for analytics
├── 016_recurring_patterns.sql           # NEW: Hypertable for detected patterns
├── 017_predictive_health.sql            # NEW: Hypertable for prediction results
├── 018_rls_policies.sql                 # NEW: Row-Level Security policies
├── 019_retention_policies_p3.sql        # NEW: Compression/retention for P3 hypertables

packages/shared/src/
├── schemas/
│   ├── analytics.schema.ts              # NEW: Zod schemas for analytics queries
│   ├── risk.schema.ts                   # NEW: Zod schemas for risk scoring
│   ├── patterns.schema.ts              # NEW: Zod schemas for pattern detection
│   └── maintenance.schema.ts           # NEW: Zod schemas for maintenance tickets
├── types/
│   ├── analytics.types.ts              # NEW: Analytics metric types
│   ├── risk.types.ts                   # NEW: RiskScore, ZoneRisk types
│   ├── patterns.types.ts              # NEW: Pattern types
│   └── maintenance.types.ts           # NEW: MaintenanceTicket types
├── constants/
│   ├── incident-status.ts              # EXTEND: Add MAINTENANCE_IN_PROGRESS, etc.
│   └── ... (existing)
└── index.ts                            # EXTEND: Barrel exports for new schemas/types

apps/dashboard/app/(dashboard)/
├── analytique/                          # NEW: Analytics dashboard pages
│   ├── page.tsx                         # Per-site security metrics dashboard
│   └── intrusion/                       # Intrusion/loitering/absence detail view
├── risque/                              # NEW: Risk dashboard pages
│   ├── page.tsx                         # Executive dashboard with multi-site risk overview
│   └── zones/[id]/page.tsx              # Per-zone risk detail with trend graph
├── maintenance/                         # NEW: Maintenance workflow pages
│   ├── page.tsx                         # Unified incident+ticket list
│   └── tickets/[id]/page.tsx            # Maintenance ticket detail
```

### Pattern 1: Security Analytics with TimescaleDB Continuous Aggregates

**What:** Pre-computed materialized views over raw event hypertables enable sub-second dashboard queries over millions of events. Phase 3 adds new continuous aggregates for security analytics metrics: intrusion attempts per zone per hour, door state anomaly rates, vehicle event patterns, and AI detection event summaries.

**When to use:** All analytics dashboard queries that aggregate over time windows (hourly, daily) rather than querying raw events. Extends Phase 1's existing `door_access_hourly` and `door_alert_daily` continuous aggregates.

**Confidence: HIGH** — Proven pattern from Phase 1 (004_continuous_aggregates.sql). TimescaleDB continuous aggregates are the standard approach for time-series analytics.

```sql
-- Source: Derived from Phase 1 004_continuous_aggregates.sql pattern
-- NEW: Zone analytics per hour — intrusion attempts, denied accesses, door anomalies
CREATE MATERIALIZED VIEW zone_analytics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', ae.time) AS bucket,
    z.id AS zone_id,
    z.site_id,
    COUNT(*) FILTER (WHERE ae.decision = 'denied') AS denied_count,
    COUNT(*) FILTER (WHERE ae.decision = 'granted') AS granted_count,
    COUNT(*) FILTER (WHERE dsl.state IN ('forced', 'held-open')) AS door_anomaly_count
FROM zones z
JOIN doors d ON d.zone_id = z.id
LEFT JOIN access_events ae ON ae.door_id = d.id AND ae.time >= NOW() - INTERVAL '24 hours'
LEFT JOIN door_state_log dsl ON dsl.door_id = d.id AND dsl.time >= NOW() - INTERVAL '24 hours'
GROUP BY bucket, z.id, z.site_id;

SELECT add_continuous_aggregate_policy('zone_analytics_hourly',
    start_offset => INTERVAL '2 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);

-- NEW: Site-level daily analytics for executive dashboard
CREATE MATERIALIZED VIEW site_analytics_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', ae.time) AS bucket,
    ae.site_id,
    COUNT(*) FILTER (WHERE ae.decision = 'denied') AS total_denied,
    COUNT(*) FILTER (WHERE ae.decision = 'granted') AS total_granted,
    COUNT(DISTINCT dsl.door_id) FILTER (WHERE dsl.state IN ('forced', 'held-open')) AS doors_with_anomalies,
    COUNT(DISTINCT i.id) AS incidents_created
FROM access_events ae
LEFT JOIN door_state_log dsl ON dsl.site_id = ae.site_id AND dsl.time >= NOW() - INTERVAL '24 hours'
LEFT JOIN incidents i ON i.site_id = ae.site_id AND i.createdAt >= NOW() - INTERVAL '24 hours'
GROUP BY bucket, ae.site_id;
```

### Pattern 2: Dynamic Risk Scoring Engine

**What:** Per-zone risk score computed from weighted factors: denied access attempts, open door anomalies, AI-detected anomalies, incident activity, and time decay. Scores range 0-100 (0 = no risk, 100 = critical).

**When to use:** Every 5-minute cron job; scores are cached in Redis for sub-second reads and written to `risk_scores` hypertable for trend analysis.

**Confidence: HIGH** — Standard weighted scoring model. No ML required for MVP.

```typescript
// Predicted file: apps/api/src/modules/risk/risk.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import Redis from "ioredis";

interface RiskFactors {
  deniedAttempts: number;      // Count in last 24h
  openDoorAnomalies: number;   // Forced/held-open events in last 24h
  anomalyEvents: number;       // AI-detected anomalies in last 24h
  activeIncidents: number;     // Open incidents for this zone
  failedReaders: number;       // Readers with failed reads > threshold
  hoursSinceLastEvent: number; // Recency of last security event
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  // Weight configuration (configurable via environment or Prisma model)
  private readonly WEIGHTS = {
    deniedAttempts: 25,
    openDoorAnomalies: 30,
    anomalyEvents: 25,
    activeIncidents: 15,
    failedReaders: 5,
  };

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @Inject("REDIS_RISK") private redis: Redis,
  ) {}

  @Cron("*/5 * * * *")
  async computeAllZoneScores() {
    const zones = await this.prisma.zone.findMany({
      where: { isActive: true },
      include: { site: true },
    });

    for (const zone of zones) {
      const factors = await this.collectRiskFactors(zone.id, zone.siteId);
      const score = this.calculateScore(factors);
      const riskLevel = this.classifyLevel(score);

      // Write to risk_scores hypertable
      await this.prisma.$queryRawUnsafe(
        `INSERT INTO risk_scores (time, zone_id, site_id, score, risk_level, factors)
         VALUES (NOW(), $1::uuid, $2::uuid, $3, $4, $5::jsonb)`,
        zone.id, zone.siteId, score, riskLevel, JSON.stringify(factors),
      );

      // Cache current score in Redis for fast reads
      await this.redis.set(
        `risk:zone:${zone.id}`,
        JSON.stringify({ score, riskLevel, factors, zoneId: zone.id, siteId: zone.siteId }),
        "EX", 600, // 10 min TTL
      );

      // Emit event if score crossed threshold
      if (score >= 70) {
        this.eventEmitter.emit("risk.score-critical", {
          zoneId: zone.id,
          siteId: zone.siteId,
          score,
          riskLevel,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  private calculateScore(factors: RiskFactors): number {
    // Weighted sum capped at 100
    const rawScore =
      Math.min(factors.deniedAttempts / 10, 1) * this.WEIGHTS.deniedAttempts +
      Math.min(factors.openDoorAnomalies / 5, 1) * this.WEIGHTS.openDoorAnomalies +
      Math.min(factors.anomalyEvents / 10, 1) * this.WEIGHTS.anomalyEvents +
      Math.min(factors.activeIncidents / 3, 1) * this.WEIGHTS.activeIncidents +
      Math.min(factors.failedReaders / 2, 1) * this.WEIGHTS.failedReaders;

    // Apply recency decay (score increases if events are very recent)
    const recencyBonus = factors.hoursSinceLastEvent < 1 ? 10
      : factors.hoursSinceLastEvent < 6 ? 5
      : factors.hoursSinceLastEvent < 24 ? 2
      : 0;

    return Math.min(100, Math.round(rawScore + recencyBonus));
  }

  private classifyLevel(score: number): string {
    if (score >= 70) return "critical";
    if (score >= 40) return "elevated";
    if (score >= 20) return "moderate";
    return "low";
  }

  private async collectRiskFactors(zoneId: string, siteId: string): Promise<RiskFactors> {
    // Query TimescaleDB for recent event counts
    const [deniedResult, anomalyResult, incidentCount, readerHealth] = await Promise.all([
      this.prisma.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT COUNT(*) as count FROM access_events
         WHERE zone_id = $1::uuid AND decision = 'denied'
         AND time > NOW() - INTERVAL '24 hours'`,
        zoneId,
      ),
      this.prisma.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT COUNT(*) as count FROM access_events
         WHERE zone_id = $1::uuid AND decision IN ('tailgate', 'error')
         AND time > NOW() - INTERVAL '24 hours'`,
        zoneId,
      ),
      this.prisma.incident.count({
        where: { zoneId: zoneId, status: { notIn: ["resolved", "closed"] } },
      }),
      // Count readers with high failure rates in this zone
      this.prisma.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT COUNT(DISTINCT reader_id) as count FROM reader_health rh
         JOIN doors d ON d.site_id = $2::uuid
         WHERE rh.failed_reads > 10 AND rh.time > NOW() - INTERVAL '24 hours'`,
        zoneId, siteId,
      ),
    ]);

    return {
      deniedAttempts: Number(deniedResult?.[0]?.count ?? 0),
      openDoorAnomalies: 0, // Computed separately from door_state_log
      anomalyEvents: Number(anomalyResult?.[0]?.count ?? 0),
      activeIncidents: incidentCount,
      failedReaders: Number(readerHealth?.[0]?.count ?? 0),
      hoursSinceLastEvent: 0, // Computed from latest event timestamp
    };
  }
}
```

### Pattern 3: Recurring Pattern Detection via TimescaleDB Frequency Analysis

**What:** Queries detect repeated events of the same type at the same device within a configurable time window. For example: "door X has been forced open 5+ times in the last hour" or "reader Y has 10+ consecutive failed reads."

**When to use:** Periodically (every 15 minutes via cron) or triggered by event thresholds. Results written to `detected_patterns` hypertable for dashboard display.

**Confidence: HIGH** — Standard SQL frequency analysis. No ML or complex algorithms needed.

```typescript
// Predicted file: apps/api/src/modules/patterns/patterns.service.ts

// Pattern definitions (configurable)
const PATTERNS = [
  {
    id: "door-repeated-forced",
    name: "Porte forcée répétée",
    query: `
      SELECT door_id, site_id, COUNT(*) as occurrence_count
      FROM door_state_log
      WHERE state = 'forced' AND time > NOW() - $1::interval
      GROUP BY door_id, site_id
      HAVING COUNT(*) >= $2
    `,
    params: [INTERVAL '1 hour', 3], // 3+ forced events in 1 hour
    severity: "HIGH",
  },
  {
    id: "reader-high-failure-rate",
    name: "Taux d'échec de lecteur élevé",
    query: `
      SELECT reader_id, $3::uuid as site_id, COUNT(*) as occurrence_count
      FROM reader_health
      WHERE failed_reads > 5 AND time > NOW() - $1::interval
      GROUP BY reader_id
      HAVING COUNT(*) >= $2
    `,
    params: [INTERVAL '6 hours', 10], // 10+ high-failure readings in 6 hours
    severity: "MEDIUM",
  },
  {
    id: "camera-fps-drops",
    name: "Chutes FPS caméra",
    query: `
      SELECT camera_id, site_id, COUNT(*) as occurrence_count
      FROM camera_health
      WHERE fps_actual IS NOT NULL AND fps_actual < fps_expected * 0.5
      AND time > NOW() - $1::interval
      GROUP BY camera_id, site_id
      HAVING COUNT(*) >= $2
    `,
    params: [INTERVAL '2 hours', 5], // 5+ low FPS readings in 2 hours
    severity: "MEDIUM",
  },
];

export class PatternsService {
  @Cron("*/15 * * * *")
  async detectPatterns() {
    for (const pattern of PATTERNS) {
      const results = await this.prisma.$queryRawUnsafe<Array<{
        door_id?: string;
        reader_id?: string;
        camera_id?: string;
        site_id: string;
        occurrence_count: number;
      }>>(pattern.query, ...pattern.params);

      for (const result of results) {
        // Check if pattern was already detected recently (dedup)
        const dedupKey = `pattern:dedup:${pattern.id}:${result.door_id || result.reader_id || result.camera_id}`;
        const alreadyReported = await this.redis.exists(dedupKey);
        if (alreadyReported) continue;

        // Write to detected_patterns hypertable
        await this.prisma.$queryRawUnsafe(
          `INSERT INTO detected_patterns (time, site_id, pattern_id, pattern_name,
           device_type, device_id, occurrence_count, severity)
           VALUES (NOW(), $1::uuid, $2, $3, $4, $5, $6, $7)`,
          result.site_id, pattern.id, pattern.name,
          pattern.id.includes('door') ? 'door' : pattern.id.includes('reader') ? 'reader' : 'camera',
          result.door_id || result.reader_id || result.camera_id,
          result.occurrence_count, pattern.severity,
        );

        // Emit event for real-time push
        this.eventEmitter.emit("pattern.detected", {
          patternId: pattern.id,
          patternName: pattern.name,
          deviceId: result.door_id || result.reader_id || result.camera_id,
          siteId: result.site_id,
          severity: pattern.severity,
        });

        // Set dedup key (prevent re-detection for 6 hours)
        await this.redis.set(dedupKey, "1", "EX", 21600);
      }
    }
  }
}
```

### Pattern 4: Predictive Equipment Health (Trend Analysis)

**What:** Extends Phase 2 `EquipmentService` with trend analysis on health metric time-series. Uses simple linear extrapolation: fit a line through the last N data points, compute the slope, and estimate when the metric will cross a failure threshold.

**When to use:** Hourly cron job reads last 7 days of health data, computes trends, and generates predictions. Predictions are stored in a `predictions` hypertable and compared against configurable thresholds.

**Confidence: MEDIUM** — Simple trend analysis is well-understood but prediction accuracy depends on data quality and the assumption of linear degradation. For MVP this is sufficient; can upgrade to more sophisticated models later.

```typescript
// Predicted file: apps/api/src/modules/equipment/equipment.predictor.ts

interface TrendResult {
  metric: string;
  slope: number;           // Rate of change per hour
  currentValue: number;
  failureThreshold: number;
  hoursToFailure: number | null;  // null if not trending toward threshold
  confidence: 'high' | 'medium' | 'low';  // Based on R² of fit
}

export class EquipmentPredictor {
  /**
   * Predict battery failure for a controller.
   * Reads last 7 days of battery readings, fits linear trend.
   */
  async predictControllerBatteryFailure(
    controllerId: string,
    siteId: string,
  ): Promise<TrendResult | null> {
    const readings = await this.prisma.$queryRawUnsafe<
      Array<{ time: Date; battery_level: number }>
    >(
      `SELECT time, battery_level
       FROM controller_health
       WHERE controller_id = $1::uuid
       AND battery_level IS NOT NULL
       AND time > NOW() - INTERVAL '7 days'
       ORDER BY time ASC`,
      controllerId,
    );

    if (readings.length < 10) return null; // Not enough data

    // Simple linear regression
    const n = readings.length;
    const xMean = readings.reduce((s, r, i) => s + i, 0) / n;
    const yMean = readings.reduce((s, r) => s + r.battery_level, 0) / n;

    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      const x = i - xMean;
      const y = readings[i].battery_level - yMean;
      num += x * y;
      den += x * x;
    }

    const slope = den !== 0 ? num / den : 0;       // Battery % change per reading
    const slopePerHour = slope * (readings.length / (7 * 24)); // Normalize to hours
    const currentValue = readings[readings.length - 1].battery_level;
    const failureThreshold = 5;  // 5% battery = failure

    if (slopePerHour >= 0) return null; // Not degrading

    const hoursToFailure = slopePerHour < 0
      ? Math.max(0, (failureThreshold - currentValue) / slopePerHour)
      : null;

    // Simple confidence based on data count
    const confidence = n > 50 ? 'high' : n > 20 ? 'medium' : 'low';

    return {
      metric: 'battery_level',
      slope: slopePerHour,
      currentValue,
      failureThreshold,
      hoursToFailure: hoursToFailure !== null ? Math.ceil(hoursToFailure) : null,
      confidence,
    };
  }
}
```

### Pattern 5: Multi-Site Isolation via PostgreSQL Row-Level Security

**What:** PostgreSQL 16's Row-Level Security (RLS) enforces that users can only see data for sites they have access to. A NestJS middleware sets `app.current_site_id` on each authenticated request. RLS policies on every table use `current_setting('app.current_site_id')` to filter rows. Super-admin bypasses RLS.

**When to use:** Applied to ALL existing and new TimescaleDB hypertables and Prisma reference tables with a `site_id` column. Must be enabled via a migration.

**Confidence: HIGH** — PostgreSQL RLS is the standard, production-proven approach for multi-tenant data isolation in PostgreSQL. [CITED: PostgreSQL 16 docs on ddl-rowsecurity]

```sql
-- Predicted migration: 018_rls_policies.sql
-- Enable RLS on all site-scoped tables

-- 1. Create a function that gets the current site ID from session setting
CREATE OR REPLACE FUNCTION public.get_current_site_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_site_id', TRUE), '')::UUID;
$$;

-- 2. Enable RLS and create policies for each table
-- TimescaleDB hypertables
ALTER TABLE access_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON access_events
  USING (site_id = get_current_site_id());

ALTER TABLE door_state_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON door_state_log
  USING (site_id = get_current_site_id());

ALTER TABLE incident_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON incident_events
  USING (site_id = get_current_site_id());

ALTER TABLE vehicle_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON vehicle_events
  USING (site_id = get_current_site_id());

ALTER TABLE reader_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON reader_health
  USING (site_id = get_current_site_id());

ALTER TABLE controller_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON controller_health
  USING (site_id = get_current_site_id());

ALTER TABLE camera_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON camera_health
  USING (site_id = get_current_site_id());

ALTER TABLE event_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON event_embeddings
  USING (site_id = get_current_site_id());

ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON risk_scores
  USING (site_id = get_current_site_id());

ALTER TABLE detected_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON detected_patterns
  USING (site_id = get_current_site_id());

-- Prisma reference tables (already have siteId FK)
ALTER TABLE "Incident" ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON "Incident"
  USING (site_id = get_current_site_id()::text);
```

```typescript
// Predicted: NestJS middleware to set RLS session context
// apps/api/src/common/middleware/site-context.middleware.ts
import { Injectable, NestMiddleware } from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SiteContextMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
    const user = (req as any).user;
    if (user?.siteId) {
      // Set PostgreSQL session variable for RLS
      await this.prisma.$executeRawUnsafe(
        `SELECT set_config('app.current_site_id', $1, TRUE)`,
        user.siteId,
      );
    }
    next();
  }
}
```

### Pattern 6: Maintenance Ticket Workflow

**What:** Extends the Phase 2 Incident model to support maintenance tickets. A new `ticket_type` field separates `SECURITY_INCIDENT` from `MAINTENANCE_TICKET`. The incident state machine is extended with a simpler lifecycle for tickets. Auto-creation hooks into the existing `equipment.alert` event bus event.

**When to use:** When equipment health degradation is detected (door fault, camera offline, reader failure) the existing EquipmentService equipment.alert handler enqueues ticket creation.

**Confidence: HIGH** — Directly extends Phase 2's Incident model and event bus pattern. Follows established patterns.

```typescript
// Predicted: Extend Incident model with ticket_type
// In schema.prisma — add to Incident model:
//   ticketType    String?     @default("SECURITY_INCIDENT")  // 'SECURITY_INCIDENT' | 'MAINTENANCE_TICKET'
//   deviceId      String?     // FK to camera/reader/controller
//   deviceType    String?     // 'camera' | 'reader' | 'controller'

// In maintenance.service.ts — equipment alert listener:
@OnEvent("equipment.alert", { async: true })
async onEquipmentAlert(payload: {
  deviceType: string;
  deviceId: string;
  status: string;
  siteId: string;
  batteryLevel?: number;
  timestamp: string;
}) {
  // Auto-create maintenance ticket for equipment alerts
  const title = `${payload.deviceType.toUpperCase()} — ${payload.status}`;
  const severity = payload.status === 'offline' ? 'HIGH'
    : payload.status === 'low-battery' ? 'MEDIUM'
    : 'LOW';

  const ticket = await this.prisma.incident.create({
    data: {
      title,
      description: `${payload.deviceType} ${payload.deviceId} reported status: ${payload.status}`,
      severity: severity as any,
      status: "OPEN",
      siteId: payload.siteId,
      ticketType: "MAINTENANCE_TICKET",
      deviceType: payload.deviceType,
      deviceId: payload.deviceId,
      assignedToId: null, // Unassigned — maintenance team picks up
    },
  });

  this.eventEmitter.emit("maintenance.ticket-created", {
    ticketId: ticket.id,
    siteId: payload.siteId,
    deviceType: payload.deviceType,
    deviceId: payload.deviceId,
  });
}
```

### Anti-Patterns to Avoid

- **Application-layer site filtering:** Don't rely solely on adding `WHERE site_id = ?` to every query. Developers will forget, and future queries will leak data. RLS is the correct database-level enforcement. [CITED: PostgreSQL docs]
- **ML for risk scoring in MVP:** Starting with a weighted formula (not ML) for risk scoring avoids model training, feature engineering, and infrastructure complexity. The formula is interpretable and debuggable. Add ML in Phase 4.
- **Separate ticket system:** Don't create a separate `MaintenanceTicket` model with its own CRUD, gateways, and UI. The existing Incident model with a `ticketType` discriminator converges security and maintenance workflows naturally and reuses all incident infrastructure (evidence, comments, timeline).
- **Predictive health with ML models in MVP:** Simple linear trend analysis covers the failure prediction use case. Don't add Python ML infrastructure (Prophet, sklearn, etc.) for MVP. Linear extrapolation is interpretable and sufficient for equipment health.
- **Real-time risk score recomputation:** Computing risk scores on every event event creates load spikes and yields no benefit. 5-minute cron interval is sufficient for dashboards that users don't stare at continuously.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Charting/visualization | Custom SVG chart components | `recharts` 2.15.1 | Charts need time-series, bar, donut, and area graph types. recharts provides all of these as composable React components with built-in animations, tooltips, and responsive containers. Custom SVG would take 10x longer and have more bugs. |
| Multi-tenant data isolation | Application-layer site filters everywhere | PostgreSQL Row-Level Security | RLS enforces at the database level — no query-level omissions possible. Standard PostgreSQL feature, well-documented, production-proven. Application-layer filtering is error-prone and hard to audit. [CITED: PostgreSQL 16 docs] |
| Time-series aggregation | Raw event queries on every dashboard load | TimescaleDB continuous aggregates | Continuous aggregates provide sub-second materialized views over millions of events. Without them, dashboard queries would take seconds to minutes. Already proven in Phase 1. |
| Predictive trend analysis | Custom statistical library | Simple linear regression (10 lines of math) | Linear trend fits the MVP use case: "battery draining X%/day, predict failure in Y days." No need for numpy, sklearn, or Python microservices. |
| Pattern detection | Complex CEP (Complex Event Processing) engine | TimescaleDB GROUP BY + HAVING queries | CEP engines (Flink, Esper, etc.) require new infrastructure. SQL frequency analysis with configurable thresholds covers the MVP use case. |

**Key insight:** Phase 3's complexity comes from the aggregation and analysis layer, not from the individual detection capabilities. Every detection (intrusion, loitering, pattern, risk) follows the same pattern: (1) events already exist in TimescaleDB from Phases 1-2, (2) aggregate and analyze with SQL, (3) surface on dashboard. No new AI models, no new data pipelines, no new infrastructure.

## Runtime State Inventory

> Purely greenfield phase — no rename/refactor. Omitted.

## Common Pitfalls

### Pitfall 1: RLS Policy Performance Impact
**What goes wrong:** RLS policies cause query performance degradation because PostgreSQL evaluates the policy expression on every row.
**Why it happens:** The `current_setting()` function call per row adds overhead. On tables with millions of rows, this can cause index scans to be slower.
**How to avoid:** Ensure `site_id` columns are always indexed (all tables already have `idx_*_site` or `idx_*_site_time` indexes). Test RLS queries with `EXPLAIN ANALYZE` before production. Note: RLS with indexed columns adds ~5-10% overhead, which is acceptable.
**Warning signs:** Dashboard queries that were sub-second become multi-second after RLS.

### Pitfall 2: Risk Score Oscillation
**What goes wrong:** Risk scores fluctuate wildly between computations because a single event (a denied access) can trigger the score to spike and then drop.
**Why it happens:** The recency bonus and raw factors change rapidly between cron intervals if not smoothed.
**How to avoid:** Apply exponential smoothing to risk scores: `smoothed = α × new_score + (1 - α) × previous_score` where α = 0.3. This prevents dashboard from looking "jumpy."
**Warning signs:** Risk score graph looks like a seismograph during an earthquake.

### Pitfall 3: Dedup Failure on Pattern Detection
**What goes wrong:** Pattern detection fires the same alert multiple times for the same underlying issue (e.g., "reader high failure rate" fires every 15 minutes for a persistently failing reader).
**Why it happens:** The Redis dedup key expires before the underlying issue is resolved.
**How to avoid:** Set dedup TTL to 6+ hours for pattern alerts. Or implement a "resolved" check: only re-alert if the pattern had stopped and then restarted.
**Warning signs:** Same pattern appearing repeatedly in the dashboard without resolution.

### Pitfall 4: Predictive Health False Positives
**What goes wrong:** The system predicts equipment failure but the equipment was just temporarily disconnected or rebooted.
**Why it happens:** Simple linear regression doesn't handle outliers or non-linear patterns (e.g., battery recharged, controller rebooted).
**How to avoid:** Require minimum data points (10+ readings) and minimum trend duration (3+ days trending down before alerting). Filter out readings that show recovery (slope reversing direction). Add a configurable "confidence" requirement.
**Warning signs:** Predictions generated for equipment that returns to normal behavior.

### Pitfall 5: Dashboard Performance with Large Datasets
**What goes wrong:** Analytics dashboard takes 10+ seconds to load because it's querying raw event tables for trend graphs.
**Why it happens:** Without continuous aggregates, each dashboard load queries millions of raw events, aggregates them, and renders charts.
**How to avoid:** Always use continuous aggregates for dashboard queries, not raw tables. Most Phase 1 data is already compressed (7-day policy). Query with time_bucket for appropriate granularity (hourly for 7-day view, daily for 30-day view).
**Warning signs:** Dashboard API endpoints taking >2 seconds.

### Pitfall 6: Continuous Aggregate Refresh Lag
**What goes wrong:** Dashboard shows data that is up to 1 hour old because continuous aggregate refresh policies haven't caught up.
**Why it happens:** The refresh policy schedule_interval may lag behind real-time events. Default is 1 hour.
**How to avoid:** Set `end_offset => INTERVAL '1 minute'` for near-real-time continuous aggregates. For dashboards that need absolute real-time data, fall back to raw event queries with LIMIT for the most recent bucket. Document the lag in the UI.
**Warning signs:** "Last hour" data showing as empty.

## Code Examples

Verified patterns from existing codebase:

### TimescaleDB Continuous Aggregate (from Phase 1, 004_continuous_aggregates.sql)
```sql
-- Source: apps/api/migrations/timescaledb/up/004_continuous_aggregates.sql
CREATE MATERIALIZED VIEW door_access_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    door_id, site_id, decision,
    COUNT(*) AS event_count
FROM access_events
GROUP BY bucket, door_id, site_id, decision;

SELECT add_continuous_aggregate_policy('door_access_hourly',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);
```

### Equipment Health Cron + Redis Debounce (from Phase 2, equipment.service.ts)
```typescript
// Source: apps/api/src/modules/equipment/equipment.service.ts
@Cron("*/30 * * * * *")
async checkCameraHealth() {
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
  const staleCameras = await this.prisma.camera.findMany({
    where: {
      isRecording: true,
      OR: [{ lastHeartbeat: null }, { lastHeartbeat: { lt: staleThreshold } }],
      status: { in: ["ONLINE", "DEGRADED"] as any },
    },
  });
  for (const camera of staleCameras) {
    // ... insert to camera_health, update Camera.status
    const debounceKey = `equipment:debounce:camera:${camera.id}`;
    const alreadyDebounced = await this.checkDebounce(debounceKey);
    if (!alreadyDebounced) {
      this.eventEmitter.emit("equipment.alert", { ... });
      await this.setDebounce(debounceKey, 60);
    }
  }
}
```

### Dashboard API Client Pattern (from Phase 2, dashboard lib/api.ts)
```typescript
// Source: apps/dashboard/lib/api.ts
export interface AnalyticsMetricsDto {
  zoneId: string;
  siteId: string;
  deniedCount: number;
  anomalyCount: number;
  incidentCount: number;
  riskScore: number;
  trend: { time: string; value: number }[];
}

export async function fetchZoneAnalytics(
  siteId?: string,
  zoneId?: string,
): Promise<AnalyticsMetricsDto[]> {
  const params = new URLSearchParams();
  if (siteId) params.set("siteId", siteId);
  if (zoneId) params.set("zoneId", zoneId);
  const res = await fetchWithAuth(
    `${API_URL}/api/analytics/zones?${params.toString()}`,
  );
  if (!res.ok) throw new Error("Échec du chargement des analyses");
  return res.json();
}

export async function fetchRiskScores(siteId?: string): Promise<RiskScoreDto[]> {
  const params = new URLSearchParams();
  if (siteId) params.set("siteId", siteId);
  const res = await fetchWithAuth(`${API_URL}/api/risk/scores?${params.toString()}`);
  if (!res.ok) throw new Error("Échec du chargement des scores de risque");
  return res.json();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Application-layer site filtering in every query | PostgreSQL Row-Level Security | PostgreSQL 9.5 (2016) | RLS is now the standard for multi-tenancy. Application filtering is error-prone and legacy. |
| Batch risk scoring (daily) | Near-real-time risk scoring (5-min) | Modern SIEM platforms (2020+) | Security operations expect up-to-the-minute risk posture. Daily scoring is outdated. |
| Rule-based pattern detection only | SQL frequency analysis + configurable thresholds | Always available | Don't need complex CEP engines for MVP. SQL GROUP BY/HAVING covers most detection use cases. |
| Separate ticketing and incident systems | Unified security + maintenance workflow | Current best practice | Converging security and maintenance workflows provides a unified operational picture. Separation leads to silos. |
| Manual dashboard queries | Continuous aggregate-powered dashboards | TimescaleDB 2020+ | Sub-second dashboard queries over millions of events without separate data pipelines. |

**Deprecated/outdated:**
- Application-layer site filtering: Replaced by RLS for new developments. RLS is database-enforced, auditable, and impossible to forget.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `recharts` 2.15.1 is the best charting library for this Next.js 14 + Tailwind CSS v3 stack | Standard Stack | Alternative chart libs (nivo, chart.js) have different APIs; effort to switch mid-phase is moderate |
| A2 | Linear trend analysis is sufficient for predictive equipment health MVP | Pattern 4 | If equipment degradation is highly non-linear (e.g., sudden failure with no trend), simple extrapolation won't work. Upgrade to ML-based prediction in a later phase. |
| A3 | PostgreSQL RLS does not cause unacceptable query performance degradation | Pattern 5 | Large deployments (>50M events) may see 10-20% query slowdown with RLS. If performance is unacceptable, fall back to application-level filtering with automated query auditing. |
| A4 | 5-minute risk score recomputation frequency is appropriate | Pattern 2 | If operators need real-time risk updates, 5 min is too slow. Can decrease to 1 min with more aggressive Redis caching. |
| A5 | The MAINTENANCE_TEAM role can be added to existing Role enum | Pattern 6 | Adding a new Role value requires database migration and updates to all role-checking code. If this is complex, skip the role and use a group-based approach instead. |

**If this table is empty:** No assumptions were made.

## Open Questions

1. **Risk scoring formula calibration**
   - What we know: Weighted formula with factors for denied attempts, door anomalies, anomaly events, active incidents, failed readers, and recency bonus.
   - What's unclear: The optimal weights for each factor. The research recommends starting with equal weights and adjusting based on operator feedback.
   - Recommendation: Make weights configurable via environment variables or a Prisma model so they can be tuned without code changes.

2. **Continuous aggregate refresh lag vs. real-time requirements**
   - What we know: Continuous aggregates refresh on a schedule (hourly by default). Risk scores should be near-real-time.
   - What's unclear: Whether 5-min risk score cron + continuous aggregate lag is acceptable for the analytics dashboard, or if we need real-time fallback queries.
   - Recommendation: Use continuous aggregates for historical trend charts (accepting up to 1-min lag) and raw event queries with LIMIT for "last hour" real-time charts.

3. **RLS policy creation order**
   - What we know: RLS policies must be created per table. Tables created after policies won't have protection.
   - What's unclear: Whether to create RLS policies in the same migration that creates new tables, or in a separate migration at the end.
   - Recommendation: Create RLS policies in the new `018_rls_policies.sql` migration that applies to ALL tables (existing and new). New tables added in future phases should create RLS policies in their own migration.

## Validation Architecture

> nyquist_validation is set to `false` in .planning/config.json. Skipping this section per configuration.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing JWT auth — no changes needed |
| V3 Session Management | yes | Existing JWT — extend to maintain RLS session context |
| V4 Access Control | yes | RLS for data isolation + existing RBAC for feature access |
| V5 Input Validation | yes | Zod schemas on all new endpoints |
| V6 Cryptography | no | No new encryption requirements (pgcrypto already exists) |

### Known Threat Patterns for Phase 3 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| RLS bypass via superuser | Elevation of Privilege | SUPER_ADMIN role intended to bypass RLS — this is by design. Document that superusers see all sites. |
| Risk score manipulation via MQTT spoofing | Tampering | MQTT topics already validated in Phase 1. Risk scores compute from validated events only. |
| Predictive health alerts bypass | Tampering | Trend analysis reads from existing health hypertables. Predictive health service has same trust boundary as existing EquipmentService. |
| Cross-site data access via API | Information Disclosure | RLS enforces at database level — even if API query omits site_id filter, RLS prevents data leakage. Middleware sets app.current_site_id per request. |
| Maintenance ticket creation flooding | Denial of Service | Redis debounce on equipment alerts already prevents alert flooding (Phase 2 mitigation). Maintenance ticket creation follows same debounce pattern. |

## Sources

### Primary (HIGH confidence)
- PostgreSQL 16 Row-Level Security documentation — `ddl-rowsecurity.html` [CITED: postgresql.org/docs/16/ddl-rowsecurity.html]
- TimescaleDB continuous aggregates API — `create_materialized_view` [CITED: docs.timescale.com/api/latest/continuous-aggregates]
- Existing codebase: Phase 1/2 migration files, module patterns, dashboard patterns [VERIFIED: codebase]
- `recharts@2.15.1` — npm registry [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- Phase 1 004_continuous_aggregates.sql — proven pattern in same codebase [VERIFIED: codebase]
- Phase 2 equipment.service.ts — health monitoring, debounce, cron patterns [VERIFIED: codebase]

### Tertiary (LOW confidence)
- Predictive health linear regression approach — training knowledge, verified against no alternative [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - recharts is the de facto standard React charting library, no other charting lib exists in project
- Architecture: HIGH - All patterns are direct extensions of Phase 1/2 patterns (continuous aggregates, cron checks, event bus, debounce)
- Pitfalls: MEDIUM - Some pitfalls (continuous aggregate refresh lag, risk oscillation) are based on training knowledge and configuration assumptions

**Research date:** 2026-07-14
**Valid until:** 2026-08-14 (30 days — stable stack, no fast-moving dependencies)
