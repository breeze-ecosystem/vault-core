---
phase: 003-visitor-kiosk
plan: 02
subsystem: api
tags: [nestjs, zpl, cups, api-key-auth, kiosk]

# Dependency graph
requires:
  - phase: 003-visitor-kiosk
    provides: KioskModule with KioskController, KioskService, ZPL generation, KioskAuthGuard
provides:
  - Combined API key + JWT auth guard (KioskAuthGuard)
  - ZPL badge template for 4"×2" thermal labels
  - Print endpoint (POST /api/kiosk/print/:visitId) with CUPS lp integration
  - Kiosk check-in/check-out/search/get-visit endpoints
  - Kiosk module registered in AppModule
  - Unit tests for KioskService (9 tests, all passing)
affects: [003-visitor-kiosk (kiosk SPA will call these endpoints)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Combined API key + JWT guard pattern (KioskAuthGuard)
    - ZPL template function (hand-rolled, no library)
    - CUPS printing via child_process.exec('lp')
    - Kiosk controller with @Public() + @UseGuards(KioskAuthGuard)

key-files:
  created:
    - apps/api/src/common/guards/kiosk-auth.guard.ts
    - apps/api/src/modules/kiosk/zpl-badge.ts
    - apps/api/src/modules/kiosk/kiosk.service.ts
    - apps/api/src/modules/kiosk/kiosk.controller.ts
    - apps/api/src/modules/kiosk/kiosk.module.ts
    - apps/api/src/modules/kiosk/kiosk.service.spec.ts
  modified:
    - apps/api/src/app.module.ts

key-decisions:
  - "KioskModule imports VisitorModule directly for VisitorService injection (no circular deps)"
  - "KioskAuthGuard validates X-API-Key (SHA-256 hash against TenantApiKey) OR JWT"
  - "All kiosk endpoints use @Public() + @UseGuards(KioskAuthGuard) to skip global JwtAuthGuard"
  - "ZPL generation is hand-rolled (no node-zpl dependency) — template is simple enough"
  - "CUPS printing via child_process.exec('lp') instead of native bindings for Docker compatibility"
  - "Kiosk check-in passes empty userId string — kiosk has no human user context"

patterns-established:
  - "Kiosk guard pattern: API key auth with SHA-256 hash lookup, no Redis rate limiting"
  - "Kiosk controller pattern: @Public() + @UseGuards(KioskAuthGuard) on all endpoints"
  - "Badge printing pattern: generate ZPL → write temp file → exec('lp -o raw') → cleanup"

requirements-completed: [KIO-02, KIO-04]

# Metrics
duration: 8 min
completed: 2026-07-17
---

# Phase 3 Plan 2: Kiosk Backend — NestJS Module Summary

**Combined API key + JWT auth guard, ZPL badge generation, CUPS printing, and 5 kiosk endpoints with full unit test coverage**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-17T16:55:03Z
- **Completed:** 2026-07-17T17:03:27Z
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments

- KioskAuthGuard — combined API key (SHA-256 + TenantApiKey lookup) and JWT authentication guard
- ZPL badge template function for 4"×2" thermal labels (visitor name, host, date, QR code)
- KioskService with printBadge() (ZPL → temp file → CUPS lp) and searchVisits() (Prisma ILIKE)
- KioskController with 5 endpoints: check-in, check-out, search, get-visit, print
- KioskModule registered in AppModule with VisitorModule import for VisitorService access
- 9 unit tests covering all service methods and edge cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Create KioskAuthGuard** - `70a18e2` (feat)
2. **Task 2: Create KioskModule with print, ZPL, CUPS** - `f197478` (feat)
3. **Task 3: Wire KioskModule into app.module.ts** - `ee8e508` (feat)
4. **Task 4: Create unit tests** - `0e472af` (test)

## Files Created/Modified

- `apps/api/src/common/guards/kiosk-auth.guard.ts` — Combined API key + JWT guard with SHA-256 hash validation
- `apps/api/src/modules/kiosk/zpl-badge.ts` — ZPL template function for 4"×2" thermal badges
- `apps/api/src/modules/kiosk/kiosk.service.ts` — Print badge (CUPS lp) and search visits (Prisma) service
- `apps/api/src/modules/kiosk/kiosk.controller.ts` — 5 kiosk endpoints with @Public() + @UseGuards(KioskAuthGuard)
- `apps/api/src/modules/kiosk/kiosk.module.ts` — Module registering controller/service, importing PrismaModule + VisitorModule
- `apps/api/src/modules/kiosk/kiosk.service.spec.ts` — 9 Jest unit tests for all service methods
- `apps/api/src/app.module.ts` — Added KioskModule to imports array

## Decisions Made

- **KioskModule imports VisitorModule directly** for VisitorService injection — no circular dependency issues, cleaner than importing through visitor.module.ts
- **KioskAuthGuard follows three-path auth:** valid API key → pass, invalid API key → 401, no API key → @Public()/JWT fallthrough
- **No Redis rate limiting in KioskAuthGuard** — simplified for kiosk; global @fastify/rate-limit protects /api/* routes
- **Empty userId for kiosk check-in/out** — kiosk has no human user context since auth is via API key

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Jest mocking of child_process.exec** — The node builtin `exec` is non-configurable, preventing `jest.spyOn`. Used `jest.mock` with factory pattern instead, accessing the mock via `require('child_process')` within test bodies.

## Next Phase Readiness

- Kiosk backend module complete and built (NestJS build passes)
- 9 unit tests passing for all service methods
- Ready for kiosk SPA frontend development (Wave 2) which will consume these endpoints

## Self-Check: PASSED

All 6 created files exist on disk. All 4 task commits present in git log:
- `70a18e2` feat(003-kiosk): create KioskAuthGuard
- `f197478` feat(003-kiosk): create KioskModule with ZPL generation, CUPS printing
- `ee8e508` feat(003-kiosk): wire KioskModule into AppModule imports
- `0e472af` test(003-kiosk): add unit tests for KioskService

NestJS build: SUCCESS (exit 0)
Unit tests: 9/9 passing

---
*Phase: 003-visitor-kiosk*
*Completed: 2026-07-17*
