# Phase 4: BASTION Enterprise - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete all BASTION enterprise features: HAPDP compliance, reports & analytics, advanced storage/archiving, API documentation, webhooks, and third-party integrations (fire alarm, BMS). These are the additive enterprise capabilities on top of the BASTION foundation (Phase 3).

**Five sub-domains:**
1. **Reports & Analytics** (BAS-20 to BAS-24) — weekly/monthly PDF reports, real-time analytics dashboard with KPIs/charts, advanced search, CSV/PDF export
2. **HAPDP Compliance** (BAS-30 to BAS-35) — assisted declaration wizard, processing register, consent signage, pseudonymization, subject access portal, access traceability
3. **Advanced Storage & Archiving** (BAS-25 to BAS-29) — unlimited capacity, per-site/per-event retention (30d-1yr+), forensic evidence with certified timestamp, RAID documentation, auto-backup
4. **API & Webhooks** (BAS-41, BAS-42) — documented REST API, webhook event dispatch
5. **Third-party Integrations** (BAS-43, BAS-44) — fire alarm + BMS entry webhooks with video correlation

**Requirements:** BAS-20 to BAS-29, BAS-30 to BAS-35, BAS-41 to BAS-44

</domain>

<decisions>
## Implementation Decisions

### Reports & Analytics (BAS-20 to BAS-24)
- **D-01:** **Hybrid report format.** Executive visual summary (charts + KPIs) at front, detailed data tables with incident IDs and evidence references in appendix. Meets both executive readability and audit requirements. Auto-email delivery (weekly/monthly) + manual download from dashboard. Uses existing pdfkit + Handlebars pipeline (see `incident.service.ts`).
- **D-02:** **Top 5 KPIs on analytics dashboard.** Incidents today, active alerts, cameras online, storage used, entries today. Trend charts below (7d/30d line charts). Advanced search with filters: date range, site, event type, person. Export to CSV and PDF. Uses existing Recharts + TimescaleDB analytics pipeline.
- **D-03:** **Recharts for all analytics charts.** Already present in dashboard (`donut-chart.tsx`, `cross-site-comparison.tsx`). Reuse for analytics dashboard. Real-time via Socket.IO or periodic refresh (planner decides).

### HAPDP Compliance (BAS-30 to BAS-35)
- **D-04:** **Single "Conformité HAPDP" module.** One menu entry in dashboard with step-by-step assistant wizard. All 6 features in one place:
  1. **Assisted declaration** — wizard auto-fills client info, generates ready-to-submit PDF
  2. **Processing register** — auto-populated from system activity, CSV/PDF export
  3. **Consent signage** — generates timestamped PDF proof for camera signage, print-ready
  4. **Pseudonymization** — sensitive data (faces, names) masked by default in UI/API responses
  5. **Subject access portal** — self-service for data subjects: view/rectify/delete personal data
  6. **Access traceability** — audit log of who viewed what and when (extends existing hash-chain audit)
- **D-05:** **Extend existing compliance module.** Module at `apps/api/src/modules/compliance/` already has PDF generation with pdfkit+Handlebars. Extend for HAPDP-specific content. Compliance service already generates SOC 2 reports — HAPDP is a parallel track with different content.
- **D-06:** **Pseudonymization at data layer.** Faces blurred in snapshots by default when served via API. Full resolution available with explicit role (ADMIN, SUPERVISOR) and logged access.

### Advanced Storage & Archiving (BAS-25 to BAS-29)
- **D-07:** **RAID: documentation only.** Software RAID (mdadm) configuration documented in installation guide. No auto-detection or UI alert. BASTION server hardware guide covers recommended RAID levels (1/5/10).
- **D-08:** **Forensic evidence with TSA timestamp.** Export ZIP/video clip signed with digital signature + certified timestamp (Time-Stamp Authority/TSA). Uses existing governance module for retention policy configuration (per-site, per-event-type). Retention configurable 30d to 1yr+ via UI.
- **D-09:** **Auto-backup to NAS.** Scheduled backup (daily/weekly configurable) to secondary NAS or external disk. Integrity verification after each backup. Configuration in dashboard settings.

### API & Webhooks (BAS-41, BAS-42)
- **D-10:** **Swagger enriched + PDF integration guide.** Full request/response examples in Swagger UI. Generated PDF guide with authentication flow, endpoint reference, and integration patterns.
- **D-11:** **Webhook module already exists.** `apps/api/src/modules/webhook/` is production-ready: subscription CRUD, HMAC-SHA256 signing, URL validation (HTTPS required, blocks private IPs), BullMQ delivery with exponential backoff (6 retries max), Socket.IO gateway for delivery events. Extend dispatch coverage to all BASTION event types (alerts, access events, AI detections, compliance events).

### Third-party Integrations (BAS-43, BAS-44)
- **D-12:** **Entry webhooks for fire alarm + BMS.** Each integration exposes an incoming webhook endpoint. System accepts JSON payload, correlates with video (snapshot from nearest camera), generates alert. Templates documented with examples — no per-client custom code for v1.
- **D-13:** **Alert correlation model.** Fire alarm/BMS event → resolve nearest camera(s) → capture snapshot + 10s video clip → create alert in alert system → notify operators. Reuses existing snapshot pipeline from access control correlation (Phase 3 D-26).
- **D-14:** **BMS integration scope limited.** HVAC (temperature alarm), lighting (emergency mode), access (fire door release). Event-based only — no bidirectional control for v1.

### the agent's Discretion
- Exact Swagger descriptions and PDF guide content
- Email template design for report delivery
- Dashboard UI for retention policy management, analytics charts, HAPDP wizard steps
- TSA provider choice and timestamp format for forensic evidence
- Backup scheduling implementation and NAS connectivity approach
- Webhook event type enumeration for BASTION coverage

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` §Phase 4 — Phase goal, success criteria (5 items), 20 BASTION Enterprise requirements
- `.planning/REQUIREMENTS.md` — BAS-20 to BAS-35, BAS-41 to BAS-44 full spec
- `.planning/STATE.md` — Current project state

### Pricing & Feature Matrix
- `docs/PRICING-SPEC.md` §4.4 to §4.8 — BASTION enterprise feature details: reports (B25-B29), storage (B30-B34), HAPDP (B35-B40), API (B46-B49)

### Prior Phase Context
- `.planning/phases/01-architecture-license-foundation/01-CONTEXT.md` — Feature gates, pack+module model, RSA signing, guard chain
- `.planning/phases/02-vision-pack/02-CONTEXT.md` — AI pipeline, Hermes Agent, geofencing, notification channels
- `.planning/phases/03-bastion-ai-access-control/03-CONTEXT.md` — Multi-site hierarchy, decoupled cameras, analytics pipeline, webhook module reference

### Existing Code Assets
- `apps/api/src/modules/compliance/` — Compliance module with PDF generation (pdfkit + Handlebars). Extend for HAPDP.
- `apps/api/src/modules/webhook/` — Full webhook module (subscription CRUD, HMAC signing, BullMQ delivery, Socket.IO gateway). Already production-ready.
- `apps/api/src/modules/governance/` — Retention policies, pruning processor (retention-pruning queue). Extend for per-site/per-event config.
- `apps/api/src/modules/analytics/analytics.service.ts` — TimescaleDB continuous aggregates for zone/site analytics
- `apps/api/src/modules/recording/` — Recording service with retention, storage paths, cleanup scheduler
- `apps/api/src/modules/incident/incident.service.ts` — PDF report generation with pdfkit + Handlebars (reference pattern)
- `apps/dashboard/components/donut-chart.tsx` — Recharts pie chart component
- `apps/dashboard/components/cross-site-comparison.tsx` — Existing cross-site chart component
- `apps/dashboard/components/multi-site-dashboard.tsx` — KPI grid pattern
- `apps/api/src/modules/audit/` — SHA-256 hash-chain audit (basis for access traceability)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Compliance module** (`apps/api/src/modules/compliance/`) — SOC 2 PDF reports with pdfkit+Handlebars. HAPDP module extends this pattern with HAPDP-specific content.
- **Webhook module** (`apps/api/src/modules/webhook/`) — Full production-ready webhook system: subscription CRUD, HMAC-SHA256 signing, URL safety validation, BullMQ delivery with exponential backoff, Socket.IO gateway. Already 80% of BAS-42.
- **Governance module** (`apps/api/src/modules/governance/`) — Retention policy CRUD, pruning processor, export PDF/CSV. Extend for per-site retention config.
- **Analytics service** (`apps/api/src/modules/analytics/analytics.service.ts`) — TimescaleDB continuous aggregates for zone/site analytics. Used by multi-site dashboard.
- **Recording service** (`apps/api/src/modules/recording/`) — Configurable retention (7/15/30d), storage path, daily cleanup. Extend for 30d-1yr+ BASTION retention.
- **Incident report generation** (`apps/api/src/modules/incident/incident.service.ts`) — PDF generation with pdfkit + Handlebars templates. Reference pattern for weekly/monthly BASTION reports.
- **Recharts components** (`apps/dashboard/components/donut-chart.tsx`, `cross-site-comparison.tsx`) — Chart building blocks for analytics dashboard.
- **KPI grid pattern** (`apps/dashboard/components/multi-site-dashboard.tsx`) — Reusable KPI card layout.
- **Audit module** (`apps/api/src/modules/audit/`) — Hash-chain audit log. Basis for access traceability (BAS-35) and subject access requests.
- **Snapshot pipeline** — Existing snapshot capture on denied/forced access (Phase 3 D-26). Reuse for fire alarm/BMS video correlation.

### Established Patterns
- **PDF generation**: pdfkit + Handlebars HTML-to-PDF pipeline (see compliance.service.ts, incident.service.ts)
- **BullMQ queues**: Async processing for report generation, evidence export, webhook delivery
- **Guard chain**: JwtAuthGuard → TenantIsolationGuard → RolesGuard → FeatureGateGuard. All new endpoints follow.
- **Auth audit**: `@Audited()` decorator on compliance-sensitive operations (subject access, pseudonymization access)
- **Feature gating**: BASTION sub-features gated by `@RequiresFeature()` — all Phase 4 features are BASTION-only
- **Dashboard pages**: App Router with route groups. Analytics and HAPDP pages follow existing patterns.

### Integration Points
- **Webhook dispatch** → Extend `WebhookService.dispatch()` to cover all BASTION event types. Add event type enum extension.
- **Retention config** → Extend governance module for per-site and per-event-type retention (separate from VISION's global retention).
- **Analytics dashboard** → New route group `app/(dashboard)/analytics/`. Uses Recharts + existing analytics service APIs.
- **HAPDP module** → New route group `app/(dashboard)/conformite/hapdp/`. Wizard-style multi-step UI. PDF generation via compliance service.
- **Subject access portal** → New `/api/compliance/subject-access` endpoints. Public route with identity verification (email + code).
- **Fire alarm/BMS** → New endpoint in integration module (or extend webhook module for incoming webhooks). Video correlation via existing snapshot pipeline.
- **Forensic evidence** → Timestamp certification as new step in export pipeline. Could use existing BullMQ queue or new queue.
- **Auto-backup** → New scheduled task via `@nestjs/schedule`. Integration with recording service for source data.

</code_context>

<specifics>
## Specific Ideas

- HAPDP est l'équivalent nigérien du RGPD — le module doit être simple et guidant car les clients BASTION ne sont pas des experts RGPD
- Les rapports hybrides (visuel + tableaux) permettent d'être utiles à la fois pour les réunions de direction et pour les audits de conformité
- Le webhook entrant pour alarme incendie/BMS est délibérément simple (JSON en entrée) pour éviter la complexité MQTT/Modbus en v1
- La preuve judiciaire avec timestamp TSA donne une valeur ajoutée forte par rapport aux concurrents (Hikvision/Dahua n'ont pas ça)
- Le portail d'accès sujet (BAS-34) est obligatoire HAPDP — doit permettre à une personne physique de demander ses données, les rectifier ou les supprimer. C'est une route publique avec vérification d'identité.
- La pseudonymisation (BAS-33) est active par défaut : les visages dans les snapshots sont floutés sauf si l'utilisateur a le rôle SUPERVISOR ou ADMIN

</specifics>

<deferred>
## Deferred Ideas

- **BMS bidirectional control** (envoyer des commandes au BMS) — Phase future. V1 se limite aux événements entrants.
- **Modbus/MQTT direct pour incendie/BMS** — Si les clients demandent, on pourra ajouter. Pour v1, webhooks suffisent.
- **API SDK / client library** — Collection Postman ou SDK client (Python/JS) — pourrait être un module optionnel BASTION additionnel.
- **Heatmaps d'analyse prédictive** — C'est un module optionnel BASTION séparé (analyse prédictive à 2M FCFA). Pas dans v1 sauf si explicitement commandé.

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 4-BASTION Enterprise*
*Context gathered: 2026-07-18*
