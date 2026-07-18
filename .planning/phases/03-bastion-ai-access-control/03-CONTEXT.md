# Phase 3: BASTION AI & Access Control - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete all 19 BASTION features for advanced AI detection, access control integration, and multi-site management. BASTION is the enterprise pack — builds on VISION infrastructure (AI pipeline, streaming, recording, feature gates).

**Three sub-domains:**
1. **Advanced AI** (BAS-01 to BAS-06) — facial recognition, anti-spoofing, weapons, abandoned objects, crowd counting, behavior analysis
2. **Access Control Integration** (BAS-07 to BAS-12) — RFID, biometric, QR, schedules, groups, video correlation
3. **Multi-site Management** (BAS-13 to BAS-19) — dashboard, RBAC, SSO, audit, inter-site sync

**Requirements:** BAS-01 to BAS-19

</domain>

<decisions>
## Implementation Decisions

### Multi-site Architecture (BAS-13 to BAS-19)
- **D-01:** **Single deployment model.** One vault-os instance manages all sites as child organizations under a parent account. Not distributed sync between multiple vault-os instances.
- **D-02:** **Parent-child hierarchy with aggregate dashboard.** Parent sees aggregate analytics (cameras, events, uptime) + drill-down per site. Navigate from global view to specific site.
- **D-03:** **Hierarchical RBAC.** Global admin (parent) creates/manages all sites. Site admin manages only their site (users, cameras, badges, schedules). Role inheritance: global admin > site admin > operator > viewer. This extends existing RBAC hierarchy.
- **D-04:** **Mixed data sharing.** Global data (shared): face blacklists, VIP credentials, global access profiles. Local per site: events, cameras, schedules, door configs. Cross-site dashboard aggregates stats only, not raw events.
- **D-05:** **Global user/credential model.** Employee + badge/credential created once at parent level. Admin grants site access per user. One badge works at Site A and/or Site B by permission.
- **D-06:** **Flexible site connectivity.** Use client's existing VPN/WAN when available. Fallback to VaultOS integrated DDNS/VPN solution from Phase 2 (VIS-23 DDNS + optional WireGuard container).

### Face Recognition Pipeline (BAS-01)
- **D-07:** **Continuous face detection.** Every video frame is processed. All face detections are logged with person name (if matched), timestamp, and snapshot. No gating by access events.
- **D-08:** **Photo upload enrollment.** Admin uploads a face photo via dashboard or mobile app. AI Preprocessor auto-extracts the face embedding and stores it in Qdrant (existing vector DB, 4096-dim Qwen embedding). No camera capture enrollment.
- **D-09:** **Configurable auto-unlock.** Default: log-only (record passage + score). Admin can enable auto-unlock per person + per door. Auto-unlock always generates CRITICAL alert as audit trail. Configurable risk score threshold per door.
- **D-10:** **InsightFace/ArcFace for face recognition.** Not Ollama. Better accuracy for face matching, runs locally in AI Preprocessor (no cloud dependency). Industry standard for offline facial recognition.
- **D-11:** **Risk scoring (0-100):** similarity distance mapped to confidence score. Thresholds configurable per organization (default: 85+ = match, 60-85 = uncertain, logged + operator notified).
- **D-12:** **Blacklist alerting:** blacklisted person detected → CRITICAL alert + snapshot + push notification to ALL operators. Stored as immutable audit entry with hash-chain.

### Anti-spoofing (BAS-02)
- **D-13:** **Passive liveness only.** Analysis of image texture, screen edge detection, depth-of-field cues. No active challenge (blink/head-turn). Works on existing surveillance cameras without user cooperation.
- **D-14:** **Integrated in AI Preprocessor.** Same frame pipeline as YOLO detection. InsightFace anti-spoofing module used alongside face recognition. No hardware sensors needed.
- **D-15:** **Anti-spoofing score** returned alongside face recognition score. Low liveness score = detection disregarded + alert to operator.

### Behavior Analysis (BAS-06)
- **D-16:** **Zone intrusion + loitering for v1 BASTION.** These build on existing YOLO + ByteTrack tracking. Zone intrusion already partially exists. Loitering = tracking + configurable time threshold per zone.
- **D-17:** **Running, falling, fighting DEFERRED** to future phase. These require pose estimation models (YOLO-Pose or MediaPipe) which are significant new dependencies. Not in v1 scope.
- **D-18:** **Crowd counting (BAS-05):** uses existing YOLO person detection + ByteTrack counting per zone. Threshold: absolute count per zone or density %, configurable per camera/organization.

### Weapon & Abandoned Object Detection (BAS-03, BAS-04)
- **D-19:** **AI Preprocessor extended.** Fine-tuned YOLO models for weapons (firearm, knife, suspicious object) and suspicious packages added to existing pipeline. Same frame → multiple detection outputs.
- **D-20:** **Abandoned objects via ByteTrack + timer.** Object detected as static > configurable X minutes within a zone → alert. Threshold per zone/camera configurable.
- **D-21:** **Confidence threshold for weapons:** higher (default 0.6) to minimize false positives. Configurable per organization.

### RFID & Biometric Integration (BAS-07, BAS-08)
- **D-22:** **Keep existing MQTT edge model.** Edge controller (ESP32/door controller) reads RFID badge, publishes to MQTT. vault-os receives via existing MqttService. No direct USB/serial reader support in vault-os.
- **D-23:** **Fingerprint verification on-reader.** Match-on-device (on the reader). vault-os stores template hash + status. Reader sends "userId X authenticated via fingerprint" event via MQTT. No raw biometric data transferred to vault-os.
- **D-24:** **Enrollment flow:** admin creates credential in dashboard, selects type (RFID badge / fingerprint / QR / PIN). For fingerprint: user scans at reader, reader sends template hash back, vault-os stores association. For RFID: badge number entered manually or scanned.
- **D-25:** **Credential expiration** policies per credential type configurable in dashboard (date range, max uses, auto-deactivate).

### Access / Video Correlation (BAS-10)
- **D-26:** **Snapshot + 10s video clip** on denied access, forced door, held open events. 30-day retention. Uses existing snapshot storage pipeline from VISION alert system.
- **D-27:** **Camera selection** from existing CameraDoorMap (already has angle + priority). Primary camera selected by priority.

### Multi-site Dashboard (BAS-13, BAS-15)
- **D-28:** **Aggregate view shows:** camera count (total + per site), active alerts (per site), storage usage, uptime, event volume. Click to drill down per site.
- **D-29:** **Global search across all sites** for events, people, credentials (BAS-14 advanced search extended). Search results tagged with site name.

### Feature Gating (from Phase 1 decisions)
- **D-30:** **BASTION AI sub-features are individual module flags.** Module keys: `advanced_facial_recognition`, `anti_spoofing`, `weapon_detection`, `abandoned_object_detection`, `crowd_counting`, `zone_intrusion`, `multi_site`, `rfid_integration`, `biometric_integration`. Each gated by `@RequiresFeature()`.
- **D-31:** **Pre-seeded at org creation.** Admin enables/disables per client from vault-app license generation.

### the agent's Discretion
- Face detection model choice (MTCNN vs RetinaFace before InsightFace embedding)
- UI design for multi-site management, face enrollment, and dashboard components
- Implementation details of phase-specific API endpoints
- YOLO model fine-tuning specifics (dataset, training pipeline) for weapons/objects
- ByteTrack idle timeout configuration for abandoned object detection
- Exact Qdrant collection schema for face embeddings
- Integration test approach for AI detection with varying hardware

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` §Phase 3 — Phase goal, success criteria (6 items), 19 BASTION requirements
- `.planning/REQUIREMENTS.md` — BAS-01 to BAS-19 full spec
- `.planning/STATE.md` — Current project state

### Phase 1 & 2 Context (carried forward)
- `.planning/phases/01-architecture-license-foundation/01-CONTEXT.md` — All D-01 to D-21 decisions (feature gates, pack+module model, RSA signing, guard chain, activation wizard)
- `.planning/phases/02-vision-pack/02-CONTEXT.md` — All D-01 to D-26 decisions (AI pipeline, Hermes Agent, geofencing, face rec limits, Qdrant deferred to Phase 3)

### Pricing & Feature Matrix
- `docs/PRICING-SPEC.md` — Complete feature matrix: BASTION (49 features + optional modules), what's included vs module-upsell

### Existing Code Assets
- `services/ai-preprocessor/` — AI Preprocessor (FastAPI, YOLOv12, ByteTrack, PaddleOCR, audio). Base for all new AI detection endpoints.
- `apps/api/src/modules/access/` — Access control CRUD (credentials, zones, schedules, access levels, evaluation)
- `apps/api/src/modules/door/` — Door state machine, MQTT handler, emergency overrides, camera-door maps
- `apps/api/src/mqtt/` — MQTT service, Wiegand adapter, badge/state payload types
- `apps/api/src/modules/sso/` — SAML + OIDC SSO (production-ready, supports multiple IdPs)
- `apps/api/src/modules/audit/` — SHA-256 hash-chain audit log (production-ready)
- `apps/api/src/modules/ai-agent/qdrant/` — Qdrant vector DB client (existing, 3 collections, 4096-dim Qwen)
- `apps/api/src/modules/ai/ai.processor.ts` — Dual-write pattern: pgvector + Qdrant
- `apps/api/src/modules/site/` — Site/Organization CRUD (needs parent-child extension for multi-site)
- `apps/api/src/modules/organization/` — Organization branding and config
- `apps/api/src/common/guards/feature-gate.guard.ts` — Existing feature gate guard
- `apps/api/prisma/schema.prisma` — Models: Organization, Credential, Door, Zone, Schedule, AccessLevel, CameraDoorMap, Controller
- `packages/shared/src/schemas/access.schema.ts` — Zod schemas for access control
- `packages/shared/src/types/access.types.ts` — AccessDecision, CredentialDto, DoorStateEvent
- `packages/shared/src/constants/roles.ts` — ROLE_HIERARCHY (extend for multi-site hierarchy)
- `apps/api/src/modules/license/` — License module with JWT claims encoding

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Access control CRUD** (`modules/access/`) — Credentials, zones, schedules, access levels, evaluation. Already built, extends directly for BASTION.
- **Door state machine** (`modules/door/`) — MQTT event handler, forced/held/open alerts, emergency lockdown/unlock. Reuse for video correlation triggers.
- **MQTT service** (`mqtt/`) — Full MQTT client with Wiegand adapter. Reuse for RFID and biometric events.
- **SSO module** (`modules/sso/`) — Production-ready SAML + OIDC. Included in BASTION pack via feature gate.
- **Audit module** (`modules/audit/`) — SHA-256 hash chain, async via BullMQ. All new actions must be `@Audited()`.
- **Qdrant service** (`modules/ai-agent/qdrant/`) — Existing vector DB client. Add `faces` collection for face embeddings.
- **AI Preprocessor** (`services/ai-preprocessor/`) — Add endpoints for face detection, face embedding extraction, weapon detection, abandoned object detection, zone counting.
- **YOLO + ByteTrack** — Existing object detection pipeline. Extend with fine-tuned YOLO models for weapons + objects.
- **BullMQ queues** — Existing `ai-process`, `notification-send`, `audit-write` queues. New detection types enqueue new jobs.
- **Feature gates + guards** — BASTION module flags already defined (placeholders). Wire them up.

### Established Patterns
- **Guard chain:** JwtAuthGuard → TenantIsolationGuard → RolesGuard → FeatureGateGuard
- **AI detection:** Frame capture → POST to AI Preprocessor → detect → return results → enqueue alert → Socket.IO push
- **Access evaluation:** Credential check → anti-passback → schedule eval → emit event → async persist
- **Multi-tenancy:** Prisma extension auto-injects organizationId. Extend for parent-child org hierarchy.
- **Async processing:** BullMQ queues for non-blocking operations (audit, alerts, notifications)
- **Snapshot storage:** Local filesystem via `@fastify/static`. Same pipeline for access correlation snapshots.

### Integration Points
- **AI Preprocessor** — Add new routes for face detection/recognition (`/api/v1/face/detect`, `/api/v1/face/recognize`, `/api/v1/face/enroll`, `/api/v1/face/antispoof`), weapon detection (`/api/v1/weapons/detect`), abandoned object (`/api/v1/abandoned/detect`), crowd count (`/api/v1/crowd/count`), behavior (`/api/v1/behavior/analyze`)
- **Access control** — Add face-recognition-as-credential to `evaluateAccess()`. Integration point: face matched → create synthetic `AccessDecision` with credential type `FACE`
- **Multi-site** — Add `parentOrganizationId` to Organization model. Update `TenantIsolationGuard` for hierarchical org access. New `SiteController` for child org management.
- **Qdrant** — New `faces` collection (cosine distance, 512-dim for ArcFace embeddings). Add face upsert/search to existing `QdrantService`.
- **Dashboard** — New route groups for multi-site management, face enrollment, access config, BASTION-specific settings pages
- **Mobile** — Face enrollment screen (camera capture + upload), multi-site switcher
- **Feature gates** — Wire `advanced_facial_recognition`, `anti_spoofing`, etc. module flags to `FeatureGateService` seeding

</code_context>

<specifics>
## Specific Ideas

- InsightFace/ArcFace choisi car standard industriel pour la reconnaissance faciale offline, meilleure précision que Ollama pour le matching
- Anti-spoofing passif uniquement : pas de coopération utilisateur nécessaire, fonctionne sur toutes les caméras existantes
- Architecture multi-site en déploiement unique : plus simple que la sync distribuée, réutilise l'isolation tenant existante
- Les clients BASTION ont déjà leur propre infrastructure réseau (VPN/WAN) — VaultOS documente les prérequis
- Blacklist globale + snapshot à chaque détection : alerte critique immédiate, pas de faux sentiment de sécurité
- Les snapshots de corrélation accès utilisent le même pipeline que les snapshots d'alerte VISION — pas de nouveau système de stockage
- L'enrôlement facial se fait par upload photo (pas de capture caméra) pour éviter les problèmes de qualité d'image

</specifics>

<deferred>
## Deferred Ideas

- **Running/falling/fighting behavior detection** — Nécessite pose estimation (YOLO-Pose/MediaPipe), nouveau modèle. Future phase.
- **Active liveness (blink/head-turn)** — Pour bornes d'accès dédiées avec écran. Future amélioration BASTION.
- **Auto-capture enrollment (camera-based face enrollment)** — Alternative à l'upload photo. Future amélioration.
- **VPN WireGuard intégré** — Solution VPN complète intégrée au Docker Compose. Voir décision VIS-23 (Phase 2) pour DDNS/VPN.
- **Export vidéo avec overlay faciale** — Marquer les visages reconnus dans les exports vidéo. Future phase.

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-BASTION AI & Access Control*
*Context gathered: 2026-07-18*
