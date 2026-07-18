---
phase: 04-bastion-enterprise
plan: 01
subsystem: [schema, shared, api]
tags: [prisma, zod, typescript, sharp, pseudonymization, hapdp, compliance, storage, integration, backup]

requires:
  - phase: 03-bastion-ai-access-control
    provides: BastionModule, Organization extensions, multi-site primitives
  - phase: 02-vision-pack
    provides: Shared package patterns, Prisma model conventions

provides:
  - Phase 4 Prisma data models (7 new + 2 extensions)
  - Phase 4 Zod schemas, TypeScript types, and event type constants
  - BASTION feature module keys for feature gating
  - Pseudonymization face-blurring interceptor with sharp

affects:
  - 04-02 (compliance controllers)
  - 04-03 (subject access portal)
  - 04-04 (advanced storage)
  - 04-05 (API integration)
  - 04-06 (fire alarm/BMS integration)
  - 04-07 (audit dashboard)

tech-stack:
  added:
    - sharp 0.35.3 (Gaussian blur image processing)
    - BASTION_EVENT_TYPES constant (16 event type strings)
    - BASTION_MODULE_KEYS (5 sub-feature module keys)
  patterns:
    - Pseudonymization via NestInterceptor with role-based bypass
    - Blur cache in /tmp with 5-minute TTL
    - Organization-level feature toggle (pseudonymizationEnabled)

key-files:
  created:
    - apps/api/src/modules/pseudonymization/pseudonymization.service.ts
    - apps/api/src/modules/pseudonymization/pseudonymization.interceptor.ts
    - apps/api/src/modules/pseudonymization/pseudonymization.module.ts
    - packages/shared/src/schemas/storage.schema.ts
    - packages/shared/src/schemas/integration.schema.ts
    - packages/shared/src/types/compliance.types.ts
    - packages/shared/src/types/storage.types.ts
    - packages/shared/src/types/integration.types.ts
    - packages/shared/src/constants/bastion-event-types.ts
    - packages/shared/src/constants/feature-keys.ts
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/package.json
    - apps/api/src/app.module.ts
    - apps/api/src/common/decorators/feature-gate.decorator.ts
    - packages/shared/src/schemas/compliance.schema.ts
    - packages/shared/src/index.ts

key-decisions:
  - "sharp 0.35.3 installed for on-the-fly face blurring via Gaussian blur sigma=15"
  - "PseudonymizationInterceptor registered as provider (not APP_INTERCEPTOR) — applied per-route via controller decorators"
  - "Blur cache in /tmp/blur-cache with 5-minute TTL avoids recomputing for frequently accessed snapshots"
  - "BASTION_MODULE_KEYS defined in both feature-keys.ts (shared) and feature-gate.decorator.ts (API) for dual import paths"

requirements-completed:
  - BAS-25
  - BAS-26
  - BAS-27
  - BAS-28
  - BAS-29
  - BAS-30
  - BAS-31
  - BAS-32
  - BAS-33
  - BAS-34
  - BAS-35
  - BAS-41
  - BAS-42
  - BAS-43
  - BAS-44

duration: 26min
completed: 2026-07-18
---

# Phase 04 Plan 01: Phase 4 Foundation — Schema, Shared Types, and Pseudonymization Pipeline

**7 new Prisma models, 3 new Zod schema files, 3 new TypeScript types files, BASTION_EVENT_TYPES constant, BASTION_MODULE_KEYS, sharp-based face blurring pseudonymization interceptor**

## Performance

- **Duration:** 26 min
- **Started:** 2026-07-18T20:27:00Z
- **Completed:** 2026-07-18T20:53:00Z
- **Tasks:** 3
- **Files modified:** 19 (7 created, 12 modified)

## Accomplishments

- **Prisma schema** extended with 7 new models (ProcessingRecord, SubjectAccessRequest, ForensicEvidence, BackupConfig, BackupJob, IntegrationEndpoint, ConsentSignage) and 2 extensions (RetentionPolicy.siteId, Organization.pseudonymizationEnabled + nasConfig). All models have organizationId for multi-tenant isolation.
- **Shared package** extended with Zod schemas for HAPDP declarations, consent signage, subject access (OTP + verify + request), retention policy, forensic evidence, backup config, fire alarm events, and BMS events. TypeScript DTO interfaces for all Phase 4 entities. BASTION_EVENT_TYPES constant with 16 event type strings.
- **Pseudonymization module** with sharp-based Gaussian blur (sigma=15), file-based /tmp cache with 5-minute TTL, role-based bypass (ADMIN/SUPERVISOR/SUPER_ADMIN/GLOBAL_ADMIN), and audit logging for full-resolution snapshot access (VIEW_SNAPSHOT_FULL).

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema with Phase 4 models** — `3027cb6` (feat)
2. **Task 2: Create shared package schemas, types, constants, and event types** — `2088a59` (feat)
3. **Task 3: Install sharp and create pseudonymization module for face blurring** — `80f33d4` (feat)

## Files Created/Modified

### Created (7 files)
- `packages/shared/src/schemas/storage.schema.ts` — Retention policy, forensic evidence, backup config Zod schemas
- `packages/shared/src/schemas/integration.schema.ts` — Fire alarm and BMS event Zod schemas
- `packages/shared/src/types/compliance.types.ts` — HapdpDeclarationDto, SubjectAccessRequestDto, SubjectDataDto
- `packages/shared/src/types/storage.types.ts` — Storage DTOs including BastionKpisDto
- `packages/shared/src/types/integration.types.ts` — IntegrationEndpointDto, FireAlarmEventDto, BmsEventDto
- `packages/shared/src/constants/bastion-event-types.ts` — BASTION_EVENT_TYPES with 16 event types
- `packages/shared/src/constants/feature-keys.ts` — BASTION_MODULE_KEYS (5 sub-feature keys)
- `apps/api/src/modules/pseudonymization/pseudonymization.service.ts` — Face blurring service with sharp + cache
- `apps/api/src/modules/pseudonymization/pseudonymization.interceptor.ts` — NestInterceptor for role-based blur
- `apps/api/src/modules/pseudonymization/pseudonymization.module.ts` — NestJS module registration

### Modified (5 files)
- `apps/api/prisma/schema.prisma` — +148 lines for 7 new models + 2 extensions
- `apps/api/package.json` — Added sharp 0.35.3 dependency
- `apps/api/src/app.module.ts` — Registered PseudonymizationModule
- `apps/api/src/common/decorators/feature-gate.decorator.ts` — Added BASTION_MODULE_KEYS
- `packages/shared/src/schemas/compliance.schema.ts` — Extended with HAPDP Zod schemas
- `packages/shared/src/index.ts` — Added barrel exports for all Phase 4 modules

## Decisions Made

- **sharp 0.35.3** installed via pnpm — APPROVED per Package Legitimacy Audit (40M weekly downloads, 12+ years, MIT license)
- **PseudonymizationInterceptor** registered as a standard provider (not global APP_INTERCEPTOR) — to be applied per-route via controller decorators in downstream plans
- **Blur cache** in `/tmp/blur-cache` with 5-minute TTL — avoids CPU-intensive recomputation for frequently accessed snapshots
- **BASTION_MODULE_KEYS** defined in both `feature-keys.ts` (shared package) and `feature-gate.decorator.ts` (API) — provides flexibility for both client-side and server-side feature gating
- **RetentionPolicy.eventType** changed from `@unique` to non-unique — allows multiple policies per event type when site-scoped

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **Duplicate RetentionPolicyDto export** — Already exported from `governance.types.ts`. Resolved by renaming the storage export to `StorageRetentionPolicyDto` in the barrel file.
- **Prisma client needed regeneration** — After schema changes, `npx prisma generate` was required before NestJS build would recognize `Organization.pseudonymizationEnabled`.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All Phase 4 data models ready — downstream plans can query ProcessingRecord, SubjectAccessRequest, ForensicEvidence, BackupConfig, BackupJob, IntegrationEndpoint, ConsentSignage
- Shared Zod schemas and TypeScript types available for all Phase 4 endpoint DTOs
- Pseudonymization module ready for controller integration in Plan 02
- Next: **Plan 02** — Compliance controllers and HAPDP wizard endpoints

---

*Phase: 04-bastion-enterprise*
*Completed: 2026-07-18*
