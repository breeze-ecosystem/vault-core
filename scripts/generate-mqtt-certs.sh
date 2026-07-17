#!/bin/sh
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║          Generate Self-Signed CA + Server Certificates for Mosquitto        ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
#
# Usage:  /scripts/generate-mqtt-certs.sh [output-dir]
#
#   output-dir  Directory where certs will be written (default: /certs)
#
# Generates:
#   - ca.key          CA private key        (600 permissions)
#   - ca.crt          CA self-signed cert   (644 permissions) — 10 year validity
#   - server.key      Server private key    (600 permissions)
#   - server.crt      Server cert signed by CA (644 permissions)
#
# Idempotent: will NOT overwrite existing files (preserves certs on restart).
# Alpine-compatible: uses apk to ensure openssl is available.
#
# On first run, all four files are created. On subsequent runs (e.g., container
# restart), existing files are preserved so the broker's TLS config stays valid.

set -e

# ─── Configuration ──────────────────────────────────────────────────────────────

CERT_DIR="${1:-/certs}"
CA_KEY="${CERT_DIR}/ca.key"
CA_CERT="${CERT_DIR}/ca.crt"
SERVER_KEY="${CERT_DIR}/server.key"
SERVER_CSR="${CERT_DIR}/server.csr"
SERVER_CERT="${CERT_DIR}/server.crt"

# 10-year validity (3650 days) — per D-07 no public CA needed
DAYS_VALID=3650

# ─── Ensure openssl is available ────────────────────────────────────────────────

if ! command -v openssl >/dev/null 2>&1; then
    echo "INFO: openssl not found, installing..."
    apk add --no-cache openssl
fi

# ─── Create output directory ────────────────────────────────────────────────────

mkdir -p "${CERT_DIR}"

# ─── Generate CA (idempotent) ──────────────────────────────────────────────────

if [ ! -f "${CA_KEY}" ] && [ ! -f "${CA_CERT}" ]; then
    echo "INFO: Generating CA key and certificate..."

    openssl genrsa -out "${CA_KEY}" 4096
    chmod 600 "${CA_KEY}"

    openssl req \
        -x509 \
        -new \
        -nodes \
        -key "${CA_KEY}" \
        -sha256 \
        -days "${DAYS_VALID}" \
        -out "${CA_CERT}" \
        -subj "/CN=Oversight Hub MQTT CA/O=OVERSIGHT AI/C=FR"

    chmod 644 "${CA_CERT}"
    echo "OK: CA certificate generated at ${CA_CERT}"
elif [ -f "${CA_KEY}" ] && [ -f "${CA_CERT}" ]; then
    echo "INFO: CA key and certificate already exist — skipping"
else
    echo "ERROR: Inconsistent CA state — key or cert missing"
    exit 1
fi

# ─── Generate Server Certificate (idempotent) ──────────────────────────────────

if [ ! -f "${SERVER_KEY}" ] && [ ! -f "${SERVER_CERT}" ]; then
    echo "INFO: Generating server key, CSR, and certificate..."

    openssl genrsa -out "${SERVER_KEY}" 2048
    chmod 600 "${SERVER_KEY}"

    openssl req \
        -new \
        -key "${SERVER_KEY}" \
        -out "${SERVER_CSR}" \
        -subj "/CN=mosquitto/O=OVERSIGHT AI/C=FR"

    openssl x509 \
        -req \
        -in "${SERVER_CSR}" \
        -CA "${CA_CERT}" \
        -CAkey "${CA_KEY}" \
        -CAcreateserial \
        -out "${SERVER_CERT}" \
        -days "${DAYS_VALID}" \
        -sha256

    chmod 644 "${SERVER_CERT}"

    # Remove CSR — no longer needed after signing
    rm -f "${SERVER_CSR}"

    echo "OK: Server certificate generated at ${SERVER_CERT}"
elif [ -f "${SERVER_KEY}" ] && [ -f "${SERVER_CERT}" ]; then
    echo "INFO: Server key and certificate already exist — skipping"
else
    echo "ERROR: Inconsistent server cert state — key or cert missing"
    exit 1
fi

echo "OK: All certificates ready in ${CERT_DIR}"
ls -la "${CERT_DIR}"
