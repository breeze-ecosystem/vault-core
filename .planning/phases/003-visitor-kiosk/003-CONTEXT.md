# Phase 3: Visitor Kiosk - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Self-check-in/out touchscreen kiosk for visitors in a lobby or reception area. Visitors who were pre-registered by a host can scan their QR code (received by email) at the kiosk to check in — a thermal visitor badge prints automatically with their name, host, date, and QR code. Check-out is done by scanning the badge QR at the kiosk. The kiosk deploys as a standalone Docker container serving a Next.js SPA, with CUPS bundled for printer communication.

**Existing backend is already built:** Visitor module (`apps/api/src/modules/visitor/`) has full preregister, check-in, check-out APIs, Prisma models (Visitor, Visit), Socket.IO gateway, and Dashboard pre-registration pages. Phase 3 adds the kiosk frontend, printer integration, QR scanning, and Docker deployment.

Requirements: KIO-01, KIO-02, KIO-03, KIO-04 from REQUIREMENTS.md.

**In scope:** Check-in/out touchscreen UI, QR scanning via tablet camera, ZPL thermal badge printing via CUPS, Docker container with nginx + CUPS, host notifications on check-in.
**Out of scope:** Walk-in visitors without pre-registration, event registration links, bulk visitor import, NFC card encoding (deferred to v3.1).

</domain>

<decisions>
## Implementation Decisions

### Kiosk Technology
- **D-01:** Next.js SPA with static export (`next build` → nginx). No SSR required — the kiosk is a single-page touchscreen app.
- **D-02:** New app in the monorepo at `apps/kiosk/`. Reuses `@repo/shared`, ESLint, TypeScript config, and design tokens.
- **D-03:** nginx serves the static export in the Docker container. No Node.js runtime in the kiosk container.
- **D-04:** The Docker container runs on a server. A tablet/chromebook on the same LAN opens the kiosk URL in Chromium fullscreen kiosk mode (`--kiosk`). No browser runs inside the container.
- **D-05:** Multi-kiosk support from the start — each instance identified by a unique KIOSK_ID env var.

### Check-in Flow
- **D-06:** Primary identification is QR scan. Visitor shows the QR (received by email) on their phone to the tablet camera.
- **D-07:** Fallback: visitor searches by name, finds their visit, kiosk resends the QR to their registered email. They open it on their phone and scan.
- **D-08:** After QR scan → confirmation screen (visitor photo, name, host, company) → confirm → print.
- **D-09:** Welcome/idle screen shows two options: "Scan your QR" (large button → activate camera) and "Search by name" (→ keyboard).
- **D-10:** Check-out: scan badge QR only. No confirmation tap needed — immediate check-out.
- **D-11:** Post check-in: show "Badge printing..." → when done, show "Welcome! Your badge is ready."
- **D-12:** Auto-reset to welcome screen after 60s idle. Mid-flow timeout after 30s inactivity on any screen cancels the session.

### Walk-in Visitors
- **D-13:** Kiosk is pre-registration only. No walk-in support. Visitors must be pre-registered by a host before they can check in at the kiosk.

### Badge Printing
- **D-14:** Thermal label (ZPL/EPL) — sticky badge, fast and cheap. No color printing.
- **D-15:** Badge content: visitor name, host name, date/time, QR code. No photo on the badge.
- **D-16:** Server-side printing via CUPS running in the kiosk Docker container. Kiosk SPA calls the NestJS API → generates ZPL → sends to CUPS → network printer.
- **D-17:** Printer is a network printer (IP on LAN), not USB. CUPS configured with printer IP at deploy time.
- **D-18:** On printer error (out of paper, unreachable): show error screen with Retry button. Check-in does not complete until badge prints.

### QR Scanning
- **D-19:** Tablet camera via WebRTC (`getUserMedia`). No dedicated scanner hardware.
- **D-20:** Library: `instascan` — lightweight browser QR scanning.

### Kiosk Deployment
- **D-21:** Authentication via Organization API key, set as `API_KEY` env var. Always-on, no login screen. Uses existing API key module.
- **D-22:** Configuration via environment variables: `SITE_ID`, `API_URL`, `PRINTER_IP`, `KIOSK_ID`, `ORGANIZATION_ID`. No admin dashboard config panel needed.

### Notifications
- **D-23:** On check-in: host receives real-time notification (Socket.IO, existing visitor gateway) + email (via Resend, existing integration).
- **D-24:** On check-out: no notification. Silent check-out.
- **D-25:** No host approval required — check-in is automatic on QR scan + confirm.

### Photo
- **D-26:** Photo comes from pre-registration (visitor.photoUrl). Kiosk never captures photos at check-in. Badge does not include photo.

### Language
- **D-27:** French primary + English toggle on the welcome screen.

### Agent's Discretion
- QR library details (instascan integration, camera handling)
- ZPL template design for badge layout
- CUPS printer driver configuration in Docker
- Email template for check-in notification
- nginx config structure for the Docker container
- Idle/timeout implementation (30s mid-flow, 60s welcome)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements & Context
- `.planning/ROADMAP.md` — Phase 3 definition, success criteria, dependency on Phase 1
- `.planning/REQUIREMENTS.md` — KIO-01 through KIO-04 requirement descriptions

### Existing Visitor Module (must-read — already built)
- `apps/api/src/modules/visitor/visitor.service.ts` — Full preregister, checkIn, checkOut, cancelVisit, listVisits, getVisit, listVisitors, getVisitor
- `apps/api/src/modules/visitor/visitor.controller.ts` — REST endpoints: POST preregister, POST check-in, POST check-out, POST cancel, GET visits/visitors
- `apps/api/src/modules/visitor/visitor.gateway.ts` — Socket.IO `/ws/visitors` namespace, events: preregistered, checked-in, checked-out, cancelled
- `apps/api/src/modules/visitor/visitor.module.ts` — Module registration in AppModule
- `apps/api/prisma/schema.prisma` lines 312-358 — Visitor and Visit models (Visitor: id, firstName, lastName, email, phone, company, photoUrl; Visit: id, visitorId, hostUserId, purpose, validFrom, validUntil, credentialId, checkedInAt, checkedOutAt, status, zoneRestrictions)
- `packages/shared/src/schemas/visitor.schema.ts` — preregisterSchema, checkInSchema, checkOutSchema, visitorQuerySchema
- `packages/shared/src/types/visitor.types.ts` — VisitorDto, VisitDto interfaces

### Codebase Architecture
- `.planning/codebase/STACK.md` — Language/runtime versions, Docker images, existing dependencies
- `.planning/codebase/CONVENTIONS.md` — File naming, component patterns, import organization
- `.planning/codebase/ARCHITECTURE.md` — System overview, API patterns, MQTT/event flow

### Existing Implementation (patterns to follow)
- `apps/api/src/modules/auth/api-key.strategy.ts` — API key auth pattern for kiosk authentication
- `apps/api/src/modules/notification/` — Existing notification module patterns (email via Resend)
- `apps/dashboard/app/(dashboard)/visiteurs/preinscription/page.tsx` — Existing visitor pre-registration form UI patterns
- `.env.example` — Env var patterns for API_URL, SITE_ID, etc.

### Configuration
- `.planning/phases/01-infrastructure-foundation/01-CONTEXT.md` — Phase 1 Docker patterns (host networking, device passthrough, Compose setup)
- `.planning/phases/02-hardware-integration/02-CONTEXT.md` — Phase 2 hardware integration patterns for reference

No external specs — requirements fully captured in REQUIREMENTS.md and decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Visitor module** (`apps/api/src/modules/visitor/`) — Complete backend for preregister, check-in, check-out. No new API endpoints needed for basic flows.
- **Visitor Gateway** (`visitor.gateway.ts`) — Socket.IO namespace with events for checked-in, checked-out. Host gets real-time notification automatically.
- **API Key module** (`apps/api/src/modules/api-key/`) — Existing API key auth. Kiosk uses this pattern (D-21).
- **Notification module** (`apps/api/src/modules/notification/`) — Email via Resend already integrated. Reuse for check-in notification email.
- **Dashboard visitors pages** (`visiteurs/`) — Pre-registration form UI, visitor list — design patterns to follow for kiosk SPA.

### Established Patterns
- **Next.js static export** — Simple build output served by nginx. No Node.js server needed in production.
- **Docker Compose with env vars for config** — All kiosk configuration via env vars (D-22), matching existing patterns.
- **API client pattern** — `fetchWithAuth()` in dashboard, kiosk uses API key header instead.

### Integration Points
- **Kiosk SPA → NestJS API** — POST `/api/visitors/visits/:id/check-in`, POST `/api/visitors/visits/:id/check-out`, GET `/api/visitors/visits`, GET `/api/visitors/visitors` (name search). All with API key auth.
- **Kiosk Docker → CUPS** — CUPS daemon in kiosk container. API calls generate ZPL and send via CUPS/lpr to network printer.
- **Existing Docker Compose** — Add `kiosk` service definition alongside existing api/dashboard services. Site-specific env vars.

### Creative Opportunities
- The kiosk Docker image (nginx + CUPS) can be a reusable pattern for future hardware-touchpoint containers.
- instascan + WebRTC QR scanning can work on any device with a camera — no special drivers needed.
- ZPL templates can be stored in the shared package for reuse by other components (e.g., if security desk wants to reprint badges).
</code_context>

<specifics>
## Specific Ideas

- Event/on-site badge creation discussed but deferred to v3.1 — concept: event host generates a code, kiosk visitor enters code to create a basic badge on the spot without pre-registration.
- No specific external references — user delegated technical implementation to the agent.
</specifics>

<deferred>
## Deferred Ideas

- **Event badge creation (v3.1):** Kiosk support for on-site badge creation tied to an event/host code. Visitors who did not pre-register can enter an event code and create a basic badge with limited privileges. Requires event model and code generation in Dashboard.
- **Bulk visitor registration via shareable link (v3.1):** Host generates a registration link, visitors self-register, kiosk handles check-in flow.

</deferred>

---

*Phase: 3-Visitor Kiosk*
*Context gathered: 2026-07-17*
