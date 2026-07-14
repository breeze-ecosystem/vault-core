# Requirements: Oversight Hub

**Defined:** 2026-07-14
**Core Value:** Correlate every physical security event with video evidence and AI analysis in real time, so security operators know what happened, where, and what to do — without switching between disconnected systems.

## v1 Requirements

Requirements for the complete physical security intelligence platform, organized by category.

### Access Control (ACC)

- [ ] **ACC-01**: Admin can create and manage user credentials (badges, PIN, mobile credentials, QR codes)
- [ ] **ACC-02**: Admin can define access levels with time-based schedules per zone
- [ ] **ACC-03**: System enforces zone-based access rules (who can enter which zone, when)
- [ ] **ACC-04**: System enforces anti-passback rules (prevents reuse of credentials before exit)
- [ ] **ACC-05**: User can use mobile credentials (wallet-based, QR) for access at readers
- [ ] **ACC-06**: Operator can trigger emergency unlock or lockdown per zone
- [ ] **ACC-07**: System correlates every access event (grant/deny) with video clip from nearest camera

### Door Management (DOOR)

- [ ] **DOOR-01**: System monitors door state in real time (locked, unlocked, held open, forced, unsecured, desynchronized)
- [ ] **DOOR-02**: System generates alert when door is held open beyond configurable threshold
- [ ] **DOOR-03**: System generates alert when door is forced open without valid access
- [ ] **DOOR-04**: System generates alert when door is unsecured (unlocked outside schedule)
- [ ] **DOOR-05**: System detects and alerts on door desynchronization (controller state mismatch)
- [ ] **DOOR-06**: Operator can view door status dashboard with all door states per site in real time

### Video Event Correlation (VEC)

- [ ] **VEC-01**: System links each access event (badge, denied, alarm) to corresponding video timestamp
- [ ] **VEC-02**: Operator can view unified timeline combining access events, door state changes, and video clips
- [ ] **VEC-03**: Operator can click any event in the timeline and immediately view associated video clip
- [ ] **VEC-04**: System provides real-time event stream with video thumbnails for active monitoring
- [ ] **VEC-05**: Operator can search events by time range, credential, user, door, or zone

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
- [ ] **AI-04**: System detects tailgating/piggybacking (multiple persons entering with single valid access) using existing camera AI pipeline

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

Which phases cover which requirements. Filled during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (Pending roadmap) | — | — |

**Coverage:**
- v1 requirements: 48 total
- Mapped to phases: 0
- Unmapped: 48 ⚠️

---
*Requirements defined: 2026-07-14*
*Last updated: 2026-07-14 after initial definition*
