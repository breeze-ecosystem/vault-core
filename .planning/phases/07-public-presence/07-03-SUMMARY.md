---
phase: 07-public-presence
plan: 03
subsystem: api
tags: [nestjs, prisma, cloudflare, turnstile, resend, contact-form, zod]

requires:
  - phase: 04-commercial-foundation
    plan: 08
    provides: PrismaService, NotificationModule pattern
  - phase: 04-commercial-foundation
    plan: 05
    provides: JWT auth guards, @Public() decorator pattern

provides:
  - Shared Zod contact form schema (contactSchema + ContactInput type)
  - ContactSubmission Prisma model and migration
  - ContactModule with controller, service, and Turnstile server-side verification
  - POST /api/contact public endpoint with rate limiting
  - Database persistence of contact submissions
  - Resend email notification to sales team

affects: [07-04 (marketing site frontend), 07-05 (marketing pages)]

tech-stack:
  added: []
  patterns:
    - Public POST endpoint with ZodValidationPipe for contact form submissions
    - Turnstile server-side verification via challenges.cloudflare.com API
    - Direct Resend SDK initialization for transactional email from service

key-files:
  created:
    - packages/shared/src/schemas/contact.schema.ts
    - apps/api/src/modules/contact/contact.module.ts
    - apps/api/src/modules/contact/contact.controller.ts
    - apps/api/src/modules/contact/contact.service.ts
    - apps/api/prisma/migrations/20260716000000_add_contact_submission/migration.sql
  modified:
    - packages/shared/src/index.ts
    - apps/api/prisma/schema.prisma
    - apps/api/src/app.module.ts

key-decisions:
  - "Added ContactSubmission model to Prisma schema (Rule 2) — plan required DB storage but model did not exist; created as non-tenant-scoped model since marketing contact form is public"
  - "Used Resend SDK directly in ContactService (same pattern as InviteService) — avoids depending on either NotificationService (push-only) or NotificationsService (alert-focused), both of which lack a generic send-email method"
  - "Controller returns 200 OK with { success: true } instead of 201 Created — matches plan's must_haves and allows idempotent handling on the marketing site"

requirements-completed: [WEB-06]

duration: 7 min
completed: 2026-07-16
---

# Phase 7 Plan 03: Contact Form Backend — Summary

**Contact form API endpoint with Turnstile spam protection, database persistence, and Resend email notification to sales team**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-16T00:41:03Z
- **Completed:** 2026-07-16T00:48:23Z
- **Tasks:** 3
- **Files modified:** 8 (5 created, 3 modified)

## Accomplishments

- Created shared Zod schema (`contactSchema`) with name, email, optional company, message, and turnstileToken validation
- Added ContactSubmission Prisma model with migration SQL for database persistence
- Built ContactModule with NestJS module, controller, and service
- Implemented Turnstile server-side token verification (POST to challenges.cloudflare.com)
- Stored valid submissions in ContactSubmission table
- Integrated Resend email notification to configured CONTACT_NOTIFICATION_EMAIL
- Registered ContactModule in AppModule with @Public() endpoint at POST /api/contact

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared contact form Zod schema** - `082b8d9` (feat)
2. **Task 2: Create ContactModule with Turnstile, DB persistence, and Resend email** - `806ec8e` (feat)
3. **Task 3: Register ContactModule in AppModule** - `cdcd586` (feat)

## Files Created/Modified

- `packages/shared/src/schemas/contact.schema.ts` — Zod schema for contact form validation (name, email, company?, message, turnstileToken)
- `packages/shared/src/index.ts` — Barrel export of contactSchema and ContactInput
- `apps/api/src/modules/contact/contact.module.ts` — NestJS module importing PrismaModule
- `apps/api/src/modules/contact/contact.controller.ts` — @Public() POST /api/contact endpoint with ZodValidationPipe
- `apps/api/src/modules/contact/contact.service.ts` — Service with Turnstile verification, DB create, Resend email notification
- `apps/api/prisma/schema.prisma` — Added ContactSubmission model (name, email, company?, message, createdAt)
- `apps/api/prisma/migrations/20260716000000_add_contact_submission/migration.sql` — Migration SQL for ContactSubmission table with indexes on email and createdAt
- `apps/api/src/app.module.ts` — Registered ContactModule in imports array

## Decisions Made

- **Added ContactSubmission model to Prisma schema (Rule 2 deviation):** The plan required DB storage for submissions but the model did not exist. Created as a non-tenant-scoped model since the marketing contact form is a public endpoint with no organization context.
- **Used Resend SDK directly:** The plan referenced `NotificationService` for email sending, but `NotificationService` (notification module) is push-notification only, and `NotificationsService` (notifications module) is alert-focused. Following the `invite.service.ts` pattern of direct Resend SDK initialization was the cleanest approach.
- **Controller returns 200 OK:** Returns `{ success: true }` with 200 status (not 201) — matches the plan's must_haves and allows the marketing site to handle responses idempotently.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added ContactSubmission Prisma model**

- **Found during:** Task 2 (Creating ContactModule)
- **Issue:** Plan's must_haves states "Valid submissions are stored in the database (ContactSubmission model)" but the ContactSubmission model did not exist in schema.prisma. Without it, the service's `prisma.contactSubmission.create()` call would fail at runtime.
- **Fix:** Added `model ContactSubmission` to schema.prisma with fields: id, name, email, company?, message, createdAt + indexes on email and createdAt. Created migration SQL with `CREATE TABLE "ContactSubmission"` statement.
- **Files modified:** `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20260716000000_add_contact_submission/migration.sql`
- **Verification:** grep confirms model exists in schema.prisma, migration SQL file exists with CREATE TABLE statement
- **Committed in:** `806ec8e` (Task 2 commit)

**2. [Rule 2 - Missing Critical] Used direct Resend SDK instead of NotificationService**

- **Found during:** Task 2 (Creating ContactModule)
- **Issue:** Plan's task action specified "Send email via NotificationService (Resend) to configured sales notification address" but `NotificationService` in `apps/api/src/modules/notification/notification.service.ts` handles only push notifications (FCM) — it has no email sending capability. The `NotificationsService` in `apps/api/src/modules/notifications/notifications.service.ts` has Resend wired but is focused on alert notifications with no generic send-email method.
- **Fix:** Used direct Resend SDK initialization in contact.service.ts (same pattern as `invite.service.ts`) — injects API key from ConfigService, creates Resend instance in constructor, sends HTML email via `resend.emails.send()`.
- **Files modified:** `apps/api/src/modules/contact/contact.service.ts`
- **Verification:** Service includes `resend.emails.send()` call with proper HTML template
- **Committed in:** `806ec8e` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both fixes essential for correctness — DB model required per plan spec, email sending needed working service. No scope creep.

## Issues Encountered

- None — plan executed cleanly with expected deviations noted above.

## User Setup Required

**New environment variables needed:**
- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile secret key for server-side verification
- `CONTACT_NOTIFICATION_EMAIL` — Email address to receive contact form submissions
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` — Already required for invite functionality; reused for contact notifications

These should be added to production `.env` before deploying the ContactModule.

## Next Phase Readiness

- Contact form API endpoint is ready at POST /api/contact
- Prisma migration needs to be applied (`prisma migrate deploy`) before the endpoint can store submissions
- Ready for Phase 7 Plan 04: Marketing site contact form frontend integration — the frontend can POST to `/api/contact` with the Turnstile token and field data
- Threat model mitigations implemented: Turnstile (T-07-05 Spoofing), Zod schema validation (T-07-06 Tampering), rate limiting inherited from existing @fastify/rate-limit config (T-07-07 DoS)

---

## Self-Check: PASSED

- [x] All 3 tasks executed and committed
- [x] `packages/shared/src/schemas/contact.schema.ts` — exists with contactSchema export
- [x] `packages/shared/src/index.ts` — re-exports contactSchema and ContactInput
- [x] `apps/api/src/modules/contact/contact.module.ts` — exists, imports PrismaModule, exports ContactModule
- [x] `apps/api/src/modules/contact/contact.controller.ts` — @Controller('contact'), @Public(), @Post(), ZodValidationPipe(contactSchema)
- [x] `apps/api/src/modules/contact/contact.service.ts` — PrismaService + ConfigService injection, Turnstile verify, DB create, Resend email
- [x] `apps/api/prisma/schema.prisma` — ContactSubmission model added
- [x] `apps/api/prisma/migrations/20260716000000_add_contact_submission/migration.sql` — CREATE TABLE with indexes
- [x] `apps/api/src/app.module.ts` — ContactModule imported and registered
- [x] All 3 commits present in git log
- [x] SUMMARY.md created with substantive content

---

*Phase: 07-public-presence*
*Completed: 2026-07-16*
