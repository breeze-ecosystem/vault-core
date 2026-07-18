---
phase: 01-architecture-license-foundation
plan: 03
type: execute
wave: 2
depends_on: [01-PLN-02-vaultapp-setup]
files_modified:
  - /home/devuser/projects/vault-app/src/lib/auth.ts
  - /home/devuser/projects/vault-app/src/lib/license.ts
  - /home/devuser/projects/vault-app/src/middleware.ts
  - /home/devuser/projects/vault-app/app/api/admin/auth/login/route.ts
  - /home/devuser/projects/vault-app/app/api/admin/auth/me/route.ts
  - /home/devuser/projects/vault-app/app/api/admin/organizations/route.ts
  - /home/devuser/projects/vault-app/app/api/admin/organizations/[id]/route.ts
  - /home/devuser/projects/vault-app/app/api/admin/licenses/generate/route.ts
  - /home/devuser/projects/vault-app/app/api/admin/licenses/route.ts
  - /home/devuser/projects/vault-app/app/api/verify/route.ts
autonomous: true
requirements: [ADM-01, ADM-02, ADM-03]
user_setup: []

must_haves:
  truths:
    - "VaultOS team can log in to vault-app admin with email + password"
    - "VaultOS team can create, view, search, and list organizations"
    - "VaultOS team can generate VISION and BASTION license keys (RSA-signed JWTs)"
    - "vault-os can call GET /api/verify?organizationId=xxx to verify a license"
    - "Admin API routes are protected by JWT middleware"
  artifacts:
    - path: "/home/devuser/projects/vault-app/app/api/admin/auth/login/route.ts"
      provides: "Admin login endpoint POST /api/admin/auth/login"
      exports: ["POST"]
    - path: "/home/devuser/projects/vault-app/app/api/admin/licenses/generate/route.ts"
      provides: "License key generation POST /api/admin/licenses/generate — RS256 signs JWT"
      exports: ["POST"]
    - path: "/home/devuser/projects/vault-app/app/api/verify/route.ts"
      provides: "Verification endpoint GET /api/verify — called by vault-os 24h cron"
      exports: ["GET"]
  key_links:
    - from: "vault-os LicenseVerificationService (planned in PLN-06)"
      to: "vault-app /api/verify"
      via: "24h cron HTTP GET with ?organizationId= query param"
      pattern: "VAULT_APP_URL/api/verify?organizationId="
      contract: "GET /api/verify?organizationId={uuid} → 200 { valid: boolean, pack?: string, expiresAt?: string } | 400 { error: string }. No auth required. The consumer (LicenseVerificationService) is built in Phase 1 Plan 06."
    - from: "admin licenses/generate/route.ts"
      to: "src/lib/license.ts"
      via: "generateLicenseJwt()"
      pattern: "generateLicenseJwt"
---

<objective>
**vault-app backend API** — Create admin auth system (email+password), organization CRUD API, license key generation (RSA-signed JWT), and license verification endpoint for vault-os cron. All API routes are protected by JWT middleware.

**Purpose:** Build on the Prisma foundation from Plan 02 to deliver the complete API layer: admin auth with JWT, org management, RSA-signed license generation, and the verification endpoint consumed by vault-os cron.

**Output:** vault-app auth lib, JWT middleware, 7 API routes, license signing lib.
</objective>

<execution_context>
@/home/devuser/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/devuser/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

# vault-app project (separate repo)
/home/devuser/projects/vault-app/package.json
/home/devuser/projects/vault-app/prisma/schema.prisma
/home/devuser/projects/vault-app/src/lib/prisma.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Admin auth system — auth lib, middleware, login/me routes</name>
  <files>
    /home/devuser/projects/vault-app/src/lib/auth.ts
    /home/devuser/projects/vault-app/src/middleware.ts
    /home/devuser/projects/vault-app/app/api/admin/auth/login/route.ts
    /home/devuser/projects/vault-app/app/api/admin/auth/me/route.ts
  </files>
  <read_first>
    /home/devuser/projects/vault-app/prisma/schema.prisma
    /home/devuser/projects/vault-app/src/lib/prisma.ts
  </read_first>
  <acceptance_criteria>
    1. Auth lib has hashPassword (bcrypt.hash, cost factor 12), comparePassword, signAdminToken (HS256, 8h expiry), verifyAdminToken
    2. Middleware applies to /api/admin/* routes, skips /api/admin/auth/login
    3. Login POST /api/admin/auth/login returns JWT on valid credentials
    4. Me GET /api/admin/auth/me returns admin info from token
    5. Seed admin user on first run using ADMIN_EMAIL, ADMIN_PASSWORD from env
  </acceptance_criteria>
  <action>
    **Step 1 — Create `src/lib/auth.ts`:**
    Helper functions:
    - `hashPassword(password: string): Promise<string>` — bcrypt.hash(password, 12) per D-06 bcrypt cost factor 10+
    - `comparePassword(password: string, hash: string): Promise<boolean>` — bcrypt.compare
    - `signAdminToken(admin: { id: string; email: string; role: string }): string` — jwt.sign with `process.env.ADMIN_JWT_SECRET`, HS256, 8h expiry
    - `verifyAdminToken(token: string): { id: string; email: string; role: string } | null` — jwt.verify with process.env.ADMIN_JWT_SECRET

    **Step 2 — Create `src/middleware.ts`** (Next.js middleware):
    - Apply to `/api/admin/*` route matcher
    - Skip `/api/admin/auth/login` (public)
    - Extract Bearer token from Authorization header
    - Verify with verifyAdminToken, attach admin info to request headers
    - Return 401 JSON `{ error: "Non authentifié" }` on failure

    **Step 3 — Create API route `app/api/admin/auth/login/route.ts`:**
    - POST handler accepting `{ email, password }` validated with zod
    - Look up AdminUser by email in Prisma
    - Compare password with bcryptjs.compare
    - On success: return `{ token }` with signAdminToken
    - On failure: return 401 `{ error: "Identifiants incorrects" }`

    **Step 4 — Create API route `app/api/admin/auth/me/route.ts`:**
    - GET handler returning current admin info from token (id, email, firstName, lastName, role)

    **Step 5 — Seed admin user:**
    Create a seed script or add to next.config.mjs env-based seeding. Read ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, ADMIN_LAST_NAME from env. On first Prisma generation, insert the admin user if not exists.
  </action>
  <verify>
    <automated>
      cd /home/devuser/projects/vault-app && npx next build 2>&1 | tail -10
    </automated>
  </verify>
  <done>
    Auth lib exports hashPassword/comparePassword/signAdminToken/verifyAdminToken. Middleware protects /api/admin/*. Login returns JWT. Me returns admin info. Build succeeds.
  </done>
</task>

<task type="auto">
  <name>Task 2: Organization CRUD + License generation APIs + verify endpoint</name>
  <files>
    /home/devuser/projects/vault-app/app/api/admin/organizations/route.ts
    /home/devuser/projects/vault-app/app/api/admin/organizations/[id]/route.ts
    /home/devuser/projects/vault-app/app/api/admin/licenses/generate/route.ts
    /home/devuser/projects/vault-app/app/api/admin/licenses/route.ts
    /home/devuser/projects/vault-app/src/lib/license.ts
    /home/devuser/projects/vault-app/app/api/verify/route.ts
  </files>
  <read_first>
    /home/devuser/projects/vault-app/prisma/schema.prisma
    /home/devuser/projects/vault-app/src/lib/auth.ts
  </read_first>
  <acceptance_criteria>
    1. GET /api/admin/organizations returns paginated org list with search
    2. POST /api/admin/organizations creates a new organization
    3. GET /api/admin/organizations/:id returns org with license history
    4. POST /api/admin/licenses/generate accepts {organizationId, pack, modules, maxCameras, maxUsers, expiresAt} and returns RSA-signed JWT
    5. GET /api/admin/licenses returns all license keys with org info
    6. License JWT is signed with RS256 using private key from LICENSE_PRIVATE_KEY env var
    7. GET /api/verify?organizationId=xxx returns 200 { valid: true/false, ... } or 400
  </acceptance_criteria>
  <action>
    **Step 1 — Create `src/lib/license.ts`:**
    Functions for RSA license JWT signing:
    - `loadPrivateKey(): crypto.KeyObject` — loads private key PEM from `process.env.LICENSE_PRIVATE_KEY` (base64-decoded if base64-encoded, or raw PEM). Cache in module-level variable.
    - `generateLicenseJwt(claims: LicenseJwtClaims): string` — signs with RS256, algorithm: "RS256", issuer: "vaultos-admin"

    Define `LicenseJwtClaims` interface (per D-15):
    ```typescript
    interface LicenseJwtClaims {
      organizationId: string;
      pack: "VISION" | "BASTION";
      modules: string[];
      issuedAt: number;
      expiresAt: number;
      maxCameras: number;
      maxUsers: number;
      gracePeriodDays: number;
      licenseVersion: number;
    }
    ```

    **Step 2 — Create `/api/admin/organizations/route.ts`:**
    - GET: List orgs with `?search=` (filter by name/email), `?page=` and `?limit=` for pagination. Returns `{ data: Organization[], total, page, limit }`.
    - POST: Create org with `{ name, email, notes? }`. Validated with zod. Returns created org with 201.

    **Step 3 — Create `/api/admin/organizations/[id]/route.ts`:**
    - GET: Return org with `licenses` included (ordered by createdAt desc), plus `licenseCount`.
    - DELETE: Set `isActive: false` (soft delete). Return `{ success: true }`.

    **Step 4 — Create `/api/admin/licenses/generate/route.ts`** (per D-15, D-03):
    - POST handler accepting:
      ```typescript
      {
        organizationId: string;
        pack: "VISION" | "BASTION";
        modules?: string[];
        maxCameras: number;
        maxUsers: number;
        expiresAt: string;
      }
      ```
    - Validate with zod: pack enum, modules optional array of strings, expiresAt datetime
    - Auto-set: `gracePeriodDays: 7`, `licenseVersion: 1`
    - Call `generateLicenseJwt()` with constructed claims
    - Store `LicenseKey` record in Prisma with the JWT
    - Return `{ licenseJwt, pack, modules, maxCameras, maxUsers, expiresAt }`

    **Step 5 — Create `/api/admin/licenses/route.ts`:**
    - GET: List all license keys with organization name. Optional `?organizationId=` filter. Returns `{ data: LicenseKey[] }` (never expose the JWT in list views — only on generation).

    **Step 6 — Create `app/api/verify/route.ts`** — public endpoint called by vault-os 24h cron (per D-12):
    - GET handler with `organizationId` query parameter
    - Look up the organization in Prisma, find the most recent ACTIVE LicenseKey
    - Check if the license has a valid (non-expired) JWT:
      - Decode the JWT to check `exp` claim (no signature verification needed — vault-os does that)
      - If a valid, non-expired license exists: return `{ valid: true, pack, modules, expiresAt, maxCameras, maxUsers }`
      - If no license or expired: return `{ valid: false }`
    - Return 400 if `organizationId` is missing
    - Wrap in try/catch — never throw unhandled exceptions
    - Response time should be under 500ms

    Add env var check: `process.env.LICENSE_PRIVATE_KEY` must be set. If missing, return 500 with "License signing key not configured" error.

    **GET /api/verify?organizationId= contract (consumed by vault-os PLN-06):**
    - Request: `GET /api/verify?organizationId={uuid}`
    - Response 200: `{ valid: true, pack: "VISION"|"BASTION", modules: string[], expiresAt: string, maxCameras: number, maxUsers: number }`
    - Response 200 (no license): `{ valid: false }`
    - Response 400 (missing param): `{ error: "organizationId is required" }`
    - No authentication required (server-to-server)
  </action>
  <verify>
    <automated>
      cd /home/devuser/projects/vault-app && npx next build 2>&1 | tail -10
    </automated>
  </verify>
  <done>
    Org CRUD, license generation API, and verification endpoint are functional. POST /api/admin/licenses/generate returns an RSA-signed JWT. GET /api/verify returns valid/invalid license status. Build succeeds without errors.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| vault-app admin API → browser | Admin portal JWT session |
| vault-app verify API → vault-os | Server-to-server public endpoint |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-03 | Spoofing | POST /api/admin/auth/login | mitigate | bcryptjs compare with cost factor 12; rate limiting recommended but not required for v1.0 |
| T-01-04 | Elevation of Privilege | /api/admin/* routes | mitigate | Next.js middleware verifies JWT on every request; returns 401 if invalid/missing |
| T-01-05 | Information Disclosure | Private key in .env | mitigate | LICENSE_PRIVATE_KEY stored in .env only, never in codebase, never committed. .env in .gitignore |
| T-01-06 | Spoofing | GET /api/verify (public) | accept | Public by design — called by vault-os server-to-server. Response is non-sensitive (valid/invalid + pack info only). |
| T-01-SC | Tampering | No new package installs | mitigate | No packages installed in this plan (deps installed in PLN-02) |
</threat_model>

<verification>
1. vault-app builds successfully: `cd /home/devuser/projects/vault-app && npx next build`
2. API routes compile and respond correctly
3. GET /api/verify returns valid license status for known orgs, valid:false for unknown/expired, 400 for missing param
</verification>

<success_criteria>
- vault-app has working admin auth (email + password → JWT)
- vault-app has organization CRUD
- vault-app can generate RSA-signed license JWTs
- vault-app serves verification endpoint for vault-os 24h ping
- Admin API routes are JWT-protected via middleware
</success_criteria>

<output>
Create `.planning/phases/01-architecture-license-foundation/01-PLN-03-vaultapp-api-SUMMARY.md` when done
</output>
