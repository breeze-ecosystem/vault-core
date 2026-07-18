# Phase 2: VISION Pack - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete all 23 VISION features (VIS-01 to VIS-23) — the entry-level product deliverable. VISION is a fixed pack with max 10 cameras, local-only, no BASTION features. Builds on Phase 1 (license feature gates already enforce VISION limits).

**Requirements:** VIS-01 to VIS-23

</domain>

<decisions>
## Implementation Decisions

### Canaux d'alerte (WhatsApp/Telegram/SMS)
- **D-01:** **Hermes Agent (open source)** déployé chez le client dans son Docker Compose. Remplace l'API WhatsApp Business. Connexion via QR code WhatsApp Web (pas de compte Business, pas de templates Meta). WhatsApp obligatoire, Telegram optionnel au choix du client.
- **D-02:** Messages WhatsApp : texte + screenshot image. Coûts WhatsApp inclus dans licence VISION (VaultOS paie via le compte Hermes central).
- **D-03:** SMS : modem GSM Huawei E3372 (~20€) prioritaire. Gateway cloud en fallback optionnel. Le client choisit dans le dashboard. Volume estimé <100 SMS/mois/client.
- **D-04:** Files d'attente locales si aucun canal disponible. Retry automatique quand la connexion revient.
- **D-05:** Langue : français seulement pour v1.0.
- **D-06:** Documenter la décision Hermes Agent + modem GSM dans une note technique/ADR.

### Reconnaissance faciale VISION (VIS-07)
- **D-07:** **Un seul moteur** de reconnaissance faciale avec limites par licence : VISION = max 50 visages, whitelist uniquement. BASTION débloque illimité + blacklist + scoring + historique.
- **D-08:** Import visages : dashboard + app mobile (les deux).
- **D-09:** Stockage local (PostgreSQL ou filesystem). Pas de cloud.

### Géofencing & mode absence (VIS-20, VIS-16, VIS-22)
- **D-10:** Détection présence par **WiFi** (connecté = présent, déconnecté = absence). Pas de GPS.
- **D-11:** Automatique avec notification : "Mode absence activé" / "Mode présence activé". Pas de confirmation.
- **D-12:** **Sensibilité renforcée** en mode absence (seuils plus bas, tous les canaux actifs).
- **D-13:** Armé quand TOUS les téléphones quittent le WiFi. Désarmé dès qu'UN revient.
- **D-14:** Timeout configurable (15 min) si téléphone éteint/perdu → considéré absent.
- **D-15:** Délai d'armement configurable (10 min par défaut) pour éviter les faux départs.
- **D-16:** Armement manuel + programmation horaire possible (si téléphone oublié au bureau).
- **D-17:** Enregistrement continu inchangé en mode absence. Seule la sensibilité des alertes change.
- **D-18:** DND (notifications silencieuses) : plages horaires programmables. Indépendant mais interagit avec le mode absence (le mode absence outrepasse le DND).
- **D-19:** Alertes CRITIQUES passent outre le mode silencieux.

### Multi-utilisateurs & partage (VIS-19, VIS-21)
- **D-20:** Partage flux (VIS-19) : lien temporaire **sans login**, configurable (1h/6h/24h/perso), caméra(s) au choix, HTTPS obligatoire, révocable par le propriétaire. Notification quand le tiers ouvre le lien.
- **D-21:** Comptes secondaires (VIS-21) : jusqu'à 3. Rôle choisi à l'invitation (admin ou viewer). Création par email/SMS OU manuelle par l'admin. Blocage avec message d'upgrade BASTION si limite atteinte.

### Accès hors réseau (VIS-23)
- **D-22:** **DDNS recommandé** (plus simple pour les non-techniciens). VaultOS fournit un conteneur DDNS (DuckDNS/No-IP) dans le Docker Compose + guide de configuration.
- **D-23:** VPN (WireGuard) possible pour les clients plus techniques. Documentation uniquement.

### Découverte & streaming (VIS-01 à VIS-05)
- **D-24:** Streaming live temps réel dans l'app mobile Expo (via expo-av ou WebRTC).
- **D-25:** Découverte ONVIF : vérifier que le code existant fonctionne + construire UI de scan dans le dashboard.
- **D-26:** Qualité adaptative (VIS-05) : via **substreams** (HD + SD fournis par la caméra). Pas de transcodage serveur.

### the agent's Discretion
- Implémentation exacte de l'intégration Hermes Agent (documentation à suivre).
- UI design des pages (activation wizard, license settings — pattern Phase 1).
- Détails du cron de vérification licence.
- Convention de nommage exacte des clés de feature flags (module key naming).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` §Phase 2 — Phase goal, success criteria (6 items), 23 VISION requirements
- `.planning/REQUIREMENTS.md` — VIS-01 to VIS-23 full spec
- `.planning/STATE.md` — Current project state

### Pricing & Feature Matrix
- `docs/PRICING-SPEC.md` — Complete feature matrix: VISION (23 features, max 10 cams), BASTION (49 features + modules), license rules

### Phase 1 Context (license & feature gate foundation)
- `.planning/phases/01-architecture-license-foundation/01-CONTEXT.md` — All D-01 to D-21 decisions carry forward (feature gates, pack+module model, activation wizard, mode dégradé, vault-app architecture)

### Existing Code Assets
- `apps/api/src/modules/license/` — License module (activation, status, JWT claims)
- `apps/api/src/common/guards/feature-gate.guard.ts` — Global feature gate guard
- `apps/api/src/modules/feature-gate/feature-gate.service.ts` — Feature seeding
- `apps/api/src/common/decorators/feature-gate.decorator.ts` — `@RequiresFeature()` decorator
- `apps/api/prisma/schema.prisma` — Models: License, FeatureFlag, Organization, Camera
- `apps/dashboard/lib/api.ts` — API client with camera/license functions
- `apps/mobile/lib/api.ts` — Mobile API client
- `packages/shared/src/` — Shared schemas, types, constants

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Camera ingestion pipeline** (`apps/api/src/modules/ingestion/`) — RTSP → FFmpeg → AI analysis. Already exists, minor alignment for VIS-01 to VIS-05.
- **ONVIF discovery** (`apps/api/src/modules/camera/`) — Auto-discovery code exists. Needs verification + dashboard UI.
- **Alert system** (BullMQ + Socket.IO) — Extend for WhatsApp/Telegram/SMS channels via Hermes + GSM modem.
- **FeatureGateGuard** — Already enforces per-org feature flags. VISION limits (max 10 cameras, 3 users) flow from license JWT claims.
- **LicenseExpiryGuard** — Selective guard that can extend for degraded/expired enforcement.
- **Mobile app** (`apps/mobile/`) — Already has auth, notification, settings screens. Add live streaming viewer.
- **Dashboard auth pattern** (`apps/dashboard/lib/auth-client.ts`) — Reuse for new VISION pages.
- **ScheduleModule** (`@nestjs/schedule`) — For the 24h license ping + geofencing timeout checks.

### Established Patterns
- **Guard chain**: JwtAuthGuard → TenantIsolationGuard → RolesGuard → FeatureGateGuard
- **UI pages**: Pages Router in dashboard, Expo Router in mobile
- **Notification channels**: Extend `notifications.processor.ts` for Hermes/GSM delivery
- **Error handling**: Global AllExceptionsFilter + ZodValidationPipe
- **Multi-tenancy**: TenantIsolationGuard for org-scoped data access

### Integration Points
- **Hermes Agent**: Docker Compose sidecar service, configured via env vars. vault-os sends alerts to Hermes via HTTP/webhook. Hermes routes to WhatsApp/Telegram.
- **GSM modem**: Serial/USB communication via existing FFmpeg infrastructure or new `@nestjs/serialport` module. Configuration in dashboard settings.
- **Face recognition**: Extend AI Preprocessor (Python FastAPI) or add new endpoint for facial rec. License-enforced via FeatureGateGuard.
- **Geofencing**: Mobile app detects WiFi SSID, calls API to arm/disarm. No internet needed — local API call on same network.
- **Stream sharing**: New endpoint in camera controller. Generate signed URL with expiry. Read-only, no auth needed for the share URL.
- **DDNS container**: Added to `docker-compose.prod.yml` as optional service.

</code_context>

<specifics>
## Specific Ideas

- Hermes Agent est open-source et déjà utilisé par la communauté pour WhatsApp/Telegram sans API Business. À étudier pour savoir si on doit le wrap dans un microservice dédié ou l'intégrer directement.
- Le modem Huawei E3372 est recommandé car trouvable partout en Afrique de l'Ouest, supporte AT commands, et fonctionne sans driver sur Linux.
- WhatsApp via QR code (WhatsApp Web) est intentionnel — pas de compte Business, pas de validation Meta, pas de templates. Le client scanne 1x à l'installation et ça marche.
- Le partage de flux via lien temporaire est volontairement simplifié pour VISION (pas d'auth, pas de compte). BASTION pourra ajouter un système plus sécurisé.
- La détection WiFi pour le géofencing évite les problèmes de batterie et de permissions iOS/Android liés au GPS en arrière-plan.

</specifics>

<deferred>
## Deferred Ideas

- Anti-spoofing (liveness detection) — BASTION scope (Phase 3)
- Blacklist dynamique + scoring risque — BASTION scope (Phase 3)
- Qdrant vector DB pour reconnaissance faciale avancée — BASTION scope (Phase 3)
- Streaming WebRTC (vs substreams) — à étudier, mais substreams plus simples pour v1
- VPN WireGuard intégré (KDE/NetworkManager) — documentation seulement pour l'instant

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-VISION Pack*
*Context gathered: 2026-07-18*
