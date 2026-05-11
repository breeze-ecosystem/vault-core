#!/usr/bin/env bash
# =============================================================================
# Oversight Hub — Rolling Update Script
# Usage: ./update.sh [--service <name>] [--skip-healthcheck] [--rollback]
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------
readonly OPT_DIR="/opt/oversight"
readonly ENV_FILE="${OPT_DIR}/.env"
readonly COMPOSE_FILE="${OPT_DIR}/docker-compose.yml"
readonly LOG_FILE="${OPT_DIR}/logs/update_$(date +%Y%m%d_%H%M%S).log"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC}  $*" | tee -a "${LOG_FILE}"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*" | tee -a "${LOG_FILE}"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" | tee -a "${LOG_FILE}" >&2; }
die()  { err "$@"; exit 1; }

# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------
command -v docker &>/dev/null || die "Docker is not installed."

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  die "docker-compose.yml not found at ${COMPOSE_FILE}. Run install.sh first."
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  die ".env not found at ${ENV_FILE}. Run install.sh first."
fi

mkdir -p "$(dirname "${LOG_FILE}")"

# ---------------------------------------------------------------------------
# Compose helper
# ---------------------------------------------------------------------------
dc() {
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
TARGET_SERVICE=""
SKIP_HEALTH=false
FORCE_ROLLBACK=false
YES=false

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --service <name>         Update only this service (default: all services)
  --skip-healthcheck       Skip post-update health checks
  --rollback               Rollback to previous image versions
  -y, --yes                Skip confirmation prompt
  -h, --help               Show this help

Examples:
  $0                       Update all services with health checks
  $0 --service api         Update only the API service
  $0 --rollback            Rollback all services to previous version
  $0 -y                    Non-interactive update (for cron)

EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --service)          TARGET_SERVICE="$2"; shift 2 ;;
    --skip-healthcheck) SKIP_HEALTH=true;    shift   ;;
    --rollback)         FORCE_ROLLBACK=true;  shift   ;;
    -y|--yes)           YES=true;             shift   ;;
    -h|--help)          usage ;;
    *) die "Unknown option: $1" ;;
  esac
done

# ---------------------------------------------------------------------------
# Get list of services
# ---------------------------------------------------------------------------
get_services() {
  if [[ -n "${TARGET_SERVICE}" ]]; then
    echo "${TARGET_SERVICE}"
  else
    dc config --services 2>/dev/null
  fi
}

# ---------------------------------------------------------------------------
# Record current image digests for potential rollback
# ---------------------------------------------------------------------------
declare -A PREV_IMAGES=()

save_current_images() {
  log "Recording current image versions..."
  while read -r svc img; do
    PREV_IMAGES["${svc}"]="${img}"
    log "  ${svc}: ${img}"
  done < <(dc images --format '{{.Name}} {{.Image}}' 2>/dev/null | sort -u)
}

# ---------------------------------------------------------------------------
# Health check for a single service
# ---------------------------------------------------------------------------
check_health() {
  local service="$1"
  local max_wait=60
  local waited=0
  local interval=5

  # Get container name for the service
  local container
  container="$(dc ps -q "${service}" 2>/dev/null | head -1 || true)"
  if [[ -z "${container}" ]]; then
    warn "No running container found for ${service}"
    return 1
  fi

  while [[ ${waited} -lt ${max_wait} ]]; do
    local state
    state="$(docker inspect --format '{{.State.Health.Status}}' "${container}" 2>/dev/null || echo "unknown")"

    case "${state}" in
      healthy)
        log "  ✓ ${service} is healthy"
        return 0
        ;;
      unhealthy)
        err "  ✗ ${service} is unhealthy"
        return 1
        ;;
      *)
        # Still starting or no health check defined — check if running
        local running
        running="$(docker inspect --format '{{.State.Running}}' "${container}" 2>/dev/null || echo "false")"
        if [[ "${running}" == "true" ]]; then
          # If there's no health check defined, consider "running" as OK after grace period
          local has_healthcheck
          has_healthcheck="$(docker inspect --format '{{.Config.Healthcheck}}' "${container}" 2>/dev/null || echo "<nil>")"
          if [[ "${has_healthcheck}" == "<nil>" ]] && [[ ${waited} -ge 15 ]]; then
            log "  ✓ ${service} is running (no health check defined)"
            return 0
          fi
        else
          err "  ✗ ${service} container is not running"
          return 1
        fi
        ;;
    esac

    sleep "${interval}"
    waited=$((waited + interval))
  done

  warn "  ⏳ ${service} health check timed out after ${max_wait}s"
  return 1
}

# ---------------------------------------------------------------------------
# Pull latest images
# ---------------------------------------------------------------------------
pull_latest() {
  log "Pulling latest Docker images..."
  if [[ -n "${TARGET_SERVICE}" ]]; then
    dc pull "${TARGET_SERVICE}"
  else
    dc pull
  fi
  log "Image pull complete."
}

# ---------------------------------------------------------------------------
# Update a single service (rolling)
# ---------------------------------------------------------------------------
update_service() {
  local service="$1"
  log "Updating service: ${service}"

  # Stop the old container
  log "  Stopping ${service}..."
  dc stop "${service}" 2>/dev/null || true

  # Remove old container
  dc rm -f "${service}" 2>/dev/null || true

  # Start new container with the new image
  log "  Starting ${service}..."
  dc up -d "${service}"

  # Give it a moment to start
  sleep 3

  # Health check
  if [[ "${SKIP_HEALTH}" == "false" ]]; then
    if ! check_health "${service}"; then
      err "Health check failed for ${service} — rolling back..."
      rollback_service "${service}"
      return 1
    fi
  else
    log "  Health check skipped for ${service}"
  fi

  log "  ✓ ${service} updated successfully"
  return 0
}

# ---------------------------------------------------------------------------
# Rollback a single service
# ---------------------------------------------------------------------------
rollback_service() {
  local service="$1"
  local prev_img="${PREV_IMAGES[${service}]:-}"

  if [[ -z "${prev_img}" ]]; then
    warn "  No previous image recorded for ${service} — cannot rollback automatically."
    return 1
  fi

  log "  Rolling back ${service} to ${prev_img}..."
  dc stop "${service}" 2>/dev/null || true
  dc rm -f "${service}" 2>/dev/null || true

  # Run with previous image
  dc run -d --name "${service}" --service-ports "${service}" \
    --entrypoint="" \
    "${prev_img}" 2>/dev/null || {
    # Fallback: just restart the service (compose will use whatever image)
    warn "  Direct image fallback failed, restarting with compose..."
    dc up -d "${service}"
  }

  sleep 3
  if check_health "${service}"; then
    log "  ✓ ${service} rolled back successfully"
    return 0
  else
    err "  ✗ ${service} rollback health check also failed!"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# Full rollback
# ---------------------------------------------------------------------------
do_full_rollback() {
  log "=== Performing Full Rollback ==="
  save_current_images

  for svc in $(get_services); do
    rollback_service "${svc}" || true
  done

  log "Rollback complete."
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print_summary() {
  local failed=0
  local updated=0

  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║         Oversight Hub — Update Summary              ║${NC}"
  echo -e "${CYAN}╠══════════════════════════════════════════════════════╣${NC}"

  for svc in $(get_services); do
    local container
    container="$(dc ps -q "${svc}" 2>/dev/null | head -1 || true)"
    if [[ -n "${container}" ]]; then
      local running
      running="$(docker inspect --format '{{.State.Running}}' "${container}" 2>/dev/null || echo "false")"
      local img
      img="$(docker inspect --format '{{.Config.Image}}' "${container}" 2>/dev/null || echo "unknown")"
      if [[ "${running}" == "true" ]]; then
        echo -e "${GREEN}║${NC}  ✓ ${svc}: running (${img})"
        updated=$((updated + 1))
      else
        echo -e "${RED}║${NC}  ✗ ${svc}: NOT running"
        failed=$((failed + 1))
      fi
    else
      echo -e "${RED}║${NC}  ✗ ${svc}: container not found"
      failed=$((failed + 1))
    fi
  done

  echo -e "${CYAN}╠══════════════════════════════════════════════════════╣${NC}"
  echo -e "${GREEN}║${NC}  Updated: ${updated}  |  Failed: ${failed}"
  echo -e "${CYAN}║${NC}  Log: ${LOG_FILE}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""

  if [[ ${failed} -gt 0 ]]; then
    err "${failed} service(s) failed. Check logs at ${LOG_FILE}"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  log "=== Oversight Hub Rolling Update ==="
  log "Started at $(date -Iseconds)"

  # Handle rollback mode
  if [[ "${FORCE_ROLLBACK}" == "true" ]]; then
    do_full_rollback
    exit $?
  fi

  # Confirmation
  if [[ "${YES}" == "false" ]]; then
    log "Services to update:"
    for svc in $(get_services); do
      log "  - ${svc}"
    done
    echo ""
    read -rp "Proceed with update? [y/N] " confirm
    [[ "${confirm}" =~ ^[Yy]$ ]] || { log "Update cancelled."; exit 0; }
  fi

  # Save current state for rollback
  save_current_images

  # Pull latest images
  pull_latest

  # Pre-backup database (best-effort)
  if [[ -x "${OPT_DIR}/../scripts/backup.sh" || -x "$(dirname "${BASH_SOURCE[0]}")/backup.sh" ]]; then
    log "Creating pre-update database backup..."
    "$(dirname "${BASH_SOURCE[0]}")/backup.sh" || warn "Pre-update backup failed — continuing anyway."
  else
    warn "backup.sh not found — skipping pre-update backup."
  fi

  # Update services one by one
  local any_failed=false
  for svc in $(get_services); do
    if ! update_service "${svc}"; then
      any_failed=true
    fi
  done

  # Print summary
  print_summary

  if [[ "${any_failed}" == "true" ]]; then
    err "Some services failed to update. Review the summary above."
    exit 1
  fi

  log "All services updated successfully."
}

main "$@"
