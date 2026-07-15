---
phase: 04-commercial-foundation
plan: 02
subsystem: shared
tags: zod, validation, organization, invite, auth, schemas

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Existing site/camera/alert Zod schema patterns
provides:
  - Organization create/update Zod schemas with billing fields
  - Invite create/accept Zod schemas with role validation
  - Modified register schema (organizationName replaces siteId/role)
  - Switch-org schema with UUID validation
  - JWT_INVITE_SECRET env var for invite token signing
affects: [04-commercial-foundation, 05-monetization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Organization schema follows site.schema.ts pattern with billing field additions
    - Invite schema follows auth.schema.ts pattern with French error messages
    - Organization switcher validation via switchOrgSchema with UUID check

key-files:
  created:
    - packages/shared/src/schemas/organization.schema.ts
    - packages/shared/src/schemas/invite.schema.ts
  modified:
    - packages/shared/src/schemas/auth.schema.ts
    - packages/shared/src/index.ts
    - .env.example

key-decisions:
  - "Organization schema mirrors existing Site schema (name, address, city, country, lat/lng, isActive) plus billing fields (billingEmail, planTier)"
  - "Register schema drops siteId and role — replaced by organizationName for auto-org creation on registration"
  - "Switch-org schema validates organizationId as UUID — membership check deferred to AuthService"
  - "Invite schema carries role at creation time (D-15), NOT at invite link generation — role is baked into the invite"

patterns-established:
  - "French error messages for all user-facing validation ('Email invalide', 'Le nom est requis')"
  - "Zod schema files follow import → export const → export type structure"
  - "Barrel exports organized by domain with '// Schemas - X' section headers"

requirements-completed:
  - FND-01
  - FND-05

# Metrics
duration: 2min
completed: 2026-07-15
---

# Phase 4: Commercial Foundation — Plan 2 Summary

**Organization, invite, and authentication Zod validation schemas for multi-tenant support — with updated barrel exports**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-15T17:03:34Z
- **Completed:** 2026-07-15T17:06:19Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments

- Created `organization.schema.ts` with `createOrganizationSchema` and `updateOrganizationSchema`, including billing fields (`billingEmail`, `planTier`) and French error messages
- Created `invite.schema.ts` with `createInviteSchema` (email + role) and `acceptInviteSchema` (token + password + name), following existing French convention
- Modified `auth.schema.ts` — removed `siteId` and `role` from `registerSchema`, added required `organizationName`; added `switchOrgSchema` with UUID validation
- Updated shared barrel `index.ts` — exported all new schemas and types while preserving all 30+ existing exports
- Added `JWT_INVITE_SECRET` to `.env.example` for invite token JWT signing
- TypeScript compilation passes with zero errors; runtime validation confirmed for all schemas

## Task Commits

Each task was committed atomically:

1. **Task 1: Create organization.schema.ts and invite.schema.ts** - `ba18885` (feat)
2. **Task 2: Modify auth.schema.ts — replace siteId with organizationName, add switchOrgSchema** - `3ef70e2` (feat)
3. **Task 3: Update shared barrel exports in index.ts** - `6c4a9c5` (feat)
4. **Task 4: Add JWT_INVITE_SECRET to .env.example** - `b10a873` (feat)

**Plan metadata:** pending

## Files Created/Modified
- `packages/shared/src/schemas/organization.schema.ts` - Organization create/update Zod schemas with billing fields (CREATED)
- `packages/shared/src/schemas/invite.schema.ts` - Invite create/accept Zod schemas with role validation (CREATED)
- `packages/shared/src/schemas/auth.schema.ts` - Modified registerSchema (organizationName replaces siteId/role), added switchOrgSchema (MODIFIED)
- `packages/shared/src/index.ts` - Added barrel exports for organization, invite, and switchOrg schemas/types (MODIFIED)
- `.env.example` - Added JWT_INVITE_SECRET in Auth section (MODIFIED)

## Decisions Made

- Followed exact site.schema.ts pattern for organization schema (name, address, country defaults, lat/lng validation, isActive)
- Added billing fields (billingEmail, planTier with FREE/PROFESSIONAL/ENTERPRISE enum) for forward compatibility with Phase 5 monetization
- Removed `role` from registerSchema since role is now assigned via OrganizationMember — consistent with D-08 (auto-org creates ADMIN role)
- Removed `siteId` from registerSchema since registration creates an org, not links to an existing site — consistent with D-08
- switchOrgSchema validates only UUID format — membership validation deferred to AuthService per D-07
- JWT_INVITE_SECRET value follows naming convention of existing JWT_* secrets with `change-me-*` placeholder

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Self-Check: PASSED

Verification results:
- `npx tsc --noEmit --project packages/shared/tsconfig.json` — exit code 0 (PASS)
- `node -e "require('./packages/shared/dist')"` — all 5 new runtime exports present (PASS)
- Runtime validation confirmed: organization schema defaults (planTier: FREE, country: SN), invite schema validation, switch-org UUID check (PASS)
- All 4 commits found in git log (PASS)
- All created files exist on disk (PASS)

## Next Phase Readiness

- All new Zod schemas compile and export correctly from `@repo/shared`
- Auth schema modified for organization-aware registration (organizationName replaces siteId)
- Switch-org schema defined for org switching endpoint (Plan 04)
- Barrel exports include all new schemas — ready for API controller usage in Plan 04

---
*Phase: 04-commercial-foundation*
*Completed: 2026-07-15*
