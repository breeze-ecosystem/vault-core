---
phase: 05-monetization
plan: 02
subsystem: api
tags: [nestjs, license, jwt, rs256, jsonwebtoken, rsa, authorization]

requires:
  - phase: 05-monetization
    plan: 01
    provides: Shared license types, Zod schemas, constants, license-public-key.ts

provides:
  - LicenseKeyManager — RSA key loading at startup with graceful degradation
  - LicenseService — RS256 JWT signing, verification, state machine (trial/active/grace/expired/no_license)
  - LicenseExpiryGuard — Mutation blocking when license past grace period
  - LicenseApiKeyGuard — SHA-256 API key validation for programmatic license generation
  - LicenseController — 8 REST endpoints with correct auth (API key, JWT, admin roles)
  - CameraService license limit checks — double-barrier enforcement at service layer
  - DoorService.validateCanCreateDoor() — license limit hook for future door creation
  - AppModule LicenseModule registration

affects:
  - 05-03 (dashboard license pages will connect to these API endpoints)

tech-stack:
  added:
    - "jsonwebtoken ^9.0.3 — RS256 asymmetric JWT signing/verification"
    - "@types/jsonwebtoken ^9.0.10"
  patterns:
    - RSA key management via OnModuleInit singleton (KeyManager pattern)
    - License state machine with strict priority: active > grace > trial > expired > no_license
    - Double-barrier enforcement: controller guard + service-layer check
    - API key auth with SHA-256 hashing (non-reversible, prefix-only display)
    - Graceful degradation when signing key not configured

key-files:
  created:
    - apps/api/src/modules/license/license-key-manager.ts
    - apps/api/src/modules/license/license.types.ts
    - apps/api/src/modules/license/dto/license.dto.ts
    - apps/api/src/modules/license/license.service.ts
    - apps/api/src/modules/license/guards/license-expiry.guard.ts
    - apps/api/src/modules/license/guards/license-api-key.guard.ts
    - apps/api/src/modules/license/license.controller.ts
    - apps/api/src/modules/license/license.module.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/api/src/modules/camera/camera.service.ts
    - apps/api/src/modules/camera/camera.controller.ts
    - apps/api/src/modules/door/door.service.ts
    - apps/api/package.json
    - pnpm-lock.yaml

key-decisions:
  - "Used `findFirst` instead of `findUnique` in LicenseApiKeyGuard — `keyHash` is @unique but we also filter by `isActive`, which requires a compound where clause not supported by findUnique"
  - "Grace period auto-upgrade: DB status 'ACTIVE' → 'GRACE' happens at check time, avoiding stale DB state (Pitfall 6 mitigation)"
  - "Trial auto-initialization: orgs created before licensing system get a 7-day trial automatically on first getLicenseStatus call"
  - "Expired license returns expired state only after grace period is fully exhausted — mutations allowed during grace with dashboard warnings (D-09)"

requirements-completed:
  - LIC-01
  - LIC-02
  - LIC-03
  - LIC-04
  - LIC-07

duration: 8min
completed: 2026-07-15
---

# Phase 05 Monetization — Plan 02 Summary

**RS256 JWT license signing/verification service with RSA key management, 8-endpoint REST controller, license expiry guard, API key auth guard, and double-barrier device limit enforcement in CameraService/DoorService**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-15T22:25:42Z
- **Completed:** 2026-07-15T22:33:42Z
- **Tasks:** 3 (plus 1 human-verification checkpoint)
- **Files modified:** 14 (8 created, 6 modified)

## Accomplishments

- **LicenseKeyManager** — Singleton that loads RSA private key from file at startup via `OnModuleInit`; graceful fallback when key not configured logs warning but doesn't crash; provides `getPrivateKey()` and `getPublicKey()` (bundled from `license-public-key.ts`)
- **LicenseService** — Full business logic: `generateLicense()` signs RS256 JWT with claims per D-06, stores PENDING record in DB; `verifyAndActivate()` verifies signature against bundled public key, checks org binding and expiration; `getLicenseStatus()` implements correct priority state machine (active > grace > trial > auto-init-trial > expired > no_license); `getUsage()` returns camera/door counts vs limits; `listLicenses()` with optional org filter; `createApiKey()` generates uuid-based key with SHA-256 storage; `revokeApiKey()` soft-deactivates
- **LicenseExpiryGuard** — `CanActivate` guard that blocks mutation endpoints when license is past grace period; returns French error message per UI-SPEC
- **LicenseApiKeyGuard** — Validates `X-API-Key` header with SHA-256 hash comparison; only accepts non-revoked keys; attaches `request.apiKeyInfo` for audit
- **LicenseController** — 8 endpoints: `POST /generate` (API key auth), `POST /activate` (JWT), `GET /status` (JWT), `GET /` (admin), `GET /usage` (JWT), `POST /api-keys` (admin), `GET /api-keys` (admin), `DELETE /api-keys/:id` (admin)
- **CameraService double-barrier** — `@UseGuards(LicenseExpiryGuard)` on `@Post()` create endpoint (controller layer) + limit check in `create()` method (service layer) per D-15
- **DoorService limit hook** — `validateCanCreateDoor()` ready for future door creation endpoints
- **AppModule** — Registered `LicenseModule` in imports array

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LicenseModule core files** — `029de1c` (feat)
2. **Task 2: Create LicenseController, guards, and LicenseModule** — `3ae1c19` (feat)
3. **Task 3: Integrate LicenseModule — AppModule, camera/door limits** — `f045e6d` (feat)
4. **Lockfile update (Task 1 side-effect)** — `5741712` (chore)

**Plan metadata:** (committed after SUMMARY.md)

## Files Created/Modified

### Created (8)
- `apps/api/src/modules/license/license-key-manager.ts` — RSA key loader with OnModuleInit
- `apps/api/src/modules/license/license.types.ts` — Internal types (LicenseStatusResponse, ApiKeyInfo, UsageInfo)
- `apps/api/src/modules/license/dto/license.dto.ts` — Swagger DTOs for license endpoints
- `apps/api/src/modules/license/license.service.ts` — Core business logic: sign, verify, status, usage, API keys
- `apps/api/src/modules/license/guards/license-expiry.guard.ts` — Mutation blocker when license expired
- `apps/api/src/modules/license/guards/license-api-key.guard.ts` — SHA-256 API key validation
- `apps/api/src/modules/license/license.controller.ts` — 8 REST endpoints with correct auth per type
- `apps/api/src/modules/license/license.module.ts` — Module with providers, controllers, exports

### Modified (6)
- `apps/api/src/app.module.ts` — Added LicenseModule import and registration
- `apps/api/src/modules/camera/camera.service.ts` — License limit check in create()
- `apps/api/src/modules/camera/camera.controller.ts` — @UseGuards(LicenseExpiryGuard) on @Post()
- `apps/api/src/modules/door/door.service.ts` — LicenseService injection + validateCanCreateDoor()
- `apps/api/package.json` — Added jsonwebtoken + @types/jsonwebtoken
- `pnpm-lock.yaml` — Updated for new dependencies

## Decisions Made

- **Used `findFirst` in LicenseApiKeyGuard** — The `keyHash` field is `@unique`, but we need to also filter by `isActive: true`. `findFirst` with a compound `where` clause handles this correctly, while `findUnique` only supports the unique constraint fields.
- **Grace period auto-upgrade** — When `getLicenseStatus()` detects an ACTIVE license past its expiry date but within the grace window, it auto-updates the DB status to GRACE. This prevents stale state if status wasn't updated at expiry time (Pitfall 6 mitigation).
- **Trial auto-initialization** — Orgs created before the licensing system existed get a 7-day trial automatically on the first `getLicenseStatus()` call, preventing a "no_license" state for existing customers.
- **Expired after grace** — The state machine only returns `expired` after checking that the license is past both expiry date AND grace period. During grace, all mutations are still allowed per D-09.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed cleanly. No pre-existing issues affected this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- API LicenseModule complete: signing key management, RS256 JWT generation/verification, license state machine, enforcement guards, device limit hooks
- Ready for **Plan 05-03** (Dashboard license management UI — connecting the frontend to these API endpoints)
- Note: LicenseApiKey model requires a `keyHash @unique` constraint (already in schema.prisma from Plan 1). The `findFirst` pattern used in the guard accounts for this correctly.

---

*Phase: 05-monetization*
*Completed: 2026-07-15*
