#!/usr/bin/env bash
# ============================================================================
# OVERSIGHT AI — Script de sauvegarde et restauration PostgreSQL
# Version : 1.0.0
# Usage   : ./backup.sh [backup|restore|schedule] [fichier_sauvegarde]
# ============================================================================
set -euo pipefail

# ─── Répertoire de base ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"
ENV_FILE="${SCRIPT_DIR}/.env"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# ─── Couleurs ───────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'  # No Color

# ─── Fonctions utilitaires ──────────────────────────────────────────────────
log_info()    { echo -e "${GREEN}[✔]${NC} ${BOLD}$*${NC}"; }
log_warn()    { echo -e "${YELLOW}[⚠]${NC} $*"; }
log_error()   { echo -e "${RED}[✘]${NC} ${BOLD}$*${NC}" >&2; }
log_step()    { echo -e "${CYAN}[→]${NC} $*"; }
log_header()  { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BOLD}${BLUE}  $*${NC}"; echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

die() {
    log_error "$*"
    exit 1
}

confirm() {
    local prompt="$1"
    local default="${2:-n}"
    local answer
    echo -ne "${YELLOW}${prompt} ${BOLD}[o/N]${NC} "
    read -r answer
    answer="${answer:-$default}"
    [[ "${answer,,}" =~ ^[oy](ui|es)?$ ]]
}

# ─── Chargement des variables d'environnement ───────────────────────────────
load_env() {
    # 1) Charger le fichier .env s'il existe
    if [[ -f "${ENV_FILE}" ]]; then
        log_step "Chargement du fichier .env …"
        # shellcheck disable=SC1090
        set -a
        source "${ENV_FILE}" 2>/dev/null || true
        set +a
    fi

    # 2) Valeurs par défaut
    POSTGRES_USER="${POSTGRES_USER:-oversight}"
    POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
    POSTGRES_DB="${POSTGRES_DB:-oversight}"
    POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
    POSTGRES_PORT="${POSTGRES_PORT:-5432}"

    # 3) Tenter de lire depuis docker compose si des valeurs manquent
    if [[ -f "${COMPOSE_FILE}" ]]; then
        if command -v docker &>/dev/null; then
            local compose_service
            compose_service=$(docker compose -f "${COMPOSE_FILE}" ps --services 2>/dev/null | grep -i postgres || true)
            if [[ -n "${compose_service}" ]]; then
                log_step "Service PostgreSQL détecté dans docker-compose.prod.yml"
                # Lecture des vars depuis le conteneur si pas déjà définies
                if [[ -z "${POSTGRES_PASSWORD}" ]]; then
                    POSTGRES_PASSWORD=$(docker compose -f "${COMPOSE_FILE}" exec -T postgres printenv POSTGRES_PASSWORD 2>/dev/null || echo "")
                fi
            fi
        fi
    fi

    # 4) Vérifications critiques
    [[ -z "${POSTGRES_PASSWORD}" ]] && die "Impossible de trouver POSTGRES_PASSWORD. Vérifiez le fichier .env ou docker compose."
    [[ -z "${POSTGRES_USER}" ]]     && die "POSTGRES_USER non défini."
    [[ -z "${POSTGRES_DB}" ]]       && die "POSTGRES_DB non défini."
}

# ─── Détection du mode d'exécution PostgreSQL ───────────────────────────────
detect_pg_mode() {
    # Retourne "docker" ou "external"
    if [[ -f "${COMPOSE_FILE}" ]] && command -v docker &>/dev/null; then
        local running
        running=$(docker compose -f "${COMPOSE_FILE}" ps --status running --services 2>/dev/null | grep -i postgres || true)
        if [[ -n "${running}" ]]; then
            echo "docker"
            return 0
        fi
    fi
    echo "external"
}

# ─── Obtenir le nom du conteneur PostgreSQL ─────────────────────────────────
get_pg_container() {
    docker compose -f "${COMPOSE_FILE}" ps -q postgres 2>/dev/null | head -1 || true
}

# ─── Obtenir le nom du conteneur API ────────────────────────────────────────
get_api_container() {
    docker compose -f "${COMPOSE_FILE}" ps -q api 2>/dev/null | head -1 || true
}

# ─── Exécuter une commande psql / pg_dump ───────────────────────────────────
pg_exec() {
    local sql="$1"
    local mode
    mode=$(detect_pg_mode)
    if [[ "${mode}" == "docker" ]]; then
        docker compose -f "${COMPOSE_FILE}" exec -T postgres \
            psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "${sql}" 2>/dev/null
    else
        PGPASSWORD="${POSTGRES_PASSWORD}" psql \
            -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" \
            -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "${sql}" 2>/dev/null
    fi
}

pg_dump_exec() {
    local output_file="$1"
    local mode
    mode=$(detect_pg_mode)
    if [[ "${mode}" == "docker" ]]; then
        docker compose -f "${COMPOSE_FILE}" exec -T postgres \
            pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
                --no-owner --no-privileges --clean --if-exists 2>/dev/null \
            | gzip > "${output_file}"
    else
        PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
            -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" \
            -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
            --no-owner --no-privileges --clean --if-exists 2>/dev/null \
            | gzip > "${output_file}"
    fi
}

pg_restore_exec() {
    local input_file="$1"
    local mode
    mode=$(detect_pg_mode)
    if [[ "${mode}" == "docker" ]]; then
        gunzip -c "${input_file}" | docker compose -f "${COMPOSE_FILE}" exec -T postgres \
            psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" 2>/dev/null
    else
        gunzip -c "${input_file}" | PGPASSWORD="${POSTGRES_PASSWORD}" psql \
            -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" \
            -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" 2>/dev/null
    fi
}

# ─── Taille lisible ─────────────────────────────────────────────────────────
human_size() {
    local bytes=$1
    local units=('o' 'Ko' 'Mo' 'Go' 'To')
    local unit=0
    while (( bytes > 1024 )) && (( unit < ${#units[@]} - 1 )); do
        bytes=$((bytes / 1024))
        ((unit++))
    done
    echo "${bytes} ${units[$unit]}"
}

# ═══════════════════════════════════════════════════════════════════════════
#  COMMANDE : backup
# ═══════════════════════════════════════════════════════════════════════════
cmd_backup() {
    log_header "SAUVEGARDE OVERSIGHT AI — ${TIMESTAMP}"

    load_env

    # Créer le dossier de sauvegardes
    mkdir -p "${BACKUP_DIR}"

    local mode
    mode=$(detect_pg_mode)
    log_info "Mode PostgreSQL : ${mode}"

    # Vérifier la connexion
    log_step "Vérification de la connexion à la base « ${POSTGRES_DB} » …"
    local db_size
    db_size=$(pg_exec "SELECT pg_size_pretty(pg_database_size('${POSTGRES_DB}'));" 2>/dev/null | grep -oP '\d+\s+\w+' | head -1 || echo "inconnue")
    if [[ -z "${db_size}" ]]; then
        die "Impossible de se connecter à PostgreSQL. Vérifiez les identifiants et l'état du service."
    fi
    log_info "Taille de la base : ${db_size}"

    # Chemin du fichier de sauvegarde
    local backup_file="${BACKUP_DIR}/oversight_backup_${TIMESTAMP}.sql.gz"

    # Dump compressé
    log_step "Création de la sauvegarde …"
    pg_dump_exec "${backup_file}"

    # Vérification
    if [[ ! -f "${backup_file}" ]]; then
        die "Le fichier de sauvegarde n'a pas été créé."
    fi

    local file_bytes
    file_bytes=$(stat -c%s "${backup_file}" 2>/dev/null || stat -f%z "${backup_file}" 2>/dev/null || echo "0")
    local file_size
    file_size=$(human_size "${file_bytes}")

    log_info "Sauvegarde créée : ${backup_file}"
    log_info "Taille du fichier : ${file_size}"

    # Rétention : supprimer les sauvegardes de plus de RETENTION_DAYS jours
    log_step "Application de la politique de rétention (${RETENTION_DAYS} jours) …"
    local deleted=0
    while IFS= read -r -d '' old_backup; do
        rm -f "${old_backup}"
        ((deleted++)) || true
    done < <(find "${BACKUP_DIR}" -name "oversight_backup_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -print0 2>/dev/null)

    if (( deleted > 0 )); then
        log_info "${deleted} ancienne(s) sauvegarde(s) supprimée(s) (>${RETENTION_DAYS} jours)."
    else
        log_info "Aucune ancienne sauvegarde à supprimer."
    fi

    # Lister les sauvegardes restantes
    local count
    count=$(find "${BACKUP_DIR}" -name "oversight_backup_*.sql.gz" -type f 2>/dev/null | wc -l)
    log_info "Total des sauvegardes conservées : ${count}"

    log_info "Sauvegarde terminée avec succès !"
}

# ═══════════════════════════════════════════════════════════════════════════
#  COMMANDE : restore
# ═══════════════════════════════════════════════════════════════════════════
cmd_restore() {
    local selected_file="${1:-}"
    log_header "RESTAURATION OVERSIGHT AI"

    load_env

    # Vérifier qu'il y a des sauvegardes
    if ! find "${BACKUP_DIR}" -name "oversight_backup_*.sql.gz" -type f -print0 2>/dev/null | grep -qz .; then
        die "Aucune sauvegarde trouvée dans ${BACKUP_DIR}/"
    fi

    # Si un fichier est fourni en argument
    if [[ -n "${selected_file}" ]]; then
        # Chemin complet si juste un nom de fichier
        if [[ "${selected_file}" != /* ]]; then
            selected_file="${BACKUP_DIR}/${selected_file}"
        fi
        if [[ ! -f "${selected_file}" ]]; then
            die "Fichier introuvable : ${selected_file}"
        fi
    else
        # Lister les sauvegardes disponibles
        echo -e "${BOLD}Sauvegardes disponibles :${NC}\n"
        local i=1
        declare -a files=()
        while IFS= read -r -d '' f; do
            local fname
            fname=$(basename "${f}")
            # Extraire la date du nom de fichier
            local fdate
            fdate=$(echo "${fname}" | grep -oP '\d{8}_\d{6}' || echo "inconnue")
            local fsize
            fsize=$(human_size "$(stat -c%s "${f}" 2>/dev/null || stat -f%z "${f}" 2>/dev/null || echo 0)")
            local pretty_date=""
            if [[ "${fdate}" != "inconnue" ]]; then
                pretty_date=$(date -d "${fdate:0:4}-${fdate:4:2}-${fdate:6:2} ${fdate:9:2}:${fdate:11:2}:${fdate:13:2}" "+%d/%m/%Y à %H:%M:%S" 2>/dev/null || echo "${fdate}")
            fi
            printf "  ${CYAN}%2d)${NC} %-45s %10s  (%s)\n" "${i}" "${fname}" "${fsize}" "${pretty_date}"
            files+=("${f}")
            ((i++)) || true
        done < <(find "${BACKUP_DIR}" -name "oversight_backup_*.sql.gz" -type f -print0 2>/dev/null | sort -z -r)

        echo ""
        echo -ne "${BOLD}Numéro de la sauvegarde à restaurer [1-$((i-1))] : ${NC}"
        local choice
        read -r choice

        if ! [[ "${choice}" =~ ^[0-9]+$ ]] || (( choice < 1 )) || (( choice >= i )); then
            die "Choix invalide."
        fi
        selected_file="${files[$((choice-1))]}"
    fi

    local restore_basename
    restore_basename=$(basename "${selected_file}")
    local restore_size
    restore_size=$(human_size "$(stat -c%s "${selected_file}" 2>/dev/null || stat -f%z "${selected_file}" 2>/dev/null || echo 0)")

    echo ""
    log_warn "╔══════════════════════════════════════════════════════════╗"
    log_warn "║  ⚠  ATTENTION — RESTAURATION DE PRODUCTION              ║"
    log_warn "╠══════════════════════════════════════════════════════════╣"
    log_warn "║  Cette opération va ÉCRASER la base de données actuelle ║"
    log_warn "║  avec le contenu de la sauvegarde sélectionnée.         ║"
    log_warn "║                                                          ║"
    log_warn "║  Fichier : ${restore_basename}"
    log_warn "║  Taille  : ${restore_size}"
    log_warn "║  Base    : ${POSTGRES_DB} @ ${POSTGRES_HOST}"
    log_warn "╚══════════════════════════════════════════════════════════╝"
    echo ""

    if ! confirm "Voulez-vous vraiment continuer la restauration ?" "n"; then
        log_info "Restauration annulée."
        exit 0
    fi

    # ── Arrêter l'API ────────────────────────────────────────────────────
    local mode
    mode=$(detect_pg_mode)
    local api_was_running=false

    if [[ "${mode}" == "docker" ]] && [[ -f "${COMPOSE_FILE}" ]]; then
        local api_container
        api_container=$(get_api_container)
        if [[ -n "${api_container}" ]]; then
            api_was_running=true
            log_step "Arrêt du service API …"
            docker compose -f "${COMPOSE_FILE}" stop api 2>/dev/null || true
            log_info "Service API arrêté."
        fi
    fi

    # ── Restaurer la base ────────────────────────────────────────────────
    log_step "Restauration de la base « ${POSTGRES_DB} » …"
    pg_restore_exec "${selected_file}"

    if [[ $? -ne 0 ]]; then
        log_error "Des erreurs se sont produites pendant la restauration."
    fi

    log_info "Base de données restaurée depuis : ${restore_basename}"

    # ── Redémarrer l'API ─────────────────────────────────────────────────
    if [[ "${api_was_running}" == true ]]; then
        log_step "Redémarrage du service API …"
        docker compose -f "${COMPOSE_FILE}" start api 2>/dev/null || true
        log_info "Service API redémarré."
    fi

    log_info "Restauration terminée avec succès !"
}

# ═══════════════════════════════════════════════════════════════════════════
#  COMMANDE : schedule
# ═══════════════════════════════════════════════════════════════════════════
cmd_schedule() {
    log_header "PLANIFICATION DES SAUVEGARDES AUTOMATIQUES"

    local script_path="${SCRIPT_DIR}/backup.sh"
    local cron_entry="0 2 * * * ${script_path} backup >> ${BACKUP_DIR}/cron_backup.log 2>&1"

    # Vérifier si le cron existe déjà
    if crontab -l 2>/dev/null | grep -qF "${script_path}"; then
        log_warn "Une tâche planifiée existe déjà pour ce script."
        echo ""
        crontab -l 2>/dev/null | grep -F "${script_path}"
        echo ""
        if ! confirm "Voulez-vous la remplacer ?" "n"; then
            log_info "Aucune modification effectuée."
            exit 0
        fi
        # Supprimer l'ancienne entrée
        crontab -l 2>/dev/null | grep -vF "${script_path}" | crontab - 2>/dev/null || true
    fi

    # Ajouter la nouvelle entrée
    (crontab -l 2>/dev/null; echo "${cron_entry}") | crontab -

    log_info "Tâche cron installée : sauvegarde quotidienne à 02h00"
    echo ""
    echo -e "${BOLD}Cron configuré :${NC}"
    echo -e "  ${cron_entry}"
    echo ""
    log_info "Les journaux seront écrits dans : ${BACKUP_DIR}/cron_backup.log"
}

# ═══════════════════════════════════════════════════════════════════════════
#  AIDE
# ═══════════════════════════════════════════════════════════════════════════
cmd_help() {
    echo -e "${BOLD}OVERSIGHT AI — Script de sauvegarde et restauration PostgreSQL${NC}\n"
    echo -e "Usage : ${CYAN}./backup.sh <commande> [options]${NC}\n"
    echo -e "Commandes :\n"
    echo -e "  ${GREEN}backup${NC}              Créer une sauvegarde horodatée de la base PostgreSQL"
    echo -e "  ${GREEN}restore${NC} [fichier]   Restaurer la base depuis une sauvegarde"
    echo -e "                       (sélection interactive si aucun fichier fourni)"
    echo -e "  ${GREEN}schedule${NC}            Installer une tâche cron pour une sauvegarde quotidienne à 02h00"
    echo -e "  ${GREEN}help${NC}                Afficher cette aide"
    echo ""
    echo -e "Configuration :"
    echo -e "  Le script lit les variables suivantes depuis ${BOLD}.env${NC} :"
    echo -e "    POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_HOST, POSTGRES_PORT"
    echo -e "  Si le fichier .env est absent, les valeurs sont lues depuis docker-compose.prod.yml"
    echo ""
    echo -e "Rétention :"
    echo -e "  Les sauvegardes de plus de ${RETENTION_DAYS} jours sont automatiquement supprimées."
    echo ""
    echo -e "Emplacement des sauvegardes :"
    echo -e "  ${BACKUP_DIR}/"
}

# ═══════════════════════════════════════════════════════════════════════════
#  POINT D'ENTRÉE
# ═══════════════════════════════════════════════════════════════════════════
main() {
    local command="${1:-help}"
    shift 2>/dev/null || true

    case "${command}" in
        backup)
            cmd_backup "$@"
            ;;
        restore)
            cmd_restore "$@"
            ;;
        schedule)
            cmd_schedule "$@"
            ;;
        help|--help|-h)
            cmd_help
            ;;
        *)
            log_error "Commande inconnue : ${command}"
            echo ""
            cmd_help
            exit 1
            ;;
    esac
}

main "$@"
