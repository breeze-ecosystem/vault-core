---
phase: 02-operational-ai
plan: 03
subsystem: visitor-management
tags: [visitor, preregistration, qr-credentials, check-in, check-out, zone-restrictions, i18n]
requires:
  - phase: 01-unified-security
    provides: AccessService (createCredential, generateQrCode, evaluateAccess, createAccessLevel, createSchedule), Credential model, Zone model
  - phase: 02-operational-ai
    provides: Incident models, event bus infrastructure
provides:
  - Visitor and Visit Prisma models with relations to Credential, User, and Visitor
  - VisitorService with preregister, checkIn, checkOut, cancelVisit, listVisits, getVisit, getVisitor, listVisitors
  - VisitorController with 8 role-protected REST endpoints
  - VisitorGateway with real-time event push on /ws/visitors namespace
  - Shared Zod schemas and TypeScript types for visitor management
  - Dashboard pages: visitor list, visitor detail, pre-registration form with QR badge display/download/print
  - i18n strings for French and English
affects:
  - "Phase 2 Plan 4 (ANPR/LPR): may integrate visitor plates for pre-registered vehicles"
  - "Phase 2 Plan 5 (Incident Management): visitor events feed into the incident timeline"
  - "Future mobile plan: visitor check-in/out via Expo mobile app"

tech-stack:
  added: []
  patterns:
    - "Visitor module: controller → service → prisma → event-emitter pattern (same as incident module)"
    - "QR credential reuse: creates QR-type credential via Phase 1 AccessService, generates badge via generateQrCode()"
    - "Zone restriction enforcement: creates AccessLevel per zone via AccessService, evaluated by existing evaluateAccess()"
    - "Pitfall 3 mitigation: immediate credential deactivation on check-out + Redis revoked cache with TTL"

key-files:
  created:
    - apps/api/src/modules/visitor/visitor.service.ts
    - apps/api/src/modules/visitor/visitor.controller.ts
    - apps/api/src/modules/visitor/visitor.gateway.ts
    - apps/api/src/modules/visitor/visitor.module.ts
    - packages/shared/src/schemas/visitor.schema.ts
    - packages/shared/src/types/visitor.types.ts
    - apps/dashboard/app/(dashboard)/visiteurs/page.tsx
    - apps/dashboard/app/(dashboard)/visiteurs/[id]/page.tsx
    - apps/dashboard/app/(dashboard)/visiteurs/preinscription/page.tsx
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/src/app.module.ts
    - packages/shared/src/index.ts
    - apps/dashboard/lib/api.ts
    - apps/dashboard/lib/nav-config.ts
    - apps/dashboard/lib/i18n/dictionaries/fr.ts
    - apps/dashboard/lib/i18n/dictionaries/en.ts

key-decisions:
  - "Use EventEmitter2 (existing bus) for visitor events — no new BullMQ queues needed since visitor operations are synchronous"
  - "Named relation 'VisitHost' on User model for hosted visits to disambiguate from other User→Visit relations"
  - "Pitfall 3 mitigation: checkOut immediately deactivates credential + adds to Redis revoked: key with TTL"
  - "OnModuleInit auto-cleanup of expired active visits on server startup handles credential reaping after restart"

patterns-established:
  - "Visitor module follows same controller → service → prisma → event-emitter → gateway pattern as incident module"
  - "All visitor endpoints protected by @Roles decorator (ADMIN/SUPERVISOR/OPERATOR as appropriate)"
  - "Reuses Phase 1 AccessService for credential, access level, and QR code operations — no credential abstraction duplication"

requirements-completed: [VIST-01, VIST-02, VIST-03, VIST-04, VIST-05]

duration: 14min
completed: 2026-07-14
---

# Phase 2 Plan 3: Visitor Management Summary

**Full visitor lifecycle vertical slice — pre-registration with QR credentials, security check-in/check-out, zone restriction enforcement, and dashboard management pages with i18n support**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-14T18:00:00Z
- **Completed:** 2026-07-14T18:14:00Z
- **Tasks:** 3
- **Files created:** 9
- **Files modified:** 7

## Accomplishments

- **Visitor + Visit Prisma models** with relationships to Visitor (one-to-many), User (host), and Credential (QR badge)
- **VisitorService** with 8 operations: preregister (creates visitor + QR credential + visit + zone access levels + QR badge), checkIn (activates credential), checkOut (immediate credential deactivation + Redis revoked cache with TTL), cancelVisit, listVisits, getVisit, getVisitor, listVisitors
- **OnModuleInit auto-cleanup** of expired active visits on server startup (credential deactivation, status=completed, checkedOutAt=validUntil)
- **VisitorController** with 8 role-protected REST endpoints: preregister (ADMIN/SUPERVISOR), check-in/out (ADMIN/SUPERVISOR/OPERATOR), cancel (ADMIN/SUPERVISOR), list/get visits and visitors
- **VisitorGateway** on `/ws/visitors` namespace emitting real-time events for preregistered, checked-in, checked-out, and cancelled
- **Shared Zod schemas** (preregisterSchema, checkInSchema, checkOutSchema, visitorQuerySchema) and TypeScript types (VisitorDto, VisitDto, PreregisterInput, CheckInInput, CheckOutInput)
- **Dashboard pages**: visitor list with visits/visitors tabs, status filtering, pagination, action buttons (check-in, check-out, cancel); visitor detail with info card and visit history table; pre-registration form with host selection, date pickers, zone restriction multi-select, and QR code success modal with download/print
- **Navigation sidebar** updated with "Visiteurs" link (visible to all authenticated users)
- **i18n** full French and English dictionaries for all visitor UI text

## Task Commits

Each task was committed atomically:

| # | Task | Type | Commit |
|---|------|------|--------|
| 1 | Database Models, Shared Types & Infrastructure | feat | `f676db7` |
| 2 | Visitor API — Pre-registration, Check-in/Out & Zone Enforcement | feat | `edbba3c` |
| 3 | Visitor Management Dashboard | feat | `bbe8528` |

## Files Created/Modified

### Created
- `apps/api/prisma/schema.prisma` — Visitor and Visit models with relations (modified existing)
- `apps/api/src/modules/visitor/visitor.module.ts` — Module wiring AccessModule + Redis provider
- `apps/api/src/modules/visitor/visitor.service.ts` — Full visitor lifecycle service (537 lines)
- `apps/api/src/modules/visitor/visitor.controller.ts` — 8 role-protected REST endpoints
- `apps/api/src/modules/visitor/visitor.gateway.ts` — Real-time event push on /ws/visitors
- `packages/shared/src/schemas/visitor.schema.ts` — Zod validation schemas
- `packages/shared/src/types/visitor.types.ts` — TypeScript type definitions
- `packages/shared/src/index.ts` — Added barrel exports (modified existing)
- `apps/api/src/app.module.ts` — Registered VisitorModule (modified existing)
- `apps/dashboard/lib/api.ts` — Added visitor API client functions (modified existing)
- `apps/dashboard/app/(dashboard)/visiteurs/page.tsx` — Visitor list page with tabs
- `apps/dashboard/app/(dashboard)/visiteurs/[id]/page.tsx` — Visitor detail page
- `apps/dashboard/app/(dashboard)/visiteurs/preinscription/page.tsx` — Pre-registration form
- `apps/dashboard/lib/nav-config.ts` — Added "Visiteurs" nav entry (modified existing)
- `apps/dashboard/lib/i18n/dictionaries/fr.ts` — French i18n strings (modified existing)
- `apps/dashboard/lib/i18n/dictionaries/en.ts` — English i18n strings (modified existing)

## Decisions Made

- **EventEmitter2 for visitor events**: No new BullMQ queues needed — visitor operations are synchronous and events are consumed by the existing correlation pipeline
- **Named relation 'VisitHost'**: Required to disambiguate User's multiple relation paths to Visit (resolver for Prisma schema validation)
- **Pitfall 3 mitigation**: On checkOut, credential.isActive is set to false immediately AND credential ID is added to Redis `credential:revoked:{id}` key with TTL matching the remaining visit duration
- **OnModuleInit auto-cleanup**: Server startup scans for visits where status="active" but validUntil < now, deactivates credentials, and marks visits as completed — handles credential reaping after restart/crash
- **Prisma.DbNull for empty zoneRestrictions**: Uses Prisma's DbNull sentinel instead of null to satisfy JSON field type constraints

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Prisma relation validation**: The Visit model's `host` relation to User required a named relation `"VisitHost"` because User already has multiple relation paths to other models. Added `hostedVisits Visit[] @relation("VisitHost")` on User and `@relation("VisitHost")` on Visit.
- **PageHeader prop mismatch**: Dashboard `PageHeader` component uses a structured `action` prop (label + icon + onClick) instead of `children`. Updated all three pages to use a header div pattern instead.
- **TypeScript JSON null handling**: Prisma's Json type requires `Prisma.DbNull` for null values instead of plain `null`. Updated `zoneRestrictions` assignment accordingly.

## Threat Surface Scan

No new security-relevant surface introduced beyond what was declared in the plan's threat model:
- All endpoints are role-protected per the plan (@Roles decorators match the plan spec)
- Visitor PII is site-scoped via host user's siteId
- Credential deactivation on check-out/cancel handles credential reuse (T-02-10)
- OPERATOR role is correctly restricted from preregister endpoint (T-02-13)

## Next Phase Readiness

- Visitor management fully functional for all roles
- Zone restriction enforcement leverages existing Phase 1 AccessService.evaluateAccess() — no additional work needed
- Visitor events emit on the existing event bus for the Phase 1 correlation pipeline to consume
- Ready for Phase 2 Plan 4 (ANPR/LPR) and Phase 2 Plan 5 (Incident Management) which may integrate visitor operations

## Self-Check: PASSED

All files verified:
- Prisma schema validates with Visitor and Visit models
- Prisma client generated successfully
- Shared package builds with zero errors
- API TypeScript compilation passes with zero errors
- Dashboard TypeScript compilation passes with zero errors
- All 3 dashboard page files exist
- Nav config includes "/visiteurs" entry
- i18n dictionaries include "visitors" section in both French and English

---

*Phase: 02-operational-ai*
*Completed: 2026-07-14*
