# Phase 04: Commercial Foundation - Pattern Map

**Mapped:** 2026-07-15
**Files classified:** 33 (16 new, 17 modified)
**Analogs found:** 31 / 33

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/api/prisma/schema.prisma` (modified) | model | CRUD | itself (extend existing pattern) | exact |
| `apps/api/src/common/middleware/tenant-context.middleware.ts` (NEW) | middleware | request-response | `apps/api/src/common/middleware/site-context.middleware.ts` | exact |
| `apps/api/src/common/decorators/current-org.decorator.ts` (NEW) | decorator | request-response | `apps/api/src/common/decorators/public.decorator.ts` | exact |
| `apps/api/src/common/decorators/feature-gate.decorator.ts` (NEW) | decorator | request-response | `apps/api/src/common/decorators/roles.decorator.ts` | exact |
| `apps/api/src/common/guards/tenant-isolation.guard.ts` (NEW) | guard | request-response | `apps/api/src/common/guards/roles.guard.ts` | role-match |
| `apps/api/src/common/guards/feature-gate.guard.ts` (NEW) | guard | request-response | `apps/api/src/common/guards/roles.guard.ts` | role-match |
| `apps/api/src/common/guards/roles.guard.ts` (modified) | guard | request-response | itself (extend to add OrgMember lookup) | exact |
| `apps/api/src/modules/prisma/tenant-extension.ts` (NEW) | utility | transform | no direct analog (new Prisma pattern) | — |
| `apps/api/src/modules/prisma/prisma.service.ts` (modified) | service | CRUD | itself (extend onModuleInit) | exact |
| `apps/api/src/modules/organization/organization.module.ts` (NEW) | module | CRUD | `apps/api/src/modules/site/site.module.ts` | exact |
| `apps/api/src/modules/organization/organization.controller.ts` (NEW) | controller | CRUD | `apps/api/src/modules/site/site.controller.ts` | exact |
| `apps/api/src/modules/organization/organization.service.ts` (NEW) | service | CRUD | `apps/api/src/modules/site/site.service.ts` | exact |
| `apps/api/src/modules/organization/invite/invite.controller.ts` (NEW) | controller | CRUD | `apps/api/src/modules/auth/auth.controller.ts` | role-match |
| `apps/api/src/modules/organization/invite/invite.service.ts` (NEW) | service | CRUD | `apps/api/src/modules/notifications/notifications.service.ts` (Resend pattern) | role-match |
| `apps/api/src/modules/feature-gate/feature-gate.module.ts` (NEW) | module | CRUD | `apps/api/src/modules/site/site.module.ts` | exact |
| `apps/api/src/modules/auth/strategies/jwt.strategy.ts` (modified) | strategy | request-response | itself (extend validate payload) | exact |
| `apps/api/src/modules/auth/auth.service.ts` (modified) | service | CRUD | itself (extend register, login) | exact |
| `apps/api/src/modules/auth/auth.controller.ts` (modified) | controller | request-response | itself (add switch-org endpoint) | exact |
| `apps/api/src/app.module.ts` (modified) | module | config | itself (extend imports, middleware) | exact |
| `apps/api/prisma/seed.ts` (modified) | migration | batch | itself (extend seed data) | exact |
| `packages/shared/src/schemas/organization.schema.ts` (NEW) | schema | request-response | `packages/shared/src/schemas/site.schema.ts` | exact |
| `packages/shared/src/schemas/invite.schema.ts` (NEW) | schema | request-response | `packages/shared/src/schemas/auth.schema.ts` | exact |
| `packages/shared/src/schemas/auth.schema.ts` (modified) | schema | request-response | itself (extend with orgName, switchOrg) | exact |
| `packages/shared/src/index.ts` (modified) | barrel | n/a | itself (add new exports) | exact |
| `apps/dashboard/lib/api.ts` (modified) | client | request-response | itself (add org types, switch-org fn) | exact |
| `apps/dashboard/lib/auth-client.ts` (modified) | client | request-response | itself (add switchOrganization) | exact |
| `apps/dashboard/lib/auth-context.tsx` (modified) | provider | event-driven | itself (add org state) | exact |
| `apps/dashboard/components/org-switcher.tsx` (NEW) | component | request-response | `apps/dashboard/components/ui/` (shadcn pattern) | role-match |
| `apps/mobile/lib/api.ts` (modified) | client | request-response | `apps/dashboard/lib/api.ts` | exact |
| `apps/mobile/lib/auth-client.ts` (modified) | client | request-response | `apps/dashboard/lib/auth-client.ts` | exact |
| `apps/mobile/lib/auth-context.tsx` (modified) | provider | event-driven | itself (add org state) | exact |
| `apps/mobile/components/org-switcher.tsx` (NEW) | component | request-response | mobile component pattern | role-match |
| 12 BullMQ processors (modified) | processor | event-driven | `apps/api/src/modules/door/door.processor.ts` | exact |
| 6 Socket.IO gateways (modified) | gateway | streaming | `apps/api/src/modules/door/door.gateway.ts` | exact |

## Pattern Assignments

### `apps/api/prisma/schema.prisma` (model — modified)

**Analog:** itself — extend with new models following existing conventions

**Enum pattern** (lines 1-69): Role enum already has SUPER_ADMIN, ADMIN, SUPERVISOR, OPERATOR, VIEWER, AUDITOR, MAINTENANCE_TEAM. New `InviteStatus` enum needed: `PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`.

**Model pattern** (lines 366-383, Site model):
```prisma
model Site {
  id        String   @id @default(uuid())
  name      String
  address   String?
  city      String?
  country   String   @default("SN")
  latitude  Float?
  longitude Float?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  cameras   Camera[]
  users     User[]
  zones     Zone[]
  doors     Door[]
  incidents Incident[]
}
```

**New Organization model pattern** (rename Site, add billing fields, add new relations):
- `stripeCustomerId String?`, `billingEmail String?`, `planTier String?`
- Replace `cameras Camera[]` relation: keep, update refs
- Add `members OrganizationMember[]`, `invites Invite[]`
- Add `auditLogs AuditLog[]`, `vehicleListEntries VehicleList[]`
- Add `featureFlags FeatureFlag[]`

**OrganizationMember pattern** (follow @@unique + @@index convention, lines 487, 545):
```prisma
model OrganizationMember {
  id             String   @id @default(uuid())
  userId         String
  organizationId String
  role           Role
  isActive       Boolean  @default(true)
  joinedAt       DateTime @default(now())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
  @@index([organizationId])
  @@index([userId])
}
```

**Invite model pattern** (follow Credential pattern lines 73-95):
```prisma
model Invite {
  id             String   @id @default(uuid())
  organizationId String
  email          String
  role           Role
  token          String   @unique
  status         String   @default("PENDING") // PENDING, ACCEPTED, EXPIRED, REVOKED
  createdById    String
  acceptedById   String?
  acceptedAt     DateTime?
  expiresAt      DateTime
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id])
  createdBy    User         @relation("InviteCreator", fields: [createdById], references: [id])
  acceptedBy   User?        @relation("InviteAcceptor", fields: [acceptedById], references: [id])

  @@index([organizationId])
  @@index([email, organizationId])
}
```

**FeatureFlag model pattern:**
```prisma
model FeatureFlag {
  id             String   @id @default(uuid())
  organizationId String
  key            String   // e.g., "advanced_analytics", "export_csv"
  enabled        Boolean  @default(false)
  tier           String?  // minimum tier: 'FREE', 'PROFESSIONAL', 'ENTERPRISE'
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id])

  @@unique([organizationId, key])
  @@index([organizationId])
}
```

**AuditLog extension pattern** (lines 490-506, existing model):
```prisma
model AuditLog {
  // ... existing fields ...
  organizationId String?       // NEW — tenant scope
  previousHash   String?       // NEW — SHA256 chain
  currentHash    String?       // NEW — SHA256(currentHash)
  content        String?       // NEW — pipe-delimited payload
  // existing: id, userId, action, entity, entityId, changes, ipAddress, createdAt
}
```

**User model modification pattern** (lines 406-432): Remove `role Role @default(VIEWER)` and `siteId String?` / `site Site?` relation. Add `memberships OrganizationMember[]`.

**Rename pattern:** `siteId` → `organizationId` on Camera (line 390), Door (line 100), Zone (line 121), Incident (line 190), VehicleList, User (remove FK). Rename `site` relation → `organization` on all models.

---

### `apps/api/src/common/middleware/tenant-context.middleware.ts` (middleware, request-response — NEW)

**Analog:** `apps/api/src/common/middleware/site-context.middleware.ts` (exact pattern match)

**Imports pattern** (lines 1-3):
```typescript
import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaService } from "../../modules/prisma/prisma.service";
```

**Core middleware pattern** (lines 13-36):
```typescript
@Injectable()
export class SiteContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SiteContextMiddleware.name);

  constructor(private prisma: PrismaService) {}

  async use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
    const user = (req as any).user;
    if (user?.siteId) {
      try {
        await this.prisma.$executeRawUnsafe(
          `SELECT set_config('app.current_site_id', $1, TRUE)`,
          user.siteId,
        );
      } catch (err: any) {
        this.logger.warn("Failed to set RLS context", err.message);
      }
    }
    next();
  }
}
```

**Key adaptations for TenantContextMiddleware:**
- Read `user?.orgId` instead of `user?.siteId`
- Set `app.current_organization_id` instead of `app.current_site_id`
- Add `orgContext.run(user.orgId, () => next())` wrapping (AsyncLocalStorage pattern from RESEARCH.md Pattern 2)
- Inject `orgContext` from `tenant-extension.ts`

**App module registration pattern** (from `apps/api/src/app.module.ts` lines 38-39, 100-103):
```typescript
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
// In configure():
consumer
  .apply(TenantContextMiddleware)
  .forRoutes('*');
```

---

### `apps/api/src/common/decorators/current-org.decorator.ts` (decorator, request-response — NEW)

**Analog:** `apps/api/src/common/decorators/public.decorator.ts` (exact pattern match)

**Lines 1-4 (public.decorator.ts):**
```typescript
import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**New decorator pattern:**
```typescript
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentOrg = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.orgId;
  },
);
```

---

### `apps/api/src/common/decorators/feature-gate.decorator.ts` (decorator, request-response — NEW)

**Analog:** `apps/api/src/common/decorators/roles.decorator.ts` (exact pattern match)

**Lines 1-4 (roles.decorator.ts):**
```typescript
import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

**New decorator pattern:**
```typescript
import { SetMetadata } from "@nestjs/common";

export const FEATURE_KEY = "requiredFeature";
export const RequiresFeature = (feature: string) => SetMetadata(FEATURE_KEY, feature);
```

---

### `apps/api/src/common/guards/roles.guard.ts` (guard, request-response — modified)

**Analog:** itself — extend to look up role from OrganizationMember

**Existing pattern** (lines 1-41, roles.guard.ts):
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { ROLE_HIERARCHY } from "@repo/shared";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY, [context.getHandler(), context.getClass()]
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException();

    const userLevel = ROLE_HIERARCHY[user.role as keyof typeof ROLE_HIERARCHY] ?? 0;
    // ... role comparison ...
  }
}
```

**Key modification:** `user.role` now comes from JWT (set by `JwtStrategy.validate()` which looks up OrganizationMember.role). The guard itself needs minimal change — `user.role` is already the per-org role resolved by the strategy.

---

### `apps/api/src/common/guards/tenant-isolation.guard.ts` (guard, request-response — NEW)

**Analog:** `apps/api/src/common/guards/roles.guard.ts` (same role, same import structure)

**Pattern to copy from roles.guard.ts lines 1-14:**
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

**Registration pattern** (from app.module.ts lines 93-96): Add as APP_GUARD:
```typescript
{ provide: APP_GUARD, useClass: TenantIsolationGuard },
```

---

### `apps/api/src/common/guards/feature-gate.guard.ts` (guard, request-response — NEW)

**Analog:** `apps/api/src/common/guards/roles.guard.ts` (same NestJS guard structure)

**Pattern to copy** (from roles.guard.ts lines 1-7, 16-25): Same import style, `Reflector` injection, `FEATURE_KEY` metadata lookup (from RESEARCH.md Pattern 8).

---

### `apps/api/src/modules/prisma/tenant-extension.ts` (utility, transform — NEW)

**Analog:** NONE in codebase — first Prisma Client Extension. Use pattern from RESEARCH.md Pattern 1 (lines 256-337).

**Key considerations:**
- `Prisma.defineExtension` is the Prisma-native pattern
- `$allModels.$allOperations` intercepts all queries
- `SCOPED_MODELS` Set filters which models to scope
- Use `AsyncLocalStorage` for request-scoped orgId (Node.js built-in, no dependency needed)
- Export `orgContext` store for middleware to populate

---

### `apps/api/src/modules/prisma/prisma.service.ts` (service, CRUD — modified)

**Analog:** itself — extend `onModuleInit()` to attach the tenant extension

**Existing pattern** (lines 1-23, prisma.service.ts):
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("Database connected");
    } catch (e) {
      this.logger.error("Database connection failed:" + (e instanceof Error ? e.message : e));
      this.logger.warn("Server will start without database — some features may be unavailable");
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**Key modification:** Attach `tenantExtension` in `onModuleInit()` via `this.$extends()`:
```typescript
import { tenantExtension } from "./tenant-extension";

async onModuleInit() {
  // Attach tenant isolation BEFORE connecting
  this.$extends(tenantExtension);
  // ... existing connect logic ...
}
```

**Note:** The `$extends` call must happen BEFORE `$connect`. Since `PrismaService extends PrismaClient`, call `this.$extends()` at the top of `onModuleInit()`, before `await this.$connect()`.

---

### `apps/api/src/modules/organization/organization.module.ts` (module, CRUD — NEW)

**Analog:** `apps/api/src/modules/site/site.module.ts` (exact pattern match)

**Lines 1-9 (site.module.ts):**
```typescript
import { Module } from "@nestjs/common";
import { SiteController } from "./site.controller";
import { SiteService } from "./site.service";

@Module({
  controllers: [SiteController],
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
```

**New module will be structurally identical:**
```typescript
import { Module } from "@nestjs/common";
import { OrganizationController } from "./organization.controller";
import { OrganizationService } from "./organization.service";

@Module({
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
```

---

### `apps/api/src/modules/organization/organization.controller.ts` (controller, CRUD — NEW)

**Analog:** `apps/api/src/modules/site/site.controller.ts` (exact match)

**Imports pattern** (lines 1-17):
```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { SiteService } from './site.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { createSiteSchema, updateSiteSchema } from '@repo/shared';
```

**Core CRUD pattern** (lines 19-103, site.controller.ts):
```typescript
@Controller('sites')
export class SiteController {
  constructor(
    private siteService: SiteService,
    private auditService: AuditService,
  ) {}

  @Get()
  async findAll(@Query('isActive') isActive?: string, @Query('city') city?: string,
    @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.siteService.findAll({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      city, page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.siteService.findById(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  async create(@Body(new ZodValidationPipe(createSiteSchema)) body: any, @Req() req: FastifyRequest) {
    const result = await this.siteService.create(body);
    await this.auditService.log({ userId: (req as any).user?.id, action: 'CREATE', entity: 'site', entityId: result.id, request: req });
    return result;
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async update(@Param('id') id: string, @Body(new ZodValidationPipe(updateSiteSchema)) body: any, @Req() req: FastifyRequest) {
    const result = await this.siteService.update(id, body);
    await this.auditService.log({ userId: (req as any).user?.id, action: 'UPDATE', entity: 'site', entityId: id, changes: /* ... */, request: req });
    return result;
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  async remove(@Param('id') id: string, @Req() req: FastifyRequest) {
    const result = await this.siteService.remove(id);
    await this.auditService.log({ userId: (req as any).user?.id, action: 'DELETE', entity: 'site', entityId: id, request: req });
    return result;
  }
}
```

**Key adaptations:**
- `@Controller('organizations')` instead of `'sites'`
- All `@Roles('ADMIN', 'SUPER_ADMIN')` guards stay (SUPER_ADMIN is org admin now)
- Use `createOrganizationSchema` / `updateOrganizationSchema` from `@repo/shared`
- Audit entity changed from `'site'` to `'organization'`

---

### `apps/api/src/modules/organization/organization.service.ts` (service, CRUD — NEW)

**Analog:** `apps/api/src/modules/site/site.service.ts` (exact match)

**Imports pattern** (lines 1-3):
```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
```

**Core service pattern** (lines 5-53, site.service.ts):
```typescript
@Injectable()
export class SiteService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { isActive?: boolean; city?: string; page?: number; limit?: number }) {
    const where: Prisma.SiteWhereInput = {};
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.city) where.city = { contains: filters.city, mode: "insensitive" };

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.site.findMany({ where, skip, take: limit,
        include: { _count: { select: { cameras: true, users: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.site.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findById(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: { cameras: true, _count: { select: { users: true } } },
    });
    if (!site) throw new NotFoundException("Site not found");
    return site;
  }

  async create(data: Prisma.SiteCreateInput) {
    return this.prisma.site.create({ data });
  }

  async update(id: string, data: Prisma.SiteUpdateInput) {
    await this.findById(id);
    return this.prisma.site.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.site.update({ where: { id }, data: { isActive: false } });
  }
}
```

**Key adaptations:**
- `PrismaService` — tenant extension auto-scopes queries by orgId
- `Prisma.SiteWhereInput` → `Prisma.OrganizationWhereInput`
- Delete uses soft delete (`isActive: false`) — same pattern
- No explicit `organizationId` in queries — Prisma extension handles it

---

### `apps/api/src/modules/organization/invite/invite.controller.ts` (controller, CRUD — NEW)

**Analog:** `apps/api/src/modules/auth/auth.controller.ts` (role-match — same NestJS decorator pattern)

**Imports** (from auth.controller.ts lines 1-26):
```typescript
import { Controller, Post, Body, Req, UseGuards, HttpCode, HttpStatus, Get, Param, Delete } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
```

**Core pattern** (from auth.controller.ts lines 28-59, POST handler):
```typescript
@ApiTags('invites')
@Controller('organizations/:orgId/invites')
export class InviteController {
  constructor(private inviteService: InviteService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  async create(@Param('orgId') orgId: string, @Body(new ZodValidationPipe(createInviteSchema)) body: any, @Req() req: FastifyRequest) {
    return this.inviteService.createInvite(orgId, body.email, body.role, (req as any).user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  async list(@Param('orgId') orgId: string) {
    return this.inviteService.listInvites(orgId);
  }

  @Post(':inviteId/resend')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  async resend(@Param('orgId') orgId: string, @Param('inviteId') inviteId: string) {
    return this.inviteService.resendInvite(orgId, inviteId);
  }

  @Delete(':inviteId')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  async revoke(@Param('orgId') orgId: string, @Param('inviteId') inviteId: string) {
    return this.inviteService.revokeInvite(orgId, inviteId);
  }
}
```

**Public accept endpoint (separate or on auth controller):**
```typescript
@Public()
@Post('accept-invite')
async acceptInvite(@Body(new ZodValidationPipe(acceptInviteSchema)) body: any) {
  return this.inviteService.acceptInvite(body.token, body.password, body.firstName, body.lastName);
}
```

---

### `apps/api/src/modules/organization/invite/invite.service.ts` (service, CRUD — NEW)

**Analog:** `apps/api/src/modules/notifications/notifications.service.ts` for Resend pattern + `apps/api/src/modules/auth/auth.service.ts` for JWT pattern

**Resend import and init pattern** (from notifications.service.ts lines 1-4, 20-27):
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Resend } from 'resend';

// In constructor:
this.emailFrom = this.config.get<string>('RESEND_FROM_EMAIL', 'OVERSIGHT AI <onboarding@resend.dev>');
const resendApiKey = this.config.get<string>('RESEND_API_KEY');
if (resendApiKey) {
  this.resend = new Resend(resendApiKey);
}
```

**JWT pattern** (from auth.service.ts lines 1-9, 163-184):
```typescript
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from "bcryptjs";

// Token creation:
this.jwt.sign(
  { orgId, email, role, type: "invite" },
  { secret: this.config.get("JWT_INVITE_SECRET"), expiresIn: "48h" }
);
```

**Error handling pattern** (from auth.service.ts lines 32-34):
```typescript
import { ConflictException, BadRequestException, NotFoundException } from "@nestjs/common";
// Single-line guard clauses
if (existing) throw new ConflictException("Email already registered");
```

---

### `apps/api/src/modules/auth/strategies/jwt.strategy.ts` (strategy, request-response — modified)

**Analog:** itself — extend `validate()` to include `orgId` and verify membership

**Existing pattern** (lines 1-18, jwt.strategy.ts):
```typescript
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_SECRET", "change-me-access-secret-in-prod"),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

**Key modifications:**
- Add `orgId: string` to payload type: `{ sub: string; email: string; orgId: string; role: string }`
- Inject `PrismaService` for membership verification
- `validate()` now calls `this.prisma.organizationMember.findUnique()` to verify membership is still active
- Return `{ id, email, orgId, role }` — role from DB (not JWT claim) per RESEARCH.md Pattern 5

---

### `apps/api/src/modules/auth/auth.service.ts` (service, CRUD — modified)

**Analog:** itself — extend `register`, `login`, `createTokens`, add `switchOrg`

**Existing register pattern** (lines 21-59):
```typescript
async register(data: { email: string; password: string; firstName: string; lastName: string; role?: string; siteId?: string }) {
  const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ConflictException("Email already registered");
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await this.prisma.user.create({
    data: { email: data.email, password: passwordHash, firstName: data.firstName, lastName: data.lastName, role: (data.role as Role) || "VIEWER", siteId: data.siteId || undefined },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });
  const { accessToken, refreshToken } = await this.createTokens(user.id, user.email, user.role);
  return { accessToken, refreshToken, user };
}
```

**Key modifications:**
- `register()` accepts `organizationName` instead of `siteId`; creates Org+User+Member in `$transaction` (RESEARCH.md Pattern lines 1002-1059)
- `login()` now resolves org context: check `OrganizationMember` to get user's org, set role from membership
- `createTokens()` signature changes: `(userId, email, orgId, role)`
- JWT payload now includes `orgId`: `{ sub: userId, email, orgId, role }`
- New `switchOrg(userId, targetOrgId)` method: validates membership, returns new tokens with new org context (RESEARCH.md Pattern 5 lines 592-615)

**Transaction pattern** (from RESEARCH.md lines 971-978):
```typescript
await this.prisma.$transaction(async (tx) => {
  const org = await tx.organization.create({ data: { name: orgName } });
  const user = await tx.user.create({ data: { email, password, firstName, lastName } });
  await tx.organizationMember.create({ data: { userId: user.id, organizationId: org.id, role: "ADMIN" } });
});
```

---

### `apps/api/src/modules/auth/auth.controller.ts` (controller, request-response — modified)

**Analog:** itself — add `switch-org` endpoint following existing endpoint pattern

**Existing pattern for protected endpoints** (lines 141-171, `logout` handler):
```typescript
@UseGuards(JwtAuthGuard)
@Post('logout')
@HttpCode(HttpStatus.OK)
async logout(@Req() req: FastifyRequest, @Body() body: { refreshToken?: string },
  @Res({ passthrough: true }) res: FastifyReply) {
  const userId = (req as any).user.id;
  const refreshToken = body.refreshToken || req.cookies?.refreshToken;
  await this.authService.logout(userId, refreshToken);
  res.clearCookie('refreshToken', { path: '/api/auth' });
  await this.auditService.log({ userId, action: 'LOGOUT', entity: 'user', entityId: userId, request: req });
  return { message: 'Logged out' };
}
```

**New switch-org endpoint pattern:**
```typescript
@UseGuards(JwtAuthGuard)
@Post('switch-org')
@HttpCode(HttpStatus.OK)
async switchOrg(@Req() req: FastifyRequest, @Body() body: { organizationId: string },
  @Res({ passthrough: true }) res: FastifyReply) {
  const userId = (req as any).user.id;
  const result = await this.authService.switchOrg(userId, body.organizationId);
  // Set cookie, audit log, return tokens (same pattern as login)
}
```

**Modified register:** Accept `organizationName` in body; return `organization` in response.

---

### `apps/api/src/app.module.ts` (module, config — modified)

**Analog:** itself — add imports and middleware

**Existing pattern** (lines 1-115): Add `OrganizationModule` to imports array (same style as `SiteModule` at line 12). Register `TenantContextMiddleware` in `configure()` instead of (or alongside) `SiteContextMiddleware` at lines 100-103.

Add `FeatureGateModule` and `OrganizationModule` to imports.

---

### `apps/api/prisma/seed.ts` (migration, batch — modified)

**Analog:** itself — extend seed data

**Existing pattern** (lines 1-54): 
- `PrismaClient` instantiation, env-driven config
- `upsert` pattern for idempotent seeds
- Two modes: `production` and `sample`

**Key modifications:**
- `site.upsert` → `organization.upsert` (with `planTier: 'FREE'`)
- After creating admin user, create `OrganizationMember` row linking user to default org with `role: 'ADMIN'`
- For sample mode: create OrganizationMember rows for supervisor, viewer users too

---

### `packages/shared/src/schemas/organization.schema.ts` (schema, request-response — NEW)

**Analog:** `packages/shared/src/schemas/site.schema.ts` (exact match)

**Lines 1-24 (site.schema.ts):**
```typescript
import { z } from "zod";

export const createSiteSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default("SN"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isActive: z.boolean().default(true),
});

export const updateSiteSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isActive: z.boolean().optional(),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
```

---

### `packages/shared/src/schemas/invite.schema.ts` (schema, request-response — NEW)

**Analog:** `packages/shared/src/schemas/auth.schema.ts` (same Zod pattern, similar validation)

**Lines 1-23 (auth.schema.ts):**
```typescript
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  role: z.enum(["ADMIN", "SUPERVISOR", "OPERATOR", "VIEWER"]).optional(),
  siteId: z.string().uuid().optional(),
});
```

**New schemas:**
```typescript
export const createInviteSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["ADMIN", "SUPERVISOR", "OPERATOR", "VIEWER"]),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, "Token requis"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
});
```

---

### `packages/shared/src/schemas/auth.schema.ts` (schema, request-response — modified)

**Analog:** itself — extend register + add switchOrg schema

**Existing register schema** (lines 3-10): Add `organizationName: z.string().min(1, "Le nom de l'organisation est requis")`. Remove `siteId` field.

**New switchOrg schema:**
```typescript
export const switchOrgSchema = z.object({
  organizationId: z.string().uuid("ID d'organisation invalide"),
});
```

---

### `packages/shared/src/index.ts` (barrel — modified)

**Analog:** itself — add new exports following existing pattern

**Existing pattern** (lines 25-28, site schema export):
```typescript
export { createSiteSchema, updateSiteSchema } from "./schemas/site.schema";
export type { CreateSiteInput, UpdateSiteInput } from "./schemas/site.schema";
```

Add analogous lines for `organization.schema.ts` and `invite.schema.ts`.

---

### `apps/dashboard/lib/api.ts` (client, request-response — modified)

**Analog:** itself — add types and functions following existing patterns

**Existing pattern for CRUD functions** (lines 210-217, `createSite`):
```typescript
export async function createSite(data: { name: string; address?: string; city?: string; country?: string }): Promise<Site> {
  const res = await fetchWithAuth(`${API_URL}/api/sites`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create site");
  return res.json();
}
```

**New functions to add:**
- `Organization` interface (extends `Site` fields + `stripeCustomerId`, `billingEmail`, `planTier`, `members?`)
- `OrganizationMember` interface
- `fetchOrganizations()` → `GET /api/organizations`
- `createOrganization(data)` → `POST /api/organizations`
- `switchOrganization(orgId)` → `POST /api/auth/switch-org`
- `fetchMembers(orgId)` → `GET /api/organizations/:orgId/members`
- `fetchInvites(orgId)` → `GET /api/organizations/:orgId/invites`
- `createInvite(orgId, data)` → `POST /api/organizations/:orgId/invites`
- `acceptInvite(data)` → `POST /api/auth/accept-invite`

---

### `apps/dashboard/lib/auth-client.ts` (client, request-response — modified)

**Analog:** itself — add `switchOrganization` function following existing `logout` pattern

**Existing logout pattern** (lines 69-83):
```typescript
export async function logout(): Promise<void> {
  const token = getAccessToken();
  await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
  }
}
```

**New function pattern:**
```typescript
export async function switchOrganization(orgId: string): Promise<AuthResult> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/api/auth/switch-org`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
    body: JSON.stringify({ organizationId: orgId }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.message || "Échec du changement d'organisation" };
  // Store new tokens and user
  if (typeof window !== "undefined") {
    sessionStorage.setItem("accessToken", data.accessToken);
    sessionStorage.setItem("user", JSON.stringify(data.user));
  }
  return { accessToken: data.accessToken, user: data.user };
}
```

---

### `apps/dashboard/lib/auth-context.tsx` (provider, event-driven — modified)

**Analog:** itself — add organization state to AuthContext

**Existing pattern** (lines 1-60, auth-context.tsx):
```typescript
"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

interface User { id: string; email: string; firstName: string; lastName: string; role: string; }

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}
```

**Key modifications:**
- Add `organization: { id: string; name: string } | null` to AuthContextType
- Add `switchOrg: (orgId: string) => Promise<void>` to AuthContextType
- Store organization info in sessionStorage alongside user
- After `switchOrg` call, update context state and trigger page redirect

---

### `apps/dashboard/components/org-switcher.tsx` (component, request-response — NEW)

**Analog:** shadcn/ui pattern — drop-down menu component. Look at `apps/dashboard/components/ui/dropdown-menu.tsx` for Radix UI based dropdown pattern.

**General pattern:** Use `@radix-ui/react-dropdown-menu` + `lucide-react` icons + Tailwind classes with `cn()` utility. Follow existing component file patterns: named function declaration, explicit props interfaces.

---

### `apps/mobile/lib/api.ts` (client, request-response — modified)

**Analog:** `apps/dashboard/lib/api.ts` (identical pattern, different auth storage)

**Existing mobile pattern** (lines 1-2): Uses `fetchWithAuth` from `@/lib/auth-client` and `API_URL` from `@/lib/config`. Same `fetchWithAuth` pattern as dashboard, same error handling.

Add same organization-related types and functions as dashboard `api.ts`.

---

### `apps/mobile/lib/auth-client.ts` (client, request-response — modified)

**Analog:** `apps/dashboard/lib/auth-client.ts` (identical pattern, uses `expo-secure-store` instead of `sessionStorage`)

Add `switchOrganization` function following the same pattern as dashboard, using `saveTokens`/`saveUser` for persistence.

---

### `apps/mobile/lib/auth-context.tsx` (provider, event-driven — modified)

**Analog:** `apps/dashboard/lib/auth-context.tsx` (identical pattern, React Native conventions)

Add same organization state and `switchOrg` method as dashboard context.

---

### `apps/mobile/components/org-switcher.tsx` (component, request-response — NEW)

**Analog:** General React Native component pattern from mobile app — follow `StyleSheet.create`, function components, `useAuth()` hook pattern. Use `lucide-react-native` for icons.

---

### 12 BullMQ processors (processor, event-driven — modified)

**Analog:** `apps/api/src/modules/door/door.processor.ts` (exact match)

**Imports pattern** (lines 1-8, door.processor.ts):
```typescript
import { Logger, Inject } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
```

**Processor class pattern** (lines 9-28, door.processor.ts):
```typescript
@Processor("door-alerts")
export class DoorProcessor extends WorkerHost {
  private readonly logger = new Logger(DoorProcessor.name);

  constructor(
    private prisma: PrismaService,
    private alertService: AlertService,
    @Inject("REDIS") private redis: Redis,
  ) {
    super();
  }

  async process(job: Job<DoorAlertJob, any, string>): Promise<any> {
    switch (job.name) {
      case "evaluate-door-alert": return this.evaluateDoorAlert(job.data);
      default: this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
```

**Key modifications for all 12 processors:**
- Read `orgId` from `job.data.orgId` at the top of each processing method
- Call `this.prisma.$executeRawUnsafe('SELECT set_config(...)')` before any DB queries (or use `withTenantContext` helper)
- Job data schema must include `orgId: string` field in all queue producers

**Affected processors:** `door`, `inference`, `audit`, `anpr`, `governance`, `patterns`, `ai`, `tailgating`, `correlation`, `notifications`, `access`, `incident`

---

### 6 Socket.IO gateways (gateway, streaming — modified)

**Analog:** `apps/api/src/modules/door/door.gateway.ts` (exact match)

**Imports pattern** (lines 1-10, door.gateway.ts):
```typescript
import { Logger } from "@nestjs/common";
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { OnEvent } from "@nestjs/event-emitter";
```

**Gateway class pattern** (lines 12-73, door.gateway.ts):
```typescript
@WebSocketGateway({ namespace: "/ws/doors" })
export class DoorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DoorGateway.name);
  @WebSocketServer() server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Door WS client connected: ${client.id}`);
  }
  // ... SubscribeMessage handlers, OnEvent listeners ...
}
```

**Key modifications for all 6 gateways:**
- `handleConnection(client)`: extract `orgId` from JWT (auth handshake data), store it on `client.data.orgId`
- Room naming: `site:${siteId}` → `org:${orgId}` in `subscribe` handlers
- `@OnEvent` handlers: emit to `org:${orgId}` room instead of `site:${siteId}`
- Optionally disconnect clients with no valid orgId in connection

**Affected gateways:** `door`, `access`, `incident`, `visitor`, `analytics`, `risk`

---

## Shared Patterns

### Authentication — JWT Guard + Strategy
**Source:** `apps/api/src/common/guards/jwt-auth.guard.ts` + `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
**Apply to:** All controller files, middleware, WebSocket gateways

```typescript
// Guards: Use @UseGuards(JwtAuthGuard) for protected endpoints (auth.controller.ts line 141)
// Public: Use @Public() decorator for open endpoints (auth.controller.ts line 36)
// User extraction: (req as any).user.id, (req as any).user.orgId, (req as any).user.email
```

### NestJS Module Pattern
**Source:** `apps/api/src/modules/site/site.module.ts`
**Apply to:** All new modules

```typescript
@Module({
  controllers: [XController],
  providers: [XService],
  exports: [XService], // if needed by other modules
})
export class XModule {}
```

### Error Handling: NestJS Exceptions
**Source:** `apps/api/src/modules/auth/auth.service.ts` lines 1-5
**Apply to:** All service and controller files

```typescript
import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
// Single-line guards:
if (!entity) throw new NotFoundException("Entity not found");
if (existing) throw new ConflictException("Already exists");
```

### Validation: ZodValidationPipe
**Source:** `apps/api/src/modules/auth/auth.controller.ts` line 43
**Apply to:** All controller POST/PUT/PATCH handlers

```typescript
@Body(new ZodValidationPipe(schemaName)) body: any
```

### Auditable Operations
**Source:** `apps/api/src/modules/site/site.controller.ts` lines 53-58
**Apply to:** All controller handlers that modify data

```typescript
await this.auditService.log({
  userId: (req as any).user?.id,
  action: 'CREATE',
  entity: 'entityName',
  entityId: result.id,
  request: req,
});
```

### Dashboard API Client: fetchWithAuth
**Source:** `apps/dashboard/lib/auth-client.ts` lines 102-131
**Apply to:** All dashboard API functions

```typescript
export async function fetchSomething(params): Promise<SomethingType> {
  const res = await fetchWithAuth(`${API_URL}/api/endpoint${queryString}`);
  if (!res.ok) throw new Error("Failed to fetch something");
  return res.json();
}
```

### Dashboard API Client: Mutation Pattern
**Source:** `apps/dashboard/lib/api.ts` lines 210-217
**Apply to:** All dashboard write operations

```typescript
export async function createSomething(data: SomethingInput): Promise<SomethingType> {
  const res = await fetchWithAuth(`${API_URL}/api/something`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create something");
  return res.json();
}
```

### Shared Schema: Zod Export Pattern
**Source:** `packages/shared/src/index.ts` lines 25-28
**Apply to:** All new shared schemas

```typescript
// In index.ts barrel:
export { createXSchema, updateXSchema } from "./schemas/x.schema";
export type { CreateXInput, UpdateXInput } from "./schemas/x.schema";
```

### Prisma Seed: Upsert Pattern
**Source:** `apps/api/prisma/seed.ts` lines 24-37
**Apply to:** All seed operations

```typescript
const admin = await prisma.user.upsert({
  where: { email: ADMIN_EMAIL },
  update: { password: adminPassword },
  create: { email: ADMIN_EMAIL, password: adminPassword, firstName, lastName, role, isActive: true },
});
```

### Logging: NestJS Logger
**Source:** `apps/api/src/common/middleware/site-context.middleware.ts` lines 15, 29; `apps/api/src/modules/prisma/prisma.service.ts` lines 9, 14-17
**Apply to:** All new middleware, services, gateways, processors

```typescript
import { Logger } from "@nestjs/common";
private readonly logger = new Logger(ClassName.name);
this.logger.log("Message"); this.logger.warn("Warning"); this.logger.error("Error");
```

### Frontend Auth Context: React Context Pattern
**Source:** `apps/dashboard/lib/auth-context.tsx` lines 1-60
**Apply to:** Dashboard org state extension

```typescript
"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
// Provider wraps children, uses useEffect for init, sessionStorage for persistence
```

### Mobile Auth Context: Expo SecureStore Pattern
**Source:** `apps/mobile/lib/auth-context.tsx` lines 1-80
**Apply to:** Mobile org state extension

```typescript
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getUserAsync, getAccessTokenAsync } from "@/lib/auth-storage";
// Uses expo-secure-store via auth-storage module for token persistence
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/api/src/modules/prisma/tenant-extension.ts` | utility | transform | First Prisma Client Extension in the codebase — use RESEARCH.md Pattern 1 directly |
| `apps/api/src/common/helpers/tenant-worker.ts` | utility | event-driven | New helper pattern for BullMQ workers — no existing shared worker helpers. Build from RESEARCH.md Pattern "Pitfall 2" |

For `tenant-extension.ts`, the detailed implementation is provided in RESEARCH.md Pattern 1 (lines 256-371). The planner should use the `AsyncLocalStorage` variant for request-scoped `orgId`.

For `tenant-worker.ts`, use the `withTenantContext()` helper from RESEARCH.md (approximately line 942-953) which wraps `prisma.$executeRawUnsafe` with `SET app.current_organization_id` and `orgContext.run()`.

---

## Metadata

**Analog search scope:** `apps/api/src/`, `apps/dashboard/lib/`, `apps/mobile/lib/`, `packages/shared/src/`, `apps/api/prisma/`
**Files scanned:** 19 analog files + RESEARCH.md + CONTEXT.md
**Pattern extraction date:** 2026-07-15
**Analogs found:** 31 / 33 (2 files have no codebase analog — use RESEARCH.md patterns)
