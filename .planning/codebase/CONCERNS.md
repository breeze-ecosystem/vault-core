# Codebase Concerns

**Analysis Date:** 2026-07-17

## Technical Debt

| Area | Issue | Impact | Priority | Location |
|------|-------|--------|----------|----------|
| **Monolithic API client** | `api.ts` is a 2900-line monofile mixing type definitions, API functions, and business logic for the entire dashboard | Maintainability: any change requires navigating a massive file; encourages copy-paste; high merge conflict surface | High | `apps/dashboard/lib/api.ts` |
| **Duplicate notification modules** | Two separate module directories exist for notifications with near-identical responsibilities | Confusion about which module is active; risk of split logic; unnecessary complexity | High | `apps/api/src/modules/notification/` vs `apps/api/src/modules/notifications/` |
| **Massive service files** | Several service files exceed 500 lines, mixing query logic, state machines, and event handling | Reduced readability; difficult to test in isolation; single-responsibility violation | Medium | `apps/api/src/modules/ai/ai.service.ts` (742 lines), `apps/api/src/modules/incident/incident.service.ts` (728 lines), `apps/api/src/modules/door/door.service.ts` (598 lines), `apps/api/src/modules/analytics/analytics.service.ts` (517 lines), `apps/api/src/modules/notifications/notifications.service.ts` (525 lines) |
| **Deferred implementations across codebase** | Multiple features have stub implementations with TODO comments marking deferred logic | Incomplete features shipped; edge cases not handled; future rework required | High | See "Known Stubs" section below |
| **Dual validation burden** | Both Zod schemas (`packages/shared/`) and class-validator DTOs (`apps/api/src/common/dto/`) must be kept in sync | Maintenance overhead; risk of validation drift between shared schemas and API DTOs | Medium | `packages/shared/src/schemas/` and `apps/api/src/common/dto/index.ts` |
| **Bidirectional state machine duplication** | Door state machine logic appears both in `door.service.ts` and a separate `door-state-machine.ts` module | Risk of logic divergence; unclear responsibility boundary | Medium | `apps/api/src/modules/door/door.service.ts`, `apps/api/src/modules/door/door-state-machine.ts` |
| **Type safety violations with `as any`** | Several areas use `(req as any).apiKeyInfo` and `Record<string, unknown>` where clauses instead of proper typed extensions | Runtime errors masked by type erasure; no compile-time safety | Medium | `apps/api/src/modules/api-key/v1.controller.ts` (lines 49, 71, 137, 204, 264-270, 308), `apps/api/src/modules/api-key/guards/tenant-api-key.guard.ts` (line 106) |
| **Session storage for JWT tokens** | Dashboard stores access tokens and user data in `sessionStorage` | XSS-vulnerable; no httpOnly protection; tokens persist in browser memory | High | `apps/dashboard/lib/auth-client.ts` (lines 39-43) |
| **Rate limiter fails open** | When Redis is unavailable, the per-key rate limiter in TenantApiKeyGuard logs a warning but allows the request through | Rate limit bypass during Redis outages | Medium | `apps/api/src/modules/api-key/guards/tenant-api-key.guard.ts` (lines 88-89) |
| **Global rate limiter double-counting** | Both Fastify global rate limiter and TenantApiKeyGuard per-key rate limiter apply to v1 endpoints | Stricter rate limiting than intended on v1 routes | Low | `apps/api/src/main.ts` (lines 51-55), `apps/api/src/app.module.ts` (lines 122-126) |
| **AI Agent module has no tests** | The 37-file AI Agent module has zero unit or integration tests | High risk of regressions; no safety net for AI agent refactors | Critical | `apps/api/src/modules/ai-agent/` |

### Known Stubs / Deferred Implementations

| Stub | Location | Details |
|------|----------|---------|
| Door remote control | `apps/api/src/modules/api-key/v1.controller.ts:122` | `// TODO: delegate to DoorService.remoteControl() in full implementation` |
| Incident status update | `apps/api/src/modules/api-key/v1.controller.ts:243` | `// TODO: full validation via Zod schema in production` |
| Confirmation token validation | `apps/api/src/modules/ai-agent/guardrails/action-confirmation.guard.ts:84` | `// TODO (future): Validate the confirmation token against a Redis-stored pending action` |
| Qdrant vector DB wiring | `apps/api/src/modules/ai-agent/memory/conversation.memory.ts:98` | `// TODO (Plan 06): Wire Qdrant client` |
| Edge agent camera data | `edge/agent/agent.py:295` | `# TODO: query local API for real camera data` |
| Edge agent alert data | `edge/agent/agent.py:300` | `# TODO: query local API for real alert data` |
| AI agent skill count | `apps/api/src/modules/ai-agent/sse/chat.controller.ts:100` | Hardcoded `skillsRegistered: 0` |

## Known Bugs / Issues

| Issue | Component | Severity | Status | Location |
|-------|-----------|----------|--------|----------|
| **Encryption key not validated** | SSO Service | High | Unconfirmed | `apps/api/src/config/configuration.ts:65-66` |
| `ENCRYPTION_KEY` can be empty string; `sso.service.ts` stores clientSecret in plaintext when missing | | | | `apps/api/src/modules/sso/sso.service.ts:88-98` |
| **CSP disabled outside production** | API Server | Medium | Acknowledged | `apps/api/src/main.ts:44` |
| `contentSecurityPolicy` is set to `false` unless `NODE_ENV === 'production'` | | | | |
| **CORS defaults to wildcard** | Docker Compose | Medium | Acknowledged | `docker-compose.yml:33` |
| Production compose sets `CORS_ORIGIN` default to `*` | | | | |
| **V1 controller uses untyped request** | V1 API Controller | Low | Acknowledged | `apps/api/src/modules/api-key/v1.controller.ts:49` |
| `(req as any).apiKeyInfo` bypasses type checking | | | | |
| **Audit log `userId` coercion** | Audit Interceptor | Low | Acknowledged | `apps/api/src/modules/audit/audit.interceptor.ts:49` |
| Falls back to `"system"` when no user — may miss broken auth | | | | |
| **Mobile API URL default** | Mobile Config | Low | Unconfirmed | `apps/mobile/lib/config.ts:25` |
| Falls back to `http://localhost:4000/api` — will not work in production | | | | |
| **Edge agent `container_running()` returns False when Docker unavailable** | Edge Agent | Low | Acknowledged | `edge/agent/agent.py:126` |
| All services show as offline if Docker API is inaccessible | | | | |
| **Non-blocking update promise fire-and-forget** | Tenant API Key Guard | Low | Acknowledged | `apps/api/src/modules/api-key/guards/tenant-api-key.guard.ts:96-103` |
| `lastUsedAt` update uses `.catch()` with no logging of unhandled promise rejections | | | | |

## Security Concerns

| Concern | Area | Risk | Notes |
|---------|------|------|-------|
| **Optional encryption key** | SSO / Configuration | HIGH | `ENCRYPTION_KEY` defaults to `""` in config. The SSO service conditionally encrypts `clientSecret` via `pgp_sym_encrypt` only if the key is non-empty. Without it, client secrets are stored in plaintext in the database. The validation schema (`validation.ts`) does not require this key. |
| **Session storage token persistence** | Dashboard Auth | HIGH | Access tokens stored in `sessionStorage` (`apps/dashboard/lib/auth-client.ts:39`). Any XSS vulnerability can exfiltrate tokens. No httpOnly/cookie-based token for dashboard sessions. |
| **Rate limiter fail-open** | API Key Guard | MEDIUM | When Redis is unreachable, the per-key rate limiter silently allows all requests through (`tenant-api-key.guard.ts:88-89`). |
| **SSO JIT provisioning without auth** | SSO Service | MEDIUM | `findOrCreateSsoUser` auto-creates users from external IdP data if they don't exist. If the IdP mapping is misconfigured or compromised, arbitrary users can be JIT-provisioned. |
| **Helmet CSP disabled** | API Server | LOW | CSP is disabled outside production. In development/staging, the app is more vulnerable to XSS. |
| **Unvalidated redirects in dashboard** | Dashboard API Client | LOW | The `fetchWithAuth` (implied) auto-redirects to `/login` on 401. If an attacker can trigger a 401 on a crafted request, they can force redirect. |
| **SSH private key not found** | Docker Compose | LOW | Dockerfile mounts `/app/secrets/license-private.pem`. If this file doesn't exist, the container may fail to start (`docker-compose.prod.yml:78`). |

## Performance Issues

| Issue | Component | Impact | Location |
|-------|-----------|--------|----------|
| **ffmpeg spawn per frame capture** | Ingestion Service | MEDIUM | `apps/api/src/modules/ingestion/ingestion.service.ts:174` — Each `captureRtspFrame()` spawns a new ffmpeg process. This is CPU/IO intensive (10s timeout per frame). Camera prompts trigger inference which takes ~3min/frame on CPU per the code comments. |
| **In-memory streams map unbounded** | Ingestion Service | LOW | `ingestion.service.ts:15` — `ActiveStream` processes and timers accumulate per camera with no max limit. A large number of cameras could exhaust Node.js event loop resources. |
| **No request timeout on v1 endpoints** | V1 API Controller | LOW | v1 controller endpoints don't set timeouts; long Prisma queries could block. |
| **Prompt loading at construction** | Orchestrator Service | LOW | `orchestrator.service.ts:32` — Loads prompt files synchronously from filesystem at class construction time. If prompts are missing, the service fails at boot. |
| **Redis `KEYS` in conversation purge** | Conversation Memory | MEDIUM | `conversation.memory.ts:112` — Uses `redis.keys()` which is O(N) and blocks Redis on large datasets. Should use `SCAN` instead. |
| **AI inference queue bottleneck** | Ingestion + Queue | MEDIUM | Code comment at `ingestion.service.ts:69` notes that each inference takes ~3min on CPU. Queue is limited to 3 waiting jobs per camera. |
| **Large i18n dictionaries** | Dashboard | LOW | `fr.ts` and `en.ts` are both 811 lines each. This is manageable but could grow. |

## Fragile Areas

| Area | Reason | Risk | Location |
|------|--------|------|----------|
| **AI Agent module** | New module with 37 files, zero tests, multiple deferred implementations (Qdrant, confirmation tokens, skills registration), tightly coupled to Ollama availability | If Ollama is down, the entire agent module returns errors. No graceful degradation path for most operations. | `apps/api/src/modules/ai-agent/` |
| **Ingestion Service** | Spawns subprocesses (ffmpeg) that can leak; in-memory state not recoverable after crash; camera state (isRecording) can get out of sync with actual running streams | Stream state desync on restart; zombie ffmpeg processes; missed frame captures | `apps/api/src/modules/ingestion/ingestion.service.ts` |
| **V1 Public API** | New controller with stubbed methods, untyped request accessors, no rate limit isolation, no documentation on concurrency limits | Breaking changes if stubs are later implemented with different signatures; undocumented behavior | `apps/api/src/modules/api-key/v1.controller.ts` |
| **Edge Agent** | Runs as long-lived Python process with Docker API dependency; schedule-based (not event-driven); camera/alert data is stubbed returning zeros | Edge reporting meaningless data for cameras/alerts; Docker API version mismatch; no reconnect logic for supervision URL | `edge/agent/agent.py` |
| **MQTT Service** | Connection setup in `onModuleInit` with fire-and-forget error handling; if MQTT broker is down at boot, transport is permanently disabled for the container lifetime | Door controller communication silently disabled on deploy if broker is unavailable | `apps/api/src/mqtt/mqtt.service.ts` |
| **SSR / CSP bypass** | `main.ts:44` disables CSP for non-production. If staging uses same config, XSS vector exists | Cross-site scripting in non-production environments | `apps/api/src/main.ts:44` |
| **License service** | Mounts `secrets/license-private.pem` from host; if file is missing or invalid, license operations fail silently | License validation failures hard to diagnose | `docker-compose.prod.yml:78` |
| **Multiple Redis connections** | Several services inject different Redis instances (`REDIS`, `REDIS_AGENT`, `REDIS_INCIDENT`) | Connection pool management; potential connection leaks if not properly configured | `apps/api/src/modules/ai-agent/memory/conversation.memory.ts:13`, `apps/api/src/modules/incident/incident.service.ts:18`, `apps/api/src/modules/door/door.service.ts:49` |
| **Large single API client** | `api.ts` at 2900 lines in dashboard is a single point of failure for all API communication | Changes to API types affect all dashboard features; merge conflicts common; hard to review | `apps/dashboard/lib/api.ts` |

## Improvement Opportunities

| Opportunity | Area | Effort | Impact |
|-------------|------|--------|--------|
| **Split dashboard API client into domain modules** | Dashboard | Medium | High — 2900-line file reduced to manageable domain-specific modules (camera.api.ts, alert.api.ts, etc.) |
| **Add test coverage to AI Agent module** | API Tests | High | High — 37 files with zero tests is a significant risk for a critical feature |
| **Add test framework to Dashboard and Mobile** | Testing Infrastructure | High | High — zero tests across two entire applications |
| **Implement Qdrant vector storage** | AI Agent Memory | Medium | High — semantic memory is currently Redis-only; vector search enables long-term agent recall |
| **Add ENCRYPTION_KEY validation** | Configuration | Low | High — prevents accidental storage of plaintext SSO client secrets |
| **Move access token to httpOnly cookie** | Dashboard Auth | Medium | High — eliminates XSS token theft vector |
| **Implement proper confirmation token validation** | AI Agent Guardrails | Medium | High — destructive action confirmation is currently token-presence only |
| **Replace Redis KEYS with SCAN** | Conversation Memory | Low | Medium — prevents Redis blocking on large conversation datasets |
| **Add ffmpeg process cleanup and health checks** | Ingestion Service | Medium | Medium — prevents zombie processes and stream desync |
| **Consolidate dual notification modules** | API Modules | Low | Medium — resolves confusion between `notification` and `notifications` |
| **Add CSP policy for development mode** | API Server | Low | Medium — improves XSS protection in all environments |
| **Add typed request extensions for v1 controller** | V1 API | Low | Medium — eliminates unsafe `as any` casts |
| **Split large service files (>500 lines)** | API Services | High | Medium — improves maintainability of 6+ over-large service files |
| **Implement edge agent real camera/alert queries** | Edge Agent | Medium | Medium — currently reports zeros for all camera and alert statistics |
| **Add MQTT reconnection resilience** | MQTT Service | Low | Medium — transport disabled for full container lifetime if broker unavailable at boot |
| **Reduce test gap across 34 untested modules** | API Tests | High | Very High — only 5 of 39 API modules have tests |

## Test Coverage Gaps

| Untested Area | What's Not Tested | Files | Risk | Priority |
|---------------|-------------------|-------|------|----------|
| AI Agent (37 files) | All agents, guards, LLM provider, MCP servers, orchestrator, conversation memory, Qdrant service | `apps/api/src/modules/ai-agent/**/*.ts` | Regressions in agent logic break operator workflows undetected | Critical |
| Dashboard (entire app) | All React components, API client functions, auth context, i18n | `apps/dashboard/**/*.ts`, `apps/dashboard/**/*.tsx` | UI regressions and API integration bugs undetected | High |
| Mobile (entire app) | All screens, components, API client, auth storage | `apps/mobile/**/*.ts`, `apps/mobile/**/*.tsx` | Mobile app crashes undetected before release | High |
| SSO Module | OIDC/SAML strategies, JIT provisioning, config encryption | `apps/api/src/modules/sso/**/*.ts` | Auth bypass or SSO misconfiguration | High |
| Door Module (partial) | State machine, MQTT handlers, forced-door detection | `apps/api/src/modules/door/door.service.ts`, `apps/api/src/modules/door/door-state-machine.ts` | Physical security logic failures | High |
| V1 Public API | All endpoints, rate limiting, key validation | `apps/api/src/modules/api-key/**/*.ts` | Public API contract violations | Medium |
| Webhook Module | SSRF protection, delivery retries, HMAC verification | `apps/api/src/modules/webhook/**/*.ts` | SSRF bypass or webhook delivery failures | Medium |
| Ingestion Service | FFmpeg capture, queue backpressure, stream lifecycle | `apps/api/src/modules/ingestion/ingestion.service.ts` | Video pipeline failures | Medium |
| Audit Module | Interceptor, processor, chain hashing, immutable log | `apps/api/src/modules/audit/**/*.ts` | Audit log integrity violations | Medium |
| MQTT Service | Connection lifecycle, message routing, sequence validation | `apps/api/src/mqtt/mqtt.service.ts` | Door controller communication failures | Medium |
| Compliance, License, Governance | Report generation, license validation, policy enforcement | `apps/api/src/modules/compliance/`, `apps/api/src/modules/license/`, `apps/api/src/modules/governance/` | Regulatory failures | Medium |

---

*Analysis performed via automated codebase review: 2026-07-17*
