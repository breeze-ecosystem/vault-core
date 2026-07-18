# Phase 4: BASTION Enterprise — Research

**Researched:** 2026-07-18
**Domain:** Enterprise add-on features (compliance, analytics, storage, API, integrations)
**Confidence:** HIGH (all locked decisions, codebase patterns verified via code audit)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Reports & Analytics (BAS-20 to BAS-24):**
- D-01: Hybrid report format — executive summary (charts + KPIs) + appendix. Uses existing pdfkit + Handlebars pipeline.
- D-02: Top 5 KPIs: Incidents today, active alerts, cameras online, storage used, entries today. Trend charts (7d/30d line). Advanced search filters. CSV/PDF export.
- D-03: Recharts for all analytics charts. Real-time via Socket.IO or periodic refresh.

**HAPDP Compliance (BAS-30 to BAS-35):**
- D-04: Single "Conformité HAPDP" module. One menu entry, 6-step wizard:
  1. Assisted declaration — wizard auto-fills, generates ready-to-submit PDF
  2. Processing register — auto-populated, CSV/PDF export
  3. Consent signage — timestamped PDF proof for camera signage
  4. Pseudonymization — sensitive data masked by default in UI/API responses
  5. Subject access portal — self-service view/rectify/delete
  6. Access traceability — extends existing hash-chain audit
- D-05: Extend existing compliance module (`apps/api/src/modules/compliance/`) for HAPDP-specific content.
- D-06: Pseudonymization at data layer. Faces blurred in snapshots by default when served via API. Full resolution with explicit role (ADMIN, SUPERVISOR) and logged access.

**Advanced Storage & Archiving (BAS-25 to BAS-29):**
- D-07: RAID: documentation only (mdadm). No UI alerts.
- D-08: Forensic evidence with TSA timestamp. Export ZIP/video clip signed + certified timestamp. Retention configurable 30d to 1yr+ via UI per-site/per-event-type.
- D-09: Auto-backup to NAS. Daily/weekly configurable. Integrity verification after each backup. Configuration in dashboard.

**API & Webhooks (BAS-41, BAS-42):**
- D-10: Swagger enriched + PDF integration guide.
- D-11: Webhook module already exists (`apps/api/src/modules/webhook/`) — production-ready. Extend dispatch coverage to all BASTION event types.

**Third-party Integrations (BAS-43, BAS-44):**
- D-12: Entry webhooks for fire alarm + BMS. Incoming JSON payload → correlate with video → generate alert.
- D-13: Reuse existing snapshot pipeline from access control correlation (Phase 3 D-26).
- D-14: BMS scope limited to HVAC, lighting, access events. Event-based only — no bidirectional control.

### The Agent's Discretion
- Exact Swagger descriptions and PDF guide content
- Email template design for report delivery
- Dashboard UI for retention policy management, analytics charts, HAPDP wizard steps
- TSA provider choice and timestamp format for forensic evidence
- Backup scheduling implementation and NAS connectivity approach
- Webhook event type enumeration for BASTION coverage

### Deferred Ideas (OUT OF SCOPE)
- BMS bidirectional control
- Modbus/MQTT direct for fire alarm/BMS
- API SDK / client library (Postman collection or Python/JS SDK)
- Predictive analytics heatmaps
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BAS-20 | Weekly PDF reports — auto: incidents, attendance, anomalies | Existing pdfkit + Handlebars pipeline in `compliance.service.ts`. New Handlebars templates for weekly/monthly BASTION reports. BullMQ queue for async generation. Auto-email delivery via existing notification service. |
| BAS-21 | Monthly PDF reports — detailed + data export | Same pipeline as BAS-20. Monthly aggregation queries via TimescaleDB. Data tables in appendix (D-01 hybrid format). |
| BAS-22 | Real-time analytics dashboard — charts, trends, KPIs | Existing Recharts (v2.15.1) components (`donut-chart.tsx`, `cross-site-comparison.tsx`). Top 5 KPIs from `analytics.service.ts` TimescaleDB queries. Socket.IO for real-time updates or periodic client refresh. |
| BAS-23 | Advanced search — filters by date, site, event type, person | Extend existing `AnalyticsController` with new query endpoint. Frontend filter bar component. Person search via face passage records. |
| BAS-24 | Data export — CSV, PDF | CSV generation via existing pattern (`governance.service.ts` `convertToCsv()`). PDF export via pdfkit pipeline. Download trigger pattern from `incident.controller.ts`. |
| BAS-25 | Unlimited local storage — according to client disk capacity | Existing `RecordingConfig` with `storagePath`. No hard cap in storage layer. BASTION feature gate removes VISION's camera limit (10) for storage operations. |
| BAS-26 | Per-site/per-event retention — 30d to 1yr+, configurable via UI | Extend `RetentionPolicy` model with `siteId` and `eventType` fields. New `retention-config` controller/service. Dashboard UI for per-site/per-event sliders. Extend `GovernanceService.pruneExpiredData()` CRON to respect site-scoped policies. |
| BAS-27 | Forensic evidence — compliant export with certified timestamp | New `forensic-evidence` module. Export pipeline: collect media + metadata → create ZIP/video clip → sign with HMAC → request TSA timestamp → bundle certificate. Use `openssl ts` command or Node.js `tsa` library for RFC 3161 timestamping. |
| BAS-28 | RAID redundancy — support RAID 1/5/10 | D-07: Documentation only. Refer to `docs/PRICING-SPEC.md` for hardware guide. No code changes. |
| BAS-29 | Auto-backup — to secondary NAS or external disk | New `backup` module. `@Cron` scheduled task using child_process for rsync/mount. Dashboard configuration form. Integrity verification via SHA-256 checksum after backup. |
| BAS-30 | Assisted HAPDP declaration — auto-filled wizard, PDF generation | New Handlebars template `hapdp-declaration.hbs`. New service method in ComplianceService. Wizard auto-fills from org profile + site data. |
| BAS-31 | Processing register — traceability base, CSV/PDF export | New Prisma model `ProcessingRecord` to capture system activity for compliance. Auto-populated via EventEmitter listeners on key operations. CSV/PDF export via existing patterns. |
| BAS-32 | Consent signage — camera signage module, timestamped proof | New Handlebars template `consent-signage.hbs`. PDF generates print-ready camera signage with timestamp + site info. |
| BAS-33 | Pseudonymization — sensitive data masked by default | Add `sharp` to API for on-the-fly face blurring at the snapshot-serving layer. AI Preprocessor blurs faces before storage (or API blurs on retrieval per D-06). Check `@fastify/static` middleware for intercept pattern. Configurable toggle per organization. |
| BAS-34 | Subject access right — self-service portal: view, rectify, delete | Public route (no auth) with identity verification via email OTP. New endpoints under `/api/compliance/subject-access`. Use existing notification service for OTP delivery. Admin approval workflow for rectification/deletion. |
| BAS-35 | Access traceability — who viewed what, when | Extend existing hash-chain `AuditService` (SHA-256, TimescaleDB `audit_log` hypertable). `@Audited()` decorator on all data access endpoints. New frontend component `access-traceability-log` for browsing audit trail. |
| BAS-41 | Local REST API — complete documentation, authentication | Extend Swagger annotations on all existing endpoints. Add request/response examples. Generate PDF integration guide via new `api-guide.hbs` template. |
| BAS-42 | Local webhooks — event notifications to internal systems | Extend `WebhookService.dispatchWebhook()` event type enum. Add BASTION event types (alerts, access events, AI detections, compliance events). Existing infrastructure: BullMQ delivery with HMAC-SHA256 signing, 6 retries with exponential backoff, Socket.IO gateway. |
| BAS-43 | Fire alarm integration — smoke detection + video correlation | New `integrations` module. Incoming webhook endpoint `/api/integrations/fire-alarm`. JSON payload → resolve nearest camera(s) → capture snapshot + 10s clip → create alert. Reuses existing `access.processor.ts` video-correlation pattern. |
| BAS-44 | BMS integration — HVAC, lighting, access events | Same pattern as BAS-43. Incoming webhook endpoint `/api/integrations/bms`. JSON payload with event type (HVAC alarm, emergency lighting, fire door release). Events only — no bidirectional control (D-14). |

</phase_requirements>

---

## Summary

Phase 4 is the **largest phase in scope** (20 requirements across 5 sub-domains) but most features extend existing, well-established code patterns. The codebase has excellent foundational support:

**The good news:** The PDF generation pipeline (pdfkit + Handlebars), webhook system (BullMQ + HMAC-SHA256), governance/retention system (CRON + queue), analytics service (TimescaleDB continuous aggregates), audit module (hash-chain), and compliance module are all production-ready. Most of Phase 4 is **extending existing infrastructure** rather than building new systems.

**The complexity comes from three areas:**
1. **HAPDP wizard** — 6-step interactive UI with state persistence, validation, and PDF generation is the most complex new frontend interaction
2. **Pseudonymization pipeline** — on-the-fly face blurring at the API layer requires a new image processing dependency (`sharp`) and a middleware/transform approach
3. **Forensic evidence with TSA** — RFC 3161 timestamp certification is specialized: requires an external TSA service and proper crypto bundling

**Primary recommendation:** Structure the phase into 4 sequential waves: (1) Reports & Analytics (backend + dashboard), (2) HAPDP Compliance (full wizard + backend), (3) Advanced Storage & Archiving + API & Webhooks, (4) Third-party Integrations. Waves 1 and 2 can run in parallel.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PDF report generation | NestJS API (BullMQ) | — | CPU-bound PDF generation in async queue. Existing `compliance.service.ts` pattern. |
| Analytics KPIs & trends | NestJS API (TimescaleDB) | Dashboard (Recharts) | Backend queries TimescaleDB continuous aggregates. Frontend renders charts. |
| Advanced search | NestJS API (Prisma + TimescaleDB) | — | Full-text + filtered queries across events, alerts, passages. |
| CSV/PDF export | NestJS API | — | Existing export patterns in `governance.service.ts` and `compliance.service.ts`. |
| HAPDP wizard state | Dashboard (localStorage) | NestJS API (on submit) | Wizard progress persisted client-side. Final submission generates PDF server-side. |
| HAPDP declaration PDF | NestJS API (ComplianceService) | — | New Handlebars template, same pdfkit pattern as SOC 2 reports. |
| Processing register | NestJS API (Prisma + EventEmitter) | — | Auto-populated by event listeners on system operations. |
| Consent signage PDF | NestJS API (ComplianceService) | — | Single-purpose template, timestamped generation. |
| Pseudonymization (blur) | NestJS API (Sharp middleware) | AI Preprocessor (option) | API blurs faces in snapshots on retrieval (D-06). Full-res gated behind explicit role. |
| Subject access portal | NestJS API (public route) | — | Public endpoint with identity verification via email OTP. No auth required. |
| Access traceability | NestJS API (AuditService) | Dashboard | Extends existing SHA-256 hash-chain. `@Audited()` decorator on all relevant endpoints. |
| Retention policy | NestJS API (GovernanceService + CRON) | Prisma | Extend existing `RetentionPolicy` model with site/event scoping. |
| Forensic evidence TSA | NestJS API (new module + BullMQ) | — | Export pipeline + RFC 3161 timestamp request + certificate bundling. |
| Auto-backup to NAS | NestJS API (Cron + child_process) | OS (mount/rsync) | Shell commands for mount + rsync. Integrity check after backup. |
| API Swagger docs | NestJS API (@nestjs/swagger) | — | Existing Swagger setup. Enrich with examples. |
| PDF integration guide | NestJS API (ComplianceService + pdfkit) | — | Same pdfkit pattern. Comprehensive API reference as PDF. |
| Webhook dispatch | NestJS API (WebhookService + BullMQ) | — | Existing production-ready system. Extend event type enum. |
| Fire alarm/BMS webhooks | NestJS API (IntegrationsModule) | — | Incoming webhook endpoints. JSON → video correlation → alert. |
| Video correlation | NestJS API (access.processor.ts pattern) | — | Reuse existing snapshot + clip pipeline. Nearest-camera resolution. |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdfkit | 0.19.1 | PDF generation | Existing in `compliance.service.ts` and `incident.service.ts`. Ecosystem standard for Node.js PDF. [VERIFIED: package.json + codebase audit] |
| Handlebars | 4.7.9 | HTML template compilation | Used by existing compliance module for PDF content templates. Compiled HTML rendered into pdfkit. [VERIFIED: package.json + codebase audit] |
| Recharts | 2.15.1 | Chart library (dashboard) | Existing in `donut-chart.tsx`, `cross-site-comparison.tsx`. D-03 locked decision. [VERIFIED: dashboard package.json] |
| motion | 12.42.2 | Animations | Existing across 30+ dashboard components. D-03 locked for analytics page transitions. [VERIFIED: dashboard package.json] |
| `@nestjs/schedule` | 6.1.3 | Cron job scheduling | Existing in `governance.service.ts`, `recording-cleanup.service.ts`, and 6+ other services. Used for retention pruning, backup scheduling. [VERIFIED: api package.json + codebase audit] |
| BullMQ | 5.30.0 | Async job queues | Existing for webhook delivery, report generation, evidence export. [VERIFIED: codebase audit] |
| TimescaleDB | (PostgreSQL extension) | Time-series analytics | Existing continuous aggregates `zone_analytics_hourly`, `site_analytics_daily`. Used for all analytics queries. [VERIFIED: analytics.service.ts] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sharp | 0.35.3 | Image processing (face blurring) | New dependency for pseudonymization. On-the-fly face blurring when serving snapshots through API. NOT currently in `package.json` — must install. [VERIFIED: npm registry] |
| `@prisma/client` | 5.22.0 | Database ORM | All new models (ProcessingRecord, SubjectAccessRequest, ForensicEvidence, BackupConfig, IntegrationEndpoint). [VERIFIED: package.json] |
| `@nestjs/swagger` | (existing) | OpenAPI documentation | Already used by webhook controller. Enrich with request/response examples for BAS-41. [VERIFIED: webhook.controller.ts] |
| `class-validator` | 0.14.1 | Swagger DTOs | Existing pattern for Swagger-compatible DTOs alongside Zod validation. [VERIFIED: package.json] |
| `zod` | 3.23.8 | Runtime validation | All new API endpoints. [VERIFIED: packages/shared] |
| Socket.IO | 4.8.3 | Real-time push | Existing for webhook gateway events. Analytics real-time updates. [VERIFIED: codebase audit] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sharp (face blur) | OpenCV via Python AI Preprocessor | Sharp is simpler for Node.js on-the-fly transforms. AI Preprocessor blur would require round-trip. Sharp is MIT-licensed, mature npm package. |
| OpenSSL TSA CLI | Node.js TSA library (`tsa-library`) | OpenSSL `ts` command is universally available on Linux. Node.js library adds dependency for what's a simple CLI call. Use child_process for v1 maturity. |
| rsync for backup | `node-rsync` npm package | rsync CLI via child_process is simpler and more reliable than wrapping in npm package. Avoids dependency risk. |

**Installation (new packages for API):**
```bash
cd apps/api && pnpm add sharp
```

**Version verification:**
```bash
npm view pdfkit version          # 0.19.1
npm view handlebars version      # 4.7.9
npm view recharts version        # 3.9.2
npm view @nestjs/schedule version # 6.1.3
npm view sharp version           # 0.35.3
```

---

## Package Legitimacy Audit

> Only one new external npm package is required for this phase: `sharp` (image processing for face blurring pseudonymization). All other dependencies are already in the codebase.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| sharp | npm | 12+ yrs | ~40M/wk | github.com/lovell/sharp | (see below) | Approved — industry standard |
| pdfkit | npm | 14+ yrs | ~5M/wk | github.com/foliojs/pdfkit | Already in use | Already in codebase |
| handlebars | npm | 14+ yrs | ~25M/wk | github.com/handlebars-lang/handlebars.js | Already in use | Already in codebase |
| recharts | npm | 9+ yrs | ~7M/wk | github.com/recharts/recharts | Already in use | Already in codebase |
| @nestjs/schedule | npm | 6+ yrs | ~2M/wk | github.com/nestjs/schedule | Already in use | Already in codebase |
| motion | npm | 12+ yrs | ~10M/wk | github.com/motiondivision/motion | Already in use | Already in codebase |

**slopcheck note:** The only new package (`sharp`) is a well-established, widely-used library (40M weekly downloads, 12+ years on registry). It is a native Node.js binding to libvips, used by Vercel/Next.js image optimization pipeline. Low risk.

**Packages removed due to slopcheck [SLOP] verdict:** None
**Packages flagged as suspicious [SUS]:** None

---

## Architecture Patterns

### System Architecture Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            NESTJS API                                        │
│                                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐ │
│  │  Module: compliance  │  │   Module: analytics   │  │  Module: governance  │ │
│  │  - HAPDP wizard PDF │  │  - KPI endpoints     │  │  - Retention CRUD    │ │
│  │  - Consent signage   │  │  - Trend queries     │  │  - Per-site retention│ │
│  │  - Subject access   │  │  - Advanced search   │  │  - Pre-purge export  │ │
│  └─────────┬───────────┘  └──────────┬──────────┘  └──────────┬───────────┘ │
│            │                        │                         │             │
│  ┌─────────▼────────────────────────▼─────────────────────────▼──────────┐ │
│  │                        Event Bus (EventEmitter2)                      │ │
│  │  ┌────────────┐ ┌──────────────┐ ┌───────────┐ ┌──────────────────┐  │ │
│  │  │ BullMQ     │ │ TimescaleDB  │ │ Prisma/DB │ │ @fastify/static  │  │ │
│  │  │ (reports,  │ │ (analytics   │ │ (org,     │ │ (snapshot serving)│  │ │
│  │  │  evidence, │ │  aggregates) │ │  users,   │ │                  │  │ │
│  │  │  backup)   │ │              │ │  config)  │ │  (blur via sharp) │ │
│  │  └────────────┘ └──────────────┘ └───────────┘ └──────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐ │
│  │  Module: webhook    │  │  Module: audit      │  │  Module: integrations│ │
│  │  - Dispatch BASTION  │  │  - Hash-chain       │  │  - Fire alarm webhook│ │
│  │    event types      │  │  - Access trace     │  │  - BMS webhook       │ │
│  │  - HMAC signing     │  │  - Subject access   │  │  - Video correlation │ │
│  └─────────┬───────────┘  └──────────┬──────────┘  └──────────┬───────────┘ │
│            │                        │                         │             │
│  ┌─────────▼────────────────────────▼─────────────────────────▼──────────┐ │
│  │                      Dashboard (Next.js + Recharts)                   │ │
│  │  ┌────────────────┐ ┌──────────────────┐ ┌────────────────────────┐   │ │
│  │  │ Analytics page │ │ HAPDP wizard    │ │ Settings pages         │   │ │
│  │  │ - KPI grid     │ │ - 6-step flow   │ │ - Retention config    │   │ │
│  │  │ - Trend charts │ │ - PDF download  │ │ - Backup config       │   │ │
│  │  │ - CSV export   │ │ - Consent sign  │ │ - API tokens          │   │ │
│  │  │ - Report sched │ │ - Subject portal│ │ - Webhook CRUD        │   │ │
│  │  └────────────────┘ └──────────────────┘ └────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────┐                                                     │
│  │  External Systems   │                                                     │
│  │  - TSA Authority    │←── RFC 3161 timestamp request (openssl ts)          │
│  │  - NAS / Ext. Disk  │←── rsync backup (child_process)                     │
│  │  - Fire alarm panel │──→ POST /api/integrations/fire-alarm               │
│  │  - BMS controller   │──→ POST /api/integrations/bms                      │
│  └─────────────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

**NestJS API extensions:**
```
apps/api/src/
├── modules/
│   ├── governance/
│   │   ├── governance.service.ts     # EXTEND: per-site/per-event retention
│   │   ├── governance.controller.ts  # EXTEND: new retention config endpoints
│   │   ├── governance.processor.ts   # EXTEND: site-scoped pruning
│   │   └── governance.module.ts
│   ├── compliance/
│   │   ├── compliance.service.ts     # EXTEND: HAPDP declaration, consent signage
│   │   ├── compliance.controller.ts  # EXTEND: HAPDP endpoints
│   │   ├── compliance.module.ts
│   │   ├── subject-access.service.ts # NEW: subject access request handling
│   │   ├── subject-access.controller.ts # NEW: public subject access routes
│   │   └── templates/
│   │       ├── hapdp-declaration.hbs # NEW: HAPDP declaration PDF template
│   │       ├── consent-signage.hbs   # NEW: camera signage PDF template
│   │       └── integration-guide.hbs # NEW: API integration guide PDF template
│   ├── analytics/
│   │   ├── analytics.service.ts      # EXTEND: BASTION KPI queries
│   │   ├── analytics.controller.ts   # EXTEND: new BASTION endpoints
│   │   └── bastion-analytics.service.ts # NEW: BASTION-specific aggregation
│   ├── reporting/                    # NEW: BASTION report generation
│   │   ├── report.controller.ts
│   │   ├── report.service.ts
│   │   ├── report.processor.ts      # BullMQ worker for async PDF generation
│   │   ├── report.module.ts
│   │   └── templates/
│   │       ├── weekly-report.hbs
│   │       └── monthly-report.hbs
│   ├── webhook/
│   │   └── webhook.service.ts       # EXTEND: BASTION event types in dispatch()
│   ├── forensic/                     # NEW: forensic evidence module
│   │   ├── forensic.controller.ts
│   │   ├── forensic.service.ts
│   │   ├── forensic.processor.ts    # BullMQ worker for evidence certification
│   │   └── forensic.module.ts
│   ├── backup/                       # NEW: auto-backup module
│   │   ├── backup.controller.ts
│   │   ├── backup.service.ts
│   │   └── backup.module.ts
│   ├── integrations/                 # NEW: third-party integration module
│   │   ├── integrations.controller.ts
│   │   ├── integrations.service.ts
│   │   └── integrations.module.ts
│   └── pseudonymization/            # NEW: face blurring middleware/service
│       ├── pseudonymization.service.ts
│       └── pseudonymization.interceptor.ts # Intercept snapshot requests
├── common/
│   ├── decorators/
│   │   └── feature-gate.decorator.ts # EXTEND: new BASTION module keys
│   └── guards/
│       └── feature-gate.guard.ts     # EXTEND: BASTION module gate checks
└── main.ts                           # EXTEND: register new modules
```

**Dashboard extensions:**
```
apps/dashboard/
├── app/(dashboard)/
│   ├── analytique/enhanced/          # NEW: enhanced analytics page
│   │   └── page.tsx
│   ├── conformite/
│   │   ├── hapdp/                    # NEW: HAPDP wizard pages
│   │   │   ├── page.tsx             # Wizard container
│   │   │   └── portail/             # NEW: subject access portal (public)
│   │   │       └── page.tsx
│   │   └── registre/                # NEW: processing register page
│   │       └── page.tsx
│   ├── parametres/
│   │   ├── retention/               # NEW: advanced retention config
│   │   │   └── page.tsx
│   │   ├── sauvegarde/              # NEW: backup configuration
│   │   │   └── page.tsx
│   │   └── api/                     # NEW: API & webhooks management
│   │       ├── page.tsx
│   │       └── webhooks/nouveau/    # NEW: webhook creation
│   │           └── page.tsx
│   └── integrations/                # NEW: third-party integrations
│       └── page.tsx
├── components/
│   ├── analytics-kpi-grid.tsx        # NEW
│   ├── trend-chart-card.tsx          # NEW
│   ├── report-schedule-config.tsx    # NEW
│   ├── report-preview.tsx            # NEW
│   ├── hapdp-wizard.tsx              # NEW
│   ├── hapdp-declaration-form.tsx    # NEW
│   ├── processing-register-table.tsx # NEW
│   ├── consent-signage-generator.tsx # NEW
│   ├── subject-access-portal.tsx     # NEW
│   ├── access-traceability-log.tsx   # NEW
│   ├── retention-config-form.tsx     # NEW
│   ├── forensic-evidence-export.tsx  # NEW
│   ├── backup-config-form.tsx        # NEW
│   ├── backup-status-card.tsx        # NEW
│   ├── api-credentials-panel.tsx     # NEW
│   ├── webhook-subscription-list.tsx # NEW
│   ├── webhook-event-selector.tsx    # NEW
│   ├── integration-card.tsx          # NEW
│   └── correlated-snapshot-preview.tsx # NEW
└── lib/
    ├── api.ts                        # EXTEND: BASTION API client functions
    └── auth-client.ts                # EXTEND: public routes bypass auth
```

**Prisma schema extensions:**
```
apps/api/prisma/
└── schema.prisma
    # NEW: ProcessingRecord model (HAPDP processing register)
    # NEW: SubjectAccessRequest model (HAPDP subject access)
    # NEW: ForensicEvidence model (certified evidence metadata)
    # NEW: BackupConfig model (NAS/external disk backup settings)
    # NEW: BackupJob model (backup execution log)
    # NEW: IntegrationEndpoint model (fire alarm/BMS config)
    # NEW: ConsentSignage model (camera signage generation log)
    # EXTEND: RetentionPolicy with siteId, eventType (currently global)
    # EXTEND: Organization with pseudonymizationEnabled toggle
    # EXTEND: Organization with nasConfig JSON field
```

### Pattern 1: PDF Report Generation (pdfkit + Handlebars)

**What:** Generate PDF reports using Handlebars HTML templates, rendered into pdfkit documents. Pattern verified from `compliance.service.ts` and `incident.service.ts`.

**When to use:** All PDF generation: weekly/monthly reports, HAPDP declaration, consent signage, API integration guide.

**Example (from compliance.service.ts — verified pattern):**
```typescript
// 1. Create Handlebars template (stored as .hbs file)
const templateSource = fs.readFileSync(
  path.join(__dirname, "templates", "weekly-report.hbs"), "utf-8"
);
const template = Handlebars.compile(templateSource);
const html = template({
  orgName: org.displayName,
  incidentsToday: 12,
  activeAlerts: 3,
  camerasOnline: 24,
  storageUsed: "2.4 TB",
  entriesToday: 147,
  // ...data for KPI cards, charts, tables in appendix
  generatedAt: new Date().toLocaleString("fr-FR"),
});

// 2. Generate PDF via pdfkit (buffer aggregation pattern)
return new Promise<Buffer>((resolve, reject) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const buffers: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => buffers.push(chunk));
  doc.on("end", () => resolve(Buffer.concat(buffers)));
  doc.on("error", reject);

  // Header
  doc.fontSize(16).font("Helvetica-Bold").text("Rapport Hebdomadaire", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica").text(`Organisation: ${orgName}`);
  doc.fontSize(10).font("Helvetica").text(`Période: ${dateRangeLabel}`);
  doc.fontSize(10).font("Helvetica").text(`Généré le: ${generatedAt}`);
  doc.moveDown();

  // Executive summary section
  doc.fontSize(14).font("Helvetica-Bold").text("Résumé Exécutif");
  doc.moveDown(0.3);
  // ... render KPI values, short summary text

  // Appendix section (for hybrid format D-01)
  doc.addPage();
  doc.fontSize(14).font("Helvetica-Bold").text("Annexe — Détails des Événements");
  doc.moveDown(0.3);
  // ... render data tables

  // Footer
  doc.fontSize(7).font("Helvetica").text(
    "CONFIDENTIEL — Usage interne — VaultOS v1.0", { align: "center" }
  );
  doc.end();
});
```

### Pattern 2: Async Report Generation via BullMQ

**What:** Heavy PDF generation runs in a BullMQ worker to avoid blocking the request. The request enqueues a job, and a Socket.IO event notifies the dashboard when the PDF is ready.

**When to use:** Weekly/monthly reports, forensic evidence certification, any large PDF export.

**Example:**
```typescript
// Controller (enqueue)
@Post("reports/weekly")
@Roles("ADMIN", "SUPER_ADMIN")
@RequiresPack("BASTION")
async generateWeeklyReport(@Req() req: FastifyRequest) {
  const orgId = (req as any).user.orgId;
  const job = await this.reportQueue.add("generate-weekly", {
    orgId,
    requestedAt: new Date().toISOString(),
  });
  return { jobId: job.id, status: "processing" };
}

// Processor (BullMQ worker)
@Processor("report-generation")
export class ReportProcessor extends WorkerHost {
  async process(job: Job): Promise<any> {
    const { orgId } = job.data;
    // Generate PDF...
    const pdfBuffer = await this.generatePdf(orgId);
    // Store result (in DB or temp file)
    await this.reportService.storeReport(orgId, "weekly", pdfBuffer);
    // Notify dashboard via Socket.IO
    this.eventEmitter.emit("report.ready", { orgId, type: "weekly", reportId });
    return { reportId, size: pdfBuffer.length };
  }
}
```

### Pattern 3: Extension of Webhook Dispatch (WebhookService)

**What:** The existing `WebhookService.dispatchWebhook()` method dispatches to all active subscriptions for a given event type. Extend the event type enum to cover BASTION events.

**When to use:** Any new BASTION event type that needs webhook coverage.

**Example (extending existing pattern):**
```typescript
// In webhook.service.ts — extend dispatch calls at BASTION event sources:
// After an AI detection:
await this.webhookService.dispatchWebhook("bastion.ai_detection", orgId, {
  id: eventId,
  type: "weapon",
  cameraId: camera.id,
  siteId: siteId,
  timestamp: new Date().toISOString(),
  snapshotUrl: snapshotUrl,
  confidence: 0.87,
});

// After a compliance event:
await this.webhookService.dispatchWebhook("bastion.compliance_event", orgId, {
  id: recordId,
  type: "subject_access_request",
  action: "view",
  userId: subjectUserId,
  timestamp: new Date().toISOString(),
});

// After a fire alarm event (from incoming webhook):
await this.webhookService.dispatchWebhook("bastion.fire_alarm", orgId, {
  id: alertId,
  zone: "Building A - Floor 3",
  sensorId: "SENSOR-001",
  severity: "CRITICAL",
  correlatedCameraId: camera.id,
  snapshotUrl: snapshotUrl,
  timestamp: new Date().toISOString(),
});
```

### Pattern 4: Pseudonymization / Face Blurring via Sharp Middleware

**What:** Intercept snapshot GET requests and apply Gaussian blur to face regions before serving. Uses `sharp` (libvips bindings) for fast image processing.

**When to use:** All snapshot/image serving endpoints in BASTION orgs with pseudonymization enabled.

**Example:**
```typescript
// Interceptor or middleware at the @fastify/static serving layer
import sharp from "sharp";

async function blurFacesInSnapshot(imageBuffer: Buffer): Promise<Buffer> {
  // 1. Load image with sharp
  const metadata = await sharp(imageBuffer).metadata();
  // 2. If the AI Preprocessor already stored face regions in metadata/DB,
  //    apply blur to those regions. Otherwise, blur entire upper portion.
  //    For v1 simplicity: blur the top 25% of the image (face zone).
  //    For production: AI Preprocessor returns face bounding boxes in DB,
  //    then this function applies region-specific Gaussian blur.
  return sharp(imageBuffer)
    .blur(15)  // Strong Gaussian blur
    .toBuffer();
}

// In the snapshot serving route:
@Get("snapshots/:filename")
@Roles("OPERATOR", "SUPERVISOR", "ADMIN")
async getSnapshot(
  @Param("filename") filename: string,
  @Req() req: FastifyRequest,
  @Res() reply: FastifyReply,
) {
  const orgId = (req as any).user.orgId;
  const userRole = (req as any).user.role;

  // Check if pseudonymization is enabled for this org
  const pseudonymizationEnabled = await this.getOrgSetting(orgId, "pseudonymizationEnabled");

  if (pseudonymizationEnabled && !["ADMIN", "SUPERVISOR"].includes(userRole)) {
    // Blur faces for non-privileged users (D-06)
    const imageBuffer = fs.readFileSync(path.join(SNAPSHOT_DIR, filename));
    const blurred = await blurFacesInSnapshot(imageBuffer);
    reply.header("Content-Type", "image/jpeg");
    reply.send(blurred);
    // Log access for traceability (BAS-35)
    await this.auditService.log({
      userId: (req as any).user.id,
      action: "VIEW_SNAPSHOT_PSEUDONYMIZED",
      entity: "snapshot",
      entityId: filename,
      request: req,
    });
  } else {
    // Serve full resolution
    reply.sendFile(filename, SNAPSHOT_DIR);
    // Log access
    await this.auditService.log({...});
  }
}
```

### Pattern 5: Forensic Evidence with TSA Timestamp

**What:** Collect evidence media → create ZIP/video clip → sign → request RFC 3161 timestamp → bundle certificate. The TSA timestamp proves existence at a point in time.

**When to use:** BAS-27 forensic evidence export.

**Example:**
```typescript
import { execSync } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";

async function certifyEvidence(
  mediaFiles: string[],
  metadata: Record<string, any>,
  tsaUrl: string = "http://timestamp.digicert.com",
): Promise<{ zipPath: string; tsaCertPath: string }> {
  // 1. Create evidence bundle (ZIP with media + metadata JSON)
  const evidenceId = crypto.randomUUID();
  const tempDir = `/tmp/evidence/${evidenceId}`;
  fs.mkdirSync(tempDir, { recursive: true });
  fs.writeFileSync(`${tempDir}/metadata.json`, JSON.stringify(metadata, null, 2));
  // Copy media files...
  mediaFiles.forEach((f) => fs.copyFileSync(f, `${tempDir}/${path.basename(f)}`));

  // 2. Create digest of the evidence
  const hash = crypto.createHash("sha256");
  // Hash the entire bundle
  const zipPath = `${tempDir}/evidence.zip`;
  execSync(`cd ${tempDir} && zip -r evidence.zip .`, { stdio: "pipe" });
  const zipBuffer = fs.readFileSync(zipPath);
  hash.update(zipBuffer);
  const digest = hash.digest("hex");

  // 3. Request TSA timestamp (RFC 3161)
  // Create a file with the hash
  fs.writeFileSync(`${tempDir}/hash.txt`, digest);

  // Use openssl ts command to get RFC 3161 timestamp
  execSync(
    `openssl ts -query -data ${tempDir}/hash.txt -no_nonce -sha256 -out ${tempDir}/tsq`,
  );
  execSync(
    `curl -s -H "Content-Type: application/timestamp-query" ` +
    `--data-binary @${tempDir}/tsq ${tsaUrl} -o ${tempDir}/tsr`,
  );

  // 4. Bundle: evidence ZIP + TSA response + hash
  const finalPath = `/mnt/evidence/${evidenceId}-certified.zip`;
  execSync(
    `cd ${tempDir} && zip -r ${finalPath} evidence.zip tsr hash.txt`,
  );

  return {
    zipPath: finalPath,
    tsaCertPath: `${tempDir}/tsr`,
  };
}
```

### Pattern 6: Auto-backup via Cron + mount + rsync

**What:** Scheduled backup to NAS using Linux mount (CIFS/NFS) + rsync. Configured via dashboard form, triggered by `@Cron`. Integrity verified after each backup.

**When to use:** BAS-29 auto-backup to NAS.

**Example:**
```typescript
import { Cron } from "@nestjs/schedule";
import { execSync } from "child_process";

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  @Cron("0 2 * * *") // Daily at 2 AM
  async runScheduledBackup() {
    const configs = await this.prisma.backupConfig.findMany({
      where: { enabled: true, organization: { isActive: true } },
    });

    for (const config of configs) {
      await this.executeBackup(config);
    }
  }

  private async executeBackup(config: BackupConfig) {
    const { id, orgId, targetPath, username, password, schedule } = config;
    const mountPoint = `/mnt/backup/${orgId}`;
    const sourceDirs = [
      `/mnt/recordings/${orgId}`,
      `/mnt/snapshots/${orgId}`,
      `/mnt/evidence/${orgId}`,
    ];

    try {
      // 1. Mount NAS share
      execSync(
        `mkdir -p ${mountPoint} && ` +
        `mount -t cifs ${targetPath} ${mountPoint} -o username=${username},password=${password},vers=3.0`,
        { timeout: 30000 },
      );

      // 2. rsync each directory
      for (const src of sourceDirs) {
        if (fs.existsSync(src)) {
          execSync(
            `rsync -avz --delete ${src}/ ${mountPoint}/backup/`,
            { timeout: 3600000 }, // 1 hour timeout
          );
        }
      }

      // 3. Create integrity manifest
      execSync(
        `find ${mountPoint}/backup -type f -exec sha256sum {} \\; > ${mountPoint}/backup/manifest-${Date.now()}.sha256`,
      );

      // 4. Verify integrity
      execSync(`sha256sum -c ${mountPoint}/backup/manifest-*.sha256`, { timeout: 600000 });

      // 5. Unmount
      execSync(`umount ${mountPoint}`);

      // 6. Log success
      await this.prisma.backupJob.create({
        data: {
          backupConfigId: id,
          organizationId: orgId,
          status: "SUCCESS",
          sizeBytes: this.getDirSize(sourceDirs),
          startedAt: new Date(Date.now() - duration),
          completedAt: new Date(),
        },
      });
    } catch (err: any) {
      // Unmount on failure
      try { execSync(`umount ${mountPoint}`, { timeout: 5000 }); } catch {}
      // Log failure
      await this.prisma.backupJob.create({
        data: {
          backupConfigId: id,
          organizationId: orgId,
          status: "FAILED",
          error: err.message,
        },
      });
      this.logger.error(`Backup failed for org ${orgId}: ${err.message}`);
    }
  }
}
```

### Anti-Patterns to Avoid

- **Using Prisma for time-series queries:** All analytics KPIs should use TimescaleDB raw SQL via `$queryRawUnsafe`. Existing `analytics.service.ts` pattern.
- **Synchronous PDF generation in request handler:** Always enqueue via BullMQ for reports > 10 pages. Sync is acceptable for small PDFs (consent signage, single-page declarations).
- **Storing face blurring permanently:** Apply blur on retrieval, not on storage. This allows admin to toggle pseudonymization without re-processing data.
- **Embedding TSA credentials in code:** TSA URL should be configurable via env var. Credentials (if needed) stored in organization config.
- **Hardcoding NAS paths:** All backup targets configurable via dashboard. Use org-level storage in `BackupConfig` model.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom PDF layout engine | pdfkit + Handlebars templates | Existing in 3+ services. Ecosystem standard. Handles A4, margins, fonts, headers/footers. |
| Chart rendering | Custom SVG chart library | Recharts (LineChart, BarChart, PieChart) | Existing in codebase. D-03 locked. Responsive, animated, React-native compatible. |
| Webhook delivery | Custom HTTP retry + signing | Existing WebhookService (BullMQ + HMAC-SHA256) | Production-ready: exponential backoff, SSRF protection, delivery logging, Socket.IO gateway. |
| Face blurring | Custom pixel manipulation | Sharp (libvips) | 40M weekly downloads. BLUR operation handles Gaussian blur natively. 10x faster than Canvas/Jimp. |
| Time-series analytics | Custom aggregation queries | Existing TimescaleDB continuous aggregates | `zone_analytics_hourly` and `site_analytics_daily` already exist. Extend with BASTION-specific aggregates. |
| Audit hash-chain | Custom integrity system | Existing AuditService.verifyChain() | SHA-256 per-entity and per-org chain. Already production-ready in TimescaleDB hypertable. |
| Cron scheduling | Custom timer service | @nestjs/schedule @Cron decorator | Used across 8+ services. `CronExpression` enum for standard schedules. |
| CSV export | Custom CSV serializer | Existing GovernanceService.convertToCsv() | Handles quoting, escaping, null values. Used in retention pre-purge export. |
| Snapshot serving | Custom static file server | Existing @fastify/static | Already configured. Add pseudonymization middleware. |

**Key insight:** The existing codebase already implements 80% of the infrastructure Phase 4 needs. The PDF pipeline, webhook system, governance retention, analytics service, audit module, and cron infrastructure are all production-ready. Phase 4's work is primarily **extension and integration** — new templates, new models, new controllers, new dashboard pages — not building foundational systems.

---

## Codebase Integration Points

### Specific Files/Modules That Need Modification

| File/Module | Change Required | Feature |
|-------------|----------------|---------|
| `apps/api/prisma/schema.prisma` | Add models: `ProcessingRecord`, `SubjectAccessRequest`, `ForensicEvidence`, `BackupConfig`, `BackupJob`, `IntegrationEndpoint`, `ConsentSignage`. Extend `RetentionPolicy` with `siteId`, `eventType`. Extend `Organization` with `pseudonymizationEnabled` and `nasConfig`. | All |
| `apps/api/src/modules/compliance/compliance.service.ts` | Add methods: `generateHapdpDeclaration()`, `generateConsentSignage()`, `generateProcessingRegisterExport()`, `handleSubjectAccessRequest()` | BAS-30/31/32/34 |
| `apps/api/src/modules/compliance/compliance.controller.ts` | Add endpoints: `POST /api/compliance/hapdp/declaration`, `POST /api/compliance/hapdp/consent-signage`, `POST /api/compliance/hapdp/subject-access`, `GET /api/compliance/registre` | BAS-30/31/32/34 |
| `apps/api/src/modules/compliance/templates/` | NEW: `hapdp-declaration.hbs`, `consent-signage.hbs` | BAS-30/32 |
| `apps/api/src/modules/governance/governance.service.ts` | EXTEND: `pruneExpiredData()` to respect site-scoped retention. Add methods for per-site RetentionPolicy CRUD. | BAS-26 |
| `apps/api/src/modules/governance/governance.controller.ts` | EXTEND: endpoint for per-site retention config. | BAS-26 |
| `apps/api/src/modules/analytics/analytics.service.ts` | EXTEND: New BASTION KPI queries (incidents today, active alerts, cameras online, storage used, entries today). Add trend queries for 7d/30d. | BAS-22 |
| `apps/api/src/modules/analytics/analytics.controller.ts` | EXTEND: New BASTION analytics endpoints. | BAS-22 |
| `apps/api/src/modules/webhook/webhook.service.ts` | EXTEND: Call `dispatchWebhook()` at BASTION event sources. No code changes to webhook module needed — just call it. | BAS-42 |
| `apps/api/src/modules/audit/audit.service.ts` | EXTEND: Add `@Audited()` decorator to all new data access endpoints. | BAS-35 |
| `apps/api/src/common/decorators/feature-gate.decorator.ts` | EXTEND: Add BASTION module keys if needed for Phase 4 sub-features. | All |
| `apps/api/src/main.ts` | EXTEND: Register new modules in AppModule imports. | All |
| `apps/api/src/modules/recording/` | EXTEND: RecordingConfig retention extended for 30d-1yr+ values. | BAS-25/26 |
| `packages/shared/src/constants/` | EXTEND: Add BASTION event type constants for webhook dispatch. | BAS-42 |
| `packages/shared/src/schemas/` | EXTEND: Add Zod schemas for new endpoints (retention config, backup config, integration config, HAPDP wizard, subject access). | All |
| `packages/shared/src/index.ts` | EXTEND: Export new schemas and types. | All |
| `apps/dashboard/lib/api.ts` | EXTEND: Add API client functions for all new BASTION endpoints. | All |
| `apps/dashboard/lib/auth-client.ts` | EXTEND: Handle public routes (subject access portal) — bypass auth. | BAS-34 |

### Existing Patterns to Follow

1. **Guard chain order:** `JwtAuthGuard → TenantIsolationGuard → RolesGuard → FeatureGateGuard` — all new BASTION endpoints must be protected with `@RequiresPack("BASTION")` and appropriate `@RequiresModule()` for sub-features.

2. **PDF generation pattern:** Handlebars template → compile → pdfkit buffer aggregation → `Content-Type: application/pdf` response. Verified in `compliance.service.ts` lines 316-389 and `incident.service.ts` lines 570-629.

3. **Async processing:** BullMQ queues for non-blocking operations. Heavy PDF generation and evidence certification must use queues (new `report-generation` and `forensic-certification` queues).

4. **Cron scheduling:** `@nestjs/schedule` with `@Cron()` decorator for automated tasks (retention pruning, backup execution). Pattern from `governance.service.ts` line 68.

5. **TimescaleDB queries:** Raw SQL via `prisma.$queryRawUnsafe()` for all time-series queries. Never use Prisma models for hypertables. Pattern from `analytics.service.ts` lines 60-78.

6. **Webhook dispatch:** `WebhookService.dispatchWebhook()` is called from service methods after relevant events. No changes needed to the webhook module itself — just add `dispatchWebhook()` calls.

7. **Swagger documentation:** `@ApiTags()`, `@ApiOperation()`, `@ApiBearerAuth()` decorators on all new endpoints. DTO classes in `dto/` subdirectory. Pattern from `webhook.controller.ts`.

8. **Dashboard page pattern:** `'use client'` → `useState`/`useEffect` → `fetchWithAuth()` → skeleton loading → error state → empty state → data render. Pattern from `page.tsx` and `visages/page.tsx`.

9. **Audit logging:** `@Audited()` decorator on all mutation endpoints. `AuditService.log()` for explicit logging. All data access events logged for BAS-35 (access traceability).

10. **Feature gating:** `@RequiresPack("BASTION")` on all Phase 4 controllers. HAPDP sub-features require HAPDP module gate.

---

## Risks & Mitigations

### 1. HAPDP Wizard Complexity — 6-step form with cross-step validation
**Risk:** The HAPDP wizard is the most complex new frontend component. 6 steps with state persistence, per-step validation, auto-fill from multiple data sources, and final PDF generation. UI state management errors could corrupt user progress.
**Mitigation:**
- Persist wizard state in localStorage after each step (D-04: auto-save)
- Implement step-level validation before allowing "Next"
- Server-side validation on final submission (don't trust client-only state)
- Use existing `Tabs` + `GlassCard` + `Button` components for consistent UX
- Consider Zustand or React Context for wizard state management if localStorage complexity grows

### 2. TSA Timestamp Service Availability
**Risk:** The forensic evidence feature (BAS-27) depends on an external TSA service. If the TSA service is unreachable (common in Niger/West Africa with intermittent internet), evidence certification fails and operators cannot export certified evidence.
**Mitigation:**
- Make TSA URL configurable per organization (env var `TSA_URL`)
- Implement a local TSA fallback (openssl can self-sign timestamps for non-legal use)
- Cache/reuse TSA responses for batch operations
- Document that TSA certification requires outbound internet to the configured TSA authority
- Primary recommendation: Use DigiCert TSA (`http://timestamp.digicert.com`) or Secture timestamping service available in West Africa

### 3. NAS Backup Reliability in Unstable Network Environments
**Risk:** Auto-backup (BAS-29) uses `mount -t cifs` to NAS over the local network. If the NAS is on a separate VLAN, has credential rotation, or the network is unstable, backups silently fail.
**Mitigation:**
- Implement the "Test connection" button (D-09 requirement) that validates mount + write before saving config
- Log all backup attempts with detailed error messages
- Send notification on backup failure (reuse existing notification service)
- Integrity verification after each backup (sha256sum check)
- Max retry: 3 attempts before marking the backup as failed and notifying admin
- Document supported NAS protocols: CIFS/SMB v3.0, NFS v4

### 4. Pseudonymization Performance at Scale
**Risk:** Applying Gaussian blur to every snapshot served via the API (BAS-33) creates CPU overhead. If an operator is viewing a grid of 16 cameras with 1 FPS thumbnails, 16 blur operations per second could overload the server CPU.
**Mitigation:**
- Cache blurred versions with a TTL (e.g., `snapshot_blurred_<id>.jpg` expires after 5 minutes)
- Apply blur at ingest time (AI Preprocessor blurs before storage) rather than on retrieval
- Allow operators to toggle pseudonymization per session (once blurred, stay blurred for that session)
- Use Sharp's streaming API (pipeline pattern) to avoid loading full images into memory
- For v1: blur at retrieval with caching. Monitor CPU. If problematic, switch to ingest-time blurring.

### 5. Subject Access Portal — Identity Verification Security
**Risk:** The subject access portal (BAS-34) is a public route where users can request to view/rectify/delete personal data. Weak identity verification (email-only OTP) could allow impersonation and unauthorized data access.
**Mitigation:**
- Email OTP must expire after 15 minutes
- Rate-limit OTP requests per email (max 3 per hour)
- Admin approval required for rectification/deletion (not automatic)
- Log all subject access requests with IP + user-agent for audit trail
- Portal is read-only for data viewing; mutations go through admin approval workflow
- Consider adding identity document upload for high-value deletions (deferred to future phase)

### 6. Webhook Event Type Enumeration Drift
**Risk:** As new BASTION event types are added across multiple sub-domains (compliance, analytics, AI detections, integrations), the webhook event type enum must be kept in sync. Mismatched event types cause silent dispatch failures.
**Mitigation:**
- Define all event types as a shared constant in `packages/shared/src/constants/bastion-event-types.ts`
- Import and use the same enum in both webhook dispatch calls and subscription CRUD
- Unit test: verify all registered event types have matching handlers
- Log warning when `dispatchWebhook()` is called with an event type that has no subscriptions

### 7. TimescaleDB Query Performance with Extended Retention
**Risk:** BASTION retention of 1yr+ (BAS-26) means TimescaleDB hypertables grow significantly larger than VISION's 30-day retention. Queries on 1-year data without proper time indexing could timeout.
**Mitigation:**
- Ensure all analytics queries include `time >= $1` filters (already standard in `analytics.service.ts`)
- Create additional continuous aggregates for monthly/yearly rollups if needed
- Add `created_at` indexes on all new Prisma models with retention
- Implement query timeout in the analytics controller (30s max)
- Consider data tiering: hot (30 days) in hypertable, warm (30d-1yr) in compressed chunks

---

## Dependencies & Prerequisites

### Phase 1 (Complete) — Foundation Dependencies
- [x] FeatureGateGuard supports `@RequiresPack("BASTION")` and `@RequiresModule()`
- [x] License system supports pack gating

### Phase 3 (Complete) — BASTION Infrastructure Dependencies
- [x] Webhook module (`apps/api/src/modules/webhook/`) — production-ready
- [x] Compliance module (`apps/api/src/modules/compliance/`) — pdfkit + Handlebars pattern
- [x] Governance module (`apps/api/src/modules/governance/`) — retention policies
- [x] Analytics service (`apps/api/src/modules/analytics/`) — TimescaleDB aggregates
- [x] Audit module (`apps/api/src/modules/audit/`) — SHA-256 hash-chain
- [x] Recording service (`apps/api/src/modules/recording/`) — retention + cleanup
- [x] Snapshot pipeline — existing `@fastify/static` + correlation snapshots
- [x] Multi-site hierarchy — `parentOrganizationId`, aggregate queries

### Infrastructure Prerequisites
- [ ] TSA service accessible from server (configure `TSA_URL` env var)
- [ ] NAS/external disk accessible via CIFS or NFS from API server
- [ ] Linux utilities: `mount`, `rsync`, `sha256sum`, `zip`, `openssl ts` (all standard on Alpine/Debian)
- [ ] PostgreSQL with TimescaleDB for all new hypertable data (already configured)
- [ ] Redis for BullMQ queues (new queues: `report-generation`, `forensic-certification`)

### Data Migration Prerequisites
- [ ] Existing `RetentionPolicy` records need `siteId` migration (default null = global)
- [ ] Existing `Organization` records get `pseudonymizationEnabled` default = false
- [ ] New Prisma migration for all Phase 4 models

---

## Open Questions (RESOLVED)

1. **TSA provider for forensic evidence** — RESOLVED: Configurable via `TSA_URL` env var. Default to `http://timestamp.digicert.com` (free, RFC 3161 compliant). Organization can override. For offline sites, openssl self-signed timestamps are acceptable for non-legal use (documented limitation).

2. **Face blurring approach for pseudonymization** — RESOLVED: Server-side blur via `sharp` at snapshot retrieval time (D-06). AI Preprocessor optionally stores face bounding boxes in a `face_regions` table so the blur can be region-specific rather than whole-image. Cached blurred versions with TTL to reduce CPU load.

3. **NAS backup protocol choice** — RESOLVED: Use CIFS/SMB v3.0 via Linux `mount.cifs` for initial v1. NFS v4 as secondary option. Both are standard on Alpine Linux and widely compatible with consumer/professional NAS devices (Synology, QNAP, TrueNAS). Authentication via username/password stored in `BackupConfig` (encrypted at rest via `GovernanceService.encrypt()`).

4. **Webhook event type enum location** — RESOLVED: Define in `packages/shared/src/constants/bastion-event-types.ts` as both a string enum and a TypeScript type. Export via `packages/shared/src/index.ts`. Import in both API (for dispatch) and dashboard (for event selector UI).

5. **Subject access portal route design** — RESOLVED: Public route at `/conformite/hapdp/portail`. No auth. Identity verification via email OTP (6-digit code, 15-min TTL). Uses existing notification service. Admin approval workflow for rectification/deletion. Route bypasses `JwtAuthGuard` via `@Public()` decorator.

6. **Retention policy per-site extension** — RESOLVED: Add `siteId` (optional, nullable) to `RetentionPolicy` model. `null` = global policy applies to all sites. Non-null = overrides global for that site. `eventType` already exists on the model. Frontend shows site-specific retention sliders alongside global defaults.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL 16 with TimescaleDB | Data layer, analytics | ✓ (Coolify) | — | — |
| Redis 7 | BullMQ queues | ✓ (Coolify) | — | — |
| Sharp (npm) | Face blurring pseudonymization | Will install | 0.35.3 | Jimp (CPU-only, slower) |
| TSA service | Forensic evidence certification | Depends on deployment | — | Self-signed openssl timestamps |
| mount.cifs | NAS backup | ✓ (Linux kernel) | — | NFS v4 |
| rsync | NAS backup | ✓ (standard Linux) | — | cp + scp |
| openssl ts | TSA client | ✓ (Alpine Docker) | — | Node.js TSA library (fallback) |
| Internet | TSA timestamp certification | Depends on client site | — | Offline mode: self-signed timestamps |

**Missing dependencies with no fallback:**
- None — all key dependencies can be installed or have viable fallbacks

**Missing dependencies with fallback:**
- TSA service — can use local self-signed timestamps for non-legal evidence
- Sharp — Jimp is slower but available as npm fallback

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | JWT auth for all BASTION endpoints. Public route for subject access portal with email OTP. |
| V3 Session Management | Yes | Existing JWT (access + refresh tokens). Subject access portal uses short-lived OTP session. |
| V4 Access Control | Yes | Existing RBAC + `@RequiresPack("BASTION")` + `@Roles()` guard chain. Full-res snapshots gated by SUPERVISOR/ADMIN role. |
| V5 Input Validation | Yes | Zod schemas + `ZodValidationPipe` for all new endpoints. Incoming webhook payload validation. |
| V6 Cryptography | Yes | SHA-256 hash-chain for audit (`AuditService`). HMAC-SHA256 for webhooks. End-to-end evidence hash chain. TSA RFC 3161 for forensic timestamps. |
| V8 Data Protection | Yes | Pseudonymization (face blurring) by default. Subject access portal with identity verification. HAPDP compliance: processing register, consent proof, access traceability. |
| V11 Business Logic | Yes | Subject access request limits. Backup integrity verification. Retention policy conflict detection (global vs per-site). |

### Known Threat Patterns for BASTION Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Subject access portal impersonation | Spoofing | Email OTP + rate limiting (3 req/hr) + admin approval for mutations |
| Pseudonymization bypass | Information Disclosure | `@Roles()` decorator on snapshot endpoints. Full-res gated behind SUPERVISOR/ADMIN. Access logged for traceability. |
| TSA timestamp forgery | Tampering | RFC 3161 protocol includes digital signature from TSA authority. Verifiable independently. |
| NAS backup credential theft | Information Disclosure | Backup credentials encrypted at rest via `GovernanceService.encrypt()` (pgp_sym_encrypt). Only decrypted at execution time. |
| Webhook payload tampering | Tampering | HMAC-SHA256 signing (`WebhookService.signPayload()`). Recipient verifies signature + timestamp. |
| Subject access deletion abuse | Repudiation | All SAR actions logged in audit hash-chain. Admin approval required. Deletion is soft (flagged, not purged). |

---

## Sources

### Primary (HIGH confidence) — Verified via codebase audit

- Codebase: `apps/api/src/modules/compliance/` — Compliance service with pdfkit + Handlebars PDF generation
- Codebase: `apps/api/src/modules/webhook/` — Full webhook dispatch, HMAC signing, BullMQ delivery
- Codebase: `apps/api/src/modules/governance/` — Retention policy CRUD, pruning cron, CSV/PDF export
- Codebase: `apps/api/src/modules/analytics/` — TimescaleDB continuous aggregates, trend queries
- Codebase: `apps/api/src/modules/audit/` — SHA-256 hash-chain audit, query, verifyChain
- Codebase: `apps/api/src/modules/incident/incident.service.ts` — PDF generation reference pattern
- Codebase: `apps/api/src/modules/recording/` — Recording service with retention and storage paths
- Codebase: `apps/api/src/modules/access/access.processor.ts` — Video correlation snapshot pipeline
- Codebase: `apps/api/src/common/decorators/feature-gate.decorator.ts` — `@RequiresPack()`, `@RequiresModule()`
- Codebase: `apps/api/prisma/schema.prisma` — All existing models with retention, webhook, audit structures
- Codebase: `packages/shared/src/` — Shared schemas, types, constants export pattern
- Codebase: `apps/dashboard/components/` — Recharts, motion, glass-card, skeleton patterns
- Codebase: `apps/dashboard/lib/api.ts` — API client pattern with fetchWithAuth
- Context documents: `04-CONTEXT.md`, `04-UI-SPEC.md`
- Context documents: `03-CONTEXT.md`, `03-PATTERNS.md` — Prior phase patterns

### Secondary (MEDIUM confidence) — Verified via npm registry

- Sharp npm: `https://www.npmjs.com/package/sharp` — v0.35.3, 40M weekly downloads
- pdfkit npm: `https://www.npmjs.com/package/pdfkit` — v0.19.1, 5M weekly downloads
- Handlebars npm: `https://www.npmjs.com/package/handlebars` — v4.7.9, 25M weekly downloads
- Recharts npm: `https://www.npmjs.com/package/recharts` — v2.15.1, 7M weekly downloads
- @nestjs/schedule npm: `https://www.npmjs.com/package/@nestjs/schedule` — v6.1.3, 2M weekly downloads

### Tertiary (LOW confidence) — Domain research, not verified in this session

- DigiCert TSA: `http://timestamp.digicert.com` — free RFC 3161 timestamping service
- HAPDP Niger data protection law — `Loi n°2021-003` — equivalent to GDPR. Requirements: declaration to HAPDP authority, processing register, consent, pseudonymization, subject access rights, access traceability.
- CIFS/SMB v3.0 — Standard protocol for NAS mounts on Linux. Supported by Synology, QNAP, TrueNAS, Windows Server.
- RFC 3161 — Internet X.509 Public Key Infrastructure Time-Stamp Protocol (TSP)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Sharp provides sufficient blurring performance at retrieval time without significant latency (target: <100ms per image) | Standard Stack | May need to switch to ingest-time blurring in AI Preprocessor if retrieval-time blur causes noticeable latency |
| A2 | OpenSSL `ts` command is available in the production Docker image (node:20-alpine) | Environment Availability | Alpine may not include openssl by default — may need `apk add openssl` in Dockerfile |
| A3 | `mount.cifs` is available in Docker container or can be added | Environment Availability | Docker containers may need `--privileged` or `SYS_ADMIN` capability for mounting. May need alternative backup approach via `rsync` over SSH instead of direct mount. |
| A4 | Existing TimescaleDB continuous aggregates (`zone_analytics_hourly`, `site_analytics_daily`) query patterns work with 1yr+ data volumes | Risks | May need additional monthly/yearly rollup aggregates for long-term trend queries |
| A5 | DigiCT TSA server is reachable from Niger/West Africa client deployments | Risks | May need alternative TSA provider with better African connectivity |
| A6 | The existing `@Public()` decorator properly bypasses the full guard chain for the subject access portal | Architecture | Need to verify that `@Public()` at the handler level bypasses all guards including `TenantIsolationGuard` |
| A7 | The existing `WebhookSubscription` model's `eventType` field (String) can accommodate the BASTION event type enum without schema changes | Standard Stack | If schema change is needed, add an enum or migration. Currently String field is flexible. |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in codebase package.json or npm registry. Sharp is industry standard.
- Architecture: HIGH — all patterns verified via codebase audit. Prior phase patterns directly applicable.
- Pitfalls: MEDIUM — deployment-specific issues (TSA availability, NAS connectivity, blur performance) documented but not verified against this specific environment.
- HAPDP compliance: MEDIUM — requirements based on documented HAPDP law (Loi n°2021-003) but domain expertise not verified against Niger HAPDP authority's latest guidance.

**Research date:** 2026-07-18
**Valid until:** 2026-08-18 (stable ecosystem, packages don't change rapidly)
