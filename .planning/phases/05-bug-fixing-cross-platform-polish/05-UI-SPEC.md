---
status: approved
reviewed_at: 2026-07-17T20:00:00Z
phase: 5
phase_name: Bug Fixing & Cross-Platform Polish
created_at: 2026-07-17
design_system: shadcn/ui (manual setup, no components.json) + @repo/design package
---

# UI-SPEC: Phase 5 — Bug Fixing & Cross-Platform Polish

## Design System State

### What Exists

| Asset | Location | Status |
|-------|----------|--------|
| Tailwind CSS config | `apps/dashboard/tailwind.config.ts` | ✅ Active |
| CSS variables (shadcn) | `apps/dashboard/app/globals.css` | ✅ Active (dark + light themes) |
| shadcn/ui components | `apps/dashboard/components/ui/` (16 components) | ✅ Active |
| Dashboard custom components | `apps/dashboard/components/` (sidebar, header, etc.) | ✅ Active |
| `@repo/design` package | `packages/design/src/` (colors, typography, spacing, shadows, marketing) | ✅ Active |
| Mobile local theme | `apps/mobile/lib/theme.ts` | ⚠️ Diverged from `@repo/design` |
| Mobile components | `apps/mobile/components/` (11 components) | ✅ Active |
| Dashboard i18n (fr+en) | `apps/dashboard/lib/i18n/dictionaries/` (fr.ts: 811 lines) | ✅ Active |
| Mobile i18n | Not detected | ⚠️ May use hardcoded strings |

### Design Token Source of Truth

The canonical design tokens live in `packages/design/src/`:

- **colors.ts** — dark mode (bg: #070912, surface: #0c1020) + light mode + shared semantic
- **typography.ts** — 4-size scale (display 28px, heading 20px, body 14px, label 12px). Monospace is a font-family variant (JetBrains Mono), not a separate size.
- **spacing.ts** — 9-step scale (xs: 4 → xxxxl: 96)
- **shadows.ts** — 3 levels (sm, md, glow)

**Critical finding:** `apps/mobile/lib/theme.ts` contains a locally-diverged copy of these tokens (slightly different values: bg: #0a0e17 vs #070912, body: 15px vs 14px, custom spacing scale). **One polish task must reconcile Mobile to `@repo/design` as source of truth.**

### Design System Detection

**shadcn gate result:** shadcn/ui is manually installed (16 components in `apps/dashboard/components/ui/`) but **no `components.json`** exists. Components use CSS custom properties (`--shadcn-*`) and the `cn()` utility with `tailwindcss-animate`. No CLI reinitialization needed — the setup is functional. Note in contract: `Tool: manual`.

---

## 1. Spacing Contract

### Canonical Scale (from `packages/design/src/spacing.ts`)

**Base cadence:** 8-point grid (8, 16, 24, 32, 48, 64). Two intentional exceptions documented below.

| Token | px | rem | Usage |
|-------|-----|-----|-------|
| `xs` | 4 | 0.25 | Icons, micro-gaps |
| `sm` | 8 | 0.5 | Tight gaps, padding inside cards |
| `md` | 12 | 0.75 | **Exception —** Button horizontal padding (wider than 8px, too narrow at 16px). Matches shadcn/ui button default `px-3` (12px) for balanced visual weight. |
| `base` | 16 | 1 | Standard gap, card padding (default) |
| `lg` | 24 | 1.5 | Section spacing |
| `xl` | 32 | 2 | Large section spacing, modal padding |
| `xxl` | 48 | 3 | Page section separation |
| `xxxl` | 64 | 4 | Major page sections |
| `xxxxl` | 96 | 6 | **Exception —** Hero/landing spacing. Twice the 48px (`xxl`) step. Used exclusively in marketing pages (hero section padding between major blocks). Deployed sparingly — only in `packages/design/src/marketing.ts`. |

### Mobile-Specific Exceptions

- **Touch targets:** Minimum 44×44px interactive area per Apple HIG / Material Design (icon buttons, list items, tab bar buttons). Enforce via `min-w-[44px] min-h-[44px]` or `padding: 8px` on pressable elements.
- **Existing local scale** (`apps/mobile/lib/theme.ts`: xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24) has diverged at xl/xxl from `@repo/design` (xl: 32, xxl: 48). **Reconciliation action:** Replace local scale with `@repo/design` imports.

### Dashboard Spacing
- Uses Tailwind utility classes exclusively (4-base grid: `p-4`, `gap-6`, `m-8`)
- Sidebar: collapsed 64px, expanded 240px
- Main content padding: `p-6 pt-4` (24px horizontal, 16px top)
- Card padding: uses shadcn card component defaults

### This Phase: No changes to spacing scale. Fix divergence between Mobile local theme and `@repo/design` package.

---

## 2. Typography Contract

### Canonical Scale (from `packages/design/src/typography.ts`)

**4-size scale.** Monospace is a font-family variant (JetBrains Mono), NOT a separate size.

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| `display` | 28px (1.75rem) | 600 (semibold) | 1.2 | Page titles, hero/stat numbers |
| `heading` | 20px (1.25rem) | 600 (semibold) | 1.2 | Section headings, card titles & stat values *(override font-family to JetBrains Mono for stat values)* |
| `body` | 14px (0.875rem) | 400 (regular) | 1.5 | Body text, descriptions, data readouts *(override weight to 600 + JetBrains Mono + tabular-nums for FPS, counters)* |
| `label` | 12px (0.75rem) | 600 (semibold) | 1.2 | Labels, metadata, section titles, uppercase stat labels |

**Monospace variant reference:**
- Stat values: `heading` size (20px) + `fontFamily: 'JetBrains Mono'` + `fontWeight: 600`
- Data readouts (FPS, counters): `body` size (14px) + `fontFamily: 'JetBrains Mono'` + `fontWeight: 600` + `fontVariant: tabular-nums`
- No unique font-size exists for monospace — it is always applied at an existing scale size.

### Font Family
- **Dashboard:** `'IBM Plex Sans'` (headings + body), `'JetBrains Mono'` (mono/data) — loaded via Google Fonts in `globals.css`
- **Mobile:** Uses system fonts (SF Pro on iOS, Roboto on Android). No custom font loading detected. Acceptable per D-04 (visual styling differences acceptable).

### This Phase Actions
1. **Reconcile mobile `typography` scale** in `apps/mobile/lib/theme.ts` to match `@repo/design/src/typography.ts`. Mobile h1(24px)→display(28px), h2(20px)→heading(20px)✓, h3(16px) should become body(14px) or be documented as intentional mobile exception. Remove local `mono` (24px) — monospace is a font-family variant, not a separate size.
2. **Audit Dashboard** for hardcoded font sizes outside Tailwind typography utilities (check inline `style={{fontSize:...}}`, className with non-TW sizing).

---

## 3. Color Contract

### 60/30/10 Split (Dashboard — Dark Theme Default)

| Category | CSS Variable | HEX (dark) | Coverage | Used For |
|----------|-------------|------------|----------|----------|
| **60% — Dominant** | `--shadcn-background` | `#07080b` | Background, page shells | App background, main surfaces |
| **30% — Secondary** | `--shadcn-card` | `#0c1020` | Cards, sidebar, nav | `--shadcn-secondary` (12% surface), card backgrounds, sidebar |
| **10% — Accent** | `--shadcn-primary` | `#06b6d4` (cyan) | Interactive elements | Buttons, links, toggles, active states, focus rings, badges |

### Reserved Accent Elements (the 10%)
Accent (cyan `#06b6d4`) is reserved exclusively for:
- Primary action buttons (`bg-primary`)
- Active navigation items
- Focus rings (`ring-primary`)
- Toggle/switch active state
- Severity-critical badge accent
- Status indicators (online pulse)
- Link text

**Do NOT use accent for:** Background fills, borders on non-interactive cards, decorative elements, body text, disabled states.

### Semantic Colors

| Token | HEX | Purpose |
|-------|-----|---------|
| `destructive` | `#ef4444` (red) | Destructive actions ONLY — delete, revoke, terminate |
| `warning` | `#f59e0b` (amber) | Warning states, degraded status, medium alerts |
| `success` | `#10b981` (emerald) | Success states, online status, resolved alerts |
| `muted-foreground` | `#64748b` (slate) | Secondary text, placeholders, metadata |

### @repo/design Shared Colors (from `packages/design/src/colors.ts`)

```typescript
// Already aligned with Dashboard CSS variables
shared: {
  primary: "#06b6d4",     // cyan accent
  primaryDark: "#0891b2",
  success: "#10b981",     // emerald
  warning: "#f59e0b",     // amber
  destructive: "#ef4444", // red
  info: "#06b6d4",        // same as primary
}
```

### This Phase Actions
1. **Reconcile Mobile local colors** (`apps/mobile/lib/theme.ts`) with `@repo/design/src/colors.ts`. Current discrepancies:
   - `bg`: `#0a0e17` (mobile) vs `#070912` (@repo/design)
   - `surface`: `#111827` (mobile) vs `#0c1020` (@repo/design)
   - `elevated`: `#1a2332` (both — same)
2. **Audit color application parity** — every semantic state (critical, high, medium, low, online, offline, acknowledged, resolved) should use the same color token on both platforms.

---

## 4. Copywriting Contract

### Source of Truth

**French (fr) is the source of truth** for all UI text (D-06). Every UI string originates in French. English and other locales follow French coverage.

### Dashboard i18n

| Detail | Value |
|--------|-------|
| Provider | `I18nProvider` in `apps/dashboard/lib/i18n/context.tsx` |
| Locale files | `fr.ts` (811 lines), `en.ts` |
| Key pattern | Dot-notation: `cameras.title`, `alerts.severity.critical` |
| API | `t('nav.dashboard')` via `useTranslation()` hook |
| Fallback | Returns raw key string if not found |
| Force locale | Always "fr" (see `detectLocale()`) |

### Mobile i18n

No i18n infrastructure detected in mobile codebase. UI strings appear to be hardcoded. **One of the key polish items is adding mobile i18n or extracting hardcoded strings to shared constants.**

### Required Copy Categories

#### Empty States
| Screen | Copy (FR) | Notes |
|--------|-----------|-------|
| Camera grid | `Aucune caméra trouvée. Ajoutez votre première caméra pour commencer.` | With action button |
| Alerts list | `Aucune alerte pour le moment.` | When status filter yields empty |
| Incidents | `Aucun incident signalé.` | When no active incidents |
| Visitor log | `Aucun visiteur enregistré.` | Preregistration or history |
| Search results | `Aucun résultat pour "{query}".` | With query embedded |
| Notifications | `Aucune notification.` | Empty notifications tab |
| Dashboard stats | `Chargez les statistiques...` | Loading state (not empty) |

#### Error States
| Context | Copy (FR) | Recovery Action |
|---------|-----------|-----------------|
| API fetch failure | `Impossible de charger les données.` | "Réessayer" button |
| Auth failure | `Session expirée. Veuillez vous reconnecter.` | Redirect to login |
| Camera stream | `Flux indisponible.` | "Reconnecter" button |
| Form validation | `Veuillez corriger les erreurs ci-dessous.` | Field-level highlight |
| Network offline | `Aucune connexion réseau.` | Wait and retry |
| Server error (500) | `Erreur serveur. Contactez le support si le problème persiste.` | "Réessayer" + support link |

#### Loading States
| Component | Pattern |
|-----------|---------|
| List screens | Skeleton cards (shadcn Skeleton) matching card shape — 3-4 items |
| Detail screens | Full-page centered spinner with "Chargement..." label |
| Action buttons | Button spinner variant — disables button, shows spinner |
| Pull-to-refresh | Mobile: standard RefreshControl on FlatList/FlashList |
| Initial page load | Dashboard: `<PageTransition>` wrapper with `fade-in` animation |

#### Destructive Actions
| Action | Confirmation Pattern | Copy (FR) |
|--------|---------------------|-----------|
| Delete camera | Dialog: title + description + Cancel/Delete buttons | `Supprimer la caméra` — `Cette action est irréversible. La caméra "{name}" sera définitivement supprimée.` |
| Delete alert | Dialog | `Supprimer l'alerte` — `L'alerte "{title}" sera définitivement supprimée.` |
| Delete site | Dialog with typed confirmation | `Supprimer le site` — `Toutes les caméras et données associées seront supprimées. Tapez "SUPPRIMER" pour confirmer.` |
| Revoke API key | Dialog | `Révoquer la clé API` — `Les services utilisant cette clé perdront immédiatement l'accès.` |
| Force logout device | Dialog | `Déconnecter l'appareil` — `L'utilisateur sera déconnecté de cet appareil.` |
| Delete user | Dialog | `Supprimer l'utilisateur` — `L'utilisateur "{name}" perdra tout accès à la plateforme.` |

**Destructive button style:** Always `bg-destructive text-destructive-foreground` with hover state. Never use accent color for destructive actions.

#### Primary CTA Labels
| Context | Label (FR) | Notes |
|---------|-----------|-------|
| Add camera | `Ajouter une caméra` | Page-level CTA |
| Create alert rule | `Créer une règle` | Form submit |
| Invite user | `Inviter un utilisateur` | User management |
| Pre-register visitor | `Préinscrire un visiteur` | Visitor management |
| Acknowledge alert | `Prendre en compte` | Alert action |
| Resolve alert | `Résoudre l'alerte` | Alert action — includes noun for specificity |
| Save changes | `Enregistrer les modifications` | General form |
| Confirm delete | `Supprimer` | Destructive confirm |
| Retry | `Réessayer` | Error recovery |
| Go back | `Retour` | Navigation |
| Cancel | `Annuler` | Dialog dismissal |

### This Phase Actions
1. Audit all hardcoded French strings in Dashboard components vs `fr.ts` dictionary — move any that are not yet in the dictionary (D-09).
2. Audit Mobile screens for hardcoded strings — establish Mobile i18n or extract to shared dictionary (D-10).
3. Verify `en.ts` coverage matches `fr.ts` — flag any missing keys.

---

## 5. Component Inventory

### Dashboard (Next.js) — shadcn/ui Primitives

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Button | `components/ui/button.tsx` | ✅ Exists | cva variants: default, destructive, outline, secondary, ghost, link + sizes |
| Card | `components/ui/card.tsx` | ✅ Exists | Header, content, footer, title, description |
| Badge | `components/ui/badge.tsx` | ✅ Exists | Variants: default, secondary, destructive, outline |
| Input | `components/ui/input.tsx` | ✅ Exists | Base input with focus ring |
| Table | `components/ui/table.tsx` | ✅ Exists | Header, body, row, cell, caption |
| Dialog | `components/ui/dialog.tsx` | ✅ Exists | Radix-based modal dialog |
| DropdownMenu | `components/ui/dropdown-menu.tsx` | ✅ Exists | Radix-based |
| Toast | `components/ui/toast.tsx` | ✅ Exists | Custom toast implementation |
| Skeleton | `components/ui/skeleton.tsx` | ✅ Exists | Loading placeholder |
| Sheet | `components/ui/sheet.tsx` | ✅ Exists | Radix-based side panel |
| Tooltip | `components/ui/tooltip.tsx` | ✅ Exists | Radix-based |
| ScrollArea | `components/ui/scroll-area.tsx` | ✅ Exists | Radix-based |
| Separator | `components/ui/separator.tsx` | ✅ Exists | Radix-based |
| Label | `components/ui/label.tsx` | ✅ Exists | Radix-based |
| Avatar | `components/ui/avatar.tsx` | ✅ Exists | Radix-based |
| Progress | `components/ui/progress.tsx` | ✅ Exists | Radix-based |

### Dashboard — Custom Components

| Component | File | Purpose |
|-----------|------|---------|
| Sidebar | `components/sidebar.tsx` | Navigation sidebar |
| Header | `components/header.tsx` | Top bar with search, user menu |
| SidebarProvider | `components/sidebar-provider.tsx` | Sidebar collapse state |
| ProtectedLayout | `components/protected-layout.tsx` | Auth guard wrapper |
| DashboardLayout | `components/dashboard-layout.tsx` | Shell layout |
| PageTransition | `components/page-transition.tsx` | Fade/slide page transitions |

### Mobile (Expo) — Components

| Component | File | Purpose |
|-----------|------|---------|
| ErrorBoundary | `components/error-boundary.tsx` | Crash boundary |
| CameraCard | `components/camera-card.tsx` | Camera status card |
| AlertCard | `components/alert-card.tsx` | Alert item card |
| StatsCard | `components/stats-card.tsx` | Metric display card |
| MobileIncidentCard | `components/mobile-incident-card.tsx` | Incident card |
| DoorControlCard | `components/door-control-card.tsx` | Door action card |
| QuickActionButton | `components/quick-action-button.tsx` | Action FAB |
| OrgSwitcher | `components/org-switcher.tsx` | Org selector |
| QRScanner | `components/qr-scanner.tsx` | QR scanning |
| NFCScanner | `components/nfc-scanner.tsx` | NFC reading |
| PhotoCapture | `components/photo-capture.tsx` | Evidence photo |

### Missing Patterns

| Pattern | Dashboard | Mobile | Parity Action |
|---------|-----------|--------|---------------|
| Empty state component | Ad-hoc per page | Ad-hoc per screen | Add consistent `EmptyState` reusable component on both platforms |
| Loading skeleton | `Skeleton` exists | No skeleton pattern | Add skeleton loading to mobile lists |
| Error boundary | Not detected per-page | `error-boundary.tsx` exists | Add Sentry integration to mobile error boundary |
| Pull-to-refresh | N/A (page reload) | Not in all lists | Add `RefreshControl` to all Mobile list screens |
| Paginated list | Server-side via API | Not detected | Add pagination/infinite scroll to Mobile lists |
| Confirm dialog | `Dialog` + `AlertDialog` | Not detected | Add confirmation dialog pattern to Mobile |
| Toast/notification | `Toast` exists | Not detected | Add toast/Snackbar to Mobile |

---

## 6. Registry Safety

**shadcn initialization:** Manual setup (no `components.json`). All 16 shadcn components in `apps/dashboard/components/ui/` are standard shadcn patterns checked into the codebase.

**Third-party registries:** None declared. Components use standard:
- `@radix-ui/*` — accessible UI primitives (high trust, industry standard)
- `lucide-react` / `lucide-react-native` — icon library (high trust)
- `class-variance-authority` — variant management (high trust)
- `clsx` + `tailwind-merge` — class utilities (high trust)
- `tailwindcss-animate` — Tailwind plugin (high trust)

**No registry vetting needed** — no third-party blocks or registries beyond shadcn official.

---

## 7. Platform Parity Matrix Approach

### Methodology (per D-05)

Build a markdown parity matrix that maps every Dashboard route to its Mobile counterpart. The matrix will be created during planning and used throughout execution.

### Dashboard Routes (26 sections) → Mobile Screens

| # | Dashboard Route | Mobile Screen | Parity Status | Data Fields | Actions |
|---|----------------|---------------|---------------|-------------|---------|
| 1 | `acces` (Access) | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 2 | `alertes` | `(tabs)/alerts.tsx` | ✅ Exists | Compare fields | Acknowledge, resolve |
| 3 | `analytique` (Analytics) | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 4 | `api-keys` | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 5 | `audit` | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 6 | `cameras` | `(tabs)/cameras.tsx` | ✅ Exists | Compare fields | View, filter |
| 7 | `chat` | `(tabs)/guard/chat.tsx` | ✅ Exists | Compare fields | |
| 8 | `chronologie` (Timeline) | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 9 | `command-center` | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 10 | `conformite` (Compliance) | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 11 | `equipement` (Equipment) | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 12 | `gouvernance` (Governance) | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 13 | `ia` (AI) | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 14 | `incidents` | `(tabs)/incidents.tsx` | ✅ Exists | Compare fields | Status update |
| 15 | `licences` (Licenses) | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 16 | `maintenance` | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 17 | `notifications` | Separate tab area | ⚠️ Partial | N/A | N/A |
| 18 | `parametres` (Settings) | `(tabs)/settings.tsx` | ✅ Exists | Compare fields | |
| 19 | `patterns` | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 20 | `portes` (Doors) | `(tabs)/guard/door-control.tsx` | ✅ Exists | Compare fields | Lock, unlock |
| 21 | `risque` (Risk) | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 22 | `schemas` (Schemas) | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 23 | `sites` | `(tabs)/sites.tsx` | ✅ Exists | Compare fields | |
| 24 | `utilisateurs` (Users) | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 25 | `vehicules` (Vehicles) | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 26 | `visiteurs` (Visitors) | `(tabs)/guard/qr-checkin.tsx` | ✅ Exists | Compare fields | Check-in/out |
| 27 | `webhooks` | Not in `(tabs)` | ⚠️ Missing | N/A | N/A |
| 28 | Dashboard home | `(tabs)/index.tsx` | ✅ Exists | Stats cards | |

### Parity Bar Definition (per D-04)

**Same data, same actions** means:
- If Dashboard page shows fields X, Y, Z → Mobile must show fields X, Y, Z (layout may differ)
- If Dashboard page offers actions A, B → Mobile must offer actions A, B (interaction pattern may differ)
- Visual styling differences (colors, spacing, fonts) are acceptable
- Missing screens are documented as gaps and flagged for parity during this phase

### This Phase Actions
1. Expand the preliminary matrix above into a detailed parity checklist during planning
2. For each ✅ Exists screen: walk through side-by-side and fix discrepancies
3. For each ⚠️ Missing screen: assess if mobile counterpart is needed (some admin-only screens may not belong on mobile)
4. Document any intentionally missing mobile screens with rationale

---

## 8. Performance & Stability Contracts

### Mobile Performance Bar (D-08)

| Metric | Target | Measurement | Failure |
|--------|--------|-------------|---------|
| Navigation smoothness | 60fps | No dropped frames during tab switches and screen transitions | Jank visible to operator |
| List scrolling | 60fps | `@shopify/flash-list` for lists >10 items; FlatList acceptable for <10 | Scroll jank, blank cells |
| Crash-free sessions | 100% | Zero crashes during standard operator workflows | Any unhandled exception reaches user |
| Sentry crash rate | <0.1% | % of sessions with unhandled exception | Exceeds threshold |

### Standard Operator Workflows (must be crash-free, per D-08)

1. **View cameras** → browse camera grid → tap camera → view stream → back to grid
2. **Respond to alerts** → view alert list → tap alert → view details → acknowledge → back to list
3. **Check door status** → open door control → view door states → toggle lock → confirm
4. **Manage visitors** → view visitor queue → tap visitor → check in / check out → confirm
5. **View incidents** → view incident list → tap incident → view details → update status
6. **AI Chat** → open chat → send message → view response → send follow-up

### Performance Optimization Toolkit (Agent's Discretion, per CONTEXT.md)

| Technique | Where to Apply | Priority |
|-----------|---------------|----------|
| `@shopify/flash-list` | Camera grid, alert list, incident list, notification list | High |
| `React.memo` | Card components in lists (CameraCard, AlertCard, IncidentCard) | Medium |
| `useCallback` / `useMemo` | Navigation callbacks, filtered/sorted data | Medium |
| Lazy loading (screens) | Expo Router automatic (built-in) | Already on |
| Image caching | Camera thumbnails, visitor photos (expo-file-system) | Low |
| Remove console.log | All production code paths | Medium |
| Bundle size audit | Check for unused imports, large dependencies | Low |

### Sentry Crash Reporting (D-07)

| Detail | Specification |
|--------|---------------|
| Package | `@sentry/react-native` |
| Init location | `apps/mobile/app/_layout.tsx` (root layout, before any navigation) |
| DSN source | Environment variable (`SENTRY_DSN`) |
| Source maps | Upload on EAS Build (automatic with `eas secret:create`) |
| Performance tracing | Optional — include `Sentry.wrap()` on root component |
| User context | Set `Sentry.setUser({ id, email })` on login |
| Breadcrumbs | Enable default breadcrumbs (navigation, network, touch) |

### This Phase Actions
1. Add `@shopify/flash-list` to mobile dependencies
2. Add `@sentry/react-native` to mobile dependencies
3. Configure Sentry DSN in `eas.json` secrets
4. Integrate Sentry into error boundary + root layout
5. Wrap list screens with FlashList
6. Add `React.memo` to card components used in lists

---

## Summary of UI Contract for This Phase

| Contract Area | Status | Action Required |
|---------------|--------|-----------------|
| Spacing scale | Established in `@repo/design` | Reconcile mobile `theme.ts` to canonical |
| Typography scale | Established in `@repo/design` | Reconcile mobile `theme.ts` to canonical |
| Color tokens | Established in `@repo/design` + CSS vars | Reconcile mobile `theme.ts` to canonical |
| Font families | ✅ Dashboard (IBM Plex Sans + JetBrains Mono) | Mobile uses system fonts — acceptable |
| i18n / Copywriting | ✅ Dashboard (fr.ts + en.ts) | Audit hardcoded strings, establish mobile i18n |
| Component patterns | 16 shadcn + 6 custom (Dashboard) / 11 custom (Mobile) | Add missing patterns (empty state, toast, confirm dialog) to Mobile |
| Platform parity | 8/28 routes paired | Build full parity matrix, fix gaps |
| Mobile performance | ❌ No Sentry, no FlashList | Add both, optimize lists |
| Translation coverage | ❌ Mobile hardcoded | Extract to i18n, audit Dashboard coverage |

**No new UI components to design.** This phase audits, fixes, and aligns existing components across platforms.
