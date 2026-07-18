---
phase: 02-vision-pack
plan: 05
subsystem: api
tags: [recording, hls, ffmpeg, h265, share, jwt, event-timeline, multi-user, vision]
requires:
  - phase: 02-01
    provides: VISION feature gates, license limits
  - phase: 02-04
    provides: GeofencingModule, DNDModule, HermesModule, ModemModule
provides:
  - RecordingModule with HLS recording pipeline, retention cron, clip export
  - ShareModule with JWT-based stream share tokens
  - EventModule with search/filter for event timeline
  - Multi-user enforcement (max 3 secondary accounts) with invite flow
affects: [02-06, 02-07, 02-08]
tech-stack:
  added: []
  patterns:
    - EventEmitter2 for cross-module communication (camera.created, camera.rtsp-changed)
    - Cron-based retention cleanup (@nestjs/schedule)
    - FFmpeg subprocess management with crash auto-restart + exponential backoff
    - ZodValidationPipe for request validation (updateRecordingConfigSchema, createStreamShareSchema)
key-files:
  created:
    - apps/api/src/modules/recording/recording.module.ts
    - apps/api/src/modules/recording/recording.service.ts
    - apps/api/src/modules/recording/recording.controller.ts
    - apps/api/src/modules/recording/recording-cleanup.service.ts
    - apps/api/src/modules/share/share.module.ts
    - apps/api/src/modules/share/share.service.ts
    - apps/api/src/modules/share/share.controller.ts
    - apps/api/src/modules/event/event.module.ts
    - apps/api/src/modules/event/event.service.ts
    - apps/api/src/modules/event/event.controller.ts
  modified:
    - apps/api/src/modules/camera/camera.service.ts
    - apps/api/src/modules/user/user.service.ts
    - apps/api/src/modules/user/user.controller.ts
    - apps/api/src/modules/user/user.module.ts
    - apps/api/src/app.module.ts
key-decisions:
  - "Used EventEmitter2 for camera→recording integration instead of direct DI (avoids circular module deps)"
  - "Stream share tokens use a dedicated JWT_SHARE_SECRET separate from auth secrets"
  - "Clip export extracts raw HLS segments (copy codec) for minimal CPU overhead"
  - "Secondary user limit enforced at OrganizationMember level (counts ADMIN + VIEWER roles)"
requirements-completed:
  - VIS-12
  - VIS-13
  - VIS-14
  - VIS-15
  - VIS-16
  - VIS-17
  - VIS-19
  - VIS-21
duration: 28min
completed: 2026-07-18
---

# Phase 2: VISION Pack — Plan 5: Recording Backend, Share, Event Timeline, Multi-User

**Recording pipeline (HLS + retention + clip export), stream share tokens, event timeline search API, and VISION multi-user limit enforcement**

## Performance

- **Duration:** 28 min
- **Started:** 2026-07-18T17:15:00Z
- **Completed:** 2026-07-18T17:43:00Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- **RecordingModule** (VIS-12, VIS-13, VIS-17): FFmpeg HLS recording per camera with configurable codec (H.264/H.265), crash auto-restart with exponential backoff, daily retention cleanup cron, storage usage tracking, and 30s clip export around any event
- **ShareModule** (VIS-19): JWT-signed temporary stream share links with configurable duration, DB-level status tracking (ACTIVE/REVOKED/EXPIRED), 15-minute expiry sweep, public no-auth `/stream/share/:token` endpoint
- **EventModule** (VIS-14, VIS-15, VIS-16): Search/filter API by date range, camera, event type (motion/face/alert/system), and severity. Daily event count stats for timeline charts. Full event detail with snapshot URL and notification log
- **Multi-user management** (VIS-21): VISION secondary user limit enforcement (max 3), invite-by-email (via existing InviteService), invite-by-SMS (via ModemService with temp password), and manual user creation. BASTION upgrade message on limit reached. Role restricted to ADMIN/VIEWER for VISION

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RecordingModule (HLS recording, retention cron, clip export)** - `23d1be6` (feat)
2. **Task 2: Create ShareModule and EventModule** - `cd44da8` (feat)
3. **Task 3: Extend multi-user management with VISION limits and invite flow** - `64a84b6` (feat)

**Plan metadata:** (will be committed after SUMMARY.md)

## Files Created/Modified

### Created
- `apps/api/src/modules/recording/recording.module.ts` - Module declaration
- `apps/api/src/modules/recording/recording.service.ts` - FFmpeg subprocess management, start/stop, config, clip export
- `apps/api/src/modules/recording/recording.controller.ts` - REST endpoints for config, status, storage, clip export
- `apps/api/src/modules/recording/recording-cleanup.service.ts` - Daily retention cron + storage usage
- `apps/api/src/modules/share/share.module.ts` - Module declaration
- `apps/api/src/modules/share/share.service.ts` - Token generate/verify/revoke, access tracking, expiry cron
- `apps/api/src/modules/share/share.controller.ts` - Share CRUD + public stream access endpoint
- `apps/api/src/modules/event/event.module.ts` - Module declaration
- `apps/api/src/modules/event/event.service.ts` - Event search/filter, date-bucketed counting, event detail
- `apps/api/src/modules/event/event.controller.ts` - Event search, stats, detail endpoints

### Modified
- `apps/api/src/modules/camera/camera.service.ts` - Added EventEmitter2, emits `camera.created` and `camera.rtsp-changed` events
- `apps/api/src/modules/user/user.service.ts` - Added `checkSecondaryUserLimit`, `inviteByEmail`, `inviteBySms`, `createManually`
- `apps/api/src/modules/user/user.controller.ts` - Added `POST /users/invite-email`, `POST /users/invite-sms`, `POST /users/create-manual`
- `apps/api/src/modules/user/user.module.ts` - Added InviteModule and ModemModule imports
- `apps/api/src/app.module.ts` - Added RecordingModule, ShareModule, EventModule to imports

## Decisions Made

- Used **EventEmitter2** for camera→recording communication — avoids circular module dependencies between CameraModule and RecordingModule
- **Stream share tokens** use a dedicated `JWT_SHARE_SECRET` config variable, separate from auth JWT secrets, for isolation of concerns
- **Clip export** uses `-c copy` (stream copy) rather than re-encoding — minimal CPU impact; output is MP4 container with original codec
- **Secondary user limit** counts active OrganizationMembers with ADMIN or VIEWER role; SUPER_ADMIN users (system-wide) are excluded from VISION limits
- **SMS invite** creates a placeholder email for the user (format: `sms_{phone}_{timestamp}@temp.vault-os.local`); the user changes their password on first login

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all three tasks built and committed successfully without issues.

## Threat Compliance

- **T-02-11 (Spoofing - Stream share token)**: Mitigated — JWT-signed tokens with dedicated secret; DB status check for REVOKED before access; expiry enforced both at JWT and DB level with 15-minute cron sweep
- **T-02-12 (Tampering - FFmpeg subprocess args)**: Mitigated — RTSP URL validated at creation time (`rtsp://` prefix check); cameraId uses UUID format; FFmpeg called with `spawn` and args array (no shell injection)
- **T-02-13 (Info Disclosure - Recording files on disk)**: Accepted — stored on local client disk at configurable `/mnt/recordings/` path, access controlled by OS permissions
- **T-02-14 (Elevation of Privilege - Multi-user role assignment)**: Mitigated — secondary users limited to ADMIN or VIEWER roles only; endpoint requires existing ADMIN/SUPER_ADMIN to create invites

## Next Phase Readiness

- Complete recording pipeline ready for dashboard recording settings UI (Plan 02-07)
- Share tokens ready for stream share UI components (Plan 02-08)
- Event search API ready for timeline UI (Plan 02-07/02-08)
- Multi-user enforcement ready for user management UI (Plan 02-07)
- Ready for Plan 02-06 (Dashboard & mobile app features)

## Self-Check: PASSED

- [x] All 10 created files exist on disk
- [x] All 5 modified files exist on disk
- [x] 3 task commits present (`23d1be6`, `cd44da8`, `64a84b6`)
- [x] 1 summary commit present (`bb620d7`)
- [x] NestJS build passes (exit code 0)
- [x] All 6 verification criteria met
- [x] All 7 success criteria met

---

*Phase: 02-vision-pack*
*Completed: 2026-07-18*
