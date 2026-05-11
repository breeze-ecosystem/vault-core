#!/usr/bin/env bash
# =============================================================================
# Oversight Hub — Edge Server Installation Script
# Usage: ./install.sh --tier <argent|or|platine> --client <name> --cameras <rtsp://...> ...
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly OPT_DIR="/opt/oversight"
readonly BACKUP_DIR="${OPT_DIR}/backups"
readonly ENV_FILE="${OPT_DIR}/.env"
readonly GO2RTC_CONF="${OPT_DIR}/go2rtc.yaml"
readonly EDGE_CONF="${OPT_DIR}/edge.config.json"
readonly COMPOSE_FILE="${OPT_DIR}/docker-compose.yml"
readonly SYSTEMD_UNIT="/etc/systemd/system/oversight-agent.service"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

die() {
  err "$@"
  exit 1
}

require_cmd() {
  command -v "$1" &>/dev/null || die "Required command '$1' not found."
}

gen_secret() {
  openssl rand -hex 32
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
TIER=""
CLIENT=""
CAMERAS=""
CF_TOKEN=""
ADMIN_PASSWORD=""
ADMIN_EMAIL=""
SUPERVISION_URL=""
SUPERVISION_TOKEN=""

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --tier <argent|or|platine>   License tier (required)
  --client <name>              Client / site name (required)
  --cameras <rtsp_urls>        Comma-separated RTSP URLs (required)
  --cloudflare-token <tok>     Cloudflare tunnel token (optional)
  --admin-password <pw>        Admin password (auto-generated if omitted)
  --admin-email <email>        Admin e-mail address (required)
  --supervision-url <url>      Supervision platform URL (optional)
  --supervision-token <tok>    Supervision auth token (optional)
  -h, --help                   Show this help

Example:
  $0 --tier platine --client warehouse42 \\
      --cameras "rtsp://10.0.0.1:554/stream1,rtsp://10.0.0.2:554/live" \\
      --admin-email admin@example.com --cloudflare-token eyJ...

EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tier)              TIER="$2";              shift 2 ;;
    --client)            CLIENT="$2";            shift 2 ;;
    --cameras)           CAMERAS="$2";           shift 2 ;;
    --cloudflare-token)  CF_TOKEN="$2";          shift 2 ;;
    --admin-password)    ADMIN_PASSWORD="$2";    shift 2 ;;
    --admin-email)       ADMIN_EMAIL="$2";       shift 2 ;;
    --supervision-url)   SUPERVISION_URL="$2";   shift 2 ;;
    --supervision-token) SUPERVISION_TOKEN="$2"; shift 2 ;;
    -h|--help)           usage ;;
    *) die "Unknown option: $1" ;;
  esac
done

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
[[ -z "${TIER}" ]]           && die "--tier is required (argent|or|platine)."
[[ "${TIER}" =~ ^(argent|or|platine)$ ]] || die "Invalid tier '${TIER}'. Must be argent, or, or platine."
[[ -z "${CLIENT}" ]]         && die "--client is required."
[[ -z "${CAMERAS}" ]]        && die "--cameras is required (comma-separated RTSP URLs)."
[[ -z "${ADMIN_EMAIL}" ]]    && die "--admin-email is required."

# Validate each camera URL starts with rtsp://
IFS=',' read -ra CAM_LIST <<< "${CAMERAS}"
for url in "${CAM_LIST[@]}"; do
  [[ "${url}" =~ ^rtsp:// ]] || die "Invalid camera URL (must start with rtsp://): ${url}"
done

[[ -z "${ADMIN_PASSWORD}" ]] && ADMIN_PASSWORD="$(gen_secret)"

log "Configuration validated — tier=${TIER} client=${CLIENT} cameras=${#CAM_LIST[@]}"

# ---------------------------------------------------------------------------
# OS detection
# ---------------------------------------------------------------------------
detect_os() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    source /etc/os-release
    case "${ID:-}" in
      ubuntu|debian)
        log "Detected OS: ${PRETTY_NAME:-$ID}"
        return 0
        ;;
      *)
        die "Unsupported OS: ${ID:-unknown}. Only Ubuntu/Debian are supported."
        ;;
    esac
  else
    die "Cannot detect OS — /etc/os-release not found."
  fi
}

# ---------------------------------------------------------------------------
# Docker installation
# ---------------------------------------------------------------------------
install_docker() {
  if command -v docker &>/dev/null; then
    local ver
    ver="$(docker --version 2>/dev/null || echo 'unknown')"
    log "Docker already installed: ${ver}"
    return 0
  fi

  log "Installing Docker via get.docker.com ..."
  require_cmd curl
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  log "Docker installed successfully."

  # Add current user to docker group (best-effort)
  usermod -aG docker "${SUDO_USER:-$(whoami)}" 2>/dev/null || true
}

install_compose_plugin() {
  if docker compose version &>/dev/null; then
    log "Docker Compose plugin already available."
    return 0
  fi
  log "Installing docker-compose-plugin ..."
  apt-get update -qq
  apt-get install -y -qq docker-compose-plugin
  docker compose version
  log "Docker Compose plugin installed."
}

# ---------------------------------------------------------------------------
# Directory structure
# ---------------------------------------------------------------------------
setup_directories() {
  log "Creating directory structure at ${OPT_DIR} ..."
  mkdir -p "${OPT_DIR}"
  mkdir -p "${BACKUP_DIR}"
  mkdir -p "${OPT_DIR}/config"
  mkdir -p "${OPT_DIR}/data/postgres"
  mkdir -p "${OPT_DIR}/data/redis"
  mkdir -p "${OPT_DIR}/logs"
}

# ---------------------------------------------------------------------------
# Compose file
# ---------------------------------------------------------------------------
copy_compose() {
  local src="${SCRIPT_DIR}/../configs/${TIER}.yml"
  if [[ ! -f "${src}" ]]; then
    warn "Tier compose file not found at ${src} — pulling from GitHub releases."
    src="/tmp/oversight-hub/edge/configs/${TIER}.yml"
  fi
  if [[ ! -f "${src}" ]]; then
    die "Cannot locate compose file for tier '${TIER}'. Expected at ${src}"
  fi
  cp "${src}" "${COMPOSE_FILE}"
  log "Copied ${TIER}.yml → ${COMPOSE_FILE}"
}

# ---------------------------------------------------------------------------
# Secrets & .env
# ---------------------------------------------------------------------------
generate_env() {
  log "Generating secrets ..."
  local JWT_ACCESS_SECRET JWT_REFRESH_SECRET POSTGRES_PASSWORD REDIS_PASSWORD
  JWT_ACCESS_SECRET="$(gen_secret)"
  JWT_REFRESH_SECRET="$(gen_secret)"
  POSTGRES_PASSWORD="$(gen_secret)"
  REDIS_PASSWORD="$(gen_secret)"

  cat > "${ENV_FILE}" <<EOF
# Oversight Hub — Edge Environment
# Generated $(date -Iseconds)
# ─────────────────────────────────────────────────────────────────────────────

# ── General ──
OVERSIGHT_TIER=${TIER}
OVERSIGHT_CLIENT=${CLIENT}
OVERSIGHT_ADMIN_EMAIL=${ADMIN_EMAIL}
OVERSIGHT_ADMIN_PASSWORD=${ADMIN_PASSWORD}

# ── Secrets ──
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}

# ── Database ──
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=oversight
POSTGRES_USER=oversight
POSTGRES_DATA_DIR=${OPT_DIR}/data/postgres

# ── Redis ──
REDIS_HOST=redis
REDIS_PORT=6379

# ── Go2RTC ──
GO2RTC_CONFIG=${GO2RTC_CONF}

# ── Paths ──
OPT_DIR=${OPT_DIR}
BACKUP_DIR=${BACKUP_DIR}
LOG_DIR=${OPT_DIR}/logs

# ── Cloudflare Tunnel (optional) ──
CF_TUNNEL_TOKEN=${CF_TOKEN}

# ── Supervision (optional) ──
SUPERVISION_URL=${SUPERVISION_URL}
SUPERVISION_TOKEN=${SUPERVISION_TOKEN}
EOF

  chmod 600 "${ENV_FILE}"
  log "Wrote ${ENV_FILE}"
}

# ---------------------------------------------------------------------------
# go2rtc.yaml — one stream per camera
# ---------------------------------------------------------------------------
generate_go2rtc() {
  log "Generating go2rtc.yaml ..."
  {
    echo "# Oversight Hub — go2rtc configuration"
    echo "# Generated $(date -Iseconds)"
    echo ""
    echo "streams:"
    local i=1
    for url in "${CAM_LIST[@]}"; do
      echo "  cam${i}: ${url}"
      ((i++))
    done
    echo ""
    echo "api:"
    echo "  listen: \"0.0.0.0:1984\""
    echo ""
    echo "webrtc:"
    echo "  listen: \"0.0.0.0:8555\""
  } > "${GO2RTC_CONF}"

  log "Wrote ${GO2RTC_CONF} with ${#CAM_LIST[@]} stream(s)"
}

# ---------------------------------------------------------------------------
# edge.config.json
# ---------------------------------------------------------------------------
generate_edge_config() {
  log "Generating edge.config.json ..."

  # Build cameras array as JSON
  local cameras_json="["
  local first=true
  local i=1
  for url in "${CAM_LIST[@]}"; do
    [[ "${first}" == "false" ]] && cameras_json+=","
    cameras_json+="{\"name\":\"cam${i}\",\"url\":\"${url}\",\"enabled\":true}"
    first=false
    ((i++))
  done
  cameras_json+="]"

  cat > "${EDGE_CONF}" <<EOJSON
{
  "version": "1.0.0",
  "tier": "${TIER}",
  "client": "${CLIENT}",
  "adminEmail": "${ADMIN_EMAIL}",
  "installDate": "$(date -Iseconds)",
  "optDir": "${OPT_DIR}",
  "cameras": ${cameras_json},
  "supervision": {
    "url": "${SUPERVISION_URL}",
    "token": "${SUPERVISION_TOKEN}"
  },
  "cloudflare": {
    "tunnelToken": "${CF_TOKEN}"
  }
}
EOJSON

  log "Wrote ${EDGE_CONF}"
}

# ---------------------------------------------------------------------------
# Pull & start
# ---------------------------------------------------------------------------
pull_images() {
  log "Pulling Docker images (this may take a while) ..."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" pull
  log "All images pulled."
}

start_services() {
  log "Starting services ..."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d
  log "Services started."
}

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
health_check() {
  local max_wait=120
  local waited=0
  local interval=5

  log "Waiting for services to become healthy (max ${max_wait}s) ..."

  while [[ ${waited} -lt ${max_wait} ]]; do
    local unhealthy
    unhealthy="$(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps --format '{{.Name}} {{.Health}}' 2>/dev/null \
                  | grep -v -E '(healthy|running)' || true)"

    if [[ -z "${unhealthy}" ]]; then
      log "All services are healthy!"
      return 0
    fi

    log "  Waiting... (${waited}s elapsed)"
    sleep "${interval}"
    waited=$((waited + interval))
  done

  warn "Some services did not report healthy within ${max_wait}s."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps
  return 1
}

# ---------------------------------------------------------------------------
# systemd unit
# ---------------------------------------------------------------------------
install_systemd() {
  log "Installing systemd service ..."

  cat > "${SYSTEMD_UNIT}" <<EOF
[Unit]
Description=Oversight Hub Edge Agent
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${OPT_DIR}
ExecStart=/usr/bin/docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} up -d
ExecStop=/usr/bin/docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable oversight-agent.service
  log "systemd unit installed and enabled."
}

# ---------------------------------------------------------------------------
# Success banner
# ---------------------------------------------------------------------------
print_success() {
  local local_ip
  local_ip="$(hostname -I 2>/dev/null | awk '{print $1}' || echo '<server-ip>')"

  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║          Oversight Hub — Installation Complete!             ║${NC}"
  echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
  echo -e "${GREEN}║${NC}  Client : ${CLIENT}"
  echo -e "${GREEN}║${NC}  Tier   : ${TIER}"
  echo -e "${GREEN}║${NC}  Cameras: ${#CAM_LIST[@]}"
  echo -e "${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}  Dashboard : http://${local_ip}:3000"
  echo -e "${GREEN}║${NC}  API       : http://${local_ip}:8080"
  echo -e "${GREEN}║${NC}  Go2RTC    : http://${local_ip}:1984"
  echo -e "${GREEN}║${NC}  Admin     : ${ADMIN_EMAIL}"
  echo -e "${GREEN}║${NC}"
  echo -e "${GREEN}║${NC}  Config dir: ${OPT_DIR}"
  echo -e "${GREEN}║${NC}  Logs      : docker compose -f ${COMPOSE_FILE} logs -f"
  echo -e "${GREEN}║${NC}  Backup    : ${BACKUP_DIR}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  if [[ -n "${CF_TOKEN}" ]]; then
    log "Cloudflare tunnel is configured — public access will be available via your tunnel domain."
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  log "=== Oversight Hub Edge Installer ==="
  log "Tier: ${TIER} | Client: ${CLIENT} | Cameras: ${#CAM_LIST[@]}"

  detect_os
  install_docker
  install_compose_plugin
  setup_directories
  copy_compose
  generate_env
  generate_go2rtc
  generate_edge_config
  pull_images
  start_services
  health_check || true
  install_systemd
  print_success
}

main "$@"
