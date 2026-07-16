# Phase 10: Enterprise Grade - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-16
**Phase:** 10-enterprise-grade
**Areas discussed:** SSO/SAML Integration, Public REST API + API Keys, Webhook Architecture, Multi-Currency + ENT Payment, Compliance Reporting, White Labeling

---

## SSO/SAML Integration

| Option | Description | Selected |
|--------|-------------|----------|
| SAML 2.0 only | Enterprise standard, supported by Azure AD, Okta, Ping, OneLogin. passport-saml is mature. | |
| OIDC only | Modern standard, simpler than SAML. Google Workspace, Auth0, Keycloak. openid-client. | |
| Both SAML + OIDC | Maximum compatibility. SAML for legacy, OIDC for modern. | ✓ |

**User's choice:** Both SAML + OIDC (Recommended)
**Notes:** Maximum enterprise compatibility.

| Option | Description | Selected |
|--------|-------------|----------|
| JIT — auto-create on first login | User auto-created with role from IdP group/attribute mapping. | ✓ |
| Admin pre-provisioning required | Admin must create user account + assign role before SSO works. | |

**User's choice:** JIT auto-create (Recommended)
**Notes:** User self-hosts — one org per instance. JIT simplifies onboarding.

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard settings page | Admin configures IdP via UI — metadata URL, entity ID, certificate, attribute mappings. | ✓ |
| Environment variables + config file | IdP configured via env vars. Simpler to implement, less user-friendly. | |
| Both | Env vars bootstrap, UI fine-tunes. | |

**User's choice:** Dashboard settings page (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| SSO-first with local fallback | Login page shows SSO prominently. Local email/password still available for break-glass. | ✓ |
| SSO-mandatory | All users must auth via IdP. Local login disabled. Risk of lockout. | |
| User-choice | Both presented equally. | |

**User's choice:** SSO-first with local fallback (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Issue standard JWT pair after SSO | Exchange IdP assertion for Oversight Hub JWT access + refresh tokens. | ✓ |
| Use IdP tokens directly | Pass IdP tokens through to API. Requires API to validate external tokens. | |

**User's choice:** Issue standard JWT pair (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard upload + auto-fetch | Admin can paste metadata URL (auto-discovery) or manually upload certs. | ✓ |
| Metadata URL only | Platform fetches cert from IdP metadata URL only. | |
| Manual upload only | Admin must paste certificate text. More secure, more friction. | |

**User's choice:** Dashboard upload + auto-fetch (Recommended)

---

## Public REST API + API Keys

| Option | Description | Selected |
|--------|-------------|----------|
| URL path: /api/v1/* | Standard REST convention. Easy to discover, document, route. | ✓ |
| Header-based versioning | Accept: application/vnd.oversight.v1+json. Clean URLs but harder to discover. | |
| Same /api/* prefix | No version prefix. Guard differentiates internal vs public. | |

**User's choice:** URL path /api/v1/* (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| New TenantApiKey model | Separate from LicenseApiKey. Different lifecycle: scoped permissions, per-key rate limits. | ✓ |
| Extend existing LicenseApiKey | Add isPublicApi, scopes, rateLimit fields. Mixes concerns. | |
| Reuse LicenseApiKey as-is | Same keys for license generation and public API. Simplest. | |

**User's choice:** New TenantApiKey model (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Curated subset | Cameras, doors, alerts, incidents, events, audit. No user/org/billing/feature gates. | ✓ |
| Read-only everything | All modules exposed but GET only. | |
| Full CRUD, RBAC-filtered | All modules with same RBAC. Highest surface area. | |

**User's choice:** Curated subset (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Per-key limits, role-based defaults | Each key has own limit. 1000 req/min ADMIN, 300 req/min others. X-RateLimit-* headers. | ✓ |
| Per-organization global limit | All keys share one pool. One noisy integration blocks others. | |
| Unlimited | Rely on global Fastify rate-limit only. | |

**User's choice:** Per-key limits with role-based defaults (Recommended)

---

## Webhook Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Per-event-type subscriptions | Admin subscribes to event types (alert.created, incident.escalated, door.forced) with unique URL each. | ✓ |
| Single catch-all URL | One URL receives all events. Simpler, less control. | |
| Per-entity subscriptions | Subscribe to events for specific entities. Most granular, complex UI. | |

**User's choice:** Per-event-type subscriptions (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| At-least-once with exponential backoff | BullMQ retry: immediate → 1min → 5min → 15min → 1hr → 24hr. 6 attempts max. Idempotency key. | ✓ |
| At-most-once | Single attempt, no retry. Current behavior. | |
| Exactly-once with dedup | Redis-based dedup + receiver acknowledgment. Complex. | |

**User's choice:** At-least-once with exponential backoff (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| HMAC-SHA256 signing per subscription | Each subscription gets signing secret. X-Webhook-Signature with timestamp. | ✓ |
| Static API key in header | Simple X-API-Key header per subscription. | |
| No signing | Rely on TLS only. | |

**User's choice:** HMAC-SHA256 signing per subscription (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Full delivery dashboard | All attempts visible with status, body, timestamps, retry count. Manual retry button. | ✓ |
| Status badges only | Green/yellow/red per subscription. No drill-down. | |
| Logs-only via audit trail | Failed deliveries logged to audit trail. No dedicated UI. | |

**User's choice:** Full delivery dashboard (Recommended)

---

## Multi-Currency + ENT Payment

| Option | Description | Selected |
|--------|-------------|----------|
| License pricing in multiple currencies | Oversight Hub admin dashboard shows/sets prices in multiple currencies. License JWT carries currency field. | ✓ |
| Customer-side invoicing module | Self-hosted instance generates invoices for internal tracking. | |
| Pricing display only | Multi-currency is purely informational. No billing logic. | |
| Remove ENT-07 | With pure licensing and no online payments, currency irrelevant. | |

**User's choice:** License pricing in multiple currencies (Recommended)
**Notes:** Phase 5 chose pure licensing (no Stripe/PayPal). Multi-currency is about license pricing display, not payment processing.

| Option | Description | Selected |
|--------|-------------|----------|
| Admin-side only | Currency set when admin generates a license. Customer instance displays what license says. | ✓ |
| Admin + customer-side display | Admin sets base price. Customer instance converts via exchange rate API. | |

**User's choice:** Admin-side only (Recommended)

---

## Compliance Reporting

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse PDFKit + Handlebars | Same stack as incident reports. Compliance-specific templates. No new dependencies. | ✓ |
| Dedicated reporting library | jsreport or docx-templater. More powerful but adds dependencies. | |
| HTML-to-PDF via Puppeteer | Best visual quality but heavyweight (Chromium dependency). | |

**User's choice:** Reuse PDFKit + Handlebars (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| SOC 2 + ISO 27001 + Access Review | Three core reports. Covers top enterprise compliance needs. | ✓ |
| SOC 2 only | Single report type. Easiest. | |
| SOC 2 + ISO + Custom templates | Core reports + custom template builder. Significant UX complexity. | |

**User's choice:** SOC 2 + ISO 27001 + Access Review (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep global, add classification | Global policies (org-scoped since self-hosted). Add PII, security, audit labels. | ✓ |
| Per-event-type only | Current model is sufficient. Enhance dashboard UI + pre-purge export. | |
| Full per-entity-type override | Different retention per entity. Granular but complex. | |

**User's choice:** Keep global, add classification (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-purge export + auto-delete | Admin configures: export archive (PDF/CSV) before purge + auto-delete. Audit logged. | ✓ |
| Auto-delete only | Data silently deleted. Simpler but may violate compliance. | |
| Soft-delete with admin review | Data marked for deletion, admin approves. Maximum control, more work. | |

**User's choice:** Pre-purge export + auto-delete (Recommended)

---

## White Labeling

| Option | Description | Selected |
|--------|-------------|----------|
| Logo + color scheme + app name | Admin uploads logo, picks primary color, sets app name. Applied to header, login, PDF reports. | ✓ |
| Logo only | Replace default logo. Minimal. | |
| Full white label | Logo, colors, fonts, email templates, domain. More work. | |
| Defer to future phase | custom_branding flag exists but implementation deferred. | |

**User's choice:** Logo + color scheme + app name (Recommended)
**Notes:** The `custom_branding` feature flag (ENTERPRISE tier) already exists in FeatureGateService.

---

## Agent Discretion

- SAML library choice (passport-saml vs @node-saml/node-saml)
- OIDC library choice (openid-client)
- TenantApiKey model schema and prefix convention
- WebhookSubscription and WebhookDelivery model schema
- IdpConfig model schema and attribute mapping format
- Compliance report Handlebars template design
- Data classification label system
- White label implementation (Organization model extension)
- Command Center real-time WebSocket feed architecture
- Guard mobile NFC/QR/photo/door control library selection

## Deferred Ideas

- **Distribution & onboarding** — Installation guide, setup wizard, Docker image versioning, update mechanism. Deserves its own dedicated phase.
- **Command Center real-time unification** — Full WebSocket feed merging doors, alerts, incidents, AI events. ENT-08 scope.
- **Guard mobile workflows** — NFC badge, QR check-in, incident photo capture, door control. ENT-09 scope.
- **Full white-label theme engine** — Custom fonts, email templates, CSS variable overrides. Beyond Phase 10 scope.
- **API gateway productization** — Usage analytics, quotas, monetized partner API, developer portal.
