---
phase: 09-ai-intelligence
plan: 01
subsystem: infra
tags: [prisma, docker, qdrant, ai, packages, postgresql]

# Dependency graph
requires: []
provides:
  - AgentTrace model in Prisma schema for agent telemetry storage
  - AI configuration keys (QWEN_VL_MODEL, vLLM, YOLO, Whisper) validated at startup
  - Qdrant vector database docker service on ports 6333/6334
  - npm packages (ollama, @modelcontextprotocol/sdk, @qdrant/js-client-rest) for API
  - Python packages (ultralytics, supervision, faster-whisper, tensorflow-hub, opencv-python, av, qdrant-client) for AI preprocessor
affects:
  - 09-02 (MCP server)
  - 09-03 (pgvector schema)
  - 09-04 (video understanding pipeline)
  - 09-05 (anomaly detection)
  - 09-06 (conversational assistant)
  - 09-07 (incident orchestration)
  - 09-08 (dashboard)

# Tech tracking
tech-stack:
  added:
    - ollama (npm)
    - @modelcontextprotocol/sdk (npm)
    - @qdrant/js-client-rest (npm)
    - ultralytics (pip)
    - supervision (pip)
    - faster-whisper (pip)
    - tensorflow-hub (pip)
    - opencv-python (pip)
    - av (pip)
    - qdrant-client (pip)
    - qdrant/qdrant (docker image)
  patterns:
    - Prisma db push for schema sync (not migrate dev — dev/review phase)
    - Docker service pattern: image, container_name, restart, expose, volumes, healthcheck

key-files:
  created: []
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/src/config/configuration.ts
    - apps/api/src/config/validation.ts
    - .env.example
    - apps/api/package.json
    - pnpm-lock.yaml
    - services/ai-preprocessor/requirements.txt
    - docker-compose.yml
    - docker-compose.prod.yml

key-decisions:
  - "Used prisma db push (not migrate dev) — appropriate for development/review phase; formal migration deferred"
  - "AgentTrace model uses @db.Uuid and @db.Timestamptz() PostgreSQL-native types for consistency with existing schema"
  - "Qdrant exposed only on Docker internal networks — no host port mapping per threat model T-09-01 (spoofing) and T-09-02 (information disclosure)"

requirements-completed:
  - FTR-08
  - FTR-09
  - FTR-10
  - FTR-11

# Metrics
duration: 4min
completed: 2026-07-16
---

# Phase 09 Plan 01: Infrastructure Setup Summary

**Prisma AgentTrace model with PostgreSQL-native types, Joi-validated AI config keys, Qdrant Docker service, and 10 new AI/ML packages across npm and pip**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-16T07:12:24Z
- **Completed:** 2026-07-16T07:16:29Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- AgentTrace model added to Prisma schema with 11 fields and 2 indexes — database synced via `prisma db push`
- 6 new AI configuration keys (qwenVlModel, qwenEmbeddingModel, llamaModel, vllmUrl, yoloModel, whisperModel) validated by Joi on startup
- Qdrant vector database service added to both dev and prod Docker Compose files with health checks
- 3 npm packages and 7 pip packages installed/declared for AI intelligence capabilities

## Task Commits

Each task was committed atomically:

1. **Task 1: Add AgentTrace model + config keys + env vars** — `a8f2719` (feat)
2. **Task 2: Install npm + pip packages and add Qdrant Docker service** — `565d7ba` (feat)
3. **Task 3: Run Prisma DB Push to create agent_traces table** — no commit (database operation — db push succeeded, Prisma client regenerated with AgentTrace type: 372 references in index.d.ts)

## Files Modified

- `apps/api/prisma/schema.prisma` — Added AgentTrace model with 11 fields (id, time, organizationId, userId, agentName, toolName, input, output, durationMs, success, errorMessage) and 2 indexes
- `apps/api/src/config/configuration.ts` — Added 3 keys to `ai:` block (qwenVlModel, qwenEmbeddingModel, llamaModel) and 3 top-level keys (vllmUrl, yoloModel, whisperModel)
- `apps/api/src/config/validation.ts` — Added 6 Joi validations with defaults for all new AI config keys
- `.env.example` — Added vLLM server section and AI models section with 6 documented environment variables
- `apps/api/package.json` — Added dependencies: ollama, @modelcontextprotocol/sdk, @qdrant/js-client-rest
- `pnpm-lock.yaml` — Lock file updated with 190 new packages
- `services/ai-preprocessor/requirements.txt` — Added 7 dependencies: ultralytics, supervision, faster-whisper, tensorflow-hub, opencv-python, av, qdrant-client
- `docker-compose.yml` — Added qdrant service (image: qdrant/qdrant:latest, expose: 6333/6334, healthcheck, qdrant_data volume)
- `docker-compose.prod.yml` — Added qdrant service with backend+frontend network membership, added qdrant_data volume

## Decisions Made

- Used `prisma db push` instead of `prisma migrate dev` — appropriate for the development/review phase; formal migration can be generated later if needed
- AgentTrace model uses `@db.Uuid` and `@db.Timestamptz()` PostgreSQL-native types for consistency with the existing schema
- Qdrant exposed only on Docker internal networks (default+coolify in dev, backend+frontend in prod) — no host port mapping per threat model T-09-01 and T-09-02

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript compilation errors in unrelated modules (camera.service.ts, license.service.ts) from prior phases — not caused by this plan and out of scope per deviation rules
- Docker Compose `config` validation produces expected errors about missing environment variables (REDIS_HOST, POSTGRES_PASSWORD) — these are pre-existing and not introduced by this plan's changes

## User Setup Required

None — no external service configuration required. All configuration keys have documented defaults.

## Next Phase Readiness

- Phase 9 infrastructure prerequisites complete: AgentTrace model in DB, Qdrant service defined, AI packages installed
- Ready for Plan 09-02 (MCP Server implementation — AgentTrace model and ollama SDK now available)
- All 4 requirements (FTR-08, FTR-09, FTR-10, FTR-11) satisfied

---
*Phase: 09-ai-intelligence*
*Completed: 2026-07-16*
