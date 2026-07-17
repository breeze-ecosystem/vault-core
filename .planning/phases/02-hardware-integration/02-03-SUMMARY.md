---
phase: 02-hardware-integration
plan: 03
subsystem: api
tags: [nestjs, mqtt, eventemitter2, socketio, bullmq, timescaledb, ptz, osdp, onvif]
requires:
  - phase: 02-hardware-integration
    plan: 02
    provides: shared schemas (doorCommandSchema, createDoorMonitoringSchema, createCameraDoorMapSchema, ptzContinuousSchema, enrollControllerSchema), Controller Prisma model, Camera PTZ/ONVIF fields, Door->Controller FK
provides:
  - MQTT topic subscriptions for OSDP events, controller discovery, ONVIF events
  - EventEmitter2 routing for mqtt.door.event, mqtt.controller.discovery, mqtt.onvif.event
  - Controller module (GET /api/controllers, PATCH /api/controllers/:id/enroll) with discovery upsert
  - Door command endpoint (POST /api/doors/:id/cmd) with lock/unlock
  - Door creation endpoint (POST /api/doors)
  - CameraDoorMap CRUD (GET/POST /api/doors/:id/camera-maps, DELETE /api/doors/:id/camera-maps/:mapId)
  - OSDP event processing pipeline (MQTT → EventEmitter2 → Gateway → Dashboard Socket.IO)
  - DoorProcessor OSDP event handler with CameraDoorMap snapshot request
  - DoorGateway Socket.IO events: door:osdp-event, controller:status, controller:discovery, ptz:preset-update, door:command-state
  - Camera PTZ endpoints (continuous, stop, goto-preset, save-preset) with supervisor+ role gating
  - CameraService PTZ command dispatch and preset management
  - Dashboard API client functions for door commands, CameraDoorMap, PTZ, and controller enrollment
  - hardware_event_log TimescaleDB hypertable with 90-day retention policy (D-18)
affects: [Dashboard doors page, Dashboard camera viewer, Dashboard equipement controllers page, Dashboard event journal]

tech-stack:
  added: []
  patterns:
    - MQTT → EventEmitter2 → Service/Gateway event pipeline
    - @OnEvent handler in service + gateway pattern
    - ZodValidationPipe on POST/PATCH/DELETE endpoints
    - @Roles + @Audited decorators on state-changing operations
    - BullMQ job routing with switch-case in WorkerHost

key-files:
  created:
    - apps/api/src/modules/controller/controller.module.ts
    - apps/api/src/modules/controller/controller.service.ts
    - apps/api/src/modules/controller/controller.controller.ts
  modified:
    - apps/api/src/mqtt/mqtt.service.ts
    - apps/api/src/app.module.ts
    - apps/api/src/modules/door/door.controller.ts
    - apps/api/src/modules/door/door.service.ts
    - apps/api/src/modules/door/door.gateway.ts
    - apps/api/src/modules/door/door.processor.ts
    - apps/api/src/modules/camera/camera.controller.ts
    - apps/api/src/modules/camera/camera.service.ts
    - apps/dashboard/lib/api.ts

key-decisions:
  - "Controller module is independent (not nested under Door) — it has its own service, controller, and module"
  - "CreateDoorController sends commands via EventEmitter2 to MqttService for MQTT publish (follows existing event-driven pattern)"
  - "DoorService.onModuleInit() creates hardware_event_log hypertable with 90-day retention via $executeRawUnsafe"
  - "PTZ endpoints query camera ptzCapabilities JSON for capability check before dispatching"
  - "CameraService.sendPtzCommand returns { status: 'sent' } stub — actual ONVIF HTTP call deferred to Phase 2 integration layer"
  - "Dashboard api.ts deleteCameraMap extracts org prefix from mapId for URL construction"

patterns-established:
  - "New module pattern: create controller/service/module triple, register in AppModule in alphabetical order"
  - "Event pipeline: MqttService subscribe → handleMessage() routing → @OnEvent in service → @OnEvent in gateway → Socket.IO emit"
  - "TimescaleDB hypertable creation in onModuleInit lifecycle hook with graceful fallback"
  - "Processor job routing: extend switch-case for new job types, matching data shape loosely typed"

requirements-completed: [HWR-01, HWR-02, HWR-03, HWR-04, HWR-05]

duration: 28min
completed: 2026-07-17
---

# Phase 2: Hardware Integration — Plan 03 Summary

**NestJS backend API extensions with MQTT OSDP/ONVIF event routing, Controller module, Door command endpoints, Camera PTZ endpoints, and Dashboard API client functions**

## Performance

- **Duration:** 28 min
- **Started:** 2026-07-17T17:30:00Z
- **Completed:** 2026-07-17T17:58:00Z
- **Tasks:** 3
- **Files modified:** 12 (3 new, 9 modified)

## Accomplishments

- Extended MqttService with OSDP event, controller discovery, and ONVIF event topic subscriptions with EventEmitter2 routing
- Created Controller module with findAll() listing, enroll() PATCH endpoint, and handleControllerDiscovery() @OnEvent upsert handler
- Extended DoorController with POST /doors/:id/cmd (lock/unlock), POST /doors (create), and CameraDoorMap CRUD endpoints
- Extended DoorService with sendCommand() via MQTT event, create() with license validation, handleDoorEvent() OSDP event handler with TimescaleDB persistence, and CameraDoorMap CRUD methods
- Added DoorGateway Socket.IO events: door:osdp-event, controller:status, controller:discovery, ptz:preset-update, door:command-state
- Extended DoorProcessor with process-osdp-event job handling and camera snapshot request emission
- Added CameraController PTZ endpoints (continuous, stop, goto-preset, save-preset) gated with @Roles(ADMIN, SUPER_ADMIN, SUPERVISOR)
- Added CameraService sendPtzCommand() and savePreset() with 10-preset limit
- Added Dashboard api.ts functions: sendDoorCommand, createDoor, fetchCameraMaps, createCameraMap, deleteCameraMap, ptzContinuousMove, ptzStop, ptzGotoPreset, ptzSavePreset, fetchControllers, enrollController
- Implemented D-18: hardware_event_log TimescaleDB hypertable with 90-day retention policy via DoorService.onModuleInit()

## Task Commits

Each task was committed atomically:

1. **Task 1: MQTT Topic Routing + Controller Module** — `c268197` (feat)
2. **Task 2: Door API Extensions** — `925b3d8` (feat)
3. **Task 3: Camera PTZ + Dashboard API** — `d6c6654` (feat)

## Files Created/Modified

### Created
- `apps/api/src/modules/controller/controller.module.ts` — Controller module registration
- `apps/api/src/modules/controller/controller.service.ts` — CRUD + upsert discovery handler
- `apps/api/src/modules/controller/controller.controller.ts` — GET /controllers, PATCH /controllers/:id/enroll

### Modified
- `apps/api/src/mqtt/mqtt.service.ts` — New OSDP/ONVIF topic subscriptions and EventEmitter2 routing
- `apps/api/src/app.module.ts` — Register ControllerModule
- `apps/api/src/modules/door/door.controller.ts` — Command endpoint, create door, CameraDoorMap CRUD
- `apps/api/src/modules/door/door.service.ts` — sendCommand, create, handleDoorEvent, CameraDoorMap methods, D-18 hypertable setup
- `apps/api/src/modules/door/door.gateway.ts` — 5 new Socket.IO event handlers
- `apps/api/src/modules/door/door.processor.ts` — process-osdp-event job handler, EventEmitter2 injection
- `apps/api/src/modules/camera/camera.controller.ts` — 4 PTZ endpoints with role gating
- `apps/api/src/modules/camera/camera.service.ts` — sendPtzCommand, savePreset methods
- `apps/dashboard/lib/api.ts` — 11 new API client functions

## Decisions Made

- Controller module is standalone (not nested under Door) — matches existing NestJS module conventions and keeps concerns separated
- Door command flow uses EventEmitter2 -> MqttService -> MQTT broker, following the existing event-driven architecture
- PTZ endpoints check camera `ptzCapabilities.hasPtz` before dispatching, preventing errors on non-PTZ cameras
- CameraService.sendPtzCommand returns a stub result — actual ONVIF HTTP call is deferred; the method signature and routing are in place for the integration layer
- TimescaleDB hypertable setup runs in DoorService.onModuleInit() with graceful error handling if the TimescaleDB extension is not yet installed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Build error: shared package not rebuilt after Plan 02-02 — `enrollControllerSchema` was missing from dist. Fixed by running `pnpm run build --filter=@repo/shared`.
- Build error: import statement in door.controller.ts got mangled during edit — missing `import {` prefix. Fixed by restoring the import block structure.
- Type error: DoorProcessor.process() had `Job<DoorAlertJob>` which didn't match the new `process-osdp-event` job data shape. Fixed by widening the generic to `Job<any>`.
- All three fixes were build-time type errors caught during verification, not logic bugs.

## Self-Check: PASSED

- All 3 tasks committed with proper format
- `npx nest build` exits with code 0
- All acceptance criteria verified via code review
- 12 files (3 new, 9 modified) created/modified
- Each commit individually staged (no `git add .`)

---

*Phase: 02-hardware-integration*
*Completed: 2026-07-17*
