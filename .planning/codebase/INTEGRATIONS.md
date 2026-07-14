# External Integrations

**Analysis Date:** 2026-07-14

## APIs & External Services

**AI / Machine Learning:**
- **Ollama** - Local LLM/VLM inference engine for image analysis and chat
  - Protocol: HTTP REST API at `/api/generate`, `/api/tags`
  - Config: `OLLAMA_BASE_URL` env var (default: `http://localhost:11434`)
  - Used in: `apps/api/src/modules/chat/chat.service.ts` (VLM snapshot analysis, text chat), `apps/api/src/modules/health/health.controller.ts` (health check)
  - Default model: `moondream` (configured via `OLLAMA_MODEL` env var)
  - Docker: Accessed via `host.docker.internal:11434` from containers

- **AI Preprocessor** (internal FastAPI microservice) - Frame analysis service that processes surveillance snapshots against detection prompts
  - Protocol: HTTP REST at `/api/v1/analyze`
  - Config: `AI_PREPROCESSOR_URL` env var (default: `http://localhost:8000`)
  - Used in: `apps/api/src/modules/inference/inference.service.ts`
  - Deployed as: `oversight-ai-preprocessor` Docker container
  - Image processing: Python Pillow library (`Pillow==10.4.0`)

**Email Delivery:**
- **Resend** - Transactional email API for alert notifications
  - SDK: `resend` npm package 6.12.3
  - Config: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` env vars
  - Used in: `apps/api/src/modules/notifications/notifications.service.ts` (`sendAlertEmail`, `sendTestEmail` methods)
  - Features: HTML email with alert details, inline snapshot image attachments, severity-styled templates
  - Default from address: `OVERSIGHT AI <onboarding@resend.dev>`

**Push Notifications:**
- **Firebase Cloud Messaging (FCM)** - Mobile push notifications
  - Protocol: HTTP POST to `https://fcm.googleapis.com/fcm/send`
  - Config: `FCM_SERVER_KEY` or `FIREBASE_CREDENTIALS` env vars
  - SDK: Direct fetch (no Firebase Admin SDK — uses raw HTTP with server key)
  - Used in: `apps/api/src/modules/notification/notification.service.ts` (`sendViaFcm` method)
  - Fallback: Generic webhook mode via `PUSH_WEBHOOK_URL`

**Video Streaming:**
- **go2rtc** - WebRTC/HLS video stream proxy for live camera feeds
  - Protocol: WebRTC (port 8554), HLS (port 8888), API (port 1984)
  - Config: `NEXT_PUBLIC_STREAM_URL` env var (default: `http://localhost:1984`)
  - Config file: `edge/go2rtc/go2rtc.yaml`
  - Used by: Dashboard (`apps/dashboard`) for live camera viewing
  - Mobile config: `apps/mobile/app.json` references `streamUrl` in `extra` field

## Data Storage

**Databases:**
- **PostgreSQL 16** - Primary relational database
  - Client: Prisma ORM 5.22.0 (`@prisma/client` via `apps/api/src/modules/prisma/prisma.service.ts`)
  - Connection: `DATABASE_URL` env var (format: `postgresql://user:password@host:5432/database`)
  - Schema: `apps/api/prisma/schema.prisma` — 12 models (Site, Camera, User, Alert, CameraPrompt, RefreshToken, MobilePushToken, AuditLog, NotificationTemplate, NotificationLog, NotificationSetting), plus 6 enums (Role, CameraStatus, AlertSeverity, AlertStatus, NotificationChannel, NotificationStatus)
  - Migration: Prisma Migrate (`prisma migrate deploy` at container startup)
  - Seed: `apps/api/prisma/seed.ts` — dual-mode seed (production admin-only, sample full dataset)

- **Redis 7** - Cache and message broker
  - Client: `ioredis` 5.4.1 (direct), `bullmq` 5.30.0 (queue abstraction)
  - Config: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` env vars
  - Uses:
    - BullMQ job queues (frame-processing, notification) — `apps/api/src/modules/queue/queue.module.ts`
    - Session/cache storage (via ioredis)
    - Health check verification — `apps/api/src/modules/health/health.controller.ts`

**Vector Database:**
- **Qdrant** - Vector search for AI contextual retrieval
  - Config: `QDRANT_URL` env var (default: `http://localhost:6333`)
  - Referenced in configuration but no direct client import detected in analyzed files — likely used for RAG/semantic search features

**File Storage:**
- Local filesystem only — no cloud object storage detected
- Camera snapshots stored as base64 in memory during processing, URLs passed as `lastSnapshotUrl` on Camera records
- Docker volumes for persistent data (`pgdata`, `redisdata`)

**Caching:**
- Redis-backed caching via `ioredis` and BullMQ
- No dedicated caching layer (e.g., no `@nestjs/cache-manager` detected)

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication (no external identity provider)
  - Implementation: NestJS Passport (`@nestjs/passport` + `passport-jwt`)
  - Token strategy: Access token (short-lived, default 15min) + Refresh token (long-lived, default 7 days)
  - Refresh tokens stored in DB (`RefreshToken` model in Prisma) with revocation support
  - Password hashing: `bcryptjs` with salt rounds = 10
  - Configuration: `apps/api/src/modules/auth/` (auth module, strategies, service)

**Edge Agent Authentication:**
- Custom supervision token authentication
  - Config: `EDGE_AGENT_SECRET` env var
  - Used in: `apps/api/src/modules/supervision/supervision.controller.ts` (`SupervisionOrJwtGuard`)
  - Heartbeat endpoint is public — edge agents authenticate via supervision token in body or header
  - Registration endpoint (`POST /api/supervision/clients/register`) is public for first contact

## Monitoring & Observability

**Error Tracking:**
- Not detected — no Sentry, Datadog, or other error tracking service configured

**Logs:**
- NestJS `Logger` class used throughout (`@nestjs/common`)
- Docker container logs (stdout)
- Caddy access logs to stdout (`Caddyfile`)

**Health Checks:**
- `GET /api/health` — simple status check (`apps/api/src/modules/health/health.controller.ts`)
- `GET /api/health/detailed` — comprehensive check: database (latency), Redis (latency), Ollama (models list), AI preprocessor, system memory/CPU
- Docker healthcheck probes configured for all services in `docker-compose.prod.yml`

**API Documentation:**
- Swagger/OpenAPI via `@nestjs/swagger` at `/api/docs` (`apps/api/src/main.ts`)

## CI/CD & Deployment

**Hosting:**
- Self-hosted Docker Compose deployment (`docker-compose.prod.yml`) with Caddy reverse proxy
- Optional: Coolify-managed deployment (`docker-compose.yml` with external Coolify network)
- Edge tiers (`edge/configs/`): argent, or, platine — each gets its own Docker Compose config
- EAS (Expo Application Services) for mobile app builds and submissions (`eas.json`)

**CI Pipeline:**
- GitHub Actions (`.github/workflows/`):
  - `ci.yml` — CI pipeline
  - `deploy.yml` — Deployment automation
  - `build-apk.yml` — Android APK build

**Container Registry:**
- `ghcr.io/breeze-ecosystem` — GitHub Container Registry used for pre-built images in edge tier configs (`edge/configs/platine.yml`)

**Reverse Proxy:**
- Caddy 2 — Automatic TLS via Let's Encrypt, routing rules in `Caddyfile` (API at `/api/*`, WebSocket at `/ws/*`, Dashboard at `/*`)

## Environment Configuration

**Required env vars (production):**
- `DATABASE_URL` — PostgreSQL connection string (marked `[REQUIS]`)
- `JWT_ACCESS_SECRET` — JWT signing key (64+ chars recommended)
- `JWT_REFRESH_SECRET` — JWT refresh signing key (must differ from access secret)
- `NEXT_PUBLIC_API_URL` — Public API URL for dashboard client
- `REDIS_HOST`, `REDIS_PASSWORD` — Redis configuration (required in production compose files)
- `POSTGRES_PASSWORD` — DB password (required in self-contained compose)
- `RESEND_API_KEY` — Email delivery API key
- `EDGE_AGENT_SECRET` — Edge agent authentication key

**Secrets location:**
- `.env` file (gitignored, documented in `.env.example`)
- Docker Compose `environment:` / `env_file:` blocks
- GitHub Actions secrets (for CI/CD)
- EAS secrets (for Expo builds)

## Webhooks & Callbacks

**Incoming:**
- `POST /api/supervision/heartbeat` — Edge agent heartbeat (public, authenticated via supervision token) — `apps/api/src/modules/supervision/supervision.controller.ts`
- `POST /api/supervision/clients/register` — Edge agent registration (public, first contact) — same file

**Outgoing:**
- FCM push notifications: POST to `https://fcm.googleapis.com/fcm/send` — `apps/api/src/modules/notification/notification.service.ts`
- Generic webhook push: POST to configured `PUSH_WEBHOOK_URL` — same file
- Alert webhook notifications: POST to user-configured webhook URLs — `apps/api/src/modules/notifications/notifications.service.ts` (`sendWebhook` method)
- AI preprocessor calls: POST to `AI_PREPROCESSOR_URL/api/v1/analyze` — `apps/api/src/modules/inference/inference.service.ts`
- Ollama API calls: POST to `OLLAMA_BASE_URL/api/generate` — `apps/api/src/modules/chat/chat.service.ts`

---

*Integration audit: 2026-07-14*
