---
phase: 01-infrastructure-foundation
plan: 01
subsystem: mqtt-infrastructure
tags:
  - mqtt
  - mosquitto
  - tls
  - docker-compose
  - edge-agent
  - networking
dependency_graph:
  requires: []
  provides:
    - MQTT broker with TLS + auth for edge agents
    - Docker Compose edge-agent service definition
    - Self-signed CA + server cert generation
  affects:
    - 01-02-PLAN (Edge Agent rewrite)
    - 02-HWR hardware integration phase
tech-stack:
  added:
    - Mosquitto 2.0 (eclipse-mosquitto) with TLS + ACL
    - openssl-based cert generation script (Alpine-compatible)
    - Edge Agent service with host networking
  patterns:
    - Init container pattern for one-time cert generation (alpine:3, exit-once)
    - Per-site MQTT ACL with topic namespace isolation
    - --device flags for serial passthrough (not --privileged)
key-files:
  created:
    - mosquitto/config/mosquitto.conf
    - mosquitto/config/acl
    - scripts/generate-mqtt-certs.sh
  modified:
    - docker-compose.yml
    - docker-compose.prod.yml
    - .env.example
decisions:
  - Use init container pattern (mosquitto-init) for cert generation instead of volume pre-seeding
  - Password auth only, no mutual TLS (require_certificate false) per D-06
  - explicit --device flags, not --privileged mode per D-11
  - mosquitto_certs: named volume for cert persistence across restarts
metrics:
  duration: ~15 min
  completed_date: 2026-07-17
requirements: [INF-02, INF-03]
---

# Phase 1 Plan 1: MQTT Broker Security & Docker Networking

Production-hardened Mosquitto MQTT broker with TLS encryption, username/password authentication, and per-site topic ACLs. Updated Docker Compose files with serial device passthrough and multicast UDP support via `--network=host`.

## Summary

This plan established the MQTT infrastructure foundation: a secure Mosquitto broker configuration (TLS on 8883, password auth, per-site ACLs), an idempotent certificate generation script (self-signed CA + server cert, 10-year validity), and updated Docker Compose definitions for both dev and production environments. The edge-agent service template is defined with host networking and explicit serial device passthrough, ready for Phase 2 hardware integration.

## Task Results

### Task 1: Mosquitto Security Config Files + TLS Cert Generation Script

**Files created:** `mosquitto/config/mosquitto.conf`, `mosquitto/config/acl`, `scripts/generate-mqtt-certs.sh`

- **mosquitto.conf**: Listener 1883 on localhost (no TLS, internal API), listener 8883 with TLS (CA/server cert paths), `password_file`, `acl_file`, `allow_anonymous false`, full logging
- **ACL file**: Per-site topic rules — `user agent-{siteId}` with read access to `site/{siteId}/door/+/cmd` and write access to `site/{siteId}/door/+/state`, `site/{siteId}/reader/+/badge`, `site/{siteId}/controller/+/health`. Two sample entries (site-abc, site-xyz).
- **Cert script**: Alpine-compatible, idempotent (preserves existing certs), generates CA (4096-bit RSA, 10-year) and server cert (2048-bit, signed by CA), restrictive permissions (600 keys, 644 certs), `set -e` for error handling

**Verification:** ✅ mosquitto.conf contains all required directives. ✅ ACL has per-site patterns. ✅ Script is executable and passes `bash -n` syntax check.

**Commit:** `3170999`

### Task 2: Update docker-compose.yml

**File modified:** `docker-compose.yml`

- Added `mosquitto-init`: alpine:3 init container running cert generation script, `restart: no` (exit-once)
- Updated `mosquitto`: depends_on with `condition: service_completed_successfully`, port `8883:8883`, cert/config volume mounts, `MOSQUITTO_PASSWORD` env var
- Added `edge-agent`: `network_mode: host`, explicit `devices: [/dev/ttyUSB0, /dev/ttyAMA0]`, all MQTT/edge env vars with `${VAR:?}` required validation pattern
- Added `mosquitto_certs:` named volume

**Verification:** ✅ Valid YAML. ✅ All 3 services present. ✅ host networking on edge-agent. ✅ No `--privileged` flag. ✅ No `allow_anonymous true`.

**Commit:** `0ad6973`

### Task 3: Update docker-compose.prod.yml and .env.example

**Files modified:** `docker-compose.prod.yml`, `.env.example`

- **docker-compose.prod.yml**: Same mosquitto-init + mosquitto + edge-agent services with production networking (`networks: [backend]`), parameterized `MOSQUITTO_TLS_PORT`, all three named volumes (certs, data, log)
- **.env.example**: Replaced MQTT section with 8 new env vars: `MOSQUITTO_TLS_PORT`, `MOSQUITTO_PASSWORD`, `EDGE_SITE_ID`, `EDGE_AGENT_ID`, `MQTT_USERNAME=agent-CHANGE_ME_SITE_ID`, `MQTT_PASSWORD`, `EDGE_SUPERVISION_URL`, `EDGE_AGENT_SECRET` — all with French descriptions and `[REQUIS]`/`[OPTIONNEL]` tags per project convention
- `MQTT_BROKER_URL` preserved with `[OBSOLÈTE]` deprecation notice for API backward compatibility

**Verification:** ✅ Both files valid YAML/format. ✅ All new env vars present. ✅ French descriptions. ✅ [OBSOLÈTE] tag present.

**Commit:** `01aec14`

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigation Status

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-INF-01 | allow_anonymous false, password_file, localhost-only 1883 | ✅ mosquitto.conf |
| T-INF-02 | TLS listener on 8883 with CA/server cert | ✅ mosquitto.conf + cert script |
| T-INF-03 | --device flags (not --privileged) for serial ports | ✅ docker-compose.yml/prod.yml |
| T-INF-04 | Per-site ACLs restrict agents to their site namespace | ✅ mosquitto/config/acl |
| T-INF-05 | Credentials passed via env vars (Phase 1 acceptable) | ✅ .env.example documents all vars |
| T-INF-06 | Username/password auth via password_file | ✅ mosquitto.conf + init passwd setup |
| T-INF-SC | Official Docker images only (alpine:3, eclipse-mosquitto:2.0) | ✅ docker-compose.yml/prod.yml |

## Threat Flags

None — all security-relevant surface is covered by the plan's threat model.

## Known Stubs

None.

## Self-Check

All created files exist with correct content:

- ✅ `mosquitto/config/mosquitto.conf` — listener 8883, cafile, certfile, keyfile, password_file, acl_file, allow_anonymous false
- ✅ `mosquitto/config/acl` — user agent-{siteId} pattern, read/write topic rules
- ✅ `scripts/generate-mqtt-certs.sh` — executable, bash -n passes, openssl req, 3650-day validity, /certs/ output
- ✅ `docker-compose.yml` — valid YAML, mosquitto-init/mosquitto/edge-agent services, host networking, serial devices, mosquitto_certs volume
- ✅ `docker-compose.prod.yml` — valid YAML, all three services, mosquitto_certs volume, backend network
- ✅ `.env.example` — all 8 MQTT TLS vars + French descriptions + [OBSOLÈTE] MQTT_BROKER_URL

**Commits:**
- `3170999`: feat(01-infrastructure-foundation): create Mosquitto security config files + TLS cert generation script
- `0ad6973`: feat(01-infrastructure-foundation): update docker-compose.yml with secure Mosquitto + edge-agent service
- `01aec14`: feat(01-infrastructure-foundation): update docker-compose.prod.yml and .env.example with MQTT TLS config
