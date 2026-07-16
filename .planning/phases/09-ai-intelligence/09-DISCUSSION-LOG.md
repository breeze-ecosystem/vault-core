# Phase 9: AI Intelligence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-16
**Phase:** 09-ai-intelligence
**Areas discussed:** Strategy, Agentic Architecture, AI Pipeline, Dashboard UI, Integration, Security & Operations

---

## Strategy — Enhance vs Rebuild

| Option | Description | Selected |
|--------|-------------|----------|
| Enhance existing | Extend AiService/RiskService/PatternsService | |
| Rebuild from scratch | Replace current modules with new agentic architecture | ✓ |

**User's choice:** Complete rebuild with agentic architecture. Current AI is "obsolete" — 2026 standard is multi-agent systems with MCP servers and skills, not simple chatbots. Huge amounts of new tools and methods emerge daily.

**Notes:** User wants to extend existing modules where they're stable (risk cron, pattern cron, embeddings) but fundamentally replace the AI interaction model. The vision is a full agentic workflow system with a main orchestrator agent and multiple specialized sub-agents.

---

## Strategy — Hermes Agent Exploration

| Option | Description | Selected |
|--------|-------------|----------|
| Mastra | Framework TS complet (agents, workflows, MCP, memory) | |
| Vercel AI SDK v7 | SDK léger pour tool calling + streaming | |
| Custom Ollama | Tout construire sur Ollama native tools | ✓ |

**User's choice:** Patterns inspired by Hermes Agent (NousResearch, 216k stars, MIT license). Hermes Agent itself is Python/standalone and not embeddable — adopt its architectural philosophy (skills, MCP, subagents, persistent memory) but implement natively in TypeScript/NestJS.

**Notes:** Initial recommendation was Mastra (comprehensive TS framework) but after analysis of Hermes Agent's architecture, the user decided to use Hermes-inspired patterns built natively. Hermes has proven the model: skill system, MCP integration, subagent spawning, persistent memory with FTS5, compression-based context management.

---

## Agentic Architecture — Agent Composition

| Option | Description | Selected |
|--------|-------------|----------|
| 4 agents | Orchestrator + Search + Risk + Pattern | |
| 6 agents | + Incident + DoorControl | ✓ |
| Dynamic agents | Orchestrator spawns subagents on demand | |

**User's choice:** 6 specialized agents — SecurityOrchestrator, EventSearchAgent, RiskAnalysisAgent, PatternDetectionAgent, IncidentAgent, DoorControlAgent.

**Notes:** Granular specialization allows each agent to have focused skills and tools. Orchestrator handles planning and delegation.

---

## Agentic Architecture — Skill System

| Option | Description | Selected |
|--------|-------------|----------|
| Skill Registry TS | @Skill() decorator on classes, auto-registration | ✓ |
| Skills markdown | .agentskills.io format, LLM-readable | |
| NestJS services | Direct DI, no abstraction layer | |

**User's choice:** Skill Registry TypeScript with `@Skill()` decorator, JSON manifest, auto-registration. Compatible with agentskills.io open standard.

---

## Agentic Architecture — MCP Protocol

| Option | Description | Selected |
|--------|-------------|----------|
| MCP servers | Tools exposed via Model Context Protocol | ✓ |
| DI NestJS directe | Agents call NestJS services directly | |
| Hybride MCP + DI | MCP for exposed domains, DI for internal | |

**User's choice:** Full MCP servers by domain (events.mcp, doors.mcp, risk.mcp, cameras.mcp). Standard open protocol for interoperability.

---

## Agentic Architecture — Model Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Llama 3.1 8B | Lightweight, good tool calling | |
| Hermes 2 Pro | Native function calling format | |
| Per-agent models | Different models per responsibility | ✓ |

**User's choice:** Model per agent responsibility. Qwen 3 VL for all vision/multimodal tasks. Llama 3.1 8B for text agents. Must support vision, video, and audio (multimodal). In 2026 this is standard.

**Additional detail:** User specified: Qwen 3 VL for vision, YOLOv12 (Ultralytics) for 30 FPS object detection, ByteTrack for cross-frame ID tracking, YAMNet (TensorFlow Hub) for continuous audio analysis, Faster-Whisper for low-latency transcription, PyAV/OpenCV for RTSP stream capture, PyAudio/SoundFile for audio capture, Qdrant Python client for semantic search, vLLM for model serving, FastAPI for backend.

---

## Agentic Architecture — Memory

| Option | Description | Selected |
|--------|-------------|----------|
| Mémoire persistante | Redis + FTS5 + pgvector | ✓ |
| Mémoire de session | In-memory only | |
| Mémoire vectorielle | pgvector embeddings only | |

**User's choice:** Persistent multi-level memory like Hermes Agent. Redis for short-term conversation, FTS5 for cross-session search, pgvector for semantic memory.

---

## Agentic Architecture — NestJS Integration

| Option | Description | Selected |
|--------|-------------|----------|
| NestJS natif | Module in apps/api, same process | ✓ |
| Microservice séparé | Separate NestJS app, REST + MCP | |

**User's choice:** Native NestJS integration — module `AiAgentModule` within `apps/api`. No separate service.

---

## Agentic Architecture — Coordination

| Option | Description | Selected |
|--------|-------------|----------|
| ReAct loop | Think → act → observe sequentially | |
| Parallèle + agrégation | Promise.all across agents | |
| Hybride | ReAct for simple, parallel for complex | ✓ |

**User's choice:** Hybrid — orchestrator detects complexity and uses ReAct for simple queries, parallel delegation with Promise.all aggregation for complex multi-agent queries.

---

## Agentic Architecture — Streaming

| Option | Description | Selected |
|--------|-------------|----------|
| WebSocket | Socket.IO bidirectional | |
| SSE | Server-Sent Events unidirectional | ✓ |
| Polling | Periodic API calls | |

**User's choice:** SSE (Server-Sent Events) for streaming agent responses to dashboard. Simpler than WebSocket for unidirectional chat.

---

## Agentic Architecture — Migration from AiService

| Option | Description | Selected |
|--------|-------------|----------|
| Remplacement complet | Replace all AiService | |
| Coexistence | Keep stable parts, add agentic layer | ✓ |
| Nouveau endpoint | Side-by-side, no touching existing | |

**User's choice:** Coexistence — keep risk scoring cron, pattern detection cron, and embeddings pipeline. Agentic system wraps/replaces chat, NL query, and incident summary paths.

---

## Agentic Architecture — Communication

| Option | Description | Selected |
|--------|-------------|----------|
| EventEmitter | NestJS @OnEvent pattern | ✓ |
| Injection directe | NestJS DI between agents | |
| BullMQ queues | Job queues for agent tasks | |

**User's choice:** NestJS EventEmitter for inter-agent communication. Already used in AiService (@OnEvent pattern for access events → embed-event).

---

## Agentic Architecture — Multi-Modal Routing

| Option | Description | Selected |
|--------|-------------|----------|
| Routage automatique | Best model per task | |
| Modèle unique | One multimodal model for everything | |
| Par responsabilité | Vision for orchestrator + DoorControl, text for others | ✓ |

**User's choice:** Qwen 3 VL for all vision tasks. YOLOv12 + ByteTrack for real-time detection pipeline. Text agents use Llama 3.1 8B. Ollama for dev, vLLM for prod.

---

## AI Pipeline — Python/TypeScript Split

| Option | Description | Selected |
|--------|-------------|----------|
| AI Preprocessor étendu | Add YOLOv12, YAMNet, Whisper to existing FastAPI | ✓ |
| Service Python dédié | New separate service | |
| Remplacement preprocessor | Replace current with new stack | |

**User's choice:** Extend existing AI Preprocessor (FastAPI) with YOLOv12, ByteTrack, YAMNet, Faster-Whisper. vLLM for Qwen 3 VL serving. NestJS agents call Python services via API REST/MCP.

---

## AI Pipeline — Vector Database

| Option | Description | Selected |
|--------|-------------|----------|
| Les deux | Qdrant for search, pgvector for event pipeline | ✓ |
| Qdrant only | Migrate everything to Qdrant | |
| pgvector only | Keep existing, no Qdrant | |

**User's choice:** Both — Qdrant for semantic search index and agent memory, pgvector for existing event_embeddings pipeline.

---

## AI Pipeline — Model Serving

| Option | Description | Selected |
|--------|-------------|----------|
| Les deux | Ollama for text, vLLM for VL | ✓ |
| vLLM only | Replace Ollama entirely | |
| Ollama only | Keep everything on Ollama | |

**User's choice:** Both — Ollama for development (text LLM + embeddings + Qwen VL in dev). vLLM for production Qwen VL serving. No GPU space for vLLM currently, Ollama used during development.

---

## AI Pipeline — Qdrant Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Collections métier | events, incidents, zones, patterns | |
| Collection unique | Single collection with tags | |
| Hybride pgvector/Qdrant | pgvector for events, Qdrant for search + knowledge | ✓ |

**User's choice:** Hybrid — pgvector retains event_embeddings, Qdrant handles search_index and knowledge collections.

---

## AI Pipeline — Audio Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Complet | YAMNet continuous + Faster-Whisper transcription | ✓ |
| Whisper only | Transcription only, no continuous audio | |
| On-demand via agents | Tools accessible but no pipeline | |

**User's choice:** Full audio pipeline — YAMNet runs continuously on camera audio streams (detects glass breaks, shouts, alarms). Faster-Whisper transcribes guard voice messages from mobile chat.

---

## AI Pipeline — YOLOv12 Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Remplace VLM | YOLOv12 replaces frame-by-frame VLM analysis | ✓ |
| Two-tier | YOLOv12 fast + VLM deep on detection | |
| Parallèle | Both systems running simultaneously | |

**User's choice:** YOLOv12 + ByteTrack replaces the existing VLM per-frame analysis. 30 FPS real-time detection. Qwen 3 VL only called when detection fires.

---

## AI Pipeline — Embedding Model

| Option | Description | Selected |
|--------|-------------|----------|
| Nomic + Qwen | Keep nomic for pgvector, Qwen for Qdrant | ✓ |
| Qwen only | Migrate everything to Qwen embeddings | |
| Nomic only | Keep existing, no change | |

**User's choice:** Both — nomic-embed-text for existing pgvector pipeline (backward compatibility), Qwen embeddings for new Qdrant collections.

---

## Agentic Architecture — Observability

| Option | Description | Selected |
|--------|-------------|----------|
| Tracing complet | Agent traces in PostgreSQL, admin dashboard | ✓ |
| Logging simple | Console.log only | |
| Langfuse/LangSmith | External LLM tracing platform | |

**User's choice:** Custom PostgreSQL tracing table with admin dashboard. Tool calls logged with input, output, agent, timing, org context. No external dependency.

---

## Agentic Architecture — Feature Gates

| Option | Description | Selected |
|--------|-------------|----------|
| Tiered features | Starter: search+summaries, Pro: +risk+patterns, Enterprise: +full agent | |
| Tout ou rien | Binary feature flag | |
| IA pour tous | Available on all tiers | ✓ |

**User's choice:** IA available on all license tiers. No feature gating. Differentiation is device limits and support, not AI capabilities.

---

## Agentic Architecture — Fallback/Degradation

| Option | Description | Selected |
|--------|-------------|----------|
| Graceful + retry | Show "IA indisponible" with retry button | |
| Fallback mode | Use cached values, deterministic rules without AI | ✓ |
| Error only | Show error, no degradation logic | |

**User's choice:** Fallback mode — risk/pattern cron jobs use last cached values, assistant responds with retry button, embeddings queued. Core security operations (doors, alerts) continue unaffected.

---

## Agentic Architecture — Learning

| Option | Description | Selected |
|--------|-------------|----------|
| Feedback loop | Skills improve from usage | |
| Statique | No auto-learning, manual improvement | ✓ |

**User's choice:** Skills are static. No automatic learning from usage. Prompts and tools improved manually by developers. More predictable for security operations.

---

## Agentic Architecture — Prompts

| Option | Description | Selected |
|--------|-------------|----------|
| DB + admin UI | PromptTemplate model, editable via dashboard | |
| Fichiers .md | Git-versioned markdown files | ✓ |
| Hybride | System prompts in .md, dynamic prompts generated | |

**User's choice:** System prompts in `.md` files under `apps/api/src/modules/ai-agent/prompts/` — version-controlled via git, reviewed in PRs.

---

## Agentic Architecture — Resilience

| Option | Description | Selected |
|--------|-------------|----------|
| Retry + fallback | Retry with corrected params, fallback agent | |
| Fail transparent | Report error to user, continue with partial results | ✓ |
| Circuit breaker | Disable failing tool after 3 errors | |

**User's choice:** Fail transparent — tool call failures reported to user with error detail. No automatic retry. Agent continues with partial results.

---

## Agentic Architecture — Security Isolation

| Option | Description | Selected |
|--------|-------------|----------|
| RBAC per tool | Each tool has role requirement | |
| Tenant + RBAC | JWT orgId + role passed to every agent | ✓ |
| Org-level only | Trust at organization level | |

**User's choice:** Tenant + RBAC — JWT `organizationId` + `role` passed to every agent. Prisma Client Extension auto-scopes all DB queries.

---

## Agentic Architecture — Rate Limiting

| Option | Description | Selected |
|--------|-------------|----------|
| Limites explicites | Fixed limits for all users | |
| Pas de limite | No rate limiting | |
| Par rôle | OPERATOR 5/min, SUPERVISOR 15/min, ADMIN 30/min | ✓ |

**User's choice:** Rate limits per role — prevents Ollama saturation. Uses existing @fastify/rate-limit + Redis.

---

## Agentic Architecture — Context Management

| Option | Description | Selected |
|--------|-------------|----------|
| Résumé + mémoire | Auto-summarize + persistent memory | |
| Fenêtre glissante | Last 20 messages only | |
| Compression LLM | LLM summarizes history at token threshold | ✓ |

**User's choice:** Compression via LLM summarization but at ~16000 tokens (not 4000 — too low for agentic workflows). Orchestrator summarizes conversation when threshold reached.

---

## Dashboard UI — Main Page

| Option | Description | Selected |
|--------|-------------|----------|
| Remplacement /ia | Replace current AI page with agent chat | |
| Coexistence pages | Keep /ia and add /ia/agent | |
| Command Center | New unified page with chat + cameras + risk | ✓ |

**User's choice:** Command Center — new page `/command-center` unifying chat with orchestrator, live camera grid, and risk dashboard. Replaces existing `/ia`.

---

## Dashboard UI — Risk Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Intégration AI | "Expliquer" button → AI explanation streamed | ✓ |
| Séparé | Risk page separate from AI chat | |
| Refonte | Complete risk page rebuild with embedded chat | |

**User's choice:** Add "Expliquer" button on existing `/risque` page. Calls RiskAnalysisAgent, streams explanation via SSE.

---

## Dashboard UI — Patterns Page

| Option | Description | Selected |
|--------|-------------|----------|
| Étendre page existante | Add 3 patterns to maintenance page | |
| Page dédiée | New `/patterns` page | ✓ |
| Dans le chat | Patterns notifications in agent chat | |

**User's choice:** New dedicated `/patterns` page with all 8 patterns (5 existing + 3 new), trend visualization, and links to agent chat for analysis.

---

## Mobile — Chat Capabilities

| Option | Description | Selected |
|--------|-------------|----------|
| Chat simplifié | Basic Q&A, quick actions | |
| Chat complet | Full agent capabilities, streaming, voice | ✓ |
| Pas de chat | Mobile stays quick-actions only | |

**User's choice:** Full chat in "More" tab — streaming, voice input (Faster-Whisper), contextual actions, guard-first UI.

---

## Migration — Plan Structure

| Option | Description | Selected |
|--------|-------------|----------|
| 3 waves | Backend → Dashboard → Mobile + integration | ✓ |
| Plan unique | Everything in one plan | |
| 2 waves | Backend → Frontend | |

**User's choice:** 3 waves — Wave 1 (agents + AI Preprocessor + Qdrant), Wave 2 (Command Center + patterns + risk UI), Wave 3 (mobile chat + SSE + fallback).

---

## Qdrant — Deployment

| Option | Description | Selected |
|--------|-------------|----------|
| Docker service | Self-hosted in docker-compose | ✓ |
| Qdrant Cloud | Managed service | |
| pgvector only | Skip Qdrant entirely | |

**User's choice:** Docker service self-hosted in docker-compose.yml. Consistent with project's self-hosted ethos.

---

## i18n — Assistant Language

| Option | Description | Selected |
|--------|-------------|----------|
| Multilingue | French primary + English + Spanish | ✓ |
| Français only | Single language | |
| Anglais only | LLM performs best in English | |

**User's choice:** Multilingual — detects user language, responds in kind. French primary, English, Spanish. System prompts default to French.

---

## Auto-Summaries — Trigger Points

| Option | Description | Selected |
|--------|-------------|----------|
| Auto sur résolution | Generate on incident.resolved | |
| Résolution + escalade | Generate on both resolved and escalated | ✓ |
| Manuel seulement | On-demand only | |

**User's choice:** Auto-summaries triggered on both `incident.resolved` and `incident.escalated`. Each escalation gets an interim summary for the operator taking over.

---

## ChatModule Legacy — Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Remplacer | Replace with DoorControlAgent + Qwen 3 VL | ✓ |
| Garder séparé | Keep for backward compatibility | |
| Supprimer | Remove entirely | |

**User's choice:** Replace ChatModule with DoorControlAgent + Qwen 3 VL. Old `/api/chat` endpoint becomes proxy to orchestrator.

---

## Proactive Assistant

| Option | Description | Selected |
|--------|-------------|----------|
| Proactive | Notify operator of critical events | ✓ |
| Réactif uniquement | Only respond to questions | |
| Critique seulement | Proactive only for critical severity | |

**User's choice:** Proactive — notifies operator via dashboard toast + chat message for critical events (risk > 70, multiple forced doors). Configurable thresholds.

---

## Privacy — Conversation Data

| Option | Description | Selected |
|--------|-------------|----------|
| Chiffré + purge 90j | Encrypted at rest, auto-purge after 90 days | ✓ |
| Pas de persistance | In-memory only | |
| Stockage permanent | Indefinite storage for audit | |

**User's choice:** Encrypted at rest, auto-purged after 90 days. Configurable per organization.

---

## Evaluation — Testing Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Manuel | Human verification only | |
| Tests de scénarios | 10-20 predefined security scenarios | |
| Évaluation quantitative | Metrics: accuracy, hallucination rate, tool success | ✓ |

**User's choice:** Quantitative evaluation with metrics (accuracy, hallucination rate, tool call success rate, response latency). Dataset with ground truth for NL search and summaries.

---

## Agent Discretion

Areas where implementation details are left to agent judgment:

- Exact prompt wording per agent (follow Hermes patterns, adapt to security domain)
- Skill Registry decorator API design (`@Skill({ name, description, inputSchema })` with Zod)
- Qdrant collection schema (vector dimensions, payload structure)
- YOLOv12 model size and confidence thresholds (default 0.45, per-org configurable)
- ByteTrack tracking parameters (max age, min hits)
- YAMNet class mapping to alert types
- Command Center exact layout and component tree (Phase 6 design system patterns)
- SSE event format and reconnection strategy
- Agent trace table schema
- Conversation encryption implementation
- Evaluation dataset composition
- Pattern SQL query optimization for new pattern types
- MCP server implementation details (transport, tool discovery)
- Skill auto-discovery mechanism in SkillRegistry

---

## Deferred Ideas

| Idea | Reason | Destination |
|------|--------|-------------|
| vLLM production deployment | No GPU infrastructure currently | Post-launch ops |
| Nous Portal integration | External dependency, self-hosted preferred | Future evaluation |
| Skill self-improvement loop | Stability over adaptability for security | Post-v2.0 |
| Langfuse/LangSmith observability | External dependency | Future evaluation |
| Full Command Center (door map, alert stream, incident queue) | Phase 10 scope | Phase 10 |
| Agent marketplace | Premature for platform size | Post-v2.0 |
| Multi-agent debate/consensus | Adds latency and cost | Research only |
| Custom security model training | Requires dataset curation | Post-launch |
| MCP server auto-discovery | Complexity vs. explicit registration | Future iteration |
| Agent A/B testing framework | Overengineering for Phase 9 | Post-launch |
