#!/usr/bin/env bash
# =============================================================================
# OVERSIGHT AI — Script de mise à jour du système de vidéosurveillance
# =============================================================================
# Usage   : ./update.sh
# Auteur  : OVERSIGHT AI — DevOps
# Licence : Propriétaire
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
readonly COMPOSE_FILE="docker-compose.prod.yml"
readonly BACKUP_DIR="./backups"
readonly TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
readonly LOG_FILE="${BACKUP_DIR}/update_${TIMESTAMP}.log"
readonly HISTORY_FILE="${BACKUP_DIR}/update_history.log"
readonly MIN_DISK_GB=2
readonly HEALTH_TIMEOUT=180          # 3 minutes
readonly HEALTH_INTERVAL=5           # vérification toutes les 5 s
readonly API_HEALTH_URL="http://localhost:4000/api/health"
readonly DASHBOARD_URL="http://localhost:3100"

# ---------------------------------------------------------------------------
# Couleurs
# ---------------------------------------------------------------------------
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()   { echo -e "$1" | tee -a "${LOG_FILE}"; }
info()  { log "${BLUE}[INFO]${NC}    $1"; }
ok()    { log "${GREEN}[  OK ]${NC}   $1"; }
warn()  { log "${YELLOW}[ATTENTION]${NC} $1"; }
error() { log "${RED}[ERREUR]${NC}  $1"; }

# ---------------------------------------------------------------------------
# Préparation du répertoire de sauvegarde et du fichier de log
# ---------------------------------------------------------------------------
prepare_logging() {
    mkdir -p "${BACKUP_DIR}"
    echo "" >> "${LOG_FILE}"
    echo "============================================" >> "${LOG_FILE}"
    echo " OVERSIGHT AI — Mise à jour du ${TIMESTAMP}" >> "${LOG_FILE}"
    echo "============================================" >> "${LOG_FILE}"
    info "Log de la mise à jour : ${LOG_FILE}"
}

# =============================================================================
# 1. VÉRIFICATIONS PRÉ-VOl
# =============================================================================
preflight_checks() {
    info "=== Vérifications pré-vol ==="

    # -- git --
    if command -v git &>/dev/null; then
        ok "git disponible ($(git --version))"
    else
        error "git n'est pas installé ou introuvable dans le PATH."
        exit 1
    fi

    # -- docker compose --
    if docker compose version &>/dev/null; then
        ok "docker compose disponible ($(docker compose version --short))"
    elif command -v docker-compose &>/dev/null; then
        error "docker-compose (v1) détecté — ce script requiert Docker Compose v2 (plugin)."
        exit 1
    else
        error "docker compose n'est pas installé ou introuvable dans le PATH."
        exit 1
    fi

    # -- espace disque --
    local avail_kb
    avail_kb=$(df -Pk . | awk 'NR==2 {print $4}')
    local avail_gb=$((avail_kb / 1024 / 1024))
    if (( avail_gb >= MIN_DISK_GB )); then
        ok "Espace disque disponible : ${avail_gb} Go (minimum requis : ${MIN_DISK_GB} Go)"
    else
        error "Espace disque insuffisant : ${avail_gb} Go (minimum requis : ${MIN_DISK_GB} Go)"
        exit 1
    fi

    # -- dépôt git --
    if [[ ! -d .git ]]; then
        error "Ce répertoire ne semble pas être un dépôt git."
        exit 1
    fi
    ok "Dépôt git détecté"

    # -- services en cours d'exécution --
    if docker compose -f "${COMPOSE_FILE}" ps --status running -q 2>/dev/null | grep -q .; then
        local running_count
        running_count=$(docker compose -f "${COMPOSE_FILE}" ps --status running -q | wc -l)
        ok "Services actuellement en cours d'exécution : ${running_count}"
    else
        warn "Aucun service OVERSIGHT n'est actuellement en cours d'exécution."
    fi
}

# =============================================================================
# 2. PROCESSUS DE MISE À JOUR
# =============================================================================
save_current_state() {
    PREVIOUS_COMMIT=$(git rev-parse HEAD)
    ok "Commit actuel sauvegardé : ${PREVIOUS_COMMIT}"
    echo "${TIMESTAMP} | commit_avant=${PREVIOUS_COMMIT}" >> "${HISTORY_FILE}"

    # Détection d'un arbre de travail sale
    DIRTY=false
    if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
        DIRTY=true
        warn "Arbre de travail non propre — les modifications seront stashed."
    fi
}

fetch_and_show_changelog() {
    info "Récupération des dernières modifications depuis origin…"
    git fetch origin 2>&1 | tee -a "${LOG_FILE}"

    local new_commits
    new_commits=$(git log HEAD..origin/main --oneline 2>/dev/null || true)

    if [[ -z "${new_commits}" ]]; then
        ok "Le dépôt local est déjà à jour — aucune nouvelle révision."
        EXIT_EARLY=true
        return
    fi

    echo ""
    log "${BLUE}=== Journal des modifications ===${NC}"
    log "${new_commits}"
    echo ""
}

ask_confirmation() {
    if [[ "${EXIT_EARLY:-false}" == "true" ]]; then
        return
    fi

    log ""
    log "${YELLOW}Voulez-vous poursuivre la mise à jour ? [o/N]${NC}"
    read -r response
    case "${response}" in
        [oO]|[oO][uU][iI]|[yY]|[yY][eE][sS])
            ok "Poursuite de la mise à jour…"
            ;;
        *)
            info "Mise à jour annulée par l'utilisateur."
            exit 0
            ;;
    esac
}

pull_changes() {
    if [[ "${EXIT_EARLY:-false}" == "true" ]]; then
        return
    fi

    info "Application des mises à jour…"

    if [[ "${DIRTY}" == "true" ]]; then
        info "Stash des modifications locales…"
        git stash push -m "oversight-auto-stash-${TIMESTAMP}" 2>&1 | tee -a "${LOG_FILE}"
    fi

    info "Pull de origin/main…"
    git pull origin main 2>&1 | tee -a "${LOG_FILE}"

    if [[ "${DIRTY}" == "true" ]]; then
        info "Restauration des modifications stashed…"
        if git stash pop 2>&1 | tee -a "${LOG_FILE}"; then
            ok "Modifications locales restaurées avec succès."
        else
            warn "Conflits détectés lors du stash pop — veuillez résoudre manuellement."
        fi
    fi
}

build_and_deploy() {
    info "Construction des images Docker (parallel)…"
    docker compose -f "${COMPOSE_FILE}" build --parallel 2>&1 | tee -a "${LOG_FILE}"

    info "Démarrage des services…"
    docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans 2>&1 | tee -a "${LOG_FILE}"

    info "Nettoyage des anciennes images…"
    docker image prune -f 2>&1 | tee -a "${LOG_FILE}"
}

# =============================================================================
# 3. CAPACITÉ DE ROLLBACK
# =============================================================================
offer_rollback() {
    error "La mise à jour a échoué !"
    echo ""
    log "${YELLOW}Voulez-vous effectuer un rollback vers le commit précédent ?${NC}"
    log "${YELLOW}  Commit de rollback : ${PREVIOUS_COMMIT}${NC}"
    log "${YELLOW}  [o/N]${NC}"
    read -r response
    case "${response}" in
        [oO]|[oO][uU][iI]|[yY]|[yY][eE][sS])
            info "Rollback en cours vers ${PREVIOUS_COMMIT}…"
            echo "${TIMESTAMP} | ROLLBACK | de=$(git rev-parse HEAD) vers=${PREVIOUS_COMMIT}" >> "${HISTORY_FILE}"
            git checkout "${PREVIOUS_COMMIT}" 2>&1 | tee -a "${LOG_FILE}"
            docker compose -f "${COMPOSE_FILE}" build --parallel 2>&1 | tee -a "${LOG_FILE}"
            docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans 2>&1 | tee -a "${LOG_FILE}"
            ok "Rollback terminé — système restauré au commit ${PREVIOUS_COMMIT}."
            ;;
        *)
            info "Rollback annulé par l'utilisateur."
            ;;
    esac
}

# =============================================================================
# 4. VÉRIFICATION DE SANTÉ POST-MISE À JOUR
# =============================================================================
health_check() {
    info "=== Vérification de santé des services ==="
    info "Attente maximale : $(( HEALTH_TIMEOUT / 60 )) minutes"

    local elapsed=0
    local all_healthy=false

    while (( elapsed < HEALTH_TIMEOUT )); do
        if docker compose -f "${COMPOSE_FILE}" ps --status running -q 2>/dev/null | grep -q .; then
            local running_count total_count
            total_count=$(docker compose -f "${COMPOSE_FILE}" ps -q 2>/dev/null | wc -l)
            running_count=$(docker compose -f "${COMPOSE_FILE}" ps --status running -q 2>/dev/null | wc -l)

            if (( running_count == total_count )) && (( total_count > 0 )); then
                all_healthy=true
                break
            else
                info "Services : ${running_count}/${total_count} en cours d'exécution… (${elapsed}s)"
            fi
        fi
        sleep "${HEALTH_INTERVAL}"
        elapsed=$((elapsed + HEALTH_INTERVAL))
    done

    if [[ "${all_healthy}" != "true" ]]; then
        warn "Tous les services ne sont pas devenus sains dans le délai imparti."
    else
        ok "Tous les services sont en cours d'exécution."
    fi

    # -- Test endpoint API santé --
    info "Test de l'endpoint API : ${API_HEALTH_URL}"
    local api_status
    api_status=$(curl -sf -o /dev/null -w "%{http_code}" "${API_HEALTH_URL}" 2>/dev/null || echo "000")
    if [[ "${api_status}" == "200" ]]; then
        ok "API santé : HTTP ${api_status}"
    else
        warn "API santé : HTTP ${api_status} (attendu 200)"
    fi

    # -- Test dashboard HTTP --
    info "Test du tableau de bord : ${DASHBOARD_URL}"
    local dash_status
    dash_status=$(curl -sf -o /dev/null -w "%{http_code}" "${DASHBOARD_URL}" 2>/dev/null || echo "000")
    if [[ "${dash_status}" =~ ^(200|301|302)$ ]]; then
        ok "Tableau de bord : HTTP ${dash_status}"
    else
        warn "Tableau de bord : HTTP ${dash_status} (attendu 200/301/302)"
    fi

    # -- Résultat final --
    echo ""
    if [[ "${all_healthy}" == "true" ]] && [[ "${api_status}" == "200" ]]; then
        log "${GREEN}╔══════════════════════════════════════════════╗${NC}"
        log "${GREEN}║      MISE À JOUR EFFECTUÉE AVEC SUCCÈS      ║${NC}"
        log "${GREEN}╚══════════════════════════════════════════════╝${NC}"
        echo "${TIMESTAMP} | SUCCÈS | commit=$(git rev-parse HEAD)" >> "${HISTORY_FILE}"
    else
        log "${YELLOW}╔══════════════════════════════════════════════╗${NC}"
        log "${YELLOW}║     MISE À JOUR TERMINÉE — AVEC AVERTISSEMENTS    ║${NC}"
        log "${YELLOW}╚══════════════════════════════════════════════╝${NC}"
        warn "Certains contrôles de santé ont échoué. Veuillez vérifier les logs."
        echo "${TIMESTAMP} | AVERTISSEMENT | commit=$(git rev-parse HEAD)" >> "${HISTORY_FILE}"
    fi
}

# =============================================================================
# POINT D'ENTRÉE
# =============================================================================
main() {
    echo ""
    info "╔═══════════════════════════════════════════════╗"
    info "║  OVERSIGHT AI — Script de mise à jour v1.0    ║"
    info "╚═══════════════════════════════════════════════╝"
    echo ""

    prepare_logging
    preflight_checks
    save_current_state
    fetch_and_show_changelog
    ask_confirmation

    if [[ "${EXIT_EARLY:-false}" != "true" ]]; then
        if ! pull_changes; then
            offer_rollback
            exit 1
        fi

        if ! build_and_deploy; then
            offer_rollback
            exit 1
        fi
    fi

    health_check

    info "Log complet disponible : ${LOG_FILE}"
    info "Historique des mises à jour : ${HISTORY_FILE}"
}

main "$@"
