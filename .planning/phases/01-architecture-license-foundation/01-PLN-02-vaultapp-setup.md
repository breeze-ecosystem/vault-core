---
phase: 01-architecture-license-foundation
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - /home/devuser/projects/vault-app/prisma/schema.prisma
  - /home/devuser/projects/vault-app/src/lib/prisma.ts
autonomous: true
requirements: [ADM-01, ADM-02, ADM-03]
user_setup: []

must_haves:
  truths:
    - "vault-app has SQLite database configured via Prisma"
    - "Prisma schema has AdminUser, Organization, LicenseKey models"
    - "Prisma client generated successfully"
    - "Dependencies installed: prisma, @prisma/client, bcryptjs, jsonwebtoken, zod"
  artifacts:
    - path: "/home/devuser/projects/vault-app/prisma/schema.prisma"
      provides: "Admin DB schema (admin_user, organization, license_key models)"
      contains: "model AdminUser"
    - path: "/home/devuser/projects/vault-app/src/lib/prisma.ts"
      provides: "Prisma Client singleton for Next.js"
      min_lines: 15
  key_links:
    - from: "vault-app prisma/schema.prisma"
      to: "vault-app src/lib/prisma.ts"
      via: "@prisma/client import"
      pattern: "PrismaClient"
---

<objective>
**vault-app Prisma & infrastructure setup** — Install dependencies, create Prisma schema with SQLite for admin_user, organization, license_key models, and initialize the Prisma client. This is the database foundation for all vault-app API routes.

**Purpose:** vault-app has NO database, NO Prisma setup. This plan bootstraps the entire persistence layer that the admin auth, org CRUD, and license generation APIs will use in the next plan.

**Output:** vault-app Prisma schema, lib/prisma.ts singleton, installed dependencies, and environment configuration.
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
  <name>Task 1: Install deps + create Prisma schema + client singleton</name>
  <files>
    /home/devuser/projects/vault-app/prisma/schema.prisma
    /home/devuser/projects/vault-app/src/lib/prisma.ts
  </files>
  <read_first>
    /home/devuser/projects/vault-app/package.json
    /home/devuser/projects/vault-app/app/[locale]/layout.tsx
  </read_first>
  <acceptance_criteria>
    1. Dependencies installed: prisma, @prisma/client, bcryptjs, jsonwebtoken, zod and dev deps @types/bcryptjs, @types/jsonwebtoken
    2. Prisma schema exists with admin_user, organization, license_key models (SQLite provider)
    3. Prisma client generated successfully
    4. Prisma client singleton created at src/lib/prisma.ts
    5. .env has DATABASE_URL=file:./dev.db and required env vars
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

    **Step 3 — Create `src/lib/prisma.ts`:**
    Singleton Prisma client for Next.js — import PrismaClient from @prisma/client with global caching for dev hot-reload:
    ```typescript
    import { PrismaClient } from "@prisma/client";

    const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

    export const prisma = globalForPrisma.prisma ?? new PrismaClient();

    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

    export default prisma;
    ```

    **Step 4 — Generate Prisma client and push:**
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
    Dependencies installed, Prisma schema created with SQLite, Prisma client singleton generated. `prisma db push` succeeds.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| vault-app Prisma client → SQLite DB | Local file database, admin-only access |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-02 | Tampering | pnpm install (new packages) | mitigate | All packages (prisma, bcryptjs, jsonwebtoken, zod) are well-known with 10M+ weekly downloads — [ASSUMED] |
| T-01-SC | Tampering | SQLite database file | accept | vault-app is admin-only tool; SQLite file is local to vault-app container |
</threat_model>

<verification>
1. vault-app Prisma client generates: `cd /home/devuser/projects/vault-app && npx prisma generate`
2. Database pushes: `cd /home/devuser/projects/vault-app && npx prisma db push`
3. Test DB connection with ts-node
</verification>

<success_criteria>
- vault-app has SQLite database with AdminUser, Organization, LicenseKey models
- Prisma client singleton exported from src/lib/prisma.ts
- pnpm dependencies installed
- .env has DATABASE_URL, ADMIN_JWT_SECRET, LICENSE_PRIVATE_KEY placeholders
</success_criteria>

<output>
Create `.planning/phases/01-architecture-license-foundation/01-PLN-02-vaultapp-setup-SUMMARY.md` when done
</output>
