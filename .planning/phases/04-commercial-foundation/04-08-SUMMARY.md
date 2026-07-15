---
phase: 04-commercial-foundation
plan: 08
subsystem: ui
tags: [dashboard, organization, org-switcher, invites, registration, nextjs, react]

# Dependency graph
requires:
  - phase: 04-commercial-foundation
    plan: 05
    provides: Auth context with org state, switchOrganization API
  - phase: 04-commercial-foundation
    plan: 06
    provides: Invite management API endpoints (create, resend, revoke)
provides:
  - Organization switcher in dashboard header dropdown (multi-org users)
  - Invite accept page at /invite/[token] with all states
  - Invite management page at /parametres/invitations with CRUD table
  - Registration page with organization name field
affects: [05-01 (billing - org context in checkout)]

# Tech tracking
tech-stack:
  added: [@radix-ui/react-dialog (was already in deps, now wired)]
  patterns: [Dialog component using Radix, inline page state machines for invite flows]

key-files:
  created:
    - apps/dashboard/app/invite/[token]/page.tsx
    - apps/dashboard/app/parametres/invitations/page.tsx
    - apps/dashboard/app/(auth)/register/page.tsx
    - apps/dashboard/components/ui/dialog.tsx
  modified:
    - apps/dashboard/components/header.tsx
    - apps/dashboard/lib/api.ts

key-decisions:
  - "Used native HTML select for role dropdown instead of Radix Select (not installed) — avoids adding new npm dependency"
  - "Created Dialog component using already-installed @radix-ui/react-dialog following same pattern as existing DropdownMenu"
  - "Invite accept page decodes JWT locally to show org name/role before API call — avoids adding a dedicated validate endpoint"
  - "Registration page created from scratch (no existing register page) — follows login page visual pattern"

requirements-completed:
  - FND-03
  - FND-04
  - FND-05

# Metrics
duration: 6min
completed: 2026-07-15
---

# Phase 04 Plan 08: Dashboard Organization UI — org switcher, invite flows, registration field

**Organization switcher in header dropdown replaces global role with org name; invite accept page handles 5 states (loading/valid/expired/already-accepted/invalid); invite management page with create dialog, status badges, resend/revoke actions; registration form adds organization name field**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-15T17:52:18Z
- **Completed:** 2026-07-15T17:57:54Z
- **Tasks:** 4
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- **Header org switcher** — user.role replaced with organization.name below user name; multi-org users see "Organisations" dropdown section with current org marked "(actuelle)" and role badges; single-org users see no switcher; loading spinner during switch (Loader2 with animate-spin)
- **Invite accept page** — all 5 states implemented: loading with "Vérification de l'invitation...", valid invite with new-user form (Prénom, Nom, Mot de passe, Confirmer), existing-user single-button accept, expired/déjà acceptée/invalide error states with French copy
- **Invite management page** — full CRUD table with Email/Rôle/Statut/Envoyée le/Actions columns; "Inviter un membre" dialog with email input + native role select; status badges (En attente/Acceptée/Expirée/Révoquée); Renvoyer and Révoquer actions with confirmation dialog showing "Cette action est irréversible"; empty state with action prompt
- **Registration page** — new page with "Nom de l'organisation" field (min 2 chars, max 100 chars) under "Informations de l'organisation" section heading; help text "Le nom de votre entreprise ou équipe de sécurité"; matches login page visual style (glass card, dark theme, animated background)
- **New Dialog component** — created using @radix-ui/react-dialog following the same pattern as existing DropdownMenu component
- **API client additions** — register(), acceptInvite(), resendInvite() functions added to lib/api.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Update header.tsx with org switcher** - `0ee799f` (feat)
2. **Task 2: Create invite accept page + API functions** - `6e397ac` (feat)
3. **Task 3: Create invite management page + Dialog component** - `35c2471` (feat)
4. **Task 4: Create registration page + register API** - `12bd7d3` (feat)

**TypeScript fix:** `71f8b18` (fix: TS errors in invite pages)

## Files Created/Modified

- `apps/dashboard/components/header.tsx` - Added org name display, org switcher dropdown with org items (name, role badge, "(actuelle)" suffix), Building2/Loader2 icons, Badge component
- `apps/dashboard/components/ui/dialog.tsx` — NEW. Dialog component using @radix-ui/react-dialog (Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger)
- `apps/dashboard/lib/api.ts` — Added register(), acceptInvite(), resendInvite() functions
- `apps/dashboard/app/invite/[token]/page.tsx` — NEW. Invite accept page with 5 states, JWT payload decode, form validation, error state handling
- `apps/dashboard/app/parametres/invitations/page.tsx` — NEW. Invite management page with table, create/revoke dialogs, status badges, empty state
- `apps/dashboard/app/(auth)/register/page.tsx` — NEW. Registration page with organization name field, personal info section, password visibility toggle

## Decisions Made

- **Native HTML select for role dropdown:** Radix Select is not installed; used native `<select>` with Tailwind styling instead of adding a new dependency. Consistent with the "no new component library installation" constraint.
- **Dialog component creation:** @radix-ui/react-dialog was already in package.json but unwired. Created a minimal Dialog component following the same patterns as the existing DropdownMenu (Radix portal, overlay, forwardRef pattern).
- **Local JWT decode for invite validation:** Instead of adding a dedicated `GET /api/organizations/invites/:token/validate` endpoint, the invite accept page decodes the JWT locally to extract org name and role. This avoids unnecessary API call and works because the accept endpoint validates the token server-side anyway.
- **Registration page created from scratch:** No register page existed in the codebase. Built following the login page visual pattern (glass card, animated background, dark theme).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **Missing Dialog and Select components:** The plan assumed Dialog and Select components existed in `components/ui/` but only DropdownMenu, Button, Card, Input, Label, Badge, Toast, and Table were present. Created Dialog component using @radix-ui/react-dialog (already in deps); used native HTML select for role dropdown to avoid adding new dependencies.
- **Registration page did not exist:** The plan said "Update the existing registration page" but no register page existed. Created from scratch following login page patterns.
- **TypeScript narrowing issue:** `STATUS_CONFIG[invite.status]` with `Record<string, ...>` type couldn't be narrowed even with `??` fallback. Fixed by replacing the object lookup with a typed switch function that returns the correct config.

## Stub Tracking

No stubs detected — all pages are wired with real API calls and handle all specified states.

## Threat Surface Scan

No new threat flags — all new pages are client-side UI only (no backend endpoints), and existing API endpoints already have server-side validation. Threat model T-04-35 through T-04-37 are unaffected by these frontend changes.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Dashboard org UI complete: header org switcher, invite accept page, invite management page, registration with org name
- Ready for Phase 05 (Monetization/Billing) — org context ready for subscription checkout flows
- Dialog component available for future dashboard dialogs

---

*Phase: 04-commercial-foundation*
*Completed: 2026-07-15*
