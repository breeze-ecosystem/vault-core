<p align="center">
  <img src="https://img.shields.io/github/actions/workflow/status/breeze-ecosystem/oversight-hub/ci.yml?branch=main&style=flat-square" alt="Build Status" />
  <img src="https://img.shields.io/github/license/breeze-ecosystem/oversight-hub?style=flat-square" alt="License: MIT" />
</p>

<h1 align="center">OVERSIGHT AI</h1>

<p align="center"><em>Voir tout. Comprendre tout. Agir instantanément.</em></p>

---

## Vision

**OVERSIGHT AI** is an edge-deployed video surveillance platform that combines real-time camera ingestion, AI-powered analysis, and a modern web/mobile dashboard. Designed for self-hosting on a single machine or small cluster, it processes video streams locally with Ollama-hosted models — no cloud dependency, no data leaving your network.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                          │
│   Next.js Dashboard  ·  Expo Mobile App  ·  Caddy Reverse Proxy    │
├─────────────────────────────────────────────────────────────────────┤
│                        BUSINESS LAYER                              │
│          NestJS API (Fastify)  ·  JWT Auth  ·  WebSockets          │
├─────────────────────────────────────────────────────────────────────┤
│                           AI LAYER                                 │
│        FastAPI Preprocessor  ·  Ollama (LLM / Vision Models)        │
├─────────────────────────────────────────────────────────────────────┤
│                          QUEUE LAYER                               │
│                   BullMQ  ·  Redis 7  ·  Job Scheduling            │
├─────────────────────────────────────────────────────────────────────┤
│                        INGESTION LAYER                             │
│          RTSP/FFmpeg Camera Sources  ·  Frame Extraction            │
├─────────────────────────────────────────────────────────────────────┤
│                     PERSISTENCE (PostgreSQL 16)                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

- **Backend API** — [NestJS](https://nestjs.com/) + Fastify + Prisma ORM
- **Dashboard** — [Next.js 14](https://nextjs.org/) + shadcn/ui + Tailwind CSS
- **Mobile** — [Expo](https://expo.dev/) / React Native
- **AI Service** — [FastAPI](https://fastapi.tiangolo.com/) + [Ollama](https://ollama.ai/) (host-side, not containerized)
- **Queue** — [BullMQ](https://bullmq.io/) + Redis 7
- **Database** — PostgreSQL 16
- **Reverse Proxy** — [Caddy 2](https://caddyserver.com/)
- **Monorepo** — [Turborepo](https://turborepo.org/) + pnpm workspaces

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose v2+
- [Ollama](https://ollama.ai/) running on the host (`localhost:11434`)
- (Optional) [Node.js 20+](https://nodejs.org/) & [pnpm 9](https://pnpm.io/) for local development

### 1. Clone & Configure

```bash
git clone https://github.com/breeze-ecosystem/oversight-hub.git
cd oversight-hub
cp .env.example .env
# Edit .env with your secrets (JWT secrets, DB password, etc.)
```

### 2. Launch

```bash
docker compose up -d
```

This starts 6 services: `postgres`, `redis`, `api`, `dashboard`, `ai-preprocessor`, `caddy`.

- **Dashboard**: http://localhost (or `:3100` directly)
- **API**: http://localhost/api → proxied to `:4000`
- **API Docs (Swagger)**: http://localhost:4000/api/docs

### 3. Local Development (without Docker)

```bash
pnpm install
pnpm prisma:generate --filter=@repo/api
pnpm dev
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `oversight` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `oversight_dev` | PostgreSQL password |
| `POSTGRES_DB` | `oversight` | Database name |
| `POSTGRES_PORT` | `5435` | Exposed PostgreSQL port |
| `DATABASE_URL` | `postgresql://oversight:oversight_dev@localhost:5435/oversight` | Prisma connection string |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6380` | Exposed Redis port |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | Ollama endpoint (host) |
| `AI_PREPROCESSOR_URL` | `http://ai-preprocessor:8000` | AI service URL (container) |
| `API_PORT` | `4000` | NestJS API port |
| `DASHBOARD_PORT` | `3100` | Next.js dashboard port |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Public API URL for frontend |
| `JWT_ACCESS_SECRET` | — | Access token signing secret (**change in prod!**) |
| `JWT_REFRESH_SECRET` | — | Refresh token signing secret (**change in prod!**) |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token lifetime |
| `HTTP_PORT` | `80` | Caddy HTTP port |
| `HTTPS_PORT` | `443` | Caddy HTTPS port |

---

## Project Structure

```
oversight-hub/
├── apps/
│   ├── api/                  # NestJS API (Fastify + Prisma)
│   │   ├── prisma/           # Database schema & migrations
│   │   └── src/
│   │       ├── modules/      # Feature modules (auth, user, notification, …)
│   │       ├── common/       # Shared DTOs, filters, guards
│   │       ├── config/       # Configuration & validation
│   │       └── audit/        # Audit middleware
│   ├── dashboard/            # Next.js 14 dashboard (shadcn/ui)
│   │   ├── components/       # UI components
│   │   └── lib/              # Utilities, auth, API client
│   └── mobile/               # Expo / React Native app
│       ├── app/              # Expo Router screens
│       ├── components/       # Mobile UI components
│       └── lib/              # Auth, API client
├── services/
│   └── ai-preprocessor/      # FastAPI + Ollama inference service
│       ├── app/
│       │   ├── routes/       # /health, /inference endpoints
│       │   └── config.py
│       └── Dockerfile
├── packages/
│   ├── ui/                   # Shared React component library
│   ├── shared/               # Shared types & constants
│   ├── eslint-config/        # ESLint configurations
│   └── typescript-config/    # Shared tsconfig presets
├── docker/
│   ├── api.Dockerfile
│   └── dashboard.Dockerfile
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## API Documentation

Once the API is running, Swagger UI is available at:

```
http://localhost:4000/api/docs
```

---

## Deployment (Coolify)

OVERSIGHT AI is designed for [Coolify](https://coolify.io/) self-hosted deployments:

1. **Connect** your Git repository in Coolify
2. **Set** the root directory to `/` (monorepo root)
3. **Configure** the Docker Compose service
4. **Add** environment variables via Coolify's env editor
5. **Ensure** Ollama is running on the host and accessible at `host.docker.internal:11434`
6. **Deploy** — Coolify will run `docker compose up -d`

For automatic deployments, use the `deploy.yml` workflow with a Coolify webhook token.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.
