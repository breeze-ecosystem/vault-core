# Requirements: Oversight Hub v2.0

**Defined:** 2026-07-15
**Core Value:** Correlate every physical security event with video evidence and AI analysis in real time, so security operators know what happened, where, and what to do — without switching between disconnected systems.

## v1.0 Shipped

v1.0 delivered the technical foundation (15 plans, 3 phases). All v1.0 requirements below are shipped and validated.

- Access Control (ACC-01 to ACC-07), Door Management (DOOR-01 to DOOR-06), Video Event Correlation (VEC-01 to VEC-05), Tailgating detection (AI-04), Audit logs (AUDT-01 to AUDT-03), Camera management, AI frame analysis, Auth/RBAC, Notifications, Edge agent, Multi-site

## v2.0 Requirements

Requirements for the commercial SaaS platform, organized by capability block.

### Commercial Foundation (FND)

- [x] **FND-01**: Platform supports multi-tenant architecture with `Organization` model and PostgreSQL row-level security
- [x] **FND-02**: All existing modules auto-scope queries to current tenant via Prisma Client Extensions
- [x] **FND-03**: User can belong to multiple organizations with different roles in each
- [x] **FND-04**: JWT token carries `organizationId` + `permissions[]` for tenant-scoped authorization
- [x] **FND-05**: Admin can invite users to their organization via email with expiring tokens
- [x] **FND-06**: Audit logs are hash-chained per tenant with cryptographic integrity verification
- [x] **FND-07**: Feature gates control feature availability per license tier

### Billing & Subscriptions (BIL)

- [ ] **BIL-01**: Platform supports tiered subscription plans via Stripe (Free, Professional, Enterprise)
- [ ] **BIL-02**: Customer can subscribe via Stripe Checkout with plan selection
- [ ] **BIL-03**: Customer can manage subscription (upgrade, downgrade, cancel) via Stripe Customer Portal
- [ ] **BIL-04**: System handles subscription lifecycle via Stripe webhooks (created, updated, cancelled, trial ending)
- [ ] **BIL-05**: System handles payment failures with retry logic and dunning notifications
- [ ] **BIL-06**: Customer can pay via international methods through PayPal integration
- [ ] **BIL-07**: Admin can view billing history, invoices, and payment status in dashboard
- [ ] **BIL-08**: System provisions and activates license automatically on successful subscription

### Licensing (LIC)

- [ ] **LIC-01**: Platform generates crypto-signed JWT license keys bound to a specific organization
- [ ] **LIC-02**: License key carries device limits (cameras, doors, users) and feature flags
- [ ] **LIC-03**: License enforces device/user limits — stops accepting new cameras/doors/users when limit reached
- [ ] **LIC-04**: License supports offline validation with periodic re-check and configurable grace period
- [ ] **LIC-05**: Admin can upload/activate license key via dashboard UI
- [ ] **LIC-06**: System shows license status, expiry, usage, and limits in admin dashboard
- [ ] **LIC-07**: License revocation immediately disables organization access after grace period

### Premium UI/UX (UIX)

- [ ] **UIX-01**: Design system built with Radix Themes + Tailwind CSS, shared across Dashboard and Mobile
- [ ] **UIX-02**: Dashboard has premium 2026 visual design — dark-first, glassmorphism accents, fluid animations
- [ ] **UIX-03**: Dashboard uses `motion` for page transitions, micro-interactions, and scroll reveals
- [ ] **UIX-04**: Mobile app has premium guard-first design — simplified navigation, quick actions, offline mode
- [ ] **UIX-05**: Design system includes dark/light mode toggle with system preference detection
- [ ] **UIX-06**: All existing Dashboard pages get the new design system applied (not rewritten — system upgrade)
- [ ] **UIX-07**: Top 3 highest-traffic pages (Overview, Cameras, Alerts) get full premium redesign with custom layouts

### Public Website (WEB)

- [ ] **WEB-01**: Marketing landing page with product presentation, features, and hero section
- [ ] **WEB-02**: Pricing page with plan comparison, feature matrix, and Stripe checkout links
- [ ] **WEB-03**: Blog with MDX content (velite) — changelog, security insights, product updates
- [ ] **WEB-04**: Multi-language support via `next-intl` — French (primary), English, Spanish, German, Japanese, Arabic
- [ ] **WEB-05**: SEO optimization with meta tags, OG images, JSON-LD, sitemap, and robots.txt
- [ ] **WEB-06**: Contact/demo request form with email notification
- [ ] **WEB-07**: Website shares design system with dashboard for visual consistency
- [ ] **WEB-08**: Responsive design across desktop, tablet, and mobile

### Deep Feature Rebuild (FTR)

- [ ] **FTR-01**: Access control module refactored with production-grade error handling, loading states, and edge cases
- [ ] **FTR-02**: Door state machine hardened — sequence validation, deduplication, configurable thresholds per door
- [ ] **FTR-03**: Visitor management deepened — host approval workflow, timed passes, check-in kiosk mode, badge printing
- [ ] **FTR-04**: Incident management rebuilt — triage, SLA timers, escalation chains, evidence auto-bundle, closure reports
- [ ] **FTR-05**: ANPR/LPR deepened — plate recognition with confidence scoring, allowlist/blocklist, vehicle-event correlation
- [ ] **FTR-06**: Security analytics dashboard with per-zone metrics, trend graphs, heatmaps, and anomaly visualization
- [ ] **FTR-07**: Equipment health monitoring with predictive degradation alerts and per-site health scores
- [x] **FTR-08**: AI assistant supports natural language queries ("show intrusions on Site A after 8pm")
- [x] **FTR-09**: System auto-generates incident summaries with time, location, persons, video, and recommended actions
- [x] **FTR-10**: Per-zone dynamic risk scoring (0-100) from recent events, anomalies, and door states
- [x] **FTR-11**: System detects recurring situations (false positives, schedule mismatches, impossible travel)

### Enterprise Features (ENT)

- [ ] **ENT-01**: SSO/SAML authentication for Enterprise tier via organization-level IdP configuration
- [ ] **ENT-02**: Compliance report generation (SOC 2, ISO 27001) with PDF export
- [ ] **ENT-03**: Data retention policy configuration per event type with auto-pruning
- [ ] **ENT-04**: Public REST API with tenant-scoped API keys and rate limiting
- [ ] **ENT-05**: Webhook delivery for events with retry logic and delivery logs
- [ ] **ENT-06**: OpenAPI/Swagger documentation for public API endpoints
- [ ] **ENT-07**: Multi-currency billing support (USD, EUR, XOF, GBP, JPY)
- [ ] **ENT-08**: Unified command center — live camera grid, door states, alerts, incidents in single view
- [ ] **ENT-09**: Guard-first mobile workflows — NFC badge validation, QR check-in, incident photo capture, door remote control

## v2.1 Requirements (Deferred)

Deferred to future release after v2.0 ships.

- **OFF-01**: Offline license activation for fully air-gapped deployments
- **OFF-02**: Custom AI model configuration per tenant
- **OFF-03**: Integrations marketplace with developer portal
- **OFF-04**: Advanced biometric modalities (fingerprint, iris)
- **OFF-05**: Automated mustering and evacuation workflows
- **OFF-06**: Mobile SDK for third-party app integration
- **OFF-07**: End-to-end encrypted video streaming with per-viewer keys

## Out of Scope

| Feature | Reason |
|---------|--------|
| Facial recognition for surveillance | GDPR/BIPA/CCPA regulatory risk; face unlock for access control only |
| Cloud-hosted video storage | Differentiator is self-hosted; hosting video requires massive infrastructure |
| Custom hardware manufacturing | Software platform only; integrate via standard protocols (Wiegand, OSDP, ONVIF) |
| SOC-as-a-service (human monitoring) | Operational business, not software; integrate via webhooks to third-party SOCs |
| Blockchain-based audit verification | Hash-chain audit logs already provide tamper evidence without blockchain overhead |
| In-app chat messaging between operators | Existing tools (Slack/Teams) already cover this; webhook integrations instead |
| Real-time GPS vehicle tracking | Battery drain, privacy concerns; guard check-in with location snapshot is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 4: Commercial Foundation | Complete |
| FND-02 | Phase 4: Commercial Foundation | Complete |
| FND-03 | Phase 4: Commercial Foundation | Complete |
| FND-04 | Phase 4: Commercial Foundation | Complete |
| FND-05 | Phase 4: Commercial Foundation | Complete |
| FND-06 | Phase 4: Commercial Foundation | Complete |
| FND-07 | Phase 4: Commercial Foundation | Complete |
| BIL-01 | Phase 5: Monetization | Pending |
| BIL-02 | Phase 5: Monetization | Pending |
| BIL-03 | Phase 5: Monetization | Pending |
| BIL-04 | Phase 5: Monetization | Pending |
| BIL-05 | Phase 5: Monetization | Pending |
| BIL-06 | Phase 5: Monetization | Pending |
| BIL-07 | Phase 5: Monetization | Pending |
| BIL-08 | Phase 5: Monetization | Pending |
| LIC-01 | Phase 5: Monetization | Pending |
| LIC-02 | Phase 5: Monetization | Pending |
| LIC-03 | Phase 5: Monetization | Pending |
| LIC-04 | Phase 5: Monetization | Pending |
| LIC-05 | Phase 5: Monetization | Pending |
| LIC-06 | Phase 5: Monetization | Pending |
| LIC-07 | Phase 5: Monetization | Pending |
| UIX-01 | Phase 6: Premium Experience | Pending |
| UIX-02 | Phase 6: Premium Experience | Pending |
| UIX-03 | Phase 6: Premium Experience | Pending |
| UIX-04 | Phase 6: Premium Experience | Pending |
| UIX-05 | Phase 6: Premium Experience | Pending |
| UIX-06 | Phase 6: Premium Experience | Pending |
| UIX-07 | Phase 6: Premium Experience | Pending |
| WEB-01 | Phase 7: Public Presence | Pending |
| WEB-02 | Phase 7: Public Presence | Pending |
| WEB-03 | Phase 7: Public Presence | Pending |
| WEB-04 | Phase 7: Public Presence | Pending |
| WEB-05 | Phase 7: Public Presence | Pending |
| WEB-06 | Phase 7: Public Presence | Pending |
| WEB-07 | Phase 7: Public Presence | Pending |
| WEB-08 | Phase 7: Public Presence | Pending |
| FTR-01 | Phase 8: Feature Deepening | Pending |
| FTR-02 | Phase 8: Feature Deepening | Pending |
| FTR-03 | Phase 8: Feature Deepening | Pending |
| FTR-04 | Phase 8: Feature Deepening | Pending |
| FTR-05 | Phase 8: Feature Deepening | Pending |
| FTR-06 | Phase 8: Feature Deepening | Pending |
| FTR-07 | Phase 8: Feature Deepening | Pending |
| FTR-08 | Phase 9: AI Intelligence | Complete |
| FTR-09 | Phase 9: AI Intelligence | Complete |
| FTR-10 | Phase 9: AI Intelligence | Complete |
| FTR-11 | Phase 9: AI Intelligence | Complete |
| ENT-01 | Phase 10: Enterprise Grade | Pending |
| ENT-02 | Phase 10: Enterprise Grade | Pending |
| ENT-03 | Phase 10: Enterprise Grade | Pending |
| ENT-04 | Phase 10: Enterprise Grade | Pending |
| ENT-05 | Phase 10: Enterprise Grade | Pending |
| ENT-06 | Phase 10: Enterprise Grade | Pending |
| ENT-07 | Phase 10: Enterprise Grade | Pending |
| ENT-08 | Phase 10: Enterprise Grade | Pending |
| ENT-09 | Phase 10: Enterprise Grade | Pending |

**Coverage:**
- v2.0 requirements: 57 total
- Mapped to phases: 57
- Unmapped: 0 

---
*Requirements defined: 2026-07-15*
*Last updated: 2026-07-15 after v2.0 milestone research*
