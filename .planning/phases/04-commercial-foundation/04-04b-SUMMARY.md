---
phase: 04-commercial-foundation
plan: 04b
subsystem: api
tags: [nestjs, invite, jwt, resend, email, organization, rbac]

requires:
  - phase: 04-commercial-foundation
    plan: 04a
    provides: Multi-tenant auth service with createTokens, OrganizationModule
  - phase: 04-02
    provides: Invite schema (createInviteSchema, acceptInviteSchema), Organization schema

provides:
  - InviteService with JWT-signed invite tokens, Resend email, accept flow
  - InviteController CRUD endpoints at /api/organizations/:orgId/invites
  - Public POST /api/auth/accept-invite endpoint

affects:
  - 04-05 (auth refinements)
  - 05-01 (billing — org needs invites for team growth)

tech-stack:
  added: []
  patterns:
    - Invite tokens signed with JWT_INVITE_SECRET (separate from access/refresh secrets)
    - Resend SDK integration for transactional invite emails
    - Single-use invite enforcement (status check before accept)
    - Existing user auto-onboarding (D-13) — find existing user before creating new one

key-files:
  created:
    - apps/api/src/modules/organization/invite/invite.service.ts
    - apps/api/src/modules/organization/invite/invite.controller.ts
    - apps/api/src/modules/organization/invite/invite.module.ts
  modified:
    - apps/api/src/modules/auth/auth.service.ts
    - apps/api/src/modules/auth/auth.controller.ts
    - apps/api/src/modules/auth/auth.module.ts
    - apps/api/src/modules/organization/organization.module.ts

key-decisions:
  - "InviteModule organized as sub-module of OrganizationModule — imported and re-exported via OrganizationModule"
  - "AuthModule imports OrganizationModule to access InviteService for DI resolution"
  - "Made AuthService.createTokens() public — InviteService needs it to issue login tokens after accept"
  - "acceptInvite endpoint is @Public() — invitees may not have an account yet (token verification is security layer)"
  - "Invite email errors do NOT throw — invite persisted regardless; resend can be used"

requirements-completed:
  - FND-05

duration: 3min
completed: 2026-07-15
---

# Phase 04 Plan 04b: Invite Module with JWT Tokens and Resend Email Summary

**JWT-signed invite tokens with 48h expiry, Resend email delivery, accept-invite flow (creates/finds user + OrganizationMember), and CRUD endpoints for invite management at /api/organizations/:orgId/invites**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-15T17:20:13Z
- **Completed:** 2026-07-15T17:23:16Z
- **Tasks:** 3
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments

- **InviteService** — `createInvite()` signs JWT with `JWT_INVITE_SECRET` (48h expiry), persists `Invite` row as PENDING, sends HTML invite email via Resend SDK. `acceptInvite()` verifies JWT, enforces single-use (checks status !== ACCEPTED), finds or creates User (D-13), creates OrganizationMember with invited role, marks invite ACCEPTED, issues auth tokens. Supports `resendInvite()` (re-issue JWT + re-send email) and `revokeInvite()` (REVOKED status, keeps audit trail).
- **InviteController** — REST endpoints at `organizations/:orgId/invites`: `POST /` (create, ADMIN-only), `GET /` (list, ADMIN/SUPERVISOR), `POST /:inviteId/resend` (ADMIN), `DELETE /:inviteId` (revoke, ADMIN). All protected by `JwtAuthGuard` + `@Roles`. Uses `ZodValidationPipe` with `createInviteSchema`.
- **AuthController update** — Public `POST /api/auth/accept-invite` endpoint using `acceptInviteSchema` validation, sets `refreshToken` httpOnly cookie, returns tokens + user + organization to client.
- **AuthService update** — `acceptInvite()` method delegates to `InviteService.acceptInvite()`. Made `createTokens()` public for InviteService's use.
- **Module wiring** — `InviteModule` registered via `OrganizationModule` imports/exports. `AuthModule` imports `OrganizationModule` for InviteService DI resolution.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create InviteService — JWT invite tokens, Resend email, accept flow** - `63e4844` (feat)
2. **Task 2: Create InviteModule and InviteController** - `8914e00` (feat)
3. **Task 3: Add accept-invite endpoint to AuthController + acceptInvite to AuthService** - `b945c3e` (feat)

**Plan metadata:** Pending

## Files Created/Modified

- `apps/api/src/modules/organization/invite/invite.service.ts` — InviteService: createInvite, listInvites, resendInvite, revokeInvite, acceptInvite with JWT + Resend + OrganizationMember creation
- `apps/api/src/modules/organization/invite/invite.controller.ts` — InviteController: CRUD at organizations/:orgId/invites with JwtAuthGuard + @Roles
- `apps/api/src/modules/organization/invite/invite.module.ts` — InviteModule: exports InviteService
- `apps/api/src/modules/organization/organization.module.ts` — Added InviteModule import + export
- `apps/api/src/modules/auth/auth.service.ts` — Added acceptInvite() delegation; made createTokens() public
- `apps/api/src/modules/auth/auth.controller.ts` — Added POST /api/auth/accept-invite as @Public() endpoint
- `apps/api/src/modules/auth/auth.module.ts` — Added OrganizationModule import for InviteService DI

## Decisions Made

- **InviteModule as sub-module of OrganizationModule** — The invite module lives inside the organization directory and is registered by importing it in OrganizationModule, which re-exports it. This keeps the organization feature self-contained.
- **AuthModule imports OrganizationModule** — Required for NestJS DI to resolve InviteService in AuthService. OrganizationModule exports InviteModule (which provides InviteService).
- **createTokens() made public** — `createTokens` was previously private on AuthService. InviteService needs it to issue JWT access + refresh tokens after a user accepts an invite.
- **accept-invite endpoint is @Public()** — The endpoint requires no authentication because invitees may not have an account yet. JWT token verification (signed with JWT_INVITE_SECRET) is the security layer.
- **Graceful email failure** — If Resend email sending fails, the invite record is still persisted and an error is logged. The caller can use `resendInvite()` to retry email delivery.
- **Existing user auto-onboarding** — When an existing user accepts an invite (D-13), their password, firstName, and lastName fields from the request body are ignored — only the OrganizationMember creation and Invite status update are performed.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — all tasks completed cleanly.

## User Setup Required

**External services require manual configuration.** See [04-USER-SETUP.md](./04-USER-SETUP.md) for:
- `JWT_INVITE_SECRET` — Generate with `openssl rand -hex 32` and set in `.env`
- `RESEND_API_KEY` — Obtain from Resend Dashboard and set in `.env`

## Next Phase Readiness

- Invite module complete with JWT-signed tokens, Resend email, accept flow, and CRUD endpoints
- Single-use enforcement active (T-04-21)
- Auth wiring complete: public accept-invite endpoint, private invite management endpoints
- Ready for Plan 04-05 (auth refinements / remaining auth work)

---

## Self-Check: PASSED

- [x] All 3 tasks executed and committed
- [x] `invite.service.ts` — created with JWT_INVITE_SECRET (3 references), acceptInvite method
- [x] `invite.controller.ts` — created with invites endpoints (4 references)
- [x] `invite.module.ts` — created with InviteService export
- [x] `organization.module.ts` — imports and exports InviteModule
- [x] `auth.service.ts` — acceptInvite method added (2 references), createTokens made public
- [x] `auth.controller.ts` — accept-invite endpoint added (1 reference)
- [x] `auth.module.ts` — imports OrganizationModule
- [x] All 3 commits present in git log

---

*Phase: 04-commercial-foundation*
*Completed: 2026-07-15*
