# Phase 1: Infrastructure Foundation — Pattern Map

**Mapped:** 2026-07-17
**Files analyzed:** 19 (9 new, 6 modify, 4 config/script)
**Analogs found:** 17 / 19 (2 no-close-analog for cert generation script)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `edge/agent/main.py` | entry-point | event-driven | `edge/agent/agent.py` (main loop) | exact — same project, rewritten |
| `edge/agent/config.py` | config | request-response | `services/ai-preprocessor/app/config.py` | role-match — Python pydantic_settings |
| `edge/agent/models.py` | model | event-driven | `apps/api/src/mqtt/mqtt.types.ts` | role-match — message type definitions |
| `edge/agent/tasks/__init__.py` | utility | — | `services/ai-preprocessor/app/routes/__init__.py` | role-match — empty init |
| `edge/agent/tasks/serial_task.py` | service | streaming | `edge/agent/agent.py` (conn pattern) | partial — same codebase, new pattern |
| `edge/agent/tasks/mqtt_task.py` | service | event-driven | `apps/api/src/mqtt/mqtt.service.ts` | cross-role — same MQTT pattern |
| `edge/agent/tasks/http_task.py` | service | request-response | `edge/agent/agent.py` (send_heartbeat) | exact — extracted function |
| `edge/agent/services/__init__.py` | utility | — | `services/ai-preprocessor/app/__init__.py` | role-match — empty init |
| `edge/agent/services/docker.py` | service | request-response | `edge/agent/agent.py` (Docker helpers) | exact — extracted module |
| `edge/agent/services/metrics.py` | service | request-response | `edge/agent/agent.py` (system_metrics) | exact — extracted module |
| `edge/agent/services/onvif.py` | service | request-response | `edge/agent/services/metrics.py` | partial — new functionality |
| `edge/agent/requirements.txt` | config | — | `edge/agent/requirements.txt` (current) + `services/ai-preprocessor/requirements.txt` | exact — same file modified |
| `edge/agent/Dockerfile` | config | — | `services/ai-preprocessor/Dockerfile` | exact — same Python Docker pattern |
| `docker-compose.yml` | config | — | current Mosquitto service in same file | exact — same file modified |
| `docker-compose.prod.yml` | config | — | current `docker-compose.prod.yml` | exact — same file modified |
| `mosquitto/config/mosquitto.conf` | config | — | RESEARCH.md patterns (no codebase analog) | no-analog — new |
| `mosquitto/config/acl` | config | — | RESEARCH.md patterns (no codebase analog) | no-analog — new |
| `scripts/generate-mqtt-certs.sh` | utility | — | no existing scripts in repo | no-analog — new |
| `.env.example` | config | — | current `.env.example` | exact — same file modified |

## Pattern Assignments

### `edge/agent/main.py` (entry-point, event-driven)

**Analog:** `edge/agent/agent.py` (lines 444–478)

**Imports / Header Pattern** (lines 1–21):
```python
#!/usr/bin/env python3
"""
Oversight Hub — Edge Agent
Monitors the local edge server and reports to the central supervision platform.
"""

from __future__ import annotations

import json
import logging
import os
import signal
import sys
import asyncio
from datetime import datetime, timezone
from pathlib import Path
```

**Logging setup pattern** (lines 25–30):
```python
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S%z",
)
log = logging.getLogger("edge-agent")
```

**Main entry point pattern** (lines 470–478):
```python
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("Edge Agent stopped by user")
        sys.exit(0)
    except Exception as exc:
        log.critical("Edge Agent crashed: %s", exc, exc_info=True)
        sys.exit(1)
```

**Async rewrite main pattern** (from RESEARCH.md — standard asyncio pattern):
```python
async def main() -> None:
    shutdown = asyncio.Event()
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, shutdown.set)
    
    tasks = [
        asyncio.create_task(serial_reader(shutdown, "/dev/ttyUSB0")),
        asyncio.create_task(mqtt_handler(shutdown)),
        asyncio.create_task(http_reporting(shutdown)),
    ]
    await asyncio.gather(*tasks, return_exceptions=True)
```

**Key pattern: `asyncio.run(main())` in `if __name__` block** — replaces the synchronous `while True: schedule.run_pending(); time.sleep(1)` loop.

---

### `edge/agent/config.py` (config, request-response)

**Analog:** `services/ai-preprocessor/app/config.py` (lines 1–25)

**Pydantic Settings pattern** (Python analog of NestJS Joi validation):
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ── MQTT ─────────────────────────────────────────────────────
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 8883
    MQTT_USERNAME: str = ""
    MQTT_PASSWORD: str = ""
    MQTT_TLS_CA_CERT: str = "/app/certs/ca.crt"
    
    # ── HTTP / API ──────────────────────────────────────────────
    SUPERVISION_API_URL: str = "http://localhost:4000"
    EDGE_AGENT_SECRET: str = ""
    
    # ── Serial ──────────────────────────────────────────────────
    SERIAL_PORTS: list[str] = ["/dev/ttyUSB0"]
    SERIAL_BAUD: int = 9600
    
    # ── Agent Identity ──────────────────────────────────────────
    SITE_ID: str = "unknown"
    AGENT_ID: str = "edge-unknown"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

**TypeScript analog** — `apps/api/src/config/validation.ts` (lines 1–47) shows the same pattern using Joi:
```typescript
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  // ... consistent pattern of env var → default
});
```

---

### `edge/agent/models.py` (model, event-driven)

**Analog:** `apps/api/src/mqtt/mqtt.types.ts` (lines 1–39) + `packages/shared/src/types/access.types.ts` (lines 43–59)

**Pydantic message model pattern** (Python analog of TypeScript interfaces):
```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DoorStatePayload(BaseModel):
    """Door state event published to site/{siteId}/door/{doorId}/state."""
    device_id: Optional[str] = None
    controller_id: Optional[str] = None
    state: str
    sequence: int
    timestamp: Optional[str] = None

class BadgeReadPayload(BaseModel):
    """Badge read event published to site/{siteId}/reader/{readerId}/badge."""
    badge_number: str
    sequence: int
    device_id: Optional[str] = None
    timestamp: Optional[str] = None

class HealthPayload(BaseModel):
    """Controller health report published to site/{siteId}/controller/{controllerId}/health."""
    controller_id: str
    online: bool
    uptime: int
    last_seen: str
    sequence: int
```

**TypeScript analog** — `apps/api/src/mqtt/mqtt.types.ts` (lines 8–21):
```typescript
export interface DoorStatePayload {
  deviceId?: string;
  controller_id?: string;
  state: string;
  sequence: number;
  timestamp?: string;
}

export interface BadgeReadPayload {
  badgeNumber: string;
  sequence: number;
  deviceId?: string;
  timestamp?: string;
}
```

**Door state constants** — from `packages/shared/src/constants/door-states.ts` (lines 1–10):
```typescript
export const DOOR_STATES = {
  LOCKED: "locked",
  UNLOCKED: "unlocked",
  HELD_OPEN: "held-open",
  FORCED: "forced",
  UNSECURED: "unsecured",
  DESYNCHRONIZED: "desynchronized",
} as const;
```

---

### `edge/agent/tasks/serial_task.py` (service, streaming)

**Analog:** `edge/agent/agent.py` (no direct serial code — but the Docker connection pattern at lines 112–161 shows the error handling style) + RESEARCH.md patterns

**pyserial-asyncio reader pattern** (RESEARCH.md lines 367–386):
```python
import serial_asyncio
import asyncio

async def serial_reader(shutdown: asyncio.Event, device: str, baud: int = 9600):
    """Read OSDP frames from serial port."""
    reader, writer = await serial_asyncio.open_serial_connection(
        url=device,
        baudrate=baud,
    )
    try:
        while not shutdown.is_set():
            # Read the OSDP frame start byte
            data = await asyncio.wait_for(reader.readexactly(1), timeout=1.0)
            # read rest of frame...
    except asyncio.TimeoutError:
        pass  # expected — just loop for next read
    finally:
        writer.close()
        await writer.wait_closed()
```

**Error handling pattern** (from `edge/agent/agent.py` lines 278–287 — httpx error handling):
```python
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post(url, json=payload)
            log.info("Heartbeat sent — status %d", resp.status_code)
    except httpx.ConnectError:
        log.error("Heartbeat failed — cannot connect to %s", url)
    except httpx.TimeoutException:
        log.error("Heartbeat failed — timeout contacting %s", url)
    except Exception as exc:
        log.error("Heartbeat failed: %s", exc)
```

---

### `edge/agent/tasks/mqtt_task.py` (service, event-driven)

**Analog:** `apps/api/src/mqtt/mqtt.service.ts` (lines 1–127)

**aiomqtt reconnect loop pattern** (RESEARCH.md lines 217–251):
```python
import asyncio
import aiomqtt
import ssl

async def mqtt_handler(shutdown: asyncio.Event, broker: str, port: int, 
                       username: str, password: str, site_id: str) -> None:
    buffer: list[bytes] = []
    reconnect_interval = 5
    
    tls_params = aiomqtt.TLSParameters(
        ca_certs="/app/certs/ca.crt",
        certfile=None,       # No client cert — password auth only (D-06)
        keyfile=None,
        cert_reqs=ssl.CERT_REQUIRED,
        tls_version=ssl.PROTOCOL_TLS,
        ciphers=None,
    )
    
    while not shutdown.is_set():
        try:
            async with aiomqtt.Client(
                hostname=broker,
                port=port,
                username=username,
                password=password,
                tls_params=tls_params,
            ) as client:
                # Replay buffered messages
                while buffer and not shutdown.is_set():
                    await client.publish(f"site/{site_id}/...", payload=buffer.pop(0))
                # Subscribe and listen
                async with client.messages() as messages:
                    await client.subscribe(f"site/{site_id}/door/+/cmd")
                    async for message in messages:
                        if shutdown.is_set():
                            break
                        # route to door controller via serial task...
        except aiomqtt.MqttError as e:
            if shutdown.is_set():
                break
            log.warning("MQTT disconnected: %s — reconnecting in %ds", e, reconnect_interval)
            await asyncio.sleep(reconnect_interval)
```

**Topic pattern** (from `apps/api/src/mqtt/mqtt-topics.ts` lines 5–22):
```typescript
export const MqttTopics = {
  doorState: (siteId: string, doorId: string) =>
    `site/${siteId}/door/${doorId}/state`,
  readerBadge: (siteId: string, readerId: string) =>
    `site/${siteId}/reader/${readerId}/badge`,
  controllerHealth: (siteId: string, controllerId: string) =>
    `site/${siteId}/controller/${controllerId}/health`,
  // Wildcard subscriptions
  allDoorStates: () => "site/+/door/+/state",
  allReaderBadges: () => "site/+/reader/+/badge",
  allControllerHealth: () => "site/+/controller/+/health",
} as const;
```

**Sequence dedup pattern** (from `apps/api/src/mqtt/mqtt.service.ts` lines 82–93):
```typescript
      const deviceId = message.deviceId || message.controller_id;
      if (deviceId && message.sequence !== undefined) {
        const lastSeq = this.lastSequencePerDevice.get(deviceId) ?? -1;
        if (message.sequence <= lastSeq) {
          this.logger.warn(
            `Out-of-sequence message discarded: ${deviceId} seq=${message.sequence}, last=${lastSeq}`,
          );
          return;
        }
        this.lastSequencePerDevice.set(deviceId, message.sequence);
      }
```

---

### `edge/agent/tasks/http_task.py` (service, request-response)

**Analog:** `edge/agent/agent.py` `send_heartbeat()` (lines 261–288) and `check_for_updates()` (lines 308–357)

**aiohttp heartbeat pattern** (RESEARCH.md lines 389–407):
```python
import aiohttp
import asyncio

async def send_heartbeat(shutdown: asyncio.Event, api_url: str, agent_id: str):
    async with aiohttp.ClientSession() as session:
        while not shutdown.is_set():
            payload = {"clientId": agent_id, "timestamp": "...", ...}
            try:
                async with session.post(
                    f"{api_url}/api/heartbeat",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    log.info("Heartbeat: %d", resp.status)
            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                log.error("Heartbeat failed: %s", e)
            await asyncio.sleep(60)
```

**Error handling pattern** (from `edge/agent/agent.py` lines 278–287):
```python
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post(url, json=payload)
            log.info("Heartbeat sent — status %d", resp.status_code)
    except httpx.ConnectError:
        log.error("Heartbeat failed — cannot connect to %s", url)
    except httpx.TimeoutException:
        log.error("Heartbeat failed — timeout contacting %s", url)
    except Exception as exc:
        log.error("Heartbeat failed: %s", exc)
```

---

### `edge/agent/services/docker.py` (service, request-response)

**Analog:** `edge/agent/agent.py` Docker helpers (lines 112–161)

**Docker client + container operations pattern** (exact extraction from current agent):
```python
import docker  # type: ignore

def _docker_client():
    """Return a Docker client, or None if Docker is unavailable."""
    try:
        import docker  # type: ignore
        return docker.from_env()
    except Exception as exc:
        log.error("Docker client unavailable: %s", exc)
        return None

def container_running(name: str) -> bool:
    """Return True if a Docker container with *name* is running."""
    client = _docker_client()
    if client is None:
        return False
    try:
        c = client.containers.get(name)
        return c.status == "running"
    except Exception:
        return False

def restart_container(name: str) -> bool:
    """Attempt to restart a Docker container. Returns True on success."""
    client = _docker_client()
    if client is None:
        return False
    try:
        c = client.containers.get(name)
        c.restart(timeout=30)
        log.info("Restarted container %s", name)
        return True
    except Exception as exc:
        log.error("Failed to restart container %s: %s", name, exc)
        return False
```

---

### `edge/agent/services/metrics.py` (service, request-response)

**Analog:** `edge/agent/agent.py` `system_metrics()` (lines 167–216)

**System metrics pattern** (exact extraction from current agent):
```python
def system_metrics() -> dict:
    """Collect CPU, RAM and disk usage."""
    metrics: dict = {"cpu": 0.0, "ram": 0.0, "disk": 0.0, "ramTotal": 0, "ramUsed": 0}
    
    try:
        # CPU %
        with open("/proc/stat", "r") as f:
            line = f.readline()
        parts = [int(x) for x in line.split()[1:]]
        idle = parts[3]
        total = sum(parts)
        await asyncio.sleep(0.1)  # Changed to async
        with open("/proc/stat", "r") as f:
            line2 = f.readline()
        parts2 = [int(x) for x in line2.split()[1:]]
        # ...
    except Exception:
        pass
    
    # Memory from /proc/meminfo
    # Disk from shutil.disk_usage("/")
    return metrics
```

**Service status pattern** (from `edge/agent/agent.py` lines 219–225):
```python
def service_status(cfg: dict) -> dict:
    """Return a dict of service_name → running(bool)."""
    services_cfg: dict = cfg.get("services", {})
    status: dict = {}
    for key, container_name in services_cfg.items():
        status[key] = container_running(container_name)
    return status
```

---

### `edge/agent/requirements.txt` (config)

**Analog:** Current `edge/agent/requirements.txt` (4 lines) → modified version

**Current pattern:**
```
httpx>=0.27
psutil>=5.9
docker>=7.0
schedule>=1.2
```

**Target pattern** (from RESEARCH.md Standard Stack):
```
# Async drivers
aiomqtt>=2.5.1
pyserial-asyncio>=0.6
aiohttp>=3.14.1

# System monitoring (keep from current)
psutil>=5.9

# Docker SDK (keep from current)
docker>=7.0
```

---

### `edge/agent/Dockerfile` (config)

**Analog:** Current `edge/agent/Dockerfile` + `services/ai-preprocessor/Dockerfile`

**Current pattern** (6 lines):
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "agent.py"]
```

**Target pattern** (CMD changed for async entry point):
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Install openssl for MQTT TLS cert generation at runtime
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
CMD ["python", "-m", "main"]
```

---

### `docker-compose.yml` (config)

**Analog:** Current `docker-compose.yml` Mosquitto service (lines 109–118)

**Current Mosquitto service** (no TLS, no auth):
```yaml
  mosquitto:
    image: eclipse-mosquitto:2.0
    container_name: oversight-mosquitto
    expose:
      - "1883"
      - "9001"
    volumes:
      - mosquitto_data:/mosquitto/data
      - mosquitto_log:/mosquitto/log
    restart: unless-stopped
```

**Target Mosquitto service** (with TLS + auth + init container pattern):
```yaml
  mosquitto-init:
    image: alpine:3
    container_name: oversight-mosquitto-init
    volumes:
      - mosquitto_certs:/certs
      - mosquitto_config:/config
    entrypoint: ["/bin/sh", "/scripts/generate-mqtt-certs.sh"]
    environment:
      MOSQUITTO_HOST: mosquitto
    restart: no

  mosquitto:
    image: eclipse-mosquitto:2.0
    container_name: oversight-mosquitto
    depends_on:
      mosquitto-init:
        condition: service_completed_successfully
    ports:
      - "8883:8883"
    volumes:
      - mosquitto_certs:/mosquitto/certs:ro
      - ./mosquitto/config/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
      - ./mosquitto/config/acl:/mosquitto/config/acl:ro
      - mosquitto_data:/mosquitto/data
      - mosquitto_log:/mosquitto/log
    restart: unless-stopped
```

**Environment variable pattern** (from `docker-compose.yml` lines 20–41 — how env vars are passed):
```yaml
    environment:
      DATABASE_URL: ${DATABASE_URL:?DATABASE_URL is required}
      REDIS_HOST: ${REDIS_HOST:?REDIS_HOST is required}
      REDIS_PORT: ${REDIS_PORT:-6379}
```

---

### `docker-compose.prod.yml` (config)

**Analog:** Current `docker-compose.prod.yml`

**Target additions** — Mosquitto service similar to above, plus Edge Agent service:
```yaml
  # ─── MQTT Broker for Door Controller Communication ───
  mosquitto-init:
    image: alpine:3
    container_name: oversight-mosquitto-init
    networks:
      - backend
    volumes:
      - mosquitto_certs:/certs
    entrypoint: ["/bin/sh", "/scripts/generate-mqtt-certs.sh"]
    restart: no

  mosquitto:
    image: eclipse-mosquitto:2.0
    container_name: oversight-mosquitto
    depends_on:
      mosquitto-init:
        condition: service_completed_successfully
    networks:
      - backend
    ports:
      - "${MOSQUITTO_TLS_PORT:-8883}:8883"
    volumes:
      - mosquitto_certs:/mosquitto/certs:ro
      - ./mosquitto/config/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
      - ./mosquitto/config/acl:/mosquitto/config/acl:ro
      - mosquitto_data:/mosquitto/data
      - mosquitto_log:/mosquitto/log
    restart: unless-stopped
```

**Named volumes pattern** (from `docker-compose.prod.yml` lines 191–201):
```yaml
volumes:
  mosquitto_certs:
    driver: local
  mosquitto_data:
    driver: local
  mosquitto_log:
    driver: local
```

---

### `mosquitto/config/mosquitto.conf` (config) — New, no codebase analog

**Pattern** (from RESEARCH.md lines 257–269):
```
listener 1883 localhost        # Internal, no TLS
listener 8883                   # External, TLS

cafile /mosquitto/certs/ca.crt
certfile /mosquitto/certs/server.crt
keyfile /mosquitto/certs/server.key

require_certificate false      # Password auth only (D-06)
password_file /mosquitto/config/passwd
acl_file /mosquitto/config/acl

allow_anonymous false
```

---

### `mosquitto/config/acl` (config) — New, no codebase analog

**Pattern** (from RESEARCH.md lines 272–279):
```
# Per-site ACLs: user -> topic pattern
user agent-site-abc
topic read site/abc/door/+/cmd
topic write site/abc/door/+/state
topic write site/abc/reader/+/badge
topic write site/abc/controller/+/health
```

---

### `.env.example` (config)

**Analog:** Current `.env.example` MQTT section (lines 287–301)

**Current MQTT section:**
```
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                               MQTT (Mosquitto)                              ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# URL du broker MQTT (Mosquitto)
# [OPTIONNEL] Défaut : mqtt://localhost:1883
MQTT_BROKER_URL=mqtt://localhost:1883

# Nom d'utilisateur broker MQTT (laisser vide si pas d'authentification)
# [OPTIONNEL]
MQTT_USERNAME=

# Mot de passe broker MQTT (laisser vide si pas d'authentification)
# [OPTIONNEL]
MQTT_PASSWORD=
```

**Target pattern** (add TLS + internal CA variables):
```
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                               MQTT (Mosquitto)                              ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# TLS port pour le broker MQTT (Mosquitto)
# [OPTIONNEL] Défaut : 8883
MOSQUITTO_TLS_PORT=8883

# Mot de passe pour l'utilisateur MQTT interne (API)
# [REQUIS pour l'authentification MQTT]
MOSQUITTO_PASSWORD=CHANGE_ME_MOSQUITTO_PASSWORD

# Identité Edge Agent
# [REQUIS] Identifiant du site pour le routage MQTT
EDGE_SITE_ID=CHANGE_ME_SITE_ID

# Identifiant de l'agent
# [OPTIONNEL] Défaut : edge-unknown
EDGE_AGENT_ID=edge-CHANGE_ME_SITE_ID

# Credentials MQTT pour l'Edge Agent
# [REQUIS] Générés par l'API lors de l'enrôlement
MQTT_USERNAME=agent-CHANGE_ME_SITE_ID
MQTT_PASSWORD=CHANGE_ME_MQTT_AGENT_PASSWORD

# URL de l'API de supervision
# [OPTIONNEL] Défaut : http://localhost:4000
EDGE_SUPERVISION_URL=http://localhost:4000

# Clé secrète pour l'authentification des edge agents
# [REQUIS pour le mode edge]
EDGE_AGENT_SECRET=CHANGE_ME_EDGE_AGENT_SECRET
```

---

### `scripts/generate-mqtt-certs.sh` (utility) — New, no codebase analog

**Design pattern** — This is greenfield. Must follow the project's existing shell conventions (no existing scripts to copy). The script generates:
1. Self-signed CA (ca.key + ca.crt) — 10-year validity
2. Server cert (server.key + server.crt) signed by CA
3. Stores output to a mounted volume at `/certs/`

---

## Shared Patterns

### Logging (Python)
**Source:** `edge/agent/agent.py` lines 25–30
**Apply to:** All new Python files (`main.py`, all tasks, services, config)

```python
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S%z",
)
log = logging.getLogger("edge-agent")
```

### Error Handling (Python — async)
**Source:** `edge/agent/agent.py` lines 278–287 (sync pattern) + RESEARCH.md (async adaptation)
**Apply to:** All async task functions

```python
try:
    async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as resp:
        log.info("Operation result: %d", resp.status)
except (aiohttp.ClientError, asyncio.TimeoutError) as e:
    log.error("Operation failed: %s", e)
```

### Graceful Shutdown
**Source:** RESEARCH.md lines 187–212
**Apply to:** `edge/agent/main.py`, all task files

```python
shutdown = asyncio.Event()
loop = asyncio.get_event_loop()
for sig in (signal.SIGTERM, signal.SIGINT):
    loop.add_signal_handler(sig, shutdown.set)

async def some_task(shutdown: asyncio.Event):
    while not shutdown.is_set():
        # do work...
        await asyncio.sleep(1)
    # cleanup: close connections, flush buffers
```

### Topic Naming Convention
**Source:** `apps/api/src/mqtt/mqtt-topics.ts` lines 5–22
**Apply to:** `edge/agent/tasks/mqtt_task.py`, `mosquitto/config/acl`

```
site/{siteId}/door/{doorId}/state
site/{siteId}/door/{doorId}/cmd
site/{siteId}/reader/{readerId}/badge
site/{siteId}/controller/{controllerId}/health
```

Edge Agent publishes: `state`, `badge`, `health`
Edge Agent subscribes: `cmd` (door commands from API)

### MQTT Sequence Number Dedup
**Source:** `apps/api/src/mqtt/mqtt.service.ts` lines 82–93
**Apply to:** `edge/agent/models.py` — all event payloads must include `sequence` field

Edge Agent must include `sequence` integer in every MQTT message. The API's `MqttService` deduplicates based on this. The agent itself should track outgoing sequence numbers per device.

### Docker Compose Env Var Pattern
**Source:** `docker-compose.yml` lines 20–41
**Apply to:** All new Compose services

```yaml
    environment:
      MQTT_BROKER_HOST: ${MQTT_BROKER_HOST:?MQTT_BROKER_HOST is required}
      MQTT_BROKER_PORT: ${MQTT_BROKER_PORT:-8883}
      EDGE_SITE_ID: ${EDGE_SITE_ID:?EDGE_SITE_ID is required}
```

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/generate-mqtt-certs.sh` | utility | — | No existing shell scripts in the repo — greenfield |
| `mosquitto/config/mosquitto.conf` | config | — | Mosquitto config is new to this phase — pattern from RESEARCH.md |
| `mosquitto/config/acl` | config | — | MQTT ACL file format is domain-specific — pattern from RESEARCH.md |

For these files, the planner should use the concrete config excerpts and patterns from RESEARCH.md (lines 257–279) which are based on the Mosquitto documentation.

## Metadata

**Analog search scope:** `edge/agent/`, `apps/api/src/mqtt/`, `apps/api/src/config/`, `services/ai-preprocessor/`, `packages/shared/src/schemas/`, `packages/shared/src/types/`, `packages/shared/src/constants/`, `docker-compose.yml`, `docker-compose.prod.yml`, `.env.example`
**Files scanned:** ~50 files across 10 directories
**Pattern extraction date:** 2026-07-17
