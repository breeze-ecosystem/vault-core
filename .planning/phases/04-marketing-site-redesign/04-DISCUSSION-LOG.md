# Phase 4: Marketing Site Redesign - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-17
**Phase:** 04-Marketing Site Redesign
**Areas discussed:** Design approach, Interactive demo format, Content architecture, Animation depth, Rebuild strategy

---

## Design Approach — Shared System vs Distinct Identity

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct identity | Marketing keeps its own visual identity (fonts, colors, animations, glassmorphism) — not tied to Dashboard's shadcn/ui | ✓ |
| Shared design system | Reuses Dashboard's design system and component primitives | |

**User's choice:** Distinct identity
**Notes:** Follow-up confirmed Dark tech premium direction (Linear/Vercel/Stripe style), full glassmorphism, dark-only, Inter + geometric display fonts, update packages/design tokens.

Hero approach was freeform: user wants a WOW hero (animated/interactive) but also clean narrative sections. "Every section must have at least one WOW effect" — each section gets one memorable visual moment, not necessarily animation.

---

## Interactive Demo Format

| Option | Description | Selected |
|--------|-------------|----------|
| Clickable screenshot tour | Polished mockups with step-by-step tooltip narration — no backend needed | ✓ |
| Live interactive sandbox | Real simulated data requiring API layer | |
| Video walkthrough only | Embedded product video | |

**User's choice:** Clickable screenshot tour
**Notes:** Single end-to-end narrative (access event → video → AI → resolution). Dedicated /demo page. Custom polished mockups (not real Dashboard screenshots).

---

## Content Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Separate route segments | Products, Solutions, Case studies each have own route | ✓ |
| Single-page scroll sections | All content on homepage | |

**User's choice:** Separate route segments
**Notes:** Full scope for Phase 4 — Products overview + 4 sub-pages (Video, Access Control, AI, Analytics), Solutions overview + Enterprise Campuses & Critical Infrastructure page, Case studies listing + 2 samples. Existing pages (Blog, Contact, Pricing) preserved.

---

## Animation Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle micro-animations | Linear-style fade-up, hover scale, smooth transitions | ✓ |
| Narrative scroll journey | Apple-style parallax, scroll-triggered transforms | |
| Bold entrance effects | Mask reveals, clip-path transitions, typewriter | |

**User's choice:** Subtle micro-animations
**Notes:** Major section elements only — hero, section titles, cards, stats, CTAs.

---

## Rebuild Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| In-place refactor | Evolve existing apps/marketing/ — replace components, add pages directly | ✓ |
| Parallel rebuild | Create new apps/marketing-v2/ alongside current site | |

**User's choice:** In-place refactor

---

## Internationalization

| Option | Description | Selected |
|--------|-------------|----------|
| French-first, translate out | Write all content in French first, translate to 5 locales | ✓ |
| Parallel multi-locale writing | Write all 6 locales simultaneously | |

**User's choice:** French-first, translate out
**Notes:** Full RTL support for Arabic (ar) — mirrored layout, right-aligned text, flipped animations.

---

## Agent's Discretion

- Exact font files and integration (Inter via next/font + geometric display)
- Glassmorphism implementation details (CSS vs Tailwind utilities)
- Scroll animation timing and easing curves
- Feature tour step count and content flow
- Mockup tooling and format
- RTL implementation approach (CSS logical properties vs manual mirroring)
- SEO metadata strategy per page
- OG image generation
- Blog/posts MDX content
- Contact form and pricing page polish

## Deferred Ideas

- Live demo sandbox (MKT-05) — deferred to v3.1
- Documentation section (MKT-06) — deferred to v3.1
- Healthcare & Logistics industry pages — future phases
- Event badge creation at kiosk — already deferred in Phase 3
