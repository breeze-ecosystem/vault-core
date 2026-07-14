# Architecture Patterns: Physical Security Intelligence Platform

**Domain:** Physical security — unified access control + video + incident management + analytics
**Researched:** 2026-07-14

## Recommended Architecture

The platform extends the existing event-driven architecture with two new ingestion paths and three new PostgreSQL-backed services. The pattern is: **ingest → persist → correlate → respond**.

```
                          ┌──────────────────────────────────────┐
                          │         Next.js Dashboard             │
                          │  (ECharts, React Flow, Mermaid)       │
                          └──────────────┬───────────────────────┘
                                         │ REST + Socket.IO
┌─────────────┐    MQTT    ┌─────────────┴──────────────────────┐    ┌──────────────┐
│ Door Ctrlrs │───────────▶│         NestJS API Gateway          │◀───│ Plate Recog. │
│ Badge Rders │            │                                     │    │ SDK (Docker) │
│ ACS Panels  │            │  ┌─────────┐ ┌─────────┐ ┌───────┐ │    │  :8080 REST  │
└─────────────┘            │  │ Access  │ │Incident │ │Analyt-│ │    └──────────────┘
                           │  │ Control │ │  Mgmt   │ │ ics   │ │
┌─────────────┐   RTSP     │  │ Service │ │ Service │ │Service│ │
│  Cameras    │───────────▶│  └────┬────┘ └────┬────┘ └───┬───┘ │
└─────────────┘            │       │           │           │      │
                           └───────┼───────────┼───────────┼──────┘
                                   │           │           │
                    ┌──────────────┼───────────┼───────────┼──────┐
                    │          PostgreSQL (single instance)        │
                    │  ┌──────────┴───────────┴───────────┴────┐  │
                    │  │          Standard Tables (Prisma)      │  │
                    │  │  cameras, users, sites, zones, rules   │  │
                    │  └────────────────────────────────────────┘  │
                    │  ┌────────────────────────────────────────┐  │
                    │  │ TimescaleDB Hypertables                 │  │
                    │  │ access_events, door_states, incidents,  │  │
                    │  │ anpr_reads, analytics_metrics,          │  │
                    │  │ health_samples                          │  │
                    │  └────────────────────────────────────────┘  │
                    │  ┌────────────────────────────────────────┐  │
                    │  │ pgvector                               │  │
                    │  │ event_embeddings (vector(1024))         │  │
                    │  └────────────────────────────────────────┘  │
                    │  ┌────────────────────────────────────────┐  │
                    │  │ pgcrypto                               │  │
                    │  │ audit_log (hash-chained entries)       │  │
                    │  └────────────────────────────────────────┘  │
                    └──────────────────────────────────────────────┘
                    ┌──────────┐  ┌──────────┐  ┌──────────┐
                    │  Redis   │  │  Ollama  │  │  FFmpeg  │
                    │ BullMQ   │  │embeddings│  │  frame   │
                    │ sessions │  │  + chat  │  │extraction│
                    └──────────┘  └──────────┘  └──────────┘
```

### Ingestion Layer

Two parallel ingestion paths feed the system:

1. **MQTT (device events):** Door controllers and ACS panels publish to MQTT topics (`site/{id}/door/{id}/state`, `site/{id}/reader/{id}/badge`). NestJS MQTT transport subscribes and routes to Access Control Service. QoS 1 (at-least-once delivery) ensures no lost events.

2. **Plate Recognizer REST (vehicle events):** Existing camera pipeline captures frames → NestJS sends frame to Plate Recognizer Docker API (`POST /v1/plate-reader/`) → plate data + coordinates returned → stored in ANPR hypertable → allowlist/blocklist checked → access event generated if matched.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **MQTT Transport** | NestJS custom transport. Connects to MQTT broker, subscribes to topic patterns, delivers messages to handlers. | Access Control Service, Door Service |
| **Access Control Service** | Badge validation, zone rules (who, where, when), anti-passback logic, credential management. | PostgreSQL (rules, credentials), Redis (anti-passback state) |
| **Door Service** | Door state machine (locked→unlocked→held-open→forced). Timeout monitoring. Alert generation on illegal states. | PostgreSQL (door_states hypertable), BullMQ (alert jobs) |
| **ANPR Service** | Frame→Plate Recognizer API call. Plate caching. Allowlist/blocklist matching. Vehicle access event creation. | Plate Recognizer SDK (HTTP), PostgreSQL (plates, allowlists), Access Control Service |
| **Incident Management Service** | CRUD for incidents. SLA tracking. Escalation chains. Evidence association (video clips, access events). Closure workflows. | PostgreSQL (incidents hypertable), BullMQ (escalation timers), pdfmake (reports), archiver (evidence bundles) |
| **Correlation Engine** | Links access events to video timestamps. Tags video clips with event metadata. Powers "show video for this event." | PostgreSQL, existing FFmpeg service |
| **Analytics Service** | Queries continuous aggregates. Computes risk scores. Detects recurring patterns via pgvector similarity. Serves dashboard data. | PostgreSQL (continuous aggregates, pgvector), ECharts (via REST API) |
| **AI Service** | Generates incident summaries (Ollama chat). Creates event embeddings (Ollama embed). Handles natural language queries (pgvector search + Ollama). | Ollama API, PostgreSQL (pgvector) |
| **Audit Service** | Intercepts all mutation operations via NestJS interceptor. Writes hash-chained entries. Verifies chain integrity on read. | PostgreSQL (audit_log with pgcrypto triggers) |
| **Equipment Health Service** | Collects MQTT health/latency messages from edge agents. Stores in TimescaleDB hypertable. Triggers alerts on threshold violations. | MQTT, PostgreSQL (health_samples hypertable), BullMQ |

### Data Flow: Door Forced-Open Alert

```
1. Door controller publishes: mqtt://broker/site/3/door/12/state → {"state":"forced","ts":"..."}
2. MQTT Transport → Door Service.handleStateChange()
3. Door Service validates state transition (was locked, now forced → illegal)
4. Door Service writes to `door_states` hypertable
5. Door Service enqueues BullMQ job: {type:"door.forced", doorId:12, siteId:3}
6. BullMQ worker generates Alert entity, correlates with nearest camera
7. Alert dispatched via Socket.IO to Dashboard, push notification to Mobile
8. Alert event written to TimescaleDB hypertable with camera timestamp
9. Correlation Engine tags video clip at event timestamp
```

### Data Flow: AI Incident Summary

```
1. Incident created with associated access events + door events + video clips
2. Incident Management Service → AI Service.generateSummary(incidentId)
3. AI Service queries: incident details, involved access events, door states, zone info
4. AI Service constructs structured prompt for Ollama chat model
5. Ollama returns narrative summary with: timeline, actors, zone, risk assessment, recommendations
6. Summary stored in incident record. Displayed in Dashboard incident view.
```

## Patterns to Follow

### Pattern 1: Hypertable for Event Time-Series
**What:** Use TimescaleDB hypertables for all event streams (access events, door states, ANPR reads, health samples, incident timeline entries). Chunk by 1 day for door events, 7 days for analytics metrics.
**When:** Any table that grows monotonically with time and is primarily queried by time range.
**Example:**
```sql
-- Run via Prisma $queryRaw in migration
CREATE TABLE access_events (
    time        TIMESTAMPTZ NOT NULL,
    site_id     INTEGER NOT NULL,
    zone_id     INTEGER,
    door_id     INTEGER,
    badge_id    VARCHAR(32),
    event_type  VARCHAR(32) NOT NULL,  -- 'granted', 'denied', 'tailgate'
    person_name VARCHAR(128),
    metadata    JSONB
);

SELECT create_hypertable('access_events', 'time', chunk_time_interval => INTERVAL '1 day');

-- Continuous aggregate for hourly door access counts
CREATE MATERIALIZED VIEW door_access_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    door_id,
    event_type,
    COUNT(*) as event_count
FROM access_events
GROUP BY bucket, door_id, event_type;
```

### Pattern 2: pgvector Semantic Event Search
**What:** Generate embeddings for all significant events (access denied, door forced, incident created) using Ollama embedding API. Store in pgvector column. Query with natural language via cosine similarity.
**When:** Any feature that requires "find similar events" or "search events by description."
**Example:**
```sql
-- Event text composed from structured fields
-- Embedding generated by Ollama POST /api/embed
INSERT INTO event_embeddings (event_id, event_text, embedding)
VALUES ($1, 'Door 12 forced open at 14:32 in Server Room zone. Badge 4421 last entry.', $2::vector);

-- Natural language search
SELECT e.event_id, e.event_text,
       1 - (e.embedding <=> $query_embedding::vector) AS similarity
FROM event_embeddings e
ORDER BY e.embedding <=> $query_embedding::vector
LIMIT 10;
```

### Pattern 3: Audit Hash Chain
**What:** Each audit entry includes `prev_hash = SHA-256(previous_entry.content + previous_entry.hash)`. The chain is verifiable by walking from any entry to genesis. Detect tampering by hash mismatch.
**When:** All mutation operations (create/update/delete) on access events, incidents, credentials, rules.
**Example:**
```sql
-- PostgreSQL trigger function
CREATE OR REPLACE FUNCTION audit_hash_chain()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash TEXT;
BEGIN
    SELECT hash INTO prev_hash
    FROM audit_log
    WHERE table_name = TG_TABLE_NAME
    ORDER BY created_at DESC LIMIT 1;

    NEW.hash := encode(
        digest(
            COALESCE(prev_hash, 'genesis') || NEW.content::text,
            'sha256'
        ),
        'hex'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Pattern 4: MQTT Topic Namespacing
**What:** Hierarchical topic structure: `site/{siteId}/{deviceType}/{deviceId}/{eventType}`
**When:** All MQTT communication with devices.
**Example:**
```
site/3/reader/7/badge     → Badge 4421 scanned at reader 7, site 3
site/3/door/12/state      → Door 12 state changed at site 3
site/3/controller/1/health → Controller health heartbeat
site/+/door/+/state        → NestJS subscription: all door states, all sites
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct MQTT → Database Writes
**What:** Having MQTT message handlers write directly to PostgreSQL.
**Why bad:** No validation, no state machine enforcement, no correlation logic. Door events need context (what was the previous state? Is this zone armed?).
**Instead:** MQTT handler → NestJS Service (with validation + state machine + business logic) → Repository → PostgreSQL.

### Anti-Pattern 2: Entity Models for Hypertables
**What:** Using Prisma schema models for hypertables and relying on Prisma migrations for schema management.
**Why bad:** Prisma doesn't understand hypertables, chunk intervals, or continuous aggregates. `prisma migrate` may drop TimescaleDB-specific DDL.
**Instead:** Use Prisma `$queryRaw` for all TimescaleDB DDL in a separate migration step. Keep standard Prisma models for reference/lookup tables only.

### Anti-Pattern 3: Real-time Analytics on Raw Event Tables
**What:** Dashboard queries aggregating raw event tables directly.
**Why bad:** Scanning millions of rows per dashboard refresh. Performance degrades linearly with data volume.
**Instead:** Pre-compute with TimescaleDB continuous aggregates. Dashboards query materialized views that refresh incrementally.

### Anti-Pattern 4: Single AI Model for All Use Cases
**What:** Using the same Ollama model for embeddings, summarization, and classification.
**Why bad:** Embedding models (nomic-embed-text) are optimized for semantic similarity. Chat models (llama3.1, mistral) are optimized for generation. Vision models (moondream) are for image analysis. Using wrong model type produces poor results.
**Instead:** Use embedding model for pgvector, chat model for summaries, vision model for frame analysis. Models are lightweight — run multiple on same Ollama instance.

## Scalability Considerations

| Concern | At 100 doors / 10 cameras | At 1K doors / 100 cameras | At 10K doors / 1K cameras |
|---------|---------------------------|---------------------------|---------------------------|
| Event ingestion rate | ~100 events/sec → MQTT single broker | ~1K events/sec → MQTT broker cluster | ~10K events/sec → MQTT broker cluster + queue sharding |
| Database writes | Standard PostgreSQL handles easily | TimescaleDB chunking + compression | TimescaleDB distributed hypertables (multi-node) |
| Analytics queries | Continuous aggregate refresh every hour | Same — CAGGs are incremental | Add read replicas for dashboard queries |
| pgvector search | Sequential scan acceptable for <1M vectors | HNSW index required | IVFFlat for higher recall at scale |
| Plate Recognizer | Single Docker container (50 plates/sec) | Scale to 2-3 containers behind load balancer | GPU-accelerated containers (200+ plates/sec each) |
| Ollama | Single instance handles embeddings + chat | Single instance or 2 for dedicated embed/chat | GPU-accelerated inference |

At the target scale for this platform (commercial buildings, corporate campuses — not city-wide deployments), single-node PostgreSQL with TimescaleDB handles the load comfortably. The real scaling challenges are in the ANPR pipeline (camera count × frame rate) and AI inference latency, not database capacity.

## Sources

- TimescaleDB hypertable patterns from official docs (Context7: /timescale/timescaledb, 633 snippets) — HIGH confidence
- pgvector HNSW indexing and similarity search (Context7: /pgvector/pgvector, 477 snippets) — HIGH confidence
- MQTT topic naming conventions from MQTT Specification (OASIS Standard) and MQTT.js docs (Context7: /mqttjs/mqtt.js, 218 snippets) — HIGH confidence
- PostgreSQL trigger-based audit patterns — well-established DBA pattern, verified against pgcrypto documentation — HIGH confidence
- Ollama multi-model deployment pattern from official docs (Context7: /llmstxt/ollama_llms_txt, 630 snippets) — HIGH confidence
- Prisma raw query patterns from official Prisma documentation — HIGH confidence
