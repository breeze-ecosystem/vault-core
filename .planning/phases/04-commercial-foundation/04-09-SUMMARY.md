---
phase: 04-commercial-foundation
plan: 09
subsystem: mobile
tags: [expo, react-native, multi-tenant, org-switcher, auth, mobile-ui]

requires:
  - phase: 04-commercial-foundation
    plan: 04a
    provides: Multi-tenant auth with switch-org API endpoint
  - phase: 04-commercial-foundation
    plan: 05
    provides: Dashboard org-switcher component pattern

provides:
  - Mobile organization state in auth context (organization, organizations, switchOrganization)
  - Organization persistence in expo-secure-store matching user token pattern
  - Mobile OrgSwitcher component with bottom sheet (Modal pattern)
  - Organization display and switching in profile/settings screen
  - Organization API client functions (fetchOrganization, createOrganization)

affects:
  - 04-10 (if any mobile screens need org context)
  - Future mobile guard/operator workflows

tech-stack:
  added: []
  patterns:
    - Mobile org persistence in SecureStore (saveOrganization/getOrganizationAsync)
    - Mobile OrgSwitcher using Modal + ScrollView bottom sheet pattern
    - Auth context init loads org state from SecureStore alongside user state

key-files:
  created:
    - apps/mobile/components/org-switcher.tsx
  modified:
    - apps/mobile/lib/auth-context.tsx
    - apps/mobile/lib/auth-client.ts
    - apps/mobile/lib/auth-storage.ts
    - apps/mobile/app/(tabs)/settings.tsx
    - apps/mobile/lib/api.ts

key-decisions:
  - "Org state persisted in SecureStore alongside tokens/user — matches existing mobile patterns"
  - "OrgSwitcher uses React Native Modal (not a third-party Sheet library) — avoids new dependencies, consistent with existing mobile-only patterns"
  - "Settings screen used as profile page (mobile has no separate profile.tsx) — OrgSwitcher integrated below profile card"

requirements-completed:
  - FND-03
  - FND-05

duration: 2min
completed: 2026-07-15
---

# Phase 04 Plan 09: Mobile Org Switcher Summary

**Mobile organization switching: auth context with org state persisted in SecureStore, bottom-sheet OrgSwitcher component, organization display in settings screen, and org API client functions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-15T18:00:00Z
- **Completed:** 2026-07-15T18:02:23Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Mobile auth context (auth-context.tsx) now initializes organization state from SecureStore, populates organizations list on login/switch, and clears on logout
- Mobile auth client (auth-client.ts) persists organization data alongside tokens in all auth flows (login, refresh, switchOrganization)
- Mobile auth storage (auth-storage.ts) added saveOrganization/getOrganizationAsync/saveOrganizations/getOrganizationsAsync matching existing user storage pattern
- Created OrgSwitcher component with Modal-based bottom sheet: Building2 trigger, "Organisations" title, scrollable org list with 48px touch targets, current org indicator with checkmark
- Integrated OrgSwitcher into settings screen profile section with current organization name display
- Added fetchOrganization() and createOrganization() to mobile api.ts using /api/organizations path

## Task Commits

Each task was committed atomically:

1. **Task 1: Update mobile auth-context and auth-client for organization state** - `53acbe0` (feat)
2. **Task 2: Create mobile org-switcher component with bottom sheet** - `c3f2958` (feat)
3. **Task 3: Integrate org-switcher into settings screen and add org API functions** - `b5d9cc0` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `apps/mobile/components/org-switcher.tsx` — **NEW** OrgSwitcher component with Modal bottom sheet, Building2 trigger, org list with role badges and current org indicator
- `apps/mobile/lib/auth-context.tsx` — `organization`, `organizations`, `switchOrganization` state wired through init, login, logout lifecycle; loads org from SecureStore on init
- `apps/mobile/lib/auth-client.ts` — Persists organization data in login, refreshTokens, switchOrganization; added organizations field to AuthResult interface
- `apps/mobile/lib/auth-storage.ts` — Added ORGANIZATION_KEY/ORGANIZATIONS_KEY constants, saveOrganization/getOrganizationAsync/saveOrganizations/getOrganizationsAsync functions, expanded clearAuth
- `apps/mobile/app/(tabs)/settings.tsx` — Imported OrgSwitcher and useAuth().organization; displays current org name below profile card with org switcher trigger
- `apps/mobile/lib/api.ts` — Added fetchOrganization(orgId) and createOrganization(data) functions with /api/organizations path

## Decisions Made

- **SecureStore for org persistence:** Organization and organizations list stored in expo-secure-store matching the existing user/token storage pattern — no new storage mechanism needed.
- **React Native Modal for bottom sheet:** Used built-in Modal + TouchableOpacity overlay instead of a third-party Sheet library to avoid adding dependencies. Pattern matches existing mobile-only architecture.
- **Settings screen as profile page:** The mobile app uses settings.tsx as its profile/user area (no separate profile.tsx exists). OrgSwitcher and organization name integrated into the profile section of this screen.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors in unrelated mobile files (cameras.tsx, index.tsx, sites.tsx, etc.) from the Site→Organization schema migration — these are out of scope for this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Mobile organization switching complete: auth context with org state, bottom-sheet switcher component, settings screen integration
- Ready for any remaining Phase 04 plans
- Note: mobile API types still reference `siteId`/`site` in some places — will be resolved when those screens are updated for multi-tenant patterns

## Self-Check: PASSED

- [x] All 3 tasks executed and committed
- [x] `switchOrganization` in auth-context.tsx: 5 matches ✓
- [x] `switchOrganization` in auth-client.ts: 1 match ✓
- [x] `OrgSwitcher` in settings.tsx: 2 matches (import + render) ✓
- [x] `fetchOrganization`/`createOrganization` in api.ts: 2 functions added ✓
- [x] `apps/mobile/components/org-switcher.tsx` exists with `Building2` (3 matches) ✓
- [x] All 3 commits present in git log
- [x] SUMMARY.md created with substantive content

---

*Phase: 04-commercial-foundation*
*Completed: 2026-07-15*
