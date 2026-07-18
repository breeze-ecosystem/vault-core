---
phase: quick
plan: 01
subsystem: infra
tags: [monorepo, extraction, marketing, dashboard, cleanup, migration]
requires: []
provides:
  - Standalone vault-app marketing repo at /projects/vault-app/
  - Renamed vault-os monorepo at /home/devuser/projects/vault-os/
  - Cleaned dashboard without admin/founder pages
affects: []
tech-stack:
  added: []
  patterns:
    - "Standalone marketing app extraction with local workspace deps"
    - "Dashboard admin page removal pattern"
key-files:
  created:
    - /projects/vault-app/package.json
    - /projects/vault-app/pnpm-workspace.yaml
    - /projects/vault-app/turbo.json
    - /projects/vault-app/.gitignore
  modified:
    - /home/devuser/projects/vault-os/docker-compose.yml
    - /home/devuser/projects/vault-os/Caddyfile
    - /home/devuser/projects/vault-os/turbo.json
    - /home/devuser/projects/vault-os/apps/dashboard/lib/nav-config.ts
key-decisions:
  - "Used pnpm workspace protocol for @repo/design dependency in vault-app (kept workspace:* since design is a local package)"
  - "Updated tsconfig.json extends to relative path (../../packages/typescript-config/nextjs.json) for standalone workspace"
  - "Preserved original oversight-hub directory as fallback"
  - "Prisma client needed regeneration in vault-os for type checking"
requirements-completed: []
duration: 15min
completed: 2026-07-18
---

# Quick Plan 01: Marketing Extraction, Repo Rename, Dashboard Cleanup Summary

**Extracted apps/marketing to /projects/vault-app/ as standalone pnpm workspace, renamed oversight-hub → vault-os, and stripped admin/founder pages from the dashboard**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-18
- **Completed:** 2026-07-18
- **Tasks:** 3
- **Files modified:** ~25 route directories + 15 component files removed, 4 config files modified

## Accomplishments

- **Task 1 — Vault-app standalone:** apps/marketing fully extracted to /projects/vault-app/ with design package and typescript-config as local workspace deps. Marketing app builds successfully (89 static pages, SSG).
- **Task 2 — Repo rename:** Full vault-os copy created at /home/devuser/projects/vault-os/, excluding apps/marketing. Marketing service removed from docker-compose.yml, Caddyfile oversighthub.com block removed, marketing# tasks removed from turbo.json. pnpm install + type-check pass.
- **Task 3 — Dashboard cleanup:** All 9 admin route directories (licences, api-keys, webhooks, audit, conformite, ia, gouvernance, parametres, invite) and all 15 admin component files/directories deleted. nav-config.ts updated: Gouvernance group removed, Paramètres item removed, unused imports cleaned. Type-check passes clean.
- Original /home/devuser/projects/oversight-hub/ fully preserved as backup.

## Task Commits

No commits in the oversight-hub repo — all changes were to separate directories outside the repo (/projects/vault-app/, /home/devuser/projects/vault-os/). The plan explicitly requested no docs artifact commits.

## Files Created/Modified

### Created (vault-app standalone)
- `/projects/vault-app/package.json` — Minimal workspace root with turbo + prettier + typescript
- `/projects/vault-app/pnpm-workspace.yaml` — apps/* and packages/*
- `/projects/vault-app/turbo.json` — Build/lint/check-types/dev tasks
- `/projects/vault-app/.gitignore` — Standard Next.js + pnpm + Expo ignores
- Updated: `/projects/vault-app/apps/marketing/tsconfig.json` — extends → relative path

### Modified (vault-os config cleanup)
- `/home/devuser/projects/vault-os/docker-compose.yml` — Removed marketing service block (~20 lines)
- `/home/devuser/projects/vault-os/Caddyfile` — Removed oversighthub.com marketing proxy block (10 lines)
- `/home/devuser/projects/vault-os/turbo.json` — Removed marketing#build, marketing#dev, marketing#lint, marketing#check-types

### Deleted (vault-os dashboard cleanup)
- 9 route directories: `app/(dashboard)/licences/`, `app/(dashboard)/api-keys/`, `app/(dashboard)/webhooks/`, `app/(dashboard)/audit/`, `app/(dashboard)/conformite/`, `app/(dashboard)/ia/`, `app/(dashboard)/gouvernance/`, `app/(dashboard)/parametres/`, `app/invite/`
- 15 admin components: `api-key-create-dialog.tsx`, `api-key-list.tsx`, `api-keys/`, `webhooks/`, `compliance/`, `license-*` (4 files), `credential-*` (2 files), `sso/`
- Updated: `lib/nav-config.ts` — Removed Gouvernance group (6 nav items), Paramètres item, and unused Lucide imports

## Decisions Made

- **Workspace protocol preserved:** Kept `workspace:*` for @repo/design in vault-app since design is a local package in the new workspace. tsconfig.json extends changed to relative path for simplicity.
- **No root package.json rename:** The root `name` field ("oversight-ai") was left as-is since it's the internal package name.
- **Prisma client regeneration:** vault-os needed `prisma generate` before type-check would pass — fresh copy doesn't have generated client.
- **Original preserved:** The oversight-hub directory was left completely untouched as a backup.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **Caddyfile grep check false positive:** The automated grep for "oversighthub.com" matched `app.oversighthub.com` (the preserved API/Dashboard block), not the removed bare domain. Verified specifically that no bare `oversighthub.com` block remains.
- **Prisma client not generated in vault-os:** Fresh copy didn't have generated Prisma client. Ran `pnpm --filter @repo/api prisma:generate` before type-check could pass. This was expected (new pnpm install without schema generation).

## Verification Summary

| Check | Result |
|-------|--------|
| vault-app marketing dir copied | ✅ |
| vault-app design package copied | ✅ |
| vault-app typescript-config copied | ✅ |
| vault-app pnpm install | ✅ (295 packages) |
| vault-app marketing build | ✅ (89 SSG pages) |
| vault-app design build | ✅ (tsc clean) |
| vault-os directory created | ✅ |
| vault-os marketing excluded | ✅ |
| vault-os pnpm install | ✅ (1759 packages) |
| vault-os docker-compose no marketing | ✅ |
| vault-os Caddyfile no marketing domain | ✅ |
| vault-os turbo.json no marketing tasks | ✅ |
| vault-os dashboard type-check | ✅ (clean) |
| vault-os API type-check | ✅ (after prisma generate) |
| All 9 admin route dirs deleted | ✅ |
| All 15 admin components deleted | ✅ |
| nav-config no Gouvernance group | ✅ |
| nav-config no Paramètres item | ✅ |
| Original oversight-hub preserved | ✅ |

## User Setup Required

None — all changes are structural reorganizations. The vault-app and vault-os directories are ready for development/deployment.

## Next Phase Readiness

- vault-app at `/projects/vault-app/` is fully buildable and can be deployed independently.
- vault-os at `/home/devuser/projects/vault-os/` is ready for further development with marketing completely decoupled.
- Dashboard no longer renders admin pages — access control + admin features that remain in vault-os are intact.
- Original oversight-hub remains as a full backup in case anything needs to be recovered.

---

*Phase: quick*
*Completed: 2026-07-18*
