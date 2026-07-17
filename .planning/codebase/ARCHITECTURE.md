# Architecture

> Generated: 2026-07-17

## System Overview

Oversight Hub is a multi-tenant, AI-powered physical security intelligence platform deployed as a **monorepo** using **pnpm workspaces** and **Turborepo**. The system follows a **layered modular monolith** pattern with a NestJS API backend, two frontend clients (Next.js dashboard and Expo mobile app), a shared kernel package, and supporting AI/edge microservices. External dependencies include PostgreSQL (database), Redis (queues/cache), Ollama (local LLM), Qdrant (vector store), and Mosquitto (MQTT broker for door controllers).

The system is designed for self-hosted Docker Compose deployment behind Caddy reverse proxy, with an optional Coolify-managed production variant.

## Architecture Pattern

**Layered Modular Monolith (API) + Backend-for-Frontend (BFF) clients**

- **API layer**: NestJS modular monolith with Fastify adapter — 38 feature modules, each bundled as controller + service + Prisma queries.
- **Presentation layer**: Next.js dashboard (server-rendered React) and Expo mobile app (client-rendered React Native) — both consume the same REST API + WebSocket endpoints.
- **Shared kernel**: Zod schemas, TypeScript interfaces, and constants in `packages/shared/` consumed by all TypeScript consumers.
- **Microservices**: AI Preprocessor (Python FastAPI), Edge Agent (Python), and MQTT broker — each independently deployable.
- **Event-driven**: BullMQ queues (Redis-backed) for async processing (frame analysis, notification dispatch, audit writes). Socket.IO for real-time WebSocket communication. EventEmitter2 for in-process event bus. MQTT for door controller hardware communication.

```
┌─────────────────────────────────────────────────────────────────┐
│                      External Clients                            │
│    Browser (Dashboard)              Mobile (iOS/Android)         │
│    app.oversighthub.com             Expo App                     │
└───────────────┬──────────────────────────────────┬──────────────┘
                │ HTTPS/WS                         │ HTTPS
                ▼                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Caddy Reverse Proxy                            │
│    /api/* → api:4000    /ws/* → api:4000    /* → dashboard:3100   │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌──────────────────┐ ┌───────────────────────┐ ┌──────────────────────┐
│  marketing:3200  │ │   API (NestJS):4000    │ │ Dashboard (Next.js) │
│  (Next.js)       │ │   REST + WebSocket     │ │     :3100           │
│  www.oversight   │ │   38 feature modules   │ │  SSR + Client       │
│  hub.com         │ │                       │ │                     │
└──────────────────┘ └───────┬───────┬───────┘ └─────────────────────┘
                             │       │
           ┌─────────────────┘       └─────────────────┐
           ▼                                            ▼
┌─────────────────────┐                     ┌──────────────────────────┐
│  External Services  │                     │   Internal Infra         │
│  ┌──────────────┐   │                     │  ┌────────────────────┐  │
│  │ Ollama (LLM) │   │                     │  │  PostgreSQL 16     │  │
│  │ :11434       │   │                     │  │  (Prisma ORM)      │  │
│  └──────────────┘   │                     │  └────────────────────┘  │
│  ┌──────────────┐   │                     │  ┌────────────────────┐  │
│  │ Qdrant       │   │                     │  │  Redis 7           │  │
│  │ (vectors)    │   │                     │  │  (BullMQ + cache)  │  │
│  │ :6333        │   │                     │  └────────────────────┘  │
│  └──────────────┘   │                     │  ┌────────────────────┐  │
│  ┌──────────────┐   │                     │  │  Mosquitto (MQTT)  │  │
│  │ AI Preprocessor│  │                     │  │  :1883             │  │
│  │ (FastAPI):8000│   │                     │  └────────────────────┘  │
│  └──────────────┘   │                     └──────────────────────────┘
│  ┌──────────────┐   │
│  │ Edge Agent   │   │
│  │ (Python)     │   │
│  └──────────────┘   │
└─────────────────────┘
```

## Layers

| Layer | Responsibility | Location | Depends On |
|-------|---------------|----------|------------|
| **API (NestJS)** | REST API, authentication, business logic, WebSocket real-time, MQTT integration, BullMQ job processing | `apps/api/src/` | Prisma, Redis, Ollama, Qdrant, MQTT, external AI |
| **Dashboard (Next.js)** | Web admin interface, role-aware UI, i18n, real-time notifications | `apps/dashboard/` | NestJS API (REST + WS) |
| **Mobile (Expo)** | Cross-platform mobile companion for guards/operators | `apps/mobile/` | NestJS API (REST) |
| **Marketing Site (Next.js)** | Public marketing site, contact forms, blog/content | `apps/marketing/` | NestJS API (contact endpoint) |
| **Shared Kernel** | Zod schemas, TypeScript types, constants, role hierarchy | `packages/shared/src/` | zod only |
| **UI Package** | Reusable React components (button, card, code) | `packages/ui/src/` | React, clsx |
| **Design Package** | Design tokens (colors, typography, spacing, shadows) | `packages/design/src/` | None |
| **AI Preprocessor** | Python FastAPI microservice for frame analysis (ANPR, object detection) | `services/ai-preprocessor/` | Ollama, Pillow, httpx |
| **Edge Agent** | Python service for edge server health monitoring and go2rtc management | `edge/agent/` | Docker API, psutil, httpx |
| **Infrastructure** | Docker Compose services, Caddy reverse proxy, Prisma schema/migrations | `docker/`, `Caddyfile`, `apps/api/prisma/` | PostgreSQL, Redis, Caddy |

## Data Flow

### Primary Request Path (Dashboard → API)

1. User authenticates via `/api/auth/login` — returns JWT access token (15m) + refresh token (7d, HttpOnly cookie + response body)
2. Dashboard stores access token in `sessionStorage`, refresh token in cookie
3. All authenticated API calls use `fetchWithAuth()` (`apps/dashboard/lib/auth-client.ts:137`) which attaches `Authorization: Bearer <token>` header
4. On 401 response, `fetchWithAuth` automatically calls `/api/auth/refresh` to rotate tokens, then retries the original request
5. On refresh failure, redirects to `/login`
6. NestJS `JwtAuthGuard` (`apps/api/src/common/guards/jwt-auth.guard.ts`) validates the JWT on every non-`@Public()` route
7. `TenantIsolationGuard` (`apps/api/src/common/guards/tenant-isolation.guard.ts`) ensures data access is scoped to the user's organization
8. `RolesGuard` (`apps/api/src/common/guards/roles.guard.ts`) checks role hierarchy against `@Roles()` decorator
9. `FeatureGateGuard` (`apps/api/src/common/guards/feature-gate.guard.ts`) checks per-organization feature flags
10. Controller delegates to Service → Prisma queries PostgreSQL → returns JSON response
11. `AuditInterceptor` (`apps/api/src/modules/audit/audit.interceptor.ts`) asynchronously enqueues audit log entries to BullMQ `audit-write` queue
12. `AllExceptionsFilter` (`apps/api/src/common/filters/all-exceptions.filter.ts`) catches all unhandled exceptions and returns `StandardErrorResponse`

### Real-time Notification Flow

1. Server: `NotificationGateway` (`apps/api/src/modules/notification/notification.gateway.ts`) uses Socket.IO to push alerts/notifications to connected dashboard clients
2. Mobile: REST polling or SSE (for AI agent chat streaming)
3. BullMQ queues: `ai-process`, `notification-send`, `audit-write`, `correlation-event` — processed by queue workers
4. In-process events: `EventEmitter2` used for MQTT message routing and internal cross-module communication

### Video Ingestion Flow

1. Dashboard or API triggers `/api/ingestion/:cameraId/start`
2. `IngestionService` (`apps/api/src/modules/ingestion/ingestion.service.ts`) spawns ffmpeg process to capture frames from RTSP stream
3. Frames sent to `AI Preprocessor` (`services/ai-preprocessor/`) via HTTP for analysis
4. AI analysis results trigger alerts, ANPR events, or correlation jobs
5. Snapshots stored as files (local or S3-compatible)

### MQTT Hardware Communication Flow

1. Door controllers publish state changes to `site/{siteId}/door/{doorId}/state` topic
2. `MqttService` (`apps/api/src/mqtt/mqtt.service.ts`) receives and validates messages (sequence number dedup)
3. Messages routed to internal event bus via `EventEmitter2` — topics: `mqtt.door.state`, `mqtt.reader.badge`, `mqtt.controller.health`
4. Domain modules (door, access, supervision) subscribe to events and update database/trigger alerts

### Edge Agent Health Flow

1. `Edge Agent` (`edge/agent/agent.py`) runs on edge servers, collects system metrics, monitors go2rtc and Docker containers
2. Reports health to API via REST POST to `/api/supervision/report`
3. `SupervisionModule` processes reports, updates equipment health scores, triggers alerts on anomalies

## Key Abstractions

| Abstraction | Purpose | Implementation | Interface |
|-------------|---------|----------------|-----------|
| **NestJS Module Pattern** | Encapsulate feature: controller + service + providers | `apps/api/src/modules/*/*.module.ts` — `@Module({ controllers, providers, exports })` | Imported by `AppModule` |
| **PrismaService** | Singleton DB client with tenant extension | `apps/api/src/modules/prisma/prisma.service.ts` — `@Global()` wrapper around `PrismaClient` | `$extends(tenantExtension)`, CRUD methods |
| **JwtAuthGuard** | Global auth guard with `@Public()` bypass | `apps/api/src/common/guards/jwt-auth.guard.ts` — extends `AuthGuard('jwt')` | Decorator: `@Public()` on endpoints |
| **RolesGuard** | Hierarchy-based role access control | `apps/api/src/common/guards/roles.guard.ts` — checks `ROLE_HIERARCHY` from shared | Decorator: `@Roles('ADMIN', 'SUPERVISOR')` |
| **TenantIsolationGuard** | Multi-tenant data isolation | `apps/api/src/common/guards/tenant-isolation.guard.ts` | Global, auto-scopes queries |
| **ZodValidationPipe** | Runtime validation using shared Zod schemas | `apps/api/src/common/pipes/zod-validation.pipe.ts` | `@Body(new ZodValidationPipe(schema))` |
| **AllExceptionsFilter** | Standard error response envelope | `apps/api/src/common/filters/all-exceptions.filter.ts` — returns `StandardErrorResponse` | Global `APP_FILTER` |
| **AuditInterceptor** | Async audit logging via BullMQ | `apps/api/src/modules/audit/audit.interceptor.ts` — enqueues `write-audit` jobs | Decorator: `@Audited({ entity, action })` |
| **MqttService** | MQTT client for door controller communication | `apps/api/src/mqtt/mqtt.service.ts` — connects to Mosquitto, validates sequences, emits events | `EventEmitter2` events |
| **fetchWithAuth()** | Auto-auth HTTP client for dashboard | `apps/dashboard/lib/auth-client.ts:137` — transparent 401 refresh | Returns `Promise<Response>` |
| **API Client** | Typed API wrapper functions | `apps/dashboard/lib/api.ts`, `apps/mobile/lib/api.ts` — all service calls through one file | Named async functions |
| **EventEmitter2** | In-process event bus for cross-module communication | `EventEmitterModule.forRoot()` in `AppModule` | `@InjectEventEmitter()` + wildcard events |

## Entry Points

| Entry Point | Purpose | Port/Route | Handler |
|-------------|---------|------------|---------|
| **NestJS API Server** | Main backend entry point | `0.0.0.0:4000` | `apps/api/src/main.ts` — bootstrap() → NestFactory.create(FastifyAdapter) |
| **Swagger UI** | API documentation | `/api/docs` (OpenAPI 3.0) | `SwaggerModule.setup` in `main.ts` |
| **API Health Check** | Liveness probe | `GET /api/health` | `apps/api/src/modules/health/health.controller.ts` |
| **API Detailed Health** | System diagnostics | `GET /api/health/detailed` | `HealthController.healthDetailed()` |
| **Dashboard Root** | Next.js SSR entry | `0.0.0.0:3100` | `apps/dashboard/app/layout.tsx` → `RootLayout` |
| **Dashboard Overview** | Main dashboard page | `/` (route group: `(dashboard)`) | `apps/dashboard/app/(dashboard)/page.tsx` |
| **Mobile App** | Expo Router entry | N/A (native app) | `apps/mobile/app/_layout.tsx` → Stack navigator |
| **Marketing Site** | Public website | `0.0.0.0:3200` | `apps/marketing/app/` → Next.js pages |
| **AI Preprocessor** | Python FastAPI microservice | `0.0.0.0:8000` | `services/ai-preprocessor/app/main.py` |
| **Edge Agent** | Python edge health monitor | N/A (outbound to API) | `edge/agent/agent.py` |
| **Prisma Migrate** | Schema migration (at startup) | Docker entrypoint | `docker/api.Dockerfile` → `npx prisma migrate deploy` |

## Cross-Cutting Concerns

### Authentication & Authorization
- **JWT-based**: Access token (15m) + refresh token (7d, rotated on use)
- **Global guard chain** (order matters): `JwtAuthGuard` → `TenantIsolationGuard` → `RolesGuard` → `FeatureGateGuard`
- **`@Public()` decorator**: Bypasses JWT auth for login, register, health, accept-invite
- **`@Roles()` decorator**: Hierarchy-based (`ROLE_HIERARCHY` in `packages/shared/src/constants/roles.ts`)
- **Refresh token rotation**: Old token revoked on refresh; all sessions revoked on reuse detection (security measure)
- **SSO**: SAML + OIDC support via `SsoModule` (`apps/api/src/modules/sso/`) and `IdpConfig` model
- **Tenant API Keys**: Per-organization API keys with scopes + rate limits for external integrations (`apps/api/src/modules/api-key/`)

### Error Handling
- **Global exception filter**: `AllExceptionsFilter` catches all unhandled exceptions → returns `{ statusCode, error, message, path, timestamp }`
- **ZodValidationPipe**: Throws `BadRequestException` with field-level validation errors
- **NestJS HTTP exceptions**: `NotFoundException`, `ConflictException`, `UnauthorizedException`, `ForbiddenException` used consistently

### Logging
- NestJS `Logger` class across all services (`Logger.log`, `.error`, `.warn`, `.debug`)
- Bootstrap logger for startup info
- Dashboard/mobile use `console.error` only for env var checks
- French error messages in dashboard/mobile UI

### Audit
- **Immutable audit log**: Hash chain (`previousHash` + `currentHash`) via `AuditModule`
- **`@Audited()` decorator**: Declarative on endpoints — automatically enqueues write-audit job
- **BullMQ queue**: Async audit writes never block responses
- **Schema**: `AuditLog` model with action, entity, entityId, changes (JSON), IP, user agent, hash chain

### Multi-Tenancy
- **Organization-based isolation**: All data models reference `organizationId`
- **OrganizationMember join table**: Users can belong to multiple orgs with different roles
- **TenantContextMiddleware**: Extracts org context from JWT for downstream use
- **TenantIsolationGuard**: Global guard ensures org-scoped access
- **Feature flags**: Per-organization feature flag toggles (`FeatureFlag` model + `FeatureGateGuard`)

### Event-Driven Architecture
- **BullMQ queues** (Redis-backed):
  - `ai-process`: Frame analysis jobs (camera ingestion → AI inference)
  - `audit-write`: Async audit log writes
  - `notification-send`: Push/email notification dispatch
  - `correlation-event`: Event correlation processing
- **Socket.IO Gateway**: Real-time push to dashboard (alerts, notifications)
- **EventEmitter2**: In-process events for MQTT message routing
- **MQTT**: Hardware-layer communication (door state, badge reads, controller health)

### Data Validation
- **Dual validation**: Zod schemas in `packages/shared/` for runtime validation + class-validator DTOs in `apps/api/src/common/dto/` for Swagger/OpenAPI documentation
- **Config validation**: Joi schema in `apps/api/src/config/validation.ts` validates environment variables at startup

### Background Jobs
- **BullMQ processors** in `apps/api/src/modules/` — each module can have processor files:
  - `ai.processor.ts` — processes frame analysis jobs
  - `correlation.processor.ts` — event correlation
  - `tailgating.processor.ts` — tailgating detection
  - `notifications.processor.ts` — notification dispatch
- **ScheduleModule**: `@nestjs/schedule` for cron/scheduled tasks
- **Automatic camera restart**: `onModuleInit()` in `AppModule` re-starts active camera streams after API restart

### Rate Limiting
- **Global**: `@fastify/rate-limit` applies to all `/api/*` routes (100 req/60s default)
- **Auth endpoints**: Stricter limit (5 req/60s) on login/register/refresh
- **Tenant API keys**: Per-key rate limiting via `TenantApiKeyGuard`

---

*Architecture analysis: 2026-07-17*
