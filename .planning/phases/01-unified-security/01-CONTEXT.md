# Phase 1: Unified Security - Context

**Gathered:** 2026-07-14
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the foundational access control and event correlation pipeline. When complete, security operators will manage credentials, monitor door states in real time, correlate every access event with video evidence, and verify platform integrity through immutable audit trails. This is the data *producer* layer — visitor management, ANPR, incident management, analytics, and AI all depend on this pipeline being reliable and correctly architected.
</domain>

<decisions>
## Implementation Decisions

### MQTT Transport & Device Integration
- **D-01**: Use MQTT.js 5.15.2 as a custom NestJS microservice transport for door controller communication. Subscribe to hierarchical topic patterns `site/{id}/{deviceType}/{id}/{eventType}`. This is the native protocol of Mercury, Axis, and HID controllers — no Kafka or additional broker needed.
- **D-02**: Build a protocol adapter abstraction in the NestJS module to normalize manufacturer-specific topic schemas and payload formats. Only one controller protocol needs to work for Phase 1 (spike with at least one real controller or simulator during planning).
- **D-03**: Use QoS 1 with retained messages for reliable device state delivery. Implement sequence number validation on all controller messages to prevent out-of-order door state events.

### Door State Machine
- **D-04**: Model door state as an event-sourced state machine with explicit transitions: locked → unlocked → held-open → forced → unsecured → desynchronized. Never use booleans for door state.
- **D-05**: Validate every state transition against the allowed transition graph. Discard out-of-sequence messages based on controller-assigned monotonic sequence numbers.
- **D-06**: Implement a 500ms settling timeout after state changes before generating alerts, to prevent false alarms from brief state flickering.
- **D-07**: Configurable alert thresholds: held-open detection (30-300s), unsecured (immediate on schedule violation), forced-open (immediate).

### Credential Data Model
- **D-08**: Use a polymorphic credential base table with types: badge (proximity/Wiegand), PIN, mobile (wallet-based), QR code. Each credential type has its own validation logic but maps to a single User entity.
- **D-09**: Support mobile credentials via QR scanning at readers (Phase 1 minimum). Wallet-based NFC credentials (Apple/Google Wallet) deferred to Phase 2 alongside visitor management.

### Access Levels & Zone Rules
- **D-10**: Model access levels as an intersection matrix of zones × schedules. Compute effective access at read time via cached rule evaluation. A user's effective access = union of all access levels assigned to them.
- **D-11**: Schedules use time-of-day + day-of-week patterns. Support holiday overrides. Emergency mode (lockdown/unlock) bypasses all schedules per zone.
- **D-12**: Anti-passback is zone-scoped with a configurable timeout window (default 30s). Credential reuse within the timeout window in the same zone is denied if no exit event was recorded.

### Video-Event Correlation
- **D-13**: Access decisions (grant/deny) must be sub-100ms — the access event is written immediately and the decision returned. Video frame correlation and AI analysis happen asynchronously via BullMQ after the door decision. Never block physical access on video processing.
- **D-14**: Camera-to-door mapping is a first-class data model. Each door has one or more associated cameras. The correlation engine fetches the nearest video frame(s) around the event timestamp from the associated camera(s).
- **D-15**: The unified timeline view is a read-time merge of access events, door state changes, and video timestamps from TimescaleDB hypertables. Real-time event stream delivered via Socket.IO (extend existing gateway pattern).

### Audit Log Architecture
- **D-16**: Use TimescaleDB hypertable (not Prisma model) for the audit log with 7-day chunks and 90-day retention by default. Prisma manages reference/lookup tables only. Time-series tables use `$queryRaw` and a separate SQL migration directory.
- **D-17**: Implement pgcrypto SHA-256 hash chains per entity (not global). Each audit entry includes `previous_hash` → current `hash`. Verify chain integrity on read via a dedicated `/audit/verify` endpoint.
- **D-18**: A NestJS interceptor (`AuditInterceptor`) captures all mutation operations (create, update, delete) and writes hash-chained entries. Site-scoping applies to audit log queries.
- **D-19**: Fine-grained roles extend existing role hierarchy: admin, supervisor, operator, viewer, auditor. The auditor role has read-only access to all audit data but cannot modify system state.

### Tailgating Detection Integration
- **D-20**: Extend the existing AI inference pipeline (Ollama/vision models → frame-processing BullMQ queue) with a new tailgating detection path. When an access event occurs, the correlation engine triggers async analysis of frames 2-5 seconds after the door opens.
- **D-21**: Tailgating detection generates a new alert type linked to the original access event. The AI suppression/deduplication infrastructure must filter false positives before alerts reach operators.

### TimescaleDB + Prisma Coexistence
- **D-22**: Strict separation between Prisma-managed reference tables (users, credentials, zones, doors, cameras, access levels) and SQL-managed time-series tables (access_events, door_state_log, audit_log). Prisma migrations never touch time-series tables. A separate `migrations/timescaledb/` directory holds all hypertable DDL, continuous aggregates, compression policies, and retention policies.

### Event Bus Pattern
- **D-23**: Introduce a NestJS EventEmitter-based event bus for decoupled communication between access control, door management, video correlation, and alert domains. When an access event is persisted, emit `access.granted` or `access.denied` → door service records state transition → correlation engine triggers video fetch → alert service evaluates thresholds. This replaces direct service-to-service imports for cross-cutting event flows.

### Claude's Discretion
- BullMQ queue naming follows existing pattern (`access-events`, `door-alerts`, `audit-write`)
- API endpoint structure follows existing NestJS module conventions (`modules/access/`, `modules/door/`, `modules/correlation/`)
- Credential validation logic implementation details
- Schedule evaluation caching strategy (Redis)
- MQTT topic schema normalization implementation
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, validated requirements, key decisions
- `.planning/REQUIREMENTS.md` — v1 Requirements (ACC-01 through AUDT-03, AI-04 for this phase)
- `.planning/ROADMAP.md` — Phase 1 success criteria and requirements mapping

### Research
- `.planning/research/STACK.md` — Recommended technologies: TimescaleDB 2.18+, pgvector 0.8+, pgcrypto, MQTT.js 5.15.2
- `.planning/research/ARCHITECTURE.md` — Event bus pattern, door state machine, MQTT transport, TimescaleDB+Prisma separation
- `.planning/research/PITFALLS.md` — Critical: Prisma+TimescaleDB migration destruction (P1), door state race conditions (P2), audit log unbounded growth (P3)
- `.planning/research/FEATURES.md` — Table stakes for access control: credential management, door alarms, event journal, video correlation, audit trail

### Existing Codebase
- `.planning/codebase/ARCHITECTURE.md` — System diagram, data flows, module structure, entry points
- `.planning/codebase/STACK.md` — Existing stack: NestJS 10.4.8, Prisma 5.22.0, BullMQ 5.30.0, Socket.IO 4.8.3, Ollama
- `.planning/codebase/STRUCTURE.md` — Directory layout, `apps/api/src/modules/` has 15 existing modules
- `.planning/codebase/INTEGRATIONS.md` — External services: Ollama (`:11434`), PostgreSQL 16, Redis 7, FFmpeg
- `.planning/codebase/CONVENTIONS.md` — Naming, formatting, import patterns, validation (Zod + class-validator)

### Database
- `apps/api/prisma/schema.prisma` — Current Prisma schema (218 lines, 12 models, 6 enums) — all new reference tables go here
- `apps/api/prisma/migrations/` — Existing migration history
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **NestJS Module pattern**: All 15 existing modules follow `controller + service + module + spec` structure. New `access`, `door`, `correlation`, `audit` modules follow this convention.
- **ZodValidationPipe**: Shared Zod schemas from `@repo/shared` validate all request bodies. New schemas go in `packages/shared/src/schemas/`.
- **BullMQ queue infrastructure**: Existing `frame-processing` queue pattern in `apps/api/src/modules/queue/` can be extended for `access-events`, `door-alerts`, and `audit-write` queues.
- **Socket.IO gateway**: Existing `apps/api/src/modules/chat/chat.gateway.ts` pattern for real-time WebSocket. Extend or duplicate for access event streaming.
- **JWT auth + Roles guard**: `@Public()` and `@Roles()` decorators in `apps/api/src/common/decorators/` apply to new endpoints directly.
- **AuditService**: Existing `apps/api/src/modules/audit/audit.service.ts` can be extended or replaced with interceptor-based approach.
- **Inference/alert pipeline**: Existing `apps/api/src/modules/inference/` and `apps/api/src/modules/alert/` — tailgating detection feeds into this.

### Established Patterns
- **Zod + class-validator dual validation**: Runtime schemas in `@repo/shared`, Swagger DTOs in `apps/api/src/common/dto/`
- **Controller pattern**: Thin controllers (10-20 lines), business logic in services, `@Body(new ZodValidationPipe(schema))` on POST/PUT
- **Async processing**: BullMQ workers in `*.processor.ts` files, injected via `@InjectQueue()` and `@Processor()`
- **Error handling**: NestJS built-in exceptions + `AllExceptionsFilter` global catch
- **Pagination**: `{ data, total, page, limit }` response shape throughout API
- **Multi-site scoping**: Existing site module (`apps/api/src/modules/site/`) provides site-scoped queries — all new modules must respect site boundaries

### Integration Points
- **New NestJS modules**: `apps/api/src/modules/access/`, `apps/api/src/modules/door/`, `apps/api/src/modules/correlation/`, `apps/api/src/modules/audit/`
- **Custom MQTT transport**: `apps/api/src/mqtt/` or `apps/api/src/common/transports/` — integrates with NestJS lifecycle (onModuleInit, onModuleDestroy)
- **Event bus**: `@nestjs/event-emitter` package needs to be added to existing dependencies
- **TimescaleDB migrations**: New directory `apps/api/migrations/timescaledb/` separate from Prisma migrations
- **Dashboard pages**: New routes in `apps/dashboard/app/(dashboard)/access/`, `apps/dashboard/app/(dashboard)/doors/`, `apps/dashboard/app/(dashboard)/timeline/`
- **Mobile screens**: New tabs in `apps/mobile/app/(tabs)/` for access monitoring
- **Prisma schema**: New models (Credential, AccessLevel, Door, DoorState, CameraDoorMap, Zone, Schedule) in existing `schema.prisma`
</code_context>

<specifics>
## Specific Ideas

- The user explicitly prioritizes three modules as the highest value/feasibility combination: **intelligent access control + video-event correlation + door management/anomalies/incidents**.
- The user's vision is a unified platform where clicking any access event in the timeline immediately shows the associated video clip — this is the core UX flow for Phase 1.
- The user wants sub-second real-time alerting — access decisions and alert generation must not feel slow.
- Incident management basics (creation, triage, assignment) are in Phase 2, but the alert-to-incident pipeline foundation should be designed in Phase 1 to avoid rework.
</specifics>

<deferred>
## Deferred Ideas

### From Phase 1 Scope Boundary
- **Visitor management** → Phase 2 (depends on credential management from Phase 1)
- **ANPR/LPR** → Phase 2 (separate SDK, separate ingestion pipeline)
- **Incident management full lifecycle** → Phase 2 (depends on Phase 1 event pipeline for evidence linking)
- **AI assistant / natural language search** → Phase 2 (depends on event data from Phase 1)
- **Equipment health beyond door controllers** → Phase 3 (needs accumulated data)
- **Security analytics dashboards** → Phase 3 (needs historical event data)
- **Risk scoring** → Phase 3 (depends on analytics and event history)
- **Maintenance workflows** → Phase 3 (depends on equipment health)
- **OSDP support** → Phase 2+ (Wiegand is Phase 1 minimum; OSDP integration added incrementally)
- **Biometric credentials (fingerprint, iris)** → v2 (hardware integration complexity)
</deferred>

---

*Phase: 1-Unified Security*
*Context gathered: 2026-07-14*
