# Roadmap: Oversight Hub

## Overview

v3.0 transforms Oversight Hub from a polished SaaS platform into a production-ready physical security system with direct hardware integration. The Edge Agent gains async OSDP protocol handling for door controllers, ONVIF auto-discovery brings cameras online without manual setup, a visitor kiosk enables self-service lobby check-in, the marketing site gets a premium visual redesign with full 6-language translation, and a final bug-fixing pass ensures zero known issues across all apps.

**Milestone goal:** Hardware connecté, bugs zero, marketing premium, kiosk déployé.

## Milestones

- ✅ **v1.0 MVP** — Technical foundation (video ingestion, access control, AI analysis, auth) — shipped
- ✅ **v2.0 Commercial SaaS** — Premium redesign, billing/licensing, multi-tenant, enterprise features — shipped
- 📋 **v3.0 Production Readiness & Hardware Integration** — 5 phases (planned)

## Phases

- [x] **Phase 1: Infrastructure Foundation** — Edge Agent async rewrite, MQTT security, Docker networking for hardware
- [ ] **Phase 2: Hardware Integration** — OSDP door protocol and ONVIF camera auto-discovery
- [x] **Phase 3: Visitor Kiosk** — Self-check-in/out touchscreen with badge printing and QR scanning
- [x] **Phase 4: Marketing Site Redesign** — Premium design, enriched content, 6-language translation, interactive demo (completed 2026-07-17)
- [ ] **Phase 5: Bug Fixing & Cross-Platform Polish** — Zero-bug release with full platform consistency

## Phase Details

### Phase 1: Infrastructure Foundation

**Goal**: Edge Agent rewritten with async I/O for concurrent hardware protocols; MQTT and Docker networking hardened for production hardware traffic
**Depends on**: Nothing (first phase)
**Requirements**: INF-01, INF-02, INF-03
**Success Criteria** (what must be TRUE):

   1. Edge Agent handles concurrent serial (OSDP), MQTT publish/subscribe, and HTTP operations without blocking — no single-protocol hang stalls other functionality
   2. MQTT broker rejects unauthenticated connections; only TLS-authenticated clients with valid credentials can publish or subscribe
   3. Docker containers can reach hardware via serial device passthrough (RS-485/RS-232) and multicast UDP (ONVIF WS-Discovery on 239.255.255.50:3702)
   4. Existing Edge Agent functionality (heartbeat reporting, health monitoring, event forwarding) continues operating correctly after async rewrite

**Plans**: 3 plans

Plans:

- [ ] 01-01-PLAN.md — Mosquitto MQTT security + Docker networking for serial/multicast (INF-02, INF-03)
- [ ] 01-02-PLAN.md — Edge Agent async rewrite with asyncio, aiomqtt, pyserial-asyncio, aiohttp (INF-01)
- [ ] 01-03-PLAN.md — Unit/integration tests + build validation (INF-01, INF-02, INF-03)

### Phase 2: Hardware Integration

**Goal**: Physical security hardware — OSDP door controllers and ONVIF cameras — are discovered, controlled, and stream events into the platform
**Depends on**: Phase 1
**Requirements**: HWR-01, HWR-02, HWR-03, HWR-04, HWR-05
**Success Criteria** (what must be TRUE):

   1. OSDP door controllers (via Edge Agent bridge) report real-time events (badge read, door state change, tamper alert) that appear in the platform event journal within 500ms
   2. Security operator can lock/unlock an OSDP door and change zone assignments from the Dashboard — command reaches the controller within 1 second
   3. ONVIF cameras on the local LAN are auto-discovered via WS-Discovery and auto-provisioned with RTSP streams, PTZ capabilities, and event subscriptions — zero manual IP configuration
   4. PTZ controls (pan, tilt, zoom, preset recall) are available in the Dashboard camera view for ONVIF Profile S/T cameras
   5. All hardware-to-platform communication uses authenticated MQTT with TLS — no unencrypted hardware traffic traverses the network

**Plans**: 5 plans

Plans:

- [ ] 02-01-PLAN.md — Edge Agent OSDP protocol + ONVIF enhancement with site grouping (D-03), replace-on-discovery (D-15), PTZ probing, snapshot capture (HWR-01, HWR-03)
- [ ] 02-02-PLAN.md — Prisma schema (Camera PTZ/ONVIF fields, Controller model, Door FK) + shared package extensions (schemas, types, constants, barrel) + schema push (HWR-01, HWR-02, HWR-03)
- [ ] 02-03-PLAN.md — NestJS backend: MqttService OSDP routing, Controller module, Door API (commands, CameraDoorMap CRUD), PTZ endpoints, TimescaleDB 90-day retention (D-18), Socket.IO events, api.ts (HWR-01, HWR-02, HWR-03)
- [ ] 02-04-PLAN.md — Dashboard door controls (card with auto-retry D-11, zone dropdown), bulk ops, controller enrollment, event enrichment with inline thumbnail (D-09) (HWR-02, HWR-03)
- [ ] 02-05-PLAN.md — Dashboard PTZ overlay controls (directional pad, zoom, presets) (HWR-03)

### Phase 3: Visitor Kiosk

**Goal**: Visitors can autonomously check in and out at a lobby kiosk with badge printing and QR code scanning
**Depends on**: Phase 1
**Requirements**: KIO-01, KIO-02, KIO-03, KIO-04
**Success Criteria** (what must be TRUE):

  1. Visitor approaches kiosk, scans a pre-registered QR code or enters their name, and checks in within 30 seconds — badge prints automatically
  2. Kiosk prints a visitor badge on the connected thermal/ZPL printer upon successful check-in with visitor name, host, timestamp, and photo
  3. Visitor scans their badge QR code at check-out — exit timestamp is recorded, host receives check-out notification
  4. Kiosk deploys as standalone Docker container with CUPS printing bundled — boots directly into fullscreen kiosk mode on startup with no manual intervention

**Plans**: 4/4 plans executed

Plans:

- [x] 03-01-PLAN.md — Kiosk App Scaffold + Docker Infrastructure (KIO-04)
- [x] 03-02-PLAN.md — NestJS Kiosk Backend — Auth + Print Endpoint (KIO-02, KIO-04)
- [x] 03-03-PLAN.md — Kiosk Frontend — Core UI Components (KIO-01, KIO-03)
- [x] 03-04-PLAN.md — Kiosk Frontend — Printing, Success, Check-out, Error Screens (KIO-01, KIO-02, KIO-03)

**UI hint**: yes

### Phase 4: Marketing Site Redesign

**Goal**: Marketing site transformed into a premium visual showcase with complete product content, interactive demo, and full 6-language translation
**Depends on**: Nothing (independent frontend work)
**Requirements**: MKT-01, MKT-02, MKT-03, MKT-04
**Success Criteria** (what must be TRUE):

  1. Landing page and product pages feature fluid scroll animations, glassmorphism accent panels, and a premium dark theme matching Linear/Vercel quality bar
  2. All 6 languages (French primary, English, Spanish, German, Japanese, Arabic) show complete, consistent content — no missing sections, placeholder text, or machine-translation artifacts in any locale
  3. Interactive product demo or feature tour lets prospects explore key platform capabilities (live camera grid, access events, AI alerts) without requiring a login
  4. Site includes detailed product pages (video, access control, AI, analytics), industry solutions pages, and case study templates that tell a coherent product story

**Plans**: 10 plans

Plans:

**Wave 1**

- [x] 04-01-PLAN.md — CSS & Design Token Foundation (Wave 1)
- [x] 04-02-PLAN.md — Shared UI Components (Wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-03-PLAN.md — Navigation & Layout Refresh (Wave 2)
- [x] 04-04-PLAN.md — Landing Section Component Rewrites (Wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04-05-PLAN.md — Homepage Rewrite & Existing Page Refresh (Wave 3)
- [x] 04-06-PLAN.md — i18n Messages & Content Infrastructure (Wave 3)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 04-07-PLAN.md — Products Section (Wave 4)
- [x] 04-08-PLAN.md — Solutions Section (Wave 4)
- [x] 04-09-PLAN.md — Case Studies Section (Wave 4)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 04-10-PLAN.md — Interactive Demo Tour (Wave 5)

**UI hint**: yes

### Phase 5: Bug Fixing & Cross-Platform Polish

**Goal**: All known production bugs eliminated; Dashboard and Mobile deliver a consistent, polished, crash-free experience
**Depends on**: Phase 2, Phase 3, Phase 4
**Requirements**: POL-01, POL-02, POL-03, POL-04
**Success Criteria** (what must be TRUE):

  1. All tracked production bugs across API, Dashboard, and Mobile are fixed and verified — zero unresolved critical or high-severity issues
  2. Every screen in Dashboard has a functionally consistent counterpart in Mobile showing the same data, same states, and same behavior — no visual or functional discrepancies
  3. Mobile app (iOS and Android) navigation is smooth at 60fps with no crashes during standard operator workflows (view cameras, respond to alerts, check door status, manage visitors)
  4. All application UI text and API error messages in French show no untranslated English strings, placeholder text, or inconsistent terminology across Dashboard, Mobile, and API

**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure Foundation | 3/3 | Complete | 2026-07-17 |
| 2. Hardware Integration | 0/5 | Not started | - |
| 3. Visitor Kiosk | 4/4 | Complete | 2026-07-17 |
| 4. Marketing Site Redesign | 10/10 | Complete   | 2026-07-17 |
| 5. Bug Fixing & Cross-Platform Polish | 0/0 | Not started | - |
