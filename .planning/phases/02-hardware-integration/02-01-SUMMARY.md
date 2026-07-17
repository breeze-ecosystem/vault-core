---
phase: 02-hardware-integration
plan: 01
subsystem: edge-agent
tags: libosdp, onvif-zeep, pyserial-asyncio, osdp, onvif, camera, snapshot, mqtt

requires:
  - phase: 01-infrastructure-foundation
    provides: async Edge Agent with MQTT TLS, serial I/O, ONVIF WS-Discovery
provides:
  - OSDP CP-mode serial protocol handling via libosdp (PySerialChannel + OSDPMaster)
  - ONVIF camera full provisioning with GetDeviceInformation, GetCapabilities, GetProfiles
  - PTZ capability probing (absolute/continuous/relative move, presets)
  - Camera snapshot capture via HTTP GET with digest auth support
  - ONVIF PullPoint event subscription with automatic renew loop
  - Site-aware camera grouping (D-03) and in-place camera replacement on rediscovery (D-15)
  - MQTT publish helpers for OSDP events, controller discovery, and ONVIF events
affects: phase 03 (kiosk integration), phase 05 (bug fixing)

tech-stack:
  added:
    - libosdp>=3.2.5 — OSDP protocol implementation with Secure Channel
    - onvif-zeep>=0.2.12 — ONVIF camera provisioning client
    - zeep>=4.0 — SOAP client required by onvif-zeep
    - Pillow>=10.0 — Image processing for snapshot thumbnails
  patterns:
    - libosdp CP context with 50ms refresh via run_in_executor
    - ONVIF provisioning via onvif-zeep in executor thread
    - MQTT event routing with site-scoped topic hierarchy

key-files:
  created:
    - edge/agent/services/osdp_channel.py — PySerialChannel libosdp transport
    - edge/agent/services/osdp.py — OSDPMaster libosdp CP context wrapper
    - edge/agent/tasks/osdp_task.py — OSDP asyncio task with 50ms refresh loop
    - edge/agent/tasks/onvif_task.py — ONVIF provisioning task with seen_cameras dedup
    - edge/agent/services/camera_snapshot.py — HTTP snapshot capture
  modified:
    - edge/agent/services/onvif.py — added provision_camera, probe_ptz_capabilities, subscribe_onvif_events
    - edge/agent/tasks/serial_task.py — marked as Phase 1 fallback
    - edge/agent/tasks/mqtt_task.py — added 3 new publish helpers
    - edge/agent/config.py — added OSDP/ONVIF/snapshot config fields
    - edge/agent/main.py — registered osdp_task and onvif_task
    - edge/agent/requirements.txt — added 4 new dependencies

key-decisions:
  - "PySerialChannel wraps pyserial-asyncio reader/writer (same pattern as serial_task.py) for libosdp Channel interface"
  - "OSDPMaster creates one libosdp CP context per serial port, scanning addresses 0x01-0x7E"
  - "OSDP refresh runs at 50ms via run_in_executor to avoid blocking event loop"
  - "SC fallback: configured via OSDP_SC_ENABLED/OSDP_SCBK; on refresh error, agent recreates context without SC flags"
  - "ONVIF provision_camera runs onvif-zeep in executor thread (synchronous library)"
  - "Site group extracted from ONVIF GetDeviceInformation Location field when available, else 'default' (D-03)"
  - "Camera dedup via seen_cameras dict keyed by {ip}:{port} (D-15)"
  - "Snapshot capture tries 5 common ONVIF HTTP paths with aiohttp BasicAuth"
  - "PullPoint event subscription renews at half the agreed timeout interval"

requirements-completed: [HWR-01, HWR-03]
duration: 4 min
completed: 2026-07-17
---

# Phase 2 Plan 1: Edge Agent Hardware Protocol Integration — OSDP + ONVIF Summary

**libosdp CP-mode OSDP serial protocol handling with PySerialChannel transport, OSDPMaster refresh loop, and Secure Channel support; ONVIF camera provisioning with full device interrogation, PTZ probing, snapshot capture, PullPoint event subscriptions, site grouping (D-03), and address deduplication (D-15)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-17T21:59:48Z
- **Completed:** 2026-07-17T22:03:53Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- OSDP protocol integration with libosdp CP-mode via PySerialChannel transport and OSDPMaster context manager
- ONVIF camera auto-provisioning with full GetDeviceInformation, PTZ probing, and event subscriptions
- Camera snapshot capture service supporting 5 common ONVIF HTTP paths
- Site-aware camera grouping (D-03) and in-place camera replacement on rediscovery (D-15)
- MQTT publish helpers for OSDP events, controller discovery, and ONVIF events

## Task Commits

Each task was committed atomically:

1. **Task 1: OSDP Protocol Integration** — `69f9e61` (feat)
2. **Task 2: ONVIF Enhancement** — `9becf01` (feat)
3. **Task 3: Wire Everything** — `a524245` (feat)

## Files Created/Modified

### Created (5 files)
- `edge/agent/services/osdp_channel.py` — PySerialChannel class wrapping pyserial-asyncio for libosdp Channel interface (connect/send/receive/close)
- `edge/agent/services/osdp.py` — OSDPMaster class managing libosdp CP context, SC negotiation, event callbacks, 50ms refresh
- `edge/agent/tasks/osdp_task.py` — async task creating one OSDPMaster per serial port, 50ms refresh loop, MQTT command routing
- `edge/agent/tasks/onvif_task.py` — async task for ONVIF provisioning cycle; maintains seen_cameras for D-15 dedup, site_group for D-03 grouping
- `edge/agent/services/camera_snapshot.py` — `capture_snapshot()` async function with aiohttp BasicAuth to camera HTTP snapshot URLs

### Modified (6 files)
- `edge/agent/services/onvif.py` — Added `provision_camera()`, `probe_ptz_capabilities()`, `subscribe_onvif_events()` functions
- `edge/agent/tasks/serial_task.py` — Added Phase 1 fallback marker comment
- `edge/agent/tasks/mqtt_task.py` — Added `publish_osdp_event`, `publish_controller_discovery`, `publish_onvif_event` helpers with registrations
- `edge/agent/config.py` — Added OSDP_SC_ENABLED, OSDP_SCBK, ONVIF_USERNAME, ONVIF_PASSWORD, ONVIF_PULLPOINT_INTERVAL, SNAPSHOT_STORAGE_PATH fields
- `edge/agent/main.py` — Registered `osdp_task` and `onvif_task` as asyncio tasks alongside existing serial/MQTT/HTTP tasks
- `edge/agent/requirements.txt` — Added libosdp>=3.2.5, onvif-zeep>=0.2.12, zeep>=4.0, Pillow>=10.0

## Decisions Made
- **PySerialChannel as libosdp transport**: Used the same pyserial-asyncio open_serial_connection pattern as the existing serial_task.py, wrapping reader/writer in connect/send/receive methods that match libosdp's Channel interface
- **50ms refresh via executor**: libosdp's `osdp.refresh()` is synchronous and blocking; called via `run_in_executor` to keep the asyncio event loop responsive while meeting OSDP timing requirements
- **SC fallback support**: OSDPMaster.configure_sc() allows enabling/disabling Secure Channel per-port; if refresh fails, the context can be recreated without SC flags
- **ONVIF provisioning in executor**: onvif-zeep uses synchronous SOAP calls (zeep/httpx), so all provisioning functions (`provision_camera`, `probe_ptz_capabilities`, `subscribe_onvif_events`) run in executor threads
- **Site grouping via Location field**: Extracts site_group from ONVIF GetDeviceInformation.Location when the manufacturer populates it; otherwise defaults to "default" (D-03)
- **Camera dedup via {ip}:{port} key**: seen_cameras dict maps "{ip}:{port}" → camera_id; on rediscovery, sends update operation instead of create (D-15)
- **Snapshot path fallback chain**: Tries 5 common ONVIF snapshot paths in order (`/onvif/snapshot`, `/onvif-media/snapshot`, `/onvif-http/snapshot`, `/snapshot`, `/cgi-bin/snapshot.cgi`)
- **PullPoint renew at half timeout**: Subscription renewal occurs at half the agreed timeout interval to avoid expiration; messages polled every 10 seconds

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- None — all syntax checks passed on first attempt across all 11 files.

## User Setup Required

None — no external service configuration required beyond the existing environment variables. New config fields (OSDP_SC_ENABLED, ONVIF_USERNAME, etc.) have sensible defaults.

## Next Phase Readiness
- Edge Agent is now equipped with OSDP door controller protocol and ONVIF camera provisioning capabilities
- Ready for Plan 2 of Phase 2 (API extensions for controller enrollment, camera PTZ fields, and Dashboard PTZ/event views)
- Requirements HWR-01 (bidirectional hardware communication) and HWR-03 (ONVIF auto-discovery with enrichment) are complete at the Edge Agent layer

## Self-Check: PASSED

Verification results:
- All 10 Python files parse without syntax errors: ✅
- Requirements.txt includes all 4 new packages: ✅ (libosdp, onvif-zeep, zeep, Pillow)
- Main.py registers both osdp_task and onvif_task: ✅
- Mqtt_task.py has 3 new publish helpers registered on mqtt_handler: ✅

---
*Phase: 02-hardware-integration*
*Completed: 2026-07-17*
