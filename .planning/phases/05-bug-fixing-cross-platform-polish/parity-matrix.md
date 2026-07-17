# Parity Matrix: Dashboard ↔ Mobile Route Mapping (D-05)

**Phase 5 — Bug Fixing & Cross-Platform Polish**
**Generated:** 2026-07-17
**Total Dashboard Routes:** 28
**Total Mobile Screens:** 13 (existing)
**Parity:** 8 ✅ Existing / 1 🔲 Partial / 19 ⚠️ Missing / 0 🚫 Admin-only

> **Purpose:** Maps every Dashboard route under `apps/dashboard/app/(dashboard)/` to its Mobile counterpart under `apps/mobile/app/`. Flags gaps, documents data fields and actions for parity assessment, and assigns build priorities per D-05.

---

## Parity Matrix

| # | Dashboard Route | Dashboard Lines | Mobile Counterpart | Parity Status | Key Data Fields | Key Actions | Build Priority |
|---|-----------------|-----------------|-------------------|---------------|-----------------|-------------|----------------|
| 1 | `dashboard-home/` (Vue d'ensemble) | 305 | `(tabs)/index.tsx` (Accueil) | ✅ Exists | Cameras online/offline/total, active alerts, critical alerts, active sites, total users, recent alerts timeline, severity distribution, camera grid preview | View camera, view alerts, navigate to cameras, pull-to-refresh | — |
| 2 | `acces/` (Accès) | 183 | — | ⚠️ Missing | Credential list (user name, type, status, expiry), credential types (badge, PIN, mobile, QR) | Create credential, deactivate credential, filter by type | **High** |
| 3 | `alertes/` (Alertes) | 247 | `(tabs)/alerts.tsx` | ✅ Exists | Alert severity, timestamp, camera name, location, status (OPEN/ACKNOWLEDGED/RESOLVED), alert type | Acknowledge, resolve, mark false-positive, delete, filter by severity, real-time WS updates | — |
| 4 | `analytique/` (Analytique) | 597 | — | ⚠️ Missing | Zone analytics, intrusion events, loitering events, abnormal activity, analytics trends, unusual absence, organization selector, charts (line, bar, area) | View zone analytics, filter by organization, view trends | **Medium** |
| 5 | `api-keys/` (Clés API) | 152 | — | ⚠️ Missing | API key name, prefix, created date, last used, revoked status, permissions | Create key, revoke key, copy key | **Low** |
| 6 | `audit/` (Audit) | 731 | — | ⚠️ Missing | Audit log entries (timestamp, user, action, entity, details), chain verification, audit export, stats summary | Search logs, verify chain integrity, export (JSON/CSV), filter by entity/action | **Medium** |
| 7 | `cameras/` (Caméras) | 505 | `(tabs)/cameras.tsx` | ✅ Exists | Camera name, status (ONLINE/OFFLINE/MAINTENANCE/DEGRADED), site, snapshot, stream status, AI prompts | View grid, filter by status/site, search, create/edit/delete camera, start/stop stream, manage AI prompts | — |
| 8 | `chat/` (Chat IA) | 254 | `(tabs)/chat.tsx` (and `guard/chat.tsx`) | ✅ Exists | Chat messages (user/assistant), camera selector, camera context, persisted chat history | Send message, select camera context, clear history | — |
| 9 | `chronologie/` (Chronologie) | 535 | — | ⚠️ Missing | Timeline entries (events, access logs, door changes, alerts), real-time WS updates, search, filters, associated video | Search timeline, filter by event type, view event details, filter by date range | **Medium** |
| 10 | `command-center/` (Centre de commande) | 371 | `(tabs)/guard/index.tsx` (Guard Accueil) | 🔲 Partial | Real-time camera grid, agent status, risk gauge, alert timeline, confirmation dialog, chat panel, donut chart | View cameras, view agent status, respond to alerts, view risk, view command center feed | **High** |
| 11 | `conformite/` (Conformité) | 84 | — | ⚠️ Missing | Compliance report types, certifications (SOC, ISO 27001, RGPD, PCI DSS), certification status/expiry | Generate compliance report, view certification status | **Low** |
| 12 | `equipement/` (Équipement) | 213 | — | ⚠️ Missing | Equipment health: cameras, readers, controllers with online/offline/degraded counts, sub-pages (cameras, cartographie, controleurs, lecteurs, predictions) | View equipment health, navigate to sub-pages, filter status | **Medium** |
| 13 | `gouvernance/` (Gouvernance) | 439 | — | ⚠️ Missing | Retention policies by event type (access_events, audit_log, etc.), governance status, encryption test | Create/edit/delete retention policy, test encryption/decryption | **Low** |
| 14 | `ia/` (IA) | 591 | — | ⚠️ Missing | AI query interface, assistant chat, incident summaries, AI status/metrics, model info | Query AI, chat with assistant, view summaries, check AI status | **Medium** |
| 15 | `incidents/` (Incidents) | 219 | `(tabs)/incidents.tsx` | ✅ Exists | Incident severity, status (open/triage/investigating/resolved/closed), timestamp, title, description, attachments, site | Create incident, view detail, update status, download report, filter by status | — |
| 16 | `licences/` (Licences) | 533 | — | ⚠️ Missing | License list, status badges, usage bars, expiry countdown, API key list, organization list | Create license, manage API keys, view usage | **Low** |
| 17 | `maintenance/` (Maintenance) | 325 | — | ⚠️ Missing | Unified incidents and maintenance tickets, severity/type/status, ticket detail | View tickets, filter by type/status/severity | **Low** |
| 18 | `notifications/` (Notifications) | 321 | `notifications.tsx` (separate stack screen) | 🔲 Partial | Notification channel config (email, webhook, in-app), severity thresholds, notification logs, test notification | Enable/disable channels, configure thresholds, send test, view delivery logs | **Medium** |
| 19 | `parametres/` (Paramètres) | 423 | `(tabs)/settings.tsx` | ✅ Exists | User profile (name, email, role), license info, SSO config, API keys, webhooks, branding (colors, logo) | Edit profile, change password, configure SSO, manage API keys, manage webhooks, customize branding, organization switcher | — |
| 20 | `patterns/` (Patterns) | 293 | — | ⚠️ Missing | Detected patterns list (forced door, held-open door, reader failure, FPS drop, repeated denied access, false alerts, schedule anomaly), trend sparklines | View pattern details, pattern trend detail | **Low** |
| 21 | `portes/` (Portes) | 634 | `(tabs)/guard/door-control.tsx` | ✅ Exists | Door states (LOCKED/UNLOCKED/OPEN/ALARM), zones, real-time WS updates, status, alert config, zone lockdown | Lock/unlock door, lockdown zone, emergency unlock zone, clear override, configure alerts, filter/search | — |
| 22 | `risque/` (Risque) | 537 | — | ⚠️ Missing | Risk scores by site, risk trends, site risk summaries, radial gauge, risk explanation panel, organization selector | View risk scores, select organization, view risk trends, risk explanations | **Low** |
| 23 | `schemas/` (Schémas) | 448 | — | ⚠️ Missing | Pattern definitions by device type (door, reader, camera), detected patterns, device schemas | View pattern definitions, trigger pattern detection, resolve patterns, filter by device type | **Low** |
| 24 | `sites/` (Sites) | 164 | `(tabs)/sites.tsx` | ✅ Exists | Site name, address, city, country, status | Create/edit/delete site, view site list | — |
| 25 | `utilisateurs/` (Utilisateurs) | 305 | — | ⚠️ Missing | User list (name, email, role), role badges (SUPER_ADMIN, ADMIN, SUPERVISOR, OPERATOR, VIEWER) | Create user, edit user, delete user, filter by role | **High** |
| 26 | `vehicules/` (Véhicules) | 426 | — | ⚠️ Missing | Vehicle events (license plate, confidence, decision ALLOW/DENY), vehicle lists, date/time, LPR snapshots | Search plate, filter by decision, navigate to lists, vehicle detail | **Medium** |
| 27 | `visiteurs/` (Visiteurs) | 429 | `(tabs)/guard/qr-checkin.tsx` + `guard/index.tsx` | 🔲 Partial | Visit list (visitor name, status, dates), visitor list, check-in/out times, pre-registration | Check-in visit, check-out visit, cancel visit, pre-register visitor, search by name, pagination | **Medium** |
| 28 | `webhooks/` (Webhooks) | 98 | — | ⚠️ Missing | Webhook subscriptions (name, URL, events), delivery timeline | Create subscription, view delivery timeline | **Low** |

---

## Summary

| Status | Count | Routes |
|--------|-------|--------|
| ✅ Exists | 8 | dashboard-home, alertes, cameras, chat, incidents, parametres, portes, sites |
| 🔲 Partial | 3 | command-center (partial via Guard home), notifications (partial stack screen), visiteurs (QR + guard home) |
| ⚠️ Missing | 17 | acces, analytique, api-keys, audit, chronologie, conformite, equipement, gouvernance, ia, licences, maintenance, patterns, risque, schemas, utilisateurs, vehicules, webhooks |

### Build Priority Rationale

**High** — Core operator workflows needing mobile parity:
- `acces/` — Security operators manage credentials on-the-go
- `utilisateurs/` — Supervisors need user management from field

**Medium** — Important management/insight screens:
- `analytique/`, `audit/`, `chronologie/`, `equipement/`, `ia/`, `notifications/`, `vehicules/`

**Low** — Admin/utility screens:
- `api-keys/`, `conformite/`, `gouvernance/`, `licences/`, `maintenance/`, `patterns/`, `risque/`, `schemas/`, `webhooks/`

### Open Questions / Notes

1. **`command-center/`** — Guard home (`(tabs)/guard/index.tsx`) provides a simplified dashboard for guards. Full command center features (risk gauge, agent status, real-time feed) are Dashboard-only.
2. **`notifications/`** — Mobile has `notifications.tsx` as a stack screen (push notification list), but the Dashboard page is a **notification settings** config screen. Different purpose — marked Partial.
3. **`visiteurs/`** — Mobile QR check-in handles the operator flow but missing the full visitor management dashboard (pre-registration list, full history, visitor database).
4. **`chat/`** — Both Dashboard and Mobile have AI chat. Mobile has a secondary `more/chat.tsx` which may be a duplicate or navigation entry point.
5. **Admin-only concern:** No routes are flagged as strictly admin-only — all serve operator workflows at some level.
