#!/bin/bash
# ─── TimescaleDB Migration Runner ───
# NOTE: These migrations must run BEFORE Prisma migrations in production deployments.
# They create TimescaleDB hypertables, compression policies, and retention policies
# that Prisma cannot manage (D-22).
#
# Usage:
#   DATABASE_URL=postgresql://user:pass@host:5432/oversight bash run.sh
#
# Or if DATABASE_URL is already set in the environment:
#   bash run.sh

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

MIGRATIONS=(
  "001_access_events.sql"
  "002_door_state_log.sql"
  "003_audit_log.sql"
  "004_continuous_aggregates.sql"
  "005_retention_policies.sql"
)

echo "Running TimescaleDB migrations against: ${DATABASE_URL%%@*}@***"
for sql_file in "${MIGRATIONS[@]}"; do
  echo "  → ${sql_file}"
  psql "${DATABASE_URL}" -f "${SCRIPT_DIR}/up/${sql_file}" -v ON_ERROR_STOP=1
done

echo "TimescaleDB migrations complete."
