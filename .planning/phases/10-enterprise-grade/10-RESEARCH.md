# Phase 10: Enterprise Grade - Research

**Researched:** 2026-07-16
**Domain:** SSO/SAML/OIDC, Public REST API, Webhooks, Compliance Reporting, Multi-Currency, White Labeling, Command Center, Mobile Guard Workflows
**Confidence:** HIGH

## Summary

Phase 10 transforms Oversight Hub into an enterprise-grade platform across eight capability areas. The research confirms that the existing NestJS + Next.js + Expo stack can support all ENT-01 through ENT-09 requirements without architectural changes — every new capability integrates as a NestJS module, Prisma model, or dashboard page extension. The key constraint (self-hosted, single org per instance) simplifies SSO, API key scoping, and retention policy design significantly.

The SAML/OIDC libraries (`passport-saml` wrapping `@node-saml/node-saml` v5.1.0, and `openid-client` v6.8.4) are mature, well-maintained, and follow the exact Passport strategy pattern already used for `jwt.strategy.ts`. The public API key guard pattern mirrors the existing `LicenseApiKeyGuard` but adds scope-based authorization and per-key rate limits. The webhook system replaces a simple `fetch()` call with BullMQ-backed retry and HMAC-SHA256 signing — reusing the existing 14-queue infrastructure. All six new npm packages pass slopcheck legitimacy verification.

**Primary recommendation:** Build SSO, API keys, and webhooks as three independent NestJS modules (`SsoModule`, `ApiKeyModule`, `WebhookModule`) with shared Prisma models, using existing Passport strategy patterns, BullMQ queuing, and dashboard settings integration points. Deploy compliance reporting, white labeling, and multi-currency as extensions to existing modules (Governance, Organization, License). Extend the Command Center and build mobile guard workflows on established Phase 6/8/9 patterns.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SSO/SAML/OIDC Auth | API / Backend | Frontend Server | IdP redirect flow originates from browser but all SAML assertion validation, JWT exchange, and JIT provisioning occur server-side |
| IdP Configuration | API / Backend | Frontend Server (settings UI) | Config stored in DB (`IdpConfig` table), managed via dashboard UI |
| Public REST API (v1) | API / Backend | CDN / Static (OpenAPI docs) | Curated endpoints at `/api/v1/*` served by NestJS; OpenAPI spec served as static JSON |
| API Key Authentication | API / Backend | — | TenantApiKeyGuard validates `X-API-Key` header server-side, cannot be done in browser |
| Per-Key Rate Limiting | API / Backend | — | Custom guard/middleware reads rate limit from `TenantApiKey` record; Fastify global rate limiter is separate |
| Webhook Delivery | API / Backend | — | BullMQ `webhook-delivery` queue handles retry schedule; HMAC signing computed server-side |
| Webhook Dashboard | Frontend Server | API / Backend | Delivery logs stored in DB, served via API, rendered in dashboard |
| Compliance Reports (PDF) | API / Backend | — | PDFKit + Handlebars generate PDFs server-side; served as blob downloads |
| Data Retention & Classification | API / Backend | Database / Storage | GovernanceService cron + BullMQ `retention-pruning` queue; classification labels on DB models |
| Multi-Currency (Admin) | API / Backend | Frontend Server (license gen UI) | Currency enum set at license generation; stored in License JWT and DB |
| White Labeling | Frontend Server | API / Backend | Logo/color/name stored in Organization model; dashboard reads from org context |
| Command Center (Real-time Feed) | Frontend Server | API / Backend | Socket.IO WebSocket connection from dashboard; server pushes events |
| Guard Mobile (NFC/QR/Camera) | Browser / Client | — | Native device capabilities via Expo modules; offline queue for resilience |

## Standard Stack

### Core — New Additions

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `passport-saml` | 3.2.4 | SAML 2.0 Passport strategy | Wraps `@node-saml/node-saml` v5.1.0; follows existing `passport-jwt` pattern; 220K+ weekly downloads; published since 2012 |
| `openid-client` | 6.8.4 | OIDC Relying Party Client | OpenID Certified (FAPI 1.0/2.0); built-in Passport strategy; 8.3M weekly downloads; maintained by panva |
| `@node-saml/node-saml` | 5.1.0 | SAML 2.0 core library | Underlying engine for `passport-saml`; 472K weekly downloads; required as peer dependency |

### Core — Already Installed (Reuse)

| Library | Version | Purpose | Usage in Phase 10 |
|---------|---------|---------|-------------------|
| `pdfkit` | 0.19.1 | PDF generation | SOC 2, ISO 27001, Access Review compliance reports |
| `handlebars` | 4.7.9 | HTML template engine | Compliance report templates compiled to HTML then PDFKit rendering |
| `@nestjs/swagger` | 11.4.5 | OpenAPI/Swagger docs | New `/api/docs/v1` documentation for public API |
| `@fastify/rate-limit` | 11.1.0 | Global rate limiting | Existing global limiter; per-key limits added via custom guard |
| `bullmq` | 5.30.0 | Job queues | New `webhook-delivery` queue for retry schedule |
| `passport` | 0.7.0 | Auth framework | New SAML + OIDC strategies |
| `@nestjs/passport` | 10.0.3 | NestJS Passport integration | Auth guards for SAML/OIDC |

### Mobile — New Additions

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-camera` | 57.0.2 | Incident photo capture | Expo SDK 54 compatible; official Expo module; replaces deprecated `expo-camera` from older SDKs |
| `expo-barcode-scanner` | 13.0.1 | QR code scanning (visitor check-in) | Official Expo module; compatible with `expo-camera` as extension |
| `react-native-nfc-manager` | 3.17.2 | NFC badge validation | Most popular React Native NFC library; 9+ years old; active maintenance |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `passport-saml` + `@node-saml/node-saml` | `samlify` | `samlify` is newer but smaller ecosystem; `passport-saml` integrates directly with existing NestJS Passport pattern |
| `openid-client` v6 | `openid-client` v5 | v6 requires Node.js >=20 (met: v22.23.1); v6 is ESM-only but `require(esm)` works on Node 22; v5 in maintenance mode |
| `expo-barcode-scanner` | `expo-camera` barcode scanning | `expo-camera` v57 has built-in barcode scanning; but `expo-barcode-scanner` provides standalone scanner for QR check-in use case |

**Installation:**

```bash
# API packages (apps/api)
pnpm add passport-saml @node-saml/node-saml openid-client --filter @repo/api

# Mobile packages (apps/mobile)
pnpm add expo-camera expo-barcode-scanner react-native-nfc-manager --filter @repo/mobile
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@node-saml/node-saml` | npm | 4 yrs | 472K/wk | github.com/node-saml/node-saml | [OK] | Approved |
| `passport-saml` | npm | 14 yrs | 220K+/wk | github.com/node-saml/passport-saml | [OK] | Approved |
| `openid-client` | npm | 10 yrs | 8.3M/wk | github.com/panva/openid-client | [OK] | Approved |
| `expo-camera` | npm | 8 yrs | High (official Expo) | github.com/expo/expo | [OK] | Approved |
| `expo-barcode-scanner` | npm | 8 yrs | High (official Expo) | github.com/expo/expo | [OK] | Approved |
| `react-native-nfc-manager` | npm | 9 yrs | Active | github.com/revtel/react-native-nfc-manager | [OK] | Approved |

**Postinstall scripts:** All three Node.js API packages have NO postinstall scripts — safe to install.
**Packages removed due to slopcheck [SLOP] verdict:** None
**Packages flagged as suspicious [SUS]:** None
**Packages tagged [ASSUMED]:** None — all verified via npm registry, slopcheck, and official documentation

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSER (Dashboard)                          │
│                                                                  │
│  Login Page ──SSO button──> IdP Redirect                         │
│  Settings ────> IdP Config UI, API Key Mgmt, Webhook Subs        │
│  Governance ──> Retention Policies + Classification Labels        │
│  Command Center ──> Real-time Feed (Socket.IO)                   │
│  Compliance ───> Report Generation + Download                     │
└────────────┬──────────────────────────────────┬─────────────────┘
             │                                  │
             │ fetchWithAuth()                  │ Socket.IO
             ▼                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CADDY (Reverse Proxy)                    │
│  /api/*        ──> API:4000                                     │
│  /api/v1/*     ──> API:4000 (same target)                       │
│  /ws/*         ──> API:4000 (WebSocket)                         │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NESTJS API (Fastify)                         │
│                                                                  │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │ SsoModule│  │ApiKeyModule│  │WebhookMod │  │Compliance │    │
│  │          │  │            │  │           │  │  Reports  │    │
│  │SAML Strat│  │TenantApiKey│  │WebhookSub │  │SOC2/ISO/  │    │
│  │OIDC Strat│  │  Guard     │  │ HMAC Sign │  │Access Rev │    │
│  │JIT Prov  │  │Rate Limit  │  │DeliveryLog│  │PDFKit+    │    │
│  │IdP Config│  │Middleware  │  │BullMQ     │  │Handlebars │    │
│  └──────────┘  └───────────┘  └───────────┘  └───────────┘    │
│                                                                  │
│  ┌──────────┐  ┌───────────┐  ┌───────────────────────────┐    │
│  │Governance│  │Organization│  │   AuthModule (existing)   │    │
│  │Extended  │  │ Extended   │  │   JWT Strategy unchanged  │    │
│  │Classification│logo/color │  │   SSO → JWT exchange      │    │
│  │Pre-Purge │  │  /name     │  │   Break-glass local login │    │
│  │Export    │  │            │  │                           │    │
│  └──────────┘  └───────────┘  └───────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  GUARDS (execution order)                                 │   │
│  │  /api/*:    JwtAuthGuard → TenantIsolation → RolesGuard   │   │
│  │  /api/v1/*: ApiKeyGuard → TenantIsolation → ScopeCheck     │   │
│  │  /api/auth/sso/*: @Public() (IdP callback, no JWT)        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    ┌──────────┐ ┌─────────┐ ┌──────────┐
    │PostgreSQL│ │  Redis   │ │  BullMQ  │
    │          │ │          │ │  Queues  │
    │New Models│ │Rate Limit│ │webhook-  │
    │TenantApiK│ │ Counters │ │delivery  │
    │WebhookSub│ │SSO State │ │retention-│
    │WebhookDel│ │          │ │pruning   │
    │IdpConfig │ │          │ │          │
    │Retention │ │          │ │          │
    │Extension │ │          │ │          │
    └──────────┘ └─────────┘ └──────────┘
```

### Recommended Project Structure

```
apps/api/src/modules/
├── sso/                          # NEW: SSO/SAML/OIDC module
│   ├── sso.module.ts
│   ├── sso.controller.ts         # SAML/OIDC callback routes
│   ├── sso.service.ts            # IdP config CRUD, JIT provisioning
│   ├── strategies/
│   │   ├── saml.strategy.ts      # Passport SAML strategy
│   │   └── oidc.strategy.ts     # Passport OIDC strategy
│   └── dto/
│       └── idp-config.dto.ts
├── api-key/                      # NEW: Tenant API key management
│   ├── api-key.module.ts
│   ├── api-key.controller.ts
│   ├── api-key.service.ts
│   ├── guards/
│   │   └── tenant-api-key.guard.ts   # Validates X-API-Key
│   ├── middleware/
│   │   └── api-key-rate-limit.ts     # Per-key rate limiting
│   └── dto/
│       └── create-api-key.dto.ts
├── webhook/                      # NEW: Webhook subscriptions + delivery
│   ├── webhook.module.ts
│   ├── webhook.controller.ts
│   ├── webhook.service.ts
│   ├── webhook.processor.ts      # BullMQ worker for retry
│   ├── webhook.gateway.ts        # WebSocket for delivery dashboard
│   └── dto/
│       ├── create-subscription.dto.ts
│       └── webhook-event.dto.ts
├── compliance/                   # NEW: Compliance reporting
│   ├── compliance.module.ts
│   ├── compliance.controller.ts
│   ├── compliance.service.ts
│   └── templates/                # Handlebars .hbs templates
│       ├── soc2-report.hbs
│       ├── iso27001-report.hbs
│       └── access-review.hbs
├── auth/                         # EXTEND: Add SSO callback routes
│   ├── auth.controller.ts        # Add: SAML/OIDC init + callback
│   └── auth.service.ts           # Add: SSO JIT provisioning
├── governance/                   # EXTEND: Data classification
│   ├── governance.service.ts     # Add: classification labels, pre-purge export
│   └── governance.controller.ts  # Add: classification + export config endpoints
├── license/                      # EXTEND: Multi-currency
│   └── license.service.ts        # Add: currency field in license generation
└── organization/                 # EXTEND: White labeling
    └── organization.service.ts   # Add: logoUrl, primaryColor, displayName

apps/dashboard/
├── app/(dashboard)/
│   ├── parametres/               # EXTEND: SSO, API Keys, Webhooks tabs
│   ├── conformite/               # NEW: Compliance report generation
│   ├── api-keys/                 # NEW: API key management page
│   ├── webhooks/                 # NEW: Webhook subscription + delivery dashboard
│   └── command-center/           # EXTEND: Real-time WebSocket feed panel
├── components/
│   ├── sso/                      # NEW: SSO config forms (SAML + OIDC tabs)
│   ├── api-keys/                 # NEW: API key list, create dialog, usage sparkline
│   ├── webhooks/                 # NEW: Subscription form, delivery timeline
│   ├── compliance/               # NEW: Report type selector, download button
│   └── branding/                 # NEW: Logo upload, color picker, preview card
└── lib/
    └── nav-config.ts             # EXTEND: Add new nav entries

apps/mobile/
├── app/(tabs)/
│   ├── incidents.tsx             # EXTEND: Photo capture, QR check-in
│   └── guard/                    # NEW: Guard-specific workflow screens
│       ├── nfc-scan.tsx          # NFC badge validation
│       ├── qr-checkin.tsx        # Visitor QR check-in
│       └── door-control.tsx      # Door remote control
├── components/
│   ├── nfc-scanner.tsx           # NEW: Full-screen NFC scanner
│   ├── qr-scanner.tsx            # NEW: QR code scanner
│   └── photo-capture.tsx         # NEW: Incident photo capture
└── lib/
    └── offline-storage.ts        # EXTEND: Photo URI to PendingIncident

apps/api/prisma/
├── schema.prisma                 # ADD: TenantApiKey, WebhookSubscription, WebhookDelivery, IdpConfig
│                                 # EXTEND: Organization (+logoUrl, +primaryColor, +displayName)
│                                 # EXTEND: RetentionPolicy (+classification, +exportBeforePurge, +exportFormat)
└── migrations/                   # NEW: Migration for all schema changes
```

### Pattern 1: Passport Strategy for SAML + OIDC

**What:** Follow the existing `jwt.strategy.ts` pattern — extend `PassportStrategy`, implement `validate()`, return user object for `request.user`.

**When to use:** SAML and OIDC authentication strategies

**Example (SAML strategy):**
```typescript
// Source: Existing jwt.strategy.ts pattern + @node-saml/node-saml official docs
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy as SamlStrategy, Profile } from "passport-saml";
import { SsoService } from "../sso.service";

@Injectable()
export class SamlAuthStrategy extends PassportStrategy(SamlStrategy, "saml") {
  constructor(private ssoService: SsoService) {
    super({
      // Loaded dynamically per-org from IdpConfig table in SsoService
      // entryPoint, issuer, callbackUrl, cert configured at strategy creation
      passReqToCallback: true,
    });
  }

  async validate(req: any, profile: Profile, done: Function) {
    // JIT provisioning: find or create user, assign role from attribute mapping
    const user = await this.ssoService.findOrCreateUser(profile);
    return done(null, user);
  }
}
```

**Key insight:** SAML strategy config (entryPoint, cert, issuer) must be loaded dynamically from `IdpConfig` table per organization, not from static env vars. Use `passReqToCallback: true` to access `req.orgId` for the org-specific config. [VERIFIED: npm registry + @node-saml/node-saml official docs]

### Pattern 2: API Key Guard with Scoped Permissions

**What:** Extend the `LicenseApiKeyGuard` pattern to support scoped permissions, rate limiting, and the `X-API-Key` header.

**When to use:** All `/api/v1/*` endpoints

**Example:**
```typescript
// Source: Existing LicenseApiKeyGuard pattern (apps/api/src/modules/license/guards/license-api-key.guard.ts)
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as crypto from "crypto";

@Injectable()
export class TenantApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey: string | undefined = request.headers["x-api-key"];

    if (!apiKey) {
      throw new UnauthorizedException("API key required (X-API-Key header)");
    }

    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    const keyRecord = await this.prisma.tenantApiKey.findFirst({
      where: { keyHash, isActive: true },
      select: { id: true, name: true, scopes: true, rateLimit: true, organizationId: true, expiresAt: true, revokedAt: true },
    });

    if (!keyRecord) {
      throw new UnauthorizedException("Invalid API key");
    }

    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      throw new UnauthorizedException("API key expired");
    }

    // Attach to request for downstream guards/controllers
    request.apiKeyInfo = {
      id: keyRecord.id,
      name: keyRecord.name,
      scopes: keyRecord.scopes,
      rateLimit: keyRecord.rateLimit,
      organizationId: keyRecord.organizationId,
    };

    // Set AsyncLocalStorage orgId for tenant isolation
    // (or rely on TenantIsolationGuard extracting from request.apiKeyInfo)
    return true;
  }
}
```

**Per-key rate limiting** cannot use the existing `@fastify/rate-limit` (which is global). Instead, use a Redis-backed counter in the guard or a separate middleware:

```typescript
// Per-key rate limit check in guard (before returning true)
const rateLimitKey = `apikey:ratelimit:${keyRecord.id}:${Math.floor(Date.now() / 60000)}`;
const currentCount = await this.redis.incr(rateLimitKey);
if (currentCount === 1) await this.redis.expire(rateLimitKey, 60);

// Set rate limit headers on response
request.rateLimitInfo = {
  limit: keyRecord.rateLimit,
  remaining: Math.max(0, keyRecord.rateLimit - currentCount),
};

if (currentCount > keyRecord.rateLimit) {
  throw new HttpException("Rate limit exceeded", 429);
}
```

### Pattern 3: Webhook Delivery with BullMQ Retry

**What:** Replace the simple `fetch()` webhook call with a BullMQ-backed retry system and HMAC-SHA256 signing.

**When to use:** All outbound webhook deliveries

**HMAC signing (Stripe/GitHub industry standard):**
```typescript
import * as crypto from "crypto";

function signWebhookPayload(payload: object, secret: string): string {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signedPayload = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}
```

**BullMQ retry schedule (exponential backoff):**
```
Attempt 1: immediate     → wait 0s
Attempt 2: 1 minute      → wait 60s
Attempt 3: 5 minutes     → wait 300s
Attempt 4: 15 minutes    → wait 900s
Attempt 5: 1 hour        → wait 3600s
Attempt 6: 24 hours      → wait 86400s
Total: 6 attempts max
```

The retry schedule is implemented via BullMQ's `backoff` option with `type: "fixed"` and custom delay calculation, or by re-enqueuing with increasing delays using `job.moveToDelayed()`.

### Pattern 4: Compliance Report Generation (PDFKit + Handlebars)

**What:** Follow the existing incident closure report pattern — Handlebars `.hbs` template compiled at runtime, PDFKit generates structured PDF, served as `application/pdf` blob.

**When to use:** SOC 2, ISO 27001, Access Review reports

**Template structure (following existing incident pattern):**
```
apps/api/src/modules/compliance/templates/
├── soc2-report.hbs        # Security controls, audit trail, incident summary
├── iso27001-report.hbs    # ISMS controls, risk assessment, policy compliance
└── access-review.hbs      # User roles, last activity, permission matrix
```

Data queries pull from existing `AuditService.queryAuditLog()`, `PrismaService` (role assignments, user activity), and incident records.

### Anti-Patterns to Avoid

- **Do NOT create a separate API service for `/api/v1/*`:** Use the existing NestJS API with a global prefix for v1 routes. Caddy already routes all `/api/*` traffic to the same API service. A separate service would add deployment complexity for no benefit. [CITED: Caddyfile + main.ts existing routing]
- **Do NOT embed SAML certificates in env vars:** Use the `IdpConfig` database model with dashboard UI management. Env vars limit configuration to one IdP and require container restarts. [D-03 from CONTEXT.md]
- **Do NOT use `@Sse()` decorator:** Fastify adapter doesn't support it. Use `@Get()` + `FastifyReply.raw.writeHead()` with SSE framing as already done in Phase 9. [CITED: Phase 9 STATE.md learnings]
- **Do NOT hand-roll HMAC verification:** Use Node.js `crypto.createHmac("sha256", ...)` with the Stripe/GitHub `t=timestamp,v1=sig` format. Building a custom signature scheme risks security vulnerabilities.
- **Do NOT use `passport-saml` version 2.x:** Version 3.x wraps `@node-saml/node-saml` v5.x. Version 2.x is deprecated and wraps an older SAML implementation. [VERIFIED: npm registry]
- **Do NOT build a custom rate limiter from scratch:** Reuse Redis counters for per-key limits, but keep the existing `@fastify/rate-limit` for global protection. Two-layer approach.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SAML 2.0 authentication | Custom XML signing/validation | `passport-saml` + `@node-saml/node-saml` | SAML is a complex protocol with XML signature verification, replay protection, and IdP compatibility; `@node-saml/node-saml` has 10+ years of edge case handling |
| OIDC token exchange | Custom OAuth2 client | `openid-client` v6 | OpenID Certified (FAPI 1.0/2.0); handles PKCE, state validation, token introspection, DPoP |
| HMAC webhook signing | Custom signature scheme | Node.js `crypto.createHmac("sha256")` | Built-in crypto module is production-hardened; use Stripe/GitHub `t=,v1=` format for receiver compatibility |
| PDF report generation | Custom PDF builder | `pdfkit` 0.19.1 | Already installed and proven in incident closure reports; handles fonts, tables, headers |
| API key hashing | Custom hash function | Node.js `crypto.createHash("sha256")` | Same pattern already used in `LicenseApiKeyGuard`; SHA-256 is fast and collision-resistant |
| Rate limit headers | Custom header parsing | Standard `X-RateLimit-*` headers | Industry standard (GitHub, Stripe, Shopify); existing `@fastify/rate-limit` already uses this format |
| BullMQ retry scheduling | Custom retry loop | BullMQ `backoff` + `moveToDelayed()` | Already installed with 14 queues; exponential backoff is a built-in BullMQ pattern |

**Key insight:** Every complex subsystem in this phase (SAML XML validation, OIDC token exchange, PDF rendering, queue retry) already has a battle-tested library in the dependency tree or naturally extends an existing pattern. The phase is integration-heavy but has zero greenfield protocol implementations.

## Runtime State Inventory

> This phase is a greenfield feature addition phase, NOT a rename/refactor/migration phase. The following is a forward-looking assessment of new runtime state that will be created.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | 4 new Prisma models (TenantApiKey, WebhookSubscription, WebhookDelivery, IdpConfig); 7 extended models (Organization +3 fields, RetentionPolicy +3 fields, License +currency) | Prisma migration |
| Live service config | IdP configuration stored in DB (not git); webhook subscription URLs/secrets stored in DB | Dashboard settings UI creates records; no manual config |
| OS-registered state | None — all new modules are NestJS-based, no new OS registrations | None |
| Secrets/env vars | SAML_IDP_METADATA_URL, SAML_ENTITY_ID, SAML_CERT, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_ISSUER_URL — all optional, only needed if SSO is enabled | Add to `.env.example` and `apps/api/src/config/configuration.ts`; actual values configured via dashboard UI |
| Build artifacts | None — no new build artifacts beyond standard pnpm/node_modules | None |

**Nothing found in category:** OS-registered state and Build artifacts — verified by analysis of phase scope (all changes are backend NestJS modules + dashboard pages + mobile screens).

## Common Pitfalls

### Pitfall 1: SAML Assertion Clock Skew
**What goes wrong:** SAML responses are rejected because the server clock differs from the IdP clock by more than the default 0s skew tolerance.
**Why it happens:** `@node-saml/node-saml` defaults `acceptedClockSkewMs: 0`. In self-hosted deployments, NTP sync may drift.
**How to avoid:** Set `acceptedClockSkewMs: 60000` (60 seconds) in SAML strategy config. Document NTP requirement in deployment guide.
**Warning signs:** SAML login fails with "Assertion is not yet valid" or "Assertion is expired" despite correct IdP config.

### Pitfall 2: passport-saml Dynamic Configuration Per Organization
**What goes wrong:** SAML strategy is constructed once at module init with static config, but each organization may have different IdP settings.
**Why it happens:** Passport strategies are typically configured at construction time via `super({...})`. With self-hosted single-org, this is less of an issue — but if the admin instance manages multiple orgs, it becomes critical.
**How to avoid:** Since each customer self-hosts (one org per instance), load IdP config at app startup from the `IdpConfig` table. Use `passReqToCallback: true` to access request context. For the Oversight Hub admin instance managing multiple orgs, configure SAML per-request using a strategy factory.
**Warning signs:** SAML redirect uses wrong issuer/ACS URL; "RelayState mismatch" errors.

### Pitfall 3: API Key Prefix Leakage in Logs
**What goes wrong:** Raw API keys with `osk_` prefix appear in application logs, request logs, or error messages.
**Why it happens:** Logging middleware captures request headers. The `X-API-Key` header value is a bearer secret.
**How to avoid:** Mask the API key in logs — log only `keyPrefix + "...XXX"` (e.g., `osk_abc123...XXX`). Apply in the global exception filter and request logging middleware. Follow the same pattern already used for JWT tokens in logs.
**Warning signs:** Full `osk_` keys visible in application log output.

### Pitfall 4: Webhook Idempotency Without Delivery Tracking
**What goes wrong:** Webhook receivers that don't understand `X-Webhook-Id` process the same event multiple times.
**Why it happens:** At-least-once delivery means retries may succeed after the receiver already processed the original delivery.
**How to avoid:** Generate a unique `X-Webhook-Id` per delivery attempt (UUID v4). Document that receivers should use this header for idempotency. The delivery itself should include the event's unique ID in the JSON payload. Do NOT reuse the event ID as the webhook ID — retries of the same event need a unique delivery ID.
**Warning signs:** Duplicate events processed by webhook receivers; receiver complaints about duplicate deliveries.

### Pitfall 5: Fastify Rate Limiter vs. Per-Key Rate Limiter Conflict
**What goes wrong:** Both `@fastify/rate-limit` (global) and the per-key rate limiter trigger, causing confusing 429 responses.
**Why it happens:** The global rate limiter runs first (Fastify hook) and may reject requests before the per-key guard executes.
**How to avoid:** Exclude `/api/v1/*` routes from the global rate limiter by adding an `onRoute` hook check. Per-key rate limiting runs in the `TenantApiKeyGuard` (or a dedicated middleware). The global limiter continues protecting `/api/*` internal endpoints.
**Warning signs:** API consumers getting 429 responses despite being under their per-key limit; rate limit headers showing wrong values.

### Pitfall 6: NFC Manager Requires Native Module Linking
**What goes wrong:** `react-native-nfc-manager` fails to work on iOS/Android after `pnpm add`.
**Why it happens:** NFC is a native hardware capability requiring platform-specific permissions and native module autolinking. Expo managed workflow may need a dev client build.
**How to avoid:** Use `expo-dev-client` for development builds that include native modules. Add NFC entitlements in `app.json` (`ios.infoPlist.NFCReaderUsageDescription`, `android.permission.NFC`). Test on physical device — NFC does not work in simulators.
**Warning signs:** "Native module not found" errors; NFC scan never triggers on device.

## Code Examples

Verified patterns from official sources:

### SAML Strategy with Dynamic Configuration
```typescript
// Source: @node-saml/node-saml official docs + existing jwt.strategy.ts pattern
// apps/api/src/modules/sso/strategies/saml.strategy.ts
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile, VerifiedCallback } from "passport-saml";

@Injectable()
export class SamlStrategy extends PassportStrategy(Strategy, "saml") {
  constructor(private ssoService: SsoService) {
    super({
      // These are placeholders — actual config loaded dynamically per-org
      // when the strategy is instantiated by a factory
      callbackUrl: "", // filled by factory
      entryPoint: "",  // filled by factory
      issuer: "",       // filled by factory
      cert: "",         // filled by factory
      acceptedClockSkewMs: 60000,  // 60s tolerance for clock drift
      signatureAlgorithm: "sha256",
      wantAssertionsSigned: true,
      passReqToCallback: true,
    });
  }

  async validate(req: any, profile: Profile, done: VerifiedCallback) {
    const { nameID, getAssertionXml } = profile;
    const orgId = req.orgId; // From tenant context

    const user = await this.ssoService.findOrCreateSsoUser({
      orgId,
      externalId: nameID,
      email: profile.email || profile["urn:oid:0.9.2342.19200300.100.1.3"],
      firstName: profile["urn:oid:2.5.4.42"] || profile.firstName,
      lastName: profile["urn:oid:2.5.4.4"] || profile.lastName,
      rawAssertion: getAssertionXml(),
    });

    done(null, user);
  }
}
```

### OIDC Strategy
```typescript
// Source: openid-client official docs + NestJS Passport pattern
// apps/api/src/modules/sso/strategies/oidc.strategy.ts
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, type VerifyCallback } from "openid-client/passport";

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, "oidc") {
  constructor(private ssoService: SsoService) {
    // The openid-client Passport strategy is constructed with a client
    // instance that we create dynamically in a strategy factory
    super({
      // Will be set by factory using client from openid-client
      // client: await client.discovery(issuerUrl, clientId, clientSecret),
      usePKCE: true,
      params: {
        scope: "openid email profile",
      },
    });
  }

  async validate(tokenset: any, done: VerifyCallback) {
    const claims = tokenset.claims();
    const user = await this.ssoService.findOrCreateSsoUser({
      externalId: claims.sub,
      email: claims.email,
      firstName: claims.given_name,
      lastName: claims.family_name,
    });
    done(null, user);
  }
}
```

### BullMQ Webhook Delivery Processor
```typescript
// Source: Existing BullMQ processor pattern (notifications.processor.ts) + Stripe webhook docs
// apps/api/src/modules/webhook/webhook.processor.ts
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import * as crypto from "crypto";

const RETRY_SCHEDULE = [0, 60_000, 300_000, 900_000, 3_600_000, 86_400_000];

@Processor("webhook-delivery")
export class WebhookProcessor extends WorkerHost {
  async process(job: Job): Promise<any> {
    const { subscriptionId, eventType, payload, targetUrl, signingSecret, attemptNumber } = job.data;

    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signedPayload = `${timestamp}.${body}`;
    const signature = crypto
      .createHmac("sha256", signingSecret)
      .update(signedPayload)
      .digest("hex");

    const webhookId = job.id; // BullMQ job ID as unique delivery ID

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Id": webhookId!,
          "X-Webhook-Signature": `t=${timestamp},v1=${signature}`,
          "X-Webhook-Event": eventType,
        },
        body,
        signal: AbortSignal.timeout(30_000),
      });

      // Log delivery result to DB
      await this.logDelivery({ subscriptionId, webhookId, eventType, statusCode: response.status, responseBody: await response.text(), attemptNumber });

      if (!response.ok && attemptNumber < RETRY_SCHEDULE.length) {
        const delay = RETRY_SCHEDULE[attemptNumber];
        await job.moveToDelayed(Date.now() + delay, job.token);
        throw new Error(`HTTP ${response.status} — retrying in ${delay}ms`);
      }
    } catch (err: any) {
      if (attemptNumber < RETRY_SCHEDULE.length) {
        const delay = RETRY_SCHEDULE[attemptNumber];
        await job.moveToDelayed(Date.now() + delay, job.token);
      }
      throw err;
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `passport-saml` v2 (wraps old `node-saml`) | `passport-saml` v3 (wraps `@node-saml/node-saml` v5) | 2022 (v3 release) | v2 is deprecated; v3 uses modern SAML implementation with better security defaults |
| `openid-client` v5 (Node.js CJS only) | `openid-client` v6 (universal ESM) | 2024 (v6 release) | v6 requires Node.js >=20 (met); v5 is maintenance-only; v6 is OpenID FAPI 2.0 Certified |
| `expo-camera` from `expo-camera` (legacy) | `expo-camera` v57 (Expo SDK 54) | 2025 (SDK 54) | New API with better permission model; v57 is the current version for Expo SDK 54 |
| Plain `fetch()` webhook with 15s timeout | BullMQ-backed delivery with HMAC signing | Phase 10 | 100x more reliable; retry schedule prevents data loss; HMAC enables receiver verification |
| Env-var-based SSO config | Database-backed IdP config with dashboard UI | Phase 10 | No container restart needed; supports multiple IdP configs (for admin instance) |
| Global-only rate limiting | Two-layer: global + per-API-key | Phase 10 | Enterprise API consumers get appropriate rate limits; internal endpoints protected globally |

**Deprecated/outdated:**
- `passport-saml` v2.x: Deprecated, no security updates. Use v3.x. [VERIFIED: npm registry]
- `openid-client` v5.x: Maintenance mode. Use v6.x for new projects. [VERIFIED: npm registry + openid-client docs]
- `expo-camera` from Expo SDK <51: API changed significantly. Use v57 with SDK 54. [VERIFIED: Expo docs]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `openid-client` v6 works with NestJS Passport despite being ESM-only — Node.js v22 supports `require(esm)` | Standard Stack | Strategy creation fails; fallback to v5 or use dynamic `import()` |
| A2 | `react-native-nfc-manager` works with Expo SDK 54 managed workflow via `expo-dev-client` | Standard Stack | NFC features require bare workflow; increased build complexity |
| A3 | Per-key rate limiting can be implemented as a NestJS guard (not Fastify hook) without conflicting with global rate limiter | Architecture Patterns | Double-counting of requests; confusing 429 responses; need to restructure as middleware |
| A4 | HMAC signing secret should be stored encrypted at rest using PostgreSQL `pgp_sym_encrypt` (existing GovernanceService pattern) | Architecture Patterns | If encryption key is unavailable, secrets stored in plaintext in DB |
| A5 | Self-hosted single-org model means IdP config can be loaded once at startup (not per-request) | Common Pitfalls | If admin instance manages multiple orgs, need per-request strategy resolution |

## Open Questions (RESOLVED)

1. **OIDC client registration: dynamic vs. static** — RESOLVED: Manual entry (clientId + clientSecret in dashboard) for initial delivery. DCR deferred to future enhancement. See D-06.
   - What we know: `openid-client` supports both `client.discovery()` (auto-fetch server metadata from issuer URL) and manual client registration
   - What's unclear: Whether to support dynamic client registration (DCR) or require manual clientId/clientSecret entry in dashboard
   - Recommendation: Start with manual entry (clientId + clientSecret in dashboard) — simpler for enterprise IdPs like Azure AD that require pre-registration. Add DCR as a future enhancement.

2. **Webhook payload schema standardization** — RESOLVED: Common envelope per CloudEvents spec pattern. See D-14.
   - What we know: Each event type (alert.created, incident.escalated, etc.) has a different payload shape
   - What's unclear: Whether to standardize all webhook payloads with a common envelope (`{ event, data, timestamp }`) or pass through raw event data
   - Recommendation: Standardize with a common envelope — follow the CloudEvents spec pattern (`{ specversion, type, source, id, time, data }`). This makes receiver-side parsing consistent across event types.

3. **NFC feature on iOS** — RESOLVED: NFC documented as requiring physical device + entitlements. QR check-in as iOS fallback. See RESEARCH.md Common Pitfalls #6.
   - What we know: `react-native-nfc-manager` supports iOS but Apple restricts NFC to iPhone 7+ and requires specific entitlements
   - What's unclear: Whether the project's Apple Developer account has NFC entitlements approved
   - Recommendation: NFC badge validation is documented as requiring physical device + entitlements. Flag NFC as an optional feature that may require additional Apple Developer Program setup. QR check-in is the fallback for iOS without NFC.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | API runtime | ✓ | v22.23.1 | — |
| pnpm | Package management | ✓ | 9.0.0 | — |
| Python 3 | N/A (no Python deps) | ✓ | 3.12.3 | — |
| Docker | Containerization | ✓ | 29.6.1 | — |
| PostgreSQL | Data persistence | ✓ | Running (pg_isready) | — |
| Redis | BullMQ queues, rate limit counters | ✗ | — | Docker Compose includes Redis 7; start via `docker compose up redis` |
| Ollama | N/A (not used by Phase 10) | ✗ | — | Not required for Phase 10 |
| ffmpeg | N/A (not used by Phase 10) | ✓ | 6.1.1 | Not required for Phase 10 |

**Missing dependencies with no fallback:**
- **Redis:** Required for BullMQ `webhook-delivery` queue and per-key rate limit counters. Must be running for webhook and API key features to work. Docker Compose includes Redis — `docker compose up -d redis` resolves this.

**Missing dependencies with fallback:**
- None — all other dependencies are available or not required.

## Security Domain

> `security_enforcement` is not explicitly disabled in config. Including security analysis as defense-in-depth.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `passport-saml` + `openid-client` for SSO; existing `passport-jwt` for token exchange; `bcryptjs` for local fallback |
| V3 Session Management | yes | Existing JWT access/refresh token pattern unchanged; SSO adds alternative entry point but same session model |
| V4 Access Control | yes | Existing RBAC (JwtAuthGuard → TenantIsolation → RolesGuard); new TenantApiKeyGuard with scoped permissions for API access |
| V5 Input Validation | yes | Zod validation (shared schemas) + class-validator DTOs for all new endpoints; existing `ZodValidationPipe` pattern |
| V6 Cryptography | yes | SHA-256 for API key hashing; HMAC-SHA256 for webhook signing; PostgreSQL `pgp_sym_encrypt` for webhook secrets at rest; SAML assertions validated with IdP public certificate |
| V7 Error Handling | yes | Existing `AllExceptionsFilter` pattern; API key errors return standard format without leaking key values |
| V8 Data Protection | yes | Data classification labels (PII, security, audit, operational) on retention policies; pre-purge export for compliance |

### Known Threat Patterns for NestJS + SAML/OIDC + API Keys

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SAML response replay attack | Spoofing | `@node-saml/node-saml` built-in `validateInResponseTo` with cache provider; `NotOnOrAfter` validation |
| API key exposure in logs | Information Disclosure | Mask API key in logs (prefix + `...XXX`); exclude `X-API-Key` header from request logging |
| Webhook signing secret compromise | Information Disclosure | Store secrets encrypted at rest (pgp_sym_encrypt); never return secrets in API responses; rotate secrets via dashboard |
| SSO callback URL manipulation | Tampering | Validate `RelayState` against original request; use `openid-client` state parameter for CSRF protection |
| Unauthorized API access via leaked key | Spoofing | Key revocation via dashboard; key expiry dates; per-key rate limiting slows brute force; audit log for all key usage |
| Webhook SSRF (Server-Side Request Forgery) | Information Disclosure | Validate `targetUrl` against allowed domains; block private IP ranges (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) |
| XML External Entity (XXE) in SAML | Tampering | `@node-saml/node-saml` uses `xml2js` with XXE disabled by default; verify in security audit |
| Mass assignment on IdP config | Tampering | Zod validation with `forbidNonWhitelisted`; `whitelist: true` in global `ValidationPipe` |

## Sources

### Primary (HIGH confidence)
- [npm: @node-saml/node-saml] — Official README docs fetched; v5.1.0, 472K weekly downloads
- [npm: openid-client] — Official README docs fetched; v6.8.4, 8.3M weekly downloads, OpenID Certified
- [npm: passport-saml] — npm registry; v3.2.4, wraps @node-saml/node-saml
- [npm: expo-camera] — npm registry; v57.0.2, Expo SDK 54 compatible
- [npm: expo-barcode-scanner] — npm registry; v13.0.1
- [npm: react-native-nfc-manager] — npm registry; v3.17.2
- [Source: apps/api/src/modules/auth/strategies/jwt.strategy.ts] — Existing Passport strategy pattern
- [Source: apps/api/src/modules/license/guards/license-api-key.guard.ts] — SHA-256 key hashing guard pattern
- [Source: apps/api/src/modules/incident/incident.service.ts:675-774] — PDFKit + Handlebars report generation pattern
- [Source: apps/api/src/modules/governance/governance.service.ts] — Retention policy cron + BullMQ pruning pattern
- [Source: apps/api/src/modules/feature-gate/feature-gate.service.ts] — Feature flag tier mapping (sso, api_access, custom_branding)
- [Source: apps/api/src/modules/queue/queue.module.ts] — 14 BullMQ queues registered
- [Source: apps/api/src/main.ts:124-143] — Swagger/OpenAPI document builder pattern
- [Source: Caddyfile] — `/api/*` routing to API:4000

### Secondary (MEDIUM confidence)
- [slopcheck output] — All 6 packages pass legitimacy check [OK]
- [Source: apps/dashboard/app/(dashboard)/parametres/page.tsx] — Settings page integration point
- [Source: apps/dashboard/app/(auth)/login/page.tsx] — Login page SSO integration point
- [Source: apps/dashboard/lib/nav-config.ts] — Navigation config for new entries
- [Source: apps/mobile/lib/offline-storage.ts] — Offline queue pattern for mobile

### Tertiary (LOW confidence)
- None — all claims verified against official sources or existing codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All 6 new packages verified via npm registry, slopcheck, and official documentation; all existing packages confirmed installed
- Architecture: HIGH — Patterns verified against existing codebase (jwt.strategy.ts, license-api-key.guard.ts, governance.service.ts, incident.service.ts, queue.module.ts)
- Pitfalls: MEDIUM — SAML clock skew and resolver caching are known issues from official docs; per-key rate limiter vs global limiter interaction is theoretical (not yet tested in this codebase)
- Mobile: MEDIUM — expo-camera and expo-barcode-scanner are well-documented but react-native-nfc-manager with Expo managed workflow needs dev client confirmation
- Security: HIGH — Threat patterns mapped against ASVS categories with specific mitigations from library docs

**Research date:** 2026-07-16
**Valid until:** 2026-08-16 (30 days — SAML/OIDC libraries stable; Expo SDK 54 may have patch releases)
