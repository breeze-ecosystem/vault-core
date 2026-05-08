# 🚀 Guide de Déploiement OVERSIGHT AI

> Installation on-premise pour les clients

## Prérequis

| Outil | Version minimum | Vérification |
|-------|----------------|--------------|
| Docker | 24.0+ | `docker --version` |
| Docker Compose | v2.0+ | `docker compose version` |
| Git | 2.30+ | `git --version` |
| 4 GB RAM minimum | 8 GB recommandé | — |
| 20 GB disque | 50 GB recommandé | — |
| Ollama | Dernière version | `ollama --version` (optionnel, peut être installé après) |

> **Note** : Ollama doit être installé sur la machine hôte pour l'analyse IA. [Installer Ollama](https://ollama.ai)

---

## Installation Rapide (Recommandée)

```bash
# 1. Cloner le dépôt
git clone https://github.com/breeze-ecosystem/oversight-hub.git
cd oversight-hub

# 2. Lancer l'installateur interactif
chmod +x install.sh
./install.sh
```

L'installateur va vous guider pour :
- ✅ Vérifier les prérequis
- ✅ Générer des secrets sécurisés
- ✅ Configurer le compte administrateur
- ✅ Choisir le modèle IA
- ✅ Déployer tous les services

---

## Installation Manuelle

### 1. Configuration

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer la configuration
nano .env
```

**Variables obligatoires à modifier :**

```env
# Sécurité — utiliser des secrets forts !
JWT_ACCESS_SECRET=<généré avec: openssl rand -hex 32>
JWT_REFRESH_SECRET=<généré avec: openssl rand -hex 32>
POSTGRES_PASSWORD=<mot de passe base de données>

# Administrateur
ADMIN_EMAIL=admin@votre-entreprise.com
ADMIN_PASSWORD=<votre mot de passe sécurisé>
ADMIN_FIRST_NAME=Prénom
ADMIN_LAST_NAME=Nom

# Entreprise
COMPANY_NAME="Votre Entreprise"

# Accès
DOMAIN=votre-domaine.com       # ou IP du serveur
```

### 2. Générer les secrets

```bash
# Remplir automatiquement les secrets dans .env
sed -i "s/CHANGE_ME_JWT_ACCESS/$(openssl rand -hex 32)/" .env
sed -i "s/CHANGE_ME_JWT_REFRESH/$(openssl rand -hex 32)/" .env
sed -i "s/CHANGE_ME_REDIS_PASSWORD/$(openssl rand -hex 24)/" .env
sed -i "s/CHANGE_ME_POSTGRES_PASSWORD/$(openssl rand -hex 24)/" .env
```

### 3. Installer le modèle IA

```bash
# Installer Ollama (si pas déjà fait)
curl -fsSL https://ollama.ai/install.sh | sh

# Télécharger le modèle (moondream recommandé pour CPU)
ollama pull moondream
```

### 4. Déployer

```bash
# Construction et démarrage
docker compose -f docker-compose.prod.yml up -d --build

# Voir les logs
docker compose -f docker-compose.prod.yml logs -f
```

### 5. Vérifier

```bash
# Vérifier que tous les services sont actifs
docker compose -f docker-compose.prod.yml ps

# Tester l'API
curl http://localhost:4000/api/health

# Tester le dashboard
curl http://localhost:80
```

---

## Accès après installation

| Service | URL | Description |
|---------|-----|-------------|
| Dashboard | `http://VOTRE-IP` | Interface web principale |
| API | `http://VOTRE-IP/api/health` | Health check API |
| API Docs | `http://VOTRE-IP:4000/api/docs` | Documentation Swagger |

### Première connexion

1. Ouvrir le dashboard dans un navigateur
2. Se connecter avec les identifiants admin configurés
3. Créer votre premier site et vos caméras

---

## Gestion des services

```bash
# Voir le statut
docker compose -f docker-compose.prod.yml ps

# Voir les logs
docker compose -f docker-compose.prod.yml logs -f api        # API uniquement
docker compose -f docker-compose.prod.yml logs -f dashboard   # Dashboard uniquement
docker compose -f docker-compose.prod.yml logs -f ai-preprocessor  # IA uniquement

# Redémarrer un service
docker compose -f docker-compose.prod.yml restart api

# Arrêter tout
docker compose -f docker-compose.prod.yml down

# Arrêter et supprimer les données (⚠️ irréversible)
docker compose -f docker-compose.prod.yml down -v
```

---

## Mise à jour

```bash
# Récupérer la dernière version
git pull origin main

# Reconstruire et redémarrer
docker compose -f docker-compose.prod.yml up -d --build

# La base de données est migrée automatiquement au démarrage
```

---

## Déploiement avec Coolify

Si vous utilisez Coolify comme plateforme de déploiement :

1. Créer un nouveau projet dans Coolify
2. Ajouter une application de type **Docker Compose**
3. Connecter le dépôt Git
4. Configurer les variables d'environnement dans l'interface Coolify
5. Créer les services managés :
   - **PostgreSQL** — noter les identifiants
   - **Redis** — noter le mot de passe
6. Mettre à jour les variables `DATABASE_URL`, `REDIS_HOST`, `REDIS_PASSWORD`
7. Déployer

> **Important** : Avec Coolify, utilisez le `docker-compose.yml` standard (pas `prod`), car Coolify gère PostgreSQL, Redis et le reverse proxy.

---

## Sécurité en production

- [ ] Changer tous les mots de passe par défaut
- [ ] Utiliser des secrets JWT de 64 caractères minimum
- [ ] Activer HTTPS (Caddy le gère automatiquement avec un domaine)
- [ ] Restreindre l'accès au port 4000 (API) via firewall
- [ ] Configurer des sauvegardes PostgreSQL régulières
- [ ] Mettre à jour régulièrement (`git pull && docker compose up -d --build`)

---

## Dépannage

### L'API ne démarre pas

```bash
# Vérifier les logs
docker compose -f docker-compose.prod.yml logs api

# Problème de base de données ? Vérifier que postgres est healthy
docker compose -f docker-compose.prod.yml logs postgres
```

### Le dashboard affiche "Cannot reach server"

1. Vérifier que l'API répond : `curl http://localhost:4000/api/health`
2. Vérifier la variable `NEXT_PUBLIC_API_URL` dans `.env`
3. Si HTTPS : accepter le certificat dans le navigateur d'abord

### L'IA ne fonctionne pas

```bash
# Vérifier qu'Ollama tourne sur l'hôte
ollama list

# Vérifier que le conteneur API peut joindre Ollama
docker compose -f docker-compose.prod.yml exec api wget -qO- http://host.docker.internal:11434/api/tags
```

### Redis : NOAUTH Authentication required

Vérifier que `REDIS_PASSWORD` est identique dans `.env` et dans la config Redis du `docker-compose.prod.yml`.

---

## Architecture des services

```
┌─────────────────────────────────────────────┐
│                  Caddy (80/443)              │
│         Reverse Proxy + TLS automatique      │
├──────────────┬──────────────────────────────┤
│  /api/*      │  /*                           │
│  → API:4000  │  → Dashboard:3100            │
├──────────────┴──────────────────────────────┤
│                  API (NestJS:4000)            │
│  Auth • Cameras • Alerts • Ingestion • Queue │
├──────────────┬──────────────────────────────┤
│  PostgreSQL  │  Redis    │  AI Preprocessor  │
│  (5432)      │  (6379)   │  (8000)           │
├──────────────┴──────────┴───────────────────┤
│              Ollama (hôte:11434)             │
│         Modèle VLM (moondream, llava...)     │
└─────────────────────────────────────────────┘
```

---

## Support

- **Documentation technique** : `README.md`
- **Issues** : GitHub Issues du dépôt
- **Email** : support@digitsoftafrica.com
