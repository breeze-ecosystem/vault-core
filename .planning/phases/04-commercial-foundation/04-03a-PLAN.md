---
phase: 04-commercial-foundation
plan: 03a
type: execute
wave: 2
depends_on:
  - 04-01
files_modified:
  - apps/api/src/modules/prisma/tenant-extension.ts
  - apps/api/src/modules/prisma/prisma.service.ts
  - apps/api/src/common/middleware/tenant-context.middleware.ts
  - apps/api/src/common/helpers/tenant-worker.ts
autonomous: true
requirements:
  - FND-01
  - FND-02
user_setup: []

must_haves:
  truths:
    - "Every Prisma query to SCOPED_MODELS auto-injects WHERE organizationId = currentOrg"
    - "Prisma create/upsert operations auto-set organizationId on SCOPED_MODELS"
    - "TenantContextMiddleware sets app.current_organization_id PostgreSQL session var from JWT orgId"
    - "AsyncLocalStorage provides request-scoped orgId to the Prisma extension"
    - "BullMQ workers can set tenant context via withTenantContext() helper"
  artifacts:
    - path: "apps/api/src/modules/prisma/tenant-extension.ts"
      provides: "Prisma Client Extension with $allModels.$allOperations for tenant isolation"
      exports: ["tenantExtension", "orgContext"]
    - path: "apps/api/src/modules/prisma/prisma.service.ts"
      provides: "Extended PrismaService with tenant extension attached"
      contains: "$extends"
    - path: "apps/api/src/common/middleware/tenant-context.middleware.ts"
      provides: "Middleware that sets PostgreSQL RLS session variable and AsyncLocalStorage context"
      contains: "orgContext.run"
      contains: "set_config"
    - path: "apps/api/src/common/helpers/tenant-worker.ts"
      provides: "withTenantContext() helper for BullMQ workers"
      exports: ["withTenantContext"]
  key_links:
    - from: "TenantContextMiddleware"
      to: "tenant-extension.ts orgContext"
      via: "orgContext.run()"
      pattern: "orgContext\\.run"
    - from: "prisma.service.ts"
      to: "tenant-extension.ts"
      via: "$extends()"
      pattern: "\\$extends.*tenantExtension"
---

<objective>
Build the defense-in-depth tenant isolation core: a Prisma Client Extension that auto-scopes all queries to the current organization, a TenantContextMiddleware that extracts orgId from the JWT and sets the PostgreSQL RLS session variable, wiring the extension into PrismaService, and a worker helper for BullMQ processors. This is the first half of tenant isolation — decorator, guard, RLS migration, and AppModule wiring are in Plan 03b. Implements D-09 (two-layer isolation) and D-10 (middleware pattern).
</objective>

<execution_context>
@/home/devuser/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/devuser/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/04-commercial-foundation/04-CONTEXT.md (D-09 two-layer isolation, D-10 middleware pattern)
@.planning/phases/04-commercial-foundation/04-RESEARCH.md (Pattern 1: Prisma Client Extension lines 248-371, Pattern 2: Tenant Context Middleware lines 379-419, Pattern 3: PostgreSQL RLS lines 422-464, Pitfall 2: BullMQ workers lines 936-953)
@.planning/phases/04-commercial-foundation/04-PATTERNS.md (lines 164-344 for middleware, extension)
@apps/api/src/common/middleware/site-context.middleware.ts (existing pattern — full read required)
@apps/api/src/modules/prisma/prisma.service.ts (existing PrismaService singleton — full read required)
@apps/api/prisma/schema.prisma (updated schema from Plan 01 — needed to determine SCOPED_MODELS set)

<interfaces>
From site-context.middleware.ts — existing pattern:
```typescript
import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaService } from "../../modules/prisma/prisma.service";

@Injectable()
export class SiteContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SiteContextMiddleware.name);
  constructor(private prisma: PrismaService) {}
  async use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
    const user = (req as any).user;
    if (user?.siteId) {
      await this.prisma.$executeRawUnsafe(
        `SELECT set_config('app.current_site_id', $1, TRUE)`, user.siteId
      );
    }
    next();
  }
}
```

From prisma.service.ts — existing pattern:
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  async onModuleInit() {
    await this.$connect();
    this.logger.log("Database connected");
  }
  async onModuleDestroy() { await this.$disconnect(); }
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Prisma Client Extension for tenant isolation</name>
  <files>apps/api/src/modules/prisma/tenant-extension.ts</files>
  <read_first>apps/api/prisma/schema.prisma</read_first>
  <action>
    Create apps/api/src/modules/prisma/tenant-extension.ts.

    Implement using the AsyncLocalStorage pattern from RESEARCH.md Pattern 1 (lines 349-372). This avoids creating a new PrismaClient per request.

    Key implementation details:

    1. SCOPED_MODELS Set must include ALL models that have an organizationId field:
       "Organization", "Camera", "Door", "Zone", "Incident", "VehicleList", "User", "AuditLog",
       "OrganizationMember", "Invite", "FeatureFlag", "Credential", "Alert", "CameraPrompt"

    2. READ_OPS Set: "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow",
       "findMany", "count", "aggregate", "groupBy", "updateMany", "deleteMany"

    3. WRITE_OPS Set: "create", "createMany", "upsert"

    4. Export orgContext (AsyncLocalStorage<string>) for middleware to populate.

    5. Export tenantExtension (Prisma extension) for PrismaService to attach.

    6. In $allOperations handler:
       - Read orgId from orgContext.getStore()
       - If no orgId or model not in SCOPED_MODELS → return query(args) (no-op)
       - For READ_OPS: inject `where: { ...args.where, organizationId: orgId }`
       - For "create"/"createMany": auto-set `data: { ...args.data, organizationId: orgId }`
       - For "upsert": set on both `create` and `where`
       - For "update" and "delete" (single): inject `where: { ...args.where, organizationId: orgId }`
       - IMPORTANT: Only mutate args when model is in SCOPED_MODELS AND orgId is set

    7. Handle edge case: if model IS in SCOPED_MODELS but orgId is undefined (e.g., registration), the extension does NOT inject organizationId. This allows registration to create an Organization without a pre-existing org context.

    Follow the code structure from RESEARCH.md lines 253-337 (the non-AsyncLocalStorage variant) merged with the AsyncLocalStorage variant at lines 349-372. Use `Prisma.defineExtension` and `client.$extends({ name: "tenant-isolation", query: { $allModels: { $allOperations } } })`.
  </action>
  <verify>
    <automated>grep -c "defineExtension" apps/api/src/modules/prisma/tenant-extension.ts | grep -v '^#'</automated>
  </verify>
  <acceptance_criteria>
    - File exists at apps/api/src/modules/prisma/tenant-extension.ts
    - Exports `tenantExtension` (Prisma extension) and `orgContext` (AsyncLocalStorage)
    - SCOPED_MODELS includes Organization, Camera, Door, Zone, Incident, VehicleList, AuditLog, OrganizationMember, Invite, FeatureFlag, Credential, Alert, CameraPrompt
    - READ_OPS includes findMany, findUnique, findFirst, count, aggregate, groupBy, updateMany, deleteMany
    - WRITE_OPS includes create, createMany, upsert
    - $allOperations handler reads orgId from orgContext.getStore()
    - When orgId is unset, extension is no-op (does NOT inject organizationId)
    - Uses Prisma.defineExtension pattern (not a class)
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Attach tenant extension in PrismaService</name>
  <files>apps/api/src/modules/prisma/prisma.service.ts</files>
  <read_first>apps/api/src/modules/prisma/prisma.service.ts</read_first>
  <read_first>apps/api/src/modules/prisma/tenant-extension.ts</read_first>
  <action>
    Modify apps/api/src/modules/prisma/prisma.service.ts:

    1. Import tenantExtension from "./tenant-extension"
    2. In onModuleInit(), call `this.$extends(tenantExtension)` BEFORE `await this.$connect()`
    3. CRITICAL: The `$extends` call must come FIRST in onModuleInit(), before $connect. If $connect runs first and the database fails, the extension should still be attached (so retry on reconnect works).

    Updated onModuleInit:
    ```typescript
    async onModuleInit() {
      this.$extends(tenantExtension);
      try {
        await this.$connect();
        this.logger.log("Database connected");
      } catch (e) {
        this.logger.error("Database connection failed:" + (e instanceof Error ? e.message : e));
        this.logger.warn("Server will start without database — some features may be unavailable");
      }
    }
    ```

    The rest of the file (onModuleDestroy, logger) stays unchanged.
  </action>
  <verify>
    <automated>grep -c "\$extends" apps/api/src/modules/prisma/prisma.service.ts | grep -v '^#'</automated>
  </verify>
  <acceptance_criteria>
    - prisma.service.ts imports tenantExtension from "./tenant-extension"
    - `this.$extends(tenantExtension)` is called in onModuleInit() before `this.$connect()`
    - onModuleDestroy() is unchanged
    - TypeScript compilation passes for this file
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: Create TenantContextMiddleware (extends SiteContextMiddleware pattern)</name>
  <files>apps/api/src/common/middleware/tenant-context.middleware.ts</files>
  <read_first>apps/api/src/common/middleware/site-context.middleware.ts</read_first>
  <read_first>apps/api/src/modules/prisma/tenant-extension.ts</read_first>
  <action>
    Create apps/api/src/common/middleware/tenant-context.middleware.ts.

    Follow the EXACT pattern from site-context.middleware.ts (same imports, same class structure, same Logger, same error handling). Key differences:

    1. Import orgContext from "../../modules/prisma/tenant-extension"
    2. Read `user?.orgId` instead of `user?.siteId`
    3. Set `app.current_organization_id` instead of `app.current_site_id`
    4. Wrap next() in orgContext.run(): `orgContext.run(user.orgId, () => next())`
    5. If user has NO orgId, still call next() (no context, extension is no-op, RLS blocks)

    Implementation matches RESEARCH.md Pattern 2 (lines 386-419). The middleware runs AFTER JwtAuthGuard (since it reads req.user set by passport), so it must be ordered correctly in app.module.ts (Plan 03b).

    Key: the middleware sets both the PostgreSQL session variable (for RLS) AND the AsyncLocalStorage context (for Prisma extension). Both must happen for defense-in-depth per D-09.
  </action>
  <verify>
    <automated>grep -c "orgContext.run" apps/api/src/common/middleware/tenant-context.middleware.ts | grep -v '^#'</automated>
  </verify>
  <acceptance_criteria>
    - File exists at apps/api/src/common/middleware/tenant-context.middleware.ts
    - Uses @Injectable() and implements NestMiddleware
    - Reads user.orgId from request (not user.siteId)
    - Sets app.current_organization_id via set_config (not app.current_site_id)
    - Wraps next() in orgContext.run(user.orgId, () => next())
    - Catches and logs errors (non-blocking — same pattern as SiteContextMiddleware)
    - Uses same logger pattern: `new Logger(TenantContextMiddleware.name)`
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 4: Create worker helper for BullMQ tenant context</name>
  <files>apps/api/src/common/helpers/tenant-worker.ts</files>
  <read_first>apps/api/src/modules/prisma/tenant-extension.ts</read_first>
  <action>
    Create apps/api/src/common/helpers/tenant-worker.ts:

    BullMQ worker helper that sets RLS context before DB queries. From RESEARCH.md Pitfall 2 (lines 942-953):

    ```typescript
    import { PrismaService } from "../../modules/prisma/prisma.service";
    import { orgContext } from "../../modules/prisma/tenant-extension";

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

    This helper is imported by BullMQ processors in Plan 05 to ensure workers have proper tenant context before making database queries.
  </action>
  <verify>
    <automated>grep -c "withTenantContext" apps/api/src/common/helpers/tenant-worker.ts | grep -v '^#'</automated>
  </verify>
  <acceptance_criteria>
    - apps/api/src/common/helpers/tenant-worker.ts exists with withTenantContext function
    - Sets RLS session var via set_config before running fn
    - Wraps fn execution in orgContext.run() for Prisma extension context
    - Proper TypeScript types for PrismaService and orgId
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| JWT claims → Middleware | orgId extracted from JWT; if JWT is valid, claims are trusted |
| Middleware → AsyncLocalStorage | orgId flows from middleware to extension via AsyncLocalStorage; context loss = no isolation |
| Prisma extension → PostgreSQL | WHERE clause injection is the primary isolation; bypass only possible via raw SQL |
| Raw SQL → PostgreSQL RLS | session variable enforces isolation even when extension is bypassed |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-10 | Information Disclosure | Prisma extension — orgId context loss | mitigate | AsyncLocalStorage is Node.js built-in with stable context propagation across async/await. If context is ever lost, extension is no-op (returns no data, not wrong data) |
| T-04-11 | Elevation of Privilege | TenantContextMiddleware — orgId spoofing | mitigate | orgId comes from JWT (signed, verified by JwtAuthGuard BEFORE middleware runs). Middleware runs after auth guard per NestJS guard-before-middleware execution order. |
| T-04-13 | Information Disclosure | BullMQ workers — missing RLS context | mitigate | withTenantContext() helper sets session var + orgContext before any DB query. Workers that forget to call it → RLS returns zero rows → job fails visibly, not silently leaked. |
</threat_model>

<verification>
1. `npx tsc --noEmit --project apps/api/tsconfig.json` — TypeScript compiles without errors (workdir=apps/api)
2. `grep -c "orgContext\\.run" apps/api/src/common/middleware/tenant-context.middleware.ts` — middleware wraps next() in org context
3. `grep -c "\\$extends" apps/api/src/modules/prisma/prisma.service.ts` — extension attached
4. `grep -c "withTenantContext" apps/api/src/common/helpers/tenant-worker.ts` — worker helper exists
</verification>

<success_criteria>
Tenant isolation core is built: Prisma extension auto-scopes queries via AsyncLocalStorage, middleware sets RLS context from JWT, PrismaService wires the extension on startup, worker helper available for BullMQ processors. Decorator, guard, RLS migration, and AppModule wiring follow in Plan 03b.
</success_criteria>

<output>
Create `.planning/phases/04-commercial-foundation/04-03a-SUMMARY.md` when done
</output>
