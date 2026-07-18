---
phase: 01-architecture-license-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/api/prisma/schema.prisma
  - packages/shared/src/types/license.types.ts
  - packages/shared/src/constants/license.constants.ts
  - packages/shared/src/schemas/license.schema.ts
  - packages/shared/src/index.ts
autonomous: true
requirements: [LIC-01, LIC-04, LIC-05, LIC-06]
user_setup: []

must_haves:
  truths:
    - "Prisma schema has no planTier field on Organization"
    - "FeatureFlag has pack field instead of tier field, plus optional moduleKey"
    - "LicenseClaims type includes pack, modules[], maxUsers"
    - "LicenseState union includes 'degraded'"
    - "generateLicenseSchema is removed from shared package exports"
    - "Organization model has lastVerifiedAt and lastVerificationFailedAt fields"
    - "License model has maxUsers field"
    - "LicenseApiKey model is removed from schema"
  artifacts:
    - path: "apps/api/prisma/schema.prisma"
      provides: "Updated Prisma schema with VISION/BASTION pack model"
      min_lines: 800
    - path: "packages/shared/src/types/license.types.ts"
      provides: "Updated LicenseClaims with pack, modules, maxUsers — LicenseState with degraded"
      contains: "pack?:"
    - path: "packages/shared/src/index.ts"
      provides: "No generateLicenseSchema export"
      exports: []
  key_links:
    - from: "packages/shared/src/types/license.types.ts"
      to: "apps/api/src/modules/license/license.types.ts"
      via: "LicenseClaims, LicenseState type import"
      pattern: "LicenseClaims"
---

<objective>
**Schema & shared package refactoring** — Update the Prisma schema and shared TypeScript types to replace the FREE/PROFESSIONAL/ENTERPRISE tier model with VISION/BASTION pack + optional modules model.

**Purpose:** Foundation for all Phase 1 work — schema changes must ship before any code changes in vault-os. The shared package changes ensure type consistency across all consumers (API, dashboard, mobile).

**Output:** Updated `schema.prisma`, updated shared types/constants/schemas, removed `LicenseApiKey` model.
</objective>

<execution_context>
@/home/devuser/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/devuser/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

# Prisma schema to modify
apps/api/prisma/schema.prisma

# Shared package to update
packages/shared/src/types/license.types.ts
packages/shared/src/constants/license.constants.ts
packages/shared/src/schemas/license.schema.ts
packages/shared/src/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Prisma schema migration — pack/module model + cleanup</name>
  <files>apps/api/prisma/schema.prisma</files>
  <read_first>apps/api/prisma/schema.prisma</read_first>
  <acceptance_criteria>
    1. Organization.planTier field is removed
    2. Organization has lastVerifiedAt (DateTime?) and lastVerificationFailedAt (DateTime?)
    3. FeatureFlag.tier is renamed to pack (String?) — values "VISION" or "BASTION"
    4. FeatureFlag has new moduleKey field (String?) for optional BASTION modules
    5. License model has maxUsers (Int) field added
    6. LicenseApiKey model is removed entirely (all references cleaned up)
    7. Prisma db push succeeds: `cd apps/api && npx prisma db push --accept-data-loss`
  </acceptance_criteria>
  <action>
    Modify prisma/schema.prisma:

    1. **Organization model** (per D-17): Remove `planTier String?` field (line 413). Add two new DateTime? fields: `lastVerifiedAt` and `lastVerificationFailedAt` — used by the 24h ping cron in Plan 5.

    2. **FeatureFlag model** (per D-04): Rename `tier String?` field to `pack String?`. Add new `moduleKey String?` field for optional BASTION module identification.

    3. **License model**: Add `maxUsers Int @default(5)` field after `maxDoors`. Keep all existing fields.

    4. **LicenseApiKey model** (per D-18): Remove the entire model block (lines 761-778) and its relation references:

       - From Organization model: Remove `apiKeys LicenseApiKey[]` relation line
       - From User model: Remove `licenseApiKeys LicenseApiKey[]` relation line
       - Remove the LicenseApiKey model block entirely

    5. **Replace generating_clocks:** None — `generator client` and `datasource db` are already correct.

    After all changes, run:
    ```
    cd apps/api && npx prisma db push --accept-data-loss
    ```
  </action>
  <verify>
    <automated>cd /home/devuser/projects/vault-os/apps/api && npx prisma db push --accept-data-loss 2>&1 | tail -5</automated>
  </verify>
  <done>
    Prisma schema has: no planTier, FeatureFlag with pack+moduleKey, License with maxUsers, Organization with lastVerifiedAt/lastVerificationFailedAt, no LicenseApiKey model. `prisma db push` exits with "Your database is now in sync with your schema."
  </done>
</task>

<task type="auto">
  <name>Task 2: Shared package — License types, constants, and schemas</name>
  <files>
    packages/shared/src/types/license.types.ts
    packages/shared/src/constants/license.constants.ts
    packages/shared/src/schemas/license.schema.ts
    packages/shared/src/index.ts
  </files>
  <read_first>
    packages/shared/src/types/license.types.ts
    packages/shared/src/constants/license.constants.ts
    packages/shared/src/schemas/license.schema.ts
    packages/shared/src/index.ts
  </read_first>
  <acceptance_criteria>
    1. LicenseClaims interface has pack (string), modules (string[]), maxUsers (number)
    2. LicenseState union includes "degraded"
    3. LicenseStatusDto includes pack and degraded fields
    4. generateLicenseSchema is removed from exports (no longer needed in vault-os)
    5. Shared index.ts no longer exports generateLicenseSchema or CreateApiKeyInput
    6. Type check passes: `cd /home/devuser/projects/vault-os && pnpm --filter=@repo/shared check-types`
  </acceptance_criteria>
  <action>
    Make the following changes to the shared package:

    **license.types.ts** (per D-03, D-15):
    - Add to `LicenseClaims`: `pack: "VISION" | "BASTION"`, `modules: string[]`, `maxUsers: number`
    - Remove `currency?: string` (no longer needed — generation is vault-app's responsibility)
    - Update `LicenseState` union: add `"degraded"` → `"trial" | "active" | "grace" | "degraded" | "expired" | "no_license"`
    - Update `LicenseStatusDto`: add `pack?: string`, `modules?: string[]`, `maxUsers?: number`

    **license.constants.ts**: No changes needed — constants remain valid.

    **license.schema.ts** (per D-18):
    - Remove `generateLicenseSchema` and `GenerateLicenseInput` type export
    - Remove `CURRENCY_OPTIONS` export
    - Keep `activateLicenseSchema`, `ActivateLicenseInput` unchanged
    - Keep `createApiKeySchema` and `CreateApiKeyInput` (will be removed in Plan 3 cleanup)

    **index.ts** (per D-18, D-19):
    - Remove `generateLicenseSchema` from import in line 356
    - Remove `CURRENCY_OPTIONS` from export line
    - Remove `GenerateLicenseInput` and `CreateApiKeyInput` types from exports
    - Remove `CreateApiKeyInput` from export

    After changes, verify types:
    ```
    cd /home/devuser/projects/vault-os && pnpm --filter=@repo/shared check-types
    cd /home/devuser/projects/vault-os && pnpm --filter=@vaultos/api check-types
    ```
  </action>
  <verify>
    <automated>
      cd /home/devuser/projects/vault-os && pnpm --filter=@repo/shared check-types 2>&1 | tail -5
    </automated>
  </verify>
  <done>
    LicenseClaims has pack, modules[], maxUsers. LicenseState includes "degraded". generateLicenseSchema and CURRENCY_OPTIONS removed from exports. Type check passes.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| shared package → API | Type definitions consumed by vault-os API runtime |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering | Schema.prisma removal of LicenseApiKey | mitigate | Remove model + all relation refs in single atomic change; `prisma db push` will cascade-clean the DB table |
| T-01-SC | Tampering | pnpm install packages | mitigate | All packages already installed; no new package installs in this plan |
</threat_model>

<verification>
1. `cd apps/api && npx prisma db push --accept-data-loss` succeeds
2. `pnpm --filter=@repo/shared check-types` passes
3. `pnpm --filter=@vaultos/api check-types` passes
4. Generate endpoints still compile (removed at schema level only — Plan 3 removes controller code)
</verification>

<success_criteria>
- Prisma schema reflects the new VISION/BASTION pack model
- Shared package exports new types, no longer exports old tier types
- Type checks pass for both shared and API packages
- Database schema is pushed and in sync
</success_criteria>

<output>
Create `.planning/phases/01-architecture-license-foundation/01-PLN-01-schema-shared-SUMMARY.md` when done
</output>
