# Technology Stack

**Analysis Date:** 2026-07-14

## Languages

**Primary:**
- TypeScript 5.9.2 - Used across all Node.js applications: API (`apps/api`), Dashboard (`apps/dashboard`), Mobile (`apps/mobile`), and shared packages (`packages/shared`, `packages/ui`)

**Secondary:**
- Python 3.11 - AI Preprocessor microservice (`services/ai-preprocessor`)
- Python 3.12 - Edge Agent (`edge/agent`)

## Runtime

**Environment:**
- Node.js >=18 (specified in root `package.json` engines field)
- Python 3.11 (AI preprocessor Docker image)
- Python 3.12 (Edge agent Docker image)
- Alpine Linux (all Docker containers use `node:20-alpine`, `python:3.11-slim`, `python:3.12-slim`)

**Package Manager:**
- pnpm 9.0.0 (set via `packageManager` field in root `package.json` and enforced via Corepack in Dockerfiles)
- Lockfile: `pnpm-lock.yaml` (present, frozen in Docker builds)

## Frameworks

**Core:**
- NestJS 10.4.8 - Backend API (`apps/api`) using `@nestjs/core` with Fastify adapter (`@nestjs/platform-fastify`)
- Next.js 14.2.15 - Web dashboard (`apps/dashboard`) with Pages Router (no App Router detected — `src/` directory not found, app directory used)
- Expo SDK 54 (`expo ~54.0.34`) - Mobile app (`apps/mobile`) with Expo Router 6 (`expo-router ~6.0.23`)
- FastAPI 0.115.0 - AI preprocessor microservice (`services/ai-preprocessor`)
- Tailwind CSS 3 - Dashboard styling (`apps/dashboard/tailwind.config.ts`) with `tailwindcss-animate`

**Testing:**
- Jest 29.7.0 with ts-jest 29.2.5 - API unit tests (`apps/api/jest.config.js`)
- No test framework detected for Dashboard or Mobile

**Build/Dev:**
- Turborepo 2.9.6 - Monorepo orchestration (`turbo.json`)
- Prettier 3.7.4 - Code formatting (root `package.json`)
- Prisma 5.22.0 - Database ORM and migration tool (`apps/api/prisma/`)
- TypeScript 5.9.2 - Static type checking across all packages

## Key Dependencies

**Critical:**
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

**Infrastructure:**
- `@fastify/helmet` 11.1.1 - Security headers
- `@fastify/rate-limit` 9.1.0 - Rate limiting
- `@fastify/cookie` 9.4.0 - Cookie parsing
- `@fastify/static` 7.0.4 - Static file serving

**Dashboard-specific:**
- `@radix-ui/*` (multiple packages) - Unstyled accessible UI primitives (avatar, dialog, dropdown-menu, scroll-area, separator, slot, tooltip)
- `class-variance-authority` 0.7.1 - Component variant management
- `clsx` 2.1.1 & `tailwind-merge` 3.5.0 - Class name utilities
- `lucide-react` 1.11.0 - Icon library

**Mobile-specific:**
- `react-native` 0.81.5 - React Native core
- `expo-av` 16.0.8 - Audio/video playback
- `expo-secure-store` 15.0.8 - Secure key storage
- `expo-constants` 18.0.13 - App constants
- `expo-font` 14.0.11 - Font loading
- `lucide-react-native` 1.16.0 - Icon library
- `react-native-safe-area-context` 5.6.2 & `react-native-screens` 4.16.0 - Navigation primitives

**Shared Package:**
- `zod` 3.23.8 - Shared schema definitions (`packages/shared/src/schemas/`)

**AI Preprocessor (Python):**
- `fastapi` 0.115.0 - Web framework
- `uvicorn` 0.30.6 - ASGI server
- `httpx` 0.27.2 - HTTP client for async calls
- `pydantic` 2.9.2 & `pydantic-settings` 2.5.2 - Data validation and settings
- `Pillow` 10.4.0 - Image processing

**Edge Agent (Python):**
- `httpx` >=0.27 - HTTP client
- `psutil` >=5.9 - System metrics
- `docker` >=7.0 - Docker API client for container management
- `schedule` >=1.2 - Task scheduling

## Configuration

**Environment:**
- Root `.env.example` - Master template with all configuration variables, organized by section
- `apps/api/.env.example` - API-specific dev defaults
- `env_file` references in Docker Compose files

**Key configuration categories (from `.env.example`):**
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

**Build:**
- `turbo.json` - Task pipeline definitions (build, lint, dev, check-types, prisma commands)
- `tsconfig.json` variants in `packages/typescript-config/` (base, nextjs, react-library)
- `nest-cli.json` - NestJS build config (sourceRoot: `src`, deleteOutDir)
- `next.config.js` - Next.js config (standalone output mode for Docker)
- `eas.json` - Expo Application Services build profiles (development, preview, production)
- `metro.config.js` - Metro bundler config with monorepo watch folders

## Platform Requirements

**Development:**
- Node.js >=18
- pnpm 9.0.0
- Docker (for PostgreSQL, Redis, AI preprocessor, go2rtc)
- Ollama (for local LLM/VLM inference)
- ffmpeg (for RTSP snapshot capture)

**Production:**
- Docker with Docker Compose (`docker-compose.prod.yml` includes PostgreSQL 16, Redis 7, Caddy 2)
- Ollama (local on host or separate GPU server, accessed via `host.docker.internal`)
- go2rtc (streaming server, deployed on edge or accessible from API)
- Coolify (optional external orchestration, via `docker-compose.yml` with `coolify` external network)

---

*Stack analysis: 2026-07-14*
