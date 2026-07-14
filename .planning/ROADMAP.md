# Roadmap: Oversight Hub

## Overview

Oversight Hub evolves from a video surveillance platform into a unified physical security intelligence system across three phases. Phase 1 establishes the access control foundation — credential management, door state monitoring, and video-event correlation — built on a new MQTT ingestion pipeline with TimescaleDB-backed audit infrastructure. Phase 2 layers operational AI — incident management, visitor processing, ANPR, natural language search, AI summaries, equipment health, and data governance. Phase 3 delivers the intelligence layer — security analytics, dynamic risk scoring, recurring pattern detection, predictive equipment health, multi-site compliance, and automated maintenance workflows.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Unified Security** - Access control, door management, video-event correlation timeline, alerts, and audit infrastructure
- [ ] **Phase 2: Operational AI** - Incident management, visitor management, ANPR, AI search/summaries, equipment health, data governance
- [ ] **Phase 3: Intelligent Platform** - Security analytics, risk scoring, recurring detection, predictive health, multi-site compliance, workflows

## Phase Details

### Phase 1: Unified Security
**Goal**: Security operators can manage access credentials, monitor door states in real time, correlate every access event with video evidence, and verify platform integrity through immutable audit trails
**Mode**: mvp
**Depends on**: Nothing (first phase — builds on existing video ingestion, camera management, AI frame analysis, JWT auth, multi-site, and notification infrastructure)
**Requirements**: ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, ACC-06, ACC-07, DOOR-01, DOOR-02, DOOR-03, DOOR-04, DOOR-05, DOOR-06, VEC-01, VEC-02, VEC-03, VEC-04, VEC-05, AUDT-01, AUDT-02, AUDT-03, AI-04
**Success Criteria** (what must be TRUE):
  1. Admin can create and manage credentials (badges, PIN, mobile, QR) with zone-based access rules, time schedules, and anti-passback enforcement
  2. Operator views real-time door status dashboard showing all door states (locked, unlocked, held open, forced, unsecured, desynchronized) and can trigger emergency unlock or lockdown per zone
  3. System generates alerts when doors are held open, forced, unsecured, desynchronized, or tailgating is detected beyond configurable thresholds
  4. Operator can click any access event in the unified timeline and immediately view the associated video clip, with search by time, credential, user, door, or zone
   5. Auditor can verify hash-chained audit log integrity with fine-grained role enforcement (admin, supervisor, operator, viewer, auditor) and export filtered reports
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Infrastructure Foundation & Credential Management (ACC-01 through ACC-05)
- [x] 01-02-PLAN.md — Door Monitoring & Emergency Response (ACC-06, DOOR-01 through DOOR-06)
- [x] 01-03-PLAN.md — Video-Event Timeline & Tailgating Detection (ACC-07, VEC-01 through VEC-05, AI-04)
- [x] 01-04-PLAN.md — Audit & Compliance (AUDT-01 through AUDT-03)
**UI hint**: yes

### Phase 2: Operational AI
**Goal**: Security teams can manage incidents from triage to closure, process visitors with time-limited credentials, recognize and log vehicles, query events using natural language, receive AI-generated incident summaries, monitor equipment health, and enforce data encryption with configurable retention
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: INC-01, INC-02, INC-03, INC-04, INC-05, INC-06, VIST-01, VIST-02, VIST-03, VIST-04, VIST-05, ANPR-01, ANPR-02, ANPR-03, ANPR-04, ANPR-05, AI-01, AI-02, AI-03, EQPT-01, EQPT-02, EQPT-03, AUDT-04, AUDT-05
**Success Criteria** (what must be TRUE):
  1. Operator can create, triage, assign, and close incidents with full lifecycle tracking, attached evidence (video + access events), and AI-generated summaries including recommended actions
  2. Operator can query the system in natural language (e.g., "show forcings after midnight on Site A") and receive relevant events with video clips
  3. Host can pre-register visitors with time-limited credentials, and security can process check-in/check-out with full activity logging correlated to video
  4. System automatically recognizes vehicle plates in real time, checks against allowlist/blocklist, and generates access events with plate image and confidence score
  5. System monitors camera, reader, and door controller health with alerts for degradation, and all data is encrypted at rest/in transit with configurable retention policies
**Plans**: TBD
**UI hint**: yes

### Phase 3: Intelligent Platform
**Goal**: Security leaders can view analytics dashboards with intrusion and behavior detection, monitor per-zone risk scores, detect recurring patterns, predict equipment failures, enforce multi-site data isolation, and automate maintenance workflows with unified ticket tracking
**Mode**: mvp
**Depends on**: Phase 2
**Requirements**: ANLY-01, ANLY-02, ANLY-03, ANLY-04, ANLY-05, RSK-01, RSK-02, RSK-03, EQPT-04, EQPT-05, AUDT-06, WFL-01, WFL-02, WFL-03
**Success Criteria** (what must be TRUE):
  1. Admin views security analytics dashboard showing intrusion, loitering, unusual absence, and abnormal activity patterns per site with historical trend data
  2. Admin views per-zone risk scores that dynamically adjust based on recent events, denied attempts, open doors, and detected anomalies
  3. System surfaces recurring situations (e.g., repeated false positives, misconfigured readers) with pattern detection and alerting
  4. System predicts equipment degradation before failure, auto-creates maintenance tickets routed to maintenance team, with unified tracking alongside security incidents
  5. Admin views multi-site executive dashboard with risk overview, trend graphs, and site-isolated data scoping for compliance reporting
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Unified Security | 4/4 | Complete | 2026-07-14 |
| 2. Operational AI | 0/0 | Not started | - |
| 3. Intelligent Platform | 0/0 | Not started | - |
