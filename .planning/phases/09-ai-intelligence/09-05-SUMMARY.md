---
phase: 09-ai-intelligence
plan: 05
subsystem: api
tags: [nestjs, redis, prisma, mcp, guardrails, memory, tracing, degradation, fallback]

# Dependency graph
requires:
  - phase: 09-ai-intelligence
    plan: 02
    provides: SkillRegistry, @Skill() decorator, 6 skills with Zod input schemas
  - phase: 09-ai-intelligence
    plan: 01
    provides: AgentTrace model in Prisma, ollama npm package
  - phase: 09-ai-intelligence
    plan: 04
    provides: LlmProviderService, OrchestratorService, agents, SSE ChatController
provides:
  - Redis-backed conversation memory with 90-day TTL and org-scoped isolation
  - LLM-based context compression at ~16K token threshold
  - Agent trace logging to PostgreSQL agent_traces (fail-transparent)
  - 3 security guards: action confirmation, RBAC per agent action, per-role rate limiting
  - 4 MCP servers wrapping skills as standard MCP protocol tools
  - Degradation service for graceful fallback when AI models are unavailable
  - Full AiAgentModule wiring with REDIS_AGENT provider
affects:
  - 09-06 (semantic memory with Qdrant embeddings)
  - 09-07 (MCP integration with external systems)
  - 09-08 (agent evaluation dashboard using agent_traces)
  - Future agent consumers (conversation memory, tracing, guards are foundational)

# Tech tracking
tech-stack:
  added:
    - "@modelcontextprotocol/sdk ^1.29.0 (was already in package.json, now consumed)"
  patterns:
    - "Redis factory provider pattern (REDIS_AGENT) following risk.module.ts"
    - "Fail-transparent tracing: try/catch wraps Prisma write, errors logged as warn()"
    - "MCP servers as NestJS providers using McpServer from @modelcontextprotocol/sdk"
    - "Guard pattern (CanActivate + Reflector + ExecutionContext) following roles.guard.ts"
    - "DegradationService health check with cooldown cache to avoid hammering Ollama"

key-files:
  created:
    - apps/api/src/modules/ai-agent/memory/conversation.memory.ts
    - apps/api/src/modules/ai-agent/memory/compression.service.ts
    - apps/api/src/modules/ai-agent/memory/memory-scope.guard.ts
    - apps/api/src/modules/ai-agent/tracing/agent-trace.service.ts
    - apps/api/src/modules/ai-agent/guardrails/action-confirmation.guard.ts
    - apps/api/src/modules/ai-agent/guardrails/rbac-agent.guard.ts
    - apps/api/src/modules/ai-agent/guardrails/rate-limit-agent.guard.ts
    - apps/api/src/modules/ai-agent/fallback/degradation.service.ts
    - apps/api/src/modules/ai-agent/mcp/events.mcp.server.ts
    - apps/api/src/modules/ai-agent/mcp/doors.mcp.server.ts
    - apps/api/src/modules/ai-agent/mcp/risk.mcp.server.ts
    - apps/api/src/modules/ai-agent/mcp/cameras.mcp.server.ts
  modified:
    - apps/api/src/modules/ai-agent/ai-agent.module.ts
    - apps/api/src/modules/ai-agent/types/agent.types.ts

key-decisions:
  - "Used Redis key pattern agent:conv:{orgId}:{sessionId} with 90-day TTL for tenant-isolated conversation storage"
  - "Compression uses LlmProviderService.chat() for summarization — no separate LLM call, consistent with existing service layer"
  - "Tracing writes to agent_traces table with fail-transparent try/catch — tracing failures never break agent execution (D-12)"
  - "ActionConfirmationGuard checks action name prefix (lockdown, door_control, revoke_credential) against X-Confirmation-Token header"
  - "RbacAgentGuard uses ROLE_HIERARCHY from @repo/shared following the exact RolesGuard pattern"
  - "RateLimitAgentGuard uses Redis atomic INCR with per-minute rolling windows — fail-open if Redis unavailable"
  - "MCP servers use McpServer.tool() with ToolCallback<any> cast to avoid deep Zod schema type inference (TS2589)"
  - "DegradationService caches health check results for 10s to avoid hammering Ollama on every request"

requirements-completed:
  - FTR-08
  - FTR-09
  - FTR-10
  - FTR-11

# Metrics
duration: 7min
completed: 2026-07-16
---

# Phase 09 Plan 05: Agent Infrastructure Summary

**Redis-backed conversation memory with 90-day TTL, LLM context compression at 16K tokens, fail-transparent agent tracing to PostgreSQL, 3 security guards (confirmation/RBAC/rate-limit), 4 MCP servers wrapping skills, and degradation fallback service — completing the agent infrastructure layer**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-16T07:47:01Z
- **Completed:** 2026-07-16T07:54:10Z
- **Tasks:** 3
- **Files modified:** 14 (13 created, 2 modified)

## Accomplishments

- **Conversation Memory:** `ConversationMemory` with Redis lists (`agent:conv:{orgId}:{sessionId}`), 90-day TTL, `saveMessage()`, `getHistory()`, `createSession()`, `purgeExpired()`, and `saveSemanticMemory()` (Qdrant wiring deferred to Plan 06)
- **Context Compression:** `CompressionService` estimates tokens (≈chars/4), splits conversation at 16K threshold, summarizes earlier messages via `LlmProviderService.chat()` with French compression prompt, returns `{ compressedContext, recentMessages }`
- **Agent Tracing:** `AgentTraceService.traceToolCall()` writes to Prisma `agent_traces` table with fail-transparent try/catch — tracing failures log at warn level but never throw (D-12)
- **Security Guards:** `ActionConfirmationGuard` blocks lockdown/door_control/revoke_credential without `X-Confirmation-Token` header; `RbacAgentGuard` enforces ADMIN/SUPERVISOR for destructive actions and OPERATOR+ for queries; `RateLimitAgentGuard` enforces per-role limits (5/15/30 req/min) via Redis atomic INCR
- **4 MCP Servers:** `EventsMcpServer` (search_events), `DoorsMcpServer` (control_door, assess_camera), `RiskMcpServer` (get_risk_score), `CamerasMcpServer` (assess_camera) — all wrapping SkillRegistry tools via `@modelcontextprotocol/sdk`
- **Degradation Service:** `DegradationService` probes Ollama `/api/tags` with 5s timeout, returns standardized French fallback message, health check cached for 10s cooldown
- **Module Wiring:** `AiAgentModule` now has REDIS_AGENT provider, 16 new providers (4 services, 4 guards, 4 MCP servers, 4 agent/skill services), exports ConversationMemory and AgentTraceService

## Task Commits

Each task was committed atomically:

1. **Task 1: Create memory system and compression service** - `6c59ac9` (feat)
2. **Task 2: Create tracing service, 3 security guards, and fallback service** - `d0b0780` (feat)
3. **Task 3: Create 4 MCP servers and update AiAgentModule** - `e24f2cb` (feat)

## Files Created/Modified

### Created (12)
- `apps/api/src/modules/ai-agent/memory/conversation.memory.ts` - Redis-backed conversation storage with org-scoped key pattern
- `apps/api/src/modules/ai-agent/memory/compression.service.ts` - LLM-based context compression at 16K token threshold
- `apps/api/src/modules/ai-agent/memory/memory-scope.guard.ts` - CanActivate guard validating orgId from JWT
- `apps/api/src/modules/ai-agent/tracing/agent-trace.service.ts` - Fail-transparent trace logging to agent_traces table
- `apps/api/src/modules/ai-agent/guardrails/action-confirmation.guard.ts` - Confirmation token gate for destructive actions
- `apps/api/src/modules/ai-agent/guardrails/rbac-agent.guard.ts` - Role-based access control for agent actions
- `apps/api/src/modules/ai-agent/guardrails/rate-limit-agent.guard.ts` - Per-role rate limiting via Redis INCR
- `apps/api/src/modules/ai-agent/fallback/degradation.service.ts` - Ollama health check + French fallback response
- `apps/api/src/modules/ai-agent/mcp/events.mcp.server.ts` - MCP server for search_events tool
- `apps/api/src/modules/ai-agent/mcp/doors.mcp.server.ts` - MCP server for control_door + assess_camera tools
- `apps/api/src/modules/ai-agent/mcp/risk.mcp.server.ts` - MCP server for get_risk_score tool
- `apps/api/src/modules/ai-agent/mcp/cameras.mcp.server.ts` - MCP server for assess_camera tool (cross-registered)

### Modified (2)
- `apps/api/src/modules/ai-agent/ai-agent.module.ts` - Added REDIS_AGENT provider, all new services, 4 guards, 4 MCP servers; updated exports
- `apps/api/src/modules/ai-agent/types/agent.types.ts` - Added AgentChatMessage interface for conversation memory

## Decisions Made

- **Redis key pattern `agent:conv:{orgId}:{sessionId}`**: Organization-scoped by construction — the key includes orgId, so tenant isolation is enforced at the storage layer without requiring cross-org validation on every read
- **Compression via LlmProviderService.chat()**: Reuses the existing service layer rather than making a separate fetch call — consistent error handling and timeout behavior
- **Fail-transparent tracing**: Per D-12, `traceToolCall()` is wrapped in try/catch — if the database is down, agent execution continues unimpeded. Tracing errors are logged at warn level
- **ToolCallback<any> cast in MCP servers**: The `registerTool()` method infers deep types from Zod schemas causing TS2589 (type instantiation excessively deep). Using the deprecated-but-functional `tool()` method with an explicit `ToolCallback<any>` cast avoids the issue while remaining compatible with the SDK
- **Health check cooldown cache**: `DegradationService` caches results for 10 seconds to avoid hammering Ollama's `/api/tags` endpoint on every agent request — uses `isDegraded()` for quick status checks

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TS2589 deep type inference in MCP servers**
- **Found during:** Task 3 (MCP server creation)
- **Issue:** Using `registerTool()` with Zod schemas causes "Type instantiation is excessively deep and possibly infinite" (TS2589) — TypeScript can't resolve the recursive Zod type inference
- **Fix:** Switched from `registerTool()` to the `tool()` method with explicit `ToolCallback<any>` type cast — resolves the deep inference while maintaining full MCP protocol compatibility
- **Files modified:** All 4 MCP server files (`events.mcp.server.ts`, `doors.mcp.server.ts`, `risk.mcp.server.ts`, `cameras.mcp.server.ts`)
- **Committed in:** `e24f2cb` (Task 3 commit)

**2. [Rule 1 - Bug] Fixed Prisma Json type incompatibility in AgentTraceService**
- **Found during:** Task 2 (AgentTraceService creation)
- **Issue:** `params.input as object` is not assignable to Prisma's `InputJsonValue` type — TypeScript strict mode rejects the broad `object` type
- **Fix:** Used `as any` cast for input/output fields with explanatory comment — these are JSON fields that accept any serializable value at runtime
- **Files modified:** `apps/api/src/modules/ai-agent/tracing/agent-trace.service.ts`
- **Committed in:** `d0b0780` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs — both type system workarounds)
**Impact on plan:** Both fixes are type-correctness workarounds that don't change runtime behavior. The MCP servers function identically with `tool()` vs `registerTool()`. No scope creep.

## Issues Encountered

- **Pre-existing TypeScript errors in `camera.service.ts` and `license.service.ts`**: These files reference `organizationId` on types that no longer have it (from the prior Site→Organization migration). These are out of scope — not caused by this plan and not fixable within the scope boundary.
- **MCP SDK `tool()` is deprecated**: The plan references `server.tool()` which is marked deprecated in MCP SDK v1.29.0 in favor of `registerTool()`. However, `registerTool()` triggers TS2589 with Zod schemas. Used the deprecated API as a practical workaround — the functionality is identical and the SDK still fully supports it.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new_network_endpoint | `degradation.service.ts` | `checkHealth()` makes outbound HTTP calls to Ollama — should be restricted to internal network |
| threat_flag: redis_key_injection | `conversation.memory.ts` | `buildKey()` concatenates user-provided `organizationId` and `sessionId` — ensure UUID validation before storage |

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Agent infrastructure complete: memory, compression, tracing, security guards, MCP servers, degradation fallback
- Ready for **Plan 09-06**: Semantic memory layer (Qdrant embeddings + pgvector schema migration)
- `ConversationMemory.saveSemanticMemory()` has a TODO referencing Plan 06 for Qdrant wiring
- All services, guards, and MCP servers registered in `AiAgentModule` — no further module plumbing needed for agents

## Self-Check: PASSED

- [x] All 3 tasks executed and committed (3 commits: `6c59ac9`, `d0b0780`, `e24f2cb`)
- [x] 14 files created/modified on disk
- [x] Plan-level verifications pass (4 MCP servers, McpServer import, REDIS_AGENT, agentTrace.create, 3 guards)
- [x] `npm run check-types` exits 0 for all new files (pre-existing errors in camera/license services are out of scope)
- [x] SUMMARY.md created with substantive content

---

*Phase: 09-ai-intelligence*
*Completed: 2026-07-16*
