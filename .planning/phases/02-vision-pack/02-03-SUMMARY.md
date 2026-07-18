---
phase: 02-vision-pack
plan: 03
subsystem: api
tags: [nestjs, detection, face-recognition, onvif, prisma, vision]
requires:
  - phase: 02-01
    provides: VISION shared schemas (detectionZoneSchema, faceWhitelistSchema), Prisma models (DetectionZone, FaceWhitelist)
provides:
  - DetectionModule with zone CRUD and detection-config endpoint
  - FaceRecognitionModule with whitelist CRUD and AI Preprocessor cache endpoint
  - Extended CameraService with ONVIF discovery, substream management, detection zone includes
affects:
  - 02-04 (detection-config consumed by ingestion pipeline)
  - 02-05 (zone CRUD used by dashboard zone editor)
  - 02-07 (face upload UI uses /visages endpoints)
tech-stack:
  added: []
  patterns:
    - Feature-gated zone CRUD with @RequiresFeature('vision_detection_zones')
    - Async ONVIF discovery via Node.js dgram WS-Discovery probe
    - Internal AI Preprocessor cache endpoint pattern (/internal/face-whitelist)
    - VISION face limit enforcement via VISION_MAX_FACES constant
key-files:
  created:
    - apps/api/src/modules/detection/detection.module.ts
    - apps/api/src/modules/detection/detection.service.ts
    - apps/api/src/modules/detection/detection.controller.ts
    - apps/api/src/modules/face-recognition/face-recognition.module.ts
    - apps/api/src/modules/face-recognition/face-recognition.service.ts
    - apps/api/src/modules/face-recognition/face-recognition.controller.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/api/src/modules/camera/camera.service.ts
    - apps/api/src/modules/camera/camera.controller.ts
key-decisions:
  - "Detection-config endpoint placed in DetectionController (not CameraController) to avoid route collision with zone-scoped controller"
  - "ONVIF scan uses built-in Node.js dgram (no external onvif npm dependency) for WS-Discovery multicast probe"
  - "Face recognition embedding stored as base64 in PostgreSQL; AI Preprocessor called via HTTP for embedding extraction"
  - "VISION face limit enforced at service level via VISION_MAX_FACES constant (50) with French error message suggesting BASTION upgrade"
patterns-established:
  - "Internal API pattern: /internal/* routes for inter-service communication without auth"
  - "Async scan pattern: POST returns scanId immediately, GET polls results, 15s WS-Discovery collection window"
requirements-completed:
  - VIS-01
  - VIS-05
  - VIS-07
  - VIS-10
  - VIS-11
duration: 12min
completed: 2026-07-18
---

# Phase 2: VISION Pack — Plan 03 Summary

**NestJS API backend modules for detection zone CRUD, face whitelist management with max-50 enforcement, ONVIF discovery endpoint, and camera substream/subsettings**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-18T17:08:00Z
- **Completed:** 2026-07-18T17:20:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- DetectionModule with full zone CRUD (`GET/POST /cameras/:cameraId/zones`, `PATCH/DELETE /zones/:id`) and detection-config endpoint for AI Preprocessor consumption
- FaceRecognitionModule with whitelist CRUD (`/visages`), VISION 50-face limit enforcement, embedding extraction via AI Preprocessor HTTP call, and internal cache refresh endpoint (`GET /internal/face-whitelist`)
- CameraService extended with async ONVIF discovery via WS-Discovery multicast (dgram-based, no external dependency), substream URL management (`PATCH /cameras/:id/substream`), and detection zone includes in `findById`
- All mutation endpoints protected by `@Roles(ADMIN, SUPER_ADMIN)`, `@RequiresFeature()` gates, and audit logging

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DetectionModule (zones CRUD + sensitivity config)** - `3f39412` (feat)
2. **Task 2: Create FaceRecognitionModule (whitelist CRUD + embedding endpoint)** - `00b0c8f` (feat)
3. **Task 3: Extend CameraService/Controller for ONVIF discovery, sensitivity, substreams** - `963924e` (feat)

## Files Created/Modified

- `apps/api/src/modules/detection/detection.module.ts` — Detection module registration
- `apps/api/src/modules/detection/detection.service.ts` — Zone CRUD, detection config aggregation
- `apps/api/src/modules/detection/detection.controller.ts` — Zone endpoints with RBAC + feature gates + audit
- `apps/api/src/modules/face-recognition/face-recognition.module.ts` — Face recognition module registration
- `apps/api/src/modules/face-recognition/face-recognition.service.ts` — Whitelist CRUD with 50-face limit, embedding extraction
- `apps/api/src/modules/face-recognition/face-recognition.controller.ts` — /visages endpoints + /internal/face-whitelist
- `apps/api/src/modules/camera/camera.service.ts` — Added ONVIF scan + substream + detectionZones in findById
- `apps/api/src/modules/camera/camera.controller.ts` — Added ONVIF scan/substream endpoints
- `apps/api/src/app.module.ts` — Added DetectionModule + FaceRecognitionModule

## Decisions Made

- Detection-config endpoint placed in DetectionController to avoid route collision with CameraController. The camera module's `/cameras/:id` prefix would conflict with two controllers registering the same route
- ONVIF discovery implemented with Node.js built-in `dgram` module (no `onvif` npm dependency) — sends WS-Discovery `Probe` message to `239.255.255.250:3702` and collects responses for 15 seconds
- Face embeddings stored as `embeddingBase64` in PostgreSQL; AI Preprocessor called via HTTP `POST /face/register` for extraction, with graceful fallback to null if unavailable
- `getDetectionConfig` in DetectionService checks `vision_face_whitelist` feature flag dynamically to set `faceRecognitionEnabled`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 3 new API modules built and building successfully
- Ready for Plan 04 (alert channels, recording infrastructure) which will consume detection-config data
- ONVIF scan endpoint ready for dashboard UI integration in Plan 06

---

*Phase: 02-vision-pack*
*Completed: 2026-07-18*
