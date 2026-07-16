# Phase 10: Enterprise Grade - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform Oversight Hub from a technical platform into an enterprise-grade product that large organizations can integrate into their infrastructure. This phase delivers single sign-on (SAML/OIDC), compliance reporting (SOC 2, ISO 27001, access review), a tenant-scoped public REST API with versioned endpoints, webhook subscriptions with retry and HMAC signing, multi-currency license pricing, white labeling, and the guard-first mobile workflow foundations.

**Key constraint:** Each customer self-hosts their own instance. There is no multi-tenant SaaS signup — one organization per deployment. SSO, API keys, webhooks, and retention policies are all instance-level configuration.

Covers ENT-01 through ENT-09. Depends on Phase 5 (license system, API key infrastructure, enterprise feature gating), Phase 8 (stabilized modules for API surface), and Phase 9 (AI command center, SSE streaming).

Phase 8 (Feature Deepening) is planned but not yet started — the modules to be exposed via the public API may still be evolving. The public API surface should target the stabilized post-Phase-8 endpoints but can be scoped to the current post-Phase-9 state for initial delivery.
</domain>

<decisions>
## Implementation Decisions

### SSO/SAML Integration (ENT-01)
- **D-01:** Both SAML 2.0 + OIDC protocols. Maximum enterprise compatibility — SAML for Azure AD, Okta, Ping, OneLogin; OIDC for Google Workspace, Auth0, Keycloak.
- **D-02:** Just-in-time provisioning — user account auto-created on first SSO login. Role assigned from IdP group/attribute mapping. No manual pre-provisioning required.
- **D-03:** IdP configuration via dashboard settings page (not env vars). Admin configures metadata URL, entity ID, certificate, and attribute mappings through UI.
- **D-04:** SSO-first login page with local email/password fallback for break-glass admin access. Once SSO is configured, users see "Sign in with SSO" prominently, but local login remains available.
- **D-05:** SSO authenticates → platform issues its own JWT pair (access + refresh). IdP assertion is not passed through to API. Existing JWT-based auth system is unchanged — SSO is just an alternative auth entry point.
- **D-06:** Certificate management via dashboard: admin can paste IdP metadata URL for auto-fetch, or manually upload certificates. Both paths supported.

### Public REST API (ENT-04, ENT-06)
- **D-07:** URL path versioning: `/api/v1/*` for public endpoints. Separate from internal `/api/*` used by Dashboard/Mobile. Caddy routes both under the same API service.
- **D-08:** New `TenantApiKey` model (separate from existing `LicenseApiKey`). Different lifecycle: named keys, per-key rate limits, scoped permissions, key prefix (e.g., `osk_`). LicenseApiKey remains for admin license generation only.
- **D-09:** Curated endpoint surface: Cameras (read), Doors (read + control), Alerts (read + acknowledge), Incidents (read + status update), Events (read/search), Audit (read-only). NOT exposed: user management, org settings, billing, feature gates, license management.
- **D-10:** Per-key rate limiting with role-based defaults (1000 req/min ADMIN keys, 300 req/min others). Standard `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers on all responses.
- **D-11:** Swagger/OpenAPI documentation at `/api/docs/v1` for public API, separate from internal `/api/docs`. API key auth scheme documented in OpenAPI spec.

### Webhook Architecture (ENT-05)
- **D-12:** Per-event-type subscriptions. Admin creates subscriptions for specific event types (alert.created, incident.escalated, door.forced, etc.) each with its own target URL and signing secret.
- **D-13:** At-least-once delivery with BullMQ-backed exponential backoff: immediate → 1min → 5min → 15min → 1hr → 24hr (6 attempts max). Idempotency key (`X-Webhook-Id`) in header for receiver-side dedup.
- **D-14:** HMAC-SHA256 signing per subscription. Each subscription gets a unique signing secret. `X-Webhook-Signature` header with `t=timestamp,v1=signature` format. Industry standard (Stripe/GitHub pattern).
- **D-15:** Full delivery dashboard: all delivery attempts visible with status codes, response bodies, timestamps, retry counts. Filterable by subscription, status, date range. Manual retry button per failed delivery.

### Multi-Currency (ENT-07)
- **D-16:** License pricing in multiple currencies on the Oversight Hub admin side. Admin selects currency (USD, EUR, XOF, GBP, JPY) when generating a license. License JWT carries a `currency` field.
- **D-17:** Admin-side only — currency is set during license generation. The customer's self-hosted instance displays what the license JWT says. No exchange rate API, no customer-side currency conversion.

### Compliance Reporting (ENT-02, ENT-03)
- **D-18:** Reuse existing PDFKit + Handlebars stack from incident closure reports. Create compliance-specific Handlebars templates for SOC 2, ISO 27001, and Access Review reports. No new dependencies.
- **D-19:** Three report types at launch: SOC 2 evidence package, ISO 27001 compliance summary, periodic access review (who has access to what, role assignments, last activity).
- **D-20:** Retention policies stay global (equivalent to org-scoped since self-hosted = one org per instance). Add data classification labels: PII, security, audit, operational. Per-classification retention rules. Existing `GovernanceService` extended — no new module.
- **D-21:** Pre-purge export option + auto-delete. Admin configures per-policy: export archive before purge (PDF/CSV, stored as downloadable file) and/or auto-delete. Audit event logged for every purge operation.

### White Labeling (custom_branding feature flag)
- **D-22:** Logo upload + primary color + app name customization. Configurable via organization settings dashboard. Applied to: dashboard header, login page, PDF report headers. The `custom_branding` feature flag (ENTERPRISE tier, already in `FeatureGateService`) gates this.

### Agent Discretion
- Exact SAML library choice — `passport-saml` (or `@node-saml/node-saml`) for SAML 2.0, `openid-client` for OIDC. Follow existing Passport strategy patterns from `apps/api/src/modules/auth/strategies/`.
- `TenantApiKey` model schema: id, name, keyHash (SHA-256), keyPrefix, scopes (JSON array of permission strings), rateLimit (rpm), organizationId, createdById, isActive, lastUsedAt, expiresAt, revokedAt.
- `WebhookSubscription` model schema: id, eventType, targetUrl, signingSecret (encrypted at rest), isActive, organizationId, createdById.
- `WebhookDelivery` model schema: id, subscriptionId, eventType, payload (JSON), statusCode, responseBody, attemptNumber, nextRetryAt, organizationId, timestamps. BullMQ `webhook-delivery` queue handles retry schedule.
- IdP configuration model: `IdpConfig` table per organization — protocol (saml/oidc), metadataUrl, entityId, certificate, attributeMappings (JSON), isActive, ssoEnforced (boolean).
- Compliance report template design — follow existing incident report pattern: Handlebars `.hbs` template compiled at runtime, PDFKit generates structured document, served as `application/pdf` blob download.
- Data classification implementation — enum on relevant models or a `data_classification` column. Policy engine in GovernanceService matches classification to retention rules.
- White label implementation — `Organization` model extended with `logoUrl`, `primaryColor`, `displayName` fields. Dashboard reads from org context.
- Command Center (ENT-08) — Phase 9 built AI-chat-centric command center. Full unification with real-time WebSocket feed, map view, and customizable layouts left to agent for planning decision.
- Guard mobile workflows (ENT-09) — NFC badge validation, QR check-in, incident photo capture, door remote control. Mobile patterns exist (incidents tab, offline queue, `expo-secure-store`). Library selection (`expo-camera`, `expo-barcode-scanner`, `react-native-nfc-manager`) left to agent.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Definition
- `.planning/ROADMAP.md` — Phase 10 definition, ENT-01 to ENT-09 requirements, success criteria, dependencies on Phase 5/8/9
- `.planning/REQUIREMENTS.md` — Full requirement text for ENT-01 through ENT-09
- `.planning/PROJECT.md` — Project constraints, key decisions, tech stack boundaries, v2.0 approach
- `.planning/STATE.md` — Current phase status, accumulated decisions, known blockers

### Prior Phase Decisions
- `.planning/phases/05-monetization/05-CONTEXT.md` — D-03: Licenses generated via admin dashboard; D-04: API keys for programmatic license generation; D-06-08: License JWT claims structure; D-13: RSA key pair for signing. Pure licensing model — no Stripe/PayPal.
- `.planning/phases/04-commercial-foundation/04-CONTEXT.md` — D-06: Server-side role resolution from DB; D-07: Full refresh token revocation on org switch. Tenant isolation via Prisma Client Extension + PostgreSQL RLS.
- `.planning/phases/09-ai-intelligence/09-CONTEXT.md` — D-20: Command Center page at `/command-center` (3-panel: agents/chat/cameras); D-08: SSE streaming; D-30: Action guardrails with operator confirmation. AI agentic system architecture.
- `.planning/phases/08-feature-deepening/08-CONTEXT.md` — D-02: Per-door threshold columns; D-04: Per-severity SLA profiles; D-06: Queue resilience with Redis dedup; D-19: Mobile guard-first patterns, 4-tab navigation, quick actions.
- `.planning/phases/06-premium-experience/06-CONTEXT.md` — D-01 to D-06: Radix Themes + Tailwind CSS design system, dark-first, motion animations, GlassCard, MetricHero, Sparkline, DonutChart components. Reusable for compliance dashboard and settings pages.

### Architecture & Patterns
- `.planning/codebase/ARCHITECTURE.md` — NestJS module pattern, JWT auth flow, guard system (JwtAuthGuard → TenantIsolationGuard → RolesGuard), BullMQ queues, WebSocket gateway
- `.planning/codebase/STACK.md` — Prisma 5.22.0, NestJS 10.4.8, Fastify adapter, BullMQ 5.30.0, ioredis 5.4.1, PDFKit 0.19.1, Handlebars 4.7.9, Socket.IO 4.8.3
- `.planning/codebase/INTEGRATIONS.md` — Resend email, FCM push, existing Ollama/OIDC config patterns, Swagger/OpenAPI at `/api/docs`, Caddy routing
- `.planning/codebase/CONVENTIONS.md` — Naming conventions, Zod + class-validator dual validation, NestJS module structure, React component patterns

### Source Code — Auth & Identity
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts` — JWT strategy with orgId payload and OrganizationMember verification. **Extend with SSO callback strategy.**
- `apps/api/src/modules/auth/auth.service.ts` — Login, register, switch-org, createTokens. **Add SSO JIT provisioning + token exchange.**
- `apps/api/src/modules/auth/auth.controller.ts` — Auth endpoints. **Add SAML/OIDC callback routes.**
- `apps/api/src/common/guards/` — JwtAuthGuard, RolesGuard, TenantIsolationGuard pattern. **New: SsoAuthGuard, ApiKeyGuard.**

### Source Code — API Keys & License
- `apps/api/src/modules/license/guards/license-api-key.guard.ts` — LicenseApiKeyGuard: validates X-API-Key header via SHA-256 hash, attaches `request.apiKeyInfo`. **Pattern to follow for TenantApiKey guard.**
- `apps/api/src/modules/license/license.service.ts` — `listAllApiKeys()`, `createApiKey()`, `revokeApiKey()` CRUD. **Pattern to follow for tenant API key management.**
- `apps/api/prisma/schema.prisma` — `LicenseApiKey` model (lines 716-733): id, name, keyHash, keyPrefix, isActive, organizationId. **Reference for TenantApiKey model design.**
- `packages/shared/src/schemas/license.schema.ts` — `createApiKeySchema` Zod schema. **Reference for tenant API key schemas.**

### Source Code — Feature Gates
- `apps/api/src/modules/feature-gate/feature-gate.service.ts` — `DEFAULT_FEATURES` tier mapping: `sso` (ENTERPRISE), `api_access` (ENTERPRISE), `custom_branding` (ENTERPRISE), `export_csv`, etc. `seedDefaultFlags()` method.
- `apps/api/src/common/guards/feature-gate.guard.ts` — `FeatureGateGuard` (global APP_GUARD) with `@FeatureGate(key)` decorator + Redis cache. **Wire SSO/API/branding enforcement through this.**

### Source Code — Webhooks
- `apps/api/src/modules/notifications/notifications.service.ts` — `sendWebhook()` (lines 162-177): simple POST with 15s timeout. **Rebuild with BullMQ retry + HMAC signing.**

### Source Code — Compliance & Retention
- `apps/api/src/modules/governance/governance.service.ts` — `pruneExpiredData()` hourly cron, BullMQ `retention-pruning` queue. **Extend with classification labels + pre-purge export.**
- `apps/api/src/modules/governance/governance.controller.ts` — `GET/POST/PATCH/DELETE /api/governance/retention-policies`. **Add classification field + export config.**
- `apps/api/prisma/schema.prisma` — `RetentionPolicy` model (lines 383-389): eventType, tableType, retentionDays, enabled. **Add classification, exportBeforePurge.**
- `apps/api/src/modules/audit/audit.service.ts` — Hash-chain verification, CSV export, `queryAuditLog()`. **Extend with compliance report data queries.**
- `apps/api/src/modules/audit/audit.controller.ts` — `GET /api/audit`, export, stats, verify-chain. **Add compliance report download endpoints.**
- `apps/api/src/modules/incident/incident.service.ts` — PDFKit + Handlebars closure report generation (lines 675-736+). **Pattern to follow for compliance report templates.**

### Source Code — Dashboard Integration Points
- `apps/dashboard/app/(dashboard)/command-center/page.tsx` — Phase 9 Command Center (3-panel: agents/chat/cameras). **Unify with real-time WebSocket feed for ENT-08.**
- `apps/dashboard/app/(dashboard)/gouvernance/page.tsx` — Retention policy dashboard. **Extend with classification labels + pre-purge config.**
- `apps/dashboard/app/(dashboard)/parametres/page.tsx` — Settings page. **Add SSO IdP configuration section, API key management, webhook subscriptions.**
- `apps/dashboard/lib/nav-config.ts` — Navigation config. **Add Public API, Webhooks, Compliance nav entries.**

### Source Code — Mobile Integration Points
- `apps/mobile/app/(tabs)/incidents.tsx` — Incident list tab (Phase 8). **Extend with photo capture, QR check-in.**
- `apps/mobile/app/incident/[id].tsx` — Incident detail view. **Add photo evidence capture.**
- `apps/mobile/lib/offline-storage.ts` — `PendingIncident` with `photoUri`, `queueIncident()`. **Pattern for offline capture queue.**
- `apps/mobile/components/` — Guard-first components from Phase 6. **Reuse for door control, NFC scan UI.**

### Source Code — Infrastructure
- `apps/api/prisma/schema.prisma` — Prisma models (add: TenantApiKey, WebhookSubscription, WebhookDelivery, IdpConfig; extend: Organization, RetentionPolicy)
- `apps/api/src/main.ts` — Swagger config (lines 124-143), Fastify rate limiting (lines 48-67). **Add /api/docs/v1, API key auth scheme.**
- `apps/api/src/config/configuration.ts` — Config keys. **Add SAML/OIDC env vars (SAML_IDP_METADATA_URL, SAML_CERT, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, etc.).**
- `docker-compose.yml` / `docker-compose.prod.yml` — Service definitions. **No new services needed — all new modules are NestJS-based.**

### Dependencies to Add
| Package | Purpose |
|---------|---------|
| `passport-saml` or `@node-saml/node-saml` | SAML 2.0 authentication strategy |
| `openid-client` | OIDC authentication |
| `expo-camera` | Mobile incident photo capture |
| `expo-barcode-scanner` | QR code scanning for visitor check-in |
| `react-native-nfc-manager` | NFC badge validation |
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **LicenseApiKey guard + CRUD** (`apps/api/src/modules/license/`): Pattern for TenantApiKey — SHA-256 key hashing, prefix display, isActive toggle, revocation. Reuse the guard pattern, create a parallel model.
- **FeatureGateGuard** (`apps/api/src/common/guards/feature-gate.guard.ts`): Existing Redis-cached guard with `@FeatureGate(key)` decorator. Already has `sso`, `api_access`, `custom_branding` flags defined. Wire into SSO/auth, API key guard, and branding.
- **GovernanceService** (`apps/api/src/modules/governance/`): Hourly cron pruning with BullMQ worker. RetentionPolicy CRUD exists. Add classification labels and pre-purge export — leverage existing infrastructure.
- **PDFKit + Handlebars** (`apps/api/src/modules/incident/incident.service.ts`): Proven PDF generation pipeline. Create compliance-specific templates following the same pattern — Handlebars `.hbs` → PDFKit document → blob download.
- **AuditService** (`apps/api/src/modules/audit/audit.service.ts`): Hash-chain integrity, CSV export, queryAuditLog with filters. Compliance reports pull data from here. Add access review queries.
- **Phase 6 premium components**: GlassCard, MetricHero, Sparkline, DonutChart, QuickActionBar. Reuse for settings pages (IdP config, API keys, webhooks).
- **Phase 9 Command Center** (`apps/dashboard/app/(dashboard)/command-center/page.tsx`): 3-panel layout, AgentStatusBar, ChatPanel, CameraGrid. Extend with real-time feed panel.

### Established Patterns
- **NestJS module pattern**: Each new concern = new module (SsoModule, ApiKeyModule, WebhookModule). Follow existing controller/service/module.ts structure.
- **Passport strategy pattern**: Existing `jwt.strategy.ts`, `local.strategy.ts` — add `saml.strategy.ts`, `oidc.strategy.ts` following same `PassportStrategy` + `validate()` pattern.
- **Zod + class-validator dual validation**: Shared schemas in `packages/shared/src/schemas/`, class-validator DTOs in `apps/api/src/common/dto/` for Swagger. New schemas for IdP config, API key creation, webhook subscription.
- **BullMQ queues**: Existing queues for frame-processing, notification, audit-write, retention-pruning, ai-summaries. Add `webhook-delivery` queue for retry schedule.
- **Prisma Client Extension auto-scoping**: All new models (TenantApiKey, WebhookSubscription, WebhookDelivery, IdpConfig) automatically tenant-scoped by existing extension.
- **fetchWithAuth()**: Dashboard API client with auto-refresh. New API endpoints for settings, compliance, webhooks use this.
- **Guard order**: JwtAuthGuard → TenantIsolationGuard → RolesGuard. API key guard runs instead of JWT for `/api/v1/*`. SSO callback routes are @Public().
- **Resend SDK**: Email delivery. Reuse for compliance report email delivery, webhook failure alerts.

### Integration Points
- **New NestJS modules**: `apps/api/src/modules/sso/` (SAML/OIDC strategies, callback controller, IdP config service), `apps/api/src/modules/api-key/` (TenantApiKey CRUD, guard), `apps/api/src/modules/webhook/` (WebhookSubscription CRUD, delivery processor, HMAC signing)
- **New Prisma models**: `TenantApiKey`, `WebhookSubscription`, `WebhookDelivery`, `IdpConfig`
- **Extended Prisma models**: `Organization` (logoUrl, primaryColor, displayName), `RetentionPolicy` (classification, exportBeforePurge, exportFormat)
- **Extended Dashboard pages**: Settings (`/parametres`) — add SSO config tab, API keys tab, webhook subscriptions tab. Governance (`/gouvernance`) — add classification labels, pre-purge export toggle.
- **New Dashboard pages**: `/api-keys` (key management), `/webhooks` (subscription management + delivery dashboard), `/conformite` (compliance report generation + download)
- **Command Center enhancement**: Add real-time unified feed panel (WebSocket Socket.IO), replace 60s polling with push events
- **Mobile new screens**: NFC badge scan, QR visitor check-in, incident photo capture, door control quick actions
- **Auth flow**: Login page gets SSO button when IdP configured. SSO callback routes `GET /api/auth/sso/saml/callback`, `GET /api/auth/sso/oidc/callback`
- **Caddy routing**: `/api/v1/*` routes to API service (already handled by `/api/*` catch). No Caddy changes needed.
- **Swagger**: New `SwaggerModule.createDocument()` for v1 public docs. Separate `DocumentBuilder` with API key auth scheme.
- **Env vars**: SAML_IDP_METADATA_URL, SAML_ENTITY_ID, SAML_CERT, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_ISSUER_URL (all optional — only needed if instance enables SSO)

### Creative Options
- SSO dashboard settings can be a tabbed config page: SAML tab + OIDC tab, with test connection button
- API keys page can show masked keys with copy-on-create, last-used timestamp, usage sparkline
- Webhook delivery dashboard can use a timeline view with color-coded status (green=200, yellow=retry, red=failed)
- Compliance reports can be generated on-demand + scheduled (cron-based auto-generation)
- Pre-purge export archives can use a simple file listing with download + expiry date
- White label config can be a visual preview card showing header/login mockups with uploaded logo and color
- Mobile NFC scan can be a full-screen scanner with haptic feedback + success/failure animation
- Command Center real-time feed can be a left-panel sidebar replacing the agent status bar, with filterable event stream
</code_context>

<specifics>
## Specific Ideas

**Self-hosted architecture is the key design constraint.** Each customer runs their own instance — one organization per deployment. This simplifies SSO (no instance-level IdP), API keys (org-scoped by construction), and retention (global = org-scoped). The multi-tenant infrastructure from Phase 4 is still active but the "multi" aspect only comes into play for the Oversight Hub admin instance that manages licenses across customers.

**User preference: pragmatic enterprise features over ivory-tower compliance.** SOC 2 + ISO 27001 + Access Review covers the top 3 compliance asks without overbuilding a custom reporting framework. White labeling is logo + color + name — not a full theme engine.

**User deferred to a dedicated future phase**: Distribution, setup wizard, installation guide, onboarding flow. This is a critical concern for self-hosted delivery but belongs in its own phase with dedicated planning.
</specifics>

<deferred>
## Deferred Ideas

- **Distribution & onboarding (new phase)** — Installation guide, setup wizard (first-run: create admin, configure DB, upload license), Docker image versioning, update mechanism, auto-configuration scripts. Critical for self-hosted delivery model — deserves its own phase.
- **Command Center real-time unification** — Full real-time WebSocket feed merging doors, alerts, incidents, and AI events into a single unified stream with map view and customizable layouts. Phase 9 built the AI-chat-centric foundation; ENT-08 builds on it.
- **Guard mobile NFC/QR/photo/door control** — ENT-09 covers badge validation, visitor check-in, incident photo capture, and door remote control. Phase 8 mobile has basic incident viewing and offline queue — ENT-09 extends to field workflows.
- **Full theme engine for white labeling** — Current scope is logo + color + app name. Custom fonts, email templates, and full CSS variable overrides are future enhancements.
- **API gateway / API productization** — API analytics, usage quotas, monetized API access for partners, developer portal. Beyond ENT-04 scope.
</deferred>

---

*Phase: 10-Enterprise-Grade*
*Context gathered: 2026-07-16*
