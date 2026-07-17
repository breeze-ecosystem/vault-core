#!/bin/sh
# Kiosk container entrypoint
# Starts CUPS daemon for badge printing, then nginx for SPA serving

set -e

# ── Start CUPS daemon in background ──
cupsd -f &

# Wait for CUPS to be ready
sleep 2

# ── Configure network printer ──
if [ -n "$PRINTER_IP" ]; then
  lpadmin -p kiosk-printer \
    -E \
    -v "socket://${PRINTER_IP}:9100" \
    -m raw \
    -o printer-is-shared=false
  cupsaccept kiosk-printer
  cupsenable kiosk-printer
fi

# ── Start nginx in foreground ──
nginx -g "daemon off;"
