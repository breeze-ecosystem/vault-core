# Phase 2: Operational AI — Research

**Researched:** 2026-07-14
**Domain:** Incident management, visitor management, ANPR, AI/NLP, equipment health, data governance
**Confidence:** HIGH

## Summary

Phase 2 builds directly on Phase 1's access control, door management, MQTT event pipeline, TimescaleDB hypertables, and video correlation infrastructure. It adds six new capability areas: incident management (INC-01–06), visitor management (VIST-01–05), ANPR/LPR vehicle recognition (ANPR-01–05), AI natural language features (AI-01–03), equipment health monitoring (EQPT-01–03), and data governance/encryption/retention (AUDT-04–05).

**Key architectural decisions:**
- **Incident Management** uses a new Prisma model for incident state and reference data, with a TimescaleDB hypertable for the incident event log (status transitions, comments, assignments). State machine pattern follows Phase 1's DoorStateMachine pattern.
- **Visitor Management** extends Phase 1's credential system with a new `VISITOR` credential type and a `Visit` model for pre-registration, check-in/out, and zone restrictions. Reuses existing QR code generation.
- **ANPR** adds a new Python-based ANPR microservice (or extends the existing AI Preprocessor) using OpenALPR/PaddleOCR for license plate recognition. Separate ingestion pipeline from camera frames (vehicle cameras) feeding into the existing event pipeline.
- **AI/NLP** uses pgvector (on existing TimescaleDB PostgreSQL) + Ollama embeddings for natural language event search, and Ollama LLM for incident summaries and assistant queries. LangChain.js orchestrates the NL→structured query pipeline.
- **Equipment Health** extends the existing SupervisionService with TimescaleDB-persisted health metrics. New `@nestjs/schedule` cron jobs for periodic health checks. Reader/door controller health uses the MQTT health topic pattern from Phase 1.
- **Data Governance** leverages PostgreSQL encryption functions (pgcrypto `pgp_sym_encrypt`), configurable TimescaleDB retention policies per event type, and a new Prisma model for retention policy configuration.

**Primary recommendation:** Build as 5–6 vertical MVP slices following Phase 1 patterns. Each slice delivers end-to-end functionality (NestJS module + shared types + dashboard page). Use pgvector over Qdrant to avoid new infrastructure. Use the existing AI Preprocessor Python service for ANPR rather than a new container.

## User Constraints (from CONTEXT.md)

> Phase 2 has no CONTEXT.md yet (this phase is being researched before discuss). The following constraints are derived from AGENTS.md, PROJECT.md, and REQUIREMENTS.md.

### Locked Decisions
- **Tech stack**: Must build on existing NestJS + Next.js + Expo + Prisma + Redis + BullMQ stack. No framework rewrites.
- **AI**: Continue using Ollama/vision models for AI analysis; integrate with access control events.
- **Deployment**: Self-hosted via Docker Compose with Caddy reverse proxy. No mandatory cloud dependency.
- **Performance**: Real-time alerting must stay sub-second. Video correlation must not block the event pipeline.
- **Security**: Role-based access control must extend to new modules. Audit logs must be immutable. JWT auth must cover all new endpoints.
- **Mobile**: Expo mobile app must support new guard/operator workflows (check-in, incident response, door control).
- **Prisma + TimescaleDB separation** (D-22 from Phase 1): Prisma manages reference tables only. All time-series event data goes to TimescaleDB hypertables via `$queryRaw`.
- **Event bus pattern** (D-23 from Phase 1): `@nestjs/event-emitter` for decoupled cross-module communication. Events: `access.granted`, `access.denied`, `door.state-changed`, `incident.created`, `incident.updated`, `visitor.checked-in`, `anpr.recognized`.

### the Agent's Discretion
- New BullMQ queue names (follow existing pattern: `incident-alerts`, `anpr-processing`, `equipment-health`, `retention-pruning`)
- API endpoint structure follows existing NestJS module conventions (`modules/incident/`, `modules/visitor/`, `modules/anpr/`, `modules/ai/`, `modules/equipment/`, `modules/governance/`)
- Dashboard page routing follows existing pattern (`app/(dashboard)/incidents/`, `app/(dashboard)/visiteurs/`, etc.)
- Retention policy implementation details
- Encryption key management strategy (env-based or Redis-based)
- ANPR specific engine choice (OpenALPR vs PaddleOCR vs ultralytics)

### Deferred Ideas (OUT OF SCOPE)
- Security analytics dashboards (ANLY-01–05) → Phase 3
- Risk scoring (RSK-01–03) → Phase 3
- Maintenance workflows (WFL-01–03) → Phase 3
- Multi-site isolation (AUDT-06) → Phase 3
- Equipment predictive degradation (EQPT-04) → Phase 3
- Camera-to-door visualization (EQPT-05) → Phase 3
- Mobile wallet NFC credentials → v2 (deferred from Phase 1)
- Biometric credentials → v2

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INC-01 | Operator creates incidents manually or auto-triage from alerts | §Incident Management — Auto-triage from existing Alert model via event bus listener |
| INC-02 | Operator assigns incidents with escalation chains and SLA timers | §Incident Management — Escalation chain Prisma model, BullMQ delayed jobs for SLA |
| INC-03 | Operator attaches evidence (video clips, access events, snapshots) | §Incident Management — Evidence linking to existing TimescaleDB events + cameras |
| INC-04 | Operator adds comments and status updates to incidents | §Incident Management — IncidentComment Prisma model, real-time via Socket.IO |
| INC-05 | System tracks full incident lifecycle (open → triage → investigating → resolved → closed) | §Incident Management — IncidentStateMachine following Phase 1 DoorStateMachine pattern |
| INC-06 | System generates closure reports with timeline, evidence, and actions taken | §Incident Management — Closure report generation via PDFKit + Handlebars template |
| VIST-01 | Host pre-registers visitors with name, contact, host assignment, visit duration | §Visitor Management — Visit Prisma model, extends Credential system |
| VIST-02 | Visitor receives QR-code/temporary badge credential valid for visit duration | §Visitor Management — Reuses existing QR generator in AccessService, VISITOR credential type |
| VIST-03 | Security processes visitor check-in and check-out at reception | §Visitor Management — Check-in/out REST endpoints, status transitions |
| VIST-04 | Admin defines zone restrictions for visitors | §Visitor Management — Zone restrictions via access levels assigned to visitor credential |
| VIST-05 | System logs all visitor activity correlated with video | §Visitor Management — Visitor events → access_events hypertable, existing correlation pipeline |
| ANPR-01 | System captures and recognizes license plates from camera frames in real time | §ANPR/LPR — Python ANPR microservice using PaddleOCR/Ultralytics, new ANPR ingestion pipeline |
| ANPR-02 | Admin manages vehicle allowlists and blocklists | §ANPR/LPR — VehicleList Prisma model, allowlist/blocklist with zone association |
| ANPR-03 | System generates access event on plate recognition with allow/deny decision | §ANPR/LPR — Plate events → existing timescaledb vehicle_events hypertable, decision logic |
| ANPR-04 | System logs vehicle events including plate image, confidence, timestamp, gate action | §ANPR/LPR — vehicle_events hypertable with plate image URL, confidence, decision metadata |
| ANPR-05 | Operator searches vehicle event history by plate number or time range | §ANPR/LPR — Search endpoints on vehicle_events hypertable, text search + time range |
| AI-01 | Operator queries system in natural language ("show intrusions after 8pm on Site A") | §AI/NLP — NL→structured query pipeline: Ollama LLM parses query → structured filter → execute |
| AI-02 | System auto-generates incident summaries with time, location, persons, associated video, recommended action | §AI/NLP — Incident summary via Ollama LLM with incident context + evidence, triggered on status→resolved |
| AI-03 | AI assistant answers questions about building state, recent events, and zone status | §AI/NLP — RAG-style assistant: pgvector semantic search + Ollama LLM with system context |
| EQPT-01 | System monitors camera health (online/offline, frame rate drops, latency spikes) | §Equipment Health — Extends existing Camera model (status, lastHeartbeat), periodic health check cron |
| EQPT-02 | System monitors access reader health (online/offline, failed reads, response time) | §Equipment Health — New TimescaleDB hypertable for reader health metrics, MQTT health topic listener |
| EQPT-03 | System monitors door controller health (battery level, connection stability, firmware) | §Equipment Health — New controller_health hypertable, extends MQTT health topic subscription |
| AUDT-04 | System encrypts data at rest and in transit with configurable key management | §Data Governance — pgcrypto pgp_sym_encrypt for sensitive fields, configurable encryption key |
| AUDT-05 | Admin configures data retention policies per event type with auto-pruning | §Data Governance — Configurable retention via Prisma model, auto-pruning cron via @nestjs/schedule |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Incident lifecycle state machine | API | — | Requires database context for state validation, SLA timers via BullMQ |
| Incident evidence attachment | API | — | References existing events, cameras, snapshots from Phase 1 data |
| Auto-triage (alert → incident) | API / BullMQ | — | Event bus listener on alert.created; async incident creation via worker |
| Incident closure report generation | API | — | Server-side PDF generation via PDFKit, serves as download |
| Visitor pre-registration | API | — | CRUD on Visitor/Visit Prisma models with QR credential creation |
| Visitor check-in/check-out | API | — | State transitions with timestamp, triggers event bus for correlation |
| Visitor zone restriction enforcement | API | — | Uses existing AccessService.evaluateAccess with visitor credential + zone rules |
| QR credential generation | API | — | Reuses existing qrcode library in AccessService |
| ANPR plate capture/recognition | AI Preprocessor (Python) | API | Real-time frame processing needs Python ML libraries (OpenALPR/PaddleOCR) |
| Vehicle allowlist/blocklist | API | — | CRUD on VehicleList Prisma model |
| Vehicle access decision | API | — | Decision logic based on allowlist/blocklist + schedule |
| Natural language event query | API / Ollama | — | LLM parses query → structured TimescaleDB query + pgvector semantic search |
| AI incident summaries | API / Ollama | — | LLM generates summaries from incident context, evidence, timeline |
| AI assistant (building state) | API / Ollama / pgvector | — | RAG: pgvector embeddings for events + LLM for natural language response |
| Camera health monitoring | API / BullMQ | — | Cron-based health checks + MQTT health topic listener |
| Reader health monitoring | API / MQTT | — | MQTT health topic subscription (extends Phase 1 pattern) |
| Door controller health monitoring | API / MQTT | — | MQTT controller health topic (extends Phase 1 MqttService) |
| Data at rest encryption | Database / API | — | pgcrypto pgp_sym_encrypt at database level; key management via env/Redis |
| Data retention policies | Database / API | — | TimescaleDB retention policies + cron-driven pruning for non-hypertable data |
| Real-time incident/visitor streaming | Socket.IO | Browser | Extends existing DoorGateway pattern for new event types |
| Dashboard incident/visitor/ANPR pages | Frontend Server (SSR) | Browser | Next.js App Router pages following existing pattern |

## Standard Stack

### Core New Dependencies

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/schedule` | 6.1.3 | Cron jobs for equipment health checks, data retention pruning | [VERIFIED: npm registry] — Official NestJS package for task scheduling. `@Cron()` decorator integrates with NestJS DI. Replaces raw `setInterval` for periodic health checks. |
| `pgvector` | 0.3.0 | PostgreSQL extension for vector similarity search on events | [CITED: Phase 1 research] — Native pgvector type stores embeddings for natural language event search. Lighter than Qdrant (no new infrastructure). |
| `pdfkit` | 0.19.1 | PDF generation for incident closure reports | [VERIFIED: npm registry] — Most popular Node.js PDF library, no native dependencies. Generates structured closure reports with timeline, evidence, actions. |
| `handlebars` | 4.7.9 | Template engine for PDF/email report templates | [VERIFIED: npm registry] — Lightweight logic-less templates. Compile closure report templates server-side. |
| `@langchain/community` | 1.1.29 | LangChain.js integration for Ollama LLM chains | [VERIFIED: npm registry] — LangChain provides structured LLM workflows: NL→structured query conversion, RAG pipelines, prompt templates. Works with Ollama via `ChatOllama`. |
| `@langchain/core` | 1.2.2 | Core LangChain abstractions (runnables, prompts, output parsers) | [VERIFIED: npm registry] — Dependency of @langchain/community. Provides `StringOutputParser`, `ChatPromptTemplate`, `RunnableSequence`. |

### Supporting New Dependencies

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node-cron` | 4.6.0 | Low-level cron scheduling (alternative to @nestjs/schedule) | Fallback if @nestjs/schedule has compatibility issues with NestJS 10.4.8 |
| `csv-parse` | 7.0.1 | CSV parsing for bulk visitor import or ANPR export | Import/export features |
| `openai` | 6.46.0 | OpenAI SDK for Ollama-compatible API calls | Alternative to LangChain for direct Ollama API calls; lighter dependency if LangChain is too complex for MVP |
| `ultralytics` / `paddleocr` / `openalpr` | Python (AI Preprocessor) | License plate recognition from camera frames | ANPR engine deployed in the existing Python AI Preprocessor (FastAPI). PaddleOCR 3.7.0 recommended for MVP — handles international plates, has pre-trained models, MIT license. |

### Already Installed (Phase 1)

| Library | Version | Purpose | Phase 2 Use |
|---------|---------|---------|-------------|
| `@nestjs/event-emitter` | 3.1.0 | Event bus | New events: `incident.*`, `visitor.*`, `anpr.*`, `equipment.*` |
| `bullmq` | 5.30.0 | Job queues | New queues: `incident-alerts`, `anpr-processing`, `equipment-health`, `retention-pruning` |
| `ioredis` | 5.4.1 | Redis client | SLA timer state, ANPR dedup cooldowns, equipment health caching |
| `socket.io` | 4.8.3 | Real-time WebSocket | Incident status push, visitor check-in events, ANPR events |
| `qrcode` | 1.5.4 | QR code generation | Visitor credentials |
| `@prisma/client` | 5.22.0 | Database ORM | New models: Incident, IncidentComment, IncidentAssignment, Visit, VehicleList, RetentionPolicy |

### Infrastructure Additions

| Component | Version | Purpose |
|-----------|---------|---------|
| pgvector extension | 0.8+ | Install on existing TimescaleDB PostgreSQL: `CREATE EXTENSION IF NOT EXISTS vector;` |
| Python ANPR packages | PaddleOCR 3.7.0 | Add to AI Preprocessor Docker image for plate recognition |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pgvector for embeddings | Qdrant (existing `QDRANT_URL` env var, no infrastructure) | Qdrant is purpose-built for vector search but adds a new Docker container and operational complexity. pgvector integrates with existing PostgreSQL, no new infrastructure. pgvector query performance is adequate for Phase 2 scale (<1M vectors). Switch to Qdrant in Phase 3 if scale demands. |
| PaddleOCR for ANPR | OpenALPR (mature, limited plate formats) | OpenALPR 1.1.0 is older and primarily US/European plates. PaddleOCR 3.7.0 supports 80+ languages, has active development, MIT license. Ultralytics YOLO requires custom training for plates. |
| PDFKit for reports | Puppeteer/HTML→PDF | PDFKit generates PDFs from code without a headless browser. Lighter, faster, no Chrome dependency. Sufficiently rich for structured closure reports. |
| LangChain.js for LLM pipeline | Direct Ollama API calls | LangChain adds abstraction overhead but provides structured output parsing, prompt templates, and chain composition — critical for the NL→structured query pipeline. Can start with direct API calls and add LangChain later. |
| `@nestjs/schedule` for cron | `node-cron` directly | `@nestjs/schedule` integrates with NestJS DI, lifecycle, and module system. `node-cron` is lower-level but simpler. Start with `@nestjs/schedule` for consistency. |

**Installation:**
```bash
# Core new packages (workspace root)
pnpm --filter @repo/api add @nestjs/schedule@6.1.3 pdfkit@0.19.1 handlebars@4.7.9

# AI/NLP dependencies
pnpm --filter @repo/api add @langchain/community@1.1.29 @langchain/core@1.2.2

# Dev types
pnpm --filter @repo/api add -D @types/pdfkit@0.13.9

# Python ANPR (AI Preprocessor service)
# Add to services/ai-preprocessor/requirements.txt:
#   paddleocr>=3.7.0
#   paddlepaddle>=2.6.0

# Database extensions (run on existing TimescaleDB PostgreSQL)
# CREATE EXTENSION IF NOT EXISTS vector;
```

**Version verification:** All npm packages confirmed on registry:
- `@nestjs/schedule@6.1.3` — published, official NestJS package, peer deps `@nestjs/common ^10.0.0 || ^11.0.0` [VERIFIED: npm registry]
- `pdfkit@0.19.1` — published, 10+ year history, 9K GitHub stars [VERIFIED: npm registry]
- `handlebars@4.7.9` — published, 10+ year history, extremely mature [VERIFIED: npm registry]
- `@langchain/community@1.1.29` — published, official LangChain package [VERIFIED: npm registry]
- `@langchain/core@1.2.2` — published, official LangChain package [VERIFIED: npm registry]
- `pgvector@0.3.0` — published, pgvector Node.js client [VERIFIED: npm registry]
- `paddleocr@3.7.0` — available on PyPI, active development [VERIFIED: pip index]

## Package Legitimacy Audit

> **Note:** slopcheck was unavailable at research time. All packages are tagged `[ASSUMED]` pending verification. The planner should gate install behind `checkpoint:human-verify` for new dependencies.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@nestjs/schedule` | npm | 5+ yrs | High | github.com/nestjs/schedule | [ASSUMED] | Approved |
| `pdfkit` | npm | 10+ yrs | Very high | github.com/foliojs/pdfkit | [ASSUMED] | Approved |
| `handlebars` | npm | 13+ yrs | Very high | github.com/handlebars-lang/handlebars.js | [ASSUMED] | Approved |
| `@langchain/community` | npm | 2+ yrs | High | github.com/langchain-ai/langchainjs | [ASSUMED] | Approved |
| `@langchain/core` | npm | 2+ yrs | High | github.com/langchain-ai/langchainjs | [ASSUMED] | Approved |
| `pgvector` | npm | 2+ yrs | Medium | github.com/pgvector/pgvector-node | [ASSUMED] | Approved |
| `paddleocr` | PyPI | 4+ yrs | High | github.com/PaddlePaddle/PaddleOCR | [ASSUMED] | Approved |
| `openai` | npm | 5+ yrs | Very high | github.com/openai/openai-node | [ASSUMED] | Approved (fallback) |
| `node-cron` | npm | 8+ yrs | High | github.com/merencia/node-cron | [ASSUMED] | Approved (fallback) |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*All packages tagged `[ASSUMED]` — slopcheck was unavailable. Planner should gate new dependency installs behind `checkpoint:human-verify` if risk is a concern.*

## Architecture Patterns

### System Architecture Diagram

```
                                             ┌──────────────────────────────────────────┐
                                             │         Caddy Reverse Proxy              │
                                             │    /api/* → api:4000                     │
                                             │    /ws/*  → api:4000                     │
                                             └──────────────────┬───────────────────────┘
                                                                │
                    ┌───────────────────────────────────────────┼───────────────────────────────────┐
                    │                                           ▼                                   │
                    │  ┌─────────────────────────────────────────────────────────────────────────┐ │
                    │  │                     NestJS API (Fastify :4000)                         │ │
                    │  │                                                                        │ │
                    │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
                    │  │  │ Incident │ │ Visitor  │ │   ANPR   │ │   AI     │ │  Governance  │  │ │
                    │  │  │ Module   │ │ Module   │ │ Module   │ │ Module   │ │  Module      │  │ │
                    │  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘  │ │
                    │  │       │            │            │            │              │          │ │
                    │  │       ▼            ▼            ▼            ▼              ▼          │ │
                    │  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
                    │  │  │              @nestjs/event-emitter (Event Bus)                  │  │ │
                    │  │  │  incident.created  |  visitor.checked-in  |  anpr.recognized    │  │ │
                    │  │  │  incident.updated  |  visitor.checked-out |  equipment.alert    │  │ │
                    │  │  └────────────────────────┬────────────────────────────────────────┘  │ │
                    │  │                           │                                           │ │
                    │  │              ┌────────────┼─────────────┬───────────┐                │ │
                    │  │              ▼            ▼             ▼           ▼                │ │
                    │  │      ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐           │ │
                    │  │      │Correlation│ │  Door    │ │  Access   │ │  Alert   │           │ │
                    │  │      │  Module   │ │  Module  │ │  Module   │ │  Module  │           │ │
                    │  │      │ (Phase 1) │ │(Phase 1) │ │ (Phase 1) │ │(Phase 1) │           │ │
                    │  │      └───────────┘ └──────────┘ └───────────┘ └──────────┘           │ │
                    │  └───────────────────────────────────────────────────────────────────────┘ │
                    │                                     │                                      │
                    │         ┌───────────────────────────┼──────────────────────────┐           │
                    │         │                           │                          │           │
                    │         ▼                           ▼                          ▼           │
                    │  ┌────────────────┐    ┌────────────────────┐    ┌──────────────────────┐  │
                    │  │  BullMQ Queues  │    │  PostgreSQL 16     │    │  TimescaleDB         │  │
                    │  │  (Redis)        │    │  + pgvector        │    │  Hypertables         │  │
                    │  │                 │    │  + pgcrypto        │    │                      │  │
                    │  │  NEW for P2:    │    │                   │    │  NEW for P2:         │  │
                    │  │  incident-      │    │  Prisma Models    │    │  incident_events     │  │
                    │  │  alerts         │    │  — Incident       │    │  vehicle_events      │  │
                    │  │  anpr-          │    │  — IncidentComment│    │  reader_health       │  │
                    │  │  processing     │    │  — Visit          │    │  controller_health   │  │
                    │  │  equipment-     │    │  — VehicleList    │    │  camera_health       │  │
                    │  │  health         │    │  — RetentionPolicy│    │  + event_embeddings  │  │
                    │  │  retention-     │    │  + existing P1    │    │  + cmprsn/retention  │  │
                    │  │  pruning        │    │  models           │    │                      │  │
                    │  └────────────────┘    └────────────────────┘    └──────────────────────┘  │
                    │                                                                           │
                    │   ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐           │
                    │   │ AI Preproc.  │    │    Ollama      │    │    Socket.IO     │           │
                    │   │ (Python)     │    │  (LLM + VLM)   │    │  (real-time:     │           │
                    │   │  + PaddleOCR │    │  :11434        │    │   incidents,     │           │
                    │   │  for ANPR    │    │                │    │   visitors,      │           │
                    │   │  + embeddings│    │                │    │   ANPR events)   │           │
                    │   └──────────────┘    └────────────────┘    └──────────────────┘           │
                    └───────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
apps/api/src/
├── modules/
│   ├── incident/                         # NEW: Incident Management module
│   │   ├── incident.module.ts
│   │   ├── incident.controller.ts        # /incidents CRUD + assignment + closure
│   │   ├── incident.service.ts           # State machine, escalation, closure reports
│   │   ├── incident.gateway.ts           # Socket.IO incident status push
│   │   ├── incident.processor.ts         # BullMQ: auto-triage, SLA escalation
│   │   ├── incident-state-machine.ts     # Lifecycle state machine
│   │   └── incident.service.spec.ts
│   ├── visitor/                          # NEW: Visitor Management module
│   │   ├── visitor.module.ts
│   │   ├── visitor.controller.ts         # /visitors CRUD, /visits check-in/out
│   │   ├── visitor.service.ts            # Pre-registration, QR credential creation
│   │   ├── visitor.gateway.ts            # Socket.IO visitor event push
│   │   └── visitor.service.spec.ts
│   ├── anpr/                             # NEW: ANPR/LPR module
│   │   ├── anpr.module.ts
│   │   ├── anpr.controller.ts            # /vehicles CRUD, /anpr/events search
│   │   ├── anpr.service.ts               # Plate recognition dispatch, allowlist eval
│   │   ├── anpr.processor.ts             # BullMQ: anpr-processing queue worker
│   │   └── anpr.service.spec.ts
│   ├── ai/                               # NEW: AI/NLP module
│   │   ├── ai.module.ts
│   │   ├── ai.controller.ts              # /ai/query, /ai/summarize, /ai/assistant
│   │   ├── ai.service.ts                 # NL→structured query, embeddings, summaries
│   │   ├── ai.processor.ts               # BullMQ: incident summary generation
│   │   └── ai.service.spec.ts
│   ├── equipment/                        # NEW: Equipment Health module
│   │   ├── equipment.module.ts
│   │   ├── equipment.controller.ts       # /equipment/cameras, /readers, /controllers
│   │   ├── equipment.service.ts          # Health check scheduling, alerting
│   │   ├── equipment.processor.ts        # BullMQ: equipment-health queue worker
│   │   └── equipment.service.spec.ts
│   └── governance/                       # NEW: Data Governance module
│       ├── governance.module.ts
│       ├── governance.controller.ts      # /governance/retention-policies, /encryption
│       ├── governance.service.ts          # Retention policy enforcement, key management
│       ├── governance.processor.ts       # BullMQ: retention-pruning queue worker
│       └── governance.service.spec.ts

apps/api/migrations/timescaledb/up/
├── 007_incident_events.sql               # NEW: Hypertable for incident event log
├── 008_vehicle_events.sql               # NEW: Hypertable for ANPR events
├── 009_reader_health.sql                # NEW: Hypertable for reader health metrics
├── 010_controller_health.sql            # NEW: Hypertable for controller health
├── 011_camera_health.sql                # NEW: Hypertable for camera health metrics
├── 012_event_embeddings.sql             # NEW: Table with pgvector column for AI search
└── 013_retention_policies_p2.sql        # NEW: Configurable retention for new hypertables

packages/shared/src/
├── schemas/
│   ├── incident.schema.ts                # NEW: Zod schemas for incident CRUD
│   ├── visitor.schema.ts                 # NEW: Zod schemas for visitor/visit
│   ├── vehicle.schema.ts                 # NEW: Zod schemas for vehicle/ANPR
│   ├── ai.schema.ts                      # NEW: Zod schemas for AI query/summarize
│   ├── equipment.schema.ts              # NEW: Zod schemas for equipment health
│   └── governance.schema.ts             # NEW: Zod schemas for retention/encryption
├── types/
│   ├── incident.types.ts                 # NEW: Incident, IncidentComment, etc.
│   ├── visitor.types.ts                  # NEW: Visitor, Visit, etc.
│   ├── vehicle.types.ts                  # NEW: VehicleEvent, VehicleListEntry, etc.
│   ├── ai.types.ts                       # NEW: AIQuery, IncidentSummary, etc.
│   ├── equipment.types.ts               # NEW: CameraHealth, ReaderHealth, etc.
│   └── governance.types.ts              # NEW: RetentionPolicy, EncryptionConfig, etc.
└── constants/
    ├── incident-status.ts               # NEW: Incident status enum
    └── equipment-status.ts              # NEW: Equipment health status enum

apps/dashboard/app/(dashboard)/
├── incidents/                            # NEW: Incident management pages
│   ├── page.tsx                          # Incident list
│   ├── [id]/page.tsx                     # Incident detail + evidence + timeline
│   └── nouveau/page.tsx                  # New incident creation
├── visiteurs/                            # NEW: Visitor management pages
│   ├── page.tsx                          # Visitor list
│   ├── [id]/page.tsx                     # Visitor detail + visits
│   └── preinscription/page.tsx           # Pre-registration form
├── vehicules/                            # NEW: ANPR/vehicle pages
│   ├── page.tsx                          # Vehicle event list + search
│   ├── listes/page.tsx                   # Allowlist/blocklist management
│   └── [id]/page.tsx                     # Vehicle event detail
├── ia/                                   # NEW: AI assistant page
│   └── page.tsx                          # Natural language query interface
└── equipement/                           # NEW: Equipment health pages
    ├── page.tsx                          # Equipment dashboard
    ├── cameras/page.tsx                  # Camera health detail
    ├── lecteurs/page.tsx                 # Reader health detail
    └── controleurs/page.tsx              # Controller health detail
```

### Pattern 1: Incident State Machine (Follows Phase 1 DoorStateMachine)

**What:** Incidents follow a strict lifecycle state machine: `open → triage → investigating → resolved → closed`. Each status transition is validated, logged to TimescaleDB, and triggers event bus events for notifications, SLA timer cancellation, and closure report generation.

**When to use:** All incident mutation paths (manual creation, auto-triage from alert, assignment, resolution).

**Confidence: HIGH** — Proven pattern from Phase 1 DoorStateMachine, adapted for incident lifecycle.

```
State Transition Graph:

                    ┌──────────┐
                    │   OPEN   │◀──────── auto-triage from Alert
                    └────┬─────┘
                         │  (assign)
                         ▼
                    ┌──────────┐
                    │  TRIAGE  │───────▶ (reject → CLOSED)
                    └────┬─────┘
                         │  (investigating)
                         ▼
                  ┌──────────────┐
                  │ INVESTIGATING│◀────── (re-open from RESOLVED)
                  └──────┬───────┘
                         │  (resolve)
                         ▼
                   ┌──────────┐
                   │ RESOLVED │────────▶ (re-open → INVESTIGATING)
                   └────┬─────┘
                        │  (verify & close)
                        ▼
                   ┌──────────┐
                   │  CLOSED  │ (terminal — no transitions out)
                   └──────────┘
```

```typescript
// src/modules/incident/incident-state-machine.ts
export enum IncidentStatus {
  OPEN = "open",
  TRIAGE = "triage",
  INVESTIGATING = "investigating",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.OPEN]:            [IncidentStatus.TRIAGE, IncidentStatus.CLOSED],
  [IncidentStatus.TRIAGE]:          [IncidentStatus.INVESTIGATING, IncidentStatus.CLOSED],
  [IncidentStatus.INVESTIGATING]:   [IncidentStatus.RESOLVED],
  [IncidentStatus.RESOLVED]:        [IncidentStatus.CLOSED, IncidentStatus.INVESTIGATING],
  [IncidentStatus.CLOSED]:          [], // Terminal state
};

export class IncidentStateMachine {
  validateTransition(current: IncidentStatus, proposed: IncidentStatus): IncidentStatus {
    if (current === proposed) return current;
    const allowed = VALID_TRANSITIONS[current];
    if (!allowed?.includes(proposed)) {
      throw new Error(`Invalid incident transition: ${current} → ${proposed}`);
    }
    return proposed;
  }
}
```

### Pattern 2: Auto-Triage from Alerts (Event Bus Integration)

**What:** When an alert is created (from Phase 1's door alerts, tailgating detection, or AI inference), an event bus listener evaluates whether the alert meets auto-triage criteria and creates an incident automatically.

**Confidence: HIGH** — Directly extends Phase 1's event bus pattern (D-23).

```typescript
// src/modules/incident/incident.service.ts — Auto-triage handler
@OnEvent("alert.created", { async: true })
async onAlertCreated(payload: { alertId: string; severity: string; metadata: any }) {
  // Auto-triage HIGH/CRITICAL alerts to incidents
  if (payload.severity !== "HIGH" && payload.severity !== "CRITICAL") return;

  await this.incidentQueue.add("auto-triage", {
    alertId: payload.alertId,
    severity: payload.severity,
    metadata: payload.metadata,
  }, { attempts: 2, removeOnComplete: true });
}

// In incident.processor.ts
@Processor("incident-alerts")
export class IncidentProcessor extends WorkerHost {
  @Process("auto-triage")
  async autoTriage(job: Job) {
    const { alertId, severity, metadata } = job.data;

    // Fetch alert details
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
      include: { camera: { select: { name: true, siteId: true } } },
    });
    if (!alert) return { skipped: true, reason: "alert-not-found" };

    // Create incident from alert
    const incident = await this.prisma.incident.create({
      data: {
        title: alert.title,
        description: alert.description,
        severity: alert.severity as any,
        status: "OPEN",
        siteId: alert.camera?.siteId,
        sourceType: "alert",
        sourceId: alertId,
        assignedToId: null, // Unassigned until operator triages
      },
    });

    // Link evidence (the alert's snapshot)
    if (alert.snapshotUrl) {
      await this.prisma.incidentEvidence.create({
        data: {
          incidentId: incident.id,
          type: "snapshot",
          url: alert.snapshotUrl,
          description: `Snapshot from alert: ${alert.title}`,
        },
      });
    }

    // Emit event for real-time push
    this.eventEmitter.emit("incident.created", { incidentId: incident.id, siteId: alert.camera?.siteId });

    return { created: true, incidentId: incident.id };
  }
}
```

### Pattern 3: SLA Timer with Escalation Chain (BullMQ Delayed Jobs)

**What:** When an incident is assigned, a BullMQ delayed job fires after the SLA duration. If the incident is still in the same status (not resolved/closed), the job triggers escalation: notify the assigned agent, then escalate to supervisor, then to admin.

**Confidence: MEDIUM** — BullMQ delayed jobs for SLAs are well-known but escalation chain design is at the agent's discretion.

```typescript
// Prisma model for escalation chain stored on incident
model IncidentEscalation {
  id            String   @id @default(uuid())
  incidentId    String
  level         Int      @default(1)   // 1=agent, 2=supervisor, 3=admin
  notifyUserId  String?                // User to notify at this level
  slaMinutes    Int                    // Minutes before escalation
  notifiedAt    DateTime?
  resolvedAt    DateTime?

  incident Incident @relation(fields: [incidentId], references: [id])

  @@index([incidentId])
}

// In IncidentService — on assignment
async assignIncident(incidentId: string, userId: string) {
  const incident = await this.prisma.incident.update({
    where: { id: incidentId },
    data: {
      assignedToId: userId,
      status: "TRIAGE",
      assignedAt: new Date(),
    },
  });

  // Schedule SLA escalation jobs
  const escalationChain = incident.escalationChain as EscalationLevel[];
  for (const level of escalationChain) {
    await this.incidentQueue.add(
      "sla-escalation",
      { incidentId, level: level.level, notifyUserId: level.notifyUserId },
      { delay: level.slaMinutes * 60 * 1000, attempts: 1 },
    );
  }

  this.eventEmitter.emit("incident.assigned", { incidentId, assignedToId: userId });
}

// In IncidentProcessor — on SLA escalation
@Process("sla-escalation")
async handleSlaEscalation(job: Job) {
  const { incidentId, level } = job.data;

  const incident = await this.prisma.incident.findUnique({
    where: { id: incidentId },
  });
  if (!incident || incident.status === "RESOLVED" || incident.status === "CLOSED") {
    return { skipped: true, reason: "incident-already-resolved" };
  }

  // Log escalation
  await this.prisma.incidentEvent.create({...});

  // Notify escalation target
  // Send notification via existing NotificationsService
}
```

### Pattern 4: Visitor Management Using Phase 1 Credential System

**What:** Visitor management extends Phase 1's polymorphic credential model (D-08). A new `VISITOR` credential type is created with a time-bound validity matching the visit duration. The existing QR code generator produces the visitor's badge. Zone restrictions are enforced via access levels linked to the visitor credential.

**Confidence: HIGH** — Direct extension of Phase 1 infrastructure.

```typescript
// Prisma model: Visit (new)
model Visit {
  id              String    @id @default(uuid())
  visitorId       String
  hostUserId      String    // The employee hosting the visitor
  purpose         String?
  validFrom       DateTime
  validUntil      DateTime
  credentialId    String    // FK to Credential (type: VISITOR)
  checkedInAt     DateTime?
  checkedOutAt    DateTime?
  status          String    @default("scheduled") // scheduled, active, completed, cancelled
  zoneRestrictions Json?    // Array of zone IDs the visitor may access
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  visitor  Visitor    @relation(fields: [visitorId], references: [id])
  host     User       @relation(fields: [hostUserId], references: [id])
  credential Credential @relation(fields: [credentialId], references: [id])

  @@index([visitorId])
  @@index([hostUserId])
  @@index([status])
}

// Visitor pre-registration creates a VISITOR credential + QR badge
async preregister(dto: PreregisterDto) {
  // 1. Create visitor record
  const visitor = await this.prisma.visitor.create({
    data: {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      company: dto.company,
    },
  });

  // 2. Create VISITOR credential (extends Phase 1 Credential model)
  const credential = await this.accessService.createCredential({
    userId: dto.hostUserId,   // Linked to host user
    type: "QR",               // Use QR type for visitor badge
    qrSeed: crypto.randomUUID(),
    validFrom: dto.validFrom,
    validUntil: dto.validUntil,
    maxUses: null,            // Unlimited during visit
  });

  // 3. Grant zone access via access levels
  if (dto.zoneIds?.length) {
    for (const zoneId of dto.zoneIds) {
      await this.accessService.createAccessLevel({
        credentialId: credential.id,
        zoneId,
        scheduleId: defaultSchedule.id, // 24/7 during visit
      });
    }
  }

  // 4. Generate QR badge
  const qrCode = await this.accessService.generateQrCode(credential.id);

  // 5. Create visit record
  const visit = await this.prisma.visit.create({
    data: {
      visitorId: visitor.id,
      hostUserId: dto.hostUserId,
      purpose: dto.purpose,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
      credentialId: credential.id,
      status: "scheduled",
      zoneRestrictions: dto.zoneIds,
    },
  });

  this.eventEmitter.emit("visitor.preregistered", { visitId: visit.id });
  return { visit, qrCode };
}
```

### Pattern 5: ANPR Processing Pipeline

**What:** ANPR adds a new ingestion pipeline separate from the main frame-processing queue. Vehicle cameras send frames to the AI Preprocessor (Python) which runs PaddleOCR for plate recognition. Recognized plates are evaluated against allowlist/blocklist and generate vehicle access events.

**Confidence: MEDIUM** — PaddleOCR is well-established but integration with existing Ollama-based AI Preprocessor needs careful design to avoid conflicts.

```
Vehicle Camera Frame
       │
       ▼
AI Preprocessor (Python FastAPI)
  POST /api/v1/anpr   ← New endpoint
  │  - Receive frame (base64 or URL)
  │  - Run PaddleOCR for plate detection + recognition
  │  - Return: { plate: "ABC-1234", confidence: 0.97, bbox: {...} }
       │
       ▼
AnprProcessor (BullMQ: anpr-processing)
  │  1. Receive plate recognition result
  │  2. Check allowlist/blocklist from Redis cache
  │  3. Decision: ALLOW / DENY / UNKNOWN
  │  4. Log to vehicle_events hypertable
  │  5. Emit "anpr.recognized" event
  │  6. If ALLOW: trigger gate open via MQTT
  │  7. If DENY: create alert via AlertService
       │
       ▼
Event bus → CorrelationService (existing)
  → Access event log + video correlation
```

```typescript
// In ANPR service — dispatch plate to AI Preprocessor for recognition
async analyzePlate(frame: string, cameraId: string): Promise<PlateResult> {
  const response = await fetch(`${this.aiBaseUrl}/api/v1/anpr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_base64: frame, camera_id: cameraId }),
    signal: AbortSignal.timeout(15000), // 15s timeout for ANPR
  });
  if (!response.ok) throw new Error(`ANPR failed: ${response.status}`);
  return response.json() as PlateResult;
}

// In ANPR processor — evaluate plate against lists
@Processor("anpr-processing")
export class AnprProcessor extends WorkerHost {
  @Process("evaluate-plate")
  async evaluatePlate(job: Job) {
    const { plate, confidence, cameraId, timestamp, imageUrl } = job.data;

    // Check allowlist (cached in Redis)
    const allowKey = `vehicle:allowlist:${plate}`;
    const isAllowed = await this.redis.get(allowKey);
    if (isAllowed) {
      return this.recordDecision(job.data, "ALLOW", "allowlist");
    }

    // Check blocklist
    const blockKey = `vehicle:blocklist:${plate}`;
    const isBlocked = await this.redis.get(blockKey);
    if (isBlocked) {
      return this.recordDecision(job.data, "DENY", "blocklist");
    }

    // Unknown vehicle — default DENY with configurable behavior
    return this.recordDecision(job.data, "DENY", "unknown");
  }

  private async recordDecision(data: any, decision: string, reason: string) {
    // Log to vehicle_events hypertable
    await this.prisma.$queryRaw`
      INSERT INTO vehicle_events (time, site_id, camera_id, plate, confidence, image_url, decision, reason)
      VALUES (${new Date()}::timestamptz, ${data.siteId}::uuid, ${data.cameraId}::uuid,
              ${data.plate}, ${data.confidence}, ${data.imageUrl},
              ${decision}::vehicle_decision, ${reason})
    `;

    // Emit event for real-time streaming
    this.eventEmitter.emit("anpr.recognized", {
      plate: data.plate,
      cameraId: data.cameraId,
      decision,
      timestamp: new Date(),
    });
  }
}
```

```python
# services/ai-preprocessor/main.py — New ANPR endpoint
from paddleocr import PaddleOCR
ocr = PaddleOCR(use_angle_cls=True, lang='en')

@app.post("/api/v1/anpr")
async def recognize_plate(request: ANPRRequest):
    """Detect and recognize license plate from camera frame."""
    image = decode_base64_image(request.image_base64)
    results = ocr.ocr(image, cls=True)
    
    # Filter results to find plate-like text regions
    plates = []
    for line in results:
        for word_info in line:
            text = word_info[1][0]
            confidence = word_info[1][1]
            bbox = word_info[0]
            plates.append({
                "plate": text,
                "confidence": confidence,
                "bbox": bbox,
            })
    
    return {"plates": plates, "camera_id": request.camera_id}
```

### Pattern 6: Natural Language Event Query via Ollama LLM

**What:** User enters a natural language query ("show all forced door events after midnight on Site A"). The AI module sends this query to Ollama LLM with a structured prompt that converts it to a query specification (time range, event type, filters, site). The structured specification is then executed against TimescaleDB hypertables.

**Confidence: MEDIUM** — LLM-based NL→structured query is a proven pattern but prompt engineering and edge cases (ambiguous queries, timezone handling) need careful design.

```
User: "show forced door events after midnight on Site A"
       │
       ▼
POST /api/ai/query { query: "show forced door events after midnight on Site A" }
       │
       ▼
AiService.query()
  │  1. Send to Ollama with structured prompt:
  │     "Convert this physical security query to a JSON specification.
  │      Valid event_types: access_granted, access_denied, door_forced,
  │      door_held_open, tailgating, anpr
  │      Valid filters: site_name, from_time, to_time, door_name, zone_name
  │      Current time: 2026-07-14T14:30:00Z
  │      Query: 'show forced door events after midnight on Site A'
  │      Return ONLY JSON: { ... }"
       │
       ▼
  │  Ollama returns: { "event_types": ["door_forced"], "filters": {
  │    "site_name": "Site A", "from_time": "2026-07-14T00:00:00Z"
  │  }}
       │
       ▼
  │  2. Resolve "Site A" → siteId via Prisma
  │  3. Build SQL query against door_state_log
  │  4. Execute via $queryRaw
  │  5. Return results + natural language response
       │
       ▼
Response: { results: [...], summary: "Found 3 forced door events on Site A since midnight:" }
```

```typescript
// src/modules/ai/ai.service.ts
@Injectable()
export class AiService {
  private readonly ollamaUrl: string;
  private readonly model: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.ollamaUrl = this.config.get("OLLAMA_BASE_URL", "http://localhost:11434");
    this.model = this.config.get("OLLAMA_MODEL", "moondream"); // or mistral/llama for text
  }

  async naturalLanguageQuery(query: string, userId: string): Promise<AIQueryResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const siteId = user?.siteId;

    const systemPrompt = `You are a physical security query assistant.
Convert natural language queries to structured JSON specifications.
Current time: ${new Date().toISOString()}
User's site ID: ${siteId || "not restricted (multi-site)"}

Valid event_types: access_granted, access_denied, door_forced, door_held_open,
                   door_unsecured, tailgating, anpr_allow, anpr_deny

Respond with ONLY a JSON object:
{
  "event_types": string[],
  "filters": {
    "site_name"?: string,
    "from_time"?: ISO string,
    "to_time"?: ISO string,
    "door_name"?: string,
    "plate"?: string
  },
  "query_summary": string
}`;

    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: `Query: "${query}"\n\nJSON:`,
        system: systemPrompt,
        stream: false,
        options: { temperature: 0.1 }, // Low temperature for deterministic output
      }),
    });

    const result = await response.json();
    const spec = JSON.parse(result.response);

    // Execute the structured query against TimescaleDB
    const events = await this.executeStructuredQuery(spec, siteId);

    return {
      query,
      spec,
      results: events,
      summary: spec.query_summary,
    };
  }
}
```

### Pattern 7: Equipment Health Monitoring (Cron + TimescaleDB + MQTT)

**What:** Equipment health extends the Phase 1 SupervisionService with persisted health metrics. Camera health uses the existing `lastHeartbeat` and `status` fields on the Camera model. Reader and controller health use the MQTT health topic pattern from Phase 1 (`site/+/controller/+/health`). A `@nestjs/schedule` cron job periodically evaluates health thresholds and creates alerts on degradation.

**Confidence: MEDIUM** — Equipment health thresholds (frame rate drops, latency spikes, battery levels) need domain-specific calibration. The cron + MQTT pattern is sound but alert thresholds are assumptions.

```typescript
// Gateway: existing MqttService already subscribes to site/+/controller/+/health
// New: extend to handle reader/health topic

// Equipment health cron job
@Injectable()
export class EquipmentService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @InjectQueue("equipment-health") private healthQueue: Queue,
  ) {}

  @Cron("*/30 * * * * *") // Every 30 seconds
  async checkCameraHealth() {
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 min

    // Find cameras with no recent heartbeat
    const staleCameras = await this.prisma.camera.findMany({
      where: {
        isRecording: true,
        OR: [
          { lastHeartbeat: null },
          { lastHeartbeat: { lt: staleThreshold } },
        ],
      },
    });

    for (const camera of staleCameras) {
      // Log health event to TimescaleDB
      await this.prisma.$queryRaw`
        INSERT INTO camera_health (time, camera_id, site_id, status, details)
        VALUES (NOW(), ${camera.id}::uuid, ${camera.siteId}::uuid,
                'offline', ${JSON.stringify({ lastHeartbeat: camera.lastHeartbeat })}::jsonb)
      `;

      // Update camera status
      await this.prisma.camera.update({
        where: { id: camera.id },
        data: { status: "OFFLINE" },
      });

      // Create alert if camera was previously online
      if (camera.status === "ONLINE" || camera.status === "DEGRADED") {
        this.eventEmitter.emit("equipment.alert", {
          deviceType: "camera",
          deviceId: camera.id,
          status: "offline",
          siteId: camera.siteId,
          timestamp: new Date(),
        });
      }
    }
  }
}

// MQTT health event handler (extends Phase 1 MqttService)
// Reads controller health from MQTT topic
@OnEvent("mqtt.controller.health", { async: true })
async handleControllerHealth(payload: { topic: string; message: ControllerHealth }) {
  const { siteId, controllerId } = this.parseControllerTopic(payload.topic);

  // Log to TimescaleDB hypertable
  await this.prisma.$queryRaw`
    INSERT INTO controller_health (time, controller_id, site_id,
      battery_level, connection_stability, firmware_version, cpu_load, memory_usage)
    VALUES (NOW(), ${controllerId}::uuid, ${siteId}::uuid,
      ${payload.message.batteryLevel}, ${payload.message.connectionStability},
      ${payload.message.firmwareVersion}, ${payload.message.cpuLoad},
      ${payload.message.memoryUsage})
  `;

  // Alert on low battery
  if (payload.message.batteryLevel < 20) {
    this.eventEmitter.emit("equipment.alert", {
      deviceType: "controller",
      deviceId: controllerId,
      status: "low-battery",
      value: payload.message.batteryLevel,
      siteId,
      timestamp: new Date(),
    });
  }
}
```

### Pattern 8: Data Encryption at Rest (pgcrypto)

**What:** Sensitive data fields (credential badge numbers, visitor PII) are encrypted at the database level using pgcrypto's `pgp_sym_encrypt`/`pgp_sym_encrypt` with a configurable encryption key. The key is stored in environment variables (not the database). Application-level reads decrypt transparently using Prisma middleware or `$queryRaw`.

**Confidence: MEDIUM** — pgcrypto encryption is standard PostgreSQL. Key rotation, performance impact, and searchability of encrypted fields need careful design.

```typescript
// Encryption service using pgcrypto
@Injectable()
export class EncryptionService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  private getEncryptionKey(): string {
    return this.config.getOrThrow("ENCRYPTION_KEY");
  }

  async encrypt(plaintext: string): Promise<string> {
    const result = await this.prisma.$queryRawUnsafe<Array<{ encrypted: string }>>(
      `SELECT pgp_sym_encrypt($1, $2) as encrypted`,
      plaintext,
      this.getEncryptionKey(),
    );
    return result[0].encrypted;
  }

  async decrypt(encrypted: string): Promise<string> {
    const result = await this.prisma.$queryRawUnsafe<Array<{ decrypted: string }>>(
      `SELECT pgp_sym_decrypt($1::bytea, $2) as decrypted`,
      encrypted,
      this.getEncryptionKey(),
    );
    return result[0].decrypted;
  }
}

// Usage in GovernanceService for encrypting sensitive credential data
@Injectable()
export class GovernanceService {
  async encryptSensitiveCredentialField(credentialId: string, field: string, value: string) {
    await this.prisma.$queryRaw`
      UPDATE "Credential"
      SET ${field === "badgeNumber" ? Prisma.raw('"badgeNumber"') : Prisma.raw('"badgeNumber"')} = 
          pgp_sym_encrypt(${value}, ${this.config.get("ENCRYPTION_KEY")})
      WHERE id = ${credentialId}::uuid
    `;
  }
}
```

### Pattern 9: Configurable Data Retention with Auto-Pruning

**What:** Data retention policies are stored as a Prisma model. A cron job evaluates each policy and prunes data from both Prisma-managed tables and TimescaleDB hypertables. TimescaleDB natively supports `add_retention_policy`, but for non-hypertable data and cross-table coordination, a BullMQ worker performs the pruning.

**Confidence: HIGH** — TimescaleDB retention policies are proven. The Prisma model + cron for cross-table coordination extends the pattern.

```typescript
// Prisma model
model RetentionPolicy {
  id          String   @id @default(uuid())
  eventType   String   @unique   // 'access_events', 'door_state_log', 'audit_log', etc.
  tableType   String              // 'timescaledb' or 'prisma'
  retentionDays Int
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Cron job — runs hourly
@Injectable()
export class GovernanceService {
  @Cron("0 * * * *") // Every hour
  async pruneExpiredData() {
    const policies = await this.prisma.retentionPolicy.findMany({
      where: { enabled: true },
    });

    for (const policy of policies) {
      await this.governanceQueue.add("prune", {
        eventType: policy.eventType,
        tableType: policy.tableType,
        retentionDays: policy.retentionDays,
      }, { attempts: 2, removeOnComplete: true });
    }
  }
}

// GovernanceProcessor
@Processor("retention-pruning")
export class GovernanceProcessor extends WorkerHost {
  @Process("prune")
  async prune(job: Job) {
    const { eventType, tableType, retentionDays } = job.data;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    if (tableType === "timescaledb") {
      // For TimescaleDB hypertables, use retention policy if configured,
      // or manual DELETE with chunk-aware approach
      await this.prisma.$queryRawUnsafe(
        `DELETE FROM ${eventType} WHERE time < $1::timestamptz`,
        cutoff,
      );
    } else if (tableType === "prisma") {
      // For Prisma-managed tables, use Prisma delete
      // Example: prune old notification logs
      // await this.prisma.notificationLog.deleteMany({ ... });
    }

    this.logger.log(`Pruned ${eventType} older than ${retentionDays} days`);
  }
}
```

### Anti-Patterns to Avoid

- **Mixing incident status as a simple string field:** Incidents have strict lifecycle rules. Use a state machine like DoorStateMachine (Phase 1). [INC-05]
- **Blocking the event pipeline with ANPR processing:** ANPR inference runs asynchronously via BullMQ. The plate capture is sync (camera frame → AI Preprocessor), but all list evaluation and access decisions are async. [ANPR-01]
- **Storing visitor PII unencrypted:** Visitor data (name, contact info) is PII. Store encrypted or with restricted access. [AUDT-04]
- **Hardcoding SLA times in code:** Escalation chains and SLA timers should be configurable per incident type, stored in the database. [INC-02]
- **Storing full plate images in the database:** Plate images can be large. Store image URL (file path) not the base64/blob. [ANPR-04]
- **Building a custom LLM prompt parser when LangChain exists:** LangChain's `StructuredOutputParser` handles JSON output extraction from LLM responses. Don't write regex-based parsing. [AI-01]
- **Polling for equipment health when MQTT provides push updates:** Use the existing MQTT health topic pattern from Phase 1 rather than polling camera/reader endpoints. [EQPT-01, EQPT-02]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| License plate recognition | Custom OCR + plate detection | PaddleOCR / OpenALPR | Plate recognition requires trained ML models (detection + text recognition). Building from scratch needs thousands of annotated plate images. PaddleOCR has pre-trained models for 80+ languages. |
| Natural language query parser | Regex + keyword matching | Ollama LLM + LangChain | Natural language queries have infinite variations. LLMs generalize to novel phrasings. LangChain's `StructuredOutputParser` extracts structured JSON reliably. |
| PDF report generation | Hand-coded PDF rendering | PDFKit | PDF generation requires page layout, fonts, table formatting. PDFKit handles all PDF spec edge cases (fonts, compression, encryption). |
| Incident SLA timer | setTimeout / setInterval | BullMQ delayed jobs | SLA timers must survive server restarts. BullMQ delay is persisted in Redis. setTimeout is lost on process crash. |
| Vector embeddings for semantic search | Custom embedding service | Ollama embedding API + pgvector | Ollama provides embedding endpoints (`/api/embeddings`). pgvector stores + queries vectors. No new infrastructure needed. |
| Camera health detection | Custom RTSP health check | Camera.lastHeartbeat + MQTT health | Existing ingestion service already tracks heartbeat. The CorrelationProcessor already reads CameraDoorMap. MQTT controller health topics are already subscribed (Phase 1). |
| Encryption at rest | Custom encryption library | pgcrypto `pgp_sym_encrypt` | PostgreSQL pgcrypto provides battle-tested symmetric encryption with key management. Avoids application-layer encryption bugs. |
| Data retention pruning | Custom SQL scripts | TimescaleDB `add_retention_policy` + @nestjs/schedule cron | TimescaleDB's native retention policy handles hypertable chunk dropping automatically. Cron handles non-hypertable tables (notification logs, etc.). |
| Escalation chain logic | Hand-coded escalation tree | BullMQ delayed jobs with chain config | Escalation levels are sequential delayed jobs. If incident resolved before delay fires, the job is skipped. Configurable chain stored as JSON on Incident model. |

**Key insight:** Phase 2 adds six feature areas that each have well-established solutions in the security and AI ecosystems. Incident management patterns follow ITIL-like lifecycle state machines — don't invent a new model. ANPR is a solved problem with mature libraries. NL→structured query is what LLMs excel at. Equipment health monitoring follows established DevOps patterns (heartbeat, stale threshold, alert). Encryption and retention are standard data governance patterns. The unique value is in the integration: connecting ANPR events to the access control pipeline, linking visitor credentials to the video correlation engine, and providing a unified query interface across all event types.

## Runtime State Inventory

> This phase adds new modules on top of existing Phase 1 infrastructure. No rename/refactor.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Existing Phase 1 data: credentials, doors, zones, access_levels, access_events, door_state_log, audit_log, alerts, cameras | New Phase 2 modules reference existing data (incidents reference alerts, visitor credentials extend credential system, ANPR events feed into event pipeline). No migration needed. |
| Live service config | Existing MQTT subscriptions: `site/+/door/+/state`, `site/+/reader/+/badge`, `site/+/controller/+/health` | New: ANPR gate control via MQTT, controller health extended with battery/firmware fields |
| OS-registered state | None — no systemd, cron, or Task Scheduler entries affected | None |
| Secrets/env vars | New env vars required: `ENCRYPTION_KEY` (symmetric encryption key for pgcrypto). Existing `OLLAMA_BASE_URL`, `AI_PREPROCESSOR_URL`, `QDRANT_URL` reused. Existing `JWT_*`, `DATABASE_URL`, `REDIS_*` unchanged. | Add `ENCRYPTION_KEY` to `.env.example` and Docker Compose files. |
| Build artifacts | None — new TypeScript modules integrate into existing build pipeline. New Python ANPR dependencies added to AI Preprocessor's `requirements.txt`. | Update AI Preprocessor Docker image with PaddleOCR |

**Nothing found in category:** Stored data (existing data is compatible), Live service config (MQTT subscriptions extend cleanly), OS-registered state (none), Build artifacts (new npm/Python packages only).

## Environment Availability

> Phase 2 extends existing infrastructure. No new Docker containers required (pgvector is a PostgreSQL extension, PaddleOCR runs in the existing AI Preprocessor container).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | NestJS API | ✓ | v22.23.1 | — |
| pnpm | Package management | ✓ | 9.0.0 | — |
| Docker | Compose deployment | ✓ | 29.5.3 | — |
| PostgreSQL 16 | Database (Prisma + TimescaleDB + pgvector) | ✓ | 16 (Alpine) | — |
| TimescaleDB | Hypertables for Phase 2 event types | ✓ | Installed (Phase 1) | — |
| pgcrypto | Encryption + hash chains | ✓ | Installed (Phase 1) | — |
| pgvector | Vector embeddings for AI search | ⚠️ Not verified | Not installed | Install extension: `CREATE EXTENSION IF NOT EXISTS vector;` |
| Redis 7 | Cache, queues, SLA timers | ✓ | 7.2 | — |
| BullMQ | Async job queues | ✓ | 5.30.0 (existing) | — |
| Socket.IO | Real-time push | ✓ | 4.8.3 (existing) | — |
| Ollama | LLM for NLP + embeddings | ⚠️ Via host.docker.internal:11434 | Existing | Use OpenAI API as cloud fallback (but violates self-hosted constraint) |
| AI Preprocessor (Python) | ANPR + plate recognition | ✓ | FastAPI 0.115.0 | Add PaddleOCR to requirements.txt |
| FFmpeg | Frame capture | ✓ | Existing | — |
| Mosquitto (MQTT broker) | Door/controller communication | ✓ | Installed (Phase 1) | — |
| PDFKit | Incident closure reports | N/A (npm package) | — | Handlebars + HTML-to-PDF (browser print) |

**Missing dependencies with no fallback:**
- **pgvector extension:** Must be installed on the project's PostgreSQL 16 instance. `CREATE EXTENSION IF NOT EXISTS vector;` — requires the pgvector package to be available on the PostgreSQL server. Since the project uses `timescale/timescaledb` Docker image for TimescaleDB, check that it includes pgvector or switch to `timescale/timescaledb:2.18-pg16` which may need pgvector installed via `apk add pgvector` or similar.

**Missing dependencies with fallback:**
- **PaddleOCR for ANPR:** If PaddleOCR installation fails (large dependency, GPU optional), fall back to OpenALPR 1.1.0 (lighter, fewer features) or the existing Ollama vision model with a plate-reading prompt (much slower, lower accuracy).
- **pgvector for embeddings:** If pgvector cannot be installed, use Qdrant (existing `QDRANT_URL` env var placeholder, but Qdrant is not deployed). Or use in-memory vector comparison for small datasets (<10K events).

## Common Pitfalls

### Pitfall 1: Incident SLA Timer Loss on Server Restart
**What goes wrong:** SLA escalation timers are lost when the server restarts. An incident that should have escalated after 30 minutes never fires because the BullMQ delay was in a job that was in-memory during restart.
**Why it happens:** BullMQ jobs persist to Redis, but delayed jobs may be lost if they were in the active processing state (being executed) at the time of crash. Redis persistence settings (RDB/AOF) also affect whether delayed jobs survive.
**How to avoid:** Use BullMQ `removeOnFail: false` and `attempts: 2` for SLA escalation jobs. On server startup, re-evaluate all open incidents' SLAs against current time — if SLA has expired, fire escalation immediately. Implement an `onModuleInit` hook in IncidentService that recalculates overdue SLA timers.
**Warning signs:** Incidents stuck in "TRIAGE" longer than their SLA. Escalation notifications that never fire. Open incidents with assignedAt older than 2× SLA duration.

### Pitfall 2: ANPR Pipeline Bottlenecking on AI Preprocessor
**What goes wrong:** ANPR frame processing is added to the same AI Preprocessor queue as regular frame analysis. The existing Ollama pipeline already takes ~3min per frame on CPU (per Phase 1 code — InferenceProcessor with 300s timeout). Adding plate recognition creates a queue backlog that delays both ANPR and normal AI detection.
**Why it happens:** The AI Preprocessor is a single Python process with limited concurrency. PaddleOCR also needs significant CPU/GPU resources. Running both on the same worker causes contention.
**How to avoid:** Give ANPR a separate processing queue (`anpr-processing`) with its own concurrency limit. Use a dedicated Python worker or at minimum a separate route in the AI Preprocessor that doesn't block the main `/api/v1/analyze` endpoint. Consider rate-limiting ANPR per camera (e.g., max 1 frame every 5 seconds per vehicle camera). Use a lightweight ANPR model for initial MVP (PaddleOCR lite) and defer GPU acceleration to Phase 3.
**Warning signs:** Frame queue waiting count growing faster than processing rate. ANPR latency exceeding 30s per plate. Ollama analysis latency increasing after ANPR deployment.

### Pitfall 3: Visitor Credential Orphaned on Visit Cancellation
**What goes wrong:** When a visit is cancelled, the visitor's QR credential remains active with `validUntil` in the future. The visitor could theoretically still use the QR code to access zones.
**Why it happens:** The credential's validity window (`validFrom`/`validUntil`) is set at pre-registration time based on visit duration. Cancelling the visit doesn't deactivate the credential.
**How to avoid:** On visit cancellation/check-out, immediately deactivate the associated credential (`isActive: false`). Add a cron check for credentials that have exceeded their visit duration without check-out. Use Redis to maintain a "revoked credentials" cache that's checked during access evaluation.
**Warning signs:** Access events for visitor credentials after visit check-out. Visitors with multiple active credentials. Credential table showing active credentials linked to completed/cancelled visits.

### Pitfall 4: Natural Language Query Returning Incomplete Results Due to Timezone Ambiguity
**What goes wrong:** An operator queries "events after midnight on Site A" expecting local time (Africa/Niamey UTC+1), but the system interprets midnight as UTC. Queries for "today", "last hour", "this morning" all have similar timezone ambiguity.
**Why it happens:** All event timestamps in TimescaleDB are stored as `TIMESTAMPTZ` (UTC). The operator's natural language doesn't specify a timezone. The LLM prompt doesn't include timezone context.
**How to avoid:** Include the operator's timezone (from their user profile or site timezone) in the LLM prompt context. Default to the site's timezone when none is specified. Always return timestamps in the operator's local timezone in the response. Store user/site timezone preference if available.
**Warning signs:** Users reporting "events at wrong time". Queries for "today" returning data from yesterday evening. Time-bucketed CAGG data misaligned with local business hours.

### Pitfall 5: Encryption Key Rotation Breaking Existing Data
**What goes wrong:** The `ENCRYPTION_KEY` environment variable is rotated (changed). All existing encrypted data (visitor PII, encrypted credential fields) becomes unreadable because pgcrypto's `pgp_sym_decrypt` uses the new key to decrypt data that was encrypted with the old key.
**Why it happens:** Symmetric encryption with a single key has no built-in key rotation mechanism. Rotating the key breaks all existing ciphertext.
**How to avoid:** Don't encrypt with `ENCRYPTION_KEY` directly. Use a key-wrapping pattern: derive a data encryption key (DEK) from the master key, encrypt the DEK with the master key, and store the wrapped DEK alongside the data. On rotation, unwrap the old DEK with the old master key and re-wrap it with the new master key. For MVP, document that ENCRYPTION_KEY rotation requires decrypting and re-encrypting all data (offline maintenance window). Defer proper key management infrastructure (HSM, AWS KMS) to v2.
**Warning signs:** Failed decryption after deployment. Errors like `pgp_sym_decrypt: decrypt error` in logs. Data showing as null/garbled in visitor records.

### Pitfall 6: Equipment Health Alert Fatigue
**What goes wrong:** A camera briefly loses connectivity (network glitch, <5s) and comes back online. The health monitor creates an "OFFLINE" alert, then an "ONLINE" alert. Over a day with intermittent connectivity, hundreds of alerts are generated.
**Why it happens:** The health check runs every 30 seconds and creates alerts on every state change without debouncing or a minimum offline duration threshold.
**How to avoid:** Apply the same settling timeout pattern from Phase 1's door state machine (D-06). A camera must be offline for at least 60s (configurable) before generating an alert. Use Redis cooldown keys (Phase 1's `door:alert:cooldown` pattern) with a 5-minute window per device. Only alert on transitions to a worse state (ONLINE→OFFLINE, not OFFLINE→ONLINE recovery).
**Warning signs:** Hundreds of camera alerts per hour. Equipment health dashboard showing 50+ alerts/day for the same device. Operators ignoring equipment alerts due to noise.

## Code Examples

### Incident Lifecycle Controller (NestJS Pattern)

```typescript
// src/modules/incident/incident.controller.ts
@Controller("incidents")
export class IncidentController {
  constructor(private incidentService: IncidentService) {}

  @Post()
  @Audited({ entity: "incident", action: "CREATE" })
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR")
  async createIncident(
    @Body(new ZodValidationPipe(createIncidentSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    return this.incidentService.create(body, (req as any).user);
  }

  @Get()
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR")
  async listIncidents(
    @Query("status") status?: string,
    @Query("severity") severity?: string,
    @Query("assignedTo") assignedTo?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any).user;
    return this.incidentService.findAll({
      status,
      severity,
      assignedTo,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      siteId: user.siteId,
    });
  }

  @Get(":id")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR")
  async getIncident(@Param("id") id: string) {
    return this.incidentService.findById(id);
  }

  @Patch(":id/status")
  @Audited({ entity: "incident", action: "UPDATE" })
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR")
  async updateStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateIncidentStatusSchema)) body: any,
    @Req() req: FastifyRequest,
  ) {
    return this.incidentService.transitionStatus(id, body.status, body.reason, (req as any).user);
  }

  @Post(":id/assign")
  @Roles("ADMIN", "SUPER_ADMIN")
  async assignIncident(
    @Param("id") id: string,
    @Body() body: { userId: string },
    @Req() req: FastifyRequest,
  ) {
    return this.incidentService.assign(id, body.userId, (req as any).user);
  }

  @Post(":id/evidence")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR")
  async addEvidence(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addEvidenceSchema)) body: any,
  ) {
    return this.incidentService.addEvidence(id, body);
  }

  @Post(":id/comments")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR", "OPERATOR")
  async addComment(
    @Param("id") id: string,
    @Body() body: { text: string },
    @Req() req: FastifyRequest,
  ) {
    return this.incidentService.addComment(id, body.text, (req as any).user);
  }

  @Get(":id/report")
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR")
  async generateClosureReport(@Param("id") id: string, @Res() res: any) {
    const pdf = await this.incidentService.generateClosureReport(id);
    res.header("Content-Type", "application/pdf");
    res.header("Content-Disposition", `attachment; filename="incident-${id}.pdf"`);
    res.send(pdf);
  }
}
```

### AI Assistant with pgvector Semantic Search

```typescript
// src/modules/ai/ai.service.ts — Embedding + pgvector query for assistant
async answerQuestion(question: string, userId: string): Promise<AssistantResponse> {
  // 1. Generate embedding for the question
  const embedding = await this.generateEmbedding(question);

  // 2. Search for semantically similar events in pgvector
  const similarEvents = await this.prisma.$queryRawUnsafe<
    Array<{ event_type: string; summary: string; time: Date; similarity: number }>
  >(
    `SELECT event_type, summary, time,
             embedding <=> $1::vector AS similarity
      FROM event_embeddings
      WHERE time >= NOW() - INTERVAL '7 days'
      ORDER BY embedding <=> $1::vector
      LIMIT 5`,
    `[${embedding.join(",")}]`,
  );

  // 3. Get current system state context
  const siteStats = await this.getSiteStateSummary(userId);

  // 4. Build LLM prompt with context
  const systemContext = `You are a physical security AI assistant. Current system state:
- ${siteStats.camerasOnline}/${siteStats.camerasTotal} cameras online
- ${siteStats.openAlerts} open alerts
- ${siteStats.openIncidents} open incidents
- ${siteStats.activeVisitors} active visitors on site

Recent relevant events:
${similarEvents.map(e => `- [${e.time.toISOString()}] ${e.event_type}: ${e.summary}`).join("\n")}`;

  // 5. Generate response via Ollama
  const response = await this.ollamaQuery(systemContext, question);

  return {
    answer: response,
    sources: similarEvents.map(e => ({
      type: e.event_type,
      time: e.time.toISOString(),
      summary: e.summary,
    })),
  };
}

private async generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: this.model, prompt: text }),
  });
  const result = await response.json();
  return result.embedding;
}
```

### TimescaleDB New Hypertables for Phase 2

```sql
-- migrations/timescaledb/up/007_incident_events.sql
-- INC-05: Incident state change log

CREATE TYPE incident_status AS ENUM ('open', 'triage', 'investigating', 'resolved', 'closed');

CREATE TABLE incident_events (
    time           TIMESTAMPTZ NOT NULL,
    incident_id    UUID NOT NULL,
    site_id        UUID NOT NULL,
    status         incident_status NOT NULL,
    previous_status incident_status,
    assigned_to_id UUID,
    triggered_by   VARCHAR(64),  -- 'operator', 'system-auto-triage', 'escalation'
    metadata       JSONB
);

SELECT create_hypertable('incident_events', 'time',
    chunk_time_interval => INTERVAL '7 days'
);

ALTER TABLE incident_events SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id, incident_id',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('incident_events', INTERVAL '30 days');
SELECT add_retention_policy('incident_events', INTERVAL '365 days');

CREATE INDEX idx_incident_events_incident ON incident_events (incident_id, time DESC);
CREATE INDEX idx_incident_events_site ON incident_events (site_id, time DESC);

-- migrations/timescaledb/up/008_vehicle_events.sql
-- ANPR-04: Vehicle event log

CREATE TYPE vehicle_decision AS ENUM ('ALLOW', 'DENY', 'UNKNOWN');

CREATE TABLE vehicle_events (
    time         TIMESTAMPTZ NOT NULL,
    site_id      UUID NOT NULL,
    camera_id    UUID,
    plate        VARCHAR(20) NOT NULL,
    confidence   REAL,
    image_url    TEXT,
    decision     vehicle_decision NOT NULL,
    reason       VARCHAR(64),  -- 'allowlist', 'blocklist', 'unknown', 'schedule'
    metadata     JSONB
);

SELECT create_hypertable('vehicle_events', 'time',
    chunk_time_interval => INTERVAL '1 day'
);

ALTER TABLE vehicle_events SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('vehicle_events', INTERVAL '7 days');

-- ANPR-05: Search by plate or time range
CREATE INDEX idx_vehicle_events_plate ON vehicle_events (plate, time DESC);
CREATE INDEX idx_vehicle_events_site_time ON vehicle_events (site_id, time DESC);

-- migrations/timescaledb/up/009_reader_health.sql
-- EQPT-02: Reader health metrics
CREATE TABLE reader_health (
    time             TIMESTAMPTZ NOT NULL,
    reader_id        UUID NOT NULL,
    site_id          UUID NOT NULL,
    status           VARCHAR(16) NOT NULL,  -- 'online', 'offline', 'degraded'
    failed_reads     INT DEFAULT 0,
    response_time_ms INT,
    last_connected   TIMESTAMPTZ,
    firmware_version VARCHAR(32),
    metadata         JSONB
);

SELECT create_hypertable('reader_health', 'time',
    chunk_time_interval => INTERVAL '1 day'
);
SELECT add_retention_policy('reader_health', INTERVAL '90 days');

-- migrations/timescaledb/up/012_event_embeddings.sql
-- AI-01, AI-03: Event embeddings for semantic search
CREATE TABLE event_embeddings (
    id         UUID DEFAULT gen_random_uuid(),
    time       TIMESTAMPTZ NOT NULL,
    site_id    UUID NOT NULL,
    event_type VARCHAR(32) NOT NULL,
    event_id   UUID NOT NULL,
    summary    TEXT NOT NULL,
    embedding  VECTOR(768) NOT NULL  -- Ollama nomic-embed-text dimension
);

SELECT create_hypertable('event_embeddings', 'time',
    chunk_time_interval => INTERVAL '7 days'
);

CREATE INDEX idx_event_embeddings_site ON event_embeddings (site_id, time DESC);
CREATE INDEX idx_event_embeddings_vector ON event_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Qdrant for vector search | pgvector (PostgreSQL native) | Phase 2 | No new Docker container. Vector search on existing TimescaleDB PostgreSQL. Adequate for <1M vectors. Trade: slower than Qdrant at scale. |
| Custom LLM prompt parser | LangChain StructuredOutputParser | Phase 2 | LangChain handles retry, parsing, validation of LLM JSON output. Reduces prompt injection surface. |
| Frame-processing queue for all AI | Separate anpr-processing queue | Phase 2 | ANPR needs different concurrency, timeout, and model than frame analysis. Separate queue prevents head-of-line blocking. |
| In-memory SupervisionService health | TimescaleDB-persisted health metrics | Phase 2 | Phase 1 SupervisionService stores health in-memory (Map). Phase 2 persists to hypertables for historical queries and trend analysis. |
| Manual alert-to-incident | Auto-triage event bus subscriber | Phase 2 | Event-driven incident creation from HIGH/CRITICAL alerts. Reduces operator cognitive load. |
| Static credential validity | Visitor-managed temporary credentials | Phase 2 | Extends Phase 1 Credential model with time-bound visitor credentials. Credential deactivation on visit check-out. |

**Deprecated/outdated:**
- **In-memory equipment health tracking:** Phase 1's SupervisionService uses an in-memory `Map<string, ClientRecord>`. Phase 2 replaces this with TimescaleDB-persisted health metrics. Keep the in-memory cache for fast current-state queries but write all health data to hypertables.
- **Single AI inference queue:** The existing `frame-processing` queue handles all camera frame analysis. Phase 2 introduces ANPR with different performance characteristics (needs faster response, lower resolution, different models). Use a separate `anpr-processing` queue.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PaddleOCR 3.7.0 can be installed and run in the existing AI Preprocessor Docker image (Python 3.11 Alpine) | §Standard Stack | Medium — PaddleOCR has native dependencies (paddlepaddle) that may conflict with Alpine's musl libc. May need to switch to Debian-based Python image or use OpenALPR as fallback. |
| A2 | pgvector extension can be installed on the existing TimescaleDB PostgreSQL 16 container | §Environment Availability | Low — `timescale/timescaledb:2.18-pg16` has pgvector available as a PG extension. The actual installation command depends on the base image. Fallback: use Qdrant (existing config placeholder). |
| A3 | Existing BullMQ queue patterns extend cleanly to new queues (incident-alerts, anpr-processing, equipment-health, retention-pruning) | §Architecture | Low — BullMQ queue registration is the same pattern as existing queues. Redis connection is shared. |
| A4 | Ollama embedding API (`/api/embeddings`) provides 768-dimension vectors compatible with pgvector | §AI/NLP | Low — Ollama's `nomic-embed-text` model produces 768-dim vectors. VECTOR(768) is standard. If model changes dimension, `hnsw` index needs rebuild. |
| A5 | Auto-triage from alerts (HIGH/CRITICAL → incident) won't create excessive incidents | §Incident Management | Medium — If too many HIGH alerts fire, auto-triage creates too many incidents. Mitigation: dedup window per alert type, minimum time between auto-triage per camera. |
| A6 | NL→structured query via Ollama provides sufficient accuracy for operator use | §AI/NLP | Medium — LLM may misinterpret ambiguous queries or hallucinate filter values. Mitigation: include valid values in prompt, return structured spec for operator confirmation before execution. |
| A7 | Incident closure reports in PDF are sufficient for INC-06 | §Incident Management | Low — PDF output covers the requirement. If operators need DOCX/HTML, add format options in a follow-up. |
| A8 | Existing `@nestjs/schedule` 6.1.3 is compatible with NestJS 10.4.8 | §Standard Stack | Very Low — Official NestJS package with peer dep range covering NestJS 10.x. |

## Validation Architecture

> `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`. This section is omitted per protocol.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | Yes | Existing JWT auth. Extended to cover new incident/visitor/ANPR endpoints. Mobile visitor check-in uses existing auth. |
| V3 Session Management | Yes | Existing refresh token rotation. Visitor session linked to time-bound credential (max visit duration). |
| V4 Access Control | Yes | Existing `@Roles()` decorator extended with incident-specific roles. Visitor zone restrictions enforced via Phase 1 access level evaluation. Vehicle allowlist/blocklist enforced at recognition time. |
| V5 Input Validation | Yes | Zod schemas in `@repo/shared` for all new endpoints (incident, visitor, vehicle, AI query, equipment, governance). ANPR plate text sanitized before DB insert. |
| V6 Cryptography | Yes | pgcrypto `pgp_sym_encrypt` for visitor PII and sensitive credential data. AES-256 via `ENCRYPTION_KEY` env var. Encryption at rest for PII fields. |
| V7 Error Handling | Yes | Existing `AllExceptionsFilter` catches unhandled errors. AI LLM errors (Ollama timeout, invalid JSON) caught and returned as graceful error responses, not 500s. |
| V8 Data Protection | Yes | AUDT-05: configurable retention policies per event type with auto-pruning. AUDT-04: encryption at rest. Visitor PII auto-purging after retention period. |
| V10 Malicious Code | Yes | LLM prompt injection prevention: system prompt isolation, output validation, user query sanitization before passing to Ollama. |

### Known Threat Patterns for Security Platform

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Incident escalation bypass (status jump) | Tampering | INC-05: IncidentStateMachine.validateTransition() — only valid transitions allowed. Direct DB update of status bypasses state machine → detected by audit hash chain. |
| Visitor credential reuse after check-out | Spoofing | VIST-03: On check-out/cancellation, credential `isActive = false`. Redis cached revocation check. AccessService checks credential.active during evaluation. |
| ANPR allowlist spoofing (fake plate match) | Spoofing | ANPR-02: Allowlist stored in Prisma (not user-editable text). Plate matching is exact string match. Logs plate text + confidence for audit. |
| LLM prompt injection in AI assistant | Tampering | AI-03: System prompt isolates instructions from user input. Output parser validates JSON structure. No direct SQL from LLM output — LLM specifies filters, service builds parameterized queries. |
| Bulk data exfiltration via AI query | Information Disclosure | AI-01: Site-scoped access (user's siteId). AI-03: Query limits (max 30 days lookback, max 50 results). Audit logging of all AI queries. |
| Encryption key compromise | Information Disclosure | AUDT-04: `ENCRYPTION_KEY` stored in environment variable, never in database or logs. Key rotation requires maintenance window (see Pitfall 5). |
| Equipment health alert spoofing | Spoofing | EQPT-01: Health data from authenticated MQTT topics (Phase 1 MqttService validates source). Health thresholds are server-side configured, not client-reported. |

## Sources

### Primary (HIGH confidence)
- [Project codebase: apps/api/src/modules/] — Phase 1 modules (access, door, correlation, audit, inference, supervision), proven patterns [VERIFIED: codebase]
- [Project codebase: apps/api/src/mqtt/] — MQTT.js custom provider, protocol adapters, topic builders [VERIFIED: codebase]
- [Project codebase: apps/api/prisma/schema.prisma] — Existing models and new model design patterns [VERIFIED: codebase]
- [npm registry: @nestjs/schedule@6.1.3, pdfkit@0.19.1, handlebars@4.7.9, @langchain/community@1.1.29, @langchain/core@1.2.2, pgvector@0.3.0] — Package existence and versions [VERIFIED: npm registry]
- [PyPI: paddleocr@3.7.0, openalpr@1.1.0, ultralytics@8.4.95] — Package existence and versions [VERIFIED: pip index]
- [Phase 1 RESEARCH.md] — Established patterns: event bus, state machine, TimescaleDB+Prisma coexistence, MQTT transport [VERIFIED: .planning/phases/01-unified-security/01-RESEARCH.md]

### Secondary (MEDIUM confidence)
- [PaddleOCR GitHub README] https://github.com/PaddlePaddle/PaddleOCR — API surface, pre-trained models, language support [CITED]
- [pgvector GitHub README] https://github.com/pgvector/pgvector — Installation, indexing (HNSW), query operators [CITED]
- [LangChain.js documentation] https://js.langchain.com/docs/ — Structured output parser, ChatOllama, prompt templates [CITED]
- [Ollama API documentation] https://github.com/ollama/ollama/blob/main/docs/api.md — Generate, embeddings, API endpoints [CITED]

### Tertiary (LOW confidence)
- [Incident SLA timer thresholds] — Specific SLA times (30min, 1h, 4h per escalation level) are assumptions. Should be configurable per installation. [ASSUMED]
- [Equipment health detection thresholds] — 30-second check interval, 5-minute stale threshold, 60-second debounce — reasonable defaults but may need tuning per deployment. [ASSUMED]
- [pgvector HNSW index parameters] — `m = 16, ef_construction = 200` are reasonable defaults for <1M vectors. May need tuning for production scale. [ASSUMED]

## Open Questions

1. **ANPR engine choice (PaddleOCR vs OpenALPR vs Ultralytics)**
   - What we know: All three are available on PyPI. PaddleOCR supports 80+ languages and international plates. OpenALPR is lighter but primarily US/European. Ultralytics requires custom training for plates.
   - What's unclear: Which works best in the AI Preprocessor's Alpine Linux environment. PaddleOCR has native dependencies (paddlepaddle) that may have Alpine compatibility issues.
   - Recommendation: Start with PaddleOCR for MVP. If Alpine compatibility is an issue, fall back to OpenALPR. The planner should include a spike task to test PaddleOCR installation in the AI Preprocessor container before committing to full implementation.

2. **pgvector installation on existing TimescaleDB PostgreSQL**
   - What we know: pgvector needs to be installed on the same PostgreSQL that already has TimescaleDB. The `timescale/timescaledb` Docker image may or may not include pgvector.
   - What's unclear: Whether the existing Docker Compose PostgreSQL instance has pgvector available. The extension needs the `vector` package at the OS level.
   - Recommendation: Add pgvector installation to the Docker Compose healthcheck or use a custom Dockerfile based on `timescale/timescaledb:2.18-pg16` with pgvector installed. The planner should include a Wave 0 task for this.

3. **AI assistant model selection (text vs vision)**
   - What we know: The existing setup uses `moondream` (vision model) for frame analysis. For NL query parsing, a text-focused model (Mistral, Llama 3, or similar) would be more appropriate and faster.
   - What's unclear: Whether a separate Ollama model for text is installed, or if the existing model is used for both.
   - Recommendation: Install a second Ollama model for text tasks (e.g., `mistral` or `llama3.2`). Use `moondream` only for vision tasks. The AI module should support configurable model names per task type.

4. **Closure report format (PDF vs HTML vs Markdown)**
   - What we know: INC-06 requires closure reports with timeline, evidence, and actions taken.
   - What's unclear: PDFKit is Node.js-native but produces structured PDFs. Operators may prefer HTML reports for browser viewing or Markdown for integration with external systems.
   - Recommendation: Start with PDFKit for downloadable PDF reports. Add HTML/Markdown format options in a follow-up if needed. PDF satisfies INC-06.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All packages verified on npm/PyPI registries, existing patterns confirmed via codebase inspection
- Architecture: HIGH — State machine pattern proven in Phase 1, event bus pattern proven, TimescaleDB+Prisma separation proven
- Pitfalls: HIGH — Cross-referenced from Phase 1 patterns, incident management domain knowledge, ANPR/AI ecosystem experience
- Code examples: MEDIUM — Implementation patterns follow established NestJS conventions but have not been compiled against the actual project

**Research date:** 2026-07-14
**Valid until:** 2026-08-14 (30-day validity; stable libraries and architecture patterns)
