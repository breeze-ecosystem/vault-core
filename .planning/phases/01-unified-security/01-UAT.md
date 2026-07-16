---
status: testing
phase: 01-unified-security
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
  - 01-04-SUMMARY.md
started: "2026-07-16T11:00:00Z"
updated: "2026-07-16T11:05:00Z"
---

## Current Test

number: 2
name: Credential List Page
expected: |
  Navigate to /acces on the dashboard — DataTable renders with columns (user, type, identifier, status, validity, actions), type filter dropdown works, row click navigates to detail page.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server. Start the application from scratch. Server boots without errors, migrations run, and the API health check returns live data.
result: pass
note: "API was running:unhealthy due to wrong health check path (/api/health instead of /health). Fixed path in Coolify config and restarted. API now healthy."

### 2. Credential List Page
expected: Navigate to /acces on the dashboard — DataTable renders with columns (user, type, identifier, status, validity, actions), type filter dropdown works, row click navigates to detail page.
result: [pending]

### 3. Credential Detail Page
expected: Navigate to /acces/[id] — Shows full credential details card (type, identifier, status, user, validity, usage count), access levels table with zone/schedule/priority, QR code generation for QR-type credentials, deactivate button with confirmation.
result: [pending]

### 4. Door Status Dashboard
expected: Navigate to /portes — Color-coded door state cards render with live state indicators, Socket.IO pushes state updates in real time, zone filter present, held-open counter visible.
result: [pending]

### 5. Emergency Controls
expected: Emergency controls modal opens from /portes — lockdown/unlock/clear per zone actions available, confirmation flow works, state updates reflect immediately after action.
result: [pending]

### 6. Timeline Dashboard
expected: Navigate to /chronologie — Vertical timeline with colored event dots (green=granted, red=denied, blue=door, orange=forced), event cards show door name, zone, summary, relative timestamp, real-time Socket.IO stream pushes new events.
result: [pending]

### 7. Timeline Video Correlation
expected: Click an event in the timeline — video panel slides in with snapshot thumbnail, metadata, and camera link.
result: [pending]

### 8. Timeline Search & Filter
expected: Expand search filter panel — time range, door, zone, credential, decision dropdowns work. Results paginate via "Charger plus" infinite scroll. "Retour au direct" returns to live stream.
result: [pending]

### 9. Audit Log Tab
expected: Navigate to /audit — Log tab shows filterable table with color-coded action badges (CREATE=green, UPDATE=blue, DELETE=red, _FAILED=orange), expandable rows show hash + previous_hash + changes JSON, filters for entity type, action, user, date range.
result: [pending]

### 10. Chain Verification Tab
expected: Chain Verification tab — entity type selector + UUID input, "Vérifier l'intégrité" button, result shows green/red integrity status, visual dot chain representation, genesis and latest hash display.
result: [pending]

### 11. Export Tab
expected: Export tab — same filters + JSON/CSV format selector, triggers browser download with timestamped filename.
result: [pending]

### 12. Sidebar Navigation
expected: Sidebar shows "Accès" (Key icon, ADMIN+), "Portes" (DoorOpen icon, all roles), "Chronologie" (Clock icon, all roles), "Audit" (Shield icon, ADMIN only) nav items.
result: [pending]

## Summary

total: 12
passed: 1
issues: 0
pending: 11
skipped: 0
blocked: 0

## Gaps
