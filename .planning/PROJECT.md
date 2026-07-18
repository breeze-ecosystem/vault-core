# Oversight Hub

## What This Is

Oversight Hub is a commercial SaaS platform that delivers AI-powered physical security intelligence — unifying video surveillance, access control, and operational security into a single, premium experience. Sold via subscription and license to security teams, IT, facilities, and operations worldwide, it correlates real-world events (badges, doors, vehicles, incidents, anomalies) with video evidence and automated decision workflows. It replaces fragmented point solutions with an integrated platform that is visually stunning, intuitive, and AI-first.

## Current Milestone: v1.0 Minimum Commercial Product (VISION + BASTION)

**Goal:** Livrer un produit commercialisable avec 2 packs (VISION jusqu'à 10 caméras, BASTION entreprise), licence annuelle, auto-hébergé chez le client, et portail admin dans vault-app.

**Target features:**
- 🏗️ Architecture 2 apps — vault-os (produit client) + vault-app (admin portal équipes VaultOS)
- 👁️ Pack VISION — 23 fonctionnalités de base (streaming, détection IA, alertes, stockage local)
- 🏰 Pack BASTION — VISION + IA avancée + contrôle d'accès + multi-site + HAPDP + API
- 🔑 Licence — génération dans vault-app, activation dans vault-os, vérification 24h, mode dégradé
- 🛒 Pricing & plans publics (FCFA) sur vault-app
- ⚙️ Mode dégradé si >72h sans internet, lecture seule si licence expirée

## Core Value

Correlate every physical security event with video evidence and AI analysis in real time, so security operators know what happened, where, and what to do — without switching between disconnected systems.

## Requirements

### Validated

<!-- Existing codebase that works and is relied upon. -->

- Video ingestion pipeline (RTSP → FFmpeg frames → AI analysis)
- Camera management and site organization
- Real-time alert system with video clip correlation
- AI-powered frame analysis (object detection, zone intrusion)
- JWT-based authentication with RBAC
- Notification system (email + push + in-app)
- Multi-app delivery (NestJS API, Next.js Dashboard, Expo Mobile)
- Edge agent health monitoring, Docker Compose deployment
- Multi-site management
- ONVIF camera auto-discovery, PTZ control, event subscriptions
- OSDP door controller communication (serial I/O, MQTT)
- Access control (badges, QR, mobile credentials, anti-passback, zone rules)
- Door management (forced, held open, unsecured, desynchronized)
- Access event journal correlated with video clips
- Visitor kiosk (QR check-in/out, badge printing, Docker CUPS)
- Immutable audit logs with hash-chain integrity
- Fine-grained roles (admin, supervisor, operator, viewer, auditor)

### Active

<!-- v1.0 scope from founders' spec — VISION + BASTION packs. -->

**Pack VISION (V1-V23):**

- [ ] **VISION-01**: Streaming live local basique — vision temps réel sur réseau local (Dashboard + Mobile)
- [ ] **VISION-02**: Multi-appareil local — téléphone, tablette, PC sur même WiFi
- [ ] **VISION-03**: Détection mouvement IA — alerte humain uniquement (filtre animaux/végétation/ombres)
- [ ] **VISION-04**: Zones d'intérêt — délimitation zones de détection par caméra
- [ ] **VISION-05**: Alertes locales — notification push + SMS (si modem)
- [ ] **VISION-06**: Alertes WhatsApp — via WhatsApp Business API
- [ ] **VISION-07**: Seuil de sensibilité réglable par caméra
- [ ] **VISION-08**: Historique événements — timeline interactive, recherche date/heure
- [ ] **VISION-09**: Export vidéo — téléchargement clip 30s autour d'un événement
- [ ] **VISION-10**: Screenshots automatiques à chaque alerte
- [ ] **VISION-11**: Stockage local — enregistrement sur disque/NAS client
- [ ] **VISION-12**: Rétention configurable — 7j/15j/30j selon espace disque
- [ ] **VISION-13**: Compression H.265/HEVC pour économiser espace
- [ ] **VISION-14**: Dashboard local accessible sur réseau local
- [ ] **VISION-15**: Multi-utilisateurs — jusqu'à 3 comptes secondaires
- [ ] **VISION-16**: Notifications silencieuses — mode "ne pas déranger" programmable
- [ ] **VISION-17**: Vision nocturne IA — amélioration automatique image de nuit
- [ ] **VISION-18**: Qualité adaptative — résolution selon capacité matérielle
- [ ] **VISION-19**: Reconnaissance faciale basique — whitelist/blacklist, max 50 visages, upload manuel
- [ ] **VISION-20**: Partage flux local — accès temporaire tiers sur même réseau
- [ ] **VISION-21**: Mode absence auto — activation géofencing local
- [ ] **VISION-22**: Accès hors réseau — VPN/DDNS (configuration client)
- [ ] **VISION-23**: Licence activation + vérification 24h + mode dégradé

**Pack BASTION (B1-B49) — IA avancée :**

- [ ] **BASTION-01**: Reconnaissance faciale avancée — illimitée, scoring risque 0-100, historique passages, blacklist dynamique
- [ ] **BASTION-02**: Anti-spoofing — détection photo/écran/masque (liveness)
- [ ] **BASTION-03**: Détection objets abandonnés — alerte si objet statique > X minutes
- [ ] **BASTION-04**: Détection armes — arme à feu, couteau, objet suspect
- [ ] **BASTION-05**: Comptage de foule — densité temps réel, alerte seuil
- [ ] **BASTION-06**: Analyse comportementale — course, chute, bagarre, errance, intrusion zone, affluence
- [ ] **BASTION-07**: Contrôle d'accès complet — RFID, biométrie, QR code, corrélation vidéo
- [ ] **BASTION-08**: Gestion horaires accès — programmable par jour/heure
- [ ] **BASTION-09**: Gestion groupes accès — profils par rôle (employé, manager, visiteur)
- [ ] **BASTION-10**: Multi-site — jusqu'à 5 sites, comparaison inter-sites, synchronisation
- [ ] **BASTION-11**: RBAC granulaire + SSO entreprise (SAML/OAuth2)
- [ ] **BASTION-12**: Rapports hebdomadaires/mensuels PDF auto + export CSV
- [ ] **BASTION-13**: Dashboard analytics temps réel — graphiques, tendances, KPIs
- [ ] **BASTION-14**: Recherche avancée — filtres date/site/type événement/personne
- [ ] **BASTION-15**: Stockage avancé — rétention 30j-1an+, redondance RAID, backup auto, preuve judiciaire certifiée
- [ ] **BASTION-16**: Conformité HAPDP — déclaration assistée, registre traitements, affichage consentement, pseudonymisation, droit accès sujet, traçabilité
- [ ] **BASTION-17**: API REST locale documentée + Webhooks
- [ ] **BASTION-18**: Intégrations — alarme incendie, BMS

**vault-app Admin Portal :**

- [ ] **ADMIN-01**: Portail admin vault-app — connexion sécurisée équipes VaultOS
- [ ] **ADMIN-02**: Gestion des organisations clients (CRUD, statut licence, historique)
- [ ] **ADMIN-03**: Génération de licences — création clés VISION/BASTION + modules
- [ ] **ADMIN-04**: Dashboard usage — stats agrégées par client (caméras, stockage, uptime)
- [ ] **ADMIN-05**: Pages marketing — pricing FCFA, produits, solutions, blog, contact

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Hardware manufacturing — VaultOS est logiciel pur. Installateurs partenaires pour le matériel.
- Cloud video storage — auto-hébergé est le différentiateur
- SOC-as-a-service (monitoring humain) — activité opérationnelle, pas logicielle
- Pack sur mesure — 2 packs fixes seulement (VISION + BASTION)
- Paiement mensuel — licence annuelle obligatoire uniquement
- Négociation prix de base — prix publics fixes, modules négociables > 20M FCFA/an
- Facial recognition for surveillance — réglementaire (HAPDP) ; déverrouillage accès seulement
- Marketplace intégrations tierces — futur, pas v1.0

## Context

**Code existant:** Une base technique solide existe déjà dans vault-os — ingestion vidéo, gestion caméras, analyse IA (Ollama), contrôle d'accès (OSDP, ONVIF, portes, QR, RFID), alertes temps réel (BullMQ + Socket.IO), JWT + RBAC, audit logs, kiosk visiteur, edge agent, et doubles frontends (Dashboard + Mobile). Déploiement Docker Compose.

**Problème :** Le code existant a été construit sans la spec fondateur. Les fonctionnalités sont mélangées entre le produit (vault-os) et l'admin (vault-app). Le module licence fait génération + activation alors que la génération doit être dans vault-app. Le feature-gating (FREE/PROFESSIONAL/ENTERPRISE) doit devenir VISION/BASTION + modules. Environ 50% du travail est fait, 50% reste à aligner sur la spec.

**Architecture cible :**
- **vault-os** = le produit livré chez le client (Docker Compose) — activation licence, vérification 24h, mode dégradé
- **vault-app** = portail admin des équipes VaultOS (Next.js standalone, port 3200) — marketing, génération licences, gestion clients
- Licence = activation uniquement dans vault-os (pas de génération)
- Feature gates = VISION / BASTION + modules optionnels

**Le marché :** Marché physique security au Niger et Afrique de l'Ouest. Concurrence : Verkada (trop cher, cloud), Hikvision/Dahua (pas d'IA, pas HAPDP). Positionnement : souveraineté des données, IA locale, conformité HAPDP, prix FCFA.

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
| Vérification licence 24h + mode dégradé 72h | Permet fonctionnement offline tout en protégeant le modèle | — Pending |
| Pas de Stripe/PayPal en v1 — facturation out-of-band | Paiement géré manuellement ou via partenaire en Afrique | — Pending |
| Conservation du code existant vault-os | Réutilise ~50% du travail déjà fait, pas de rewrite inutile | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
---
*Last updated: 2026-07-18 — v1.0 milestone initialization (VISION + BASTION spec)*
