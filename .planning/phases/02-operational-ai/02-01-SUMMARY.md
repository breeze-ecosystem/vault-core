---
phase: 02-operational-ai
plan: 01
subsystem: incident-management
tags: [incident, state-machine, slas, auto-triage, real-time, dashboard]
requires:
  - 01-unified-security (Alert model, Prisma, BullMQ, Socket.IO patterns)
provides:
  - Incident Management API (REST + WebSocket)
  - Incident lifecycle state machine (5-status)
  - Auto-triage from HIGH/CRITICAL alerts
  - SLA escalation via BullMQ delayed jobs
  - Incident dashboard (list, detail, create)
  - TimescaleDB incident_events hypertable
affects:
  - apps/api (new module, package dependency, queue registration)
  - packages/shared (new schemas, types, constants)
  - apps/dashboard (new pages, nav, i18n)
tech-stack:
  added:
    - "@nestjs/schedule@6.1.3" (Scheduled task support — installed for future use)
  patterns:
    - "NestJS module: controller + service + gateway + processor"
    - "BullMQ incident-alerts queue with auto-triage and SLA-escalation jobs"
    - "Event bus: incident.created / incident.status-changed / incident.assigned / incident.comment-added / incident.escalated"
    - "Socket.IO namespace /ws/incidents with site/incident subscription rooms"
    - "IncidentStateMachine following DoorStateMachine pattern (VALID_TRANSITIONS map)"
    - "Redis dedup for auto-triage (1h TTL key incident:autotriage:dedup:{alertId})"
key-files:
  created:
    - apps/api/src/modules/incident/* (full module: state machine, service, controller, gateway, processor)
    - apps/api/migrations/timescaledb/up/007_incident_events.sql
    - packages/shared/src/constants/incident-status.ts
    - packages/shared/src/schemas/incident.schema.ts
    - packages/shared/src/types/incident.types.ts
    - apps/dashboard/app/(dashboard)/incidents/page.tsx
    - apps/dashboard/app/(dashboard)/incidents/[id]/page.tsx
    - apps/dashboard/app/(dashboard)/incidents/nouveau/page.tsx
  modified:
    - apps/api/prisma/schema.prisma (4 new models, User/Alert/Site relations)
    - apps/api/src/app.module.ts (ScheduleModule, IncidentModule imports)
    - apps/api/src/modules/queue/queue.module.ts (incident-alerts queue)
    - apps/api/package.json (@nestjs/schedule dependency)
    - packages/shared/src/index.ts (incident exports)
    - apps/dashboard/lib/api.ts (incident API functions)
    - apps/dashboard/lib/nav-config.ts (Incidents nav item)
    - apps/dashboard/lib/i18n/dictionaries/fr.ts (incidents section)
    - apps/dashboard/lib/i18n/dictionaries/en.ts (incidents section)
decisions:
  - "Incident state machine uses string enum (open/triage/investigating/resolved/closed) stored as String in Prisma for queryability"
  - "SLA configuration stored on Incident model (slaMinutes + escalationChain JSON) — no env vars needed"
  - "Auto-triage only processes HIGH/CRITICAL alerts with Redis dedup (1h TTL) per T-02-03 mitigation"
  - "Auto-triage listener is in IncidentService; auto-triage job execution is in IncidentProcessor (separation of concerns)"
  - "SLA timers re-evaluated on server startup via OnModuleInit to handle Pitfall 1 (timer loss on restart)"
metrics:
  duration: 38min
  completed_date: "2026-07-14T17:38:00Z"
  tasks: 3
  files_created: 11
  files_modified: 9
  commits: 3
---

# Phase 2 Plan 01: Incident Management Core — Summary

**Incident management vertical slice delivering full lifecycle enforcement (OPEN→TRIAGE→INVESTIGATING→RESOLVED→CLOSED) with state machine, REST API, real-time WebSocket updates, auto-triage from HIGH/CRITICAL alerts, SLA escalation via BullMQ delayed jobs, and a complete dashboard UI with list, detail, and creation pages.**

## Tasks Executed

### Task 1: Database Models, Infrastructure & Package Installation
- Installed `@nestjs/schedule@6.1.3` (pre-verified npm package)
- Added 4 Prisma models: Incident, IncidentComment, IncidentAssignment, IncidentEscalation
- Added relations to User (assignedIncidents, incidentComments, etc.), Alert (incidents), and Site (incidents)
- Created `007_incident_events.sql` TimescaleDB hypertable migration with compression, retention, and indexes
- Registered `ScheduleModule.forRoot()` and `IncidentModule` in AppModule
- Added `incident-alerts` queue to QueueModule

### Task 2: Incident State Machine, Shared Types & API Module
- **IncidentStateMachine**: 5-status lifecycle map (VALID_TRANSITIONS) with validateTransition() throwing BadRequestException on invalid transitions
- **IncidentService**: 10 methods — CRUD (create/findAll/findById), transitionStatus with state machine validation, assignIncident with SLA timer scheduling, comment management (addComment/getComments), history (getAssignmentHistory/getStatusHistory), OnModuleInit SLA re-evaluation, auto-triage event bus listener
- **IncidentController**: 8 REST endpoints (POST/GET /incidents, GET /incidents/:id, PATCH status, POST assign, POST comments, GET comments, GET history) with role protection
- **IncidentGateway**: Socket.IO namespace `/ws/incidents` with site/incident subscription rooms and 5 event emissions
- **IncidentProcessor**: BullMQ worker for `auto-triage` (alert→incident with TimescaleDB logging) and `sla-escalation` (delayed escalation jobs)
- **Shared package**: INCIDENT_STATUS constant, Zod schemas (create, update status, assign, add comment, query), TypeScript types (IncidentDto, IncidentCommentDto, etc.)

### Task 3: Incident Management Dashboard
- Added 8 API client functions to `apps/dashboard/lib/api.ts` with typed interfaces
- **List page** (`/incidents`): DataTable with severity/status badges, title, assignee, age, comment count, actions; filterable by status and severity; "Nouvel incident" button
- **Detail page** (`/incidents/[id]`): Full incident view with status timeline, description/details card, comments section with add form, assignment card with modal, SLA indicator, and valid transition buttons per state machine
- **New incident page** (`/incidents/nouveau`): Form with title, severity dropdown, description textarea, site selector, source type radio buttons
- Navigation sidebar updated with "Incidents" link
- i18n dictionaries updated (French primary, English fallback)

## Threat Mitigation Verification

| Threat ID | Category | Disposition | Status |
|-----------|----------|-------------|--------|
| T-02-01 | Tampering | State machine enforces valid transitions server-side | ✅ Mitigated — IncidentStateMachine.validateTransition() throws BadRequestException on invalid transitions |
| T-02-02 | Information Disclosure | Site-scoped queries via user.siteId | ✅ Mitigated — findAll() and controller pass user.siteId filter |
| T-02-03 | Denial of Service | Redis dedup for auto-triage + severity filter | ✅ Mitigated — only HIGH/CRITICAL trigger auto-triage; 1h dedup TTL |
| T-02-04 | Elevation of Privilege | Role-based endpoint protection | ✅ Mitigated — status transitions require ADMIN/SUPERVISOR; OPERATOR can create/comment |
| T-02-SC | Supply Chain | Package install via npm registry | ✅ Mitigated — blocking-human checkpoint passed |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all components are fully implemented. The Evidence section on the detail page shows "no evidence" as intentional (Plan 02 will add evidence integration).

## Threat Flags

None — all new endpoints are behind auth guard + role decorator, consistent with existing patterns.

## Self-Check: PASSED

- [x] All 19 created/modified files verified on disk
- [x] All 3 commits exist in git log
- [x] Prisma schema validates successfully
- [x] `@nestjs/schedule@6.1.3` in dependencies
- [x] `ScheduleModule.forRoot()` in AppModule imports
- [x] `incident-alerts` queue registered
- [x] TypeScript compilation passes: shared, API, dashboard
- [x] State machine validates 5-status lifecycle
- [x] 8 controller endpoints with role decorators
- [x] Dashboard has 3 new pages
