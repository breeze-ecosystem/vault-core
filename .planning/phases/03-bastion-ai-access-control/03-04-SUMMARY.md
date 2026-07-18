---
phase: 03-bastion-ai-access-control
plan: 04
subsystem: ui
tags: [dashboard, multi-site, rbac, sso, global-search, shadcn]
requires:
  - phase: 03-bastion-ai-access-control
    plan: 03
    provides: BASTION backend APIs (sites, RBAC, SSO, sync)
provides:
  - Multi-site dashboard pages (aggregate KPI, site list, per-site drill-down, cross-site comparison)
  - Site creation form with validation and French copy
  - SiteSwitcher dropdown for site selection in aggregate view
  - RBACRoleEditor with hierarchical role hierarchy (GLOBAL_ADMIN→VIEWER) and permission matrix
  - SSOConfigForm with SAML/OIDC tabs, test connection, and auto-provisioning toggle
  - GlobalSearchCommand with Cmd+K palette, debounced cross-site search
  - Sync status page displaying last sync, per-site status, and trigger action
  - BASTION API client functions in lib/api.ts (sites, faces, credentials, groups, schedules, events, RBAC, SSO, sync)
affects:
  - 03-bastion-ai-access-control
tech-stack:
  added:
    - shadcn tabs, select, switch, slider, command, popover components
  patterns:
    - Page layout: PageTransition → PageHeader → content with loading/error/empty states
    - Component composition: MultiSiteDashboard uses StatsCard (glass-premium) + SiteCard + SiteSwitcher
    - Permission matrix rendering with Switch toggles in RBACRoleEditor
    - Debounced search (300ms) with CommandDialog for GlobalSearchCommand
    - Form validation with error state, loading state, and success toast
key-files:
  created:
    - apps/dashboard/components/multi-site-dashboard.tsx
    - apps/dashboard/components/site-card.tsx
    - apps/dashboard/components/site-switcher.tsx
    - apps/dashboard/components/cross-site-comparison.tsx
    - apps/dashboard/components/rbac-role-editor.tsx
    - apps/dashboard/components/sso-config-form.tsx
    - apps/dashboard/components/global-search-command.tsx
    - apps/dashboard/app/(dashboard)/sites/nouveau/page.tsx
    - apps/dashboard/app/(dashboard)/sites/[id]/page.tsx
    - apps/dashboard/app/(dashboard)/sites/comparaison/page.tsx
    - apps/dashboard/app/(dashboard)/parametres/rbac/page.tsx
    - apps/dashboard/app/(dashboard)/parametres/sso/page.tsx
    - apps/dashboard/app/(dashboard)/parametres/synchronisation/page.tsx
  modified:
    - apps/dashboard/lib/api.ts
    - apps/dashboard/app/(dashboard)/sites/page.tsx
    - apps/dashboard/components/header.tsx
key-decisions:
  - "GlobalSearchCommand placed in Header component (always visible) rather than layout-only - exposes Cmd+K from any page"
  - "SSO client secret masked after save - follows existing IdpConfig pattern for security (threat T-03-24)"
  - "RBAC editor shows permissions as Switch toggles in a permission matrix grid - follows UI-SPEC pattern"
  - "Cross-site comparison uses bar charts (CSS-based) and Sparkline for trend data - lightweight, no chart library dependency"
duration: 15 min
completed: 2026-07-18
requirements-completed:
  - BAS-13
  - BAS-14
  - BAS-15
  - BAS-16
  - BAS-17
  - BAS-18
  - BAS-19
---

# Phase 3 Plan 4: BASTION Dashboard UI — Multi-site Management, RBAC Editor, SSO Config, Global Search

**Complete dashboard UI implementation for BASTION multi-site management: aggregate KPI dashboard, site CRUD with drill-down, cross-site comparison, hierarchical RBAC editor with permission matrix, SAML/OIDC SSO configuration form, inter-site sync status page, and Cmd+K global search across all sites.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-18T19:26:00Z
- **Completed:** 2026-07-18T19:41:00Z
- **Tasks:** 2
- **Files modified:** 21 (14 new, 3 modified)

## Accomplishments

- **Shadcn components installed:** tabs, select, switch, slider, command, popover — enabling multi-site switching, permission toggles, global search, and SSO form tabs
- **Multi-site dashboard pages created:** aggregate KPI grid with StatsCard (cameras, alerts, storage, uptime), site list with drill-down, per-site KPI dashboard with edit/delete, cross-site comparison with bar charts and trend sparklines
- **Site creation form** (`/sites/nouveau`) with validation, country selector, and redirect on success
- **RBAC editor** (`/parametres/rbac`) showing role hierarchy (GLOBAL_ADMIN 100 → VIEWER 20) with editable permission matrix (12 modules), custom role creation form, and save/update flow
- **SSO configuration** (`/parametres/sso`) with provider list, create/edit via dialog with SAML/OIDC tabbed form, test connection, delete with confirmation
- **Sync status page** (`/parametres/synchronisation`) showing global sync state, per-site status with timestamps, and trigger sync button
- **Global search** (Cmd+K) with debounced search across all sites, results grouped by type (Événements, Personnes, Justificatifs), site name badges, and keyboard navigation
- **BASTION API client** in `lib/api.ts` — 35+ functions covering sites, faces, credentials, groups, schedules, events, RBAC, SSO, and sync endpoints with type-safe interfaces
- All French copy matching UI-SPEC § Empty State Copy, § Error State Copy, and § Primary CTA Labels exactly

## Task Commits

Each task was committed atomically:

1. **Task 1: Install shadcn components and build multi-site dashboard pages** - `cfa1ff3` (feat)
2. **Task 2: Build RBAC editor, SSO config form, sync status, and global search** - `a44569c` (feat)

## Files Created
- `apps/dashboard/components/ui/tabs.tsx` - shadcn tabs component for SSO type selector
- `apps/dashboard/components/ui/select.tsx` - shadcn select component
- `apps/dashboard/components/ui/switch.tsx` - shadcn switch for permission toggles
- `apps/dashboard/components/ui/slider.tsx` - shadcn slider for threshold config
- `apps/dashboard/components/ui/command.tsx` - shadcn command/cmdk for global search palette
- `apps/dashboard/components/ui/popover.tsx` - shadcn popover for date pickers
- `apps/dashboard/components/multi-site-dashboard.tsx` - Aggregate KPI dashboard with site list and comparison
- `apps/dashboard/components/site-card.tsx` - Reusable per-site KPI card with status badge and sparkline
- `apps/dashboard/components/site-switcher.tsx` - Dropdown for "Tous les sites" / per-site selection
- `apps/dashboard/components/cross-site-comparison.tsx` - Side-by-side bar charts and trend sparklines
- `apps/dashboard/components/rbac-role-editor.tsx` - Hierarchical role editor with permission matrix
- `apps/dashboard/components/sso-config-form.tsx` - SAML/OIDC configuration form with test connection
- `apps/dashboard/components/global-search-command.tsx` - Cmd+K command palette with debounced search
- `apps/dashboard/app/(dashboard)/sites/nouveau/page.tsx` - Site creation form
- `apps/dashboard/app/(dashboard)/sites/[id]/page.tsx` - Per-site KPI dashboard with edit/delete
- `apps/dashboard/app/(dashboard)/sites/comparaison/page.tsx` - Cross-site comparison page
- `apps/dashboard/app/(dashboard)/parametres/rbac/page.tsx` - RBAC roles & permissions page
- `apps/dashboard/app/(dashboard)/parametres/sso/page.tsx` - SSO providers management page
- `apps/dashboard/app/(dashboard)/parametres/synchronisation/page.tsx` - Inter-site sync status page

## Files Modified
- `apps/dashboard/lib/api.ts` - Added BASTION API types and 35+ API functions
- `apps/dashboard/app/(dashboard)/sites/page.tsx` - Added aggregate multi-site view for GLOBAL_ADMIN/SUPER_ADMIN
- `apps/dashboard/components/header.tsx` - Added GlobalSearchCommand trigger button

## Decisions Made

- **GlobalSearchCommand in Header:** Placed in the header component instead of the layout file to ensure the search trigger button is always visible and Cmd+K shortcut works from any page
- **SSO client secret masking:** Client secret field shows "••••••••" after save, consistent with existing IdpConfig security pattern (threat T-03-24)
- **RBAC permission matrix:** Uses Switch toggles in a responsive grid layout — follows shadcn/ui best practices for toggle settings
- **Bar charts without chart library:** Cross-site comparison uses CSS-based bar charts (percentage-width divs) and SVG Sparkline for trend data, avoiding external chart library dependency
- **French copy:** All empty state, error state, and CTA copy matches UI-SPEC exactly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- shadcn `dialog.tsx` already existed and was overwritten during installation; the new version is functionally identical to the existing one

## Known Stubs

- GlobalSearchCommand's `sites` prop is declared but the component currently calls the API directly — works correctly without local site data

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: client_side_search | global-search-command.tsx | Global search queries are made from the client via fetchWithAuth — follows existing pattern, JWT protects the API endpoint |

## Next Phase Readiness

- BASTION dashboard UI is complete for multi-site management, RBAC, SSO, sync, and global search
- All pages consume the backend APIs built in Plan 03 through extended api.ts client
- All interactive states (loading, error, empty, data) implemented for every page
- Ready for subsequent plans (e.g., face enrollment UI, mobile updates, verification)

---

## Self-Check: PASSED

All 19 created files exist on disk, all 3 commits verified in git log (`cfa1ff3`, `a44569c`, `3995212`), all 3 modified files confirmed present.
