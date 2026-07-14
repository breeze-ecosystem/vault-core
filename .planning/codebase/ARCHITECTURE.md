<!-- refreshed: 2026-07-14 -->
# Architecture

**Analysis Date:** 2026-07-14

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Caddy Reverse Proxy (:80)                          │
│        `/api/*` → api:4000  |  `/ws/*` → api:4000  |  `/*` → dashboard:3100 │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────────┐
        ▼                          ▼                              ▼
┌───────────────────┐  ┌───────────────────────┐  ┌──────────────────────────┐
│   NestJS API      │  │   Next.js Dashboard   │  │   Expo Mobile App         │
│  (Fastify/4000)   │  │   (React 18/3100)     │  │   (Expo Router/file-routing)│
│  `apps/api/`      │  │  `apps/dashboard/`    │  │  `apps/mobile/`           │
└────┬──────┬───────┘  └───────────┬───────────┘  └─────────────┬────────────┘
     │      │                      │                            │
     │      ▼                      │                            │
     │  ┌──────────────────┐       │                            │
     │  │  BullMQ Queues    │       │                            │
     │  │  (Redis-backed)   │       │                            │
     │  │  - frame-processing│      │                            │
     │  │  - notification   │       │                            │
     │  └────────┬─────────┘       │                            │
     │           │                  │                            │
     ▼           ▼                  ▼                            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            Shared Package                                     │
│  `packages/shared/` — Zod schemas, TypeScript types, constants (role hierarchy, │
│  alert/camera enums), validation rules                                       │
└──────────────────────────────────────────────────────────────────────────────┘
     │           │                  │
     ▼           ▼                  ▼
┌──────────┐ ┌─────────┐ ┌──────────────────┐ ┌─────────┐
│PostgreSQL│ │  Redis   │ │  AI Preprocessor │ │ Ollama  │
│(Prisma)  │ │ (BullMQ, │ │  (Python/FastAPI │ │ (LLM)   │
│          │ │ cache)   │ │  :8000)          │ │ :11434  │
└──────────┘ └─────────┘ └──────────────────┘ └─────────┘

┌──────────────────────────────────────────────────────────┐
│                  Edge Agent (Python)                      │
│  `edge/agent/` — Health monitoring, backups, self-update │
│  Deployed on edge servers, reports to supervision API    │
└──────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| NestJS API | REST API, auth, business logic, real-time (WebSocket) | `apps/api/src/` |
| Next.js Dashboard | Web admin interface, PWA | `apps/dashboard/` |
| Expo Mobile | Cross-platform mobile app (iOS/Android) | `apps/mobile/` |
| Shared Package | Zod schemas, TypeScript types, shared constants, role hierarchy | `packages/shared/src/` |
| UI Package | Reusable React components (button, card, code) | `packages/ui/src/` |
| AI Preprocessor | Python FastAPI service for frame analysis | `services/ai-preprocessor/` |
| Edge Agent | Python service for edge server health monitoring | `edge/agent/` |
| Caddy | Reverse proxy: routes to API (REST+WS) and Dashboard | `Caddyfile` |

## Pattern Overview

**Overall:** Modular monolith with shared-kernel monorepo

**Key Characteristics:**
- pnpm workspaces + Turborepo for builds
- NestJS modular architecture (controllers, services, modules) with Fastify HTTP adapter
- Next.js App Router with route groups for auth/dashboard separation
- Role-Based Access Control (RBAC) via decorators and guards
- Dual validation: Zod (shared schemas) for runtime validation + class-validator (NestJS DTOs) for Swagger/OpenAPI
- Event-driven: BullMQ queues backed by Redis for frame processing and notification dispatch
- WebSocket real-time layer via Socket.IO (notifications, chat)

## Layers

### API Layer (NestJS)
- Purpose: REST API, authentication, business logic, real-time WebSocket gateway
- Location: `apps/api/src/`
- Contains: Feature modules (`modules/`), cross-cutting concerns (`common/`), app bootstrap (`main.ts`), configuration (`config/`)
- Depends on: `@repo/shared` (schemas, types, constants), Prisma (database client), Redis (queue + cache), External AI services
- Used by: Dashboard, Mobile app, Edge agent, external integrations

### Presentation Layer (Dashboard)
- Purpose: Web admin interface with role-aware navigation
- Location: `apps/dashboard/`
- Contains: Next.js App Router pages (`app/`), React components (`components/`), API client (`lib/api.ts`), auth client (`lib/auth-client.ts`), i18n (`lib/i18n/`), shadcn/ui components (`components/ui/`)
- Depends on: `@repo/shared`, NestJS API
- Used by: Administrators, operators, supervisors via browser

### Presentation Layer (Mobile)
- Purpose: Cross-platform mobile companion app
- Location: `apps/mobile/`
- Contains: Expo Router screens (`app/`), React Native components (`components/`), API client (`lib/api.ts`), auth with SecureStore
- Depends on: NestJS API (REST endpoints)
- Used by: Field operators via iOS/Android

### Shared Kernel Layer
- Purpose: Shared TypeScript types, validation schemas, constants, role hierarchy
- Location: `packages/shared/src/`
- Contains: Zod schemas (`schemas/`), TypeScript types (`types/`), constants (`constants/`)
- Depends on: `zod` only
- Used by: API, Dashboard, Mobile — all TypeScript consumers

### Infrastructure Layer
- Purpose: Deployment, routing, persistence, queues
- Location: `docker-compose.yml`, `Caddyfile`, `docker/`, `apps/api/prisma/`
- Contains: Docker Compose services, Caddy reverse proxy config, Dockerfiles, Prisma schema
- Depends on: PostgreSQL, Redis, Ollama
- Used by: All services at runtime

## Data Flow

### Primary Request Path (Dashboard → API)

1. User logs in via `apps/dashboard/app/(auth)/login/` page → `POST /api/auth/login`
2. Dashboard auth client (`apps/dashboard/lib/auth-client.ts:18`) stores access token in `sessionStorage` and refresh token in HttpOnly cookie
3. Authenticated requests use `fetchWithAuth()` (`apps/dashboard/lib/auth-client.ts:102`) — automatically attaches `Authorization: Bearer` header and refreshes on 401
4. Data-fetching functions in `apps/dashboard/lib/api.ts` call API endpoints
5. API validates via NestJS `ValidationPipe` (global, `apps/api/src/main.ts:116`) + `ZodValidationPipe` (`apps/api/src/common/pipes/zod-validation.pipe.ts:7`)
6. Guards (`apps/api/src/common/guards/jwt-auth.guard.ts:11`) verify JWT; `RolesGuard` (`apps/api/src/common/guards/roles.guard.ts:12`) checks role hierarchy from `@repo/shared`
7. Controller delegates to Service, Service uses Prisma (`apps/api/src/modules/prisma/prisma.service.ts`) to query PostgreSQL
8. Response flows back; errors caught by `AllExceptionsFilter` (`apps/api/src/common/filters/all-exceptions.filter.ts:21`)

### Real-time Notification Flow

1. Alert triggered (e.g., AI detection in frame processing)
2. `NotificationService` (`apps/api/src/modules/notification/notification.service.ts`) dispatches via BullMQ notification queue
3. `NotificationGateway` (`apps/api/src/modules/notification/notification.gateway.ts`) pushes to connected Socket.IO clients
4. Dashboard receives via `socket.io-client` (`apps/dashboard/package.json`), displays real-time toast

### Video Ingestion Flow

1. Camera configured with RTSP URL in Dashboard
2. Operator starts stream via `POST /api/ingestion/:cameraId/start`
3. `IngestionService` ( `apps/api/src/modules/ingestion/ingestion.service.ts`) begins frame capture from RTSP stream
4. Frames dispatched to `frame-processing` BullMQ queue
5. `InferenceProcessor` (`apps/api/src/modules/inference/inference.processor.ts`) sends frames to AI Preprocessor (`services/ai-preprocessor/`) or Ollama for analysis
6. Alerts generated based on CameraPrompt rules (`apps/api/prisma/schema.prisma:127`) and AI analysis results

### Edge Agent Health Flow

1. Edge Agent (`edge/agent/agent.py`) runs periodic health checks on local Docker services
2. Reports heartbeats to Supervision API (`apps/api/src/modules/supervision/`)
3. Performs daily backups, checks for Docker image updates
4. Central dashboard displays edge server status via supervision endpoints

**State Management:**
- Dashboard: React Context for auth (`apps/dashboard/lib/auth-context.tsx:28`), `sessionStorage` for access tokens
- Mobile: React Context for auth (`apps/mobile/lib/auth-context.tsx`), `expo-secure-store` for token persistence
- API: Stateless (JWT), with Redis for queue state and session management

## Key Abstractions

### NestJS Module Pattern
- Purpose: Feature encapsulation — each module bundles controller, service, and defines dependencies
- Examples: `apps/api/src/modules/alert/alert.module.ts`, `apps/api/src/modules/auth/auth.module.ts`
- Pattern: `@Module({ controllers: [...], providers: [...], exports: [...] })`

### Global Module Pattern
- Purpose: Provide singletons (database client, queues) across all modules without explicit imports
- Example: `apps/api/src/modules/prisma/prisma.module.ts` — decorated with `@Global()`, exports `PrismaService`

### Decorator-Based RBAC
- Purpose: Declarative access control on route handlers
- Pattern: `@Public()` bypasses JWT guard (`apps/api/src/common/decorators/public.decorator.ts:4`); `@Roles(...)` restricts by role hierarchy (`apps/api/src/common/decorators/roles.decorator.ts:4`)

### Zod Validation Pipe
- Purpose: Runtime validation of request bodies using shared Zod schemas from `@repo/shared`
- Pattern: `@Body(new ZodValidationPipe(loginSchema))` in controllers (`apps/api/src/modules/auth/auth.controller.ts:69`)

### shadcn/ui Component System
- Purpose: Accessible, customizable UI primitives built on Radix UI
- Location: `apps/dashboard/components/ui/` (15 components: button, card, table, dialog, toast, etc.)
- Pattern: Each component imports from Radix primitives + Tailwind CSS classes via `cn()` utility

### API Client Pattern
- Purpose: Centralized HTTP client with automatic auth token management
- Location: `apps/dashboard/lib/api.ts`
- Pattern: All API functions use `fetchWithAuth()` which handles 401 refresh transparently; typed interfaces for all responses

### i18n Provider
- Purpose: Client-side internationalization via React Context
- Location: `apps/dashboard/lib/i18n/` with dictionaries in `fr.ts` (primary) and `en.ts`
- Pattern: `I18nProvider` wraps root layout, components use `useI18n()` hook

## Entry Points

### API Server
- Location: `apps/api/src/main.ts` (bootstrap function)
- Triggers: Docker container start / `node dist/src/main.js`
- Responsibilities: Creates NestJS app with Fastify, configures Helmet/CORS/rate-limit/cookies, sets global prefix to `/api`, generates Swagger docs at `/api/docs`, loads `AppModule`, auto-starts active camera streams on init

### Dashboard
- Location: `apps/dashboard/app/layout.tsx` (RootLayout)
- Triggers: Next.js server start on port 3100
- Responsibilities: Renders HTML shell with dark theme, `I18nProvider`, PWA manifest/service worker registration

### Mobile App
- Location: `apps/mobile/app/_layout.tsx` (RootLayout)
- Triggers: Expo Router entry point (`expo-router/entry`)
- Responsibilities: Validates config, provides `AuthProvider`, sets up Stack navigator with tab group and modal screens

### Caddy (Reverse Proxy)
- Location: `Caddyfile`
- Triggers: Docker container start on port 80
- Responsibilities: Routes `/api/*` and `/ws/*` to API service, all other traffic to Dashboard

## Architectural Constraints

- **Threading:** NestJS uses Node.js single-threaded event loop; BullMQ workers process jobs concurrently via Redis-backed queues
- **Global state:** `PrismaService` is a `@Global()` singleton in NestJS; `ConfigModule` is global (loaded in `AppModule`)
- **Circular imports:** Not detected — modules are cleanly separated with Prisma as global provider
- **Monorepo constraints:** All TypeScript packages share a single `typescript@5.9.2` version; React types are overridden to `19.1.10` in root `package.json`
- **Node.js:** Requires `>=18` runtime
- **Package manager:** pnpm `9.0.0` enforced via `packageManager` field

## Error Handling

**Strategy:** Centralized exception filter for NestJS + per-request error handling in clients

**Patterns:**
- `AllExceptionsFilter` (`apps/api/src/common/filters/all-exceptions.filter.ts:21`) catches all unhandled exceptions, returns standardized `{ statusCode, error, message, path, timestamp }` response
- `ZodValidationPipe` throws `BadRequestException` with field-level error details on validation failure
- JWT guard throws `UnauthorizedException`; Roles guard throws `ForbiddenException`
- Dashboard API client throws generic `Error` with French messages; components display with toast/error UI
- Mobile API client uses similar try/catch patterns with French error messages

## Cross-Cutting Concerns

**Logging:** NestJS `Logger` class — instanced per context (Bootstrap, module services, exception filter); logs at `log`, `error`, `warn`, `debug` levels
**Validation:** Dual-layer: Zod schemas in `@repo/shared` for runtime parsing via `ZodValidationPipe`, class-validator decorators in DTOs (`apps/api/src/common/dto/index.ts`) for Swagger/OpenAPI metadata
**Authentication:** JWT (access + refresh tokens) via Passport.js strategies; access token in `Authorization` header (mobile) or cookie (web); refresh token via HttpOnly cookie (web) or body (mobile); roles enforced via `RolesGuard`
**Audit:** All auth operations (login, logout, register) and entity mutations logged to `AuditLog` table via `AuditService` (`apps/api/src/modules/audit/audit.service.ts`)

---

*Architecture analysis: 2026-07-14*
