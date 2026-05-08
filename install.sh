#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                   OVERSIGHT AI — Script d'installation                      ║
# ║               Système de surveillance vidéo intelligent                      ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
#
# Usage :
#   chmod +x install.sh && ./install.sh
#
# Compatible : Ubuntu 22.04+ / Debian 12+
# Prérequis  : Docker, Docker Compose v2, git
#
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Couleurs et formatage ─────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'  # Réinitialisation

# ── Répertoire du script (répertoire du projet) ───────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"

# ── Gestion propre de Ctrl+C ──────────────────────────────────────────────────
cleanup() {
    echo ""
    echo -e "${YELLOW}⚠  Installation annulée par l'utilisateur.${NC}"
    echo -e "${YELLOW}   Les conteneurs Docker éventuellement démarrés peuvent nécessiter un arrêt manuel.${NC}"
    echo -e "${YELLOW}   Exécutez : docker compose -f docker-compose.prod.yml down${NC}"
    exit 130
}
trap cleanup SIGINT SIGTERM

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                          FONCTIONS UTILITAIRES                              ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# Affiche un en-tête stylisé
print_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}$1${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Affiche un message d'étape
print_step() {
    echo -e "\n${BLUE}▸ $1${NC}"
}

# Affiche un message de succès
print_ok() {
    echo -e "  ${GREEN}✓ $1${NC}"
}

# Affiche un avertissement
print_warn() {
    echo -e "  ${YELLOW}⚠ $1${NC}"
}

# Affiche une erreur et quitte
print_error() {
    echo -e "  ${RED}✗ ERREUR : $1${NC}" >&2
    exit 1
}

# Génère un secret aléatoire avec openssl
generate_secret() {
    openssl rand -hex 32
}

# Pose une question interactive avec valeur par défaut
# Usage : ask "Question" DEFAULT_VALUE
# Résultat stocké dans ANSWER
ANSWER=""
ask() {
    local prompt="$1"
    local default="$2"
    local display_default="${3:-$2}"

    if [[ -n "$default" ]]; then
        echo -en "  ${BOLD}${prompt}${NC} [${display_default}] : "
    else
        echo -en "  ${BOLD}${prompt}${NC} : "
    fi

    read -r ANSWER
    ANSWER="${ANSWER:-$default}"
}

# Pose une question avec validation (boucle tant que invalide)
# Usage : ask_valid "Question" DEFAULT "regex_ou_commande_validation"
ask_valid() {
    local prompt="$1"
    local default="$2"
    local validator="$3"

    while true; do
        ask "$prompt" "$default"
        if eval "$validator" >/dev/null 2>&1; then
            return 0
        fi
        print_warn "Valeur invalide, veuillez réessayer."
    done
}

# Demande un mot de passe avec confirmation
ask_password() {
    local prompt="$1"
    local pw1=""
    local pw2=""

    while true; do
        echo -en "  ${BOLD}${prompt}${NC} (min. 8 caractères) : "
        read -rs pw1
        echo ""

        if [[ ${#pw1} -lt 8 ]]; then
            print_warn "Le mot de passe doit contenir au moins 8 caractères."
            continue
        fi

        echo -en "  ${BOLD}Confirmez le mot de passe${NC} : "
        read -rs pw2
        echo ""

        if [[ "$pw1" == "$pw2" ]]; then
            ANSWER="$pw1"
            return 0
        fi

        print_warn "Les mots de passe ne correspondent pas. Réessayez."
    done
}

# Vérifie qu'une commande existe
require_cmd() {
    if ! command -v "$1" &>/dev/null; then
        print_error "La commande '$1' est requise mais n'est pas installée."
    fi
}

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                         DÉBUT DE L'INSTALLATION                             ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

clear

echo -e "${CYAN}"
cat << 'BANNER'
  ╔══════════════════════════════════════════════════════════════╗
  ║                                                              ║
  ║     ██████  ███████ ██   ██ ██    ██ ███████                ║
  ║    ██       ██      ██  ██  ██    ██ ██                     ║
  ║    ██   ███ █████   █████   ██    ██ ███████                ║
  ║    ██    ██ ██      ██  ██  ██    ██      ██                ║
  ║     ██████  ███████ ██   ██  ██████  ███████                ║
  ║                                                              ║
  ║              — Assistant d'Installation —                    ║
  ║      Système de surveillance vidéo intelligent               ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"

echo -e "${BOLD}Bienvenue dans l'assistant d'installation d'OVERSIGHT AI.${NC}"
echo -e "Ce script va configurer votre environnement et déployer les services.\n"
echo -e "Appuyez sur ${BOLD}Ctrl+C${NC} à tout moment pour annuler.\n"

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                    ÉTAPE 1 — VÉRIFICATION DES PRÉREQUIS                     ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

print_header "ÉTAPE 1 / 5 — Vérification des prérequis"

# Docker
print_step "Recherche de Docker..."
require_cmd docker
DOCKER_VERSION=$(docker --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' | head -1)
print_ok "Docker détecté (version ${DOCKER_VERSION})"

# Docker Compose v2
print_step "Recherche de Docker Compose..."
if docker compose version &>/dev/null; then
    COMPOSE_VERSION=$(docker compose version --short 2>/dev/null)
    print_ok "Docker Compose v2 détecté (version ${COMPOSE_VERSION})"
else
    print_error "Docker Compose v2 est requis. Installez-le avec : apt install docker-compose-plugin"
fi

# Git
print_step "Recherche de Git..."
require_cmd git
GIT_VERSION=$(git --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' | head -1)
print_ok "Git détecté (version ${GIT_VERSION})"

# OpenSSL (nécessaire pour générer les secrets)
print_step "Recherche d'OpenSSL..."
require_cmd openssl
print_ok "OpenSSL détecté"

# Vérifier que le démon Docker fonctionne
print_step "Vérification du démon Docker..."
if ! docker info &>/dev/null; then
    print_error "Le démon Docker ne semble pas fonctionner. Démarrez-le avec : sudo systemctl start docker"
fi
print_ok "Le démon Docker est actif"

# Vérifier les permissions Docker (pas besoin de sudo)
print_step "Vérification des permissions Docker..."
if ! docker ps &>/dev/null; then
    print_warn "Votre utilisateur n'a pas les permissions Docker."
    print_warn "Ajoutez-le au groupe docker : sudo usermod -aG docker \$USER"
    print_warn "Puis déconnectez-vous et reconnectez-vous."
    exit 1
fi
print_ok "Permissions Docker OK"

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                    ÉTAPE 2 — PRÉPARATION DU FICHIER .env                    ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

print_header "ÉTAPE 2 / 5 — Configuration de l'environnement"

# Copier .env.example → .env si nécessaire
if [[ -f "$ENV_FILE" ]]; then
    print_warn "Un fichier .env existe déjà."
    echo -en "  ${BOLD}Voulez-vous le remplacer ?${NC} [o/N] : "
    read -r replace_env
    if [[ "${replace_env,,}" == "o" || "${replace_env,,}" == "oui" || "${replace_env,,}" == "y" || "${replace_env,,}" == "yes" ]]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        print_ok "Fichier .env remplacé depuis .env.example"
    else
        print_ok "Fichier .env existant conservé"
    fi
else
    if [[ ! -f "$ENV_EXAMPLE" ]]; then
        print_error "Le fichier .env.example est introuvable dans ${SCRIPT_DIR}"
    fi
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    print_ok "Fichier .env créé depuis .env.example"
fi

# ── Génération des secrets automatiques ────────────────────────────────────────
print_step "Génération des secrets aléatoires..."

JWT_ACCESS_SECRET=$(generate_secret)
JWT_REFRESH_SECRET=$(generate_secret)
REDIS_PASSWORD=$(generate_secret)
PG_PASSWORD=$(generate_secret)

print_ok "JWT_ACCESS_SECRET   : ${JWT_ACCESS_SECRET:0:12}...${JWT_ACCESS_SECRET: -8} (64 caractères)"
print_ok "JWT_REFRESH_SECRET  : ${JWT_REFRESH_SECRET:0:12}...${JWT_REFRESH_SECRET: -8} (64 caractères)"
print_ok "REDIS_PASSWORD      : ${REDIS_PASSWORD:0:12}...${REDIS_PASSWORD: -8} (64 caractères)"
print_ok "POSTGRES_PASSWORD   : ${PG_PASSWORD:0:12}...${PG_PASSWORD: -8} (64 caractères)"

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                    ÉTAPE 3 — INFORMATIONS DU CLIENT                         ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

print_header "ÉTAPE 3 / 5 — Informations du client"

echo -e "Veuillez renseigner les informations suivantes :\n"

# Nom de l'entreprise
ask "Nom de l'entreprise" "Mon Entreprise"
COMPANY_NAME="$ANSWER"

# Email administrateur
ask "Adresse e-mail de l'administrateur" "admin@company.com"
ADMIN_EMAIL="$ANSWER"

# Mot de passe administrateur
echo ""
ask_password "Mot de passe administrateur"
ADMIN_PASSWORD="$ANSWER"
print_ok "Mot de passe administrateur défini"

# Prénom administrateur
ask "Prénom de l'administrateur" "Admin"
ADMIN_FIRST_NAME="$ANSWER"

# Nom de famille administrateur
ask "Nom de famille de l'administrateur" "Administrateur"
ADMIN_LAST_NAME="$ANSWER"

# Domaine / IP de déploiement
echo ""
echo -e "  ${YELLOW}Renseignez le domaine ou l'adresse IP publique de votre serveur.${NC}"
echo -e "  ${YELLOW}Exemples : oversight.monsite.com, 192.168.1.100, surveillance.local${NC}"
ask "Domaine ou adresse IP de déploiement" "localhost"
DOMAIN="$ANSWER"

# Déterminer le protocole (HTTPS si domaine, HTTP si IP/localhost)
if [[ "$DOMAIN" == "localhost" || "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    PROTOCOL="http"
    BASE_URL="${PROTOCOL}://${DOMAIN}"
else
    PROTOCOL="https"
    BASE_URL="${PROTOCOL}://${DOMAIN}"
fi

# Modèle Ollama
echo ""
echo -e "  Choisissez le modèle Ollama pour l'analyse d'images :"
echo -e "    ${BOLD}1)${NC} moondream  — Léger, rapide, bon pour la détection d'objets (recommandé)"
echo -e "    ${BOLD}2)${NC} llava      — Plus précis, nécessite plus de ressources (GPU conseillé)"
echo -e "    ${BOLD}3)${NC} llava:13b   — Haute précision, nécessite un GPU puissant"
echo -e "    ${BOLD}4)${NC} bakllava   — Équilibre performance / précision"
echo -e "    ${BOLD}5)${NC} minicpm-v  — Compact, bon pour les systèmes embarqués"

ask "Votre choix (1-5)" "1"
case "$ANSWER" in
    1) OLLAMA_MODEL="moondream" ;;
    2) OLLAMA_MODEL="llava" ;;
    3) OLLAMA_MODEL="llava:13b" ;;
    4) OLLAMA_MODEL="bakllava" ;;
    5) OLLAMA_MODEL="minicpm-v" ;;
    *) OLLAMA_MODEL="moondream" ;;
esac
print_ok "Modèle sélectionné : ${OLLAMA_MODEL}"

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                    ÉTAPE 4 — ÉCRITURE DU FICHIER .env                       ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

print_header "ÉTAPE 4 / 5 — Écriture de la configuration"

print_step "Mise à jour du fichier .env..."

# Construire les URLs
DATABASE_URL="postgresql://oversight:${PG_PASSWORD}@postgres:5432/oversight"
NEXT_PUBLIC_API_URL="${BASE_URL}/api"
CORS_ORIGIN="${BASE_URL}"
DASHBOARD_URL="${BASE_URL}"

# ── Fonction de remplacement dans .env ────────────────────────────────────────
# Remplace une ligne KEY=... par KEY=value dans le fichier .env
# Si la clé n'existe pas, l'ajoute à la fin
env_set() {
    local key="$1"
    local value="$2"
    local file="$ENV_FILE"

    if grep -q "^${key}=" "$file" 2>/dev/null; then
        # Échapper les caractères spéciaux pour sed
        local escaped_value
        escaped_value=$(printf '%s\n' "$value" | sed 's/[&/\]/\\&/g')
        sed -i "s|^${key}=.*|${key}=${escaped_value}|" "$file"
    else
        echo "${key}=${value}" >> "$file"
    fi
}

# ── Variables communes ────────────────────────────────────────────────────────
env_set "NODE_ENV"                   "production"
env_set "COMPANY_NAME"               "$COMPANY_NAME"
env_set "NEXT_PUBLIC_APP_NAME"       "OVERSIGHT AI — ${COMPANY_NAME}"

# ── Base de données ───────────────────────────────────────────────────────────
env_set "DATABASE_URL"               "$DATABASE_URL"

# ── Redis ─────────────────────────────────────────────────────────────────────
env_set "REDIS_HOST"                 "redis"
env_set "REDIS_PORT"                 "6379"
env_set "REDIS_PASSWORD"             "$REDIS_PASSWORD"

# ── API (JWT) ─────────────────────────────────────────────────────────────────
env_set "PORT"                       "4000"
env_set "JWT_ACCESS_SECRET"          "$JWT_ACCESS_SECRET"
env_set "JWT_REFRESH_SECRET"         "$JWT_REFRESH_SECRET"
env_set "JWT_ACCESS_EXPIRY"          "15m"
env_set "JWT_REFRESH_EXPIRY"         "7d"

# ── CORS ──────────────────────────────────────────────────────────────────────
env_set "CORS_ORIGIN"                "$CORS_ORIGIN"
env_set "CORS_CREDENTIALS"           "true"

# ── Dashboard ─────────────────────────────────────────────────────────────────
env_set "NEXT_PUBLIC_API_URL"        "$NEXT_PUBLIC_API_URL"
env_set "DASHBOARD_PORT"             "3100"

# ── AI Preprocessor ──────────────────────────────────────────────────────────
env_set "AI_PREPROCESSOR_URL"        "http://ai-preprocessor:8000"

# ── Ollama ────────────────────────────────────────────────────────────────────
env_set "OLLAMA_BASE_URL"            "http://host.docker.internal:11434"
env_set "OLLAMA_MODEL"               "$OLLAMA_MODEL"

# ── Qdrant ────────────────────────────────────────────────────────────────────
env_set "QDRANT_URL"                 "http://qdrant:6333"

# ── Admin (seed) ──────────────────────────────────────────────────────────────
env_set "ADMIN_EMAIL"                "$ADMIN_EMAIL"
env_set "ADMIN_PASSWORD"             "$ADMIN_PASSWORD"
env_set "ADMIN_FIRST_NAME"           "$ADMIN_FIRST_NAME"
env_set "ADMIN_LAST_NAME"            "$ADMIN_LAST_NAME"

# Ajouter une variable personnalisée pour le domaine
env_set "DOMAIN"                     "$DOMAIN"
env_set "PROTOCOL"                   "$PROTOCOL"
env_set "POSTGRES_PASSWORD"          "$PG_PASSWORD"

print_ok "Fichier .env configuré avec succès"
print_ok "Emplacement : ${ENV_FILE}"

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                    ÉTAPE 5 — DÉPLOIEMENT DOCKER                            ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

print_header "ÉTAPE 5 / 5 — Déploiement des services Docker"

# ── Téléchargement du modèle Ollama ───────────────────────────────────────────
print_step "Vérification de la disponibilité d'Ollama..."
if curl -sf http://localhost:11434/api/version >/dev/null 2>&1; then
    print_ok "Ollama détecté sur cette machine"
    echo -en "  ${BOLD}Télécharger le modèle ${OLLAMA_MODEL} maintenant ?${NC} [O/n] : "
    read -r pull_model
    if [[ -z "${pull_model}" || "${pull_model,,}" == "o" || "${pull_model,,}" == "oui" || "${pull_model,,}" == "y" || "${pull_model,,}" == "yes" ]]; then
        print_step "Téléchargement du modèle ${OLLAMA_MODEL}..."
        if ollama pull "$OLLAMA_MODEL" 2>/dev/null; then
            print_ok "Modèle ${OLLAMA_MODEL} téléchargé avec succès"
        else
            print_warn "Impossible de télécharger le modèle via 'ollama pull'."
            print_warn "Vous pouvez le télécharger manuellement plus tard : ollama pull ${OLLAMA_MODEL}"
        fi
    fi
else
    print_warn "Ollama n'est pas détecté sur cette machine (localhost:11434)."
    print_warn "Assurez-vous qu'Ollama est installé et en cours d'exécution sur le serveur."
    print_warn "Le déploiement continue, l'IA sera disponible une fois Ollama configuré."
fi

# ── Build et démarrage des conteneurs ─────────────────────────────────────────
print_step "Construction et démarrage des conteneurs Docker..."
echo -e "  ${YELLOW}Cela peut prendre plusieurs minutes lors de la première installation...${NC}\n"

cd "$SCRIPT_DIR"

if ! docker compose -f docker-compose.prod.yml up -d --build 2>&1; then
    print_error "Échec du démarrage des conteneurs Docker. Consultez les logs :"
    echo -e "  ${CYAN}docker compose -f docker-compose.prod.yml logs${NC}"
    exit 1
fi

print_ok "Conteneurs Docker construits et démarrés"

# ── Attente de la santé des services ──────────────────────────────────────────
print_step "Vérification de l'état de santé des services..."

MAX_WAIT=180        # 3 minutes maximum
INTERVAL=5          # vérification toutes les 5 secondes
ELAPSED=0
ALL_HEALTHY=false

# Liste des services à surveiller
SERVICES=("postgres" "redis" "api" "dashboard")

while [[ $ELAPSED -lt $MAX_WAIT ]]; do
    ALL_HEALTHY=true

    for svc in "${SERVICES[@]}"; do
        # Vérifier via docker inspect si le service est healthy
        HEALTH=$(docker compose -f docker-compose.prod.yml ps --format json 2>/dev/null \
            | grep "\"Service\":\"${svc}\"" \
            | grep -o '"Health":"[^"]*"' \
            | head -1 \
            | cut -d'"' -f4)

        if [[ "$HEALTH" != "healthy" ]]; then
            # Fallback : vérifier si le conteneur est en cours d'exécution (running)
            STATUS=$(docker compose -f docker-compose.prod.yml ps --format json 2>/dev/null \
                | grep "\"Service\":\"${svc}\"" \
                | grep -o '"State":"[^"]*"' \
                | head -1 \
                | cut -d'"' -f4)

            if [[ "$STATUS" != "running" ]]; then
                ALL_HEALTHY=false
                break
            fi
        fi
    done

    if $ALL_HEALTHY; then
        break
    fi

    # Afficher la progression
    REMAINING=$(( MAX_WAIT - ELAPSED ))
    echo -e "  ${YELLOW}⏳ En attente des services... (${ELAPSED}s écoulées, ${REMAINING}s restantes)${NC}"
    sleep $INTERVAL
    ELAPSED=$(( ELAPSED + INTERVAL ))
done

if $ALL_HEALTHY; then
    print_ok "Tous les services sont opérationnels"
else
    # Même si on n'a pas le statut "healthy", vérifier si au moins les conteneurs tournent
    RUNNING_COUNT=$(docker compose -f docker-compose.prod.yml ps --format json 2>/dev/null | grep -c '"State":"running"' || true)
    if [[ $RUNNING_COUNT -gt 0 ]]; then
        print_warn "Les services sont en cours de démarrage (${RUNNING_COUNT} conteneurs actifs)."
        print_warn "Certains services peuvent encore s'initialiser. Vérifiez avec :"
        echo -e "  ${CYAN}docker compose -f docker-compose.prod.yml ps${NC}"
    else
        print_error "Les services n'ont pas pu démarrer dans le délai imparti."
        echo -e "  Consultez les logs : ${CYAN}docker compose -f docker-compose.prod.yml logs${NC}"
        exit 1
    fi
fi

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                    RÉCAPITULATIF — INSTALLATION TERMINÉE                    ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}                                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}   ${BOLD}🎉  INSTALLATION TERMINÉE AVEC SUCCÈS !${NC}                                      ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                                              ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BOLD}  ┌─ Accès à l'application ──────────────────────────────────────────┐${NC}"
echo -e "${BOLD}  │${NC}                                                                    ${BOLD}│${NC}"
echo -e "${BOLD}  │${NC}  🌐  Tableau de bord : ${CYAN}${BASE_URL}:${DASHBOARD_PORT:-3100}${NC}                  ${BOLD}│${NC}"
echo -e "${BOLD}  │${NC}  🔌  API              : ${CYAN}${BASE_URL}:${PORT:-4000}${NC}                          ${BOLD}│${NC}"
echo -e "${BOLD}  │${NC}                                                                    ${BOLD}│${NC}"
echo -e "${BOLD}  └──────────────────────────────────────────────────────────────────┘${NC}"
echo ""

echo -e "${BOLD}  ┌─ Identifiants administrateur ────────────────────────────────────┐${NC}"
echo -e "${BOLD}  │${NC}                                                                    ${BOLD}│${NC}"
echo -e "${BOLD}  │${NC}  📧  E-mail    : ${CYAN}${ADMIN_EMAIL}${NC}                                ${BOLD}│${NC}"
echo -e "${BOLD}  │${NC}  👤  Nom       : ${CYAN}${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}${NC}                       ${BOLD}│${NC}"
echo -e "${BOLD}  │${NC}  🏢  Entreprise: ${CYAN}${COMPANY_NAME}${NC}                                  ${BOLD}│${NC}"
echo -e "${BOLD}  │${NC}                                                                    ${BOLD}│${NC}"
echo -e "${BOLD}  └──────────────────────────────────────────────────────────────────┘${NC}"
echo ""

echo -e "${BOLD}  ┌─ Commandes utiles ──────────────────────────────────────────────┐${NC}"
echo -e "${BOLD}  │${NC}                                                                    ${BOLD}│${NC}"
echo -e "  ${BOLD}│${NC}  Voir les logs        : ${CYAN}docker compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "  ${BOLD}│${NC}  Arrêter les services : ${CYAN}docker compose -f docker-compose.prod.yml down${NC}"
echo -e "  ${BOLD}│${NC}  Redémarrer           : ${CYAN}docker compose -f docker-compose.prod.yml restart${NC}"
echo -e "  ${BOLD}│${NC}  État des conteneurs  : ${CYAN}docker compose -f docker-compose.prod.yml ps${NC}"
echo -e "  ${BOLD}│${NC}  Modifier la config   : ${CYAN}nano ${ENV_FILE}${NC}"
echo -e "  ${BOLD}│${NC}                                                                    ${BOLD}│${NC}"
echo -e "  ${BOLD}│${NC}  ⚠️  Conservez précieusement le fichier .env (il contient les secrets)  ${BOLD}│${NC}"
echo -e "  ${BOLD}│${NC}  ⚠️  Ne jamais committer le fichier .env dans Git                       ${BOLD}│${NC}"
echo -e "  ${BOLD}│${NC}                                                                    ${BOLD}│${NC}"
echo -e "  ${BOLD}└──────────────────────────────────────────────────────────────────┘${NC}"
echo ""

echo -e "${GREEN}  Merci d'utiliser OVERSIGHT AI ! 🚀${NC}"
echo ""
