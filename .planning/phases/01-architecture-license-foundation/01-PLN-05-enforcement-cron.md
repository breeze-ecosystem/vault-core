---
phase: 01-architecture-license-foundation
plan: 05
type: execute
wave: 3
depends_on: [01-PLN-03-license-cleanup]
files_modified:
  - apps/api/src/modules/license/guards/license-expiry.guard.ts
  - apps/api/src/modules/license/license-verification.service.ts
  - apps/api/src/modules/license/license.module.ts
  - apps/api/src/modules/license/license.service.ts
  - apps/api/src/common/decorators/degraded-block.decorator.ts
  - apps/api/src/modules/license/license.types.ts
autonomous: true
requirements: [LIC-02, LIC-03]
user_setup: []

must_haves:
  truths:
    - "LicenseExpiryGuard handles 3 states: active/trial (allow), degraded (block mutations), expired (block everything)"
    - "@DegradedBlock() decorator marks endpoints as blocked in degraded mode"
    - "LicenseVerificationService pings vault-app every 24h via @Cron"
    - "Failed verification updates lastVerificationFailedAt on Organization"
    - "License state 'degraded' is set when lastVerificationFailedAt > 72 hours ago"
    - "License state 'expired' blocks all mutations and stops recording"
  artifacts:
    - path: "apps/api/src/modules/license/guards/license-expiry.guard.ts"
      provides: "3-state guard (active/trial, degraded, expired)"
      min_lines: 80
    - path: "apps/api/src/modules/license/license-verification.service.ts"
      provides: "24h cron job pinging vault-app"
      contains: "CronExpression"
    - path: "apps/api/src/common/decorators/degraded-block.decorator.ts"
      provides: "@DegradedBlock() decorator for mutation endpoints"
      exports: ["DegradedBlock", "DEGRADED_BLOCK_KEY"]
  key_links:
    - from: "LicenseVerificationService"
      to: "vault-app /api/verify"
      via: "@nestjs/axios HTTP GET"
      pattern: "VAULT_APP_URL"
    - from: "LicenseExpiryGuard"
      to: "LicenseService.getLicenseStatus()"
      via: "license state check"
      pattern: "getLicenseStatus"
---

<objective>
**License enforcement + 24h ping cron** — Extend LicenseExpiryGuard to handle 3 modes (active/trial, degraded, expired), create @DegradedBlock() decorator for mutation endpoints, and build the LicenseVerificationService that pings vault-app every 24 hours.

**Purpose:** Enforce mode dégradé (72h offline = block mutations) and expired (read-only + no new AI alerts). The 24h ping is the heartbeat that determines whether the system enters degraded mode.

**Output:** Extended guard, new decorator, cron-based verification service, @nestjs/axios installation.
</objective>

<execution_context>
@/home/devuser/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/devuser/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md

# License module files
apps/api/src/modules/license/guards/license-expiry.guard.ts
apps/api/src/modules/license/license.service.ts
apps/api/src/modules/license/license.module.ts
apps/api/src/modules/license/license.types.ts

# Vault-os app module (guard chain)
apps/api/src/app.module.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install @nestjs/axios + create LicenseVerificationService (24h cron)</name>
  <files>
    apps/api/src/modules/license/license-verification.service.ts
    apps/api/src/modules/license/license.module.ts
    apps/api/src/modules/license/license.service.ts
  </files>
  <read_first>
    apps/api/src/modules/license/license.module.ts
    apps/api/src/modules/license/license.service.ts
    apps/api/src/modules/prisma/prisma.service.ts
  </read_first>
  <acceptance_criteria>
    1. @nestjs/axios installed: `pnpm --filter=@vaultos/api add @nestjs/axios`
    2. LicenseVerificationService exists with @Cron(CronExpression.EVERY_12_HOURS) method
    3. Cron iterates over all active orgs, pings VAULT_APP_URL/api/verify?organizationId=xxx
    4. On success: updates Organization.lastVerifiedAt
    5. On failure: updates Organization.lastVerificationFailedAt
    6. Cron never throws — catches all errors and logs warnings
    7. LicenseVerificationService is provided in LicenseModule
    8. getLicenseStatus() now checks lastVerifiedAt/lastVerificationFailedAt — if >72h since last success, returns state "degraded"
  </acceptance_criteria>
  <action>
    **Step 1 — Install @nestjs/axios:**
    ```
    cd /home/devuser/projects/vault-os && pnpm --filter=@vaultos/api add @nestjs/axios
    ```

    **Step 2 — Create LicenseVerificationService (license-verification.service.ts):**
    - Import: `Injectable, Logger` from @nestjs/common; `Cron, CronExpression` from @nestjs/schedule; `HttpService` from @nestjs/axios; `ConfigService` from @nestjs/config; `PrismaService` from prisma module; `firstValueFrom` from rxjs
    - Constructor DI: `HttpService`, `PrismaService`, `ConfigService`
    - Method `@Cron(CronExpression.EVERY_12_HOURS)` named `pingVaultApp()`:
      - Get `VAULT_APP_URL` from ConfigService
      - If not configured, log warning and skip
      - Find all active orgs that have a license (not just trial)
      - For each org: HTTP GET `${vaultAppUrl}/api/verify?organizationId=${org.id}` with 10s timeout
      - On success (response.data.valid === true): update org with `lastVerifiedAt: new Date()`, `lastVerificationFailedAt: null`
      - On failure (network error, timeout, or valid=false): update org with `lastVerificationFailedAt: new Date()`
      - Wrap each org check in try/catch — never throw

    **Step 3 — Update LicenseService.getLicenseStatus():**
    - After determining the license state from the active license record, also check the degraded condition:
    - If license is active but `org.lastVerificationFailedAt` exists and is more than 72 hours old:
      - If `org.lastVerifiedAt` is null OR `org.lastVerifiedAt < org.lastVerificationFailedAt`:
        - Return licenseState: "degraded" instead of "active"
    - If no lastVerificationFailedAt or it's within 72h, continue as "active"/"trial"/"grace"
    - The degraded check is: `org.lastVerificationFailedAt` exists AND `Date.now() - org.lastVerificationFailedAt > 72 * 60 * 60 * 1000`

    **Step 4 — Update LicenseModule:**
    - Add `HttpModule` (from @nestjs/axios) to module imports:
      ```typescript
      import { HttpModule } from "@nestjs/axios";
      ```
    - Add `LicenseVerificationService` to providers array
    - Export `LicenseVerificationService` if needed by other modules

    After changes, build:
    ```
    cd /home/devuser/projects/vault-os/apps/api && npx nest build
    ```
  </action>
  <verify>
    <automated>
      cd /home/devuser/projects/vault-os/apps/api && npx nest build 2>&1 | tail -10
    </automated>
  </verify>
  <done>
    @nestjs/axios installed. LicenseVerificationService created with 12h cron. getLicenseStatus() returns "degraded" state when lastVerificationFailedAt >72h. Build succeeds.
  </done>
</task>

<task type="auto">
  <name>Task 2: Extend LicenseExpiryGuard for degraded + expired + create @DegradedBlock()</name>
  <files>
    apps/api/src/modules/license/guards/license-expiry.guard.ts
    apps/api/src/common/decorators/degraded-block.decorator.ts
    apps/api/src/app.module.ts
  </files>
  <read_first>
    apps/api/src/modules/license/guards/license-expiry.guard.ts
    apps/api/src/app.module.ts
  </read_first>
  <acceptance_criteria>
    1. LicenseExpiryGuard checks 3 states: active/trial (allow), degraded (block only @DegradedBlock() endpoints), expired (block all)
    2. @DegradedBlock() decorator stores DEGRADED_BLOCK_KEY metadata
    3. Degraded mode returns 403 with "Mode dégradé — Activation internet requise pour modifier la configuration."
    4. Expired mode returns 403 with "Licence expirée — Fonctionnalités en lecture seule."
    5. LicenseExpiryGuard is registered as a global APP_GUARD in AppModule (after FeatureGateGuard)
    6. Existing test endpoints can verify the guard behavior
  </acceptance_criteria>
  <action>
    **Create @DegradedBlock() decorator (degraded-block.decorator.ts):**
    ```typescript
    import { SetMetadata } from "@nestjs/common";
    export const DEGRADED_BLOCK_KEY = "degradedBlock";
    export const DegradedBlock = () => SetMetadata(DEGRADED_BLOCK_KEY, true);
    ```

    **Extend LicenseExpiryGuard (license-expiry.guard.ts):**
    Rewrite `canActivate()` to handle all 3 states per the decision matrix from RESEARCH:

    ```typescript
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const orgId = request.user?.orgId;
      if (!orgId) return true;  // Let auth guards handle missing auth

      const status = await this.licenseService.getLicenseStatus(orgId);

      // EXPIRED: everything blocked
      if (status.licenseState === "expired") {
        throw new ForbiddenException(
          "Licence expirée — Fonctionnalités en lecture seule. Contactez votre administrateur."
        );
      }

      // DEGRADED: block only @DegradedBlock() endpoints
      if (status.licenseState === "degraded") {
        const isBlocked = this.reflector.get<boolean>(
          DEGRADED_BLOCK_KEY,
          context.getHandler(),
        );
        if (isBlocked) {
          throw new ForbiddenException(
            "Mode dégradé — Activation internet requise pour modifier la configuration. La vidéo et l'enregistrement continuent de fonctionner."
          );
        }
      }

      // ACTIVE / TRIAL / GRACE: allow everything
      return true;
    }
    ```

    Add imports: `DEGRADED_BLOCK_KEY` from the new decorator file.

    **Register as APP_GUARD in AppModule (app.module.ts):**
    Add LicenseExpiryGuard as a global APP_GUARD. It must run AFTER FeatureGateGuard in the guard chain (per RESEARCH Pitfall 5):
    ```typescript
    import { LicenseExpiryGuard } from './modules/license/guards/license-expiry.guard';
    // In providers array, after FeatureGateGuard:
    { provide: APP_GUARD, useClass: LicenseExpiryGuard },
    ```

    Add `LicenseModule` import to AppModule (already imported — verify at line 42). The LicenseExpiryGuard is provided by LicenseModule, which must be imported for DI to work.

    After changes:
    ```
    cd /home/devuser/projects/vault-os/apps/api && npx nest build
    ```
  </action>
  <verify>
    <automated>
      cd /home/devuser/projects/vault-os/apps/api && npx nest build 2>&1 | tail -10
    </automated>
  </verify>
  <done>
    LicenseExpiryGuard handles 3 states. @DegradedBlock() decorator exists. Guard registered as APP_GUARD after FeatureGateGuard. Build succeeds.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| vault-os → vault-app (cron ping) | Server-to-server HTTP call over internet |
| LicenseExpiryGuard → controller | Guard blocks mutations based on license state |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-10 | Tampering | License JWT forgery | mitigate | RSA-2048 + RS256 verification in verifyAndActivate(); reject non-RS256 algorithms |
| T-01-11 | Spoofing | License replay attack | mitigate | JWT contains organizationId — vault-os verifies org match on activation |
| T-01-12 | Denial of Service | vault-app verify endpoint unreachable | mitigate | Cron catches all errors, never throws; sets lastVerificationFailedAt instead of crashing |
| T-01-13 | Elevation of Privilege | Expired license still allows mutations | mitigate | LicenseExpiryGuard is global APP_GUARD — runs on every request |
| T-01-SC | Tampering | @nestjs/axios install | mitigate | Official NestJS package, 4M+ weekly downloads — [ASSUMED] |
</threat_model>

<verification>
1. `cd apps/api && npx nest build` succeeds
2. Verify guard chain order in app.module.ts: JwtAuth → TenantIsolation → Roles → FeatureGate → LicenseExpiry
3. Verify `DEGRADED_BLOCK_KEY` is imported correctly in LicenseExpiryGuard
</verification>

<success_criteria>
- LicenseExpiryGuard enforces expired (block all) and degraded (block @DegradedBlock() endpoints)
- @DegradedBlock() decorator available for mutation endpoints (cameras, zones, users, AI settings)
- LicenseVerificationService runs every 12 hours pinging vault-app
- Degraded state activates after 72h of failed verification
- NestJS build passes
</success_criteria>

<output>
Create `.planning/phases/01-architecture-license-foundation/01-PLN-05-enforcement-cron-SUMMARY.md` when done
</output>
