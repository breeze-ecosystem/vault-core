# Phase 3: BASTION AI & Access Control - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-18
**Phase:** 3-BASTION AI & Access Control
**Areas discussed:** Multi-site architecture, Face recognition pipeline, Anti-spoofing, Behavior analysis scope, Weapon/abandoned object detection, RFID/biometric integration, Access/video correlation

---

## Multi-site Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Single deployment | One vault-os instance manages all sites as separate orgs. Easier, reuses tenant isolation. Requires sites on same VPN. | ✓ |
| Distributed sync | Each site runs its own vault-os. Sync via vault-app hub. More survivable but complex. | |

**User's choice:** Single deployment (recommended by agent). User noted: "je suis pas developpeur donc tu dois noter tes questions avec la reponse que tu recommande" — all subsequent questions annotated with recommendation.

**Follow-up decisions:**
| Option | Description | Selected |
|--------|-------------|----------|
| Parent-child with aggregate view | Parent manages child orgs. Aggregate analytics + drill-down per site. Centralized RBAC inheritance. | ✓ |
| Flat org list per account | No hierarchy, simpler data model. User must switch between sites manually. | |

**RBAC model:** Hierarchical RBAC (global admin > site admin > operator)

**Data sharing:** Mixed — blacklists/credentials global, events/cameras/schedules local per site

**Connectivity:** Client VPN preferred. Fallback to VaultOS DDNS/VPN solution from Phase 2.

**Credentials:** Global — employee created once, access granted per site.

---

## Face Recognition Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Continuous analysis | Every frame processed. All passages logged with timestamp. | ✓ |
| Triggered by access event | Only when badge scanned or door opens. | |

**Enrollment:** Photo upload (dashboard + mobile) → auto-embedding → Qdrant

**Access action:** Both log-only AND auto-unlock, configurable per person + per door. Auto-unlock generates alerts/warnings.

**Model:** InsightFace/ArcFace (recommended over Ollama vision)

**Blacklist:** CRITICAL alert + snapshot + push notification to ALL operators.

---

## Anti-spoofing (Liveness Detection)

| Option | Description | Selected |
|--------|-------------|----------|
| Passive | Texture analysis, screen edge detection, depth-of-field cues. No user cooperation. | ✓ |
| Active | User must blink/turn head. More reliable but requires interaction. | |
| Both combined | Passive always, active triggered when confidence low. | |

**Integration:** AI Preprocessor (same frame pipeline as YOLO). No hardware sensors.

---

## Behavior Analysis (BAS-06)

**Scope for v1:** Zone intrusion + loitering only. Builds on existing YOLO + ByteTrack tracking.

**Deferred:** Running, falling, fighting — require pose estimation models (future phase).

---

## Weapon & Abandoned Object Detection (BAS-03, BAS-04)

| Option | Description | Selected |
|--------|-------------|----------|
| AI Preprocessor extended | Fine-tuned YOLO models loaded at startup. Same pipeline. | ✓ |
| Dedicated Python service | New microservice. More modular but more infra. | |

**Abandoned objects:** ByteTrack + timer per zone/camera. Configurable threshold.

**Weapon confidence:** Default 0.6 (higher to minimize false positives).

---

## RFID & Biometric Integration (BAS-07, BAS-08)

**RFID:** Keep existing MQTT edge model (controller reads badge → MQTT → vault-os). No direct USB/serial.

**Fingerprint:** Match-on-device. vault-os stores template hash + status only. Authentication events via MQTT.

**Enrollment flow:** Admin creates credential in dashboard. Fingerprint: scan at reader → hash stored. RFID: badge number entered manually.

---

## Access/Video Correlation (BAS-10)

| Option | Description | Selected |
|--------|-------------|----------|
| Snapshot + 10s video | 1 snapshot + 10s clip preceding the event. 30-day retention. Same pipeline as VISION alerts. | ✓ |
| Multiple snapshots | 5 snapshots (-5s to +5s). 90-day retention. More storage. | |

**Triggered on:** Denied access, forced door, held open.

---

## the agent's Discretion

- Face detection model choice (MTCNN vs RetinaFace)
- UI design for multi-site pages, face enrollment, BASTION settings
- Implementation details of API endpoints and YOLO fine-tuning
- Qdrant collection schema for face embeddings
- ByteTrack idle timeout for abandoned object detection

## Deferred Ideas

- Running/falling/fighting behavior detection — future phase (pose estimation dependency)
- Active liveness for dedicated access booths — future improvement
- Auto-capture face enrollment (camera-based) — alternative to photo upload
- Integrated WireGuard VPN — see Phase 2 DDNS decision
- Video export with face overlay — future phase
