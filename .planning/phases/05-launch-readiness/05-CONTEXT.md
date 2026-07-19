# Phase 5: Launch Readiness - Context

**Gathered:** 2026-07-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete all launch preparation: vault-app usage dashboard for VaultOS team, marketing pages content, technical documentation, support channel setup, training materials, and update distribution process. Final phase before commercial launch.

**Four sub-domains:**
1. **Usage Dashboard** (ADM-04) — aggregated per-client stats in vault-app admin portal
2. **Marketing Content** (ADM-05) — pricing FCFA, products, solutions, blog, case studies, demo request, contact form
3. **Support & Documentation** (BAS-36 to BAS-38) — 24/7 support, SLA, technical docs
4. **Training & Updates** (BAS-39, BAS-40) — training materials, update distribution

**Requirements:** ADM-04, ADM-05, BAS-36, BAS-37, BAS-38, BAS-39, BAS-40

</domain>

<decisions>
## Implementation Decisions

### Usage Dashboard — Data Pipeline (ADM-04)
- **D-01:** **vault-os pushes usage stats to vault-app.** Extends the existing 24h license ping mechanism. vault-os calls vault-app's API endpoint with usage data alongside the license check. No inbound access to client network needed. Works behind NAT/firewall.
- **D-02:** **Full history + export.** All ping data retained in vault-app database. Dashboard shows trends over any period (storage growth, alert volume, camera count changes). Exportable for VaultOS team analysis.
- **D-03:** **New data model in vault-app Prisma.** Add `UsageReport` model (organizationId, timestamp, cameraCount, storageUsed, uptimePercent, alertVolume24h, version) with indexes for time-range queries. Existing `Organization` model gets aggregate fields (currentCameraCount, currentStorageUsed, lastReportAt).
- **D-04:** **Dashboard in vault-app admin.** New dashboard page with KPI cards (total clients, total cameras, aggregate storage, average uptime) + per-client table + per-client detail drill-down with trend charts. Uses same component library as existing admin UI.

### Marketing Content (ADM-05)
- **D-05:** **Existing vault-app marketing pages are sufficient.** Pricing (FCFA), products (4), solutions (2), blog, case studies, contact, demo pages already built with i18n (6 locales), Velite MDX content, Turnstile CAPTCHA, and JSON-LD SEO. No new pages needed.
- **D-06:** **Content gaps to fill.** Blog needs more posts beyond the single English hello-world. Case studies currently have 2 EN + 2 FR — expand to other locales. Demo request flow needs backend integration. These are content tasks, not software builds.

### Technical Documentation (BAS-38)
- **D-07:** **Published on vault-app as MDX pages.** Docs live at `/docs` route on vault-app (docs.oversighthub.com). Markdown/MDX format leverages existing Velite infrastructure. i18n-ready.
- **D-08:** **Full documentation set.** Five deliverables:
  1. **Installation & Deployment Guide** — consolidates DEPLOY.md + install.sh into proper guide with prerequisites, .env reference, Docker setup, production hardening checklist
  2. **Configuration Reference** — all .env variables documented with purpose, defaults, required/optional labels
  3. **User Manual** — operator guide: dashboard live view, alerts, timeline, mobile app setup, user management
  4. **Troubleshooting & FAQ** — common issues: API won't start, camera not detected, alerts not sending, license errors, DB connection failures
  5. **SLA & Support page** — published SLA terms, support hours, contact methods, escalation paths

### Support Channels (BAS-36, BAS-37)
- **D-09:** **In-app chat widget + email ticketing.** Embed a lightweight chat widget (e.g., Crisp, Tawk.to) in vault-app dashboard. Standard support@ email address. Hotline number documented. No heavy backend needed.
- **D-10:** **SLA published on vault-app + in-app support page.** SLA terms, 24/7 coverage info, 4h Niamey intervention commitment documented. Dedicated `/support` page in vault-app dashboard with status info.

### Training Materials (BAS-39)
- **D-11:** **Slide deck + session checklist.** Exportable PDF slide deck covering: system overview, dashboard walkthrough, mobile app setup, alert response, basic troubleshooting. Session checklist for trainer to track completion. Quick to produce and iterate for early clients.

### Update Distribution (BAS-40)
- **D-12:** **Manual check + dashboard notification.** vault-app exposes `/api/updates/latest` endpoint. vault-os checks for updates alongside 24h license ping. Dashboard shows update banner with changelog when new version available. Client runs `update.sh` via SSH or Coolify UI. No auto-update — avoids deployment risk.
- **D-13:** **`/api/updates/latest` endpoint returns:** latestVersion, changelog URL, releaseDate, isCritical (boolean), minSupportedVersion. vault-app admin creates release entries via admin UI or database.

### the agent's Discretion
- Specific chat widget choice (Crisp vs Tawk.to vs alternative)
- Exact slide deck tool and template design
- Dashboard UI component implementation details for usage stats charts
- Blog post topics beyond the basic hello-world
- Velite collection schema design for documentation pages
- Update notification polling interval and UI banner design

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` §Phase 5 — Phase goal, success criteria (5 items), 7 Launch Readiness requirements
- `.planning/REQUIREMENTS.md` — ADM-04, ADM-05, BAS-36 to BAS-40 full spec
- `.planning/STATE.md` — Current project state

### Pricing & Feature Matrix
- `docs/PRICING-SPEC.md` §4.7 — Support & SLA features (B41-B45): 24/7 support, SLA 4h Niamey, documentation, training, updates

### Prior Phase Context
- `.planning/phases/01-architecture-license-foundation/01-CONTEXT.md` — vault-app architecture decisions, D-05 to D-07 (vault-app is separate project, auth, license API)
- `.planning/phases/02-vision-pack/02-CONTEXT.md` — Feature gating, language decisions (French for v1.0)
- `.planning/phases/03-bastion-ai-access-control/03-CONTEXT.md` — Multi-site architecture
- `.planning/phases/04-bastion-enterprise/04-CONTEXT.md` — Reports, analytics, API/webhooks completion

### vault-app Project
- `/home/devuser/projects/vault-app/` — Separate Next.js project at port 3200. Existing: marketing site (pricing, products, solutions, blog, contact, demo in 6 locales), admin portal (auth, org CRUD, license generation), Prisma (AdminUser, Organization, LicenseKey), Velite MDX content engine, i18n via next-intl
- `/home/devuser/projects/vault-app/app/[locale]/admin/` — Admin dashboard pages (login, organizations list/detail, license gen)
- `/home/devuser/projects/vault-app/prisma/schema.prisma` — Current models: AdminUser, Organization, LicenseKey
- `/home/devuser/projects/vault-app/src/lib/license.ts` — License JWT generation (RS256 signing)

### Existing Documentation & Scripts
- `/home/devuser/projects/vault-os/DEPLOY.md` — Deployment guide (French, 262 lines) — base for consolidated Installation & Deployment Guide
- `/home/devuser/projects/vault-os/install.sh` — Interactive installer (564 lines)
- `/home/devuser/projects/vault-os/update.sh` — Update script with rollback (327 lines)
- `/home/devuser/projects/vault-os/backup.sh` — Backup/restore/schedule (439 lines)
- `/home/devuser/projects/vault-os/.env.example` — Environment config reference (400 lines, French comments)
- `/home/devuser/projects/vault-os/docker-compose.prod.yml` — Production Docker Compose (269 lines, 11 services)
- `/home/devuser/projects/vault-os/Caddyfile` — Reverse proxy config

### Existing Code Assets
- `apps/api/src/modules/license/` — License module with 24h ping cron. Extend for usage reporting push.
- `apps/api/src/modules/dashboard/` — Dashboard stats aggregation. Reference for what data to collect.
- `apps/api/src/common/guards/feature-gate.guard.ts` — Guard chain pattern for new endpoints
- `apps/dashboard/lib/api.ts` — API client functions. Reference for dashboard notification pattern.
- `apps/dashboard/components/` — Component library for dashboard notification banners (reference for update notification pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **vault-app existing infrastructure** — Marketing pages, admin portal, Prisma, JWT auth, Velite, i18n all production-ready. Phase 5 extends, not rebuilds.
- **DEPLOY.md + install.sh + update.sh + backup.sh** — Solid base for consolidated documentation. Content exists, needs reorganization into VaultApp docs pages.
- **24h license ping cron** (`apps/api/src/modules/license/`) — Existing mechanism in vault-os. Extend to POST usage data alongside license verification.
- **License verification endpoint** (`/home/devuser/projects/vault-app/app/api/verify/route.ts`) — vault-app already has public API endpoint. Extend or create separate `/api/report` for usage data.
- **Admin dashboard UI** (`/home/devuser/projects/vault-app/app/[locale]/admin/organizations/`) — Existing org CRUD pages. Usage dashboard extends this with KPI cards and trend charts.

### Established Patterns
- **vault-app API routes**: Next.js Route Handlers (`app/api/`), middleware JWT protection for admin routes
- **Admin auth**: JWT in localStorage, AdminAuthCheck component, middleware verification
- **i18n**: next-intl with French-first content. Documentation should follow same pattern.
- **Content management**: Velite MDX collections for blog posts and case studies. Extend for docs.
- **Guard chain** (vault-os): JwtAuthGuard → TenantIsolationGuard → RolesGuard → FeatureGateGuard
- **Dashboard notifications** (vault-os): Banner components for license expiry, update availability

### Integration Points
- **Usage reporting** — vault-os `LicenseService` (24h ping cron) → new `/api/report` endpoint on vault-app → new `UsageReport` Prisma model → admin dashboard page
- **Update distribution** — vault-app new `/api/updates/latest` endpoint → vault-os new `UpdateService` that polls → dashboard banner component
- **Documentation pages** — New Velite collection `docs` → new `/docs` route group in vault-app → links from admin dashboard and marketing site
- **Support page** — New route `/support` in vault-app admin → embedded chat widget → SLA/contact info display

### Creative Options
- The license ping already runs every 24h. Piggybacking usage data on this existing call is zero additional infrastructure — just add a JSON payload to the existing vault-os → vault-app HTTP request.
- Documentation on vault-app (not vault-os) means clients see docs even before deployment (on the marketing site). Installation guide can be a pre-sales resource.
- The update notification banner in vault-os dashboard is the same component pattern as the license expiry banner — already built, just needs new trigger.

</code_context>

<specifics>
## Specific Ideas

- Le dashboard usage dans vault-app est l'outil interne des fondateurs pour piloter les clients. Il doit montrer : nombre de clients actifs, caméras totales déployées, stockage agrégé, alertes totales, uptime moyen. Le drill-down par client sert à détecter les opportunités d'upsell (client approchant 10 caméras = candidat BASTION).
- La documentation technique publiée sur vault-app sert à la fois de pré-vente (le client voit ce qui existe avant d'acheter) et de référence post-installation. Format MDX avec Velite = maintenance simple.
- Les slides de formation sont volontairement légers (diapos + checklist) — en phase de lancement avec peu de clients, l'approche "live session personnalisée" est plus efficace qu'une grosse production vidéo.
- Les mises à jour sont manuelles par conception — le client garde le contrôle de quand il met à jour. La notification dans le dashboard sert de rappel. Les mises à jour critiques (sécurité) auront un flag spécial pour priorisation.
- Le support chat est externalisé (pas de backend maison). L'équipe VaultOS est petite au lancement — un widget SaaS évite de construire un système de ticketing.

</specifics>

<deferred>
## Deferred Ideas

- **Auto-update (one-click from dashboard)** — Trop risqué pour v1. Si la mise à jour échoue (coupure réseau pendant le pull, conflit Docker), le client est bloqué. Reste possible dans une future version avec mécanisme de rollback automatique.
- **Video training tutorials** — Trop coûteux en production pour le lancement. Les slides + session live sont plus adaptés aux premiers clients. Les vidéos pourront être ajoutées plus tard.
- **In-app guided tour for training** — Serait une excellente expérience mais effort de build important. Option pour une phase ultérieure (par exemple, Phase 6 "UX v2").
- **Self-serve update from vault-os dashboard** — Nécessite que vault-os ait des privilèges Docker (monter le socket) ou un agent. Trop risqué pour v1. Laisser le client exécuter update.sh manuellement.
- **Ticketing system integration** — Pour le moment, chat widget + email suffisent. Si le volume de tickets augmente, un système comme Zammad pourra être ajouté.

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-Launch Readiness*
*Context gathered: 2026-07-19*
