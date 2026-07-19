# Milestones

## v1.0 Minimum Commercial Product (Shipped: 2026-07-19)

**Phases completed:** 5 phases, 27 plans, 69 tasks

**Key accomplishments:**

- Prisma models for 7 VISION entities, extended Camera model, companion Zod schemas and TypeScript types in shared package
- insightface CPU-only face recognition with whitelist matching, histogram-based night vision enhancement, and supervision PolygonZone geofencing with temporal smoothing integrated into the existing YOLOv12 detection pipeline
- NestJS API backend modules for detection zone CRUD, face whitelist management with max-50 enforcement, ONVIF discovery endpoint, and camera substream/subsettings
- One-liner:
- Recording pipeline (HLS + retention + clip export), stream share tokens, event timeline search API, and VISION multi-user limit enforcement
- Complete dashboard UI for camera live view with responsive grid, ONVIF camera discovery, polygon detection zone drawing, per-camera sensitivity controls, and face whitelist management with drag-drop upload
- Timeline filter bar, clip export, recording config, stream sharing, geofencing, DND, alert channels, multi-user invite, DDNS guide — 8 new components across 6 settings pages
- Mobile VISION screens: live camera viewer with pinch-to-zoom/double-tap fullscreen, event timeline with filters, face upload from camera/gallery, share link receiver, and arm/disarm toggle with WiFi geofencing
- BASTION AI Preprocessor pipeline with weapon detection, abandoned object detection, crowd counting, zone intrusion/loitering analysis, and face recognition with anti-spoofing, blacklist matching, and configurable risk scoring (0-100)
- Prisma schema extended with BASTION models (Face, AccessGroup, CredentialSiteAccess), FINGERPRINT/FACE credential types, GLOBAL_ADMIN/SITE_ADMIN roles, multi-site Organization hierarchy, Qdrant 512-d faces collection with upsert/search/delete methods
- Complete NestJS backend API implementation for BASTION: face enrollment/blacklist pipeline, FINGERPRINT/FACE credential types, access groups, video correlation, schedules, multi-site hierarchy with aggregate KPI, extended TenantIsolationGuard, and license maxSites enforcement
- Complete dashboard UI implementation for BASTION multi-site management: aggregate KPI dashboard, site CRUD with drill-down, cross-site comparison, hierarchical RBAC editor with permission matrix, SAML/OIDC SSO configuration form, inter-site sync status page, and Cmd+K global search across all sites.
- Extended face management (unlimited BASTION faces, blacklist, risk scores, passage history) and access control management UI (credential creation for all types, groups, schedules, event timeline with video correlation)
- Mobile face enrollment with camera capture, site switcher, access event timeline, and integration test suites for the BASTION detection pipeline, API, and multi-site services
- 7 new Prisma models, 3 new Zod schema files, 3 new TypeScript types files, BASTION_EVENT_TYPES constant, BASTION_MODULE_KEYS, sharp-based face blurring pseudonymization interceptor
- BASTION analytics KPIs, trend queries, advanced search, CSV export, and async weekly/monthly PDF report generation via BullMQ with webhook dispatch
- HAPDP declaration PDF, consent signage PDF, processing register auto-population with CSV/PDF export, and subject access portal with 6-digit OTP identity verification
- Per-site/per-event retention policies, RFC 3161 TSA-certified forensic evidence export, and cron-driven NAS auto-backup with integrity verification
- Enhanced analytics dashboard with KPI grid, trend charts, export, report scheduling, HAPDP compliance 6-step wizard, subject access OTP portal, processing register, and access traceability log
- Storage & Archiving Dashboard UI — retention configuration, forensic evidence export modal, and NAS backup management page
- IntegrationsModule (fire alarm + BMS webhooks), enriched Swagger + PDF API guide, webhook dispatch extension, dashboard settings UI for API tokens/webhooks/integrations, and Phase 4 sidebar wiring
- vault-app Prisma models for usage reporting and update releases, 4 API endpoints for data ingestion/admin display, and vault-os cron extension to push usage data and check updates during existing license verification cycle
- VISION/BASTION pricing tiers with FCFA prices, 6 blog posts (3 EN + 3 FR), 2 French case studies, and working contact form backend integration
- Usage Dashboard for vault-app admin portal: KPI cards, per-client sortable table with drill-down, SVG trend charts, CSV export, and sidebar navigation
- 5 technical documentation articles (EN + FR), Crisp chat widget, and support page with SLA commitments on vault-app
- Training slide deck, session checklist, vault-app updates CRUD API, vault-os SystemModule with update-available dashboard banner

---
