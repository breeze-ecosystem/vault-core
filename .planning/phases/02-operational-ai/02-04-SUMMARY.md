---
phase: 02-operational-ai
plan: 04
type: execute
subsystem: anpr
tags: [anpr, vehicle-recognition, paddleocr, allowlist, blocklist, dashboard]
requires: [02-03]
provides: [anpr-pipeline, vehicle-events]
affects: [ai-preprocessor, api, dashboard, shared-package]
tech-stack:
  added:
    - PaddleOCR 3.7+ (Python) - License plate recognition
    - paddlepaddle 2.6+ (Python) - Deep learning backend for PaddleOCR
  patterns:
    - BullMQ queue with concurrency limit for AI processor protection
    - Redis-cached plate evaluation with TTL-based expiry
    - TimescaleDB hypertable for time-series vehicle events
    - Site-scoped vehicle event queries with raw SQL
key-files:
  created:
    - services/ai-preprocessor/app/routes/anpr.py
    - apps/api/migrations/timescaledb/up/008_vehicle_events.sql
    - apps/api/src/modules/anpr/anpr.module.ts
    - apps/api/src/modules/anpr/anpr.controller.ts
    - apps/api/src/modules/anpr/anpr.service.ts
    - apps/api/src/modules/anpr/anpr.processor.ts
    - packages/shared/src/constants/vehicle-constants.ts
    - packages/shared/src/types/vehicle.types.ts
    - packages/shared/src/schemas/vehicle.schema.ts
    - apps/dashboard/app/(dashboard)/vehicules/page.tsx
    - apps/dashboard/app/(dashboard)/vehicules/listes/page.tsx
    - apps/dashboard/app/(dashboard)/vehicules/[id]/page.tsx
  modified:
    - services/ai-preprocessor/requirements.txt
    - services/ai-preprocessor/app/main.py
    - apps/api/prisma/schema.prisma
    - apps/api/src/app.module.ts
    - apps/api/src/modules/queue/queue.module.ts
    - packages/shared/src/index.ts
    - apps/dashboard/lib/api.ts
    - apps/dashboard/lib/nav-config.ts
    - apps/dashboard/lib/i18n/dictionaries/fr.ts
    - apps/dashboard/lib/i18n/dictionaries/en.ts
decisions:
  - "AI Preprocessor ANPR endpoint created as modular route (app/routes/anpr.py) following existing inference.py pattern, not inline in main.py"
  - "VehicleList entries use Redis cache (TTL 1 hour) with flush-on-mutate to minimize Prisma queries during plate evaluation"
  - "Unknown plates default to DENY with reason 'unknown' rather than ALLOW — security-first default"
  - "Vehicle events use PostgreSQL raw queries ($queryRawUnsafe) since vehicle_events is a TimescaleDB hypertable outside Prisma's managed schema"
  - "Dashboard lists page uses a short-lived siteId placeholder that gets overridden by server-side user.siteId"
metrics:
  duration: 18min
  completed: 2026-07-14T18:22:00Z
  tasks: 3/3
  files_created: 12
  files_modified: 10
---

# Phase 02 Plan 04: ANPR/LPR Vehicle Recognition — Vertical Slice Summary

Delivered a complete ANPR vertical slice: camera frames → PaddleOCR recognition → allowlist/blocklist evaluation → vehicle_events logging → dashboard search UI. The pipeline runs on a dedicated BullMQ queue (`anpr-processing`) with concurrency limit 2 to protect the AI Preprocessor from overload.

## Commits

| Hash | Message |
|------|---------|
| 8bac7c5 | feat(02-operational-ai): Task 1 - ANPR Python endpoint, Prisma models, TimescaleDB migration, shared types |
| 0df4bcb | feat(02-operational-ai): Task 2 - ANPR API controller, service, and processor |
| b627978 | feat(02-operational-ai): Task 3 - ANPR dashboard pages, API client, nav, and i18n |

## Results by Requirement

| Requirement | Status | Evidence |
|-------------|--------|----------|
| ANPR-01: License plate recognition via PaddleOCR | ✅ | `POST /api/v1/anpr` with PaddleOCR returning plates with confidence >= 0.5 |
| ANPR-02: Allowlist/blocklist management CRUD | ✅ | `POST/PATCH/DELETE /api/vehicles/list` + dashboard UI at `/vehicules/listes` |
| ANPR-03: Plate evaluation with Redis caching | ✅ | `evaluatePlate()` checks Redis → Prisma → returns ALLOW/DENY/UNKNOWN |
| ANPR-04: Vehicle events logged to TimescaleDB | ✅ | `008_vehicle_events.sql` hypertable with decision, confidence, metadata |
| ANPR-05: Searchable event history | ✅ | `GET /api/anpr/events` with plate ILIKE, time range, decision filters |

## Architecture

```
Camera Frame (base64)
     │
     ▼
[AnprProcessor] ── BullMQ queue (concurrency: 2)
     │
     ├─► AnprService.analyzePlate() ──HTTP POST──► AI Preprocessor /api/v1/anpr
     │                                                    │
     │                                          PaddleOCR (lazy-loaded)
     │                                                    │
     │                                          ◄── plates[] with confidence ──
     │
     ├─► AnprService.evaluatePlate()
     │        ├─ Redis cache: vehicle:allowlist:{plate} / vehicle:blocklist:{plate}
     │        └─ Prisma VehicleList fallback
     │
     └─► AnprService.recordEvent()
              └─ $queryRawUnsafe INSERT INTO vehicle_events
              └─ EventEmitter: "anpr.recognized"
              └─ EventEmitter: "equipment.alert" (if blocklist match)
```

## Dashboard Pages

| Route | Content |
|-------|---------|
| `/vehicules` | Vehicle events list with plate search, date range, decision filter, pagination + Lists tab with summary cards |
| `/vehicules/listes` | Allowlist/Blocklist management with add/edit/delete modals |
| `/vehicules/[plate]` | Vehicle plate detail with event timeline, stats, quick-list actions |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Prisma Schema] Added missing User relation for VehicleList**
- **Found during:** Task 1 (Prisma validation)
- **Issue:** `VehicleList.createdBy` field references `User` but User model had no opposite relation field
- **Fix:** Added `vehicleListEntries VehicleList[]` to User model
- **Files modified:** `apps/api/prisma/schema.prisma`
- **Commit:** 8bac7c5

**2. [Rule 3 - Project Structure] AI Preprocessor uses modular route pattern, not single main.py**
- **Found during:** Task 1
- **Issue:** Plan assumed single `main.py` file, but actual structure uses `app/main.py` with modular routes in `app/routes/`
- **Fix:** Created `app/routes/anpr.py` with route registration in `app/main.py`
- **Files modified:** `services/ai-preprocessor/app/main.py`, created `services/ai-preprocessor/app/routes/anpr.py`
- **Commit:** 8bac7c5

**3. [Rule 3 - TypeScript] Optional parameter ordering in controller**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Optional `@Query("limit") limit?: string` before required `@Req() req: FastifyRequest`
- **Fix:** Changed to `limit: string | undefined` (required but accepts undefined)
- **Files modified:** `apps/api/src/modules/anpr/anpr.controller.ts`
- **Commit:** 0df4bcb

**4. [Rule 1 - TypeScript] t() function interpolation not supported**
- **Found during:** Task 3 (TypeScript compilation)
- **Issue:** `t("vehicles.lists.deleteConfirm", { plate })` called with 2 args but `t()` only accepts 1
- **Fix:** Replaced with template literal string
- **Files modified:** `apps/dashboard/app/(dashboard)/vehicules/listes/page.tsx`
- **Commit:** b627978

### Auth Gates

None — the paddleocr package check was pre-verified per the plan instructions.

## Known Stubs

| File | Line | Description |
|------|------|-------------|
| `apps/dashboard/app/(dashboard)/vehicules/listes/page.tsx` | ~207 | `siteId` hardcoded to `"00000000-0000-0000-0000-000000000000"` placeholder — server will override with user's real siteId |
| `apps/dashboard/app/(dashboard)/vehicules/page.tsx` | ~114 | `t("common.all")` fallback `"Tous"` — `common.all` not in i18n dictionary (pre-existing gap) |

## Threat Surface Scan

No new threat surface beyond what the plan's `<threat_model>` describes. All endpoints are protected by `@Roles()` decorators. The ANPR processor concurrency (2) mitigates T-02-16. The 0.5 confidence threshold mitigates T-02-14.

## Self-Check: PASSED

All 12 created files and 10 modified files accounted for. All 3 commits verified in git log. Prisma schema validates. Shared package builds. API and Dashboard TypeScript compilation passes.
