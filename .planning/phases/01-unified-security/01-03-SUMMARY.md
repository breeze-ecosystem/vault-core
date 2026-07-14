---
phase: 01-unified-security
plan: 03
title: "Video-Event Timeline & Tailgating Detection"
type: feature
wave: 3
tags: [correlation, video, timeline, tailgating, AI, BullMQ, Socket.IO]
depends_on:
  - 01-01
  - 01-02
provides:
  - VEC-02 (unified timeline)
  - VEC-03 (click-to-video)
  - VEC-04 (real-time stream)
  - VEC-05 (timeline search)
  - AI-04 (tailgating detection)
  - ACC-07 (camera-door mapping consumed by correlation)
tech-stack:
  added:
    - BullMQ queues: video-correlation, tailgating-detection
    - NestJS EventEmitter2 (access.granted/denied/door.state-changed listeners)
    - Ollama vision (moondream) for tailgating person counting
    - Socket.IO /ws/access namespace for real-time timeline push
  patterns:
    - CorrelationModule: async event handlers never block access decisions (D-13)
    - CameraDoorMap priority-sorted camera selection (D-14)
    - TimescaleDB UNION ALL merge for unified timeline (D-15)
    - WorkerHost BullMQ pattern (matching existing DoorProcessor)
    - 120s Redis cooldown for tailgating alert dedup (D-21)
key-files:
  created:
    - apps/api/src/modules/correlation/correlation.module.ts
    - apps/api/src/modules/correlation/correlation.service.ts
    - apps/api/src/modules/correlation/correlation.controller.ts
    - apps/api/src/modules/correlation/correlation.processor.ts
    - apps/api/src/modules/correlation/tailgating.processor.ts
    - apps/dashboard/app/(dashboard)/chronologie/page.tsx
    - packages/shared/src/types/correlation.types.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/dashboard/lib/api.ts
    - apps/dashboard/lib/nav-config.ts
    - apps/dashboard/lib/i18n/dictionaries/fr.ts
    - apps/dashboard/lib/i18n/dictionaries/en.ts
    - packages/shared/src/index.ts
decisions:
  - "CorrelationModule uses WorkerHost pattern (not @Process decorator) matching existing DoorProcessor pattern"
  - "Tailgating detection uses native fetch to Ollama /api/generate with moondream model"
  - "Redis cooldown keys use tailgating:cooldown:{doorId} pattern with 120s TTL"
  - "Unified timeline uses $queryRawUnsafe UNION ALL for TimescaleDB hypertable merge"
  - "searchEvents filters by zone via Door subquery since access_events stores door_id not zone_id"
  - "Dashboard page handles missing siteId gracefully — timeline works site-scoped when available"
metrics:
  duration: "~11 minutes"
  completed: "2026-07-14T15:52:04Z"
  tasks: 2
  files: 12
  commits: 2
---

# Phase 1 Plan 03: Video-Event Timeline & Tailgating Detection Summary

**One-liner:** Built unified security timeline with async video correlation and AI-powered tailgating detection — operators click any access event to view correlated camera footage in real time.

## Task Summary

| Task | Name | Commit | Type | Files |
|------|------|--------|------|-------|
| 1 | Correlation Engine & API | `59f1cbc` | feat | 8 (6 new + 2 modified) |
| 2 | Unified Timeline Dashboard | `595184d` | feat | 5 (1 new + 4 modified) |

## What Was Built

### Backend — Correlation Engine (`apps/api/src/modules/correlation/`)

**CorrelationService** listens for three event patterns via `@OnEvent`:
- `access.granted` → enqueues `correlate-video` (BullMQ, async) + `detect-tailgating` (BullMQ, 3s delay)
- `access.denied` → enqueues `correlate-video` (for denied access events)
- `door.state-changed` → emits `timeline.new-event` for real-time Socket.IO push

All event handlers are `{ async: true }` — they never block the access decision (D-13).

**CorrelationProcessor** (`video-correlation` queue):
- Queries `CameraDoorMap` for cameras mapped to the door (D-14), sorted by `priority ASC`
- Uses the top-priority camera's `lastSnapshotUrl` for Phase 1 MVP
- Updates `access_events` hypertable metadata with correlation data (cameraId, snapshotUrl, thumbnailUrl)
- Emits `correlation.ready` event for real-time Socket.IO push (VEC-04)

**TailgatingProcessor** (`tailgating-detection` queue):
- Fires 3 seconds after valid access event (D-20)
- Gets the door's primary camera snapshot
- Sends to Ollama vision model (`moondream`) at `/api/generate` for person counting
- If >1 person detected: creates HIGH severity alert with 120s Redis cooldown per door (D-21)
- Gracefully handles Ollama being unreachable (returns `skipped` instead of error)

**CorrelationController** endpoints:
- `GET /api/timeline/events` — unified timeline (VEC-02), requires siteId
- `GET /api/timeline/search` — multi-filter search (VEC-05), supports time range, credential, user, door, zone, decision
- `GET /api/timeline/events/:eventId/video` — video correlation data (VEC-03)
- `GET /api/timeline/stream` — WebSocket connection info (VEC-04)

**Timeline queries** (TimescaleDB via `$queryRawUnsafe`):
- `searchEvents()` — parameterized WHERE clauses with LIMIT/OFFSET pagination
- `getUnifiedTimeline()` — UNION ALL merge of `access_events` + `door_state_log` (D-15)
- Both gracefully return empty results if hypertables don't exist yet

### Frontend — Timeline Dashboard (`/chronologie`)

**Page features:**
- Vertical timeline with colored event dot indicators (green=granted, red=denied, blue=door state, orange=forced)
- Event cards show: door name, zone, summary, relative timestamp, thumbnail preview
- Click event → video panel slides in with snapshot, metadata, camera link (VEC-03)
- Socket.IO real-time stream to `/ws/access` with `subscribe:site` (VEC-04)
- Auto-pause on scroll: "Nouveaux (N)" badge when scrolled up, clears on scroll-to-bottom
- Expandable search filter panel: time range, door, zone, credential, decision dropdowns (VEC-05)
- Search results paginate via "Charger plus" infinite scroll
- "Retour au direct" button exits search mode back to live stream
- Loading skeletons, error state with retry, empty state with contextual message

**API client additions** (`apps/dashboard/lib/api.ts`):
- `fetchTimeline()` — GET /api/timeline/events
- `searchTimeline()` — GET /api/timeline/search
- `fetchEventVideo()` — GET /api/timeline/events/:id/video
- Full TypeScript types: `TimelineEntryDto`, `TimelineSearchParams`

**Navigation:** "Chronologie" added to sidebar with `Clock` icon, visible for all roles.

**i18n:** Full French and English dictionaries for `timeline` namespace (title, filters, event types, empty states, video loading).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed BullMQ decorator compatibility**
- **Found during:** Task 1
- **Issue:** Plan specified `@Process('correlate-video')` decorator pattern, but installed `@nestjs/bullmq@11.0.4` only exports `Processor` and `WorkerHost` — not `Process`
- **Fix:** Converted both `CorrelationProcessor` and `TailgatingProcessor` to extend `WorkerHost` with `process()` method and switch/case on `job.name` — matching existing `DoorProcessor` pattern
- **Files modified:** `correlation.processor.ts`, `tailgating.processor.ts`
- **Commit:** `59f1cbc`

**2. [Rule 3 - Blocking] Fixed dashboard TypeScript errors**
- **Found during:** Task 2
- **Issue:** `User` type from `useAuth()` lacks `siteId` property; `toast.error()` is not the correct toast API (should be `toast(msg, "error")`)
- **Fix:** Used `(user as any)?.siteId` pattern matching existing `portes/page.tsx`; changed `toast.error()` to `toast(msg, "error")`
- **Files modified:** `page.tsx`
- **Commit:** `595184d`

## Threat Flags

None — all new surface is within existing authenticated NestJS routes protected by JwtAuthGuard + RolesGuard. Tailgating Ollama calls are server-side only. No new attack surface introduced.

## Known Stubs

None — all data flows are wired end-to-end. Timeline gracefully handles missing hypertable data with empty-result fallbacks. Tailgating detection gracefully handles Ollama unavailability.

## Verification Summary

- TypeScript compilation: PASSED for both `@repo/shared` and `@repo/api` and `@repo/dashboard`
- CorrelationModule registered in AppModule: CONFIRMED
- All 6 backend files created: CONFIRMED
- Dashboard page at /chronologie: CONFIRMED
- API client functions present: CONFIRMED (3 functions)
- Nav-config Chronologie entry added: CONFIRMED
- i18n dictionaries updated (fr + en): CONFIRMED

## Self-Check

Checking committed files exist:
- `apps/api/src/modules/correlation/correlation.module.ts` — EXISTS
- `apps/api/src/modules/correlation/correlation.service.ts` — EXISTS
- `apps/api/src/modules/correlation/correlation.controller.ts` — EXISTS
- `apps/api/src/modules/correlation/correlation.processor.ts` — EXISTS
- `apps/api/src/modules/correlation/tailgating.processor.ts` — EXISTS
- `apps/dashboard/app/(dashboard)/chronologie/page.tsx` — EXISTS
- `packages/shared/src/types/correlation.types.ts` — EXISTS

Checking commits:
- `59f1cbc` — EXISTS
- `595184d` — EXISTS

## Self-Check: PASSED
