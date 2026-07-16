---
phase: 09-ai-intelligence
plan: 04
subsystem: api
tags:
  - nestjs
  - ollama
  - agentic-ai
  - sse
  - event-driven
  - llm
  - tool-calling

requires:
  - phase: 09-ai-intelligence
    plan: 01
    provides: ollama npm package installed, config keys (ai.llamaModel, ai.qwenVlModel, ai.embeddingModel)
  - phase: 09-ai-intelligence
    plan: 02
    provides: AgentContext, AgentResult, ToolCallRecord types; @Skill() decorator; SkillRegistry with DiscoveryService; 6 French system prompts

provides:
  - LlmProviderService wrapping ollama npm package (chat, chatWithTools, chatVision, embed, streamChat)
  - OrchestratorService with ReAct loop, parallel delegation, @OnEvent auto-triggers
  - ChatController with SSE streaming via FastifyReply (Fastify adapter compatible)
  - 5 specialized agents (EventSearch, RiskAnalysis, PatternDetection, Incident, DoorControl)
  - 6 @Skill() decorated skill classes (search-events, get-risk-score, analyze-pattern, summarize-incident, control-door, assess-camera)
  - AiAgentModule fully populated with controllers, providers, and exports

affects:
  - 09-05 (guardrails, rate limiting, JWT claim integration, auth hardening)
  - 09-06 (dashboard AI chat UI)
  - 09-07 (real-time notifications)
  - 09-08 (integration testing)

tech-stack:
  added:
    - ollama ^0.6.3 (npm package for typed Ollama client)
  patterns:
    - "@Sse() fallback: @Get() + FastifyReply res.raw.write() for SSE streaming with Fastify adapter"
    - "AsyncGenerator<T> for SSE token-by-token streaming"
    - "ReAct tool-calling loop: chatWithTools() with max 5 iterations"
    - "@OnEvent wildcard listeners for auto-triggers (incident.*, risk.*, pattern.*)"
    - "@Skill() + DiscoveryService auto-registration pattern"
    - "Prompt loading via fs.readFileSync at construction time (cached)"

key-files:
  created:
    - apps/api/src/modules/ai-agent/llm/llm-provider.service.ts
    - apps/api/src/modules/ai-agent/orchestrator.service.ts
    - apps/api/src/modules/ai-agent/sse/chat.controller.ts
    - apps/api/src/modules/ai-agent/agents/event-search.agent.ts
    - apps/api/src/modules/ai-agent/agents/risk-analysis.agent.ts
    - apps/api/src/modules/ai-agent/agents/pattern-detection.agent.ts
    - apps/api/src/modules/ai-agent/agents/incident.agent.ts
    - apps/api/src/modules/ai-agent/agents/door-control.agent.ts
    - apps/api/src/modules/ai-agent/skills/skills/search-events.skill.ts
    - apps/api/src/modules/ai-agent/skills/skills/get-risk-score.skill.ts
    - apps/api/src/modules/ai-agent/skills/skills/analyze-pattern.skill.ts
    - apps/api/src/modules/ai-agent/skills/skills/summarize-incident.skill.ts
    - apps/api/src/modules/ai-agent/skills/skills/control-door.skill.ts
    - apps/api/src/modules/ai-agent/skills/skills/assess-camera.skill.ts
  modified:
    - apps/api/src/modules/ai-agent/ai-agent.module.ts

key-decisions:
  - "@Sse() decorator not compatible with Fastify adapter — used @Get() + FastifyReply.raw.writeHead() with manual SSE framing. Per RESEARCH.md Assumption A5."
  - "ToolExecutor passed as parameter (not injected) to chatWithTools() for flexibility — orchestrator can provide different executors per context."
  - "Agents load prompts from .md files via fs.readFileSync at construction time (cached) — avoids runtime I/O per request."
  - "DoorControlAgent.controlDoor() always returns requiresConfirmation: true, executed: false — guardrail guard added in Plan 05 per T-09-12."
  - "Orchestrator @OnEvent handlers use event re-emission pattern (ai-agent.*) for decoupling — actual agent invocation wired post-Task 3."
  - "RiskModule imported in AiAgentModule to resolve RiskService dependency for GetRiskScoreSkill."

requirements-completed:
  - FTR-08
  - FTR-09
  - FTR-10
  - FTR-11

duration: 8min
completed: 2026-07-16
---

# Phase 09 Plan 04: Agentic AI System — Summary

**Complete NestJS agent system with ollama tool calling, ReAct orchestrator, SSE streaming, 5 specialized agents, 6 @Skill() skills, and event-driven auto-triggers**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-16T07:32:35Z
- **Completed:** 2026-07-16T07:40:38Z
- **Tasks:** 3
- **Files created:** 14
- **Files modified:** 1

## Accomplishments

- **LlmProviderService** wrapping `ollama` npm package (not raw fetch) with chat(), chatWithTools() ReAct loop, chatVision() for Qwen VL, embed(), and streamChat() async generator — 30s timeout/AbortController on all calls, try/catch with Logger + re-throw per D-12 fail-transparent
- **OrchestratorService** with executeQuery() async generator (thinking→plan→delegate→aggregate→stream→done), plan() using LLM for agent routing, and 4 @OnEvent handlers for incident.resolved/escalated, risk.score-critical, pattern.detected auto-triggers per D-28
- **ChatController** with @Get('chat') SSE streaming (Fastify adapter compatible — @Sse() doesn't work with Fastify), @Get('status') health check (ADMIN only), @Roles protection on both endpoints
- **5 specialized agents**: EventSearchAgent (NL→SQL hybrid parameterized queries), RiskAnalysisAgent (AI risk explanations), PatternDetectionAgent (trend analysis), IncidentAgent (structured JSON summaries stored in DB), DoorControlAgent (vision + disabled door control)
- **6 @Skill() skills**: search-events, get-risk-score, analyze-pattern, summarize-incident, control-door (disabled), assess-camera — all auto-discovered by SkillRegistry via DiscoveryService
- **AiAgentModule** fully populated with 3 imports, 1 controller, 14 providers (3 foundation + 5 agents + 6 skills), 8 exports

## Task Commits

Each task was committed atomically:

1. **Task 1: LlmProviderService** — `2d66d0e` (feat)
2. **Task 2: Orchestrator + SSE controller + module wiring** — `1ab39c9` (feat)
3. **Task 3: 5 agents + 6 skills** — `122ebab` (feat)

## Files Created/Modified

- `apps/api/src/modules/ai-agent/llm/llm-provider.service.ts` — NestJS service wrapping ollama npm package: chat(), chatWithTools() ReAct loop (max 5 iter), chatVision() for Qwen VL, embed(), streamChat() async generator, checkStatus()
- `apps/api/src/modules/ai-agent/orchestrator.service.ts` — Multi-agent coordinator: executeQuery() SSE generator, plan() LLM-based routing, 4 @OnEvent auto-triggers, prompt loading
- `apps/api/src/modules/ai-agent/sse/chat.controller.ts` — Fastify-compatible SSE endpoint @Get('chat') with FastifyReply.raw.writeHead() + @Get('status') health check
- `apps/api/src/modules/ai-agent/agents/event-search.agent.ts` — NL query → structured spec → parameterized SQL ($queryRawUnsafe, orgId-scoped) → relevance-ranked results
- `apps/api/src/modules/ai-agent/agents/risk-analysis.agent.ts` — Zone risk analysis: fetches recent events, builds context prompt, calls LLM, returns RiskExplanation
- `apps/api/src/modules/ai-agent/agents/pattern-detection.agent.ts` — Pattern trend analysis: queries detected_patterns hypertable, calls LLM for insights
- `apps/api/src/modules/ai-agent/agents/incident.agent.ts` — Incident summary: fetches incident+comments+evidence+timeline, calls LLM for structured JSON, stores in DB
- `apps/api/src/modules/ai-agent/agents/door-control.agent.ts` — Camera assessment via Qwen VL + AI preprocessor; door control disabled (always requiresConfirmation:true)
- `apps/api/src/modules/ai-agent/skills/skills/search-events.skill.ts` — @Skill decorated, delegates to EventSearchAgent
- `apps/api/src/modules/ai-agent/skills/skills/get-risk-score.skill.ts` — @Skill decorated, fetches RiskService scores + RiskAnalysisAgent explanation
- `apps/api/src/modules/ai-agent/skills/skills/analyze-pattern.skill.ts` — @Skill decorated, delegates to PatternDetectionAgent
- `apps/api/src/modules/ai-agent/skills/skills/summarize-incident.skill.ts` — @Skill decorated, delegates to IncidentAgent
- `apps/api/src/modules/ai-agent/skills/skills/control-door.skill.ts` — @Skill decorated, disabled by default (requires operator confirmation)
- `apps/api/src/modules/ai-agent/skills/skills/assess-camera.skill.ts` — @Skill decorated, delegates to DoorControlAgent.assessCamera()
- `apps/api/src/modules/ai-agent/ai-agent.module.ts` — Modified: 14 providers, 8 exports, RiskModule import, ConfigModule + EventEmitterModule

## Decisions Made

- **Fastify SSE fallback:** @Sse() decorator doesn't work with Fastify adapter — used @Get() + FastifyReply.raw.writeHead() with SSE framing (Content-Type: text/event-stream). Documented per RESEARCH.md Assumption A5.
- **ToolExecutor as parameter:** chatWithTools() receives ToolExecutor as a parameter (not injected) for context-specific tool execution — orchestrator can provide different executors.
- **Cached prompt loading:** Agents load prompts from .md files via fs.readFileSync at construction time — avoids runtime I/O per request.
- **DoorControlAgent safety:** controlDoor() always returns requiresConfirmation: true, executed: false — actual guardrail enforcement happens in Plan 05 per T-09-12.
- **Event re-emission pattern:** Orchestrator @OnEvent handlers emit ai-agent.* events for decoupling — actual agent invocation will be wired when agents are connected in subsequent work.
- **RiskModule import:** Added to AiAgentModule imports to resolve RiskService dependency for GetRiskScoreSkill.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Camera model field name: snapshotUrl → lastSnapshotUrl**
- **Found during:** Task 3 (DoorControlAgent)
- **Issue:** Camera Prisma model uses `lastSnapshotUrl` field, not `snapshotUrl` — TypeScript compilation errors on select and property access
- **Fix:** Replaced all 4 references of `snapshotUrl` with `lastSnapshotUrl` in door-control.agent.ts
- **Files modified:** `apps/api/src/modules/ai-agent/agents/door-control.agent.ts`
- **Verification:** TypeScript compilation passes with no ai-agent errors
- **Committed in:** `122ebab` (Task 3 commit)

**2. [Rule 3 - Blocking] Fixed orchestrator import paths**
- **Found during:** Task 2 (OrchestratorService creation)
- **Issue:** Import paths used `../llm/`, `../skills/`, `../types/` — but orchestrator.service.ts is at ai-agent/ level, so paths should be `./llm/`, `./skills/`, `./types/`
- **Fix:** Corrected all relative import paths from `../` to `./`
- **Files modified:** `apps/api/src/modules/ai-agent/orchestrator.service.ts`
- **Verification:** TypeScript compilation passes
- **Committed in:** `1ab39c9` (Task 2 commit)

**3. [Rule 1 - Bug] Fixed PromiseSettledResult type predicate issue**
- **Found during:** Task 2 (OrchestratorService)
- **Issue:** TypeScript type predicate filter `(r): r is PromiseFulfilledResult<unknown>` incompatible with PromiseSettledResult union type
- **Fix:** Replaced type predicate filter with explicit cast: `(r) => r.status === 'fulfilled'` then `(r as PromiseFulfilledResult<unknown>).value`
- **Files modified:** `apps/api/src/modules/ai-agent/orchestrator.service.ts`
- **Verification:** TypeScript compilation passes
- **Committed in:** `1ab39c9` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes are correctness issues necessary for compilation. No scope creep. All within Task 2/3 scope.

## Issues Encountered

- **Pre-existing TypeScript errors** in `camera.service.ts` (organizationId) and `license.service.ts` (organizationId missing) — these are v1.0→v2.0 migration issues from prior phases, out of scope per scope boundary rules. New ai-agent files compile without errors.
- **EventEmitterModule already registered** in `app.module.ts` with `wildcard: true, delimiter: '.'` — no need to re-register in AiAgentModule, but the import is harmless.

## User Setup Required

None — no external service configuration required for this plan. All services use existing Ollama/Redis/PostgreSQL infrastructure.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: prompt-injection | orchestrator.service.ts | User messages wrapped in `<user_query>` tags; system prompts include injection boundary instructions per T-09-09 |
| threat_flag: sql-injection | event-search.agent.ts | Parameterized queries via \$queryRawUnsafe with \$1/\$2 bind — no LLM output in SQL per T-09-10 |
| threat_flag: door-automation | door-control.agent.ts, control-door.skill.ts | controlDoor always returns requiresConfirmation:true, executed:false — guardrail enforcement in Plan 05 per T-09-12 |
| threat_flag: tool-loop-dos | llm-provider.service.ts | chatWithTools max 5 iterations; 30s AbortController timeout per call per T-09-13 |

## Next Phase Readiness

- Agentic AI system core complete: LlmProviderService, OrchestratorService, 5 agents, 6 skills, SSE streaming, event-driven auto-triggers
- All services coexist with legacy AiModule/AiService (separate BullMQ queues: ai-agent vs ai-summaries per D-09)
- Ready for Plan 09-05: guardrails, rate limiting, JWT claim integration, auth hardening
- DoorControlAgent guardrail enforcement deferred to Plan 05 as designed

---
*Phase: 09-ai-intelligence*
*Completed: 2026-07-16*
