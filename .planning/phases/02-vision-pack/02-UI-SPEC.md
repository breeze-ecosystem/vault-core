---
phase: 2
slug: vision-pack
status: draft
reviewed_at:
shadcn_initialized: true
preset: shadcn/ui default (slate base, CSS variables, dark mode) — inherited from Phase 1
created: 2026-07-18
---

# Phase 2 — UI Design Contract

> Visual and interaction contract for the VISION Pack (VIS-01 to VIS-23). Covers vault-os (Next.js dashboard) and vault-os mobile (Expo) UI. Inherits all Phase 1 design decisions. Does NOT redesign the existing aesthetic.

---

## Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | shadcn/ui (vault-os dashboard) | Inherited from Phase 1, `components.json` verified |
| Component library | shadcn/ui — 16 existing components; no new Radix wrappers | Inherited from Phase 1 |
| Icon library | lucide-react (dashboard), lucide-react-native (mobile) | Inherited from Phase 1 |
| Font (dashboard) | IBM Plex Sans (sans, weights 300-700), JetBrains Mono (mono, weights 400-600) | Inherited from Phase 1, `tailwind.config.ts` confirmed |
| Font (mobile) | System default (SF Pro / Roboto) via `typography` object from `@repo/design` | Inherited from Phase 1 |
| Design tokens | `@repo/design/src/` — colors, typography (4-size scale), spacing (9-step scale) | Inherited from Phase 1 |
| Theme | Dark-first. `html class="dark"` default. Light theme declared but never forced. | Inherited from Phase 1, `globals.css` confirmed |
| Glass system | 3 tiers: `glass`, `glass-premium`, `glass-accent` — all exist in `globals.css` | Inherited from Phase 1 |
| Glow system | 3 colors: `glow-cyan`, `glow-red`, `glow-amber` — all exist in `globals.css` | Inherited from Phase 1 |
| Animation | Tailwind custom: `fade-in`, `slide-up`, `pulse-slow`, `data-flow` | Inherited from Phase 1, `tailwind.config.ts` confirmed |
| Motion library | `motion/react` (framer-motion v12+) — used in `CameraGrid`, `GlassCard`, `PageTransition` | Inherited from Phase 1 |
| CSS utilities | `cn()` (clsx + tailwind-merge), `bg-grid`, `bg-scan`, `status-pulse`, `tabular-nums`, `stat-value`, `section-title` | Inherited from Phase 1 |
| Mobile theme | `@/lib/theme.ts` — `colors`, `typography`, `spacing` from `@repo/design`, `createStyles()` helper | Inherited from Phase 1 |
| Mobile constants | `@/lib/constants.ts` — `severityColors`, `statusColors`, `alertStatusColors` | Inherited from Phase 1 |
| Mobile components | `CameraCard`, `AlertCard`, `QuickActionButton` — existing patterns to reuse | Inherited from Phase 1 |
| Mobile lists | `@shopify/flash-list` — virtualized list pattern for cameras, alerts, timeline | Inherited from Phase 1 |
| Mobile tabs | Expo Router tabs: Accueil, Caméras, Incidents, Garde, Plus — tab bar at bottom | Inherited from Phase 1 |

**Design direction:** All VISION pages inherit the existing dark, premium-cyber aesthetic with glass morphism cards, cyan accents, subtle grid backgrounds, and scan-line overlays. New VISION pages are NOT a redesign — they are additive pages within the established system. The camera live view, settings panels, and mobile stream viewer follow the same visual language.

---

## Spacing Scale

Declared values (multiples of 4) — Tailwind defaults + `@repo/design` already established:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, badge padding, inline metadata spacing |
| sm | 8px | Compact element spacing, status dot gaps, chip padding |
| md | 12px | Button padding, form field gaps, element interior spacing |
| base | 16px | Default card padding, list item padding, form group gaps |
| lg | 24px | Section padding, grid gaps, modal padding |
| xl | 32px | Layout gaps, wizard card padding, page section separation |
| xxl | 48px | Major section breaks, page-level spacing |
| xxxl | 64px | Page-level spacing, hero areas, camera grid margins |
| xxxxl | 96px | Maximum layout gaps |

**Phase-specific exceptions:**

| Context | Exception | Rationale |
|---------|-----------|-----------|
| Camera grid thumbnails | `aspect-video` forced, `gap-2` (8px) for compact multi-camera layout | Maximize camera tiles visible in viewport |
| Live view fullscreen | **No padding** — stream fills entire viewport, overlay controls use `p-4` (16px) minimum | Immersive viewing, controls on hover |
| Timeline event items | `py-3 px-4` (12px vertical, 16px horizontal) — denser than default card | Information-dense scroll feed |
| Stream share link display | `p-6` (24px) with larger copy area | Link is primary interaction, needs breathing room |
| Detection zone drawing canvas | Full-width/height, tool palette `p-2` (8px) compact | Maximize drawing area, tools as overlay |
| Mobile camera viewer | Controls at `padding: spacing.lg` (24px) from edges | Avoid notch/dynamic island overlap |
| Mobile tap targets | **Minimum 44pt height** for all interactive stream controls | Apple HIG / Android accessibility |
| Geofencing status bar | `py-2 px-4` (8px vertical, 16px horizontal) — compact banner | Non-intrusive, always-visible status |

---

## Typography

### vault-os Dashboard (IBM Plex Sans + JetBrains Mono)

Same 4-size scale established in Phase 1 — unchanged.

| Role | Size | Weight | Line Height | Usage — VISION-specific |
|------|------|--------|-------------|--------------------------|
| Body + Input | 14px (`text-sm`) | 400 | 1.5 | Camera names, event descriptions, settings labels, table cells |
| Label + Caption | 12px (`text-xs`) | 600 | 1.25 | Stream status badges, camera resolution/FPS, timestamps, section titles, detection zone labels, geofencing status |
| Heading | 16px (`text-base`) | 600 | 1.25 | Card titles (camera settings, alert details, recording config), dialog titles, section headings |
| Display + Stat | 24px (`text-2xl`) | 600 | 1.2 | Page titles ("Caméras", "Alertes"), camera count, recording retention stat, stream quality indicator |
| Mono stat | 24px (`text-2xl` + `font-mono`) | 600 | 1.2 | FPS counter, bitrate readout, storage usage numbers, event count |

### Mobile Expo App (system fonts via `@repo/design/typography`)

Same 4-size canonical scale from Phase 1 — unchanged.

| Role | Size | Weight | Line Height | Usage — VISION-specific |
|------|------|--------|-------------|--------------------------|
| Display | 28px (`typography.display`) | 600 | 1.2 | Page titles, camera count |
| Heading | 20px (`typography.heading`) | 600 | 1.2 | Camera name in viewer, event detail titles |
| Body | 14px (`typography.body`) | 400 | 1.5 | Camera list items, alert text, event descriptions |
| Label | 12px (`typography.label`) | 600 | 1.2 | Status badges, timestamps, FPS/quality indicators, settings labels |

**Monospace usage:** JetBrains Mono (dashboard) / system monospace (mobile) for: FPS counters, bitrate, stream URL, storage stats, license capacities.

---

## Color

### vault-os Dashboard (existing HSL tokens — reuse, do NOT modify)

All values are HSL from `globals.css`. Dark theme is default. Phase 2 introduces **no new color tokens**.

| Role | HSL Value | VISION-Specific Reservation |
|------|-----------|-----------------------------|
| Dominant (60%) | 228 20% 4% (`--shadcn-background`) | Camera grid page background, timeline background, settings pages |
| Secondary (30%) | 228 24% 6% (`--shadcn-card`) | Camera settings cards, recording config cards, event timeline cards, geofencing status card |
| Accent (10%) | 190 90% 50% (`--shadcn-primary`) | **Reserved for:** Live stream play button, active camera border, stream share CTA, save settings button, detection zone active state, recording indicator, mode absence active badge, ONVIF scan button, face upload CTA |
| Muted foreground | 228 10% 56% (`--shadcn-muted-foreground`) | Camera subtitle text, timeline metadata, helper text, settings descriptions |
| Border | 228 16% 16% (`--shadcn-border`) | Camera thumbnails, card borders, timeline dividers, detection zone polygons |
| Destructive | 0 84% 60% (`--shadcn-destructive`) | **Reserved for:** Camera offline indicator, alert severity CRITICAL, destructive settings (delete recording, remove user), disconnect stream warning |
| Warning | 35 92% 50% (`--shadcn-warning`) | **Reserved for:** Degraded stream quality, storage near capacity, geofencing timeout warning, DND active indicator |
| Success | 160 84% 39% (`--shadcn-success`) | **Reserved for:** Camera ONLINE status dot, mode absence armed indicator, stream connected, face recognized badge, recording active indicator |
| Ring | 190 90% 50% (`--shadcn-ring`) | Focus rings on camera grid, settings inputs, detection zone controls |

### Status Dot Colors (existing pattern — extend for VISION)

| Status | Color | Usage |
|--------|-------|-------|
| ONLINE | `#22c55e` (green) | Camera online, stream connected |
| OFFLINE | `#dc2626` (red) | Camera offline, stream disconnected |
| MAINTENANCE | `#f97316` (orange) | Camera in maintenance mode |
| DEGRADED | `#eab308` (yellow) | Poor connection, substream fallback |
| RECORDING | `#ef4444` (red) | Red pulsing dot when camera is recording |
| DETECTING | `#06b6d4` (cyan) | AI detection active on camera |
| SHARING | `#10b981` (green) | Stream currently shared with third party |

### Mobile Colors (existing — reuse from `@repo/design`)

```typescript
// From apps/mobile/lib/theme.ts — already established
colors.bg       = "#070912"    // Camera grid, timeline, settings
colors.surface  = "#0c1020"    // Cards, camera cards, event cards
colors.primary  = "#06b6d4"    // Buttons, active states, stream play
colors.success  = "#10b981"    // Online status, armed mode
colors.warning  = "#f59e0b"    // DND active, degraded quality
colors.destructive = "#ef4444" // Offline, errors, critical alerts
```

---

## Component Inventory

### Existing shadcn/ui Components (16 — reuse directly)

| Component | File | VISION Usage |
|-----------|------|--------------|
| Button | `components/ui/button.tsx` | Stream controls, save settings, ONVIF scan, export clip, add face, invite user, share link, arm/disarm |
| Card | `components/ui/card.tsx` | Camera settings panels, recording config, alert details, user management cards |
| Input | `components/ui/input.tsx` | Camera name/IP edit, search timeline, retention days, face name, user email, share duration |
| Badge | `components/ui/badge.tsx` | Camera status, stream quality (HD/SD), recording mode, AI detection type, face match state, DND active |
| Dialog | `components/ui/dialog.tsx` | Confirm delete recording, confirm remove user, generate share link, confirm arm/disarm, invite user form |
| Progress | `components/ui/progress.tsx` | Storage usage, recording retention progress, face upload progress |
| Separator | `components/ui/separator.tsx` | Settings section dividers, timeline event separators |
| Skeleton | `components/ui/skeleton.tsx` | Camera grid loading, timeline loading, settings skeleton |
| Toast | `components/ui/toast.tsx` | Alert fired, clip exported, share link copied, user invited, settings saved |
| Tooltip | `components/ui/tooltip.tsx` | Camera tooltips, feature explanations, button helpers |
| Avatar | `components/ui/avatar.tsx` | User avatars in multi-user management, face thumbnails |
| DropdownMenu | `components/ui/dropdown-menu.tsx` | Camera actions (settings, share, delete), user role selection, retention period selector |
| ScrollArea | `components/ui/scroll-area.tsx` | Timeline scroll, settings page scroll, long face list |
| Sheet | `components/ui/sheet.tsx` | Camera detail side panel (from grid), notification side panel |
| Table | `components/ui/table.tsx` | User list (multi-user management), event list (timeline), face list |
| Label | `components/ui/label.tsx` | Form labels in all settings forms |

### Existing Custom Components (reuse/extend)

| Component | File | VISION Usage |
|-----------|------|--------------|
| GlassCard | `components/glass-card.tsx` | Camera settings groups, recording config cards, timeline filter panel |
| CameraGrid | `components/camera-grid.tsx` | **Primary** — live camera grid on dashboard home. Extend with click-to-fullscreen, status overlays, recording indicator |
| CameraCardPremium | `components/camera-card-premium.tsx` | Enhanced camera cards for live view page, hover-to-preview |
| VideoPlayer | `components/video-player.tsx` | **Core** — live stream viewer, already has connection states, fullscreen, PTZ. Extend with: substream toggle (HD/SD), recording indicator, snapshot button, fullscreen overlay info |
| PageHeader | `components/page-header.tsx` | Standard page header for all new VISION pages |
| PageTransition | `components/page-transition.tsx` | Wrap all new pages for consistent enter/exit animations |
| AlertFeed | `components/alert-feed.tsx` | Reuse for alert list on dashboard, extend with severity filtering |
| ActivityTimeline | `components/activity-timeline.tsx` | Reuse for event timeline, extend with video clip embed, filter by date |
| ConfirmationDialog | `components/confirmation-dialog.tsx` | Reuse for destructive confirmations (delete recording, remove user, revoke share) |
| Badge (custom status) | Pattern: `statusConfig` in `page.tsx` | Camera online/offline/maintenance/degraded badges — copy pattern |
| Header | `components/header.tsx` | Add VISION notification bell count, stream status indicator |
| Sidebar | `components/sidebar.tsx` | Add 'Vision' nav group or extend 'Sécurité' group with new VISION sub-items |
| VideoPlayer (mobile) | `components/video-player.tsx` | **Not yet built** — need mobile equivalent using `expo-av` |
| CameraCard (mobile) | `components/camera-card.tsx` | Extend with stream preview thumbnail, recording status dot |
| AlertCard (mobile) | `components/alert-card.tsx` | Extend with snapshot thumbnail, swipe-to-acknowledge |
| QuickActionButton (mobile) | `components/quick-action-button.tsx` | New actions: Arm/Désarmer, Partager flux, Mon flux |

### Existing Dashboard Components That Already Exist and Map to VISION Pages

| Dashboard Component | File | Maps To |
|--------------------|------|---------|
| `app/(dashboard)/cameras/page.tsx` | Existing camera list | VIS-01, VIS-02, VIS-03 — augment with ONVIF scan UI, live stream grid |
| `app/(dashboard)/alertes/page.tsx` | Existing alerts page | VIS-06, VIS-08, VIS-09 — extend with WhatsApp/SMS channel config, face detection alerts |
| `app/(dashboard)/incidents/page.tsx` | Existing incidents | VIS-14, VIS-15 — event timeline + clip export |
| `app/(dashboard)/chronologie/page.tsx` | Existing chronology | VIS-14 — timeline with video preview |
| `app/(dashboard)/equipement/page.tsx` | Existing equipment | VIS-12, VIS-13, VIS-17 — recording settings (retention, compression) |
| `app/(dashboard)/utilisateurs/page.tsx` | Existing users page | VIS-21 — multi-user management (invite, role assignment, limits) |
| `app/(dashboard)/sites/page.tsx` | Existing sites | VIS-01 — ONVIF scan per site |
| `app/(dashboard)/notifications/page.tsx` | Existing notifications | VIS-22 — DND schedule, alert channel config (SMS/WhatsApp) |
| `app/(dashboard)/parametres/licence/page.tsx` | From Phase 1 | Feature gating display — VISION limits shown |

### NEW Components Needed (Dashboard)

| Component | Purpose | Priority | Notes |
|-----------|---------|----------|-------|
| `LiveCameraGrid` | Multi-camera live view with stream playback (WebRTC/HLS), click-to-expand, status overlays, recording indicators | MUST | Wraps existing `VideoPlayer` in a responsive grid. Handles substream quality toggle per tile. |
| `DetectionZoneCanvas` | Interactive canvas overlay on camera snapshot for drawing detection zones (polygon/rect) | MUST | Click-draw polygon, existing zones shown as semi-transparent overlays, color-coded by zone type. |
| `SensitivitySlider` | Per-camera sensitivity threshold slider with visual feedback (low→high scale with icon labels) | MUST | Uses `<input type="range">` with custom styling, aligns with glass theme. |
| `FaceUploadDropzone` | Drag-and-drop face image upload with preview, crop, name input, match status indicator | MUST | Accept JPG/PNG, max 5MB, preview thumbnail, 50-face limit counter. |
| `TimelineFilterBar` | Date range picker, event type filter chips, search input for timeline filtering | MUST | Date range, camera selector, event type (alert, motion, face, all), severity filter. |
| `ClipExportButton` | Export trigger for 30s clip around event — loading, progress, download states | MUST | POST to export endpoint, show progress, download on completion. |
| `StreamShareSheet` | Generate share link with duration selector (1h/6h/24h/custom), camera selector, copy link, revoke | MUST | Glass sheet or dialog. Show active shares list with revoke button. |
| `GeofencingStatusBar` | Global status bar showing arm/disarm state, connected phones count, timeout info | MUST | Compact banner below header. Shows "Armé" (green) or "Désarmé" (muted). |
| `GeofencingSettings` | Absence mode configuration: WiFi networks list, arm delay (1-30 min), timeout (5-30 min), schedule overrides | MUST | Settings page section. List of trusted WiFi SSIDs with add/remove. |
| `DNDScheduleEditor` | Do-not-disturb schedule: day picker, time range (start/end), enable/disable toggle | MUST | Time range inputs, day-of-week checkboxes, enable global toggle. |
| `ONVIFScanPanel` | Scan network for ONVIF cameras, display discovered devices, add to system | MUST | Progress bar during scan, results list with model/IP/status, add button per device. |
| `RecordingSettingsForm` | Retention selector (7/15/30 days), compression toggle (H.264/H.265), storage usage meter, path config | MUST | Glass card with toggle/select inputs, storage space bar. |
| `SubstreamToggle` | HD/SD quality toggle on live stream with current resolution/FPS display | SHOULD | Small badge/toggle on camera tile corner. HD cyan, SD muted. |
| `FaceRecognitionBadge` | Small badge showing face match status: recognized (green), unknown (yellow), error (red) | SHOULD | Overlay on alert snapshot. Shows face name + confidence % if matched. |
| `AlertChannelConfig` | Per-channel enable/disable toggles: Push, SMS, WhatsApp with status indicators | MUST | Settings section. SMS modem status (connected/disconnected), WhatsApp QR connect status. |

### NEW Components Needed (Mobile — Expo)

| Component | Purpose | Priority | Notes |
|-----------|---------|----------|-------|
| `LiveStreamViewer` | Full-screen camera live view using `expo-av` Video component, pinch-to-zoom, double-tap fullscreen | MUST | Wraps `<Video>` from expo-av. Controls overlay: mute, snapshot, HD/SD toggle. Background audio session for uninterrupted streaming. |
| `StreamGrid` | Multi-camera grid on mobile — tappable thumbnails, status dots, recording indicator | MUST | 2-column grid on phone, 3-column on tablet. Uses `FlashList` with estimated item size. |
| `ArmDisarmToggle` | Quick arm/disarm toggle button on home screen, large circular button with animation | MUST | Shows current state with animated transition. Tapping requires confirmation dialog. |
| `AlertNotificationCard` | Enhanced alert card with snapshot thumbnail, swipe-to-acknowledge, quick actions (view stream, ignore) | MUST | Extends `AlertCard`. Swipe left = acknowledge, swipe right = view stream. |
| `EventTimelineScreen` | Scrollable event timeline with date grouping, filter chips, tap to view details/clip | MUST | Date headers, event cards with snapshot + title + time, tap to expand. |
| `FaceUploadScreen` | Camera capture or gallery pick for face registration, name input, preview | MUST | Uses `expo-image-picker` or `expo-camera`. Preview after capture, name form, upload progress. |
| `ShareLinkReceiver` | Landing screen for shared stream link — shows player, no auth required, limited controls | MUST | Simple screen: stream title, video player, timer showing remaining access time. |
| `GeofencingIndicator` | Small badge showing current arm/disarm state, WiFi SSID, last check time | SHOULD | In top bar or home screen. Tappable to go to geofencing settings. |
| `StreamQualityBadge` | HD/SD indicator overlay on video player | SHOULD | Small pill badge: HD = cyan, SD = muted. Tappable to switch. |

---

## Page Specifications

### PAGE 1: Camera Live Grid (`/cameras`) — Dashboard

**Route:** `app/(dashboard)/cameras/page.tsx` — **already exists, augment**
**Access control:** Authenticated, VISION license required

**Layout:**
- Page header with title "Caméras", camera count, "+ Ajouter" button (opens ONVIF scan or manual add)
- Toggle between Grid view (default) and List view
- Camera grid: responsive 2/3/4-column grid (2-col mobile, 3-col tablet, 4-col desktop)
- Each tile: live stream thumbnail (WebRTC/HLS), camera name overlay, status dot, recording indicator (red pulsing dot), HD/SD quality badge

**States:**

| State | UI |
|-------|-----|
| Loading | Camera grid skeleton — 8 `Skeleton` blocks with `aspect-video` ratio, pulsing |
| Empty (no cameras) | Glass card centered: `VideoOff` icon, "Aucune caméra configurée", "Ajoutez votre première caméra" CTA button |
| Camera offline | Tile shows "Hors ligne" overlay with dark background, camera name, retry button |
| Stream buffering | Tile shows cyan spinner overlay + "Connexion..." with connection attempt count |
| Stream connected | Live video playing, green status dot, recording indicator if active |
| Error loading grid | Error card with "Erreur de chargement" + "Réessayer" button |
| Limit reached (10 cameras) | "+ Ajouter" button disabled, tooltip "Limite de 10 caméras atteinte. Passez au pack BASTION." |

**Component breakdown:**
- `PageHeader` with title + actions
- `LiveCameraGrid` — responsive grid wrapping `VideoPlayer` per tile
- `CameraCardPremium` for list view fallback
- `ONVIFScanPanel` in dialog for camera discovery
- Manual camera add form (dialog): name, IP/URL, ONVIF credentials, test connection button

**Edge cases:**
- VISION max 10 cameras — +1 button shows upgrade prompt
- All cameras offline — grid shows all tiles in offline state, no empty state
- Mixed online/offline — each tile independent
- Slow network — show substream (SD) with quality toggle

---

### PAGE 2: Camera Detail / Live View (`/cameras/[id]`) — Dashboard

**Route:** `app/(dashboard)/cameras/[id]/page.tsx` — **already exists, extend**
**Access control:** Authenticated, VISION license

**Layout:**
- Full-width stream player (16:9 or 4:3 depending on camera aspect ratio)
- Stream controls overlay on hover: mute/unmute, screenshot, fullscreen, HD/SD toggle, snapshot
- Right panel (collapsible on mobile): camera info, detection settings, recording status
- Bottom section: detection zones thumbnail, sensitivity slider, recent alerts from this camera

**States:**

| State | UI |
|-------|-----|
| Connection establishing | Full-player overlay: `Loader2` spinner + "Connexion au flux..." + connection attempt counter |
| Connected | Live video with all controls visible on hover. Info panel shows FPS, resolution, bitrate |
| Offline/disconnected | Dark overlay with `VideoOff` icon + "Flux hors ligne" + "Dernière connexion: {timestamp}" |
| PTZ available | PTZ control pad overlay (bottom-right quadrant), preset buttons |
| Detection active | Cyan brief flash on player during AI detection, small badge "Détection humaine" |
| Snapshot captured | Toast notification "Capture d'écran enregistrée" |

**Component breakdown:**
- `VideoPlayer` — core stream component, already built
- `PTZControls` — already built (`components/cameras/ptz-controls.tsx`)
- `DetectionZoneCanvas` — overlay on snapshot for zone drawing
- `SensitivitySlider` — per-camera setting
- `RecordingStatus` indicator — active/inactive with retention info
- `RecentAlertList` — mini alert feed filtered by camera ID

---

### PAGE 3: ONVIF Scan (`/cameras/decouverte`) — Dashboard

**Route:** `app/(dashboard)/cameras/decouverte/page.tsx` — NEW
**Access control:** Authenticated, ADMIN role or higher

**Layout:**
- Full-page scan interface with glass card
- Network selector (if multiple subnets), scan button
- Results list: discovered devices with model, IP, ONVIF version, status (compatible/not)
- "Ajouter" button per device → opens add form (name, credentials, site assignment)

**States:**

| State | UI |
|-------|-----|
| Pre-scan | Glass card with network range input + "Lancer le scan" button |
| Scanning | Progress bar with "Scan en cours... {found} caméras trouvées", animated radar/pulse icon |
| Results | Sortable table of discovered devices, each row has "Ajouter" action |
| No devices found | "Aucun appareil ONVIF détecté" + troubleshooting tips (check network, enable ONVIF on camera) |
| Scan error | Error card with "Erreur de scan" + retry button |
| Adding device | "Ajout en cours..." spinner on row, success toast on completion |

**Component breakdown:**
- `ONVIFScanPanel` — scan trigger + progress
- `Table` — results display
- `Dialog` — camera add form
- `Badge` — compatibility status

---

### PAGE 4: Event Timeline (`/chronologie`) — Dashboard

**Route:** `app/(dashboard)/chronologie/page.tsx` — **already exists, extend with video**
**Access control:** Authenticated, VISION license

**Layout:**
- Top: date range picker + event type filter chips (Tous, Alertes, Mouvement, Visage, Système) + camera selector
- Main: infinite-scroll timeline with date headers (Aujourd'hui, Hier, {date})
- Each event card: snapshot thumbnail, event type icon, camera name, timestamp, severity badge
- Click event → slide-in side panel with: larger snapshot, 30s clip player, export button, details

**States:**

| State | UI |
|-------|-----|
| Loading | Timeline skeleton — 5-8 stacked skeleton rows with thumbnail block + text lines |
| Empty (no events) | "Aucun événement dans cette période" — "Ajoutez des caméras pour commencer" |
| Filter active with no results | "Aucun résultat pour ces filtres" — "Modifier les filtres" link |
| Events loaded | Grouped by date, infinite scroll with load-more button |
| Clip loading | `ClipExportButton` shows spinner + "Préparation de l'export..." |
| Clip ready | Download link appears + toast "Clip prêt : 30s" |
| Clip error | "Erreur d'export" with retry option |
| Screenshot loading | Thumbnail skeleton, fades in when loaded |

**Component breakdown:**
- `TimelineFilterBar` — date range, filters, camera selector
- `ActivityTimeline` — existing, extend with video clip embed
- `ClipExportButton` — NEW, export trigger
- `Sheet` — event detail side panel
- `Badge` — event type and severity

**Copywriting:**
- "Tous" / "Alertes" / "Mouvement" / "Visage" / "Système" — filter labels
- "Aujourd'hui" / "Hier" — date group headers (French locale)
- "Exporter le clip (30s)" — clip export button
- "Préparation de l'export..." — clip loading
- "Clip prêt — Télécharger" — clip ready
- "Aucun événement" — empty state

---

### PAGE 5: Recording Settings (`/parametres/enregistrement`) — Dashboard

**Route:** `app/(dashboard)/parametres/enregistrement/page.tsx` — NEW
**Access control:** Authenticated, ADMIN or higher, VISION license

**Layout:**
- Settings form in glass card sections:

**Section 1 — Rétention:**
- Radio/button group: 7 jours | 15 jours | 30 jours (with description: "Espace estimé: {X} Go")
- Storage space progress bar: "Stockage utilisé: {used} Go / {total} Go ({percent}%)"

**Section 2 — Compression:**
- Toggle: H.264 (standard) / H.265/HEVC (économique)
- Description: "H.265 économise jusqu'à 50% d'espace disque"
- Estimated savings calculation when toggling

**Section 3 — Emplacement:**
- Read-only display of storage path (e.g., `/mnt/storage/recordings/`)
- "Modifier" button → disabled for VISION (BASTION has advanced storage config)
- Tooltip: "La gestion avancée du stockage est disponible avec le pack BASTION"

**States:**

| State | UI |
|-------|-----|
| Loading | Skeleton form — 3 card blocks with skeleton label + skeleton control |
| Loaded | Form with current values pre-selected, "Enregistrer" button |
| Saving | Button shows spinner + "Sauvegarde en cours..." |
| Saved | Toast "Paramètres enregistrés" |
| Error | Inline error + "Réessayer" |
| Storage warning ( >80% ) | Warning banner: "Espace disque faible ({used}/{total} Go). Libérez de l'espace ou augmentez la capacité." |
| Storage critical ( >95% ) | Destructive banner: "Espace disque critique. Les enregistrements les plus anciens seront supprimés." |

**Component breakdown:**
- `Card` + `CardHeader` + `CardContent` per section
- `RadioGroup` or `ButtonGroup` for retention
- `Progress` bar for storage
- `Switch` for H.264/H.265 toggle
- `Separator` between sections

**Copywriting:**
- "Enregistrement" — page title
- "Rétention des enregistrements" — section
- "7 jours — Rotation rapide, idéal pour petits disques" / "15 jours — Équilibre stockage/sécurité" / "30 jours — Maximum de sécurité"
- "Compression vidéo" — section
- "H.264 (Standard)" / "H.265/HEVC (Économique)" — toggle labels
- "Emplacement de stockage" — section
- "Espace disque faible" — warning
- "Espace disque critique" — critical

---

### PAGE 6: Detection Zones (`/cameras/[id]/zones`) — Dashboard

**Route:** `app/(dashboard)/cameras/[id]/zones/page.tsx` — NEW (or dialog within camera detail)
**Access control:** Authenticated, ADMIN or higher, VISION license

**Layout:**
- Camera snapshot as canvas background (full-width, locked aspect ratio)
- Drawing toolbar overlay (top-left): Rectangle | Polygon | Clear All
- Existing zones shown as colored semi-transparent polygons (cyan = active, amber = paused)
- Zone list sidebar: list of zones with name, toggle on/off, delete button
- Sensitivity slider below canvas (1-100)

**States:**

| State | UI |
|-------|-----|
| Loading | Skeleton canvas placeholder |
| No zones defined | Snapshot with "+ Ajouter une zone" overlay in center |
| Drawing mode | Crosshair cursor, polygon vertices shown, snap-to-grid optional |
| Zone saved | New zone appears on canvas + updated list |
| Sensitivity change | Visual feedback: zone overlays change opacity/thickness as sensitivity adjusts |

**Component breakdown:**
- `DetectionZoneCanvas` — NEW, canvas drawing
- `SensitivitySlider` — NEW
- Zone list: `ScrollArea` + list items with toggle

**Edge cases:**
- Camera offline: "Instantané non disponible" — use last known snapshot or placeholder
- Empty snapshot: grid pattern placeholder
- Zone overlap: zones can overlap, both trigger detection

---

### PAGE 7: Face Management (`/visages`) — Dashboard

**Route:** `app/(dashboard)/visages/page.tsx` — NEW
**Access control:** Authenticated, ADMIN or higher, VISION license

**Layout:**
- Page header: "Reconnaissance faciale" + counter "{count}/50 visages"
- Grid of face cards: photo thumbnail, name, status (recognisé / en attente), last seen timestamp
- "+ Ajouter un visage" button (opens upload dialog)
- Search bar: filter by name
- Upload dialog: drag-drop or click to upload, crop preview, name input, "Ajouter" button

**States:**

| State | UI |
|-------|-----|
| Loading | Face card skeleton grid |
| Empty (no faces) | "Aucun visage enregistré" — "Ajoutez des visages à la liste blanche pour activer la reconnaissance" |
| 50 faces reached | "+ Ajouter" disabled + "Limite de 50 visages atteinte. Passez à BASTION pour débloquer la reconnaissance illimitée." |
| Uploading | Progress bar on upload card |
| Face matched | Green badge "Reconnu" on face card with timestamp |
| No match in X days | Amber badge "Non vu depuis {N} jours" |
| Delete face | Confirmation dialog: "Supprimer {name} de la liste blanche ?" |

**Component breakdown:**
- `FaceUploadDropzone` — NEW, drag-drop upload
- `Avatar` — face photo thumbnail
- `Badge` — status (recognised/pending)
- `Dialog` — upload form, delete confirmation
- `Progress` — upload progress

**Copywriting:**
- "Reconnaissance faciale" — page title
- "{count}/50 visages" — limit counter
- "Ajouter un visage" — CTA
- "Aucun visage enregistré" — empty
- "Reconnu" / "En attente" / "Non vu depuis {N} jours" — status badges
- "Déposer une photo ou cliquer pour télécharger" — upload hint
- "Format JPG ou PNG, max 5 Mo" — upload constraint

---

### PAGE 8: Multi-User Management (`/utilisateurs`) — Dashboard

**Route:** `app/(dashboard)/utilisateurs/page.tsx` — **already exists, extend with VISION limits**
**Access control:** Authenticated, ADMIN or higher, VISION license

**Layout:**
- Table: Nom, Email, Rôle (Admin/Viewer), Statut (Actif/Invité/Suspendu), Actions
- "Inviter un utilisateur" button — opens invite dialog
- Limit banner: "{current}/{max} utilisateurs" — if limit reached, show upgrade CTA

**Secondary accounts (VISION-specific):**
- Max 3 secondary accounts (admin + 3 = 4 total)
- Role options at invitation: Admin (full access) or Viewer (live view + timeline only)
- Invite via: email (sends invite link) or SMS (sends code)
- Manual creation: admin creates account with temporary password

**States:**

| State | UI |
|-------|-----|
| Loading | Table skeleton |
| 3 secondary accounts reached | Invite button disabled + warning: "Limite de 3 utilisateurs secondaires atteinte. Passez à BASTION pour plus d'utilisateurs." |
| Invite pending | Badge "Invitation envoyée" on user row |
| User invited via SMS | Toast "Invitation envoyée par SMS à {phone}" |
| Remove user | Confirmation dialog: "Supprimer {name} ? L'utilisateur perdra tout accès immédiatement." |
| Role change | Confirmation dialog: "Modifier le rôle de {name} ?" |

**Component breakdown:**
- `Table` — user list
- `Dialog` — invite form, role change confirmation, delete confirmation
- `Badge` — role, status
- `DropdownMenu` — role selector, actions
- `Button` — invite CTA

---

### PAGE 9: Stream Sharing (`/partage`) — Dashboard

**Route:** `app/(dashboard)/partage/page.tsx` — NEW
**Access control:** Authenticated, ADMIN or higher, VISION license

**Layout:**
- **Generate share section:**
  - Camera selector (checkboxes)
  - Duration selector: 1 heure | 6 heures | 24 heures | Personnalisé (time input)
  - "Générer le lien" button
  - Result: link in monospace code block + "Copier" button + QR code (optional)

- **Active shares section:**
  - Table or card list: Lien, Caméra(s), Expire le, Statut (Actif/Expiré/Révoqué), Actions
  - "Révoquer" button per share
  - Notification log: "X a ouvert le lien" entries

**States:**

| State | UI |
|-------|-----|
| No active shares | "Aucun partage actif" — "Générez un lien pour partager l'accès à vos caméras" |
| Link generated | Link displayed in monospace, toast "Lien copié !", share appears in active list |
| Link copied | Button changes to "Copié !" for 2 seconds |
| Third party viewing | Notification bell update + "Lien consulté" entry in activity log |
| Share revoked | Immediate removal from active list, toast "Partage révoqué" |
| Link expired | Badge "Expiré" on share card, option to renew |

**Component breakdown:**
- `StreamShareSheet` — NEW, link generation
- `Card` — active share display
- `Badge` — share status
- `Button` — copy, revoke, generate
- `Dialog` — revoke confirmation

**Copywriting:**
- "Partage de flux" — page title
- "Générer un lien de partage" — section
- "Durée d'accès" — duration label
- "Lien de partage" — result label
- "Copier le lien" — copy CTA
- "Partages actifs" — active shares section
- "Aucun partage actif" — empty state
- "Révoquer le partage" — revoke CTA
- "Le tiers pourra accéder au flux sans authentification pendant la durée définie." — warning note
- "Lien consulté" — activity log entry

---

### PAGE 10: Geofencing & Absence Mode (`/parametres/absence`) — Dashboard

**Route:** `app/(dashboard)/parametres/absence/page.tsx` — NEW
**Access control:** Authenticated, ADMIN or higher, VISION license

**Layout (glass card sections):**

**Section 1 — État actuel:**
- Large status indicator: "Armé" (green) / "Désarmé" (muted) with shield icon
- Connected phones list: "{N} téléphone(s) connecté(s)" with device names
- Last status change timestamp

**Section 2 — Réseaux WiFi de confiance:**
- List of trusted SSIDs with status (connecté/déconnecté)
- "Ajouter le réseau actuel" button (auto-detects connected WiFi)
- Manual add: SSID input

**Section 3 — Paramètres:**
- Délai d'armement: slider 1-30 min (default 10 min)
- Timeout absence: slider 5-30 min (default 15 min)
- Sensibilité renforcée en mode absence: toggle (ON by default)

**Section 4 — Programmation horaire (optional):**
- Day-of-week checkboxes + time range inputs
- Override: "Forcer l'armement" button (manual override regardless of geofencing)
- "Forcer le désarmement" button

**States:**

| State | UI |
|-------|-----|
| Loading | Skeleton form |
| Geofencing active (all phones home) | "Désarmé — Tous les téléphones sont à la maison" |
| Geofencing active (all phones left) | "Armé — Aucun téléphone connecté" with countdown "Armement dans {N} min" |
| Geofencing active (some phones left) | "Armé — {N} téléphone(s) connecté(s)" |
| Manual override | Badge "Forcé" on status + "Annuler le forçage" button |
| No phones configured | "Aucun téléphone configuré. Ajoutez des réseaux WiFi de confiance depuis l'application mobile." |
| WiFi disconnected for set timeout | Automatic arming, notification "Mode absence activé" |
| Configuration saved | Toast "Paramètres d'absence enregistrés" |

**Component breakdown:**
- `GeofencingStatusBar` — NEW, global status indicator
- `GeofencingSettings` — NEW, settings form
- `Card` — per section
- `Button` — add WiFi, force arm/disarm, save
- `Slider` — delay and timeout
- `Badge` — device connection status

**Copywriting:**
- "Mode Absence" — page title
- "Armé" / "Désarmé" — status labels
- "{N} téléphone(s) connecté(s)" — connected count
- "Réseaux WiFi de confiance" — section
- "Délai d'armement" / "Timeout absence" — slider labels
- "Sensibilité renforcée en mode absence" — toggle label
- "Forcer l'armement" / "Forcer le désarmement" — manual override
- "Programmation horaire" — schedule section
- "Mode absence activé" — notification

---

### PAGE 11: DND Schedule (`/parametres/notification-silencieuse`) — Dashboard

**Route:** `app/(dashboard)/parametres/notification-silencieuse/page.tsx` — NEW
**Access control:** Authenticated, VISION license

**Layout:**
- Global enable/disable toggle: "Notifications silencieuses" with description
- Schedule editor: day-of-week matrix + time range per day (or "Same for all days" option)
- "Alertes critiques" override toggle: "Les alertes critiques passent toujours" (ON by default)
- Active state indicator: "Mode silencieux actif" / "Mode silencieux inactif" with time info

**States:**

| State | UI |
|-------|-----|
| DND inactive | Muted indicator, schedule shown |
| DND active (scheduled) | Warning badge "Silencieux — {start}-{end}", schedule shown as active |
| DND active (overridden by absence mode) | Info note: "Le mode absence est prioritaire. Les notifications sont gérées par le mode absence." |
| Critical alert fired during DND | Toast: "Alerte critique — notification envoyée malgré le mode silencieux" |

**Component breakdown:**
- `DNDScheduleEditor` — NEW
- `Switch` — global toggle and critical override
- `Card` — schedule editor container
- `Badge` — status indicator

**Copywriting:**
- "Notifications silencieuses (DND)" — page title
- "Activer les notifications silencieuses" — toggle label
- "Plages horaires" — schedule section
- "Mêmes horaires pour tous les jours" — shortcut toggle
- "Alertes critiques uniquement" — override label
- "Les alertes critiques (intrusion, feu) passent toujours, même en mode silencieux." — description
- "Mode silencieux actif" / "Mode silencieux inactif" — status

---

### PAGE 12: Alert Channel Configuration (`/parametres/alertes`) — Dashboard

**Route:** `app/(dashboard)/parametres/alertes/page.tsx` — NEW (or extend `/notifications`)
**Access control:** Authenticated, ADMIN or higher, VISION license

**Layout (per-channel glass cards):**

**Canal 1 — Notifications Push:**
- Toggle: Activé/Désactivé (ON by default)
- Description: "Notifications sur l'application mobile"

**Canal 2 — SMS:**
- Toggle: Activé/Désactivé
- Modem status: "Modem connecté" / "Modem non détecté"
- Phone number display (read-only): "{number}"
- "Tester SMS" button → sends test message
- Fallback option: "Utiliser une passerelle cloud si le modem est hors ligne"

**Canal 3 — WhatsApp:**
- Toggle: Activé/Désactivé
- Connection status: "Connecté" / "Déconnecté — Scanner le QR code"
- QR code display (if disconnected): large QR code with "Scannez avec WhatsApp pour connecter"
- Instructions: "1. Ouvrez WhatsApp → Menu → Appareils liés → Scanner le code"
- "Tester WhatsApp" button → sends test message with screenshot

**Channel-independent settings:**
- Alert types to send: motion, face detection, all (checkboxes)
- Per-camera override: link to camera settings

**States:**

| State | UI |
|-------|-----|
| Loading | Skeleton per channel card |
| Modem detected | Green "Modem connecté" badge, phone number shown |
| Modem not detected | Red "Modem non détecté" badge, troubleshooting link |
| WhatsApp connected | Green "Connecté" badge, device name + last seen |
| WhatsApp disconnected | QR code display with instructions |
| Test sending | Button spinner + "Envoi du test..." |
| Test sent | Toast "Test envoyé avec succès" |
| SMS limit warning | "Volume estimé: ~{N} SMS/mois" with cost info |

**Component breakdown:**
- `Card` — per channel
- `Switch` — per channel toggle
- `Badge` — connection status
- `Button` — test send
- QR code display — image or canvas (for WhatsApp)

**Copywriting:**
- "Canaux d'alerte" — page title
- "Notifications Push" / "SMS" / "WhatsApp" — channel labels
- "Modem connecté" / "Modem non détecté" — modem status
- "Connecté" / "Déconnecté" — WhatsApp status
- "Tester" — test button per channel
- "Scannez avec WhatsApp pour connecter" — QR instructions
- "Utiliser une passerelle cloud si le modem est hors ligne" — SMS fallback
- "Les alertes sont envoyées avec une capture d'écran de l'événement." — WhatsApp detail

---

### PAGE 13: DDNS / Remote Access (`/parametres/acces-distant`) — Dashboard

**Route:** `app/(dashboard)/parametres/acces-distant/page.tsx` — NEW
**Access control:** Authenticated, ADMIN or higher, VISION license

**Layout:**
- **Status card**: "Accès distant" with indicator (Actif/Inactif/Configuration requise)
- **DDNS configuration section:**
  - Provider: "DuckDNS" (pre-configured) or "No-IP"
  - Domain name display: "{your-domain}.duckdns.org"
  - Status: "Configuré" / "Non configuré"
  - "Configurer" button → guide/instructions
  - Container status: "Conteneur DDNS actif" / "Conteneur DDNS inactif"
- **Guide section:**
  - Step-by-step: "Suivez ces étapes pour configurer l'accès distant"
  - List: 1. Configurez votre routeur → 2. Activez le DDNS → 3. Redirigez le port 443
- **VPN section:**
  - WireGuard option for advanced users
  - "Documentation WireGuard" link

**States:**

| State | UI |
|-------|-----|
| DDNS configured | Green status, domain shown, "Configuré" badge |
| DDNS not configured | "Configuration requise" + "Configurer" CTA |
| Container issue | Warning "Le conteneur DDNS ne répond pas" |

**Component breakdown:**
- `Card` — status and config
- `Badge` — status
- `Button` — config CTA
- `StepIndicator` — guide steps

**Copywriting:**
- "Accès distant" — page title
- "Domaines personnalisés" — already available from existing setup
- "VPN (WireGuard)" — advanced option heading

---

### PAGE 14: Activation Wizard Update (`/activate`) — Dashboard

**Route:** `app/(auth)/activate/page.tsx` — **already exists from Phase 1, minor update**
**Access control:** Authenticated, no active license

**Phase 1 UI-SPEC already defines this page fully.** Phase 2 may only need to:
- Update VISION feature list in trial dialog if not already done
- Ensure trial properly gates all VISION features

**No UI changes required unless trial content needs updating.**

---

### PAGE 15: Mobile — Camera List & Live View (`/cameras` and `/camera/[id]`) — Mobile

**Route:** `app/(tabs)/cameras.tsx` (list) + `app/camera/[id].tsx` (viewer) — **mobile, extend existing**

**Camera list (`cameras.tsx`):**
- Reuses existing `CameraCard` component
- Extend card with: recording indicator (red dot), stream quality badge, snapshot thumbnail
- Pull-to-refresh, FlashList with pagination
- Tap card → navigate to `/camera/[id]`

**Live viewer (`/camera/[id]`):**
- NEW route: `app/camera/[id].tsx`
- Full-screen `expo-av` Video player
- Controls overlay (tap to show/hide):
  - Back button (top-left)
  - Camera name + status (top-center)
  - Mute/unmute toggle (top-right)
  - Snapshot button (bottom-left)
  - HD/SD quality toggle (bottom-center)
  - Fullscreen toggle (bottom-right)
- Pinch-to-zoom gesture
- Double-tap to toggle fullscreen
- Background audio: continues playing when app is backgrounded (configure audio session)

**States:**

| State | UI |
|-------|-----|
| Loading (list) | `ActivityIndicator` centered + "Chargement des caméras..." |
| Empty (list) | `Camera` icon + "Aucune caméra configurée" + "Ajoutez des caméras depuis le tableau de bord" |
| Connecting (viewer) | Full-screen dark overlay + "Connexion au flux..." + cyan spinner |
| Connected (viewer) | Live video playing, controls auto-hide after 3s |
| Offline (viewer) | Dark overlay + "Flux hors ligne" + "Réessayer" button |
| Stream quality change | Brief overlay "HD" / "SD" with resolution info |

**Component breakdown:**
- `LiveStreamViewer` — NEW, wraps expo-av `<Video>`
- `CameraCard` — extend with recording dot
- `FlashList` — existing pattern

---

### PAGE 16: Mobile — Event Timeline (`/chronologie`) — Mobile

**Route:** `app/(tabs)/chronologie/` — NEW route group or section

**Layout:**
- Filter bar at top: date selector (Today/Yesterday/Custom), event type chips
- Event list with FlashList:
  - Date group headers: "Aujourd'hui", "Hier", "18 juillet 2026"
  - Event cards: snapshot thumbnail, event icon, camera name, timestamp, severity badge
  - Tap event → expand inline or push to event detail screen
- Event detail: full snapshot, 30s video clip player (if available), "Télécharger le clip" button, event metadata

**States:**

| State | UI |
|-------|-----|
| Loading | Timeline skeleton |
| Empty | "Aucun événement" |
| Clip loading | "Préparation du clip..." overlay |
| Clip ready | "Télécharger le clip (30s)" active |

**Component breakdown:**
- `EventTimelineScreen` — NEW
- FlashList with date section headers
- `AlertCard` — extend with snapshot + time
- `expo-av` Video for clip preview

---

### PAGE 17: Mobile — Face Upload (`/visages/ajouter`) — Mobile

**Route:** `app/visages/ajouter.tsx` — NEW

**Layout:**
- Option 1: "Prendre une photo" — opens `expo-camera`
- Option 2: "Choisir dans la galerie" — opens `expo-image-picker`
- After capture: preview with face bounding box, name input field
- "Ajouter ce visage" button
- Limit counter at top: "{count}/50 visages"

**States:**

| State | UI |
|-------|-----|
| Permission denied | "Autorisation caméra requise" + settings link |
| Uploading | Progress bar + "Ajout en cours..." |
| Success | Toast "Visage ajouté avec succès" + navigate back to list |
| Error | "Erreur : {message}" with retry |
| Duplicate face | "Ce visage existe déjà : {name}" |
| 50 face limit | "Limite de 50 visages atteinte" — no upload allowed |

**Component breakdown:**
- `FaceUploadScreen` — NEW
- `expo-camera` or `expo-image-picker`
- `TextInput` for name
- `Button` for submit

---

### PAGE 18: Mobile — Share Link Receiver (`/partager/[token]`) — Mobile

**Route:** `app/partager/[token].tsx` — NEW (no auth required)

**Layout:**
- Minimal, branded white-label screen
- Stream title at top
- expo-av Video player (full width, aspect-ratio constrained)
- Timer: "Accès expirera dans 2h 15min"
- No controls other than mute/unmute
- No navigation away from this screen
- "Ce flux vous est partagé par {owner}" footer

**States:**

| State | UI |
|-------|-----|
| Invalid/expired link | "Lien invalide ou expiré" + "Demandez un nouveau lien au propriétaire" |
| Loading | "Connexion au flux..." |
| Connected | Video playing with timer |
| Access expired mid-view | "Accès expiré" overlay, stream stops |

**Edge cases:**
- Link opened on same network only (VISION restriction)
- HTTPS required — redirect HTTP to HTTPS
- Notification to stream owner when link is opened

---

### PAGE 19: Mobile — Geofencing & Arm/Disarm — Mobile

**Route:** Integrated into home screen + settings

**Home screen integration:**
- Large circular `ArmDisarmToggle` button on home screen below quick actions
- Current state: "Armé" (red) / "Désarmé" (green)
- Tap → confirmation dialog → API call → state changes with animation
- Background WiFi SSID monitoring: when phone disconnects from trusted WiFi, auto-trigger arm with configurable delay
- When reconnects, auto-disarm

**Settings integration:**
- List of trusted WiFi networks (auto-populated from current connections)
- "Ajouter le réseau actuel" button
- Manual SSID add
- Delay settings (5-30 min)

**Notification handling:**
- "Mode absence activé" push notification when armed
- "Mode présence activé" when disarmed
- No confirmation required (per D-11)

**States:**

| State | UI |
|-------|-----|
| Armed (geofencing) | Red badge "Armé" on toggle, shield icon closed |
| Disarmed (geofencing) | Green badge "Désarmé" on toggle, shield icon open |
| Arming countdown | "Armement dans {N} min" subtitle |
| Manual override | Badge "Forcé" on status |
| WiFi disconnected from trusted | Waiting for timeout, "Absence détectée — Armement dans {N} min" notification |

---

## Copywriting Contract

All copy in French (French-first as established in Phase 1 and D-05). No English UI text.

### Page Titles & Navigation

| Element | French Copy | Location |
|---------|-------------|----------|
| Cameras nav item | Caméras | Dashboard sidebar + mobile tab |
| Live view page | Vision en direct | Dashboard page title |
| Camera detail | {camera_name} | Dashboard page title |
| Discovery page | Découverte de caméras | Dashboard |
| Event timeline | Chronologie | Dashboard + mobile |
| Recording settings | Enregistrement | Dashboard settings |
| Detection zones | Zones de détection | Dashboard camera settings |
| Face management | Visages | Dashboard + mobile |
| Multi-user | Utilisateurs | Dashboard (existing) |
| Stream sharing | Partage de flux | Dashboard |
| Geofencing / Absence | Mode Absence | Dashboard + mobile |
| DND schedule | Notifications silencieuses | Dashboard |
| Alert channels | Canaux d'alerte | Dashboard |
| Remote access | Accès distant | Dashboard |
| Face upload | Ajouter un visage | Mobile screen title |
| Share receiver | Flux partagé | Mobile screen title |

### Camera Grid & Live View

| Element | French Copy |
|---------|-------------|
| Add camera CTA | + Ajouter une caméra |
| Scan network | Scanner le réseau |
| Discovery in progress | Scan en cours... {count} caméra(s) trouvée(s) |
| No cameras | Aucune caméra configurée |
| Add first camera | Ajoutez votre première caméra |
| Connecting stream | Connexion au flux... |
| Stream connection attempt | Tentative {n}/{max} |
| Stream offline | Flux hors ligne |
| Last connection | Dernière connexion : {timestamp} |
| HD quality | HD |
| SD quality | SD |
| Snapshot captured | Capture d'écran enregistrée |
| Fullscreen | Plein écran |
| Exit fullscreen | Quitter le plein écran |
| Mute | Désactiver le son |
| Unmute | Activer le son |
| Recording active | Enregistrement en cours |
| Camera online | En ligne |
| Camera offline | Hors ligne |
| Camera maintenance | Maintenance |
| Camera degraded | Dégradé |

### ONVIF Discovery

| Element | French Copy |
|---------|-------------|
| Scan button | Lancer le scan |
| Scan results | {count} appareil(s) trouvé(s) |
| No devices | Aucun appareil ONVIF détecté |
| Add device | Ajouter cette caméra |
| Device compatible | Compatible ONVIF |
| Device incompatible | Non compatible |
| Configure manually | Configurer manuellement |
| Connection test | Tester la connexion |
| Connection successful | Connexion réussie |
| Connection failed | Échec de connexion |
| Enter IP address | Adresse IP |
| Enter ONVIF port | Port ONVIF (default: 80) |
| Enter username | Nom d'utilisateur |
| Enter password | Mot de passe |

### Detection & Zones

| Element | French Copy |
|---------|-------------|
| Detection zones | Zones de détection |
| Add zone | Ajouter une zone |
| Delete zone | Supprimer la zone |
| Rectangle tool | Rectangle |
| Polygon tool | Polygone |
| Clear all zones | Effacer tout |
| Zone active | Active |
| Zone paused | Suspendue |
| Sensitivity | Sensibilité |
| Low sensitivity | Faible |
| High sensitivity | Élevée |
| Human detection | Détection humaine |
| Motion detected | Mouvement détecté |
| Face detected | Visage détecté |
| Save zones | Enregistrer les zones |
| No zones defined | Aucune zone définie — Cliquez sur "Ajouter une zone" pour commencer |

### Alerts & Notifications

| Element | French Copy |
|---------|-------------|
| Alert types | Types d'alertes |
| Push notifications | Notifications Push |
| SMS alert | Alerte SMS |
| WhatsApp alert | Alerte WhatsApp |
| Modem connected | Modem connecté |
| Modem not detected | Modem non détecté |
| Test SMS | Tester SMS |
| Test WhatsApp | Tester WhatsApp |
| Test sent | Test envoyé avec succès |
| SMS fallback cloud | Passerelle cloud (fallback) |
| Connect WhatsApp | Connecter WhatsApp |
| Scan QR code | Scannez ce code avec WhatsApp |
| QR instructions | 1. Ouvrez WhatsApp → Menu → Appareils liés → Scanner le code |
| WhatsApp connected | Connecté |
| WhatsApp disconnected | Déconnecté |
| Critical alert override | Les alertes critiques passent toujours |
| Silent hours active | Mode silencieux actif |
| Silent hours inactive | Mode silencieux inactif |
| Schedule same for all days | Mêmes horaires pour tous les jours |

### Event Timeline

| Element | French Copy |
|---------|-------------|
| Timeline filter | Filtrer les événements |
| All events | Tous |
| Motion events | Mouvement |
| Face events | Visage |
| Alert events | Alertes |
| System events | Système |
| Date range | Période |
| Today | Aujourd'hui |
| Yesterday | Hier |
| Custom date | Personnalisé |
| Events count | {count} événement(s) |
| Export clip | Exporter le clip (30s) |
| Clip loading | Préparation de l'export... |
| Clip ready | Clip prêt — Télécharger |
| Clip error | Erreur d'export |
| No events in period | Aucun événement dans cette période |
| No results for filters | Aucun résultat pour ces filtres |

### Recording Settings

| Element | French Copy |
|---------|-------------|
| Retention | Rétention des enregistrements |
| 7 days | 7 jours — Rapide, idéal pour petits disques |
| 15 days | 15 jours — Équilibre stockage/sécurité |
| 30 days | 30 jours — Maximum de sécurité |
| Estimated space | Espace estimé : {size} |
| Storage used | Stockage utilisé : {used} / {total} ({percent}%) |
| H264 toggle | H.264 (Standard) |
| H265 toggle | H.265/HEVC (Économique) |
| H265 savings | H.265 économise jusqu'à 50% d'espace disque |
| H265 comparison | Économie estimée : ~{percent}% d'espace |
| Storage path | Emplacement de stockage |
| Storage path display | {path} |
| Storage warning | Espace disque faible |
| Storage critical | Espace disque critique |
| Storage critical detail | Les enregistrements les plus anciens seront supprimés |
| Settings saved | Paramètres enregistrés |

### Face Recognition

| Element | French Copy |
|---------|-------------|
| Face title | Reconnaissance faciale |
| Add face | Ajouter un visage |
| Add face detail | Ajoutez un visage à la liste blanche |
| Face count | {count}/50 visages |
| Face limit reached | Limite de 50 visages atteinte |
| Face limit upgrade message | Passez à BASTION pour débloquer la reconnaissance illimitée |
| Face name | Nom du visage |
| Drop photo | Déposer une photo ou cliquer pour télécharger |
| Photo constraints | Format JPG ou PNG, max 5 Mo |
| Take photo | Prendre une photo |
| Choose from gallery | Choisir dans la galerie |
| Face recognized | Reconnu |
| Face pending | En attente |
| Face not seen | Non vu depuis {N} jours |
| Face last seen | Dernière détection : {timestamp} |
| Delete face confirm | Supprimer {name} de la liste blanche ? |
| Face added | Visage ajouté avec succès |
| Face add error | Erreur d'ajout du visage |
| Face duplicate | Ce visage existe déjà : {name} |

### Multi-User

| Element | French Copy |
|---------|-------------|
| Invite user | Inviter un utilisateur |
| Invite via email | Inviter par email |
| Invite via SMS | Inviter par SMS |
| Create manually | Créer manuellement |
| User role | Rôle |
| Admin role | Administrateur |
| Viewer role | Observateur |
| Invitation sent (email) | Invitation envoyée par email |
| Invitation sent (SMS) | Invitation envoyée par SMS |
| Secondary users limit | Limite de 3 utilisateurs secondaires atteinte |
| Upgrade for more users | Passez à BASTION pour plus d'utilisateurs |
| Remove user confirm | Supprimer {name} ? L'utilisateur perdra tout accès immédiatement. |
| Change role confirm | Modifier le rôle de {name} ? |
| Temporary password | Mot de passe temporaire |
| User status active | Actif |
| User status invited | Invitation envoyée |
| User status suspended | Suspendu |

### Stream Sharing

| Element | French Copy |
|---------|-------------|
| Share title | Partage de flux |
| Share subtitle | Générez un lien pour partager l'accès à vos caméras |
| Select cameras | Caméra(s) à partager |
| Share duration | Durée d'accès |
| 1 hour | 1 heure |
| 6 hours | 6 heures |
| 24 hours | 24 heures |
| Custom duration | Personnalisé |
| Generate link | Générer le lien |
| Share link | Lien de partage |
| Copy link | Copier le lien |
| Link copied | Lien copié ! |
| Revoke share | Révoquer le partage |
| Revoke confirm | Révoquer ce partage ? Le lien ne sera plus accessible. |
| Share active | Actif |
| Share expired | Expiré |
| Share revoked | Révoqué |
| No active shares | Aucun partage actif |
| Share warning note | Le tiers pourra accéder au flux sans authentification pendant la durée définie. |
| Link opened | Lien consulté par le destinataire |
| Share accessed notification | {name} a ouvert votre lien de partage |
| Share expires in | Expire dans {time} |

### Geofencing & Absence Mode

| Element | French Copy |
|---------|-------------|
| Absence mode title | Mode Absence |
| Armed | Armé |
| Disarmed | Désarmé |
| Armed status | Le système est armé — alertes renforcées |
| Disarmed status | Le système est désarmé — alertes normales |
| Phones connected | {count} téléphone(s) connecté(s) |
| Phone detected | Téléphone détecté |
| Phone not detected | Téléphone non détecté |
| Trusted WiFi | Réseaux WiFi de confiance |
| Add current network | Ajouter le réseau actuel |
| Add WiFi manually | Ajouter manuellement |
| Arm delay | Délai d'armement |
| Arm delay desc | Temps d'attente après le départ de tous les téléphones |
| Absence timeout | Timeout absence |
| Absence timeout desc | Délai avant de considérer un téléphone comme absent |
| Reinforced sensitivity | Sensibilité renforcée en mode absence |
| Manual arm | Forcer l'armement |
| Manual disarm | Forcer le désarmement |
| Override active | Forcé |
| Cancel override | Annuler le forçage |
| No phones configured | Aucun téléphone configuré |
| Arm schedule | Programmation horaire |
| Schedule override | Horaire programmé — remplace le géofencing |
| Absence activated notification | Mode absence activé |
| Presence activated notification | Mode présence activé |
| Arming countdown | Armement dans {N} min |
| Detection sensitivity enhanced | Sensibilité renforcée : tous les canaux actifs |

### Mobile-Specific Copy

| Element | French Copy |
|---------|-------------|
| Connecting to stream | Connexion au flux... |
| Try again | Réessayer |
| Arm toggle label | Armer / Désarmer |
| Arm confirm | Armer le système ? |
| Disarm confirm | Désarmer le système ? |
| Face upload success | Visage ajouté avec succès |
| Share link expired | Ce lien de partage a expiré |
| Share link invalid | Lien invalide |
| Request new link | Demandez un nouveau lien au propriétaire |
| Stream shared by | Flux partagé par {name} |
| Clip download | Télécharger le clip |
| Clip preparing | Préparation du clip... |
| Add trusted WiFi | Ajouter aux réseaux de confiance |
| Current WiFi | WiFi actuel : {ssid} |
| Not connected to trusted WiFi | Non connecté à un réseau de confiance |

### Status Badges

| Status | French Copy | Badge Variant |
|--------|-------------|---------------|
| ONLINE | En ligne | success |
| OFFLINE | Hors ligne | destructive |
| MAINTENANCE | Maintenance | warning |
| DEGRADED | Dégradé | warning |
| RECORDING | Enregistrement | destructive |
| DETECTING | Détection | default (cyan) |
| HD | HD | default (cyan) |
| SD | SD | secondary |
| ARMED | Armé | destructive |
| DISARMED | Désarmé | secondary |
| FACE_RECOGNIZED | Reconnu | success |
| FACE_PENDING | En attente | warning |
| SHARE_ACTIVE | Partagé | success |
| SHARE_EXPIRED | Expiré | secondary |
| DND_ACTIVE | Silencieux | warning |
| MODEM_OK | Modem OK | success |
| MODEM_OFFLINE | Modem hors ligne | destructive |
| DDNS_OK | DDNS configuré | success |
| DDNS_ERROR | DDNS erreur | destructive |

---

## Interaction Contracts

### Camera Grid & Live View

| Interaction | Behavior |
|-------------|----------|
| Click camera tile → Full view | Navigates to `/cameras/[id]` with full `VideoPlayer` |
| Hover camera tile | Shows "Voir le flux" overlay button + slight scale up (1.02) |
| Hover stream player | Controls overlay fades in (opacity 0→1, 0.2s), fades out after 3s no movement |
| Click fullscreen button | Enters browser fullscreen API, stream player fills viewport |
| Escape fullscreen | Keyboard Escape or click exit button |
| Click HD/SD toggle | Immediately switches stream source, brief "HD"/"SD" overlay, persists per-camera |
| Click snapshot button | Plays camera shutter haptic (CSS only), saves screenshot, toast confirmation |
| Stream reconnect | Auto-reconnect with exponential backoff: 1s, 2s, 4s, 8s... up to 8 attempts. Reset on success. |

### Detection Zone Canvas

| Interaction | Behavior |
|-------------|----------|
| Click "Rectangle" tool | Enter draw mode. Click-drag creates rectangle on canvas. |
| Click "Polygon" tool | Click to place vertices. Double-click or click first vertex to close polygon. |
| Drag existing zone vertex | Moves vertex, zone updates in real-time. |
| Click existing zone | Selects zone (highlight border), shows zone controls (rename, delete, toggle). |
| Hover zone | Zone border thickens, opacity increases slightly. |
| Delete zone | Click delete button → confirmation dialog → zone removed. |

### Timeline & Clip Export

| Interaction | Behavior |
|-------------|----------|
| Scroll timeline | Infinite scroll with date grouping. Loads more on reaching bottom. |
| Click date filter | Date picker dialog, applies filter on selection. |
| Click event card | Opens detail side panel (Sheet) with larger preview + clip player. |
| Click export clip | POST to `/api/events/{id}/export` → spinner on button → download URL returned → initiates download. |
| Click event screenshot | Opens full-size image in lightbox overlay. |

### Stream Sharing

| Interaction | Behavior |
|-------------|----------|
| Click "Générer le lien" | POST to `/api/shares` → link returned → displayed in monospace field. |
| Click "Copier" | `navigator.clipboard.writeText()` → button text changes to "Copié !" for 2s → reverts. |
| Click "Révoquer" | Confirmation dialog → POST to `/api/shares/{id}/revoke` → removed from active list. |
| Third party opens link | Notification to owner via Socket.IO + push. |

### Mobile Gestures

| Gesture | Target | Behavior |
|---------|--------|----------|
| Tap | Camera card (list) | Navigate to `/camera/[id]` live view |
| Tap | Live stream viewer | Toggle controls overlay (show/hide) |
| Pinch | Live stream viewer | Pinch-to-zoom (native gesture handler) |
| Double-tap | Live stream viewer | Toggle fullscreen mode |
| Swipe left | Alert card | Acknowledge alert (optimistic update) |
| Swipe right | Alert card | Open live stream for related camera |
| Pull down | Camera list / Timeline | Refresh data |
| Tap & hold | Arm/Disarm toggle | Show status details tooltip |
| Swipe down | Stream viewer (from top) | Exit fullscreen / go back |
| Long press | Face thumbnail | Show context menu (edit, delete) |

### Mobile Tap Targets

| Element | Minimum Size | Purpose |
|---------|-------------|---------|
| Arm/Disarm button | 64×64pt | Primary action, easy one-handed tap |
| Stream control buttons | 48×48pt | Mute, snapshot, HD/SD, fullscreen |
| Back button | 44×44pt | Navigation |
| Camera card tap area | Full card height | Navigate to live view |
| Timeline filter chip | 36pt height | Tap filter |
| Alert quick actions | 44×44pt | Acknowledge, view stream |
| Share link tap | Full card width | Open shared stream |
| Upload photo button | 56pt height | Face upload CTA |

### Notification Behaviors

| Trigger | Behavior |
|---------|----------|
| Motion detected (human) | Push notification: "{camera_name} — Mouvement humain détecté" + snapshot thumbnail |
| Face recognized | Push notification: "{camera_name} — {face_name} reconnu" |
| Face unknown | Push notification: "{camera_name} — Visage inconnu détecté" |
| WhatsApp alert | Photo sent via WhatsApp with text: "ALERTE {camera_name} — {event_type} — {timestamp}" |
| SMS alert (no modem) | Queued. Retry when modem reconnects. |
| SMS alert (modem OK) | Sent immediately. Log: "SMS envoyé à {number}" |
| DND period | Push suppressed. Exception: CRITICAL alerts pass through. |
| Absence mode armed | Notification: "Mode absence activé" |
| Absence mode disarmed | Notification: "Mode présence activé" |
| Share link opened | Notification: "{name} a ouvert votre lien de partage" |
| Storage critical | Warning notification: "Espace disque critique" |
| Recording error | Error notification: "Erreur d'enregistrement sur {camera_name}" |

### Stream Buffering & Connection States

| State | Visual Feedback |
|-------|-----------------|
| Connecting | Spinner overlay + "Connexion..." + attempt counter |
| Reconnecting (interrupted) | Brief flash overlay "Reconnexion..." without losing full player UI |
| Buffering | Pulsing cyan border on player frame |
| Connected | Green dot in corner, FPS counter appears |
| Quality degraded (substream) | Yellow "SD" badge, tooltip "Qualité réduite" |
| Stream error | Red overlay "Erreur de flux" + "Réessayer" button |
| No stream (offline) | Dark placeholder with camera name + "Hors ligne" badge |

### Geofencing State Transitions

| Transition | Behavior | UI Feedback |
|------------|----------|-------------|
| All phones leave WiFi | Start arm countdown timer (configurable delay) | Countdown in GeofencingStatusBar + notification at 0 |
| Countdown expires | Activate armed mode | Status bar turns red/green, notification "Mode absence activé" |
| Phone returns before expiry | Cancel arm, stay disarmed | Status bar stays/returns to disarmed state |
| Phone returns while armed | Immediate disarm (no confirmation) | Status bar transitions to disarmed, notification "Mode présence activé" |
| Manual arm button pressed | Immediate arm (no countdown) | Status bar immediately armed with "Forcé" badge |
| Scheduled arm time reached | Arm regardless of geofencing | Status bar shows schedule badge |
| DND active + absence mode | Absence mode overrides DND | Alerts fire at reinforced sensitivity |

---

## States & Transitions

### Loading States

| Pattern | Implementation |
|---------|---------------|
| Camera grid loading | Grid of `Skeleton` blocks with `aspect-video`, `animate-pulse`, 8 blocks minimum |
| Timeline loading | Stacked skeleton rows: thumbnail skeleton (48×48) + 2 text line skeletons per row |
| Settings page loading | 3 `Skeleton` card blocks with label skeleton + control skeleton per card |
| Face grid loading | Grid of round `Skeleton` circles (64×64) + text line skeletons |
| Mobile list loading | `ActivityIndicator` (cyan) centered + loading text below |
| Mobile stream connecting | Full-screen dark overlay with cyan spinner + "Connexion au flux..." |
| Channel config loading | Per-channel skeleton card with toggle skeleton + status badge skeleton |
| User list loading | Table skeleton, 5 rows |
| ONVIF scan results loading | Progress bar indeterminate + pulse animation |

### Empty States

| Pattern | Implementation | Icon |
|---------|---------------|------|
| No cameras configured | Glass card centered: icon + heading + body + CTA button | `VideoOff` |
| No events in timeline | Centered: icon + "Aucun événement dans cette période" | `CalendarX` |
| No detection zones | Canvas placeholder with "+ Ajouter une zone" overlay | `RectangleHorizontal` with plus |
| No faces registered | Grid placeholder: icon + heading + body + CTA | `UserPlus` |
| No active shares | Centered card: icon + heading + body + generate CTA | `Link2Off` |
| No users (VISION limit) | Warning banner above empty table + upgrade CTA | `Users` with lock |
| No trusted WiFi networks | Settings section: icon + "Aucun téléphone configuré. Ajoutez depuis l'app mobile." | `WifiOff` |
| No SMS modem | Orange badge "Modem non détecté" + troubleshooting link | `Smartphone` with X |
| No WhatsApp connection | Large QR code display + instructions | `MessageCircle` |
| No DDNS configured | Settings section: icon + "Configuration requise" + setup guide | `Globe` with slash |
| Share link expired/invalid (mobile) | Full-screen: icon + message + "Demandez un nouveau lien" | `Link2Off` |

### Error States

| Pattern | Implementation |
|---------|---------------|
| Inline form error | Red text below input or error box above form — matching existing login pattern |
| Card error (settings) | Red-tinted glass card with error icon + message + retry button |
| Full-page error (camera grid) | Error card with "Erreur de chargement" + "Réessayer" CTA |
| Stream error | Red overlay on player: error icon + "Erreur de flux" + retry |
| Toast error | `Toast` component for transient errors (clip export fail, save fail) |
| Mobile error box | Red-tinted view container with destructive color text + retry button |
| Mobile stream error | Full overlay on player: icon + message + "Réessayer" |
| Network error (all pages) | Banner: "Erreur réseau" + "Vérifiez votre connexion" |

### Transitions

| Element | Transition |
|---------|-----------|
| Page enter | `animate-fade-in` (0.5s ease-out) — existing `PageTransition` pattern |
| Camera tile appear | Staggered: `motion.button` with `initial={{ opacity: 0, scale: 0.95 }}`, `animate={{ opacity: 1, scale: 1 }}`, delay `i * 0.05` |
| Card hover | `hover:border-primary/30`, `hover:scale-[1.02]`, `transition-all duration-200` |
| Stream controls overlay | Fade in/out: `opacity-0 → opacity-100`, 0.3s ease, auto-hide after 3s |
| Stream quality switch | Brief overlay appears "HD" → "SD" with fade, 1s display |
| Timeline filter change | Content cross-fade: new results fade in, old fade out (0.3s) |
| Share link copy feedback | Button text changes, 2s delay, reverts |
| Arm/disarm state change | Status bar color transition (0.5s), icon animation |
| Mobile screen push | `slide_from_right` animation (250ms) — existing Expo Router pattern |
| Mobile accordion expand | Smooth height transition (0.3s) |
| Dialog open | Radix Dialog built-in fade + scale |
| Button active | `active:scale-[0.98]` — existing pattern |
| Progress bar fill | `transition-all duration-700` |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | N/A — all 16 existing components already initialized. No new shadcn blocks need to be added. | Not required — no new shadcn blocks from registry. All VISION-specific components are custom, built on existing glass/glow utilities and `cn()` helper. |
| Third-party | None | N/A |

**Policy:** All new VISION components (LiveCameraGrid, DetectionZoneCanvas, StreamShareSheet, GeofencingStatusBar, etc.) are built as CUSTOM components using existing design system patterns:
- `cn()` utility for class merging
- Existing `glass`, `glass-premium`, `glass-accent` CSS classes
- Existing `glow-cyan`, `glow-red`, `glow-amber` glow utilities
- `motion/react` for animations (already installed)
- `lucide-react` / `lucide-react-native` for icons (already installed)
- Existing shadcn primitives (Dialog, Sheet, Card, etc.) as shells
- Mobile: `StyleSheet.create()` pattern, `@repo/design` tokens, `@/lib/theme.ts` helpers

**Do NOT install new shadcn blocks or third-party registries without explicit review.**

---

## Mobile-Specific Considerations

### Camera Viewer (expo-av)

- Use `expo-av` `<Video>` component for HLS/RTSP streaming
- Configure audio session: `Audio.setAudioModeAsync({ staysActiveInBackground: true })` for background playback
- Pinch-to-zoom via `react-native-gesture-handler` `PinchGestureHandler`
- Double-tap fullscreen via `TapGestureHandler` with `numberOfTaps={2}`
- Controls overlay: absolute positioned `View` with `pointerEvents="box-none"`
- Auto-hide controls: `useEffect` with 3s timeout on last interaction
- Stream reconnection: same exponential backoff as dashboard (1s, 2s, 4s... max 8)
- **Offline resilience:** Cache last known snapshot. Show placeholder if stream unavailable.
- Background audio: `Audio.setAudioModeAsync({ playThroughEarpieceAndroid: false })`

### WiFi SSID Detection (Geofencing)

- Use `expo-network` (`Network.getIpAddressAsync()`) or `react-native-wifi-reborn` for SSID detection
- Alternative: `@mauron85/react-native-background-geolocation` if SSID access is restricted (iOS)
- Background task: check WiFi SSID every 60 seconds when app is backgrounded
- On SSID change from trusted → untrusted → start arm countdown
- On SSID change from untrusted → trusted → disarm immediately
- Store trusted SSIDs in `expo-secure-store`
- **No GPS required** — WiFi only (per D-10)

### Push Notifications

- Use `expo-notifications` for push notification handling
- Notification data payload: `{ cameraId, eventType, snapshotUrl, alertId }`
- Tap notification → navigate to relevant screen (`/alert/[id]` or `/camera/[id]`)
- Background notification → update badge count, no sound during DND
- Notification channels (Android): "Alertes", "Système", "Mode Absence"
- Critical alerts: use `notificationContentAndroid.priority = 'high'` + `channelId: 'critical'`

### Secure Storage

- API tokens: `expo-secure-store` (existing pattern)
- Trusted WiFi SSIDs: `expo-secure-store` with JSON encode/decode
- Camera credentials: `expo-secure-store` per camera (face detection connection)

### Expo Router Route Additions

| Route | Screen | Auth Required |
|-------|--------|---------------|
| `app/camera/[id].tsx` | LiveStreamViewer | Yes |
| `app/visages/ajouter.tsx` | FaceUploadScreen | Yes |
| `app/partager/[token].tsx` | ShareLinkReceiver | No (token-based) |
| `app/chronologie/index.tsx` | EventTimelineScreen | Yes |
| `app/chronologie/[id].tsx` | EventDetail | Yes |

### Tab Bar Extension

Add to `(tabs)/_layout.tsx`:
- Home screen: add `ArmDisarmToggle` in quick actions section
- Cameras tab: extend to show live stream grid
- No new tabs needed for Phase 2 — functionality lives within existing tabs

---

## Checker Sign-Off

- [ ] Dimension 1 — Copywriting: Every French string verified against contract
- [ ] Dimension 2 — Visuals: Glass morphism, cyan accents, grid backgrounds inherited correctly
- [ ] Dimension 3 — Color: No new HSL tokens introduced; VISION reservations enforced
- [ ] Dimension 4 — Typography: 4 sizes max, 2 weights max per platform
- [ ] Dimension 5 — Spacing: Multiples of 4, exceptions documented with rationale
- [ ] Dimension 6 — Registry Safety: No new shadcn blocks; all custom components
- [ ] Dimension 7 — Mobile Spec: All mobile pages, gestures, tap targets, and native behaviors defined
- [ ] Dimension 8 — Interaction Contracts: All gestures, transitions, and state changes documented
- [ ] Dimension 9 — State Coverage: Every page has loading, empty, error, and edge case states

**Approval:** Pending

---

*Phase: 2-VISION Pack*
*UI-SPEC created: 2026-07-18*
*Inherits from: Phase 1 UI-SPEC (01-architecture-license-foundation)*
