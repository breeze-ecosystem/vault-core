# Requirements: VaultOS v1.0

**Defined:** 2026-07-18
**Core Value:** Voir l'invisible. Protéger l'essentiel. Auto-hébergé. Vos données restent chez vous.

## v1 Requirements

Requirements for the Minimum Commercial Product. Each maps to roadmap phases.

### Pack VISION — Caméra & Streaming

- [ ] **VIS-01**: Découverte auto caméras — scan réseau ONVIF/RTSP, auto-configuration
- [ ] **VIS-02**: Streaming live local — vision temps réel sur réseau local (app/web locale)
- [ ] **VIS-03**: Multi-appareil local — accès depuis téléphone, tablette, PC sur le même réseau WiFi
- [ ] **VIS-04**: Vision nocturne IA — amélioration automatique image de nuit
- [ ] **VIS-05**: Qualité adaptative — résolution ajustée selon capacité matériel

### Pack VISION — Détection & Alertes

- [ ] **VIS-06**: Détection mouvement IA — alerte uniquement si mouvement humain (filtre animaux, végétation, ombres)
- [ ] **VIS-07**: Reconnaissance faciale basique — whitelist/blacklist, max 50 visages, upload manuel
- [ ] **VIS-08**: Alertes locales — notification push sur app + SMS (si carte SIM insérée)
- [ ] **VIS-09**: Alertes WhatsApp — envoi alerte via WhatsApp Business (nécessite internet)
- [ ] **VIS-10**: Seuil de sensibilité — réglage personnalisé par caméra
- [ ] **VIS-11**: Zones d'intérêt — délimitation zones de détection sur l'image

### Pack VISION — Stockage & Historique

- [ ] **VIS-12**: Stockage local — enregistrement sur disque dur/NAS du client
- [ ] **VIS-13**: Rétention configurable — 7 jours, 15 jours, 30 jours (selon espace disque)
- [ ] **VIS-14**: Historique événements — timeline interactive, recherche par date/heure
- [ ] **VIS-15**: Export vidéo — téléchargement clip 30 secondes autour d'un événement
- [ ] **VIS-16**: Screenshots auto — capture image lors d'une alerte
- [ ] **VIS-17**: Compression intelligente — H.265/HEVC pour économiser espace disque

### Pack VISION — App & Gestion

- [ ] **VIS-18**: Dashboard local — interface web/app accessible sur le réseau local
- [ ] **VIS-19**: Partage de flux local — accès temporaire à un tiers sur le même réseau
- [ ] **VIS-20**: Mode absence auto — activation auto quand téléphone quitte la zone (géofencing local)
- [ ] **VIS-21**: Multi-utilisateurs — jusqu'à 3 comptes secondaires
- [ ] **VIS-22**: Notifications silencieuses — mode "ne pas déranger" programmable
- [ ] **VIS-23**: Accès hors réseau local — VPN ou DDNS configuré par le client (optionnel)

### Pack BASTION — IA Avancée

- [ ] **BAS-01**: Reconnaissance faciale avancée — illimitée, scoring risque 0-100, historique passages, blacklist dynamique
- [ ] **BAS-02**: Anti-spoofing — détection photo, écran, masque (liveness detection)
- [ ] **BAS-03**: Détection objets abandonnés — alerte si objet statique > X minutes dans zone critique
- [ ] **BAS-04**: Détection armes — reconnaissance arme à feu, couteau, objet suspect
- [ ] **BAS-05**: Comptage de foule — densité temps réel, alerte si seuil dépassé
- [ ] **BAS-06**: Analyse comportementale — course, chute, bagarre, errance, intrusion zone, affluence

### Pack BASTION — Contrôle d'Accès

- [ ] **BAS-07**: Intégration lecteurs RFID — liaison badge + caméra
- [ ] **BAS-08**: Intégration biométrie — empreinte digitale + corrélation vidéo
- [ ] **BAS-09**: Intégration QR code — badge numérique, accès visiteur temporaire
- [ ] **BAS-10**: Corrélation accès/vidéo — snapshot auto lors accès refusé ou forcé
- [ ] **BAS-11**: Gestion horaires — accès programmable par jour/heure
- [ ] **BAS-12**: Gestion groupes — profils accès par rôle (employé, manager, visiteur)

### Pack BASTION — Multi-Site & Gestion

- [ ] **BAS-13**: Dashboard multi-sites — vue centralisée de tous les sites (si VPN inter-sites)
- [ ] **BAS-14**: Jusqu'à 5 sites inclus
- [ ] **BAS-15**: Comparaison inter-sites — métriques croisées entre sites
- [ ] **BAS-16**: Gestion centralisée utilisateurs — RBAC granulaire, rôles personnalisés
- [ ] **BAS-17**: SSO entreprise — SAML / OAuth2
- [ ] **BAS-18**: Audit trail complet — log immuable de toute action
- [ ] **BAS-19**: Synchronisation inter-sites — données synchronisées entre sites (si connectés)

### Pack BASTION — Rapports & Analytics

- [ ] **BAS-20**: Rapports hebdomadaires — PDF auto : incidents, fréquentation, anomalies
- [ ] **BAS-21**: Rapports mensuels — PDF détaillé + export données
- [ ] **BAS-22**: Dashboard analytics temps réel — graphiques, tendances, KPIs sécurité
- [ ] **BAS-23**: Recherche avancée — filtres par date, site, type événement, personne
- [ ] **BAS-24**: Export données — CSV, PDF

### Pack BASTION — Stockage & Archivage

- [ ] **BAS-25**: Stockage local illimité — selon capacité disque du client
- [ ] **BAS-26**: Rétention configurable — par site, par type d'événement, 30j à 1an+
- [ ] **BAS-27**: Preuve judiciaire — export conforme, timestamp certifié
- [ ] **BAS-28**: Redondance disque — support RAID 1/5/10
- [ ] **BAS-29**: Backup auto — backup sur NAS secondaire ou disque externe

### Pack BASTION — Conformité HAPDP

- [ ] **BAS-30**: Déclaration HAPDP assistée — wizard auto-rempli, génération PDF
- [ ] **BAS-31**: Registre des traitements — base traçabilité, export CSV/PDF
- [ ] **BAS-32**: Affichage consentement — module signalétique caméra, preuve timestampée
- [ ] **BAS-33**: Pseudonymisation — données sensibles masquées par défaut
- [ ] **BAS-34**: Droit accès sujet — portail self-service : voir, rectifier, supprimer
- [ ] **BAS-35**: Traçabilité accès — qui a vu quoi, quand

### Pack BASTION — Support & SLA

- [ ] **BAS-36**: Support 24/7 — hotline + chat + email
- [ ] **BAS-37**: SLA standard — intervention sous 4h à Niamey
- [ ] **BAS-38**: Documentation technique — guides installation, configuration, dépannage
- [ ] **BAS-39**: Formation initiale — session 2h équipe sécurité client
- [ ] **BAS-40**: Mises à jour incluses — nouvelles versions, correctifs sécurité

### Pack BASTION — API & Intégrations

- [ ] **BAS-41**: API REST locale — documentation complète, authentification
- [ ] **BAS-42**: Webhooks locaux — notifications événements vers systèmes internes
- [ ] **BAS-43**: Intégration alarme incendie — corrélation détection fumée + vidéo
- [ ] **BAS-44**: Intégration BMS — liaison HVAC, éclairage, accès

### Licence & Activation

- [ ] **LIC-01**: Activation licence — client active sa clé dans vault-os (pas de génération)
- [ ] **LIC-02**: Vérification 24h — ping serveur VaultOS toutes les 24h, mode dégradé si >72h sans internet
- [ ] **LIC-03**: Lecture seule si expirée — dashboard accessible, pas de nouvelles alertes IA
- [ ] **LIC-04**: Feature gating VISION/BASTION — activation/désactivation des modules selon licence
- [ ] **LIC-05**: Limites VISION — max 10 caméras, pas de fonctionnalités BASTION
- [ ] **LIC-06**: Trial auto — 7 jours d'essai pour nouvelle organisation

### vault-app Admin Portal

- [ ] **ADM-01**: Connexion sécurisée — authentification équipes VaultOS
- [ ] **ADM-02**: Gestion organisations — CRUD clients, statut licence, historique
- [ ] **ADM-03**: Génération licences — création clés VISION/BASTION + modules optionnels
- [ ] **ADM-04**: Dashboard usage — stats agrégées par client (caméras, stockage, uptime)
- [ ] **ADM-05**: Pages marketing — pricing FCFA, produits, solutions, blog, contact, étude de cas

## Out of Scope

Explicitly excluded from v1.0. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Hardware manufacturing | VaultOS est logiciel pur. Installateurs partenaires pour le matériel. |
| Cloud video storage | Auto-hébergé est le différentiateur principal |
| SOC-as-a-service (monitoring humain) | Activité opérationnelle, pas logicielle |
| Pack sur mesure | 2 packs fixes seulement (VISION + BASTION) |
| Paiement mensuel | Licence annuelle obligatoire uniquement |
| Stripe/PayPal intégré | Paiement out-of-band en Afrique |
| Marketplace intégrations tierces | Future version |
| Drone integration | Sur devis uniquement, pas dans le produit standard |
| Mobile SDK for third-party apps | Future version |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIS-01 | Phase 2 | Pending |
| VIS-02 | Phase 2 | Pending |
| VIS-03 | Phase 2 | Pending |
| VIS-04 | Phase 2 | Pending |
| VIS-05 | Phase 2 | Pending |
| VIS-06 | Phase 2 | Pending |
| VIS-07 | Phase 2 | Pending |
| VIS-08 | Phase 2 | Pending |
| VIS-09 | Phase 2 | Pending |
| VIS-10 | Phase 2 | Pending |
| VIS-11 | Phase 2 | Pending |
| VIS-12 | Phase 2 | Pending |
| VIS-13 | Phase 2 | Pending |
| VIS-14 | Phase 2 | Pending |
| VIS-15 | Phase 2 | Pending |
| VIS-16 | Phase 2 | Pending |
| VIS-17 | Phase 2 | Pending |
| VIS-18 | Phase 2 | Pending |
| VIS-19 | Phase 2 | Pending |
| VIS-20 | Phase 2 | Pending |
| VIS-21 | Phase 2 | Pending |
| VIS-22 | Phase 2 | Pending |
| VIS-23 | Phase 2 | Pending |
| BAS-01 | Phase 3 | Pending |
| BAS-02 | Phase 3 | Pending |
| BAS-03 | Phase 3 | Pending |
| BAS-04 | Phase 3 | Pending |
| BAS-05 | Phase 3 | Pending |
| BAS-06 | Phase 3 | Pending |
| BAS-07 | Phase 3 | Pending |
| BAS-08 | Phase 3 | Pending |
| BAS-09 | Phase 3 | Pending |
| BAS-10 | Phase 3 | Pending |
| BAS-11 | Phase 3 | Pending |
| BAS-12 | Phase 3 | Pending |
| BAS-13 | Phase 3 | Pending |
| BAS-14 | Phase 3 | Pending |
| BAS-15 | Phase 3 | Pending |
| BAS-16 | Phase 3 | Pending |
| BAS-17 | Phase 3 | Pending |
| BAS-18 | Phase 3 | Pending |
| BAS-19 | Phase 3 | Pending |
| BAS-20 | Phase 4 | Pending |
| BAS-21 | Phase 4 | Pending |
| BAS-22 | Phase 4 | Pending |
| BAS-23 | Phase 4 | Pending |
| BAS-24 | Phase 4 | Pending |
| BAS-25 | Phase 4 | Pending |
| BAS-26 | Phase 4 | Pending |
| BAS-27 | Phase 4 | Pending |
| BAS-28 | Phase 4 | Pending |
| BAS-29 | Phase 4 | Pending |
| BAS-30 | Phase 4 | Pending |
| BAS-31 | Phase 4 | Pending |
| BAS-32 | Phase 4 | Pending |
| BAS-33 | Phase 4 | Pending |
| BAS-34 | Phase 4 | Pending |
| BAS-35 | Phase 4 | Pending |
| BAS-36 | Phase 5 | Pending |
| BAS-37 | Phase 5 | Pending |
| BAS-38 | Phase 5 | Pending |
| BAS-39 | Phase 5 | Pending |
| BAS-40 | Phase 5 | Pending |
| BAS-41 | Phase 4 | Pending |
| BAS-42 | Phase 4 | Pending |
| BAS-43 | Phase 4 | Pending |
| BAS-44 | Phase 4 | Pending |
| LIC-01 | Phase 1 | Pending |
| LIC-02 | Phase 1 | Pending |
| LIC-03 | Phase 1 | Pending |
| LIC-04 | Phase 1 | Pending |
| LIC-05 | Phase 1 | Pending |
| LIC-06 | Phase 1 | Pending |
| ADM-01 | Phase 1 | Pending |
| ADM-02 | Phase 1 | Pending |
| ADM-03 | Phase 1 | Pending |
| ADM-04 | Phase 5 | Pending |
| ADM-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 78 total
- Mapped to phases: 78 ✓
- Unmapped: 0

---
*Requirements defined: 2026-07-18*
*Last updated: 2026-07-18 after initial definition*
