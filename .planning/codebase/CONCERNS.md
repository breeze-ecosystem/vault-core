# Codebase Concerns

**Analysis Date:** 2026-07-14

## Tech Debt

### TypeScript `any` Proliferation

- Issue: Ubiquitous use of `as any` and `any` types (~86 instances) across controllers, services, and guards, bypassing the type system.
- Files: `apps/api/src/modules/*/**.controller.ts`, `apps/api/src/modules/notifications/notifications.service.ts`, `apps/api/src/modules/supervision/supervision.service.ts`, `apps/api/src/modules/audit/audit.service.ts`, `apps/api/src/main.ts`, `apps/api/src/common/guards/jwt-auth.guard.ts`
- Impact: Loss of compile-time safety; `(req as any).user` and `(req as any).user.id` patterns on every controller action silently break if the request object structure changes. Method parameter types like `data: any` (`apps/dashboard/lib/api.ts:219`, `apps/dashboard/lib/api.ts:239`) on update functions mean callers can pass arbitrary shapes.
- Fix Approach: Create a typed `AuthenticatedRequest` interface extending `FastifyRequest` with a `user: JwtPayload` field. Apply it via a custom decorator or pipe. Replace `any` config casts with explicit Record types. Use generics for notification configs instead of `config: any`.

### Monolithic Dashboard API Layer

- Issue: `apps/dashboard/lib/api.ts` is 467 lines mixing type definitions, parameterized fetch helpers, and action functions in one file.
- Impact: Hard to discover functions, high risk of merge conflicts, functions that accept `data: any` (`updateSite`, `updateCamera`) undermine type safety.
- Fix Approach: Split into `types/` (models, DTOs), `api/` (one file per resource: cameras, alerts, sites, users, notifications, chat), and `lib/http.ts` for `fetchWithAuth` re-export.

### Notification Module Naming Confusion

- Issue: Two separate modules with overlapping names: `NotificationModule` (`apps/api/src/modules/notification/`) handling WebSocket/FCM push, and `NotificationsModule` (`apps/api/src/modules/notifications/`) handling email/webhook/in-app dispatch. The inference processor (`apps/api/src/modules/inference/inference.processor.ts`) dispatches to both.
- Impact: New developers may modify the wrong module. Both registered in `apps/api/src/app.module.ts` with no clear ownership boundary.
- Fix Approach: Consolidate into a single `notifications` module with sub-services for channels (email, push, webhook, in-app), or rename to clearly distinct names (`PushModule` vs `AlertNotificationsModule`).

### Hardcoded Seed Credentials

- Issue: `apps/api/prisma/seed.ts` contains hardcoded sample passwords: `admin123` (lines 9, 58, 61), `super123` (line 75), `viewer123` (line 89). These are embedded in the version-controlled seed file.
- Impact: If the `sample` seed mode is accidentally run in production or staging, accounts with weak, known passwords are created.
- Fix Approach: Force all passwords in seed to come from environment variables with no default fallback. For sample mode, generate random passwords and log them.

### Supervision Data In-Memory Only

- Issue: `apps/api/src/modules/supervision/supervision.service.ts` stores all client records in a `Map<string, ClientRecord>` (line 46). No persistence.
- Impact: On every API restart, all edge client registrations, supervision tokens, and last-known-good state are wiped. Edge agents must re-register and receive new tokens, which may cause gaps in monitoring until the next heartbeat auto-registration.
- Fix Approach: Persist client records to the database (add a `SupervisionClient` model to Prisma). Cache in-memory with DB as source of truth.

### Dynamic `require()` Calls in Health Controller

- Issue: `apps/api/src/modules/health/health.controller.ts` uses `require("os")` (line 30), `require("ioredis")` (line 52), `require("http")` (line 73, 107) dynamically at runtime instead of top-level imports.
- Impact: These modules aren't statically analyzable; bundlers/treeshakers can't optimize them. Creates unnecessary connections in the Redis health check that are never cleaned up (line 62 disconnects, but the client object isn't closed).
- Fix Approach: Import all modules at the top level. Use a shared Redis connection pool instead of creating a new instance per health check.

## Known Bugs

### Inference Processor Severity Mapping Ignores Prompt Config

- Symptoms: `apps/api/src/modules/inference/inference.processor.ts:103-108` maps alert severity by doing naive string matching on the prompt text (`"urgent"→CRITICAL`), completely ignoring the `severity` field that was passed in from `FrameJob.prompts` (each prompt has `.severity` from the camera prompt config).
- Files: `apps/api/src/modules/inference/inference.processor.ts:103-108`, `apps/api/src/modules/queue/queue.service.ts:10`
- Trigger: A camera prompt configured with `severity: "LOW"` but containing the word "attention" will generate a `HIGH` severity alert instead.
- Workaround: Avoid using the trigger words ("urgent", "danger", "critique", "important", "attention") in LOW-severity prompt text.

### Health Check Redis Connection Leak

- Symptoms: Each call to `GET /api/health/detailed` creates a new `ioredis` instance (`apps/api/src/modules/health/health.controller.ts:53`), disconnects it (line 62), but does not call `redis.quit()` — the client object is abandoned.
- Files: `apps/api/src/modules/health/health.controller.ts:52-62`
- Trigger: Calling the detailed health endpoint repeatedly.
- Workaround: Rate-limit health checks externally (already mitigated somewhat by global rate limiting, but the `/health` route itself is `@Public()` with no specific rate limit).

### Dashboard API URL Fallback to Empty String

- Symptoms: When `NEXT_PUBLIC_API_URL` is not configured, both `apps/dashboard/lib/auth-client.ts:4` and `apps/dashboard/lib/api.ts:6` fall back to `""`, causing all API calls to fail silently with confusing network errors rather than clear configuration errors.
- Files: `apps/dashboard/lib/auth-client.ts:1-6`, `apps/dashboard/lib/api.ts:3-6`
- Trigger: Deploying the dashboard without setting the environment variable.
- Workaround: The `console.error` on lines 2/3 warns at build time but does not prevent runtime usage.

## Security Considerations

### Supervision Heartbeat Auto-Registration

- Risk: `POST /api/supervision/heartbeat` is marked `@Public()` (`apps/api/src/modules/supervision/supervision.controller.ts:77-78`). If `dto.clientId` is unknown, `SupervisionService.recordHeartbeat` auto-registers a new client and generates a supervision token (`apps/api/src/modules/supervision/supervision.service.ts:92-103`). Any actor on the network can register an edge client and receive a token that then grants access to `GET /api/supervision/clients`.
- Impact: An attacker could flood the system with fake clients, pollute the supervision dashboard, and enumerate registered clients.
- Current Mitigation: The `/clients` endpoint requires JWT or supervision token auth via `SupervisionOrJwtGuard` (line 37-61 of controller), but the newly auto-registered token would pass this check.
- Recommendations: Require a shared pre-shared key (`EDGE_AGENT_SECRET` from `.env.example` line 252 is declared but never actually checked in the code) for heartbeat acceptance. Do not auto-register from heartbeat — require explicit registration via `/register` with the pre-shared key.

### WebSocket Gateway CORS Wildcard

- Risk: `apps/api/src/modules/notification/notification.gateway.ts:13` sets `cors: { origin: "*" }` on the WebSocket namespace. Any website can initiate WebSocket connections.
- Impact: Cross-site WebSocket hijacking. While the gateway does validate JWT tokens on connection (`handleConnection`, line 27-42), a CSRF-like attack could leverage existing browser session state.
- Current Mitigation: JWT token required in `handshake.auth.token` or `handshake.query.token`.
- Recommendations: Restrict CORS to the dashboard and mobile app origins only. Validate origin header on WebSocket upgrade.

### Password in Redis Healthcheck Command

- Risk: `docker-compose.prod.yml:54` exposes `REDIS_PASSWORD` in the `redis-cli -a` command visible in process lists (`docker inspect`, `ps aux`).
- Impact: Anyone with access to the Docker host can read the Redis password from process listings.
- Recommendations: Use `REDISCLI_AUTH` environment variable or pass password via `--pass` with a file-based secret.

### Session Storage Token Storage

- Risk: `apps/dashboard/lib/auth-client.ts:35,59,81-83` stores JWT access tokens and user data in `sessionStorage`, which is accessible to any JavaScript running on the same origin.
- Impact: An XSS vulnerability would allow token theft. Unlike `localStorage`, `sessionStorage` is cleared on tab close, but it persists across page navigations and refresh attacks.
- Current Mitigation: Token lifespan is 15 minutes by default (`JWT_ACCESS_EXPIRY=15m`).
- Recommendations: Use HttpOnly cookies for web clients where possible (the auth controller already sets `refreshToken` as HttpOnly cookie). Consider `SameSite=Strict` cookies for access tokens with BFF pattern.

### Missing CSRF Protection

- Risk: State-changing endpoints (POST/PATCH/DELETE on `/api/users`, `/api/sites`, `/api/cameras`, `/api/alerts`) rely solely on JWT Bearer tokens without CSRF tokens.
- Impact: Cross-site request forgery is possible if an attacker can trick an authenticated user into submitting a form.
- Current Mitigation: Bearer tokens are sent via `Authorization` header (not cookies), which is resistant to simple CSRF. However, the `refreshToken` cookie uses `sameSite: 'lax'` which allows some cross-site requests.
- Recommendations: Implement CSRF protection on the auth cookie by using `sameSite: 'strict'` or adding a CSRF token requirement for cookie-based auth flows.

### `Public()` Decorator on Health Endpoints Exposes System Info

- Risk: `GET /api/health/detailed` (`apps/api/src/modules/health/health.controller.ts:27`) is marked `@Public()` and returns system metrics (memory usage, CPU cores, service status, Ollama models, node version) without authentication.
- Impact: Information disclosure — an attacker can fingerprint the infrastructure, discover internal service topography (Redis, Ollama, AI preprocessor), and monitor resource usage.
- Recommendations: Either add JWT auth with a minimum role requirement, or at minimum add a configurable shared secret header check.

## Performance Bottlenecks

### Video Player WebRTC — No TURN Server

- Problem: `apps/dashboard/components/video-player.tsx:69` only configures a single Google STUN server (`stun:stun.l.google.com:19302`). No TURN server.
- Cause: TURN relays are not configured in the infrastructure.
- Impact: WebRTC connections fail for users behind symmetric NATs or restrictive firewalls (common in corporate and mobile networks). Falls back to HLS which adds 5-10s latency.
- Improvement Path: Deploy a TURN server (coturn) or use a managed TURN service. Add it to the `iceServers` configuration in `video-player.tsx`.

### Frame Queue Skip on Overload

- Problem: `apps/api/src/modules/ingestion/ingestion.service.ts:68-72` skips frame capture when the BullMQ frame-processing queue has >3 waiting jobs.
- Cause: Inference processing takes ~3 minutes per frame on CPU (comment on line 67), so a backlog builds quickly.
- Impact: During high alert periods (multiple cameras detecting events simultaneously), frames are dropped, potentially missing critical detections. The queue can grow unbounded if inference is slower than ingestion.
- Improvement Path: Implement priority-based queueing (critical/severe cameras first). Add horizontal scaling for inference workers. Monitor queue depth and alert on sustained backlog.

### Health Check Creates Transient Redis/HTTP Connections

- Problem: `apps/api/src/modules/health/health.controller.ts:52-62` creates a new `ioredis` instance and `http` clients on every detailed health check.
- Cause: Services aren't injected — the controller manually creates connections.
- Impact: Under frequent health polling, connection churn adds latency and may exhaust Redis connection limits.
- Improvement Path: Inject a shared Redis client and reuse it for health checks. Cache results for a short TTL (e.g., 10s).

### 300-Second Inference Timeout Blocks Worker

- Problem: `apps/api/src/modules/inference/inference.service.ts:35` sets `AbortSignal.timeout(300000)` (5 minutes). The BullMQ worker processes frames sequentially (`apps/api/src/modules/inference/inference.processor.ts`).
- Cause: Vision model inference on CPU can take several minutes.
- Impact: A stuck inference call blocks the entire frame processing pipeline for up to 5 minutes before timing out, during which no frames from other cameras are processed.
- Improvement Path: Configure BullMQ concurrency >1 so multiple frames can be processed in parallel. Reduce timeout to 60s for a single frame and let BullMQ retry logic handle timeouts.

## Fragile Areas

### IngestionService — FFmpeg Process Management

- Files: `apps/api/src/modules/ingestion/ingestion.service.ts:99-208`
- Why Fragile: Direct `child_process.spawn("ffmpeg", ...)` with user-provided RTSP URLs. FFmpeg processes can hang indefinitely if the RTSP stream stalls. The `null as any` cast on line 91 indicates the `process` field of `ActiveStream` is unused but kept in the interface. No process pool, no health monitoring of FFmpeg subprocesses.
- Safe Modification: Wrap FFmpeg calls in a dedicated subprocess pool with health checks and automatic restart. Validate RTSP URLs before spawning. Add process monitoring with kill+restart on hang detection.
- Test Coverage: None — the entire ingestion module has no tests.

### Inference Service — Error Recovery Returns Empty Detections

- Files: `apps/api/src/modules/inference/inference.service.ts:38-47`
- Why Fragile: When the AI preprocessor returns an error (line 38-41) or the fetch fails (line 45-47), the method silently returns `{ detections: [] }`. The inference processor (`apps/api/src/modules/inference/inference.processor.ts:38`) checks `!det.detected` and skips — but the complete failure to analyze a frame is indistinguishable from "nothing detected."
- Safe Modification: Throw on AI preprocessor failures so BullMQ's retry mechanism can re-attempt. Distinguish between "no detections" and "analysis failed."
- Test Coverage: None.

### In-Memory Alert Deduplication Lost on Restart

- Files: `apps/api/src/modules/inference/inference.processor.ts:13-14`
- Why Fragile: `recentAlerts: Map<string, number>` is an in-memory Map with a 5-minute dedup window. On process restart, the map is empty, and duplicate alerts can fire within the 5-minute window.
- Safe Modification: Store dedup state in Redis with TTL matching the dedup window so it survives restarts.

### Two Parallel Notification Systems

- Files: `apps/api/src/modules/notification/` (WebSocket/FCM) and `apps/api/src/modules/notifications/` (Email/Webhook/In-App), with dispatch coordination in `apps/api/src/modules/inference/inference.processor.ts:68-97`.
- Why Fragile: The inference processor dispatches to both independently. If one fails, the other may still succeed, leading to inconsistent notification delivery. The `NotificationsProcessor` (`apps/api/src/modules/notifications/notifications.processor.ts`) has a fallback for legacy websocket job types (line 27-30), indicating incomplete migration.
- Safe Modification: Consolidate into one notification dispatch pipeline with a single queue processor that handles all channels and guarantees exactly-once delivery per channel.

## Scaling Limits

### In-Memory Supervision Client Store

- Files: `apps/api/src/modules/supervision/supervision.service.ts:46`
- Current Capacity: A JavaScript `Map` — effectively unbounded but not durable.
- Limit: Lost on process restart. Cannot be shared across multiple API instances (horizontal scaling).
- Scaling Path: Migrate to a database-backed store (PostgreSQL via Prisma) with in-memory caching. Use Redis pub/sub for multi-instance heartbeat fan-out.

### BullMQ Frame Queue with Single Worker

- Files: `apps/api/src/modules/inference/inference.processor.ts` (single `@Processor("frame-processing")`)
- Current Capacity: Processes one frame at a time. With ~3 min inference time, max throughput is ~0.3 FPS per camera.
- Limit: At 3+ cameras with active prompts, the queue saturates and frames are dropped (`apps/api/src/modules/ingestion/ingestion.service.ts:69-72`).
- Scaling Path: Deploy additional API instances with BullMQ workers (concurrency >1). Offload inference to a dedicated GPU service with higher throughput.

### Camera Streams Bound to Single API Instance

- Files: `apps/api/src/modules/ingestion/ingestion.service.ts:15` — `streams: Map<string, ActiveStream>`
- Current Capacity: All active camera ingestion processes run on a single Node.js instance.
- Limit: Cannot scale ingestion beyond one machine. Memory grows with each active stream (FFmpeg subprocess + base64 image buffers).
- Scaling Path: Shard camera ingestion across instances. Use a distributed lock (Redis) to assign cameras to instances. Decouple capture from analysis via the shared BullMQ queue.

## Dependencies at Risk

### `@fastify/helmet` CSP Partially Disabled

- Risk: `apps/api/src/main.ts:42` disables CSP entirely in development (`contentSecurityPolicy: false`). In production, `undefined` triggers default strict CSP which may break Swagger UI or other inline resources.
- Impact: Overly strict CSP could break documentation pages. Overly permissive CSP (development) provides no XSS protection.
- Migration Plan: Configure explicit CSP with appropriate allowances for Swagger UI inline scripts and API-only endpoints.

### Google STUN Server Dependency (Video Player)

- Risk: `apps/dashboard/components/video-player.tsx:69` hardcodes `stun:stun.l.google.com:19302`. Google may rate-limit, deprecate, or remove this service.
- Impact: All WebRTC ICE gathering fails if Google's STUN server is unavailable. Users fall back to HLS.
- Migration Plan: Deploy a self-hosted STUN server (coturn) or add multiple STUN server URLs as fallback. Remove the hardcoded Google STUN dependency.

### Expo SecureStore Dependency

- Risk: `apps/mobile/lib/auth-storage.ts:1` imports `expo-secure-store`. On platforms where SecureStore is unavailable or misconfigured, token storage silently fails.
- Impact: The synchronous `getAccessToken()` (line 16-20) wraps calls in try-catch and returns `null` on error, but the async versions do not — they may throw. This creates inconsistent error handling.
- Migration Plan: Ensure all SecureStore calls use the async API uniformly. Handle errors at the call site with user-facing retry prompts.

### Resend Email API — No Fallback Provider

- Risk: `apps/api/src/modules/notifications/notifications.service.ts:16-31` single-provider dependency on Resend. If `RESEND_API_KEY` is missing, email notifications are silently disabled (line 31-32 logs a warning).
- Impact: In production, a misconfigured Resend key means critical alert emails never reach users, with only a log warning.
- Migration Plan: Add a configurable SMTP fallback (SMTP_* env vars already exist in `.env.example` but aren't implemented). Alert on startup if email notifications are enabled but no provider is configured.

## Missing Critical Features

### No Audit Trail on Authorization Failures

- Problem: Failed login attempts, token validation failures, and forbidden access attempts are not logged to the audit trail (`apps/api/src/modules/auth/auth.controller.ts:43-59` only logs successful events).
- Blocks: Security monitoring, brute-force detection, compliance requirements.
- Priority: High. Add audit logging for failed auth events (`LOGIN_FAILED`, `TOKEN_INVALID`, `ACCESS_DENIED`) with IP/user-agent capture.

### No Graceful Shutdown for FFmpeg Processes

- Problem: `apps/api/src/modules/ingestion/ingestion.service.ts:249-253` calls `stopStream` for each active stream on `onModuleDestroy()`, but NestJS's shutdown sequence may not allow enough time for FFmpeg cleanup. FFmpeg processes can become zombies.
- Blocks: Clean container restarts, zero-downtime deployments.
- Priority: Medium. Add a shutdown grace period, SIGTERM handling with process reaping, and a dedicated shutdown hook in `main.ts`.

### No Image/Video Content Upload Validation

- Problem: Snapshot URLs from cameras are passed through without validation of content type, size, or source origin. The email notification service fetches arbitrary URLs to attach images (`apps/api/src/modules/notifications/notifications.service.ts:122-134`).
- Blocks: Server-side request forgery (SSRF) protection, bandwidth abuse.
- Priority: High. Validate snapshot URLs are from expected camera sources. Add size limits for email attachments. Implement URL allowlisting for SSRF prevention.

## Test Coverage Gaps

### Untested Modules — Backend

- What's Not Tested: Controllers (all modules), guards, pipes, filters, inference service/processor, ingestion service, chat service, dashboard service, notification services (both), supervision service, audit service, queue service, health controller.
- Files: All files under `apps/api/src/modules/*/**.controller.ts`, `apps/api/src/modules/inference/`, `apps/api/src/modules/ingestion/`, `apps/api/src/modules/chat/`, `apps/api/src/modules/dashboard/`, `apps/api/src/modules/notification/`, `apps/api/src/modules/notifications/`, `apps/api/src/modules/supervision/`, `apps/api/src/modules/audit/`, `apps/api/src/modules/queue/`, `apps/api/src/modules/health/`
- Risk: Bugs in critical paths (alert creation, notification dispatch, camera ingestion, user auth flows) are undetectable until production. Refactoring these modules without test safety nets is risky.
- Priority: High. Start with integration tests for the alert → notification pipeline and camera ingestion → inference → alert lifecycle.

### No Frontend Tests

- What's Not Tested: The entire dashboard (`apps/dashboard/`) and mobile (`apps/mobile/`) applications — no `.test.ts`, `.spec.ts`, or `.test.tsx` files exist anywhere outside the API.
- Risk: UI rendering errors, auth flow regressions, API contract mismatches between frontend and backend types.
- Priority: Medium. Add component tests for critical UI flows: login, camera list, alert management. Add API contract tests to ensure frontend types match backend responses.

### Service Tests Are Unit-Only

- What's Not Tested: Integration between services. Each `.spec.ts` file (`apps/api/src/modules/*/*.service.spec.ts`) tests its service in isolation with mocked Prisma. There are no tests that verify end-to-end flows.
- Files: `apps/api/src/modules/alert/alert.service.spec.ts`, `apps/api/src/modules/auth/auth.service.spec.ts`, `apps/api/src/modules/camera/camera.service.spec.ts`, `apps/api/src/modules/site/site.service.spec.ts`, `apps/api/src/modules/user/user.service.spec.ts`
- Risk: Integration bugs — e.g., the inference processor's incorrect severity mapping — are invisible to unit tests because the prompt data shape is never validated end-to-end.
- Priority: Medium. Add integration test suites that test alert creation through the full pipeline: ingestion → frame capture → inference → alert creation → notification dispatch.

---

*Concerns audit: 2026-07-14*
