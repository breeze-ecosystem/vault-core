# Phase 9: AI Intelligence - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the platform's AI from simple chatbot/feature-level capabilities into a full agentic intelligence system. A multi-agent architecture — 6 specialized agents coordinated by an orchestrator — replaces the monolithic AiService. The AI Preprocessor gains real-time computer vision (YOLOv12 + ByteTrack) and audio analysis (YAMNet + Faster-Whisper). Qdrant joins pgvector for semantic search. Incidents get auto-summaries on resolution and escalation. Risk scores get AI-powered explanations. Patterns expand from 5 to 8 detection types. A new Command Center page unifies chat, camera grid, and risk dashboard. The AI assistant becomes proactive — notifying operators of critical events.

Covers FTR-08 through FTR-11. Depends on Phase 8 (accumulated event data for embeddings and pattern analysis) and Phase 6 (design system for Command Center UI).

**Key insight:** The core AI infrastructure (AiService 742 lines, RiskService 478 lines, PatternsService 399 lines) already exists. Phase 9 enhances and replaces — the agentic system coexists with existing cron-based risk/pattern pipelines, replaces the ChatModule and AiService's query/assistant paths, and extends the AI Preprocessor with real-time vision and audio.
</domain>

<decisions>
## Implementation Decisions

### Agentic Architecture (FTR-08, FTR-09, FTR-11)
- **D-01:** Patterns inspired by Hermes Agent (NousResearch, 216k stars) — skill system, MCP servers, subagents, persistent memory. Implemented natively in TypeScript/NestJS, not embedded Python. Hermes Agent is a personal AI companion (standalone Python app), not an embeddable framework — its architectural patterns are adopted, not its codebase.
- **D-02:** 6 specialized agents: **SecurityOrchestrator** (planning + delegation + aggregation), **EventSearchAgent** (NL query + hybrid search), **RiskAnalysisAgent** (risk explanation + drill-down), **PatternDetectionAgent** (pattern detection + trend), **IncidentAgent** (auto-summaries + evidence linking), **DoorControlAgent** (vision analysis + door actions). All run as NestJS injectable services within `apps/api/src/modules/ai-agent/`.
- **D-03:** Skill Registry TypeScript — `@Skill()` decorator on classes with `definition` (name, description, inputSchema), `execute()` method. Auto-registered via `SkillRegistry` on module init. Extensible: add a skill = add a decorated class. Compatible with agentskills.io standard for future interop.
- **D-04:** MCP servers expose tools by domain (events.mcp, doors.mcp, risk.mcp, cameras.mcp). Agents discover and use tools via MCP protocol. Standard open protocol — other systems can connect. Internal tools also available via NestJS DI as fallback.
- **D-05:** Model routing per agent responsibility: Qwen 3 VL for all vision/multimodal tasks (DoorControlAgent, camera analysis), Llama 3.1 8B for text agents (Search, Risk, Pattern, Incident, Orchestrator). Ollama for development, vLLM for production serving. Both running simultaneously — Ollama for text LLM + embeddings, vLLM for Qwen VL high-throughput inference.
- **D-06:** Persistent memory: Redis for short-term conversation state, FTS5 for cross-session search, pgvector for semantic memory (conversation embeddings). Each agent maintains its own memory scope.
- **D-07:** Hybrid coordination: Orchestrator uses ReAct loop for simple queries (think → act → observe), parallel delegation for complex queries (Promise.all across agents → aggregate). EventEmitter (`@nestjs/event-emitter`) for inter-agent communication.
- **D-08:** SSE (Server-Sent Events) for streaming agent responses to dashboard. Simpler than WebSocket for unidirectional chat streaming. Socket.IO stays for alert streams.
- **D-09:** Coexistence with existing AiService: risk scoring cron, pattern detection cron, and event embeddings pipeline continue running. Agentic system wraps/replaces the chat, NL query, and incident summary paths. ChatModule legacy (VLM moondream) replaced by DoorControlAgent + Qwen 3 VL.
- **D-10:** Conversation context compression via LLM summarization at ~16000 tokens threshold. Orchestrator summarizes history into a structured paragraph before continuing.
- **D-11:** System prompts in `.md` files under `apps/api/src/modules/ai-agent/prompts/` — version-controlled via git, reviewed in PRs. One file per agent.
- **D-12:** Fail transparent — tool call failures reported to user with error detail. No automatic retry (avoids cascading errors). Agent continues with partial results.

### AI Pipeline — Python Service (FTR-08, FTR-11)
- **D-13:** AI Preprocessor (`services/ai-preprocessor/`) extended with: YOLOv12 (Ultralytics) for real-time object detection at 30 FPS, ByteTrack for cross-frame object ID tracking, YAMNet (TensorFlow Hub) for continuous audio event detection, Faster-Whisper for low-latency audio transcription.
- **D-14:** YOLOv12 + ByteTrack replaces the existing VLM per-frame analysis pipeline. Detection runs in real-time on RTSP streams. Qwen 3 VL is only called when detection fires (two-tier: fast detection → deep analysis).
- **D-15:** Qwen 3 VL replaces moondream as the vision model. Served via Ollama in dev, vLLM in production. Handles all vision tasks: camera snapshot analysis, zone intrusion verification, object classification.
- **D-16:** Qdrant deployed as Docker service in docker-compose.yml. Self-hosted, consistent with project ethos. Collections: `events` (event embeddings for search), `knowledge` (agent memory, SOPs, zone profiles), `incidents` (incident summaries).
- **D-17:** Hybrid vector strategy — pgvector retains `event_embeddings` hypertable (existing pipeline), Qdrant handles search index + agent memory. nomic-embed-text (existing) for pgvector, Qwen embedding for Qdrant collections.
- **D-18:** Hybrid search: vector similarity (Qdrant cosine) combined with structured field filters (TimescaleDB — event_type, zone, time range). Operator types "show intrusions on Site A after 8pm" → relevance-ranked results with linked video clips.
- **D-19:** Full audio pipeline: YAMNet runs continuously on camera audio streams — detects glass breaks, shouts, alarms. Faster-Whisper transcribes guard voice messages from mobile chat. Both integrated as MCP tools accessible to agents.

### Dashboard & UI (FTR-08, FTR-10, FTR-11)
- **D-20:** Command Center — new page `/command-center` replacing `/ia`. Unified view: chat with orchestrator (main panel), live camera grid (side panel), active agents status bar, risk gauge widget. Streaming responses via SSE. Uses Phase 6 design system (GlassCard, MetricHero, Sparkline, motion).
- **D-21:** Risk page (`/risque`) — integrate "Expliquer" button next to each zone score. Calls RiskAnalysisAgent, streams AI explanation (which events caused the change, contextual analysis). Color-coded gauge with drill-down preserved.
- **D-22:** Patterns page — new dedicated page `/patterns` replacing the maintenance page patterns section. 8 patterns total: 5 existing (door forced, held-open, reader failures, camera FPS drops, repeated denied) + 3 new (false positive detection per camera, schedule mismatch, impossible travel). Trend visualization for each pattern type.
- **D-23:** Mobile chat (onglet More) — full chat with assistant, SSE streaming, voice input (Faster-Whisper transcription), contextual quick actions. Guard-first UI: large touch targets, dark mode, simplified navigation.
- **D-24:** Assistant is proactive — notifies operator via dashboard toast + chat message for critical events (risk score > 70, multiple forced doors within 5 minutes, pattern detected). Configurable notification thresholds.

### Workflow & Integration
- **D-25:** 3-wave plan structure: Wave 1 — NestJS agent module + AI Preprocessor Python extensions + Qdrant + Qwen VL integration. Wave 2 — Command Center dashboard + patterns page + risk AI integration + metrics/evaluation. Wave 3 — mobile chat + SSE streaming + fallback/degradation + proactive notifications.
- **D-26:** Auto-summaries triggered on `incident.resolved` AND `incident.escalated` (not just resolution). Summary includes: timeline, zones, persons involved, linked video evidence, AI-recommended actions. Stored in Incident.description. Uses NestJS EventEmitter (`@OnEvent` pattern, existing in AiService).
- **D-27:** ChatModule legacy (`/api/chat`, VLM moondream camera queries) replaced by DoorControlAgent + Qwen 3 VL in the new agentic system. Old endpoint becomes proxy to orchestrator with deprecation notice.
- **D-28:** Event-driven auto-triggers via `@OnEvent`: `incident.resolved` → auto-summary, `incident.escalated` → interim summary, `risk.score-critical` → AI explanation, `pattern.detected` → proactive notification.
- **D-29:** Pattern expansion: 3 new hardcoded SQL rules added to PatternsService — false-positive rate per camera (alerts/day anomaly), schedule mismatch (events outside zone hours via zone schedule config), impossible travel (badge at distant doors within implausible time window). Redis dedup preserved for all 8 patterns.

### Security & Operations
- **D-30:** Action guardrails — lockdown, door control, credential revoke require explicit operator confirmation in chat UI + ADMIN/SUPERVISOR role. Audit log entry for every action. No automatic execution without human approval.
- **D-31:** Tenant + RBAC isolation: JWT `organizationId` + `role` passed to every agent. Prisma Client Extension (existing Phase 4) auto-scopes all DB queries. Agent can never access cross-organization data.
- **D-32:** Rate limiting per role: OPERATOR 5 req/min, SUPERVISOR 15 req/min, ADMIN 30 req/min. Uses existing `@fastify/rate-limit` + Redis.
- **D-33:** Fallback mode — when Ollama/vLLM is unavailable: risk/pattern cron jobs use last cached values, assistant responds "IA temporairement indisponible" with retry button, embeddings queued in BullMQ for delayed processing. Core security operations (doors, alerts) continue unaffected.
- **D-34:** Conversation privacy — chat history encrypted at rest, auto-purged after 90 days. Configurable retention per organization. Conversations contain sensitive security data.
- **D-35:** Complete tracing — every tool call logged with input, output, agent, timing, organization, user. Stored in PostgreSQL (`agent_traces` table). Dashboard admin panel for audit and debugging.
- **D-36:** IA available on all license tiers (no feature gating). Differentiation is on device limits and support, not AI capabilities.
- **D-37:** Multilingual assistant — detects user language from profile/browser, responds in kind. Supports French (primary), English, Spanish. System prompts include "Réponds en français" as default.
- **D-38:** Quantitative evaluation — test suite with predefined security scenarios, metrics: accuracy, hallucination rate, tool call success rate, response latency. Dataset with ground truth for NL search and incident summaries.

### Agent Discretion
- Exact prompt wording per agent — follow Hermes Agent patterns, adapt to security domain
- Skill Registry decorator API design — `@Skill({ name, description, inputSchema })` with Zod validation
- Qdrant collection schema details (vector dimensions, payload structure)
- YOLOv12 model size and confidence thresholds (default 0.45, per-org configurable)
- ByteTrack tracking parameters (max age, min hits)
- YAMNet class mapping to alert types (glass break, shout, alarm → alert severity)
- Command Center exact layout and component tree — Phase 6 design system patterns
- SSE event format and reconnection strategy
- Agent trace table schema
- Conversation encryption implementation
- Evaluation dataset composition and scenarios
- Pattern SQL query optimization for new pattern types
- MCP server implementation details (transport, tool discovery)
- Skill auto-discovery mechanism in SkillRegistry
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Definition
- `.planning/ROADMAP.md` — Phase 9 definition, FTR-08 to FTR-11 requirements, success criteria, dependencies on Phase 8
- `.planning/REQUIREMENTS.md` — Full requirement text for FTR-08 through FTR-11
- `.planning/PROJECT.md` — Project constraints, key decisions, tech stack boundaries, v2.0 approach

### State & Prior Decisions
- `.planning/STATE.md` — Blockers: pgvector embedding model selection, Ollama tool calling reliability
- `.planning/phases/06-premium-experience/06-CONTEXT.md` — D-01 to D-06: Radix Themes + Tailwind, motion animations, GlassCard/MetricHero/Sparkline components, dark-first design — used for Command Center UI
- `.planning/phases/08-feature-deepening/08-CONTEXT.md` — D-14: equipment health thresholds (no ML — Phase 9), D-15: AI-based evidence correlation (not Phase 8 — Phase 9), evidence auto-bundling time-window heuristic

### Architecture & Patterns
- `.planning/codebase/ARCHITECTURE.md` — NestJS module pattern, guard system, tenant isolation, BullMQ queues, WebSocket gateway
- `.planning/codebase/STACK.md` — Prisma 5.22.0, NestJS 10.4.8, BullMQ 5.30.0, Ollama, pgvector, TimescaleDB
- `.planning/codebase/INTEGRATIONS.md` — Ollama HTTP API, AI Preprocessor FastAPI, Qdrant (config exists, unused), Resend email
- `.planning/codebase/CONVENTIONS.md` — Naming, Zod validation, NestJS module patterns

### Source Code — Existing AI Modules
- `apps/api/src/modules/ai/ai.service.ts` — AiService (742 lines): NL query, RAG assistant, incident summaries, embedding pipeline, event bus listeners, Ollama calling patterns (callOllama, generateEmbedding, parseQueryResponse, embedEvent). **Coexisting — replaced on chat/query/summary paths.**
- `apps/api/src/modules/ai/ai.controller.ts` — AI REST endpoints: POST /api/ai/query, /summarize, /assistant, GET /status
- `apps/api/src/modules/ai/ai.processor.ts` — BullMQ worker (`ai-summaries` queue: generate-summary, embed-event)
- `apps/api/src/modules/risk/risk.service.ts` — RiskService (478 lines): cron every 5min, weighted formula, exponential smoothing, Redis cache, hypertable persistence. **Preserved — agent calls it for data.**
- `apps/api/src/modules/risk/risk.controller.ts` — GET /api/risk/scores, /scores/:zoneId, /history, /summary
- `apps/api/src/modules/risk/risk.gateway.ts` — WebSocket real-time push for risk scores
- `apps/api/src/modules/patterns/patterns.service.ts` — PatternsService (399 lines): 5 hardcoded SQL patterns, cron every 15min, Redis dedup. **Extended with 3 new patterns.**
- `apps/api/src/modules/patterns/patterns.processor.ts` — BullMQ worker (`recurring-patterns` queue)
- `apps/api/src/modules/chat/chat.service.ts` — ChatService (329 lines): legacy VLM camera chat with moondream. **Replaced by DoorControlAgent + Qwen 3 VL.**
- `apps/api/src/modules/inference/inference.service.ts` — InferenceService: frame analysis via AI Preprocessor. **Pipeline replaced by YOLOv12.**
- `apps/api/src/modules/inference/inference.processor.ts` — BullMQ worker (`frame-processing` queue)

### Source Code — Python AI Services
- `services/ai-preprocessor/app/main.py` — FastAPI entry point. **Extended with new routes for YOLOv12, YAMNet, Whisper.**
- `services/ai-preprocessor/app/routes/inference.py` — VLM inference (Ollama call). **Replaced by YOLOv12 + Qwen VL pipeline.**
- `services/ai-preprocessor/app/routes/anpr.py` — PaddleOCR ANPR. **Preserved.**
- `services/ai-preprocessor/app/config.py` — AI Preprocessor configuration
- `services/ai-preprocessor/requirements.txt` — Python dependencies (to add: ultralytics, bytTrack, tensorflow-hub, faster-whisper, PyAV, opencv-python, PyAudio, qdrant-client)

### Source Code — Dashboard Integration Points
- `apps/dashboard/app/(dashboard)/ia/page.tsx` — Current AI page (3 tabs: query, assistant, summaries). **Replaced by Command Center.**
- `apps/dashboard/app/(dashboard)/risque/page.tsx` — Risk dashboard. **Add "Expliquer" button → AI explanation stream.**
- `apps/dashboard/app/(dashboard)/maintenance/page.tsx` — Maintenance page (patterns section). **Extract to dedicated /patterns page.**
- `apps/dashboard/lib/api.ts` — Dashboard API client: aiQuery, aiAssistant, aiSummarize, aiStatus, risk functions. **Extend with agent endpoints.**
- `apps/dashboard/lib/nav-config.ts` — Navigation config (Assistant IA at /ia, Risques at /risque). **Add Command Center, Patterns.**
- `apps/dashboard/components/ui/` — GlassCard, MetricHero, Sparkline, DonutChart, QuickActionBar (Phase 6). **Reuse for Command Center.**

### Source Code — Mobile Integration Points
- `apps/mobile/app/(tabs)/_layout.tsx` — Phase 6 4-tab navigation. **Add chat to More tab.**
- `apps/mobile/lib/api.ts` — Mobile API client. **Extend with agent chat endpoints.**
- `apps/mobile/lib/theme.ts` — Color tokens, typography (Phase 6). **Use for chat UI.**

### Source Code — Infrastructure
- `apps/api/prisma/schema.prisma` — Prisma models (no new AI models needed; add agent_traces table)
- `apps/api/src/config/configuration.ts` — AI config keys: ollamaModel, embeddingModel, summaryModel. **Add qwenVlModel, qdrantUrl, vllmUrl.**
- `docker-compose.yml` — Current services. **Add Qdrant service.**
- `docker-compose.prod.yml` — Production compose. **Add Qdrant + vLLM services (prod only).**
- `.env.example` — Environment variables. **Add QDRANT_URL, VLLM_URL, QWEN_VL_MODEL.**

### External References
- Hermes Agent architecture: https://github.com/NousResearch/hermes-agent — Skill system, MCP integration, subagent patterns, memory architecture
- Ollama tool calling: https://ollama.com/blog/tool-support — Native tool calling API, OpenAI-compatible endpoint
- Qdrant: https://qdrant.tech/documentation/ — Vector DB for semantic search
- YOLOv12 (Ultralytics): https://docs.ultralytics.com/ — Real-time object detection
- Faster-Whisper: https://github.com/SYSTRAN/faster-whisper — Optimized Whisper for low-latency transcription
- agentskills.io — Open standard for agent skills (compatible with Skill Registry)

### Dependencies to Add
| Package | Purpose |
|---------|---------|
| `@nestjs/event-emitter` | Inter-agent communication (may already be installed) |
| `@modelcontextprotocol/sdk` | MCP server/client implementation |
| `@qdrant/js-client-rest` | Qdrant vector DB client |
| `ollama-ai-provider` or `ollama` npm | Ollama chat + embeddings client |
| `ultralytics` (Python) | YOLOv12 object detection |
| `bytetrack` (Python) | Object tracking across frames |
| `tensorflow-hub` (Python) | YAMNet audio event detection |
| `faster-whisper` (Python) | Audio transcription |
| `PyAV` + `opencv-python` (Python) | RTSP stream capture and processing |
| `PyAudio` (Python) | Audio stream capture |
| `qdrant-client` (Python) | Qdrant from Python preprocessor |
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AiService.callOllama()** (line 481) — Private helper for Ollama text generation with error handling. Reuse pattern for agent LLM calls.
- **AiService.generateEmbedding()** (line 515) — Ollama /api/embeddings with nomic-embed-text. Reuse for pgvector pipeline.
- **AiService.embedEvent()** (line 311) — INSERT into event_embeddings pgvector hypertable. Extend for new event types.
- **AiService.parseQueryResponse()** (line 541) — JSON extraction from LLM output with code fence cleanup. Reuse for any structured LLM response.
- **AiService.executeEventQuery()** (line 576) — Parameterized SQL from AI filter spec. Pattern for NL→SQL pipeline (preserved in EventSearchAgent).
- **RiskService.computeAllZoneScores()** — Weighted formula + exponential smoothing + Redis caching. Agent reads from this, adds AI explanation layer.
- **PatternsService.detectPatterns()** — SQL frequency analysis + Redis dedup. Extend with 3 new patterns, same architecture.
- **Phase 6 premium components** — GlassCard, MetricHero, Sparkline, DonutChart, QuickActionBar. Reuse for Command Center widgets.
- **AI Preprocessor call_ollama_vlm()** — httpx async call to Ollama. Replaced by vLLM API call for Qwen VL, preserved for dev.
- **NestJS EventEmitter** — `@OnEvent()` pattern already used for access events → embed-event jobs. Extend for agent auto-triggers.
- **Resend SDK** — Email delivery. Reuse for proactive notification emails.

### Established Patterns
- **NestJS module pattern**: Each agent = injectable service. Module `AiAgentModule` registers all agents + SkillRegistry + MCP servers.
- **Zod + class-validator dual validation**: New schemas for agent chat input, SSE events, tool call params.
- **BullMQ queues**: Existing `ai-summaries`, `frame-processing`, `risk-scoring`, `recurring-patterns`. `ai-summaries` repurposed for agent tasks.
- **Prisma Client Extension auto-scoping**: All agent DB queries automatically filtered to organizationId.
- **fetchWithAuth()**: Dashboard API client with auto-refresh. SSE connection reuses auth token.
- **@Cron + Redis dedup**: RiskService (5min) and PatternsService (15min) patterns. Agents enhance but don't replace these cron jobs.
- **pgvector <=> operator**: Cosine distance query pattern. Extended to Qdrant for search index.

### Integration Points
- **New NestJS module**: `apps/api/src/modules/ai-agent/` — OrchestratorService, agents, SkillRegistry, MCP servers, SSE gateway
- **AI Preprocessor extended**: New routes for YOLOv12 detection, YAMNet audio, Whisper transcription. Existing /api/v1/analyze replaced.
- **Qdrant service**: New Docker service in docker-compose.yml (port 6333)
- **vLLM service**: New Docker service (prod only) for Qwen 3 VL serving
- **Dashboard Command Center**: `apps/dashboard/app/(dashboard)/command-center/page.tsx`
- **Dashboard Patterns page**: `apps/dashboard/app/(dashboard)/patterns/page.tsx`
- **Risk page enhancement**: Add AI explanation panel to existing `/risque` page
- **Mobile chat**: New screen under `apps/mobile/app/(tabs)/more/chat.tsx`
- **Navigation**: Add Command Center and Patterns to nav-config.ts
- **Env vars**: QDRANT_URL, VLLM_URL, QWEN_VL_MODEL, YOLO_MODEL, WHISPER_MODEL
- **BullMQ**: Repurpose `ai-summaries` queue for agent task dispatch
- **Event bus**: New listeners — incident.resolved, incident.escalated, risk.score-critical, pattern.detected

### Creative Options
- Command Center can use a 3-column layout: chat (center, 50%), camera grid (right, 30%), risk gauge + agent status (left, 20%)
- SSE streaming can use EventSource API in browser, with fallback to polling if SSE unsupported
- Qdrant Docker service can reuse existing Redis/PostgreSQL Docker patterns from docker-compose.yml
- Skill Registry can use NestJS discovery (`@Discover()` or manual `OnModuleInit` scanning)
- Agent tracing table can use TimescaleDB hypertable for time-series query performance
- Mobile chat can reuse the existing SSE connection from dashboard, adapted for React Native
</code_context>

<specifics>
## Specific Ideas

**Hermes Agent — architectural inspiration, not code integration:**
Hermes Agent (NousResearch, 216k stars) validates the multi-agent + skills + MCP architecture. Key patterns adopted: skill system with auto-discovery, MCP protocol for tool standardization, subagent spawning for parallel work, persistent memory with FTS5 search, compression-based context management. Hermes is Python/standalone — our implementation is TypeScript/NestJS-native but follows the same architectural philosophy.

**Key preferences evident from discussion:**
- 2026-grade AI — simple chatbots are obsolete, agentic architectures are the standard
- Multi-agent with coordinator — not monolithic LLM calls
- Extensible via skills and MCP — tools added without re-coding agents
- Multimodal (vision + audio) — not text-only AI
- Self-hosted everything (Qdrant Docker, Ollama, vLLM) — no cloud dependencies
- Production-grade observability — tracing, metrics, evaluation
- Security-first — confirmation gates for actions, RBAC, audit logs, encrypted conversations
</specifics>

<deferred>
## Deferred Ideas

- **vLLM production deployment** — Ollama used for development, vLLM when production hardware supports GPU inference. Migration path documented but implementation deferred.
- **Nous Portal integration** — 300+ models via single subscription. Could simplify model management. Deferred — Ollama self-hosted is the current strategy.
- **Skill self-improvement (like Hermes learning loop)** — skills currently static. Auto-improvement from agent feedback is possible but deferred for stability.
- **Langfuse/LangSmith observability** — external LLM tracing platform. Deferred in favor of custom PostgreSQL tracing table.
- **Full Command Center (Phase 10 scope)** — the Phase 9 Command Center focuses on chat + cameras + risk. Full unified view with door map, alert stream, incident queue is Phase 10.
- **Agent marketplace / community skills** — agentskills.io compatible skills shared across instances. Interesting but premature.
- **Multi-agent debate/consensus** — multiple agents analyzing the same event and comparing conclusions. Interesting for accuracy but adds latency and cost.
- **Training custom security model** — fine-tuning Llama or Qwen on security operations data. Deferred — requires significant dataset curation.
</deferred>

---

*Phase: 9-AI-Intelligence*
*Context gathered: 2026-07-16*
