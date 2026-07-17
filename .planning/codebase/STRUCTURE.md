# Directory Structure

> Generated: 2026-07-17

## Top-Level Layout

```
oversight-hub/
├── .agents/                  # Agent skill configurations
│   └── skills/               # Installed agent skills
├── .claude/                  # Claude configuration
│   └── skills/               # Claude skills
├── .github/
│   └── workflows/            # CI/CD GitHub Actions
├── .planning/                # GSD planning artifacts
│   ├── codebase/             # Codebase map documents
│   ├── phases/               # Phase plans
│   └── research/             # Research docs
├── apps/                     # Application packages (pnpm workspace)
│   ├── api/                  # NestJS backend (REST API + WebSocket)
│   ├── dashboard/            # Next.js web dashboard
│   ├── marketing/            # Next.js marketing site
│   └── mobile/               # Expo React Native mobile app
├── docker/                   # Dockerfiles for each app
│   ├── api.Dockerfile
│   ├── dashboard.Dockerfile
│   └── website.Dockerfile
├── edge/                     # Edge computing components
│   ├── agent/                # Python edge health agent
│   ├── configs/              # Edge device configurations
│   ├── go2rtc/               # go2rtc streaming configs
│   └── scripts/              # Edge deployment scripts
├── packages/                 # Shared packages (pnpm workspace)
│   ├── design/               # Design tokens (colors, typography, spacing)
│   ├── eslint-config/        # Shared ESLint flat config (v9)
│   ├── shared/               # Shared dtos, schemas, types, constants
│   ├── typescript-config/    # Shared tsconfig variants (base, nextjs, react)
│   └── ui/                   # Reusable React components
├── services/                 # Independent microservices
│   └── ai-preprocessor/      # Python FastAPI AI analysis service
├── Caddyfile                 # Reverse proxy configuration
├── docker-compose.yml        # Development/coolify Docker Compose
├── docker-compose.prod.yml   # Self-contained production Docker Compose
├── pnpm-workspace.yaml       # Monorepo workspace definition
├── package.json              # Root package.json (scripts, devDeps)
├── turbo.json                # Turborepo task pipeline configuration
├── eas.json                  # Expo Application Services config
├── .env.example              # Environment variable template
├── app.json                  # Expo app config
├── tsconfig.json             # Root TypeScript config
├── backup.sh                 # Database backup script
├── install.sh                # Installation script
└── update.sh                 # Update script
```

## Key Locations

| Path | Purpose | Key Files |
|------|---------|-----------|
| `apps/api/src/` | NestJS API application root | `main.ts`, `app.module.ts` |
| `apps/api/src/modules/` | Feature modules (38 modules) | `auth/`, `camera/`, `alert/`, `dashboard/`, `ingestion/`, etc. |
| `apps/api/src/common/` | Cross-cutting concerns | `decorators/`, `guards/`, `filters/`, `pipes/`, `middleware/`, `adapters/` |
| `apps/api/src/config/` | Configuration | `configuration.ts`, `validation.ts` |
| `apps/api/src/mqtt/` | MQTT client module | `mqtt.service.ts`, `mqtt.module.ts` |
| `apps/api/prisma/` | Database schema and migrations | `schema.prisma`, `seed.ts`, `migrations/` |
| `apps/api/migrations/` | Standalone DB migration scripts | (custom migration files) |
| `apps/dashboard/app/` | Next.js App Router pages | `layout.tsx`, `(auth)/`, `(dashboard)/` |
| `apps/dashboard/app/(dashboard)/` | Dashboard route group (26 sections) | `page.tsx` (overview), `cameras/`, `alertes/`, `incidents/`, etc. |
| `apps/dashboard/components/` | Dashboard React components | `ui/` (shadcn), `camera-card-premium.tsx`, `alert-feed.tsx`, `sidebar.tsx`, etc. |
| `apps/dashboard/lib/` | Dashboard utilities | `api.ts`, `auth-client.ts`, `auth-context.tsx`, `utils.ts`, `i18n/` |
| `apps/dashboard/types/` | Additional TypeScript types | (custom type definitions) |
| `apps/mobile/app/` | Expo Router screens | `_layout.tsx`, `(tabs)/`, `login.tsx`, `camera/[id].tsx`, `alert/[id].tsx` |
| `apps/mobile/components/` | Mobile React Native components | (custom + UI components) |
| `apps/mobile/lib/` | Mobile utilities | `api.ts`, `auth-client.ts`, `auth-context.tsx`, `auth-storage.ts`, `theme.ts` |
| `apps/marketing/app/` | Marketing site Next.js pages | (public website pages) |
| `apps/marketing/src/` | Marketing site source | `lib/`, `i18n/` |
| `packages/shared/src/` | Shared kernel source | `schemas/`, `types/`, `constants/`, `index.ts` |
| `packages/shared/src/constants/` | Shared constants | `roles.ts`, `alert-severity.ts`, `camera-status.ts`, `incident-status.ts`, `door-states.ts`, etc. |
| `packages/shared/src/schemas/` | Zod validation schemas (27 files) | `auth.schema.ts`, `camera.schema.ts`, `alert.schema.ts`, `incident.schema.ts`, etc. |
| `packages/shared/src/types/` | Shared TypeScript interfaces (17 files) | `auth.types.ts`, `access.types.ts`, `ai.types.ts`, `incident.types.ts`, etc. |
| `packages/design/src/` | Design tokens | `colors.ts`, `typography.ts`, `spacing.ts`, `shadows.ts`, `marketing.ts` |
| `packages/ui/src/` | Reusable UI components | `button.tsx`, `card.tsx`, `code.tsx` |
| `packages/eslint-config/` | Shared ESLint configuration | `base.js`, `next.js`, `react-internal.js` |
| `packages/typescript-config/` | Shared TypeScript config | `base.json`, `nextjs.json`, `react-library.json` |
| `services/ai-preprocessor/app/` | FastAPI app | `main.py`, `config.py`, `models/`, `routes/` |
| `edge/agent/` | Edge health monitoring agent | `agent.py`, `Dockerfile`, `requirements.txt` |
| `docker/` | Dockerfiles for each service | `api.Dockerfile`, `dashboard.Dockerfile`, `website.Dockerfile` |

## Naming Conventions

| Category | Convention | Examples |
|----------|------------|----------|
| **API files** | `*.service.ts`, `*.controller.ts`, `*.module.ts`, `*.spec.ts`, `*.gateway.ts`, `*.processor.ts`, `*.guard.ts`, `*.decorator.ts`, `*.pipe.ts`, `*.filter.ts`, `*.adapter.ts` | `auth.service.ts`, `health.controller.ts`, `roles.guard.ts` |
| **Dashboard files** | `*.tsx` for components, `page.tsx` for routes, `layout.tsx` for layouts, kebab-case otherwise | `stats-card.tsx`, `alert-feed.tsx`, `page.tsx` |
| **Mobile files** | `*.tsx` for screens, `[id].tsx` for dynamic routes, `_layout.tsx` for layout | `_layout.tsx`, `[id].tsx`, `index.tsx` |
| **API routes** | Plural controllers (`auth`, `cameras`, `alerts`, `users`, `incidents`) | `@Controller('auth')`, `@Controller('cameras')` |
| **Dashboard routes** | French names (French-first locale) | `/alertes`, `/cameras`, `/incidents`, `/portes`, `/parametres` |
| **Shared schemas** | PascalCase + `Schema` suffix for schemas, `Input` suffix for types | `createCameraSchema`, `CreateCameraInput` |
| **Shared constants** | `UPPER_SNAKE_CASE` | `ROLES`, `ROLE_HIERARCHY`, `ALERT_SEVERITY`, `CAMERA_STATUS` |
| **Env variables** | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `OLLAMA_BASE_URL` |

## Module Organization

### API Feature Modules (38 modules in `apps/api/src/modules/`)

Each feature module follows this structure:
```
module-name/
├── module-name.controller.ts   # Route definitions (@Controller, Swagger decorators)
├── module-name.module.ts       # NestJS module configuration
├── module-name.service.ts      # Business logic, Prisma queries
└── module-name.spec.ts         # Unit tests (some modules)
```

Some modules include additional files:
- `strategies/` — Passport strategies (e.g., `auth/strategies/`, `sso/`)
- `*.processor.ts` — BullMQ queue processors (e.g., `ai.processor.ts`, `correlation.processor.ts`)
- `*.gateway.ts` — Socket.IO WebSocket gateways (e.g., `notification.gateway.ts`)
- `*.dto.ts` — Module-specific DTOs (e.g., `chat.dto.ts`)
- `tenant-extension.ts` — Prisma tenant isolation extension

**Module inventory:**

| Module | Purpose | Controller Routes |
|--------|---------|-------------------|
| `access/` | Access control (credentials, zones, schedules, access levels) | `/api/access/*` |
| `ai-agent/` | AI agent chat (SSE streaming) | `/api/ai-agent/*` |
| `ai/` | AI query/summarize/assistant | `/api/ai/*` |
| `alert/` | Alert management (CRUD, acknowledge, resolve) | `/api/alerts/*` |
| `analytics/` | Zone/site analytics queries | `/api/analytics/*` |
| `anpr/` | ANPR/vehicle plate recognition | `/api/anpr/*` |
| `api-key/` | Tenant API key management (Enterprise) | `/api/api-keys/*` |
| `audit/` | Immutable audit log (hash chain) | `/api/audit/*` |
| `auth/` | Auth (register, login, refresh, logout, switch-org) | `/api/auth/*` |
| `camera/` | Camera CRUD | `/api/cameras/*` |
| `chat/` | AI camera chat (query video via LLM) | `/api/chat/*` |
| `compliance/` | Compliance report generation | `/api/compliance/*` |
| `contact/` | Public contact form submissions | `/api/contact/*` |
| `correlation/` | Event correlation (timeline, tailgating) | `/api/correlation/*` |
| `dashboard/` | Dashboard stats aggregation | `/api/dashboard/*` |
| `door/` | Door state monitoring and control | `/api/doors/*` |
| `equipment/` | Equipment health monitoring | `/api/equipment/*` |
| `feature-gate/` | Feature flag evaluation | (internal guard) |
| `governance/` | Data retention policies | `/api/governance/*` |
| `health/` | System health checks | `/api/health/*` |
| `incident/` | Incident management (CRUD, assign, resolve) | `/api/incidents/*` |
| `inference/` | AI inference pipeline | `/api/inference/*` |
| `ingestion/` | Video stream ingestion (RTSP → ffmpeg → AI) | `/api/ingestion/*` |
| `license/` | License management (JWT-based) | `/api/licenses/*` |
| `maintenance/` | Maintenance tickets (unified with incidents) | `/api/maintenance/*` |
| `notification/` | Real-time WebSocket notification gateway | WebSocket events |
| `notifications/` | Notification settings + logs + send | `/api/notifications/*` |
| `organization/` | Organization CRUD + invites | `/api/organizations/*` |
| `patterns/` | Security pattern detection | `/api/patterns/*` |
| `prisma/` | Global Prisma client singleton | (no routes) |
| `queue/` | BullMQ queue management | `/api/queue/*` |
| `risk/` | Risk scoring and analytics | `/api/risk/*` |
| `site/` | Site (organization) management | `/api/sites/*` |
| `sso/` | SAML/OIDC SSO integration | `/api/auth/sso/*` |
| `supervision/` | Edge agent health reports | `/api/supervision/*` |
| `user/` | User CRUD + password management | `/api/users/*` |
| `visitor/` | Visitor management (pre-register, check-in/out) | `/api/visitors/*` |
| `webhook/` | Webhook subscriptions + deliveries | `/api/webhooks/*` |

### Common Infrastructure (`apps/api/src/common/`)

| Directory | Purpose | Files |
|-----------|---------|-------|
| `adapters/` | Custom NestJS adapters | `socket-io.adapter.ts` |
| `decorators/` | Custom decorators | `public.decorator.ts`, `roles.decorator.ts`, `current-org.decorator.ts`, `feature-gate.decorator.ts`, `audited.decorator.ts` |
| `dto/` | Shared class-validator DTOs for Swagger | `index.ts` |
| `filters/` | Exception filters | `all-exceptions.filter.ts` |
| `guards/` | Auth/authz guards | `jwt-auth.guard.ts`, `roles.guard.ts`, `tenant-isolation.guard.ts`, `feature-gate.guard.ts` |
| `helpers/` | Helper utilities | `tenant-worker.ts` |
| `middleware/` | Middleware | `tenant-context.middleware.ts`, `site-context.middleware.ts` |
| `pipes/` | Validation pipes | `zod-validation.pipe.ts` |

### Dashboard Route Groups (`apps/dashboard/app/`)

```
app/
├── (auth)/                     # Unauthenticated routes
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/                # Authenticated routes (26 sections)
│   ├── acces/                  # Access control
│   ├── alertes/                # Alerts
│   ├── analytique/             # Analytics
│   ├── api-keys/               # API keys
│   ├── audit/                  # Audit logs
│   ├── cameras/                # Cameras
│   ├── chat/                   # AI chat
│   ├── chronologie/            # Timeline
│   ├── command-center/         # Command center
│   ├── conformite/             # Compliance
│   ├── equipement/             # Equipment
│   ├── gouvernance/            # Data governance
│   ├── ia/                     # AI settings
│   ├── incidents/              # Incidents
│   ├── licences/               # License management
│   ├── maintenance/            # Maintenance
│   ├── notifications/          # Notifications
│   ├── parametres/             # Settings
│   ├── patterns/               # Security patterns
│   ├── portes/                 # Doors
│   ├── risque/                 # Risk scoring
│   ├── schemas/                # (content/schemas)
│   ├── sites/                  # Sites
│   ├── utilisateurs/           # Users
│   ├── vehicules/              # Vehicles/ANPR
│   ├── visiteurs/              # Visitors
│   ├── webhooks/               # Webhooks
│   ├── layout.tsx              # Dashboard group layout (AuthProvider + ProtectedLayout + DashboardLayout)
│   └── page.tsx                # Overview page (default dashboard)
├── invite/                     # Invite acceptance pages
├── parametres/                 # Global settings
├── globals.css                 # Global styles + Tailwind
├── layout.tsx                  # Root layout (ThemeProvider + I18nProvider)
└── not-found.tsx               # 404 page
```

### Mobile Screen Structure (`apps/mobile/app/`)

```
app/
├── _layout.tsx              # Root layout (Stack navigator, AuthProvider, ErrorBoundary)
├── index.tsx                 # Default redirect
├── login.tsx                 # Login screen
├── register.tsx              # Registration screen
├── notifications.tsx         # Notification center
├── (tabs)/
│   ├── _layout.tsx           # Tab navigator layout
│   ├── index.tsx             # Home/dashboard tab
│   ├── alerts.tsx            # Alerts tab
│   ├── cameras.tsx           # Cameras tab
│   ├── incidents.tsx         # Incidents tab
│   ├── chat.tsx              # AI chat tab
│   ├── sites.tsx             # Sites tab
│   ├── settings.tsx          # Settings tab
│   ├── more.tsx              # More tab
│   └── more/                 # Additional settings screens
├── camera/[id].tsx           # Camera detail screen
├── alert/[id].tsx            # Alert detail screen
└── incident/                 # Incident detail screens
```

## Where to Add New Code

### New API Feature Module
1. Create directory: `apps/api/src/modules/<module-name>/`
2. Create files following the pattern: `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`
3. Import and register module in `apps/api/src/app.module.ts`
4. Add shared schemas in `packages/shared/src/schemas/<name>.schema.ts`
5. Add shared types in `packages/shared/src/types/<name>.types.ts`
6. Add shared constants in `packages/shared/src/constants/<name>.ts`
7. Export all new symbols in `packages/shared/src/index.ts`

### New Dashboard Page
1. Create route directory: `apps/dashboard/app/(dashboard)/<page-name>/`
2. Create `page.tsx` with default export function component
3. Add API function(s) in `apps/dashboard/lib/api.ts`
4. Add components in `apps/dashboard/components/` (reusable) or locally in the page directory
5. Add route entry in sidebar: update `apps/dashboard/lib/nav-config.ts`

### New Mobile Screen
1. Create route directory: `apps/mobile/app/<screen-name>/` (or `(tabs)/<screen-name>/`)
2. Create `page.tsx` (Expo Router file-based)
3. Register in tab navigator: update `apps/mobile/app/(tabs)/_layout.tsx`
4. Add API function in `apps/mobile/lib/api.ts`

### New Shared Schema/Type
1. Add Zod schema to `packages/shared/src/schemas/<domain>.schema.ts`
2. Add TypeScript type to `packages/shared/src/types/<domain>.types.ts`
3. Export from `packages/shared/src/index.ts`
4. Rebuild shared package: `pnpm --filter @repo/shared build`

---

*Structure analysis: 2026-07-17*
