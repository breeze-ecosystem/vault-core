---
phase: 01-architecture-license-foundation
plan: 06
type: execute
wave: 4
depends_on: [01-PLN-05-enforcement-cron]
files_modified:
  - apps/dashboard/app/(auth)/activate/page.tsx
  - apps/dashboard/app/parametres/licence/page.tsx
  - apps/dashboard/components/license-expiry-banner.tsx
  - apps/dashboard/app/(dashboard)/layout.tsx
  - apps/dashboard/components/license-activation-dialog.tsx
  - apps/dashboard/lib/api.ts
autonomous: false
requirements: [LIC-01, LIC-02, LIC-03, LIC-06]
user_setup: []

must_haves:
  truths:
    - "First-time users see activation wizard at /activate with 2 options (enter key / 7-day trial)"
    - "License settings page at /parametres/licence shows status, limits, history"
    - "Expiry warning banner shows on all dashboard pages with 4 visual states"
    - "Activation wizard uses French copy from UI-SPEC"
    - "Users can start a 7-day trial from the wizard"
    - "All copy is in French per copywriting contract"
  artifacts:
    - path: "apps/dashboard/app/(auth)/activate/page.tsx"
      provides: "Full-page activation wizard — two options: key or trial"
      min_lines: 200
    - path: "apps/dashboard/app/parametres/licence/page.tsx"
      provides: "License settings page — status, limits, history"
      min_lines: 200
    - path: "apps/dashboard/components/license-expiry-banner.tsx"
      provides: "Global expiry warning banner (4 states)"
      min_lines: 120
  key_links:
    - from: "activate/page.tsx"
      to: "lib/api.ts activateLicense()"
      via: "POST /api/licenses/activate"
      pattern: "activateLicense"
    - from: "license-expiry-banner.tsx"
      to: "lib/api.ts getLicenseStatus()"
      via: "GET /api/licenses/status"
      pattern: "getLicenseStatus"
---

<objective>
**vault-os dashboard UI** — Build the activation wizard, license settings page, and global expiry warning banner. All UX follows the approved UI-SPEC.md exactly with French copy.

**Purpose:** The activation wizard is the first experience new users see (blocks dashboard access until license/trial activated). The settings page shows license status and limits. The expiry banner warns across all pages.

**Output:** 3 new pages/components following the UI design contract specifications.
</objective>

<execution_context>
@/home/devuser/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/devuser/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PHASES/01-architecture-license-foundation/01-UI-SPEC.md

# Dashboard files
apps/dashboard/app/(auth)/login/page.tsx
apps/dashboard/app/(dashboard)/layout.tsx
apps/dashboard/lib/api.ts
apps/dashboard/components/ui/card.tsx
apps/dashboard/components/ui/button.tsx
apps/dashboard/components/ui/badge.tsx
apps/dashboard/components/ui/progress.tsx
apps/dashboard/components/ui/dialog.tsx
apps/dashboard/components/ui/input.tsx
apps/dashboard/components/ui/label.tsx
apps/dashboard/components/ui/toast.tsx
apps/dashboard/lib/utils.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Activation wizard page at /activate</name>
  <files>
    apps/dashboard/app/(auth)/activate/page.tsx
    apps/dashboard/lib/api.ts
  </files>
  <read_first>
    apps/dashboard/app/(auth)/login/page.tsx
    apps/dashboard/lib/api.ts
    apps/dashboard/app/(dashboard)/layout.tsx
    01-UI-SPEC.md
  </read_first>
  <acceptance_criteria>
    1. /activate route exists — full-page wizard outside dashboard layout
    2. Two option cards: "J'ai une clé de licence" (KeyRound icon) and "Démarrer un essai gratuit de 7 jours" (Sparkles icon)
    3. Key option expands inline input with paste button (ClipboardPasteIcon with aria-label)
    4. "Activer ma licence" button calls POST /api/licenses/activate
    5. Trial option shows confirmation dialog per UI-SPEC copy
    6. On success: toast + 1.5s delay + redirect to /
    7. On mount: checks license status; if active/trial → redirect to /
    8. Loading state: skeleton + "Vérification de la licence..."
    9. All French copy matches UI-SPEC copywriting contract
    10. Glass-premium card, centered, max-w-[480px]
  </acceptance_criteria>
  <action>
    Create a new route at `app/(auth)/activate/page.tsx` — this puts it outside the dashboard layout (no sidebar, no header). Based on the existing login page pattern.

    **Add to api.ts (if missing):**
    ```typescript
    export async function startTrial(): Promise<{ status: string; trialEndsAt: string }> {
      const res = await fetchWithAuth(`${API_URL}/api/licenses/trial`, { method: 'POST' });
      if (!res.ok) throw new Error('Échec du démarrage de l\'essai gratuit');
      return res.json();
    }
    ```
    Note: The `POST /api/licenses/trial` endpoint needs to be added to the NestJS LicenseController (it might not exist yet). Add it as part of this task:
    - In license.controller.ts: `@Post("trial")` handler that calls `licenseService.startTrial(orgId)`
    - In license.service.ts: `startTrial(orgId)` method — sets trialStartDate/trialEndDate on Organization, seeds VISION feature flags, returns `{ status: "trial", trialEndsAt }`

    **Activation wizard page layout (following 01-UI-SPEC.md exactly):**
    - "use client" directive
    - Full viewport height, centered `glass-premium` card, max-w-[480px]
    - Logo + "OVERSIGHT AI" wordmark above card
    - Animated grid background (bg-grid) with scan effect
    - Ambient cyan glow behind card

    **State management:**
    - `licenseState: "loading" | "no_license" | "active"` — on mount, call getLicenseStatus()
    - If active → router.replace("/")
    - If no_license → show wizard

    **Option cards:**
    - Two interactive cards (hover:border-primary/30 hover:bg-accent/5)
    - Option A: KeyRound icon + "J'ai une clé de licence" + "Saisissez la clé que vous avez reçue par email"
    - Option B: Sparkles icon + "Démarrer un essai gratuit de 7 jours" + "Essayez toutes les fonctionnalités du pack VISION sans engagement"
    - Click to select (border turns primary, reveals child content)

    **Option A expanded:** Text input + Paste button (ClipboardPasteIcon with aria-label="Coller", uses navigator.clipboard.readText()) + "Activer ma licence" CTA button full-width
    - Client-side: non-empty check before submit
    - Loading: spinner + "Activation en cours..."
    - Success: "Licence activée avec succès !" + 1.5s redirect
    - Error: inline destructive alert (matching UI-SPEC copy)

    **Option B expanded:** Dialog opens on click
    - Title: "Confirmer l'essai gratuit"
    - Body: "Vous allez bénéficier de toutes les fonctionnalités du pack VISION pendant 7 jours, sans engagement."
    - Features list: max 10 caméras, détection IA, alertes WhatsApp/SMS, stockage local 7 jours
    - Actions: "Annuler" + "Confirmer"
    - On confirm: POST /api/licenses/trial → loading → success toast → redirect

    **Trial endpoint must exist** in license.controller.ts — add if not present:
    ```typescript
    @Post("trial")
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async startTrial(@Req() req: FastifyRequest) {
      const orgId = (req as any).user.orgId;
      return this.licenseService.startTrial(orgId);
    }
    ```

    Test by visiting /activate after auth → should show wizard, not redirect.
  </action>
  <verify>
    <automated>cd /home/devuser/projects/vault-os/apps/dashboard && npx next build 2>&1 | tail -10</automated>
  </verify>
  <done>
    /activate route renders activation wizard with 2 options. Key entry works. Trial starts with confirmation dialog. Success redirects to dashboard. All French copy matches UI-SPEC. Build succeeds.
  </done>
</task>

<task type="auto">
  <name>Task 2: License settings page at /parametres/licence</name>
  <files>
    apps/dashboard/app/parametres/licence/page.tsx
  </files>
  <read_first>
    apps/dashboard/app/parametres/invitations/page.tsx
    apps/dashboard/lib/api.ts
    01-UI-SPEC.md
  </read_first>
  <acceptance_criteria>
    1. /parametres/licence route exists inside dashboard layout
    2. Status card: license state badge (success/warning/destructive), pack badge, validity dates
    3. Details section: 2-column grid with validity period + state
    4. Limits section: Progress bars for cameras, users, doors with current/max counts
    5. Loading state: skeleton cards
    6. No license state: empty state card with "Activer une licence" CTA
    7. Trial state: countdown badge + upgrade prompt
    8. All French copy matches UI-SPEC
  </acceptance_criteria>
  <action>
    Create `app/parametres/licence/page.tsx` following the existing settings page pattern at `parametres/invitations/`.

    **Page structure (following 01-UI-SPEC.md):**
    - "use client" directive
    - Page title: "Licence" with subtitle "Gérez votre licence et vos limites d'utilisation"
    - Parallel fetch: Promise.all([getLicenseStatus(), getLicenseUsage()]) on mount

    **Status card:**
    - Glass card (use shadcn Card component with glass-premium classes)
    - License state badge: conditional variant based on licenseState
      - "active" → badge variant="success" → "Active"
      - "trial" → badge variant="default" → "Essai"
      - "grace" → badge variant="warning" → "Expire bientôt"
      - "degraded" → badge variant="warning" → "Mode dégradé"
      - "expired" → badge variant="destructive" → "Expirée"
      - "no_license" → badge variant="outline" → "Non activée"
    - Pack badge: "Pack VISION" or "Pack BASTION" (secondary badge)
    - Activate key button: "Activer une clé de licence" → opens dialog with key input
    - Upgrade CTA: "Passer au pack BASTION" (outline button, external link)

    **Details section (2-column grid on desktop):**
    | Left | Right |
    | Période de validité | État |
    | Du {date} au {date} | Statut: {status} |
    | Renouvellement automatique: Non | Mode dégradé: Oui/Non |
    | Dernière vérification: {date} | |

    **Limits section:**
    - Progress bar per limit (using shadcn Progress component)
    - Caméras: {current}/{max} with Progress bar
    - Utilisateurs: {current}/{max} with Progress bar
    - Portes: {current}/{max} with Progress bar (BASTION only)
    - Each bar: animated on mount (transition-all duration-700)

    **History section (simplified):**
    - Last 5 license events or "Aucun historique" if empty

    **States:**
    - Loading: 3 skeleton blocks mimicking card layout
    - No license: "Aucune licence active" card with "Activer une licence" CTA
    - Network error: error card with "Réessayer" button
    - Trial: countdown badge "J-{N} restants" + upgrade prompt

    Test by navigating to /parametres/licence after login.
  </action>
  <verify>
    <automated>cd /home/devuser/projects/vault-os/apps/dashboard && npx next build 2>&1 | tail -10</automated>
  </verify>
  <done>
    /parametres/licence page renders status card with badge, details grid, limits with progress bars, and history. All copy in French. Build succeeds.
  </done>
</task>

<task type="checkpoint:human-verify">
  <name>Task 3: Global expiry warning banner</name>
  <files>
    apps/dashboard/components/license-expiry-banner.tsx
    apps/dashboard/app/(dashboard)/layout.tsx
  </files>
  <read_first>
    apps/dashboard/app/(dashboard)/layout.tsx
    apps/dashboard/components/dashboard-layout.tsx
    01-UI-SPEC.md
  </read_first>
  <acceptance_criteria>
    1. LicenseExpiryBanner component renders in dashboard layout
    2. 4 visual states: grace (warning), degraded (warning/strong), expired (destructive), trial-ending (warning)
    3. Grace and trial-ending banners are dismissible (localStorage, 24h re-show)
    4. Degraded and expired banners are persistent (non-dismissible)
    5. Polls getLicenseStatus() every 5 minutes
    6. Each state has correct icon, copy, and action button per UI-SPEC
  </acceptance_criteria>
  <action>
    Create `components/license-expiry-banner.tsx`:

    **Component structure:**
    - "use client" directive
    - Fetches getLicenseStatus() on mount and every 5 minutes (setInterval)
    - Returns null if no banner should show (active/trial with >1 day left)

    **4 states** (from UI-SPEC Page 3):
    1. **Grace** (7 days before expiry):
       - bg-warning/10 + border-warning/20
       - AlertTriangle icon (warning)
       - "Votre licence expire dans {N} jours."
       - Action: "Voir ma licence" → /parametres/licence
       - Dismissible (localStorage, 24h re-show)

    2. **Degraded** (72h+ offline):
       - bg-warning/15 + border-warning/30
       - WifiOff icon (warning)
       - "Mode dégradé : connexion au serveur perdue. Certaines fonctions sont désactivées."
       - Action: "Voir ma licence" → /parametres/licence
       - NOT dismissible

    3. **Expired**:
       - bg-destructive/10 + border-destructive/20
       - ShieldOff icon (destructive)
       - "Votre licence a expiré. Le tableau de bord passe en lecture seule."
       - Action: "Réactiver" → /activate
       - NOT dismissible

    4. **Trial ending** (1 day left):
       - bg-warning/10 + border-warning/20
       - Clock icon (warning)
       - "Votre essai gratuit expire demain."
       - Action: "Activer une licence" → /parametres/licence
       - Dismissible (localStorage, 24h re-show)

    **Banner design:**
    - Fixed position: sticky top-0 within dashboard content area
    - py-3 px-4 padding
    - Border + background per state
    - Icon + text + action button layout
    - animate-slide-up on mount
    - Close button (X) for dismissible states

    **Dismiss logic:**
    - Dismissible banners: onClick close → localStorage.setItem('banner-dismissed-{type}', Date.now().toString())
    - On mount, check localStorage: if dismissed less than 24h ago, don't show

    **Integration into layout:**
    In `app/(dashboard)/layout.tsx`, add the banner component before `<DashboardLayout>` children:
    ```tsx
    <LicenseExpiryBanner />
    ```

    The banner renders inside the dashboard content area (below Header, above page content).

    Test by setting license state to "expired" via mock or DB and verifying banner appears.
  </action>
  <verify>
    <human-check>
      1. Navigate to dashboard → verify no banner shows for active license
      2. Mock getLicenseStatus() to return "expired" → verify red destructive banner shows with "Réactiver" button
      3. Mock "degraded" → verify amber banner, not dismissible
      4. Mock trial ending (1 day) → verify dismissible banner
      5. Dismiss grace banner → refresh → verify it doesn't re-appear (localStorage check)
    </human-check>
  </verify>
  <done>
    License expiry banner renders in dashboard layout with 4 states. Dismissible states use localStorage with 24h cooldown. Persistent states are non-dismissible. Polls every 5 minutes. All French copy matches UI-SPEC.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| Dashboard UI → vault-os API | Authenticated requests via fetchWithAuth |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-14 | Information Disclosure | License status API response | accept | License state is non-sensitive (active/degraded/expired — same info shown in UI) |
| T-01-15 | Tampering | Activation wizard trial creation | mitigate | POST /api/licenses/trial is JWT-protected; only authenticated org admin can start trial |
| T-01-SC | Tampering | No new npm packages | mitigate | No packages installed in this plan |
</threat_model>

<verification>
1. `cd apps/dashboard && npx next build` succeeds
2. Visit /activate → shows wizard, not redirect
3. Visit /parametres/licence → shows status + limits
4. Dashboard shows banner when license is degraded/expired
</verification>

<success_criteria>
- Activation wizard at /activate with 2 options (key entry + trial)
- License settings at /parametres/licence with status, limits, history
- Global expiry banner with 4 visual states
- All French copy from UI-SPEC
- Dashboard build succeeds
</success_criteria>

<output>
Create `.planning/phases/01-architecture-license-foundation/01-PLN-06-vaultos-ui-SUMMARY.md` when done
</output>
