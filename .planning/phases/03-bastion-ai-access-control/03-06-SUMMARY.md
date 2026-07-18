---
phase: 03-bastion-ai-access-control
plan: 06
subsystem: mobile
tags: ["expo", "react-native", "face-enrollment", "camera", "site-switcher", "access-events", "pytest", "jest", "integration-tests"]

requires:
  - phase: 03-bastion-ai-access-control
    provides: BASTION API endpoints for face enrollment, sites, and access events
  - phase: 02-vision-pack
    provides: Expo mobile app structure, expo-camera, API client pattern

provides:
  - Mobile face enrollment with camera capture and upload to API
  - Site switcher with bottom sheet for multi-site selection
  - Access event timeline with correlated snapshot viewer
  - AI Preprocessor integration tests for BASTION detection pipeline
  - Jest unit tests for BastionService face operations
  - Jest unit tests for SiteService multi-site operations

affects: []
tech-stack:
  added: []
  patterns:
    - "Site context provider pattern for multi-site mobile navigation"
    - "Camera capture → preview → upload enrollment flow on mobile"
    - "expo-file-system base64 encoding for photo upload"
    - "Bottom sheet site selector with modal overlay"

key-files:
  created:
    - apps/mobile/app/visages/enroler.tsx
    - apps/mobile/components/site-switcher.tsx
    - apps/mobile/lib/site-context.tsx
    - apps/mobile/app/visages/index.tsx
    - apps/mobile/components/access-event-list.tsx
    - apps/mobile/components/correlated-snapshot-viewer.tsx
    - services/ai-preprocessor/tests/test_bastion_detection.py
    - apps/api/src/modules/bastion/tests/face.service.spec.ts
    - apps/api/src/modules/multi-site/tests/site.service.spec.ts
  modified:
    - apps/mobile/lib/api.ts
    - apps/mobile/app/_layout.tsx
    - apps/mobile/app/(tabs)/acces/index.tsx

key-decisions:
  - "Used expo-file-system for base64 photo encoding instead of FileReader (not available in React Native)"
  - "BASTION access events gated by user role (GLOBAL_ADMIN, SUPER_ADMIN, ADMIN) rather than explicit feature-flag check"
  - "visages/index.tsx created as standalone page; existing visages/ajouter.tsx remains for VISION packs"
  - "SiteContext supports null currentSiteId for aggregate 'Tous les sites' view"

requirements-completed:
  - BAS-01
  - BAS-03
  - BAS-04
  - BAS-05
  - BAS-06
  - BAS-07
  - BAS-08
  - BAS-09
  - BAS-10
  - BAS-13
  - BAS-14

duration: "X min"
completed: "2026-07-18"
---

# Phase 03 Plan 06: BASTION Mobile Screens & Integration Tests

**Mobile face enrollment with camera capture, site switcher, access event timeline, and integration test suites for the BASTION detection pipeline, API, and multi-site services**

## Performance

- **Duration:** [time]
- **Started:** [start time]
- **Completed:** [end time]
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- **Mobile face enrollment (enroler.tsx):** Full camera capture screen with oval face guide, preview/review mode with retake, name input, blacklist toggle, and API upload via expo-file-system base64 encoding
- **Site switcher (site-switcher.tsx):** Bottom sheet modal component with "Tous les sites" option, per-site online/offline status badges, camera count, and city display
- **Site context (site-context.tsx):** React Context provider wrapping the app, exposing sites, currentSiteId, and refresh for multi-site navigation
- **Access event list (access-event-list.tsx):** Scrollable timeline with color-coded decision dots (green/red/amber), snapshot thumbnail indicators, and credential type badges
- **Correlated snapshot viewer (correlated-snapshot-viewer.tsx):** Full-screen modal with image viewer, 10s video clip button, event metadata display, and decision badge
- **Access screen events tab:** New "Événements" tab added to acces/index.tsx, gated by BASTION pack (user role check), loads AccessEventList with pull-to-refresh
- **AI Preprocessor integration tests:** 7 pytest tests covering response structure, weapon detection, abandoned objects, crowd counting, dark frame face skip, behavior analysis — using FastAPI TestClient with synthetic frames
- **Face service Jest tests:** 10 tests covering listFaces (paginated, blacklist filter, empty), getFace (found/not found), updateFace (name update, not found), deleteFace (Prisma+Qdrant cleanup, not found), toggleBlacklist (true/false, not found)
- **Site service Jest tests:** 10 tests covering findAll (child sites, empty), create (success, maxSites enforcement, not found parent), findById, getAggregateStats (with data, empty), globalSearch (with tagging, empty sites), update, remove

## Task Commits

Each task was committed atomically:

1. **Task 1: Build mobile face enrollment screen and site switcher** - `cd28515` (feat)
2. **Task 2: Build mobile access event log and integration tests** - `c111e48` (feat)

**Plan metadata:** (pending final commit)

_Note: TDD tasks may have multiple commits (test → feat → refactor)_

## Files Created/Modified

- `apps/mobile/lib/api.ts` - Added BASTION API client functions: enrollFace, getBastionFaces, getSites, getAccessEvents, getAccessEvent; added FINGERPRINT (#ec4899) and FACE (#3b82f6) TYPE_COLORS; exported BastionFaceEntry, Site, AccessEvent, AccessEventDetail interfaces
- `apps/mobile/app/_layout.tsx` - Added SiteProvider wrapper around app; added enroler route to Stack navigator
- `apps/mobile/app/visages/enroler.tsx` (NEW) - Camera face enrollment with oval guide, preview/review, name input, blacklist toggle, expo-camera capture, expo-file-system base64 upload
- `apps/mobile/app/visages/index.tsx` (NEW) - Face list with BASTION feature (FAB, blacklist badge, empty state with CTA)
- `apps/mobile/components/site-switcher.tsx` (NEW) - Bottom sheet site selector with "Tous les sites" option, active dot, online/offline badge, camera count
- `apps/mobile/lib/site-context.tsx` (NEW) - React Context for site switching, fetches sites from API, provides currentSiteId/setCurrentSiteId
- `apps/mobile/app/(tabs)/acces/index.tsx` - Added "events" tab with BASTION feature gate, AccessEventList integration, CorrelatedSnapshotViewer modal, FINGERPRINT/FACE type colors
- `apps/mobile/components/access-event-list.tsx` (NEW) - Scrollable timeline with FlashList, color-coded dots, decision labels, snapshot thumbnails
- `apps/mobile/components/correlated-snapshot-viewer.tsx` (NEW) - Full-screen modal with image, 10s video button, event metadata, decision badge
- `services/ai-preprocessor/tests/test_bastion_detection.py` (NEW) - 7 pytest integration tests using FastAPI TestClient with synthetic frames
- `apps/api/src/modules/bastion/tests/face.service.spec.ts` (NEW) - 10 Jest tests for BastionService face operations
- `apps/api/src/modules/multi-site/tests/site.service.spec.ts` (NEW) - 10 Jest tests for SiteService multi-site operations

## Decisions Made

- Used `expo-file-system` for base64 photo encoding instead of `FileReader` (not available in React Native runtime) — follows existing codebase pattern from `photo-capture.tsx`
- BASTION access events gated by user role (`GLOBAL_ADMIN`, `SUPER_ADMIN`, `ADMIN`) as proxy for BASTION feature flag — can be enhanced with explicit feature-flag check later
- `visages/index.tsx` created as standalone BASTION face list; existing `visages/ajouter.tsx` remains for VISION pack (50-face max) — both coexist via Expo Router file-based routing
- Site context supports `null` currentSiteId for aggregate "Tous les sites" view — parent org navigates without filtering to a specific child site

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All mobile BASTION screens (face enrollment, site switcher, access event log) ready for integration with real API endpoints
- AI Preprocessor BASTION detection pipeline has test coverage for all detection types
- BastionService and SiteService have comprehensive unit test coverage
- Ready for next plan (integration testing and verification)

---

*Phase: 03-bastion-ai-access-control*
*Completed: 2026-07-18*
