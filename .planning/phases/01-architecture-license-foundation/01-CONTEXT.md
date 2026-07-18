# Phase 1: Architecture & License Foundation - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactor license system so vault-app generates VISION/BASTION license keys and vault-os validates them with feature gating, mode dégradé, trial, and vault-app admin portal foundation. Covers **two repos**: vault-os (this monorepo) and vault-app (separate project at `/home/devuser/projects/vault-app/`).

**Requirements:** LIC-01, LIC-02, LIC-03, LIC-04, LIC-05, LIC-06, ADM-01, ADM-02, ADM-03
</domain>

<decisions>
## Implementation Decisions

### Feature Gate: Tiers → Packs + Modules
- **D-01:** Remove FREE/PROFESSIONAL/ENTERPRISE tier system entirely. Replace with **VISION** (fixed pack) and **BASTION** (base + optional modules).
- **D-02:** BASTION modules are individual feature flags pre-seeded at org creation. Admin enables/disables per client. Modules: extra cameras, access control, extra sites, predictive analytics, DPO, SLA premium, API tierce.
- **D-03:** Numeric limits (maxCameras, maxUsers) encoded in license JWT claims. vault-os enforces via guards on creation.
- **D-04:** FeatureFlag model: replace `tier` field with `pack` (VISION/BASTION). Module flags have `pack=BASTION` + `moduleKey`.

### vault-app Architecture
- **D-05:** vault-app is a **separate project** outside the vault-os monorepo at `/home/devuser/projects/vault-app/`. It serves as both public marketing site AND internal admin portal for VaultOS founders.
- **D-06:** Auth: email + password for VaultOS admins (separate from vault-os auth).
- **D-07:** License API: REST endpoints exposed by vault-app. vault-os calls for 24h verification. Protocol: REST, not stateless JWT.
- **D-08:** Single PLAN.md covering both repos.

### License Activation & Trial UX
- **D-09:** First launch: full-page activation wizard (blocks dashboard access). Two options: "Enter key" or "Start 7-day free trial".
- **D-10:** Trial = full VISION pack for 7 days.
- **D-11:** License status displayed in dedicated settings page + expiry warning banner.

### Mode Dégradé Enforcement
- **D-12:** 24h ping mechanism: cron job in vault-os (`@nestjs/schedule`) calls vault-app verification API, stores last-check timestamp locally.
- **D-13:** Degraded mode (72h offline): dashboard + recording continue. Blocked: create/edit cameras, zones, users, AI settings.
- **D-14:** Expired mode: read-only dashboard + recording stopped. No new AI alerts.

### License Key Security
- **D-15:** RSA key pair. Private key in vault-app `.env` (never committed). Public key embedded in vault-os `license-public-key.ts`.

### Migration & Cleanup
- **D-16:** No production data exists. Clean schema migration is fine.
- **D-17:** `planTier` field on Organization: remove completely.
- **D-18:** `POST /api/licenses/generate` endpoint and `LicenseApiKeyGuard`: remove from vault-os (generation is vault-app only).
- **D-19:** Full cleanup: remove ALL FREE/PROFESSIONAL/ENTERPRISE references from vault-os codebase (FeatureGateService seeding, types, constants).

### Dashboard UI Scope (vault-os)
- **D-20:** New pages: activation wizard (`/activate`), license settings (`/parametres/licence`), expiry warning banner (all pages).
- **D-21:** Activation wizard is full-page, blocks dashboard access until license or trial is activated.

### the agent's Discretion
- Exact API endpoint design for license generation/verification between vault-app and vault-os.
- Implementation details of the cron job (specific schedule config, retry logic).
- Exact feature flag key naming convention for modules.
- UI design specifics (component implementation details, styling).
- The agent should check if vault-app has a Prisma schema or needs one for license key generation.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Pricing & Feature Spec
- `docs/PRICING-SPEC.md` — Complete feature matrix and pricing: VISION (23 features, max 10 cams), BASTION (49 features + optional modules), deployment model, license rules

### vault-app Project
- `/home/devuser/projects/vault-app/` — Separate Next.js project at port 3200. Currently has marketing pages only (pricing, blog, contact, produits, solutions). Needs admin portal (auth, org CRUD, license generation) and license verification API.

### vault-os License System (existing code)
- `apps/api/src/modules/license/` — Existing license module (service, controller, guards, key manager). Needs refactoring: remove generation, keep activation/verification.
- `apps/api/src/common/guards/feature-gate.guard.ts` — Existing global guard for feature flags. Needs retargeting from tiers to VISION/BASTION/modules.
- `apps/api/src/modules/feature-gate/feature-gate.service.ts` — Feature seeding logic. Needs complete rewrite for pack+module model.
- `apps/api/src/modules/feature-gate/feature-gate.module.ts` — Feature gate module with Redis provider.
- `apps/api/src/common/decorators/feature-gate.decorator.ts` — `@RequiresFeature(featureKey)` decorator.
- `apps/api/src/modules/license/guards/license-expiry.guard.ts` — Selective guard for license expiry. Extend for degraded mode.
- `apps/api/prisma/schema.prisma` — Models: License, LicenseApiKey, FeatureFlag, Organization, OrganizationMember. Needs schema changes.
- `packages/shared/src/schemas/license.schema.ts` — Zod schemas for license operations.
- `packages/shared/src/constants/license.constants.ts` — License constants (version, status, grace period, trial duration).
- `packages/shared/src/types/license.types.ts` — Shared license types.

### ROADMAP & Requirements
- `.planning/ROADMAP.md` §Phase 1 — Phase goal, success criteria (5 items), requirements list
- `.planning/REQUIREMENTS.md` — LIC-01 to LIC-06, ADM-01 to ADM-03
- `.planning/STATE.md` — Current project state, risk assessment for Phase 1

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **LicenseService** (`apps/api/src/modules/license/license.service.ts`) — Core business logic: activate, status resolution (with trial auto-init, grace period, expiry), usage counting. Most of this survives the refactor — only generation is removed.
- **FeatureGateGuard** (`apps/api/src/common/guards/feature-gate.guard.ts`) — Global guard with Redis caching. Already enforces feature flags per-org. Needs retargeting from tiers to packs.
- **LicenseExpiryGuard** (`apps/api/src/modules/license/guards/license-expiry.guard.ts`) — Selective guard for license state. Can extend for degraded/expired enforcement.
- **License model** (Prisma) — Already has `maxCameras`, `maxDoors`, `status`, `expiresAt`, `gracePeriodDays`. Use JWT claims encoding.
- **Zod schemas** (`packages/shared/src/schemas/license.schema.ts`) — `activateLicenseSchema` reusable. Remove `generateLicenseSchema`.
- **API client** (`apps/dashboard/lib/api.ts` lines 2371-2458) — License API functions already exist (getLicenseStatus, activateLicense, etc.). Need UI pages to consume them.
- **Dashboard auth pattern** (`apps/dashboard/lib/auth-client.ts`) — `fetchWithAuth` handles 401 auto-redirect, session storage for tokens. Reuse for vault-os dashboard license pages.

### Established Patterns
- **Guard chain**: JwtAuthGuard → TenantIsolationGuard → RolesGuard → FeatureGateGuard. Add license check as part of FeatureGateGuard or a follow-up guard.
- **ScheduleModule**: `@nestjs/schedule` already available for the 24h ping cron job.
- **UI pages**: Pages Router pattern (`app/(dashboard)/parametres/`). License settings page follows existing settings pattern.
- **Error handling**: Global AllExceptionsFilter + ZodValidationPipe. License errors follow same `StandardErrorResponse` format.
- **Multi-tenancy**: TenantIsolationGuard ensures org-scoped access. License and LicenseApiKey are NOT in SCOPED_MODELS (by design — fetched by explicit orgId).

### Integration Points
- **Feature gate**: update `DEFAULT_FEATURES` in `FeatureGateService` to seed VISION flags + BASTION modules per org at creation.
- **Dashboard**: new route group for license pages (`app/(dashboard)/parametres/licence/`). Route guard for activation wizard.
- **Prisma migration**: Schema changes (remove planTier, rename FeatureFlag.tier to pack, update License model).
- **Guard chain**: Add license state check to the existing guard chain or as an interceptor for new-feature-locked operations.

### Creative Options
- The existing license JWT already encodes claims. Encode `pack: "VISION"|"BASTION"`, `modules: string[]`, `maxCameras`, `maxUsers` as JWT claims.
- Network failures for 24h ping should not block vault-os. Graceful: if vault-app is unreachable, store "last check failed" timestamp and retry.
- For completely offline deployments (air-gapped): a special "offline license" type that vault-app generates with longer validity.

</code_context>

<specifics>
## Specific Ideas

- vault-app is for VaultOS founders only (NOT client-facing apart from marketing pages). It manages organizations, generates license keys, and provides the verification API.
- License key is the RSA-signed JWT. Vault-os activates it and enforces limits locally.
- The pricing spec (`docs/PRICING-SPEC.md`) is the authoritative document for what belongs in each pack and what optional modules exist.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---

*Phase: 1-Architecture & License Foundation*
*Context gathered: 2026-07-18*
