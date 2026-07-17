# Requirements: Oversight Hub v3.0

**Defined:** 2026-07-17
**Core Value:** Correlate every physical security event with video evidence and AI analysis in real time, so security operators know what happened, where, and what to do — without switching between disconnected systems.

## v1.0 & v2.0 Shipped

v1.0 delivered the technical foundation (3 phases). v2.0 delivered the commercial SaaS platform (7 phases). All requirements from those milestones are shipped and validated.

- Access Control (ACC-01 to ACC-07), Door Management (DOOR-01 to DOOR-06), Video Event Correlation (VEC-01 to VEC-05), Tailgating detection (AI-04), Audit logs (AUDT-01 to AUDT-03), Camera management, AI frame analysis, Auth/RBAC, Notifications, Edge agent, Multi-site
- Commercial Foundation (FND-01 to FND-07), Billing/Licensing (BIL-01 to BIL-08, LIC-01 to LIC-07), Premium UI/UX (UIX-01 to UIX-07), Public Website (WEB-01 to WEB-08), Deep Feature Rebuild (FTR-01 to FTR-11), Enterprise Features (ENT-01 to ENT-09)

## v3.0 Requirements

Requirements for production readiness, hardware integration, and marketing transformation.

### Hardware Integration (HWR)

- [ ] **HWR-01**: Edge Agent supports bidirectional hardware communication — OSDP serial I/O, MQTT publish/subscribe, concurrent protocol handling
- [ ] **HWR-02**: OSDP door controllers send real-time events (badge read, door state change) and accept commands (lock, unlock, zone set) via Edge Agent → MQTT → NestJS
- [ ] **HWR-03**: ONVIF camera auto-discovery detects cameras on the local LAN and auto-configures RTSP streams, PTZ capabilities, and event subscriptions
- [ ] **HWR-04**: MQTT infrastructure secured with authentication and TLS for production hardware traffic
- [ ] **HWR-05**: Docker networking configured for hardware protocol access (host mode or macvlan for multicast/serial)

### Visitor Kiosk (KIO)

- [x] **KIO-01**: Self-check-in/out touchscreen interface for visitors at lobby or reception
- [x] **KIO-02**: Badge printing at check-in (ESC/POS thermal or ZPL label printers)
- [x] **KIO-03**: QR code scanning for autonomous visitor check-in and check-out
- [x] **KIO-04**: Kiosk deploys as standalone Docker container with CUPS printing and web browser

### Marketing Site Redesign (MKT)

- [ ] **MKT-01**: Marketing site redesigned with modern Linear/Vercel-style aesthetic — premium dark theme, fluid animations, glassmorphism accents
- [ ] **MKT-02**: Content enriched with detailed product pages, industry solutions, case studies, and technical documentation
- [ ] **MKT-03**: All 6 languages fully translated and consistent (French primary, English, Spanish, German, Japanese, Arabic) — no missing or machine-translated content
- [ ] **MKT-04**: Interactive product demo or feature tour showcasing the platform's capabilities

### Bug Fixing & Polish (POL)

- [x] **POL-01**: All known bugs across API, Dashboard, and Mobile fixed — no unresolved production issues
- [ ] **POL-02**: Cross-platform consistency — zero visual or functional regressions between Dashboard and Mobile
- [ ] **POL-03**: Mobile app stability and performance — smooth navigation, no crashes, optimized rendering
- [x] **POL-04**: Translation gaps and inconsistencies resolved across all apps

### Infrastructure (INF)

- [ ] **INF-01**: Edge Agent rewritten with async I/O support for concurrent serial, MQTT, and HTTP operations
- [ ] **INF-02**: Mosquitto MQTT production security configuration with authentication and TLS
- [ ] **INF-03**: Docker networking supports multicast (ONVIF WS-Discovery) and serial device passthrough (OSDP)

## v3.1 Requirements (Deferred)

- **MKT-05**: Live demo environment — a full sandbox for prospects to try the platform
- **MKT-06**: Documentation section with API docs, admin guides, installation manuals
- **HWR-06**: Smart lock integration (Zigbee2MQTT bridge)
- **HWR-07**: Controller auto-discovery and remote firmware updates
- **KIO-05**: NFC card encoding at kiosk
- **POL-05**: Performance benchmarks and load testing suite

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom hardware manufacturing | Software platform only; integrate via standard protocols (OSDP, Wiegand, ONVIF) |
| Cloud-hosted video storage | Self-hosted is the differentiator; cloud storage requires massive infrastructure |
| SOC-as-a-service (human monitoring) | Operational business, not software; integrate via webhooks |
| Facial recognition for surveillance | Regulatory risk (GDPR/BIPA); face unlock for access control only |
| Third-party integrations marketplace | Defers to v3.1+; v3.0 focuses on hardware stability and marketing |
| Mobile SDK for third-party apps | Defers to v3.1+ |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HWR-01 | Phase 2 | Pending |
| HWR-02 | Phase 2 | Pending |
| HWR-03 | Phase 2 | Pending |
| HWR-04 | Phase 2 | Pending |
| HWR-05 | Phase 2 | Pending |
| KIO-01 | Phase 3 | Complete |
| KIO-02 | Phase 3 | Complete |
| KIO-03 | Phase 3 | Complete |
| KIO-04 | Phase 3 | Complete |
| MKT-01 | Phase 4 | Pending |
| MKT-02 | Phase 4 | Pending |
| MKT-03 | Phase 4 | Pending |
| MKT-04 | Phase 4 | Pending |
| POL-01 | Phase 5 | Complete |
| POL-02 | Phase 5 | Pending |
| POL-03 | Phase 5 | Pending |
| POL-04 | Phase 5 | Complete |
| INF-01 | Phase 1 | Pending |
| INF-02 | Phase 1 | Pending |
| INF-03 | Phase 1 | Pending |

**Coverage:**

- v3.0 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✅

---
*Requirements defined: 2026-07-17*
*Last updated: 2026-07-17 after v3.0 milestone research*
