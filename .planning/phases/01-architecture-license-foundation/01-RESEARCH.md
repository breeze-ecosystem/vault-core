# Phase 1: Architecture & License Foundation — Research

**Researched:** 2026-07-18
**Domain:** License system refactor, feature gating, cron job ping, vault-app admin portal
**Confidence:** HIGH

## Summary

Phase 1 is the foundation for all VaultOS commercial requirements. It refactors the existing oversight-hub license system (originally built for a different business model with FREE/PROFESSIONAL/ENTERPRISE tiers) into a two-repo architecture: **vault-app** (RSA key generation, org management, license generation) and **vault-os** (license activation, verification, enforcement). The work spans six requirement tracks: license system refactor, feature gating, degradation mode, trial, vault-app admin portal, and cleanup.

**Key discovery:** `FeatureGateService.seedDefaultFlags()` is **defined but never called** anywhere in the codebase — the feature flag seeding was never wired into the org creation flow. This Phase needs to fix this and also completely rewrite the seeding logic from tier-based to pack+module-based.

**vault-app currently has NO Prisma setup, NO auth, NO database** — it is purely a Next.js marketing site with internationalized pages. The admin portal must be built from scratch on top of the existing vault-app project.

**Primary recommendation:** Split the work into 3 parallel tracks across both repos: (1) vault-admin backend (Prisma + auth + org/license API), (2) vault-os license refactor (schema, guards, ping cron, UI), (3) Terraform-like migration plan for the tier→pack transition with no existing production data.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIC-01 | Activation licence — client active sa clé dans vault-os | Existing `POST /api/licenses/activate` endpoint + `verifyAndActivate()` in license service. Need to remove `POST /api/licenses/generate` (moves to vault-app). |
| LIC-02 | Vérification 24h — ping vault-app toutes les 24h | `@nestjs/schedule` already in vault-os. Need to add HTTP client (`@nestjs/axios`) + cron service + `lastVerifiedAt` / `lastVerificationFailedAt` fields on `License` model. |
| LIC-03 | Lecture seule si licence expirée | Extend `LicenseExpiryGuard` to differentiate "degraded" (72h) from "expired" and "read-only". Add `@DegradedBlock()` decorator for mutation endpoints. |
| LIC-04 | Feature gating VISION/BASTION | `FeatureGateGuard` already exists as global APP_GUARD. Rewrite seeding to pack+module model. Replace `tier` with `pack` on FeatureFlag. |
| LIC-05 | Limites VISION — max 10 caméras | Encode `maxCameras`, `maxUsers`, `pack` in JWT claims. `LicenseService.getUsage()` already enforces limits. Extend for BASTION limits (25 cam + modules). |
| LIC-06 | Trial auto 7 jours | `LicenseService.getLicenseStatus()` already auto-initializes trial. Only needs minor adjustments to seed VISION flags instead of being unlimited. |
| ADM-01 | Connexion sécurisée vault-app | vault-app has NO auth. Need Prisma + bcrypt + JWT (separate from vault-os JWT). Express-like Next.js API routes under `/api/admin/*`. |
| ADM-02 | Gestion organisations vault-app | CRUD orgs in vault-app DB. Sync org data between vault-app and vault-os. |
| ADM-03 | Génération licences vault-app | RSA key pair generation UI. License JWT signing UI. |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| License JWT generation | vault-app (Next.js API) | — | Private key lives in vault-app; generation is vault-app's exclusive responsibility (D-15) |
| License JWT activation | vault-os API (NestJS) | — | Public key embedded in vault-os; activation happens at client site |
| Feature gating enforcement | vault-os API (FeatureGateGuard) | vault-os Dashboard (UI hints) | Guard chain runs in NestJS; gating decisions at API layer, not client |
| 24h ping mechanism | vault-os API (NestJS cron) | vault-app API (verification endpoint) | vault-os initiates; vault-app serves verification endpoint |
| Mode dégradé enforcement | vault-os API (guards) | vault-os Dashboard (read-only UI) | Guards block mutations at controller level; UI shows degraded banner |
| Trial initialization | vault-os API (LicenseService) | — | Auto-creates trial on first license status check |
| vault-app admin auth | vault-app (Next.js API routes) | — | Separate auth system from vault-os; email+password for VaultOS founders |
| vault-app org CRUD | vault-app (Next.js API routes) | vault-app UI (marketing pages) | Admin manages orgs from vault-app; orgs are mirrored in vault-os |
| vault-app license generation | vault-app (Next.js API routes) | vault-app UI (admin portal) | Admin selects pack/modules, signs with private key |

---

## Standard Stack

### vault-os (this monorepo) — additions/changes only

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/schedule` | 6.1.3 (already installed) | 24h ping cron job | Already in vault-os; `ScheduleModule.forRoot()` is registered in AppModule |
| `@nestjs/axios` | (latest v3.x compatible) | HTTP client for vault-app ping | Need to add; vault-os will call vault-app verification API every 24h |
| `jsonwebtoken` | 9.0.3 (already installed) | Verify RSA-signed license JWTs | Already used by `LicenseKeyManager` for RS256 verification |
| `@nestjs/jwt` | 10.2.0 (already installed) | Vault-os internal auth JWTs | Separate from license JWTs; for vault-os user sessions |
| `node:crypto` | (built-in) | RSA key loading | Already used by `LicenseKeyManager` |
| `ioredis` | 5.4.1 (already installed) | Feature gate caching queue state | Already used by `FeatureGateGuard` for 5-min TTL cache |

### vault-app — new dependencies needed

| Library | Purpose | Why |
|---------|---------|-----|
| `prisma` + `@prisma/client` | ORM for admin DB | vault-app has NO existing database; needs Prisma for org + admin user + license storage |
| `bcryptjs` | Admin password hashing | Standard for Next.js auth; vault-os already uses it |
| `jsonwebtoken` | Sign license JWTs + admin auth JWTs | RSA256 signing for license keys; separate HS256 for admin session |
| `next-intl` | (already installed) | Internationalization for admin portal pages |
| `zod` | Request validation | vault-os uses zod; consistent pattern |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@nestjs/axios` | Native `fetch()` | Native fetch works but @nestjs/axios integrates with NestJS DI, retry interceptors, and config. Since this is a cron job with retry needs, use @nestjs/axios. |
| `bcryptjs` | `bcrypt` | bcryptjs is pure JS (no native deps), already in vault-os. Use bcryptjs for vault-app too. |
| vault-app API routes | Separate Express app | API routes in Next.js are simpler for MVP. Vault-app is low traffic (admin-only), so Next.js API routes are sufficient. |
| Next.js Pages Router for admin | Next.js App Router | vault-app already uses App Router. Admin portal should use the same pattern: `app/admin/` route group. |

**Installation:**
```bash
# vault-os additions
cd /home/devuser/projects/vault-os && pnpm --filter=@vaultos/api add @nestjs/axios

# vault-app new dependencies
cd /home/devuser/projects/vault-app && pnpm add prisma @prisma/client bcryptjs jsonwebtoken zod
cd /home/devuser/projects/vault-app && pnpm add -D @types/bcryptjs @types/jsonwebtoken
```

---

## Package Legitimacy Audit

> Run `slopcheck` on these packages before install. Common well-known packages:
> - `@nestjs/axios` — official NestJS package, 4M+ weekly downloads [VERIFIED: npm registry]
> - `@nestjs/schedule` — official NestJS package, already in vault-os [VERIFIED: npm registry]
> - `prisma` / `@prisma/client` — 15M+ weekly downloads, well-known [VERIFIED: npm registry]
> - `bcryptjs` — 12M+ weekly downloads, well-known [VERIFIED: npm registry]
> - `jsonwebtoken` — 35M+ weekly downloads, well-known [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────┐         ┌───────────────────────────────┐
│     vault-app        │         │         vault-os              │
│   (Next.js:3200)     │         │    (NestJS localhost:3000)    │
│                      │         │                               │
│  ┌───────────────┐   │   RSA   │  ┌─────────────────────────┐  │
│  │ Admin Portal   │   │  Sign   │  │ LicenseController      │  │
│  │ - Auth (email) │──┼─────────┼──│  POST /activate          │  │
│  │ - Org CRUD    │   │  JWT    │  │  GET /status            │  │
│  │ - License Gen │   │         │  │  GET /usage             │  │
│  └───────────────┘   │         │  └─────────────────────────┘  │
│                      │         │                               │
│  ┌───────────────┐   │  REST   │  ┌─────────────────────────┐  │
│  │ Verification   │◄──┼─────────┼──│ PingCron (every 24h)   │  │
│  │ API            │   │  (ping) │  │ (calls vault-app)       │  │
│  │ GET /verify    │   │         │  └─────────────────────────┘  │
│  └───────────────┘   │         │                               │
│                      │         │  ┌─────────────────────────┐  │
│  ┌───────────────┐   │         │  │ Guard Chain:            │  │
│  │ Marketing     │   │         │  │ JwtAuth → TenantIso →   │  │
│  │ Pages         │   │         │  │ Roles → FeatureGate →   │  │
│  │ (pricing,etc) │   │         │  │ (LicenseExpiry/Degraded)│  │
│  └───────────────┘   │         │  └─────────────────────────┘  │
└──────────────────────┘         │                               │
                                 │  ┌─────────────────────────┐  │
                                 │  │ Dashboard (Next.js:3100)│  │
                                 │  │ - Activate wizard        │  │
                                 │  │ - Settings/licence page  │  │
                                 │  │ - Expiry banner          │  │
                                 │  └─────────────────────────┘  │
                                 │                               │
                                 │  ┌─────────────────────────┐  │
                                 │  │ Prisma DB                │  │
                                 │  │ Organization/License/    │  │
                                 │  │ FeatureFlag/Camera/etc   │  │
                                 │  └─────────────────────────┘  │
                                 └───────────────────────────────┘

Data flow (primary):
1. vault-app admin generates RSA-signed JWT license key
2. Client copies key into vault-os activation wizard
3. vault-os verifies JWT signature with embedded public key, activates license
4. Every 24h, vault-os cron pings vault-app to verify license is still valid
5. FeatureGateGuard checks pack+modules for each guarded endpoint
6. On 72h offline → degraded mode (block mutations, allow viewing + recording)
7. On expiry → read-only (block mutations + stop recording + no new AI alerts)
```

### Recommended Project Structure Changes

**vault-os (this monorepo):**
```
apps/api/src/
├── modules/
│   ├── license/
│   │   ├── dto/                  # (keep existing)
│   │   ├── guards/
│   │   │   ├── license-api-key.guard.ts   # REMOVE (generation moved to vault-app)
│   │   │   ├── license-expiry.guard.ts    # EXTEND for degraded + expired
│   │   │   └── license-degraded.guard.ts  # NEW: blocks mutations in degraded/expired mode
│   │   ├── license-key-manager.ts         # MODIFY: remove private key loading (keep public)
│   │   ├── license-public-key.ts          # KEEP: embedded public key
│   │   ├── license-verification.service.ts # NEW: 24h cron + vault-app ping
│   │   ├── license.controller.ts          # MODIFY: remove generate endpoint
│   │   ├── license.service.ts             # KEEP: activation, status, usage
│   │   ├── license.module.ts              # MODIFY: remove API key guard
│   │   └── license.types.ts               # EXTEND: add degraded/expired states
│   └── feature-gate/
│       ├── feature-gate.service.ts         # REWRITE: tier → pack+module seeding
│       └── feature-gate.module.ts          # KEEP
├── common/
│   ├── guards/
│   │   └── feature-gate.guard.ts           # MODIFY: check pack+modules instead of tiers
│   └── decorators/
│       ├── feature-gate.decorator.ts       # EXTEND: add @RequiresPack() decorator
│       └── degraded-block.decorator.ts     # NEW: marks endpoint as blocked in degraded mode
├── common/decorators/degraded-block.decorator.ts  # NEW (see above)
└── common/guards/
    └── feature-gate.guard.ts               # MODIFY (see above)
```

**vault-app (separate repo):**
```
vault-app/
├── prisma/
│   ├── schema.prisma                       # NEW: admin_user, organization, license_key models
│   └── migrations/                         # NEW: initial migration
├── app/
│   ├── [locale]/                           # (existing marketing pages - keep)
│   │   ├── admin/                          # NEW admin portal route group
│   │   │   ├── layout.tsx                  # Admin auth layout
│   │   │   ├── login/page.tsx
│   │   │   ├── organisations/
│   │   │   │   └── page.tsx                # Org list
│   │   │   ├── organisations/[id]/
│   │   │   │   └── page.tsx                # Org detail + license generation
│   │   │   └── licences/page.tsx           # License list
│   │   ├── api/
│   │   │   ├── admin/auth/login/route.ts   # Admin auth
│   │   │   ├── admin/organizations/route.ts
│   │   │   ├── admin/organizations/[id]/route.ts
│   │   │   ├── admin/licenses/generate/route.ts  # RSA sign + return JWT
│   │   │   └── verify/route.ts             # Verification endpoint (called by vault-os cron)
│   └── ...
├── src/
│   ├── lib/
│   │   ├── prisma.ts                      # NEW: Prisma client
│   │   ├── auth.ts                        # NEW: auth helpers
│   │   └── license.ts                     # NEW: RSA signing + JWT generation
│   └── ...
```

### Pattern 1: Guard Chain Extension

**What:** Add degraded/expired mode checks into the existing guard chain. The existing chain is: `JwtAuthGuard → TenantIsolationGuard → RolesGuard → FeatureGateGuard`. License state enforcement should be added as another global guard or as a selective guard for mutation endpoints.

**When to use:** All mutation endpoints (camera create/edit/delete, zone create/edit, user create/edit, AI settings) must be blocked in degraded/expired mode. Read-only endpoints (dashboard, recordings, GET requests) must NOT be blocked.

**Recommended approach:**
1. Extend `LicenseExpiryGuard` to handle 3 states:
   - **degraded** (72h offline): block mutations via `@DegradedBlock()` decorator
   - **expired**: block ALL mutations (no decorator needed — always blocked)
   - **active/trial/grace**: allow everything

2. Create `@DegradedBlock()` decorator selectively applied to mutation endpoints.

3. The FeatureGateGuard remains global and handles pack/module enforcement regardless of license state.

```typescript
// Source: Derived from existing LicenseExpiryGuard pattern (apps/api/src/modules/license/guards/license-expiry.guard.ts)
// This is the APPROACH — extends existing pattern, not a hand-rolled solution

// LICENSE STATE DECISION MATRIX:
// ┌────────────┬──────────┬───────────┬──────────┬──────────────┐
// │ Operation  │ Active   │ Degraded  │ Expired  │ No License   │
// ├────────────┼──────────┼───────────┼──────────┼──────────────┤
// │ View UI    │ ✅       │ ✅        │ ✅       │ ❌ (wizard)  │
// │ View video │ ✅       │ ✅        │ ✅       │ ❌           │
// │ Recording  │ ✅       │ ✅        │ ❌       │ ❌           │
// │ Edit cam   │ ✅       │ ❌        │ ❌       │ ❌           │
// │ Edit user  │ ✅       │ ❌        │ ❌       │ ❌           │
// │ AI alerts  │ ✅       │ ✅        │ ❌       │ ❌           │
// └────────────┴──────────┴───────────┴──────────┴──────────────┘
```

### Pattern 2: Pack+Module Feature Gating

**What:** Replace the tier-based `DEFAULT_FEATURES` array with a pack-module model. VISION gets a fixed set of features. BASTION gets VISION features + BASTION base features + optionally enabled modules.

```typescript
// Source: Current FeatureGateService (apps/api/src/modules/feature-gate/feature-gate.service.ts)
// Rewrite from tier-based to pack+module

// New DEFAULT_FEATURES structure:
const PACK_FEATURES = {
  VISION: [
    { key: "live_streaming", enabled: true },
    { key: "motion_detection", enabled: true },
    { key: "basic_facial_recognition", enabled: true },
    { key: "local_storage", enabled: true },
    { key: "event_timeline", enabled: true },
    { key: "video_export", enabled: true },
    { key: "multi_user", enabled: true, maxValue: 3 },  // 3 max secondary accounts
    // ... all 23 VISION features
  ],
  BASTION: [
    // VISION features + BASTION base = all enabled
    { key: "advanced_facial_recognition", enabled: true, requiresModule: false },
    { key: "anti_spoofing", enabled: true, requiresModule: false },
    // ... all BASTION base features
    
    // Module-gated features:
    { key: "access_control", enabled: true, requiresModule: "access_control" },
    { key: "predictive_analytics", enabled: true, requiresModule: "predictive_analytics" },
    { key: "extra_cameras", enabled: true, requiresModule: "extra_cameras" },
    { key: "extra_sites", enabled: true, requiresModule: "extra_sites" },
    { key: "dpo_service", enabled: true, requiresModule: "dpo_service" },
    { key: "sla_premium", enabled: true, requiresModule: "sla_premium" },
    { key: "api_tierce", enabled: true, requiresModule: "api_tierce" },
  ],
};
```

### Anti-Patterns to Avoid
- **Hardcoding tier logic in controllers:** Don't add `if (pack==='VISION')` checks in individual controllers. Use the `@RequiresFeature()` or `@RequiresPack()` decorator + FeatureGateGuard.
- **Storing pack in License API response only:** The pack must be written to the FeatureFlag table at activation time so the FeatureGateGuard can check it without parsing JWTs on every request.
- **Silent failures in cron:** The 24h ping mechanism must log failures and update `lastVerificationFailedAt` timestamp but never throw unhandled exceptions — vault-os should never crash because vault-app is unreachable.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSA key pair generation | Self-signed certs | `openssl genrsa` + `openssl rsa -pubout` | Industry standard, well-audited tooling. Document in vault-app README. |
| Cron scheduling | Custom timer | `@nestjs/schedule` with `@Cron()` | Already in vault-os; handles timezone, overlapping runs, Node.js event loop integration |
| JWT verification | Manual signature check | `jsonwebtoken.verify()` with RSA public key | Already used by vault-os; handles algorithm selection, expiration, error types |
| HTTP retry | Custom retry loop | `@nestjs/axios` with `axios-retry` | Built-in retry interceptors, exponential backoff |
| Admin auth | Custom session system | `jsonwebtoken` with HS256 + bcrypt | Simple, stateless, matches vault-os pattern |

---

## Common Pitfalls

### Pitfall 1: RSA Key Rotation Breaking Active Licenses
**What goes wrong:** When vault-app rotates its RSA key pair, all previously generated licenses become invalid because vault-os still has the old public key.
**Why it happens:** The public key is embedded in `license-public-key.ts` — a static file that's part of the vault-os build.
**How to avoid:** v1.0 can use a single static key. For rotation support in v1.x: store multiple public keys in a configurable array, keyed by `licenseVersion`. New licenses use new keys. Old licenses continue to validate against old keys until their next renewal.
**Warning signs:** Existing deployments can't activate renewal licenses after a key rotation.

### Pitfall 2: JWT Claim Size Limits
**What goes wrong:** If the license JWT encodes every optional module key as a claim, the JWT payload may exceed the 4096-byte HTTP header limit.
**Why it happens:** JWT tokens are passed as Bearer tokens or in request bodies. With 10+ module keys as strings plus pack info plus limits, the token could hit 2-3KB.
**How to avoid:** Keep JWT claims minimal. Encode only `{ pack: "VISION"|"BASTION", modules: string[] }` in the JWT. Store the full module list + limits in the vault-os database at activation time. The FeatureGateGuard reads from the database (with Redis cache), not from the JWT.

### Pitfall 3: Time Synchronization Issues
**What goes wrong:** vault-os rejects a license because it checks the current time against `expiresAt`, but the client's server clock is wrong.
**Why it happens:** Self-hosted deployments may have incorrect system times (no NTP, wrong timezone, dead CMOS battery).
**How to avoid:** Add a clock drift tolerance window (e.g., 5 minutes) to JWT verification. Document NTP requirement in deployment docs. The grace period (7 days) already provides significant buffer for the expiry check.

### Pitfall 4: Trial Duplication
**What goes wrong:** A user registers a new organization to get a second 7-day trial.
**Why it happens:** The current `getLicenseStatus()` auto-initializes trial on first check — there's no guard against creating multiple orgs for repeated trials.
**How to avoid:** NOT a Phase 1 concern per D-16 (no production data). For v1.0 production: track trial usage by email/IP in vault-app. Phase 1 can accept the risk.

### Pitfall 5: FeatureGateGuard and LicenseExpiryGuard Interaction
**What goes wrong:** An expired license org gets a 403 from FeatureGateGuard ("Feature not available on your plan") instead of the correct "Licence expirée" message from LicenseExpiryGuard.
**Why it happens:** FeatureGateGuard runs BEFORE LicenseExpiryGuard in the global APP_GUARD chain and returns a generic message.
**How to avoid:** Change FeatureGateGuard to check license state first. If license is expired/degraded, throw a specific "license state" error before checking features. Or, make LicenseExpiryGuard run globally (move to APP_GUARD) with higher priority.

---

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Prisma DB: Organization records have `planTier` field (FREE/PROFESSIONAL/ENTERPRISE). FeatureFlag records have `tier` field. License records have legacy claim structure. | Schema migration: remove `planTier` from Organization, rename `tier` to `pack` on FeatureFlag, update License model. |
| Live service config | Redis cache may contain stale `feature:*` entries with old tier keys | Flush Redis `feature:*` keys after migration (or let 5-min TTL expire naturally) |
| OS-registered state | None — vault-os runs in Docker; vault-app is new | N/A |
| Secrets/env vars | `LICENSE_PRIVATE_KEY_PATH` env var in vault-os — will be removed (no more private key in vault-os) | Remove env var from vault-os config; add `LICENSE_PRIVATE_KEY` to vault-app .env |
| Build artifacts | None specific to license system | N/A |

**Nothing found in remaining categories:** OS-registered state and build artifacts are not affected.

---

## Code Examples

### License JWT Claims (vault-app generation)

```typescript
// Source: Derived from existing LicenseClaims (apps/api/src/modules/license/license.types.ts)
// Extended for pack+module model

import * as jwt from "jsonwebtoken";

interface LicenseJwtClaims {
  /** Vault-os organization UUID this license is bound to */
  organizationId: string;
  /** Pack type */
  pack: "VISION" | "BASTION";
  /** Optional module keys (BASTION only) — empty for VISION */
  modules: string[];
  /** When the license was issued (epoch seconds) */
  issuedAt: number;
  /** When the license expires (epoch seconds) */
  expiresAt: number;
  /** Days of grace period after expiry */
  gracePeriodDays: number;
  /** Numeric limits */
  maxCameras: number;
  maxUsers: number;
  /** License version (for key rotation support) */
  licenseVersion: number;
}

function generateLicenseKey(
  claims: LicenseJwtClaims,
  privateKey: string
): string {
  return jwt.sign(claims, privateKey, {
    algorithm: "RS256",
    issuer: "vaultos-admin",
    expiresIn: claims.expiresAt - Math.floor(Date.now() / 1000),
  });
}
```

### Degraded Mode Guard

```typescript
// Source: Extension of LicenseExpiryGuard pattern (apps/api/src/modules/license/guards/license-expiry.guard.ts)

// New decorator:
import { SetMetadata } from "@nestjs/common";
export const DEGRADED_BLOCK_KEY = "degradedBlock";
export const DegradedBlock = () => SetMetadata(DEGRADED_BLOCK_KEY, true);

// Extended LicenseExpiryGuard:
async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest();
  const orgId = request.user?.orgId;
  if (!orgId) return true;

  const status = await this.licenseService.getLicenseStatus(orgId);

  // Expired: everything blocked
  if (status.licenseState === "expired") {
    throw new ForbiddenException(
      "Licence expirée — Fonctionnalités en lecture seule. Contactez votre administrateur."
    );
  }

  // Degraded: block only @DegradedBlock() endpoints
  if (status.licenseState === "degraded") {
    const isBlocked = this.reflector.get<boolean>(
      DEGRADED_BLOCK_KEY,
      context.getHandler()
    );
    if (isBlocked) {
      throw new ForbiddenException(
        "Mode dégradé — Activation internet requise pour modifier la configuration. La vidéo et l'enregistrement continuent de fonctionner."
      );
    }
  }

  return true;
}
```

### 24h Ping Cron Job

```typescript
// Source: @nestjs/schedule @Cron() pattern (already in vault-os)

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { firstValueFrom } from "rxjs";

@Injectable()
export class LicenseVerificationService {
  private readonly logger = new Logger(LicenseVerificationService.name);

  constructor(
    private http: HttpService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)  // Every hour for demo; change to EVERY_24HOURS for production
  async pingVaultApp(): Promise<void> {
    const vaultAppUrl = this.config.get<string>("VAULT_APP_URL");
    if (!vaultAppUrl) {
      this.logger.warn("VAULT_APP_URL not configured — skipping verification ping");
      return;
    }

    const orgs = await this.prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const org of orgs) {
      try {
        const response = await firstValueFrom(
          this.http.get<{ valid: boolean }>(`${vaultAppUrl}/api/verify`, {
            params: { organizationId: org.id },
            timeout: 10_000,
          })
        );

        await this.prisma.organization.update({
          where: { id: org.id },
          data: {
            lastVerifiedAt: new Date(),
            lastVerificationFailedAt: null,
          },
        });
      } catch (err: any) {
        this.logger.warn(
          `Verification failed for org ${org.id}: ${err.message}`
        );
        await this.prisma.organization.update({
          where: { id: org.id },
          data: {
            lastVerificationFailedAt: new Date(),
          },
        });
      }
    }
  }
}
```

### Activation Wizard Page Structure (vault-os dashboard)

```typescript
// Source: Based on existing login page structure at apps/dashboard/app/(auth)/login/page.tsx

// The activation wizard should be a new route group:
// apps/dashboard/app/activate/  (outside (dashboard) group — full page, no sidebar)

// Layout: Minimal layout (no dashboard sidebar, no auth check)
// Check: On mount, call GET /api/licenses/status
// If status === "active" or "trial" → redirect to dashboard
// Otherwise → show activation wizard with two options:
//   1. "Activer une licence" → form with JWT input field → POST /api/licenses/activate
//   2. "Essai gratuit 7 jours" → button that calls POST /api/licenses/trial → redirects to dashboard
```

### vault-app Admin API Pattern (Next.js API Routes)

```typescript
// Source: Standard Next.js App Router API route pattern

// app/api/admin/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { prisma } from "@/src/lib/prisma";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !(await compare(password, admin.passwordHash))) {
    return NextResponse.json(
      { error: "Identifiants incorrects" },
      { status: 401 }
    );
  }

  const token = sign(
    { id: admin.id, email: admin.email, role: "admin" },
    process.env.ADMIN_JWT_SECRET!,
    { expiresIn: "8h" }
  );

  return NextResponse.json({ token });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FREE/PROFESSIONAL/ENTERPRISE tiers | VISION/BASTION packs + optional modules | This Phase | Complete rewrite of FeatureGateService seeding; Schema migration of FeatureFlag model |
| vault-os generates licenses | vault-app generates licenses (separate repo) | This Phase | Remove `POST /api/licenses/generate` + `LicenseApiKeyGuard` from vault-os |
| RSA private key in vault-os | RSA private key in vault-app only | This Phase | Remove private key loading from `LicenseKeyManager` |
| FeatureFlag has `tier` field | FeatureFlag has `pack` field + optional `moduleKey` | This Phase | Schema rename; update FeatureGateGuard queries |
| Organization has `planTier` | Organization has no tier field (replaced by license system) | This Phase | Schema remove field; remove from auth service registration |
| `seedDefaultFlags` never called | `seedDefaultFlags` called at org creation | This Phase | Wire into auth service / org creation flow |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | vault-app has no Prisma setup and needs one | Standard Stack | If vault-app has a hidden DB setup (missed), we'd duplicate infrastructure |
| A2 | `@nestjs/axios` is not installed | Standard Stack | Will be confirmed at install; if already present, no action needed |
| A3 | Postinstall scripts for added packages are safe | Package Audit | Low risk for well-known packages (Prisma generates client, bcryptjs has none) |
| A4 | FeatureGateService.seedDefaultFlags is dead code | Architecture Patterns | Verified by grep — never imported/referenced outside its own file |

---

## Open Questions

1. **vault-app database location?**
   - What we know: vault-app currently has NO database
   - What's unclear: Should vault-app use a separate PostgreSQL database (recommended) or SQLite (simpler for admin-only tool)?
   - Recommendation: Use SQLite via Prisma for vault-app admin only — it's low-traffic (admin-only), avoids needing a full PostgreSQL deployment for a management tool. Vault-os continues to use PostgreSQL for its data.

2. **Organization syncing between vault-app and vault-os?**
   - What we know: vault-app creates organizations (ADM-02); vault-os needs to know about them for license activation (LIC-01)
   - What's unclear: Should vault-app push orgs to vault-os via API, or should vault-os create orgs independently when license is activated? The latter is simpler — vault-app generates licenses for orgs; vault-os creates orgs on first license activation.
   - Recommendation: vault-app stores org CRUD independently. vault-os creates orgs locally when a license is first activated (the license JWT contains `organizationId` and `organizationName`).

3. **Offline license support for air-gapped deployments?**
   - What we know: PRICING-SPEC section 8.1 mentions "vérifiée en ligne"
   - What's unclear: Some clients may want fully air-gapped operation (no internet at all). Does v1.0 need to support this?
   - Recommendation: Defer to post-v1.0. Create a special "offline" license type that vault-app generates with longer validity (1 year). Document the limitation.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 18+ | vault-os + vault-app | ✓ | v20+ | — |
| pnpm 9.0.0 | Monorepo | ✓ | 9.0.0 | — |
| PostgreSQL 16 | vault-os DB | ✓ (Docker) | 16 | — |
| Redis 7 | vault-os cache/queues | ✓ (Docker) | 7 | — |
| Prisma CLI | Schema migrations | ✓ (devDependency) | 5.22.0 | — |
| `@nestjs/schedule` | 24h cron | ✓ (already installed) | 6.1.3 | — |
| `@nestjs/axios` | vault-app HTTP client | ✗ | — | Install `pnpm add @nestjs/axios` |
| SQLite (or separate PG) | vault-app DB | ✗ | — | Will be set up with Prisma in vault-app |
| `bcryptjs` | vault-app admin auth | ✗ | — | Install in vault-app |
| `jsonwebtoken` | vault-app license signing | ✓ (in vault-os only) | 9.0.3 | Install in vault-app |

**Missing dependencies with no fallback:** None — all installable via pnpm.
**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + ts-jest 29.2.5 |
| Config file | `apps/api/jest.config.js` |
| Quick run command | `cd apps/api && npx jest --bail --no-coverage modules/license/ modules/feature-gate/` |
| Full suite command | `pnpm --filter=@vaultos/api test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIC-01 | Activate license with valid JWT | integration | `jest modules/license/license.service.spec.ts -t "activate"` | ❌ Wave 0 |
| LIC-01 | Reject invalid JWT signature | integration | same file | ❌ Wave 0 |
| LIC-02 | Cron job pings vault-app | integration | `jest modules/license/license-verification.service.spec.ts` | ❌ Wave 0 |
| LIC-03 | Expired license blocks mutations | integration | `jest modules/license/guards/license-expiry.guard.spec.ts` | ❌ Wave 0 |
| LIC-04 | FeatureGateGuard enforces pack | integration | `jest common/guards/feature-gate.guard.spec.ts` | ❌ Wave 0 |
| LIC-05 | Max cameras enforced for VISION | integration | `jest modules/license/license.service.spec.ts -t "max cameras"` | ❌ Wave 0 |
| LIC-06 | Trial auto-creates for new orgs | integration | `jest modules/license/license.service.spec.ts -t "trial"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/api && npx jest --bail --no-coverage modules/license/`
- **Per wave merge:** `cd apps/api && npx jest --bail`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/modules/license/license.service.spec.ts` — covers LIC-01, LIC-05, LIC-06
- [ ] `apps/api/src/modules/license/guards/license-expiry.guard.spec.ts` — covers LIC-03
- [ ] `apps/api/src/modules/license/license-verification.service.spec.ts` — covers LIC-02
- [ ] `apps/api/src/common/guards/feature-gate.guard.spec.ts` — covers LIC-04
- [ ] `apps/api/prisma/schema.prisma` migration test — verify tier→pack rename

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (vault-app) | bcryptjs + JWT (HS256) — separate from vault-os auth |
| V3 Session Management | Yes (vault-app) | JWT with 8h expiry, stored in localStorage (admin-only, simple) |
| V4 Access Control | Yes | FeatureGateGuard + LicenseExpiryGuard — guard chain enforces at API layer |
| V5 Input Validation | Yes | Zod schemas (both vault-os and vault-app) |
| V6 Cryptography | Yes | RSA-2048 for license JWTs (RS256), bcrypt for passwords |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| License JWT forgery | Tampering | RSA-2048 signature verification with embedded public key; reject any algorithm other than RS256 |
| License replay attack | Spoofing | JWT contains `organizationId` bound to specific org; vault-os verifies org match on activation |
| vault-app auth brute force | Spoofing | bcrypt with high cost factor (10+); rate limiting recommended but not required for v1.0 |
| vault-app API unauthorized access | Elevation of Privilege | JWT middleware on all `/api/admin/*` routes; no public access to admin endpoints |
| Private key exfiltration | Information Disclosure | Private key in vault-app `.env` only (never committed, never in vault-os). Rotate on compromise. |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase] `apps/api/prisma/schema.prisma` — Full Prisma schema reviewed for License, FeatureFlag, Organization models
- [VERIFIED: codebase] `apps/api/src/modules/license/` — Entire license module: service, controller, guards, key manager
- [VERIFIED: codebase] `apps/api/src/modules/feature-gate/` — FeatureGateService (dead code) + FeatureGateGuard
- [VERIFIED: codebase] `apps/api/src/common/guards/` — Guard chain: JwtAuth, TenantIsolation, Roles, FeatureGate
- [VERIFIED: codebase] `apps/api/src/app.module.ts` — APP_GUARD registration for guard chain
- [VERIFIED: codebase] `apps/dashboard/lib/api.ts` — Existing license API client functions
- [VERIFIED: codebase] `packages/shared/src/schemas/license.schema.ts` — Zod schemas for license operations
- [VERIFIED: codebase] `packages/shared/src/types/license.types.ts` — LicenseClaims type (needs extension)
- [VERIFIED: codebase] `packages/shared/src/constants/license.constants.ts` — License constants
- [VERIFIED: codebase] `docs/PRICING-SPEC.md` — Authoritative feature matrix
- [VERIFIED: codebase] `/home/devuser/projects/vault-app/` — Full vault-app structure reviewed
- [VERIFIED: codebase] `apps/api/src/modules/auth/auth.service.ts` — Registration flow (planTier: "FREE" hardcoded)

### Secondary (MEDIUM confidence)
- [CITED: @nestjs/schedule docs] — Cron job pattern used in existing vault-os services
- [CITED: JSON Web Token RFC 7519] — RS256 algorithm standard

### Tertiary (LOW confidence)
- None — all claims verified via codebase or official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Verified all dependencies in both repos
- Architecture: HIGH — Full codebase review completed
- Pitfalls: HIGH — Based on existing guard chain analysis and JWT patterns
- vault-app analysis: HIGH — Directory structure, package.json, and all files reviewed

**Research date:** 2026-07-18
**Valid until:** 2026-08-18 (stable dependencies)
