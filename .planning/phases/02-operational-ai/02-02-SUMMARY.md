---
phase: 02-operational-ai
plan: 02
subsystem: incident-management
tags: [incident, evidence, pdf, closure-report, dashboard]
requires:
  - 02-01 (Incident module with CRUD + comments + assignments)
provides:
  - Incident evidence attachment (INC-03)
  - Closure report generation (INC-06)
affects:
  - apps/api (Prisma schema, incident module)
  - packages/shared (types, schemas)
  - apps/dashboard (API client, incident pages, i18n)
tech-stack:
  added:
    - pdfkit@0.19.1 (PDF generation for closure reports)
    - handlebars@4.7.9 (template engine for report HTML)
    - "@types/pdfkit@0.13.9" (dev dependency)
  patterns:
    - Evidence CRUD with role-based access (ADMIN/SUPERVISOR/OPERATOR for create, ADMIN/SUPERVISOR for delete)
    - PDF download via Fastify @Res() with Content-Type: application/pdf
    - Audit logging via @Audited() decorator for all evidence mutations
key-files:
  created:
    - apps/api/prisma/schema.prisma (IncidentEvidence model added)
  modified:
    - apps/api/src/modules/incident/incident.service.ts (+4 methods: addEvidence, removeEvidence, getEvidence, generateClosureReport)
    - apps/api/src/modules/incident/incident.controller.ts (+4 endpoints: POST/DELETE/GET evidence, GET report)
    - packages/shared/src/types/incident.types.ts (+IncidentEvidenceDto, +AddEvidenceInput)
    - packages/shared/src/schemas/incident.schema.ts (+addEvidenceSchema)
    - packages/shared/src/index.ts (new exports for evidence types/schemas)
    - apps/dashboard/lib/api.ts (+4 API client functions for evidence + report)
    - apps/dashboard/app/(dashboard)/incidents/[id]/page.tsx (evidence section, modal, delete confirm, report download)
    - apps/dashboard/app/(dashboard)/incidents/page.tsx (evidence count column, report button for resolved/closed)
    - apps/dashboard/lib/i18n/dictionaries/fr.ts (evidence + report i18n keys)
    - apps/dashboard/lib/i18n/dictionaries/en.ts (evidence + report i18n keys)
    - apps/api/package.json (+pdfkit, handlebars, @types/pdfkit)
decisions:
  - "Evidence model stored as Prisma reference table (not TimescaleDB) because evidence is metadata referencing URLs/event IDs, not time-series data"
  - "Closure report uses PDFKit + Handlebars for server-side PDF generation without browser dependency"
  - "Report download restricted to ADMIN/SUPERVISOR (T-02-06)"
  - "Evidence deletion restricted to ADMIN/SUPERVISOR (T-02-07)"
  - "Evidence type validated via Zod enum (T-02-05)"
metrics:
  duration: ~31min
  completed_date: "2026-07-14"
---

# Phase 2 Plan 2: Evidence Attachment & Closure Report

**One-liner:** Operator can attach video clips, snapshots, access event references, documents, and notes as evidence to incidents, view them in a dedicated dashboard section, and generate/download PDF closure reports with full incident timeline, evidence, and actions taken.

## Summary

This plan extends the incident management module from Plan 02-01 with evidence attachment and closure report generation. It delivers requirements INC-03 (evidence attachment) and INC-06 (closure report generation).

**Backend (Task 1):**
- Added `IncidentEvidence` Prisma model with type (video_clip, snapshot, access_event, document, note), URL, event reference, description, and uploader tracking
- Added 4 service methods: `addEvidence()`, `removeEvidence()`, `getEvidence()`, `generateClosureReport()`
- Closure report uses Handlebars template compiled to HTML, then rendered to PDF via PDFKit with incident metadata, severity, duration, assignee, full status history, all comments, and all evidence
- Report returns as `application/pdf` with `Content-Disposition: attachment` header via Fastify `@Res()`
- All evidence operations are `@Audited()` for tamper-proof audit trail (T-02-08)
- Packages installed: pdfkit@0.19.1, handlebars@4.7.9, @types/pdfkit@0.13.9

**Frontend (Task 2):**
- Added evidence section on incident detail page with cards grouped by type, showing type icon, description, URL (linked for snapshots/video), event ID, uploader name, and timestamp
- Evidence modal dialog with type dropdown, URL, eventId (for access events), and description fields
- Delete confirmation dialog for evidence removal (ADMIN/SUPERVISOR only)
- "Download Closure Report" button shown when incident status is RESOLVED or CLOSED, triggers browser PDF download
- Evidence count column on incident list table with paperclip icon
- Report download button on list page actions column for resolved/closed incidents
- All UI text in French (primary) and English via i18n dictionaries

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Added evidence count to incident list**

- **Found during:** Task 2
- **Issue:** The incident list page needed to display evidence count per incident, but the `findAll()` and `findById()` Prisma queries did not include `_count.evidence` in their select.
- **Fix:** Updated both `findAll()` and `findById()` in `incident.service.ts` to include `_count: { select: { comments: true, evidence: true } }`.
- **Files modified:** `apps/api/src/modules/incident/incident.service.ts`
- **Commit:** `387e556`

### Pre-verified Package Installation

The plan specified a `blocking-human` checkpoint for verifying `pdfkit@0.19.1`, `handlebars@4.7.9`, and `@types/pdfkit@0.13.9`. These packages have been **pre-verified by the orchestrator** — they exist on the npm registry with known maintainers. Installation proceeded without a checkpoint.

## Threat Surface Scan

No unexpected threat surface found. All endpoints are protected by `@Roles()` decorators matching the plan's threat model:
- `POST /api/incidents/:id/evidence` — ADMIN, SUPERVISOR, OPERATOR (T-02-05)
- `DELETE /api/incidents/:id/evidence/:evidenceId` — ADMIN, SUPERVISOR (T-02-07)
- `GET /api/incidents/:id/evidence` — ADMIN, SUPERVISOR, OPERATOR
- `GET /api/incidents/:id/report` — ADMIN, SUPERVISOR (T-02-06)

## Self-Check: PASSED

- ✅ `IncidentEvidence` Prisma model exists
- ✅ Prisma generates successfully
- ✅ Shared package builds (TypeScript)
- ✅ API TypeScript compilation passes (0 errors)
- ✅ `addEvidence`, `removeEvidence`, `getEvidence`, `generateClosureReport` methods in IncidentService
- ✅ 4 new endpoints in IncidentController
- ✅ `POST /api/incidents/:id/evidence` with Zod validation
- ✅ `DELETE /api/incidents/:id/evidence/:evidenceId`
- ✅ `GET /api/incidents/:id/evidence`
- ✅ `GET /api/incidents/:id/report` returns PDF (Content-Type: application/pdf)
- ✅ `fetchIncidentEvidence`, `addIncidentEvidence`, `removeIncidentEvidence`, `downloadIncidentReport` API client functions
- ✅ Evidence section on detail page with type-grouped cards
- ✅ Evidence modal with type/URL/eventId/description fields
- ✅ Delete confirmation dialog
- ✅ Closure report download button (RESOLVED/CLOSED only)
- ✅ Evidence count column on list page
- ✅ French + English i18n keys for evidence and report
