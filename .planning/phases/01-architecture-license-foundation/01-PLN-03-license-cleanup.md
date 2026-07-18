---
phase: 01-architecture-license-foundation
plan: 03
type: execute
wave: 2
depends_on: [01-PLN-01-schema-shared]
files_modified:
  - apps/api/src/modules/license/license.controller.ts
  - apps/api/src/modules/license/license.service.ts
  - apps/api/src/modules/license/license.module.ts
  - apps/api/src/modules/license/license-key-manager.ts
  - apps/api/src/modules/license/license.types.ts
  - apps/api/src/modules/license/guards/license-api-key.guard.ts
  - apps/api/src/modules/license/dto/
autonomous: true
requirements: [LIC-01, LIC-05]
user_setup: []

must_haves:
  truths:
    - "vault-os no longer has POST /api/licenses/generate endpoint"
    - "vault-os no longer has LicenseApiKeyGuard"
    - "LicenseKeyManager no longer loads private key"
    - "LicenseService.generateLicense() is removed"
    - "license.types.ts includes 'degraded' state and new type fields"
    - "License module no longer exports LicenseApiKeyGuard"
  artifacts:
    - path: "apps/api/src/modules/license/license.controller.ts"
      provides: "License controller — generate and API key endpoints removed"
      min_lines: 40
    - path: "apps/api/src/modules/license/license.service.ts"
      provides: "License service — generate, createApiKey, revokeApiKey, listAllApiKeys removed"
      min_lines: 150
    - path: "apps/api/src/modules/license/license-key-manager.ts"
      provides: "Key manager — private key loading removed, only getPublicKey remains"
      min_lines: 15
  key_links:
    - from: "license.controller.ts"
      to: "license.service.ts"
      via: "verifyAndActivate, getLicenseStatus, getUsage"
      pattern: "this.licenseService"
---

<objective>
**vault-os license module cleanup** — Remove license generation (POST /api/licenses/generate), API key management endpoints, LicenseApiKeyGuard, and private key loading from LicenseKeyManager. The generation responsibility moves entirely to vault-app (per D-18, D-15).

**Purpose:** Vault-os should never generate licenses or hold the private key. This plan deletes the old code paths and updates the module wiring.

**Output:** Cleaned license controller, service, module, key manager, types, and removed guard.
</objective>

<execution_context>
@/home/devuser/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/devuser/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md

# License module files to modify
apps/api/src/modules/license/license.controller.ts
apps/api/src/modules/license/license.service.ts
apps/api/src/modules/license/license.module.ts
apps/api/src/modules/license/license-key-manager.ts
apps/api/src/modules/license/license.types.ts
apps/api/src/modules/license/guards/license-api-key.guard.ts
apps/api/src/modules/license/dto/

# Shared schemas already updated in Plan 1
packages/shared/src/schemas/license.schema.ts
packages/shared/src/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove generate + API key endpoints from controller and schemas</name>
  <files>
    apps/api/src/modules/license/license.controller.ts
    apps/api/src/modules/license/guards/license-api-key.guard.ts
    packages/shared/src/schemas/license.schema.ts
    packages/shared/src/index.ts
  </files>
  <read_first>
    apps/api/src/modules/license/license.controller.ts
    apps/api/src/modules/license/guards/license-api-key.guard.ts
    packages/shared/src/schemas/license.schema.ts
  </read_first>
  <acceptance_criteria>
    1. license.controller.ts has no @Post("generate") endpoint and no api-keys/* endpoints
    2. license-api-key.guard.ts file is deleted
    3. generateLicenseSchema removed from shared schema file entirely
    4. createApiKeySchema removed from shared schema file
    5. Shared index.ts no longer exports generateLicenseSchema, createApiKeySchema, CreateApiKeyInput
    6. ApiKey-related endpoints (POST/GET/DELETE api-keys) removed from controller
  </acceptance_criteria>
  <action>
    **Controller changes (license.controller.ts):**
    - Remove `@Post("generate")` handler method (lines 36-44)
    - Remove `LicenseApiKeyGuard` import (line 19)
    - Remove `generateLicenseSchema` import (line 21)
    - Remove entire `@Post("api-keys")`, `@Get("api-keys")`, `@Delete("api-keys/:id")` handlers (lines 110-150)
    - Remove `createApiKeySchema` import (was on line 23)
    - Remove `@ApiOperation`, `@ApiBearerAuth`, and `@Roles` decorators for removed endpoints
    - Keep: `@Post("activate")`, `@Get("status")`, `@Get()`, `@Get("usage")` handlers unchanged

    **Delete guard file:**
    - Delete `apps/api/src/modules/license/guards/license-api-key.guard.ts`

    **Shared schema cleanup (license.schema.ts):**
    - Remove `createApiKeySchema` and `CreateApiKeyInput` type export
    - generateLicenseSchema was already removed in Plan 1 — verify it's gone
    - Keep `activateLicenseSchema` and `ActivateLicenseInput` unchanged

    **Shared index.ts:**
    - Verify generateLicenseSchema, CURRENCY_OPTIONS, createApiKeySchema, CreateApiKeyInput are all removed from exports (Plan 1 handled some of these)
    - Remove `createApiKeySchema` from import line 356 if still present
    - Remove `CreateApiKeyInput` type export if still present

    After all changes, run type check:
    ```
    cd /home/devuser/projects/vault-os && pnpm --filter=@vaultos/api check-types
    ```
  </action>
  <verify>
    <automated>
      cd /home/devuser/projects/vault-os && pnpm --filter=@vaultos/api check-types 2>&1 | tail -5
    </automated>
  </verify>
  <done>
    Controller has no generate or api-keys endpoints. license-api-key.guard.ts deleted. Shared schema has no generateLicenseSchema or createApiKeySchema. Type check passes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Remove generation logic from service + key manager + module</name>
  <files>
    apps/api/src/modules/license/license.service.ts
    apps/api/src/modules/license/license-key-manager.ts
    apps/api/src/modules/license/license.module.ts
    apps/api/src/modules/license/license.types.ts
  </files>
  <read_first>
    apps/api/src/modules/license/license.service.ts
    apps/api/src/modules/license/license-key-manager.ts
    apps/api/src/modules/license/license.types.ts
    apps/api/src/modules/license/license.module.ts
  </read_first>
  <acceptance_criteria>
    1. LicenseService.generateLicense() method is removed
    2. LicenseService.normalizeCurrency() method is removed
    3. LicenseService.createApiKey(), revokeApiKey(), listAllApiKeys() methods are removed
    4. LicenseKeyManager has no private key loading (onModuleInit, getPrivateKey removed)
    5. LicenseKeyManager only exports getPublicKey()
    6. LicenseModule does not provide LicenseApiKeyGuard
    7. LicenseModule no longer exports LicenseExpiryGuard (not needed for other modules — will be consumed via APP_GUARD in Plan 5)
    8. license.types.ts has new LicenseStatusResponse with pack, modules, maxUsers, and "degraded" state
  </acceptance_criteria>
  <action>
    **Service changes (license.service.ts):**
    - Remove entire `generateLicense()` method (lines 31-77) and `normalizeCurrency()` helper (lines 84-93)
    - Remove `createApiKey()` method (lines 308-324)
    - Remove `revokeApiKey()` method (lines 329-336)
    - Remove `listAllApiKeys()` method (lines 287-302)
    - Remove unused imports: `LicenseClaims` (if no longer referenced directly), `CURRENCY_OPTIONS`, `v4 as uuidv4`, `* as crypto`
    - Keep: `verifyAndActivate()`, `getLicenseStatus()`, `getUsage()`, `listLicenses()` — these are the core activation and verification functions
    - Keep `getLicenseStatus()` method — update it to use the new shared types (LicenseClaims with pack/modules). Add logic to extract `pack` and `modules` from the active license's JWT or from the FeatureFlag table.
    - Keep the LicenseClaims import — still needed for JWT verification in verifyAndActivate

    **Key Manager changes (license-key-manager.ts, per D-15):**
    - Remove `OnModuleInit` interface implementation
    - Remove `privateKey` field
    - Remove `onModuleInit()` method (lines 14-28)
    - Remove `getPrivateKey()` method (lines 30-35)
    - Remove `ConfigService` import (no longer needed)
    - Keep only `getPublicKey()` which returns `crypto.createPublicKey(LICENSE_PUBLIC_KEY_PEM)`
    - Remove constructor parameter (no more config injection)
    - Optionally rename class to `LicensePublicKeyManager` or keep name

    **Module changes (license.module.ts, per D-18):**
    - Remove `LicenseApiKeyGuard` from providers array
    - Remove `LicenseApiKeyGuard` import
    - Remove `LicenseExpiryGuard` from exports (will be consumed via the guard chain in Plan 5)
    - Keep `LicenseExpiryGuard` in providers (still instantiated by NestJS for DI)

    **Types changes (license.types.ts):**
    - Import new `LicenseClaims` from shared (with pack, modules, maxUsers)
    - Add `"degraded"` to licenseState union in LicenseStatusResponse
    - Add `pack?: string`, `modules?: string[]`, `maxUsers?: number` fields to LicenseStatusResponse
    - Keep existing structure otherwise — update getLicenseStatus return type to include pack/modules extracted from active license JWT or FeatureFlag

    After all changes, build:
    ```
    cd /home/devuser/projects/vault-os && pnpm --filter=@vaultos/api build
    ```
  </action>
  <verify>
    <automated>
      cd /home/devuser/projects/vault-os/apps/api && npx nest build 2>&1 | tail -10
    </automated>
  </verify>
  <done>
    Service has no generate/api-key methods. Key manager has no private key loading. Module no longer references LicenseApiKeyGuard. Types include degraded state + pack/modules. NestJS build succeeds.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| vault-os license controller → client | Removed endpoints are deleted — no trust boundary change |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-06 | Elevation of Privilege | Removed generate endpoint | mitigate | Endpoint is deleted entirely; no API surface for generating licenses in vault-os |
| T-01-07 | Information Disclosure | Private key path env var | mitigate | LICENSE_PRIVATE_KEY_PATH env var is no longer read by LicenseKeyManager; remove from vault-os env config |
| T-01-SC | Tampering | No new package installs | mitigate | No packages installed in this plan |
</threat_model>

<verification>
1. `cd apps/api && npx nest build` succeeds
2. `cd /home/devuser/projects/vault-os && pnpm --filter=@vaultos/api check-types` passes
3. grep for `generateLicense` in vault-os source returns no results (outside SUMMARY.md)
4. grep for `LicenseApiKeyGuard` in vault-os source returns no results
</verification>

<success_criteria>
- vauult-os API no longer generates licenses or holds private key
- All API key management endpoints removed from vault-os
- LicenseKeyManager only loads public key
- License module cleaned and builds successfully
- Type definitions include new pack/module model and degraded state
</success_criteria>

<output>
Create `.planning/phases/01-architecture-license-foundation/01-PLN-03-license-cleanup-SUMMARY.md` when done
</output>
