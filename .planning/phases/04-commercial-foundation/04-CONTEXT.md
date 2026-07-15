# Phase 4: Commercial Foundation - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Multi-tenant architecture: Organization model replaces Site as the tenant boundary, user-to-organization relationships via join table, JWT-scoped to current organization, invite-based onboarding with role assignment, per-tenant hash-chained audit logs, and feature gate infrastructure for license tiers. Data isolation enforced through Prisma Client Extensions (primary) + PostgreSQL RLS (defense-in-depth).
</domain>

<decisions>
## Implementation Decisions

### Organization Model
- **D-01:** Organization replaces Site — `siteId` → `organizationId` everywhere. No nested hierarchy; Phase 4 is about tenant isolation, not geographic grouping.
- **D-02:** Organization model inherits Site's fields (name, address, city, country, lat/lng, isActive) plus billing metadata (stripeCustomerId, billingEmail, planTier). Billing fields are forward-looking for Phase 5.
- **D-03:** Migration: single Prisma migration renames `siteId` → `organizationId` across all 29+ tables. Clean break — no backward compat layer.
- **D-04:** No Location/Site sub-model in this phase. Cameras, doors, zones reference `organizationId` directly. Physical location grouping deferred.

### User Multi-Tenancy
- **D-05:** New `OrganizationMember` join table (userId, organizationId, role, isActive). Role is always per-organization. User has no global role.
- **D-06:** JWT payload: `{ sub, email, orgId, role }`. Permissions resolved server-side from OrganizationMember + role hierarchy — not baked into the token.
- **D-07:** Organization switching: `POST /api/auth/switch-org` validates membership, re-issues access+refresh tokens with the new `orgId`+`role`. Every request is scoped to exactly one organization.
- **D-08:** Registration creates organization automatically: `POST /api/auth/register` accepts `organizationName` + admin user details, creates Organization + User + OrganizationMember(role:ADMIN) in one transaction.

### Tenant Isolation
- **D-09:** Two-layer isolation: Prisma Client Extension auto-adds `WHERE organizationId = $currentOrg` to every query (primary enforcement). PostgreSQL RLS policies as a safety net for raw SQL/escapes.
- **D-10:** `TenantContextMiddleware` extends existing `SiteContextMiddleware` pattern — extracts `orgId` from JWT, sets PostgreSQL session variable `app.current_organization_id`. BullMQ workers read `orgId` from job data and set the session var before queries.
- **D-11:** Per-tenant audit hash chain: add `organizationId`, `previousHash`, `currentHash` columns to AuditLog. Each org gets its own chain. Hash = SHA256(previousHash + JSON.stringify(event)). Chain integrity verified by walking forward from genesis.

### Invite Flow
- **D-12:** JWT-signed invite token with 48h expiry, delivered via email link (Resend SDK). Invitee clicks link → accept page → sets password → becomes OrganizationMember. Token is single-use.
- **D-13:** Existing users auto-added to new organization on invite accept — creates an OrganizationMember row with the invited role. No re-registration needed.
- **D-14:** Invite CRUD at `/api/organizations/:orgId/invites`: admin can create (with role), resend (re-issues new token), revoke (invalidates token), and list pending/expired invites.
- **D-15:** Invite carries role assignment — admin selects the role (VIEWER/OPERATOR/SUPERVISOR/ADMIN) at creation time.

### Agent Discretion
- Feature gate infrastructure (FND-07): implementation approach not discussed — agent has flexibility on mechanism (DB flags, license tier mapping, feature flag service).
- Prisma Client Extension pattern: specific implementation (query-level vs model-level extension, interaction with transactions) left to planner/researcher.
- Frontend organization switcher UI: placement, design, and behavior on Dashboard and Mobile left to planner.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Definition
- `.planning/ROADMAP.md` — Phase 4 definition, requirements FND-01 to FND-07, success criteria
- `.planning/REQUIREMENTS.md` — Full requirement text for FND-01 through FND-07
- `.planning/PROJECT.md` — Project constraints, key decisions, tech stack boundaries

### State & Blockers
- `.planning/STATE.md` — Known blockers: Prisma Extension + RLS coexistence, SiteContextMiddleware migration, 29+ model reconciliation

### Current Architecture
- `.planning/codebase/ARCHITECTURE.md` — NestJS module pattern, RBAC guard system, current SiteContextMiddleware, data flow
- `.planning/codebase/STACK.md` — Prisma 5.22.0, NestJS 10.4.8, PostgreSQL 16, JWT via passport-jwt, Resend 6.12.3
- `.planning/codebase/INTEGRATIONS.md` — Resend SDK for email delivery (invites), PostgreSQL/Redis infrastructure

### Source Code (Key Files)
- `apps/api/prisma/schema.prisma` — Current schema: Site, User, AuditLog, and all domain models with siteId references
- `apps/api/src/common/middleware/site-context.middleware.ts` — Existing RLS session variable pattern (extend for tenant)
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts` — Current JWT validate hook (extend for orgId)
- `apps/api/src/common/guards/roles.guard.ts` — Current RBAC (extend for tenant-aware role lookup)
- `apps/api/src/modules/prisma/prisma.service.ts` — Global Prisma singleton (attach Client Extension here)
- `apps/api/src/modules/auth/auth.service.ts` — Auth logic (registration, login, token issuance to adapt)
- `packages/shared/src/constants/` — Role hierarchy constants (ROLE_HIERARCHY)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **SiteContextMiddleware** (`apps/api/src/common/middleware/site-context.middleware.ts`): Pattern for setting PostgreSQL session variables from request context — extend to `TenantContextMiddleware` with `app.current_organization_id`
- **JwtStrategy** (`apps/api/src/modules/auth/strategies/jwt.strategy.ts`): `validate()` hook already extracts `{ sub, email, role }` — extend to include `orgId`
- **RolesGuard** (`apps/api/src/common/guards/roles.guard.ts`): Existing decorator-based RBAC — adapt to read role from `OrganizationMember` instead of `user.role`
- **AuditLog model** (`apps/api/prisma/schema.prisma:490`): Existing flat audit table — extend with hash-chain columns
- **Resend SDK** (already integrated): Used by `NotificationService` for email — reuse for invite emails

### Established Patterns
- **NestJS module pattern**: `@Module({ controllers, providers, exports })` — new `OrganizationModule` follows this
- **Global singleton**: `PrismaModule` is `@Global()` — Prisma Client Extension should be attached there
- **Decorator-based RBAC**: `@Roles(...)` + `RolesGuard` — extend with `@CurrentOrg()` param decorator
- **Zod validation**: Shared schemas in `packages/shared/src/schemas/` — new org/invite schemas go here

### Integration Points
- **AppModule** (`apps/api/src/app.module.ts`): Register new `OrganizationModule`, update middleware registration
- **AuthModule**: Registration flow changes (org creation), login (org context in JWT), switch-org endpoint
- **All 29+ module services**: `siteId` → `organizationId` rename in every query
- **BullMQ processors**: Must read `orgId` from job data, set RLS session var before DB queries
- **Socket.IO gateways**: Must extract `orgId` from JWT on connection, scope events to organization
- **Dashboard API client** (`apps/dashboard/lib/api.ts`): Must handle org switching (token re-issue, org header)
- **Mobile API client** (`apps/mobile/lib/api.ts`): Same org switching as dashboard
</code_context>

<specifics>
## Specific Ideas

No specific external references or "make it like X" suggestions from the discussion. All decisions captured above are implementation-level convergences from the options presented.

Key preferences evident: clean break over gradual migration, defense-in-depth over single-layer isolation, small JWT with server-side resolution over large tokens, single-step registration over multi-step flows.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 4 scope.

</deferred>

---

*Phase: 4-Commercial-Foundation*
*Context gathered: 2026-07-15*
