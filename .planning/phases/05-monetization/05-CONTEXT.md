# Phase 5: Monetization - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure license-based monetization for a self-hosted physical security platform. Crypto-signed JWT license keys bound to organizations that carry device limits (cameras, doors) and expiration. No Stripe, no PayPal, no subscription billing — payment happens outside the app (wire, mobile money, etc.). Licenses are created by Oversight Hub admin via dashboard or API, activated by the customer in their self-hosted instance.

Covers LIC-01 through LIC-07. BIL-01 through BIL-07 are superseded by the pure licensing model.
</domain>

<decisions>
## Implementation Decisions

### Monetization Model
- **D-01:** Pure licensing model — no Stripe, no PayPal, no subscription billing integration. Payment/acquisition happens outside the platform.
- **D-02:** No free tier — the app is self-hosted by paying customers only.

### License Creation & Delivery
- **D-03:** Licenses generated via Oversight Hub admin dashboard UI (dedicated "Licences" page).
- **D-04:** Licenses also creatable programmatically via REST API, authenticated with a dedicated API key (not user JWT).
- **D-05:** License key is a crypto-signed JWT that the customer pastes/activates in their self-hosted dashboard.

### License Structure (JWT Claims)
- **D-06:** Claims: `organizationId`, `issuedAt`, `expiresAt`, `maxCameras`, `maxDoors`, `gracePeriodDays`, `licenseVersion`.
- **D-07:** No feature flags in the license — all features are available within device limits.
- **D-08:** No user limit — only camera and door counts are constrained.

### Expiration & Grace
- **D-09:** 7-day grace period after license expiry. During grace, full functionality continues with dashboard warnings.
- **D-10:** After 7 days, API blocks all mutations (read-only / blocked mode).

### Offline Validation
- **D-11:** 100% local validation — license JWT verified against a bundled RSA public key. No phone-home required.
- **D-12:** No revocation support — licenses expire naturally. Early deactivation is handled by issuing a replacement license with an earlier expiry date.

### Signing Key
- **D-13:** RSA key pair. Private key loaded from a Docker volume file at API startup. Public key bundled in the application for offline verification.

### Over-Limit Enforcement
- **D-14:** API refuses creation of cameras/doors beyond license limits with a clear error message. No over-limit allowance.
- **D-15:** UI also validates limits before allowing creation attempts (double barrier).

### Trial for New Organizations
- **D-16:** New organizations (created via registration in Phase 4) get a 7-day trial with unlimited devices.
- **D-17:** Trial period is time-only — no device limits during trial. After 7 days, a valid license is required.

### Feature Gate Infrastructure (FND-07)
- Not needed for this phase — no feature flags in the license model. FeatureFlag model from Phase 4 can remain dormant or be repurposed later.

### Agent Discretion
- Dashboard UI details for the "Licences" page (layout, tables, forms) — follow established Dashboard patterns (shadcn/ui, dark theme).
- API key management for license generation endpoint (creation UI, storage, rotation).
- License import/activation UI on the client dashboard.
- Exact error message wording for over-limit and expiry blocks.
- Trial license representation (virtual JWT or DB flag).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Definition
- `.planning/ROADMAP.md` — Phase 5 definition, LIC-01 to LIC-07 requirements, success criteria
- `.planning/REQUIREMENTS.md` — Full requirement text for LIC-01 through LIC-07 (BIL-01 through BIL-07 are superseded by pure licensing)
- `.planning/PROJECT.md` — Project constraints, key decisions, tech stack boundaries

### State & Prior Decisions
- `.planning/STATE.md` — Known blockers (Phase 5: PayPal lifecycle edge cases, Stripe webhook testing — moot now due to pure licensing)
- `.planning/phases/04-commercial-foundation/04-CONTEXT.md` — D-02: Organization has billing fields (stripeCustomerId, billingEmail, planTier) — keep as optional metadata; not used for billing

### Architecture & Code Patterns
- `.planning/codebase/ARCHITECTURE.md` — NestJS module pattern, guard system, tenant isolation
- `.planning/codebase/STACK.md` — Prisma 5.22.0, NestJS 10.4.8, JWT via jsonwebtoken, PostgreSQL 16
- `.planning/codebase/CONVENTIONS.md` — Naming, module structure, code style

### Source Code (Key Files)
- `apps/api/prisma/schema.prisma` — Current schema: Organization, Camera, Door, FeatureFlag models
- `apps/api/src/modules/prisma/prisma.service.ts` — Global Prisma singleton
- `apps/api/src/modules/auth/` — JWT patterns for license signing (RS256)
- `apps/api/src/common/guards/` — Guard patterns for API key auth
- `apps/api/src/modules/organization/organization.service.ts` — Organization CRUD (license activation integration point)
- `apps/api/src/modules/camera/camera.service.ts` — Camera creation (limit check hook point)
- `apps/api/src/modules/door/door.service.ts` — Door creation (limit check hook point)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Organization model** (`apps/api/prisma/schema.prisma`): Already has `stripeCustomerId`, `billingEmail`, `planTier` fields — can be repurposed or kept as metadata
- **JWT utilities** (`apps/api/src/modules/auth/`): Existing JWT sign/verify patterns can be adapted for RS256 license signing
- **Prisma tenant extension** (`apps/api/src/modules/prisma/tenant-extension.ts`): Auto-scopes license queries to org — reuse as-is
- **FeatureFlag model** (`apps/api/prisma/schema.prisma`): Exists from Phase 4 — not needed for licensing but available for future use
- **ConfigService + env validation** (`apps/api/src/config/`): Pattern for loading license signing key path from env

### Established Patterns
- **NestJS module pattern**: `@Module({ controllers, providers, exports })` — new `LicenseModule` follows this
- **Zod validation**: Shared schemas in `packages/shared/src/schemas/` — new license schemas go here
- **API key auth**: Can follow existing `SupervisionOrJwtGuard` pattern from edge agent auth
- **Docker volume mounts**: RSA key file mounted as Docker volume (follows existing config patterns)

### Integration Points
- **CameraService.create()**: Must check `maxCameras` limit before allowing creation
- **DoorService.create()**: Must check `maxDoors` limit before allowing creation
- **OrganizationService**: License activation endpoint, license status read
- **AppModule**: Register new `LicenseModule`
- **AuthModule**: Optional extensions for license API key guard
- **Dashboard settings/license page**: New route in dashboard for license management
- **BullMQ/Redis**: Not involved — licensing is synchronous request-time check
- **Caddy**: No changes needed (no webhook endpoints)

### Creative Options
- License claims structure is deliberately minimal — straightforward JWT format
- Offline validation means no webhook infrastructure needed at all
- Trial can be implemented as a DB flag on Organization (no JWT needed) or as a virtual JWT
</code_context>

<specifics>
## Specific Ideas

No external references — all decisions are implementation-level convergences from the discussion.

Key preferences evident: KISS over feature richness, offline-first over phone-home, no gateways over payment integration, natural expiry over revocation infrastructure.
</specifics>

<deferred>
## Deferred Ideas

### Superseded Requirements (BIL-01 to BIL-07)
Stripe/PayPal billing and subscription management requirements are explicitly superseded by the pure licensing model. These requirements should be moved from Active to Out of Scope (or deferred to a future milestone if a payment integration layer is ever needed).

### Feature Gate ↔ License Mapping
The FeatureFlag model from Phase 4 (FND-07) is not integrated with licensing in this phase. No feature flags in the license JWT. If tiered feature gating is needed later, this can be added as a new phase.
</deferred>

---

*Phase: 5-Monetization*
*Context gathered: 2026-07-15*
