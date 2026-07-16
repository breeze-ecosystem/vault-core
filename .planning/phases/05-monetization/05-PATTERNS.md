# Phase 5: Monetization — Pattern Map

**Mapped:** 2026-07-15
**Files analyzed:** 34 (20 new, 14 modified)
**Analogs found:** 31 / 34

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/api/prisma/schema.prisma` (mod) | model | CRUD | `apps/api/prisma/schema.prisma` (existing models) | exact |
| `apps/api/src/modules/license/license.module.ts` | module | CRUD | `apps/api/src/modules/auth/auth.module.ts` | exact |
| `apps/api/src/modules/license/license.controller.ts` | controller | request-response | `apps/api/src/modules/auth/auth.controller.ts` | exact |
| `apps/api/src/modules/license/license.service.ts` | service | CRUD | `apps/api/src/modules/auth/auth.service.ts` | exact |
| `apps/api/src/modules/license/license-key-manager.ts` | service | config/init | `apps/api/src/modules/prisma/prisma.service.ts` | role-match |
| `apps/api/src/modules/license/license-public-key.ts` | config | static | `packages/shared/src/constants/roles.ts` | role-match |
| `apps/api/src/modules/license/guards/license-expiry.guard.ts` | middleware | request-response | `apps/api/src/common/guards/feature-gate.guard.ts` | exact |
| `apps/api/src/modules/license/guards/license-api-key.guard.ts` | middleware | request-response | `apps/api/src/modules/supervision/supervision.controller.ts` (SupervisionOrJwtGuard) | role-match |
| `apps/api/src/modules/license/license.types.ts` | type | CRUD | `packages/shared/src/types/auth.types.ts` | exact |
| `apps/api/src/modules/license/dto/license.dto.ts` | config | CRUD | `apps/api/src/common/dto/index.ts` | role-match |
| `apps/api/src/config/validation.ts` (mod) | config | config | `apps/api/src/config/validation.ts` | exact |
| `apps/api/src/config/configuration.ts` (mod) | config | config | `apps/api/src/config/configuration.ts` | exact |
| `apps/api/src/app.module.ts` (mod) | config | config | `apps/api/src/app.module.ts` | exact |
| `apps/api/src/modules/camera/camera.service.ts` (mod) | service | CRUD | `apps/api/src/modules/camera/camera.service.ts` | exact |
| `apps/api/src/modules/door/door.service.ts` (mod) | service | CRUD | `apps/api/src/modules/door/door.service.ts` | exact |
| `docker-compose.prod.yml` (mod) | config | infrastructure | `docker-compose.prod.yml` | exact |
| `packages/shared/src/schemas/license.schema.ts` | schema | CRUD | `packages/shared/src/schemas/auth.schema.ts` | exact |
| `packages/shared/src/constants/license.constants.ts` | constant | config | `packages/shared/src/constants/roles.ts` | exact |
| `packages/shared/src/types/license.types.ts` | type | CRUD | `packages/shared/src/types/auth.types.ts` | exact |
| `packages/shared/src/index.ts` (mod) | config | config | `packages/shared/src/index.ts` | exact |
| `apps/dashboard/app/(dashboard)/licences/page.tsx` | page (admin) | CRUD | `apps/dashboard/app/(dashboard)/audit/page.tsx` | role-match |
| `apps/dashboard/app/(dashboard)/licences/activation/page.tsx` | page (client) | request-response | `apps/dashboard/app/(dashboard)/cameras/page.tsx` | role-match |
| `apps/dashboard/components/license-status-badge.tsx` | component | display | `apps/dashboard/components/ui/badge.tsx` | exact |
| `apps/dashboard/components/license-usage-bars.tsx` | component | display | shadcn `Progress` component | new pattern |
| `apps/dashboard/components/license-expiry-countdown.tsx` | component | display | (inline pattern in cameras page) | role-match |
| `apps/dashboard/components/license-activation-form.tsx` | component | form | (inline form in cameras page) | role-match |
| `apps/dashboard/components/license-empty-state.tsx` | component | display | (empty state in audit page) | role-match |
| `apps/dashboard/components/api-key-create-dialog.tsx` | component | form | shadcn `Dialog` component pattern | role-match |
| `apps/dashboard/components/api-key-list.tsx` | component | display | shadcn `Table` component pattern | role-match |
| `apps/dashboard/lib/nav-config.ts` (mod) | config | config | `apps/dashboard/lib/nav-config.ts` | exact |
| `apps/dashboard/lib/api.ts` (mod) | utility | request-response | `apps/dashboard/lib/api.ts` | exact |
| `apps/dashboard/app/(dashboard)/parametres/page.tsx` (mod) | page | display | `apps/dashboard/app/(dashboard)/parametres/page.tsx` | exact |

## Pattern Assignments

### `apps/api/prisma/schema.prisma` (model, CRUD) — MODIFIED

**Analog:** Existing models within `apps/api/prisma/schema.prisma`

**Existing model pattern** (lines 377-404):
```prisma
model Organization {
  id        String   @id @default(uuid())
  name      String
  address   String?
  // ... other fields ...
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  cameras           Camera[]
  doors             Door[]
  zones             Zone[]
  // ... relations ...
}
```

**Enum pattern** (lines 10-18):
```prisma
enum Role {
  SUPER_ADMIN
  ADMIN
  SUPERVISOR
  OPERATOR
  VIEWER
  AUDITOR
  MAINTENANCE_TEAM
}
```

**Index pattern** (line 102-104):
```prisma
  @@index([userId])
  @@index([type, badgeNumber])
  @@index([organizationId])
```

**New models to add (following same patterns):**
- `model License { ... }` with `@@unique([organizationId, licenseVersion])` and `@@index([organizationId])`
- `model LicenseApiKey { ... }` with `@@index([isActive])` and `@@index([keyHash])`
- Update `Organization` with `trialStartDate DateTime?` and `trialEndDate DateTime?`
- Add `License[]` and `LicenseApiKey[]` relations to Organization/User

---

### `apps/api/src/modules/license/license.module.ts` (module, CRUD)

**Analog:** `apps/api/src/modules/auth/auth.module.ts` (lines 1-20)

**Imports pattern:**
```typescript
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { LicenseController } from "./license.controller";
import { LicenseService } from "./license.service";
import { LicenseKeyManager } from "./license-key-manager";
// ... other imports

@Module({
  imports: [
    // Any PrismaModule is global, so no need to import
    // Add any needed modules here
  ],
  controllers: [LicenseController],
  providers: [LicenseService, LicenseKeyManager, LicenseExpiryGuard, LicenseApiKeyGuard],
  exports: [LicenseService, LicenseExpiryGuard],
})
export class LicenseModule {}
```

---

### `apps/api/src/modules/license/license.controller.ts` (controller, request-response)

**Analog:** `apps/api/src/modules/auth/auth.controller.ts` (lines 1-274)

**Controller decorator pattern** (lines 29-35):
```typescript
import { Controller, Post, Get, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('licenses')
@Controller('licenses')
export class LicenseController {
  constructor(
    private licenseService: LicenseService,
  ) {}
```

**Endpoint pattern with Zod validation** (lines 37-61):
```typescript
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a license JWT for the current organization' })
  @ApiBody({ schema: { type: 'object', properties: { licenseJwt: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'License activated' })
  @ApiResponse({ status: 400, description: 'Invalid or expired license' })
  async activate(
    @Req() req: FastifyRequest,
    @Body(new ZodValidationPipe(activateLicenseSchema)) body: any,
  ) {
    const orgId = (req as any).user.orgId;
    const result = await this.licenseService.verifyAndActivate(body.licenseJwt, orgId);
    return result;
  }
```

**Guarded endpoint pattern** (lines 188-231):
```typescript
  @UseGuards(JwtAuthGuard)
  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current license status' })
  async getStatus(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.orgId;
    return this.licenseService.getLicenseStatus(orgId);
  }
```

---

### `apps/api/src/modules/license/license.service.ts` (service, CRUD)

**Analog:** `apps/api/src/modules/auth/auth.service.ts` (lines 1-335)

**Injectable pattern** (lines 14-21):
```typescript
import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import * as jwt from 'jsonwebtoken';

@Injectable()
export class LicenseService {
  constructor(
    private prisma: PrismaService,
    private keyManager: LicenseKeyManager,
    private config: ConfigService,
  ) {}
```

**Service method with guard clauses + Prisma** (lines 98-166):
```typescript
  async getLicenseStatus(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });

    // Check trial first
    if (org.trialStartDate && org.trialEndDate > new Date()) {
      return { licenseState: 'trial', trialEndsAt: org.trialEndDate, isUnlimited: true };
    }

    // Check active license
    const license = await this.prisma.license.findFirst({
      where: { organizationId: orgId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!license) {
      return { licenseState: 'no_license' };
    }

    // Check grace period
    // ... state machine logic with Prisma queries
  }
```

**JWT sign pattern** (lines 312-319):
```typescript
    const token = jwt.sign(claims, privateKey, {
      algorithm: 'RS256',
      issuer: 'oversight-hub',
    });
```

**JWT verify pattern** (lines 338-355):
```typescript
    const claims = jwt.verify(jwtToken, publicKey, {
      algorithms: ['RS256'],
    }) as LicenseClaims;
```

---

### `apps/api/src/modules/license/license-key-manager.ts` (service, config/init)

**Analog:** `apps/api/src/modules/prisma/prisma.service.ts` (lines 1-29)

**OnModuleInit pattern** (lines 5-24):
```typescript
import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from 'fs';
import * as crypto from 'crypto';

@Injectable()
export class LicenseKeyManager implements OnModuleInit {
  private privateKey: crypto.KeyObject | null = null;
  private readonly logger = new Logger(LicenseKeyManager.name);

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const keyPath = this.config.get<string>('LICENSE_PRIVATE_KEY_PATH');
    if (!keyPath) {
      this.logger.warn('LICENSE_PRIVATE_KEY_PATH not set — license generation disabled');
      return;
    }
    try {
      const pem = fs.readFileSync(keyPath, 'utf-8');
      this.privateKey = crypto.createPrivateKey(pem);
      this.logger.log('License signing key loaded');
    } catch (err) {
      this.logger.error(`Failed to load license key: ${err.message}`);
    }
  }
}
```

---

### `apps/api/src/modules/license/license-public-key.ts` (config, static)

**Analog:** `packages/shared/src/constants/roles.ts` (lines 1-27)

**Constant file pattern** (lines 1-8):
```typescript
export const LICENSE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`;
```

---

### `apps/api/src/modules/license/guards/license-expiry.guard.ts` (middleware, request-response)

**Analog:** `apps/api/src/common/guards/feature-gate.guard.ts` (lines 1-80)

**CanActivate guard pattern** (lines 13-42):
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { LicenseService } from "../license.service";

@Injectable()
export class LicenseExpiryGuard implements CanActivate {
  constructor(
    private licenseService: LicenseService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const orgId = request.user?.orgId;
    if (!orgId) return true; // Let auth guards handle this

    const status = await this.licenseService.getLicenseStatus(orgId);

    if (status.licenseState === 'expired') {
      throw new ForbiddenException(
        'Licence expirée — Fonctionnalités en lecture seule. Contactez votre administrateur.'
      );
    }

    return true;
  }
}
```

---

### `apps/api/src/modules/license/guards/license-api-key.guard.ts` (middleware, request-response)

**Analog:** `apps/api/src/modules/supervision/supervision.controller.ts` lines 26-60 (SupervisionOrJwtGuard pattern)

**API key guard pattern:**
```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as crypto from 'crypto';

@Injectable()
export class LicenseApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key required (X-API-Key header)');
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const keyRecord = await this.prisma.licenseApiKey.findUnique({
      where: { keyHash, isActive: true },
    });

    if (!keyRecord) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.apiKeyInfo = { id: keyRecord.id, name: keyRecord.name };
    return true;
  }
}
```

---

### `apps/api/src/config/validation.ts` (config, config) — MODIFIED

**Analog:** Existing `apps/api/src/config/validation.ts` (lines 1-36)

**New env vars to add** (follow existing pattern lines 1-36):
```typescript
  // License signing key
  LICENSE_PRIVATE_KEY_PATH: Joi.string().optional(),
  LICENSE_PUBLIC_KEY: Joi.string().optional(),
  SIGNING_KEY_ID: Joi.string().optional(),
```

---

### `apps/api/src/config/configuration.ts` (config, config) — MODIFIED

**Analog:** Existing `apps/api/src/config/configuration.ts` (lines 1-67)

**New config section to add** (follow existing nested config pattern lines 7-11 or 13-18):
```typescript
  license: {
    privateKeyPath: process.env.LICENSE_PRIVATE_KEY_PATH || '',
    publicKey: process.env.LICENSE_PUBLIC_KEY || '',
    version: parseInt(process.env.LICENSE_VERSION || '1', 10),
  },
```

---

### `apps/api/src/app.module.ts` (config, config) — MODIFIED

**Analog:** Existing `apps/api/src/app.module.ts` (lines 1-124)

**Module import pattern** (lines 8-38):
```typescript
import { LicenseModule } from './modules/license/license.module';
```

Add to `imports` array (lines 49-97):
```typescript
    LicenseModule,
```

---

### `apps/api/src/modules/camera/camera.service.ts` (service, CRUD) — MODIFIED

**Analog:** Existing `apps/api/src/modules/camera/camera.service.ts` (lines 49-54)

**Current create method** (lines 49-54):
```typescript
  async create(data: Prisma.CameraCreateInput) {
    return this.prisma.camera.create({
      data,
      include: { organization: { select: { id: true, name: true } } },
    });
  }
```

**Expected modification:** Add license limit check before `this.prisma.camera.create()`:
```typescript
  async create(data: Prisma.CameraCreateInput) {
    const orgId = data.organizationId;
    const licenseStatus = await this.licenseService.getLicenseStatus(orgId);
    if (licenseStatus.licenseState === 'expired' || licenseStatus.licenseState === 'no_license') {
      throw new BadRequestException('License expired. Cannot create new cameras.');
    }
    if (licenseStatus.licenseState !== 'trial' && licenseStatus.maxCameras) {
      const count = await this.prisma.camera.count({ where: { organizationId: orgId } });
      if (count >= licenseStatus.maxCameras) {
        throw new BadRequestException(`Limite de caméras atteinte (${licenseStatus.maxCameras})`);
      }
    }
    return this.prisma.camera.create({ data, include: { organization: { select: { id: true, name: true } } } });
  }
```

---

### `docker-compose.prod.yml` (config, infrastructure) — MODIFIED

**Analog:** Existing `docker-compose.prod.yml` (lines 61-104)

**Volume mount pattern** (lines 72-76 — existing env), add to `api` service:
```yaml
    volumes:
      - ./secrets/license-private.pem:/app/secrets/license-private.pem:ro
    environment:
      LICENSE_PRIVATE_KEY_PATH: /app/secrets/license-private.pem
```

---

### `packages/shared/src/schemas/license.schema.ts` (schema, CRUD)

**Analog:** `packages/shared/src/schemas/auth.schema.ts` (lines 1-27)

**Zod schema pattern:**
```typescript
import { z } from "zod";

export const generateLicenseSchema = z.object({
  organizationId: z.string().uuid("ID d'organisation invalide"),
  maxCameras: z.number().int().min(0, "Le nombre de caméras doit être ≥ 0"),
  maxDoors: z.number().int().min(0, "Le nombre de portes doit être ≥ 0"),
  expiresAt: z.string().datetime("Format de date invalide"),
  gracePeriodDays: z.number().int().min(0).max(90).default(7),
  licenseVersion: z.number().int().default(1),
});

export const activateLicenseSchema = z.object({
  licenseJwt: z.string().min(1, "La clé de licence est requise"),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Le nom de la clé est requis"),
});

export type GenerateLicenseInput = z.infer<typeof generateLicenseSchema>;
export type ActivateLicenseInput = z.infer<typeof activateLicenseSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
```

---

### `packages/shared/src/constants/license.constants.ts` (constant, config)

**Analog:** `packages/shared/src/constants/roles.ts` (lines 1-27)

**Constant pattern:**
```typescript
export const LICENSE_VERSION = 1;

export const LICENSE_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  GRACE: "GRACE",
  EXPIRED: "EXPIRED",
} as const;

export type LicenseStatus = (typeof LICENSE_STATUS)[keyof typeof LICENSE_STATUS];

export const GRACE_PERIOD_DAYS_DEFAULT = 7;

export const TRIAL_DURATION_DAYS = 7;
```

---

### `packages/shared/src/types/license.types.ts` (type, CRUD)

**Analog:** `packages/shared/src/types/auth.types.ts`

**Type pattern:**
```typescript
export interface LicenseClaims {
  organizationId: string;
  issuedAt: number;
  expiresAt: number;
  maxCameras: number;
  maxDoors: number;
  gracePeriodDays: number;
  licenseVersion: number;
}

export type LicenseState = 'trial' | 'active' | 'grace' | 'expired' | 'no_license';

export interface LicenseStatusDto {
  licenseState: LicenseState;
  expiresAt?: string;
  graceEndsAt?: string;
  trialEndsAt?: string;
  maxCameras?: number;
  maxDoors?: number;
  isUnlimited?: boolean;
}
```

---

### `packages/shared/src/index.ts` (config, config) — MODIFIED

**Analog:** Existing `packages/shared/src/index.ts` (lines 1-270)

**Export pattern to add:**
```typescript
// Schemas - License
export {
  generateLicenseSchema,
  activateLicenseSchema,
  createApiKeySchema,
} from "./schemas/license.schema";
export type {
  GenerateLicenseInput,
  ActivateLicenseInput,
  CreateApiKeyInput,
} from "./schemas/license.schema";

// Constants - License
export { LICENSE_VERSION, LICENSE_STATUS, GRACE_PERIOD_DAYS_DEFAULT, TRIAL_DURATION_DAYS } from "./constants/license.constants";
export type { LicenseStatus } from "./constants/license.constants";

// Types - License
export type { LicenseClaims, LicenseState, LicenseStatusDto } from "./types/license.types";
```

---

### `apps/dashboard/app/(dashboard)/licences/page.tsx` (page, CRUD)

**Analog:** `apps/dashboard/app/(dashboard)/audit/page.tsx` (lines 81-319)

**Page structure pattern:**
```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { Key, Plus, MoreHorizontal } from "lucide-react";
// Import license API functions
import { LicenseStatusBadge } from "@/components/license-status-badge";
import { LicenseUsageBars } from "@/components/license-usage-bars";
// ... etc

export default function LicencesPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch license list from API
    } catch (e) {
      console.error("Failed to fetch licenses:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Licences"
        description="Gérez les licences des organisations"
        action={{
          label: "Créer une licence",
          icon: Plus,
          onClick: () => setShowCreateDialog(true),
        }}
      />
      {/* ... table/list content with loading/empty/error states ... */}
    </div>
  );
}
```

**Empty state pattern** (from audit page lines 302-306):
```tsx
{entries.length === 0 ? (
  <div className="p-8 text-center text-muted-foreground">
    <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
    <p>Aucune licence créée</p>
    <p className="text-sm">Créez votre première licence pour un client</p>
  </div>
) : ( ... )}
```

**Loading skeleton pattern** (from audit page lines 296-301):
```tsx
{loading ? (
  <div className="p-4 space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
) : ( ... )}
```

---

### `apps/dashboard/app/(dashboard)/licences/activation/page.tsx` (page, request-response)

**Analog:** `apps/dashboard/app/(dashboard)/cameras/page.tsx` (lines 45-100) — form pattern

**Form state + submit pattern** (lines 45-99):
```typescript
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { LicenseActivationForm } from "@/components/license-activation-form";

export default function LicenseActivationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate(jwt: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/licenses/activate`, {
        method: 'POST',
        body: JSON.stringify({ licenseJwt: jwt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Clé de licence invalide');
      }
      const data = await res.json();
      setResult(data);
      toast('Licence activée avec succès', 'success');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Activer votre licence" description="Collez la clé JWT fournie par votre administrateur" />
      <Card>
        <CardContent className="p-6">
          <LicenseActivationForm onSubmit={handleActivate} loading={loading} error={error} result={result} />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### `apps/dashboard/components/license-status-badge.tsx` (component, display)

**Analog:** `apps/dashboard/components/ui/badge.tsx` (lines 1-34)

**Badge composition pattern:**
```typescript
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { variant: "success" | "warning" | "destructive" | "default"; label: string }> = {
  active: { variant: "default", label: "Active" },
  trial: { variant: "warning", label: "Essai" },
  grace: { variant: "warning", label: "Période de grâce" },
  expired: { variant: "destructive", label: "Expirée" },
  no_license: { variant: "secondary", label: "Aucune licence" },
};

export function LicenseStatusBadge({ state }: { state: string }) {
  const config = statusConfig[state] || { variant: "secondary", label: state };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

---

### `apps/dashboard/components/license-usage-bars.tsx` (component, display)

**Pattern:** shadcn `Progress` component (to be installed via `npx shadcn@latest add progress`)

```typescript
import { Progress } from "@/components/ui/progress";

export function LicenseUsageBars({ current, max, label }: { current: number; max: number; label: string }) {
  const percentage = max > 0 ? Math.round((current / max) * 100) : 0;
  const colorClass = percentage >= 95 ? "bg-destructive" : percentage >= 80 ? "bg-warning" : "bg-primary";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{current} / {max}</span>
      </div>
      <Progress value={percentage} className="h-2" indicatorClassName={colorClass} />
    </div>
  );
}
```

---

### `apps/dashboard/lib/nav-config.ts` (config, config) — MODIFIED

**Analog:** Existing `apps/dashboard/lib/nav-config.ts` (lines 1-132)

**Nav group pattern** (lines 86-94):
```typescript
  {
    label: "Gouvernance",
    icon: ShieldCheck,
    minRole: "ADMIN" as Role,
    items: [
      { label: "Audit", href: "/audit", icon: Shield, minRole: "ADMIN" as Role },
      { label: "Gouvernance", href: "/gouvernance", icon: ShieldCheck, minRole: "ADMIN" as Role },
      // ADD:
      { label: "Licences", href: "/licences", icon: Key, minRole: "ADMIN" as Role },
    ],
  },
```

Need to import `Key` from `lucide-react` (already imported at line 11).

---

### `apps/dashboard/lib/api.ts` (utility, request-response) — MODIFIED

**Analog:** Existing `apps/dashboard/lib/api.ts` (lines 1-1592)

**API function pattern to add** (follow lines 141-145, 933-956):
```typescript
import { fetchWithAuth } from "@/lib/auth-client";

// --- License Types ---

export interface LicenseStatusDto {
  licenseState: 'trial' | 'active' | 'grace' | 'expired' | 'no_license';
  expiresAt?: string;
  graceEndsAt?: string;
  trialEndsAt?: string;
  maxCameras?: number;
  maxDoors?: number;
  isUnlimited?: boolean;
}

export interface LicenseUsageDto {
  cameras: { current: number; max: number };
  doors: { current: number; max: number };
}

// --- License API Functions ---

export async function getLicenseStatus(): Promise<LicenseStatusDto> {
  const res = await fetchWithAuth(`${API_URL}/api/licenses/status`);
  if (!res.ok) throw new Error('Échec du chargement du statut de la licence');
  return res.json();
}

export async function getLicenseUsage(): Promise<LicenseUsageDto> {
  const res = await fetchWithAuth(`${API_URL}/api/licenses/usage`);
  if (!res.ok) throw new Error("Échec du chargement de l'utilisation");
  return res.json();
}

export async function activateLicense(licenseJwt: string): Promise<{ status: string; claims: any }> {
  const res = await fetchWithAuth(`${API_URL}/api/licenses/activate`, {
    method: 'POST',
    body: JSON.stringify({ licenseJwt }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Échec de l'activation de la licence");
  }
  return res.json();
}
```

---

### `apps/dashboard/app/(dashboard)/parametres/page.tsx` (page, display) — MODIFIED

**Analog:** Existing settings page (follow established component adding pattern)

Add a "Licence" card at the bottom of the settings page following existing card patterns:
```typescript
// Inside settings page, add:
<Card>
  <CardHeader>
    <CardTitle>Licence</CardTitle>
  </CardHeader>
  <CardContent>
    <LicenseStatusBadge state={licenseStatus.licenseState} />
    <LicenseUsageBars current={usage.cameras.current} max={usage.cameras.max} label="Caméras" />
    <LicenseUsageBars current={usage.doors.current} max={usage.doors.max} label="Portes" />
  </CardContent>
</Card>
```

---

## Shared Patterns

### Authentication
**Source:** `apps/api/src/common/guards/jwt-auth.guard.ts` (lines 1-33)
**Apply to:** LicenseController endpoints (except `/generate` which uses API key auth)

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
  handleRequest(err: any, user: any) {
    if (err || !user) throw err || new UnauthorizedException();
    return user;
  }
}
```

### AppModule Registration
**Source:** `apps/api/src/app.module.ts` (lines 49-97)
**Apply to:** Adding LicenseModule to AppModule imports

```typescript
@Module({
  imports: [
    // ... existing imports ...
    LicenseModule,
  ],
  providers: [
    // ... existing guards ...
  ],
})
```

### Prisma Service Pattern
**Source:** `apps/api/src/modules/prisma/prisma.service.ts` (lines 1-29)
**Apply to:** LicenseService (inject PrismaService for DB access)

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  async onModuleInit() {
    // Database connection setup
  }
}
```

### ZodValidationPipe Pattern
**Source:** `apps/api/src/common/pipes/zod-validation.pipe.ts` + `apps/api/src/modules/auth/auth.controller.ts` line 44
**Apply to:** All LicenseController POST endpoints

```typescript
@Body(new ZodValidationPipe(activateLicenseSchema))
```

### RolesGuard Pattern (for admin-only endpoints)
**Source:** `apps/api/src/common/guards/roles.guard.ts` (lines 1-42)
**Apply to:** License list all orgs, API key management endpoints

```typescript
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
@Get()
async listAllLicenses(@Req() req: FastifyRequest) { ... }
```

### API Client fetchWithAuth Pattern
**Source:** `apps/dashboard/lib/api.ts` (lines 1-6, 141-145)
**Apply to:** All dashboard license API functions

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
export async function fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
  // Handles JWT header, auto-refresh on 401, etc.
}
```

### Dashboard Card Pattern
**Source:** `apps/dashboard/app/(dashboard)/audit/page.tsx` (lines 172-199)
**Apply to:** License status cards, settings page cards

```tsx
<Card>
  <CardContent className="p-4">
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </CardContent>
</Card>
```

### Dashboard Table Pattern
**Source:** `apps/dashboard/app/(dashboard)/audit/page.tsx` (lines 293-319)
**Apply to:** License list table on `/licences`

```tsx
<Card>
  <CardContent className="p-0">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Colonne 1</th>
            <th className="px-4 py-3 text-left font-medium">Colonne 2</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
              <td className="px-4 py-3">{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </CardContent>
</Card>
```

### ConfigService Pattern
**Source:** `apps/api/src/config/configuration.ts` (lines 1-67)
**Apply to:** Loading `LICENSE_PRIVATE_KEY_PATH` in LicenseKeyManager

```typescript
const keyPath = this.config.get<string>('license.privateKeyPath');
```

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/dashboard/components/license-usage-bars.tsx` | component | display | No Progress component exists yet; must install shadcn `progress` |
| `apps/api/src/modules/license/license-public-key.ts` | config | static | New pattern — PEM bundle as TypeScript constant (conceptually similar to roles.ts but structurally new) |
| `apps/dashboard/app/(dashboard)/licences/page.tsx` | page | CRUD | New route `/licences` — combine existing page patterns with license-specific UI |

## Metadata

**Analog search scope:** `apps/api/src/modules/`, `apps/api/src/common/guards/`, `packages/shared/src/`, `apps/dashboard/app/(dashboard)/`, `apps/dashboard/lib/`, `apps/dashboard/components/`
**Files scanned:** ~50
**Pattern extraction date:** 2026-07-15
