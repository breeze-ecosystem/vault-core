# Technology Stack

> Generated: 2026-07-17

## Languages

| Language | Version | Location |
|----------|---------|----------|
| TypeScript | 5.9.2 | `apps/api/`, `apps/dashboard/`, `apps/marketing/`, `apps/mobile/`, `packages/shared/`, `packages/ui/`, `packages/design/` |
| Python | 3.11 | `services/ai-preprocessor/` |
| Python | 3.12 | `edge/agent/` |

## Runtime

- **Runtime:** Node.js >=18 (enforced in root `package.json` `engines` field)
- **Package Manager:** pnpm 9.0.0 (enforced via `packageManager` field and Corepack in Dockerfiles)
- **Lockfile:** `pnpm-lock.yaml` (frozen in Docker builds)
- **Monorepo Tool:** Turborepo 2.9.6 (`turbo.json`)
- **Docker Base Images:** `node:20-alpine` (API, Dashboard, Marketing), `python:3.11-slim` (AI Preprocessor), `python:3.12-slim` (Edge Agent)

## Frameworks

| Framework | Version | Package | Location |
|-----------|---------|---------|----------|
| NestJS | 10.4.8 | `@nestjs/core` | `apps/api/` |
| Next.js | 14.2.15 | `next` | `apps/dashboard/`, `apps/marketing/` |
| Expo SDK | 54.0.34 | `expo` | `apps/mobile/` |
| Expo Router | 6.0.23 | `expo-router` | `apps/mobile/` |
| FastAPI | 0.115.0 | `fastapi` | `services/ai-preprocessor/` |
| Prisma | 5.22.0 | `@prisma/client`, `prisma` | `apps/api/prisma/` |
| React | 18.3.1 / 19.1.0 | `react` | All web + mobile |
| React Native | 0.81.5 | `react-native` | `apps/mobile/` |
| Tailwind CSS | 3.x | `tailwindcss` | `apps/dashboard/`, `apps/marketing/` |
| Jest | 29.7.0 | `jest` | `apps/api/` |
| Socket.IO | 4.8.3 | `socket.io`, `socket.io-client` | `apps/api/`, `apps/dashboard/` |

## Key Dependencies

### API (`apps/api/`)

| Dependency | Version | Purpose |
|------------|---------|---------|
| `@nestjs/core` | 10.4.8 | NestJS core framework with Fastify adapter (`@nestjs/platform-fastify`) |
| `@prisma/client` | 5.22.0 | PostgreSQL ORM with generated types |
| `@nestjs/jwt` | 10.2.0 | JWT token creation and validation |
| `passport-jwt` | 4.0.1 | JWT authentication strategy |
| `@nestjs/passport` | 10.0.3 | Passport integration |
| `jsonwebtoken` | 9.0.3 | Low-level JWT signing/verification |
| `bcryptjs` | 2.4.3 | Password hashing |
| `bullmq` | 5.30.0 | Job queues backed by Redis |
| `@nestjs/bullmq` | 11.0.4 | BullMQ NestJS module |
| `ioredis` | 5.4.1 | Redis client |
| `socket.io` | 4.8.3 | WebSocket server |
| `@nestjs/platform-socket.io` | 10.4.22 | Socket.IO NestJS integration |
| `@nestjs/event-emitter` | 3.1.0 | In-process event emitter |
| `@nestjs/schedule` | 6.1.3 | Cron/scheduling |
| `@nestjs/swagger` | 7.4.2 | OpenAPI/Swagger documentation |
| `@nestjs/terminus` | 10.2.2 | Health checks |
| `@nestjs/config` | 3.3.0 | Configuration management |
| `zod` | 3.23.8 | Schema validation (via shared package) |
| `class-validator` | 0.14.1 | DTO validation for Swagger |
| `class-transformer` | 0.5.1 | Object transformation |
| `joi` | 18.2.1 | Environment variable validation |
| `resend` | 6.12.3 | Email delivery SDK |
| `@fastify/helmet` | 11.1.1 | Security headers |
| `@fastify/rate-limit` | 9.1.0 | Rate limiting |
| `@fastify/cookie` | 9.4.0 | Cookie parsing |
| `@fastify/static` | 7.0.4 | Static file serving |
| `mqtt` | 5.15.2 | MQTT client for door controller communication |
| `ollama` | 0.6.3 | Ollama API client |
| `@langchain/community` | 1.1.29 | LangChain community integrations |
| `@langchain/core` | 1.2.2 | LangChain core |
| `@qdrant/js-client-rest` | 1.18.0 | Qdrant vector DB client |
| `pgvector` | 0.3.0 | pgvector PostgreSQL extension client |
| `passport` | 0.7.0 | Authentication middleware |
| `passport-saml` | 3.2.4 | SAML SSO authentication |
| `@node-saml/node-saml` | 5.1.0 | SAML protocol support |
| `openid-client` | 6.8.4 | OIDC client for SSO |
| `otplib` | 13.4.1 | TOTP (2FA) |
| `qrcode` | 1.5.4 | QR code generation |
| `pdfkit` | 0.19.1 | PDF report generation |
| `handlebars` | 4.7.9 | Email template engine |
| `reflec-metadata` | 0.2.2 | TypeScript decorator support |
| `fastify` | 4.28.1 | HTTP server (devDependency for types) |

### Dashboard (`apps/dashboard/`)

| Dependency | Version | Purpose |
|------------|---------|---------|
| `next` | 14.2.15 | React framework (Pages Router) |
| `react` / `react-dom` | 18.3.1 | UI library |
| `socket.io-client` | 4.8.3 | WebSocket client |
| `@radix-ui/*` | multiple | Accessible UI primitives (avatar, dialog, dropdown-menu, scroll-area, separator, slot, tooltip) |
| `class-variance-authority` | 0.7.1 | Component variant management |
| `clsx` / `tailwind-merge` | 2.1.1 / 3.5.0 | Class name utilities (`cn()`) |
| `lucide-react` | 1.11.0 | Icon library |
| `recharts` | 2.15.1 | Charting library |
| `tailwindcss-animate` | 1.0.7 | Tailwind animation plugin |
| `motion` | 12.42.2 | Animation library |
| `next-themes` | 0.4.6 | Theme switching |

### Mobile (`apps/mobile/`)

| Dependency | Version | Purpose |
|------------|---------|---------|
| `expo` | 54.0.34 | Expo SDK |
| `expo-router` | 6.0.23 | File-based routing |
| `react-native` | 0.81.5 | React Native core |
| `expo-av` | 16.0.8 | Audio/video playback |
| `expo-secure-store` | 15.0.8 | Secure token storage |
| `@react-native-async-storage/async-storage` | 2.1.0 | Async key-value storage |
| `expo-file-system` | 19.0.23 | File system access |
| `expo-font` | 14.0.11 | Font loading |
| `expo-linking` | 8.0.12 | Deep linking |
| `expo-constants` | 18.0.13 | App constants |
| `lucide-react-native` | 1.16.0 | Mobile icons |
| `react-native-safe-area-context` | 5.6.2 | Safe area handling |
| `react-native-screens` | 4.16.0 | Native screen containers |
| `@expo/vector-icons` | 15.1.1 | Vector icons |

### Marketing Site (`apps/marketing/`)

| Dependency | Version | Purpose |
|------------|---------|---------|
| `next` | 14.2.15 | React framework (App Router) |
| `next-intl` | 4.13.2 | Internationalization |
| `velite` | 0.4.0 | Content management (blog posts via MDX) |
| `satori` | 0.28.0 | OG image generation |
| `sharp` | 0.35.3 | Image processing |
| `@tailwindcss/typography` | 0.5.x | Typography plugin |
| `motion` | 12.42.2 | Animations |

### AI Preprocessor (`services/ai-preprocessor/`)

| Dependency | Version | Purpose |
|------------|---------|---------|
| `fastapi` | 0.115.0 | Python web framework |
| `uvicorn` | 0.30.6 | ASGI server |
| `pydantic` / `pydantic-settings` | 2.9.2 / 2.5.2 | Data validation |
| `httpx` | 0.27.2 | Async HTTP client |
| `Pillow` | 10.4.0 | Image processing |
| `ultralytics` | >=8.4 | YOLO object detection |
| `supervision` | >=0.25 | Computer vision utilities |
| `faster-whisper` | >=1.2 | Audio transcription |
| `paddleocr` / `paddlepaddle` | >=3.7 / >=2.6 | License plate recognition |
| `opencv-python` | >=5.0 | Computer vision |
| `av` | >=18.0 | Audio/video processing |
| `qdrant-client` | >=1.18 | Vector DB client |
| `tensorflow-hub` | >=0.16 | ML model hub |

### Edge Agent (`edge/agent/`)

| Dependency | Version | Purpose |
|------------|---------|---------|
| `httpx` | >=0.27 | HTTP client |
| `psutil` | >=5.9 | System metrics |
| `docker` | >=7.0 | Docker API for container management |
| `schedule` | >=1.2 | Job scheduling |

### Shared Package (`packages/shared/`)

| Dependency | Version | Purpose |
|------------|---------|---------|
| `zod` | 3.23.8 | Schema validation definitions shared across API, Dashboard, Mobile |

### UI Package (`packages/ui/`)

| Dependency | Version | Purpose |
|------------|---------|---------|
| `react` / `react-dom` | 18.3.1 | Reusable React components (button, card, code) |

## Configuration

| Config File | Purpose | Key Settings |
|-------------|---------|--------------|
| `.env.example` | Master template with all configuration variables | Database, Redis, JWT, CORS, AI, notifications, streaming |
| `turbo.json` | Turborepo task pipeline | Build, lint, dev, check-types, prisma commands |
| `tsconfig.json` (root + packages) | TypeScript configuration | Strict mode, path aliases `@/*` |
| `apps/api/jest.config.js` | Jest test config for API | ts-jest, coverage |
| `apps/dashboard/tailwind.config.ts` | Tailwind CSS config for dashboard | Dark theme, custom animations, `tailwindcss-animate` |
| `apps/marketing/tailwind.config.ts` | Tailwind CSS config for marketing | Typography plugin, custom brand colors |
| `apps/marketing/velite.config.ts` | Velite content collection config | Blog posts from MDX |
| `eas.json` | Expo Application Services | Build profiles: development, preview, production |
| `app.json` | Expo app config | Android package: `com.oversight.ai`; EAS projectId |
| `docker-compose.yml` | Coolify Docker services | API, Dashboard, Marketing, AI Preprocessor, Mosquitto, Qdrant |
| `docker-compose.prod.yml` | Self-contained production deployment | PostgreSQL 16, Redis 7, Caddy 2, API, Dashboard, AI Preprocessor, Qdrant |
| `nest-cli.json` | NestJS build config | sourceRoot: `src`, deleteOutDir |
| `next.config.js` / `next.config.mjs` | Next.js configuration | Standalone output mode for Docker |
| `Caddyfile` | Reverse proxy routing | Routes `/api/*` and `/ws/*` to API, all other traffic to Dashboard |
| `.github/workflows/deploy-tag.yml` | Auto-deploy on tag push | Deploys to Coolify via API |
| `.github/workflows/ci.yml` | CI pipeline | Lint, type-check, build |

### Environment Variables

| Variable Group | Key Variables | Source |
|----------------|--------------|--------|
| Database | `DATABASE_URL` | `.env` |
| Cache | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | `.env` |
| Auth | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_INVITE_SECRET` | `.env` |
| CORS | `CORS_ORIGIN`, `CORS_CREDENTIALS` | `.env` |
| API | `PORT`, `NODE_ENV` | `.env` |
| Dashboard | `NEXT_PUBLIC_API_URL`, `DASHBOARD_PORT`, `NEXT_PUBLIC_APP_NAME` | `.env` |
| AI | `OLLAMA_BASE_URL`, `AI_PREPROCESSOR_URL`, `QDRANT_URL`, `VLLM_URL` | `.env` |
| AI Models | `QWEN_VL_MODEL`, `QWEN_EMBEDDING_MODEL`, `LLAMA_MODEL`, `YOLO_MODEL`, `WHISPER_MODEL` | `.env` |
| Notifications | `FCM_SERVER_KEY`, `FIREBASE_CREDENTIALS`, `PUSH_WEBHOOK_URL`, `SMTP_*`, `RESEND_API_KEY` | `.env` |
| Edge | `EDGE_AGENT_SECRET`, `SUPERVISION_API_URL` | `.env` |
| Streaming | `NEXT_PUBLIC_STREAM_URL` | `.env` |
| MQTT | `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD` | `.env` |
| Security | `ENCRYPTION_KEY`, `LICENSE_PRIVATE_KEY_PATH` | `.env` |
| Admin Seed | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME` | `.env` |
| Marketing | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `CONTACT_NOTIFICATION_EMAIL` | `.env` |

---

*Stack analysis: 2026-07-17*
