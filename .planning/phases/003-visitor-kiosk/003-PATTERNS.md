# Phase 3: Visitor Kiosk — Pattern Map

**Mapped:** 2026-07-17
**Files analyzed:** 49 (25 new + 24 modified/existing examined)
**Analogs found:** 21 / 25

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/kiosk/next.config.js` | config | static-export | `apps/dashboard/next.config.js` | role-match |
| `apps/kiosk/tailwind.config.ts` | config | styling | `apps/dashboard/tailwind.config.ts` | role-match |
| `apps/kiosk/postcss.config.js` | config | build | `apps/dashboard/postcss.config.js` | exact |
| `apps/kiosk/tsconfig.json` | config | typescript | `apps/dashboard/tsconfig.json` | role-match |
| `apps/kiosk/package.json` | config | dependencies | `apps/dashboard/package.json` | role-match |
| `apps/kiosk/app/layout.tsx` | component | layout | `apps/dashboard/app/layout.tsx` | role-match |
| `apps/kiosk/app/globals.css` | config | styling | `apps/dashboard/app/globals.css` | role-match |
| `apps/kiosk/app/page.tsx` | component | request-response | No direct analog (state machine root) | partial |
| `apps/kiosk/components/welcome-screen.tsx` | component | UI | `apps/dashboard/components/ui/button.tsx` | partial |
| `apps/kiosk/components/qr-scanner.tsx` | component | UI (camera) | No analog (new WebRTC + instascan pattern) | none |
| `apps/kiosk/components/search-screen.tsx` | component | request-response | Dashboard search pattern | partial |
| `apps/kiosk/components/confirm-checkin.tsx` | component | request-response | `apps/dashboard/app/(dashboard)/visiteurs/preinscription/page.tsx` | role-match |
| `apps/kiosk/components/printing-screen.tsx` | component | UI | No analog (CUPS print status) | none |
| `apps/kiosk/components/success-screen.tsx` | component | UI | No analog | none |
| `apps/kiosk/components/checkout-screen.tsx` | component | UI | No analog | none |
| `apps/kiosk/components/error-screen.tsx` | component | UI | No analog | none |
| `apps/kiosk/lib/kiosk-api.ts` | utility | CRUD + request-response | `apps/dashboard/lib/api.ts` | exact |
| `apps/kiosk/lib/i18n.ts` | utility | i18n | `apps/dashboard/lib/i18n/context.tsx` | role-match |
| `docker/kiosk.Dockerfile` | config | Docker (multi-stage) | `docker/dashboard.Dockerfile` | exact |
| `docker/kiosk.nginx.conf` | config | nginx | No existing nginx config in repo | none |
| `docker/kiosk-entrypoint.sh` | utility | startup script | No existing entrypoint | none |
| `apps/api/src/modules/kiosk/kiosk.module.ts` | module | NestJS | `apps/api/src/modules/visitor/visitor.module.ts` | exact |
| `apps/api/src/modules/kiosk/kiosk.controller.ts` | controller | request-response | `apps/api/src/modules/visitor/visitor.controller.ts` | exact |
| `apps/api/src/modules/kiosk/kiosk.service.ts` | service | CRUD | `apps/api/src/modules/visitor/visitor.service.ts` | exact |
| `apps/api/src/modules/kiosk/zpl-badge.ts` | utility | file-I/O (print) | No analog (ZPL generation) | none |
| `apps/api/src/common/guards/kiosk-auth.guard.ts` | middleware | auth (API key + JWT) | `apps/api/src/modules/api-key/guards/tenant-api-key.guard.ts` | role-match |
| `apps/api/src/modules/visitor/visitor.controller.ts` | controller | CRUD | (file to modify — add `@Public()` endpoints) | exact |
| `apps/api/src/modules/visitor/visitor.module.ts` | module | NestJS | (file to modify — add kiosk search endpoint) | exact |
| `docker-compose.yml` | config | Docker Compose | Existing services (api, dashboard) | exact |
| `.env.example` | config | env vars | Existing `.env.example` sections | exact |

## Pattern Assignments

### `apps/kiosk/next.config.js` (config, static-export)

**Analog:** `apps/dashboard/next.config.js` (lines 1-6)

**Imports / Core pattern** (lines 1-6):
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};

module.exports = nextConfig;
```

**Kiosk adaptation — change `output` to `"export"`** (from RESEARCH.md):
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "",
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
```

---

### `apps/kiosk/tailwind.config.ts` (config, styling)

**Analog:** `apps/dashboard/tailwind.config.ts` (lines 1-89)

**Imports pattern** (lines 1-5):
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
```

**Kiosk adaptation — light theme + custom animations** (from UI-SPEC.md):
```typescript
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      spacing: {
        'touch': '3rem',
        'touch-lg': '3.5rem',
      },
      borderRadius: {
        'kiosk': '1rem',
        'kiosk-sm': '0.75rem',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

### `apps/kiosk/postcss.config.js` (config, build)

**Analog:** `apps/dashboard/postcss.config.js` (lines 1-6)

**Core pattern** (identical):
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

### `apps/kiosk/app/layout.tsx` (component, layout)

**Analog:** `apps/dashboard/app/layout.tsx` (lines 1-62)

**Imports pattern** (lines 1-3):
```typescript
import type { Metadata, Viewport } from "next";
import "./globals.css";
```

**Root layout pattern** (lines 33-61):
```typescript
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}
```

**Kiosk adaptation**: Simpler layout — no ThemeProvider, no I18nProvider, no service worker. The kiosk passes locale as prop, not via React Context.

---

### `apps/kiosk/app/globals.css` (config, styling)

**Analog:** `apps/dashboard/app/globals.css` (lines 1-185)

**Core Tailwind pattern** (lines 3-5):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Kiosk adaptation — light theme only, no Radix UI, no shadcn CSS variables**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Custom kiosk utilities */
.status-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

---

### `apps/kiosk/lib/kiosk-api.ts` (utility, CRUD + request-response)

**Analog:** `apps/dashboard/lib/api.ts` (lines 1-167 for auth pattern; lines 1198-1328 for visitor functions)

**API client pattern** (from dashboard `api.ts` lines 1-6, 137-167):
```typescript
import { fetchWithAuth } from "@/lib/auth-client";

if (!process.env.NEXT_PUBLIC_API_URL) {
  console.error("NEXT_PUBLIC_API_URL is not defined...");
}
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
```

**Kiosk adaptation — API key auth instead of JWT** (from RESEARCH.md):
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

class KioskApiError extends Error {
  constructor(
    message: string,
    public code: "NETWORK" | "NOT_FOUND" | "PRINTER_ERROR" | "ALREADY_CHECKED_IN" | "ALREADY_CHECKED_OUT" | "VISIT_EXPIRED" | "UNAUTHORIZED" | "UNKNOWN",
  ) { super(message); }
}

async function kioskFetch(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new KioskApiError("Unauthorized", "UNAUTHORIZED");
    if (res.status === 404) throw new KioskApiError("Not found", "NOT_FOUND");
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      const msg = body.message || "";
      if (msg.includes("already checked in")) throw new KioskApiError("Already checked in", "ALREADY_CHECKED_IN");
      if (msg.includes("expired")) throw new KioskApiError("Visit expired", "VISIT_EXPIRED");
    }
    throw new KioskApiError(`HTTP ${res.status}`, "UNKNOWN");
  }

  return res.json();
}
```

**Visitor API functions** (from dashboard `api.ts` lines 1255-1288):
```typescript
export async function checkInVisit(visitId: string): Promise<VisitDto> {
  const res = await fetchWithAuth(`${API_URL}/api/visitors/visits/${visitId}/check-in`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'enregistrement d'arrivée");
  }
  return res.json();
}
```

---

### `apps/kiosk/lib/i18n.ts` (utility, i18n)

**Analog:** `apps/dashboard/lib/i18n/context.tsx` (lines 1-86) + `fr.ts` (lines 1-50)

**Dashboard i18n pattern** (lines 19, 35-66) — uses React Context with nested dictionary:
```typescript
const dictionaries: Record<Locale, Dictionary> = { fr, en };

function detectLocale(): Locale {
  return "fr";
}

// Provider wraps children, useTranslation() hook provides t()
const t = useCallback((key: string): string => {
  const keys = key.split(".");
  let result: any = dictionary;
  for (const k of keys) {
    if (result && typeof result === "object" && k in result) {
      result = result[k];
    } else {
      return key;
    }
  }
  return typeof result === "string" ? result : key;
}, [dictionary]);
```

**Kiosk adaptation — flat dictionary, no Context, no hook** (from RESEARCH.md):
```typescript
export type Locale = "fr" | "en";

const dict: Record<string, Record<Locale, string>> = {
  "welcome.heading": { fr: "Bienvenue", en: "Welcome" },
  "welcome.scan": { fr: "Scanner mon QR", en: "Scan my QR" },
  "welcome.search": { fr: "Rechercher", en: "Search" },
  "confirm.title": { fr: "Confirmez votre arrivée", en: "Confirm your arrival" },
  "confirm.button": { fr: "Confirmer", en: "Confirm" },
  "printing.status": { fr: "Impression du badge en cours...", en: "Printing badge..." },
  "printing.error": { fr: "Erreur d'impression", en: "Printing error" },
  "printing.retry": { fr: "Réessayer", en: "Retry" },
  "success.heading": { fr: "Bienvenue {name} !", en: "Welcome {name}!" },
  "success.subtitle": { fr: "Votre badge est prêt", en: "Your badge is ready" },
  "checkout.success": { fr: "Au revoir {name} !", en: "Goodbye {name}!" },
  "error.heading": { fr: "Une erreur est survenue", en: "An error occurred" },
  "error.home": { fr: "Retour à l'accueil", en: "Back to home" },
  // ... 50+ keys total
};

export function t(key: string, locale: Locale, vars?: Record<string, string>): string {
  const entry = dict[key]?.[locale];
  if (!entry) return key;
  if (!vars) return entry;
  return Object.entries(vars).reduce((str, [k, v]) => str.replace(`{${k}}`, v), entry);
}
```

---

### `docker/kiosk.Dockerfile` (config, Docker multi-stage)

**Analog:** `docker/dashboard.Dockerfile` (lines 1-64)

**Multi-stage build pattern** (dashboard.Dockerfile lines 1-40):
```dockerfile
# ── Stage 1: Dependencies ──
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
ENV NODE_ENV=development

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/typescript-config/ packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY apps/dashboard/package.json apps/dashboard/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
ENV NODE_ENV=production

COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules

RUN npx tsc -p packages/shared/tsconfig.json
RUN pnpm --filter @repo/dashboard build

# ── Stage 3: Production ──
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# ... copy build output, set CMD
```

**Kiosk adaptation — Stage 3 is nginx + CUPS (Alpine, not Node)** (from RESEARCH.md):
```dockerfile
# ── Stage 1: Build Next.js SPA ──
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
ENV NODE_ENV=development

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/typescript-config/ packages/typescript-config/
COPY apps/kiosk/package.json apps/kiosk/

RUN pnpm install --frozen-lockfile

COPY . .

# Build shared package
RUN npx tsc -p packages/shared/tsconfig.json

# Build kiosk SPA
RUN pnpm --filter @repo/kiosk build

# ── Stage 2: nginx + CUPS ──
FROM alpine:3.19 AS runner
RUN apk add --no-cache nginx cups cups-libs cups-filters curl

# Copy static export
COPY --from=builder /app/apps/kiosk/out/ /usr/share/nginx/html/
COPY docker/kiosk.nginx.conf /etc/nginx/http.d/default.conf
COPY docker/kiosk-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
CMD ["/entrypoint.sh"]
```

---

### `apps/api/src/modules/kiosk/kiosk.module.ts` (module, NestJS)

**Analog:** `apps/api/src/modules/visitor/visitor.module.ts` (lines 1-29)

**Module pattern** (lines 1-29):
```typescript
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { KioskController } from "./kiosk.controller";
import { KioskService } from "./kiosk.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [KioskController],
  providers: [KioskService],
  exports: [KioskService],
})
export class KioskModule {}
```

---

### `apps/api/src/modules/kiosk/kiosk.controller.ts` (controller, request-response)

**Analog:** `apps/api/src/modules/visitor/visitor.controller.ts` (lines 1-135)

**Controller pattern** (lines 1-23):
```typescript
import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { KioskService } from "./kiosk.service";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { KioskAuthGuard } from "../../common/guards/kiosk-auth.guard";

@Controller("kiosk")
export class KioskController {
  constructor(private readonly kioskService: KioskService) {}

  @Post("print/:visitId")
  @Public()
  @UseGuards(KioskAuthGuard)
  async printBadge(@Param("visitId") visitId: string) {
    return this.kioskService.printBadge(visitId);
  }
}
```

**Key difference from VisitorController:** Kiosk endpoints use `@Public()` + `@UseGuards(KioskAuthGuard)` instead of `@Roles(...)`.

---

### `apps/api/src/modules/kiosk/kiosk.service.ts` (service, CRUD)

**Analog:** `apps/api/src/modules/visitor/visitor.service.ts` (lines 1-17, 216-264 for checkIn method)

**Service pattern** (lines 1-17):
```typescript
import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class KioskService {
  private readonly logger = new Logger(KioskService.name);

  constructor(
    private prisma: PrismaService,
  ) {}
```

**Error handling pattern** (lines 222-233):
```typescript
const visit = await this.prisma.visit.findUnique({
  where: { id: visitId },
  include: { visitor: true, credential: true },
});

if (!visit) throw new NotFoundException("Visit not found");
if (visit.status !== "scheduled") {
  throw new BadRequestException(`Visit cannot be checked in — current status: ${visit.status}`);
}
```

**Print service will use `child_process.exec` for CUPS** (from RESEARCH.md):
```typescript
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";

const execAsync = promisify(exec);

async printBadge(visitId: string): Promise<void> {
  const visit = await this.prisma.visit.findUnique({
    where: { id: visitId },
    include: { visitor: true },
  });
  if (!visit) throw new NotFoundException("Visit not found");

  const zpl = generateZplBadge({
    visitorName: `${visit.visitor.firstName} ${visit.visitor.lastName}`,
    hostName: visit.hostName || "Hôte",
    date: new Date().toLocaleString("fr-FR"),
    qrContent: visit.id,
  });

  const tmpFile = path.join("/tmp", `badge-${Date.now()}.zpl`);
  await fs.writeFile(tmpFile, zpl, "utf-8");

  try {
    const { stderr } = await execAsync(
      `lp -d kiosk-printer -o raw "${tmpFile}"`,
      { timeout: 15000 },
    );
    if (stderr) this.logger.warn(`lp stderr: ${stderr}`);
    this.logger.log(`Badge printed: visit ${visitId}`);
  } catch (err: any) {
    this.logger.error(`Print failed: ${err.message}`);
    throw new Error(`Print failed: ${err.message}`);
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
}
```

---

### `apps/api/src/common/guards/kiosk-auth.guard.ts` (middleware, auth)

**Analog 1 (API key validation):** `apps/api/src/modules/api-key/guards/tenant-api-key.guard.ts` (lines 1-116)

**Analog 2 (JWT guard pattern):** `apps/api/src/common/guards/jwt-auth.guard.ts` (lines 1-33)

**Analog 3 (tenant isolation skip pattern):** `apps/api/src/common/guards/tenant-isolation.guard.ts` (lines 1-40)

**TenantApiKeyGuard — API key validation pattern** (lines 33-113):
```typescript
@Injectable()
export class TenantApiKeyGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @Inject("REDIS") private redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const apiKey: string | undefined = request.headers["x-api-key"];

    if (!apiKey) {
      throw new UnauthorizedException("Clé API requise (en-tête X-API-Key)");
    }

    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const keyRecord = await this.prisma.tenantApiKey.findFirst({
      where: { keyHash, isActive: true },
    });

    if (!keyRecord) throw new UnauthorizedException("Clé API invalide");
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      throw new UnauthorizedException("La clé API a expiré");
    }
    if (keyRecord.revokedAt) throw new UnauthorizedException("La clé API a été révoquée");

    // Attach API key info
    request.apiKeyInfo = {
      id: keyRecord.id,
      name: keyRecord.name,
      scopes: keyRecord.scopes as string[],
      rateLimit: keyRecord.rateLimit,
      organizationId: keyRecord.organizationId,
    };

    return true;
  }
}
```

**JwtAuthGuard — @Public() skip pattern** (lines 16-24):
```typescript
canActivate(context: ExecutionContext) {
  const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
    context.getHandler(),
    context.getClass(),
  ]);
  if (isPublic) return true;
  return super.canActivate(context);
}
```

**KioskAuthGuard pattern — accept API key OR JWT** (from RESEARCH.md):
```typescript
@Injectable()
export class KioskAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check API key first (kiosk path)
    const apiKey = request.headers["x-api-key"];
    if (apiKey) {
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
      const keyRecord = await this.prisma.tenantApiKey.findFirst({
        where: { keyHash, isActive: true },
      });
      if (keyRecord) {
        request.apiKeyInfo = { ... };
        request.user = { orgId: keyRecord.organizationId, ... };
        return true;
      }
    }

    // Fall through to JWT auth
    // ... validate JWT token
    return true;
  }
}
```

---

### `docker-compose.yml` (modified file)

**Analog:** Existing service definitions (api service lines 7-47, dashboard lines 49-67)

**Service definition pattern** (lines 7-47, 49-67):
```yaml
  api:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
    container_name: oversight-api
    restart: unless-stopped
    ports:
      - 4000:4000
    environment:
      DATABASE_URL: ${DATABASE_URL:?DATABASE_URL is required}
      # ... env vars
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:4000/api/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 45s
```

**Kiosk service addition** (from RESEARCH.md):
```yaml
  # ─── Kiosk (Visitor Self-Check-in/out) ───
  kiosk:
    build:
      context: .
      dockerfile: docker/kiosk.Dockerfile
    container_name: oversight-kiosk
    restart: unless-stopped
    ports:
      - "3080:80"
    environment:
      KIOSK_ID: ${KIOSK_ID:-kiosk-01}
      PRINTER_IP: ${PRINTER_IP:?PRINTER_IP is required}
      SITE_ID: ${SITE_ID:?SITE_ID is required}
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:80/ || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s
```

---

### `.env.example` (modified file)

**Analog:** Existing `.env.example` sections (lines 62-128 for API/Dashboard, lines 286-325 for MQTT/Edge)

**Section pattern** (lines 63-68, 117-128):
```bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                              API (NestJS)                                   ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
# Port d'écoute
# [OPTIONNEL] Défaut : 4000
PORT=4000
```

**Kiosk env var section to add:**
```bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                           KIOSK (Visitor Self-Check-in/out)                ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# API key for kiosk authentication (generated via Dashboard API Keys panel)
# [REQUIS] Must have appropriate visitor scopes
KIOSK_API_KEY=CHANGE_ME_KIOSK_API_KEY

# Unique ID for this kiosk instance (supports multi-kiosk from v3.0)
# [OPTIONNEL] Défaut : kiosk-01
KIOSK_ID=kiosk-01

# IP address of the network thermal printer (ZPL)
# [REQUIS] Example: 192.168.1.100
PRINTER_IP=CHANGE_ME_PRINTER_IP

# Site identifier for this kiosk's location
# [REQUIS] Example: siege-hq-lobby
SITE_ID=CHANGE_ME_SITE_ID
```

---

### `apps/api/src/modules/visitor/visitor.controller.ts` (modified file)

**Changes needed:** Add `@Public()` + new search endpoint for kiosk name search.

**Existing pattern to follow** — check-in endpoint (lines 53-61):
```typescript
@Post("visits/:id/check-in")
@Roles("ADMIN", "SUPERVISOR", "OPERATOR")
async checkIn(@Param("id") id: string, @Req() req: FastifyRequest) {
  const user = (req as any).user;
  return this.visitorService.checkIn(id, user.id);
}
```

**New kiosk-friendly check-in endpoint** (add alongside existing):
```typescript
@Post("visits/:id/kiosk-check-in")
@Public()
@UseGuards(KioskAuthGuard)
async kioskCheckIn(@Param("id") id: string) {
  const user = (req as any).user;
  return this.visitorService.checkIn(id, user?.id);
}
```

**New search visits endpoint** (add for kiosk name search — existing `listVisits` needs search param):
The existing `GET /visitors/visits` already supports `status` and `hostUserId` params:
```typescript
@Get("visits")
@Roles("ADMIN", "SUPERVISOR", "OPERATOR")
async listVisits(@Query("status") status?: string, ...)
```

Kiosk needs a search by visitor name. Add a `search` query parameter to the existing endpoint, or add a new dedicated one with `@Public()`.

---

### `packages/shared/src/types/visitor.types.ts` (reference — already exists)

**Existing types** (lines 15-31):
```typescript
export interface VisitDto {
  id: string;
  visitorId: string;
  hostUserId: string;
  hostName?: string;
  purpose?: string;
  validFrom: string;
  validUntil: string;
  credentialId?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  status: string;
  zoneRestrictions?: string[];
  createdAt: string;
  updatedAt: string;
  visitor?: VisitorDto;
}

export interface VisitorDto {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

These types are used by the kiosk API client for type-safe responses. No changes needed — the existing types already cover all fields needed by the kiosk.

---

## Shared Patterns

### Authentication (API Key + JWT combined)

**Source:** `apps/api/src/modules/api-key/guards/tenant-api-key.guard.ts` (lines 1-116)
**Apply to:** `KioskAuthGuard` (new guard), `KioskController` (print endpoint)

The guard checks `X-API-Key` header first (SHA-256 hash lookup against `TenantApiKey` table), falls through to JWT bearer auth. For kiosk-only routes, the JWT fallback may be unnecessary — but it's useful for testing from the Dashboard.

### Error Handling (NestJS exceptions)

**Source:** `apps/api/src/modules/visitor/visitor.service.ts` (lines 222-233)
**Apply to:** `KioskService`, `VisitorController` (modified endpoints)

```typescript
if (!thing) throw new NotFoundException("Visit not found");
if (condition) throw new BadRequestException("Visit cannot be checked in — current status: ...");
```

All errors bubble up to the global `AllExceptionsFilter` which returns standardized `{ statusCode, error, message, path, timestamp }`.

### NestJS Module Registration

**Source:** `apps/api/src/modules/visitor/visitor.module.ts` (lines 1-29)
**Apply to:** `KioskModule`

```typescript
@Module({
  imports: [PrismaModule],
  controllers: [KioskController],
  providers: [KioskService],
  exports: [KioskService],
})
export class KioskModule {}
```

The AppModule already auto-discovers modules in the `modules/` directory.

### Docker Compose Service Pattern

**Source:** `docker-compose.yml` (lines 7-67 — api + dashboard services)
**Apply to:** Kiosk service addition

All services follow the same pattern: `build.context: .`, `build.dockerfile: docker/*.Dockerfile`, `container_name: oversight-*`, `restart: unless-stopped`, `ports`, `environment` with `${VAR:?error}` required-var syntax, `healthcheck`.

### Multi-stage Docker Build

**Source:** `docker/dashboard.Dockerfile` (lines 1-64)
**Apply to:** `docker/kiosk.Dockerfile`

Three-stage pattern:
1. **deps:** Install dependencies with `pnpm install --frozen-lockfile`
2. **builder:** Copy sources, build shared package (`npx tsc -p packages/shared/tsconfig.json`), build app (`pnpm --filter @repo/kiosk build`)
3. **runner:** Minimal production image (for kiosk: `alpine:3.19` with nginx + CUPS)

### Visitor Data Flow (Check-in/out)

**Source:** `apps/api/src/modules/visitor/visitor.service.ts` (lines 216-264)
**Apply to:** Kiosk SPA API calls

The existing `checkIn()` and `checkOut()` methods handle: visit lookup, status validation, credential activation/deactivation, Redis revocation, event emission. The kiosk calls these directly (no new DB operations needed). The kiosk only adds the print step after check-in succeeds.

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/kiosk/components/qr-scanner.tsx` | component | UI (camera) | First QR/WebRTC component in the project. Use RESEARCH.md Pattern 2 + instascan README. |
| `apps/kiosk/components/printing-screen.tsx` | component | UI | First printer status UI component. No existing analog for CUPS print status. |
| `apps/kiosk/components/success-screen.tsx` | component | UI | Kiosk-specific success screen. No direct analog in dashboard. |
| `apps/kiosk/components/checkout-screen.tsx` | component | UI | Kiosk-specific checkout UI. No direct analog. |
| `apps/kiosk/components/error-screen.tsx` | component | UI | Kiosk-specific error screen. No direct analog. |
| `apps/kiosk/app/page.tsx` | component | UI (root) | Root page uses `useReducer` state machine — not file-based routing like dashboard pages. |
| `apps/api/src/modules/kiosk/zpl-badge.ts` | utility | file-I/O | First ZPL generation utility. No existing print-related code in repo. |
| `docker/kiosk.nginx.conf` | config | nginx | No nginx config exists in repo yet (Caddy is used as reverse proxy, but kiosk uses nginx internally). |
| `docker/kiosk-entrypoint.sh` | utility | startup | No shell entrypoint scripts exist in the repo (API uses inline heredoc in Dockerfile). |

## Metadata

**Analog search scope:** 
- `apps/api/src/modules/visitor/` (controller, service, module, gateway)
- `apps/api/src/modules/api-key/` (service, guard, module)
- `apps/api/src/modules/notification/` (service)
- `apps/api/src/common/guards/` (jwt-auth, tenant-isolation, roles)
- `apps/api/src/common/decorators/` (public, roles)
- `apps/dashboard/lib/` (api.ts, auth-client.ts, i18n/)
- `apps/dashboard/app/` (layout.tsx, globals.css)
- `apps/dashboard/` (next.config.js, tailwind.config.ts, postcss.config.js)
- `docker/` (api.Dockerfile, dashboard.Dockerfile)
- `docker-compose.yml`
- `.env.example`
- `packages/shared/src/` (schemas/visitor.schema.ts, types/visitor.types.ts, index.ts)

**Files scanned:** 25 source files + 4 directories listed
**Pattern extraction date:** 2026-07-17
