---
phase: 02-operational-ai
plan: 05
type: execute
subsystem: ai
tags: [langchain, ollama, pgvector, embeddings, semantic-search, rag, nlp]
requires: [02-04]
provides: [AI-01, AI-02, AI-03]
affects: [apps/api, apps/dashboard, packages/shared]
tech-stack:
  added:
    - "@langchain/community@1.1.29"
    - "@langchain/core@1.2.2"
    - "pgvector@0.3.0"
    - pgvector extension
  patterns:
    - "NL→structured query via Ollama LLM with structured JSON output"
    - "pgvector cosine similarity search for RAG event retrieval"
    - "BullMQ ai-summaries queue for async embedding + summary generation"
    - "Event bus listeners trigger non-blocking embedding generation"
key-files:
  created:
    - apps/api/migrations/timescaledb/up/012_event_embeddings.sql
    - apps/api/src/modules/ai/ai.module.ts
    - apps/api/src/modules/ai/ai.controller.ts
    - apps/api/src/modules/ai/ai.service.ts
    - apps/api/src/modules/ai/ai.processor.ts
    - packages/shared/src/schemas/ai.schema.ts
    - packages/shared/src/types/ai.types.ts
    - apps/dashboard/app/(dashboard)/ia/page.tsx
  modified:
    - packages/shared/src/index.ts
    - apps/api/src/config/configuration.ts
    - apps/api/src/app.module.ts
    - apps/api/src/modules/queue/queue.module.ts
    - apps/api/package.json
    - pnpm-lock.yaml
    - apps/dashboard/lib/api.ts
    - apps/dashboard/lib/nav-config.ts
    - apps/dashboard/lib/i18n/dictionaries/fr.ts
    - apps/dashboard/lib/i18n/dictionaries/en.ts
decisions: []
metrics:
  duration: ~15min
  completed_date: "2026-07-14"
  tasks: 3
  files_created: 8
  files_modified: 10
---

# Phase 2 Plan 05: AI Natural Language Features

**One-liner:** LangChain + Ollama integration, pgvector event embeddings for semantic search, AI-powered incident closure summaries, and natural language query interface with three-mode dashboard.

## Build Summary

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Database Infrastructure, Packages & Shared Types | `b4e37bb` | 10 files — migration SQL, config, module registration, shared types/schemas |
| 2 | AI Service — NL Query, Summaries & Assistant | `1acbbf2` | 3 files — ai.service.ts, ai.controller.ts, ai.processor.ts |
| 3 | AI Assistant Dashboard | `06327d5` | 5 files — page.tsx, api.ts, nav-config, i18n dictionaries |

## What Was Built

### Task 1: Foundation
- **TimescaleDB migration** (`012_event_embeddings.sql`): Creates `event_embeddings` hypertable with `VECTOR(768)` column for Ollama nomic-embed-text embeddings, HNSW index for cosine similarity search, 7-day chunk interval, and site+time index
- **pgvector extension** setup: `CREATE EXTENSION IF NOT EXISTS vector;` included in migration file
- **Configuration**: Added `ai:` section with `ollamaModel`, `embeddingModel`, `summaryModel` to configuration.ts
- **Shared types**: `AIQueryResult`, `AIQuerySpec`, `IncidentSummaryDto`, `AssistantResponse`, `TimelineEntry`
- **Shared schemas**: `aiQuerySchema`, `aiAssistantSchema`, `aiSummarizeSchema` with Zod validation
- **Module registration**: `AiModule` registered in AppModule, `ai-summaries` queue registered in QueueModule
- **Packages**: `@langchain/community@1.1.29`, `@langchain/core@1.2.2`, `pgvector@0.3.0` installed

### Task 2: AI Module
- **AiService.naturalLanguageQuery()**: Sends user query to Ollama with structured system prompt, parses JSON output into filter spec, executes parameterized TimescaleDB queries across `access_events`, `door_state_log`, and `vehicle_events` hypertables, returns matched events with summary
- **AiService.generateIncidentSummary()**: Fetches full incident context (comments, evidence, status history, assignee), sends to Ollama for structured summary generation in JSON format, returns summary + key events + recommended actions with graceful fallback
- **AiService.answerQuestion()** (RAG): Generates embedding for question via Ollama `/api/embeddings`, searches pgvector `event_embeddings` via cosine similarity (`<=>` operator), fetches current system state (cameras, alerts, incidents, visitors, sites), builds LLM context with similar events + system state, returns answer with source citations
- **AiService.embedEvent()**: Generates embedding via Ollama, stores in `event_embeddings` hypertable
- **Event bus listeners**: `access.granted`, `access.denied`, `door.state-changed` (abnormal only), `anpr.recognized` — each creates a descriptive summary and enqueues to `ai-summaries` queue
- **AiController**: `POST /api/ai/query` (OPERATOR+), `POST /api/ai/summarize` (SUPERVISOR+), `POST /api/ai/assistant` (OPERATOR+), `GET /api/ai/status` (ADMIN)
- **AiProcessor**: Handles `generate-summary` (calls service, stores on incident, emits event) and `embed-event` (calls service, logs result) jobs on `ai-summaries` queue
- **Security**: 15s timeout on all Ollama API calls, graceful fallback on errors, site-scoped queries, max 50 result limit, role-protected endpoints

### Task 3: Dashboard
- **AI Assistant page** at `/ia` with three tabbed modes:
  - **Requête Naturelle (NL Query)**: Chat-style interface with example query prompts, sends to `/api/ai/query`, displays results with event type, time, and summary; click results expandable
  - **Assistant IA (Conversational)**: System avatar chat interface, sends to `/api/ai/assistant`, displays answer with collapsible source citations, suggested follow-up questions
  - **Résumés d'incidents (Summaries)**: Incident selector (resolved/closed incidents), "Générer le résumé" button, displays summary card with key events and recommended actions
- **System status indicator**: Green/red dot showing Ollama connectivity from `/api/ai/status`
- **AI disclaimer**: "L'IA peut faire des erreurs. Vérifiez les informations critiques."
- **Navigation sidebar**: "Chat IA" → "Assistant IA" at `/ia`
- **i18n**: Complete French and English dictionaries for all AI UI strings

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Mitigations

| Threat ID | Category | Status |
|-----------|----------|--------|
| T-02-18 | Prompt injection | Mitigated: System prompt isolates instructions from user input; JSON parser validates structured output; no direct SQL from LLM |
| T-02-19 | Data exfiltration | Mitigated: Site-scoped by user's siteId; max 30 days lookback; max 50 results limit |
| T-02-20 | Ollama timeout | Mitigated: 15s timeout with AbortController; 2 retry attempts; graceful fallback with error message |
| T-02-21 | Hallucinated summaries | Accepted: Disclaimer displayed on UI |
| T-02-SC | Package verification | Approved per pre-verification: all 3 packages confirmed on npm registry |

## Verification

- [x] `012_event_embeddings.sql` exists with VECTOR(768), HNSW index, hypertable
- [x] Configuration.ts has `ai:` section with model configs
- [x] All shared AI types and schemas created and exported
- [x] AiModule registered in AppModule with queue registration
- [x] AiService with 4 core methods + 4 event listeners
- [x] AiController with 4 endpoints, all role-protected
- [x] AiProcessor handling generate-summary and embed-event jobs
- [x] Dashboard page at `/ia` with 3 modes, status indicator, disclaimer
- [x] Nav sidebar updated to "Assistant IA" at `/ia`
- [x] Full i18n support (French + English)
- [x] TypeScript compilation passes for `@repo/shared` and `@repo/api`
- [x] 3 commits created, one per task

## Self-Check: PASSED
