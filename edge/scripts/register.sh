#!/usr/bin/env bash
# =============================================================================
# Oversight Hub — Register Client with Supervision Platform
# Usage: ./register.sh --client <name> --tier <tier> --supervision-url <url>
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------
readonly OPT_DIR="/opt/oversight"
readonly ENV_FILE="${OPT_DIR}/.env"
readonly EDGE_CONF="${OPT_DIR}/edge.config.json"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }
die()  { err "$@"; exit 1; }

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
CLIENT=""
TIER=""
SUPERVISION_URL=""
EDGE_TOKEN=""

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --client <name>           Client / site name (required)
  --tier <argent|or|platine> License tier (required)
  --supervision-url <url>   Supervision platform base URL (required)
  --token <tok>             Existing edge token (optional, used for re-registration)
  -h, --help                Show this help

Example:
  $0 --client warehouse42 --tier platine --supervision-url https://supervision.example.com

EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --client)          CLIENT="$2";          shift 2 ;;
    --tier)            TIER="$2";            shift 2 ;;
    --supervision-url) SUPERVISION_URL="$2"; shift 2 ;;
    --token)           EDGE_TOKEN="$2";      shift 2 ;;
    -h|--help)         usage ;;
    *) die "Unknown option: $1" ;;
  esac
done

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
[[ -z "${CLIENT}" ]]         && die "--client is required."
[[ -z "${TIER}" ]]           && die "--tier is required."
[[ "${TIER}" =~ ^(argent|or|platine)$ ]] || die "Invalid tier '${TIER}'. Must be argent, or, or platine."
[[ -z "${SUPERVISION_URL}" ]] && die "--supervision-url is required."

# Remove trailing slash
SUPERVISION_URL="${SUPERVISION_URL%/}"

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
require_cmd() {
  command -v "$1" &>/dev/null || die "Required command '$1' not found."
}

require_cmd curl
require_cmd jq 2>/dev/null || { log "Installing jq ..."; apt-get update -qq && apt-get install -y -qq jq; }

# Ensure .env exists
if [[ ! -f "${ENV_FILE}" ]]; then
  warn "No .env file found at ${ENV_FILE} — it will be created."
  mkdir -p "${OPT_DIR}"
  touch "${ENV_FILE}"
fi

# ---------------------------------------------------------------------------
# Gather system info
# ---------------------------------------------------------------------------
gather_system_info() {
  local hostname_str os_name os_version kernel arch

  hostname_str="$(hostname -f 2>/dev/null || hostname)"
  os_name="$(. /etc/os-release 2>/dev/null && echo "${PRETTY_NAME:-${ID:-unknown}}" || echo "unknown")"
  kernel="$(uname -r)"
  arch="$(uname -m)"

  # Count cameras from go2rtc config if available
  local camera_count=0
  if [[ -f "${OPT_DIR}/go2rtc.yaml" ]]; then
    camera_count="$(grep -cE '^\s+cam[0-9]+:' "${OPT_DIR}/go2rtc.yaml" 2>/dev/null || echo 0)"
  fi

  # Get public IP
  local public_ip="unknown"
  public_ip="$(curl -sS --max-time 5 https://ifconfig.me 2>/dev/null || echo "unknown")"

  echo "${hostname_str}|${os_name}|${kernel}|${arch}|${camera_count}|${public_ip}"
}

# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------
register() {
  log "Registering client '${CLIENT}' (tier: ${TIER}) with ${SUPERVISION_URL} ..."

  local sys_info
  sys_info="$(gather_system_info)"

  IFS='|' read -r hostname_str os_name kernel arch camera_count public_ip <<< "${sys_info}"

  # Build JSON payload
  local payload
  payload="$(cat <<EOJSON
{
  "client": "${CLIENT}",
  "tier": "${TIER}",
  "hostname": "${hostname_str}",
  "os": "${os_name}",
  "kernel": "${kernel}",
  "arch": "${arch}",
  "cameraCount": ${camera_count},
  "publicIp": "${public_ip}",
  "registeredAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOJSON
)"

  local api_url="${SUPERVISION_URL}/api/v1/edges/register"

  # Build auth header
  local auth_header=""
  if [[ -n "${EDGE_TOKEN}" ]]; then
    auth_header="Authorization: Bearer ${EDGE_TOKEN}"
  fi

  # Attempt registration
  local http_code response
  if [[ -n "${auth_header}" ]]; then
    response="$(curl -sS -w "\n%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -H "${auth_header}" \
      -d "${payload}" \
      --max-time 30 \
      "${api_url}" 2>&1)" || die "Failed to connect to supervision platform at ${api_url}."
  else
    response="$(curl -sS -w "\n%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -d "${payload}" \
      --max-time 30 \
      "${api_url}" 2>&1)" || die "Failed to connect to supervision platform at ${api_url}."
  fi

  http_code="$(echo "${response}" | tail -1)"
  local body
  body="$(echo "${response}" | sed '$d')"

  if [[ "${http_code}" -lt 200 || "${http_code}" -ge 300 ]]; then
    die "Registration failed (HTTP ${http_code}): ${body}"
  fi

  log "Registration response: ${body}"

  # Extract SUPERVISION_TOKEN from response
  local supervision_token
  supervision_token="$(echo "${body}" | jq -r '.token // .supervision_token // .edge_token // empty' 2>/dev/null || true)"

  if [[ -z "${supervision_token}" ]]; then
    die "No token found in registration response. Raw response: ${body}"
  fi

  log "Received supervision token: ${supervision_token:0:12}..."

  # ---------------------------------------------------------------------------
  # Save to .env
  # ---------------------------------------------------------------------------
  # Remove old values if present
  if grep -q "^SUPERVISION_URL=" "${ENV_FILE}" 2>/dev/null; then
    sed -i "s|^SUPERVISION_URL=.*|SUPERVISION_URL=${SUPERVISION_URL}|" "${ENV_FILE}"
  else
    echo "SUPERVISION_URL=${SUPERVISION_URL}" >> "${ENV_FILE}"
  fi

  if grep -q "^SUPERVISION_TOKEN=" "${ENV_FILE}" 2>/dev/null; then
    sed -i "s|^SUPERVISION_TOKEN=.*|SUPERVISION_TOKEN=${supervision_token}|" "${ENV_FILE}"
  else
    echo "SUPERVISION_TOKEN=${supervision_token}" >> "${ENV_FILE}"
  fi

  log "Saved SUPERVISION_URL and SUPERVISION_TOKEN to ${ENV_FILE}"

  # ---------------------------------------------------------------------------
  # Update edge.config.json if present
  # ---------------------------------------------------------------------------
  if [[ -f "${EDGE_CONF}" ]] && command -v jq &>/dev/null; then
    local tmp
    tmp="$(mktemp)"
    jq --arg url "${SUPERVISION_URL}" \
       --arg tok "${supervision_token}" \
       '.supervision.url = $url | .supervision.token = $tok' \
       "${EDGE_CONF}" > "${tmp}" && mv "${tmp}" "${EDGE_CONF}"
    log "Updated ${EDGE_CONF}"
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  log "=== Oversight Hub Edge Registration ==="
  register
  log "Registration complete! This edge server is now linked to ${SUPERVISION_URL}."
}

main "$@"
