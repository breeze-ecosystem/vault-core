---
phase: 04-commercial-foundation
plan: 05
subsystem: api
tags: [rename, siteId, organizationId, prisma, multitenant, nestjs, dashboard, mobile]

requires:
  - phase: 04-commercial-foundation
    plan: 01
    provides: Schema migration (siteId→organizationId)
  - phase: 04-commercial-foundation
    plan: 03a
    provides: Prisma extension, withTenantContext helper
  - phase: 04-commercial-foundation
    plan: 04a
    provides: OrganizationModule, switch-org endpoint
  - phase: 04-commercial-foundation
    plan: 04b
    provides: InviteModule

provides:
  - Mechanical siteId→organizationId rename across 55+ API source files
  - BullMQ processors wrapped in withTenantContext for tenant isolation
  - Socket.IO gateways with orgId JWT extraction and org-scoped rooms
  - Dashboard/Mobile API clients with Organization types and switchOrganization

affects:
  - 04-06 (feature flag infrastructure)
  - 04-07 (dashboard site pages→org)
  - 04-08 (org switcher UI)
  - 04-09 (mobile org switcher UI)

tech-stack:
  added: []
  patterns:
    - withTenantContext wrapper for BullMQ processors
    - orgId extraction from JWT handshake in Socket.IO gateways
    - Org-scoped room naming convention (org:${orgId})

key-files:
  created: []
  modified:
    - apps/api/src/app.module.ts
    - apps/api/src/common/dto/index.ts
    - apps/api/src/modules/*/*.service.ts (18 files)
    - apps/api/src/modules/*/*.controller.ts (12 files)
    - apps/api/src/modules/*/*.gateway.ts (6 files)
    - apps/api/src/modules/*/*.processor.ts (8 files)
    - apps/api/src/modules/*/*.spec.ts (3 files)
    - apps/api/src/modules/audit/audit.interceptor.ts
    - apps/api/src/modules/camera/camera.service.ts
    - apps/api/src/modules/chat/chat.service.ts
    - apps/api/src/modules/equipment/equipment.predictor.ts
    - apps/dashboard/lib/api.ts
    - apps/dashboard/lib/auth-client.ts
    - apps/dashboard/lib/auth-context.tsx
    - apps/mobile/lib/api.ts
    - apps/mobile/lib/auth-client.ts
    - apps/mobile/lib/auth-context.tsx

key-decisions:
  - "Used orgId for BullMQ job data and gateway events (shorthand), organizationId for Prisma queries (exact field name)"
  - "Processors without prisma injection (anpr, governance, notifications, patterns) skipped withTenantContext wrapper"
  - "User model siteId references removed entirely (field no longer exists in Prisma schema)"
  - "Dashboard/Mobile changes are preparatory; full org switcher UI deferred to Plans 08/09"

requirements-completed:
  - FND-01
  - FND-02

duration: 12min
completed: 2026-07-15
---

# Phase 04 Plan 05: siteId→organizationId Mechanical Rename Summary

**Systematic rename of siteId→organizationId across 55+ files, Prisma relation navigation (site→organization), raw SQL (site_id→organization_id), Socket.IO room names (site:→org:), and BullMQ job data (siteId→orgId). Dashboard and Mobile API clients updated with Organization types and switchOrganization support.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-15T17:24:36Z
- **Completed:** 2026-07-15T17:36:50Z
- **Tasks:** 4
- **Files modified:** 72+

## Accomplishments

- **Task 1:** Replaced SiteModule with OrganizationModule in AppModule, added InviteModule, regenerated Prisma Client
- **Task 2:** Mechanical rename across 55+ API source files — all Prisma queries use organizationId, all relations use .organization, raw SQL uses organization_id, room names use org: prefix, User model siteId references removed
- **Task 3:** Added withTenantContext wrapper to 8 BullMQ processors for tenant isolation; added orgId JWT extraction and disconnect-if-missing to 6 Socket.IO gateways
- **Task 4:** Updated Dashboard and Mobile API clients with Organization interface, fetchOrganizations, switchOrganization, and org-aware auth context

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace SiteModule with OrganizationModule** — `edad958` (feat)
2. **Task 2: Rename siteId→organizationId across API modules** — `0e6e7cc` (feat, 55 files)
3. **Task 3: Add withTenantContext and orgId handshake** — `14d5922` (feat, 13 files)
4. **Task 4: Update dashboard/mobile for org context** — `167d49c` (feat, 6 files)

## Files Created/Modified

See `key-files.modified` in frontmatter for the full list.

## Decisions Made

- **orgId vs organizationId:** Used `orgId` (shorthand) for BullMQ job data and Socket.IO gateway events, and `organizationId` (full field name) for Prisma queries. This matches the existing convention where Prisma fields use full camelCase names while internal data transfer uses abbreviations.
- **Processors without prisma:** The anpr, governance, notifications, and patterns processors delegate to service classes and don't inject `PrismaService` directly. Added withTenantContext only where prisma is used.
- **User model siteId removal:** The field was removed from the Prisma schema in Plan 01/02. All existing code referencing `user.siteId` or `user: { select: { siteId: true } }` was removed entirely rather than renamed.
- **Preparatory frontend changes:** Dashboard and Mobile API client updates are structural (types, functions, auth context). Full org switcher UI implementation deferred to Plans 08/09.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Indentation fix in door.processor.ts withTenantContext wrapper**
- **Found during:** Task 3 (Adding withTenantContext)
- **Issue:** The initial edit inserted the wrapper with incorrect indentation — the entire method body shifted by 2 spaces, breaking TypeScript syntax
- **Fix:** Rewrote the entire method body with proper indentation, correctly nesting all code inside the `async () => { }` callback
- **Files modified:** `apps/api/src/modules/door/door.processor.ts`
- **Verification:** grep confirms 2 withTenantContext references, syntax verified by reading full file
- **Committed in:** `14d5922` (Task 3 commit)

**2. [Rule 1 - Bug] Duplicate variable declaration in incident.processor.ts**
- **Found during:** Task 3 (Adding withTenantContext)
- **Issue:** An edit produced a duplicate `const incident = await this.prisma.incident.findUnique({` line
- **Fix:** Removed the duplicate line
- **Files modified:** `apps/api/src/modules/incident/incident.processor.ts`
- **Verification:** File compiles correctly
- **Committed in:** `14d5922` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

- None significant — the mechanical rename was straightforward but required meticulous attention across 55+ files with different naming conventions (camelCase vs snake_case, full name vs shorthand)
- Some processors (anpr, governance, notifications, patterns) don't inject PrismaService directly; withTenantContext was skipped for these as they delegate DB access to service classes

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All API source files now use organizationId instead of siteId
- Tenant isolation enforced in processors and gateways
- Dashboard and Mobile clients ready for org switcher integration
- Ready for 04-06 (Feature flag infrastructure) and 04-07 (Dashboard site pages → org)

---

## Self-Check: PASSED

- [x] All 4 tasks executed and committed
- [x] SUMMARY.md created with substantive content
- [x] `apps/api/src/app.module.ts` — OrganizationModule and InviteModule imported, SiteModule removed (0 matches)
- [x] `grep "siteId" apps/api/src/modules/ --include="*.ts" | grep -v organizationId` — 0 results
- [x] `grep "\.site\b" apps/api/src/modules/ --include="*.ts" | grep -v "\.organization"` — 0 results
- [x] `grep "import.*\bSite\b" apps/api/src/modules/ --include="*.ts" | grep -v SiteContext\|SiteModule\|site-context` — 0 results
- [x] `withTenantContext` in door.processor.ts — 2 matches
- [x] `org:${` room names in door.gateway.ts — 3 matches
- [x] `switchOrganization` in dashboard auth-client.ts — 1 match
- [x] All 4 commits present in git log
- [x] All plan acceptance criteria verified

---

*Phase: 04-commercial-foundation*
*Completed: 2026-07-15*
