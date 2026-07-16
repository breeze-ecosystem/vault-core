# Phase 8 - Plan 08-02 Summary (Door Hardening)

## Status: ✅ Complete

## API Changes
- Added `getThresholdConfigs`, `updateThresholdConfig` methods to DoorService
- Door state machine reads per-door `heldOpenThresholdMs` and `settlingTimeoutMs` columns with DEFAULT_ALERT_CONFIG fallback
- Sequence dedup now persists to Redis (`door:seq:*`) for restart survival
- Added `restoreSequences()` for startup recovery
- Controller: `PATCH /doors/:id/thresholds` (Admin), `GET /doors/thresholds`
- `updateThresholdConfig` writes to both dedicated columns and `alertConfig` JSON for backward compat

## Dashboard
- Created `DoorThresholdConfig` component with sliders (100-30000ms, 100-60000ms), save/reset buttons, French labels
- Updated Portes page to use DoorThresholdConfig replacing old alert config modal

## Mobile
- `apps/mobile/lib/api.ts`: Added `fetchMyIncidents`, `fetchMobileIncident`, `updateMobileIncidentStatus`

## Verification
- ✅ API TypeScript compilation (Phase 8 only)
- ✅ Prisma schema validated
