# Phase 4: Commercial Foundation — Research

**Researched:** 2026-07-15
**Domain:** Multi-tenant SaaS architecture, PostgreSQL row-level security, Prisma Client Extensions, hash-chain audit logs
**Confidence:** HIGH

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Organization replaces Site — `siteId` → `organizationId` everywhere. No nested hierarchy.
- **D-02:** Organization model inherits Site's fields (name, address, city, country, lat/lng, isActive) plus billing metadata (stripeCustomerId, billingEmail, planTier). Billing fields forward-looking for Phase 5.
- **D-03:** Migration: single Prisma migration renames `siteId` → `organizationId` across all 29+ tables. Clean break — no backward compat layer.
- **D-04:** No Location/Site sub-model. Cameras, doors, zones reference `organizationId` directly.
- **D-05:** New `OrganizationMember` join table (userId, organizationId, role, isActive). Role is always per-organization. User has no global role.
- **D-06:** JWT payload: `{ sub, email, orgId, role }`. Permissions resolved server-side from OrganizationMember + role hierarchy — not baked into the token.
- **D-07:** Organization switching: `POST /api/auth/switch-org` validates membership, re-issues access+refresh tokens with the new `orgId`+`role`.
- **D-08:** Registration creates organization automatically in one transaction.
- **D-09:** Two-layer isolation: Prisma Client Extension auto-adds `WHERE organizationId = $currentOrg` (primary) + PostgreSQL RLS policies (defense-in-depth).
- **D-10:** `TenantContextMiddleware` extends existing `SiteContextMiddleware` pattern. BullMQ workers read `orgId` from job data.
- **D-11:** Per-tenant audit hash chain: SHA256(previousHash + JSON.stringify(event)). Each org gets its own chain.
- **D-12:** JWT-signed invite token with 48h expiry via email (Resend SDK). Single-use.
- **D-13:** Existing users auto-added on invite accept — creates OrganizationMember row. No re-registration.
- **D-14:** Invite CRUD at `/api/organizations/:orgId/invites`.
- **D-15:** Invite carries role assignment at creation time.

### Agent Discretion
- Feature gate infrastructure (FND-07): implementation approach at agent discretion — recommended DB feature flags table + Redis cache (detailed in Architecture Patterns).
- Prisma Client Extension pattern: recommended `$allModels.$allOperations` with `AsyncLocalStorage` for request-scoped `orgId`.
- Frontend organization switcher UI: placement, design, and behavior on Dashboard and Mobile left to planner.

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within Phase 4 scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | Platform supports multi-tenant architecture with Organization model and PostgreSQL RLS | Architecture Patterns 1-3: Prisma extension + RLS policy design + TenantContextMiddleware |
| FND-02 | All existing modules auto-scope queries to current tenant via Prisma Client Extensions | Architecture Pattern 1: `$allModels.$allOperations` extension with SCOPED_MODELS set |
| FND-03 | User can belong to multiple organizations with different roles in each | Architecture Pattern 4: OrganizationMember join table with @@unique([userId, organizationId]) |
| FND-04 | JWT token carries organizationId + permissions[] for tenant-scoped authorization | Architecture Pattern 5: JWT payload extension + server-side permission resolution |
| FND-05 | Admin can invite users to their organization via email with expiring tokens | Architecture Pattern 7: JWT invite tokens + Resend SDK + acceptInvite flow |
| FND-06 | Audit logs are hash-chained per tenant with cryptographic integrity verification | Architecture Pattern 6: SHA256 hash chain per-org, genesis block, verifyOrganizationChain() |
| FND-07 | Feature gates control feature availability per license tier | Architecture Pattern 8: FeatureFlag DB table + FeatureGateGuard + Redis cache |

## Summary

Phase 4 transforms Oversight Hub from a single-organization prototype into a secure, isolated multi-tenant SaaS platform. Every existing model (29+ tables) and every API endpoint must be scoped to an organization. The approach is defense-in-depth: a Prisma Client Extension auto-injects `WHERE organizationId = $currentOrg` on every query (primary), backed by PostgreSQL RLS policies that enforce isolation even against raw SQL (secondary). The User model loses its global `role` — role becomes per-organization via an `OrganizationMember` join table. JWT tokens carry `{ sub, email, orgId, role }` where `role` is the per-org role, resolved server-side from the join table. Organization switching re-issues tokens via `POST /api/auth/switch-org`. Per-tenant audit logs use SHA256 hash chains for cryptographic integrity that can be independently verified per organization.

**Primary recommendation:** Use `$allModels.$allOperations` Prisma Client Extension in `PrismaService.onModuleInit()` to auto-scope ALL queries. Apply PostgreSQL RLS policies in a post-migration raw SQL script. Reuse the existing `SiteContextMiddleware` pattern for `TenantContextMiddleware`. The existing RBAC system needs minimal change — swap `user.role` lookups for `OrganizationMember` lookups scoped to `request.orgId`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tenant data isolation (query-level) | API (NestJS) | Database (PostgreSQL RLS) | Prisma extension is primary enforcement; RLS is defense-in-depth for raw SQL |
| Tenant context extraction | API (Middleware) | — | `TenantContextMiddleware` reads `orgId` from JWT, sets PostgreSQL session var |
| Organization CRUD | API (OrganizationModule) | Database | Standard NestJS module pattern; Organization table owns billing metadata |
| User-to-org membership | Database (OrganizationMember) | API (AuthModule) | Join table is source of truth; API resolves role at request time |
| JWT token issuance | API (AuthService) | — | Token carries orgId + role; switch-org re-issues |
| Audit hash-chain integrity | Database (triggers) | API (AuditService) | pgcrypto trigger computes hash on INSERT; verifyChain() walks forward |
| Feature gate enforcement | API (Guard/Decorator) | Database (FeatureFlag table) | Resolved at request time; cached in Redis for performance |
| Email invite delivery | API (Resend SDK) | — | Already integrated; reuse in InviteService |
| Organization switching (UI) | Frontend (Dashboard) | Frontend (Mobile) | Token re-issue, React Context update, page redirect |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@prisma/client` | 5.22.0 | ORM + Client Extensions for tenant isolation | Already in stack; `$allModels.$allOperations` is the official Prisma pattern for RLS |
| `@nestjs/jwt` | 10.2.0 | JWT signing/verification for access + invite tokens | Already in stack; extended payload for `orgId` |
| `passport-jwt` | 4.0.1 | JWT auth strategy | Already in stack; `JwtStrategy.validate()` extended |
| `resend` | 6.12.3 | Email delivery for invite tokens | Already integrated in `NotificationsService` |
| `bcryptjs` | 2.4.3 | Password hashing | Already in stack; invitee sets password on accept |
| `uuid` | 10.0.0 | UUID generation for Org, Member, Invite IDs | Already in stack |
| Node.js `crypto` | built-in | SHA256 for audit hash chain | No external dependency needed; FIPS-compliant |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `bullmq` | 5.30.0 | Async job processing | Audit write queue (existing); invite email dispatch |
| `ioredis` | 5.4.1 | Redis client | Feature flag caching; org context caching |
| `zod` | 3.23.8 | Schema validation | Shared invite/organization schemas in `@repo/shared` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prisma Client Extension | `prisma-extension-tentant` community package | Community package adds dependency risk; native `$extends` is simpler and version-locked to Prisma |
| PostgreSQL RLS only (no Prisma extension) | — | RLS only catches raw SQL but Prisma queries would need manual `where: { organizationId }` on every call — error-prone at 52+ files |
| Large JWT with permissions[] | Small JWT + server-side resolution | D-06 chose small token; permissions resolved from `OrganizationMember` + `ROLE_HIERARCHY` at request time — avoids token bloat |

**Installation:**
No new packages required. All capabilities use already-integrated dependencies plus Node.js built-in `crypto`.

**Version verification:** All packages verified via npm registry and confirmed present in `apps/api/package.json` and `pnpm-lock.yaml`. Node.js `crypto` module is built-in, no version concern.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| @prisma/client | npm | ~6 yrs | 5M+/wk | github.com/prisma/prisma | [OK] | Approved |
| @nestjs/jwt | npm | ~6 yrs | 1.5M+/wk | github.com/nestjs/jwt | [OK] | Approved |
| passport-jwt | npm | ~10 yrs | 800K+/wk | github.com/mikenicholson/passport-jwt | [OK] | Approved |
| resend | npm | ~3 yrs | 500K+/wk | github.com/resend/resend-node | [OK] | Approved |
| bcryptjs | npm | ~8 yrs | 3M+/wk | github.com/dcodeIO/bcrypt.js | [OK] | Approved |
| bullmq | npm | ~5 yrs | 400K+/wk | github.com/taskforcesh/bullmq | [OK] | Approved |
| uuid | npm | ~10 yrs | 80M+/wk | github.com/uuidjs/uuid | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*Note: This phase introduces no new npm packages. All capabilities use already-integrated dependencies.*

## Architecture Patterns

### System Architecture Diagram

```
                     ┌─────────────────────────────────────┐
                     │         Caddy Reverse Proxy          │
                     │      /api/* → api:4000               │
                     └──────────────┬──────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────────┐
         │                          ▼                              │
         │   ┌──────────────────────────────────────────────┐      │
         │   │            HTTP Request Lifecycle             │      │
         │   │                                              │      │
         │   │  1. Caddy → Fastify                          │      │
         │   │  2. JwtAuthGuard → validates JWT             │      │
         │   │     JwtStrategy.validate() returns            │      │
         │   │     { id, email, orgId, role }               │      │
         │   │  3. TenantContextMiddleware                  │      │
         │   │     → SET app.current_organization_id        │      │
         │   │  4. RolesGuard → checks per-org role         │      │
         │   │     OrganizationMember table                 │      │
         │   │  5. Controller → Service                     │      │
         │   │  6. Service → Prisma Client Extension        │      │
         │   │     → auto-injects WHERE organizationId       │      │
         │   │  7. PostgreSQL RLS (defense-in-depth)        │      │
         │   │     USING (organization_id =                  │      │
         │   │       current_setting('app.current_          │      │
         │   │       organization_id', true)::uuid)          │      │
         │   └──────────────────────────────────────────────┘      │
         │                                                         │
         │   ┌──────────────────┐    ┌──────────────────────┐      │
         │   │  BullMQ Workers   │    │   Socket.IO Gateway   │      │
         │   │  Read orgId from  │    │   Extract orgId from  │      │
         │   │  job data, set    │    │   JWT on connection,  │      │
         │   │  session var      │    │   scope events to     │      │
         │   │  before queries   │    │   organization room   │      │
         │   └──────────────────┘    └──────────────────────┘      │
         │                                                         │
         └─────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────┐
                    │        PostgreSQL            │
                    │                              │
                    │  Organization table          │
                    │  OrganizationMember (NEW)    │
                    │  Invite (NEW)                │
                    │  FeatureFlag (NEW)           │
                    │  AuditLog (+hash columns)    │
                    │  All 29+ existing models     │
                    │  RLS policies on scoped      │
                    │  tables                      │
                    └─────────────────────────────┘

    ┌──────────────────┐        ┌─────────────────────┐
    │   Organization   │        │   OrganizationMember │
    │   (was Site)     │◄───────│   (userId, orgId,    │
    │   + billing meta │        │    role, isActive)   │
    └──────────────────┘        └──────────┬──────────┘
                                           │
                                    ┌──────▼─────┐
                                    │    User     │
                                    │  (no global │
                                    │   role)     │
                                    └────────────┘

    ┌──────────────────┐        ┌─────────────────────┐
    │     Invite       │        │     FeatureFlag      │
    │  (orgId, email,  │        │  (orgId, key,        │
    │   role, token,   │        │   enabled, tier)     │
    │   expiresAt)     │        │                      │
    └──────────────────┘        └─────────────────────┘
```

### Recommended Project Structure (New/Modified Files)

```
apps/api/src/
├── common/
│   ├── middleware/
│   │   └── tenant-context.middleware.ts    # NEW — extends SiteContextMiddleware pattern
│   ├── decorators/
│   │   ├── current-org.decorator.ts        # NEW — @CurrentOrg() param decorator
│   │   ├── roles.decorator.ts              # MODIFIED — unchanged, still uses @Roles()
│   │   └── feature-gate.decorator.ts       # NEW — @RequiresFeature('advanced_analytics')
│   └── guards/
│       ├── roles.guard.ts                  # MODIFIED — reads role from OrganizationMember
│       ├── tenant-isolation.guard.ts       # NEW — validates orgId in JWT matches request
│       └── feature-gate.guard.ts           # NEW — checks FeatureFlag table
├── modules/
│   ├── prisma/
│   │   ├── prisma.service.ts               # MODIFIED — attach $extends in onModuleInit
│   │   └── tenant-extension.ts             # NEW — Prisma Client Extension definition
│   ├── organization/
│   │   ├── organization.module.ts          # NEW
│   │   ├── organization.controller.ts      # NEW — CRUD for orgs
│   │   ├── organization.service.ts         # NEW
│   │   └── invite/
│   │       ├── invite.service.ts           # NEW — JWT invite token + Resend email
│   │       └── invite.controller.ts        # NEW — /api/organizations/:orgId/invites
│   └── auth/
│       ├── auth.service.ts                 # MODIFIED — registration creates org; login sets org context
│       ├── auth.controller.ts              # MODIFIED — add switch-org endpoint
│       └── strategies/
│           └── jwt.strategy.ts             # MODIFIED — validate() returns orgId
├── app.module.ts                           # MODIFIED — TenantContextMiddleware registration
└── main.ts                                 # MODIFIED — possibly

packages/shared/src/
├── schemas/
│   ├── organization.schema.ts              # NEW — Zod schemas for org CRUD
│   └── invite.schema.ts                    # NEW — Zod schemas for invite
└── constants/
    └── roles.ts                            # UNCHANGED — role hierarchy stays same

apps/dashboard/
├── lib/
│   ├── api.ts                              # MODIFIED — org switching, org header
│   └── auth-client.ts                      # MODIFIED — handle switch-org token re-issue
└── components/
    └── org-switcher.tsx                    # NEW — organization switcher component

apps/mobile/
├── lib/
│   └── api.ts                              # MODIFIED — org switching
└── components/
    └── org-switcher.tsx                    # NEW — organization switcher component
```

### Pattern 1: Prisma Client Extension for Tenant Isolation

**What:** Wrap every Prisma query to auto-inject `organizationId` WHERE clause and auto-set `organizationId` on create.

**Source:** [VERIFIED: Prisma official docs — query extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions/query)

**Design:** The extension is defined in `tenant-extension.ts` and attached in `PrismaService.onModuleInit()`. It intercepts `$allModels.$allOperations` and uses `model` name to determine if the model has an `organizationId` field. For models without `organizationId` (e.g., `RefreshToken`, `NotificationSetting`), the extension is a no-op.

```typescript
// Source: Prisma docs — $allModels.$allOperations pattern
// apps/api/src/modules/prisma/tenant-extension.ts

import { Prisma } from "@prisma/client";

/**
 * Models that are scoped to an organization.
 * All other models lack `organizationId` and are isolated via parent relationships.
 */
const SCOPED_MODELS = new Set([
  "Organization",
  "Camera",
  "Door",
  "Zone",
  "Incident",
  "VehicleList",
  "User",
  "AuditLog",
  "OrganizationMember",
  "Invite",
  "FeatureFlag",
  "Credential",
  "Alert",
  "CameraPrompt",
]);

/**
 * Operations that query existing data — need WHERE organizationId injected.
 */
const READ_OPS = new Set([
  "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow",
  "findMany", "count", "aggregate", "groupBy",
  "updateMany", "deleteMany",
]);

/**
 * Operations that create data — need organizationId auto-set.
 */
const WRITE_OPS = new Set(["create", "createMany", "upsert"]);

export function tenantIsolationExtension(currentOrgId: string) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: "tenant-isolation",
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            // Only scope models that have an organizationId field
            if (model && SCOPED_MODELS.has(model)) {
              // Read/delete operations: add WHERE organizationId
              if (READ_OPS.has(operation)) {
                (args as any).where = {
                  ...((args as any).where ?? {}),
                  organizationId: currentOrgId,
                };
              }
              // Create operations: auto-set organizationId
              if (operation === "create" || operation === "createMany") {
                (args as any).data = {
                  ...((args as any).data ?? {}),
                  organizationId: currentOrgId,
                };
              }
              // Upsert: set on both create and update
              if (operation === "upsert") {
                (args as any).create = {
                  ...((args as any).create ?? {}),
                  organizationId: currentOrgId,
                };
                (args as any).where = {
                  ...((args as any).where ?? {}),
                  organizationId: currentOrgId,
                };
              }
            }

            // Raw queries bypass extensions — RLS handles those
            return query(args);
          },
        },
      },
    })
  );
}
```

**Key considerations:**
- The extension receives `currentOrgId` at construction time. Each request gets its own extended client instance (or a shared instance with per-request scoping via `AsyncLocalStorage`).
- **CRITICAL:** `$queryRawUnsafe` and `$executeRawUnsafe` DO NOT go through the `$allModels.$allOperations` hook (they are top-level operations, `model` is `undefined`). These must be handled separately via RLS or by setting the PostgreSQL session variable.
- `aggregate`, `groupBy` are included in READ_OPS per Prisma docs.
- `include` and `select` cannot be mutated in extensions (type safety constraint).

**Alternative implementation — per-request extended client:**
Since the NestJS `PrismaService` is a `@Global()` singleton, the extension can use `AsyncLocalStorage` to read the current `orgId` from the request context. This avoids creating a new PrismaClient per request.

```typescript
// Alternative: AsyncLocalStorage pattern
import { AsyncLocalStorage } from "node:async_hooks";

export const orgContext = new AsyncLocalStorage<string>();

export const tenantExtension = Prisma.defineExtension((client) =>
  client.$extends({
    name: "tenant-isolation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const orgId = orgContext.getStore();
          if (!orgId || !model || !SCOPED_MODELS.has(model)) {
            return query(args);
          }
          // ... same injection logic using orgId
          return query(args);
        },
      },
    },
  })
);
```

Then in `TenantContextMiddleware`:
```typescript
orgContext.run(user.orgId, () => next());
```

### Pattern 2: Tenant Context Middleware (extends SiteContextMiddleware)

**What:** Extract `orgId` from JWT, set PostgreSQL session variable for RLS, run Prisma extension within org context.

**Source:** [VERIFIED: Existing `SiteContextMiddleware` at `apps/api/src/common/middleware/site-context.middleware.ts`]

```typescript
// apps/api/src/common/middleware/tenant-context.middleware.ts

import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { orgContext } from "../../modules/prisma/tenant-extension";

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(private prisma: PrismaService) {}

  async use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
    const user = (req as any).user;
    if (user?.orgId) {
      // Set PostgreSQL session variable for RLS policies
      try {
        await this.prisma.$executeRawUnsafe(
          `SELECT set_config('app.current_organization_id', $1, TRUE)`,
          user.orgId,
        );
      } catch (err: any) {
        this.logger.warn("Failed to set RLS context", err.message);
      }
      
      // Run rest of request within AsyncLocalStorage context
      orgContext.run(user.orgId, () => next());
    } else {
      // No org context — query extension will be no-op, RLS will deny
      next();
    }
  }
}
```

### Pattern 3: PostgreSQL RLS Policies (Defense-in-Depth)

**What:** PostgreSQL RLS policies enforce `organizationId` isolation at the database level, protecting against raw SQL escaping the Prisma extension.

**Source:** [VERIFIED: PostgreSQL official docs — Row Security Policies](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)

```sql
-- Migration: enable RLS on all scoped tables
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Camera" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Door" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Zone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Incident" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VehicleList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeatureFlag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Credential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CameraPrompt" ENABLE ROW LEVEL SECURITY;

-- Create permissive policy on each scoped table
-- Reads the session variable set by TenantContextMiddleware
CREATE POLICY tenant_isolation ON "Camera"
  FOR ALL
  USING ("organizationId" = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true)::uuid);

-- Repeat for all scoped tables
-- For tables without organizationId, RLS is NOT enabled
-- (they are isolated through parent models at the application level)

-- Allow table owners and BYPASSRLS roles to bypass RLS
-- This is the PostgreSQL default behavior — no additional config needed
```

**Key considerations:**
- `current_setting('app.current_organization_id', true)` returns `NULL` if not set, and RLS policies evaluate to `NULL` (not `TRUE`), resulting in no rows returned — safe default.
- `BYPASSRLS` attribute is NOT granted to any application role — only superusers and table owners bypass. This ensures even DBAs see only their org's data unless they explicitly `SET app.current_organization_id`.
- **Performance:** RLS adds a WHERE clause that PostgreSQL optimizes like any other. For indexed `organizationId` columns, overhead is negligible (< 1ms per query).
- **Raw SQL escapes:** `$queryRawUnsafe` calls (heavily used in audit and analytics modules) bypass the Prisma extension but are caught by RLS. The session variable MUST be set before any raw query in the request lifecycle.

### Pattern 4: OrganizationMember Join Table

**What:** `User` loses global `role`. Role is per-organization. A user can belong to N organizations with different roles in each.

```prisma
model Organization {
  id              String   @id @default(uuid())
  name            String
  address         String?
  city            String?
  country         String   @default("SN")
  latitude        Float?
  longitude       Float?
  isActive        Boolean  @default(true)
  // Billing metadata (forward-looking for Phase 5)
  stripeCustomerId String?
  billingEmail     String?
  planTier         String?  // 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE'
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  cameras           Camera[]
  doors             Door[]
  zones             Zone[]
  incidents         Incident[]
  members           OrganizationMember[]
  invites           Invite[]
  auditLogs         AuditLog[]
  vehicleListEntries VehicleList[]
}

model OrganizationMember {
  id             String       @id @default(uuid())
  userId         String
  organizationId String
  role           Role         // Per-organization role (ADMIN, SUPERVISOR, OPERATOR, VIEWER)
  isActive       Boolean      @default(true)
  joinedAt       DateTime     @default(now())
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
  @@index([organizationId])
  @@index([userId])
}

model User {
  // ... existing fields EXCEPT:
  // role   Role — REMOVED (no global role)
  // siteId String? — REMOVED (becomes OrganizationMember)
  
  memberships      OrganizationMember[]
  // ... rest of existing relations
}
```

**Migration strategy for existing users:**
1. Rename `Site` → `Organization`; rename `siteId` → `organizationId` on all tables.
2. Create `OrganizationMember` rows for all existing `User` records: one row per user → organization, carrying the user's previous `role`.
3. Drop `User.role` and `User.siteId` columns.

**Indexing strategy:**
- `@@unique([userId, organizationId])` — enforces one membership per org per user; supports lookup for switch-org and role resolution.
- `@@index([organizationId])` — supports "list all members of an org."
- `@@index([userId])` — supports "list all orgs a user belongs to" (org switcher).

### Pattern 5: JWT Payload Extension and Switch-Org Flow

**What:** JWT carries `{ sub, email, orgId, role }`. The `orgId` and `role` are the CURRENT organization and the user's role within it. Switching organizations re-issues tokens.

**Source:** [VERIFIED: Existing `JwtStrategy` at `apps/api/src/modules/auth/strategies/jwt.strategy.ts`]

```typescript
// Modified JwtStrategy.validate()
async validate(payload: {
  sub: string;
  email: string;
  orgId: string;
  role: string;
}) {
  // Verify membership is still active
  const membership = await this.prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: payload.sub,
        organizationId: payload.orgId,
      },
    },
    select: { isActive: true, role: true },
  });

  if (!membership || !membership.isActive) {
    throw new UnauthorizedException("Organization membership inactive");
  }

  return {
    id: payload.sub,
    email: payload.email,
    orgId: payload.orgId,
    role: membership.role, // Server-side verified (not just JWT claim)
  };
}
```

**Token issuance (modified `createTokens`):**
```typescript
private async createTokens(
  userId: string,
  email: string,
  orgId: string,
  role: Role,
) {
  const accessToken = this.jwt.sign(
    { sub: userId, email, orgId, role },
    { secret: accessSecret, expiresIn: "15m" }
  );
  // refresh token unchanged
}
```

**Organization switch:**
```typescript
// POST /api/auth/switch-org
async switchOrg(userId: string, targetOrgId: string) {
  const membership = await this.prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: targetOrgId,
      },
    },
    select: { isActive: true, role: true },
  });

  if (!membership || !membership.isActive) {
    throw new ForbiddenException("Not a member of this organization");
  }

  // Re-issue tokens with new org context
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  return this.createTokens(userId, user!.email, targetOrgId, membership.role);
}
```

### Pattern 6: Hash-Chain Audit Logs (Per-Organization)

**What:** Each organization gets its own SHA256 hash chain. The chain walks forward from a genesis block (first audit entry for that org). Each entry's hash = SHA256(previousEntry.hash + JSON.stringify(event)).

**Source:** [VERIFIED: Existing `AuditService.verifyChain()` at `apps/api/src/modules/audit/audit.service.ts` already implements entity-level hash chain]

**Design:** Extend the existing entity-level verifyChain to organization-level:

1. **Add columns to AuditLog model:**
```prisma
model AuditLog {
  // ... existing fields
  organizationId String?       // NEW — tenant scope
  previousHash   String?       // NEW — SHA256 of previous entry
  currentHash    String        // NEW — SHA256(previousHash + content)
  content        String        // NEW — pipe-delimited audit payload (already in hypertable)
}
```

2. **Hash computation (at write time, in audit.processor.ts):**
```typescript
// In AuditProcessor.writeAuditEntry()
import crypto from "crypto";

// Fetch the last audit entry for this organization
const lastEntry = await this.prisma.auditLog.findFirst({
  where: { organizationId },
  orderBy: { createdAt: "desc" },
  select: { currentHash: true },
});

const previousHash = lastEntry?.currentHash ?? "genesis";
const content = [entity, entityId, action, userId, changes, ipAddress, timestamp].join("|");
const currentHash = crypto
  .createHash("sha256")
  .update(previousHash + content)
  .digest("hex");

// Write to hypertable WITH hash columns
```

3. **Chain verification (per organization):**
```typescript
async verifyOrganizationChain(organizationId: string): Promise<ChainVerificationResult> {
  const entries = await this.prisma.$queryRawUnsafe(
    `SELECT "createdAt", "currentHash", "previousHash", "content"
     FROM "AuditLog"
     WHERE "organizationId" = $1::uuid
     ORDER BY "createdAt" ASC`,
    organizationId,
  ) as AuditEntry[];

  const tampered: number[] = [];
  for (let i = 0; i < entries.length; i++) {
    const expectedInput =
      (i === 0 ? "genesis" : entries[i - 1].currentHash) + entries[i].content;
    const expectedHash = crypto
      .createHash("sha256")
      .update(expectedInput)
      .digest("hex");

    if (entries[i].currentHash !== expectedHash) tampered.push(i);
    if (i > 0 && entries[i].previousHash !== entries[i - 1].currentHash) {
      if (!tampered.includes(i)) tampered.push(i);
    }
  }

  return {
    verified: tampered.length === 0,
    totalEntries: entries.length,
    tamperedIndices: tampered,
    genesisHash: entries[0]?.currentHash ?? null,
    latestHash: entries[entries.length - 1]?.currentHash ?? null,
  };
}
```

**Performance consideration:** For large audit logs (100K+ entries), verification is O(n) — walking the entire chain. For organizations with large logs, consider:
- Periodic snapshots: Store the hash at checkpoint positions (every 10K entries) and verify segments.
- Background verification: Schedule verification as a BullMQ job, not on-demand.
- The current `verifyChain` already works per-entity; per-organization is a superset.

### Pattern 7: Invite Token Flow

**What:** JWT-signed invite token with 48h expiry. The token carries `{ orgId, email, role, type: "invite" }`. Invitee clicks email link → sets password → becomes OrganizationMember.

**Source:** [VERIFIED: Resend SDK docs — `resend.emails.send()` API](https://resend.com/docs/send-with-nextjs)

```typescript
// InviteService
async createInvite(orgId: string, email: string, role: Role, createdBy: string) {
  const token = this.jwt.sign(
    { orgId, email, role, type: "invite" },
    { secret: this.config.get("JWT_INVITE_SECRET"), expiresIn: "48h" }
  );

  const invite = await this.prisma.invite.create({
    data: {
      organizationId: orgId,
      email,
      role,
      token,
      createdById: createdBy,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  // Send email via Resend (reuse existing Resend integration pattern)
  const inviteUrl = `${this.config.get("DASHBOARD_URL")}/invite/${token}`;
  await this.resend.emails.send({
    from: this.emailFrom,
    to: email,
    subject: `You've been invited to join ${org.name} on Oversight Hub`,
    html: this.buildInviteEmail(inviteUrl, org.name, role),
  });

  return { id: invite.id, expiresAt: invite.expiresAt };
}

async acceptInvite(token: string, password: string, firstName: string, lastName: string) {
  // Verify JWT
  let payload: { orgId: string; email: string; role: string };
  try {
    payload = this.jwt.verify(token, { secret: this.config.get("JWT_INVITE_SECRET") });
  } catch {
    throw new BadRequestException("Invalid or expired invite token");
  }

  // Check if token already used
  const existing = await this.prisma.invite.findFirst({
    where: { token, status: "ACCEPTED" },
  });
  if (existing) throw new ConflictException("Invite already accepted");

  // Find or create user
  let user = await this.prisma.user.findUnique({ where: { email: payload.email } });
  if (!user) {
    const hashedPassword = await bcrypt.hash(password, 10);
    user = await this.prisma.user.create({
      data: { email: payload.email, password: hashedPassword, firstName, lastName },
    });
  }

  // Create OrganizationMember
  await this.prisma.organizationMember.create({
    data: {
      userId: user.id,
      organizationId: payload.orgId,
      role: payload.role as Role,
    },
  });

  // Mark invite as accepted
  await this.prisma.invite.update({
    where: { token },
    data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedById: user.id },
  });

  // Issue tokens
  return this.authService.createTokens(user.id, user.email, payload.orgId, payload.role);
}
```

**New env var required:** `JWT_INVITE_SECRET` — separate secret for invite tokens (different from access/refresh secrets).

### Pattern 8: Feature Gate Infrastructure

**What:** Database-driven feature flag table checked at request time via a decorator + guard. Cached in Redis for performance.

**Agent Discretion Area (FND-07):** DB feature flags table with license tier mapping is recommended.

```prisma
model FeatureFlag {
  id             String   @id @default(uuid())
  organizationId String
  key            String   // e.g., "advanced_analytics", "export_csv", "api_access"
  enabled        Boolean  @default(false)
  tier           String?  // minimum tier required: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE'
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id])

  @@unique([organizationId, key])
  @@index([organizationId])
}
```

```typescript
// Decorator
export const FEATURE_KEY = "requiredFeature";
export const RequiresFeature = (feature: string) => SetMetadata(FEATURE_KEY, feature);

// Guard
@Injectable()
export class FeatureGateGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.get<string>(FEATURE_KEY, context.getHandler());
    if (!feature) return true;

    const request = context.switchToHttp().getRequest();
    const orgId = request.user?.orgId;
    if (!orgId) throw new ForbiddenException();

    // Redis cache: feature:{orgId}:{key}
    const cached = await this.redis.get(`feature:${orgId}:${feature}`);
    if (cached === "1") return true;
    if (cached === "0") throw new ForbiddenException("Feature not available");

    const flag = await this.prisma.featureFlag.findUnique({
      where: { organizationId_key: { organizationId: orgId, key: feature } },
    });

    const enabled = flag?.enabled ?? false;
    await this.redis.set(`feature:${orgId}:${feature}`, enabled ? "1" : "0", "EX", 300);

    if (!enabled) throw new ForbiddenException("Feature not available on your plan");
    return true;
  }
}
```

### Anti-Patterns to Avoid

- **Using a single global PrismaClient without tenant isolation:** Every service currently uses `this.prisma` directly. Without the extension, a developer forgetting to add `where: { organizationId }` creates a cross-tenant data leak. The extension makes it impossible to forget.
- **Putting `permissions[]` in the JWT:** D-06 chose server-side permission resolution. Permissions change when role changes; baking them into the token creates stale permission windows (up to 15 minutes). Small JWT + server-side lookup is safer.
- **Soft-delete with `isActive` without organizationId filter:** If a query filters only `isActive: true` but forgets `organizationId`, it returns active users across all orgs. The extension prevents this.
- **Setting RLS session var in controller instead of middleware:** Controllers can be bypassed (WebSocket, BullMQ, custom bootstrap). Middleware runs on every HTTP request. BullMQ workers still need explicit `SET app.current_organization_id` before queries.
- **Using `SELECT` without RLS policy check:** PostgreSQL RLS is disabled by default. Every scoped table MUST have `ENABLE ROW LEVEL SECURITY` and at least one policy. Without this, the table is wide open to any connection.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tenant query scoping | Manual `where: { organizationId }` in every service method | Prisma Client Extension `$allModels.$allOperations` | 52 files × N methods — impossible to audit; extension is automatic and auditable |
| Database-level isolation | Application-only enforcement | PostgreSQL RLS policies | Raw SQL in audit/analytics services bypasses Prisma extension; RLS catches everything |
| Audit hash chain | Custom chain implementation | SHA256 via Node.js `crypto` module | Already partially implemented in `audit.service.ts`; FIPS-compliant, no external dependency |
| Invite token signing | Custom token format with DB lookups | JWT with `JWT_INVITE_SECRET` | JWT is self-validating (expiry, tamper detection); existing `@nestjs/jwt` module |
| Email delivery | Custom SMTP client | Resend SDK (already integrated) | Already integrated in `NotificationsService`; handles deliverability, bounces, templates |
| Feature flag evaluation | Environment variables per org | DB `FeatureFlag` table + Redis cache | Per-organization flags; env vars don't scale to multi-tenant; Redis cache avoids DB hit per request |
| Organization context in workers | Passing orgId in every function signature | Job data `orgId` + `SET session var` before queries | Consistent with HTTP middleware pattern; RLS covers raw SQL in workers |

**Key insight:** This entire phase is about making the *absence* of a manual `where: { organizationId }` safe. The Prisma extension is the single point of enforcement — 52 files of existing service code continue to work unchanged after the migration.

## Runtime State Inventory

> Phase 4 is a rename/refactor phase — `siteId` → `organizationId` across 29+ models and 52 source files.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | PostgreSQL: Site table with existing rows; `siteId` FK values in Camera, Door, Zone, Incident, VehicleList, User tables. TimescaleDB: `audit_log` hypertable with `site_id` column. Redis: BullMQ job data may contain `siteId` in serialized payloads. | Data migration: rename Site→Organization table, rename `site_id`→`organization_id` column in all tables, recreate foreign keys. Redis: flush or accept transient queue data loss. |
| **Live service config** | None detected. No n8n workflows or external service configs reference `siteId` strings. | None — verified by codebase grep. |
| **OS-registered state** | Docker Compose: service names, container names — none reference `siteId`. Systemd/launchd: not used (Docker Compose managed). | None — verified. |
| **Secrets/env vars** | `.env.example`: No `siteId`-specific env vars. `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: unchanged. NEW env var needed: `JWT_INVITE_SECRET`. | Add `JWT_INVITE_SECRET` to `.env.example`. |
| **Build artifacts** | Prisma generated client (`node_modules/.prisma/client/`): type definitions reference `Site` model and `siteId` fields. Must regenerate after migration. | `pnpm prisma generate` after migration. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | API runtime | ✓ | v20+ | — |
| PostgreSQL | Database + RLS | ✓ | 16 | RLS feature available since 9.5 |
| Redis | BullMQ + cache | ✓ | 7 | — |
| Resend API | Invite emails | ✓ | SDK 6.12.3 | Dev: `onboarding@resend.dev` test address |
| Ollama | Not required for Phase 4 | — | — | — |
| Docker | Deployment | ✓ | — | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

## Validation Architecture

> `workflow.nyquist_validation` is `false` in `.planning/config.json` — this section is omitted per configuration.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | `@nestjs/jwt` + `passport-jwt` — existing stack extended with `orgId` claim |
| V3 Session Management | Yes | JWT stateless; refresh token rotation already implemented (token reuse detection) |
| V4 Access Control | Yes | `RolesGuard` adapted for OrganizationMember per-org role; `TenantIsolationGuard` for org-boundary enforcement |
| V5 Input Validation | Yes | `zod` schemas for organization, invite, switch-org DTOs; existing `ZodValidationPipe` pattern |
| V6 Cryptography | Yes | SHA256 for audit hash chains (Node.js `crypto` — FIPS 140-2 compliant); bcrypt for passwords; JWT HS256 for tokens |
| V7 Error Handling | Yes | Existing `AllExceptionsFilter` — tenant data must NOT leak in error messages |
| V8 Data Protection | Yes | RLS policies prevent cross-tenant data access at DB level; audit logs hash-chained per tenant |
| V10 Malicious Code | N/A | No user-uploaded code execution surface in this phase |

### Known Threat Patterns for Multi-Tenant NestJS

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data access via forgotten WHERE clause | Information Disclosure | Prisma Client Extension auto-injects `organizationId` on all queries |
| Raw SQL injection bypassing ORM isolation | Tampering / Info Disclosure | PostgreSQL RLS policies on all scoped tables; session variable set by middleware |
| JWT orgId spoofing (user crafts JWT with wrong orgId) | Elevation of Privilege | JWT signed with secret; `JwtStrategy.validate()` verifies OrganizationMember exists AND is active |
| Organization enumeration via API timing | Information Disclosure | Rate limiting already configured via `@fastify/rate-limit`; consistent error messages |
| Audit log tampering by org admin | Repudiation | SHA256 hash chain — any modification detectable by walking chain from genesis; per-org isolation prevents cross-org chain corruption |
| Invite token replay | Elevation of Privilege | Token marked `ACCEPTED` on first use; subsequent attempts rejected |
| Feature gate bypass via direct DB query | Elevation of Privilege | Guards check on every request; Redis cache may be stale at most 5 minutes — acceptable window |
| BullMQ job cross-org execution | Information Disclosure | Workers read `orgId` from job data; set RLS session var before DB queries |

## Common Pitfalls

### Pitfall 1: Prisma Extension Not Applied to Raw Queries
**What goes wrong:** `$queryRawUnsafe` and `$executeRawUnsafe` do NOT pass through `$allModels.$allOperations` (the `model` parameter is `undefined` for top-level raw queries). Services that use raw queries (audit, analytics, governance, AI) will leak data across tenants.
**Why it happens:** The extension `query.$allModels.$allOperations` only intercepts model-level operations. Raw queries are top-level.
**How to avoid:** 
1. RLS policies catch raw SQL at the database level (defense-in-depth).
2. All raw query paths must set `app.current_organization_id` session variable before execution.
3. Add top-level raw query extensions for `$queryRaw`, `$executeRaw`, `$queryRawUnsafe`, `$executeRawUnsafe` that add RLS session variable setting OR validate `organizationId` in the SQL WHERE manually.
**Warning signs:** Analytics returning data from multiple orgs; audit exports containing other orgs' entries.

### Pitfall 2: RLS Session Variable Not Set in BullMQ Workers
**What goes wrong:** BullMQ processors run outside the HTTP request lifecycle — `TenantContextMiddleware` does not execute. Workers querying the database without setting `app.current_organization_id` will be blocked by RLS (all rows filtered out).
**Why it happens:** Workers are separate Node.js processes or run in the same process but without middleware.
**How to avoid:** Every processor MUST read `orgId` from `job.data` and execute `SET app.current_organization_id` before any database query. Create a shared helper:
```typescript
// apps/api/src/common/helpers/tenant-worker.ts
export async function withTenantContext(
  prisma: PrismaService,
  orgId: string,
  fn: () => Promise<any>,
) {
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.current_organization_id', $1, TRUE)`,
    orgId,
  );
  return orgContext.run(orgId, fn);
}
```
**Warning signs:** Workers silently processing zero rows; audit entries not being written.

### Pitfall 3: Site → Organization Rename Misses Indirect References
**What goes wrong:** 52 files reference `siteId` — a simple string replacement misses Prisma relation access patterns like `camera.site.name`, `door.site`, `alert.camera.site`, `user.siteId` with `.site` relation navigation.
**Why it happens:** String replacement tools find `siteId` but miss `.site` property accesses, `site: { connect: { id } }` in mutations, and type references like `Site` model types.
**How to avoid:** 
1. Use `sed`/renamer for `siteId` → `organizationId` across all `.ts` files.
2. Manually audit `.site` property accesses (relation navigation) — these need `.organization` instead.
3. Update Prisma schema first, regenerate client (`pnpm prisma generate`), then fix TypeScript compilation errors file by file.
4. Search for `import.*Site` type imports.
**Warning signs:** TypeScript compilation errors after rename; runtime "property does not exist" errors.

### Pitfall 4: Registration Flow Creates Orphan Organizations
**What goes wrong:** `POST /api/auth/register` creates Organization + User + OrganizationMember in a transaction. If the transaction partially fails (e.g., network timeout), an Organization exists without an admin user.
**Why it happens:** Distributed transactions across Prisma (Org, User, OrgMember) may partially commit.
**How to avoid:** Use Prisma interactive transaction:
```typescript
await this.prisma.$transaction(async (tx) => {
  const org = await tx.organization.create({ data: { name: orgName } });
  const user = await tx.user.create({ data: { email, password, firstName, lastName } });
  await tx.organizationMember.create({
    data: { userId: user.id, organizationId: org.id, role: "ADMIN" },
  });
});
```
**Warning signs:** Organization with zero members; user unable to log in after registration.

### Pitfall 5: Refresh Token Carries Old orgId After Switch
**What goes wrong:** After `POST /api/auth/switch-org`, the old refresh token (issued for previous org) is used to get new tokens — returning tokens for the wrong org.
**Why it happens:** Refresh tokens are not org-scoped. The refresh endpoint reads `storedToken.user.role` (global role — which no longer exists).
**How to avoid:** 
1. Switch-org MUST revoke all existing refresh tokens for the user before issuing new ones.
2. Alternatively, store `orgId` on `RefreshToken` model and validate it in the refresh flow.
3. The existing `createTokens` method already automates this — just call `logout` before switch.
**Warning signs:** User switches org but API calls return data from previous org.

### Pitfall 6: `$transaction` Inside Prisma Extension Causes Nested Transaction
**What goes wrong:** Service code uses `prisma.$transaction([...])` which is itself intercepted by the extension's `$allOperations`. The extension's WHERE injection applies to individual queries inside the transaction — which is correct — but the transaction API itself shouldn't be extended.
**Why it happens:** `$allOperations` catches everything including `$transaction` if not filtered.
**How to avoid:** The `SCOPED_MODELS` set in the extension only matches model names, not client-level methods. `$transaction` is a client-level method, not a model operation — `model` will be `undefined`, so the extension is a no-op. This is the correct behavior. **No action needed.**

## Code Examples

### Complete Organization Registration
```typescript
// Source: Existing auth pattern + new org creation
// apps/api/src/modules/auth/auth.service.ts (modified register)

async register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}) {
  const existing = await this.prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) throw new ConflictException("Email already registered");

  const passwordHash = await bcrypt.hash(data.password, 10);

  // Single transaction: Org + User + Member
  const result = await this.prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: data.organizationName,
        billingEmail: data.email,
        planTier: "FREE",
      },
    });

    const user = await tx.user.create({
      data: {
        email: data.email,
        password: passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });

    const member = await tx.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: "ADMIN",
      },
    });

    return { org, user, member };
  });

  const { accessToken, refreshToken } = await this.createTokens(
    result.user.id,
    result.user.email,
    result.org.id,
    "ADMIN",
  );

  return {
    accessToken,
    refreshToken,
    user: { id: result.user.id, email: result.user.email, firstName: result.user.firstName, lastName: result.user.lastName },
    organization: { id: result.org.id, name: result.org.name },
  };
}
```

### Organization Switcher (Dashboard)
```typescript
// Source: Existing auth-client.ts pattern
// apps/dashboard/lib/auth-client.ts (modified)

export async function switchOrganization(targetOrgId: string) {
  const currentToken = getAccessToken();
  if (!currentToken) throw new Error("Not authenticated");

  const res = await fetchWithAuth("/api/auth/switch-org", {
    method: "POST",
    body: JSON.stringify({ organizationId: targetOrgId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Organization switch failed");
  }

  const { accessToken, refreshToken, user } = await res.json();
  
  // Update stored tokens
  sessionStorage.setItem("accessToken", accessToken);
  // Refresh token handled by HttpOnly cookie
  
  // Redirect to dashboard with new org context
  window.location.href = "/dashboard";
}
```

### PostgreSQL RLS Migration Script
```sql
-- Source: PostgreSQL docs — CREATE POLICY
-- apps/api/prisma/migrations/XXXXXX_add_rls_policies/migration.sql

-- Create function to simplify policy creation
CREATE OR REPLACE FUNCTION create_tenant_policy(table_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  EXECUTE format('
    CREATE POLICY tenant_isolation ON %I
      FOR ALL
      USING ("organizationId" = current_setting(''app.current_organization_id'', true)::uuid)
      WITH CHECK ("organizationId" = current_setting(''app.current_organization_id'', true)::uuid)
  ', table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply to all scoped tables
SELECT create_tenant_policy('Organization');
SELECT create_tenant_policy('Camera');
SELECT create_tenant_policy('Door');
SELECT create_tenant_policy('Zone');
SELECT create_tenant_policy('Incident');
SELECT create_tenant_policy('VehicleList');
SELECT create_tenant_policy('User');
SELECT create_tenant_policy('AuditLog');
SELECT create_tenant_policy('OrganizationMember');
SELECT create_tenant_policy('Invite');
SELECT create_tenant_policy('FeatureFlag');
SELECT create_tenant_policy('Credential');
SELECT create_tenant_policy('Alert');
SELECT create_tenant_policy('CameraPrompt');

DROP FUNCTION create_tenant_policy;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global `user.role` on User model | `OrganizationMember.role` per organization | Phase 4 | User has no global role; role is always per-organization |
| `siteId` FK for tenant isolation | `organizationId` FK + Prisma extension + RLS | Phase 4 | Defense-in-depth; no manual WHERE clauses needed |
| Entity-level audit hash chain | Per-organization audit hash chain | Phase 4 | Auditors can independently verify Organization A's logs without seeing Organization B's |
| Flat audit log | Hash-chained per tenant | Phase 4 | `previousHash` + `currentHash` columns on AuditLog |
| Single-org registration | Registration auto-creates organization + admin membership | Phase 4 | One-step signup flow; no separate org creation step |

**Deprecated/outdated:**
- `User.role` column: Removed entirely. Role resolved from `OrganizationMember` at request time.
- `User.siteId` column: Removed entirely. User-organization membership via join table.
- `Site` model: Renamed to `Organization` with added billing metadata. Old name retired.
- Per-entity audit chain verification: Replaced by per-organization chain. Entity-level is a subset.

## Migration Strategy Summary

### Phase: Single Migration with Clean Break (D-03)

**Ordering:**

1. **Schema migration (Prisma):**
   - Rename `Site` model → `Organization` (add `stripeCustomerId`, `billingEmail`, `planTier`)
   - Rename `siteId` → `organizationId` on Camera, Door, Zone, Incident, VehicleList, User, AuditLog (all FKs)
   - Create `OrganizationMember` model
   - Create `Invite` model  
   - Create `FeatureFlag` model
   - Add `previousHash`, `currentHash`, `organizationId` to `AuditLog`
   - Drop `User.role`, `User.siteId`
   - Drop `AuditLog.site_id` (TimescaleDB column rename)

2. **Data migration (in migration.sql):**
   - For each existing `Site` → `Organization`: preserve all data, set `planTier = 'FREE'`
   - For each existing `User`: create `OrganizationMember` row with `userId`, `organizationId = user.siteId`, `role = user.role`
   - Initialize hash chain: compute `currentHash = SHA256('genesis' + content)` for existing audit entries

3. **Code migration (TypeScript):**
   - Prisma Client regenerate (`pnpm prisma generate`)
   - Fix all TypeScript compilation errors (52 files, ~400 `siteId` references)
   - Replace `Site` → `Organization` type imports
   - Replace `.site` → `.organization` relation accesses

4. **RLS deployment (post-migration):**
   - Run RLS policy creation SQL
   - Verify with `SELECT * FROM "Camera"` — should return 0 rows without session variable set

**Zero-downtime considerations:**
- Migration runs with `prisma migrate deploy` at Docker container startup.
- Existing v1.0 deployments have zero users (prototype) — downtime acceptable.
- For future production: the clean break is intentional per D-03. No backward-compatible intermediate state.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Prisma `$allModels.$allOperations` correctly intercepts `aggregate`, `groupBy`, and `findRaw` operations with the `args.where` pattern | Architecture Patterns — Pattern 1 | Aggregation queries could leak cross-tenant data; need explicit testing |
| A2 | `AsyncLocalStorage` works correctly with Fastify's request lifecycle (no context loss between middleware and service execution) | Architecture Patterns — Pattern 2 | Tenant context could be lost mid-request; fallback to per-request PrismaClient instance creation |
| A3 | PostgreSQL RLS `current_setting('app.current_organization_id', true)` returns NULL (falsy) when variable not set, causing all rows to be filtered | Architecture Patterns — Pattern 3 | RLS could allow access when context is unset; verify with integration test |
| A4 | Node.js `crypto.createHash('sha256')` is FIPS-compliant and available in all deployment environments | Architecture Patterns — Pattern 6 | If running in FIPS-only mode without SHA256, use `createHash('sha2-256')` |
| A5 | The existing TimescaleDB `audit_log` hypertable supports column additions (previousHash, currentHash, organizationId) without requiring table recreation | Migration Strategy | May need to create a new hypertable and migrate data |
| A6 | BullMQ job data serialization preserves `orgId` correctly when passing from HTTP context to worker | Common Pitfalls — Pitfall 2 | Workers could receive malformed `orgId`; verify with integration test |

## Open Questions

1. **Should `Credential`, `Alert`, `CameraPrompt` have `organizationId` added directly or rely on parent-model isolation?**
   - What we know: `Credential` belongs to `User` → `OrganizationMember` → `Organization`. `Alert` belongs to `Camera` → `Organization`. Parent-model isolation works but requires JOINs. Direct `organizationId` on these tables simplifies queries and RLS.
   - What's unclear: Performance tradeoff of adding columns vs relying on JOIN-based isolation. Adding columns is denormalization but simpler RLS.
   - Recommendation: Add `organizationId` directly to `Credential`, `Alert`, and `CameraPrompt` — listed in SCOPED_MODELS in the extension. This makes RLS uniform across all tables and avoids complex JOIN-based policy expressions.

2. **Should the Prisma extension use `AsyncLocalStorage` or per-request client instances?**
   - What we know: `AsyncLocalStorage` is the standard pattern for request-scoped context in Node.js. Per-request client instances create multiple PrismaClient instances sharing a connection pool — acceptable but more memory. Prisma docs recommend `AsyncLocalStorage`.
   - What's unclear: Fastify compatibility — does `AsyncLocalStorage` context survive Fastify's async middleware chain?
   - Recommendation: Use `AsyncLocalStorage` as primary approach; fall back to per-request client if Fastify context loss is detected during spike.

3. **How should existing v1.0 audit log entries be hash-chained after migration?**
   - What we know: Existing audit entries in TimescaleDB have no `previousHash`/`currentHash`. After migration, new entries will be chained.
   - What's unclear: Should we retroactively chain existing entries (computed once during migration), or start a new chain from post-migration entries only?
   - Recommendation: Compute genesis hash for existing entries in migration (`SHA256('genesis' + content)`) and set `currentHash` and `previousHash = 'genesis'` for all existing rows. This gives a valid chain from the start. Performance: for large audit logs, batch the update in chunks of 10K.

## Sources

### Primary (HIGH confidence)
- [Prisma Client Extensions — Query extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions/query) — verified `$allModels.$allOperations` pattern, `args` mutation, raw query top-level extension, `model` parameter behavior
- [Prisma Client Extensions — Overview](https://www.prisma.io/docs/orm/prisma-client/client-extensions) — verified extended client isolation, middleware chaining, conflicts
- [Prisma Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) — verified interactive transactions, `$transaction([])` API, isolation levels
- [PostgreSQL 16 Row Security Policies](https://www.postgresql.org/docs/16/ddl-rowsecurity.html) — verified CREATE POLICY syntax, USING/WITH CHECK, session variable pattern, `current_setting()`, BYPASSRLS, restrictive policies
- [Resend Node.js SDK](https://resend.com/docs/send-with-nextjs) — verified `resend.emails.send()` API, error handling pattern (`{ data, error }`), attachment support
- [Existing SiteContextMiddleware](apps/api/src/common/middleware/site-context.middleware.ts) — verified pattern for setting PostgreSQL session variables from JWT
- [Existing JwtStrategy](apps/api/src/modules/auth/strategies/jwt.strategy.ts) — verified current JWT payload shape and `validate()` hook
- [Existing RolesGuard](apps/api/src/common/guards/roles.guard.ts) — verified decorator-based RBAC using `ROLE_HIERARCHY`
- [Existing AuditService](apps/api/src/modules/audit/audit.service.ts) — verified existing `verifyChain()` hash chain implementation
- [Existing NotificationsService](apps/api/src/modules/notifications/notifications.service.ts) — verified Resend integration pattern
- [Prisma Schema](apps/api/prisma/schema.prisma) — verified 7 models with `siteId`, 12 processor files, 52 source files referencing `siteId`

### Secondary (MEDIUM confidence)
- [Prisma Client Extensions — RLS example](https://www.prisma.io/docs/orm/prisma-client/client-extensions#extended-clients) — referenced in docs as RLS use case for extended clients; verified via official docs
- [NestJS Authentication docs](https://docs.nestjs.com/security/authentication) — general JWT patterns; page rendered poorly but content known from training data and existing codebase patterns

### Tertiary (LOW confidence)
- None — all claims are verified or explicitly tagged as `[ASSUMED]` above.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in `pnpm-lock.yaml`, verified via npm and slopcheck
- Architecture: HIGH — Prisma extension + RLS patterns verified from official docs; existing middleware pattern directly reusable
- Pitfalls: HIGH — pitfalls derived from known multi-tenant implementation traps and verified against project-specific codebase analysis
- Migration: MEDIUM — migration ordering is deterministic but risk of TimescaleDB column addition complexity flagged as open question

**Research date:** 2026-07-15
**Valid until:** 2026-09-15 (Prisma Client Extensions API is stable since 4.x; PostgreSQL RLS unchanged since 9.5; NestJS patterns stable)

**Files analyzed for siteId references:** 52 (see quantification in Migration Strategy Summary)
**Models requiring rename/update:** 7 with FK (`Camera`, `Door`, `Zone`, `Incident`, `VehicleList`, `User`, `AuditLog`) + 1 parent (`Site`→`Organization`)
**New models:** 3 (`OrganizationMember`, `Invite`, `FeatureFlag`)
**BullMQ processors needing orgId propagation:** 12 (`door`, `inference`, `audit`, `anpr`, `governance`, `patterns`, `ai`, `tailgating`, `correlation`, `notifications`, `access`, `incident`)
**Socket.IO gateways needing org scoping:** 6 (`door`, `access`, `incident`, `visitor`, `analytics`, `risk`)
