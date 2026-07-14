# Project Research Summary

**Project:** Oversight Hub — Physical Security Intelligence Platform
**Domain:** Physical security — unified access control, video surveillance, incident management, and security analytics
**Researched:** 2026-07-14
**Confidence:** HIGH

## Executive Summary

Oversight Hub is a physical security intelligence platform that correlates access control events, video evidence, and AI analysis into a single operational pane of glass. The research confirms that experts in this domain build such platforms by layering time-series ingestion (MQTT), event correlation engines, and AI-assisted analysis on top of a single relational database — not by scattering data across specialized stores. The platform extends an existing NestJS + Next.js + Expo stack with PostgreSQL extensions (TimescaleDB, pgvector, pgcrypto), an MQTT ingestion layer for door controllers, and an on-premise ANPR Docker service.

The recommended approach is **foundation-first**: build the access event pipeline and door state machine first, since every downstream feature (incident management, visitor management, analytics, AI) depends on a reliable, ordered stream of physical access events. The MQTT ingestion layer is the critical path — get door controller communication right, with sequence numbering and state machine validation, before building anything on top. The AI differentiators (incident summaries, semantic search, natural language queries) are built on the same PostgreSQL instance using the existing Ollama deployment, requiring no new infrastructure — just new prompt templates and embedding pipelines.

The key risks are: (1) Prisma migrations silently destroying TimescaleDB hypertable configuration, requiring a strict separation between Prisma-managed reference tables and SQL-managed time-series tables; (2) MQTT message ordering causing false door alerts, mitigated by controller-side sequence numbers and a server-side state machine; and (3) unbounded audit log growth, solved by making the audit log a TimescaleDB hypertable with retention policies from day one. These are all architectural decisions that must be made before Phase 1 execution begins — retrofitting them after data accumulates is a multi-week rewrite.

## Key Findings

### Recommended Stack

The core insight: **extend PostgreSQL, don't add databases.** Three PostgreSQL extensions deliver time-series analytics, vector search, and cryptographic audit immutability without the operational burden of separate services (InfluxDB, Elasticsearch, immudb). Device communication uses MQTT (the native protocol of access control panels), not Kafka or raw WebSockets. ANPR uses a commercial Docker SDK (Plate Recognizer) rather than a custom ML model to achieve 95%+ accuracy out of the box.

**Core technologies:**
- **TimescaleDB 2.18+ (PG extension):** Hypertables for access events, door states, incident timelines, and analytics aggregations — automatic partitioning, continuous aggregates, and native compression within the existing PostgreSQL instance
- **pgvector 0.8+ (PG extension):** Vector similarity search for natural language event queries and recurring pattern detection — HNSW indexes handle millions of vectors within the same Postgres connection
- **pgcrypto (PG extension):** SHA-256 hash chains across audit entries for cryptographic tamper evidence — zero new infrastructure
- **MQTT.js 5.15.2:** Standard protocol for Mercury, Axis, and HID door controllers — QoS 1 with retained messages for reliable device state
- **Plate Recognizer SDK (Docker):** On-premise ANPR with sub-100ms inference, 90+ country support, GPU acceleration — no cloud dependency, no custom model training
- **Apache ECharts 6.1.0 + React Flow 12.11.2:** Security analytics dashboards (heatmaps, scatter plots, 10K+ data points) and interactive site topology diagrams — purpose-built for the data volumes and interaction patterns of physical security
- **Existing Ollama + BullMQ + FFmpeg:** Extend (don't replace) for AI summaries, embedding generation, incident escalation workflows, and video correlation

### Expected Features

**Must have (table stakes — users expect these in any physical security platform):**
- Access event journal with video correlation — every badge read, door unlock with linked video timestamp
- Door state monitoring (locked/unlocked/held-open/forced) with alerts on illegal transitions
- Basic zone-based access rules (who can enter which zone, when)
- Incident creation, triage, assignment, and closure workflow
- Immutable audit log with user attribution (hash-chained via pgcrypto)
- Visitor check-in/check-out with temporary credentials
- License plate allowlist/blocklist (if ANPR is offered)

**Should have (competitive differentiators — what sets Oversight Hub apart):**
- AI-powered incident summaries: auto-generated narratives combining access events, door states, and camera metadata
- Natural language event search: "Who accessed the data center last weekend?" → returns events + video clips
- Per-zone dynamic risk scoring based on recent events, anomalies, and incident density
- Recurring situation detection: identify patterns (e.g., "door held open 3x this week at same time — misconfigured schedule")
- AI security assistant: conversational interface for operators to query building state
- Tailgating/piggybacking detection via existing camera AI pipeline

**Defer to v2+:**
- ANPR/LPR pipeline — requires separate SDK license, Phase 3+
- Visitor management with mobile credentials — depends on stable access control, Phase 3+
- Full analytics dashboards — require data accumulation from prior phases, Phase 4+
- AI assistant / natural language search — needs pgvector + embeddings pipeline first, Phase 4+

### Architecture Approach

The architecture extends the existing event-driven system with a layered **ingest → persist → correlate → respond** pattern. Two new ingestion paths feed into a single PostgreSQL instance: (1) MQTT for door controllers, badge readers, and ACS panels publishing to hierarchical topics; (2) Plate Recognizer REST API for vehicle plate recognition from camera frames. A NestJS MQTT custom transport routes events to domain services (Access Control, Door, ANPR, Incident Management), each enforcing business logic before writing to TimescaleDB hypertables. A Correlation Engine links access events to video timestamps via the existing FFmpeg pipeline. The AI Service uses the existing Ollama instance for both embedding generation (pgvector) and text generation (incident summaries, assistant responses). An Audit Service intercepts all mutation operations via NestJS interceptors and writes hash-chained entries to the audit log.

**Major components:**
1. **MQTT Transport:** Custom NestJS transport subscribing to device topic patterns — routes to Access Control and Door services
2. **Access Control Service:** Badge validation, zone rules engine, anti-passback logic, credential management — the central authorization layer
3. **Door Service:** Door state machine with sequence-ordered transitions, timeout monitoring, and alert generation via BullMQ
4. **Correlation Engine:** Links access events to video timestamps — powers "show video for this event" and evidence association
5. **Incident Management Service:** Incident CRUD with SLA tracking, escalation chains, evidence bundling, and closure report generation
6. **AI Service:** Generates embeddings (Ollama → pgvector), incident summaries (Ollama chat), and handles natural language queries (pgvector similarity search)
7. **Analytics Service:** Queries TimescaleDB continuous aggregates, computes zone risk scores, detects recurring patterns via pgvector similarity
8. **Audit Service:** NestJS interceptor that writes hash-chained entries to TimescaleDB-partitioned audit log — verifies chain integrity on read
9. **ANPR Service:** Frame → Plate Recognizer API → plate data + allowlist/blocklist check → vehicle access event generation
10. **Equipment Health Service:** Collects MQTT health/latency messages, stores in hypertable, triggers alerts on threshold violations

### Critical Pitfalls

1. **Prisma + TimescaleDB Schema Mismanagement:** Prisma migrations will silently destroy hypertable configuration, chunk intervals, compression policies, and continuous aggregates. **Mitigation:** Never use `prisma migrate` for time-series tables. Maintain a separate SQL migration directory for TimescaleDB DDL. Use `$queryRaw` for all hypertable operations. Prisma models only for reference/lookup tables.

2. **Door State Machine Race Conditions:** MQTT doesn't guarantee message ordering at QoS 0/1. A "locked" message arriving before "unlocked" generates false forced-open alerts, destroying operator trust. **Mitigation:** Require monotonic sequence numbers in all controller messages. Door service discards out-of-sequence messages. Validate every transition against the state machine. Implement a 500ms settling timeout after state changes.

3. **Audit Log Unbounded Growth:** At 1K doors processing 100 events/second, the audit log accumulates 8.6M rows/day. Without partitioning and retention, queries time out, vacuum fails, and disks fill. **Mitigation:** Make `audit_log` a TimescaleDB hypertable with 7-day chunks and a 90-day retention policy. Export old chunks to compressed archives before dropping. Use per-entity hash chains (not global) so verification scales.

4. **ANPR SDK Licensing and Throughput Mismatch:** Plate Recognizer has per-camera/per-lookup tiers. Exceeding limits results in silent API rejections and missed plates. **Mitigation:** Load test with expected camera count before purchasing. Monitor `/info` endpoint for usage tracking. Implement circuit breaker on 429 responses. Cache frequent plates (employee vehicles) in PostgreSQL.

5. **Ollama Model Loading Latency on First Request:** Ollama unloads models after 5 minutes idle by default. Security operator queries after a quiet period incur 5-30 second loading delays, appearing as timeouts. **Mitigation:** Set `keep_alive: -1` (never unload) for the embedding model used on every access event. Set `keep_alive: "30m"` for the chat model to stay hot during a shift.

## Implications for Roadmap

Based on research, the suggested phase structure follows the dependency graph: foundation pipeline → operational features → specialized capabilities → analytics & AI.

### Phase 1: Access Control Foundation
**Rationale:** Every downstream feature — incident management, visitor management, analytics, AI — depends on a reliable, ordered stream of access events. The MQTT ingestion layer and door state machine are the critical path. Without these, nothing else works. This phase also establishes the TimescaleDB/Prisma separation pattern and audit log infrastructure that all subsequent phases depend on.

**Delivers:** MQTT transport layer, access event pipeline with video correlation, door state machine with alert generation, basic zone-based access rules, hash-chained audit log interceptor.

**Addresses:** Access event journal, door state monitoring, basic access rules, audit log.

**Avoids:** Pitfall 1 (Prisma+TimescaleDB separation from day one), Pitfall 2 (sequence numbers + state validation in door service), Pitfall 3 (audit log as hypertable with retention from the start).

**Research flags:** Complex MQTT integration with door controller protocols — may need spike on controller message formats. TimescaleDB + Prisma coexistence pattern is novel — spike the migration strategy before full implementation.

### Phase 2: Incident Management + AI Summaries
**Rationale:** Incident management depends on the access event pipeline from Phase 1. AI incident summaries are the highest-value differentiator with the lowest relative complexity — they use existing Ollama infrastructure and only require new prompt templates. Building these together creates an end-to-end operator workflow: event happens → incident created → AI summarizes → operator responds.

**Delivers:** Incident CRUD, SLA tracking with BullMQ timers, AI-generated incident summaries, evidence association (video clips + access events), incident closure reports (pdfmake), evidence export bundles (archiver).

**Uses:** BullMQ (existing), Ollama chat API (existing), pdfmake, archiver, TimescaleDB incident hypertable.

**Implements:** Incident Management Service, AI Service (summarization subset), Correlation Engine (evidence linking).

**Research flags:** Ollama prompt engineering for security incident summarization — quality depends on prompt structure. SLA escalation workflows — may need spike on BullMQ job dependency chains. Standard research-phase recommended.

### Phase 3: ANPR + Visitor Management
**Rationale:** ANPR requires a commercial SDK license and represents a separate value stream — it can be built independently of Phase 2. Visitor management depends on stable access control (Phase 1) and benefits from ANPR for vehicle-based visitor check-in. These two modules share credential generation patterns (TOTP, QR codes) and can be built in parallel sub-phases.

**Delivers:** ANPR ingestion pipeline (camera frame → Plate Recognizer → plate storage → allowlist/blocklist → vehicle access events), visitor check-in/check-out, TOTP credential generation, QR visitor passes, mobile badge scanning (NFC + camera).

**Uses:** Plate Recognizer SDK (Docker), otplib, qrcode, react-native-vision-camera, react-native-nfc-manager.

**Implements:** ANPR Service, Visitor Management module, mobile credential workflows.

**Avoids:** Pitfall 4 (load test ANPR SDK before purchasing license, implement circuit breaker, cache frequent plates), Pitfall 8 (TOTP code replay prevention via Redis tracking and single-use QR passes).

**Research flags:** Needs a dedicated spike on Plate Recognizer SDK throughput with expected camera count. ANPR allowlist/blocklist schema design — involves partial plate matching and pattern expressions. Mobile NFC credential reading — platform-specific, needs device testing.

### Phase 4: Analytics + AI Assistant
**Rationale:** Analytics dashboards require accumulated data from prior phases (access events, incidents, door states). The AI assistant and natural language search require the pgvector embedding pipeline to be populated with historical event data. Building these last ensures the data exists to make analytics meaningful and the AI assistant actually useful.

**Delivers:** Analytics dashboards (ECharts heatmaps, scatter plots, calendar views), per-zone dynamic risk scoring, recurring situation detection (pgvector similarity), natural language event search, AI security assistant (conversational interface), semantic event embeddings pipeline.

**Uses:** ECharts 6.1.0 + React Flow 12.11.2, pgvector HNSW indexes, Ollama embedding API, TimescaleDB continuous aggregates.

**Implements:** Analytics Service, AI Service (embeddings + assistant subsets).

**Avoids:** Pitfall 5 (schedule periodic HNSW REINDEX, complement with recent-only sequential scan), Pitfall 6 (set `keep_alive: -1` for embedding model).

**Research flags:** Needs `research-phase` — pgvector embedding quality evaluation for security event search is domain-specific. Risk scoring algorithm design — no off-the-shelf solution, needs spike. AI assistant prompt engineering + tool calling — complex multi-turn interaction design. ECharts dashboard performance with large datasets — needs benchmark spike.

### Phase 5: Compliance & Advanced Detection
**Rationale:** Compliance reporting and retention automation are operational requirements that cap the feature set. Advanced detection features (tailgating, anti-passback) depend on all prior data pipelines being stable and populated. This phase formalizes the policies, reports, and advanced correlation logic that make the platform enterprise-ready.

**Delivers:** Compliance report generation (SOC 2, ISO 27001 templates), automated retention policies with chunk archival, tailgating/piggybacking detection, anti-passback enforcement, site topology visualization (React Flow), equipment health monitoring dashboard.

**Uses:** pdfmake (compliance templates), TimescaleDB data retention policies, archiver (chunk export), React Flow (site topology).

**Implements:** Compliance reporting module, retention automation, advanced detection logic, topology visualization.

**Research flags:** Standard patterns — compliance report templates are well-documented. Topology visualization with React Flow is well-established. Skip research-phase for most of this phase; spike only the tailgating detection ML approach.

### Phase Ordering Rationale

- **Phases are strictly dependency-ordered** per the dependency graph from FEATURES.md. Phase 1 builds the access event pipeline that everything else depends on. Phases 2 and 3 can be parallelized (different services, different data flows) but both require Phase 1. Phases 4 and 5 are sequential — they need accumulated data from earlier phases to be meaningful.
- **Architecture patterns enforce grouping.** The MQTT transport, door state machine, and audit interceptor are foundational infrastructure — they belong together in Phase 1. Incident management and AI summaries share the same data sources (access events, door states) and belong together. ANPR and visitor management share credential generation patterns.
- **Pitfall avoidance drives ordering.** The Prisma+TimescaleDB separation (Pitfall 1) must be established in Phase 1 — retrofitting it later is a rewrite. The audit log retention (Pitfall 3) must be designed in Phase 1 before data accumulates. Door state machine validation (Pitfall 2) must be correct before alerts go to operators — false alerts in Phase 2 would erode trust in the entire platform.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Access Control Foundation):** MQTT controller protocol mapping — different manufacturers have different topic schemas and payload formats. TimescaleDB+Prisma migration strategy needs a spike to validate the separation pattern. **Recommended:** `/gsd-plan-phase --research-phase 1`
- **Phase 3 (ANPR + Visitor Management):** Plate Recognizer SDK throughput benchmark with realistic camera counts. NFC credential reading on mobile — platform-specific behavior. **Recommended:** `/gsd-plan-phase --research-phase 3` for ANPR sub-phase
- **Phase 4 (Analytics + AI Assistant):** pgvector embedding quality for security event search. Risk scoring algorithm design. AI assistant tool calling and multi-turn conversation design. ECharts performance benchmarks. **Recommended:** `/gsd-plan-phase --research-phase 4`

Phases with standard patterns (skip or light research-phase):
- **Phase 2 (Incident Management + AI Summaries):** CRUD with SLA tracking — well-documented patterns. Ollama summarization is prompt engineering, not novel architecture. Standard `discuss-phase` + `plan-phase` should suffice.
- **Phase 5 (Compliance & Advanced Detection):** Compliance report templates follow regulatory standards. React Flow topology is well-documented. Only tailgating detection ML approach may need a targeted spike.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All library versions verified via npm registry. TimescaleDB, pgvector, pgcrypto docs from Context7 (633, 477, and core PG docs respectively). Plate Recognizer API and Ollama API verified against official docs. MQTT.js verified against published npm package. Community concerns flagged (prisma-extension-timescaledb — 2 stars, rejected for production). |
| Features | HIGH | Competitor analysis across Verkada, Genetec, Suprema, Eagle Eye Cloud VMS. Industry reports from Genetec State of Physical Security, IFSEC Global, Security Industry Association. Regulatory requirements (SOC 2, ISO 27001, GDPR, OSHA) mapped to feature expectations. |
| Architecture | HIGH | All patterns sourced from official TimescaleDB, pgvector, MQTT, and Ollama documentation (Context7 verified). MQTT topic naming from OASIS Standard. Trigger-based audit chains are well-established DBA patterns. Component boundaries clear and testable. Scale projections validated against TimescaleDB benchmarks. |
| Pitfalls | HIGH | Prisma+TimescaleDB conflict verified against community extension issues and TimescaleDB docs. MQTT ordering from OASIS specification. Ollama keep_alive from official docs. Plate Recognizer licensing from official documentation. pgvector HNSW behavior from community consensus (MEDIUM confidence on staleness, but prevention strategy is conservative). Audit log growth is arithmetic certainty. |

**Overall confidence:** HIGH — all major decisions backed by official documentation, verified package versions, and established domain patterns. The only MEDIUM-confidence findings are flagged explicitly (pgvector HNSW incremental freshness, community Prisma extension reliability) and have conservative prevention strategies.

### Gaps to Address

- **MQTT Controller Protocol Diversity:** Different manufacturers (Mercury, Axis, HID) use different topic schemas and payload formats. The research assumes a normalized topic structure (`site/{id}/{deviceType}/{id}/{eventType}`) but specific controller mappings need validation during Phase 1 spike. **Handle during:** Phase 1 plan-phase research spike — build a protocol adapter abstraction and validate with at least one real controller or simulator.

- **TimescaleDB + Prisma Migration Workflow:** The recommended approach (separate SQL migration directory, `$queryRaw` for all time-series operations) needs a concrete implementation spike. The migration ordering (Prisma first for reference tables, then TimescaleDB DDL) must be validated to ensure no cross-contamination. **Handle during:** Phase 1 plan-phase — spike the migration strategy before writing production code.

- **Plate Recognizer SDK Throughput at Scale:** The SDK documentation specifies per-container throughput (~50 plates/sec CPU, 200+ GPU), but actual throughput depends on image resolution, region count, and hardware. A load test with realistic camera feeds is needed before committing to the license tier. **Handle during:** Phase 3 plan-phase research spike — benchmark with expected camera count and frame rate.

- **pgvector Embedding Quality for Security Events:** The embedding model choice (nomic-embed-text vs mxbai-embed-large) and the text representation of security events (how structured event data is converted to searchable text) significantly impact search quality. This needs evaluation with real security event data. **Handle during:** Phase 4 plan-phase research — build an evaluation set of security queries and measure recall.

- **AI Assistant Tool Calling:** The conversational security assistant requires Ollama tool calling to query database state (door statuses, recent alerts, zone risks). Multi-turn conversation design and tool selection accuracy need spike validation. **Handle during:** Phase 4 plan-phase research — spike tool calling with Ollama and evaluate response quality.

## Sources

### Primary (HIGH confidence)
- [Plate Recognizer Snapshot API Docs](https://docs.platerecognizer.com) — API surface, Docker deployment, GPU variants, licensing tiers, `/info` endpoint
- [pgvector Context7 docs](/pgvector/pgvector) — 477 snippets: HNSW indexes, L2/cosine/ip distance, Prisma raw SQL patterns
- [TimescaleDB Context7 docs](/timescale/timescaledb) — 633 snippets: hypertables, continuous aggregates, retention policies, compression
- [MQTT.js Context7 docs](/mqttjs/mqtt.js) — 218 snippets: MQTT 3.1.1 + 5.0, QoS levels, retained messages, topic patterns
- [Ollama API docs](https://docs.ollama.com) — `/api/embed`, `/api/chat`, model keep_alive behavior, multi-model deployment
- [React Flow docs](https://reactflow.dev) — 3,601 snippets: interactive node graphs, custom nodes/edges, minimap, edge routing
- [Apache ECharts docs](https://echarts.apache.org) — 32,156 snippets: heatmaps, scatter, calendar, gauge charts, large dataset handling
- [react-native-vision-camera v5.1.0](https://github.com/mrousavy/react-native-vision-camera/releases/tag/v5.1.0) — QR/barcode scanning, `scanCodesInImage()`, Expo dev client compatibility
- npm registry (`npm view`) — version verification for all 14 recommended packages
- [Plate Recognizer Docker Hub](https://hub.docker.com/r/platerecognizer/alpr) — verified latest image, on-premise deployment, GPU variants

### Secondary (MEDIUM confidence)
- MQTT topic naming conventions — OASIS Standard (well-established, but specific controller implementations vary)
- PostgreSQL trigger-based audit hash chains — well-established DBA pattern, verified against pgcrypto docs
- prisma-extension-timescaledb v0.8.0 — evaluated and rejected (2 GitHub stars, too immature for production)
- pgvector HNSW index incremental staleness — community consensus (suboptimal without periodic rebuild)

### Tertiary (LOW confidence)
- None. All stack decisions backed by official documentation or verified package registries.

---
*Research completed: 2026-07-14*
*Ready for roadmap: yes*
