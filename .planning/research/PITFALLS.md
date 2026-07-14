# Domain Pitfalls: Physical Security Intelligence Platform

**Domain:** Physical security — access control, ANPR, incidents, analytics, compliance
**Researched:** 2026-07-14

## Critical Pitfalls

Mistakes that cause rewrites or major outages.

### Pitfall 1: Prisma + TimescaleDB Schema Mismanagement
**What goes wrong:** Developer runs `prisma migrate dev` which drops hypertable configuration, chunk intervals, compression policies, and continuous aggregates because Prisma doesn't understand TimescaleDB-specific DDL. Migration files become a mix of Prisma-generated SQL and manual TimescaleDB SQL — Prisma can't validate or maintain the manual portions.
**Why it happens:** Prisma models tables via declarative schema; TimescaleDB features (hypertables, CAGGs, retention, compression) are configured via SQL functions that Prisma doesn't track. The community extension (`prisma-extension-timescaledb`) is too immature (v0.8.0, 2 GitHub stars as of 2026-07) for production.
**Consequences:** Silent loss of time-series partitioning. Unbounded table growth. Dashboard queries timing out. Full table scans replacing hypertable chunk pruning. Data loss if retention policies are wiped and old chunks manually dropped.
**Prevention:**
1. **Never** use `prisma migrate` to manage TimescaleDB DDL. Instead:
   - Use a separate SQL migration directory (`migrations/timescale/`) with raw SQL files
   - Run TimescaleDB migrations via a custom NestJS migration runner on startup, or via `/docker-entrypoint-initdb.d/` scripts
2. Use Prisma `$queryRaw` for any query that benefits from TimescaleDB-specific functions (`time_bucket()`, `first()`, `last()`, `approximate_row_count()`)
3. Standard Prisma models ONLY for reference/lookup tables (zones, rules, credentials) — never for event hypertables
4. Document this split clearly in CONTRIBUTING.md: "Prisma for entity CRUD; raw SQL for time-series"

**Detection:** Query `SELECT * FROM timescaledb_information.hypertables;` — if empty after migrations, hypertables were dropped. Monitor query plans — sequential scans on event tables indicate missing hypertable configuration.

---

### Pitfall 2: Door State Machine Race Conditions
**What goes wrong:** A door receives rapid state changes (badge read → unlocked → person through → locked) within milliseconds. MQTT message ordering isn't guaranteed at QoS 0. A "locked" message could arrive before "unlocked", making the door appear locked when it's actually open. This generates false "forced open" alerts.
**Why it happens:** MQTT QoS 0 (fire-and-forget) or QoS 1 (at-least-once) don't guarantee ordering. Multiple clients publishing to the same topic, network latency, and broker queue depth all affect message ordering at the subscriber.
**Consequences:** False alerts erode operator trust. Security team ignores real alerts after too many false positives. Door appears in wrong state in dashboard.
**Prevention:**
1. Use MQTT QoS 1 (at-least-once delivery) — DO NOT use QoS 0 for door state
2. Include a monotonically increasing sequence number in each door state message from the controller
3. Door Service tracks `last_sequence` per door; discards messages with `sequence <= last_sequence`
4. Door state transitions validate against state machine: only allow valid transitions (`locked→unlocked`, not `locked→locked` or `open→locked` without intermediate `closing`)
5. Implement a "settling timeout" — after a state change, ignore subsequent state changes for 500ms to let the controller stabilize

**Detection:** Alert on state machine transitions that skip states. Monitor for doors flipping state > 3 times in 1 second (hardware oscillation). Log and alert on discarded out-of-order messages.

---

### Pitfall 3: Audit Log Growing Without Retention
**What goes wrong:** `audit_log` table grows unboundedly — every access event, door state change, credential modification, incident update writes an audit entry. At 1K doors processing 100 events/second, that's 8.6M audit rows/day. Within months, the table is billions of rows with no partitioning.
**Why it happens:** Developers focus on "write the audit entry" but forget "clean up old audit entries." Audit requirements say "retain for X years" but don't specify the mechanism.
**Consequences:** PostgreSQL vacuum can't keep up. Audit queries timeout. Disk fills up. Hash-chain verification becomes impossibly slow (must scan entire table to verify). Backups take hours.
**Prevention:**
1. Create `audit_log` as a TimescaleDB hypertable with 7-day chunks
2. Set retention policy: `SELECT add_retention_policy('audit_log', INTERVAL '90 days');` (adjust for compliance requirements)
3. Before dropping old chunks, export them to compressed archives (archiver library, stored in object storage or cold disk)
4. Hash chain is per-entity (e.g., per incident, per credential), not global — chain verification is scoped to the entity, not the whole table
5. Archive old chunks with their hash pointers intact; include genesis hash in the archive manifest for later verification

**Detection:** Monitor hypertable chunk count — if >1000 chunks, retention is likely broken. Monitor `pg_stat_user_tables` for audit_log size trends.

---

### Pitfall 4: ANPR SDK Licensing and Throughput Mismatch
**What goes wrong:** Plate Recognizer SDK has per-camera or per-lookup licensing tiers. Deploying it across 50 cameras without checking license limits results in API rejections, missed plates, and silent failures. OR: GPU acceleration expected but license only covers CPU, resulting in 5-second inference times instead of 50ms.
**Why it happens:** License key validation happens at runtime. The SDK doesn't prevent you from sending requests beyond your tier — it just returns errors. These errors can go unnoticed if error handling swallows them.
**Consequences:** Vehicle tracking incomplete. Allowlist/blocklist misses. Security gaps at vehicle entry points. Hard to diagnose because "it works sometimes."
**Prevention:**
1. During Phase 3 spike: run load test with expected camera count and frame rate BEFORE purchasing license
2. Monitor SDK `/info` endpoint — it returns `total_calls` and `usage.calls` for tracking against limits
3. Implement circuit breaker in NestJS: if Plate Recognizer returns 429, back off and alert
4. Cache frequent plates (e.g., employee vehicles) in PostgreSQL to reduce SDK calls
5. Configure `mode: "fast"` for entry/exit lanes where speed > accuracy; `mode: default` for forensic plate lookup

**Detection:** Graph SDK response codes over time. Alert on 429 or 413 rate increase. Compare expected plates/minute vs actual. Monitor inference latency — sudden increase may indicate CPU fallback from GPU.

---

## Moderate Pitfalls

### Pitfall 5: pgvector HNSW Index Staleness
**What goes wrong:** New event embeddings are inserted but HNSW index doesn't include them until reindexed. Queries return stale results. "Event search" misses recent events.
**Why it happens:** HNSW indexes are built at index creation time and updated incrementally, but the graph structure can become suboptimal. New vectors may not be well-connected in the graph.
**Prevention:** Schedule periodic `REINDEX INDEX CONCURRENTLY event_embeddings_embedding_idx;` during low-traffic hours. Monitor index bloat. For real-time needs, complement HNSW with a sequential scan of recent-only data (last 24 hours).

### Pitfall 6: Ollama Model Loading Latency on First Request
**What goes wrong:** Ollama unloads models from memory when idle (default: 5 minutes). First request after idle period incurs 5-30 second model loading delay. Security operator's AI assistant query times out.
**Why it happens:** Ollama's default `keep_alive` is 5 minutes. After that, model is swapped to disk to free RAM. In a security context, queries are sporadic — operator asks 3 questions, then nothing for 20 minutes, then asks again.
**Prevention:** Set appropriate `keep_alive` for security-critical models. For the embedding model (used on every access event): `keep_alive: -1` (never unload). For the chat/summarization model: `keep_alive: "30m"` (stay hot during a shift). Monitor Ollama memory usage to avoid starving PostgreSQL/Redis.

### Pitfall 7: MQTT Broker as Single Point of Failure
**What goes wrong:** Mosquitto broker (or whichever MQTT broker) crashes. All door events, badge reads, controller health messages are lost. Platform goes blind to physical access events.
**Why it happens:** MQTT broker is a single service in Docker Compose. No clustering, no message persistence.
**Prevention:** Configure MQTT broker with persistence (messages saved to disk, survive restart). Use `cleansession: false` on clients so they receive queued messages on reconnect. For high-availability deployments, use Mosquitto bridge or EMQX cluster. Monitor broker health via heartbeat topic — if no messages for >30 seconds, alert.

### Pitfall 8: Visitor TOTP Code Replay
**What goes wrong:** Visitor uses same TOTP code twice (within validity window) or forwards QR code to someone else. Security gap — one credential, multiple entries.
**Why it happens:** TOTP codes are valid for 30 seconds by default. A visitor could walk through, pass the phone back, and a second person uses the same code.
**Prevention:** Track used TOTP codes in Redis with TTL matching the code window. Reject replayed codes. Combine TOTP with a second factor (badge scan, guard visual verification, or geofence check on mobile app). QR codes for visitor passes should be single-use — mark as consumed on first scan.

---

## Minor Pitfalls

### Pitfall 9: ECharts Memory Leak in Next.js Dashboard
**What goes wrong:** ECharts instances not disposed when component unmounts. Over hours of dashboard viewing, memory accumulates. Dashboard becomes sluggish, then crashes tab.
**Prevention:** Use `echarts-for-react` which handles instance lifecycle. If using raw ECharts: `useEffect(() => { return () => chart.dispose(); }, [])`. Avoid `setOption({}, true)` (full replace with `notMerge: true`) which destroys and recreates internal structure.

### Pitfall 10: Hardcoded MQTT Topic Strings
**What goes wrong:** Topic patterns like `site/${siteId}/door/${doorId}/state` are scattered across services. A topic structure change requires finding and updating every occurrence.
**Prevention:** Centralize MQTT topic templates in a shared constants/utility module. Use a topic builder: `mqttTopics.doorState(siteId, doorId)` → `"site/3/door/12/state"`.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Access Control + Door Management | Door state machine race conditions (Pitfall 2) | Sequence numbers in MQTT messages. State validation. Settling timeout. |
| Incident Management | Audit log unbounded growth (Pitfall 3) | Design retention strategy during schema design, not after data accumulates. |
| AI Summaries + Semantic Search | Ollama model loading latency (Pitfall 6) | Configure `keep_alive` for embedding model. Benchmark model load times in spike. |
| ANPR/LPR | SDK licensing limits (Pitfall 4) | Load test before purchasing. Monitor `/info` endpoint. Implement circuit breaker. |
| Visitor Management | TOTP code replay (Pitfall 8) | Track used codes in Redis. Single-use QR passes. |
| Compliance & Audit | Hash chain verification performance | Per-entity chains, not global. Archive old chunks. Verify chain on read, not on every write. |

## Sources

- Prisma + TimescaleDB integration challenges: documented across prisma-extension-timescaledb issues and community discussions — MEDIUM confidence (community patterns, not official guidance)
- MQTT message ordering: MQTT 3.1.1/5.0 specification (OASIS Standard) — HIGH confidence (QoS levels, retained messages, session persistence)
- Ollama model keep_alive behavior: Ollama official docs — HIGH confidence (default 5-minute keep_alive, configurable per model)
- Plate Recognizer SDK limits: Plate Recognizer official documentation — HIGH confidence (`/info` endpoint, licensing tiers, GPU vs CPU containers)
- TimescaleDB retention policies: TimescaleDB official docs (Context7: /timescale/timescaledb) — HIGH confidence
- pgvector HNSW index behavior: pgvector README and community discussions — MEDIUM confidence (incremental updates supported but suboptimal without periodic rebuild)
- TOTP replay attacks: well-known security pattern (RFC 6238) — HIGH confidence
- ECharts memory management: Apache ECharts documentation — MEDIUM confidence (documented in API but easy to miss in practice)
