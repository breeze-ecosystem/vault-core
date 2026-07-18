---
phase: 01-architecture-license-foundation
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - /home/devuser/projects/vault-app/prisma/schema.prisma
  - /home/devuser/projects/vault-app/src/lib/prisma.ts
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
    - path: "/home/devuser/projects/vault-app/prisma/schema.prisma"
      provides: "Admin DB schema (admin_user, organization, license_key models)"
      contains: "model admin_user"
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
    - from: "vault-os LicenseVerificationService"
      to: "vault-app /api/verify"
      via: "24h cron HTTP GET"
      pattern: "VAULT_APP_URL/api/verify"
---

<objective>
**vault-app backend foundation** — Install dependencies, set up SQLite via Prisma, create admin auth system (email+password), organization CRUD API, license key generation (RSA-signed JWT), and license verification endpoint for vault-os cron.

**Purpose:** vault-app has NO database, NO auth, NO admin capabilities. This plan builds the entire server-side foundation for the vault-app admin portal and the verification API consumed by vault-os.

**Output:** vault-app Prisma schema + lib files + 7 API routes + admin JWT middleware.
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
/home/devuser/projects/vault-app/app/
/home/devuser/projects/vault-app/src/
</context>

<tasks>

<task type="auto">
  <name>Task 1: vault-app Prisma setup + admin auth system</name>
  <files>
    /home/devuser/projects/vault-app/prisma/schema.prisma
    /home/devuser/projects/vault-app/src/lib/prisma.ts
    /home/devuser/projects/vault-app/src/lib/auth.ts
    /home/devuser/projects/vault-app/src/middleware.ts
    /home/devuser/projects/vault-app/app/api/admin/auth/login/route.ts
    /home/devuser/projects/vault-app/app/api/admin/auth/me/route.ts
  </files>
  <read_first>
    /home/devuser/projects/vault-app/package.json
    /home/devuser/projects/vault-app/app/[locale]/layout.tsx
  </read_first>
  <acceptance_criteria>
    1. Dependencies installed: prisma, @prisma/client, bcryptjs, jsonwebtoken, zod and dev deps @types/bcryptjs, @types/jsonwebtoken
    2. Prisma schema exists with admin_user, organization, license_key models (SQLite provider)
    3. Prisma client generated successfully
    4. Admin login POST /api/admin/auth/login returns JWT on valid credentials
    5. Admin auth middleware protects all /api/admin/* routes
    6. Admin user seeded with email from env ADMIN_EMAIL + ADMIN_PASSWORD
  </acceptance_criteria>
  <action>
    **Step 1 — Install dependencies:**
    ```
    cd /home/devuser/projects/vault-app && pnpm add prisma @prisma/client bcryptjs jsonwebtoken zod
    cd /home/devuser/projects/vault-app && pnpm add -D @types/bcryptjs @types/jsonwebtoken
    npx prisma init --datasource-provider sqlite
    ```

    **Step 2 — Create `prisma/schema.prisma`** with SQLite provider and three models:

    ```prisma
    generator client {
      provider = "prisma-client-js"
    }
    datasource db {
      provider = "sqlite"
      url      = env("DATABASE_URL")
    }
    model AdminUser {
      id           String   @id @default(uuid())
      email        String   @unique
      passwordHash String
      firstName    String
      lastName     String
      role         String   @default("admin")
      isActive     Boolean  @default(true)
      createdAt    DateTime @default(now())
      updatedAt    DateTime @updatedAt
    }
    model Organization {
      id             String   @id @default(uuid())
      name           String
      email          String
      notes          String?
      isActive       Boolean  @default(true)
      createdAt      DateTime @default(now())
      updatedAt      DateTime @updatedAt
      licenses       LicenseKey[]
    }
    model LicenseKey {
      id            String   @id @default(uuid())
      organizationId String
      pack          String   // "VISION" | "BASTION"
      modules       String   @default("[]") // JSON array of module keys
      maxCameras    Int
      maxUsers      Int
      licenseJwt    String   // The RSA-signed JWT
      status        String   @default("ACTIVE") // ACTIVE, REVOKED
      expiresAt     DateTime
      createdAt     DateTime @default(now())
      organization  Organization @relation(fields: [organizationId], references: [id])
    }
    ```

    **Step 3 — Create `src/lib/prisma.ts`**:
    Singleton Prisma client for Next.js: `import { PrismaClient } from '@prisma/client'` with global caching for dev hot-reload.

    **Step 4 — Create `src/lib/auth.ts`**:
    Helper functions:
    - `hashPassword(password: string): Promise<string>` — bcrypt.hash(password, 12) per D-06 bcrypt cost factor 10+
    - `comparePassword(password: string, hash: string): Promise<boolean>` — bcrypt.compare
    - `signAdminToken(admin: { id: string; email: string; role: string }): string` — jwt.sign with `process.env.ADMIN_JWT_SECRET`, HS256, 8h expiry
    - `verifyAdminToken(token: string): { id: string; email: string; role: string } | null` — jwt.verify with process.env.ADMIN_JWT_SECRET

    **Step 5 — Create `src/middleware.ts`** (Next.js middleware):
    - Apply to `/api/admin/*` route matcher
    - Skip `/api/admin/auth/login` (public)
    - Extract Bearer token from Authorization header
    - Verify with verifyAdminToken, attach admin info to request headers
    - Return 401 JSON `{ error: "Non authentifié" }` on failure

    **Step 6 — Create API route `app/api/admin/auth/login/route.ts`**:
    - POST handler accepting `{ email, password }` validated with zod
    - Look up AdminUser by email in Prisma
    - Compare password with bcryptjs.compare
    - On success: return `{ token }` with signAdminToken
    - On failure: return 401 `{ error: "Identifiants incorrects" }`

    **Step 7 — Create API route `app/api/admin/auth/me/route.ts`**:
    - GET handler returning current admin info from token (id, email, firstName, lastName, role)

    **Step 8 — Seed admin user**:
    Create a seed script or add to next.config.mjs env-based seeding. Read ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, ADMIN_LAST_NAME from env (use defaults from root .env.example). On first Prisma generation, insert the admin user if not exists.

    **Step 9 — Generate Prisma client and push:**
    ```
    cd /home/devuser/projects/vault-app && export DATABASE_URL="file:./dev.db" && npx prisma db push
    ```

    **Env vars needed (add to vault-app .env):**
    - `DATABASE_URL=file:./dev.db` (SQLite)
    - `ADMIN_JWT_SECRET=<random-256-bit-hex>`
    - `ADMIN_EMAIL=admin@vaultos.com`
    - `ADMIN_PASSWORD=<initial-password>`
    - `ADMIN_FIRST_NAME=Admin`
    - `ADMIN_LAST_NAME=VaultOS`
    - `LICENSE_PRIVATE_KEY=<base64-or-pem>`

  </action>
  <verify>
    <automated>
      cd /home/devuser/projects/vault-app && npx ts-node --compiler-options '{"module":"commonjs"}' -e "
        const { PrismaClient } = require('@prisma/client');
        const p = new PrismaClient();
        p.adminUser.findMany().then(r => { console.log('DB works:', r.length, 'admins'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
      " 2>&1 | head -5
    </automated>
  </verify>
  <done>
    Dependencies installed, Prisma schema created with SQLite, admin auth API works (POST /api/admin/auth/login returns JWT), middleware protects admin routes
  </done>
</task>

<task type="auto">
  <name>Task 2: Organization CRUD + License generation APIs</name>
  <files>
    /home/devuser/projects/vault-app/app/api/admin/organizations/route.ts
    /home/devuser/projects/vault-app/app/api/admin/organizations/[id]/route.ts
    /home/devuser/projects/vault-app/app/api/admin/licenses/generate/route.ts
    /home/devuser/projects/vault-app/app/api/admin/licenses/route.ts
    /home/devuser/projects/vault-app/src/lib/license.ts
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
  </acceptance_criteria>
  <action>
    **Step 1 — Create `src/lib/license.ts`**:
    Functions for RSA license JWT signing:
    - `loadPrivateKey(): crypto.KeyObject` — loads private key PEM from `process.env.LICENSE_PRIVATE_KEY` (base64-decoded if base64-encoded, or raw PEM). Cache in module-level variable.
    - `generateLicenseJwt(claims: LicenseJwtClaims): string` — signs with RS256, algorithm: "RS256", issuer: "vaultos-admin"

    Define `LicenseJwtClaims` interface (per D-15):
    ```typescript
    interface LicenseJwtClaims {
      organizationId: string;
      pack: "VISION" | "BASTION";
      modules: string[];
      issuedAt: number;      // epoch seconds
      expiresAt: number;     // epoch seconds
      maxCameras: number;
      maxUsers: number;
      gracePeriodDays: number;
      licenseVersion: number;
    }
    ```

    **Step 2 — Create `/api/admin/organizations/route.ts`**:
    - GET: List orgs with `?search=` (filter by name/email), `?page=` and `?limit=` for pagination. Returns `{ data: Organization[], total, page, limit }`.
    - POST: Create org with `{ name, email, notes? }`. Validated with zod. Returns created org with 201.

    **Step 3 — Create `/api/admin/organizations/[id]/route.ts`**:
    - GET: Return org with `licenses` included (ordered by createdAt desc), plus `licenseCount`.
    - DELETE: Set `isActive: false` (soft delete). Return `{ success: true }`.

    **Step 4 — Create `/api/admin/licenses/generate/route.ts`** (per D-15, D-03):
    - POST handler accepting:
      ```typescript
      {
        organizationId: string;  // UUID
        pack: "VISION" | "BASTION";
        modules?: string[];      // BASTION optional modules
        maxCameras: number;      // VISION max 10
        maxUsers: number;
        expiresAt: string;       // ISO date
      }
      ```
    - Validate with zod: pack enum, modules optional array of strings, expiresAt datetime
    - Auto-set: `gracePeriodDays: 7`, `licenseVersion: 1`
    - Call `generateLicenseJwt()` with constructed claims
    - Store `LicenseKey` record in Prisma with the JWT
    - Return `{ licenseJwt, pack, modules, maxCameras, maxUsers, expiresAt }`

    **Step 5 — Create `/api/admin/licenses/route.ts`**:
    - GET: List all license keys with organization name. Optional `?organizationId=` filter. Returns `{ data: LicenseKey[] }` (never expose the JWT in list views — only on generation).

    Add env var check: `process.env.LICENSE_PRIVATE_KEY` must be set. If missing, return 500 with "License signing key not configured" error.
  </action>
  <verify>
    <automated>cd /home/devuser/projects/vault-app && npx next build 2>&1 | tail -10</automated>
  </verify>
  <done>
    Org CRUD and license generation API routes are functional. POST /api/admin/licenses/generate returns an RSA-signed JWT. Build succeeds without errors.
  </done>
</task>

<task type="auto">
  <name>Task 3: Verification API endpoint for vault-os 24h cron</name>
  <files>
    /home/devuser/projects/vault-app/app/api/verify/route.ts
  </files>
  <read_first>
    /home/devuser/projects/vault-app/prisma/schema.prisma
  </read_first>
  <acceptance_criteria>
    1. GET /api/verify?organizationId=xxx returns 200 { valid: true, pack: "VISION", expiresAt: "..." }
    2. GET /api/verify?organizationId=xxx for unknown/expired org returns 200 { valid: false }
    3. No auth required (called by vault-os server-to-server)
    4. Handles missing organizationId param gracefully with 400
  </acceptance_criteria>
  <action>
    Create `app/api/verify/route.ts` — public endpoint called by vault-os 24h cron (per D-12):

    - GET handler with `organizationId` query parameter
    - Look up the organization in Prisma, find the most recent ACTIVE LicenseKey
    - Check if the license has a valid (non-expired) JWT:
      - Decode the JWT to check `exp` claim (no signature verification needed — vault-os does that)
      - If a valid, non-expired license exists: return `{ valid: true, pack, modules, expiresAt, maxCameras, maxUsers }`
      - If no license or expired: return `{ valid: false }`
    - Return 400 if `organizationId` is missing
    - Wrap in try/catch — never throw unhandled exceptions (vault-os must never crash from a failed verification call)
    - Response time should be under 500ms (simple DB query)
  </action>
  <verify>
    <automated>
      # Start vault-app in background, test verify endpoint
      cd /home/devuser/projects/vault-app && timeout 10 bash -c '
        DATABASE_URL="file:./dev.db" ADMIN_JWT_SECRET="test" LICENSE_PRIVATE_KEY="test" npx next start --port 3201 &
        sleep 5
        curl -s http://localhost:3201/api/verify?organizationId=nonexistent | grep -q "valid.*false"
      ' 2>&1 | head -5
    </automated>
  </verify>
  <done>
    GET /api/verify returns valid license status for known orgs, valid:false for unknown/expired, 400 for missing param. No auth required. Server error never throws.
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
| T-01-02 | Spoofing | POST /api/admin/auth/login | mitigate | bcryptjs compare with cost factor 12; rate limiting recommended but not required for v1.0 |
| T-01-03 | Elevation of Privilege | /api/admin/* routes | mitigate | Next.js middleware verifies JWT on every request; returns 401 if invalid/missing |
| T-01-04 | Information Disclosure | Private key in .env | mitigate | LICENSE_PRIVATE_KEY stored in .env only, never in codebase, never committed. .env in .gitignore |
| T-01-05 | Spoofing | GET /api/verify (public) | accept | Public by design — called by vault-os server-to-server. Response is non-sensitive (valid/invalid + pack info only). |
| T-01-SC | Tampering | pnpm install (new packages) | mitigate | All packages (prisma, bcryptjs, jsonwebtoken, zod) are well-known with 10M+ weekly downloads — [ASSUMED] |
</threat_model>

<verification>
1. vault-app builds successfully: `cd /home/devuser/projects/vault-app && npx next build`
2. Prisma client generates: `cd /home/devuser/projects/vault-app && npx prisma generate`
3. API routes compile and respond correctly
</verification>

<success_criteria>
- vault-app has working admin auth (email + password → JWT)
- vault-app has organization CRUD
- vault-app can generate RSA-signed license JWTs
- vault-app serves verification endpoint for vault-os 24h ping
- Admin API routes are JWT-protected via middleware
- .env has ADMIN_JWT_SECRET, LICENSE_PRIVATE_KEY, DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
</success_criteria>

<output>
Create `.planning/phases/01-architecture-license-foundation/01-PLN-02-vaultapp-backend-SUMMARY.md` when done
</output>
