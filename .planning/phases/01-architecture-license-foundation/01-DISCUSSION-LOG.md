# Phase 1: Architecture & License Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-18
**Phase:** 1-Architecture & License Foundation
**Areas discussed:** Feature gate tier mapping, vault-app architecture, License activation & trial UX, Mode degrade enforcement, License key security, Migration path for existing data, Existing code cleanup, Dashboard UI scope

---

## Feature Gate Tier Mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Replace tiers with packs | Remove FREE/PROFESSIONAL/ENTERPRISE entirely. FeatureFlag tier becomes VISION or BASTION. | ✓ |
| Keep tiers rename externally | Keep tiers internally, rename in UI only. | |
| Hybrid packs + modules | VISION/BASTION as primary tiers. Add optional modules as extra flags. | |

**User's choice:** Replace tiers with packs + optional modules (sub-question)
**Notes:** User confirmed BASTION base + optional modules. VISION is fixed. User later provided full pricing spec at `docs/PRICING-SPEC.md`.

| Option | Description | Selected |
|--------|-------------|----------|
| All pre-seeded | Create feature flags for ALL optional modules at org creation. | ✓ |
| Created on demand | Modules only appear when vault-app enables them. | |

**User's choice:** All pre-seeded

| Option | Description | Selected |
|--------|-------------|----------|
| In license JWT claims | Encode maxCameras, maxUsers, allowed modules in JWT. | ✓ |
| In database table | Separate LimitConfig table. | |

**User's choice:** In license JWT claims (after agent recommendation)

---

## vault-app Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Separate Next.js app | New standalone app. Clean separation. | ✓ |
| Add to marketing | Revive apps/marketing/ with source code. | |
| Admin section in dashboard | Add super-admin routes to vault-os dashboard. | |

**User's choice:** vault-app is OUTSIDE the monorepo — `/home/devuser/projects/vault-app/`
**Notes:** User clarified vault-app is already a separate project used by VaultOS founders for marketing AND admin.

| Option | Description | Selected |
|--------|-------------|----------|
| Single PLAN.md for both | Phase 1 PLAN covers vault-os AND vault-app. | ✓ |
| Two separate phases | Phase 1 = vault-os, Phase 1b = vault-app. | |

**User's choice:** Single PLAN.md for both

| Option | Description | Selected |
|--------|-------------|----------|
| Email + password | Separate auth for vault-app admins. | ✓ |
| Shared JWT from vault-os | Same auth system. | |

**User's choice:** Email + password

| Option | Description | Selected |
|--------|-------------|----------|
| REST API | vault-app exposes endpoints, vault-os calls for verification. | ✓ |
| Stateless JWT | No API, just JWT decode locally. | |

**User's choice:** REST API

---

## License Activation & Trial UX

| Option | Description | Selected |
|--------|-------------|----------|
| Wizard first-launch | Full-page welcome screen: enter key or start trial. | ✓ |
| Trial auto + upgrade | Auto-generated trial on install. | |

**User's choice:** Wizard first-launch

| Option | Description | Selected |
|--------|-------------|----------|
| VISION only | Trial activates VISION pack only. | ✓ |
| VISION + BASTION preview | Trial activates everything with badge. | |

**User's choice:** VISION only

| Option | Description | Selected |
|--------|-------------|----------|
| Status bar in header | License info in dashboard header. | |
| Dedicated settings page | Page at /parametres/licence with full details. | ✓ |

**User's choice:** Dedicated settings page

---

## Mode Dégradé Enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Cron job | @nestjs/schedule calls vault-app API every 24h. | ✓ |
| On-demand only | Verify at startup and manual click. | |
| BullMQ repeatable | Redis-backed schedule job. | |

**User's choice:** Cron job

| Option | Description | Selected |
|--------|-------------|----------|
| UI + recording OK, config blocked | Dashboard visible, recording continues, no new camera/zone/user config. | ✓ |
| Everything except config | Same but more permissive. | |

**User's choice:** UI + recording OK, new features blocked

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only complete | Dashboard visible, no actions. Recording continues. AI alerts blocked. | |
| Read-only + recording stop | Dashboard visible, recording stops, AI alerts blocked. | ✓ |

**User's choice:** Read-only + recording stop

---

## License Key Security

| Option | Description | Selected |
|--------|-------------|----------|
| Embedded public key | Private key in vault-app .env, public key in vault-os code. | ✓ |
| Docker secrets | Both keys mounted as /run/secrets/. | |

**User's choice:** Embedded public key (after agent explanation)
**Notes:** User was initially confused about vault-app's role. Clarified: vault-app = VaultOS internal tool (marketing + admin), vault-os = client product.

---

## Migration Path for Existing Data

| Option | Description | Selected |
|--------|-------------|----------|
| Drop, require reactivation | Existing planTiers ignored. Admin reactivates with new key. | ✓ |
| Auto-map tiers to packs | FREE->none, PROFESSIONAL->VISION, ENTERPRISE->BASTION. | |

**User's choice:** No production data exists. Clean rename/reset is fine.

| Option | Description | Selected |
|--------|-------------|----------|
| Remove planTier completely | Delete field from Organization schema. | ✓ |
| Keep as cache | Keep but unused. | |

**User's choice:** Remove completely

| Option | Description | Selected |
|--------|-------------|----------|
| Replace tier with pack/module | FeatureFlag.tier becomes pack (VISION/BASTION). Module flags have isModule. | ✓ |
| Delete tier, add pack | New field. | |

**User's choice:** Replace tier with pack/module

---

## Existing Code Cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Full cleanup | Remove ALL tier references from vault-os codebase. | ✓ |
| Minimal changes | Rename/seeding update only. | |

**User's choice:** Full cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Remove generation endpoint | Delete POST /api/licenses/generate and LicenseApiKeyGuard. | ✓ |
| Keep for SUPER_ADMIN | Guard with SUPER_ADMIN role. | |

**User's choice:** Remove entirely

---

## Dashboard UI Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Activation wizard page | Full-page at /activate, blocks dashboard. | ✓ |
| License settings page | /parametres/licence with status, pack, expiry. | ✓ |
| Expiry warning banner | Red banner on all pages. | ✓ |

**User's choice:** All three

| Option | Description | Selected |
|--------|-------------|----------|
| Full-page wizard | Blocks dashboard access until activated. | ✓ |
| Modal overlay | Dashboard loads but modal blocks interaction. | |

**User's choice:** Full-page wizard

---

## Agent's Discretion

- Exact REST API endpoint paths and request/response formats for license verification
- Implementation details of the cron job (schedule config, retry strategy)
- Feature flag key naming convention for BASTION modules
- UI design decisions (component implementation, styling)
- Whether vault-app needs a Prisma schema or uses a different data store

## Deferred Ideas

None.
