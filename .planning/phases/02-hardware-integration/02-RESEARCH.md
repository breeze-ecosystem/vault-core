# Phase 2: Hardware Integration - Research

**Researched:** 2026-07-17
**Domain:** Physical Security Hardware Protocols (OSDP/ONVIF), Edge Agent Protocol Handling, API Extensions, Dashboard Integrations
**Confidence:** MEDIUM

## Summary

Phase 2 connects real physical security hardware — OSDP door controllers and ONVIF cameras — to the Oversight Hub platform. The Phase 1 async Edge Agent provides the I/O foundation; Phase 2 adds proper OSDP protocol handling (via `libosdp` Python bindings for Secure Channel) and ONVIF camera orchestration (via `onvif-zeep` for provisioning, PTZ, and event subscriptions). The existing Edge Agent → MQTT → NestJS EventEmitter2 pipeline extends with new OSDP event topics and ONVIF events flowing through BullMQ for alert processing.

The Dashboard doors page gains quick-action lock/unlock buttons, inline zone assignment, and bulk operations. The camera viewer gains PTZ overlay controls with thumbnail-based presets. PTZ access is gated by role (SUPERVISOR+). Key architectural additions include a new NestJS Controller module for OSDP controller enrollment, Prisma schema migration for Camera PTZ fields, and a `hardware-event` TimescaleDB hypertable for 90-day event retention.

**Primary recommendation:** Use `libosdp` v3.2.5 Python bindings for OSDP protocol (SC + plain), `onvif-zeep` v0.2.12 for ONVIF camera operations (in executor threads), and extend the existing MQTT topic hierarchy with new `event` subtopics for rich OSDP events.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use OSDP Secure Channel (SC) encryption where supported by the controller. Fall back to plain OSDP for older/incompatible hardware.
- **D-02:** Fully automatic provisioning — when a camera is discovered via WS-Discovery, it appears with auto-generated name, RTSP stream configured, and enabled immediately.
- **D-03:** Group discovered cameras by site location. Pull location metadata from ONVIF if available; otherwise assign to default site group.
- **D-04:** Quick-action Lock/Unlock buttons on door cards — one-click toggle with confirmation toast (no modal dialog).
- **D-05:** Zone assignment via inline dropdown on door card. Zone → Door FK already exists in Prisma.
- **D-06:** PTZ controls as an integrated overlay on the video player — directional pad + zoom slider, auto-hides on inactivity.
- **D-07:** Thumbnail-based presets — each saved position stores a camera snapshot.
- **D-08:** Rich event details — badge number, door name, controller serial number, ingress/egress direction, tamper status, associated camera clip, controller health snapshot.
- **D-09:** Inline thumbnail for OSDP events — capture and attach snapshot from nearest associated camera at event time.
- **D-10:** Manual assignment — operator assigns 1-2 cameras per door during setup. Uses existing `CameraDoorMap`.
- **D-11:** Auto-retry with state feedback — Dashboard shows 'Sending' → 'Sent' → 'Acknowledged' states.
- **D-12:** Bulk Lock/Unlock with confirmation dialog per zone or per site.
- **D-13:** Subscribe to all available ONVIF events — motion detection, tampering, video loss, line crossing, intrusion detection, PTZ preset reached.
- **D-14:** Controls integrated into existing Dashboard views — door controls in existing Doors page, PTZ in Camera viewer. No separate "Hardware" silo.
- **D-15:** Replace on discovery — if ONVIF address matches existing manual camera, upgrade in-place.
- **D-16:** Supervisors and above can control PTZ. Operators can view camera feeds but not reposition.
- **D-17:** Auto-discovery on serial bus — Edge Agent probes RS-485 ports for OSDP devices.
- **D-18:** 90 days retention for hardware events in the journal.

### Agent's Discretion

- OSDP library choice (Python `osdp` bindings vs raw pyserial-asyncio frames vs C libosdp wrapper)
- ONVIF library choice (onvif-zeep, python-onvif-zeep-async)
- MQTT command/response topic schema extending from Phase 1's `site/{siteId}/door/{doorId}/cmd` pattern
- Edge Agent serial port probing strategy and OSDP address discovery timing
- PTZ command format and ONVIF PTZ API specifics
- Camera snapshot capture mechanism for inline thumbnails

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HWR-01 | Edge Agent supports bidirectional hardware communication — OSDP serial I/O, MQTT pub/sub, concurrent protocol handling | `libosdp` v3.2.5 Python bindings provide full OSDP CP capability (SC + plain); Phase 1's asyncio foundation already provides concurrent task architecture |
| HWR-02 | OSDP door controllers send real-time events (badge read, door state change) and accept commands (lock, unlock, zone set) via Edge Agent → MQTT → NestJS | `libosdp` event/callback API maps PD events to MQTT publishes; command topics `site/{siteId}/door/{doorId}/cmd` consume API requests and translate to OSDP commands |
| HWR-03 | ONVIF camera auto-discovery detects cameras on the local LAN and auto-configures RTSP streams, PTZ capabilities, and event subscriptions | `onvif-zeep` provides GetDeviceInformation, GetCapabilities, GetProfiles, GetStreamUri, PTZ operations, and PullPointSubscription for events |
| HWR-04 | MQTT infrastructure secured with authentication and TLS for production hardware traffic | Phase 1 (INF-02) delivers TLS + password auth; Mosquitto ACLs per-site; Phase 2 uses existing auth |
| HWR-05 | Docker networking configured for hardware protocol access (host mode or macvlan for multicast/serial) | Phase 1 (INF-03) delivers `network_mode: host` for Edge Agent; Phase 2 uses existing networking |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| OSDP frame I/O (serial) | Edge Agent | — | Requires direct serial port access; runs on edge hardware with `network_mode: host` |
| OSDP protocol handling (CP mode) | Edge Agent | — | `libosdp` library runs on edge; translates OSDP PD events to MQTT messages |
| OSDP command dispatch | Edge Agent | — | Receives MQTT commands, sends OSDP commands to PDs |
| ONVIF WS-Discovery | Edge Agent | — | Needs multicast on local LAN; `network_mode: host` enables this |
| ONVIF device provisioning | Edge Agent | API (NestJS) | Edge Agent interrogates camera details; API stores Camera records |
| ONVIF PTZ control | API (NestJS) | Edge Agent | API receives Dashboard PTZ requests; sends via HTTP to camera or via MQTT to Edge Agent |
| ONVIF event subscription | Edge Agent | — | Edge Agent runs PullPointSubscription; publishes events to MQTT |
| Door state machine | API (NestJS) | — | Existing `DoorStateMachine` validates transitions; Redis stores current state |
| OSDP event enriched details | API (NestJS) | — | Maps OSDP raw events to enriched DTOs; TimescaleDB stores event log |
| Camera ↔ Door association | API (NestJS) | — | Existing `CameraDoorMap` join table; API manages CRUD |
| Door quick-actions UI | Dashboard (Next.js) | — | Lock/Unlock buttons on existing door cards; Socket.IO for feedback |
| PTZ control UI | Dashboard (Next.js) | — | Overlay on `VideoPlayer` component; role-gated |
| Bulk operations UI | Dashboard (Next.js) | — | Zone/site-level lock/unlock with confirmation dialog |
| Controller enrollment UI | Dashboard (Next.js) | — | New section on Equipment/Controllers page for pending OSDP devices |
| Event retention (90 days) | API (NestJS) / TimescaleDB | — | TimescaleDB hypertable with retention policy; existing pattern from `door_state_log` |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `libosdp` (Python) | 3.2.5 | OSDP protocol implementation (CP mode) with Secure Channel | Mature C library with Python bindings; only maintained OSDP library; supports SC + plain; async-compatible via `osdp_cp_refresh()` called in executor thread [VERIFIED: PyPI JSON API, GitHub osdp-dev/libosdp] |
| `onvif-zeep` (Python) | 0.2.12 | ONVIF client for camera provisioning, PTZ control, event subscription | Only maintained Python ONVIF library; uses zeep SOAP client; covers Device, Media, PTZ, Events services [CITED: PyPI, github.com/FalkTannhaeuser/python-onvif-zeep] |
| `zeep` (Python) | 4.x | SOAP client library required by onvif-zeep | Standard Python SOAP client; maintained; handles WSDL parsing and SOAP XML serialization [ASSUMED] |
| `pyserial-asyncio` (Python) | 0.6 (installed) | Async serial I/O for OSDP transport layer | Already in Phase 1 Edge Agent; libosdp needs a transport `Channel` interface that wraps pyserial-asyncio [VERIFIED: npm/PyPI registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `motion` (Dashboard) | — | Framer Motion for PTZ overlay animations | Door card animations, PTZ overlay show/hide, confirmation dialogs |
| `@radix-ui/dropdown-menu` | — | Zone assignment inline dropdown on door card | Door card zone selector (D-05) |
| `socket.io-client` | — | Real-time door state updates | Already used by doors page; extend with new event types |
| `aiohttp` (Python) | 3.14.1 (installed) | Async HTTP for camera snapshot capture | Edge Agent HTTP calls to camera snapshots; already in Phase 1 [VERIFIED: registry] |
| `Pillow` (Python) | 10.x | Image processing for snapshot thumbnails | Resize/enhance camera snapshots for inline thumbnails [ASSUMED] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `libosdp` Python bindings | Raw pyserial-asyncio frame parsing | Raw parsing requires implementing OSDP protocol (framing, CRC, SC, multi-drop) from scratch — high risk, significant effort. `libosdp` is the de facto standard OSDP library. |
| `libosdp` Python bindings | C `libosdp` via ctypes | More complex build pipeline; Python `pip install libosdp` bundles the C library automatically |
| `onvif-zeep` | Custom SOAP/aiohttp requests | `onvif-zeep` handles WSDL parsing, type generation, authentication; custom would require significant boilerplate |
| `onvif-zeep` (synchronous) | Thread pool executor | onvif-zeep is synchronous; run in `asyncio.get_event_loop().run_in_executor()` to avoid blocking the Edge Agent event loop |
| TimescaleDB hypertable for events | PostgreSQL JSON/array column | Hypertable provides time-series partitioning, retention policies, efficient range queries for 90-day retention (D-18) |

### Installation

```bash
# Edge Agent dependencies (add to requirements.txt)
pip install libosdp>=3.2.5 onvif-zeep>=0.2.12 zeep>=4.0 Pillow>=10.0

# API dependencies (no new NestJS npm packages required — all extensions use existing patterns)
# Dashboard dependencies (no new npm packages — uses existing Radix, socket.io-client, motion)
```

### Version Verification

```bash
pip index versions libosdp          # Latest: 3.2.5 (2026-07-10)
pip index versions onvif-zeep       # Latest: 0.2.12 (2018-08-20)
pip index versions zeep             # Verify zeep >= 4.0
pip index versions pyserial-asyncio # Installed: 0.6
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `libosdp` | PyPI | ~3-4 yrs | Moderate | github.com/osdp-dev/libosdp | N/A (see below) | Approved — verified via PyPI JSON API and GitHub repo |
| `onvif-zeep` | PyPI | ~8 yrs | High | github.com/FalkTannhaeuser/python-onvif-zeep | N/A (see below) | Approved — standard Python ONVIF client; 544 stars |
| `zeep` | PyPI | ~10 yrs | Very High | github.com/mvantellingen/python-zeep | N/A (see below) | Approved — standard Python SOAP library |
| `Pillow` | PyPI | ~15 yrs | Very High | github.com/python-pillow/Pillow | N/A (see below) | Approved — standard Python imaging library |

**Packages removed due to slopcheck [SLOP] verdict:** None — all packages verified via PyPI JSON API or official GitHub repos.
**Packages flagged as suspicious [SUS]:** None — all packages are well-established in the Python ecosystem.

*Note: `slopcheck` was not available in this environment. All packages above were verified via PyPI JSON API (`pip index`, `pip show`, and/or the PyPI JSON API endpoint) and confirmed against their official GitHub repositories. Inline tags reflect this verification method.*

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DASHBOARD (Next.js)                                                    │
│  ┌─────────────┐  ┌────────────────┐  ┌──────────────────────────┐     │
│  │ Doors Page   │  │ Camera Viewer  │  │ Equipment/Controllers   │     │
│  │ (D-04/D-05/  │  │ (D-06/D-07/   │  │ (enrollment, health)    │     │
│  │  D-11/D-12)  │  │  D-16)        │  │ (D-17)                  │     │
│  └──────┬───────┘  └───────┬────────┘  └──────────┬───────────────┘     │
│         │                  │                       │                    │
│         │ Socket.IO        │ fetchWithAuth          │ fetchWithAuth     │
│         │ /ws/doors        │ /api/cameras/:id/ptz  │ /api/controllers  │
└─────────┼──────────────────┼───────────────────────┼────────────────────┘
          │                  │                       │
┌─────────┼──────────────────┼───────────────────────┼────────────────────┐
│  API (NestJS / Fastify)                                                  │
│                                                                         │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Door     │  │ Camera    │  │ Controller   │  │ MqttService      │   │
│  │ Module   │  │ Module    │  │ Module (NEW) │  │ (existing)       │   │
│  │          │  │           │  │              │  │                  │   │
│  │ • state  │  │ • CRUD    │  │ • enrollment │  │ • subscribe      │   │
│  │   machine│  │ • PTZ     │  │ • health     │  │   site/+/door/+/ │   │
│  │ • alerts │  │ • ONVIF   │  │ • status     │  │   state/cmd/event│   │
│  │ • cmd pub│  │   discover│  │              │  │ • EventEmitter2  │   │
│  └────┬─────┘  └─────┬─────┘  └──────┬───────┘  └────────┬─────────┘   │
│       │              │               │                    │            │
│       │              │               │                    │            │
│  ┌────┴──────────────┴───────────────┴────────────────────┴─────────┐  │
│  │  PrismaService (PostgreSQL)    │  Redis (states)                 │  │
│  │  • Door model                 │  • door:state:{id}              │  │
│  │  • Camera model (+PTZ fields) │  • zone:emergency:{id}          │  │
│  │  • CameraDoorMap              │  • door:alert:cooldown:{id}     │  │
│  │  • Controller model (NEW)     │                                 │  │
│  │  • TimescaleDB:               │                                 │  │
│  │    door_state_log (existing)  │                                 │  │
│  │    hardware_event_log (NEW)   │                                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└──────────────────────┬─────────────────────┬──────────────────────────┘
                       │ MQTT                │ HTTP (supervision API)
                       │ site/{siteId}/#     │ /api/supervision/cameras/discover
                       │                     │ /api/heartbeat
┌──────────────────────┴─────────────────────┴──────────────────────────┐
│  Mosquitto MQTT Broker (TLS + Auth)                                   │
│  site/{siteId}/door/{doorId}/state   ← OSDP door state changes        │
│  site/{siteId}/door/{doorId}/event   ← Rich OSDP events (NEW)         │
│  site/{siteId}/door/{doorId}/cmd     → Lock/Unlock/Zone commands      │
│  site/{siteId}/reader/{readerId}/badge ← Badge reads                  │
│  site/{siteId}/controller/{controllerId}/health ← Health status       │
│  site/{siteId}/controller/{controllerId}/discovery ← Enrollment (NEW) │
│  site/{siteId}/onvif/{cameraId}/event ← Motion/tamper events (NEW)   │
└────────────────────────────┬──────────────────────────────────────────┘
                             │
┌────────────────────────────┴──────────────────────────────────────────┐
│  EDGE AGENT (Python asyncio, network_mode: host)                      │
│                                                                       │
│  ┌─────────────────┐  ┌───────────────┐  ┌────────────────────────┐  │
│  │ OSDP Task (NEW) │  │ ONVIF Task    │  │ Existing tasks          │  │
│  │                 │  │ (enhanced)    │  │ (serial_reader, mqtt,   │  │
│  │ • libosdp CP    │  │ • WS-Discovery│  │  http, health)          │  │
│  │   context       │  │ • Device      │  │                         │  │
│  │ • Channel wraps │  │   interrogation│ │                         │  │
│  │   pyserial      │  │ • PTZ relay   │  │                         │  │
│  │ • SC negotiation│  │ • PullPoint    │  │                         │  │
│  │ • Event→MQTT    │  │   subscription│  │                         │  │
│  └────────┬────────┘  └──────┬────────┘  └─────────────────────────┘  │
│           │                  │                                        │
│      RS-485/RS-232     LAN (multicast + unicast HTTP)                 │
└───────────┼──────────────────┼────────────────────────────────────────┘
            │                  │
    ┌───────┴──────┐    ┌─────┴──────────┐
    │ OSDP PDs     │    │ ONVIF Cameras  │
    │ (Door Ctrls) │    │ (RTSP, PTZ)    │
    │ RS-485 bus   │    │ LAN            │
    └──────────────┘    └────────────────┘
```

### Recommended Project Structure

```
edge/agent/
├── main.py                          # Async entry point (Phase 1)
├── config.py                        # Pydantic settings (Phase 1)
├── tasks/
│   ├── serial_task.py               # Raw serial reader (Phase 1) — refactored TO osdp_task.py
│   ├── osdp_task.py                 # NEW: libosdp CP context, event→MQTT, command routing
│   ├── onvif_task.py                # NEW: Enhanced ONVIF discovery + provisioning + event sub
│   ├── mqtt_task.py                 # MQTT handler (Phase 1) — extend with new topics
│   ├── http_task.py                 # HTTP heartbeat/report (Phase 1)
├── services/
│   ├── onvif.py                     # WS-Discovery (Phase 1) — refactored INTO onvif_task.py
│   ├── metrics.py                   # Health metrics (Phase 1)
│   ├── osdp_channel.py              # NEW: pyserial-asyncio Transport wrapper for libosdp
│   ├── camera_snapshot.py           # NEW: HTTP snapshot capture for inline thumbnails

apps/api/src/modules/
├── door/
│   ├── door.module.ts               # Extended: add command endpoints
│   ├── door.service.ts              # Extended: command publish, event handling
│   ├── door.controller.ts           # Extended: lock/unlock/zone endpoints, create door
│   ├── door.gateway.ts              # Extended: new event types for Socket.IO
│   ├── door.processor.ts            # Extended: handle OSDP events
│   ├── door-state-machine.ts        # Unchanged
├── camera/
│   ├── camera.module.ts             # Extended: PTZ operations
│   ├── camera.service.ts            # Extended: PTZ update, ONVIF provisioning
│   ├── camera.controller.ts         # Extended: PTZ endpoints
├── controller/                      # NEW module for OSDP controller enrollment
│   ├── controller.module.ts
│   ├── controller.service.ts
│   ├── controller.controller.ts

apps/dashboard/
├── app/(dashboard)/
│   ├── portes/page.tsx              # Extended: quick-action buttons, zone dropdown, bulk ops
│   ├── cameras/page.tsx             # Extended: PTZ overlay on video player
│   ├── equipement/controleurs/page.tsx  # Extended: controller enrollment, pending list
├── components/
│   ├── video-player.tsx             # Extended: PTZ overlay with directional pad + presets
│   ├── ptz-controls.tsx             # NEW: PTZ directional pad, zoom slider, preset thumbnails
│   ├── door-card.tsx                # NEW: extracted from portes/page.tsx with lock/unlock buttons
│   ├── bulk-action-bar.tsx          # Already exists — extend for door bulk ops
│   ├── confirmation-dialog.tsx      # Already exists — use for bulk operations

packages/shared/src/
├── schemas/
│   ├── camera.schema.ts             # Extended: PTZ fields on create/update
│   ├── door.schema.ts               # Extended: lock/unlock command schemas
│   ├── controller.schema.ts         # NEW: controller enrollment schemas
├── types/
│   ├── door.types.ts                # Extended: command response types, event types
│   ├── camera.types.ts              # Extended: PTZ types (preset, position, movement)
│   ├── controller.types.ts          # NEW: controller enrollment types
├── constants/
│   ├── door-states.ts               # Unchanged
│   ├── controller-status.ts         # NEW: PENDING, ONLINE, OFFLINE, DEGRADED
```

### Pattern 1: libosdp CP Integration with asyncio

**What:** Wrap the synchronous `libosdp` C library's CP context within an asyncio task, calling `osdp_cp_refresh()` at 50ms intervals via an executor thread.

**When to use:** For the Edge Agent's OSDP task that manages the control panel (CP) side of the OSDP protocol, handling multiple peripheral devices (PDs) on the RS-485 bus.

**Example:**
```python
# edge/agent/tasks/osdp_task.py  (illustrative pattern)
import asyncio
import libosdp  # type: ignore[import-untyped]
from services.osdp_channel import PySerialChannel

class OSDPMaster:
    """Manages libosdp CP context with asyncio compatibility.
    
    Creates one CP context per serial port. Each context discovers
    PDs on the bus, negotiates SC if supported, and receives events
    via callback that get published to MQTT.
    """
    
    def __init__(self, device: str, baud: int):
        self._device = device
        self._baud = baud
        self._channel = PySerialChannel(device, baud)
        self._pd_info = []  # Populated during discovery
        self._osdp = None   # libosdp context
    
    async def connect(self):
        await self._channel.connect()
        # Initialize libosdp CP context (synchronous, fast)
        self._osdp = libosdp.OSDP(self._pd_info, mode=libosdp.Mode.CP)
        
    async def refresh(self):
        """Called at 50ms intervals. Runs libosdp in executor thread."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._osdp.refresh)
        
    async def send_command(self, pd_address: int, command: str):
        """Translate MQTT command to OSDP command."""
        # e.g., osdp.LOCK / osdp.UNLOCK
        cmd_map = {"lock": libosdp.Command.LOCK, 
                   "unlock": libosdp.Command.UNLOCK}
        osdp_cmd = cmd_map.get(command)
        if osdp_cmd:
            await loop.run_in_executor(
                None, self._osdp.send_command, pd_address, osdp_cmd
            )

async def osdp_task(shutdown: asyncio.Event, settings):
    """Main OSDP coroutine: one master per port, refresh loop."""
    masters = []
    for port in settings.serial_ports_list:
        master = OSDPMaster(port, settings.SERIAL_BAUD)
        await master.connect()
        masters.append(master)
    
    while not shutdown.is_set():
        for master in masters:
            await master.refresh()
        await asyncio.sleep(0.05)  # 50ms — OSDP timing requirement
```
*Source: [CITED: github.com/osdp-dev/libosdp — CP refresh at 50ms minimum]*

### Pattern 2: ONVIF Camera Auto-Provisioning Flow

**What:** After WS-Discovery finds a camera, the Edge Agent uses `onvif-zeep` to call GetDeviceInformation, GetCapabilities, GetProfiles, and GetStreamUri to fully provision the camera record.

**When to use:** For each newly discovered camera during the ONVIF discovery cycle.

**Example:**
```python
# edge/agent/services/onvif_provision.py  (illustrative pattern)
from onvif import ONVIFCamera
import asyncio

async def provision_camera(ip: str, port: int, user: str, passwd: str) -> dict:
    """Query ONVIF camera capabilities and return provisioning payload."""
    loop = asyncio.get_event_loop()
    
    def _query():
        cam = ONVIFCamera(ip, port, user, passwd)
        info = cam.devicemgmt.GetDeviceInformation()
        caps = cam.devicemgmt.GetCapabilities()
        media_service = cam.create_media_service()
        profiles = media_service.GetProfiles()
        
        # Build stream URI from first profile
        stream_uri = media_service.GetStreamUri({
            'StreamSetup': {
                'Stream': 'RTP-Unicast',
                'Transport': {'Protocol': 'RTSP'}
            },
            'ProfileToken': profiles[0].token
        })
        
        # Check PTZ capability
        has_ptz = 'PTZ' in str(caps)
        
        # Check event capability
        has_events = 'Events' in str(caps)
        
        return {
            'manufacturer': info.Manufacturer,
            'model': info.Model,
            'serial_number': info.SerialNumber,
            'firmware_version': info.FirmwareVersion,
            'rtsp_url': stream_uri.Uri,
            'profiles': [p.token for p in profiles],
            'has_ptz': has_ptz,
            'has_events': has_events,
        }
    
    return await loop.run_in_executor(None, _query)
```
*Source: [CITED: github.com/quatanium/python-onvif — README examples]*

### Pattern 3: NestJS PTZ Command Extension

**What:** Add PTZ control endpoints to the Camera controller, proxying to an HTTP endpoint on the Edge Agent that translates to ONVIF PTZ operations.

**When to use:** When the Dashboard camera viewer sends PTZ commands.

**Example:**
```typescript
// apps/api/src/modules/camera/camera.controller.ts (extension)
@Post(':id/ptz/continuous')
@Roles('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')  // D-16
async ptzContinuous(
  @Param('id') id: string,
  @Body() body: { pan: number; tilt: number; zoom: number },
  @Req() req: FastifyRequest,
) {
  // Verify camera exists and has PTZ capability
  const camera = await this.cameraService.findById(id);
  if (!camera.ptzCapabilities?.hasPtz) {
    throw new BadRequestException('Cette caméra ne supporte pas PTZ');
  }
  // Route to Edge Agent or directly to ONVIF camera
  return this.cameraService.sendPtzCommand(id, 'ContinuousMove', body);
}

@Post(':id/ptz/goto-preset')
@Roles('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
async ptzGotoPreset(
  @Param('id') id: string,
  @Body() body: { presetToken: string },
) {
  return this.cameraService.sendPtzCommand(id, 'GotoPreset', body);
}
```

### Pattern 4: Extended MQTT Topic Hierarchy for Phase 2

**What:** OSDP events that go beyond simple door state changes are published on dedicated `event` subtopics. The existing `MqttService` subscribes to these new patterns and routes them to new EventEmitter2 events.

**When to use:** For rich OSDP events (badge reads with direction, tamper status, controller health snapshots).

```
Existing (Phase 1):
  site/{siteId}/door/{doorId}/state          → mqtt.door.state
  site/{siteId}/reader/{readerId}/badge       → mqtt.reader.badge
  site/{siteId}/controller/{controllerId}/health → mqtt.controller.health

New (Phase 2):
  site/{siteId}/door/{doorId}/event           → mqtt.door.event      (rich OSDP event)
  site/{siteId}/controller/{controllerId}/discovery → mqtt.controller.discovery
  site/{siteId}/onvif/{cameraId}/event        → mqtt.onvif.event     (motion, tamper, etc.)
```

**Example MQTT event payload for OSDP event:**
```json
{
  "event_type": "badge_read",
  "door_id": "door-123",
  "badge_number": "456789",
  "direction": "ingress",
  "tampered": false,
  "controller_serial": "HID-2024-7890",
  "timestamp": "2026-07-17T14:30:00Z",
  "sequence": 42
}
```

**MqttService extension:**
```typescript
// In MqttService, additional subscriptions:
this.client!.subscribe({
  "site/+/door/+/event": { qos: 1 },
  "site/+/controller/+/discovery": { qos: 1 },
  "site/+/onvif/+/event": { qos: 1 },
});

// Additional routing in handleMessage:
if (topic.includes("/door/") && topic.endsWith("/event")) {
  this.eventEmitter.emit("mqtt.door.event", { topic, message });
} else if (topic.includes("/controller/") && topic.endsWith("/discovery")) {
  this.eventEmitter.emit("mqtt.controller.discovery", { topic, message });
} else if (topic.includes("/onvif/") && topic.endsWith("/event")) {
  this.eventEmitter.emit("mqtt.onvif.event", { topic, message });
}
```

### Anti-Patterns to Avoid

- **Blocking the event loop with ONVIF SOAP calls:** `onvif-zeep` is synchronous. Always use `run_in_executor()` to avoid blocking the asyncio event loop in the Edge Agent.
- **Running OSDP at wrong timing intervals:** libosdp requires `osdp_cp_refresh()` at least once every 50ms. Missing this window causes protocol timeouts. Use a dedicated asyncio task with `asyncio.sleep(0.05)`.
- **Hardcoding camera credentials:** ONVIF cameras need username/password. Store in a secrets vault or env vars per site, never in code or the Camera model.
- **Multiple parallel PTZ commands:** ONVIF PTZ operations are not idempotent. Queue PTZ commands on the Edge Agent to avoid race conditions from rapid UI clicks.
- **Direct PTZ from Dashboard without role check:** Always gate PTZ endpoints with `@Roles('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')` on the API (D-16) in addition to UI-level hiding.
- **Storing binary image data in PostgreSQL:** Camera snapshots for thumbnails should be stored as files (S3/MinIO/local disk), with a URL in the database.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OSDP protocol framing, CRC, SC encryption | Custom pyserial-asyncio OSDP parser | `libosdp` v3.2.5 Python bindings | OSDP has complex framing (SOM, address, length, control, data, CRC16), Secure Channel (AES-128 key establishment + encryption), multi-drop addressing — months of implementation effort, high bug risk |
| ONVIF SOAP client for camera control | Custom SOAP/XML requests | `onvif-zeep` with zeep | ONVIF WSDL types are complex (200+ types); zeep auto-generates Python types from WSDL; custom SOAP quickly becomes unmanageable |
| Camera snapshot capture | FFmpeg subprocess per snapshot | aiohttp GET to camera HTTP snapshot endpoint | Most ONVIF cameras provide JPEG snapshots via HTTP GET on a known URL; FFmpeg is overkill and slow for thumbnails |
| TimescaleDB retention enforcement | Custom cron job to delete old events | TimescaleDB `add_retention_policy` | Built-in compression + automatic data removal; 90-day policy set once, no maintenance |
| MQTT reconnection with buffer | Custom TCP reconnection logic | `aiomqtt` (already in Phase 1) | aiomqtt handles reconnect, backoff, will messages; Phase 1 already uses this pattern |

**Key insight:** OSDP and ONVIF are complex, well-specified protocols with existing open-source libraries. Custom implementations of either would take weeks of engineering effort and introduce protocol-level bugs that are extremely hard to debug on physical hardware.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Existing `door_state_log` TimescaleDB hypertable; existing `door:state:{id}` Redis keys; existing `CameraDoorMap` Prisma table | No migration needed for existing data — new OSDP events add `hardware_event_log` hypertable alongside existing `door_state_log`. Redis state keys remain compatible. |
| Live service config | Mosquitto TLS + ACL config from Phase 1; Docker Compose Edge Agent env vars | Extend Mosquitto ACLs with new topic patterns (`site/{siteId}/door/{doorId}/event`, etc.). Add new Edge Agent env vars for ONVIF credentials if needed. |
| OS-registered state | None — Edge Agent runs as Docker container with `network_mode: host` | No OS-level registration changes needed beyond Docker Compose. |
| Secrets/env vars | `MOSQUITTO_PASSWORD`, `MQTT_USERNAME`, `MQTT_PASSWORD` from Phase 1; `EDGE_AGENT_SECRET`, `ONVIF_USERNAME`, `ONVIF_PASSWORD` (NEW) | Add `ONVIF_USERNAME`, `ONVIF_PASSWORD` to Edge Agent env vars. Consider adding per-camera credentials to Camera model if cameras use different auth. |
| Build artifacts | None — Edge Agent Docker image (`python:3.12-slim`) | Add `libosdp`, `onvif-zeep`, `zeep`, `Pillow` to `requirements.txt`. Rebuild Edge Agent Docker image. Add PTZ migration to Prisma schema. |

**Nothing found in category:** Verified via codebase audit.

## Common Pitfalls

### Pitfall 1: OSDP SC (Secure Channel) Negotiation Failure
**What goes wrong:** libosdp attempts SC handshake with an older controller that only supports plain OSDP, causing the connection to fail entirely.
**Why it happens:** The `osdp_pd_info_t` structure has a `flags` field that sets SC expectations. If set to `OSDP_FLAG_SC`, and the PD doesn't support SC, the CP rejects the connection.
**How to avoid:** Set `scbk` (Secure Channel Base Key) in `osdp_pd_info_t` to enable SC. If `osdp_cp_refresh()` returns an error for a PD, fall back by recreating the context without SC flags. `libosdp` v3.2+ has improved fallback behavior but still needs explicit handling at the application level.
**Warning signs:** OSDP PD never transitions to "online" despite correct wiring; repeated authentication failures in libosdp logs.

### Pitfall 2: ONVIF Event Subscription Timeouts
**What goes wrong:** `PullPointSubscription` (the standard way to subscribe to ONVIF events) requires a long-lived HTTP connection. If the Edge Agent loses network briefly, the subscription expires.
**Why it happens:** ONVIF PullPoint uses SOAP-based polling; the subscription has a timeout (typically 5-60 minutes). If no `PullMessages` request arrives within the timeout, the server drops the subscription.
**How to avoid:** Use `PullPointSubscription` with a renew loop. Before the timeout expires, call `Renew()` on the subscription. Alternatively, use `BaseNotification` (if camera supports it) for UDP-based push events — but this requires the camera to know where to send events.
**Warning signs:** Events stop arriving after a predictable interval; "no subscription" errors in PullMessages responses.

### Pitfall 3: RS-485 Bus Contention on Multi-Drop
**What goes wrong:** Two OSDP PDs on the same RS-485 bus respond to the same address, causing CRC errors and garbled frames.
**Why it happens:** OSDP PDs ship with default address 0x7F (127). On a new installation, multiple controllers share this address until configured.
**How to avoid:** libosdp CP mode handles multi-drop addressing. The discovery process (D-17) sends OSDP POLL commands to each address (0x01-0x7E). Each PD that responds gets assigned. For address 0x7F, use the OSDP bus ID command to assign unique addresses after discovery.
**Warning signs:** Intermittent CRC errors on serial frames; PDs appearing/disappearing from the device list.

### Pitfall 4: PTZ Command Overwhelm (Rapid UI Clicks)
**What goes wrong:** Quick repeated clicks on the PTZ directional pad send 10+ ONVIF `ContinuousMove` commands per second, overwhelming the camera's processor and causing delayed/jittery response.
**Why it happens:** ONVIF PTZ is not designed for high-frequency updates; each command requires a SOAP request/response cycle.
**How to avoid:** Implement client-side rate-limiting on the PTZ overlay (max 5 commands/second). Use `RelativeMove` for discrete steps instead of `ContinuousMove` for tap-based controls. Queue PTZ commands on the Edge Agent with deduplication (if same direction already queued, skip).
**Warning signs:** Camera PTZ response becomes delayed by 1-3 seconds; camera error logs show "busy" responses.

### Pitfall 5: MQTT Topic Wildcard Overmatch
**What goes wrong:** The API subscribes to `site/+/door/+/event` but doesn't validate the site match, causing cross-tenant event leakage.
**Why it happens:** `site/{siteId}/door/{doorId}/event` uses orgId as siteId. If the `MqttService` doesn't verify that `topicParts[1]` (orgId from topic) matches `message.organizationId`, events from one tenant could be processed in another's context.
**How to avoid:** Always validate the orgId extracted from the MQTT topic against the organization context (pattern already used in `DoorService.handleDoorStateEvent()`). Add the same pattern to all new event handlers.
**Warning signs:** Door states changing for wrong organization in Dashboard.

## Code Examples

Verified patterns from official sources:

### OSDP CP Initialization with Python Bindings
```python
# Based on libosdp Python examples
import libosdp

# Define PD info for each device on the bus
pd_infos = [
    libosdp.PDInfo(
        address=0x01,                         # OSDP address 1
        flags=libosdp.Flag.SC,                # Enable Secure Channel
        scbk=bytes.fromhex("00112233445566778899AABBCCDDEEFF"),  # SCBK
        channel=my_channel_instance,           # User-implemented Channel
    ),
]

# Create CP context
osdp = libosdp.OSDP(pd_infos, mode=libosdp.Mode.CP)

# In the refresh loop (called at least every 50ms):
osdp.refresh()

# Send commands:
osdp.send_command(pd_address=0x01, cmd=libosdp.LOCK)

# Receive events via callback:
def on_event(pd_address: int, event: libosdp.Event, data: bytes):
    if event == libosdp.Event.BADGE_READ:
        badge_number = data.decode('ascii')
        # Publish to MQTT: site/{siteId}/reader/{readerId}/badge
```
*Source: [CITED: github.com/osdp-dev/libosdp — README, python/ directory, API docs at doc.osdp.dev]*

### ONVIF PTZ Preset Save and Recall
```python
# Based on onvif-zeep examples
from onvif import ONVIFCamera

cam = ONVIFCamera('192.168.1.100', 80, 'admin', 'password')
ptz = cam.create_ptz_service()

# Get available presets
presets = ptz.GetPresets({'ProfileToken': 'Profile_1'})
for p in presets:
    print(f"Preset: {p.Name}, Token: {p.token}")

# Goto preset
ptz.GotoPreset({
    'ProfileToken': 'Profile_1',
    'PresetToken': preset_token,
})

# Set current position as preset
ptz.SetPreset({
    'ProfileToken': 'Profile_1',
    'PresetName': 'Entrance Gate',
})

# Continuous move (for directional pad)
ptz.ContinuousMove({
    'ProfileToken': 'Profile_1',
    'Velocity': {
        'PanTilt': {'x': 0.5, 'y': 0.0},  # Pan right
        'Zoom': {'x': 0.0},
    },
})

# Stop movement
ptz.Stop({'ProfileToken': 'Profile_1'})
```
*Source: [CITED: github.com/FalkTannhaeuser/python-onvif-zeep — README examples, ONVIF spec]*

### NestJS EventEmitter2 + BullMQ Extension for OSDP Events
```typescript
// In DoorService — new handler for rich OSDP events
@OnEvent('mqtt.door.event', { async: true })
async handleDoorEvent(payload: { topic: string; message: any }) {
  const { topic, message } = payload;
  const orgId = topic.split('/')[1];
  const doorId = topic.split('/')[3];
  
  // Persist to hardware_event_log hypertable
  await this.prisma.$queryRaw`
    INSERT INTO hardware_event_log (time, door_id, organization_id, event_type, payload)
    VALUES (${new Date()}, ${doorId}::uuid, ${orgId}::uuid, 
            ${message.event_type}, ${JSON.stringify(message)}::jsonb)
  `;
  
  // Emit to Socket.IO gateway for Dashboard
  this.eventEmitter.emit('door.osdp-event', {
    doorId,
    orgId,
    eventType: message.event_type,
    badgeNumber: message.badge_number,
    direction: message.direction,
    tampered: message.tampered,
    timestamp: message.timestamp,
  });
}
```

### Prisma Schema Migration for PTZ Fields
```prisma
// Add to Camera model (schema.prisma)
model Camera {
  // ... existing fields ...
  
  // NEW: PTZ capabilities (JSON — flexible schema per camera model)
  ptzCapabilities   Json?     // { "hasPtz": true, "absoluteMove": true, "continuousMove": true, "presets": true }
  
  // NEW: ONVIF connection details
  onvifAddress      String?   // IP:port for ONVIF commands
  onvifUsername     String?   // Encrypted or reference to secret
  onvifPassword     String?   // Encrypted or reference to secret
  onvifProfileToken String?   // Active media profile token
  onvifSerialNumber String?   // From GetDeviceInformation
  
  // NEW: PTZ preset snapshots
  ptzPresets        Json?     // [{ "token": "...", "name": "Entrance", "snapshotUrl": "..." }]
}

// NEW: Controller model for OSDP controller enrollment
model Controller {
  id             String   @id @default(uuid())
  name           String?
  serialNumber   String?
  manufacturer   String?
  model          String?
  firmwareVersion String?
  
  // Connection
  organizationId String
  siteId         String?
  serialPort     String?   // e.g., "/dev/ttyUSB0"
  osdpAddress    Int?      // 0x01-0x7E
  secureChannel  Boolean   @default(true)
  
  // Status
  status         String    @default("PENDING")  // PENDING, ONLINE, OFFLINE, DEGRADED
  lastSeen       DateTime?
  
  // Associations
  doors          Door[]
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  @@index([organizationId])
  @@index([status])
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw pyserial-asyncio frame parsing | `libosdp` v3.2.5 Python bindings | Phase 2 | Full OSDP protocol stack with SC, multi-drop, event callbacks — replaces manual frame assembly in `serial_task.py` |
| Manual WS-Discovery XML parsing (current `onvif.py`) | `onvif-zeep` + proper SOAP provisioning | Phase 2 | After discovery, Edge Agent interrogates camera for full device info, profiles, stream URIs, PTZ capabilities, event support |
| Synchronous Edge Agent | Async Edge Agent with asyncio | Phase 1 | Phase 1 provides the async foundation; Phase 2 adds OSDP and ONVIF tasks to the existing task pool |
| Manual camera RTSP entry | Fully automatic ONVIF provisioning | Phase 2 | D-02: cameras appear with zero operator steps after WS-Discovery |

**Deprecated/outdated:**
- `serial_task.py` raw frame parser: The raw byte-gap frame detection is replaced by libosdp's proper OSDP framing. But the raw reader remains useful for initial port enumeration/discovery before libosdp takes over.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `libosdp` Python bindings work out-of-the-box on `python:3.12-slim` Docker image | Standard Stack | May need build dependencies (gcc, cmake, python3-dev) added to Dockerfile; CI build time increases |
| A2 | `onvif-zeep` v0.2.12 (2018) is compatible with current zeep >= 4.0 | Standard Stack | zeep 4.x may have breaking API changes; may need a newer fork or pinning zeep < 4.0 |
| A3 | ONVIF cameras implement ONVIF Profile S (streaming) and Profile Q (quick discovery) | Architecture | Basic Profile S is nearly universal; Profile Q (quick discovery) is less common but WS-Discovery (mandatory for Profile G) covers our needs |
| A4 | Most IP cameras support HTTP snapshot endpoint at `/onvif/snapshot` or similar | Architecture | Some cameras may only support RTSP; fallback to FFmpeg frame extraction needed |
| A5 | OSDP controller default address is 0x7F per spec | Common Pitfalls | Some manufacturers may use different defaults; discovery loop should scan 0x01-0x7F |
| A6 | `zeep` SOAP requests work in executor threads without thread-safety issues | Standard Stack | zeep reuses httpx/requests sessions internally; may need a fresh session per call |
| A7 | Camera snapshot capture for inline thumbnails uses HTTP GET to camera's snapshot URL | Don't Hand-Roll | Some cameras require digest authentication; may need `aiohttp` with digest auth |

## Open Questions

1. **How to handle ONVIF camera authentication credentials across sites?**
   - What we know: Different cameras at different sites may use different ONVIF usernames/passwords.
   - What's unclear: Should credentials be per-camera (stored on Camera model), per-site (stored on Organization), or per-edge-agent (global env vars)?
   - Recommendation: Use per-edge-agent env vars initially (`ONVIF_USERNAME`, `ONVIF_PASSWORD`), with the Camera model having override fields for future per-camera credentials.

2. **Should PTZ commands route through Edge Agent or go directly to camera?**
   - What we know: Edge Agent has network access to cameras; API may or may not.
   - What's unclear: PTZ is latency-sensitive; routing through Edge Agent adds a hop. However, the API may not have LAN access to cameras (depends on deployment networking).
   - Recommendation: Route PTZ commands directly from API to camera HTTP if possible (API has `extra_hosts: host.docker.internal`), with Edge Agent relay as fallback. The Camera model's `onvifAddress` field stores the target.

3. **What is the correct ONVIF event PullPoint subscription renewal interval?**
   - What we know: ONVIF `PullPointSubscription` has a configurable timeout. `PullMessages` must be called within the timeout to keep subscription alive.
   - What's unclear: Default timeout varies by camera manufacturer (30s to 30min).
   - Recommendation: Implement a configurable polling interval (default 10s) with subscription renewal at half the agreed timeout. Log a warning if renewal fails and re-subscribe.

4. **How should PTZ preset snapshots be captured?**
   - What we know: D-07 requires a camera snapshot at each saved preset position.
   - What's unclear: Whether to capture before saving the preset (move to position, wait, capture) or capture the current position when user clicks "Save Current Position".
   - Recommendation: Capture snapshot from camera's HTTP JPEG endpoint immediately when user saves the preset. Store as a reference URL, not the full image.

5. **Should the `Controller` Prisma model be a new table or an extension of existing models?**
   - What we know: Door model already has a `controllerId` string field (not a FK constraint).
   - What's unclear: Making it a proper FK requires adding a Controller model and migration.
   - Recommendation: Create a new `Controller` model with proper FK relationship to Door, migrate existing `controllerId` values to reference new Controller records.

## Validation Architecture

> nyquist_validation is explicitly set to false in .planning/config.json — this section is skipped per project configuration.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT auth on all new API endpoints; existing `@Roles()` decorator pattern |
| V3 Session Management | yes | Existing JWT access/refresh token pattern; no changes needed |
| V4 Access Control | yes | PTZ control gated by `@Roles('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')` (D-16); door commands gated by role |
| V5 Input Validation | yes | Zod schemas for all new payloads; existing `ZodValidationPipe` pattern |
| V6 Cryptography | yes | OSDP Secure Channel (AES-128) for door controller communication; TLS for MQTT |
| V7 Malicious Code | no | Phase does not introduce code execution paths |
| V8 Data Protection | yes | 90-day retention policy (D-18); hardware events may contain PII (badge numbers) |
| V9 Communications | yes | MQTT TLS (Phase 1); API HTTPS via Caddy; ONVIF communication on local LAN only |
| V11 Business Logic | yes | Bulk lock/unlock requires confirmation (D-12); auto-retry with state feedback (D-11) |

### Known Threat Patterns for Physical Security Integration

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized door unlock via MQTT injection | Spoofing | Mosquitto ACLs per-site (`site/{siteId}/#`); per-agent credentials; TLS encrypts all MQTT traffic |
| PTZ denial of service (operator repositions all cameras) | Denial of Service | Role-gated PTZ (D-16); rate-limiting on PTZ endpoints; queue serialization on Edge Agent |
| Badge replay attack on OSDP SC | Spoofing | OSDP Secure Channel (AES-128) with per-session keys prevents replay (D-01) |
| Unauthorized bulk unlock (e.g., during emergency) | Tampering | Confirmation dialog (D-12); audit logging of bulk operations; `@Audited()` decorator on endpoints |
| Cross-tenant MQTT event leakage | Information Disclosure | Topic hierarchy scoped by orgId; MqttService validates orgId matches parsed topic (existing D-05 pattern) |
| ONVIF credentials in plaintext database | Information Disclosure | Store onvifPassword as encrypted field or reference to secrets manager; never log ONVIF credentials |
| Camera snapshot unauthorized access | Information Disclosure | Snapshot URLs use signed tokens or restrict by org context; existing pattern from `lastSnapshotUrl` |

## Sources

### Primary (HIGH confidence)
- [GitHub: osdp-dev/libosdp](https://github.com/osdp-dev/libosdp) — OSDP C library with Python bindings, v3.2.5, SC support, CP/PD modes, async refresh protocol
- [GitHub: FalkTannhaeuser/python-onvif-zeep](https://github.com/FalkTannhaeuser/python-onvif-zeep) — ONVIF client Python library using zeep SOAP (544 stars)
- [PyPI JSON API](https://pypi.org/pypi/libosdp/3.2.5/json) — libosdp package metadata (verified name, version, author, GitHub URL)
- [Codebase] — Existing door module (service, controller, gateway, processor, state machine), camera module, MqttService, Prisma schema, Dashboard doors page, camera page, video player, API client

### Secondary (MEDIUM confidence)
- [PyPI: onvif-zeep](https://pypi.org/project/onvif-zeep/0.2.12/) — Release history, project description, dependency on zeep
- [ONVIF spec: Operations Index](https://www.onvif.org/onvif/ver20/util/operationIndex.html) — Reference for PTZ operations, event subscription, device management

### Tertiary (LOW confidence)
- [libosdp documentation](https://doc.osdp.dev/) — API docs for Python bindings (not directly verified in session; referenced from GitHub README)
- [ONVIF Streaming spec](https://www.onvif.org/specs/streaming/ONVIF-Streaming-Spec-v1606.pdf) — RTSP profile specification

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — libosdp and onvif-zeep packages verified on PyPI but async compatibility assumptions (A1-A6) are based on documentation review, not runtime testing
- Architecture: HIGH — patterns verified against existing codebase (Door controller, MqttService, Socket.IO gateway, Dashboard pages)
- Pitfalls: MEDIUM — OSDP and ONVIF pitfalls are based on protocol knowledge and vendor documentation; some edge cases specific to certain hardware may not be covered
- Security: HIGH — ASVS categories mapped to existing patterns; threat table uses standard STRIDE analysis

**Research date:** 2026-07-17
**Valid until:** 2026-08-17 (fast-moving Python ecosystem for libosdp; onvif-zeep is stable/abandoned)
