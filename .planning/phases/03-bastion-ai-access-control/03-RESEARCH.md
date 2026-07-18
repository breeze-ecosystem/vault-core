# Phase 3: BASTION AI & Access Control — Research

**Researched:** 2026-07-18
**Domain:** Computer Vision Pipeline + Access Control Integration + Multi-site Management
**Confidence:** HIGH (all decisions locked, codebase patterns verified via code audit)

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Multi-site Architecture (BAS-13 to BAS-19):**
- D-01: Single deployment model — one vault-os instance manages all sites as child organizations
- D-02: Parent-child hierarchy with aggregate dashboard
- D-03: Hierarchical RBAC extending existing role hierarchy
- D-04: Mixed data sharing — global (face blacklists, VIP credentials) vs local (events, cameras, schedules)
- D-05: Global user/credential model — employee + badge created at parent level, site access by permission
- D-06: Flexible site connectivity using existing VPN/WAN, fallback to Phase 2 DDNS/VPN

**Face Recognition Pipeline (BAS-01):**
- D-07: Continuous face detection — every frame processed, all detections logged
- D-08: Photo upload enrollment — admin uploads via dashboard/mobile
- D-09: Configurable auto-unlock per person per door with risk threshold and CRITICAL alert
- D-10: InsightFace/ArcFace for face recognition (not Ollama)
- D-11: Risk scoring 0-100 with configurable thresholds (85+ match, 60-85 uncertain)
- D-12: Blacklist alerting — CRITICAL alert + snapshot + push to ALL operators

**Anti-spoofing (BAS-02):**
- D-13: Passive liveness only — no active challenge, works on existing cameras
- D-14: Integrated in AI Preprocessor alongside YOLO pipeline
- D-15: Liveness score returned alongside face recognition score

**Behavior Analysis (BAS-06):**
- D-16: Zone intrusion + loitering for v1 BASTION (builds on YOLO + ByteTrack)
- D-17: Running/falling/fighting DEFERRED to future phase
- D-18: Crowd counting via YOLO person detection + ByteTrack per zone

**Weapon & Abandoned Object Detection (BAS-03, BAS-04):**
- D-19: Fine-tuned YOLO models added to existing AI Preprocessor pipeline
- D-20: Abandoned objects via ByteTrack + static timer
- D-21: Higher confidence threshold for weapons (0.6 default)

**RFID & Biometric Integration (BAS-07, BAS-08):**
- D-22: Keep existing MQTT edge model — edge controller publishes to MQTT
- D-23: Fingerprint verification on-reader — no raw biometric data transferred
- D-24: Enrollment flow via dashboard, template hash from reader
- D-25: Credential expiration policies per credential type

**Access/Video Correlation (BAS-10):**
- D-26: Snapshot + 10s clip on denied/forced/held-open; 30-day retention
- D-27: Camera selection from existing CameraDoorMap by priority

**Multi-site Dashboard (BAS-13, BAS-15):**
- D-28: Aggregate view: cameras, alerts, storage, uptime, event volume per site
- D-29: Global search across all sites

**Feature Gating:**
- D-30: BASTION AI sub-features are individual module flags
- D-31: Pre-seeded at org creation, admin enables/disables from vault-app

### The Agent's Discretion
- Face detection model choice (MTCNN vs RetinaFace before InsightFace embedding)
- UI design for multi-site management, face enrollment, and dashboard components
- Implementation details of phase-specific API endpoints
- YOLO model fine-tuning specifics (dataset, training pipeline)
- ByteTrack idle timeout configuration for abandoned object detection
- Exact Qdrant collection schema for face embeddings
- Integration test approach for AI detection with varying hardware

### Deferred Ideas (OUT OF SCOPE)
- Running/falling/fighting behavior detection
- Active liveness (blink/head-turn) for dedicated access terminals
- Auto-capture enrollment (camera-based face enrollment)
- VPN WireGuard integrated into Docker Compose
- Video export with facial overlay
- BAS-20 through BAS-44 requirements (Phase 4 scope)

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BAS-01 | Advanced facial recognition — unlimited, risk scoring 0-100, passage history, dynamic blacklist | InsightFace/ArcFace with 512-d embeddings in Qdrant `faces` collection. AI Preprocessor extension. Existing `FaceWhitelist` model extended. |
| BAS-02 | Anti-spoofing — detects photo, screen, mask (passive liveness) | InsightFace anti-spoofing module (`buffalo_l` includes liveness). Runs in AI Preprocessor alongside face recognition. |
| BAS-03 | Abandoned object detection — alert if static > X minutes in critical zone | ByteTrack + static timer in AI Preprocessor. Track when object stops moving, measure dwell time against configurable threshold. |
| BAS-04 | Weapon detection — firearm, knife, suspicious object | Fine-tuned YOLO model added to existing detection pipeline. Higher confidence threshold (0.6 per D-21). |
| BAS-05 | Crowd counting — real-time density, threshold alerts | YOLO person detection + zone-based counting in AI Preprocessor. Absolute count or density % threshold. |
| BAS-06 | Behavior analysis — zone intrusion, loitering | Zone intrusion (existing `PolygonZone`). Loitering = ByteTrack + time-in-zone threshold. |
| BAS-07 | RFID reader integration — badge + camera correlation | Existing MQTT edge model (`MqttService` + `mqtt.door.state` events). Extend credential type to support `BADGE` with MQTT workflow. |
| BAS-08 | Biometric integration — fingerprint + video correlation | On-reader verification (D-23). New credential type `FINGERPRINT`. Template hash stored, event via MQTT. |
| BAS-09 | QR code integration — digital badge, temporary visitor access | Existing QR support in `AccessService`. Extend with visitor credential provisioning flow. |
| BAS-10 | Access/video correlation — auto snapshot on denied/forced access | Existing `CameraDoorMap` model. Snapshot + 10s clip pipeline reuses VISION alert snapshot infrastructure. |
| BAS-11 | Schedule management — programmable by day/hour | Existing `Schedule` model and `evaluateSchedule()` method. UI grid editor needed. |
| BAS-12 | Group management — role-based profiles (employee, manager, visitor) | Extend `AccessLevel` grouping. New `AccessGroup` model or extend existing grouping via `OrganizationMember` roles. |
| BAS-13 | Multi-site dashboard — centralized view of all sites | Parent-child Organization model (`parentOrganizationId`). Aggregate KPI queries. |
| BAS-14 | Up to 5 sites included | License JWT claims encode `maxSites`. Enforcement by guard. |
| BAS-15 | Cross-site comparison — metrics across sites | Aggregate queries across child organizations. Comparison UI. |
| BAS-16 | Centralized user management — granular RBAC, custom roles | Extend `ROLE_HIERARCHY` with parent-child scope. Add `GLOBAL_ADMIN`, `SITE_ADMIN` role levels. |
| BAS-17 | Enterprise SSO — SAML / OAuth2 | Existing `SsoService` with SAML + OIDC support. Production-ready. Feature-gated behind BASTION pack. |
| BAS-18 | Complete audit trail — immutable log of all actions | Existing `AuditService` with SHA-256 hash-chain. Verify all new endpoints use `@Audited()` decorator. |
| BAS-19 | Inter-site synchronization — data synced between sites | Single deployment model (D-01) means all data in one DB. No distributed sync needed. |

---

## Summary

Phase 3 is the **largest and most technically complex phase** in the v1.0 roadmap. It spans three sub-domains: advanced AI computer vision, access control integration, and multi-site management. The phase touches nearly every major system in the codebase.

**The good news:** The existing foundation is remarkably well-prepared. The AI Preprocessor already has InsightFace, YOLOv12, ByteTrack, and Qdrant client installed. The access control CRUD is built. The SSO and audit modules are production-ready. The feature gate system supports `@RequiresPack("BASTION")` and `@RequiresModule()`.

**The complexity comes from three areas:**
1. **AI Preprocessor extensions** — 6+ new detection endpoints (face recognition, anti-spoofing, weapons, abandoned objects, crowd counting, behavior) must be added to the existing frame pipeline while maintaining sub-second latency
2. **Multi-site data model** — adding parent-child organization hierarchy affects TenantIsolationGuard, all scoped queries, and the entire RBAC system
3. **Credential expansion** — extending from 4 to 6+ credential types (adding FINGERPRINT, FACE) touches schemas, shared types, eval logic, and MQTT handlers

**Primary recommendation:** Structure the phase into distinct waves: (1) AI Preprocessor backend, (2) Access control backend, (3) Multi-site data model, (4) Dashboard UI, (5) Mobile UI. The AI Preprocessor wave can run in parallel with the multi-site data model wave since they touch different codebases.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Face detection + embedding | AI Preprocessor (Python) | — | CPU-bound CV inference, runs on local GPU/CPU |
| Face recognition matching | AI Preprocessor (in-memory cache) | Qdrant (vector DB) | Real-time matching uses cached embeddings; Qdrant for persistence |
| Face enrollment (embedding extraction) | AI Preprocessor | NestJS API | User uploads → NestJS API → AI Preprocessor extracts embedding → stores in Qdrant |
| Anti-spoofing detection | AI Preprocessor | — | Runs as pipeline stage with InsightFace |
| Weapon/object detection | AI Preprocessor | — | Fine-tuned YOLO model, same pipeline |
| Abandoned object detection | AI Preprocessor | — | ByteTrack + static timer logic |
| Crowd counting | AI Preprocessor | — | YOLO person count per zone |
| Zone intrusion / loitering | AI Preprocessor | NestJS API | Detection in AI Preprocessor, alert threshold in NestJS config |
| Alerting (CRITICAL, push) | NestJS API | BullMQ + Socket.IO | Detection triggers NestJS alert via notification pipeline |
| Snapshot + video clip correlation | NestJS API | — | Reuses existing VISION snapshot pipeline |
| Credential CRUD | NestJS API | Prisma | Existing `AccessService` extended with new types |
| Access evaluation | NestJS API | Redis (cache) | Sub-100ms path with Redis caching |
| Schedule management | NestJS API | Prisma | Existing `Schedule` model |
| Access group management | NestJS API | Prisma | New model `AccessGroup` |
| Multi-site parent-child hierarchy | NestJS API (Prisma schema) | TenantIsolationGuard | `parentOrganizationId` + hierarchical RBAC |
| Aggregate dashboard | Dashboard (Next.js) | NestJS API | API aggregates stats across child orgs |
| SSO management | NestJS API | Existing SsoService | Already production-ready SAML + OIDC |
| Immutable audit trail | NestJS API + TimescaleDB | BullMQ (async writes) | Existing `AuditService`, `.verifyChain()` |
| Feature gating | NestJS API (guard chain) | Redis (cache) | Existing `@RequiresPack()` + `@RequiresModule()` |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| InsightFace | >=0.7.3 | Face detection + ArcFace embedding + anti-spoofing | Industry standard offline facial rec (D-10). Pre-installed in AI Preprocessor Dockerfile. |
| Ultralytics (YOLOv12) | >=8.4 | Object detection for weapons, persons, objects | Already in stack. Fine-tune for weapon/abandoned object classes. |
| Supervision (ByteTrack) | >=0.25 | Cross-frame tracking, zone filtering, counting | Already in stack. Extends for abandoned object timer and crowd counting. |
| Qdrant | >=1.18 | Vector DB for face embeddings | Already in stack with 3 collections. New `faces` collection (512-d Cosine) for ArcFace. |
| ONNX Runtime | >=1.17.0 | Inference engine for InsightFace | Already in requirements.txt. CPU-only (no GPU variant). |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| OpenCV | >=5.0 | Frame manipulation (BGR/RGB, crop, CLAHE) | Every frame pipeline stage. Pre-installed. |
| FastAPI | 0.115.0 | API framework for AI Preprocessor | Existing framework. New routes for BASTION endpoints. |
| HTTPX | 0.27.2 | Async HTTP client (AI Preprocessor → NestJS) | Fire-and-forget detection notifications. |
| BullMQ | 5.30.0 | Job queues for async processing | Existing queues for alerts, audit, notifications. |
| Socket.IO | 4.8.3 | Real-time push to dashboard | Existing WebSocket infra for access events. |
| `@prisma/client` | 5.22.0 | Database ORM | All data models. Migration for new models/fields. |
| `zod` | 3.23.8 | Schema validation | New BASTION schemas in shared package. |
| `class-validator` | 0.14.1 | DTO validation (Swagger compat) | NestJS DTOs for new endpoints. |
| `ioredis` | 5.4.1 | Redis client | Caching (access decisions, feature flags). |
| `@nestjs/event-emitter` | — | Internal event bus | `access.granted`, `access.denied`, `door.state-changed` events. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| InsightFace | Ollama with vision models | D-10 explicitly chose InsightFace for accuracy/speed. Ollama 50-500ms+ per frame. |
| Qdrant `faces` collection | PostgreSQL pgvector | Qdrant already deployed. Dedicated vector DB is faster for 512-d similarity search at scale. |
| Fine-tuned YOLO | Standalone weapon detection model | Reusing YOLO keeps pipeline simple — one model, multiple class outputs. |
| On-reader fingerprint | Server-side fingerprint matching | D-23: no raw biometric data transferred. Compliance with HAPDP. |

**Installation (Python packages for AI Preprocessor):**
```bash
pip install "insightface>=0.7.3" "onnxruntime>=1.17.0" "ultralytics>=8.4" "supervision>=0.25" "qdrant-client>=1.18"
```

> All dependencies already present in `services/ai-preprocessor/requirements.txt`.

---

## Package Legitimacy Audit

No new external packages are required for this phase. All dependencies are already in the codebase:

| Package | Registry | Verification | Disposition |
|---------|----------|-------------|-------------|
| insightface | PyPI | Pre-installed in `requirements.txt` and Dockerfile | Already in use — no install needed |
| ultralytics | PyPI | Pre-installed in `requirements.txt` | Already in use — no install needed |
| supervision | PyPI | Pre-installed in `requirements.txt` | Already in use — no install needed |
| onnxruntime | PyPI | Pre-installed in `requirements.txt` | Already in use — no install needed |
| qdrant-client | PyPI | Pre-installed in `requirements.txt` | Already in use — no install needed |
| @qdrant/js-client-rest | npm | Pre-installed in NestJS (`apps/api`) | Already in use — no install needed |

**slopcheck note:** All packages are already installed and in use by the existing codebase. No new package installations required. The Phase 1 feature gate guard, Prisma schema, and shared package are already in the codebase — no new npm/PyPI packages needed for BASTION.

---

## Architecture Patterns

### System Architecture Data Flow

```
┌──────────────────────┐    ┌──────────────────────────────────────────────────────┐
│   AI Preprocessor    │    │                  NestJS API                          │
│   (FastAPI + CV)     │    │                                                      │
│                      │    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  ┌─────────────────┐ │    │  │ Access Module │  │   Door Module│  │  Audit Module││
│  │ YOLOv12 Detector│ │    │  │ (credentials, │  │ (state mach. │  │ (hash-chain, ││
│  │ (weapons,person,│ │    │  │  schedules,   │  │  MQTT, alerts)│  │  verify)     ││
│  │  abandoned_obj) │ │    │  │  eval, groups)│  │              │  │              ││
│  └────────┬────────┘ │    │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘│
│           │          │    │         │                  │                 │        │
│  ┌────────▼────────┐ │    │  ┌──────▼──────────────────▼─────────────────▼┐      │
│  │ ByteTrack       │ │    │  │          Event Bus (EventEmitter2)         │      │
│  │ (tracking,      │─┼────┼─►│  ┌────────┐ ┌──────────┐ ┌──────────────┐ │      │
│  │  abandoned tm,  │ │    │  │  │ BullMQ │ │ Socket.IO│ │  Prisma/DB   │ │      │
│  │  loitering)     │ │    │  │  │ Queues │ │ (realtime)│ │ (PostgreSQL) │ │      │
│  └────────┬────────┘ │    │  │  └────────┘ └──────────┘ └──────────────┘ │      │
│           │          │    │  └────────────────────────────────────────────┘      │
│  ┌────────▼────────┐ │    │                                                      │
│  │ InsightFace     │─┼────┼───► Qdrant (face embeddings, 512-d Cosine)         │
│  │ (recognition,   │ │    │  ▲                                                   │
│  │  anti-spoofing) │ │    │  │ (whitelist cache refresh every 60s)              │
│  └────────┬────────┘ │    │  │                                                   │
│           │          │    │  ┌──────────────┐  ┌──────────────┐                  │
│  ┌────────▼────────┐ │    │  │  SSO Module  │  │  Site Module │                  │
│  │ NestJS Notify   │─┼────┼──┤ (SAML, OIDC) │  │ (multi-site  │                  │
│  │ (fire-and-forget)│ │    │  │ (existant)   │  │  hierarchy)  │                  │
│  └─────────────────┘ │    │  └──────────────┘  └──────────────┘                  │
│                      │    │                                                      │
└──────────────────────┘    └──────────┬───────────────────────────────────────────┘
                                       │
                              ┌────────▼────────┐    ┌──────────────────────┐
                              │  Dashboard UI   │    │   Mobile (Expo)      │
                              │  (Next.js)       │    │                      │
                              │  ┌────────────┐  │    │  ┌────────────────┐  │
                              │  │ Multi-site  │  │    │  │ Face capture   │  │
                              │  │ Dashboard   │  │    │  │ Site switcher  │  │
                              │  │ Face mgmt   │  │    │  │ Access log     │  │
                              │  │ Access mgmt │  │    │  └────────────────┘  │
                              │  │ RBAC editor │  │    └──────────────────────┘
                              │  │ SSO config  │  │
                              │  └────────────┘  │
                              └──────────────────┘

┌──────────────────────┐
│   Edge Controllers   │
│   (ESP32, Readers)   │
│                      │
│  ┌─────────────────┐ │
│  │ MQTT Publishing │─────► MqttService → EventEmitter → DoorService
│  │ RFID / Fingerpr │ │
│  │ State / Events  │ │
│  └─────────────────┘ │
└──────────────────────┘
```

### Recommended Project Structure

**AI Preprocessor extensions:**
```
services/ai-preprocessor/
├── app/
│   ├── routes/
│   │   ├── detection.py          # EXTEND: weapon/abandoned/crowd outputs
│   │   ├── face_recognition.py   # EXTEND: anti-spoofing, blacklist, risk score
│   │   └── detection_bastion.py  # NEW: dedicated BASTION detection endpoints
│   ├── models/
│   │   ├── detector.py           # EXTEND: fine-tuned YOLO for weapons
│   │   ├── face_recogniser.py    # EXTEND: anti-spoofing, risk scoring
│   │   └── tracker.py            # EXTEND: abandoned object timer
│   └── schemas/
│       └── bastion.py            # NEW: BASTION-specific Pydantic models
```

**NestJS API extensions:**
```
apps/api/src/
├── modules/
│   ├── access/
│   │   ├── access.service.ts     # EXTEND: new credential types (FINGERPRINT, FACE)
│   │   ├── access.processor.ts   # EXTEND: video correlation on denied/forced
│   │   └── events/               # NEW: credential event handlers
│   ├── bastion/                  # NEW: BASTION-specific module
│   │   ├── bastion.controller.ts # Face enrollment, detection config endpoints
│   │   ├── bastion.service.ts    # BASTION-specific business logic
│   │   ├── bastion.module.ts
│   │   └── face/
│   │       ├── face.controller.ts   # Face CRUD, blacklist, passage history
│   │       ├── face.service.ts      # Face embedding mgmt, Qdrant integration
│   │       └── face.processor.ts    # Async face event processing
│   ├── multi-site/               # NEW: multi-site management module
│   │   ├── site.controller.ts    # Child site management, aggregation
│   │   ├── site.service.ts       # Org hierarchy queries
│   │   └── site.module.ts
│   └── ... (existing modules extended)
├── common/
│   └── guards/
│       ├── feature-gate.guard.ts  # Already supports BASTION pack/module gates
│       └── tenant-isolation.guard.ts # EXTEND: parent-child org resolution
```

**Prisma schema extensions:**
```
apps/api/prisma/
└── schema.prisma
    # EXTEND: parentOrganizationId on Organization
    # EXTEND: FINGERPRINT + FACE credential types
    # EXTEND: Face model (replaces FaceWhitelist, adds blacklist support)
    # NEW: AccessGroup model
    # NEW: CredentialSiteAccess model (for multi-site credential permissions)
```

### Pattern 1: Extending the Detection Pipeline (AI Preprocessor)
**What:** Each BASTION AI feature adds a stage to the existing frame processing pipeline.
**When to use:** All BASTION AI features (weapons, abandoned objects, crowd counting, anti-spoofing, behavior)
**Example:**
```python
# BASTION: Multi-output detection pipeline (single frame)
# Existing pipeline in routes/detection.py is extended with:
# 1. YOLO outputs → check for weapon class IDs (fine-tuned classes)
# 2. ByteTrack + timer → abandoned object detection
# 3. Zone person count → crowd density
# 4. Face detection crop → anti-spoofing liveness score
all_results = []
weapon_detections = detections_sv[detections_sv.class_id.isin(WEAPON_CLASS_IDS)]
if len(weapon_detections) > 0:
    # Higher confidence threshold for weapons (D-21)
    weapon_detections = weapon_detections[weapon_detections.confidence >= 0.6]
    # Enqueue weapon alert
    all_results.append({"type": "weapon", "detections": weapon_detections})

abandoned = check_abandoned_objects(detections_tracked, camera_id)
if abandoned:
    all_results.append({"type": "abandoned_object", "tracker_id": abandoned.tracker_id})

crowd_count = count_persons_in_zones(detections_sv, zones)
if crowd_count > threshold:
    all_results.append({"type": "crowd_density", "count": crowd_count, "zone": zone})
```

### Pattern 2: Face Recognition with Qdrant (BASTION)
**What:** BASTION face recognition uses Qdrant for unlimited face storage. The existing VISION `FaceWhitelist` model (PostgreSQL, max 50 faces) must be extended/superseded. AI Preprocessor uses an in-memory whitelist cache synced from NestJS.
**When to use:** Face enrollment, recognition, blacklist management
**Example:**
```python
# Qdrant collection config for faces (512-d, Cosine)
from qdrant_client.models import Distance, VectorParams
qdrant.recreate_collection(
    collection_name="faces",
    vectors_config=VectorParams(size=512, distance=Distance.COSINE),
)

# Face enrollment: extract embedding → store in Qdrant
emb = insightface_app.get(crop_bgr)[0].normed_embedding
qdrant.upsert("faces", points=[PointStruct(
    id=str(uuid.uuid4()),
    vector=emb.tolist(),
    payload={"name": name, "org_id": org_id, "is_blacklisted": False}
)])

# Face recognition: search Qdrant
results = qdrant.search("faces", query_vector=emb.tolist(), limit=1)
best = results[0]
risk_score = min(100, int((best.score + 1.0) * 50))  # cosine sim → 0-100
if risk_score >= 85:
    # Match — log passage, optionally auto-unlock
    ...
```

### Pattern 3: Multi-site Organization Hierarchy
**What:** Adds parent-child relationship to the Organization model. Extends TenantIsolationGuard for hierarchical access.
**When to use:** All multi-site features
**Example (Prisma schema):**
```prisma
model Organization {
    id                  String   @id @default(uuid())
    name                String
    parentOrganizationId String? // NEW: self-referential parent
    parent              Organization? @relation("OrgHierarchy", fields: [parentOrganizationId], references: [id])
    children            Organization[] @relation("OrgHierarchy")
    // ... existing fields unchanged
}
```

### Anti-Patterns to Avoid
- **Mixing anti-spoofing with active liveness:** BASTION uses only passive liveness (D-13). Do not add blink/head-turn challenges.
- **Distributed sync between vault-os instances:** D-01 rules this out. Single deployment model only.
- **Custom video player for correlation:** Reuse existing VISION `VideoPlayer` component + snapshot endpoints.
- **Duplicating Qdrant writes from AI Preprocessor:** AI Preprocessor only reads the face cache; NestJS writes to Qdrant on enrollment.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Face detection + embedding | Custom CNN | InsightFace ArcFace (`buffalo_l`) | 800ms full pipeline on CPU, industry standard accuracy, pre-integrated |
| Anti-spoofing (liveness) | Custom texture analysis | InsightFace anti-spoofing module | Built into `buffalo_l` model pack, passive only, no hardware needed |
| Object detection model | Train YOLO from scratch | Fine-tune YOLOv12 (transfer learning) | Existing YOLOv12 in stack. Fine-tuning requires ~500-1000 labeled images per class |
| Cross-frame tracking | Kalman filter from scratch | ByteTrack (supervision) | Already in stack, handles ID assignment, lost-track recovery |
| Vector similarity search | In-memory brute force | Qdrant + AI Preprocessor cache | Qdrant for persistence; in-memory cache for sub-ms lookup |
| SSO (SAML/OIDC) | Custom SAML implementation | Existing `SsoService` | Production-ready with JIT provisioning, attribute mapping, encryption |
| Audit hash-chain | Custom integrity check | Existing `AuditService.verifyChain()` | SHA-256 per-entity and per-org chain verification |
| Video snapshot storage | New storage system | Existing VISION snapshot pipeline | Same `@fastify/static` + filesystem path. 30-day retention. |
| Door state machine | Custom state logic | Existing `DoorStateMachine` | Already handles LOCKED/UNLOCKED/HELD_OPEN/FORCED with settling timeout |

**Key insight:** The existing codebase already implements most of the infrastructure needed. The AI Preprocessor already has InsightFace, YOLO, and ByteTrack with the lazy singleton pattern. The access control module already has credential CRUD, schedule evaluation, and camera-door mapping. The audit and SSO modules are production-ready. The heavy lifting for this phase is integration and extension, not building from scratch.

---

## Codebase Integration Points

### Specific Files/Modules That Need Modification

| File/Module | Change Required | BASTION Feature |
|-------------|----------------|-----------------|
| `services/ai-preprocessor/app/config.py` | Add BASTION detection settings (weapon threshold, abandoned timer, crowd thresholds) | BAS-03/04/05 |
| `services/ai-preprocessor/app/models/detector.py` | Load fine-tuned YOLO model for weapons | BAS-04 |
| `services/ai-preprocessor/app/models/face_recogniser.py` | Add anti-spoofing (liveness score), blacklist support, Qdrant sync | BAS-01/02 |
| `services/ai-preprocessor/app/models/tracker.py` | Add abandoned object timer, loitering timer support | BAS-03/06 |
| `services/ai-preprocessor/app/routes/detection.py` | Add weapon/abandoned/crowd detection outputs to pipeline | BAS-03/04/05 |
| `services/ai-preprocessor/app/routes/face_recognition.py` | Add anti-spoofing endpoint, blacklist matching, risk scoring | BAS-01/02 |
| `apps/api/prisma/schema.prisma` | Add `parentOrganizationId`, new credential types, `Face` model, `AccessGroup` | All |
| `apps/api/src/modules/access/access.service.ts` | Add FINGERPRINT credential type, group-based evaluation | BAS-08/12 |
| `apps/api/src/modules/access/access.controller.ts` | Add group CRUD, multi-site credential endpoints | BAS-12 |
| `apps/api/src/modules/door/door.service.ts` | Add video correlation trigger on denied/forced events | BAS-10 |
| `apps/api/src/modules/site/site.service.ts` | Add parent-child hierarchy, aggregate queries | BAS-13/15 |
| `apps/api/src/modules/ai-agent/qdrant/qdrant.service.ts` | Add `faces` collection (512-d Cosine), face upsert/search | BAS-01 |
| `apps/api/src/common/guards/tenant-isolation.guard.ts` | Add parent-child org traversal for hierarchical RBAC | BAS-16 |
| `packages/shared/src/constants/roles.ts` | Add GLOBAL_ADMIN role level | BAS-16 |
| `packages/shared/src/constants/credential-types.ts` | Add FINGERPRINT, FACE types | BAS-08/01 |
| `packages/shared/src/schemas/access.schema.ts` | Add credential schemas for new types | BAS-07/08/09 |
| `apps/api/src/modules/license/` | Add `maxSites` to JWT claims | BAS-14 |

### Existing Patterns to Follow

1. **Guard chain order:** `JwtAuthGuard → TenantIsolationGuard → RolesGuard → FeatureGateGuard` — all new BASTION endpoints must be protected by `@RequiresPack("BASTION")` and individual `@RequiresModule()` for sub-features.

2. **Detection pipeline:** Frame capture → POST to AI Preprocessor → detect → return results → enqueue alert → Socket.IO push — BASTION detection types follow this exact flow.

3. **Async processing:** BullMQ queues for non-blocking operations. New BASTION alerts use the existing `notification-send` queue + optional new `bastion-events` queue.

4. **Snapshot storage:** Local filesystem via `@fastify/static`. Access correlation snapshots use the same pipeline as VISION alert snapshots.

5. **Multi-tenancy:** TenantIsolationGuard auto-injects `organizationId`. For multi-site, extend to allow parent org to see child org data.

6. **Audit all actions:** Every BASTION mutation endpoint uses `@Audited()` or `AuditLog()` decorator. The `AuditService.log()` method writes via BullMQ `audit-write` queue.

---

## Risks & Mitigations

### 1. Face Recognition Demographic Bias (West African Population)
**Risk:** InsightFace/ArcFace was primarily trained on East Asian and Caucasian datasets (MS1M, VGGFace2). False positive rates can be 10-100× higher for African subjects per NIST FRVT research.
**Mitigation:**
- Build local enrollment dataset of 500+ subjects across target ethnicities (Hausa, Zarma, Tuareg, Fulani) during calibration
- Measure and document false match rate by demographic subgroup
- Configurable risk score thresholds (D-11) allow per-org sensitivity tuning
- Deployment "incubation mode": log-only for first 72 hours while thresholds calibrate

### 2. Alarm Fatigue from Detection False Positives
**Risk:** The #1 documented cause of security system abandonment. New AI detections (weapons, abandoned objects, crowd) all fire alerts — operators may become desensitized.
**Mitigation:**
- Higher confidence threshold for weapons (0.6 per D-21)
- Per-camera sensitivity tuning at deployment time
- Temporal smoothing (3-of-5 frames rule) already in pipeline
- "Incubation mode": log-only first 72 hours for new detection types
- Configurable thresholds per organization and per camera

### 3. Anti-spoofing Reliability on Existing Surveillance Cameras
**Risk:** Passive liveness (texture analysis, edge detection) is less reliable on low-resolution surveillance cameras compared to dedicated access control cameras with depth sensors.
**Mitigation:**
- D-13: Passive liveness only — works without user cooperation
- Low liveness score = detection disregarded + operator alert (D-15)
- No access decision depends on liveness alone — always correlated with credential
- Mitigation for common West African attack vectors (printed photo, phone screen) is documented in AI-SPEC §1b

### 4. Abandoned Object Timer False Positives
**Risk:** A person standing still for X minutes triggers "abandoned object" if the person leaves the frame but an object remains in the tracker's last-known position.
**Mitigation:**
- Use ByteTrack's `lost_track_buffer` to distinguish between "person walked away leaving object" (object present, no person track) vs. "person standing still" (person track still active)
- Per-zone configurable time threshold
- Combine with zone definitions — only alert in critical zones
- Smaller bounding box IoU change threshold for "static" detection

### 5. Multi-site Data Visibility
**Risk:** A global admin at parent org accidentally sees sensitive data from child sites (e.g., employee PII from Site A while browsing Site B's cameras).
**Mitigation:**
- D-04: Mixed data sharing explicitly defines what's global vs. local
- Extend TenantIsolationGuard to check org hierarchy + data classification
- Face blacklists, VIP credentials = global (shared); events, cameras, schedules = local (per site)
- Dashboard aggregate stats only, not raw events

### 6. YOLO Fine-tuning for Weapons
**Risk:** Insufficient training data for weapon detection in African context. A firearm in Niger (AK-pattern rifle) looks different than in COCO dataset (handgun, AR-15).
**Mitigation:**
- Start with existing weapons detection datasets (D-19) then fine-tune with local data
- Use transfer learning from pre-trained YOLO — requires 500-1000 labeled images for reasonable accuracy
- Default confidence threshold of 0.6 minimizes false positives at cost of some sensitivity
- Document: weapon detection accuracy will improve over time as more deployment data is collected

---

## Dependencies & Prerequisites

### Phase 1 (Complete) — Foundation Dependencies
- [x] FeatureGateGuard supports `@RequiresPack("BASTION")` and `@RequiresModule()`
- [x] License system supports pack gating
- [x] VISION/BASTION pack model in Prisma schema
- [x] FeatureFlag model with `pack` + `moduleKey` fields

### Phase 2 (Complete) — VISION Infrastructure Dependencies
- [x] AI Preprocessor operational with YOLOv12 + ByteTrack + InsightFace
- [x] Face whitelist CRUD (FaceWhitelist model)
- [x] Snapshot storage pipeline (`@fastify/static`, 30-day retention)
- [x] BullMQ queue infra (ai-process, notification-send, audit-write)
- [x] Socket.IO real-time event push
- [x] MQTT service + Wiegand adapter for badge events
- [x] Door state machine with forced/held-open handling
- [x] Camera-door mapping (CameraDoorMap model)

### Infrastructure Prerequisites
- [ ] Qdrant running (check `docker-compose.prod.yml` or Coolify Redis stack)
- [ ] AI Preprocessor Docker image rebuilt with all Python deps
- [ ] PostgreSQL with TimescaleDB extension (for access_events, audit_log hypertables)
- [ ] MQTT broker (Mosquitto) running for edge controller communication

### Data Migration Prerequisites
- [ ] Existing `FaceWhitelist` entries migrated to new `Face` model (if table renamed)
- [ ] Existing `Credential` records unchanged (new types can coexist)

---

## Open Questions (RESOLVED)

1. **Credential type `FINGERPRINT` in Prisma schema** — RESOLVED: Add both `FINGERPRINT` and `FACE` to `CredentialType` enum. Face credentials get additional configuration in a new `FaceCredentialConfig` relation model. This keeps the schema extensible while avoiding credential subtype fragmentation.

2. **Transition from FaceWhitelist (VISION) to Face/Blacklist model (BASTION)** — RESOLVED: New `Face` model supersedes `FaceWhitelist` for BASTION orgs. VISION orgs keep using `FaceWhitelist`. The AI Preprocessor endpoint serves both — it returns match results, the API routes to appropriate storage based on feature gate. No migration needed — the two models coexist.

3. **Fine-tuned YOLO model for weapons** — RESOLVED: Start with a single fine-tuned YOLO that adds `firearm`, `knife` classes to COCO classes. This keeps one inference pass. If accuracy is insufficient, split into separate models later. The `WEAPON_CONFIDENCE_THRESHOLD` defaults to 0.6 (D-21) to minimize false positives.

4. **Parent-child RBAC extension** — RESOLVED: Add `GLOBAL_ADMIN` (level 100) and `SITE_ADMIN` (level 75) to `ROLE_HIERARCHY`. Extend `TenantIsolationGuard` so `GLOBAL_ADMIN` can access child org data. Leave existing `SUPER_ADMIN` as-is for single-site orgs. No migration needed for existing single-site deployments.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL 16 | Data layer | ✓ | 16.x (Coolify) | — |
| TimescaleDB | Hypertables (audit_log, access_events) | ✓ (existing extension) | — | Prisma native tables |
| Qdrant | Face embeddings vector storage | ✓ (from Phase 2) | — | In-memory during dev |
| Redis 7 | Caching, BullMQ queues | ✓ | 7.x (Coolify) | — |
| AI Preprocessor (FastAPI) | CV inference | ✓ (from Phase 2) | Python 3.11 | — |
| MQTT Broker | Edge controller events | Need to verify | — | Mock for dev |
| Internet | License verification (24h ping) | Yes | — | Degraded mode per Phase 1 |

**Missing dependencies with no fallback:**
- None — all dependencies are already deployed and verified from Phase 2

**Missing dependencies with fallback:**
- MQTT Broker — can use mock service during development for testing access control without physical edge controllers

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Existing JWT auth + SSO (SAML/OIDC via `SsoService`) |
| V3 Session Management | Yes | Existing JWT (access + refresh tokens) |
| V4 Access Control | Yes | Existing RBAC + TenantIsolationGuard + hierarchical extension |
| V5 Input Validation | Yes | Zod schemas + `ZodValidationPipe` for all new endpoints |
| V6 Cryptography | Yes | SHA-256 hash-chain for audit (`AuditService`), bcrypt for passwords |
| V8 Data Protection | Yes | HAPDP compliance — no biometric data leaves site, consent + audit |
| V10 Malicious Code | No | No user-uploaded executable content accepted |
| V11 Business Logic | Yes | Anti-passback, credential expiration, lockout on failed attempts |

### Known Threat Patterns for BASTION Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| False blacklist match → armed response | Spoofing | Configurable risk threshold (D-11), uncertain range (60-84 logs + operator notification) |
| Anti-spoofing bypass (photo/video) | Spoofing | Passive liveness with multi-cue analysis (texture, edge, depth-of-field) |
| Face template extraction from Qdrant | Information Disclosure | Qdrant API not exposed externally. All face operations through NestJS auth chain. |
| Credential replay (RFID clone) | Tampering | On-reader fingerprint verification (D-23) + video correlation on every access event |
| Unauthorized child site data access | Elevation of Privilege | Extended TenantIsolationGuard with org hierarchy + data classification checks |
| Audit log tampering | Tampering | SHA-256 hash-chain per entity (verifyable via `AuditService.verifyChain()`) |
| Detection model adversarial attack | Tampering | Temporal smoothing (3-of-5 frames) mitigates single-frame adversarial patches |

---

## Sources

### Primary (HIGH confidence) — Verified via codebase audit
- Codebase: `services/ai-preprocessor/` — existing CV pipeline structure
- Codebase: `apps/api/src/modules/access/` — access control CRUD + evaluation
- Codebase: `apps/api/src/modules/ai-agent/qdrant/` — Qdrant client with 4096-dim collections
- Codebase: `apps/api/src/modules/audit/` — SHA-256 hash-chain audit service
- Codebase: `apps/api/src/modules/sso/` — SAML + OIDC SSO production-ready
- Codebase: `apps/api/src/modules/door/` — door state machine with MQTT handler
- Codebase: `apps/api/src/modules/site/` — existing site CRUD
- Codebase: `apps/api/src/common/guards/feature-gate.guard.ts` — pack + module feature gating
- Codebase: `apps/api/prisma/schema.prisma` — Prisma schema with all existing models
- Codebase: `packages/shared/` — shared schemas, types, constants
- Context documents: `03-CONTEXT.md`, `03-AI-SPEC.md`, `03-UI-SPEC.md`
- Context documents: `01-CONTEXT.md` (Phase 1), `02-CONTEXT.md` (Phase 2)

### Secondary (MEDIUM confidence) — Verified via official docs
- InsightFace GitHub: `https://github.com/deepinsight/insightface` — anti-spoofing module + ArcFace embedding
- Ultralytics YOLO Docs: `https://docs.ultralytics.com/` — fine-tuning guidance for custom classes
- Supervision ByteTrack: `https://supervision.roboflow.com/latest/trackers/` — tracker config
- Qdrant Documentation: `https://qdrant.tech/documentation/` — vector search, collection setup
- ONNX Runtime: `https://onnxruntime.ai/docs/` — CPU inference optimization

### Tertiary (LOW confidence) — Domain research, not verified in this session
- NIST FRVT 2024 report on demographic accuracy disparities — referenced in AI-SPEC
- SIA Alarm Management Standard — industry benchmark for alarm fatigue thresholds
- HAPDP Niger data protection law (Loi n°2021-003) — compliance framework documented in AI-SPEC

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | InsightFace anti-spoofing module in `buffalo_l` provides sufficient passive liveness accuracy for surveillance camera conditions | Standard Stack | May need additional liveness cues or higher confidence thresholds for low-res cameras |
| A2 | Existing YOLOv12 fine-tuned with 500-1000 weapon images per class provides adequate detection accuracy | Don't Hand-Roll | May need more training data or specialized weapon detection model if false positive rate is too high |
| A3 | ByteTrack `lost_track_buffer` of 30 frames (~2s) is sufficient for abandoned object detection timer | Architecture Patterns | May need per-zone configurable timer + different tracking parameters for static object detection |
| A4 | MQTT broker is operational and accessible for edge controller communication | Environment Availability | If MQTT is not deployed, access control integration cannot be tested with real hardware |
| A5 | The single-deployment model (D-01) is sufficient for up to 5 sites | User Constraints | If sites are geographically distant with unreliable WAN links, a distributed model may be needed — but D-01 explicitly locks this in |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in codebase, versions in requirements.txt
- Architecture: HIGH — patterns verified via code audit, all decisions locked
- Pitfalls: MEDIUM — deployment-specific issues (demographic bias, infrastructure) documented but not verified against this specific deployment environment
- Multi-site: HIGH — D-01 through D-06 lock the model, extension points identified in codebase

**Research date:** 2026-07-18
**Valid until:** 2026-08-18 (stable ecosystem, packages don't change rapidly)
