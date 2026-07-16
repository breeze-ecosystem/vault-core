# Phase 10: Enterprise Grade - Pattern Map

**Mapped:** 2026-07-16
**Files analyzed:** 56 (new + modified)
**Analogs found:** 54 / 56

## File Classification

### New API Modules (Backend NestJS)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/api/src/modules/sso/sso.module.ts` | module | request-response | `apps/api/src/modules/auth/auth.module.ts` | exact |
| `apps/api/src/modules/sso/sso.controller.ts` | controller | request-response | `apps/api/src/modules/auth/auth.controller.ts` | exact |
| `apps/api/src/modules/sso/sso.service.ts` | service | request-response | `apps/api/src/modules/auth/auth.service.ts` | exact |
| `apps/api/src/modules/sso/strategies/saml.strategy.ts` | strategy | request-response | `apps/api/src/modules/auth/strategies/jwt.strategy.ts` | exact |
| `apps/api/src/modules/sso/strategies/oidc.strategy.ts` | strategy | request-response | `apps/api/src/modules/auth/strategies/jwt.strategy.ts` | exact |
| `apps/api/src/modules/sso/dto/idp-config.dto.ts` | DTO | request-response | `packages/shared/src/schemas/governance.schema.ts` | role-match |
| `apps/api/src/modules/api-key/api-key.module.ts` | module | CRUD | `apps/api/src/modules/governance/governance.module.ts` | role-match |
| `apps/api/src/modules/api-key/api-key.controller.ts` | controller | CRUD | `apps/api/src/modules/license/license.controller.ts` | exact |
| `apps/api/src/modules/api-key/api-key.service.ts` | service | CRUD | `apps/api/src/modules/license/license.service.ts` | exact |
| `apps/api/src/modules/api-key/guards/tenant-api-key.guard.ts` | guard | request-response | `apps/api/src/modules/license/guards/license-api-key.guard.ts` | exact |
| `apps/api/src/modules/api-key/middleware/api-key-rate-limit.ts` | middleware | request-response | `apps/api/src/common/guards/feature-gate.guard.ts` | role-match |
| `apps/api/src/modules/api-key/dto/create-api-key.dto.ts` | DTO | CRUD | `packages/shared/src/schemas/license.schema.ts` | exact |
| `apps/api/src/modules/webhook/webhook.module.ts` | module | event-driven | `apps/api/src/modules/governance/governance.module.ts` | role-match |
| `apps/api/src/modules/webhook/webhook.controller.ts` | controller | CRUD | `apps/api/src/modules/governance/governance.controller.ts` | exact |
| `apps/api/src/modules/webhook/webhook.service.ts` | service | event-driven | `apps/api/src/modules/notifications/notifications.service.ts` | exact |
| `apps/api/src/modules/webhook/webhook.processor.ts` | processor | event-driven | `apps/api/src/modules/governance/governance.processor.ts` | exact |
| `apps/api/src/modules/webhook/webhook.gateway.ts` | gateway | event-driven | `apps/api/src/modules/door/door.gateway.ts` | exact |
| `apps/api/src/modules/webhook/dto/create-subscription.dto.ts` | DTO | CRUD | `packages/shared/src/schemas/governance.schema.ts` | role-match |
| `apps/api/src/modules/webhook/dto/webhook-event.dto.ts` | DTO | event-driven | `packages/shared/src/schemas/governance.schema.ts` | role-match |
| `apps/api/src/modules/compliance/compliance.module.ts` | module | request-response | `apps/api/src/modules/governance/governance.module.ts` | role-match |
| `apps/api/src/modules/compliance/compliance.controller.ts` | controller | request-response | `apps/api/src/modules/governance/governance.controller.ts` | exact |
| `apps/api/src/modules/compliance/compliance.service.ts` | service | file-I/O | `apps/api/src/modules/incident/incident.service.ts` | exact |
| `apps/api/src/modules/compliance/templates/soc2-report.hbs` | template | file-I/O | `apps/api/src/modules/incident/incident.service.ts` (inline template) | role-match |
| `apps/api/src/modules/compliance/templates/iso27001-report.hbs` | template | file-I/O | `apps/api/src/modules/incident/incident.service.ts` (inline template) | role-match |
| `apps/api/src/modules/compliance/templates/access-review.hbs` | template | file-I/O | `apps/api/src/modules/incident/incident.service.ts` (inline template) | role-match |

### Extended API Modules

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/api/src/modules/auth/auth.controller.ts` (extend) | controller | request-response | itself — existing pattern | exact |
| `apps/api/src/modules/auth/auth.service.ts` (extend) | service | request-response | itself — existing pattern | exact |
| `apps/api/src/modules/governance/governance.service.ts` (extend) | service | CRUD + batch | itself — existing pattern | exact |
| `apps/api/src/modules/governance/governance.controller.ts` (extend) | controller | CRUD | itself — existing pattern | exact |
| `apps/api/src/modules/license/license.service.ts` (extend) | service | CRUD | itself — existing pattern | exact |
| `apps/api/src/modules/organization/organization.service.ts` (extend) | service | CRUD | itself — existing pattern | exact |
| `apps/api/src/modules/audit/audit.service.ts` (extend) | service | CRUD | itself — existing pattern | exact |
| `apps/api/src/modules/audit/audit.controller.ts` (extend) | controller | CRUD | itself — existing pattern | exact |

### API Infrastructure

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/api/prisma/schema.prisma` (modify) | model | CRUD | itself — existing pattern | exact |
| `apps/api/src/main.ts` (extend) | config | request-response | itself — existing pattern | exact |
| `apps/api/src/config/configuration.ts` (extend) | config | request-response | itself — existing pattern | exact |
| `apps/api/src/app.module.ts` (extend) | module | request-response | itself — existing pattern | exact |
| `apps/api/src/modules/queue/queue.module.ts` (extend) | module | event-driven | itself — existing pattern | exact |

### Dashboard (Next.js)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/dashboard/app/(dashboard)/parametres/page.tsx` (extend) | component | request-response | itself — existing pattern | exact |
| `apps/dashboard/app/(dashboard)/conformite/page.tsx` (new) | component | request-response | `apps/dashboard/app/(dashboard)/gouvernance/page.tsx` | exact |
| `apps/dashboard/app/(dashboard)/api-keys/page.tsx` (new) | component | CRUD | `apps/dashboard/app/(dashboard)/parametres/page.tsx` | role-match |
| `apps/dashboard/app/(dashboard)/webhooks/page.tsx` (new) | component | CRUD | `apps/dashboard/app/(dashboard)/parametres/page.tsx` | role-match |
| `apps/dashboard/app/(dashboard)/command-center/page.tsx` (extend) | component | streaming | itself — existing pattern | exact |
| `apps/dashboard/app/(auth)/login/page.tsx` (extend) | component | request-response | itself — existing pattern | exact |
| `apps/dashboard/components/sso/` (new) | component | request-response | existing ui/ components (shadcn forms) | role-match |
| `apps/dashboard/components/api-keys/` (new) | component | CRUD | existing ui/ components (shadcn tables) | role-match |
| `apps/dashboard/components/webhooks/` (new) | component | CRUD | existing ui/ components | role-match |
| `apps/dashboard/components/compliance/` (new) | component | request-response | existing ui/ components | role-match |
| `apps/dashboard/components/branding/` (new) | component | request-response | existing ui/ components | role-match |
| `apps/dashboard/lib/nav-config.ts` (extend) | config | request-response | itself — existing pattern | exact |

### Mobile (Expo)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/mobile/app/(tabs)/incidents.tsx` (extend) | component | request-response | itself — existing pattern | exact |
| `apps/mobile/app/incident/[id].tsx` (extend) | component | request-response | itself — existing pattern | exact |
| `apps/mobile/app/(tabs)/guard/nfc-scan.tsx` (new) | component | request-response | `apps/mobile/app/(tabs)/incidents.tsx` | role-match |
| `apps/mobile/app/(tabs)/guard/qr-checkin.tsx` (new) | component | request-response | `apps/mobile/app/(tabs)/incidents.tsx` | role-match |
| `apps/mobile/app/(tabs)/guard/door-control.tsx` (new) | component | request-response | `apps/mobile/app/(tabs)/incidents.tsx` | role-match |
| `apps/mobile/components/nfc-scanner.tsx` (new) | component | request-response | existing mobile components | role-match |
| `apps/mobile/components/qr-scanner.tsx` (new) | component | request-response | existing mobile components | role-match |
| `apps/mobile/components/photo-capture.tsx` (new) | component | request-response | existing mobile components | role-match |
| `apps/mobile/lib/offline-storage.ts` (extend) | utility | file-I/O | itself — existing pattern | exact |

### Shared Package

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/shared/src/schemas/sso.schema.ts` (new) | schema | request-response | `packages/shared/src/schemas/license.schema.ts` | role-match |
| `packages/shared/src/schemas/api-key.schema.ts` (new) | schema | CRUD | `packages/shared/src/schemas/license.schema.ts` | exact |
| `packages/shared/src/schemas/webhook.schema.ts` (new) | schema | CRUD | `packages/shared/src/schemas/governance.schema.ts` | role-match |
| `packages/shared/src/schemas/compliance.schema.ts` (new) | schema | request-response | `packages/shared/src/schemas/governance.schema.ts` | role-match |
| `packages/shared/src/index.ts` (extend) | barrel | — | itself — existing pattern | exact |

---

## Pattern Assignments

### 1. SSO Module (`apps/api/src/modules/sso/`)

#### `sso.module.ts` (module, request-response)

**Analog:** `apps/api/src/modules/auth/auth.module.ts` (lines 1-19)

**Imports pattern** (lines 1-8):
```typescript
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
// ... additional imports
```

**Core module pattern** (lines 10-19):
```typescript
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({}),
    OrganizationModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

**Apply to SsoModule:** Register PassportModule (no default strategy — dynamic), import JwtModule for token exchange, provide SamlStrategy + OidcStrategy, export SsoService.

---

#### `sso.controller.ts` (controller, request-response)

**Analog:** `apps/api/src/modules/auth/auth.controller.ts` (lines 1-80)

**Imports pattern** (lines 1-12):
```typescript
import {
  Controller, Post, Get, Body, Res, UseGuards, Req, HttpCode, HttpStatus, UnauthorizedException,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Public } from "../../common/decorators/public.decorator";
```

**@Public() route pattern** (lines 37-44):
```typescript
@Public()
@Post("register")
@ApiOperation({ summary: "Register a new user account" })
@ApiBody({ type: RegisterDto })
@ApiResponse({ status: 201, description: "User registered successfully" })
async register(@Body(new ZodValidationPipe(registerSchema)) body: any) {
  const result = await this.authService.register(body);
  // ...
}
```

**SSO controller routes:** All routes are `@Public()` — no JWT required. SAML callback: `POST /api/auth/sso/saml/callback`. OIDC callback: `GET /api/auth/sso/oidc/callback`. SAML init: `GET /api/auth/sso/saml/login`. OIDC init: `GET /api/auth/sso/oidc/login`.

---

#### `sso.service.ts` (service, request-response)

**Analog:** `apps/api/src/modules/auth/auth.service.ts` (lines 1-80)

**Imports pattern** (lines 1-13):
```typescript
import {
  Injectable, UnauthorizedException, ConflictException, ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
```

**Logger + DI constructor pattern** (lines 14-21):
```typescript
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private inviteService: InviteService,
  ) {}
```

**JIT provisioning pattern:** findOrCreateSsoUser → lookup by externalId or email in OrganizationMember → create if not exists → createTokens (access + refresh JWT). Follow the existing `createTokens()` method from auth.service.ts.

---

#### `strategies/saml.strategy.ts` and `strategies/oidc.strategy.ts` (strategy, request-response)

**Analog:** `apps/api/src/modules/auth/strategies/jwt.strategy.ts` (lines 1-42)

**Imports pattern** (lines 1-5):
```typescript
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
```

**PassportStrategy extend pattern** (lines 7-18):
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_SECRET", "change-me-access-secret-in-prod"),
    });
  }
```

**validate() pattern** (lines 20-41):
```typescript
  async validate(payload: { sub: string; email: string; orgId: string; role: string }) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId: payload.sub, organizationId: payload.orgId },
      },
      select: { isActive: true, role: true },
    });

    if (!membership || !membership.isActive) {
      throw new UnauthorizedException("Organization membership inactive");
    }

    return { id: payload.sub, email: payload.email, orgId: payload.orgId, role: membership.role };
  }
```

**For SAML strategy:** Replace with `passport-saml` `Strategy`, `Profile`, `VerifiedCallback`. Use `passReqToCallback: true` for dynamic IdP config. Set `acceptedClockSkewMs: 60000`. **For OIDC strategy:** Use `openid-client/passport` `Strategy`, `VerifyCallback`. Set `usePKCE: true`.

---

### 2. API Key Module (`apps/api/src/modules/api-key/`)

#### `api-key.module.ts` (module, CRUD)

**Analog:** `apps/api/src/modules/governance/governance.module.ts` (lines 1-15)

```typescript
import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { GovernanceController } from "./governance.controller";
import { GovernanceService } from "./governance.service";
import { GovernanceProcessor } from "./governance.processor";

@Module({
  imports: [
    BullModule.registerQueue({ name: "retention-pruning" }),
  ],
  controllers: [GovernanceController],
  providers: [GovernanceService, GovernanceProcessor],
  exports: [GovernanceService],
})
export class GovernanceModule {}
```

**Apply to ApiKeyModule:** No BullMQ imports needed (API key rate limiting uses Redis counters in guard, not a queue). Controllers: [ApiKeyController]. Providers: [ApiKeyService, TenantApiKeyGuard]. Exports: [ApiKeyService, TenantApiKeyGuard] (guard used in AppModule for `/api/v1/*` routes).

---

#### `api-key.controller.ts` (controller, CRUD)

**Analog:** `apps/api/src/modules/license/license.controller.ts` (lines 1-80)

**Imports pattern** (lines 1-13):
```typescript
import {
  Controller, Get, Post, Delete, Body, Param, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Roles } from "../../common/decorators/roles.decorator";
```

**CRUD route patterns** (from governance.controller.ts lines 24-52):
```typescript
@Controller("governance")
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Get("retention-policies")
  @Roles("ADMIN")
  async listPolicies() {
    return this.governanceService.listPolicies();
  }

  @Post("retention-policies")
  @Roles("ADMIN")
  async createPolicy(@Body(new ZodValidationPipe(createRetentionPolicySchema)) body: any) {
    return this.governanceService.createPolicy(body);
  }

  @Delete("retention-policies/:id")
  @Roles("ADMIN")
  async deletePolicy(@Param("id") id: string) {
    await this.governanceService.deletePolicy(id);
    return { success: true };
  }
}
```

**Controller prefix:** `@Controller("api-keys")`. Requires JWT auth + ADMIN role. Routes: `GET /api/api-keys` (list), `POST /api/api-keys` (create — returns raw key once), `DELETE /api/api-keys/:id` (revoke).

---

#### `guards/tenant-api-key.guard.ts` (guard, request-response)

**Analog:** `apps/api/src/modules/license/guards/license-api-key.guard.ts` (lines 1-43)

**Full pattern** (complete file):
```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as crypto from "crypto";

@Injectable()
export class LicenseApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey: string | undefined = request.headers["x-api-key"];

    if (!apiKey) {
      throw new UnauthorizedException("Clé API requise (en-tête X-API-Key)");
    }

    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    const keyRecord = await this.prisma.licenseApiKey.findFirst({
      where: { keyHash, isActive: true },
    });

    if (!keyRecord) {
      throw new UnauthorizedException("Clé API invalide");
    }

    request.apiKeyInfo = { id: keyRecord.id, name: keyRecord.name };
    return true;
  }
}
```

**Extensions needed for TenantApiKeyGuard:**
- Query `tenantApiKey` model (not `licenseApiKey`)
- Check `expiresAt` (additional expiration check)
- Attach full `apiKeyInfo` to request: `{ id, name, scopes, rateLimit, organizationId }`
- Add Redis-based per-key rate limiting (see Shared Patterns below)
- Add `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` response headers

---

#### `middleware/api-key-rate-limit.ts` (middleware, request-response)

**Analog:** `apps/api/src/common/guards/feature-gate.guard.ts` (lines 1-80) — Redis caching pattern

**Redis counter pattern** (adapted from FeatureGateGuard, lines 37-47):
```typescript
// Check Redis cache first
const cacheKey = `feature:${user.orgId}:${feature}`;
try {
  const cached = await this.redis.get(cacheKey);
  if (cached === "1") return true;
  // ...
} catch (err: any) {
  if (err instanceof ForbiddenException) throw err;
}
```

**Per-key rate limit with Redis INCR pattern** (from RESEARCH.md):
```typescript
const rateLimitKey = `apikey:ratelimit:${keyRecord.id}:${Math.floor(Date.now() / 60000)}`;
const currentCount = await redis.incr(rateLimitKey);
if (currentCount === 1) await redis.expire(rateLimitKey, 60);

const remaining = Math.max(0, keyRecord.rateLimit - currentCount);
// Set headers on response before next() or guard resolution
```

**Middleware registration:** Apply to `/api/v1/*` routes in AppModule.configure() following the existing `TenantContextMiddleware` pattern (applied via `.forRoutes('*')` — use route-specific path).

---

### 3. Webhook Module (`apps/api/src/modules/webhook/`)

#### `webhook.processor.ts` (processor, event-driven)

**Analog:** `apps/api/src/modules/governance/governance.processor.ts` (lines 1-31)

**Full pattern:**
```typescript
import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { GovernanceService } from "./governance.service";

@Processor("retention-pruning")
export class GovernanceProcessor extends WorkerHost {
  private readonly logger = new Logger(GovernanceProcessor.name);

  constructor(private readonly governanceService: GovernanceService) {
    super();
  }

  async process(job: Job<{ eventType: string; tableType: string; retentionDays: number }, any, string>): Promise<any> {
    const { eventType, tableType, retentionDays } = job.data;
    this.logger.log(`Pruning ${eventType} older than ${retentionDays} days`);

    try {
      await this.governanceService.prune(eventType, tableType, retentionDays);
      this.logger.log(`Pruned ${eventType}`);
    } catch (err: any) {
      this.logger.error(`Failed to prune ${eventType}: ${err.message}`);
      throw err;
    }
  }
}
```

**For WebhookProcessor:** Queue name: `"webhook-delivery"`. Job data shape: `{ subscriptionId, eventType, payload, targetUrl, signingSecret, attemptNumber }`. Retry via `job.moveToDelayed()` with exponential backoff schedule: `[0, 60_000, 300_000, 900_000, 3_600_000, 86_400_000]`.

---

#### `webhook.gateway.ts` (gateway, event-driven)

**Analog:** `apps/api/src/modules/door/door.gateway.ts` (lines 1-77)

**Full pattern:**
```typescript
import { Logger } from "@nestjs/common";
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { OnEvent } from "@nestjs/event-emitter";

@WebSocketGateway({ namespace: "/ws/doors" })
export class DoorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DoorGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const orgId = client.handshake.auth?.orgId;
    client.data.orgId = orgId;
    if (!orgId) client.disconnect();
    this.logger.log(`Door WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Door WS client disconnected: ${client.id}`);
  }

  @SubscribeMessage("subscribe:site")
  handleSubscribeSite(client: Socket, payload: { orgId: string }) {
    const room = `org:${payload.orgId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to door updates for ${room}`);
  }

  @OnEvent("door.state-changed", { async: true })
  handleDoorStateChanged(payload: { doorId: string; orgId: string; ... }) {
    this.server.to(`org:${payload.orgId}`).emit("state-update", payload);
  }
}
```

**For WebhookGateway:** Namespace: `"/ws/webhooks"`. Listen for `"webhook.delivery-completed"` and `"webhook.delivery-failed"` events. Emit delivery updates to dashboard clients for the live delivery timeline view.

---

### 4. Compliance Module (`apps/api/src/modules/compliance/`)

#### `compliance.service.ts` (service, file-I/O — PDF generation)

**Analog:** `apps/api/src/modules/incident/incident.service.ts` (lines 1-10 + 675-789)

**Imports pattern** (lines 1-10):
```typescript
import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import Redis from "ioredis";
import PDFDocument from "pdfkit";
import Handlebars from "handlebars";
import { SLA_SEVERITY_DEFAULTS } from "@repo/shared";
```

**PDFKit + Handlebars generation pattern** (lines 675-721):
```typescript
// Compile Handlebars template
const template = Handlebars.compile(templateSource);
const html = template({ ...reportContext, generatedAt: new Date().toLocaleString("fr-FR") });

// Generate PDF
return new Promise<Buffer>((resolve, reject) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const buffers: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => buffers.push(chunk));
  doc.on("end", () => resolve(Buffer.concat(buffers)));
  doc.on("error", reject);

  // Render structured PDF content
  doc.fontSize(20).font("Helvetica-Bold").text("Title", { align: "center" });
  doc.moveDown();
  doc.fontSize(10).font("Helvetica").text("Content...");
  // ... more content
  doc.end();
});
```

**Data source pattern:** Query audit logs via `AuditService.queryAuditLog()`, role assignments via `PrismaService.organizationMember`, incident records via `PrismaService.incident`. Follow the existing data aggregation pattern in incident closure reports (lines 620-673).

---

### 5. Extended Existing Files

#### `auth.controller.ts` (extend) — SSO callback routes

**Add to existing controller** following the `@Public()` + `@Post()` pattern (lines 37-44):
```typescript
@Public()
@Get("sso/saml/login")
async samlLogin(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
  // Redirect to IdP
}

@Public()
@Post("sso/saml/callback")
async samlCallback(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
  // Passport automatically handles SAML assertion validation
  // After validate() returns user, create JWT tokens
  const result = await this.ssoService.exchangeSsoUser(req.user);
  res.setCookie("refreshToken", result.refreshToken, { httpOnly: true, secure: ..., sameSite: "lax", path: "/" });
  return { accessToken: result.accessToken, user: result.user };
}
```

---

#### `governance.service.ts` (extend) — Data classification

**Existing pattern to follow** — CRUD methods (lines 145-176):
```typescript
async createPolicy(dto: { eventType: string; tableType: string; retentionDays: number; enabled?: boolean }) {
  return this.prisma.retentionPolicy.create({ data: { ... } });
}
async listPolicies() {
  return this.prisma.retentionPolicy.findMany({ orderBy: { createdAt: "desc" } });
}
```

**New fields to add to RetentionPolicy:** `classification: String?` (enum: PII, security, audit, operational), `exportBeforePurge: Boolean @default(false)`, `exportFormat: String?` (PDF or CSV). Use existing Prisma `create`/`update`/`findMany` patterns. For pre-purge export, reuse the PDFKit generation pattern from `incident.service.ts`.

---

#### `organization.service.ts` (extend) — White labeling

**Existing pattern** (lines 1-54):
```typescript
async update(id: string, data: Prisma.OrganizationUpdateInput) {
  await this.findById(id);  // throws NotFoundException if missing
  return this.prisma.organization.update({ where: { id }, data });
}
```

**New fields to update:** `logoUrl`, `primaryColor`, `displayName`. Use the same `prisma.organization.update()` pattern. Validate `primaryColor` as hex color string.

---

#### `license.service.ts` (extend) — Multi-currency

**Existing generateLicense pattern** (lines 30-50):
```typescript
async generateLicense(dto: {
  organizationId: string;
  maxCameras: number;
  maxDoors: number;
  expiresAt: string;
  gracePeriodDays?: number;
  licenseVersion?: number;
}) {
  const claims: LicenseClaims = {
    organizationId: dto.organizationId,
    issuedAt: ...,
    expiresAt: ...,
    maxCameras: dto.maxCameras,
    maxDoors: dto.maxDoors,
    gracePeriodDays: dto.gracePeriodDays ?? 7,
    licenseVersion: dto.licenseVersion ?? 1,
  };
  const licenseJwt = jwt.sign(claims, privateKey, { algorithm: "RS256", issuer: "oversight-hub" });
  // ...
}
```

**Add `currency` field** to the DTO and `LicenseClaims`. Use a Zod enum: `z.enum(["USD", "EUR", "XOF", "GBP", "JPY"])`.

---

### 6. Infrastructure Files

#### `main.ts` (extend) — Swagger v1 docs

**Existing Swagger pattern** (lines 124-143):
```typescript
const swaggerConfig = new DocumentBuilder()
  .setTitle("OVERSIGHT AI API")
  .setDescription("...")
  .setVersion("1.0")
  .addBearerAuth()
  .addCookieAuth("refreshToken")
  .addTag("auth", "Authentication endpoints")
  // ... more tags
  .build();
const document = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup("api/docs", app, document);
```

**New v1 docs:** Create a separate `DocumentBuilder` with title `"OVERSIGHT API v1"`, version `"1.0"`, `.addApiKey({ type: "apiKey", name: "X-API-Key", in: "header" }, "ApiKey")`. Register at `SwaggerModule.setup("api/docs/v1", app, v1document)`. Tags: cameras, doors, alerts, incidents, events, audit.

---

#### `configuration.ts` (extend) — SSO env vars

**Existing pattern** (lines 1-78):
```typescript
export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  // ...
});
```

**New section:**
```typescript
sso: {
  samlIdpMetadataUrl: process.env.SAML_IDP_METADATA_URL || '',
  samlEntityId: process.env.SAML_ENTITY_ID || '',
  samlCert: process.env.SAML_CERT || '',
  oidcClientId: process.env.OIDC_CLIENT_ID || '',
  oidcClientSecret: process.env.OIDC_CLIENT_SECRET || '',
  oidcIssuerUrl: process.env.OIDC_ISSUER_URL || '',
},
```

---

#### `prisma/schema.prisma` (modify) — New models

**Analog for new models:** `LicenseApiKey` model (lines 716-733):
```prisma
model LicenseApiKey {
  id             String    @id @default(uuid())
  name           String
  keyHash        String    @unique
  keyPrefix      String
  isActive       Boolean   @default(true)
  organizationId String
  createdById    String
  createdAt      DateTime  @default(now())
  revokedAt      DateTime?

  organization Organization @relation(fields: [organizationId], references: [id])
  createdBy    User         @relation(fields: [createdById], references: [id])

  @@index([organizationId])
  @@index([isActive])
  @@index([keyHash])
}
```

**New `TenantApiKey` model** — follow this exact pattern, add: `scopes Json`, `rateLimit Int @default(300)`, `lastUsedAt DateTime?`, `expiresAt DateTime?`. Use same field naming convention (camelCase), same relation pattern, same index conventions.

**Analog for extend Organization:** `Organization` model (lines 398-429) — add fields: `logoUrl String?`, `primaryColor String?`, `displayName String?`.

**Analog for extend RetentionPolicy:** `RetentionPolicy` model (lines 383-394) — add fields: `classification String?`, `exportBeforePurge Boolean @default(false)`, `exportFormat String?`.

---

### 7. Dashboard Patterns

#### New Dashboard Pages (e.g., `/conformite`, `/api-keys`, `/webhooks`)

**Analog:** `apps/dashboard/app/(dashboard)/parametres/page.tsx` (lines 1-80)

```typescript
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import { /* API functions */ } from "@/lib/api";

export default function ParametresPage() {
  const { user } = useAuth();
  // State management with useState
  // useEffect for data loading

  async function handleAction(e: React.FormEvent) {
    e.preventDefault();
    // try { await apiCall(); toast("success", "success"); } catch { toast(e.message, "error"); }
  }

  return (
    <div className="...">
      <PageHeader title="..." description="..." />
      {/* Card-based layout with form fields */}
    </div>
  );
}
```

**Key patterns to replicate:**
- `"use client"` directive on all pages
- `useAuth()` for user context and role checks
- `PageHeader` component for consistent page headers
- `Card`, `CardContent`, `CardHeader`, `CardTitle` from shadcn/ui for content sections
- `toast()` from `@/components/ui/toast` for user feedback
- `fetchWithAuth()` via API functions from `@/lib/api` for all data fetching
- French-language UI text and error messages

#### SSO Login Page Extension

**Analog:** `apps/dashboard/app/(auth)/login/page.tsx` (lines 1-80)

Add SSO button section after the email login form. Use the existing `Button` component with variant. The SSO button calls `GET /api/auth/sso/saml/login` or `GET /api/auth/sso/oidc/login` which redirects to the IdP.

#### Navigation Config Extension

**Analog:** `apps/dashboard/lib/nav-config.ts` (lines 42-115) — group/item pattern:
```typescript
{
  label: "Gouvernance",
  icon: ShieldCheck,
  minRole: "ADMIN" as Role,
  items: [
    { label: "Audit", href: "/audit", icon: Shield, minRole: "ADMIN" as Role },
    { label: "Gouvernance", href: "/gouvernance", icon: ShieldCheck, minRole: "ADMIN" as Role },
  ],
},
```

**Add new groups/items:**
- Under "Gouvernance" group: add `{ label: "Conformité", href: "/conformite", icon: ..., minRole: "ADMIN" }`
- Under "Gouvernance" group: add `{ label: "API", href: "/api-keys", icon: Key, minRole: "ADMIN" }`
- Under "Gouvernance" group: add `{ label: "Webhooks", href: "/webhooks", icon: ..., minRole: "ADMIN" }`

---

### 8. Mobile Patterns

#### New Mobile Screens (nfc-scan, qr-checkin, door-control)

**Analog:** `apps/mobile/app/(tabs)/incidents.tsx` (lines 1-60)

```typescript
import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { colors, typography } from "@repo/design";
// import custom components

export default function IncidentsScreen() {
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const result = await fetchData();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Styles at bottom
  const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.surface } });
}
```

**Key patterns:**
- `useFocusEffect` + `useCallback` for reload-on-focus
- `useState` for data/loading/error triad
- `StyleSheet.create()` at bottom of file
- `@repo/design` for colors and typography tokens
- `expo-router` `useRouter()` for navigation
- Async function definitions with try-catch

#### NFC Scanner Component

**Analog:** `apps/mobile/lib/offline-storage.ts` — module pattern with `console.warn("[name]")` logging. NFC component should follow the existing Expo skill patterns: request permissions, initialize NFC manager, handle scan results.

---

### 9. Shared Schemas (New)

**Analog:** `packages/shared/src/schemas/license.schema.ts` (lines 1-27)

```typescript
import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Le nom de la clé est requis"),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
```

**New schemas to create:**
- `sso.schema.ts` — IdP config schemas (create/update SAML/OIDC config)
- `api-key.schema.ts` — createApiKey, updateApiKey schemas
- `webhook.schema.ts` — createSubscription, updateSubscription schemas
- `compliance.schema.ts` — generateReport schema (reportType, dateRange, format)

All schemas follow the same pattern: `z.object({...})` → `export type X = z.infer<typeof xSchema>`. Export both schema and type from `packages/shared/src/index.ts`.

---

## Shared Patterns

### Authentication — JWT Strategy + Passport

**Source:** `apps/api/src/modules/auth/strategies/jwt.strategy.ts` (lines 1-42)
**Apply to:** `saml.strategy.ts`, `oidc.strategy.ts`

All Passport strategies extend `PassportStrategy(Strategy, "name")`, inject dependencies via constructor, call `super({...options})`, and implement `async validate()` that returns the user object (attached to `request.user`).

### Authentication — @Public() Decorator

**Source:** `apps/api/src/common/decorators/public.decorator.ts` (lines 1-3)
**Apply to:** SSO callback routes, SAML init, OIDC init

```typescript
import { SetMetadata } from "@nestjs/common";
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### Authorization — @Roles() Decorator

**Source:** `apps/api/src/common/decorators/roles.decorator.ts` (lines 1-3)
**Apply to:** All admin-only routes (api-key CRUD, webhook CRUD, compliance reports, IdP config)

```typescript
import { SetMetadata } from "@nestjs/common";
export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

### Guard Execution Order (from AppModule)

**Source:** `apps/api/src/app.module.ts` (lines 104-111)

```typescript
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },        // 1st: JWT validation
  { provide: APP_GUARD, useClass: TenantIsolationGuard }, // 2nd: org scoping
  { provide: APP_GUARD, useClass: RolesGuard },           // 3rd: role check
  { provide: APP_GUARD, useClass: FeatureGateGuard },     // 4th: feature flags
],
```

**New guard placement:** The `TenantApiKeyGuard` runs ON routes with `@UseGuards(TenantApiKeyGuard)` instead of `JwtAuthGuard`. It replaces JWT auth for `/api/v1/*` routes. When API key guard passes, it sets `request.apiKeyInfo.organizationId` for downstream `TenantIsolationGuard`.

### Zod Validation Pipe

**Source:** `apps/api/src/common/pipes/zod-validation.pipe.ts` (lines 1-21)
**Apply to:** All controller methods with @Body()

```typescript
@Body(new ZodValidationPipe(createSchema)) body: any
```

This is the universal validation pattern for every new controller. The pipe throws `BadRequestException` with field-level errors on validation failure.

### BullMQ Queue Registration

**Source:** `apps/api/src/modules/queue/queue.module.ts` (lines 19-34)
**Apply to:** New `webhook-delivery` queue

```typescript
BullModule.registerQueue(
  { name: "frame-processing" },
  { name: "notification" },
  // ...
  { name: "retention-pruning" },
  // ADD: { name: "webhook-delivery" },
),
```

Each module that uses the queue imports `BullModule.registerQueue({ name: "webhook-delivery" })` in its own `*.module.ts`.

### Feature Flag Enforcement

**Source:** `apps/api/src/common/guards/feature-gate.guard.ts` (lines 1-80) + `apps/api/src/common/decorators/feature-gate.decorator.ts` (lines 1-3)
**Apply to:** SSO routes, API key guard, branding endpoints

```typescript
import { SetMetadata } from "@nestjs/common";
export const FEATURE_KEY = "requiredFeature";
export const RequiresFeature = (feature: string) => SetMetadata(FEATURE_KEY, feature);
```

**Feature flags already defined in** `apps/api/src/modules/feature-gate/feature-gate.service.ts` (lines 8-19):
- `"sso"` — minTier ENTERPRISE (gate SAML/OIDC routes)
- `"api_access"` — minTier ENTERPRISE (gate `/api/v1/*` endpoints)
- `"custom_branding"` — minTier ENTERPRISE (gate white label settings)

Apply `@RequiresFeature("sso")` on SSO controller, `@RequiresFeature("api_access")` on v1 controllers.

### Prisma Model Pattern

**Source:** `apps/api/prisma/schema.prisma` — `LicenseApiKey` model (lines 716-733)
**Apply to:** New `TenantApiKey`, `WebhookSubscription`, `WebhookDelivery`, `IdpConfig`

All models follow:
- `id String @id @default(uuid())`
- camelCase field names
- `organizationId String` + `organization Organization @relation(...)`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt` (where needed)
- `@@index([organizationId])` for tenant-scoped queries

### Dashboard Page Structure

**Source:** `apps/dashboard/app/(dashboard)/parametres/page.tsx` (lines 1-80)
**Apply to:** All new dashboard pages

- `"use client"` directive
- Imports from `@/lib/auth-context`, `@/components/ui/*`, `lucide-react`
- Function component with explicit `export default function PageName()`
- Auth gate via `const { user } = useAuth()`
- Card-based layout using `Card, CardContent, CardHeader, CardTitle`
- Error state: inline conditional rendering
- Loading state: disabled buttons, skeleton patterns
- Toast for user feedback: `import { toast } from "@/components/ui/toast"`

### Mobile Screen Structure

**Source:** `apps/mobile/app/(tabs)/incidents.tsx` (lines 1-60)
**Apply to:** All new mobile screens

- `import { View, Text, StyleSheet } from "react-native"`
- `import { useRouter } from "expo-router"`
- `import { colors, typography } from "@repo/design"`
- `useState` for data/loading/error triad
- `useFocusEffect` for reload-on-focus pattern
- `StyleSheet.create()` at file bottom
- Async load functions with try/catch error handling

### PDF Generation (PDFKit + Handlebars)

**Source:** `apps/api/src/modules/incident/incident.service.ts` (lines 1-10 + 675-789)
**Apply to:** All compliance report templates

- Import: `import PDFDocument from "pdfkit"` and `import Handlebars from "handlebars"`
- Compile Handlebars template (from .hbs file or inline string)
- Create PDFDocument with `new PDFDocument({ margin: 50, size: "A4" })`
- Buffer aggregation via `doc.on("data")` / `doc.on("end")` pattern
- Style: `doc.font("Helvetica-Bold")` / `doc.font("Helvetica")` for body
- Return as `Buffer` from Promise

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/mobile/components/nfc-scanner.tsx` | component | hardware-I/O | No existing NFC components — use `react-native-nfc-manager` docs + Expo native module patterns |
| `apps/mobile/components/qr-scanner.tsx` | component | hardware-I/O | No existing QR scanner — use `expo-barcode-scanner` docs + Expo camera patterns |

**These files will use the pattern from RESEARCH.md code examples.** The overall structure (imports, styles, error handling) follows the `apps/mobile/app/(tabs)/incidents.tsx` pattern; only the core hardware interaction is new.

---

## Metadata

**Analog search scope:**
- `apps/api/src/modules/` — 35 modules, 30 controllers, 48 services, 2 guards, 2 strategies, 12 processors, 7 gateways
- `apps/api/src/common/` — 4 guards, 2 decorators, 1 filter, 1 middleware, 1 pipe
- `apps/api/prisma/` — 1 schema, 40+ models
- `apps/dashboard/app/` — pages, components, lib
- `apps/mobile/app/` — screens, components, lib
- `packages/shared/src/` — 23 schemas, barrel index

**Files scanned:** ~80 files
**Pattern extraction date:** 2026-07-16
