# Oversight Hub

## What This Is

Oversight Hub is a commercial SaaS platform that delivers AI-powered physical security intelligence — unifying video surveillance, access control, and operational security into a single, premium experience. Sold via subscription and license to security teams, IT, facilities, and operations worldwide, it correlates real-world events (badges, doors, vehicles, incidents, anomalies) with video evidence and automated decision workflows. It replaces fragmented point solutions with an integrated platform that is visually stunning, intuitive, and AI-first.

## Current State: v1.0 Shipped

**Version:** v1.0 — Minimum Commercial Product (VISION + BASTION)
**Shipped:** 2026-07-19
**Phases:** 5 phases, 35 plans, 69+ tasks
**Architecture:** vault-os (client product) + vault-app (admin portal) separated; marketing extracted to standalone repo

**What was built:**
- 🏗️ Architecture refactored — vault-os/vault-app split, license generation in vault-app, activation in vault-os
- 👁️ Pack VISION — 23 features: live streaming, IA human detection, face recognition (50 faces), WhatsApp/SMS alerts, local H.265 storage, event timeline, geofencing, multi-user
- 🏰 Pack BASTION — advanced AI (faces unlimited, anti-spoofing, weapons, crowd, behavior), access control (RFID, biometric, QR), multi-site (5 sites), HAPDP compliance, reports, API/webhooks, fire/BMS integration
- 🔑 License system — vault-app generates keys, vault-os validates, 24h ping, 72h degraded mode, 7-day trial
- 🛒 vault-app admin — org management, usage dashboard, pricing (FCFA), documentation, Crisp chat

## Core Value

Correlate every physical security event with video evidence and AI analysis in real time, so security operators know what happened, where, and what to do — without switching between disconnected systems.

## Requirements

### Validated

- ✓ Video ingestion pipeline (RTSP → FFmpeg frames → AI analysis)
- ✓ Camera management and site organization
- ✓ Real-time alert system with video clip correlation
- ✓ AI-powered frame analysis (object detection, zone intrusion)
- ✓ JWT-based authentication with RBAC
- ✓ Notification system (email + push + in-app)
- ✓ Multi-app delivery (NestJS API, Next.js Dashboard, Expo Mobile)
- ✓ Edge agent health monitoring, Docker Compose deployment
- ✓ Multi-site management
- ✓ ONVIF camera auto-discovery, PTZ control, event subscriptions
- ✓ OSDP door controller communication (serial I/O, MQTT)
- ✓ Access control (badges, QR, mobile credentials, anti-passback, zone rules)
- ✓ Door management (forced, held open, unsecured, desynchronized)
- ✓ Access event journal correlated with video clips
- ✓ Visitor kiosk (QR check-in/out, badge printing, Docker CUPS)
- ✓ Immutable audit logs with hash-chain integrity
- ✓ Fine-grained roles (admin, supervisor, operator, viewer, auditor)
- ✓ Pack VISION (V1-V23) — Streaming IA, détection humaine, alertes WhatsApp/SMS, stockage local H.265, timeline, géofencing, multi-utilisateur — v1.0
- ✓ Pack BASTION (B1-B18) — Reconnaissance faciale illimitée, anti-spoofing, armes, foule, comportement, contrôle d'accès complet, multi-site, rapports PDF, HAPDP, API/Webhooks, intégrations — v1.0
- ✓ vault-app Admin Portal (A1-A5) — Connexion sécurisée, gestion orgs, génération licences, dashboard usage, pages marketing FCFA — v1.0

### Active

<!-- Next milestone requirements go here after /gsd-new-milestone -->

### Out of Scope

- Hardware manufacturing — VaultOS est logiciel pur. Installateurs partenaires pour le matériel.
- Cloud video storage — auto-hébergé est le différentiateur
- SOC-as-a-service (monitoring humain) — activité opérationnelle, pas logicielle
- Pack sur mesure — 2 packs fixes seulement (VISION + BASTION)
- Paiement mensuel — licence annuelle obligatoire uniquement
- Négociation prix de base — prix publics fixes, modules négociables > 20M FCFA/an
- Marketplace intégrations tierces — futur, pas v1.0
- Stripe/PayPal intégré — Paiement out-of-band en Afrique
- Drone integration — Sur devis uniquement
- Mobile SDK for third-party apps — Future version

## Context

**Codebase:** ~7,000+ LOC across 5 phases. Tech stack: NestJS + Next.js + Expo + Prisma + Redis + BullMQ + FastAPI (AI Preprocessor). AI uses insightface (CPU), YOLOv12, Ollama. Deployed via Docker Compose with Caddy.

**Architecture:**
- **vault-os** = product delivered to client (Docker Compose) — license activation, 24h verification, degraded mode
- **vault-app** = VaultOS team admin portal (standalone Next.js) — marketing, license generation, client management
- Feature gates = VISION / BASTION + optional modules

**Market:** Physical security in Niger and West Africa. Competitors: Verkada (expensive, cloud), Hikvision/Dahua (no IA, no HAPDP). Positioning: data sovereignty, local AI, HAPDP compliance, FCFA pricing.

## Constraints

- **Tech stack**: Must build on existing NestJS + Next.js + Expo + Prisma + Redis + BullMQ stack. No framework rewrites.
- **AI**: Continue using Ollama/vision models for AI analysis; integrate with access control events.
- **Deployment**: Self-hosted via Docker Compose with Caddy reverse proxy. No mandatory cloud dependency.
- **Performance**: Real-time alerting must stay sub-second. Video correlation must not block the event pipeline.
- **Security**: Role-based access control must extend to new modules. Audit logs must be immutable. JWT auth must cover all new endpoints.
- **Mobile**: Expo mobile app must support new guard/operator workflows (check-in, incident response, door control).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| vault-os = produit client, vault-app = admin portal | Séparation claire entre ce qu'on livre et ce qu'on utilise en interne | ✓ Good |
| License : génération dans vault-app, activation dans vault-os | Évite que le client puisse générer ses propres licences | ✓ Good |
| 2 packs fixes seulement (VISION + BASTION) | Spec fondateur : pas de pack sur mesure, pas de 3ème pack | ✓ Good |
| Licence annuelle uniquement (pas de mensuel) | Spec fondateur | ✓ Good |
| Vérification licence 24h + mode dégradé 72h | Permet fonctionnement offline tout en protégeant le modèle | ✓ Good — implemented |
| Pas de Stripe/PayPal en v1 — facturation out-of-band | Paiement géré manuellement ou via partenaire en Afrique | ✓ Good — confirmed |
| Conservation du code existant vault-os | Réutilise ~50% du travail déjà fait, pas de rewrite inutile | ✓ Good |
| Hermes Agent for WhatsApp (QR-based, no API approval) | WhatsApp Business API délais d'approbation | ✓ Good |
| SMS via GSM modem (Huawei E3372, AT commands) | Solution offline, pas de dépendance SMS provider | ✓ Good |
| Insightface buffalo_l CPU-only (no GPU) | Compatible avec matériel client standard | ✓ Good |
| Local storage only, no cloud | Différenciateur principal | ✓ Good |
| WiFi geofencing (no GPS) | Fonctionne en intérieur, pas de permission GPS | ✓ Good |
| HAPDP compliance wizard approach | Wizard auto-rempli simplifie la conformité pour le client | ✓ Good |
| Marketing extracted to standalone repo | Découplage des cycles de release | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
5. Move shipped requirements to Validated
6. Archive milestone artifacts

---

*Last updated: 2026-07-19 after v1.0 milestone completion*
