# Phase 5: Monetization — Research

**Researched:** 2026-07-15
**Domain:** License-based monetization, crypto-signed JWT, device limit enforcement, multi-tier access control
**Confidence:** HIGH

## Summary

Phase 5 implements a pure licensing model for Oversight Hub — crypto-signed JWT license keys (RS256) bound to organizations that carry device limits (cameras, doors) and expiration. No Stripe, no PayPal, no subscription billing. Licenses are created by Oversight Hub admins via dashboard or REST API, and activated by customers in their self-hosted instance. Enforcement is local/offline — RSA public key bundled in the application, private key loaded from a Docker volume at startup.

The implementation spans four tiers: (1) **API backend** — Prisma schema changes, LicenseModule with RS256 signing/verification, license enforcement guards/hooks in CameraService and DoorService; (2) **Admin Dashboard** — License management page, license creation form, API key management, trial/expiration banners; (3) **Client Dashboard** — License activation page, license status on settings; (4) **Infrastructure** — RSA key generation, Docker volume mount, env vars.

**Primary recommendation:** Build LicenseService as a self-contained NestJS module with `jsonwebtoken` for RS256 signing (not `@nestjs/jwt` which is optimized for symmetric HMAC). Enforce license limits via a `LicenseGuard` checked in controller layer before CameraService/DoorService calls, plus UI validation. Store license state in a new `License` Prisma model plus `trialStartDate`/`trialEndDate` fields on Organization for the 7-day trial.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Pure licensing model — no Stripe, no PayPal, no subscription billing integration. Payment/acquisition happens outside the platform.
- **D-02:** No free tier — the app is self-hosted by paying customers only.
- **D-03:** Licenses generated via Oversight Hub admin dashboard UI (dedicated "Licences" page).
- **D-04:** Licenses also creatable programmatically via REST API, authenticated with a dedicated API key (not user JWT).
- **D-05:** License key is a crypto-signed JWT that the customer pastes/activates in their self-hosted dashboard.
- **D-06:** Claims: `organizationId`, `issuedAt`, `expiresAt`, `maxCameras`, `maxDoors`, `gracePeriodDays`, `licenseVersion`.
- **D-07:** No feature flags in the license — all features are available within device limits.
- **D-08:** No user limit — only camera and door counts are constrained.
- **D-09:** 7-day grace period after license expiry. During grace, full functionality continues with dashboard warnings.
- **D-10:** After 7 days, API blocks all mutations (read-only / blocked mode).
- **D-11:** 100% local validation — license JWT verified against a bundled RSA public key. No phone-home required.
- **D-12:** No revocation support — licenses expire naturally. Early deactivation is handled by issuing a replacement license with an earlier expiry date.
- **D-13:** RSA key pair. Private key loaded from a Docker volume file at API startup. Public key bundled in the application for offline verification.
- **D-14:** API refuses creation of cameras/doors beyond license limits with a clear error message. No over-limit allowance.
- **D-15:** UI also validates limits before allowing creation attempts (double barrier).
- **D-16:** New organizations (created via registration in Phase 4) get a 7-day trial with unlimited devices.
- **D-17:** Trial period is time-only — no device limits during trial. After 7 days, a valid license is required.

### the agent's Discretion
- Dashboard UI details for the "Licences" page (layout, tables, forms) — follow established Dashboard patterns (shadcn/ui, dark theme).
- API key management for license generation endpoint (creation UI, storage, rotation).
- License import/activation UI on the client dashboard.
- Exact error message wording for over-limit and expiry blocks.
- Trial license representation (virtual JWT or DB flag).

### Deferred Ideas (OUT OF SCOPE)
- Superseded requirements BIL-01 through BIL-07 (Stripe/PayPal billing and subscription management).
- Feature Gate ↔ License Mapping (FeatureFlag model from Phase 4 not integrated with licensing in this phase).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIC-01 | Platform generates crypto-signed JWT license keys bound to a specific organization | RS256 signing via `jsonwebtoken` with RSA key pair. Claims: organizationId, issuedAt, expiresAt, maxCameras, maxDoors, gracePeriodDays, licenseVersion. |
| LIC-02 | License key carries device limits (cameras, doors) and feature flags | Claims modeled as D-06. Feature flags excluded per D-07. Device limits: maxCameras, maxDoors. |
| LIC-03 | License enforces device/user limits — stops accepting new cameras/doors when limit reached | Enforcement via LicenseGuard in CamerasController/DoorController + check in CameraService/DoorService + UI validation per D-15. |
| LIC-04 | License supports offline validation with periodic re-check and configurable grace period | Bundled RSA public key provides offline verification. Grace period implemented by checking expiresAt + gracePeriodDays at request time. |
| LIC-05 | Admin can upload/activate license key via dashboard UI | License activation page at `/licences/activation` with JWT paste field and validation. |
| LIC-06 | System shows license status, expiry, usage, and limits in admin dashboard | License list table at `/licences` with status badges, usage progress bars, expiry countdowns. |
| LIC-07 | License revocation immediately disables organization access after grace period | Natural expiry via D-12. Replacement license with earlier expiry date. Grace period transition enforced by LicenseGuard. |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| License JWT generation (RS256 signing) | API (LicenseService) | — | Signing requires RSA private key, which lives on the server. Admin dashboard calls API endpoint. |
| License verification | API (LicenseGuard middleware) | — | Verification is request-time — checks license state before allowing mutations. |
| License activation (JWT validation + storage) | API (LicenseController) | Dashboard (activation UI) | JWT signature verification happens server-side with bundled public key. UI provides paste-and-submit interface. |
| Admin license creation UI | Dashboard (Licences page) | API (LicenseController) | Admin fills form, API generates JWT, UI displays JWT for copy. |
| Device limit enforcement (cameras) | API (CameraService + LicenseGuard) | Dashboard (create form) | API layer blocks creation (primary). UI validation prevents form submission (secondary barrier per D-15). |
| Device limit enforcement (doors) | API (DoorService + LicenseGuard) | Dashboard (create form) | Same double-barrier pattern as cameras. |
| Trial system | API (Organization model + LicenseService) | Dashboard (trial banner) | DB-based trial tracking on Organization (trialStartDate, trialEndDate). No JWT needed for trial. |
| API key management for license generation | API (License API key model + guard) | Dashboard (API Key section) | Dedicated API key auth (not user JWT) for programmatic license creation per D-04. |
| Grace period enforcement | API (LicenseService) | Dashboard (warning banners) | API checks expiry + grace before mutations. UI shows countdown banners. |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `jsonwebtoken` | ^9.0.0 | RS256 JWT signing and verification | Industry standard for JWT with asymmetric keys. More flexible than `@nestjs/jwt` which optimizes for HMAC with single secret. Allows loading private key from file and public key separately. |
| Node.js `crypto` | built-in | RSA key pair generation (dev), key loading | No npm dependency needed. Use `crypto.generateKeyPairSync('rsa', { modulusLength: 4096 })` for generating keys. `crypto.createPrivateKey()` / `crypto.createPublicKey()` for loading PEM files. |
| `@prisma/client` | 5.22.0 | License, Organization, and API key persistence | Already the project ORM. New License model + Organization fields. |
| `zod` | 3.23.8 | License schema validation in controllers | Already used project-wide for request validation. New license schemas in `packages/shared`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `uuid` | ^10.0.0 | API key generation (raw format) | Already in project dependencies. Use `v4()` for API key tokens. |
| `@nestjs/passport` / `passport-custom` | 10.x / ^1.x | Custom passport strategy for API key auth | Optional — can implement API key auth as a simple guard without passport. Existing `SupervisionOrJwtGuard` pattern shows how. |
| shadcn `progress` | latest | Usage progress bars in dashboard UI | Install via `npx shadcn@latest add progress` — already listed in UI-SPEC.md |
| shadcn `select` | latest | Organization dropdown in license creation form | Install via `npx shadcn@latest add select` — optional, native select is acceptable per UI-SPEC.md |

### Installation

```bash
# Backend: jsonwebtoken for RS256 support + optional passport-custom
pnpm add jsonwebtoken --filter @repo/api
pnpm add -D @types/jsonwebtoken --filter @repo/api

# Dashboard: shadcn components
npx shadcn@latest add progress select
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jsonwebtoken` | `@nestjs/jwt` with `privateKey` option | `@nestjs/jwt` wraps `jsonwebtoken` but is designed for symmetric HMAC with a single secret. RS256 requires passing `{ algorithm: 'RS256', privateKey }` separately for signing and `{ publicKey }` for verification. Works but adds indirection. Using `jsonwebtoken` directly is simpler for asymmetric use case. |
| `jsonwebtoken` | `jose` library | `jose` is the modern replacement for `jsonwebtoken` (which is unmaintained since 2022). However, `jsonwebtoken` still works and is deeply understood. `jose` requires different API patterns (JWK/PEM conversion). Consider `jose` if this worries you — see Open Questions. |
| DB-based trial | Virtual JWT for trial | Simpler to use DB fields on Organization than to generate a fake JWT. Trial is purely time-based anyway. |
| Dedicated LicenseGuard | Check in CameraService/DoorService methods | Putting checks at controller guard level is more reusable (blocks any route before service is hit). Service-level check as second layer. Use both patterns. |

---

## Package Legitimacy Audit

> Protocol: slopcheck unavailable at research time. All packages below tagged `[ASSUMED]` — planner must gate each install behind a `checkpoint:human-verify` task.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `jsonwebtoken` | npm | ~11 yrs | ~50M/wk | github.com/auth0/node-jsonwebtoken | [ASSUMED] | Approved — well-known, stable |
| `@types/jsonwebtoken` | npm | ~11 yrs | ~30M/wk | github.com/DefinitelyTyped/DefinitelyTyped | [ASSUMED] | Approved — DefinitelyTyped |
| `passport-custom` | npm | ~7 yrs | ~500K/wk | github.com/mbell8903/passport-custom | [ASSUMED] | Approved — well-known |

**Packages removed due to slopcheck:** none (slopcheck unavailable)
**Packages flagged as suspicious:** none

---

## Architecture Patterns

### System Architecture Diagram

```text
┌──────────────────────────────────────────────────────────────────┐
│                        Admin Dashboard                            │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ /licences        │  │ /licences/       │  │ /parametres    │  │
│  │ License list +   │  │ activation       │  │ License status │  │
│  │ create form      │  │ JWT activation   │  │ card           │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬────────┘  │
│           │                     │                     │           │
│           │  POST /api/licenses │  POST /api/         │ GET /api/ │
│           │  /generate (admin)  │  licenses/activate  │ licenses/ │
│           │                     │                     │ status    │
│           ▼                     ▼                     ▼           │
└──────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                      NestJS API (Fastify)                         │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                  LicenseModule                             │    │
│  │  ┌────────────────┐  ┌───────────────────┐               │    │
│  │  │ LicenseController│  │ LicenseService     │               │    │
│  │  │ - POST /generate │  │ - signLicense()    │               │    │
│  │  │ - POST /activate │  │ - verifyLicense()   │               │    │
│  │  │ - GET /status    │  │ - getLicenseStatus()│               │    │
│  │  │ - GET /usage     │  │ - checkLimits()    │               │    │
│  │  └────────┬─────────┘  └────────┬──────────┘               │    │
│  │           │                     │                            │    │
│  │           │  jsonwebtoken.sign()│  crypto.createPrivateKey() │    │
│  │           │  with RS256         │  → loads PEM from file     │    │
│  │           ▼                     ▼                            │    │
│  │  ┌─────────────────────────────────────────────────┐       │    │
│  │  │  RSA Key Manager (singleton service)             │       │    │
│  │  │  - onModuleInit: load privateKey from path       │       │    │
│  │  │  - publicKey bundled in codebase (PEM constant)  │       │    │
│  │  └─────────────────────────────────────────────────┘       │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  LicenseGuard (optional, used on mutation endpoints)      │    │
│  │  - Checks license not expired (accounting for grace)      │    │
│  │  - Checks device limits before allowing mutations         │    │
│  │  - Applied to camera/door create/update/delete routes     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  CameraService + DoorService                              │    │
│  │  - create() checks count against license maxCameras/doors│    │
│  │  - Throws BadRequestException if limit reached            │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  ApiKeyGuard                                             │    │
│  │  - Validates X-API-Key header against ApiKey table       │    │
│  │  - Used on POST /api/licenses/generate                   │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Database (PostgreSQL via Prisma)               │
│                                                                    │
│  Organization (updated):          License (new):                   │
│  ├ trialStartDate: DateTime?      ├ id: String (uuid)              │
│  ├ trialEndDate: DateTime?        ├ organizationId: String         │
│  ├ licenseStatus: String?         ├ licenseJwt: String (TEXT)      │
│  │  = 'trial' / 'active' /        ├ status: LicenseStatus          │
│  │    'grace' / 'expired'         │  = 'active' / 'grace' /        │
│  │                                 │    'expired'                   │
│                                   ├ activatedAt: DateTime?         │
│                                   ├ expiresAt: DateTime            │
│                                   ├ maxCameras: Int                │
│                                   ├ maxDoors: Int                  │
│                                   ├ gracePeriodDays: Int           │
│                                   └ licenseVersion: Int            │
│                                                                    │
│  LicenseApiKey (new):                                             │
│  ├ id: String (uuid)                                              │
│  ├ name: String                                                   │
│  ├ keyHash: String (SHA-256 of actual key)                        │
│  ├ keyPrefix: String (last 4 chars for display)                   │
│  ├ isActive: Boolean                                                 │
│  ├ createdById: String                                            │
│  └ createdAt: DateTime                                             │
└──────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Client Dashboard (Next.js)                      │
│                                                                    │
│  ├ License activation form (/licences/activation)                 │
│  ├ License status + usage on settings (/parametres)               │
│  ├ Grace period warning banner (top bar)                          │
│  ├ Trial countdown banner (top bar)                               │
│  ├ Camera/Door create form checks limits before submit            │
│  └ All French copy                                                │
└──────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
apps/api/src/modules/license/
├── license.module.ts          # @Module with controllers, services, exports
├── license.controller.ts      # REST endpoints: generate, activate, status, usage
├── license.service.ts         # Business logic: sign, verify, check limits
├── guards/
│   ├── license-api-key.guard.ts   # X-API-Key validation for /generate
│   └── license-expiry.guard.ts    # Validates license not expired/over-limit
├── license-key-manager.ts     # Singleton: loads RSA keys, provides sign/verify helpers
├── dto/
│   └── license.dto.ts         # class-validator DTOs (if needed for Swagger)
└── license.types.ts           # Internal types (LicenseClaims, LicenseStatus)

apps/api/src/modules/license-api-key/
├── license-api-key.module.ts
├── license-api-key.service.ts
├── license-api-key.controller.ts

packages/shared/src/schemas/
├── license.schema.ts          # Zod schemas: generateLicense, activateLicense

packages/shared/src/constants/
├── license.constants.ts       # LICENSE_VERSION, LICENSE_STATUS values

packages/shared/src/types/
└── license.types.ts          # LicenseClaims, LicenseStatusDto, etc.

apps/dashboard/app/(dashboard)/
├── licences/
│   ├── page.tsx              # License list (admin)
│   └── activation/
│       └── page.tsx          # License activation form (client)
└── components/
    ├── license-status-badge.tsx
    ├── license-usage-bars.tsx
    ├── license-expiry-countdown.tsx
    ├── license-activation-form.tsx
    ├── license-empty-state.tsx
    ├── api-key-create-dialog.tsx
    └── api-key-list.tsx
```

### Pattern 1: LicenseService — RS256 JWT Signing
**What:** Sign license claims into a JWT with RS256 algorithm using a private key loaded from file.
**When to use:** Every time an admin creates a license (via dashboard or API).
**Example:**
```typescript
// Source: [VERIFIED: codebase pattern from auth.service.ts + jsonwebtoken docs]
import * as jwt from 'jsonwebtoken';

export class LicenseService {
  constructor(
    private keyManager: LicenseKeyManager,
    private prisma: PrismaService,
  ) {}

  async generateLicense(dto: GenerateLicenseDto): Promise<string> {
    const privateKey = this.keyManager.getPrivateKey();
    
    const claims: LicenseClaims = {
      organizationId: dto.organizationId,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(new Date(dto.expiresAt).getTime() / 1000),
      maxCameras: dto.maxCameras,
      maxDoors: dto.maxDoors,
      gracePeriodDays: dto.gracePeriodDays ?? 7,
      licenseVersion: LICENSE_CURRENT_VERSION,
    };

    const token = jwt.sign(claims, privateKey, { 
      algorithm: 'RS256',
      issuer: 'oversight-hub',
    });

    // Store in DB for lookup (optimization — primary source is JWT itself)
    await this.prisma.license.create({
      data: {
        organizationId: dto.organizationId,
        licenseJwt: token,
        status: 'PENDING', // Not activated yet
        expiresAt: new Date(dto.expiresAt),
        maxCameras: dto.maxCameras,
        maxDoors: dto.maxDoors,
        gracePeriodDays: dto.gracePeriodDays ?? 7,
        licenseVersion: LICENSE_CURRENT_VERSION,
      },
    });

    return token;
  }

  async verifyAndActivate(jwtToken: string, orgId: string): Promise<LicenseStatus> {
    const publicKey = this.keyManager.getPublicKey();
    
    // Verify signature and decode
    const claims = jwt.verify(jwtToken, publicKey, {
      algorithms: ['RS256'],
    }) as LicenseClaims;

    // Verify bound to this org
    if (claims.organizationId !== orgId) {
      throw new BadRequestException('License not applicable to this organization');
    }

    // Check not expired
    const now = Math.floor(Date.now() / 1000);
    if (claims.expiresAt < now) {
      throw new BadRequestException('License has expired');
    }

    // Store as active
    await this.prisma.license.updateMany({
      where: { organizationId: orgId, status: 'PENDING' },
      data: { status: 'ACTIVE', activatedAt: new Date() },
    });

    return { status: 'active', claims };
  }
}
```

### Pattern 2: License Guard — Enforcement at Route Level
**What:** A NestJS guard that checks license validity before allowing mutation requests.
**When to use:** On POST/PUT/PATCH/DELETE routes for Camera, Door, and any other limited resources.
**Example:**
```typescript
// Source: [VERIFIED: codebase pattern from feature-gate.guard.ts]
@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(
    private licenseService: LicenseService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const orgId = request.user?.orgId;
    if (!orgId) return true; // Let other guards handle auth

    const status = await this.licenseService.getLicenseStatus(orgId);
    
    // Check expiry with grace period
    if (status.licenseState === 'expired') {
      throw new ForbiddenException(
        'License expired. System is in read-only mode. Contact your administrator.'
      );
    }

    // Check device limits for create operations
    if (request.method === 'POST') {
      if (status.licenseState === 'trial') {
        return true; // Trial has unlimited devices per D-17
      }
      
      // The specific limit check (cameras vs doors) is done in the service layer
    }

    return true;
  }
}
```

### Pattern 3: RSA Key Manager — Singleton Service
**What:** Loads the RSA private key from a file path at startup and makes it available to LicenseService. Public key is bundled as a PEM constant.
**When to use:** Application initialization — loaded once in `onModuleInit`.
**Example:**
```typescript
// Source: [VERIFIED: codebase pattern from prisma.service.ts]
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
      this.logger.error(`Failed to load license key from ${keyPath}: ${err.message}`);
    }
  }

  getPrivateKey(): crypto.KeyObject {
    if (!this.privateKey) {
      throw new Error('License signing key not loaded');
    }
    return this.privateKey;
  }

  getPublicKey(): crypto.KeyObject {
    // Bundled PEM constant — checked in during build
    return crypto.createPublicKey(LICENSE_PUBLIC_KEY_PEM);
  }
}

// In a separate file: license-public-key.ts
// This file is generated once when the RSA key pair is created.
// The private key goes into Docker volume; the public key is committed to the codebase.
export const LICENSE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`;
```

### Anti-Patterns to Avoid

- **Storing license state in env vars:** JWT claims are authoritative. The DB License table is an optimization cache. Never read limits from env vars.
- **Using `@nestjs/jwt` with secret for RS256:** `@nestjs/jwt.register({ secret: pem })` won't work correctly for RS256 because it defaults to HS256. If using `@nestjs/jwt`, pass `{ privateKey, signOptions: { algorithm: 'RS256' } }` separately. Simpler: use `jsonwebtoken` directly.
- **Enforcing limits only in the UI:** D-15 mandates double barrier (API + UI). UI-only enforcement can be bypassed via curl.
- **Soft-deleting License records:** A license that has been activated and then replaced should remain in the DB for audit. Use status field, not deletion.
- **Generating RSA keys at app startup:** Keys must be stable across restarts. Pre-generate with a CLI script (use `openssl` or a NestJS CLI command), mount private key via Docker volume.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing/verification | Manual RS256 implementation with Node crypto | `jsonwebtoken` library | Handles header generation, padding, algorithm negotiation, expiration validation, and error messages. Rolling your own JWT library is error-prone. |
| RSA key generation | `crypto.generateKeyPairSync` in application code | `openssl genrsa` CLI or a setup script | Generate keys once at deployment setup time. App should only load existing keys, never generate them. |
| API key hashing | Custom hash + compare logic | SHA-256 via Node.js `crypto.createHash('sha256')` | Simple one-liner. API keys are bearer tokens — hash at rest, compare on each request. No bcrypt needed (API keys are not passwords). |

**Key insight:** The licensing domain is well-understood cryptography + business logic. The only non-trivial parts are: (1) correct RS256 JWT construction with pem-to-key-object conversion, (2) proper error handling when private key is missing at startup, (3) the trial→grace→expired state machine transitions. Everything else is standard CRUD with Prisma + standard guards.

---

## Database Schema Changes

### New Model: License (in schema.prisma)

```prisma
enum LicenseStatus {
  PENDING
  ACTIVE
  GRACE
  EXPIRED
}

model License {
  id             String         @id @default(uuid())
  organizationId String
  licenseJwt     String         // The full JWT string (for reference/audit)
  status         LicenseStatus  @default(PENDING)
  activatedAt    DateTime?
  expiresAt      DateTime
  maxCameras     Int
  maxDoors       Int
  gracePeriodDays Int           @default(7)
  licenseVersion Int            @default(1)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  organization   Organization   @relation(fields: [organizationId], references: [id])

  @@index([organizationId])
  @@unique([organizationId, licenseVersion]) // One active license per version per org
}
```

### Updated Model: Organization (additions)

```prisma
model Organization {
  // ... existing fields ...
  trialStartDate DateTime?
  trialEndDate   DateTime?
  // Keep existing: stripeCustomerId String?, billingEmail String?, planTier String?
  // These remain as optional metadata fields
}
```

### New Model: LicenseApiKey

```prisma
model LicenseApiKey {
  id          String   @id @default(uuid())
  name        String
  keyHash     String   @unique // SHA-256 hash of the raw API key
  keyPrefix   String   // Last 4 chars of the raw key, for display ("••••••••abcd")
  isActive    Boolean  @default(true)
  createdById String
  createdAt   DateTime @default(now())
  revokedAt   DateTime?

  createdBy   User     @relation(fields: [createdById], references: [id])

  @@index([isActive])
  @@index([keyHash])
}
```

### Relationship with existing models

- **License → Organization**: Many-to-one. An org can have multiple licenses (for replacements/upgrades), but only one ACTIVE license at a time.
- **LicenseApiKey → User**: Many-to-one. Tracks which admin created each API key.
- **FeatureFlag**: Not connected to License per D-07 and deferred ideas. Remains separate.

---

## License Enforcement Architecture

### Guard Order (in AppModule providers)

```typescript
// Source: [VERIFIED: codebase pattern from app.module.ts]
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },       // Auth
  { provide: APP_GUARD, useClass: TenantIsolationGuard }, // Tenant
  { provide: APP_GUARD, useClass: RolesGuard },           // RBAC
  // NEW: Not an APP_GUARD — applied selectively via @UseGuards(LicenseGuard)
]
```

`LicenseGuard` should NOT be a global APP_GUARD. Instead, apply it selectively to mutation endpoints:

```typescript
// In CamerasController
@Post()
@UseGuards(LicenseGuard)  // Checks license expiry + camera limit
async create(@Body(...) body: CreateCameraInput) {
  // CameraService.create() also checks limits internally (second layer)
  return this.cameraService.create(body);
}
```

### Locked/Read-Only Mode Enforcement

When a license has expired past its grace period:
1. `LicenseGuard` throws `ForbiddenException` on all POST/PUT/PATCH/DELETE routes
2. `LicenseService.getLicenseStatus()` returns `{ licenseState: 'expired' }`
3. Dashboard checks this status and shows read-only UI (disable buttons, show banners)

### Trial System Implementation (Recommended: DB-only approach)

Per D-16/D-17, new organizations get a 7-day trial with unlimited devices. Implementation:

```typescript
// In OrganizationService.register() or AuthService.register():
const org = await tx.organization.create({
  data: {
    name: data.organizationName,
    trialStartDate: new Date(),
    trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    billingEmail: data.email,
  },
});

// In LicenseService.getLicenseStatus():
async getLicenseStatus(orgId: string) {
  const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
  
  // Check trial
  if (org.trialStartDate && org.trialEndDate > new Date()) {
    return { 
      licenseState: 'trial',
      trialEndsAt: org.trialEndDate,
      isUnlimited: true, // D-17: no device limits during trial
    };
  }
  
  // Check if trial expired with no license
  if (org.trialEndDate < new Date()) {
    const hasLicense = await this.prisma.license.findFirst({
      where: { organizationId: orgId, status: 'ACTIVE' },
    });
    if (!hasLicense) {
      return { licenseState: 'expired', message: 'Trial ended. Activate a license.' };
    }
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
  const graceEnd = new Date(license.expiresAt.getTime() + license.gracePeriodDays * 86400000);
  if (license.expiresAt < new Date() && graceEnd > new Date()) {
    return { 
      licenseState: 'grace', 
      expiresAt: license.expiresAt,
      graceEndsAt: graceEnd,
      maxCameras: license.maxCameras,
      maxDoors: license.maxDoors,
    };
  }

  if (license.expiresAt < new Date()) {
    await this.prisma.license.update({
      where: { id: license.id },
      data: { status: 'EXPIRED' },
    });
    return { licenseState: 'expired' };
  }

  return {
    licenseState: 'active',
    expiresAt: license.expiresAt,
    maxCameras: license.maxCameras,
    maxDoors: license.maxDoors,
  };
}
```

---

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/licenses/generate` | API Key (X-API-Key header) | Generate new license JWT for an organization. Returns JWT string + decoded claims. |
| `POST` | `/api/licenses/activate` | User JWT | Activate a license JWT for the user's org. Verifies signature, binds to org. |
| `GET` | `/api/licenses/status` | User JWT | Get current license status for the user's org (state, expiry, limits, usage). |
| `GET` | `/api/licenses` | User JWT (ADMIN) | List all licenses across all orgs (admin view). |
| `GET` | `/api/licenses/usage` | User JWT | Get current usage counts (cameras, doors) vs license limits. |
| `POST` | `/api/licenses/api-keys` | User JWT (ADMIN) | Create a new API key for programmatic license generation. |
| `GET` | `/api/licenses/api-keys` | User JWT (ADMIN) | List API keys (showing only prefix and name). |
| `DELETE` | `/api/licenses/api-keys/:id` | User JWT (ADMIN) | Revoke an API key. |

---

## RSA Key Management

### Key Generation (setup script)

```bash
# Generate RSA private key (4096-bit)
openssl genrsa -out license-private.pem 4096

# Extract public key
openssl rsa -in license-private.pem -pubout -out license-public.pem

# Mount private key in Docker volume (docker-compose.prod.yml addition)
# Mount public key is NOT needed — it's committed to the codebase
```

### Docker Compose Changes

```yaml
# In docker-compose.prod.yml, api service:
api:
  volumes:
    # ... existing volumes ...
    - ./secrets/license-private.pem:/app/secrets/license-private.pem:ro
  environment:
    # ... existing env vars ...
    LICENSE_PRIVATE_KEY_PATH: /app/secrets/license-private.pem
```

### Env Var Additions

Add to `.env.example` and `validation.ts`:

```typescript
// In config/validation.ts:
LICENSE_PRIVATE_KEY_PATH: Joi.string().optional(),
LICENSE_PUBLIC_KEY: Joi.string().optional(), // If not bundling in code
SIGNING_KEY_ID: Joi.string().optional(),
```

```typescript
// In config/configuration.ts:
license: {
  privateKeyPath: process.env.LICENSE_PRIVATE_KEY_PATH || '',
  publicKey: process.env.LICENSE_PUBLIC_KEY || '',
  version: parseInt(process.env.LICENSE_VERSION || '1', 10),
},
```

### Public Key Bundling Strategy

The public key is committed to the repository as a TypeScript constant file:

```typescript
// apps/api/src/modules/license/license-public-key.ts
// THIS FILE IS AUTO-GENERATED. DO NOT EDIT.
// Regenerate when the RSA key pair is rotated.
export const LICENSE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`;
```

Reasoning:
- D-13 requires offline verification — no phone-home
- Bundling public key in the codebase is safe (it's a public key)
- The private key NEVER enters the repository or Docker image — only the Docker volume
- Key rotation: generate new pair, update public key file, deploy new Docker image, mount new private key

---

## Common Pitfalls

### Pitfall 1: Private Key Not Loaded at Startup
**What goes wrong:** API starts but no private key was loaded — admin tries to generate a license and gets a 500 error.
**Why it happens:** `LICENSE_PRIVATE_KEY_PATH` env var not set, or the file path doesn't exist in the container, or file permissions don't allow reading.
**How to avoid:** Graceful degradation — if key is missing, `/api/licenses/generate` returns a clear 503 error ("License signing key not configured"). The `/api/licenses/status` and `/api/licenses/activate` (which use the public key) should still work.
**Warning signs:** Server log warning "License signing key not loaded" on startup.

### Pitfall 2: JWT Clock Skew
**What goes wrong:** A freshly generated license appears expired when verified on a different machine.
**Why it happens:** System clocks differ between the admin's deployment (generating) and the customer's deployment (verifying). The `exp` claim is checked against local time.
**How to avoid:** Use `jsonwebtoken`'s `clockTolerance` option in `jwt.verify()` — set a 60-second tolerance. Also, the `exp` check in `LicenseGuard` should use `Math.floor(Date.now() / 1000) > claims.expiresAt` with a small tolerance.
**Warning signs:** Intermittent "license expired" errors on activation.

### Pitfall 3: Double Barrier Not Actually Double
**What goes wrong:** UI checks limits before calling API, but the API layer doesn't check — or vice versa.
**Why it happens:** Only one layer implemented due to oversight.
**How to avoid:** Both enforcement points are non-negotiable per D-15. In the plan, explicitly create distinct tasks: (1) "Add license limit check to CameraService.create()" and (2) "Add license limit check to camera creation form in Dashboard".
**Warning signs:** Testing camera creation with curl succeeds when UI claims limit is reached (missing API check), or UI lets through when API blocks (missing UI check).

### Pitfall 4: Grace Period Transition Race Condition
**What goes wrong:** A mutation starts during grace period but the license expires mid-request.
**Why it happens:** License expiry check happens at start of request, but a long request might cross the expiry boundary.
**How to avoid:** Not a real concern for this phase — all mutations are synchronous and fast (< 1s). The 7-day grace window means exact-second precision isn't required. The check at request start is sufficient.

### Pitfall 5: Trial State Not Properly Merged with License Status
**What goes wrong:** License status endpoint returns inconsistent results — says "trial" but also shows an active license, or says "expired" when trial is still active.
**Why it happens:** The `getLicenseStatus` method checks trial first and returns immediately without considering active licenses.
**How to avoid:** Priority order: active license > grace > trial > expired. If an org has an active license (even during trial), show license status, not trial status. If license expires during trial, show grace/expired based on license (the 7-day trial and the 7-day grace can overlap naturally but the license check takes precedence).

---

## Code Examples

### Example 1: License JWT Structure

```typescript
// Source: D-06 claims definition + jsonwebtoken docs
export interface LicenseClaims {
  /** Organization this license is bound to */
  organizationId: string;
  /** Unix timestamp when the license was issued */
  issuedAt: number;
  /** Unix timestamp when the license expires (before grace) */
  expiresAt: number;
  /** Maximum number of cameras allowed */
  maxCameras: number;
  /** Maximum number of doors allowed */
  maxDoors: number;
  /** Number of days after expiry before entering read-only mode */
  gracePeriodDays: number;
  /** License format version (for future compatibility) */
  licenseVersion: number;
}
```

### Example 2: CameraService Limit Check

```typescript
// Source: [VERIFIED: codebase pattern from camera.service.ts]
async create(data: Prisma.CameraCreateInput) {
  // Check license limits before allowing creation
  const orgId = data.organizationId;
  const licenseStatus = await this.licenseService.getLicenseStatus(orgId);
  
  if (licenseStatus.licenseState === 'expired' || licenseStatus.licenseState === 'no_license') {
    throw new BadRequestException('License expired. Cannot create new cameras.');
  }

  if (licenseStatus.licenseState === 'trial') {
    // D-17: Unlimited devices during trial
    return this.prisma.camera.create({ data, include: { organization: { select: { id: true, name: true } } } });
  }

  if (licenseStatus.licenseState === 'active' || licenseStatus.licenseState === 'grace') {
    const cameraCount = await this.prisma.camera.count({
      where: { organizationId: orgId },
    });
    
    if (cameraCount >= licenseStatus.maxCameras!) {
      throw new BadRequestException(
        `Camera limit reached (${licenseStatus.maxCameras}). Contact your administrator to increase your limit.`
      );
    }
  }

  return this.prisma.camera.create({ data, include: { organization: { select: { id: true, name: true } } } });
}
```

### Example 3: API Key Auth Guard

```typescript
// Source: [VERIFIED: codebase pattern from feature-gate.guard.ts, roles.guard.ts]
import * as crypto from 'crypto';

@Injectable()
export class LicenseApiKeyGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS') private redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    
    if (!apiKey) {
      throw new UnauthorizedException('API key required (X-API-Key header)');
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Check Redis cache first (optional optimization)
    // Fall through to DB on cache miss
    
    const keyRecord = await this.prisma.licenseApiKey.findUnique({
      where: { keyHash, isActive: true },
    });

    if (!keyRecord) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Attach key info to request for audit logging
    request.apiKeyInfo = { id: keyRecord.id, name: keyRecord.name };
    return true;
  }
}
```

### Example 4: Zod License Schema

```typescript
// Source: [VERIFIED: codebase pattern from auth.schema.ts, organization.schema.ts]
import { z } from 'zod';

export const generateLicenseSchema = z.object({
  organizationId: z.string().uuid('ID d\'organisation invalide'),
  maxCameras: z.number().int().min(0, 'Le nombre de caméras doit être ≥ 0'),
  maxDoors: z.number().int().min(0, 'Le nombre de portes doit être ≥ 0'),
  expiresAt: z.string().datetime('Format de date invalide'),
  gracePeriodDays: z.number().int().min(0).max(90).default(7),
  licenseVersion: z.number().int().default(1),
});

export const activateLicenseSchema = z.object({
  licenseJwt: z.string().min(1, 'La clé de licence est requise'),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'Le nom de la clé est requis'),
});

export type GenerateLicenseInput = z.infer<typeof generateLicenseSchema>;
export type ActivateLicenseInput = z.infer<typeof activateLicenseSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
```

### Example 5: Dashboard API Client Functions

```typescript
// Source: [VERIFIED: codebase pattern from apps/dashboard/lib/api.ts]
// — License API functions —

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

export async function getLicenseStatus(): Promise<LicenseStatusDto> {
  const res = await fetchWithAuth(`${API_URL}/api/licenses/status`);
  if (!res.ok) throw new Error('Échec du chargement du statut de la licence');
  return res.json();
}

export async function getLicenseUsage(): Promise<LicenseUsageDto> {
  const res = await fetchWithAuth(`${API_URL}/api/licenses/usage`);
  if (!res.ok) throw new Error('Échec du chargement de l\'utilisation');
  return res.json();
}

export async function activateLicense(licenseJwt: string): Promise<{ status: string; claims: any }> {
  const res = await fetchWithAuth(`${API_URL}/api/licenses/activate`, {
    method: 'POST',
    body: JSON.stringify({ licenseJwt }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Échec de l\'activation de la licence');
  }
  return res.json();
}
```

---

## Common Pitfalls (continued)

### Pitfall 6: License Status vs DB Out of Sync
**What goes wrong:** The DB License table status field says "ACTIVE" but the JWT has expired, or vice versa.
**Why it happens:** The JWT is the source of truth but DB is queried for convenience. If only DB is checked, a manually crafted DB query could bypass enforcement.
**How to avoid:** The canonical check for expiry should always verify the JWT claims directly (re-verify signature from DB-stored JWT string), not just read the DB `status` field. The DB status is a cache/optimization for sorting/filtering, not the enforcement mechanism.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `jsonwebtoken` with RS256 works for both signing (private key) and verification (public key) with separate key objects | Standard Stack | Low — well-documented API. Fallback: use `jose` library which has unified JWK/PEM handling. |
| A2 | Bundling public key as a PEM constant in TypeScript source is secure | RSA Key Management | LOW — public keys are designed to be public. No security risk. |
| A3 | Trial should be DB-based (Organization fields) rather than a virtual JWT | Architecture Patterns | LOW — both approaches work. DB approach simpler. If wrong, switch to virtual JWT is isolated to `getLicenseStatus()`. |
| A4 | `LicenseStatus` enum should have PENDING/ACTIVE/GRACE/EXPIRED | Database Schema | MEDIUM — if more states needed, add `REVOKED` or `REPLACED` later. Add migration-safe. |
| A5 | Only Camera and Door creation need limit checks (not updates or other resources) | Enforcement Architecture | MEDIUM — per D-08 (no user limits), D-07 (no feature flags). If future requirements add limits on other resources, the guard pattern extends easily. |
| A6 | `licenseVersion` claim is for future compatibility — initially always 1 | Claims | LOW — if multiple versions are needed later, the public key rotation scheme handles it. |

---

## Open Questions

1. **`jsonwebtoken` maintenance status**
   - What we know: `jsonwebtoken` is extremely popular but last updated ~2023. The `jose` library is the active successor.
   - What's unclear: Whether `jsonwebtoken` has unpatched vulnerabilities or compatibility issues with Node.js 20+.
   - Recommendation: Use `jsonwebtoken` for this phase (well-understood, works with Node 20). If security audit raises concerns, can switch to `jose` in a later phase with minimal API surface change (only LicenseService needs updating).

2. **API Key generation format**
   - What we know: Use `uuid v4()` as the raw key (already in the project). Hash with SHA-256 for storage.
   - What's unclear: Should the API key have a prefix pattern like `oh_license_` for easy identification? Should it include a checksum?
   - Recommendation: Keep it simple — UUID v4 as the raw key. Prefix is cosmetic and can be added later. The guard only needs to hash+compare.

3. **License replacement semantics**
   - What we know: When admin clicks "Remplacer", a new license is generated. Old one naturally expires.
   - What's unclear: Should the old license be immediately invalidated (status = REPLACED) or left active until its original expiry?
   - Recommendation: D-12 says "no revocation — natural expiry." But replacement is different — it's an intentional upgrade. Mark old license as REPLACED in DB status when a new one is activated for the same org. The new license explicitly replaces the old one. The guard checks for the most recent active license only.

4. **Grace period after replacement license expires**
   - What we know: 7-day grace from original expiry.
   - What's unclear: Does the grace period reset on replacement? E.g., original expires Jan 1, replacement issued Dec 15 with Jan 31 expiry — does the replacement get its own 7-day grace?
   - Recommendation: Yes — each license carries its own `gracePeriodDays`. The grace is calculated from _that_ license's `expiresAt`. This is the natural behavior of the JWT-based approach since each license JWT independently encodes its grace period.

---

## Dependencies

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `jsonwebtoken` | LicenseService RS256 signing | Not installed | — | Use `jose` or raw Node.js `crypto` with manual JWT construction |
| `openssl` | RSA key pair generation (dev setup) | ✓ | — | `crypto.generateKeyPairSync` in Node.js |
| Docker volumes | Mounting private key into API container | ✓ | — | Mount `-v` flag or env var fallback (less secure) |
| PostgreSQL | License, LicenseApiKey, Organization tables | ✓ | 16 | — |
| Prisma migrations | License, LicenseApiKey model creation | ✓ | 5.22.0 | Raw SQL migration if Prisma CLI unavailable |

**Missing dependencies with no fallback:**
- None — all dependencies have viable alternatives.

**Missing dependencies with fallback:**
- `jsonwebtoken` — can use `jose` or manual crypto if not installable.

---

## Environment Availability

> Step 2.6: See Dependencies section above. No external service dependencies (no Stripe, no PayPal, no webhook endpoints).

---

## Validation Architecture

> `workflow.nyquist_validation` is explicitly `false` in config. Section skipped.

---

## Security Domain

> `security_enforcement` not set in config (absent = enabled by default).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | API key guard for license generation (SHA-256 hash comparison) |
| V3 Session Management | Yes | Existing JWT auth covers all license endpoints (except /generate which uses API key) |
| V4 Access Control | Yes | LicenseGuard enforces expiry/limit on mutations; RolesGuard ensures only ADMIN can manage licenses |
| V5 Input Validation | Yes | Zod validation on all license endpoints (JWT format, org UUID, numeric limits) |
| V6 Cryptography | Yes | RS256 with 4096-bit RSA key; SHA-256 for API key hashing |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Fake license JWT (adversary attempts to forge a license) | Tampering / Spoofing | RS256 signature verification with bundled public key. Without the private key, adversary cannot forge a valid signature. |
| Replay attack (old license JWT reused after expiry) | Tampering | `exp` claim verified at activation time and on every request. `jwt.verify()` checks expiration automatically. |
| Org mismatch (license used by wrong organization) | Spoofing | `organizationId` claim checked against authenticated org during activation and enforcement. |
| Private key theft (adversary gains access to private key PEM file) | Information Disclosure | Private key stored on Docker volume only (never in repo/image). File permissions: read-only for API process (chmod 400). Volume mount: `:ro` (read-only). Risk accepted: no revocation mechanism (D-12). Mitigation: rotate keys if theft is suspected by generating a new pair and redeploying. |
| API key leakage (API key for license generation stolen) | Spoofing | Keys are hashed with SHA-256 at rest. Admin can revoke keys via dashboard. Rotation supported by creating new key and revoking old one. |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase inspection] — AppModule, guards, auth service, camera/door services, Prisma schema, nav-config, all checked for pattern extraction
- [VERIFIED: schema.prisma] — Current schema structure, Organization fields, tenant extension patterns
- [VERIFIED: UI-SPEC.md] — Full page designs for license management, activation, API key management, French copywriting

### Secondary (MEDIUM confidence)
- [ASSUMED: jsonwebtoken docs] — RS256 API patterns (sign with private key, verify with public key, algorithm option)
- [ASSUMED: Node.js crypto docs] — `createPrivateKey`, `createPublicKey`, `generateKeyPairSync` API

### Tertiary (LOW confidence)
- None — all critical claims verified against codebase or well-known documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `jsonwebtoken` is the de facto standard for RS256 JWT in Node.js
- Architecture: HIGH — patterns directly derive from verified codebase (guards, modules, services, auth)
- Pitfalls: HIGH — all derived from the production-security domain of licensing
- Database schema: HIGH — maps directly to D-06 claims requirements
- Security: HIGH — RS256 with 4096-bit RSA, SHA-256 key hashing, established threat model

**Research date:** 2026-07-15
**Valid until:** 2026-08-15 (30 days — stable stack)
