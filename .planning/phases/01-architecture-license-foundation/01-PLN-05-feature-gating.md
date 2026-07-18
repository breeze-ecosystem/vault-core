---
phase: 01-architecture-license-foundation
plan: 05
type: execute
wave: 3
depends_on: [01-PLN-01-schema-shared, 01-PLN-04-license-cleanup]
files_modified:
  - apps/api/src/modules/feature-gate/feature-gate.service.ts
  - apps/api/src/modules/feature-gate/feature-gate.module.ts
  - apps/api/src/common/guards/feature-gate.guard.ts
  - apps/api/src/common/decorators/feature-gate.decorator.ts
  - apps/api/src/modules/auth/auth.service.ts
  - apps/api/src/modules/license/license.controller.ts
  - apps/api/src/modules/license/license.service.ts
autonomous: true
requirements: [LIC-04, LIC-05, LIC-06]
user_setup: []

must_haves:
  truths:
    - "FeatureGateService seeds pack-based flags (VISION/BASTION) instead of tier-based"
    - "VISION features include all VISION features, maxCameras=10, maxUsers=3"
    - "BASTION features include all BASTION base features + optional module flags"
    - "seedDefaultFlags() is called during org creation in auth.service.ts"
    - "@RequiresPack() decorator exists and FeatureGateGuard supports pack checks"
    - "New orgs get automatic 7-day trial with VISION flags seeded"
    - "POST /api/licenses/trial endpoint exists and starts a 7-day VISION trial"
  artifacts:
    - path: "apps/api/src/modules/feature-gate/feature-gate.service.ts"
      provides: "Rewrite — seeds VISION/BASTION flags per org"
      contains: "PACK_FEATURES"
    - path: "apps/api/src/common/decorators/feature-gate.decorator.ts"
      provides: "@RequiresPack() decorator for VISION/BASTION enforcement"
      exports: ["RequiresPack", "PACK_KEY"]
    - path: "apps/api/src/modules/auth/auth.service.ts"
      provides: "Registration — calls seedDefaultFlags on org creation"
      calls: "featureGateService.seedDefaultFlags"
    - path: "apps/api/src/modules/license/license.controller.ts"
      provides: "Post('trial') endpoint for 7-day trial activation"
      exports: ["handle"]
  key_links:
    - from: "auth.service.ts"
      to: "feature-gate.service.ts"
      via: "seedDefaultFlags(orgId, pack)"
      pattern: "seedDefaultFlags"
    - from: "license.controller.ts"
      to: "license.service.ts"
      via: "startTrial() calls featureGateService.seedDefaultFlags"
      pattern: "startTrial"
---

<objective>
**Feature gating rewrite + trial endpoint** — Replace the old FREE/PROFESSIONAL/ENTERPRISE tier-based feature flag system with VISION/BASTION pack + optional module model. Wire default flag seeding into org creation flow. Add the trial license endpoint that starts a 7-day VISION trial.

**Purpose:** FeatureGateGuard must enforce which features are available based on an org's license pack. The trial endpoint allows new users to start a 7-day free trial with full VISION features.

**Output:** Rewritten FeatureGateService, extended FeatureGateGuard, new @RequiresPack() decorator, auth service wiring, trial endpoint on license controller+service.
</objective>

<execution_context>
@/home/devuser/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/devuser/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md

# Feature gate files
apps/api/src/modules/feature-gate/feature-gate.service.ts
apps/api/src/modules/feature-gate/feature-gate.module.ts
apps/api/src/common/guards/feature-gate.guard.ts
apps/api/src/common/decorators/feature-gate.decorator.ts

# Auth service — wire seeding
apps/api/src/modules/auth/auth.service.ts

# License controller/service — trial endpoint (cleaned in Plan 04, now adding trial)
apps/api/src/modules/license/license.controller.ts
apps/api/src/modules/license/license.service.ts

# Pricing spec for feature definitions
docs/PRICING-SPEC.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite FeatureGateService for pack+module model + wire into auth</name>
  <files>
    apps/api/src/modules/feature-gate/feature-gate.service.ts
    apps/api/src/modules/feature-gate/feature-gate.module.ts
    apps/api/src/modules/auth/auth.service.ts
  </files>
  <read_first>
    apps/api/src/modules/feature-gate/feature-gate.service.ts
    apps/api/src/modules/feature-gate/feature-gate.module.ts
    apps/api/src/modules/auth/auth.service.ts
    docs/PRICING-SPEC.md
  </read_first>
  <acceptance_criteria>
    1. FeatureGateService.seedDefaultFlags() accepts (organizationId, pack: "VISION" | "BASTION", moduleKeys?: string[])
    2. VISION pack seeds all VISION feature flags as enabled with maxCameras=10, maxUsers=3
    3. BASTION pack seeds all VISION + BASTION base features as enabled
    4. BASTION module flags are created with enabled=true but moduleKey field set — FeatureGateGuard checks both pack and moduleKey
    5. For trial (no pack specified), seed VISION flags by default (per D-10)
    6. auth.service.ts registration calls featureGateService.seedDefaultFlags(orgId, "VISION") after org creation
    7. auth service injects FeatureGateService via constructor DI
  </acceptance_criteria>
  <action>
    **FeatureGateService rewrite (feature-gate.service.ts)** — Replace `DEFAULT_FEATURES` tier array with pack-based seeding:

    Define feature packs using constants. Reference the PRICING-SPEC.md feature matrix for the complete list. Key structure:
    ```typescript
    const PACK_FEATURES: Record<string, Array<{ key: string; moduleKey?: string }>> = {
      VISION: [
        // All VISION features from PRICING-SPEC
        { key: "live_streaming" },
        { key: "motion_detection" },
        { key: "basic_facial_recognition" },
        { key: "local_storage" },
        { key: "event_timeline" },
        { key: "video_export" },
        { key: "multi_user" },
        // ... include remaining VISION features
      ],
      BASTION: [
        // VISION + BASTION base features
        { key: "advanced_facial_recognition" },
        { key: "anti_spoofing" },
        { key: "abandoned_object_detection" },
        { key: "weapon_detection" },
        { key: "crowd_counting" },
        { key: "behavioral_analysis" },
        { key: "access_control_integration" },
        { key: "biometric_integration" },
        { key: "qr_credential" },
        { key: "multi_site" },
        { key: "enterprise_sso" },
        // Module-gated features
        { key: "extra_cameras", moduleKey: "extra_cameras" },
        { key: "access_control", moduleKey: "access_control" },
        { key: "extra_sites", moduleKey: "extra_sites" },
        { key: "predictive_analytics", moduleKey: "predictive_analytics" },
        { key: "dpo_service", moduleKey: "dpo_service" },
        { key: "sla_premium", moduleKey: "sla_premium" },
        { key: "api_tierce", moduleKey: "api_tierce" },
      ],
    };
    ```

    Update `seedDefaultFlags()` signature:
    ```typescript
    async seedDefaultFlags(
      organizationId: string,
      pack: string = "VISION",
      moduleKeys: string[] = [],
    ): Promise<void>
    ```

    For each feature in the pack:
    - Create/upsert FeatureFlag with `organizationId`, `key`, `enabled: true`, `pack`, and `moduleKey` if it's a module-gated feature
    - For module-gated features (those with moduleKey), only enable if `moduleKeys` includes that key

    **FeatureGateModule:**
    - Add `FeatureGateService` to module `exports` (it already exports it — verify)
    - Check that `FeatureGateGuard` is not provided by this module (it's provided by AppModule as APP_GUARD)

    **Auth service wiring (auth.service.ts, per D-19):**
    - Import `FeatureGateService` from `../../feature-gate/feature-gate.service`
    - Add to constructor: `private featureGateService: FeatureGateService`
    - In `register()` method, after the $transaction completes, call:
      ```typescript
      await this.featureGateService.seedDefaultFlags(result.org.id, "VISION");
      ```
    - This is the **dead code fix** (D-19) — seedDefaultFlags() is never called anywhere

    After changes:
    ```
    cd /home/devuser/projects/vault-os && pnpm --filter=@vaultos/api check-types
    ```
  </action>
  <verify>
    <automated>
      cd /home/devuser/projects/vault-os/apps/api && npx nest build 2>&1 | tail -10
    </automated>
  </verify>
  <done>
    FeatureGateService seeds VISION/BASTION flags with pack+module. auth.service.ts calls seedDefaultFlags on registration. NestJS build succeeds.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update FeatureGateGuard + create @RequiresPack() decorator</name>
  <files>
    apps/api/src/common/guards/feature-gate.guard.ts
    apps/api/src/common/decorators/feature-gate.decorator.ts
  </files>
  <read_first>
    apps/api/src/common/guards/feature-gate.guard.ts
    apps/api/src/common/decorators/feature-gate.decorator.ts
    apps/api/src/modules/feature-gate/feature-gate.service.ts
  </read_first>
  <acceptance_criteria>
    1. @RequiresPack("VISION") decorator exists — blocks endpoints for BASTION-only features when org has VISION pack
    2. FeatureGateGuard reads pack from FeatureFlag table (not from JWT — per RESEARCH Pitfall 2)
    3. Guard returns "Cette fonctionnalité n'est pas incluse dans votre pack" for pack violations
    4. Guard returns "Module optionnel non activé" for moduleKey violations
    5. Existing @RequiresFeature() decorator still works unchanged
  </acceptance_criteria>
  <action>
    **New decorator (feature-gate.decorator.ts):**
    Add `@RequiresPack()` decorator alongside existing `@RequiresFeature()`:
    ```typescript
    export const PACK_KEY = "requiredPack";
    export const RequiresPack = (pack: "VISION" | "BASTION") => SetMetadata(PACK_KEY, pack);
    export const MODULE_KEY = "requiredModule";
    export const RequiresModule = (moduleKey: string) => SetMetadata(MODULE_KEY, moduleKey);
    ```

    **FeatureGateGuard update (feature-gate.guard.ts):**
    Extend `canActivate()` to check pack and module requirements:

    1. After checking `@RequiresFeature()` metadata, also check for `@RequiresPack()` metadata
    2. If pack is required:
       - Query the org's FeatureFlag to determine their pack
       - Method: check if any feature for this org has `pack` field set
       - If org's pack doesn't meet the required pack, throw ForbiddenException with: "Cette fonctionnalité n'est pas incluse dans votre pack"
    3. If `@RequiresModule()` is present:
       - Check if the specific module feature flag exists with matching moduleKey
       - If not enabled, throw: "Module optionnel non activé"
    4. Keep existing `@RequiresFeature()` logic unchanged

    The guard should read pack from the FeatureFlag table (per RESEARCH Pitfall 2), NOT from JWT claims. The pack info is written to the FeatureFlag table at activation/trial time.

    Approach for determining org's pack:
    - On first relevant request, look up any FeatureFlag with pack set for this org
    - Cache the result in Redis (same 5-min TTL pattern as existing feature cache)
    - The pack is set during seedDefaultFlags(), which is called at org creation

    After changes:
    ```
    cd /home/devuser/projects/vault-os && pnpm --filter=@vaultos/api check-types
    ```
  </action>
  <verify>
    <automated>
      cd /home/devuser/projects/vault-os/apps/api && npx nest build 2>&1 | tail -10
    </automated>
  </verify>
  <done>
    @RequiresPack() and @RequiresModule() decorators exist. FeatureGateGuard enforces pack and module checks. Existing @RequiresFeature() still works. Build succeeds.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add trial license endpoint to license controller/service</name>
  <files>
    apps/api/src/modules/license/license.controller.ts
    apps/api/src/modules/license/license.service.ts
  </files>
  <read_first>
    apps/api/src/modules/license/license.controller.ts
    apps/api/src/modules/license/license.service.ts
    apps/api/src/modules/feature-gate/feature-gate.service.ts
  </read_first>
  <acceptance_criteria>
    1. POST /api/licenses/trial exists and is JWT-protected
    2. startTrial(orgId) sets trialStartDate and trialEndDate on Organization
    3. startTrial calls featureGateService.seedDefaultFlags(orgId, "VISION")
    4. On success, returns { status: "trial", trialEndsAt: "ISO date" }
    5. If already has active license, returns 409 conflict
  </acceptance_criteria>
  <action>
    **Add to license.controller.ts:**
    Add a new `@Post("trial")` handler that calls licenseService.startTrial(orgId):
    ```typescript
    @Post("trial")
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async startTrial(@Req() req: FastifyRequest) {
      const orgId = (req as any).user.orgId;
      return this.licenseService.startTrial(orgId);
    }
    ```
    Import `JwtAuthGuard` if not already imported. Add `@ApiBearerAuth()` and `@ApiOperation({ summary: "Start 7-day trial" })` decorators.

    **Add to license.service.ts:**
    Add `startTrial(organizationId: string)` method:
    - Inject `FeatureGateService` via constructor DI (add `private featureGateService: FeatureGateService`)
    - Import `FeatureGateService` from `../../feature-gate/feature-gate.service`
    - In `startTrial`:
      - Check if org already has active license — if so, throw ConflictException ("Cette organisation a déjà une licence active")
      - Set `trialStartDate: new Date()` and `trialEndDate: addDays(new Date(), 7)` on Organization (use simple Date math, no library needed)
      - Call `await this.featureGateService.seedDefaultFlags(organizationId, "VISION")` to seed VISION feature flags
      - Return `{ status: "trial", trialEndsAt: trialEndDate.toISOString() }`

    After changes:
    ```
    cd /home/devuser/projects/vault-os && pnpm --filter=@vaultos/api check-types
    ```
  </action>
  <verify>
    <automated>
      cd /home/devuser/projects/vault-os/apps/api && npx nest build 2>&1 | tail -10
    </automated>
  </verify>
  <done>
    POST /api/licenses/trial creates 7-day trial, seeds VISION feature flags, returns { status: "trial", trialEndsAt }. Build succeeds.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| API controller → FeatureGateGuard | Guard checks metadata + FeatureFlag DB before allowing request |
| API controller → LicenseService.startTrial | Authenticated org admin starts trial |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-09 | Tampering | FeatureFlag DB records | mitigate | FeatureGateGuard reads from DB with Redis cache; only vault-os admin can modify (via API permissions). Pack assignment set at org creation only. |
| T-01-10 | Information Disclosure | Pack info leak | accept | Pack name is non-sensitive (VISION/BASTION) — same as plan tier was |
| T-01-11 | Tampering | Trial endpoint abuse | mitigate | POST /api/licenses/trial is JWT-protected; checks for existing active license before allowing trial |
| T-01-SC | Tampering | No new packages | mitigate | No packages installed in this plan |
</threat_model>

<verification>
1. `cd apps/api && npx nest build` succeeds
2. Verify seedDefaultFlags is called: grep for "seedDefaultFlags" in auth.service.ts shows call
3. Verify trial endpoint: grep for "startTrial" in license.controller.ts and license.service.ts
4. Verify old tier references gone: grep for "FREE\|PROFESSIONAL\|ENTERPRISE" in feature-gate files returns no matches
</verification>

<success_criteria>
- FeatureGateService seeds VISION/BASTION feature flags per pack + optional modules
- auth.service.ts calls seedDefaultFlags on org registration (dead code fix)
- @RequiresPack() decorator enforces pack requirements at the API layer
- FeatureGateGuard reads pack from FeatureFlag table (not JWT)
- POST /api/licenses/trial creates 7-day trial with VISION features seeded
- NestJS build passes
</success_criteria>

<output>
Create `.planning/phases/01-architecture-license-foundation/01-PLN-05-feature-gating-SUMMARY.md` when done
</output>
