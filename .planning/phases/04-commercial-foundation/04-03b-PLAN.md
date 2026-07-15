---
phase: 04-commercial-foundation
plan: 03b
type: execute
wave: 3
depends_on:
  - 04-03a
files_modified:
  - apps/api/src/common/decorators/current-org.decorator.ts
  - apps/api/src/common/guards/tenant-isolation.guard.ts
  - apps/api/prisma/migrations/XXXXXX_add_rls_policies/migration.sql
  - apps/api/src/app.module.ts
autonomous: true
requirements:
  - FND-01
  - FND-02
user_setup: []

must_haves:
  truths:
    - "TenantIsolationGuard blocks requests without orgId in JWT"
    - "CurrentOrg decorator extracts orgId from request.user"
    - "PostgreSQL RLS policies enforce organizationId isolation on all 14 scoped tables"
    - "TenantContextMiddleware replaces SiteContextMiddleware in AppModule"
    - "TenantIsolationGuard registered as APP_GUARD"
  artifacts:
    - path: "apps/api/src/common/decorators/current-org.decorator.ts"
      provides: "@CurrentOrg() parameter decorator"
      exports: ["CurrentOrg"]
    - path: "apps/api/src/common/guards/tenant-isolation.guard.ts"
      provides: "Guard that rejects requests without orgId"
      exports: ["TenantIsolationGuard"]
    - path: "apps/api/prisma/migrations/XXXXXX_add_rls_policies/migration.sql"
      provides: "RLS policies for all 14 scoped tables"
      contains: "CREATE POLICY tenant_isolation"
    - path: "apps/api/src/app.module.ts"
      provides: "Registered TenantContextMiddleware and TenantIsolationGuard"
  key_links:
    - from: "tenant-isolation.guard.ts"
      to: "request.user.orgId"
      via: "JWT payload"
      pattern: "user\\.orgId"
    - from: "app.module.ts"
      to: "TenantContextMiddleware"
      via: "configure() consumer.apply"
      pattern: "TenantContextMiddleware"
---

<objective>
Complete the tenant isolation integration layer: create the CurrentOrg decorator and TenantIsolationGuard (NestJS guard pattern), create PostgreSQL RLS policy migration for all 14 scoped tables, and wire TenantContextMiddleware + TenantIsolationGuard into AppModule (replacing SiteContextMiddleware). This is the second half of tenant isolation — the core (extension, middleware, worker helper) was built in Plan 03a. Implements D-09 and D-10.
</objective>

<execution_context>
@/home/devuser/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/devuser/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/04-commercial-foundation/04-CONTEXT.md (D-09 two-layer isolation, D-10 middleware pattern)
@.planning/phases/04-commercial-foundation/04-RESEARCH.md (Pattern 3: PostgreSQL RLS lines 422-464)
@.planning/phases/04-commercial-foundation/04-PATTERNS.md (lines 231-344 for decorator, guard, AppModule)
@apps/api/src/common/guards/roles.guard.ts (existing guard pattern — full read required)
@apps/api/src/common/decorators/public.decorator.ts (existing decorator pattern — full read required)
@apps/api/src/common/decorators/roles.decorator.ts (existing decorator pattern — full read required)
@apps/api/src/modules/prisma/tenant-extension.ts (from Plan 03a — needed for SCOPED_MODELS list)
@apps/api/src/app.module.ts (middleware and guard registration — full read required)
@apps/api/prisma/schema.prisma (updated schema from Plan 01)

<interfaces>
From app.module.ts (line 99-103) — configure() pattern:
```typescript
configure(consumer: MiddlewareConsumer) {
  consumer.apply(SiteContextMiddleware).forRoutes('*');
}
```

From app.module.ts (line 92-97) — provider registration pattern:
```typescript
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
  ...
]
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create decorator and guard — CurrentOrg + TenantIsolationGuard</name>
  <files>apps/api/src/common/decorators/current-org.decorator.ts, apps/api/src/common/guards/tenant-isolation.guard.ts</files>
  <read_first>apps/api/src/common/guards/roles.guard.ts</read_first>
  <read_first>apps/api/src/common/decorators/public.decorator.ts</read_first>
  <action>
    Create two files:

    A. apps/api/src/common/decorators/current-org.decorator.ts:
    Follow public.decorator.ts pattern but use createParamDecorator (from PATTERNS.md lines 231-240):

    ```typescript
    import { createParamDecorator, ExecutionContext } from "@nestjs/common";

    export const CurrentOrg = createParamDecorator(
      (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user?.orgId;
      },
    );
    ```

    B. apps/api/src/common/guards/tenant-isolation.guard.ts:
    Follow roles.guard.ts import and class structure. Checks that request.user.orgId exists. From PATTERNS.md lines 307-317:

    ```typescript
    import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";

    @Injectable()
    export class TenantIsolationGuard implements CanActivate {
      canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user?.orgId) throw new ForbiddenException("No organization context");
        return true;
      }
    }
    ```
  </action>
  <verify>
    <automated>grep -c "CurrentOrg" apps/api/src/common/decorators/current-org.decorator.ts | grep -v '^#'</automated>
  </verify>
  <acceptance_criteria>
    - current-org.decorator.ts exists with CurrentOrg createParamDecorator returning request.user?.orgId
    - tenant-isolation.guard.ts exists with TenantIsolationGuard that throws ForbiddenException if no orgId
    - Both files follow existing codebase conventions (imports, naming, error handling)
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Create RLS policies migration SQL</name>
  <files>apps/api/prisma/migrations/XXXXXX_add_rls_policies/migration.sql</files>
  <read_first>apps/api/prisma/schema.prisma</read_first>
  <action>
    Create a new migration directory and SQL file for RLS policies:

    Run: npx prisma migrate dev --name add_rls_policies --create-only (workdir=apps/api)

    Edit the generated migration.sql to add the RLS policy creation from RESEARCH.md Pattern 3 (lines 1092-1127):

    1. Create `create_tenant_policy` helper function (PL/pgSQL)
    2. Call it for each scoped table: Organization, Camera, Door, Zone, Incident, VehicleList, User, AuditLog, OrganizationMember, Invite, FeatureFlag, Credential, Alert, CameraPrompt
    3. Drop the helper function after use
    4. Each policy is: FOR ALL USING ("organizationId" = current_setting('app.current_organization_id', true)::uuid) WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true)::uuid)

    IMPORTANT: The migration must work AFTER the main schema migration (Plan 01). The RLS SQL runs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on each table — this requires the tables to exist with the `organizationId` column.

    The generated Prisma migration will be empty (no schema changes). This is a custom SQL-only migration.
  </action>
  <verify>
    <automated>grep -c "CREATE POLICY tenant_isolation" apps/api/prisma/migrations/*_add_rls_policies/migration.sql | grep -v '^#'</automated>
  </verify>
  <acceptance_criteria>
    - Migration directory exists: apps/api/prisma/migrations/XXXXXX_add_rls_policies/
    - migration.sql contains `CREATE OR REPLACE FUNCTION create_tenant_policy`
    - migration.sql contains `ENABLE ROW LEVEL SECURITY` for all 14 scoped tables
    - migration.sql contains `CREATE POLICY tenant_isolation` for all 14 scoped tables
    - migration.sql contains `DROP FUNCTION create_tenant_policy`
    - Policy uses `current_setting('app.current_organization_id', true)::uuid`
    - Policy applies FOR ALL with both USING and WITH CHECK clauses
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: Wire up AppModule — replace SiteContextMiddleware, add TenantIsolationGuard</name>
  <files>apps/api/src/app.module.ts</files>
  <read_first>apps/api/src/app.module.ts</read_first>
  <action>
    Modify apps/api/src/app.module.ts:

    1. UPDATE import: Change `SiteContextMiddleware` import to `TenantContextMiddleware`:
       `import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';`

    2. UPDATE configure(): Apply TenantContextMiddleware instead of SiteContextMiddleware:
       ```
       consumer
         .apply(TenantContextMiddleware)
         .forRoutes('*');
       ```

    3. ADD import for TenantIsolationGuard (after RolesGuard import):
       `import { TenantIsolationGuard } from './common/guards/tenant-isolation.guard';`

    4. ADD TenantIsolationGuard as APP_GUARD in providers array. Add it AFTER JwtAuthGuard but BEFORE RolesGuard:
       ```
       { provide: APP_GUARD, useClass: JwtAuthGuard },
       { provide: APP_GUARD, useClass: TenantIsolationGuard },
       { provide: APP_GUARD, useClass: RolesGuard },
       ```

    5. The SiteModule import stays for now — it will be replaced with OrganizationModule in Plan 04a.

    Do NOT modify any other imports, providers, or the onModuleInit method.
  </action>
  <verify>
    <automated>grep -c "TenantContextMiddleware" apps/api/src/app.module.ts | grep -v '^#'</automated>
  </verify>
  <acceptance_criteria>
    - app.module.ts imports TenantContextMiddleware (NOT SiteContextMiddleware)
    - configure() applies TenantContextMiddleware to all routes
    - app.module.ts imports TenantIsolationGuard
    - TenantIsolationGuard registered as APP_GUARD between JwtAuthGuard and RolesGuard
    - `grep -c "SiteContextMiddleware" apps/api/src/app.module.ts` returns 0
    - No other imports or providers are removed or reordered
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| HTTP request → TenantIsolationGuard | orgId extracted from JWT by JwtStrategy; guard checks presence |
| PostgreSQL → RLS policies | session variable `app.current_organization_id` set by middleware controls row visibility |
| Raw SQL queries → RLS | RLS catches queries that bypass the Prisma extension |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-12 | Information Disclosure | Raw SQL queries bypassing extension | mitigate | PostgreSQL RLS policies on all 14 scoped tables catch raw SQL. app.current_organization_id set by middleware. Raw queries without session var → RLS returns zero rows (safe default). |
| T-04-14 | Elevation of Privilege | TenantIsolationGuard bypass | mitigate | Registered as global APP_GUARD (applies to all routes). Public routes use @Public() decorator which skips JwtAuthGuard — but public routes (register, login) legitimately have no orgId. TenantIsolationGuard should NOT apply to @Public() routes. |
</threat_model>

<verification>
1. `npx tsc --noEmit --project apps/api/tsconfig.json` — TypeScript compiles without errors (workdir=apps/api)
2. `grep -c "CurrentOrg" apps/api/src/common/decorators/current-org.decorator.ts` — decorator exists
3. `grep -c "TenantIsolationGuard" apps/api/src/common/guards/tenant-isolation.guard.ts` — guard exists
4. `grep -c "CREATE POLICY" apps/api/prisma/migrations/*_add_rls_policies/migration.sql` — RLS policies defined
5. `grep -c "TenantIsolationGuard" apps/api/src/app.module.ts` — guard registered
</verification>

<success_criteria>
Decorator and guard created following existing NestJS patterns. RLS policies migration covering all 14 scoped tables. AppModule wired with TenantContextMiddleware (replacing SiteContextMiddleware) and TenantIsolationGuard registered as global guard. Guard order: JwtAuthGuard → TenantIsolationGuard → RolesGuard.
</success_criteria>

<output>
Create `.planning/phases/04-commercial-foundation/04-03b-SUMMARY.md` when done
</output>
