#!/usr/bin/env bash
# =============================================================================
# Oversight Hub — Manual Backup & Restore
# Usage:
#   ./backup.sh              — Create a new backup (pg_dump)
#   ./backup.sh --list       — List available backups
#   ./backup.sh --restore <file.sql.gz> — Restore from a backup
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------
readonly OPT_DIR="/opt/oversight"
readonly BACKUP_DIR="${OPT_DIR}/backups"
readonly ENV_FILE="${OPT_DIR}/.env"
readonly COMPOSE_FILE="${OPT_DIR}/docker-compose.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }
die()  { err "$@"; exit 1; }

# ---------------------------------------------------------------------------
# Load environment
# ---------------------------------------------------------------------------
load_env() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    die "Environment file not found: ${ENV_FILE}. Run install.sh first."
  fi
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
}

# ---------------------------------------------------------------------------
# Determine the postgres container name
# ---------------------------------------------------------------------------
get_postgres_container() {
  local container
  container="$(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" \
    ps --format '{{.Name}}' 2>/dev/null \
    | grep -i postgres | head -1 || true)"

  if [[ -z "${container}" ]]; then
    die "Postgres container is not running. Start services first."
  fi
  echo "${container}"
}

# ---------------------------------------------------------------------------
# Backup
# ---------------------------------------------------------------------------
do_backup() {
  load_env
  mkdir -p "${BACKUP_DIR}"

  local container
  container="$(get_postgres_container)"

  local timestamp
  timestamp="$(date +%Y%m%d_%H%M%S)"
  local backup_file="oversight_backup_${timestamp}.sql.gz"
  local backup_path="${BACKUP_DIR}/${backup_file}"

  log "Starting backup from container: ${container}"
  log "Database: ${POSTGRES_DB:-oversight}"

  # Run pg_dump inside the container and pipe to gzip locally
  docker exec "${container}" \
    pg_dump \
      -U "${POSTGRES_USER:-oversight}" \
      -d "${POSTGRES_DB:-oversight}" \
      --clean --if-exists \
      --no-owner --no-privileges \
      2>/dev/null \
    | gzip > "${backup_path}"

  if [[ ! -s "${backup_path}" ]]; then
    rm -f "${backup_path}"
    die "Backup failed — output file is empty."
  fi

  local size
  size="$(du -h "${backup_path}" | cut -f1)"

  log "Backup completed successfully!"
  log "  File: ${backup_path}"
  log "  Size: ${size}"

  # Cleanup: keep only last 30 backups
  local count
  count="$(find "${BACKUP_DIR}" -name 'oversight_backup_*.sql.gz' | wc -l)"
  if [[ ${count} -gt 30 ]]; then
    local to_remove
    to_remove=$((count - 30))
    log "Cleaning up old backups (keeping 30 most recent, removing ${to_remove})..."
    find "${BACKUP_DIR}" -name 'oversight_backup_*.sql.gz' -printf '%T+ %p\n' \
      | sort | head -n "${to_remove}" | awk '{print $2}' | xargs rm -f
  fi
}

# ---------------------------------------------------------------------------
# List backups
# ---------------------------------------------------------------------------
do_list() {
  if [[ ! -d "${BACKUP_DIR}" ]] || [[ -z "$(ls -A "${BACKUP_DIR}" 2>/dev/null)" ]]; then
    log "No backups found in ${BACKUP_DIR}"
    return 0
  fi

  log "Available backups in ${BACKUP_DIR}:"
  echo ""
  echo -e "${CYAN}$(printf '%-45s %-12s %-20s' 'FILE' 'SIZE' 'DATE')${NC}"
  echo "─────────────────────────────────────────────────────────────────────────"

  find "${BACKUP_DIR}" -name 'oversight_backup_*.sql.gz' -printf '%T+ %s %f\n' \
    | sort -r \
    | while read -r _date_epoch _size _fname; do
        # Re-read with proper parsing
        true
      done

  # Simpler approach
  ls -lht "${BACKUP_DIR}"/oversight_backup_*.sql.gz 2>/dev/null \
    | while read -r perms links owner group size month day time filename; do
        local base
        base="$(basename "${filename}")"
        printf '  %-45s %-12s %s %s %s\n' "${base}" "${size}" "${month}" "${day}" "${time}"
      done

  echo ""
  local total
  total="$(find "${BACKUP_DIR}" -name 'oversight_backup_*.sql.gz' | wc -l)"
  log "Total: ${total} backup(s)"
}

# ---------------------------------------------------------------------------
# Restore
# ---------------------------------------------------------------------------
do_restore() {
  local restore_file="$1"

  if [[ ! -f "${restore_file}" ]]; then
    die "Backup file not found: ${restore_file}"
  fi

  if [[ "${restore_file}" != *.sql.gz ]]; then
    die "Backup file must be a .sql.gz file."
  fi

  load_env

  local container
  container="$(get_postgres_container)"

  log "⚠ WARNING: This will replace the current database with the backup!"
  log "  Container: ${container}"
  log "  Database:  ${POSTGRES_DB:-oversight}"
  log "  Backup:    ${restore_file}"
  echo ""
  read -rp "Are you sure you want to continue? [y/N] " confirm
  [[ "${confirm}" =~ ^[Yy]$ ]] || { log "Restore cancelled."; exit 0; }

  log "Restoring backup..."

  # Decompress and pipe into psql inside the container
  gunzip -c "${restore_file}" | docker exec -i "${container}" \
    psql \
      -U "${POSTGRES_USER:-oversight}" \
      -d "${POSTGRES_DB:-oversight}" \
      -v ON_ERROR_STOP=1 \
      2>&1 | tail -20

  log "Restore completed."
  log "Restarting services to ensure clean state..."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" restart
  log "Services restarted."
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  # Ensure docker is available
  command -v docker &>/dev/null || die "Docker is not installed."

  if [[ $# -eq 0 ]]; then
    do_backup
  elif [[ "$1" == "--list" ]]; then
    do_list
  elif [[ "$1" == "--restore" ]]; then
    [[ $# -lt 2 ]] && die "Usage: $0 --restore <file.sql.gz>"
    do_restore "$2"
  elif [[ "$1" == "-h" || "$1" == "--help" ]]; then
    cat <<EOF
Usage:
  $0                        Create a database backup
  $0 --list                 List available backups
  $0 --restore <file.sql.gz> Restore from a backup file

EOF
  else
    die "Unknown option: $1. Use --help for usage."
  fi
}

main "$@"
