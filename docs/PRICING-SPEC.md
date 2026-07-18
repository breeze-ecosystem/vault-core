# VAULTOS — SPEC FONCTIONNALITÉS & PRIX
## Plateforme de Vidéosurveillance Intelligente Auto-Hébergée — Niger

**Version :** 1.0 (Auto-hébergée) | **Date :** Juillet 2026

---

## SOMMAIRE

1. [Modèle de Déploiement](#1-modèle-de-déploiement)
2. [Packs & Prix](#2-packs--prix)
3. [Fonctionnalités Pack VISION](#3-fonctionnalités-pack-vision)
4. [Fonctionnalités Pack BASTION](#4-fonctionnalités-pack-bastion)
5. [Modules Optionnels Bastion](#5-modules-optionnels-bastion)
6. [Matrice Fonctionnalités](#6-matrice-fonctionnalités)
7. [Exemples de Devis](#7-exemples-de-devis)
8. [Règles de Vente & Licence](#8-règles-de-vente--licence)

---

## 1. MODÈLE DE DÉPLOIEMENT

### 1.1 Principe

**Tout est chez le client. Rien n'est chez VaultOS.**

- Le logiciel s'installe sur le matériel du client (serveur local, NAS, mini-PC)
- Les caméras sont sur le réseau local du client
- Les vidéos restent sur le disque du client
- L'IA tourne sur le processeur/GPU du client
- Le client garde la maîtrise totale de ses données

### 1.2 Ce qui passe par le cloud VaultOS (minimum)

| Élément | Description | Fréquence |
|---------|-------------|-----------|
| Vérification licence | Clé activée, validité, modules autorisés | Au démarrage + toutes les 24h |
| Mises à jour | Téléchargement nouvelle version | Sur demande ou auto programmé |
| Rapports anonymisés | Stats usage (optionnel, désactivable) | Mensuel |

**Rien d'autre.** Pas de streaming cloud, pas de stockage cloud, pas de dashboard cloud.

### 1.3 Matériel Requis (fourni par le client ou recommandé)

| Pack | Config minimale | Config recommandée |
|------|-----------------|-------------------|
| Vision | Mini-PC Intel i3, 8GB RAM, 256GB SSD | Intel i5, 16GB RAM, 512GB SSD |
| Bastion | Serveur Intel i7/Xeon, 32GB RAM, 1TB SSD, GPU NVIDIA | Xeon 16 cœurs, 64GB RAM, 2TB SSD, RTX 4090/A4000 |

### 1.4 Avantage du Modèle Auto-Hébergé

| Avantage | Description |
|----------|-------------|
| Souveraineté données | Aucune donnée ne quitte le site client |
| Conformité HAPDP simplifiée | Pas de transfert de données, pas de cloud externe |
| Fonctionnement hors-ligne | Même sans internet, tout fonctionne (sauf alertes externes) |
| Latence nulle | Pas de délai réseau, analyse en temps réel pur |
| Coût internet réduit | Pas de bande passante montante pour le streaming |
| Sécurité renforcée | Air-gapped possible pour sites sensibles |

---

## 2. PACKS & PRIX

### 2.1 Pack VISION

| Élément | Prix |
|---------|------|
| Licence annuelle (1 caméra) | **75 000 FCFA/an** |
| Caméra supplémentaire | **+30 000 FCFA/an** |
| Frais d'installation & configuration | **75 000 FCFA** (one-time) |
| **Plafond** | Max 10 caméras |

**Exemples :**
- 1 caméra : 75 000/an + 75 000 setup
- 3 caméras : 135 000/an + 75 000 setup
- 5 caméras : 195 000/an + 75 000 setup
- 10 caméras : 345 000/an + 75 000 setup

---

### 2.2 Pack BASTION

| Élément | Prix |
|---------|------|
| Licence annuelle de base | **3 500 000 FCFA/an** |
| Inclus : 25 caméras, 5 sites, toute l'IA, conformité HAPDP, support 24/7 |

**Modules additionnels (annuels) :**

| Module | Prix |
|--------|------|
| Lot de 15 caméras supplémentaires | +1 800 000 FCFA |
| Contrôle d'accès (par porte/badgeuse) | +1 000 000 FCFA |
| Site supplémentaire (au-delà de 5) | +1 500 000 FCFA |
| Analyse prédictive + heatmaps | +2 000 000 FCFA |
| DPO externe dédié | +1 500 000 FCFA |
| SLA Premium (intervention 1h Niamey) | +2 500 000 FCFA |
| Intégration API tierce | Sur devis |

---

## 3. FONCTIONNALITÉS PACK VISION

### 3.1 Caméra & Streaming

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| V1 | Découverte auto caméras | Scan réseau ONVIF/RTSP, auto-configuration |
| V2 | Streaming live local | Vision temps réel sur réseau local (app/web locale) |
| V3 | Multi-appareil local | Accès depuis téléphone/tablette/PC sur le même réseau WiFi |
| V4 | Vision nocturne IA | Amélioration automatique image de nuit |
| V5 | Qualité adaptative | Résolution ajustée selon capacité matériel |

### 3.2 Détection & Alertes

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| V6 | Détection mouvement IA | Alerte uniquement si mouvement humain (filtre animaux, végétation, ombres) |
| V7 | Reconnaissance faciale basique | Liste blanche/noire, max 50 visages, upload manuel |
| V8 | Alertes locales | Notification push sur app + SMS (si carte SIM insérée) |
| V9 | Alertes WhatsApp | Envoi alerte via WhatsApp Business (nécessite internet) |
| V10 | Seuil de sensibilité | Réglage personnalisé par caméra |
| V11 | Zones d'intérêt | Délimitation zones de détection sur l'image |

### 3.3 Stockage & Historique

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| V12 | Stockage local | Enregistrement sur disque dur/NAS du client |
| V13 | Rétention configurable | 7 jours, 15 jours, 30 jours (selon espace disque) |
| V14 | Historique événements | Timeline interactive, recherche par date/heure |
| V15 | Export vidéo | Téléchargement clip 30 secondes autour d'un événement |
| V16 | Screenshots auto | Capture image lors d'une alerte |
| V17 | Compression intelligente | H.265/HEVC pour économiser espace disque |

### 3.4 App & Gestion

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| V18 | Dashboard local | Interface web/app accessible sur le réseau local |
| V19 | Partage de flux local | Accès temporaire à un tiers sur le même réseau |
| V20 | Mode absence auto | Activation auto quand téléphone quitte la zone (géofencing local) |
| V21 | Multi-utilisateurs | Jusqu'à 3 comptes secondaires |
| V22 | Notifications silencieuses | Mode "ne pas déranger" programmable |
| V23 | Accès hors réseau local | VPN ou DDNS configuré par le client (optionnel) |

### 3.5 Limites VISION (non inclus)

- Max 10 caméras
- Pas de reconnaissance faciale avancée (scoring, historique passages)
- Pas de détection objets abandonnés
- Pas de détection armes
- Pas d'analyse comportementale
- Pas de comptage de foule
- Pas de contrôle d'accès
- Pas de multi-site
- Pas de rapports automatisés
- Pas d'API
- Pas de stockage cloud
- Support : chat + email, horaires ouvrés uniquement

---

## 4. FONCTIONNALITÉS PACK BASTION

**Inclut TOUTES les fonctionnalités VISION (V1 à V23) + ci-dessous :**

### 4.1 IA Avancée

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| B1 | Reconnaissance faciale avancée | Illimitée, scoring risque 0-100, historique passages, blacklist dynamique |
| B2 | Anti-spoofing | Détection photo, écran, masque (liveness detection) |
| B3 | Détection objets abandonnés | Alerte si objet statique > X minutes dans zone critique |
| B4 | Détection armes | Reconnaissance arme à feu, couteau, objet suspect |
| B5 | Comptage de foule | Densité temps réel, alerte si seuil dépassé |
| B6 | Analyse comportementale — Course | Détection course dans zone piétonne |
| B7 | Analyse comportementale — Chute | Détection chute + immobilité |
| B8 | Analyse comportementale — Bagarre | Détection mouvements violents croisés |
| B9 | Analyse comportementale — Errance | Trajectoire aléatoire prolongée |
| B10 | Analyse comportementale — Intrusion zone | Présence dans zone interdite (horaire ou permanente) |
| B11 | Analyse comportementale — Affluence | Densité personnes/m², alerte seuil |

### 4.2 Contrôle d'Accès

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| B12 | Intégration lecteurs RFID | Liaison badge + caméra |
| B13 | Intégration biométrie | Empreinte digitale + corrélation vidéo |
| B14 | Intégration QR code | Badge numérique, accès visiteur temporaire |
| B15 | Corrélation accès/vidéo | Snapshot auto lors accès refusé ou forcé |
| B16 | Gestion horaires | Accès programmable par jour/heure |
| B17 | Gestion groupes | Profils accès par rôle (employé, manager, visiteur) |

### 4.3 Multi-Site & Gestion

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| B18 | Dashboard multi-sites | Vue centralisée de tous les sites (si VPN inter-sites) |
| B19 | Jusqu'à 5 sites inclus | Au-delà : module optionnel |
| B20 | Comparaison inter-sites | Métriques croisées entre sites |
| B21 | Gestion centralisée utilisateurs | RBAC granulaire, rôles personnalisés |
| B22 | SSO entreprise | SAML / OAuth2 |
| B23 | Audit trail complet | Log immuable de toute action |
| B24 | Synchronisation inter-sites | Données synchronisées entre sites (si connectés) |

### 4.4 Rapports & Analytics

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| B25 | Rapports hebdomadaires | PDF auto : incidents, fréquentation, anomalies |
| B26 | Rapports mensuels | PDF détaillé + export données |
| B27 | Dashboard analytics temps réel | Graphiques, tendances, KPIs sécurité |
| B28 | Recherche avancée | Filtres par date, site, type événement, personne |
| B29 | Export données | CSV, PDF |

### 4.5 Stockage & Archivage

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| B30 | Stockage local illimité | Selon capacité disque du client |
| B31 | Rétention configurable | Par site, par type d'événement, 30j à 1an+ |
| B32 | Preuve judiciaire | Export conforme, timestamp certifié |
| B33 | Redondance disque | Support RAID 1/5/10 |
| B34 | Backup auto | Backup sur NAS secondaire ou disque externe |

### 4.6 Conformité HAPDP

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| B35 | Déclaration HAPDP assistée | Wizard auto-rempli, génération PDF |
| B36 | Registre des traitements | Base traçabilité, export CSV/PDF |
| B37 | Affichage consentement | Module signalétique caméra, preuve timestampée |
| B38 | Pseudonymisation | Données sensibles masquées par défaut |
| B39 | Droit accès sujet | Portail self-service : voir, rectifier, supprimer |
| B40 | Traçabilité accès | Qui a vu quoi, quand |

### 4.7 Support & SLA

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| B41 | Support 24/7 | Hotline + chat + email |
| B42 | SLA standard | Intervention sous 4h à Niamey |
| B43 | Documentation technique | Guides installation, configuration, dépannage |
| B44 | Formation initiale | Session 2h équipe sécurité client |
| B45 | Mises à jour incluses | Nouvelles versions, correctifs sécurité |

### 4.8 API & Intégrations

| # | Fonctionnalité | Description |
|---|---------------|-------------|
| B46 | API REST locale | Documentation complète, authentification |
| B47 | Webhooks locaux | Notifications événements vers systèmes internes |
| B48 | Intégration alarme incendie | Corrélation détection fumée + vidéo |
| B49 | Intégration BMS | Liaison HVAC, éclairage, accès |

---

## 5. MODULES OPTIONNELS BASTION

Modules activables au-delà de la base Bastion :

| Module | Prix/an | Description |
|--------|---------|-------------|
| **Lot 15 caméras supp.** | +1 800 000 FCFA | Augmentation capacité caméras |
| **Contrôle d'accès** | +1 000 000 FCFA / porte | Activation lecteurs/badgeuses par porte |
| **Site supplémentaire** | +1 500 000 FCFA / site | Au-delà des 5 sites inclus |
| **Analyse prédictive** | +2 000 000 FCFA | ML prédictif incidents, tendances |
| **Heatmaps** | Inclus dans analyse prédictive | Carte chaleur fréquentation |
| **DPO externe** | +1 500 000 FCFA | DPO dédié, relation HAPDP |
| **SLA Premium** | +2 500 000 FCFA | Intervention 1h Niamey |
| **Intégration API tierce** | Sur devis | Systèmes spécifiques client |

---

## 6. MATRICE FONCTIONNALITÉS

| Fonctionnalité | Vision | Bastion |
|----------------|--------|---------|
| Découverte auto caméras | ✅ | ✅ |
| Streaming live local | ✅ | ✅ |
| Multi-appareil local | ✅ | ✅ |
| Vision nocturne IA | ✅ | ✅ |
| Qualité adaptative | ✅ | ✅ |
| Détection mouvement IA | ✅ | ✅ |
| Reconnaissance faciale basique (50 visages) | ✅ | ✅ |
| Alertes locales (push + SMS) | ✅ | ✅ |
| Alertes WhatsApp | ✅ | ✅ |
| Seuil sensibilité | ✅ | ✅ |
| Zones d'intérêt | ✅ | ✅ |
| Stockage local | ✅ | ✅ |
| Rétention configurable | ✅ | ✅ |
| Historique événements | ✅ | ✅ |
| Export vidéo 30s | ✅ | ✅ |
| Screenshots auto | ✅ | ✅ |
| Compression H.265 | ✅ | ✅ |
| Dashboard local | ✅ | ✅ |
| Partage flux local | ✅ | ✅ |
| Mode absence auto | ✅ | ✅ |
| Multi-utilisateurs (3 max) | ✅ | ✅ |
| Notifications silencieuses | ✅ | ✅ |
| Accès hors réseau (VPN/DDNS) | ✅ | ✅ |
| **Max caméras** | **10** | **Illimité (25 inclus + modules)** |
| Reconnaissance faciale avancée (illimitée, scoring) | ❌ | ✅ |
| Anti-spoofing | ❌ | ✅ |
| Détection objets abandonnés | ❌ | ✅ |
| Détection armes | ❌ | ✅ |
| Comptage de foule | ❌ | ✅ |
| Analyse comportementale (course, chute, bagarre, errance, intrusion, affluence) | ❌ | ✅ |
| Contrôle d'accès (RFID, biométrie, QR) | ❌ | ✅ |
| Corrélation accès/vidéo | ❌ | ✅ |
| Gestion horaires accès | ❌ | ✅ |
| Gestion groupes accès | ❌ | ✅ |
| Multi-sites (5 inclus) | ❌ | ✅ |
| Comparaison inter-sites | ❌ | ✅ |
| RBAC granulaire | ❌ | ✅ |
| SSO entreprise | ❌ | ✅ |
| Audit trail complet | ❌ | ✅ |
| Synchronisation inter-sites | ❌ | ✅ |
| Rapports hebdomadaires/mensuels | ❌ | ✅ |
| Dashboard analytics temps réel | ❌ | ✅ |
| Recherche avancée | ❌ | ✅ |
| Export données (CSV/PDF) | ❌ | ✅ |
| Rétention avancée (30j à 1an+) | ❌ | ✅ |
| Preuve judiciaire certifiée | ❌ | ✅ |
| Redondance disque (RAID) | ❌ | ✅ |
| Backup auto | ❌ | ✅ |
| Déclaration HAPDP assistée | ❌ | ✅ |
| Registre traitements | ❌ | ✅ |
| Affichage consentement | ❌ | ✅ |
| Pseudonymisation | ❌ | ✅ |
| Droit accès sujet | ❌ | ✅ |
| Traçabilité accès données | ❌ | ✅ |
| Support 24/7 | ❌ | ✅ |
| SLA 4h Niamey | ❌ | ✅ |
| Documentation technique | ❌ | ✅ |
| Formation initiale | ❌ | ✅ |
| Mises à jour incluses | ❌ | ✅ |
| API REST locale | ❌ | ✅ |
| Webhooks locaux | ❌ | ✅ |
| Intégration alarme incendie | ❌ | ✅ |
| Intégration BMS | ❌ | ✅ |

---

## 7. EXEMPLES DE DEVIS

### 7.1 Particulier — Maison (VISION)

| Élément | Prix |
|---------|------|
| 2 caméras | 75 000 + 30 000 = 105 000 FCFA/an |
| Installation & config | 75 000 FCFA (one-time) |
| **Total année 1** | 180 000 FCFA |
| **Année 2+** | 105 000 FCFA/an |

---

### 7.2 Boutique — PME (VISION)

| Élément | Prix |
|---------|------|
| 4 caméras | 75 000 + (3 × 30 000) = 165 000 FCFA/an |
| Installation & config | 75 000 FCFA (one-time) |
| **Total année 1** | 240 000 FCFA |
| **Année 2+** | 165 000 FCFA/an |

---

### 7.3 Pharmacie — PME (BASTION base)

| Élément | Prix |
|---------|------|
| Bastion base (8 caméras, 1 site) | 3 500 000 FCFA/an |
| Installation & config | Sur devis (serveur + déploiement) |
| **Total année 1** | 3 500 000 FCFA + setup |
| **Année 2+** | 3 500 000 FCFA/an |

---

### 7.4 Banque Moyenne (BASTION + modules)

| Élément | Prix |
|---------|------|
| Bastion base | 3 500 000 FCFA |
| 15 caméras supplémentaires (40 total) | +1 800 000 FCFA |
| 4 portes contrôle d'accès | +4 000 000 FCFA |
| **Total annuel** | **9 300 000 FCFA** |

---

### 7.5 Grande Entreprise Type Airtel (BASTION + modules)

| Élément | Prix |
|---------|------|
| Bastion base | 3 500 000 FCFA |
| 60 caméras supplémentaires (80 total) | +7 200 000 FCFA |
| 3 sites supplémentaires (8 total) | +4 500 000 FCFA |
| Analyse prédictive + heatmaps | +2 000 000 FCFA |
| **Total annuel** | **17 200 000 FCFA** |

---

### 7.6 Ministère (BASTION + modules)

| Élément | Prix |
|---------|------|
| Bastion base | 3 500 000 FCFA |
| 30 caméras supplémentaires (50 total) | +3 600 000 FCFA |
| SLA Premium | +2 500 000 FCFA |
| DPO externe | +1 500 000 FCFA |
| **Total annuel** | **11 100 000 FCFA** |

---

### 7.7 Mine / Site Industriel (BASTION + modules)

| Élément | Prix |
|---------|------|
| Bastion base | 3 500 000 FCFA |
| 100+ caméras | Sur devis |
| 10+ sites | Sur devis |
| Intégration drone | Sur devis |
| Analyse prédictive | +2 500 000 FCFA |
| SLA Premium | +2 500 000 FCFA |
| **Total annuel estimé** | **25 000 000+ FCFA** |

---

## 8. RÈGLES DE VENTE & LICENCE

### 8.1 Principe de la Licence

- Le logiciel est **auto-hébergé** chez le client
- La licence est **vérifiée en ligne** (clé d'activation + ping serveur VaultOS toutes les 24h)
- Si pas d'internet > 72h : mode dégradé (alertes uniquement, pas de nouvelles fonctionnalités)
- Si licence expirée : accès lecture seule, pas de nouvelles alertes IA

### 8.2 Règles Générales

1. **2 packs uniquement.** Pas de 3ème pack, pas de pack sur mesure.
2. **Un client qui dépasse VISION passe à BASTION.** Pas d'upgrade à la carte dans VISION.
3. **Bastion = base + modules.** Le client choisit ses modules, pas ses fonctionnalités une par une.
4. **Pas de hardware vendu.** VaultOS est logiciel pur. Recommander un installateur partenaire pour le matériel.
5. **Prix publics fixes.** Pas de négociation sur le prix de base. Modules négociables uniquement pour contrats > 20M FCFA/an.

### 8.3 Règles Vision

- Max 10 caméras. Au-delà : migration Bastion obligatoire.
- Licence annuelle obligatoire (pas de mensuel).
- Pas de support téléphonique. Chat + email uniquement.
- Pas de personnalisation. Le pack est ce qu'il est.
- Installation one-time payante (75 000 FCFA).

### 8.4 Règles Bastion

- Licence annuelle obligatoire.
- Accompagnement HAPDP inclus mais déclaration reste responsabilité du client final.
- Support 24/7 = Niamey uniquement pour intervention physique. Hors Niamey : support à distance.
- Modules activables/désactivables à chaque renouvellement annuel.
- Installation serveur : sur devis selon complexité.

### 8.5 Commission Partenaires

| Type Partenaire | Commission |
|-----------------|------------|
| Apporteur d'affaire (Bastion) | 10% première année |
| Installateur certifié | 15% première année |
| Revendeur IT | 20% récurrent |

### 8.6 Garanties

| Élément | Durée |
|---------|-------|
| Bug critique | Correction sous 48h |
| Bug standard | Correction sous 2 semaines |
| Indisponibilité licence | Crédit proportionnel |
| Données perdues (faute VaultOS) | Indemnisation selon contrat |

---

*VaultOS — Voir l'invisible. Protéger l'essentiel.*
*Auto-hébergé. Vos données restent chez vous.*
