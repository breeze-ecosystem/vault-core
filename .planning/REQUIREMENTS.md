# Requirements: Oversight Hub

**Defined:** 2026-07-14
**Core Value:** Correlate every physical security event with video evidence and AI analysis in real time, so security operators know what happened, where, and what to do — without switching between disconnected systems.

## v1 Requirements

Requirements for the complete physical security intelligence platform, organized by category.

### Access Control (ACC)

- [x] **ACC-01**: Admin can create and manage user credentials (badges, PIN, mobile credentials, QR codes)
- [x] **ACC-02**: Admin can define access levels with time-based schedules per zone
- [x] **ACC-03**: System enforces zone-based access rules (who can enter which zone, when)
- [x] **ACC-04**: System enforces anti-passback rules (prevents reuse of credentials before exit)
- [x] **ACC-05**: User can use mobile credentials (wallet-based, QR) for access at readers
- [x] **ACC-06**: Operator can trigger emergency unlock or lockdown per zone
- [x] **ACC-07**: System correlates every access event (grant/deny) with video clip from nearest camera

### Door Management (DOOR)

- [x] **DOOR-01**: System monitors door state in real time (locked, unlocked, held open, forced, unsecured, desynchronized)
- [x] **DOOR-02**: System generates alert when door is held open beyond configurable threshold
- [x] **DOOR-03**: System generates alert when door is forced open without valid access
- [x] **DOOR-04**: System generates alert when door is unsecured (unlocked outside schedule)
- [x] **DOOR-05**: System detects and alerts on door desynchronization (controller state mismatch)
- [x] **DOOR-06**: Operator can view door status dashboard with all door states per site in real time

### Video Event Correlation (VEC)

- [x] **VEC-01**: System links each access event (badge, denied, alarm) to corresponding video timestamp
- [x] **VEC-02**: Operator can view unified timeline combining access events, door state changes, and video clips
- [x] **VEC-03**: Operator can click any event in the timeline and immediately view associated video clip
- [x] **VEC-04**: System provides real-time event stream with video thumbnails for active monitoring
- [x] **VEC-05**: Operator can search events by time range, credential, user, door, or zone

### Incident Management (INC)

- [ ] **INC-01**: Operator can create incidents manually or auto-triage from alerts
- [ ] **INC-02**: Operator can assign incidents to agents with escalation chains and SLA timers
- [ ] **INC-03**: Operator can attach evidence (video clips, access events, snapshots) to incidents
- [ ] **INC-04**: Operator can add comments and status updates to incidents
- [ ] **INC-05**: System tracks full incident lifecycle: open → triage → investigating → resolved → closed
- [ ] **INC-06**: System generates closure reports with timeline, evidence, and actions taken

### Visitor Management (VIST)

- [ ] **VIST-01**: Host can pre-register visitors with name, contact, host assignment, and visit duration
- [ ] **VIST-02**: Visitor receives QR-code or temporary badge credential valid for visit duration
- [ ] **VIST-03**: Security can process visitor check-in and check-out at reception
- [ ] **VIST-04**: Admin can define zone restrictions for visitors (limited access areas)
- [ ] **VIST-05**: System logs all visitor activity (entry, exit, zone movement) correlated with video

### ANPR / LPR Vehicles (ANPR)

- [ ] **ANPR-01**: System captures and recognizes license plates from camera frames in real time
- [ ] **ANPR-02**: Admin can manage vehicle allowlists (whitelist) and blocklists (blacklist)
- [ ] **ANPR-03**: System generates access event on plate recognition with allow/deny decision
- [ ] **ANPR-04**: System logs vehicle events including plate image, confidence, timestamp, and gate action
- [ ] **ANPR-05**: Operator can search vehicle event history by plate number or time range

### Security Analytics (ANLY)

- [ ] **ANLY-01**: System detects intrusion into defined forbidden zones
- [ ] **ANLY-02**: System detects loitering behavior (extended presence in defined areas)
- [ ] **ANLY-03**: System detects unusual absence (zone expected to be occupied but empty)
- [ ] **ANLY-04**: System detects abnormal activity patterns vs historical baseline per zone
- [ ] **ANLY-05**: Admin can view per-site security metrics dashboard (event counts, incidents, false positives)

### Equipment Health (EQPT)

- [ ] **EQPT-01**: System monitors camera health (online/offline, frame rate drops, latency spikes)
- [ ] **EQPT-02**: System monitors access reader health (online/offline, failed reads, response time)
- [ ] **EQPT-03**: System monitors door controller health (battery level, connection stability, firmware)
- [ ] **EQPT-04**: System alerts on equipment degradation before failure (predictive thresholds)
- [ ] **EQPT-05**: System visualizes camera-to-door association and detects mismatches or gaps

### Audit & Compliance (AUDT)

- [ ] **AUDT-01**: System maintains immutable audit log with cryptographic hash-chain integrity
- [ ] **AUDT-02**: Admin can export audit reports filtered by time, user, event type, or site
- [ ] **AUDT-03**: System enforces fine-grained roles (admin, supervisor, operator, viewer, auditor) across all modules
- [ ] **AUDT-04**: System encrypts data at rest and in transit with configurable key management
- [ ] **AUDT-05**: Admin can configure data retention policies per event type with auto-pruning
- [ ] **AUDT-06**: System supports multi-site isolation (site-level data separation and permission scoping)

### AI Features (AI)

- [ ] **AI-01**: Operator can query system in natural language ("show intrusions after 8pm on Site A")
- [ ] **AI-02**: System auto-generates incident summary with time, location, persons involved, associated video, and recommended action
- [ ] **AI-03**: AI assistant can answer operator questions about building state, recent events, and zone status
- [x] **AI-04**: System detects tailgating/piggybacking (multiple persons entering with single valid access) using existing camera AI pipeline

### Risk & Intelligence (RSK)

- [ ] **RSK-01**: System computes per-zone risk score based on recent events, denied attempts, open doors, and anomalies
- [ ] **RSK-02**: System detects recurring situations (same door false-positiving, reader misconfigured) and surfaces patterns
- [ ] **RSK-03**: Admin can view executive dashboard with multi-site risk overview and trend graphs

### Maintenance Workflows (WFL)

- [ ] **WFL-01**: System auto-creates maintenance ticket when equipment health degrades (door fault, camera offline)
- [ ] **WFL-02**: System routes equipment issues to maintenance team (separate from security alerts)
- [ ] **WFL-03**: Operator can track maintenance ticket status alongside security incidents in unified view

## v2 Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Future Enhancements

- **INT-01**: Third-party integrations (HR systems for auto-provisioning, building management systems, SIEM)
- **INT-02**: Advanced biometric modalities (fingerprint, iris) as primary credential types
- **INT-03**: Mobile SDK for third-party app integration with access control
- **INT-04**: Automated mustering and evacuation workflows

## Out of Scope

| Feature | Reason |
|---------|--------|
| Facial recognition as primary authentication | Biometrics for access control only; surveillance identification is a separate concern with regulatory risks |
| Physical hardware manufacturing (readers, controllers) | Software platform only; integrate with standard protocols (Wiegand, OSDP) |
| OT/SCADA industrial control system integration | Physical security focus; OT integration is a separate product domain |
| Cloud-hosted AI processing | Platform is self-hosted with Ollama; no mandatory cloud dependency for core AI features |
| Real-time cross-site person tracking | Privacy concerns and regulatory complexity; deferred to v2+ |

## Traceability

Which phases cover which requirements.

### Access Control (ACC)

| Requirement | Phase | Status |
|-------------|-------|--------|
| ACC-01: Admin manages credentials (badges, PIN, mobile, QR) | Phase 1 | Pending |
| ACC-02: Admin defines access levels with time-based schedules | Phase 1 | Pending |
| ACC-03: System enforces zone-based access rules | Phase 1 | Pending |
| ACC-04: System enforces anti-passback rules | Phase 1 | Pending |
| ACC-05: User uses mobile credentials at readers | Phase 1 | Pending |
| ACC-06: Operator triggers emergency unlock/lockdown per zone | Phase 1 | Pending |
| ACC-07: System correlates access events with video clips | Phase 1 | Pending |

### Door Management (DOOR)

| Requirement | Phase | Status |
|-------------|-------|--------|
| DOOR-01: System monitors door state in real time | Phase 1 | Pending |
| DOOR-02: System alerts on door held open | Phase 1 | Pending |
| DOOR-03: System alerts on door forced open | Phase 1 | Pending |
| DOOR-04: System alerts on door unsecured | Phase 1 | Pending |
| DOOR-05: System alerts on door desynchronization | Phase 1 | Pending |
| DOOR-06: Operator views door status dashboard | Phase 1 | Pending |

### Video Event Correlation (VEC)

| Requirement | Phase | Status |
|-------------|-------|--------|
| VEC-01: System links access events to video timestamps | Phase 1 | Pending |
| VEC-02: Operator views unified timeline (access + door + video) | Phase 1 | Pending |
| VEC-03: Operator clicks event to view associated video clip | Phase 1 | Pending |
| VEC-04: System provides real-time event stream with thumbnails | Phase 1 | Pending |
| VEC-05: Operator searches events by time, credential, user, door, zone | Phase 1 | Pending |

### Incident Management (INC)

| Requirement | Phase | Status |
|-------------|-------|--------|
| INC-01: Operator creates/auto-triages incidents from alerts | Phase 2 | Pending |
| INC-02: Operator assigns incidents with escalation chains and SLAs | Phase 2 | Pending |
| INC-03: Operator attaches evidence (video, events, snapshots) to incidents | Phase 2 | Pending |
| INC-04: Operator adds comments and status updates to incidents | Phase 2 | Pending |
| INC-05: System tracks full incident lifecycle (open → closed) | Phase 2 | Pending |
| INC-06: System generates closure reports with timeline and evidence | Phase 2 | Pending |

### Visitor Management (VIST)

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIST-01: Host pre-registers visitors with details and duration | Phase 2 | Pending |
| VIST-02: Visitor receives QR-code/temporary badge credential | Phase 2 | Pending |
| VIST-03: Security processes visitor check-in/check-out | Phase 2 | Pending |
| VIST-04: Admin defines zone restrictions for visitors | Phase 2 | Pending |
| VIST-05: System logs visitor activity correlated with video | Phase 2 | Pending |

### ANPR / LPR Vehicles (ANPR)

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANPR-01: System captures and recognizes plates in real time | Phase 2 | Pending |
| ANPR-02: Admin manages vehicle allowlists and blocklists | Phase 2 | Pending |
| ANPR-03: System generates access events on plate recognition | Phase 2 | Pending |
| ANPR-04: System logs vehicle events (plate image, confidence, timestamp) | Phase 2 | Pending |
| ANPR-05: Operator searches vehicle event history | Phase 2 | Pending |

### Security Analytics (ANLY)

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANLY-01: System detects intrusion into forbidden zones | Phase 3 | Pending |
| ANLY-02: System detects loitering behavior | Phase 3 | Pending |
| ANLY-03: System detects unusual absence | Phase 3 | Pending |
| ANLY-04: System detects abnormal activity vs historical baseline | Phase 3 | Pending |
| ANLY-05: Admin views per-site security metrics dashboard | Phase 3 | Pending |

### Equipment Health (EQPT)

| Requirement | Phase | Status |
|-------------|-------|--------|
| EQPT-01: System monitors camera health | Phase 2 | Pending |
| EQPT-02: System monitors access reader health | Phase 2 | Pending |
| EQPT-03: System monitors door controller health | Phase 2 | Pending |
| EQPT-04: System alerts on equipment degradation (predictive) | Phase 3 | Pending |
| EQPT-05: System visualizes camera-to-door associations | Phase 3 | Pending |

### Audit & Compliance (AUDT)

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUDT-01: System maintains immutable audit log with hash-chain | Phase 1 | Pending |
| AUDT-02: Admin can export audit reports with filters | Phase 1 | Pending |
| AUDT-03: System enforces fine-grained roles across modules | Phase 1 | Pending |
| AUDT-04: System encrypts data at rest and in transit | Phase 2 | Pending |
| AUDT-05: Admin configures data retention policies with auto-pruning | Phase 2 | Pending |
| AUDT-06: System supports multi-site isolation | Phase 3 | Pending |

### AI Features (AI)

| Requirement | Phase | Status |
|-------------|-------|--------|
| AI-01: Operator queries system in natural language | Phase 2 | Pending |
| AI-02: System auto-generates incident summaries | Phase 2 | Pending |
| AI-03: AI assistant answers questions about building state | Phase 2 | Pending |
| AI-04: System detects tailgating/piggybacking via AI pipeline | Phase 1 | Pending |

### Risk & Intelligence (RSK)

| Requirement | Phase | Status |
|-------------|-------|--------|
| RSK-01: System computes per-zone risk scores | Phase 3 | Pending |
| RSK-02: System detects recurring situations and surfaces patterns | Phase 3 | Pending |
| RSK-03: Admin views executive dashboard with multi-site risk overview | Phase 3 | Pending |

### Maintenance Workflows (WFL)

| Requirement | Phase | Status |
|-------------|-------|--------|
| WFL-01: System auto-creates maintenance tickets on equipment degradation | Phase 3 | Pending |
| WFL-02: System routes equipment issues to maintenance team | Phase 3 | Pending |
| WFL-03: Operator tracks maintenance tickets alongside incidents | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 60 total
- Mapped to phases: 60
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-14*
*Last updated: 2026-07-14 after initial definition*
