# Roadmap: VaultOS v1.0 — Minimum Commercial Product (VISION + BASTION)

**Milestone**: v1.0
**Granularity**: Coarse
**Total requirements**: 78 (23 VIS + 44 BAS + 6 LIC + 5 ADM)
**Created**: 2026-07-18

---

## Phases

- [ ] **Phase 1: Architecture & License Foundation** — Refactor license system (generation in vault-app, activation in vault-os), feature gating VISION/BASTION, mode dégradé, vault-app admin portal foundation
- [ ] **Phase 2: VISION Pack** (1/8 plans) — Complete all 23 VISION features: streaming, AI detection, WhatsApp/SMS alerts, local storage, geofencing, multi-user, sharing
- [ ] **Phase 3: BASTION AI & Access Control** — Advanced AI (facial rec, anti-spoofing, weapons, behavior), access control integrations, multi-site management
- [ ] **Phase 4: BASTION Enterprise** — HAPDP compliance, reports & analytics, API/webhooks, advanced storage, third-party integrations
- [ ] **Phase 5: Launch Readiness** — vault-app usage dashboard, marketing pages, documentation, support SLA, training

---

## Phase Details

### Phase 1: Architecture & License Foundation
**Goal**: License system is refactored so vault-app generates keys and vault-os validates them, with feature gating, mode dégradé, trial, and vault-app admin portal foundation

**Depends on**: Nothing (foundation phase)

**Requirements**: LIC-01, LIC-02, LIC-03, LIC-04, LIC-05, LIC-06, ADM-01, ADM-02, ADM-03

**Success Criteria** (what must be TRUE):
1. VaultOS admin can log in to vault-app admin portal and manage organizations (CRUD, license status, history)
2. Admin can generate VISION and BASTION license keys in vault-app (client never generates their own key)
3. Client can activate a license in vault-os using the key — feature gating enables/disables VISION vs BASTION modules correctly (VISION limited to 10 cameras)
4. Vault-os pings vault-app every 24h; after 72h without internet it enters degraded mode (continues working offline); when license expires it becomes read-only (dashboard accessible, no new AI alerts)
5. New organizations automatically receive a 7-day trial license with full VISION features

**Plans**: 8 plans
**UI hint**: yes

Plans:
- [ ] 01-PLN-01-schema-shared — Schema + shared package refactor (VISION/BASTION model)
- [ ] 01-PLN-02-vaultapp-setup — vault-app Prisma setup (schema, deps, env config)
- [ ] 01-PLN-03-vaultapp-api — vault-app backend API (auth, orgs, license gen, verify)
- [ ] 01-PLN-04-license-cleanup — vault-os license module cleanup (remove generate, API keys)
- [ ] 01-PLN-05-feature-gating — Feature gating rewrite + trial endpoint (pack+module seeding, @RequiresPack, POST /api/licenses/trial)
- [ ] 01-PLN-06-enforcement-cron — License enforcement + 24h ping cron (@DegradedBlock, cron)
- [ ] 01-PLN-07-vaultos-ui — vault-os dashboard UI (activation wizard, settings, expiry banner)
- [ ] 01-PLN-08-vaultapp-ui — vault-app admin portal UI (login, orgs, license generation)

---

### Phase 2: VISION Pack
**Goal**: All 23 VISION features are complete and working — streaming, AI human-only detection, push/SMS/WhatsApp alerts, local storage with H.265, event timeline, geofencing, multi-user

**Depends on**: Phase 1 (feature gates must exist to enforce VISION limits)

**Requirements**: VIS-01, VIS-02, VIS-03, VIS-04, VIS-05, VIS-06, VIS-07, VIS-08, VIS-09, VIS-10, VIS-11, VIS-12, VIS-13, VIS-14, VIS-15, VIS-16, VIS-17, VIS-18, VIS-19, VIS-20, VIS-21, VIS-22, VIS-23

**Success Criteria** (what must be TRUE):
1. Operator can view live camera feeds on dashboard and mobile app on local network, with AI night vision enhancement and adaptive quality based on device capability
2. AI detects human motion only (filters animals, vegetation, shadows, weather); operator can define per-camera detection zones and sensitivity thresholds
3. Basic facial recognition works (whitelist/blacklist, max 50 faces, manual upload); alerts fire via push notification, SMS (if modem present), and WhatsApp Business API
4. Operator configures silent hours (DND mode); geofencing auto-arms/disarms based on phone location; temporary stream share works for third parties on same network
5. Event timeline is searchable by date/time with 30s video clip export and automatic screenshots on every alert
6. Local recording stores to client disk/NAS with configurable retention (7/15/30 days) and H.265/HEVC compression; up to 3 secondary user accounts with role-based access

**Plans**: 8 plans
**Wave structure**: 3 waves (Wave 1: foundation, Wave 2: backend, Wave 3: UI)
**UI hint**: yes

Plans:
- [ ] 02-01-PLAN.md — Schema + Shared Package (Prisma models, Zod schemas, types)
- [ ] 02-02-PLAN.md — AI Preprocessor (insightface face rec, night vision, detection pipeline)
- [ ] 02-03-PLAN.md — Detection + Face + Camera API Backend (zones, whitelist CRUD, ONVIF)
- [x] 02-04-PLAN.md — Alerts, Geofencing, DND Backend (WhatsApp/SMS, arm/disarm, DND)
- [ ] 02-05-PLAN.md — Recording, Timeline, Share, Multi-user Backend (HLS, clips, sharing)
- [ ] 02-06-PLAN.md — Dashboard Camera + Detection + Face UI (live grid, zones canvas, face upload)
- [ ] 02-07-PLAN.md — Dashboard Alerts + Recording + Settings UI (timeline, config pages)
- [ ] 02-08-PLAN.md — Mobile App UI (stream viewer, timeline, face upload, share receiver)

---

### Phase 3: BASTION AI & Access Control
**Goal**: Advanced AI capabilities (unlimited facial rec, anti-spoofing, weapons, abandoned objects, crowd counting, behavior analysis) and full access control integration with multi-site management

**Depends on**: Phase 2 (BASTION includes VISION infrastructure; builds on AI pipeline, streaming, and recording)

**Requirements**: BAS-01, BAS-02, BAS-03, BAS-04, BAS-05, BAS-06, BAS-07, BAS-08, BAS-09, BAS-10, BAS-11, BAS-12, BAS-13, BAS-14, BAS-15, BAS-16, BAS-17, BAS-18, BAS-19

**Success Criteria** (what must be TRUE):
1. Facial recognition supports unlimited faces with risk scoring (0-100), passage history, dynamic blacklist, and anti-spoofing (detects photo/screen/mask liveness)
2. System detects abandoned objects (alert if static > X minutes), weapons (firearm, knife, suspicious object), crowd density (real-time count + threshold alert), and behavioral anomalies (running, falling, fighting, loitering, zone intrusion)
3. Access control integrates RFID readers, biometric fingerprint, and QR code credentials with automatic video correlation snapshots on denied or forced access
4. Administrator programs access schedules by day/hour and role-based groups (employee, manager, visitor)
5. Multi-site dashboard shows up to 5 sites with cross-site metrics comparison, centralized RBAC with custom roles, enterprise SSO (SAML/OAuth2), and inter-site data synchronization
6. Immutable audit trail logs every user action with hash-chain integrity (extending existing system)

**Plans**: 6 plans
**UI hint**: yes

Plans:
- [ ] 03-01-PLAN.md — AI Preprocessor BASTION detection pipeline (weapons, abandoned, crowd, behavior, face, anti-spoofing)
- [ ] 03-02-PLAN.md — Schema foundation + shared package + Qdrant faces (models, types, Zod schemas, roles)
- [ ] 03-03-PLAN.md — Backend APIs (face enrollment, access groups, video correlation, multi-site, RBAC, SSO)
- [ ] 03-04-PLAN.md — Dashboard multi-site + admin UI (sites, RBAC editor, SSO config, global search)
- [ ] 03-05-PLAN.md — Dashboard face + access control UI (enrollment, credentials, schedules, events)
- [ ] 03-06-PLAN.md — Mobile + integration tests (face capture, site switcher, access log, tests)

---

### Phase 4: BASTION Enterprise
**Goal**: HAPDP compliance module, reports & analytics dashboard, REST API + webhooks, advanced storage & archiving, and third-party integrations

**Depends on**: Phase 3 (enterprise features sit on BASTION foundation)

**Requirements**: BAS-20, BAS-21, BAS-22, BAS-23, BAS-24, BAS-25, BAS-26, BAS-27, BAS-28, BAS-29, BAS-30, BAS-31, BAS-32, BAS-33, BAS-34, BAS-35, BAS-41, BAS-42, BAS-43, BAS-44

**Success Criteria** (what must be TRUE):
1. Security manager generates automated weekly/monthly PDF reports (incidents, attendance, anomalies) and exports CSV data with advanced search filters (date, site, event type, person)
2. Real-time analytics dashboard displays charts, trends, KPIs with interactive filtering
3. Storage supports unlimited local capacity, per-site/per-event retention (30d to 1yr+), RAID 1/5/10 redundancy, auto-backup to secondary NAS/external disk, and certified forensic evidence export with timestamp
4. HAPDP compliance features: assisted declaration wizard (auto-filled PDF), processing register with CSV/PDF export, camera consent signage module (timestamped proof), pseudonymization of sensitive data, subject access self-service portal (view/rectify/delete), and access traceability (who viewed what when)
5. REST API is documented and authenticated locally; webhooks push events to internal systems; fire alarm and BMS integrations correlate smoke detection with video

**Plans**: TBD
**UI hint**: yes

---

### Phase 5: Launch Readiness
**Goal**: vault-app admin complete with usage dashboard, public pricing page, technical documentation, support channels, and training materials

**Depends on**: Phase 1 (admin portal foundation), Phase 4 (full product feature set for docs and support readiness)

**Requirements**: ADM-04, ADM-05, BAS-36, BAS-37, BAS-38, BAS-39, BAS-40

**Success Criteria** (what must be TRUE):
1. VaultOS team views aggregated usage stats per client in admin portal: camera count, storage consumption, uptime, alert volume
2. Public pricing page displays FCFA prices for VISION and BASTION packs with product/solution pages, blog, case studies, demo request, and contact form
3. Technical documentation is published covering installation, configuration, troubleshooting, and maintenance
4. Support channels (hotline, chat, email) are operational with defined SLA (4h intervention Niamey) and 24/7 coverage
5. Training session materials (2h initial client session) and update distribution process are documented and ready

**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Architecture & License Foundation | 8/8 | Complete | 2026-07-18 |
| 2. VISION Pack | 0/8 | Planning complete | - |
| 3. BASTION AI & Access Control | 0/6 | Planning complete | - |
| 4. BASTION Enterprise | 0/0 | Not started | - |
| 5. Launch Readiness | 0/0 | Not started | - |
