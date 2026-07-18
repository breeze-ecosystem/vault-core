# Research Summary: Oversight Hub v3.0 — Hardware Integration & Production Readiness

**Domain:** Physical security hardware integration (OSDP doors, ONVIF cameras, visitor kiosk, edge agent enhancement)
**Researched:** 2026-07-17
**Overall confidence:** MEDIUM (some implementation details need prototyping)

## Executive Summary

The Oversight Hub codebase already has strong foundations for hardware integration: an MQTT service with protocol adapters (Wiegand), a door state machine, credential management, equipment health monitoring, and an Edge Agent for on-premise deployment. v3.0 extends this to full bidirectional hardware control.

**Three major additions:**

1. **OSDP Door Controllers** — bidirectional control via RS-485 serial. The existing read-only Wiegand integration becomes a full command/response system where the API can lock/unlock doors, manage zones, and detect desynchronization.

2. **ONVIF Camera Auto-Discovery** — WS-Discovery multicast probe from the Edge Agent discovers cameras on the local network, extracts stream URLs and capabilities, and auto-configures them in the platform. Dashboard gets a "Discover Cameras" button.

3. **Visitor Kiosk** — a standalone container with a React SPA, Express sidecar, CUPS for badge printing, and offline queue. Deployed alongside the platform with USB passthrough for badge printers and QR scanners.

**Key architectural decision:** Extend the existing Edge Agent (Python) with a Hardware Communication Layer rather than creating a new service. Protocol intelligence (normalizing manufacturer payloads) stays in the NestJS API via the existing ProtocolAdapter pattern. MQTT remains the transport backbone.

## Key Findings

**Stack:** Python 3.12 Edge Agent extended with `pyserial`, `onvif-zeep`, `cups-api`. NestJS extended with `OSDPAdapter`, `ONVIFAdapter` implementing existing `ProtocolAdapter`. Kiosk is a new standalone container (React SPA + Express sidecar + CUPS).

**Architecture:** Protocol adaptation in API, physical hardware access on Edge Agent, MQTT for transport. The existing MqttService, EventEmitter2, Socket.IO, and BullMQ patterns handle routing, synchronization, and async processing.

**Critical pitfall:** The Edge Agent is currently synchronous single-threaded (schedule library + sleep). Adding serial I/O, ONVIF discovery, and MQTT subscriptions requires async I/O (`asyncio`). This is a significant refactor of the agent's concurrency model.

## Implications for Roadmap

Based on research, the v3.0 hardware additions should be added as sub-phases of existing Phase 8 (Feature Deepening):

1. **Phase 8.1: Edge Agent Enhancement** (prerequisite for all hardware)
   - HardwareCommunicationManager, serial port manager, MQTT command subscriptions
   - Avoids: Edge Agent concurrency bottleneck (async rewrite needed)

2. **Phase 8.2: OSDP Door Controllers** (relies on 8.1)
   - OSDP protocol implementation, bidirectional MQTT commands
   - Addresses: bidirectional door control, desync detection, zone management

3. **Phase 8.3: ONVIF Camera Discovery** (relies on 8.1, parallel with 8.2)
   - WS-Discovery probe, device probing, auto-configuration
   - Addresses: camera onboarding friction

4. **Phase 8.4: Visitor Kiosk** (relies on 8.2 for optional door control integration)
   - New container, React SPA, CUPS, offline queue
   - Addresses: visitor badge printing, self-check-in

5. **Phase 8.5: Smart Lock Integration** (relies on 8.2 extension)
   - Zigbee2MQTT bridge, SmartLockAdapter
   - Addresses: wireless lock support

6. **Phase 8.6: Marketing Redesign** (independent of hardware — can start anytime)
   - Design token expansion, animation upgrade, case studies
   - Addresses: brand polish, conversion optimization

**Phase ordering rationale:**
- 8.1 must come first — all hardware depends on the Edge Agent being able to communicate bidirectionally
- 8.2 before 8.4 for door control integration at kiosk (optional but improves UX)
- 8.3 parallel with 8.2 (no cross-dependency)
- 8.6 fully independent (frontend-only)

## Research Flags for Phases

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|----------------|------------|
| 8.1 | Edge Agent async rewrite | Synchronicity breaks serial I/O + MQTT | Rewrite with `asyncio` (paho-mqtt async, pyserial-asyncio, aiohttp) |
| 8.2 | OSDP manufacturer quirks | Different OSDP implementations | Implement baseline spec first, test with HID + Mercury + Lenel |
| 8.3 | ONVIF in Docker | WS-Discovery multicast blocked by Docker bridge | Edge Agent needs `network_mode: host` for discovery |
| 8.4 | Printer driver compat | Unsupported badge printers | Use CUPS IPP (standard) + test with Zebra ZD621 first |
| 8.5 | Smart lock MQTT topic variance | Different topics per protocol | Create topic mapping config in edge.config.json |
| 8.6 | Animation performance on mobile | Heavy animations degrade mobile experience | Test on low-end devices, use `prefers-reduced-motion` |

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommended tools are mature and documented. Python for hardware, TypeScript for API. |
| Features | HIGH | Feature set is well-defined by domain requirements. Table stakes understood. |
| Architecture | HIGH | Verified against existing codebase patterns (MqttService, ProtocolAdapter, EventEmitter). |
| Pitfalls | MEDIUM | Edge Agent async rewrite is flagged as HIGH risk. Kiosk printer compatibility needs prototyping. |

## Gaps to Address

1. **Edge Agent async rewrite** — the most impactful unknown. Need to prototype before committing to the full phase plan.
2. **ONVIF multicast in Docker** — must test on target deployment network before implementation.
3. **Kiosk printer compatibility matrix** — gather customer printer models early to validate CUPS support.
4. **MQTT topic namespace** — needs standardization document before implementation to avoid fragmentation.
5. **OSDP secure channel (SCB)** — AES-128 key management and distribution pattern needs security review.
