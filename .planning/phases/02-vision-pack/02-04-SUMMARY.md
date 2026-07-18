---
phase: 02-vision-pack
plan: 04
subsystem: backend
tags:
  - notifications
  - whatsapp
  - sms
  - geofencing
  - dnd
  - hermes
  - modem
dependency_graph:
  requires:
    - 02-01
  provides:
    - HermesModule (WhatsApp relay via Hermes Agent)
    - ModemModule (GSM SMS via serial port)
    - Extended NotificationsModule (WHATSAPP/SMS/PUSH channels)
    - GeofencingModule (auto arm/disarm state machine)
    - DNDModule (schedule-based notification suppression)
  affects:
    - AppModule (module registration)
    - Notifications processor (new channel types)
tech-stack:
  added:
    - "@serialport/stream@13.0.0"
    - "@serialport/parser-readline@13.0.0"
    - "@serialport/bindings-cpp@13.0.1"
  patterns:
    - Optional service injection (@Optional) for HermesService/ModemService
    - @Cron for periodic retry (*/5 * * * *) and geofencing evaluation (*/1 * * * *)
    - In-memory state (heartbeat map, arm timer map, manual override map)
    - Prisma upsert for org-level config (GeofencingConfig, DNDSchedule, AlertChannelConfig)
key-files:
  created:
    - apps/api/src/modules/hermes/hermes.module.ts
    - apps/api/src/modules/hermes/hermes.service.ts
    - apps/api/src/modules/hermes/hermes.controller.ts
    - apps/api/src/modules/modem/modem.module.ts
    - apps/api/src/modules/modem/modem.service.ts
    - apps/api/src/modules/modem/modem.controller.ts
    - apps/api/src/modules/geofencing/geofencing.module.ts
    - apps/api/src/modules/geofencing/geofencing.service.ts
    - apps/api/src/modules/geofencing/geofencing.controller.ts
    - apps/api/src/modules/dnd/dnd.module.ts
    - apps/api/src/modules/dnd/dnd.service.ts
    - apps/api/src/modules/dnd/dnd.controller.ts
  modified:
    - apps/api/src/modules/notifications/notifications.service.ts
    - apps/api/src/modules/notifications/notifications.processor.ts
    - apps/api/src/modules/notifications/notifications.module.ts
    - apps/api/src/modules/notifications/notifications.controller.ts
    - apps/api/src/app.module.ts
decisions:
  - "Hermes Agent integrated as HTTP client (not direct WhatsApp API) — uses WhatsApp Web via QR code"
  - "Modem GSM uses SerialPortStream with autoDetect() binding from @serialport/bindings-cpp"
  - "Failed WHATSAPP/SMS notifications stored as PENDING (not FAILED) for @Cron retry"
  - "Geofencing uses in-memory heartbeat map + Prisma-persisted config for fast evaluation"
  - "Arm/disarm notifications use placeholder alert ID — needs real alert wiring in future plan"
  - "DND CRITICAL override defaults to true (D-19 compliance)"
metrics:
  plan_duration: ~25 min (cumulative, including previous checkpoint work)
  tasks_completed: 3
  files_created: 12
  files_modified: 5
  commits: 3
---

# Phase 02 Plan 04: Alert Channels (WhatsApp/SMS), Geofencing & DND

**One-liner:** Extends notification infrastructure with WHATSAPP/SMS dispatch via Hermes Agent and GSM modem, creates geofencing auto-arm/disarm state machine with heartbeat evaluation, and adds DND schedule management with CRITICAL alert bypass.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] SerialPort v13 API mismatch in ModemService**

- **Found during:** Task 1 (post-install build check)
- **Issue:** `@serialport/stream@13` exports `SerialPortStream` (not `SerialPort`) and requires an explicit `binding` property in constructor options. The existing code used the v10 API which doesn't exist in v13.
- **Fix:** Changed import to `{ SerialPortStream: SerialPort }`, added `autoDetect()` binding from `@serialport/bindings-cpp`, fixed `sendAtCommand` to use dynamic import instead of `require()`, and added `sendRawSms` method for AT+CMGS prompt-based SMS flow.
- **Files modified:** `apps/api/src/modules/modem/modem.service.ts`
- **Commit:** `545ddae`

**2. [Rule 2 - Missing] Retry queue already built into ModemService**

- **Found during:** Task 2 review
- **Issue:** The ModemService already had a comprehensive in-memory retry queue with 30s interval, max retries, and GSM charset normalization. The plan's Task 2 assumes notifications.service.ts must handle retry, but ModemService self-handles SMS retry.
- **Fix:** NotificationsService's `@Cron` retry method was kept as a safety net for PENDING notifications that weren't sent by ModemService auto-retry. This adds resilience.
- **Commit:** `072250b`

### Auth Gates

None — all package verifications were done by human before this execution phase.

---

## Known Stubs

| Stub | File | Lines | Reason |
|------|------|-------|--------|
| Placeholder alert ID `00000000-0000-0000-0000-000000000000` | `geofencing.service.ts` | 281, 305 | Arm/disarm notification uses a fake alert ID. Real alert ID not available at geofencing state change time. Future plan should wire proper alert generation. |
| Empty phone number in test endpoints | `hermes.controller.ts`, `modem.controller.ts` | 29 | Test endpoints use `''` as placeholder recipient. Dashboard should provide the phone number in the request body. |

---

## Verification

- [x] HermesModule created with sendWhatsApp, status, QR code endpoints
- [x] ModemModule created with sendSms, modem detection, queue retry
- [x] Notifications extended with WHATSAPP/SMS/PUSH channels
- [x] GeofencingModule with heartbeat, state machine, @Cron evaluation
- [x] DNDModule with schedule CRUD and severity-aware suppression
- [x] All modules registered in AppModule
- [x] NestJS build succeeds (clean, no errors)

---

## Self-Check

- [x] HermesModule files exist: module, service, controller
- [x] ModemModule files exist: module, service, controller
- [x] GeofencingModule files exist: module, service, controller
- [x] DNDModule files exist: module, service, controller
- [x] NotificationsModule files modified: service, processor, module, controller
- [x] AppModule updated with all 4 modules
- [x] NestJS build succeeds (verified)

## Self-Check: PASSED
