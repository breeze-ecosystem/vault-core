# Architecture Research: v3.0 Hardware Integration & Production Readiness

**Domain:** Physical security hardware integration — OSDP door controllers, ONVIF cameras, visitor kiosk, enhanced edge agent
**Researched:** 2026-07-17
**Overall confidence:** HIGH (patterns verified against codebase, existing MQTT/ProtocolAdapter infrastructure validated)
**Mode:** Ecosystem

---

## Executive Summary

The Oversight Hub v1.0/v2.0 codebase already contains an MQTT-based hardware abstraction layer with protocol adapters (Wiegand), door state machines, credential management, equipment health monitoring, and real-time WebSocket synchronization. The v3.0 hardware integration adds three major domains — OSDP door controllers, ONVIF camera auto-discovery, and visitor kiosk — plus enhances the existing Edge Agent for direct hardware communication.

**Key architectural decisions:**

1. **Extend the existing Edge Agent** (Python) with a Hardware Communication Layer rather than creating a new service. The Edge Agent already runs on the edge, has Docker socket access, and communicates with the NestJS API. Adding direct serial/IP hardware communication (OSDP, ONVIF, smart locks) avoids introducing a fourth service.

2. **Keep hardware abstractions in the NestJS API** via the existing `ProtocolAdapter` pattern. The Edge Agent is a thin transport bridge — it doesn't interpret protocols. Protocol adaptation (OSDP frame parsing, ONVIF device discovery normalization) lives in `apps/api/src/mqtt/adapters/`.

3. **Visitor kiosk deploys as a standalone container** (single-page React app served by a minimal web server, not in-browser). This gives it direct access to USB badge printers and touchscreen APIs that browser-based kiosks can't access reliably.

4. **MQTT remains the backbone** for Edge Agent ↔ API communication. The existing `MqttService` already subscribes to door state, badge read, and controller health topics. New topics for ONVIF discovery results, kiosk events, and smart lock status extend this pattern.

---

## Hardware Abstraction Strategy

### Where should hardware abstraction live?

**Recommendation: Split across two layers with a clear boundary.**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NestJS API (protocol intelligence)                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ OSDP Adapter  │  │ ONVIF Client │  │ Smart Lock Adapter       │ │
│  │ (protocol     │  │ (WS-Discovery│  │ (manufacturer-specific   │ │
│  │  adaptation)  │  │  + PTZ)     │  │  Zigbee/Z-Wave/MQTT)     │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘ │
│         │                 │                       │               │
│  ┌──────┴─────────────────┴───────────────────────┴──────────────┐ │
│  │            ProtocolAdapter Interface (existing)                │ │
│  │  normalizeDoorState() / normalizeBadgeRead() / validate()      │ │
│  └────────────────────────────┬──────────────────────────────────┘ │
│                               │                                    │
│  ┌────────────────────────────┴──────────────────────────────────┐ │
│  │              MqttService (existing, extended)                  │ │
│  │  subscribe to new topics, EventEmitter routing, seq validation│ │
│  └────────────────────────────┬──────────────────────────────────┘ │
└───────────────────────────────┼────────────────────────────────────┘
                                │ MQTT (existing mosquitto broker)
┌───────────────────────────────┼────────────────────────────────────┐
│            Edge Agent (Python) — Hardware Communication Layer      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           HardwareCommunicationManager (NEW)                  │  │
│  │  • Serial port manager (OSDP over RS-485)                     │  │
│  │  • ONVIF WS-Discovery scanner                                 │  │
│  │  • Smart lock bridge (Zigbee2MQTT / Z-Wave JS)                │  │
│  │  • Badge printer manager (CUPS/IPP for kiosk)                 │  │
│  │  • USB device detection + health                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│              │                                                     │
│  ┌───────────┴───────────┐   ┌──────────────────────────────────┐ │
│  │ Docker management      │   │ System metrics agent             │ │
│  │ (existing)             │   │ (existing)                       │ │
│  └───────────────────────┘   └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Layer 1: Edge Agent (Python) — Hardware Communication Layer**
- **Responsibility:** Physical hardware access — serial port I/O, network discovery, USB device enumeration, badge printer spooling
- **Why Python:** Already uses Python 3.12, `pyserial` for serial, `onvif-zeep` for ONVIF SOAP, `requests` for REST. Python has best library support for industrial protocols (OSDP, ONVIF, Modbus)
- **Why not Node.js:** Serial port access, subprocess management for ONVIF probes, and low-level byte manipulation are worse in Node.js. Mixing serial I/O into the NestJS event loop would block request processing.
- **Communication:** Publishes normalized events to MQTT. Receives commands via MQTT subscriptions (`oversight/edge/command/+/+`)

**Layer 2: NestJS API — Protocol Intelligence**
- **Responsibility:** Protocol adaptation (normalizing manufacturer-specific payloads), state machines, policy enforcement, WebSocket broadcast
- **Why NestJS:** The codebase already has `ProtocolAdapter` interface, `WiegandAdapter`, `MqttService`, event-driven architecture. Adding an `OSDPAdapter` and `ONVIFAdapter` follows the exact same pattern.
- **Pattern:** Extends existing `ProtocolAdapter` interface. No new architectural patterns needed.

### Edge Agent vs New Hardware Service vs In-API

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **In-API (NestJS)** | No new service, existing patterns | Can't access serial/USB hardware, blocks event loop | ❌ Rejected |
| **New Hardware Service** | Clean separation | Third service to deploy, maintain, monitor. Duplicates Edge Agent capabilities | ❌ Rejected |
| **Extended Edge Agent** | Already deployed on edge, has Docker access, Python ecosystem, MQTT plumbing | Must handle Python concurrency carefully | ✅ **Recommended** |

### Migration path for existing Wiegand support

The existing `WiegandAdapter` already handles phase-1 door controllers. v3.0 adds `OSDPAdapter` alongside it. Both implement the same `ProtocolAdapter` interface. The `MqttService` routes incoming messages to the appropriate adapter based on a manufacturer header in the MQTT payload.

---

## Door Controller Integration (OSDP / Wiegand / Smart Locks)

### Communication Pattern

The existing system already has a bidirectional MQTT pattern for door control:

**Current (Wiegand):**
```
Controller → MQTT → MqttService → EventEmitter → DoorService → Redis + DB + WS
                                                         ↓
                                                 (no return path — can't send commands to controller)
```

**v3.0 (OSDP + Smart Locks):**
```
Controller → Serial/USB → Edge Agent → MQTT → MqttService → EventEmitter → DoorService
     ↑                                                    ↓
     └──────── MQTT ← Edge Agent ← MQTT command ←─── DoorService
```

The key addition is the **command path**: the API can now send commands *back* to controllers (lock, unlock, lockdown, unlock-zone). This is the difference between the existing read-only Wiegand integration and full OSDP bidirectional control.

### Data Flow

```
1. OSDP Controller sends door state change (e.g., forced open)
   ↓
2. Edge Agent reads from serial port (RS-485)
   ↓
3. Edge Agent parses OSDP frame → extracts {doorId, state, sequence, timestamp}
   ↓
4. Edge Agent publishes to MQTT topic:
   site/{orgId}/door/{doorId}/state
   Payload: { state: "forced", sequence: 42, timestamp: "...", protocol: "osdp" }
   ↓
5. MqttService receives, validates sequence number
   ↓
6. MqttService routes to OSDPAdapter (via protocol field in payload)
   ↓
7. OSDPAdapter.normalizeDoorState() returns standardized DoorStateEvent
   ↓
8. EventEmitter emits "mqtt.door.state" (same event as Wiegand!)
   ↓
9. DoorService.handleDoorStateEvent() — identical code path as existing
   - Validates transition via DoorStateMachine
   - Persists to door_state_log hypertable
   - Updates Redis current state
   - Emits WebSocket to Dashboard/Mobile
   - Evaluates alert conditions (settling timeout → BullMQ)
   ↓
10. If DoorService needs to send command (e.g., lockdown zone):
    ↓
11. DoorService publishes MQTT command topic:
    oversight/{orgId}/door/command
    Payload: { doorId, command: "lock", reason: "lockdown-zone-42" }
    ↓
12. Edge Agent subscribes to oversight/+/door/command, receives command
    ↓
13. Edge Agent constructs OSDP frame, sends over serial to controller
    ↓
14. Controller executes command, sends acknowledgment
    ↓
15. Edge Agent publishes acknowledgment to:
    site/{orgId}/door/{doorId}/command-ack
    (This flows back through DoorService for confirmation)
```

### Components (New/Modified)

| Component | Type | Location | Responsibility |
|-----------|------|----------|----------------|
| `OSDPAdapter` | **NEW** | `apps/api/src/mqtt/adapters/osdp-adapter.ts` | Normalize OSDP payloads, implement `ProtocolAdapter` |
| `osdp.frame.ts` | **NEW** | `edge/agent/hardware/osdp/frame.py` | OSDP frame construction/parsing (CRC, SCB, encryption) |
| `osdp.protocol.py` | **NEW** | `edge/agent/hardware/osdp/protocol.py` | OSDP command/response state machine |
| `osdp.serial.py` | **NEW** | `edge/agent/hardware/osdp/serial.py` | Serial port manager (RS-485, baud rate, parity) |
| `HardwareCommunicationManager` | **NEW** | `edge/agent/hardware/manager.py` | Orchestrates all hardware interfaces, command routing |
| `MqttTopics` | **MODIFIED** | `apps/api/src/mqtt/mqtt-topics.ts` | Add command topics, OSDP-specific topics |
| `MqttService` | **MODIFIED** | `apps/api/src/mqtt/mqtt.service.ts` | Subscribe to command-ack topics, protocol-aware routing |
| `DoorService` | **MODIFIED** | `apps/api/src/modules/door/door.service.ts` | Add command sending methods (`lockDoor`, `unlockDoor`, `setLockdown`) |
| `DoorGateway` | **MODIFIED** | `apps/api/src/modules/door/door.gateway.ts` | Add `command` WebSocket events for direct door control |
| `Edge Agent Dockerfile` | **MODIFIED** | `edge/agent/Dockerfile` | Install `pyserial`, `onvif-zeep`, `cups` for hardware support |
| `edge.config.json` | **MODIFIED** | `edge/agent/edge.config.json` | Add `hardware` configuration section |
| `requirements.txt` | **MODIFIED** | `edge/agent/requirements.txt` | Add `pyserial`, `onvif-zeep`, `cups-api`, `pycryptodome` |

### OSDP-Specific Considerations

**Secure Channel (SCB):**
OSDP supports AES-128 encrypted communication. The Edge Agent must store a key per controller (configured in `edge.config.json`). The API never holds OSDP keys — they're deployed with the edge hardware. This is a security boundary: API commands are signed with the edge agent token, OSDP keys never leave the edge.

**Discovery:**
OSDP controllers use a bus topology (RS-485 multi-drop). Each controller has a bus address (0x00–0x7F). The Edge Agent can probe addresses on startup by sending a Poll command and waiting for a response. Discovered controllers are reported via MQTT:
```
topic: site/{orgId}/discovery/controller
payload: { busAddress: 0x07, manufacturer: "HID", model: "VertX V100", firmware: "4.3.2" }
```

**Multi-drop considerations:**
- All controllers share one serial port (RS-485)
- Each command must wait for response before sending next (half-duplex)
- The `osdp.serial.py` must implement a command queue with per-address locking
- A stuck controller (no response to 3 polls) should be reported as OFFLINE but not block the queue

**Smart Locks (Zigbee / Z-Wave / Wi-Fi):**
- Smart locks don't use OSDP — they use Zigbee, Z-Wave, or Wi-Fi
- Zigbee devices → Zigbee2MQTT bridge → publishes to MQTT directly
- Z-Wave devices → Z-Wave JS → publishes to MQTT directly
- Wi-Fi locks (e.g., August, Schlage Encode) → cloud API or local REST API
- **Recommendation:** Deploy Zigbee2MQTT or Z-Wave JS as companion containers on the edge, bridge to existing mosquitto broker. The `ProtocolAdapter` interface handles normalization.

### State Sync

**Current approach (already working):** Redis stores current state per door (`door:state:{doorId}`). WebSocket broadcasts on state change.

**v3.0 additions:**
- **Command acknowledgment tracking:** After sending a lock command, the API should set a "pending" state in Redis (`door:command-pending:{doorId}`) and wait for the command-ack MQTT message before considering the command executed. If no ack within 5 seconds, emit a `command-failed` event.
- **Desync detection:** If Edge Agent reports door state that contradicts the expected state from a recent command, increment a desync counter. After 3 desyncs, set door to `DESYNCHRONIZED` state in the state machine. This already exists in `DoorStateMachine` (desyncMaxRetries).
- **Scheduled state reconciliation:** Every 60 seconds, Edge Agent requests current state from all connected controllers and publishes a `state-reconciliation` message. API compares with Redis state and alerts on mismatch.

---

## Camera Auto-Discovery (ONVIF)

### Discovery Flow

ONVIF devices use WS-Discovery (SOAP over UDP multicast) for network discovery. The flow:

```
User action: Click "Discover Cameras" in Dashboard
         │
         │ POST /api/cameras/discover
         │ Body: { networkRange: "192.168.1.0/24" }
         ▼
  CameraController (NEW endpoint)
         │
         │ 1. Validate license (maxCameras)
         │ 2. Enqueue ONVIF discovery job:
         │    endpointBullMQ: onvif-discovery queue
         │ 3. Return { jobId } immediately
         ▼
  BullMQ Worker: OnvifDiscoveryProcessor
         │
         │ Publish MQTT command:
         │ oversight/{orgId}/edge/camera/discover
         │ Payload: { jobId, networkRange }
         ▼
  Edge Agent receives command → HardwareCommunicationManager
         │
         │ 1. Send WS-Discovery Probe message (UDP multicast)
         │ 2. Wait for ProbeMatch responses (5 second window)
         │ 3. For each response:
         │     a. Get device metadata (GetDeviceInformation)
         │     b. Get stream URI (GetStreamUri)
         │     c. Get capabilities (GetCapabilities)
         │     d. Test RTSP connectivity
         │ 4. Publish results to MQTT:
         │    site/{orgId}/discovery/camera-result
         │    Payload: { jobId, cameras: [...] }
         ▼
  MqttService → EventEmitter → OnvifDiscoveryProcessor
         │
         │ 1. Create draft Camera records (status: DISCOVERED)
         │ 2. Return results via WebSocket to Dashboard
         ▼
  User reviews discovered cameras in Dashboard
         │
         │ PATCH /api/cameras/:id/activate
         ▼
  Camera status → ONLINE, ingestion starts
```

### Data Flow

```
Edge Agent ONVIF Probe:
┌──────────────────────────────────────────┐
│  WS-Discovery Probe (UDP 239.255.255.250:3702)
│  <?xml version="1.0"?>
│  <soap:Envelope ...>
│    <wsdis:Probe>
│      <wsdis:Types>dn:NetworkVideoTransmitter</wsdis:Types>
│    </wsdis:Probe>
│  </soap:Envelope>
│
│  ← ProbeMatch responses from all ONVIF cameras
│  For each camera:
│  1. GetDeviceInformation → manufacturer, model, firmware
│  2. GetCapabilities → PTZ, audio, analytics support
│  3. GetProfiles → available stream profiles
│  4. GetStreamUri → RTSP URL (for go2rtc)
│  5. GetSnapshotUri → JPEG snapshot URL
│  6. GetNetworkInterfaces → IP, MAC
│
│  Result published to MQTT:
│  {
│    ip: "192.168.1.108",
│    manufacturer: "Hikvision",
│    model: "DS-2CD2386G2-I",
│    serialNumber: "DS-2CD2386G2-I20250101AAAC",
│    macAddress: "aa:bb:cc:dd:ee:ff",
│    firmwareVersion: "V5.7.8",
│    rtspUrl: "rtsp://192.168.1.108:554/Streaming/Channels/101",
│    snapshotUrl: "http://192.168.1.108:80/onvif-http/snapshot?auth=digest",
│    profiles: [{ name: "main", resolution: "3840x2160", fps: 20 }, ...],
│    capabilities: { ptz: true, audio: false, motion: true, analytics: true }
│  }
└──────────────────────────────────────────┘
```

### Components (New/Modified)

| Component | Type | Location | Responsibility |
|-----------|------|----------|----------------|
| `ONVIFAdapter` | **NEW** | `apps/api/src/mqtt/adapters/onvif-adapter.ts` | Normalize ONVIF discovery results, implement stream URL validation |
| `OnvifDiscoveryProcessor` | **NEW** | `apps/api/src/modules/camera/onvif-discovery.processor.ts` | BullMQ worker: receive discovery results, create draft cameras |
| `CameraController` | **MODIFIED** | `apps/api/src/modules/camera/camera.controller.ts` | Add `POST /discover`, `PATCH /:id/activate`, `GET /discovery-results/:jobId` |
| `CameraService` | **MODIFIED** | `apps/api/src/modules/camera/camera.service.ts` | Add `discoverCameras()`, `activateCamera()`, `importDiscoveredCamera()` |
| `CameraModule` | **MODIFIED** | `apps/api/src/modules/camera/camera.module.ts` | Register `OnvifDiscoveryProcessor`, add BullMQ queue `onvif-discovery` |
| `onvif.discovery.py` | **NEW** | `edge/agent/hardware/onvif/discovery.py` | WS-Discovery multicast probe, device probing |
| `onvif.camera.py` | **NEW** | `edge/agent/hardware/onvif/camera.py` | ONVIF media service client (GetStreamUri, GetSnapshotUri) |
| `onvif.ptz.py` | **NEW** | `edge/agent/hardware/onvif/ptz.py` | Future: PTZ control (pan, tilt, zoom, presets) |
| `MqttTopics` | **MODIFIED** | `apps/api/src/mqtt/mqtt-topics.ts` | Add discovery command/result topics |
| `edge.config.json` | **MODIFIED** | `edge/agent/edge.config.json` | Add `onvif` section (discovery network ranges) |
| Prisma Schema | **MODIFIED** | `apps/api/prisma/schema.prisma` | Add `discoveryMethod`, `onvifUsername`, `onvifPassword` fields to Camera |

### Prisma Schema Additions

```prisma
model Camera {
  // ... existing fields ...
  discoveryMethod   String?   @default("manual") // "manual", "onvif", "import"
  onvifUsername     String?   // ONVIF credentials (encrypted at rest)
  onvifPassword     String?   // ONVIF credentials (encrypted at rest)
  manufacturer      String?
  model             String?
  serialNumber      String?
  firmwareVersion   String?
  macAddress        String?
  streamProfiles    Json?     // Available ONVIF stream profiles
  supportsPtz       Boolean?  @default(false)
  supportsAudio     Boolean?  @default(false)
  ptzConfig         Json?     // PTZ preset positions
}

model DiscoveryJob {
  id              String   @id @default(uuid())
  organizationId  String
  initiatedBy     String   // userId
  networkRange    String?  // CIDR or "auto" (local subnet)
  status          String   @default("running") // "running", "completed", "failed"
  totalFound      Int      @default(0)
  totalAdded      Int      @default(0)
  createdAt       DateTime @default(now())
  completedAt     DateTime?

  organization Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId])
}
```

### ONVIF Credential Management

ONVIF cameras require authentication (digest auth). **Credentials must never be stored in plaintext:**

1. **At rest:** `onvifUsername`/`onvifPassword` encrypted using NestJS `ConfigService` encryption key (AES-256-GCM)
2. **In transit:** Sent to Edge Agent via MQTT only for the duration of discovery — encrypted in payload using edge agent's public key
3. **Edge Agent:** Store in memory only, never write to disk. If agent restarts, credentials must be re-sent
4. **API:** Never return `onvifPassword` in API responses (field-level Zod schema exclusion)

### PTZ Control (Future)

Once ONVIF cameras are registered, PTZ control adds:
- `POST /api/cameras/:id/ptz/absolute` — move to absolute position
- `POST /api/cameras/:id/ptz/relative` — move relative
- `POST /api/cameras/:id/ptz/continuous` — start continuous move (pan, tilt, zoom)
- `POST /api/cameras/:id/ptz/stop` — stop movement
- `POST /api/cameras/:id/ptz/preset` — save/recall preset position

This is a future extension. The architecture supports it:
- Edge Agent handles PTZ SOAP calls (no additional latency from serialization)
- API validates permissions, enriches with AI analysis context (e.g., "track person at coordinates X,Y")
- MQTT command model extends: `oversight/{orgId}/camera/{cameraId}/ptz`

---

## Visitor Kiosk

### Deployment Model

**Decision: Standalone container deployed alongside the platform, NOT in-browser.**

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **In-browser (Dashboard page)** | No new deployment, shares auth | No USB access (badge printer), no touchscreen optimization, browser security sandbox blocks local hardware | ❌ Rejected |
| **Standalone container** | Direct USB access, can run in kiosk mode (fullscreen), touch-optimized, can print badges via CUPS, can use local camera for QR scanning | Additional container to deploy, separate auth flow | ✅ **Recommended** |
| **Native Electron/Tauri app** | Best hardware access, offline capable | Heavy, hard to deploy/update across customer sites, defeats "self-hosted simplicity" | ❌ Rejected |

**Architecture:**

```
┌──────────────────────────────────────────────────────────────────────┐
│  Kiosk Container (standalone React SPA, served by Nginx)           │
│                                                                     │
│  ┌──────────────────────────┐  ┌──────────────────────────────────┐ │
│  │  Kiosk SPA (React 18)    │  │  Kiosk API (Express.js sidecar)  │ │
│  │                          │  │                                  │ │
│  │  - QR check-in screen    │  │  - QR code generation/validation │ │
│  │  - Badge printing UI     │  │  - Badge template rendering       │ │
│  │  - Visitor lookup         │  │  - CUPS print job management     │ │
│  │  - Self-registration      │  │  - WebSocket for auth tokens     │ │
│  │  - Touch-optimized UI     │  │  - USB camera for QR scanning    │ │
│  │  - i18n support           │  │  - Offline mode (queue + sync)   │ │
│  └──────────────────────────┘  └──────────────────┬───────────────┘ │
└────────────────────────────────────────────────────┼─────────────────┘
                                                     │
                                                     │ REST + WS
                                                     │ (authenticated)
                                                     ▼
                                              NestJS API
                                              (Visitor module)
```

**Why a sidecar API and not direct calls to NestJS:**
1. The kiosk needs to run offline (network blip shouldn't break check-in). A local sidecar queues requests and syncs when online.
2. Badge printing goes through CUPS (local to kiosk container). The sidecar manages print spooling.
3. QR scanning via USB camera requires browser capture API + local processing to avoid sending raw video to the API.
4. The sidecar runs a local WebSocket for the SPA (kiosk doesn't need to authenticate to itself).

**Container resource profile:**
- Base image: `node:20-alpine` + `cups` + `cups-filters` + `printer-driver-*`
- Memory: ~128MB idle, ~256MB under load
- CPU: Low (mostly idle, bursts during badge printing)
- Storage: ~200MB (SPA, sidecar code, badge templates, print spool)
- USB passthrough: `--device /dev/usb/lp0` for badge printer, `--device /dev/video0` for QR scanner

### Data Flow

```
Visitor approaches kiosk with smartphone QR code (pre-registered)
         │
         │ 1. Kiosk captures QR code via USB camera (or webcam)
         │    (processed locally by sidecar — no video sent to API)
         ▼
  Kiosk API validates QR seed (HMAC verification)
         │
         │ 2. If valid, sends to NestJS:
         │    POST /api/visitors/kiosk/check-in
         │    Body: { qrSeed: "uuid-from-qr" }
         ▼
  VisitorService.kioskCheckIn(qrSeed)
         │
         │ 3. Look up credential by qrSeed
         │ 4. Find active visit associated with credential
         │ 5. Validate visit window (not expired, not checked in yet)
         │ 6. Activate credential
         │ 7. Update visit status → "active", set checkedInAt
         │ 8. Return { visitorName, hostName, purpose, badgeUrl }
         ▼
  Kiosk API receives response
         │
         │ 9. Render badge template with visitor info + photo
         │ 10. Send to CUPS printer (IPP protocol)
         │ 11. Confirm to visitor: "Welcome, John Smith"
         │ 12. Emit WebSocket event to Dashboard: visitor.checked-in
         ▼
  Dashboard receives real-time notification (existing Socket.IO)

---

Alternative flow: Self-registration at kiosk (no pre-registration)
         │
         │ Visitor touches "New Visitor" on touchscreen
         │ Fills: firstName, lastName, email, phone, company, hostName
         ▼
  Kiosk API POST /api/visitors/kiosk/preregister
         │
         │ 1. Kiosk creates visitor record
         │ 2. Finds host by name (approximate match)
         │ 3. Creates credential with QR code
         │ 4. Returns QR seed for local display/print
         │ 5. Sets visit status to "pending-approval"
         │ 6. Notifies host via push notification
         ▼
  Host approves via Dashboard or Mobile
         │
         │ 7. Host approves → visit status → "scheduled"
         │ 8. Kiosk receives WebSocket event
         │ 9. Kiosk prints approved badge
         ▼
  Visitor proceeds with badge
```

### Components (New/Modified)

| Component | Type | Location | Responsibility |
|-----------|------|----------|----------------|
| `kiosk/` | **NEW** | `apps/kiosk/` | Standalone application |
| `apps/kiosk/app/` | **NEW** | Kiosk SPA | React app with QR check-in, self-registration, badge preview |
| `apps/kiosk/server/` | **NEW** | Kiosk sidecar | Express.js + CUPS integration + offline queue |
| `apps/kiosk/Dockerfile` | **NEW** | Kiosk container | Nginx (SPA) + Node.js (sidecar) in same container |
| `docker-compose.yml` | **MODIFIED** | Add kiosk service | Expose on port 3300, USB device passthrough |
| `Caddyfile` | **MODIFIED** | Add kiosk subdomain | `kiosk.domain.com → kiosk:3300` |
| `VisitorService` | **MODIFIED** | `apps/api/src/modules/visitor/visitor.service.ts` | Add `kioskCheckIn()`, `kioskPreregister()`, `findHostByName()` |
| `VisitorController` | **MODIFIED** | `apps/api/src/modules/visitor/visitor.controller.ts` | Add `POST /kiosk/check-in`, `POST /kiosk/preregister` |
| `VisitorGateway` | **MODIFIED** | `apps/api/src/modules/visitor/visitor.gateway.ts` | Add `visitor.kiosk-checkin` event |
| `KioskAuthGuard` | **NEW** | `apps/api/src/common/guards/kiosk-auth.guard.ts` | HMAC-signed kiosk token validation |
| `/shared/schemas/visitor.schema.ts` | **MODIFIED** | `packages/shared/src/schemas/` | Add kiosk-specific schemas |
| `Credential` model | **MODIFIED** | `apps/api/prisma/schema.prisma` | Add `issuedByKiosk` flag, `printedAt` timestamp |

### Badge Printing

Badge printing is handled by CUPS in the kiosk container. The flow:

1. **Template Management:** Badge templates are SVG/HTML files stored in `apps/kiosk/server/templates/`. They support variable substitution: `{{visitorName}}`, `{{hostName}}`, `{{validFrom}}`, `{{qrCode}}`, `{{photoUrl}}`.
2. **Rendering:** The sidecar renders templates using Puppeteer or a lightweight HTML-to-PDF library (e.g., `puppeteer` or `pdf-lib`).
3. **Printing:** PDF is sent to CUPS via IPP protocol. The sidecar monitors print job status.
4. **Printer config:** Configured via environment variables in docker-compose: `PRINTER_URI=ipp://localhost:631/printers/BadgePrinter`, `BADGE_TEMPLATE=default`

### Offline Mode

The kiosk sidecar maintains an IndexedDB-like local SQLite database (`better-sqlite3`):

- **Offline check-in:** QR seed is validated locally (HMAC key synced from API). Visit record created locally with `status: "pending-sync"`.
- **Sync on reconnect:** When API becomes available, queued records are sent via `POST /api/visitors/kiosk/batch-sync`.
- **Conflict resolution:** If the visit was already checked in via another kiosk or dashboard, the sync response indicates conflict and the kiosk marks the record as `"rejected"`.
- **Badge printing:** Always works locally regardless of API connectivity.

---

## Edge Agent Enhancement

### Hardware Communication Layer

The existing Edge Agent (`edge/agent/agent.py`) is a health monitoring agent with no hardware communication. v3.0 extends it significantly:

```
edge/agent/
├── agent.py                     (MODIFIED — start HardwareCommunicationManager)
├── hardware/
│   ├── __init__.py
│   ├── manager.py               (NEW — hardware interface orchestrator)
│   ├── serial_manager.py        (NEW — shared serial port pool)
│   ├── osdp/
│   │   ├── __init__.py
│   │   ├── frame.py             (NEW — OSDP frame construction/parsing)
│   │   ├── protocol.py          (NEW — OSDP command/response state machine)
│   │   ├── serial.py            (NEW — RS-485 serial communication)
│   │   └── commands.py          (NEW — OSDP command definitions)
│   ├── onvif/
│   │   ├── __init__.py
│   │   ├── discovery.py         (NEW — WS-Discovery multicast probe)
│   │   ├── camera.py            (NEW — ONVIF device service client)
│   │   └── ptz.py               (NEW — PTZ control, future)
│   ├── smartlock/
│   │   ├── __init__.py
│   │   ├── bridge.py            (NEW — Zigbee2MQTT/Z-Wave JS bridge)
│   │   └── protocols.py         (NEW — protocol normalization)
│   └── printer/
│       ├── __init__.py
│       └── badge_printer.py     (NEW — CUPS print job management)
├── requirements.txt             (MODIFIED — add hardware dependencies)
├── edge.config.example.json     (MODIFIED — add hardware config)
└── Dockerfile                    (MODIFIED — install system deps)
```

### Communication Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                  HardwareCommunicationManager                     │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────┐ │
│  │ OSDP Manager │  │ ONVIF Mgmt │  │ Smart Lock  │  │ Printer │ │
│  │             │  │             │  │ Bridge      │  │ Manager │ │
│  │ - Serial    │  │ - Discovery │  │ - Zigbee2MQ │  │ - CUPS  │ │
│  │   ports     │  │ - Probe     │  │   TT topic  │  │   jobs  │ │
│  │ - Bus scan  │  │ - StreamURI │  │   mapping   │  │ - Temp-  │ │
│  │ - Command   │  │ - PTZ (fut) │  │ - Z-Wave    │  │   lates  │ │
│  │   queue     │  └──────┬──────┘  │   mapping   │  └────┬────┘ │
│  └──────┬──────┘         │         └──────┬──────┘       │      │
│         │                │                │               │      │
│  ┌──────┴────────────────┴────────────────┴───────────────┴───┐ │
│  │                    MQTT Communication Layer                  │ │
│  │  - Publish: sensor data, health, discovery results           │ │
│  │  - Subscribe: commands, configuration changes                │ │
│  │  - Topic: oversight/{orgId}/{deviceType}/{deviceId}/...     │ │
│  └──────────────────────────┬───────────────────────────────────┘ │
└─────────────────────────────┼─────────────────────────────────────┘
                              │
                     MQTT Broker (mosquitto)
                              │
                    ┌─────────┴────────────┐
                    ▼                      ▼
              Edge Agent              NestJS API
            (heartbeat +             (subscriptions +
             camera stubs)           command publishing)
```

### API Extensions

The Edge Agent needs two new API endpoints (added to the existing `SupervisionController` or a new `EdgeController`):

| Method | Endpoint | Purpose | Body/Params |
|--------|----------|---------|-------------|
| `POST` | `/api/edge/status` | Report hardware status (connected devices, serial port health, USB device list) | `{ clientId, hardware: { osdp: [...], onvif: [...], printers: [...], serialPorts: [...] } }` |
| `GET` | `/api/edge/status/:clientId` | Get hardware status for a specific edge agent | Path param |
| `POST` | `/api/edge/command` | Send a command to an edge agent (e.g., "run camera discovery") | `{ clientId, command: "discover-cameras", params: {...} }` |

The existing supervision endpoints (`/api/supervision/heartbeat`) continue to carry hardware status as part of the heartbeat payload:

```json
{
  "clientId": "edge-site-01",
  "timestamp": "...",
  "uptime": 123456,
  "system": { "cpu": 45.2, "ram": 62.1, "disk": 34.8 },
  "services": { "api": true, "dashboard": true, "go2rtc": true },
  "hardware": {
    "osdp": [
      { "busAddress": 7, "manufacturer": "HID", "status": "online", "firmware": "4.3.2" },
      { "busAddress": 12, "manufacturer": "HID", "status": "offline" }
    ],
    "onvif": [
      { "ip": "192.168.1.108", "manufacturer": "Hikvision", "status": "online" }
    ],
    "printers": [
      { "name": "Zebra-ZD621", "status": "online", "mediaRemaining": 250 }
    ],
    "serialPorts": [
      { "device": "/dev/ttyUSB0", "baud": 38400, "status": "online" }
    ]
  }
}
```

### Edge Agent Configuration

The `edge.config.json` gains a `hardware` section:

```json
{
  "tier": "or",
  "clientId": "mynita-site-a",
  "hardware": {
    "osdp": {
      "enabled": true,
      "serialPort": "/dev/ttyUSB0",
      "baudRate": 38400,
      "dataBits": 8,
      "parity": "none",
      "stopBits": 1,
      "busAddresses": [1, 2, 3, 4, 5, 6, 7, 8],
      "autoScan": true,
      "scanIntervalMinutes": 60,
      "keys": {
        "07": "00112233445566778899AABBCCDDEEFF",
        "12": "FFEEDDCCBBAA99887766554433221100"
      }
    },
    "onvif": {
      "enabled": true,
      "discovery": {
        "multicastAddress": "239.255.255.250",
        "multicastPort": 3702,
        "probeTimeoutMs": 5000,
        "discoveryIntervalMinutes": 1440
      },
      "credentials": {}
    },
    "printers": {
      "badge": {
        "uri": "ipp://localhost:631/printers/BadgePrinter",
        "template": "default.svg",
        "dpi": 300,
        "mediaSize": "credit-card"
      }
    },
    "serialPorts": [
      {
        "device": "/dev/ttyUSB0",
        "baudRate": 38400,
        "parity": "none",
        "purpose": "osdp"
      }
    ]
  }
}
```

---

## Marketing Site Redesign

The existing marketing site (`apps/marketing/`) is built with Next.js 14, `next-intl` for i18n (6 locales), Tailwind CSS, `motion` for animations, and `@repo/design` for design tokens. It already has a strong foundation.

### Architecture Approach

**Decision: Evolve the existing marketing site, do NOT rebuild from scratch.**

The current site already:
- Uses `@repo/design` tokens (colors, typography, spacing, shadows)
- Has i18n with 6 locales (FR primary, EN, ES, DE, JA, AR)
- Has MDX blog with velite
- Has contact form with Turnstile
- Is deployed as a separate container with its own Docker image
- Routes through Caddy at `oversighthub.com`

**Redesign scope:**
1. **Design uplift** — The existing Linear/Vercel-inspired style can be pushed further with more dramatic typography (larger display faces), bolder gradients, animated geometric backgrounds, and interactive 3D elements
2. **Component architecture** — Extract reusable page sections as a component library within marketing (HeroSection, FeatureGrid, PricingTable, TestimonialCarousel, CTASection)
3. **Animation system** — Currently uses `motion` (Framer Motion v12). Expand with scroll-triggered animations, parallax effects, and micro-interactions
4. **Performance** — SSG at build, ISR for blog. Add image optimization, CDN caching, and lazy-loading for heavy sections
5. **Content structure** — Add case studies section, comparison pages, documentation hub

### Design System Integration

The marketing site already imports from `@repo/design`. The v3.0 redesign should:

1. **Expand `@repo/design`** — Add marketing-specific tokens (hero gradients, animation presets, section spacing) to the existing package rather than inlining them in the marketing app
2. **Component sharing** — The `@repo/ui` package currently has only 3 components (button, card, code). The marketing site has its own components. Consider promoting shared marketing components (HeroSection, FeatureGrid, etc.) to `@repo/ui` if they could be useful for Dashboard landing pages
3. **Tailwind preset** — Already shared. The redesign should add new utility classes for the aesthetic (e.g., `hero-gradient`, `glass-effect`, `text-gradient`)

### Recommendations

| Aspect | Current | v3.0 Target |
|--------|---------|-------------|
| **Typography** | System sans-serif | Variable font (Inter or Satoshi) with aggressive size scale |
| **Hero section** | Static gradient bg | Animated 3D mesh/grid with particle effects, scroll-triggered reveals |
| **Feature sections** | Card grid | Alternating layout with interactive device mockups and animated statistics |
| **Pricing** | Simple table | Toggle annual/monthly, animated comparison, feature highlight on hover |
| **Testimonials** | Static quotes | Carousel with logos, video testimonials, social proof counters |
| **Animations** | Basic `motion` fade-in | Staggered reveal chains, parallax scroll, hover 3D transforms |
| **Navigation** | Top bar | Sticky glass-effect nav with scroll-aware transparency, hamburger on mobile |
| **Footer** | Simple links | Full site map with newsletter signup, social links, trust badges |
| **CTAs** | Basic buttons | Floating action pill, animated arrow on hover, gradient borders |
| **Blog** | MDX with velite | Add category filtering, estimated read time, author bios, related posts |
| **Case studies** | None | New section with template for customer success stories |

### Components to Build/Modify

| Component | Type | Responsibility |
|-----------|------|----------------|
| `HeroSection` | NEW | Animated hero with mesh gradient, device mockup, dual CTAs |
| `FeatureGrid` | MODIFY | Alternating layout, interactive demos, staggered reveals |
| `PricingTable` | MODIFY | Annual/monthly toggle, animated comparison, feature tooltips |
| `TestimonialCarousel` | NEW | Logo wall + quote carousel with auto-advance |
| `CTASection` | MODIFY | Gradient background, animated arrow, trust badges |
| `NavBar` | MODIFY | Glass effect, scroll-aware, mobile hamburger, dropdowns |
| `Footer` | MODIFY | Mega footer with columns, newsletter, social proof |
| `StatsCounter` | NEW | Animated number counters (e.g., "10K+ cameras monitored") |
| `ComparisonTable` | NEW | Side-by-side vs competitors with highlights |
| `DeviceMockup` | NEW | Interactive dashboard/mobile mockup that responds to scroll |

---

## Build Order Recommendation

### Phase Dependency Graph

```
Phase 8 (Feature Deepening) — already planned, provides foundation
  │
  ├── Prerequisites for hardware (already exist):
  │   ├── Door module + state machine            ✅ DONE
  │   ├── Access module + credential management   ✅ DONE
  │   ├── Camera module                           ✅ DONE
  │   ├── Visitor module                          ✅ DONE
  │   ├── MQTT infrastructure                     ✅ DONE
  │   ├── ProtocolAdapter interface               ✅ DONE
  │   ├── WiegandAdapter                          ✅ DONE
  │   ├── EquipmentMonitoring                     ✅ DONE
  │   └── Supervision (edge heartbeats)           ✅ DONE
  │
  ├── Phase 8.1: Edge Agent Enhancement
  │   ├── HardwareCommunicationManager
  │   ├── Serial port manager
  │   ├── MQTT command subscriptions
  │   ├── Hardware config (edge.config.json)
  │   └── Edge API extensions
  │       │
  │       │ Required by:
  │       ▼
  ├── Phase 8.2: OSDP Door Controllers
  │   ├── OSDP frame/protocol/serial (Python)
  │   ├── OSDPAdapter (NestJS)
  │   ├── DoorService command methods
  │   ├── Bi-directional MQTT commands
  │   ├── OSDP discovery
  │   └── Prisma: Door controller model extensions
  │       │
  │       │ Can parallel with:
  │       ▼
  ├── Phase 8.3: ONVIF Camera Discovery
  │   ├── ONVIF WS-Discovery (Python)
  │   ├── ONVIF device probing (Python)
  │   ├── OnvifDiscoveryProcessor (NestJS)
  │   ├── Camera model extensions
  │   ├── Dashboard discovery UI
  │   └── go2rtc auto-configuration
  │
  ├── Phase 8.4: Visitor Kiosk
  │   ├── Kiosk container + Dockerfile
  │   ├── Kiosk SPA (React)
  │   ├── Kiosk API sidecar (Express + CUPS)
  │   ├── Badge template system
  │   ├── VisitorService kiosk methods
  │   ├── Offline queue
  │   └── Caddy routing
  │       │
  │       │ Can parallel with:
  │       ▼
  ├── Phase 8.5: Smart Lock Integration
  │   ├── Zigbee2MQTT/Z-Wave JS bridge config
  │   ├── SmartLockAdapter (NestJS)
  │   ├── DoorService smart lock methods
  │   └── Dashboard door control UI
  │
  └── Phase 8.6: Marketing Redesign (can parallel with 8.1-8.5)
      ├── Design token expansion (@repo/design)
      ├── Component library extraction
      ├── Animation system upgrade
      ├── Case studies section
      └── Performance optimization
```

### Suggested Sequencing

| Order | Phase | Effort | Dependencies | Deliverable |
|-------|-------|--------|-------------|-------------|
| **1** | **8.1 Edge Agent Enhancement** | Medium | None (existing agent) | Edge Agent with hardware communication, MQTT command support, serial port management, hardware status reporting |
| **2** | **8.2 OSDP Door Controllers** | Large | Phase 8.1 | Bidirectional door control (lock/unlock/lockdown), OSDP protocol support, desync detection, command acknowledgment |
| **3** | **8.3 ONVIF Camera Discovery** | Medium | Phase 8.1 | "Discover Cameras" button in Dashboard, auto-configuration, stream URL population, credential management |
| **4** | **8.4 Visitor Kiosk** | Large | Phase 8.2 (door control for kiosk badge access) | Kiosk container, QR check-in, badge printing, self-registration, offline support |
| **5** | **8.5 Smart Lock Integration** | Small | Phase 8.2 (extends DoorService commands) | Smart lock bridge (Zigbee2MQTT/Z-Wave JS), Dashboard lock/unlock UI |
| **6** | **8.6 Marketing Redesign** | Medium | None (purely frontend) | Redesigned marketing site with animations, case studies, upgraded components |

### Phase Ordering Rationale

1. **8.1 first** because every hardware feature depends on the Edge Agent being able to communicate bidirectionally with the API over MQTT. Without the `HardwareCommunicationManager` and MQTT command subscriptions, OSDP, ONVIF, and kiosk have no transport path.

2. **8.2 before 8.4** because the kiosk benefits from door control (after badge printing, the kiosk needs to unlock the entrance door). This dependency is optional — kiosk can work without it — but the user experience is better with door control.

3. **8.3 can parallel with 8.2** if the team has capacity for two streams. Both depend on 8.1 but have no cross-dependency.

4. **8.4 is the most complex** because it introduces a whole new application (kiosk container), CUPS integration, offline mode, and badge templating. It should follow OSDP so kiosk can integrate with door control.

5. **8.5 is smallest** in terms of new code — it mainly bridges existing smart lock MQTT traffic into the existing DoorService.

6. **8.6 is fully independent** and can run in parallel with any hardware phase. It's purely frontend/content work on the marketing site.

### Research Flags for Phases

| Phase | Flag | Reason |
|-------|------|--------|
| 8.1 | 🔴 Deeper research | Need to audit MQTT concurrency patterns in Python (asyncio vs threading for serial I/O). Python's GIL complicates simultaneous serial + MQTT + HTTP operations. May need `asyncio` rewrite of Edge Agent. |
| 8.2 | 🟢 Standard patterns | OSDP is a well-documented standard (IEC 60839-5). The `ProtocolAdapter` pattern already exists for Wiegand. OSDP frame parsing is byte-level, well-understood. |
| 8.3 | 🟡 Moderate research | ONVIF WS-Discovery SOAP messages are XML-heavy but well-documented. Need to test multicast on typical Docker host networks. Some cameras may not respond to probe (vendor-specific). |
| 8.4 | 🔴 Deeper research | Offline sync strategy, conflict resolution, and printer driver compatibility need prototyping. Broken badge printers are a common kiosk failure mode — need robust error handling. |
| 8.5 | 🟢 Standard patterns | Zigbee2MQTT and Z-Wave JS are mature bridges with MQTT output. Integration is "wire up topics to ProtocolAdapter". |
| 8.6 | 🟢 Standard patterns | Frontend redesign with existing tools. Linear/Vercel aesthetic is well-documented (see `high-end-visual-design` skill). Performance optimization is standard Next.js practice. |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Hardware abstraction placement (Edge Agent + API split) | HIGH | Verified against existing MqttService, ProtocolAdapter, Edge Agent architecture. Codebase confirms the split is viable. |
| OSDP communication pattern | HIGH | OSDP is an open standard. MQTT command model extends existing pattern. Serial port management in Python is mature. |
| ONVIF discovery flow | MEDIUM | WS-Discovery behavior depends on network configuration (Docker bridge networks may block multicast). Need to test on target deployment topology. onvif-zeep Python library quality is moderate. |
| Kiosk deployment model | MEDIUM | Standalone container with USB passthrough is standard Docker practice. CUPS in container is well-documented but printer driver compatibility needs validation per printer model. |
| Marketing redesign approach | HIGH | Evolve existing site with expanded design tokens. Standard frontend work with well-understood tools. |
| Smart lock integration | HIGH | Zigbee2MQTT and Z-Wave JS are mature. MQTT → ProtocolAdapter mapping is straightforward. |

## Sources

### HIGH Confidence
- Existing codebase: `MqttService`, `ProtocolAdapter`, `WiegandAdapter`, `DoorService`, `AccessService`, `EquipmentService`, `VisitorService`, `SupervisionService` — all verified in `/home/devuser/projects/oversight-hub/apps/api/src/`
- Existing docker-compose: Mosquitto MQTT broker already deployed at `docker-compose.yml` line 109-118
- Existing Edge Agent: `agent.py` (478 lines) verified — uses httpx, schedule, psutil, docker SDK — serial/ONVIF are natural additions
- OSDP Standard: IEC 60839-5-2 (Open Supervised Device Protocol) — RS-485, multi-drop, AES-128 SCB, command/response framing
- ONVIF Core Specification: WS-Discovery (UDP multicast), SOAP/XML device management, RTSP media streaming
- Zigbee2MQTT: Mature bridge (6K+ GitHub stars) — publishes device events to MQTT, subscribes to command topics
- Z-Wave JS: Official Z-Wave Alliance reference implementation — MQTT gateway via zwave-js-server

### MEDIUM Confidence
- ONVIF WS-Discovery behavior in Docker: WS-Discovery uses UDP multicast (239.255.255.250:3702). Docker bridge networks by default block multicast between containers. The Edge Agent must use `network_mode: host` or connect to the host network interface for discovery to work. This is a deployment constraint documented in Docker networking docs.
- `onvif-zeep` Python library: Community-maintained ONVIF SOAP client. Quality is moderate (some cameras may require custom SOAP headers). The WS-Discovery implementation is custom (not onvif-zeep) using raw UDP sockets.
- CUPS in Docker: Well-documented pattern but printer driver compatibility varies. Zebra ZD621 (common badge printer) has good Linux/CUPS support. Other models need verification.

### LOW Confidence
- OSDP controller compatibility: While OSDP is a standard, different manufacturers (HID, Lenel, Mercury, ICT) implement varying subsets. The Edge Agent should implement baseline OSDP (Poll, LED, COmmand, Auth) and log unsupported commands. Per-manufacturer quirks may need field testing.
- Kiosk printer compatibility: Specific models need validation. The approach abstracts printer via CUPS IPP — any IPP-compatible printer should work. Budget printers may lack IPP support and require vendor-specific drivers.

---

## Gaps to Address

1. **Edge Agent concurrency model**: The current Edge Agent is synchronous single-threaded (schedule library + time.sleep). Adding serial I/O, ONVIF discovery, and MQTT subscriptions requires async I/O. The agent may need rewriting with `asyncio` (`paho-mqtt` async, `aiohttp` for heartbeats, `pyserial-asyncio` for serial ports). This is a significant refactor.

2. **ONVIF credential management**: Storing ONVIF passwords (which may be different from the OSDP/site credentials) and passing them securely to the Edge Agent for discovery needs a secure enclave pattern. The current config stores credentials in edge.config.json in plaintext — insufficient for production.

3. **Kiosk container management**: The kiosk needs privileged access for USB devices (`--device` flags), which is a Docker security concern. CUPS runs as root. Need to audit container security posture before production deployment.

4. **Offline sync conflict resolution**: The kiosk's offline mode needs a concrete conflict resolution strategy. What happens when two kiosks check in the same pre-registered visitor? What happens when the visit expires while the kiosk is offline? Need detailed state machine for offline operations.

5. **MQTT topic namespace audit**: The current MQTT topics use a flat namespace (`site/{orgId}/door/{doorId}/state`). v3.0 adds commands, discovery, ack topics, and possibly device-specific subtopics. Need a complete topic namespace specification document before implementation.

6. **Edge Agent update mechanism**: Currently the Edge Agent checks for container image updates but doesn't auto-update. If we're adding hardware communication (serial, USB), an agent update could disrupt active hardware sessions. Need a graceful restart mechanism that drains active hardware sessions before restarting.

---

*Architecture research for: Oversight Hub v3.0 Production Readiness & Hardware Integration*
*Researched: 2026-07-17*
*Ready for roadmap: yes*
