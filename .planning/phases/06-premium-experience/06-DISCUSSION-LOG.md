# Phase 6: Premium Experience - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-15
**Phase:** 6-Premium-Experience
**Areas discussed:** Design system foundation, Animation approach, 3 key page redesign scope, Mobile guard-first design

---

## Design System Foundation

| Option | Description | Selected |
|--------|-------------|----------|
| Stick with shadcn/ui + Tailwind | Double down on existing pattern. Custom tokens. No CSS var conflict. Simpler bundle. | |
| Add Radix Themes | Full Radix Themes alongside existing components. CSS var conflict needs resolution. | ✓ |
| Custom design tokens with Tailwind | Write complete token system. No Radix Themes. Full control. | |

**User's choice:** Add Radix Themes

---

| Option | Description | Selected |
|--------|-------------|----------|
| Namespace migration | Prefix existing shadcn vars (e.g., --shadcn-background), map Radix vars to Tailwind | ✓ |
| Radix-first, shadcn-adapted | Re-theme existing shadcn components using Radix CSS vars | |
| Silo by component type | New components use Radix, existing components stay on own vars | |

**User's choice:** Namespace migration

---

| Option | Description | Selected |
|--------|-------------|----------|
| CSS custom properties | All tokens in globals.css as HSL vars. Runtime-switchable. | ✓ |
| Tailwind config only | All tokens in tailwind.config.ts. Static. | |
| Hybrid | Tokens in CSS, types in TS config | |

**User's choice:** CSS custom properties

---

| Option | Description | Selected |
|--------|-------------|----------|
| Shared color tokens only | Export colors and typography from shared package. No shared components. | |
| Shared tokens + component specs | Tokens as JS constants + spec document for visual parity | ✓ |
| NativeWind for true sharing | Install NativeWind on Mobile for cross-platform Tailwind | |

**User's choice:** Shared tokens + component specs

---

## Animation Approach

| Option | Description | Selected |
|--------|-------------|----------|
| motion | Successor to framer-motion. ~15KB. SSR-optimized. | ✓ |
| CSS-only | tailwindcss-animate. Zero JS cost. Limited orchestration. | |
| framer-motion | Original library. ~32KB. Not SSR-optimized. Reorder support. | |

**User's choice:** motion

---

| Option | Description | Selected |
|--------|-------------|----------|
| Both | AnimatePresence for routes + component micro-interactions | ✓ |
| Page transitions only | Route transitions only. Minimal component animations. | |
| Micro-interactions only | Component-level polish only. No route transitions. | |

**User's choice:** Both

---

## 3 Key Page Redesign Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full layout rearchitecture | New hero, data viz, quick actions, real-time timeline | ✓ |
| Visual refresh of existing | Same layout, glassmorphism upgrade, micro-animations | |

**User's choice:** Full layout rearchitecture (Overview)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Live grid + map view | Camera grid + floorplan map, hover preview, always-visible filter | ✓ |
| Video wall style | Full-screen grid, multi-select, slideshow | |
| List + detail refresh | Keep grid, add live thumbnails, status pulse | |

**User's choice:** Live grid + map view (Cameras)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Real-time feed + triage panel | Live-scrolling feed, severity bars, inline video, side panel | ✓ |
| Kanban/column view | Grouped by status columns, drag-to-move | |
| Split timeline + table | Top chart, bottom table | |

**User's choice:** Real-time feed + triage panel (Alerts)

---

## Mobile Guard-First Design

| Option | Description | Selected |
|--------|-------------|----------|
| 4-tab simplified | Dashboard, Cameras, Incidents, More | ✓ |
| 3-tab minimal | Home, Watch, Tasks | |
| Retain 6 tabs, restyle | Keep structure, restyle with bigger targets | |

**User's choice:** 4-tab simplified navigation

---

| Option | Description | Selected |
|--------|-------------|----------|
| Check-in + Incident + Door | 3 primary + 2 secondary quick actions | ✓ |
| Incident + Door only | Two most frequent actions | |
| All-of-the-above grid | 4x2 action grid | |

**User's choice:** Check-in + Incident capture + Door control

---

| Option | Description | Selected |
|--------|-------------|----------|
| Check-in + cached camera list | Offline check-in, cached camera list/alert, incident queues sync | ✓ |
| Full log + no view | Log all actions offline, no viewing without connection | |
| Full offline read cache | Cache everything for reading, only writes need network | |

**User's choice:** Check-in + cached camera list

---

## Agent's Discretion

- Dark/light mode toggle implementation details
- UIX-06 global uplift execution strategy
- CSS namespace prefix naming and migration ordering
- Radix Themes component selection
- Component structure and data fetching for redesigned pages
- Shared token package location and structure

## Deferred Ideas

None — discussion stayed within Phase 6 scope.
