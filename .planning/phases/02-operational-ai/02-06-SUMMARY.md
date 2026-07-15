---
phase: 02-operational-ai
plan: 06
subsystem: equipment-health-governance
tags:
  - equipment-health
  - data-governance
  - pgcrypto
  - timescaledb
  - retention-policy
dependency:
  requires:
    - 02-05
  provides:
    - equipment-health-api
    - governance-api
  affects:
    - apps/api (new Equipment + Governance modules)
    - apps/dashboard (equipment + governance pages)
    - packages/shared (equipment + governance types/schemas)
tech-stack:
  added:
    - pgcrypto (pgp_sym_encrypt/decrypt)
    - Redis debounce keys for alert fatigue prevention
  patterns:
    - Equipment module with cron-based health checks
    - Governance module with encryption + retention cron
    - MQTT event handler for controller health
key-files:
  created:
    - apps/api/migrations/timescaledb/up/009_reader_health.sql
    - apps/api/migrations/timescaledb/up/010_controller_health.sql
    - apps/api/migrations/timescaledb/up/011_camera_health.sql
    - apps/api/migrations/timescaledb/up/013_retention_policies_p2.sql
    - apps/api/src/modules/equipment/equipment.module.ts
    - apps/api/src/modules/equipment/equipment.controller.ts
    - apps/api/src/modules/equipment/equipment.service.ts
    - apps/api/src/modules/governance/governance.module.ts
    - apps/api/src/modules/governance/governance.controller.ts
    - apps/api/src/modules/governance/governance.service.ts
    - apps/api/src/modules/governance/governance.processor.ts
    - packages/shared/src/constants/equipment-status.ts
    - packages/shared/src/schemas/equipment.schema.ts
    - packages/shared/src/schemas/governance.schema.ts
    - packages/shared/src/types/equipment.types.ts
    - packages/shared/src/types/governance.types.ts
    - apps/dashboard/app/(dashboard)/equipement/page.tsx
    - apps/dashboard/app/(dashboard)/equipement/cameras/page.tsx
    - apps/dashboard/app/(dashboard)/equipement/lecteurs/page.tsx
    - apps/dashboard/app/(dashboard)/equipement/controleurs/page.tsx
    - apps/dashboard/app/(dashboard)/gouvernance/page.tsx
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/src/app.module.ts
    - apps/api/src/modules/queue/queue.module.ts
    - apps/api/src/config/configuration.ts
    - .env.example
    - packages/shared/src/index.ts
    - apps/dashboard/lib/api.ts
    - apps/dashboard/lib/nav-config.ts
    - apps/dashboard/lib/i18n/dictionaries/fr.ts
    - apps/dashboard/lib/i18n/dictionaries/en.ts
decisions:
  - "Redis debounce keys prevent alert fatigue — 60s TTL for camera/reader alerts, 5min for controller alerts"
  - "Retention pruning uses `$queryRawUnsafe` with validated event type whitelist to prevent SQL injection"
  - "Equipment health check thresholds: 5min stale for cameras, 10min stale for readers"
  - "Governance encryption exposes test endpoints (encrypt/decrypt) restricted to ADMIN role"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-07-14"
  tasks: 3
  commits: 3
---

# Phase 02 Plan 06: Equipment Health Monitoring & Data Governance Summary

One-liner: equipment health monitoring with TimescaleDB-persisted metrics, pgcrypto encryption for sensitive data, and configurable retention policies with cron-based auto-pruning.

## Tasks Executed

### Task 1: Database Infrastructure — Health Hypertables, Retention Policy, Encryption
- Created 4 TimescaleDB migration files: `009_reader_health`, `010_controller_health`, `011_camera_health`, `013_retention_policies_p2`
- Each hypertable has `create_hypertable`, compression policies, retention policies (90 days), and proper indexes
- Added `RetentionPolicy` Prisma model with unique eventType, tableType, retentionDays, enabled flag
- Added `encryption.key` config and `ENCRYPTION_KEY` to `.env.example`
- Created shared types, schemas, and constants for equipment and governance domains
- Registered `EquipmentModule` and `GovernanceModule` in `AppModule`
- Added `equipment-health` and `retention-pruning` queues to `QueueModule`
- Created placeholder modules with Redis provider support

### Task 2: Equipment Health Service, Encryption & Retention API
- `EquipmentService.checkCameraHealth()` — 30s cron, marks stale cameras (5min no heartbeat) as OFFLINE, writes to camera_health hypertable, emits equipment.alert with 60s Redis debounce
- `EquipmentService.checkReaderHealth()` — 30s cron, detects readers with no recent health events (10min threshold), writes offline records with debounce
- `EquipmentService.handleControllerHealth()` — handles `mqtt.controller.health` events, writes to controller_health, alerts on battery < 20% and unstable connections (5min debounce)
- `EquipmentController` — 6 endpoints: camera/reader/controller status lists + history queries, all @Roles(ADMIN, SUPERVISOR)
- `GovernanceService` — `encrypt()`/`decrypt()` using `pgp_sym_encrypt`/`pgp_sym_decrypt` with configured `ENCRYPTION_KEY`; `pruneExpiredData()` hourly cron; full retention policy CRUD
- `GovernanceProcessor` — processes `retention-pruning` queue jobs with validated event type whitelist (SQL injection prevention)
- `GovernanceController` — retention policy CRUD + encrypt/decrypt test endpoints, all @Roles(ADMIN)

### Task 3: Equipment Health & Governance Dashboard
- Equipment overview (`/equipement`): summary cards with cameras/readers/controllers counts (online/offline/degraded), low battery alerts section, auto-refresh every 30s
- Camera health (`/equipement/cameras`): table with name, site, status badge, relative heartbeat time, FPS, recording status, history modal with time-series data
- Reader health (`/equipement/lecteurs`): table with reader ID, status, failed reads count, response time, last connected, firmware, history modal
- Controller health (`/equipement/controleurs`): table with battery level (color-coded), stability badge, firmware, CPU/memory usage bars, battery threshold filter, history modal
- Governance (`/gouvernance`): encryption status indicator (active/inactive), encrypt/decrypt test utility, retention policy table with create/edit/delete/toggle, suggested default policies
- API client functions for all equipment health and governance endpoints
- Nav items: "Équipement" (all roles), "Gouvernance" (ADMIN only)
- Full i18n support (FR + EN)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No threat flags found — all threat register mitigations implemented:
- T-02-22 (MQTT spoofing): uses Phase 1 validated topic structure
- T-02-23 (encryption key exposure): key stored in env var, never in DB or logs
- T-02-24 (alert fatigue): Redis debounce keys per device+alertType with configurable TTL
- T-02-25 (retention policy deletion): @Roles(ADMIN) on all mutation endpoints
- T-02-26 (pruning wrong data): event type validated against whitelist before DELETE

## Self-Check: PASSED

- [x] All 22 created files exist on disk
- [x] All 3 commits exist in git log
- [x] Prisma schema validates with RetentionPolicy model
- [x] Shared package builds (`pnpm --filter @repo/shared build`) clean
- [x] API TypeScript compilation passes (`npx tsc --noEmit`)
- [x] No accidental file deletions in any commit
- [x] No blocking stubs found
