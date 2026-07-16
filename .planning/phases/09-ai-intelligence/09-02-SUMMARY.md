---
phase: 09-ai-intelligence
plan: 02
subsystem: api
tags: [nestjs, zod, decorator, agent, ai, skill-registry, prompts, typescript]

# Dependency graph
requires:
  - phase: 09-ai-intelligence
    plan: 01
    provides: Infrastructure setup (npm/pip packages, Qdrant, Ollama config, AgentTrace model, AI env vars)
provides:
  - Shared Zod schemas for agent I/O (agentChat, SSE events, risk explanation)
  - Shared TypeScript types (AgentChatInput, SSEEvent, AgentStatus, RiskExplanation, PatternDetail, AgentTraceEntry)
  - API-level types (AgentContext, AgentResult, ToolCallDefinition, SkillDefinition)
  - @Skill() decorator with SetMetadata pattern for skill registration
  - SkillRegistry service with DiscoveryService auto-discovery (OnModuleInit)
  - AiAgentModule skeleton with BullMQ queue and SkillRegistry export
  - 6 version-controlled system prompt files (orchestrator, event-search, risk-analysis, pattern-detection, incident, door-control)
affects:
  - 09-04 (Agent communication — chat endpoint, SSE streaming, orchestrator)
  - 09-05 (Tool execution — tool registry, tool decorator, agent tool dispatch)
  - 09-06 (Skill integration — concrete skill implementations, tool binding)
  - All future agent implementation plans

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "@Skill() decorator mirrors @Roles() — SetMetadata wrapper in NestJS"
    - "SkillRegistry uses NestJS DiscoveryService for zero-config auto-registration on module init"
    - "Shared Zod schemas in @repo/shared for cross-app validation consistency"
    - "System prompts as version-controlled .md files with XML injection protection ({{user_message}} tags)"
    - "AiAgentModule coexists alongside AiModule — separate module, not a migration"

key-files:
  created:
    - packages/shared/src/schemas/agent.schema.ts
    - packages/shared/src/types/agent.types.ts
    - apps/api/src/modules/ai-agent/types/agent.types.ts
    - apps/api/src/modules/ai-agent/skills/skill.decorator.ts
    - apps/api/src/modules/ai-agent/skills/skill-registry.service.ts
    - apps/api/src/modules/ai-agent/ai-agent.module.ts
    - apps/api/src/modules/ai-agent/prompts/orchestrator.prompt.md
    - apps/api/src/modules/ai-agent/prompts/event-search.prompt.md
    - apps/api/src/modules/ai-agent/prompts/risk-analysis.prompt.md
    - apps/api/src/modules/ai-agent/prompts/pattern-detection.prompt.md
    - apps/api/src/modules/ai-agent/prompts/incident.prompt.md
    - apps/api/src/modules/ai-agent/prompts/door-control.prompt.md
  modified:
    - packages/shared/src/index.ts

key-decisions:
  - "@Skill() uses SetMetadata pattern matching existing @Roles() decorator — consistent, zero learning curve"
  - "SkillRegistry uses NestJS DiscoveryService.getProviders() for auto-discovery — no manual registration required"
  - "SkillDefinition.inputSchema uses ZodTypeAny — skills define their own Zod schemas as input contracts"
  - "AiAgentModule uses separate BullMQ queue (ai-agent) from AiModule (ai-summaries) — clean separation per D-09"
  - "Prompt injection prevention via XML boundary tags (<user_query>) wrapping user input — threat model T-09-03 mitigation"
  - "All prompts are French-first with multi-language fallback — D-37 compliance"

patterns-established:
  - "Skill decorator pattern: import { Skill, SKILL_METADATA } from './skills/skill.decorator'"
  - "Auto-discovery: OnModuleInit + DiscoveryService.getProviders() + Reflect.getMetadata"
  - "Module coexistence: AiAgentModule and AiModule are siblings, not parent/child"

requirements-completed:
  - FTR-08
  - FTR-09
  - FTR-10
  - FTR-11

# Metrics
duration: 3min
completed: 2026-07-16
---

# Phase 09 Plan 02: AI Agent Module Foundation Summary

**AiAgentModule foundation with shared Zod schemas, @Skill() decorator, DiscoveryService-based SkillRegistry, and 6 French-first system prompts with XML injection protection**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-16T07:18:59Z
- **Completed:** 2026-07-16T07:22:43Z
- **Tasks:** 2
- **Files modified:** 13 (12 created, 1 modified)

## Accomplishments

- **Shared Zod schemas** — agentChatSchema (message validation 1-2000 chars), agentSseEventSchema (7 event types: thinking/token/tool_call/tool_result/agent_switch/error/done), riskExplainSchema (zone UUID validation)
- **Shared TypeScript types** — AgentChatInput, AgentChatMessage, SSEEvent, AgentStatus, RiskExplanation, PatternDetail, AgentTraceEntry
- **API-level types** — AgentContext (userId, organizationId, role, language), AgentResult (content, toolCalls, metadata), ToolCallDefinition, SkillDefinition (ZodTypeAny inputSchema)
- **@Skill() decorator** — mirrors @Roles() SetMetadata pattern; applies SKILL_METADATA constant with SkillDefinition payload
- **SkillRegistry** — OnModuleInit auto-discovery via NestJS DiscoveryService.getProviders(); Reflect.getMetadata on each provider's metatype; Map-based storage with getSkill()/listSkills()/hasSkill() API
- **AiAgentModule** — imports DiscoveryModule + BullModule (ai-agent queue); exports SkillRegistry for downstream plans; does NOT import AiModule (coexistence per D-09)
- **6 system prompts** — orchestrator (plan→delegate→aggregate), event-search (NL→structured search with tool definitions), risk-analysis (zone risk scoring with factor explanation), pattern-detection (temporal/behavioral/correlation patterns), incident (structured JSON summaries with timeline + recommendations), door-control (vision analysis + guarded door actions)
- **Prompt injection protection** — all prompts wrap user input in `<user_query>` XML tags with system instructions to treat content as data, not instructions (T-09-03 mitigation)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared types, schemas, and prompt files** — `1829193` (feat)
2. **Task 2: Create @Skill() decorator, SkillRegistry, and AiAgentModule** — `ae5e74a` (feat)

## Files Created/Modified

- `packages/shared/src/schemas/agent.schema.ts` — Zod schemas: agentChatSchema, agentSseEventSchema, riskExplainSchema with inferred types
- `packages/shared/src/types/agent.types.ts` — AgentChatInput, AgentChatMessage, SSEEvent, AgentStatus, RiskExplanation, PatternDetail, AgentTraceEntry
- `packages/shared/src/index.ts` — Barrel exports for new agent schemas and types
- `apps/api/src/modules/ai-agent/types/agent.types.ts` — AgentContext, AgentResult, ToolCallRecord, ToolCallDefinition, SkillDefinition
- `apps/api/src/modules/ai-agent/skills/skill.decorator.ts` — @Skill() decorator with SetMetadata pattern, SKILL_METADATA constant, SkillDefinition interface
- `apps/api/src/modules/ai-agent/skills/skill-registry.service.ts` — OnModuleInit auto-discovery via DiscoveryService; Map-based skill registry
- `apps/api/src/modules/ai-agent/ai-agent.module.ts` — NestJS module with DiscoveryModule, BullMQ queue, SkillRegistry export
- `apps/api/src/modules/ai-agent/prompts/orchestrator.prompt.md` — Orchestrator: plan→delegate→aggregate, French-first, XML injection protection
- `apps/api/src/modules/ai-agent/prompts/event-search.prompt.md` — Event search: NL→structured queries, tool definitions for search_events
- `apps/api/src/modules/ai-agent/prompts/risk-analysis.prompt.md` — Risk analysis: zone risk scoring, factor explanation, JSON output format
- `apps/api/src/modules/ai-agent/prompts/pattern-detection.prompt.md` — Pattern detection: temporal/behavioral/correlation/equipment patterns, confidence scoring
- `apps/api/src/modules/ai-agent/prompts/incident.prompt.md` — Incident analysis: structured JSON summaries with timeline, zones, persons, video evidence, actions
- `apps/api/src/modules/ai-agent/prompts/door-control.prompt.md` — Door control: vision analysis, guardrail-aware actions, operator confirmation required

## Decisions Made

- **@Skill() uses SetMetadata pattern** matching existing @Roles() decorator — consistent with the codebase, zero learning curve for developers familiar with NestJS guards
- **DiscoveryService over manual registration** — eliminates the need for developers to register skills in a module's providers array; decorated classes are auto-discovered on module init
- **SkillDefinition.inputSchema = ZodTypeAny** — gives each skill full control over its input contract while keeping the registry interface simple; skills validate their own inputs
- **AiAgentModule uses separate ai-agent queue** from AiModule's ai-summaries queue — clean separation of concerns per D-09 (coexistence, not migration)
- **Prompts as version-controlled .md files** — separate from agent code so non-developers can iterate on prompts; XML injection protection via `<user_query>` boundary tags per T-09-03

## Deviations from Plan

### Acceptance Criteria Variance

**1. [Pre-existing Issue] API check-types fails on unrelated files**
- **Found during:** Task 1 verification (acceptance criterion: "npm run check-types (from apps/api) exits 0")
- **Issue:** `apps/api` type checking fails due to pre-existing errors in `camera.service.ts` (organizationId does not exist on CameraCreateInput) and `license.service.ts` (missing organizationId in LicenseApiKeyUncheckedCreateInput) — both are from the ongoing Site→Organization schema migration, not from this plan's changes
- **Resolution:** Verified that the new ai-agent files compile without errors (`npx tsc --noEmit | grep -E "ai-agent"` returns no results). The shared package (`@repo/shared`) passes check-types clean. The pre-existing API errors are out of scope per scope boundary rules.
- **Files affected:** None (no changes needed — pre-existing errors are in unrelated modules)
- **Impact:** Acceptance criterion partially satisfied — all ai-agent files typecheck correctly; the plan's overall check-types gate is blocked by pre-existing issues in Phase 04 migration scope

---

**Total deviations:** 1 (pre-existing issue, no fix needed)
**Impact on plan:** No impact on deliverable quality. All new files compile without errors. Pre-existing errors in camera/license modules are tracked in the ongoing Site→Organization migration.

## Issues Encountered

- Pre-existing TypeScript compilation errors in `camera.service.ts` and `license.service.ts` from the Site→Organization schema migration (Phase 04) prevent the full `npm run check-types` from passing. These are out of scope for this plan per scope boundary rules. The ai-agent files themselves have zero type errors.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- AiAgentModule foundation complete with shared contracts (types, schemas, decorators)
- SkillRegistry ready for skill registration in Plans 04-06
- 6 system prompts ready to be loaded by respective agent implementations
- Ready for **Plan 09-03** (Prisma schema extensions with vector embeddings) or **Plan 09-04** (Agent communication — chat endpoint, SSE streaming, orchestrator)

---

## Self-Check: PASSED

- [x] All 2 tasks executed and committed
- [x] `packages/shared/src/schemas/agent.schema.ts` — exists with agentChatSchema, agentSseEventSchema, riskExplainSchema
- [x] `packages/shared/src/types/agent.types.ts` — exists with all 7 required types
- [x] `packages/shared/src/index.ts` — barrel exports updated for agent schemas and types
- [x] `apps/api/src/modules/ai-agent/types/agent.types.ts` — exists with AgentContext, AgentResult, ToolCallDefinition, SkillDefinition
- [x] `apps/api/src/modules/ai-agent/prompts/` — 6 .md files present, each substantive and French-first
- [x] `apps/api/src/modules/ai-agent/skills/skill.decorator.ts` — @Skill() decorator with SetMetadata pattern
- [x] `apps/api/src/modules/ai-agent/skills/skill-registry.service.ts` — OnModuleInit + DiscoveryService + getSkill/listSkills/hasSkill
- [x] `apps/api/src/modules/ai-agent/ai-agent.module.ts` — DiscoveryModule + BullMQ + SkillRegistry export; AiModule NOT imported
- [x] All 2 commits present in git log (1829193, ae5e74a)
- [x] SUMMARY.md created with substantive content

---

*Phase: 09-ai-intelligence*
*Completed: 2026-07-16*
