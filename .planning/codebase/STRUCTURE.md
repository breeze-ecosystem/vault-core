# Codebase Structure

**Analysis Date:** 2026-07-14

## Directory Layout

```
oversight-hub/
├── apps/                          # Application packages
│   ├── api/                       # NestJS backend (Fastify adapter)
│   │   ├── prisma/                # Database schema, migrations, seed
│   │   │   ├── schema.prisma      # PostgreSQL data model
│   │   │   ├── migrations/        # Prisma migration history
│   │   │   └── seed.ts            # Admin user seeder
│   │   └── src/
│   │       ├── main.ts            # Bootstrap: NestJS + Fastify setup
│   │       ├── app.module.ts      # Root module — imports all feature modules
│   │       ├── common/            # Cross-cutting: guards, filters, pipes, decorators, DTOs
│   │       │   ├── decorators/    # @Public(), @Roles()
│   │       │   ├── dto/           # class-validator DTOs for Swagger
│   │       │   ├── filters/       # AllExceptionsFilter
│   │       │   ├── guards/        # JwtAuthGuard, RolesGuard
│   │       │   └── pipes/         # ZodValidationPipe
│   │       ├── config/            # Environment config (NestJS ConfigModule)
│   │       │   ├── configuration.ts
│   │       │   └── validation.ts
│   │       └── modules/           # Feature modules (one directory per domain)
│   │           ├── alert/         # Alert CRUD + lifecycle (acknowledge, resolve)
│   │           ├── audit/         # Audit logging (user actions)
│   │           ├── auth/          # Authentication (login, register, refresh, logout)
│   │           │   └── strategies/ # JWT + JWT Refresh passport strategies
│   │           ├── camera/        # Camera CRUD + prompts sub-resource
│   │           ├── chat/          # AI chat endpoint
│   │           ├── dashboard/     # Aggregated stats for dashboard overview
│   │           ├── health/        # Health check (NestJS Terminus)
│   │           ├── inference/     # Frame analysis queue processor
│   │           ├── ingestion/     # RTSP stream management (start/stop/snapshot)
│   │           ├── notification/  # Socket.IO gateway + notification dispatching
│   │           ├── notifications/ # Notification settings + log endpoints
│   │           ├── prisma/        # Database client (global singleton)
│   │           ├── queue/         # BullMQ setup (frame-processing, notification queues)
│   │           ├── site/          # Site CRUD
│   │           ├── supervision/   # Edge agent heartbeat + health monitoring
│   │           └── user/          # User CRUD + password change
│   ├── dashboard/                 # Next.js 14 web admin interface
│   │   ├── app/                   # App Router pages
│   │   │   ├── layout.tsx         # Root layout: HTML, dark theme, I18nProvider, PWA
│   │   │   ├── globals.css        # Tailwind + custom theme styles
│   │   │   ├── (auth)/            # Auth route group (unauthenticated)
│   │   │   │   └── login/         # Login page
│   │   │   └── (dashboard)/       # Dashboard route group (authenticated)
│   │   │       ├── layout.tsx     # AuthProvider + ProtectedLayout + DashboardLayout
│   │   │       ├── page.tsx       # Overview/Home page
│   │   │       ├── alertes/       # Alerts list page
│   │   │       ├── cameras/       # Camera list page
│   │   │       │   └── [id]/      # Camera detail pages
│   │   │       ├── chat/          # AI Chat page
│   │   │       ├── notifications/ # Notification settings page
│   │   │       ├── parametres/    # Settings page
│   │   │       ├── sites/         # Sites list page
│   │   │       │   └── [id]/      # Site detail pages
│   │   │       └── utilisateurs/  # User management page
│   │   ├── components/            # React components
│   │   │   ├── dashboard-layout.tsx  # Sidebar + content layout
│   │   │   ├── sidebar.tsx           # Navigation sidebar
│   │   │   ├── sidebar-provider.tsx  # Sidebar collapse state
│   │   │   ├── header.tsx            # Top bar with user menu
│   │   │   ├── protected-layout.tsx  # Auth gate redirect
│   │   │   ├── page-header.tsx       # Reusable page title
│   │   │   ├── stats-card.tsx        # Dashboard stat card
│   │   │   ├── recent-activity.tsx   # Recent alerts list
│   │   │   ├── language-switcher.tsx # French/English toggle
│   │   │   ├── video-player.tsx      # RTSP stream player
│   │   │   └── ui/                   # shadcn/ui primitives (15 components)
│   │   │       ├── button.tsx, card.tsx, table.tsx, dialog/...
│   │   │       ├── toast.tsx, tooltip.tsx, dropdown-menu.tsx, ...
│   │   │       └── index.ts          # Barrel export
│   │   ├── lib/                   # Client-side utilities
│   │   │   ├── api.ts             # API client — all fetch functions, types
│   │   │   ├── auth-client.ts     # Auth operations (login, logout, refresh, fetchWithAuth)
│   │   │   ├── auth-context.tsx   # React Context auth provider
│   │   │   ├── use-auth.ts        # useAuth hook re-export
│   │   │   ├── nav-config.ts      # Sidebar navigation items + role filtering
│   │   │   ├── utils.ts           # cn() utility (clsx + tailwind-merge)
│   │   │   └── i18n/              # Internationalization
│   │   │       ├── context.tsx    # I18nProvider + useI18n hook
│   │   │       └── dictionaries/  # fr.ts (primary), en.ts, index.ts
│   │   ├── types/                 # Dashboard-specific TypeScript types
│   │   │   └── chat.ts
│   │   ├── public/                # Static assets, PWA icons, sw.js
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   └── components.json        # shadcn/ui config
│   └── mobile/                    # Expo (React Native) mobile app
│       ├── app/                   # Expo Router file-based routing
│       │   ├── _layout.tsx        # Root Stack layout
│       │   ├── index.tsx          # Splash/redirect
│       │   ├── login.tsx          # Login screen
│       │   ├── register.tsx       # Registration screen
│       │   ├── (tabs)/            # Tab navigator group
│       │   │   ├── _layout.tsx    # Tab bar config
│       │   │   ├── index.tsx      # Dashboard/home tab
│       │   │   ├── cameras.tsx    # Camera list tab
│       │   │   ├── alerts.tsx     # Alerts tab
│       │   │   ├── sites.tsx      # Sites tab
│       │   │   ├── chat.tsx       # AI Chat tab
│       │   │   └── settings.tsx   # Settings tab
│       │   ├── camera/            # Camera detail modal
│       │   ├── alert/             # Alert detail modal
│       │   └── notifications.tsx  # Notification settings screen
│       ├── components/            # React Native components
│       │   ├── error-boundary.tsx
│       │   └── ...
│       ├── lib/                   # Mobile utilities
│       │   ├── api.ts             # API client
│       │   ├── auth-client.ts     # Auth operations
│       │   ├── auth-context.tsx   # Auth provider
│       │   ├── auth-storage.ts    # expo-secure-store wrapper
│       │   ├── config.ts          # Environment config validation
│       │   ├── constants.ts       # App-wide constants
│       │   └── theme.ts           # Color tokens
│       ├── assets/                # Images, fonts, icons
│       ├── app.json               # Expo config
│       ├── eas.json               # EAS Build/Submit config
│       └── metro.config.js
├── packages/                      # Shared workspace packages
│   ├── shared/                    # @repo/shared — shared kernel
│   │   └── src/
│   │       ├── index.ts           # Barrel export — all public API
│   │       ├── schemas/           # Zod validation schemas
│   │       │   ├── auth.schema.ts     # register, login, refresh
│   │       │   ├── alert.schema.ts    # create, update
│   │       │   ├── camera.schema.ts   # create, update
│   │       │   └── site.schema.ts     # create, update
│   │       ├── types/             # TypeScript type definitions
│   │       │   └── auth.types.ts      # TokenPayload, AuthResponse
│   │       └── constants/         # Shared domain constants
│   │           ├── roles.ts           # ROLES enum, ROLE_HIERARCHY, hasMinRole()
│   │           ├── alert-severity.ts  # AlertSeverity enum
│   │           ├── alert-status.ts    # AlertStatus enum
│   │           └── camera-status.ts   # CameraStatus enum
│   ├── ui/                        # @repo/ui — shared React components
│   │   └── src/
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       └── code.tsx
│   ├── eslint-config/             # @repo/eslint-config — shared ESLint
│   └── typescript-config/         # @repo/typescript-config — shared TS configs
├── services/                      # Non-TypeScript backend services
│   └── ai-preprocessor/           # Python FastAPI frame analysis service
│       ├── Dockerfile
│       ├── requirements.txt
│       └── app/
├── edge/                          # Edge deployment tooling
│   ├── agent/                     # Python edge agent (health, backups, self-update)
│   │   ├── agent.py
│   │   ├── Dockerfile
│   │   └── edge.config.example.json
│   ├── configs/                   # go2rtc stream configs
│   ├── go2rtc/                    # go2rtc binaries/config
│   └── scripts/                   # Edge deployment scripts
├── docker/                        # Dockerfiles for app services
│   ├── api.Dockerfile             # Multi-stage build: deps → build → prod
│   └── dashboard.Dockerfile       # Multi-stage build with standalone output
├── docker-compose.yml             # Production Docker Compose (API + Dashboard + AI)
├── docker-compose.prod.yml        # Extended production compose
├── Caddyfile                      # Reverse proxy routing rules
├── turbo.json                     # Turborepo pipeline config
├── pnpm-workspace.yaml            # pnpm workspace definition
├── package.json                   # Root package.json (scripts, devDeps, overrides)
├── pnpm-lock.yaml                 # Lockfile
├── .env.example                   # Environment variable reference
├── backup.sh                      # Database backup script
├── install.sh                     # Installation/bootstrap script
├── update.sh                      # Update/deployment script
├── .github/                       # GitHub Actions CI/CD
├── docs/                          # Project documentation (PRD)
└── .planning/                     # GSD planning artifacts
```

## Directory Purposes

**`apps/api/`:**
- Purpose: NestJS backend — REST API, WebSocket gateway, authentication, business logic
- Contains: Feature modules (15+), Prisma schema, configuration, common cross-cutting code
- Key files: `src/main.ts` (bootstrap), `src/app.module.ts` (root module), `prisma/schema.prisma` (data model)

**`apps/dashboard/`:**
- Purpose: Next.js 14 web admin dashboard — PWA-capable, dark-themed
- Contains: App Router pages with route groups, shadcn/ui components, i18n dictionaries, client-side API layer
- Key files: `app/layout.tsx` (root), `app/(dashboard)/layout.tsx` (auth gating), `lib/api.ts` (API client), `lib/auth-client.ts` (auth logic)

**`apps/mobile/`:**
- Purpose: React Native mobile app via Expo — cross-platform camera monitoring
- Contains: Expo Router screens, tab navigation, auth with SecureStore
- Key files: `app/_layout.tsx` (root navigator), `app/(tabs)/_layout.tsx` (tab config), `lib/auth-storage.ts` (secure token storage)

**`packages/shared/`:**
- Purpose: Shared kernel — Zod schemas, TypeScript types, domain constants consumed by all TypeScript apps
- Contains: Validation schemas, role hierarchy logic, enum constants
- Key files: `src/index.ts` (public API barrel), `src/constants/roles.ts` (RBAC hierarchy)

**`packages/ui/`:**
- Purpose: Shared React UI components (minimal — button, card, code)
- Contains: Reusable TSX components
- Key files: `src/button.tsx`

**`services/ai-preprocessor/`:**
- Purpose: Python FastAPI microservice for AI-powered frame analysis
- Contains: Python app, Dockerfile, dependencies
- Key files: `app/` (FastAPI routes + ML logic)

**`edge/agent/`:**
- Purpose: Python edge agent deployed on remote camera servers — health monitoring, backups, Docker self-update
- Contains: Agent script, Dockerfile, example config
- Key files: `agent.py` (main agent loop)

**`docker/`:**
- Purpose: Multi-stage Dockerfiles for API and Dashboard builds
- Contains: `api.Dockerfile`, `dashboard.Dockerfile`
- Key files: Both use a 3-stage build pattern (deps → build → production runner)

**`docker-compose.yml`:**
- Purpose: Production orchestration — API, Dashboard, AI Preprocessor services
- Contains: Service definitions, health checks, environment variables, network configuration

**`Caddyfile`:**
- Purpose: Reverse proxy configuration — routes requests to API (REST + WebSocket) and Dashboard

## Key File Locations

**Entry Points:**
- `apps/api/src/main.ts`: NestJS API bootstrap — Fastify, Helmet, CORS, rate limiting, Swagger
- `apps/dashboard/app/layout.tsx`: Next.js root layout — HTML shell, theme, i18n, PWA registration
- `apps/mobile/app/_layout.tsx`: Expo Router root layout — Stack navigator, auth provider

**Configuration:**
- `turbo.json`: Turborepo build pipeline — build, lint, check-types, dev, prisma tasks
- `pnpm-workspace.yaml`: Workspace packages — `apps/*`, `packages/*`, `services/*`
- `package.json` (root): `oversight-ai` monorepo — scripts, overrides, package manager pin
- `apps/api/src/config/configuration.ts`: NestJS config — all environment variable mappings
- `Caddyfile`: Reverse proxy routing

**Core Logic:**
- `apps/api/src/app.module.ts`: Root NestJS module — imports all feature modules, registers global guards/filters
- `apps/api/src/common/guards/jwt-auth.guard.ts`: JWT authentication — allows public routes via `@Public()` decorator
- `apps/api/src/common/guards/roles.guard.ts`: RBAC — compares user role against required roles using `ROLE_HIERARCHY`
- `apps/dashboard/lib/api.ts`: Central API client — all dashboard data-fetching functions (468 lines)
- `apps/dashboard/lib/auth-client.ts`: Auth client — login, logout, token refresh, `fetchWithAuth` auto-retry
- `packages/shared/src/constants/roles.ts`: Role hierarchy definition — `SUPER_ADMIN > ADMIN > SUPERVISOR > OPERATOR > VIEWER`

**Testing:**
- `apps/api/jest.config.js`: Jest configuration
- `apps/api/src/modules/auth/auth.service.spec.ts`: Auth service unit test
- `apps/api/src/modules/alert/alert.service.spec.ts`: Alert service unit test

## Naming Conventions

**Files:**
- NestJS modules: `kebab-case` — `auth.controller.ts`, `alert.service.ts`, `jwt-auth.guard.ts`, `zod-validation.pipe.ts`
- Next.js routes: `page.tsx`, `layout.tsx` (Next.js convention); route group directories in `(parentheses)` — `(auth)/`, `(dashboard)/`
- Expo routes: `_layout.tsx` (layout), `index.tsx` (default page), `(tabs)/` (tab group)
- Shared package: `kebab-case` — `auth.schema.ts`, `camera-status.ts`
- Dockerfiles: `PascalCase` with dot notation — `api.Dockerfile`, `dashboard.Dockerfile`

**Directories:**
- NestJS modules: `lowercase` single-word — `auth/`, `alert/`, `camera/`, `ingestion/`
- Next.js routes: `lowercase` — `alertes/`, `cameras/`, `utilisateurs/`, `parametres/` (French)
- Dynamic routes: `[id]/` (bracket notation)
- Route groups: `(groupName)/` (parenthesis notation)
- Shared package sections: `lowercase` — `schemas/`, `types/`, `constants/`

**Functions:**
- camelCase throughout: `fetchDashboardStats`, `createSite`, `getAccessToken`, `handleRequest`
- NestJS lifecycle: `onModuleInit`
- React hooks: `useAuth`, `useI18n`
- Decorators: `@Public()`, `@Roles(...)`

**Types/Interfaces:**
- PascalCase: `DashboardStats`, `PaginatedResponse<T>`, `AuthResponse`, `TokenPayload`
- DTOs: PascalCase with `Dto` suffix — `LoginDto`, `CreateCameraDto`, `UpdateUserDto`

## Where to Add New Code

**New API Feature:**
- Primary code: `apps/api/src/modules/{feature-name}/` — create `{feature}.module.ts`, `{feature}.controller.ts`, `{feature}.service.ts`
- Register module: Import in `apps/api/src/app.module.ts`
- Database changes: Update `apps/api/prisma/schema.prisma`, run `pnpm prisma:migrate`
- Validation schemas: `packages/shared/src/schemas/{feature}.schema.ts` (if shared validation needed)
- Tests: `apps/api/src/modules/{feature}/{feature}.service.spec.ts`
- Export from shared: Add to `packages/shared/src/index.ts`

**New Dashboard Page:**
- Primary code: `apps/dashboard/app/(dashboard)/{page-name}/page.tsx`
- API client: Add functions to `apps/dashboard/lib/api.ts`
- Navigation: Add item to `apps/dashboard/lib/nav-config.ts` (array of `NavItem`)
- i18n keys: Add to `apps/dashboard/lib/i18n/dictionaries/fr.ts` and `en.ts`

**New Mobile Screen:**
- Primary code: `apps/mobile/app/{screen-name}.tsx` or `apps/mobile/app/(tabs)/{screen-name}.tsx`
- API client: Add functions to `apps/mobile/lib/api.ts`
- Auth state: Use existing `apps/mobile/lib/auth-context.tsx` and `apps/mobile/lib/auth-storage.ts`

**New Shared Type/Schema:**
- Zod schema: `packages/shared/src/schemas/{name}.schema.ts`
- TypeScript type: `packages/shared/src/types/{name}.types.ts`
- Constants: `packages/shared/src/constants/{name}.ts`
- Export: Add to `packages/shared/src/index.ts` (barrel file)
- Rebuild: `pnpm --filter @repo/shared build` before consuming apps can see changes

**New UI Component:**
- Dashboard-specific: `apps/dashboard/components/{component-name}.tsx`
- shadcn/ui: Use `npx shadcn-ui add` — writes to `apps/dashboard/components/ui/`
- Shared component: `packages/ui/src/{component-name}.tsx`

**New Infrastructure Service:**
- Python service: `services/{service-name}/` with `Dockerfile`, `requirements.txt`, `app/`
- Docker Compose: Add service definition to `docker-compose.yml`
- Caddy routing: Add route rule to `Caddyfile` if HTTP-accessible

## Special Directories

**`.planning/`:**
- Purpose: GSD workflow artifacts — plans, specs, codebase maps
- Generated: Yes (by GSD commands)
- Committed: Yes

**`.claude/` and `.agents/`:**
- Purpose: AI agent skills and configurations
- Generated: Partially (project-specific skills)
- Committed: Yes

**`apps/api/prisma/migrations/`:**
- Purpose: Prisma database migration history — auto-generated SQL
- Generated: Yes (by `prisma migrate dev`)
- Committed: Yes

**`apps/dashboard/.next/`:**
- Purpose: Next.js build output — server, static files, cache
- Generated: Yes (by `next build`)
- Committed: No (in `.gitignore`)

**`apps/dashboard/public/`:**
- Purpose: Static assets served by Next.js — PWA icons, manifest, service worker
- Generated: Manual
- Committed: Yes

**`node_modules/`:**
- Purpose: Package dependencies
- Generated: Yes (by `pnpm install`)
- Committed: No

---

*Structure analysis: 2026-07-14*
