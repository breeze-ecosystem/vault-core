---
phase: 09-ai-intelligence
plan: 06
subsystem: ai-integration
tags: [nestjs, qdrant, patterns, timescaledb, dashboard, navigation, sse, agent-chat]

# Dependency graph
requires:
  - phase: 09-ai-intelligence
    plan: 01
    provides: AgentTrace model, shared schemas, packages
  - phase: 09-ai-intelligence
    plan: 04
    provides: Core agent system (orchestrator, LLM provider, skills)
  - phase: 09-ai-intelligence
    plan: 05
    provides: Memory, guards, MCP servers, tracing
provides:
  - 8 SQL patterns (5 existing + 3 new) with Redis dedup and EventEmitter2
  - QdrantService with 3 collections (events/knowledge/incidents) at 4096-dim Cosine
  - Parallel embedding pipeline (pgvector + Qdrant) with fail-transparent Qdrant writes
  - Legacy /api/ai/* endpoints preserved with deprecation warnings (D-27)
  - POST /api/ai/agent-chat proxy to OrchestratorService
  - GET /api/risk/scores/:zoneId/explain via RiskAnalysisAgent
  - GET /api/patterns/:patternId/analyze via PatternDetectionAgent
  - AiAgentModule registered in AppModule with @Global() decorator
  - Dashboard API client with 5 agent functions + SSE streaming helper
  - Navigation config with Intelligence group (Command Center + Patterns)
affects: [09-07 (Dashboard UI for agent/patterns), 09-08 (Mobile agent workflows)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "QdrantService OnModuleInit pattern for collection initialization"
    - "@Global() module pattern for cross-module agent injection"
    - "String token providers (useExisting) for optional @Inject() across modules"
    - "fetchWithAuth + ReadableStream SSE pattern for authenticated streaming"

key-files:
  created:
    - apps/api/src/modules/ai-agent/qdrant/qdrant.service.ts
  modified:
    - apps/api/src/modules/patterns/patterns.service.ts
    - apps/api/src/modules/ai/ai.processor.ts
    - apps/api/src/modules/ai/ai.controller.ts
    - apps/api/src/modules/risk/risk.controller.ts
    - apps/api/src/modules/patterns/patterns.controller.ts
    - apps/api/src/modules/ai-agent/ai-agent.module.ts
    - apps/api/src/app.module.ts
    - apps/dashboard/lib/api.ts
    - apps/dashboard/lib/nav-config.ts

key-decisions:
  - "Used @Global() on AiAgentModule to enable cross-module agent injection without circular deps"
  - "String token providers (QdrantService, OrchestratorService, RiskAnalysisAgent, PatternDetectionAgent, LlmProviderService) for @Optional() injection pattern"
  - "Pattern queries adapted to match actual schema: Schedule.entries is JSON (used heuristic 22h-06h), Door has no lat/lng (used door_id comparison instead)"
  - "Used fetchWithAuth + ReadableStream for SSE (not EventSource) to support Bearer token auth"
  - "Qdrant writes wrapped in try/catch — pgvector writes are never blocked by Qdrant failure (D-12)"

patterns-established:
  - "PatternRule.params: any[] — variadic parameter binding via spread operator for diverse query shapes"
  - "Device type detection extended from ternary to include zone and credential patterns"

requirements-completed:
  - FTR-08
  - FTR-09
  - FTR-10
  - FTR-11

# Metrics
duration: 14min
completed: 2026-07-16
---

# Phase 09 Plan 06: Integration Layer Summary

**8 SQL patterns with Redis dedup, QdrantService with 4096-dim Cosine collections, parallel pgvector+Qdrant embedding pipeline, legacy endpoint proxy with deprecation, risk/pattern API endpoints, AppModule registration, dashboard API client with SSE streaming, and Intelligence navigation group**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-16T07:56:28Z
- **Completed:** 2026-07-16T08:10:34Z
- **Tasks:** 3
- **Files modified:** 10 (1 created, 9 modified)

## Accomplishments

- **3 new SQL patterns** — false-positive (Avertissement), schedule-mismatch (Avertissement), impossible-travel (Critique) added to PatternsService, bringing total to 8 patterns
- **QdrantService** — 3 collections (events/knowledge/incidents) at 4096-dim Cosine distance, with hybrid search filtering by organizationId for tenant isolation
- **Parallel embedding pipeline** — ai.processor.ts now writes embeddings to both pgvector and Qdrant; Qdrant writes are fail-transparent so pgvector is never blocked
- **Legacy proxy + deprecation** — Existing /api/ai/query, /api/ai/assistant, /api/ai/summarize preserved with deprecation warnings; new POST /api/ai/agent-chat proxies to OrchestratorService
- **Risk and pattern analysis endpoints** — GET /api/risk/scores/:zoneId/explain via RiskAnalysisAgent; GET /api/patterns/:patternId/analyze via PatternDetectionAgent
- **AppModule wiring** — AiAgentModule registered after AiModule with @Global() decorator for cross-module agent injection
- **Dashboard API client** — agentChat(), createAgentChatStream() (SSE), explainRisk(), analyzePattern(), getAgentStatus() following existing fetchWithAuth pattern
- **Navigation config** — Intelligence group with Centre de commande (/command-center, Zap icon) and Motifs (/patterns, Repeat icon, SUPERVISOR+); Assistant IA removed from Outils

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 3 new SQL patterns to PatternsService** — `448d3f3` (feat)
2. **Task 2: Create QdrantService, extend embedding pipeline, wire AppModule, add legacy proxy, add risk/pattern API endpoints** — `9c1dbb1` (feat)
3. **Task 3: Extend dashboard API client and update navigation config** — `9885376` (feat)

**Plan metadata:** (appended in final commit)

## Files Created/Modified

- `apps/api/src/modules/patterns/patterns.service.ts` — Added 3 new patterns; changed params type to any[]; updated detectPatterns() for variadic params and extended device types
- `apps/api/src/modules/ai-agent/qdrant/qdrant.service.ts` — New QdrantService with initializeCollections(), upsertEvents(), searchEvents(), upsertKnowledge(), searchKnowledge(), healthCheck()
- `apps/api/src/modules/ai/ai.processor.ts` — Added optional QdrantService and LlmProviderService injection; parallel Qdrant write in handleEmbedEvent() with fail-transparent try/catch
- `apps/api/src/modules/ai/ai.controller.ts` — Added deprecation warnings to legacy endpoints; new POST /api/ai/agent-chat proxy endpoint with OrchestratorService integration
- `apps/api/src/modules/risk/risk.controller.ts` — Added GET /api/risk/scores/:zoneId/explain endpoint with RiskAnalysisAgent delegation
- `apps/api/src/modules/patterns/patterns.controller.ts` — Added GET /api/patterns/:patternId/analyze endpoint with PatternDetectionAgent delegation
- `apps/api/src/modules/ai-agent/ai-agent.module.ts` — Added QdrantService to providers/exports; added string token aliases for cross-module injection; added @Global() decorator
- `apps/api/src/app.module.ts` — Registered AiAgentModule import (after AiModule)
- `apps/dashboard/lib/api.ts` — Added AgentChatResponse, RiskExplanation, AgentStatusResponse types; added agentChat(), createAgentChatStream(), explainRisk(), analyzePattern(), getAgentStatus()
- `apps/dashboard/lib/nav-config.ts` — Added Intelligence nav group (Centre de commande + Motifs); removed Assistant IA from Outils; added Zap icon import

## Decisions Made

- **@Global() on AiAgentModule:** Added to enable RiskController/PatternsController (in sibling modules) to optionally inject agents via string tokens without creating circular dependencies (AiAgentModule already imports RiskModule)
- **String token providers:** Added `{ provide: "RiskAnalysisAgent", useExisting: RiskAnalysisAgent }` style providers so controllers use `@Optional() @Inject("RiskAnalysisAgent")` for loose coupling
- **Query adaptation for schema reality:** Schedule uses JSON `entries` field (not start_hour/end_hour columns) — used heuristic 22h-06h off-hours detection. Door model has no latitude/longitude — simplified impossible-travel to door_id comparison within 60s. Both adaptations documented in pattern descriptions.
- **SSE via fetchWithAuth + ReadableStream:** Used fetchWithAuth (supports Bearer token + 401 auto-refresh) with ReadableStream SSE parsing instead of EventSource (which doesn't support custom auth headers)
- **Pattern params design:** Changed PatternRule.params from `[string, number]` tuple to `any[]` to support variadic parameter counts across patterns — spread operator in detectPatterns() handles all patterns uniformly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug / Rule 2 - Missing Critical] Adapted SQL queries to match actual Prisma schema**

- **Found during:** Task 1 (Adding new SQL patterns)
- **Issue:** Plan specified columns that don't exist in the Prisma schema: Schedule has `entries: Json` (not `start_hour`/`end_hour` columns); Door has no `latitude`/`longitude` columns; access_events may not have `event_type = 'false_positive'`
- **Fix:** Adapted schedule-mismatch query to detect events outside 22h-06h window (heuristic fallback for JSON entries). Adapted impossible-travel query to use `door_id != door_id` comparison instead of coordinate distance. Used `alerts` table with severity='LOW' for false-positive detection (cameraId is on Alert model).
- **Files modified:** `apps/api/src/modules/patterns/patterns.service.ts`
- **Verification:** All 3 pattern queries validate via grep, no TypeScript errors in patterns module
- **Committed in:** `448d3f3` (Task 1 commit)

**2. [Rule 3 - Blocking] Shared package agentChatSchema not in compiled output**

- **Found during:** Task 2 (ai.controller.ts type check)
- **Issue:** `@repo/shared` compiled dist didn't include `agentChatSchema` and `AgentChatInput` exports — the shared package needed rebuilding after prior plan changes
- **Fix:** Ran `pnpm --filter @repo/shared build` to regenerate dist/index.d.ts with agent schema exports
- **Files modified:** packages/shared/dist/ (build artifact)
- **Verification:** TypeScript compilation passes for ai.controller.ts after rebuild
- **Committed in:** (no separate commit — build artifact not tracked)

**3. [Rule 2 - Missing Critical] Added @Global() decorator to AiAgentModule**

- **Found during:** Task 2 (Wiring controllers to agents)
- **Issue:** RiskController and PatternsController use `@Optional() @Inject("RiskAnalysisAgent")` pattern but agents are registered in AiAgentModule, which isn't imported by RiskModule/PatternsModule. Without @Global(), the injection tokens would never resolve.
- **Fix:** Added `@Global()` decorator to AiAgentModule so its providers (including string-token aliases) are available application-wide without explicit imports.
- **Files modified:** `apps/api/src/modules/ai-agent/ai-agent.module.ts`
- **Verification:** No TypeScript errors in risk.controller.ts or patterns.controller.ts
- **Committed in:** `9c1dbb1` (Task 2 commit)

**4. [Rule 2 - Missing Critical] Added string token providers for cross-module injection**

- **Found during:** Task 2 (risk.controller.ts and patterns.controller.ts integration)
- **Issue:** Controllers use `@Inject("RiskAnalysisAgent")` (string token) but modules only register `RiskAnalysisAgent` (class token). NestJS DI wouldn't match string tokens to class providers.
- **Fix:** Added `{ provide: "RiskAnalysisAgent", useExisting: RiskAnalysisAgent }` style providers in AiAgentModule for all 5 cross-module dependencies (QdrantService, LlmProviderService, OrchestratorService, RiskAnalysisAgent, PatternDetectionAgent).
- **Files modified:** `apps/api/src/modules/ai-agent/ai-agent.module.ts`
- **Verification:** Controllers compile without DI errors; @Optional() gracefully handles agent unavailability
- **Committed in:** `9c1dbb1` (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (1 bug, 2 missing critical, 1 blocking)
**Impact on plan:** Schema adaptations necessary for correct runtime behavior; @Global() + string tokens essential for cross-module DI to function. No scope creep.

## Issues Encountered

- **Shared package stale build:** `agentChatSchema` not available in compiled output — resolved by rebuilding `@repo/shared`
- **Pre-existing TypeScript errors:** camera.service.ts (organizationId), license.service.ts (organizationId), and several dashboard pages (fetchSites/Site removed) continue to have errors from the ongoing siteId → organizationId migration — all out of scope for this plan

## Known Stubs

- **Pattern queries as heuristic approximations:** schedule-mismatch uses 22h-06h window instead of actual schedule JSON parsing; impossible-travel uses door_id comparison instead of coordinate distance. These are adequate for pattern detection but could be enhanced with actual schedule JSON parsing and door coordinate data.
- **SSE streaming in createAgentChatStream:** Uses ReadableStream parsing with simple line-based SSE decoder; event types hardcoded to match OrchestratorService's SSEEvent interface. Future SSE protocol changes would require updates.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: cross-module-injection | apps/api/src/modules/ai-agent/ai-agent.module.ts | @Global() makes all agent providers available app-wide — any module can inject agents; audit that only authorized controllers use them |

## User Setup Required

None — no external service configuration required. Qdrant must be running at `QDRANT_URL` for the vector pipeline to function, but the service is already in the Docker Compose configuration.

## Next Phase Readiness

- Integration layer complete: patterns, Qdrant pipeline, legacy proxy, API endpoints, AppModule wiring, dashboard API client, navigation config
- Ready for **Plan 09-07** (Dashboard UI — agent chat interface, patterns dashboard, risk explanation views)
- Note: Qdrant collections are created on module init — Qdrant service must be running for collection creation to succeed

---

## Self-Check: PASSED

- [x] All 3 tasks executed and committed
- [x] `apps/api/src/modules/patterns/patterns.service.ts` — 8 pattern IDs (3 new: false-positive, schedule-mismatch, impossible-travel)
- [x] `apps/api/src/modules/ai-agent/qdrant/qdrant.service.ts` — exists with QdrantService export (3 matches)
- [x] `apps/api/src/app.module.ts` — AiAgentModule imported (2 matches: import + array entry)
- [x] `apps/api/src/modules/ai/ai.controller.ts` — deprecation warnings present (3 DEPRECATED matches)
- [x] `apps/dashboard/lib/nav-config.ts` — command-center route present (1 match)
- [x] `apps/dashboard/lib/api.ts` — agentChat function present (1 match)
- [x] `npm run check-types` from apps/api: no errors in modified files
- [x] `npm run check-types` from apps/dashboard: no errors in modified files
- [x] All 3 commits present in git log
- [x] SUMMARY.md created with substantive content

---

*Phase: 09-ai-intelligence*
*Completed: 2026-07-16*
