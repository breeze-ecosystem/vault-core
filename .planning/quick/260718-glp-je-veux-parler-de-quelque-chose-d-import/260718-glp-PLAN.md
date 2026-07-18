---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # Task 1: vault-app extraction (new files)
  - /projects/vault-app/package.json
  - /projects/vault-app/pnpm-workspace.yaml
  - /projects/vault-app/apps/marketing/package.json
  - /projects/vault-app/apps/marketing/tsconfig.json
  - /projects/vault-app/apps/marketing/next.config.mjs
  - /projects/vault-app/packages/design/package.json
  - /projects/vault-app/packages/typescript-config/package.json
  # Task 2: repo rename
  - /home/devuser/projects/vault-os/Caddyfile
  - /home/devuser/projects/vault-os/docker-compose.yml
  # Task 3: dashboard admin cleanup
  - /home/devuser/projects/vault-os/apps/dashboard/lib/nav-config.ts
  - /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/licences/page.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/licences/activation/page.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/api-keys/page.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/webhooks/page.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/audit/page.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/conformite/page.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/ia/page.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/gouvernance/page.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/parametres/page.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/app/invite/[token]/page.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/components/api-key-create-dialog.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/components/api-key-list.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/components/api-keys/
  - /home/devuser/projects/vault-os/apps/dashboard/components/webhooks/
  - /home/devuser/projects/vault-os/apps/dashboard/components/compliance/
  - /home/devuser/projects/vault-os/apps/dashboard/components/license-activation-form.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/components/license-empty-state.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/components/license-expiry-countdown.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/components/license-status-badge.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/components/license-usage-bars.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/components/credential-lifecycle-form.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/components/credential-status-badge.tsx
  - /home/devuser/projects/vault-os/apps/dashboard/components/sso/
  - /home/devuser/projects/vault-os/turbo.json
autonomous: true
must_haves:
  truths:
    - "apps/marketing/ is fully extracted to /projects/vault-app/ as a standalone, buildable project"
    - "The monorepo root directory is renamed from oversight-hub to vault-os"
    - "Dashboard no longer contains admin pages (licences, api-keys, webhooks, audit, conformite, ia, gouvernance, parametres/invitations)"
    - "The source oversight-hub repo still builds and all existing apps (api, dashboard, kiosk, mobile) work correctly"
    - "Docker Compose no longer references the marketing service"
    - "Caddyfile no longer proxies to marketing service"
  artifacts:
    - path: "/projects/vault-app/package.json"
      provides: "Standalone project root with marketing app dependency"
    - path: "/projects/vault-app/apps/marketing/package.json"
      provides: "Marketing app with resolved workspace deps as local packages"
    - path: "/projects/vault-app/packages/design/package.json"
      provides: "Design tokens package (copied from source)"
    - path: "/home/devuser/projects/vault-os/apps/dashboard/lib/nav-config.ts"
      provides: "Updated sidebar nav without Gouvernance group"
    - path: "/home/devuser/projects/vault-os/docker-compose.yml"
      provides: "Compose file without marketing service"
    - path: "/home/devuser/projects/vault-os/Caddyfile"
      provides: "Caddy config without marketing reverse proxy"
  key_links:
    - from: "vault-app/apps/marketing"
      to: "vault-app/packages/design"
      via: "package.json workspace dependency"
    - from: "vault-app/apps/marketing/tsconfig.json"
      to: "vault-app/packages/typescript-config/nextjs.json"
      via: "extends"
    - from: "docker-compose.yml"
      to: "marketing service"
      via: "service definition (removed)"
    - from: "Caddyfile"
      to: "marketing:3200"
      via: "reverse_proxy entry (removed)"
    - from: "apps/dashboard/lib/nav-config.ts"
      to: "admin page routes"
      via: "nav items (removed)"
---

<objective>
Extract apps/marketing from the oversight-hub monorepo into /projects/vault-app/ as a standalone project, rename the oversight-hub directory to vault-os, and clean up admin pages from the dashboard.

Purpose: Decouple the marketing site into its own standalone repo so it can be developed/deployed independently, while also cleaning up the main dashboard to remove admin/founder features that will live in vault-app instead.

Output: Three independent work products — (1) standalone vault-app repo at /projects/vault-app/, (2) renamed vault-os directory, (3) cleaned-up dashboard without admin pages.
</objective>

<execution_context>
@/home/devuser/.config/opencode/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
<source_artifacts>
Key state from the monorepo:
- Root: /home/devuser/projects/oversight-hub/
- Package name: "oversight-ai"
- Workspaces: apps/* + packages/* + services/*
- Turbo: tasks include marketing#build, marketing#dev, marketing#lint, marketing#check-types
- Docker Compose: marketing service at container_name: oversight-marketing, port 3200
- Caddyfile: reverse_proxy marketing:3200 for oversighthub.com

Marketing app state:
- Depends on @repo/design (workspace:*) — NOT actually imported in any source file, only in package.json and next.config.mjs's optimizePackageImports
- Depends on @repo/typescript-config (workspace:*) — used in tsconfig.json extends
- @repo/design source: packages/design/src/ (colors, typography, spacing, shadows, marketing theme tokens)
- @repo/typescript-config source: packages/typescript-config/ (base.json, nextjs.json, react-library.json)
- No dependency on @repo/shared
- Next.js 14 with standalone output, next-intl, velite, motion, tailwindcss 3
- French-first site with [locale] routing

Dashboard admin pages to remove:
- Routes: /licences, /licences/activation, /api-keys, /webhooks, /audit, /conformite, /ia, /gouvernance, /parametres, /invite
- Sidebar group "Gouvernance" (Audit, Gouvernance, Licences, API Keys, Webhooks, Conformité)
- Related components: api-keys/, webhooks/, compliance/, license-*, credential-*, sso/
- Parametres page (contains invitations/admin settings)
- Invite route (app/invite/[token]/page.tsx)
</source_artifacts>

<interfaces>
No interfaces to extract — all three tasks are structural (copy/delete/rename operations) with no downstream consumers.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extract marketing app to /projects/vault-app/ as standalone project</name>
  <files>
    /projects/vault-app/package.json
    /projects/vault-app/pnpm-workspace.yaml
    /projects/vault-app/apps/marketing/package.json
    /projects/vault-app/apps/marketing/tsconfig.json
    /projects/vault-app/apps/marketing/next.config.mjs
    /projects/vault-app/packages/design/package.json
    /projects/vault-app/packages/typescript-config/package.json
    /projects/vault-app/packages/typescript-config/base.json
    /projects/vault-app/packages/typescript-config/nextjs.json
    /projects/vault-app/.gitignore
    /projects/vault-app/turbo.json
  </files>
  <action>
    1. Create `/projects/` directory if it doesn't exist.
    2. Copy `apps/marketing/` (excluding .next, node_modules, .velite) to `/projects/vault-app/apps/marketing/`.
    3. Copy `packages/design/` (excluding dist, node_modules) to `/projects/vault-app/packages/design/`.
    4. Copy `packages/typescript-config/` (excluding node_modules) to `/projects/vault-app/packages/typescript-config/`.
    5. Create `/projects/vault-app/package.json` as a minimal workspace root:
       - name: "vault-app", private: true
       - scripts: build, dev, lint, check-types (turbo run or directly)
       - devDependencies: turbo, prettier, typescript (same versions as source)
       - packageManager: pnpm@9.0.0
    6. Create `/projects/vault-app/pnpm-workspace.yaml` pointing to `apps/*` and `packages/*`.
    7. Update `/projects/vault-app/apps/marketing/package.json`:
       - Change `@repo/design: "workspace:*"` to `"@repo/design": "workspace:*"` (keep workspace protocol since design is now a local package)
       - Change `@repo/typescript-config: "workspace:*"` to `"@repo/typescript-config": "workspace:*"` (same)
       - Keep all other deps as-is (they're npm packages, will be installed via pnpm)
    8. Update `/projects/vault-app/apps/marketing/tsconfig.json`:
       - Change extends to relative path: `"../../packages/typescript-config/nextjs.json"` (or keep `@repo/typescript-config/nextjs.json` if workspace resolution works — prefer the extends path for simplicity in a standalone context)
    9. Update `/projects/vault-app/apps/marketing/next.config.mjs`:
       - Keep `optimizePackageImports: ['@repo/design']` — works since design is a local workspace package
       - The `experimental` block stays as-is
    10. Create `/projects/vault-app/.gitignore` (standard Next.js + pnpm).
    11. Create `/projects/vault-app/turbo.json` with tasks for build/dev/lint/check-types (no marketing-specific overrides needed since it's the only app).
    12. Run `pnpm install` from `/projects/vault-app/` to verify workspace resolves.
    13. Run `pnpm --filter @repo/marketing build` to verify it actually builds standalone.

    Preserve the complete directory structure of apps/marketing/ — all pages, components, content, i18n, etc. remain intact.
  </action>
  <verify>
    <automated>
      test -d /projects/vault-app/apps/marketing && \
      test -d /projects/vault-app/packages/design && \
      test -d /projects/vault-app/packages/typescript-config && \
      test -f /projects/vault-app/pnpm-workspace.yaml && \
      ls /projects/vault-app/apps/marketing/app/[locale]/page.tsx > /dev/null
    </automated>
    <human-check>
      Verify that the marketing site pages, images, and content are all present in /projects/vault-app/
    </human-check>
  </verify>
  <done>
    - /projects/vault-app/ exists with marketing app, design package, and typescript-config
    - pnpm install succeeds in vault-app
    - Marketing app builds successfully as standalone
  </done>
</task>

<task type="auto">
  <name>Task 2: Rename oversight-hub directory to vault-os</name>
  <files>
    /home/devuser/projects/vault-os/Caddyfile
    /home/devuser/projects/vault-os/docker-compose.yml
  </files>
  <action>
    1. Shallow-copy (/home/devuser/projects/oversight-hub/ → /home/devuser/projects/vault-os/) using rsync or cp -a, EXCLUDING:
       - node_modules/ (will install fresh)
       - .next/ directories (per-app build caches)
       - .turbo/ (turbo cache)
       - apps/marketing/ (already extracted to vault-app)
       - apps/marketing/.next/ (already extracted)
       - .velite/ (marketing build cache)
    2. Remove the marketing service section from `/home/devuser/projects/vault-os/docker-compose.yml`:
       - Delete the entire `marketing:` service block (lines ~69-86)
       - Also remove any healthcheck lines that reference marketing
    3. Update `/home/devuser/projects/vault-os/Caddyfile`:
       - The entire `oversighthub.com` block (lines 1-10) was the marketing site reverse proxy — remove it entirely
       - Keep only the `app.oversighthub.com` block for API + WebSocket + Dashboard
    4. Remove marketing-specific tasks from `/home/devuser/projects/vault-os/turbo.json`:
       - Delete: `marketing#build`, `marketing#dev`, `marketing#lint`, `marketing#check-types`
    5. Run `pnpm install` from the new vault-os directory to restore node_modules.
    6. Run a quick type-check to verify the API and dashboard still compile: `pnpm --filter @repo/dashboard check-types` or `pnpm --filter @repo/api check-types`.

    Do NOT modify the root package.json "name" field — "oversight-ai" is the internal package name and should stay.
    The old /home/devuser/projects/oversight-hub/ directory should be preserved as a backup until the user confirms vault-os works.
  </action>
  <verify>
    <automated>
      test -d /home/devuser/projects/vault-os && \
      test -f /home/devuser/projects/vault-os/package.json && \
      test -f /home/devuser/projects/vault-os/Caddyfile && \
      test ! -d /home/devuser/projects/vault-os/apps/marketing && \
      grep -c "oversighthub.com" /home/devuser/projects/vault-os/Caddyfile 2>/dev/null; echo "Caddy marketing check: $?"
    </automated>
  </verify>
  <done>
    - /home/devuser/projects/vault-os/ exists with all source apps except marketing
    - docker-compose.yml has no marketing service
    - Caddyfile has no oversighthub.com block
    - turbo.json has no marketing# tasks
    - pnpm install succeeds in vault-os
    - Original /home/devuser/projects/oversight-hub/ preserved as backup
  </done>
</task>

<task type="auto">
  <name>Task 3: Clean up admin pages from the dashboard</name>
  <files>
    /home/devuser/projects/vault-os/apps/dashboard/lib/nav-config.ts
    /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/licences/page.tsx
    /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/licences/activation/page.tsx
    /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/api-keys/page.tsx
    /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/webhooks/page.tsx
    /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/audit/page.tsx
    /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/conformite/page.tsx
    /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/ia/page.tsx
    /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/gouvernance/page.tsx
    /home/devuser/projects/vault-os/apps/dashboard/app/(dashboard)/parametres/page.tsx
    /home/devuser/projects/vault-os/apps/dashboard/app/invite/[token]/page.tsx
    /home/devuser/projects/vault-os/apps/dashboard/components/api-key-create-dialog.tsx
    /home/devuser/projects/vault-os/apps/dashboard/components/api-key-list.tsx
    /home/devuser/projects/vault-os/apps/dashboard/components/api-keys/ApiKeyCreateForm.tsx
    /home/devuser/projects/vault-os/apps/dashboard/components/api-keys/ApiKeyTable.tsx
    /home/devuser/projects/vault-os/apps/dashboard/components/webhooks/WebhookDeliveryTimeline.tsx
    /home/devuser/projects/vault-os/apps/dashboard/components/webhooks/WebhookSubscriptionForm.tsx
    /home/devuser/projects/vault-os/apps/dashboard/components/compliance/
    /home/devuser/projects/vault-os/apps/dashboard/components/license-activation-form.tsx
    /home/devuser/projects/vault-os/apps/dashboard/components/license-empty-state.tsx
    /home/devuser/projects/vault-os/apps/dashboard/components/license-expiry-countdown.tsx
    /home/devuser/projects/vault-os/apps/dashboard/components/license-status-badge.tsx
    /home/devuser/projects/vault-os/apps/dashboard/components/license-usage-bars.tsx
    /home/devuser/projects/vault-os/apps/dashboard/components/credential-lifecycle-form.tsx
    /home/devuser/projects/vault-os/apps/dashboard/components/credential-status-badge.tsx
    /home/devuser/projects/vault-os/apps/dashboard/components/sso/
  </files>
  <action>
    This task operates on /home/devuser/projects/vault-os/apps/dashboard/ (the renamed vault-os repo).

    Step A — Remove admin page route directories:
    Delete the following directories recursively (page.tsx files + any sub-routes):
    - `app/(dashboard)/licences/` (includes page.tsx + activation/ sub-route)
    - `app/(dashboard)/api-keys/`
    - `app/(dashboard)/webhooks/`
    - `app/(dashboard)/audit/`
    - `app/(dashboard)/conformite/`
    - `app/(dashboard)/ia/`
    - `app/(dashboard)/gouvernance/`
    - `app/(dashboard)/parametres/` (contains invitations/admin settings — remove entirely)
    - `app/invite/` (the invite/[token] route — remove entirely)

    Step B — Remove admin-related components:
    Delete these directories and files recursively:
    - `components/api-key-create-dialog.tsx`
    - `components/api-key-list.tsx`
    - `components/api-keys/`
    - `components/webhooks/`
    - `components/compliance/`
    - `components/license-activation-form.tsx`
    - `components/license-empty-state.tsx`
    - `components/license-expiry-countdown.tsx`
    - `components/license-status-badge.tsx`
    - `components/license-usage-bars.tsx`
    - `components/credential-lifecycle-form.tsx`
    - `components/credential-status-badge.tsx`
    - `components/sso/`

    Step C — Update sidebar navigation in `lib/nav-config.ts`:
    - Remove the entire "Gouvernance" group (lines 89-100) — this group contains: Audit, Gouvernance, Licences, API Keys, Webhooks, Conformité
    - The "Paramètres" item under "Outils" group (line 117) should also be removed since the parametres page is deleted
    - Remove unused imports: Shield, Globe, FileText (gouvernance icons) from the import block
    - Keep all other nav groups intact (Tableau de bord, Sécurité, Équipement, Gestion, Intelligence)

    Step D — Verify no broken imports remain:
    - Run `rg "from.*@/(components|app)/.*licence\|api-key\|webhook\|audit\|conformite\|gouvernance\|credential\|sso" apps/dashboard/ --include="*.tsx" --include="*.ts"` to check for stale imports
    - If any found, either remove the parent component or update the import

    Do NOT remove any core dashboard features (cameras, doors, alerts, incidents, users, sites, command center, etc).
    The goal is to strip admin/founder features that belong in vault-app.
  </action>
  <verify>
    <automated>
      # Check that admin page dirs are removed
      for dir in licences api-keys webhooks audit conformite ia gouvernance parametres; do
        test ! -d /home/devuser/projects/vault-os/apps/dashboard/app/\(dashboard\)/$dir && echo "OK: $dir removed" || echo "FAIL: $dir still exists"
      done
      # Check that invite route is removed
      test ! -d /home/devuser/projects/vault-os/apps/dashboard/app/invite && echo "OK: invite removed" || echo "FAIL: invite still exists"
      # Check nav-config no longer has Gouvernance group
      grep -c "Gouvernance" /home/devuser/projects/vault-os/apps/dashboard/lib/nav-config.ts && echo "FAIL: Gouvernance still in nav" || echo "OK: Gouvernance removed from nav"
    </automated>
  </verify>
  <done>
    - All 9 admin page directories removed from dashboard app routes
    - All 15 admin-related component files/dirs removed
    - Sidebar nav-config.ts no longer references any admin pages
    - Dashboard builds successfully without admin pages
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| file-system → project | Copied/renamed files cross filesystem boundaries during extraction |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | Tampering | Marketing extraction | mitigate | Verify all files copied (use rsync dry-run + manual check) |
| T-quick-02 | DoS | Dashboard after cleanup | mitigate | Run build check after page/component removal to catch broken imports |
| T-quick-03 | Repudiation | Directory rename | mitigate | Keep original oversight-hub/ dir as backup until user confirms vault-os works |
| T-quick-SC | Tampering | pnpm install (vault-app + vault-os) | mitigate | No new packages installed — only re-resolving existing workspace deps |
</threat_model>

<verification>
1. All three tasks complete without errors
2. /projects/vault-app/ marketing builds standalone
3. /home/devuser/projects/vault-os/ all non-marketing apps build
4. Dashboard navigation renders without admin page links
5. Original /home/devuser/projects/oversight-hub/ still intact
</verification>

<success_criteria>
- [ ] vault-app repo at /projects/vault-app/ with standalone marketing app that builds
- [ ] vault-os repo at /home/devuser/projects/vault-os/ with all non-marketing apps
- [ ] vault-os docker-compose.yml has no marketing service
- [ ] vault-os Caddyfile only proxies app.oversighthub.com (no oversighthub.com marketing domain)
- [ ] vault-os turbo.json has no marketing# tasks
- [ ] vault-os dashboard has no admin page routes or admin sidebar entries
- [ ] Original oversight-hub/ preserved as fallback
</success_criteria>

<output>
Create `.planning/quick/260718-glp-je-veux-parler-de-quelque-chose-d-import/260718-glp-SUMMARY.md` when done
</output>
