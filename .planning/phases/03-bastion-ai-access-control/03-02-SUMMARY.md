---
phase: 03-bastion-ai-access-control
plan: 02
subsystem: database
tags: [prisma, bastion, qdrant, shared-package, face-recognition, multi-site, rbac]
requires:
  - phase: 01-architecture-license-foundation
    provides: Feature gate guard chain, pack/license model
  - phase: 02-vision-pack
    provides: AI Preprocessor, Qdrant client, FaceWhitelist model, access control CRUD
provides:
  - BASTION Prisma data models (Face, AccessGroup, CredentialSiteAccess)
  - Extended CredentialType enum (FINGERPRINT, FACE)
  - Extended Role enum (GLOBAL_ADMIN, SITE_ADMIN)
  - Extended Organization model (parentOrganizationId, parent/children, maxSites)
  - Extended Credential model (fingerprintTemplateHash, faceEmbeddingId)
  - Extended OrganizationMember model (accessGroupId)
  - Shared package BASTION Zod schemas and typed exports
  - Qdrant faces collection (512-d Cosine) with full CRUD methods
affects:
  - 03-bastion-ai-access-control
tech-stack:
  added: []
  patterns:
    - Prisma self-referential parent-child organization hierarchy
    - Hybrid Prisma + Qdrant data model for face storage
    - Multi-site RBAC role hierarchy (GLOBAL_ADMIN > SUPER_ADMIN > SITE_ADMIN > ADMIN...)
key-files:
  created: []
  modified:
    - apps/api/prisma/schema.prisma
    - packages/shared/src/constants/credential-types.ts
    - packages/shared/src/constants/roles.ts
    - packages/shared/src/schemas/access.schema.ts
    - packages/shared/src/index.ts
    - apps/api/src/modules/ai-agent/qdrant/qdrant.service.ts
key-decisions:
  - "Followed D-03: Hierarchical RBAC with GLOBAL_ADMIN (100) and SITE_ADMIN (75)"
  - "D-10: 512-d Cosine for ArcFace embeddings in Qdrant faces collection (separate from 4096-d Qwen)"
  - "D-23: fingerprintTemplateHash stored as reference identifier only (no biometric data)"
  - "Face model coexists with FaceWhitelist — BASTION orgs use Face, VISION orgs use FaceWhitelist"
  - "D-01: Organization self-referential parent-child hierarchy via parentOrganizationId"
patterns-established:
  - "BASTION data models follow existing Prisma patterns with @@index and @relation"
  - "Qdrant face methods follow the same fail-transparent pattern as existing event/knowledge methods"
  - "Zod schemas added to shared package with consistent naming (createXxxSchema + export pattern)"
requirements-completed:
  - BAS-01
  - BAS-07
  - BAS-08
  - BAS-09
  - BAS-12
  - BAS-16
duration: 12 min
completed: 2026-07-18
---

# Phase 3 Plan 2: BASTION Data Models, Shared Types, Zod Schemas, and Qdrant Faces Collection

**Prisma schema extended with BASTION models (Face, AccessGroup, CredentialSiteAccess), FINGERPRINT/FACE credential types, GLOBAL_ADMIN/SITE_ADMIN roles, multi-site Organization hierarchy, Qdrant 512-d faces collection with upsert/search/delete methods**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-18T19:09:59Z
- **Completed:** 2026-07-18T19:21:35Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Extended Prisma `CredentialType` enum with `FINGERPRINT` and `FACE`
- Extended Prisma `Role` enum with `GLOBAL_ADMIN` (level 100) and `SITE_ADMIN` (level 75)
- Extended `Organization` model with self-referential parent-child hierarchy (`parentOrganizationId`, `parent`, `children`, `maxSites`)
- Created `Face` model with `isBlacklisted`, `riskThreshold`, `qdrantPointId` — coexists with existing `FaceWhitelist`
- Extended `Credential` model with `fingerprintTemplateHash`, `faceEmbeddingId`, and `siteAccesses` relation
- Created `AccessGroup` model with `members` relation to `OrganizationMember`
- Created `CredentialSiteAccess` model with `@@unique([credentialId, organizationId])` constraint
- Extended `OrganizationMember` model with `accessGroupId` for BASTION access group membership
- Applied schema to PostgreSQL database via `prisma db push` — all existing data preserved
- Regenerated Prisma client with all new models and enums
- Extended shared package `credential-types.ts` with `FINGERPRINT` and `FACE` constants
- Extended shared package `roles.ts` with `GLOBAL_ADMIN`, `SITE_ADMIN` and updated `ROLE_HIERARCHY`
- Extended shared package `access.schema.ts` with BASTION-specific Zod schemas (face, access group, site access)
- Exported all new BASTION schemas and types from shared package barrel `index.ts`
- Extended `QdrantService` with 512-d `faces` collection, `upsertFaces()`, `searchFaces()`, `deleteFacePoints()`, `ensureFacesCollection()` methods

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema with BASTION models** - `acbd86d` (feat)
2. **Task 2: Apply schema to database and regenerate client** - No code changes (operational — `prisma db push` and `prisma generate` executed successfully)
3. **Task 3: Extend shared package and Qdrant faces collection** - `7cacbf2` (feat)

**Plan metadata:** Pending (summary commit)

## Files Created/Modified

- `apps/api/prisma/schema.prisma` - Extended with BASTION models (Face, AccessGroup, CredentialSiteAccess), extended enums, Organization hierarchy, Credential/OrganizationMember extensions
- `packages/shared/src/constants/credential-types.ts` - Added FINGERPRINT and FACE credential type constants
- `packages/shared/src/constants/roles.ts` - Added GLOBAL_ADMIN, SITE_ADMIN with updated ROLE_HIERARCHY
- `packages/shared/src/schemas/access.schema.ts` - Extended credential schema with new types, added BASTION schemas
- `packages/shared/src/index.ts` - Added BASTION Pack export section
- `apps/api/src/modules/ai-agent/qdrant/qdrant.service.ts` - Added faces collection (512-d Cosine), CRUD methods

## Decisions Made

- **512-d faces collection**: ArcFace embeddings use 512-d vectors (separate from 4096-d Qwen), stored in a dedicated `faces` collection with Cosine distance, matching the existing Qdrant pattern
- **Coexistence with VISION**: `Face` model (BASTION) and `FaceWhitelist` (VISION) coexist — no migration needed. BASTION orgs use the new model; VISION orgs keep the existing one
- **Role hierarchy shift**: Existing roles shifted slightly (SUPER_ADMIN: 90, ADMIN: 60, SUPERVISOR: 45, OPERATOR: 30) to accommodate GLOBAL_ADMIN (100) and SITE_ADMIN (75) per D-03
- **Fingerprint as reference ID**: `fingerprintTemplateHash` stored as a reference identifier per D-23 — no verifiable biometric data in vault-os

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Foundation BASTION data models and shared types are ready for backend API development
- Qdrant `faces` collection CRUD methods ready for face enrollment and recognition endpoints
- Multi-site Organization hierarchy ready for parent-child RBAC and aggregate dashboard queries
- Next plan (03-03) can begin building BASTION API endpoints (face enrollment, access groups, site credential management)

---

## Self-Check: PASSED

All 6 key files exist, all 3 commits verified, Prisma validation passes, TypeScript compilation passes for both shared package and API.

---

*Phase: 03-bastion-ai-access-control*
*Completed: 2026-07-18*
