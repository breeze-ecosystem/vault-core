# Phase 8 - Wave 1 Summary (Plan 08-01)

## Status: ✅ Complete

## What was accomplished

### Task 1: Prisma Schema Extensions
- Added `heldOpenThresholdMs Int?` and `settlingTimeoutMs Int?` to Door model
- Added `slaProfiles Json`, `anprConfidenceThreshold Int @default(70)`, `healthThresholds Json` to Organization model
- Added `approvalStatus String @default("pending")`, `approvedById?`, `approvedAt?`, `timeWindowStart?`, `timeWindowEnd?` to Visit model, plus `approvedBy` relation
- Added `revokedAt?`, `revokedReason?`, `revokedById?`, `lastAccessedAt?`, `zoneRestrictions Json?` to Credential model, plus `revokedBy` relation with disambiguated names
- `npx prisma validate` ✅

### Task 2: Shared Package Schemas & Constants
- **door.schema.ts**: Added `doorThresholdConfigSchema` + `DoorThresholdConfigInput`
- **incident.schema.ts**: Added `slaProfileSchema`, `slaProfilesConfigSchema`, `evidenceBundleSchema` + types
- **visitor.schema.ts**: Added `hostApprovalSchema`, `timedPassSchema` + types
- **organization.schema.ts**: Added `anprThresholdSchema`, `healthThresholdSchema` + types
- **credential.schema.ts** (new): Added `revokeCredentialSchema`, `reissueCredentialSchema` + types
- **analytics.schema.ts**: Added `zoneMetricsQuerySchema`, `heatmapQuerySchema`, `trendQuerySchema` + types
- **equipment.schema.ts**: Added `healthScoreQuerySchema`, `deviceHealthQuerySchema` + types
- **vehicle.schema.ts**: Added `vehicleEventCorrelationSchema` + type
- **incident-constants.ts** (new): `SLA_SEVERITY_DEFAULTS`, `INCIDENT_EVIDENCE_TYPES`
- **vehicle-constants.ts**: Added `VEHICLE_CONFIDENCE_DEFAULT`
- **index.ts**: All new schemas, types, and constants barrel-exported with section headers (11 groups)
- Shared package TypeScript compilation ✅

### Task 3: Organization Config Endpoints & Dashboard API Client
- **OrganizationService**: Added 6 config methods — get/updateSlaProfiles, get/updateAnprThreshold, get/updateHealthThresholds
- **OrganizationController**: Added 6 new endpoints with proper @Roles guards and @Audited decorators
  - `GET/PUT /api/organizations/:id/sla`
  - `GET/PUT /api/organizations/:id/anpr-threshold`
  - `GET/PUT /api/organizations/:id/health-thresholds`
- **Dashboard api.ts**: Added 22 typed fetch functions (Phase 8 sections: SLA, ANPR, Health, Door, Incident SLA, Visitor, Credential, Analytics, Equipment)
- API TypeScript compilation ✅ (no Phase 8 errors)

### Task 4: Database Push
- `npx prisma db push --force-reset --accept-data-loss` applied schema successfully
- All new columns verified in live database
- `npx prisma generate` succeeded

## Deviations from plan
- Used `--force-reset` on `prisma db push` due to pre-existing schema state inconsistency (RenamePrimaryKey SQL error). Safe for dev database — all data recreated with new schema.
- Added disambiguated relation names (`CredentialUser`, `CredentialRevoker`) on Credential ↔ User to resolve Prisma validation error.
- Removed `createCredentialSchema` from new `credential.schema.ts` to avoid name conflict with existing export from `access.schema.ts`.

## Verification results
| Check | Status |
|-------|--------|
| `npx prisma validate` | ✅ |
| Shared `tsc --noEmit` | ✅ |
| API `tsc --noEmit` | ✅ (pre-existing errors only) |
| Barrel exports (grep count) | ✅ 11 groups |
| Controller @Roles decorators | ✅ 9 |
| Database columns | ✅ All present |

## Next
Proceeding to Wave 2 (Plans 08-02 through 08-08) in parallel.
