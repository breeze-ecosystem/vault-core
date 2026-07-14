# Stack Research: Physical Security Intelligence Platform — New Modules

**Domain:** Physical security — access control, ANPR/LPR, incident management, security analytics
**Researched:** 2026-07-14
**Confidence:** HIGH

## Scope

The existing system provides: NestJS API, Next.js Dashboard, Expo Mobile, PostgreSQL (Prisma), Redis (BullMQ), FFmpeg video processing, Ollama AI, JWT auth with roles, Socket.IO real-time, camera management, and edge agents. This research covers **only new technologies** needed for the access control, ANPR, incident management, analytics, compliance, and AI workflow modules.

## Recommended Stack

### Database Extensions (PostgreSQL — same server)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TimescaleDB | 2.18+ (PG ext) | Time-series hypertables for access events, door state changes, incident timelines, and analytics aggregations | PostgreSQL-native — no second database to manage. Automatic partitioning (hypertables), continuous aggregates for dashboard pre-computation, and native compression for historical data. Standard in physical security platforms for event time-series. |
| pgvector | 0.8+ (PG ext) | Vector similarity search for AI assistant natural language event queries | Same Postgres instance. Embed access events, incident descriptions, and audit entries for natural language search. HNSW indexes handle millions of vectors with sub-10ms query times. No separate vector DB needed. |
| pgcrypto | 1.3 (PG ext) | Cryptographic hashing for audit hash chains and tamper-evident logs | Ships with PostgreSQL. Builds SHA-256 hash chains across audit entries for cryptographic immutability without needing a separate immutable database. |

### Device & Protocol Integration

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| MQTT.js (`mqtt`) | 5.15.2 | Communication with access control panels, door controllers, and edge devices | MQTT is the standard protocol for ACS (Access Control System) panels — Mercury, Axis A1001, HID controllers all emit door events via MQTT. MQTT.js is the most mature Node.js MQTT client (3.1.1 + MQTT 5 support). Integrates into NestJS as a custom transport provider. |
| Plate Recognizer SDK (`platerecognizer/alpr` Docker) | latest | On-premise ANPR/LPR license plate recognition | Docker-deployed REST API with sub-100ms inference. Supports 90+ countries. Self-hosted — no cloud dependency. Simple HTTP API (POST image → JSON plates). GPU acceleration available. On-prem SDK avoids per-lookup pricing of cloud API. |

### AI & ML (extending existing Ollama)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Ollama Embeddings API | existing | Generate vector embeddings for semantic event search; feed pgvector | Already deployed. Ollama's `/api/embed` endpoint outputs vectors compatible with pgvector. Models like `nomic-embed-text` or `mxbai-embed-large` provide 768-1024 dimensional embeddings suitable for security event semantic search. |
| Ollama Chat API | existing | Generate incident summaries, AI assistant responses, risk score narratives | Already deployed. Extend existing Ollama integration for new prompt types: incident summarization, anomaly explanation, recommended actions. No new model infrastructure needed. |

### Backend Libraries (NestJS)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `otplib` | 13.4.1 | TOTP (time-based one-time password) generation for mobile credentials and visitor access codes | Generate 6-digit rotating codes for visitor check-in, temporary access. Battle-tested library with zero dependencies beyond crypto. |
| `qrcode` | 1.5.4 | QR code generation for visitor passes, mobile credentials, check-in codes | Generate QR codes server-side (PNG/SVG) for visitor badges, mobile credential enrollment. Most mature QR library for Node.js — no native deps. |
| `date-fns` | 4.4.0 | Date/time manipulation across all new modules | Tree-shakeable, immutable date operations for incident timelines, access schedules, validity windows, retention policies. v4 is the current major with best TS support. |
| `uuid` | 14.0.1 | Unique identifiers for events, incidents, visitors, credentials | Already likely in project. v14 adds `uuidv7` (time-sortable) — ideal for event and audit log primary keys. |
| `archiver` | 8.0.0 | Bundle incident evidence (video clips, access logs, reports) into downloadable archives | Stream-based archiving for exporting incident packages with video evidence + logs. Rock-solid, widely used. |
| `pdfmake` | 0.3.11 | Generate compliance reports, audit exports, incident reports | Server-side PDF generation with table support, custom fonts, headers/footers. Pure JS — no system dependencies. Generate compliance reports, security audit summaries, incident closure documents. |

### Frontend Libraries (Next.js Dashboard)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Apache ECharts (`echarts`) | 6.1.0 | Security analytics dashboards, per-zone risk heatmaps, event timelines | Most powerful open-source charting library. Canvas-based (handles 10K+ data points smoothly). Built-in heatmaps, scatter plots for anomaly visualization, gauge charts for risk scores, calendar heatmaps for incident frequency. |
| `echarts-for-react` | 3.0.6 | React wrapper for ECharts | Thin, maintained React binding for ECharts. Avoids re-render thrashing. |
| `@xyflow/react` (React Flow) | 12.11.2 | Interactive site topology, zone/floor diagrams, camera-door relationship maps | De facto standard for interactive node graphs in React. For rendering site layouts showing cameras, doors, readers, zones — with drag-to-rearrange. v12 is the current major with improved performance. |
| Mermaid (`mermaid`) | 11.16.0 | Embedded diagrams in reports, incident timelines, access flow documentation | Renders diagrams from markdown-like text definitions. For incident flowcharts, access control zone diagrams in reports. Renders client-side in browser. |

### Mobile Libraries (Expo / React Native)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-vision-camera` | 5.1.0 | QR/barcode scanning for visitor check-in, badge validation | Fastest RN camera library with built-in barcode scanning. Frame processor plugins allow custom ML. v5 adds `scanCodesInImage()` for static image scanning. Works on Expo via dev client. |
| `react-native-nfc-manager` | 3.17.2 | NFC badge/credential reading for guard verification workflows | Standard for NFC in React Native. Read MIFARE/NDEF tags from access badges. For guard-on-patrol workflows to verify credentials on-site. Requires Expo dev client (native module). |

## Installation

```bash
# === Database Extensions (run in PostgreSQL) ===
# CREATE EXTENSION IF NOT EXISTS timescaledb;
# CREATE EXTENSION IF NOT EXISTS vector;
# CREATE EXTENSION IF NOT EXISTS pgcrypto;

# === Backend (NestJS packages) ===
npm install mqtt@5.15.2 otplib@13.4.1 qrcode@1.5.4 date-fns@4.4.0 uuid@14.0.1 archiver@8.0.0 pdfmake@0.3.11

# === Frontend (Next.js Dashboard) ===
npm install echarts@6.1.0 echarts-for-react@3.0.6 @xyflow/react@12.11.2 mermaid@11.16.0

# === Mobile (Expo) ===
npx expo install react-native-vision-camera@5.1.0 react-native-nfc-manager@3.17.2

# === ANPR (Docker Compose — alongside existing services) ===
# See docker-compose snippet below

# === Type definitions ===
npm install -D @types/qrcode @types/pdfmake @types/archiver
```

### ANPR Docker Compose Snippet

```yaml
# Add to existing docker-compose.yml
services:
  alpr:
    image: platerecognizer/alpr:latest
    ports:
      - "8080:8080"
    volumes:
      - alpr_license:/license
    environment:
      - TOKEN=${PLATE_RECOGNIZER_TOKEN}
      - LICENSE_KEY=${PLATE_RECOGNIZER_LICENSE_KEY}
    restart: unless-stopped
    # GPU acceleration (optional):
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]
    # image: platerecognizer/alpr-gpu:latest

volumes:
  alpr_license:
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ANPR | Plate Recognizer SDK (Docker) | OpenALPR/ReKor Scout | ReKor dropped open-source; commercial pricing opaque. Plate Recognizer has better Docker deployment, clearer API, and supports 90+ countries vs ReKor's US focus. |
| ANPR | Plate Recognizer SDK (Docker) | Custom YOLO + PaddleOCR | Months of training data curation for each region. Accuracy below 90% without massive datasets. Commercial SDK is 95%+ out of the box. |
| Time-series DB | TimescaleDB (PG extension) | InfluxDB (separate service) | Adds a second database to manage, monitor, and back up. TimescaleDB lives in existing PostgreSQL — same connection pool, same Prisma, same backups. |
| Time-series DB | TimescaleDB (PG extension) | ClickHouse | Superior for petabyte-scale analytics but adds operational burden. TimescaleDB handles millions of events/day which fits physical security scale. |
| Vector Search | pgvector (PG extension) | Elasticsearch | Separate Java service with significant memory overhead. pgvector handles the scale (security events, not web-scale documents) within existing Postgres. |
| Vector Search | pgvector (PG extension) | Pinecone/Weaviate (cloud) | Violates self-hosted constraint. |
| Audit Immutability | PostgreSQL + pgcrypto hash chains | immudb | immudb adds a gRPC service, separate backup strategy, and another failure domain. PG hash chains (SHA-256 chained via triggers) provide cryptographic tamper evidence with zero new infrastructure. |
| Workflow Engine | BullMQ (already have) | Temporal | Temporal is powerful for multi-service orchestration but requires running Temporal server. BullMQ's delayed jobs, retry policies, and job dependencies handle incident escalation and maintenance scheduling sufficiently. |
| Door Events | MQTT.js | Kafka | Kafka is for high-throughput event streaming across microservices. MQTT is purpose-built for IoT/device communication — exactly what door controllers speak. |
| Charts | Apache ECharts | Chart.js / Recharts | ECharts handles large datasets (10K+ data points) that analytics dashboards require. Built-in heatmaps, scatter plots for anomaly detection, calendar views for incident frequency. Chart.js/Recharts are better for simple dashboards but degrade with security analytics data volumes. |
| Topology Diagrams | React Flow (@xyflow/react) | D3.js (raw) | D3 is powerful but requires 10x more code for interactive node graphs. React Flow provides drag-to-rearrange, zoom, minimap, and edge routing out of the box. |
| PDF Reports | pdfmake | Puppeteer (headless Chrome) | Puppeteer adds 300MB+ Docker image and memory overhead. pdfmake is pure JS, generates PDFs in-memory, and produces smaller files for compliance reports. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `fabric` / `konva` for topology | Canvas libraries requiring manual hit-detection and event handling for node graphs | `@xyflow/react` (React Flow) — built for interactive node diagrams |
| `moment.js` | Deprecated (moment team recommends alternatives). 70KB bundle for basic date ops. | `date-fns` v4 — already likely in project, tree-shakeable |
| `jsonwebtoken` for credential codes | JWT tokens for access credentials are overkill — 200+ byte tokens where 6-digit codes suffice | `otplib` for TOTP visitor codes; short-lived, human-readable |
| Adding a new database server | Every new database adds backup, monitoring, failover overhead | Extend existing PostgreSQL with extensions (TimescaleDB, pgvector, pgcrypto) |
| WebSocket for device comms | Not suited for unreliable device networks — no QoS levels, no retained messages | MQTT with QoS 1 (at-least-once delivery) and retained messages for device state |
| Custom ML model for ANPR | Training requires millions of labeled plate images per region. Accuracy lags commercial solutions. | Plate Recognizer SDK — 95%+ accuracy across 90+ countries |

## Stack Patterns by Feature Module

**Access Control + Door Management:**
- MQTT.js subscribes to door controller topics (`site/+/door/+/state`)
- NestJS MQTT transport delivers events to access control service
- TimescaleDB hypertable (`door_events`) stores state changes with 1-day chunks
- Door state machine (locked→unlocked→held-open→forced) enforced in NestJS service layer
- BullMQ queue for alert generation on abnormal door states

**ANPR/LPR:**
- Camera captures vehicle frame → NestJS sends to Plate Recognizer Docker API
- Plate data stored in PostgreSQL with camera_id, timestamp, confidence
- Allowlist/blocklist checked against stored plates table
- Access event generated if plate matches credential
- Video clip correlated via existing FFmpeg pipeline

**Incident Management:**
- BullMQ job queues for triage, assignment, escalation (delayed jobs for SLA timers)
- TimescaleDB for incident event timeline (hypertable on `created_at`)
- pdfmake generates closure reports with timeline, evidence, signatures
- archiver bundles video clips + logs for export

**Security Analytics:**
- TimescaleDB continuous aggregates pre-compute hourly/daily metrics
- ECharts renders heatmaps (risk by zone), scatter plots (anomaly detection), calendar heatmaps
- pgvector stores event embeddings for similarity search (recurring patterns)

**AI Assistant:**
- Ollama embedding model generates vectors from event descriptions
- pgvector similarity search finds related events
- Ollama chat model generates natural language responses

**Compliance & Audit:**
- pgcrypto hash chain via PostgreSQL triggers on audit tables
- pdfmake generates compliance reports
- Retention policies enforced via TimescaleDB data retention policies and PostgreSQL partition dropping

**Mobile Credentials & Visitor Management:**
- `qrcode` generates visitor QR passes (server-side PNG)
- `otplib` generates TOTP codes for time-limited access
- `react-native-vision-camera` scans QR codes for check-in
- `react-native-nfc-manager` reads NFC badge credentials

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| TimescaleDB 2.18+ | PostgreSQL 15, 16, 17 | Check existing PG version before installing. TimescaleDB tracks PG major versions tightly. |
| pgvector 0.8+ | PostgreSQL 15, 16, 17 | Independent of TimescaleDB; both can coexist in same instance. |
| `prisma-extension-timescaledb` v0.8.0 | Prisma 6+ | Community extension (2 GitHub stars as of 2026-07). **Recommend against using in production** — use Prisma `$queryRaw` for hypertable/continuous aggregate DDL. The extension is too immature. |
| `react-native-vision-camera` v5.1.0 | Expo SDK 52+ (dev client) | Requires Expo dev client (not Expo Go). Works with `npx expo prebuild`. |
| `react-native-nfc-manager` v3.17.2 | Expo SDK 52+ (dev client) | Requires custom dev client. NFC not available in Expo Go. |
| ECharts v6.1.0 | echarts-for-react v3.0.6 | Must match semver. echarts-for-react follows ECharts major versions. |

## Sources

- [Plate Recognizer Snapshot API Docs](https://docs.platerecognizer.com) — HIGH confidence (official docs, verified API surface and Docker deployment)
- [pgvector Context7 docs](/pgvector/pgvector) — HIGH confidence (477 snippets, HNSW indexes, L2/cosine/ip distance, Prisma raw SQL integration pattern)
- [TimescaleDB Context7 docs](/timescale/timescaledb) — HIGH confidence (633 snippets, hypertables, continuous aggregates, retention policies, compression)
- [immudb Context7 docs](/codenotary/immudb-docs) — HIGH confidence (573 snippets). Evaluated and rejected for PostgreSQL hash-chain alternative.
- [MQTT.js Context7 docs](/mqttjs/mqtt.js) — HIGH confidence (218 snippets, MQTT 3.1.1 + 5.0, QoS, retained messages)
- [Ollama API docs](https://docs.ollama.com) — HIGH confidence (`/api/embed`, `/api/chat`, model compatibility)
- [React Flow docs](https://reactflow.dev) — HIGH confidence (3,601 snippets, interactive node graphs, custom nodes/edges)
- [Apache ECharts docs](https://echarts.apache.org) — HIGH confidence (32,156 snippets, heatmaps, scatter, calendars, gauge charts)
- [react-native-vision-camera v5.1.0 release](https://github.com/mrousavy/react-native-vision-camera/releases/tag/v5.1.0) — HIGH confidence (v5.1.0, 2026-07-01, frame processors, QR/barcode scanning)
- [prisma-extension-timescaledb v0.8.0](https://github.com/krister-johansson/prisma-extension-timescaledb) — MEDIUM confidence (evaluated, too immature for production — 2 stars)
- npm registry (`npm view`) — HIGH confidence (version verification for all packages: mqtt@5.15.2, date-fns@4.4.0, echarts@6.1.0, @xyflow/react@12.11.2, pdfmake@0.3.11, otplib@13.4.1, qrcode@1.5.4, uuid@14.0.1, archiver@8.0.0, mermaid@11.16.0, zod@4.4.3, react-native-nfc-manager@3.17.2)
- [Plate Recognizer Docker Hub](https://hub.docker.com/r/platerecognizer/alpr) — HIGH confidence (verified latest image, on-premise deployment, GPU variants)

---

*Stack research for: Oversight Hub — Access Control + Incident Management + Analytics modules*
*Researched: 2026-07-14*
