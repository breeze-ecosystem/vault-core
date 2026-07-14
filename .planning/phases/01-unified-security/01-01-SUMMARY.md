---
phase: 01-unified-security
plan: 01
title: "Infrastructure Foundation & Credential Management"
type: feature
wave: 1
status: completed
completed_date: "2026-07-14T12:51:37Z"
duration_seconds: 887
tasks_completed: 3
tasks_total: 3
commits:
  - hash: "7db8e2d"
    message: "feat(01-unified-security): database foundation & infrastructure bootstrap"
  - hash: "de57ede"
    message: "feat(01-unified-security): MQTT transport & access control API"
  - hash: "271d394"
    message: "feat(01-unified-security): credential management dashboard"
requires: []
provides:
  - "Prisma reference tables: Credential, Door, Zone, Schedule, AccessLevel, CameraDoorMap"
  - "TimescaleDB hypertables: access_events, door_state_log, audit_log"
  - "MQTT transport module with Wiegand protocol adapter"
  - "Access Control REST API (credentials, access levels, schedules, zones, doors)"
  - "Credential management dashboard UI"
  - "Shared domain types, schemas, and constants"
affects: ["access-control", "mqtt-transport", "dashboard-ui"]
requirements_completed:
  - ACC-01
  - ACC-02
  - ACC-03
  - ACC-04
  - ACC-05
key_decisions:
  - "Polymorphic credential model with type-specific validation (D-08)"
  - "Zone × Schedule intersection matrix for access levels (D-10/D-11)"
  - "TimescaleDB hypertables with separate SQL migration directory (D-22)"
  - "MQTT.js 5.x as custom NestJS provider with graceful degradation"
  - "Per-entity pgcrypto SHA-256 audit hash chains (D-17)"
  - "Redis-backed anti-passback with 30s timeout (D-12)"
  - "Sub-100ms access evaluation path with Redis caching (D-13)"
  - "MQTT topic builders centralized in MqttTopics (Pitfall 10)"
tech_stack:
  added:
    - "mqtt@5.15.2"
    - "@nestjs/event-emitter@3.1.0"
    - "qrcode@1.5.4"
    - "otplib@13.4.1"
    - "@types/qrcode@1.5.5"
    - "eclipse-mosquitto:2.0 (docker-compose)"
  patterns:
    - "NestJS module pattern (controller + service + module)"
    - "ZodValidationPipe for request validation"
    - "@Roles() guard for endpoint protection"
    - "BullMQ @Processor for async event persistence"
    - "Socket.IO @WebSocketGateway for real-time streaming"
    - "PrismaService injection for database operations"
    - "$queryRaw for TimescaleDB hypertable writes"
    - "Redis provider via factory pattern for anti-passback"
    - "EventEmitter2 for decoupled event bus (D-23)"
    - "Next.js App Router for dashboard pages"
    - "Custom DataTable component for list views"
    - "useTranslation hook for i18n"
files_created:
  - apps/api/migrations/timescaledb/up/001_access_events.sql
  - apps/api/migrations/timescaledb/up/002_door_state_log.sql
  - apps/api/migrations/timescaledb/up/003_audit_log.sql
  - apps/api/migrations/timescaledb/up/004_continuous_aggregates.sql
  - apps/api/migrations/timescaledb/up/005_retention_policies.sql
  - apps/api/migrations/timescaledb/run.sh
  - apps/api/src/mqtt/mqtt.module.ts
  - apps/api/src/mqtt/mqtt.service.ts
  - apps/api/src/mqtt/mqtt-topics.ts
  - apps/api/src/mqtt/mqtt.types.ts
  - apps/api/src/mqtt/adapters/protocol-adapter.interface.ts
  - apps/api/src/mqtt/adapters/wiegand-adapter.ts
  - apps/api/src/modules/access/access.module.ts
  - apps/api/src/modules/access/access.controller.ts
  - apps/api/src/modules/access/access.service.ts
  - apps/api/src/modules/access/access.gateway.ts
  - apps/api/src/modules/access/access.processor.ts
  - packages/shared/src/constants/credential-types.ts
  - packages/shared/src/constants/door-states.ts
  - packages/shared/src/schemas/access.schema.ts
  - packages/shared/src/types/access.types.ts
  - apps/dashboard/app/(dashboard)/acces/page.tsx
  - apps/dashboard/app/(dashboard)/acces/[id]/page.tsx
files_modified:
  - apps/api/prisma/schema.prisma
  - apps/api/src/app.module.ts
  - apps/api/src/config/configuration.ts
  - apps/api/src/modules/queue/queue.module.ts
  - packages/shared/src/index.ts
  - apps/dashboard/lib/api.ts
  - apps/dashboard/lib/nav-config.ts
  - apps/dashboard/lib/i18n/dictionaries/fr.ts
  - apps/dashboard/lib/i18n/dictionaries/en.ts
  - docker-compose.yml
  - .env.example
  - apps/api/package.json
  - pnpm-lock.yaml
---

# Phase 1 Plan 1: Infrastructure Foundation & Credential Management Summary

**One-liner:** Established the Phase 1 infrastructure foundation — Prisma reference models for access control, TimescaleDB hypertables for event data, MQTT transport with protocol adapters, full REST API for credential/access-level management, and a dashboard UI for admin credential operations.

## What Was Built

### 1. Database Foundation (Task 1)

**Prisma Schema Extensions:**
- Added `Credential` model (polymorphic: BADGE, PIN, MOBILE, QR) with type-specific fields (`badgeNumber @unique`, `pinHash`, `qrSeed`, `mobileWalletId`) and common fields (`isActive`, `validFrom`, `validUntil`, `maxUses`, `useCount`)
- Added `Door` model with zone/site relations, `controllerId`, `alertConfig` (JSON), and `@@unique([controllerId, siteId])`
- Added `Zone` model with site relation and doors/schedules/accessLevels arrays
- Added `Schedule` model with `entries` (JSON store for dayOfWeek + time ranges), `holidayOverride`
- Added `AccessLevel` model as junction table: credentialId + zoneId + scheduleId with priority
- Added `CameraDoorMap` model: cameraId + doorId with angle and priority
- Extended existing `Role` enum with `AUDITOR`
- Extended existing `User` model with `credentials` relation
- Extended existing `Site` model with `zones` and `doors` relations
- Extended existing `Camera` model with `cameraDoorMaps` relation

**TimescaleDB Hypertable Migrations:**
- `001_access_events.sql` — hypertable with `event_decision` enum, compression (7-day policy), indexes for site/door/user/credential+time queries
- `002_door_state_log.sql` — hypertable with `door_state` enum, compression, filtered index for abnormal states
- `003_audit_log.sql` — hypertable with pgcrypto SHA-256 hash chain trigger, per-entity chain index
- `004_continuous_aggregates.sql` — materialized views: `door_access_hourly`, `door_alert_daily`
- `005_retention_policies.sql` — 90-day audit retention, 365-day access/state retention
- `run.sh` — automated migration runner script

**Infrastructure:**
- Added Mosquitto MQTT broker to `docker-compose.yml` (ports 1883/9001)
- Added MQTT environment variables to `.env.example`
- Added `mqtt` config section to `configuration.ts`
- Registered `EventEmitterModule.forRoot()` in `AppModule`
- Registered 4 new BullMQ queues: `access-events`, `door-alerts`, `video-correlation`, `audit-write`

### 2. MQTT Transport & Access Control API (Task 2)

**Shared Domain Types & Schemas:**
- `credential-types.ts` — `CREDENTIAL_TYPES` enum (BADGE, PIN, MOBILE, QR)
- `door-states.ts` — `DOOR_STATES` enum (locked, unlocked, held-open, forced, unsecured, desynchronized)
- `access.types.ts` — `AccessDecision`, `CredentialDto`, `AccessLevelDto`, `ScheduleEntry`, `DoorStateEvent`, `BadgeReadEvent`
- `access.schema.ts` — Zod schemas: `createCredentialSchema` (with type-specific `.refine()`), `updateCredentialSchema`, `createAccessLevelSchema`, `createScheduleSchema`, `createZoneSchema`, `createDoorSchema`, `createCameraDoorMapSchema`

**MQTT Transport Module:**
- `mqtt.types.ts` — `MqttMessage<T>`, `DoorStatePayload`, `BadgeReadPayload`
- `mqtt-topics.ts` — centralized topic builders: `doorState()`, `readerBadge()`, `controllerHealth()`, wildcard subscriptions
- `ProtocolAdapter` interface — `manufacturer`, `normalizeDoorState()`, `normalizeBadgeRead()`, `validate()`
- `WiegandAdapter` — normalizes Wiegand protocol payloads to standard events with state string mapping
- `MqttService` — NestJS provider implementing `OnModuleInit`/`OnModuleDestroy`, connects to Mosquitto with reconnect, sequence number validation per device (D-05), wildcard topic subscriptions at QoS 1, graceful degradation (try/catch, logs warning if broker unavailable)
- `MqttModule` — `@Global()` module exporting `MqttService`

**Access Control Module:**
- `AccessController` — 19 REST endpoints, all role-protected:
  - Credentials: POST/GET/PATCH/DELETE + QR generation
  - Access Levels: POST/GET/DELETE
  - Schedules: POST/GET/PATCH/DELETE
  - Zones: POST/GET
  - Doors: POST/GET
  - Camera-Door Mapping: POST/DELETE
  - Access Evaluation: POST `/access/evaluate`
- `AccessService` — core business logic:
  - Credential CRUD with badgeNumber uniqueness enforcement
  - QR code generation via `qrcode` library
  - Access level creation with reference validation
  - Schedule CRUD with cascading access level deletion
  - Zone and Door management with site validation
  - `evaluateAccess()` — sub-100ms access decision path:
    1. Credential validation (isActive, validity window, maxUses)
    2. Anti-passback check in Redis (D-12: zone-scoped, 30s window)
    3. Emergency override check (lockdown/unlock per zone)
    4. Cached access evaluation (Redis, TTL to next hour change)
    5. Schedule evaluation (dayOfWeek + timeOfDay intersection)
    6. Event emission for async processing (D-23)
- `AccessGateway` — Socket.IO server on `/ws/access` namespace, `subscribe:site`/`unsubscribe:site` events, emits `access.granted`/`access.denied` to site rooms
- `AccessProcessor` — BullMQ worker for `access-events` queue, persists events to TimescaleDB via `$queryRaw` (D-16)

### 3. Credential Management Dashboard (Task 3)

**API Client Functions** (added to `apps/dashboard/lib/api.ts`):
- Types: `CredentialDto`, `AccessLevelDto`, `ScheduleDto`, `ScheduleEntry`, `ZoneDto`, `DoorDto`
- Functions: `fetchCredentials()`, `fetchCredential()`, `createCredential()`, `updateCredential()`, `deactivateCredential()`, `generateCredentialQr()`, `fetchAccessLevels()`, `createAccessLevel()`, `deleteAccessLevel()`, `fetchZones()`, `fetchSchedules()`, `fetchDoors()`

**Credential List Page** (`/acces`):
- DataTable with columns: user, type (color-coded badge), identifier (truncated monospace), status (active/inactive), validity period, actions (edit/deactivate)
- Type filter dropdown (BADGE, PIN, MOBILE, QR)
- Row click navigates to detail page
- Deactivation with confirmation dialog

**Credential Detail Page** (`/acces/[id]`):
- Full credential details card (type, identifier, status, user, validity, usage count)
- Access levels table with zone/schedule/priority columns and remove buttons
- QR code generation for QR-type credentials (renders PNG data URL)
- Deactivate button with confirmation

**Navigation & i18n:**
- Added "Accès" nav item to sidebar (icon: Key, minRole: ADMIN)
- Added `access.*` keys to French dictionary (37 keys) and English dictionary (37 keys)

## Deviations from Plan

None — plan executed exactly as written with one minor adjustment:

- Redis injection used custom factory provider (`@Inject("REDIS")`) instead of `@nestjs-modules/ioredis` (not installed), matching existing project patterns.

## Verification

- [x] Prisma schema validates: `pnpm prisma:generate` succeeds, generates Client v5.22.0
- [x] TypeScript compilation passes for `@repo/shared` workspace
- [x] TypeScript compilation passes for `@repo/api` workspace
- [x] TypeScript compilation passes for `@repo/dashboard` workspace
- [x] All 5 TimescaleDB SQL migration files exist with run.sh
- [x] All 6 MQTT transport files created (module, service, topics, types, interface, adapter)
- [x] All 5 access module files created (module, controller, service, gateway, processor)
- [x] All shared schemas/types/constants created and exported from `@repo/shared`
- [x] Dashboard credential list page renders credential table with type/status/validity
- [x] Dashboard credential detail page shows full info, access levels, and QR code
- [x] Navigation sidebar shows "Accès" link for ADMIN+ roles
- [x] All i18n keys present in both French and English dictionaries

## Self-Check: PASSED

All created files exist and all commits are verified in git log.

## Known Stubs

None — all implementations are functional with proper data sources wired.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new_endpoint | apps/api/src/modules/access/access.controller.ts | 19 new REST endpoints for access control — all role-protected with @Roles() guard |
| threat_flag: new_endpoint | apps/api/src/modules/access/access.gateway.ts | WebSocket namespace `/ws/access` for real-time access event streaming — authenticated via existing JWT guard |
| threat_flag: new_data | apps/api/prisma/schema.prisma | New PII-adjacent data in Credential model (badgeNumber, userId relation) |
| threat_flag: new_infra | docker-compose.yml | New Mosquitto MQTT broker service — requires auth configuration for production |
