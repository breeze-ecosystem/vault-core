# Technology Stack: v3.0 Hardware Integration

**Project:** Oversight Hub
**Researched:** 2026-07-17

## Recommended Stack

### Core Framework (existing, unchanged)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| NestJS | 10.4.8 | REST API + WebSocket + business logic | Existing. Protocol adaptation, state machines, event routing |
| Next.js | 14.2.15 | Web Dashboard | Existing. Camera discovery UI, door control UI |
| Expo | SDK 54 | Mobile app | Existing. Guard workflows, QR scanning, door control |
| Fastify | (NestJS adapter) | HTTP server for API | Existing. Sub-ms latency for access control evaluation |

### Database (existing, extended)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL 16 | (existing) | Relational data, ONVIF credentials encrypted at rest | Existing. Add `manufacturer`, `serialNumber`, `onvif*` fields to Camera |
| TimescaleDB | (existing extension) | Time-series: door_state_log, camera_health, controller_health | Existing hypertables for equipment monitoring |
| Redis 7 | (existing) | Current state, sequence dedup, command pending, debounce | Existing. Add `door:command-pending:*` keys |
| Qdrant | (existing) | Vector embeddings for AI event search | Unchanged |

### Infrastructure (existing, extended)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Mosquitto (MQTT) | 2.0 | Edge Agent ↔ API transport | Already deployed. Add command topics, discovery topics |
| Caddy | 2 | Reverse proxy + TLS | Existing. Add kiosk subdomain |
| Docker Compose | (existing) | Container orchestration | Existing. Add kiosk service, Zigbee2MQTT service |
| BullMQ | 5.30.0 | Async job processing | Existing. Add onvif-discovery queue, kiosk-sync queue |

### New/Modified Libraries

#### Edge Agent (Python) — NEW dependencies
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `pyserial` | >=3.5 | RS-485 serial port communication | Standard Python serial library, wide device support |
| `pyserial-asyncio` | >=0.6 | Async serial I/O | Needed for concurrent operation with MQTT |
| `onvif-zeep` | >=3.1 | ONVIF SOAP client | Mature library for ONVIF device management |
| `paho-mqtt` | >=2.0 | MQTT client with async support | Publish/subscribe for agent ↔ API communication |
| `aiohttp` | >=3.9 | Async HTTP client | Heartbeat + API communication without blocking |
| `cups-api` | >=2.0 | CUPS print job management | Badge printing from kiosk sidecar |
| `pycryptodome` | >=3.20 | AES-128 encryption for OSDP SCB | Required for OSDP secure channel |
| `asyncio` | stdlib | Async I/O event loop | Replace schedule library for concurrent hardware + MQTT |

#### NestJS API — NEW dependencies
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| No new npm packages | — | OSDP/ONVIF adapters use existing interfaces | ProtocolAdapter pattern already exists |

#### Kiosk Container — NEW dependencies
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `express` | >=4.18 | Sidecar API server | Lightweight, familiar, serves kiosk SPA + handles printing |
| `socket.io` | (use existing version) | Kiosk ↔ Sidecar real-time | Already used by Dashboard/Mobile |
| `socket.io-client` | (use existing version) | Sidecar ↔ API real-time | Same pattern as existing apps |
| `better-sqlite3` | >=11.0 | Local offline queue | Synchronous SQLite for kiosk offline mode |
| `cups` | system | IPP print service | Standard Linux printing |
| `puppeteer` | >=22.0 | Badge template PDF generation | HTML-to-PDF for badge rendering |
| `qrcode` | >=1.5 | QR code generation | Local QR rendering for badge |
| `lucide-react` | (use existing version) | Kiosk UI icons | Already in design system |

### Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| **Edge Agent language** | Python (extend existing) | Node.js | Python has best ONVIF/pyserial library support. Rewriting agent in JS adds risk. |
| **Kiosk deployment** | Standalone container | In-browser (Dashboard page) | Can't access USB printers or cameras from browser. Browser sandbox blocks hardware. |
| **Kiosk framework** | React SPA + Express sidecar | Electron app | Electron is heavy (~150MB download). Container keeps deployment simple (docker pull + run). |
| **Hardware abstraction** | ProtocolAdapter in API (existing) | Edge Agent handles all logic | API already has state machines, event bus, WebSocket. Duplicating in Python adds maintenance burden. |
| **Transport** | MQTT (existing mosquitto) | gRPC / REST polling | MQTT is already deployed, pub/sub is ideal for hardware events, low overhead. |
| **Smart lock bridge** | Zigbee2MQTT (sidecar container) | Vendor cloud APIs | Cloud APIs introduce latency, require internet. Zigbee2MQTT is local and mature. |

## Installation

### Edge Agent (modified Dockerfile)
```dockerfile
FROM python:3.12-slim

# System dependencies for hardware
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcups2-dev \
    libsystemd-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Hardware modules
COPY hardware/ ./hardware/
COPY agent.py .

CMD ["python", "-m", "uvicorn", "agent:app", "--host", "0.0.0.0", "--port", "9000"]
# NOTE: agent.py rewritten with asyncio, uvicorn for async HTTP
```

```txt
# requirements.txt (extended)
httpx>=0.27
psutil>=5.9
docker>=7.0
schedule>=1.2
pyserial>=3.5
pyserial-asyncio>=0.6
paho-mqtt>=2.0
aiohttp>=3.9
onvif-zeep>=3.1
cups-api>=2.0
pycryptodome>=3.20
```

### Kiosk Container (new)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
RUN apk add --no-cache cups cups-filters cups-libs ghostscript
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/templates ./templates
EXPOSE 3300
CMD ["node", "server/index.js"]
```

## Sources

- **HIGH:** Existing codebase verification — MqttService, ProtocolAdapter, DoorService, SupervisionService, EquipmentService, docker-compose.yml with mosquitto
- **HIGH:** [pyserial documentation](https://pyserial.readthedocs.io/) — RS-485 serial port management in Python
- **HIGH:** [ONVIF Core Spec](https://www.onvif.org/specs/core/ONVIF-Core-Specification-v230.pdf) — WS-Discovery, device management, media streaming
- **HIGH:** [Zigbee2MQTT documentation](https://www.zigbee2mqtt.io/guide/usage/mqtt_topics_and_messages.html) — MQTT topic structure for device events
- **MEDIUM:** [Docker networking for ONVIF](https://docs.docker.com/engine/network/drivers/bridge/) — multicast isolation in bridge networks
- **MEDIUM:** [CUPS in Docker](https://github.com/agucova/docker-cups) — community pattern for CUPS containerization
- **MEDIUM:** [onvif-zeep PyPI](https://pypi.org/project/onvif-zeep/) — ONVIF SOAP client library, community-maintained
