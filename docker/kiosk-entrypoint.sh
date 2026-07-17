#!/bin/sh
# Kiosk container entrypoint
# Starts CUPS daemon for badge printing, then nginx for SPA serving

set -e

# ── Start CUPS daemon in background ──
echo "Starting CUPS..."
cupsd -f &
CUPS_PID=$!

# Wait for CUPS to be ready by polling the PID and port
echo "Waiting for CUPS to be ready..."
CUPS_READY=false
for i in $(seq 1 15); do
  if ! kill -0 $CUPS_PID 2>/dev/null; then
    echo "CUPS process exited prematurely"
    break
  fi
  if [ -S /run/cups/cups.sock ] 2>/dev/null; then
    CUPS_READY=true
    echo "CUPS ready after ${i}s"
    break
  fi
  sleep 1
done

# ── Configure network printer (best-effort, non-fatal) ──
if [ -n "$PRINTER_IP" ]; then
  echo "Configuring printer at ${PRINTER_IP}:9100..."
  set +e
  # Retry lpadmin with backoff (CUPS may still be initializing)
  LP_SUCCESS=false
  for attempt in 1 2 3; do
    LP_OUTPUT=$(lpadmin -p kiosk-printer -E -v "socket://${PRINTER_IP}:9100" -m raw -o printer-is-shared=false 2>&1)
    if [ $? -eq 0 ]; then
      LP_SUCCESS=true
      break
    fi
    echo "lpadmin attempt $attempt failed, retrying in 2s..."
    sleep 2
  done
  if [ "$LP_SUCCESS" = "true" ]; then
    cupsaccept kiosk-printer 2>/dev/null
    cupsenable kiosk-printer 2>/dev/null
    echo "Printer 'kiosk-printer' configured successfully"
  else
    echo "Warning: Printer configuration failed after 3 attempts."
    echo "  $LP_OUTPUT"
    echo "  Printing will not work until printer is correctly configured."
    echo "  Re-run: docker exec <container> /usr/sbin/lpadmin ..."
  fi
  set -e
else
  echo "PRINTER_IP not set — skipping printer configuration."
  echo "To enable printing, set PRINTER_IP env var and restart the container."
fi

# ── Start nginx in foreground ──
echo "Starting nginx..."
exec nginx -g "daemon off;"
