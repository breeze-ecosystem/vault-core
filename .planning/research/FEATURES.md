# Feature Landscape: Physical Security Intelligence Platform

**Domain:** Physical security — access control, video, incidents, analytics
**Researched:** 2026-07-14

## Table Stakes

Features users expect from a physical security platform. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Access event journal (badge reads, door unlocks) with video correlation | Every commercial ACS logs events; video correlation is the differentiator but event logging is table stakes | Medium | TimescaleDB hypertable on `access_events`. MQTT ingestion from door controllers. |
| Door state monitoring (locked, unlocked, held-open, forced-open, unsecured) | OSHA/fire code in many jurisdictions require door monitoring. Every VMS platform shows door status. | Low | MQTT state topics → state machine in NestJS service → TimescaleDB hypertable. Alert on illegal transitions. |
| Basic access rules (who can enter which zone, when) | Every ACS has this. Underpins all other access control features. | Medium | Zone-based RBAC extending existing JWT role system. Time-of-day rules stored in PostgreSQL. |
| Incident creation and tracking (triage, assignment, status, closure) | Security operations require incident management. Even basic platforms have some form. | Medium | BullMQ queues for SLA timers and escalations. TimescaleDB for incident timeline. |
| Audit log with user attribution | Compliance requirement (SOC 2, ISO 27001). Every security product has audit trails. | Low | pgcrypto hash-chained audit entries on all mutation operations. |
| Visitor check-in / check-out | Expected in any access control system. | Medium | QR/TOTP credential generation. Mobile check-in via camera scan. |
| License plate allowlist/blocklist | Standard ANPR feature. Expected if ANPR is offered. | Low | PostgreSQL table with plate patterns. Checked on each ANPR result. |

## Differentiators

Features that set Oversight Hub apart from commodity ACS/VMS platforms.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-powered video + access event correlation | "Show me the video of every person who entered Zone 3 between 2-4 PM" — natural language query that returns video clips linked to access events | High | pgvector embeddings on event descriptions + text queries. Ollama embedding model. Video timestamps linked to access events. |
| AI incident summaries | Auto-generated narrative: "At 14:32, badge 4421 (John Smith) entered Server Room with held-open door (17 seconds). Zone risk elevated to Medium. Recommend reviewing DVR 14:30-14:35." | High | Ollama chat model with structured prompt. Combines access event, door state, camera metadata. |
| Tailgating/piggybacking detection via AI | Use existing camera AI pipeline to detect multiple people entering on single badge read | High | Extends existing Ollama vision model analysis. Correlate person count from video frame with access event count. |
| Per-zone dynamic risk scoring | Real-time risk score per zone based on recent events: forced doors, after-hours access, unusual patterns, incident density | High | TimescaleDB continuous aggregates feeding scoring algorithm. ECharts heatmap visualization. |
| Recurring situation detection | "That door has been held open 3x this week at the same time — probably a misconfigured schedule, not a break-in" | High | pgvector similarity search on event patterns. Compare time-of-day, zone, event type across time windows. |
| Natural language event search | "Who accessed the data center last weekend?" — returns access events, video clips, and incident context | High | pgvector + Ollama embeddings with hybrid search (vector + structured filters). |
| AI security assistant | Conversational interface for security operators: "Is the building secure right now?" → scans door states, recent alerts, zone risks | High | Ollama chat + tool calling to query database state. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Custom-trained ANPR model | Requires millions of labeled images per region. 6-12 month development timeline to reach 90% accuracy. Plate Recognizer SDK at 95%+ today. | Integrate Plate Recognizer SDK; focus development effort on the allowlist/blocklist and correlation logic. |
| Facial recognition for surveillance identification | Explicitly out of scope per PROJECT.md. Legal/compliance minefield in many jurisdictions. | Use existing object detection for person counting; avoid biometric identification in surveillance context. |
| Real-time video streaming with WebRTC for mobile | Extremely complex to implement reliably. Mobile bandwidth varies wildly. Latency tuning is a full-time engineering effort. | Use snapshot + clip delivery pattern. Guards need evidence, not continuous streams. Existing WebRTC for dashboard only. |
| AI auto-lockdown (automatic door lock on threat detection) | Life-safety liability. False positives could trap people in dangerous situations. Requires fire marshall approval in most jurisdictions. | AI suggests actions to human operator; operator confirms. "Human in the loop" for all physical access decisions. |
| Offline mobile mode with local database sync | Conflict resolution for access control changes is extremely complex. Adds significant architectural complexity for edge case. | Mobile app is online-only for access control operations. Video clip download for offline review is acceptable. |

## Feature Dependencies

```
Access Event Pipeline → Door Management → Tailgating Detection
Access Event Pipeline → Incident Management → Incident Summaries
Access Event Pipeline → Visitor Management → Mobile Credential Check-in
Access Rules → Anti-passback → Zone Risk Scoring
ANPR Pipeline → Vehicle Allowlist/Blocklist → Access Event Generation
Audit Log → Compliance Reports → Retention Policies
All Events → Event Embeddings (pgvector) → AI Assistant / Semantic Search
All Events → TimescaleDB Aggregates → Analytics Dashboards
```

## MVP Recommendation

Prioritize these features as the minimum viable unified security platform:

1. **Access event pipeline + video correlation** (table stakes — foundational for everything)
2. **Door state monitoring + alerts** (table stakes — security operators need door awareness)
3. **Basic incident management** (table stakes — must have response workflow)
4. **AI event summaries** (differentiator — highest perceived value for lowest relative complexity)
5. **Audit log with hash-chain immutability** (table stakes — required for compliance)

Defer:
- **ANPR/LPR:** Requires Plate Recognizer SDK license. Separate value stream. Phase 3.
- **Visitor management:** Depends on stable access control. Phase 3.
- **Full analytics dashboards:** Requires data accumulation from prior phases. Phase 4.
- **AI assistant / natural language search:** Needs pgvector + embeddings pipeline built first. Phase 4.

## Sources

- Competitor analysis: Verkada Command, Genetec Security Center, Suprema CoreStation, Eagle Eye Cloud VMS — all offer access+video unification, incident management, audit trails
- Market research: Physical security convergence trend (access control + video + analytics) confirmed by Genetec State of Physical Security reports, IFSEC Global, Security Industry Association
- Regulatory: SOC 2, ISO 27001, GDPR require immutable audit logs and data retention policies. OSHA/fire code require door monitoring in many commercial buildings.
