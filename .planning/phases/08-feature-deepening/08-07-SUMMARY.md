# Phase 8 - Plan 08-07 Summary (Equipment Health)

## Status: ✅ Complete

## API Changes
- Added `getSiteHealthScores(orgId)` — computes weighted average health score (0-100) across cameras and readers with healthy/degraded/critical breakdown
- Added `getDeviceHealth(orgId, deviceType?)` — returns per-device metrics and scores filtered by type
- Controller: `GET /equipment/health`, `GET /equipment/devices`

## Verification
- ✅ API TypeScript compilation clean
