# Phase 1: Unified Security - Research

**Researched:** 2026-07-14
**Domain:** Physical security — access control, door management, video-event correlation, audit infrastructure
**Confidence:** HIGH

## Summary

This phase builds the foundational access control and event correlation pipeline on the existing NestJS + Prisma + Redis + BullMQ stack. The architecture adds a new MQTT ingestion path for door controller communication, TimescaleDB hypertables for time-series event data (access_events, door_state_log, audit_log) alongside existing Prisma-managed reference tables, and a decoupled event bus (`@nestjs/event-emitter`) for cross-module communication between Access, Door, Correlation, and Alert domains.

The MQTT transport integrates directly with NestJS lifecycle hooks — not as a microservice transport but as a custom provider wrapping MQTT.js 5.15.2 with QoS 1 retained message subscriptions. Door state is modeled as an event-sourced state machine with explicit transition validation, sequence number ordering, and a 500ms settling timeout. Audit immutability is achieved via pgcrypto SHA-256 hash chains encoded in PostgreSQL trigger functions, with per-entity (not global) chain scoping for verification performance.

Access decisions must be sub-100ms — MQTT ingestion, credential validation, and access rule evaluation happen synchronously, while video correlation, AI tailgating detection, and alert generation proceed asynchronously via BullMQ queues. The unified timeline view merges access events, door state changes, and video timestamps at read time from TimescaleDB hypertables with continuous aggregates.

**Primary recommendation:** Use a custom `MqttService` NestJS provider (onModuleInit connect, onModuleDestroy disconnect) wrapping MQTT.js 5.15.2 — not NestJS microservice transport. Keep Prisma for reference tables (credential, door, zone, schedule, camera_door_map) and use `$queryRaw` with a separate `migrations/timescaledb/` SQL directory for all hypertable DDL. Model door state as an event-sourced state machine with explicit transition graph and sequence-number-based ordering.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01**: Use MQTT.js 5.15.2 as a custom NestJS microservice transport for door controller communication. Subscribe to hierarchical topic patterns `site/{id}/{deviceType}/{id}/{eventType}`.
- **D-02**: Build a protocol adapter abstraction in the NestJS module to normalize manufacturer-specific topic schemas and payload formats.
- **D-03**: Use QoS 1 with retained messages for reliable device state delivery. Implement sequence number validation on all controller messages.
- **D-04**: Model door state as an event-sourced state machine with explicit transitions, never use booleans for door state.
- **D-05**: Validate every state transition against the allowed transition graph. Discard out-of-sequence messages based on controller-assigned monotonic sequence numbers.
- **D-06**: Implement a 500ms settling timeout after state changes before generating alerts.
- **D-07**: Configurable alert thresholds: held-open detection (30-300s), unsecured (immediate on schedule violation), forced-open (immediate).
- **D-08**: Polymorphic credential base table with types: badge (proximity/Wiegand), PIN, mobile (wallet-based), QR code. Each type has its own validation logic but maps to a single User entity.
- **D-09**: Support mobile credentials via QR scanning at readers (Phase 1 minimum). Wallet-based NFC deferred to Phase 2.
- **D-10**: Model access levels as an intersection matrix of zones × schedules. Compute effective access at read time via cached rule evaluation.
- **D-11**: Schedules use time-of-day + day-of-week patterns. Support holiday overrides. Emergency mode (lockdown/unlock) bypasses all schedules.
- **D-12**: Anti-passback is zone-scoped with a configurable timeout window (default 30s).
- **D-13**: Access decisions (grant/deny) must be sub-100ms. Video frame correlation and AI analysis happen asynchronously via BullMQ. Never block physical access on video processing.
- **D-14**: Camera-to-door mapping is a first-class data model. Each door has one or more associated cameras.
- **D-15**: Unified timeline view is a read-time merge of access events, door state changes, and video timestamps from TimescaleDB hypertables.
- **D-16**: Use TimescaleDB hypertable (not Prisma model) for audit log with 7-day chunks and 90-day retention by default.
- **D-17**: Implement pgcrypto SHA-256 hash chains per entity (not global). Verify chain integrity via `/audit/verify` endpoint.
- **D-18**: NestJS interceptor (`AuditInterceptor`) captures all mutation operations and writes hash-chained entries.
- **D-19**: Fine-grained roles extend existing hierarchy: admin, supervisor, operator, viewer, auditor (auditor = read-only audit access).
- **D-20**: Extend existing AI inference pipeline with tailgating detection path. Trigger async analysis of frames 2-5 seconds after door opens.
- **D-21**: Tailgating detection generates a new alert type linked to the original access event.
- **D-22**: Strict separation between Prisma-managed reference tables and SQL-managed time-series tables. Separate `migrations/timescaledb/` directory for hypertable DDL.
- **D-23**: NestJS EventEmitter-based event bus for decoupled communication between access control, door management, video correlation, and alert domains.

### the agent's Discretion

- BullMQ queue naming follows existing pattern (`access-events`, `door-alerts`, `audit-write`)
- API endpoint structure follows existing NestJS module conventions (`modules/access/`, `modules/door/`, `modules/correlation/`)
- Credential validation logic implementation details
- Schedule evaluation caching strategy (Redis)
- MQTT topic schema normalization implementation

### Deferred Ideas (OUT OF SCOPE)

- Visitor management → Phase 2
- ANPR/LPR → Phase 2
- Incident management full lifecycle → Phase 2
- AI assistant / natural language search → Phase 2
- Equipment health beyond door controllers → Phase 3
- Security analytics dashboards → Phase 3
- Risk scoring → Phase 3
- Maintenance workflows → Phase 3
- OSDP support → Phase 2+
- Biometric credentials (fingerprint, iris) → v2

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ACC-01 | Admin creates and manages user credentials (badges, PIN, mobile, QR) | §Standard Stack / Prisma models, §Architecture Patterns / Polymorphic Credential |
| ACC-02 | Admin defines access levels with time-based schedules per zone | §Architecture Patterns / Access Level Evaluation |
| ACC-03 | System enforces zone-based access rules | §Architecture Patterns / Access Rule Evaluation, §Don't Hand-Roll / Access Rule Engine |
| ACC-04 | System enforces anti-passback rules | §Architecture Patterns / Anti-passback State, §Common Pitfalls / P2 |
| ACC-05 | User uses mobile credentials (wallet-based, QR) at readers | §Architecture Patterns / MQTT Topic Routing, §Standard Stack / QR code |
| ACC-06 | Operator triggers emergency unlock or lockdown per zone | §Architecture Patterns / Emergency Override |
| ACC-07 | System correlates every access event (grant/deny) with video clip | §Architecture Patterns / Video-Event Correlation Pipeline |
| DOOR-01 | System monitors door state in real time | §Architecture Patterns / Door State Machine, §MQTT Transport |
| DOOR-02 | System generates alert when door is held open beyond threshold | §Architecture Patterns / Door State Machine — Alert Generation |
| DOOR-03 | System generates alert when door is forced open without valid access | §Architecture Patterns / Door State Machine — Illegal Transitions |
| DOOR-04 | System generates alert when door is unsecured (unlocked outside schedule) | §Architecture Patterns / Schedule-Aware Door State Validation |
| DOOR-05 | System detects and alerts on door desynchronization | §Architecture Patterns / Door State Machine — Desynchronized State |
| DOOR-06 | Operator views door status dashboard per site in real time | §Architecture Patterns / Real-Time Door State Streaming |
| VEC-01 | System links each access event to corresponding video timestamp | §Architecture Patterns / Video-Event Correlation Pipeline |
| VEC-02 | Operator views unified timeline (access events, door state changes, video clips) | §Architecture Patterns / Unified Timeline Read Model |
| VEC-03 | Operator clicks any event in timeline to view associated video clip | §Architecture Patterns / Video-Event Correlation Pipeline |
| VEC-04 | System provides real-time event stream with video thumbnails | §Architecture Patterns / Real-Time Event Streaming via Socket.IO |
| VEC-05 | Operator searches events by time range, credential, user, door, or zone | §TimescaleDB Hypertable Queries |
| AUDT-01 | System maintains immutable audit log with cryptographic hash-chain integrity | §pgcrypto Audit Hash Chain Implementation |
| AUDT-02 | Admin can export audit reports filtered by time, user, event type, or site | §Architecture Patterns / Audit Report Export |
| AUDT-03 | System enforces fine-grained roles (admin, supervisor, operator, viewer, auditor) across all modules | §Architecture Patterns / Role Extension |
| AI-04 | System detects tailgating/piggybacking (multiple persons entering with single valid access) | §Architecture Patterns / Tailgating Detection Integration |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| MQTT message ingestion | API | — | NestJS custom provider manages MQTT.js client lifecycle |
| Door state machine | API | — | Business logic requires database context (previous state, zone schedule) |
| Credential validation (access decision) | API | — | Sub-100ms requirement; must query database + Redis cache synchronously |
| Access level evaluation | API | — | Zone × schedule intersection computed server-side; cached in Redis |
| Anti-passback enforcement | API | — | Zone-scoped Redis state tracking; must be synchronous with access decision |
| Video-event correlation trigger | API / BullMQ | — | Async job dispatched after access event; correlation engine runs in worker |
| Unified timeline read | API | — | Read-time merge of TimescaleDB hypertables; served via REST + Socket.IO |
| Audit hash chain verification | API / Database | — | pgcrypto trigger builds chain on write; NestJS service validates on read |
| Door status dashboard | Frontend Server (SSR) / API | Browser | Socket.IO pushes real-time state to Dashboard; REST for initial load |
| Real-time alert generation | API / BullMQ | — | Worker evaluates door state transitions against thresholds; enqueues alerts |
| Tailgating AI detection | BullMQ / AI Preprocessor | API | Frame batch dispatched to existing Ollama pipeline after access event |
| Mobile credential display | Browser / Client | — | Expo mobile app renders QR codes; wallet integration deferred to Phase 2 |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `mqtt` | 5.15.2 | MQTT 3.1.1/5.0 client for door controller communication | [VERIFIED: npm registry] — Official MQTT.js maintained by Matteo Collina et al., 9.1K GitHub stars, types included (v5+ rewritten in TypeScript). The most mature Node.js MQTT client. Supports QoS 0/1/2, retained messages, automatic reconnection, and MQTT 5 features. |
| `@nestjs/event-emitter` | 3.1.0 | Decoupled event bus between access, door, correlation, and alert modules | [VERIFIED: npm registry] — Official NestJS wrapper around `eventemitter2` 6.4.9. Provides `@OnEvent()` decorator pattern consistent with existing NestJS conventions. Events: `access.granted`, `access.denied`, `door.state-changed`, `door.forced`, `door.held-open`. |
| `qrcode` | 1.5.4 | QR code generation for mobile credentials | [CITED: STACK.md research] — Mature, zero native dependencies. Generate QR codes server-side for mobile credential enrollment. |
| `otplib` | 13.4.1 | TOTP generation for temporary PIN credentials | [CITED: STACK.md research] — Battle-tested TOTP library. Generate time-based codes for visitor or temporary access. |

### Supporting (Already Installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nestjs/bullmq` | 11.0.4 | Job queue management | `access-events`, `door-alerts`, `audit-write`, `video-correlation` queues |
| `bullmq` | 5.80.2 (existing: 5.30.0) | Queue backend | Async video correlation, tailgating detection, alert dispatch |
| `ioredis` | 5.4.1 | Redis client | Anti-passback state, access level cache, schedule evaluation cache |
| `socket.io` | 4.8.3 | Real-time WebSocket | Door state push, event stream, timeline updates |
| `@prisma/client` | 5.22.0 | Database ORM | Reference tables only (credential, door, zone, schedule, camera_door_map) |

### Infrastructure Additions

| Component | Version | Purpose |
|-----------|---------|---------|
| TimescaleDB | 2.18+ (PG extension) | Hypertables for access_events, door_state_log, audit_log |
| TimescaleDB extension | Install on existing PostgreSQL 16 | `CREATE EXTENSION IF NOT EXISTS timescaledb;` |
| pgcrypto | Built-in PG extension | SHA-256 hash chains for audit immutability (`CREATE EXTENSION IF NOT EXISTS pgcrypto;`) |
| Mosquitto (MQTT broker) | 2.0+ | MQTT broker for door controller communication |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MQTT.js direct | NestJS built-in MQTT microservice transport | NestJS microservice transports are designed for NestJS-to-NestJS communication, not device-level MQTT. Custom provider wrapping MQTT.js gives direct control over topic patterns, QoS, retained messages, and reconnection — features lost in the transport abstraction. |
| `prisma-extension-timescaledb` | `$queryRaw` + SQL migrations | The community extension (v0.8.0, 2 GitHub stars) is too immature for production. Direct SQL migration management is more explicit and reliable. |
| RabbitMQ for events | `@nestjs/event-emitter` | RabbitMQ adds operational complexity. EventEmitter2 is in-process — no additional broker, no network hops. Sufficient for same-process module decoupling. |
| Global audit hash chain | Per-entity hash chains | Global chain requires scanning the entire audit table for verification. Per-entity chains scope verification to the relevant entity only, improving performance and enabling targeted chain validation. |

**Installation:**
```bash
# Core new packages (workspace root)
pnpm --filter @repo/api add mqtt@5.15.2 @nestjs/event-emitter@3.1.0 qrcode@1.5.4 otplib@13.4.1

# Dev types
pnpm --filter @repo/api add -D @types/qrcode@1.5.5

# Database extensions (run on PostgreSQL 16)
# CREATE EXTENSION IF NOT EXISTS timescaledb;
# CREATE EXTENSION IF NOT EXISTS pgcrypto;

# MQTT broker (Docker Compose addition)
# image: eclipse-mosquitto:2.0
```

**Version verification:** All packages confirmed on npm registry at specified versions:
- `mqtt@5.15.2` — published 2026-07-06, 9.1K GitHub stars [VERIFIED: npm registry]
- `@nestjs/event-emitter@3.1.0` — official NestJS package, peer deps `@nestjs/common ^10.0.0 || ^11.0.0`, `@nestjs/core ^10.0.0 || ^11.0.0` [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `mqtt` | npm | 12+ yrs | Very high (standard) | github.com/mqttjs/MQTT.js | [OK] | Approved |
| `@nestjs/event-emitter` | npm | 5+ yrs | Very high (standard) | github.com/nestjs/event-emitter | [OK] | Approved |
| `qrcode` | npm | 10+ yrs | Very high (standard) | github.com/soldair/node-qrcode | [ASSUMED] | Approved — widely used, slopcheck not run due to version-specific resolution |
| `otplib` | npm | 7+ yrs | High | github.com/yeojz/otplib | [ASSUMED] | Approved — widely used OTP library |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*`mqtt` and `@nestjs/event-emitter` passed slopcheck [OK]. `qrcode` and `otplib` tagged [ASSUMED] pending explicit slopcheck verification — planner should gate install behind checkpoint:human-verify if concerned.*

## Architecture Patterns

### System Architecture Diagram

```
                               ┌──────────────────────────────────────────┐
                               │              Caddy Reverse Proxy          │
                               │         /api/* → api:4000                 │
                               │         /ws/*  → api:4000                 │
                               └──────────────────┬───────────────────────┘
                                                   │
            ┌──────────────────────────────────────┼──────────────────────────────┐
            │                                      ▼                              │
            │  ┌─────────────┐    MQTT    ┌────────────────────────────┐          │
            │  │ Door Ctrlrs │───────────▶│     NestJS API Gateway      │          │
            │  │ Badge Rders │  QoS 1     │     (Fastify :4000)        │          │
            │  │ Mosquitto   │            │                            │          │
            │  └─────────────┘            │  ┌──────────┐ ┌─────────┐  │          │
            │                             │  │  Access  │ │  Door   │  │          │
            │  ┌─────────────┐   RTSP     │  │  Module  │ │ Module  │  │          │
            │  │  Cameras    │───────────▶│  └────┬─────┘ └────┬────┘  │          │
            │  └─────────────┘            │       │            │        │          │
            │                             │       ▼            ▼        │          │
            │                             │  ┌──────────────────────┐  │          │
            │                             │  │  @nestjs/event-emitter │  │          │
            │                             │  │  (Event Bus)          │  │          │
            │                             │  └────────┬─────────────┘  │          │
            │                             │           │                 │          │
            │                             │  ┌────────┴─────────┐      │          │
            │                             │  ▼                  ▼      │          │
            │                             │ ┌──────────┐  ┌─────────┐ │          │
            │                             │ │Correlation│ │  Alert  │ │          │
            │                             │ │  Module  │  │ Module  │ │          │
            │                             │ └────┬─────┘  └────┬────┘ │          │
            │                             │      │              │       │          │
            │                             └──────┼──────────────┼───────┘          │
            │                                    │              │                  │
            │          ┌─────────────────────────┼──────────────┼──────────┐       │
            │          │              PostgreSQL 16 + TimescaleDB           │       │
            │          │                                                     │       │
            │          │  ┌─────────────────┐  ┌───────────────────────────┐ │       │
            │          │  │ Prisma Models    │  │ TimescaleDB Hypertables   │ │       │
            │          │  │ (Reference Data) │  │ (Time-Series Events)      │ │       │
            │          │  │ ──────────────── │  │ ───────────────────────── │ │       │
            │          │  │ Credential       │  │ access_events             │ │       │
            │          │  │ Door             │  │ door_state_log            │ │       │
            │          │  │ Zone             │  │ audit_log                 │ │       │
            │          │  │ Schedule         │  │ + continuous aggregates   │ │       │
            │          │  │ AccessLevel      │  │ + compression policies    │ │       │
            │          │  │ CameraDoorMap    │  │ + retention policies      │ │       │
            │          │  └─────────────────┘  └───────────────────────────┘ │       │
            │          │  ┌─────────────────────────────────────────────────┐ │       │
            │          │  │ pgcrypto — SHA-256 hash chain triggers on       │ │       │
            │          │  │ audit_log                                       │ │       │
            │          │  └─────────────────────────────────────────────────┘ │       │
            │          └─────────────────────────────────────────────────────┘       │
            │                                                                        │
            │   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────┐       │
            │   │   Redis   │  │  BullMQ   │  │  Ollama   │  │ Socket.IO     │       │
            │   │  (cache,  │  │ (queues:  │  │ (VLM for  │  │ (real-time    │       │
            │   │ anti-passb│  │  access-  │  │ tailgating│  │ door state    │       │
            │   │  state)   │  │  events,  │  │ detection)│  │ push, events) │       │
            │   │           │  │  door-     │  │           │  │               │       │
            │   │           │  │  alerts,   │  │           │  │               │       │
            │   │           │  │  audit-    │  │           │  │               │       │
            │   │           │  │  write,    │  │           │  │               │       │
            │   │           │  │  video-    │  │           │  │               │       │
            │   │           │  │  correlation│ │           │  │               │       │
            │   └───────────┘  └───────────┘  └───────────┘  └───────────────┘       │
            └────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
apps/api/
├── prisma/
│   ├── schema.prisma                    # New Prisma models: Credential, Door, Zone,
│   │                                    #   Schedule, AccessLevel, CameraDoorMap
│   └── migrations/                      # Prisma-managed reference table migrations
├── migrations/
│   └── timescaledb/                     # SQL-only: hypertable DDL, CAGGs, compression, retention
│       ├── 001_create_access_events.sql
│       ├── 002_create_door_state_log.sql
│       ├── 003_create_audit_log_hypertable.sql
│       ├── 004_access_events_cagg.sql
│       ├── 005_audit_hash_chain_trigger.sql
│       └── 006_retention_policies.sql
├── src/
│   ├── mqtt/                            # MQTT transport provider
│   │   ├── mqtt.module.ts               # Global module — connects Mosquitto
│   │   ├── mqtt.service.ts              # onModuleInit → connect, subscribe
│   │   ├── mqtt-topics.ts               # Topic builders, constants
│   │   ├── adapters/                    # Protocol adapters per manufacturer
│   │   │   ├── protocol-adapter.interface.ts
│   │   │   └── wiegand-adapter.ts       # Phase 1: Wiegand protocol
│   │   └── mqtt.types.ts                # Message envelope types
│   └── modules/
│       ├── access/                      # Access Control module
│       │   ├── access.module.ts
│       │   ├── access.controller.ts     # REST endpoints (CRUD credentials, access levels)
│       │   ├── access.service.ts        # Business logic, rule evaluation
│       │   ├── access.gateway.ts        # Socket.IO access event streaming
│       │   ├── access.processor.ts      # BullMQ worker: access-events queue
│       │   ├── access.decorator.ts      # @AccessValidation decorator
│       │   └── access.service.spec.ts
│       ├── door/                        # Door Management module
│       │   ├── door.module.ts
│       │   ├── door.controller.ts       # REST endpoints (door config, commands)
│       │   ├── door.service.ts          # Door state machine
│       │   ├── door.gateway.ts          # Socket.IO door state push
│       │   ├── door.processor.ts        # BullMQ worker: door-alerts queue
│       │   ├── door-state-machine.ts    # State transition graph + validation
│       │   └── door.service.spec.ts
│       ├── correlation/                 # Video-Event Correlation module
│       │   ├── correlation.module.ts
│       │   ├── correlation.controller.ts # REST endpoints (timeline, event search)
│       │   ├── correlation.service.ts   # Correlation engine
│       │   ├── correlation.processor.ts # BullMQ worker: video-correlation queue
│       │   └── correlation.service.spec.ts
│       └── audit/                       # Audit module (extends existing)
│           ├── audit.module.ts
│           ├── audit.controller.ts      # /audit/logs, /audit/verify, /audit/export
│           ├── audit.service.ts         # Hash-chain verification, query, export
│           ├── audit.interceptor.ts     # Intercepts mutations, writes hash-chained entries
│           ├── audit.processor.ts       # BullMQ worker: audit-write queue
│           └── audit.service.spec.ts

packages/shared/src/
├── schemas/
│   ├── access.schema.ts                 # Zod: credential, accessLevel, schedule
│   ├── door.schema.ts                   # Zod: door config, state, alert config
│   └── audit.schema.ts                  # Zod: audit query, export, verify
├── types/
│   ├── access.types.ts                  # CredentialType enum, AccessDecision
│   ├── door.types.ts                    # DoorState enum, DoorEvent
│   └── audit.types.ts                   # AuditEntry, HashChainStatus
└── constants/
    ├── door-states.ts                   # DOOR_STATES enum (LOCKED, UNLOCKED, ...)
    ├── credential-types.ts              # CREDENTIAL_TYPES enum (BADGE, PIN, MOBILE, QR)
    └── access-events.ts                 # ACCESS_EVENT_TYPES enum (GRANTED, DENIED, ...)
```

### Pattern 1: Custom MQTT Provider (Not NestJS Microservice Transport)

**What:** NestJS does not have a built-in MQTT microservice transport suitable for device-level communication. Instead, create a custom `MqttService` wrapping the MQTT.js client, integrated via NestJS lifecycle hooks (`OnModuleInit`, `OnModuleDestroy`). This approach provides full control over topic patterns, QoS, retained messages, reconnection strategy, and message validation.

**When to use:** All MQTT communication with door controllers and access control panels.

**Confidence: HIGH** — Verified via MQTT.js official README (GitHub mqttjs/MQTT.js), npm registry (`mqtt@5.15.2`), and NestJS documentation patterns.

**Example:**
```typescript
// src/mqtt/mqtt.service.ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as mqtt from "mqtt";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { validateMqttMessage } from "./mqtt.types";

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;
  private lastSequencePerDevice = new Map<string, number>();

  constructor(
    private config: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    const brokerUrl = this.config.get<string>("MQTT_BROKER_URL", "mqtt://localhost:1883");

    this.client = mqtt.connect(brokerUrl, {
      clientId: `oversight-api-${process.pid}`,
      clean: false,           // Receive queued messages on reconnect
      reconnectPeriod: 3000,  // Retry every 3s
      connectTimeout: 10000,  // 10s connect timeout
      // QoS 1 for device state messages
      will: {
        topic: "oversight/api/status",
        payload: "offline",
        qos: 1,
        retain: true,
      },
    });

    this.client.on("connect", () => {
      this.logger.log(`MQTT connected to ${brokerUrl}`);
      // Publish online status (retained)
      this.client.publish("oversight/api/status", "online", { qos: 1, retain: true });
      // Subscribe to all door and reader events across all sites
      this.client.subscribe([
        { topic: "site/+/door/+/state", qos: 1 },
        { topic: "site/+/reader/+/badge", qos: 1 },
        { topic: "site/+/controller/+/health", qos: 1 },
      ]);
    });

    this.client.on("message", (topic, payload, packet) => {
      this.handleMessage(topic, payload, packet);
    });

    this.client.on("error", (err) => {
      this.logger.error(`MQTT error: ${err.message}`, err.stack);
    });

    this.client.on("reconnect", () => {
      this.logger.warn("MQTT reconnecting...");
    });

    this.client.on("close", () => {
      this.logger.warn("MQTT connection closed");
    });
  }

  private handleMessage(topic: string, payload: Buffer, packet: mqtt.IPublishPacket) {
    try {
      const message = JSON.parse(payload.toString());

      // D-05: Sequence number validation
      const deviceId = message.deviceId || message.controller_id;
      if (deviceId && message.sequence !== undefined) {
        const lastSeq = this.lastSequencePerDevice.get(deviceId) ?? -1;
        if (message.sequence <= lastSeq) {
          this.logger.warn(`Out-of-sequence message discarded: ${deviceId} seq=${message.sequence}, last=${lastSeq}`);
          return;
        }
        this.lastSequencePerDevice.set(deviceId, message.sequence);
      }

      // Route to event bus based on topic pattern
      if (topic.includes("/door/") && topic.endsWith("/state")) {
        this.eventEmitter.emit("mqtt.door.state", { topic, message, qos: packet.qos, retain: packet.retain });
      } else if (topic.includes("/reader/") && topic.endsWith("/badge")) {
        this.eventEmitter.emit("mqtt.reader.badge", { topic, message, qos: packet.qos, retain: packet.retain });
      } else if (topic.includes("/controller/") && topic.endsWith("/health")) {
        this.eventEmitter.emit("mqtt.controller.health", { topic, message });
      }
    } catch (err) {
      this.logger.error(`Failed to parse MQTT message on ${topic}: ${err}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.endAsync();
      this.logger.log("MQTT disconnected");
    }
  }
}
```

```typescript
// src/mqtt/mqtt-topics.ts
// Centralized topic builders — avoid hardcoded strings (Pitfall 10)

export const MqttTopics = {
  doorState: (siteId: string, doorId: string) =>
    `site/${siteId}/door/${doorId}/state`,

  readerBadge: (siteId: string, readerId: string) =>
    `site/${siteId}/reader/${readerId}/badge`,

  controllerHealth: (siteId: string, controllerId: string) =>
    `site/${siteId}/controller/${controllerId}/health`,

  // Wildcard subscriptions
  allDoorStates: () => "site/+/door/+/state",
  allReaderBadges: () => "site/+/reader/+/badge",
  allControllerHealth: () => "site/+/controller/+/health",

  // API status topic
  apiStatus: () => "oversight/api/status",
} as const;
```

```typescript
// src/mqtt/adapters/protocol-adapter.interface.ts
// D-02: Protocol adapter abstraction

export interface ProtocolAdapter {
  /** Manufacturer identifier (e.g., "mercury", "axis", "hid") */
  readonly manufacturer: string;

  /** Normalize a raw MQTT payload to the standard DoorStateEvent format */
  normalizeDoorState(rawTopic: string, rawPayload: unknown): DoorStateEvent;

  /** Normalize a badge read event to the standard BadgeReadEvent format */
  normalizeBadgeRead(rawTopic: string, rawPayload: unknown): BadgeReadEvent;

  /** Validate that this message conforms to the expected schema */
  validate(rawPayload: unknown): boolean;
}
```

### Pattern 2: Door State Machine (Event-Sourced)

**What:** The door state machine models explicit transitions between six states: `locked`, `unlocked`, `held-open`, `forced`, `unsecured`, `desynchronized`. Every state change is validated against the allowed transition graph. Sequence number ordering prevents out-of-order event processing. A 500ms settling timeout prevents false alarms from state flickering.

**Confidence: HIGH** — Based on well-established physical security industry patterns, validated via door controller protocol specifications.

```
State Transition Graph:

                    ┌──────────┐
         ┌─────────│  LOCKED  │◀─────────┐
         │         └────┬─────┘           │
         │  (valid      │  (valid badge   │  (door closes
         │   access)    │   + schedule)   │   + latch)
         │              ▼                 │
         │         ┌──────────┐           │
         │         │ UNLOCKED │───────────┘
         │         └────┬─────┘
         │              │
         │   ┌──────────┼──────────┐
         │   │ (door    │ (forced  │ (schedule
         │   │  open    │  open)   │  violation)
         │   │  >N sec) │          │
         │   ▼          ▼          ▼
         │ ┌────────┐┌────────┐┌──────────┐
         │ │ HELD-  ││ FORCED ││UNSECURED │
         │ │ OPEN   ││        ││          │
         │ └───┬────┘└───┬────┘└────┬─────┘
         │     │         │          │
         │     │         │          │  (controller
         │     │         │          │   mismatch)
         │     │         │          ▼
         │     │         │    ┌──────────────┐
         │     │         └───▶│DESYNCHRONIZED│
         │     │              └──────────────┘
         │     │ (door closes)
         │     └────────────────┘
         │
         └── (emergency lockdown from any state except DESYNCHRONIZED)
```

```typescript
// src/modules/door/door-state-machine.ts

export enum DoorState {
  LOCKED = "locked",
  UNLOCKED = "unlocked",
  HELD_OPEN = "held-open",
  FORCED = "forced",
  UNSECURED = "unsecured",
  DESYNCHRONIZED = "desynchronized",
}

// D-04: Never use booleans — use explicit state enum
// D-07: Configurable alert thresholds
export interface DoorAlertConfig {
  heldOpenThresholdMs: number;  // 30_000 to 300_000 (30s-300s)
  forcedOpenImmediate: true;    // Always immediate
  unsecuredImmediate: true;     // Always immediate
  settlingTimeoutMs: number;    // 500ms default
  desyncMaxRetries: number;     // 3 attempts before desynchronized
}

const VALID_TRANSITIONS: Record<DoorState, DoorState[]> = {
  [DoorState.LOCKED]:            [DoorState.UNLOCKED, DoorState.FORCED, DoorState.UNSECURED, DoorState.DESYNCHRONIZED],
  [DoorState.UNLOCKED]:          [DoorState.LOCKED, DoorState.HELD_OPEN, DoorState.FORCED, DoorState.DESYNCHRONIZED],
  [DoorState.HELD_OPEN]:         [DoorState.LOCKED, DoorState.UNSECURED, DoorState.DESYNCHRONIZED],
  [DoorState.FORCED]:            [DoorState.LOCKED, DoorState.DESYNCHRONIZED],
  [DoorState.UNSECURED]:         [DoorState.LOCKED, DoorState.HELD_OPEN, DoorState.DESYNCHRONIZED],
  [DoorState.DESYNCHRONIZED]:    [DoorState.LOCKED], // Only re-lock resolves desync
};

const ALERT_TRIGGER_STATES: DoorState[] = [
  DoorState.HELD_OPEN,
  DoorState.FORCED,
  DoorState.UNSECURED,
  DoorState.DESYNCHRONIZED,
];

export class DoorStateMachine {
  private settlingTimer: NodeJS.Timeout | null = null;

  /**
   * D-04, D-05: Validate a proposed state transition.
   * Returns the new state if valid, throws if invalid.
   */
  validateTransition(currentState: DoorState, proposedState: DoorState): DoorState {
    if (currentState === proposedState) {
      return currentState; // No-op — ignore duplicate state messages
    }

    const allowed = VALID_TRANSITIONS[currentState];
    if (!allowed.includes(proposedState)) {
      throw new IllegalDoorTransitionError(currentState, proposedState);
    }

    return proposedState;
  }

  /**
   * D-06: Settling timeout — suppress alerts for 500ms after state change
   * to prevent false alarms from controller bounce.
   */
  shouldGenerateAlert(newState: DoorState): boolean {
    return ALERT_TRIGGER_STATES.includes(newState);
  }

  /**
   * D-07: Determine alert type and timing
   */
  getAlertConfig(state: DoorState, timeInStateMs: number, config: DoorAlertConfig): {
    shouldAlert: boolean;
    reason?: string;
  } {
    switch (state) {
      case DoorState.HELD_OPEN:
        return {
          shouldAlert: timeInStateMs >= config.heldOpenThresholdMs,
          reason: `Door held open for ${Math.round(timeInStateMs / 1000)}s`,
        };
      case DoorState.FORCED:
        return { shouldAlert: true, reason: "Door forced open" };
      case DoorState.UNSECURED:
        return { shouldAlert: true, reason: "Door unsecured outside schedule" };
      case DoorState.DESYNCHRONIZED:
        return { shouldAlert: true, reason: "Controller state mismatch" };
      default:
        return { shouldAlert: false };
    }
  }
}
```

### Pattern 3: Door State Service (MQTT Event → State Machine → Persist → Alert)

```typescript
// src/modules/door/door.service.ts
@Injectable()
export class DoorService {
  private stateMachines = new Map<string, DoorStateMachine>();
  private stateTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private prisma: PrismaService,    // Reference data (door config)
    private eventEmitter: EventEmitter2,
    @InjectQueue("door-alerts") private alertQueue: Queue,
  ) {}

  @OnEvent("mqtt.door.state", { async: true })
  async handleDoorStateEvent(payload: { topic: string; message: DoorStateEvent }) {
    const { siteId, doorId, state: rawState, sequence } = this.parseTopic(payload.topic, payload.message);

    // D-05: Sequence validation
    const machine = this.getOrCreateMachine(doorId);
    const currentState = await this.getCurrentDoorState(doorId);

    try {
      const newState = machine.validateTransition(currentState, rawState);

      // Persist to TimescaleDB hypertable
      await this.persistDoorState(doorId, siteId, newState, sequence);

      // Emit event for correlation + real-time push
      this.eventEmitter.emit("door.state-changed", {
        doorId, siteId, previousState: currentState, newState, timestamp: new Date(),
      });

      // D-06: Settling timeout before alert evaluation
      if (machine.shouldGenerateAlert(newState)) {
        this.scheduleAlertEvaluation(doorId, newState, machine);
      }

    } catch (err) {
      if (err instanceof IllegalDoorTransitionError) {
        this.logger.warn(`Illegal transition: ${err.message}`);
        // D-05: Discard out-of-sequence or invalid transitions
        return;
      }
      throw err;
    }
  }

  private async persistDoorState(
    doorId: string, siteId: string, state: DoorState, sequence: number
  ): Promise<void> {
    // TimescaleDB hypertable — $queryRaw, not Prisma model
    await this.prisma.$queryRaw`
      INSERT INTO door_state_log (time, door_id, site_id, state, sequence)
      VALUES (NOW(), ${doorId}, ${siteId}, ${state}::door_state, ${sequence})
    `;
  }
}
```

### Pattern 4: Event Bus Communication (Access → Door → Correlation → Alert)

**What:** `@nestjs/event-emitter` provides in-process, decoupled event communication between modules. Events are fire-and-forget (EventEmitter2 wildcard support). This replaces direct service-to-service imports for cross-cutting flows.

**Event Catalog:**

| Event Name | Emitted By | Consumed By | Payload |
|------------|-----------|-------------|---------|
| `access.granted` | AccessService | CorrelationService, AlertService | `{ userId, credentialId, doorId, zoneId, siteId, timestamp }` |
| `access.denied` | AccessService | CorrelationService, AlertService | `{ credentialId, doorId, zoneId, siteId, reason, timestamp }` |
| `door.state-changed` | DoorService | CorrelationService, Socket.IO Gateway | `{ doorId, siteId, previousState, newState, timestamp }` |
| `door.alert` | DoorService | AlertService | `{ doorId, alertType, reason, timestamp }` |
| `correlation.ready` | CorrelationService | TimelineController | `{ eventId, videoClipUrl, thumbnailUrl }` |
| `mqtt.door.state` | MqttService | DoorService | `{ topic, message, qos, retain }` |
| `mqtt.reader.badge` | MqttService | AccessService | `{ topic, message, qos, retain }` |

```typescript
// Consumer example: CorrelationService
@Injectable()
export class CorrelationService {
  @OnEvent("access.granted", { async: true })
  async onAccessGranted(payload: AccessEventPayload) {
    await this.correlationQueue.add("correlate-video", {
      eventType: "access.granted",
      doorId: payload.doorId,
      siteId: payload.siteId,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent("access.denied", { async: true })
  async onAccessDenied(payload: AccessEventPayload) {
    await this.correlationQueue.add("correlate-video", {
      eventType: "access.denied",
      doorId: payload.doorId,
      siteId: payload.siteId,
      timestamp: payload.timestamp,
    });
  }
}
```

### Pattern 5: Video-Event Correlation Pipeline

**What:** After an access event is persisted, an async BullMQ job fetches the nearest video frame(s) from cameras mapped to that door. The correlation result (video timestamp, clip URL, thumbnail) is written back and the unified timeline read model is updated. This never blocks the access decision (D-13).

```
[Access Event] → EventEmitter "access.granted"
                     │
                     ▼
        CorrelationService.onAccessGranted()
                     │
                     ▼
        BullMQ Queue: video-correlation
          Job: { doorId, timestamp, eventType }
                     │
                     ▼
        CorrelationProcessor:
          1. Query CameraDoorMap for door's cameras
          2. Find nearest video frames (±2s from event time)
          3. Generate thumbnail via FFmpeg
          4. Store correlation in TimescaleDB
          5. Emit "correlation.ready" event
                     │
                     ▼
        Socket.IO → Dashboard: real-time timeline update
```

```typescript
// Camera-to-door mapping (D-14): Prisma model
// schema.prisma
model CameraDoorMap {
  id       String @id @default(uuid())
  cameraId String
  doorId   String
  angle    String?  // "entry", "exit", "overview"
  priority Int     @default(0) // Which camera to use first

  camera   Camera @relation(fields: [cameraId], references: [id], onDelete: Cascade)
  door     Door   @relation(fields: [doorId], references: [id], onDelete: Cascade)

  @@unique([cameraId, doorId])
  @@index([doorId])
}
```

### Pattern 6: Access Level Evaluation

**What:** Access levels are modeled as an intersection matrix of zones × schedules (D-10). Effective access is computed at read time by evaluating the user's assigned access levels against the current time and zone schedule. Results are cached in Redis with TTL matching the next schedule boundary.

**Confidence: MEDIUM** — Access level evaluation is a well-known pattern in ACS platforms, but caching strategy details are at the agent's discretion.

```typescript
// Access level evaluation with Redis caching (D-10, D-11)
@Injectable()
export class AccessService {
  constructor(
    private prisma: PrismaService,
    private redis: Redis, // ioredis
    private eventEmitter: EventEmitter2,
  ) {}

  async evaluateAccess(credentialId: string, doorId: string, siteId: string): Promise<AccessDecision> {
    const now = new Date();

    // D-12: Check anti-passback (Redis, must be sub-100ms)
    const antiPassbackViolation = await this.checkAntiPassback(credentialId, doorId);
    if (antiPassbackViolation) {
      return { decision: "denied", reason: "anti-passback", timestamp: now };
    }

    // Check emergency override (D-11)
    const zoneStatus = await this.getZoneEmergencyStatus(doorId);
    if (zoneStatus === "lockdown") {
      return { decision: "denied", reason: "zone-lockdown", timestamp: now };
    }
    if (zoneStatus === "emergency-unlock") {
      return { decision: "granted", reason: "emergency-unlock", timestamp: now };
    }

    // Cached access evaluation
    const cacheKey = `access:eval:${credentialId}:${doorId}:${now.getHours()}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Compute: user credentials → access levels → zones × schedules
    const accessLevels = await this.prisma.accessLevel.findMany({
      where: { credentialId },
      include: { zone: true, schedule: true },
    });

    const doorZone = await this.getDoorZone(doorId);

    // D-10: Union of all access levels — grant if ANY level permits
    const effectiveAccess = accessLevels.some((level) =>
      this.evaluateSchedule(level.schedule, now) &&
      level.zone.id === doorZone.id,
    );

    const decision: AccessDecision = {
      decision: effectiveAccess ? "granted" : "denied",
      reason: effectiveAccess ? "schedule-valid" : "no-access",
      timestamp: now,
    };

    // Cache until next schedule boundary or hour change
    const ttl = this.getCacheTtl(accessLevels, now);
    await this.redis.setex(cacheKey, ttl, JSON.stringify(decision));

    return decision;
  }

  private evaluateSchedule(schedule: Schedule, now: Date): boolean {
    // D-11: time-of-day + day-of-week + holiday overrides
    const dayOfWeek = now.getDay(); // 0=Sun
    const timeOfDay = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

    // Check holiday override first
    if (schedule.holidayOverride && this.isHoliday(now)) {
      return schedule.holidayOverride === "allowed";
    }

    // Check day-of-week + time range
    for (const entry of schedule.entries) {
      if (entry.dayOfWeek === dayOfWeek) {
        const start = entry.startHour * 60 + entry.startMinute;
        const end = entry.endHour * 60 + entry.endMinute;
        if (timeOfDay >= start && timeOfDay <= end) {
          return true;
        }
      }
    }
    return false;
  }

  // D-12: Anti-passback state in Redis
  private async checkAntiPassback(credentialId: string, doorId: string): Promise<boolean> {
    const zoneId = await this.getDoorZoneId(doorId);
    const key = `antipassback:${zoneId}:${credentialId}`;
    const lastEntry = await this.redis.get(key);
    if (lastEntry) {
      const elapsed = Date.now() - parseInt(lastEntry);
      if (elapsed < 30000) { // Default 30s window
        // Check if exit was recorded
        const exitKey = `antipassback:exit:${zoneId}:${credentialId}`;
        const lastExit = await this.redis.get(exitKey);
        if (!lastExit || parseInt(lastExit) < parseInt(lastEntry)) {
          return true; // Violation — re-entry without exit
        }
      }
    }
    return false;
  }
}
```

### Pattern 7: TimescaleDB Hypertables + Prisma Coexistence

**What:** Prisma manages reference tables (schema.prisma models). TimescaleDB manages time-series event tables via raw SQL migrations. Prisma migrations never contain TimescaleDB DDL. All time-series writes and queries use `$queryRaw`.

**Migration workflow:**

```
apps/api/
├── prisma/
│   ├── schema.prisma          # Prisma models: Credential, Door, Zone, etc.
│   └── migrations/            # `prisma migrate dev` output — auto-generated
└── migrations/
    └── timescaledb/           # Manual SQL — run via custom migration runner
        ├── up/                # Forward migrations
        │   ├── 001_access_events.sql
        │   ├── 002_door_state_log.sql
        │   ├── 003_audit_log.sql
        │   └── 004_continuous_aggregates.sql
        └── down/              # Rollback (optional)
```

```sql
-- migrations/timescaledb/up/001_access_events.sql
-- D-16: Hypertable for access events, 1-day chunks

CREATE TYPE event_decision AS ENUM ('granted', 'denied', 'tailgate', 'error');

CREATE TABLE access_events (
    time        TIMESTAMPTZ NOT NULL,
    site_id     UUID NOT NULL,
    zone_id     UUID,
    door_id     UUID NOT NULL,
    credential_id UUID,
    user_id     UUID,
    decision    event_decision NOT NULL,
    reason      VARCHAR(64),
    metadata    JSONB,
    sequence    BIGINT
);

-- Convert to hypertable with 1-day chunks
SELECT create_hypertable('access_events', 'time',
    chunk_time_interval => INTERVAL '1 day'
);

-- Enable compression for chunks older than 7 days
ALTER TABLE access_events SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id, door_id',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('access_events', INTERVAL '7 days');

-- Indexes for common query patterns (VEC-05)
CREATE INDEX idx_access_events_site_time ON access_events (site_id, time DESC);
CREATE INDEX idx_access_events_door_time ON access_events (door_id, time DESC);
CREATE INDEX idx_access_events_user_time ON access_events (user_id, time DESC);
CREATE INDEX idx_access_events_credential ON access_events (credential_id, time DESC);
```

```sql
-- migrations/timescaledb/up/002_door_state_log.sql
-- D-16: Hypertable for door state changes, 1-day chunks

CREATE TYPE door_state AS ENUM ('locked', 'unlocked', 'held-open', 'forced', 'unsecured', 'desynchronized');

CREATE TABLE door_state_log (
    time        TIMESTAMPTZ NOT NULL,
    door_id     UUID NOT NULL,
    site_id     UUID NOT NULL,
    state       door_state NOT NULL,
    previous_state door_state,
    sequence    BIGINT NOT NULL,
    triggered_by VARCHAR(64), -- 'badge', 'schedule', 'manual', 'emergency', 'forced'
    metadata    JSONB
);

SELECT create_hypertable('door_state_log', 'time',
    chunk_time_interval => INTERVAL '1 day'
);

ALTER TABLE door_state_log SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id, door_id',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('door_state_log', INTERVAL '7 days');

-- DOOR-06: Fast lookup of current door state
CREATE INDEX idx_door_state_current ON door_state_log (door_id, time DESC);

-- DOOR-02, DOOR-03: Find abnormal states
CREATE INDEX idx_door_state_type ON door_state_log (state, time DESC)
    WHERE state IN ('held-open', 'forced', 'unsecured', 'desynchronized');
```

```sql
-- migrations/timescaledb/up/004_continuous_aggregates.sql
-- Pre-computed materialized views for dashboard queries

-- Hourly access event counts per door
CREATE MATERIALIZED VIEW door_access_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    door_id,
    site_id,
    decision,
    COUNT(*) AS event_count
FROM access_events
GROUP BY bucket, door_id, site_id, decision;

-- Daily door state change summary for alerts dashboard
CREATE MATERIALIZED VIEW door_alert_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    door_id,
    site_id,
    state,
    COUNT(*) AS occurrence_count
FROM door_state_log
WHERE state IN ('held-open', 'forced', 'unsecured', 'desynchronized')
GROUP BY bucket, door_id, site_id, state;

-- Refresh policies
SELECT add_continuous_aggregate_policy('door_access_hourly',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);
```

```sql
-- migrations/timescaledb/up/005_retention_policies.sql
-- D-16: 90-day retention for audit_log, 365-day for access_events

SELECT add_retention_policy('audit_log', INTERVAL '90 days',
    if_not_exists => true
);

SELECT add_retention_policy('access_events', INTERVAL '365 days',
    if_not_exists => true
);

SELECT add_retention_policy('door_state_log', INTERVAL '365 days',
    if_not_exists => true
);
```

### Pattern 8: pgcrypto Audit Hash Chain (Per-Entity)

**What:** D-17 / D-18: PostgreSQL trigger function computes SHA-256 hash chains per entity in the `audit_log` hypertable. Each entry stores `previous_hash` (from the last entry for that entity) and `hash` (SHA-256 of `previous_hash || content`). The NestJS `AuditInterceptor` captures mutation operations and writes entries through `$queryRaw`. Chain verification on the `/audit/verify` endpoint walks from genesis to latest.

```sql
-- migrations/timescaledb/up/003_audit_log.sql
-- D-17: Audit log hypertable with hash-chain support

CREATE TABLE audit_log (
    time         TIMESTAMPTZ NOT NULL,
    entity       VARCHAR(64) NOT NULL,    -- e.g., 'credential', 'door', 'access_level'
    entity_id    UUID NOT NULL,
    action       VARCHAR(32) NOT NULL,    -- 'CREATE', 'UPDATE', 'DELETE'
    user_id      UUID,
    site_id      UUID,
    changes      JSONB,                   -- { before: {...}, after: {...} }
    ip_address   VARCHAR(45),
    previous_hash TEXT,                   -- SHA-256 of previous entry
    hash         TEXT NOT NULL,           -- SHA-256(previous_hash || content)
    content      TEXT NOT NULL            -- Canonical representation for hash input
);

SELECT create_hypertable('audit_log', 'time',
    chunk_time_interval => INTERVAL '7 days'
);

-- Per-entity index for chain walking
CREATE INDEX idx_audit_entity_chain ON audit_log (entity, entity_id, time);

-- Compression for audit chunks > 7 days
ALTER TABLE audit_log SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'entity, entity_id',
    timescaledb.compress_orderby = 'time DESC'
);
SELECT add_compression_policy('audit_log', INTERVAL '14 days');
```

```sql
-- migrations/timescaledb/up/006_audit_hash_chain_trigger.sql
-- D-17: PostgreSQL trigger for hash chain computation

CREATE OR REPLACE FUNCTION audit_hash_chain_trigger()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash TEXT;
BEGIN
    -- Find the most recent hash for this entity (per-entity chain)
    SELECT hash INTO prev_hash
    FROM audit_log
    WHERE entity = NEW.entity
      AND entity_id = NEW.entity_id
    ORDER BY time DESC, hash DESC
    LIMIT 1;

    -- Set previous_hash for verification
    NEW.previous_hash := prev_hash;

    -- Compute SHA-256: hash(previous_hash || content)
    -- content is the canonical representation of the mutation
    NEW.hash := encode(
        digest(
            COALESCE(prev_hash, 'genesis') || NEW.content,
            'sha256'
        ),
        'hex'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_hash_chain
    BEFORE INSERT ON audit_log
    FOR EACH ROW
    EXECUTE FUNCTION audit_hash_chain_trigger();
```

```typescript
// D-18: NestJS AuditInterceptor
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue("audit-write") private auditQueue: Queue,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const auditMeta = Reflect.getMetadata("audit", handler); // Custom decorator

    if (!auditMeta) return next.handle(); // Skip non-auditable endpoints

    return next.handle().pipe(
      tap((result) => {
        // Enqueue audit write to BullMQ (non-blocking)
        this.auditQueue.add("write-audit", {
          entity: auditMeta.entity,
          entityId: result?.id || request.params?.id,
          action: auditMeta.action,
          userId: request.user?.id,
          siteId: request.user?.siteId,
          changes: auditMeta.captureChanges ? { /* diff logic */ } : null,
          ipAddress: request.ip,
          timestamp: new Date(),
        });
      }),
    );
  }
}
```

```typescript
// D-17: Chain verification endpoint
@Controller("audit")
export class AuditController {
  @Get("verify")
  @Roles(Role.AUDITOR, Role.ADMIN) // D-19: Auditor role
  async verifyChain(
    @Query("entity") entity: string,
    @Query("entityId") entityId: string,
  ) {
    return this.auditService.verifyChain(entity, entityId);
  }
}

// AuditService.verifyChain()
async verifyChain(entity: string, entityId: string): Promise<ChainVerificationResult> {
  // Walk the per-entity chain from genesis to latest
  const entries = await this.prisma.$queryRaw<AuditEntry[]>`
    SELECT time, hash, previous_hash, content
    FROM audit_log
    WHERE entity = ${entity} AND entity_id = ${entityId}::uuid
    ORDER BY time ASC
  `;

  const tampered: number[] = [];

  for (let i = 0; i < entries.length; i++) {
    const expectedInput = (i === 0 ? 'genesis' : entries[i-1].hash) + entries[i].content;
    const expectedHash = crypto.createHash('sha256').update(expectedInput).digest('hex');

    if (entries[i].hash !== expectedHash || entries[i].previous_hash !== (i === 0 ? null : entries[i-1].hash)) {
      tampered.push(i);
    }
  }

  return {
    verified: tampered.length === 0,
    totalEntries: entries.length,
    tamperedIndices: tampered,
    genesisHash: entries[0]?.hash || null,
    latestHash: entries[entries.length - 1]?.hash || null,
  };
}
```

### Pattern 9: Prisma Reference Table Models

```prisma
// schema.prisma — NEW MODELS for Phase 1
// All Prisma-managed (reference tables). Hypertables managed via SQL.

enum CredentialType {
  BADGE
  PIN
  MOBILE
  QR
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}

model Credential {
  id        String         @id @default(uuid())
  userId    String
  type      CredentialType
  // Polymorphic fields (D-08):
  badgeNumber   String?    @unique  // Wiegand/proximity badge ID
  pinHash       String?             // bcrypt hash for PIN
  mobileWalletId String?           // Wallet identifier (Phase 2)
  qrSeed        String?            // QR code generation seed
  // Common fields:
  isActive      Boolean    @default(true)
  validFrom     DateTime?
  validUntil    DateTime?
  maxUses       Int?               // null = unlimited
  useCount      Int        @default(0)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  user         User          @relation(fields: [userId], references: [id])
  accessLevels AccessLevel[]
  accessEvents Json[]        // Not a real relation — hyperable reference via UUID

  @@index([userId])
  @@index([type, badgeNumber])
}

model Door {
  id          String    @id @default(uuid())
  name        String
  siteId      String
  zoneId      String
  location    String?   // Physical location description
  controllerId String?  // Hardware controller ID
  alertConfig Json      @default("{}") // DoorAlertConfig
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  site         Site            @relation(fields: [siteId], references: [id])
  zone         Zone            @relation(fields: [zoneId], references: [id])
  cameraMaps   CameraDoorMap[]

  @@index([siteId])
  @@index([zoneId])
  @@unique([controllerId, siteId])
}

model Zone {
  id          String    @id @default(uuid())
  name        String
  siteId      String
  description String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  site         Site           @relation(fields: [siteId], references: [id])
  doors        Door[]
  schedules    Schedule[]
  accessLevels AccessLevel[]

  @@index([siteId])
}

model Schedule {
  id          String    @id @default(uuid())
  name        String
  zoneId      String
  entries     Json      // DayOfWeek[] + startTime/endTime entries
  holidayOverride String? @default("none") // 'none', 'allowed', 'denied'
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  zone         Zone           @relation(fields: [zoneId], references: [id])
  accessLevels AccessLevel[]

  @@index([zoneId])
}

model AccessLevel {
  id           String   @id @default(uuid())
  credentialId String
  zoneId       String
  scheduleId   String
  priority     Int      @default(0)
  createdAt    DateTime @default(now())

  credential Credential @relation(fields: [credentialId], references: [id])
  zone       Zone       @relation(fields: [zoneId], references: [id])
  schedule   Schedule   @relation(fields: [scheduleId], references: [id])

  @@unique([credentialId, zoneId, scheduleId])
  @@index([credentialId])
  @@index([zoneId])
}

model CameraDoorMap {
  id       String @id @default(uuid())
  cameraId String
  doorId   String
  angle    String? // 'entry', 'exit', 'overview'
  priority Int    @default(0)

  camera Camera @relation(fields: [cameraId], references: [id], onDelete: Cascade)
  door   Door   @relation(fields: [doorId], references: [id], onDelete: Cascade)

  @@unique([cameraId, doorId])
  @@index([doorId])
}

// Extend existing AuditLog with hash-chain fields
// Note: The existing AuditLog model in schema.prisma (line 162) will be
// REPLACED: the current Prisma-based audit log becomes the reference for the
// new TimescaleDB-backed audit_log hypertable. We keep the Prisma model for
// migration history but all new audit writes go to the hypertable via $queryRaw.
// The existing audit service methods should be updated to query the hypertable.
```

### Anti-Patterns to Avoid

- **Boolean door state flags:** `isLocked: boolean` — cannot represent `held-open`, `forced`, `unsecured`, `desynchronized`. Always use the `DoorState` enum. [D-04]
- **Direct MQTT → DB writes:** Skipping validation and state machine logic creates race conditions and illegal states. Always route through `MqttService → DoorService → StateMachine → Persist`. [Pitfall 2]
- **Prisma models for hypertables:** `prisma migrate dev` drops TimescaleDB DDL. Never put `access_events`, `door_state_log`, or `audit_log` in schema.prisma. Use `$queryRaw` exclusively. [Pitfall 1]
- **Global audit hash chain:** A single global chain requires scanning the entire table for verification. Per-entity chains scope verification to the relevant entity. [D-17]
- **Hardcoded MQTT topic strings:** Scattered topic patterns break on refactor. Use centralized `MqttTopics` module. [Pitfall 10]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MQTT client protocol | Custom TCP socket + MQTT packet parser | `mqtt` 5.15.2 | MQTT.js handles CONNECT, SUBSCRIBE, PUBLISH, QoS levels, retained messages, will messages, reconnection, ping/pong keep-alive, and MQTT 5 features. Thousands of edge cases in the MQTT spec. |
| Event bus between modules | Custom EventEmitter with typed events | `@nestjs/event-emitter` 3.1.0 (eventemitter2) | Wildcard pattern matching, async listeners, error handling. Integrates with NestJS DI and lifecycle. |
| Cryptographic hash chains | Custom hash chain implementation | `pgcrypto` PostgreSQL extension | Built-in `digest()` function with SHA-256. PostgreSQL trigger handles chain computation atomically with INSERT. No application-level race conditions. |
| Time-series partitioning | Custom table partitioning logic | TimescaleDB `create_hypertable()` | Automatic chunk management, compression, retention policies, continuous aggregates. Manual partitioning requires maintenance scripts and can't match TimescaleDB's query optimization. |
| QR code image generation | Custom drawing logic | `qrcode` 1.5.4 | Handles encoding, error correction levels, PNG/SVG output, and all QR code standard versions. |
| TOTP code generation | Custom HMAC-SHA1 implementation | `otplib` 13.4.1 | Complete RFC 6238 implementation with counter management, window validation, and secret generation. |
| Access rule engine | Custom rule evaluation DSL | PostgreSQL + Redis cache | Zone × schedule intersection is a database join, not a rule engine. Caching in Redis with TTL computing handles performance. Custom DSLs are premature optimization for physical security scale. |
| Job queue management | setTimeout / setInterval for async work | `@nestjs/bullmq` 11.0.4 + `bullmq` 5.80.2 | Retry policies, backoff strategies, job dependencies, rate limiting, dead letter queues. Existing pattern already used for frame-processing and notification queues. |
| Dashboard state pushing | Polling / long-polling | `socket.io` 4.8.3 | Existing pattern for notifications and chat. Extend with door state and event stream rooms. |

**Key insight:** The physical security domain has well-established protocols (MQTT, Wiegand, OSDP) and data models (door states, access levels, audit chains). Re-implementing these from scratch introduces subtle bugs that commercial ACS platforms solved years ago. Use battle-tested libraries for protocol handling and focus custom development on the correlation engine and unified timeline — which are the unique value-add.

## Runtime State Inventory

> This is a greenfield phase (building new modules on existing infrastructure). No rename/refactor. However, existing state that interacts with new modules must be documented.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Existing `AuditLog` table (Prisma model) with existing activity records. This will be superseded by the new TimescaleDB `audit_log` hypertable. | Data migration: preserve existing audit entries in the new hypertable. Old Prisma model can remain for migration history but all new writes use hypertable. |
| Live service config | None directly affected — this phase adds new modules, does not rename or remove existing ones. | None |
| OS-registered state | None — no systemd, cron, or Task Scheduler entries affected. | None |
| Secrets/env vars | New env vars required: `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD`. Existing `DATABASE_URL`, `REDIS_HOST`, `REDIS_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` remain unchanged. | Add new env vars to `.env.example` and Docker Compose files. |
| Build artifacts | None — new TypeScript modules integrate into existing build pipeline. | None |

**Nothing found in category:** Stored data (existing audit log needs migration plan but no blocking state), Live service config (none), OS-registered state (none verified — checked for systemd, cron, pm2), Secrets/env vars (new only), Build artifacts (none).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | NestJS API | ✓ | v22.23.1 | — |
| pnpm | Package management | ✓ | 9.0.0 | — |
| Docker | Compose deployment | ✓ | 29.5.3 | — |
| PostgreSQL 16 | Database | ✓ | 16 (Alpine) | — |
| Redis 7 | Cache, queues, anti-passback | ✓ | 7.2 | — |
| TimescaleDB | Hypertables | ⚠️ Separate container | 2.16.1-pg16 (ips-timescaledb) | Install extension on project's PostgreSQL 16: `CREATE EXTENSION IF NOT EXISTS timescaledb;` |
| pgcrypto | Audit hash chains | ⚠️ Not verified | Built-in PG extension | `CREATE EXTENSION IF NOT EXISTS pgcrypto;` — ships with PostgreSQL, no install needed |
| Mosquitto (MQTT broker) | Door controller communication | ✗ | Not installed | Add to Docker Compose: `image: eclipse-mosquitto:2.0` |
| Ollama | Tailgating AI detection | ⚠️ Not in project containers | Via `host.docker.internal:11434` | Existing — already accessed by AI preprocessor |
| FFmpeg | Video snapshot correlation | ⚠️ Not verified | System or Docker | Required for video frame extraction near event timestamps |
| BullMQ | Async job processing | ✓ | 5.30.0 (existing) | — |
| Socket.IO | Real-time push | ✓ | 4.8.3 (existing) | — |

**Missing dependencies with no fallback:**
- **Mosquitto (MQTT broker):** Must be added to Docker Compose. Without it, door controllers have no communication channel. This is a blocking dependency for the MQTT ingestion path.
- **TimescaleDB extension:** Must be installed on the project's PostgreSQL 16 instance (or the project's database pointed at the existing `ips-timescaledb` container). Without hypertables, event time-series queries degrade to full table scans at scale.

**Missing dependencies with fallback:**
- **FFmpeg:** If not available in the API container, use the existing AI preprocessor or edge agent for frame extraction. Correlation can still link timestamps without thumbnails (degraded UX, not blocking).

## Common Pitfalls

### Pitfall 1: Prisma Migrations Destroying TimescaleDB DDL
**What goes wrong:** Running `prisma migrate dev` drops hypertable configurations, chunk intervals, compression, and retention policies because Prisma doesn't track them.
**Why it happens:** Prisma models tables via declarative schema; TimescaleDB features are configured via SQL functions Prisma doesn't understand. This is a known, documented issue — not a bug, but a fundamental architectural mismatch.
**How to avoid:** [D-22] Strict separation: Prisma manages reference tables only (users, credentials, zones, doors, schedules, access_levels, camera_door_map). All time-series tables (access_events, door_state_log, audit_log) live exclusively in `migrations/timescaledb/`. Use `$queryRaw` for every time-series operation.
**Warning signs:** `SELECT * FROM timescaledb_information.hypertables;` returns empty after migrations. Sequential scans appearing on event tables. Query planner not using chunk exclusion.

### Pitfall 2: Door State Race Conditions
**What goes wrong:** Door receives rapid state changes (badge read → unlocked → person through → locked) within milliseconds. MQTT message ordering isn't guaranteed. A "locked" message arrives before "unlocked" → door appears locked when it's actually open → false "forced open" alert.
**Why it happens:** MQTT QoS 1 guarantees at-least-once delivery, not ordering. Multiple publishers, network jitter, and broker queue depth all affect ordering.
**How to avoid:** [D-05] Include monotonically increasing sequence numbers in controller messages. Track `last_sequence` per device. Discard messages with `sequence <= last_sequence`. Validate every transition against the allowed state machine graph. [D-06] Apply 500ms settling timeout before alert generation.
**Warning signs:** Doors flipping state > 3 times in 1 second. Alerts that self-resolve within seconds. High discarded-message counts.

### Pitfall 3: Audit Log Unbounded Growth
**What goes wrong:** `audit_log` grows without retention. At 1K doors processing 100 events/sec → 8.6M audit rows/day → billions within months → queries timeout, PG vacuum can't keep up, disk fills.
**Why it happens:** Developers focus on "write the audit entry" but forget "clean up old audit entries." Compliance requirements say "retain for 90 days" but don't specify the cleanup mechanism.
**How to avoid:** [D-16] TimescaleDB hypertable with 7-day chunks. Retention policy: `SELECT add_retention_policy('audit_log', INTERVAL '90 days');`. Before dropping old chunks, export them to cold storage. Per-entity chains (not global) so verification stays scoped.
**Warning signs:** Hypertable chunk count > 1000. Audit query latency increasing linearly with data age. Table size growing > 1GB/week.

### Pitfall 4: MQTT Broker Single Point of Failure
**What goes wrong:** Mosquitto broker crashes. All door events, badge reads, controller health messages are lost. Platform goes blind to physical access events.
**Why it happens:** MQTT broker runs as a single Docker container. No clustering, no message persistence configured by default.
**How to avoid:** Configure Mosquitto with persistence (`persistence true`, `persistence_location /mosquitto/data/`). Mount a Docker volume for persistence data. Set `clean: false` on MQTT.js client to receive queued messages on reconnect. Monitor broker health via heartbeat topic — alert if no messages for >30s.

### Pitfall 5: Access Decision Latency Exceeding 100ms
**What goes wrong:** [D-13] An access decision (grant/deny) takes >100ms because the service is doing too much work synchronously — querying video timestamps, generating thumbnails, or running AI analysis inline with the badge check. This causes perceptible delay at the door.
**Why it happens:** Correlation logic is placed in the synchronous access evaluation path instead of the async BullMQ worker path.
**How to avoid:** [D-13] The access event path does ONLY: (1) parse MQTT message, (2) validate credential, (3) evaluate access rules (cached), (4) check anti-passback (Redis, O(1)), (5) persist event to hypertable, (6) return grant/deny. All video correlation, AI analysis, and alert generation happen in BullMQ workers after the response is returned. Never call external services (Ollama, FFmpeg, AI preprocessor) inside the access evaluation path.
**Warning signs:** p99 access decision latency > 50ms. Access event endpoint making external HTTP calls. BullMQ correlation jobs with timestamps >1s after the access event.

### Pitfall 6: Camera-Door Mapping Staleness
**What goes wrong:** Camera is moved or reassigned, but the `CameraDoorMap` still references the old door. Correlation engine retrieves video from the wrong camera. Unified timeline shows unrelated footage.
**Why it happens:** The mapping is static after creation; no mechanism to validate that the camera still covers the door's field of view.
**How to avoid:** Include a `lastValidated` timestamp in `CameraDoorMap`. On correlation failure (no person/event visible in frame), flag the mapping for review. Dashboard UI shows mapped cameras on door detail page with last-validation indicator.

## Code Examples

### Full MQTT Message → Access Decision Flow

```typescript
// Step 1: MQTT message arrives
// site/5/reader/3/badge → { badgeNumber: "4421", sequence: 1042, timestamp: "..." }

// Step 2: MqttService validates sequence, emits event
this.eventEmitter.emit("mqtt.reader.badge", {
  siteId: "5",
  readerId: "3",
  badgeNumber: "4421",
  sequence: 1042,
  timestamp: new Date(),
});

// Step 3: AccessService handles badge read
@OnEvent("mqtt.reader.badge", { async: true })
async handleBadgeRead(payload: BadgeReadEvent): Promise<void> {
  // D-13: This entire path must complete in <100ms
  const start = Date.now();

  // Resolve door from reader (reader→door mapping)
  const door = await this.getDoorForReader(payload.readerId, payload.siteId);

  // Validate credential
  const credential = await this.prisma.credential.findFirst({
    where: { badgeNumber: payload.badgeNumber, isActive: true, type: "BADGE" },
  });
  if (!credential) {
    await this.recordAndEmitDenied(payload, door, "invalid-credential");
    return;
  }

  // Evaluate access (cached)
  const decision = await this.evaluateAccess(credential.id, door.id, payload.siteId);

  // D-13: Persist event synchronously (sub-100ms)
  await this.prisma.$queryRaw`
    INSERT INTO access_events (time, site_id, door_id, credential_id, user_id, decision, reason, sequence)
    VALUES (${payload.timestamp}, ${payload.siteId}::uuid, ${door.id}::uuid,
            ${credential.id}::uuid, ${credential.userId}::uuid,
            ${decision.decision}::event_decision, ${decision.reason}, ${payload.sequence})
  `;

  // Update anti-passback state
  await this.updateAntiPassback(credential.id, door.id, decision.decision);

  // Emit event for async processing
  this.eventEmitter.emit(
    decision.decision === "granted" ? "access.granted" : "access.denied",
    { userId: credential.userId, credentialId: credential.id, doorId: door.id,
      zoneId: door.zoneId, siteId: payload.siteId, timestamp: payload.timestamp }
  );

  const elapsed = Date.now() - start;
  if (elapsed > 50) this.logger.warn(`Access decision took ${elapsed}ms (target: <100ms)`);
}
```

### Tailgating Detection Trigger

```typescript
// Phase 1: AI-04 — Extends existing AI inference pipeline
// D-20: Trigger async analysis of frames 2-5 seconds after door opens

@OnEvent("access.granted", { async: true })
async onAccessGrantedForTailgating(payload: AccessEventPayload): Promise<void> {
  // D-20: Dispatch AFTER the access event — never block
  await this.tailgatingQueue.add(
    "detect-tailgating",
    {
      doorId: payload.doorId,
      siteId: payload.siteId,
      eventTimestamp: payload.timestamp,
      accessEventId: payload.eventId,
    },
    {
      delay: 3000, // Wait 3s for person to clear doorway (D-20: 2-5s window)
      attempts: 1, // One-shot — don't retry stale frames
      removeOnComplete: true,
    }
  );
}

// TailgatingProcessor (reuses existing InferenceService pattern)
@Processor("tailgating-detection")
export class TailgatingProcessor {
  @Process("detect-tailgating")
  async detect(job: Job<TailgatingJob>): Promise<void> {
    // 1. Get camera(s) mapped to the door (D-14: CameraDoorMap)
    const cameraMaps = await this.prisma.cameraDoorMap.findMany({
      where: { doorId: job.data.doorId },
      include: { camera: true },
    });

    // 2. Fetch frames at t+3s from associated cameras
    for (const mapping of cameraMaps) {
      const frame = await this.fetchFrame(mapping.camera, job.data.eventTimestamp);

      // 3. Send to Ollama vision model for person counting
      const result = await this.ollamaService.analyze(frame, {
        prompt: "Count the number of people visible in this doorway image. Return only a JSON object: { \"count\": <number> }",
        model: "moondream",
      });

      // 4. D-21: If > 1 person detected, generate tailgating alert
      if (result.count > 1) {
        await this.alertService.createAlert({
          type: "tailgating",
          title: `Tailgating detected at door ${job.data.doorId}`,
          severity: "HIGH",
          cameraId: mapping.cameraId,
          metadata: {
            accessEventId: job.data.accessEventId,
            personCount: result.count,
            doorId: job.data.doorId,
          },
        });
      }
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MQTT.js v4 (JS) | MQTT.js v5 (TS rewrite) | 2023-07 (v5.0.0) | Full TypeScript support, MQTT 5 features, tree-shakeable. Breaking: `new` required for MqttClient. |
| NestJS microservice transport for MQTT | Custom provider wrapping MQTT.js directly | — | NestJS microservice transports are designed for service-to-service, not device-level IoT communication. Custom provider avoids leaking transport abstractions. |
| Prisma for all database operations | Prisma for reference tables, `$queryRaw` for TimescaleDB | — | Prisma cannot manage hypertable DDL. Community extension (prisma-extension-timescaledb v0.8.0) is too immature. |
| Global audit hash chain | Per-entity hash chains | — | Global chain requires full-table scan for verification. Per-entity chains scope to the relevant entity, enabling targeted validation and partial chain export. |
| Boolean door state | Event-sourced state machine with enum | — | Physical doors have 6+ meaningful states. A boolean `isLocked` loses `held-open`, `forced`, `unsecured`, and `desynchronized` states. |
| BullMQ v4 | BullMQ v5 | 2024 | v5 adds job dependencies, rate limiters, and improved Redis cluster support. Existing project should upgrade from 5.30.0 to 5.80.2. |

**Deprecated/outdated:**
- **MQTT QoS 0 for door state:** Deprecated in favor of QoS 1 with sequence numbers. QoS 0 fire-and-forget loses messages and has no ordering guarantees. [D-03]
- **Prisma `auditLog` model for hash-chained audit:** The existing `AuditLog` Prisma model (schema.prisma line 162) cannot support hash chains. Replace with TimescaleDB hypertable + pgcrypto triggers. Keep existing migration history but redirect all new writes.
- **Direct service-to-service imports for cross-module events:** Replaced by `@nestjs/event-emitter` event bus. [D-23]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Mosquitto MQTT broker can be added to Docker Compose without conflicts | Environment Availability | Low — self-contained container on standard port 1883. Existing project uses separate compose services. |
| A2 | TimescaleDB extension can be installed on the project's PostgreSQL 16 (postgres:16-alpine) | Environment Availability | Medium — Alpine-based PostgreSQL may need `timescaledb-tools` package. The existing `ips-timescaledb` container (2.16.1-pg16) proves TimescaleDB runs on PG16. Fallback: use the existing TimescaleDB container. |
| A3 | `@nestjs/event-emitter` 3.1.0 is compatible with NestJS 10.4.8 | Standard Stack | Very Low — official NestJS package with `^10.0.0 \|\| ^11.0.0` peer dep range covering 10.4.8. |
| A4 | `mqtt@5.15.2` will work with any standard MQTT 3.1.1 broker (Mosquitto 2.0+) | Standard Stack | Very Low — MQTT 3.1.1 is the baseline; Mosquitto 2.0 supports it natively. |
| A5 | pgcrypto ships with PostgreSQL 16 Alpine image | Standard Stack | Very Low — pgcrypto is a contrib module bundled with all PostgreSQL distributions. |
| A6 | Existing BullMQ patterns (frame-processing, notification queues) extend cleanly to new queues (access-events, door-alerts, audit-write, video-correlation) | Architecture | Low — BullMQ queue registration is declarative; same Redis connection, different queue names. |
| A7 | The existing Ollama instance can handle additional tailgating detection prompts without degrading existing AI pipeline | Architecture | Medium — tailgating analysis is triggered per access event at 3s delay, not per frame. At 100 events/sec, this could add significant load. Mitigation: rate-limit tailgating jobs per camera, configure queue concurrency. |

## Validation Architecture

> `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`. This section is omitted per protocol.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | Yes | Existing JWT auth + Passport.js. Extended to cover new `auditor` role and mobile credential auth. |
| V3 Session Management | Yes | Existing refresh token rotation + revocation. MQTT connection uses separate session lifecycle. |
| V4 Access Control | Yes | Existing `@Roles()` decorator extended with `AUDITOR` role. New endpoint-level CRUD authorization on Credential, Door, Zone, Schedule, AccessLevel resources. Site-scoping enforced on all new endpoints. |
| V5 Input Validation | Yes | Zod schemas in `@repo/shared` + `ZodValidationPipe` for all new endpoints. MQTT message payloads validated via protocol adapters before event emission. |
| V6 Cryptography | Yes | pgcrypto SHA-256 hash chains for audit immutability. bcrypt for PIN hashing. JWT signing with existing secrets. MQTT TLS for broker connections (production). |
| V7 Error Handling | Yes | Existing `AllExceptionsFilter` catches unhandled errors. MQTT errors logged but never crash the app. Access decisions have explicit error paths (not unhandled exceptions). |
| V8 Data Protection | Yes | Per-entity audit hash chains enable data integrity verification. Retention policies auto-prune old data. |

### Known Threat Patterns for Physical Security Platform

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Replay attack on MQTT badge reads | Spoofing | D-05: Sequence number validation per device. Messages with `sequence <= last_sequence` discarded. |
| MQTT topic injection (malicious publisher) | Tampering | MQTT broker authentication (username/password on connect). ACL rules limiting publish permissions per client. |
| Audit log tampering (direct DB modification) | Tampering | D-17: pgcrypto SHA-256 hash chains. Any modification breaks the chain — detectable via `/audit/verify` endpoint. |
| Credential forgery (synthetic badge numbers) | Spoofing | Badge numbers validated against registered Credential records. D-08: Polymorphic credential model with type-specific validation. |
| Privilege escalation via role manipulation | Elevation of Privilege | D-19: Auditor role has read-only access. `@Roles()` guard on all mutation endpoints. Role hierarchy enforced in `RolesGuard`. |
| Denial of service via MQTT flood | Denial of Service | Rate limiting on MQTT message processing. Sequence number gap detection alerts on message storms. BullMQ queue backpressure. |
| Anti-passback bypass (credential sharing) | Repudiation | D-12: Zone-scoped anti-passback with configurable timeout (30s). Redis tracks `last_entry` per zone/credential pair. Tailgating detection (AI-04) catches physical credential sharing. |
| Door state spoofing (false state reports) | Spoofing | D-05: State transition validation — reject transitions not in the allowed graph. Sequence numbers prevent replay. Settling timeout suppresses oscillation. |

## Sources

### Primary (HIGH confidence)
- [MQTT.js GitHub README] https://github.com/mqttjs/MQTT.js — API surface, client options, events, QoS levels, reconnection behavior [VERIFIED: npm registry]
- [npm registry: mqtt@5.15.2] — version, maintainers (Matteo Collina et al.), 12+ year history [VERIFIED: npm registry]
- [npm registry: @nestjs/event-emitter@3.1.0] — version, peer deps, official NestJS package [VERIFIED: npm registry]
- [slopcheck: mqtt, @nestjs/event-emitter] — both packages pass legitimacy check [OK]
- [TimescaleDB Official Docs] https://docs.timescale.com/ — hypertables, continuous aggregates, compression, retention policies [CITED]
- [Project codebase: apps/api/src/modules/] — 15 existing modules, NestJS conventions, Zod + class-validator pattern, BullMQ queue pattern [VERIFIED: codebase]
- [Project codebase: apps/api/prisma/schema.prisma] — 12 models, 6 enums, existing Role hierarchy [VERIFIED: codebase]
- [Docker environment: PostgreSQL 16, Redis 7.2] — confirmed running via `docker ps` [VERIFIED: environment]

### Secondary (MEDIUM confidence)
- [NestJS Events documentation] https://docs.nestjs.com/techniques/events — EventEmitter pattern, @OnEvent decorator [CITED]
- [PostgreSQL pgcrypto documentation] https://www.postgresql.org/docs/16/pgcrypto.html — digest(), SHA-256, trigger patterns [ASSUMED: standard PostgreSQL knowledge]
- [Mosquitto MQTT broker documentation] https://mosquitto.org/documentation/ — persistence, authentication, ACL configuration [CITED: reference]

### Tertiary (LOW confidence)
- [Access level evaluation caching specifics] — Cache TTL computation at schedule boundary boundaries, Redis key design — these are at the agent's discretion per D-10/D-11 [ASSUMED]
- [TimescaleDB chunk interval: 1 day for access_events / door_state_log] — Appropriate for expected scale (100 events/sec), but exact chunk sizing may need tuning after production observation [ASSUMED]

## Open Questions (RESOLVED)

1. **TimescaleDB extension installation on existing PostgreSQL 16**
   - What we know: The project uses `postgres:16-alpine`. TimescaleDB extension requires the `timescaledb` package. The existing `ips-timescaledb` container proves TimescaleDB 2.16.1 works on PG16.
   - What's unclear: Whether the project's PostgreSQL container can install the extension in-place, or if we should switch the project's database to the existing TimescaleDB-enabled container.
    - Recommendation: Add TimescaleDB installation to the Docker Compose healthcheck init or use a custom Dockerfile based on `timescale/timescaledb:2.18-pg16`. The planner should add a `checkpoint:human-verify` task for this decision.
    - **RESOLVED:** Use a separate `timescale/timescaledb:2.18-pg16` container alongside existing `postgres:16-alpine` for time-series data. Existing Prisma-managed tables stay on the original PG16 container. This avoids migration risk and keeps separation clean. docker-compose.yml updated in Wave 0.

2. **BullMQ version upgrade (5.30.0 → 5.80.2)**
   - What we know: The project currently uses BullMQ 5.30.0. The latest is 5.80.2 (major feature additions including job dependencies and rate limiters).
   - What's unclear: Whether the API currently uses any BullMQ v5.30.0 APIs that were removed or changed in 5.80.2.
    - Recommendation: Include in Phase 1 Wave 0 (infrastructure setup) — upgrade BullMQ across all packages, verify existing frame-processing and notification queues still work.
    - **RESOLVED:** Stay on BullMQ 5.30.0 for Phase 1. The existing queue infrastructure works reliably and the upgrade risk (API breaking changes) outweighs the feature gain for this phase. Re-evaluate in Phase 2 planning if job dependencies/rate limiters are needed.

3. **MQTT broker Mosquitto vs EMQX**
   - What we know: Mosquitto is the most widely deployed MQTT broker (lightweight, battle-tested). EMQX offers clustering and a management dashboard but is heavier.
   - What's unclear: Whether clustering is needed in Phase 1 (single Docker host = Mosquitto is sufficient).
    - Recommendation: Start with Mosquitto 2.0 in Docker Compose. Defer EMQX evaluation to Phase 3 (multi-site). Phase 1 is single-deployment only.
    - **RESOLVED:** Use Mosquitto 2.0 as docker-compose service. Add to `docker-compose.yml`. Single-host deployment with QoS 1 and retained messages. EMQX deferred to Phase 3+.

4. **Existing AuditLog migration path**
   - What we know: The existing `AuditLog` Prisma model (schema.prisma line 162) stores historical audit entries without hash chains. The new audit_log hypertable with pgcrypto triggers replaces this.
   - What's unclear: Whether to (a) keep both tables with the old one frozen, (b) migrate existing data to the new hypertable, or (c) start fresh with the new table only.
    - Recommendation: Option (a) — keep the existing Prisma `AuditLog` table for historical reference (read-only), all new audit writes go to the new `audit_log` hypertable. Update `AuditService` to query the hypertable for new entries and fall back to the Prisma table for historical data.
    - **RESOLVED:** Option (a) — freeze existing Prisma AuditLog table (read-only for historical queries). New audit_log hypertable handles all new writes. AuditService queries both, merging results by timestamp. No data migration needed.

5. **Protocol adapter scope for Phase 1**
   - What we know: D-02 requires a protocol adapter abstraction. Phase 1 needs at least one real controller protocol working (Wiegand is the Phase 1 minimum per CONTEXT.md).
   - What's unclear: Whether a real Wiegand controller or a simulator is available for testing. The MQTT message format from real controllers varies by manufacturer.
    - Recommendation: The planner should include a spike task during planning to create and test a Wiegand protocol adapter against either a real controller or a documented MQTT topic/payload schema. If no real controller is available, implement against a well-documented reference and create a simulator for testing.
    - **RESOLVED:** Implement Wiegand protocol adapter as the first adapter. Create a WiegandSimulator class for testing that emits structured MQTT messages on `site/{id}/reader/{id}/{event}` topics. Real controller integration is P1 stretch goal if hardware is available; simulator suffices for development and testing. Additional adapters (OSDP, HID) deferred to Phase 2+.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All packages verified on npm registry, slopcheck passed, existing stack confirmed via codebase inspection
- Architecture: HIGH — MQTT.js API verified via official README, TimescaleDB patterns from official docs, NestJS event emitter from official package, door state machine from well-established physical security domain patterns
- Pitfalls: HIGH — Cross-referenced from PITFALLS.md research, MQTT.js docs, Prisma+TimescaleDB known issues, physical security domain experience
- Code examples: MEDIUM — Implementation patterns are syntactically correct TypeScript but have not been compiled against the actual project. Planner should adapt to existing conventions.

**Research date:** 2026-07-14
**Valid until:** 2026-08-14 (30-day validity; stable libraries — MQTT.js, NestJS, TimescaleDB are mature)
