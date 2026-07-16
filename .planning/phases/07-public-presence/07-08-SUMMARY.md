---
phase: 07-public-presence
plan: 08
subsystem: marketing
tags: [contact, turnstile, form, nextjs, lucide-react]

# Dependency graph
requires:
  - phase: 07-public-presence
    plan: 04
    provides: Marketing app structure, shared layout components (Header, Footer, PageHeader, CTASection, Container)
  - phase: 07-public-presence
    plan: 05
    provides: UI patterns, styling conventions, cn utility
provides:
  - Contact form with Name, Email, Company (optional), Message fields
  - Cloudflare Turnstile invisible spam protection
  - Client-side form validation
  - Contact API client (submitContact)
  - Contact page composing form into full page layout
affects: [07-09, NestJS API contact endpoint phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TurnstileWidget with forwardRef/useImperativeHandle for imperative reset
    - Form state management with idle/loading/success/error states
    - Client-side validation with per-field error tracking
    - Inline error banner with auto-dismiss timer

key-files:
  created:
    - apps/marketing/src/lib/turnstile.ts
    - apps/marketing/src/lib/contact.ts
    - apps/marketing/components/contact/form-field.tsx
    - apps/marketing/components/contact/turnstile-widget.tsx
    - apps/marketing/components/contact/error-message.tsx
    - apps/marketing/components/contact/success-message.tsx
    - apps/marketing/components/contact/contact-form.tsx
    - apps/marketing/app/[locale]/contact/page.tsx
  modified: []

key-decisions:
  - "Followed plan exactly — Turnstile invisible widget wraps Cloudflare's API with loadTurnstileScript helper"
  - "submitContact in contact.ts uses typed ContactFormData and ContactResponse interfaces"
  - "Form state machine: idle → loading (submit) → success or error (with turnstile reset on error)"

requirements-completed: [WEB-06, WEB-08]

# Metrics
duration: 2min
completed: 2026-07-16
---

# Phase 07: Public Presence — Plan 08 Summary

**Contact/demo request form with Turnstile spam protection, client-side validation, success/error states, and SSG page layout**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-16T01:05:00Z
- **Completed:** 2026-07-16T01:06:40Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Turnstile helper (`turnstile.ts`) — exports `TURNSTILE_SITE_KEY`, `loadTurnstileScript()`, `TURNSTILE_SCRIPT_ID` with dynamic script loading and global `turnstile` type declaration
- Contact API client (`contact.ts`) — exports `submitContact()` that POSTs typed form data to `/api/contact`, handles 429 rate-limit errors, parses error body
- `form-field.tsx` — Reusable form field with label, required asterisk, input/textarea, error message with aria-describedby, focus styles (cyan border 200ms transition)
- `turnstile-widget.tsx` — Cloudflare Turnstile invisible widget wrapper using forwardRef/useImperativeHandle for `reset()`, loads script on mount, renders Turnstile in container div
- `error-message.tsx` — Inline error banner with red left border, AlertCircle icon, auto-dismiss after 10s
- `success-message.tsx` — Green success state with CheckCircle2 icon and "Message sent!" confirmation
- `contact-form.tsx` — Full form with Name, Email, Company (optional), Message fields, client-side validation (required, email format, message min 10 chars), handleSubmit with submitContact, loading spinner + "Sending..." button state, success/error state management, Turnstile reset on error, 429 rate-limit detection
- Contact page (`[locale]/contact/page.tsx`) — SSG via generateStaticParams, composes Header > PageHeader + ContactForm card > CTASection > Footer, exports metadata

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Turnstile widget and contact API client** - `375b5f5` (feat)
2. **Task 2: Create contact form components** - `9b3b917` (feat)
3. **Task 3: Compose the contact page** - `51352e6` (feat)

**Plan metadata:** (committed in final SUMMARY commit)

## Files Created/Modified

- `apps/marketing/src/lib/turnstile.ts` — Turnstile helper: TURNSTILE_SITE_KEY, loadTurnstileScript, TURNSTILE_SCRIPT_ID
- `apps/marketing/src/lib/contact.ts` — Contact API client: submitContact with typed interfaces
- `apps/marketing/components/contact/form-field.tsx` — Reusable form field with label, input/textarea, error state
- `apps/marketing/components/contact/turnstile-widget.tsx` — Turnstile invisible widget with imperative reset handle
- `apps/marketing/components/contact/error-message.tsx` — Inline error banner with auto-dismiss
- `apps/marketing/components/contact/success-message.tsx` — Green success state with check icon
- `apps/marketing/components/contact/contact-form.tsx` — Main contact form with all fields, validation, submission logic
- `apps/marketing/app/[locale]/contact/page.tsx` — Contact page with SSG and full layout composition

## Decisions Made

- Followed plan exactly — no deviations needed
- Used `turnstile-types` devDependency (already installed) for TypeScript awareness, with additional `declare const turnstile` in lib/turnstile.ts for the main global declaration
- submitContact return type is `Promise<ContactResponse>` with `{ success, message? }` matching the Research pattern
- TurnstileWidget uses `forwardRef` with `useImperativeHandle` for the `reset()` imperative handle — aligned with plan spec

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Uses existing Turnstile site key from `NEXT_PUBLIC_TURNSTILE_SITE_KEY` env var.

## Next Phase Readiness

- Contact form frontend complete — ready for Plan 07-09 (NestJS `/api/contact` endpoint with Turnstile server-side verification and email notification)
- Contact page accessible at `/{locale}/contact` with full locale support

---

*Phase: 07-public-presence*
*Completed: 2026-07-16*
