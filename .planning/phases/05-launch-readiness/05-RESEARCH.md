# Phase 5: Launch Readiness - Research

**Researched:** 2026-07-19
**Domain:** Launch preparation, content production, admin dashboard, support infrastructure
**Confidence:** HIGH

## Summary

Phase 5 is the final phase before commercial launch. It spans four sub-domains that are largely independent and can be parallelized: Usage Dashboard (vault-app), Marketing Content, Support & Documentation, and Training & Updates.

**The critical architectural finding:** The usage reporting pipeline extends the existing `LicenseVerificationService` in vault-os — a `@Cron(EVERY_12_HOURS)` task that currently GETs license status from vault-app per organization. Under D-01, this same cron job will POST usage data alongside the license check. No new infrastructure, no inbound access needed.

**The most impactful discovery:** vault-app uses SQLite for development (Prisma connection string `file:./dev.db`) while vault-os uses PostgreSQL. The `UsageReport` model and related Prisma migration in vault-app targets SQLite — schema design must use SQLite-compatible column types (no PostgreSQL-specific types like `DateTime?` timestamps or `Int` autoincrement defaults that differ).

**Content state:** The vault-app marketing pages exist with proper i18n structure (6 locales: en, fr, es, de, ja, ar) and Velite MDX engine. However, pricing data still uses generic "Starter/Professional/Enterprise" tiers instead of VISION/BASTION with FCFA. Blog has only 1 English post. Case studies have 2 EN + 2 FR. This is content production, not software engineering.

**Primary recommendation:** Execute four parallel workstreams: (1) Usage Dashboard — vault-app Prisma migration + API endpoint + admin UI with recharts, (2) Marketing Content — pricing data update + blog/case study expansion + demo backend wiring, (3) Support & Documentation — Crisp chat widget on vault-app + 5 MDX docs via Velite + SLA page, (4) Training & Updates — slide deck + update API endpoint + banner component.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** vault-os pushes usage stats to vault-app. Extends the existing 24h license ping mechanism. vault-os calls vault-app's API endpoint with usage data alongside the license check. No inbound access to client network needed. Works behind NAT/firewall.
- **D-02:** Full history + export. All ping data retained in vault-app database. Dashboard shows trends over any period (storage growth, alert volume, camera count changes). Exportable for VaultOS team analysis.
- **D-03:** New data model in vault-app Prisma. Add `UsageReport` model (organizationId, timestamp, cameraCount, storageUsed, uptimePercent, alertVolume24h, version) with indexes for time-range queries. Existing `Organization` model gets aggregate fields (currentCameraCount, currentStorageUsed, lastReportAt).
- **D-04:** Dashboard in vault-app admin. New dashboard page with KPI cards (total clients, total cameras, aggregate storage, average uptime) + per-client table + per-client detail drill-down with trend charts. Uses same component library as existing admin UI.
- **D-05:** Existing vault-app marketing pages are sufficient. Pricing (FCFA), products (4), solutions (2), blog, case studies, contact, demo pages already built with i18n (6 locales), Velite MDX content, Turnstile CAPTCHA, and JSON-LD SEO. No new pages needed.
- **D-06:** Content gaps to fill. Blog needs more posts beyond the single English hello-world. Case studies currently have 2 EN + 2 FR — expand to other locales. Demo request flow needs backend integration. These are content tasks, not software builds.
- **D-07:** Published on vault-app as MDX pages. Docs live at `/docs` route on vault-app (docs.oversighthub.com). Markdown/MDX format leverages existing Velite infrastructure. i18n-ready.
- **D-08:** Full documentation set. Five deliverables: (1) Installation & Deployment Guide, (2) Configuration Reference, (3) User Manual, (4) Troubleshooting & FAQ, (5) SLA & Support page.
- **D-09:** In-app chat widget + email ticketing. Embed a lightweight chat widget (e.g., Crisp, Tawk.to) in vault-app dashboard. Standard support@ email address. Hotline number documented. No heavy backend needed.
- **D-10:** SLA published on vault-app + in-app support page. SLA terms, 24/7 coverage info, 4h Niamey intervention commitment documented. Dedicated `/support` page in vault-app dashboard with status info.
- **D-11:** Slide deck + session checklist. Exportable PDF slide deck covering: system overview, dashboard walkthrough, mobile app setup, alert response, basic troubleshooting. Session checklist for trainer to track completion.
- **D-12:** Manual check + dashboard notification. vault-app exposes `/api/updates/latest` endpoint. vault-os checks for updates alongside 24h license ping. Dashboard shows update banner with changelog when new version available. Client runs `update.sh` via SSH or Coolify UI.
- **D-13:** `/api/updates/latest` endpoint returns: latestVersion, changelog URL, releaseDate, isCritical (boolean), minSupportedVersion. vault-app admin creates release entries via admin UI or database.

### the agent's Discretion
- Specific chat widget choice (Crisp vs Tawk.to vs alternative)
- Exact slide deck tool and template design
- Dashboard UI component implementation details for usage stats charts
- Blog post topics beyond the basic hello-world
- Velite collection schema design for documentation pages
- Update notification polling interval and UI banner design

### Deferred Ideas (OUT OF SCOPE)
- Auto-update (one-click from dashboard)
- Video training tutorials
- In-app guided tour for training
- Self-serve update from vault-os dashboard
- Ticketing system integration
- Floating AI chat bubble (vault-os dashboard)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADM-04 | Dashboard usage — stats agrégées par client (caméras, stockage, uptime) | UsageReport Prisma model in vault-app SQLite. vault-os LicenseVerificationService cron → POST to vault-app `/api/report`. Admin UI with recharts charts. |
| ADM-05 | Pages marketing — pricing FCFA, produits, solutions, blog, contact, étude de cas | Pages exist. Need to update pricing-tier-data.ts for VISION/BASTION + FCFA. Blog needs 4+ posts (EN + FR). Case studies need expansion to 6 locales. Demo backend wiring. |
| BAS-36 | Support 24/7 — hotline + chat + email | Crisp SDK Web v1.2.0 embedded in vault-app `/support` page. support@ email address. Hotline number in SLA page. |
| BAS-37 | SLA standard — intervention sous 4h à Niamey | Published on vault-app as Velite MDX page. Content sourced from PRICING-SPEC.md §4.7 (B41-B45). |
| BAS-38 | Documentation technique — guides installation, configuration, dépannage | 5 MDX documents via new Velite `docs` collection. Source material: DEPLOY.md, install.sh, update.sh, backup.sh, .env.example. |
| BAS-39 | Formation initiale — session 2h équipe sécurité client | Slide deck (exportable PDF) + trainer session checklist. Pure content production. |
| BAS-40 | Mises à jour incluses — nouvelles versions, correctifs sécurité | vault-app `/api/updates/latest` endpoint (new). vault-os UpdateService (polls via cron). Banner component (reuses LicenseExpiryBanner pattern). |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Usage data collection | vault-os (API backend) | — | vault-os has direct DB access to camera/alert/storage counts. Cron pushes to vault-app. |
| Usage data storage & aggregation | vault-app (API + DB) | — | vault-app Prisma stores UsageReport history. Aggregation queries against SQLite. |
| Usage dashboard UI | vault-app (admin frontend) | — | vault-app admin portal serves VaultOS team. No public access. |
| Marketing content | vault-app (Next.js SSR) | — | Existing marketing pages with i18n, Velite MDX, JSON-LD. Content update only. |
| Technical documentation | vault-app (Next.js SSR + Velite) | — | Docs as MDX via Velite on vault-app. i18n-ready. Pre-sales + post-install reference. |
| Chat widget | vault-app (client-side embed) | — | SaaS widget (Crisp) embedded in vault-app admin. No vault-os backend needed. |
| Update distribution | vault-app (API) + vault-os (cron + UI) | — | vault-app exposes endpoint. vault-os polls and shows banner. Client runs update.sh manually. |
| Training materials | Static content | — | PDF slide deck + checklist. No code. Published on vault-app as downloadable assets. |

## Standard Stack

### New Packages Required

| Library | Version | Purpose | Why Standard | Verified |
|---------|---------|---------|--------------|----------|
| `recharts` | ^3.9.2 | Trend charts for usage dashboard (KPI cards, time-series, per-client drill-down) | 43M weekly downloads, actively maintained (15d ago), React-native SVG, declarative API. Clear market leader for React charting. No alternatives considered — the discretion is implementation detail, not library choice. | [VERIFIED: npm registry] |
| `crisp-sdk-web` | ^1.2.0 | Embed Crisp chat widget in vault-app admin | 121K weekly downloads, maintained by Crisp IM SAS (the platform itself). No alternatives — tawkto-react is deprecated (5y stale, 382/week). | [VERIFIED: npm registry] |

### Existing Stack in vault-app (relevant references)

| Library | Version | Purpose | Where Used |
|---------|---------|---------|------------|
| `velite` | ^0.4.0 | MDX content engine for blog, case studies, docs | `velite.config.ts` — collections for posts, caseStudies. Extend with `docs`. |
| `next-intl` | ^4.13.2 | i18n for 6 locales (en, fr, es, de, ja, ar) | `routing.ts` — locale prefix `always`. All content routes. |
| `prisma` | ^5.22.0 | Database ORM (SQLite dev, production target TBD) | `schema.prisma` — AdminUser, Organization, LicenseKey models. Add UsageReport, UpdateRelease. |
| `zod` | ^4.4.3 | Schema validation for API routes | Used in admin API routes for request validation. |
| `jsonwebtoken` | ^9.0.3 | Admin JWT auth | `src/lib/auth.ts` — HS256 tokens in localStorage. |
| `lucide-react` | ^1.11.0 | Icon library | Existing sidebar, components. Used for usage dashboard icons. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `recharts` | `nivo`, `visx`, `chart.js` + `react-chartjs-2` | recharts has best React integration (declarative JSX API), largest community. Nivo has better theming but more complex API. Chart.js has imperative API, worse React ergonomics. |
| `crisp-sdk-web` | `tawkto-react` | tawkto-react is **deprecated** (5 years stale, last publish 2021). Crisp SDK is actively maintained, has TypeScript definitions, and integrates as a simple script embed. |

**Installation (vault-app):**
```bash
cd /home/devuser/projects/vault-app
pnpm add recharts crisp-sdk-web
```

**No new packages needed on vault-os** — the update polling uses NestJS `HttpModule` (already in LicenseModule imports), and the banner component uses existing Lucide icons and component patterns.

## Package Legitimacy Audit

> Gate run: 2026-07-19 using slopcheck 0.6.1 against npm registry.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| crisp-sdk-web | npm | 20 days (v1.2.0) | 121K/wk | github.com/crisp-im/crisp-sdk-web | [OK] | Approved |
| recharts | npm | 15 days (v3.9.2) | 43.8M/wk | github.com/recharts/recharts | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        vault-os (client site)                       │
│  ┌─────────────────────────────────────┐  ┌──────────────────────┐  │
│  │ LicenseVerificationService (cron)   │  │ vault-os Dashboard   │  │
│  │  EVERY_12_HOURS                     │  │                      │  │
│  │  1. GET /api/verify?organizationId= │  │  UpdateBanner ───────│──│──┐
│  │  2. POST /api/report { ...usage }   │  │  (reuses             │  │  │
│  │  3. GET /api/updates/latest         │  │   LicenseExpiryBanner│  │  │
│  └─────────────┬───────────────────────┘  │   pattern)           │  │  │
│                │                          └──────────────────────┘  │  │
│         vault-os DB (PostgreSQL)                                    │  │
│           - camera counts                                           │  │
│           - alert volumes                                           │  │
│           - storage usage                                           │  │
│           - uptime metrics                                          │  │
└────────────────┼────────────────────────────────────────────────────┘  │
                 │ HTTP (outbound from vault-os to vault-app)            │
                 ▼                                                       │
┌──────────────────────────────────────────────────────────────────────┐│
│                     vault-app (VaultOS cloud)                        ││
│                                                                      ││
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌─────────────┐ ││
│  │ /api/verify  │  │ /api/report  │  │ /api/      │  │ /api/admin/ │ ││
│  │ (GET, exist) │  │ (POST, new)  │  │ updates/   │  │ updates     │ ││
│  │              │  │              │  │ latest     │  │ (CRUD, new) │ ││
│  └──────┬───────┘  └──────┬───────┘  │ (GET, new) │  └──────┬──────┘ ││
│         │                 │          └──────┬──────┘         │      ││
│         ▼                 ▼                 ▼                ▼      ││
│  ┌────────────────────────────────────────────────────────────┐     ││
│  │                 vault-app Prisma (SQLite)                   │     ││
│  │  Organization ─── UsageReport ─── UpdateRelease             │     ││
│  │  LicenseKey                                                  │     ││
│  └────────────────────────────────────────────────────────────┘     ││
│                                                                      ││
│  ┌──────────────────────────────────────────────────────────────┐   ││
│  │              vault-app Admin Portal /[locale]/admin/          │   ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐         │   ││
│  │  │ Organizations│  │Usage Dashboard│  │   Support  │         │   ││
│  │  │ (existing)    │  │ (new)        │  │   (new)    │         │   ││
│  │  │              │  │ - KPI cards   │  │ - Crisp     │         │   ││
│  │  │              │  │ - Per-client  │  │   widget   │         │   ││
│  │  │              │  │   table       │  │ - SLA terms │         │   ││
│  │  │              │  │ - Drill-down  │  │ - Contact   │         │   ││
│  │  │              │  │   with charts │  │   info      │         │   ││
│  │  └──────────────┘  └──────────────┘  └────────────┘         │   ││
│  └──────────────────────────────────────────────────────────────┘   ││
│                                                                      ││
│  ┌──────────────────────────────────────────────────────────────┐   ││
│  │          vault-app Marketing Site /[locale]/                  │   ││
│  │  ┌──────┐ ┌──────┐ ┌────────┐ ┌────────┐ ┌──────┐          │   ││
│  │  │Pricing│ │Blog  │ │Case    │ │ /docs  │ │Contact│          │   ││
│  │  │(FCFA) │ │(new  │ │Studies │ │ (new)  │ │      │          │   ││
│  │  │       │ │posts) │ │(expand)│ │ - 5 MDX│ │      │          │   ││
│  │  └──────┘ └──────┘ └────────┘ │  docs   │ └──────┘          │   ││
│  │                               └─────────┘                    │   ││
│  └──────────────────────────────────────────────────────────────┘   ││
│                                                                      ││
│  vault-app DB (SQLite dev / PostgreSQL production)                   ││
└──────────────────────────────────────────────────────────────────────┘──┘
```

**Data flow summary:**
1. vault-os cron collects per-org stats → POSTs to vault-app `/api/report`
2. vault-app stores as UsageReport rows → aggregates via SQL queries
3. VaultOS admin opens usage dashboard → recharts renders KPI cards + trend lines
4. vault-app admin creates releases → vault-os polls `/api/updates/latest` → shows banner
5. Docs are Velite MDX → built at compile time → served at `/docs` route

### Recommended Project Structure (vault-app additions)

```
vault-app/
├── app/
│   ├── [locale]/
│   │   ├── docs/                          # NEW — technical documentation
│   │   │   ├── layout.tsx                 #   Doc layout with sidebar TOC
│   │   │   ├── page.tsx                   #   Docs index page
│   │   │   └── [slug]/page.tsx            #   Individual doc page
│   │   ├── support/                       # NEW — support & SLA page
│   │   │   └── page.tsx                   #   Crisp widget + SLA content
│   │   └── admin/
│   │       ├── dashboard/                 # NEW — usage dashboard page
│   │       │   └── page.tsx               #   KPI cards + per-client table
│   │       ├── organizations/...          #   (existing)
│   │       └── support/                   # NEW — in-app support page
│   │           └── page.tsx               #   Crisp widget + status info
│   └── api/
│       ├── report/                        # NEW — receive usage data from vault-os
│       │   └── route.ts
│       └── updates/                       # NEW — update distribution
│           └── latest/route.ts            #   GET /api/updates/latest
├── components/
│   ├── admin-dashboard/                   # NEW — usage dashboard components
│   │   ├── kpi-cards.tsx
│   │   ├── client-table.tsx
│   │   ├── usage-trend-chart.tsx          # recharts line chart
│   │   └── client-detail.tsx
│   ├── docs/                              # NEW — documentation components
│   │   ├── docs-layout.tsx
│   │   └── mdx-content.tsx                # reuse existing MDX renderer
│   └── support/                           # NEW — support components
│       └── chat-widget.tsx
├── content/
│   └── docs/                              # NEW — documentation MDX files
│       ├── en/
│       │   ├── installation-guide.mdx
│       │   ├── configuration-reference.mdx
│       │   ├── user-manual.mdx
│       │   ├── troubleshooting.mdx
│       │   └── sla-support.mdx
│       ├── fr/
│       └── ... (other locales)
└── src/
    └── lib/
        └── updates.ts                     # NEW — update release helpers
```

### Pattern 1: Extending the License Ping Cron for Usage Reporting

**What:** The existing `LicenseVerificationService.pingVaultApp()` in vault-os runs every 12h and GETs license status per org. Under D-01/D-12, extend this same method to POST usage data and check for updates.

**When to use:** Single cron job, three calls per org per cycle. This avoids creating a separate cron and keeps integration in one place.

**Example pattern:**
```typescript
// In vault-os: apps/api/src/modules/license/license-verification.service.ts
@Cron(CronExpression.EVERY_12_HOURS)
async pingVaultApp(): Promise<void> {
  const vaultAppUrl = this.config.get<string>("VAULT_APP_URL");
  if (!vaultAppUrl) return;

  const orgs = await this.prisma.organization.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  for (const org of orgs) {
    try {
      // 1. Collect usage data from vault-os DB
      const usage = await this.collectUsageStats(org.id);

      // 2. POST usage report to vault-app
      await firstValueFrom(
        this.http.post(`${vaultAppUrl}/api/report`, {
          organizationId: org.id,
          organizationName: org.name,
          ...usage,
        }, { timeout: 10_000 }),
      );

      // 3. Check for updates
      const update = await firstValueFrom(
        this.http.get(`${vaultAppUrl}/api/updates/latest`, {
          timeout: 10_000,
        }),
      );

      // 4. Store latest version info for banner display
      if (update.data?.latestVersion) {
        await this.prisma.systemConfig.upsert({
          where: { key: 'latest_version' },
          update: { value: JSON.stringify(update.data) },
          create: { key: 'latest_version', value: JSON.stringify(update.data) },
        });
      }

      // 5. Existing license verification logic...
      // (GET /api/verify or use /api/report response for license status)
      await this.prisma.organization.update({
        where: { id: org.id },
        data: { lastVerifiedAt: new Date(), lastVerificationFailedAt: null },
      });
    } catch (err) {
      this.logger.warn(`Ping failed for org ${org.id}`);
      await this.prisma.organization.update({
        where: { id: org.id },
        data: { lastVerificationFailedAt: new Date() },
      });
    }
  }
}

private async collectUsageStats(orgId: string) {
  const [cameraCount, storageUsed, alertVolume, uptimePercent] = await Promise.all([
    this.prisma.camera.count({ where: { organizationId: orgId } }),
    this.prisma.recording.aggregate({
      where: { organizationId: orgId },
      _sum: { sizeBytes: true },
    }),
    this.prisma.alert.count({
      where: { organizationId: orgId, createdAt: { gte: daysAgo(1) } },
    }),
    this.calculateUptime(orgId),
  ]);

  return {
    cameraCount,
    storageUsed: storageUsed._sum.sizeBytes ?? 0,
    alertVolume24h: alertVolume,
    uptimePercent,
    version: this.config.get<string>("APP_VERSION") ?? "1.0.0",
  };
}
```
[ASSUMED] — pattern based on existing code analysis; exact implementation details at agent's discretion.

### Pattern 2: vault-app Admin Usage Dashboard with recharts

**What:** New admin page rendering KPI cards + per-client table + drill-down with trend charts, matching existing vault-app admin UI styling (dark theme, HSL color tokens).

**When to use:** For internal VaultOS team consumption only. Uses same auth pattern as organizations pages.

**Example key structures:**
```typescript
// vault-app API route: app/api/report/route.ts
// Receives POST from vault-os, stores UsageReport, updates Organization aggregate fields
export async function POST(request: NextRequest) {
  const body = await request.json();
  // Validate with zod schema
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { organizationId, cameraCount, storageUsed, uptimePercent, alertVolume24h, version } = parsed.data;

  // Transaction: create report + update org aggregates
  const [report] = await prisma.$transaction([
    prisma.usageReport.create({
      data: {
        organizationId,
        cameraCount,
        storageUsed,
        uptimePercent,
        alertVolume24h,
        version,
      },
    }),
    prisma.organization.update({
      where: { id: organizationId },
      data: {
        currentCameraCount: cameraCount,
        currentStorageUsed: storageUsed,
        lastReportAt: new Date(),
      },
    }),
  ]);

  // Also return license status (replaces existing GET /api/verify)
  return NextResponse.json({ valid: true, ...licenseStatus });
}
```

```typescript
// vault-app dashboard page (example structure for recharts trend)
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Trend data from /api/admin/organizations/{id}/usage
const data = [
  { date: '2026-07-01', cameras: 12, storageGB: 45 },
  { date: '2026-07-02', cameras: 12, storageGB: 48 },
  { date: '2026-07-03', cameras: 13, storageGB: 52 },
  // ...
];

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
    <YAxis stroke="#94a3b8" fontSize={12} />
    <Tooltip
      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
    />
    <Line type="monotone" dataKey="cameras" stroke="#22d3ee" strokeWidth={2} />
    <Line type="monotone" dataKey="storageGB" stroke="#a78bfa" strokeWidth={2} />
  </LineChart>
</ResponsiveContainer>
```
[VERIFIED: npm registry] — recharts v3.9.2 confirmed; implementation details at discretion but pattern is standard.

### Pattern 3: Crisp Chat Widget Embedding

**What:** Embed Crisp as a React component in the vault-app admin support page.

**When to use:** In `app/[locale]/support/page.tsx` and/or as a persistent floating widget in the admin layout. Crisp provides a script-based embed — the `crisp-sdk-web` package wraps it with TypeScript types.

```typescript
// vault-app: components/support/chat-widget.tsx
"use client";

import { useEffect } from 'react';

const CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

export function CrispWidget() {
  useEffect(() => {
    if (!CRISP_WEBSITE_ID || window.$crisp) return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup not typically needed for Crisp — it persists across navigation
    };
  }, []);

  return null;
}
```
[VERIFIED: npm registry] — crisp-sdk-web v1.2.0 confirmed. Pattern based on Crisp official embed docs. The script-based embed is simpler than the npm package for Next.js App Router.

### Pattern 4: Velite Documentation Collection

**What:** Add a `docs` collection to `velite.config.ts` alongside existing `posts` and `caseStudies`.

**When to use:** For the 5 technical documentation deliverables (D-08).

```typescript
// vault-app: velite.config.ts (addition to existing collections)
docs: {
  name: 'Doc',
  pattern: 'content/docs/**/*.mdx',
  schema: s.object({
    title: s.string().max(200),
    slug: s.slug('docs'),
    date: s.isodate(),
    locale: s.string(),
    category: s.enum(['installation', 'configuration', 'manual', 'troubleshooting', 'support']),
    order: s.number().optional().default(0),
    excerpt: s.excerpt(),
    content: s.mdx(),
    metadata: s.metadata(),
  }),
},
```
[ASSUMED] — Velite v0.4.0 API based on existing usage pattern in vault-app; exact `s.enum()` syntax may differ from actual Velite API. Verify against Velite docs during planning.

### Pattern 5: Update Banner (reuses LicenseExpiryBanner pattern)

**What:** A banner component in vault-os dashboard that shows when a new update is available. Reuses the exact component architecture (sticky top bar, Lucide icons, dismissible with localStorage) from `LicenseExpiryBanner`.

**When to use:** Placed in `dashboard-layout.tsx` below or above `LicenseExpiryBanner`.

```typescript
// vault-os: apps/dashboard/components/update-available-banner.tsx
"use client";

import { useState, useEffect } from "react";
import { ArrowUpCircle, X } from "lucide-react";
import { fetchWithAuth } from "@/lib/auth-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface UpdateInfo {
  latestVersion: string;
  changelogUrl: string;
  releaseDate: string;
  isCritical: boolean;
  minSupportedVersion: string;
}

export function UpdateAvailableBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Poll the local vault-os API endpoint that caches the latest version
    const check = async () => {
      try {
        const res = await fetchWithAuth(`${API_URL}/api/system/check-update`);
        if (res.ok) {
          const data = await res.json();
          setUpdate(data);
        }
      } catch { /* silent */ }
    };
    check();
    const interval = setInterval(check, 60 * 60 * 1000); // every hour
    return () => clearInterval(interval);
  }, []);

  if (!update || dismissed) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-cyan-400">
        <ArrowUpCircle className="h-4 w-4" />
        <span>
          Nouvelle version disponible : {update.latestVersion}
          {update.isCritical && " (mise à jour critique)"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <a
          href={update.changelogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline"
        >
          Voir les changements
        </a>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```
[ASSUMED] — Pattern based on existing LicenseExpiryBanner (vault-os); exact endpoint and implementation at agent's discretion.

### Anti-Patterns to Avoid

- **Don't duplicate the license verification into a separate cron** — The existing `@Cron(EVERY_12_HOURS)` in `LicenseVerificationService` fires every 12h, not 24h. Extend it. Adding a second cron creates race conditions and duplicate HTTP calls.
- **Don't build a custom ticketing system** — Crisp handles chat + email ticketing. D-09 explicitly says "No heavy backend needed."
- **Don't add PostgreSQL-specific types to vault-app Prisma schema** — vault-app dev uses SQLite. Use `Int`, `String`, `Float`, `DateTime` (Prisma standard types). Avoid `@db.ObjectId`, `@db.Uuid` (SQLite-incompatible).
- **Don't create docs as separate Next.js pages** — Use Velite MDX collections. That's why D-07 chose vault-app Velite infrastructure. Creating pages would defeat content management benefits.
- **Don't build auto-update** — D-12 explicitly defers auto-update. The client runs update.sh manually. The banner is just a notification.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chat widget | Custom chat/ticketing system | Crisp SDK Web (embedded script) | SaaS handles reliability, queueing, offline messages, mobile app. D-09: "No heavy backend." |
| Trend charts | Custom SVG chart rendering | recharts (React component library) | 43M weekly downloads, declarative API, handles edge cases (empty data, loading, tooltips, responsive containers). |
| Content management | Hardcoded HTML documentation pages | Velite MDX collections | Existing vault-app infrastructure. Content = markdown files. Build-time compilation. i18n-ready via same pattern as blog/case studies. |
| PDF slide deck | Custom slide builder | Google Slides / Keynote / Canva export | D-11 says "exportable PDF slide deck." Building a custom slide renderer is wasted effort for launch-phase materials. |
| Admin auth | New auth system for usage dashboard | Existing vault-app admin JWT (localStorage) | vault-app already has `AdminAuthCheck`, `AdminLayoutShell`, middleware JWT verification. Usage dashboard reuses these. |

**Key insight:** Every don't-hand-roll decision here is about avoiding backend complexity in a phase that should be dominated by content production and UI extension. The vault-app infrastructure already exists for auth, content, and admin UI. Extend it, don't rebuild it.

## Common Pitfalls

### Pitfall 1: SQLite vs PostgreSQL schema mismatch in vault-app
**What goes wrong:** vault-app Prisma schema uses PostgreSQL-specific types (`@db.Uuid`, `@db.ObjectId`, `@db.BigInt`) that fail in SQLite dev environment.
**Why it happens:** vault-os uses PostgreSQL with TimescaleDB — the vault-app schema was designed to mirror it, but uses SQLite locally.
**How to avoid:** Use only Prisma-standard scalar types: `String @id @default(uuid())` for IDs, `Int` for counts, `Float` for storage bytes (might overflow — use `BigInt` which maps to SQLite `INTEGER`). Test `npx prisma migrate dev` after each model change.
**Warning signs:** `PrismaClientValidationError: Type 'BigInt' is not supported` or migration fails with `SQLITE_ERROR`.

### Pitfall 2: LicenseVerificationService already runs EVERY_12_HOURS, not 24h
**What goes wrong:** The cron is documented as "24h ping" in user decisions but the actual code uses `@Cron(CronExpression.EVERY_12_HOURS)`. Extending it with usage POST means usage data arrives every 12h, not 24h.
**Why it happens:** The existing code at `apps/api/src/modules/license/license-verification.service.ts:18` has `@Cron(CronExpression.EVERY_12_HOURS)`. Decision D-01 was made based on outdated code.
**How to avoid:** Either (a) accept 12h granularity (better data), or (b) change to `0 0 */24 * * *` for 24h. Document the actual schedule in the usage dashboard.
**Warning signs:** If the decision D-01 explicitly says "24h ping" but the cron is 12h, there's a mismatch.

### Pitfall 3: Usage report POST could fail silently on vault-app side
**What goes wrong:** vault-os sends usage data but vault-app returns a 500 error (e.g., SQLite locked, schema mismatch). vault-os logs a warning but does not retry. Usage data is lost for that 12h window.
**Why it happens:** LicenseVerificationService catches all errors and logs them — it doesn't retry. And vault-app's SQLite dev database has concurrency limits.
**How to avoid:** In vault-app, wrap the report handler in a try/catch with idempotency (organizationId + date-based dedup). In vault-os, consider a BullMQ retry queue for failed reports (only if data completeness is critical).
**Warning signs:** Gaps in usage trend charts where data points are missing.

### Pitfall 4: Pricing page content still shows generic tiers
**What goes wrong:** D-05 claims "Pricing (FCFA) pages already built" but `pricing-tier-data.ts` still exports `starter/professional/enterprise` tiers with USD-style descriptions, no FCFA prices, and 14-day trial (not 7-day as in PRICING-SPEC.md).
**Why it happens:** D-05 was assessed as "pages exist" which is correct for route structure and components — but the **data** needs updating to match the actual PRICING-SPEC.md VISION/BASTION model.
**How to avoid:** Plan a specific task to update `pricing-tier-data.ts` with VISION/BASTION tiers, FCFA prices, and correct trial duration.
**Warning signs:** The pricing page still shows "Starter" tier with "25 cameras" when VISION is max 10, and "Professional" with "100 cameras" when no such product exists.

### Pitfall 5: Docs Velite collection requires build-time regeneration
**What goes wrong:** Documentation content exists as MDX files but doesn't appear on the website because `velite build` hasn't been re-run, or the new `docs` collection isn't imported in `velite.ts`.
**Why it happens:** Velite MDX is build-time. The `next.config.mjs` auto-runs `velite build` during `next build` and `next dev`. But new collections won't auto-import — you must add them to `src/lib/velite.ts` and `velite.config.ts`.
**How to avoid:** Follow the exact pattern of `posts` and `caseStudies`:
  1. Add `docs` collection to `velite.config.ts`
  2. Add `docs` export getters to `src/lib/velite.ts`
  3. Add `app/[locale]/docs/` route group with layout + page + [slug] page
**Warning signs:** `Cannot find module '../../.velite'` or docs pages show 404.

### Pitfall 6: Crisp widget with `next-intl` locale detection
**What goes wrong:** Crisp loads in English regardless of the visitor's locale, because the script initializes without locale configuration.
**Why it happens:** Crisp supports locale configuration via `$crisp.push(['set', 'session:locale', 'fr'])` but this must happen after script load.
**How to avoid:** Set the locale from `useLocale()` from `next-intl/client` immediately after script initialization:
```typescript
$crisp.push(['set', 'session:locale', locale]);
```
**Warning signs:** Visitors always see English Crisp widget on French pages.

### Pitfall 7: Update version comparison logic
**What goes wrong:** `latestVersion` from vault-app is compared against the running version, but version strings like "2.0.0-beta" or "1.0.0" can't be compared with simple string operators.
**Why it happens:** Semantic version comparison needs proper parsing (major.minor.patch).
**How to avoid:** Use a semver comparison library (or simple split-based utility) in vault-os. Store the current version in env var `APP_VERSION` or `package.json`.
**Warning signs:** Update banner shows for same version, or never shows for critical updates.

## Code Examples

### Example 1: UsageReport Prisma Model (vault-app)

```prisma
// vault-app: prisma/schema.prisma (addition)

model UsageReport {
  id             String   @id @default(uuid())
  organizationId String
  timestamp      DateTime @default(now())
  cameraCount    Int
  storageUsed    BigInt   // bytes
  uptimePercent  Float
  alertVolume24h Int
  version        String

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId, timestamp])
  @@index([timestamp])
}
```
[ASSUMED] — model shape matches D-03; exact fields at agent's discretion.

### Example 2: Organization Model Extension (vault-app)

```prisma
// vault-app: prisma/schema.prisma (Organization model additions)

model Organization {
  // ... existing fields ...
  currentCameraCount Int?     @default(0)
  currentStorageUsed BigInt?  @default(0)
  lastReportAt       DateTime?

  licenses     LicenseKey[]
  usageReports UsageReport[]
}
```
[ASSUMED] — matches D-03 aggregate fields.

### Example 3: UpdateRelease Model (vault-app)

```prisma
model UpdateRelease {
  id                String   @id @default(uuid())
  version           String
  changelogUrl      String
  releaseDate       DateTime
  isCritical        Boolean  @default(false)
  minSupportedVersion String
  createdAt         DateTime @default(now())
}
```
[ASSUMED] — matches D-13 fields. Admin creates entries in vault-app via API or direct DB.

### Example 4: vault-app `/api/report` Handler

```typescript
// vault-app: app/api/report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { z } from 'zod';

const reportSchema = z.object({
  organizationId: z.string().uuid(),
  organizationName: z.string().optional(),
  cameraCount: z.number().int().min(0),
  storageUsed: z.number().int().min(0),
  uptimePercent: z.number().min(0).max(100),
  alertVolume24h: z.number().int().min(0),
  version: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid report data' }, { status: 400 });
    }

    const { organizationId, cameraCount, storageUsed, uptimePercent, alertVolume24h, version } = parsed.data;

    // Verify org exists
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Create report + update org aggregates in transaction
    const [report] = await prisma.$transaction([
      prisma.usageReport.create({
        data: { organizationId, cameraCount, storageUsed, uptimePercent, alertVolume24h, version },
      }),
      prisma.organization.update({
        where: { id: organizationId },
        data: {
          currentCameraCount: cameraCount,
          currentStorageUsed: storageUsed,
          lastReportAt: new Date(),
        },
      }),
      // Verify license status (replaces separate GET /api/verify call)
      prisma.licenseKey.findFirst({
        where: { organizationId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      }),
    ]);

    const license = await prisma.licenseKey.findFirst({
      where: { organizationId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    });

    return NextResponse.json({
      valid: !!license,
      pack: license?.pack,
      expiresAt: license?.expiresAt?.toISOString(),
      maxCameras: license?.maxCameras,
    });
  } catch (err) {
    console.error('Report error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```
[ASSUMED] — structure based on existing vault-app API route patterns (`/api/verify/route.ts`, `/api/admin/organizations/route.ts`). Exact implementation at agent's discretion.

### Example 5: vault-app `/api/updates/latest` Endpoint

```typescript
// vault-app: app/api/updates/latest/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function GET() {
  try {
    const latest = await prisma.updateRelease.findFirst({
      orderBy: { releaseDate: 'desc' },
      select: {
        version: true,
        changelogUrl: true,
        releaseDate: true,
        isCritical: true,
        minSupportedVersion: true,
      },
    });

    if (!latest) {
      return NextResponse.json({ latestVersion: null, message: 'No updates available' });
    }

    return NextResponse.json({
      latestVersion: latest.version,
      changelogUrl: latest.changelogUrl,
      releaseDate: latest.releaseDate.toISOString(),
      isCritical: latest.isCritical,
      minSupportedVersion: latest.minSupportedVersion,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```
[ASSUMED] — matches D-13 response shape. Implementation at agent's discretion.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate `GET /api/verify` for license + usage | Unified `POST /api/report` returning license status + storing usage | Phase 5 | Removes one HTTP call per org per cycle |
| Static docs as separate PDFs/web pages | Velite MDX docs built at compile time, served via Next.js | Phase 5 | Content is version-controlled, i18n-ready, searchable |
| No usage visibility | Aggregated usage dashboard in vault-app admin | Phase 5 | VaultOS team can monitor client health, detect upsell opportunities |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | vault-app Prisma can target SQLite for development and PostgreSQL for production interchangeably | Standard Stack | If production migrations use PostgreSQL-specific features, dev/test fails. Migration strategy must be tested. |
| A2 | The `EVERY_12_HOURS` cron in `license-verification.service.ts` is the correct extension point for usage reporting | Architecture Patterns | If the cron changes frequency or is refactored, the usage reporting breaks. The plan should note this coupling. |
| A3 | Crisp embed works in Next.js App Router with `next-intl` locale detection | Architecture Patterns | Crisp is a script-based widget. If Next.js strict CSP headers block Crisp's script, the widget won't load. |
| A4 | Velite v0.4.0 supports adding a `docs` collection with the proposed schema | Standard Stack | If Velite's API has changed or lacks features (e.g., `s.enum()`), the schema design must adapt. Verify during planning. |
| A5 | Pricing page `pricing-tier-data.ts` needs updating for VISION/BASTION | Common Pitfalls | If the pricing data has already been updated since the CONTEXT.md was written, this work is wasted. Check current file state. |
| A6 | vault-app admin sidebar (`AdminLayoutShell`) can be extended with a Usage Dashboard nav item | Architecture Patterns | If the sidebar is auto-generated, adding a new item may require config changes. Current code shows static Link elements. |

## Open Questions

1. **vault-app production database target?**
   - What we know: Dev uses SQLite (`DATABASE_URL="file:./dev.db"`). Production deployment not yet documented.
   - What's unclear: Will production vault-app use SQLite, PostgreSQL, or something else? This affects Prisma migration strategy.
   - Recommendation: Clarify with user during discuss-phase or plan for SQLite-only (safe minimum). If PostgreSQL in production, the Prisma `migrate deploy` strategy needs adjustment.

2. **How does vault-os determine its own version?**
   - What we know: `version` field in UsageReport (D-03) and UpdateRelease `minSupportedVersion` (D-13).
   - What's unclear: How does vault-os know its own version? From `package.json`? From an env var? The `APP_VERSION` config?
   - Recommendation: Use `this.config.get<string>('APP_VERSION', '1.0.0')` from NestJS ConfigService. Set `APP_VERSION` in docker-compose and `.env.example`. Use `git describe --tags` in CI.

3. **Demo request backend integration?**
   - What we know: The demo page exists at `/demo` with `DemoTour` component. D-06 says "demo request flow needs backend integration."
   - What's unclear: Does this mean a form submission (like contact page with Turnstile) or a full demo scheduling system?
   - Recommendation: Plan a simple email notification (like contact form) using Resend SDK (already in vault-os stack). No scheduling system needed for v1.

4. **Downloadable assets hosting?**
   - What we know: Training slide deck (D-11) is an exportable PDF. Documentation lives as MDX pages.
   - What's unclear: Where are downloadable assets (slide deck PDF, session checklist PDF) hosted? In vault-app `public/`? On CDN?
   - Recommendation: Store in vault-app `public/downloads/` — Next.js serves them at `/downloads/filename.pdf`. Version-controlled in git.

5. **UpdateRelease management UI?**
   - What we know: D-13 says "vault-app admin creates release entries via admin UI or database."
   - What's unclear: Is a simple CRUD page needed, or is manual DB insertion sufficient?
   - Recommendation: Given the VaultOS team is small (founders), manual DB insertion via Prisma Studio or direct SQL is sufficient for v1. A CRUD UI can be added if the team creates releases frequently.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Both vault-app + vault-os | ✓ | 22.23.1 | — |
| pnpm | Both projects | ✓ | 9.0.0 | — |
| Docker | vault-os (PostgreSQL, Redis) | ✓ | 29.6.1 | — |
| Docker Compose | vault-os services | ✓ | v5.3.1 | — |
| PostgreSQL (psql) | vault-os DB | ✓ | 16.14 | — |
| SQLite (sqlite3 CLI) | vault-app dev DB | ✗ | — | Prisma manages SQLite via its own driver — no CLI needed |
| Python 3 | Preprocessor/edge agent | ✓ | 3.12.3 | — |
| Crisp Account | Chat widget | ✗ | — | VaultOS team must create Crisp account + get Website ID |
| Ollama | AI features | ? | Not checked | Phase 1 concern, not Phase 5 |

**Missing dependencies with no fallback:**
- Crisp account: Must create at crisp.chat before widget deployment. Get `NEXT_PUBLIC_CRISP_WEBSITE_ID`.

**Missing dependencies with fallback:**
- None — all technical dependencies are available.

## Validation Architecture

> workflow.nyquist_validation is not explicitly set in config. Assuming enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 (vault-os API), no test framework detected for vault-app |
| Config file | `apps/api/jest.config.js` (vault-os), none in vault-app |
| Quick run command | `cd vault-os && npx jest --passWithNoTests` |
| Full suite command | — |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADM-04 | vault-os POSTs usage data to vault-app | Integration | `npx jest apps/api/src/modules/license/license-verification.service.spec.ts` | ❌ Wave 0 |
| ADM-04 | vault-app stores UsageReport correctly | Integration | Manual test via curl POST to `/api/report` | ❌ Wave 0 |
| ADM-05 | Pricing page renders VISION/BASTION tiers | Visual | Manual verification | ❌ Wave 0 |
| BAS-38 | Docs pages render MDX content | Integration | `next build` exit code 0 ensures Velite compilation | ❌ Wave 0 |
| BAS-40 | UpdateRelease model stores/fetches correctly | Unit | Manual test via Prisma Studio | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd vault-os && npx jest --passWithNoTests` (ensures existing tests still pass)
- **Per wave merge:** Full build test (`next build` on vault-app, `nest build` on vault-os)
- **Phase gate:** Manual verification of all 4 sub-domains via `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/modules/license/__tests__/license-verification.service.spec.ts` — covers usage POST + update check
- [ ] vault-app has no test framework — no jest.config or test files detected. Coverage is manual.
- [ ] Framework install: Not needed for vault-app (manual verification sufficient for content + admin UI)

## Security Domain

> security_enforcement not explicitly set in config. Assuming enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing vault-app admin JWT (HS256 via `src/lib/auth.ts`). Usage dashboard reuses this. |
| V3 Session Management | yes | JWT in localStorage with 8h expiry. AdminAuthCheck verifies token on each route. |
| V4 Access Control | yes | Admin sidebar navigation — no RBAC (single admin role). Usage dashboard available to all authenticated admins. |
| V5 Input Validation | yes | Zod schema validation on `/api/report` and `/api/updates/latest` endpoints. |
| V6 Cryptography | no | No new cryptographic operations. Existing license JWT (RS256) unchanged. |

### Known Threat Patterns for Phase 5

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| `/api/report` unauthenticated access (no admin middleware) | Spoofing | The existing middleware.ts protects `/api/admin/:path*` but NOT `/api/report` — this is a public endpoint called by vault-os from behind NAT. The report handler must NOT expose internal data to unauthorized callers. Recommendation: use a shared secret (`REPORT_API_KEY`) as a Bearer token, validated before processing. |
| Usage data tampering (vault-os sends fake data) | Tampering | Low risk — vault-os is trusted client software. The data is for internal VaultOS team dashboards. If integrity matters, sign requests with HMAC. |
| Crisp widget CSP violation | Information Disclosure | Ensure vault-app's Content-Security-Policy in `next.config.mjs` allows `*.crisp.chat`. Test with blocking mode disabled in development. |

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry] — `recharts` v3.9.2, `crisp-sdk-web` v1.2.0 — confirmed via `npm view` and slopcheck
- [VERIFIED: codebase analysis] — vault-app directory structure, Prisma schema, Velite config, admin layout, API routes — confirmed via file reads
- [VERIFIED: codebase analysis] — vault-os `LicenseVerificationService` cron (`EVERY_12_HOURS`), `LicenseExpiryBanner` component — confirmed via file reads

### Secondary (MEDIUM confidence)
- [CITED: npm registry page for crisp-sdk-web] — Package actively maintained (20d ago), 121K weekly downloads, MIT license
- [CITED: npm registry page for recharts] — v3.9.2, 43.8M weekly downloads, React + D3 based
- [CITED: vault-app marketing pages] — All 6 locales verified via file system. Pricing page uses generic tiers.
- [CITED: vault-app blog content] — 1 file (`hello-world.mdx` in EN only). Case studies: 2 EN + 2 FR.

### Tertiary (LOW confidence)
- [ASSUMED] — Velite v0.4.0 docs collection schema (`s.enum()` syntax) — based on existing usage, not verified against Velite changelog
- [ASSUMED] — Crisp embed script works in Next.js App Router — based on general Crisp docs, not tested in this project
- [ASSUMED] — vault-app uses SQLite-only in dev, undefined in production — based on .env contents

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — recharts and crisp-sdk-web verified on npm registry and by slopcheck
- Architecture: HIGH — all four sub-domains mapped against existing code, data flows traced from vault-os DB → vault-app → admin UI
- Pitfalls: MEDIUM — most based on code analysis and known patterns; Velite schema assumption is the weakest point
- Content status: HIGH — file counts verified by glob search and file reads
- Database: MEDIUM — vault-app production DB target is an open question

**Research date:** 2026-07-19
**Valid until:** 2026-08-19 (stable patterns — recharts, Crisp, Next.js, Velite are established tools)
