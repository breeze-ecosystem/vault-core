# Domain Pitfalls: v3.0 Hardware Integration

**Domain:** Physical security hardware integration (OSDP, ONVIF, kiosk, edge agent)
**Researched:** 2026-07-17

## Critical Pitfalls

Mistakes that cause rewrites, security incidents, or major operational issues.

### Pitfall 1: Synchronous Edge Agent Blocks Hardware I/O

**What goes wrong:** The current Edge Agent (`agent.py`) uses `schedule` library with `time.sleep(1)` in a single-threaded synchronous loop. Adding serial I/O for OSDP, MQTT subscriptions, and ONVIF discovery to this model causes:
- Serial reads block MQTT message processing (missed commands)
- MQTT publish blocks serial writes (delayed door unlock)
- ONVIF discovery (which takes 5+ seconds) freezes all other agent operations
- Agent becomes unresponsive during hardware operations

**Why it happens:** The existing agent was designed for health monitoring (periodic heartbeat, no real-time I/O). Hardware communication requires concurrent I/O — serial, MQTT, and HTTP all happening simultaneously.

**Consequences:**
- Door unlock commands arrive 5-10 seconds late (or not at all)
- Heartbeat timeouts cause false "edge offline" alerts
- Serial port buffer overflows on busy RS-485 buses
- Operator loses trust in door control

**Prevention:** Rewrite the Edge Agent with `asyncio` before adding any hardware features. Use:
- `paho-mqtt` async client for MQTT
- `pyserial-asyncio` for serial I/O
- `aiohttp` for HTTP heartbeat/API calls
- `asyncio.create_task` for concurrent operations

**Detection:** Agent CPU usage >80%, delayed MQTT command processing, serial buffer overflows in logs.

### Pitfall 2: Storing ONVIF/OSDP Credentials in Plaintext

**What goes wrong:** ONVIF camera passwords, OSDP SCB keys, and door controller credentials stored in `edge.config.json` on disk. Anyone with filesystem access to the edge server can extract camera credentials and view video streams, unlock doors, or reconfigure controllers.

**Why it happens:** The current config file stores everything in JSON. It's the simplest approach for a prototype. In production, this is a critical security vulnerability.

**Consequences:**
- Compromised edge server → unrestricted door control
- Camera feeds accessed by unauthorized parties
- OSDP SCB keys allow decryption of door controller traffic
- GDPR/security compliance failure

**Prevention:**
- **At minimum:** Use environment variables for credentials (Docker secrets or Coolify env vars)
- **Better:** Hardware Credential Vault — encrypted on disk with AES-256-GCM, decryption key from HSM or KMS (e.g., Azure Key Vault, AWS KMS, or HashiCorp Vault sidecar)
- **Best:** Never store keys on edge at all. API distributes ephemeral keys per session, scoped to specific commands, with TTL

**Detection:** Code review catches plaintext credential files. Security audit reveals credentials in config files.

### Pitfall 3: OSDP Bus Locking from Unhandled Errors

**What goes wrong:** An OSDP bus (RS-485) is half-duplex — only one device can talk at a time. If the Edge Agent sends a command to address 0x07 and that controller is offline (no response), the agent might:
- Block the bus waiting for timeout (500ms+)
- Skip other controllers during the wait
- Stack up commands in a growing queue
- Eventually hit a state where no controller responds

**Why it happens:** RS-485 has no collision detection. The bus is a shared wire. A stuck controller (power loss, disconnected wire, firmware crash) absorbs commands but never responds.

**Consequences:**
- All doors on the bus become unresponsive
- Lockdown command never reaches any door
- Operator sees "command sent" but door is actually unlocked
- Security incident during the window of desynchronization

**Prevention:**
- **Per-address command queue with timeout:** Each bus address has its own queue. If address 0x07 times out (no response within 500ms), mark it as OFFLINE and move to the next address. Don't block the bus.
- **Poll health check on startup:** On agent start, poll all configured addresses. Remove unresponsive ones from the active set. Retry periodically.
- **Command acknowledgment tracking:** API must not consider a command "executed" until the Edge Agent confirms it (MQTT command-ack topic). If no ack within 5 seconds, emit a command-failed event.
- **Fail-secure default:** If communication with a controller is lost, the door should remain locked (fail-secure). Never fail-unlock on communication error.

**Detection:** MQTT command-ack timeout alerts, "OSDP: NACK received" in agent logs, bus address marked OFFLINE in hardware status.

### Pitfall 4: Kiosk Printer Failure Mid-Check-In

**What goes wrong:** User scans QR code at kiosk → system validates and marks visitor as "checked in" → printer jams/out of paper → visitor has no badge but system thinks they're checked in. Badge never prints. Visitor walks into building without ID. Security breach.

**Why it happens:** Kiosk software assumes printing always succeeds. The visitor check-in transaction is committed before the print job completes.

**Consequences:**
- Visitor enters without badge (tailgating risk)
- Frustrated visitor re-scans QR → "already checked in" error
- Host doesn't know visitor arrived (no badge trigger)
- Support ticket: "kiosk checked me in but no badge"

**Prevention:**
- **Atomic check-in + print:** Don't mark the visit as "active" until the print job is confirmed by CUPS. If print fails, roll back the check-in and show "Printer error, please see reception."
- **Retry with escalation:** Auto-retry print 3 times with 5-second intervals. All fail → show "Please see reception" message AND emit alert to operator dashboard.
- **Printer health monitoring:** CUPS reports printer status (idle, printing, stopped, error). Report printer health in kiosk's API status endpoint. Show "Printer Offline" overlay on kiosk screen.
- **Manual override:** Operator dashboard has "Re-print badge" button for cases where visitor is checked in but badge wasn't printed.

**Detection:** CUPS error subscription (subscription to printer events), printer status polling every 30 seconds.

### Pitfall 5: ONVIF Credential Storm on Multi-Camera Networks

**What goes wrong:** ONVIF discovery probe returns 50+ cameras. The Edge Agent then probes each camera sequentially (GetDeviceInformation, GetCapabilities, GetProfiles, GetStreamUri), each requiring digest authentication. 50 cameras × 4 SOAP calls × 500ms = 100 seconds. During this time, the agent is swamped and can't respond to door commands or heartbeats.

**Why it happens:** Sequential ONVIF probing is the simplest implementation. It doesn't scale beyond a few cameras.

**Consequences:**
- Discovery takes 2+ minutes
- Heartbeat timeout → API marks edge as offline
- Door control degraded during discovery
- Users think discovery is broken and refresh, restarting the process

**Prevention:**
- **Parallel probing with throttling:** Use `asyncio` semaphore to limit concurrent probes (e.g., 10 at a time). Configure max concurrency in edge.config.json.
- **Incremental discovery:** Discover in batches. After finding 20 cameras, publish results immediately and continue in background.
- **Non-blocking heartbeat:** Heartbeat remains on its own periodic schedule (asyncio task), guaranteed CPU time regardless of discovery load.
- **Cancel on new request:** If user starts a new discovery while one is running, cancel the old one with `asyncio.CancelledError`.

**Detection:** Discovery duration logged in OnvifDiscoveryProcessor (alert if >60 seconds). MQTT message latency tracked (alert if door commands delayed during discovery).

## Moderate Pitfalls

### Pitfall 6: MQTT Topic Namespace Collisions

**What goes wrong:** Existing MQTT topics use patterns like `site/+orgId/door/+doorId/state`. v3.0 adds command topics (`oversight/{orgId}/door/command`), discovery topics (`site/{orgId}/discovery/camera-result`), and ack topics. Without a namespace convention, topics collide, subscriptions get ambiguous wildcards, and messages route incorrectly.

**Prevention:** Define a complete MQTT topic namespace document before implementation:

```
# Sensor/event topics (device → API)
site/{orgId}/door/{doorId}/state
site/{orgId}/reader/{readerId}/badge
site/{orgId}/controller/{controllerId}/health
site/{orgId}/discovery/controller
site/{orgId}/discovery/camera-result
site/{orgId}/door/{doorId}/command-ack

# Command topics (API → device)
oversight/{orgId}/door/command
oversight/{orgId}/edge/camera/discover
oversight/{orgId}/edge/reader/configure

# System topics
oversight/api/status
oversight/{orgId}/edge/config
```

All topic strings centralized in `MqttTopics` class. No hardcoded topic strings in any service.

### Pitfall 7: Kiosk Offline Sync Conflicts

**What goes wrong:** Two kiosks at the same site both operate offline simultaneously. Both check in the same pre-registered visitor (duplicate QR scans). When they sync, each reports "visitor XYZ checked in at 09:42 via kiosk-A" and "visitor XYZ checked in at 09:43 via kiosk-B". Conflict.

**Prevention:**
- **First-wins strategy:** The API's batch sync endpoint processes records in chronological order. If the visitor is already "active", subsequent check-in attempts are rejected and returned as `status: "rejected"`.
- **Kiosk-side check:** Before checking in offline, the kiosk checks its local database. If the credential was already checked in locally (by any kiosk in the same site), show "Already checked in" error.
- **Sync heartbeat:** Kiosks periodically (every 30 seconds) check API for credential status changes. If a credential was activated by another kiosk, cache the rejection locally.
- **Conflict notification:** If sync reveals a conflict, show a non-blocking notification on the kiosk: "Visit for John Smith was already checked in at another kiosk."

### Pitfall 8: Smart Lock Lag Confuses Operators

**What goes wrong:** Dashboard shows "Door unlocked" immediately when the API publishes the unlock command. But the smart lock (Zigbee) takes 2-3 seconds to physically unlock due to mesh network latency. An operator sees "unlocked" and tells the visitor to push, but the door is still locked. Bad user experience.

**Prevention:**
- **State = "locking" / "unlocking" intermediate states:** Add `LOCKING` and `UNLOCKING` to the DoorState enum (currently only LOCKED, UNLOCKED, HELD_OPEN, FORCED, UNSECURED, DESYNCHRONIZED). Show "Unlocking..." in dashboard with an animation until command-ack is received.
- **Command-ack timeout:** If no ack from smart lock after 5 seconds, return to previous state and show error.
- **Physical feedback:** Some smart locks report physical state via MQTT (door position sensor). Use this as the source of truth, not command publication.

### Pitfall 9: CUPS as Root in Container

**What goes wrong:** CUPS traditionally runs as root. Running CUPS inside a Docker container for the kiosk means the container requires privileged security context. This creates a security exposure — if the kiosk SPA has an XSS vulnerability, an attacker could use CUPS to print arbitrary documents or leverage local privilege escalation via cupsd.

**Prevention:**
- **Run CUPS as non-root:** Use `cupsd -c /etc/cups/cupsd.conf -f` with a custom config that drops privileges to `cupsuser`. Modern CUPS supports this.
- **Restrict USB access:** Only pass through the badge printer USB device (`--device /dev/usb/lp0`), not all USB devices.
- **Network isolation:** Kiosk container should only talk to the Docker network's internal DNS and the MQTT broker. No external network access except to API.
- **API-only communication:** The sidecar is the only process that talks to the API. The SPA talks only to the sidecar (localhost). No direct API access from browser.

## Minor Pitfalls

### Pitfall 10: Edge Agent Version Mismatch with API

Different edge agent versions may speak different MQTT topic formats. An old agent with an updated API (or vice versa) breaks communication.

**Prevention:** Add MQTT topic version to heartbeat payload. API checks version compatibility and warns if mismatch. Pin edge agent version to API version in deployment documentation.

### Pitfall 11: ONVIF Digest Auth Token Expiry

ONVIF digest authentication uses nonce-based challenge. Some cameras expire the nonce after a few seconds. Long-running SOAP sessions fail with 401 Digest error.

**Prevention:** Edge Agent stores credentials per camera and re-authenticates when receiving 401. The ONVIF client library (onvif-zeep) handles this automatically for sequential calls.

### Pitfall 12: Badge Media Size Mismatch

Badge template renders for 85.6×54mm (CR-80 card). Printer is loaded with 85.6×54mm cards. But some badge printers support multiple media sizes and may auto-detect the wrong size, printing off-center or cropped.

**Prevention:** Force media size in CUPS printer PPD file. Validate media size before each print job. Show warning on kiosk screen if printer reports unexpected media size.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **8.1 Edge Agent Enhancement** | Sync blocking (Pitfall 1) | Async rewrite first. Prototype asyncio pattern before adding hardware features. |
| **8.2 OSDP Controllers** | Bus blocking (Pitfall 3) | Per-address timeout + command queue. Fail-secure defaults. |
| **8.3 ONVIF Discovery** | Credential storm (Pitfall 5) | Async semaphore throttle. Incremental result publishing. |
| **8.4 Visitor Kiosk** | Print failure mid-check-in (Pitfall 4) | Atomic check-in + print. Printer health monitoring. Manual reprint. |
| **8.4 Kiosk Offline** | Sync conflicts (Pitfall 7) | First-wins strategy. Local dedup cache. Heartbeat polling. |
| **8.5 Smart Locks** | State lag (Pitfall 8) | Intermediate states (LOCKING/UNLOCKING). Physical sensor as source of truth. |
| **8.6 Marketing** | Animation performance | Test on mobile + low-end. prefers-reduced-motion. Lazy-load heavy sections. |
| **Cross-cutting** | Credentials in plaintext (Pitfall 2) | Encrypted config. Environment vars. Ephemeral session keys. |

## Sources

- **HIGH:** Existing Edge Agent code (`agent.py`): synchronous `time.sleep(1)` loop with `schedule` — confirmed blocking pattern
- **HIGH:** RS-485 serial communication design patterns — half-duplex bus topology, multi-drop addressing, collision avoidance
- **HIGH:** OSDP Secure Channel protocol — AES-128 key management specification (IEC 60839-5-2)
- **MEDIUM:** Docker USB passthrough security — `--device` flag, security implications of privileged containers
- **MEDIUM:** CUPS containerization patterns — non-root CUPS, Docker CUPS images available
- **MEDIUM:** Zigbee2MQTT latency — mesh network typical latency 200ms-3s depending on hop count
- **LOW:** ONVIF credential storm on large deployments — estimated from camera deployment experience, no official benchmark
