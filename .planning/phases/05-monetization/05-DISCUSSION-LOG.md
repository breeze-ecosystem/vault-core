# Phase 5: Monetization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-15
**Phase:** 5-Monetization
**Areas discussed:** Tier structure & pricing, PayPal integration, Self-hosted webhook strategy, Feature gate mapping, Billing/License UI scope, License creation method, License structure, Grace period, Offline validation, License UI, License API, Enforcement, Claims, Signing key, New org defaults

---

## Stripe/PayPal Availability

The user raised that Stripe and PayPal are not available in Niger (their primary market), and that a free tier doesn't make sense for a self-hosted app.

**Outcome:** This fundamentally restructured the phase. Rejected Stripe/PayPal/subscription billing entirely. Pure licensing model replaces all BIL requirements.

---

## Monetization Model

| Option | Description | Selected |
|--------|-------------|----------|
| Licences pures | Direct license sales (JWT key), no payment gateway integration | ✓ |
| Licences + passerelle locale | License JWT + local payment gateway (Orange Money, Wave) | |
| Stripe depuis l'étranger | Use Stripe as merchant of record from overseas entity | |
| Mix: licence offline + facturation manuelle | JWT license + manual invoicing | |

**User's choice:** Licences pures
**Notes:** Payment happens entirely outside the app. No Stripe, no PayPal, no subscription management.

---

## License Creation Method

| Option | Description | Selected |
|--------|-------------|----------|
| Génération manuelle par admin | Admin creates license in dashboard, sends key to customer | |
| API de génération de licences | Programmatic license generation via API | |
| Les deux (dashboard admin + API) | Both dashboard UI and API | ✓ |

**User's choice:** Les deux

---

## License Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Expiration + devices (caméras, portes) | Expiry + max cameras + max doors | ✓ |
| Expiration + devices + users + feature flags | Same + user limits + feature flags | |
| Perpétuelle avec limites devices | Perpetual + device limits only | |

**User's choice:** Expiration + devices

---

## Grace Period

| Option | Description | Selected |
|--------|-------------|----------|
| 30 jours avec avertissements | 30-day grace with warnings | |
| 7 jours, blocage total après | 7-day grace, then full block | ✓ |
| Aucune, blocage immédiat | No grace, immediate block | |

**User's choice:** 7 jours

---

## Offline Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Validation 100% locale (JWT + clé publique) | 100% local: JWT verified with bundled public key | ✓ |
| Locale + phone-home optionnel | Local + optional phone-home | |
| Locale + phone-home obligatoire mensuel | Local + mandatory monthly phone-home | |

**User's choice:** Validation 100% locale

---

## License UI Location

| Option | Description | Selected |
|--------|-------------|----------|
| Page dédiée "Licences" | Dedicated Licences page in dashboard nav | ✓ |
| Section dans Paramètres | Section in existing Settings page | |
| Page dédiée + badge de statut | Dedicated page + status badge in header | |

**User's choice:** Page dédiée "Licences"

---

## License API Auth

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard admin uniquement | Accessible only from dashboard UI (user JWT) | |
| API key dédiée (programmatique) | Dedicated API key for programmatic access | ✓ |
| Les deux | Both dashboard UI and API key | |

**User's choice:** API key dédiée

---

## Over-Limit Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Blocage — refus API avec message | API rejects with clear error message | ✓ |
| Ajout possible mais flagged + alerté | Creation allowed but flagged and alerted | |
| Blocage API + UI (double barrière) | Blocked in both API and UI | |

**User's choice:** Blocage — refus API avec message

---

## Revocation

| Option | Description | Selected |
|--------|-------------|----------|
| Pas de révocation (expiration naturelle) | No revocation, natural expiry only | ✓ |
| Blacklist signée importable | Signed blacklist the customer imports | |
| Licences courtes + renouvellement fréquent | Short-duration licenses + frequent renewal | |

**User's choice:** Pas de révocation

---

## Signing Key Location

| Option | Description | Selected |
|--------|-------------|----------|
| Clé privée dans .env (simple) | Private key in environment variable | |
| Fichier de clé RSA via volume Docker | RSA key file mounted via Docker volume | ✓ |

**User's choice:** Fichier de clé RSA via volume Docker

---

## JWT Claims Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal (orgId, dates, limits) | organizationId, expiresAt, maxCameras, maxDoors | |
| Minimal + version + grace period | Same + licenseVersion, gracePeriodDays | ✓ |
| Complet (avec features list + metadata) | Full with features list + org metadata | |

**User's choice:** Minimal + version + grace period

---

## New Organization Default

| Option | Description | Selected |
|--------|-------------|----------|
| Essai limité dans le temps | Time-limited trial | ✓ |
| Pas d'accès sans licence | No access without license | |
| Mode démo limité en devices | Device-limited demo mode | |

**User's choice:** Essai limité dans le temps (7 days, unlimited devices)

---

## Agent Discretion

Areas left to agent discretion (no user preference specified):
- Dashboard "Licences" page layout and UX (follow existing shadcn/ui patterns)
- API key management UI for license generation
- License activation/import UI on client dashboard
- Error message wording for blocks and limits
- Trial license implementation mechanism (virtual JWT vs DB flag)

## Deferred Ideas

- **BIL-01 through BIL-07 (Stripe/PayPal billing):** Superseded by pure licensing model. Should be moved to Out of Scope in REQUIREMENTS.md.
- **Feature gate ↔ license mapping (FND-07):** The FeatureFlag model exists but is not integrated with licensing in this phase.
- **Payment gateway integration:** If ever needed, would be a future phase (manual onboarding + wire transfer is sufficient now).
