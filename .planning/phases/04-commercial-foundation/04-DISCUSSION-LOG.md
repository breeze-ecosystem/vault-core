# Phase 4: Commercial Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-15
**Phase:** 4 - Commercial Foundation
**Areas discussed:** Organization ↔ Site relationship, User multi-tenancy & JWT design, Tenant isolation strategy, Invite flow & onboarding

---

## Organization ↔ Site Relationship

### Org ↔ Site model

| Option | Description | Selected |
|--------|-------------|----------|
| Organization replaces Site | Migrate Site → Organization, rename siteId → organizationId everywhere. Simplest path. | ✓ |
| Organization sits above Site | New Organization model with one-to-many sites. Keeps siteId intact. | |

**User's choice:** Organization replaces Site

### Organization fields

| Option | Description | Selected |
|--------|-------------|----------|
| Keep Site fields + billing metadata | Inherit Site's existing fields plus stripeCustomerId, billingEmail, planTier. | ✓ |
| Thin Organization model for now | Just id, name, slug, isActive — add billing later. | |

**User's choice:** Keep Site fields + billing metadata

### Migration strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Database migration renames siteId→orgId | Single migration, clean break, no backward compat. | ✓ |
| New organizationId column, deprecate siteId | Add alongside, remove later — safer but double work. | |

**User's choice:** Database migration renames — clean break

### Physical location grouping

| Option | Description | Selected |
|--------|-------------|----------|
| No location model for now | Cameras/doors/zones go directly under organizationId. | ✓ |
| Add a lightweight Location model | New model with orgId + locationId references. | |

**User's choice:** No location model — Phase 4 is about tenant isolation

---

## User Multi-Tenancy & JWT Design

### User ↔ Organization model

| Option | Description | Selected |
|--------|-------------|----------|
| Join table: OrganizationMember | userId, organizationId, role, isActive. Role per org. | ✓ |
| User gets roles[] JSON array | No join table, JSON column with [orgId, role] pairs. | |

**User's choice:** OrganizationMember join table

### JWT payload design

| Option | Description | Selected |
|--------|-------------|----------|
| orgId + role in token, permissions from DB | JWT: { sub, email, orgId, role }. Permissions resolved server-side. | ✓ |
| orgId + permissions[] in token | Full permissions inline — no DB lookup but stale on change. | |

**User's choice:** orgId + role in token, permissions from DB

### Organization switching

| Option | Description | Selected |
|--------|-------------|----------|
| Switch org → re-issue JWT | POST /api/auth/switch-org re-issues tokens with new orgId. | ✓ |
| Single JWT carries all org memberships | X-Organization-Id header, no re-issue needed. | |

**User's choice:** Re-issue JWT on org switch

### Registration flow

| Option | Description | Selected |
|--------|-------------|----------|
| Register creates org automatically | POST /api/auth/register creates Org + User + Member in one transaction. | ✓ |
| Two-step: create org, then invite yourself | Separate org creation endpoint, then register separately. | |

**User's choice:** Register creates org automatically

---

## Tenant Isolation Strategy

### Primary isolation mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Both: RLS + Prisma extension | Prisma extension primary, PostgreSQL RLS as defense-in-depth. | ✓ |
| RLS only | Database-level only, no Prisma extension. | |
| Prisma extension only | Application-level only, no RLS. | |

**User's choice:** Two-layer: Prisma extension primary + RLS defense-in-depth

### Non-Prisma query scoping

| Option | Description | Selected |
|--------|-------------|----------|
| TenantContextMiddleware via RLS | Set PostgreSQL session var from JWT orgId. Covers raw SQL and BullMQ. | ✓ |
| Pass orgId through every service call | Explicit parameter passing, no session variable. | |

**User's choice:** TenantContextMiddleware with RLS session variable

### Per-tenant audit hash chain

| Option | Description | Selected |
|--------|-------------|----------|
| Add orgId + hash chain to existing AuditLog | Extend current model with organizationId, previousHash, currentHash. | ✓ |
| Hash-chain deferred | Just add organizationId column, defer chaining to later phase. | |

**User's choice:** Add orgId + hash chain now

---

## Invite Flow & Onboarding

### Invite mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| JWT invite token in URL + accept page | Email link → accept page → set password → member. 48h expiry. | ✓ |
| Invite code + manual entry | 6-char code, no email delivery, manual entry. | |

**User's choice:** JWT invite token in URL

### Existing users receiving invites

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-add to new org on accept | Existing user just gets OrganizationMember row with invited role. | ✓ |
| Require explicit accept | Must click link and confirm "join [Org]" page. | |

**User's choice:** Auto-add on invite accept

### Invite management

| Option | Description | Selected |
|--------|-------------|----------|
| 48h expiry, resend + revoke + list | Full CRUD lifecycle at /api/organizations/:orgId/invites. | ✓ |
| Minimal: just create and auto-expire | No resend, no revoke, no list. | |

**User's choice:** Full CRUD: resend, revoke, list

### Invite role assignment

| Option | Description | Selected |
|--------|-------------|----------|
| Invite with role assignment | Admin selects role at invite creation time. | ✓ |
| Invite only, role assigned after | Role assigned manually by admin after acceptance. | |

**User's choice:** Invite with role assignment

---

## Agent Discretion

- Feature gate infrastructure (FND-07): implementation approach not discussed — agent flexibility
- Prisma Client Extension pattern specifics: query-level vs model-level, transaction handling
- Frontend organization switcher UI: placement and behavior on Dashboard and Mobile

## Deferred Ideas

None — discussion stayed within Phase 4 scope.
