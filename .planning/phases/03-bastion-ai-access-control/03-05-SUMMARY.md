---
phase: 03-bastion-ai-access-control
plan: 05
subsystem: ui
tags: [dashboard, bastion, face-recognition, access-control, credentials, schedules, groups, event-timeline]
requires:
  - phase: 03-bastion-ai-access-control
    plan: 03
    provides: BASTION backend APIs (face enrollment, extended access control, multi-site)
  - phase: 03-bastion-ai-access-control
    plan: 04
    provides: BASTION API client functions in lib/api.ts, multi-site dashboard UI
provides:
  - Extended visages page with BASTION face grid (unlimited faces, blacklist badge, risk score, passage count)
  - Face enrollment page (visages/nouveau) with photo upload, blacklist toggle, risk threshold slider, auto-unlock config
  - Face detail page (visages/[id]) with passage history timeline, anti-spoofing events, auto-unlock config
  - Access control tabs (credentials, groups, schedules, events) with new credential type filtering
  - Credential creation page (acces/nouveau) with type selector (BADGE/FINGERPRINT/QR/PIN) and dynamic form
  - Credential detail page (acces/[id]) with owner info, validity, correlated events, deactivation
  - Access group management page (acces/groupes) with CRUD and member count
  - Access schedule management page (acces/schedules) with day/hour grid editor
  - Supporting components (FaceGrid, FaceRiskScore, FacePassageHistory, LivenessIndicator, BlacklistToggle,
    CredentialTypeSelector, CredentialForm, AccessScheduleGrid, AccessGroupList, AccessEventTimeline,
    CorrelatedSnapshot, DetectionThresholdSlider, AbandonedObjectTimer, CrowdDensityDisplay)
affects:
  - 03-bastion-ai-access-control
tech-stack:
  added: []
  patterns:
    - BASTION feature gate detection via API fallback (try getBastionFaces → fall back to getFaces)
    - Credential form with conditional fields per type using switch/state pattern
    - Day/hour schedule grid with click-to-toggle and drag support
    - Timeline components with snapshot thumbnails and load-more pagination
    - Destructive action pattern via ConfirmationDialog for blacklist, delete, deactivate
    - French copy throughout matching UI-SPEC empty/error states verbatim
key-files:
  created:
    - apps/dashboard/components/face-grid.tsx
    - apps/dashboard/components/face-risk-score.tsx
    - apps/dashboard/components/face-passage-history.tsx
    - apps/dashboard/components/liveness-indicator.tsx
    - apps/dashboard/components/blacklist-toggle.tsx
    - apps/dashboard/components/credential-type-selector.tsx
    - apps/dashboard/components/credential-form.tsx
    - apps/dashboard/components/access-schedule-grid.tsx
    - apps/dashboard/components/access-group-list.tsx
    - apps/dashboard/components/access-event-timeline.tsx
    - apps/dashboard/components/correlated-snapshot.tsx
    - apps/dashboard/components/detection-threshold-slider.tsx
    - apps/dashboard/components/abandoned-object-timer.tsx
    - apps/dashboard/components/crowd-density-display.tsx
    - apps/dashboard/app/(dashboard)/visages/nouveau/page.tsx
    - apps/dashboard/app/(dashboard)/visages/[id]/page.tsx
    - apps/dashboard/app/(dashboard)/acces/nouveau/page.tsx
    - apps/dashboard/app/(dashboard)/acces/[id]/page.tsx
    - apps/dashboard/app/(dashboard)/acces/groupes/page.tsx
    - apps/dashboard/app/(dashboard)/acces/schedules/page.tsx
  modified:
    - apps/dashboard/app/(dashboard)/visages/page.tsx
    - apps/dashboard/app/(dashboard)/acces/page.tsx
key-decisions:
  - "BASTION activation detection via API: try getBastionFaces() on pageload → fall back to VISION faces if BASTION API unavailable"
  - "Credential type selector uses custom grid layout instead of shadcn Tabs for richer visual affordance (icons + descriptions)"
  - "Access schedule grid entries use normalized ScheduleEntry format (dayOfWeek, startHour/startMinute, endHour/endMinute) compatible with existing backend"
  - "Access event timeline filtered by type, date range with CorrelatedSnapshot dialog for snapshot/video playback"
  - "FaceGrid separates normal and blacklisted faces into visually distinct sections with red border on blacklisted cards"
duration: 7 min
completed: 2026-07-18
requirements-completed:
  - BAS-01
  - BAS-02
  - BAS-03
  - BAS-04
  - BAS-05
  - BAS-06
  - BAS-07
  - BAS-08
  - BAS-09
  - BAS-10
  - BAS-11
  - BAS-12
---

# Phase 3 Plan 5: BASTION Face Enrollment UI and Access Control Management UI

**Extended face management (unlimited BASTION faces, blacklist, risk scores, passage history) and access control management UI (credential creation for all types, groups, schedules, event timeline with video correlation)**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-18T19:33:00Z
- **Completed:** 2026-07-18T19:40:08Z
- **Tasks:** 2
- **Files modified:** 22 (20 new, 2 modified)

## Accomplishments

- **BASTION Face Grid** — FaceGrid component with unlimited faces, blacklist badge, risk score gauge, passage count. Cards are grouped with normal faces first, blacklisted faces in separate section with red border. Search bar with name filtering.
- **Face Enrollment Flow** (`visages/nouveau`) — Photo upload via FaceUploadDropzone, name input, blacklist toggle with risk threshold slider (0-100), auto-unlock config with confidence threshold slider. Error state per UI-SPEC: "L'enrôlement a échoué. Vérifiez la qualité de la photo (visage net, bien éclairé) et réessayez."
- **Face Detail Page** (`visages/[id]`) — Photo, name (editable), enrollment date, risk threshold slider, blacklist toggle with confirmation, passage history timeline (FacePassageHistory), anti-spoofing events section (LivenessIndicator), auto-unlock config CTA, delete with confirmation.
- **Face Components** — FaceRiskScore with success/warning/muted color mapping (85+ green, 60-84 amber), FacePassageHistory with snapshot thumbnails and load-more pagination, LivenessIndicator with spoof/genuine/uncertain badges and tooltip, BlacklistToggle with ConfirmationDialog per destructive action pattern.
- **Credential Type Selector** — Grid-based type selector with BADGE (cyan), FINGERPRINT (pink), QR (amber), PIN (purple) — each with icon, label, and description.
- **Credential Form** — Dynamic fields per type: badge number for BADGE, fingerprint scan simulation for FINGERPRINT, generate/manual QR for QR, PIN with confirmation for PIN. Common expiry fields (date range, max uses).
- **Access Schedule Grid Editor** — 7 day × 7 time-slot grid with click-to-toggle cells, drag-to-toggle, default time range apply-all, read-only preview mode.
- **Access Group List** — Group cards with expandable members section, create dialog, delete confirmation, member count.
- **Access Event Timeline** — Filters (type, date range), color-coded event dots (green=granted, red=denied/forced, amber=held-open), snapshot thumbnails, "Voir la vidéo 10s" button, CorrelatedSnapshot dialog with metadata (door, person, timestamp, decision, chain-of-custody hash).
- **Detection & Crowd Components** — DetectionThresholdSlider with configurable percentage range, AbandonedObjectTimer with 1-60 min range, CrowdDensityDisplay with count, density % bar, threshold warning badge.
- **BASTION Feature Gating** — visages page detects BASTION via API call: if getBastionFaces succeeds, show BASTION UI with FaceGrid; if it fails, show existing VISION face management unchanged.
- **Access Tabs** — acces page now has tabs: Justificatifs | Groupes d'accès | Horaires | Événements. New credential type badges (FINGERPRINT: pink, FACE: blue).

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend face management UI for BASTION** - `302315e` (feat)
2. **Task 2: Build access control management UI** - `f0011d0` (feat)

**Plan metadata:** (pending — this summary commit)

## Files Created

- `apps/dashboard/components/face-grid.tsx` - BASTION face grid with normal/blacklisted sections, search, risk score
- `apps/dashboard/components/face-risk-score.tsx` - Risk score 0-100 with color mapping (success/warning/muted)
- `apps/dashboard/components/face-passage-history.tsx` - Passage timeline with snapshots, liveness indicator, load-more
- `apps/dashboard/components/liveness-indicator.tsx` - Anti-spoofing badge with tooltip (spoof/genuine/uncertain)
- `apps/dashboard/components/blacklist-toggle.tsx` - Switch + ConfirmationDialog for blacklist management
- `apps/dashboard/components/credential-type-selector.tsx` - Grid type selector (BADGE/FINGERPRINT/QR/PIN)
- `apps/dashboard/components/credential-form.tsx` - Dynamic form per credential type with expiry fields
- `apps/dashboard/components/access-schedule-grid.tsx` - Day/hour grid editor with toggleable cells
- `apps/dashboard/components/access-group-list.tsx` - Group CRUD with expandable member management
- `apps/dashboard/components/access-event-timeline.tsx` - Timeline with filters, snapshots, video buttons
- `apps/dashboard/components/correlated-snapshot.tsx` - Dialog showing snapshot + video + event metadata
- `apps/dashboard/components/detection-threshold-slider.tsx` - Percentage slider for AI detection thresholds
- `apps/dashboard/components/abandoned-object-timer.tsx` - Minute config for abandoned object detection
- `apps/dashboard/components/crowd-density-display.tsx` - Crowd count widget with density bar and warning
- `apps/dashboard/app/(dashboard)/visages/nouveau/page.tsx` - BASTION face enrollment page
- `apps/dashboard/app/(dashboard)/visages/[id]/page.tsx` - BASTION face detail page
- `apps/dashboard/app/(dashboard)/acces/nouveau/page.tsx` - Credential creation page
- `apps/dashboard/app/(dashboard)/acces/[id]/page.tsx` - Credential detail page
- `apps/dashboard/app/(dashboard)/acces/groupes/page.tsx` - Access group management page
- `apps/dashboard/app/(dashboard)/acces/schedules/page.tsx` - Access schedule management page

## Files Modified

- `apps/dashboard/app/(dashboard)/visages/page.tsx` - Extended with BASTION face grid (API fallback detection)
- `apps/dashboard/app/(dashboard)/acces/page.tsx` - Extended with tabs and new credential types

## Decisions Made

- **BASTION detection via API fallback** — Frontend tries `getBastionFaces()` on pageload. If it succeeds, BASTION UI is shown. If it fails (404/403), the existing VISION face management UI is shown unchanged. This avoids requiring BASTION feature flags in the auth context.
- **Credential type selector as grid** — Uses a custom button grid instead of shadcn Tabs to provide richer visual affordances (type-specific icons + color coding + descriptions) matching UI-SPEC interaction pattern.
- **Schedule entry format** — Uses normalized `ScheduleEntry[]` format with `dayOfWeek` (0-6), `startHour`, `startMinute`, `endHour`, `endMinute`, compatible with existing backend schedule evaluation.
- **Access event timeline filter** — Uses client-side filter state (type dropdown + date range inputs) with a "Filtrer" button to reload events from the API.
- **CorrelatedSnapshot dialog** — Displays snapshot image, optional 10s video clip, and metadata panel with door, person, timestamp, decision, and event ID (chain-of-custody hash).
- **Face grid visual grouping** — Normal faces and blacklisted faces shown in separate visually distinct sections. Blacklisted cards get `border-destructive/30` with red ring and "Liste noire" badge overlay.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- No `deleteCredential` function existed in `lib/api.ts` — used `deactivateCredential` (DELETE endpoint) for both deactivation and permanent deletion. The API already handles soft-delete via the DELETE method.

## Threat Surface Scan

No new threat flags introduced — all UI components follow existing patterns for JWT-authenticated API calls via `fetchWithAuth()`.

## Self-Check: PASSED

All 22 key files exist (20 new, 2 modified), both commits verified. All automated acceptance criteria pass.

---

*Phase: 03-bastion-ai-access-control*
*Completed: 2026-07-18*
