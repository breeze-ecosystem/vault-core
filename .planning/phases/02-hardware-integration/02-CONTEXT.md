# Phase 2: Hardware Integration - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning

<domain>
## Phase Boundary

OSDP door controllers and ONVIF cameras are discovered, controlled, and stream events into the platform. The Edge Agent (rewritten in Phase 1) bridges OSDP serial protocol and ONVIF network discovery to MQTT → NestJS, creating the physical layer connecting real hardware to the software platform.

Requirements: HWR-01, HWR-02, HWR-03, HWR-04, HWR-05 from REQUIREMENTS.md.

</domain>

<decisions>
## Implementation Decisions

### OSDP Security
- **D-01:** Use OSDP Secure Channel (SC) encryption where supported by the controller. Fall back to plain OSDP for older/incompatible hardware. The RS-485 bus is physically secured but SC prevents replay attacks and wiretapping.

### Camera Onboarding (ONVIF Auto-Discovery)
- **D-02:** Fully automatic provisioning — when a camera is discovered via WS-Discovery, it appears with auto-generated name (from ONVIF GetDeviceInformation), RTSP stream configured, and enabled immediately. Zero operator steps to get a camera online.
- **D-03:** Group discovered cameras by site location. Pull location metadata from ONVIF if available; otherwise assign to default site group. Operators can rename and reorganize later.

### Door Control UX (Dashboard)
- **D-04:** Quick-action Lock/Unlock buttons on door cards — one-click toggle with confirmation toast (no modal dialog). Match the existing door state machine (LOCKED, UNLOCKED, HELD_OPEN, FORCED, UNSECURED, DESYNCHRONIZED).
- **D-05:** Zone assignment via inline dropdown on door card. Zone → Door FK already exists in Prisma (`Door.zoneId` → `Zone.id`).

### PTZ Control Design
- **D-06:** PTZ controls as an integrated overlay on the video player — directional pad + zoom slider, auto-hides on inactivity. Presets as a collapsible thumbnail bar below the video.
- **D-07:** Thumbnail-based presets — each saved position stores a camera snapshot so operators see where the camera points before recalling. Requires adding PTZ/preset fields to the Camera model (currently no PTZ fields exist).

### Event Journal Detail
- **D-08:** Rich event details — badge number, door name, controller serial number, ingress/egress direction, tamper status, associated camera clip, controller health snapshot.
- **D-09:** Inline thumbnail for OSDP events — capture and attach snapshot from the nearest associated camera at event time. Prerequisite: CameraDoorMap association (already exists in Prisma).

### Camera ↔ Door Association
- **D-10:** Manual assignment — operator assigns 1-2 cameras per door during setup. Uses existing `CameraDoorMap` join table (already has `cameraId`, `doorId`, `angle`, `priority` fields).

### Command Reliability
- **D-11:** Auto-retry with state feedback — Dashboard shows 'Sending' → 'Sent' → 'Acknowledged' states. On no acknowledgment within 2 seconds, retry once, then show failure with clear error message.

### Bulk Operations
- **D-12:** Bulk Lock/Unlock with confirmation dialog — 'Lock All' / 'Unlock All' buttons per zone or per site. Requires confirmation to prevent accidental mass actions.

### ONVIF Event Subscriptions
- **D-13:** Subscribe to all available ONVIF events — motion detection, tampering, video loss, line crossing, intrusion detection, PTZ preset reached. Operators can filter per-camera later.

### Dashboard Hardware Views
- **D-14:** Controls integrated into existing Dashboard views — door controls in the existing Doors page/module, PTZ in the Camera viewer, hardware status inline. No separate "Hardware" silo.

### Existing Camera Migration (v1.0)
- **D-15:** Replace on discovery — if an auto-discovered camera's ONVIF address matches an existing manual camera, upgrade in-place (preserve name/group, add RTSP URL and PTZ capabilities). If unmatched, add as new.

### PTZ Access Control
- **D-16:** Supervisors and above can control PTZ (pan, tilt, zoom, preset recall). Operators can view camera feeds but not reposition cameras.

### OSDP Controller Enrollment
- **D-17:** Auto-discovery on serial bus — Edge Agent probes connected RS-485 ports for OSDP devices. Found controllers appear in Dashboard as 'Pending' for an admin to name and assign to a site. No manual address configuration needed.

### Event Retention
- **D-18:** 90 days retention for hardware events in the journal. Aligned with standard security audit requirements. Older events archived to cold storage automatically.

### Agent's Discretion
- OSDP library choice (Python `osdp` bindings vs raw pyserial-asyncio frames vs C libosdp wrapper) — agent selects best option during research/planning.
- ONVIF library choice (onvif-zeep, python-onvif-zeep-async) — agent selects during planning.
- MQTT command/response topic schema extending from Phase 1's `site/{siteId}/door/{doorId}/cmd` pattern.
- Edge Agent serial port probing strategy and OSDP address discovery timing.
- PTZ command format and ONVIF PTZ API specifics.
- Camera snapshot capture mechanism for inline thumbnails.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements & Context
- `.planning/ROADMAP.md` — Phase 2 definition, success criteria, dependency on Phase 1
- `.planning/REQUIREMENTS.md` — HWR-01 through HWR-05 requirement descriptions
- `.planning/phases/01-infrastructure-foundation/01-CONTEXT.md` — Phase 1 decisions (MQTT topics, TLS, per-agent credentials, Docker networking, ONVIF discovery approach D-12)

### Codebase Architecture & Integration
- `.planning/codebase/ARCHITECTURE.md` — MQTT hardware communication flow, Edge Agent architecture, existing module structure
- `.planning/codebase/INTEGRATIONS.md` — MQTT broker (Mosquitto), existing integration points
- `.planning/codebase/STACK.md` — Tech stack versions, Python/Node.js runtime constraints

### Existing Implementation (must-read)
- `apps/api/prisma/schema.prisma` — Door model (lines 120-141), Zone model (143-158), Camera model (444-465), CameraDoorMap join table (193-205). **Critical:** Camera model has NO PTZ fields — these must be added.
- `apps/api/src/modules/door/door.controller.ts` — Existing door endpoints (GET states, zone lockdown/emergency, PATCH alert-config). No create/delete endpoints exist yet.
- `apps/api/src/modules/door/door.service.ts` — DoorStateMachine, MQTT-driven state management, Redis-backed state, TimescaleDB door_state_log.
- `apps/api/src/modules/door/door.gateway.ts` — Socket.IO `/ws/doors` namespace, emits state-update and emergency-update events.
- `apps/api/src/modules/door/door.processor.ts` — BullMQ door-alerts queue processor evaluating door alerts with CameraDoorMap lookup.
- `apps/api/src/modules/door/door-state-machine.ts` — 6-state door state machine (LOCKED, UNLOCKED, HELD_OPEN, FORCED, UNSECURED, DESYNCHRONIZED).
- `apps/api/src/modules/camera/camera.controller.ts` — Full CRUD for cameras + prompt sub-resources.
- `apps/api/src/modules/camera/camera.service.ts` — Camera CRUD with license enforcement.
- `apps/api/src/mqtt/mqtt.service.ts` — Existing MqttService, topic patterns, EventEmitter2 routing.
- `edge/agent/` — Edge Agent (Phase 1 rewrite provides async foundation for OSDP/ONVIF)

### Configuration
- `.env.example` — MQTT_BROKER_URL, MQTT_USERNAME, MQTT_PASSWORD, EDGE_AGENT_SECRET

### Shared Package
- `packages/shared/src/schemas/door.schema.ts` — Existing door validation schemas
- `packages/shared/src/schemas/camera.schema.ts` — Existing camera create/update schemas (no PTZ fields yet)
- `packages/shared/src/types/door.types.ts` — DoorStateDto, DoorAlertJob, EmergencyOverrideEvent types
- `packages/shared/src/constants/index.ts` — DOOR_STATES, CAMERA_STATUS constants

No external specs — requirements fully captured in REQUIREMENTS.md and decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **CameraDoorMap join table** (already in Prisma) — Manages camera↔door associations with `angle` and `priority`. Ready to use for inline event snapshots (D-09) and manual assignment (D-10).
- **Door state machine** (door-state-machine.ts) — 6 states with valid transitions. Quick-action buttons (D-04) can toggle these states. Already has alert trigger configuration.
- **Door Gateway** (door.gateway.ts) — Socket.IO namespace `/ws/doors` with state-update events. Real-time door state push already exists for Dashboard.
- **MQTT Service** (mqtt.service.ts) — EventEmitter2 routing for MQTT events. Phase 2 extends this with OSDP events (badge reads, door state changes) and OSDP commands.
- **BullMQ door-alerts queue** (door.processor.ts) — Already processes door events with CameraDoorMap lookup. Extend for OSDP event handling.
- **Camera CRUD** (camera.module.ts) — Full create/read/update/delete with license enforcement. Extend with auto-discovery endpoints.

### Established Patterns
- **Edge Agent → MQTT → NestJS EventEmitter2** — Existing data flow for door events. OSDP protocol follows same pattern: serial → Edge Agent → MQTT → MqttService → EventEmitter2 → Door module.
- **Zone operations via DoorService** — Zone lockdown/emergency-unlock already implemented in DoorService. Zone assignment dropdown (D-05) extends this pattern.
- **Per-site topic hierarchy** — `site/{siteId}/door/{doorId}/state` already established. OSDP commands follow `site/{siteId}/door/{doorId}/cmd` pattern from Phase 1 D-14.

### Integration Points
- **Edge Agent (Phase 1)** — Adds OSDP serial I/O coroutine and ONVIF WS-Discovery probe alongside existing health/heartbeat tasks.
- **MqttService** — New OSDP event topics consumed by MqttService, routed to Door module via EventEmitter2.
- **Door controller** — Extend with OSDP command endpoints (lock/unlock/zone). Door create/delete endpoints needed for controller enrollment (D-17).
- **Camera controller** — Add ONVIF provisioning endpoints (auto-discover, confirm, update PTZ capabilities). Add PTZ-related fields to Camera model.
- **Dashboard Doors page** — Existing doors view + quick-action buttons (D-04) + inline zone dropdown (D-05) + bulk operations (D-12).
- **Dashboard Camera viewer** — Add PTZ overlay (D-06) with thumbnail presets (D-07). PTZ access control gated by role (D-16).
- **Event journal** — Extend existing event journal with rich OSDP/ONVIF event details (D-08) and inline snapshots (D-09). 90-day retention (D-18).

### Creative Opportunities
- Camera PTZ capabilities can be probed during ONVIF auto-discovery (GetCapabilities) and stored as JSON metadata on the Camera model.
- ONVIF event subscription (pull-point or base notification) can feed directly into the existing BullMQ alert pipeline.
- OSDP Secure Channel (D-01) can be negotiated during Edge Agent→controller handshake, with fallback detection handled transparently.
</code_context>

<specifics>
## Specific Ideas

No specific references or "make it like X" moments from discussion — user delegated technical implementation decisions to the agent.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Hardware Integration*
*Context gathered: 2026-07-17*
