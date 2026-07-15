---
phase: 04-commercial-foundation
plan: 04a
subsystem: auth
tags: [multi-tenant, jwt, organization, org-switcher, rbac, nestjs]

requires:
  - phase: 04-02
    provides: Organization schemas, OrganizationMember, switchOrg schema
  - phase: 04-03
    provides: Schema migration (Site→Organization)
provides:
  - JWT strategy with orgId payload and server-side membership verification
  - Multi-tenant auth service (register with org creation, login with org resolution, switchOrg)
  - Organization CRUD module following SiteModule patterns
affects: [04-04b, 04-05, 04-06, 04-07, 04-08]

tech-stack:
  added: []
  patterns:
    - Transactional org+user+member creation via prisma.$transaction
    - Server-side role resolution (membership.role from DB, not JWT claim)
    - Full refresh token revocation on org switch (Pitfall 5 mitigation)

key-files:
  created:
    - apps/api/src/modules/organization/organization.module.ts
    - apps/api/src/modules/organization/organization.controller.ts
    - apps/api/src/modules/organization/organization.service.ts
  modified:
    - apps/api/src/modules/auth/strategies/jwt.strategy.ts
    - apps/api/src/modules/auth/auth.service.ts
    - apps/api/src/modules/auth/auth.controller.ts
    - apps/api/src/modules/auth/auth.service.spec.ts
    - apps/api/src/app.module.ts

key-decisions:
  - "Server-side role resolution: role from db (membership.role), not from JWT claim — prevents stale-JWT attacks after membership change (D-06)"
  - "Full refresh token revocation on switch-org prevents old refresh tokens from re-issuing tokens for wrong org (Pitfall 5)"
  - "Organization CRUD follows exact SiteModule pattern — controller, service, module with audits and RBAC"
  - "GET /api/organizations/me returns current user's org using orgId from JWT"
  - "Register response includes organization object for immediate UI routing"

requirements-completed:
  - FND-03
  - FND-04

duration: 3min
completed: 2026-07-15
---

# Phase 04 Plan 04a: Multi-Tenant Auth + Organization CRUD Summary

**JWT tokens carry orgId+role with server-side membership verification; register creates Org+User+Member in one transaction; login resolves org context from OrganizationMember; switch-org re-issues tokens; full Organization CRUD at /api/organizations**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-15T17:08:34Z
- **Completed:** 2026-07-15T17:11:51Z
- **Tasks:** 4
- **Files modified:** 8

## Accomplishments

- JwtStrategy validates org membership on every request — role from DB, not JWT claim
- Register creates Organization + User + OrganizationMember(ADMIN) in single Prisma transaction
- Login resolves org context from OrganizationMember, returns organizations list for org switcher
- Switch-org (POST /api/auth/switch-org) validates membership, revokes old refresh tokens, re-issues scoped tokens
- GET /api/auth/organizations returns user's org list for switcher UI
- OrganizationModule with full CRUD (findAll, findById, create, update, soft-delete) following SiteModule patterns
- Organization routes registered at /api/organizations with Zod validation and RBAC guards

## Task Commits

Each task was committed atomically:

1. **Task 1: Update JwtStrategy with orgId payload and OrganizationMember verification** - `742e780` (feat)
2. **Task 2: Rewrite AuthService for multi-tenant org model** - `6df2d99` (feat)
3. **Task 3: Add switch-org and organizations endpoints to AuthController** - `5736db5` (feat)
4. **Task 4: Create OrganizationModule with CRUD following SiteModule patterns** - `faff8c5` (feat)

**Deviation fix:** `25650eb` (test: fix auth service tests for new register/login signatures)

**Plan metadata:** (appended in final commit)

## Files Created/Modified

- `apps/api/src/modules/auth/strategies/jwt.strategy.ts` - Added PrismaService injection, orgId in payload, OrganizationMember lookup, DB-sourced role
- `apps/api/src/modules/auth/auth.service.ts` - Rewrote register/login/refresh/createTokens; added switchOrg(), getUserOrganizations()
- `apps/api/src/modules/auth/auth.controller.ts` - Added switch-org and organizations endpoints; updated register response
- `apps/api/src/modules/auth/auth.service.spec.ts` - Updated tests for new multi-tenant service signatures
- `apps/api/src/modules/organization/organization.module.ts` - New NestJS module (controller + service + exports)
- `apps/api/src/modules/organization/organization.controller.ts` - New CRUD controller with queries, me, create, update, delete
- `apps/api/src/modules/organization/organization.service.ts` - New service with findAll, findById, create, update, soft-delete
- `apps/api/src/app.module.ts` - Registered OrganizationModule in imports

## Decisions Made

- **Server-side role resolution (D-06):** Role is always resolved from `OrganizationMember.role` in DB, not from JWT claims — prevents stale-JWT attacks after membership changes
- **Full refresh token revocation on switch (Pitfall 5):** All existing refresh tokens are revoked before issuing new ones, preventing old tokens from re-issuing tokens for the wrong org
- **$transaction for registration:** Org + User + Member created atomically — no partial registration state
- **Soft-delete for Organization:** Follows Site module pattern — uses `isActive: false` instead of actual deletion

## Deviations from Plan

**1. [Rule 3 - Blocking] Fixed auth.service.spec.ts tests for new register/login/refresh signatures**
- **Found during:** Verification (Task completion check)
- **Issue:** Existing test file used old register signature (no organizationName) and old user.create mock; login/refresh tests didn't mock organizationMember.findFirst
- **Fix:** Added organizationName to test data, mocked $transaction instead of user.create, added organizationMember mocks for login/refresh, updated assertions for new response shapes
- **Files modified:** `apps/api/src/modules/auth/auth.service.spec.ts`
- **Verification:** No compilation errors in auth/organization files
- **Committed in:** `25650eb` (test commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix — test file must compile for CI to pass. No scope creep.

## Issues Encountered

- Pre-existing TypeScript compilation errors in unrelated modules (site.service.ts, user.service.ts, visitor.service.ts, etc.) from the Site→Organization schema migration in prior plans — these are not caused by this plan and are out of scope per scope boundary rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Multi-tenant auth core complete: org-scoped JWT, register-with-org, login-with-context, switch-org, Organization CRUD
- Ready for Plan 04-04b (Invite module — invite CRUD, token-based accept flow, Resend email integration)
- OrganizationModule registered in AppModule and ready for dependency injection

## Self-Check: PASSED

- ✅ All 4 tasks executed and committed
- ✅ Organization module files exist (3 created)
- ✅ All 5 commits present in git history
- ✅ SUMMARY.md created with substantive content

---

*Phase: 04-commercial-foundation*
*Completed: 2026-07-15*
