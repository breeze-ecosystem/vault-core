# Feature Landscape: v3.0 Hardware Integration

**Domain:** Physical security hardware — door controllers, cameras, visitor kiosk
**Researched:** 2026-07-17

## Table Stakes

Features that customers expect from a physical security platform. Missing these makes the product feel incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Bidirectional door control** | Wiegand-only is read-only. Operators expect to lock/unlock from dashboard. | High (OSDP protocol, serial, command ack) | Phase 8.2 |
| **Camera auto-discovery** | Manually entering RTSP URLs is unacceptable for deployments with 50+ cameras | Medium (ONVIF WS-Discovery, credential mgmt) | Phase 8.3. Pre-populate URL, username, password fields |
| **Badge printing at kiosk** | Visitor management without badge printing is incomplete — visitor needs physical ID | High (CUPS, templates, printer compatibility) | Phase 8.4 |
| **Offline kiosk operation** | Network blips shouldn't stop check-in during business hours | Medium (local SQLite, sync queue) | Phase 8.4 |
| **Door state synchronization** | Dashboard must show accurate state within 1 second of physical change | Low (already implemented via MQTT + WS) | Existing, enhanced in 8.2 |
| **Controller health monitoring** | Operators need to know if a door controller is offline or low battery | Low (already implemented in EquipmentService) | Existing, enhanced in 8.1 |
| **Zone-based emergency control** | Lockdown an entire zone from a single button | Low (already implemented: lockdownZone, emergencyUnlock) | Existing |
| **Multiple credential types** | Badge, PIN, QR, mobile wallet | Medium (existing support for BADGE, PIN, QR, MOBILE) | Already implemented in AccessService |
| **Audit trail for door events** | Who locked/unlocked what, when, and why | Low (existing AuditModule + door_state_log) | Already implemented |

## Differentiators

Features that set Oversight Hub apart. Not expected but highly valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **OSDP bidirectional control** | Most competitors offer Wiegand-only (unidirectional). OSDP with AES-128 SCB is enterprise-grade. | High | Major differentiator for enterprise sales |
| **One-click camera discovery** | "All cameras found — add all?" vs. manual entry of 50 RTSP URLs | Medium | Reduces deployment time from hours to minutes |
| **QR kiosk with auto door unlock** | Visitor scans QR at kiosk → badge prints → door unlocks automatically | High | Full visitor journey automation |
| **Self-registration kiosk** | Visitor types name, selects host from directory → host approves via mobile → badge prints | High | No front desk staff needed |
| **Smart lock integration (Zigbee/Z-Wave)** | Support for wireless locks (e.g., Yale, Schlage) alongside wired OSDP | Medium | Covers retrofit scenarios where wiring is impractical |
| **Desync detection + auto-recovery** | If door state contradicts last command, system detects and attempts recovery | Medium | Prevents "door shows locked but is actually unlocked" |
| **Predictive OSDP controller failure** | Track signal degradation, response time drift, predict failure before it happens | Medium | Already in EquipmentPredictor for cameras; extend to OSDP |
| **Multi-vendor ONVIF support** | Works with Hikvision, Dahua, Axis, Bosch, Uniview — not locked to one brand | Medium | ONVIF is standard but each vendor has quirks |
| **Badge template designer** | Admin customizes badge layout, colors, logo, fields (no HTML/CSS knowledge needed) | High | Future phase — store templates in DB, render server-side |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Cloud-based door control** | Door unlock must work without internet. Cloud-only control is unacceptable for security. | All door control commands go through local Edge Agent. API is async — command is published and acknowledged locally. |
| **Vendor-specific ONVIF SDKs** | Each vendor SDK has different licensing, APIs, update cycles. Creates maintenance nightmare. | Use standard ONVIF WS-Discovery + SOAP. Handle vendor quirks in ONVIFAdapter normalize() method. |
| **Browser-based badge printing** | Browser print API (window.print) is unreliable, no template control, no printer selection. | CUPS from local sidecar. SPA sends print command to sidecar, sidecar handles spooling. |
| **Mobile push for door unlock** | Unlocking doors from phone introduces tailgating risk and audit trail gaps. | Require PIN/biometric confirmation on mobile. Log every unlock attempt with identity verification. |
| **Kiosk with cash/credit payment** | This is security, not retail. Payment adds PCI compliance scope. | Kiosk is for visitor management only. No payment processing. |
| **Cloud ONVIF proxy** | Routing video through cloud for discovery adds latency and bandwidth cost. | Discovery is local only (Edge Agent on same network). API stores metadata, not video. |
| **Universal OSDP controller** | Not all OSDP implementations are identical. Claiming universal support creates support load. | Support baseline OSDP profile. Document tested controller models. Add adapter variants as needed. |

## Feature Dependencies

```
HardwareCommunicationManager (8.1)
├── OSDP Door Control (8.2)
│   ├── Bidirectional MQTT commands
│   ├── DoorService.lockDoor()
│   ├── DoorService.unlockDoor()
│   ├── DoorService.setLockdown()
│   └── Command acknowledgment tracking
├── ONVIF Camera Discovery (8.3)
│   ├── WS-Discovery probe (Edge)
│   ├── Device probing (Edge)
│   ├── OnvifDiscoveryProcessor (API)
│   └── Camera activation flow
└── Smart Lock Integration (8.5)
    └── Zigbee2MQTT topic mapping

OSDP Door Control (8.2) ──optional──→ Kiosk (8.4)
                                └── Auto door unlock after badge print

Kiosk (8.4)
├── Kiosk SPA (React)
├── Kiosk sidecar (Express + CUPS)
├── Offline queue (SQLite)
├── VisitorService.kioskCheckIn()
└── Badge template system

Marketing Redesign (8.6) — no dependencies
```

## MVP Recommendation

### Phase 8.1 MVP (Edge Agent Enhancement)
1. Async-rewrite Edge Agent with asyncio
2. MQTT command subscription in agent
3. HardwareCommunicationManager skeleton
4. Edge API: hardware status in heartbeat
5. Serial port manager (OSDP-ready)

### Phase 8.2 MVP (OSDP Door Controllers)
1. OSDP frame construction/parsing (Poll, LED, COmmand)
2. `OSDPAdapter` implementing `ProtocolAdapter`
3. `DoorService.lockDoor()` + `unlockDoor()` + `setLockdown()`
4. Command acknowledgment via MQTT
5. Dashboard: lock/unlock button per door

### Phase 8.3 MVP (ONVIF Camera Discovery)
1. WS-Discovery probe from Edge Agent
2. Device metadata extraction (manufacturer, model, RTSP URL)
3. `POST /api/cameras/discover` endpoint
4. `PATCH /api/cameras/:id/activate` — sets stream URL + starts ingestion
5. Dashboard: "Discover Cameras" button + result list

### Phase 8.4 MVP (Visitor Kiosk)
1. Kiosk container with Nginx + Express sidecar
2. QR check-in (visitor shows smartphone QR, camera scans)
3. Badge printing via CUPS (Zebra ZD621)
4. `POST /api/visitors/kiosk/check-in` endpoint
5. Offline check-in queue (SQLite, batch sync)

### Phase 8.5 MVP (Smart Lock Integration)
1. Zigbee2MQTT container in docker-compose
2. Topic mapping configuration
3. SmartLockAdapter implementing ProtocolAdapter
4. Dashboard: smart lock status + lock/unlock

### Phase 8.6 MVP (Marketing Redesign)
1. Hero section animation upgrade
2. Feature section with interactive mockups
3. Testimonial carousel + social proof counters
4. Case study template + 2 sample case studies
5. Blog category filtering + author bios

## Sources

- **HIGH:** Existing codebase: DoorService command capabilities, AccessService credential management, VisitorService flow, EquipmentService health monitoring
- **HIGH:** OSDP Standard IEC 60839-5-2: baseline command set (Poll, LED, COmmand, Auth, BusScan)
- **HIGH:** ONVIF Profile S: Basic device discovery, media streaming, PTZ
- **MEDIUM:** Vendor interviews (HID VertX, Mercury EP/LP series OSDP support)
- **MEDIUM:** Visitor kiosk UX research — typical flow: QR scan → ID validation → badge print → door unlock
