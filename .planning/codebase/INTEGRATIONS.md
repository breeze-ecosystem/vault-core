# External Integrations

> Generated: 2026-07-17

## Databases

| Database | Purpose | Connection | ORM/Client |
|----------|---------|------------|------------|
| PostgreSQL 16 | Primary application database for all models (users, organizations, cameras, alerts, incidents, visitors, credentials, licenses, webhooks, audit logs) | `DATABASE_URL` env var (`postgresql://user:pass@host:5432/db`) | Prisma 5.22.0 (`@prisma/client`), `pgvector` for vector embeddings |
| Qdrant | Vector database for AI similarity search (face embeddings, scene embeddings) | `QDRANT_URL` env var (default `http://localhost:6333`) | `@qdrant/js-client-rest` (Node.js), `qdrant-client` (Python) |
| Redis 7 | Job queues (BullMQ), caching, session management | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` env vars | `ioredis` 5.4.1 |

## External APIs

| API | Purpose | Auth Method | SDK | Config |
|-----|---------|-------------|-----|--------|
| Resend | Transactional email delivery (alerts, notifications) | API Key | `resend` ^6.12.3 (Node.js SDK) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Ollama | Local LLM/VLM inference for AI analysis (Qwen-VL vision, Qwen embedding, Llama reasoning, Whisper transcription) | HTTP (no auth, local) | `ollama` ^0.6.3 (Node.js SDK) | `OLLAMA_BASE_URL` (default `http://localhost:11434`) |
| vLLM | Production inference server (alternative to Ollama for high-throughput) | HTTP (local) | HTTP client | `VLLM_URL` (default `http://localhost:8000`) |
| Qdrant | Vector similarity search (face matching, scene similarity) | HTTP (API key optional) | `@qdrant/js-client-rest` | `QDRANT_URL` (default `http://localhost:6333`) |
| AI Preprocessor | Python microservice for frame analysis, object detection, ANPR, audio transcription | Internal network | HTTP via `httpx` (Node.js → Python), `httpx` (Python) | `AI_PREPROCESSOR_URL` (default `http://localhost:8000`) |
| go2rtc | Video streaming server (WebRTC/HLS/RTSP proxy) for live camera streams | HTTP (no auth, local) | WebRTC/HLS client in browser | `NEXT_PUBLIC_STREAM_URL` (default `http://localhost:1984`) |
| Cloudflare Turnstile | Bot detection for public contact form on marketing site | Site key + Secret key | Turnstile JS widget | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |
| Firebase Cloud Messaging (FCM) | Push notifications to mobile devices | Server key or service account JSON | `FCM_SERVER_KEY` or `FIREBASE_CREDENTIALS` env vars | `FCM_SERVER_KEY`, `FIREBASE_CREDENTIALS` |
| Push Webhook | Alternative push notification delivery (webhook-based push) | HTTP | HTTP POST | `PUSH_WEBHOOK_URL` |
| SMTP | Email notifications (fallback when Resend is not configured) | Username/Password | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | `SMTP_FROM`, `NOTIFICATION_ENABLED` |
| ghcr.io | Container registry for edge agent update checks | Bearer token (anonymous) | `httpx` (Python) | `EDGE_REGISTRY` (default `ghcr.io/nousresearch/oversight-hub`) |

## Auth Providers

| Provider | Purpose | Protocol | Config Keys |
|----------|---------|----------|-------------|
| JWT (Built-in) | Primary authentication for all API endpoints | JWT (RS256/HS256) access + refresh tokens | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY` |
| SAML SSO | Enterprise single sign-on (Phase 10) | SAML 2.0 via `passport-saml` | `IdpConfig` model: `metadataUrl`, `entityId`, `certificate`, `entryPoint` |
| OIDC SSO | Enterprise single sign-on (Phase 10) | OpenID Connect via `openid-client` | `IdpConfig` model: `issuerUrl`, `clientId`, `clientSecret` |
| TOTP (2FA) | Two-factor authentication | TOTP (RFC 6238) via `otplib` | QR code generation via `qrcode` |
| License JWT | License key validation for customer deployments | JWT signed with RSA private key | `LICENSE_PRIVATE_KEY_PATH`, `LICENSE_VERSION` |

## Webhooks / Event Streams

| Event | Source | Destination | Format |
|-------|--------|-------------|--------|
| Alert events | NestJS API | Configured webhook URLs per organization | JSON POST with `signingSecret` HMAC signature (see `WebhookSubscription` model) |
| Webhook deliveries | NestJS API | External endpoints | JSON payload with retry logic and delivery logging (see `WebhookDelivery` model) |
| Contact form submissions | Marketing site (`apps/marketing`) | NestJS API (`/api/contact`) | JSON via HTTP POST |
| Edge heartbeats | Edge Agent (`edge/agent/agent.py`) | NestJS API (`/api/heartbeat`) | JSON via HTTP POST |
| Real-time events | NestJS API (Socket.IO) | Dashboard clients (Socket.IO client) | WebSocket events via `socket.io` |

## WebSocket Events

| Event Direction | Technology | Namespace/Channel | Purpose |
|----------------|------------|-------------------|---------|
| Server → Client (Dashboard) | Socket.IO 4.8.3 | Default namespace | Real-time alert notifications, camera status updates |
| Client → Server (Dashboard) | Socket.IO 4.8.3 | Default namespace | Acknowledge alerts, subscribe to camera streams |

## Queue / Message Brokers

| Queue | Technology | Purpose | Consumers |
|-------|------------|---------|-----------|
| BullMQ Queues | Redis-backed (BullMQ 5.30.0 via `@nestjs/bullmq`) | Frame processing, notification dispatch, async job processing | NestJS queue processors (`*.processor.ts`) |
| MQTT Broker | Eclipse Mosquitto 2.0 | Door controller communication | Door lock/unlock commands, door status events |

## Event-Driven Architecture

| Event | Emitter | Consumer(s) | Mechanism |
|-------|---------|-------------|-----------|
| Alert created | NestJS service | BullMQ queue → notification dispatch | `@nestjs/event-emitter` + BullMQ |
| Door state change | MQTT broker | NestJS MQTT client | MQTT subscription |
| Camera frame captured | NestJS scheduler | BullMQ queue → AI Preprocessor | BullMQ → HTTP to Python service |
| AI analysis complete | AI Preprocessor | NestJS API | HTTP callback to `NESTJS_API_URL` |

## Monitoring & Observability

| Service | Purpose | Implementation |
|---------|---------|----------------|
| Health endpoints | Liveness/readiness probes | NestJS `@nestjs/terminus` (`GET /api/health`), FastAPI health route (`GET /health`) |
| Docker healthchecks | Container-level health monitoring | Every service in `docker-compose*.yml` has a `healthcheck` block |
| Edge Agent | Edge server health + Ollama auto-restart | Python agent with `psutil`, Docker API, scheduled heartbeats to supervision API |
| Audit logs | Immutable audit trail for security events | `AuditLog` model with hash chain (`previousHash`, `currentHash`) |

---

*Integration audit: 2026-07-17*
