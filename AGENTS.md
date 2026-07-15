<!-- GSD:project-start source:PROJECT.md -->
## Project

**Oversight Hub**

Oversight Hub is a commercial SaaS platform that delivers AI-powered physical security intelligence — unifying video surveillance, access control, and operational security into a single, premium experience. Sold via subscription and license to security teams, IT, facilities, and operations worldwide, it correlates real-world events (badges, doors, vehicles, incidents, anomalies) with video evidence and automated decision workflows. It replaces fragmented point solutions with an integrated platform that is visually stunning, intuitive, and AI-first.

**Core Value:** Correlate every physical security event with video evidence and AI analysis in real time, so security operators know what happened, where, and what to do — without switching between disconnected systems.

### Constraints

- **Tech stack**: Must build on existing NestJS + Next.js + Expo + Prisma + Redis + BullMQ stack. No framework rewrites.
- **AI**: Continue using Ollama/vision models for AI analysis; integrate with access control events.
- **Deployment**: Self-hosted via Docker Compose with Caddy reverse proxy. No mandatory cloud dependency.
- **Performance**: Real-time alerting must stay sub-second. Video correlation must not block the event pipeline.
- **Security**: Role-based access control must extend to new modules. Audit logs must be immutable. JWT auth must cover all new endpoints.
- **Mobile**: Expo mobile app must support new guard/operator workflows (check-in, incident response, door control).
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9.2 - Used across all Node.js applications: API (`apps/api`), Dashboard (`apps/dashboard`), Mobile (`apps/mobile`), and shared packages (`packages/shared`, `packages/ui`)
- Python 3.11 - AI Preprocessor microservice (`services/ai-preprocessor`)
- Python 3.12 - Edge Agent (`edge/agent`)
## Runtime
- Node.js >=18 (specified in root `package.json` engines field)
- Python 3.11 (AI preprocessor Docker image)
- Python 3.12 (Edge agent Docker image)
- Alpine Linux (all Docker containers use `node:20-alpine`, `python:3.11-slim`, `python:3.12-slim`)
- pnpm 9.0.0 (set via `packageManager` field in root `package.json` and enforced via Corepack in Dockerfiles)
- Lockfile: `pnpm-lock.yaml` (present, frozen in Docker builds)
## Frameworks
- NestJS 10.4.8 - Backend API (`apps/api`) using `@nestjs/core` with Fastify adapter (`@nestjs/platform-fastify`)
- Next.js 14.2.15 - Web dashboard (`apps/dashboard`) with Pages Router (no App Router detected — `src/` directory not found, app directory used)
- Expo SDK 54 (`expo ~54.0.34`) - Mobile app (`apps/mobile`) with Expo Router 6 (`expo-router ~6.0.23`)
- FastAPI 0.115.0 - AI preprocessor microservice (`services/ai-preprocessor`)
- Tailwind CSS 3 - Dashboard styling (`apps/dashboard/tailwind.config.ts`) with `tailwindcss-animate`
- Jest 29.7.0 with ts-jest 29.2.5 - API unit tests (`apps/api/jest.config.js`)
- No test framework detected for Dashboard or Mobile
- Turborepo 2.9.6 - Monorepo orchestration (`turbo.json`)
- Prettier 3.7.4 - Code formatting (root `package.json`)
- Prisma 5.22.0 - Database ORM and migration tool (`apps/api/prisma/`)
- TypeScript 5.9.2 - Static type checking across all packages
## Key Dependencies
- `@prisma/client` 5.22.0 - PostgreSQL ORM with generated types (used across all API modules)
- `@nestjs/jwt` 10.2.0 & `passport-jwt` 4.0.1 - JWT authentication
- `bcryptjs` 2.4.3 - Password hashing
- `bullmq` 5.30.0 - Job queues backed by Redis (frame processing, notifications)
- `ioredis` 5.4.1 - Redis client
- `resend` 6.12.3 - Email delivery provider SDK
- `socket.io` 4.8.3 / `socket.io-client` 4.8.3 - WebSocket real-time communication (server + dashboard client)
- `zod` 3.23.8 - Schema validation (shared package)
- `class-validator` 0.14.1 & `class-transformer` 0.5.1 - DTO validation in NestJS
- `joi` 18.2.1 - Environment variable validation (`apps/api/src/config/validation.ts`)
- `uuid` 10.0.0 - UUID generation
- `@fastify/helmet` 11.1.1 - Security headers
- `@fastify/rate-limit` 9.1.0 - Rate limiting
- `@fastify/cookie` 9.4.0 - Cookie parsing
- `@fastify/static` 7.0.4 - Static file serving
- `@radix-ui/*` (multiple packages) - Unstyled accessible UI primitives (avatar, dialog, dropdown-menu, scroll-area, separator, slot, tooltip)
- `class-variance-authority` 0.7.1 - Component variant management
- `clsx` 2.1.1 & `tailwind-merge` 3.5.0 - Class name utilities
- `lucide-react` 1.11.0 - Icon library
- `react-native` 0.81.5 - React Native core
- `expo-av` 16.0.8 - Audio/video playback
- `expo-secure-store` 15.0.8 - Secure key storage
- `expo-constants` 18.0.13 - App constants
- `expo-font` 14.0.11 - Font loading
- `lucide-react-native` 1.16.0 - Icon library
- `react-native-safe-area-context` 5.6.2 & `react-native-screens` 4.16.0 - Navigation primitives
- `zod` 3.23.8 - Shared schema definitions (`packages/shared/src/schemas/`)
- `fastapi` 0.115.0 - Web framework
- `uvicorn` 0.30.6 - ASGI server
- `httpx` 0.27.2 - HTTP client for async calls
- `pydantic` 2.9.2 & `pydantic-settings` 2.5.2 - Data validation and settings
- `Pillow` 10.4.0 - Image processing
- `httpx` >=0.27 - HTTP client
- `psutil` >=5.9 - System metrics
- `docker` >=7.0 - Docker API client for container management
- `schedule` >=1.2 - Task scheduling
## Configuration
- Root `.env.example` - Master template with all configuration variables, organized by section
- `apps/api/.env.example` - API-specific dev defaults
- `env_file` references in Docker Compose files
- Database: `DATABASE_URL` (PostgreSQL connection string)
- Cache: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- Auth: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`
- CORS: `CORS_ORIGIN`, `CORS_CREDENTIALS`
- Rate Limiting: `RATE_LIMIT_TTL`, `RATE_LIMIT_MAX`
- AI/LLM: `OLLAMA_BASE_URL`, `AI_PREPROCESSOR_URL`, `QDRANT_URL`
- Notifications: `FCM_SERVER_KEY`, `FIREBASE_CREDENTIALS`, `PUSH_WEBHOOK_URL`, `SMTP_*`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Edge: `EDGE_AGENT_SECRET`, `SUPERVISION_API_URL`
- Streaming: `NEXT_PUBLIC_STREAM_URL` (go2rtc)
- Admin Seed: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`
- Dashboard: `NEXT_PUBLIC_API_URL`, `DASHBOARD_PORT`, `NEXT_PUBLIC_APP_NAME`
- `turbo.json` - Task pipeline definitions (build, lint, dev, check-types, prisma commands)
- `tsconfig.json` variants in `packages/typescript-config/` (base, nextjs, react-library)
- `nest-cli.json` - NestJS build config (sourceRoot: `src`, deleteOutDir)
- `next.config.js` - Next.js config (standalone output mode for Docker)
- `eas.json` - Expo Application Services build profiles (development, preview, production)
- `metro.config.js` - Metro bundler config with monorepo watch folders
## Platform Requirements
- Node.js >=18
- pnpm 9.0.0
- Docker (for PostgreSQL, Redis, AI preprocessor, go2rtc)
- Ollama (for local LLM/VLM inference)
- ffmpeg (for RTSP snapshot capture)
- Docker with Docker Compose (`docker-compose.prod.yml` includes PostgreSQL 16, Redis 7, Caddy 2)
- Ollama (local on host or separate GPU server, accessed via `host.docker.internal`)
- go2rtc (streaming server, deployed on edge or accessible from API)
- Coolify (optional external orchestration, via `docker-compose.yml` with `coolify` external network)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- kebab-case for most files: `stats-card.tsx`, `auth.service.ts`, `zod-validation.pipe.ts`
- NestJS modules follow specific suffixes: `*.service.ts`, `*.controller.ts`, `*.module.ts`, `*.spec.ts`, `*.gateway.ts`, `*.decorator.ts`, `*.processor.ts`
- Dashboard layouts: `layout.tsx`, page routes: `page.tsx`
- Expo Router uses file-based routing with `_layout.tsx`, `index.tsx`, `[id].tsx`
- camelCase: `findAll`, `findById`, `createTokens`, `fetchDashboardStats`, `hasMinRole`
- Async functions: `async function fetchCameras()` or `async findAll()`
- React hooks: `useAuth()`, `useSidebar()` — always prefixed with `use`
- React components: `function StatsCard()` or arrow function `const Button = React.forwardRef(...)`
- camelCase: `mockUser`, `refreshToken`, `isAuthenticated`, `onlineCount`
- Destructuring used extensively in function parameters:
- PascalCase: `StatsCardProps`, `DashboardUser`, `PaginatedResponse<T>`, `CameraPrompt`, `AuthResult`, `StandardErrorResponse`
- Prefer `interface` over `type` for object shapes; use `type` for unions, primitives, and utility types
- Type imports use `import type { ... }` syntax in dashboard/mobile (e.g., `import type { LucideIcon } from "lucide-react"`)
- UPPER_SNAKE_CASE for object constants: `ROLES`, `ROLE_HIERARCHY`, `ALERT_SEVERITY`, `CAMERA_STATUS`
- NestJS metadata keys: `IS_PUBLIC_KEY`, `ROLES_KEY`, `AUDIT_LOG_KEY`
- UPPER_SNAKE_CASE string literals: `"CRITICAL"`, `"HIGH"`, `"OPEN"`, `"ACKNOWLEDGED"`
## Code Style
- **Tool:** Prettier `^3.7.4` (configured at root `package.json` in `@repo/eslint-config`)
- **No `.prettierrc` file** — uses Prettier defaults (2-space indent, double quotes, trailing commas, semicolons)
- Format command: `prettier --write "**/*.{ts,tsx,md}"`
- **Tool:** ESLint v9 (flat config) with `typescript-eslint` v8
- **Shared config:** `@repo/eslint-config` in `packages/eslint-config/`
- **Key rules:**
- Most files use double quotes (`"`): `packages/shared/src/`, `apps/dashboard/`, `apps/mobile/`
- Some API files use single quotes (`'`): `apps/api/src/modules/user/user.service.ts`, `apps/api/src/common/filters/all-exceptions.filter.ts`
- **Inconsistency between apps** — the shared config and Prettier default to double quotes
- Used consistently at end of statements in all TypeScript files
- Dashboard (Next.js): named function declarations with explicit props interfaces
- Dashboard UI primitives (shadcn/ui pattern): `React.forwardRef` with `cva` variants
- Mobile (React Native): function declarations with `StyleSheet.create`
## Import Organization
- All apps and packages use `@/*` mapping to their own root:
- Workspace packages referenced as `@repo/shared`, `@repo/eslint-config`, etc.
## Error Handling
- Use NestJS built-in exceptions: `NotFoundException`, `BadRequestException`, `ConflictException`, `UnauthorizedException`
- Single-line guard clause pattern in services:
- Global exception filter (`AllExceptionsFilter` in `apps/api/src/common/filters/all-exceptions.filter.ts`) wraps all uncaught errors in `StandardErrorResponse`
- Validation errors via `ZodValidationPipe` (`apps/api/src/common/pipes/zod-validation.pipe.ts`):
- Authentication failures: throw `UnauthorizedException` with descriptive messages
- API client functions (`apps/dashboard/lib/api.ts`) check `res.ok` and throw `Error` with messages
- Components use explicit `error: string | null` state with error UI rendering:
- `fetchWithAuth` in `apps/dashboard/lib/auth-client.ts` handles 401 auto-redirect to `/login`
- Try/catch in auth init with graceful fallback: `console.warn("[auth] init error")`
- `ErrorBoundary` component wraps the app root (`apps/mobile/components/error-boundary.tsx`)
## Logging
- NestJS `Logger` injected via constructor pattern:
- Methods: `this.logger.log(...)`, `this.logger.error(...)`, `this.logger.warn(...)`, `this.logger.debug(...)`
- Log messages are in English: `"Database connected"`, `"Database connection failed: ..."`
- Stack traces included for unexpected errors only
- `console.error` only for environment variable checks in `lib/api.ts` and `lib/auth-client.ts`
- No logging framework in dashboard or mobile apps
## Comments
- Horizontal rule comment style used in API test files and some source files:
- Used on decorators and utility functions:
- Used on shared constants:
- Brief explanatory comments for non-obvious logic:
## Function Design
- Most service methods are under 45 lines
- Controllers are thin (10-20 lines per method)
- Dashboard page components can be longer (100-250 lines) due to inline JSX
- Object parameters with inline type annotations preferred over positional args for 3+ params:
- Services return plain objects or Prisma query results directly
- Paginated endpoints return `{ data, total, page, limit }` shape
- Auth endpoints return `{ accessToken, refreshToken, user }` shape
- Error endpoints return `StandardErrorResponse` from global filter
- All I/O operations use `async/await`
- `Promise.all` used for parallel independent operations:
## Module Design
- Named exports preferred (`export function`, `export class`, `export const`)
- Default exports used only for Next.js page components (`export default function OverviewPage()`)
- Barrel file in `packages/shared/src/index.ts` re-exports from sub-modules with clear section headers
## Styling
- Utility-first with `cn()` helper in `apps/dashboard/lib/utils.ts` (clsx + tailwind-merge)
- Dark theme by default (`<html className="dark">`)
- Named semantic color tokens: `text-primary`, `bg-muted`, `border-input`
- Custom utilities: `status-pulse` animation for online camera indicator
- Component variants via `class-variance-authority` (cva):
- Theme tokens in `apps/mobile/lib/theme.ts` (colors, typography, spacing, borderRadius)
- Styles defined at bottom of component files with `StyleSheet.create()`
- Spread operator for typography presets:
## Zod vs class-validator
- `packages/shared/` defines Zod schemas (`registerSchema`, `createCameraSchema`, etc.)
- `apps/api/src/common/dto/index.ts` defines class-validator DTOs for Swagger documentation
- Controllers use `ZodValidationPipe` for runtime validation (`apps/api/src/common/pipes/zod-validation.pipe.ts`)
- Swagger decorators use the class-validator DTO classes for OpenAPI generation
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
### Real-time Notification Flow
### Video Ingestion Flow
### Edge Agent Health Flow
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
- `AllExceptionsFilter` (`apps/api/src/common/filters/all-exceptions.filter.ts:21`) catches all unhandled exceptions, returns standardized `{ statusCode, error, message, path, timestamp }` response
- `ZodValidationPipe` throws `BadRequestException` with field-level error details on validation failure
- JWT guard throws `UnauthorizedException`; Roles guard throws `ForbiddenException`
- Dashboard API client throws generic `Error` with French messages; components display with toast/error UI
- Mobile API client uses similar try/catch patterns with French error messages
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| building-native-ui | Complete guide for building beautiful apps with Expo Router. Covers fundamentals, styling, components, navigation, animations, patterns, and native tabs. | `.agents/skills/building-native-ui/SKILL.md` |
| deploy-to-vercel | Deploy applications and websites to Vercel. Use when the user requests deployment actions like "deploy my app", "deploy and give me the link", "push this live", or "create a preview deployment". | `.agents/skills/deploy-to-vercel/SKILL.md` |
| eas-update-insights | "Check the health of published EAS Updates: crash rates, install/launch counts, unique users, payload size, and the split between embedded and OTA users per channel. Use when the user asks how an update is performing, whether a rollout is healthy, how many users are on the embedded build vs OTA, or wants to gate CI on update health." | `.agents/skills/eas-update-insights/SKILL.md` |
| expo-api-routes | Guidelines for creating API routes in Expo Router with EAS Hosting | `.agents/skills/expo-api-routes/SKILL.md` |
| expo-cicd-workflows | Helps understand and write EAS workflow YAML files for Expo projects. Use this skill when the user asks about CI/CD or workflows in an Expo or EAS context, mentions .eas/workflows/, or wants help with EAS build pipelines or deployment automation. | `.agents/skills/expo-cicd-workflows/SKILL.md` |
| expo-deployment | Deploying Expo apps to iOS App Store, Android Play Store, web hosting, and API routes | `.agents/skills/expo-deployment/SKILL.md` |
| expo-dev-client | Build and distribute Expo development clients locally or via TestFlight | `.agents/skills/expo-dev-client/SKILL.md` |
| expo-module | Guide for creating and writing Expo native modules and views using the Expo Modules API (Swift, Kotlin, TypeScript). Covers module definition DSL, native views, shared objects, config plugins, lifecycle hooks, autolinking, and type system. Use when building or modifying native modules for Expo. | `.agents/skills/expo-module/SKILL.md` |
| expo-tailwind-setup | Set up Tailwind CSS v4 in Expo with react-native-css and NativeWind v5 for universal styling | `.agents/skills/expo-tailwind-setup/SKILL.md` |
| Expo UI Jetpack Compose | "`@expo/ui/jetpack-compose` package lets you use Jetpack Compose Views and modifiers in your app." | `.agents/skills/expo-ui-jetpack-compose/SKILL.md` |
| Expo UI SwiftUI | "`@expo/ui/swift-ui` package lets you use SwiftUI Views and modifiers in your app." | `.agents/skills/expo-ui-swiftui/SKILL.md` |
| find-skills | Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill. | `.agents/skills/find-skills/SKILL.md` |
| frontend-design | Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics. | `.agents/skills/frontend-design/SKILL.md` |
| native-data-fetching | Use when implementing or debugging ANY network request, API call, or data fetching. Covers fetch API, React Query, SWR, error handling, caching, offline support, and Expo Router data loaders (`useLoaderData`). | `.agents/skills/native-data-fetching/SKILL.md` |
| skill-creator | Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy. | `.agents/skills/skill-creator/SKILL.md` |
| upgrading-expo | Guidelines for upgrading Expo SDK versions and fixing dependency issues | `.agents/skills/upgrading-expo/SKILL.md` |
| use-dom | Use Expo DOM components to run web code in a webview on native and as-is on web. Migrate web code to native incrementally. | `.agents/skills/use-dom/SKILL.md` |
| vercel-cli-with-tokens | Deploy and manage projects on Vercel using token-based authentication. Use when working with Vercel CLI using access tokens rather than interactive login — e.g. "deploy to vercel", "set up vercel", "add environment variables to vercel". | `.agents/skills/vercel-cli-with-tokens/SKILL.md` |
| vercel-composition-patterns | React composition patterns that scale. Use when refactoring components with boolean prop proliferation, building flexible component libraries, or designing reusable APIs. Triggers on tasks involving compound components, render props, context providers, or component architecture. Includes React 19 API changes. | `.agents/skills/vercel-composition-patterns/SKILL.md` |
| vercel-react-best-practices | React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimization, or performance improvements. | `.agents/skills/vercel-react-best-practices/SKILL.md` |
| vercel-react-native-skills | React Native and Expo best practices for building performant mobile apps. Use when building React Native components, optimizing list performance, implementing animations, or working with native modules. Triggers on tasks involving React Native, Expo, mobile performance, or native platform APIs. | `.agents/skills/vercel-react-native-skills/SKILL.md` |
| vercel-react-view-transitions | Guide for implementing smooth, native-feeling animations using React's View Transition API (`<ViewTransition>` component, `addTransitionType`, and CSS view transition pseudo-elements). Use this skill whenever the user wants to add page transitions, animate route changes, create shared element animations, animate enter/exit of components, animate list reorder, implement directional (forward/back) navigation animations, or integrate view transitions in Next.js. Also use when the user mentions view transitions, `startViewTransition`, `ViewTransition`, transition types, or asks about animating between UI states in React without third-party animation libraries. | `.agents/skills/vercel-react-view-transitions/SKILL.md` |
| web-design-guidelines | Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices". | `.agents/skills/web-design-guidelines/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
