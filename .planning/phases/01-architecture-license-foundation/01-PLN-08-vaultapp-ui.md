---
phase: 01-architecture-license-foundation
plan: 08
type: execute
wave: 3
depends_on: [01-PLN-03-vaultapp-api]
files_modified:
  - /home/devuser/projects/vault-app/app/[locale]/admin/login/page.tsx
  - /home/devuser/projects/vault-app/app/[locale]/admin/layout.tsx
  - /home/devuser/projects/vault-app/app/[locale]/admin/organizations/page.tsx
  - /home/devuser/projects/vault-app/app/[locale]/admin/organizations/[id]/page.tsx
  - /home/devuser/projects/vault-app/app/[locale]/admin/organizations/[id]/licenses/new/page.tsx
  - /home/devuser/projects/vault-app/components/admin-auth-check.tsx
  - /home/devuser/projects/vault-app/components/admin-layout-shell.tsx
autonomous: false
requirements: [ADM-01, ADM-02, ADM-03]
user_setup: []

must_haves:
  truths:
    - "VaultOS admin can log in with email + password at /admin/login"
    - "VaultOS admin can view, search, and create organizations from /admin/organizations"
    - "VaultOS admin can view org details with license history"
    - "VaultOS admin can generate VISION/BASTION license keys from org detail page"
    - "License key is displayed with copy button and one-time warning"
    - "Admin pages have sidebar layout with navigation"
  artifacts:
    - path: "/home/devuser/projects/vault-app/app/[locale]/admin/login/page.tsx"
      provides: "Admin login form"
      min_lines: 100
    - path: "/home/devuser/projects/vault-app/app/[locale]/admin/organizations/page.tsx"
      provides: "Organization management table with search"
      min_lines: 200
    - path: "/home/devuser/projects/vault-app/app/[locale]/admin/organizations/[id]/licenses/new/page.tsx"
      provides: "License key generation form with pack selector + module checkboxes"
      min_lines: 150
  key_links:
    - from: "admin/login/page.tsx"
      to: "vault-app /api/admin/auth/login"
      via: "POST with email/password"
      pattern: "/api/admin/auth/login"
    - from: "admin/organizations/[id]/licenses/new/page.tsx"
      to: "vault-app /api/admin/licenses/generate"
      via: "POST with pack/modules selection"
      pattern: "/api/admin/licenses/generate"
---

<objective>
**vault-app admin portal UI** — Build the admin frontend: login page, organization management (list + detail), and license key generation form. Follows the UI-SPEC design contract exactly.

**Purpose:** VaultOS founders need a web UI to manage organizations and generate license keys. This is the client-facing admin portal built on top of the vault-app API foundation (PLN-03).

**Output:** Admin login, org list/detail pages, license generation form, admin layout shell.
</objective>

<execution_context>
@/home/devuser/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/devuser/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-architecture-license-foundation/01-UI-SPEC.md

# vault-app admin structure
/home/devuser/projects/vault-app/app/[locale]/layout.tsx
/home/devuser/projects/vault-app/components/
/home/devuser/projects/vault-app/src/
</context>

<tasks>

<task type="auto">
  <name>Task 1: Admin auth layout + login page</name>
  <files>
    /home/devuser/projects/vault-app/app/[locale]/admin/login/page.tsx
    /home/devuser/projects/vault-app/app/[locale]/admin/layout.tsx
    /home/devuser/projects/vault-app/components/admin-auth-check.tsx
  </files>
  <read_first>
    /home/devuser/projects/vault-app/app/[locale]/layout.tsx
    /home/devuser/projects/vault-app/app/[locale]/page.tsx
    /home/devuser/projects/vault-app/components/
    01-UI-SPEC.md
  </read_first>
  <acceptance_criteria>
    1. /admin/login page shows centered login form with email + password inputs
    2. Submit calls POST /api/admin/auth/login, stores JWT in localStorage
    3. On success, redirects to /admin/organizations
    4. Error states: "Identifiants incorrects" or "Erreur de connexion"
    5. Admin layout has sidebar + header with navigation
    6. Admin routes (/admin/*) redirect to login if no valid token
    7. Styling matches vault-app marketing design system (--marketing-* tokens)
  </acceptance_criteria>
  <action>
    **Create admin layout** `app/[locale]/admin/layout.tsx`:
    - Client component with AuthProvider for admin JWT
    - Check localStorage for 'admin_token' on mount
    - If no token and not on /admin/login, redirect to /admin/login
    - Wrap children in admin layout shell (sidebar + header)
    - Import existing vault-app components and CSS tokens

    **Create admin-auth-check.tsx**:
    - Client component, wraps admin pages
    - Checks localStorage.getItem('admin_token')
    - If no token, redirects to /admin/login
    - If token exists, renders children

    **Create login page** `app/[locale]/admin/login/page.tsx` (per UI-SPEC Page 4):
    - Centered card, full viewport height, dark background with grid pattern
    - Heading: "Connexion administrateur"
    - Email input: type="email", placeholder "admin@vaultos.com"
    - Password input: type="password", with show/hide toggle (Eye/EyeOff lucide icons)
    - "Se connecter" submit button (primary cyan, matches --marketing-primary)
    - On submit:
      - POST to /api/admin/auth/login with { email, password }
      - Store returned token in localStorage.setItem('admin_token', token)
      - Redirect to /admin/organizations
    - Error state: red error box "Identifiants incorrects" or "Erreur de connexion"
    - Loading: button spinner
    - If already logged in (token exists), redirect to /admin/organizations

    **Admin layout shell** `components/admin-layout-shell.tsx`:
    - Sidebar with navigation links:
      - Organisations → /admin/organizations
      - Licences → /admin/organizations (combined)
      - (future: Dashboard usage → /admin)
    - Header with logo + logout button
    - Uses vault-app existing --marketing-* CSS tokens
    - Responsive: sidebar collapses on mobile

    **Styling:**
    - Use existing vault-app marketing CSS tokens
    - Dark theme (already default)
    - Font: Inter (body), Plus Jakarta Sans (headings)
    - Glass cards for form containers
  </action>
  <verify>
    <automated>
      cd /home/devuser/projects/vault-app && npx next build 2>&1 | tail -10
    </automated>
  </verify>
  <done>
    /admin/login renders centered login form with email/password. Successful login stores JWT and redirects to /admin/organizations. Admin layout with sidebar protects all /admin/* routes. Build succeeds.
  </done>
</task>

<task type="auto">
  <name>Task 2: Organization management page (list + detail)</name>
  <files>
    /home/devuser/projects/vault-app/app/[locale]/admin/organizations/page.tsx
    /home/devuser/projects/vault-app/app/[locale]/admin/organizations/[id]/page.tsx
  </files>
  <read_first>
    /home/devuser/projects/vault-app/app/[locale]/page.tsx
    01-UI-SPEC.md
  </read_first>
  <acceptance_criteria>
    1. /admin/organizations shows table with columns: Organisation, Email, Pack, Status, Expire le, Caméras, Actions
    2. Search bar filters by name/email
    3. "Nouvelle organisation" button opens create dialog/modal
    4. Row actions: "Voir", "Générer licence"
    5. Loading state: table skeleton (8 rows)
    6. Empty state: "Aucune organisation" with "Créer une organisation" CTA
    7. /admin/organizations/[id] shows org details + license history
    8. "Générer une nouvelle licence" button on detail page
  </acceptance_criteria>
  <action>
    **Create org list page** `app/[locale]/admin/organizations/page.tsx` (per UI-SPEC Page 5):

    - "use client" directive
    - Page title: "Organisations" with subtitle "Gérez vos clients et leurs licences"
    - Header row: Search input + "Nouvelle organisation" button

    **Search bar:**
    - Text input with Search lucide icon
    - Debounced (300ms) — filters table by name or email
    - Client-side filtering for small datasets (or server-side via API ?search= param)

    **Table (using custom markup, not shadcn Table — vault-app has its own styling):**
    - Columns: Organisation, Email, Pack, Status, Expire le, Caméras, Actions
    - Sortable columns (click header to toggle asc/desc)
    - Pagination if > 20 results

    **Row actions:**
    - "Voir" link → /admin/organizations/[id]
    - "Générer licence" link → /admin/organizations/[id]/licenses/new
    - Badge for pack (VISION cyan, BASTION purple)

    **Create org dialog:**
    - Modal dialog with form: Nom, Email, Notes
    - POST /api/admin/organizations → refresh list

    **States:**
    - Loading: 8 skeleton rows
    - Empty: "Aucune organisation" with Building2 icon + "Créer une organisation" CTA
    - Error: error banner + "Réessayer" button

    **Create org detail page** `app/[locale]/admin/organizations/[id]/page.tsx` (per UI-SPEC Page 7):

    - Page title: org name
    - Info section: email, created date, status badge
    - License history section:
      - Table: Pack, Statut, Expire le, Générée le
      - Current pack badge
      - "Générer une nouvelle licence" button → /admin/organizations/[id]/licenses/new
    - Usage stats: cameras connected (displayed if tracked), last seen

    Data fetched from: GET /api/admin/organizations/[id]
  </action>
  <verify>
    <automated>
      cd /home/devuser/projects/vault-app && npx next build 2>&1 | tail -10
    </automated>
  </verify>
  <done>
    /admin/organizations shows searchable, sortable org table with actions. /admin/organizations/[id] shows org details + license history. Build succeeds.
  </done>
</task>

<task type="checkpoint:human-verify">
  <name>Task 3: License key generation form</name>
  <files>
    /home/devuser/projects/vault-app/app/[locale]/admin/organizations/[id]/licenses/new/page.tsx
  </files>
  <read_first>
    01-UI-SPEC.md
  </read_first>
  <acceptance_criteria>
    1. Form has pack selector (radio buttons: VISION / BASTION)
    2. BASTION modules show checkbox list when BASTION selected
    3. Duration: Annual (pre-selected, no choice)
    4. "Générer la clé" button calls POST /api/admin/licenses/generate
    5. On success: license key displayed in monospace code block with copy button
    6. Warning: "Cette clé ne sera affichée qu'une seule fois. Copiez-la immédiatement."
    7. Copy button uses navigator.clipboard.writeText() with "Copié !" feedback
    8. "Retour à l'organisation" link
    9. Error states: validation errors, server errors
  </acceptance_criteria>
  <action>
    Create `app/[locale]/admin/organizations/[id]/licenses/new/page.tsx` (per UI-SPEC Page 6):

    - "use client" directive
    - Fetch org details on mount: GET /api/admin/organizations/[id]

    **Form layout:**
    - Page title: "Générer une nouvelle licence"
    - Organization name displayed (pre-filled from context)
    - Separator

    **Pack selector:**
    - Radio button group: "Pack VISION" | "Pack BASTION"
    - VISION default selected
    - VISION description: "23 fonctionnalités, max 10 caméras, 3 utilisateurs"
    - BASTION description: "Toutes les fonctionnalités VISION + IA avancée, contrôle d'accès, multi-site"

    **BASTION modules (only visible when BASTION selected):**
    - Checkbox list with module labels:
      - Caméras supplémentaires (extra_cameras)
      - Contrôle d'accès (access_control)
      - Sites supplémentaires (extra_sites)
      - Analytics prédictif (predictive_analytics)
      - DPO (dpo_service)
      - SLA Premium (sla_premium)
      - API tierce (api_tierce)
    - Each checkbox with description tooltip

    **Limits inputs:**
    - Max caméras: number input (pre-filled: 10 for VISION, 25 for BASTION — editable)
    - Max utilisateurs: number input (pre-filled: 3 for VISION, 10 for BASTION — editable)
    - Date d'expiration: date input (pre-filled: +1 year from today — annual only)

    **Generate button:**
    - "Générer la clé" — full width, primary styling
    - Validates: pack required, maxCameras > 0, expiresAt > now

    **Result display (shown after successful generation):**
    - Green success indicator
    - "Clé de licence générée" heading
    - Monospace code block (`font-mono bg-card p-4 rounded-lg break-all text-xs`):
      - Shows full licenseJWT string
    - Copy button: ClipboardIcon → on click → navigator.clipboard.writeText(licenseJwt) → shows "Copié !" for 2s → reverts
    - Warning text: "Cette clé ne sera affichée qu'une seule fois. Copiez-la immédiatement." (amber/yellow)
    - "Retour à l'organisation" link → /admin/organizations/[id]

    **States:**
    - Loading: skeleton form
    - Validation error: inline red text below fields
    - Server error: error banner above form
    - Generation success: result display replaces form

    **Imports needed:** lucide-react icons (Clipboard, Check, Building2, KeyRound, Sparkles, Loader2)
  </action>
  <verify>
    <human-check>
      1. Navigate to /admin/organizations → verify table loads with correct columns
      2. Click "Nouvelle organisation" → fill form → create → verify org appears in table
      3. Click an org → verify detail page with license history
      4. Click "Générer une nouvelle licence" → select pack → set limits → generate
      5. Verify license key shows in monospace block with copy button
      6. Click copy → verify "Copié !" feedback
    </human-check>
  </verify>
  <done>
    License generation form at /admin/organizations/[id]/licenses/new with pack selector, module checkboxes, limits inputs. Generated key displays in monospace with copy button and one-time warning. Build succeeds.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| vault-app admin UI → vault-app API | Authenticated via JWT in localStorage |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-18 | Spoofing | Admin login brute force | mitigate | bcrypt cost factor 12; Next.js middleware enforces JWT on all /api/admin/* routes |
| T-01-19 | Information Disclosure | License key in localStorage | accept | Admin-only access; token in localStorage is standard pattern for SPA admin portals |
| T-01-20 | Tampering | License key copy buffer | accept | navigator.clipboard.writeText() is read-only from user perspective; key is already generated and displayed |
| T-01-SC | Tampering | No new npm packages | mitigate | No packages installed — uses existing vault-app components |
</threat_model>

<verification>
1. `cd /home/devuser/projects/vault-app && npx next build` succeeds
2. Visit /admin → redirects to /admin/login
3. Login with admin credentials → redirects to /admin/organizations
4. Navigate through org list, detail, and license generation flows
</verification>

<success_criteria>
- Admin login works (email + password → JWT → redirect)
- Organization list page shows searchable, sortable table
- Organization detail shows license history
- License generation form works (pack select → module checkboxes → generate → display key)
- All copy in French per UI-SPEC
- Build succeeds
</success_criteria>

<output>
Create `.planning/phases/01-architecture-license-foundation/01-PLN-08-vaultapp-ui-SUMMARY.md` when done
</output>
