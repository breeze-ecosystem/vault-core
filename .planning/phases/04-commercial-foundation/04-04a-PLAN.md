---
phase: 04-commercial-foundation
plan: 04a
type: execute
wave: 2
depends_on:
  - 04-01
  - 04-02
files_modified:
  - apps/api/src/modules/auth/strategies/jwt.strategy.ts
  - apps/api/src/modules/auth/auth.service.ts
  - apps/api/src/modules/auth/auth.controller.ts
  - apps/api/src/modules/organization/organization.module.ts
  - apps/api/src/modules/organization/organization.controller.ts
  - apps/api/src/modules/organization/organization.service.ts
autonomous: true
requirements:
  - FND-03
  - FND-04
user_setup: []

must_haves:
  truths:
    - "JwtStrategy.validate() returns { id, email, orgId, role } from OrganizationMember lookup"
    - "Registration creates Organization + User + OrganizationMember in one Prisma transaction"
    - "Login resolves orgId from OrganizationMember (first membership if multiple) and issues scoped JWT"
    - "POST /api/auth/switch-org validates OrganizationMember, re-issues tokens with new orgId/role"
    - "Organization CRUD at /api/organizations with auto-scoped queries (extension handles orgId)"
  artifacts:
    - path: "apps/api/src/modules/auth/strategies/jwt.strategy.ts"
      provides: "JWT validation with OrganizationMember lookup"
      contains: "organizationMember.findUnique"
      contains: "orgId"
    - path: "apps/api/src/modules/auth/auth.service.ts"
      provides: "register with org creation, login with org resolution, switchOrg"
      contains: "createOrganization"
      contains: "organizationMember.create"
      contains: "switchOrg"
    - path: "apps/api/src/modules/auth/auth.controller.ts"
      provides: "switch-org endpoint, modified register endpoint"
      contains: "switch-org"
    - path: "apps/api/src/modules/organization/organization.service.ts"
      provides: "Organization CRUD"
      exports: ["OrganizationService"]
  key_links:
    - from: "jwt.strategy.ts validate()"
      to: "OrganizationMember table"
      via: "findUnique on userId_organizationId"
      pattern: "organizationMember\\.findUnique"
    - from: "auth.service.ts register()"
      to: "Organization + User + OrganizationMember"
      via: "prisma.$transaction"
      pattern: "\\$transaction.*organization\\.create"
    - from: "auth.controller.ts switch-org"
      to: "auth.service.ts switchOrg()"
      via: "method call"
      pattern: "switchOrg"
---

<objective>
Rebuild the auth module for multi-tenant operation: JWT tokens carry orgId + role, registration creates an organization automatically, login resolves org context from OrganizationMember, switch-org re-issues tokens. Create the OrganizationModule (CRUD) following existing NestJS patterns from SiteModule. This is the first half — invite module follows in Plan 04b. Implements D-05 through D-08.
</objective>

<execution_context>
@/home/devuser/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/devuser/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/04-commercial-foundation/04-CONTEXT.md (D-05 through D-08 — auth and registration decisions)
@.planning/phases/04-commercial-foundation/04-RESEARCH.md (Pattern 4: OrganizationMember lines 466-533, Pattern 5: JWT payload lines 535-615, Code Example: Registration lines 997-1059)
@.planning/phases/04-commercial-foundation/04-PATTERNS.md (lines 670-776 for JWT strategy, auth service/controller; lines 392-488 for organization module)
@apps/api/src/modules/auth/strategies/jwt.strategy.ts (existing JWT strategy — full read required)
@apps/api/src/modules/auth/auth.service.ts (existing auth service with register/login/refresh/createTokens — full read required)
@apps/api/src/modules/auth/auth.controller.ts (existing controller with register/login/refresh/logout — full read required)
@apps/api/src/modules/site/site.service.ts (analog for OrganizationService — full read required)
@apps/api/src/modules/site/site.controller.ts (analog for OrganizationController)
@apps/api/src/modules/site/site.module.ts (analog for OrganizationModule)
@packages/shared/src/schemas/auth.schema.ts (updated schemas from Plan 02)
@packages/shared/src/schemas/organization.schema.ts (new schemas from Plan 02)

<interfaces>
From existing auth.service.ts — key signatures:
```typescript
async register(data: { email, password, firstName, lastName, role?, siteId? }): Promise<{accessToken, refreshToken, user}>
async login(email, password): Promise<{accessToken, refreshToken, user}>
async refresh(oldRefreshToken): Promise<{accessToken, refreshToken, user}>
async logout(userId, refreshToken?): Promise<{message}>
private async createTokens(userId, email, role): Promise<{accessToken, refreshToken}>
```

From existing jwt.strategy.ts:
```typescript
async validate(payload: { sub: string; email: string; role: string }): Promise<{id, email, role}>
```

From existing site.service.ts — CRUD pattern:
```typescript
async findAll(filters?): Promise<{data, total, page, limit}>
async findById(id): Promise<Site>
async create(data: Prisma.SiteCreateInput): Promise<Site>
async update(id, data: Prisma.SiteUpdateInput): Promise<Site>
async remove(id): Promise<Site>
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update JwtStrategy — add orgId to validate payload, verify OrganizationMember</name>
  <files>apps/api/src/modules/auth/strategies/jwt.strategy.ts</files>
  <read_first>apps/api/src/modules/auth/strategies/jwt.strategy.ts</read_first>
  <action>
    Modify apps/api/src/modules/auth/strategies/jwt.strategy.ts:

    1. ADD imports: `PrismaService` from `../../prisma/prisma.service`, `UnauthorizedException` from `@nestjs/common`

    2. UPDATE constructor to inject PrismaService:
       ```typescript
       constructor(
         config: ConfigService,
         private prisma: PrismaService,
       ) { super({ ... }); }
       ```
       (Keep existing ConfigService injection — add PrismaService as second param)

    3. UPDATE validate() payload type: Add `orgId: string`:
       ```typescript
       async validate(payload: { sub: string; email: string; orgId: string; role: string })
       ```

    4. ADD OrganizationMember lookup in validate() per RESEARCH.md Pattern 5 (lines 543-570):
       ```typescript
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
       ```

    5. RETURN: `{ id: payload.sub, email: payload.email, orgId: payload.orgId, role: membership.role }`
       Key: role comes from DB (membership.role), NOT from JWT claim (payload.role). This is the server-side permission resolution from D-06.

    The strategy now validates that the user is an active member of the organization claimed in the JWT. This prevents stale-JWT attacks after org membership revocation.
  </action>
  <verify>
    <automated>grep -c "organizationMember" apps/api/src/modules/auth/strategies/jwt.strategy.ts | grep -v '^#'</automated>
  </verify>
  <acceptance_criteria>
    - jwt.strategy.ts constructor injects PrismaService
    - validate() payload includes orgId: string
    - validate() calls prisma.organizationMember.findUnique() with userId_organizationId compound key
    - validate() throws UnauthorizedException if membership not found or not isActive
    - validate() returns { id, email, orgId, role } where role = membership.role (from DB)
    - No compilation errors
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Rewrite AuthService — register with org creation, login with org resolution, switchOrg</name>
  <files>apps/api/src/modules/auth/auth.service.ts</files>
  <read_first>apps/api/src/modules/auth/auth.service.ts</read_first>
  <read_first>apps/api/src/modules/auth/strategies/jwt.strategy.ts</read_first>
  <action>
    Modify apps/api/src/modules/auth/auth.service.ts. This is the largest single change.

    A. UPDATE imports: add `ForbiddenException` to nestjs imports. Remove `Role` import from `@prisma/client` (no longer needed on User). Add `JwtService` import if not already present.

    B. REWRITE register() — per D-08 and RESEARCH.md lines 997-1059:
       - Accept: `{ email, password, firstName, lastName, organizationName }` (NO role, NO siteId)
       - Use `this.prisma.$transaction(async (tx) => { ... })`:
         1. `tx.organization.create({ data: { name: organizationName, billingEmail: email, planTier: "FREE" } })`
         2. `tx.user.create({ data: { email, password: passwordHash, firstName, lastName } })`
         3. `tx.organizationMember.create({ data: { userId: user.id, organizationId: org.id, role: "ADMIN" } })`
         4. Return `{ org, user, member }` from transaction
       - Call `this.createTokens(result.user.id, result.user.email, result.org.id, "ADMIN")`
       - Return `{ accessToken, refreshToken, user: { id, email, firstName, lastName }, organization: { id, name } }`

    C. REWRITE login() — per D-06 (role from OrganizationMember, not User model):
       - Find user by email (unchanged)
       - Find OrganizationMember for this user: `this.prisma.organizationMember.findFirst({ where: { userId: user.id, isActive: true }, orderBy: { joinedAt: "asc" } })`
       - If no membership → throw UnauthorizedException("No organization membership")
       - Call `this.createTokens(user.id, user.email, membership.organizationId, membership.role)`
       - Return tokens + user + organization info + organizations list (for org switcher)

    D. REWRITE createTokens() — add orgId parameter:
       - Signature: `private async createTokens(userId: string, email: string, orgId: string, role: string)`
       - JWT payload: `{ sub: userId, email, orgId, role }` (D-06)
       - Refresh token creation: unchanged

    E. REWRITE refresh() — update createTokens call:
       - The refresh flow must also resolve orgId + role. Find user's membership (first active one):
         `const membership = await this.prisma.organizationMember.findFirst({ where: { userId: storedToken.user.id, isActive: true } })`
       - Call `this.createTokens(storedToken.user.id, storedToken.user.email, membership.organizationId, membership.role)`
       - Also revoke old refresh tokens per RESEARCH.md Pitfall 5 (lines 981-988)

    F. ADD switchOrg() — per D-07 and RESEARCH.md Pattern 5 (lines 592-615):
       - Validate membership exists and isActive for target orgId
       - Revoke all existing refresh tokens for this user (Pitfall 5 mitigation)
       - Find user email
       - Return `this.createTokens(userId, email, targetOrgId, membership.role)`

    G. The `login()` method must also return the list of organizations the user belongs to (for the org switcher in Plan 08):
       - Add `organizations` field to login response: `this.prisma.organizationMember.findMany({ where: { userId, isActive: true }, include: { organization: { select: { id: true, name: true } } } })`

    H. ADD getUserOrganizations(): `prisma.organizationMember.findMany({ where: { userId, isActive: true }, include: { organization: { select: { id: true, name: true } } } })`
  </action>
  <verify>
    <automated>grep -c "switchOrg" apps/api/src/modules/auth/auth.service.ts | grep -v '^#'</automated>
  </verify>
  <acceptance_criteria>
    - register() accepts organizationName (NOT siteId/role), creates Org+User+Member in $transaction
    - login() resolves orgId from OrganizationMember.findFirst(), issues scoped tokens
    - createTokens() signature is `(userId, email, orgId, role)` with JWT payload `{ sub, email, orgId, role }`
    - switchOrg() validates membership, revokes old tokens, re-issues
    - refresh() resolves org context from OrganizationMember (handles Pitfall 5)
    - All error cases use appropriate NestJS exceptions (ConflictException, UnauthorizedException, ForbiddenException, BadRequestException)
    - login() response includes `organizations` array for org switcher
    - getUserOrganizations() method available
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: Update AuthController — add switch-org endpoint, modify register, add organizations endpoint</name>
  <files>apps/api/src/modules/auth/auth.controller.ts</files>
  <read_first>apps/api/src/modules/auth/auth.controller.ts</read_first>
  <read_first>apps/api/src/modules/auth/auth.service.ts</read_first>
  <action>
    Modify apps/api/src/modules/auth/auth.controller.ts:

    A. ADD imports: `switchOrgSchema` from `@repo/shared`, `Param` from `@nestjs/common`

    B. ADD switch-org endpoint (D-07, PATTERNS.md lines 764-777):
       ```typescript
       @UseGuards(JwtAuthGuard)
       @Post('switch-org')
       @HttpCode(HttpStatus.OK)
       async switchOrg(
         @Req() req: FastifyRequest,
         @Body(new ZodValidationPipe(switchOrgSchema)) body: any,
         @Res({ passthrough: true }) res: FastifyReply,
       ) {
         const userId = (req as any).user.id;
         const result = await this.authService.switchOrg(userId, body.organizationId);
         res.setCookie('refreshToken', result.refreshToken, {
           httpOnly: true, secure: process.env.NODE_ENV === 'production',
           path: '/api/auth', maxAge: 7 * 24 * 60 * 60, sameSite: 'lax',
         });
         await this.auditService.log({ userId, action: 'SWITCH_ORG', entity: 'user', entityId: userId, request: req });
         return { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user, organization: result.organization };
       }
       ```

    C. ADD GET /api/auth/organizations endpoint for org switcher:
       ```typescript
       @UseGuards(JwtAuthGuard)
       @Get('organizations')
       async getOrganizations(@Req() req: FastifyRequest) {
         const userId = (req as any).user.id;
         return this.authService.getUserOrganizations(userId);
       }
       ```

    D. Keep all existing endpoints (register, login, refresh, logout) with their decorators and audit logging. The register endpoint body validation uses the updated registerSchema from Plan 02 (which now requires organizationName).

    The accept-invite endpoint will be added in Plan 04b.
  </action>
  <verify>
    <automated>grep -c "switch-org" apps/api/src/modules/auth/auth.controller.ts | grep -v '^#'</automated>
  </verify>
  <acceptance_criteria>
    - POST /api/auth/switch-org endpoint exists with JwtAuthGuard, Zod validation, cookie setting, audit logging
    - GET /api/auth/organizations endpoint exists with JwtAuthGuard
    - All existing endpoints (register, login, refresh, logout) are unchanged in structure
    - Swagger decorators are preserved on existing endpoints
    - Controller compiles without TypeScript errors
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 4: Create OrganizationModule, OrganizationService, OrganizationController</name>
  <files>apps/api/src/modules/organization/organization.module.ts, apps/api/src/modules/organization/organization.controller.ts, apps/api/src/modules/organization/organization.service.ts</files>
  <read_first>apps/api/src/modules/site/site.module.ts</read_first>
  <read_first>apps/api/src/modules/site/site.service.ts</read_first>
  <read_first>apps/api/src/modules/site/site.controller.ts</read_first>
  <action>
    Create three files following EXACT patterns from Site module:

    A. apps/api/src/modules/organization/organization.module.ts:
       - Copy site.module.ts structure; replace Site→Organization
       - `@Module({ controllers: [OrganizationController], providers: [OrganizationService], exports: [OrganizationService] })`

    B. apps/api/src/modules/organization/organization.service.ts:
       - Copy site.service.ts structure
       - `this.prisma.site` → `this.prisma.organization`
       - `Prisma.SiteWhereInput` → `Prisma.OrganizationWhereInput`
       - `Prisma.SiteCreateInput` → `Prisma.OrganizationCreateInput` (includes new billing fields)
       - findAll() include: replace `users` with `members` (OrganizationMember[])
       - CRITICAL: Do NOT add explicit `where: { organizationId }` in queries — Prisma extension handles tenant isolation
       - findById(): include `_count: { select: { members: true } }`
       - remove(): soft-delete with `isActive: false`

    C. apps/api/src/modules/organization/organization.controller.ts:
       - Copy site.controller.ts structure
       - `@Controller('organizations')` instead of `'sites'`
       - Use `createOrganizationSchema`, `updateOrganizationSchema` from `@repo/shared`
       - `@Roles('ADMIN')` for create/update, `@Roles('ADMIN')` for delete
       - Audit entity changed from `'site'` to `'organization'`
       - Use `@CurrentOrg()` decorator (from Plan 03b) for orgId where needed
       - Add GET /api/organizations/me endpoint that returns the current user's org:
         `return this.organizationService.findById((req as any).user.orgId);`
  </action>
  <verify>
    <automated>grep -c "organizations" apps/api/src/modules/organization/organization.controller.ts | grep -v '^#'</automated>
  </verify>
  <acceptance_criteria>
    - Three files exist: organization.module.ts, organization.controller.ts, organization.service.ts
    - Module follows NestJS pattern identical to SiteModule
    - Service uses `this.prisma.organization.*` methods (not site)
    - Controller at route prefix `'organizations'` with CRUD endpoints
    - ZodValidationPipe uses createOrganizationSchema / updateOrganizationSchema from @repo/shared
    - No explicit `where: { organizationId }` in service queries (extension handles it)
    - Audit logging uses entity `'organization'`
    - GET /api/organizations/me returns current user's org
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Registration request → AuthService | Untrusted input (email, password, orgName) → validated by Zod |
| Login request → AuthService | Untrusted credentials → bcrypt comparison |
| JWT claims → JwtStrategy.validate() | JWT is cryptographically verified; claims are trusted but membership is re-validated against DB |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-15 | Elevation of Privilege | Registration — role assignment | mitigate | Registration always creates admin as OrganizationMember.role=ADMIN. No way to register with elevated role. |
| T-04-16 | Spoofing | JWT orgId claim | mitigate | JwtStrategy.validate() re-verifies OrganizationMember exists AND isActive. DB is source of truth per D-06. |
| T-04-19 | Elevation of Privilege | Switch-org — unauthorized org | mitigate | switchOrg() queries OrganizationMember for userId_organizationId compound key. Returns ForbiddenException if not a member. Old refresh tokens revoked. |
| T-04-20 | Information Disclosure | Login response — organizations list | mitigate | Returning org list is by design (org switcher needs it). List only includes orgs where user is an active member. |
</threat_model>

<verification>
1. TypeScript compilation: `npx tsc --noEmit --project apps/api/tsconfig.json` (workdir=apps/api)
2. `grep -c "prisma.\\$transaction" apps/api/src/modules/auth/auth.service.ts` — register uses transaction
3. `grep -c "switchOrg" apps/api/src/modules/auth/auth.service.ts` — switchOrg method exists
4. `grep -c "organizations" apps/api/src/modules/organization/organization.controller.ts` — controller uses organizations route
</verification>

<success_criteria>
Registration creates organization in one transaction. Login resolves org context from OrganizationMember. JWT tokens carry orgId+role with server-side verification. Switch-org re-issues tokens. Organization CRUD works at /api/organizations. Invite module follows in Plan 04b.
</success_criteria>

<output>
Create `.planning/phases/04-commercial-foundation/04-04a-SUMMARY.md` when done
</output>
