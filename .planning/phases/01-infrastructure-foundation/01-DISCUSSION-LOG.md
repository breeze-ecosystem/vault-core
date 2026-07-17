# Phase 1: Infrastructure Foundation — Discussion Log

**Date:** 2026-07-17
**Mode:** Default (interactive)

## Areas Discussed

### 1. Edge Agent Async Architecture
| Question | Options | Selection |
|----------|---------|-----------|
| Async runtime foundation | asyncio + async libs / ThreadPoolExecutor + sync / Trio/AnyIO | **asyncio + async libs** (aiohttp, asyncio-mqtt, pyserial-asyncio) |
| MQTT client library | asyncio-mqtt / paho-mqtt threaded / paho with executor wrapper | **asyncio-mqtt** |
| OSDP serial communication | pyserial-asyncio raw / abstracted OSDP bridge / existing OSDP library | **pyserial-asyncio raw serial** |
| Startup/shutdown lifecycle | Graceful signals / simple start-stop / Docker healthcheck | **Graceful lifecycle with signals** |
| Concurrency model | Single process all coroutines / subprocess per protocol / multi-process supervisor | **Single process, all coroutines** (agent recommended, user deferred) |
| Testing approach | Docker simulators / mocked layers / hybrid | **Hybrid: unit + OSDP simulator** (agent recommended, user deferred) |
| Docker image base | python:3.12-slim / alpine / full | **python:3.12-slim** (agent recommended, user deferred) |

### 2. MQTT Security Model
| Question | Options | Selection |
|----------|---------|-----------|
| MQTT authentication | Username/password + TLS / mutual TLS / both | **Username/password + TLS** |
| TLS certificate type | Self-signed internal CA / Let's Encrypt / Docker managed | **Self-signed internal CA** |
| Topic-level ACLs | Broker-level per site / per-client patterns / no ACLs | **Broker-level per site** (agent recommended, user deferred) |
| Credential rotation | Env vars + restart / SIGHUP hot reload / external auth plugin | **Env vars + Docker restart** (agent recommended, user deferred) |

### 3. Docker Networking Strategy
| Question | Options | Selection |
|----------|---------|-----------|
| Edge Agent networking mode | Host / macvlan / bridge + relay | **Host networking** |
| Serial device mapping | --device per port / privileged / bind /dev | **--device per port** (agent recommended, user deferred) |
| Mosquitto broker location | Centralized on server / local per agent | **Centralized on server** |
| ONVIF multicast handling | Edge Agent discovers/reports / API on host net / dedicated bridge container | **Edge Agent discovers, reports via API** (agent recommended, user deferred) |

### 4. Edge Agent ↔ Mosquitto Topology
| Question | Options | Selection |
|----------|---------|-----------|
| Topic naming convention | Per-site hierarchical / flat device ID / agent prefix | **Per-site hierarchical** (`site/{siteId}/...`) |
| Agent authentication to MQTT | Per-agent credentials / shared org credential / JWT auth | **Per-agent credentials from API** (agent recommended, user deferred) |
| Offline behavior | Buffer and replay / discard / SQLite persistence | **Buffer in-memory, replay on reconnect** |

## User Notes
- User explicitly stated they are not a developer and delegated technical implementation decisions to the agent
- Several decisions marked as "agent recommended, user deferred" — the agent should use best judgment during planning
- User wants recommendations noted and decisions locked without excessive technical questioning

## Deferred Ideas
None — discussion stayed within phase scope.

---
*Phase 1-Infrastructure Foundation discussion completed 2026-07-17*
