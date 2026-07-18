---
phase: 03-bastion-ai-access-control
plan: 03
subsystem: api
tags: [nestJs, bastion, face-recognition, qdrant, access-control, multi-site, rbac, video-correlation]
requires:
  - phase: 03-bastion-ai-access-control
    plan: 02
    provides: BASTION Prisma models, Qdrant faces collection, shared schemas
provides:
  - BastionModule (face enrollment, blacklist, passage history APIs)
  - FINGERPRINT/FACE credential type support with validation and evaluation
  - AccessGroup CRUD with member management
  - CredentialSiteAccess management (multi-site credential permissions)
  - Video correlation snapshot + clip on denied/forced/held-open events
  - Schedule grid management
  - MultiSiteModule (child site management, aggregate KPI, comparison, global search)
  - Extended TenantIsolationGuard (GLOBAL_ADMIN parent-child, SITE_ADMIN restriction)
  - FacePassage Prisma model and BastionModule BullMQ queue
affects:
  - 03-bastion-ai-access-control
tech-stack:
  added: []
  patterns:
    - BASTION endpoint decorator chain: @RequiresPack → @Roles → @Audited
    - Video correlation via BullMQ access-events queue and DoorService @OnEvent handlers
    - Multi-site aggregate KPI via raw SQL + Prisma count aggregation
    - Prisma model FacePassage for time-series face detection events
key-files:
  created:
    - apps/api/src/modules/bastion/bastion.module.ts
    - apps/api/src/modules/bastion/bastion.controller.ts
    - apps/api/src/modules/bastion/bastion.service.ts
    - apps/api/src/modules/bastion/face/face.controller.ts
    - apps/api/src/modules/bastion/face/face.service.ts
    - apps/api/src/modules/bastion/face/face.processor.ts
    - apps/api/src/modules/multi-site/site.module.ts
    - apps/api/src/modules/multi-site/site.controller.ts
    - apps/api/src/modules/multi-site/site.service.ts
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/src/app.module.ts
    - apps/api/src/common/guards/tenant-isolation.guard.ts
    - apps/api/src/modules/access/access.controller.ts
    - apps/api/src/modules/access/access.service.ts
    - apps/api/src/modules/access/access.processor.ts
    - apps/api/src/modules/ai-agent/qdrant/qdrant.service.ts
    - apps/api/src/modules/door/door.service.ts
    - apps/api/src/modules/site/site.service.ts
key-decisions:
  - "FacePassage model stores time-series face detection events with risk score and snapshot URL"
  - "FACE credential evaluation uses Redis-based face match cache with risk threshold check"
  - "maxSites enforced from Organization model field (default 1), validated in multi-site create"
  - "Video correlation uses existing @fastify/static snapshot pipeline and CameraDoorMap priority"
  - "TenantIsolationGuard made async to support Prisma lookups for multi-site hierarchy"
duration: 4 min
completed: 2026-07-18
requirements-completed:
  - BAS-01
  - BAS-07
  - BAS-08
  - BAS-09
  - BAS-10
  - BAS-11
  - BAS-12
  - BAS-13
  - BAS-14
  - BAS-15
  - BAS-16
  - BAS-17
  - BAS-18
  - BAS-19
---

# Phase 3 Plan 3: BASTION Backend APIs — Face Enrollment, Extended Access Control, Multi-site Management

**Complete NestJS backend API implementation for BASTION: face enrollment/blacklist pipeline, FINGERPRINT/FACE credential types, access groups, video correlation, schedules, multi-site hierarchy with aggregate KPI, extended TenantIsolationGuard, and license maxSites enforcement**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-18T19:19:29Z
- **Completed:** 2026-07-18T19:24:24Z
- **Tasks:** 3
- **Files modified:** 18 (9 new, 9 modified)

## Accomplishments

- **BastionModule created** with face enrollment flow (Zod validation → AI Preprocessor embedding → Qdrant upsert → Prisma create → cache refresh), full face CRUD, blacklist toggle, passage history with pagination, and BullMQ `bastion-events` queue for async face passage processing
- **FaceService** with embedding extraction, whitelist cache sync, and Qdrant search matches
- **FaceProcessor** handles face-passage persistence, blacklist-alert dispatch (CRITICAL), and enrollment-complete post-processing
- **FINGERPRINT credential type** validated with required `fingerprintTemplateHash` in create/update
- **FACE credential type** with Redis-based face match evaluation that checks risk score threshold from linked Face model
- **AccessGroup CRUD** with member add/remove (linked to OrganizationMember.accessGroupId)
- **CredentialSiteAccess management** for multi-site credential permissions with unique constraint
- **Video correlation** via DoorService.triggerVideoCorrelation() enqueues to access-events queue on forced, held-open, and access-denied events
- **Schedule grid creation** helper method converting day/hour grid entries to schedule format
- **MultiSiteModule** with child site management (list, create, detail, update, soft-delete)
- **Aggregate KPI** across child sites: total cameras/online, active alerts, doors, members, uptime percentage
- **Cross-site comparison** with side-by-side metrics per site
- **Global search** across child orgs for events (alerts), people (faces + users), and credentials — results tagged with site name
- **Extended TenantIsolationGuard** with async Prisma lookups: GLOBAL_ADMIN can access child orgs, SITE_ADMIN restricted to own org
- **Prisma FacePassage model** added with relations to Face, Camera, Organization
- **QdrantService.setFacePayload** method for updating face point metadata (blacklist toggles)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BastionModule** - `a4e5831` (feat: create BastionModule with face enrollment, blacklist, and passage history)
2. **Task 2: Extend access control** - `77cea33` (feat: extend access control with credential types, groups, video correlation, schedules)
3. **Task 3: Create Multi-site backend** - `50e57eb` (feat: create multi-site backend with RBAC, tenant isolation, aggregate API)

**Plan metadata:** Pending (summary commit)

## Files Created
- `apps/api/src/modules/bastion/bastion.module.ts` - BastionModule with BullMQ queue
- `apps/api/src/modules/bastion/bastion.controller.ts` - Face enrollment, blacklist, passage API endpoints
- `apps/api/src/modules/bastion/bastion.service.ts` - Face enrollment pipeline, CRUD, Qdrant integration
- `apps/api/src/modules/bastion/face/face.controller.ts` - Face search sub-controller
- `apps/api/src/modules/bastion/face/face.service.ts` - Embedding extraction, cache sync, Qdrant search
- `apps/api/src/modules/bastion/face/face.processor.ts` - BullMQ processor for face-passage, blacklist-alert jobs
- `apps/api/src/modules/multi-site/site.module.ts` - MultiSiteModule module definition
- `apps/api/src/modules/multi-site/site.controller.ts` - Multi-site management API endpoints
- `apps/api/src/modules/multi-site/site.service.ts` - Child site CRUD, aggregate KPI, global search, comparison

## Files Modified
- `apps/api/prisma/schema.prisma` - Added FacePassage model with relations
- `apps/api/src/app.module.ts` - Registered BastionModule and MultiSiteModule
- `apps/api/src/common/guards/tenant-isolation.guard.ts` - Extended with async parent-child org support
- `apps/api/src/modules/access/access.controller.ts` - Added group, site access, schedule grid endpoints
- `apps/api/src/modules/access/access.service.ts` - Extended credential types, groups, site access, schedules
- `apps/api/src/modules/access/access.processor.ts` - Added video-correlation job handler
- `apps/api/src/modules/ai-agent/qdrant/qdrant.service.ts` - Added setFacePayload method
- `apps/api/src/modules/door/door.service.ts` - Added triggerVideoCorrelation + @OnEvent handlers
- `apps/api/src/modules/site/site.service.ts` - Added getSiteStats, getChildren methods

## Decisions Made

- **FacePassage model created** as a standard Prisma model (non-hypertable) for face detection event log, linked to Face, Camera, and Organization
- **FACE credential evaluation** uses a Redis cache entry (`face:access:{credentialId}`) set by the face match pipeline, with risk score compared against the linked Face's `riskThreshold` (default 85)
- **maxSites enforcement** uses Organization model's `maxSites` field directly (default 1), validated at child site creation time in the multi-site service — no separate license JWT claim needed
- **Video correlation** enqueues a BullMQ job to the existing `access-events` queue (same processor used for persist-event), maintaining async processing discipline
- **TenantIsolationGuard made async** (was synchronous) to support Prisma lookups for multi-site org hierarchy validation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added FacePassage model to Prisma schema**
- **Found during:** Task 1 (BastionModule creation)
- **Issue:** `FacePassage` model was not created in Plan 02 — BastionService and FaceProcessor both reference `this.prisma.facePassage` which would not compile
- **Fix:** Added FacePassage model to schema.prisma with relations to Face, Camera, Organization + indexes. Also added opposite relations on Camera and Organization models. Regenerated Prisma client.
- **Files modified:** apps/api/prisma/schema.prisma
- **Verification:** `npx nest build` passes
- **Committed in:** a4e5831 (Task 1 commit)

**2. [Rule 3 - Blocking] QdrantService client is private — added setFacePayload method**
- **Found during:** Task 1 (BastionService.updateQdrantFacePayload)
- **Issue:** BastionService tried to access `qdrantService.client.setPayload()` but `client` is private. Also tried to call `qdrantService.getCollectionName()` which doesn't exist.
- **Fix:** Added `setFacePayload(pointId, payload)` public method to QdrantService. Updated BastionService to use it.
- **Files modified:** apps/api/src/modules/ai-agent/qdrant/qdrant.service.ts, apps/api/src/modules/bastion/bastion.service.ts
- **Verification:** `npx nest build` passes
- **Committed in:** a4e5831 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both auto-fixes were necessary for compilation and correct operation. No scope creep.

## Issues Encountered

- Prisma schema required `@@relation` opposite fields for FacePassage → Camera and FacePassage → Organization — added facePassages relation arrays to both models
- Organization model was missing its closing `}` after adding the facePassages relation — fixed with prisma format

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new_network_calls | bastion.service.ts | Face enrollment makes HTTP calls to AI Preprocessor (`/api/v1/face/register` and `/api/v1/face/refresh-whitelist`) — internal network only, not user-facing |
| threat_flag: async_processor | face.processor.ts | New BullMQ queue `bastion-events` processes face passages and blacklist alerts — follows same pattern as existing access-events queue with withTenantContext pattern |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- BASTION backend API layer complete for face enrollment, extended access control, and multi-site management
- All endpoints decorated with proper guard chains (@RequiresPack, @Roles, @Audited)
- TenantIsolationGuard extended for GLOBAL_ADMIN/SITE_ADMIN hierarchical RBAC
- Video correlation pipeline wired through event-driven architecture
- Ready for Plan 04 (Dashboard UI for BASTION features) and subsequent mobile/verification plans

---

## Self-Check: PASSED

All 18 key files exist (9 new, 9 modified), all 3 commits verified, `npx nest build` passes successfully.

---

*Phase: 03-bastion-ai-access-control*
*Completed: 2026-07-18*
