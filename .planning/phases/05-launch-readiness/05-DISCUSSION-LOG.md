# Phase 5: Launch Readiness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-19
**Phase:** 5-Launch Readiness
**Areas discussed:** Usage Dashboard Data Source, Documentation Format & Hosting, Support & SLA Operations, Training Materials Format, Update Distribution Model

---

## Usage Dashboard Data Source

| Option | Description | Selected |
|--------|-------------|----------|
| vault-os pushes to vault-app | vault-os calls vault-app's /api/report endpoint every 24h alongside the license ping. No inbound access needed. Reuses existing 24h ping mechanism. Works behind NAT/firewall. | ✓ |
| Extend edge agent reporting | Edge agent already sends health data. Extend to include camera count, storage, uptime. | |
| vault-app polls vault-os instances | vault-app calls each client's vault-os API. Requires client to expose endpoint publicly or configure VPN/DDNS. | |

**Follow-up — Data granularity:**

| Option | Description | Selected |
|--------|-------------|----------|
| Current snapshot only | Latest ping data only. No historical trends. | |
| Current + 30d trend | Store ping history, show line charts for 30d trends. | |
| Full history + export | All ping data retained. Dashboard shows trends over any period. Exportable. | ✓ |

**User's choice:** vault-os pushes to vault-app (Recommended). Full history + export.
**Notes:** Piggyback on existing 24h license ping. Data drives upsell detection (e.g., client approaching 10 cameras = BASTION candidate).

---

## Documentation Format & Hosting

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown in vault-app site | Docs live as pages on vault-app (docs.oversighthub.com). Markdown/MDX. Searchable, i18n-ready. | ✓ |
| Markdown in vault-os repo | Docs stay in vault-os repo as .md files. Clients access via GitHub. | |
| Separate docs site | Docusaurus, GitBook. Best UX but maintenance overhead. | |

**Follow-up — Scope:**

| Option | Selected |
|--------|----------|
| Installation & Deployment Guide | ✓ |
| Config Reference | ✓ |
| User Manual | ✓ |
| Troubleshooting & FAQ | ✓ |
| All of the above | ✓ |

**User's choice:** Markdown in vault-app site (Recommended). All documentation types.
**Notes:** Full documentation set = 5 guides. Docs serve both pre-sales and post-installation needs.

---

## Support & SLA Operations

| Option | Description | Selected |
|--------|-------------|----------|
| In-app chat widget + email ticketing | Embed chat widget (e.g., Crisp, Tawk.to) in vault-app dashboard. Standard email support@. | ✓ |
| Full ticketing system | Self-hosted or SaaS helpdesk (Zammad, Freshdesk). | |
| Just document contact info | Publish hotline, email, chat info. Respond manually. | |

**Follow-up — SLA documentation:**

| Option | Description | Selected |
|--------|-------------|----------|
| Publish on vault-app + in-app support page | SLA terms, support hours, contact methods on vault-app. Dedicated /support page. | ✓ |
| SLA published on vault-app only | SLA on marketing site. No in-app page. | |

**User's choice:** In-app chat widget + email ticketing (Recommended). Publish on vault-app + in-app support page.

---

## Training Materials Format

| Option | Description | Selected |
|--------|-------------|----------|
| Slide deck + session checklist | Exportable PDF slide deck + session tracking checklist. Quick to produce and iterate. | ✓ |
| Video tutorials | Pre-recorded video walkthroughs. Time-consuming to produce and maintain. | |
| Interactive guided tour | In-app guided tour. Highest build effort. | |

**User's choice:** Slide deck + session checklist (Recommended).

---

## Update Distribution Model

| Option | Description | Selected |
|--------|-------------|----------|
| Manual check + dashboard notification | vault-app exposes /api/updates/latest. Dashboard shows update banner. Client runs update.sh. | ✓ |
| Auto-check with in-app one-click update | vault-os checks, dashboard shows 'Install update' button. Triggers update via API. | |
| Email notification only | VaultOS emails clients when updates available. Client pulls manually. | |

**User's choice:** Manual check + dashboard notification (Recommended).

---

## the agent's Discretion

- Specific chat widget choice (Crisp vs Tawk.to vs alternative)
- Exact slide deck tool and template design
- Dashboard UI component implementation details for usage stats charts
- Blog post topics beyond the basic hello-world
- Velite collection schema design for documentation pages
- Update notification polling interval and UI banner design

## Deferred Ideas

- Floating AI chat bubble (vault-os dashboard) — Replace dedicated `/command-center` page with a floating bubble accessible everywhere. Better UX for AI agent chat. Future phase (UX v2).
- Auto-update (one-click from dashboard) — Too risky for v1. Update failures would block the client.
- Video training tutorials — Too costly for launch. Slides + live session better for early clients.
- In-app guided tour — Great UX but high build effort. Future phase (e.g., Phase 6 "UX v2").
- Self-serve update from vault-os dashboard — Needs Docker socket access. Too risky for v1.
- Ticketing system integration — Chat widget + email sufficient for early launch volume.
