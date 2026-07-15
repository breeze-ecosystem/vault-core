# Architecture Research: v2.0 Commercial SaaS Platform

**Domain:** Multi-tenant SaaS architecture layering onto existing physical security intelligence platform
**Researched:** 2026-07-15
**Confidence:** HIGH

## Scope

This research covers the architectural transformation of Oversight Hub from a single-tenant prototype (v1.0) into a commercial multi-tenant SaaS platform (v2.0). The existing system provides a NestJS monorepo with 29 feature modules, PostgreSQL/Prisma persistence, Redis/BullMQ job queues, JWT auth with RBAC, Next.js Dashboard, Expo Mobile, and Docker Compose deployment with Caddy reverse proxy.

**New architectural concerns:**
1. Multi-tenant data isolation (organization-level tenancy)
2. Stripe billing/subscription integration
3. License provisioning and activation flow
4. Public marketing website (separate from Dashboard)
5. Premium Design System (shared across Dashboard, Mobile, Marketing)
6. Tenant-aware RBAC (roles + permissions scoped to organization)
7. API versioning for public/integration endpoints

**Key constraint:** Build on the existing NestJS + Next.js + Expo + Prisma + Redis + BullMQ stack. No framework rewrites.

---

## Standard Architecture

### System Overview — v2.0 Commercial Layers

```
                          ┌───────────────────────────────────────────────┐
                          │                Caddy Reverse Proxy             │
                          │  app.domain.com → Dashboard   :3100            │
                          │  domain.com      → Marketing  :3200            │
                          │  /api/*          → API        :4000            │
                          │  /ws/*           → API (WS)   :4000            │
                          └──────┬──────────┬───────────┬─────────────────┘
                                 │          │           │
        ┌────────────────────────┼──────────┼───────────┼──────────────────┐
        │            ┌───────────┴──┐  ┌────┴──────┐  ┌─┴───────────┐      │
        │            │  Dashboard   │  │ Marketing │  │  Expo Mobile │      │
        │            │  Next.js 14  │  │ Next.js   │  │  Expo SDK 54 │      │
        │            │  (app routes)│  │ (SSG/ISR) │  │  (API client)│      │
        │            └──────┬───────┘  └───────────┘  └──────┬───────┘      │
        │                   │                                │              │
        │      shares @repo/ui  design system                │              │
        │                   │                                │              │
        │  ┌────────────────┴────────────────────────────────┴──────────┐  │
        │  │                    NestJS API (Fastify :4000)               │  │
        │  │                                                             │  │
        │  │  ┌────────────────── NEW v2.0 COMMERCIAL LAYER ──────────┐ │  │
        │  │  │                                                        │ │  │
        │  │  │  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────────┐  │ │  │
        │  │  │  │Tenant    │ │Billing   │ │License │ │API         │  │ │  │
        │  │  │  │Module    │ │Module    │ │Module  │ │Versioning  │  │ │  │
        │  │  │  │(org ctx, │ │(Stripe,  │ │(keys,  │ │(v1 public, │  │ │  │
        │  │  │  │ RLS,     │ │ plans,   │ │ activ.,│ │ v2 internal│  │ │  │
        │  │  │  │ Prisma   │ │ webhooks)│ │ valid.) │ │            │  │ │  │
        │  │  │  │ ext.)    │ │          │ │        │ │            │  │ │  │
        │  │  │  └────┬─────┘ └────┬─────┘ └───┬────┘ └─────┬──────┘  │ │  │
        │  │  │       │            │            │            │         │ │  │
        │  │  └───────┼────────────┼────────────┼────────────┼─────────┘ │  │
        │  │          │            │            │            │           │  │
        │  │  ┌───────┴────────────┴────────────┴────────────┴─────────┐ │  │
        │  │  │              EXISTING v1.0 MODULES (29)                │ │  │
        │  │  │  auth, access, door, camera, alert, incident,          │ │  │
        │  │  │  visitor, audit, notification, ai, analytics, ...     │ │  │
        │  │  └─────────────────────────┬──────────────────────────────┘ │  │
        │  └────────────────────────────┼────────────────────────────────┘  │
        └───────────────────────────────┼───────────────────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────────┐
        │                       Data Layer                                  │
        │  ┌────────────────┐ ┌───────┴──────┐ ┌────────────────────────┐  │
        │  │  PostgreSQL 16 │ │   Redis 7   │ │   External Services     │  │
        │  │  (Prisma ORM)  │ │ (BullMQ,    │ │                        │  │
        │  │  + TimescaleDB │ │  sessions,  │ │  Stripe API (webhooks)  │  │
        │  │  + pgvector    │ │  cache)     │ │  Ollama (AI/LLM)        │  │
        │  │  + pgcrypto    │ │             │ │  go2rtc (streaming)     │  │
        │  │  + RLS policies│ │             │ │  FFmpeg (frames)        │  │
        │  └────────────────┘ └─────────────┘ └────────────────────────┘  │
        └──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Integration Points |
|-----------|---------------|-------------------|
| **Tenant Module** | Organization CRUD, tenant context propagation, Prisma client extension with `organizationId` injection, PostgreSQL RLS policies, tenant-aware connection pooling | Every existing module (transparent injection via Prisma extension) |
| **Billing Module** | Stripe Checkout sessions, Billing Portal sessions, webhook signature verification, subscription status sync, plan-to-feature mapping, invoice history | Stripe API (REST + webhooks), Tenant Module (org → Stripe customer mapping), BullMQ (async webhook processing) |
| **License Module** | JWT-based license key generation/validation, activation flow, device binding, expiration monitoring, grace period enforcement | Tenant Module (license → org association), Billing Module (plan from subscription determines license tier) |
| **Tenant-Aware Auth** | Extended JWT payload with `organizationId` + `permissions[]`, org-scoped `RolesGuard`, `OrganizationGuard` for resource ownership, SUPER_ADMIN platform-level role | Auth Module (existing), all guards and decorators |
| **API Versioning** | URL-based version routing (`/api/v1/...`), versioned controller decorators, internal vs external endpoint separation | NestJS routing, Swagger documentation per version |
| **Design System** (`@repo/ui`) | Design tokens (colors, typography, spacing), shared UI components (Buttons, Cards, Inputs, Modals, Badges, Tables, Forms), Tailwind preset, icon library | Dashboard (Next.js + Tailwind), Marketing (Next.js + Tailwind), Mobile (token constants only, no React components) |
| **Marketing Website** (`apps/marketing`) | Public-facing Next.js app: Home, Features, Pricing, Blog, Contact, Documentation, SEO metadata, OG images, sitemap | `@repo/ui` (design system), Stripe Checkout (pricing → subscription), no API dependency (static + ISR) |

---

## Recommended Project Structure

```
oversight-hub/
├── apps/
│   ├── api/                     # Existing NestJS backend (+ new commercial modules)
│   │   └── src/
│   │       └── modules/
│   │           ├── tenant/      # NEW: Organization CRUD, tenant context, Prisma extension
│   │           ├── billing/     # NEW: Stripe integration, webhooks, plans
│   │           ├── license/     # NEW: License provisioning, activation, validation
│   │           └── ...          # Existing 29 modules (updated for tenant-awareness)
│   ├── dashboard/               # Existing Next.js Dashboard (redesigned with design system)
│   ├── marketing/               # NEW: Public marketing website (Next.js, SSG/ISR)
│   └── mobile/                  # Existing Expo Mobile (redesigned with design tokens)
├── packages/
│   ├── shared/                  # Existing: Zod schemas, types, constants
│   │   └── src/
│   │       ├── constants/
│   │       │   ├── plans.ts     # NEW: Plan tiers, feature flags, limits
│   │       │   └── ...
│   │       ├── schemas/
│   │       │   ├── tenant.schema.ts  # NEW
│   │       │   ├── billing.schema.ts # NEW
│   │       │   └── license.schema.ts # NEW
│   │       └── types/
│   │           ├── tenant.types.ts   # NEW
│   │           └── billing.types.ts  # NEW
│   └── ui/                      # EXPANDED: Design system (tokens, components, Tailwind preset)
│       └── src/
│           ├── tokens/          # NEW: colors.ts, typography.ts, spacing.ts, shadows.ts
│           ├── components/      # Expanded from 15 to full component library
│           ├── icons/           # NEW: Lucide icon wrappers
│           ├── tailwind-preset.ts # NEW: Shared Tailwind config for Dashboard + Marketing
│           └── index.ts         # Barrel export
├── prisma/
│   └── schema.prisma            # Updated: Organization model, orgId on all tables
└── docker-compose.yml           # Updated: marketing service, Stripe webhook endpoint
```

### Structure Rationale

- **`apps/marketing/`:** Separate Next.js app (not merged with Dashboard) because it has fundamentally different concerns: public/unauth vs private/authenticated, SSG/ISR vs CSR/SSR, different Caddy routing, different security posture. Shared design system via `@repo/ui` maintains brand consistency.
- **`packages/ui/tokens/`:** Design tokens as TypeScript constants (not CSS custom properties only) so they can be consumed by React Native `StyleSheet.create()` — a CSS-only approach would leave Mobile without shared tokens.
- **`packages/shared/src/constants/plans.ts`:** Feature flags and plan limits live in shared package so both API (enforcement) and Dashboard/Marketing (UI display) use the same source of truth.
- **New modules in `apps/api/src/modules/`:** Tenant, Billing, License follow the existing NestJS module pattern (`*.module.ts`, `*.service.ts`, `*.controller.ts`) for consistency with the 29 existing modules.

---

## Architectural Patterns

### Pattern 1: Discriminator Column + Prisma Client Extension (Multi-Tenant Isolation)

**What:** Every tenant-scoped table gets an `organizationId` column. A Prisma Client Extension automatically injects `WHERE organizationId = $currentOrgId` into all queries. PostgreSQL Row-Level Security (RLS) policies provide defense-in-depth at the database level.

**When to use:** All queries in the system after tenant authentication. The extension is applied once at PrismaService initialization and is transparent to all existing services — they don't need code changes to become tenant-aware.

**Trade-offs:**
- *Pro:* Zero code changes to existing 29 modules. Prisma-level enforcement catches tenant leaks before they reach the database driver. Type-safe.
- *Pro:* RLS provides database-level guarantee — even a raw SQL query from a compromised service can't cross tenant boundaries.
- *Con:* Prisma Client Extensions add a small performance overhead per query (~1-5%). Mitigated by the fact that `organizationId` filters are indexed and cheap.
- *Con:* Developers must remember to add `organizationId` to new tables. Solved by a Prisma generator or lint rule.

**Implementation:**

```typescript
// apps/api/src/modules/tenant/prisma-tenant.extension.ts
import { Prisma } from "@prisma/client";

// Models that are NOT tenant-scoped (global/shared):
const GLOBAL_MODELS = ["Organization", "Plan", "LicenseKey"];

export function tenantExtension(organizationId: string) {
  return Prisma.defineExtension({
    name: "tenantIsolation",
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          // Skip global models and operations without where clause
          if (GLOBAL_MODELS.includes(model as string)) return query(args);
          if (operation === "$executeRaw" || operation === "$queryRaw") return query(args);

          // For write operations, inject orgId into data
          if (["create", "createMany", "upsert"].includes(operation)) {
            const data = (args as any).data;
            if (data && typeof data === "object") {
              if (Array.isArray(data)) {
                (args as any).data = data.map((d: any) => ({ ...d, organizationId }));
              } else {
                (args as any).data = { ...data, organizationId };
              }
            }
            return query(args);
          }

          // For read/update/delete operations, inject orgId into where
          const argsWithWhere = args as { where?: Record<string, unknown> };
          (args as any).where = {
            ...(argsWithWhere.where ?? {}),
            organizationId,
          };
          return query(args);
        },
      },
    },
  });
}
```

```typescript
// apps/api/src/modules/tenant/tenant.service.ts
@Injectable({ scope: Scope.REQUEST })
export class TenantService {
  private _organizationId: string | null = null;

  setOrganization(id: string) { this._organizationId = id; }
  get organizationId(): string { return this._organizationId!; }
}
```

```typescript
// apps/api/src/modules/tenant/tenant.middleware.ts
// Replaces existing SiteContextMiddleware — sets both org context + RLS variable
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private tenantService: TenantService,
    private prisma: PrismaService,
  ) {}

  async use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
    const user = (req as any).user;
    if (user?.organizationId) {
      this.tenantService.setOrganization(user.organizationId);
      // PostgreSQL RLS defense-in-depth
      await this.prisma.$executeRawUnsafe(
        `SELECT set_config('app.current_organization_id', $1, TRUE)`,
        user.organizationId,
      );
    }
    next();
  }
}
```

### Pattern 2: Stripe Webhooks-First Billing Architecture

**What:** Stripe is the source of truth for subscription state. The platform never polls Stripe — it reacts to webhook events. Webhooks are verified (signature check), acknowledged immediately (HTTP 200), and processed asynchronously via BullMQ.

**When to use:** All subscription lifecycle events — creation, updates, cancellations, payment successes/failures, trial endings.

**Trade-offs:**
- *Pro:* No polling overhead. State syncs in near-real-time (typically < 300ms).
- *Pro:* Stripe handles retries with exponential backoff for failed webhook deliveries.
- *Pro:* BullMQ decouples webhook receipt from processing — webhook endpoint returns 200 immediately, preventing Stripe timeouts.
- *Con:* Async processing means eventual consistency — subscription state may be stale for 1-5 seconds after a Stripe-side change. Acceptable for billing (not safety-critical).
- *Con:* Must handle webhook idempotency (same event delivered twice). Mitigated by storing `stripeEventId` and deduplicating.

**Implementation:**

```typescript
// apps/api/src/modules/billing/billing.webhook.controller.ts
@Controller("billing/webhook")
export class BillingWebhookController {
  constructor(
    private billingService: BillingService,
    private config: ConfigService,
    @InjectQueue("billing") private billingQueue: Queue,
  ) {}

  @Public() // No JWT — verified by Stripe signature instead
  @Post()
  async handleWebhook(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const sig = req.headers["stripe-signature"] as string;
    const secret = this.config.getOrThrow("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;
    try {
      event = this.billingService.constructEvent(req.body as Buffer, sig, secret);
    } catch {
      throw new BadRequestException("Invalid webhook signature");
    }

    // Acknowledge immediately, process async
    await this.billingQueue.add("process-webhook", {
      eventId: event.id,
      type: event.type,
      data: event.data.object,
    });

    return res.status(200).send({ received: true });
  }
}
```

```typescript
// apps/api/src/modules/billing/billing.processor.ts
@Processor("billing")
export class BillingProcessor {
  async processWebhook(job: Job) {
    const { eventId, type, data } = job.data;

    // Idempotency check
    const existing = await this.db.stripeEvent.findUnique({ where: { eventId } });
    if (existing) return;

    switch (type) {
      case "checkout.session.completed":
        await this.handleCheckoutCompleted(data);
        break;
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(data);
        break;
      case "customer.subscription.deleted":
        await this.handleSubscriptionCancelled(data);
        break;
      case "invoice.payment_succeeded":
        await this.handlePaymentSucceeded(data);
        break;
      case "invoice.payment_failed":
        await this.handlePaymentFailed(data);
        break;
    }

    await this.db.stripeEvent.create({ data: { eventId, type, processedAt: new Date() } });
  }
}
```

### Pattern 3: Tenant-Aware RBAC with JWT Claims Extension

**What:** The JWT payload is extended to include `organizationId` and `permissions[]` (granular feature flags). Roles are scoped to an organization — an `ADMIN` in Org A has no access to Org B. A platform-level `SUPER_ADMIN` role exists outside any organization for cross-tenant management.

**When to use:** Every authenticated request. Guards check: (1) valid JWT, (2) user belongs to organization, (3) role meets minimum for the endpoint, (4) resource belongs to user's organization.

**Trade-offs:**
- *Pro:* Stateless — no database lookup per request (orgId + permissions in JWT claims).
- *Pro:* Backward-compatible with existing `RolesGuard` (adds organization check without changing existing role hierarchy).
- *Con:* JWT size increases (~50-100 bytes for permissions array). Mitigated by keeping permissions compact (bitmask or short string array).
- *Con:* Permission changes require token refresh (or short token TTL). Acceptable for security platform where session revocation on role change is desirable.

**Implementation:**

```typescript
// Updated JWT payload
interface TokenPayload {
  sub: string;             // userId
  email: string;
  role: Role;              // e.g., "ADMIN", "SUPERVISOR"
  organizationId: string;  // NEW — tenant scope
  permissions: string[];   // NEW — granular features e.g., ["cameras:write", "doors:read"]
}

// Updated JWT Strategy validate()
async validate(payload: TokenPayload) {
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    organizationId: payload.organizationId,
    permissions: payload.permissions,
  };
}
```

```typescript
// NEW OrganizationGuard — checks resource ownership
@Injectable()
export class OrganizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;  // { organizationId: "org_123", ... }
    const resourceOrgId = request.params?.organizationId
      || request.body?.organizationId
      || request.query?.organizationId;

    // SUPER_ADMIN bypasses org check
    if (user.role === "SUPER_ADMIN") return true;

    // Resource must belong to user's org
    if (resourceOrgId && resourceOrgId !== user.organizationId) {
      throw new ForbiddenException("Resource does not belong to your organization");
    }
    return true;
  }
}
```

### Pattern 4: API Versioning with URL Prefix

**What:** Public/integration endpoints use URL-based versioning (`/api/v1/cameras`). Internal endpoints (Dashboard, Mobile) remain version-neutral. NestJS `VersioningType.URI` is enabled globally with `VERSION_NEUTRAL` as default.

**When to use:** Any endpoint intended for third-party integrators or public API consumers. Internal endpoints (Dashboard-to-API, Mobile-to-API) bypass versioning.

**Trade-offs:**
- *Pro:* Explicit and unambiguous — the version is in the URL, visible in logs, easy to route.
- *Pro:* Internal endpoints are unaffected (no URL changes for Dashboard/Mobile API calls).
- *Con:* Requires discipline to mark which controllers are versioned vs internal. Solved by a naming convention: `*Controller.public.ts` for versioned, `*Controller.ts` for internal.

**Implementation:**

```typescript
// main.ts
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: VERSION_NEUTRAL, // Internal endpoints work as before
});
```

```typescript
// Versioned public controller
@Controller({ path: "cameras", version: "1" })
export class CameraPublicController {
  @Get()
  findAll() {}  // Accessible at: GET /api/v1/cameras
}

// Internal controller (unchanged)
@Controller("cameras")
export class CameraController {
  @Get()
  findAll() {}  // Accessible at: GET /api/cameras (no version prefix)
}
```

### Pattern 5: Monorepo Design System with Multi-Platform Tokens

**What:** Design tokens are defined as TypeScript constants in `@repo/ui/tokens/`. The shared UI components use Tailwind CSS with a shared preset. Mobile consumes only the token constants (not React components) and applies them via `StyleSheet.create()`.

**When to use:** Every visual element across Dashboard, Marketing, and Mobile.

**Trade-offs:**
- *Pro:* Single source of truth for brand identity. Changing a color updates all platforms.
- *Pro:* Mobile doesn't bundle unused web components (tree-shaking via selective imports).
- *Pro:* Tailwind preset ensures Dashboard and Marketing share the exact same design language.
- *Con:* Tokens must be platform-agnostic (e.g., shadows expressed as CSS box-shadow AND React Native elevation). Handled by providing both representations.

**Implementation:**

```typescript
// packages/ui/src/tokens/colors.ts
export const colors = {
  brand: {
    50:  "#eff6ff",
    500: "#3b82f6",  // Primary
    900: "#1e3a5f",
  },
  surface: {
    primary:   "#0f172a",  // Dark bg
    secondary: "#1e293b",  // Card bg
    elevated:  "#334155",  // Modal bg
  },
  // ... semantic tokens for status, severity, etc.
} as const;
```

```typescript
// packages/ui/src/tailwind-preset.ts
export const oversightPreset = {
  theme: {
    extend: {
      colors: {
        brand: colors.brand,
        surface: colors.surface,
      },
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
        mono: ["JetBrains Mono", ...defaultTheme.fontFamily.mono],
      },
      // ... spacing, shadows, border-radius from tokens
    },
  },
} satisfies Config;
```

```typescript
// apps/mobile/lib/theme.ts — imports tokens, NOT components
import { colors, typography, spacing } from "@repo/ui/tokens";

export const theme = {
  colors: {
    primary: colors.brand[500],
    background: colors.surface.primary,
    card: colors.surface.secondary,
  },
  typography: {
    h1: { fontSize: typography.size["4xl"], fontWeight: typography.weight.bold },
    body: { fontSize: typography.size.base, fontWeight: typography.weight.normal },
  },
  spacing,
};
```

---

## Data Flow

### Primary Request Flow (Multi-Tenant)

```
1. Client sends request: GET /api/v1/cameras
   Authorization: Bearer eyJ...{orgId: "org_123", role: "ADMIN"}...

2. Fastify → TenantContextMiddleware
   - Extracts organizationId from JWT
   - Sets TenantService.organizationId = "org_123"
   - Sets PostgreSQL RLS: set_config('app.current_organization_id', 'org_123')

3. NestJS Router → JwtAuthGuard → RolesGuard → OrganizationGuard
   - JWT validated
   - Role >= required for endpoint
   - Requested resource belongs to org_123

4. Controller → Service → PrismaService (tenant-extended)
   - Prisma Client Extension automatically injects WHERE organizationId = 'org_123'
   - Query: SELECT * FROM cameras WHERE organizationId = 'org_123' AND ...
   - PostgreSQL RLS also enforces (defense in depth)

5. Response returned with only org_123's data
```

### Stripe Webhook → Subscription Sync Flow

```
1. Stripe sends webhook: POST /api/billing/webhook
   Header: stripe-signature: t=...,v1=...

2. BillingWebhookController
   - Verifies signature with STRIPE_WEBHOOK_SECRET
   - Returns 200 immediately
   - Enqueues job: billingQueue.add("process-webhook", { eventId, type, data })

3. BullMQ BillingProcessor (async)
   - Checks idempotency (stripeEvent record)
   - Processes event:
     subscription.updated → update Organization.subscriptionStatus, plan
     invoice.paid → update Organization.billingStatus → "active"
     invoice.payment_failed → update Organization.billingStatus → "past_due"

4. If plan upgrade: update Organization.featureLimits
   - maxCameras, maxSites, maxUsers changed
   - Existing modules check limits on create operations

5. If plan cancellation: schedule Organization deactivation
   - BullMQ delayed job: deactivate after grace period (30 days)
   - Notify org admins via email 7 days before deactivation
```

### License Activation Flow (Self-Hosted)

```
1. Admin enters license key in Dashboard: POST /api/license/activate
   Body: { licenseKey: "eyJhbG..." }

2. LicenseService.activate()
   - Verify JWT signature with LICENSE_SECRET
   - Decode payload: { orgId, plan, maxCameras, maxSites, exp, domain }
   - Check expiry: exp > now
   - Check domain binding: domain matches request origin (if set)
   - Check not already activated by another org (if single-use)
   - Store activation: Organization.licenseKeyHash, Organization.licensedUntil

3. Feature limits applied immediately
   - Organization.featureLimits = planToFeatures(plan)

4. Daily cron: LicenseService.checkExpiring()
   - Query: organizations WHERE licensedUntil < NOW() + INTERVAL '30 days'
   - Send warning emails at T-30, T-14, T-7, T-1 days
   - At expiry: set Organization.licenseStatus = "EXPIRED"
   - EXPIRED orgs: API returns 402 Payment Required on write operations
```

### Tenant-Context-Aware Prisma Client Composition

```
Request arrives
    │
    ▼
TenantContextMiddleware
    │ set organizationId on TenantService
    ▼
PrismaService.getClient()  ← called by every service
    │
    │  Creates extended Prisma client for this request:
    │  prisma.$extends(tenantExtension(orgId))
    │
    ▼
Service calls await this.prisma.camera.findMany({ where: { siteId: "..." } })
    │
    ▼
Tenant Extension intercepts:
    args.where = { siteId: "...", organizationId: "org_123" }
    ▼
    query(args) → PostgreSQL
    WHERE siteId = '...' AND organizationId = 'org_123'
    (RLS also enforces: app.current_organization_id = 'org_123')
```

---

## Prisma Schema — Key v2.0 Additions

```prisma
// ─── NEW: Organization (Tenant) ───
model Organization {
  id                  String    @id @default(uuid())
  name                String
  slug                String    @unique
  stripeCustomerId    String?   @unique
  stripeSubscriptionId String?  @unique
  plan                String    @default("free")  // 'free', 'starter', 'pro', 'enterprise'
  billingStatus       String    @default("inactive") // 'active', 'past_due', 'canceled', 'trialing'
  licenseKeyHash      String?   @unique
  licensedUntil       DateTime?
  licenseStatus       String    @default("none")  // 'none', 'active', 'expired', 'revoked'
  featureLimits       Json      @default("{}")    // { maxCameras: 10, maxSites: 3, ... }
  settings            Json      @default("{}")
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  // Relations — existing models gain organizationId
  sites               Site[]
  users               User[]
  cameras             Camera[]
  stripeEvents        StripeEvent[]
  // ... all tenant-scoped models
}

// ─── NEW: Stripe Event Log (idempotency) ───
model StripeEvent {
  id          String   @id @default(uuid())
  eventId     String   @unique
  type        String
  processedAt DateTime @default(now())
}

// ─── UPDATED: User (adds organizationId, drops siteId) ───
model User {
  // ... existing fields
  organizationId String        // NEW — tenant scope
  organization   Organization  @relation(fields: [organizationId], references: [id])
  // siteId removed — site assignment becomes many-to-many or site-scoped instead
  permissions    String[]      @default([])  // NEW — granular feature permissions
}

// ─── UPDATED: Site (adds organizationId) ───
model Site {
  // ... existing fields
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
}

// Similarly for: Camera, Door, Zone, Incident, Alert, AuditLog, Visitor, Visit, VehicleList
// Each gains: organizationId String + @relation
```

---

## Caddy Routing — v2.0

```
# app.domain.com → Dashboard (authenticated)
# domain.com → Marketing site (public)
# /api/* → API
# /ws/* → API WebSocket

app.example.com {
    handle {
        reverse_proxy dashboard:3100
    }
}

example.com {
    handle /api/* {
        reverse_proxy api:4000
    }
    handle /ws/* {
        reverse_proxy api:4000
    }
    handle {
        reverse_proxy marketing:3200
    }
}
```

For development (no subdomain), the marketing site is on port 3200 and Dashboard on 3100 — accessed directly.

---

## Build Order & Phase Dependencies

The commercial SaaS architecture layers must be built in a specific order due to hard dependencies:

```
Phase A: Multi-Tenant Foundation
├── Organization model + migration
├── TenantContextMiddleware (replaces SiteContextMiddleware)
├── Prisma Client tenant extension
├── PostgreSQL RLS policies
└── TenantService (request-scoped org context)
    │
    │  Required by everything below
    ▼
Phase B: Tenant-Aware Auth & RBAC
├── Extended JWT payload (organizationId, permissions)
├── OrganizationGuard (resource ownership)
├── Updated RolesGuard (org-scoped role hierarchy)
├── SUPER_ADMIN role + cross-tenant management
└── Permission-based feature gating
    │
    ├──────────────────────┬──────────────────────────┐
    ▼                      ▼                          ▼
Phase C:                            Phase D:
Billing & Subscriptions             Design System
├── Stripe SDK integration          ├── Design tokens (colors, typography, spacing)
├── Checkout + Portal sessions      ├── Expanded @repo/ui components
├── Webhook endpoint + processor    ├── Tailwind preset
├── Plan → feature limits mapping   └── Mobile theme integration
├── Invoice history
└── Billing status management               │
    │                                       │
    ▼                                       ▼
Phase E:                            Phase G:
License Provisioning                Public Marketing Site
├── License key JWT generation      ├── apps/marketing/ Next.js app
├── Activation flow                 ├── SSG/ISR pages (Home, Features, Pricing, Blog)
├── Domain binding                  ├── Stripe Checkout integration (Pricing → subscribe)
├── Expiry monitoring + warnings    ├── SEO metadata, OG images, sitemap
└── Licensed feature enforcement    └── Caddy routing config
    │
    ▼
Phase F: API Versioning
├── enableVersioning(URI)
├── VERSION_NEUTRAL for internal endpoints
├── v1 public controllers
└── Swagger per version
```

**Phase ordering rationale:**
- **A → B:** Tenant-aware RBAC requires the Organization model from Phase A. The JWT must carry `organizationId`, which requires an Organization to reference.
- **B → C:** Billing links Stripe customers to Organizations. Checkout/Portal sessions require authenticated users with organization context.
- **B → E:** License activation binds to an Organization. Validation requires organization context.
- **D parallel:** Design System has no backend dependencies — can be built in parallel with A/B/C.
- **G depends on D only:** Marketing site needs design system but does NOT depend on API changes. Can proceed once design tokens are defined.
- **F depends on B:** API versioning needs the auth stack to be stable (versioned controllers use the same guards).

---

## Integration Points with Existing Modules

| Existing Module | v2.0 Integration Required | Effort |
|----------------|--------------------------|--------|
| **Auth Module** | JWT payload extended with `organizationId` + `permissions[]`. `createTokens()` updated. Register/login flow associates user with organization. | Medium |
| **Site Module** | `Site` gains `organizationId`. All site queries auto-filtered by Prisma extension. `createSite()` validates against organization's `maxSites` limit. | Low |
| **User Module** | `User` gains `organizationId`. `siteId` removed (user→site becomes many-to-many or site-level role). User CRUD scoped to org. | Medium |
| **Camera/Door/Zone** | Each gains `organizationId`. `create` operations validate against `maxCameras`/`maxDoors`/`maxZones` limits. No query changes needed (Prisma extension handles filtering). | Low |
| **Incident/Alert** | Gains `organizationId`. Incident listing auto-scoped to org. No business logic changes. | Low |
| **Audit Log** | Gains `organizationId`. Audit queries scoped to org. Hash chain verification scoped to org. | Low |
| **Audit Interceptor** | Updated to capture `organizationId` from `TenantService`. | Low |
| **Notification Module** | Email sending scoped to org (from address, branding). Template system gains org-specific overrides. | Low |
| **Dashboard** | Auth context updated to handle `organizationId`. API client passes org context. Navigation gains org-scoped views. UI redesign uses `@repo/ui`. | High |
| **Mobile** | Auth context updated. UI redesign uses `@repo/ui/tokens`. Guard/operator workflows scoped to org. | High |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Application-Layer-Only Tenant Isolation

**What:** Relying solely on Prisma extensions or service-layer WHERE clauses for tenant isolation without database-level enforcement.
**Why bad:** A raw `$queryRaw` call, a misconfigured service, or a new developer who forgets the tenant filter creates a data leak that's invisible in code review. One `SELECT * FROM cameras` without WHERE exposes all tenants' data.
**Do this instead:** PostgreSQL Row-Level Security (RLS) as defense-in-depth. Even if the application forgets the filter, PostgreSQL denies access. The `TenantContextMiddleware` sets `app.current_organization_id` and RLS policies check against it.

### Anti-Pattern 2: Monolithic Stripe Webhook Handler

**What:** Processing all webhook logic synchronously in the controller — updating database, sending emails, refreshing caches — before returning 200 to Stripe.
**Why bad:** Stripe webhooks have a 20-second timeout. If your handler takes >20 seconds (e.g., sending bulk notification emails), Stripe marks the delivery as failed and retries, potentially processing the same event multiple times. The webhook endpoint becomes a bottleneck during high-volume billing events.
**Do this instead:** Acknowledge immediately (return 200), enqueue to BullMQ, process asynchronously. Stripe best practice: "return a 2xx status code quickly."

### Anti-Pattern 3: Separate Database per Tenant

**What:** Creating a separate PostgreSQL database (or schema) for each organization.
**Why bad:** Prisma manages a single `datasource`. Schema-per-tenant requires connection pool per tenant, migration management across hundreds of databases, and cross-tenant queries become impossible. For self-hosted deployments, managing N databases is an operational nightmare.
**Do this instead:** Shared database, shared schema, discriminator column (`organizationId`) with RLS policies. This is the standard SaaS pattern at scales up to millions of tenants.

### Anti-Pattern 4: Copy-Paste Design Between Dashboard and Marketing

**What:** Building the marketing site with independent styles, colors, and components rather than consuming the shared design system.
**Why bad:** Brand inconsistency. Dashboard looks different from marketing site. Color change requires updating two codebases. Marketing site "drifts" from the product.
**Do this instead:** Both consume `@repo/ui`. The Tailwind preset is imported by both `tailwind.config.ts` files. Component variants are shared. Marketing-specific components extend base components.

### Anti-Pattern 5: JWT with All Permissions Inlined

**What:** Putting every possible permission as a claim in the JWT, producing a token >1KB.
**Why bad:** JWT is sent on every request. Large tokens increase bandwidth, request latency, and header size (some proxies limit at 8KB). Permission changes require immediate token refresh.
**Do this instead:** JWT carries `role` + `organizationId` + a compact `permissions` array of high-level scopes (e.g., `["cameras:write"]`). Detailed feature flags derived from `Organization.plan` are checked at the service layer (cached in Redis with short TTL).

---

## Scalability Considerations

| Concern | At 10 orgs / 100 users | At 1K orgs / 10K users | At 10K orgs / 100K users |
|---------|------------------------|------------------------|---------------------------|
| **Tenant isolation** | Discriminator column + RLS — fine on single PG instance | Same — indexes on `organizationId` keep queries fast | Add `organizationId` to composite indexes. Consider read replicas for Dashboard queries |
| **Stripe webhooks** | Single queue, single worker — handles all volume | Single queue, 2-3 workers for parallel processing | Dedicated webhook queue. Rate limit: Stripe sends max ~100 events/sec per account |
| **JWT size** | ~200 bytes — negligible | ~250 bytes (permissions array grows) — still negligible | Cap permissions to 20 entries max. Use bitmask encoding if needed |
| **Prisma extension overhead** | Negligible — <1ms per query | <3ms per query — acceptable | If problematic: cache tenant-extended clients by orgId (LRU cache of PrismaClient instances) |
| **RLS policy evaluation** | Sub-millisecond — index scan | Same — `organizationId` is indexed on every table | Same — PostgreSQL RLS is designed for this scale |
| **Marketing site** | SSG at build time — serves instantly | Same — ISR for blog pages (revalidate every hour) | Add CDN (Cloudflare) in front of Caddy for static asset caching |

At the target scale for this platform (hundreds of organizations, thousands of users), single-node PostgreSQL with RLS handles comfortably. The main scaling consideration is **not** database capacity but Stripe webhook volume and JWT management.

---

## Sources

### HIGH Confidence
- [Prisma Client Extensions — query component](https://www.prisma.io/docs/orm/prisma-client/client-extensions/query) — official docs: `$allModels.$allOperations` pattern for multi-tenant filtering
- [Prisma Client Extensions — Row-Level Security example](https://github.com/prisma/web/blob/main/apps/blog/content/blog/client-extensions-preview-8t3w27xkrxxn/index.mdx) — official Prisma blog: RLS integration pattern with Prisma extensions
- [NestJS Versioning](https://docs.nestjs.com/techniques/versioning) (Context7: /websites/nestjs) — official docs: `VersioningType.URI`, `VERSION_NEUTRAL`, controller version decorator
- [Stripe Webhooks — signature verification](https://docs.stripe.com/webhooks) (Context7: /websites/stripe) — official docs: `stripe.webhooks.constructEvent()`, raw body requirement
- [Stripe Billing Portal](https://docs.stripe.com/customer-management) — official docs: `billingPortal.sessions.create()` for subscription management UI
- [Stripe Checkout](https://docs.stripe.com/payments/checkout) — official docs: `checkout.sessions.create()` for new subscriptions
- PostgreSQL RLS documentation (official PostgreSQL docs) — `CREATE POLICY`, `app.current_organization_id` session variable pattern
- Existing codebase analysis: Prisma schema (546 lines), 29 NestJS modules, JWT strategy, SiteContextMiddleware, RolesGuard, Caddy routing

### MEDIUM Confidence
- Prisma Client Extension performance overhead (~1-5% per query) — estimated from community discussions; actual overhead depends on query complexity
- RLS policy evaluation overhead on indexed columns — PostgreSQL official benchmarks show negligible overhead on indexed columns
- Stripe webhook delivery latency (~300ms typical) — from Stripe documentation and community experience

### LOW Confidence
- None — all major architectural decisions backed by official documentation or verified against existing codebase.

---

*Architecture research for: Oversight Hub v2.0 Commercial Platform — multi-tenant, billing, licensing, design system*
*Researched: 2026-07-15*
*Ready for roadmap: yes*
