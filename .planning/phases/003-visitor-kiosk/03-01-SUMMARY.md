---
phase: 003-visitor-kiosk
plan: 01
subsystem: infra
tags: [nextjs, tailwind, docker, nginx, cups, static-export, printer, zpl]
requires:
  - phase: 01-unified-security
    provides: Docker multi-stage build patterns, pnpm workspace structure
provides:
  - apps/kiosk/ — Next.js static export SPA scaffold
  - docker/kiosk.Dockerfile — multi-stage build (deps → builder → alpine:nginx+CUPS)
  - docker/kiosk.nginx.conf — nginx config with SPA fallback + static caching
  - docker/kiosk-cupsd.conf — CUPS config allowing local printer admin
  - docker/kiosk-entrypoint.sh — container startup (CUPS → printer → nginx)
  - docker-compose.yml — kiosk service (port 3080:80, healthcheck, env vars)
  - .env.example — KIOSK section with documented env vars
affects: [003-visitor-kiosk/03-02, 003-visitor-kiosk/03-03, 003-visitor-kiosk/03-04]
tech-stack:
  added:
    - instascan@^1.0.0 (QR scanning in Chromium WebRTC)
    - lucide-react@^1.11.0 (icons)
    - tailwindcss@^3 (light theme only, no shadcn)
    - autoprefixer@^10 (required for Docker build)
  patterns:
    - Three-stage Docker build (deps → builder → runner) matching dashboard pattern
    - Light theme Tailwind config (no darkMode, no CSS variables, no shadcn)
    - Static export with images.unoptimized
    - Multi-process container (CUPS background + nginx foreground) without supervisord
key-files:
  created:
    - apps/kiosk/package.json — @repo/kiosk with next 14.2, react 18, instascan
    - apps/kiosk/next.config.js — output: "export", images.unoptimized
    - apps/kiosk/tailwind.config.ts — light-only, custom animations (slide-up, fade-in, scale-in), kiosk spacing/border-radius
    - apps/kiosk/app/layout.tsx — <html lang="fr">, Visit.me — OVERSIGHT AI metadata
    - apps/kiosk/app/globals.css — 10 lines, system-ui font, no Radix/shadcn
    - apps/kiosk/app/page.tsx — minimal Welcome placeholder (required for build)
    - docker/kiosk.Dockerfile — 3-stage: deps (node:20-alpine, pnpm install), builder (tsc shared + kiosk build), runner (alpine:3.19 + nginx + CUPS)
    - docker/kiosk.nginx.conf — listen 80, try_files SPA fallback, _next/static cache
    - docker/kiosk-cupsd.conf — custom CUPS policy allowing local lpadmin without auth
    - docker/kiosk-entrypoint.sh — cupsd -f → wait for socket → lpadmin if PRINTER_IP set → nginx foreground
  modified:
    - docker-compose.yml — added kiosk service after marketing
    - .env.example — added KIOSK section with 4 vars
key-decisions:
  - "Three-stage Docker build (deps + builder + runner) instead of two-stage: ensures NODE_ENV=development for dependency install (all devDeps) and NODE_ENV=production for build"
  - "Custom CUPS config (kiosk-cupsd.conf) overriding Alpine default: allows lpadmin from localhost without authentication for printer setup"
  - "Entrypoint uses CUPS socket readiness check (instead of fixed sleep) and retries lpadmin with backoff for reliability"
  - "autoprefixer added as explicit devDep — required for Docker build where it's not hoisted from other workspace packages"
patterns-established:
  - "Kiosk apps follow light theme only: no darkMode, no CSS variables, no shadcn imports"
  - "Multi-process containers without supervisord: use shell script with background + foreground process management"
  - "Static export SPA pattern for kiosk-type apps (no SSR, no API routes, no server)"
requirements-completed: [KIO-04]
duration: 42 min
completed: 2026-07-17
---

# Phase 3 Plan 1: Kiosk Scaffold Summary

**Next.js static export SPA scaffolded at apps/kiosk/ with Tailwind light theme, multi-stage Docker build delivering nginx + CUPS in a single Alpine image, kiosk service in Docker Compose, and documented env vars — establishing the entire build and deploy foundation for Phase 3 visitor kiosk.**

## Performance

- **Duration:** 42 min
- **Started:** 2026-07-17T16:10:00Z
- **Completed:** 2026-07-17T16:52:36Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- Scaffolded apps/kiosk/ as a standalone Next.js SPA with static export (pnpm build → out/) and light Tailwind theme — no shadcn, no Radix, no dark mode
- Created multi-stage Dockerfile (deps → builder → alpine:nginx+CUPS) that builds the SPA and packages it with CUPS for network printing
- Configured nginx for static SPA serving with SPA fallback routing and aggressive cache headers for /_next/static/
- Added custom CUPS configuration allowing local printer administration without authentication
- Created entrypoint script that starts CUPS daemon, configures network printer via lpadmin if PRINTER_IP is set, then launches nginx in foreground
- Added kiosk service to docker-compose.yml (port 3080:80, healthcheck wget, three env vars)
- Documented kiosk env vars in .env.example with French annotations
- Validated: SPA builds, Docker image builds and serves HTTP 200, CUPS starts and accepts printer config

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold apps/kiosk/** - `b14339e` (feat: scaffold apps/kiosk/ with Next.js static export and Tailwind light theme)
2. **Task 2: Docker infrastructure** - `ba48d78` (feat: create Docker infrastructure — multi-stage Dockerfile, nginx config, CUPS entrypoint)
3. **Task 3: Docker Compose + env vars** - `2af1413` (feat: add kiosk service to Docker Compose, env vars, fix CUPS startup)

**Plan metadata:** (not yet committed — will be committed with this SUMMARY.md)

_Note: TDD was not used for this plan (type: execute, not type: tdd)._

## Files Created/Modified

### Created
- `apps/kiosk/package.json` - @repo/kiosk workspace package with next 14.2, react 18, instascan, lucide-react
- `apps/kiosk/next.config.js` - Static export config (output: "export", images.unoptimized)
- `apps/kiosk/tsconfig.json` - Extends @repo/typescript-config/nextjs.json with @/* paths
- `apps/kiosk/postcss.config.js` - tailwindcss + autoprefixer plugins
- `apps/kiosk/tailwind.config.ts` - Light-only theme with custom animations (slide-up, fade-in, scale-in), kiosk spacing (touch/touch-lg) and border-radius (kiosk/kiosk-sm)
- `apps/kiosk/app/layout.tsx` - Root layout with <html lang="fr">, Visit.me metadata, no providers
- `apps/kiosk/app/globals.css` - Minimal 10-line CSS: @tailwind directives + system-ui font stack
- `apps/kiosk/app/page.tsx` - Welcome placeholder page (required for Next.js build)
- `docker/kiosk.Dockerfile` - 3-stage build: deps + builder (node:20-alpine) + runner (alpine:3.19 with nginx, cups, cups-libs, cups-filters, curl)
- `docker/kiosk.nginx.conf` - nginx config: SPA try_files fallback, immutable cache for /_next/static/
- `docker/kiosk-cupsd.conf` - Custom CUPS policy: allows local printer admin without authentication
- `docker/kiosk-entrypoint.sh` - Entrypoint: start cupsd → wait for socket → lpadmin printer config → nginx foreground

### Modified
- `docker-compose.yml` - Added kiosk service (build, ports 3080:80, healthcheck, env vars)
- `.env.example` - Added KIOSK section (KIOSK_API_KEY, KIOSK_ID, PRINTER_IP, SITE_ID)

## Decisions Made

- **Three-stage Docker build (deps + builder + runner)** over the two-stage approach in the plan. The deps stage installs with NODE_ENV=development (ensuring all devDependencies including TypeScript and autoprefixer are available), while the builder stage uses NODE_ENV=production for the actual kiosk build. This matches the dashboard.Dockerfile pattern and prevents build failures.
- **Custom CUPS configuration file** instead of relying on Alpine defaults. The default Alpine CUPS 2.4.x cupsd.conf requires authentication for `lpadmin` operations. The custom config adds `Allow @LOCAL` to the `CUPS-Add-Modify-Printer` policy limit, making printer setup work inside the container.
- **CUPS socket readiness polling with retry** instead of a fixed `sleep 2`. The entrypoint now loops checking for the CUPS socket and retries `lpadmin` up to 3 times with backoff. Printer configuration is non-fatal — the container starts nginx even if CUPS printer setup fails.
- **autoprefixer as explicit devDependency** required for Docker builds where package hoisting from other workspace apps doesn't apply.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added autoprefixer as explicit dependency**
- **Found during:** Task 2 (Docker build verification)
- **Issue:** Docker build failed with "Cannot find module 'autoprefixer'" — the local build worked because autoprefixer is hoisted from other workspace packages, but the clean pnpm install inside Docker didn't have it
- **Fix:** Added `"autoprefixer": "^10"` to apps/kiosk/devDependencies
- **Files modified:** apps/kiosk/package.json, pnpm-lock.yaml
- **Verification:** Docker build succeeds, SPA compiles correctly
- **Committed in:** ba48d78 (Task 2 commit)

**2. [Rule 3 - Blocking] Added apps/kiosk/app/page.tsx for build**
- **Found during:** Task 1 (initial scaffold)
- **Issue:** Next.js 14 App Router requires at least one page file to build; without it the build would fail with "no page found"
- **Fix:** Created minimal apps/kiosk/app/page.tsx with "Visit.me by OVERSIGHT AI" welcome placeholder
- **Files modified:** apps/kiosk/app/page.tsx (new)
- **Verification:** `pnpm --filter @repo/kiosk build` succeeds, out/index.html exists
- **Committed in:** b14339e (Task 1 commit)

**3. [Rule 3 - Blocking] Custom CUPS config for local lpadmin**
- **Found during:** Task 2 (Docker build and container testing)
- **Issue:** Default Alpine CUPS config requires authentication for lpadmin operations — container exited with "lpadmin: Forbidden" when PRINTER_IP was set
- **Fix:** Created docker/kiosk-cupsd.conf with `Allow @LOCAL` on `CUPS-Add-Modify-Printer` policy, updated entrypoint to poll for CUPS readiness with retry + backoff
- **Files modified:** docker/kiosk-cupsd.conf (new), docker/kiosk.Dockerfile, docker/kiosk-entrypoint.sh
- **Verification:** Container starts, CUPS initializes in ~2s, printer configures successfully, nginx serves SPA
- **Committed in:** 2af1413 (Task 3 commit)

**4. [Rule 2 - Missing Security] Fixed docker/kiosk-cupsd.conf file permissions**
- **Found during:** Task 3 (container testing)
- **Issue:** kiosk-cupsd.conf was created with `root:lp` ownership and `640` permissions, making it unreadable by Docker build context via `COPY` — resulting in empty file inside image
- **Fix:** Changed permissions to `644` via sudo (Docker requires readable source files)
- **Files modified:** docker/kiosk-cupsd.conf
- **Verification:** Image now contains 2113-byte CUPS config file
- **Committed in:** 2af1413 (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (4 Rule 3 blocking, 1 Rule 2 missing security)
**Impact on plan:** All auto-fixes were necessary for build and deployment correctness. No scope creep — each fix addressed real blocking issues encountered during verification.

## Issues Encountered

- **Docker multi-stage node_modules isolation:** The initial 2-stage Dockerfile had issues with node_modules not being available in the builder stage. Switched to 3-stage (deps + builder + runner) matching the dashboard.Dockerfile pattern, with explicit COPY of node_modules directories from deps stage.
- **CUPS default authentication policy:** Alpine's CUPS 2.4.x requires authentication for printer administration commands even when running as root. Resolved by providing a custom cupsd.conf with permissive local policy.
- **pnpm frozen lockfile:** New kiosk workspace package required updating the lockfile. Used `--no-frozen-lockfile` for initial install, subsequent Docker builds use `--frozen-lockfile`.
- **file write ownership issue:** The write tool created kiosk-cupsd.conf with `root:lp` ownership, causing Docker COPY to produce an empty file. Required manual permission fix via sudo.

## Self-Check: PASSED

Verification results:
- `apps/kiosk/package.json` exists with `"next"` dependency → FOUND ✓
- `apps/kiosk/next.config.js` has `output: "export"` → FOUND ✓
- `apps/kiosk/tailwind.config.ts` has no `darkMode` property → FOUND ✓
- `apps/kiosk/app/globals.css` is under 25 lines, no Radix imports → 10 lines ✓
- `apps/kiosk/app/layout.tsx` has `<html lang="fr">` → FOUND ✓
- `pnpm --filter @repo/kiosk build` succeeds → PASSED ✓
- `docker build -f docker/kiosk.Dockerfile -t oversight-kiosk .` succeeds → PASSED ✓
- `docker compose config` YAML syntax valid → PASSED ✓
- Container serves SPA at port 80 → HTTP 200 ✓
- CUPS daemon starts and accepts lpadmin → PASSED ✓

## User Setup Required

**External services require manual configuration.** No USER-SETUP.md generated — configuration is documented in `.env.example`:
- `KIOSK_API_KEY` — Generate via Dashboard API Keys panel with visitor scopes
- `PRINTER_IP` — Network admin must provide LAN IP for ZPL thermal printer
- `SITE_ID` — Site identifier (e.g., "siege-hq-lobby")

## Next Phase Readiness

- Kiosk scaffold is complete — ready for 03-02 (Kiosk frontend screens: welcome, scanner, search, confirm, printing, success, checkout)
- Docker build pipeline validated — subsequent kiosk frontend plans will automatically be built and served
- CUPS printing foundation in place — printer configuration tested and working
- Docker build preserves the full kiosk.Dockerfile, so future component additions will be included in the Docker image automatically

---

*Phase: 003-visitor-kiosk*
*Completed: 2026-07-17*
