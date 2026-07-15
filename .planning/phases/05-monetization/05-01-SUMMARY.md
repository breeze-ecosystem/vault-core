---
phase: 05-monetization
plan: 01
subsystem: api
tags: [prisma, license, jwt, docker, env, shared-package, zod, typescript, nestjs]

requires:
  - phase: 04-commercial-foundation
    provides: Organization model with multi-tenant structure
provides:
  - Prisma License model with D-06 claim fields and LicenseApiKey model
  - Shared package schemas (generate, activate, create-api-key), constants, types via @repo/shared
  - Infrastructure config: env var validation, Docker volume mount, RSA public key placeholder
affects:
  - 05-02 (LicenseModule API — serivce, controller, processor)
  - 05-03 (License dashboard UI)

tech-stack:
  added: []
  patterns:
    - LicenseStatus enum following existing enum pattern (Role, NotificationStatus)
    - French-language Zod error messages for schemas
    - Placeholder RSA public key constant for offline JWT verification
    - Docker read-only volume mount for sensitive key files

key-files:
  created:
    - packages/shared/src/schemas/license.schema.ts
    - packages/shared/src/constants/license.constants.ts
    - packages/shared/src/types/license.types.ts
    - apps/api/src/modules/license/license-public-key.ts
  modified:
    - apps/api/prisma/schema.prisma
    - packages/shared/src/index.ts
    - apps/api/src/config/validation.ts
    - apps/api/src/config/configuration.ts
    - .env.example
    - docker-compose.prod.yml

key-decisions:
  - "LicenseApiKey includes organizationId field with Organization relation (added via deviation — Prisma requires the opposite side of relations)"
  - "License PUBLIC key PEM stored as TypeScript constant (safe to commit — it's a public key)"
  - "Private key file mounted read-only in Docker (:ro) per threat model T-05-02"
  - "Grace period defaults to 7 days, max 90 days enforced in Zod schema"

requirements-completed:
  - LIC-01
  - LIC-02

duration: 2min
completed: 2026-07-15
---

# Phase 05 Plan 01: License Foundation Layer Summary

**Prisma License models with D-06 claim fields, shared package schemas/constants/types for license operations, env var validation, Docker volume mount, and RSA public key placeholder**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-15T22:11:48Z
- **Completed:** 2026-07-15T22:14:07Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- **Prisma schema extended** with `LicenseStatus` enum, `License` model (D-06 claim fields, organizationId relation, unique constraint on `[organizationId, licenseVersion]`), `LicenseApiKey` model (keyHash @unique, prefix, createdBy relation), Organization trial date fields (`trialStartDate`, `trialEndDate`), and all necessary relation fields
- **Shared package created** with Zod schemas (`generateLicenseSchema`, `activateLicenseSchema`, `createApiKeySchema`) using French error messages per UI-SPEC contract, constants (`LICENSE_VERSION=1`, `LICENSE_STATUS`, `TRIAL_DURATION_DAYS=7`), and TypeScript types (`LicenseClaims` with 7 D-06 fields, `LicenseState` union, `LicenseStatusDto`)
- **Infrastructure configured** with Joi validation for `LICENSE_PRIVATE_KEY_PATH`, nested `license` config section in NestJS configuration, `.env.example` License section, placeholder RSA public key constant, and Docker Compose volume mount for the private key (read-only per T-05-02)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add License models to Prisma schema** - `b4a71e6` (feat)
2. **Task 2: Create shared package — Zod schemas, constants, types, and barrel exports** - `8c57acc` (feat)
3. **Task 3: Create infrastructure config — env vars, RSA public key, Docker volume** - `6a09788` (feat)
4. **Deviation fix: Add missing Organization relation on LicenseApiKey** - `37a0f0d` (fix)

**Plan metadata:** (appended in final commit)

## Files Created/Modified

- `apps/api/prisma/schema.prisma` — Added LicenseStatus enum, License model (with D-06 fields, organization relation, unique constraint), LicenseApiKey model (with keyHash, keyPrefix, organization/user relations), Organization.trialStartDate/trialEndDate, Organization licenses/apiKeys relations, User licenseApiKeys relation
- `packages/shared/src/schemas/license.schema.ts` — GenerateLicenseSchema (organizationId uuid, maxCameras/maxDoors int, expiresAt datetime, gracePeriodDays default 7 max 90, licenseVersion default 1), ActivateLicenseSchema, CreateApiKeySchema with French error messages
- `packages/shared/src/constants/license.constants.ts` — LICENSE_VERSION=1, LICENSE_STATUS const object, GRACE_PERIOD_DAYS_DEFAULT=7, TRIAL_DURATION_DAYS=7, LicenseStatus type
- `packages/shared/src/types/license.types.ts` — LicenseClaims interface (7 exact D-06 fields), LicenseState union, LicenseStatusDto interface
- `packages/shared/src/index.ts` — Barrel exports for all license schemas, constants, and types
- `apps/api/src/config/validation.ts` — Added LICENSE_PRIVATE_KEY_PATH Joi validation (optional, allow empty)
- `apps/api/src/config/configuration.ts` — Added license config section (privateKeyPath, version)
- `.env.example` — Added License section with LICENSE_PRIVATE_KEY_PATH and LICENSE_VERSION
- `apps/api/src/modules/license/license-public-key.ts` — LICENSE_PUBLIC_KEY_PEM placeholder constant
- `docker-compose.prod.yml` — Added volumes mount for license-private.pem (:ro), LICENSE_PRIVATE_KEY_PATH env var

## Decisions Made

- **LicenseApiKey has organizationId + Organization relation:** Added via deviation — the plan's model definition lacked the opposite side of the Organization→LicenseApiKey relation that Prisma requires. Without it, `prisma validate` fails with "missing opposite relation field on LicenseApiKey".
- **Public key in TypeScript constant:** Following the threat model (T-05-01), the public key is safe to commit as a source file. The private key NEVER enters the codebase — it's mounted at runtime via Docker volume.
- **Read-only volume mount:** Docker volume uses `:ro` per threat model T-05-02, preventing the container from modifying the key file.
- **Optional env var with graceful degradation:** LICENSE_PRIVATE_KEY_PATH is optional per T-05-03 — if unset, LicenseKeyManager will disable signing and log a warning instead of crashing on startup.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added missing Organization relation on LicenseApiKey**
- **Found during:** Task 1 (Prisma schema verification — `prisma validate`)
- **Issue:** The plan's LicenseApiKey model definition (and the initial implementation) lacked `organizationId` field and `Organization` relation. Prisma requires the opposite side of a 1:N relation — `Organization.apiKeys LicenseApiKey[]` needs `LicenseApiKey.organization Organization @relation(fields: [organizationId], references: [id])`. Without it, `prisma validate` fails with P1012.
- **Fix:** Added `organizationId String`, `organization Organization @relation(...)`, and `@@index([organizationId])` to LicenseApiKey model.
- **Files modified:** `apps/api/prisma/schema.prisma`
- **Verification:** `npx prisma validate` returns "valid 🚀", `npx prisma generate` succeeds
- **Committed in:** `37a0f0d` (fix commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential fix — Prisma validation fails without it, blocking all downstream plans that depend on the schema. No scope creep.

## Issues Encountered

None — all tasks executed cleanly. The Prisma validation caught the missing relation during the post-task verification step.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- License foundation layer complete: Prisma models, shared types/schemas/constants, env var config, Docker volume, public key constant
- Ready for **Plan 05-02**: LicenseModule API — service, controller, BullMQ processor, LicenseKeyManager with private key signing
- `npx prisma migrate dev --name add_licensing` should be run manually to create the migration (migration creation is deferred per plan instructions)

---

*Phase: 05-monetization*
*Completed: 2026-07-15*
