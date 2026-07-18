---
phase: 1
slug: architecture-license-foundation
status: approved
reviewed_at: 2026-07-18
shadcn_initialized: true
preset: shadcn/ui default (slate base, CSS variables, dark mode)
created: 2026-07-18
---

# Phase 1 — UI Design Contract

> Visual and interaction contract for Architecture & License Foundation. Covers vault-os (Next.js dashboard) and vault-app (Next.js admin portal) UI.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui (vault-os) + custom Tailwind (vault-app) |
| Preset | shadcn/ui default — slate base, `components.json` verified |
| Component library | shadcn/ui (vault-os) — 16 existing components; no Radix Themes wrappers in use despite CSS import |
| Custom components needed | Alert (for expiry banner), StepIndicator/Stepper (for wizard) |
| Icon library | lucide-react (both apps) |
| Font (vault-os) | IBM Plex Sans (sans, weights 300-700), JetBrains Mono (mono, weights 400-600) |
| Font (vault-app) | Inter (sans, var(--font-inter)), Plus Jakarta Sans (display, var(--font-plus-jakarta)), JetBrains Mono (mono) |
| Animation | Tailwind custom: `fade-in`, `slide-up`, `pulse-slow`, `data-flow` — all exist in globals.css |
| Glass system | 3 tiers: `glass`, `glass-premium`, `glass-accent` — all exist in globals.css |
| Glow system | 3 colors: `glow-cyan`, `glow-red`, `glow-amber` — all exist in globals.css |

**Design direction:** Existing vault-os dashboard is dark, premium-cyber aesthetic with glass morphism cards, cyan accents, subtle grid backgrounds, and scan-line overlays. New license pages inherit this identity — they are not a redesign. The vault-app admin portal inherits the existing vault-app marketing CSS tokens (`--marketing-*`), adapting for admin UI density (tighter spacing, data tables, form-heavy layouts).

---

## Spacing Scale

Declared values (must be multiples of 4) — Tailwind defaults, already established in codebase:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, badge padding, inline spacing |
| sm | 8px | Compact element spacing, avatar rings |
| md | 16px | Default element spacing, card padding |
| lg | 24px | Section padding, form group gaps |
| xl | 32px | Layout gaps, modal padding |
| 2xl | 48px | Major section breaks, page section separation |
| 3xl | 64px | Page-level spacing, hero areas |

Exceptions:
- **Activation wizard card:** `p-8` (32px) — slightly more generous than default card padding (20px) to feel substantial on first launch
- **Expiry banner:** `py-3 px-4` (12px vertical, 16px horizontal) — compact to avoid stealing vertical space from dashboard content
- **Touch targets:** minimum 44px height for all interactive elements in activation wizard (accessibility for first-run flow)

---

## Typography

**vault-os dashboard** (IBM Plex Sans + JetBrains Mono):

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Body + Input | 14px (text-sm) | 400 | 1.5 | Page content, descriptions, table cells, inputs |
| Label + Caption | 12px (text-xs) | 600 | 1.25 | Form labels, section titles, status badges, timestamps, metadata, helper text |
| Heading | 16px (text-base) | 600 | 1.25 | Card titles, dialog titles, section headings |
| Display + Mono Stat | 24px (text-2xl) | 600 | 1.2 | Page titles, wizard step headings, numeric values, stats |

**vault-app admin portal** (Inter + JetBrains Mono):

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Body | 14px | 400 | 1.5 | Table cells, descriptions |
| Label | 12px | 600 | 1.25 | Form labels, section titles |
| Heading | 16px | 600 | 1.25 | Card titles, table headers |
| Page title + Mono stat | 24px | 600 | 1.2 | Admin page titles, license key display, numeric IDs |

---

## Color

### vault-os (existing tokens — reuse, do not modify)

All values are HSL from `globals.css`. Dark theme is default. Light theme declared but must not be forced — vault-os is dark-first.

| Role | HSL Value | Usage |
|------|-----------|-------|
| Dominant (60%) | 228 20% 4% | `--shadcn-background` — page background, main surfaces |
| Secondary (30%) | 228 24% 6% | `--shadcn-card`, `--shadcn-popover`, `--shadcn-secondary` — cards, sidebar, nav |
| Accent (10%) | 190 90% 50% | `--shadcn-primary` — **reserved for:** primary buttons, active states, focus rings, status indicators, logo |
| Muted foreground | 228 10% 56% | `--shadcn-muted-foreground` — secondary text, placeholder, disabled states |
| Border | 228 16% 16% | `--shadcn-border` — card borders, input borders, dividers |
| Destructive | 0 84% 60% | `--shadcn-destructive` — **reserved for:** expired license banner, destructive buttons, error states |
| Warning | 35 92% 50% | `--shadcn-warning` — **reserved for:** grace period banner, degraded mode banner, near-expiry indicators |
| Success | 160 84% 39% | `--shadcn-success` — **reserved for:** active license indicator, success confirmation |

**Accent reserved for:** Primary CTA buttons, active/focus ring, license status badges (active/green), link text, loading spinners, icon accents. NEVER use accent for: body text, background fills, borders on non-interactive elements, decorative elements outside brand components.

### vault-app admin portal (existing `--marketing-*` tokens)

Same cyan-primary identity but with `--marketing-` prefix:

| Role | Value | Usage |
|------|-------|-------|
| Background | 228 63% 4% | Page background |
| Card/surface | 228 40% 15% | Card backgrounds, table rows |
| Primary | 190 90% 50% | Buttons, active states, links |
| Border | 215 25% 27% | Borders, dividers |
| Destructive | 0 84% 60% | Error states, destructive buttons |
| Warning | 35 92% 50% | Warning states |
| Success | 160 84% 39% | Success states |

---

## Component Inventory

### Existing Components (vault-os — reuse directly)

| Component | File | Variants/Props Needed |
|-----------|------|----------------------|
| Button | `components/ui/button.tsx` | `variant="default"` (primary CTA), `variant="outline"` (secondary), `variant="ghost"` (cancel), `size="lg"` (wizard CTA), `size="sm"` (banner action) |
| Card | `components/ui/card.tsx` | Card + CardHeader + CardTitle + CardDescription + CardContent + CardFooter — for license settings cards, wizard step cards |
| Input | `components/ui/input.tsx` | License key text input |
| Badge | `components/ui/badge.tsx` | `variant="success"` (active license), `variant="warning"` (expiring), `variant="destructive"` (expired), `variant="default"` (pack badge: VISION/BASTION) |
| Dialog | `components/ui/dialog.tsx` | Trial confirmation dialog |
| Progress | `components/ui/progress.tsx` | License usage meters (X/Y cameras) |
| Separator | `components/ui/separator.tsx` | Visual dividers in wizard and settings |
| Skeleton | `components/ui/skeleton.tsx` | Loading state for license status fetch |
| Toast | `components/ui/toast.tsx` | Activation success/error feedback |
| Tooltip | `components/ui/tooltip.tsx` | Feature limit tooltips, pack description tooltips |
| Avatar | `components/ui/avatar.tsx` | Not needed for this phase |
| DropdownMenu | `components/ui/dropdown-menu.tsx` | Not needed for this phase |
| ScrollArea | `components/ui/scroll-area.tsx` | Not needed for this phase |
| Sheet | `components/ui/sheet.tsx` | Not needed for this phase |
| Table | `components/ui/table.tsx` | Not needed for this phase (no tables in vault-os for license) |
| Label | `components/ui/label.tsx` | Form labels in wizard and settings |

### New Components Needed (vault-os)

| Component | Purpose | Priority |
|-----------|---------|----------|
| Alert | Expiry warning banner — 3 variants: warning (grace), destructive (expired), default (degraded) | MUST |
| Stepper/StepIndicator | Activation wizard step visualization (optional — wizard can be single-page layout) | SHOULD |

### vault-app Admin Portal Components

The vault-app already has its own component library. Reuse these for admin portal:

| Component | File | Purpose |
|-----------|------|---------|
| Button | `components/ui/button.tsx` | CTA, form actions, table actions |
| Badge | `components/ui/badge.tsx` | License status badges, pack badges |
| Logo | `components/ui/logo.tsx` | Admin portal header logo |
| Skeleton | `components/ui/skeleton.tsx` | Loading states |

**New vault-app components needed:**
- Admin login form (standalone `AuthCard` with email/password inputs)
- Organization table (data table with sortable columns, search, pagination)
- License key generator form (select pack + modules → generate → show key)
- Admin layout shell (sidebar + header for admin navigation)

---

## Page Specifications

### Page 1: Activation Wizard (`/activate`) — vault-os

**Route:** `app/(auth)/activate/page.tsx` — outside dashboard layout, no sidebar, no header
**Access control:** Authenticated but no license → redirect here; if license exists → redirect to `/`
**States to handle:**

| State | UI |
|-------|-----|
| Loading license check | Skeleton full-page with spinner + "Vérification de la licence..." |
| No license (first launch) | Activation wizard shown |
| License active | Redirect to `/` (dashboard) |
| Network error | Error state with retry button |

**Wizard layout:**
- Full viewport height, centered glass card (`glass-premium`), max-w-[480px]
- Above the card: Oversight AI logo + "OVERSIGHT AI" wordmark
- Animated grid background (`bg-grid`) with scan effect (`bg-scan`)
- Subtle ambient glow behind card (cyan radial gradient)

**Step 1 — Welcome (single screen, no multi-step):**
- Headline: "Bienvenue sur OVERSIGHT AI"
- Subtitle: "Activez votre licence pour commencer à utiliser la plateforme de surveillance intelligente."
- Two option cards (horizontal layout on desktop, stacked on mobile):
  - **Option A:** "J'ai une clé de licence" — icon: `KeyRound` from lucide → expands inline input
  - **Option B:** "Démarrer un essai gratuit de 7 jours" — icon: `Sparkles` from lucide → triggers confirmation dialog
- Footer text: "© 2026 DigitSoft Africa"

**Option A flow — Enter key:**
1. User clicks "J'ai une clé de licence"
2. Glass card smoothly expands (or reveals) text input + paste button
3. Input: `Input` component, placeholder "Collez votre clé de licence", multi-line if key is long
4. Paste button: `Button variant="outline" size="sm"` with `ClipboardPasteIcon` and `aria-label="Coller"` — uses `navigator.clipboard.readText()`
5. CTA: "Activer ma licence" — `Button variant="default" size="lg"` full-width
6. Validation: client-side check for non-empty before submit; server error shown inline
7. Loading: button shows spinner + "Activation en cours..."
8. **Success:** "Licence activée avec succès !" — redirect to dashboard after 1.5s
9. **Error:** inline error message in destructive-colored alert ("Clé invalide" / "Cette licence a déjà été utilisée" / "Erreur de connexion au serveur")

**Option B flow — Start trial:**
1. User clicks "Démarrer un essai gratuit de 7 jours"
2. Confirmation dialog appears (`Dialog` with `DialogContent`)
3. Dialog title: "Confirmer l'essai gratuit"
4. Dialog body: "Vous allez bénéficier de toutes les fonctionnalités du pack VISION pendant 7 jours, sans engagement."
5. Features list: max 10 caméras, détection IA, alertes WhatsApp/SMS, stockage local 7 jours
6. Actions: "Annuler" (variant="ghost") + "Confirmer" (variant="default")
7. On confirm: `POST /api/licenses/trial` → loading → success
8. **Success:** toast notification "Essai gratuit démarré !" + redirect to dashboard
9. **Error:** inline error in dialog

### Page 2: License Settings (`/parametres/licence`) — vault-os

**Route:** `app/(dashboard)/parametres/licence/page.tsx` — inside dashboard layout
**Header:** Title "Licence" with subtitle "Gérez votre licence et vos limites"

**Sections:**

**Status card (glass card, full width):**
- License state badge: `Badge variant="success"` ("Active"), `Badge variant="warning"` ("Expire bientôt"), `Badge variant="destructive"` ("Expirée")
- Pack badge: "Pack VISION" or "Pack BASTION" (secondary badge style)
- Activate button (if trial can be upgraded): "Activer une clé de licence" → opens key input dialog
- Upgrade CTA (if BASTION not active): "Passer au pack BASTION" (outline button linking to vault-app)

**Details section (2-column grid on desktop):**
| Left column | Right column |
|-------------|--------------|
| **Période de validité** | **État** |
| Du {date} au {date} | Statut: Active / Expire dans X jours / Expirée |
| Renouvellement automatique: Non | Mode dégradé: {yes/no} |
| Dernière vérification: {date} | |

**Limites section:**
- Progress bars per limit:
  - Caméras: `{current}/{max}` — `Progress` bar
  - Utilisateurs: `{current}/{max}` — `Progress` bar
  - Portes: `{current}/{max}` — `Progress` bar (BASTION only)
- Each with label + count + Max badge

**Historique section (optional for v1):**
- Timeline or simple list of last 5 license events (activation date, extension dates)

**States:**
| State | UI |
|-------|-----|
| Loading | Skeleton cards (3x skeleton blocks mimicking card layout) |
| License active | Show all sections with green success indicators |
| License in grace period | Amber warning banner above status card + warning indicators |
| License expired | Red destructive banner above status card + "Réactiver" button |
| No license | "Aucune licence active" empty state card with "Activer une licence" CTA |
| Network error | Error card with "Réessayer" button |
| Trial active | Countdown badge "J-{N} restants" + upgrade prompt |

### Page 3: Expiry Warning Banner (global) — vault-os

**Location:** `components/license-expiry-banner.tsx` — rendered in `(dashboard)/layout.tsx` above `<main>`, below `<Header>`

**Behavior:**
- Fetch from `getLicenseStatus()` on mount and every 5 minutes
- Three visual states:

| State | Background | Text | Icon | Action |
|-------|-----------|------|------|--------|
| Grace (7 days before expiry) | `bg-warning/10` + `border-warning/20` | "Votre licence expire dans {N} jours." | `AlertTriangle` (warning) | "Voir ma licence" → `/parametres/licence` |
| Degraded (72h+ offline) | `bg-warning/15` + `border-warning/30` | "Mode dégradé : connexion au serveur perdue. Certaines fonctions sont désactivées." | `WifiOff` (warning) | "Voir ma licence" → `/parametres/licence` |
| Expired | `bg-destructive/10` + `border-destructive/20` | "Votre licence a expiré. Le tableau de passe en lecture seule." | `ShieldOff` (destructive) | "Réactiver" → `/activate` |
| Trial ending (1 day left) | `bg-warning/10` + `border-warning/20` | "Votre essai gratuit expire demain." | `Clock` (warning) | "Activer une licence" → `/parametres/licence` |

- Fixed position: `sticky top-0` within dashboard content area (below header, above page content)
- Dismissible: grace and trial-ending banners can be dismissed (localStorage key + 24h re-show)
- Non-dismissible: degraded and expired banners persist until resolved
- Transition: `animate-slide-up` on mount

### Page 4: Admin Login — vault-app

**Route:** `app/(admin)/login/page.tsx`
**Style:** Inherits existing vault-app marketing design system (`--marketing-*` tokens)
**Layout:** Centered card, full viewport height, dark background with grid pattern

**Form:**
- Email input (required, type="email", placeholder "admin@vaultos.com")
- Password input (required, type="password", show/hide toggle)
- "Se connecter" submit button (primary cyan)
- Error state: red error box "Identifiants incorrects" or "Erreur de connexion"
- Loading: button spinner
- Success: redirect to admin dashboard (`/admin/organizations`)

### Page 5: Organization Management — vault-app

**Route:** `app/(admin)/organizations/page.tsx`
**Layout:** Admin sidebar layout (new), header with breadcrumb

**Table (organizations list):**
- Columns: Organisation, Email, Pack, Status, Expire le, Caméras, Actions
- Search bar above table (filter by name/email)
- "Nouvelle organisation" button (primary CTA)
- Row actions: "Voir", "Générer licence", dropdown menu

**States:**
| State | UI |
|-------|-----|
| Loading | Table skeleton (8 rows) |
| Empty (no orgs) | "Aucune organisation" — "Créez votre première organisation pour commencer." + "Créer une organisation" CTA |
| Error | Error banner + "Réessayer" |
| Table populated | Sortable columns, pagination |

### Page 6: License Key Generation — vault-app

**Route:** `app/(admin)/organizations/[id]/licenses/new/page.tsx` or modal dialog

**Form:**
- Organization selector (pre-filled from context)
- Pack selector: Radio buttons for VISION / BASTION
- BASTION modules: Checkbox list of optional modules (only shown when BASTION selected):
  - Caméras supplémentaires
  - Contrôle d'accès
  - Sites supplémentaires
  - Analytics prédictif
  - DPO
  - SLA Premium
  - API tierce
- Duration: Annual only (pre-selected, no choice — per D-10 context)
- "Générer la clé" button

**Result display:**
- Success: green success animation
- License key displayed in monospace code block with copy button
- Warning: "Cette clé ne sera affichée qu'une seule fois. Copiez-la immédiatement."
- "Copier" button (uses `navigator.clipboard.writeText()`)
- "Retour à l'organisation" link

**Error states:**
- Validation: field-level errors
- Server: error banner with specific message

### Page 7: Organization Detail — vault-app

**Route:** `app/(admin)/organizations/[id]/page.tsx`
**License history section:**
- List of generated licenses with status, expiry date, generated date
- "Générer une nouvelle licence" button
- Current pack badge
- Usage stats: cameras connected, last seen

---

## Copywriting Contract

All copy in French (French-first project). Copy in English only if the vault-app admin login is used by international VaultOS team members — default to French.

### vault-os Activation Wizard

| Element | Copy |
|---------|------|
| Page title | Activez votre licence |
| Welcome heading | Bienvenue sur OVERSIGHT AI |
| Welcome subtitle | Activez votre licence pour commencer à utiliser la plateforme de surveillance intelligente. |
| Option A | J'ai une clé de licence |
| Option A description | Saisissez la clé que vous avez reçue par email |
| Option B | Démarrer un essai gratuit de 7 jours |
| Option B description | Essayez toutes les fonctionnalités du pack VISION sans engagement |
| Input placeholder | Collez votre clé de licence |
| CTA (enter key) | Activer ma licence |
| Loading text (key activation) | Activation en cours... |
| Key activation success | Licence activée avec succès ! |
| Key activation error (invalid) | Clé invalide. Vérifiez votre clé et réessayez. |
| Key activation error (used) | Cette licence a déjà été activée. |
| Key activation error (network) | Erreur de connexion au serveur. Vérifiez votre connexion internet. |
| Key activation error (generic) | Échec de l'activation. Veuillez réessayer ou contacter le support. |
| Trial confirmation title | Confirmer l'essai gratuit |
| Trial confirmation body | Vous allez bénéficier de toutes les fonctionnalités du pack VISION pendant 7 jours, sans engagement. |
| Trial feature list | Max 10 caméras, détection IA, alertes WhatsApp/SMS, stockage local 7 jours |
| Trial confirm button | Confirmer |
| Trial cancel button | Annuler |
| Trial success toast | Essai gratuit démarré ! Bienvenue sur OVERSIGHT AI. |

### vault-os License Settings

| Element | Copy |
|---------|------|
| Page title | Licence |
| Page subtitle | Gérez votre licence et vos limites d'utilisation |
| Status section | Statut de la licence |
| Validity section | Période de validité |
| Limits section | Limites d'utilisation |
| History section | Historique |
| Upgrade CTA | Passer au pack BASTION |
| Activate key CTA | Activer une clé de licence |
| Trial countdown | J-{N} restants |
| No license heading | Aucune licence active |
| No license body | Activez votre licence ou démarrez un essai gratuit de 7 jours. |

### vault-os Expiry Banner

| Element | Copy |
|---------|------|
| Grace period | Votre licence expire dans {N} jours. |
| Degraded mode | Mode dégradé : connexion au serveur perdue. Certaines fonctions sont désactivées. |
| Expired | Votre licence a expiré. Le tableau de bord passe en lecture seule. |
| Trial ending | Votre essai gratuit expire demain. |
| Banner action | Voir ma licence |
| Banner reactivate | Réactiver |
| Banner activate | Activer une licence |

### vault-app Admin

| Element | Copy |
|---------|------|
| Admin login heading | Connexion administrateur |
| Login CTA | Se connecter |
| Login error | Identifiants incorrects |
| Login network error | Erreur de connexion au serveur |
| Orgs page title | Organisations |
| New org button | Nouvelle organisation |
| Empty orgs heading | Aucune organisation |
| Empty orgs body | Créez votre première organisation pour commencer. |
| New license heading | Générer une nouvelle licence |
| Pack label | Pack |
| Modules label | Modules optionnels |
| Generate CTA | Générer la clé |
| Key result heading | Clé de licence générée |
| Key warning | Cette clé ne sera affichée qu'une seule fois. Copiez-la immédiatement. |
| Copy button | Copier |
| Copied feedback | Copié ! |
| Back link | Retour à l'organisation |

### License Status Badges

| Status | French Copy | Badge Variant |
|--------|-------------|---------------|
| Active | Active | success |
| Trial | Essai | default |
| Grace | Expire bientôt | warning |
| Degraded | Mode dégradé | warning |
| Expired | Expirée | destructive |
| No license | Non activée | outline |

---

## Interaction Contracts

### Activation Wizard
- **Option card hover:** Interactive cards with `hover:border-primary/30 hover:bg-accent/5` transition
- **Option selection:** Click selects card (border turns primary, subtle glow), reveals child content
- **Key input paste:** Paste button in input suffix area; uses `navigator.clipboard.readText()` with fallback to manual paste
- **Form submission:** Client-side validation → loading state (button disabled + spinner) → server validation → success/error
- **Trial confirmation:** Modal dialog (not inline) — forces explicit opt-in
- **Keyboard:** Enter submits active form; Escape closes confirmation dialog
- **Auto-redirect:** 1.5s delay after success, with success animation (checkmark + message)

### Expiry Banner
- **Auto-dismiss:** Grace/trial-ending banners dismissible with close (X) button; degraded/expired are persistent
- **Dismiss persistence:** `localStorage.setItem('banner-dismissed-{type}', Date.now())` — re-show after 24h
- **Polling:** `setInterval` every 5 minutes re-checks `getLicenseStatus()`
- **Transition:** Banner slides down on mount (`animate-slide-up`), slides up on dismiss
- **Action click:** "Voir ma licence" navigates to `/parametres/licence`; "Réactiver" navigates to `/activate`

### License Settings
- **Data loading:** Parallel fetch for status + usage via `Promise.all`
- **Progress bars:** Animated on mount (`transition-all duration-700`)
- **Badge:** Conditional coloring based on license state
- **Upgrade CTA:** External link to vault-app (opens in new tab)

### vault-app Admin Portal
- **Login:** Standard form submit with JWT storage in localStorage/httpOnly cookie
- **Organization table:** Server-side search, client-side sorting on small datasets
- **License generation:** Form validation → API call → key display in monospace modal/banner
- **Copy feedback:** Temporary "Copié !" state on copy button, 2s auto-revert

---

## States & Transitions

### Loading States
| Pattern | Implementation |
|---------|---------------|
| Full-page loading (wizard) | Centered `Loader2` spinner + "Vérification de la licence..." — same as existing `ProtectedLayout` pattern |
| Card skeleton (settings) | 3 `Skeleton` blocks mimicking card layout with `animate-pulse` |
| Button loading | `Loader2` icon with `animate-spin` replacing button text; button disabled |
| Table skeleton (vault-app) | 6-8 `Skeleton` rows mimicking table structure |

### Error States
| Pattern | Implementation |
|---------|---------------|
| Inline error (form) | Red text below input or error box above form — matching existing login page pattern |
| Card error (settings) | Red-tinted glass card with error icon + message + retry button |
| Full-page error (wizard) | Error card with "Réessayer" CTA button |
| Toast error | `Toast` component for transient errors (activation fail, copy fail) |

### Empty States
| Pattern | Implementation |
|---------|---------------|
| No license (settings) | Empty state card: icon (`KeyRound`) + heading + body + CTA button |
| No orgs (vault-app) | Icon (`Building2`) + heading + body + "Créer une organisation" CTA |

### Transitions
| Element | Transition |
|---------|-----------|
| Page enter | `animate-fade-in` (0.5s ease-out) — matches existing `PageTransition` pattern |
| Banner slide-in | `animate-slide-up` (0.3s ease-out) |
| Option card select | `border-color transition-all duration-200` |
| Progress bar fill | `transition-all duration-700` |
| Dialog overlay | Radix Dialog built-in fade + scale |
| Button active | `active:scale-[0.98]` — matches existing button pattern |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | N/A — all 16 existing components are already initialized in codebase | not required — no new shadcn blocks need to be added from registry |

**Note:** No new shadcn blocks need to be added via registry. If an Alert component is needed, build it as a custom component following established patterns (glass/glow utilities, `cn()` helper, French labels). Do NOT add new shadcn blocks without re-running the registry gate.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS — aria-label added to paste button
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS — reduced to 4 sizes, 2 weights per app
- [x] Dimension 5 Spacing: PASS — expiry banner py-2.5 replaced with py-3
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-07-18
