---
phase: 07-public-presence
plan: 02
subsystem: infra
tags: [docker, caddy, docker-compose, marketing, devops]

# Dependency graph
requires:
  - phase: 07-public-presence
    plan: 01
    provides: Marketing env vars, .env.example placeholders
provides:
  - Multi-stage Docker build for marketing Next.js app (node:20-alpine, pnpm, port 3200)
  - Marketing service definition in docker-compose.yml
  - Host-based Caddy routing for oversighthub.com → marketing, app.oversighthub.com → api+dashboard
affects: [07-03 (marketing site scaffolding + content)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Multi-stage Docker build (deps → builder → runner) for marketing Next.js app
    - Host-based Caddy routing with explicit site blocks (oversighthub.com vs app.oversighthub.com)
    - docker-compose marketing service following dashboard service pattern

key-files:
  created:
    - docker/website.Dockerfile
  modified:
    - docker-compose.yml
    - Caddyfile

key-decisions:
  - "Removed :80 fallback block from Caddyfile — production uses explicit hostnames per Pitfall 4 in RESEARCH.md"
  - "Marketing service has no extra_hosts or networks — uses default compose network to reach API"

requirements-completed: [WEB-08]

# Metrics
duration: 3min
completed: 2026-07-16
---

# Phase 07 Plan 02: Marketing Site Docker Infrastructure Summary

**Multi-stage Docker build for marketing site, docker-compose service definition, and host-based Caddy routing for oversighthub.com**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-16T00:41:46Z
- **Completed:** 2026-07-16T00:44:46Z
- **Tasks:** 3
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- **docker/website.Dockerfile** — Multi-stage build (deps/builder/runner) for marketing Next.js app using node:20-alpine, corepack/pnpm, standalone output on port 3200
- **docker-compose.yml marketing service** — Build config from website.Dockerfile, port 3200, healthcheck, env vars for API URL, Turnstile key, and app name
- **Caddyfile host-based routing** — `oversighthub.com` routes all traffic to `marketing:3200`; `app.oversighthub.com` routes API/WS to API service and everything else to dashboard

## Task Commits

Each task was committed atomically:

1. **Task 1: Create marketing site Dockerfile** — `0b3c1f5` (feat)
2. **Task 2: Add marketing service to docker-compose.yml** — `4f9d20a` (feat)
3. **Task 3: Update Caddyfile for host-based routing** — `6fa4956` (feat)

## Files Created/Modified

- `docker/website.Dockerfile` — Multi-stage Docker build: deps (pnpm install), builder (tsc + pnpm build), runner (standalone output, port 3200)
- `docker-compose.yml` — Added `marketing:` service after dashboard block with build config, env vars, healthcheck
- `Caddyfile` — Rewritten from `:80` catch-all to host-based blocks: `oversighthub.com` → marketing:3200, `app.oversighthub.com` → api+dashboard

## Decisions Made

- **Removed `:80` catch-all block** — Production uses explicit hostnames per RESEARCH.md Pitfall 4 (DNS rebinding protection). The old `:80` fallback would route unexpected traffic incorrectly.
- **Marketing service on default compose network** — No `extra_hosts` or custom networks needed; the default compose network provides access to the API service for contact form submission.
- **Turnstile test key as default** — Uses Cloudflare's testing site key (`1x00000000000000000000AA`) as default so the marketing site works out of the box without requiring Turnstile configuration.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — all tasks completed without issues.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Docker infrastructure for marketing site is complete
- Ready for Plan 07-03 (marketing site scaffolding and content)
- Image can be built with: `docker build -f docker/website.Dockerfile -t oversight-marketing .`
- Service can be deployed with: `docker compose up -d marketing`

---

*Phase: 07-public-presence*
*Completed: 2026-07-16*
